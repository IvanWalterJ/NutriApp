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
