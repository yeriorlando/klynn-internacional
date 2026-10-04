/**
 * sri-constants.ts — Constantes y catálogos oficiales del SRI Ecuador
 * Compatible con Open API Facturación SRI v2.0
 */

export const SRI_DEFAULT_API_URL = "https://sri-ec.klynncloud.com";

// Credenciales maestras por defecto para la comunicación interna de la plataforma
export const SRI_DEFAULT_ADMIN_EMAIL = "admin@klynncloud.com";

// Ambientes del SRI
export const SRI_AMBIENTES = {
  PRUEBAS: "1",
  PRODUCCION: "2",
} as const;

export type SRIAmbiente = "1" | "2";

// Tipos de Identificación según ficha técnica del SRI
export const SRI_TIPOS_IDENTIFICACION = [
  { codigo: "04", nombre: "RUC", longitud: 13, mascara: "9999999999001" },
  { codigo: "05", nombre: "Cédula", longitud: 10, mascara: "9999999999" },
  { codigo: "06", nombre: "Pasaporte", longitud: 20 },
  { codigo: "07", nombre: "Consumidor Final", defaultId: "9999999999999" },
  { codigo: "08", nombre: "Identificación del Exterior" },
] as const;

// Formas de Pago según catálogo oficial SRI
export const SRI_FORMAS_PAGO = [
  { codigo: "01", nombre: "Sin utilización del sistema financiero (Efectivo)" },
  { codigo: "16", nombre: "Tarjeta de Débito" },
  { codigo: "19", nombre: "Tarjeta de Crédito" },
  { codigo: "20", nombre: "Otros con utilización del sistema financiero (Transferencia / Depósito)" },
] as const;

// Códigos de Impuesto SRI (2 = IVA)
export const SRI_CODIGO_IMPUESTO_IVA = "2";

// Códigos porcentuales de tarifa IVA en Ecuador
// 4 = 15% (vigente en Ecuador), 0 = 0%, 2 = 12% (histórico), 6 = No objeto, 7 = Exento
export const SRI_TARIFAS_IVA = {
  IVA_15: { codigoPorcentaje: "4", tarifa: 15 },
  IVA_0: { codigoPorcentaje: "0", tarifa: 0 },
  NO_OBJETO: { codigoPorcentaje: "6", tarifa: 0 },
  EXENTO: { codigoPorcentaje: "7", tarifa: 0 },
} as const;
