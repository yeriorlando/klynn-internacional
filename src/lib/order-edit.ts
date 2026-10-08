import { supabase, ensureFreshSupabaseSession } from "./supabase";
import { offlineDB } from "./offline-db";
import { KEY, read, write, type Orden } from "./storage";

export type OrderChanges = Record<string, { antes: unknown; despues: unknown }>;
export interface OrderEditContext {
  orden: Orden;
  token: string;
  editable: boolean;
  blocked_reason: string | null;
  financial_reason: string | null;
  historial: {
    empleado_nombre: string;
    motivo: string;
    creado_en: string;
    cambios: OrderChanges;
  }[];
}
export interface OrderEditPreview {
  orden: Orden;
  cambios: OrderChanges;
}

export const ORDER_EDIT_FIELDS = [
  "fecha_entrega",
  "notas",
  "direccion_entrega",
  "referencia_entrega",
  "repartidor_id",
  "ubicacion_ropa",
  "items",
  "cliente_id",
  "descuento",
  "costo_envio",
  "es_urgente",
  "servicios",
  "servicios_precios",
] as const;

export function orderEditPatch(original: Orden, draft: Orden): Record<string, unknown> {
  return Object.fromEntries(
    ORDER_EDIT_FIELDS.filter(
      (key) => JSON.stringify(original[key]) !== JSON.stringify(draft[key]),
    ).map((key) => [key, draft[key]]),
  );
}

async function rpc(orden: Orden, args: Record<string, unknown> = {}) {
  if (!navigator.onLine)
    throw new Error(
      "Conéctate a Internet para editar. Los cambios de edición no se guardan sin conexión.",
    );
  const pending = await offlineDB.getOutboxItems(orden.tenant_id);
  if (
    pending.some(
      (item) =>
        item.table_name === "ordenes" && item.entity_id === orden.id && item.status !== "synced",
    )
  ) {
    throw new Error(
      "Esta orden tiene cambios pendientes de sincronizar. Sincronízalos antes de editar.",
    );
  }
  await ensureFreshSupabaseSession();
  const { data, error } = await supabase.rpc("editar_orden", { p_id: orden.id, ...args });
  if (error) {
    if (error.code === "PGRST202")
      throw new Error(
        "La edición aún no está habilitada en la base de datos. Falta aplicar la migración de edición de órdenes.",
      );
    const msg = (error.message || "").toLowerCase();
    if (
      msg.includes("permission denied") ||
      msg.includes("no tienes permiso") ||
      msg.includes("inicia sesión para editar") ||
      error.code === "42501"
    ) {
      throw new Error(
        "No tienes permisos para editar esta orden. Solo el Administrador o personal autorizado pueden modificar pedidos registrados.",
      );
    }
    throw new Error(error.message);
  }
  return data;
}

export async function loadOrderEdit(orden: Orden): Promise<OrderEditContext> {
  return rpc(orden);
}

export async function submitOrderEdit(
  context: OrderEditContext,
  draft: Orden,
  reason: string,
  preview = true,
): Promise<OrderEditPreview> {
  const result = (await rpc(context.orden, {
    p_expected: context.token,
    p_patch: orderEditPatch(context.orden, draft),
    p_reason: reason.trim(),
    p_preview: preview,
  })) as OrderEditPreview;
  if (!preview) {
    // Cache only after the server commits both the order and its audit entry.
    // A cache failure must never turn a successful edit into a retryable write.
    try {
      const local = read<Orden[]>(KEY.ordenes, []);
      write(KEY.ordenes, [...local.filter((o) => o.id !== result.orden.id), result.orden]);
      await offlineDB.put("ordenes", result.orden);
    } catch (error) {
      console.warn("Order edit cache refresh failed", error);
    }
  }
  return result;
}
