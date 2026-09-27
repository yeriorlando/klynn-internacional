-- ==============================================================================
-- MIGRACIÓN: Soporte Multipaís e Internacionalización (Klynn Cloud)
-- Agrega columnas de localización a la tabla 'tenants' para soportar:
-- DO (Rep. Dominicana), MX (México), CO (Colombia), PA (Panamá), CR (Costa Rica),
-- PE (Perú), CL (Chile), EC (Ecuador), ES (España), GT (Guatemala),
-- HN (Honduras), SV (El Salvador), UY (Uruguay)
-- ==============================================================================

-- 1. Agregar columnas de localización a 'tenants' con valores por defecto (compatibles con DO existente)
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS pais_codigo text DEFAULT 'DO',
  ADD COLUMN IF NOT EXISTS moneda_simbolo text DEFAULT 'RD$',
  ADD COLUMN IF NOT EXISTS moneda_codigo text DEFAULT 'DOP',
  ADD COLUMN IF NOT EXISTS impuesto_nombre text DEFAULT 'ITBIS',
  ADD COLUMN IF NOT EXISTS impuesto_porcentaje numeric(5,2) DEFAULT 18.00,
  ADD COLUMN IF NOT EXISTS documento_fiscal_label text DEFAULT 'RNC / Cédula';

-- 2. Retrocompatibilidad: Asegurar que registros existentes no tengan NULL
UPDATE public.tenants
SET
  pais_codigo = COALESCE(pais_codigo, 'DO'),
  moneda_simbolo = COALESCE(moneda_simbolo, 'RD$'),
  moneda_codigo = COALESCE(moneda_codigo, 'DOP'),
  impuesto_nombre = COALESCE(impuesto_nombre, 'ITBIS'),
  impuesto_porcentaje = COALESCE(impuesto_porcentaje, 18.00),
  documento_fiscal_label = COALESCE(documento_fiscal_label, 'RNC / Cédula')
WHERE pais_codigo IS NULL 
   OR moneda_simbolo IS NULL 
   OR moneda_codigo IS NULL;

-- 3. Crear índice para optimizar búsquedas y filtrados de Superadmin por país
CREATE INDEX IF NOT EXISTS idx_tenants_pais_codigo ON public.tenants (pais_codigo);

-- 4. Comentarios descriptivos en el catálogo de PostgreSQL
COMMENT ON COLUMN public.tenants.pais_codigo IS 'Código ISO 3166-1 alfa-2 del país (DO, MX, CO, etc.)';
COMMENT ON COLUMN public.tenants.moneda_simbolo IS 'Símbolo monetario utilizado (RD$, $, S/, €, Q, L, etc.)';
COMMENT ON COLUMN public.tenants.moneda_codigo IS 'Código ISO 4217 de la moneda (DOP, MXN, COP, USD, EUR, etc.)';
COMMENT ON COLUMN public.tenants.impuesto_nombre IS 'Nombre del impuesto comercial principal (ITBIS, IVA, IGV, ISV, ITBMS)';
COMMENT ON COLUMN public.tenants.impuesto_porcentaje IS 'Tasa porcentual por defecto del impuesto comercial';
COMMENT ON COLUMN public.tenants.documento_fiscal_label IS 'Nombre del documento de identificación fiscal (RNC, RFC, NIT, RUT, CIF, etc.)';
