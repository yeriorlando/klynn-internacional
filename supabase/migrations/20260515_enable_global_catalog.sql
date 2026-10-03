-- 1. Habilitar lectura pública (para autenticados) de ítems globales (tenant_id = 'admin')
DROP POLICY IF EXISTS "Public read for global catalog" ON public.catalogo_items;
CREATE POLICY "Public read for global catalog" ON public.catalogo_items 
FOR SELECT USING ( tenant_id::text = 'admin' OR tenant_id::text IN (SELECT t_id::text FROM get_my_tenants()) );

DROP POLICY IF EXISTS "Public read for global services" ON public.servicios;
CREATE POLICY "Public read for global services" ON public.servicios 
FOR SELECT USING ( tenant_id::text = 'admin' OR tenant_id::text IN (SELECT t_id::text FROM get_my_tenants()) );

-- 2. Limpiar ítems previos del admin para evitar duplicados
DELETE FROM public.catalogo_items WHERE tenant_id = 'admin';
DELETE FROM public.servicios WHERE tenant_id = 'admin';

-- 3. INSERTAR TODAS LAS PRENDAS (public/samples/Prendas)
INSERT INTO public.catalogo_items (id, tenant_id, categoria, nombre, precio, creado_en, imagen_url)
VALUES 
  (gen_random_uuid(), 'admin', 'Camisas', 'Camisa manga corta', 0, now(), '/samples/Prendas/Camisa manga corta.webp'),
  (gen_random_uuid(), 'admin', 'Camisas', 'Camisa manga larga', 0, now(), '/samples/Prendas/Camisa manga larga.webp'),
  (gen_random_uuid(), 'admin', 'Camisas', 'Camiseta basica', 0, now(), '/samples/Prendas/Camiseta basica.webp'),
  (gen_random_uuid(), 'admin', 'Camisas', 'Polo', 0, now(), '/samples/Prendas/Polo.webp'),
  (gen_random_uuid(), 'admin', 'Pantalones', 'Jeans', 0, now(), '/samples/Prendas/Jeans.webp'),
  (gen_random_uuid(), 'admin', 'Pantalones', 'Pantalon casual', 0, now(), '/samples/Prendas/Pantalon casual.webp'),
  (gen_random_uuid(), 'admin', 'Pantalones', 'Pantalon de vestir', 0, now(), '/samples/Prendas/Pantalon de vestir.webp'),
  (gen_random_uuid(), 'admin', 'Pantalones', 'Short', 0, now(), '/samples/Prendas/Short.webp'),
  (gen_random_uuid(), 'admin', 'Vestidos y Faldas', 'Vestido corto', 0, now(), '/samples/Prendas/Vestido corto.webp'),
  (gen_random_uuid(), 'admin', 'Vestidos y Faldas', 'Vestido largo', 0, now(), '/samples/Prendas/Vestido largo.webp'),
  (gen_random_uuid(), 'admin', 'Vestidos y Faldas', 'Falda', 0, now(), '/samples/Prendas/Falda.webp'),
  (gen_random_uuid(), 'admin', 'Vestidos y Faldas', 'Blusa', 0, now(), '/samples/Prendas/Blusa.webp'),
  (gen_random_uuid(), 'admin', 'Abrigos', 'Abrigo', 0, now(), '/samples/Prendas/Abrigo.webp'),
  (gen_random_uuid(), 'admin', 'Abrigos', 'Blazer chaqueta', 0, now(), '/samples/Prendas/Blazer chaqueta.webp'),
  (gen_random_uuid(), 'admin', 'Trajes', 'Traje completo (2 pzs)', 0, now(), '/samples/Prendas/Traje completo (2 pzs).webp'),
  (gen_random_uuid(), 'admin', 'Trajes', 'Corbata', 0, now(), '/samples/Prendas/Corbata.webp'),
  (gen_random_uuid(), 'admin', 'Ropa Interior', 'Ropa interior hombre', 0, now(), '/samples/Prendas/Ropa interior hombre.webp'),
  (gen_random_uuid(), 'admin', 'Ropa Interior', 'Ropa interior mujer', 0, now(), '/samples/Prendas/Ropa interior mujer.webp'),
  (gen_random_uuid(), 'admin', 'Ropa Interior', 'Calcetines (par)', 0, now(), '/samples/Prendas/Calcetines (par).webp'),
  (gen_random_uuid(), 'admin', 'Ropa de Cama', 'Sabana individual', 0, now(), '/samples/Prendas/Sabana individual.webp'),
  (gen_random_uuid(), 'admin', 'Ropa de Cama', 'Edredon', 0, now(), '/samples/Prendas/Edredon.webp'),
  (gen_random_uuid(), 'admin', 'Ropa de Cama', 'Cobertor frazada', 0, now(), '/samples/Prendas/Cobertor frazada.webp'),
  (gen_random_uuid(), 'admin', 'Ropa de Cama', 'Funda de almohada', 0, now(), '/samples/Prendas/Funda de almohada.webp'),
  (gen_random_uuid(), 'admin', 'Hogar', 'Toalla grande', 0, now(), '/samples/Prendas/Toalla grande.webp'),
  (gen_random_uuid(), 'admin', 'Hogar', 'Toalla pequena', 0, now(), '/samples/Prendas/Toalla pequena.webp'),
  (gen_random_uuid(), 'admin', 'Hogar', 'Mantel', 0, now(), '/samples/Prendas/Mantel.webp'),
  (gen_random_uuid(), 'admin', 'Hogar', 'Cortina', 0, now(), '/samples/Prendas/Cortina.webp'),
  (gen_random_uuid(), 'admin', 'Bebé', 'Body de bebe', 0, now(), '/samples/Prendas/Body de bebe.webp'),
  (gen_random_uuid(), 'admin', 'Bebé', 'Manta de bebe', 0, now(), '/samples/Prendas/Manta de bebe.webp'),
  (gen_random_uuid(), 'admin', 'Especiales', 'Bata kimono', 0, now(), '/samples/Prendas/Bata kimono.webp'),
  (gen_random_uuid(), 'admin', 'Especiales', 'Uniforme escolar', 0, now(), '/samples/Prendas/Uniforme escolar.webp'),
  (gen_random_uuid(), 'admin', 'Especiales', 'Uniforme medico', 0, now(), '/samples/Prendas/Uniforme medico.webp'),
  (gen_random_uuid(), 'admin', 'Varios', 'Mochila', 0, now(), '/samples/Prendas/Mochila.webp'),
  (gen_random_uuid(), 'admin', 'Varios', 'Gorra', 0, now(), '/samples/Prendas/Gorra.webp'),
  (gen_random_uuid(), 'admin', 'Varios', 'Bufanda', 0, now(), '/samples/Prendas/Bufanda.webp'),
  (gen_random_uuid(), 'admin', 'Varios', 'Tenis zapatillas', 0, now(), '/samples/Prendas/Tenis zapatillas.webp'),
  (gen_random_uuid(), 'admin', 'Varios', 'Pijama', 0, now(), '/samples/Prendas/Pijama.webp'),
  (gen_random_uuid(), 'admin', 'Por Libra', 'Lavado por libra', 0, now(), '/samples/Prendas/Lavado por libra.webp'),
  (gen_random_uuid(), 'admin', 'Por Libra', 'Lavado y planchado por libra', 0, now(), '/samples/Prendas/Lavado y planchado por libra.webp');

-- 4. INSERTAR TODOS LOS SERVICIOS (public/samples/Servicios)
INSERT INTO public.servicios (id, tenant_id, nombre, descripcion, icono, precio, activo, creado_en, imagen_url)
VALUES 
  (gen_random_uuid(), 'admin', 'Lavado y secado', 'Lavado completo + secadora', '🧺', 0, true, now(), '/samples/Servicios/Lavado y secado.webp'),
  (gen_random_uuid(), 'admin', 'Solo lavado', 'Solo lavado en agua', '💧', 0, true, now(), '/samples/Servicios/Solo lavado.webp'),
  (gen_random_uuid(), 'admin', 'Solo secado', 'Únicamente secadora', '🌬️', 0, true, now(), '/samples/Servicios/Solo secado.webp'),
  (gen_random_uuid(), 'admin', 'Planchado', 'Planchado profesional', '♨️', 0, true, now(), '/samples/Servicios/Planchado.webp'),
  (gen_random_uuid(), 'admin', 'Lavado en seco', NULL, '✨', 50, true, now(), '/samples/Servicios/Lavado en seco.webp'),
  (gen_random_uuid(), 'admin', 'Sastrería', 'Arreglos y costura', '🪡', 100, true, now(), '/samples/Servicios/Sastreria.webp'),
  (gen_random_uuid(), 'admin', 'Alfombras', 'Limpieza profunda de alfombras', '🟫', 300, true, now(), '/samples/Servicios/Alfombras.webp'),
  (gen_random_uuid(), 'admin', 'Tapicería', 'Limpieza de muebles y telas', '🛋️', 500, true, now(), '/samples/Servicios/Tapiceria.webp');
