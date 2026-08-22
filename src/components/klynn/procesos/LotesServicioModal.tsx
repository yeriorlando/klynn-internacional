import { useState, useMemo, memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  TrendingUp, 
  Plus, 
  Minus, 
  Shirt, 
  Check, 
  Filter,
} from "lucide-react";
import { saveMetaServicio, type Orden, type Servicio } from "@/lib/storage";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface LotesServicioModalProps {
  tenantId: string;
  servicios: Servicio[];
  ordenes: Orden[];
  metasConfig: Record<string, { meta_diaria: number; activo: boolean }>;
  onFiltrarLote: (servicioNombre: string, limiteCantidad?: number) => void;
}

export const LotesServicioModal = memo(function LotesServicioModal({
  tenantId,
  servicios,
  ordenes,
  metasConfig,
  onFiltrarLote,
}: LotesServicioModalProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [localMetas, setLocalMetas] = useState<Record<string, { meta_diaria: number; activo: boolean }>>({});
  const [saving, setSaving] = useState(false);

  const activeMetas = useMemo(() => {
    return { ...metasConfig, ...localMetas };
  }, [metasConfig, localMetas]);

  // Lista única de nombres de servicios (0ms)
  const listaServicios = useMemo(() => {
    const set = new Set<string>();

    (servicios || []).forEach((s) => {
      if (s?.nombre) set.add(s.nombre.trim());
    });

    if (set.size === 0) {
      ["Solo lavado", "Lavado y secado", "Planchado", "Sastrería", "Tintorería", "Alfombras", "Hamper"].forEach((nom) => {
        set.add(nom);
      });
    }

    return Array.from(set).map((nom) => ({ nombre: nom }));
  }, [servicios]);

  // Estadísticas calculadas en 1 pasada ultra-rápida
  const statsPorServicio = useMemo(() => {
    if (!open) return {};

    const res: Record<string, { totalHoy: number; listasHoy: number; enProceso: number }> = {};
    for (const s of listaServicios) {
      res[s.nombre] = { totalHoy: 0, listasHoy: 0, enProceso: 0 };
    }

    const len = ordenes?.length || 0;
    for (let i = 0; i < len; i++) {
      const o = ordenes[i];
      if (o.estado === "ANULADA") continue;

      const isLista = o.estado === "LISTA" || o.estado === "ENTREGADA";
      const matched = new Set<string>();

      if (Array.isArray(o.servicios)) {
        for (let j = 0; j < o.servicios.length; j++) {
          const s = o.servicios[j];
          const nom = typeof s === "string" ? s : s?.nombre;
          if (nom) matched.add(nom.trim());
        }
      }

      if (Array.isArray(o.items)) {
        for (let j = 0; j < o.items.length; j++) {
          const it = o.items[j];
          const nom = it.servicio_origen || it.nombre;
          if (nom) matched.add(nom.trim());
        }
      }

      matched.forEach((srvNom) => {
        const target = listaServicios.find(
          (ls) => ls.nombre.toLowerCase() === srvNom.toLowerCase() || srvNom.toLowerCase().includes(ls.nombre.toLowerCase())
        );
        const key = target ? target.nombre : srvNom;
        if (!res[key]) {
          res[key] = { totalHoy: 0, listasHoy: 0, enProceso: 0 };
        }
        res[key].totalHoy++;
        if (isLista) res[key].listasHoy++;
        else res[key].enProceso++;
      });
    }

    return res;
  }, [open, listaServicios, ordenes]);

  const handleToggle = (srvNombre: string, activo: boolean) => {
    const prev = activeMetas[srvNombre] || { meta_diaria: 25, activo: false };
    setLocalMetas((old) => ({
      ...old,
      [srvNombre]: { ...prev, activo },
    }));
  };

  const handleUpdateCantidad = (srvNombre: string, deltaOrValue: number, isDelta = false) => {
    const prev = activeMetas[srvNombre] || { meta_diaria: 25, activo: true };
    const current = prev.meta_diaria || 25;
    const next = isDelta ? current + deltaOrValue : deltaOrValue;
    const validMeta = Math.max(1, Math.min(999, next));
    setLocalMetas((old) => ({
      ...old,
      [srvNombre]: { ...prev, meta_diaria: validMeta, activo: true },
    }));
  };

  const handleGuardarTodo = async () => {
    setSaving(true);
    try {
      for (const [srvNombre, conf] of Object.entries(activeMetas)) {
        await saveMetaServicio(tenantId, srvNombre, conf.meta_diaria, conf.activo);
      }
      queryClient.invalidateQueries({ queryKey: ["metas-servicios", tenantId] });
      toast.success("Metas guardadas correctamente 🎯");
      setOpen(false);
    } catch (e: any) {
      toast.error("Error al guardar: " + (e?.message || "Intente de nuevo"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* BOTÓN DISPARADOR INSTANTÁNEO */}
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl h-10 px-5 font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
        title="Configurar y gestionar lotes y metas diarias por servicio"
      >
        <Target className="h-4 w-4 text-[#F0B900] shrink-0" />
        <span>Lotes por servicio</span>
        {Object.values(metasConfig).some((m) => m.activo) && (
          <Badge className="bg-[#F0B900] text-slate-950 text-[9px] font-black px-1.5 py-0 rounded-md">
            METAS
          </Badge>
        )}
      </Button>

      {/* MODAL COMPACTO Y ELEGANTE */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl max-w-lg p-0 overflow-hidden border-none shadow-2xl bg-background text-foreground">
          {/* HEADER COMPACTO */}
          <div className="bg-slate-50/70 dark:bg-slate-900/60 p-3.5 pb-2.5 px-4 relative border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center justify-between pr-10">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/15 shadow-xs">
                  <Target className="h-4 w-4" />
                </div>
                <div>
                  <DialogTitle className="text-sm sm:text-base font-display font-bold text-foreground flex items-center gap-2">
                    Lotes y Metas por Servicio
                    <Badge variant="outline" className="text-[8.5px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 px-1.5 py-0">
                      Producción Diaria
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-[11px] text-muted-foreground">
                    Define la capacidad diaria que procesará tu lavandería por servicio.
                  </DialogDescription>
                </div>
              </div>
            </div>
          </div>

          {/* LISTA DE SERVICIOS */}
          <div className="p-3 sm:p-4 space-y-2.5 max-h-[55vh] overflow-y-auto">
            {listaServicios.map((srv) => {
              const config = activeMetas[srv.nombre] || { meta_diaria: 25, activo: false };
              const stats = statsPorServicio[srv.nombre] || { totalHoy: 0, listasHoy: 0, enProceso: 0 };
              const porcentaje = config.activo && config.meta_diaria > 0 
                ? Math.min(100, Math.round((stats.listasHoy / config.meta_diaria) * 100))
                : 0;

              const isMetaCumplida = config.activo && stats.listasHoy >= config.meta_diaria && config.meta_diaria > 0;

              return (
                <div
                  key={srv.nombre}
                  className={`p-3 rounded-xl border transition-all duration-150 ${
                    config.activo
                      ? isMetaCumplida
                        ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 shadow-2xs"
                        : "bg-surface border-border shadow-2xs"
                      : "bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                  }`}
                >
                  {/* FILA 1: NOMBRE + CONTROLES CENTRADOS Y SIN BORDES INTERNOS */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`h-8.5 w-8.5 rounded-xl border flex items-center justify-center shrink-0 ${
                        config.activo 
                          ? "bg-primary/10 border-primary/20 text-primary"
                          : "bg-muted border-border text-muted-foreground"
                      }`}>
                        <Shirt className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-foreground truncate flex items-center gap-1.5">
                          {srv.nombre}
                          {isMetaCumplida && (
                            <span className="text-[8px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded-md">
                              Listo ✓
                            </span>
                          )}
                        </h4>
                        <p className="text-[10.5px] text-muted-foreground truncate">
                          {config.activo ? `Lote de hoy: ${config.meta_diaria} órdenes` : "Sin límite de lote"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      {config.activo && (
                        <div className="flex items-center h-8.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-full shadow-2xs gap-1.5">
                          {/* Botón Circular Menos (Rose) */}
                          <button
                            type="button"
                            className="h-6 w-6 rounded-full bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shadow-2xs transition-all active:scale-90 cursor-pointer shrink-0"
                            onClick={() => handleUpdateCantidad(srv.nombre, -5, true)}
                            title="Restar 5"
                          >
                            <Minus className="h-3 w-3 stroke-[2.5]" />
                          </button>
                          
                          {/* Campo Cantidad Centrado Limpio Sin Bordes Internos */}
                          <div className="flex items-center justify-center">
                            <input
                              type="number"
                              min={1}
                              max={999}
                              value={config.meta_diaria}
                              onChange={(e) => handleUpdateCantidad(srv.nombre, parseInt(e.target.value) || 1, false)}
                              className="w-9 text-center font-black text-xs sm:text-sm p-0 border-0 outline-none focus:outline-none focus:ring-0 bg-transparent text-slate-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                          
                          {/* Botón Circular Más (Emerald) */}
                          <button
                            type="button"
                            className="h-6 w-6 rounded-full bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-2xs transition-all active:scale-90 cursor-pointer shrink-0"
                            onClick={() => handleUpdateCantidad(srv.nombre, 5, true)}
                            title="Sumar 5"
                          >
                            <Plus className="h-3 w-3 stroke-[2.5]" />
                          </button>
                          
                          <span className="text-[10.5px] font-bold text-slate-400 dark:text-slate-500 pl-0.5 pr-1 select-none">Órdenes</span>
                        </div>
                      )}

                      <Switch
                        checked={config.activo}
                        onCheckedChange={(checked) => handleToggle(srv.nombre, checked)}
                        className="scale-85"
                      />
                    </div>
                  </div>

                  {/* FILA 2: PROGRESO Y BOTÓN */}
                  {config.activo && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-primary shrink-0" />
                          <span>Avance: <strong className="text-foreground">{stats.listasHoy} / {config.meta_diaria}</strong></span>
                          {stats.enProceso > 0 && (
                            <span className="text-amber-600 dark:text-amber-400 font-bold ml-1 text-[10.5px]">
                              ({stats.enProceso} en cola)
                            </span>
                          )}
                        </span>
                        <span className={`font-black text-xs ${isMetaCumplida ? "text-emerald-600 dark:text-emerald-400" : "text-primary"}`}>
                          {porcentaje}%
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden border border-border/40">
                          <div
                            className={`h-full transition-all duration-300 rounded-full ${
                              isMetaCumplida
                                ? "bg-emerald-500"
                                : porcentaje > 50
                                ? "bg-[#1B4B73]"
                                : "bg-[#F0B900]"
                            }`}
                            style={{ width: `${porcentaje}%` }}
                          />
                        </div>

                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            onFiltrarLote(srv.nombre, config.meta_diaria);
                            setOpen(false);
                          }}
                          className="h-6 px-2 text-[10px] font-bold gap-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 cursor-pointer active:scale-95 transition-all shrink-0"
                        >
                          <Filter className="h-2.5 w-2.5" />
                          <span>Trabajar lote ({config.meta_diaria})</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* FOOTER COMPACTO */}
          <div className="flex items-center justify-between p-3 px-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-xl h-9 text-xs px-4 border-slate-300 dark:border-slate-800 font-semibold cursor-pointer"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              onClick={handleGuardarTodo}
              disabled={saving}
              className="bg-primary text-primary-foreground rounded-xl h-9 text-xs px-5 font-bold shadow-md hover:bg-primary/90 transition-colors gap-1.5 cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{saving ? "Guardando..." : "Guardar Configuración"}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});
