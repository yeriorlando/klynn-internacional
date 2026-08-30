/** Convierte una orden Klynn al JSON ECF exigido por EF2/DGII. */
import type { Cliente, Orden, Tenant, TenantConfig } from "../storage";
import { EF2_DEFAULT_TEST_EMPRESA, EF2_DEFAULT_TEST_RNC } from "./ef2-constants.ts";

const NCF_TO_EF2_TYPE: Record<string, string> = {
  B01: "31",
  B02: "32",
  B14: "44",
  B15: "45",
  B16: "46",
  E31: "31",
  E32: "32",
  E33: "33",
  E34: "34",
  E41: "41",
  E43: "43",
  E44: "44",
  E45: "45",
  E46: "46",
  E47: "47",
};

export interface EF2Reference {
  ncf: string;
  date?: string;
  code?: string;
  reason?: string;
}

function money(value: number) {
  return Math.max(0, Number.isFinite(value) ? value : 0).toFixed(2);
}

function dateDO(value: string | Date = new Date()) {
  if (typeof value === "string") {
    const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
    if (isoDate) return `${isoDate[3]}-${isoDate[2]}-${isoDate[1]}`;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return dateDO(new Date());
  return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
}

function normalizeTaxId(value?: string) {
  return String(value || "").replace(/\D/g, "");
}

function validTaxId(value?: string) {
  const digits = normalizeTaxId(value);
  return digits.length === 9 || digits.length === 11;
}

function paymentType(order: Orden) {
  if (order.saldo > 0 || order.metodo_pago === "CREDITO") return "2";
  return "1";
}

function buildLines(order: Orden, taxableBase: number, exemptBase: number) {
  const raw = (order.items || []).map((item) => ({
    name: item.descripcion || "Servicio de lavandería",
    quantity: Math.max(0.001, Number(item.cantidad || 1)),
    amount: Math.max(0, Number(item.cantidad || 1) * Number(item.precio_unitario || 0)),
    exempt: Boolean(item.is_exento),
  }));

  const rawTaxable = raw.filter((line) => !line.exempt).reduce((sum, line) => sum + line.amount, 0);
  const rawExempt = raw.filter((line) => line.exempt).reduce((sum, line) => sum + line.amount, 0);
  const knownBase = rawTaxable + rawExempt;
  const expectedBase = Math.max(0, Number(order.subtotal || 0));
  if (expectedBase > knownBase + 0.009) {
    raw.push({
      name: (order.servicios || []).length
        ? `Servicios: ${order.servicios.join(", ")}`
        : "Servicios y ajustes de lavandería",
      quantity: 1,
      amount: expectedBase - knownBase,
      exempt: false,
    });
  }

  if (raw.length === 0) {
    raw.push({ name: "Servicio de lavandería", quantity: 1, amount: taxableBase || exemptBase, exempt: exemptBase > 0 });
  }

  const taxableRawTotal = raw.filter((line) => !line.exempt).reduce((sum, line) => sum + line.amount, 0);
  const exemptRawTotal = raw.filter((line) => line.exempt).reduce((sum, line) => sum + line.amount, 0);
  let taxableAllocated = 0;
  let exemptAllocated = 0;

  const lines = raw.map((line, index) => {
    const sameGroup = raw.filter((candidate) => candidate.exempt === line.exempt);
    const isLast = sameGroup[sameGroup.length - 1] === line;
    const target = line.exempt ? exemptBase : taxableBase;
    const rawTotal = line.exempt ? exemptRawTotal : taxableRawTotal;
    const already = line.exempt ? exemptAllocated : taxableAllocated;
    const amount = isLast
      ? Math.max(0, target - already)
      : Math.max(0, rawTotal > 0 ? (line.amount / rawTotal) * target : target / sameGroup.length);
    const rounded = Number(amount.toFixed(2));
    if (line.exempt) exemptAllocated += rounded;
    else taxableAllocated += rounded;
    const unit = rounded / line.quantity;
    return {
      NumeroLinea: String(index + 1),
      IndicadorFacturacion: line.exempt ? "4" : "1",
      NombreItem: line.name.slice(0, 80),
      IndicadorBienoServicio: "2",
      CantidadItem: String(line.quantity),
      UnidadMedida: "43",
      PrecioUnitarioItem: money(unit),
      MontoItem: money(rounded),
    };
  });

  const allocated = taxableAllocated + exemptAllocated;
  const target = taxableBase + exemptBase;
  if (Math.abs(target - allocated) >= 0.01) {
    const residual = Number((target - allocated).toFixed(2));
    lines.push({
      NumeroLinea: String(lines.length + 1),
      IndicadorFacturacion: residual > 0 && taxableBase > 0 ? "1" : "4",
      NombreItem: "Ajuste de total de la orden",
      IndicadorBienoServicio: "2",
      CantidadItem: "1",
      UnidadMedida: "43",
      PrecioUnitarioItem: money(Math.abs(residual)),
      MontoItem: money(Math.abs(residual)),
    });
  }
  return lines;
}

export function ordenToEF2Payload(
  order: Orden,
  customer: Cliente | null,
  config: TenantConfig,
  tenant: Tenant,
  type?: string,
  reference?: EF2Reference,
  sequenceExpiration?: string,
) {
  const typeCode = NCF_TO_EF2_TYPE[type || order.tipo_ecf || config.ncf_secuencia || "E32"] || "32";
  const issueDate = dateDO(order.creado_en || new Date());
  const issuerRnc = normalizeTaxId(tenant.rnc);
  const isTestIssuer = !validTaxId(issuerRnc) || tenant.rnc?.toUpperCase().startsWith("SBX");
  const rncEmisor = isTestIssuer ? EF2_DEFAULT_TEST_RNC : issuerRnc;
  const issuerName = isTestIssuer
    ? EF2_DEFAULT_TEST_EMPRESA
    : tenant.nombre || "Empresa emisora";

  const totalBeforeDelivery = Math.max(0, Number(order.subtotal || 0) + Number(order.itbis || 0));
  const discountFactor = totalBeforeDelivery > 0
    ? Math.max(0, Math.min(1, (totalBeforeDelivery - Number(order.descuento || 0)) / totalBeforeDelivery))
    : 1;
  const itbis = Number((Number(order.itbis || 0) * discountFactor).toFixed(2));
  const netBase = Number((Number(order.subtotal || 0) * discountFactor).toFixed(2));
  const gross = Number(order.total || 0);

  const rawTaxable = (order.items || [])
    .filter((item) => !item.is_exento)
    .reduce((sum, item) => sum + Number(item.cantidad || 1) * Number(item.precio_unitario || 0), 0);
  const rawExempt = (order.items || [])
    .filter((item) => item.is_exento)
    .reduce((sum, item) => sum + Number(item.cantidad || 1) * Number(item.precio_unitario || 0), 0);
  const rawBase = rawTaxable + rawExempt;
  const taxableShare = rawBase > 0 ? rawTaxable / rawBase : itbis > 0 ? 1 : 0;
  let taxableBase = itbis > 0 ? Number((netBase * taxableShare).toFixed(2)) : 0;
  let exemptBase = Number((gross - taxableBase - itbis).toFixed(2));
  if (exemptBase < 0) {
    taxableBase = Number((gross - itbis).toFixed(2));
    exemptBase = 0;
  }

  const idDoc: Record<string, string> = {
    TipoeCF: typeCode,
    TipoIngresos: "01",
    TipoPago: paymentType(order),
  };
  // E33, E44 y E47 no usan este indicador en los ejemplos oficiales de EF2.
  if (!["33", "44", "47"].includes(typeCode)) {
    idDoc.IndicadorMontoGravado = config.itbis_incluido ? "1" : "0";
  }
  if (typeCode === "32") {
    idDoc.FechaLimitePago = dateDO(new Date(Date.now() + 30 * 86400000));
  } else if (sequenceExpiration && typeCode !== "34") {
    idDoc.FechaVencimientoSecuencia = dateDO(sequenceExpiration);
  }
  if (typeCode === "34") idDoc.IndicadorNotaCredito = "0";

  const header: Record<string, any> = {
    Version: "1.0",
    IdDoc: idDoc,
    Emisor: {
      RNCEmisor: rncEmisor,
      RazonSocialEmisor: issuerName,
      NombreComercial: tenant.nombre || issuerName,
      DireccionEmisor: tenant.direccion || "Santo Domingo, República Dominicana",
      Municipio: "010100",
      Provincia: "010000",
      CorreoEmisor: tenant.email || "facturacion@klynn.app",
      FechaEmision: issueDate,
    },
  };

  const buyerTaxId = normalizeTaxId(customer?.cedula);
  const referencedType = String(reference?.ncf || "").substring(0, 3).toUpperCase();
  const isConsumerContext = typeCode === "32" || (["33", "34"].includes(typeCode) && referencedType === "E32");
  const needsBuyer = typeCode !== "43" && (!isConsumerContext || gross >= 250000);
  if (needsBuyer) {
    if (!customer || (typeCode !== "47" && !validTaxId(buyerTaxId))) {
      throw new Error(`El comprobante E${typeCode} requiere un RNC o cédula válido del comprador.`);
    }
    header.Comprador = {
      ...(typeCode === "47"
        ? { IdentificadorExtranjero: customer.cedula || customer.id }
        : { RNCComprador: buyerTaxId }),
      RazonSocialComprador: `${customer.nombre || ""} ${customer.apellido || ""}`.trim(),
      CorreoComprador: customer.email || undefined,
      DireccionComprador: customer.direccion || "República Dominicana",
      MunicipioComprador: "010100",
      ProvinciaComprador: "010000",
    };
  }

  if (typeCode === "33" || typeCode === "34") {
    if (!reference?.ncf) throw new Error(`La nota E${typeCode} requiere el e-NCF original.`);
    header.InformacionReferencia = {
      NCFModificado: reference.ncf,
      FechaNCFModificado: dateDO(reference.date || order.creado_en),
      CodigoModificacion: String(reference.code || "1").replace(/^0/, ""),
      RazonModificacion: reference.reason || "Ajuste de la orden",
    };
  }

  // EF2 define la Nota de Débito (E33) con totales simplificados. Aunque la
  // orden original tenga ITBIS, el ajuste se remite como MontoExento para no
  // enviar campos gravados que el esquema E33 no contempla.
  const isDebitNote = typeCode === "33";
  const totals: Record<string, string> = isDebitNote
    ? { MontoExento: money(gross), MontoTotal: money(gross) }
    : { MontoTotal: money(gross) };
  if (!isDebitNote && (taxableBase > 0 || itbis > 0)) {
    totals.MontoGravadoTotal = money(taxableBase);
    totals.MontoGravadoI1 = money(taxableBase);
    totals.ITBIS1 = "18";
    totals.TotalITBIS = money(itbis);
    totals.TotalITBIS1 = money(itbis);
  }
  if (!isDebitNote && exemptBase > 0) totals.MontoExento = money(exemptBase);
  header.Totales = totals;

  const detailOrder = isDebitNote
    ? {
        ...order,
        subtotal: gross,
        itbis: 0,
        items: (order.items || []).map((item) => ({ ...item, is_exento: true })),
      }
    : order;

  return {
    _klynnOrderId: order.id,
    ECF: {
      Encabezado: header,
      DetallesItems: {
        Item: buildLines(detailOrder, isDebitNote ? 0 : taxableBase, isDebitNote ? gross : exemptBase),
      },
    },
  };
}
