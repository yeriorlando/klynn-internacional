-- Los primeros comprobantes EF2 se guardaron antes de persistir el proveedor.
-- Esta corrección se limita a documentos cuyo propio contexto fiscal identifica EF2.
UPDATE public.ecf_documents
SET provider = 'ef2'
WHERE provider IS NULL
  AND dgii_response -> 'klynnContext' ->> 'provider' = 'ef2';

-- Corrige exclusivamente el indicador fiscal de las órdenes vinculadas a
-- documentos EF2 que ya tienen una respuesta terminal de DGII.
UPDATE public.ordenes AS orden
SET
  ecf_status = CASE documento.status
    WHEN 'accepted' THEN 'ACCEPTED'
    WHEN 'rejected' THEN 'REJECTED'
    ELSE orden.ecf_status
  END,
  ncf = COALESCE(documento.encf, orden.ncf)
FROM public.ecf_documents AS documento
WHERE documento.order_id = orden.id
  AND documento.provider = 'ef2'
  AND documento.status IN ('accepted', 'rejected')
  AND orden.ecf_status IS DISTINCT FROM CASE documento.status
    WHEN 'accepted' THEN 'ACCEPTED'
    WHEN 'rejected' THEN 'REJECTED'
  END;
