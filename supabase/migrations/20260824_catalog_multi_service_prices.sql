-- Migración para soportar matriz de precios por servicio y descripción en catálogo de prendas
ALTER TABLE IF EXISTS public.catalogo_items 
ADD COLUMN IF NOT EXISTS descripcion TEXT,
ADD COLUMN IF NOT EXISTS precios_servicios JSONB DEFAULT '{}'::jsonb;
