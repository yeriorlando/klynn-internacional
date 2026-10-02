import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PauseCircle,
  Play,
  Trash2,
  Clock,
  User as UserIcon,
  Shirt,
  Zap,
  Phone,
  Truck,
  WashingMachine,
  Receipt,
} from "lucide-react";
import type { HeldOrder } from "@/lib/pos-held-orders";
import { formatRD } from "@/lib/storage";

function formatRelativeTime(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "Hace un momento";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} d`;
  } catch {
    return "";
  }
}

interface HeldOrdersPOSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  heldOrders: HeldOrder[];
  onRetomar: (order: HeldOrder) => void;
  onEliminar: (orderId: string) => void;
  currencySymbol?: string;
}

export function HeldOrdersPOSDialog({
  open,
  onOpenChange,
  heldOrders,
  onRetomar,
  onEliminar,
  currencySymbol = "RD$",
}: HeldOrdersPOSDialogProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-3xl border border-[#1B4B73]/25 shadow-2xl bg-white dark:bg-slate-950">
        {/* Cabecera con degradado Azul Añil Klynn */}
        <DialogHeader className="p-4 sm:p-4.5 pb-3 border-b border-[#1B4B73]/15 bg-gradient-to-r from-[#1B4B73]/10 via-[#1B4B73]/5 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-[#1B4B73] text-white shadow-sm shadow-[#1B4B73]/30 shrink-0">
              <PauseCircle className="h-4.5 w-4.5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                Órdenes en Espera
                <span className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#1B4B73] px-1.5 text-[10px] font-black text-white tabular-nums">
                  {heldOrders.length}
                </span>
              </DialogTitle>
              <DialogDescription className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Retoma órdenes que fueron pausadas temporalmente en el mostrador.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-3 sm:p-3.5 space-y-2.5 custom-scrollbar">
          {heldOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1B4B73]/10 text-[#1B4B73] dark:text-[#38bdf8] mb-2.5">
                <PauseCircle className="h-6 w-6 stroke-[2]" />
              </div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                No hay órdenes en espera
              </h4>
              <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                Usa el botón "Pausar" en el mostrador para dejar una orden en espera y atender a otro cliente.
              </p>
            </div>
          ) : (
            heldOrders.map((ord) => {
              const isDeleting = confirmDeleteId === ord.id;
              const nombreCliente = ord.cliente
                ? [ord.cliente.nombre, ord.cliente.apellido].filter(Boolean).join(" ")
                : "Consumidor Final";

              // Filtrar prendas principales (no subítems)
              const cleanItems = (ord.items || []).filter(
                (it) => !it.descripcion.startsWith("↳")
              );
              const visibleItems = cleanItems.slice(0, 3);
              const remainingItemsCount = cleanItems.length - visibleItems.length;

              return (
                <div
                  key={ord.id}
                  className="group relative rounded-2xl border-[1.5px] border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 sm:p-3.5 transition-all duration-150 hover:border-[#1B4B73]/60 shadow-xs hover:shadow-sm space-y-2.5"
                >
                  {/* Fila 1: Cliente, Badges y Tiempo con Fondo de Color */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#1B4B73]/10 text-[#1B4B73] dark:text-sky-300 font-bold text-xs">
                        <UserIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {nombreCliente}
                        </span>
                        {ord.esUrgente && (
                          <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[9px] px-1 py-0 h-4 font-bold flex items-center gap-0.5 shrink-0">
                            <Zap className="h-2 w-2 fill-current" /> Urgente
                          </Badge>
                        )}
                        {ord.servicioDomicilio && (
                          <Badge className="bg-[#1B4B73]/10 text-[#1B4B73] dark:text-sky-300 border border-[#1B4B73]/25 text-[9px] px-1 py-0 h-4 font-bold flex items-center gap-0.5 shrink-0">
                            <Truck className="h-2 w-2" /> Domicilio
                          </Badge>
                        )}
                        {ord.cliente?.telefono && ord.cliente.telefono !== "---" && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5 truncate">
                            <Phone className="h-2.5 w-2.5 opacity-60" />
                            {ord.cliente.telefono}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Badge de tiempo con fondo de color */}
                    <span className="text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200/90 dark:border-slate-700 shrink-0 shadow-2xs">
                      <Clock className="h-2.5 w-2.5 text-slate-500" />
                      {formatRelativeTime(ord.createdAt)}
                    </span>
                  </div>

                  {/* Fila 2: Servicios y Prendas a la izquierda | TOTAL DE LA ORDEN a la derecha arriba de botones */}
                  <div className="flex items-center justify-between gap-3 pt-0.5">
                    {/* Izquierda: Badge sólido de servicio y lista de prendas */}
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
                      {ord.serviciosSel && ord.serviciosSel.length > 0 && ord.serviciosSel.map((srv, idx) => (
                        <span
                          key={`srv-${idx}`}
                          className="inline-flex items-center gap-1 text-[10.5px] font-bold text-white bg-[#1B4B73] px-2 py-0.5 rounded-lg shadow-2xs"
                        >
                          <WashingMachine className="h-3 w-3 text-white" />
                          {srv}
                        </span>
                      ))}

                      {visibleItems.map((item, idx) => (
                        <span
                          key={`item-${idx}`}
                          className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-1.5 py-0.5 rounded-md truncate max-w-[130px]"
                          title={item.descripcion}
                        >
                          <span className="font-bold text-slate-900 dark:text-white">
                            {item.cantidad > 1 ? `${item.cantidad}x` : "1x"}
                          </span>
                          <span className="truncate">{item.descripcion.replace(/\s*\([^)]*\)$/, "")}</span>
                        </span>
                      ))}

                      {remainingItemsCount > 0 && (
                        <span className="text-[9.5px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                          +{remainingItemsCount} más
                        </span>
                      )}
                    </div>

                    {/* Derecha: Total de la orden con icono y label explícito */}
                    <div className="text-right shrink-0">
                      <span className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-400 flex items-center justify-end gap-1">
                        <Receipt className="h-2.5 w-2.5 text-slate-400" />
                        TOTAL DE LA ORDEN:
                      </span>
                      <span className="text-base sm:text-lg font-black text-[#1B4B73] dark:text-white font-display block -mt-0.5">
                        {currencySymbol} {formatRD(ord.total).replace("RD$", "").trim()}
                      </span>
                    </div>
                  </div>

                  {/* Fila 3: Prendas / Notas a la izquierda y Botones de Acción a la derecha */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <Shirt className="h-3 w-3 text-slate-400 shrink-0" />
                        {ord.totalPiezas || ord.items?.length || 0} prendas
                      </span>
                      {ord.notas && (
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md italic truncate max-w-[170px]">
                          "{ord.notas}"
                        </span>
                      )}
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isDeleting ? (
                        <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                          <span className="text-[10px] font-bold text-destructive">¿Borrar?</span>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="h-7.5 px-2.5 text-[11px] font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
                            onClick={() => {
                              onEliminar(ord.id);
                              setConfirmDeleteId(null);
                            }}
                          >
                            Sí, borrar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7.5 px-2 text-[11px] rounded-lg cursor-pointer"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <>
                          {/* Botón Descartar: Fondo sólido color rojo y texto blanco */}
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer border-none"
                            onClick={() => setConfirmDeleteId(ord.id)}
                            title="Descartar orden en espera"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-white" />
                            <span>Descartar</span>
                          </Button>

                          {/* Botón Retomar orden: Fondo sólido VERDE con icono Play blanco */}
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer border-none"
                            onClick={() => {
                              onRetomar(ord);
                              onOpenChange(false);
                            }}
                          >
                            <Play className="h-3.5 w-3.5 fill-white text-white" />
                            <span>Retomar orden</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
