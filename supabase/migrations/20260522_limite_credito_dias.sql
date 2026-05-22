-- ============================================================
-- Límite de Crédito por Días — Migración Klynn
-- Fecha: 2026-05-22
-- Descripción: Agrega la columna `limite_credito_dias` a la
-- tabla tenants para guardar cuántos días se permite el crédito.
-- ============================================================

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS limite_credito_dias INTEGER DEFAULT 30;

-- Comentario descriptivo
COMMENT ON COLUMN tenants.limite_credito_dias IS
  'Días máximos de crédito permitido. Órdenes con saldo pendiente mayor a este valor se marcan como vencidas.';
