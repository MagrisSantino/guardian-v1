-- ──────────────────────────────────────────────────────────────
-- Guardian — Consistencia del modelo de datos
-- Ejecutar después de 20260427_security_hardening.sql
-- ──────────────────────────────────────────────────────────────

-- ── 1. Estados completos ──────────────────────────────────────

-- Agrega 'draft' a shifts (guardia creada pero no publicada aún)
ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_status_check;
ALTER TABLE shifts ADD CONSTRAINT shifts_status_check
  CHECK (status IN ('draft', 'open', 'filled', 'completed', 'cancelled'));

-- Agrega 'withdrawn' a shift_applications
-- 'cancelled'  = médico retira postulación pendiente (antes de ser aceptado)
-- 'withdrawn'  = médico cancela una asignación ya aceptada
ALTER TABLE shift_applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE shift_applications ADD CONSTRAINT applications_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'withdrawn'));

-- ── 2. Soft-delete en profiles ────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Actualizar la vista pública para excluir perfiles eliminados
CREATE OR REPLACE VIEW profiles_public AS
  SELECT
    id, role, full_name, admin_name, is_verified,
    specialty, bio, avatar_url, cover_url,
    location_maps, km_from_cba,
    num_doctors, num_nurses,
    experience_tags, complexity, resources, services,
    rating, reviews_count
  FROM profiles
  WHERE deleted_at IS NULL;

GRANT SELECT ON profiles_public TO authenticated;

-- ── 3. Histórico de estados de guardias ───────────────────────
CREATE TABLE IF NOT EXISTS shift_status_history (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id    UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  changed_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE shift_status_history ENABLE ROW LEVEL SECURITY;

-- Clínica ve historial de sus propias guardias; médico asignado ve el suyo
CREATE POLICY "history_select" ON shift_status_history
  FOR SELECT TO authenticated
  USING (
    (SELECT clinic_id FROM shifts WHERE id = shift_id) = auth.uid()
    OR (SELECT professional_id FROM shifts WHERE id = shift_id) = auth.uid()
    OR guardian_get_role() = 'super_admin'
  );

-- Solo super_admin puede eliminar registros de auditoría
CREATE POLICY "history_delete" ON shift_status_history
  FOR DELETE TO authenticated
  USING (guardian_get_role() = 'super_admin');

-- Trigger: registra cada cambio de estado de una guardia
CREATE OR REPLACE FUNCTION guardian_log_shift_status()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO shift_status_history (shift_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_shift_status ON shifts;
CREATE TRIGGER trg_log_shift_status
  AFTER UPDATE ON shifts
  FOR EACH ROW EXECUTE FUNCTION guardian_log_shift_status();

-- ── 4. Validación de transiciones de estado — shifts ──────────
-- Máquina de estados:
--   draft  → open, cancelled
--   open   → filled, cancelled
--   filled → open (desasignación), completed
--   completed → BLOQUEADO (inmutable)
--   cancelled → BLOQUEADO (inmutable)
CREATE OR REPLACE FUNCTION guardian_validate_shift_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- super_admin puede hacer cualquier transición (para correcciones manuales)
  IF guardian_get_role() = 'super_admin' THEN
    RETURN NEW;
  END IF;

  -- Estados terminales: no se puede salir de ellos
  IF OLD.status = 'completed' THEN
    RAISE EXCEPTION 'Una guardia completada es inmutable' USING ERRCODE = 'P0001';
  END IF;
  IF OLD.status = 'cancelled' THEN
    RAISE EXCEPTION 'Una guardia cancelada es inmutable' USING ERRCODE = 'P0001';
  END IF;

  -- Transiciones válidas
  IF OLD.status = 'draft'   AND NEW.status IN ('open', 'cancelled')      THEN RETURN NEW; END IF;
  IF OLD.status = 'open'    AND NEW.status IN ('filled', 'cancelled')     THEN RETURN NEW; END IF;
  IF OLD.status = 'filled'  AND NEW.status IN ('open', 'completed')       THEN RETURN NEW; END IF;

  RAISE EXCEPTION 'Transición de estado inválida: % → %', OLD.status, NEW.status
    USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_shift_transition ON shifts;
CREATE TRIGGER trg_validate_shift_transition
  BEFORE UPDATE ON shifts
  FOR EACH ROW EXECUTE FUNCTION guardian_validate_shift_transition();

-- ── 5. Validación de transiciones — shift_applications ────────
-- Máquina de estados:
--   pending   → accepted, rejected, cancelled
--   accepted  → withdrawn (médico cancela), pending (clínica desasigna y reabre)
--   rejected  → pending (clínica reabre tras desasignación)
--   cancelled → BLOQUEADO
--   withdrawn → BLOQUEADO
CREATE OR REPLACE FUNCTION guardian_validate_application_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF guardian_get_role() = 'super_admin' THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'cancelled' THEN
    RAISE EXCEPTION 'Una postulación cancelada es inmutable' USING ERRCODE = 'P0001';
  END IF;
  IF OLD.status = 'withdrawn' THEN
    RAISE EXCEPTION 'Una postulación retirada es inmutable' USING ERRCODE = 'P0001';
  END IF;

  IF OLD.status = 'pending'   AND NEW.status IN ('accepted', 'rejected', 'cancelled') THEN RETURN NEW; END IF;
  IF OLD.status = 'accepted'  AND NEW.status IN ('withdrawn', 'pending')               THEN RETURN NEW; END IF;
  IF OLD.status = 'rejected'  AND NEW.status = 'pending'                               THEN RETURN NEW; END IF;

  RAISE EXCEPTION 'Transición de postulación inválida: % → %', OLD.status, NEW.status
    USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_application_transition ON shift_applications;
CREATE TRIGGER trg_validate_application_transition
  BEFORE UPDATE ON shift_applications
  FOR EACH ROW EXECUTE FUNCTION guardian_validate_application_transition();

-- ── 6. Notificaciones automáticas al cancelar guardia ─────────
-- Cuando una clínica cancela una guardia abierta, todos los postulantes
-- pendientes reciben una notificación in-app automáticamente.
CREATE OR REPLACE FUNCTION guardian_notify_shift_cancelled()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'open' AND NEW.status = 'cancelled' THEN
    INSERT INTO notifications (user_id, shift_id, title, message)
    SELECT
      sa.professional_id,
      NEW.id,
      'Guardia cancelada',
      'La guardia "' || COALESCE(NEW.title, 'sin título') || '" a la que te postulaste fue cancelada por la institución.'
    FROM shift_applications sa
    WHERE sa.shift_id = NEW.id
      AND sa.status = 'pending'
      AND sa.professional_id IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_shift_cancelled ON shifts;
CREATE TRIGGER trg_notify_shift_cancelled
  AFTER UPDATE ON shifts
  FOR EACH ROW EXECUTE FUNCTION guardian_notify_shift_cancelled();

-- ── 7. Trigger para rating atómico en reviews ─────────────────
-- Reemplaza el recálculo manual en el frontend (DetalleGuardiaMedicoModal)
-- que tiene race condition cuando dos médicos califican simultáneamente.
CREATE OR REPLACE FUNCTION guardian_update_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_avg NUMERIC;
  v_count INTEGER;
  v_target UUID;
BEGIN
  v_target := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.reviewed_id
    ELSE NEW.reviewed_id
  END;

  IF v_target IS NULL THEN RETURN NEW; END IF;

  SELECT
    ROUND(AVG(rating)::NUMERIC, 2),
    COUNT(*)
  INTO v_avg, v_count
  FROM reviews
  WHERE reviewed_id = v_target;

  UPDATE profiles
  SET rating = COALESCE(v_avg, 0),
      reviews_count = v_count
  WHERE id = v_target;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_rating ON reviews;
CREATE TRIGGER trg_update_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION guardian_update_rating();

-- ── ÍNDICE para shift_status_history ──────────────────────────
CREATE INDEX IF NOT EXISTS idx_shift_history_shift
  ON shift_status_history (shift_id, changed_at DESC);
