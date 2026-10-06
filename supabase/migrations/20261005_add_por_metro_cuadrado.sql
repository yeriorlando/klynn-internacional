-- Migración: Añadir soporte para cobro por metro cuadrado (m2) en catalogo_items y servicios
ALTER TABLE public.catalogo_items 
  ADD COLUMN IF NOT EXISTS por_metro_cuadrado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS unidad_medida TEXT DEFAULT 'm2';

ALTER TABLE public.servicios 
  ADD COLUMN IF NOT EXISTS por_metro_cuadrado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS unidad_medida TEXT DEFAULT 'm2';
