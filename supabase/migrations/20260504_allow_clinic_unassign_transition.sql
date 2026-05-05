-- Allow clinic unassignment: accepted → pending transition.
-- The original state machine only permitted accepted → withdrawn, blocking the
-- clinic from releasing a doctor while keeping them as a pending applicant.
--
-- We allow this transition when:
--   a) guardian_get_role() = 'clinic'  (authenticated clinic user calling via RPC)
--   b) auth.uid() IS NULL              (service_role / admin client from API server)
--      The service_role key is server-only; the API already validates clinic ownership.

CREATE OR REPLACE FUNCTION guardian_validate_application_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF guardian_get_role() = 'admin' THEN RETURN NEW; END IF;

  -- Terminal states cannot be changed (except by admin above)
  IF OLD.status IN ('rejected', 'withdrawn') THEN
    RAISE EXCEPTION 'Transición de postulación inválida: % → %', OLD.status, NEW.status USING ERRCODE = 'P0001';
  END IF;

  -- Standard transitions
  IF OLD.status = 'pending'  AND NEW.status IN ('accepted', 'rejected', 'withdrawn') THEN RETURN NEW; END IF;
  IF OLD.status = 'accepted' AND NEW.status = 'withdrawn'                            THEN RETURN NEW; END IF;

  -- Clinic unassignment: reset accepted → pending so the doctor remains a postulante.
  -- Allowed for clinic role or service_role (server-side API, auth.uid() IS NULL).
  IF OLD.status = 'accepted' AND NEW.status = 'pending'
    AND (guardian_get_role() = 'clinic' OR auth.uid() IS NULL)
  THEN RETURN NEW; END IF;

  RAISE EXCEPTION 'Transición de postulación inválida: % → %', OLD.status, NEW.status USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
