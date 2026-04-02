-- ============================================================
--  Guardian — Row-Level Security (RLS) Policies
--  Ejecutá este script en el SQL Editor de Supabase Dashboard.
--  IMPORTANTE: Revisá primero que RLS esté habilitado en cada
--  tabla desde Database > Tables.
-- ============================================================

-- ────────────────────────────────────────────────────────────
--  Habilitar RLS en todas las tablas
-- ────────────────────────────────────────────────────────────
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications    ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
--  TABLA: profiles
-- ────────────────────────────────────────────────────────────

-- Limpiar políticas anteriores
DROP POLICY IF EXISTS "profiles_select_own"         ON profiles;
DROP POLICY IF EXISTS "profiles_select_public"      ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own"         ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"         ON profiles;
DROP POLICY IF EXISTS "profiles_delete_none"        ON profiles;

-- Cualquier usuario autenticado puede ver perfiles (necesario para la UI)
CREATE POLICY "profiles_select_public"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Solo el propio usuario puede insertar su perfil
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Solo el propio usuario puede actualizar su perfil
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Nadie puede borrar perfiles (operación de admin únicamente vía service role)
CREATE POLICY "profiles_delete_none"
  ON profiles FOR DELETE
  TO authenticated
  USING (false);

-- ────────────────────────────────────────────────────────────
--  TABLA: shifts
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "shifts_select_open"          ON shifts;
DROP POLICY IF EXISTS "shifts_select_clinic_own"    ON shifts;
DROP POLICY IF EXISTS "shifts_select_doctor_filled" ON shifts;
DROP POLICY IF EXISTS "shifts_insert_clinic"        ON shifts;
DROP POLICY IF EXISTS "shifts_update_clinic"        ON shifts;
DROP POLICY IF EXISTS "shifts_delete_clinic"        ON shifts;

-- Médicos ven guardias abiertas
CREATE POLICY "shifts_select_open"
  ON shifts FOR SELECT
  TO authenticated
  USING (status = 'open');

-- Clínicas ven sus propias guardias (cualquier estado)
CREATE POLICY "shifts_select_clinic_own"
  ON shifts FOR SELECT
  TO authenticated
  USING (clinic_id = auth.uid());

-- Médicos ven guardias que tienen asignadas (filled/completed)
CREATE POLICY "shifts_select_doctor_filled"
  ON shifts FOR SELECT
  TO authenticated
  USING (professional_id = auth.uid());

-- Solo clínicas verificadas pueden publicar guardias
-- (la verificación se maneja a nivel de aplicación; aquí solo
--  aseguramos que clinic_id = usuario actual)
CREATE POLICY "shifts_insert_clinic"
  ON shifts FOR INSERT
  TO authenticated
  WITH CHECK (clinic_id = auth.uid());

-- Solo la clínica dueña puede modificar la guardia
CREATE POLICY "shifts_update_clinic"
  ON shifts FOR UPDATE
  TO authenticated
  USING (clinic_id = auth.uid());

-- Solo la clínica dueña puede eliminar una guardia abierta
CREATE POLICY "shifts_delete_clinic"
  ON shifts FOR DELETE
  TO authenticated
  USING (clinic_id = auth.uid() AND status = 'open');

-- ────────────────────────────────────────────────────────────
--  TABLA: shift_applications
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "apps_select_own_doctor"   ON shift_applications;
DROP POLICY IF EXISTS "apps_select_clinic"       ON shift_applications;
DROP POLICY IF EXISTS "apps_insert_doctor"       ON shift_applications;
DROP POLICY IF EXISTS "apps_delete_own_pending"  ON shift_applications;
DROP POLICY IF EXISTS "apps_update_clinic"       ON shift_applications;

-- Médico ve sus propias postulaciones
CREATE POLICY "apps_select_own_doctor"
  ON shift_applications FOR SELECT
  TO authenticated
  USING (professional_id = auth.uid());

-- Clínica ve postulaciones de sus guardias
CREATE POLICY "apps_select_clinic"
  ON shift_applications FOR SELECT
  TO authenticated
  USING (
    shift_id IN (
      SELECT id FROM shifts WHERE clinic_id = auth.uid()
    )
  );

-- Médico puede postularse (insertar)
CREATE POLICY "apps_insert_doctor"
  ON shift_applications FOR INSERT
  TO authenticated
  WITH CHECK (professional_id = auth.uid());

-- Médico puede retirar su propia postulación pendiente
CREATE POLICY "apps_delete_own_pending"
  ON shift_applications FOR DELETE
  TO authenticated
  USING (professional_id = auth.uid() AND status = 'pending');

-- NOTA: los UPDATE de estado (accepted/rejected) los hace el service role
-- desde la API /api/shifts/assign. No hay política de UPDATE aquí para
-- evitar que usuarios manipulen el estado directamente.

-- ────────────────────────────────────────────────────────────
--  TABLA: reviews
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "reviews_select_all"    ON reviews;
DROP POLICY IF EXISTS "reviews_insert_clinic" ON reviews;

-- Cualquier usuario autenticado puede leer reseñas
CREATE POLICY "reviews_select_all"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

-- Solo quien escribe la reseña puede insertarla
CREATE POLICY "reviews_insert_clinic"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (reviewer_id = auth.uid());

-- ────────────────────────────────────────────────────────────
--  TABLA: notifications
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "notifs_select_own" ON notifications;
DROP POLICY IF EXISTS "notifs_update_own" ON notifications;

-- Solo el destinatario puede ver sus notificaciones
CREATE POLICY "notifs_select_own"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Solo el destinatario puede marcar como leída
CREATE POLICY "notifs_update_own"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- NOTA: los INSERT de notificaciones los hace el service role desde la API.
-- Si querés permitir inserts desde el cliente, agregá:
-- CREATE POLICY "notifs_insert_authenticated" ON notifications FOR INSERT
--   TO authenticated WITH CHECK (true);
