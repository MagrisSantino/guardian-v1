-- ──────────────────────────────────────────────────────────────
-- Guardian — Políticas RLS de seguridad
-- Ejecutar en Supabase SQL Editor
-- ──────────────────────────────────────────────────────────────

-- ✅ YA EJECUTADA — Política 1 (shift_applications UPDATE)
-- CREATE POLICY "Professional can cancel own application"
-- ON shift_applications FOR UPDATE TO authenticated
-- USING (professional_id = auth.uid())
-- WITH CHECK (professional_id = auth.uid() AND status = 'cancelled');

-- ──────────────────────────────────────────────────────────────
-- EJECUTAR ESTO (solo estas dos):
-- ──────────────────────────────────────────────────────────────

-- 2. Trigger: solo super_admin puede cambiar is_verified en profiles
--    Evita que un usuario se auto-verifique vía la API de Supabase.
CREATE OR REPLACE FUNCTION guardian_prevent_self_verify()
RETURNS TRIGGER AS $$
DECLARE
  caller_role TEXT;
BEGIN
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
    IF caller_role IS DISTINCT FROM 'super_admin' THEN
      RAISE EXCEPTION 'Solo super_admin puede modificar is_verified';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_is_verified_update ON profiles;
CREATE TRIGGER enforce_is_verified_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION guardian_prevent_self_verify();

-- 3. Trigger: solo super_admin puede cambiar el campo verified dentro del JSON de specialty
--    Evita que un médico se auto-verifique una especialidad.
CREATE OR REPLACE FUNCTION guardian_prevent_specialty_verify()
RETURNS TRIGGER AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Si specialty no cambió, no hacer nada
  IF NEW.specialty IS NOT DISTINCT FROM OLD.specialty THEN
    RETURN NEW;
  END IF;

  -- super_admin puede hacer todo
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role = 'super_admin' THEN
    RETURN NEW;
  END IF;

  -- Para cualquier otro rol: verificar que ningún .verified cambió
  IF OLD.specialty IS NOT NULL AND NEW.specialty IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements(NEW.specialty::jsonb) WITH ORDINALITY n(spec, i)
      LEFT JOIN jsonb_array_elements(OLD.specialty::jsonb) WITH ORDINALITY o(spec, i)
        ON n.i = o.i
      WHERE (n.spec->>'verified')::boolean IS DISTINCT FROM (o.spec->>'verified')::boolean
    ) THEN
      RAISE EXCEPTION 'Solo super_admin puede modificar el campo verified de una especialidad';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_specialty_verify_update ON profiles;
CREATE TRIGGER enforce_specialty_verify_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION guardian_prevent_specialty_verify();
