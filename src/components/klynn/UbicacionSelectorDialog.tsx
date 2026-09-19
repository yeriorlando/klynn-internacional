import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  CheckCircle2,
  RotateCw,
  Box,
  Sparkles,
  Layers,
  X,
  Edit3,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  getDefaultEstanteriaZonas,
  isModuleEnabled,
  type EstanteriaZona,
  type Orden,
  type Tenant,
} from "@/lib/storage";

export interface UbicacionSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ubicacionActual: string;
  onSelectUbicacion: (ubicacion: string) => void;
  tenant?: Tenant | null;
  ordenesActivas?: Orden[];
  ordenActualId?: string;
}

const PAGE_SIZE = 12;

export function UbicacionSelectorDialog({
  open,
  onOpenChange,
  ubicacionActual,
  onSelectUbicacion,
  tenant,
  ordenesActivas = [],
  ordenActualId,
}: UbicacionSelectorDialogProps) {
  const [selectedUbicacion, setSelectedUbicacion] = useState(ubicacionActual || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [manualInput, setManualInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const hasEstanteriaModule = useMemo(() => {
    return isModuleEnabled(tenant || null, "estanteria");
  }, [tenant]);

  const zonas: EstanteriaZona[] = useMemo(() => {
    if (tenant?.config?.estanteria_zonas && tenant.config.estanteria_zonas.length > 0) {
      return tenant.config.estanteria_zonas;
    }
    return getDefaultEstanteriaZonas();
  }, [tenant?.config?.estanteria_zonas]);

  // Mapa de órdenes activas que ocupan slots
  const occupiedSlotsMap = useMemo(() => {
    const map = new Map<string, Orden>();
    ordenesActivas.forEach((ord) => {
      if (
        ord.id !== ordenActualId &&
        ord.estado !== "ENTREGADA" &&
        ord.estado !== "ANULADA" &&
        ord.ubicacion_ropa &&
        ord.ubicacion_ropa.trim()
      ) {
        map.set(ord.ubicacion_ropa.trim().toLowerCase(), ord);
      }
    });
    return map;
  }, [ordenesActivas, ordenActualId]);

  // Conteo por zona y total global
  const zoneStats = useMemo(() => {
    const stats = new Map<string, { total: number; free: number }>();
    let totalAll = 0;
    let freeAll = 0;
    zonas.forEach((z) => {
      let free = 0;
      z.slots.forEach((s) => {
        totalAll++;
        if (!occupiedSlotsMap.has(s.toLowerCase())) {
          free++;
          freeAll++;
        }
      });
      stats.set(z.id, { total: z.slots.length, free });
    });
    stats.set("all", { total: totalAll, free: freeAll });
    return stats;
  }, [zonas, occupiedSlotsMap]);

  useEffect(() => {
    if (open) {
      setSelectedUbicacion(ubicacionActual || "");
      setManualInput(ubicacionActual || "");
      setSearchQuery("");
      setCurrentPage(1);
      if (!hasEstanteriaModule) {
        setActiveTab("manual");
      } else if (zonas.length > 0) {
        if (activeTab === "all" || !zonas.some((z) => z.id === activeTab)) {
          setActiveTab(zonas.length > 1 ? "all" : zonas[0].id);
        }
      } else {
        setActiveTab("manual");
      }
    }
  }, [open, ubicacionActual, zonas, hasEstanteriaModule]);

  const handleSave = () => {
    const finalVal = (activeTab === "manual" ? manualInput : selectedUbicacion).trim();
    if (!finalVal) {
      toast.error("Debes seleccionar o ingresar una ubicación en estantería");
      return;
    }
    onSelectUbicacion(finalVal);
    onOpenChange(false);
    toast.success(`Ubicación asignada: ${finalVal} 📍`);
  };

  const handleClear = () => {
    setSelectedUbicacion("");
    setManualInput("");
  };

  // Filtrado de slots
  const allFilteredSlots = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result: { slotName: string; zoneName: string; occupiedBy?: Orden }[] = [];

    const targetZonas =
      activeTab === "all" || activeTab === "manual"
        ? zonas
        : zonas.filter((z) => z.id === activeTab);

    targetZonas.forEach((z) => {
      z.slots.forEach((slotName) => {
        if (!q || slotName.toLowerCase().includes(q)) {
          const occupied = occupiedSlotsMap.get(slotName.toLowerCase());
          result.push({
            slotName,
            zoneName: z.nombre,
            occupiedBy: occupied,
          });
        }
      });
    });

    return result;
  }, [zonas, activeTab, searchQuery, occupiedSlotsMap]);

  // Paginación
  const totalPages = Math.max(1, Math.ceil(allFilteredSlots.length / PAGE_SIZE));
  const paginatedSlots = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return allFilteredSlots.slice(start, start + PAGE_SIZE);
  }, [allFilteredSlots, currentPage]);

  const getZoneIcon = (tipo: string) => {
    switch (tipo) {
      case "conveyor":
        return <RotateCw className="h-3.5 w-3.5" />;
      case "estante":
        return <Box className="h-3.5 w-3.5" />;
      case "riel":
        return <Sparkles className="h-3.5 w-3.5" />;
      default:
        return <Layers className="h-3.5 w-3.5" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[94vw] sm:max-w-[545px] rounded-3xl p-5 sm:p-6 gap-3 overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-2xl bg-background text-foreground">
        {/* HEADER CON IDENTIDAD DE MARCA KLYNN */}
        <DialogHeader className="space-y-0.5 text-left pr-8">
          <div className="flex items-center justify-between gap-2.5">
            <DialogTitle className="flex items-center gap-2.5 text-base sm:text-[17px] font-black text-slate-900 dark:text-white tracking-tight">
              <span className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#1B4B73] to-[#133857] text-[#F0B900] flex items-center justify-center shadow-xs shrink-0">
                <Layers className="h-4 w-4" />
              </span>
              <span>Ubicación en Estantería</span>
            </DialogTitle>

            {selectedUbicacion && (
              <Badge className="bg-[#1B4B73]/10 dark:bg-[#1B4B73]/30 hover:bg-[#1B4B73]/20 text-[#1B4B73] dark:text-[#F0B900] border border-[#1B4B73]/20 font-bold text-xs px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 shadow-2xs shrink-0">
                <MapPin className="h-3 w-3 text-[#1B4B73] dark:text-[#F0B900]" />
                <span>{selectedUbicacion}</span>
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Asigna un gancho, casillero o perchero para esta orden.
          </DialogDescription>
        </DialogHeader>

        {!hasEstanteriaModule ? (
          /* MODO MANUAL EXCLUSIVO */
          <div className="py-5 space-y-3.5 max-w-sm mx-auto text-center w-full">
            <div className="h-11 w-11 mx-auto rounded-xl bg-[#1B4B73]/10 text-[#1B4B73] dark:text-[#F0B900] flex items-center justify-center border border-[#1B4B73]/20 shadow-2xs">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">Asignación Manual de Ubicación</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ingresa una ubicación física personalizada para esta orden.
              </p>
            </div>
            <Input
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              placeholder="Ej. Mesa 2, Cesta VIP, Gancho 99..."
              className="h-9.5 text-center font-bold text-xs sm:text-sm rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs focus:ring-2 focus:ring-[#1B4B73]/20 focus:border-[#1B4B73]"
              autoFocus
            />
          </div>
        ) : (
          /* VISTA ESTANTERÍA VIRTUAL */
          <div className="space-y-3 w-full min-w-0">
            {/* BUSCADOR CON FONDO BLANCO Y PESTAÑAS */}
            <div className="space-y-2.5 w-full min-w-0">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar gancho o casillero..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 pr-8 h-9.5 rounded-xl text-xs sm:text-sm font-medium bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs placeholder:text-slate-400 focus-visible:ring-[#1B4B73]/20 focus-visible:border-[#1B4B73] w-full"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setCurrentPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Pestañas de Zona estilo Pills con Azul Añil Klynn */}
              <div className="flex items-center gap-1.5 flex-wrap w-full">
                {zonas.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("all");
                      setSearchQuery("");
                      setCurrentPage(1);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "all"
                        ? "bg-[#1B4B73] text-white shadow-2xs"
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 shadow-2xs"
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>Todas</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                        activeTab === "all"
                          ? "bg-[#F0B900] text-[#133857]"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      {zoneStats.get("all")?.free ?? 0}/{zoneStats.get("all")?.total ?? 0}
                    </span>
                  </button>
                )}

                {zonas.map((z) => {
                  const stat = zoneStats.get(z.id) || { total: z.slots.length, free: z.slots.length };
                  const isActive = activeTab === z.id;
                  return (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(z.id);
                        setSearchQuery("");
                        setCurrentPage(1);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#1B4B73] text-white shadow-2xs"
                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 shadow-2xs"
                      }`}
                    >
                      {getZoneIcon(z.tipo)}
                      <span>{z.nombre}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                          isActive
                            ? "bg-[#F0B900] text-[#133857]"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}
                      >
                        {stat.free}/{stat.total}
                      </span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("manual");
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "manual"
                      ? "bg-[#1B4B73] text-white shadow-2xs"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 shadow-2xs"
                  }`}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Manual</span>
                </button>
              </div>
            </div>

            {/* CONTENIDO DE SLOTS */}
            <div className="w-full min-w-0">
              {activeTab === "manual" ? (
                <div className="py-4 space-y-2.5 max-w-xs mx-auto text-center w-full">
                  <p className="text-xs text-muted-foreground">
                    Ingresa una ubicación física personalizada para esta orden.
                  </p>
                  <Input
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave();
                    }}
                    placeholder="Ej. Mesa 2, Cesta VIP, Gancho 99..."
                    className="h-9.5 text-center font-bold text-xs sm:text-sm rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs focus:ring-2 focus:ring-[#1B4B73]/20 focus:border-[#1B4B73]"
                    autoFocus
                  />
                </div>
              ) : allFilteredSlots.length === 0 ? (
                <div className="py-7 text-center text-muted-foreground space-y-1.5">
                  <Layers className="h-6 w-6 mx-auto opacity-30 text-[#1B4B73]" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    No se encontraron casilleros o ganchos
                  </p>
                  {searchQuery && (
                    <p className="text-[11px] text-slate-400">
                      Prueba con otro término de búsqueda
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5 w-full min-w-0">
                  {/* Cuadrícula de Tarjetas de Slots */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full min-w-0">
                    {paginatedSlots.map(({ slotName, occupiedBy }) => {
                      const isOccupied = !!occupiedBy;
                      const isSelected = selectedUbicacion.toLowerCase() === slotName.toLowerCase();

                      if (isOccupied) {
                        return (
                          <div
                            key={slotName}
                            className="flex flex-col justify-between p-2.5 rounded-xl border border-rose-200/70 dark:border-rose-950 bg-rose-50/40 dark:bg-rose-950/20 select-none cursor-not-allowed h-[72px] min-w-0 text-left opacity-85"
                          >
                            <div className="flex items-center justify-between w-full min-w-0">
                              <span className="text-xs sm:text-[13px] font-bold text-slate-500 dark:text-slate-400 truncate">
                                {slotName}
                              </span>
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-400/80 shrink-0" />
                            </div>

                            <div className="flex items-center justify-between gap-1 w-full min-w-0">
                              <span className="font-mono text-[9.5px] font-black text-rose-700 dark:text-rose-400 bg-rose-100/70 dark:bg-rose-900/40 border border-rose-200/60 dark:border-rose-800/50 px-1.5 py-0.5 rounded truncate max-w-[65%]">
                                #{occupiedBy.numero.replace(/^#/, "")}
                              </span>
                              <span className="text-[9px] font-bold text-rose-600/80 dark:text-rose-400/80 shrink-0">
                                Ocupado
                              </span>
                            </div>
                          </div>
                        );
                      }

                      if (isSelected) {
                        return (
                          <button
                            key={slotName}
                            type="button"
                            onClick={() => {
                              setSelectedUbicacion(slotName);
                              setManualInput(slotName);
                            }}
                            className="flex flex-col justify-between p-2.5 rounded-xl border-2 border-[#1B4B73] bg-[#1B4B73] text-white shadow-xs ring-2 ring-[#1B4B73]/30 transition-all cursor-pointer h-[72px] min-w-0 text-left"
                          >
                            <div className="flex items-center justify-between w-full min-w-0">
                              <span className="text-xs sm:text-[13px] font-black text-white tracking-tight truncate">
                                {slotName}
                              </span>
                              <div className="h-4 w-4 rounded-full bg-[#F0B900] text-[#133857] flex items-center justify-center shrink-0 shadow-2xs">
                                <Check className="h-2.5 w-2.5 stroke-[3]" />
                              </div>
                            </div>

                            <div className="inline-flex items-center gap-1 text-[9.5px] font-black text-[#F0B900] bg-white/15 px-1.5 py-0.5 rounded w-fit">
                              <CheckCircle2 className="h-2.5 w-2.5 text-[#F0B900]" />
                              <span>Elegido</span>
                            </div>
                          </button>
                        );
                      }

                      return (
                        <button
                          key={slotName}
                          type="button"
                          onClick={() => {
                            setSelectedUbicacion(slotName);
                            setManualInput(slotName);
                          }}
                          className="group flex flex-col justify-between p-2.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#1B4B73]/60 hover:shadow-2xs transition-all cursor-pointer h-[72px] min-w-0 text-left"
                        >
                          <div className="flex items-center justify-between w-full min-w-0">
                            <span className="text-xs sm:text-[13px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight group-hover:text-[#1B4B73] dark:group-hover:text-[#F0B900] transition-colors truncate">
                              {slotName}
                            </span>
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 ring-2 ring-emerald-500/20" />
                          </div>

                          <div className="inline-flex items-center gap-1 text-[9.5px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/50 px-1.5 py-0.5 rounded w-fit">
                            <span>Disponible</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Paginación */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800/80 text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        Pág <strong className="text-slate-800 dark:text-slate-200 font-bold">{currentPage}</strong> de{" "}
                        <strong className="text-slate-800 dark:text-slate-200 font-bold">{totalPages}</strong> ({allFilteredSlots.length} espacios)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6.5 px-2.5 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shadow-2xs"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        >
                          <ChevronLeft className="h-3 w-3 mr-0.5" />
                          Anterior
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6.5 px-2.5 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shadow-2xs"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        >
                          Siguiente
                          <ChevronRight className="h-3 w-3 ml-0.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* FOOTER CON IDENTIDAD KLYNN */}
        <div className="flex flex-row items-center justify-between pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60 w-full gap-2">
          <div className="min-w-0">
            {selectedUbicacion ? (
              <div className="flex items-center gap-1.5 bg-[#1B4B73]/10 dark:bg-[#1B4B73]/30 border border-[#1B4B73]/20 px-2.5 py-1 rounded-xl truncate">
                <MapPin className="h-3.5 w-3.5 text-[#1B4B73] dark:text-[#F0B900] shrink-0" />
                <span className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate">
                  Asignar: <strong className="text-[#1B4B73] dark:text-[#F0B900] font-black">{selectedUbicacion}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[10.5px] text-rose-500 hover:text-rose-700 font-bold hover:underline cursor-pointer shrink-0 ml-1"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic">
                Sin ubicación asignada
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs font-bold h-8.5 px-3.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shadow-2xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!(activeTab === "manual" ? manualInput.trim() : selectedUbicacion.trim())}
              className="rounded-xl bg-[#1B4B73] hover:bg-[#133857] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold h-8.5 px-4 gap-1.5 shadow-xs hover:shadow-[#1B4B73]/25 cursor-pointer transition-all"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-[#F0B900]" />
              Guardar Ubicación
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
