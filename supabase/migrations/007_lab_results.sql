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
