-- ====================================================================
-- MIGRACIÓN: Arreglar longitud del RNC para soportar RNCs de Sandbox (Ej. SBX133190907)
-- ====================================================================

ALTER TABLE public.ecf_config ALTER COLUMN rnc_emisor TYPE TEXT;
ALTER TABLE public.tenants ALTER COLUMN rnc TYPE TEXT;
