-- ====================================================================
-- MIGRACIÓN SEGURA: Credenciales de Pronesoft Autogestionadas
-- Ejecutar en Supabase SQL Editor
-- ====================================================================

-- Agregar columnas a ecf_config
ALTER TABLE public.ecf_config ADD COLUMN IF NOT EXISTS usar_credenciales_propias BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.ecf_config ADD COLUMN IF NOT EXISTS pronesoft_client_id TEXT;
ALTER TABLE public.ecf_config ADD COLUMN IF NOT EXISTS pronesoft_client_secret TEXT;

-- Recargar esquema de PostgREST
NOTIFY pgrst, 'reload schema';
