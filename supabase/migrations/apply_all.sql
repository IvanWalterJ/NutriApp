-- ═══════════════════════════════════════════════════════════════════════════
-- NUTRIAPP — Migraciones consolidadas (auto-generado)
-- ═══════════════════════════════════════════════════════════════════════════
-- Este archivo concatena 001..011 para poder pegarlo de una sola vez en el
-- SQL Editor de Supabase. Para entender qué hace cada bloque, ver el archivo
-- numerado correspondiente y el README.md de esta carpeta.
--
-- Todas las migraciones son idempotentes — reaplicar no rompe estado existente.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- ▼  001_base_schema.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 001 — Base schema: profiles + patients + sessions (con antropometría ISAK).
--
-- Asume que las tablas `profiles`, `patients` y `sessions` ya existen como
-- esqueleto creado por Supabase Auth + el setup inicial del proyecto. Esta
-- migración agrega columnas nuevas y deja el schema listo para multi-empresa
-- y antropometría completa.
-- ───────────────────────────────────────────────────────────────────────────

-- Perfiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company text DEFAULT 'Galeno';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'pending';

-- Pacientes (tabla `patients`, anteriormente `employees`)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS company    text DEFAULT 'Galeno';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS email      text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone      text;

-- Sesiones — empresa y modalidad
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS company  text DEFAULT 'Galeno';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS modality text DEFAULT 'Presencial'; -- 'Presencial' | 'Online'

-- Antropometría — Datos básicos
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS height          numeric; -- talla por sesión (cm)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS sitting_height  numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS arm_span        numeric;

-- Antropometría — Pliegues cutáneos (mm)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS fold_triceps       numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS fold_subscapular   numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS fold_biceps        numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS fold_iliac_crest   numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS fold_supraspinale  numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS fold_abdominal     numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS fold_front_thigh   numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS fold_medial_calf   numeric;

-- Antropometría — Perímetros (cm)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS girth_head        numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS girth_neck        numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS girth_arm_relaxed numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS girth_arm_flexed  numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS girth_forearm     numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS girth_wrist       numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS girth_chest       numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS girth_waist       numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS girth_hip         numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS girth_thigh_max   numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS girth_thigh_mid   numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS girth_calf        numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS girth_ankle       numeric;

-- Antropometría — Diámetros óseos (cm)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS diam_biacromial        numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS diam_biiliocristal     numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS diam_transverse_chest  numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS diam_ap_chest          numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS diam_humerus           numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS diam_femur             numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS diam_wrist             numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS diam_ankle             numeric;

-- Antropometría — Longitudes y alturas (cm)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS len_acromiale_radiale              numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS len_radiale_stylion                numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS len_midstylion_dactylion           numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS len_iliospinale                    numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS len_trochanterion                  numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS len_trochanterion_tibiale_laterale numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS len_tibiale_laterale               numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS len_tibiale_mediale_sphyrion_tibiale numeric;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS len_foot                           numeric;

-- ═══════════════════════════════════════════════════════════════════════════
-- ▼  002_companies.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 002 — Empresas (fijas y ferias/eventos).
--
-- Distinción crítica: las empresas `fija` tienen métricas temporales
-- (evolución, adherencia, pérdida promedio). Las `feria` muestran sólo el
-- snapshot de la sesión única — esto lo aprovecha el dashboard para ocultar
-- métricas de evolución cuando no aplican.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.companies (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL UNIQUE,
  type        text NOT NULL DEFAULT 'fija' CHECK (type IN ('fija', 'feria')),
  created_at  timestamp with time zone DEFAULT now(),
  created_by  uuid REFERENCES auth.users(id)
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read companies" ON public.companies;
CREATE POLICY "Authenticated users can read companies"
  ON public.companies FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert companies" ON public.companies;
CREATE POLICY "Authenticated users can insert companies"
  ON public.companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete companies" ON public.companies;
CREATE POLICY "Authenticated users can delete companies"
  ON public.companies FOR DELETE
  TO authenticated
  USING (true);

-- Seed de empresas iniciales (fijas)
INSERT INTO public.companies (name, type) VALUES
  ('Galeno',                'fija'),
  ('Swiss Medical',         'fija'),
  ('Pistrelli',             'fija'),
  ('Consultorio Privado',   'fija'),
  ('Mercado Libre',         'fija'),
  ('Mercado Libre Virtual', 'fija')
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- ▼  003_patient_sex_session_fields.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 003 — Sexo del paciente + campos OMS por sesión.
--
-- sex en patients: necesario para los cálculos antropométricos (somatotipo,
-- % grasa según ecuaciones específicas por género).
-- session_type: distingue una consulta común de una toma antropométrica.
-- laboratorio_alterado: texto libre para anotar análisis fuera de rango.
-- consumo_frutas_verduras: escala OMS 1-5 (1=casi nunca, 5=todos los días).
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE patients ADD COLUMN IF NOT EXISTS sex text; -- 'Masculino' | 'Femenino'

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_type            text    DEFAULT 'Consulta'; -- 'Consulta' | 'Antropometría'
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS laboratorio_alterado    text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS consumo_frutas_verduras integer DEFAULT 1;

-- ═══════════════════════════════════════════════════════════════════════════
-- ▼  004_auth_trigger.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 004 — Trigger de alta automática en `profiles` cuando alguien se registra.
--
-- Cualquier nuevo usuario en `auth.users` recibe automáticamente un perfil
-- en `public.profiles` con role='pending'. Las nutricionistas tienen que
-- aprobar el acceso desde la sección Empresas/Usuarios.
--
-- También backfilllea perfiles huérfanos (usuarios que existían en auth
-- antes de que esto se montara).
-- ───────────────────────────────────────────────────────────────────────────

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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Backfill: cualquier auth.users que no esté en profiles
INSERT INTO public.profiles (id, full_name, email, role, company)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', email), email, 'pending', 'Galeno'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- ═══════════════════════════════════════════════════════════════════════════
-- ▼  005_sessions_created_at.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 005 — Timestamp de creación en sesiones.
--
-- `session_date` guarda sólo la fecha (sin hora), por lo que dos consultas
-- del mismo día no se podían ordenar correctamente. `created_at` desempata
-- y permite ordenar de forma estable en el historial del paciente.
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- ═══════════════════════════════════════════════════════════════════════════
-- ▼  006_delete_policies.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 006 — Políticas RLS de DELETE para patients y sessions.
--
-- Sin estas políticas, los DELETE devuelven OK pero afectan 0 filas (RLS
-- silencioso). Esto se manifestaba como "no puedo borrar el paciente" sin
-- ningún error en la UI.
-- ───────────────────────────────────────────────────────────────────────────

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

-- ═══════════════════════════════════════════════════════════════════════════
-- ▼  007_lab_results.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 007 — Resultados de laboratorio (seguimiento metabólico).
--
-- Tabla independiente porque la fecha del laboratorio puede no coincidir
-- con la fecha de la consulta (el paciente trae análisis hechos antes).
-- `session_id` es opcional: permite asociar el lab a una consulta cuando
-- se cargan juntos.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lab_results (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id         uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  session_id         uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  lab_date           date NOT NULL,
  glucose            numeric,  -- Glucemia en ayunas (mg/dL)
  hba1c              numeric,  -- Hemoglobina glicosilada (%)
  total_cholesterol  numeric,  -- Colesterol total (mg/dL)
  ldl                numeric,  -- LDL (mg/dL)
  hdl                numeric,  -- HDL (mg/dL)
  triglycerides      numeric,  -- Triglicéridos (mg/dL)
  vitamin_d          numeric,  -- 25-OH Vitamina D (ng/mL)
  bp_systolic        integer,  -- Presión sistólica (mmHg)
  bp_diastolic       integer,  -- Presión diastólica (mmHg)
  notes              text,
  created_at         timestamptz DEFAULT now(),
  created_by         uuid REFERENCES auth.users(id)
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

-- ═══════════════════════════════════════════════════════════════════════════
-- ▼  008_consultation_reason.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 008 — Motivo de consulta + notas por sesión.
--
-- Pedido de Rosana en la reunión 2026-05-22.
-- Se guardan a nivel sessions (no patients) porque el objetivo cambia entre
-- consultas — un paciente puede venir por descenso de peso la primera vez y
-- por educación alimentaria la siguiente.
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS consultation_reason text,
  ADD COLUMN IF NOT EXISTS consultation_notes  text;

-- ═══════════════════════════════════════════════════════════════════════════
-- ▼  009_import_batches.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 009 — Import masivo de pacientes desde Excel/CSV (Sprint 2).
--
-- Cada subida genera un import_batch_id que queda asociado a todos los
-- pacientes creados en esa operación. La UI los marca con badge "Importado"
-- para que las nutricionistas hagan una revisión en la primera consulta.
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

-- ═══════════════════════════════════════════════════════════════════════════
-- ▼  010_forms_public.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 010 — Formularios públicos pre-consulta (Sprint 3).
--
-- Cada formulario tiene un slug único (ej. "feria-pampa-jun26") que se
-- comparte por link o QR. Los pacientes lo completan SIN auth — RLS permite
-- INSERT anónimo sobre form_responses si el form sigue activo y no vencido.
--
-- Después, las nutricionistas ven las respuestas en la Bandeja y las
-- promueven a pacientes reales (crea + sesión inicial OMS automáticamente).
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.forms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,
  company     text NOT NULL,
  title       text NOT NULL,
  description text,
  -- Definición declarativa de los campos. Estructura:
  -- [{ key, label, type, required, options?, placeholder? }]
  -- type: 'text' | 'email' | 'tel' | 'date' | 'number' | 'select' | 'textarea' | 'rating1to5' | 'yesno'
  fields      jsonb NOT NULL DEFAULT '[]'::jsonb,
  expires_at  timestamptz,
  is_active   boolean DEFAULT true,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forms_company ON public.forms(company);
CREATE INDEX IF NOT EXISTS idx_forms_slug    ON public.forms(slug);

CREATE TABLE IF NOT EXISTS public.form_responses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id       uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  -- Snapshot de la respuesta del paciente. Las keys matchean fields[i].key.
  data          jsonb NOT NULL,
  -- pending: aún no revisada por la nutricionista
  -- processed: ya se creó (o linkeó) un paciente desde esta respuesta
  -- discarded: la nutri la marcó como spam o duplicada
  status        text DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'discarded')),
  patient_id    uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  submitted_at  timestamptz DEFAULT now(),
  processed_at  timestamptz,
  processed_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_agent    text
);

CREATE INDEX IF NOT EXISTS idx_form_responses_form_status
  ON public.form_responses(form_id, status);

-- RLS forms
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;

-- Lectura pública sólo de los forms activos y no vencidos — para que el
-- formulario público pueda traer el título/campos por slug sin auth.
DROP POLICY IF EXISTS "Public can read active forms" ON public.forms;
CREATE POLICY "Public can read active forms"
  ON public.forms FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Las nutricionistas autenticadas ven TODOS los forms (incl. inactivos/vencidos).
DROP POLICY IF EXISTS "Authenticated users can read all forms" ON public.forms;
CREATE POLICY "Authenticated users can read all forms"
  ON public.forms FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert forms" ON public.forms;
CREATE POLICY "Authenticated users can insert forms"
  ON public.forms FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update forms" ON public.forms;
CREATE POLICY "Authenticated users can update forms"
  ON public.forms FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete forms" ON public.forms;
CREATE POLICY "Authenticated users can delete forms"
  ON public.forms FOR DELETE
  TO authenticated
  USING (true);

-- RLS form_responses
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

-- INSERT público (paciente sin auth) sólo si el form sigue vivo al momento del submit.
DROP POLICY IF EXISTS "Anyone can submit form responses" ON public.form_responses;
CREATE POLICY "Anyone can submit form responses"
  ON public.form_responses FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_responses.form_id
        AND f.is_active = true
        AND (f.expires_at IS NULL OR f.expires_at > now())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can read form_responses" ON public.form_responses;
CREATE POLICY "Authenticated users can read form_responses"
  ON public.form_responses FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can update form_responses" ON public.form_responses;
CREATE POLICY "Authenticated users can update form_responses"
  ON public.form_responses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete form_responses" ON public.form_responses;
CREATE POLICY "Authenticated users can delete form_responses"
  ON public.form_responses FOR DELETE
  TO authenticated
  USING (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- ▼  011_company_brand_template.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 011 — Plantilla de marca por empresa (Sprint 4 — Fase 2.3).
--
-- Permite que cada empresa elija qué branding usar en sus informes PDF.
-- Empezamos con dos templates registrados en código (default | swiss_medical),
-- pero `brand_config` jsonb queda abierta para overrides puntuales (logo URL,
-- colores, footer) sin necesidad de crear columnas nuevas por cliente.
--
-- - default:       NuPlan (header verde corporativo + nombre de la Lic.)
-- - swiss_medical: logo SM + paleta SM (rojo) en lugar del verde NuPlan
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS brand_template text DEFAULT 'default'
    CHECK (brand_template IN ('default', 'swiss_medical')),
  ADD COLUMN IF NOT EXISTS brand_config   jsonb;
