-- ============================================================================
-- MIGRACIÓN: Módulo de Promociones y Descuentos para Klynn
-- Fecha: 2026-09-09
-- ============================================================================

-- 1. Tabla de Promociones
CREATE TABLE IF NOT EXISTS public.promociones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo_descuento TEXT NOT NULL DEFAULT 'PORCENTAJE', -- 'PORCENTAJE' | 'MONTO_FIJO' | 'CANTIDAD_NXM'
  valor_descuento NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (valor_descuento >= 0),
  nxm_compra INTEGER DEFAULT 3,                      -- Cantidad que compra (ej: 3 en 3x2)
  nxm_gratis INTEGER DEFAULT 1,                      -- Cantidad bonificada (ej: 1 en 3x2)
  nxm_porcentaje INTEGER DEFAULT 100,                -- % de descuento en prenda bonificada (100% = gratis)
  tipo_aplicacion TEXT NOT NULL DEFAULT 'TODA_LA_ORDEN', -- 'TODA_LA_ORDEN' | 'POR_CATEGORIA' | 'POR_SERVICIO' | 'POR_PRENDA'
  categorias TEXT[] DEFAULT '{}', -- Categorías del catálogo a las que aplica
  servicios TEXT[] DEFAULT '{}', -- Servicios a los que aplica
  prendas TEXT[] DEFAULT '{}', -- Prendas específicas
  dias_semana INTEGER[] DEFAULT '{0,1,2,3,4,5,6}', -- 0 = Dom, 1 = Lun, 2 = Mar, 3 = Mié, 4 = Jue, 5 = Vie, 6 = Sáb
  fecha_inicio DATE,
  fecha_fin DATE,
  min_piezas INTEGER DEFAULT 0,
  min_subtotal NUMERIC(10, 2) DEFAULT 0,
  codigo_cupon TEXT, -- Opcional: si requiere código manual
  es_automatica BOOLEAN NOT NULL DEFAULT true, -- Si aplica automáticamente al cumplir condiciones
  activo BOOLEAN NOT NULL DEFAULT true,
  veces_usada INTEGER NOT NULL DEFAULT 0,
  total_descontado NUMERIC(12, 2) NOT NULL DEFAULT 0,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_promociones_tenant ON public.promociones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_promociones_activo ON public.promociones(tenant_id, activo);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE public.promociones ENABLE ROW LEVEL SECURITY;

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

-- 4. Ampliar tabla de órdenes para asociar la promoción aplicada
ALTER TABLE IF EXISTS public.ordenes
ADD COLUMN IF NOT EXISTS promocion_id UUID REFERENCES public.promociones(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS promocion_nombre TEXT;
