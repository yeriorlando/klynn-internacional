import { useState, useEffect } from "react";
import { Cloud, CloudOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { migrateLocalDataToSupabase } from "@/lib/storage";
import { toast } from "sonner";

export function CloudSync({ tenantId }: { tenantId: string }) {
  const [status, setStatus] = useState<"online" | "offline" | "syncing" | "done">("online");
  const [hasLocalData, setHasLocalData] = useState(false);

  // Verificar si hay datos locales pendientes ESPECÍFICOS de este tenant
  const checkLocalData = () => {
    try {
      const keys = ["lvx:ordenes", "lvx:clientes", "lvx:catalogo", "lvx:gastos", "lvx:movimientos"];
      const hasDataForTenant = keys.some(k => {
        const val = localStorage.getItem(k);
        if (!val) return false;
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) && parsed.some((item: any) => item.tenant_id === tenantId);
        } catch { return false; }
      });
      
      setHasLocalData(hasDataForTenant);
      
      if (!navigator.onLine) {
        setStatus("offline");
      } else {
        setStatus("online");
      }
      return hasDataForTenant;
    } catch (e) {
      console.error("Error checking local data", e);
      return false;
    }
  };

  const sync = async () => {
    if (!navigator.onLine) {
      toast.error("Sin conexión a internet 🌐");
      return;
    }
    if (!tenantId || status === "syncing") return;
    
    setStatus("syncing");
    try {
      const res = await migrateLocalDataToSupabase(tenantId);
      // Solo mostramos "hecho" si realmente movimos algo
      if (res.ordenes > 0 || res.clientes > 0 || res.catalogo > 0 || res.gastos > 0) {
        toast.success(`¡Sincronización completada! ✨ (${res.ordenes} órdenes, ${res.clientes} clientes)`);
        setStatus("done");
        setTimeout(() => {
          checkLocalData();
        }, 3000);
      } else {
        toast.info("No hay datos pendientes de sincronizar para esta lavandería.");
        checkLocalData();
      }
    } catch (e) {
      console.error("Sync error", e);
      toast.error("Error al sincronizar datos. Verifique su conexión.");
      setStatus("online");
    }
  };

  useEffect(() => {
    checkLocalData();
    
    const handleOnline = () => {
      checkLocalData(); // Solo actualizar estado
    };

    const handleOffline = () => setStatus("offline");
    const handleLocalSave = () => {
      setHasLocalData(true);
      // Solo avisar, NO sincronizar automáticamente
      if (!navigator.onLine) setStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("klynn-offline-save", handleLocalSave);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("klynn-offline-save", handleLocalSave);
    };
  }, [tenantId]);

  if (status === "syncing") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="text-[10px] font-bold uppercase tracking-wider">Sincronizando...</span>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 animate-in fade-in zoom-in duration-300">
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-[10px] font-bold uppercase tracking-wider">Sincronizado</span>
      </div>
    );
  }

  if (!navigator.onLine) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-500">
        <CloudOff className="h-4 w-4" />
        <span className="text-[10px] font-bold uppercase tracking-wider">Sin Conexión</span>
      </div>
    );
  }

  if (hasLocalData) {
    return (
      <button 
        onClick={sync}
        title="Tienes datos en este navegador pendientes de subir. Haz clic para sincronizar ahora."
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-600 hover:bg-red-500/20 transition-all active:scale-95"
      >
        <CloudOff className="h-4 w-4" />
        <span className="text-[10px] font-bold uppercase tracking-wider">Pendiente Sincronizar</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600/60">
      <Cloud className="h-4 w-4" />
      <span className="text-[10px] font-bold uppercase tracking-wider">En la Nube</span>
    </div>
  );
}
