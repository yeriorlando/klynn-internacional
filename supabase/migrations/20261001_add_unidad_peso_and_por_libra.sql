-- Migration: Soporte de unidad de peso (lb / kg) para servicios y prendas de catálogo
-- Ejecutar en Supabase SQL Editor para soporte nativo en base de datos

ALTER TABLE IF EXISTS public.servicios 
ADD COLUMN IF NOT EXISTS unidad_peso TEXT DEFAULT 'lb';

ALTER TABLE IF EXISTS public.catalogo_items 
ADD COLUMN IF NOT EXISTS por_libra BOOLEAN DEFAULT false;

ALTER TABLE IF EXISTS public.catalogo_items 
ADD COLUMN IF NOT EXISTS unidad_peso TEXT DEFAULT 'lb';
