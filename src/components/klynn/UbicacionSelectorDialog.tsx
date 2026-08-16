import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
          setActiveTab(zonas[0].id);
        }
      } else {
        setActiveTab("manual");
      }
    }
  }, [open, ubicacionActual, zonas, hasEstanteriaModule]);

  const handleSave = () => {
    const finalVal = (activeTab === "manual" ? manualInput : selectedUbicacion).trim();
    onSelectUbicacion(finalVal);
    onOpenChange(false);
    if (finalVal) {
      toast.success(`Ubicación asignada: ${finalVal} 📍`);
    } else {
      toast.info("Ubicación removida");
    }
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

  // Conteo por zona
  const zoneStats = useMemo(() => {
    const stats = new Map<string, { total: number; free: number }>();
    zonas.forEach((z) => {
      let free = 0;
      z.slots.forEach((s) => {
        if (!occupiedSlotsMap.has(s.toLowerCase())) {
          free++;
        }
      });
      stats.set(z.id, { total: z.slots.length, free });
    });
    return stats;
  }, [zonas, occupiedSlotsMap]);

  const getZoneIcon = (tipo: string) => {
    switch (tipo) {
      case "conveyor":
        return <RotateCw className="h-3 w-3" />;
      case "estante":
        return <Box className="h-3 w-3" />;
      case "riel":
        return <Sparkles className="h-3 w-3" />;
      default:
        return <Layers className="h-3 w-3" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-md sm:max-w-lg rounded-2xl p-5 gap-3.5 overflow-hidden">
        {/* HEADER */}
        <DialogHeader className="space-y-1 text-left">
          <div className="flex items-center justify-between gap-2 pr-6">
            <DialogTitle className="flex items-center gap-2 text-sm font-black text-foreground">
              <span className="h-6 w-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Layers className="h-3.5 w-3.5" />
              </span>
              <span>Ubicación en Estantería</span>
            </DialogTitle>

            {selectedUbicacion && (
              <Badge className="bg-indigo-600 hover:bg-indigo-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5" />
                <span>{selectedUbicacion}</span>
              </Badge>
            )}
          </div>
          <DialogDescription className="text-[11px] text-muted-foreground">
            Selecciona el gancho o casillero disponible para esta orden.
          </DialogDescription>
        </DialogHeader>

        {!hasEstanteriaModule ? (
          /* MODO MANUAL EXCLUSIVO (Módulo de Estantería Desactivado en el plan) */
          <div className="py-4 space-y-3 max-w-sm mx-auto text-center w-full">
            <div className="h-11 w-11 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50 shadow-2xs">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">Asignación Manual de Ubicación</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
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
              className="h-10 text-center font-bold text-xs sm:text-sm rounded-xl border-indigo-200 dark:border-indigo-800 focus:ring-2 focus:ring-indigo-500/20"
              autoFocus
            />
          </div>
        ) : (
          /* VISTA COMPLETA ESTANTERÍA VIRTUAL (CONVEYOR, RIELES, ESTANTES) */
          <>
            {/* BUSCADOR Y TABS */}
            <div className="space-y-2 w-full min-w-0">
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar gancho o casillero..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8 h-8 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border-border/80 w-full"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setCurrentPage(1);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Pestañas de Zona con Flex Wrap para evitar desbordes */}
              <div className="flex items-center gap-1.5 flex-wrap w-full">
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
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      {getZoneIcon(z.tipo)}
                      <span>{z.nombre}</span>
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-slate-200 dark:bg-slate-800 text-slate-500"
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
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    activeTab === "manual"
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  <Edit3 className="h-3 w-3" />
                  <span>Manual</span>
                </button>
              </div>
            </div>

            {/* CONTENIDO DE SLOTS O INPUT MANUAL */}
            <div className="w-full min-w-0 py-1">
              {activeTab === "manual" ? (
                <div className="py-3 space-y-2 max-w-xs mx-auto text-center w-full">
                  <p className="text-[11px] text-muted-foreground">
                    Ingresa una ubicación física personalizada para esta orden.
                  </p>
                  <Input
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave();
                    }}
                    placeholder="Ej. Mesa 2, Cesta VIP, Gancho 99..."
                    className="h-9 text-center font-bold text-xs rounded-lg border-indigo-200 dark:border-indigo-800"
                    autoFocus
                  />
                </div>
              ) : allFilteredSlots.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground space-y-1">
                  <Layers className="h-5 w-5 mx-auto opacity-40" />
                  <p className="text-xs font-medium">No hay espacios disponibles</p>
                </div>
              ) : (
                <div className="space-y-2 w-full min-w-0">
                  {/* Cuadrícula compacta de 4 columnas */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full min-w-0">
                    {paginatedSlots.map(({ slotName, occupiedBy }) => {
                      const isOccupied = !!occupiedBy;
                      const isSelected = selectedUbicacion.toLowerCase() === slotName.toLowerCase();

                      if (isOccupied) {
                        return (
                          <div
                            key={slotName}
                            className="flex flex-col justify-between p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 text-left select-none opacity-80 cursor-not-allowed h-[68px] min-w-0"
                          >
                            <div className="flex items-center justify-between w-full min-w-0">
                              <span className="text-[11px] font-extrabold text-rose-900 dark:text-rose-200 truncate">
                                {slotName}
                              </span>
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                            </div>

                            <div className="w-full min-w-0">
                              <div className="font-mono text-[10px] font-black text-rose-600 dark:text-rose-400 truncate">
                                {occupiedBy.numero.replace(/^#/, "")}
                              </div>
                              <div className="text-[9px] font-bold text-rose-700/80 dark:text-rose-300/80">
                                Ocupado
                              </div>
                            </div>
                          </div>
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
                          className={`flex flex-col justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer h-[68px] min-w-0 ${
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs ring-2 ring-indigo-400 scale-[1.02]"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:shadow-2xs"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full min-w-0">
                            <span
                              className={`text-[11px] font-extrabold truncate ${
                                isSelected ? "text-white" : "text-foreground"
                              }`}
                            >
                              {slotName}
                            </span>
                            <span
                              className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                isSelected ? "bg-white" : "bg-emerald-500"
                              }`}
                            />
                          </div>

                          <div className="w-full min-w-0">
                            <div
                              className={`text-[9px] font-bold truncate ${
                                isSelected ? "text-white/80" : "text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              Disponible
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Paginación */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[10px]">
                      <span className="text-muted-foreground font-medium">
                        Pág {currentPage} de {totalPages} ({allFilteredSlots.length} espacios)
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-md cursor-pointer"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-md cursor-pointer"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        >
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* FOOTER */}
        <DialogFooter className="flex flex-row items-center justify-between sm:justify-between w-full pt-2 border-t border-border/50 gap-2">
          <div className="min-w-0">
            {selectedUbicacion ? (
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="h-3 w-3 text-indigo-600 shrink-0" />
                <span className="text-xs text-muted-foreground truncate">
                  <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{selectedUbicacion}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[10.5px] text-rose-600 hover:underline font-bold cursor-pointer shrink-0"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                Sin ubicación
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-lg text-xs font-bold h-8 px-3 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-8 px-3.5 gap-1 shadow-2xs cursor-pointer"
            >
              <CheckCircle2 className="h-3 w-3" />
              Guardar Ubicación
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
