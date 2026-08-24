-- Recibo durable para que un reintento nunca emita dos e-CF por la misma orden.
CREATE TABLE IF NOT EXISTS public.ecf_submission_idempotency (
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'unknown')),
  response JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_ecf_submission_idempotency_status
  ON public.ecf_submission_idempotency (tenant_id, status, updated_at);

ALTER TABLE public.ecf_submission_idempotency ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ecf_submission_idempotency_tenant_access" ON public.ecf_submission_idempotency;
CREATE POLICY "ecf_submission_idempotency_tenant_access"
  ON public.ecf_submission_idempotency
  FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.empleados WHERE id = auth.uid()));

NOTIFY pgrst, 'reload schema';
