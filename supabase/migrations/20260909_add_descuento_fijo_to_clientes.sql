-- Migración para añadir descuento fijo por cliente (%)
ALTER TABLE IF EXISTS public.clientes
ADD COLUMN IF NOT EXISTS descuento_fijo NUMERIC DEFAULT 0;
