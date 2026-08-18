-- MIGRACIÓN: AGREGAR NOMBRE DE SUCURSAL EN LA TABLA TENANTS
-- Permite diferenciar la sucursal principal de nuevas sucursales (ej. Bella Vista, Ensanche Naco)

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'tenants' 
      AND column_name = 'nombre_sucursal'
  ) THEN
    ALTER TABLE public.tenants ADD COLUMN nombre_sucursal TEXT DEFAULT 'Sucursal principal';
    COMMENT ON COLUMN public.tenants.nombre_sucursal IS 'Nombre específico de la sucursal (ej: Sucursal principal, Bella Vista, Ensanche Naco)';
  END IF;
END $$;

-- Actualizar registros existentes que no tengan nombre_sucursal
UPDATE public.tenants 
SET nombre_sucursal = COALESCE(config->>'nombre_sucursal', 'Sucursal principal')
WHERE nombre_sucursal IS NULL OR nombre_sucursal = '';
