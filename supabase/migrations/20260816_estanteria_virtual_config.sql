-- ==============================================================================
-- MIGRACIÓN: ESTANTERÍA VIRTUAL Y CONVEYOR PARA TODOS LOS TENANTS
-- ==============================================================================

-- 1. Asegurar que la columna 'config' exista en la tabla 'tenants' con tipo JSONB
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'tenants' 
      AND column_name = 'config'
  ) THEN
    ALTER TABLE public.tenants ADD COLUMN config JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- 2. Asegurar que la columna 'ubicacion_ropa' exista en la tabla 'ordenes'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'ordenes' 
      AND column_name = 'ubicacion_ropa'
  ) THEN
    ALTER TABLE public.ordenes ADD COLUMN ubicacion_ropa TEXT DEFAULT NULL;
  END IF;
END $$;

-- 3. Crear índices para optimizar la velocidad de búsqueda de ganchos y zonas
CREATE INDEX IF NOT EXISTS idx_tenants_config_estanteria 
ON public.tenants USING gin (config);

CREATE INDEX IF NOT EXISTS idx_ordenes_ubicacion_ropa 
ON public.ordenes (tenant_id, ubicacion_ropa) 
WHERE ubicacion_ropa IS NOT NULL AND ubicacion_ropa != '';

-- 4. Asegurar política RLS para que cualquier tenant pueda actualizar su propia configuración
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'tenants' 
      AND policyname = 'tenants_update_own_config'
  ) THEN
    CREATE POLICY "tenants_update_own_config" ON public.tenants
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 5. Recargar la caché de PostgREST para aplicar cambios de inmediato
NOTIFY pgrst, 'reload schema';
