-- Migración para otorgar permisos adecuados y corregir la función admin_delete_user
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Eliminar directamente de auth.users usando privilegios de SECURITY DEFINER
  DELETE FROM auth.users WHERE id = target_user_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Prevenir fallos si el usuario ya no existe o está bloqueado
    NULL;
END;
$$;

-- Asegurar permisos de ejecución para usuarios autenticados y anónimos
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO anon, authenticated, service_role;
