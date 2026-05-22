-- ============================================================
-- KLYNN: Limpieza de duplicados en catálogo y servicios
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- PASO 1: Eliminar items con tenant_id = '__loading__' (datos basura)
DELETE FROM catalogo_items WHERE tenant_id = '__loading__';

-- PASO 2: Eliminar servicios con tenant_id = '__loading__'
DELETE FROM servicios WHERE tenant_id = '__loading__';

-- PASO 3: Eliminar duplicados en catalogo_items por tenant (mismo nombre)
-- Conserva el registro con el id más antiguo (menor alfabéticamente)
DELETE FROM catalogo_items
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY tenant_id, LOWER(nombre)
             ORDER BY id
           ) AS rn
    FROM catalogo_items
    WHERE tenant_id != 'admin'
  ) sub
  WHERE rn > 1
);

-- PASO 4: Eliminar duplicados en servicios por tenant (mismo nombre)
DELETE FROM servicios
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY tenant_id, LOWER(nombre)
             ORDER BY id
           ) AS rn
    FROM servicios
    WHERE tenant_id != 'admin'
  ) sub
  WHERE rn > 1
);

-- VERIFICACIÓN: Ver conteos finales
SELECT 'catalogo_items' as tabla, tenant_id, COUNT(*) as total
FROM catalogo_items
GROUP BY tenant_id
ORDER BY total DESC
LIMIT 15;
