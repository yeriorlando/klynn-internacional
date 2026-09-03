import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
import { EstadoBadge } from "@/components/klynn/TenantShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  getOrdenes,
  getCajaAbierta,
  getMovimientos,
  getGastos,
  getClienteById,
  getClientes,
  formatRD,
  formatDateTimeRD,
  saveOrden,
  updateOrdenEstado,
  crearNotificacion,
  getTenantById,
  type Orden,
  type Gasto,
  type Cliente,
  type EstadoOrden,
  type Tenant,
  can,
  isModuleEnabled,
} from "@/lib/storage";
import { usePlans } from "@/hooks/use-queries";
import {
  Receipt,
  Package,
  Wallet,
  AlertCircle,
  ArrowUpRight,
  FilePlus2,
  Plus,
  Truck,
  TrendingUp,
  Inbox,
  RefreshCw,
  CircleCheck,
  Ban,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  MoreHorizontal,
  Eye,
  DollarSign,
  Printer,
  DownloadCloud,
  AlertTriangle,
  Zap,
  Check,
  CheckCircle2,
  ArrowLeft,
  ArrowUpCircle,
  XCircle,
  Info,
  ArrowRight,
  Clock,
  MessageCircle,
  Loader2,
  Shirt,
} from "lucide-react";
import {
  useOrdenes,
  useCajaAbierta,
  useGastos,
  useClientes,
  useMovimientos,
  useEmpleados,
  useECFConfig,
  useECFSequences,
} from "@/hooks/use-queries";
import { TenantShell } from "@/components/klynn/TenantShell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { notificarWhatsApp, obtenerOrdenesSinRetirar } from "@/lib/whatsapp";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  CobrarOrdenDialog,
  TicketPrintPortal,
  FacturaA4PrintPortal,
  OrderDetail,
  esTransicionEstadoPermitida,
  isMetodoCredito,
  EstadoOrdenDialog,
} from "@/components/klynn/OrdenesPage";
import { UbicacionSelectorDialog } from "@/components/klynn/UbicacionSelectorDialog";

export const Route = createFileRoute("/t/$slug/")({
  component: DashboardPage,
});

function esParaHoy(fechaStr?: string): boolean {
  if (!fechaStr) return false;
  const d = new Date(fechaStr);
  const hoy = new Date();
  return (
    d.getDate() === hoy.getDate() &&
    d.getMonth() === hoy.getMonth() &&
    d.getFullYear() === hoy.getFullYear()
  );
}

function esAtrasada(fechaStr?: string, estado?: EstadoOrden): boolean {
  if (!fechaStr || estado === "ENTREGADA" || estado === "ANULADA") return false;
  return new Date(fechaStr).getTime() < Date.now();
}

function DashboardPage() {
  const user = useRequireAuth();
  const tenantId = user?.tenant?.id || "";
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const isAuthorized = user?.empleado?.rol === "ADMIN" || user?.empleado?.rol === "SUPERVISOR";
  const { data: ecfConfig } = useECFConfig(tenantId);
  const { data: ecfSequences = [] } = useECFSequences(tenantId);

  const hasSecuenciaCredito = ecfSequences.some(
    (s) => s.is_active && (s.tipo_ecf === "E34" || s.tipo_ecf === "34" || s.tipo_ecf === "B04") && (s.valor_actual === undefined || s.valor_actual < s.valor_final)
  );
  const hasSecuenciaDebito = ecfSequences.some(
    (s) => s.is_active && (s.tipo_ecf === "E33" || s.tipo_ecf === "33" || s.tipo_ecf === "B03") && (s.valor_actual === undefined || s.valor_actual < s.valor_final)
  );

  const emp = user?.empleado;
  const hasNotaCredito = emp ? can(emp, "nota-credito") : false;
  const hasNotaDebito = emp ? can(emp, "nota-debito") : false;
  const hasAnularOrden = emp ? can(emp, "anular-orden") : false;
  const hasCondonarDeuda = emp ? can(emp, "condonar-deuda") : false;

  const { data: ordenes = [], isLoading: loadingOrdenes } = useOrdenes(tenantId);
  const { data: caja, isLoading: loadingCaja } = useCajaAbierta(tenantId);
  const { data: gastos = [], isLoading: loadingGastos } = useGastos(tenantId);
  const { data: clientes = [], isLoading: loadingClientes } = useClientes(tenantId);
  const { data: movs = [], isLoading: loadingMovs } = useMovimientos(tenantId, caja?.id);
  const { data: empleados = [] } = useEmpleados(tenantId);
  const { data: plans = [] } = usePlans();

  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('polar_success') === 'true') {
      window.history.replaceState({}, '', window.location.pathname);
      const targetTenantId = user?.tenant?.id;
      if (targetTenantId && targetTenantId !== '__loading__') {
        getTenantById(targetTenantId).then((fresh) => {
          if (fresh) {
            queryClient.invalidateQueries();
            toast.success("¡Suscripción confirmada y activada con éxito!", {
              description: `Tu cuenta ahora tiene acceso completo al plan ${(fresh.plan_id || '').toUpperCase()}.`,
              duration: 8000,
            });
          }
        });
      }
    }
  }, [user?.tenant?.id, queryClient]);

  useEffect(() => {
    if (!openMenuId) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".action-menu-container")) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [openMenuId]);

  const [view, setView] = useState<Orden | null>(null);
  const [cobrarOrden, setCobrarOrden] = useState<Orden | null>(null);
  const [showPrint, setShowPrint] = useState<Orden | null>(null);
  const [showPrintProduccion, setShowPrintProduccion] = useState<Orden | null>(null);
  const [pagoRecibidoParaTicket, setPagoRecibidoParaTicket] = useState<number | undefined>(
    undefined,
  );
  const [showDownloadA4, setShowDownloadA4] = useState<Orden | null>(null);
  const [estadoModal, setEstadoModal] = useState<Orden | null>(null);
  const [notificandoLote, setNotificandoLote] = useState(false);

  const loading = loadingOrdenes || loadingCaja || loadingGastos || loadingClientes || loadingMovs;

  const tenant = user?.tenant as Tenant;
  const plan = plans.find((p) => p.id === tenant?.plan_id);
  const hasWhatsApp = isModuleEnabled(tenant, "whatsapp", plan);
  const hasProcesos = isModuleEnabled(tenant, "procesos", plan);
  const diasSinRetirarConfig = tenant?.config?.dias_almacenamiento_sin_retirar || tenant?.config?.whatsapp?.dias_recordatorio_sin_retirar || 5;

  const isTallerEnabled = useMemo(() => {
    return Boolean(
      tenant?.config?.ticket_imprimir_taller_auto ||
      (typeof window !== "undefined" && (
        JSON.parse(localStorage.getItem(`klynn_tenant_id_${tenantId}`) || '{}')?.config?.ticket_imprimir_taller_auto ||
        JSON.parse(localStorage.getItem(`klynn_tenant_cache_${tenant?.slug || ''}`) || '{}')?.config?.ticket_imprimir_taller_auto
      ))
    );
  }, [tenant?.config?.ticket_imprimir_taller_auto, tenant?.slug, tenantId]);

  const isMarquillasEnabled = useMemo(() => {
    return Boolean(
      tenant?.config?.ticket_imprimir_marquillas_auto ||
      (typeof window !== "undefined" && (
        JSON.parse(localStorage.getItem(`klynn_tenant_id_${tenantId}`) || '{}')?.config?.ticket_imprimir_marquillas_auto ||
        JSON.parse(localStorage.getItem(`klynn_tenant_cache_${tenant?.slug || ''}`) || '{}')?.config?.ticket_imprimir_marquillas_auto
      ))
    );
  }, [tenant?.config?.ticket_imprimir_marquillas_auto, tenant?.slug, tenantId]);

  const ordenesSinRetirar = useMemo(() => {
    return obtenerOrdenesSinRetirar(ordenes, diasSinRetirarConfig);
  }, [ordenes, diasSinRetirarConfig]);

  async function notificarTodosAlmacenados() {
    if (ordenesSinRetirar.length === 0) return;
    setNotificandoLote(true);
    let enviados = 0;
    let errores = 0;
    const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

    for (let i = 0; i < ordenesSinRetirar.length; i++) {
      const item = ordenesSinRetirar[i];
      const cli = clientes.find((c) => c.id === item.orden.cliente_id);
      if (cli && cli.telefono) {
        const res = await notificarWhatsApp(tenant, cli, item.orden, "sin_retirar");
        if (res.ok) enviados++;
        else errores++;

        // Pausa anti-spam humanizada (2.5s - 3.5s) entre cada mensaje
        if (i < ordenesSinRetirar.length - 1) {
          await delay(2500 + Math.random() * 1000);
        }
      }
    }

    setNotificandoLote(false);
    if (enviados > 0) {
      toast.success(`Se enviaron ${enviados} recordatorio(s) por WhatsApp ✅`);
    }
    if (errores > 0) {
      toast.error(`${errores} cliente(s) no pudieron ser notificados.`);
    }
  }

  const [conveyorOrden, setConveyorOrden] = useState<Orden | null>(null);
  const [conveyorUbicacion, setConveyorUbicacion] = useState("");
  const [savingConveyor, setSavingConveyor] = useState(false);

  async function cambiarEstado(o: Orden, estado: EstadoOrden): Promise<boolean> {
    if (!esTransicionEstadoPermitida(o.estado, estado, o.saldo, o.metodo_pago)) {
      if (estado === "ENTREGADA" && o.saldo > 0 && !isMetodoCredito(o.metodo_pago)) {
        toast.error("No se puede entregar una orden con saldo pendiente si no es a crédito");
      }
      return true;
    }

    // If marking as LISTA and conveyor is enabled, show the modal first
    const isConveyorEnabled = Boolean(
      tenant?.config?.usar_ubicacion_ropa ||
      (typeof window !== "undefined" && (
        JSON.parse(localStorage.getItem(`klynn_tenant_id_${tenantId}`) || '{}')?.config?.usar_ubicacion_ropa ||
        JSON.parse(localStorage.getItem(`klynn_tenant_cache_${tenant?.slug || ''}`) || '{}')?.config?.usar_ubicacion_ropa
      ))
    );

    if (estado === "LISTA" && isConveyorEnabled) {
      setConveyorOrden(o);
      setConveyorUbicacion(o.ubicacion_ropa || "");
      return false;
    }

    try {
      const ordenActualizada: Orden = { ...o, estado };

      // Actualización directa e instantánea de la tabla de órdenes en React Query
      queryClient.setQueryData<Orden[]>(["ordenes", tenantId], (old) => {
        if (!old) return [ordenActualizada];
        return old.map((item) => (item.id === o.id ? ordenActualizada : item));
      });
      queryClient.setQueriesData({ queryKey: ["ordenes"] }, (old: Orden[] | undefined) => {
        if (!old) return old;
        return old.map((item) => (item.id === o.id ? ordenActualizada : item));
      });

      if (estadoModal && estadoModal.id === o.id) {
        setEstadoModal(ordenActualizada);
      }

      await saveOrden(ordenActualizada);
      await updateOrdenEstado(o.id, estado);
      queryClient.invalidateQueries({ queryKey: ["ordenes", tenantId] });
      if (estado === "LISTA" || estado === "ENTREGADA") {
        const cli = clientes.find((c) => c.id === o.cliente_id);
        if (cli) {
          toast.success(
            estado === "LISTA"
              ? "Orden lista — notificando al cliente..."
              : "Orden entregada — notificando al cliente...",
          );
          notificarWhatsApp(tenant, cli, { ...o, estado }, estado === "LISTA" ? "lista" : "entregada").then(
            (r) => {
              if (r.ok) toast.success("WhatsApp enviado al cliente ✅");
            },
          );
        }

        if (estado === "ENTREGADA") {
          const cleanNum = (o.numero || "").replace(/^#/, "");
          crearNotificacion({
            tenant_id: tenantId,
            titulo: `🛵 Orden #${cleanNum} Entregada`,
            mensaje: `Orden entregada a ${cli?.nombre || "Cliente"}. Saldo: ${o.saldo > 0 ? formatRD(o.saldo) : "Pagado 100%"}`,
            tipo: "SUCCESS",
            leida: false,
            link: `/t/${tenant.slug}/logistica`,
          });
        }
      }
      return true;
    } catch (err: any) {
      toast.error("Error al actualizar estado");
      queryClient.invalidateQueries({ queryKey: ["ordenes", tenantId] });
      return true;
    }
  }

  async function confirmarConveyor(ubicacionParam?: string) {
    if (!conveyorOrden) return;
    const ubiToUse = (ubicacionParam !== undefined ? ubicacionParam : conveyorUbicacion).trim();
    if (!ubiToUse && tenant?.config?.usar_ubicacion_ropa) {
      toast.error("Debes seleccionar una ubicación en estantería para marcar la orden como Lista");
      return;
    }
    setSavingConveyor(true);
    try {
      const ordenActualizada = { ...conveyorOrden, estado: "LISTA" as EstadoOrden, ubicacion_ropa: ubiToUse || undefined };
      
      queryClient.setQueryData<Orden[]>(['ordenes', tenantId], (old) => {
        if (!old) return [ordenActualizada];
        return old.map(item => item.id === conveyorOrden.id ? ordenActualizada : item);
      });
      queryClient.setQueriesData({ queryKey: ['ordenes'] }, (old: Orden[] | undefined) => {
        if (!old) return old;
        return old.map(item => item.id === conveyorOrden.id ? ordenActualizada : item);
      });

      await saveOrden(ordenActualizada);
      await updateOrdenEstado(conveyorOrden.id, "LISTA" as EstadoOrden, ubiToUse || undefined);
      queryClient.invalidateQueries({ queryKey: ['ordenes', tenantId] });
      
      const cli = clientes.find((c) => c.id === conveyorOrden.cliente_id);
      if (cli) {
        notificarWhatsApp(tenant, cli, ordenActualizada, "lista").then((r) => {
          if (r.ok) toast.success("WhatsApp enviado al cliente ✅");
        });
      }
      toast.success("Orden marcada como Lista ✓");
      setConveyorOrden(null);
      setConveyorUbicacion("");
    } catch (err: any) {
      toast.error("Error al guardar ubicación");
    } finally {
      setSavingConveyor(false);
    }
  }

  useEffect(() => {
    setCurrentPage(1);
  }, [ordenes.length]);

  const [periodoChart, setPeriodoChart] = useState<"7D" | "30D" | "TODO">("7D");

  const stats = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const ordenesHoy = ordenes.filter((o) => new Date(o.creado_en) >= hoy);
    const ventasHoy = ordenesHoy
      .filter((o) => o.estado !== "ANULADA")
      .reduce((s, o) => s + o.total, 0);
    const activas = ordenes.filter((o) => ["RECIBIDA", "EN_PROCESO", "LISTA"].includes(o.estado));
    const listas = ordenes.filter((o) => o.estado === "LISTA");
    const cuentasCobrar = ordenes.filter(
      (o) => o.saldo > 0 && o.estado !== "ANULADA" && o.metodo_pago === "CREDITO",
    );
    const totalCxC = cuentasCobrar.reduce((s, o) => s + o.saldo, 0);
    const gastosHoy = gastos
      .filter((g) => new Date(g.fecha) >= hoy)
      .reduce((s, g) => s + g.monto, 0);

    const efectivo =
      movs
        .filter((m) => m.metodo === "EFECTIVO" || m.tipo === "INGRESO")
        .reduce((s, m) => s + m.monto, 0) -
      movs
        .filter((m) => ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA"].includes(m.tipo))
        .reduce((s, m) => s + m.monto, 0);

    const chartData: Array<{ dia: string; total: number }> = [];

    if (periodoChart === "7D") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        const total = ordenes
          .filter(
            (o) =>
              o.estado !== "ANULADA" && new Date(o.creado_en) >= d && new Date(o.creado_en) < next,
          )
          .reduce((s, o) => s + o.total, 0);
        chartData.push({ dia: d.toLocaleDateString("es-DO", { weekday: "short" }), total });
      }
    } else if (periodoChart === "30D") {
      for (let i = 5; i >= 0; i--) {
        const end = new Date();
        end.setDate(end.getDate() - i * 5);
        end.setHours(23, 59, 59, 999);
        const start = new Date(end);
        start.setDate(start.getDate() - 4);
        start.setHours(0, 0, 0, 0);
        const total = ordenes
          .filter(
            (o) =>
              o.estado !== "ANULADA" &&
              new Date(o.creado_en) >= start &&
              new Date(o.creado_en) <= end,
          )
          .reduce((s, o) => s + o.total, 0);
        const label = `${start.getDate()}/${start.getMonth() + 1}`;
        chartData.push({ dia: label, total });
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const total = ordenes
          .filter(
            (o) =>
              o.estado !== "ANULADA" && new Date(o.creado_en) >= d && new Date(o.creado_en) < next,
          )
          .reduce((s, o) => s + o.total, 0);
        chartData.push({ dia: d.toLocaleDateString("es-DO", { month: "short" }), total });
      }
    }

    const max = Math.max(1, ...chartData.map((v) => v.total));
    const totalPeriodo = chartData.reduce((s, v) => s + v.total, 0);
    const diasDivider =
      periodoChart === "7D" ? 7 : periodoChart === "30D" ? 30 : chartData.length * 30;
    const promedioDiario = totalPeriodo / diasDivider;

    return {
      ventasHoy,
      activas,
      listas,
      cuentasCobrar,
      totalCxC,
      gastosHoy,
      efectivo,
      chartData,
      max,
      totalPeriodo,
      promedioDiario,
    };
  }, [ordenes, movs, gastos, periodoChart]);

  const {
    ventasHoy,
    activas,
    listas,
    cuentasCobrar,
    totalCxC,
    gastosHoy,
    efectivo,
    chartData,
    max,
    totalPeriodo,
    promedioDiario,
  } = stats;

  const sortedOrdenes = useMemo(() => {
    return [...ordenes].sort((a, b) => +new Date(b.creado_en) - +new Date(a.creado_en));
  }, [ordenes]);

  const ordersPerPage = 5;
  const totalPages = Math.ceil(sortedOrdenes.length / ordersPerPage);

  const paginatedOrdenes = useMemo(() => {
    const startIndex = (currentPage - 1) * ordersPerPage;
    return sortedOrdenes.slice(startIndex, startIndex + ordersPerPage);
  }, [sortedOrdenes, currentPage]);

  if (!user || user.tenant.id === "__loading__" || loading) {
    return <GlobalPageLoader text="Cargando panel de control..." />;
  }

  return (
    <div>
      <PageHeader
        title={`Hola, ${user.empleado.nombre.split(" ")[0]} 👋`}
        description="Resumen operativo de tu lavandería en tiempo real."
      >
        <Link to="/t/$slug/nueva-orden" params={{ slug: tenant.slug }}>
          <Button className="bg-[#1B4B73] hover:bg-[#143a59] text-white font-bold h-10 px-5 rounded-xl shadow-md gap-2 cursor-pointer active:scale-95 transition-all text-xs sm:text-sm flex items-center border border-[#1B4B73]">
            <Plus className="h-4 w-4 text-[#F0B900] stroke-[3]" />
            <span>Nueva orden</span>
          </Button>
        </Link>
      </PageHeader>

      {/* Alertas */}
      {hasProcesos && ordenesSinRetirar.length > 0 && (
        <Card className="mb-4 border-amber-500/30 bg-amber-500/10 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 font-bold">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-foreground">
                {ordenesSinRetirar.length} orden(es) almacenadas sin retirar (Más de {diasSinRetirarConfig} días)
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Prendas en estado LISTA desde hace más de {diasSinRetirarConfig} días. Notifica a tus clientes por WhatsApp para acelerar el retiro.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <Link to="/t/$slug/ordenes" params={{ slug: tenant.slug }} search={{ filter: "almacenadas" }}>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm bg-surface border border-border/80 text-foreground shadow-xs hover:bg-muted/60 transition-all cursor-pointer shrink-0 whitespace-nowrap h-10"
              >
                <Eye className="h-4 w-4 text-primary shrink-0" />
                <span>Ver órdenes</span>
              </Button>
            </Link>
            {hasWhatsApp && (
              <Button
                size="sm"
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer shrink-0 whitespace-nowrap h-10"
                disabled={notificandoLote}
                onClick={notificarTodosAlmacenados}
              >
                {notificandoLote ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <MessageCircle className="h-4 w-4 shrink-0" />}
                <span>Notificar por WhatsApp ({ordenesSinRetirar.length})</span>
              </Button>
            )}
          </div>
        </Card>
      )}

      {!caja && (
        <Card className="mb-6 flex flex-wrap items-center gap-3 border-destructive/30 bg-destructive/5 p-4 rounded-2xl shadow-2xs">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <div className="flex-1 min-w-[200px]">
            <div className="font-bold text-sm text-foreground">No hay caja abierta</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Abre la caja para comenzar a registrar ventas en efectivo.
            </div>
          </div>
          <Link to="/t/$slug/caja" params={{ slug: tenant.slug }}>
            <Button 
              variant="outline"
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm bg-surface border border-border/80 text-foreground shadow-xs hover:bg-muted/60 transition-all cursor-pointer h-10 shrink-0"
            >
              Ir a caja
            </Button>
          </Link>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div id="tour-kpi-ventas" className="h-full">
          <KPI
            title="Ventas del día"
            value={formatRD(ventasHoy)}
            icon={Receipt}
            sub="Facturado hoy"
            variant="primary"
          />
        </div>
        <div id="tour-kpi-activas" className="h-full">
          <KPI
            title="Órdenes activas"
            value={String(activas.length)}
            icon={Package}
            sub="Pendientes de procesar"
            variant="amber"
          />
        </div>
        <KPI
          title="Listas para entregar"
          value={String(listas.length)}
          icon={Truck}
          sub="Listas para retirar"
          variant="emerald"
        />
        <KPI
          title="Por cobrar"
          value={formatRD(totalCxC)}
          icon={AlertCircle}
          sub={`${cuentasCobrar.length} órdenes pendientes`}
          variant="rose"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Gráfica VoltFit Style */}
        <Card className="lg:col-span-2 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card">
          {/* Header con Filtros */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2 text-base font-bold text-foreground leading-tight">
                <TrendingUp className="h-5 w-5 text-primary shrink-0" />
                <span>Ventas y Tendencia</span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                Ventas operativas registradas{" "}
                {periodoChart === "7D"
                  ? "en los últimos 7 días"
                  : periodoChart === "30D"
                    ? "en los últimos 30 días"
                    : "en el historial general"}
                .
              </p>
            </div>

            {/* Time toggle pill */}
            <div className="inline-flex items-center p-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold shrink-0 self-start sm:self-auto border border-slate-200/50 dark:border-slate-700/50">
              <button
                type="button"
                onClick={() => setPeriodoChart("7D")}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${periodoChart === "7D" ? "bg-white dark:bg-slate-700 text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                7D
              </button>
              <button
                type="button"
                onClick={() => setPeriodoChart("30D")}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${periodoChart === "30D" ? "bg-white dark:bg-slate-700 text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                30D
              </button>
              <button
                type="button"
                onClick={() => setPeriodoChart("TODO")}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${periodoChart === "TODO" ? "bg-white dark:bg-slate-700 text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                Todo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Columna Izquierda: Bloques de Información (Stats Compactos) */}
            <div className="md:col-span-5 space-y-2">
              <div className="p-2.5 px-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block leading-none mb-1">
                  {periodoChart === "7D"
                    ? "Últimos 7 Días"
                    : periodoChart === "30D"
                      ? "Últimos 30 Días"
                      : "Ventas Totales"}
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-lg font-display font-black text-foreground">
                    {formatRD(totalPeriodo)}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800">
                    <TrendingUp className="h-2.5 w-2.5" /> +4.1%
                  </span>
                </div>
              </div>

              <div className="p-2.5 px-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block leading-none mb-1">
                  Promedio Diario
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-lg font-display font-black text-foreground">
                    {formatRD(promedioDiario)}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800">
                    <TrendingUp className="h-2.5 w-2.5" /> +2.6%
                  </span>
                </div>
              </div>

              <div className="p-2.5 px-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block leading-none mb-1">
                  Pico Máximo
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-lg font-display font-black text-foreground">
                    {formatRD(max)}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800">
                    <TrendingUp className="h-2.5 w-2.5" /> +5.4%
                  </span>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Gráfica de Barras Limpia y Profesional */}
            <div className="md:col-span-7 flex flex-col justify-end pt-2">
              <div className="flex items-end justify-between gap-1.5 sm:gap-2 h-36 px-1 border-b border-slate-200 dark:border-slate-800 pb-1">
                {chartData.map((v, i) => {
                  const pct = max > 0 ? (v.total / max) * 100 : 0;
                  return (
                    <div
                      key={i}
                      className="group relative flex flex-col items-center justify-end h-full flex-1"
                    >
                      {/* Tooltip Hover */}
                      <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-30 scale-90 group-hover:scale-100 origin-bottom">
                        <div className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-xl whitespace-nowrap">
                          {formatRD(v.total)}
                        </div>
                      </div>

                      {/* Monto sobre la barra */}
                      <span className="text-[9.5px] font-extrabold text-slate-500 dark:text-slate-400 mb-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        {v.total > 0
                          ? v.total >= 1000
                            ? `${(v.total / 1000).toFixed(1)}k`
                            : v.total
                          : ""}
                      </span>

                      {/* Barra limpia sin cápsula ni contenedor gris */}
                      <div
                        className="w-full max-w-[32px] sm:max-w-[40px] bg-primary rounded-t-lg transition-all duration-500 hover:bg-primary/90 shadow-2xs"
                        style={{ height: `${Math.max(v.total > 0 ? 6 : 2, pct)}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Labels de Días debajo de la línea base */}
              <div className="flex justify-between gap-1.5 sm:gap-2 px-1 pt-2">
                {chartData.map((v, i) => (
                  <span
                    key={i}
                    className="flex-1 text-center text-[10px] font-bold capitalize text-slate-500 dark:text-slate-400 truncate"
                  >
                    {v.dia}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Caja */}
        <Card id="tour-caja-turno" className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Caja del turno
            </div>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </div>
          {caja ? (
            <>
              <div className="font-display text-3xl font-black tracking-tight">{formatRD(efectivo)}</div>
              <div className="mt-1.5 flex items-center">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/80 shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <Clock className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  Abierta: {formatDateTimeRD(caja.abierta_en)}
                </span>
              </div>
              <div className="mt-4 space-y-1.5 text-sm">
                <Row k="Apertura" v={formatRD(caja.monto_inicial)} bold />
                <Row k="Movimientos" v={String(movs.length)} />
                <Row k="Gastos hoy" v={formatRD(gastosHoy)} bold />
              </div>
              <Link to="/t/$slug/caja" params={{ slug: tenant.slug }} className="mt-4 block">
                <Button className="w-full bg-primary hover:bg-primary/95 text-white font-bold rounded-xl h-9 text-xs gap-1.5 shadow-sm transition-all active:scale-[0.98]">
                  Ver detalle <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">Caja cerrada</div>
          )}
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 font-display text-xl font-black text-slate-900 dark:text-white">
              <Shirt className="h-5 w-5 text-primary shrink-0" />
              <span>Órdenes recientes</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {sortedOrdenes.length > 0
                ? `Mostrando ${(currentPage - 1) * ordersPerPage + 1} a ${Math.min(currentPage * ordersPerPage, sortedOrdenes.length)} de ${sortedOrdenes.length}`
                : "0 órdenes"}
            </div>
          </div>
          <Link
            to="/t/$slug/ordenes"
            params={{ slug: tenant.slug }}
            search={{ view: undefined, action: undefined }}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Ver todas <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-elevated text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Orden y Cliente</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Total</th>
                <th className="px-4 py-3 text-center">Saldo</th>
                <th className="px-4 py-3 text-center">Pago</th>
                <th className="px-4 py-3 text-center">Entrega</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrdenes.map((o) => {
                const c = clientes.find((x) => x.id === o.cliente_id);
                return (
                  <tr
                    key={o.id}
                    className="border-b border-border/50 hover:bg-accent/30 cursor-pointer transition-colors duration-100"
                    onClick={(e) => {
                      // Don't open modal if clicking on action buttons or badges
                      const target = e.target as HTMLElement;
                      if (
                        target.closest("button") ||
                        target.closest('[role="menuitem"]') ||
                        target.closest(".action-menu-container")
                      )
                        return;
                      if (o.estado !== "ANULADA" && !(o.estado === "ENTREGADA" && o.saldo <= 0))
                        setEstadoModal(o);
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef2f6] text-[#2c4e82] dark:bg-slate-800 dark:text-blue-400 animate-in fade-in zoom-in duration-200 border border-[#d6e0ea]/50">
                          <Receipt className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-mono text-sm font-bold text-[#2c4e82] dark:text-[#5c85c2]">
                            {o.numero}
                          </span>
                          <span
                            className="font-bold text-sm text-foreground truncate max-w-[220px]"
                            title={c ? `${c.nombre} ${c.apellido || ""}` : ""}
                          >
                            {c ? `${c.nombre} ${c.apellido || ""}` : "Consumidor Final"}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {formatDateTimeRD(o.creado_en)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {o.estado === "ANULADA" ? (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                          <Ban className="h-3 w-3" /> ANULADA
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                            o.estado === "RECIBIDA"
                              ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400"
                              : o.estado === "EN_PROCESO"
                                ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                                : o.estado === "LISTA"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                                  : o.estado === "ENTREGADA"
                                    ? "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-400"
                                    : "border-zinc-200 bg-zinc-50 text-zinc-600"
                          }`}
                        >
                          {o.estado === "RECIBIDA" && <Inbox className="h-3 w-3" />}
                          {o.estado === "EN_PROCESO" && <RefreshCw className="h-3 w-3" />}
                          {o.estado === "LISTA" && <CircleCheck className="h-3 w-3" />}
                          {o.estado === "ENTREGADA" && <Truck className="h-3 w-3" />}
                          {o.estado.replace("_", " ")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-medium">{formatRD(o.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        {o.saldo > 0 ? (
                          <>
                            <button
                              onClick={() => o.estado !== "ANULADA" && setCobrarOrden(o)}
                              className="transition-transform active:scale-95 cursor-pointer"
                              title="Cobrar saldo de esta orden"
                            >
                              <Badge
                                variant="outline"
                                className="border-warning/40 bg-warning/10 text-warning-foreground hover:bg-warning/25 transition-colors font-bold"
                              >
                                {formatRD(o.saldo)}
                              </Badge>
                            </button>
                            {o.estado !== "ANULADA" &&
                              (o.metodo_pago === "PAGO_AL_RETIRAR" ||
                                o.metodo_pago === "CREDITO") && (
                                <button
                                  onClick={() => setCobrarOrden(o)}
                                  className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                                >
                                  <DollarSign className="h-2.5 w-2.5" /> Cobrar
                                </button>
                              )}
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      {o.metodo_pago === "PAGO_AL_RETIRAR" ? "AL RETIRAR" : o.metodo_pago}
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-semibold">
                          {o.fecha_entrega ? formatDateTimeRD(o.fecha_entrega) : "—"}
                        </span>
                        <div className="flex flex-wrap gap-1.5 justify-center max-w-[140px]">
                          {o.es_urgente && (
                            <Badge className="bg-rose-500 hover:bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider py-0.5 px-1.5 rounded-sm gap-0.5 shadow-sm border-0">
                              <Zap className="h-2.5 w-2.5 fill-white" /> Urgente
                            </Badge>
                          )}
                          {o.fecha_entrega && esParaHoy(o.fecha_entrega) && (
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-black uppercase tracking-wider py-0.5 px-1.5 rounded-sm gap-0.5 shadow-sm border-0">
                              Hoy
                            </Badge>
                          )}
                          {o.fecha_entrega && esAtrasada(o.fecha_entrega, o.estado) && (
                            <Badge className="bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase tracking-wider py-0.5 px-1.5 rounded-sm gap-0.5 shadow-sm border-0 animate-pulse">
                              Atrasada
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center">
                        <div className="action-menu-container order-actions action-menu">
                          <button
                            type="button"
                            onClick={() => setOpenMenuId(openMenuId === o.id ? null : o.id)}
                            className={openMenuId === o.id ? "is-open" : ""}
                            title="Opciones de la orden"
                          >
                            <MoreVertical />
                          </button>
                          {openMenuId === o.id && (
                            <div
                              className="action-menu-popover"
                              onMouseLeave={() => setOpenMenuId(null)}
                            >
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setView(o);
                                }}
                              >
                                <Eye /> Ver Detalles
                              </button>

                              {o.saldo > 0 && o.estado !== "ANULADA" && (
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setCobrarOrden(o);
                                  }}
                                  className="text-emerald-600 dark:text-emerald-400"
                                >
                                  <DollarSign /> Cobrar Orden
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setShowPrint(o);
                                }}
                              >
                                <Printer /> Imprimir Ticket
                              </button>

                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setShowDownloadA4(o);
                                }}
                              >
                                <DownloadCloud /> Ver Factura A4
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {ordenes.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    Aún no hay órdenes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <div className="text-xs text-muted-foreground">
              Página {currentPage} de {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                className="h-8 rounded-xl text-xs font-bold transition-all active:scale-[0.98] bg-primary text-white hover:bg-primary/90"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Anterior
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-8 rounded-xl text-xs font-bold transition-all active:scale-[0.98] bg-primary text-white hover:bg-primary/90"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Siguiente <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Vista detalle */}
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {view && (
            <OrderDetail
              view={view}
              tenant={tenant}
              clientes={clientes}
              empleados={empleados}
              cambiarEstado={cambiarEstado}
              setView={setView}
              onPrint={() => setShowPrint(view)}
              onPrintProduccion={isTallerEnabled ? () => setShowPrintProduccion(view) : undefined}
              onPrintMarquillas={isMarquillasEnabled ? () => setShowPrintProduccion(view) : undefined}
              setCobrarOrden={setCobrarOrden}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de cobro unificado */}
      {cobrarOrden && (
        <CobrarOrdenDialog
          orden={cobrarOrden}
          onClose={() => setCobrarOrden(null)}
          tenant={tenant}
          cajaAbierta={caja}
          clientes={clientes}
          queryClient={queryClient}
          showPrintPortal={(upd, rec) => {
            setShowPrint(upd);
            setPagoRecibidoParaTicket(rec);
          }}
        />
      )}

      {/* Modal de impresión térmica */}
      {showPrint && (
        <TicketPrintPortal
          orden={showPrint}
          tenant={tenant}
          clientes={clientes}
          empleados={empleados}
          pagoRecibido={pagoRecibidoParaTicket}
          onClose={() => {
            setShowPrint(null);
            setPagoRecibidoParaTicket(undefined);
          }}
        />
      )}

      {/* Modal de impresión térmica para producción / taller */}
      {showPrintProduccion && (
        <TicketPrintPortal
          orden={showPrintProduccion}
          tenant={tenant}
          clientes={clientes}
          empleados={empleados}
          esProduccion={true}
          onClose={() => setShowPrintProduccion(null)}
        />
      )}

      {/* Visor e impresión de Factura A4 */}
      {showDownloadA4 && (
        <FacturaA4PrintPortal
          orden={showDownloadA4}
          tenant={tenant}
          clientes={clientes}
          empleados={empleados}
          onClose={() => setShowDownloadA4(null)}
        />
      )}

      {/* Modal de Estado de Orden */}
      <EstadoOrdenDialog
        estadoModal={estadoModal}
        setEstadoModal={setEstadoModal}
        clientes={clientes}
        cambiarEstado={cambiarEstado}
        hasNotaCredito={hasNotaCredito && hasSecuenciaCredito}
        hasNotaDebito={hasNotaDebito && hasSecuenciaDebito}
        hasCondonarDeuda={hasCondonarDeuda}
        hasAnularOrden={hasAnularOrden}
        ecfConfig={ecfConfig}
        setCredito={(o) => {
          setEstadoModal(null);
          navigate({
            to: "/t/$slug/ordenes",
            params: { slug: tenant.slug },
            search: { view: o.id, action: "credito" },
          });
        }}
        setMontoCredito={() => {}}
        setMotivoCredito={() => {}}
        setCodigoCredito={() => {}}
        setDebito={(o) => {
          setEstadoModal(null);
          navigate({
            to: "/t/$slug/ordenes",
            params: { slug: tenant.slug },
            search: { view: o.id, action: "debito" },
          });
        }}
        setCondonarOrden={(o) => {
          setEstadoModal(null);
          navigate({
            to: "/t/$slug/ordenes",
            params: { slug: tenant.slug },
            search: { view: o.id, action: "condonar" },
          });
        }}
        setAnular={(o) => {
          setEstadoModal(null);
          navigate({
            to: "/t/$slug/ordenes",
            params: { slug: tenant.slug },
            search: { view: o.id, action: "anular" },
          });
        }}
        setCobrarOrden={setCobrarOrden}
        setShowPrint={setShowPrint}
        setShowPrintProduccion={isTallerEnabled ? setShowPrintProduccion : undefined}
      />

      {/* Modal Estantería Virtual / Conveyor Ubicación */}
      <UbicacionSelectorDialog
        open={!!conveyorOrden}
        onOpenChange={(o) => {
          if (!o) {
            setConveyorOrden(null);
            setConveyorUbicacion("");
          }
        }}
        ubicacionActual={conveyorUbicacion}
        onSelectUbicacion={(ubi) => {
          setConveyorUbicacion(ubi);
          confirmarConveyor(ubi);
        }}
        tenant={tenant}
        ordenesActivas={ordenes}
        ordenActualId={conveyorOrden?.id}
      />
    </div>
  );
}

function KPI({
  title,
  value,
  sub,
  icon: Icon,
  variant = "primary",
}: {
  title: string;
  value: string;
  sub?: string;
  icon: typeof Receipt;
  variant?: "primary" | "amber" | "emerald" | "rose";
}) {
  const styles = {
    primary: {
      card: "bg-gradient-primary text-white shadow-md border-0",
      title: "text-white/80 font-semibold",
      value: "text-white",
      sub: "text-white/70",
      icon: "text-white/80",
    },
    amber: {
      card: "bg-amber-500/10 border border-amber-500/20 shadow-2xs",
      title: "text-amber-800 dark:text-amber-300 font-semibold",
      value: "text-foreground",
      sub: "text-amber-700/70 dark:text-amber-400/70",
      icon: "text-amber-600 dark:text-amber-400",
    },
    emerald: {
      card: "bg-emerald-500/10 border border-emerald-500/20 shadow-2xs",
      title: "text-emerald-800 dark:text-emerald-300 font-semibold",
      value: "text-foreground",
      sub: "text-emerald-700/70 dark:text-emerald-400/70",
      icon: "text-emerald-600 dark:text-emerald-400",
    },
    rose: {
      card: "bg-rose-500/10 border border-rose-500/20 shadow-2xs",
      title: "text-rose-800 dark:text-rose-300 font-semibold",
      value: "text-foreground",
      sub: "text-rose-700/70 dark:text-rose-400/70",
      icon: "text-rose-600 dark:text-rose-400",
    },
  }[variant];

  return (
    <Card className={`p-5 h-full ${styles.card}`}>
      <div className="flex items-start justify-between gap-2">
        <div className={`text-xs uppercase tracking-wider ${styles.title}`}>{title}</div>
        <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${styles.icon}`} />
      </div>
      <div className="mt-2 font-display text-3xl font-bold tracking-tight">{value}</div>
      {sub && <div className={`mt-1 text-sm font-medium ${styles.sub}`}>{sub}</div>}
    </Card>
  );
}

function Row({ k, v, bold = false }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className={bold ? "font-bold text-foreground font-mono" : "font-medium"}>{v}</span>
    </div>
  );
}
