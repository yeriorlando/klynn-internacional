-- ============================================================
-- KLYNN: Segunda pasada - eliminar duplicados con tildes
-- (Pantalon casual = Pantalón casual, etc.)
-- ============================================================

-- PASO 1: Eliminar duplicados de catalogo_items considerando tildes
-- Usa TRANSLATE para normalizar acentos sin necesitar la extensión unaccent
DELETE FROM catalogo_items
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY tenant_id,
             LOWER(TRANSLATE(nombre,
               'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
               'aaaaaeeeeiiiiooooouuuuncAAAAEEEEIIIIOOOOOUUUUNC'
             ))
             ORDER BY
               -- Prioridad: conservar el que tiene precio real (> 0) primero
               CASE WHEN precio > 0 THEN 0 ELSE 1 END,
               id
           ) AS rn
    FROM catalogo_items
    WHERE tenant_id != 'admin'
  ) sub
  WHERE rn > 1
);

-- PASO 2: Eliminar duplicados de servicios considerando tildes
DELETE FROM servicios
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY tenant_id,
             LOWER(TRANSLATE(nombre,
               'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
               'aaaaaeeeeiiiiooooouuuuncAAAAEEEEIIIIOOOOOUUUUNC'
             ))
             ORDER BY
               CASE WHEN precio > 0 THEN 0 ELSE 1 END,
               id
           ) AS rn
    FROM servicios
    WHERE tenant_id != 'admin'
  ) sub
  WHERE rn > 1
);

-- VERIFICACIÓN FINAL
SELECT tenant_id, COUNT(*) as total
FROM catalogo_items
GROUP BY tenant_id
ORDER BY total DESC
LIMIT 15;
