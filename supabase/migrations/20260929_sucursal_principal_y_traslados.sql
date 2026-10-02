-- Migration: Soporte para ⭐ Sucursal Principal, Red de Sucursales y Traslado de Órdenes
-- Fecha: 2026-09-29

-- 1. Agregar columnas de traslados/logística a la tabla 'ordenes'
ALTER TABLE IF EXISTS public.ordenes
ADD COLUMN IF NOT EXISTS sucursal_origen_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sucursal_origen_nombre TEXT,
ADD COLUMN IF NOT EXISTS sucursal_origen_telefono TEXT,
ADD COLUMN IF NOT EXISTS sucursal_origen_direccion TEXT,
ADD COLUMN IF NOT EXISTS sucursal_origen_rnc TEXT,
ADD COLUMN IF NOT EXISTS sucursal_origen_logo TEXT,
ADD COLUMN IF NOT EXISTS sucursal_destino_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sucursal_destino_nombre TEXT,
ADD COLUMN IF NOT EXISTS sucursal_destino_telefono TEXT,
ADD COLUMN IF NOT EXISTS sucursal_destino_direccion TEXT,
ADD COLUMN IF NOT EXISTS sucursal_destino_rnc TEXT,
ADD COLUMN IF NOT EXISTS sucursal_destino_logo TEXT,
ADD COLUMN IF NOT EXISTS traslado_motivo TEXT,
ADD COLUMN IF NOT EXISTS traslado_fecha TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS traslado_por_empleado TEXT,
ADD COLUMN IF NOT EXISTS traslado_historial JSONB DEFAULT '[]'::jsonb;

-- 2. Agregar índices para optimizar la consulta rápida inter-sucursales
CREATE INDEX IF NOT EXISTS idx_ordenes_sucursal_destino ON public.ordenes(sucursal_destino_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_sucursal_origen ON public.ordenes(sucursal_origen_id);

-- 3. Soporte en tabla 'tenants' para sucursal principal y enlace matriz
ALTER TABLE IF EXISTS public.tenants
ADD COLUMN IF NOT EXISTS parent_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS es_principal BOOLEAN DEFAULT FALSE;

-- 4. Notificar a PostgREST para recargar el schema cache inmediatamente
NOTIFY pgrst, 'reload schema';
