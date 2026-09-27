import { toastWhatsAppSuccess } from "@/components/klynn/WhatsAppManualToast";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback, useDeferredValue, memo } from "react";
import { toast } from "sonner";
import {
  Bike,
  Package,
  MapPin,
  CheckCircle2,
  Clock,
  Search,
  Phone,
  Navigation,
  TrendingUp,
  PackageCheck,
  Truck,
  AlertCircle,
  Filter,
  X,
  Undo2,
  Timer,
  ChevronRight,
  ChevronDown,
  User as UserIcon,
  Calendar,
  Route as RouteIcon,
  Map as MapIcon,
  LayoutGrid,
  List,
  Printer,
  Compass,
  DollarSign,
  AlertTriangle,
  FileText,
  UserCheck,
  Building,
  Sparkles,
  MessageSquare,
  Camera,
  ZoomIn,
  MoreVertical,
  Zap,
} from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
import {
  getOrdenes,
  getClientes,
  getEmpleados,
  saveOrden,
  formatRD,
  formatDateRD,
  purgeOldPodImages,
  type Orden,
  type Cliente,
  type Empleado,
  type EstadoOrden,
} from "@/lib/storage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ProofOfDeliveryDialog } from "@/components/klynn/logistica/ProofOfDeliveryDialog";
import { IncidenciaDialog } from "@/components/klynn/logistica/IncidenciaDialog";
import { LogisticsMap } from "@/components/klynn/logistica/LogisticsMap";
import { DeliveryManifestPrint } from "@/components/klynn/logistica/DeliveryManifestPrint";
import { useQueryClient } from "@tanstack/react-query";

import { useOrdenes, useClientes, useEmpleados } from "@/hooks/use-queries";

export const Route = createFileRoute("/t/$slug/logistica")({
  component: LogisticaPage,
});

function LogisticaPage() {
  const user = useRequireAuth();
  const queryClient = useQueryClient();
  const tenant = user?.tenant;
  const tenantId = tenant?.id || "";

  const { data: rawOrds = [], isLoading: loadingOrdenes } = useOrdenes(tenantId);
  const { data: clientes = [] } = useClientes(tenantId);
  const { data: empleados = [] } = useEmpleados(tenantId);

  const [ordenesRaw, setOrdenesRaw] = useState<Orden[]>(() => rawOrds);

  useEffect(() => {
    if (rawOrds) setOrdenesRaw(rawOrds);
  }, [rawOrds]);

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [filterStatus, setFilterStatus] = useState<EstadoOrden | "TODAS">("TODAS");
  const [filterRepartidor, setFilterRepartidor] = useState<string>("TODOS");
  const [filterSector, setFilterSector] = useState<string>("TODOS");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [visibleCount, setVisibleCount] = useState(36);

  // Modales
  const [detailId, setDetailId] = useState<string | null>(null);
  const [podOrder, setPodOrder] = useState<Orden | null>(null);
  const [incidenciaOrder, setIncidenciaOrder] = useState<Orden | null>(null);
  const [showManifest, setShowManifest] = useState(false);
  const [now, setNow] = useState(new Date());

  const handleOpenPOD = useCallback((ord: Orden) => setPodOrder(ord), []);
  const handleOpenIncidencia = useCallback((ord: Orden) => setIncidenciaOrder(ord), []);
  const handleSelectOrder = useCallback((id: string) => setDetailId(id), []);

  // Lightbox visor de comprobantes (Foto / Firma)
  const [zoomMedia, setZoomMedia] = useState<{
    type: "foto" | "firma";
    src: string;
    title: string;
  } | null>(null);
  const [brokenPodImg, setBrokenPodImg] = useState(false);

  useEffect(() => {
    setBrokenPodImg(false);
  }, [detailId]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Auto-purga de fotos de entrega con más de 7 días (mantiene el storage limpio y sin saturación)
  useEffect(() => {
    if (tenant?.id) {
      purgeOldPodImages(tenant.id);
    }
  }, [tenant?.id]);

  // Rol del usuario actual
  const isRepartidor = user?.empleado?.rol === "REPARTIDOR";
  const currentEmpleadoId = user?.empleado?.id;

  // Mapa indexado O(1) para lookups instantáneos
  const clientesMap = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes]);

  // Lista de Repartidores
  const repartidores = useMemo(() => {
    return empleados.filter(
      (e) => e.activo && (e.rol === "REPARTIDOR" || e.rol === "ADMIN" || e.rol === "SUPERVISOR"),
    );
  }, [empleados]);

  // Solo órdenes que son de delivery (entrega_domicilio === true o con dirección asignada)
  const deliveryOrders = useMemo(() => {
    return ordenesRaw.filter((o) => {
      if (o.estado === "ANULADA") return false;
      const cli = clientesMap.get(o.cliente_id);
      const isDelivery =
        o.entrega_domicilio ||
        (o.costo_envio && o.costo_envio > 0) ||
        !!cli?.direccion ||
        !!o.repartidor_id;
      if (!isDelivery) return false;

      // El REPARTIDOR solo puede ver las órdenes que le han sido asignadas a él
      if (isRepartidor) {
        return o.repartidor_id === currentEmpleadoId;
      }
      return true;
    });
  }, [ordenesRaw, clientesMap, isRepartidor, currentEmpleadoId]);

  // Lista de sectores únicos para el filtro
  const sectoresDisponibles = useMemo(() => {
    const set = new Set<string>();
    deliveryOrders.forEach((o) => {
      const cli = clientesMap.get(o.cliente_id);
      const s = o.sector_entrega || cli?.sector;
      if (s) set.add(s);
    });
    return Array.from(set);
  }, [deliveryOrders, clientesMap]);

  // KPIs de resumen
  const stats = useMemo(() => {
    const list = deliveryOrders;
    return {
      pendientes: list.filter((o) => ["RECIBIDA", "EN_PROCESO", "LISTA"].includes(o.estado)).length,
      enCamino: list.filter((o) => o.estado === "EN_CAMINO").length,
      entregadas: list.filter((o) => o.estado === "ENTREGADA").length,
      incidencias: list.filter((o) => o.estado === "INCIDENCIA").length,
      total: list.length,
      saldoPorCobrar: list
        .filter((o) =>
          ["RECIBIDA", "EN_PROCESO", "LISTA", "EN_CAMINO", "INCIDENCIA"].includes(o.estado),
        )
        .reduce((s, o) => s + (o.saldo || 0), 0),
    };
  }, [deliveryOrders]);

  // Filtro activo y Título Dinámico
  const hasActiveFilters = Boolean(
    filterStatus !== "TODAS" ||
    filterRepartidor !== "TODOS" ||
    filterSector !== "TODOS" ||
    query.trim().length > 0,
  );

  const sectionTitle = useMemo(() => {
    if (filterStatus === "LISTA") {
      return isRepartidor ? "Órdenes por Salir" : "Órdenes por Despachar";
    }
    if (filterStatus === "EN_CAMINO") {
      return "Órdenes en Ruta Activa";
    }
    if (filterStatus === "ENTREGADA") {
      return "Órdenes Entregadas";
    }
    if (filterStatus === "INCIDENCIA") {
      return "Órdenes con Incidencia";
    }
    if (filterRepartidor === "SIN_ASIGNAR") {
      return "Órdenes Sin Repartidor Asignado";
    }
    if (filterRepartidor !== "TODOS") {
      const rep = repartidores.find((r) => r.id === filterRepartidor);
      if (rep) return `Entregas de ${rep.nombre}`;
    }
    if (filterSector !== "TODOS") {
      return `Entregas en ${filterSector}`;
    }
    if (query.trim()) {
      return `Búsqueda: "${query.trim()}"`;
    }
    return "Todas las Entregas";
  }, [filterStatus, filterRepartidor, filterSector, query, repartidores, isRepartidor]);

  // Órdenes filtradas para mostrar en tarjetas / mapa
  const filteredOrders = useMemo(() => {
    return deliveryOrders
      .filter((o) => {
        const cli = clientesMap.get(o.cliente_id);

        // Filtro de Estado
        if (filterStatus === "LISTA") {
          if (!["RECIBIDA", "EN_PROCESO", "LISTA"].includes(o.estado)) return false;
        } else if (filterStatus !== "TODAS" && o.estado !== filterStatus) {
          return false;
        }

        // Filtro de Repartidor
        if (filterRepartidor === "SIN_ASIGNAR" && o.repartidor_id) return false;
        if (
          filterRepartidor !== "TODOS" &&
          filterRepartidor !== "SIN_ASIGNAR" &&
          o.repartidor_id !== filterRepartidor
        )
          return false;

        // Filtro de Sector
        const sector = o.sector_entrega || cli?.sector;
        if (filterSector !== "TODOS" && sector !== filterSector) return false;

        // Filtro de búsqueda
        const q = deferredQuery.trim().toLowerCase();
        if (!q) return true;
        return (
          o.numero.toLowerCase().includes(q) ||
          cli?.nombre.toLowerCase().includes(q) ||
          cli?.telefono?.includes(q) ||
          cli?.direccion?.toLowerCase().includes(q) ||
          sector?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
  }, [deliveryOrders, filterStatus, filterRepartidor, filterSector, deferredQuery, clientesMap]);

  // Paginación suave para fluidez total del DOM (36 por lote)
  const visibleOrders = useMemo(() => {
    return filteredOrders.slice(0, visibleCount);
  }, [filteredOrders, visibleCount]);

  useEffect(() => {
    setVisibleCount(36);
  }, [filterStatus, filterRepartidor, filterSector, deferredQuery]);

  // Actualizar estado de orden
  const updateStatus = useCallback(
    async (id: string, nextStatus: EstadoOrden) => {
      const o = ordenesRaw.find((x) => x.id === id);
      if (!o) return;
      try {
        const next: Orden = { ...o, estado: nextStatus };
        // Optimistic update
        setOrdenesRaw((prev) => prev.map((item) => (item.id === id ? next : item)));
        await saveOrden(next);
        queryClient.invalidateQueries({ queryKey: ["ordenes", tenant?.id] });

        const msg =
          nextStatus === "EN_CAMINO" ? "Orden en camino hacia el cliente" : "Estado actualizado";
        toast.success(msg);

        // Notificar por WhatsApp al cliente que su orden va en camino
        const cli = clientesMap.get(o.cliente_id);
        if (cli && tenant && nextStatus === "EN_CAMINO") {
          const { notificarWhatsApp } = await import("@/lib/whatsapp");
          const res = await notificarWhatsApp(tenant, cli, next, "en_camino");
          if (res.ok) {
            toastWhatsAppSuccess("Cliente notificado por WhatsApp");
          } else if (cli.telefono && isRepartidor) {
            // Si no tiene bot API de WhatsApp configurado, abrir chat directo de WhatsApp 1-tap para avisar al cliente
            const rawPhone = cli.telefono.replace(/\D/g, "");
            const waPhone = rawPhone.length === 10 ? `1${rawPhone}` : rawPhone;
            const cleanNum = (o.numero || "").replace(/^#/, "");
            const text = encodeURIComponent(
              `*¡Hola ${cli.nombre}!* Te informamos que tu orden *${cleanNum}* de *${tenant.nombre}* ya va en camino hacia tu dirección con nuestro repartidor. ¡Nos vemos en breve!`,
            );
            window.open(`https://wa.me/${waPhone}?text=${text}`, "_blank");
          }
        }
      } catch (err) {
        toast.error("Error al actualizar estado");
      }
    },
    [ordenesRaw, tenant, queryClient, clientesMap, isRepartidor],
  );

  // Asignar Repartidor a Orden
  const handleAssignDriver = useCallback(
    async (orderId: string, repartidorId: string) => {
      const o = ordenesRaw.find((x) => x.id === orderId);
      if (!o) return;
      try {
        const repId = repartidorId === "NONE" ? undefined : repartidorId;
        if (o.repartidor_id === repId) return;
        const next: Orden = { ...o, repartidor_id: repId };
        // Optimistic update so it's instantaneous!
        setOrdenesRaw((prev) => prev.map((item) => (item.id === orderId ? next : item)));
        await saveOrden(next);
        queryClient.invalidateQueries({ queryKey: ["ordenes", tenant?.id] });
        toast.success("Repartidor asignado con éxito");
      } catch (err) {
        toast.error("Error al asignar repartidor");
      }
    },
    [ordenesRaw, tenant?.id, queryClient],
  );

  const selectedOrder = useMemo(
    () => ordenesRaw.find((o) => o.id === detailId),
    [ordenesRaw, detailId],
  );
  const selectedClient = useMemo(
    () => (selectedOrder ? clientesMap.get(selectedOrder.cliente_id) : undefined),
    [clientesMap, selectedOrder],
  );
  const selectedDriver = useMemo(
    () => empleados.find((e) => e.id === selectedOrder?.repartidor_id),
    [empleados, selectedOrder],
  );

  if (
    !user ||
    !user.tenant ||
    user.tenant.id === "__loading__" ||
    (loadingOrdenes && rawOrds.length === 0)
  ) {
    return <GlobalPageLoader text="Cargando logística..." />;
  }

  const activeTenant = user.tenant;

  return (
    <div
      style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" }}
      className="w-full space-y-5 pb-12 font-['Plus_Jakarta_Sans',sans-serif] animate-in fade-in-50 duration-300"
    >
      {/* Header Hero Section */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 bg-surface p-5 sm:p-6 lg:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Text & Badge */}
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1B4B73]/10 text-[#1B4B73] dark:bg-sky-950/60 dark:text-sky-300 px-3 py-1 text-[11px] font-black uppercase tracking-wider">
                <Truck className="h-3.5 w-3.5 text-[#F0B900]" />{" "}
                {isRepartidor ? "Mi Ruta de Entregas" : "Centro de Despacho & Delivery"}
              </span>
              {stats.incidencias > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 px-2.5 py-0.5 text-[10px] font-bold border border-rose-500/20 animate-pulse">
                  <AlertTriangle className="h-3 w-3" /> {stats.incidencias} Incidencias
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-black tracking-tight text-foreground leading-tight">
              {isRepartidor ? "Mis Entregas Asignadas" : "Gestión de Rutas y Envíos a Domicilio"}
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
              {isRepartidor
                ? `Hola ${user.empleado.nombre || "Chofer"}, aquí tienes tus órdenes asignadas para entregar hoy. Navega con Waze o Google Maps y registra cobros con firma digital en pantalla.`
                : "Asigna repartidores, navega con Waze / Google Maps, confirma entregas con firma digital y asienta cobros en ruta automáticamente."}
            </p>
          </div>

          {/* Action Button */}
          {!isRepartidor && (
            <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
              <Button
                onClick={() => setShowManifest(true)}
                type="button"
                className="flex items-center gap-2 rounded-xl h-11 px-5 font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
              >
                <Printer className="h-4 w-4 text-[#F0B900] shrink-0" />
                <span>Imprimir Hoja de Ruta</span>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* 5 EXECUTIVE KPI CARDS (DISEÑO ESTANDARIZADO /CAJA /GASTOS) */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* 1. Por Despachar (Solid Azul Añil #1B4B73) */}
        <Card
          onClick={() => setFilterStatus(filterStatus === "LISTA" ? "TODAS" : "LISTA")}
          className={`p-4 sm:p-4.5 rounded-2xl bg-[#1B4B73] text-white shadow-md border-0 flex flex-col justify-between cursor-pointer transition-all active:scale-[0.98] hover:shadow-lg ${
            filterStatus === "LISTA" ? "ring-2 ring-[#F0B900]" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-[13px] uppercase tracking-wider text-white/90 font-black">
              {isRepartidor ? "Por Salir" : "Por Despachar"}
            </span>
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-[#F0B900]" />
          </div>
          <div className="my-1.5 font-display font-black tracking-tight text-xl sm:text-2xl truncate text-white">
            {stats.pendientes}
          </div>
          <div className="text-xs sm:text-[13px] font-bold text-white/90 truncate">
            Pendientes de salida
          </div>
        </Card>

        {/* 2. En Ruta Activa (Sky Sutil) */}
        <Card
          onClick={() => setFilterStatus(filterStatus === "EN_CAMINO" ? "TODAS" : "EN_CAMINO")}
          className={`p-4 sm:p-4.5 rounded-2xl bg-sky-500/10 dark:bg-sky-950/40 border border-sky-500/25 text-sky-800 dark:text-sky-300 shadow-2xs flex flex-col justify-between cursor-pointer transition-all active:scale-[0.98] hover:shadow-md ${
            filterStatus === "EN_CAMINO" ? "ring-2 ring-sky-500" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-[13px] uppercase tracking-wider text-sky-700 dark:text-sky-400 font-black">
              En Ruta Activa
            </span>
            <Truck className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="my-1.5 font-display font-black tracking-tight text-xl sm:text-2xl truncate text-sky-950 dark:text-sky-50">
            {stats.enCamino}
          </div>
          <div className="text-xs sm:text-[13px] font-bold text-sky-700/80 dark:text-sky-300/80 truncate">
            Orden en camino
          </div>
        </Card>

        {/* 3. Entregadas (Emerald Sutil) */}
        <Card
          onClick={() => setFilterStatus(filterStatus === "ENTREGADA" ? "TODAS" : "ENTREGADA")}
          className={`p-4 sm:p-4.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 shadow-2xs flex flex-col justify-between cursor-pointer transition-all active:scale-[0.98] hover:shadow-md ${
            filterStatus === "ENTREGADA" ? "ring-2 ring-emerald-500" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-[13px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-black">
              Entregadas
            </span>
            <PackageCheck className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="my-1.5 font-display font-black tracking-tight text-xl sm:text-2xl truncate text-emerald-950 dark:text-emerald-50">
            {stats.entregadas}
          </div>
          <div className="text-xs sm:text-[13px] font-bold text-emerald-700/80 dark:text-emerald-300/80 truncate">
            Completadas con éxito
          </div>
        </Card>

        {/* 4. Incidencias (Rose Sutil) */}
        <Card
          onClick={() => setFilterStatus(filterStatus === "INCIDENCIA" ? "TODAS" : "INCIDENCIA")}
          className={`p-4 sm:p-4.5 rounded-2xl bg-rose-500/10 dark:bg-rose-950/40 border border-rose-500/25 text-rose-800 dark:text-rose-300 shadow-2xs flex flex-col justify-between cursor-pointer transition-all active:scale-[0.98] hover:shadow-md ${
            filterStatus === "INCIDENCIA" ? "ring-2 ring-rose-500" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-[13px] uppercase tracking-wider text-rose-700 dark:text-rose-400 font-black">
              Incidencias
            </span>
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="my-1.5 font-display font-black tracking-tight text-xl sm:text-2xl truncate text-rose-950 dark:text-rose-50">
            {stats.incidencias}
          </div>
          <div className="text-xs sm:text-[13px] font-bold text-rose-700/80 dark:text-rose-300/80 truncate">
            Devueltas o reportadas
          </div>
        </Card>

        {/* 5. Cobrar en Ruta (Amber Sutil) */}
        <Card className="col-span-2 sm:col-span-1 p-4 sm:p-4.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/25 text-amber-800 dark:text-amber-300 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-[13px] uppercase tracking-wider text-amber-700 dark:text-amber-400 font-black">
              {isRepartidor ? "Cobro a Liquidar" : "Cobrar en Ruta"}
            </span>
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="my-1.5 font-display font-black tracking-tight text-xl sm:text-2xl truncate text-amber-950 dark:text-amber-50">
            {formatRD(stats.saldoPorCobrar)}
          </div>
          <div className="text-xs sm:text-[13px] font-bold text-amber-700/80 dark:text-amber-300/80 truncate">
            Saldo pendiente de cobro
          </div>
        </Card>
      </section>

      {/* Toolbar & Filters */}
      <section className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3 sm:gap-4">
          {/* Buscar entrega */}
          <div className="flex-1 min-w-[220px] space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Buscar entrega
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cliente, orden, teléfono o dirección"
                className="h-11 w-full rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 pl-10 pr-9 text-xs sm:text-sm font-medium focus-visible:ring-1 focus-visible:ring-primary shadow-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                  title="Borrar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Repartidor */}
          {!isRepartidor && (
            <div className="w-full lg:w-60 shrink-0 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Repartidor
              </label>
              <Select value={filterRepartidor} onValueChange={(val) => setFilterRepartidor(val)}>
                <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs sm:text-sm font-medium shadow-none">
                  <SelectValue placeholder="Todos los repartidores" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <SelectItem value="TODOS" className="text-xs sm:text-sm py-2.5 cursor-pointer">
                    Todos los repartidores
                  </SelectItem>
                  <SelectItem
                    value="SIN_ASIGNAR"
                    className="text-xs sm:text-sm font-semibold text-amber-600 dark:text-amber-400 py-2.5 cursor-pointer"
                  >
                    Sin asignar
                  </SelectItem>
                  {repartidores.map((r) => (
                    <SelectItem
                      key={r.id}
                      value={r.id}
                      className="text-xs sm:text-sm py-2.5 cursor-pointer"
                    >
                      {r.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Sector */}
          <div className="w-full lg:w-56 shrink-0 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Sector</label>
            <Select value={filterSector} onValueChange={(val) => setFilterSector(val)}>
              <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs sm:text-sm font-medium shadow-none">
                <SelectValue placeholder="Todos los sectores" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <SelectItem value="TODOS" className="text-xs sm:text-sm py-2.5 cursor-pointer">
                  Todos los sectores
                </SelectItem>
                {sectoresDisponibles.map((s) => (
                  <SelectItem
                    key={s}
                    value={s}
                    className="text-xs sm:text-sm py-2.5 cursor-pointer"
                  >
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conditional Limpiar & View Mode */}
          <div className="flex items-center gap-2 shrink-0 self-end">
            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFilterStatus("TODAS");
                  setFilterRepartidor("TODOS");
                  setFilterSector("TODOS");
                  setQuery("");
                }}
                className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs sm:text-sm gap-1.5 cursor-pointer shadow-none animate-in fade-in duration-200"
              >
                <X className="h-4 w-4" /> Limpiar
              </Button>
            )}

            {/* View Switcher */}
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 p-1 bg-slate-100/70 dark:bg-slate-800/60 h-11 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Vista Cuadrícula"
                className={`p-2 rounded-lg transition cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-slate-900 text-primary shadow-2xs font-bold"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                title="Vista Lista"
                className={`p-2 rounded-lg transition cursor-pointer ${
                  viewMode === "list"
                    ? "bg-white dark:bg-slate-900 text-primary shadow-2xs font-bold"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Section Title & Count */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {sectionTitle}
          </h2>
          <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
            {filteredOrders.length} {filteredOrders.length === 1 ? "orden" : "órdenes"}
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setFilterStatus("TODAS");
                setFilterRepartidor("TODOS");
                setFilterSector("TODOS");
                setQuery("");
              }}
              className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 px-2.5 py-0.5 text-xs font-bold transition cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>Restablecer filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* Entregas Section */}
      {filteredOrders.length === 0 ? (
        <Card className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 py-16 text-center bg-white/40 dark:bg-slate-900/40">
          <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-400">
            <Bike className="h-7 w-7" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
            {isRepartidor ? "No tienes entregas asignadas" : "No hay entregas en este filtro"}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            {isRepartidor
              ? "En este momento no tienes pedidos asignados a tu ruta. La cajera o administración te asignará órdenes cuando estén listas."
              : "Las órdenes marcadas con entrega a domicilio aparecerán automáticamente en este centro de despacho."}
          </p>
        </Card>
      ) : viewMode === "grid" ? (
        <section className="grid gap-4 sm:gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {visibleOrders.map((o) => (
            <DeliveryCard
              key={o.id}
              orden={o}
              cliente={clientesMap.get(o.cliente_id)}
              repartidores={repartidores}
              canAssignDriver={!isRepartidor}
              isRepartidor={isRepartidor}
              onAssignDriver={handleAssignDriver}
              onUpdateStatus={updateStatus}
              onOpenPOD={handleOpenPOD}
              onOpenIncidencia={handleOpenIncidencia}
              onSelectOrder={handleSelectOrder}
            />
          ))}
        </section>
      ) : (
        <section className="space-y-2">
          {visibleOrders.map((o) => (
            <DeliveryRow
              key={o.id}
              orden={o}
              cliente={clientesMap.get(o.cliente_id)}
              repartidores={repartidores}
              canAssignDriver={!isRepartidor}
              isRepartidor={isRepartidor}
              onAssignDriver={handleAssignDriver}
              onUpdateStatus={updateStatus}
              onOpenPOD={handleOpenPOD}
              onOpenIncidencia={handleOpenIncidencia}
              onSelectOrder={handleSelectOrder}
            />
          ))}
        </section>
      )}

      {/* Load More Button */}
      {filteredOrders.length > visibleCount && (
        <div className="flex justify-center pt-2 pb-6">
          <Button
            variant="outline"
            onClick={() => setVisibleCount((prev) => prev + 36)}
            className="h-10 px-6 rounded-xl font-bold text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs hover:bg-slate-50 cursor-pointer"
          >
            Cargar más órdenes (+36 restantes: {filteredOrders.length - visibleCount})
          </Button>
        </div>
      )}

      {/* Proof of Delivery Modal */}
      {podOrder && tenant && (
        <ProofOfDeliveryDialog
          open={!!podOrder}
          onOpenChange={(isOpen) => !isOpen && setPodOrder(null)}
          orden={podOrder}
          cliente={clientes.find((c) => c.id === podOrder.cliente_id)}
          tenant={tenant}
          onDelivered={() => {
            queryClient.invalidateQueries({ queryKey: ["ordenes", tenant?.id] });
            setPodOrder(null);
          }}
        />
      )}

      {/* Incidencia Modal */}
      {incidenciaOrder && tenant && (
        <IncidenciaDialog
          open={!!incidenciaOrder}
          onOpenChange={(isOpen) => !isOpen && setIncidenciaOrder(null)}
          orden={incidenciaOrder}
          cliente={clientes.find((c) => c.id === incidenciaOrder.cliente_id)}
          tenant={tenant}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["ordenes", tenant?.id] });
            setIncidenciaOrder(null);
          }}
        />
      )}

      {/* Delivery Manifest Print */}
      {showManifest && tenant && (
        <DeliveryManifestPrint
          tenant={tenant}
          ordenes={filteredOrders}
          clientes={clientes}
          repartidor={repartidores.find((r) => r.id === filterRepartidor)}
          onClose={() => setShowManifest(false)}
        />
      )}

      {/* Order Detail Modal (Compact & Clean) */}
      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="w-[94vw] max-w-md rounded-2xl p-0 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-950 min-w-0">
          {selectedOrder && (
            <div className="flex flex-col max-h-[85vh] w-full min-w-0 overflow-hidden">
              {/* Header con pr-14 para no chocar NUNCA con botón cerrar [X] */}
              <div className="relative border-b border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50/80 dark:bg-slate-900/50 pr-14 w-full min-w-0">
                <div className="w-full min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#1B4B73] text-white px-2 py-0.5 font-sans text-[11px] font-bold shadow-2xs">
                      <Package className="h-3 w-3 text-[#F0B900] shrink-0" />
                      {(selectedOrder.numero || "").replace(/^#/, "")}
                    </span>
                    {(selectedOrder.es_urgente || selectedOrder.prioridad === "URGENTE") && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-600 text-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-2xs">
                        <Zap className="h-2.5 w-2.5 fill-white text-white" /> Express
                      </span>
                    )}
                  </div>
                  <h2
                    className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug break-words line-clamp-2"
                    title={selectedClient?.nombre || "Cliente"}
                  >
                    {selectedClient?.nombre || "Cliente"}
                  </h2>
                </div>
              </div>

              {/* Body */}
              <div className="space-y-2.5 px-4 py-3 overflow-y-auto overflow-x-hidden w-full min-w-0">
                {/* Financial Summary */}
                <div className="grid grid-cols-2 gap-2 w-full min-w-0">
                  <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-2.5 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Total Orden
                    </span>
                    <p className="text-base font-black text-slate-900 dark:text-white mt-0.5 truncate">
                      {formatRD(selectedOrder.total)}
                    </p>
                  </div>
                  <div
                    className={`rounded-xl border p-2.5 min-w-0 ${
                      selectedOrder.saldo > 0
                        ? "border-rose-100 bg-rose-50/60 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200"
                        : "border-emerald-100 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200"
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                      {selectedOrder.saldo > 0 ? "Saldo por Cobrar" : "Estado de Pago"}
                    </span>
                    <p className="text-base font-black mt-0.5 truncate">
                      {selectedOrder.saldo > 0 ? formatRD(selectedOrder.saldo) : "Pagado"}
                    </p>
                  </div>
                </div>

                {/* Delivery Address & GPS */}
                <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-2.5 space-y-2 bg-white dark:bg-slate-900 w-full min-w-0">
                  <div className="flex items-start gap-2 min-w-0">
                    <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug break-words">
                        {selectedClient?.direccion ||
                          selectedOrder.direccion_entrega ||
                          "Sin dirección especificada"}
                      </p>
                      {(selectedClient?.sector ||
                        selectedOrder.sector_entrega ||
                        selectedClient?.edificio_apto ||
                        (selectedOrder as unknown as { edificio_apto_entrega?: string })
                          .edificio_apto_entrega ||
                        selectedClient?.referencia ||
                        selectedOrder.referencia_entrega) && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {(selectedClient?.sector || selectedOrder.sector_entrega) && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-bold">
                              <MapPin className="h-2.5 w-2.5" />{" "}
                              {selectedClient?.sector || selectedOrder.sector_entrega}
                            </span>
                          )}
                          {(selectedClient?.edificio_apto ||
                            (selectedOrder as unknown as { edificio_apto_entrega?: string })
                              .edificio_apto_entrega) && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 text-[10px] font-medium">
                              <Building className="h-2.5 w-2.5 text-slate-500 shrink-0" />
                              <span>
                                {selectedClient?.edificio_apto ||
                                  (selectedOrder as unknown as { edificio_apto_entrega?: string })
                                    .edificio_apto_entrega}
                              </span>
                            </span>
                          )}
                          {(selectedClient?.referencia || selectedOrder.referencia_entrega) && (
                            <span className="text-[10px] text-slate-500 italic truncate max-w-full">
                              Ref: {selectedClient?.referencia || selectedOrder.referencia_entrega}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Navigation 1-Tap Links */}
                  <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 w-full min-w-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg text-xs font-semibold text-sky-600 hover:bg-sky-50 border-sky-200/80 gap-1.5 min-w-0 w-full truncate"
                      asChild
                    >
                      <a
                        href={
                          selectedClient?.lat && selectedClient?.lng
                            ? `https://waze.com/ul?ll=${selectedClient.lat},${selectedClient.lng}&navigate=yes`
                            : `https://waze.com/ul?q=${encodeURIComponent(selectedClient?.direccion || "")}`
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Compass className="h-3 w-3 shrink-0" /> Abrir Waze
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg text-xs font-semibold text-emerald-600 hover:bg-emerald-50 border-emerald-200/80 gap-1.5 min-w-0 w-full truncate"
                      asChild
                    >
                      <a
                        href={
                          selectedClient?.lat && selectedClient?.lng
                            ? `https://www.google.com/maps/dir/?api=1&destination=${selectedClient.lat},${selectedClient.lng}`
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedClient?.direccion || "")}`
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Navigation className="h-3 w-3 shrink-0" /> Google Maps
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Driver Assignment & Contact */}
                <div className={`grid ${isRepartidor ? "grid-cols-1" : "grid-cols-2"} gap-2`}>
                  {!isRepartidor && (
                    <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-2.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        Repartidor Asignado
                      </span>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                        {selectedDriver ? selectedDriver.nombre : "Sin asignar"}
                      </p>
                    </div>
                  )}
                  <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-2.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      Teléfono de Contacto
                    </span>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                      {selectedClient?.telefono || "—"}
                    </p>
                  </div>
                </div>

                {/* Prendas / Artículos de la Orden */}
                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <span>Prendas / Artículos</span>
                      <span>
                        {selectedOrder.items.reduce((acc, it) => acc + it.cantidad, 0)} prendas
                      </span>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                      {selectedOrder.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 text-xs py-1 min-w-0"
                        >
                          <span
                            className="font-medium text-slate-700 dark:text-slate-300 truncate min-w-0 flex-1"
                            title={it.descripcion}
                          >
                            {it.cantidad}x {it.descripcion || "Prenda"}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white shrink-0">
                            {formatRD(it.precio * it.cantidad)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Proof of Delivery Details (if delivered) */}
                {selectedOrder.estado === "ENTREGADA" &&
                  (selectedOrder.pod_receptor ||
                    selectedOrder.pod_foto ||
                    selectedOrder.pod_firma) && (
                    <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 dark:bg-emerald-950/20 p-3 space-y-2">
                      <p className="text-[11px] font-bold uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Comprobante de
                        Entrega
                      </p>
                      {selectedOrder.pod_receptor && (
                        <p className="text-xs text-slate-700 dark:text-slate-300">
                          <strong>Recibido por:</strong> {selectedOrder.pod_receptor}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {selectedOrder.pod_foto && (
                          <div
                            className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-20 relative cursor-pointer hover:border-emerald-300 transition-all flex items-center justify-center"
                            onClick={() => {
                              if (!brokenPodImg && !selectedOrder.pod_foto?.startsWith("file://")) {
                                setZoomMedia({
                                  type: "foto",
                                  src: selectedOrder.pod_foto!,
                                  title: `Foto de Entrega - Orden #${selectedOrder.numero}`,
                                });
                              }
                            }}
                          >
                            <img
                              src={selectedOrder.pod_foto}
                              alt="Foto entrega"
                              className="w-full h-full object-cover"
                              onError={() => setBrokenPodImg(true)}
                            />
                            <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                              Foto
                            </span>
                          </div>
                        )}
                        {selectedOrder.pod_firma && (
                          <div
                            className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 h-20 relative cursor-pointer hover:border-emerald-300 transition-all flex items-center justify-center"
                            onClick={() =>
                              setZoomMedia({
                                type: "firma",
                                src: selectedOrder.pod_firma!,
                                title: `Firma - Orden #${selectedOrder.numero}`,
                              })
                            }
                          >
                            <img
                              src={selectedOrder.pod_firma}
                              alt="Firma cliente"
                              className="max-h-14 w-auto object-contain"
                            />
                            <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                              Firma
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 px-4 py-2.5 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailId(null)}
                  className="rounded-lg text-xs font-semibold h-8.5 px-3.5"
                >
                  Cerrar
                </Button>

                {selectedClient?.telefono && (
                  <Button
                    size="sm"
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 h-8.5 px-3.5 shadow-2xs"
                    asChild
                  >
                    <a
                      href={`https://wa.me/${selectedClient.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${selectedClient.nombre || ""}, te contactamos de ${tenant?.nombre || "Klynn"} respecto a tu entrega #${selectedOrder.numero}.`)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Phone className="h-3 w-3" /> WhatsApp
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Lightbox Zoom Comprobante POD (Foto o Firma) */}
      <Dialog open={!!zoomMedia} onOpenChange={(open) => !open && setZoomMedia(null)}>
        <DialogContent className="max-w-2xl rounded-3xl p-4 sm:p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {zoomMedia?.type === "foto" ? (
                <>
                  <Camera className="h-4.5 w-4.5 text-primary" />
                  <span>Foto del Comprobante de Entrega</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                  <span>Firma Digital del Receptor</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-3 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-3 max-h-[70vh]">
            <img
              src={zoomMedia?.src}
              alt={zoomMedia?.title || "Comprobante"}
              className="max-h-[62vh] w-auto max-w-full object-contain rounded-xl"
            />
          </div>

          <DialogFooter className="mt-4 flex sm:justify-between items-center">
            <span className="text-[11px] text-slate-500 truncate mr-2">{zoomMedia?.title}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoomMedia(null)}
              className="rounded-xl font-bold h-9 px-4"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface DeliveryCardProps {
  orden: Orden;
  cliente?: Cliente;
  repartidores: Empleado[];
  canAssignDriver?: boolean;
  isRepartidor?: boolean;
  onAssignDriver: (orderId: string, driverId: string) => void;
  onUpdateStatus: (id: string, s: EstadoOrden) => void;
  onOpenPOD: (orden: Orden) => void;
  onOpenIncidencia: (orden: Orden) => void;
  onSelectOrder: (id: string) => void;
}

const DeliveryCard = memo(function DeliveryCard({
  orden,
  cliente,
  repartidores,
  canAssignDriver = true,
  isRepartidor = false,
  onAssignDriver,
  onUpdateStatus,
  onOpenPOD,
  onOpenIncidencia,
  onSelectOrder,
}: DeliveryCardProps) {
  const totalPrendas = orden.items?.reduce((acc, it) => acc + it.cantidad, 0) || 0;
  const sector = orden.sector_entrega || cliente?.sector;
  const edificioApto =
    (orden as unknown as { edificio_apto_entrega?: string }).edificio_apto_entrega ||
    cliente?.edificio_apto;
  const referencia = orden.referencia_entrega || cliente?.referencia;
  const lat = orden.lat_entrega || cliente?.lat;
  const lng = orden.lng_entrega || cliente?.lng;
  const direccion = orden.direccion_entrega || cliente?.direccion || "Entrega a domicilio";

  const isPendingToDeliver = ["RECIBIDA", "EN_PROCESO", "LISTA"].includes(orden.estado);
  const isUrgent = Boolean(orden.es_urgente || orden.prioridad === "URGENTE");

  const statusMeta: Record<string, { label: string; chip: string; dot: string }> = {
    RECIBIDA: {
      label: isRepartidor ? "Por Entregar" : "Por Despachar",
      chip: "bg-amber-500 text-white font-bold shadow-xs border-transparent",
      dot: "bg-white",
    },
    EN_PROCESO: {
      label: isRepartidor ? "Por Entregar" : "Por Despachar",
      chip: "bg-amber-500 text-white font-bold shadow-xs border-transparent",
      dot: "bg-white",
    },
    LISTA: {
      label: isRepartidor ? "Por Entregar" : "Por Despachar",
      chip: "bg-amber-500 text-white font-bold shadow-xs border-transparent",
      dot: "bg-white",
    },
    EN_CAMINO: {
      label: "En Ruta",
      chip: "bg-sky-600 text-white font-bold shadow-xs border-transparent",
      dot: "bg-white",
    },
    ENTREGADA: {
      label: "Entregada",
      chip: "bg-emerald-600 text-white font-bold shadow-xs border-transparent",
      dot: "bg-white",
    },
    INCIDENCIA: {
      label: "Incidencia",
      chip: "bg-rose-600 text-white font-bold shadow-xs border-transparent",
      dot: "bg-white",
    },
  };

  const meta = statusMeta[orden.estado] || statusMeta.LISTA;

  const rawPhone = (cliente?.telefono || "").replace(/\D/g, "");
  const waPhone = rawPhone.length === 10 ? `1${rawPhone}` : rawPhone;

  const wazeUrl =
    lat && lng
      ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
      : `https://waze.com/ul?q=${encodeURIComponent(direccion)}`;
  const mapsUrl =
    lat && lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;

  return (
    <article
      onClick={() => onSelectOrder(orden.id)}
      className="group relative cursor-pointer rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] hover:shadow-lg hover:border-primary/40 dark:hover:border-primary/40 transition-all duration-200 flex flex-col justify-between gap-3.5"
    >
      <div className="space-y-3">
        {/* ROW 1: HEADER CENTRADO (NÚMERO DE ORDEN ENCIMA + ESTADO DEBAJO, AMBOS CENTRADOS) */}
        <div className="relative flex flex-col items-center justify-center text-center pb-3 border-b border-slate-100 dark:border-slate-800/80">
          {/* Menu 3-puntos (Flotando en esquina superior derecha) */}
          <div className="absolute top-0 right-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
                  title="Más opciones"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-52 rounded-2xl shadow-xl p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem
                  onClick={() => onSelectOrder(orden.id)}
                  className="text-xs cursor-pointer gap-2.5 font-semibold py-2 rounded-xl"
                >
                  <FileText className="h-4 w-4 text-primary" /> Ver Detalles de Orden
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  asChild
                  className="text-xs cursor-pointer gap-2.5 font-medium py-2 rounded-xl"
                >
                  <a href={wazeUrl} target="_blank" rel="noreferrer">
                    <Compass className="h-4 w-4 text-sky-600" /> Abrir en Waze
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="text-xs cursor-pointer gap-2.5 font-medium py-2 rounded-xl"
                >
                  <a href={mapsUrl} target="_blank" rel="noreferrer">
                    <Navigation className="h-4 w-4 text-emerald-600" /> Abrir en Google Maps
                  </a>
                </DropdownMenuItem>
                {cliente?.telefono && (
                  <DropdownMenuItem
                    asChild
                    className="text-xs cursor-pointer gap-2.5 font-medium py-2 rounded-xl"
                  >
                    <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noreferrer">
                      <MessageSquare className="h-4 w-4 text-emerald-600" /> Chat de WhatsApp
                    </a>
                  </DropdownMenuItem>
                )}
                {orden.estado !== "ENTREGADA" && (
                  <>
                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuItem
                      onClick={() => onOpenIncidencia(orden)}
                      className="text-xs cursor-pointer gap-2.5 font-bold text-rose-600 focus:text-rose-600 py-2 rounded-xl"
                    >
                      <AlertTriangle className="h-4 w-4 text-rose-600" /> Reportar Incidencia
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 1. NÚMERO DE ORDEN (Color Sólido Corporativo #1B4B73, centrado) */}
          <div className="flex items-center justify-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#1B4B73] text-white px-3 py-1 font-sans text-xs sm:text-[13px] font-bold tracking-tight shadow-xs">
              <Package className="h-3.5 w-3.5 text-[#F0B900] shrink-0" />
              <span>{(orden.numero || "").replace(/^#/, "")}</span>
            </span>

            {/* Rayito blanco en círculo rojo si es urgente */}
            {isUrgent && (
              <span
                className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-rose-600 text-white shrink-0 shadow-xs ring-2 ring-rose-100 dark:ring-rose-950"
                title="¡Orden Urgente / Express!"
              >
                <Zap className="h-3.5 w-3.5 fill-white text-white" />
              </span>
            )}
          </div>

          {/* 2. BADGE DE ESTADO DEBAJO DEL NÚMERO DE ORDEN, CENTRADO */}
          <div className="mt-1.5 flex justify-center">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border whitespace-nowrap shadow-2xs ${meta.chip}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${meta.dot}`} />
              <span>{meta.label}</span>
            </span>
          </div>
        </div>

        {/* ROW 2: TOTAL, PRENDAS & EL DEBE DEBAJO CENTRADO */}
        <div className="flex flex-col items-center justify-center text-center py-1">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-2xl sm:text-[26px] font-black font-display text-slate-900 dark:text-white tracking-tight leading-none">
              {formatRD(orden.total)}
            </span>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
              • {totalPrendas} {totalPrendas === 1 ? "prenda" : "prendas"}
            </span>
          </div>

          {/* Badge DEBE o PAGADO DEBAJO Y CENTRADO */}
          <div className="mt-2">
            {orden.saldo > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-rose-600 text-white shadow-xs whitespace-nowrap">
                <AlertCircle className="h-3.5 w-3.5 text-white shrink-0" />
                <span>Debe {formatRD(orden.saldo)}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-emerald-600 text-white shadow-xs whitespace-nowrap">
                <CheckCircle2 className="h-3.5 w-3.5 text-white shrink-0" />
                <span>Pagado</span>
              </span>
            )}
          </div>
        </div>

        {/* ROW 3: CLIENTE & BOTÓN VER DETALLES */}
        <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-950/50 p-3 sm:p-3.5 border border-slate-100 dark:border-slate-800/80 space-y-2.5">
          {/* Cliente & Contactos Directos */}
          <div className="flex items-center justify-between gap-2 w-full min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="h-7.5 w-7.5 rounded-lg bg-[#1B4B73] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                {cliente?.nombre ? cliente.nombre.charAt(0).toUpperCase() : "C"}
              </div>
              <h3
                className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors min-w-0 flex-1"
                title={cliente?.nombre || "Sin nombre"}
              >
                {cliente?.nombre || "Sin nombre"}
              </h3>
            </div>

            {cliente?.telefono && (
              <div
                className="flex items-center gap-1.5 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <a
                  href={`tel:${cliente.telefono}`}
                  title={`Llamar a ${cliente.telefono}`}
                  className="h-7.5 w-7.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-primary flex items-center justify-center transition shadow-2xs active:scale-95 cursor-pointer"
                >
                  <Phone className="h-3.5 w-3.5" />
                </a>
                <a
                  href={`https://wa.me/${waPhone}`}
                  target="_blank"
                  rel="noreferrer"
                  title="WhatsApp"
                  className="h-7.5 w-7.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center transition shadow-xs active:scale-95 cursor-pointer"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </div>

          {/* Botón con Icono y Color SÓLIDO (Sin color pastel): Ver detalles */}
          <Button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectOrder(orden.id);
            }}
            className="w-full h-9 rounded-xl bg-[#1B4B73] hover:bg-[#143a59] active:bg-[#0f2c44] text-white font-bold text-xs gap-1.5 shadow-xs transition active:scale-[0.98] cursor-pointer flex items-center justify-center border-0"
          >
            <FileText className="h-3.5 w-3.5 text-[#F0B900] shrink-0" />
            <span>Ver detalles</span>
          </Button>
        </div>

        {/* ROW 4: REPARTIDOR ASIGNADO (SELECTOR VELOZ Y ELEGANTE) */}
        {canAssignDriver && (
          <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-primary" /> Repartidor asignado
            </label>
            <Select
              value={orden.repartidor_id || "NONE"}
              onValueChange={(val) => onAssignDriver(orden.id, val)}
            >
              <SelectTrigger
                className={`h-9.5 w-full rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-none border ${
                  orden.repartidor_id
                    ? "bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border-slate-200/90 dark:border-slate-800"
                    : "bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/60"
                }`}
              >
                <SelectValue placeholder="Sin repartidor asignado" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <SelectItem
                  value="NONE"
                  className="text-xs sm:text-sm font-medium py-2 text-slate-500 cursor-pointer"
                >
                  Sin repartidor asignado
                </SelectItem>
                {repartidores.map((r) => (
                  <SelectItem
                    key={r.id}
                    value={r.id}
                    className="text-xs sm:text-sm font-medium py-2 cursor-pointer"
                  >
                    {r.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* ROW 5: ESTADO INFERIOR / ACCIONES CON COLORES SÓLIDOS */}
      <div
        className="pt-2 border-t border-slate-100 dark:border-slate-800/80"
        onClick={(e) => e.stopPropagation()}
      >
        {isPendingToDeliver &&
          (isRepartidor ? (
            <Button
              size="sm"
              onClick={() => onUpdateStatus(orden.id, "EN_CAMINO")}
              className="w-full h-9 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-xs sm:text-sm shadow-xs gap-1.5 transition active:scale-95 cursor-pointer border-0"
            >
              <Bike className="h-4 w-4" /> <span>¡Voy en Camino!</span>
            </Button>
          ) : !orden.repartidor_id ? (
            <div className="w-full h-9 rounded-xl bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs">
              <UserCheck className="h-3.5 w-3.5 shrink-0" />
              <span>Asigna un repartidor arriba</span>
            </div>
          ) : (
            <div className="w-full h-9 rounded-xl bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs">
              <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Esperando salida del repartidor</span>
            </div>
          ))}

        {orden.estado === "EN_CAMINO" &&
          (isRepartidor ? (
            <Button
              size="sm"
              onClick={() => onOpenPOD(orden)}
              className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs sm:text-sm shadow-xs gap-1.5 transition active:scale-95 cursor-pointer border-0"
            >
              <CheckCircle2 className="h-4 w-4" /> Entregar y Cobrar
            </Button>
          ) : (
            <div className="w-full h-9 rounded-xl bg-sky-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs">
              <Truck className="h-3.5 w-3.5 text-white animate-pulse shrink-0" />
              <span>Orden en camino</span>
            </div>
          ))}

        {orden.estado === "INCIDENCIA" && (
          <Button
            size="sm"
            onClick={() => onOpenIncidencia(orden)}
            className="w-full h-9 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs cursor-pointer flex items-center justify-center gap-1.5 border-0"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Ver Incidencia
          </Button>
        )}

        {orden.estado === "ENTREGADA" && (
          <div className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-white py-2 text-xs font-bold shadow-xs">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Entregada con éxito
          </div>
        )}
      </div>
    </article>
  );
});

const DeliveryRow = memo(function DeliveryRow({
  orden,
  cliente,
  repartidores,
  canAssignDriver = true,
  isRepartidor = false,
  onAssignDriver,
  onUpdateStatus,
  onOpenPOD,
  onOpenIncidencia,
  onSelectOrder,
}: DeliveryCardProps) {
  const totalPrendas = orden.items?.reduce((acc, it) => acc + it.cantidad, 0) || 0;
  const sector = orden.sector_entrega || cliente?.sector;
  const lat = orden.lat_entrega || cliente?.lat;
  const lng = orden.lng_entrega || cliente?.lng;
  const direccion = orden.direccion_entrega || cliente?.direccion || "Entrega a domicilio";
  const rawPhone = (cliente?.telefono || "").replace(/\D/g, "");
  const waPhone = rawPhone.length === 10 ? `1${rawPhone}` : rawPhone;
  const isUrgent = Boolean(orden.es_urgente || orden.prioridad === "URGENTE");

  const wazeUrl =
    lat && lng
      ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
      : `https://waze.com/ul?q=${encodeURIComponent(direccion)}`;
  const mapsUrl =
    lat && lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;

  return (
    <div
      onClick={() => onSelectOrder(orden.id)}
      className="group cursor-pointer rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:px-4 sm:py-3.5 shadow-2xs hover:shadow-md hover:border-primary/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
    >
      {/* Col 1: ID, urgency, status */}
      <div className="flex items-center gap-2 min-w-[170px]">
        <span className="font-sans text-xs font-bold text-white bg-[#1B4B73] px-2.5 py-1 rounded-lg shadow-2xs">
          {(orden.numero || "").replace(/^#/, "")}
        </span>
        {isUrgent && (
          <span
            className="inline-flex items-center justify-center h-5.5 w-5.5 rounded-full bg-rose-600 text-white shrink-0 shadow-2xs"
            title="¡Orden Urgente / Express!"
          >
            <Zap className="h-3 w-3 fill-white text-white" />
          </span>
        )}
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-white shadow-2xs">
          {orden.estado}
        </span>
      </div>

      {/* Col 2: Cliente & Tel */}
      <div className="min-w-[160px] max-w-[200px] truncate">
        <p
          className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-primary"
          title={cliente?.nombre || "Sin nombre"}
        >
          {cliente?.nombre || "Sin nombre"}
        </p>
        <p className="text-xs text-slate-500 truncate">{cliente?.telefono || "Sin teléfono"}</p>
      </div>

      {/* Col 3: Dirección & Sector */}
      <div className="flex-1 min-w-[180px] max-w-sm truncate text-xs text-slate-600 dark:text-slate-400">
        <p className="truncate font-medium">{direccion}</p>
        {sector && (
          <span className="inline-flex items-center gap-1 text-[10px] text-primary font-bold">
            <MapPin className="h-3 w-3" /> {sector}
          </span>
        )}
      </div>

      {/* Col 4: Totales & Deuda */}
      <div className="min-w-[120px] text-right whitespace-nowrap">
        <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
          {formatRD(orden.total)}
        </p>
        <div className="text-[11px] whitespace-nowrap mt-1">
          {orden.saldo > 0 ? (
            <span className="text-white bg-rose-600 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs whitespace-nowrap">
              Debe {formatRD(orden.saldo)}
            </span>
          ) : (
            <span className="text-white bg-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs whitespace-nowrap">
              Pagado
            </span>
          )}
        </div>
      </div>

      {/* Col 5: Driver selector */}
      {canAssignDriver && (
        <div className="min-w-[180px]" onClick={(e) => e.stopPropagation()}>
          <Select
            value={orden.repartidor_id || "NONE"}
            onValueChange={(val) => onAssignDriver(orden.id, val)}
          >
            <SelectTrigger className="h-9 w-full rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-950 border-slate-200/90 dark:border-slate-800 shadow-none">
              <SelectValue placeholder="Sin repartidor" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <SelectItem value="NONE" className="text-xs py-2 text-slate-500">
                Sin repartidor
              </SelectItem>
              {repartidores.map((r) => (
                <SelectItem key={r.id} value={r.id} className="text-xs py-2">
                  {r.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Col 6: Quick Menu */}
      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        {cliente?.telefono && (
          <a
            href={`https://wa.me/${waPhone}`}
            target="_blank"
            rel="noreferrer"
            className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition cursor-pointer"
          >
            <MessageSquare className="h-4 w-4" />
          </a>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition cursor-pointer">
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 rounded-2xl shadow-xl p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
          >
            <DropdownMenuItem
              onClick={() => onSelectOrder(orden.id)}
              className="text-xs cursor-pointer font-medium py-2 rounded-xl"
            >
              <FileText className="h-4 w-4 mr-2 text-primary" /> Ver Detalles
            </DropdownMenuItem>
            <DropdownMenuItem
              asChild
              className="text-xs cursor-pointer font-medium py-2 rounded-xl"
            >
              <a href={wazeUrl} target="_blank" rel="noreferrer">
                <Compass className="h-4 w-4 mr-2 text-sky-600" /> Waze
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem
              asChild
              className="text-xs cursor-pointer font-medium py-2 rounded-xl"
            >
              <a href={mapsUrl} target="_blank" rel="noreferrer">
                <Navigation className="h-4 w-4 mr-2 text-emerald-600" /> Google Maps
              </a>
            </DropdownMenuItem>
            {orden.estado !== "ENTREGADA" && (
              <DropdownMenuItem
                onClick={() => onOpenIncidencia(orden)}
                className="text-xs cursor-pointer font-semibold text-rose-600 py-2 rounded-xl"
              >
                <AlertTriangle className="h-4 w-4 mr-2" /> Reportar Incidencia
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
