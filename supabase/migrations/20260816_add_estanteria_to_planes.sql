-- ==============================================================================
-- MIGRACIÓN: AGREGAR COLUMNAS DE MÓDULOS 'ESTANTERIA' Y 'PROCESOS' A LA TABLA PLANES
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'planes' 
      AND column_name = 'estanteria'
  ) THEN
    ALTER TABLE public.planes ADD COLUMN estanteria BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'planes' 
      AND column_name = 'procesos'
  ) THEN
    ALTER TABLE public.planes ADD COLUMN procesos BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Recargar la caché del esquema de PostgREST
NOTIFY pgrst, 'reload schema';
