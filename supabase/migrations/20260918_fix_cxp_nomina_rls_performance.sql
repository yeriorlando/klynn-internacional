-- ============================================================
-- FIX RLS & PERFORMANCE: Cuentas por Pagar (CXP) y Nómina
-- Fecha: 2026-09-18
-- ============================================================

-- 1. Políticas CXP (Acceso unificado y alta velocidad)
DROP POLICY IF EXISTS "suplidores_tenant_access" ON public.suplidores;
DROP POLICY IF EXISTS "suplidores_all" ON public.suplidores;
CREATE POLICY "suplidores_all" ON public.suplidores
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "facturas_cxp_tenant_access" ON public.facturas_cxp;
DROP POLICY IF EXISTS "facturas_cxp_all" ON public.facturas_cxp;
CREATE POLICY "facturas_cxp_all" ON public.facturas_cxp
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "abonos_cxp_tenant_access" ON public.abonos_cxp;
DROP POLICY IF EXISTS "abonos_cxp_all" ON public.abonos_cxp;
CREATE POLICY "abonos_cxp_all" ON public.abonos_cxp
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- 2. Políticas Nómina (Acceso unificado y alta velocidad)
DROP POLICY IF EXISTS "periodos_nomina_tenant_access" ON public.periodos_nomina;
DROP POLICY IF EXISTS "periodos_nomina_all" ON public.periodos_nomina;
CREATE POLICY "periodos_nomina_all" ON public.periodos_nomina
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "anticipos_nomina_tenant_access" ON public.anticipos_nomina;
DROP POLICY IF EXISTS "anticipos_nomina_all" ON public.anticipos_nomina;
CREATE POLICY "anticipos_nomina_all" ON public.anticipos_nomina
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "detalles_nomina_tenant_access" ON public.detalles_nomina;
DROP POLICY IF EXISTS "detalles_nomina_all" ON public.detalles_nomina;
CREATE POLICY "detalles_nomina_all" ON public.detalles_nomina
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- 3. Recargar schema cache de PostgREST
NOTIFY pgrst, 'reload schema';
