-- ───────────────────────────────────────────────────────────────────────────
-- 004 — Trigger de alta automática en `profiles` cuando alguien se registra.
--
-- Cualquier nuevo usuario en `auth.users` recibe automáticamente un perfil
-- en `public.profiles` con role='pending'. Las nutricionistas tienen que
-- aprobar el acceso desde la sección Empresas/Usuarios.
--
-- También backfilllea perfiles huérfanos (usuarios que existían en auth
-- antes de que esto se montara).
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, company)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Nuevo Profesional'),
    new.email,
    'pending',
    'Galeno'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Backfill: cualquier auth.users que no esté en profiles
INSERT INTO public.profiles (id, full_name, email, role, company)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', email), email, 'pending', 'Galeno'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
