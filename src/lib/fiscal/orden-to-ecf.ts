/**
 * orden-to-ecf.ts
 * Convierte una Orden de Klynn al formato JSON que espera la API de Pronesoft.
 */

import type { Orden, Cliente, TenantConfig } from '../storage';
import type { ECFPayload, PaymentForm, ECFItem, ECFBuyer, ECFTotals } from './pronesoft-client';

// ─── Mapeo de tipo NCF → invoiceType de Pronesoft ────────────────────────────
// B01 = Crédito Fiscal (E31)
// B02 = Consumidor Final (E32)
// B14 = Gubernamental (E44)
// B15 = Régimen Especial (E45)
// B16 = Exportaciones (E46)

const NCF_TO_INVOICE_TYPE: Record<string, ECFPayload['invoiceType']> = {
  B01: '31',  // Factura de Crédito Fiscal
  B02: '32',  // Factura de Consumo (Consumidor Final)
  B14: '44',  // Gubernamental
  B15: '45',  // Régimen Especial
  B16: '46',  // Exportaciones
  // Tipos especiales (se usan directamente)
  E31: '31',
  E32: '32',
  E33: '33',  // Nota de Débito
  E34: '34',  // Nota de Crédito
  E41: '41',  // Compras
  E43: '43',  // Gastos Menores
  E44: '44',  // Regímenes Especiales
  E45: '45',  // Gubernamental
  E46: '46',  // Exportaciones
  E47: '47',  // Pagos al Exterior
};

// ─── Mapeo de método de pago → código Pronesoft ──────────────────────────────
// 1=Efectivo, 2=Cheque/Transferencia, 3=Tarjeta Débito/Crédito, 4=Crédito, 5=Bonos

function metodoPagoToForms(metodo: Orden['metodo_pago'], total: number): PaymentForm[] {
  switch (metodo) {
    case 'EFECTIVO':      return [{ method: '1', amount: total }];
    case 'TARJETA':       return [{ method: '3', amount: total }];
    case 'TRANSFERENCIA': return [{ method: '2', amount: total }];
    case 'CREDITO':       return [{ method: '4', amount: total }];
    case 'PAGO_AL_RETIRAR': return [{ method: '4', amount: total }];
    case 'MIXTO':
      // Dividimos en efectivo + tarjeta como aproximación
      return [
        { method: '1', amount: Math.round(total * 0.5 * 100) / 100 },
        { method: '3', amount: Math.round(total * 0.5 * 100) / 100 },
      ];
    default:              return [{ method: '1', amount: total }];
  }
}

// ─── Función principal ────────────────────────────────────────────────────────

export function ordenToECFPayload(
  orden:    Orden,
  cliente:  Cliente | null,
  config:   TenantConfig,
  tipoECF?: string,  // Forzar tipo (E31, E32, etc.) — si no, se usa ncf_secuencia
  reference?: {
    ncf: string;
    date: string;
    code: string;
  }
): ECFPayload {

  // 1. Determinar tipo de documento
  const tipoBase = tipoECF ?? orden.tipo_ecf ?? config.ncf_secuencia ?? 'B02';
  const invoiceType = NCF_TO_INVOICE_TYPE[tipoBase] ?? '32';

  // 2. Buyer (comprador) — la API de Pronesoft usa "buyer", NO "customer"
  let buyer: ECFBuyer | undefined;
  if (cliente) {
    buyer = { name: cliente.nombre + (cliente.apellido ? ` ${cliente.apellido}` : '') };
    // Si es crédito fiscal (E31), el RNC/Cédula es requerido
    if ((invoiceType === '31' || invoiceType === '33' || invoiceType === '34') && (cliente.cedula || cliente.email)) {
      buyer.taxId = cliente.cedula ? cliente.cedula.replace(/[^0-9]/g, '') : undefined;
    }
  }

  // 3. Items
  const items: ECFItem[] = (orden.items || []).map((item, idx) => {
    const unitPrice = item.precio_unitario;
    const amount    = unitPrice * item.cantidad;

    let billingIndicator: '1' | '3' = (config.itbis_incluido || config.itbis_porcentaje > 0) ? '1' : '3';
    if (item.is_exento) {
      billingIndicator = '3';
    }

    return {
      lineNumber:       idx + 1,
      name:             item.descripcion || "Servicio",
      type:             '2' as const,              // Servicio (lavandería)
      billingIndicator,
      quantity:         item.cantidad || 1,
      unitPrice:        unitPrice,
      amount:           amount,
    };
  });

  // Si no hay items en orden.items, usamos los servicios como un solo ítem
  if (items.length === 0 && orden.servicios && orden.servicios.length > 0) {
    items.push({
      lineNumber:       1,
      name:             orden.servicios.join(', '),
      type:             '2',
      billingIndicator: config.itbis_porcentaje > 0 ? '1' : '3',
      quantity:         1,
      unitPrice:        orden.subtotal,
      amount:           orden.subtotal,
    });
  }

  // Reconciliación matemática estricta: asegurar que la suma de las líneas coincida exactamente con subtotal
  const itemsSum = Number(items.reduce((acc, it) => acc + (it.amount || 0), 0).toFixed(2));
  const diff = Number((orden.subtotal - itemsSum).toFixed(2));
  if (Math.abs(diff) >= 0.01) {
    if (diff > 0) {
      items.push({
        lineNumber:       items.length + 1,
        name:             orden.servicios && orden.servicios.length > 0 ? orden.servicios.join(', ') : "Cargo por servicio de lavandería",
        type:             '2',
        billingIndicator: config.itbis_porcentaje > 0 ? '1' : '3',
        quantity:         1,
        unitPrice:        diff,
        amount:           diff,
      });
    } else if (items.length > 0) {
      // Ajustar la última línea para cuadre perfecto de centavos
      items[items.length - 1].amount = Number((items[items.length - 1].amount + diff).toFixed(2));
      items[items.length - 1].unitPrice = items[items.length - 1].amount;
    }
  }

  // 4. Totales
  const isExempt = (config.itbis_porcentaje || 0) === 0 || (orden.itbis || 0) === 0;
  const totals: ECFTotals = {
    totalAmount:   Number(orden.total.toFixed(2)),
  };

  if (isExempt) {
    totals.exemptAmount = Number(orden.subtotal.toFixed(2));
  } else {
    totals.taxableAmount = Number(orden.subtotal.toFixed(2));
    totals.itbisRate1    = config.itbis_porcentaje || 18;
    totals.totalITBIS    = Number(orden.itbis.toFixed(2));
  }

  if (orden.descuento > 0) {
    totals.discountAmount = Number(orden.descuento.toFixed(2));
  }

  // 5. Formas de pago
  const paymentForms = metodoPagoToForms(orden.metodo_pago, orden.total);

  // 6. Payload final — usar "buyer" según la documentación oficial de Pronesoft
  const payload: ECFPayload = {
    invoiceType,
    issueDate:    orden.creado_en || new Date().toISOString(),
    paymentForms,
    items,
    totals,
  };

  if (orden.ncf) {
    payload.invoiceNumber = orden.ncf;
  }

  if (buyer) payload.buyer = buyer;

  // Manejo de Notas de Crédito (34) y Débito (33)
  if (invoiceType === '34' || invoiceType === '33') {
    if (invoiceType === '34') {
        // Indicator: 0=Anulación, 1=Ajuste/Devolución
        // Si el código es '01' (Anulación Total), enviamos '0'
        payload.creditNoteIndicator = (reference?.code === '01') ? '0' : '1';
    }

    if (reference) {
        payload.referenceInfo = {
            modifiedInvoiceNumber: reference.ncf,
            modifiedInvoiceDate:   reference.date.split('T')[0], // Solo YYYY-MM-DD
            modificationCode:      reference.code.replace(/^0/, '')
        };
    } else if (orden.ncf) {
        // Fallback básico si no se provee referencia explícita
        payload.referenceInfo = {
            modifiedInvoiceNumber: orden.ncf,
            modifiedInvoiceDate:   (orden.creado_en || new Date().toISOString()).split('T')[0],
            modificationCode:      invoiceType === '34' ? '01' : '03' // 01=Anulación, 03=Ajuste Precio
        };
    }
  }

  return payload;
}
