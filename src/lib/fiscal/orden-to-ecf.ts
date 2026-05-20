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
};

// ─── Mapeo de método de pago → código Pronesoft ──────────────────────────────
// 1=Efectivo, 2=Cheque/Transferencia, 3=Tarjeta Débito/Crédito, 4=Crédito, 5=Bonos

function metodoPagoToForms(metodo: Orden['metodo_pago'], total: number): PaymentForm[] {
  switch (metodo) {
    case 'EFECTIVO':      return [{ method: '1', amount: total }];
    case 'TARJETA':       return [{ method: '3', amount: total }];
    case 'TRANSFERENCIA': return [{ method: '2', amount: total }];
    case 'CREDITO':       return [{ method: '4', amount: total }];
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
  const itbisRate = config.itbis_porcentaje / 100; // 0.18
  const items: ECFItem[] = orden.items.map((item, idx) => {
    const unitPrice = item.precio_unitario;
    const amount    = unitPrice * item.cantidad;

    // billingIndicator:
    // '1' = ITBIS (18%) — gravable
    // '2' = ITBIS 0% (específico)
    // '3' = Exento de ITBIS
    let billingIndicator: '1' | '3' = (config.itbis_incluido || config.itbis_porcentaje > 0) ? '1' : '3';
    
    if (item.is_exento) {
      billingIndicator = '3';
    }

    return {
      lineNumber:       idx + 1,
      name:             item.descripcion,
      type:             '2' as const,              // Servicio (lavandería)
      billingIndicator,
      quantity:         item.cantidad,
      unitPrice:        unitPrice,
      amount:           amount,
    };
  });

  // Si no hay items en orden.items, usamos los servicios como un solo ítem
  if (items.length === 0 && orden.servicios.length > 0) {
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

  // 4. Totales
  const totals: ECFTotals = {
    taxableAmount: orden.subtotal,
    totalAmount:   orden.total,
  };

  if (orden.itbis > 0) {
    totals.itbisRate1  = config.itbis_porcentaje; // Usar 18 (entero) en vez de 0.18
    totals.totalITBIS  = orden.itbis;
  }

  if (orden.descuento > 0) {
    totals.discountAmount = orden.descuento;
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
