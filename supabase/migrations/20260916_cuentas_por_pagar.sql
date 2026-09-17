-- ============================================================
-- CUENTAS POR PAGAR (CXP) — Migración Klynn Cloud
-- Fecha: 2026-09-16
-- Descripción:
--   1. Tabla `suplidores`: proveedores de insumos (químicos, empaques, repuestos, combustible).
--   2. Tabla `facturas_cxp`: facturas a crédito con NCF dominicano (B01, B11, etc.), plazos y vencimientos.
--   3. Tabla `abonos_cxp`: pagos y abonos parciales a facturas de suplidores.
--   4. Vista `v_cuentas_por_pagar`: análisis de vencimientos y clasificación de mora.
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Tabla de Suplidores / Proveedores
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suplidores (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nombre_comercial      TEXT NOT NULL,
  razon_social          TEXT,
  rnc_cedula            TEXT,
  telefono              TEXT,
  email                 TEXT,
  direccion             TEXT,
  contacto_nombre       TEXT,
  categoria_insumo      TEXT NOT NULL DEFAULT 'QUIMICOS', -- QUIMICOS | EMPAQUE | CALDERAS_REPUESTOS | COMBUSTIBLE | SERVICIOS | OTROS
  dias_credito_default  INT NOT NULL DEFAULT 30,          -- 0 (contado), 15, 30, 45, 60 días
  limite_credito        NUMERIC(12, 2) DEFAULT 0,
  notas                 TEXT,
  activo                BOOLEAN NOT NULL DEFAULT true,
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suplidores_tenant ON suplidores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suplidores_activo ON suplidores(tenant_id, activo);

ALTER TABLE suplidores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suplidores_tenant_access" ON suplidores;
CREATE POLICY "suplidores_tenant_access" ON suplidores
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
-- 2. Tabla de Facturas de Cuentas por Pagar (CXP)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS facturas_cxp (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  suplidor_id           UUID NOT NULL REFERENCES suplidores(id) ON DELETE RESTRICT,
  numero_factura        TEXT NOT NULL,                           -- Número interno del suplidor
  ncf                   TEXT,                                    -- NCF emisor (B01, B11, E31, etc.)
  tipo_ncf              TEXT NOT NULL DEFAULT 'B01_CREDITO_FISCAL',
  fecha_emision         DATE NOT NULL DEFAULT CURRENT_DATE,
  plazo_dias            INT NOT NULL DEFAULT 30,
  fecha_vencimiento     DATE NOT NULL,
  subtotal              NUMERIC(12, 2) NOT NULL DEFAULT 0,
  itbis                 NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total                 NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
  monto_pagado          NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (monto_pagado >= 0),
  saldo_pendiente       NUMERIC(12, 2) GENERATED ALWAYS AS (total - monto_pagado) STORED,
  estado                TEXT NOT NULL DEFAULT 'PENDIENTE',       -- PENDIENTE | PARCIAL | PAGADA | ANULADA
  categoria_gasto       TEXT NOT NULL DEFAULT 'INSUMOS',
  descripcion           TEXT,
  comprobante_url       TEXT,
  creado_por            UUID,
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facturas_cxp_tenant    ON facturas_cxp(tenant_id);
CREATE INDEX IF NOT EXISTS idx_facturas_cxp_suplidor  ON facturas_cxp(suplidor_id);
CREATE INDEX IF NOT EXISTS idx_facturas_cxp_estado    ON facturas_cxp(tenant_id, estado);
CREATE INDEX IF NOT EXISTS idx_facturas_cxp_vence     ON facturas_cxp(tenant_id, fecha_vencimiento);

ALTER TABLE facturas_cxp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "facturas_cxp_tenant_access" ON facturas_cxp;
CREATE POLICY "facturas_cxp_tenant_access" ON facturas_cxp
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
-- 3. Tabla de Abonos a Facturas CXP
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS abonos_cxp (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  factura_cxp_id        UUID NOT NULL REFERENCES facturas_cxp(id) ON DELETE CASCADE,
  suplidor_id           UUID NOT NULL REFERENCES suplidores(id) ON DELETE RESTRICT,
  empleado_id           UUID NOT NULL,
  monto                 NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
  metodo_pago           TEXT NOT NULL DEFAULT 'TRANSFERENCIA',   -- TRANSFERENCIA | EFECTIVO | CHEQUE | TARJETA
  banco_origen          TEXT,                                    -- BANCO_POPULAR | BANRESERVAS | BANCO_BHD | OTRO
  referencia_bancaria   TEXT,
  caja_id               UUID,                                    -- Si se pagó con efectivo de caja
  gasto_id              UUID,                                    -- Si se generó un gasto contable
  notas                 TEXT,
  fecha_pago            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abonos_cxp_tenant  ON abonos_cxp(tenant_id);
CREATE INDEX IF NOT EXISTS idx_abonos_cxp_factura ON abonos_cxp(factura_cxp_id);

ALTER TABLE abonos_cxp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "abonos_cxp_tenant_access" ON abonos_cxp;
CREATE POLICY "abonos_cxp_tenant_access" ON abonos_cxp
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
-- 4. Vista: Cuentas por Pagar con Semáforo de Mora
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW v_cuentas_por_pagar AS
SELECT
  f.id                                                    AS factura_id,
  f.tenant_id,
  f.numero_factura,
  f.ncf,
  f.tipo_ncf,
  f.fecha_emision,
  f.plazo_dias,
  f.fecha_vencimiento,
  f.subtotal,
  f.itbis,
  f.total,
  f.monto_pagado,
  f.saldo_pendiente,
  f.estado,
  f.categoria_gasto,
  f.descripcion,
  f.comprobante_url,
  -- Días relativos al vencimiento
  (CURRENT_DATE - f.fecha_vencimiento)::INT               AS dias_vencida,
  -- Suplidor
  s.id                                                    AS suplidor_id,
  s.nombre_comercial                                      AS suplidor_nombre,
  s.razon_social                                          AS suplidor_razon_social,
  s.rnc_cedula                                            AS suplidor_rnc,
  s.telefono                                              AS suplidor_telefono,
  s.email                                                 AS suplidor_email,
  s.categoria_insumo                                      AS suplidor_categoria,
  -- Semáforo de Mora
  CASE
    WHEN f.saldo_pendiente <= 0                               THEN 'PAGADA'
    WHEN (CURRENT_DATE - f.fecha_vencimiento) < -7            THEN 'AL_DIA'      -- Más de 7 días para vencer
    WHEN (CURRENT_DATE - f.fecha_vencimiento) <= 0            THEN 'POR_VENCER'  -- Próxima a vencer (últimos 7 días)
    WHEN (CURRENT_DATE - f.fecha_vencimiento) <= 30           THEN 'VENCIDA'     -- Vencida hasta 30 días
    ELSE                                                           'CRITICA'     -- Vencida más de 30 días
  END                                                     AS estado_mora
FROM facturas_cxp f
JOIN suplidores s ON s.id = f.suplidor_id
WHERE f.estado NOT IN ('ANULADA')
ORDER BY f.fecha_vencimiento ASC;

-- Notificar a PostgREST para recargar la caché del esquema
NOTIFY pgrst, 'reload schema';
