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
