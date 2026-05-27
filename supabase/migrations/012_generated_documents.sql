-- ───────────────────────────────────────────────────────────────────────────
-- 012 — Documentos generados por IA (planes nutricionales y recetarios).
--
-- Antes los planes/recetas vivían sólo en memoria del cliente — al cerrar
-- la pestaña se perdían. Ahora cada generación se persiste para poder volver
-- a verla, reimprimirla o reutilizarla.
--
-- Estructura polimorfa: una sola tabla con columna `type` ('meal_plan' |
-- 'recipes'). Esto permite filtrar la sección Planes vs Recetario sin
-- duplicar el schema; el contenido específico vive en los jsonb.
--
-- - input  → snapshot del formulario que el usuario completó (peso, altura,
--           intolerancias, calorías objetivo, etc.). Útil para regenerar
--           variantes ajustando un solo campo.
-- - output → estructura completa devuelta por la IA (plates, foodGroups,
--           menuIdeas, planObjective; o recipes[] con ingredientes, pasos,
--           tips). Es lo que se re-renderiza al abrir un documento viejo.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.generated_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type            text NOT NULL CHECK (type IN ('meal_plan', 'recipes')),
  title           text NOT NULL,
  company         text NOT NULL,
  -- Paciente asociado (opcional — algunos planes/recetarios se generan
  -- genéricos sin elegir paciente). Si se borra el paciente, el documento
  -- conserva patient_name por si se quiere consultar el histórico.
  patient_id      uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name    text,
  nutritionist_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  input           jsonb,
  output          jsonb NOT NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_docs_company_type_date
  ON public.generated_documents (company, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_generated_docs_patient
  ON public.generated_documents (patient_id);

ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read generated_documents" ON public.generated_documents;
CREATE POLICY "Authenticated users can read generated_documents"
  ON public.generated_documents FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert generated_documents" ON public.generated_documents;
CREATE POLICY "Authenticated users can insert generated_documents"
  ON public.generated_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update generated_documents" ON public.generated_documents;
CREATE POLICY "Authenticated users can update generated_documents"
  ON public.generated_documents FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete generated_documents" ON public.generated_documents;
CREATE POLICY "Authenticated users can delete generated_documents"
  ON public.generated_documents FOR DELETE
  TO authenticated
  USING (true);
