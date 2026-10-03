-- 1. Asegurar columnas para identificar muestras en las tablas privadas
ALTER TABLE public.catalogo_items ADD COLUMN IF NOT EXISTS es_muestra BOOLEAN DEFAULT false;
ALTER TABLE public.servicios ADD COLUMN IF NOT EXISTS es_muestra BOOLEAN DEFAULT false;

-- 2. Crear la tabla de muestras global (maestra)
DROP TABLE IF EXISTS public.muestras CASCADE;
CREATE TABLE IF NOT EXISTS public.muestras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL, -- 'PRENDA' o 'SERVICIO'
    categoria TEXT,
    nombre TEXT NOT NULL,
    descripcion TEXT, -- Columna añadida
    precio NUMERIC DEFAULT 0,
    imagen_url TEXT,
    icono TEXT,
    creado_en TIMESTAMPTZ DEFAULT now()
);

-- 3. Habilitar RLS en muestras
ALTER TABLE public.muestras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view for muestras" ON public.muestras;
CREATE POLICY "Public view for muestras" ON public.muestras FOR SELECT USING ( true );

-- 4. Limpiar muestras actuales e insertar las oficiales desde /public/samples
DELETE FROM public.muestras;

-- Prendas
INSERT INTO public.muestras (tipo, categoria, nombre, precio, imagen_url) VALUES 
('PRENDA', 'Camisas', 'Camisa manga corta', 0, '/samples/Prendas/Camisa manga corta.webp'),
('PRENDA', 'Camisas', 'Camisa manga larga', 0, '/samples/Prendas/Camisa manga larga.webp'),
('PRENDA', 'Camisas', 'Camiseta basica', 0, '/samples/Prendas/Camiseta basica.webp'),
('PRENDA', 'Camisas', 'Polo', 0, '/samples/Prendas/Polo.webp'),
('PRENDA', 'Pantalones', 'Jeans', 0, '/samples/Prendas/Jeans.webp'),
('PRENDA', 'Pantalones', 'Pantalon casual', 0, '/samples/Prendas/Pantalon casual.webp'),
('PRENDA', 'Pantalones', 'Pantalon de vestir', 0, '/samples/Prendas/Pantalon de vestir.webp'),
('PRENDA', 'Pantalones', 'Short', 0, '/samples/Prendas/Short.webp'),
('PRENDA', 'Vestidos y Faldas', 'Vestido corto', 0, '/samples/Prendas/Vestido corto.webp'),
('PRENDA', 'Vestidos y Faldas', 'Vestido largo', 0, '/samples/Prendas/Vestido largo.webp'),
('PRENDA', 'Vestidos y Faldas', 'Falda', 0, '/samples/Prendas/Falda.webp'),
('PRENDA', 'Vestidos y Faldas', 'Blusa', 0, '/samples/Prendas/Blusa.webp'),
('PRENDA', 'Abrigos', 'Abrigo', 0, '/samples/Prendas/Abrigo.webp'),
('PRENDA', 'Abrigos', 'Blazer chaqueta', 0, '/samples/Prendas/Blazer chaqueta.webp'),
('PRENDA', 'Trajes', 'Traje completo (2 pzs)', 0, '/samples/Prendas/Traje completo (2 pzs).webp'),
('PRENDA', 'Trajes', 'Corbata', 0, '/samples/Prendas/Corbata.webp'),
('PRENDA', 'Ropa Interior', 'Ropa interior hombre', 0, '/samples/Prendas/Ropa interior hombre.webp'),
('PRENDA', 'Ropa Interior', 'Ropa interior mujer', 0, '/samples/Prendas/Ropa interior mujer.webp'),
('PRENDA', 'Ropa Interior', 'Calcetines (par)', 0, '/samples/Prendas/Calcetines (par).webp'),
('PRENDA', 'Ropa de Cama', 'Sabana individual', 0, '/samples/Prendas/Sabana individual.webp'),
('PRENDA', 'Ropa de Cama', 'Edredon', 0, '/samples/Prendas/Edredon.webp'),
('PRENDA', 'Ropa de Cama', 'Cobertor frazada', 0, '/samples/Prendas/Cobertor frazada.webp'),
('PRENDA', 'Ropa de Cama', 'Funda de almohada', 0, '/samples/Prendas/Funda de almohada.webp'),
('PRENDA', 'Hogar', 'Toalla grande', 0, '/samples/Prendas/Toalla grande.webp'),
('PRENDA', 'Hogar', 'Toalla pequena', 0, '/samples/Prendas/Toalla pequena.webp'),
('PRENDA', 'Hogar', 'Mantel', 0, '/samples/Prendas/Mantel.webp'),
('PRENDA', 'Hogar', 'Cortina', 0, '/samples/Prendas/Cortina.webp'),
('PRENDA', 'Bebé', 'Body de bebe', 0, '/samples/Prendas/Body de bebe.webp'),
('PRENDA', 'Bebé', 'Manta de bebe', 0, '/samples/Prendas/Manta de bebe.webp'),
('PRENDA', 'Especiales', 'Bata kimono', 0, '/samples/Prendas/Bata kimono.webp'),
('PRENDA', 'Especiales', 'Uniforme escolar', 0, '/samples/Prendas/Uniforme escolar.webp'),
('PRENDA', 'Especiales', 'Uniforme medico', 0, '/samples/Prendas/Uniforme medico.webp'),
('PRENDA', 'Varios', 'Mochila', 0, '/samples/Prendas/Mochila.webp'),
('PRENDA', 'Varios', 'Gorra', 0, '/samples/Prendas/Gorra.webp'),
('PRENDA', 'Varios', 'Bufanda', 0, '/samples/Prendas/Bufanda.webp'),
('PRENDA', 'Varios', 'Tenis zapatillas', 0, '/samples/Prendas/Tenis zapatillas.webp'),
('PRENDA', 'Varios', 'Pijama', 0, '/samples/Prendas/Pijama.webp'),
('PRENDA', 'Por Libra', 'Lavado por libra', 0, '/samples/Prendas/Lavado por libra.webp'),
('PRENDA', 'Por Libra', 'Lavado y planchado por libra', 0, '/samples/Prendas/Lavado y planchado por libra.webp');

-- Servicios
INSERT INTO public.muestras (tipo, nombre, descripcion, icono, precio, imagen_url) VALUES 
('SERVICIO', 'Lavado y secado', 'Lavado completo + secadora', '🧺', 0, '/samples/Servicios/Lavado y secado.webp'),
('SERVICIO', 'Solo lavado', 'Solo lavado en agua', '💧', 0, '/samples/Servicios/Solo lavado.webp'),
('SERVICIO', 'Solo secado', 'Únicamente secadora', '🌬️', 0, '/samples/Servicios/Solo secado.webp'),
('SERVICIO', 'Planchado', 'Planchado profesional', '♨️', 0, '/samples/Servicios/Planchado.webp'),
('SERVICIO', 'Lavado en seco', NULL, '✨', 50, '/samples/Servicios/Lavado en seco.webp'),
('SERVICIO', 'Sastrería', 'Arreglos y costura', '🪡', 100, '/samples/Servicios/Sastreria.webp'),
('SERVICIO', 'Alfombras', 'Limpieza profunda de alfombras', '🟫', 300, '/samples/Servicios/Alfombras.webp'),
('SERVICIO', 'Tapicería', 'Limpieza de muebles y telas', '🛋️', 500, '/samples/Servicios/Tapiceria.webp');

-- 5. Función para clonar muestras a un nuevo tenant
CREATE OR REPLACE FUNCTION public.clonar_muestras_a_tenant(target_tenant_id TEXT)
RETURNS void AS $$
BEGIN
  -- Limpiar previos para evitar duplicados si se re-ejecuta
  -- 1. Limpiar los marcados explícitamente como muestra
  DELETE FROM public.catalogo_items WHERE tenant_id = target_tenant_id AND es_muestra = true;
  DELETE FROM public.servicios WHERE tenant_id = target_tenant_id AND es_muestra = true;
  
  -- 2. Limpiar duplicados del sistema viejo (por nombre) para evitar el "maldito desastre"
  DELETE FROM public.catalogo_items 
  WHERE tenant_id = target_tenant_id 
  AND nombre IN (SELECT nombre FROM public.muestras WHERE tipo = 'PRENDA');
  
  DELETE FROM public.servicios 
  WHERE tenant_id = target_tenant_id 
  AND nombre IN (SELECT nombre FROM public.muestras WHERE tipo = 'SERVICIO');

  -- Clonar prendas
  INSERT INTO public.catalogo_items (id, tenant_id, categoria, nombre, precio, imagen_url, es_muestra, activo)
  SELECT gen_random_uuid(), target_tenant_id, categoria, nombre, precio, imagen_url, true, true
  FROM public.muestras
  WHERE tipo = 'PRENDA'
  ON CONFLICT DO NOTHING;

  -- Clonar servicios
  INSERT INTO public.servicios (id, tenant_id, nombre, icono, precio, imagen_url, es_muestra, activo)
  SELECT gen_random_uuid(), target_tenant_id, nombre, icono, precio, imagen_url, true, true
  FROM public.muestras
  WHERE tipo = 'SERVICIO'
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger para automatizar el proceso al crear un tenant
CREATE OR REPLACE FUNCTION public.on_tenant_created_populate_catalog()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.clonar_muestras_a_tenant(NEW.id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_clonar_muestras ON public.tenants;
CREATE TRIGGER trigger_clonar_muestras
AFTER INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.on_tenant_created_populate_catalog();

-- 7. Ejecutar para tenants existentes (retrocompatibilidad)
DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN SELECT id FROM public.tenants LOOP
        PERFORM public.clonar_muestras_a_tenant(t.id::text);
    END LOOP;
END $$;
