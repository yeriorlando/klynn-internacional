-- Migration: Soporte para marcar prendas como calzado (es_calzado)
-- Ejecutar en el SQL Editor de Supabase

ALTER TABLE IF EXISTS public.catalogo_items 
ADD COLUMN IF NOT EXISTS es_calzado BOOLEAN DEFAULT false;

-- Índice opcional para optimizar consultas y filtros por calzado dentro de cada lavandería
CREATE INDEX IF NOT EXISTS idx_catalogo_items_es_calzado 
ON public.catalogo_items (tenant_id, es_calzado);
