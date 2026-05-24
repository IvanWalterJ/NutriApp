-- ───────────────────────────────────────────────────────────────────────────
-- 005 — Timestamp de creación en sesiones.
--
-- `session_date` guarda sólo la fecha (sin hora), por lo que dos consultas
-- del mismo día no se podían ordenar correctamente. `created_at` desempata
-- y permite ordenar de forma estable en el historial del paciente.
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
