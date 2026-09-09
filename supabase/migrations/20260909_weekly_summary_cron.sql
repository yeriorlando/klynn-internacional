-- ==============================================================================
-- Migración: Programación Automática de Resúmenes de Negocio (pg_cron + pg_net)
-- Fecha: 2026-09-09
-- ==============================================================================

-- 1. Asegurar extensiones necesarias si están disponibles
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Función para disparar la Edge Function weekly-business-summary
CREATE OR REPLACE FUNCTION public.trigger_weekly_business_summaries(force_run boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_supabase_url text;
  v_service_key text;
  v_secret text;
BEGIN
  -- Tomar parámetros del vault / app settings si están configurados
  v_secret := COALESCE(current_setting('app.settings.weekly_summary_cron_secret', true), 'klynn_cron_secret_2026');
  
  -- Realizar invocación HTTP mediante pg_net
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    PERFORM net.http_post(
      url := 'https://api.klynn.com.do/functions/v1/weekly-business-summary',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', v_secret
      ),
      body := jsonb_build_object(
        'action', 'run-scheduled',
        'force', force_run
      )
    );
  END IF;
END;
$$;

-- 3. Programación en pg_cron (Lunes a las 11:00 UTC / 7:00 AM AST y Día 1 de cada mes)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Desprogramar versiones previas para garantizar idempotencia
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-business-summary-cron') THEN
      PERFORM cron.unschedule('weekly-business-summary-cron');
    END IF;

    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monthly-business-summary-cron') THEN
      PERFORM cron.unschedule('monthly-business-summary-cron');
    END IF;

    -- Lunes a las 11:00 UTC (7:00 AM República Dominicana AST)
    PERFORM cron.schedule(
      'weekly-business-summary-cron',
      '0 11 * * 1',
      'SELECT public.trigger_weekly_business_summaries(false);'
    );

    -- Día 1 de cada mes a las 11:00 UTC (7:00 AM República Dominicana AST)
    PERFORM cron.schedule(
      'monthly-business-summary-cron',
      '0 11 1 * *',
      'SELECT public.trigger_weekly_business_summaries(false);'
    );
  END IF;
END $$;

-- 4. RPC para disparar resúmenes bajo demanda desde el panel de SuperAdmin
CREATE OR REPLACE FUNCTION public.admin_run_weekly_summaries(p_force boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar autorización de SuperAdmin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users u
    JOIN public.global_config gc ON gc.id = 1
    WHERE u.id = auth.uid()
      AND (
        u.email = 'yeriorlandor@gmail.com'
        OR (gc.admin_emails IS NOT NULL AND gc.admin_emails ? u.email)
      )
  ) THEN
    RAISE EXCEPTION 'No autorizado. Solo SuperAdmin puede ejecutar los resúmenes del sistema.';
  END IF;

  PERFORM public.trigger_weekly_business_summaries(p_force);

  RETURN jsonb_build_object(
    'ok', true,
    'message', 'Invocación de resúmenes programada en segundo plano.',
    'force', p_force
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_run_weekly_summaries(boolean) TO authenticated;
