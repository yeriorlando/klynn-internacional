-- El ambiente Pronesoft es una asignación administrativa. Los usuarios de
-- lavanderías pueden editar sus demás datos fiscales, pero no mover su
-- operación entre TesteCF, CerteCF y eCF.

CREATE OR REPLACE FUNCTION public.guard_fiscal_environment_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
DECLARE
  jwt jsonb := COALESCE(auth.jwt(), '{}'::jsonb);
  caller_role text := COALESCE(jwt ->> 'role', '');
  caller_email text := lower(COALESCE(jwt ->> 'email', ''));
  is_environment_admin boolean :=
    current_user IN ('postgres', 'service_role', 'supabase_admin')
    OR caller_role = 'service_role'
    OR caller_email = 'admin@klynn.com.do';
BEGIN
  IF TG_TABLE_NAME = 'ecf_config' THEN
    IF TG_OP = 'INSERT' AND NOT is_environment_admin THEN
      NEW.pronesoft_environment := 'TesteCF';
      NEW.ambiente := 'pruebas';
    ELSIF TG_OP = 'UPDATE'
      AND (
        NEW.pronesoft_environment IS DISTINCT FROM OLD.pronesoft_environment
        OR NEW.ambiente IS DISTINCT FROM OLD.ambiente
      )
      AND NOT is_environment_admin
    THEN
      RAISE EXCEPTION 'El ambiente fiscal solo puede ser modificado por el Super Admin de Klynn.'
        USING ERRCODE = '42501';
    END IF;
  ELSIF TG_TABLE_NAME = 'global_config'
    AND TG_OP = 'UPDATE'
    AND NEW.fiscal_environment_policy IS DISTINCT FROM OLD.fiscal_environment_policy
    AND NOT is_environment_admin
  THEN
    RAISE EXCEPTION 'La política global fiscal solo puede ser modificada por el Super Admin de Klynn.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_ecf_config_environment ON public.ecf_config;
CREATE TRIGGER guard_ecf_config_environment
BEFORE INSERT OR UPDATE ON public.ecf_config
FOR EACH ROW EXECUTE FUNCTION public.guard_fiscal_environment_changes();

DROP TRIGGER IF EXISTS guard_global_fiscal_environment ON public.global_config;
CREATE TRIGGER guard_global_fiscal_environment
BEFORE UPDATE ON public.global_config
FOR EACH ROW EXECUTE FUNCTION public.guard_fiscal_environment_changes();

COMMENT ON FUNCTION public.guard_fiscal_environment_changes() IS
  'Impide que usuarios tenant cambien su ambiente Pronesoft o la política global; permite Super Admin y service_role.';

NOTIFY pgrst, 'reload schema';
