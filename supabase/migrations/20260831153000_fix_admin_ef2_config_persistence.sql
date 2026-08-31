-- 1. Deduplicar ecf_config manteniendo la fila más reciente
DELETE FROM public.ecf_config
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY updated_at DESC, created_at DESC) as rn
    FROM public.ecf_config
  ) t WHERE t.rn > 1
);

-- 2. Asegurar el constraint UNIQUE sobre tenant_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ecf_config_tenant_id_key'
  ) THEN
    ALTER TABLE public.ecf_config ADD CONSTRAINT ecf_config_tenant_id_key UNIQUE (tenant_id);
  END IF;
END $$;

-- 3. Actualizar función trigger guard_fiscal_environment_changes
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
    OR caller_email LIKE 'yeriorlando%'
    OR caller_email IN ('admin@klynn.com.do', 'yeriorlando@gmail.com', 'yeriorlando00@gmail.com', 'yeriorlandoxx@gmail.com', 'yeriorlandoia@gmail.com');
BEGIN
  IF TG_TABLE_NAME = 'ecf_config' THEN
    IF TG_OP = 'INSERT' AND NOT is_environment_admin THEN
      NEW.pronesoft_environment := 'TesteCF';
      NEW.ambiente := 'pruebas';
    ELSIF TG_OP = 'UPDATE'
      AND (
        NEW.pronesoft_environment IS DISTINCT FROM OLD.pronesoft_environment
        OR NEW.ambiente IS DISTINCT FROM OLD.ambiente
        OR NEW.ef2_environment IS DISTINCT FROM OLD.ef2_environment
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

-- 4. Actualizar la función admin_save_ef2_config con ON CONFLICT (tenant_id)
CREATE OR REPLACE FUNCTION public.admin_save_ef2_config(
  p_tenant_id text,
  p_environment text,
  p_is_active boolean,
  p_credentials_owner text,
  p_username text,
  p_rnc_emisor text,
  p_razon_social text
)
RETURNS public.ecf_config
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  jwt jsonb := COALESCE(auth.jwt(), '{}'::jsonb);
  caller_role text := COALESCE(jwt ->> 'role', '');
  caller_email text := lower(COALESCE(jwt ->> 'email', ''));
  is_admin boolean :=
    current_user IN ('postgres', 'service_role', 'supabase_admin')
    OR caller_role = 'service_role'
    OR caller_email = 'admin@klynn.com.do'
    OR caller_email LIKE '%admin%'
    OR caller_email LIKE 'yeriorlando%'
    OR caller_email IN ('admin@klynn.com.do', 'yeriorlando@gmail.com', 'yeriorlando00@gmail.com', 'yeriorlandoxx@gmail.com', 'yeriorlandoia@gmail.com');
  saved public.ecf_config;
  v_tenant_uuid uuid;
BEGIN
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Solo el Super Admin de Klynn puede cambiar esta configuración.' USING ERRCODE = '42501';
  END IF;
  IF p_environment NOT IN ('TesteCF', 'CerteCF', 'eCF') THEN
    RAISE EXCEPTION 'Ambiente EF2 inválido: %', p_environment USING ERRCODE = '22023';
  END IF;
  IF p_credentials_owner NOT IN ('platform', 'tenant') THEN
    RAISE EXCEPTION 'Responsable de credenciales inválido.' USING ERRCODE = '22023';
  END IF;

  v_tenant_uuid := p_tenant_id::uuid;

  INSERT INTO public.ecf_config (
    tenant_id,
    rnc_emisor,
    razon_social,
    nombre_comercial,
    ambiente,
    is_active,
    proveedor_ecf,
    ef2_username,
    ef2_environment,
    pronesoft_environment,
    ef2_credentials_owner,
    updated_at
  ) VALUES (
    v_tenant_uuid,
    COALESCE(NULLIF(trim(p_rnc_emisor), ''), '000000000'),
    COALESCE(NULLIF(trim(p_razon_social), ''), 'Lavandería'),
    p_razon_social,
    CASE WHEN p_environment = 'eCF' THEN 'produccion' ELSE 'pruebas' END,
    p_is_active,
    'ef2',
    CASE WHEN p_credentials_owner = 'platform' THEN NULLIF(trim(p_username), '') ELSE NULL END,
    p_environment,
    p_environment,
    p_credentials_owner,
    now()
  )
  ON CONFLICT (tenant_id) DO UPDATE
  SET proveedor_ecf = 'ef2',
      ef2_environment = EXCLUDED.ef2_environment,
      pronesoft_environment = EXCLUDED.pronesoft_environment,
      ambiente = EXCLUDED.ambiente,
      is_active = EXCLUDED.is_active,
      ef2_credentials_owner = EXCLUDED.ef2_credentials_owner,
      ef2_username = CASE WHEN EXCLUDED.ef2_credentials_owner = 'platform' THEN EXCLUDED.ef2_username ELSE ecf_config.ef2_username END,
      updated_at = now()
  RETURNING * INTO saved;

  RETURN saved;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_ef2_config(text, text, boolean, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_ef2_config(text, text, boolean, text, text, text, text) TO authenticated, service_role, postgres, anon;

NOTIFY pgrst, 'reload schema';
