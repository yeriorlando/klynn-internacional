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

    } else if (action === 'test-connection') {
      console.log("[pronesoft-proxy] ⚡ Probando conexión y autenticación con el SDK...");
      // Intentamos validar obteniendo un token del SDK de forma real
      const token = await sdk.getValidToken(true);
      if (token) {
        result = { ok: true, message: "Conexión estable y token del SDK generado" };
      } else {
        throw new Error("No se pudo obtener el token de Pronesoft a través del SDK");
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
