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
