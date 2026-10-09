-- ==============================================================================
-- TABLA: articulos_inventario (Módulo de Inventario y Venta Comercial)
-- ==============================================================================

-- 1. Eliminar si quedó creada a medias o con tipos incompatibles
DROP TABLE IF EXISTS public.articulos_inventario CASCADE;

-- 2. Crear tabla con tenant_id tipo UUID referenciando tenants(id)
CREATE TABLE IF NOT EXISTS public.articulos_inventario (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  categoria TEXT DEFAULT 'General',
  icono TEXT DEFAULT 'tag',
  costo NUMERIC(12, 2) DEFAULT 0,
  precio NUMERIC(12, 2) NOT NULL DEFAULT 0,
  stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
  stock_minimo NUMERIC(12, 2) DEFAULT 0,
  codigo_barra TEXT,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices para optimizar búsquedas por tenant y disponibilidad
CREATE INDEX IF NOT EXISTS idx_articulos_inventario_tenant ON public.articulos_inventario(tenant_id);
CREATE INDEX IF NOT EXISTS idx_articulos_inventario_activo ON public.articulos_inventario(tenant_id, activo);

-- 4. Habilitar Seguridad a Nivel de Fila (RLS)
ALTER TABLE public.articulos_inventario ENABLE ROW LEVEL SECURITY;

-- 5. Otorgar permisos a roles de Supabase (evita 403 Forbidden)
GRANT ALL ON public.articulos_inventario TO anon, authenticated, service_role;

-- 6. Política de acceso permisiva
DROP POLICY IF EXISTS "articulos_inventario_tenant_access" ON public.articulos_inventario;
CREATE POLICY "articulos_inventario_tenant_access" ON public.articulos_inventario
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 7. Recargar caché de esquema de PostgREST
NOTIFY pgrst, 'reload schema';
