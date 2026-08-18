import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { IntegrationClient, Environment } from "npm:@pronesoft-rd/ecf-sdk@0.0.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  try {
    const { action, payload, config } = await req.json()

    // Acción pública de consulta RNC (Microservicio)
    if (action === 'get-rnc') {
      const rncRes = await fetch(`https://dgii-rnc.pronesoft.com/get/${payload.rnc}`);
      const data = await rncRes.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Configuración base
    const baseUrl = config.baseUrl || 'https://api.ecf.pronesoft.com/api/v1';
    const ecfEnv = config.ecfEnv || 'TesteCF';

    console.log(`[pronesoft-proxy] 🚀 Inicializando IntegrationClient SDK para: ${config.clientId.substring(0, 10)}...`);
    
    // Inicializar el SDK oficial
    const sdk = new IntegrationClient({
      baseUrl,
      clientId: config.clientId.trim(),
      clientSecret: config.clientSecret.trim(),
    });

    // Si hay tenantId para delegación multicompañía, obtenemos el cliente scoped
    const client = config.tenantId ? sdk.forTenant(config.tenantId) : sdk;

    // Convertir el string del ambiente al enum correspondiente de Pronesoft SDK
    const environmentValue = ecfEnv === 'TesteCF' 
      ? Environment.TesteCf 
      : ecfEnv === 'CerteCF' 
        ? Environment.CerteCf 
        : Environment.ECf;

    let result;

    if (action === 'submit') {
      console.log("[pronesoft-proxy] 📤 Enviando eCF a DGII con el SDK...");
      
      // Convertir issueDate a Date object porque el SDK espera Date y nosotros recibimos string en el JSON
      if (payload.issueDate) {
        payload.issueDate = new Date(payload.issueDate);
      }

      // Convertir referenceInfo.modifiedInvoiceDate a Date object para Notas de Crédito/Débito
      if (payload.referenceInfo?.modifiedInvoiceDate) {
        payload.referenceInfo.modifiedInvoiceDate = new Date(payload.referenceInfo.modifiedInvoiceDate);
      }

      // Garantizar que paymentForms sea siempre un arreglo válido para evitar errores del SDK (.map)
      if (!payload.paymentForms || !Array.isArray(payload.paymentForms) || payload.paymentForms.length === 0) {
        payload.paymentForms = [{ method: '1', amount: payload.totals?.totalAmount || 1000 }];
      }
      
      result = await client.ecfSubmission.submitEcf({
        environment: environmentValue,
        electronicDocument: payload
      });
      
      console.log("[pronesoft-proxy] ✅ eCF emitido con éxito");

    } else if (action === 'status') {
      console.log("[pronesoft-proxy] 🔍 Consultando estado del documento con el SDK...");
      
      result = await client.ecfSubmission.getEcfStatus({
        environment: environmentValue,
        trackId: payload.documentId
      });

    } else if (action === 'register-company') {
      console.log("[pronesoft-proxy] 🏢 Registrando empresa asociada con el SDK...");
      
      const printerTypeValue = "thermal_80"; // A4, thermal_80, thermal_58

      const res = await sdk.associatedCompanies.createAssociatedCompany({
        email: payload.email || `laundry-${payload.rnc}@klynn.com`,
        password: payload.password || "Klynn2026!",
        name: payload.name,
        rnc: payload.rnc,
        phone: payload.phone || "809-555-5555",
        address: payload.address || "Calle Principal Klynn",
        city: payload.city || "Santo Domingo",
        country: payload.country || "DO",
        printerType: printerTypeValue as any
      });
      
      result = res.business || res;

    } else if (action === 'upload-cert') {
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
        password: payload.password
      });
      
      result = { ok: true, ...res };

    } else if (action === 'import-sequences') {
      console.log("[pronesoft-proxy] 📦 Importando secuencias (Bypass compatibilidad)...");
      
      // Dado que el SDK oficial no expone directamente un método de importación masiva por XML,
      // utilizamos fetch directo autenticado de forma interna y transparente para mayor compatibilidad.
      const token = await sdk.getValidToken(false);
      const headers: any = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      };
      if (config.tenantId) headers["x-tenant-id"] = config.tenantId;

      const res = await fetch(`${baseUrl}/tax-sequences/import`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
      
      const text = await res.text();
      if (!res.ok) throw new Error(`Error de Importación: ${text}`);
      result = JSON.parse(text);

    } else if (action === 'list-associated-companies') {
      console.log("[pronesoft-proxy] 🏢 Listando empresas asociadas...");
      try {
        let res: any;
        if (sdk.associatedCompanies && typeof (sdk.associatedCompanies as any).listAssociatedCompanies === 'function') {
          res = await (sdk.associatedCompanies as any).listAssociatedCompanies({
            page: payload?.page || 1,
            limit: payload?.limit || 50,
          });
        } else if (client.companies && typeof (client.companies as any).listCompanies === 'function') {
          res = await client.companies.listCompanies({
            page: payload?.page || 1,
            limit: payload?.limit || 50,
          });
        }
        if (res) {
          result = res;
        } else {
          throw new Error("SDK method listAssociatedCompanies no disponible, ejecutando REST");
        }
      } catch (sdkErr: any) {
        console.warn("[pronesoft-proxy] ⚠️ Fallback a REST para list-associated-companies:", sdkErr?.message);
        const token = await sdk.getValidToken(false);
        const headers: any = {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        };
        if (config.tenantId) headers["x-tenant-id"] = config.tenantId;

        const page = payload?.page || 1;
        const limit = payload?.limit || 50;
        const res = await fetch(`${baseUrl}/associated-companies?page=${page}&limit=${limit}`, {
          method: "GET",
          headers,
        });

        const text = await res.text();
        if (!res.ok) {
          console.warn("[pronesoft-proxy] Fallback REST retornó código:", res.status, text);
          throw new Error(`Error en API Pronesoft (${res.status}): ${text}`);
        }
        result = text ? JSON.parse(text) : [];
      }

    } else if (action === 'list-sequences') {
      console.log("[pronesoft-proxy] 📋 Listando secuencias fiscales con el SDK...");
      const res = await client.taxSequences.listTaxSequences({
        type: payload.type as any,
        environment: environmentValue,
        page: payload.page || 1,
        limit: payload.limit || 50,
      });
      result = res;

    } else if (action === 'create-sequence') {
      console.log("[pronesoft-proxy] ➕ Creando secuencia fiscal con el SDK...");
      const expDate = payload.expiration ? new Date(payload.expiration) : new Date(Date.now() + 365 * 86400000);
      const res = await client.taxSequences.createTaxSequence({
        createTaxSequenceRequest: {
          type: payload.type as any,
          from: Number(payload.from),
          to: Number(payload.to),
          quantity: Number(payload.quantity || (payload.to - payload.from + 1)),
          expiration: expDate,
          environment: environmentValue,
        }
      });
      result = res;

    } else if (action === 'get-next-number') {
      console.log("[pronesoft-proxy] 🔢 Obteniendo siguiente número de secuencia con el SDK...");
      const res = await client.taxSequences.getNextNumber({
        type: payload.type as any,
        environment: environmentValue,
      });
      result = res;

    } else if (action === 'void-sequences') {
      console.log("[pronesoft-proxy] 🗑️ Anulando secuencia con el SDK...");
      
      const { sequenceId, invoiceType, type, startNumber, endNumber, reason } = payload;
      const targetType = type || invoiceType;
      let targetSeqId = sequenceId;

      if (!targetSeqId && targetType) {
        try {
          const sequencesRes = await client.taxSequences.listTaxSequences({
            environment: environmentValue
          });
          const listData = (sequencesRes as any)?.data || sequencesRes;
          if (Array.isArray(listData)) {
            const found = listData.find((s: any) => 
              s.invoiceType === targetType || 
              s.invoiceType === `E${targetType.replace(/^E/, '')}` ||
              s.type === targetType
            );
            if (found && found.id) targetSeqId = found.id;
          }
        } catch (e) {
          console.warn("[pronesoft-proxy] Advertencia al buscar ID de secuencia para anulación:", e);
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
          reason
        }
      });
      
      result = res;

    } else if (action === 'test-connection') {
      console.log("[pronesoft-proxy] ⚡ Probando conexión y autenticación con el SDK...");
      // Intentamos validar obteniendo un token del SDK de forma real
      const token = await sdk.getValidToken(true);
      if (token) {
        result = { ok: true, message: "Conexión estable y token del SDK generado" };
      } else {
        throw new Error("No se pudo obtener el token de Pronesoft a través del SDK");
      }
    } else if (action === 'list-sent-documents') {
      console.log("[pronesoft-proxy] 📤 Listando documentos enviados con el SDK...");
      try {
        const res = await client.documentsSent.listSentDocuments({
          environment: environmentValue,
          page: payload?.page || 1,
          pageSize: payload?.pageSize || 50,
          type: payload?.type
        });
        result = res;
      } catch (sdkErr: any) {
        console.warn("[pronesoft-proxy] ⚠️ Fallback a REST para list-sent-documents:", sdkErr?.message);
        const token = await sdk.getValidToken(false);
        const headers: any = {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        };
        if (config.tenantId) headers["x-tenant-id"] = config.tenantId;

        const envMap: Record<number, string> = { 1: 'TesteCF', 2: 'CerteCF', 3: 'eCF' };
        const apiEnv = envMap[environmentValue as unknown as number] || 'TesteCF';

        const page = payload?.page || 1;
        const pageSize = payload?.pageSize || 50;
        const res = await fetch(`${baseUrl}/documents/sent?environment=${apiEnv}&page=${page}&pageSize=${pageSize}`, {
          method: "GET",
          headers,
        });
        const text = await res.text();
        result = text ? JSON.parse(text) : { data: [], total: 0 };
      }

    } else if (action === 'list-received-documents') {
      console.log("[pronesoft-proxy] 📥 Listando documentos recibidos con el SDK...");
      try {
        const res = await client.documentsReceived.listReceivedDocuments({
          environment: environmentValue,
          page: payload.page || 1,
          pageSize: payload.pageSize || 50,
        });
        result = res;
      } catch (sdkErr: any) {
        console.warn("[pronesoft-proxy] ⚠️ Aviso en list-received-documents:", sdkErr?.message);
        result = { data: [], total: 0 };
      }
    } else if (action === 'commercial-approval') {
      console.log("[pronesoft-proxy] ✍️ Procesando aprobación comercial...");
      // Aprobación comercial mediante REST directo temporal ya que no está explícito en esta v. del SDK
      const token = await sdk.getValidToken(false);
      const headers: any = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      };
      if (config.tenantId) headers["x-tenant-id"] = config.tenantId;

      const envMap: Record<number, string> = { 1: 'TesteCF', 2: 'CerteCF', 3: 'eCF' };
      const apiEnv = envMap[environmentValue as unknown as number] || 'TesteCF';

      // payload: { documentId: string, status: 'ACCEPTED' | 'REJECTED', details?: string }
      const res = await fetch(`${baseUrl}/commercial-approvals`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          environment: apiEnv,
          documentId: payload.documentId,
          status: payload.status, // ej. 'ACCEPTED' o 'REJECTED'
          details: payload.details || ''
        })
      });
      
      const text = await res.text();
      if (!res.ok) throw new Error(`Error en aprobación comercial: ${text}`);
      result = text ? JSON.parse(text) : { ok: true };
    } else if (action === 'export-606') {
      console.log("[pronesoft-proxy] 📊 Exportando reporte 606...");
      const period = payload.period;
      const year = parseInt(period.substring(0, 4));
      const month = parseInt(period.substring(4, 6));
      const from = new Date(year, month - 1, 1);
      const to = new Date(year, month, 0);

      try {
        const blob = await client.reports.export606({
          from,
          to,
          format: 'TXT'
        });
        const text = await blob.text();
        result = { text, type: blob.type || 'text/plain' };
      } catch (sdkErr: any) {
        console.warn("[pronesoft-proxy] ⚠️ Fallback a REST directo para reporte 606:", sdkErr?.message);
        const token = await sdk.getValidToken(false);
        const headers: any = {
          "Authorization": `Bearer ${token}`,
        };
        if (config.tenantId) headers["x-tenant-id"] = config.tenantId;

        const res = await fetch(`${baseUrl}/reports/format-606?period=${period}`, {
          method: "GET",
          headers,
        });

        const text = await res.text();
        if (!res.ok) throw new Error(`Error descargando Formato 606: ${text}`);
        result = { text, type: 'text/plain' };
      }

    } else if (action === 'export-sent-documents') {
      console.log("[pronesoft-proxy] 📊 Exportando documentos enviados...");
      const period = payload.period;
      const year = parseInt(period.substring(0, 4));
      const month = parseInt(period.substring(4, 6));
      const from = new Date(year, month - 1, 1);
      const to = new Date(year, month, 0);

      try {
        const blob = await client.reports.exportSentDocuments({
          from,
          to,
          env: environmentValue
        });
        const buffer = await blob.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        result = { base64: btoa(binary), type: blob.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
      } catch (sdkErr: any) {
        console.warn("[pronesoft-proxy] ⚠️ Fallback a REST directo para comprobantes enviados:", sdkErr?.message);
        const token = await sdk.getValidToken(false);
        const headers: any = {
          "Authorization": `Bearer ${token}`,
        };
        if (config.tenantId) headers["x-tenant-id"] = config.tenantId;

        const res = await fetch(`${baseUrl}/reports/sent?period=${period}`, {
          method: "GET",
          headers,
        });

        const buffer = await res.arrayBuffer();
        if (!res.ok) {
          const text = new TextDecoder().decode(buffer);
          throw new Error(`Error descargando comprobantes enviados: ${text}`);
        }

        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        result = { base64: btoa(binary), type: res.headers.get("content-type") || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
      }
    } else {
      throw new Error(`Acción desconocida en el proxy: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    let errorMessage = error.message || String(error);
    
    if (error.response && typeof error.response.text === 'function') {
      try {
        const bodyText = await error.response.text();
        console.error("[pronesoft-proxy] ❌ Response Error Body:", bodyText);
        errorMessage = `${errorMessage}: ${bodyText}`;
      } catch (e) {
        console.error("[pronesoft-proxy] Failed to read response body:", e);
      }
    }

    console.error("[pronesoft-proxy] ❌ ERROR:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  }
})
