-- Ejecutá este script en el SQL Editor de Supabase (Dashboard > SQL Editor)
-- para agregar las columnas que usa el perfil del Prestador en la tabla profiles.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS provider_type text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS institution_description text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS provincia text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS localidad text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS complexity jsonb DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resources jsonb DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS num_doctors integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS num_nurses integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS services jsonb DEFAULT '[]';
