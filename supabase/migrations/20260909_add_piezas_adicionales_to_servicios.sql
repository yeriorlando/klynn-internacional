-- Migración para soportar paquetes de servicios con piezas adicionales / excedente
ALTER TABLE IF EXISTS public.servicios
ADD COLUMN IF NOT EXISTS permite_piezas_adicionales BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS piezas_incluidas INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS precio_pieza_adicional NUMERIC DEFAULT 0;
