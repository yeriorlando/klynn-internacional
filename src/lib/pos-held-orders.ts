import type { Cliente, OrdenItem } from "@/lib/storage";

export interface HeldOrder {
  id: string;
  tenantId: string;
  createdAt: string;
  cliente: Cliente | null;
  tipoECF: string;
  items: OrdenItem[];
  serviciosSel: string[];
  customServicePrices?: Record<string, number>;
  descuento?: number;
  selectedPromo?: any | null;
  notas?: string;
  esUrgente?: boolean;
  fechaEntrega?: string; // ISO string
  servicioDomicilio?: boolean;
  costoDomicilio?: number;
  direccionData?: any;
  ubicacionRopa?: string;
  marbetesList?: any[];
  total: number;
  totalPiezas: number;
  empleadoNombre?: string;
}

const HELD_ORDERS_KEY_PREFIX = "klynn_pos_held_orders_";

export function getHeldOrders(tenantId: string): HeldOrder[] {
  if (typeof window === "undefined" || !tenantId) return [];
  try {
    const raw = localStorage.getItem(`${HELD_ORDERS_KEY_PREFIX}${tenantId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("Error leyendo órdenes en espera:", e);
    return [];
  }
}

export function saveHeldOrder(tenantId: string, order: HeldOrder): HeldOrder[] {
  if (typeof window === "undefined" || !tenantId) return [];
  try {
    const current = getHeldOrders(tenantId);
    const updated = [order, ...current.filter((o) => o.id !== order.id)].slice(0, 20);
    localStorage.setItem(`${HELD_ORDERS_KEY_PREFIX}${tenantId}`, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn("Error guardando orden en espera:", e);
    return [];
  }
}

export function deleteHeldOrder(tenantId: string, id: string): HeldOrder[] {
  if (typeof window === "undefined" || !tenantId) return [];
  try {
    const current = getHeldOrders(tenantId);
    const updated = current.filter((o) => o.id !== id);
    localStorage.setItem(`${HELD_ORDERS_KEY_PREFIX}${tenantId}`, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn("Error eliminando orden en espera:", e);
    return [];
  }
}

export function clearHeldOrders(tenantId: string): void {
  if (typeof window === "undefined" || !tenantId) return;
  try {
    localStorage.removeItem(`${HELD_ORDERS_KEY_PREFIX}${tenantId}`);
  } catch (e) {
    console.warn("Error limpiando órdenes en espera:", e);
  }
}
