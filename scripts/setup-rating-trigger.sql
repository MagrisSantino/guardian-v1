-- ============================================================
--  Guardian — Trigger automático de actualización de rating
--
--  Este trigger recalcula profiles.rating y profiles.reviews_count
--  automáticamente cada vez que se inserta una review, sin depender
--  del cliente.
--
--  Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Función que recalcula el rating del usuario calificado
CREATE OR REPLACE FUNCTION update_profile_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_avg   NUMERIC;
  v_count INTEGER;
BEGIN
  SELECT
    ROUND(AVG(rating)::NUMERIC, 2),
    COUNT(*)
  INTO v_avg, v_count
  FROM reviews
  WHERE reviewed_id = NEW.reviewed_id;

  UPDATE profiles
  SET
    rating        = v_avg,
    reviews_count = v_count
  WHERE id = NEW.reviewed_id;

  RETURN NEW;
END;
$$;

-- Trigger que llama a la función después de cada INSERT en reviews
DROP TRIGGER IF EXISTS trg_update_profile_rating ON reviews;

CREATE TRIGGER trg_update_profile_rating
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_rating();
