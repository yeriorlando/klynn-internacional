-- Control administrativo de ambientes Pronesoft.
-- Las credenciales permanecen exclusivamente en secretos del Edge Runtime.

ALTER TABLE public.global_config
  ADD COLUMN IF NOT EXISTS fiscal_environment_policy TEXT NOT NULL DEFAULT 'per_tenant';

ALTER TABLE public.global_config
  DROP CONSTRAINT IF EXISTS global_config_fiscal_environment_policy_check;

ALTER TABLE public.global_config
  ADD CONSTRAINT global_config_fiscal_environment_policy_check
  CHECK (fiscal_environment_policy IN ('per_tenant', 'TesteCF', 'CerteCF', 'eCF'));

ALTER TABLE public.ecf_config
  ADD COLUMN IF NOT EXISTS pronesoft_environment TEXT;

UPDATE public.ecf_config
SET pronesoft_environment = CASE
  WHEN ambiente = 'produccion' THEN 'eCF'
  ELSE 'TesteCF'
END
WHERE pronesoft_environment IS NULL;

ALTER TABLE public.ecf_config
  ALTER COLUMN pronesoft_environment SET DEFAULT 'TesteCF';

ALTER TABLE public.ecf_config
  ALTER COLUMN pronesoft_environment SET NOT NULL;

ALTER TABLE public.ecf_config
  DROP CONSTRAINT IF EXISTS ecf_config_pronesoft_environment_check;

ALTER TABLE public.ecf_config
  ADD CONSTRAINT ecf_config_pronesoft_environment_check
  CHECK (pronesoft_environment IN ('TesteCF', 'CerteCF', 'eCF'));

COMMENT ON COLUMN public.global_config.fiscal_environment_policy IS
  'per_tenant respeta ecf_config.pronesoft_environment; otro valor fuerza el ambiente para toda la plataforma.';

COMMENT ON COLUMN public.ecf_config.pronesoft_environment IS
  'Ambiente SDK Pronesoft asignado al tenant: TesteCF, CerteCF o eCF.';

NOTIFY pgrst, 'reload schema';
