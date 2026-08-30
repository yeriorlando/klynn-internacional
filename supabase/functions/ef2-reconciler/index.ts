import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EF2_BASE_URL = "https://master.ef2.do/api2";
const MAX_DOCUMENTS_PER_RUN = 100;

type FiscalStatus = "accepted" | "rejected" | "pending";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function statusFromAudit(item: any): FiscalStatus {
  const dgii = item?.dgii || item?.DGII || {};
  const value = String(
    dgii.estado || dgii.status || item?.estado_factura || item?.estado_dgii || item?.estado || item?.status || "",
  ).toLowerCase();
  if (/rechaz|error/.test(value)) return "rejected";
  if (/acept|aprob|procesad/.test(value)) return "accepted";
  return "pending";
}

function auditItem(response: any) {
  if (Array.isArray(response?.data)) return response.data[0];
  return response?.facturas?.[0] || response?.data || response;
}

async function auditEF2(encf: string, token: string, amount: number) {
  const query = new URLSearchParams({ encf, monto_esperado: String(amount), incluir_notas: "true" });
  const response = await fetch(`${EF2_BASE_URL}/auditoria_factura.php?${query}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || payload?.error || `EF2 respondió ${response.status}.`);
  }
  return auditItem(payload);
}

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const expectedSecret = Deno.env.get("EF2_RECONCILER_CRON_SECRET");
  if (!expectedSecret || req.headers.get("x-cron-secret") !== expectedSecret) {
    return json({ error: "No autorizado" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_KEY");
  if (!supabaseUrl || !serviceRole) return json({ error: "Configuración interna incompleta" }, 500);

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // La emisión puede alcanzar a EF2 y quedar ACCEPTED antes de que la
    // escritura final de la orden llegue al servidor. Reparamos ese desfase
    // reciente sin volver a enviar ni consultar facturas ya terminales.
    const recentSince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: terminalDocuments, error: terminalError } = await admin
      .from("ecf_documents")
      .select("id,order_id,encf,status")
      .eq("provider", "ef2")
      .in("status", ["accepted", "rejected"])
      .gte("created_at", recentSince)
      .limit(MAX_DOCUMENTS_PER_RUN);
    if (terminalError) throw terminalError;

    let repairedOrders = 0;
    for (const document of terminalDocuments || []) {
      if (!document.order_id) continue;
      const ecfStatus = document.status === "accepted" ? "ACCEPTED" : "REJECTED";
      const { error: orderRepairError } = await admin
        .from("ordenes")
        .update({ ecf_id: document.id, ecf_status: ecfStatus, ncf: document.encf })
        .eq("id", document.order_id)
        .neq("ecf_status", ecfStatus);
      if (orderRepairError) throw orderRepairError;
      repairedOrders += 1;
    }

    const { data: pending, error } = await admin
      .from("ecf_documents")
      .select("id,tenant_id,order_id,encf,monto_total,track_id,dgii_response")
      .eq("provider", "ef2")
      .eq("status", "pending")
      .order("fecha_emision", { ascending: true })
      .limit(MAX_DOCUMENTS_PER_RUN);
    if (error) throw error;

    let accepted = 0;
    let rejected = 0;
    let stillPending = 0;
    const failures: Array<{ encf: string; message: string }> = [];

    for (const document of pending || []) {
      try {
        const { data: credential, error: credentialError } = await admin
          .from("ecf_provider_credentials")
          .select("secret")
          .eq("tenant_id", document.tenant_id)
          .eq("provider", "ef2")
          .maybeSingle();
        if (credentialError || !credential?.secret) {
          throw new Error("No hay credencial EF2 de servidor para esta lavandería.");
        }

        const item = await auditEF2(document.encf, credential.secret, Number(document.monto_total || 0));
        const status = statusFromAudit(item);
        if (status === "pending") {
          stillPending += 1;
          continue;
        }

        const dgii = item?.dgii || item?.DGII || {};
        const documents = item?.documentos || {};
        const qr = documents.timbre_qr || documents.qr || documents.qr_link;
        const securityCode = item?.codigo_seguridad || dgii.codigo_seguridad;
        const signatureDate = item?.fecha_firma_digital || dgii.fecha_recepcion;
        const providerDocumentId = item?.id_factura_ef2 || item?.id_factura;
        const responsePayload = {
          ...item,
          klynnContext: { provider: "ef2", reconciled_at: new Date().toISOString() },
        };

        const { error: documentError } = await admin
          .from("ecf_documents")
          .update({
            status,
            track_id: dgii.track_id || document.track_id,
            dgii_response: responsePayload,
            qr_content: status === "accepted" ? qr || null : null,
            provider_document_id: providerDocumentId ? String(providerDocumentId) : null,
          })
          .eq("id", document.id);
        if (documentError) throw documentError;

        if (document.order_id) {
          const orderUpdate: Record<string, unknown> = {
            ecf_id: document.id,
            ecf_status: status === "accepted" ? "ACCEPTED" : "REJECTED",
            ncf: document.encf,
          };
          if (status === "accepted") {
            orderUpdate.ecf_qr = qr || null;
            orderUpdate.ecf_security_code = securityCode || null;
            orderUpdate.ecf_signature_date = signatureDate || null;
          }
          const { error: orderError } = await admin.from("ordenes").update(orderUpdate).eq("id", document.order_id);
          if (orderError) throw orderError;
        }

        if (status === "accepted") accepted += 1;
        else rejected += 1;
      } catch (error) {
        failures.push({
          encf: document.encf,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return json({
      processed: (pending || []).length,
      repaired_orders: repairedOrders,
      accepted,
      rejected,
      still_pending: stillPending,
      failures,
    });
  } catch (error) {
    console.error("[ef2-reconciler]", error);
    return json({ error: error instanceof Error ? error.message : "Error inesperado" }, 500);
  }
});
