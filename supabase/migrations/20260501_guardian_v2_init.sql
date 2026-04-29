-- ============================================================
-- Guardian v2 — Schema completo desde cero
-- Ejecutar en Supabase SQL Editor
-- ADVERTENCIA: Destruye el schema anterior. Hacer backup si hay datos.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0. LIMPIEZA DEL SCHEMA ANTERIOR
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS shift_status_history  CASCADE;
DROP TABLE IF EXISTS notifications         CASCADE;
DROP TABLE IF EXISTS reviews               CASCADE;
DROP TABLE IF EXISTS shift_applications    CASCADE;
DROP TABLE IF EXISTS shifts                CASCADE;
DROP TABLE IF EXISTS clinic_profiles       CASCADE;
DROP TABLE IF EXISTS doctor_profiles       CASCADE;
DROP TABLE IF EXISTS accounts              CASCADE;
DROP TABLE IF EXISTS profiles              CASCADE;

DROP FUNCTION IF EXISTS guardian_get_role()                          CASCADE;
DROP FUNCTION IF EXISTS guardian_prevent_self_verify()               CASCADE;
DROP FUNCTION IF EXISTS guardian_prevent_specialty_verify()          CASCADE;
DROP FUNCTION IF EXISTS guardian_check_shift_overlap()               CASCADE;
DROP FUNCTION IF EXISTS guardian_validate_shift_transition()         CASCADE;
DROP FUNCTION IF EXISTS guardian_validate_application_transition()   CASCADE;
DROP FUNCTION IF EXISTS guardian_notify_shift_cancelled()            CASCADE;
DROP FUNCTION IF EXISTS guardian_log_shift_status()                  CASCADE;
DROP FUNCTION IF EXISTS guardian_update_rating()                     CASCADE;
DROP FUNCTION IF EXISTS guardian_notify_application_status()         CASCADE;
DROP FUNCTION IF EXISTS accept_shift_application(UUID, UUID, UUID)   CASCADE;
DROP FUNCTION IF EXISTS accept_shift_application(UUID)               CASCADE;
DROP FUNCTION IF EXISTS withdraw_accepted_application(UUID)          CASCADE;
DROP FUNCTION IF EXISTS cancel_shift(UUID, TEXT)                     CASCADE;
DROP FUNCTION IF EXISTS mark_completed_shifts()                      CASCADE;
DROP FUNCTION IF EXISTS update_profile_rating()                      CASCADE;
DROP FUNCTION IF EXISTS handle_new_user()                            CASCADE;

DROP TYPE IF EXISTS account_role       CASCADE;
DROP TYPE IF EXISTS shift_status       CASCADE;
DROP TYPE IF EXISTS application_status CASCADE;
DROP TYPE IF EXISTS shift_category     CASCADE;

-- ────────────────────────────────────────────────────────────
-- 1. ENUMS
-- ────────────────────────────────────────────────────────────
CREATE TYPE account_role       AS ENUM ('doctor', 'clinic', 'admin');
CREATE TYPE shift_status       AS ENUM ('open', 'filled', 'completed', 'cancelled');
CREATE TYPE application_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');
CREATE TYPE shift_category     AS ENUM ('guardia', 'consultorio', 'ambulancia', 'otro');

-- ────────────────────────────────────────────────────────────
-- 2. TABLAS CORE
-- ────────────────────────────────────────────────────────────

-- Cuenta base: datos comunes a médicos y clínicas
CREATE TABLE accounts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid() REFERENCES auth.users(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
  role         account_role NOT NULL,
  email        TEXT        NOT NULL,
  full_name    TEXT        NOT NULL DEFAULT '',
  phone        TEXT,
  whatsapp     TEXT,          -- solo visible vía server post-aceptación
  avatar_url   TEXT,
  cover_url    TEXT,
  verified_at  TIMESTAMPTZ,   -- solo admin puede setear (trigger)
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Datos extendidos del médico (1:1 con accounts donde role='doctor')
CREATE TABLE doctor_profiles (
  id                 UUID        PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  dni                TEXT        UNIQUE,
  matricula          TEXT        UNIQUE,
  cuit               TEXT,
  specialty          TEXT[]      NOT NULL DEFAULT '{}',          -- especialidades declaradas por el médico
  specialty_verified TEXT[]      NOT NULL DEFAULT '{}',          -- especialidades validadas por admin (subconjunto de specialty)
  birth_date         DATE,
  university         TEXT,
  bio                TEXT,
  experience_tags    TEXT[]      NOT NULL DEFAULT '{}',
  location_maps      TEXT,
  km_from_cba        NUMERIC(6,1),
  blocked_dates      DATE[]      NOT NULL DEFAULT '{}',
  rating             NUMERIC(3,2) NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
  reviews_count      INT          NOT NULL DEFAULT 0 CHECK (reviews_count >= 0)
);

-- Datos extendidos de la clínica (1:1 con accounts donde role='clinic')
CREATE TABLE clinic_profiles (
  id            UUID        PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  cuit          TEXT        UNIQUE,
  admin_name    TEXT,
  provider_type TEXT,
  address       TEXT,
  location_maps TEXT,
  complexity    TEXT[]      NOT NULL DEFAULT '{}', -- niveles de complejidad (I, II, III, IV)
  num_doctors   INT,
  num_nurses    INT,
  resources   TEXT[]      NOT NULL DEFAULT '{}',
  services    TEXT[]      NOT NULL DEFAULT '{}',
  bio         TEXT,
  rating      NUMERIC(3,2) NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
  reviews_count INT       NOT NULL DEFAULT 0 CHECK (reviews_count >= 0)
);

-- Guardias publicadas por clínicas
CREATE TABLE shifts (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id          UUID          NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  title              TEXT          NOT NULL,
  description        TEXT,
  specialty_required TEXT          NOT NULL,
  starts_at          TIMESTAMPTZ   NOT NULL,
  ends_at            TIMESTAMPTZ   NOT NULL,
  price              INT           NOT NULL CHECK (price > 0),
  payment_timeframe  TEXT,
  viaticos           TEXT,
  shift_category     shift_category NOT NULL DEFAULT 'guardia',
  status             shift_status   NOT NULL DEFAULT 'open',
  assigned_doctor_id UUID          REFERENCES accounts(id) ON DELETE SET NULL,
  cancelled_at       TIMESTAMPTZ,
  cancelled_reason   TEXT,
  cancelled_by       UUID          REFERENCES accounts(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT ends_after_starts CHECK (ends_at > starts_at),
  CONSTRAINT assigned_only_when_filled CHECK (
    (status = 'filled' AND assigned_doctor_id IS NOT NULL) OR
    (status <> 'filled')
  )
);

-- Postulaciones de médicos a guardias
CREATE TABLE shift_applications (
  id          UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id    UUID               NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  doctor_id   UUID               NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  status      application_status NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  UNIQUE (shift_id, doctor_id)
);

-- Calificaciones post-guardia
CREATE TABLE reviews (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id     UUID    NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  reviewer_id  UUID    NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  reviewed_id  UUID    NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  rating       INT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shift_id, reviewer_id),
  CHECK (reviewer_id <> reviewed_id)
);

-- Notificaciones in-app
CREATE TABLE notifications (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID    NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  shift_id   UUID    REFERENCES shifts(id) ON DELETE SET NULL,
  type       TEXT    NOT NULL,   -- 'new_application' | 'application_accepted' | 'application_rejected' | 'shift_cancelled' | 'shift_assigned'
  title      TEXT    NOT NULL,
  body       TEXT,
  link       TEXT,               -- ruta relativa (ej: '/panel-clinica')
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 3. ÍNDICES DE PERFORMANCE
-- ────────────────────────────────────────────────────────────
CREATE INDEX idx_shifts_clinic_status     ON shifts (clinic_id, status);
CREATE INDEX idx_shifts_status_starts     ON shifts (status, starts_at);
CREATE INDEX idx_shifts_starts_at         ON shifts (starts_at) WHERE status = 'open';
CREATE INDEX idx_apps_doctor_status       ON shift_applications (doctor_id, status);
CREATE INDEX idx_apps_shift_status        ON shift_applications (shift_id, status);
CREATE INDEX idx_notifs_user_unread       ON notifications (user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_reviews_reviewed         ON reviews (reviewed_id);
CREATE INDEX idx_accounts_role            ON accounts (role) WHERE deleted_at IS NULL;

-- ────────────────────────────────────────────────────────────
-- 4. UPDATED_AT AUTOMÁTICO
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_accounts_updated_at
  BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_shifts_updated_at
  BEFORE UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_apps_updated_at
  BEFORE UPDATE ON shift_applications FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────
-- 5. HELPER RLS
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION guardian_get_role()
RETURNS TEXT AS $$
  SELECT role::text FROM accounts WHERE id = auth.uid() AND deleted_at IS NULL
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION guardian_is_verified()
RETURNS BOOLEAN AS $$
  SELECT verified_at IS NOT NULL FROM accounts WHERE id = auth.uid() AND deleted_at IS NULL
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ────────────────────────────────────────────────────────────
-- 6. TRIGGERS DE SEGURIDAD
-- ────────────────────────────────────────────────────────────

-- Solo admin puede setear verified_at
CREATE OR REPLACE FUNCTION guardian_prevent_self_verify()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verified_at IS DISTINCT FROM OLD.verified_at THEN
    IF guardian_get_role() <> 'admin' THEN
      RAISE EXCEPTION 'Solo admin puede modificar verified_at' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_prevent_self_verify
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION guardian_prevent_self_verify();

-- Solo admin puede modificar specialty_verified
CREATE OR REPLACE FUNCTION guardian_prevent_specialty_self_verify()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.specialty_verified IS DISTINCT FROM OLD.specialty_verified THEN
    IF guardian_get_role() <> 'admin' THEN
      RAISE EXCEPTION 'Solo admin puede modificar specialty_verified' USING ERRCODE = '42501';
    END IF;
    -- specialty_verified debe ser subconjunto de specialty
    IF NOT (NEW.specialty_verified <@ NEW.specialty) THEN
      RAISE EXCEPTION 'specialty_verified debe ser subconjunto de specialty' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_prevent_specialty_self_verify
  BEFORE UPDATE ON doctor_profiles
  FOR EACH ROW EXECUTE FUNCTION guardian_prevent_specialty_self_verify();

-- Validar role consistency: doctor_profiles solo para doctors, clinic_profiles solo para clinics
CREATE OR REPLACE FUNCTION guardian_enforce_role_profile()
RETURNS TRIGGER AS $$
DECLARE v_role account_role;
BEGIN
  SELECT role INTO v_role FROM accounts WHERE id = NEW.id;
  IF TG_TABLE_NAME = 'doctor_profiles' AND v_role <> 'doctor' THEN
    RAISE EXCEPTION 'doctor_profiles solo para role=doctor' USING ERRCODE = 'P0001';
  END IF;
  IF TG_TABLE_NAME = 'clinic_profiles' AND v_role <> 'clinic' THEN
    RAISE EXCEPTION 'clinic_profiles solo para role=clinic' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_enforce_doctor_role
  BEFORE INSERT ON doctor_profiles
  FOR EACH ROW EXECUTE FUNCTION guardian_enforce_role_profile();

CREATE TRIGGER trg_enforce_clinic_role
  BEFORE INSERT ON clinic_profiles
  FOR EACH ROW EXECUTE FUNCTION guardian_enforce_role_profile();

-- Máquina de estados: shifts
CREATE OR REPLACE FUNCTION guardian_validate_shift_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF guardian_get_role() = 'admin' THEN RETURN NEW; END IF;

  IF OLD.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Estado terminal inmutable: %', OLD.status USING ERRCODE = 'P0001';
  END IF;

  -- Transiciones válidas
  IF OLD.status = 'open'   AND NEW.status IN ('filled', 'cancelled')             THEN RETURN NEW; END IF;
  IF OLD.status = 'filled' AND NEW.status IN ('open', 'completed', 'cancelled')  THEN RETURN NEW; END IF;

  RAISE EXCEPTION 'Transición inválida: % → %', OLD.status, NEW.status USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_validate_shift_transition
  BEFORE UPDATE ON shifts
  FOR EACH ROW EXECUTE FUNCTION guardian_validate_shift_transition();

-- Máquina de estados: shift_applications
CREATE OR REPLACE FUNCTION guardian_validate_application_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF guardian_get_role() = 'admin' THEN RETURN NEW; END IF;

  IF OLD.status IN ('rejected', 'withdrawn') THEN
    RAISE EXCEPTION 'Estado terminal inmutable: %', OLD.status USING ERRCODE = 'P0001';
  END IF;

  IF OLD.status = 'pending'  AND NEW.status IN ('accepted', 'rejected', 'withdrawn') THEN RETURN NEW; END IF;
  IF OLD.status = 'accepted' AND NEW.status = 'withdrawn'                            THEN RETURN NEW; END IF;

  RAISE EXCEPTION 'Transición de postulación inválida: % → %', OLD.status, NEW.status USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_validate_application_transition
  BEFORE UPDATE ON shift_applications
  FOR EACH ROW EXECUTE FUNCTION guardian_validate_application_transition();

-- Bloquear postulación con solapamiento horario
CREATE OR REPLACE FUNCTION guardian_check_shift_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM shift_applications sa
    JOIN shifts s  ON s.id = sa.shift_id
    JOIN shifts ns ON ns.id = NEW.shift_id
    WHERE sa.doctor_id = NEW.doctor_id
      AND sa.status = 'accepted'
      AND sa.shift_id <> NEW.shift_id
      AND tstzrange(s.starts_at, s.ends_at, '[)')
       && tstzrange(ns.starts_at, ns.ends_at, '[)')
  ) THEN
    RAISE EXCEPTION 'SHIFT_OVERLAP' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_check_shift_overlap
  BEFORE INSERT ON shift_applications
  FOR EACH ROW EXECUTE FUNCTION guardian_check_shift_overlap();

-- Rating automático al insertar/modificar/borrar reviews
CREATE OR REPLACE FUNCTION guardian_update_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_target UUID;
  v_role   account_role;
  v_avg    NUMERIC;
  v_count  INT;
BEGIN
  v_target := CASE WHEN TG_OP = 'DELETE' THEN OLD.reviewed_id ELSE NEW.reviewed_id END;
  IF v_target IS NULL THEN RETURN NEW; END IF;

  SELECT role INTO v_role FROM accounts WHERE id = v_target;

  SELECT ROUND(AVG(rating)::NUMERIC, 2), COUNT(*)
  INTO v_avg, v_count
  FROM reviews WHERE reviewed_id = v_target;

  IF v_role = 'doctor' THEN
    UPDATE doctor_profiles SET rating = COALESCE(v_avg, 0), reviews_count = v_count WHERE id = v_target;
  ELSIF v_role = 'clinic' THEN
    UPDATE clinic_profiles SET rating = COALESCE(v_avg, 0), reviews_count = v_count WHERE id = v_target;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION guardian_update_rating();

-- Notificar al médico asignado cuando se cancela una guardia filled
CREATE OR REPLACE FUNCTION guardian_notify_shift_cancelled()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    -- Notificar postulantes pending
    INSERT INTO notifications (user_id, shift_id, type, title, body, link)
    SELECT
      sa.doctor_id,
      NEW.id,
      'shift_cancelled',
      'Guardia cancelada',
      'La guardia "' || NEW.title || '" fue cancelada por la institución.',
      '/dashboard'
    FROM shift_applications sa
    WHERE sa.shift_id = NEW.id AND sa.status = 'pending';

    -- Notificar médico asignado si venía de filled
    IF OLD.status = 'filled' AND NEW.assigned_doctor_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, shift_id, type, title, body, link)
      VALUES (
        OLD.assigned_doctor_id, NEW.id, 'shift_cancelled',
        'Guardia cancelada por la clínica',
        'La guardia "' || NEW.title || '" a la que estabas asignado fue cancelada.',
        '/mis-guardias'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_shift_cancelled
  AFTER UPDATE ON shifts
  FOR EACH ROW EXECUTE FUNCTION guardian_notify_shift_cancelled();

-- ────────────────────────────────────────────────────────────
-- 7. RPCs ATÓMICAS (todas SECURITY DEFINER)
-- ────────────────────────────────────────────────────────────

-- Aceptar postulante: atómica, evita race conditions
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
  -- Obtener y lockear la postulación
  SELECT shift_id, doctor_id, status
  INTO v_shift_id, v_doctor_id, v_app_status
  FROM shift_applications WHERE id = p_application_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'APPLICATION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF v_app_status <> 'pending' THEN
    RAISE EXCEPTION 'APPLICATION_NOT_PENDING' USING ERRCODE = 'P0001';
  END IF;

  -- Lockear y validar la guardia
  SELECT clinic_id, status
  INTO v_clinic_id, v_shift_status
  FROM shifts WHERE id = v_shift_id FOR UPDATE;

  IF v_clinic_id <> auth.uid() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = '42501';
  END IF;
  IF v_shift_status <> 'open' THEN
    RAISE EXCEPTION 'SHIFT_NOT_OPEN' USING ERRCODE = 'P0001';
  END IF;

  -- Aceptar la postulación elegida
  UPDATE shift_applications SET status = 'accepted' WHERE id = p_application_id;

  -- Rechazar las demás pendientes de esta guardia
  UPDATE shift_applications
  SET status = 'rejected'
  WHERE shift_id = v_shift_id AND status = 'pending' AND id <> p_application_id;

  -- Rechazar postulaciones del mismo médico con solapamiento horario
  UPDATE shift_applications sa
  SET status = 'rejected'
  FROM shifts s, shifts ref
  WHERE sa.doctor_id = v_doctor_id
    AND sa.status = 'pending'
    AND sa.shift_id <> v_shift_id
    AND s.id = sa.shift_id
    AND ref.id = v_shift_id
    AND tstzrange(s.starts_at, s.ends_at, '[)') && tstzrange(ref.starts_at, ref.ends_at, '[)');

  -- Marcar guardia como cubierta
  UPDATE shifts
  SET status = 'filled', assigned_doctor_id = v_doctor_id
  WHERE id = v_shift_id;

  -- Notificar al médico aceptado
  INSERT INTO notifications (user_id, shift_id, type, title, body, link)
  SELECT v_doctor_id, v_shift_id, 'application_accepted',
    '¡Guardia asignada!',
    'Fuiste seleccionado para la guardia "' || title || '".',
    '/mis-guardias'
  FROM shifts WHERE id = v_shift_id;

  -- Notificar a los rechazados
  INSERT INTO notifications (user_id, shift_id, type, title, body, link)
  SELECT sa.doctor_id, v_shift_id, 'application_rejected',
    'Postulación no seleccionada',
    'La institución eligió a otro profesional para esta guardia.',
    '/dashboard'
  FROM shift_applications sa
  WHERE sa.shift_id = v_shift_id AND sa.status = 'rejected' AND sa.doctor_id <> v_doctor_id;

  RETURN json_build_object('ok', true, 'doctor_id', v_doctor_id);
END;
$$;

-- Médico se retira de guardia aceptada (o cancela postulación pending)
CREATE OR REPLACE FUNCTION withdraw_application(p_shift_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_app_id     UUID;
  v_app_status application_status;
  v_shift_status shift_status;
  v_clinic_id  UUID;
  v_shift_title TEXT;
BEGIN
  SELECT id, status INTO v_app_id, v_app_status
  FROM shift_applications
  WHERE shift_id = p_shift_id AND doctor_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'APPLICATION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT status, clinic_id, title INTO v_shift_status, v_clinic_id, v_shift_title
  FROM shifts WHERE id = p_shift_id FOR UPDATE;

  -- Marcar postulación como withdrawn
  UPDATE shift_applications SET status = 'withdrawn' WHERE id = v_app_id;

  -- Si estaba aceptada, reabrir la guardia y notificar a la clínica
  IF v_app_status = 'accepted' THEN
    UPDATE shifts
    SET status = 'open', assigned_doctor_id = NULL
    WHERE id = p_shift_id;

    INSERT INTO notifications (user_id, shift_id, type, title, body, link)
    VALUES (
      v_clinic_id, p_shift_id, 'doctor_withdrew',
      'Médico se retiró de la guardia',
      'Un profesional se retiró de la guardia "' || v_shift_title || '". La guardia está disponible nuevamente.',
      '/panel-clinica'
    );
  END IF;

  RETURN json_build_object('ok', true, 'was_accepted', v_app_status = 'accepted');
END;
$$;

-- Clínica cancela guardia (open o filled)
CREATE OR REPLACE FUNCTION cancel_shift(p_shift_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_clinic_id UUID;
  v_status    shift_status;
BEGIN
  SELECT clinic_id, status INTO v_clinic_id, v_status
  FROM shifts WHERE id = p_shift_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SHIFT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF v_clinic_id <> auth.uid() AND guardian_get_role() <> 'admin' THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = '42501';
  END IF;
  IF v_status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'SHIFT_TERMINAL_STATE' USING ERRCODE = 'P0001';
  END IF;

  UPDATE shifts
  SET status = 'cancelled',
      cancelled_at = NOW(),
      cancelled_reason = p_reason,
      cancelled_by = auth.uid()
  WHERE id = p_shift_id;

  -- El trigger trg_notify_shift_cancelled se encarga de notificar automáticamente

  RETURN json_build_object('ok', true);
END;
$$;

-- Cron: completar guardias cuya fecha ya pasó
CREATE OR REPLACE FUNCTION mark_completed_shifts()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INT;
BEGIN
  UPDATE shifts SET status = 'completed'
  WHERE status = 'filled' AND ends_at < NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Permisos
REVOKE ALL ON FUNCTION accept_shift_application(UUID)   FROM PUBLIC;
REVOKE ALL ON FUNCTION withdraw_application(UUID)        FROM PUBLIC;
REVOKE ALL ON FUNCTION cancel_shift(UUID, TEXT)          FROM PUBLIC;
REVOKE ALL ON FUNCTION mark_completed_shifts()           FROM PUBLIC;

GRANT EXECUTE ON FUNCTION accept_shift_application(UUID)  TO authenticated;
GRANT EXECUTE ON FUNCTION withdraw_application(UUID)       TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_shift(UUID, TEXT)         TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 8. ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

-- ── accounts ──────────────────────────────────────────────
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Cualquier auth puede leer cuentas no eliminadas (para joins en feed/cards)
CREATE POLICY "accounts_select" ON accounts
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

-- Solo el propio usuario inserta su account (vía API ensure-profile)
CREATE POLICY "accounts_insert" ON accounts
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Cada usuario edita solo el suyo; admin puede editar cualquiera
CREATE POLICY "accounts_update" ON accounts
  FOR UPDATE TO authenticated
  USING     (id = auth.uid() OR guardian_get_role() = 'admin')
  WITH CHECK (id = auth.uid() OR guardian_get_role() = 'admin');

-- Soft-delete solo por admin
CREATE POLICY "accounts_delete" ON accounts
  FOR DELETE TO authenticated USING (guardian_get_role() = 'admin');

-- ── doctor_profiles ────────────────────────────────────────
ALTER TABLE doctor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doctor_profiles_select" ON doctor_profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "doctor_profiles_insert" ON doctor_profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "doctor_profiles_update" ON doctor_profiles
  FOR UPDATE TO authenticated
  USING     (id = auth.uid() OR guardian_get_role() = 'admin')
  WITH CHECK (id = auth.uid() OR guardian_get_role() = 'admin');

-- ── clinic_profiles ────────────────────────────────────────
ALTER TABLE clinic_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_profiles_select" ON clinic_profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "clinic_profiles_insert" ON clinic_profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "clinic_profiles_update" ON clinic_profiles
  FOR UPDATE TO authenticated
  USING     (id = auth.uid() OR guardian_get_role() = 'admin')
  WITH CHECK (id = auth.uid() OR guardian_get_role() = 'admin');

-- ── shifts ─────────────────────────────────────────────────
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Todos los auth ven guardias open/filled (feed); clínica ve las suyas siempre
CREATE POLICY "shifts_select" ON shifts
  FOR SELECT TO authenticated
  USING (
    status IN ('open', 'filled')
    OR clinic_id = auth.uid()
    OR assigned_doctor_id = auth.uid()
    OR guardian_get_role() = 'admin'
  );

-- Solo clínica puede crear guardias propias
CREATE POLICY "shifts_insert" ON shifts
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = auth.uid() AND guardian_get_role() = 'clinic');

-- Solo clínica dueña o admin puede modificar (médico NO puede editar la guardia)
CREATE POLICY "shifts_update" ON shifts
  FOR UPDATE TO authenticated
  USING     (clinic_id = auth.uid() OR guardian_get_role() = 'admin')
  WITH CHECK (clinic_id = auth.uid() OR guardian_get_role() = 'admin');

CREATE POLICY "shifts_delete" ON shifts
  FOR DELETE TO authenticated USING (guardian_get_role() = 'admin');

-- ── shift_applications ─────────────────────────────────────
ALTER TABLE shift_applications ENABLE ROW LEVEL SECURITY;

-- Médico ve sus propias; clínica ve las de sus guardias; admin ve todo
CREATE POLICY "applications_select" ON shift_applications
  FOR SELECT TO authenticated
  USING (
    doctor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM shifts WHERE id = shift_id AND clinic_id = auth.uid())
    OR guardian_get_role() = 'admin'
  );

-- Solo vía API server (admin client). Clientes directos: bloqueado.
-- La única excepción es admin para operaciones de soporte.
CREATE POLICY "applications_insert" ON shift_applications
  FOR INSERT TO authenticated
  WITH CHECK (guardian_get_role() = 'admin');

-- Solo vía RPCs (accept_shift_application, withdraw_application) — admin client
CREATE POLICY "applications_update" ON shift_applications
  FOR UPDATE TO authenticated
  USING (guardian_get_role() = 'admin');

CREATE POLICY "applications_delete" ON shift_applications
  FOR DELETE TO authenticated USING (guardian_get_role() = 'admin');

-- ── reviews ────────────────────────────────────────────────
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_select" ON reviews
  FOR SELECT TO authenticated USING (true);

-- Solo puede calificar quien participó del shift y está completado
CREATE POLICY "reviews_insert" ON reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM shifts s
      WHERE s.id = shift_id
        AND s.status = 'completed'
        AND (s.clinic_id = auth.uid() OR s.assigned_doctor_id = auth.uid())
    )
  );

CREATE POLICY "reviews_update" ON reviews
  FOR UPDATE TO authenticated USING (reviewer_id = auth.uid());

CREATE POLICY "reviews_delete" ON reviews
  FOR DELETE TO authenticated USING (guardian_get_role() = 'admin');

-- ── notifications ──────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select" ON notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Solo el server (admin client) o admin puede crear notificaciones para otros
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT TO authenticated WITH CHECK (guardian_get_role() = 'admin');

CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notifications_delete" ON notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR guardian_get_role() = 'admin');

-- ────────────────────────────────────────────────────────────
-- 9. VISTA PÚBLICA (campos no sensibles para feeds)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW accounts_public AS
  SELECT
    a.id, a.role, a.full_name, a.avatar_url, a.cover_url,
    a.verified_at IS NOT NULL AS is_verified,
    a.created_at,
    -- Doctor fields
    dp.specialty, dp.specialty_verified, dp.bio AS doctor_bio, dp.experience_tags,
    dp.km_from_cba, dp.location_maps AS doctor_location,
    dp.rating AS doctor_rating, dp.reviews_count AS doctor_reviews_count,
    -- Clinic fields
    cp.admin_name, cp.provider_type, cp.address, cp.location_maps AS clinic_location,
    cp.complexity, cp.num_doctors, cp.num_nurses,
    cp.resources, cp.services, cp.bio AS clinic_bio,
    cp.rating AS clinic_rating, cp.reviews_count AS clinic_reviews_count
  FROM accounts a
  LEFT JOIN doctor_profiles dp ON dp.id = a.id AND a.role = 'doctor'
  LEFT JOIN clinic_profiles  cp ON cp.id = a.id AND a.role = 'clinic'
  WHERE a.deleted_at IS NULL;

GRANT SELECT ON accounts_public TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 10. CRONS
-- Habilitar pg_cron primero en Supabase:
--   Dashboard → Database → Extensions → pg_cron → Enable
-- Luego ejecutar este bloque por separado:
-- ────────────────────────────────────────────────────────────
-- SELECT cron.schedule('guardian-mark-completed-shifts', '0 * * * *', $$ SELECT mark_completed_shifts() $$);
-- SELECT cron.schedule('guardian-cleanup-notifications', '0 3 * * *', $$ DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '30 days' $$);
