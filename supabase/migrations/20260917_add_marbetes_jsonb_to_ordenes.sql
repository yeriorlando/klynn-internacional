-- Migration: Soporte multi-marbete JSONB en la tabla ordenes
-- Permite guardar el arreglo completo de marbetes asociados a cada orden
ALTER TABLE IF EXISTS public.ordenes 
ADD COLUMN IF NOT EXISTS marbetes JSONB DEFAULT '[]'::jsonb;

-- Comentario descriptivo de la columna
COMMENT ON COLUMN public.ordenes.marbetes IS 'Listado detallado de marbetes Hidrofix asignados a las prendas de la orden (color, piezas, secuencia)';

-- Recargar caché del esquema en PostgREST
NOTIFY pgrst, 'reload schema';
