/**
 * fiscal.ts — Punto de entrada unificado para Facturación Electrónica
 *
 * Usa la API de Pronesoft para emitir eCF sin necesidad de manejar
 * certificados .p12, firmas XML ni conexión directa con la DGII.
 *
 * Pronesoft maneja: firma XML, cola de envío, modo de contingencia.
 */

export { getProneSoftClient } from "./fiscal/pronesoft-client";
export type {
  ECFPayload,
  ECFSubmitResponse,
  ECFStatusResponse,
  ECFItem,
  ECFBuyer,
  ECFTotals,
  PaymentForm,
  AssociatedCompany,
} from "./fiscal/pronesoft-client";

export { ordenToECFPayload } from "./fiscal/orden-to-ecf";
export { getECFConfig, getECFDocuments } from "./storage";

import {
  getProneSoftClient,
  type ECFSubmitResponse,
  type ProneSoftEnvironment,
} from "./fiscal/pronesoft-client";
import { ordenToECFPayload } from "./fiscal/orden-to-ecf";
import {
  getECFConfig,
  getECFDocuments,
  saveECFDocument,
  updateECFConfig,
  saveOrden,
} from "./storage";
import { supabase } from "@/lib/supabase";
import type { Orden, Cliente, TenantConfig, Tenant, ECFDocument, ECFConfig } from "./storage";
import { toast } from "sonner";

function getConfiguredPronesoftEnvironment(config?: ECFConfig | null): ProneSoftEnvironment {
  if (config?.pronesoft_environment === "CerteCF") return "homologacion";
  if (config?.pronesoft_environment === "eCF" || config?.ambiente === "produccion")
    return "production";
  return "sandbox";
}

// ─── Función principal: Emitir un eCF para una orden ─────────────────────────

export interface EmitirECFResult {
  document: ECFDocument;
  encf: string;
  pdf_url: string;
  stamp_url: string;
  security_code: string;
  contingency_mode: boolean;
  legal_status?: string;
}

/**
 * Emite un Comprobante Fiscal Electrónico para una orden de Klynn.
 *
 * @param orden       - La orden a facturar
 * @param cliente     - El cliente (opcional para consumidor final)
 * @param ecfTenantId - El x-tenant-id de Pronesoft para este negocio (empresa asociada)
 * @param config      - Configuración del tenant (ITBIS, etc.)
 * @param tenant      - Datos del tenant (RNC, nombre)
 * @param tipoECF     - Tipo forzado (E31, E32...) — si no, usa config.ncf_secuencia
 */
export async function emitirECF(
  orden: Orden,
  cliente: Cliente | null,
  ecfTenantId: string | undefined,
  config: TenantConfig,
  tenant: Tenant,
  tipoECF?: string,
  reference?: { ncf: string; date: string; code: string },
): Promise<EmitirECFResult> {
  // 1. Construir payload
  const payload = ordenToECFPayload(orden, cliente, config, tipoECF, reference);

  // 2. Obtener cliente Pronesoft (usa VITE_PRONESOFT_ENV del .env para determinar sandbox/production)
  let customClientId: string | undefined = undefined;
  let customClientSecret: string | undefined = undefined;
  let ecfConf: any = null;
  try {
    ecfConf = await getECFConfig(tenant.id);
    if (ecfConf?.usar_credenciales_propias) {
      customClientId = ecfConf.pronesoft_client_id;
      customClientSecret = ecfConf.pronesoft_client_secret;
    }
  } catch (e) {
    console.error("Error al buscar ECFConfig del tenant:", e);
  }

  const targetProneEnv = getConfiguredPronesoftEnvironment(ecfConf);
  const client = getProneSoftClient(
    ecfTenantId,
    targetProneEnv,
    customClientId,
    customClientSecret,
    tenant.id,
  );

  // 3. Enviar a Pronesoft → DGII
  let response: ECFSubmitResponse;
  try {
    const idempotencyKey = `ecf:${tenant.id}:${orden.id}:${tipoECF || payload.invoiceType}`;
    response = await client.submitDocument(payload, idempotencyKey);
  } catch (err: any) {
    const isSandboxEnv =
      ecfConf?.ambiente === "pruebas" ||
      (tenant.rnc && tenant.rnc.toUpperCase().startsWith("SBX")) ||
      (ecfConf?.rnc_emisor && ecfConf.rnc_emisor.toUpperCase().startsWith("SBX"));

    const isSandboxError =
      isSandboxEnv ||
      (err.message &&
        (err.message.includes("Certificado inválido") ||
          err.message.includes("Only 8, 16, 24, or 32 bits supported") ||
          err.message.includes("Error autenticando RNC") ||
          err.message.includes("400") ||
          err.message.includes("Failed to fetch") ||
          err.message.includes("Proxy")));

    if (isSandboxError) {
      throw new Error(`No se pudo emitir el e-CF de prueba en Pronesoft: ${err.message}`);
    } else if (err.message && err.message.includes("Invalid tenant delegation")) {
      console.log("Detectado error de delegación de tenant. Re-registrando tenant en Pronesoft...");
      try {
        const nuevoProneTenantId = await registerTenantInPronesoft(tenant.id);
        if (nuevoProneTenantId) {
          const nuevoClient = getProneSoftClient(
            nuevoProneTenantId,
            targetProneEnv,
            customClientId,
            customClientSecret,
            tenant.id,
          );
          response = await nuevoClient.submitDocument(payload, idempotencyKey);
        } else {
          throw err;
        }
      } catch (retryErr: any) {
        throw new Error(
          `Error al emitir eCF (Reintento de auto-registro falló): ${retryErr.message}`,
        );
      }
    } else {
      throw new Error(`Error al emitir eCF: ${err.message}`);
    }
  }

  const assignedEncf = response.encf || response.documentNumber || payload.invoiceNumber;
  if (!assignedEncf) {
    throw new Error(
      "Pronesoft registró el documento pero no devolvió un e-NCF. Conserva el ID para reconciliación antes de reintentar.",
    );
  }

  // 4. Guardar en Supabase (ecf_documents)
  const ecfDoc: ECFDocument = {
    id: crypto.randomUUID(),
    tenant_id: tenant.id,
    order_id: orden.id,
    encf: assignedEncf,
    tipo_ecf:
      payload.invoiceType === "31"
        ? "E31"
        : payload.invoiceType === "32"
          ? "E32"
          : payload.invoiceType === "34"
            ? "E34"
            : `E${payload.invoiceType}`,
    rnc_receptor: cliente?.cedula ?? undefined,
    track_id: response.trackId || response.id,
    status: mapStatus(response.status, response.legalStatus),
    dgii_response: {
      ...response,
      // Conservamos el contexto exacto de emision. Si el administrador cambia
      // luego el ambiente o la empresa asociada, este documento debe seguir
      // consultandose contra el mismo tenant de Pronesoft que lo recibio.
      klynnContext: {
        companyId: ecfTenantId,
        environment: targetProneEnv,
      },
    },
    xml_content: response.xmlUrl ?? "",
    qr_content: response.documentStampUrl || undefined,
    monto_total: orden.total,
    monto_itbis: orden.itbis,
    fecha_emision: response.stampDate || new Date().toISOString(),
    // Campos extendidos de Pronesoft
    pronesoft_id: response.id,
    legal_status: response.legalStatus || undefined,
    pdf_url: response.pdf || undefined,
    xml_url: response.xmlUrl || undefined,
    document_stamp_url: response.documentStampUrl || undefined,
    security_code: response.securityCode || undefined,
    contingency_mode: response.contingencyMode,
    stamp_date: response.stampDate,
    signature_date: response.signatureDate || undefined,
  } as ECFDocument;

  try {
    await saveECFDocument(ecfDoc);
  } catch (saveErr) {
    // No bloqueamos si falla el guardado — el documento ya fue emitido
    console.error("Advertencia: no se pudo guardar ECFDocument en Supabase:", saveErr);
  }

  // 5. Actualizar la secuencia local (valor_actual) con el eNCF emitido para mantener la sincronización y la cuenta regresiva en UI
  if (assignedEncf) {
    try {
      const tipoDoc = ecfDoc.tipo_ecf;
      // Remover el prefijo E32 / E31 antes de convertir a número para obtener el verdadero consecutivo (ej: "E320000000029" -> "0000000029" -> 29)
      const rawNumStr = assignedEncf.startsWith(tipoDoc)
        ? assignedEncf.substring(tipoDoc.length)
        : assignedEncf.replace(/^[A-Z]+\d{2}/, "").replace(/\D/g, "");

      const numSol = parseInt(rawNumStr, 10);
      if (!isNaN(numSol) && numSol > 0) {
        const { data: seq } = await supabase
          .from("ecf_sequences")
          .select("*")
          .eq("tenant_id", tenant.id)
          .eq("tipo_ecf", tipoDoc)
          .eq("is_active", true)
          .maybeSingle();

        if (seq && numSol > (seq.valor_actual || 0) && numSol <= seq.valor_final) {
          await supabase.from("ecf_sequences").update({ valor_actual: numSol }).eq("id", seq.id);
        }
      }
    } catch (seqSyncErr) {
      console.warn("Advertencia: no se pudo actualizar la secuencia local:", seqSyncErr);
    }
  }

  return {
    document: ecfDoc,
    encf: assignedEncf,
    pdf_url: response.pdf || undefined,
    stamp_url: response.documentStampUrl || undefined,
    security_code: response.securityCode || undefined,
    contingency_mode: response.contingencyMode,
    legal_status: response.legalStatus || undefined,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Consulta Pronesoft y propaga el estado fiscal real a la orden y al documento local. */
export async function sincronizarEstadoECF(
  tenantId: string,
  document: ECFDocument,
): Promise<ECFDocument> {
  const config = await getECFConfig(tenantId);
  // El SDK devuelve un id de registro y un trackId. El endpoint /status de
  // Pronesoft consulta por trackId; el id inicial puede responder "no encontrado".
  const documentId = document.track_id || document.pronesoft_id;
  if (!config || !documentId) return document;
  const emissionContext = (document.dgii_response as any)?.klynnContext;
  const client = getProneSoftClient(
    emissionContext?.companyId || config.pronesoft_tenant_id,
    emissionContext?.environment || getConfiguredPronesoftEnvironment(config),
    config.usar_credenciales_propias ? config.pronesoft_client_id : undefined,
    config.usar_credenciales_propias ? config.pronesoft_client_secret : undefined,
    tenantId,
  );
  let response: any;
  let authoritativeDocumentId = documentId;

  try {
    response = await client.getDocumentStatus(documentId);
  } catch (statusError) {
    // El ID devuelto por /ecf/submit identifica el registro inicial. En algunas
    // respuestas asíncronas de Pronesoft el listado de enviados expone luego un
    // ID definitivo distinto; lo resolvemos por e-NCF sin volver a emitir.
    let remoteDocument: any = null;
    for (let page = 1; page <= 10 && !remoteDocument; page += 1) {
      const listed = await client.listSentDocuments(page, 100);
      const items = Array.isArray(listed)
        ? listed
        : Array.isArray(listed?.data)
          ? listed.data
          : Array.isArray(listed?.items)
            ? listed.items
            : [];
      remoteDocument = items.find((item: any) => {
        const remoteEncf = item?.encf || item?.eNCF || item?.invoiceNumber || item?.documentNumber;
        return remoteEncf === document.encf;
      });
      if (items.length < 100) break;
    }

    const remoteId = remoteDocument?.id || remoteDocument?.documentId;
    if (!remoteId) throw statusError;
    authoritativeDocumentId = remoteId;
    response = await client.getSentDocument(remoteId);
  }

  const fiscalStatus =
    response.legalStatus === "ACCEPTED"
      ? "ACCEPTED"
      : response.legalStatus === "ACCEPTED_WITH_OBSERVATIONS"
        ? "ACCEPTED_WITH_OBSERVATIONS"
        : response.legalStatus === "REJECTED"
          ? "REJECTED"
          : response.status === "ERROR"
            ? "ERROR"
            : response.status;
  const isRejected = fiscalStatus === "REJECTED" || fiscalStatus === "ERROR";
  const updated: ECFDocument = {
    ...document,
    encf: response.encf || document.encf,
    status: mapStatus(response.status, response.legalStatus),
    track_id: authoritativeDocumentId,
    pronesoft_id: authoritativeDocumentId,
    legal_status: response.legalStatus,
    dgii_response: {
      ...response,
      ...(emissionContext ? { klynnContext: emissionContext } : {}),
    },
    pdf_url: isRejected ? undefined : response.pdf || document.pdf_url,
    xml_url: response.xmlUrl || document.xml_url,
    qr_content: isRejected ? undefined : response.documentStampUrl || document.qr_content,
    document_stamp_url: isRejected
      ? undefined
      : response.documentStampUrl || document.document_stamp_url,
    security_code: isRejected ? undefined : response.securityCode || document.security_code,
    signature_date: isRejected ? undefined : response.signatureDate || document.signature_date,
  };
  await saveECFDocument(updated);
  if (document.order_id) {
    const { data: order } = await supabase
      .from("ordenes")
      .select("*")
      .eq("id", document.order_id)
      .maybeSingle();
    if (order) {
      await saveOrden({
        ...order,
        ecf_id: authoritativeDocumentId,
        ecf_status: fiscalStatus,
        ecf_qr: isRejected ? null : response.documentStampUrl || order.ecf_qr,
        ecf_security_code: isRejected ? null : response.securityCode || order.ecf_security_code,
        ecf_signature_date: isRejected ? null : response.signatureDate || order.ecf_signature_date,
        ncf: updated.encf,
      } as Orden);
    }
  }
  return updated;
}

export interface DGIIContribuyente {
  rnc: string;
  name: string;
  commercialName?: string;
  status?: string;
  regime?: string;
  activity?: string;
}

/**
 * Consulta la información oficial de un RNC/Cédula en el servicio DGII de Pronesoft.
 */
export async function consultarRNC(
  rncInput: string,
  ambiente?: "pruebas" | "produccion",
): Promise<DGIIContribuyente | null> {
  const raw = (rncInput || "").trim().toUpperCase();
  if (raw.startsWith("SBX") || ambiente === "pruebas" || raw === "987654321") {
    if (raw.includes("987654321") || raw === "987654321" || raw === "SBX987654321") {
      return { rnc: "SBX987654321", name: "PRONESOFT SANDBOX TEST SRL" };
    }
    if (raw.includes("133190907") || raw === "133190907" || raw === "SBX133190907") {
      return { rnc: "SBX133190907", name: "EMPRESA PRINCIPAL SANDBOX" };
    }
    if (raw.includes("111222333") || raw === "111222333" || raw === "SBX111222333") {
      return { rnc: "SBX111222333", name: "CLIENTE COMPRADOR SANDBOX" };
    }
    return { rnc: raw.startsWith("SBX") ? raw : `SBX${raw}`, name: "EMPRESA PRUEBA SANDBOX" };
  }

  let cleanRnc = raw.replace(/\D/g, "");

  if (!cleanRnc || (cleanRnc.length !== 9 && cleanRnc.length !== 11)) {
    return null;
  }

  try {
    // 1. Intento directo al microservicio público de Pronesoft
    const res = await fetch(`https://dgii-rnc.pronesoft.com/get/${cleanRnc}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.name) {
        return data as DGIIContribuyente;
      }
    }
  } catch {
    // Si falla directo (ej: CORS en localhost), pasamos silenciosamente al proxy
  }

  try {
    // 2. Fallback vía Edge function pronesoft-proxy
    const { data, error } = await supabase.functions.invoke("pronesoft-proxy", {
      body: { action: "get-rnc", payload: { rnc: cleanRnc } },
    });
    if (!error && data && data.name) {
      return data as DGIIContribuyente;
    }
  } catch (proxyErr) {
    console.warn("Aviso en consulta RNC vía proxy:", proxyErr);
  }

  return null;
}

/**
 * Evalúa si la configuración fiscal está lista para emitir o comunicarse con Pronesoft.
 *
 * - Modalidad 1 (Cuenta Maestra Klynn): Requiere is_active y pronesoft_tenant_id.
 * - Modalidad 2 (Credenciales Propias): Requiere is_active y que existan client_id y client_secret.
 */
export function isECFReady(config: ECFConfig | null | undefined): boolean {
  if (!config || !config.is_active) return false;
  if (config.usar_credenciales_propias) {
    return Boolean(config.pronesoft_client_id?.trim() && config.pronesoft_client_secret?.trim());
  }
  return Boolean(config.pronesoft_tenant_id);
}

function mapStatus(
  status: ECFSubmitResponse["status"],
  legalStatus?: ECFSubmitResponse["legalStatus"],
): ECFDocument["status"] {
  if (legalStatus === "ACCEPTED") return "accepted";
  if (legalStatus === "ACCEPTED_WITH_OBSERVATIONS") return "accepted_with_reservations";
  if (legalStatus === "REJECTED") return "rejected";
  if (status === "ERROR") return "rejected";
  return "pending"; // REGISTERED, TO_SEND, WAITING_RESPONSE
}

/**
 * Registra automáticamente un negocio de Klynn en Pronesoft como empresa asociada.
 *
 * 1. Crea la 'Associated Company' en Pronesoft bajo la cuenta de Klynn.
 * 2. Guarda el x-tenant-id resultante en la configuración local.
 */
export async function registerTenantInPronesoft(
  tenantId: string,
  explicitConfig?: Partial<ECFConfig>,
): Promise<string> {
  // 1. Obtener datos del negocio y config actual
  let config = await getECFConfig(tenantId);
  if (!config && explicitConfig) {
    config = explicitConfig as ECFConfig;
  }
  if (!config) {
    const { data: tData } = await supabase
      .from("tenants")
      .select("nombre, rnc")
      .eq("id", tenantId)
      .single();
    config = {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      rnc_emisor: tData?.rnc || "",
      razon_social: tData?.nombre || "Lavandería",
      ambiente: "pruebas",
      pronesoft_environment: "TesteCF",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as ECFConfig;
  }

  // Si usa credenciales propias, no requiere registrar empresa asociada bajo la cuenta de Klynn
  if (config.usar_credenciales_propias) {
    return config.pronesoft_tenant_id || "";
  }

  const { data: tenantData } = await supabase
    .from("tenants")
    .select("nombre, rnc, telefono, direccion, ciudad")
    .eq("id", tenantId)
    .single();

  const proneSoftEnv = getConfiguredPronesoftEnvironment(config);
  const client = getProneSoftClient(
    undefined,
    proneSoftEnv,
    config.usar_credenciales_propias ? config.pronesoft_client_id : undefined,
    config.usar_credenciales_propias ? config.pronesoft_client_secret : undefined,
    tenantId,
  );

  const companyName = config.razon_social || tenantData?.nombre || "Lavanderia Klynn";
  let rncToRegister = (config.rnc_emisor || tenantData?.rnc || "SBX987654321").trim().toUpperCase();

  if (proneSoftEnv === "sandbox") {
    if (!rncToRegister.startsWith("SBX")) {
      const digitsOnly = rncToRegister.replace(/\D/g, "") || "987654321";
      rncToRegister = `SBX${digitsOnly}`;
    }
  } else {
    rncToRegister = rncToRegister.replace(/^SBX/i, "").replace(/\D/g, "");
  }

  // 2. Buscar primero por RNC para que el alta sea idempotente.
  try {
    let pronesoftTenantId = "";
    for (let page = 1; page <= 100 && !pronesoftTenantId; page++) {
      const listed = await client.listAssociatedCompanies({ page, limit: 100 });
      const companies = Array.isArray(listed) ? listed : listed?.data || [];
      const match = companies.find(
        (company: any) =>
          String(company?.rnc || "")
            .trim()
            .toUpperCase() === rncToRegister,
      );
      if (match) pronesoftTenantId = match.id || match.businessId || "";
      if (companies.length < 100) break;
    }

    if (!pronesoftTenantId) {
      const res = await client.createAssociatedCompany({
        rnc: rncToRegister,
        name: companyName,
        email: `ecf-${tenantId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}@klynn.com.do`,
        phone: tenantData?.telefono || undefined,
        address: tenantData?.direccion || undefined,
        city: tenantData?.ciudad || undefined,
      });

      const tenantResultId =
        res?.id || (res as any)?.businessId || (typeof res === "string" ? res : "");
      if (!tenantResultId) throw new Error("Pronesoft no devolvió un ID de empresa");
      pronesoftTenantId = tenantResultId;
    }

    // 3. Actualizar configuración en Supabase
    await updateECFConfig(tenantId, {
      pronesoft_tenant_id: pronesoftTenantId,
      is_active: true,
      rnc_emisor: rncToRegister,
      razon_social: companyName,
    });

    return pronesoftTenantId;
  } catch (err: any) {
    console.error("Error en registro Pronesoft:", err);
    throw new Error(err.message || "Error al conectar con el servidor de certificación");
  }
}

/**
 * Sincroniza el certificado P12 local con Pronesoft.
 */
export async function uploadCertificateToPronesoft(
  tenantId: string,
  base64: string,
  password: string,
  passedConfig?: ECFConfig,
): Promise<boolean> {
  const config = passedConfig || (await getECFConfig(tenantId));
  if (!config) {
    console.warn("Configuración fiscal no encontrada para certificado");
    return false;
  }

  const proneSoftEnv2 = getConfiguredPronesoftEnvironment(config);
  const client = getProneSoftClient(
    config.pronesoft_tenant_id || undefined,
    proneSoftEnv2,
    config.usar_credenciales_propias ? config.pronesoft_client_id : undefined,
    config.usar_credenciales_propias ? config.pronesoft_client_secret : undefined,
    tenantId,
  );

  try {
    const res = await client.uploadCertificate({
      certificate: base64,
      password: password,
      rnc: config.rnc_emisor,
    });
    return res.ok;
  } catch (err: any) {
    console.warn("Aviso al sincronizar certificado con Pronesoft:", err?.message || err);
    // Devolvemos false pero no rompemos la persistencia de datos del usuario
    return false;
  }
}

export async function createSequencePronesoft(
  tenantId: string,
  data: { type: string; from: number; to: number; quantity?: number; expiration?: string },
): Promise<any> {
  const config = await getECFConfig(tenantId);
  const client = getProneSoftClient(
    config?.pronesoft_tenant_id || undefined,
    getConfiguredPronesoftEnvironment(config),
    config?.usar_credenciales_propias ? config?.pronesoft_client_id : undefined,
    config?.usar_credenciales_propias ? config?.pronesoft_client_secret : undefined,
    tenantId,
  );
  return client.createSequence(data);
}

export async function listAssociatedCompaniesPronesoft(
  params?: { page?: number; limit?: number },
  env?: "sandbox" | "production" | "all",
): Promise<any[]> {
  if (env === "all") {
    const [sbxRes, prodRes] = await Promise.allSettled([
      getProneSoftClient(undefined, "sandbox").listAssociatedCompanies(params),
      getProneSoftClient(undefined, "production").listAssociatedCompanies(params),
    ]);

    const sbxItems =
      sbxRes.status === "fulfilled"
        ? sbxRes.value?.data || (Array.isArray(sbxRes.value) ? sbxRes.value : [])
        : [];
    const prodItems =
      prodRes.status === "fulfilled"
        ? prodRes.value?.data || (Array.isArray(prodRes.value) ? prodRes.value : [])
        : [];

    const taggedSbx = (Array.isArray(sbxItems) ? sbxItems : []).map((c: any) => ({
      ...c,
      _ambiente: "sandbox",
    }));
    const taggedProd = (Array.isArray(prodItems) ? prodItems : []).map((c: any) => ({
      ...c,
      _ambiente: "production",
    }));

    // Unificar evitando duplicados por ID
    const seen = new Set<string>();
    const combined: any[] = [];
    for (const item of [...taggedProd, ...taggedSbx]) {
      const key = `${item.id || item.rnc}-${item._ambiente}`;
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(item);
      }
    }
    return combined;
  }

  const targetEnv = env || "production";
  try {
    const client = getProneSoftClient(undefined, targetEnv);
    const res = await client.listAssociatedCompanies(params);
    const items = res?.data || (Array.isArray(res) ? res : []);
    return (Array.isArray(items) ? items : []).map((c: any) => ({ ...c, _ambiente: targetEnv }));
  } catch (err: any) {
    console.warn(
      `[Pronesoft API] Aviso al listar empresas asociadas en ${targetEnv}:`,
      err?.message || err,
    );
    throw err;
  }
}

export async function listSequencesPronesoft(tenantId: string, params?: any): Promise<any> {
  const config = await getECFConfig(tenantId);
  const client = getProneSoftClient(
    config?.pronesoft_tenant_id || undefined,
    getConfiguredPronesoftEnvironment(config),
    config?.usar_credenciales_propias ? config?.pronesoft_client_id : undefined,
    config?.usar_credenciales_propias ? config?.pronesoft_client_secret : undefined,
    tenantId,
  );
  return client.listSequences(params);
}

export async function getNextNumberPronesoft(tenantId: string, type: string): Promise<any> {
  const config = await getECFConfig(tenantId);
  if (!config || !isECFReady(config)) {
    throw new Error(
      "La facturación electrónica no está configurada para reservar e-NCF en Pronesoft.",
    );
  }
  const client = getProneSoftClient(
    config.pronesoft_tenant_id || undefined,
    getConfiguredPronesoftEnvironment(config),
    config?.usar_credenciales_propias ? config?.pronesoft_client_id : undefined,
    config?.usar_credenciales_propias ? config?.pronesoft_client_secret : undefined,
    tenantId,
  );
  return client.getNextNumber(type);
}

export async function anularSecuenciasPronesoft(
  tenantId: string,
  sequenceId: string,
  invoiceType: string,
  startNumber: string,
  endNumber: string,
  reason: string,
): Promise<any> {
  const config = await getECFConfig(tenantId);
  if (!config || !isECFReady(config)) {
    throw new Error("El módulo fiscal no está activo o configurado");
  }

  const client = getProneSoftClient(
    config.pronesoft_tenant_id || undefined,
    getConfiguredPronesoftEnvironment(config),
    config.usar_credenciales_propias ? config.pronesoft_client_id : undefined,
    config.usar_credenciales_propias ? config.pronesoft_client_secret : undefined,
    tenantId,
  );

  return client.voidSequences({
    sequenceId,
    invoiceType,
    startNumber,
    endNumber,
    reason,
  });
}

export async function listSentDocumentsPronesoft(
  tenantId: string,
  page: number = 1,
  pageSize: number = 50,
  type?: string,
): Promise<any> {
  const config = await getECFConfig(tenantId);
  const client = getProneSoftClient(
    config?.pronesoft_tenant_id,
    getConfiguredPronesoftEnvironment(config),
    config?.usar_credenciales_propias ? config?.pronesoft_client_id : undefined,
    config?.usar_credenciales_propias ? config?.pronesoft_client_secret : undefined,
    tenantId,
  );
  return client.listSentDocuments(page, pageSize, type);
}

export async function getSentDocumentDiagnosticsPronesoft(
  tenantId: string,
  documentId: string,
): Promise<{ detail: any; logs: any[] }> {
  const config = await getECFConfig(tenantId);
  const client = getProneSoftClient(
    config?.pronesoft_tenant_id,
    getConfiguredPronesoftEnvironment(config),
    config?.usar_credenciales_propias ? config?.pronesoft_client_id : undefined,
    config?.usar_credenciales_propias ? config?.pronesoft_client_secret : undefined,
    tenantId,
  );
  const [detail, logs] = await Promise.all([
    client.getSentDocument(documentId),
    client.getSentDocumentLogs(documentId),
  ]);
  return { detail, logs: Array.isArray(logs) ? logs : [] };
}

export async function listReceivedDocumentsPronesoft(
  tenantId: string,
  page: number = 1,
  pageSize: number = 50,
): Promise<any> {
  const config = await getECFConfig(tenantId);
  const isUUID =
    config?.pronesoft_tenant_id &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      config.pronesoft_tenant_id,
    );
  if (!config?.is_active || !isUUID) {
    return { data: [], total: 0 };
  }

  const client = getProneSoftClient(
    config?.pronesoft_tenant_id,
    getConfiguredPronesoftEnvironment(config),
    config?.usar_credenciales_propias ? config?.pronesoft_client_id : undefined,
    config?.usar_credenciales_propias ? config?.pronesoft_client_secret : undefined,
    tenantId,
  );
  return client.listReceivedDocuments(page, pageSize);
}

export async function submitCommercialApprovalPronesoft(
  tenantId: string,
  documentId: string,
  status: "ACCEPTED" | "REJECTED",
  details?: string,
): Promise<any> {
  const config = await getECFConfig(tenantId);
  const client = getProneSoftClient(
    config?.pronesoft_tenant_id,
    getConfiguredPronesoftEnvironment(config),
    config?.usar_credenciales_propias ? config?.pronesoft_client_id : undefined,
    config?.usar_credenciales_propias ? config?.pronesoft_client_secret : undefined,
    tenantId,
  );
  return client.submitCommercialApproval(documentId, status, details);
}
