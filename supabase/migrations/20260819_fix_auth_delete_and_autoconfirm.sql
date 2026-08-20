-- 1. Permisos para auth y public schemas
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role, supabase_auth_admin, supabase_admin;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres, supabase_auth_admin, supabase_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO postgres, supabase_auth_admin, supabase_admin;
GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO postgres, supabase_auth_admin, supabase_admin;

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin, supabase_admin;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, supabase_auth_admin, supabase_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, supabase_auth_admin, supabase_admin;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, supabase_auth_admin, supabase_admin;

-- 2. Confirmar usuarios existentes pendientes
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email_confirmed_at IS NULL;

-- 3. Trigger en public.empleados para eliminar automáticamente de auth.users al borrar un empleado
CREATE OR REPLACE FUNCTION public.cleanup_auth_user_on_empleado_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.id IS NOT NULL THEN
    DELETE FROM auth.identities WHERE user_id = OLD.id;
    DELETE FROM auth.sessions WHERE user_id = OLD.id;
    DELETE FROM auth.users WHERE id = OLD.id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth, public;

ALTER FUNCTION public.cleanup_auth_user_on_empleado_delete() OWNER TO supabase_admin;

DROP TRIGGER IF EXISTS tr_cleanup_auth_user_on_empleado_delete ON public.empleados;
CREATE TRIGGER tr_cleanup_auth_user_on_empleado_delete
AFTER DELETE ON public.empleados
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_auth_user_on_empleado_delete();

-- 4. RPC Function admin_delete_user
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  DELETE FROM public.empleados WHERE id = target_user_id;
  DELETE FROM auth.identities WHERE user_id = target_user_id;
  DELETE FROM auth.sessions WHERE user_id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

ALTER FUNCTION public.admin_delete_user(UUID) OWNER TO supabase_admin;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO anon, authenticated, service_role, postgres;

-- 5. RPC Function admin_set_user_email (permite auto-confirmar email en creación directa de empleados)
CREATE OR REPLACE FUNCTION public.admin_set_user_email(target_user_id UUID, new_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  UPDATE auth.users
  SET email = lower(trim(new_email)),
      email_confirmed_at = now(),
      updated_at = now()
  WHERE id = target_user_id;
  
  UPDATE auth.identities
  SET identity_data = jsonb_set(COALESCE(identity_data, '{}'::jsonb), '{email}', to_jsonb(lower(trim(new_email))))
  WHERE user_id = target_user_id;
END;
$$;

ALTER FUNCTION public.admin_set_user_email(UUID, TEXT) OWNER TO supabase_admin;
GRANT EXECUTE ON FUNCTION public.admin_set_user_email(UUID, TEXT) TO anon, authenticated, service_role, postgres;

-- 6. RPC Function admin_set_user_password
CREATE OR REPLACE FUNCTION public.admin_set_user_password(target_user_id UUID, new_password TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public, extensions
AS $$
BEGIN
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;
END;
$$;

ALTER FUNCTION public.admin_set_user_password(UUID, TEXT) OWNER TO supabase_admin;
GRANT EXECUTE ON FUNCTION public.admin_set_user_password(UUID, TEXT) TO anon, authenticated, service_role, postgres;
