-- ==============================================================================
-- MIGRACIÓN: AGREGAR COLUMNA DE MÓDULO 'PROMOCIONES' A LA TABLA PLANES
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'planes' 
      AND column_name = 'promociones'
  ) THEN
    ALTER TABLE public.planes ADD COLUMN promociones BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Actualizar planes estándar: Pro y Enterprise incluyen promociones, Básico no
UPDATE public.planes SET promociones = true WHERE id IN ('pro', 'enterprise');
UPDATE public.planes SET promociones = false WHERE id = 'basico';

-- Recargar la caché del esquema de PostgREST
NOTIFY pgrst, 'reload schema';
