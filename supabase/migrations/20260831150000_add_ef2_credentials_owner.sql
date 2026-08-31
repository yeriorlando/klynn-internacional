-- Define quién administra la credencial EF2 sin exponer el secreto.
ALTER TABLE public.ecf_config
  ADD COLUMN IF NOT EXISTS ef2_credentials_owner TEXT NOT NULL DEFAULT 'tenant';

ALTER TABLE public.ecf_config
  DROP CONSTRAINT IF EXISTS ecf_config_ef2_credentials_owner_check;

ALTER TABLE public.ecf_config
  ADD CONSTRAINT ecf_config_ef2_credentials_owner_check
  CHECK (ef2_credentials_owner IN ('platform', 'tenant'));

COMMENT ON COLUMN public.ecf_config.ef2_credentials_owner IS
  'platform: Klynn configura EF2 desde /admin; tenant: el administrador de la lavandería lo configura desde /configuracion.';

NOTIFY pgrst, 'reload schema';
