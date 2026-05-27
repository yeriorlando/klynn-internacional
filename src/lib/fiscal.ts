/**
 * fiscal.ts — Punto de entrada unificado para Facturación Electrónica
 *
 * Usa la API de Pronesoft para emitir eCF sin necesidad de manejar
 * certificados .p12, firmas XML ni conexión directa con la DGII.
 *
 * Pronesoft maneja: firma XML, cola de envío, modo de contingencia.
 */

export { getProneSoftClient } from './fiscal/pronesoft-client';
export type {
  ECFPayload,
  ECFSubmitResponse,
  ECFStatusResponse,
  ECFItem,
  ECFBuyer,
  ECFTotals,
  PaymentForm,
  AssociatedCompany,
} from './fiscal/pronesoft-client';

export { ordenToECFPayload } from './fiscal/orden-to-ecf';
export { getECFConfig, getECFDocuments } from './storage';

import { getProneSoftClient, type ECFSubmitResponse } from './fiscal/pronesoft-client';
import { ordenToECFPayload } from './fiscal/orden-to-ecf';
import { getECFConfig, getECFDocuments, saveECFDocument, updateECFConfig } from './storage';
import { supabase } from '@/lib/supabase';
import type { Orden, Cliente, TenantConfig, Tenant, ECFDocument } from './storage';

// ─── Función principal: Emitir un eCF para una orden ─────────────────────────

export interface EmitirECFResult {
  document:         ECFDocument;
  encf:             string;
  pdf_url:          string;
  stamp_url:        string;
  security_code:    string;
  contingency_mode: boolean;
  legal_status?:    string;
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
  orden:       Orden,
  cliente:     Cliente | null,
  ecfTenantId: string | undefined,
  config:      TenantConfig,
  tenant:      Tenant,
  tipoECF?:    string,
  reference?:  { ncf: string; date: string; code: string }
): Promise<EmitirECFResult> {

  // 1. Construir payload
  const payload = ordenToECFPayload(orden, cliente, config, tipoECF, reference);

  // 2. Obtener cliente Pronesoft (usa VITE_PRONESOFT_ENV del .env para determinar sandbox/production)
  let customClientId: string | undefined = undefined;
  let customClientSecret: string | undefined = undefined;
  try {
    const ecfConf = await getECFConfig(tenant.id);
    if (ecfConf?.usar_credenciales_propias) {
      customClientId = ecfConf.pronesoft_client_id;
      customClientSecret = ecfConf.pronesoft_client_secret;
    }
  } catch (e) {
    console.error("Error al buscar ECFConfig del tenant:", e);
  }
  const client = getProneSoftClient(ecfTenantId, undefined, customClientId, customClientSecret);

  // 3. Enviar a Pronesoft → DGII
  let response: ECFSubmitResponse;
  try {
    response = await client.submitDocument(payload);
  } catch (err: any) {
    throw new Error(`Error al emitir eCF: ${err.message}`);
  }

  // 4. Guardar en Supabase (ecf_documents)
  const ecfDoc: ECFDocument = {
    id:                    crypto.randomUUID(),
    tenant_id:             tenant.id,
    order_id:              orden.id,
    encf:                  response.encf,
    tipo_ecf:              payload.invoiceType === '31' ? 'E31'
                         : payload.invoiceType === '32' ? 'E32'
                         : payload.invoiceType === '34' ? 'E34'
                         : `E${payload.invoiceType}`,
    rnc_receptor:          cliente?.cedula ?? undefined,
    track_id:              response.id,           // UUID de Pronesoft
    status:                mapStatus(response.status, response.legalStatus),
    dgii_response:         response,
    xml_content:           response.xmlUrl ?? '',
    qr_content:            response.documentStampUrl,
    monto_total:           orden.total,
    monto_itbis:           orden.itbis,
    fecha_emision:         response.stampDate || new Date().toISOString(),
    // Campos extendidos de Pronesoft
    pronesoft_id:          response.id,
    legal_status:          response.legalStatus,
    pdf_url:               response.pdf,
    xml_url:               response.xmlUrl,
    document_stamp_url:    response.documentStampUrl,
    security_code:         response.securityCode,
    contingency_mode:      response.contingencyMode,
    stamp_date:            response.stampDate,
    signature_date:        response.signatureDate,
  } as ECFDocument;

  try {
    await saveECFDocument(ecfDoc);
  } catch (saveErr) {
    // No bloqueamos si falla el guardado — el documento ya fue emitido
    console.error('Advertencia: no se pudo guardar ECFDocument en Supabase:', saveErr);
  }

  return {
    document:         ecfDoc,
    encf:             response.encf,
    pdf_url:          response.pdf,
    stamp_url:        response.documentStampUrl,
    security_code:    response.securityCode,
    contingency_mode: response.contingencyMode,
    legal_status:     response.legalStatus,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapStatus(
  status:      ECFSubmitResponse['status'],
  legalStatus?: ECFSubmitResponse['legalStatus']
): ECFDocument['status'] {
  if (legalStatus === 'ACCEPTED')                  return 'accepted';
  if (legalStatus === 'ACCEPTED_WITH_OBSERVATIONS') return 'accepted_with_reservations';
  if (legalStatus === 'REJECTED')                  return 'rejected';
  if (status === 'ERROR')                          return 'rejected';
  return 'pending'; // REGISTERED, TO_SEND, WAITING_RESPONSE
}

/**
 * Registra automáticamente un negocio de Klynn en Pronesoft.
 * 
 * 1. Crea la 'Associated Company' en Pronesoft.
 * 2. Guarda el x-tenant-id resultante en la configuración local.
 */
export async function registerTenantInPronesoft(tenantId: string): Promise<string> {
  // 1. Obtener datos del negocio y config actual
  const config = await getECFConfig(tenantId);
  if (!config) throw new Error("Configuración fiscal no inicializada");

  // Buscamos el nombre del tenant para tener un fallback si razon_social está vacío
  const { data: tenantData } = await supabase.from('tenants').select('nombre').eq('id', tenantId).single();

  const proneSoftEnv = config.ambiente === 'pruebas' ? 'sandbox' : config.ambiente === 'produccion' ? 'production' : undefined;
  const client = getProneSoftClient(
    undefined, 
    proneSoftEnv,
    config.usar_credenciales_propias ? config.pronesoft_client_id : undefined,
    config.usar_credenciales_propias ? config.pronesoft_client_secret : undefined
  );

  const companyName = config.razon_social || tenantData?.nombre || "Lavanderia Klynn";

  // 2. Registrar en Pronesoft (Tanto en Sandbox como en Producción)
  try {
    let pronesoftTenantId = "";

    const res = await client.createAssociatedCompany({
      rnc: config.rnc_emisor,
      name: companyName
    });

    if (!res.id) throw new Error("Pronesoft no devolvió un ID de empresa");
    pronesoftTenantId = res.id;

    // 3. Actualizar configuración en Supabase
    await updateECFConfig(tenantId, {
      pronesoft_tenant_id: pronesoftTenantId,
      is_active: true
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
  password: string
): Promise<boolean> {
  const config = await getECFConfig(tenantId);
  if (!config?.pronesoft_tenant_id) {
    throw new Error("Primero debes activar el módulo fiscal");
  }

  const proneSoftEnv2 = config.ambiente === 'pruebas' ? 'sandbox' : config.ambiente === 'produccion' ? 'production' : undefined;
  const client = getProneSoftClient(
    config.pronesoft_tenant_id, 
    proneSoftEnv2,
    config.usar_credenciales_propias ? config.pronesoft_client_id : undefined,
    config.usar_credenciales_propias ? config.pronesoft_client_secret : undefined
  );
  const res = await client.uploadCertificate({
    certificate: base64,
    password: password,
    rnc: config.rnc_emisor
  });

  return res.ok;
}

export async function importSequencesToPronesoft(
  tenantId: string,
  fileBase64: string
): Promise<boolean> {
  const config = await getECFConfig(tenantId);
  const client = getProneSoftClient(
    config?.pronesoft_tenant_id,
    config?.ambiente === 'pruebas' ? 'sandbox' : 'production',
    config?.usar_credenciales_propias ? config?.pronesoft_client_id : undefined,
    config?.usar_credenciales_propias ? config?.pronesoft_client_secret : undefined
  );
  const res = await client.importSequences(fileBase64);
  return res.ok;
}

