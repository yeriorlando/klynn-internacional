-- Seguridad y trazabilidad de la integración Pronesoft e-CF.
-- No elimina datos existentes: permite desplegar sin interrumpir la operación.

ALTER TABLE public.ecf_sequences
  ADD COLUMN IF NOT EXISTS pronesoft_sequence_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS ecf_sequences_pronesoft_sequence_id_key
  ON public.ecf_sequences (tenant_id, pronesoft_sequence_id)
  WHERE pronesoft_sequence_id IS NOT NULL;

ALTER TABLE public.ecf_config
  ADD COLUMN IF NOT EXISTS certificate_uploaded_at TIMESTAMPTZ;

-- Los metadatos del documento ya se guardan en dgii_response. Este índice hace
-- que los webhooks/polling encuentren cada documento sin escanear el tenant.
CREATE INDEX IF NOT EXISTS idx_ecf_documents_track_id
  ON public.ecf_documents (track_id)
  WHERE track_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ecf_documents_tenant_encf_key
  ON public.ecf_documents (tenant_id, encf);
