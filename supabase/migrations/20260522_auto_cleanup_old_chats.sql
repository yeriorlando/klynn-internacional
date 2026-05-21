-- ====================================================================
-- AUTO-LIMPIEZA: Borrar conversaciones y mensajes con más de 7 días
-- ====================================================================
-- Requiere la extensión pg_cron (habilitada por defecto en Supabase)

-- 1. Habilitar pg_cron si no está activo
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Función que elimina datos de chat antiguos (> 7 días)
CREATE OR REPLACE FUNCTION public.cleanup_old_conversations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_msgs INTEGER;
    deleted_convs INTEGER;
BEGIN
    -- Borrar mensajes de conversaciones con más de 7 días de antigüedad
    DELETE FROM public.messages
    WHERE time < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS deleted_msgs = ROW_COUNT;

    -- Borrar conversaciones con más de 7 días sin actividad
    DELETE FROM public.conversations
    WHERE time < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS deleted_convs = ROW_COUNT;

    RAISE NOTICE 'Cleanup completed: % messages, % conversations deleted', deleted_msgs, deleted_convs;
END;
$$;

-- 3. Programar la limpieza: cada día a las 3:00 AM UTC
--    (ajustar la hora según tu zona horaria si es necesario)
SELECT cron.schedule(
    'cleanup-old-chats',     -- nombre del cron job
    '0 3 * * *',             -- cada día a las 3:00 AM UTC
    'SELECT public.cleanup_old_conversations()'
);

-- 4. Índice para acelerar la limpieza (búsqueda por fecha)
CREATE INDEX IF NOT EXISTS idx_messages_time ON public.messages(time);
CREATE INDEX IF NOT EXISTS idx_conversations_time ON public.conversations(time);

-- 5. Verificar que el cron está activo
-- SELECT * FROM cron.job; -- Descomenta para verificar
