import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Pencil,
  Plus,
  Minus,
  Trash2,
  History,
  LockKeyhole,
  Search,
  User as UserIcon,
  X,
  Check,
  Layers,
  ExternalLink,
  Clock,
  Sparkles,
  Truck,
  Shirt,
  DollarSign,
  AlertCircle,
  Calendar as CalendarIcon,
  Receipt,
  Scale,
  Zap,
  CircleDollarSign,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  formatRD,
  type Orden,
  type OrdenItem,
  type Cliente,
  type Servicio,
  type Empleado,
  type CatalogoItem,
  type Tenant,
} from "@/lib/storage";
import { useCatalogo } from "@/hooks/use-queries";
import {
  loadOrderEdit,
  submitOrderEdit,
  orderEditPatch,
  type OrderEditContext,
  type OrderEditPreview,
  type OrderChanges,
} from "@/lib/order-edit";

const labels: Record<string, string> = {
  fecha_entrega: "Fecha de entrega",
  notas: "Observaciones",
  direccion_entrega: "Dirección",
  referencia_entrega: "Referencia",
  items: "Prendas",
  cliente_id: "Cliente",
  descuento: "Descuento",
  costo_envio: "Envío",
  es_urgente: "Tipo de orden",
  servicios: "Servicios",
  servicios_precios: "Precios de servicios",
  subtotal: "Subtotal",
  itbis: "ITBIS",
  total: "Total",
  saldo: "Saldo",
  lat_entrega: "Latitud de entrega",
  lng_entrega: "Longitud de entrega",
  repartidor_id: "Repartidor",
  ubicacion_ropa: "Ubicación en estantería",
};

const fieldIcons: Record<string, any> = {
  items: Shirt,
  subtotal: Receipt,
  itbis: Receipt,
  total: DollarSign,
  saldo: Scale,
  descuento: DollarSign,
  es_urgente: Sparkles,
  fecha_entrega: CalendarIcon,
  servicios: Sparkles,
  servicios_precios: Sparkles,
  costo_envio: Truck,
  cliente_id: UserIcon,
  notas: Pencil,
  direccion_entrega: Truck,
  referencia_entrega: Truck,
  ubicacion_ropa: Layers,
};

function Changes({
  changes,
  clientes,
  empleados,
}: {
  changes: OrderChanges;
  clientes: Cliente[];
  empleados: Empleado[];
}) {
  function formatDateClean(val: unknown): string {
    if (!val) return "Sin especificar";
    const d = new Date(String(val));
    return isNaN(d.getTime()) ? String(val) : format(d, "dd/MM/yyyy", { locale: es });
  }

  function displayGeneral(key: string, value: unknown): string {
    if (value == null || value === "") return "Sin especificar";
    if (key === "cliente_id") {
      const c = clientes.find((cli) => cli.id === value);
      return c ? `${c.nombre} ${c.apellido || ""}` : String(value);
    }
    if (key === "repartidor_id") {
      const e = empleados.find((emp) => emp.id === value);
      return e ? `${e.nombre} ${e.apellido || ""}` : String(value);
    }
    if (key === "fecha_entrega") {
      return formatDateClean(value);
    }
    if (key === "servicios_precios" && typeof value === "object") {
      return Object.entries(value as Record<string, number>)
        .map(([name, amount]) => `${name}: ${formatRD(Number(amount))}`)
        .join("; ");
    }
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "boolean") return value ? "Sí" : "No";
    return String(value);
  }

  const isFinancial = (k: string) =>
    ["subtotal", "itbis", "descuento", "total", "saldo", "costo_envio"].includes(k);

  // 1. Extraer y estructurar prendas completas con precios separados
  const itemRows = useMemo(() => {
    if (!changes.items) return [];
    const antesItems = Array.isArray(changes.items.antes)
      ? (changes.items.antes as OrdenItem[])
      : [];
    const despuesItems = Array.isArray(changes.items.despues)
      ? (changes.items.despues as OrdenItem[])
      : [];

    const map = new Map<
      string,
      {
        descripcion: string;
        precio_unitario: number;
        es_libra: boolean;
        antesCant: number;
        despuesCant: number;
      }
    >();

    for (const it of antesItems) {
      const key = `${(it.descripcion || "").trim().toLowerCase()}__${Number(it.precio_unitario || 0)}__${it.es_libra ? "lb" : "u"}`;
      const existing = map.get(key);
      if (existing) {
        existing.antesCant += Number(it.cantidad || 0);
      } else {
        map.set(key, {
          descripcion: it.descripcion,
          precio_unitario: Number(it.precio_unitario || 0),
          es_libra: !!it.es_libra,
          antesCant: Number(it.cantidad || 0),
          despuesCant: 0,
        });
      }
    }

    for (const it of despuesItems) {
      const key = `${(it.descripcion || "").trim().toLowerCase()}__${Number(it.precio_unitario || 0)}__${it.es_libra ? "lb" : "u"}`;
      const existing = map.get(key);
      if (existing) {
        existing.despuesCant += Number(it.cantidad || 0);
      } else {
        map.set(key, {
          descripcion: it.descripcion,
          precio_unitario: Number(it.precio_unitario || 0),
          es_libra: !!it.es_libra,
          antesCant: 0,
          despuesCant: Number(it.cantidad || 0),
        });
      }
    }

    return Array.from(map.values()).map((row) => {
      const diffCant = row.despuesCant - row.antesCant;
      const antesSub = row.antesCant * row.precio_unitario;
      const despuesSub = row.despuesCant * row.precio_unitario;
      const isChanged = row.antesCant !== row.despuesCant;
      const unitAntes = row.es_libra
        ? (row.antesCant === 1 ? " lb" : " lbs")
        : (row.antesCant === 1 ? " pza" : " pzas");
      const unitDespues = row.es_libra
        ? (row.despuesCant === 1 ? " lb" : " lbs")
        : (row.despuesCant === 1 ? " pza" : " pzas");

      return {
        ...row,
        diffCant,
        antesSub,
        despuesSub,
        isChanged,
        unitAntes,
        unitDespues,
      };
    });
  }, [changes.items]);

  // 2. Extraer y estructurar servicios con precios separados
  const serviceRows = useMemo(() => {
    if (!changes.servicios && !changes.servicios_precios) return [];
    const antesNames = Array.isArray(changes.servicios?.antes)
      ? (changes.servicios?.antes as string[])
      : [];
    const despuesNames = Array.isArray(changes.servicios?.despues)
      ? (changes.servicios?.despues as string[])
      : [];

    const antesPrices =
      typeof changes.servicios_precios?.antes === "object" && changes.servicios_precios?.antes
        ? (changes.servicios_precios.antes as Record<string, number>)
        : {};
    const despuesPrices =
      typeof changes.servicios_precios?.despues === "object" && changes.servicios_precios?.despues
        ? (changes.servicios_precios.despues as Record<string, number>)
        : {};

    const allNames = Array.from(
      new Set([
        ...antesNames,
        ...despuesNames,
        ...Object.keys(antesPrices),
        ...Object.keys(despuesPrices),
      ]),
    );

    return allNames.map((name) => {
      const enAntes = antesNames.includes(name);
      const enDespues = despuesNames.includes(name);
      const pAntes = antesPrices[name] != null ? Number(antesPrices[name]) : 0;
      const pDespues = despuesPrices[name] != null ? Number(despuesPrices[name]) : pAntes;
      const isChanged = enAntes !== enDespues || pAntes !== pDespues;

      return {
        nombre: name,
        precio: pDespues || pAntes,
        enAntes,
        enDespues,
        pAntes,
        pDespues,
        isChanged,
      };
    });
  }, [changes.servicios, changes.servicios_precios]);

  // 3. Otros campos operativos (NO financieros; los financieros se muestran en la tarjeta contable de liquidación)
  const otherKeys = useMemo(() => {
    return Object.keys(changes).filter(
      (k) =>
        ![
          "items",
          "servicios",
          "servicios_precios",
          "subtotal",
          "itbis",
          "descuento",
          "costo_envio",
          "total",
          "saldo",
        ].includes(k),
    );
  }, [changes]);

  const hasAnyChanges =
    itemRows.length > 0 || serviceRows.length > 0 || otherKeys.length > 0;

  if (!hasAnyChanges) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
      {/* Encabezado fijo con columna de PRECIO dedicada y encabezados de Antes / Después */}
      <div className="grid grid-cols-[1.3fr_95px_1fr_1fr] sm:grid-cols-[1.5fr_110px_1fr_1fr] gap-2 px-3.5 py-2 bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200/90 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider items-center select-none">
        <span className="text-muted-foreground">CAMPO / PRENDA</span>
        <span className="text-right pr-2 text-slate-700 dark:text-slate-300 font-black">
          PRECIO
        </span>
        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-black">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
          <span>DE LA ORDEN</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-black">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>NUEVOS CAMBIOS</span>
        </div>
      </div>

      {/* Lista de cambios con scroll suave */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-56 sm:max-h-64 overflow-y-auto custom-scrollbar">
        {/* BLOQUE 1: Prendas con nombre completo y precio individual en su columna */}
        {itemRows.length > 0 && (
          <>
            {(serviceRows.length > 0 || otherKeys.length > 0) && (
              <div className="px-3.5 py-1 bg-slate-100/70 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Shirt className="h-3 w-3 text-primary" />
                <span>Prendas de la orden ({itemRows.length})</span>
              </div>
            )}
            {itemRows.map((it) => (
              <div
                key={`item-${it.descripcion}-${it.precio_unitario}`}
                className={`grid grid-cols-[1.3fr_95px_1fr_1fr] sm:grid-cols-[1.5fr_110px_1fr_1fr] gap-2 px-3.5 py-2.5 items-center transition-colors text-xs ${
                  it.isChanged
                    ? "bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/40"
                    : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                }`}
              >
                {/* Prenda - Nombre completo sin truncar */}
                <div className="flex items-center gap-2 min-w-0 pr-1">
                  <div className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                    <Shirt className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-foreground text-xs leading-snug break-words">
                        {it.descripcion}
                      </span>
                      {it.isChanged && (
                        <span
                          className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md shrink-0 ${
                            it.despuesCant === 0
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                              : it.antesCant === 0
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          }`}
                        >
                          {it.despuesCant === 0
                            ? "Eliminada"
                            : it.antesCant === 0
                            ? "+Añadida"
                            : `Modificada (${it.diffCant > 0 ? "+" : ""}${it.diffCant})`}
                        </span>
                      )}
                    </div>
                    {it.es_libra && (
                      <span className="text-[10px] text-muted-foreground font-semibold block">
                        Medición por libra
                      </span>
                    )}
                  </div>
                </div>

                {/* Columna de PRECIO unitario dedicada */}
                <div className="text-right pr-2 shrink-0">
                  <span className="inline-block px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 tabular-nums text-xs font-black text-slate-800 dark:text-slate-200 shadow-2xs">
                    {formatRD(it.precio_unitario)}
                  </span>
                </div>

                {/* DE LA ORDEN (Antes) */}
                <div className="min-w-0">
                  {it.antesCant > 0 ? (
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold ${
                        it.isChanged
                          ? "bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 line-through decoration-rose-400"
                          : "bg-slate-100/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span className="font-bold">
                        {it.antesCant}
                        {it.unitAntes}
                      </span>
                      <span className="text-[10px] opacity-75 tabular-nums">
                        ({formatRD(it.antesSub)})
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic text-[11px]">No estaba</span>
                  )}
                </div>

                {/* NUEVOS CAMBIOS (Después) */}
                <div className="min-w-0">
                  {it.despuesCant > 0 ? (
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-bold shadow-2xs ${
                        it.isChanged
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                          : "bg-slate-100/80 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <span className="font-black text-emerald-600 dark:text-emerald-400">
                        {it.despuesCant}
                        {it.unitDespues}
                      </span>
                      <span className="text-[10px] text-emerald-700/90 dark:text-emerald-300 tabular-nums font-bold">
                        ({formatRD(it.despuesSub)})
                      </span>
                    </span>
                  ) : (
                    <span className="text-rose-600 dark:text-rose-400 font-bold text-[11px] italic">
                      Eliminada (0)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {/* BLOQUE 2: Servicios con precio individual en su columna */}
        {serviceRows.length > 0 && (
          <>
            {(itemRows.length > 0 || otherKeys.length > 0) && (
              <div className="px-3.5 py-1 bg-slate-100/70 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary" />
                <span>Servicios de la orden</span>
              </div>
            )}
            {serviceRows.map((srv) => (
              <div
                key={`service-${srv.nombre}`}
                className={`grid grid-cols-[1.3fr_95px_1fr_1fr] sm:grid-cols-[1.5fr_110px_1fr_1fr] gap-2 px-3.5 py-2.5 items-center transition-colors text-xs ${
                  srv.isChanged
                    ? "bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/40"
                    : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-1">
                  <div className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-foreground text-xs leading-snug break-words">
                      {srv.nombre}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">Servicio</span>
                  </div>
                </div>

                {/* Columna de PRECIO del servicio */}
                <div className="text-right pr-2 shrink-0">
                  <span className="inline-block px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 tabular-nums text-xs font-black text-slate-800 dark:text-slate-200 shadow-2xs">
                    {formatRD(srv.precio)}
                  </span>
                </div>

                {/* DE LA ORDEN */}
                <div className="min-w-0">
                  {srv.enAntes ? (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        srv.isChanged
                          ? "bg-rose-50/80 text-rose-800 line-through decoration-rose-400"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      Incluido
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic text-[11px]">No incluido</span>
                  )}
                </div>

                {/* NUEVOS CAMBIOS */}
                <div className="min-w-0">
                  {srv.enDespues ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold shadow-2xs">
                      ✓ Incluido
                    </span>
                  ) : (
                    <span className="text-rose-600 dark:text-rose-400 font-bold text-[11px] italic">
                      Eliminado
                    </span>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {/* BLOQUE 3: Condiciones y fechas operativas de la orden */}
        {otherKeys.length > 0 && (
          <>
            {(itemRows.length > 0 || serviceRows.length > 0) && (
              <div className="px-3.5 py-1 bg-slate-100/70 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Pencil className="h-3 w-3 text-primary" />
                <span>Condiciones y Fechas de la Orden</span>
              </div>
            )}
            {otherKeys.map((key) => {
              const change = changes[key];
              const Icon = fieldIcons[key] || Pencil;
              const label = labels[key] || key;
              const financial = isFinancial(key);
              const diff =
                financial && change.despues != null && change.antes != null
                  ? Number(change.despues) - Number(change.antes)
                  : null;

              return (
                <div
                  key={key}
                  className="grid grid-cols-[1.3fr_95px_1fr_1fr] sm:grid-cols-[1.5fr_110px_1fr_1fr] gap-2 px-3.5 py-2.5 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors text-xs"
                >
                  {/* Concepto con icono */}
                  <div className="flex items-center gap-2 min-w-0 pr-1">
                    <div className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="font-bold text-foreground text-xs break-words">
                      {label}
                    </span>
                  </div>

                  {/* PRECIO / DIFERENCIA */}
                  <div className="text-right pr-2 shrink-0">
                    {diff != null && Math.abs(diff) >= 0.01 ? (
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded-md tabular-nums text-[11px] font-black shadow-2xs ${
                          diff > 0
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/80"
                        }`}
                      >
                        {diff > 0 ? "+" : ""}
                        {formatRD(diff)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground tabular-nums text-xs">—</span>
                    )}
                  </div>

                  {/* DE LA ORDEN (Antes) */}
                  <div className="min-w-0">
                    {financial ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 tabular-nums text-xs font-bold line-through decoration-rose-400">
                        {formatRD(Number(change.antes))}
                      </span>
                    ) : key === "fecha_entrega" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/50 text-rose-700 text-xs tabular-nums line-through">
                        <CalendarIcon className="h-3 w-3" />
                        <span>{formatDateClean(change.antes)}</span>
                      </span>
                    ) : key === "es_urgente" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-50/70 text-rose-700 text-xs line-through font-semibold">
                        {change.antes ? "⚡ Urgente" : "Estándar"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs line-through decoration-rose-400 break-words block">
                        {displayGeneral(key, change.antes)}
                      </span>
                    )}
                  </div>

                  {/* NUEVOS CAMBIOS (Después) */}
                  <div className="min-w-0">
                    {financial ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 tabular-nums text-xs font-black shadow-2xs">
                        {formatRD(Number(change.despues))}
                      </span>
                    ) : key === "fecha_entrega" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-emerald-700 text-xs tabular-nums font-bold shadow-2xs">
                        <CalendarIcon className="h-3 w-3" />
                        <span>{formatDateClean(change.despues)}</span>
                      </span>
                    ) : key === "es_urgente" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-black shadow-2xs">
                        {change.despues ? "⚡ Urgente" : "Estándar"}
                      </span>
                    ) : (
                      <span className="text-emerald-700 dark:text-emerald-300 font-bold text-xs break-words block">
                        {displayGeneral(key, change.despues)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

function OrderFinancialSummary({
  ordenAnterior,
  ordenNueva,
  financialChanges,
}: {
  ordenAnterior?: Orden;
  ordenNueva?: Orden;
  financialChanges?: OrderChanges;
}) {
  const isHistory = Boolean(financialChanges && !ordenNueva);

  if (isHistory) {
    const hasAnyFin =
      financialChanges &&
      Object.keys(financialChanges).some((k) =>
        ["subtotal", "descuento", "costo_envio", "itbis", "total", "saldo"].includes(k),
      );
    if (!hasAnyFin || !financialChanges) return null;

    const subAntes = financialChanges.subtotal?.antes != null ? Number(financialChanges.subtotal.antes) : null;
    const subDesp = financialChanges.subtotal?.despues != null ? Number(financialChanges.subtotal.despues) : null;

    const descAntes = financialChanges.descuento?.antes != null ? Number(financialChanges.descuento.antes) : null;
    const descDesp = financialChanges.descuento?.despues != null ? Number(financialChanges.descuento.despues) : null;

    const envAntes = financialChanges.costo_envio?.antes != null ? Number(financialChanges.costo_envio.antes) : null;
    const envDesp = financialChanges.costo_envio?.despues != null ? Number(financialChanges.costo_envio.despues) : null;

    const itbisAntes = financialChanges.itbis?.antes != null ? Number(financialChanges.itbis.antes) : null;
    const itbisDesp = financialChanges.itbis?.despues != null ? Number(financialChanges.itbis.despues) : null;

    const totAntes = financialChanges.total?.antes != null ? Number(financialChanges.total.antes) : null;
    const totDesp = financialChanges.total?.despues != null ? Number(financialChanges.total.despues) : null;

    const salAntes = financialChanges.saldo?.antes != null ? Number(financialChanges.saldo.antes) : null;
    const salDesp = financialChanges.saldo?.despues != null ? Number(financialChanges.saldo.despues) : null;

    const diffTot = totDesp != null && totAntes != null ? totDesp - totAntes : null;

    return (
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
        <div className="px-3.5 py-2 bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200/90 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-[10px] text-muted-foreground">
            <Receipt className="h-3.5 w-3.5 text-primary" />
            <span>Liquidación Financiera Registrada</span>
          </div>
          {diffTot != null && Math.abs(diffTot) >= 0.01 && (
            <span
              className={`text-[10px] font-black tabular-nums px-2 py-0.5 rounded-full border ${
                diffTot > 0
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/80"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200/80"
              }`}
            >
              {diffTot > 0 ? `+${formatRD(diffTot)}` : formatRD(diffTot)}
            </span>
          )}
        </div>

        <div className="p-3.5 space-y-2 text-xs">
          {subDesp != null && (
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Subtotal</span>
              <div className="flex items-center gap-2">
                {subAntes != null && Math.abs(subDesp - subAntes) >= 0.01 && (
                  <span className="text-[11px] tabular-nums text-muted-foreground line-through decoration-rose-400">
                    {formatRD(subAntes)}
                  </span>
                )}
                <span className="tabular-nums font-bold text-foreground">
                  {formatRD(subDesp)}
                </span>
              </div>
            </div>
          )}

          {descDesp != null && (
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span className="font-medium">Descuento</span>
              <div className="flex items-center gap-2">
                {descAntes != null && Math.abs(descDesp - descAntes) >= 0.01 && (
                  <span className="text-[11px] tabular-nums line-through opacity-70">
                    -{formatRD(descAntes)}
                  </span>
                )}
                <span className="tabular-nums font-bold">
                  -{formatRD(descDesp)}
                </span>
              </div>
            </div>
          )}

          {envDesp != null && (
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span className="font-medium">Envío / Delivery</span>
              <div className="flex items-center gap-2">
                {envAntes != null && Math.abs(envDesp - envAntes) >= 0.01 && (
                  <span className="text-[11px] tabular-nums text-muted-foreground line-through decoration-rose-400">
                    {formatRD(envAntes)}
                  </span>
                )}
                <span className="tabular-nums font-bold text-foreground">
                  {formatRD(envDesp)}
                </span>
              </div>
            </div>
          )}

          {itbisDesp != null && (
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400 font-medium">ITBIS (18%)</span>
              <div className="flex items-center gap-2">
                {itbisAntes != null && Math.abs(itbisDesp - itbisAntes) >= 0.01 && (
                  <span className="text-[11px] tabular-nums text-muted-foreground line-through decoration-rose-400">
                    {formatRD(itbisAntes)}
                  </span>
                )}
                <span className="tabular-nums font-bold text-foreground">
                  {formatRD(itbisDesp)}
                </span>
              </div>
            </div>
          )}

          {totDesp != null && (
            <>
              <div className="border-t border-dashed border-slate-200 dark:border-slate-800 my-1.5" />
              <div className="p-3 sm:p-3.5 rounded-xl bg-[#1B4B73]/10 dark:bg-[#1B4B73]/25 border border-[#1B4B73]/20 dark:border-[#1B4B73]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[#1B4B73] text-white shadow-2xs shrink-0">
                    <CircleDollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black tracking-wider uppercase text-[#1B4B73] dark:text-sky-300 block">
                      TOTAL DE LA ORDEN
                    </span>
                    {diffTot != null && Math.abs(diffTot) >= 0.01 && totAntes != null && (
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <span>Anterior:</span>
                        <span className="tabular-nums line-through decoration-rose-400">
                          {formatRD(totAntes)}
                        </span>
                        <span
                          className={`tabular-nums font-bold text-[11px] ${
                            diffTot > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          ({diffTot > 0 ? `+${formatRD(diffTot)}` : formatRD(diffTot)})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="sm:text-right">
                  <div className="text-xl sm:text-2xl font-black tabular-nums tracking-tight text-[#1B4B73] dark:text-white">
                    {formatRD(totDesp)}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Total Guardado
                  </span>
                </div>
              </div>
            </>
          )}

          {salDesp != null && (
            <div className="pt-2 px-1 flex flex-wrap items-center justify-between gap-2 text-xs border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] font-medium text-muted-foreground">Saldo resultante:</span>
              <div className="flex items-center gap-2">
                {salDesp <= 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{salDesp < 0 ? `Saldo a favor: ${formatRD(Math.abs(salDesp))}` : "TOTALMENTE PAGADA"}</span>
                  </span>
                ) : (
                  <span className="tabular-nums font-black text-sm text-rose-600 dark:text-rose-400">
                    {formatRD(salDesp)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // MODO PREVIEW (ordenAnterior y ordenNueva completos)
  if (!ordenNueva) return null;

  const subAntes = Number(ordenAnterior?.subtotal ?? 0);
  const subDesp = Number(ordenNueva.subtotal ?? 0);

  const descAntes = Number(ordenAnterior?.descuento ?? 0);
  const descDesp = Number(ordenNueva.descuento ?? 0);

  const envAntes = Number(ordenAnterior?.costo_envio ?? 0);
  const envDesp = Number(ordenNueva.costo_envio ?? 0);

  const itbisAntes = Number(ordenAnterior?.itbis ?? 0);
  const itbisDesp = Number(ordenNueva.itbis ?? 0);

  const totAntes = Number(ordenAnterior?.total ?? 0);
  const totDesp = Number(ordenNueva.total ?? 0);

  const salAntes = Number(ordenAnterior?.saldo ?? 0);
  const salDesp = Number(ordenNueva.saldo ?? 0);

  const pagado = Number(ordenNueva.pagado ?? ordenAnterior?.pagado ?? Math.max(0, totDesp - salDesp));
  const diffTot = totDesp - totAntes;

  const hasDescuento = descAntes > 0 || descDesp > 0;
  const hasEnvio = envAntes > 0 || envDesp > 0;

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
      {/* Encabezado del Ticket de Liquidación */}
      <div className="px-3.5 py-2 bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200/90 dark:border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-[10px] text-muted-foreground">
          <Receipt className="h-3.5 w-3.5 text-primary" />
          <span>Liquidación Contable de la Orden</span>
        </div>
        {Math.abs(diffTot) >= 0.01 && (
          <span
            className={`text-[10px] font-black tabular-nums px-2 py-0.5 rounded-full border ${
              diffTot > 0
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/80"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200/80"
            }`}
          >
            {diffTot > 0 ? `+${formatRD(diffTot)}` : formatRD(diffTot)}
          </span>
        )}
      </div>

      {/* Desglose Contable Ordenado */}
      <div className="p-3.5 space-y-2 text-xs">
        {/* 1. Subtotal */}
        <div className="flex items-center justify-between">
          <span className="text-slate-600 dark:text-slate-400 font-medium">Subtotal</span>
          <div className="flex items-center gap-2">
            {Math.abs(subDesp - subAntes) >= 0.01 && subAntes > 0 && (
              <span className="text-[11px] tabular-nums text-muted-foreground line-through decoration-rose-400">
                {formatRD(subAntes)}
              </span>
            )}
            <span className="tabular-nums font-bold text-foreground">
              {formatRD(subDesp)}
            </span>
          </div>
        </div>

        {/* 2. Descuento (si aplica) */}
        {hasDescuento && (
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="font-medium">Descuento</span>
            <div className="flex items-center gap-2">
              {Math.abs(descDesp - descAntes) >= 0.01 && descAntes > 0 && (
                <span className="text-[11px] tabular-nums line-through opacity-70">
                  -{formatRD(descAntes)}
                </span>
              )}
              <span className="tabular-nums font-bold">
                -{formatRD(descDesp)}
              </span>
            </div>
          </div>
        )}

        {/* 3. Costo de envío (si aplica) */}
        {hasEnvio && (
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
            <span className="font-medium">Envío / Delivery</span>
            <div className="flex items-center gap-2">
              {Math.abs(envDesp - envAntes) >= 0.01 && envAntes > 0 && (
                <span className="text-[11px] tabular-nums text-muted-foreground line-through decoration-rose-400">
                  {formatRD(envAntes)}
                </span>
              )}
              <span className="tabular-nums font-bold text-foreground">
                {formatRD(envDesp)}
              </span>
            </div>
          </div>
        )}

        {/* 4. ITBIS (18%) */}
        <div className="flex items-center justify-between">
          <span className="text-slate-600 dark:text-slate-400 font-medium">ITBIS (18%)</span>
          <div className="flex items-center gap-2">
            {Math.abs(itbisDesp - itbisAntes) >= 0.01 && itbisAntes > 0 && (
              <span className="text-[11px] tabular-nums text-muted-foreground line-through decoration-rose-400">
                {formatRD(itbisAntes)}
              </span>
            )}
            <span className="tabular-nums font-bold text-foreground">
              {formatRD(itbisDesp)}
            </span>
          </div>
        </div>

        {/* Separador tipo ticket */}
        <div className="border-t border-dashed border-slate-200 dark:border-slate-800 my-1.5" />

        {/* 🌟 5. TOTAL DE LA ORDEN - Protagonista con fondo destacado y tamaño apreciable */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-[#1B4B73]/10 dark:bg-[#1B4B73]/25 border border-[#1B4B73]/20 dark:border-[#1B4B73]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#1B4B73] text-white shadow-2xs shrink-0">
              <CircleDollarSign className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-black tracking-wider uppercase text-[#1B4B73] dark:text-sky-300 block">
                TOTAL DE LA ORDEN
              </span>
              {Math.abs(diffTot) >= 0.01 && totAntes > 0 && (
                <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <span>Anterior:</span>
                  <span className="tabular-nums line-through decoration-rose-400">
                    {formatRD(totAntes)}
                  </span>
                  <span
                    className={`tabular-nums font-bold text-[11px] ${
                      diffTot > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    ({diffTot > 0 ? `+${formatRD(diffTot)}` : formatRD(diffTot)})
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="sm:text-right">
            <div className="text-xl sm:text-2xl font-black tabular-nums tracking-tight text-[#1B4B73] dark:text-white">
              {formatRD(totDesp)}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Monto Total Calculado
            </span>
          </div>
        </div>

        {/* 6. Liquidación de Pagos y Saldo Resultante */}
        <div className="pt-2 px-1 flex flex-wrap items-center justify-between gap-2 text-xs border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">Ya cobrado:</span>
            <span className="tabular-nums font-bold text-foreground text-xs">
              {formatRD(pagado)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {salDesp <= 0 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-black text-xs shadow-2xs">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  {salDesp < 0
                    ? `Saldo a favor: ${formatRD(Math.abs(salDesp))}`
                    : "TOTALMENTE PAGADA"}
                </span>
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider">
                  Pendiente de cobro
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-muted-foreground">Saldo:</span>
                  <span className="tabular-nums font-black text-sm text-rose-600 dark:text-rose-400">
                    {formatRD(salDesp)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DeliveryDatePicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const dateObj = useMemo(() => {
    if (!value) return new Date();
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [value]);

  const formattedDate = useMemo(() => {
    return format(dateObj, "dd/MM/yyyy", { locale: es });
  }, [dateObj]);

  const formattedWeekday = useMemo(() => {
    const raw = format(dateObj, "EEEE", { locale: es });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [dateObj]);

  const applyShortcut = (hoursFromNow: number) => {
    const d = new Date();
    d.setHours(d.getHours() + hoursFromNow);
    d.setHours(12, 0, 0, 0);
    onChange(d.toISOString());
    setOpen(false);
  };

  const handleDateSelect = (selectedDate?: Date) => {
    if (!selectedDate) return;
    const next = new Date(selectedDate);
    next.setHours(dateObj.getHours() || 12, dateObj.getMinutes() || 0, 0, 0);
    onChange(next.toISOString());
    setOpen(false);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <CalendarIcon className="h-3.5 w-3.5 text-primary" />
        <span>Fecha de entrega</span>
      </Label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="w-full h-10 px-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex items-center justify-between gap-2 text-xs font-semibold cursor-pointer hover:border-primary/50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            <div className="flex items-center gap-2 min-w-0">
              <CalendarIcon className="h-4 w-4 text-[#1B4B73] shrink-0" />
              <span className="font-bold text-sm text-foreground tabular-nums">
                {formattedDate}
              </span>
              <span className="text-xs text-muted-foreground">
                · {formattedWeekday}
              </span>
            </div>
            <span className="text-[10px] font-bold text-primary shrink-0 uppercase tracking-wide">
              Cambiar
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-3 z-[70] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl space-y-3"
          align="start"
        >
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
              Atajos rápidos
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: "Hoy", hours: 0 },
                { label: "Mañana", hours: 24 },
                { label: "+48h", hours: 48 },
                { label: "+72h", hours: 72 },
              ].map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => applyShortcut(s.hours)}
                  className="px-2 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-[#1B4B73] hover:text-white transition-colors cursor-pointer text-center"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <Calendar
            mode="single"
            selected={dateObj}
            onSelect={handleDateSelect}
            initialFocus
            locale={es}
            className="rounded-xl border border-slate-100 dark:border-slate-800 p-2"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ClientSearchbox({
  clientes,
  selectedClientId,
  disabled,
  onSelectClient,
}: {
  clientes: Cliente[];
  selectedClientId: string;
  disabled: boolean;
  onSelectClient: (clienteId: string) => void;
}) {
  const [openSearch, setOpenSearch] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedClient = useMemo(() => {
    return clientes.find((c) => c.id === selectedClientId);
  }, [clientes, selectedClientId]);

  const filteredClientes = useMemo(() => {
    if (!query.trim()) return clientes.slice(0, 15);
    const q = query.toLowerCase();
    return clientes
      .filter(
        (c) =>
          c.nombre?.toLowerCase().includes(q) ||
          c.apellido?.toLowerCase().includes(q) ||
          c.telefono?.includes(q) ||
          c.cedula?.includes(q),
      )
      .slice(0, 15);
  }, [clientes, query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <div className="flex items-center justify-between">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <UserIcon className="h-3.5 w-3.5 text-primary" />
          <span>Cliente</span>
        </Label>
        {!disabled && selectedClient && (
          <button
            type="button"
            onClick={() => setOpenSearch(!openSearch)}
            className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
          >
            {openSearch ? "Cerrar búsqueda" : "Cambiar cliente"}
          </button>
        )}
      </div>

      {disabled ? (
        <div className="h-10 px-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between text-xs">
          <span className="font-bold text-foreground">
            {selectedClient?.nombre} {selectedClient?.apellido || ""}
          </span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold">
            <LockKeyhole className="h-3 w-3 text-amber-500" />
            Protegido (pagos registrados)
          </span>
        </div>
      ) : openSearch ? (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              autoFocus
              type="text"
              placeholder="Buscar por nombre, teléfono o RNC..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8.5 h-10 text-xs rounded-xl font-medium border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs focus:border-primary/50"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="absolute top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-800">
            {filteredClientes.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                <p>No se encontró ningún cliente con "{query}".</p>
                <a
                  href="/clientes"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-primary font-bold hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Abrir directorio de clientes
                </a>
              </div>
            ) : (
              filteredClientes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelectClient(c.id);
                    setOpenSearch(false);
                    setQuery("");
                  }}
                  className={`w-full p-2.5 text-left text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                    c.id === selectedClientId ? "bg-primary/5 font-bold" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-bold text-foreground truncate">
                      {c.nombre} {c.apellido || ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {c.telefono || "Sin teléfono"} {c.sector ? `· ${c.sector}` : ""}
                    </p>
                  </div>
                  {c.id === selectedClientId && (
                    <span className="text-[10px] font-black uppercase text-primary px-2 py-0.5 rounded-full bg-primary/10">
                      Actual
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <div
          onClick={() => !disabled && setOpenSearch(true)}
          className={`h-10 px-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex items-center justify-between text-xs cursor-pointer hover:border-primary/50 transition-all ${
            !selectedClient ? "text-muted-foreground border-dashed" : ""
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold text-foreground truncate">
              {selectedClient
                ? `${selectedClient.nombre} ${selectedClient.apellido || ""}`
                : "Seleccionar cliente..."}
            </span>
            {selectedClient?.telefono && (
              <span className="text-[11px] text-muted-foreground tabular-nums">
                ({selectedClient.telefono})
              </span>
            )}
          </div>
          <span className="text-[11px] font-semibold text-primary">Buscar</span>
        </div>
      )}
    </div>
  );
}

function CatalogItemSelector({
  catalogo,
  onAddItem,
}: {
  catalogo: CatalogoItem[];
  onAddItem: (item: CatalogoItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("TODAS");
  const containerRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    catalogo.forEach((c) => {
      if (c.categoria) set.add(c.categoria);
    });
    return ["TODAS", ...Array.from(set)];
  }, [catalogo]);

  const filteredItems = useMemo(() => {
    let list = catalogo.filter((c) => c.activo !== false);
    if (selectedCategory !== "TODAS") {
      list = list.filter((c) => c.categoria === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.nombre?.toLowerCase().includes(q) ||
          c.categoria?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [catalogo, selectedCategory, search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar prenda en catálogo..."
            value={search}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            className="pl-9 h-10 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-2xs font-medium"
          />
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => setOpen(!open)}
          className="h-10 px-3.5 text-xs font-bold rounded-xl bg-[#1B4B73] hover:bg-[#143a59] text-white shrink-0 cursor-pointer shadow-xs border border-[#1B4B73] transition-all flex items-center gap-1.5"
        >
          <Layers className="h-4 w-4 text-white" />
          <span>Catálogo ({catalogo.length})</span>
        </Button>
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 space-y-2.5 max-h-72 flex flex-col">
          {/* Categorías */}
          {categories.length > 2 && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1 shrink-0 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
                    selectedCategory === cat
                      ? "bg-[#1B4B73] text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Grid de prendas */}
          <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 pr-1">
            {filteredItems.length === 0 ? (
              <div className="col-span-2 py-6 text-center text-xs text-muted-foreground">
                No hay prendas registradas que coincidan con la búsqueda.
              </div>
            ) : (
              filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onAddItem(item);
                  }}
                  className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-primary/60 hover:bg-primary/5 transition-all text-left flex items-center justify-between gap-2 cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">
                      {item.icono || "👕"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate group-hover:text-primary">
                        {item.nombre}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {item.categoria} {item.por_libra ? "· Por libra" : ""}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100 shrink-0">
                    {formatRD(item.precio)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function EditOrderDialog({
  orden,
  clientes,
  servicios,
  empleados = [],
  ubicacionEnabled = false,
  tenant,
  onClose,
  onSaved,
}: {
  orden: Orden;
  clientes: Cliente[];
  servicios: Servicio[];
  empleados?: Empleado[];
  ubicacionEnabled?: boolean;
  tenant?: Tenant;
  onClose: () => void;
  onSaved: (orden: Orden) => void;
}) {
  const [context, setContext] = useState<OrderEditContext | null>(null);
  const [draft, setDraft] = useState<Orden | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<OrderEditPreview | null>(null);
  const [history, setHistory] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const saving = useRef(false);

  const recargoUrgencia = tenant?.config?.recargo_urgencia ?? 30;

  // Cargar catálogo de prendas para selección directa
  const { data: catalogoData } = useCatalogo(orden.tenant_id);
  const catalogo = useMemo(() => catalogoData || [], [catalogoData]);

  const selectedClient = useMemo(() => {
    return clientes.find((c) => c.id === draft?.cliente_id);
  }, [clientes, draft?.cliente_id]);

  const [serviceSearch, setServiceSearch] = useState("");
  const filteredServicios = useMemo(() => {
    const active = servicios.filter((s) => s.activo);
    if (!serviceSearch.trim()) return active;
    const q = serviceSearch.toLowerCase();
    return active.filter((s) => s.nombre?.toLowerCase().includes(q));
  }, [servicios, serviceSearch]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setContext(null);
    setDraft(null);
    setError("");
    setPreview(null);
    loadOrderEdit(orden)
      .then((value) => {
        if (!cancelled) {
          setContext(value);
          setDraft(structuredClone(value.orden));
          setReason("");
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orden.id, reloadKey]);

  const dirty = context && draft && Object.keys(orderEditPatch(context.orden, draft)).length > 0;
  const financial = context?.editable && !context.financial_reason;

  function update(patch: Partial<Orden>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
    setPreview(null);
    setError("");
  }

  function close() {
    if (saving.current) return;
    if (dirty && !discard) setDiscard(true);
    else onClose();
  }

  async function submit(confirm: boolean) {
    if (!context || !draft || saving.current) return;
    const effectiveReason = reason.trim() || "Ajuste de prendas y condiciones de la orden";
    if (confirm && effectiveReason.length < 5) {
      setError("Por favor escribe un motivo de al menos 5 caracteres.");
      toast.error("Por favor escribe el motivo del cambio.");
      return;
    }
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await submitOrderEdit(context, draft, effectiveReason, !confirm);
      if (confirm) onSaved(result.orden);
      else {
        setPreview(result);
        if (!reason.trim()) {
          setReason("Ajuste de prendas y condiciones de la orden");
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar la orden. Recarga antes de volver a intentarlo.",
      );
      setPreview(null);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  function handleAddCatalogItem(item: CatalogoItem) {
    if (!draft) return;
    const existingIndex = draft.items.findIndex(
      (it) => it.descripcion.toLowerCase() === item.nombre.toLowerCase(),
    );
    if (existingIndex >= 0) {
      update({
        items: draft.items.map((it, i) =>
          i === existingIndex ? { ...it, cantidad: it.cantidad + 1 } : it,
        ),
      });
      toast.info(`Se incrementó +1 a ${item.nombre}`);
    } else {
      const newItem: OrdenItem = {
        descripcion: item.nombre,
        cantidad: 1,
        precio_unitario: item.precio || 0,
        es_libra: !!item.por_libra,
        is_exento: !!item.is_exento,
      };
      update({
        items: [...draft.items, newItem],
      });
      toast.success(`Añadido: ${item.nombre}`);
    }
  }

  // Cálculo en vivo para la tarjeta financiera con cálculo exacto de ITBIS
  const liveFinancials = useMemo(() => {
    if (!draft) return { subtotal: 0, baseSub: 0, surcharge: 0, itbis: 0, total: 0, saldo: 0, hasItbis: false };
    
    // Separar prendas gravables y exentas exactamente igual que la RPC order_edit_totals
    const taxableItems = draft.items.filter((it) => !it.is_exento);
    const exemptItems = draft.items.filter((it) => it.is_exento);

    const taxable = taxableItems.reduce(
      (acc, it) => acc + (it.cantidad || 0) * (it.precio_unitario || 0),
      0,
    );
    const exempt = exemptItems.reduce(
      (acc, it) => acc + (it.cantidad || 0) * (it.precio_unitario || 0),
      0,
    );
    const fees = Object.values(draft.servicios_precios || {}).reduce(
      (acc, fee) => acc + (fee || 0),
      0,
    );
    const surcharge = draft.es_urgente
      ? Number((((taxable + exempt + fees) * recargoUrgencia) / 100).toFixed(2))
      : 0;
    const base = taxable + fees + surcharge;

    const itbisPorcentaje = tenant?.config?.itbis_porcentaje ?? 18;
    const itbisIncluido = Boolean(tenant?.config?.itbis_incluido);
    // Si la orden original tenía ITBIS cobrado (orden.itbis > 0), se recalcula con su porcentaje
    const hasItbis = Boolean(orden.itbis && orden.itbis > 0);
    const rate = hasItbis ? itbisPorcentaje / 100 : 0;

    let tax = 0;
    let sub = 0;

    if (rate > 0) {
      if (itbisIncluido) {
        tax = Number((base - base / (1 + rate)).toFixed(2));
        sub = Number((base / (1 + rate) + exempt).toFixed(2));
      } else {
        tax = Number((base * rate).toFixed(2));
        sub = Number((base + exempt).toFixed(2));
      }
    } else {
      tax = 0;
      sub = Number((base + exempt).toFixed(2));
    }

    const discount = draft.descuento || 0;
    const shipping = draft.costo_envio || 0;
    const tot = Number((Math.max(0, sub + tax - discount) + shipping).toFixed(2));
    const sal = Number((tot - (draft.pagado || 0)).toFixed(2));

    return {
      subtotal: sub,
      baseSub: taxable + exempt + fees,
      surcharge,
      itbis: tax,
      total: tot,
      saldo: sal,
      hasItbis,
      itbisPorcentaje,
    };
  }, [draft, recargoUrgencia, orden.itbis, tenant?.config?.itbis_porcentaje, tenant?.config?.itbis_incluido]);

  return (
    <Dialog
      open
      onOpenChange={(openState) => {
        if (!openState) close();
      }}
    >
      <DialogContent
        className="max-w-[620px] max-h-[85vh] flex flex-col p-0 gap-0 rounded-3xl overflow-hidden shadow-2xl border border-border/70 bg-background"
      >
        {/* Header Fijo */}
        <div className="px-5 py-3 pr-14 sm:pr-16 border-b border-border/60 bg-surface/50 backdrop-blur-xs flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-2xl bg-primary/10 text-primary shrink-0">
              <Pencil className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg font-display font-black text-foreground tracking-tight flex items-center gap-2">
                <span className="truncate">
                  {history
                    ? "Historial de Cambios"
                    : preview
                    ? "Revisar Cambios"
                    : "Editar Orden"}{" "}
                  #{orden.numero}
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border-primary/20"
                >
                  {orden.estado}
                </Badge>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {preview
                  ? "Verifica los cambios antes de guardar. Los cobros ya realizados se conservan."
                  : "Modifica prendas, servicios o condiciones de entrega de la orden."}
              </p>
            </div>
          </div>

          {context && (
            <Button
              type="button"
              variant={history ? "default" : "outline"}
              size="sm"
              disabled={busy}
              onClick={() => setHistory(!history)}
              className="h-8.5 px-3 text-xs font-bold rounded-xl shrink-0 cursor-pointer"
            >
              <History className="mr-1.5 h-3.5 w-3.5" />
              {history ? "Volver" : `Historial (${context.historial?.length || 0})`}
            </Button>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-4.5 space-y-3.5">
          {loading ? (
            <div className="py-20 text-center text-muted-foreground text-xs flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="font-semibold">Cargando datos actuales de la orden...</span>
            </div>
          ) : (
            <>
              {error && (
                <div
                  role="alert"
                  className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3.5 text-xs text-destructive flex items-start gap-2.5"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">{error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 h-7 text-xs font-bold rounded-lg border-destructive/30"
                      disabled={busy}
                      onClick={() => {
                        if (dirty) setDiscard(true);
                        else setReloadKey((k) => k + 1);
                      }}
                    >
                      Recargar orden
                    </Button>
                  </div>
                </div>
              )}

              {context && draft && (
                <>
                  {history ? (
                    /* Vista de Historial */
                    <div className="space-y-4">
                      {context.historial.length === 0 ? (
                        <div className="py-16 text-center border-2 border-dashed border-border/80 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
                          <History className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground font-semibold">
                            Todavía no hay ediciones registradas para esta orden.
                          </p>
                        </div>
                      ) : (
                        context.historial.map((entry, index) => (
                          <div
                            key={index}
                            className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-foreground">
                                {entry.empleado_nombre}
                              </span>
                              <span className="text-muted-foreground font-medium">
                                {new Date(entry.creado_en).toLocaleString("es-DO")}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-300 italic">
                              "{entry.motivo}"
                            </p>
                            <Changes
                              changes={entry.cambios}
                              clientes={clientes}
                              empleados={empleados}
                            />
                            <OrderFinancialSummary
                              financialChanges={entry.cambios}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  ) : preview ? (
                    /* Vista de Revisión (Preview) */
                    <div className="space-y-3.5">
                      {Object.keys(preview.cambios).some((k) =>
                        !["subtotal", "itbis", "descuento", "costo_envio", "total", "saldo"].includes(k),
                      ) && (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Detalle de Prendas y Modificaciones
                          </Label>
                          <Changes
                            changes={preview.cambios}
                            clientes={clientes}
                            empleados={empleados}
                          />
                        </div>
                      )}

                      <OrderFinancialSummary
                        ordenAnterior={context.orden}
                        ordenNueva={preview.orden}
                      />

                      <div className="space-y-1.5 p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-xs">
                        <Label htmlFor="preview-reason" className="font-bold text-blue-950 dark:text-blue-200">
                          Motivo registrado (historial de auditoría):
                        </Label>
                        <Input
                          id="preview-reason"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Ajuste de prendas y condiciones de la orden"
                          className="h-8.5 text-xs bg-white dark:bg-slate-900 rounded-xl border-blue-200 dark:border-blue-800 font-medium"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Modo Edición Principal */
                    <>
                      {(!context.editable || context.financial_reason) && (
                        <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200">
                          <LockKeyhole className="h-4 w-4 shrink-0 text-amber-600" />
                          <p className="font-medium">
                            {!context.editable
                              ? context.blocked_reason ||
                                "Esta orden no admite cambios. Puedes consultar su historial."
                              : context.financial_reason}
                          </p>
                        </div>
                      )}

                      <fieldset
                        disabled={!context.editable || busy}
                        className="space-y-4 disabled:opacity-75"
                      >
                        {/* Fila 1: Fecha de Entrega y Cliente con Searchbox */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <DeliveryDatePicker
                            value={draft.fecha_entrega}
                            disabled={!context.editable || busy}
                            onChange={(val) => update({ fecha_entrega: val })}
                          />

                          <ClientSearchbox
                            clientes={clientes}
                            selectedClientId={draft.cliente_id}
                            disabled={!financial || context.orden.pagado > 0}
                            onSelectClient={(cId) => update({ cliente_id: cId })}
                          />
                        </div>

                        {/* Observaciones */}
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="edit-notes"
                            className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                          >
                            {draft.estado === "RECIBIDA" ? "Observaciones de prendas" : "Notas de entrega"}
                          </Label>
                          <Textarea
                            id="edit-notes"
                            maxLength={4000}
                            rows={2}
                            placeholder="Notas especiales del cliente, manchas o instrucciones..."
                            value={draft.notas || ""}
                            onChange={(e) => update({ notas: e.target.value })}
                            className="text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 resize-none"
                          />
                        </div>

                        {/* Opciones de Domicilio y Estantería (si aplican) */}
                        {(draft.entrega_domicilio || ubicacionEnabled) && (
                          <div className="p-3 bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                            {draft.entrega_domicilio && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div className="space-y-1 sm:col-span-2">
                                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Dirección de entrega
                                  </Label>
                                  <Input
                                    value={draft.direccion_entrega || ""}
                                    placeholder="Calle, número, sector..."
                                    onChange={(e) => update({ direccion_entrega: e.target.value })}
                                    className="h-8.5 text-xs bg-white dark:bg-slate-900 rounded-xl"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Repartidor
                                  </Label>
                                  <select
                                    className="h-8.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 text-xs font-semibold"
                                    value={draft.repartidor_id || ""}
                                    onChange={(e) => update({ repartidor_id: e.target.value })}
                                  >
                                    <option value="">Sin asignar</option>
                                    {empleados
                                      .filter((e) => e.activo && e.rol === "REPARTIDOR")
                                      .map((e) => (
                                        <option key={e.id} value={e.id}>
                                          {e.nombre}
                                        </option>
                                      ))}
                                  </select>
                                </div>
                              </div>
                            )}

                            {ubicacionEnabled && (
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  Ubicación en estantería
                                </Label>
                                <Input
                                  value={draft.ubicacion_ropa || ""}
                                  placeholder="Ej.: A-12"
                                  onChange={(e) => update({ ubicacion_ropa: e.target.value })}
                                  className="h-8.5 text-xs bg-white dark:bg-slate-900 rounded-xl max-w-xs"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* SECCIÓN PRENDAS Y SERVICIOS DIRECTOS DEL CATÁLOGO */}
                        <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-3.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Shirt className="h-4 w-4 text-primary" />
                              <span className="text-xs font-black uppercase tracking-wider text-foreground">
                                Prendas de la Orden
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                                {draft.items.length} {draft.items.length === 1 ? "pieza" : "piezas"}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                update({
                                  items: [
                                    ...draft.items,
                                    { descripcion: "", cantidad: 1, precio_unitario: 0 },
                                  ],
                                })
                              }
                              className="text-[11px] font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              + Prenda manual
                            </button>
                          </div>

                          {/* Selector de Catálogo Directo */}
                          <CatalogItemSelector
                            catalogo={catalogo}
                            onAddItem={handleAddCatalogItem}
                          />

                          {/* Lista de Prendas en la Orden */}
                          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                            {draft.items.length === 0 ? (
                              <div className="py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-muted-foreground">
                                La orden no tiene prendas agregadas. Usa el buscador de catálogo para añadir.
                              </div>
                            ) : (
                              draft.items.map((item, index) => {
                                const lineTotal =
                                  (item.cantidad || 0) * (item.precio_unitario || 0);
                                return (
                                  <div
                                    key={index}
                                    className="p-2.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-2xs"
                                  >
                                    {/* Nombre de la prenda */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-xs text-foreground truncate">
                                          {item.descripcion || "Prenda sin nombre"}
                                        </span>
                                        {item.es_libra && (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-blue-50 text-blue-700 dark:bg-blue-950/40">
                                            Libra
                                          </span>
                                        )}
                                        {item.is_exento && (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-700 dark:bg-slate-800">
                                            Exento
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                                        <span>Precio unitario:</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                          {formatRD(item.precio_unitario)}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Stepper Táctil [-] [Qty] [+] y Subtotal */}
                                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (item.cantidad <= 1) {
                                              update({
                                                items: draft.items.filter((_, i) => i !== index),
                                              });
                                            } else {
                                              update({
                                                items: draft.items.map((it, i) =>
                                                  i === index
                                                    ? { ...it, cantidad: Number((it.cantidad - 1).toFixed(2)) }
                                                    : it,
                                                ),
                                              });
                                            }
                                          }}
                                          className="h-6 w-6 rounded-md bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs font-bold shadow-2xs hover:bg-slate-200 cursor-pointer"
                                          title="Restar"
                                        >
                                          <Minus className="h-3 w-3" />
                                        </button>

                                        <span className="w-8 text-center text-xs font-black text-foreground">
                                          {item.cantidad}
                                        </span>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            update({
                                              items: draft.items.map((it, i) =>
                                                i === index
                                                  ? { ...it, cantidad: Number((it.cantidad + 1).toFixed(2)) }
                                                  : it,
                                              ),
                                            });
                                          }}
                                          className="h-6 w-6 rounded-md bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs font-bold shadow-2xs hover:bg-slate-200 cursor-pointer"
                                          title="Sumar"
                                        >
                                          <Plus className="h-3 w-3" />
                                        </button>
                                      </div>

                                      <div className="text-right min-w-[75px]">
                                        <span className="text-xs font-black text-foreground block">
                                          {formatRD(lineTotal)}
                                        </span>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          update({ items: draft.items.filter((_, i) => i !== index) })
                                        }
                                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                        title="Eliminar prenda"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Chips de Servicios Aplicados con Buscador */}
                          {servicios.length > 0 && (
                            <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-800 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Servicios del catálogo
                                  </Label>
                                  {(draft.servicios?.length || 0) > 0 && (
                                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-[#1B4B73]/10 text-[#1B4B73] dark:text-sky-300">
                                      {draft.servicios?.length} activo{(draft.servicios?.length || 0) > 1 ? "s" : ""}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                  Toca para activar o desactivar
                                </span>
                              </div>

                              {/* Searchbox de Servicios (Mismo tamaño h-10 y diseño que prendas) */}
                              <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                  type="text"
                                  placeholder="Buscar servicio en catálogo (ej.: secado, planchado, almidonado)..."
                                  value={serviceSearch}
                                  onChange={(e) => setServiceSearch(e.target.value)}
                                  className="pl-9 h-10 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-2xs font-medium"
                                />
                                {serviceSearch && (
                                  <button
                                    type="button"
                                    onClick={() => setServiceSearch("")}
                                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground cursor-pointer"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                                {filteredServicios.length === 0 ? (
                                  <p className="text-xs text-muted-foreground py-2 italic">
                                    No se encontró ningún servicio con "{serviceSearch}".
                                  </p>
                                ) : (
                                  filteredServicios.map((s) => {
                                    const isSelected = draft.servicios?.includes(s.nombre);
                                    const currentPrice =
                                      draft.servicios_precios?.[s.nombre] ?? s.precio;
                                    return (
                                      <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => {
                                          if (isSelected) {
                                            const nextPrices = { ...(draft.servicios_precios || {}) };
                                            delete nextPrices[s.nombre];
                                            update({
                                              servicios: (draft.servicios || []).filter(
                                                (name) => name !== s.nombre,
                                              ),
                                              servicios_precios: nextPrices,
                                            });
                                          } else {
                                            update({
                                              servicios: [...(draft.servicios || []), s.nombre],
                                              servicios_precios: {
                                                ...(draft.servicios_precios || {}),
                                                [s.nombre]: s.precio,
                                              },
                                            });
                                          }
                                        }}
                                        className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                          isSelected
                                            ? "bg-[#1B4B73] text-white shadow-xs"
                                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                                        }`}
                                      >
                                        {isSelected ? (
                                          <Check className="h-3 w-3 text-sky-300" />
                                        ) : (
                                          <Plus className="h-3 w-3 text-muted-foreground" />
                                        )}
                                        <span>{s.nombre}</span>
                                        <span
                                          className={`text-[10px] font-semibold ${
                                            isSelected ? "text-sky-200" : "text-muted-foreground"
                                          }`}
                                        >
                                          +{formatRD(currentPrice)}
                                        </span>
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          )}

                          {/* Ajustes de Prioridad (Tipo de Orden), Descuento y Envío */}
                          <div className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-3.5 shadow-2xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-start">
                              {/* Columna Izquierda: Tipo de Orden (Prioridad) */}
                              <div className="space-y-1.5 flex flex-col justify-between h-full">
                                <div className="h-5 flex items-center justify-between gap-1">
                                  <Label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 shrink-0">
                                    <Clock className="h-3 w-3 text-primary shrink-0" />
                                    <span>Tipo de orden</span>
                                  </Label>
                                  {draft.es_urgente ? (
                                    <span className="text-[9px] font-bold uppercase text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-900 whitespace-nowrap shrink-0">
                                      +{recargoUrgencia}% recargo
                                    </span>
                                  ) : (
                                    <span className="text-[9.5px] font-semibold text-muted-foreground whitespace-nowrap shrink-0">
                                      Sin recargo
                                    </span>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 h-10 items-center">
                                  <button
                                    type="button"
                                    onClick={() => update({ es_urgente: false })}
                                    className={`h-8 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 px-1 transition-all cursor-pointer ${
                                      !draft.es_urgente
                                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-black border border-slate-200/80 dark:border-slate-700"
                                        : "text-slate-600 dark:text-slate-400 hover:text-foreground"
                                    }`}
                                  >
                                    <Clock className={`h-3 w-3 shrink-0 ${!draft.es_urgente ? "text-primary" : "text-slate-400"}`} />
                                    <span>Estándar</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => update({ es_urgente: true })}
                                    className={`h-8 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 px-1 transition-all cursor-pointer ${
                                      draft.es_urgente
                                        ? "bg-rose-500 text-white shadow-2xs font-black"
                                        : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                    }`}
                                  >
                                    <Zap className="h-3 w-3 shrink-0 fill-current" />
                                    <span>Urgente (+{recargoUrgencia}%)</span>
                                  </button>
                                </div>

                                <div className="h-6 flex items-center">
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    {draft.es_urgente
                                      ? `Prioridad alta en lavado (+${recargoUrgencia}%).`
                                      : "Plazo de lavado habitual sin recargo adicional."}
                                  </p>
                                </div>
                              </div>

                              {/* Columna Derecha: Descuento */}
                              <div className="space-y-1.5 flex flex-col justify-between h-full">
                                <div className="h-5 flex items-center justify-between gap-1">
                                  <Label
                                    htmlFor="edit-discount"
                                    className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 shrink-0"
                                  >
                                    <DollarSign className="h-3 w-3 text-primary shrink-0" />
                                    <span>Descuento</span>
                                  </Label>
                                  {Number(selectedClient?.descuento_fijo || 0) > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const pct = Number(selectedClient?.descuento_fijo);
                                        const amount = Number(((liveFinancials.baseSub * pct) / 100).toFixed(2));
                                        update({ descuento: amount });
                                        toast.info(`Descuento fijo (${pct}%) aplicado: ${formatRD(amount)}`);
                                      }}
                                      className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
                                    >
                                      Desc. cliente ({selectedClient?.descuento_fijo}%)
                                    </button>
                                  ) : null}
                                </div>

                                <div className="relative h-10">
                                  <span className="absolute left-3 top-2.5 text-xs font-black text-muted-foreground">
                                    RD$
                                  </span>
                                  <Input
                                    id="edit-discount"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    placeholder="0.00"
                                    value={draft.descuento === 0 ? "" : draft.descuento}
                                    onChange={(e) => {
                                      const val = Math.max(0, Number(e.target.value) || 0);
                                      update({ descuento: val });
                                    }}
                                    className="pl-11 h-10 text-xs bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 rounded-xl font-bold shadow-2xs"
                                  />
                                </div>

                                {/* Chips de porcentaje rápido */}
                                <div className="h-6 flex items-center gap-1">
                                  {[0, 5, 10, 15, 20].map((pct) => {
                                    const expected = pct === 0 ? 0 : Number(((liveFinancials.baseSub * pct) / 100).toFixed(2));
                                    const isActive =
                                      pct === 0
                                        ? !draft.descuento || draft.descuento === 0
                                        : Math.abs((draft.descuento || 0) - expected) < 0.5 && (draft.descuento || 0) > 0;
                                    return (
                                      <button
                                        key={pct}
                                        type="button"
                                        onClick={() => {
                                          update({ descuento: expected });
                                        }}
                                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                          isActive
                                            ? "bg-[#1B4B73] text-white shadow-2xs font-black"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                                        }`}
                                      >
                                        {pct === 0 ? "0%" : `${pct}%`}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Costo de Envío (si aplica domicilio) */}
                            {draft.entrega_domicilio && (
                              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center">
                                <div>
                                  <Label
                                    htmlFor="edit-shipping"
                                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
                                  >
                                    <Truck className="h-3.5 w-3.5 text-primary" />
                                    <span>Costo de Envío a Domicilio</span>
                                  </Label>
                                  <p className="text-[10px] text-muted-foreground">
                                    Tarifa de transporte asignada al repartidor.
                                  </p>
                                </div>
                                <div className="relative">
                                  <span className="absolute left-3 top-2.5 text-xs font-black text-muted-foreground">
                                    RD$
                                  </span>
                                  <Input
                                    id="edit-shipping"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    placeholder="0.00"
                                    value={draft.costo_envio === 0 ? "" : draft.costo_envio}
                                    onChange={(e) =>
                                      update({ costo_envio: Math.max(0, Number(e.target.value) || 0) })
                                    }
                                    className="pl-11 h-10 text-xs bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 rounded-xl font-bold shadow-2xs"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Tarjetas KPI de Resumen Financiero en Vivo */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                              Total Anterior
                            </span>
                            <span className="text-sm font-black tabular-nums text-slate-600 dark:text-slate-400 block mt-0.5">
                              {formatRD(context.orden.total)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#1B4B73] dark:text-sky-300 block">
                              Nuevo Total
                            </span>
                            <span className="text-sm font-black tabular-nums text-[#1B4B73] dark:text-sky-300 block mt-0.5">
                              {formatRD(liveFinancials.total)}
                            </span>
                            {liveFinancials.itbis > 0 && (
                              <span className="text-[9px] font-semibold text-muted-foreground block">
                                + ({formatRD(liveFinancials.itbis)} ITBIS)
                              </span>
                            )}
                            {draft.es_urgente && liveFinancials.surcharge > 0 && (
                              <span className="text-[9px] font-bold text-rose-500 block">
                                +{formatRD(liveFinancials.surcharge)} urgencia
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                              Pagado
                            </span>
                            <span className="text-sm font-bold tabular-nums text-foreground block mt-0.5">
                              {formatRD(context.orden.pagado)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                              Saldo Resultante
                            </span>
                            <span
                              className={`text-sm font-black tabular-nums block mt-0.5 ${
                                liveFinancials.saldo > 0
                                  ? "text-rose-600 dark:text-rose-400"
                                  : liveFinancials.saldo < 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-foreground"
                              }`}
                            >
                              {formatRD(liveFinancials.saldo)}
                            </span>
                          </div>
                        </div>

                        {/* Motivo del Cambio */}
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="edit-reason"
                            className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between"
                          >
                            <span>Motivo del cambio</span>
                            <span className="text-[10px] font-normal text-muted-foreground">
                              Opcional · puedes detallarlo aquí o al revisar
                            </span>
                          </Label>
                          <Textarea
                            id="edit-reason"
                            placeholder="Ej.: Se agregó una camisa recibida posteriormente del cliente (opcional)."
                            maxLength={500}
                            rows={2}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 resize-none font-medium"
                          />
                        </div>
                      </fieldset>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Alerta de Descartar Cambios */}
        {discard && (
          <div
            role="alert"
            className="p-4 bg-amber-50 dark:bg-amber-950/50 border-t border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 shrink-0"
          >
            <span className="font-semibold">Tienes cambios sin guardar. ¿Deseas descartarlos?</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDiscard(false)}
                className="h-8 text-xs font-bold rounded-lg border-amber-300"
              >
                Seguir editando
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={onClose}
                className="h-8 text-xs font-bold rounded-lg"
              >
                Descartar y salir
              </Button>
            </div>
          </div>
        )}

        {/* Footer Fijo */}
        <div className="px-6 py-3.5 border-t border-border/60 bg-slate-50/90 dark:bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            {preview ? (
              <span className="text-muted-foreground font-medium">
                Revisa los cambios antes de confirmar.
              </span>
            ) : draft ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-muted-foreground font-medium">Total:</span>
                <span className="font-black text-sm tabular-nums text-[#1B4B73] dark:text-sky-300">
                  {formatRD(liveFinancials.total)}
                </span>
                {liveFinancials.itbis > 0 && (
                  <span className="text-[11px] text-muted-foreground font-medium">
                    + ({formatRD(liveFinancials.itbis)} ITBIS)
                  </span>
                )}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={close}
              className="h-9.5 px-4 text-xs font-bold rounded-xl border-slate-200 cursor-pointer"
            >
              Cerrar
            </Button>

            {preview && !history && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setPreview(null)}
                className="h-9.5 px-4 text-xs font-bold rounded-xl border-slate-200 cursor-pointer"
              >
                Volver a editar
              </Button>
            )}

            {context?.editable && !history && !loading && (
              <Button
                type="button"
                disabled={busy || (preview ? false : !dirty)}
                onClick={() => submit(!!preview)}
                className="bg-[#1B4B73] hover:bg-[#143a59] text-white font-bold h-9.5 px-5 rounded-xl text-xs flex items-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{preview ? "Confirmar y guardar" : "Revisar cambios"}</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
