-- Migration to add por_libra support to servicios table
ALTER TABLE IF EXISTS public.servicios 
ADD COLUMN IF NOT EXISTS por_libra BOOLEAN DEFAULT false;
