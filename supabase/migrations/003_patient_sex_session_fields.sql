-- ───────────────────────────────────────────────────────────────────────────
-- 003 — Sexo del paciente + campos OMS por sesión.
--
-- sex en patients: necesario para los cálculos antropométricos (somatotipo,
-- % grasa según ecuaciones específicas por género).
-- session_type: distingue una consulta común de una toma antropométrica.
-- laboratorio_alterado: texto libre para anotar análisis fuera de rango.
-- consumo_frutas_verduras: escala OMS 1-5 (1=casi nunca, 5=todos los días).
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE patients ADD COLUMN IF NOT EXISTS sex text; -- 'Masculino' | 'Femenino'

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_type            text    DEFAULT 'Consulta'; -- 'Consulta' | 'Antropometría'
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS laboratorio_alterado    text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS consumo_frutas_verduras integer DEFAULT 1;
