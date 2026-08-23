-- Trazabilidad e idempotencia de los resúmenes semanales del negocio.
-- Migración aditiva: no modifica ni elimina registros existentes.

CREATE TABLE IF NOT EXISTS public.weekly_summary_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  summary_type TEXT NOT NULL DEFAULT 'weekly'
    CHECK (summary_type IN ('weekly', 'monthly')),
  week_start DATE NOT NULL,
  period_end DATE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  recipient TEXT NOT NULL,
  provider TEXT,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'sent', 'failed')),
  is_test BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  provider_message_id TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.weekly_summary_deliveries
  ADD COLUMN IF NOT EXISTS summary_type TEXT NOT NULL DEFAULT 'weekly';

ALTER TABLE public.weekly_summary_deliveries
  ADD COLUMN IF NOT EXISTS period_end DATE;

CREATE UNIQUE INDEX IF NOT EXISTS business_summary_delivery_once_per_channel
  ON public.weekly_summary_deliveries (tenant_id, summary_type, week_start, channel)
  WHERE is_test = FALSE;

CREATE INDEX IF NOT EXISTS idx_weekly_summary_deliveries_tenant_created
  ON public.weekly_summary_deliveries (tenant_id, created_at DESC);

ALTER TABLE public.weekly_summary_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weekly_summary_deliveries_tenant_read" ON public.weekly_summary_deliveries;
CREATE POLICY "weekly_summary_deliveries_tenant_read"
  ON public.weekly_summary_deliveries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.empleados e
      WHERE e.id = auth.uid()
        AND e.tenant_id = weekly_summary_deliveries.tenant_id
        AND e.activo = TRUE
    )
  );

GRANT SELECT ON public.weekly_summary_deliveries TO authenticated;
GRANT ALL ON public.weekly_summary_deliveries TO service_role;

COMMENT ON TABLE public.weekly_summary_deliveries IS
  'Registro de envíos del resumen semanal; evita duplicados por tenant, semana y canal.';
