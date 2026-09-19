-- Gastos profesionales: categorías por tenant, plantillas reutilizables y recurrencia.

CREATE TABLE IF NOT EXISTS public.gasto_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL CHECK (length(trim(nombre)) > 0),
  icono TEXT NOT NULL DEFAULT 'tag',
  color TEXT NOT NULL DEFAULT 'slate',
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER NOT NULL DEFAULT 0,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_gasto_categorias_tenant_nombre
  ON public.gasto_categorias (tenant_id, lower(trim(nombre)));
CREATE INDEX IF NOT EXISTS idx_gasto_categorias_tenant_activo
  ON public.gasto_categorias (tenant_id, activo, orden);

ALTER TABLE public.gasto_categorias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gasto_categorias_tenant_access" ON public.gasto_categorias;
DROP POLICY IF EXISTS "gasto_categorias_all" ON public.gasto_categorias;
CREATE POLICY "gasto_categorias_all" ON public.gasto_categorias
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.gasto_plantillas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL CHECK (length(trim(nombre)) > 0),
  descripcion TEXT,
  categoria_id UUID REFERENCES public.gasto_categorias(id) ON DELETE SET NULL,
  categoria_nombre TEXT NOT NULL,
  suplidor_id UUID REFERENCES public.suplidores(id) ON DELETE SET NULL,
  proveedor_nombre TEXT,
  metodo_pago TEXT NOT NULL DEFAULT 'Efectivo',
  monto_predeterminado NUMERIC(12,2) CHECK (monto_predeterminado IS NULL OR monto_predeterminado >= 0),
  es_recurrente BOOLEAN NOT NULL DEFAULT false,
  frecuencia TEXT CHECK (frecuencia IS NULL OR frecuencia IN ('SEMANAL', 'MENSUAL', 'TRIMESTRAL', 'ANUAL')),
  dia_vencimiento INTEGER CHECK (dia_vencimiento IS NULL OR dia_vencimiento BETWEEN 1 AND 31),
  proxima_fecha DATE,
  activo BOOLEAN NOT NULL DEFAULT true,
  usos INTEGER NOT NULL DEFAULT 0,
  ultimo_uso_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_gasto_plantillas_tenant_nombre
  ON public.gasto_plantillas (tenant_id, lower(trim(nombre)));
CREATE INDEX IF NOT EXISTS idx_gasto_plantillas_tenant_activo
  ON public.gasto_plantillas (tenant_id, activo, usos DESC);
CREATE INDEX IF NOT EXISTS idx_gasto_plantillas_proxima_fecha
  ON public.gasto_plantillas (tenant_id, proxima_fecha)
  WHERE activo = true AND es_recurrente = true;

ALTER TABLE public.gasto_plantillas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gasto_plantillas_tenant_access" ON public.gasto_plantillas;
DROP POLICY IF EXISTS "gasto_plantillas_all" ON public.gasto_plantillas;
CREATE POLICY "gasto_plantillas_all" ON public.gasto_plantillas
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.gastos
  ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES public.gasto_categorias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plantilla_id UUID REFERENCES public.gasto_plantillas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS suplidor_id UUID REFERENCES public.suplidores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origen TEXT NOT NULL DEFAULT 'OPERATIVO',
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'REGISTRADO';

CREATE INDEX IF NOT EXISTS idx_gastos_categoria_id ON public.gastos(tenant_id, categoria_id);
CREATE INDEX IF NOT EXISTS idx_gastos_plantilla_id ON public.gastos(tenant_id, plantilla_id);
CREATE INDEX IF NOT EXISTS idx_gastos_suplidor_id ON public.gastos(tenant_id, suplidor_id);

INSERT INTO public.gasto_categorias (tenant_id, nombre, icono, color, orden)
SELECT t.id, seed.nombre, seed.icono, seed.color, seed.orden
FROM public.tenants t
CROSS JOIN (
  VALUES
    ('Suministros', 'package', 'teal', 0),
    ('Servicios básicos', 'zap', 'amber', 1),
    ('Mantenimiento', 'wrench', 'blue', 2),
    ('Alquiler', 'building', 'rose', 3),
    ('Nómina y salarios', 'users', 'indigo', 4),
    ('Transporte', 'truck', 'orange', 5),
    ('Marketing', 'megaphone', 'purple', 6),
    ('Oficina', 'file-text', 'slate', 7),
    ('Otros', 'tag', 'slate', 8)
) AS seed(nombre, icono, color, orden)
ON CONFLICT DO NOTHING;

INSERT INTO public.gasto_categorias (tenant_id, nombre, icono, color, orden)
SELECT DISTINCT g.tenant_id, trim(g.categoria), 'tag', 'slate', 100
FROM public.gastos g
WHERE nullif(trim(g.categoria), '') IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE public.gastos g
SET categoria_id = c.id
FROM public.gasto_categorias c
WHERE g.categoria_id IS NULL
  AND c.tenant_id = g.tenant_id
  AND lower(trim(c.nombre)) = lower(trim(g.categoria));

UPDATE public.gastos
SET origen = CASE WHEN is_caja_chica THEN 'CAJA_CHICA' ELSE 'OPERATIVO' END
WHERE origen IS NULL OR origen = 'OPERATIVO';

NOTIFY pgrst, 'reload schema';
