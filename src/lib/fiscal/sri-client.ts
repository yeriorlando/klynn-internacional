/**
 * sri-client.ts — Cliente API para Facturación Electrónica SRI Ecuador
 * Integra Klynn Cloud con Open API Facturación SRI v2.0
 */

import { SRI_DEFAULT_API_URL, SRI_DEFAULT_ADMIN_EMAIL } from "./sri-constants";

export interface SRIEmisorPayload {
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  direccionMatriz: string;
  obligadoContabilidad?: boolean;
  contribuyenteEspecial?: string;
  agenteRetencion?: string;
  contribuyenteRimpe?: boolean;
  ambiente?: "1" | "2" | "pruebas" | "produccion";
  tenantId?: string;
}

export interface SRIPuntoEmisionPayload {
  establecimiento: string; // ej: "001"
  puntoEmision: string;   // ej: "001"
  direccionEstablecimiento?: string;
  descripcion?: string;
}

export interface SRIFacturaItem {
  codigoPrincipal: string;
  codigoAuxiliar?: string;
  descripcion: string;
  unidadMedida?: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  impuestos: Array<{
    codigo: string;          // "2" para IVA
    codigoPorcentaje: string;// "4" para 15%, "0" para 0%
    tarifa: number;          // 15 o 0
    baseImponible: number;
    valor: number;
  }>;
}

export interface SRIFacturaPayload {
  ambiente: "1" | "2";
  tipoEmision: "1" | "2";
  fechaEmision: string; // "dd/mm/yyyy"
  secuencial?: string;
  emisor: {
    ruc: string;
    razonSocial: string;
    nombreComercial?: string;
    dirMatriz: string;
    dirEstablecimiento?: string;
    establecimiento: string;
    puntoEmision: string;
    obligadoContabilidad: "SI" | "NO";
    contribuyenteEspecial?: string;
    agenteRetencion?: string;
    contribuyenteRimpe?: string;
  };
  comprador: {
    tipoIdentificacion: "04" | "05" | "06" | "07" | "08";
    identificacion: string;
    razonSocial: string;
    direccion?: string;
    telefono?: string;
    email?: string;
  };
  detalles: SRIFacturaItem[];
  pagos: Array<{
    formaPago: string; // "01", "16", "19", "20"
    total: number;
    plazo?: number;
    unidadTiempo?: "dias" | "meses" | "años";
  }>;
  infoAdicional?: Array<{
    nombre: string;
    valor: string;
  }>;
}

export interface SRIFacturaResponse {
  success: boolean;
  estado?: string;
  claveAcceso?: string;
  numeroAutorizacion?: string;
  fechaAutorizacion?: string;
  rideUrl?: string;
  xmlUrl?: string;
  error?: string;
  mensajes?: any[];
}

export class SRIClient {
  private baseUrl: string;
  private token: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(baseUrl: string = SRI_DEFAULT_API_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    // Recuperar token en caché si existe
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("klynn_sri_access_token");
      const exp = localStorage.getItem("klynn_sri_token_exp");
      if (cached && exp && Number(exp) > Date.now()) {
        this.token = cached;
        this.tokenExpiresAt = Number(exp);
      }
    }
  }

  /**
   * Guarda o actualiza el token de autenticación
   */
  setToken(token: string, expiresInSeconds: number = 86400) {
    this.token = token;
    this.tokenExpiresAt = Date.now() + (expiresInSeconds - 60) * 1000;
    if (typeof window !== "undefined") {
      localStorage.setItem("klynn_sri_access_token", token);
      localStorage.setItem("klynn_sri_token_exp", String(this.tokenExpiresAt));
    }
  }

  /**
   * Obtiene el token actual o lo renueva si expiró
   */
  async getAuthToken(): Promise<string> {
    if (this.token && this.tokenExpiresAt > Date.now()) {
      return this.token;
    }

    // Intentar auto-login con credenciales por defecto si no hay token
    const password = (typeof window !== "undefined" && (window as any).__KLYNN_SRI_PASSWORD) || "Yanse1789203";
    try {
      await this.login(SRI_DEFAULT_ADMIN_EMAIL, password);
      return this.token || "";
    } catch {
      return this.token || "";
    }
  }

  /**
   * Inicia sesión en la API del SRI y guarda el token JWT
   */
  async login(email: string, password: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || `Error al autenticar con API SRI (${res.status})`);
    }

    const data = await res.json();
    const token = data.accessToken;
    this.setToken(token, data.expiresIn || 86400);
    return token;
  }

  /**
   * Sube un certificado de firma electrónica .p12 o .pfx
   */
  async uploadCertificate(file: File, password: string): Promise<{ success: boolean; message: string; data?: any }> {
    const token = await this.getAuthToken();
    const formData = new FormData();
    formData.append("cert", file);
    formData.append("password", password);

    const res = await fetch(`${this.baseUrl}/certificates/upload-cert`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || `Error al subir el certificado (${res.status})`);
    }

    return await res.json();
  }

  /**
   * Lista los certificados activos en el servidor SRI
   */
  async listCertificates(): Promise<any[]> {
    const token = await this.getAuthToken();
    const res = await fetch(`${this.baseUrl}/certificates/list-certs`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.certs || []);
  }

  /**
   * Registra o actualiza el Emisor (Datos fiscales del cliente)
   */
  async saveEmisor(payload: SRIEmisorPayload): Promise<any> {
    const token = await this.getAuthToken();
    const res = await fetch(`${this.baseUrl}/emisores`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || `Error al guardar emisor en el SRI (${res.status})`);
    }

    return await res.json();
  }

  /**
   * Registra un Punto de Emisión (Establecimiento y Caja)
   */
  async savePuntoEmision(payload: SRIPuntoEmisionPayload): Promise<any> {
    const token = await this.getAuthToken();
    const res = await fetch(`${this.baseUrl}/puntos-emision`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || `Error al registrar punto de emisión (${res.status})`);
    }

    return await res.json();
  }

  /**
   * Emite una Factura Electrónica al SRI
   */
  async emitirFactura(factura: SRIFacturaPayload): Promise<SRIFacturaResponse> {
    const token = await this.getAuthToken();
    const res = await fetch(`${this.baseUrl}/sri/emitir/factura`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(factura),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        error: err.message || err.error || `Error de emisión SRI (${res.status})`,
        mensajes: err.mensajes || [],
      };
    }

    const data = await res.json();
    const claveAcceso = data.claveAcceso || data.data?.claveAcceso;

    return {
      success: true,
      estado: data.estado || data.data?.estado || "AUTORIZADO",
      claveAcceso,
      numeroAutorizacion: data.numeroAutorizacion || claveAcceso,
      fechaAutorizacion: data.fechaAutorizacion,
      rideUrl: claveAcceso ? `${this.baseUrl}/sri/comprobantes/${claveAcceso}/ride` : undefined,
      xmlUrl: claveAcceso ? `${this.baseUrl}/sri/comprobantes/${claveAcceso}/xml` : undefined,
    };
  }

  /**
   * Emite una Nota de Crédito Electrónica al SRI
   */
  async emitirNotaCredito(payload: any): Promise<SRIFacturaResponse> {
    const token = await this.getAuthToken();
    const res = await fetch(`${this.baseUrl}/sri/emitir/nota-credito`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        error: err.message || err.error || `Error al emitir Nota de Crédito SRI (${res.status})`,
        mensajes: err.mensajes || [],
      };
    }

    const data = await res.json();
    const claveAcceso = data.claveAcceso || data.data?.claveAcceso;

    return {
      success: true,
      estado: data.estado || data.data?.estado || "AUTORIZADO",
      claveAcceso,
      numeroAutorizacion: data.numeroAutorizacion || claveAcceso,
      fechaAutorizacion: data.fechaAutorizacion,
      rideUrl: claveAcceso ? `${this.baseUrl}/sri/comprobantes/${claveAcceso}/ride` : undefined,
      xmlUrl: claveAcceso ? `${this.baseUrl}/sri/comprobantes/${claveAcceso}/xml` : undefined,
    };
  }

  /**
   * Emite una Nota de Débito Electrónica al SRI
   */
  async emitirNotaDebito(payload: any): Promise<SRIFacturaResponse> {
    const token = await this.getAuthToken();
    const res = await fetch(`${this.baseUrl}/sri/emitir/nota-debito`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        error: err.message || err.error || `Error al emitir Nota de Débito SRI (${res.status})`,
        mensajes: err.mensajes || [],
      };
    }

    const data = await res.json();
    const claveAcceso = data.claveAcceso || data.data?.claveAcceso;

    return {
      success: true,
      estado: data.estado || data.data?.estado || "AUTORIZADO",
      claveAcceso,
      numeroAutorizacion: data.numeroAutorizacion || claveAcceso,
      fechaAutorizacion: data.fechaAutorizacion,
      rideUrl: claveAcceso ? `${this.baseUrl}/sri/comprobantes/${claveAcceso}/ride` : undefined,
      xmlUrl: claveAcceso ? `${this.baseUrl}/sri/comprobantes/${claveAcceso}/xml` : undefined,
    };
  }

  /**
   * Devuelve la URL directa para descargar el RIDE (PDF)
   */
  getRideUrl(claveAcceso: string): string {
    return `${this.baseUrl}/sri/comprobantes/${claveAcceso}/ride`;
  }

  /**
   * Devuelve la URL directa para descargar el XML autorizado
   */
  getXmlUrl(claveAcceso: string): string {
    return `${this.baseUrl}/sri/comprobantes/${claveAcceso}/xml`;
  }
}

// Instancia singleton por defecto
let defaultSRIClient: SRIClient | null = null;

export function getSRIClient(baseUrl?: string): SRIClient {
  if (!defaultSRIClient || baseUrl) {
    defaultSRIClient = new SRIClient(baseUrl);
  }
  return defaultSRIClient;
}
