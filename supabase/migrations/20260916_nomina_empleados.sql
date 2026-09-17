-- ============================================================
-- NÓMINA DE EMPLEADOS — Migración Klynn Cloud (Corregida)
-- Fecha: 2026-09-16
-- Descripción:
--   1. Extensión de campos laborales en tabla `empleados`.
--   2. Tabla `anticipos_nomina` (Vales de Caja).
--   3. Tabla `periodos_nomina` (Quincenal, Semanal, Regalía).
--   4. Tabla `detalles_nomina` (Desglose por empleado, TSS, ISR, Neto).
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Campos laborales en tabla `empleados`
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empleados' AND column_name = 'salario_base') THEN
    ALTER TABLE empleados ADD COLUMN salario_base NUMERIC(12, 2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empleados' AND column_name = 'frecuencia_pago') THEN
    ALTER TABLE empleados ADD COLUMN frecuencia_pago TEXT NOT NULL DEFAULT 'QUINCENAL'; -- QUINCENAL | SEMANAL | MENSUAL
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empleados' AND column_name = 'tipo_contrato') THEN
    ALTER TABLE empleados ADD COLUMN tipo_contrato TEXT NOT NULL DEFAULT 'FIJO'; -- FIJO | DESTAJO_COMISION | MIXTO
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empleados' AND column_name = 'metodo_pago') THEN
    ALTER TABLE empleados ADD COLUMN metodo_pago TEXT NOT NULL DEFAULT 'TRANSFERENCIA'; -- TRANSFERENCIA | EFECTIVO | CHEQUE
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empleados' AND column_name = 'banco_nombre') THEN
    ALTER TABLE empleados ADD COLUMN banco_nombre TEXT; -- BANCO_POPULAR | BANRESERVAS | BANCO_BHD | OTRO
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empleados' AND column_name = 'numero_cuenta_banco') THEN
    ALTER TABLE empleados ADD COLUMN numero_cuenta_banco TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empleados' AND column_name = 'tipo_cuenta_banco') THEN
    ALTER TABLE empleados ADD COLUMN tipo_cuenta_banco TEXT DEFAULT 'AHORROS'; -- AHORROS | CORRIENTE
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empleados' AND column_name = 'aplica_tss') THEN
    ALTER TABLE empleados ADD COLUMN aplica_tss BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empleados' AND column_name = 'aplica_isr') THEN
    ALTER TABLE empleados ADD COLUMN aplica_isr BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empleados' AND column_name = 'monto_por_docena_planchado') THEN
    ALTER TABLE empleados ADD COLUMN monto_por_docena_planchado NUMERIC(12, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empleados' AND column_name = 'monto_por_entrega_delivery') THEN
    ALTER TABLE empleados ADD COLUMN monto_por_entrega_delivery NUMERIC(12, 2) DEFAULT 0;
  END IF;
END $$;

-- ----------------------------------------------------------------
-- 2. Tabla de Anticipos de Nómina (Vales de Caja)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS anticipos_nomina (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  empleado_id           UUID NOT NULL,                           -- ID del empleado en public.empleados
  monto                 NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
  fecha                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  motivo                TEXT,
  caja_id               UUID,                                    -- Si fue entregado en efectivo desde caja abierta
  estado                TEXT NOT NULL DEFAULT 'PENDIENTE',       -- PENDIENTE | DESCONTADO | ANULADO
  periodo_nomina_id     UUID,                                    -- Referencia al período de nómina donde se descontó
  creado_por            UUID,
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anticipos_tenant    ON anticipos_nomina(tenant_id);
CREATE INDEX IF NOT EXISTS idx_anticipos_empleado  ON anticipos_nomina(empleado_id);
CREATE INDEX IF NOT EXISTS idx_anticipos_estado    ON anticipos_nomina(tenant_id, estado);

ALTER TABLE anticipos_nomina ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anticipos_nomina_tenant_access" ON anticipos_nomina;
CREATE POLICY "anticipos_nomina_tenant_access" ON anticipos_nomina
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
-- 3. Tabla de Períodos de Nómina
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS periodos_nomina (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  codigo                TEXT NOT NULL,                           -- Ej: NOM-2026-Q18
  nombre                TEXT NOT NULL,                           -- Ej: 1ra Quincena Septiembre 2026
  frecuencia            TEXT NOT NULL DEFAULT 'QUINCENAL',       -- QUINCENAL | SEMANAL | MENSUAL | REGALIA
  fecha_inicio          DATE NOT NULL,
  fecha_fin             DATE NOT NULL,
  fecha_pago            DATE NOT NULL DEFAULT CURRENT_DATE,
  total_bruto           NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_deducciones     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_neto            NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_empleados       INT NOT NULL DEFAULT 0,
  estado                TEXT NOT NULL DEFAULT 'BORRADOR',        -- BORRADOR | APROBADA | PAGADA | ANULADA
  notas                 TEXT,
  aprobado_por          UUID,
  creado_por            UUID,
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_periodos_nomina_tenant ON periodos_nomina(tenant_id);
CREATE INDEX IF NOT EXISTS idx_periodos_nomina_fechas ON periodos_nomina(tenant_id, fecha_inicio, fecha_fin);

ALTER TABLE periodos_nomina ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "periodos_nomina_tenant_access" ON periodos_nomina;
CREATE POLICY "periodos_nomina_tenant_access" ON periodos_nomina
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
-- 4. Tabla de Detalles de Nómina (Línea por empleado)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS detalles_nomina (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  periodo_id            UUID NOT NULL REFERENCES periodos_nomina(id) ON DELETE CASCADE,
  empleado_id           UUID NOT NULL,                           -- ID del empleado en public.empleados
  -- Ingresos
  salario_base_periodo  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  comisiones_destajo    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  horas_extras          NUMERIC(12, 2) NOT NULL DEFAULT 0,
  cantidad_horas_extras NUMERIC(6, 2) NOT NULL DEFAULT 0,
  bonos_incentivos      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  otros_ingresos        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_ingresos        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  -- Deducciones
  anticipos_descontados NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tss_afp               NUMERIC(12, 2) NOT NULL DEFAULT 0,       -- 2.87% empleado
  tss_sfs               NUMERIC(12, 2) NOT NULL DEFAULT 0,       -- 3.04% empleado
  isr_retencion         NUMERIC(12, 2) NOT NULL DEFAULT 0,       -- Retención DGII
  otras_deducciones     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_deducciones     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  -- Total a Pagar
  neto_pagar            NUMERIC(12, 2) NOT NULL DEFAULT 0,
  metodo_pago           TEXT NOT NULL DEFAULT 'TRANSFERENCIA',   -- TRANSFERENCIA | EFECTIVO | CHEQUE
  pagado                BOOLEAN NOT NULL DEFAULT false,
  fecha_pago            TIMESTAMPTZ,
  referencia_pago       TEXT,
  notas                 TEXT,
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_detalles_nomina_tenant   ON detalles_nomina(tenant_id);
CREATE INDEX IF NOT EXISTS idx_detalles_nomina_periodo  ON detalles_nomina(periodo_id);
CREATE INDEX IF NOT EXISTS idx_detalles_nomina_empleado ON detalles_nomina(empleado_id);

ALTER TABLE detalles_nomina ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "detalles_nomina_tenant_access" ON detalles_nomina;
CREATE POLICY "detalles_nomina_tenant_access" ON detalles_nomina
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

-- Asegurar columna en caso de actualización
ALTER TABLE detalles_nomina ADD COLUMN IF NOT EXISTS cantidad_horas_extras NUMERIC(6, 2) DEFAULT 0;

-- Notificar a PostgREST para recargar la caché del esquema
NOTIFY pgrst, 'reload schema';
