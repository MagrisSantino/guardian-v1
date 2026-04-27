-- ──────────────────────────────────────────────────────────────────────────
-- Guardian — Permitir cancelación de guardias asignadas (filled → cancelled)
-- ──────────────────────────────────────────────────────────────────────────

-- Ampliar la máquina de estados: filled también puede ir a cancelled.
-- Caso de uso: clínica cancela una guardia ya asignada (antes de la fecha).
-- El API route /api/shifts/cancel se encarga de notificar al médico y
-- marcar su postulación como 'withdrawn' antes de cambiar el estado.

CREATE OR REPLACE FUNCTION guardian_validate_shift_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF guardian_get_role() = 'super_admin' THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'completed' THEN
    RAISE EXCEPTION 'Una guardia completada es inmutable' USING ERRCODE = 'P0001';
  END IF;
  IF OLD.status = 'cancelled' THEN
    RAISE EXCEPTION 'Una guardia cancelada es inmutable' USING ERRCODE = 'P0001';
  END IF;

  IF OLD.status = 'draft'   AND NEW.status IN ('open', 'cancelled')             THEN RETURN NEW; END IF;
  IF OLD.status = 'open'    AND NEW.status IN ('filled', 'cancelled')            THEN RETURN NEW; END IF;
  IF OLD.status = 'filled'  AND NEW.status IN ('open', 'completed', 'cancelled') THEN RETURN NEW; END IF;

  RAISE EXCEPTION 'Transición de estado inválida: % → %', OLD.status, NEW.status
    USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- El trigger ya existe (trg_validate_shift_transition), solo reemplazamos la función.
-- También ampliar la notificación automática para el caso filled → cancelled:
-- notifica al médico asignado además de a los pendientes.

CREATE OR REPLACE FUNCTION guardian_notify_shift_cancelled()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IN ('open', 'filled') THEN
    -- Notificar postulantes pendientes
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

    -- Si estaba filled, notificar al médico asignado también
    IF OLD.status = 'filled' AND NEW.professional_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, shift_id, title, message)
      VALUES (
        OLD.professional_id,
        NEW.id,
        'Guardia cancelada por la clínica',
        'La institución canceló la guardia "' || COALESCE(NEW.title, 'sin título') || '" a la que habías sido asignado.'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
