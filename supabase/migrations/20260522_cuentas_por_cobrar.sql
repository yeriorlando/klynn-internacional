-- ============================================================
-- CUENTAS POR COBRAR — Migración Klynn
-- Fecha: 2026-05-22
-- Descripción:
--   1. Tabla `abonos_credito` para registrar pagos parciales
--      de órdenes a crédito (ya existentes en `ordenes`).
--   2. Vista `v_cuentas_por_cobrar` para consultar deudas
--      pendientes por cliente de forma eficiente.
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Tabla de Abonos a Crédito
--    Registra cada pago parcial hecho a una orden con saldo > 0
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS abonos_credito (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  orden_id      UUID NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  cliente_id    UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  empleado_id   UUID NOT NULL,
  monto         NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
  metodo_pago   TEXT NOT NULL DEFAULT 'EFECTIVO',  -- EFECTIVO | TARJETA | TRANSFERENCIA
  notas         TEXT,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_abonos_tenant    ON abonos_credito(tenant_id);
CREATE INDEX IF NOT EXISTS idx_abonos_orden     ON abonos_credito(orden_id);
CREATE INDEX IF NOT EXISTS idx_abonos_cliente   ON abonos_credito(cliente_id);

-- ----------------------------------------------------------------
-- 2. Row Level Security para abonos_credito
-- ----------------------------------------------------------------
ALTER TABLE abonos_credito ENABLE ROW LEVEL SECURITY;

-- Política: los empleados del tenant pueden ver/insertar sus propios abonos
CREATE POLICY "abonos_tenant_access" ON abonos_credito
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM empleados WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM empleados WHERE id = auth.uid()
    )
  );

-- ----------------------------------------------------------------
-- 3. Vista: Cuentas por Cobrar
--    Muestra todas las órdenes con saldo > 0 que NO están ANULADAS,
--    agrupadas con info del cliente y días de antigüedad.
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW v_cuentas_por_cobrar AS
SELECT
  o.id                                              AS orden_id,
  o.tenant_id,
  o.numero,
  o.creado_en                                       AS fecha_orden,
  o.total,
  o.pagado,
  o.saldo,
  o.metodo_pago,
  o.estado,
  o.notas,
  -- Días transcurridos desde la creación de la orden
  EXTRACT(DAY FROM NOW() - o.creado_en)::INT        AS dias_antiguedad,
  -- Cliente
  c.id                                              AS cliente_id,
  c.nombre                                          AS cliente_nombre,
  c.apellido                                        AS cliente_apellido,
  c.telefono                                        AS cliente_telefono,
  c.email                                           AS cliente_email,
  c.cedula                                          AS cliente_cedula,
  -- Clasificación de mora
  CASE
    WHEN EXTRACT(DAY FROM NOW() - o.creado_en) <= 7   THEN 'AL_DIA'
    WHEN EXTRACT(DAY FROM NOW() - o.creado_en) <= 30  THEN 'POR_VENCER'
    WHEN EXTRACT(DAY FROM NOW() - o.creado_en) <= 60  THEN 'VENCIDA'
    ELSE                                                    'CRITICA'
  END                                               AS estado_mora
FROM ordenes o
LEFT JOIN clientes c ON c.id = o.cliente_id
WHERE
  o.saldo > 0
  AND o.estado NOT IN ('ANULADA')
ORDER BY o.creado_en ASC;

-- ----------------------------------------------------------------
-- 4. RPC: Resumen de Cuentas por Cobrar por Tenant
--    Retorna totales agrupados por cliente para el panel resumen.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_resumen_cxc(p_tenant_id UUID)
RETURNS TABLE (
  cliente_id       UUID,
  cliente_nombre   TEXT,
  cliente_apellido TEXT,
  cliente_telefono TEXT,
  total_deuda      NUMERIC,
  ordenes_count    BIGINT,
  dias_max         INT,
  estado_mora      TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    v.cliente_id,
    v.cliente_nombre,
    v.cliente_apellido,
    v.cliente_telefono,
    SUM(v.saldo)                    AS total_deuda,
    COUNT(*)                        AS ordenes_count,
    MAX(v.dias_antiguedad)::INT     AS dias_max,
    CASE
      WHEN MAX(v.dias_antiguedad) <= 7   THEN 'AL_DIA'
      WHEN MAX(v.dias_antiguedad) <= 30  THEN 'POR_VENCER'
      WHEN MAX(v.dias_antiguedad) <= 60  THEN 'VENCIDA'
      ELSE                                    'CRITICA'
    END                             AS estado_mora
  FROM v_cuentas_por_cobrar v
  WHERE v.tenant_id = p_tenant_id
  GROUP BY v.cliente_id, v.cliente_nombre, v.cliente_apellido, v.cliente_telefono
  ORDER BY total_deuda DESC;
$$;
