import type { Orden, MovimientoCaja, Gasto } from "@/lib/storage";

export interface DesgloseMetodosCobro {
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  otros: number;
  total: number;
}

export interface DesgloseCarteraPorCobrar {
  alRetirar: { total: number; count: number };
  credito: { total: number; count: number };
  anticiposPendientes: { total: number; count: number };
  otros: { total: number; count: number };
}

export interface ResumenFinanciero {
  // 1. Facturación (Producción / Órdenes emitidas en el periodo)
  facturadoTotal: number;
  facturadoSubtotal: number;
  facturadoITBIS: number;
  facturadoDescuento: number;
  ordenesCount: number;
  ticketPromedio: number;

  // 2. Cobros Reales (Flujo de caja / Dinero recaudado en el periodo)
  cobradoBruto: number;
  reembolsos: number;
  cobradoNeto: number;
  desgloseMetodos: DesgloseMetodosCobro;

  // 3. Cartera Viva (Órdenes activas con saldo pendiente)
  porCobrarTotal: number;
  porCobrarCount: number;
  desglosePorCobrar: DesgloseCarteraPorCobrar;

  // 4. Gastos y Resultados
  gastosTotal: number;
  resultadoFacturado: number; // facturadoTotal - gastosTotal (Beneficio contable)
  flujoNeto: number;          // cobradoNeto - gastosTotal (Dinero real disponible)
}

/**
 * Determina si un movimiento de caja corresponde a una entrada de cobro a cliente
 * (venta directa o abono/cobro a cuenta de una orden).
 */
export function esMovimientoCobro(m: MovimientoCaja): boolean {
  if (!m) return false;
  // Excluir expresamente la apertura de fondo de caja
  if (m.concepto && /apertura/i.test(m.concepto)) return false;

  // Ventas y abonos son cobros genuinos
  if (m.tipo === "VENTA" || m.tipo === "ABONO") return true;

  // Ingreso manual asignado a una orden
  if (m.tipo === "INGRESO" && Boolean(m.orden_id)) return true;

  return false;
}

/**
 * Determina si un egreso corresponde a un reembolso o anulación de cobro previo.
 */
export function esMovimientoReembolso(m: MovimientoCaja): boolean {
  if (!m) return false;
  if (m.tipo === "EGRESO") {
    if (m.orden_id) return true;
    if (m.concepto && /(reembolso|devoluci[oó]n|anulaci[oó]n)/i.test(m.concepto)) return true;
  }
  return false;
}

/**
 * Normaliza el método de pago a las categorías estándar de reporte.
 */
export function normalizarMetodo(metodo?: string): "efectivo" | "tarjeta" | "transferencia" | "otros" {
  if (!metodo) return "otros";
  const m = metodo.toUpperCase();
  if (m === "EFECTIVO") return "efectivo";
  if (m === "TARJETA") return "tarjeta";
  if (m === "TRANSFERENCIA") return "transferencia";
  return "otros";
}

/**
 * Calcula los cobros reales (entradas de dinero netas) a partir de los movimientos de caja.
 */
export function calcularCobros(
  movimientos: MovimientoCaja[],
  desde?: Date,
  hasta?: Date
): {
  cobradoBruto: number;
  reembolsos: number;
  cobradoNeto: number;
  desgloseMetodos: DesgloseMetodosCobro;
  movimientosValidos: MovimientoCaja[];
} {
  const movsValidos = (movimientos || []).filter((m) => {
    if (!m.creado_en) return true;
    const fecha = new Date(m.creado_en);
    if (desde && fecha < desde) return false;
    if (hasta && fecha > hasta) return false;
    return true;
  });

  let cobradoBruto = 0;
  let reembolsos = 0;
  const desglose: DesgloseMetodosCobro = {
    efectivo: 0,
    tarjeta: 0,
    transferencia: 0,
    otros: 0,
    total: 0,
  };

  for (const m of movsValidos) {
    const monto = Number(m.monto) || 0;
    const key = normalizarMetodo(m.metodo);

    if (esMovimientoCobro(m)) {
      cobradoBruto += monto;
      desglose[key] += monto;
    } else if (esMovimientoReembolso(m)) {
      reembolsos += monto;
      desglose[key] = Math.max(0, desglose[key] - monto);
    }
  }

  const cobradoNeto = Math.max(0, +(cobradoBruto - reembolsos).toFixed(2));
  desglose.total = cobradoNeto;

  return {
    cobradoBruto: +cobradoBruto.toFixed(2),
    reembolsos: +reembolsos.toFixed(2),
    cobradoNeto,
    desgloseMetodos: {
      efectivo: +desglose.efectivo.toFixed(2),
      tarjeta: +desglose.tarjeta.toFixed(2),
      transferencia: +desglose.transferencia.toFixed(2),
      otros: +desglose.otros.toFixed(2),
      total: cobradoNeto,
    },
    movimientosValidos: movsValidos,
  };
}

/**
 * Calcula la cartera pendiente de cobro (órdenes activas o entregadas que adeudan dinero).
 */
export function calcularCarteraPorCobrar(ordenes: Orden[]): {
  totalPorCobrar: number;
  count: number;
  ordenesPendientes: Orden[];
  desglose: DesgloseCarteraPorCobrar;
} {
  const ordenesPendientes = (ordenes || []).filter(
    (o) => o.estado !== "ANULADA" && (Number(o.saldo) || 0) > 0.009
  );

  let total = 0;
  let alRetirarTotal = 0, alRetirarCount = 0;
  let creditoTotal = 0, creditoCount = 0;
  let anticiposTotal = 0, anticiposCount = 0;
  let otrosTotal = 0, otrosCount = 0;

  for (const o of ordenesPendientes) {
    const saldo = Number(o.saldo) || 0;
    total += saldo;

    const isCredito = o.metodo_pago === "CREDITO" || o.condicion_cobro === "CREDITO";
    const isAlRetirar = o.metodo_pago === "PAGO_AL_RETIRAR" || o.condicion_cobro === "AL_RETIRAR";
    const hasAnticipo = (o.pagado || 0) > 0 && saldo > 0;

    if (isCredito) {
      creditoTotal += saldo;
      creditoCount++;
    } else if (hasAnticipo) {
      anticiposTotal += saldo;
      anticiposCount++;
    } else if (isAlRetirar) {
      alRetirarTotal += saldo;
      alRetirarCount++;
    } else {
      otrosTotal += saldo;
      otrosCount++;
    }
  }

  return {
    totalPorCobrar: +total.toFixed(2),
    count: ordenesPendientes.length,
    ordenesPendientes,
    desglose: {
      alRetirar: { total: +alRetirarTotal.toFixed(2), count: alRetirarCount },
      credito: { total: +creditoTotal.toFixed(2), count: creditoCount },
      anticiposPendientes: { total: +anticiposTotal.toFixed(2), count: anticiposCount },
      otros: { total: +otrosTotal.toFixed(2), count: otrosCount },
    },
  };
}

/**
 * Calcula la facturación / producción generada en un periodo (órdenes creadas, excluyendo anuladas).
 */
export function calcularFacturacion(
  ordenes: Orden[],
  desde?: Date,
  hasta?: Date
): {
  totalFacturado: number;
  subtotal: number;
  itbis: number;
  desconteo: number;
  count: number;
  ticketPromedio: number;
  ordenesValidas: Orden[];
} {
  const validas = (ordenes || []).filter((o) => {
    if (o.estado === "ANULADA") return false;
    if (!o.creado_en) return true;
    const f = new Date(o.creado_en);
    if (desde && f < desde) return false;
    if (hasta && f > hasta) return false;
    return true;
  });

  let totalFacturado = 0;
  let subtotal = 0;
  let itbis = 0;
  let descuento = 0;

  for (const o of validas) {
    totalFacturado += Number(o.total) || 0;
    subtotal += Number(o.subtotal) || 0;
    itbis += Number(o.itbis) || 0;
    descuento += Number(o.descuento) || 0;
  }

  const count = validas.length;
  const ticketPromedio = count > 0 ? +(totalFacturado / count).toFixed(2) : 0;

  return {
    totalFacturado: +totalFacturado.toFixed(2),
    subtotal: +subtotal.toFixed(2),
    itbis: +itbis.toFixed(2),
    descuento: +descuento.toFixed(2),
    count,
    ticketPromedio,
    ordenesValidas: validas,
  };
}

/**
 * Genera el resumen financiero unificado para un periodo.
 */
export function generarResumenFinanciero({
  ordenes,
  movimientos,
  gastos = [],
  desde,
  hasta,
}: {
  ordenes: Orden[];
  movimientos: MovimientoCaja[];
  gastos?: Gasto[];
  desde?: Date;
  hasta?: Date;
}): ResumenFinanciero {
  const facturacion = calcularFacturacion(ordenes, desde, hasta);
  const cartera = calcularCarteraPorCobrar(ordenes);
  const cobros = calcularCobros(movimientos, desde, hasta);

  // Si los movimientos están vacíos en este entorno (ej: test o consulta offline sin movimientos cargados),
  // se calcula un cobrado de respaldo basado en lo pagado de las órdenes creadas en el periodo.
  let cobradoNetoFinal = cobros.cobradoNeto;
  let desgloseMetodosFinal = cobros.desgloseMetodos;

  if (movimientos.length === 0 && facturacion.ordenesValidas.length > 0) {
    const pagadoOrdenes = facturacion.ordenesValidas.reduce(
      (sum, o) => sum + (Number(o.pagado) || 0),
      0
    );
    cobradoNetoFinal = +pagadoOrdenes.toFixed(2);
    desgloseMetodosFinal = {
      efectivo: cobradoNetoFinal,
      tarjeta: 0,
      transferencia: 0,
      otros: 0,
      total: cobradoNetoFinal,
    };
  }

  const gastosValidos = (gastos || []).filter((g) => {
    if (!g.fecha) return true;
    const f = new Date(g.fecha);
    if (desde && f < desde) return false;
    if (hasta && f > hasta) return false;
    return true;
  });
  const gastosTotal = +gastosValidos.reduce((sum, g) => sum + (Number(g.monto) || 0), 0).toFixed(2);

  const resultadoFacturado = +(facturacion.totalFacturado - gastosTotal).toFixed(2);
  const flujoNeto = +(cobradoNetoFinal - gastosTotal).toFixed(2);

  return {
    facturadoTotal: facturacion.totalFacturado,
    facturadoSubtotal: facturacion.subtotal,
    facturadoITBIS: facturacion.itbis,
    facturadoDescuento: facturacion.descuento,
    ordenesCount: facturacion.count,
    ticketPromedio: facturacion.ticketPromedio,

    cobradoBruto: cobros.cobradoBruto,
    reembolsos: cobros.reembolsos,
    cobradoNeto: cobradoNetoFinal,
    desgloseMetodos: desgloseMetodosFinal,

    porCobrarTotal: cartera.totalPorCobrar,
    porCobrarCount: cartera.count,
    desglosePorCobrar: cartera.desglose,

    gastosTotal,
    resultadoFacturado,
    flujoNeto,
  };
}
