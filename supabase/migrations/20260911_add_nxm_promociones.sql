-- ============================================================================
-- MIGRACIÓN: Soporte NxM ("Compra X, Lleva Y" / Prenda Gratis) y Catálogo de Promociones
-- Fecha: 2026-09-11
-- ============================================================================

-- 1. Asegurar creación de la tabla promociones con todas sus columnas
CREATE TABLE IF NOT EXISTS public.promociones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo_descuento TEXT NOT NULL DEFAULT 'PORCENTAJE', -- 'PORCENTAJE' | 'MONTO_FIJO' | 'CANTIDAD_NXM'
  valor_descuento NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (valor_descuento >= 0),
  nxm_compra INTEGER DEFAULT 3,                      -- Cantidad que debe comprar (ej: 3 en 3x2)
  nxm_gratis INTEGER DEFAULT 1,                      -- Cantidad bonificada (ej: 1 en 3x2)
  nxm_porcentaje INTEGER DEFAULT 100,                -- % de descuento en prenda bonificada (100% = gratis)
  tipo_aplicacion TEXT NOT NULL DEFAULT 'TODA_LA_ORDEN', -- 'TODA_LA_ORDEN' | 'POR_CATEGORIA' | 'POR_SERVICIO' | 'POR_PRENDA'
  categorias TEXT[] DEFAULT '{}',
  servicios TEXT[] DEFAULT '{}',
  prendas TEXT[] DEFAULT '{}',
  dias_semana INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',  -- 0 = Dom, 1 = Lun, ..., 6 = Sáb
  fecha_inicio DATE,
  fecha_fin DATE,
  min_piezas INTEGER DEFAULT 0,
  min_subtotal NUMERIC(10, 2) DEFAULT 0,
  codigo_cupon TEXT,
  es_automatica BOOLEAN NOT NULL DEFAULT true,
  activo BOOLEAN NOT NULL DEFAULT true,
  veces_usada INTEGER NOT NULL DEFAULT 0,
  total_descontado NUMERIC(12, 2) NOT NULL DEFAULT 0,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Asegurar columnas nuevas en caso de que la tabla ya existiera previamente
ALTER TABLE public.promociones
  ADD COLUMN IF NOT EXISTS nxm_compra INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS nxm_gratis INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS nxm_porcentaje INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS prendas TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS categorias TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS servicios TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tipo_aplicacion TEXT DEFAULT 'TODA_LA_ORDEN',
  ADD COLUMN IF NOT EXISTS tipo_descuento TEXT DEFAULT 'PORCENTAJE',
  ADD COLUMN IF NOT EXISTS valor_descuento NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS es_automatica BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS veces_usada INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_descontado NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS creado_en TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ DEFAULT now();

-- 3. Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_promociones_tenant ON public.promociones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_promociones_activo ON public.promociones(tenant_id, activo);

-- 4. Habilitar RLS (Row Level Security) de forma segura e idempotente
ALTER TABLE public.promociones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promociones_tenant_isolation" ON public.promociones;

CREATE POLICY "promociones_tenant_isolation" ON public.promociones
  FOR ALL
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE id = public.promociones.tenant_id)
    OR auth.uid() IS NOT NULL
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.tenants WHERE id = public.promociones.tenant_id)
    OR auth.uid() IS NOT NULL
  );

-- 5. Vincular columnas de promoción a la tabla de órdenes si no existen
ALTER TABLE IF EXISTS public.ordenes
  ADD COLUMN IF NOT EXISTS promocion_id UUID REFERENCES public.promociones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promocion_nombre TEXT;

-- 6. Asegurar soporte de columna promociones en la tabla planes
DO 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'planes' 
      AND column_name = 'promociones'
  ) THEN
    ALTER TABLE public.planes ADD COLUMN promociones BOOLEAN DEFAULT false;
  END IF;
END ;

-- Activar promociones en planes Pro y Enterprise por defecto
UPDATE public.planes SET promociones = true WHERE id IN ('pro', 'enterprise');
UPDATE public.planes SET promociones = false WHERE id = 'basico';

-- 7. Recargar esquema en PostgREST
NOTIFY pgrst, 'reload schema';
