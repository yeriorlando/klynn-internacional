import React, { useState, useMemo } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  CalendarDays, 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Scale, 
  CreditCard, 
  BarChart3,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Orden } from "@/lib/storage";
import { 
  exportVentasComparativaToExcel, 
  PeriodResultVentasExport 
} from "@/lib/excel-ventas-comparativa";

export type GranularityMode = "day" | "week" | "month" | "year";

export interface PeriodVentaConfig {
  id: string; // "A", "B", "C", "D"
  label: string;
  dateStr: string; // "YYYY-MM-DD"
  weekDateStr: string; // "YYYY-MM-DD"
  month: number; // 0..11
  year: number;
}

const MESES_NOMBRES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const PERIOD_THEMES: Record<string, {
  badgeBg: string;
  badgeText: string;
  cardBg: string;
  cardBorder: string;
  dotBg: string;
  pillClass: string;
  barColor: string;
}> = {
  A: {
    badgeBg: "bg-[#1B4B73] text-white",
    badgeText: "text-[#1B4B73] dark:text-sky-300",
    cardBg: "bg-blue-50/60 dark:bg-blue-950/30",
    cardBorder: "border-blue-200/80 dark:border-blue-800/60",
    dotBg: "bg-[#1B4B73] dark:bg-sky-400",
    pillClass: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200",
    barColor: "bg-[#1B4B73] dark:bg-sky-400",
  },
  B: {
    badgeBg: "bg-indigo-600 text-white",
    badgeText: "text-indigo-700 dark:text-indigo-300",
    cardBg: "bg-indigo-50/60 dark:bg-indigo-950/30",
    cardBorder: "border-indigo-200/80 dark:border-indigo-800/60",
    dotBg: "bg-indigo-600 dark:bg-indigo-400",
    pillClass: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-200",
    barColor: "bg-indigo-500 dark:bg-indigo-400",
  },
  C: {
    badgeBg: "bg-emerald-600 text-white",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    cardBg: "bg-emerald-50/60 dark:bg-emerald-950/30",
    cardBorder: "border-emerald-200/80 dark:border-emerald-800/60",
    dotBg: "bg-emerald-600 dark:bg-emerald-400",
    pillClass: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200",
    barColor: "bg-emerald-500 dark:bg-emerald-400",
  },
  D: {
    badgeBg: "bg-amber-600 text-white",
    badgeText: "text-amber-700 dark:text-amber-300",
    cardBg: "bg-amber-50/60 dark:bg-amber-950/30",
    cardBorder: "border-amber-200/80 dark:border-amber-800/60",
    dotBg: "bg-amber-600 dark:bg-amber-400",
    pillClass: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200",
    barColor: "bg-amber-500 dark:bg-amber-400",
  },
};

function formatRD(amount: number): string {
  return `RD$ ${Number(amount || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getWeekRange(dateStr: string): { start: string; end: string; label: string } {
  if (!dateStr) return { start: "", end: "", label: "" };
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dayOfWeek = date.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startIso = formatDateISO(monday);
  const endIso = formatDateISO(sunday);

  const startLabel = monday.toLocaleDateString("es-DO", { day: "numeric", month: "short" });
  const endLabel = sunday.toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" });

  return {
    start: startIso,
    end: endIso,
    label: `${startLabel} - ${endLabel}`,
  };
}

interface CompararVentasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordenes: Orden[];
  tenantNombre?: string;
}

export function CompararVentasModal({
  open,
  onOpenChange,
  ordenes,
  tenantNombre = "Klynn",
}: CompararVentasModalProps) {
  const now = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatDateISO(now), [now]);

  const [mode, setMode] = useState<GranularityMode>("month");

  const [periods, setPeriods] = useState<PeriodVentaConfig[]>([
    {
      id: "A",
      label: "Período Base (A)",
      dateStr: todayStr,
      weekDateStr: todayStr,
      month: now.getMonth(),
      year: now.getFullYear(),
    },
    {
      id: "B",
      label: "Período Comparativo (B)",
      dateStr: formatDateISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)),
      weekDateStr: formatDateISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)),
      month: now.getMonth() === 0 ? 11 : now.getMonth() - 1,
      year: now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
    },
    {
      id: "C",
      label: "Período Comparativo (C)",
      dateStr: formatDateISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)),
      weekDateStr: formatDateISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14)),
      month: now.getMonth() <= 1 ? (now.getMonth() === 1 ? 11 : 10) : now.getMonth() - 2,
      year: now.getMonth() <= 1 ? now.getFullYear() - 1 : now.getFullYear(),
    },
  ]);

  const handleUpdatePeriod = (id: string, field: keyof PeriodVentaConfig, value: any) => {
    setPeriods((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handleAddPeriod = () => {
    if (periods.length >= 4) {
      toast.error("Puedes comparar hasta 4 períodos al mismo tiempo.");
      return;
    }
    const nextId = periods.length === 2 ? "C" : "D";
    const refDate = new Date(now.getFullYear(), now.getMonth() - periods.length, 1);

    setPeriods((prev) => [
      ...prev,
      {
        id: nextId,
        label: `Período Comparativo (${nextId})`,
        dateStr: formatDateISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (periods.length * 7))),
        weekDateStr: formatDateISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (periods.length * 7))),
        month: refDate.getMonth(),
        year: refDate.getFullYear(),
      },
    ]);
    toast.success(`Se añadió el Período ${nextId} a la comparativa`);
  };

  const handleRemovePeriod = (idToRemove: string) => {
    if (periods.length <= 2) {
      toast.error("Debes mantener al menos 2 períodos para comparar.");
      return;
    }
    setPeriods((prev) => prev.filter((p) => p.id !== idToRemove));
    toast.info("Período removido");
  };

  // Presets Rápidos
  const applyPresetDiaHoyVsAyer = () => {
    setMode("day");
    const dHoy = formatDateISO(now);
    const dAyer = formatDateISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    const dSemPasada = formatDateISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7));
    setPeriods([
      { id: "A", label: "Hoy (Base A)", dateStr: dHoy, weekDateStr: dHoy, month: now.getMonth(), year: now.getFullYear() },
      { id: "B", label: "Ayer (Comparativo B)", dateStr: dAyer, weekDateStr: dAyer, month: now.getMonth(), year: now.getFullYear() },
      { id: "C", label: "Mismo Día Sem. Pasada (C)", dateStr: dSemPasada, weekDateStr: dSemPasada, month: now.getMonth(), year: now.getFullYear() },
    ]);
    toast.success("Se aplicó el comparativo: Hoy vs Ayer vs Semana Pasada");
  };

  const applyPresetSemanaActualVsAnteriores = () => {
    setMode("week");
    const d0 = formatDateISO(now);
    const d1 = formatDateISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7));
    const d2 = formatDateISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14));
    setPeriods([
      { id: "A", label: "Esta Semana (A)", dateStr: d0, weekDateStr: d0, month: now.getMonth(), year: now.getFullYear() },
      { id: "B", label: "Semana Anterior (B)", dateStr: d1, weekDateStr: d1, month: now.getMonth(), year: now.getFullYear() },
      { id: "C", label: "Hace 2 Semanas (C)", dateStr: d2, weekDateStr: d2, month: now.getMonth(), year: now.getFullYear() },
    ]);
    toast.success("Se cargaron las últimas 3 semanas");
  };

  const applyPresetUltimos3Meses = () => {
    setMode("month");
    const d1 = new Date(now.getFullYear(), now.getMonth(), 1);
    const d2 = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const d3 = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    setPeriods([
      { id: "A", label: "Mes Actual (A)", dateStr: todayStr, weekDateStr: todayStr, month: d1.getMonth(), year: d1.getFullYear() },
      { id: "B", label: "Mes Anterior (B)", dateStr: todayStr, weekDateStr: todayStr, month: d2.getMonth(), year: d2.getFullYear() },
      { id: "C", label: "Hace 2 Meses (C)", dateStr: todayStr, weekDateStr: todayStr, month: d3.getMonth(), year: d3.getFullYear() },
    ]);
    toast.success("Se cargaron los últimos 3 meses consecutivos");
  };

  const applyPresetMismoMesAnioAnterior = () => {
    setMode("month");
    setPeriods([
      { id: "A", label: "Mes Actual (A)", dateStr: todayStr, weekDateStr: todayStr, month: now.getMonth(), year: now.getFullYear() },
      { id: "B", label: "Mismo Mes Año Anterior (B)", dateStr: todayStr, weekDateStr: todayStr, month: now.getMonth(), year: now.getFullYear() - 1 },
      { id: "C", label: "Mismo Mes Hace 2 Años (C)", dateStr: todayStr, weekDateStr: todayStr, month: now.getMonth(), year: now.getFullYear() - 2 },
    ]);
    toast.success("Se cargó la comparativa Interanual (YoY)");
  };

  const applyPresetUltimos3Anios = () => {
    setMode("year");
    const currY = now.getFullYear();
    setPeriods([
      { id: "A", label: `Año ${currY} (A)`, dateStr: todayStr, weekDateStr: todayStr, month: now.getMonth(), year: currY },
      { id: "B", label: `Año ${currY - 1} (B)`, dateStr: todayStr, weekDateStr: todayStr, month: now.getMonth(), year: currY - 1 },
      { id: "C", label: `Año ${currY - 2} (C)`, dateStr: todayStr, weekDateStr: todayStr, month: now.getMonth(), year: currY - 2 },
    ]);
    toast.success("Se cargaron los últimos 3 ejercicios anuales");
  };

  // Cálculo de resultados
  const periodResults: PeriodResultVentasExport[] = useMemo(() => {
    const validOrdenes = (ordenes || []).filter((o) => o.estado !== "ANULADA");

    return periods.map((p) => {
      let displayLabel = "";
      let matchesPeriod = (oDateStr: string) => false;

      if (mode === "day") {
        displayLabel = p.dateStr;
        matchesPeriod = (oDateStr) => oDateStr.startsWith(p.dateStr);
      } else if (mode === "week") {
        const { start, end, label } = getWeekRange(p.weekDateStr);
        displayLabel = label;
        matchesPeriod = (oDateStr) => {
          const d = oDateStr.substring(0, 10);
          return d >= start && d <= end;
        };
      } else if (mode === "month") {
        const mStr = String(p.month + 1).padStart(2, "0");
        const prefix = `${p.year}-${mStr}`;
        displayLabel = `${MESES_NOMBRES[p.month]} ${p.year}`;
        matchesPeriod = (oDateStr) => oDateStr.startsWith(prefix);
      } else {
        const prefix = String(p.year);
        displayLabel = `Año ${p.year}`;
        matchesPeriod = (oDateStr) => oDateStr.startsWith(prefix);
      }

      const filteredOrders = validOrdenes.filter((o) => {
        if (!o.creado_en) return false;
        return matchesPeriod(o.creado_en);
      });

      let total = 0;
      let subtotal = 0;
      let itbis = 0;
      let descuento = 0;
      let pagado = 0;
      let saldo = 0;
      let piezas = 0;
      let libras = 0;
      const clientSet = new Set<string>();
      const metodosMap: Record<string, { total: number; count: number }> = {};

      filteredOrders.forEach((o) => {
        total += Number(o.total || 0);
        subtotal += Number(o.subtotal || 0);
        itbis += Number(o.itbis || 0);
        descuento += Number(o.descuento || 0);
        pagado += Number(o.pagado || 0);
        saldo += Number(o.saldo || 0);

        if (o.cliente_id) clientSet.add(o.cliente_id);

        const metodo = (o.metodo_pago || "EFECTIVO").toUpperCase();
        if (!metodosMap[metodo]) {
          metodosMap[metodo] = { total: 0, count: 0 };
        }
        metodosMap[metodo].total += Number(o.total || 0);
        metodosMap[metodo].count += 1;

        if (o.items && Array.isArray(o.items)) {
          o.items.forEach((it) => {
            if (it.tipo_cobro === "LIBRA") {
              libras += Number(it.libras || it.cantidad || 0);
            } else {
              piezas += Number(it.cantidad || 1);
            }
          });
        }
      });

      const count = filteredOrders.length;
      const ticketPromedio = count > 0 ? total / count : 0;

      return {
        id: p.id,
        label: p.label,
        displayLabel,
        total,
        count,
        ticketPromedio,
        subtotal,
        itbis,
        descuento,
        saldo,
        pagado,
        piezas,
        libras,
        clientesUnicos: clientSet.size,
        metodosMap,
      };
    });
  }, [ordenes, periods, mode]);

  const pA = periodResults[0] || { total: 0, count: 0, ticketPromedio: 0 };

  const handleExportExcel = () => {
    try {
      const modeLabel =
        mode === "day" ? "Día" : mode === "week" ? "Semana" : mode === "month" ? "Mes" : "Año";

      exportVentasComparativaToExcel({
        tenantName: tenantNombre,
        modeLabel,
        periods,
        periodResults,
      });

      toast.success("Comparativa de ventas exportada a Excel (.xlsx) con diseño 📊");
    } catch (err: any) {
      console.error("Error al exportar:", err);
      toast.error(err?.message || "Error al generar archivo Excel");
    }
  };

  const maxTotal = Math.max(...periodResults.map((p) => p.total), 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl sm:max-w-5xl w-[94vw] max-h-[88vh] flex flex-col p-0 rounded-2xl overflow-hidden bg-background shadow-2xl border border-border">
        {/* ENCABEZADO COMPACTO Y SIN BOTONES QUE SE SOLAPEN CON LA (X) */}
        <DialogHeader className="px-5 pt-4 pb-2.5 border-b border-border/80 bg-muted/30 shrink-0">
          <div className="flex items-center justify-between gap-3 pr-8">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#1B4B73] text-white shadow-xs">
                <Scale className="h-4 w-4 text-[#F0B900]" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-display font-black text-foreground tracking-tight flex items-center gap-2">
                  <span>Comparativa de Períodos de Ventas</span>
                  <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300">
                    Lado a Lado
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Compara ventas, tickets promedio y formas de pago entre días, semanas, meses o años.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* SELECTOR DE MODO DE GRANULARIDAD */}
          <div className="flex items-center gap-2 pt-2.5 pb-0.5">
            <span className="text-[10px] font-black text-muted-foreground shrink-0 uppercase tracking-wider">
              Comparar Por:
            </span>
            <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 gap-1">
              <button
                type="button"
                onClick={() => setMode("day")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                  mode === "day"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-sky-600"
                )}
              >
                <Calendar className="h-3 w-3" />
                <span>Por Día</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("week")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                  mode === "week"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-indigo-600"
                )}
              >
                <BarChart3 className="h-3 w-3" />
                <span>Por Semana</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("month")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                  mode === "month"
                    ? "bg-[#1B4B73] text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-[#1B4B73]"
                )}
              >
                <CalendarDays className="h-3 w-3" />
                <span>Por Mes</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("year")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                  mode === "year"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-amber-600"
                )}
              >
                <Sparkles className="h-3 w-3" />
                <span>Por Año</span>
              </button>
            </div>
          </div>

          {/* ACCESOS RÁPIDOS DINÁMICOS CON COLORES DIFERENCIADOS */}
          <div className="flex items-center gap-1.5 pt-1.5 pb-0.5 overflow-x-auto custom-scrollbar">
            <span className="text-[10px] font-black text-muted-foreground shrink-0 uppercase tracking-wider">
              Accesos Rápidos:
            </span>

            {mode === "day" && (
              <button
                type="button"
                onClick={applyPresetDiaHoyVsAyer}
                className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-100/80 hover:bg-blue-200/90 text-blue-900 border border-blue-300/80 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800 shadow-2xs transition-all cursor-pointer shrink-0"
              >
                Hoy vs Ayer vs Sem. Pasada
              </button>
            )}

            {mode === "week" && (
              <button
                type="button"
                onClick={applyPresetSemanaActualVsAnteriores}
                className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-teal-100/80 hover:bg-teal-200/90 text-teal-900 border border-teal-300/80 dark:bg-teal-950/60 dark:text-teal-200 dark:border-teal-800 shadow-2xs transition-all cursor-pointer shrink-0"
              >
                Últimas 3 Semanas
              </button>
            )}

            {mode === "month" && (
              <>
                <button
                  type="button"
                  onClick={applyPresetUltimos3Meses}
                  className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-teal-100/80 hover:bg-teal-200/90 text-teal-900 border border-teal-300/80 dark:bg-teal-950/60 dark:text-teal-200 dark:border-teal-800 shadow-2xs transition-all cursor-pointer shrink-0"
                >
                  Últimos 3 Meses
                </button>
                <button
                  type="button"
                  onClick={applyPresetMismoMesAnioAnterior}
                  className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-purple-100/80 hover:bg-purple-200/90 text-purple-900 border border-purple-300/80 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800 shadow-2xs transition-all cursor-pointer shrink-0"
                >
                  Mismo Mes Años Anteriores (YoY)
                </button>
              </>
            )}

            {mode === "year" && (
              <button
                type="button"
                onClick={applyPresetUltimos3Anios}
                className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-100/80 hover:bg-emerald-200/90 text-emerald-900 border border-emerald-300/80 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800 shadow-2xs transition-all cursor-pointer shrink-0"
              >
                Últimos 3 Años (2026 vs 2025 vs 2024)
              </button>
            )}
          </div>
        </DialogHeader>

        {/* CONTENIDO DESPLAZABLE COMPACTO */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 custom-scrollbar">
          {/* SECCIÓN 1: CONFIGURACIÓN DE PERÍODOS (3 COLUMNAS) */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-surface border border-border shadow-xs space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-[#1B4B73] dark:text-sky-400" />
                Períodos Seleccionados ({periods.length}/4)
              </span>

              {periods.length < 4 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddPeriod}
                  className="h-7 px-2.5 rounded-lg font-black text-xs border-dashed border-[#1B4B73]/60 hover:bg-[#1B4B73]/10 text-[#1B4B73] dark:text-sky-300 cursor-pointer shadow-2xs transition-all active:scale-95"
                >
                  <Plus className="h-3 w-3 mr-1 text-[#F0B900]" />
                  <span>Añadir Período ({periods.length === 2 ? "Período C" : "Período D"})</span>
                </Button>
              )}
            </div>

            {/* Columnas dinámicas según el modo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {periods.map((period) => {
                const theme = PERIOD_THEMES[period.id] || PERIOD_THEMES.A;
                const result = periodResults.find((r) => r.id === period.id);

                return (
                  <div
                    key={period.id}
                    className={cn("p-2.5 rounded-xl border transition-all flex flex-col justify-between gap-2", theme.cardBg, theme.cardBorder)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("w-5 h-5 rounded-md text-white flex items-center justify-center text-[10px] font-black", theme.badgeBg)}>
                          {period.id}
                        </span>
                        <span className={cn("text-xs font-black uppercase tracking-wider", theme.badgeText)}>
                          {period.label}
                        </span>
                      </div>

                      {periods.length > 2 && period.id !== "A" && (
                        <button
                          type="button"
                          onClick={() => handleRemovePeriod(period.id)}
                          className="p-1 rounded-md hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-500 transition-colors cursor-pointer"
                          title="Eliminar este período"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* Controles de Selección según Modo */}
                    {mode === "day" && (
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                          Fecha del Día
                        </label>
                        <Input
                          type="date"
                          className="h-8 text-xs font-bold bg-white dark:bg-slate-950 border-border"
                          value={period.dateStr}
                          onChange={(e) => handleUpdatePeriod(period.id, "dateStr", e.target.value)}
                        />
                      </div>
                    )}

                    {mode === "week" && (
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                          Semana: {result?.displayLabel || ""}
                        </label>
                        <Input
                          type="date"
                          className="h-8 text-xs font-bold bg-white dark:bg-slate-950 border-border"
                          value={period.weekDateStr}
                          onChange={(e) => handleUpdatePeriod(period.id, "weekDateStr", e.target.value)}
                        />
                      </div>
                    )}

                    {mode === "month" && (
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block mb-0.5">
                            Mes
                          </label>
                          <Select
                            value={String(period.month)}
                            onValueChange={(v) => handleUpdatePeriod(period.id, "month", Number(v))}
                          >
                            <SelectTrigger className="h-8 text-xs font-bold bg-white dark:bg-slate-950 border-border">
                              <SelectValue placeholder="Mes" />
                            </SelectTrigger>
                            <SelectContent className="max-h-56">
                              {MESES_NOMBRES.map((m, mIdx) => (
                                <SelectItem key={mIdx} value={String(mIdx)}>
                                  {m}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block mb-0.5">
                            Año
                          </label>
                          <Select
                            value={String(period.year)}
                            onValueChange={(v) => handleUpdatePeriod(period.id, "year", Number(v))}
                          >
                            <SelectTrigger className="h-8 text-xs font-bold bg-white dark:bg-slate-950 border-border">
                              <SelectValue placeholder="Año" />
                            </SelectTrigger>
                            <SelectContent>
                              {[...Array(6)].map((_, i) => {
                                const y = now.getFullYear() - i;
                                return (
                                  <SelectItem key={y} value={String(y)}>
                                    {y}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {mode === "year" && (
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                          Año Fiscal
                        </label>
                        <Select
                          value={String(period.year)}
                          onValueChange={(v) => handleUpdatePeriod(period.id, "year", Number(v))}
                        >
                          <SelectTrigger className="h-8 text-xs font-bold bg-white dark:bg-slate-950 border-border">
                            <SelectValue placeholder="Año" />
                          </SelectTrigger>
                          <SelectContent>
                            {[...Array(6)].map((_, i) => {
                              const y = now.getFullYear() - i;
                              return (
                                <SelectItem key={y} value={String(y)}>
                                  {y}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Resumen Compacto en la tarjeta */}
                    <div className="pt-1.5 border-t border-border/50 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground">Ventas:</span>
                      <span className="text-xs font-display font-black text-foreground">
                        {formatRD(result?.total || 0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECCIÓN 2: TARJETAS KPI COMPARATIVAS CON PORCENTAJES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {periodResults.map((p) => {
              const theme = PERIOD_THEMES[p.id] || PERIOD_THEMES.A;
              const diff = p.id === "A" ? 0 : p.total - pA.total;
              const pct = p.id === "A" ? 0 : pA.total > 0 ? (diff / pA.total) * 100 : 0;
              const isPositive = pct >= 0;

              return (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-card border border-border/80 shadow-2xs flex flex-col justify-between gap-2 hover:shadow-xs transition-shadow"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("w-4 h-4 rounded text-white flex items-center justify-center text-[9px] font-black", theme.badgeBg)}>
                        {p.id}
                      </span>
                      <span className="text-[11px] font-bold text-muted-foreground truncate max-w-[130px]">
                        {p.displayLabel}
                      </span>
                    </div>

                    {p.id !== "A" && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] font-black gap-0.5 px-1.5 py-0",
                          isPositive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400"
                            : "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-400"
                        )}
                      >
                        {isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                        <span>{isPositive ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`}</span>
                      </Badge>
                    )}
                  </div>

                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block leading-none mb-1">
                      Total Facturado
                    </span>
                    <span className="text-lg sm:text-xl font-display font-black text-foreground">
                      {formatRD(p.total)}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", theme.barColor)}
                        style={{ width: `${Math.min(100, (p.total / maxTotal) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      <strong className="text-foreground">{p.count}</strong> órdenes
                    </span>
                    <span>
                      Ticket: <strong className="text-foreground">{formatRD(p.ticketPromedio)}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SECCIÓN 3: MATRIZ DETALLADA DE VARIABLES LADO A LADO */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-card border border-border shadow-xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-[#1B4B73] dark:text-sky-400" />
                Matriz Comparativa Detallada
              </span>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border text-muted-foreground bg-muted/40">
                    <th className="py-1.5 px-2.5 font-black text-foreground uppercase tracking-wider">
                      Variable Comercial
                    </th>
                    {periodResults.map((p) => {
                      const theme = PERIOD_THEMES[p.id] || PERIOD_THEMES.A;
                      return (
                        <th key={p.id} className="py-1.5 px-2.5 text-right font-black">
                          <span className={cn("px-1.5 py-0.5 rounded text-[10px]", theme.badgeBg)}>
                            {p.id}: {p.displayLabel}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  <tr className="hover:bg-muted/20 font-black">
                    <td className="py-1.5 px-2.5 text-foreground">Total Facturado (Neto)</td>
                    {periodResults.map((p) => (
                      <td key={p.id} className="py-1.5 px-2.5 text-right text-foreground font-display font-black text-xs sm:text-sm">
                        {formatRD(p.total)}
                      </td>
                    ))}
                  </tr>

                  <tr className="hover:bg-muted/20">
                    <td className="py-1 px-2.5 text-muted-foreground">Base Imponible (Subtotal)</td>
                    {periodResults.map((p) => (
                      <td key={p.id} className="py-1 px-2.5 text-right font-bold text-foreground">
                        {formatRD(p.subtotal)}
                      </td>
                    ))}
                  </tr>

                  <tr className="hover:bg-muted/20">
                    <td className="py-1 px-2.5 text-muted-foreground">ITBIS Recaudado (18%)</td>
                    {periodResults.map((p) => (
                      <td key={p.id} className="py-1 px-2.5 text-right font-bold text-foreground">
                        {formatRD(p.itbis)}
                      </td>
                    ))}
                  </tr>

                  <tr className="hover:bg-muted/20">
                    <td className="py-1 px-2.5 text-muted-foreground">Descuentos Otorgados</td>
                    {periodResults.map((p) => (
                      <td key={p.id} className="py-1 px-2.5 text-right font-bold text-foreground">
                        {formatRD(p.descuento)}
                      </td>
                    ))}
                  </tr>

                  <tr className="hover:bg-muted/20">
                    <td className="py-1 px-2.5 text-rose-600 dark:text-rose-400 font-bold">
                      Saldo Pendiente (CxC)
                    </td>
                    {periodResults.map((p) => (
                      <td key={p.id} className="py-1 px-2.5 text-right font-bold text-rose-600 dark:text-rose-400">
                        {formatRD(p.saldo)}
                      </td>
                    ))}
                  </tr>

                  <tr className="hover:bg-muted/20">
                    <td className="py-1 px-2.5 text-muted-foreground">Cantidad de Órdenes</td>
                    {periodResults.map((p) => (
                      <td key={p.id} className="py-1 px-2.5 text-right font-bold text-foreground">
                        {p.count}
                      </td>
                    ))}
                  </tr>

                  <tr className="hover:bg-muted/20">
                    <td className="py-1 px-2.5 text-muted-foreground">Ticket Promedio por Orden</td>
                    {periodResults.map((p) => (
                      <td key={p.id} className="py-1 px-2.5 text-right font-bold text-foreground">
                        {formatRD(p.ticketPromedio)}
                      </td>
                    ))}
                  </tr>

                  <tr className="hover:bg-muted/20">
                    <td className="py-1 px-2.5 text-muted-foreground">Clientes Únicos Atendidos</td>
                    {periodResults.map((p) => (
                      <td key={p.id} className="py-1 px-2.5 text-right font-bold text-foreground">
                        {p.clientesUnicos}
                      </td>
                    ))}
                  </tr>

                  <tr className="hover:bg-muted/20">
                    <td className="py-1 px-2.5 text-muted-foreground">Prendas Procesadas</td>
                    {periodResults.map((p) => (
                      <td key={p.id} className="py-1 px-2.5 text-right font-bold text-foreground">
                        {p.piezas}
                      </td>
                    ))}
                  </tr>

                  <tr className="hover:bg-muted/20">
                    <td className="py-1 px-2.5 text-muted-foreground">Libras de Ropa Procesadas</td>
                    {periodResults.map((p) => (
                      <td key={p.id} className="py-1 px-2.5 text-right font-bold text-foreground">
                        {p.libras.toFixed(1)} lbs
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* SECCIÓN 4: DESGLOSE POR MÉTODOS DE PAGO */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-card border border-border shadow-xs space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-[#1B4B73] dark:text-sky-400" />
              Distribución por Formas de Pago
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {["EFECTIVO", "TARJETA", "TRANSFERENCIA"].map((metodo) => {
                return (
                  <div key={metodo} className="p-2.5 rounded-lg bg-muted/30 border border-border/80 space-y-1.5">
                    <span className="text-[10px] font-black text-foreground uppercase tracking-wider">
                      {metodo}
                    </span>
                    <div className="space-y-1">
                      {periodResults.map((p) => {
                        const mData = p.metodosMap[metodo] || { total: 0, count: 0 };
                        const share = p.total > 0 ? (mData.total / p.total) * 100 : 0;
                        const theme = PERIOD_THEMES[p.id] || PERIOD_THEMES.A;

                        return (
                          <div key={p.id} className="flex items-center justify-between text-[11px]">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <span className={cn("w-1.5 h-1.5 rounded-full", theme.dotBg)} />
                              {p.id}
                            </span>
                            <span className="font-bold text-foreground">
                              {formatRD(mData.total)}{" "}
                              <span className="text-[9px] text-muted-foreground font-normal">
                                ({share.toFixed(1)}%)
                              </span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* PIE DEL MODAL CON BOTÓN DE EXCEL DESTACADO Y SIN DUPLICADOS */}
        <DialogFooter className="px-5 py-2.5 border-t border-border bg-muted/20 flex flex-row items-center justify-between sm:justify-between shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:inline-block">
            Datos en tiempo real según órdenes registradas en Klynn.
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs font-bold h-9 px-4"
            >
              Cerrar
            </Button>
            <Button
              size="sm"
              onClick={handleExportExcel}
              className="rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-9 px-4 shadow-sm cursor-pointer transition-all active:scale-95"
            >
              <FileSpreadsheet className="h-4 w-4 text-white" />
              <span>Exportar a Excel (.xlsx)</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
