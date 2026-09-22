-- ============================================================================
-- KLYNN: ficha histórica de clientes y segmentación por sector
-- Fecha: 2026-09-22
--
-- Las órdenes continúan siendo la fuente de verdad del historial. Esta migración
-- crea un catálogo de sectores, enlaza clientes e incorpora índices para que la
-- consulta del historial por cliente sea rápida y segura en un entorno multi-tenant.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.normalizar_nombre_sector(value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT NULLIF(
    translate(
      lower(regexp_replace(btrim(COALESCE(value, '')), '\s+', ' ', 'g')),
      'áéíóúüñàèìòùäëïöüç',
      'aeiouunaeiouaeiouc'
    ),
    ''
  );
$$;

CREATE TABLE IF NOT EXISTS public.sectores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  nombre TEXT NOT NULL CHECK (btrim(nombre) <> ''),
  nombre_normalizado TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sectores_tenant_nombre_unique UNIQUE (tenant_id, nombre_normalizado)
);

COMMENT ON TABLE public.sectores IS
  'Catálogo de sectores registrados por cada lavandería para segmentar clientes sin duplicados por mayúsculas o acentos.';

CREATE INDEX IF NOT EXISTS idx_sectores_tenant_activo_nombre
  ON public.sectores (tenant_id, activo, nombre_normalizado);

ALTER TABLE public.sectores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sectores visibles por tenant" ON public.sectores;
CREATE POLICY "Sectores visibles por tenant"
  ON public.sectores
  FOR SELECT
  USING (tenant_id IN (SELECT t_id::TEXT FROM public.get_my_tenants()));

DROP POLICY IF EXISTS "Sectores gestionables por tenant" ON public.sectores;
CREATE POLICY "Sectores gestionables por tenant"
  ON public.sectores
  FOR ALL
  USING (tenant_id IN (SELECT t_id::TEXT FROM public.get_my_tenants()))
  WITH CHECK (tenant_id IN (SELECT t_id::TEXT FROM public.get_my_tenants()));

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS sector_id UUID REFERENCES public.sectores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clientes_tenant_sector
  ON public.clientes (tenant_id, sector_id);

-- Índice principal para abrir la ficha de un cliente sin recorrer todas las órdenes.
CREATE INDEX IF NOT EXISTS idx_ordenes_tenant_cliente_fecha
  ON public.ordenes (tenant_id, cliente_id, creado_en DESC);

-- Campo aditivo para que las órdenes nuevas puedan conservar IDs y nombres
-- históricos de servicios aunque el catálogo se renombre en el futuro.
ALTER TABLE public.ordenes
  ADD COLUMN IF NOT EXISTS servicios_detalle JSONB NOT NULL DEFAULT '[]'::JSONB;

COMMENT ON COLUMN public.ordenes.servicios_detalle IS
  'Snapshot opcional de servicios: [{id, nombre, precio}]. Las órdenes antiguas continúan usando servicios y servicios_precios.';

CREATE OR REPLACE FUNCTION public.sincronizar_sector_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_name TEXT;
  clean_name TEXT;
  resolved_sector_id UUID;
BEGIN
  clean_name := regexp_replace(btrim(COALESCE(NEW.sector, '')), '\s+', ' ', 'g');
  normalized_name := public.normalizar_nombre_sector(clean_name);

  IF normalized_name IS NULL THEN
    NEW.sector := NULL;
    NEW.sector_id := NULL;
    RETURN NEW;
  END IF;

  INSERT INTO public.sectores (tenant_id, nombre, nombre_normalizado)
  VALUES (NEW.tenant_id::TEXT, clean_name, normalized_name)
  ON CONFLICT (tenant_id, nombre_normalizado)
  DO UPDATE SET
    activo = true,
    actualizado_en = now()
  RETURNING id INTO resolved_sector_id;

  NEW.sector := clean_name;
  NEW.sector_id := resolved_sector_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sincronizar_sector_cliente ON public.clientes;
CREATE TRIGGER trg_sincronizar_sector_cliente
  BEFORE INSERT OR UPDATE OF sector, tenant_id
  ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.sincronizar_sector_cliente();

-- Backfill seguro de sectores ya registrados.
INSERT INTO public.sectores (tenant_id, nombre, nombre_normalizado)
SELECT
  c.tenant_id::TEXT,
  min(regexp_replace(btrim(c.sector), '\s+', ' ', 'g')) AS nombre,
  public.normalizar_nombre_sector(c.sector) AS nombre_normalizado
FROM public.clientes c
WHERE public.normalizar_nombre_sector(c.sector) IS NOT NULL
GROUP BY c.tenant_id::TEXT, public.normalizar_nombre_sector(c.sector)
ON CONFLICT (tenant_id, nombre_normalizado) DO NOTHING;

UPDATE public.clientes c
SET sector_id = s.id,
    sector = regexp_replace(btrim(c.sector), '\s+', ' ', 'g')
FROM public.sectores s
WHERE s.tenant_id = c.tenant_id::TEXT
  AND s.nombre_normalizado = public.normalizar_nombre_sector(c.sector)
  AND c.sector_id IS DISTINCT FROM s.id;

-- RPC opcional para dashboards o exportaciones. Respeta RLS porque valida tenant.
CREATE OR REPLACE FUNCTION public.get_clientes_por_sector(p_tenant_id TEXT)
RETURNS TABLE (
  sector_id UUID,
  sector TEXT,
  cantidad_clientes BIGINT,
  total_facturado NUMERIC,
  total_saldo NUMERIC,
  total_libras NUMERIC,
  total_prendas NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.nombre,
    count(DISTINCT c.id),
    COALESCE(sum(o.total) FILTER (WHERE o.estado <> 'ANULADA'), 0)::NUMERIC,
    COALESCE(sum(o.saldo) FILTER (WHERE o.estado <> 'ANULADA'), 0)::NUMERIC,
    COALESCE(sum(
      CASE WHEN o.estado <> 'ANULADA' THEN (
        SELECT COALESCE(sum((item->>'cantidad')::NUMERIC), 0)
        FROM jsonb_array_elements(COALESCE(o.items, '[]'::JSONB)) item
        WHERE COALESCE((item->>'es_libra')::BOOLEAN, false)
      ) ELSE 0 END
    ), 0)::NUMERIC,
    COALESCE(sum(
      CASE WHEN o.estado <> 'ANULADA' THEN (
        SELECT COALESCE(sum((item->>'cantidad')::NUMERIC), 0)
        FROM jsonb_array_elements(COALESCE(o.items, '[]'::JSONB)) item
        WHERE NOT COALESCE((item->>'es_libra')::BOOLEAN, false)
          AND lower(COALESCE(item->>'descripcion', '')) NOT LIKE 'servicio:%'
      ) ELSE 0 END
    ), 0)::NUMERIC
  FROM public.sectores s
  JOIN public.clientes c ON c.sector_id = s.id
  LEFT JOIN public.ordenes o ON o.cliente_id = c.id AND o.tenant_id::TEXT = p_tenant_id
  WHERE s.tenant_id = p_tenant_id
    AND p_tenant_id IN (SELECT t_id::TEXT FROM public.get_my_tenants())
  GROUP BY s.id, s.nombre
  ORDER BY count(DISTINCT c.id) DESC, s.nombre ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_clientes_por_sector(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
