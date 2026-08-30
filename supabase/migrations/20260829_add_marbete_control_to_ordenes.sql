-- Migration: Módulo de Control de Marbetes Hidrofix para Trazabilidad en Klynn
-- Agrega soporte para Color, Cantidad de Piezas (1-9) y Número de Secuencia a la tabla ordenes

-- 1. Agregar columnas a la tabla de órdenes
ALTER TABLE IF EXISTS public.ordenes 
ADD COLUMN IF NOT EXISTS marbete_color TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS marbete_piezas INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS marbete_secuencia INTEGER DEFAULT NULL;

-- 2. Crear índices para búsquedas ultra rápidas de prendas perdidas y control
CREATE INDEX IF NOT EXISTS idx_ordenes_marbete_secuencia 
ON public.ordenes (tenant_id, marbete_secuencia) 
WHERE marbete_secuencia IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ordenes_marbete_color 
ON public.ordenes (tenant_id, marbete_color) 
WHERE marbete_color IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ordenes_marbete_compuesto 
ON public.ordenes (tenant_id, marbete_color, marbete_piezas, marbete_secuencia) 
WHERE marbete_secuencia IS NOT NULL;

-- Comentario descriptivo en las columnas para documentación
COMMENT ON COLUMN public.ordenes.marbete_color IS 'Color del talonario de marbetes Hidrofix (Gris, Naranja, Verde, Azul, etc.)';
COMMENT ON COLUMN public.ordenes.marbete_piezas IS 'Dígito del 1 al 9 que representa la cantidad de piezas/etiquetas del marbete';
COMMENT ON COLUMN public.ordenes.marbete_secuencia IS 'Número de secuencia o folio correlativo del marbete';
