-- Migration to add custom service prices persistence to orders
ALTER TABLE IF EXISTS public.ordenes 
ADD COLUMN IF NOT EXISTS servicios_precios JSONB DEFAULT '{}'::jsonb;
