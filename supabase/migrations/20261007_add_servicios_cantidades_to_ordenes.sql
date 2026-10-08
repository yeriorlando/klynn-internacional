-- Migración para añadir soporte de cantidades de servicios directos en las órdenes
ALTER TABLE IF EXISTS public.ordenes 
ADD COLUMN IF NOT EXISTS servicios_cantidades JSONB DEFAULT '{}'::jsonb;
