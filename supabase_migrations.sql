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

-- MIGRACIÓN: Tabla de empresas (fijas y ferias)
-- Ejecutar en Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'fija' CHECK (type IN ('fija', 'feria')),
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Política: cualquier usuario autenticado puede leer
DROP POLICY IF EXISTS "Authenticated users can read companies" ON public.companies;
CREATE POLICY "Authenticated users can read companies"
  ON public.companies FOR SELECT
  TO authenticated
  USING (true);

-- Política: cualquier usuario autenticado puede insertar
DROP POLICY IF EXISTS "Authenticated users can insert companies" ON public.companies;
CREATE POLICY "Authenticated users can insert companies"
  ON public.companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: cualquier usuario autenticado puede eliminar (solo ferias)
DROP POLICY IF EXISTS "Authenticated users can delete companies" ON public.companies;
CREATE POLICY "Authenticated users can delete companies"
  ON public.companies FOR DELETE
  TO authenticated
  USING (true);

-- Seed: cargar las empresas existentes (fijas)
INSERT INTO public.companies (name, type) VALUES
  ('Galeno', 'fija'),
  ('Swiss Medical', 'fija'),
  ('Pistrelli', 'fija'),
  ('Consultorio Privado', 'fija'),
  ('Mercado Libre', 'fija'),
  ('Mercado Libre Virtual', 'fija')
ON CONFLICT (name) DO NOTHING;

-- MIGRACIÓN: Sexo del paciente (necesario para cálculos antropométricos)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS sex text; -- 'Masculino' | 'Femenino'

-- MIGRACIÓN: Nuevos campos en sesiones
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_type text DEFAULT 'Consulta'; -- 'Consulta' | 'Antropometría'
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS laboratorio_alterado text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS consumo_frutas_verduras integer DEFAULT 1; -- escala 1-5

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

-- MIGRACIÓN: Timestamp de creación en sesiones (necesario para desempatar sesiones del mismo día)
-- session_date solo guarda la fecha (sin hora), por lo que dos consultas del mismo día
-- no se pueden ordenar correctamente sin este campo.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- MIGRACIÓN: Habilitar borrado de pacientes y sesiones (RLS)
-- Sin estas políticas, DELETE devuelve OK pero afecta 0 filas (RLS silencioso).
DROP POLICY IF EXISTS "Authenticated users can delete patients" ON public.patients;
CREATE POLICY "Authenticated users can delete patients"
  ON public.patients FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete sessions" ON public.sessions;
CREATE POLICY "Authenticated users can delete sessions"
  ON public.sessions FOR DELETE
  TO authenticated
  USING (true);

-- MIGRACIÓN: Resultados de laboratorio para seguimiento metabólico
-- Tabla independiente porque la fecha del laboratorio puede no coincidir con la
-- fecha de la consulta (el paciente trae análisis hechos antes). session_id es
-- opcional: permite asociar el lab a una consulta cuando se carga junto a ella.
CREATE TABLE IF NOT EXISTS public.lab_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  lab_date date NOT NULL,
  glucose numeric,            -- Glucemia en ayunas (mg/dL)
  hba1c numeric,              -- Hemoglobina glicosilada (%)
  total_cholesterol numeric,  -- Colesterol total (mg/dL)
  ldl numeric,                -- LDL (mg/dL)
  hdl numeric,                -- HDL (mg/dL)
  triglycerides numeric,      -- Triglicéridos (mg/dL)
  vitamin_d numeric,          -- 25-OH Vitamina D (ng/mL)
  bp_systolic integer,        -- Presión sistólica (mmHg)
  bp_diastolic integer,       -- Presión diastólica (mmHg)
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_lab_results_patient_date
  ON public.lab_results (patient_id, lab_date DESC);

ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read lab_results" ON public.lab_results;
CREATE POLICY "Authenticated users can read lab_results"
  ON public.lab_results FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert lab_results" ON public.lab_results;
CREATE POLICY "Authenticated users can insert lab_results"
  ON public.lab_results FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update lab_results" ON public.lab_results;
CREATE POLICY "Authenticated users can update lab_results"
  ON public.lab_results FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete lab_results" ON public.lab_results;
CREATE POLICY "Authenticated users can delete lab_results"
  ON public.lab_results FOR DELETE
  TO authenticated
  USING (true);

-- ───────────────────────────────────────────────────────────────────────────
-- Motivo de consulta + notas por sesión (Rosana, reunión 2026-05-22).
-- Permite registrar por qué viene el paciente cada vez (no es fijo a nivel
-- patient porque el objetivo cambia entre consultas).
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS consultation_reason text,
  ADD COLUMN IF NOT EXISTS consultation_notes  text;

-- ───────────────────────────────────────────────────────────────────────────
-- Import masivo de pacientes desde Excel (Sprint 2 — Fase 3.1).
-- Cada upload genera un import_batch_id; los pacientes resultantes quedan
-- marcados para que las nutricionistas hagan una revisión en la primera
-- consulta.
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.import_batches (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company         text NOT NULL,
  nutritionist_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  filename        text,
  rows_inserted   integer DEFAULT 0,
  rows_skipped    integer DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS import_batch_id uuid REFERENCES public.import_batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS imported_at     timestamptz;

CREATE INDEX IF NOT EXISTS idx_patients_import_batch ON public.patients(import_batch_id);

-- RLS para import_batches: las nutricionistas autenticadas pueden leer y
-- crear sus propios batches.
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read import_batches" ON public.import_batches;
CREATE POLICY "Authenticated users can read import_batches"
  ON public.import_batches FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert import_batches" ON public.import_batches;
CREATE POLICY "Authenticated users can insert import_batches"
  ON public.import_batches FOR INSERT
  TO authenticated
  WITH CHECK (true);
