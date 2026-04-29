-- ============================================================
-- 20260502 — Admin override en accept_shift_application
-- Permite que un admin pueda asignar guardias en nombre de la clínica
-- (soporte/ops). Idéntico patrón al ya existente en cancel_shift.
-- ============================================================

CREATE OR REPLACE FUNCTION accept_shift_application(p_application_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_shift_id        UUID;
  v_doctor_id       UUID;
  v_clinic_id       UUID;
  v_shift_status    shift_status;
  v_app_status      application_status;
BEGIN
  SELECT shift_id, doctor_id, status
  INTO v_shift_id, v_doctor_id, v_app_status
  FROM shift_applications WHERE id = p_application_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'APPLICATION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF v_app_status <> 'pending' THEN
    RAISE EXCEPTION 'APPLICATION_NOT_PENDING' USING ERRCODE = 'P0001';
  END IF;

  SELECT clinic_id, status
  INTO v_clinic_id, v_shift_status
  FROM shifts WHERE id = v_shift_id FOR UPDATE;

  IF v_clinic_id <> auth.uid() AND guardian_get_role() <> 'admin' THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = '42501';
  END IF;
  IF v_shift_status <> 'open' THEN
    RAISE EXCEPTION 'SHIFT_NOT_OPEN' USING ERRCODE = 'P0001';
  END IF;

  UPDATE shift_applications SET status = 'accepted' WHERE id = p_application_id;

  UPDATE shift_applications
  SET status = 'rejected'
  WHERE shift_id = v_shift_id AND status = 'pending' AND id <> p_application_id;

  UPDATE shift_applications sa
  SET status = 'rejected'
  FROM shifts s, shifts ref
  WHERE sa.doctor_id = v_doctor_id
    AND sa.status = 'pending'
    AND sa.shift_id <> v_shift_id
    AND s.id = sa.shift_id
    AND ref.id = v_shift_id
    AND tstzrange(s.starts_at, s.ends_at, '[)') && tstzrange(ref.starts_at, ref.ends_at, '[)');

  UPDATE shifts
  SET status = 'filled', assigned_doctor_id = v_doctor_id
  WHERE id = v_shift_id;

  INSERT INTO notifications (user_id, shift_id, type, title, body, link)
  SELECT v_doctor_id, v_shift_id, 'application_accepted',
    '¡Guardia asignada!',
    'Fuiste seleccionado para la guardia "' || title || '".',
    '/mis-guardias'
  FROM shifts WHERE id = v_shift_id;

  INSERT INTO notifications (user_id, shift_id, type, title, body, link)
  SELECT sa.doctor_id, v_shift_id, 'application_rejected',
    'Postulación no seleccionada',
    'La institución eligió a otro profesional para esta guardia.',
    '/dashboard-medico'
  FROM shift_applications sa
  WHERE sa.shift_id = v_shift_id AND sa.status = 'rejected' AND sa.doctor_id <> v_doctor_id;

  RETURN json_build_object('ok', true, 'doctor_id', v_doctor_id);
END;
$$;

REVOKE ALL ON FUNCTION accept_shift_application(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION accept_shift_application(UUID) TO authenticated;
