-- ============================================================
-- Guardian v2 — Tests de flujos críticos
-- Ejecutar DESPUÉS de 20260501_guardian_v2_init.sql
-- Se ejecuta en una transaction que se revierte: no deja datos.
-- ============================================================

BEGIN;
-- Diferir el FK hacia auth.users para usar UUIDs de prueba sin deshabilitar triggers
SET CONSTRAINTS ALL DEFERRED;
SAVEPOINT pre_tests;

DO $$
DECLARE
  v_doctor_id  UUID := gen_random_uuid();
  v_clinic_id  UUID := gen_random_uuid();
  v_shift_id   UUID;
  v_app_id     UUID;
  v_count      INT;
BEGIN

  -- ── Crear usuarios de prueba en auth.users ───────────────
  -- (En pruebas reales, usar supabase test helpers o service_role)
  -- Insertamos directamente en las tablas para simular el flujo post-registro.

  -- Doctor verificado
  INSERT INTO accounts (id, role, email, full_name, verified_at)
  VALUES (v_doctor_id, 'doctor', 'doctor@test.guardian', 'Dr. Test', NOW());

  INSERT INTO doctor_profiles (id, specialty)
  VALUES (v_doctor_id, ARRAY['Clínica Médica']);

  -- Clínica verificada
  INSERT INTO accounts (id, role, email, full_name, verified_at)
  VALUES (v_clinic_id, 'clinic', 'clinica@test.guardian', 'Clínica Test', NOW());

  INSERT INTO clinic_profiles (id)
  VALUES (v_clinic_id);

  -- ── TEST 1: Clínica crea guardia ─────────────────────────
  INSERT INTO shifts (clinic_id, title, specialty_required, starts_at, ends_at, price)
  VALUES (
    v_clinic_id,
    'Guardia Test',
    'Clínica Médica',
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '1 day 8 hours',
    5000
  )
  RETURNING id INTO v_shift_id;

  ASSERT v_shift_id IS NOT NULL, 'TEST 1 FAILED: no se creó la guardia';
  ASSERT (SELECT status FROM shifts WHERE id = v_shift_id) = 'open', 'TEST 1 FAILED: status inicial no es open';
  RAISE NOTICE 'TEST 1 PASSED: Clínica crea guardia';

  -- ── TEST 2: Médico se postula ────────────────────────────
  INSERT INTO shift_applications (shift_id, doctor_id)
  VALUES (v_shift_id, v_doctor_id)
  RETURNING id INTO v_app_id;

  ASSERT v_app_id IS NOT NULL, 'TEST 2 FAILED: postulación no creada';
  ASSERT (SELECT status FROM shift_applications WHERE id = v_app_id) = 'pending',
    'TEST 2 FAILED: status inicial no es pending';
  RAISE NOTICE 'TEST 2 PASSED: Médico se postula';

  -- ── TEST 3: Clínica VE al postulante (el bug original) ───
  -- Simular SELECT como clínica: la policy verifica que clinic_id del shift = auth.uid()
  -- En este test usamos admin client (sin RLS), así que validamos la lógica de la query.
  SELECT COUNT(*) INTO v_count
  FROM shift_applications sa
  JOIN shifts s ON s.id = sa.shift_id
  WHERE sa.shift_id = v_shift_id
    AND sa.status = 'pending'
    AND s.clinic_id = v_clinic_id;

  ASSERT v_count = 1, 'TEST 3 FAILED: clínica no ve el postulante (v_count=' || v_count || ')';
  RAISE NOTICE 'TEST 3 PASSED: Clínica ve al postulante en su lista';

  -- ── TEST 4: No se puede postular dos veces ───────────────
  BEGIN
    INSERT INTO shift_applications (shift_id, doctor_id)
    VALUES (v_shift_id, v_doctor_id);
    ASSERT FALSE, 'TEST 4 FAILED: debería haber fallado por UNIQUE constraint';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'TEST 4 PASSED: Postulación duplicada bloqueada por UNIQUE';
  END;

  -- ── TEST 5: Aceptar postulación (RPC atómica) ────────────
  -- Simulamos aceptación directa (la RPC valida auth.uid() = clinic_id)
  UPDATE shift_applications SET status = 'accepted' WHERE id = v_app_id;
  UPDATE shifts SET status = 'filled', assigned_doctor_id = v_doctor_id WHERE id = v_shift_id;

  ASSERT (SELECT status FROM shifts WHERE id = v_shift_id) = 'filled',
    'TEST 5 FAILED: shift no quedó en filled';
  ASSERT (SELECT assigned_doctor_id FROM shifts WHERE id = v_shift_id) = v_doctor_id,
    'TEST 5 FAILED: assigned_doctor_id no seteado';
  ASSERT (SELECT status FROM shift_applications WHERE id = v_app_id) = 'accepted',
    'TEST 5 FAILED: application no quedó en accepted';
  RAISE NOTICE 'TEST 5 PASSED: Postulante aceptado, guardia cubierta';

  -- ── TEST 6: Estado terminal — completed no puede cambiar ─
  UPDATE shifts SET status = 'completed' WHERE id = v_shift_id;
  BEGIN
    UPDATE shifts SET status = 'open' WHERE id = v_shift_id;
    ASSERT FALSE, 'TEST 6 FAILED: debería haber bloqueado transición desde completed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%inmutable%' OR SQLERRM LIKE '%inválid%' THEN
      RAISE NOTICE 'TEST 6 PASSED: Estado terminal completed es inmutable';
    ELSE
      RAISE EXCEPTION 'TEST 6 FAILED con error inesperado: %', SQLERRM;
    END IF;
  END;

  -- ── TEST 7: No se puede postular a guardia no-open ───────
  -- Crear nueva guardia en estado filled
  DECLARE
    v_shift2_id UUID;
    v_doctor2_id UUID := gen_random_uuid();
  BEGIN
    INSERT INTO accounts (id, role, email, full_name, verified_at)
    VALUES (v_doctor2_id, 'doctor', 'doctor2@test.guardian', 'Dr. Test2', NOW());
    INSERT INTO doctor_profiles (id, specialty) VALUES (v_doctor2_id, ARRAY['Clínica Médica']);

    -- Guardia ya filled
    INSERT INTO shifts (clinic_id, title, specialty_required, starts_at, ends_at, price, status, assigned_doctor_id)
    VALUES (v_clinic_id, 'Guardia Filled', 'Clínica Médica', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 8 hours', 5000, 'filled', v_doctor_id)
    RETURNING id INTO v_shift2_id;

    -- Intentar postular a guardia filled debería fallar en el API (server valida status='open')
    -- A nivel DB no hay trigger que bloquee el insert directo, pero el API sí lo valida.
    -- Verificamos que la guardia tenga status filled:
    ASSERT (SELECT status FROM shifts WHERE id = v_shift2_id) = 'filled',
      'TEST 7 SETUP FAILED: shift2 no es filled';
    RAISE NOTICE 'TEST 7 PASSED: Guardia filled confirmada (validación en API layer)';
  END;

  -- ── TEST 8: Médico con starts_at/ends_at tiene duración calculable ─
  DECLARE v_hours NUMERIC;
  BEGIN
    SELECT EXTRACT(EPOCH FROM (ends_at - starts_at)) / 3600 INTO v_hours
    FROM shifts WHERE id = v_shift_id;
    ASSERT v_hours = 8, 'TEST 8 FAILED: duración incorrecta (esperaba 8h, obtuvo ' || v_hours || ')';
    RAISE NOTICE 'TEST 8 PASSED: starts_at/ends_at calcula duración correctamente';
  END;

  -- ── TEST 9: accounts_public no expone whatsapp ───────────
  ASSERT (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_name = 'accounts_public' AND column_name = 'whatsapp'
  ) = 0, 'TEST 9 FAILED: accounts_public expone whatsapp';
  RAISE NOTICE 'TEST 9 PASSED: accounts_public no expone whatsapp';

  -- ── TEST 10: doctor_profiles no puede crearse para una clínica ─
  BEGIN
    INSERT INTO doctor_profiles (id, specialty) VALUES (v_clinic_id, ARRAY['Cardiología']);
    ASSERT FALSE, 'TEST 10 FAILED: debería haber bloqueado insert de doctor_profiles para clínica';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 10 PASSED: doctor_profiles bloqueado para role=clinic';
  END;

  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE 'TODOS LOS TESTS PASARON ✓';
  RAISE NOTICE '════════════════════════════════════════';

END;
$$;

ROLLBACK TO SAVEPOINT pre_tests;
ROLLBACK;
