ALTER TABLE public.ordenes
  ADD COLUMN IF NOT EXISTS condicion_cobro TEXT DEFAULT 'COBRAR_AHORA',
  ADD COLUMN IF NOT EXISTS pagos_detalle JSONB,
  ADD COLUMN IF NOT EXISTS anticipo_monto NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS dias_credito INTEGER;

COMMENT ON COLUMN public.ordenes.condicion_cobro IS
  'COBRAR_AHORA, ANTICIPO, AL_RETIRAR o CREDITO';

NOTIFY pgrst, 'reload schema';
