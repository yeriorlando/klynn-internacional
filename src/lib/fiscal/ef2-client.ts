/**
 * Cliente EF2 para el navegador.
 *
 * Todas las llamadas salen por la Edge Function `ef2-proxy`. El token guardado
 * nunca se devuelve al navegador; solamente se permite enviar una credencial
 * explícita al probarla antes de guardarla.
 */
import { supabase } from "@/lib/supabase";
export {
  EF2_BASE_URL,
  EF2_DEFAULT_TEST_USERNAME,
  EF2_DEFAULT_TEST_TOKEN,
  EF2_DEFAULT_TEST_RNC,
  EF2_DEFAULT_TEST_EMPRESA,
} from "./ef2-constants";

export type EF2Environment = "TesteCF" | "CerteCF" | "eCF";
export type EF2Action =
  | "verificar_token"
  | "guardar_credenciales"
  | "procesar_factura"
  | "consultar_secuencias"
  | "consultar_tipos_ecf"
  | "consultar_prefijo"
  | "disponibilidad_prefijo"
  | "crear_secuencia"
  | "actualizar_secuencia"
  | "eliminar_secuencia"
  | "auditoria_factura"
  | "auditoria_lote";

export interface EF2VerifyTokenResponse {
  success: boolean;
  message?: string;
  empresa?: { id?: number; nombre: string; rnc: string };
}

export interface EF2DGIIInfo {
  track_id?: string;
  fecha_recepcion?: string;
  estado?: string;
  mensaje?: string;
  [key: string]: unknown;
}

export interface EF2ProcesarFacturaResponse {
  success: boolean;
  message?: string;
  error?: string;
  ncf?: string;
  estado?: string;
  qr_link?: string;
  pdf_cloud_url?: string;
  xml_cloud_url?: string;
  consulta_url?: string;
  id_factura?: number | string;
  fecha_emision?: string;
  fecha_firma?: string;
  codigo_seguridad?: string;
  monto_total?: number | string;
  dgii_info?: EF2DGIIInfo;
  raw?: Record<string, unknown>;
}

export interface EF2TipoECF {
  id: number;
  codigo: string;
  nombre: string;
  prefijo: string;
  estado?: boolean;
}

export interface EF2SecuenciaRango {
  id: number;
  tipo_codigo?: string;
  tipo_nombre?: string;
  tipo_ecf_id?: number;
  prefijo: string;
  desde: number;
  hasta: number;
  secuencia_actual: number;
  total_secuencias?: number;
  secuencias_usadas?: number;
  secuencias_disponibles?: number;
  porcentaje_uso?: number;
  fecha_vencimiento?: string;
  estado: boolean | number;
  created_at?: string;
  updated_at?: string;
}

export interface EF2Response<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface EF2ClientConfig {
  tenantId?: string;
  environment?: EF2Environment;
  username?: string;
  token?: string;
}

function firstValue(source: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function qrMetadata(qrLink?: string): { fecha_firma?: string; codigo_seguridad?: string } {
  if (!qrLink) return {};
  try {
    const params = new URL(qrLink).searchParams;
    const entries = new Map<string, string>();
    params.forEach((value, key) => entries.set(key.toLowerCase(), value));
    return {
      fecha_firma:
        entries.get("fechafirmadigital") ||
        entries.get("fecha_firma_digital") ||
        entries.get("fechafirma"),
      codigo_seguridad:
        entries.get("codigoseguridad") ||
        entries.get("codigo_seguridad") ||
        entries.get("codseguridad"),
    };
  } catch {
    return {};
  }
}

/** Normaliza las dos variantes documentadas por EF2 (`ncf` y `eNCF`). */
export function normalizeEF2FacturaResponse(input: any): EF2ProcesarFacturaResponse {
  const raw = (input?.data && !Array.isArray(input.data) ? input.data : input) || {};
  const dgii = raw.dgii_info || raw.dgii || raw.DGII || {};
  const documentos = raw.documentos || {};
  const qrLink =
    firstValue(raw, ["qr_link", "qrLink", "qr", "timbre_qr"]) ||
    firstValue(documentos, ["qr", "qr_link", "timbre_qr", "timbre"]);
  const extracted = qrMetadata(qrLink);
  const estado = String(
    firstValue(raw, [
      "estado",
      "Estado",
      "legal_status",
      "legalStatus",
      "status",
      "estatus",
      "estado_factura",
      "estado_dgii",
      "EstadoFactura",
    ]) ||
      firstValue(dgii, ["estado", "status", "estatus", "estado_factura", "estado_dgii"]) ||
      "",
  );
  const explicitSuccess = raw.success;
  const success =
    typeof explicitSuccess === "boolean"
      ? explicitSuccess
      : !/(rechaz|error|inv[aá]lid)/i.test(estado);

  return {
    success,
    message: firstValue(raw, ["message", "mensaje", "Mensaje"]),
    error: firstValue(raw, ["error", "errors"]),
    ncf: firstValue(raw, ["ncf", "eNCF", "encf", "documentNumber", "numero_documento"]),
    estado,
    qr_link: qrLink,
    pdf_cloud_url:
      firstValue(raw, ["pdf_cloud_url", "pdf_url", "pdfUrl", "pdf"]) ||
      firstValue(documentos, ["pdf", "pdf_url"]),
    xml_cloud_url:
      firstValue(raw, ["xml_cloud_url", "xml_url", "xmlUrl", "xml"]) ||
      firstValue(documentos, ["xml", "xml_url"]),
    consulta_url: firstValue(raw, ["UrlENCF", "url_encf", "consulta_url"]),
    id_factura: firstValue(raw, ["id_factura", "idFactura", "id"]),
    fecha_emision: firstValue(raw, ["FechaEmision", "fecha_emision", "issueDate"]),
    fecha_firma:
      firstValue(raw, ["fecha_firma", "fecha_firma_digital", "signature_date", "signatureDate"]) ||
      firstValue(dgii, ["fecha_firma", "fecha_firma_digital"]) ||
      extracted.fecha_firma,
    codigo_seguridad:
      firstValue(raw, ["codigo_seguridad", "security_code", "securityCode"]) ||
      firstValue(dgii, ["codigo_seguridad", "security_code"]) ||
      extracted.codigo_seguridad,
    monto_total: firstValue(raw, ["MontoTotal", "monto_total", "totalAmount"]),
    dgii_info: {
      ...dgii,
      track_id:
        firstValue(dgii, ["track_id", "trackId"]) || firstValue(raw, ["track_id", "trackId"]),
      fecha_recepcion: firstValue(dgii, ["fecha_recepcion", "receivedAt"]),
    },
    raw,
  };
}

async function proxyErrorMessage(error: any): Promise<string> {
  const context = error?.context;
  if (context && typeof context.clone === "function") {
    try {
      const body = await context.clone().json();
      return body?.message || body?.error || error?.message || "Error en EF2";
    } catch {}
  }
  return error?.message || "Error en EF2";
}

export class EF2Client {
  constructor(private readonly config: EF2ClientConfig = {}) {}

  private async execute<T = any>(action: EF2Action, payload: any = {}): Promise<T> {
    const credentials =
      action === "verificar_token" && (this.config.token || this.config.username)
        ? { token: this.config.token, username: this.config.username }
        : undefined;
    const { data, error } = await supabase.functions.invoke("ef2-proxy", {
      body: {
        action,
        payload,
        tenantId: this.config.tenantId,
        environment: this.config.environment,
        credentials,
      },
    });
    if (error) throw new Error(await proxyErrorMessage(error));
    if (data?.error && data?.success === false) throw new Error(data.message || data.error);
    return data as T;
  }

  verificarToken(): Promise<EF2VerifyTokenResponse> {
    return this.execute("verificar_token");
  }

  guardarCredenciales(): Promise<EF2VerifyTokenResponse> {
    if (!this.config.tenantId) throw new Error("tenantId es obligatorio para guardar credenciales.");
    if (!this.config.token?.trim()) throw new Error("Ingresa el token Bearer de EF2.");
    return this.execute("guardar_credenciales", {
      username: this.config.username,
      token: this.config.token,
    });
  }

  async procesarFactura(ecfJson: any): Promise<EF2ProcesarFacturaResponse> {
    return normalizeEF2FacturaResponse(await this.execute("procesar_factura", ecfJson));
  }

  consultarSecuencias(): Promise<EF2Response<EF2SecuenciaRango[]>> {
    return this.execute("consultar_secuencias");
  }

  consultarTiposECF(soloEmpresa = false): Promise<EF2Response<EF2TipoECF[]>> {
    return this.execute("consultar_tipos_ecf", { soloEmpresa });
  }

  consultarPrefijo(prefijo: string): Promise<EF2Response<any>> {
    return this.execute("consultar_prefijo", { prefijo });
  }

  consultarDisponibilidad(prefijo: string): Promise<EF2Response<any>> {
    return this.execute("disponibilidad_prefijo", { prefijo });
  }

  crearSecuencia(data: {
    tipo_ecf_id: number;
    prefijo: string;
    desde: number;
    hasta: number;
    secuencia_actual?: number;
    fecha_vencimiento?: string;
    estado?: boolean;
  }): Promise<EF2Response<EF2SecuenciaRango>> {
    return this.execute("crear_secuencia", data);
  }

  actualizarSecuencia(
    data: Partial<EF2SecuenciaRango> & { id: number },
  ): Promise<EF2Response<EF2SecuenciaRango>> {
    return this.execute("actualizar_secuencia", data);
  }

  eliminarSecuencia(id: number): Promise<EF2Response<{ id: number }>> {
    return this.execute("eliminar_secuencia", { id });
  }

  consultarAuditoria(query: {
    encf?: string;
    id_factura?: number | string;
    track_id?: string;
    monto_esperado?: number;
    incluir_xml_dgii?: boolean;
    incluir_notas?: boolean;
    solo_montos?: boolean;
  }): Promise<any> {
    return this.execute("auditoria_factura", query);
  }

  consultarAuditoriaLote(
    facturas: Array<Record<string, unknown>>,
    soloMontos = false,
  ): Promise<any> {
    return this.execute("auditoria_lote", { facturas, solo_montos: soloMontos });
  }
}

export function getEF2Client(config: Partial<EF2ClientConfig> = {}): EF2Client {
  return new EF2Client(config);
}
