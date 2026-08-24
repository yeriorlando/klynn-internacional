/** Persistencia offline y outbox durable de Klynn. */

const DB_NAME = "klynn_pos_offline_db";
const DB_VERSION = 2;
const OUTBOX_STORE = "sync_outbox_v2";
const LEGACY_OUTBOX_STORE = "sync_outbox";
const PROCESSING_LEASE_MS = 60_000;

export type SyncTableName =
  | "tenants"
  | "ordenes"
  | "clientes"
  | "cajas"
  | "movimientos_caja"
  | "gastos"
  | "catalogo_items"
  | "servicios";
export type SyncAction = "INSERT" | "UPDATE" | "UPSERT" | "DELETE";
export type SyncOutboxStatus = "pending" | "processing" | "failed" | "blocked" | "synced";

export interface SyncOutboxItem {
  /** Identificador único de la operación, no de la entidad. */
  id: string;
  entity_id: string;
  tenant_id: string;
  table_name: SyncTableName;
  action: SyncAction;
  payload: any;
  timestamp: string;
  attempts: number;
  status: SyncOutboxStatus;
  error_message?: string;
  error_code?: string;
  locked_at?: string;
  next_attempt_at?: string;
  checkpoint?: Record<string, any>;
}

function operationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `op-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function compactOutboxOperation(
  existing: SyncOutboxItem,
  incoming: Omit<SyncOutboxItem, "id" | "entity_id" | "attempts" | "status" | "timestamp"> & {
    entity_id?: string;
  },
): SyncOutboxItem {
  const incomingPayload = incoming.payload || {};
  const existingPayload = existing.payload || {};
  let action = incoming.action;
  let payload = incomingPayload;

  if (incoming.action === "DELETE") {
    payload = { id: incoming.entity_id || incomingPayload.id || existing.entity_id };
  } else if (existing.action === "INSERT" || existing.action === "UPSERT") {
    action = existing.action;
    payload = { ...existingPayload, ...incomingPayload };
  } else if (existing.action === "UPDATE" && incoming.action === "UPDATE") {
    action = "UPDATE";
    payload = { ...existingPayload, ...incomingPayload };
  } else if (existing.action === "DELETE") {
    action = incoming.action === "UPDATE" ? "UPSERT" : incoming.action;
  }

  return {
    ...existing,
    tenant_id: incoming.tenant_id,
    table_name: incoming.table_name,
    action,
    payload,
    attempts: 0,
    status: "pending",
    timestamp: new Date().toISOString(),
    error_message: undefined,
    error_code: undefined,
    locked_at: undefined,
    next_attempt_at: undefined,
  };
}

class OfflineDBManager {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private isAvailable(): boolean {
    return typeof window !== "undefined" && "indexedDB" in window;
  }

  private getDB(): Promise<IDBDatabase> {
    if (!this.isAvailable())
      return Promise.reject(new Error("IndexedDB no está disponible en este entorno."));
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const ensureTenantStore = (name: string, indexes: Array<[string, string]> = []) => {
            if (db.objectStoreNames.contains(name)) return;
            const store = db.createObjectStore(name, { keyPath: "id" });
            store.createIndex("tenant_id", "tenant_id", { unique: false });
            for (const [indexName, keyPath] of indexes)
              store.createIndex(indexName, keyPath, { unique: false });
          };
          ensureTenantStore("clientes", [
            ["nombre", "nombre"],
            ["telefono", "telefono"],
            ["rnc_cedula", "rnc_cedula"],
          ]);
          ensureTenantStore("catalogo_prendas");
          ensureTenantStore("catalogo_servicios");
          ensureTenantStore("ordenes", [
            ["numero", "numero"],
            ["cliente_id", "cliente_id"],
            ["estado", "estado"],
            ["creado_en", "creado_en"],
          ]);
          ensureTenantStore("cajas");
          ensureTenantStore("movimientos_caja", [["caja_id", "caja_id"]]);
          ensureTenantStore("gastos");
          ensureTenantStore("auth_cache", [["email", "email"]]);

          if (!db.objectStoreNames.contains(LEGACY_OUTBOX_STORE)) {
            const legacy = db.createObjectStore(LEGACY_OUTBOX_STORE, { keyPath: "id" });
            legacy.createIndex("tenant_id", "tenant_id", { unique: false });
            legacy.createIndex("status", "status", { unique: false });
            legacy.createIndex("timestamp", "timestamp", { unique: false });
          }
          if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
            const outbox = db.createObjectStore(OUTBOX_STORE, { keyPath: "id" });
            outbox.createIndex("tenant_id", "tenant_id", { unique: false });
            outbox.createIndex("status", "status", { unique: false });
            outbox.createIndex("timestamp", "timestamp", { unique: false });
            outbox.createIndex("entity_key", ["tenant_id", "table_name", "entity_id"], {
              unique: false,
            });

            if ((event.oldVersion || 0) < 2 && db.objectStoreNames.contains(LEGACY_OUTBOX_STORE)) {
              const transaction = (event.target as IDBOpenDBRequest).transaction;
              const legacyStore = transaction?.objectStore(LEGACY_OUTBOX_STORE);
              const cursorRequest = legacyStore?.openCursor();
              cursorRequest?.addEventListener("success", (cursorEvent) => {
                const cursor = (cursorEvent.target as IDBRequest<IDBCursorWithValue | null>).result;
                if (!cursor) return;
                const old = cursor.value as Partial<SyncOutboxItem>;
                const entityId = String(
                  old.entity_id || old.payload?.id || old.id || operationId(),
                );
                outbox.put({
                  ...old,
                  id: operationId(),
                  entity_id: entityId,
                  tenant_id: String(old.tenant_id || old.payload?.tenant_id || ""),
                  timestamp: old.timestamp || new Date().toISOString(),
                  attempts: old.attempts || 0,
                  status: old.status === "processing" ? "pending" : old.status || "pending",
                  locked_at: undefined,
                });
                cursor.continue();
              });
            }
          }
        };
        request.onsuccess = () => {
          request.result.onversionchange = () => request.result.close();
          resolve(request.result);
        };
        request.onerror = () => reject(request.error);
        request.onblocked = () =>
          reject(
            new Error(
              "La base offline está abierta en otra pestaña. Cierra las demás pestañas y reintenta.",
            ),
          );
      });
    }
    return this.dbPromise;
  }

  async put<T>(storeName: string, item: T): Promise<void> {
    if (!this.isAvailable()) return;
    const db = await this.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async putMany<T>(storeName: string, items: T[]): Promise<void> {
    if (!this.isAvailable() || !items?.length) return;
    const db = await this.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      items.forEach((item) => store.put(item));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async get<T>(storeName: string, key: string | number): Promise<T | undefined> {
    if (!this.isAvailable()) return undefined;
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction(storeName, "readonly").objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async getAll<T>(storeName: string, tenantId?: string): Promise<T[]> {
    if (!this.isAvailable()) return [];
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const store = db.transaction(storeName, "readonly").objectStore(storeName);
      const req =
        tenantId && store.indexNames.contains("tenant_id")
          ? store.index("tenant_id").getAll(tenantId)
          : store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async delete(storeName: string, key: string | number): Promise<void> {
    if (!this.isAvailable()) return;
    const db = await this.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    if (!this.isAvailable()) return;
    const db = await this.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async addToOutbox(
    item: Omit<SyncOutboxItem, "id" | "entity_id" | "attempts" | "status" | "timestamp"> & {
      id?: string;
      entity_id?: string;
    },
  ): Promise<void> {
    const entityId = String(item.entity_id || item.payload?.id || item.id || "");
    if (!entityId || !item.tenant_id)
      throw new Error("La operación offline requiere entity_id y tenant_id.");
    const all = await this.getOutboxItems(item.tenant_id);
    const compactable = all
      .filter(
        (entry) =>
          entry.table_name === item.table_name &&
          entry.entity_id === entityId &&
          entry.status !== "processing",
      )
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0];
    const fullItem = compactable
      ? compactOutboxOperation(compactable, { ...item, entity_id: entityId })
      : {
          ...item,
          id: operationId(),
          entity_id: entityId,
          attempts: 0,
          status: "pending" as const,
          timestamp: new Date().toISOString(),
        };
    await this.put(OUTBOX_STORE, fullItem);
    if (typeof window !== "undefined")
      window.dispatchEvent(new CustomEvent("klynn-offline-mutation", { detail: fullItem }));
  }

  async getOutboxItems(tenantId?: string): Promise<SyncOutboxItem[]> {
    return this.getAll<SyncOutboxItem>(OUTBOX_STORE, tenantId);
  }

  async getPendingOutbox(tenantId: string, maxAttempts = 5): Promise<SyncOutboxItem[]> {
    if (!tenantId) return [];
    const now = Date.now();
    const all = await this.getOutboxItems(tenantId);
    return all.filter((item) => {
      if (item.status === "pending") return true;
      if (item.status === "processing")
        return !item.locked_at || now - Date.parse(item.locked_at) >= PROCESSING_LEASE_MS;
      if (item.status === "failed")
        return (
          item.attempts < maxAttempts &&
          (!item.next_attempt_at || Date.parse(item.next_attempt_at) <= now)
        );
      return false;
    });
  }

  async getOutboxCount(tenantId: string): Promise<number> {
    if (!tenantId) return 0;
    const all = await this.getOutboxItems(tenantId);
    return all.filter((item) => item.status !== "synced").length;
  }

  async claimOutboxItem(id: string): Promise<SyncOutboxItem | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OUTBOX_STORE, "readwrite");
      const store = tx.objectStore(OUTBOX_STORE);
      const req = store.get(id);
      let claimed: SyncOutboxItem | null = null;
      req.onsuccess = () => {
        const item = req.result as SyncOutboxItem | undefined;
        if (!item) return;
        const freshLease =
          item.status === "processing" &&
          item.locked_at &&
          Date.now() - Date.parse(item.locked_at) < PROCESSING_LEASE_MS;
        if (freshLease || item.status === "blocked" || item.status === "synced") return;
        claimed = { ...item, status: "processing", locked_at: new Date().toISOString() };
        store.put(claimed);
      };
      tx.oncomplete = () => resolve(claimed);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async retryOutboxItem(id: string): Promise<void> {
    const item = await this.get<SyncOutboxItem>(OUTBOX_STORE, id);
    if (!item) throw new Error("La operación pendiente ya no existe en este dispositivo.");
    await this.put(OUTBOX_STORE, {
      ...item,
      status: "pending",
      attempts: 0,
      error_message: undefined,
      error_code: undefined,
      locked_at: undefined,
      next_attempt_at: undefined,
    });
    if (typeof window !== "undefined")
      window.dispatchEvent(new CustomEvent("klynn-outbox-updated"));
  }

  async removeOutboxItem(id: string): Promise<void> {
    await this.delete(OUTBOX_STORE, id);
    if (typeof window !== "undefined")
      window.dispatchEvent(new CustomEvent("klynn-outbox-updated"));
  }

  async markOutboxFailed(
    id: string,
    errorMessage: string,
    errorCode?: string,
    blocked = false,
  ): Promise<void> {
    const item = await this.get<SyncOutboxItem>(OUTBOX_STORE, id);
    if (!item) return;
    const attempts = (item.attempts || 0) + 1;
    const delayMs = Math.min(5 * 60_000, 5_000 * 2 ** Math.max(0, attempts - 1));
    await this.put(OUTBOX_STORE, {
      ...item,
      status: blocked ? "blocked" : "failed",
      attempts,
      error_message: errorMessage,
      error_code: errorCode,
      locked_at: undefined,
      next_attempt_at: blocked ? undefined : new Date(Date.now() + delayMs).toISOString(),
    });
    if (typeof window !== "undefined")
      window.dispatchEvent(new CustomEvent("klynn-outbox-updated"));
  }

  async updateOutboxItemStatus(
    id: string,
    status: SyncOutboxStatus,
    errorMessage?: string,
    notify = true,
  ): Promise<void> {
    const item = await this.get<SyncOutboxItem>(OUTBOX_STORE, id);
    if (!item) return;
    await this.put(OUTBOX_STORE, {
      ...item,
      status,
      error_message: errorMessage,
      locked_at: status === "processing" ? new Date().toISOString() : undefined,
    });
    if (notify && typeof window !== "undefined")
      window.dispatchEvent(new CustomEvent("klynn-outbox-updated"));
  }

  async checkpointOutboxItem(id: string, checkpoint: Record<string, any>): Promise<void> {
    const item = await this.get<SyncOutboxItem>(OUTBOX_STORE, id);
    if (!item) return;
    await this.put(OUTBOX_STORE, {
      ...item,
      checkpoint: { ...(item.checkpoint || {}), ...checkpoint },
    });
  }
}

export const offlineDB = new OfflineDBManager();
