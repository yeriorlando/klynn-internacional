/**
 * Klynn Background Sync Manager
 * Procesa la cola de salida (Outbox) de IndexedDB hacia Supabase y proveedores fiscales (Pronesoft/DGII).
 */

import { supabase } from "@/lib/supabase";
import { offlineDB, type SyncOutboxItem } from "@/lib/offline-db";
import { read, write, KEY, type Cliente, type Orden, getECFConfig, getTenantById, getClienteById, nextNumeroOrden } from "@/lib/storage";
import { emitirECF } from "@/lib/fiscal";

export type SyncState = "online" | "offline" | "syncing" | "error";

const TABLE_PRIORITY: Record<string, number> = {
  tenants: 0,
  clientes: 1,
  cajas: 2,
  ordenes: 3,
  movimientos_caja: 4,
  gastos: 5,
};

const VALID_COLUMNS: Record<string, Set<string>> = {
  tenants: new Set([
    "id", "nombre", "slug", "rnc", "telefono", "direccion", "ciudad", "provincia",
    "email", "color_primario", "color_secundario", "plan_id", "estado", "trial_hasta",
    "config", "nombre_sucursal", "creado_en"
  ]),
  ordenes: new Set([
    "id", "tenant_id", "numero", "cliente_id", "empleado_id", "servicios", "subtotal", "itbis",
    "descuento", "total", "pagado", "saldo", "metodo_pago", "estado", "fecha_entrega", "es_urgente",
    "notas", "ncf", "motivo_anulacion", "entrega_domicilio", "repartidor_id", "creado_en", "items",
    "tipo_ecf", "ecf_id", "nota_credito_ncf", "nota_credito_id", "ecf_qr", "ecf_security_code",
    "ecf_signature_date", "motivo_anulacion_codigo", "nota_debito_ncf", "nota_debito_id",
    "nota_debito_monto", "ncf_vencimiento", "costo_envio", "servicios_precios", "ubicacion_ropa",
    "pago_referencia", "estado_proceso", "direccion_entrega", "sector_entrega", "referencia_entrega",
    "lat_entrega", "lng_entrega", "pod_foto", "pod_firma", "pod_receptor", "pod_fecha",
    "incidencia_motivo", "incidencia_notas", "incidencia_fecha"
  ]),
  clientes: new Set([
    "id", "tenant_id", "nombre", "apellido", "telefono", "email", "direccion", "cedula",
    "notas", "tipo", "limite_credito", "creado_en", "sector", "edificio_apto", "referencia",
    "lat", "lng", "entrega_domicilio"
  ]),
  movimientos_caja: new Set([
    "id", "tenant_id", "caja_id", "empleado_id", "tipo", "concepto", "monto", "metodo",
    "referencia", "orden_id", "creado_en"
  ]),
  cajas: new Set([
    "id", "tenant_id", "empleado_id", "monto_inicial", "estado", "abierta_en", "cerrada_en",
    "monto_esperado_efectivo", "diferencia", "notas_apertura", "notas_cierre",
    "monto_contado_efectivo", "monto_contado_tarjeta", "monto_contado_transferencia"
  ]),
  gastos: new Set([
    "id", "tenant_id", "empleado_id", "categoria", "descripcion", "monto", "metodo_pago",
    "proveedor", "fecha", "aprobado", "is_caja_chica"
  ]),
};

function sanitizeForTable(tableName: string, data: Record<string, any>): Record<string, any> {
  const allowed = VALID_COLUMNS[tableName];
  if (!allowed) return data;

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (allowed.has(key) && value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

class SyncManager {
  private isProcessing = false;
  private syncTimer: any = null;
  private currentStatus: SyncState = "online";
  private activeTenantEmployeeCache: Record<string, string> = {};

  constructor() {
    if (typeof window !== "undefined") {
      this.initListeners();
    }
  }

  private initListeners() {
    this.currentStatus = navigator.onLine ? "online" : "offline";

    // 1. Cuando regrese la conexión
    window.addEventListener("online", () => {
      console.log("[SyncManager] Conexión restablecida. Iniciando sincronización automática...");
      this.currentStatus = "online";
      this.notifyStatusChange("online");
      this.processQueue();
    });

    window.addEventListener("offline", () => {
      console.log("[SyncManager] Conexión perdida. Modo Offline activo.");
      this.currentStatus = "offline";
      this.notifyStatusChange("offline");
    });

    // 2. Al guardar cualquier mutación local
    window.addEventListener("klynn-offline-mutation", () => {
      if (navigator.onLine) {
        this.processQueue();
      } else {
        this.notifyStatusChange("offline");
      }
    });

    window.addEventListener("klynn-offline-save", () => {
      if (navigator.onLine) {
        this.processQueue();
      }
    });

    // 3. Cuando el usuario vuelve a la pestaña
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && navigator.onLine && !this.isProcessing) {
        this.processQueue();
      }
    });

    // 4. Sondeo frecuente de seguridad cada 5 segundos si hay elementos pendientes
    this.syncTimer = setInterval(() => {
      if (navigator.onLine && !this.isProcessing) {
        offlineDB.getOutboxCount().then((count) => {
          if (count > 0) {
            this.processQueue();
          }
        }).catch(() => {});
      }
    }, 5000);

    // Intento inicial inmediato
    if (navigator.onLine) {
      setTimeout(() => this.processQueue(), 1500);
    }
  }

  private notifyStatusChange(status: SyncState, details?: any) {
    this.currentStatus = status;
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("klynn-sync-status", {
          detail: { status, timestamp: new Date().toISOString(), ...details },
        })
      );
    }
  }

  getStatus(): SyncState {
    if (typeof window === "undefined") return "online";
    return navigator.onLine ? this.currentStatus : "offline";
  }

  /**
   * Obtiene un ID de empleado válido en Supabase para satisfacer la clave foránea
   */
  private async getValidEmployeeId(tenantId?: string): Promise<string | null> {
    const tid = tenantId && tenantId !== "undefined" ? tenantId : "8423be36-736f-4233-b933-1c1225042857";

    if (this.activeTenantEmployeeCache[tid]) {
      return this.activeTenantEmployeeCache[tid];
    }

    try {
      const { data, error } = await supabase
        .from("empleados")
        .select("id")
        .eq("tenant_id", tid)
        .eq("activo", true)
        .limit(1);

      if (!error && data && data.length > 0) {
        this.activeTenantEmployeeCache[tid] = data[0].id;
        return data[0].id;
      }
    } catch {}

    return "d13ef7f6-549b-40be-846c-65fb173318b6"; // Default Reyna employee
  }

  /**
   * Resuelve el UUID real de la lavandería si el payload tiene un slug o ID temporal
   */
  private async resolveRealTenantId(tenantIdOrSlug?: string): Promise<string> {
    if (!tenantIdOrSlug || tenantIdOrSlug === "undefined") {
      const active = read<string>(KEY.active, "reynita");
      if (active === "reynita") return "8423be36-736f-4233-b933-1c1225042857";
      tenantIdOrSlug = active;
    }

    if (tenantIdOrSlug && tenantIdOrSlug.length === 36 && !tenantIdOrSlug.startsWith("ten-")) {
      return tenantIdOrSlug;
    }

    const clean = tenantIdOrSlug.replace("ten-", "").replace("tenant-", "").toLowerCase();
    if (clean === "reynita") return "8423be36-736f-4233-b933-1c1225042857";

    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("id")
        .eq("slug", clean)
        .maybeSingle();

      if (!error && data?.id) {
        return data.id;
      }
    } catch {}

    return "8423be36-736f-4233-b933-1c1225042857";
  }

  /**
   * Procesa todas las operaciones pendientes en la cola con orden de dependencias
   */
  async processQueue(tenantId?: string): Promise<{ synced: number; failed: number }> {
    if (this.isProcessing) return { synced: 0, failed: 0 };
    if (typeof window !== "undefined" && !navigator.onLine) {
      this.notifyStatusChange("offline");
      return { synced: 0, failed: 0 };
    }

    this.isProcessing = true;
    this.notifyStatusChange("syncing");

    let syncedCount = 0;
    let failedCount = 0;

    try {
      const items = await offlineDB.getPendingOutbox();

      // Ordenar por prioridad de dependencias: Clientes -> Cajas -> Órdenes -> Movimientos -> Gastos
      const sortedItems = [...items].sort((a, b) => {
        const pA = TABLE_PRIORITY[a.table_name] || 99;
        const pB = TABLE_PRIORITY[b.table_name] || 99;
        if (pA !== pB) return pA - pB;
        return +new Date(a.timestamp) - +new Date(b.timestamp);
      });

      for (const item of sortedItems) {
        try {
          await offlineDB.updateOutboxItemStatus(item.id, "processing", undefined, false);
          const success = await this.syncSingleItem(item);

          if (success) {
            await offlineDB.removeOutboxItem(item.id);
            syncedCount++;
          } else {
            await offlineDB.updateOutboxItemStatus(item.id, "failed", "Error al procesar");
            failedCount++;
          }
        } catch (itemErr: any) {
          console.error(`[SyncManager] Error sincronizando ${item.table_name}:`, itemErr);
          await offlineDB.updateOutboxItemStatus(item.id, "failed", itemErr?.message || "Error de red");
          failedCount++;
        }
      }

      const remaining = await offlineDB.getOutboxCount();
      this.notifyStatusChange("online", {
        syncedCount,
        remaining,
      });

      if (syncedCount > 0 && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("klynn-sync-completed", { detail: { syncedCount } }));
      }
    } catch (err) {
      console.error("[SyncManager] Error general en cola:", err);
      this.notifyStatusChange("error");
    } finally {
      this.isProcessing = false;
    }

    return { synced: syncedCount, failed: failedCount };
  }

  private async syncSingleItem(item: SyncOutboxItem): Promise<boolean> {
    const { table_name, action, payload } = item;

    if (!payload || !table_name) return true;

    // Normalizar objeto
    let data = { ...payload };
    delete data._local_sync_status;

    // 1. Resolver Tenant ID real si venía temporal o undefined
    data.tenant_id = await this.resolveRealTenantId(data.tenant_id);

    if (action === "DELETE") {
      const { error } = await supabase.from(table_name).delete().eq("id", data.id || item.id);
      if (error) throw error;
      return true;
    }

    if (action === "UPDATE") {
      const sanitizedUpdates = sanitizeForTable(table_name, data);
      delete sanitizedUpdates.id;
      const { error } = await supabase.from(table_name).update(sanitizedUpdates).eq("id", item.id);
      if (error) {
        console.error(`[SyncManager] Fallo UPDATE en ${table_name}:`, error);
        throw error;
      }
      console.log(`[SyncManager] ✅ Actualización procesada en tabla: ${table_name} (${item.id})`);
      return true;
    }

    // 2. Auto-heal para Órdenes: Verificar Cliente, Empleado, y evitar órdenes vacías
    if (table_name === "ordenes") {
      const localOrdenes = read<Orden[]>(KEY.ordenes, []);
      const fullOrder = localOrdenes.find((o) => o.id === item.id);
      if (fullOrder) {
        data = { ...fullOrder, ...data };
      }

      // Descartar órdenes fantasma vacías sin servicios ni items
      if (
        (!data.items || data.items.length === 0) &&
        (!data.servicios || data.servicios.length === 0) &&
        (data.total === 0 || !data.total)
      ) {
        console.warn(`[SyncManager] Descartando orden fantasma vacía sin items: ${item.id}`);
        return true;
      }

      // Garantizar que la orden tenga un número válido no nulo
      if (!data.numero) {
        data.numero = await nextNumeroOrden(data.tenant_id);
      }

      // A. Garantizar que el Cliente existe en Supabase
      if (data.cliente_id) {
        const localClientes = read<Cliente[]>(KEY.clientes, []);
        const targetCli = localClientes.find((c) => c.id === data.cliente_id);
        if (targetCli) {
          const cliPayload = sanitizeForTable("clientes", {
            ...targetCli,
            tenant_id: data.tenant_id,
          });
          try {
            await supabase.from("clientes").upsert(cliPayload, { onConflict: "id" });
          } catch {}
        } else if (data.cliente_id.includes("f000") || data.cliente_id.startsWith("cli-")) {
          // Consumidor Final o cliente local genérico
          try {
            await supabase.from("clientes").upsert({
              id: data.cliente_id,
              tenant_id: data.tenant_id,
              nombre: "Consumidor",
              apellido: "Final",
              telefono: "809-000-0000",
              tipo: "Persona",
              creado_en: new Date().toISOString(),
            }, { onConflict: "id" });
          } catch {}
        }
      }

      // B. Garantizar que el Empleado es válido en Supabase
      if (!data.empleado_id || data.empleado_id.startsWith("emp-offline") || data.empleado_id === "admin") {
        const validEmpId = await this.getValidEmployeeId(data.tenant_id);
        if (validEmpId) {
          data.empleado_id = validEmpId;
        }
      }
    }

    // 3. Auto-heal para Movimientos de Caja
    if (table_name === "movimientos_caja") {
      if (!data.empleado_id || data.empleado_id.startsWith("emp-offline") || data.empleado_id === "admin") {
        const validEmpId = await this.getValidEmployeeId(data.tenant_id);
        if (validEmpId) {
          data.empleado_id = validEmpId;
        }
      }

      // Si tiene orden_id pero la orden aún no está en Supabase, verificar o anular orden_id para no bloquear el registro de dinero
      if (data.orden_id) {
        try {
          const { data: ordCheck } = await supabase
            .from("ordenes")
            .select("id")
            .eq("id", data.orden_id)
            .maybeSingle();

          if (!ordCheck) {
            data.orden_id = null;
          }
        } catch {
          data.orden_id = null;
        }
      }
    }

    // 4. Sanitizar payload estricto respetando las columnas reales de la base de datos
    const sanitizedData = sanitizeForTable(table_name, data);

    // 5. UPSERT a la base de datos en Supabase
    const { error } = await supabase.from(table_name).upsert(sanitizedData, { onConflict: "id" });
    if (error) {
      console.error(`[SyncManager] Fallo upsert en ${table_name}:`, error);
      if (error.code === "42501") {
        console.warn(`[SyncManager] Fila en ${table_name} (${data.id}) bloqueada por política RLS. Descartando de la cola para no bloquear sincronización.`);
        return true;
      }
      throw error;
    }

    // 6. Si es una orden y tiene emisión e-CF pendiente o código provisional offline (SBX)
    const hasMockSecurityCode = data.ecf_security_code && String(data.ecf_security_code).startsWith("SBX");
    const isEcfPending = payload.ecf_status === "PENDING_OFFLINE_TRANSMISSION" || 
      (data.tipo_ecf && (!data.ecf_security_code || hasMockSecurityCode));

    if (table_name === "ordenes" && isEcfPending) {
      try {
        const ecfCfg = await getECFConfig(data.tenant_id);
        const tenant = await getTenantById(data.tenant_id);
        if (ecfCfg?.is_active || tenant?.config?.modo_facturacion === "electronica" || data.tipo_ecf?.startsWith("E")) {
          const cliente = data.cliente_id ? await getClienteById(data.cliente_id) : null;
          console.log(`[SyncManager] ⚡ Timbrando comprobante e-CF diferido con Pronesoft/DGII para orden #${data.numero}...`);

          const result = await emitirECF(
            data,
            cliente,
            ecfCfg?.pronesoft_tenant_id,
            tenant?.config || ({} as any),
            tenant || ({ id: data.tenant_id, slug: "reynita" } as any),
            data.tipo_ecf
          );

          if (result && result.encf) {
            const fiscalUpdates = {
              ncf: result.encf,
              tipo_ecf: data.tipo_ecf || "E32",
              ecf_id: result.document?.id,
              ecf_qr: result.stamp_url || (result.document as any)?.document_stamp_url || "",
              ecf_security_code: result.security_code || "",
              ecf_signature_date: (result.document as any)?.signature_date || new Date().toISOString(),
              ecf_status: "TRANSMITTED",
            };

            await supabase.from("ordenes").update(fiscalUpdates).eq("id", data.id);
            console.log(`[SyncManager] ✅ Comprobante e-CF timbrado exitosamente: ${result.encf} (Código de seguridad oficial: ${result.security_code})`);

            // Actualizar en caché local
            const localOrd = read<Orden[]>(KEY.ordenes, []);
            const ordIdx = localOrd.findIndex((o) => o.id === data.id);
            if (ordIdx >= 0) {
              localOrd[ordIdx] = { ...localOrd[ordIdx], ...fiscalUpdates };
              write(KEY.ordenes, localOrd);
            }

            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("klynn-order-fiscal-updated", {
                  detail: { orderId: data.id, numero: data.numero, ...fiscalUpdates },
                })
              );
            }
          }
        }
      } catch (ecfErr) {
        console.warn("[SyncManager] Aviso en emisión diferida e-CF con Pronesoft:", ecfErr);
      }
    }

    return true;
  }
}

export const syncManager = new SyncManager();
