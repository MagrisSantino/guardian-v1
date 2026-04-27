-- ──────────────────────────────────────────────────────────────────────────
-- Guardian — Frontend Hardening (Fase 3)
-- Ejecutar después de 20260428_model_consistency.sql
-- ──────────────────────────────────────────────────────────────────────────

-- ── 1. Restringir notifications_insert ───────────────────────────────────
-- Las postulaciones ahora pasan por /api/shifts/apply (admin client),
-- por lo que los médicos ya NO necesitan insertar notificaciones para
-- la clínica desde el navegador.
-- Un usuario solo puede insertar una notificación destinada a sí mismo
-- (e.g. notificaciones propias futuras); el resto lo hace el server.
DROP POLICY IF EXISTS "notifications_insert" ON notifications;

CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ── 2. Restringir shift_applications_insert ───────────────────────────────
-- La postulación ahora se hace desde /api/shifts/apply (admin client),
-- que ya verifica is_verified y no-duplicados.
-- Eliminamos la posibilidad de que el frontend inserte directamente.
-- (El RLS anterior solo chequeaba professional_id = auth.uid(), sin
--  verificar is_verified ni estado de la guardia).
DROP POLICY IF EXISTS "applications_insert" ON shift_applications;

-- Tabla ya no acepta inserts desde el cliente autenticado.
-- Todos los inserts pasan por el admin client en las rutas del servidor.
-- Super_admin puede insertar directamente si lo necesita.
CREATE POLICY "applications_insert" ON shift_applications
  FOR INSERT TO authenticated
  WITH CHECK (guardian_get_role() = 'super_admin');
