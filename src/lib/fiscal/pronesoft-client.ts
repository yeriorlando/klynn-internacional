/**
 * Pronesoft eCF — Cliente oficial (Proxy Mode)
 *
 * Todas las llamadas se redirigen a la Edge Function 'pronesoft-proxy'
 * para evitar errores de CORS y proteger las credenciales del cliente.
 */
import { supabase } from '@/lib/supabase';

// ─── URLs por ambiente ──────────────────────────────────────────────────────
const PRONESOFT_BASE_URLS = {
  sandbox: 'https://api.ecf.sandbox.pronesoft.com/api/v1',
  production: 'https://api.ecf.pronesoft.com/api/v1',
};

const ECF_ENV = {
  sandbox: 'TesteCF',
  homologacion: 'CerteCF',
  production: 'eCF',
};

export interface ProneSoftConfig {
  clientId: string;
  clientSecret: string;
  env: 'sandbox' | 'production';
  tenantId?: string;
}

export interface PaymentForm {
  method: '1' | '2' | '3' | '4' | '5';
  amount: number;
}

export interface ECFItem {
  lineNumber: number;
  name: string;
  type: '1' | '2';
  billingIndicator: '0' | '1' | '2' | '3' | '4';
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
  taxableAmount: number;
  itbisRate1?: number;
  totalITBIS?: number;
  totalAmount: number;
  discountAmount?: number;
}

export interface ECFPayload {
  version?: string;
  invoiceType: '31' | '32' | '33' | '34' | '41' | '43' | '44' | '45' | '46' | '47';
  issueDate: string;
  invoiceNumber?: string;
  incomeType?: string; // e.g., "01"
  paymentForms: PaymentForm[];
  buyer?: ECFBuyer;
  items: ECFItem[];
  totals: ECFTotals;
  environment?: 'TesteCF' | 'CerteCF' | 'eCF';
  creditNoteIndicator?: '0' | '1'; // Required for Type 34
  referenceInfo?: {
    modifiedInvoiceNumber: string;
    modifiedInvoiceDate: string; // YYYY-MM-DD
    modificationCode: string; // 01-05
  };
}

export interface ECFSubmitResponse {
  id: string;
  stampDate: string;
  status: 'REGISTERED' | 'TO_SEND' | 'WAITING_RESPONSE' | 'FINISHED' | 'ERROR';
  legalStatus?: 'ACCEPTED' | 'ACCEPTED_WITH_OBSERVATIONS' | 'REJECTED';
  companyIdentification: string;
  encf: string;
  contingencyMode: boolean;
  documentStampUrl: string;
  pdf: string;
  xmlUrl: string;
  signatureDate: string;
  securityCode: string;
  sequenceConsumed: boolean;
}

export interface ECFStatusResponse extends ECFSubmitResponse {
  dgiiResponse?: any;
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
    this.ecfEnv = config.env === 'sandbox' ? ECF_ENV.sandbox : ECF_ENV.production;
  }

  private async callProxy(action: string, payload: any): Promise<any> {
    const { data, error } = await supabase.functions.invoke('pronesoft-proxy', {
      body: {
        action,
        payload,
        config: {
          baseUrl: this.baseUrl,
          ecfEnv: this.ecfEnv,
          clientId: this.config.clientId,
          clientSecret: this.config.clientSecret,
          tenantId: this.config.tenantId,
        }
      }
    });

    if (error) {
      console.error("Proxy Error:", error);
      throw new Error(`Error en Proxy Pronesoft: ${error.message || 'Error desconocido'}`);
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
    return this.callProxy('test-connection', {});
  }

  async submitDocument(payload: ECFPayload): Promise<ECFSubmitResponse> {
    const cleanPayload = {
      version: '1.0',
      ...payload
    };
    // El campo environment NO debe ir en el body del payload (genera error 400),
    // se maneja a nivel de path/SDK en el proxy.
    delete (cleanPayload as any).environment;
    return this.callProxy('submit', cleanPayload);
  }

  async createAssociatedCompany(data: { rnc: string; name: string }): Promise<AssociatedCompany> {
    return this.callProxy('register-company', data);
  }

  async uploadCertificate(data: { certificate: string; password: string; rnc: string }): Promise<{ ok: boolean }> {
    return this.callProxy('upload-cert', data);
  }
  async importSequences(fileBase64: string): Promise<{ ok: boolean }> {
    return this.callProxy('import-sequences', { file: fileBase64 });
  }

  async getRNC(rnc: string): Promise<{ name: string; rnc: string; status: string }> {
    return this.callProxy('get-rnc', { rnc });
  }
}

export function getProneSoftClient(tenantId?: string, forceEnv?: 'sandbox' | 'production'): ProneSoftClient {
  const env = forceEnv || (import.meta.env.VITE_PRONESOFT_ENV as 'sandbox' | 'production') || 'sandbox';
  return new ProneSoftClient({
    clientId: import.meta.env.VITE_PRONESOFT_CLIENT_ID ?? '',
    clientSecret: import.meta.env.VITE_PRONESOFT_CLIENT_SECRET ?? '',
    env,
    tenantId,
  });
}
