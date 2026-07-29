-- ============================================================
-- Agregar columna plan_fecha_inicio a la tabla tenants
-- Fecha: 2026-07-29
-- Descripción: Agrega la columna `plan_fecha_inicio` para rastrear
-- la fecha de inicio/última renovación del plan del tenant para reiniciar
-- el límite de órdenes mensualmente.
-- ============================================================

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS plan_fecha_inicio TIMESTAMP WITH TIME ZONE;

-- Comentario descriptivo
COMMENT ON COLUMN public.tenants.plan_fecha_inicio IS
  'Fecha de inicio o última renovación del plan actual del tenant.';

-- Inicializar plan_fecha_inicio para tenants existentes con su creado_en
UPDATE public.tenants SET plan_fecha_inicio = creado_en WHERE plan_fecha_inicio IS NULL;
