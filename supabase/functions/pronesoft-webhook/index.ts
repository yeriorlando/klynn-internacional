import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Service role for bypass RLS
    );

    const payload = await req.json();
    console.log("[pronesoft-webhook] 📥 Payload recibido:", JSON.stringify(payload));

    const { event, data } = payload;
    
    // Pronesoft webhook payload example:
    // event: "DOCUMENT_ACCEPTED", "DOCUMENT_REJECTED", "RECEIVED_DOCUMENT"
    // data: { documentId: "...", trackId: "...", rnc: "...", encf: "...", environment: "...", ... }

    if (!event || !data) {
      return new Response("Invalid payload", { status: 400 });
    }

    const { documentId, trackId, encf, status } = data;
    let tenantId = null;

    if (event === 'DOCUMENT_ACCEPTED' || event === 'DOCUMENT_REJECTED') {
      // 1. Encontrar la factura local usando trackId (o encf/documentId)
      const { data: ecfDoc, error: ecfErr } = await supabaseClient
        .from('ecf_documentos')
        .select('id, tenant_id, e_ncf, track_id')
        .eq('track_id', trackId || '') // Si no hay trackId, probar con document_id si lo guardamos
        .single();
      
      let docToUpdate = ecfDoc;

      // Intentar buscar por e_ncf si no hay track_id match
      if (!docToUpdate && encf) {
        const { data: ecfByEncf } = await supabaseClient
          .from('ecf_documentos')
          .select('id, tenant_id, e_ncf, track_id')
          .eq('e_ncf', encf)
          .single();
        docToUpdate = ecfByEncf;
      }

      if (docToUpdate) {
        tenantId = docToUpdate.tenant_id;
        const newStatus = event === 'DOCUMENT_ACCEPTED' ? 'Aprobado' : 'Rechazado';
        
        // 2. Actualizar estado
        await supabaseClient
          .from('ecf_documentos')
          .update({ estado_dgii: newStatus, error_dgii: data.errorDetails || null })
          .eq('id', docToUpdate.id);

        console.log(`[pronesoft-webhook] ✅ Documento ${docToUpdate.id} actualizado a ${newStatus}`);

        // 3. Crear notificación
        await supabaseClient.from('notificaciones').insert({
          tenant_id: tenantId,
          titulo: `Comprobante ${newStatus}`,
          mensaje: `El e-CF ${docToUpdate.e_ncf || 'enviado'} ha sido ${newStatus.toLowerCase()} por la DGII.`,
          tipo: newStatus === 'Aprobado' ? 'SUCCESS' : 'ERROR',
          link: '/reportes' // o /ordenes
        });
      }
    } else if (event === 'RECEIVED_DOCUMENT') {
      // Evento cuando recibimos una factura de proveedor
      // Como buscar el tenant? Por el RNC comprador
      const rncComprador = data.buyerRnc;
      
      if (rncComprador) {
        const { data: config } = await supabaseClient
          .from('ecf_configuracion')
          .select('tenant_id')
          .eq('is_active', true)
          // Asumiendo que podemos deducir el tenant_id si guardáramos el RNC en tenant.
          // Por simplicidad, si la lavandería recibe, es una notificación.
          // *Nota: esto requiere tener el rnc en ecf_configuracion o tenant. 
          // Si no, podríamos insertar la factura y la próxima vez que el usuario entre a /gastos se sincroniza.
          .limit(1)
          .single();
        
        if (config) {
          tenantId = config.tenant_id;
          await supabaseClient.from('notificaciones').insert({
            tenant_id: tenantId,
            titulo: `Nueva Factura Recibida`,
            mensaje: `Has recibido un e-CF de tu proveedor ${data.sellerName || 'desconocido'}.`,
            tipo: 'INFO',
            link: '/gastos'
          });
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error("[pronesoft-webhook] ❌ Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
