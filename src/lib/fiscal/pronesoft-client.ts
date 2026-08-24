/**
 * Pronesoft eCF — Cliente oficial (Proxy Mode)
 *
 * Todas las llamadas se redirigen a la Edge Function 'pronesoft-proxy'
 * para evitar errores de CORS y proteger las credenciales del cliente.
 */
import { supabase } from "@/lib/supabase";

// ─── URLs por ambiente ──────────────────────────────────────────────────────
const PRONESOFT_BASE_URLS = {
  sandbox: "https://api.ecf.sandbox.pronesoft.com/api/v1",
  homologacion: "https://api.ecf.sandbox.pronesoft.com/api/v1",
  production:
    (import.meta.env.VITE_PRONESOFT_API_URL as string) || "https://api.ecf.pronesoft.com/api/v1",
};

const ECF_ENV = {
  sandbox: "TesteCF",
  homologacion: "CerteCF",
  production: "eCF",
};

export interface ProneSoftConfig {
  clientId: string;
  clientSecret: string;
  env: "sandbox" | "homologacion" | "production";
  tenantId?: string;
  klynnTenantId?: string;
}

export interface PaymentForm {
  method: "1" | "2" | "3" | "4" | "5";
  amount: number;
}

export interface ECFItem {
  lineNumber: number;
  name: string;
  type: "1" | "2";
  billingIndicator: "0" | "1" | "2" | "3" | "4";
  quantity: number;
  unitPrice: number;
  amount: number;
  discount?: number;
}

export interface ECFBuyer {
  name: string;
  taxId?: string; // eNCF requirement
  email?: string;
}

export interface ECFTotals {
  taxableAmount?: number;
  exemptAmount?: number;
  itbisRate1?: number;
  totalITBIS?: number;
  totalAmount: number;
  discountAmount?: number;
}

export interface ECFPayload {
  version?: string;
  invoiceType: "31" | "32" | "33" | "34" | "41" | "43" | "44" | "45" | "46" | "47";
  issueDate: string;
  invoiceNumber?: string;
  incomeType?: string; // e.g., "01"
  paymentForms: PaymentForm[];
  buyer?: ECFBuyer;
  items: ECFItem[];
  totals: ECFTotals;
  environment?: "TesteCF" | "CerteCF" | "eCF";
  creditNoteIndicator?: "0" | "1"; // Required for Type 34
  referenceInfo?: {
    modifiedInvoiceNumber: string;
    modifiedInvoiceDate: string; // YYYY-MM-DD
    modificationCode: string; // 01-05
  };
}

export interface ECFSubmitResponse {
  id: string;
  stampDate?: string | null;
  status: "REGISTERED" | "TO_SEND" | "WAITING_RESPONSE" | "TO_NOTIFY" | "FINISHED" | "ERROR";
  legalStatus?: "ACCEPTED" | "ACCEPTED_WITH_OBSERVATIONS" | "REJECTED" | "ERROR" | null;
  companyIdentification: Record<string, unknown>;
  trackId?: string | null;
  documentNumber?: string | null;
  encf?: string | null;
  contingencyMode?: boolean;
  contingencyMessage?: string | null;
  documentStampUrl?: string | null;
  pdf?: string | null;
  xmlUrl?: string | null;
  signatureDate?: string | null;
  securityCode?: string | null;
  sequenceConsumed: boolean;
}

export interface ECFStatusResponse extends ECFSubmitResponse {
  governmentResponse?: any;
  observations?: string[];
}

export interface AssociatedCompany {
  id: string;
  name: string;
  rnc: string;
}

export class ProneSoftClient {
  private config: ProneSoftConfig;
  private baseUrl: string;
  private ecfEnv: string;

  constructor(config: ProneSoftConfig) {
    this.config = config;

    this.baseUrl = PRONESOFT_BASE_URLS[config.env];
    this.ecfEnv = ECF_ENV[config.env];
  }

  private async callProxy(action: string, payload: any): Promise<any> {
    const { data, error } = await supabase.functions.invoke("pronesoft-proxy", {
      body: {
        action,
        payload,
        config: {
          baseUrl: this.baseUrl,
          ecfEnv: this.ecfEnv,
          tenantId: this.config.tenantId,
          klynnTenantId: this.config.klynnTenantId,
        },
      },
    });

    if (error) {
      console.error("Proxy Error:", error);
      let upstreamMessage = "";
      const context = (error as any)?.context;
      if (context && typeof context.clone === "function") {
        try {
          const responseBody = await context.clone().json();
          upstreamMessage = responseBody?.error || responseBody?.message || "";
        } catch {
          // El cuerpo puede no ser JSON; se conserva el mensaje de Supabase.
        }
      }
      throw new Error(
        upstreamMessage || `Error en Proxy Pronesoft: ${error.message || "Error desconocido"}`,
      );
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  }

  async getToken(): Promise<string> {
    return "proxy-handled";
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    return this.callProxy("test-connection", {});
  }

  async submitDocument(payload: ECFPayload, idempotencyKey?: string): Promise<ECFSubmitResponse> {
    const cleanPayload = {
      version: "1.0",
      ...payload,
    };
    // El SDK 0.0.9 envía el ambiente como parámetro de ruta. Aunque la guía
    // Sandbox menciona environment en el body, la API activa lo rechaza como
    // propiedad adicional ("property environment should not exist").
    delete (cleanPayload as any).environment;
    return this.callProxy("submit", { ...cleanPayload, _klynnIdempotencyKey: idempotencyKey });
  }

  async getDocumentStatus(documentId: string): Promise<ECFStatusResponse> {
    if (!documentId) throw new Error("Falta el ID de Pronesoft para consultar el e-CF");
    return this.callProxy("status", { documentId });
  }

  async createAssociatedCompany(data: {
    rnc: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
  }): Promise<AssociatedCompany> {
    return this.callProxy("register-company", data);
  }

  async listAssociatedCompanies(params?: { page?: number; limit?: number }): Promise<any> {
    return this.callProxy("list-associated-companies", params || {});
  }

  async uploadCertificate(data: {
    certificate: string;
    password: string;
    rnc: string;
  }): Promise<{ ok: boolean }> {
    return this.callProxy("upload-cert", data);
  }
  async listSequences(params?: { type?: string; page?: number; limit?: number }): Promise<any> {
    return this.callProxy("list-sequences", params || {});
  }

  async createSequence(data: {
    type: string;
    from: number;
    to: number;
    quantity?: number;
    expiration?: string;
  }): Promise<any> {
    return this.callProxy("create-sequence", data);
  }

  async getNextNumber(type: string): Promise<any> {
    return this.callProxy("get-next-number", { type });
  }

  async voidSequences(data: {
    sequenceId: string;
    invoiceType?: string;
    startNumber: string;
    endNumber: string;
    reason: string;
  }): Promise<any> {
    return this.callProxy("void-sequences", data);
  }

  async getRNC(rnc: string): Promise<{ name: string; rnc: string; status: string }> {
    return this.callProxy("get-rnc", { rnc });
  }

  async listSentDocuments(page: number = 1, pageSize: number = 50, type?: string): Promise<any> {
    return this.callProxy("list-sent-documents", { page, pageSize, type });
  }

  async getSentDocument(documentId: string): Promise<any> {
    if (!documentId) throw new Error("Falta el ID de Pronesoft para consultar el detalle del e-CF");
    return this.callProxy("get-sent-document", { documentId });
  }

  async getSentDocumentLogs(documentId: string): Promise<any[]> {
    if (!documentId) throw new Error("Falta el ID de Pronesoft para consultar los logs del e-CF");
    return this.callProxy("get-sent-document-logs", { documentId });
  }

  async listReceivedDocuments(page: number = 1, pageSize: number = 50): Promise<any> {
    return this.callProxy("list-received-documents", { page, pageSize });
  }

  async submitCommercialApproval(
    documentId: string,
    status: "ACCEPTED" | "REJECTED",
    details?: string,
  ): Promise<any> {
    return this.callProxy("commercial-approval", { documentId, status, details });
  }

  async export606(period: string): Promise<{ text: string; type: string }> {
    return this.callProxy("export-606", { period });
  }

  async exportSentDocuments(period: string): Promise<{ base64: string; type: string }> {
    return this.callProxy("export-sent-documents", { period });
  }
}

export type ProneSoftEnvironment = "sandbox" | "homologacion" | "production";

export function getProneSoftClient(
  tenantId?: string,
  forceEnv?: ProneSoftEnvironment,
  _customClientId?: string,
  _customClientSecret?: string,
  klynnTenantId?: string,
): ProneSoftClient {
  const env = forceEnv || "sandbox";
  return new ProneSoftClient({
    // Las credenciales solo existen como secretos de la Edge Function. Se
    // mantienen estos parámetros por compatibilidad con llamadas antiguas,
    // pero nunca se envían ni se incluyen en el bundle del navegador.
    clientId: "",
    clientSecret: "",
    env,
    tenantId,
    klynnTenantId,
  });
}
