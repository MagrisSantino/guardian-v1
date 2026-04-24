-- ──────────────────────────────────────────────────────────────
-- Guardian — RLS completo para todas las tablas
-- Ejecutar en Supabase SQL Editor
-- ──────────────────────────────────────────────────────────────

-- Helper: evita recursión en RLS de profiles
CREATE OR REPLACE FUNCTION guardian_get_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ──────────── PROFILES ────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;

-- Cualquier usuario autenticado puede leer perfiles (necesario para joins de clínica/médico)
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated USING (true);

-- Solo el propio usuario puede insertar su perfil (lo hace el registro)
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Cada usuario actualiza solo el suyo; super_admin puede actualizar cualquiera
-- (los triggers del migration anterior protegen is_verified y specialty.verified)
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR guardian_get_role() = 'super_admin')
  WITH CHECK (id = auth.uid() OR guardian_get_role() = 'super_admin');

-- Solo super_admin puede eliminar perfiles
CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE TO authenticated
  USING (guardian_get_role() = 'super_admin');

-- ──────────── SHIFTS ──────────────────────────────────────────
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shifts_select" ON shifts;
DROP POLICY IF EXISTS "shifts_insert" ON shifts;
DROP POLICY IF EXISTS "shifts_update" ON shifts;
DROP POLICY IF EXISTS "shifts_delete" ON shifts;

-- Todos los autenticados pueden leer guardias (feed, calendario)
CREATE POLICY "shifts_select" ON shifts
  FOR SELECT TO authenticated USING (true);

-- Solo clinic_admin puede crear guardias (solo las propias)
CREATE POLICY "shifts_insert" ON shifts
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = auth.uid() AND guardian_get_role() = 'clinic_admin');

-- Clínica dueña puede actualizar sus guardias; super_admin puede todo
-- También permite que el sistema actualice professional_id al asignar
-- (el API route /api/shifts/assign usa el anon key con la sesión del clinic_admin)
CREATE POLICY "shifts_update" ON shifts
  FOR UPDATE TO authenticated
  USING (clinic_id = auth.uid() OR professional_id = auth.uid() OR guardian_get_role() = 'super_admin');

-- Solo la clínica dueña o super_admin puede eliminar
CREATE POLICY "shifts_delete" ON shifts
  FOR DELETE TO authenticated
  USING (clinic_id = auth.uid() OR guardian_get_role() = 'super_admin');

-- ──────────── SHIFT_APPLICATIONS ──────────────────────────────
ALTER TABLE shift_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "applications_select" ON shift_applications;
DROP POLICY IF EXISTS "applications_insert" ON shift_applications;
DROP POLICY IF EXISTS "applications_update" ON shift_applications;
DROP POLICY IF EXISTS "applications_delete" ON shift_applications;
-- Eliminar política anterior (ya fue ejecutada)
DROP POLICY IF EXISTS "Professional can cancel own application" ON shift_applications;

-- Médico ve sus propias postulaciones; clínica ve las de sus guardias
CREATE POLICY "applications_select" ON shift_applications
  FOR SELECT TO authenticated
  USING (
    professional_id = auth.uid()
    OR (SELECT clinic_id FROM shifts WHERE id = shift_id) = auth.uid()
    OR guardian_get_role() = 'super_admin'
  );

-- Solo médicos pueden postularse (solo sus propias)
CREATE POLICY "applications_insert" ON shift_applications
  FOR INSERT TO authenticated
  WITH CHECK (professional_id = auth.uid() AND guardian_get_role() = 'doctor');

-- Médico puede cancelar su propia postulación; clínica puede aceptar/rechazar las de sus guardias
CREATE POLICY "applications_update" ON shift_applications
  FOR UPDATE TO authenticated
  USING (
    professional_id = auth.uid()
    OR (SELECT clinic_id FROM shifts WHERE id = shift_id) = auth.uid()
    OR guardian_get_role() = 'super_admin'
  );

-- Solo super_admin puede eliminar (nunca se borran, solo se cancelan)
CREATE POLICY "applications_delete" ON shift_applications
  FOR DELETE TO authenticated
  USING (guardian_get_role() = 'super_admin');

-- ──────────── REVIEWS ─────────────────────────────────────────
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select" ON reviews;
DROP POLICY IF EXISTS "reviews_insert" ON reviews;
DROP POLICY IF EXISTS "reviews_update" ON reviews;
DROP POLICY IF EXISTS "reviews_delete" ON reviews;

CREATE POLICY "reviews_select" ON reviews
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "reviews_insert" ON reviews
  FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "reviews_update" ON reviews
  FOR UPDATE TO authenticated
  USING (reviewer_id = auth.uid());

CREATE POLICY "reviews_delete" ON reviews
  FOR DELETE TO authenticated
  USING (guardian_get_role() = 'super_admin');

-- ──────────── NOTIFICATIONS ───────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON notifications;
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
DROP POLICY IF EXISTS "notifications_update" ON notifications;
DROP POLICY IF EXISTS "notifications_delete" ON notifications;

-- Solo el destinatario ve sus notificaciones
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Cualquier usuario autenticado puede insertar notificaciones para otros
-- (médico notifica a clínica al postularse, clínica notifica a médico al asignar)
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- Solo el destinatario puede marcar como leída
CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notifications_delete" ON notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR guardian_get_role() = 'super_admin');
