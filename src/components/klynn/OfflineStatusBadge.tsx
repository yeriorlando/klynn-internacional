import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { syncManager, type SyncState } from "@/lib/sync-manager";
import { offlineDB } from "@/lib/offline-db";
import { toast } from "sonner";

export function OfflineStatusBadge({ tenantId, hasOfflineModule = true }: { tenantId?: string; hasOfflineModule?: boolean }) {
  const [status, setStatus] = useState<SyncState>("online");
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isHovered, setIsHovered] = useState(false);

  const updateBadge = async () => {
    if (typeof window === "undefined") return;
    setStatus(navigator.onLine ? "online" : "offline");
    try {
      const count = await offlineDB.getOutboxCount(tenantId);
      setPendingCount(count);
    } catch (e) {
      console.warn("Error getting outbox count", e);
    }
  };

  useEffect(() => {
    updateBadge();

    const handleSyncStatus = (e: any) => {
      if (e.detail?.status) {
        setStatus(e.detail.status);
      }
      updateBadge();
    };

    const handleOutboxUpdate = () => {
      updateBadge();
    };

    const handleOnline = () => {
      setStatus("online");
      updateBadge();
    };

    const handleOffline = () => {
      setStatus("offline");
      updateBadge();
    };

    window.addEventListener("klynn-sync-status", handleSyncStatus);
    window.addEventListener("klynn-outbox-updated", handleOutboxUpdate);
    window.addEventListener("klynn-offline-mutation", handleOutboxUpdate);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("klynn-sync-status", handleSyncStatus);
      window.removeEventListener("klynn-outbox-updated", handleOutboxUpdate);
      window.removeEventListener("klynn-offline-mutation", handleOutboxUpdate);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [tenantId]);

  const handleManualSync = async () => {
    if (!navigator.onLine) {
      toast.error("No hay conexión a internet disponible para sincronizar.");
      return;
    }
    toast.info("Iniciando sincronización con la nube...");
    const res = await syncManager.processQueue();
    if (res.synced > 0) {
      toast.success(`¡Sincronización completada! (${res.synced} operaciones enviadas a la nube)`);
    } else if (res.failed > 0) {
      toast.error(`${res.failed} operaciones tuvieron errores al subir. Revisa la consola.`);
    } else {
      toast.success("Todo está al día y sincronizado con la nube.");
    }
    updateBadge();
  };

  if (status === "syncing") {
    return (
      <button
        onClick={handleManualSync}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px] font-bold shadow-2xs transition-all animate-pulse cursor-pointer"
        title="Sincronizando operaciones con la nube..."
      >
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        <span className="hidden sm:inline">Sincronizando</span>
        {pendingCount > 0 && (
          <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
            {pendingCount}
          </span>
        )}
      </button>
    );
  }

  if (status === "offline" || !navigator.onLine) {
    if (!hasOfflineModule) {
      return (
        <button
          onClick={() => toast.error("El Modo Offline (Facturación sin conexión) está inactivo para este plan. Conéctate a internet para continuar operando.")}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/10 dark:bg-slate-500/20 border border-rose-500/40 text-rose-600 dark:text-rose-400 text-[11px] font-bold shadow-2xs transition-all hover:bg-rose-500/10 cursor-pointer"
          title="Sin conexión a internet. El Modo Offline está inactivo en esta lavandería."
        >
          <CloudOff className="h-3.5 w-3.5 text-rose-500" />
          <span>Sin conexión (Modo offline inactivo)</span>
        </button>
      );
    }

    return (
      <button
        onClick={handleManualSync}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[11px] font-bold shadow-2xs transition-all hover:bg-rose-500/20 cursor-pointer"
        title="Operando sin conexión. Las órdenes y cobros se guardan localmente y se sincronizarán al volver internet."
      >
        <CloudOff className="h-3.5 w-3.5" />
        <span>Sin conexión</span>
        {pendingCount > 0 && (
          <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-black text-[10px]">
            {pendingCount} {pendingCount === 1 ? "pendiente" : "pendientes"}
          </span>
        )}
      </button>
    );
  }

  // Estado Online
  return (
    <button
      onClick={handleManualSync}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all text-[11px] font-bold cursor-pointer ${
        pendingCount > 0
          ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
          : "bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
      }`}
      title={
        pendingCount > 0
          ? `${pendingCount} operaciones pendientes de sincronizar. Clic para forzar sincronización.`
          : "Conectado y sincronizado con Klynn Cloud en tiempo real."
      }
    >
      {pendingCount > 0 ? (
        <>
          <RefreshCw className="h-3.5 w-3.5 text-amber-500" />
          <span className="hidden sm:inline">Pendientes:</span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
            {pendingCount}
          </span>
        </>
      ) : (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Cloud className="h-3.5 w-3.5" />
          <span className="hidden md:inline">{isHovered ? "Sincronizar" : "En línea"}</span>
        </>
      )}
    </button>
  );
}
