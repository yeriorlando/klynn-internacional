/**
 * Klynn Offline Database (IndexedDB Engine)
 * Almacenamiento local estructurado de alta capacidad y rendimiento para operación 100% offline.
 */

const DB_NAME = "klynn_pos_offline_db";
const DB_VERSION = 1;

export interface SyncOutboxItem {
  id: string;
  tenant_id: string;
  table_name: "ordenes" | "clientes" | "cajas" | "movimientos_caja" | "gastos";
  action: "INSERT" | "UPDATE" | "UPSERT" | "DELETE";
  payload: any;
  timestamp: string;
  attempts: number;
  status: "pending" | "processing" | "failed" | "synced";
  error_message?: string;
}

export interface OfflineAuthUser {
  id: string;
  email: string;
  tenant_id: string;
  nombre: string;
  rol: string;
  pin?: string;
  password_hash?: string;
  permisos: string[];
  activo: boolean;
  last_login?: string;
}

class OfflineDBManager {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private isAvailable(): boolean {
    return typeof window !== "undefined" && "indexedDB" in window;
  }

  private getDB(): Promise<IDBDatabase> {
    if (!this.isAvailable()) {
      return Promise.reject(new Error("IndexedDB no está disponible en este entorno."));
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // 1. Clientes
          if (!db.objectStoreNames.contains("clientes")) {
            const store = db.createObjectStore("clientes", { keyPath: "id" });
            store.createIndex("tenant_id", "tenant_id", { unique: false });
            store.createIndex("nombre", "nombre", { unique: false });
            store.createIndex("telefono", "telefono", { unique: false });
            store.createIndex("rnc_cedula", "rnc_cedula", { unique: false });
          }

          // 2. Catálogo (Prendas y Servicios)
          if (!db.objectStoreNames.contains("catalogo_prendas")) {
            const store = db.createObjectStore("catalogo_prendas", { keyPath: "id" });
            store.createIndex("tenant_id", "tenant_id", { unique: false });
          }
          if (!db.objectStoreNames.contains("catalogo_servicios")) {
            const store = db.createObjectStore("catalogo_servicios", { keyPath: "id" });
            store.createIndex("tenant_id", "tenant_id", { unique: false });
          }

          // 3. Órdenes
          if (!db.objectStoreNames.contains("ordenes")) {
            const store = db.createObjectStore("ordenes", { keyPath: "id" });
            store.createIndex("tenant_id", "tenant_id", { unique: false });
            store.createIndex("numero", "numero", { unique: false });
            store.createIndex("cliente_id", "cliente_id", { unique: false });
            store.createIndex("estado", "estado", { unique: false });
            store.createIndex("creado_en", "creado_en", { unique: false });
          }

          // 4. Cajas y Movimientos
          if (!db.objectStoreNames.contains("cajas")) {
            const store = db.createObjectStore("cajas", { keyPath: "id" });
            store.createIndex("tenant_id", "tenant_id", { unique: false });
          }
          if (!db.objectStoreNames.contains("movimientos_caja")) {
            const store = db.createObjectStore("movimientos_caja", { keyPath: "id" });
            store.createIndex("tenant_id", "tenant_id", { unique: false });
            store.createIndex("caja_id", "caja_id", { unique: false });
          }

          // 5. Gastos
          if (!db.objectStoreNames.contains("gastos")) {
            const store = db.createObjectStore("gastos", { keyPath: "id" });
            store.createIndex("tenant_id", "tenant_id", { unique: false });
          }

          // 6. Cola de Sincronización (Outbox)
          if (!db.objectStoreNames.contains("sync_outbox")) {
            const store = db.createObjectStore("sync_outbox", { keyPath: "id" });
            store.createIndex("tenant_id", "tenant_id", { unique: false });
            store.createIndex("status", "status", { unique: false });
            store.createIndex("timestamp", "timestamp", { unique: false });
          }

          // 7. Auth Cache Local (Empleados y PINs)
          if (!db.objectStoreNames.contains("auth_cache")) {
            const store = db.createObjectStore("auth_cache", { keyPath: "id" });
            store.createIndex("email", "email", { unique: false });
            store.createIndex("tenant_id", "tenant_id", { unique: false });
            store.createIndex("pin", "pin", { unique: false });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    return this.dbPromise;
  }

  // ================= Operaciones Genéricas =================
  async put<T>(storeName: string, item: T): Promise<void> {
    if (!this.isAvailable()) return;
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async putMany<T>(storeName: string, items: T[]): Promise<void> {
    if (!this.isAvailable() || !items || items.length === 0) return;
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      items.forEach((item) => store.put(item));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async get<T>(storeName: string, key: string | number): Promise<T | undefined> {
    if (!this.isAvailable()) return undefined;
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async getAll<T>(storeName: string, tenantId?: string): Promise<T[]> {
    if (!this.isAvailable()) return [];
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);

      if (tenantId && store.indexNames.contains("tenant_id")) {
        const index = store.index("tenant_id");
        const req = index.getAll(tenantId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      } else {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      }
    });
  }

  async delete(storeName: string, key: string | number): Promise<void> {
    if (!this.isAvailable()) return;
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    if (!this.isAvailable()) return;
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // ================= Métodos de la Cola Outbox =================
  async addToOutbox(item: Omit<SyncOutboxItem, "attempts" | "status" | "timestamp">): Promise<void> {
    const existing = await this.get<SyncOutboxItem>("sync_outbox", item.id);
    const fullItem: SyncOutboxItem = {
      ...item,
      attempts: existing?.attempts || 0,
      status: "pending",
      timestamp: new Date().toISOString(),
    };
    await this.put("sync_outbox", fullItem);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("klynn-offline-mutation", { detail: fullItem }));
    }
  }

  async getPendingOutbox(tenantId?: string): Promise<SyncOutboxItem[]> {
    const all = await this.getAll<SyncOutboxItem>("sync_outbox");
    return all.filter((x) => x.status === "pending" || x.status === "failed");
  }

  async getOutboxCount(tenantId?: string): Promise<number> {
    const pending = await this.getPendingOutbox(tenantId);
    const pendingOrders = pending.filter((x) => x.table_name === "ordenes");
    if (pendingOrders.length > 0) {
      return pendingOrders.length;
    }
    return pending.length;
  }

  async removeOutboxItem(id: string): Promise<void> {
    await this.delete("sync_outbox", id);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("klynn-outbox-updated"));
    }
  }

  async updateOutboxItemStatus(
    id: string,
    status: SyncOutboxItem["status"],
    errorMessage?: string
  ): Promise<void> {
    const item = await this.get<SyncOutboxItem>("sync_outbox", id);
    if (item) {
      item.status = status;
      item.attempts += 1;
      if (errorMessage) item.error_message = errorMessage;
      await this.put("sync_outbox", item);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("klynn-outbox-updated"));
      }
    }
  }
}

export const offlineDB = new OfflineDBManager();
