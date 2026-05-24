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
