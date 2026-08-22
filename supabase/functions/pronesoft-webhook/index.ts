import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const jsonHeaders = { 'Content-Type': 'application/json' };

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function verifySignature(req: Request, rawBody: string): Promise<boolean> {
  const secret = Deno.env.get('PRONESOFT_WEBHOOK_SECRET');
  // Fail closed: never accept unauthenticated fiscal status updates.
  if (!secret) return false;
  const received = req.headers.get('x-pronesoft-signature') || req.headers.get('x-webhook-signature');
  if (!received) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody)));
  return received.replace(/^sha256=/i, '').toLowerCase() === signature;
}

function mapDocumentStatus(status?: string, legalStatus?: string) {
  if (legalStatus === 'ACCEPTED') return 'accepted';
  if (legalStatus === 'ACCEPTED_WITH_OBSERVATIONS') return 'accepted_with_reservations';
  if (legalStatus === 'REJECTED' || status === 'ERROR') return 'rejected';
  return 'pending';
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  try {
    const rawBody = await req.text();
    if (!(await verifySignature(req, rawBody))) return new Response('Invalid webhook signature', { status: 401 });
    const payload = JSON.parse(rawBody);
    const { event, data } = payload;
    if (!event || !data) return new Response('Invalid payload', { status: 400 });

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const internalId = data.documentId || data.id;
    const trackId = data.trackId;
    const encf = data.encf || data.eNcf;
    const status = data.status || (event === 'document.status_changed' ? undefined : event);
    const legalStatus = data.legalStatus || (event === 'DOCUMENT_ACCEPTED' ? 'ACCEPTED' : event === 'DOCUMENT_REJECTED' ? 'REJECTED' : undefined);

    if (event === 'document.received' || event === 'RECEIVED_DOCUMENT') {
      const buyerRnc = String(data.buyerRnc || data.buyer?.taxId || '').replace(/\D/g, '');
      if (buyerRnc) {
        const { data: config } = await supabase.from('ecf_config').select('tenant_id').eq('rnc_emisor', buyerRnc).eq('is_active', true).maybeSingle();
        if (config) {
          await supabase.from('ecf_documentos_recibidos').upsert({
            id: data.id || crypto.randomUUID(), tenant_id: config.tenant_id, pronesoft_id: internalId || trackId || null,
            encf: encf || '', rnc_emisor: data.issuerRnc || data.sellerRnc || '', nombre_emisor: data.issuerName || data.sellerName || null,
            tipo_ecf: data.documentType || data.type || String(encf || '').slice(0, 3), fecha_emision: data.issueDate || new Date().toISOString(),
            monto_total: data.totalAmount || data.totals?.totalAmount || 0, monto_itbis: data.totalItbis || data.totals?.totalITBIS || 0,
            estado_comercial: data.commercialStatus || 'PENDIENTE', pdf_url: data.pdfUrl || data.fileUrl || null,
          }, { onConflict: 'id' });
        }
      }
      return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders });
    }

    let query = supabase.from('ecf_documents').select('id, tenant_id, order_id, encf, track_id, pronesoft_id').limit(1);
    if (internalId) query = query.eq('pronesoft_id', internalId);
    else if (trackId) query = query.eq('track_id', trackId);
    else if (encf) query = query.eq('encf', encf);
    else return new Response('Document identifier required', { status: 400 });
    const { data: docs, error } = await query;
    if (error) throw error;
    const document = docs?.[0];
    if (!document) return new Response(JSON.stringify({ ok: true, ignored: true }), { headers: jsonHeaders });

    const documentStatus = mapDocumentStatus(status, legalStatus);
    await supabase.from('ecf_documents').update({
      status: documentStatus, legal_status: legalStatus || null,
      dgii_response: data, qr_content: data.documentStampUrl || null,
    }).eq('id', document.id);
    if (document.order_id) {
      const orderStatus = legalStatus === 'ACCEPTED' ? 'ACCEPTED' : legalStatus === 'ACCEPTED_WITH_OBSERVATIONS' ? 'ACCEPTED_WITH_OBSERVATIONS' : legalStatus === 'REJECTED' ? 'REJECTED' : status || 'REGISTERED';
      await supabase.from('ordenes').update({ ecf_status: orderStatus }).eq('id', document.order_id);
    }
    return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders });
  } catch (error) {
    console.error('[pronesoft-webhook]', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { headers: jsonHeaders, status: 500 });
  }
});
