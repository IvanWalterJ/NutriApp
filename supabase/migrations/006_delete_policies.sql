-- ───────────────────────────────────────────────────────────────────────────
-- 006 — Políticas RLS de DELETE para patients y sessions.
--
-- Sin estas políticas, los DELETE devuelven OK pero afectan 0 filas (RLS
-- silencioso). Esto se manifestaba como "no puedo borrar el paciente" sin
-- ningún error en la UI.
-- ───────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated users can delete patients" ON public.patients;
CREATE POLICY "Authenticated users can delete patients"
  ON public.patients FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete sessions" ON public.sessions;
CREATE POLICY "Authenticated users can delete sessions"
  ON public.sessions FOR DELETE
  TO authenticated
  USING (true);
