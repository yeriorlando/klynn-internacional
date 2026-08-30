-- Reconciliación automática EF2: índice exclusivo para los e-CF pendientes.
-- No altera ni elimina tablas, datos, flujos ni metadatos de Pronesoft.
CREATE INDEX IF NOT EXISTS idx_ecf_documents_ef2_pending_reconciliation
  ON public.ecf_documents (fecha_emision ASC)
  WHERE provider = 'ef2' AND status = 'pending';

COMMENT ON INDEX public.idx_ecf_documents_ef2_pending_reconciliation IS
  'Usado por ef2-reconciler para consultar en EF2/DGII únicamente comprobantes EF2 pendientes.';
