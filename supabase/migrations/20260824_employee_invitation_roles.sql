-- Aplica roles y permisos a invitaciones ya existentes sin eliminar datos.

ALTER TABLE public.employee_invitations
  ADD COLUMN IF NOT EXISTS rol TEXT NOT NULL DEFAULT 'VENDEDOR';

ALTER TABLE public.employee_invitations
  ADD COLUMN IF NOT EXISTS permisos TEXT[] NOT NULL DEFAULT ARRAY[
    'dashboard', 'nueva-orden', 'ordenes', 'procesos', 'caja', 'clientes'
  ]::TEXT[];

CREATE OR REPLACE FUNCTION public.accept_employee_invitation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  invitation_id UUID;
  invitation_record public.employee_invitations%ROWTYPE;
  employee_name TEXT;
BEGIN
  IF NEW.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    invitation_id := NULLIF(NEW.raw_user_meta_data->>'employee_invitation_id', '')::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    invitation_id := NULL;
  END;

  IF invitation_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO invitation_record
  FROM public.employee_invitations
  WHERE id = invitation_id
    AND status = 'pending'
    AND lower(email) = lower(NEW.email)
  FOR UPDATE;

  IF NOT FOUND OR invitation_record.expires_at <= now() THEN
    RETURN NEW;
  END IF;

  employee_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'nombre'), ''),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.empleados (
    id, tenant_id, nombre, email, password, rol, activo, permisos,
    max_descuento_porcentaje, creado_en
  )
  VALUES (
    NEW.id,
    invitation_record.tenant_id,
    employee_name,
    lower(NEW.email),
    '***',
    COALESCE(invitation_record.rol, 'VENDEDOR'),
    true,
    COALESCE(
      invitation_record.permisos,
      ARRAY['dashboard', 'nueva-orden', 'ordenes', 'procesos', 'caja', 'clientes']::TEXT[]
    ),
    CASE WHEN COALESCE(invitation_record.rol, 'VENDEDOR') = 'ADMIN' THEN 100 ELSE 10 END,
    now()
  )
  ON CONFLICT (id, tenant_id) DO NOTHING;

  UPDATE public.employee_invitations
  SET status = 'accepted', auth_user_id = NEW.id, accepted_at = now(), updated_at = now()
  WHERE id = invitation_record.id;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Admins can delete expired employee invitations" ON public.employee_invitations;
CREATE POLICY "Admins can delete expired employee invitations"
ON public.employee_invitations
FOR DELETE
TO authenticated
USING (
  status = 'pending'
  AND expires_at <= now()
  AND EXISTS (
    SELECT 1
    FROM public.empleados e
    WHERE e.id = auth.uid()
      AND e.tenant_id = employee_invitations.tenant_id
      AND e.activo = true
      AND (e.rol IN ('ADMIN', 'SUPERVISOR') OR e.permisos @> ARRAY['personal']::TEXT[])
  )
);
