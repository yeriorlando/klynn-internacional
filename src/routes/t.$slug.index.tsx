import { toastWhatsAppSuccess } from "@/components/klynn/WhatsAppManualToast";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
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
  getSisterTenantsForTenant,
  type Orden,
  type Gasto,
  type Cliente,
  type EstadoOrden,
  type Tenant,
  can,
  isModuleEnabled,
} from "@/lib/storage";
import {
  calcularCobros,
  calcularFacturacion,
  calcularCarteraPorCobrar,
} from "@/lib/finanzas";
import { usePlans } from "@/hooks/use-queries";
import {
  Receipt,
  Calendar,
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
  Scale,
  Lock,
  Unlock,
  CheckCheck,
  CreditCard,
  Banknote,
  ArrowLeftRight,
  PackageCheck,
  Split,
  Activity,
  Coins,
  SlidersHorizontal,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AperturaDialog } from "@/components/klynn/AperturaDialog";
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
import { CompararVentasModal } from "@/components/klynn/CompararVentasModal";

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
  const [showAperturaModal, setShowAperturaModal] = useState(false);

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

  const [view, setView] = useState<Orden | null>(null);
  const [cobrarOrden, setCobrarOrden] = useState<Orden | null>(null);
  const [showPrint, setShowPrint] = useState<Orden | null>(null);
  const [showPrintProduccion, setShowPrintProduccion] = useState<Orden | null>(null);
  const [pagoRecibidoParaTicket, setPagoRecibidoParaTicket] = useState<number | undefined>(
    undefined,
  );
  const [showDownloadA4, setShowDownloadA4] = useState<Orden | null>(null);
  const [estadoModal, setEstadoModal] = useState<Orden | null>(null);
  const [showCompararVentasModal, setShowCompararVentasModal] = useState(false);

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

  const [sisterBranches, setSisterBranches] = useState<Tenant[]>([]);
  const branchesScrollRef = useRef<HTMLDivElement>(null);
  const userEmail = user?.empleado?.email || user?.tenant?.email || tenant?.email || "";

  useEffect(() => {
    let isMounted = true;
    if (tenant?.id) {
      getSisterTenantsForTenant(tenant.id, userEmail)
        .then((branches) => {
          if (!isMounted) return;
          if (branches && branches.length > 0) {
            setSisterBranches(branches);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [tenant?.id, userEmail]);

  const scrollTransferredBranches = (direction: "left" | "right") => {
    if (branchesScrollRef.current) {
      const scrollAmount = direction === "left" ? -180 : 180;
      branchesScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

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
              if (r.ok) toastWhatsAppSuccess("WhatsApp enviado al cliente");
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
          if (r.ok) toastWhatsAppSuccess("WhatsApp enviado al cliente");
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
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    // 1. Cobrado Hoy real (Flujo de entradas por ventas/abonos del día en caja)
    const cobrosHoyRes = calcularCobros(movs, hoy, manana);
    const cobradoHoy = movs.length > 0
      ? cobrosHoyRes.cobradoNeto
      : ordenes
          .filter((o) => o.estado !== "ANULADA" && new Date(o.creado_en) >= hoy && new Date(o.creado_en) < manana)
          .reduce((s, o) => s + (Number(o.pagado) || 0), 0);

    // 2. Facturado Hoy (Valor total de órdenes emitidas hoy, excluyendo anuladas)
    const facturadoHoy = calcularFacturacion(ordenes, hoy, manana).totalFacturado;

    // Métricas de Ayer (Órdenes y cobros de ayer)
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);
    ayer.setHours(0, 0, 0, 0);
    const finAyer = new Date(hoy.getTime() - 1);

    const facturadoAyer = calcularFacturacion(ordenes, ayer, finAyer).totalFacturado;
    const cobrosAyerRes = calcularCobros(movs, ayer, finAyer);
    const cobradoAyer = movs.length > 0
      ? cobrosAyerRes.cobradoNeto
      : ordenes
          .filter((o) => o.estado !== "ANULADA" && new Date(o.creado_en) >= ayer && new Date(o.creado_en) < hoy)
          .reduce((s, o) => s + (Number(o.pagado) || 0), 0);

    const activas = ordenes.filter((o) => ["RECIBIDA", "EN_PROCESO", "LISTA"].includes(o.estado));
    const listas = ordenes.filter((o) => o.estado === "LISTA");

    // Total de prendas físicas y libras en lavandería
    let totalPrendasActivas = 0;
    let totalLibrasActivas = 0;
    let prendasEnProceso = 0;
    let prendasListas = 0;

    const branchesMap = new Map<string, {
      id: string;
      nombre: string;
      logo?: string;
      color?: string;
      piezas: number;
      ordenes: number;
    }>();

    for (const o of activas) {
      let pCount = 0;
      const items = Array.isArray(o.items) ? o.items : [];
      for (const it of items) {
        if (it.cantidad_prendas && it.cantidad_prendas > 0) {
          pCount += it.cantidad_prendas;
        } else if (it.es_libra) {
          totalLibrasActivas += Number(it.cantidad) || 0;
          pCount += (it.cantidad_prendas && it.cantidad_prendas > 0 ? it.cantidad_prendas : 0);
        } else {
          pCount += Number(it.cantidad) || 0;
        }
      }
      if (pCount === 0) pCount = 1;

      totalPrendasActivas += pCount;
      if (o.estado === "LISTA") {
        prendasListas += pCount;
      } else {
        prendasEnProceso += pCount;
      }

      // Si la orden fue transferida desde otra sucursal
      if (o.sucursal_origen_id && o.sucursal_origen_id !== tenantId) {
        const branchKey = o.sucursal_origen_id;
        const sister = sisterBranches.find((b) => b.id === branchKey);
        const branchName = o.sucursal_origen_nombre || sister?.nombre_sucursal || sister?.nombre || "Sucursal Externa";
        const branchLogo = o.sucursal_origen_logo || sister?.logo_url || "";
        const branchColor = sister?.color_primario || "#0891b2";

        const current = branchesMap.get(branchKey) || {
          id: branchKey,
          nombre: branchName,
          logo: branchLogo,
          color: branchColor,
          piezas: 0,
          ordenes: 0,
        };
        current.piezas += pCount;
        current.ordenes += 1;
        if (!current.logo && branchLogo) current.logo = branchLogo;
        branchesMap.set(branchKey, current);
      }
    }

    const sucursalesTransferidas = Array.from(branchesMap.values());

    // 3. Cartera por cobrar completa (todas las órdenes no anuladas con saldo pendiente > 0)
    const cartera = calcularCarteraPorCobrar(ordenes);
    const cuentasCobrar = cartera.ordenesPendientes;
    const totalCxC = cartera.totalPorCobrar;
    const desgloseCxC = cartera.desglose;

    // Desglose exacto Al retirar vs A crédito
    const alRetirarOrders = cuentasCobrar.filter(
      (o) => o.metodo_pago === "PAGO_AL_RETIRAR" || o.condicion_cobro === "AL_RETIRAR"
    );
    const alRetirarMonto = alRetirarOrders.reduce((s, o) => s + (Number(o.saldo) || 0), 0);
    const creditoMonto = Math.max(0, totalCxC - alRetirarMonto);
    const alRetirarCount = alRetirarOrders.length;
    const creditoCount = cuentasCobrar.length - alRetirarCount;

    const gastosHoy = gastos
      .filter((g) => new Date(g.fecha) >= hoy)
      .reduce((s, g) => s + g.monto, 0);

    // Efectivo en caja del turno actual (si caja está abierta)
    const movsCajaActual = caja ? movs.filter((m) => m.caja_id === caja.id) : [];
    const ventasEf = movsCajaActual
      .filter((m) => m.tipo === "VENTA" && (m.metodo === "EFECTIVO" || !m.metodo))
      .reduce((s, m) => s + m.monto, 0);
    const otrosIng = movsCajaActual
      .filter((m) => (m.tipo === "INGRESO" || m.tipo === "ABONO") && (m.metodo === "EFECTIVO" || !m.metodo))
      .reduce((s, m) => s + m.monto, 0) - (caja?.monto_inicial || 0);
    const egresos = movsCajaActual
      .filter((m) => ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA"].includes(m.tipo))
      .reduce((s, m) => s + m.monto, 0);
    const efectivo = (caja?.monto_inicial || 0) + ventasEf + otrosIng - egresos;

    const chartData: Array<{ dia: string; total: number }> = [];

    if (periodoChart === "7D") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        const cobrosDia = calcularCobros(movs, d, next).cobradoNeto;
        const total = movs.length > 0
          ? cobrosDia
          : ordenes
              .filter(
                (o) =>
                  o.estado !== "ANULADA" && new Date(o.creado_en) >= d && new Date(o.creado_en) < next,
              )
              .reduce((s, o) => s + (Number(o.pagado) || 0), 0);
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
        const cobrosPeriodo = calcularCobros(movs, start, end).cobradoNeto;
        const total = movs.length > 0
          ? cobrosPeriodo
          : ordenes
              .filter(
                (o) =>
                  o.estado !== "ANULADA" &&
                  new Date(o.creado_en) >= start &&
                  new Date(o.creado_en) <= end,
              )
              .reduce((s, o) => s + (Number(o.pagado) || 0), 0);
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
        const cobrosMes = calcularCobros(movs, d, next).cobradoNeto;
        const total = movs.length > 0
          ? cobrosMes
          : ordenes
              .filter(
                (o) =>
                  o.estado !== "ANULADA" && new Date(o.creado_en) >= d && new Date(o.creado_en) < next,
              )
              .reduce((s, o) => s + (Number(o.pagado) || 0), 0);
        chartData.push({ dia: d.toLocaleDateString("es-DO", { month: "short" }), total });
      }
    }

    const max = Math.max(1, ...chartData.map((v) => v.total));
    const totalPeriodo = chartData.reduce((s, v) => s + v.total, 0);
    const diasDivider =
      periodoChart === "7D" ? 7 : periodoChart === "30D" ? 30 : chartData.length * 30;
    const promedioDiario = totalPeriodo / diasDivider;

    return {
      cobradoHoy,
      facturadoHoy,
      facturadoAyer,
      cobradoAyer,
      ventasHoy: cobradoHoy,
      activas,
      listas,
      cuentasCobrar,
      totalCxC,
      desgloseCxC,
      alRetirarMonto,
      creditoMonto,
      alRetirarCount,
      creditoCount,
      movimientosTurno: movsCajaActual.length,
      egresosTurno: egresos,
      gastosHoy,
      efectivo,
      chartData,
      max,
      totalPeriodo,
      promedioDiario,
      totalPrendasActivas,
      totalLibrasActivas,
      prendasEnProceso,
      prendasListas,
      sucursalesTransferidas,
    };
  }, [ordenes, movs, gastos, caja, periodoChart, sisterBranches, tenantId]);

  const {
    cobradoHoy,
    facturadoHoy,
    facturadoAyer,
    cobradoAyer,
    ventasHoy,
    activas,
    listas,
    totalPrendasActivas,
    totalLibrasActivas,
    prendasEnProceso,
    prendasListas,
    sucursalesTransferidas,
    cuentasCobrar,
    totalCxC,
    desgloseCxC,
    alRetirarMonto,
    creditoMonto,
    alRetirarCount,
    creditoCount,
    movimientosTurno,
    egresosTurno,
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
      {/* Resumen Operativo de Planta y Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-4 items-stretch">
        {/* Columna 1: Carga de Prendas y Peso en Lavandería */}
        <Card className="flex flex-col justify-between p-4 sm:p-4.5 rounded-2xl border border-sky-400/35 dark:border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-blue-500/5 to-indigo-500/5 dark:from-sky-950/30 dark:via-slate-900/60 dark:to-transparent shadow-xs hover:shadow-sm transition-all animate-in fade-in duration-300">
          <div className="space-y-3 min-w-0">
            {/* Header: Ícono / Logo + Título y Métrica Principal */}
            <div className="flex items-start justify-between gap-3 min-w-0">
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Ícono de ropa O Logotipo circular de la lavandería cuando hay transferencias inter-sucursales */}
                {sucursalesTransferidas.length > 0 ? (
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-sky-500/30 bg-white dark:bg-slate-800 p-0.5 shadow-2xs">
                    {tenant?.logo_url ? (
                      <img
                        src={tenant.logo_url}
                        alt={tenant.nombre}
                        className="h-full w-full object-contain rounded-full"
                      />
                    ) : (
                      <div
                        className="h-full w-full flex items-center justify-center font-black text-white text-xs rounded-full"
                        style={{ backgroundColor: tenant?.color_primario || "#1B4B73" }}
                      >
                        {(tenant?.nombre || "L").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-[#1B4B73] dark:text-sky-300 border border-sky-500/30 shadow-2xs">
                    <Shirt className="h-5 w-5 stroke-[2.2]" />
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-950/80 dark:text-sky-300">
                      Prendas en lavandería
                    </span>
                    <span className="rounded-full bg-sky-500/15 dark:bg-sky-400/20 border border-sky-500/25 px-2 py-0.5 text-[10px] font-black uppercase text-sky-900 dark:text-sky-200">
                      {activas.length} órdenes activas
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1 flex-wrap">
                    <span className="font-display text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                      {totalPrendasActivas.toLocaleString()}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                      Piezas en planta
                    </span>
                    {totalLibrasActivas > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-500/15 text-blue-900 dark:text-blue-200 border border-blue-500/25">
                        <Scale className="h-3 w-3 stroke-[2.5]" />
                        +{totalLibrasActivas} lb
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Fila / Carrusel de Sucursales que han Transferido Órdenes */}
            {sucursalesTransferidas.length > 0 && (
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10.5px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Store className="h-3 w-3 text-sky-600 dark:text-sky-400" />
                    <span>Órdenes recibidas de otras sucursales:</span>
                  </span>
                  {sucursalesTransferidas.length > 3 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => scrollTransferredBranches("left")}
                        className="h-5 w-5 rounded-md flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        title="Desplazar a la izquierda"
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollTransferredBranches("right")}
                        className="h-5 w-5 rounded-md flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        title="Desplazar a la derecha"
                      >
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div
                  ref={branchesScrollRef}
                  className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth pb-0.5"
                >
                  {sucursalesTransferidas.map((suc) => (
                    <Link
                      key={suc.id}
                      to="/t/$slug/ordenes"
                      params={{ slug: tenant.slug }}
                      search={{ sucursal: suc.id }}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-sky-200/90 dark:border-sky-800/70 shadow-2xs shrink-0 select-none transition-all hover:bg-sky-50 dark:hover:bg-slate-800 hover:border-sky-400 dark:hover:border-sky-600 hover:shadow-xs hover:scale-[1.02] active:scale-95 cursor-pointer group/branch"
                      title={`Ver órdenes transferidas de ${suc.nombre}`}
                    >
                      {/* Logotipo circular de la sucursal de origen */}
                      <div className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 bg-white p-0.5 shadow-2xs group-hover/branch:border-sky-400">
                        {suc.logo ? (
                          <img
                            src={suc.logo}
                            alt={suc.nombre}
                            className="h-full w-full object-contain rounded-full"
                          />
                        ) : (
                          <div
                            className="h-full w-full flex items-center justify-center font-black text-white text-[9px] rounded-full"
                            style={{ backgroundColor: suc.color || "#0891b2" }}
                          >
                            {suc.nombre.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Nombre y Cantidad de Piezas */}
                      <div className="flex flex-col min-w-0 pr-0.5">
                        <span className="text-[11px] font-extrabold text-slate-900 dark:text-slate-100 truncate max-w-[125px] leading-tight group-hover/branch:text-sky-700 dark:group-hover/branch:text-sky-300">
                          {suc.nombre}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] leading-tight font-bold text-sky-700 dark:text-sky-300">
                          <span>
                            {suc.piezas} {suc.piezas === 1 ? "Pieza" : "Piezas"}
                          </span>
                          <span className="text-slate-400 dark:text-slate-500 font-normal">
                            ({suc.ordenes} {suc.ordenes === 1 ? "orden" : "órdenes"})
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer: Badges profesionales para En proceso y En estantería */}
          <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between text-xs gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Badge En proceso con icono */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 dark:bg-amber-950/40 border border-amber-500/25 text-amber-950 dark:text-amber-200 text-xs font-semibold shadow-2xs">
                <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-[11px] text-amber-900/80 dark:text-amber-300">En proceso:</span>
                <span className="font-extrabold text-amber-950 dark:text-amber-100">
                  {prendasEnProceso.toLocaleString()} Piezas
                </span>
              </div>

              {/* Badge Listas con icono */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/15 dark:bg-emerald-950/40 border border-emerald-500/25 text-emerald-950 dark:text-emerald-200 text-xs font-semibold shadow-2xs">
                <PackageCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-[11px] text-emerald-900/80 dark:text-emerald-300">Listas:</span>
                <span className="font-extrabold text-emerald-950 dark:text-emerald-100">
                  {prendasListas.toLocaleString()} Piezas
                </span>
              </div>
            </div>

            <Link
              to="/t/$slug/control-marbetes"
              params={{ slug: tenant.slug }}
              className="text-[11.5px] font-bold text-[#1B4B73] dark:text-sky-400 hover:underline flex items-center gap-1 ml-auto shrink-0"
            >
              <span>Control marbetes</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>

        {/* Columna 2: Órdenes Almacenadas sin Retirar (Compactada y Rediseñada) */}
        {ordenesSinRetirar.length > 0 ? (
          <Card className="flex flex-col justify-between p-4 sm:p-4.5 rounded-2xl border border-sky-400/35 dark:border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-blue-500/5 to-cyan-500/5 dark:from-sky-950/30 dark:via-slate-900/60 dark:to-transparent shadow-xs hover:shadow-sm transition-all animate-in fade-in duration-300">
            <div className="flex items-start justify-between gap-3 min-w-0">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-[#1B4B73] dark:text-sky-300 border border-sky-500/30 shadow-2xs">
                  <Package className="h-5 w-5 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-950/80 dark:text-sky-300">
                      Órdenes almacenadas
                    </span>
                    <span className="rounded-full bg-amber-500/15 dark:bg-amber-400/20 border border-amber-500/25 px-2 py-0.5 text-[10px] font-black uppercase text-amber-900 dark:text-amber-200">
                      Más de {diasSinRetirarConfig} días
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1 flex-wrap">
                    <span className="font-display text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                      {ordenesSinRetirar.length}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400">
                      {ordenesSinRetirar.length === 1 ? "orden sin retirar" : "órdenes sin retirar"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between text-xs gap-2 flex-wrap">
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[200px] sm:max-w-[240px]">
                Prendas en estado LISTA esperando a clientes
              </p>
              <Link
                to="/t/$slug/ordenes"
                params={{ slug: tenant.slug }}
                search={{ filter: "almacenadas" }}
                className="shrink-0 ml-auto"
              >
                <Button
                  size="sm"
                  className="flex items-center gap-1.5 px-3.5 h-8 rounded-lg font-bold text-xs bg-[#1B4B73] hover:bg-[#143a59] text-white shadow-2xs transition-all cursor-pointer border border-[#1B4B73] active:scale-95 group"
                >
                  <Eye className="h-3.5 w-3.5 text-[#F0B900] shrink-0" />
                  <span>Ver órdenes</span>
                  <ArrowRight className="h-3 w-3 text-white/70 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="flex flex-col justify-between p-4 sm:p-4.5 rounded-2xl border border-emerald-400/35 dark:border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-emerald-500/5 dark:from-emerald-950/30 dark:via-slate-900/60 dark:to-transparent shadow-xs hover:shadow-sm transition-all animate-in fade-in duration-300">
            <div className="flex items-start justify-between gap-3 min-w-0">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 shadow-2xs">
                  <CheckCircle2 className="h-5 w-5 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-950/80 dark:text-emerald-300">
                      Estantería al día
                    </span>
                    <span className="rounded-full bg-emerald-500/15 dark:bg-emerald-400/20 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-900 dark:text-emerald-200">
                      0 retrasadas
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1 flex-wrap">
                    <span className="font-display text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                      Al día
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400">
                      sin órdenes demoradas
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between text-xs gap-2 flex-wrap">
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[200px] sm:max-w-[240px]">
                Todas las prendas listas han sido retiradas a tiempo
              </p>
              <Link
                to="/t/$slug/estanteria"
                params={{ slug: tenant.slug }}
                className="shrink-0 ml-auto"
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-1.5 px-3.5 h-8 rounded-lg font-bold text-xs bg-white dark:bg-slate-900 text-emerald-900 dark:text-emerald-200 border-emerald-500/30 shadow-2xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                >
                  <span>Ver estantería</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>

      {!caja && (
        <Card className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-4.5 rounded-2xl border border-amber-400/50 dark:border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 dark:from-amber-950/40 dark:via-amber-900/20 dark:to-transparent shadow-xs animate-in fade-in duration-300">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 shadow-2xs mt-0.5 sm:mt-0">
              <Lock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-display text-sm sm:text-base font-extrabold text-amber-950 dark:text-amber-200 tracking-tight">
                  No hay caja abierta actualmente
                </h4>
                <span className="rounded-full bg-amber-500/20 dark:bg-amber-400/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-black uppercase text-amber-900 dark:text-amber-300 tracking-wider">
                  Turno Inactivo
                </span>
              </div>
              <p className="text-xs text-amber-900/85 dark:text-amber-300/80 font-medium mt-0.5 leading-relaxed">
                Inicia el turno operativo con tu fondo en efectivo para registrar cobros y ventas del día.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0 w-full sm:w-auto justify-end">
            <Link to="/t/$slug/caja" params={{ slug: tenant.slug }}>
              <Button 
                variant="outline"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm bg-white dark:bg-slate-900 border border-amber-500/30 text-amber-950 dark:text-amber-200 shadow-2xs hover:bg-amber-500/10 transition-all cursor-pointer h-10 shrink-0"
              >
                <span>Ir a caja</span>
              </Button>
            </Link>

            <Button
              type="button"
              onClick={() => setShowAperturaModal(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl h-10 px-4.5 shadow-sm transition-all active:scale-95 cursor-pointer text-xs sm:text-sm shrink-0 border border-emerald-600"
            >
              <Unlock className="h-4 w-4 stroke-[2.5]" />
              <span>Abrir Caja</span>
            </Button>
          </div>
        </Card>
      )}

      <AperturaDialog
        open={showAperturaModal}
        onOpenChange={setShowAperturaModal}
        tenantId={tenantId}
        empleadoId={user?.empleado?.id || ""}
        onDone={async () => {
          await queryClient.invalidateQueries({ queryKey: ["caja-abierta", tenantId] });
          await queryClient.invalidateQueries({ queryKey: ["cajas", tenantId] });
          await queryClient.invalidateQueries({ queryKey: ["movimientos", tenantId] });
        }}
      />

      {/* KPIs */}
      <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-4 items-stretch">
        <div id="tour-kpi-ventas" className="h-full">
          <KPI
            title="Cobrado hoy"
            value={formatRD(cobradoHoy)}
            icon={Receipt}
            tooltip={`Cobrado hoy: ${formatRD(cobradoHoy)} (Cobrado ayer: ${formatRD(cobradoAyer)}) • Facturado hoy: ${formatRD(facturadoHoy)} (Facturado ayer: ${formatRD(facturadoAyer)})`}
            variant="primary"
            footer={
              <div className="w-full space-y-0.5">
                <div className="flex items-center justify-between text-[11px] leading-tight text-white/95">
                  <span className="flex items-center gap-1 opacity-80 font-medium">
                    <Receipt className="h-3 w-3 shrink-0" />
                    <span>Facturado hoy:</span>
                  </span>
                  <span className="font-extrabold text-white">
                    {formatRD(facturadoHoy)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10.5px] leading-tight text-white/85">
                  <span className="flex items-center gap-1 opacity-80 font-medium">
                    <Calendar className="h-3 w-3 shrink-0" />
                    <span>Facturado ayer:</span>
                  </span>
                  <span className="font-extrabold text-white">
                    {formatRD(facturadoAyer)}
                  </span>
                </div>
              </div>
            }
          />
        </div>

        <div id="tour-kpi-activas" className="h-full">
          <KPI
            title="Órdenes activas"
            value={String(activas.length)}
            icon={Package}
            tooltip={`${activas.length} órdenes en recepción o en proceso de lavado`}
            variant="amber"
            footer={
              <div className="w-full space-y-0.5 text-amber-950 dark:text-amber-200">
                <div className="flex items-center justify-between text-[11px] leading-tight font-medium">
                  <span className="flex items-center gap-1 text-amber-900/80 dark:text-amber-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>En recepción:</span>
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {ordenes.filter((o) => o.estado === "RECIBIDA").length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10.5px] leading-tight font-medium text-amber-800/80 dark:text-amber-400">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                    <span>En proceso:</span>
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {ordenes.filter((o) => o.estado === "EN_PROCESO").length}
                  </span>
                </div>
              </div>
            }
          />
        </div>

        <div className="h-full">
          <KPI
            title="Listas para entregar"
            value={String(listas.length)}
            icon={Truck}
            tooltip={`${listas.length} órdenes listas para ser retiradas o entregadas`}
            variant="emerald"
            footer={
              <div className="w-full space-y-0.5 text-emerald-950 dark:text-emerald-200">
                <div className="flex items-center justify-between text-[11px] leading-tight font-medium">
                  <span className="flex items-center gap-1 text-emerald-900/80 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>Listas para entrega:</span>
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {listas.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10.5px] leading-tight font-medium text-emerald-800/80 dark:text-emerald-400">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-500 shrink-0" />
                    <span>Entregadas hoy:</span>
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {ordenes.filter((o) => o.estado === "ENTREGADA" && esParaHoy(o.actualizado_en || o.creado_en)).length}
                  </span>
                </div>
              </div>
            }
          />
        </div>

        <Link
          to="/t/$slug/cxc"
          params={{ slug: tenant.slug }}
          className="block h-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded-2xl cursor-pointer"
        >
          <KPI
            title="Por cobrar"
            value={formatRD(totalCxC)}
            icon={AlertCircle}
            tooltip={`Cartera pendiente: ${formatRD(totalCxC)} (${cuentasCobrar.length} órdenes por cobrar)`}
            variant="rose"
            footer={
              <div className="w-full space-y-0.5 text-rose-950 dark:text-rose-200">
                <div className="flex items-center justify-between text-[11px] leading-tight font-medium">
                  <span className="flex items-center gap-1 text-rose-900/80 dark:text-rose-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span>Al retirar:</span>
                    <span className="opacity-60 font-normal">({alRetirarCount})</span>
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {formatRD(alRetirarMonto)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10.5px] leading-tight font-medium text-rose-800/80 dark:text-rose-400">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0" />
                    <span>A crédito:</span>
                    <span className="opacity-60 font-normal">({creditoCount})</span>
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatRD(creditoMonto)}
                  </span>
                </div>
              </div>
            }
          />
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Gráfica VoltFit Style */}
        <Card className="lg:col-span-2 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card">
          {/* Header con Filtros */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2 text-base font-bold text-foreground leading-tight">
                <TrendingUp className="h-5 w-5 text-primary shrink-0" />
                <span>Cobros y Tendencia</span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                Cobros operativos registrados{" "}
                {periodoChart === "7D"
                  ? "en los últimos 7 días"
                  : periodoChart === "30D"
                    ? "en los últimos 30 días"
                    : "en el historial general"}
                .
              </p>
            </div>

            {/* Controles: Botón Comparar Períodos + Switch de Tiempo */}
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              {/* Botón: COMPARAR PERÍODOS (Color Azul Añil #1B4B73 Primario de Klynn) */}
              <Button 
                type="button"
                onClick={() => setShowCompararVentasModal(true)} 
                className="flex items-center gap-2 rounded-xl h-8 px-3.5 font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-xs cursor-pointer transition-all active:scale-95 text-xs shrink-0"
              >
                <Scale className="h-3.5 w-3.5 text-[#F0B900] shrink-0" />
                <span>Comparar Períodos</span>
              </Button>

              {/* Time toggle pill con fondo #1B4B73 para la pestaña activa */}
              <div className="inline-flex items-center p-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold shrink-0 border border-slate-200/50 dark:border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setPeriodoChart("7D")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${periodoChart === "7D" ? "bg-[#1B4B73] text-white shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                >
                  7D
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodoChart("30D")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${periodoChart === "30D" ? "bg-[#1B4B73] text-white shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                >
                  30D
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodoChart("TODO")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${periodoChart === "TODO" ? "bg-[#1B4B73] text-white shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Todo
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Columna Izquierda: Bloques de Información (Stats Compactos) */}
            <div className="md:col-span-5 space-y-2">
              <div className="p-2.5 px-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block leading-none mb-1">
                  {periodoChart === "7D"
                    ? "Últimos 7 Días (Cobrado)"
                    : periodoChart === "30D"
                      ? "Últimos 30 Días (Cobrado)"
                      : "Cobros Totales"}
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
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-display">
              Caja del turno
            </div>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </div>
          {caja ? (
            <>
              <div className="font-display text-3xl font-black tracking-tight">{formatRD(efectivo)}</div>
              <div className="mt-1.5 flex items-center">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/80 shadow-2xs font-display">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <Clock className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  Abierta: {formatDateTimeRD(caja.abierta_en)}
                </span>
              </div>
              <div className="mt-4 space-y-1.5 text-sm">
                <Row k="Apertura" v={formatRD(caja.monto_inicial)} bold />
                <Row k="Movimientos" v={String(movimientosTurno)} />
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
            <thead className="border-b border-border bg-slate-50/70 dark:bg-accent/10 font-['Plus_Jakarta_Sans',sans-serif]">
              <tr className="border-b border-slate-200/80 dark:border-border">
                <th className="px-4 py-3.5 text-left">
                  <div className="flex items-center gap-1.5 text-xs sm:text-[13px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <Receipt className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>Orden y Cliente</span>
                  </div>
                </th>
                <th className="px-4 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs sm:text-[13px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <Activity className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>Estado</span>
                  </div>
                </th>
                <th className="px-4 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs sm:text-[13px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <DollarSign className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>Total</span>
                  </div>
                </th>
                <th className="px-4 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs sm:text-[13px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <Coins className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>Saldo</span>
                  </div>
                </th>
                <th className="px-4 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs sm:text-[13px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <CreditCard className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>Pago</span>
                  </div>
                </th>
                <th className="px-4 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs sm:text-[13px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>Entrega</span>
                  </div>
                </th>
                <th className="px-4 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs sm:text-[13px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>Acciones</span>
                  </div>
                </th>
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
                          <span className="font-['Plus_Jakarta_Sans',sans-serif] text-sm font-black text-[#1B4B73] dark:text-sky-400 shrink-0">
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
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {(() => {
                        const est = o.estado;
                        if (est === "ANULADA" || est === "CANCELADA") {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border whitespace-nowrap shadow-2xs bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
                              <Ban className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                              <span>Anulada</span>
                            </span>
                          );
                        }
                        if (est === "RECIBIDA") {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border whitespace-nowrap shadow-2xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                              <Inbox className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                              <span>Recibida</span>
                            </span>
                          );
                        }
                        if (est === "EN_PROCESO") {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border whitespace-nowrap shadow-2xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                              <RefreshCw className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span>En proceso</span>
                            </span>
                          );
                        }
                        if (est === "LISTA") {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border whitespace-nowrap shadow-2xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>Lista</span>
                            </span>
                          );
                        }
                        if (est === "ENTREGADA") {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border whitespace-nowrap shadow-2xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                              <CheckCheck className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                              <span>Entregada</span>
                            </span>
                          );
                        }
                        if (est === "EN_CAMINO") {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border whitespace-nowrap shadow-2xs bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800">
                              <Truck className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                              <span>En camino</span>
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border whitespace-nowrap shadow-2xs bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                            <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span>{est.replace("_", " ")}</span>
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900 dark:text-white tabular-nums">{formatRD(o.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        {Number(o.saldo || 0) > 0 ? (
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
                            {o.estado !== "ANULADA" && (
                              <button
                                onClick={() => setCobrarOrden(o)}
                                className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                              >
                                <DollarSign className="h-2.5 w-2.5" /> Cobrar
                              </button>
                            )}
                          </>
                        ) : o.estado === "ANULADA" || o.estado === "CANCELADA" ? (
                          <span className="text-muted-foreground select-none">—</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-2xs whitespace-nowrap">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Pagada</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-xs whitespace-nowrap">
                      <div className="flex flex-col items-center justify-center gap-1">
                        {(() => {
                          const m = o.metodo_pago;
                          let icon = <DollarSign className="h-3.5 w-3.5 text-slate-500 shrink-0" />;
                          let label = m || "—";
                          let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";

                          if (m === "EFECTIVO") {
                            icon = <Banknote className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
                            label = "Efectivo";
                            badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
                          } else if (m === "TARJETA") {
                            icon = <CreditCard className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />;
                            label = "Tarjeta";
                            badgeStyle = "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800";
                          } else if (m === "TRANSFERENCIA") {
                            icon = <ArrowLeftRight className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />;
                            label = "Transferencia";
                            badgeStyle = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800";
                          } else if (m === "CREDITO") {
                            icon = <Receipt className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />;
                            label = "Crédito";
                            badgeStyle = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
                          } else if (m === "PAGO_AL_RETIRAR") {
                            icon = <PackageCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />;
                            label = "Pago al retirar";
                            badgeStyle = "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800";
                          } else if (m === "MIXTO") {
                            icon = <Split className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />;
                            label = "Mixto";
                            badgeStyle = "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800";
                          }

                          return (
                            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border whitespace-nowrap shadow-2xs", badgeStyle)}>
                              {icon}
                              <span>{label}</span>
                            </span>
                          );
                        })()}
                        {o.pago_referencia && (
                          <span
                            className="text-[10px] text-muted-foreground font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200/50 dark:border-slate-700/50 whitespace-nowrap"
                            title={`Referencia: ${o.pago_referencia}`}
                          >
                            Ref: {o.pago_referencia}
                          </span>
                        )}
                      </div>
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
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center">
                        <div className="action-menu-container order-actions action-menu">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                title="Opciones de la orden"
                                className="cursor-pointer"
                              >
                                <MoreVertical />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              side="bottom"
                              sideOffset={6}
                              collisionPadding={14}
                              className="w-56 p-1.5 rounded-2xl shadow-2xl border border-border bg-card z-50 text-foreground"
                            >
                              <DropdownMenuItem
                                onClick={() => setView(o)}
                                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl cursor-pointer hover:bg-accent focus:bg-accent transition-colors"
                              >
                                <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span>Ver Detalles</span>
                              </DropdownMenuItem>

                              {o.saldo > 0 && o.estado !== "ANULADA" && (
                                <DropdownMenuItem
                                  onClick={() => setCobrarOrden(o)}
                                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 focus:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl cursor-pointer transition-colors"
                                >
                                  <DollarSign className="h-4 w-4 text-emerald-500 shrink-0" />
                                  <span>Cobrar Orden</span>
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                onClick={() => setShowPrint(o)}
                                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl cursor-pointer hover:bg-accent focus:bg-accent transition-colors"
                              >
                                <Printer className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span>Imprimir Ticket</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => setShowDownloadA4(o)}
                                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl cursor-pointer hover:bg-accent focus:bg-accent transition-colors"
                              >
                                <DownloadCloud className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span>Ver Factura A4</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
          <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4 font-['Plus_Jakarta_Sans',sans-serif]">
            <div className="text-xs text-muted-foreground">
              Página <span className="font-bold text-foreground">{currentPage}</span> de <span className="font-bold text-foreground">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="h-8.5 px-3.5 rounded-xl text-xs font-bold transition-all active:scale-95 bg-[#1B4B73] hover:bg-[#133857] text-white cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Anterior
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8.5 px-3.5 rounded-xl text-xs font-bold transition-all active:scale-95 bg-[#1B4B73] hover:bg-[#133857] text-white cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
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
        <DialogContent className="max-w-3xl overflow-hidden rounded-3xl p-4 sm:p-5 flex flex-col max-h-[84vh]">
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

      {/* Modal Comparar Ventas Multi-Período */}
      <CompararVentasModal
        open={showCompararVentasModal}
        onOpenChange={setShowCompararVentasModal}
        ordenes={ordenes}
        tenantNombre={user?.tenant?.nombre || "Klynn Lavandería"}
        tenant={tenant}
      />
    </div>
  );
}

function KPI({
  title,
  value,
  sub,
  footer,
  icon: Icon,
  variant = "primary",
  tooltip,
}: {
  title: string;
  value: string;
  sub?: string;
  footer?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "primary" | "amber" | "emerald" | "rose";
  tooltip?: string;
}) {
  const styles = {
    primary: {
      card: "bg-gradient-to-br from-[#1B4B73] via-[#163f63] to-[#122e47] text-white shadow-sm border border-[#1B4B73]/40 relative overflow-hidden group hover:shadow-lg transition-all duration-200",
      title: "text-white/80 font-bold",
      value: "text-white",
      iconBox: "bg-white/15 border border-white/10 text-white backdrop-blur-xs",
      icon: "text-white",
    },
    amber: {
      card: "bg-amber-500/[0.08] dark:bg-amber-950/20 border border-amber-500/25 dark:border-amber-800/40 shadow-2xs hover:shadow-md transition-all duration-200 group",
      title: "text-amber-900/80 dark:text-amber-300 font-bold",
      value: "text-slate-900 dark:text-slate-100",
      iconBox: "bg-amber-500/15 border border-amber-500/20 text-amber-600 dark:text-amber-400",
      icon: "text-amber-600 dark:text-amber-400",
    },
    emerald: {
      card: "bg-emerald-500/[0.08] dark:bg-emerald-950/20 border border-emerald-500/25 dark:border-emerald-800/40 shadow-2xs hover:shadow-md transition-all duration-200 group",
      title: "text-emerald-900/80 dark:text-emerald-300 font-bold",
      value: "text-slate-900 dark:text-slate-100",
      iconBox: "bg-emerald-500/15 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
      icon: "text-emerald-600 dark:text-emerald-400",
    },
    rose: {
      card: "bg-rose-500/[0.08] dark:bg-rose-950/20 border border-rose-500/25 dark:border-rose-800/40 shadow-2xs hover:shadow-md hover:border-rose-500/40 transition-all duration-200 group",
      title: "text-rose-900/80 dark:text-rose-300 font-bold",
      value: "text-slate-900 dark:text-slate-100",
      iconBox: "bg-rose-500/15 border border-rose-500/20 text-rose-600 dark:text-rose-400",
      icon: "text-rose-600 dark:text-rose-400",
    },
  }[variant];

  const isLong = value.length > 9;

  return (
    <Card className={`p-3.5 sm:p-4 h-full min-h-[130px] rounded-2xl flex flex-col justify-between select-none ${styles.card}`}>
      {variant === "primary" && (
        <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/5 rounded-full blur-xl pointer-events-none" />
      )}
      
      {/* Encabezado: Título + Ícono en contenedor badge */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[11px] font-bold uppercase tracking-wider ${styles.title}`}>
            {title}
          </span>
          <div className={`h-7.5 w-7.5 rounded-xl flex items-center justify-center shrink-0 ${styles.iconBox}`}>
            <Icon className={`h-4 w-4 ${styles.icon}`} />
          </div>
        </div>

        {/* Métrica principal con tipografía dinámica y escalable */}
        <div 
          className={`mt-1 font-display font-black tracking-tight leading-tight ${styles.value} ${
            isLong ? "text-xl sm:text-2xl xl:text-[25px]" : "text-2xl sm:text-3xl"
          }`}
          title={tooltip || value}
        >
          {value}
        </div>
      </div>

      {/* Footer alineado estrictamente al fondo con píldora uniforme */}
      <div className="mt-2 pt-1 flex items-center min-h-[34px]">
        {footer ? (
          footer
        ) : sub ? (
          <div className="text-xs font-semibold opacity-80 truncate">{sub}</div>
        ) : null}
      </div>
    </Card>
  );
}

function Row({ k, v, bold = false }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground font-sans text-xs">{k}</span>
      <span className={`font-display text-xs ${bold ? "font-bold text-foreground" : "font-semibold text-slate-700 dark:text-slate-300"}`}>{v}</span>
    </div>
  );
}
