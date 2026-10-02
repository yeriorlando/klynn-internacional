import { useState, useMemo, useEffect } from "react";
import {
  Inbox,
  Truck,
  TrendingUp,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BarChart3,
  Eye,
  EyeOff,
  MousePointerClick,
} from "lucide-react";
import type { Orden, EstadoOrden } from "@/lib/storage";
import type { PeriodoCreacion } from "@/components/klynn/OrdenesPage";

export interface OrdenesDailyMetricsCardsProps {
  ordenes: Orden[];
  periodoCreacion: PeriodoCreacion;
  filtroEstado: EstadoOrden | "todos" | "hoy" | "urgente";
  customFechaDesde?: string;
  customFechaHasta?: string;
  filtroSucursalRed?: string;
  onFilterPeriodo: (periodo: PeriodoCreacion, customDate?: string) => void;
  onFilterEstado: (estado: EstadoOrden | "todos") => void;
  onResetFilter: () => void;
  toolbarActions?: React.ReactNode;
}

type TimeframeOption = "7d" | "10d" | "15d";

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseOrderDateKey(dateStr?: string): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return toLocalDateKey(d);
}

function isTodayKey(dateKey: string): boolean {
  return dateKey === toLocalDateKey(new Date());
}

function isYesterdayKey(dateKey: string): boolean {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return dateKey === toLocalDateKey(y);
}

function isThisWeekKey(d: Date): boolean {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const startOfWeek = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + diffToMonday,
    0,
    0,
    0,
    0,
  );
  const endOfWeek = new Date(
    startOfWeek.getFullYear(),
    startOfWeek.getMonth(),
    startOfWeek.getDate() + 6,
    23,
    59,
    59,
    999,
  );
  return d >= startOfWeek && d <= endOfWeek;
}

export function OrdenesDailyMetricsCards({
  ordenes,
  periodoCreacion,
  filtroEstado,
  customFechaDesde,
  customFechaHasta,
  filtroSucursalRed,
  onFilterPeriodo,
  onFilterEstado,
  onResetFilter,
  toolbarActions,
}: OrdenesDailyMetricsCardsProps) {
  // Timeframe para las barras de cada tarjeta: POR DEFECTO 7 DÍAS
  const [timeframeRecibidos, setTimeframeRecibidos] = useState<TimeframeOption>("7d");
  const [timeframeEntregados, setTimeframeEntregados] = useState<TimeframeOption>("7d");

  const STORAGE_KEY = "klynn_ordenes_daily_metrics_collapsed";

  // Por defecto abierto, persistido en localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error("Error saving ordenes metrics collapsed state", e);
      }
      return next;
    });
  };

  // Generador de días según el timeframe
  const generateDays = (tf: TimeframeOption) => {
    const count = tf === "7d" ? 7 : tf === "10d" ? 10 : 15;
    const days = [];
    const now = new Date();
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = toLocalDateKey(d);
      days.push({
        date: d,
        key,
        dayNum: d.getDate(),
        dayName: d.toLocaleDateString("es-DO", { weekday: "short" }),
        fullDateFormatted: d.toLocaleDateString("es-DO", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
        isToday: isTodayKey(key),
        isYesterday: isYesterdayKey(key),
        isThisWeek: isThisWeekKey(d),
      });
    }
    return days;
  };

  const daysRecibidos = useMemo(() => generateDays(timeframeRecibidos), [timeframeRecibidos]);
  const daysEntregados = useMemo(() => generateDays(timeframeEntregados), [timeframeEntregados]);

  // Mapa de Órdenes Recibidas por día (excluyendo anuladas)
  const statsRecibidos = useMemo(() => {
    const map: Record<string, number> = {};
    let hoy = 0;
    let ayer = 0;
    let estaSemana = 0;

    const todayKey = toLocalDateKey(new Date());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayKey = toLocalDateKey(yesterdayDate);

    for (const o of ordenes) {
      if (o.estado === "ANULADA") continue;
      const k = parseOrderDateKey(o.creado_en);
      if (!k) continue;

      map[k] = (map[k] || 0) + 1;

      if (k === todayKey) hoy++;
      if (k === yesterdayKey) ayer++;

      const d = new Date(o.creado_en);
      if (!isNaN(d.getTime()) && isThisWeekKey(d)) {
        estaSemana++;
      }
    }

    return { map, hoy, ayer, estaSemana };
  }, [ordenes]);

  // Mapa de Órdenes Entregadas por día
  const statsEntregados = useMemo(() => {
    const map: Record<string, number> = {};
    let hoy = 0;
    let ayer = 0;
    let estaSemana = 0;

    const todayKey = toLocalDateKey(new Date());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayKey = toLocalDateKey(yesterdayDate);

    for (const o of ordenes) {
      if (o.estado !== "ENTREGADA") continue;
      const targetDateStr = o.pod_fecha || o.fecha_entrega || o.creado_en;
      const k = parseOrderDateKey(targetDateStr);
      if (!k) continue;

      map[k] = (map[k] || 0) + 1;

      if (k === todayKey) hoy++;
      if (k === yesterdayKey) ayer++;

      const d = new Date(targetDateStr);
      if (!isNaN(d.getTime()) && isThisWeekKey(d)) {
        estaSemana++;
      }
    }

    return { map, hoy, ayer, estaSemana };
  }, [ordenes]);

  // Cálculo de máximos para la altura de las barras
  const maxRecibidos = useMemo(() => {
    const counts = daysRecibidos.map((d) => statsRecibidos.map[d.key] || 0);
    return Math.max(...counts, 1);
  }, [daysRecibidos, statsRecibidos]);

  const maxEntregados = useMemo(() => {
    const counts = daysEntregados.map((d) => statsEntregados.map[d.key] || 0);
    return Math.max(...counts, 1);
  }, [daysEntregados, statsEntregados]);

  // Determinar si hay un filtro activo aplicado desde las tarjetas
  const hasActiveFilter =
    periodoCreacion !== "todas" ||
    filtroEstado !== "todos" ||
    Boolean(customFechaDesde) ||
    Boolean(filtroSucursalRed && filtroSucursalRed !== "LOCAL_ONLY");

  return (
    <div className="mb-4 font-display">
      {/* ========================================================
          BARRA / BOTÓN SUPERIOR DESTACADO: FLUJO DIARIO DE ÓRDENES
          Colores Klynn: Azul Añil (#1B4B73) & Amarillo Jabón (#F0B900)
         ======================================================== */}
      <div className="mb-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 p-2.5 sm:px-4 sm:py-3 shadow-xs transition-all hover:border-[#1B4B73]/40 hover:shadow-sm">
        {toolbarActions ? (
          /* ========================================================
             VISTA CON RED Y TRASLADOS ACTIVO: Toolbar a la izquierda, Flujo a la derecha
             ======================================================== */
          <div className="flex flex-wrap items-end justify-between gap-3">
            {/* Lado izquierdo: Consultar en la Red y Filtro por sucursales */}
            <div className="flex items-center gap-2 flex-wrap">
              {toolbarActions}
            </div>

            {/* Lado derecho: Flujo diario de órdenes y botón de mostrar gráficas */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div
                onClick={toggleCollapsed}
                className="flex items-center gap-2 cursor-pointer select-none group"
                title={isCollapsed ? "Clic para ver las gráficas" : "Clic para ocultar las gráficas"}
              >
                <div className="h-10 w-10 rounded-xl bg-[#1B4B73] text-[#F0B900] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <BarChart3 className="h-4.5 w-4.5 stroke-[2.5]" />
                </div>

                <span className="font-extrabold text-xs sm:text-sm text-[#1B4B73] dark:text-sky-200 tracking-tight uppercase">
                  Flujo diario de órdenes
                </span>
              </div>

              {hasActiveFilter && (
                <button
                  onClick={onResetFilter}
                  className="inline-flex items-center gap-1.5 h-10 text-[11px] font-black text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/60 px-3 rounded-xl transition-all cursor-pointer shadow-2xs"
                  title="Quitar filtros y mostrar todas las órdenes"
                >
                  <span>Filtro activo</span>
                  <X className="h-3 w-3 stroke-[2.5]" />
                </button>
              )}

              <button
                onClick={toggleCollapsed}
                className={`flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer shadow-2xs active:scale-95 ${
                  isCollapsed
                    ? "bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73]"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#1B4B73] dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                }`}
              >
                {isCollapsed ? (
                  <>
                    <Eye className="h-4 w-4 text-[#F0B900]" />
                    <span>Mostrar gráficas</span>
                    <ChevronDown className="h-4 w-4 text-[#F0B900]" />
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4 text-slate-500" />
                    <span>Ocultar</span>
                    <ChevronUp className="h-4 w-4 text-slate-500" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================
             VISTA ADAPTABLE SIN RED Y TRASLADOS: Flujo diario a la izquierda con badges, botón a la derecha
             ======================================================== */
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Lado izquierdo: Identificador y resumen rápido con badges de hoy */}
            <div
              onClick={toggleCollapsed}
              className="flex items-center gap-2.5 cursor-pointer select-none group"
              title={isCollapsed ? "Clic para ver las gráficas" : "Clic para ocultar las gráficas"}
            >
              <div className="h-10 w-10 rounded-xl bg-[#1B4B73] text-[#F0B900] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <BarChart3 className="h-4.5 w-4.5 stroke-[2.5]" />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-xs sm:text-sm text-[#1B4B73] dark:text-sky-200 tracking-tight uppercase">
                  Flujo diario de órdenes
                </span>

                {/* Badges de vistazos rápidos visibles siempre para dar contexto */}
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-[#1B4B73]/10 text-[#1B4B73] dark:bg-[#1B4B73]/30 dark:text-sky-300 border border-[#1B4B73]/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1B4B73]" />
                    Hoy: <strong>{statsRecibidos.hoy}</strong> Recibidas
                  </span>

                  <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-[#F0B900]/20 text-[#1B4B73] dark:bg-[#F0B900]/20 dark:text-amber-300 border border-[#F0B900]/40">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#F0B900]" />
                    Hoy: <strong>{statsEntregados.hoy}</strong> Entregadas
                  </span>
                </div>
              </div>
            </div>

            {/* Lado derecho: Botón claro e inequívoco para MOSTRAR / OCULTAR */}
            <div className="flex items-center gap-2">
              {hasActiveFilter && (
                <button
                  onClick={onResetFilter}
                  className="inline-flex items-center gap-1.5 h-10 text-[11px] font-black text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/60 px-3 rounded-xl transition-all cursor-pointer shadow-2xs"
                  title="Quitar filtros y mostrar todas las órdenes"
                >
                  <span>Filtro activo</span>
                  <X className="h-3 w-3 stroke-[2.5]" />
                </button>
              )}

              <button
                onClick={toggleCollapsed}
                className={`flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer shadow-2xs active:scale-95 ${
                  isCollapsed
                    ? "bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73]"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#1B4B73] dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                }`}
              >
                {isCollapsed ? (
                  <>
                    <Eye className="h-4 w-4 text-[#F0B900]" />
                    <span>Mostrar gráficas</span>
                    <ChevronDown className="h-4 w-4 text-[#F0B900]" />
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4 text-slate-500" />
                    <span>Ocultar</span>
                    <ChevronUp className="h-4 w-4 text-slate-500" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          CONTENIDO: DOS TARJETAS PROFESIONALES (EXPANDIDAS)
         ======================================================== */}
      {!isCollapsed && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4 animate-in fade-in duration-200">
          {/* ========================================================
              TARJETA 1: ÓRDENES RECIBIDAS POR DÍA (Azul Añil #1B4B73)
             ======================================================== */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 sm:p-5 shadow-xs transition-all hover:shadow-sm">
            {/* Cabecera */}
            <div className="flex items-start justify-between gap-3 mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#1B4B73]/10 dark:bg-[#1B4B73]/30 text-[#1B4B73] dark:text-sky-300 border border-[#1B4B73]/25 flex items-center justify-center shrink-0 shadow-2xs">
                  <Inbox className="h-4.5 w-4.5 stroke-[2.4]" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-[#1B4B73] dark:text-sky-200 leading-tight">
                    Órdenes recibidas por día
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {timeframeRecibidos === "7d"
                      ? "Semana (últimos 7 días)"
                      : timeframeRecibidos === "10d"
                        ? "Últimos 10 días"
                        : "Quincena (últimos 15 días)"}
                  </p>
                </div>
              </div>

              {/* Selector de Rango */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/70 dark:border-slate-700/60 shrink-0">
                {(["7d", "10d", "15d"] as TimeframeOption[]).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframeRecibidos(tf)}
                    className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                      timeframeRecibidos === tf
                        ? "bg-[#1B4B73] text-white shadow-2xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-[#1B4B73] dark:hover:text-slate-200"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* VISTAZOS POR ESOS TIEMPOS (HOY, Ayer, Esta semana) */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {/* HOY */}
              <button
                onClick={() => {
                  if (periodoCreacion === "hoy" && filtroEstado === "todos") {
                    onResetFilter();
                  } else {
                    onFilterPeriodo("hoy");
                    onFilterEstado("todos");
                  }
                }}
                className={`flex flex-col items-start p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer active:scale-98 ${
                  periodoCreacion === "hoy" && filtroEstado === "todos"
                    ? "bg-[#1B4B73] text-white border-[#1B4B73] shadow-xs ring-2 ring-[#1B4B73]/30"
                    : "bg-[#1B4B73]/5 dark:bg-[#1B4B73]/20 border-[#1B4B73]/20 dark:border-[#1B4B73]/40 hover:border-[#1B4B73]/60 hover:bg-[#1B4B73]/10"
                }`}
                title="Filtrar por órdenes recibidas HOY"
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider ${
                      periodoCreacion === "hoy" && filtroEstado === "todos"
                        ? "text-[#F0B900]"
                        : "text-[#1B4B73] dark:text-sky-300"
                    }`}
                  >
                    HOY
                  </span>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      periodoCreacion === "hoy" && filtroEstado === "todos"
                        ? "bg-[#F0B900]"
                        : "bg-[#1B4B73]"
                    }`}
                  />
                </div>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span
                    className={`text-base sm:text-lg font-black leading-tight ${
                      periodoCreacion === "hoy" && filtroEstado === "todos"
                        ? "text-white"
                        : "text-[#1B4B73] dark:text-sky-100"
                    }`}
                  >
                    {statsRecibidos.hoy}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${
                      periodoCreacion === "hoy" && filtroEstado === "todos"
                        ? "text-slate-200"
                        : "text-[#1B4B73]/80 dark:text-sky-300/80"
                    }`}
                  >
                    Recibidas
                  </span>
                </div>
              </button>

              {/* AYER */}
              <button
                onClick={() => {
                  if (periodoCreacion === "ayer" && filtroEstado === "todos") {
                    onResetFilter();
                  } else {
                    onFilterPeriodo("ayer");
                    onFilterEstado("todos");
                  }
                }}
                className={`flex flex-col items-start p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer active:scale-98 ${
                  periodoCreacion === "ayer" && filtroEstado === "todos"
                    ? "bg-[#1B4B73] text-white border-[#1B4B73] shadow-xs ring-2 ring-[#1B4B73]/30"
                    : "bg-slate-50/90 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 hover:bg-slate-100/70"
                }`}
                title="Filtrar por órdenes recibidas AYER"
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider ${
                      periodoCreacion === "ayer" && filtroEstado === "todos"
                        ? "text-slate-200"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Ayer
                  </span>
                </div>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span
                    className={`text-base sm:text-lg font-black leading-tight ${
                      periodoCreacion === "ayer" && filtroEstado === "todos"
                        ? "text-white"
                        : "text-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {statsRecibidos.ayer}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${
                      periodoCreacion === "ayer" && filtroEstado === "todos"
                        ? "text-slate-300"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    Recibidas
                  </span>
                </div>
              </button>

              {/* ESTA SEMANA */}
              <button
                onClick={() => {
                  if (periodoCreacion === "esta_semana" && filtroEstado === "todos") {
                    onResetFilter();
                  } else {
                    onFilterPeriodo("esta_semana");
                    onFilterEstado("todos");
                  }
                }}
                className={`flex flex-col items-start p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer active:scale-98 ${
                  periodoCreacion === "esta_semana" && filtroEstado === "todos"
                    ? "bg-[#1B4B73] text-white border-[#1B4B73] shadow-xs ring-2 ring-[#1B4B73]/30"
                    : "bg-slate-50/90 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 hover:bg-slate-100/70"
                }`}
                title="Filtrar por órdenes recibidas ESTA SEMANA"
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider ${
                      periodoCreacion === "esta_semana" && filtroEstado === "todos"
                        ? "text-slate-200"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Esta semana
                  </span>
                </div>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span
                    className={`text-base sm:text-lg font-black leading-tight ${
                      periodoCreacion === "esta_semana" && filtroEstado === "todos"
                        ? "text-white"
                        : "text-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {statsRecibidos.estaSemana}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${
                      periodoCreacion === "esta_semana" && filtroEstado === "todos"
                        ? "text-slate-300"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    Total
                  </span>
                </div>
              </button>
            </div>

            {/* GRÁFICA DE BARRAS POR DÍA (Azul Añil #1B4B73) */}
            <div className="pt-2">
              <div className="flex items-end justify-between gap-1 sm:gap-1.5 h-24 sm:h-28 px-0.5 border-b border-slate-200/90 dark:border-slate-800 pb-1">
                {daysRecibidos.map((d) => {
                  const count = statsRecibidos.map[d.key] || 0;
                  const pct = maxRecibidos > 0 ? (count / maxRecibidos) * 100 : 0;
                  const isSelectedDay = customFechaDesde === d.key;

                  return (
                    <div
                      key={d.key}
                      onClick={() => {
                        if (isSelectedDay) {
                          onResetFilter();
                        } else {
                          onFilterPeriodo("personalizado", d.key);
                          onFilterEstado("todos");
                        }
                      }}
                      className="group relative flex flex-col items-center justify-end h-full flex-1 cursor-pointer"
                      title={`${d.fullDateFormatted}: ${count} órdenes recibidas`}
                    >
                      {/* Tooltip flotante en hover */}
                      <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none z-30 scale-90 group-hover:scale-100 origin-bottom">
                        <div className="bg-[#1B4B73] text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md whitespace-nowrap">
                          {d.fullDateFormatted}: <span className="text-[#F0B900]">{count}</span>
                        </div>
                      </div>

                      {/* Contador numérico arriba de la barra */}
                      <span
                        className={`text-[10px] font-bold mb-1 transition-all ${
                          count > 0
                            ? "text-[#1B4B73] dark:text-sky-300 font-black"
                            : "text-slate-400 dark:text-slate-500"
                        } ${isSelectedDay ? "text-[#1B4B73] font-black scale-110" : ""}`}
                      >
                        {count}
                      </span>

                      {/* Barra Azul Añil #1B4B73 */}
                      <div
                        className={`w-full max-w-[24px] sm:max-w-[32px] rounded-t-sm sm:rounded-t-md transition-all duration-300 ${
                          isSelectedDay
                            ? "bg-[#1B4B73] dark:bg-sky-400 shadow-sm ring-2 ring-[#1B4B73]/40"
                            : count > 0
                              ? "bg-[#1B4B73] dark:bg-sky-500 group-hover:bg-[#143a59] dark:group-hover:bg-sky-400"
                              : "bg-slate-200 dark:bg-slate-800/80 group-hover:bg-slate-300"
                        }`}
                        style={{
                          height: `${count > 0 ? Math.max(12, Math.round(pct)) : 4}%`,
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Días en el eje X */}
              <div className="flex justify-between gap-1 sm:gap-1.5 px-0.5 pt-1.5">
                {daysRecibidos.map((d) => {
                  const isSelectedDay = customFechaDesde === d.key;
                  return (
                    <button
                      key={d.key}
                      onClick={() => {
                        if (isSelectedDay) {
                          onResetFilter();
                        } else {
                          onFilterPeriodo("personalizado", d.key);
                        }
                      }}
                      className="flex-1 text-center flex flex-col items-center cursor-pointer transition-colors"
                      title={d.fullDateFormatted}
                    >
                      {timeframeRecibidos !== "30d" && (
                        <span
                          className={`text-[9px] uppercase tracking-tighter truncate w-full ${
                            isSelectedDay || d.isToday
                              ? "text-[#1B4B73] dark:text-sky-300 font-black"
                              : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          {d.dayName}
                        </span>
                      )}
                      <span
                        className={`text-[10px] sm:text-[11px] leading-tight px-1.5 py-0.5 rounded-md transition-all ${
                          isSelectedDay
                            ? "bg-[#1B4B73] text-white font-black shadow-xs ring-2 ring-[#1B4B73]/30"
                            : d.isToday
                              ? "bg-[#1B4B73] text-white font-black shadow-2xs"
                              : "text-slate-600 dark:text-slate-400 font-bold hover:text-slate-800"
                        }`}
                      >
                        {d.dayNum}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Leyenda interactiva debajo de los días */}
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 select-none">
                <Sparkles className="h-3 w-3 text-slate-400 dark:text-slate-500 shrink-0" />
                <span>Clic en cualquier día o estado para filtrar</span>
              </div>
            </div>
          </div>

          {/* ========================================================
              TARJETA 2: ÓRDENES ENTREGADAS POR DÍA (Amarillo Jabón #F0B900)
             ======================================================== */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 sm:p-5 shadow-xs transition-all hover:shadow-sm">
            {/* Cabecera */}
            <div className="flex items-start justify-between gap-3 mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#F0B900]/25 dark:bg-[#F0B900]/20 text-[#1B4B73] dark:text-amber-300 border border-[#F0B900]/40 flex items-center justify-center shrink-0 shadow-2xs">
                  <Truck className="h-4.5 w-4.5 stroke-[2.4]" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-[#1B4B73] dark:text-amber-300 leading-tight">
                    Órdenes entregadas por día
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {timeframeEntregados === "7d"
                      ? "Semana (últimos 7 días)"
                      : timeframeEntregados === "10d"
                        ? "Últimos 10 días"
                        : "Quincena (últimos 15 días)"}
                  </p>
                </div>
              </div>

              {/* Selector de Rango */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/70 dark:border-slate-700/60 shrink-0">
                {(["7d", "10d", "15d"] as TimeframeOption[]).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframeEntregados(tf)}
                    className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                      timeframeEntregados === tf
                        ? "bg-[#F0B900] text-[#1B4B73] shadow-2xs font-black"
                        : "text-slate-500 dark:text-slate-400 hover:text-[#1B4B73] dark:hover:text-slate-200"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* VISTAZOS POR ESOS TIEMPOS (HOY, Ayer, Esta semana) */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {/* HOY */}
              <button
                onClick={() => {
                  if (periodoCreacion === "hoy" && filtroEstado === "ENTREGADA") {
                    onResetFilter();
                  } else {
                    onFilterPeriodo("hoy");
                    onFilterEstado("ENTREGADA");
                  }
                }}
                className={`flex flex-col items-start p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer active:scale-98 ${
                  periodoCreacion === "hoy" && filtroEstado === "ENTREGADA"
                    ? "bg-[#F0B900] text-[#1B4B73] border-[#F0B900] shadow-xs ring-2 ring-[#F0B900]/40 font-black"
                    : "bg-[#F0B900]/15 dark:bg-[#F0B900]/20 border-[#F0B900]/35 dark:border-[#F0B900]/40 hover:border-[#F0B900] hover:bg-[#F0B900]/25"
                }`}
                title="Filtrar por órdenes entregadas HOY"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#1B4B73] dark:text-amber-300">
                    HOY
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F0B900] border border-[#1B4B73]/30" />
                </div>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="text-base sm:text-lg font-black leading-tight text-[#1B4B73] dark:text-amber-200">
                    {statsEntregados.hoy}
                  </span>
                  <span className="text-[10px] font-bold text-[#1B4B73]/80 dark:text-amber-300/80">
                    Entregadas
                  </span>
                </div>
              </button>

              {/* AYER */}
              <button
                onClick={() => {
                  if (periodoCreacion === "ayer" && filtroEstado === "ENTREGADA") {
                    onResetFilter();
                  } else {
                    onFilterPeriodo("ayer");
                    onFilterEstado("ENTREGADA");
                  }
                }}
                className={`flex flex-col items-start p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer active:scale-98 ${
                  periodoCreacion === "ayer" && filtroEstado === "ENTREGADA"
                    ? "bg-[#1B4B73] text-white border-[#1B4B73] shadow-xs ring-2 ring-[#1B4B73]/30"
                    : "bg-slate-50/90 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 hover:bg-slate-100/70"
                }`}
                title="Filtrar por órdenes entregadas AYER"
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider ${
                      periodoCreacion === "ayer" && filtroEstado === "ENTREGADA"
                        ? "text-slate-200"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Ayer
                  </span>
                </div>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span
                    className={`text-base sm:text-lg font-black leading-tight ${
                      periodoCreacion === "ayer" && filtroEstado === "ENTREGADA"
                        ? "text-white"
                        : "text-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {statsEntregados.ayer}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${
                      periodoCreacion === "ayer" && filtroEstado === "ENTREGADA"
                        ? "text-slate-300"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    Entregadas
                  </span>
                </div>
              </button>

              {/* ESTA SEMANA */}
              <button
                onClick={() => {
                  if (periodoCreacion === "esta_semana" && filtroEstado === "ENTREGADA") {
                    onResetFilter();
                  } else {
                    onFilterPeriodo("esta_semana");
                    onFilterEstado("ENTREGADA");
                  }
                }}
                className={`flex flex-col items-start p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer active:scale-98 ${
                  periodoCreacion === "esta_semana" && filtroEstado === "ENTREGADA"
                    ? "bg-[#1B4B73] text-white border-[#1B4B73] shadow-xs ring-2 ring-[#1B4B73]/30"
                    : "bg-slate-50/90 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 hover:bg-slate-100/70"
                }`}
                title="Filtrar por órdenes entregadas ESTA SEMANA"
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider ${
                      periodoCreacion === "esta_semana" && filtroEstado === "ENTREGADA"
                        ? "text-slate-200"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Esta semana
                  </span>
                </div>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span
                    className={`text-base sm:text-lg font-black leading-tight ${
                      periodoCreacion === "esta_semana" && filtroEstado === "ENTREGADA"
                        ? "text-white"
                        : "text-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {statsEntregados.estaSemana}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${
                      periodoCreacion === "esta_semana" && filtroEstado === "ENTREGADA"
                        ? "text-slate-300"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    Total
                  </span>
                </div>
              </button>
            </div>

            {/* GRÁFICA DE BARRAS POR DÍA (Amarillo Jabón #F0B900) */}
            <div className="pt-2">
              <div className="flex items-end justify-between gap-1 sm:gap-1.5 h-24 sm:h-28 px-0.5 border-b border-slate-200/90 dark:border-slate-800 pb-1">
                {daysEntregados.map((d) => {
                  const count = statsEntregados.map[d.key] || 0;
                  const pct = maxEntregados > 0 ? (count / maxEntregados) * 100 : 0;
                  const isSelectedDay = customFechaDesde === d.key && filtroEstado === "ENTREGADA";

                  return (
                    <div
                      key={d.key}
                      onClick={() => {
                        if (isSelectedDay) {
                          onResetFilter();
                        } else {
                          onFilterPeriodo("personalizado", d.key);
                          onFilterEstado("ENTREGADA");
                        }
                      }}
                      className="group relative flex flex-col items-center justify-end h-full flex-1 cursor-pointer"
                      title={`${d.fullDateFormatted}: ${count} órdenes entregadas`}
                    >
                      {/* Tooltip flotante en hover */}
                      <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none z-30 scale-90 group-hover:scale-100 origin-bottom">
                        <div className="bg-[#1B4B73] text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md whitespace-nowrap border border-[#F0B900]/40">
                          {d.fullDateFormatted}: <span className="text-[#F0B900]">{count}</span>
                        </div>
                      </div>

                      {/* Contador numérico arriba de la barra */}
                      <span
                        className={`text-[10px] font-bold mb-1 transition-all ${
                          count > 0
                            ? "text-[#a37c00] dark:text-amber-300 font-black"
                            : "text-slate-400 dark:text-slate-500"
                        } ${isSelectedDay ? "text-[#1B4B73] font-black scale-110" : ""}`}
                      >
                        {count}
                      </span>

                      {/* Barra Amarillo Jabón #F0B900 */}
                      <div
                        className={`w-full max-w-[24px] sm:max-w-[32px] rounded-t-sm sm:rounded-t-md transition-all duration-300 ${
                          isSelectedDay
                            ? "bg-[#F0B900] dark:bg-amber-400 shadow-sm ring-2 ring-[#F0B900]/50"
                            : count > 0
                              ? "bg-[#F0B900] dark:bg-amber-400 group-hover:bg-[#d9a700] dark:group-hover:bg-amber-300 shadow-2xs"
                              : "bg-slate-200 dark:bg-slate-800/80 group-hover:bg-slate-300"
                        }`}
                        style={{
                          height: `${count > 0 ? Math.max(12, Math.round(pct)) : 4}%`,
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Días en el eje X */}
              <div className="flex justify-between gap-1 sm:gap-1.5 px-0.5 pt-1.5">
                {daysEntregados.map((d) => {
                  const isSelectedDay = customFechaDesde === d.key && filtroEstado === "ENTREGADA";
                  return (
                    <button
                      key={d.key}
                      onClick={() => {
                        if (isSelectedDay) {
                          onResetFilter();
                        } else {
                          onFilterPeriodo("personalizado", d.key);
                          onFilterEstado("ENTREGADA");
                        }
                      }}
                      className="flex-1 text-center flex flex-col items-center cursor-pointer transition-colors"
                      title={d.fullDateFormatted}
                    >
                      {timeframeEntregados !== "30d" && (
                        <span
                          className={`text-[9px] uppercase tracking-tighter truncate w-full ${
                            isSelectedDay || d.isToday
                              ? "text-[#1B4B73] dark:text-amber-300 font-black"
                              : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          {d.dayName}
                        </span>
                      )}
                      <span
                        className={`text-[10px] sm:text-[11px] leading-tight px-1.5 py-0.5 rounded-md transition-all ${
                          isSelectedDay
                            ? "bg-[#1B4B73] text-white font-black shadow-xs ring-2 ring-[#F0B900]"
                            : d.isToday
                              ? "bg-[#1B4B73] text-white font-black shadow-2xs"
                              : "text-slate-600 dark:text-slate-400 font-bold hover:text-slate-800"
                        }`}
                      >
                        {d.dayNum}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Leyenda interactiva debajo de los días */}
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 select-none">
                <Sparkles className="h-3 w-3 text-[#b88c00] dark:text-amber-400 shrink-0" />
                <span>Clic en cualquier día o estado para filtrar</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
