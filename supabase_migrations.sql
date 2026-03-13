-- Actualización de la Tabla de Perfiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company text DEFAULT 'Galeno';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'pending';

-- Actualización de la Tabla de Pacientes (patients, anteriormente employees)
-- 1. Agregar columna de empresa
ALTER TABLE patients ADD COLUMN IF NOT EXISTS company text DEFAULT 'Galeno';
-- 2. Agregar columnas de datos personales
ALTER TABLE patients ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone text;

-- Insertar algunos pacientes de prueba para probar el selector (OPCIONAL)
-- UPDATE patients SET company = 'Swiss Medical' WHERE id IN (SELECT id FROM patients LIMIT 2);

-- Actualización de la Tabla de Sesiones (sessions)
-- 1. Agregar columna de empresa y modalidad
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS company text DEFAULT 'Galeno';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS modality text DEFAULT 'Presencial'; -- 'Presencial' o 'Online'

-- 2. Agregar mediciones de Antropometría (Datos Básicos)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS height numeric; -- en caso de que quieran registrar talla por sesión
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS sitting_height numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS arm_span numeric;

-- 3. Agregar mediciones de Pliegues Cutáneos (mm)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS fold_triceps numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS fold_subscapular numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS fold_biceps numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS fold_iliac_crest numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS fold_supraspinale numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS fold_abdominal numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS fold_front_thigh numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS fold_medial_calf numeric;

-- 4. Agregar mediciones de Perímetros (cm)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS girth_head numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS girth_neck numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS girth_arm_relaxed numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS girth_arm_flexed numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS girth_forearm numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS girth_wrist numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS girth_chest numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS girth_waist numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS girth_hip numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS girth_thigh_max numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS girth_thigh_mid numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS girth_calf numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS girth_ankle numeric;

-- 5. Agregar Diámetros Óseos (cm)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS diam_biacromial numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS diam_biiliocristal numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS diam_transverse_chest numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS diam_ap_chest numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS diam_humerus numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS diam_femur numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS diam_wrist numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS diam_ankle numeric;

-- 6. Agregar Longitudes y Alturas (cm)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS len_acromiale_radiale numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS len_radiale_stylion numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS len_midstylion_dactylion numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS len_iliospinale numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS len_trochanterion numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS len_trochanterion_tibiale_laterale numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS len_tibiale_laterale numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS len_tibiale_mediale_sphyrion_tibiale numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS len_foot numeric;

-- Ojalá estas migraciones pasen de una sin problema! 🚀

-- MIGRACIÓN DE ACCESO DE USUARIOS (NUEVO)
-- Esto crea una entrada automática en perfiles cuando alguien se registra.

-- 1. Crear la función del trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, company)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Nuevo Profesional'), 
    new.email,
    'pending', 
    'Galeno'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Asegurarnos que el trigger se conecte a auth.users (recreándolo para actualizarlo)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Para cualquier cuenta existente que esté huérfana en 'auth.users' y no esté en 'profiles':
INSERT INTO public.profiles (id, full_name, email, role, company)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', email), email, 'pending', 'Galeno'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
