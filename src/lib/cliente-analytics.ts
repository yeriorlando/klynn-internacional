import type { Cliente, Orden, OrdenItem } from "@/lib/storage";

export interface ConsumoAgrupado {
  key: string;
  nombre: string;
  ordenes: number;
  piezas: number;
  libras: number;
  monto: number;
}

export interface RegistroPesaje {
  ordenId: string;
  ordenNumero: string;
  fecha: string;
  descripcion: string;
  libras: number;
  precioUnitario: number;
  subtotal: number;
  estado: string;
  servicio?: string;
}

export interface ClienteAnalytics {
  ordenes: Orden[];
  ordenesFacturables: Orden[];
  totalOrdenes: number;
  totalFacturado: number;
  totalPagado: number;
  totalSaldo: number;
  totalPiezas: number;
  totalLibras: number;
  primeraOrden?: string;
  ultimaOrden?: string;
  servicios: ConsumoAgrupado[];
  prendas: ConsumoAgrupado[];
  pesajes: RegistroPesaje[];
  promedioLibrasPorOrden: number;
  tarifaPromedioLibra: number;
}

export interface SectorOption {
  key: string;
  label: string;
  count: number;
}

const DIACRITICS = /[\u0300-\u036f]/g;

export function normalizeText(value?: string | null): string {
  return String(value || "")
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es");
}

export function cleanItemName(value?: string | null): string {
  return (
    String(value || "")
      .replace(/^\s*↳\s*/, "")
      .trim()
      .replace(/\s+/g, " ") || "Sin descripción"
  );
}

export function getSectorOptions(clientes: Cliente[]): SectorOption[] {
  const sectors = new Map<string, SectorOption>();

  for (const cliente of clientes) {
    const label = String(cliente.sector || "")
      .trim()
      .replace(/\s+/g, " ");
    if (!label) continue;
    const key = normalizeText(label);
    const current = sectors.get(key);
    if (current) current.count += 1;
    else sectors.set(key, { key, label, count: 1 });
  }

  return [...sectors.values()].sort((a, b) => a.label.localeCompare(b.label, "es"));
}

function isServiceOnlyLine(item: OrdenItem): boolean {
  return normalizeText(item.descripcion).startsWith("servicio:");
}

function ensureGroup(map: Map<string, ConsumoAgrupado>, rawName: string): ConsumoAgrupado {
  const nombre = rawName.trim().replace(/\s+/g, " ") || "Sin desglose";
  const key = normalizeText(nombre) || "sin-desglose";
  let group = map.get(key);
  if (!group) {
    group = { key, nombre, ordenes: 0, piezas: 0, libras: 0, monto: 0 };
    map.set(key, group);
  }
  return group;
}

function byUsage(a: ConsumoAgrupado, b: ConsumoAgrupado): number {
  return (
    b.monto - a.monto ||
    b.libras - a.libras ||
    b.piezas - a.piezas ||
    a.nombre.localeCompare(b.nombre, "es")
  );
}

export function buildClienteAnalytics(allOrders: Orden[], clienteId: string): ClienteAnalytics {
  const ordenes = allOrders
    .filter((order) => order.cliente_id === clienteId)
    .sort((a, b) => +new Date(b.creado_en) - +new Date(a.creado_en));
  const ordenesFacturables = ordenes.filter((order) => order.estado !== "ANULADA");
  const serviceMap = new Map<string, ConsumoAgrupado>();
  const garmentMap = new Map<string, ConsumoAgrupado>();

  let totalPiezas = 0;
  let totalLibras = 0;
  let totalMontoLibras = 0;
  const ordenesConLibras = new Set<string>();
  const pesajes: RegistroPesaje[] = [];

  for (const order of ordenesFacturables) {
    const servicesSeen = new Set<string>();
    const garmentsSeen = new Set<string>();

    for (const serviceName of order.servicios || []) {
      const group = ensureGroup(serviceMap, serviceName);
      if (!servicesSeen.has(group.key)) {
        group.ordenes += 1;
        servicesSeen.add(group.key);
      }
    }

    for (const item of order.items || []) {
      if (isServiceOnlyLine(item)) continue;

      const itemName = cleanItemName(item.descripcion);
      const garment = ensureGroup(garmentMap, itemName);
      const itemAmount = Number(item.cantidad || 0) * Number(item.precio_unitario || 0);
      if (!garmentsSeen.has(garment.key)) {
        garment.ordenes += 1;
        garmentsSeen.add(garment.key);
      }
      garment.monto += itemAmount;

      if (item.es_libra) {
        const pounds = Number(item.cantidad || 0);
        garment.libras += pounds;
        totalLibras += pounds;
        totalMontoLibras += itemAmount;
        ordenesConLibras.add(order.id);

        pesajes.push({
          ordenId: order.id,
          ordenNumero: order.numero,
          fecha: order.creado_en,
          descripcion: itemName,
          libras: pounds,
          precioUnitario: Number(item.precio_unitario || 0),
          subtotal: itemAmount,
          estado: order.estado,
          servicio: item.servicio_origen || (order.servicios || [])[0] || "Lavado",
        });
      } else {
        const pieces = Number(item.cantidad || 0);
        garment.piezas += pieces;
        totalPiezas += pieces;
      }

      const fallbackService =
        (order.servicios || []).length === 1 ? order.servicios[0] : "Sin desglose";
      const service = ensureGroup(serviceMap, item.servicio_origen || fallbackService);
      if (!servicesSeen.has(service.key)) {
        service.ordenes += 1;
        servicesSeen.add(service.key);
      }
      service.monto += itemAmount;
      if (item.es_libra) service.libras += Number(item.cantidad || 0);
      else service.piezas += Number(item.cantidad || 0);
    }

    for (const [serviceName, servicePrice] of Object.entries(order.servicios_precios || {})) {
      const service = ensureGroup(serviceMap, serviceName);
      const hasAttributedItems = (order.items || []).some(
        (item) =>
          normalizeText(item.servicio_origen) === service.key &&
          Number(item.precio_unitario || 0) > 0,
      );
      if (!hasAttributedItems) {
        const qty = order.servicios_cantidades?.[serviceName] || (order.servicios?.filter(x => x === serviceName).length || 1);
        service.monto += Number(servicePrice || 0) * qty;
      }
      if (!servicesSeen.has(service.key)) {
        service.ordenes += 1;
        servicesSeen.add(service.key);
      }
    }
  }

  const chronological = [...ordenesFacturables].sort(
    (a, b) => +new Date(a.creado_en) - +new Date(b.creado_en),
  );

  return {
    ordenes,
    ordenesFacturables,
    totalOrdenes: ordenesFacturables.length,
    totalFacturado: ordenesFacturables.reduce((sum, order) => sum + Number(order.total || 0), 0),
    totalPagado: ordenesFacturables.reduce((sum, order) => sum + Number(order.pagado || 0), 0),
    totalSaldo: ordenesFacturables.reduce((sum, order) => sum + Number(order.saldo || 0), 0),
    totalPiezas,
    totalLibras,
    primeraOrden: chronological[0]?.creado_en,
    ultimaOrden: chronological.at(-1)?.creado_en,
    servicios: [...serviceMap.values()].sort(byUsage),
    prendas: [...garmentMap.values()].sort(byUsage),
    pesajes,
    promedioLibrasPorOrden: ordenesConLibras.size > 0 ? +(totalLibras / ordenesConLibras.size).toFixed(1) : 0,
    tarifaPromedioLibra: totalLibras > 0 ? +(totalMontoLibras / totalLibras).toFixed(2) : 0,
  };
}

export type PeriodoFecha =
  | "todas"
  | "hoy"
  | "esta_semana"
  | "este_mes"
  | "ultimos_30"
  | "ultimos_90"
  | "personalizado";

export function isMismoDia(dateStr?: string, targetDate: Date = new Date()): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getFullYear() === targetDate.getFullYear() &&
    d.getMonth() === targetDate.getMonth() &&
    d.getDate() === targetDate.getDate()
  );
}

export function isEnEstaSemana(dateStr?: string, now: Date = new Date()): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 6, 23, 59, 59, 999);
  return d >= startOfWeek && d <= endOfWeek;
}

export function isEnEsteMes(dateStr?: string, now: Date = new Date()): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export function isEnUltimosDias(dateStr?: string, days: number = 30, now: Date = new Date()): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days, 0, 0, 0, 0);
  return d >= cutoff && d <= now;
}

export function isEnRango(dateStr?: string, desde?: string, hasta?: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  if (desde) {
    const [y, m, day] = desde.split("-").map(Number);
    const start = new Date(y, m - 1, day, 0, 0, 0, 0);
    if (d < start) return false;
  }
  if (hasta) {
    const [y, m, day] = hasta.split("-").map(Number);
    const end = new Date(y, m - 1, day, 23, 59, 59, 999);
    if (d > end) return false;
  }
  return true;
}

export function matchesPeriodo(
  dateStr?: string,
  periodo: PeriodoFecha = "todas",
  desde?: string,
  hasta?: string,
  now: Date = new Date()
): boolean {
  if (periodo === "todas") return true;
  if (!dateStr) return false;
  switch (periodo) {
    case "hoy":
      return isMismoDia(dateStr, now);
    case "esta_semana":
      return isEnEstaSemana(dateStr, now);
    case "este_mes":
      return isEnEsteMes(dateStr, now);
    case "ultimos_30":
      return isEnUltimosDias(dateStr, 30, now);
    case "ultimos_90":
      return isEnUltimosDias(dateStr, 90, now);
    case "personalizado":
      return isEnRango(dateStr, desde, hasta);
    default:
      return true;
  }
}

export function getPeriodoLabel(periodo: PeriodoFecha, desde?: string, hasta?: string): string {
  switch (periodo) {
    case "hoy":
      return "Hoy";
    case "esta_semana":
      return "Esta semana";
    case "este_mes":
      return "Este mes";
    case "ultimos_30":
      return "Últimos 30 días";
    case "ultimos_90":
      return "Últimos 90 días";
    case "personalizado":
      if (desde && hasta) return `${desde} a ${hasta}`;
      if (desde) return `Desde ${desde}`;
      if (hasta) return `Hasta ${hasta}`;
      return "Personalizado";
    default:
      return "Todas las fechas";
  }
}
