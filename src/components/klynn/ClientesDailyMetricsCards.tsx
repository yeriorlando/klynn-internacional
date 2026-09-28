import { useState, useMemo } from "react";
import {
  Users,
  UserPlus,
  BarChart3,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import type { Cliente, Orden } from "@/lib/storage";

export type PeriodoCliente = "todos" | "hoy" | "ayer" | "esta_semana" | "custom";
export type TipoMetricaCliente = "todos" | "nuevos" | "visitas";

export interface ClientesDailyMetricsCardsProps {
  clientes: Cliente[];
  ordenes: Orden[];
  periodoCliente: PeriodoCliente;
  tipoMetrica: TipoMetricaCliente;
  customFechaCliente?: string;
  onFilterPeriodo: (tipo: TipoMetricaCliente, periodo: PeriodoCliente, customDate?: string) => void;
  onResetFilter: () => void;
}

type TimeframeOption = "7d" | "10d" | "15d";

export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(dateStr?: string): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return toLocalDateKey(d);
}

export function isTodayKey(dateKey: string): boolean {
  return dateKey === toLocalDateKey(new Date());
}

export function isYesterdayKey(dateKey: string): boolean {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return dateKey === toLocalDateKey(y);
}

export function isThisWeekKey(d: Date): boolean {
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

export function ClientesDailyMetricsCards({
  clientes,
  ordenes,
  periodoCliente,
  tipoMetrica,
  customFechaCliente,
  onFilterPeriodo,
  onResetFilter,
}: ClientesDailyMetricsCardsProps) {
  // Timeframe para las barras de cada tarjeta: POR DEFECTO 7 DÍAS
  const [timeframeNuevos, setTimeframeNuevos] = useState<TimeframeOption>("7d");
  const [timeframeVisitas, setTimeframeVisitas] = useState<TimeframeOption>("7d");

  const STORAGE_KEY = "klynn_clientes_daily_metrics_collapsed";

  // Persistencia en localStorage (por defecto abierto)
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
        console.error("Error saving clientes metrics collapsed state", e);
      }
      return next;
    });
  };

  // Generador de días según timeframe: 7d, 10d o 15d
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

  const daysNuevos = useMemo(() => generateDays(timeframeNuevos), [timeframeNuevos]);
  const daysVisitas = useMemo(() => generateDays(timeframeVisitas), [timeframeVisitas]);

  // Mapa de Clientes Nuevos Registrados por día
  const statsNuevos = useMemo(() => {
    const map: Record<string, number> = {};
    let hoy = 0;
    let ayer = 0;
    let estaSemana = 0;

    const todayKey = toLocalDateKey(new Date());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayKey = toLocalDateKey(yesterdayDate);

    for (const c of clientes) {
      if (!c.creado_en) continue;
      const k = parseDateKey(c.creado_en);
      if (!k) continue;

      map[k] = (map[k] || 0) + 1;

      if (k === todayKey) hoy++;
      if (k === yesterdayKey) ayer++;

      const d = new Date(c.creado_en);
      if (!isNaN(d.getTime()) && isThisWeekKey(d)) {
        estaSemana++;
      }
    }

    return { map, hoy, ayer, estaSemana };
  }, [clientes]);

  // Mapa de Visitas de Clientes (Clientes únicos con órdenes creadas por día)
  const statsVisitas = useMemo(() => {
    const dailyClientSets: Record<string, Set<string>> = {};
    const hoyClients = new Set<string>();
    const ayerClients = new Set<string>();
    const estaSemanaClients = new Set<string>();

    const todayKey = toLocalDateKey(new Date());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayKey = toLocalDateKey(yesterdayDate);

    for (const o of ordenes) {
      if (o.estado === "ANULADA") continue;
      if (!o.cliente_id) continue;
      const k = parseDateKey(o.creado_en);
      if (!k) continue;

      if (!dailyClientSets[k]) {
        dailyClientSets[k] = new Set<string>();
      }
      dailyClientSets[k].add(o.cliente_id);

      if (k === todayKey) {
        hoyClients.add(o.cliente_id);
      }
      if (k === yesterdayKey) {
        ayerClients.add(o.cliente_id);
      }

      const d = new Date(o.creado_en);
      if (!isNaN(d.getTime()) && isThisWeekKey(d)) {
        estaSemanaClients.add(o.cliente_id);
      }
    }

    const map: Record<string, number> = {};
    for (const [k, set] of Object.entries(dailyClientSets)) {
      map[k] = set.size;
    }

    return {
      map,
      dailyClientSets,
      hoy: hoyClients.size,
      ayer: ayerClients.size,
      estaSemana: estaSemanaClients.size,
    };
  }, [ordenes]);

  // Máximos para escala visual de gráficos
  const maxNuevos = useMemo(() => {
    const counts = daysNuevos.map((d) => statsNuevos.map[d.key] || 0);
    return Math.max(...counts, 1);
  }, [daysNuevos, statsNuevos]);

  const maxVisitas = useMemo(() => {
    const counts = daysVisitas.map((d) => statsVisitas.map[d.key] || 0);
    return Math.max(...counts, 1);
  }, [daysVisitas, statsVisitas]);

  const hasActiveMetricFilter = tipoMetrica !== "todos";

  return (
    <div className="mb-4 font-display">
      {/* ========================================================
          BARRA / BOTÓN SUPERIOR DESTACADO: ACTIVIDAD Y VISITAS DE CLIENTES
          Mismo diseño exacto que /ordenes (Azul Añil #1B4B73 & Amarillo Jabón #F0B900)
         ======================================================== */}
      <div className="mb-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 p-2.5 sm:px-4 sm:py-2.5 shadow-xs transition-all hover:border-[#1B4B73]/40 hover:shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Lado izquierdo: Identificador y resumen rápido */}
          <div
            onClick={toggleCollapsed}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
            title={isCollapsed ? "Clic para ver las gráficas" : "Clic para ocultar las gráficas"}
          >
            <div className="h-8 w-8 rounded-xl bg-[#1B4B73] text-[#F0B900] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <BarChart3 className="h-4 w-4 stroke-[2.5]" />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-xs sm:text-sm text-[#1B4B73] dark:text-sky-200 tracking-tight uppercase">
                Actividad y visitas de clientes
              </span>

              {/* Badges de vistazos rápidos visibles siempre para dar contexto */}
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-[#1B4B73]/10 text-[#1B4B73] dark:bg-[#1B4B73]/30 dark:text-sky-300 border border-[#1B4B73]/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1B4B73]" />
                  Hoy: <strong>{statsNuevos.hoy}</strong> Registrados
                </span>

                <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-[#F0B900]/20 text-[#1B4B73] dark:bg-[#F0B900]/20 dark:text-amber-300 border border-[#F0B900]/40">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F0B900]" />
                  Hoy: <strong>{statsVisitas.hoy}</strong> Visitas
                </span>
              </div>
            </div>
          </div>

          {/* Lado derecho: Botón claro e inequívoco para MOSTRAR / OCULTAR */}
          <div className="flex items-center gap-2">
            {hasActiveMetricFilter && (
              <button
                onClick={onResetFilter}
                className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/60 px-2.5 py-1 rounded-xl transition-all cursor-pointer shadow-2xs"
                title="Quitar filtros y mostrar todos los clientes"
              >
                <span>Filtro activo</span>
                <X className="h-3 w-3 stroke-[2.5]" />
              </button>
            )}

            <button
              onClick={toggleCollapsed}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs active:scale-95 ${
                isCollapsed
                  ? "bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73]"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#1B4B73] dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              }`}
            >
              {isCollapsed ? (
                <>
                  <Eye className="h-3.5 w-3.5 text-[#F0B900]" />
                  <span>Mostrar gráficas</span>
                  <ChevronDown className="h-3.5 w-3.5 text-[#F0B900]" />
                </>
              ) : (
                <>
                  <EyeOff className="h-3.5 w-3.5 text-slate-500" />
                  <span>Ocultar</span>
                  <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* CONTENIDO EXPANDIBLE: 2 TARJETAS EJECUTIVAS */}
      {!isCollapsed && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ======================================================== */}
          {/* TARJETA 1: NUEVOS CLIENTES REGISTRADOS (Azul Añil #1B4B73) */}
          {/* ======================================================== */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 sm:p-5 shadow-xs transition-all hover:shadow-sm">
            {/* Cabecera */}
            <div className="flex items-start justify-between gap-3 mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-[#1B4B73]/10 text-[#1B4B73] flex items-center justify-center shrink-0 border border-[#1B4B73]/20">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-[#1B4B73] dark:text-sky-300 leading-tight">
                    Nuevos clientes registrados
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {timeframeNuevos === "7d"
                      ? "Semana (últimos 7 días)"
                      : timeframeNuevos === "10d"
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
                    onClick={() => setTimeframeNuevos(tf)}
                    className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                      timeframeNuevos === tf
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
                  if (tipoMetrica === "nuevos" && periodoCliente === "hoy") {
                    onResetFilter();
                  } else {
                    onFilterPeriodo("nuevos", "hoy");
                  }
                }}
                className={`flex flex-col items-start p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer active:scale-98 ${
                  tipoMetrica === "nuevos" && periodoCliente === "hoy"
                    ? "bg-[#1B4B73] text-white border-[#1B4B73] shadow-xs ring-2 ring-[#1B4B73]/30"
                    : "bg-[#1B4B73]/5 dark:bg-[#1B4B73]/20 border-[#1B4B73]/20 dark:border-[#1B4B73]/40 hover:border-[#1B4B73]/60 hover:bg-[#1B4B73]/10"
                }`}
                title="Filtrar por clientes registrados HOY"
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider ${
                      tipoMetrica === "nuevos" && periodoCliente === "hoy"
                        ? "text-sky-200"
                        : "text-[#1B4B73] dark:text-sky-300"
                    }`}
                  >
                    HOY
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1B4B73]" />
                </div>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span
                    className={`text-base sm:text-lg font-black leading-tight ${
                      tipoMetrica === "nuevos" && periodoCliente === "hoy"
                        ? "text-white"
                        : "text-[#1B4B73] dark:text-sky-200"
                    }`}
                  >
                    {statsNuevos.hoy}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${
                      tipoMetrica === "nuevos" && periodoCliente === "hoy"
                        ? "text-slate-200"
                        : "text-[#1B4B73]/80 dark:text-sky-300/80"
                    }`}
                  >
                    Registrados
                  </span>
                </div>
              </button>

              {/* AYER */}
              <button
                onClick={() => {
                  if (tipoMetrica === "nuevos" && periodoCliente === "ayer") {
                    onResetFilter();
                  } else {
                    onFilterPeriodo("nuevos", "ayer");
                  }
                }}
                className={`flex flex-col items-start p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer active:scale-98 ${
                  tipoMetrica === "nuevos" && periodoCliente === "ayer"
                    ? "bg-[#1B4B73] text-white border-[#1B4B73] shadow-xs ring-2 ring-[#1B4B73]/30"
                    : "bg-slate-50/90 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 hover:bg-slate-100/70"
                }`}
                title="Filtrar por clientes registrados AYER"
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider ${
                      tipoMetrica === "nuevos" && periodoCliente === "ayer"
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
                      tipoMetrica === "nuevos" && periodoCliente === "ayer"
                        ? "text-white"
                        : "text-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {statsNuevos.ayer}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${
                      tipoMetrica === "nuevos" && periodoCliente === "ayer"
                        ? "text-slate-300"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    Registrados
                  </span>
                </div>
              </button>

              {/* ESTA SEMANA */}
              <button
                onClick={() => {
                  if (tipoMetrica === "nuevos" && periodoCliente === "esta_semana") {
                    onResetFilter();
                  } else {
                    onFilterPeriodo("nuevos", "esta_semana");
                  }
                }}
                className={`flex flex-col items-start p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer active:scale-98 ${
                  tipoMetrica === "nuevos" && periodoCliente === "esta_semana"
                    ? "bg-[#1B4B73] text-white border-[#1B4B73] shadow-xs ring-2 ring-[#1B4B73]/30"
                    : "bg-slate-50/90 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 hover:bg-slate-100/70"
                }`}
                title="Filtrar por clientes registrados ESTA SEMANA"
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider ${
                      tipoMetrica === "nuevos" && periodoCliente === "esta_semana"
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
                      tipoMetrica === "nuevos" && periodoCliente === "esta_semana"
                        ? "text-white"
                        : "text-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {statsNuevos.estaSemana}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${
                      tipoMetrica === "nuevos" && periodoCliente === "esta_semana"
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
                {daysNuevos.map((d) => {
                  const count = statsNuevos.map[d.key] || 0;
                  const pct = maxNuevos > 0 ? (count / maxNuevos) * 100 : 0;
                  const isSelectedDay = tipoMetrica === "nuevos" && customFechaCliente === d.key;

                  return (
                    <div
                      key={d.key}
                      onClick={() => {
                        if (isSelectedDay) {
                          onResetFilter();
                        } else {
                          onFilterPeriodo("nuevos", "custom", d.key);
                        }
                      }}
                      className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
                      title={`${d.fullDateFormatted}: ${count} nuevos clientes registrados`}
                    >
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
                {daysNuevos.map((d) => {
                  const isSelectedDay = tipoMetrica === "nuevos" && customFechaCliente === d.key;
                  return (
                    <button
                      key={d.key}
                      onClick={() => {
                        if (isSelectedDay) {
                          onResetFilter();
                        } else {
                          onFilterPeriodo("nuevos", "custom", d.key);
                        }
                      }}
                      className="flex-1 text-center flex flex-col items-center cursor-pointer transition-colors"
                      title={d.fullDateFormatted}
                    >
                      <span
                        className={`text-[9px] uppercase tracking-tighter truncate w-full ${
                          isSelectedDay || d.isToday
                            ? "text-[#1B4B73] dark:text-sky-300 font-black"
                            : "text-slate-400 dark:text-slate-500"
                        }`}
                      >
                        {d.dayName}
                      </span>
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

          {/* ======================================================== */}
          {/* TARJETA 2: VISITAS DE CLIENTES (Amarillo Jabón #F0B900)  */}
          {/* ======================================================== */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 sm:p-5 shadow-xs transition-all hover:shadow-sm">
            {/* Cabecera */}
            <div className="flex items-start justify-between gap-3 mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-[#F0B900]/15 text-[#9E7300] flex items-center justify-center shrink-0 border border-[#F0B900]/30">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-800 dark:text-slate-100 leading-tight">
                    Visitas / Clientes atendidos
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {timeframeVisitas === "7d"
                      ? "Semana (últimos 7 días)"
                      : timeframeVisitas === "10d"
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
                    onClick={() => setTimeframeVisitas(tf)}
                    className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                      timeframeVisitas === tf
                        ? "bg-[#F0B900] text-slate-950 shadow-2xs font-black"
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
                  if (tipoMetrica === "visitas" && periodoCliente === "hoy") {
                    onResetFilter();
                  } else {
                    onFilterPeriodo("visitas", "hoy");
                  }
                }}
                className={`flex flex-col items-start p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer active:scale-98 ${
                  tipoMetrica === "visitas" && periodoCliente === "hoy"
                    ? "bg-[#1B4B73] text-white border-[#1B4B73] shadow-xs ring-2 ring-[#1B4B73]/30"
                    : "bg-[#F0B900]/10 dark:bg-[#F0B900]/20 border-[#F0B900]/30 dark:border-[#F0B900]/40 hover:border-[#F0B900]/60 hover:bg-[#F0B900]/20"
                }`}
                title="Filtrar por clientes atendidos HOY"
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider ${
                      tipoMetrica === "visitas" && periodoCliente === "hoy"
                        ? "text-slate-200"
                        : "text-[#1B4B73] dark:text-amber-300"
                    }`}
                  >
                    HOY
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F0B900] border border-[#1B4B73]/30" />
                </div>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span
                    className={`text-base sm:text-lg font-black leading-tight ${
                      tipoMetrica === "visitas" && periodoCliente === "hoy"
                        ? "text-white"
                        : "text-[#1B4B73] dark:text-amber-200"
                    }`}
                  >
                    {statsVisitas.hoy}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${
                      tipoMetrica === "visitas" && periodoCliente === "hoy"
                        ? "text-slate-200"
                        : "text-[#1B4B73]/80 dark:text-amber-300/80"
                    }`}
                  >
                    Visitas
                  </span>
                </div>
              </button>

              {/* AYER */}
              <button
                onClick={() => {
                  if (tipoMetrica === "visitas" && periodoCliente === "ayer") {
                    onResetFilter();
                  } else {
                    onFilterPeriodo("visitas", "ayer");
                  }
                }}
                className={`flex flex-col items-start p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer active:scale-98 ${
                  tipoMetrica === "visitas" && periodoCliente === "ayer"
                    ? "bg-[#1B4B73] text-white border-[#1B4B73] shadow-xs ring-2 ring-[#1B4B73]/30"
                    : "bg-slate-50/90 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 hover:bg-slate-100/70"
                }`}
                title="Filtrar por clientes atendidos AYER"
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider ${
                      tipoMetrica === "visitas" && periodoCliente === "ayer"
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
                      tipoMetrica === "visitas" && periodoCliente === "ayer"
                        ? "text-white"
                        : "text-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {statsVisitas.ayer}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${
                      tipoMetrica === "visitas" && periodoCliente === "ayer"
                        ? "text-slate-300"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    Visitas
                  </span>
                </div>
              </button>

              {/* ESTA SEMANA */}
              <button
                onClick={() => {
                  if (tipoMetrica === "visitas" && periodoCliente === "esta_semana") {
                    onResetFilter();
                  } else {
                    onFilterPeriodo("visitas", "esta_semana");
                  }
                }}
                className={`flex flex-col items-start p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer active:scale-98 ${
                  tipoMetrica === "visitas" && periodoCliente === "esta_semana"
                    ? "bg-[#1B4B73] text-white border-[#1B4B73] shadow-xs ring-2 ring-[#1B4B73]/30"
                    : "bg-slate-50/90 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 hover:bg-slate-100/70"
                }`}
                title="Filtrar por clientes atendidos ESTA SEMANA"
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider ${
                      tipoMetrica === "visitas" && periodoCliente === "esta_semana"
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
                      tipoMetrica === "visitas" && periodoCliente === "esta_semana"
                        ? "text-white"
                        : "text-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {statsVisitas.estaSemana}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${
                      tipoMetrica === "visitas" && periodoCliente === "esta_semana"
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
                {daysVisitas.map((d) => {
                  const count = statsVisitas.map[d.key] || 0;
                  const pct = maxVisitas > 0 ? (count / maxVisitas) * 100 : 0;
                  const isSelectedDay = tipoMetrica === "visitas" && customFechaCliente === d.key;

                  return (
                    <div
                      key={d.key}
                      onClick={() => {
                        if (isSelectedDay) {
                          onResetFilter();
                        } else {
                          onFilterPeriodo("visitas", "custom", d.key);
                        }
                      }}
                      className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
                      title={`${d.fullDateFormatted}: ${count} clientes atendidos`}
                    >
                      {/* Contador numérico arriba de la barra */}
                      <span
                        className={`text-[10px] font-bold mb-1 transition-all ${
                          count > 0
                            ? "text-[#1B4B73] dark:text-[#F0B900] font-black"
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
                {daysVisitas.map((d) => {
                  const isSelectedDay = tipoMetrica === "visitas" && customFechaCliente === d.key;
                  return (
                    <button
                      key={d.key}
                      onClick={() => {
                        if (isSelectedDay) {
                          onResetFilter();
                        } else {
                          onFilterPeriodo("visitas", "custom", d.key);
                        }
                      }}
                      className="flex-1 text-center flex flex-col items-center cursor-pointer transition-colors"
                      title={d.fullDateFormatted}
                    >
                      <span
                        className={`text-[9px] uppercase tracking-tighter truncate w-full ${
                          isSelectedDay || d.isToday
                            ? "text-[#1B4B73] dark:text-amber-300 font-black"
                            : "text-slate-400 dark:text-slate-500"
                        }`}
                      >
                        {d.dayName}
                      </span>
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
