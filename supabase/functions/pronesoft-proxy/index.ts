import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { IntegrationClient, Environment } from "npm:@pronesoft-rd/ecf-sdk@0.0.9";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tenant-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function validateElectronicDocument(payload: any) {
  if (!payload || typeof payload !== "object") throw new Error("Payload e-CF inválido.");
  if (!Array.isArray(payload.paymentForms) || payload.paymentForms.length === 0) {
    throw new Error("paymentForms es obligatorio y debe contener la forma de pago real.");
  }
  const total = Number(payload.totals?.totalAmount);
  if (!Number.isFinite(total) || total <= 0)
    throw new Error("totals.totalAmount debe ser un monto positivo.");
  const paid = payload.paymentForms.reduce((sum: number, form: any) => {
    if (!["1", "2", "3", "4", "5"].includes(String(form?.method))) {
      throw new Error(
        "paymentForms.method debe ser 1 (efectivo), 2 (cheque), 3 (tarjeta), 4 (crédito) o 5 (transferencia).",
      );
    }
    const amount = Number(form?.amount);
    if (!Number.isFinite(amount) || amount <= 0)
      throw new Error("Cada paymentForms.amount debe ser mayor que cero.");
    return sum + amount;
  }, 0);
  if (Math.abs(Math.round((paid - total) * 100)) > 0) {
    throw new Error("La suma de paymentForms debe coincidir exactamente con totals.totalAmount.");
  }
}

type PronesoftEnvironmentName = "TesteCF" | "CerteCF" | "eCF";

function normalizeEnvironment(value: unknown): PronesoftEnvironmentName {
  return value === "CerteCF" || value === "eCF" ? value : "TesteCF";
}

async function resolveEnvironment(config: any): Promise<PronesoftEnvironmentName> {
  const requested = normalizeEnvironment(config?.ecfEnv);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_KEY");
  if (!supabaseUrl || !serviceKey) return requested;

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  try {
    const globalResponse = await fetch(
      `${supabaseUrl}/rest/v1/global_config?id=eq.1&select=fiscal_environment_policy`,
      { headers },
    );
    if (globalResponse.ok) {
      const [globalConfig] = await globalResponse.json();
      const policy = globalConfig?.fiscal_environment_policy;
      if (policy === "TesteCF" || policy === "CerteCF" || policy === "eCF") return policy;
    }

    const filter = config?.klynnTenantId
      ? `tenant_id=eq.${encodeURIComponent(config.klynnTenantId)}`
      : config?.tenantId
        ? `pronesoft_tenant_id=eq.${encodeURIComponent(config.tenantId)}`
        : "";
    if (!filter) return requested;

    const tenantResponse = await fetch(
      `${supabaseUrl}/rest/v1/ecf_config?${filter}&select=pronesoft_environment,ambiente&limit=1`,
      { headers },
    );
    if (!tenantResponse.ok) return requested;
    const [tenantConfig] = await tenantResponse.json();
    if (tenantConfig?.pronesoft_environment)
      return normalizeEnvironment(tenantConfig.pronesoft_environment);
    return tenantConfig?.ambiente === "produccion" ? "eCF" : requested;
  } catch (error) {
    console.warn(
      "[pronesoft-proxy] No se pudo resolver la política de ambiente; se usará el ambiente solicitado.",
      error,
    );
    return requested;
  }
}

type IdempotencyReceipt = {
  status: "processing" | "completed" | "unknown";
  response?: any;
  error_message?: string;
};

function serviceRestConfig() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_KEY");
  if (!url || !key)
    throw new Error(
      "No se puede garantizar idempotencia fiscal: faltan credenciales internas de Supabase.",
    );
  return {
    url,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  };
}

async function reserveFiscalSubmission(
  tenantId: string,
  idempotencyKey: string,
): Promise<{ reserved: boolean; receipt?: IdempotencyReceipt }> {
  const { url, headers } = serviceRestConfig();
  const insert = await fetch(
    `${url}/rest/v1/ecf_submission_idempotency?on_conflict=tenant_id,idempotency_key`,
    {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify({
        tenant_id: tenantId,
        idempotency_key: idempotencyKey,
        status: "processing",
      }),
    },
  );
  if (!insert.ok)
    throw new Error(
      `No se pudo reservar la emisión fiscal (${insert.status}). Aplica la migración de idempotencia antes de desplegar.`,
    );
  const inserted = await insert.json();
  if (Array.isArray(inserted) && inserted.length > 0) return { reserved: true };

  const existingResponse = await fetch(
    `${url}/rest/v1/ecf_submission_idempotency?tenant_id=eq.${encodeURIComponent(tenantId)}&idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&select=status,response,error_message&limit=1`,
    { headers },
  );
  if (!existingResponse.ok)
    throw new Error("No se pudo consultar el recibo idempotente de la emisión.");
  const [receipt] = await existingResponse.json();
  return { reserved: false, receipt };
}

async function finishFiscalSubmission(
  tenantId: string,
  idempotencyKey: string,
  status: "completed" | "unknown",
  response?: any,
  errorMessage?: string,
) {
  const { url, headers } = serviceRestConfig();
  const result = await fetch(
    `${url}/rest/v1/ecf_submission_idempotency?tenant_id=eq.${encodeURIComponent(tenantId)}&idempotency_key=eq.${encodeURIComponent(idempotencyKey)}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        status,
        response: response || null,
        error_message: errorMessage || null,
        updated_at: new Date().toISOString(),
      }),
    },
  );
  if (!result.ok)
    throw new Error(`No se pudo persistir el recibo de emisión fiscal (${result.status}).`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    const { action, payload, config: requestConfig } = await req.json();
    const config = requestConfig || {};

    // Acción pública de consulta RNC (Microservicio)
    if (action === "get-rnc") {
      const rncRes = await fetch(`https://dgii-rnc.pronesoft.com/get/${payload.rnc}`);
      const data = await rncRes.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Configuración base
    const ecfEnv = await resolveEnvironment(config);
    const usesSandboxCredentials = ecfEnv === "TesteCF" || ecfEnv === "CerteCF";
    const baseUrl = usesSandboxCredentials
      ? "https://api.ecf.sandbox.pronesoft.com/api/v1"
      : "https://api.ecf.pronesoft.com/api/v1";
    const clientId = usesSandboxCredentials
      ? Deno.env.get("PRONESOFT_SANDBOX_CLIENT_ID") || Deno.env.get("PRONESOFT_CLIENT_ID")
      : Deno.env.get("PRONESOFT_PRODUCTION_CLIENT_ID") || Deno.env.get("PRONESOFT_CLIENT_ID");
    const clientSecret = usesSandboxCredentials
      ? Deno.env.get("PRONESOFT_SANDBOX_CLIENT_SECRET") || Deno.env.get("PRONESOFT_CLIENT_SECRET")
      : Deno.env.get("PRONESOFT_PRODUCTION_CLIENT_SECRET") ||
        Deno.env.get("PRONESOFT_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      const prefix = usesSandboxCredentials ? "PRONESOFT_SANDBOX" : "PRONESOFT_PRODUCTION";
      throw new Error(
        `Faltan los secretos ${prefix}_CLIENT_ID y ${prefix}_CLIENT_SECRET (o PRONESOFT_CLIENT_ID y PRONESOFT_CLIENT_SECRET) en la Edge Function.`,
      );
    }

    console.log(
      `[pronesoft-proxy] Inicializando IntegrationClient SDK en ${ecfEnv} con credenciales de servidor.`,
    );

    // Inicializar el SDK oficial
    const sdk = new IntegrationClient({
      baseUrl,
      clientId,
      clientSecret,
    });

    // Si hay tenantId para delegación multicompañía, obtenemos el cliente scoped
    const client = config.tenantId ? sdk.forTenant(config.tenantId) : sdk;

    // Convertir el string del ambiente al enum correspondiente de Pronesoft SDK
    const environmentValue =
      ecfEnv === "TesteCF"
        ? Environment.TesteCf
        : ecfEnv === "CerteCF"
          ? Environment.CerteCf
          : Environment.ECf;

    let result;

    if (action === "submit") {
      const idempotencyKey = String(payload?._klynnIdempotencyKey || "");
      delete payload._klynnIdempotencyKey;
      const klynnTenantId = String(config.klynnTenantId || "");
      if (!idempotencyKey || !klynnTenantId)
        throw new Error("La emisión fiscal requiere tenant e idempotency key.");
      const reservation = await reserveFiscalSubmission(klynnTenantId, idempotencyKey);
      if (!reservation.reserved) {
        if (reservation.receipt?.status === "completed" && reservation.receipt.response) {
          result = reservation.receipt.response;
          console.log(
            "[pronesoft-proxy] Reutilizando recibo idempotente de una emisión completada.",
          );
        } else {
          throw new Error(
            "La emisión ya fue iniciada y su resultado requiere reconciliación; no se reenviará automáticamente.",
          );
        }
      }

      if (result) {
        // El recibo durable ya contiene la respuesta autoritativa.
      } else {
        validateElectronicDocument(payload);
        console.log("[pronesoft-proxy] 📤 Enviando eCF a DGII con el SDK...");

        // Convertir issueDate a Date object porque el SDK espera Date y nosotros recibimos string en el JSON
        if (payload.issueDate) {
          payload.issueDate = new Date(payload.issueDate);
        }

        // Convertir referenceInfo.modifiedInvoiceDate a Date object para Notas de Crédito/Débito
        if (payload.referenceInfo?.modifiedInvoiceDate) {
          payload.referenceInfo.modifiedInvoiceDate = new Date(
            payload.referenceInfo.modifiedInvoiceDate,
          );
        }

        try {
          result = await client.ecfSubmission.submitEcf({
            environment: environmentValue,
            electronicDocument: payload,
          });
          await finishFiscalSubmission(klynnTenantId, idempotencyKey, "completed", result);
        } catch (submitError: any) {
          await finishFiscalSubmission(
            klynnTenantId,
            idempotencyKey,
            "unknown",
            undefined,
            submitError?.message || "Resultado fiscal desconocido",
          );
          throw submitError;
        }

        console.log("[pronesoft-proxy] ✅ eCF emitido con éxito");
      }
    } else if (action === "status") {
      console.log("[pronesoft-proxy] 🔍 Consultando estado del documento con el SDK...");

      result = await client.ecfSubmission.getEcfStatus({
        environment: environmentValue,
        id: payload.documentId,
      });
    } else if (action === "register-company") {
      console.log("[pronesoft-proxy] 🏢 Registrando empresa asociada con el SDK...");
      if (!payload?.rnc || !payload?.name)
        throw new Error("rnc y name son obligatorios para registrar una empresa.");

      const printerTypeValue = "thermal_80"; // A4, thermal_80, thermal_58
      const accountKey = String(config.klynnTenantId || payload.rnc)
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();
      const generatedPassword = `K!${crypto.randomUUID().replace(/-/g, "")}a1`;

      const res = await sdk.associatedCompanies.createAssociatedCompany({
        email: payload.email || `ecf-${accountKey}@klynn.com.do`,
        password: payload.password || generatedPassword,
        name: payload.name,
        rnc: payload.rnc,
        phone: payload.phone || "8090000000",
        address: payload.address || "República Dominicana",
        city: payload.city || "Santo Domingo",
        country: payload.country || "DO",
        printerType: printerTypeValue as any,
      });

      result = res.business || res;
    } else if (action === "upload-cert") {
      console.log("[pronesoft-proxy] 🔑 Subiendo certificado digital con el SDK...");

      const binaryString = atob(payload.certificate);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/x-pkcs12" });

      const res = await client.digitalCertificates.uploadCertificate({
        rnc: payload.rnc,
        file: blob,
        password: payload.password,
      });

      result = { ok: true, ...res };
    } else if (action === "import-sequences") {
      throw new Error(
        "El SDK oficial 0.0.9 no ofrece importación masiva de secuencias. Registra cada rango autorizado con Crear secuencia.",
      );
    } else if (action === "list-associated-companies") {
      console.log("[pronesoft-proxy] 🏢 Listando empresas asociadas...");
      result = await sdk.associatedCompanies.listAssociatedCompanies({
        page: payload?.page || 1,
        limit: payload?.limit || 50,
      });
    } else if (action === "delete-associated-company") {
      if (!payload?.companyId)
        throw new Error("companyId es obligatorio para eliminar una empresa asociada.");
      result = await sdk.associatedCompanies.deleteAssociatedCompany({
        companyId: payload.companyId,
      });
    } else if (action === "list-sequences") {
      console.log("[pronesoft-proxy] 📋 Listando secuencias fiscales con el SDK...");
      const res = await client.taxSequences.listTaxSequences({
        type: payload.type as any,
        environment: environmentValue,
        page: payload.page || 1,
        limit: payload.limit || 50,
      });
      result = res;
    } else if (action === "create-sequence") {
      console.log("[pronesoft-proxy] ➕ Creando secuencia fiscal con el SDK...");
      const expDate = payload.expiration
        ? new Date(payload.expiration)
        : new Date(Date.now() + 365 * 86400000);
      const res = await client.taxSequences.createTaxSequence({
        createTaxSequenceRequest: {
          type: payload.type as any,
          from: Number(payload.from),
          to: Number(payload.to),
          quantity: Number(payload.quantity || payload.to - payload.from + 1),
          expiration: expDate,
          environment: environmentValue,
        },
      });
      result = res;
    } else if (action === "get-next-number") {
      console.log("[pronesoft-proxy] 🔢 Obteniendo siguiente número de secuencia con el SDK...");
      const res = await client.taxSequences.getNextNumber({
        type: payload.type as any,
        environment: environmentValue,
      });
      result = res;
    } else if (action === "void-sequences") {
      console.log("[pronesoft-proxy] 🗑️ Anulando secuencia con el SDK...");

      const { sequenceId, invoiceType, type, startNumber, endNumber, reason } = payload;
      const targetType = type || invoiceType;
      let targetSeqId = sequenceId;

      if (!targetSeqId) {
        throw new Error(
          "sequenceId es obligatorio para anular un rango e-NCF. Sin él no se puede garantizar la secuencia correcta.",
        );
      }

      if (!targetSeqId && targetType) {
        try {
          const sequencesRes = await client.taxSequences.listTaxSequences({
            environment: environmentValue,
          });
          const listData = (sequencesRes as any)?.data || sequencesRes;
          if (Array.isArray(listData)) {
            const found = listData.find(
              (s: any) =>
                s.invoiceType === targetType ||
                s.invoiceType === `E${targetType.replace(/^E/, "")}` ||
                s.type === targetType,
            );
            if (found && found.id) targetSeqId = found.id;
          }
        } catch (e) {
          console.warn(
            "[pronesoft-proxy] Advertencia al buscar ID de secuencia para anulación:",
            e,
          );
        }
      }

      if (!targetSeqId) {
        throw new Error(`No se encontró una secuencia activa para ${targetType} en Pronesoft`);
      }

      const res = await client.taxSequences.voidTaxSequence({
        voidTaxSequenceRequest: {
          sequenceId: targetSeqId,
          startNumber,
          endNumber,
          reason,
        },
      });

      result = res;
    } else if (action === "test-connection") {
      console.log("[pronesoft-proxy] ⚡ Probando conexión y autenticación con el SDK...");
      // Una lectura mínima fuerza OAuth dentro del SDK sin acceder a métodos privados.
      await sdk.associatedCompanies.listAssociatedCompanies({ page: 1, limit: 1 });
      result = {
        ok: true,
        message: "Conexión estable y autenticación SDK verificada",
        environment: ecfEnv,
        sdkVersion: "0.0.9",
      };
    } else if (action === "list-sent-documents") {
      console.log("[pronesoft-proxy] 📤 Listando documentos enviados con el SDK...");
      result = await client.documentsSent.listSentDocuments({
        env: environmentValue,
        page: payload?.page || 1,
        limit: payload?.pageSize || 50,
        type: payload?.type,
      });
    } else if (action === "get-sent-document") {
      if (!payload?.documentId)
        throw new Error("documentId es obligatorio para consultar el detalle del e-CF.");
      result = await client.documentsSent.getSentDocumentById({
        id: payload.documentId,
      });
    } else if (action === "get-sent-document-logs") {
      if (!payload?.documentId)
        throw new Error("documentId es obligatorio para consultar los logs del e-CF.");
      result = await client.documentsSent.getSentDocumentLogs({
        id: payload.documentId,
      });
    } else if (action === "list-received-documents") {
      console.log("[pronesoft-proxy] 📥 Listando documentos recibidos con el SDK...");
      try {
        result = await client.documentsReceived.listReceivedDocuments({
          page: payload.page || 1,
          limit: payload.pageSize || 50,
        });
      } catch (receivedError: any) {
        // El SDK 0.0.9 falla intermitentemente en esta lectura con un error
        // genÃ©rico de interceptor. No debe convertir una emisiÃ³n exitosa en 502.
        console.warn(
          "[pronesoft-proxy] No se pudieron listar recibidos:",
          receivedError?.message || receivedError,
        );
        result = {
          data: [],
          total: 0,
          warning: "Pronesoft no pudo listar temporalmente los documentos recibidos.",
        };
      }
    } else if (action === "commercial-approval") {
      throw new Error(
        "El SDK oficial 0.0.9 permite consultar aprobaciones comerciales, pero no expone una operación para enviarlas.",
      );
    } else if (action === "list-webhooks") {
      if (!payload?.rnc) throw new Error("rnc es obligatorio para listar webhooks.");
      result = await client.webhooks.listWebhooks({ rnc: payload.rnc });
    } else if (action === "webhook-stats") {
      if (!payload?.rnc || !payload?.webhookId)
        throw new Error("rnc y webhookId son obligatorios.");
      result = await client.webhooks.getWebhookStats({
        rnc: payload.rnc,
        webhookId: payload.webhookId,
        period: payload.period || "all",
      });
    } else if (action === "export-606") {
      console.log("[pronesoft-proxy] 📊 Exportando reporte 606...");
      const period = payload.period;
      const year = parseInt(period.substring(0, 4));
      const month = parseInt(period.substring(4, 6));
      const from = new Date(year, month - 1, 1);
      const to = new Date(year, month, 0);

      const text = await client.reports.export606({
        from,
        to,
        format: "txt",
      });
      result = { text, type: "text/plain" };
    } else if (action === "export-sent-documents") {
      console.log("[pronesoft-proxy] 📊 Exportando documentos enviados...");
      const period = payload.period;
      const year = parseInt(period.substring(0, 4));
      const month = parseInt(period.substring(4, 6));
      const from = new Date(year, month - 1, 1);
      const to = new Date(year, month, 0);

      const blob = await client.reports.exportSentDocuments({
        from,
        to,
        env: environmentValue,
      });
      const buffer = await blob.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      result = {
        base64: btoa(binary),
        type: blob.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    } else {
      throw new Error(`Acción desconocida en el proxy: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    let errorMessage = error.message || String(error);
    let responseStatus = Number(error?.response?.status || error?.status || 502);

    if (error.response && typeof error.response.text === "function") {
      try {
        const bodyText = await error.response.text();
        console.error("[pronesoft-proxy] ❌ Response Error Body:", bodyText);
        try {
          const parsed = JSON.parse(bodyText);
          errorMessage = parsed?.message || parsed?.error || errorMessage;
        } catch {
          errorMessage = `${errorMessage}: ${bodyText}`;
        }
      } catch (e) {
        console.error("[pronesoft-proxy] Failed to read response body:", e);
      }
    }

    console.error("[pronesoft-proxy] ❌ ERROR:", errorMessage);
    if (!Number.isInteger(responseStatus) || responseStatus < 400 || responseStatus > 599)
      responseStatus = 502;
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: responseStatus,
    });
  }
});
