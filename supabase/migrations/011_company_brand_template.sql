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
