-- Conserva por separado los metadatos de la factura original y de la E34.
-- Una Nota de Crédito es un e-CF independiente con e-NCF, QR, firma y código
-- de seguridad propios; no debe reutilizar el timbre de la factura modificada.
ALTER TABLE public.ordenes
  ADD COLUMN IF NOT EXISTS nota_credito_anula_totalmente BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nota_credito_qr TEXT,
  ADD COLUMN IF NOT EXISTS nota_credito_codigo_seguridad TEXT,
  ADD COLUMN IF NOT EXISTS nota_credito_fecha_firma TEXT,
  ADD COLUMN IF NOT EXISTS nota_credito_fecha_emision TEXT,
  ADD COLUMN IF NOT EXISTS nota_credito_estado TEXT,
  ADD COLUMN IF NOT EXISTS nota_credito_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS nota_credito_xml_url TEXT;

ALTER TABLE public.ordenes
  ADD COLUMN IF NOT EXISTS nota_debito_qr TEXT,
  ADD COLUMN IF NOT EXISTS nota_debito_codigo_seguridad TEXT,
  ADD COLUMN IF NOT EXISTS nota_debito_fecha_firma TEXT,
  ADD COLUMN IF NOT EXISTS nota_debito_fecha_emision TEXT,
  ADD COLUMN IF NOT EXISTS nota_debito_estado TEXT,
  ADD COLUMN IF NOT EXISTS nota_debito_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS nota_debito_xml_url TEXT;

COMMENT ON COLUMN public.ordenes.nota_credito_qr IS
  'URL/timbre QR devuelto por EF2 para la Nota de Crédito E34.';
COMMENT ON COLUMN public.ordenes.nota_credito_codigo_seguridad IS
  'Código de seguridad DGII propio de la Nota de Crédito E34.';
