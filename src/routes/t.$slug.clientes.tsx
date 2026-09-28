import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Search,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  Trash2,
  Users,
  Download,
  Upload,
  Printer,
  FileSpreadsheet,
  Building2,
  User,
  AlertCircle,
  CreditCard,
  MessageSquare,
  DollarSign,
  Receipt,
  X as XIcon,
  Filter,
  ArrowUpDown,
  ExternalLink,
  Pencil,
  FileText,
  Percent,
} from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
import { createPortal } from "react-dom";
import { exportClientsToExcel } from "@/lib/excel-clients";
import { ExcelClientsImportModal } from "@/components/klynn/ExcelClientsImportModal";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRD, formatPhoneRD, type Cliente } from "@/lib/storage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ClienteDialog } from "@/components/klynn/ClienteDialog";
import { ClienteDetalleModal } from "@/components/klynn/ClienteDetalleModal";
import {
  ClientesDailyMetricsCards,
  type PeriodoCliente,
  type TipoMetricaCliente,
  toLocalDateKey,
  parseDateKey,
  isThisWeekKey,
} from "@/components/klynn/ClientesDailyMetricsCards";
import { getSectorOptions, normalizeText } from "@/lib/cliente-analytics";
import { useClientes, useOrdenes } from "@/hooks/use-queries";

export const Route = createFileRoute("/t/$slug/clientes")({ component: ClientesPage });

type FilterType = "all" | "empresa" | "persona" | "deuda" | "credito";

function ClientesPage() {
  const user = useRequireAuth();
  const tenantId = user?.tenant?.id || "";

  const [q, setQ] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Cliente | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [openExcelImport, setOpenExcelImport] = useState(false);

  // Estados para métricas diarias (Nuevos registros y Visitas)
  const [periodoCliente, setPeriodoCliente] = useState<PeriodoCliente>("todos");
  const [tipoMetrica, setTipoMetrica] = useState<TipoMetricaCliente>("todos");
  const [customFechaCliente, setCustomFechaCliente] = useState<string | undefined>(undefined);

  const { data: clientes = [], isLoading: loadingClientes } = useClientes(tenantId);
  const { data: ordenes = [], isLoading: loadingOrdenes } = useOrdenes(tenantId);

  const tenant = user?.tenant;
  const loading = loadingClientes || loadingOrdenes;

  const deudaCliente = (id: string) => {
    return ordenes
      .filter((o) => o.cliente_id === id && o.estado !== "ANULADA")
      .reduce((s, o) => s + (o.saldo || 0), 0);
  };

  const totalGastado = (id: string) => {
    return ordenes
      .filter((o) => o.cliente_id === id && o.estado !== "ANULADA")
      .reduce((s, o) => s + (o.total || 0), 0);
  };

  // Cálculos para KPIs globales
  const totalClientes = clientes.length;
  const empresasCount = useMemo(
    () => clientes.filter((c) => (c.tipo || "").toLowerCase().trim() === "empresa").length,
    [clientes],
  );
  const personasCount = useMemo(
    () => clientes.filter((c) => (c.tipo || "").toLowerCase().trim() !== "empresa").length,
    [clientes],
  );
  const clientesConDeuda = useMemo(
    () => clientes.filter((c) => deudaCliente(c.id) > 0),
    [clientes, ordenes],
  );
  const clientesConCredito = useMemo(
    () => clientes.filter((c) => (c.limite_credito || 0) > 0),
    [clientes],
  );
  const totalDeudaGlobal = useMemo(
    () => clientes.reduce((sum, c) => sum + deudaCliente(c.id), 0),
    [clientes, ordenes],
  );
  const totalVentasGlobal = useMemo(
    () => clientes.reduce((sum, c) => sum + totalGastado(c.id), 0),
    [clientes, ordenes],
  );

  const selectedCliente = useMemo(() => {
    return clientes.find((c) => c.id === selectedClienteId) || null;
  }, [clientes, selectedClienteId]);

  const sectorOptions = useMemo(() => {
    return getSectorOptions(clientes);
  }, [clientes]);

  const handleFilterPeriodo = (
    tipo: TipoMetricaCliente,
    periodo: PeriodoCliente,
    customDate?: string,
  ) => {
    setTipoMetrica(tipo);
    setPeriodoCliente(periodo);
    setCustomFechaCliente(customDate);
  };

  const handleResetDailyFilter = () => {
    setTipoMetrica("todos");
    setPeriodoCliente("todos");
    setCustomFechaCliente(undefined);
  };

  const clientesConVisitasEnPeriodo = useMemo(() => {
    if (tipoMetrica !== "visitas") return null;

    const todayKey = toLocalDateKey(new Date());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayKey = toLocalDateKey(yesterdayDate);

    const matchingIds = new Set<string>();

    for (const o of ordenes) {
      if (o.estado === "ANULADA") continue;
      if (!o.cliente_id) continue;
      const k = parseDateKey(o.creado_en);
      if (!k) continue;

      if (periodoCliente === "hoy" && k === todayKey) {
        matchingIds.add(o.cliente_id);
      } else if (periodoCliente === "ayer" && k === yesterdayKey) {
        matchingIds.add(o.cliente_id);
      } else if (periodoCliente === "esta_semana") {
        const d = new Date(o.creado_en);
        if (!isNaN(d.getTime()) && isThisWeekKey(d)) {
          matchingIds.add(o.cliente_id);
        }
      } else if (periodoCliente === "custom" && customFechaCliente && k === customFechaCliente) {
        matchingIds.add(o.cliente_id);
      }
    }

    return matchingIds;
  }, [ordenes, tipoMetrica, periodoCliente, customFechaCliente]);

  // Filtrado combinado (Texto + Tipo de Filtro + Sector + Métricas Diarias)
  const filteredList = useMemo(() => {
    return clientes.filter((c) => {
      const search = q.toLowerCase().trim();
      const matchSearch =
        !search ||
        c.nombre.toLowerCase().includes(search) ||
        (c.apellido && c.apellido.toLowerCase().includes(search)) ||
        c.telefono.includes(search) ||
        (c.cedula && c.cedula.includes(search)) ||
        (c.email && c.email.toLowerCase().includes(search)) ||
        (c.direccion && c.direccion.toLowerCase().includes(search)) ||
        (c.sector && c.sector.toLowerCase().includes(search));

      if (!matchSearch) return false;

      // Filtro por Sector
      if (sectorFilter !== "all") {
        const clientSector = normalizeText(c.sector);
        if (clientSector !== sectorFilter) return false;
      }

      if (filterType === "empresa") return (c.tipo || "").toLowerCase().trim() === "empresa";
      if (filterType === "persona") return (c.tipo || "").toLowerCase().trim() !== "empresa";
      if (filterType === "deuda") return deudaCliente(c.id) > 0;
      if (filterType === "credito") return (c.limite_credito || 0) > 0;

      // Filtro por métricas diarias (Nuevos registros o Visitas)
      if (tipoMetrica === "nuevos") {
        if (!c.creado_en) return false;
        const k = parseDateKey(c.creado_en);
        if (!k) return false;

        const todayKey = toLocalDateKey(new Date());
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayKey = toLocalDateKey(yesterdayDate);

        if (periodoCliente === "hoy" && k !== todayKey) return false;
        if (periodoCliente === "ayer" && k !== yesterdayKey) return false;
        if (periodoCliente === "esta_semana") {
          const d = new Date(c.creado_en);
          if (isNaN(d.getTime()) || !isThisWeekKey(d)) return false;
        }
        if (periodoCliente === "custom" && customFechaCliente && k !== customFechaCliente)
          return false;
      } else if (tipoMetrica === "visitas") {
        if (!clientesConVisitasEnPeriodo || !clientesConVisitasEnPeriodo.has(c.id)) {
          return false;
        }
      }

      return true;
    });
  }, [
    clientes,
    q,
    filterType,
    sectorFilter,
    ordenes,
    tipoMetrica,
    periodoCliente,
    customFechaCliente,
    clientesConVisitasEnPeriodo,
  ]);

  if (!user || user.tenant.id === "__loading__" || (loading && clientes.length === 0)) {
    return <GlobalPageLoader text="Cargando directorio de clientes..." />;
  }

  return (
    <div className="space-y-5">
      {/* HEADER DE PÁGINA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Directorio de clientes
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-medium">
            Gestión centralizada de perfiles, cuentas por cobrar, líneas de crédito y contacto
            comercial.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <Button
            type="button"
            onClick={() => exportClientsToExcel(clientes, user.tenant?.nombre)}
            className="flex items-center gap-2 rounded-xl h-10 px-4 font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
            title="Descargar clientes actuales en Excel"
          >
            <Download className="h-4 w-4 text-[#F0B900] shrink-0" />
            <span>Exportar Excel</span>
          </Button>

          <Button
            type="button"
            onClick={() => setOpenExcelImport(true)}
            className="flex items-center gap-2 rounded-xl h-10 px-4 font-bold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
            title="Importar o actualizar clientes desde archivo Excel"
          >
            <Upload className="h-4 w-4 text-white shrink-0" />
            <span>Importar Excel</span>
          </Button>

          <Button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 rounded-xl h-10 px-5 font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
          >
            <UserPlus className="h-4 w-4 text-[#F0B900] shrink-0" />
            <span>Nuevo cliente</span>
          </Button>
        </div>
      </div>

      {/* 4 EXECUTIVE KPI CARDS (EXACTO ESTILO /ADMIN) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Total Clientes (Variant: Primary Gradient) */}
        <Card className="p-3.5 sm:p-5 h-full rounded-2xl bg-gradient-primary text-white shadow-md border-0 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-1.5">
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-white/80 font-semibold">
              Total Clientes
            </div>
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 mt-0.5 text-white/80" />
          </div>
          <div className="mt-1.5 sm:mt-2 font-display font-black tracking-tight text-white text-xl sm:text-2xl lg:text-3xl">
            {totalClientes}
          </div>
          <div className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs font-semibold truncate text-white/90">
            {totalClientes === 1
              ? "1 cliente registrado"
              : `${totalClientes} registrados en catálogo`}
          </div>
        </Card>

        {/* 2. Empresas (Variant: Indigo) */}
        <Card className="p-3.5 sm:p-5 h-full rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-1.5">
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-indigo-800 dark:text-indigo-300 font-semibold">
              Empresas
            </div>
            <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-1.5 sm:mt-2 font-display font-black tracking-tight text-foreground text-xl sm:text-2xl lg:text-3xl">
            {empresasCount}
          </div>
          <div className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs font-semibold truncate text-indigo-900 dark:text-indigo-200">
            Cuentas corporativas y RNC
          </div>
        </Card>

        {/* 3. Personas (Variant: Emerald) */}
        <Card className="p-3.5 sm:p-5 h-full rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-1.5">
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-300 font-semibold">
              Personas
            </div>
            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-1.5 sm:mt-2 font-display font-black tracking-tight text-foreground text-xl sm:text-2xl lg:text-3xl">
            {personasCount}
          </div>
          <div className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs font-semibold truncate text-emerald-900 dark:text-emerald-300">
            Consumidores particulares
          </div>
        </Card>

        {/* 4. Con Deuda (Variant: Rose) */}
        <Card className="p-3.5 sm:p-5 h-full rounded-2xl bg-rose-500/10 border border-rose-500/20 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-1.5">
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-rose-800 dark:text-rose-300 font-semibold">
              Con Deuda
            </div>
            <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="mt-1.5 sm:mt-2 font-display font-black tracking-tight text-foreground text-xl sm:text-2xl lg:text-3xl">
            {clientesConDeuda.length}
          </div>
          <div className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs font-semibold truncate text-rose-900 dark:text-rose-300">
            Saldo:{" "}
            <strong className="font-bold text-rose-600 dark:text-rose-400">
              {formatRD(totalDeudaGlobal)}
            </strong>
          </div>
        </Card>
      </div>

      {/* TARJETAS EJECUTIVAS DE ACTIVIDAD Y VISITAS DIARIAS DE CLIENTES */}
      <ClientesDailyMetricsCards
        clientes={clientes}
        ordenes={ordenes}
        tipoMetrica={tipoMetrica}
        periodoCliente={periodoCliente}
        customFechaCliente={customFechaCliente}
        onFilterPeriodo={handleFilterPeriodo}
        onResetFilter={handleResetDailyFilter}
      />

      {/* BARRA DE BÚSQUEDA Y FILTROS INTEGRADOS (2 NIVELES ESPACIOSOS) */}
      <div className="bg-surface p-3 sm:p-3.5 rounded-2xl border border-border/80 shadow-2xs space-y-2.5">
        {/* NIVEL 1: BUSCADOR AMPLIO + SELECTOR DE SECTORES AMIGABLE */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Input de Búsqueda (Espacioso, nunca comprimido) */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, teléfono, RNC, cédula, email o dirección..."
              className="pl-9.5 pr-8 h-10 rounded-xl bg-background border-border/70 text-xs sm:text-sm font-medium focus:ring-1 focus:ring-primary/20 w-full"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-0.5 cursor-pointer"
                title="Limpiar búsqueda"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Selector de Sectores (Radix UI amigable, tamaño controlado, no empuja ni encoge la barra) */}
          <div className="w-full sm:w-64 md:w-72 shrink-0">
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="h-10 rounded-xl border border-border/80 bg-background hover:bg-muted/40 text-xs sm:text-sm font-semibold px-3 shadow-2xs cursor-pointer transition-colors">
                <div className="flex items-center gap-2 truncate">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#1B4B73]/10 text-[#1B4B73] dark:bg-[#1B4B73]/25 dark:text-sky-300">
                    <MapPin className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate text-foreground">
                    {sectorFilter === "all"
                      ? "Todos los sectores"
                      : sectorOptions.find((s) => s.key === sectorFilter)?.label || "Sector"}
                  </span>
                  {sectorFilter !== "all" && (
                    <span className="ml-auto rounded-full bg-[#1B4B73]/15 text-[#1B4B73] dark:bg-[#1B4B73]/30 dark:text-sky-300 px-1.5 py-0.2 text-[10px] font-black shrink-0">
                      {sectorOptions.find((s) => s.key === sectorFilter)?.count || 0}
                    </span>
                  )}
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-xl max-h-72">
                <SelectItem value="all" className="cursor-pointer text-xs font-semibold py-2">
                  <div className="flex items-center justify-between w-full gap-3">
                    <span className="font-bold">Todos los sectores</span>
                    <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {clientes.length}
                    </span>
                  </div>
                </SelectItem>
                {sectorOptions.length > 0 && (
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-t border-border/50 mt-1">
                    Sectores ({sectorOptions.length})
                  </div>
                )}
                {sectorOptions.map((sec) => (
                  <SelectItem key={sec.key} value={sec.key} className="cursor-pointer text-xs py-2">
                    <div className="flex items-center justify-between w-full gap-3">
                      <span className="truncate font-medium">{sec.label}</span>
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                        {sec.count} {sec.count === 1 ? "cliente" : "clientes"}
                      </span>
                    </div>
                  </SelectItem>
                ))}
                {sectorOptions.length === 0 && (
                  <div className="p-3 text-center text-xs text-muted-foreground italic">
                    Sin sectores registrados
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* NIVEL 2: PÍLDORAS DE FILTRO RÁPIDO + BADGE DE SECTOR ACTIVO */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
            {/* Todos */}
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap hover:shadow-xs ${
                filterType === "all"
                  ? "bg-[#183659] text-white border-[#183659] shadow-md"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span>Todos</span>
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none ${
                  filterType === "all"
                    ? "bg-white/25 text-white"
                    : "bg-black/10 dark:bg-white/10 text-slate-800 dark:text-slate-200"
                }`}
              >
                {totalClientes}
              </span>
            </button>

            {/* Empresas */}
            <button
              type="button"
              onClick={() => setFilterType("empresa")}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap hover:shadow-xs ${
                filterType === "empresa"
                  ? "bg-[#1B4B73] text-white border-[#1B4B73] shadow-md"
                  : "bg-[#1B4B73]/10 text-[#1B4B73] dark:text-sky-300 border-[#1B4B73]/20 hover:bg-[#1B4B73]/20 dark:bg-[#1B4B73]/25"
              }`}
            >
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span>Empresas</span>
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none ${
                  filterType === "empresa"
                    ? "bg-white/25 text-white"
                    : "bg-[#1B4B73]/20 text-[#1B4B73] dark:bg-sky-950 dark:text-sky-300"
                }`}
              >
                {empresasCount}
              </span>
            </button>

            {/* Personas */}
            <button
              type="button"
              onClick={() => setFilterType("persona")}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap hover:shadow-xs ${
                filterType === "persona"
                  ? "bg-[#F0B900] text-slate-900 border-[#F0B900] shadow-md"
                  : "bg-[#F0B900]/15 text-[#9E7300] dark:text-[#F0B900] border-[#F0B900]/30 hover:bg-[#F0B900]/25 dark:bg-[#F0B900]/20"
              }`}
            >
              <User className="h-3.5 w-3.5 shrink-0" />
              <span>Personas</span>
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none ${
                  filterType === "persona"
                    ? "bg-black/15 text-slate-900"
                    : "bg-[#F0B900]/25 text-[#9E7300] dark:text-[#F0B900]"
                }`}
              >
                {personasCount}
              </span>
            </button>

            {/* Con Deuda */}
            <button
              type="button"
              onClick={() => setFilterType("deuda")}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap hover:shadow-xs ${
                filterType === "deuda"
                  ? "bg-rose-600 text-white border-rose-600 shadow-md"
                  : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/50"
              }`}
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>Con Deuda</span>
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none ${
                  filterType === "deuda"
                    ? "bg-white/25 text-white"
                    : "bg-rose-200/70 dark:bg-rose-900/60 text-rose-900 dark:text-rose-100"
                }`}
              >
                {clientesConDeuda.length}
              </span>
            </button>

            {/* Con Crédito */}
            {clientesConCredito.length > 0 && (
              <button
                type="button"
                onClick={() => setFilterType("credito")}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap hover:shadow-xs ${
                  filterType === "credito"
                    ? "bg-purple-600 text-white border-purple-600 shadow-md"
                    : "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/50"
                }`}
              >
                <CreditCard className="h-3.5 w-3.5 shrink-0" />
                <span>Con Crédito</span>
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none ${
                    filterType === "credito"
                      ? "bg-white/25 text-white"
                      : "bg-purple-200/70 dark:bg-purple-900/60 text-purple-900 dark:text-purple-100"
                  }`}
                >
                  {clientesConCredito.length}
                </span>
              </button>
            )}
          </div>

          {/* CHIP DE SECTOR ACTIVO CON BOTÓN DE QUITAR */}
          {sectorFilter !== "all" && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#1B4B73]/30 bg-[#1B4B73]/10 text-[#1B4B73] dark:text-sky-300 px-3 py-1 text-xs font-bold shadow-2xs">
              <MapPin className="h-3.5 w-3.5 text-[#1B4B73] dark:text-sky-400" />
              <span>
                Sector: {sectorOptions.find((s) => s.key === sectorFilter)?.label || sectorFilter}
              </span>
              <button
                type="button"
                onClick={() => setSectorFilter("all")}
                className="ml-1 hover:bg-[#1B4B73]/20 dark:hover:bg-[#1B4B73]/40 rounded-full p-0.5 transition-colors cursor-pointer"
                title="Quitar filtro de sector"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BANNER INFORMATIVO DE FILTRO ACTIVO POR MÉTRICA DIARIA */}
      {tipoMetrica !== "todos" && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 px-4 rounded-2xl bg-blue-50/80 dark:bg-slate-800/80 border border-blue-200 dark:border-slate-700 text-xs text-foreground shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#1B4B73] text-[#F0B900]">
              <Filter className="h-3.5 w-3.5" />
            </span>
            <span>
              Filtrando catálogo por:{" "}
              <strong className="text-[#1B4B73] dark:text-sky-300">
                {tipoMetrica === "nuevos" ? "Nuevos Clientes Registrados" : "Clientes con Visitas"}
              </strong>
              {" — "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {periodoCliente === "hoy"
                  ? "Hoy"
                  : periodoCliente === "ayer"
                    ? "Ayer"
                    : periodoCliente === "esta_semana"
                      ? "Esta Semana"
                      : customFechaCliente
                        ? customFechaCliente
                        : ""}
              </span>{" "}
              ({filteredList.length}{" "}
              {filteredList.length === 1 ? "cliente encontrado" : "clientes encontrados"})
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetDailyFilter}
            className="h-7 px-3 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-rose-600 border-slate-300 dark:border-slate-600 hover:border-rose-300 cursor-pointer shadow-2xs"
          >
            <XIcon className="h-3 w-3 mr-1 text-rose-500" />
            Limpiar filtro
          </Button>
        </div>
      )}

      {/* GRID DE TARJETAS REDISEÑADAS */}
      <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
        {filteredList.map((c) => {
          const deuda = deudaCliente(c.id);
          const total = totalGastado(c.id);
          const totalVisitas = ordenes.filter(
            (o) => o.cliente_id === c.id && o.estado !== "ANULADA",
          ).length;
          const isEmpresa = (c.tipo || "").toLowerCase().trim() === "empresa";
          const rawPhone = c.telefono.replace(/\D/g, "");

          return (
            <Card
              key={c.id}
              onClick={() => setSelectedClienteId(c.id)}
              className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-surface shadow-2xs hover:shadow-md hover:border-primary/50 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 flex flex-col justify-between h-full group cursor-pointer relative"
            >
              <div>
                {/* Header de la Tarjeta */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Avatar Icon con Colores Primarios (#1B4B73 y #F0B900) */}
                    <div
                      className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-2xs transition-transform group-hover:scale-105 ${
                        isEmpresa
                          ? "bg-[#1B4B73]/10 text-[#1B4B73] border-[#1B4B73]/25 dark:bg-[#1B4B73]/30 dark:text-sky-300 dark:border-[#1B4B73]/50"
                          : "bg-[#F0B900]/15 text-[#9E7300] border-[#F0B900]/30 dark:bg-[#F0B900]/25 dark:text-[#F0B900] dark:border-[#F0B900]/40"
                      }`}
                    >
                      {isEmpresa ? (
                        <Building2 className="h-5.5 w-5.5" />
                      ) : (
                        <User className="h-5.5 w-5.5" />
                      )}
                    </div>

                    {/* Nombre y Badges Principales */}
                    <div className="min-w-0 flex-1">
                      <h4
                        className="font-display font-bold text-sm sm:text-base text-foreground line-clamp-1 leading-snug group-hover:text-primary transition-colors"
                        title={`${c.nombre} ${c.apellido || ""}`.trim()}
                      >
                        {c.nombre} {c.apellido || ""}
                      </h4>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 font-bold border ${
                            isEmpresa
                              ? "border-[#1B4B73]/30 bg-[#1B4B73]/10 text-[#1B4B73] dark:bg-[#1B4B73]/25 dark:text-sky-300 dark:border-[#1B4B73]/40"
                              : "border-[#F0B900]/40 bg-[#F0B900]/15 text-[#9E7300] dark:bg-[#F0B900]/25 dark:text-[#F0B900] dark:border-[#F0B900]/40"
                          }`}
                        >
                          {isEmpresa ? "Empresa" : "Consumidor"}
                        </Badge>

                        <Badge
                          variant="outline"
                          className="text-[10px] px-2 py-0.5 font-bold border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                          title={`Total de órdenes/visitas generadas por este cliente`}
                        >
                          {totalVisitas} {totalVisitas === 1 ? "visita" : "visitas"}
                        </Badge>

                        {/* BADGE DESTACADO DE RNC / CÉDULA CON COLORES PRIMARIOS */}
                        {c.cedula ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-[#1B4B73] text-white border border-[#1B4B73] shadow-xs">
                            <FileText className="h-2.5 w-2.5 text-[#F0B900] shrink-0" />
                            <span>
                              {isEmpresa ? "RNC:" : "Cédula:"}{" "}
                              <strong className="font-black text-[#F0B900]">{c.cedula}</strong>
                            </span>
                          </span>
                        ) : isEmpresa ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-medium bg-[#1B4B73]/10 text-[#1B4B73] dark:text-[#F0B900] border border-[#1B4B73]/20">
                            Sin RNC
                          </span>
                        ) : null}

                        {c.limite_credito > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-2 py-0.5 font-bold border-purple-200 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                          >
                            Crédito: {formatRD(c.limite_credito)}
                          </Badge>
                        )}

                        {Number(c.descuento_fijo || 0) > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-2 py-0.5 font-bold border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 gap-1 flex items-center"
                          >
                            <Percent className="h-2.5 w-2.5" />
                            {c.descuento_fijo}% Desc.
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botón rápido de editar */}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEdit(c);
                    }}
                    className="h-8 w-8 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0 cursor-pointer"
                    title="Editar perfil"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Datos de Contacto y Ubicación */}
                <div className="mt-3.5 space-y-1.5 text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-xl border border-border/40">
                  {/* Teléfono y WhatsApp */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-foreground truncate">
                        {formatPhoneRD(c.telefono) || c.telefono || "—"}
                      </span>
                    </div>

                    {rawPhone && (
                      <a
                        href={`https://wa.me/${rawPhone.startsWith("1") ? rawPhone : `1${rawPhone}`}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageSquare className="h-3 w-3" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>

                  {/* Email */}
                  {c.email && (
                    <div className="flex items-center gap-1.5 min-w-0 pt-0.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate text-slate-600 dark:text-slate-300 font-medium">
                        {c.email}
                      </span>
                    </div>
                  )}

                  {/* Dirección y Sector */}
                  {(c.direccion || c.sector) && (
                    <div className="flex items-start gap-1.5 min-w-0 pt-0.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <div className="truncate text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1.5 flex-wrap">
                        {c.sector && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSectorFilter(normalizeText(c.sector));
                            }}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#1B4B73]/10 text-[#1B4B73] hover:bg-[#1B4B73]/20 dark:bg-[#1B4B73]/25 dark:text-sky-300 transition-colors cursor-pointer"
                            title={`Filtrar clientes de ${c.sector}`}
                          >
                            <span>{c.sector}</span>
                          </button>
                        )}
                        {c.direccion && (
                          <span className="truncate text-xs" title={c.direccion}>
                            {c.direccion}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Financiero (Total Facturado y Deuda) */}
              <div className="mt-3.5 pt-3 border-t border-border/60 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Total Facturado
                  </span>
                  <span className="font-display font-black text-sm text-foreground">
                    {formatRD(total)}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Deuda Pendiente
                  </span>
                  <span
                    className={`font-display font-black text-sm ${
                      deuda > 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {formatRD(deuda)}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}

        {/* Estado Vacío */}
        {filteredList.length === 0 && (
          <Card className="col-span-full p-12 text-center border border-dashed border-border/80 bg-surface/30 rounded-3xl py-16 flex flex-col items-center justify-center">
            <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 p-4 mb-4 text-indigo-600 shadow-2xs">
              <Users className="h-10 w-10" />
            </div>
            <h3 className="font-display text-xl font-bold text-foreground">
              {q || filterType !== "all" || sectorFilter !== "all"
                ? "No se encontraron clientes"
                : "¡Aún no hay clientes registrados!"}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mt-2 leading-relaxed">
              {q || filterType !== "all" || sectorFilter !== "all"
                ? "Prueba cambiando el término de búsqueda o seleccionando otro filtro o sector en el panel superior."
                : "Registra a tus clientes recurrentes para llevar el control de sus pedidos, saldos y recordatorios de pago de forma organizada."}
            </p>
            {q || filterType !== "all" || sectorFilter !== "all" ? (
              <Button
                onClick={() => {
                  setQ("");
                  setFilterType("all");
                  setSectorFilter("all");
                }}
                variant="outline"
                className="mt-5 font-bold rounded-xl cursor-pointer"
              >
                Limpiar filtros de búsqueda
              </Button>
            ) : (
              <Button
                onClick={() => setShowNew(true)}
                className="mt-6 bg-gradient-primary text-white font-bold transition-all duration-200 active:scale-95 shadow-md rounded-xl cursor-pointer"
              >
                <UserPlus className="mr-1.5 h-4 w-4" /> Registrar primer cliente
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* MODAL DETALLE DE CLIENTE (HISTORIAL, SERVICIOS, PRENDAS Y LIBRAS) */}
      <ClienteDetalleModal
        open={!!selectedCliente}
        onOpenChange={(open) => {
          if (!open) setSelectedClienteId(null);
        }}
        cliente={selectedCliente}
        ordenes={ordenes}
        onEdit={(c) => {
          setSelectedClienteId(null);
          setEdit(c);
        }}
      />

      {/* DIALOG DE CLIENTE */}
      <ClienteDialog
        open={showNew || !!edit}
        onOpenChange={(o) => {
          if (!o) {
            setShowNew(false);
            setEdit(null);
          }
        }}
        cliente={edit}
        tenant={tenant}
        onDone={() => {
          setEdit(null);
          setShowNew(false);
        }}
        sectorSuggestions={sectorOptions.map((s) => s.label)}
      />

      {/* MODAL DE IMPORTAR CLIENTES */}
      <ExcelClientsImportModal
        open={openExcelImport}
        onOpenChange={setOpenExcelImport}
        tenantId={tenantId}
        currentClientes={clientes}
        tenantName={user?.tenant?.nombre}
      />

      {/* PORTAL DE IMPRESIÓN */}
      {isPrinting && (
        <ClientesPrintPortal
          tenant={user.tenant}
          clientes={filteredList}
          deudaCliente={deudaCliente}
          totalGastado={totalGastado}
          onClose={() => setIsPrinting(false)}
        />
      )}
    </div>
  );
}

function ClientesPrintPortal({
  tenant,
  clientes,
  deudaCliente,
  totalGastado,
  onClose,
}: {
  tenant: any;
  clientes: any[];
  deudaCliente: (id: string) => number;
  totalGastado: (id: string) => number;
  onClose: () => void;
}) {
  const totalDeudaGlobal = clientes.reduce((acc, curr) => acc + deudaCliente(curr.id), 0);
  const totalVentasGlobal = clientes.reduce((acc, curr) => acc + totalGastado(curr.id), 0);

  return createPortal(
    <div className="fixed inset-0 bg-white z-[99999] overflow-y-auto pointer-events-auto atomic-print-target text-slate-800">
      <div className="max-w-4xl mx-auto p-8 print:p-12 print:max-w-4xl print:mx-auto">
        {/* Controles de impresión (ocultos al imprimir) */}
        <div className="flex justify-between items-center border-b-2 border-primary/20 pb-6 mb-8 print:hidden relative z-[100000]">
          <Button variant="outline" onClick={onClose} className="gap-2 cursor-pointer">
            Cerrar Reporte
          </Button>
          <Button
            onClick={() => window.print()}
            className="bg-primary text-white gap-2 cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Imprimir / Guardar PDF
          </Button>
        </div>

        <div className="print-area">
          {/* Encabezado */}
          <div className="flex justify-between items-start mb-10 pb-6 border-b border-slate-200">
            <div>
              {tenant.logo_url ? (
                <img
                  src={tenant.logo_url}
                  alt={tenant.nombre}
                  className="h-16 object-contain mb-4"
                />
              ) : (
                <h1 className="text-4xl font-display font-black text-primary uppercase tracking-tighter mb-1">
                  {tenant.nombre}
                </h1>
              )}
              <div className="text-sm font-bold text-slate-500 uppercase">
                {tenant.rnc ? `RNC: ${tenant.rnc}` : "Sin RNC Configurado"}
              </div>
              <div className="text-xs text-slate-500 max-w-sm mt-1">{tenant.direccion}</div>
              <div className="text-xs text-slate-500">
                Tel: {tenant.telefono} | {tenant.email}
              </div>
            </div>

            <div className="text-right">
              <h2 className="text-2xl font-display font-black uppercase text-slate-900 mb-1">
                Reporte de Clientes
              </h2>
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
                CATÁLOGO DE CLIENTES Y CRÉDITOS
              </div>
              <div className="text-xs text-slate-600">
                <span className="font-bold">Generado:</span>{" "}
                {new Date().toLocaleString("es-DO", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </div>
            </div>
          </div>

          {/* Sección 1: KPIs Rápidos */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Total de Clientes
              </div>
              <div className="text-xl font-bold text-slate-800">
                {clientes.length} {clientes.length === 1 ? "cliente" : "clientes"}
              </div>
              <div className="text-[8px] text-slate-400 mt-0.5">En el catálogo actual</div>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Cartera de Deuda Total
              </div>
              <div className="text-xl font-bold text-rose-600">{formatRD(totalDeudaGlobal)}</div>
              <div className="text-[8px] text-slate-400 mt-0.5">Suma de cuentas por cobrar</div>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Volumen de Consumo
              </div>
              <div className="text-xl font-bold text-emerald-600">
                {formatRD(totalVentasGlobal)}
              </div>
              <div className="text-[8px] text-slate-400 mt-0.5">Historial total facturado</div>
            </div>
          </div>

          {/* Sección 2: Tabla de Datos */}
          <div className="border border-slate-200 rounded-xl overflow-hidden mb-8">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Nombre / Cliente</th>
                  <th className="py-3 px-4">Teléfono</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Dirección</th>
                  <th className="py-3 px-4 text-center">Tipo</th>
                  <th className="py-3 px-4 text-right">Consumo Histórico</th>
                  <th className="py-3 px-4 text-right">Deuda Pendiente</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c, i) => {
                  const deuda = deudaCliente(c.id);
                  const total = totalGastado(c.id);
                  return (
                    <tr
                      key={i}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                    >
                      <td className="py-2.5 px-4 font-bold text-slate-850">
                        {c.nombre} {c.apellido || ""}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                        {c.telefono || "—"}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">{c.email || "—"}</td>
                      <td className="py-2.5 px-4 text-slate-500">{c.direccion || "—"}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-black uppercase border ${
                            c.tipo === "Empresa"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {c.tipo === "Empresa" ? "Empresa" : "Consumidor"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-slate-700">
                        {formatRD(total)}
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-bold ${deuda > 0 ? "text-rose-600" : "text-slate-500"}`}
                      >
                        {formatRD(deuda)}
                      </td>
                    </tr>
                  );
                })}

                {clientes.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 italic">
                      No hay clientes registrados que coincidan con la búsqueda
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pie de página */}
          <div className="flex justify-between items-end border-t border-slate-200 pt-6 mt-12">
            <div className="text-left text-[9px] text-slate-400 italic leading-relaxed max-w-sm">
              Este reporte fue generado de forma automática y es propiedad confidencial.
            </div>
            <div className="text-right text-[10px] font-bold text-slate-500">
              Klynn POS Software
            </div>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page { size: portrait; margin: 15mm; }
          html, body { overflow: visible !important; height: auto !important; background: white !important; }
          body > *:not(.atomic-print-target) { display: none !important; }
          .atomic-print-target { 
            display: block !important; 
            visibility: visible !important; 
            position: static !important; 
            width: 100% !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-area { visibility: visible !important; display: block !important; }
          .no-print { display: none !important; }
        }
      `,
        }}
      />
    </div>,
    document.body,
  );
}
