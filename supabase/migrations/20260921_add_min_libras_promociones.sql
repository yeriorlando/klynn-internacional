-- ============================================================================
-- MIGRACIÓN: Soporte de Mínimo de Libras para Promociones en Klynn
-- Fecha: 2026-09-21
-- ============================================================================

-- 1. Añadir columna min_libras a la tabla promociones
ALTER TABLE public.promociones
  ADD COLUMN IF NOT EXISTS min_libras NUMERIC(10, 2) DEFAULT 0;

-- 2. Comentario explicativo
COMMENT ON COLUMN public.promociones.min_libras IS 'Cantidad mínima de libras requeridas en la orden o servicios seleccionados para aplicar la promoción';
