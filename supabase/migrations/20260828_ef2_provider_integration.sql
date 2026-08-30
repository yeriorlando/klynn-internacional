-- Integración EF2 no destructiva.
--
-- Solo agrega metadatos propios de EF2. No elimina, renombra ni modifica
-- columnas, tablas, triggers, secretos o Edge Functions de Pronesoft.

ALTER TABLE public.ecf_config
  ADD COLUMN IF NOT EXISTS proveedor_ecf TEXT,
  ADD COLUMN IF NOT EXISTS ef2_username TEXT,
  ADD COLUMN IF NOT EXISTS ef2_environment TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ecf_config_proveedor_ecf_check'
  ) THEN
    ALTER TABLE public.ecf_config
      ADD CONSTRAINT ecf_config_proveedor_ecf_check
      CHECK (proveedor_ecf IS NULL OR proveedor_ecf IN ('ef2', 'pronesoft'))
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ecf_config_ef2_environment_check'
  ) THEN
    ALTER TABLE public.ecf_config
      ADD CONSTRAINT ecf_config_ef2_environment_check
      CHECK (ef2_environment IS NULL OR ef2_environment IN ('TesteCF', 'CerteCF', 'eCF'))
      NOT VALID;
  END IF;
END $$;

ALTER TABLE public.ecf_sequences
  ADD COLUMN IF NOT EXISTS ef2_sequence_id BIGINT,
  ADD COLUMN IF NOT EXISTS ef2_synced_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS ecf_sequences_ef2_sequence_id_key
  ON public.ecf_sequences (tenant_id, ef2_sequence_id)
  WHERE ef2_sequence_id IS NOT NULL;

ALTER TABLE public.ecf_documents
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS provider_document_id TEXT;

CREATE INDEX IF NOT EXISTS idx_ecf_documents_provider_document
  ON public.ecf_documents (tenant_id, provider, provider_document_id)
  WHERE provider_document_id IS NOT NULL;

COMMENT ON COLUMN public.ecf_config.ef2_username IS
  'Usuario API EF2 utilizado para verificar la credencial y resolver la empresa.';
COMMENT ON COLUMN public.ecf_sequences.ef2_sequence_id IS
  'ID del rango autoritativo en ecf_secuencia_api.php; no sustituye pronesoft_sequence_id.';

-- Almacén separado: el navegador nunca puede leer el token una vez guardado.
CREATE TABLE IF NOT EXISTS public.ecf_provider_credentials (
  -- TEXT coincide con ecf_config. Se evita añadir una FK nueva porque las
  -- instalaciones históricas de Klynn no comparten siempre el mismo tipo de
  -- tenants.id; así la migración es aditiva y portable.
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'ef2',
  username TEXT,
  secret TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, provider)
);

ALTER TABLE public.ecf_provider_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ecf_provider_credentials FROM anon, authenticated;
GRANT ALL ON public.ecf_provider_credentials TO service_role;

COMMENT ON TABLE public.ecf_provider_credentials IS
  'Credenciales fiscales de servidor. Solo Edge Functions con service_role pueden leerlas.';

NOTIFY pgrst, 'reload schema';
