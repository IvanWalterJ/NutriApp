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
