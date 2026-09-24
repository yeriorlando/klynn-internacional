-- ====================================================================
-- AUTO-PURGA DE IMÁGENES DE ENTREGA (POD) A LOS 7 DÍAS
-- ====================================================================
-- Elimina los archivos de fotos de comprobantes de entrega con más de 7 días
-- del bucket de almacenamiento y limpia la referencia pod_foto en la tabla ordenes,
-- preservando el registro de auditoría (pod_receptor y pod_fecha).

-- 1. Función de limpieza
CREATE OR REPLACE FUNCTION public.cleanup_old_pod_images()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_storage_count INTEGER := 0;
    cleaned_orders_count INTEGER := 0;
BEGIN
    -- 1. Eliminar archivos físicos con más de 7 días del bucket 'catalogo' bajo el directorio 'pod/'
    DELETE FROM storage.objects
    WHERE bucket_id = 'catalogo'
      AND name LIKE 'pod/%'
      AND created_at < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS deleted_storage_count = ROW_COUNT;

    -- 2. Limpiar el enlace de la imagen en ordenes para no dejar URLs rotas,
    -- pero preservando pod_receptor y pod_fecha para trazabilidad operativa y contable
    UPDATE public.ordenes
    SET pod_foto = NULL
    WHERE pod_fecha < NOW() - INTERVAL '7 days'
      AND pod_foto IS NOT NULL;
    GET DIAGNOSTICS cleaned_orders_count = ROW_COUNT;

    RAISE NOTICE 'POD Cleanup completado: % fotos en storage eliminadas, % órdenes actualizadas', 
                 deleted_storage_count, cleaned_orders_count;
END;
$$;

-- 2. Programar la tarea diaria con pg_cron (ejecuta a las 3:45 AM UTC diariamente)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-pod-images') THEN
            PERFORM cron.unschedule('cleanup-old-pod-images');
        END IF;

        PERFORM cron.schedule(
            'cleanup-old-pod-images',
            '45 3 * * *',
            'SELECT public.cleanup_old_pod_images()'
        );
    END IF;
END;
$$;
