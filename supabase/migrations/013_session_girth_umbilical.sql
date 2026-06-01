-- ───────────────────────────────────────────────────────────────────────────
-- 013 — Perímetro umbilical por sesión.
--
-- Rosana usa el Contorno/Perímetro Umbilical en su planilla (ver informe de
-- referencia "Nicolas Mugica.pdf"): es la medida con la que clasifica el riesgo
-- abdominal ("Contorno Umbilical", ref < 94 cm M / < 80 cm F) y que figura en
-- los DATOS ANTROPOMÉTRICOS. Antes la app no la pedía; se agrega acá.
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS girth_umbilical numeric; -- perímetro umbilical (cm)
