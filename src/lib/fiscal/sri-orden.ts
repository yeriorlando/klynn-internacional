/**
 * sri-orden.ts — Mapeo y emisión de facturas electrónicas SRI Ecuador para órdenes
 */

import type { Orden, Cliente, Tenant } from "@/lib/storage";
import { getSRIClient, type SRIFacturaPayload, type SRIFacturaResponse } from "./sri-client";
import { SRI_TARIFAS_IVA, SRI_CODIGO_IMPUESTO_IVA } from "./sri-constants";

function formatFechaSRI(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function resolveTipoIdentificacion(ident: string = ""): "04" | "05" | "06" | "07" | "08" {
  const clean = ident.replace(/\D/g, "");
  if (clean.length === 13) return "04"; // RUC
  if (clean.length === 10) return "05"; // Cédula
  if (clean === "9999999999999" || !clean) return "07"; // Consumidor Final
  return "06"; // Pasaporte / Otros
}

function resolveMetodoPagoSRI(metodo: string = ""): string {
  const m = metodo.toLowerCase();
  if (m.includes("debito") || m.includes("débito")) return "16"; // Tarjeta de Débito
  if (m.includes("tarjeta") || m.includes("credito") || m.includes("crédito")) return "19"; // Tarjeta de Crédito
  if (m.includes("transf") || m.includes("deposito") || m.includes("depósito")) return "20"; // Otros con sist financiero
  return "01"; // Efectivo (Sin utilización del sistema financiero)
}

/**
 * Emite una factura electrónica SRI para una orden de lavandería
 */
export async function emitirFacturaSRI(
  orden: Orden,
  cliente: Cliente,
  tenant: Tenant
): Promise<SRIFacturaResponse> {
  const sri = tenant.config?.sri_config;
  if (!sri) {
    throw new Error("La configuración del SRI no está inicializada para este negocio.");
  }
  if (!sri.ruc) {
    throw new Error("No se ha configurado el RUC del emisor para SRI Ecuador.");
  }

  const ambiente = sri.ambiente === "2" ? "2" : "1";
  const fechaEmision = formatFechaSRI(new Date(orden.creado_en || Date.now()));

  // Identificación del comprador
  const rawId = (cliente.rnc || cliente.cedula || "").trim();
  const cleanId = rawId.replace(/\D/g, "");
  const esConsumidorFinal = !cleanId || cleanId === "9999999999999" || rawId.toUpperCase().includes("CONSUMIDOR");
  
  const tipoIdentificacion = esConsumidorFinal ? "07" : resolveTipoIdentificacion(rawId);
  const identificacion = esConsumidorFinal ? "9999999999999" : (cleanId || rawId);
  const razonSocialComprador = esConsumidorFinal ? "CONSUMIDOR FINAL" : (cliente.nombre || "CONSUMIDOR FINAL");

  // Tarifa IVA vigente en Ecuador (15%)
  const tieneIVA = Number(orden.itbis || 0) > 0;
  const codigoPorcentaje = tieneIVA ? SRI_TARIFAS_IVA.IVA_15.codigoPorcentaje : SRI_TARIFAS_IVA.IVA_0.codigoPorcentaje;
  const tarifaPorcentaje = tieneIVA ? 15 : 0;

  // Detalles de los servicios/prendas
  const detalles = (orden.items && orden.items.length > 0 ? orden.items : [
    {
      servicio_id: "SRV-GEN",
      descripcion: "Servicio de Lavandería",
      cantidad: 1,
      precio_unitario: orden.subtotal || orden.total,
    }
  ]).map((it, idx) => {
    const cant = Number(it.cantidad) || 1;
    const precio = Number(it.precio_unitario) || 0;
    const base = Number((cant * precio).toFixed(2));
    const ivaVal = tieneIVA ? Number((base * 0.15).toFixed(2)) : 0;

    return {
      codigoPrincipal: (it as any).servicio_id || (it as any).prenda_id || `ITEM-${idx + 1}`,
      descripcion: it.descripcion || "Servicio de Lavandería",
      cantidad: cant,
      precioUnitario: precio,
      descuento: 0,
      impuestos: [
        {
          codigo: SRI_CODIGO_IMPUESTO_IVA, // "2" = IVA
          codigoPorcentaje,                 // "4" = 15%, "0" = 0%
          tarifa: tarifaPorcentaje,
          baseImponible: base,
          valor: ivaVal,
        },
      ],
    };
  });

  const formaPago = resolveMetodoPagoSRI(orden.metodo_pago);

  const payload: SRIFacturaPayload = {
    ambiente,
    tipoEmision: "1",
    fechaEmision,
    emisor: {
      ruc: sri.ruc,
      razonSocial: sri.razon_social || tenant.razon_social || tenant.nombre,
      nombreComercial: sri.nombre_comercial || tenant.nombre,
      dirMatriz: sri.direccion_matriz || tenant.direccion || tenant.provincia || "Ecuador",
      dirEstablecimiento: sri.direccion_establecimiento || sri.direccion_matriz || tenant.direccion || "Ecuador",
      establecimiento: sri.establecimiento || "001",
      puntoEmision: sri.punto_emision || "001",
      obligadoContabilidad: sri.obligado_contabilidad ? "SI" : "NO",
      contribuyenteRimpe: sri.contribuyente_rimpe ? "CONTRIBUYENTE RÉGIMEN RIMPE" : undefined,
    },
    comprador: {
      tipoIdentificacion,
      identificacion,
      razonSocial: razonSocialComprador,
      direccion: cliente.direccion || undefined,
      telefono: cliente.telefono || undefined,
      email: cliente.email || undefined,
    },
    detalles,
    pagos: [
      {
        formaPago,
        total: Number(orden.total.toFixed(2)),
      },
    ],
    infoAdicional: [
      { nombre: "Orden Klynn", valor: orden.numero || orden.id },
      ...(sri.contribuyente_rimpe ? [{ nombre: "Régimen", valor: "Contribuyente Régimen RIMPE" }] : []),
    ],
  };

  const client = getSRIClient();
  return await client.emitirFactura(payload);
}

/**
 * Emite una factura de prueba en el ambiente de Sandbox para validar certificados y conexión
 */
export async function emitirFacturaSRIPrueba(tenant: Tenant): Promise<SRIFacturaResponse> {
  const sri = tenant.config?.sri_config;
  if (!sri?.ruc) {
    throw new Error("RUC del emisor requerido para la prueba.");
  }

  const payload: SRIFacturaPayload = {
    ambiente: "1", // Siempre pruebas en simulador
    tipoEmision: "1",
    fechaEmision: formatFechaSRI(new Date()),
    emisor: {
      ruc: sri.ruc,
      razonSocial: sri.razon_social || tenant.nombre,
      nombreComercial: sri.nombre_comercial || tenant.nombre,
      dirMatriz: sri.direccion_matriz || "Quito, Ecuador",
      dirEstablecimiento: sri.direccion_establecimiento || "Quito, Ecuador",
      establecimiento: sri.establecimiento || "001",
      puntoEmision: sri.punto_emision || "001",
      obligadoContabilidad: sri.obligado_contabilidad ? "SI" : "NO",
      contribuyenteRimpe: sri.contribuyente_rimpe ? "CONTRIBUYENTE RÉGIMEN RIMPE" : undefined,
    },
    comprador: {
      tipoIdentificacion: "07",
      identificacion: "9999999999999",
      razonSocial: "CONSUMIDOR FINAL PRUEBA",
      email: tenant.email || "pruebas@klynncloud.com",
    },
    detalles: [
      {
        codigoPrincipal: "TEST-01",
        descripcion: "Prueba de Integración Facturación Klynn Cloud",
        cantidad: 1,
        precioUnitario: 1.0,
        descuento: 0,
        impuestos: [
          {
            codigo: "2",
            codigoPorcentaje: "4", // 15%
            tarifa: 15,
            baseImponible: 1.0,
            valor: 0.15,
          },
        ],
      },
    ],
    pagos: [
      {
        formaPago: "01",
        total: 1.15,
      },
    ],
    infoAdicional: [
      { nombre: "Prueba", valor: "Verificación de Microservicio SRI" },
    ],
  };

  const client = getSRIClient();
  return await client.emitirFactura(payload);
}

export interface SRINotaCreditoParams {
  orden: Orden;
  cliente: Cliente;
  tenant: Tenant;
  motivo: string;
  montoDevolucion?: number;
}

/**
 * Emite una Nota de Crédito oficial autorizada por el SRI Ecuador (código 04)
 */
export async function emitirNotaCreditoSRI(params: SRINotaCreditoParams): Promise<SRIFacturaResponse> {
  const { orden, cliente, tenant, motivo, montoDevolucion } = params;
  const sri = tenant.config?.sri_config;
  if (!sri?.ruc) throw new Error("RUC del emisor requerido.");

  const ambiente = sri.ambiente === "2" ? "2" : "1";
  const fechaEmision = formatFechaSRI(new Date());
  const fechaDocSustento = formatFechaSRI(new Date(orden.creado_en || Date.now()));

  const rawId = (cliente.rnc || cliente.cedula || "").trim();
  const cleanId = rawId.replace(/\D/g, "");
  const esConsumidorFinal = !cleanId || cleanId === "9999999999999";
  const tipoIdentificacion = esConsumidorFinal ? "07" : resolveTipoIdentificacion(rawId);
  const identificacion = esConsumidorFinal ? "9999999999999" : (cleanId || rawId);
  const razonSocial = esConsumidorFinal ? "CONSUMIDOR FINAL" : (cliente.nombre || "CONSUMIDOR FINAL");

  const montoTotal = montoDevolucion !== undefined ? Number(montoDevolucion) : Number(orden.total);
  const baseImponible = Number((montoTotal / 1.15).toFixed(2));
  const valorIVA = Number((montoTotal - baseImponible).toFixed(2));

  const numDocModificado = orden.sri_secuencial || `${sri.establecimiento || "001"}-${sri.punto_emision || "001"}-${String(orden.numero).padStart(9, "0")}`;

  const payload = {
    ambiente,
    tipoEmision: "1",
    fechaEmision,
    emisor: {
      ruc: sri.ruc,
      razonSocial: sri.razon_social || tenant.nombre,
      nombreComercial: sri.nombre_comercial || tenant.nombre,
      dirMatriz: sri.direccion_matriz || "Ecuador",
      dirEstablecimiento: sri.direccion_establecimiento || sri.direccion_matriz || "Ecuador",
      establecimiento: sri.establecimiento || "001",
      puntoEmision: sri.punto_emision || "001",
      obligadoContabilidad: sri.obligado_contabilidad ? "SI" : "NO",
      contribuyenteRimpe: sri.contribuyente_rimpe ? "CONTRIBUYENTE RÉGIMEN RIMPE" : undefined,
    },
    comprador: {
      tipoIdentificacion,
      identificacion,
      razonSocial,
      direccion: cliente.direccion || undefined,
      telefono: cliente.telefono || undefined,
      email: cliente.email || undefined,
    },
    codDocModificado: "01", // 01 = Factura
    numDocModificado,
    fechaEmisionDocSustento: fechaDocSustento,
    motivo: motivo || "Anulación / Devolución de servicios",
    detalles: [
      {
        codigoInterno: "NC-01",
        descripcion: `Nota de Crédito a Factura ${numDocModificado} - ${motivo}`,
        cantidad: 1,
        precioUnitario: baseImponible,
        descuento: 0,
        impuestos: [
          {
            codigo: "2",
            codigoPorcentaje: "4",
            tarifa: 15,
            baseImponible,
            valor: valorIVA,
          },
        ],
      },
    ],
  };

  const client = getSRIClient();
  return await client.emitirNotaCredito(payload);
}

export interface SRINotaDebitoParams {
  orden: Orden;
  cliente: Cliente;
  tenant: Tenant;
  motivo: string;
  montoAdicional: number;
}

/**
 * Emite una Nota de Débito oficial autorizada por el SRI Ecuador (código 05)
 */
export async function emitirNotaDebitoSRI(params: SRINotaDebitoParams): Promise<SRIFacturaResponse> {
  const { orden, cliente, tenant, motivo, montoAdicional } = params;
  const sri = tenant.config?.sri_config;
  if (!sri?.ruc) throw new Error("RUC del emisor requerido.");

  const ambiente = sri.ambiente === "2" ? "2" : "1";
  const fechaEmision = formatFechaSRI(new Date());
  const fechaDocSustento = formatFechaSRI(new Date(orden.creado_en || Date.now()));

  const rawId = (cliente.rnc || cliente.cedula || "").trim();
  const cleanId = rawId.replace(/\D/g, "");
  const esConsumidorFinal = !cleanId || cleanId === "9999999999999";
  const tipoIdentificacion = esConsumidorFinal ? "07" : resolveTipoIdentificacion(rawId);
  const identificacion = esConsumidorFinal ? "9999999999999" : (cleanId || rawId);
  const razonSocial = esConsumidorFinal ? "CONSUMIDOR FINAL" : (cliente.nombre || "CONSUMIDOR FINAL");

  const montoTotal = Number(montoAdicional);
  const baseImponible = Number((montoTotal / 1.15).toFixed(2));
  const valorIVA = Number((montoTotal - baseImponible).toFixed(2));

  const numDocModificado = orden.sri_secuencial || `${sri.establecimiento || "001"}-${sri.punto_emision || "001"}-${String(orden.numero).padStart(9, "0")}`;

  const payload = {
    ambiente,
    tipoEmision: "1",
    fechaEmision,
    emisor: {
      ruc: sri.ruc,
      razonSocial: sri.razon_social || tenant.nombre,
      nombreComercial: sri.nombre_comercial || tenant.nombre,
      dirMatriz: sri.direccion_matriz || "Ecuador",
      dirEstablecimiento: sri.direccion_establecimiento || sri.direccion_matriz || "Ecuador",
      establecimiento: sri.establecimiento || "001",
      puntoEmision: sri.punto_emision || "001",
      obligadoContabilidad: sri.obligado_contabilidad ? "SI" : "NO",
      contribuyenteRimpe: sri.contribuyente_rimpe ? "CONTRIBUYENTE RÉGIMEN RIMPE" : undefined,
    },
    comprador: {
      tipoIdentificacion,
      identificacion,
      razonSocial,
      direccion: cliente.direccion || undefined,
      telefono: cliente.telefono || undefined,
      email: cliente.email || undefined,
    },
    codDocModificado: "01",
    numDocModificado,
    fechaEmisionDocSustento: fechaDocSustento,
    motivos: [
      {
        razon: motivo || "Cargo por ajuste o servicio adicional",
        valor: baseImponible,
      },
    ],
    impuestos: [
      {
        codigo: "2",
        codigoPorcentaje: "4",
        tarifa: 15,
        baseImponible,
        valor: valorIVA,
      },
    ],
  };

  const client = getSRIClient();
  return await client.emitirNotaDebito(payload);
}
