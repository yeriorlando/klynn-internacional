-- Migration to add support for custom price editing at checkout
ALTER TABLE IF EXISTS public.servicios 
ADD COLUMN IF NOT EXISTS permitir_editar_precio BOOLEAN DEFAULT false;

ALTER TABLE IF EXISTS public.catalogo_items 
ADD COLUMN IF NOT EXISTS permitir_editar_precio BOOLEAN DEFAULT false;
