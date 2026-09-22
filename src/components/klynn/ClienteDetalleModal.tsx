import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Calendar,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  Receipt,
  Scale,
  Search,
  Shirt,
  Sparkles,
  Tag,
  User,
  WalletCards,
  X as XIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildClienteAnalytics,
  getPeriodoLabel,
  matchesPeriodo,
  normalizeText,
  type PeriodoFecha,
} from "@/lib/cliente-analytics";
import {
  formatDateRD,
  formatDateTimeRD,
  formatPhoneRD,
  formatRD,
  type Cliente,
  type EstadoOrden,
  type Orden,
} from "@/lib/storage";

interface ClienteDetalleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: Cliente | null;
  ordenes: Orden[];
  onEdit: (cliente: Cliente) => void;
}

const STATUS_LABELS: Record<EstadoOrden, string> = {
  RECIBIDA: "Recibida",
  EN_PROCESO: "En proceso",
  LISTA: "Lista",
  EN_CAMINO: "En camino",
  ENTREGADA: "Entregada",
  PAGADA: "Pagada",
  ANULADA: "Anulada",
  INCIDENCIA: "Incidencia",
};

const STATUS_STYLES: Record<EstadoOrden, string> = {
  RECIBIDA: "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300",
  EN_PROCESO: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  LISTA: "border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300",
  EN_CAMINO: "border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300",
  ENTREGADA: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  PAGADA: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  ANULADA: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
  INCIDENCIA: "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/60 dark:text-orange-300",
};

function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-DO", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatWeight(value: number): string {
  return new Intl.NumberFormat("es-DO", { maximumFractionDigits: 2 }).format(value);
}


function getAdaptiveValueClass(val: string): string {
  const len = val.length;
  // Para montos muy grandes (>= 16 caracteres, ej: "RD$12,450,890.00")
  if (len >= 16) return "text-xs sm:text-[13px] font-black leading-tight";
  // Para montos de 6 o 7 cifras (>= 13 caracteres, ej: "RD$999,999.00" o "RD$1,250,000.00")
  if (len >= 13) return "text-xs sm:text-sm font-black leading-tight";
  // Para montos de 5 cifras (>= 10 caracteres, ej: "RD$10,879.67")
  if (len >= 10) return "text-sm sm:text-base font-black leading-tight";
  // Para cantidades cortas o unidades normales
  return "text-base sm:text-xl font-black leading-tight";
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  accent = "blue",
}: {
  icon: typeof Receipt;
  label: string;
  value: string;
  detail?: string;
  accent?: "blue" | "gold" | "emerald" | "rose";
}) {
  const accentClasses = {
    blue: "bg-[#1B4B73]/10 text-[#1B4B73] border-[#1B4B73]/25 dark:bg-[#1B4B73]/25 dark:text-sky-300",
    gold: "bg-[#F0B900]/15 text-[#9E7300] border-[#F0B900]/30 dark:bg-[#F0B900]/25 dark:text-[#F0B900]",
    emerald: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-300 dark:bg-emerald-950/50",
    rose: "bg-rose-500/10 text-rose-700 border-rose-500/25 dark:text-rose-300 dark:bg-rose-950/50",
  }[accent];

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-surface p-2.5 sm:p-3 shadow-2xs transition-all hover:border-primary/30 min-w-0 overflow-hidden h-full">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border ${accentClasses}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground truncate" title={label}>
          {label}
        </span>
      </div>
      <div
        className={`mt-2 font-display tracking-tight text-foreground truncate ${getAdaptiveValueClass(value)}`}
        title={value}
      >
        {value}
      </div>
      {detail && (
        <div className="mt-0.5 truncate text-[10px] sm:text-[10.5px] font-medium text-muted-foreground" title={detail}>
          {detail}
        </div>
      )}
    </div>
  );
}

function RankingList({
  title,
  rows,
  empty,
  isLibraMode = false,
}: {
  title: string;
  rows: ReturnType<typeof buildClienteAnalytics>["servicios"];
  empty: string;
  isLibraMode?: boolean;
}) {
  const maxAmount = Math.max(...rows.map((row) => row.monto), 1);

  return (
    <section className="rounded-2xl border border-border/80 bg-surface p-4 shadow-2xs">
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <h3 className="font-display text-xs sm:text-sm font-black text-foreground flex items-center gap-1.5">
          {title}
        </h3>
        <span className="text-[10px] font-bold text-muted-foreground">{rows.length} registrados</span>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">{empty}</p>
      ) : (
        <div className="mt-3 space-y-2.5 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
          {rows.map((row) => (
            <div key={row.key} className="p-2 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-border/40">
              <div className="flex items-start justify-between gap-2 text-xs">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-foreground" title={row.nombre}>{row.nombre}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {row.ordenes} {row.ordenes === 1 ? "orden" : "órdenes"}
                    </span>
                    {row.piezas > 0 && <span>· {formatWeight(row.piezas)} prendas</span>}
                    {row.libras > 0 && <span className="font-bold text-emerald-600 dark:text-emerald-400">· {formatWeight(row.libras)} lb</span>}
                  </div>
                </div>
                <span className="shrink-0 font-display font-black text-foreground">{formatRD(row.monto)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-[#1B4B73] transition-all duration-300"
                  style={{ width: `${Math.max(5, (row.monto / maxAmount) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function ClienteDetalleModal({
  open,
  onOpenChange,
  cliente,
  ordenes,
  onEdit,
}: ClienteDetalleModalProps) {
  const [tab, setTab] = useState("resumen");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [service, setService] = useState("all");
  const [periodo, setPeriodo] = useState<PeriodoFecha>("todas");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const analytics = useMemo(
    () => buildClienteAnalytics(ordenes, cliente?.id || ""),
    [cliente?.id, ordenes],
  );

  useEffect(() => {
    if (!open) return;
    setTab("resumen");
    setQuery("");
    setStatus("all");
    setService("all");
    setPeriodo("todas");
    setFromDate("");
    setToDate("");
    setExpandedOrderId(null);
  }, [cliente?.id, open]);

  const serviceOptions = useMemo(
    () => [...new Set(analytics.ordenes.flatMap((order) => order.servicios || []))].sort((a, b) => a.localeCompare(b, "es")),
    [analytics.ordenes],
  );

  const filteredOrders = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    return analytics.ordenes.filter((order) => {
      const matchesQuery = !normalizedQuery || normalizeText([
        order.numero,
        ...(order.servicios || []),
        ...(order.items || []).map((item) => item.descripcion),
      ].join(" ")).includes(normalizedQuery);
      const matchesStatus = status === "all" || order.estado === status;
      const matchesService = service === "all" || (order.servicios || []).some((name) => normalizeText(name) === normalizeText(service));
      const matchesDate = matchesPeriodo(order.creado_en, periodo, fromDate, toDate);
      return matchesQuery && matchesStatus && matchesService && matchesDate;
    });
  }, [analytics.ordenes, fromDate, periodo, query, service, status, toDate]);

  const hasActiveFilters = Boolean(
    query.trim() ||
    status !== "all" ||
    service !== "all" ||
    periodo !== "todas" ||
    fromDate ||
    toDate
  );

  const resetFilters = () => {
    setQuery("");
    setStatus("all");
    setService("all");
    setPeriodo("todas");
    setFromDate("");
    setToDate("");
  };

  if (!cliente) return null;

  const fullName = `${cliente.nombre} ${cliente.apellido || ""}`.trim();
  const rawPhone = cliente.telefono.replace(/\D/g, "");
  const hasLocation = Boolean(cliente.direccion || cliente.sector || cliente.lat || cliente.lng);
  const isEmpresa = cliente.tipo === "Empresa";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] sm:max-h-[88vh] rounded-3xl p-0 overflow-hidden border border-border/80 shadow-2xl bg-background text-foreground flex flex-col">
        {/* HEADER COMPACTO CON COLORES PRIMARIOS KLYNN (#1B4B73 y #F0B900) */}
        <div className="shrink-0 bg-slate-50 dark:bg-slate-900/90 border-b border-border/80 px-4 sm:px-6 py-3.5 pr-14 sm:pr-16 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Avatar con Azul Añil (#1B4B73) y bordes amarillos (#F0B900) */}
            <div className={`h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center border shadow-2xs ${
              isEmpresa
                ? "bg-[#1B4B73] text-[#F0B900] border-[#1B4B73]"
                : "bg-[#1B4B73]/10 text-[#1B4B73] border-[#1B4B73]/25 dark:bg-[#1B4B73]/30 dark:text-sky-300"
            }`}>
              {isEmpresa ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base sm:text-lg font-display font-black tracking-tight text-foreground truncate">
                  {fullName}
                </DialogTitle>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-2 py-0.5 font-bold border ${
                    isEmpresa
                      ? "border-[#1B4B73]/30 bg-[#1B4B73]/10 text-[#1B4B73] dark:text-sky-300"
                      : "border-[#F0B900]/40 bg-[#F0B900]/15 text-[#9E7300] dark:text-[#F0B900]"
                  }`}
                >
                  {cliente.tipo}
                </Badge>
                {cliente.sector && (
                  <Badge variant="outline" className="flex items-center gap-1 border-sky-300 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 text-[10px] font-bold text-sky-800 dark:text-sky-300">
                    <MapPin className="h-2.5 w-2.5 text-[#1B4B73] dark:text-sky-300" />
                    {cliente.sector}
                  </Badge>
                )}
                {cliente.cedula && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-[#1B4B73] text-white">
                    <FileText className="h-2.5 w-2.5 text-[#F0B900]" />
                    <span>RNC: {cliente.cedula}</span>
                  </span>
                )}
              </div>

              <DialogDescription className="mt-0.5 text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                <span>Tel: <strong>{formatPhoneRD(cliente.telefono) || cliente.telefono || "—"}</strong></span>
                {cliente.email && <span>· {cliente.email}</span>}
                {cliente.descuento_fijo ? (
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">· {cliente.descuento_fijo}% OFF Fijo</span>
                ) : null}
              </DialogDescription>
            </div>
          </div>

          {/* Acciones Rápidas del Encabezado (Desplazadas hacia el centro/izquierda, con margen al botón 'X') */}
          <div className="flex items-center gap-2 shrink-0 mr-1 sm:mr-3">
            {rawPhone && (
              <a
                href={`https://wa.me/${rawPhone.startsWith("1") ? rawPhone : `1${rawPhone}`}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 h-9 px-3 rounded-xl transition-all shadow-2xs cursor-pointer"
                title="Abrir chat de WhatsApp"
              >
                <MessageSquare className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>WhatsApp</span>
              </a>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEdit(cliente)}
              className="h-9 rounded-xl border-[#1B4B73]/30 text-[#1B4B73] dark:text-sky-300 hover:bg-[#1B4B73]/10 font-bold text-xs gap-1.5 px-3.5 cursor-pointer shadow-2xs"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Editar perfil</span>
            </Button>
          </div>
        </div>

        {/* 5 KPIs COMPACTOS EN UNA SOLA FRANJA */}
        <div className="shrink-0 bg-background px-4 sm:px-6 pt-3 pb-2 border-b border-border/60">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
            <MetricCard
              icon={Receipt}
              label="Órdenes"
              value={String(analytics.totalOrdenes)}
              detail={analytics.ordenes.length > analytics.totalOrdenes ? `${analytics.ordenes.length - analytics.totalOrdenes} anuladas` : "Historial total"}
              accent="blue"
            />
            <MetricCard
              icon={WalletCards}
              label="Facturado"
              value={formatRD(analytics.totalFacturado)}
              detail={`Cobrado: ${formatRD(analytics.totalPagado)}`}
              accent="gold"
            />
            <MetricCard
              icon={WalletCards}
              label="Saldo Pendiente"
              value={formatRD(analytics.totalSaldo)}
              detail={analytics.totalSaldo > 0 ? "Deuda por cobrar" : "Cuenta al día"}
              accent={analytics.totalSaldo > 0 ? "rose" : "emerald"}
            />
            <MetricCard
              icon={Scale}
              label="Libras Facturadas"
              value={`${formatWeight(analytics.totalLibras)} lb`}
              detail={analytics.promedioLibrasPorOrden > 0 ? `Prom: ${analytics.promedioLibrasPorOrden} lb/orden` : "Sin pesajes"}
              accent="emerald"
            />
            <MetricCard
              icon={Shirt}
              label="Prendas"
              value={formatWeight(analytics.totalPiezas)}
              detail="Piezas procesadas"
              accent="blue"
            />
          </div>
        </div>

        {/* TABS CON ESTILO KLYNN (#1B4B73 y #F0B900) CON MAYOR ALTURA E ÍCONOS */}
        <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1 min-h-0">
          <div className="shrink-0 px-4 sm:px-6 py-2.5 border-b border-border/60 bg-surface/50">
            <TabsList className="grid h-11 sm:h-12 w-full grid-cols-4 rounded-2xl bg-slate-200/70 dark:bg-slate-800/80 p-1.5 shadow-inner">
              <TabsTrigger
                value="resumen"
                className="rounded-xl text-xs sm:text-[13px] font-bold transition-all data-[state=active]:bg-[#1B4B73] data-[state=active]:text-white data-[state=active]:shadow-sm flex items-center justify-center gap-1.5 sm:gap-2 h-full cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#F0B900] shrink-0" />
                <span className="truncate">Resumen</span>
              </TabsTrigger>
              <TabsTrigger
                value="ordenes"
                className="rounded-xl text-xs sm:text-[13px] font-bold transition-all data-[state=active]:bg-[#1B4B73] data-[state=active]:text-white data-[state=active]:shadow-sm flex items-center justify-center gap-1.5 sm:gap-2 h-full cursor-pointer"
              >
                <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sky-400 shrink-0" />
                <span className="truncate">Órdenes ({analytics.ordenes.length})</span>
              </TabsTrigger>
              <TabsTrigger
                value="libras"
                className="rounded-xl text-xs sm:text-[13px] font-bold transition-all data-[state=active]:bg-[#1B4B73] data-[state=active]:text-white data-[state=active]:shadow-sm flex items-center justify-center gap-1.5 sm:gap-2 h-full cursor-pointer"
              >
                <Scale className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400 shrink-0" />
                <span className="truncate">Por Libras ({formatWeight(analytics.totalLibras)} lb)</span>
              </TabsTrigger>
              <TabsTrigger
                value="ubicacion"
                className="rounded-xl text-xs sm:text-[13px] font-bold transition-all data-[state=active]:bg-[#1B4B73] data-[state=active]:text-white data-[state=active]:shadow-sm flex items-center justify-center gap-1.5 sm:gap-2 h-full cursor-pointer"
              >
                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-400 shrink-0" />
                <span className="truncate">Ubicación & Contacto</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* CONTENIDO SCROLLEABLE DE CADA PESTAÑA */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-5">
            {/* PESTAÑA 1: RESUMEN ANALÍTICO */}
            <TabsContent value="resumen" className="m-0 space-y-4">
              <div className="grid gap-3.5 lg:grid-cols-2">
                <RankingList
                  title="Consumo por Servicios"
                  rows={analytics.servicios}
                  empty="Aún no hay consumo registrado por servicio."
                />
                <RankingList
                  title="Prendas y Cargas más Frecuentes"
                  rows={analytics.prendas}
                  empty="Aún no hay prendas procesadas."
                />
              </div>

              {/* Órdenes Recientes Rápidas con vista directa */}
              <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <h3 className="font-display text-xs sm:text-sm font-black text-foreground flex items-center gap-1.5">
                    <Clock3 className="h-4 w-4 text-[#1B4B73] dark:text-sky-300" />
                    <span>Últimas Órdenes Registradas</span>
                  </h3>
                  {analytics.ordenes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTab("ordenes")}
                      className="text-xs font-bold text-[#1B4B73] dark:text-sky-300 hover:underline cursor-pointer"
                    >
                      Ver todas las órdenes →
                    </button>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  {analytics.ordenes.slice(0, 3).map((order) => {
                    const isExpanded = expandedOrderId === order.id;
                    const pounds = (order.items || []).filter((it) => it.es_libra).reduce((s, it) => s + Number(it.cantidad || 0), 0);
                    const pieces = (order.items || []).filter((it) => !it.es_libra).reduce((s, it) => s + Number(it.cantidad || 0), 0);

                    return (
                      <div
                        key={order.id}
                        className="rounded-xl border border-border/70 bg-background p-3 hover:border-primary/40 transition-colors"
                      >
                        <div
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          className="flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-display font-black text-xs sm:text-sm text-foreground">
                                Orden #{order.numero}
                              </span>
                              <Badge variant="outline" className={`text-[9px] font-black px-1.5 py-0 ${STATUS_STYLES[order.estado]}`}>
                                {STATUS_LABELS[order.estado]}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">{formatDate(order.creado_en)}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                              <span>{(order.servicios || []).join(", ") || "Lavandería"}</span>
                              {pounds > 0 && <span className="font-bold text-emerald-600">· {formatWeight(pounds)} lb</span>}
                              {pieces > 0 && <span>· {formatWeight(pieces)} prendas</span>}
                            </div>
                          </div>

                          <div className="text-right flex items-center gap-2">
                            <div>
                              <div className="font-display font-black text-xs sm:text-sm text-foreground">{formatRD(order.total)}</div>
                              {order.saldo > 0 ? (
                                <div className="text-[10px] font-bold text-rose-600">Saldo: {formatRD(order.saldo)}</div>
                              ) : (
                                <div className="text-[10px] font-bold text-emerald-600">Saldada</div>
                              )}
                            </div>
                            <span className="p-1 text-muted-foreground">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </span>
                          </div>
                        </div>

                        {/* DESPLIEGUE INLINE DE PRENDAS DE LA ORDEN (SIN SALIR DE /clientes) */}
                        {isExpanded && (
                          <div className="mt-3 pt-2.5 border-t border-border/60 text-xs bg-muted/20 p-2.5 rounded-lg animate-in fade-in duration-150">
                            <div className="font-bold text-[10px] uppercase text-muted-foreground tracking-wider mb-1.5">
                              Desglose de prendas y servicios:
                            </div>
                            <div className="space-y-1">
                              {(order.items || []).map((it, idx) => (
                                <div key={idx} className="flex justify-between items-center text-[11px] py-0.5 border-b border-border/30 last:border-0">
                                  <span className="text-foreground">
                                    <strong>{it.cantidad} {it.es_libra ? 'lb' : 'ud'}</strong> — {it.descripcion}
                                    {it.servicio_origen && <span className="text-muted-foreground text-[10px]"> ({it.servicio_origen})</span>}
                                  </span>
                                  <span className="font-bold text-foreground">
                                    {formatRD(Number(it.cantidad || 0) * Number(it.precio_unitario || 0))}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {analytics.ordenes.length === 0 && (
                    <p className="py-6 text-center text-xs text-muted-foreground">Este cliente aún no registra órdenes.</p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* PESTAÑA 2: ÓRDENES CRONOLÓGICAS (CON EXPANSOR INLINE) */}
            <TabsContent value="ordenes" className="m-0 space-y-3.5">
              {/* Filtros de Búsqueda de Órdenes */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2 p-2.5 bg-surface rounded-2xl border border-border/80 shadow-2xs">
                  {/* Buscador */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar por # de orden, prenda o servicio..."
                      className="h-9 rounded-xl pl-8 pr-7 text-xs font-medium bg-background"
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Borrar búsqueda"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Selector de Período / Fecha (Radix UI) */}
                  <Select value={periodo} onValueChange={(v: PeriodoFecha) => setPeriodo(v)}>
                    <SelectTrigger className="h-9 w-full sm:w-[170px] rounded-xl text-xs font-bold shrink-0 bg-background border-border/70">
                      <Calendar className="h-3.5 w-3.5 text-[#1B4B73] dark:text-sky-400 shrink-0 mr-1.5" />
                      <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-lg border border-border/80">
                      <SelectItem value="todas" className="text-xs font-medium">Todas las fechas</SelectItem>
                      <SelectItem value="hoy" className="text-xs font-medium">Hoy</SelectItem>
                      <SelectItem value="esta_semana" className="text-xs font-medium">Esta semana</SelectItem>
                      <SelectItem value="este_mes" className="text-xs font-medium">Este mes</SelectItem>
                      <SelectItem value="ultimos_30" className="text-xs font-medium">Últimos 30 días</SelectItem>
                      <SelectItem value="ultimos_90" className="text-xs font-medium">Últimos 90 días</SelectItem>
                      <SelectItem value="personalizado" className="text-xs font-bold text-[#1B4B73] dark:text-sky-400">
                        📅 Rango personalizado...
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Selector de Estado (Radix UI) */}
                  <Select value={status} onValueChange={(v) => setStatus(v)}>
                    <SelectTrigger className="h-9 w-full sm:w-[155px] rounded-xl text-xs font-bold shrink-0 bg-background border-border/70">
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-lg border border-border/80">
                      <SelectItem value="all" className="text-xs font-medium">Todos los estados</SelectItem>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-xs font-medium">
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Selector de Servicio (Radix UI) */}
                  <Select value={service} onValueChange={(v) => setService(v)}>
                    <SelectTrigger className="h-9 w-full sm:w-[160px] rounded-xl text-xs font-bold shrink-0 bg-background border-border/70">
                      <SelectValue placeholder="Todos los servicios" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-lg border border-border/80 max-h-56">
                      <SelectItem value="all" className="text-xs font-medium">Todos los servicios</SelectItem>
                      {serviceOptions.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs font-medium">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sub-barra elegante para Rango Personalizado */}
                {periodo === "personalizado" && (
                  <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-xl bg-[#1B4B73]/5 dark:bg-[#1B4B73]/15 border border-[#1B4B73]/25 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#1B4B73] dark:text-sky-300">
                      <CalendarDays className="h-4 w-4 shrink-0 text-[#F0B900]" />
                      <span>Rango personalizado:</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-muted-foreground">Desde:</span>
                        <Input
                          type="date"
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                          className="h-8 w-36 rounded-lg text-xs bg-background border-border/80 px-2 font-medium"
                          title="Fecha inicial"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-muted-foreground">Hasta:</span>
                        <Input
                          type="date"
                          value={toDate}
                          onChange={(e) => setToDate(e.target.value)}
                          className="h-8 w-36 rounded-lg text-xs bg-background border-border/80 px-2 font-medium"
                          title="Fecha final"
                        />
                      </div>
                      {(fromDate || toDate) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => { setFromDate(""); setToDate(""); }}
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Limpiar fechas"
                        >
                          <XIcon className="h-3 w-3 mr-1" />
                          Limpiar fechas
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Contador y Limpieza de Filtros */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs px-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-muted-foreground">
                    {filteredOrders.length} {filteredOrders.length === 1 ? "orden encontrada" : "órdenes encontradas"}
                  </span>
                  {hasActiveFilters && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {periodo !== "todas" && (
                        <Badge
                          variant="outline"
                          className="gap-1 border-[#1B4B73]/30 bg-[#1B4B73]/10 text-[#1B4B73] dark:text-sky-300 text-[10px] font-bold py-0.5"
                        >
                          <Calendar className="h-3 w-3" />
                          {getPeriodoLabel(periodo, fromDate, toDate)}
                          <button
                            type="button"
                            onClick={() => { setPeriodo("todas"); setFromDate(""); setToDate(""); }}
                            className="ml-0.5 hover:text-foreground cursor-pointer"
                          >
                            <XIcon className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      )}
                      {status !== "all" && (
                        <Badge
                          variant="outline"
                          className="gap-1 border-slate-300 dark:border-slate-700 text-[10px] font-bold py-0.5"
                        >
                          {STATUS_LABELS[status as EstadoOrden] || status}
                          <button
                            type="button"
                            onClick={() => setStatus("all")}
                            className="ml-0.5 hover:text-foreground cursor-pointer"
                          >
                            <XIcon className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      )}
                      {service !== "all" && (
                        <Badge
                          variant="outline"
                          className="gap-1 border-slate-300 dark:border-slate-700 text-[10px] font-bold py-0.5"
                        >
                          {service}
                          <button
                            type="button"
                            onClick={() => setService("all")}
                            className="ml-0.5 hover:text-foreground cursor-pointer"
                          >
                            <XIcon className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="font-bold text-[#1B4B73] dark:text-sky-300 hover:underline cursor-pointer"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>

              {/* Lista Detallada de Órdenes */}
              <div className="space-y-2.5">
                {filteredOrders.map((order) => {
                  const isExpanded = expandedOrderId === order.id;
                  const pieces = (order.items || []).filter((it) => !it.es_libra).reduce((s, it) => s + Number(it.cantidad || 0), 0);
                  const pounds = (order.items || []).filter((it) => it.es_libra).reduce((s, it) => s + Number(it.cantidad || 0), 0);

                  return (
                    <div
                      key={order.id}
                      className="rounded-2xl border border-border/80 bg-surface p-3.5 shadow-2xs hover:border-primary/40 transition-all"
                    >
                      <div
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        className="flex items-start justify-between gap-3 cursor-pointer"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-display font-black text-sm text-foreground">
                              Orden #{order.numero}
                            </span>
                            <Badge variant="outline" className={`text-[10px] font-black px-2 py-0.5 ${STATUS_STYLES[order.estado]}`}>
                              {STATUS_LABELS[order.estado]}
                            </Badge>
                            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                              <Clock3 className="h-3 w-3" />
                              {formatDateTimeRD(order.creado_en) || formatDate(order.creado_en)}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <span className="inline-flex items-center gap-1 font-bold text-foreground">
                              <Shirt className="h-3.5 w-3.5 text-[#1B4B73]" />
                              {formatWeight(pieces)} prendas
                            </span>
                            {pounds > 0 && (
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                                <Scale className="h-3.5 w-3.5" />
                                {formatWeight(pounds)} lb
                              </span>
                            )}
                            <div className="flex items-center gap-1">
                              {(order.servicios || []).map((s) => (
                                <Badge key={s} variant="outline" className="text-[9px] px-1.5 py-0 border-border bg-background">
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-2.5">
                          <div>
                            <div className="font-display font-black text-base text-foreground">{formatRD(order.total)}</div>
                            {order.saldo > 0 ? (
                              <div className="text-[10px] font-extrabold text-rose-600">Saldo: {formatRD(order.saldo)}</div>
                            ) : (
                              <div className="text-[10px] font-extrabold text-emerald-600">Saldada</div>
                            )}
                          </div>
                          <span className="p-1 text-muted-foreground rounded-lg bg-muted/40">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </span>
                        </div>
                      </div>

                      {/* DESGLOSE EXPANDIDO DE LA ORDEN */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-border/60 bg-muted/20 p-3 rounded-xl space-y-2 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                            <span>Artículos y prendas procesadas</span>
                            <span>Subtotal</span>
                          </div>

                          <div className="space-y-1.5">
                            {(order.items || []).map((it, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-border/30 last:border-0">
                                <div>
                                  <span className="font-bold text-foreground">
                                    {it.cantidad} {it.es_libra ? 'lb' : 'piezas'} — {it.descripcion}
                                  </span>
                                  {it.precio_unitario > 0 && (
                                    <span className="text-[10.5px] text-muted-foreground ml-1.5">
                                      (@ {formatRD(it.precio_unitario)}{it.es_libra ? '/lb' : ''})
                                    </span>
                                  )}
                                  {it.notas && <p className="text-[10px] text-muted-foreground italic">Nota: {it.notas}</p>}
                                </div>
                                <span className="font-display font-bold text-foreground">
                                  {formatRD(Number(it.cantidad || 0) * Number(it.precio_unitario || 0))}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-border/40 flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">
                              {order.pagado > 0 ? `Pagado: ${formatRD(order.pagado)}` : 'Sin abonos'}
                            </span>
                            <span className="font-bold text-foreground">
                              Total Neto: <strong className="font-black">{formatRD(order.total)}</strong>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredOrders.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-border p-10 text-center text-xs text-muted-foreground">
                    No se encontraron órdenes con los filtros seleccionados.
                  </div>
                )}
              </div>
            </TabsContent>

            {/* PESTAÑA 3: POR LIBRAS (DETALLE DEDICADO DE PESAJE Y TARIFA) */}
            <TabsContent value="libras" className="m-0 space-y-4">
              {/* Tarjetas de Resumen de Pesaje */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <MetricCard
                  icon={Scale}
                  label="Libras Totales"
                  value={`${formatWeight(analytics.totalLibras)} lb`}
                  detail="Histórico facturado"
                  accent="emerald"
                />
                <MetricCard
                  icon={Receipt}
                  label="Pesajes Realizados"
                  value={String(analytics.pesajes.length)}
                  detail="En órdenes facturadas"
                  accent="blue"
                />
                <MetricCard
                  icon={Scale}
                  label="Promedio / Orden"
                  value={`${analytics.promedioLibrasPorOrden} lb`}
                  detail="Por orden de lavado"
                  accent="gold"
                />
                <MetricCard
                  icon={WalletCards}
                  label="Tarifa Promedio"
                  value={formatRD(analytics.tarifaPromedioLibra)}
                  detail="Por libra facturada"
                  accent="blue"
                />
              </div>

              {/* TABLA HISTÓRICA DE PESAJES */}
              <div className="rounded-2xl border border-border/80 bg-surface overflow-hidden shadow-2xs">
                <div className="px-4 py-3 border-b border-border/60 bg-muted/30 flex items-center justify-between">
                  <h3 className="font-display text-xs sm:text-sm font-black text-foreground flex items-center gap-1.5">
                    <Scale className="h-4 w-4 text-emerald-600" />
                    <span>Registro Cronológico de Pesajes por Libra</span>
                  </h3>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {analytics.pesajes.length} registros
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/10 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                        <th className="py-2.5 px-3">Fecha</th>
                        <th className="py-2.5 px-3">Orden #</th>
                        <th className="py-2.5 px-3">Descripción / Carga</th>
                        <th className="py-2.5 px-3 text-right">Libras</th>
                        <th className="py-2.5 px-3 text-right">Precio / lb</th>
                        <th className="py-2.5 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {analytics.pesajes.map((pesaje, i) => (
                        <tr key={i} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground font-medium">
                            {formatDate(pesaje.fecha)}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-display font-black text-[#1B4B73] dark:text-sky-300">
                            #{pesaje.ordenNumero}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-foreground">
                            {pesaje.descripcion}
                            {pesaje.servicio && (
                              <span className="text-[10px] text-muted-foreground block">{pesaje.servicio}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {formatWeight(pesaje.libras)} lb
                          </td>
                          <td className="py-2.5 px-3 text-right text-muted-foreground whitespace-nowrap">
                            {formatRD(pesaje.precioUnitario)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-display font-black text-foreground whitespace-nowrap">
                            {formatRD(pesaje.subtotal)}
                          </td>
                        </tr>
                      ))}

                      {analytics.pesajes.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-xs text-muted-foreground italic">
                            Este cliente no tiene registros de órdenes facturadas por libra.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* PESTAÑA 4: UBICACIÓN Y CONTACTO */}
            <TabsContent value="ubicacion" className="m-0 space-y-4">
              <div className="grid gap-3.5 lg:grid-cols-2">
                {/* Datos de Ubicación y Sector */}
                <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-2xs">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-border/60">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#1B4B73]/10 text-[#1B4B73] border border-[#1B4B73]/20">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <h3 className="font-display text-xs sm:text-sm font-black text-foreground">
                      Ubicación Registrada
                    </h3>
                  </div>

                  <div className="mt-3 space-y-2.5 text-xs">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                        Sector / Zona Geográfica
                      </span>
                      <span className="font-bold text-sm text-[#1B4B73] dark:text-sky-300 block mt-0.5">
                        {cliente.sector ? `📍 ${cliente.sector}` : "Sin sector asignado"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                        Dirección Completa
                      </span>
                      <span className="font-medium text-foreground block mt-0.5">
                        {cliente.direccion || "—"}
                      </span>
                    </div>

                    {cliente.edificio_apto && (
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                          Edificio / Apartamento / Nivel
                        </span>
                        <span className="font-medium text-foreground block mt-0.5">
                          {cliente.edificio_apto}
                        </span>
                      </div>
                    )}

                    {cliente.referencia && (
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                          Punto de Referencia
                        </span>
                        <span className="font-medium text-foreground block mt-0.5">
                          {cliente.referencia}
                        </span>
                      </div>
                    )}

                    {(cliente.lat && cliente.lng) || cliente.direccion ? (
                      <div className="pt-2">
                        <a
                          href={cliente.lat && cliente.lng 
                            ? `https://www.google.com/maps?q=${cliente.lat},${cliente.lng}`
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${cliente.direccion || ''} ${cliente.sector || ''}`)}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#1B4B73]/10 hover:bg-[#1B4B73]/20 text-[#1B4B73] dark:text-sky-300 border border-[#1B4B73]/25 font-bold text-xs transition-colors"
                        >
                          <MapPin className="h-3.5 w-3.5 text-[#F0B900]" />
                          <span>Abrir ubicación en Google Maps</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Datos de Contacto y Notas */}
                <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-border/60">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F0B900]/15 text-[#9E7300] border border-[#F0B900]/30">
                      <Phone className="h-4 w-4" />
                    </span>
                    <h3 className="font-display text-xs sm:text-sm font-black text-foreground">
                      Canales de Contacto
                    </h3>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/40">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-muted-foreground block">Teléfono</span>
                        <span className="font-bold text-foreground">{formatPhoneRD(cliente.telefono) || cliente.telefono || "—"}</span>
                      </div>
                      {rawPhone && (
                        <a
                          href={`https://wa.me/${rawPhone.startsWith("1") ? rawPhone : `1${rawPhone}`}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                        >
                          <MessageSquare className="h-3 w-3" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>

                    {cliente.email && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/40">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="text-[10px] font-extrabold uppercase text-muted-foreground block">Email</span>
                          <span className="font-medium text-foreground">{cliente.email}</span>
                        </div>
                      </div>
                    )}

                    {cliente.notas && (
                      <div className="mt-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                          Notas Internas del Cliente
                        </span>
                        <p className="mt-1 text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                          {cliente.notas}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
