-- Migration to make t_access_text and get_my_tenants RLS functions robust
-- This applies email-based session fallback and enables global admin catalog items.

CREATE OR REPLACE FUNCTION public.t_access_text(t_id text)
RETURNS boolean AS $$
DECLARE
  v_email text;
BEGIN
  -- Permitir acceso al catálogo global 'admin'
  IF t_id = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Obtener el email del usuario autenticado
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  
  RETURN EXISTS (
    SELECT 1 FROM public.empleados 
    WHERE (id = auth.uid() OR email = v_email) 
      AND tenant_id::text = t_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_tenants()
RETURNS TABLE (t_id text) AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  RETURN QUERY
  SELECT DISTINCT tenant_id::text
  FROM public.empleados
  WHERE id::text = auth.uid()::text 
     OR email = v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recargar caché del esquema de PostgREST
NOTIFY pgrst, 'reload schema';
