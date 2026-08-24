-- 1. Normalizar correos en la base de datos a minúsculas
UPDATE public.empleados SET email = lower(trim(email));
UPDATE public.tenants SET email = lower(trim(email));
UPDATE auth.users SET email = lower(trim(email));

-- 2. Función RPC con SECURITY DEFINER para actualizar el ambiente fiscal de cualquier lavandería
CREATE OR REPLACE FUNCTION public.admin_update_ecf_environment(
  p_tenant_id uuid,
  p_environment text,
  p_ambiente text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF p_environment NOT IN ('TesteCF', 'CerteCF', 'eCF') THEN
    RAISE EXCEPTION 'Ambiente fiscal inválido: %', p_environment USING ERRCODE = '22023';
  END IF;

  UPDATE public.ecf_config
  SET pronesoft_environment = p_environment,
      ambiente = COALESCE(p_ambiente, CASE WHEN p_environment = 'eCF' THEN 'produccion' ELSE 'pruebas' END),
      updated_at = now()
  WHERE tenant_id = p_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_ecf_environment(uuid, text, text) TO authenticated, anon, service_role;

-- 3. Actualizar trigger guard_fiscal_environment_changes con soporte para administradores
CREATE OR REPLACE FUNCTION public.guard_fiscal_environment_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  jwt jsonb := COALESCE(auth.jwt(), '{}'::jsonb);
  caller_role text := COALESCE(jwt ->> 'role', '');
  caller_email text := lower(COALESCE(jwt ->> 'email', ''));
  is_environment_admin boolean :=
    current_user IN ('postgres', 'service_role', 'supabase_admin')
    OR caller_role = 'service_role'
    OR caller_email = 'admin@klynn.com.do'
    OR caller_email LIKE '%admin%'
    OR caller_email = 'yeriorlando@gmail.com';
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

NOTIFY pgrst, 'reload schema';
