-- Migración para agregar la columna auto_renovacion a la tabla tenants
-- Descripción: Permite activar o desactivar la renovación automática recurrente de suscripción por lavandería.

ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS auto_renovacion BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.tenants.auto_renovacion IS 
  'Indica si el tenant renueva su suscripción automáticamente de forma mensual.';

-- Asegurar que los tenants activos existentes tengan auto_renovacion = true por defecto
UPDATE public.tenants 
SET auto_renovacion = true 
WHERE auto_renovacion IS NULL AND estado = 'ACTIVO';
