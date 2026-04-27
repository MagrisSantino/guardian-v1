-- ──────────────────────────────────────────────────────────────
-- Guardian — Hardening de seguridad
-- Ejecutar en Supabase SQL Editor (después de 20260424_rls_tables.sql)
-- ──────────────────────────────────────────────────────────────

-- ── 1. Constraints de estado ──────────────────────────────────
-- Agrega 'cancelled' a shifts y shift_applications

DO $$
BEGIN
  ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_status_check;
  ALTER TABLE shifts ADD CONSTRAINT shifts_status_check
    CHECK (status IN ('open', 'filled', 'completed', 'cancelled'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE shift_applications DROP CONSTRAINT IF EXISTS applications_status_check;
  ALTER TABLE shift_applications ADD CONSTRAINT applications_status_check
    CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ── 2. UNIQUE en shift_applications ──────────────────────────
-- Previene postulaciones duplicadas del mismo médico a la misma guardia.
DROP INDEX IF EXISTS unique_professional_shift;
CREATE UNIQUE INDEX unique_professional_shift
  ON shift_applications (professional_id, shift_id)
  WHERE professional_id IS NOT NULL AND shift_id IS NOT NULL;

-- ── 3. UNIQUE parciales en profiles ──────────────────────────
-- Previene matrícula, CUIT y DNI duplicados.
DROP INDEX IF EXISTS profiles_matricula_unique;
CREATE UNIQUE INDEX profiles_matricula_unique
  ON profiles (matricula)
  WHERE role = 'doctor' AND matricula IS NOT NULL AND matricula <> '';

DROP INDEX IF EXISTS profiles_cuit_unique;
CREATE UNIQUE INDEX profiles_cuit_unique
  ON profiles (cuit)
  WHERE role = 'clinic_admin' AND cuit IS NOT NULL AND cuit <> '';

DROP INDEX IF EXISTS profiles_dni_unique;
CREATE UNIQUE INDEX profiles_dni_unique
  ON profiles (dni)
  WHERE dni IS NOT NULL AND dni <> '';

-- ── 4. Índices de performance ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_shifts_clinic_status
  ON shifts (clinic_id, status);

CREATE INDEX IF NOT EXISTS idx_shifts_status_date
  ON shifts (status, date_time);

CREATE INDEX IF NOT EXISTS idx_applications_professional_status
  ON shift_applications (professional_id, status);

CREATE INDEX IF NOT EXISTS idx_applications_shift_status
  ON shift_applications (shift_id, status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id)
  WHERE is_read = false;

-- ── 5. Corregir shifts_update ────────────────────────────────
-- Elimina professional_id = auth.uid() del USING: un médico asignado
-- no debe poder editar los campos de la guardia (precio, fecha, título, etc.).
-- Las operaciones de desasignación van ahora por /api/shifts/cancel-assignment.
DROP POLICY IF EXISTS "shifts_update" ON shifts;
CREATE POLICY "shifts_update" ON shifts
  FOR UPDATE TO authenticated
  USING (
    clinic_id = auth.uid()
    OR guardian_get_role() = 'super_admin'
  )
  WITH CHECK (
    clinic_id = auth.uid()
    OR guardian_get_role() = 'super_admin'
  );

-- ── 6. Forzar is_verified en postulaciones ───────────────────
-- Un médico no verificado no puede postularse, aunque deshabilite el botón UI.
DROP POLICY IF EXISTS "applications_insert" ON shift_applications;
CREATE POLICY "applications_insert" ON shift_applications
  FOR INSERT TO authenticated
  WITH CHECK (
    professional_id = auth.uid()
    AND guardian_get_role() = 'doctor'
    AND (SELECT is_verified FROM profiles WHERE id = auth.uid()) = true
  );

-- ── 7. Trigger: prevenir postulación con solapamiento ─────────
-- Bloquea a nivel DB si el médico ya tiene una guardia ACEPTADA en ese horario.
CREATE OR REPLACE FUNCTION guardian_check_shift_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM shift_applications sa
    JOIN shifts s  ON s.id  = sa.shift_id
    JOIN shifts ns ON ns.id = NEW.shift_id
    WHERE sa.professional_id = NEW.professional_id
      AND sa.status = 'accepted'
      AND sa.shift_id <> NEW.shift_id
      AND tstzrange(s.date_time,  s.date_time  + (COALESCE(s.duration_hours,  0) || ' hours')::interval, '[]')
       && tstzrange(ns.date_time, ns.date_time + (COALESCE(ns.duration_hours, 0) || ' hours')::interval, '[]')
  ) THEN
    RAISE EXCEPTION 'SHIFT_OVERLAP' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_shift_overlap ON shift_applications;
CREATE TRIGGER enforce_shift_overlap
  BEFORE INSERT ON shift_applications
  FOR EACH ROW EXECUTE FUNCTION guardian_check_shift_overlap();

-- ── 8. DB function atómica: aceptar postulación ──────────────
-- Reemplaza los 4 UPDATEs separados en /api/shifts/assign con una
-- transacción única que elimina la race condition.
CREATE OR REPLACE FUNCTION accept_shift_application(
  p_application_id UUID,
  p_shift_id       UUID,
  p_professional_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clinic_id   UUID;
  v_shift_status TEXT;
  v_app_status  TEXT;
  v_rejected_cross UUID[];
BEGIN
  -- Lock + validar guardia
  SELECT clinic_id, status
  INTO v_clinic_id, v_shift_status
  FROM shifts WHERE id = p_shift_id FOR UPDATE;

  IF v_clinic_id IS NULL THEN
    RAISE EXCEPTION 'SHIFT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF v_clinic_id <> auth.uid() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = '42501';
  END IF;
  IF v_shift_status <> 'open' THEN
    RAISE EXCEPTION 'SHIFT_NOT_OPEN' USING ERRCODE = 'P0001';
  END IF;

  -- Lock + validar postulación
  SELECT status
  INTO v_app_status
  FROM shift_applications
  WHERE id = p_application_id
    AND shift_id = p_shift_id
    AND professional_id = p_professional_id
  FOR UPDATE;

  IF v_app_status IS NULL THEN
    RAISE EXCEPTION 'APPLICATION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF v_app_status <> 'pending' THEN
    RAISE EXCEPTION 'APPLICATION_NOT_PENDING' USING ERRCODE = 'P0001';
  END IF;

  -- Aceptar la postulación elegida
  UPDATE shift_applications SET status = 'accepted'
  WHERE id = p_application_id;

  -- Rechazar las demás postulaciones de esta guardia
  UPDATE shift_applications SET status = 'rejected'
  WHERE shift_id = p_shift_id AND status = 'pending' AND id <> p_application_id;

  -- Colectar IDs de postulaciones cruzadas con solapamiento horario
  SELECT ARRAY(
    SELECT sa.id
    FROM shift_applications sa
    JOIN shifts s   ON s.id  = sa.shift_id
    JOIN shifts ref ON ref.id = p_shift_id
    WHERE sa.professional_id = p_professional_id
      AND sa.status = 'pending'
      AND sa.shift_id <> p_shift_id
      AND tstzrange(s.date_time,   s.date_time   + (COALESCE(s.duration_hours,   0) || ' hours')::interval, '[]')
       && tstzrange(ref.date_time, ref.date_time + (COALESCE(ref.duration_hours, 0) || ' hours')::interval, '[]')
  ) INTO v_rejected_cross;

  -- Rechazar postulaciones cruzadas
  IF v_rejected_cross IS NOT NULL AND array_length(v_rejected_cross, 1) > 0 THEN
    UPDATE shift_applications SET status = 'rejected'
    WHERE id = ANY(v_rejected_cross);
  END IF;

  -- Marcar guardia como cubierta
  UPDATE shifts
  SET status = 'filled', professional_id = p_professional_id
  WHERE id = p_shift_id;

  RETURN json_build_object(
    'ok', true,
    'rejected_cross_shift', COALESCE(v_rejected_cross, ARRAY[]::UUID[])
  );
END;
$$;

REVOKE ALL ON FUNCTION accept_shift_application FROM PUBLIC;
GRANT EXECUTE ON FUNCTION accept_shift_application TO authenticated;

-- ── 9. Vista pública de perfiles ─────────────────────────────
-- Expone solo los campos no sensibles. Usar en feeds y cards
-- en lugar de SELECT * FROM profiles.
-- Los campos sensibles (whatsapp, dni, matricula, cuit) quedan en la tabla.
CREATE OR REPLACE VIEW profiles_public AS
  SELECT
    id, role, full_name, admin_name, is_verified,
    specialty, bio, avatar_url, cover_url,
    location_maps, km_from_cba,
    num_doctors, num_nurses,
    experience_tags, complexity, resources, services,
    rating, reviews_count
  FROM profiles;

GRANT SELECT ON profiles_public TO authenticated;

-- ── NOTAS PARA FASE 3 ─────────────────────────────────────────
-- notifications_insert sigue con WITH CHECK (true) intencionalmente.
-- El flujo de postulación (handleApply) inserta notifs para la clínica
-- desde el cliente. Mover a /api/shifts/apply en Fase 3 permitirá
-- restringir esto a WITH CHECK (user_id = auth.uid()).
--
-- profiles_select sigue con USING (true) intencionalmente.
-- Los joins de feeds necesitan leer datos de clínicas.
-- En Fase 3: migrar feeds a usar profiles_public (la vista creada arriba).
