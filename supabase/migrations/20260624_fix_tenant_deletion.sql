-- 1. Crear la función admin_delete_user (SECURITY DEFINER)
-- Esta función permite borrar usuarios de auth.users de manera segura y controlada.
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS void AS $$
DECLARE
  caller_email TEXT;
  caller_id UUID;
  caller_rol TEXT;
  caller_tenant_id TEXT;
  target_tenant_id TEXT;
BEGIN
  -- Obtener detalles del llamador desde el contexto JWT/Auth de Supabase
  caller_id := auth.uid();
  caller_email := auth.jwt() ->> 'email';
  
  -- 1. Si es el SUPERADMIN principal de la plataforma, permitir eliminar
  IF caller_email = 'admin@klynn.com.do' THEN
    DELETE FROM auth.users WHERE id = target_user_id;
    RETURN;
  END IF;

  -- 2. Si el usuario se está eliminando a sí mismo, permitir eliminar
  IF caller_id = target_user_id THEN
    DELETE FROM auth.users WHERE id = target_user_id;
    RETURN;
  END IF;

  -- 3. Si es el ADMIN de la misma sucursal/tenant, permitir eliminar
  SELECT tenant_id::text, rol 
  INTO caller_tenant_id, caller_rol
  FROM public.empleados 
  WHERE id = caller_id;

  SELECT tenant_id::text 
  INTO target_tenant_id
  FROM public.empleados 
  WHERE id = target_user_id;

  IF caller_rol = 'ADMIN' AND caller_tenant_id = target_tenant_id THEN
    DELETE FROM auth.users WHERE id = target_user_id;
    RETURN;
  ELSE
    RAISE EXCEPTION 'No autorizado para eliminar este usuario de la base de datos de autenticación.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Actualizar la FK en la tabla public.gastos a ON DELETE CASCADE
-- Esto previene que se bloquee el borrado de un empleado si tiene gastos asociados.
ALTER TABLE public.gastos DROP CONSTRAINT IF EXISTS gastos_empleado_id_fkey;

ALTER TABLE public.gastos 
  ADD CONSTRAINT gastos_empleado_id_fkey 
  FOREIGN KEY (empleado_id, tenant_id) 
  REFERENCES public.empleados(id, tenant_id) 
  ON DELETE CASCADE;

-- 3. Optimizar el trigger on_empleado_deleted_cleanup_tenant
-- Solo se eliminará la lavandería (tenant) si el empleado eliminado coincide con el correo de administración del tenant.
CREATE OR REPLACE FUNCTION public.on_empleado_deleted_cleanup_tenant()
RETURNS TRIGGER AS $$
BEGIN
  -- Borramos el tenant asociado SOLO si el email del empleado coincide con el email del tenant (propietario)
  DELETE FROM public.tenants 
  WHERE id::text = OLD.tenant_id::text 
    AND email = OLD.email;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
