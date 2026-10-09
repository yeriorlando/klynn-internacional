import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { encodeCuadreEscPos, printDirectRaw } from "@/lib/impresora";
import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Wallet,
  Lock,
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Plus,
  CheckCircle2,
  Printer,
  Search,
  FileText,
  PiggyBank,
  Coins,
  CreditCard,
  ShieldCheck,
  Landmark,
  ChevronLeft,
  ChevronRight,
  Sunrise,
  Sun,
  Moon,
  Unlock,
  Sparkles,
  Clock,
  Banknote,
  Check,
  Loader2,
  ArrowLeftRight,
  History,
  KeyRound,
  Building2,
  Receipt,
  ShoppingBag,
  Calendar,
  X,
  User,
  Info,
  TrendingUp,
  TrendingDown,
  Coffee,
  Shirt,
  ExternalLink,
  Filter,
  ShoppingCart,
  LayoutGrid,
  DollarSign,
  Layers,
  Truck,
  Inbox,
  RefreshCw,
  CheckCheck,
  Split,
} from "lucide-react";
import { OrderDetail } from "@/components/klynn/OrdenesPage";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
import {
  AperturaDialog,
  MorningShiftIcon,
  AfternoonShiftIcon,
  NightShiftIcon,
} from "@/components/klynn/AperturaDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DMYDatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import {
  getCajaAbierta,
  getCajas,
  getMovimientos,
  saveCaja,
  saveMovimiento,
  saveTenant,
  saveGasto,
  formatRD,
  formatDateTimeRD,
  uid,
  CATEGORIAS_GASTOS,
  formatAmountInput,
  parseAmount,
  getHistoricoCierres,
  getEmpleados,
  getOrdenesByPeriod,
  type Caja,
  type TipoMovimiento,
  type MetodoPago,
  type Empleado,
  type Orden,
  type Tenant,
  type MovimientoCaja,
  type ECFConfig,
  type ECFDocument,
} from "@/lib/storage";
import { getECFConfig, getECFDocuments, getEF2Client, isECFReady } from "@/lib/fiscal";
import {
  useCajaAbierta,
  useCajas,
  useMovimientos,
  useECFConfig,
  useECFDocuments,
  useEmpleados,
  useOrdenes,
  useClientes,
} from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { BarChart3, Rocket, Activity, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/t/$slug/caja")({
  component: CajaPage,
});

/**
 * Helper para estructurar y enriquecer la información visual de cada movimiento de caja:
 * - Extracción y enlace del número de orden (#PA-...)
 * - Detección y conteo exacto de prendas/piezas de la orden
 * - Estado operativo/entrega de la orden (ENTREGADA, PENDIENTE ENTREGA, etc.)
 * - Estado financiero (PAGADA, CON SALDO restante, etc.)
 * - Título limpio y sin amontonamiento
 * - Badge de método de pago e icono
 */
function getMovimientoParsed(
  m: MovimientoCaja,
  ordenesList: Orden[],
  clientesList: { id: string; nombre: string }[] = [],
) {
  // 1. Extraer identificador de orden (por orden_id o por regex en concepto / referencia)
  let orderNumber: string | null = null;
  let relatedOrder: Orden | undefined;

  if (m.orden_id) {
    relatedOrder = ordenesList.find((o) => o.id === m.orden_id);
    if (relatedOrder) {
      orderNumber = relatedOrder.numero;
    }
  }

  if (!orderNumber) {
    const rawText = `${m.concepto} ${m.referencia || ""}`;
    const match = rawText.match(/#?([A-Za-z0-9]+-\d{6}-\d{3,5}|[A-Za-z0-9]+-\d+-\d+)/);
    if (match) {
      orderNumber = match[1];
      relatedOrder = ordenesList.find((o) => o.numero === orderNumber);
    }
  }

  // 2. Cliente relacionado
  let clientName = "";
  if (relatedOrder?.cliente_id) {
    const cli = clientesList.find((c) => c.id === relatedOrder?.cliente_id);
    if (cli) clientName = cli.nombre;
  }

  // 3. Cantidad de prendas / piezas de la orden
  let prendasCount: number | null = null;
  if (relatedOrder && Array.isArray(relatedOrder.items) && relatedOrder.items.length > 0) {
    prendasCount = relatedOrder.items.reduce((acc, it) => {
      if (it.cantidad_prendas && it.cantidad_prendas > 0) return acc + it.cantidad_prendas;
      if (it.es_libra) return acc + (it.cantidad_prendas || 1);
      return acc + (it.cantidad || 0);
    }, 0);
  }

  // 4. Saldo pendiente restante y clasificación de pago (Parcial vs Total)
  let saldoPendienteMonto: string | null = null;
  const saldoMatch = m.concepto.match(/saldo restante:\s*([^\)]+)/i);
  if (saldoMatch) {
    saldoPendienteMonto = saldoMatch[1].trim();
  } else if (relatedOrder && Number(relatedOrder.saldo) > 0) {
    saldoPendienteMonto = formatRD(relatedOrder.saldo);
  }

  const isAbono = m.tipo === "ABONO" || m.concepto.toLowerCase().includes("abono");
  const isPagoParcial = isAbono || !!saldoPendienteMonto;

  // 5. Badges de estado de entrega y financiero con COLORES SÓLIDOS e iconos SVG (coincidentes con modal de cambio de estado)
  let statusBadge: {
    label: string;
    bg: string;
    icon: "check" | "clock" | "x" | "sparkles" | "checkCheck" | "inbox" | "refresh";
  } | null = null;
  let finBadge: { label: string; bg: string; icon: "check" | "alert" | "coins" } | null = null;

  if (relatedOrder) {
    switch (relatedOrder.estado) {
      case "ENTREGADA":
        statusBadge = {
          label: "Entregada",
          bg: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
          icon: "checkCheck",
        };
        break;
      case "LISTA":
        statusBadge = {
          label: "Lista",
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
          icon: "check",
        };
        break;
      case "EN_PROCESO":
        statusBadge = {
          label: "En proceso",
          bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
          icon: "refresh",
        };
        break;
      case "RECIBIDA":
        statusBadge = {
          label: "Recibida",
          bg: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
          icon: "inbox",
        };
        break;
      case "CANCELADA":
      case "ANULADA":
        statusBadge = {
          label: "Cancelada",
          bg: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
          icon: "x",
        };
        break;
      default:
        statusBadge = {
          label: relatedOrder.estado,
          bg: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
          icon: "clock",
        };
    }
  } else if (m.concepto.toLowerCase().includes("(entregada)")) {
    statusBadge = {
      label: "Entregada",
      bg: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
      icon: "checkCheck",
    };
  } else if (m.concepto.toLowerCase().includes("(no entregada)")) {
    statusBadge = {
      label: "Pendiente entrega",
      bg: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
      icon: "inbox",
    };
  }

  // Estado financiero: Pago Parcial vs Pagada
  if (orderNumber || relatedOrder || m.tipo === "VENTA" || m.tipo === "ABONO") {
    if (isPagoParcial) {
      finBadge = {
        label: "Pago Parcial",
        bg: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
        icon: "coins",
      };
    } else {
      finBadge = {
        label: "Pagada",
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
        icon: "check",
      };
    }
  }

  // 5. Título descriptivo limpio y adaptado según crédito, pago al retirar o contado
  const isCredito =
    relatedOrder?.metodo_pago === "CREDITO" ||
    m.concepto.toLowerCase().includes("crédito") ||
    m.concepto.toLowerCase().includes("credito") ||
    Boolean(m.referencia && (m.referencia.toLowerCase().includes("cxc") || m.referencia.toLowerCase().includes("credito") || m.referencia.toLowerCase().includes("crédito")));

  let cleanTitle = m.concepto;
  if (m.concepto.startsWith("Cobro de saldo orden") || m.concepto.startsWith("Cobro de orden al retirar") || m.concepto.startsWith("Cobro de orden")) {
    if (isCredito) {
      cleanTitle = isPagoParcial
        ? "Abono parcial a cuenta pendiente"
        : "Cobro total de cuenta a crédito";
    } else {
      cleanTitle = statusBadge?.label === "Entregada"
        ? "Cobro final de orden y entrega de prendas"
        : (isPagoParcial ? "Abono parcial a orden" : "Cobro de orden al retirar en mostrador");
    }
  } else if (m.concepto.startsWith("Venta orden")) {
    cleanTitle = "Creación y pago de orden en mostrador";
  } else if (m.concepto.startsWith("Abono inicial orden")) {
    cleanTitle = "Anticipo / abono inicial al recibir prendas";
  } else if (m.concepto.startsWith("Abono a orden") || m.tipo === "ABONO") {
    if (isCredito) {
      cleanTitle = isPagoParcial
        ? "Abono parcial a cuenta pendiente"
        : "Cobro total de cuenta a crédito";
    } else {
      cleanTitle = isPagoParcial
        ? "Abono parcial a orden"
        : "Cobro de saldo restante de orden";
    }
  } else if (m.concepto.startsWith("Reembolso:")) {
    cleanTitle = "Reembolso a cliente por anulación";
  } else if (m.concepto === "Apertura de caja") {
    cleanTitle = "Fondo de apertura de turno en caja";
  } else if (m.tipo === "GASTO_CAJA_CHICA" || m.concepto.startsWith("Gasto:")) {
    cleanTitle = m.concepto.replace(/^Gasto:\s*/i, "").replace(/^Gasto de caja chica:\s*/i, "") || "Gasto operativo de caja chica";
  } else {
    cleanTitle = m.concepto
      .replace(/\[.*?\]/g, "")
      .replace(/\(.*?\)/g, "")
      .replace(/#[A-Za-z0-9_-]+/g, "")
      .trim();
    if (!cleanTitle) cleanTitle = m.concepto;
  }

  // 6. Badge de Tipo de Movimiento con COLORES PASTEL Y BORDES SUTILES
  let tipoLabel = "Movimiento";
  let tipoBg = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  let tipoIcon: "cart" | "coins" | "down" | "up" | "wallet" | "landmark" = "up";
  const isPositive = !["EGRESO", "RETIRO", "GASTO_CAJA_CHICA"].includes(m.tipo);

  if (m.tipo === "VENTA") {
    tipoLabel = "Venta";
    tipoBg = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
    tipoIcon = "cart";
  } else if (m.tipo === "ABONO") {
    tipoLabel = "Abono";
    tipoBg = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800";
    tipoIcon = "coins";
  } else if (m.tipo === "INGRESO") {
    tipoLabel = m.concepto === "Apertura de caja" ? "Apertura" : "Ingreso";
    tipoBg = "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800";
    tipoIcon = "down";
  } else if (["EGRESO", "RETIRO", "GASTO_CAJA_CHICA"].includes(m.tipo)) {
    if (m.tipo === "GASTO_CAJA_CHICA") {
      tipoLabel = "Caja chica";
      tipoBg = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
      tipoIcon = "wallet";
    } else if (m.tipo === "RETIRO") {
      tipoLabel = "Retiro";
      tipoBg = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
      tipoIcon = "landmark";
    } else {
      tipoLabel = "Egreso";
      tipoBg = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
      tipoIcon = "up";
    }
  }

  // 7. Método de pago
  const metodo = (m.metodo || "EFECTIVO").toUpperCase();

  // 8. DGII Nota de Crédito si es reembolso
  const ncfNotaCredito = relatedOrder?.nota_credito_ncf ||
    (m.referencia?.startsWith("DGII:E34:")
      ? m.referencia.substring("DGII:E34:".length)
      : null);

  return {
    orderNumber,
    relatedOrder,
    clientName,
    prendasCount,
    statusBadge,
    finBadge,
    saldoPendienteMonto,
    isPagoParcial,
    isCredito,
    cleanTitle,
    tipoLabel,
    tipoBg,
    tipoIcon,
    isPositive,
    metodo,
    ncfNotaCredito,
  };
}

function getShiftIcon(
  isoDate?: string,
  turnoHint?: string,
  className = "h-7.5 w-7.5 shrink-0 rounded-lg shadow-2xs overflow-hidden"
) {
  const hint = (turnoHint || "").toLowerCase();
  let shift: "morning" | "afternoon" | "night" = "morning";

  if (hint.includes("mañana") || hint.includes("manana")) {
    shift = "morning";
  } else if (hint.includes("tarde")) {
    shift = "afternoon";
  } else if (hint.includes("noche")) {
    shift = "night";
  } else if (isoDate) {
    const hour = new Date(isoDate).getHours();
    if (hour >= 5 && hour < 13) {
      shift = "morning";
    } else if (hour >= 13 && hour < 19) {
      shift = "afternoon";
    } else {
      shift = "night";
    }
  }

  if (shift === "morning") {
    return (
      <div title="Turno Mañana" className="shrink-0 flex items-center justify-center">
        <MorningShiftIcon className={className} />
      </div>
    );
  }
  if (shift === "afternoon") {
    return (
      <div title="Turno Tarde" className="shrink-0 flex items-center justify-center">
        <AfternoonShiftIcon className={className} />
      </div>
    );
  }
  return (
    <div title="Turno Noche" className="shrink-0 flex items-center justify-center">
      <NightShiftIcon className={className} />
    </div>
  );
}

function CajaPage() {
  const user = useRequireAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tenant = user?.tenant as Tenant;
  const empleado = user?.empleado as Empleado;
  const tenantId = tenant?.id || "";
  const isAdmin = user?.empleado?.rol === "ADMIN" || empleado?.rol === "ADMIN" || empleado?.id === "admin";

  const [showApertura, setShowApertura] = useState(false);
  const [showMov, setShowMov] = useState<TipoMovimiento | null>(null);
  const [showCierre, setShowCierre] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const [showCuadre, setShowCuadre] = useState(false);
  const [showCajaChica, setShowCajaChica] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [selectedPrintCaja, setSelectedPrintCaja] = useState<Caja | null>(null);
  const [printOrders, setPrintOrders] = useState<Orden[]>([]);
  const [printMovs, setPrintMovs] = useState<MovimientoCaja[]>([]);
  const [cierrePage, setCierrePage] = useState(1);
  const [movsPage, setMovsPage] = useState(1);
  const [showMovimientosPrint, setShowMovimientosPrint] = useState(false);

  const { data: caja, isLoading: loadingCaja } = useCajaAbierta(tenantId);
  const { data: todas = [], isLoading: loadingTodas } = useCajas(tenantId);
  const { data: movsData = [], isLoading: loadingMovs } = useMovimientos(tenantId, caja?.id);
  const movs = caja ? movsData : [];
  const { data: fiscalConfigData } = useECFConfig(tenantId);
  const { data: fiscalDocs = [] } = useECFDocuments(tenantId);
  const { data: ordenesList = [] } = useOrdenes(tenantId);
  const { data: clientesList = [] } = useClientes(tenantId);
  const { data: empleados = [] } = useEmpleados(tenantId);
  const fiscalConfig = fiscalConfigData || null;
  const loading = loadingCaja || loadingTodas || (!!caja && loadingMovs);

  const [selectedOrderForModal, setSelectedOrderForModal] = useState<Orden | null>(null);
  const [movsFilterTab, setMovsFilterTab] = useState<"TODOS" | "VENTA" | "ABONO" | "EGRESO">("TODOS");
  const [movsSearchQuery, setMovsSearchQuery] = useState("");

  // getMovimientos ya entrega los registros del más reciente al más antiguo.
  // La primera página debe mostrar inmediatamente egresos y reembolsos nuevos.
  const orderedMovs = useMemo(
    () => [...movs].sort((a, b) => +new Date(b.creado_en) - +new Date(a.creado_en)),
    [movs],
  );

  // Filtro dinámico por pestañas y buscador en tiempo real
  const filteredMovs = useMemo(() => {
    return orderedMovs.filter((m) => {
      // 1. Filtro por pestaña
      if (movsFilterTab === "VENTA") {
        if (m.tipo !== "VENTA" && !(m.tipo === "INGRESO" && m.concepto !== "Apertura de caja")) return false;
      } else if (movsFilterTab === "ABONO") {
        if (m.tipo !== "ABONO" && !m.concepto.toLowerCase().includes("abono")) return false;
      } else if (movsFilterTab === "EGRESO") {
        if (!["EGRESO", "RETIRO", "GASTO_CAJA_CHICA"].includes(m.tipo) && !m.concepto.toLowerCase().includes("reembolso")) return false;
      }

      // 2. Filtro por buscador
      if (!movsSearchQuery.trim()) return true;
      const q = movsSearchQuery.trim().toLowerCase();

      // Buscar por orden #
      let orderMatch = "";
      if (m.orden_id) {
        const ord = ordenesList.find((o) => o.id === m.orden_id);
        if (ord?.numero) orderMatch = ord.numero.toLowerCase();
      }
      const rawText = `${m.concepto} ${m.referencia || ""}`.toLowerCase();
      const metodo = (m.metodo || "").toLowerCase();
      const monto = String(m.monto);

      let clientName = "";
      if (m.orden_id) {
        const ord = ordenesList.find((o) => o.id === m.orden_id);
        if (ord?.cliente_id) {
          const cli = clientesList.find((c) => c.id === ord.cliente_id);
          clientName = (cli?.nombre || "").toLowerCase();
        }
      }

      return (
        orderMatch.includes(q) ||
        m.concepto.toLowerCase().includes(q) ||
        metodo.includes(q) ||
        monto.includes(q) ||
        clientName.includes(q)
      );
    });
  }, [orderedMovs, movsFilterTab, movsSearchQuery, ordenesList, clientesList]);

  const totalMovsPages = Math.max(1, Math.ceil(filteredMovs.length / 10));
  const currentMovs = useMemo(
    () => filteredMovs.slice((movsPage - 1) * 10, movsPage * 10),
    [filteredMovs, movsPage],
  );
  const newestMovId = orderedMovs[0]?.id;

  // Contadores para pestañas
  const countTodos = movs.length;
  const countVentas = useMemo(() => movs.filter((m) => m.tipo === "VENTA" || (m.tipo === "INGRESO" && m.concepto !== "Apertura de caja")).length, [movs]);
  const countAbonos = useMemo(() => movs.filter((m) => m.tipo === "ABONO" || m.concepto.toLowerCase().includes("abono")).length, [movs]);
  const countEgresos = useMemo(() => movs.filter((m) => ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA"].includes(m.tipo) || m.concepto.toLowerCase().includes("reembolso")).length, [movs]);

  // Totales para métricas en cabecera
  const totalEntradasTurno = useMemo(() => {
    return movs
      .filter((m) => ["VENTA", "INGRESO", "ABONO"].includes(m.tipo) && m.concepto !== "Apertura de caja")
      .reduce((s, m) => s + m.monto, 0);
  }, [movs]);

  const totalEgresosTurno = useMemo(() => {
    return movs
      .filter((m) => ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA"].includes(m.tipo))
      .reduce((s, m) => s + m.monto, 0);
  }, [movs]);

  useEffect(() => {
    setMovsPage(1);
  }, [movsFilterTab, movsSearchQuery]);

  // Si entra un movimiento nuevo mientras el usuario está en otra página,
  // regresar al inicio para hacerlo visible de inmediato.
  useEffect(() => {
    if (newestMovId) setMovsPage(1);
  }, [newestMovId]);

  const ventasEf = movs
    .filter((m) => m.tipo === "VENTA" && m.metodo === "EFECTIVO")
    .reduce((s, m) => s + m.monto, 0);
  const ventasTar = movs
    .filter((m) => m.tipo === "VENTA" && m.metodo === "TARJETA")
    .reduce((s, m) => s + m.monto, 0);
  const ventasTrans = movs
    .filter((m) => m.tipo === "VENTA" && m.metodo === "TRANSFERENCIA")
    .reduce((s, m) => s + m.monto, 0);
  // Otros ingresos en EFECTIVO (excluyendo la apertura inicial si ya fue grabada como INGRESO)
  const otrosIng = movs
    .filter(
      (m) =>
        (m.tipo === "INGRESO" || m.tipo === "ABONO") &&
        (!m.metodo || m.metodo === "EFECTIVO") &&
        m.concepto !== "Apertura de caja"
    )
    .reduce((s, m) => s + m.monto, 0);

  // Egresos físicos en EFECTIVO que salieron de la gaveta de esta caja
  const egresosEf = movs
    .filter(
      (m) =>
        ["EGRESO", "RETIRO"].includes(m.tipo) &&
        (!m.metodo || m.metodo === "EFECTIVO")
    )
    .reduce((s, m) => s + m.monto, 0);

  // Total de egresos registrados en el turno (para el reporte / resumen)
  const egresos = movs
    .filter((m) => ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA"].includes(m.tipo))
    .reduce((s, m) => s + m.monto, 0);

  // Total esperado de dinero físico en gaveta:
  // Fondo Inicial + Ventas Efectivo + Otros Ingresos Efectivo - Egresos Efectivo
  const efectivoEsperado = (caja?.monto_inicial || 0) + ventasEf + otrosIng - egresosEf;

  const closedCierres = todas
    .filter((c) => c.estado === "CERRADA")
    .sort(
      (a, b) => +new Date(b.cerrada_en || b.abierta_en) - +new Date(a.cerrada_en || a.abierta_en),
    );
  const totalCierrePages = Math.ceil(closedCierres.length / 5);
  const currentCierres = closedCierres.slice((cierrePage - 1) * 5, cierrePage * 5);

  async function handlePrintCierreHistorico(c: Caja) {
    const toastId = toast.loading("Preparando cuadre para impresión...");
    try {
      // Fetch orders within the exact period (ISO timestamps)
      const ordsData = await getOrdenesByPeriod({
        tenant_id: tenantId,
        desde: c.abierta_en,
        hasta: c.cerrada_en || new Date().toISOString(),
      });
      setPrintOrders(ordsData || []);

      // Fetch movements within the exact period
      const allMovs = await getMovimientos(tenantId);
      let filteredMovs = allMovs.filter((m) => {
        const created = m.creado_en || new Date().toISOString();
        return created >= c.abierta_en && created <= (c.cerrada_en || new Date().toISOString());
      });
      filteredMovs.sort((a, b) => +new Date(a.creado_en) - +new Date(b.creado_en));
      setPrintMovs(filteredMovs);

      setSelectedPrintCaja(c);
      toast.dismiss(toastId);
    } catch (err) {
      console.error(err);
      toast.error("Error al preparar impresión");
      toast.dismiss(toastId);
    }
  }

  if (!user || user.tenant.id === "__loading__" || loadingCaja) {
    return <GlobalPageLoader text="Cargando caja..." />;
  }

  if (selectedPrintCaja) {
    const targetEmp = empleados.find((e) => e.id === selectedPrintCaja.empleado_id);
    const targetEmpName = targetEmp
      ? targetEmp.apellido && targetEmp.apellido !== "null"
        ? `${targetEmp.nombre} ${targetEmp.apellido}`
        : targetEmp.nombre
      : "Cajero";

    return (
      <ReporteCuadreThermal
        ordenes={printOrders}
        movimientos={printMovs}
        tenant={tenant}
        empleadoName={targetEmpName}
        rango={`${formatDateTimeRD(selectedPrintCaja.abierta_en)} - ${formatDateTimeRD(selectedPrintCaja.cerrada_en!)}`}
        formato={tenant.config?.formato_ticket || "80mm"}
        montoInicial={selectedPrintCaja.monto_inicial}
        onBack={() => setSelectedPrintCaja(null)}
      />
    );
  }

  if (showMovimientosPrint && caja) {
    const targetEmp = empleados.find((e) => e.id === caja.empleado_id) || empleado;
    const targetEmpName = targetEmp
      ? targetEmp.apellido && targetEmp.apellido !== "null"
        ? `${targetEmp.nombre} ${targetEmp.apellido}`
        : targetEmp.nombre
      : empleado?.nombre || "Cajero";

    return (
      <ReporteMovimientosTurnoThermal
        caja={caja}
        movimientos={orderedMovs}
        tenant={tenant}
        empleadoName={targetEmpName}
        ventasEf={ventasEf}
        ventasTar={ventasTar}
        ventasTrans={ventasTrans}
        otrosIng={otrosIng}
        egresos={egresos}
        efectivoEsperado={efectivoEsperado}
        formato={tenant.config?.formato_ticket || "80mm"}
        onBack={() => setShowMovimientosPrint(false)}
      />
    );
  }

  return (
    <div>
      <PageHeader title="Caja" description="Apertura, movimientos del turno y cierre con cuadre.">
        <Button
          type="button"
            onClick={() => navigate({ to: "/t/$slug/cxc", params: { slug: user.tenant.slug } })}
            className="flex items-center gap-2 rounded-xl h-10 px-4 font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
          >
            <CreditCard className="h-4 w-4 text-[#F0B900] shrink-0" />
            <span>Cuentas x Cobrar</span>
          </Button>

          <Button
            type="button"
            onClick={() => navigate({ to: "/t/$slug/cxp", params: { slug: user.tenant.slug } })}
            className="flex items-center gap-2 rounded-xl h-10 px-4 font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
          >
            <Building2 className="h-4 w-4 text-[#F0B900] shrink-0" />
            <span>Cuentas x Pagar</span>
          </Button>

          <Button
            type="button"
            onClick={() => setShowCajaChica(true)}
            className="flex items-center gap-2 rounded-xl h-10 px-4 font-extrabold bg-[#F0B900] hover:bg-[#d9a700] text-[#1B4B73] border border-[#F0B900] shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
          >
            <PiggyBank className="h-4 w-4 text-[#1B4B73] shrink-0" />
            <span>Caja Chica</span>
          </Button>

          {!caja ? (
            <Button
              type="button"
              onClick={() => setShowApertura(true)}
              className="flex items-center gap-2 rounded-xl h-10 px-5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
            >
              <Wallet className="h-4 w-4 text-white shrink-0" />
              <span>Abrir caja</span>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setShowCierre(true)}
              className="flex items-center gap-2 rounded-xl h-10 px-5 font-bold bg-rose-600 hover:bg-rose-700 text-white border border-rose-600 shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
            >
              <Lock className="h-4 w-4 text-white shrink-0" />
              <span>Cerrar caja</span>
            </Button>
          )}
      </PageHeader>

      {!caja && (
        <Card className="p-12 text-center rounded-3xl border bg-white dark:bg-slate-900 shadow-xs">
          <Wallet className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
          <h3 className="font-display text-2xl font-black text-slate-800 dark:text-slate-100">No hay caja abierta</h3>
          <p className="mt-1 text-sm text-muted-foreground">Abre la caja para comenzar el turno.</p>
          <Button
            type="button"
            onClick={() => setShowApertura(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl h-10 px-8 font-bold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm"
          >
            <Wallet className="h-4 w-4 text-white shrink-0" />
            <span>Abrir caja ahora</span>
          </Button>
        </Card>
      )}

      {caja && (
        <>
          {/* 4 EXECUTIVE KPI CARDS EN CAJA */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Efectivo en Caja (Variant: Solid Azul Añil #1B4B73) */}
            <Card className="p-4 sm:p-4.5 rounded-2xl bg-[#1B4B73] text-white shadow-md border-0 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-[13px] uppercase tracking-wider text-white/90 font-black">Efectivo en Caja</span>
                <Coins className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-[#F0B900]" />
              </div>
              <div className="my-1.5 font-display font-black tracking-tight text-white text-xl sm:text-2xl truncate" title={formatRD(efectivoEsperado)}>
                {formatRD(efectivoEsperado)}
              </div>
              <div className="text-xs sm:text-[13px] font-semibold truncate text-white/90">
                Total esperado en gaveta
              </div>
            </Card>

            {/* 2. Ventas Efectivo (Variant: Emerald / Menta) */}
            <Card className="p-4 sm:p-4.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-[13px] uppercase tracking-wider text-emerald-800 dark:text-emerald-300 font-black">Ventas Efectivo</span>
                <Banknote className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="my-1.5 font-display font-black tracking-tight text-foreground text-xl sm:text-2xl truncate" title={formatRD(ventasEf)}>
                {formatRD(ventasEf)}
              </div>
              <div className="text-xs sm:text-[13px] font-bold truncate text-emerald-800 dark:text-emerald-300">
                Cobrado en efectivo
              </div>
            </Card>

            {/* 3. Ventas Tarjeta (Variant: Indigo / Azul) */}
            <Card className="p-4 sm:p-4.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-[13px] uppercase tracking-wider text-indigo-800 dark:text-indigo-300 font-black">Ventas Tarjeta</span>
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="my-1.5 font-display font-black tracking-tight text-foreground text-xl sm:text-2xl truncate" title={formatRD(ventasTar)}>
                {formatRD(ventasTar)}
              </div>
              <div className="text-xs sm:text-[13px] font-bold truncate text-indigo-800 dark:text-indigo-300">
                Cobrado con tarjeta
              </div>
            </Card>

            {/* 4. Ventas Transferencia (Variant: Sky / Celeste) */}
            <Card className="p-4 sm:p-4.5 rounded-2xl bg-sky-500/10 border border-sky-500/25 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-[13px] uppercase tracking-wider text-sky-800 dark:text-sky-300 font-black">Ventas Transferencia</span>
                <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="my-1.5 font-display font-black tracking-tight text-foreground text-xl sm:text-2xl truncate" title={formatRD(ventasTrans)}>
                {formatRD(ventasTrans)}
              </div>
              <div className="text-xs sm:text-[13px] font-bold truncate text-sky-800 dark:text-sky-300">
                Transferencias y digital
              </div>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="p-5">
              <div className="text-xs uppercase text-muted-foreground">Apertura</div>
              <div className="mt-1 font-display text-xl font-black">
                {formatRD(caja.monto_inicial)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDateTimeRD(caja.abierta_en)}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Empleado: <span className="font-bold text-foreground">{empleado.nombre}</span>
              </div>
              {caja.notas_apertura && (
                <div className="mt-3">
                  {/mañana/i.test(caja.notas_apertura) ? (
                    <Badge
                      variant="outline"
                      className="bg-orange-500/10 text-orange-700 border-orange-500/20 gap-1.5 py-1 px-3 font-bold"
                    >
                      🌅 Turno: Mañana
                    </Badge>
                  ) : /tarde/i.test(caja.notas_apertura) ? (
                    <Badge
                      variant="outline"
                      className="bg-sky-500/10 text-sky-700 border-sky-500/20 gap-1.5 py-1 px-3 font-bold"
                    >
                      ☀️ Turno: Tarde
                    </Badge>
                  ) : /noche/i.test(caja.notas_apertura) ? (
                    <Badge
                      variant="outline"
                      className="bg-indigo-500/10 text-indigo-700 border-indigo-500/20 gap-1.5 py-1 px-3 font-bold"
                    >
                      🌙 Turno: Noche
                    </Badge>
                  ) : (
                    <div className="rounded bg-surface-elevated p-2 text-xs">
                      {caja.notas_apertura}
                    </div>
                  )}
                </div>
              )}
            </Card>
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs uppercase text-muted-foreground font-bold tracking-wider">
                  Acciones rápidas
                </div>
                {!isAdmin && (
                  <Badge variant="outline" className="text-[10px] font-bold gap-1 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50">
                    <Lock className="h-3 w-3" /> Solo Admin
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!isAdmin) {
                      toast.error("Acceso restringido: Solo el Administrador tiene autorización para registrar ingresos a caja.");
                      return;
                    }
                    setShowMov("INGRESO");
                  }}
                  className={cn(
                    "bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border-emerald-200/80 font-bold dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 shadow-2xs h-9 cursor-pointer transition-all",
                    !isAdmin && "opacity-60 cursor-not-allowed"
                  )}
                  title={!isAdmin ? "Función reservada exclusivamente al Administrador" : "Registrar ingreso extraordinario"}
                >
                  <ArrowDownLeft className="mr-1.5 h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />{" "}
                  Ingreso
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!isAdmin) {
                      toast.error("Acceso restringido: Solo el Administrador tiene autorización para registrar egresos de caja.");
                      return;
                    }
                    setShowMov("EGRESO");
                  }}
                  className={cn(
                    "bg-rose-50 hover:bg-rose-100/80 text-rose-700 border-rose-200/80 font-bold dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 shadow-2xs h-9 cursor-pointer transition-all",
                    !isAdmin && "opacity-60 cursor-not-allowed"
                  )}
                  title={!isAdmin ? "Función reservada exclusivamente al Administrador" : "Registrar egreso o gasto operativo"}
                >
                  <ArrowUpRight className="mr-1.5 h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />{" "}
                  Egreso
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!isAdmin) {
                      toast.error("Acceso restringido: Solo el Administrador tiene autorización para realizar retiros de caja.");
                      return;
                    }
                    setShowMov("RETIRO");
                  }}
                  className={cn(
                    "bg-amber-50 hover:bg-amber-100/80 text-amber-700 border-amber-200/80 font-bold dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 shadow-2xs h-9 cursor-pointer transition-all",
                    !isAdmin && "opacity-60 cursor-not-allowed"
                  )}
                  title={!isAdmin ? "Función reservada exclusivamente al Administrador" : "Realizar retiro de efectivo o remesa"}
                >
                  <Landmark className="mr-1.5 h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />{" "}
                  Retiro
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!isAdmin) {
                      toast.error("Acceso restringido: Solo el Administrador tiene autorización para registrar gastos de caja chica.");
                      return;
                    }
                    setShowMov("GASTO_CAJA_CHICA");
                  }}
                  className={cn(
                    "bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 border-indigo-200/80 font-bold dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800 shadow-2xs h-9 cursor-pointer transition-all",
                    !isAdmin && "opacity-60 cursor-not-allowed"
                  )}
                  title={!isAdmin ? "Función reservada exclusivamente al Administrador" : "Registrar gasto de caja chica"}
                >
                  <PiggyBank className="mr-1.5 h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />{" "}
                  Caja chica
                </Button>
              </div>
              {!isAdmin && (
                <p className="text-[10.5px] text-muted-foreground text-center mt-2.5 font-medium flex items-center justify-center gap-1.5">
                  <Lock className="h-3 w-3 text-amber-600 shrink-0" />
                  <span>Operaciones reservadas al rol Administrador</span>
                </p>
              )}
            </Card>
            <Card className="p-5">
              <div className="text-xs uppercase text-muted-foreground">Resumen del turno</div>
              <div className="mt-2 space-y-1 text-sm">
                <Row k="Movimientos" v={String(movs.length)} />
                <Row k="Otros ingresos" v={formatRD(otrosIng)} />
                <Row k="Egresos en efectivo" v={formatRD(egresosEf)} className="text-destructive" />
                {egresos > egresosEf && (
                  <Row k="Egresos otros métodos" v={formatRD(egresos - egresosEf)} className="text-muted-foreground text-xs" />
                )}
                <div className="border-t border-border pt-1.5">
                  <Row k="Total esperado" v={formatRD(efectivoEsperado)} bold />
                </div>
              </div>
            </Card>
          </div>

          <Card className="mt-6 overflow-hidden bg-white dark:bg-card border border-slate-200/80 dark:border-border shadow-xs rounded-2xl font-['Plus_Jakarta_Sans',sans-serif]">
            {/* Header del Bloque */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-border p-4 sm:p-5 bg-white dark:bg-card">
              <div className="flex items-center gap-3">
                <ArrowLeftRight className="h-6 w-6 text-[#1B4B73] dark:text-sky-400 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                      Movimientos del turno
                    </h3>
                    <span className="bg-[#1B4B73] text-white font-bold text-xs px-2.5 py-0.5 rounded-full shadow-xs">
                      {filteredMovs.length} {filteredMovs.length === 1 ? "operación" : "operaciones"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Historial cronológico de transacciones registradas durante este turno de caja
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="hidden md:flex items-center gap-2.5 font-['Plus_Jakarta_Sans',sans-serif]">
                  {/* Badge Cobradas */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 shadow-2xs">
                    <div className="h-6 w-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0 shadow-2xs">
                      <ArrowDownLeft className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-600 dark:text-slate-300 font-bold">Cobradas:</span>
                      <strong className="text-emerald-700 dark:text-emerald-400 font-black text-xs sm:text-[13px] tracking-tight">
                        +{formatRD(totalEntradasTurno)}
                      </strong>
                    </div>
                  </div>

                  {/* Badge Egresos */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800 shadow-2xs">
                    <div className="h-6 w-6 rounded-lg bg-rose-100 dark:bg-rose-900/60 flex items-center justify-center text-rose-700 dark:text-rose-300 shrink-0 shadow-2xs">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-600 dark:text-slate-300 font-bold">Egresos:</span>
                      <strong className="text-rose-700 dark:text-rose-400 font-black text-xs sm:text-[13px] tracking-tight">
                        −{formatRD(totalEgresosTurno)}
                      </strong>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => setShowMovimientosPrint(true)}
                  disabled={movs.length === 0}
                  className="h-10 gap-2 font-bold text-xs sm:text-[13px] bg-[#1B4B73] hover:bg-[#133857] text-white cursor-pointer shadow-xs rounded-xl px-4 transition-all active:scale-95 disabled:opacity-50"
                  title="Imprimir ticket 80mm de auditoría con todos los movimientos del turno"
                >
                  <Printer className="h-4 w-4 text-white shrink-0" />
                  <span>Imprimir Auditoría</span>
                </Button>
              </div>
            </div>

            {/* Barra de Filtros (Estilo Imagen de Referencia 3) */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-4 bg-white dark:bg-card border-b border-slate-200/80 dark:border-border">
              {/* Buscador de alta visibilidad y contraste (no se pierde con el fondo) */}
              <div className="relative flex-1 max-w-md">
                <div className="flex items-center w-full h-11 px-3.5 rounded-xl bg-slate-100/90 hover:bg-slate-100 dark:bg-slate-800/80 border border-slate-300/90 dark:border-slate-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:border-[#1B4B73] dark:focus-within:border-sky-500 focus-within:ring-3 focus-within:ring-[#1B4B73]/15 shadow-xs transition-all">
                  <Search className="h-5 w-5 text-slate-400 dark:text-slate-500 mr-2.5 shrink-0" />
                  <input
                    type="text"
                    placeholder="Buscar por orden, cliente, concepto o monto..."
                    value={movsSearchQuery}
                    onChange={(e) => setMovsSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden font-['Plus_Jakarta_Sans',sans-serif]"
                  />
                  {movsSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setMovsSearchQuery("")}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0 ml-1.5"
                      title="Limpiar búsqueda"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Pestañas de Filtro con Mayor Altura, Fondo Azul Añil activo y cada una con su icono */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-slate-100/90 dark:bg-slate-800/60 border border-slate-200/60 dark:border-border">
                  <button
                    type="button"
                    onClick={() => setMovsFilterTab("TODOS")}
                    className={cn(
                      "flex items-center gap-2 h-10 px-3.5 sm:px-4 rounded-xl text-xs sm:text-[13px] transition-all cursor-pointer whitespace-nowrap",
                      movsFilterTab === "TODOS"
                        ? "bg-[#1B4B73] text-white font-bold shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 font-semibold"
                    )}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    <span>Todos</span>
                    <span className={cn("px-2 py-0.5 rounded-full text-[11px]", movsFilterTab === "TODOS" ? "bg-white/25 text-white font-bold" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300")}>
                      {countTodos}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMovsFilterTab("VENTA")}
                    className={cn(
                      "flex items-center gap-2 h-10 px-3.5 sm:px-4 rounded-xl text-xs sm:text-[13px] transition-all cursor-pointer whitespace-nowrap",
                      movsFilterTab === "VENTA"
                        ? "bg-[#1B4B73] text-white font-bold shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 font-semibold"
                    )}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span>Ventas</span>
                    <span className={cn("px-2 py-0.5 rounded-full text-[11px]", movsFilterTab === "VENTA" ? "bg-white/25 text-white font-bold" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300")}>
                      {countVentas}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMovsFilterTab("ABONO")}
                    className={cn(
                      "flex items-center gap-2 h-10 px-3.5 sm:px-4 rounded-xl text-xs sm:text-[13px] transition-all cursor-pointer whitespace-nowrap",
                      movsFilterTab === "ABONO"
                        ? "bg-[#1B4B73] text-white font-bold shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 font-semibold"
                    )}
                  >
                    <Coins className="h-4 w-4" />
                    <span>Abonos</span>
                    <span className={cn("px-2 py-0.5 rounded-full text-[11px]", movsFilterTab === "ABONO" ? "bg-white/25 text-white font-bold" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300")}>
                      {countAbonos}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMovsFilterTab("EGRESO")}
                    className={cn(
                      "flex items-center gap-2 h-10 px-3.5 sm:px-4 rounded-xl text-xs sm:text-[13px] transition-all cursor-pointer whitespace-nowrap",
                      movsFilterTab === "EGRESO"
                        ? "bg-[#1B4B73] text-white font-bold shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 font-semibold"
                    )}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    <span>Egresos</span>
                    <span className={cn("px-2 py-0.5 rounded-full text-[11px]", movsFilterTab === "EGRESO" ? "bg-white/25 text-white font-bold" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300")}>
                      {countEgresos}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Tabla de Movimientos */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse font-['Plus_Jakarta_Sans',sans-serif]">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-border bg-slate-50/70 dark:bg-accent/10 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <th className="px-3 py-2.5 text-left w-[13%] min-w-[100px]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>Hora</span>
                      </div>
                    </th>
                    <th className="px-3 py-2.5 text-left w-[13%] min-w-[100px]">
                      <div className="flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>Tipo</span>
                      </div>
                    </th>
                    <th className="px-3 py-2.5 text-left w-[36%] min-w-[180px]">
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>Concepto / Detalle de Orden</span>
                      </div>
                    </th>
                    <th className="px-3 py-2.5 text-center w-[11%] min-w-[75px]">
                      <div className="flex items-center justify-center gap-1.5">
                        <Shirt className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>Piezas</span>
                      </div>
                    </th>
                    <th className="px-3 py-2.5 text-center w-[13%] min-w-[95px]">
                      <div className="flex items-center justify-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>Método</span>
                      </div>
                    </th>
                    <th className="px-3 py-2.5 text-center w-[14%] min-w-[110px]">
                      <div className="flex items-center justify-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>Monto</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800 bg-white dark:bg-card">
                  {currentMovs.map((m) => {
                    const parsed = getMovimientoParsed(m, ordenesList, clientesList);
                    return (
                      <tr
                        key={m.id}
                        className="border-b border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-50/70 dark:hover:bg-accent/20 transition-colors"
                      >
                        {/* HORA & FECHA */}
                        <td className="px-3.5 py-3 align-middle whitespace-nowrap">
                          <div className="font-extrabold text-slate-900 dark:text-slate-100 text-xs sm:text-[13px] leading-tight font-['Plus_Jakarta_Sans',sans-serif]">
                            {new Date(m.creado_en).toLocaleTimeString("es-DO", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </div>
                          <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 flex items-center gap-1 font-['Plus_Jakarta_Sans',sans-serif]">
                            <Calendar className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                            <span>
                              {new Date(m.creado_en).toLocaleDateString("es-DO", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </td>

                        {/* TIPO DE MOVIMIENTO (PASTEL CON ICONO Y BORDE) */}
                        <td className="px-3.5 py-3 align-middle whitespace-nowrap">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border shadow-2xs whitespace-nowrap",
                              parsed.tipoBg
                            )}
                          >
                            {parsed.tipoIcon === "cart" && <ShoppingCart className="h-3.5 w-3.5 shrink-0" />}
                            {parsed.tipoIcon === "coins" && <Coins className="h-3.5 w-3.5 shrink-0" />}
                            {parsed.tipoIcon === "down" && <ArrowDownLeft className="h-3.5 w-3.5 shrink-0" />}
                            {parsed.tipoIcon === "up" && <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />}
                            {parsed.tipoIcon === "wallet" && <Wallet className="h-3.5 w-3.5 shrink-0" />}
                            {parsed.tipoIcon === "landmark" && <Landmark className="h-3.5 w-3.5 shrink-0" />}
                            <span>{parsed.tipoLabel}</span>
                          </span>
                        </td>

                        {/* CONCEPTO / DETALLE DE ORDEN */}
                        <td className="px-3.5 py-3 align-middle">
                          {parsed.orderNumber ? (
                            <div className="flex flex-col gap-1.5 w-full">
                              {/* Barra superior de identificadores y badges (Pasteles y armoniosos) */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const found =
                                      parsed.relatedOrder ||
                                      ordenesList.find(
                                        (o) =>
                                          o.numero?.toUpperCase() === parsed.orderNumber?.toUpperCase() ||
                                          o.id === m.orden_id
                                      );
                                    if (found) {
                                      setSelectedOrderForModal(found);
                                    } else {
                                      navigate({
                                        to: "/t/$slug/ordenes",
                                        params: { slug: user.tenant.slug },
                                      });
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-['Plus_Jakarta_Sans',sans-serif] text-xs font-black bg-[#1B4B73] hover:bg-[#133857] text-white shadow-2xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                                  title="Clic para ver detalles completos de la orden"
                                >
                                  <span>{parsed.orderNumber}</span>
                                  <ExternalLink className="h-2.5 w-2.5 text-white/80 shrink-0" />
                                </button>

                                {parsed.statusBadge && (
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border shadow-2xs whitespace-nowrap",
                                      parsed.statusBadge.bg
                                    )}
                                  >
                                    {parsed.statusBadge.icon === "checkCheck" && <CheckCheck className="h-3 w-3 shrink-0" />}
                                    {parsed.statusBadge.icon === "check" && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                                    {parsed.statusBadge.icon === "refresh" && <RefreshCw className="h-3 w-3 shrink-0" />}
                                    {parsed.statusBadge.icon === "inbox" && <Inbox className="h-3 w-3 shrink-0" />}
                                    {parsed.statusBadge.icon === "clock" && <Clock className="h-3 w-3 shrink-0" />}
                                    {parsed.statusBadge.icon === "x" && <X className="h-3 w-3 shrink-0" />}
                                    {parsed.statusBadge.icon === "sparkles" && <Sparkles className="h-3 w-3 shrink-0" />}
                                    <span>{parsed.statusBadge.label}</span>
                                  </span>
                                )}

                                {parsed.finBadge && (
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border shadow-2xs whitespace-nowrap",
                                      parsed.finBadge.bg
                                    )}
                                  >
                                    {parsed.finBadge.icon === "check" && <Check className="h-3 w-3 shrink-0" />}
                                    {parsed.finBadge.icon === "alert" && <AlertTriangle className="h-3 w-3 shrink-0" />}
                                    {parsed.finBadge.icon === "coins" && <Coins className="h-3 w-3 shrink-0" />}
                                    <span>{parsed.finBadge.label}</span>
                                  </span>
                                )}

                                {parsed.isCredito && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 shadow-2xs whitespace-nowrap">
                                    <Receipt className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
                                    <span>Crédito</span>
                                  </span>
                                )}

                                {parsed.ncfNotaCredito && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 shadow-2xs whitespace-nowrap">
                                    <ShieldCheck className="h-3 w-3 text-blue-600 shrink-0" />
                                    <span>NCF: {parsed.ncfNotaCredito}</span>
                                  </span>
                                )}
                              </div>

                              {/* Título limpio y descriptivo */}
                              <div className="text-[13px] sm:text-[13.5px] font-bold text-slate-800 dark:text-slate-100 leading-snug">
                                {parsed.cleanTitle}
                              </div>

                              {/* Subtítulos: Cliente y Saldo pendiente compacto */}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                                {parsed.clientName && (
                                  <div className="flex items-center gap-1">
                                    <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    <span>
                                      Cliente:{" "}
                                      <strong className="text-slate-800 dark:text-slate-100 font-bold">
                                        {parsed.clientName}
                                      </strong>
                                    </span>
                                  </div>
                                )}
                                {parsed.saldoPendienteMonto && (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-amber-200/90 bg-amber-50/90 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300 text-[11px] font-bold shadow-2xs whitespace-nowrap">
                                    <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
                                    <span className="text-amber-700/80 dark:text-amber-400/80 font-medium">Saldo pendiente:</span>
                                    <strong className="font-extrabold">{parsed.saldoPendienteMonto}</strong>
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : m.concepto.startsWith("Reembolso:") ? (
                            <div className="flex flex-col gap-1 w-full">
                              <div className="flex items-center gap-2">
                                <span className="text-[13.5px] font-bold text-rose-700 dark:text-rose-400">
                                  Reembolso / Anulación de Orden
                                </span>
                                {parsed.ncfNotaCredito ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white shadow-xs">
                                    <ShieldCheck className="h-3 w-3 text-white" />
                                    <span>DGII · E34: {parsed.ncfNotaCredito}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                                    <FileText className="h-3 w-3" />
                                    <span>Anulación interna</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-300">
                                {m.concepto.replace(/^Reembolso:\s*/i, "")}
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5 w-full">
                              <span className="text-[13.5px] font-bold text-slate-900 dark:text-slate-100">
                                {parsed.cleanTitle}
                              </span>
                              {m.referencia && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-['Plus_Jakarta_Sans',sans-serif] font-medium">
                                  Ref: {m.referencia}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* PIEZAS */}
                        <td className="px-3.5 py-3 align-middle text-center whitespace-nowrap">
                          {parsed.prendasCount !== null ? (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 shadow-2xs whitespace-nowrap"
                              title={`${parsed.prendasCount} piezas en esta orden`}
                            >
                              <Shirt className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                              <span>
                                {parsed.prendasCount} {parsed.prendasCount === 1 ? "pieza" : "piezas"}
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600 font-mono text-xs select-none">
                              —
                            </span>
                          )}
                        </td>

                        {/* MÉTODO DE PAGO */}
                        <td className="px-3.5 py-3 align-middle text-center whitespace-nowrap">
                          {parsed.metodo === "EFECTIVO" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 shadow-2xs whitespace-nowrap">
                              <Banknote className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>Efectivo</span>
                            </span>
                          ) : parsed.metodo === "TARJETA" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800 shadow-2xs whitespace-nowrap">
                              <CreditCard className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                              <span>Tarjeta</span>
                            </span>
                          ) : parsed.metodo === "TRANSFERENCIA" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 shadow-2xs whitespace-nowrap">
                              <ArrowLeftRight className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                              <span>Transferencia</span>
                            </span>
                          ) : parsed.metodo === "MIXTO" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800 shadow-2xs whitespace-nowrap">
                              <Split className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                              <span>Mixto</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 shadow-2xs whitespace-nowrap">
                              <DollarSign className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                              <span>{parsed.metodo}</span>
                            </span>
                          )}
                        </td>

                        {/* MONTO */}
                        <td className="px-3.5 py-3 align-middle text-center whitespace-nowrap">
                          {!parsed.isPositive ? (
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <span className="inline-flex items-center gap-1 font-['Plus_Jakarta_Sans',sans-serif] text-xs sm:text-[14px] font-black tracking-tight text-rose-600 dark:text-rose-400">
                                <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                                −{formatRD(m.monto)}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
                                {parsed.tipoLabel}
                              </span>
                            </div>
                          ) : parsed.isPagoParcial ? (
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <span className="inline-flex items-center gap-1 font-['Plus_Jakarta_Sans',sans-serif] text-xs sm:text-[14px] font-black tracking-tight text-sky-600 dark:text-sky-400">
                                <Coins className="h-3.5 w-3.5 shrink-0" />
                                +{formatRD(m.monto)}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800">
                                Pago Parcial
                              </span>
                            </div>
                          ) : (parsed.orderNumber || m.tipo === "VENTA") ? (
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <span className="inline-flex items-center gap-1 font-['Plus_Jakarta_Sans',sans-serif] text-xs sm:text-[14px] font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                +{formatRD(m.monto)}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                                Pago Total
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <span className="inline-flex items-center gap-1 font-['Plus_Jakarta_Sans',sans-serif] text-xs sm:text-[14px] font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                                <ArrowDownLeft className="h-3.5 w-3.5 shrink-0" />
                                +{formatRD(m.monto)}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                                {parsed.tipoLabel}
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredMovs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                            <Filter className="h-6 w-6" />
                          </div>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            No se encontraron movimientos
                          </span>
                          <span className="text-xs text-muted-foreground max-w-sm">
                            {movsSearchQuery
                              ? `No hay transacciones que coincidan con la búsqueda "${movsSearchQuery}".`
                              : "No hay transacciones registradas en este turno con el filtro seleccionado."}
                          </span>
                          {(movsSearchQuery || movsFilterTab !== "TODOS") && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setMovsSearchQuery("");
                                setMovsFilterTab("TODOS");
                              }}
                              className="mt-2 text-xs font-bold rounded-xl"
                            >
                              Restablecer filtros
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalMovsPages > 1 && (
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-border bg-slate-50/60 dark:bg-accent/10">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Mostrando {(movsPage - 1) * 10 + 1} al{" "}
                  {Math.min(movsPage * 10, filteredMovs.length)} de {filteredMovs.length}{" "}
                  {filteredMovs.length === 1 ? "movimiento" : "movimientos"}
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setMovsPage((p) => Math.max(1, p - 1))}
                    disabled={movsPage === 1}
                    className="h-8.5 px-3.5 rounded-xl text-xs font-bold bg-[#1B4B73] hover:bg-[#133857] text-white cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                  >
                    <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Anterior
                  </Button>
                  <span className="text-xs font-bold px-2 text-slate-700 dark:text-slate-300">
                    Pág. {movsPage} de {totalMovsPages}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setMovsPage((p) => Math.min(totalMovsPages, p + 1))}
                    disabled={movsPage === totalMovsPages}
                    className="h-8.5 px-3.5 rounded-xl text-xs font-bold bg-[#1B4B73] hover:bg-[#133857] text-white cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                  >
                    Siguiente <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Modal de Detalle de Orden al hacer clic en número de orden */}
          <Dialog
            open={!!selectedOrderForModal}
            onOpenChange={(o) => {
              if (!o) setSelectedOrderForModal(null);
            }}
          >
            <DialogContent className="max-w-3xl overflow-hidden rounded-3xl p-4 sm:p-5 flex flex-col max-h-[88vh] bg-white dark:bg-card">
              {selectedOrderForModal && (
                <OrderDetail
                  view={selectedOrderForModal}
                  tenant={tenant}
                  clientes={clientesList}
                  empleados={empleados}
                  cambiarEstado={() => {}}
                  setView={setSelectedOrderForModal}
                  onPrint={() => {}}
                  setCobrarOrden={() => {}}
                />
              )}
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Histórico */}
      {/* Histórico de Cierres Rediseñado */}
      <Card className="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-border shadow-xs bg-white dark:bg-card">
        {/* Encabezado del Histórico */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-100 dark:border-border bg-white dark:bg-card">
          <div className="flex items-center gap-3">
            <History className="h-6 w-6 text-[#1B4B73] dark:text-sky-400 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                  Histórico de Cierres
                </h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#1B4B73] text-white shadow-xs">
                  {closedCierres.length} {closedCierres.length === 1 ? "cierre" : "cierres"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Auditoría cronológica y control de cuadres de turnos anteriores
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <Button
              type="button"
              size="sm"
              onClick={() => setShowCuadre(true)}
              className="h-10 gap-2 font-bold text-xs sm:text-[13px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700 cursor-pointer shadow-xs rounded-xl px-4 transition-all active:scale-95"
            >
              <FileText className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Imprimir Cuadre</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setShowHistorico(true)}
              className="h-10 gap-2 font-bold text-xs sm:text-[13px] bg-[#1B4B73] hover:bg-[#133857] text-white cursor-pointer shadow-xs rounded-xl px-4 transition-all active:scale-95"
            >
              <Printer className="h-4 w-4 shrink-0 text-white" />
              <span>Imprimir Cierres</span>
            </Button>
          </div>
        </div>

        {/* Tabla de Cierres */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse font-['Plus_Jakarta_Sans',sans-serif]">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-border bg-slate-50/70 dark:bg-accent/10">
                <th className="px-3 py-2.5 text-left w-[16%] min-w-[110px]">
                  <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <Sunrise className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>Apertura</span>
                  </div>
                </th>
                <th className="px-3 py-2.5 text-left w-[16%] min-w-[110px]">
                  <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <Moon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>Cierre</span>
                  </div>
                </th>
                <th className="px-3 py-2.5 text-right w-[14%] min-w-[105px] whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    <Wallet className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span className="whitespace-nowrap">Fondo Inicial</span>
                  </div>
                </th>
                <th className="px-3 py-2.5 text-right w-[14%] min-w-[100px]">
                  <div className="flex items-center justify-end gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <Banknote className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>Esperado</span>
                  </div>
                </th>
                <th className="px-3 py-2.5 text-right w-[14%] min-w-[100px]">
                  <div className="flex items-center justify-end gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <Coins className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>Contado</span>
                  </div>
                </th>
                <th className="px-3 py-2.5 text-center w-[14%] min-w-[110px]">
                  <div className="flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <ShieldCheck className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>Diferencia</span>
                  </div>
                </th>
                <th className="px-3 py-2.5 text-center w-[12%] min-w-[85px]">
                  <div className="flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <Printer className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>Acciones</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-border/50 bg-white dark:bg-card">
              {currentCierres.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-accent/30 transition-colors"
                >
                  {/* APERTURA */}
                  <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getShiftIcon(c.abierta_en, c.notas_apertura, "h-7.5 w-7.5 shrink-0 rounded-lg shadow-2xs overflow-hidden")}
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs sm:text-[13px] leading-tight font-['Plus_Jakarta_Sans',sans-serif]">
                          {new Date(c.abierta_en).toLocaleTimeString("es-DO", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>
                        <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                          {new Date(c.abierta_en).toLocaleDateString("es-DO", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* CIERRE */}
                  <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                    {c.cerrada_en ? (
                      <div className="flex items-center gap-2">
                        {getShiftIcon(c.cerrada_en, undefined, "h-7.5 w-7.5 shrink-0 rounded-lg shadow-2xs overflow-hidden")}
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs sm:text-[13px] leading-tight font-['Plus_Jakarta_Sans',sans-serif]">
                            {new Date(c.cerrada_en).toLocaleTimeString("es-DO", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </span>
                          <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                            {new Date(c.cerrada_en).toLocaleDateString("es-DO", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white shadow-xs">
                        <Clock className="h-3 w-3" />
                        <span>En curso</span>
                      </span>
                    )}
                  </td>

                  {/* INICIAL */}
                  <td className="px-3 py-2.5 align-middle text-right whitespace-nowrap">
                    <div className="flex flex-col items-end">
                      <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 tracking-tight">
                        {formatRD(c.monto_inicial)}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                        Base caja
                      </span>
                    </div>
                  </td>

                  {/* ESPERADO */}
                  <td className="px-3 py-2.5 align-middle text-right whitespace-nowrap">
                    <div className="flex flex-col items-end">
                      <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 tracking-tight">
                        {formatRD(c.monto_esperado_efectivo || 0)}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                        Sistema
                      </span>
                    </div>
                  </td>

                  {/* CONTADO */}
                  <td className="px-3 py-2.5 align-middle text-right whitespace-nowrap">
                    <div className="flex flex-col items-end">
                      <span className="font-['Plus_Jakarta_Sans',sans-serif] font-black text-xs sm:text-[13.5px] text-slate-950 dark:text-white tracking-tight">
                        {formatRD(c.monto_contado_efectivo || 0)}
                      </span>
                      <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                        Físico auditado
                      </span>
                    </div>
                  </td>

                  {/* DIFERENCIA / ESTADO (DISEÑO PASTEL EN 2 LÍNEAS) */}
                  <td className="px-3 py-2.5 align-middle text-center whitespace-nowrap">
                    {(() => {
                      const difEf =
                        (c.monto_contado_efectivo || 0) - (c.monto_esperado_efectivo || 0);
                      if (Math.abs(difEf) < 0.01) {
                        return (
                          <div
                            className="inline-flex flex-col items-center justify-center min-w-[100px] px-2.5 py-1 rounded-xl border border-emerald-200/90 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-2xs select-none"
                            title="Turno cuadrado sin diferencias"
                          >
                            <div className="flex items-center justify-center gap-1 text-[10.5px] font-bold text-emerald-700 dark:text-emerald-400 leading-tight">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>Cuadrado</span>
                            </div>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-black text-xs text-emerald-700 dark:text-emerald-300 tracking-tight leading-tight mt-0.5">
                              RD$0.00
                            </span>
                          </div>
                        );
                      }
                      if (difEf < 0) {
                        return (
                          <div
                            className="inline-flex flex-col items-center justify-center min-w-[100px] px-2.5 py-1 rounded-xl border border-rose-200/90 dark:border-rose-800 bg-rose-50/90 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 shadow-2xs select-none"
                            title={`Faltante en caja de ${formatRD(Math.abs(difEf))}`}
                          >
                            <div className="flex items-center justify-center gap-1 text-[10.5px] font-bold text-rose-700 dark:text-rose-400 leading-tight">
                              <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400 shrink-0" />
                              <span>Faltante</span>
                            </div>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-black text-xs text-rose-700 dark:text-rose-300 tracking-tight leading-tight mt-0.5">
                              {formatRD(Math.abs(difEf))}
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div
                          className="inline-flex flex-col items-center justify-center min-w-[100px] px-2.5 py-1 rounded-xl border border-sky-200/90 dark:border-sky-800 bg-sky-50/90 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 shadow-2xs select-none"
                          title={`Sobrante en caja de ${formatRD(Math.abs(difEf))}`}
                        >
                          <div className="flex items-center justify-center gap-1 text-[10.5px] font-bold text-sky-700 dark:text-sky-400 leading-tight">
                            <ArrowUpRight className="h-3 w-3 text-sky-600 dark:text-sky-400 shrink-0" />
                            <span>Sobrante</span>
                          </div>
                          <span className="font-['Plus_Jakarta_Sans',sans-serif] font-black text-xs text-sky-700 dark:text-sky-300 tracking-tight leading-tight mt-0.5">
                            +{formatRD(Math.abs(difEf))}
                          </span>
                        </div>
                      );
                    })()}
                  </td>

                  {/* ACCIONES */}
                  <td className="px-3 py-2.5 align-middle text-center whitespace-nowrap">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handlePrintCierreHistorico(c)}
                      className="h-8 gap-1.5 font-bold text-xs bg-[#1B4B73] hover:bg-[#133857] text-white shadow-xs rounded-xl px-2.5 sm:px-3 transition-all active:scale-95 cursor-pointer whitespace-nowrap inline-flex items-center justify-center"
                      title="Imprimir ticket 80mm de este cierre"
                    >
                      <Printer className="h-3.5 w-3.5 text-white shrink-0" />
                      <span>Imprimir</span>
                    </Button>
                  </td>
                </tr>
              ))}

              {currentCierres.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                        <History className="h-6 w-6" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        Sin cierres registrados
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Aún no se han completado cierres de caja en este establecimiento.
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalCierrePages > 1 && (
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-border bg-slate-50/60 dark:bg-accent/10 font-['Plus_Jakarta_Sans',sans-serif]">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Mostrando {(cierrePage - 1) * 5 + 1} al{" "}
              {Math.min(cierrePage * 5, closedCierres.length)} de {closedCierres.length}{" "}
              {closedCierres.length === 1 ? "cierre" : "cierres"}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                onClick={() => setCierrePage((p) => Math.max(1, p - 1))}
                disabled={cierrePage === 1}
                className="h-8.5 px-3.5 rounded-xl text-xs font-bold bg-[#1B4B73] hover:bg-[#133857] text-white cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Anterior
              </Button>
              <span className="text-xs font-bold px-2 text-slate-700 dark:text-slate-300">
                Pág. {cierrePage} de {totalCierrePages}
              </span>
              <Button
                type="button"
                size="sm"
                onClick={() => setCierrePage((p) => Math.min(totalCierrePages, p + 1))}
                disabled={cierrePage === totalCierrePages}
                className="h-8.5 px-3.5 rounded-xl text-xs font-bold bg-[#1B4B73] hover:bg-[#133857] text-white cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                Siguiente <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <AperturaDialog
        open={showApertura}
        onOpenChange={setShowApertura}
        tenantId={tenant.id}
        empleadoId={empleado.id}
        onDone={async () => {
          await queryClient.invalidateQueries({ queryKey: ["caja-abierta", tenantId] });
          await queryClient.invalidateQueries({ queryKey: ["cajas", tenantId] });
          await queryClient.invalidateQueries({ queryKey: ["movimientos", tenantId] });
          setRefresh((r) => r + 1);
        }}
      />
      <MovDialog
        tipo={showMov}
        onClose={() => setShowMov(null)}
        caja={caja}
        empleadoId={empleado.id}
        tenantId={tenant.id}
        tenant={tenant}
        efectivoDisponible={efectivoEsperado}
        isAdmin={isAdmin}
        onDone={async () => {
          await queryClient.invalidateQueries({ queryKey: ["movimientos", tenantId, caja?.id] });
          setRefresh((r) => r + 1);
        }}
      />
      <CierreDialog
        open={showCierre}
        onOpenChange={setShowCierre}
        caja={caja}
        tenant={tenant}
        empleadoName={
          empleado.apellido && empleado.apellido !== "null"
            ? `${empleado.nombre} ${empleado.apellido}`
            : empleado.nombre
        }
        efectivoEsperado={efectivoEsperado}
        ventasTar={ventasTar}
        ventasTrans={ventasTrans}
        totalRecaudado={ventasEf + otrosIng + ventasTar + ventasTrans}
        umbral={tenant.config?.umbral_diferencia_caja || 100}
        empleadoPin={empleado.pin}
        empleadoRol={empleado.rol}
        onDone={async () => {
          await queryClient.invalidateQueries({ queryKey: ["caja-abierta", tenantId] });
          await queryClient.invalidateQueries({ queryKey: ["cajas", tenantId] });
          await queryClient.invalidateQueries({ queryKey: ["movimientos", tenantId] });
          setRefresh((r) => r + 1);
        }}
      />
      <HistoricoCierresDialog
        open={showHistorico}
        onOpenChange={setShowHistorico}
        tenant={tenant}
        empleadoId={empleado?.id}
      />
      <HistoricoCuadreDialog
        open={showCuadre}
        onOpenChange={setShowCuadre}
        tenant={tenant}
        empleadoId={empleado?.id}
      />
      <SetCajaChicaDialog
        open={showCajaChica}
        onOpenChange={setShowCajaChica}
        tenant={tenant}
        cajaId={caja?.id}
        empleadoId={empleado?.id}
        onDone={() => {
          queryClient.invalidateQueries({ queryKey: ["tenant"] });
          setRefresh((r) => r + 1);
        }}
      />
    </div>
  );
}

function FiscalSummary({
  config,
  docs,
  onRefresh,
}: {
  config: ECFConfig | null;
  docs: ECFDocument[];
  onRefresh: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [showResumen, setShowResumen] = useState(false);

  // Calcular métricas del mes actual
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const docsMes = docs.filter((d) => new Date(d.fecha_emision) >= inicioMes);
  const totalEmitido = docsMes.reduce((s, d) => s + d.monto_total, 0);
  const count = docsMes.length;

  // Verificación de la integración EF2 guardada en el servidor.
  async function handleRegister() {
    if (!config) return;
    setLoading(true);
    try {
      const result = await getEF2Client({ tenantId: config.tenant_id, environment: config.ef2_environment }).verificarToken();
      if (!result.success) throw new Error(result.message || "EF2 rechazó las credenciales.");
      toast.success("¡Conexión con EF2 verificada! 🚀");
      onRefresh();
    } catch (err: any) {
      toast.error("Error al registrar: " + (err.message || "Servicio no disponible"));
    } finally {
      setLoading(false);
    }
  }

  // Si no está configurado, mostrar el botón de "Cohete" para registro rápido
  if (!isECFReady(config)) {
    return (
      <Button
        variant="outline"
        onClick={handleRegister}
        disabled={loading || !config}
        className="border-primary/30 text-primary hover:bg-primary/5 gap-2 font-bold shadow-sm"
      >
        <Rocket className={`h-4 w-4 ${loading ? "animate-bounce" : ""}`} />
        {loading ? "Configurando..." : "Activar Fiscal"}
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowResumen(true)}
        className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5 gap-2 font-bold shadow-sm"
      >
        <BarChart3 className="h-4 w-4" /> Resumen Fiscal
      </Button>

      <Dialog open={showResumen} onOpenChange={setShowResumen}>
        <DialogContent className="max-w-md rounded-3xl border-none shadow-elegant">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/10 p-2.5 rounded-2xl text-emerald-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-display font-black">
                  Resumen Fiscal
                </DialogTitle>
                <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">
                  Mes actual: {hoy.toLocaleDateString("es-DO", { month: "long", year: "numeric" })}
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="py-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-muted/30 p-4 border border-border/50">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">
                  Documentos
                </div>
                <div className="text-2xl font-display font-black">{count}</div>
              </div>
              <div className="rounded-2xl bg-primary/5 p-4 border border-primary/10">
                <div className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-1">
                  Total Emitido
                </div>
                <div className="text-2xl font-display font-black text-primary">
                  {formatRD(totalEmitido)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  Actividad Mensual
                </div>
                <div className="text-xs font-bold text-emerald-600">
                  {count > 0 ? "Saludable" : "Sin actividad"}
                </div>
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted/30">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: count > 0 ? "100%" : "0%" }}
                  transition={{ duration: 1 }}
                  className="h-full bg-emerald-500"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-500/5 p-4 flex items-center gap-3 border border-emerald-500/10">
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
              <div className="text-xs text-emerald-800 leading-tight">
                Tu integración con <span className="font-bold">EF2 e-CF</span> está activa y
                enviando datos correctamente a la DGII.
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full rounded-2xl bg-slate-900 text-white font-bold"
              onClick={() => setShowResumen(false)}
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function KPI({ t, v, accent }: { t: string; v: string; accent?: boolean }) {
  return (
    <Card className={`p-5 ${accent ? "bg-gradient-primary text-white" : ""}`}>
      <div className={`text-xs uppercase ${accent ? "text-white/80" : "text-muted-foreground"}`}>
        {t}
      </div>
      <div className="mt-1 font-display text-2xl font-black">{v}</div>
    </Card>
  );
}
function Row({
  k,
  v,
  bold,
  className = "",
}: {
  k: string;
  v: string;
  bold?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold" : ""} ${className}`}>
      <span className="text-muted-foreground">{k}</span>
      <span>{v}</span>
    </div>
  );
}

function AmountField({
  label,
  icon: Icon,
  badgeText,
  badgeClassName,
  buttonClassName,
  expectedVal,
  value,
  onChange,
  autoFocus,
  disabled,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeText?: string;
  badgeClassName?: string;
  buttonClassName?: string;
  expectedVal?: number;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-gradient-to-b from-slate-50/70 to-white dark:from-slate-900/70 dark:to-slate-900 p-3 shadow-2xs focus-within:border-slate-400 dark:focus-within:border-slate-600 focus-within:ring-2 focus-within:ring-slate-400/10 transition-all flex flex-col justify-between gap-1.5">
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-tight text-slate-700 dark:text-slate-300 flex items-center gap-1.5 whitespace-nowrap">
          <Icon className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
          {label}
        </span>
        {badgeText && (
          <span
            className={
              badgeClassName ||
              "text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 bg-slate-100 text-slate-600 border border-slate-200"
            }
          >
            {badgeText}
          </span>
        )}
      </div>

      <div className="flex items-center justify-center gap-1.5 py-1">
        <span className="font-display text-lg font-bold text-slate-400 dark:text-slate-500 select-none">
          RD$
        </span>
        <input
          type="text"
          inputMode="decimal"
          name={`klynn_caja_monto_${label.toLowerCase().replace(/\s+/g, "_")}`}
          id={`klynn_caja_monto_${label.toLowerCase().replace(/\s+/g, "_")}`}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          data-form-type="other"
          data-1p-ignore="true"
          data-lpignore="true"
          data-bwignore="true"
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(formatAmountInput(e.target.value))}
          onBlur={() => {
            const n = parseAmount(value);
            if (n === 0) onChange("");
            else
              onChange(
                n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
              );
          }}
          placeholder="0.00"
          disabled={disabled}
          className="w-full max-w-[160px] bg-transparent text-center font-display text-2xl font-black text-slate-900 dark:text-white outline-none placeholder:text-slate-200 dark:placeholder:text-slate-700 tracking-tight"
        />
      </div>

      {expectedVal !== undefined && (
        <div className="flex items-center justify-center pt-1 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() =>
              onChange(
                expectedVal > 0
                  ? expectedVal.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : "",
              )
            }
            className={
              buttonClassName ||
              "text-[10px] font-semibold px-2.5 py-0.5 rounded-lg border shadow-2xs transition-all active:scale-95 bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
            }
          >
            Copiar esperado
          </button>
        </div>
      )}
    </div>
  );
}

const MOV_CONFIGS: Record<
  "INGRESO" | "EGRESO" | "RETIRO" | "GASTO_CAJA_CHICA",
  {
    title: string;
    subtitle: string;
    badgeText: string;
    badgeClass: string;
    headerGradient: string;
    iconBg: string;
    icon: React.ComponentType<{ className?: string }>;
    submitBtnClass: string;
    submitLabel: string;
    placeholderConcepto: string;
  }
> = {
  INGRESO: {
    title: "Ingreso Extraordinario",
    subtitle: "Inyección de fondos, venta de insumos o servicios fuera de orden",
    badgeText: "+ Entrada a Caja",
    badgeClass:
      "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    headerGradient:
      "from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/20",
    iconBg: "bg-emerald-600 text-white shadow-emerald-500/25 ring-emerald-500/15",
    icon: ArrowDownLeft,
    submitBtnClass:
      "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-600/25",
    submitLabel: "Registrar Ingreso",
    placeholderConcepto: "Ej. Venta de bolsas, ajuste de caja, aporte...",
  },
  EGRESO: {
    title: "Egreso Operativo",
    subtitle: "Salida de dinero para pagos urgentes, compras de insumos o servicios",
    badgeText: "- Salida de Caja",
    badgeClass:
      "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
    headerGradient:
      "from-rose-500/10 via-red-500/5 to-transparent border-rose-500/20",
    iconBg: "bg-rose-600 text-white shadow-rose-500/25 ring-rose-500/15",
    icon: ArrowUpRight,
    submitBtnClass:
      "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-rose-600/25",
    submitLabel: "Registrar Egreso",
    placeholderConcepto: "Ej. Compra de suministros, factura de luz, almuerzo...",
  },
  RETIRO: {
    title: "Retiro de Efectivo / Remesa",
    subtitle: "Depósito bancario, traspaso a bóveda o entrega a administración",
    badgeText: "Remesa / Retiro",
    badgeClass:
      "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700",
    headerGradient:
      "from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/20",
    iconBg: "bg-amber-600 text-white shadow-amber-500/25 ring-amber-500/15",
    icon: Landmark,
    submitBtnClass:
      "bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-amber-600/25",
    submitLabel: "Efectuar Retiro",
    placeholderConcepto: "Ej. Depósito bancario al cierre, remesa a gerencia...",
  },
  GASTO_CAJA_CHICA: {
    title: "Gasto de Caja Chica",
    subtitle: "Desembolso menor cubierto con el fondo rotativo de caja chica",
    badgeText: "Fondo Rotativo",
    badgeClass:
      "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800",
    headerGradient:
      "from-indigo-500/10 via-violet-500/5 to-transparent border-indigo-500/20",
    iconBg: "bg-indigo-600 text-white shadow-indigo-500/25 ring-indigo-500/15",
    icon: PiggyBank,
    submitBtnClass:
      "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-indigo-600/25",
    submitLabel: "Registrar Gasto de Caja Chica",
    placeholderConcepto: "Ej. Café, azúcar, pasajes, limpieza...",
  },
};

function MovDialog({
  tipo,
  onClose,
  caja,
  empleadoId,
  tenantId,
  tenant,
  efectivoDisponible,
  isAdmin = true,
  onDone,
}: {
  tipo: TipoMovimiento | null;
  onClose: () => void;
  caja: Caja | undefined;
  empleadoId: string;
  tenantId: string;
  tenant: Tenant;
  efectivoDisponible?: number;
  isAdmin?: boolean;
  onDone: () => void;
}) {
  const [concepto, setConcepto] = useState("");
  const [montoStr, setMontoStr] = useState<string>("");
  const monto = parseAmount(montoStr);
  const [metodo, setMetodo] = useState<MetodoPago>("EFECTIVO");
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_GASTOS[0]);
  const [loading, setLoading] = useState(false);

  // Reiniciar formulario cada vez que se abra o cambie el tipo
  useEffect(() => {
    if (tipo) {
      setConcepto("");
      setMontoStr("");
      setMetodo("EFECTIVO");
      setCategoria(CATEGORIAS_GASTOS[0]);
    }
  }, [tipo]);

  const config = tipo && (tipo in MOV_CONFIGS) ? MOV_CONFIGS[tipo as keyof typeof MOV_CONFIGS] : null;
  const IconComponent = config ? config.icon : Wallet;

  const fondoActual = tenant?.monto_actual_caja_chica || 0;
  const fondoRestante = fondoActual - monto;
  const disp = efectivoDisponible || 0;
  const restante = Math.max(0, disp - monto);
  const excedeGaveta = metodo === "EFECTIVO" && monto > disp;

  async function submit() {
    if (!isAdmin) {
      toast.error("Acceso restringido: Solo el Administrador tiene autorización para registrar movimientos.");
      return;
    }
    if (!caja) return;
    if (!concepto.trim()) {
      toast.error("Concepto requerido");
      return;
    }
    if (monto <= 0) {
      toast.error("Monto inválido ⚠️");
      return;
    }

    if (
      (tipo === "EGRESO" || tipo === "RETIRO") &&
      metodo === "EFECTIVO" &&
      efectivoDisponible !== undefined &&
      monto > efectivoDisponible
    ) {
      const confirmar = window.confirm(
        `⚠️ Aviso de gaveta: El monto (${formatRD(monto)}) es mayor que el efectivo disponible en la gaveta (${formatRD(efectivoDisponible)}).\n\n¿Estás seguro de que deseas registrar esta salida de efectivo de la caja?`
      );
      if (!confirmar) return;
    }
    setLoading(true);
    try {
      const id = uid("mov");
      await saveMovimiento({
        id,
        tenant_id: tenantId,
        caja_id: caja.id,
        empleado_id: empleadoId,
        tipo: tipo!,
        concepto: tipo === "GASTO_CAJA_CHICA" ? `${categoria}: ${concepto}` : concepto,
        monto,
        metodo,
        creado_en: new Date().toISOString(),
      });

      if (tipo === "GASTO_CAJA_CHICA") {
        // Restar del balance de caja chica
        const nuevoActual = (tenant.monto_actual_caja_chica || 0) - monto;
        await saveTenant({ ...tenant, monto_actual_caja_chica: nuevoActual });

        // Crear registro en Gastos
        await saveGasto({
          id: uid("gas"),
          tenant_id: tenantId,
          empleado_id: empleadoId,
          categoria: `Caja Chica: ${categoria}`,
          descripcion: concepto,
          monto,
          metodo_pago: metodo,
          fecha: new Date().toISOString(),
          aprobado: true,
          is_caja_chica: true,
        });
      }

      toast.success("Movimiento registrado 💸");
      onDone();
      onClose();
      setConcepto("");
      setMontoStr("");
    } catch (err: any) {
      console.error("Error creating movement:", err);
      toast.error("Error al registrar movimiento");
    } finally {
      setLoading(false);
    }
  }

  if (!tipo || !config) return null;

  return (
    <Dialog
      open={!!tipo}
      onOpenChange={(o) => {
        if (!o && !loading) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-2xl border-slate-200 dark:border-slate-800 shadow-2xl gap-0">
        {/* Cabecera con degradado temático y SVG Lucide */}
        <div className={cn("px-5 pt-5 pb-4 border-b", config.headerGradient)}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ring-4",
                  config.iconBg
                )}
              >
                <IconComponent className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base sm:text-lg font-display font-black text-slate-900 dark:text-white tracking-tight leading-none">
                    {config.title}
                  </DialogTitle>
                  <span
                    className={cn(
                      "text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0",
                      config.badgeClass
                    )}
                  >
                    {config.badgeText}
                  </span>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {config.subtitle}
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-5 space-y-4 max-h-[calc(85vh-140px)] overflow-y-auto">
          {/* Bloque de seguridad si no es Administrador */}
          {!isAdmin && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
                <Lock className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold">Operación restringida exclusivamente al Administrador</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  Tu cuenta no cuenta con rol de Administrador. Esta acción de caja está bloqueada para prevenir operaciones no autorizadas.
                </p>
              </div>
            </div>
          )}

          {/* Contexto 1: Gasto Caja Chica */}
          {tipo === "GASTO_CAJA_CHICA" && (
            <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Coins className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                    Fondo de Caja Chica
                  </p>
                  <p className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                    {formatRD(fondoActual)}
                  </p>
                </div>
              </div>
              {monto > 0 && (
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Restará
                  </p>
                  <p
                    className={cn(
                      "text-sm font-black tabular-nums",
                      fondoRestante < 0
                        ? "text-destructive"
                        : fondoRestante < 500
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    {formatRD(fondoRestante)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Contexto 2: Ingreso Extraordinario */}
          {tipo === "INGRESO" && (
            <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Wallet className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                    Efectivo en Gaveta
                  </p>
                  <p className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                    {formatRD(disp)}
                  </p>
                </div>
              </div>
              {metodo === "EFECTIVO" && monto > 0 && (
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Total Proyectado
                  </p>
                  <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatRD(disp + monto)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Contexto 3: Egreso o Retiro */}
          {(tipo === "EGRESO" || tipo === "RETIRO") && (
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                      Efectivo en Gaveta
                    </p>
                    <p className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                      {formatRD(disp)}
                    </p>
                  </div>
                </div>
                {metodo === "EFECTIVO" && monto > 0 && (
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Quedará en Gaveta
                    </p>
                    <p
                      className={cn(
                        "text-sm font-black tabular-nums",
                        excedeGaveta ? "text-destructive" : "text-slate-800 dark:text-slate-200"
                      )}
                    >
                      {formatRD(restante)}
                    </p>
                  </div>
                )}
              </div>

              {/* Advertencia si excede el efectivo disponible */}
              {excedeGaveta && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-200 text-xs font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>Aviso: El monto supera el efectivo físico estimado en gaveta ({formatRD(disp)}).</span>
                </div>
              )}
            </div>
          )}

          {/* Categoría (solo para Gasto de Caja Chica) */}
          {tipo === "GASTO_CAJA_CHICA" && (
            <div>
              <Label className="mb-1 text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Categoría del gasto
              </Label>
              <Select value={categoria} onValueChange={setCategoria} disabled={!isAdmin || loading}>
                <SelectTrigger className="bg-white dark:bg-slate-900 h-9 rounded-xl border-slate-200 dark:border-slate-800 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_GASTOS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Concepto */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Concepto / Motivo
              </Label>
              <span className="text-[10.5px] text-muted-foreground font-medium">Requerido</span>
            </div>
            <Input
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="bg-white dark:bg-slate-900 rounded-xl h-9.5 border-slate-200 dark:border-slate-800 text-sm"
              disabled={!isAdmin || loading}
              placeholder={config.placeholderConcepto}
            />
          </div>

          {/* Monto */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Monto
              </Label>
              {monto > 0 && (
                <button
                  type="button"
                  disabled={!isAdmin || loading}
                  onClick={() => setMontoStr("")}
                  className="text-[10.5px] font-bold text-rose-600 hover:text-rose-700 hover:underline"
                >
                  Limpiar
                </button>
              )}
            </div>
            <div className="relative group">
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 flex items-center justify-center px-4 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-l-xl">
                <span className="text-sm font-black text-slate-600 dark:text-slate-300">RD$</span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                data-form-type="other"
                value={montoStr}
                onChange={(e) => setMontoStr(formatAmountInput(e.target.value))}
                placeholder="0.00"
                disabled={!isAdmin || loading}
                className="h-14 w-full pl-16 pr-4 text-center font-display text-3xl font-black text-slate-900 dark:text-white tracking-tight rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none placeholder:text-slate-200 dark:placeholder:text-slate-700"
              />
            </div>
          </div>

          {/* Método de Pago */}
          <div>
            <Label className="mb-1 text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Método de pago / Medio
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "EFECTIVO", label: "Efectivo", icon: Banknote },
                  { id: "TARJETA", label: "Tarjeta", icon: CreditCard },
                  { id: "TRANSFERENCIA", label: "Transferencia", icon: ArrowLeftRight },
                ] as const
              ).map((m) => {
                const MIcon = m.icon;
                const isSelected = metodo === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={!isAdmin || loading}
                    onClick={() => setMetodo(m.id)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all active:scale-95",
                      isSelected
                        ? "bg-primary text-white border-primary shadow-2xs"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <MIcon className="h-3.5 w-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 flex items-center justify-end gap-2.5">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-9 rounded-xl text-xs font-bold px-4"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={!isAdmin || loading}
            className={cn(
              "h-9 rounded-xl text-xs font-bold px-5 gap-1.5 transition-all shadow-md active:scale-95",
              isAdmin
                ? config.submitBtnClass
                : "bg-slate-300 text-slate-500 cursor-not-allowed border-slate-300 shadow-none dark:bg-slate-800 dark:text-slate-500"
            )}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Registrando...</span>
              </>
            ) : !isAdmin ? (
              <>
                <Lock className="h-3.5 w-3.5" />
                <span>Solo Administrador</span>
              </>
            ) : (
              <>
                <IconComponent className="h-4 w-4" />
                <span>{config.submitLabel}</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CierreDialog({
  open,
  onOpenChange,
  caja,
  tenant,
  empleadoName,
  efectivoEsperado,
  ventasTar,
  ventasTrans,
  totalRecaudado,
  umbral,
  empleadoPin,
  empleadoRol,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  caja: Caja | undefined;
  tenant: Tenant;
  empleadoName: string;
  efectivoEsperado: number;
  ventasTar: number;
  ventasTrans: number;
  totalRecaudado: number;
  umbral: number;
  empleadoPin?: string;
  empleadoRol?: string;
  onDone: () => void;
}) {
  const [contadoEfStr, setContadoEfStr] = useState<string>("");
  const [contadoTarStr, setContadoTarStr] = useState<string>("");
  const [contadoTransStr, setContadoTransStr] = useState<string>("");
  const [notas, setNotas] = useState("");
  const [pin, setPin] = useState("");
  const [showNotas, setShowNotas] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [closedCaja, setClosedCaja] = useState<Caja | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [movimientosPrint, setMovimientosPrint] = useState<MovimientoCaja[]>([]);
  const [showPrint, setShowPrint] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savedTotalRecaudado, setSavedTotalRecaudado] = useState(0);

  useEffect(() => {
    if (open && !showSuccess) {
      setSavedTotalRecaudado(totalRecaudado);
    }
  }, [open, totalRecaudado, showSuccess]);

  useEffect(() => {
    if (open) {
      setContadoEfStr("");
      setContadoTarStr(
        ventasTar > 0
          ? ventasTar.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : "",
      );
      setContadoTransStr(
        ventasTrans > 0
          ? ventasTrans.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : "",
      );
      setNotas("");
      setPin("");
      setShowNotas(false);
      setShowSuccess(false);
      setClosedCaja(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const contadoEf = parseAmount(contadoEfStr);
  const contadoTar = parseAmount(contadoTarStr);
  const contadoTrans = parseAmount(contadoTransStr);

  const totalEsperado = efectivoEsperado + ventasTar + ventasTrans;
  const totalContado = contadoEf + contadoTar + contadoTrans;
  const dif = +(totalContado - totalEsperado).toFixed(2);

  async function submit() {
    if (!caja) return;

    // Validar PIN solo si NO es ADMIN
    if (empleadoRol !== "ADMIN") {
      if (pin.length < 4) {
        toast.error("PIN requerido para cerrar ⚠️");
        return;
      }
      if (empleadoPin && pin !== empleadoPin) {
        toast.error("PIN incorrecto. No puedes cerrar la caja ❌");
        return;
      }
    }

    if (Math.abs(dif) > umbral && notas.length < 5) {
      toast.error("Diferencia mayor al umbral. Indica una nota explicativa ⚠️");
      return;
    }

    setLoading(true);
    try {
      const updatedCaja = {
        ...caja,
        estado: "CERRADA",
        cerrada_en: new Date().toISOString(),
        monto_esperado_efectivo: efectivoEsperado,
        monto_contado_efectivo: contadoEf,
        monto_contado_tarjeta: contadoTar,
        monto_contado_transferencia: contadoTrans,
        diferencia: dif,
        notas_cierre: notas || undefined,
      } as Caja;
      await saveCaja(updatedCaja);
      setClosedCaja(updatedCaja);
      toast.success("Caja cerrada 🔒");
      setShowSuccess(true);
      onDone();
    } catch (err: any) {
      console.error(err);
      toast.error("Error al cerrar caja: " + (err?.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  }

  async function handlePrint() {
    if (!closedCaja) return;
    setLoadingOrders(true);
    try {
      // Fetch orders for this specific caja period
      const data = await getOrdenesByPeriod({
        tenant_id: closedCaja.tenant_id,
        desde: closedCaja.abierta_en,
        hasta: closedCaja.cerrada_en || new Date().toISOString(),
      });
      setOrdenes(data);
      const allMovs = await getMovimientos(closedCaja.tenant_id, closedCaja.id);
      setMovimientosPrint(allMovs);
    } catch (e) {
      console.error(e);
    }
    setLoadingOrders(false);
    setShowPrint(true);
  }

  if (showPrint && closedCaja) {
    return (
      <ReporteCuadreThermal
        ordenes={ordenes}
        movimientos={movimientosPrint}
        tenant={tenant}
        empleadoName={empleadoName}
        rango={`${formatDateTimeRD(closedCaja.abierta_en)} - ${formatDateTimeRD(closedCaja.cerrada_en!)}`}
        formato={tenant.config?.formato_ticket || "80mm"}
        montoInicial={closedCaja.monto_inicial}
        onBack={() => {
          setShowPrint(false);
          onOpenChange(false);
        }}
      />
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!showSuccess && !loading) onOpenChange(v);
      }}
    >
      <DialogContent
        className={`transition-all duration-300 ${
          showSuccess ? "w-[92vw] sm:max-w-[430px]" : "w-[95vw] sm:max-w-2xl"
        } rounded-3xl p-5 sm:p-6 shadow-2xl border-border/80`}
      >
        <AnimatePresence mode="wait">
          {!showSuccess ? (
            <motion.div
              key="cierre-form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-3.5"
            >
              <DialogHeader className="flex flex-row items-center gap-2.5 space-y-0 pb-0.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60 shadow-2xs">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <DialogTitle className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    Cerrar caja — Cuadre
                  </DialogTitle>
                  <p className="text-[11px] text-muted-foreground">
                    Ingresa el conteo físico para verificar diferencias y cerrar el turno.
                  </p>
                </div>
              </DialogHeader>

              {/* Valores Esperados en Sistema */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/30 p-2 text-center shadow-2xs">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                    <Banknote className="h-3 w-3" /> Efectivo Esperado
                  </div>
                  <div className="font-display text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {formatRD(efectivoEsperado)}
                  </div>
                </div>
                <div className="rounded-xl border border-sky-100 dark:border-sky-900/50 bg-sky-50/50 dark:bg-sky-950/30 p-2 text-center shadow-2xs">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center justify-center gap-1">
                    <CreditCard className="h-3 w-3" /> Tarjeta Esperada
                  </div>
                  <div className="font-display text-sm sm:text-base font-black text-sky-700 dark:text-sky-300 mt-0.5">
                    {formatRD(ventasTar)}
                  </div>
                </div>
                <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/30 p-2 text-center shadow-2xs">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1">
                    <Landmark className="h-3 w-3" /> Transferencia
                  </div>
                  <div className="font-display text-sm sm:text-base font-black text-indigo-700 dark:text-indigo-300 mt-0.5">
                    {formatRD(ventasTrans)}
                  </div>
                </div>
              </div>

              {/* Conteo Físico por Método */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-0.5">
                  <Label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Conteo Físico por Método
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    Total Esperado: <strong className="font-display text-slate-700 dark:text-slate-300">{formatRD(totalEsperado)}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  <AmountField
                    label="Efectivo"
                    icon={Banknote}
                    badgeText="Físico"
                    badgeClassName="text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 bg-emerald-100 text-emerald-800 border border-emerald-300/80 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800"
                    buttonClassName="text-[10px] font-semibold px-2.5 py-0.5 rounded-lg border shadow-2xs transition-all active:scale-95 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200/90 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-800"
                    expectedVal={efectivoEsperado}
                    value={contadoEfStr}
                    onChange={setContadoEfStr}
                    autoFocus
                    disabled={loading}
                  />
                  <AmountField
                    label="Tarjeta"
                    icon={CreditCard}
                    badgeText="POS"
                    badgeClassName="text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 bg-sky-100 text-sky-800 border border-sky-300/80 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-800"
                    buttonClassName="text-[10px] font-semibold px-2.5 py-0.5 rounded-lg border shadow-2xs transition-all active:scale-95 bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200/90 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 dark:text-sky-300 dark:border-sky-800"
                    expectedVal={ventasTar}
                    value={contadoTarStr}
                    onChange={setContadoTarStr}
                    disabled={loading}
                  />
                  <AmountField
                    label="Transferencia"
                    icon={Landmark}
                    badgeText="Banco"
                    badgeClassName="text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 bg-indigo-100 text-indigo-800 border border-indigo-300/80 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800"
                    buttonClassName="text-[10px] font-semibold px-2.5 py-0.5 rounded-lg border shadow-2xs transition-all active:scale-95 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200/90 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 dark:text-indigo-300 dark:border-indigo-800"
                    expectedVal={ventasTrans}
                    value={contadoTransStr}
                    onChange={setContadoTransStr}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Resumen del Cuadre / Diferencia */}
              <div
                className={`rounded-2xl p-3 border transition-all ${
                  dif === 0
                    ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs"
                    : dif < 0
                      ? "bg-rose-50/80 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-800/60 shadow-2xs"
                      : "bg-amber-50/80 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/60 shadow-2xs"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                        dif === 0
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                          : dif < 0
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300"
                      }`}
                    >
                      {dif === 0 ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`text-xs font-bold tracking-tight ${
                          dif === 0
                            ? "text-emerald-900 dark:text-emerald-200"
                            : dif < 0
                              ? "text-rose-900 dark:text-rose-200"
                              : "text-amber-900 dark:text-amber-200"
                        }`}
                      >
                        {dif === 0
                          ? "Caja perfectamente cuadrada ✓"
                          : dif < 0
                            ? "Faltante en caja"
                            : "Sobrante en caja"}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                        <span>Esperado: <strong className="text-slate-700 dark:text-slate-300">{formatRD(totalEsperado)}</strong></span>
                        <span>•</span>
                        <span>Contado: <strong className="text-slate-700 dark:text-slate-300">{formatRD(totalContado)}</strong></span>
                      </div>
                      {Math.abs(dif) > umbral && (
                        <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-0.5 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Excede umbral de tolerancia ({formatRD(umbral)})
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`font-display text-xl sm:text-2xl font-black ${
                        dif === 0
                          ? "text-emerald-700 dark:text-emerald-300"
                          : dif < 0
                            ? "text-rose-700 dark:text-rose-300"
                            : "text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {formatRD(Math.abs(dif))}
                    </div>
                    <div className="text-[9px] font-semibold text-muted-foreground">
                      {dif === 0 ? "Sin diferencias" : dif < 0 ? "Faltante" : "Sobrante"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Opción de Notas */}
              <div
                className={`rounded-xl border transition-all duration-200 p-3 shadow-2xs ${
                  showNotas
                    ? "border-sky-300 dark:border-sky-800 bg-sky-50/40 dark:bg-sky-950/20 shadow-xs"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-2xs transition-colors ${
                        showNotas
                          ? "bg-sky-100/80 dark:bg-sky-900/40 border-sky-200 dark:border-sky-800 text-[#1B4B73] dark:text-sky-300"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      <FileText className="h-4 w-4 stroke-[2]" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block leading-tight">
                        ¿Añadir nota o explicación?
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium leading-tight mt-0.5">
                        Solo si hubo alguna novedad en el cuadre
                      </span>
                    </div>
                  </div>
                  <Switch checked={showNotas} onCheckedChange={setShowNotas} disabled={loading} className="shrink-0 cursor-pointer" />
                </div>

                <AnimatePresence>
                  {showNotas && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden pt-2.5"
                    >
                      <Textarea
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                        rows={2}
                        disabled={loading}
                        placeholder="Escribe aquí cualquier observación sobre el cuadre..."
                        className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs rounded-xl shadow-2xs focus-visible:ring-1 focus-visible:ring-sky-500"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* PIN de empleado si no es Admin */}
              {empleadoRol !== "ADMIN" && (
                <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5 text-slate-400" />
                      PIN de Autorización
                    </Label>
                    <span className="text-[9px] text-muted-foreground">Firma requerida para cerrar</span>
                  </div>
                  <Input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    name="klynn_cierre_pin_autorizacion"
                    id="klynn_cierre_pin_autorizacion"
                    autoComplete="one-time-code"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    data-bwignore="true"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••"
                    disabled={loading}
                    className="h-10 text-center text-xl tracking-[0.4em] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                </div>
              )}

              {/* Footer con estilo idéntico a Apertura de Caja */}
              <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                  className="h-9 px-4 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={submit}
                  disabled={loading}
                  className="h-9 px-5 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white shadow-xs gap-1.5"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Cerrando...
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      Cerrar Caja
                    </>
                  )}
                </Button>
              </DialogFooter>
            </motion.div>
          ) : (
            <motion.div
              key="cierre-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-2 text-center space-y-3.5"
            >
              <div className="flex justify-center">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 shadow-2xs">
                  <Lock className="h-7 w-7" />
                  <div className="absolute -right-1 -top-1 rounded-full bg-emerald-500 p-1 text-white shadow-2xs ring-2 ring-white dark:ring-slate-900">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
              <div className="space-y-0.5">
                <DialogTitle className="text-xl font-display font-black text-slate-900 dark:text-white tracking-tight">
                  Caja Cerrada Exitosamente
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  El cuadre ha sido registrado y el turno ha finalizado.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  <span>Efectivo Contado:</span>
                  <span className="text-slate-900 dark:text-white font-bold">{formatRD(contadoEf)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  <span>Total Contado:</span>
                  <span className="text-slate-900 dark:text-white font-bold">
                    {formatRD(contadoEf + contadoTar + contadoTrans)}
                  </span>
                </div>
                <div className="border-t border-slate-200/80 dark:border-slate-800 pt-2 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Ventas del Turno
                  </span>
                  <span className="text-2xl font-display font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">
                    {formatRD(savedTotalRecaudado)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <Button
                  onClick={() => onOpenChange(false)}
                  variant="outline"
                  className="flex-1 h-9 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Volver a caja
                </Button>
                <Button
                  onClick={handlePrint}
                  disabled={loadingOrders}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white h-9 text-xs font-bold gap-1.5 shadow-xs rounded-xl"
                >
                  <Printer className="h-3.5 w-3.5" />{" "}
                  {loadingOrders ? "Preparando..." : "Imprimir Cierre"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

function HistoricoCierresDialog({
  open,
  onOpenChange,
  tenant,
  empleadoId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tenant: Tenant;
  empleadoId?: string;
}) {
  const [empId, setEmpId] = useState(empleadoId || "all");
  const [desde, setDesde] = useState(new Date().toISOString().split("T")[0]);
  const [hasta, setHasta] = useState(new Date().toISOString().split("T")[0]);
  const [cierres, setCierres] = useState<Caja[]>([]);
  const [page, setPage] = useState(1);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  useEffect(() => {
    if (open) {
      getEmpleados(tenant.id).then(setEmpleados);
      if (empleadoId) setEmpId(empleadoId);
      handleSearch();
    }
  }, [open, tenant.id, empleadoId]);

  async function handleSearch() {
    setLoading(true);
    const data = await getHistoricoCierres({
      tenant_id: tenant.id,
      empleado_id: empId,
      desde,
      hasta,
    });
    setCierres(data);
    setLoading(false);
  }

  const selectedEmpleado = empleados.find((e) => e.id === empId);
  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(cierres.length / pageSize));
  const currentCierres = cierres.slice((page - 1) * pageSize, page * pageSize);

  const kpiTotalCierres = cierres.length;
  const kpiTotalEfectivo = useMemo(() => {
    return cierres.reduce((s, c) => s + (c.monto_contado_efectivo || 0), 0);
  }, [cierres]);
  const kpiTotalEsperado = useMemo(() => {
    return cierres.reduce((s, c) => s + (c.monto_esperado_efectivo || 0), 0);
  }, [cierres]);
  const kpiDiferenciaNeta = useMemo(() => {
    return cierres.reduce(
      (s, c) => s + ((c.monto_contado_efectivo || 0) - (c.monto_esperado_efectivo || 0)),
      0
    );
  }, [cierres]);

  useEffect(() => {
    if (open) {
      handleSearch();
    }
  }, [empId]);

  if (showPrint) {
    return (
      <ReporteCierrePrint
        cierres={cierres}
        tenant={tenant}
        empleadoName={
          selectedEmpleado
            ? `${selectedEmpleado.nombre} ${selectedEmpleado.apellido}`
            : "Todos los empleados"
        }
        rango={`${desde} al ${hasta}`}
        onBack={() => setShowPrint(false)}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col p-0 gap-0 rounded-3xl overflow-hidden shadow-2xl border border-border/70 bg-background">
        {/* Header */}
        <div className="px-6 py-4.5 pr-14 sm:pr-16 border-b border-border/60 bg-surface/50 backdrop-blur-xs flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-display font-black text-foreground tracking-tight flex items-center gap-2">
                <span>Historial de Cierres</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  Auditoría
                </span>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Registro histórico de turnos, arqueos de caja y diferencias de efectivo.
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Barra de Filtros */}
          <div className="p-3.5 bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
              {/* Filtro de Empleado */}
              <div className="sm:col-span-5 space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap flex items-center gap-1.5 ml-0.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Filtrar empleado:</span>
                </span>
                <Select
                  value={empId}
                  onValueChange={(val) => {
                    setEmpId(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-800 rounded-xl font-semibold border-slate-200 dark:border-slate-700 shadow-2xs">
                    <SelectValue placeholder="Todos los empleados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los empleados</SelectItem>
                    {empleados.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nombre} {e.apellido || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Rango Desde */}
              <div className="sm:col-span-3 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block ml-0.5">
                  Desde
                </span>
                <DMYDatePicker
                  value={desde}
                  onChange={setDesde}
                  placeholder="DD/MM/AAAA"
                  className="h-9 text-xs bg-white dark:bg-slate-800 rounded-xl border-slate-200 dark:border-slate-700 shadow-2xs"
                />
              </div>

              {/* Rango Hasta */}
              <div className="sm:col-span-3 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block ml-0.5">
                  Hasta
                </span>
                <DMYDatePicker
                  value={hasta}
                  onChange={setHasta}
                  placeholder="DD/MM/AAAA"
                  className="h-9 text-xs bg-white dark:bg-slate-800 rounded-xl border-slate-200 dark:border-slate-700 shadow-2xs"
                />
              </div>

              {/* Botón Buscar */}
              <div className="sm:col-span-1">
                <Button
                  type="button"
                  onClick={handleSearch}
                  className="h-9 w-full text-xs font-bold rounded-xl bg-[#1B4B73] hover:bg-[#143a59] text-white flex items-center justify-center shadow-xs active:scale-95 transition-all cursor-pointer p-0"
                  title="Consultar"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Tarjetas KPI de Resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                Total Cierres
              </span>
              <span className="text-base sm:text-lg font-black text-foreground block mt-0.5">
                {kpiTotalCierres}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 block mt-0.5">
                {kpiTotalCierres === 1 ? "Turno registrado" : "Turnos registrados"}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
                Efectivo Contado
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">
                {formatRD(kpiTotalEfectivo)}
              </span>
              <span className="text-[10px] font-semibold text-emerald-600/80 block mt-0.5">
                Arqueo físico total
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 block">
                Esperado en Caja
              </span>
              <span className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 block mt-0.5">
                {formatRD(kpiTotalEsperado)}
              </span>
              <span className="text-[10px] font-semibold text-blue-600/80 block mt-0.5">
                Calculado por sistema
              </span>
            </div>

            <div
              className={`p-3 rounded-2xl border ${
                kpiDiferenciaNeta < 0
                  ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-900/40"
                  : kpiDiferenciaNeta > 0
                  ? "bg-blue-50/70 dark:bg-blue-950/30 border-blue-200/60 dark:border-blue-900/40"
                  : "bg-slate-50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800"
              }`}
            >
              <span
                className={`text-[10px] font-black uppercase tracking-wider block ${
                  kpiDiferenciaNeta < 0
                    ? "text-rose-700 dark:text-rose-300"
                    : kpiDiferenciaNeta > 0
                    ? "text-blue-700 dark:text-blue-300"
                    : "text-muted-foreground"
                }`}
              >
                Diferencia Neta
              </span>
              <span
                className={`text-base sm:text-lg font-black block mt-0.5 ${
                  kpiDiferenciaNeta < 0
                    ? "text-rose-600 dark:text-rose-400"
                    : kpiDiferenciaNeta > 0
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-foreground"
                }`}
              >
                {kpiDiferenciaNeta > 0 ? "+" : ""}
                {formatRD(kpiDiferenciaNeta)}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 block mt-0.5">
                {kpiDiferenciaNeta === 0
                  ? "Sin descuadres"
                  : kpiDiferenciaNeta < 0
                  ? "Faltante neto"
                  : "Sobrante neto"}
              </span>
            </div>
          </div>

          {/* Tabla de Cierres */}
          <div className="space-y-2.5">
            {loading ? (
              <div className="py-14 text-center text-muted-foreground text-xs flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span>Cargando histórico de cierres...</span>
              </div>
            ) : cierres.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-border/80 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
                <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-semibold">
                  No se encontraron cierres registrados en este período.
                </p>
              </div>
            ) : (
              <>
                <div className="border border-border/80 rounded-2xl overflow-hidden max-h-[260px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-border/80 text-[10px] uppercase font-bold text-muted-foreground z-10">
                      <tr>
                        <th className="px-3.5 py-2.5 text-left font-extrabold">Apertura / Cierre</th>
                        <th className="px-3.5 py-2.5 text-left font-extrabold">Cajero / Turno</th>
                        <th className="px-3.5 py-2.5 text-right font-extrabold">Efectivo</th>
                        <th className="px-3.5 py-2.5 text-right font-extrabold">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 bg-background">
                      {currentCierres.map((c) => {
                        const emp = empleados.find((e) => e.id === c.empleado_id);
                        const turnoStr = c.notas_apertura
                          ? c.notas_apertura.replace("Turno:", "").trim()
                          : "";
                        const difEf =
                          (c.monto_contado_efectivo || 0) - (c.monto_esperado_efectivo || 0);
                        return (
                          <tr
                            key={c.id}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-900/50 transition-colors"
                          >
                            <td className="px-3.5 py-2.5">
                              <div className="font-bold text-foreground flex items-center gap-1.5">
                                <Clock className="h-3 w-3 text-blue-600 shrink-0" />
                                {formatDateTimeRD(c.abierta_en)}
                              </div>
                              <div className="text-[10px] text-muted-foreground ml-4.5">
                                {c.cerrada_en ? `Cierre: ${formatDateTimeRD(c.cerrada_en)}` : "Turno Abierto"}
                              </div>
                            </td>
                            <td className="px-3.5 py-2.5">
                              <div className="font-bold text-foreground">
                                {emp ? `${emp.nombre} ${emp.apellido || ""}` : "Desconocido"}
                              </div>
                              {turnoStr && (
                                <div className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-semibold mt-0.5">
                                  {turnoStr.toLowerCase().includes("noche") ? (
                                    <Moon className="h-2.5 w-2.5 text-indigo-500" />
                                  ) : (
                                    <Sun className="h-2.5 w-2.5 text-amber-500" />
                                  )}
                                  Turno {turnoStr}
                                </div>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-black text-foreground">
                              {formatRD(c.monto_contado_efectivo || 0)}
                            </td>
                            <td className="px-3.5 py-2.5 text-right">
                              {difEf === 0 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300">
                                  RD$0.00
                                </span>
                              ) : difEf < 0 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
                                  {formatRD(Math.abs(difEf))}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
                                  +{formatRD(Math.abs(difEf))}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-1 py-1">
                    <span className="text-[11px] text-muted-foreground font-medium">
                      Mostrando {(page - 1) * pageSize + 1} al {Math.min(page * pageSize, cierres.length)} de{" "}
                      {cierres.length} cierres
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="h-8 px-2.5 rounded-xl text-xs font-bold border-slate-200 cursor-pointer"
                      >
                        <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Anterior
                      </Button>
                      <span className="text-xs font-bold text-muted-foreground px-2">
                        {page} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="h-8 px-2.5 rounded-xl text-xs font-bold border-slate-200 cursor-pointer"
                      >
                        Siguiente <ChevronRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-border/60 bg-slate-50/90 dark:bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground font-medium">Total arqueado:</span>
            <span className="font-black text-sm text-[#1B4B73] dark:text-sky-300">
              {formatRD(kpiTotalEfectivo)}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9.5 px-4 text-xs font-bold rounded-xl border-slate-200 cursor-pointer"
            >
              Cerrar
            </Button>
            <Button
              type="button"
              onClick={() => setShowPrint(true)}
              disabled={cierres.length === 0}
              className="bg-[#1B4B73] hover:bg-[#143a59] text-white font-bold h-9.5 px-5 rounded-xl text-xs flex items-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Generar Reporte Imprimible</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReporteCierrePrint({
  cierres,
  tenant,
  empleadoName,
  rango,
  onBack,
}: {
  cierres: Caja[];
  tenant: Tenant;
  empleadoName: string;
  rango: string;
  onBack: () => void;
}) {
  const totalEfectivo = cierres.reduce((s, c) => s + (c.monto_contado_efectivo || 0), 0);
  const totalDiferencia = cierres.reduce((s, c) => s + (c.diferencia || 0), 0);

  return createPortal(
    <div className="fixed inset-0 bg-white z-[99999] overflow-y-auto pointer-events-auto atomic-print-target">
      <div className="max-w-4xl mx-auto p-8 print:p-0 print:max-w-none print:m-0">
        <div className="flex justify-between items-start border-b-2 border-primary/20 pb-6 mb-8 print:hidden relative z-[100000]">
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBack();
            }}
            className="gap-2 cursor-pointer"
          >
            Volver a filtros
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.print();
            }}
            className="bg-primary text-white gap-2 cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Imprimir ahora
          </Button>
        </div>

        <div className="print-area">
          <div className="text-center mb-10">
            {tenant.logo_url ? (
              <img
                src={tenant.logo_url}
                alt={tenant.nombre}
                className="h-16 mx-auto mb-4 object-contain"
              />
            ) : (
              <h1 className="text-4xl font-display font-black text-primary uppercase tracking-tighter mb-1">
                {tenant.nombre}
              </h1>
            )}
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-[0.3em]">
              Reporte Histórico de Cierres de Caja
            </p>
            <div className="mt-6 flex justify-center gap-8 text-xs font-bold uppercase tracking-widest text-slate-500">
              <div className="border-x border-slate-200 px-6">
                Empleado: <span className="text-foreground">{empleadoName}</span>
              </div>
              <div className="border-x border-slate-200 px-6">
                Periodo: <span className="text-foreground">{rango}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 print:bg-white">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Total Efectivo Recaudado
              </div>
              <div className="text-3xl font-display font-black text-primary">
                {formatRD(totalEfectivo)}
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 print:bg-white">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Balance de Diferencias
              </div>
              <div
                className={`text-3xl font-display font-black ${totalDiferencia < 0 ? "text-destructive" : "text-success"}`}
              >
                {formatRD(totalDiferencia)}
              </div>
            </div>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="py-4 px-2">Fecha / Hora</th>
                <th className="py-4 px-2">Estado</th>
                <th className="py-4 px-2 text-right">Monto Inicial</th>
                <th className="py-4 px-2 text-right">Efectivo</th>
                <th className="py-4 px-2 text-right">Diferencia</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {cierres.map((c, i) => (
                <tr
                  key={c.id}
                  className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-slate-50/30 print:bg-white" : ""}`}
                >
                  <td className="py-4 px-2">
                    <div className="font-bold">{formatDateTimeRD(c.abierta_en)}</div>
                    <div className="text-[10px] text-slate-400">ID: {c.id}</div>
                  </td>
                  <td className="py-4 px-2">
                    <Badge variant="outline" className="text-[9px] font-bold uppercase">
                      {c.estado}
                    </Badge>
                  </td>
                  <td className="py-4 px-2 text-right font-medium text-slate-500">
                    {formatRD(c.monto_inicial)}
                  </td>
                  <td className="py-4 px-2 text-right font-bold text-slate-900">
                    {formatRD(c.monto_contado_efectivo || 0)}
                  </td>
                  <td
                    className={`py-4 px-2 text-right font-bold ${(c.diferencia || 0) < 0 ? "text-destructive" : "text-success"}`}
                  >
                    {formatRD(c.diferencia || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-20 grid grid-cols-2 gap-20 px-10">
            <div className="text-center">
              <div className="border-t border-slate-300 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Firma Administrador
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-slate-300 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Sello de Sucursal
              </div>
            </div>
          </div>

          <div className="mt-10 text-center text-[10px] text-slate-400 italic">
            Documento generado por Klynn Cloud - {new Date().toLocaleString("es-DO")}
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page { size: portrait; margin: 10mm; }
          html, body { overflow: visible !important; height: auto !important; background: white !important; }
          /* OCULTAR TODO EL APP */
          body > *:not(.atomic-print-target) { display: none !important; }
          /* MOSTRAR SOLO EL TARGET */
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

function getCuadreEstadoBadge(estado: string) {
  switch (estado) {
    case "RECIBIDA":
      return <Badge variant="outline" className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">Recibida</Badge>;
    case "EN_PROCESO":
      return <Badge variant="outline" className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">En proceso</Badge>;
    case "LISTA":
      return <Badge variant="outline" className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">Lista</Badge>;
    case "ENTREGADA":
      return <Badge variant="outline" className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">Entregada</Badge>;
    case "ANULADA":
      return <Badge variant="outline" className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">Anulada</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300">{estado}</Badge>;
  }
}

function getCuadreMetodoBadge(metodo?: string) {
  if (!metodo) return <span className="text-muted-foreground text-xs">—</span>;
  const m = metodo.toUpperCase();
  if (m === "EFECTIVO") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60">Efectivo</span>;
  }
  if (m === "TARJETA") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/70 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60">Tarjeta</span>;
  }
  if (m === "TRANSFERENCIA") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60">Transfer</span>;
  }
  if (m === "CREDITO") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60">Crédito</span>;
  }
  if (m === "PAGO_AL_RETIRAR") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200/70 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60">Al retirar</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300">{metodo.replace(/_/g, " ")}</span>;
}

function HistoricoCuadreDialog({
  open,
  onOpenChange,
  tenant,
  empleadoId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tenant: Tenant;
  empleadoId?: string;
}) {
  const [empId, setEmpId] = useState(empleadoId || "all");
  const [desde, setDesde] = useState(new Date().toISOString().split("T")[0]);
  const [hasta, setHasta] = useState(new Date().toISOString().split("T")[0]);
  const [filtrarFechas, setFiltrarFechas] = useState(false);
  const [cierres, setCierres] = useState<Caja[]>([]);
  const [selectedCierreId, setSelectedCierreId] = useState<string>("");
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [activeTab, setActiveTab] = useState<"ordenes" | "movimientos">("ordenes");
  const [formato, setFormato] = useState<"57mm" | "80mm">(
    tenant.config?.formato_ticket === "57mm" ? "57mm" : "80mm"
  );

  useEffect(() => {
    if (open && tenant.config?.formato_ticket) {
      setFormato(tenant.config.formato_ticket === "57mm" ? "57mm" : "80mm");
    }
  }, [open, tenant.config?.formato_ticket]);

  useEffect(() => {
    if (open) {
      getEmpleados(tenant.id).then(setEmpleados);
      if (empleadoId) setEmpId(empleadoId);

      // Fetch closed shifts
      getHistoricoCierres({ tenant_id: tenant.id, empleado_id: "all" }).then((data) => {
        setCierres(data);
        if (data.length > 0) {
          const lastCierre = data[0];
          setSelectedCierreId(lastCierre.id);
          setDesde(lastCierre.abierta_en);
          setHasta(lastCierre.cerrada_en || new Date().toISOString());
          handleSearchForCierre(lastCierre);
        } else {
          setSelectedCierreId("");
          setOrdenes([]);
          setMovimientos([]);
        }
      });
    }
  }, [open, tenant.id, empleadoId]);

  async function handleSearchForCierre(cierreObj: Caja) {
    setLoading(true);
    const startRange = cierreObj.abierta_en;
    const endRange = cierreObj.cerrada_en || new Date().toISOString();
    await fetchOrdersAndMovs(startRange, endRange);
    setLoading(false);
  }

  async function fetchOrdersAndMovs(startRange: string, endRange: string) {
    const ordsData = await getOrdenesByPeriod({
      tenant_id: tenant.id,
      empleado_id: empId && empId !== "all" ? empId : undefined,
      desde: startRange,
      hasta: endRange,
    });
    setOrdenes(ordsData || []);

    const allMovs = await getMovimientos(tenant.id);
    let filteredMovs = [...allMovs];
    if (empId && empId !== "all") {
      filteredMovs = filteredMovs.filter((m) => m.empleado_id === empId);
    }
    filteredMovs = filteredMovs.filter((m) => {
      const created = m.creado_en || new Date().toISOString();
      return created >= startRange && created <= endRange;
    });
    filteredMovs.sort((a, b) => +new Date(a.creado_en) - +new Date(b.creado_en));
    setMovimientos(filteredMovs);
  }

  async function handleSearch() {
    if (filtrarFechas) {
      setLoading(true);
      const startRange = desde;
      const endRange = hasta + "T23:59:59Z";
      await fetchOrdersAndMovs(startRange, endRange);
      setLoading(false);
    } else {
      const activeCierre = cierres.find((c) => c.id === selectedCierreId);
      if (activeCierre) {
        await handleSearchForCierre(activeCierre);
      } else {
        setOrdenes([]);
        setMovimientos([]);
      }
    }
  }

  // Refrescar al cambiar filtros
  useEffect(() => {
    if (open) handleSearch();
  }, [filtrarFechas, empId, selectedCierreId]);

  const handleCierreChange = (cierreId: string) => {
    setSelectedCierreId(cierreId);
    const selected = cierres.find((c) => c.id === cierreId);
    if (selected) {
      setDesde(selected.abierta_en);
      setHasta(selected.cerrada_en || new Date().toISOString());
    }
  };

  const selectedEmpleado = empleados.find((e) => e.id === empId);

  const activeCierre = useMemo(() => {
    return cierres.find((c) => c.id === selectedCierreId);
  }, [cierres, selectedCierreId]);

  const kpiTotalFacturado = useMemo(() => {
    return ordenes.reduce((sum, o) => sum + (o.total || 0), 0);
  }, [ordenes]);

  const kpiEfectivo = useMemo(() => {
    return ordenes
      .filter((o) => o.metodo_pago === "EFECTIVO")
      .reduce((sum, o) => sum + (o.total || 0), 0);
  }, [ordenes]);

  const kpiTarjetaTransf = useMemo(() => {
    return ordenes
      .filter((o) => o.metodo_pago === "TARJETA" || o.metodo_pago === "TRANSFERENCIA")
      .reduce((sum, o) => sum + (o.total || 0), 0);
  }, [ordenes]);

  const filteredMovsList = useMemo(() => {
    return movimientos.filter((m) => !m.concepto.startsWith("Venta orden #"));
  }, [movimientos]);

  const kpiMovimientosNeto = useMemo(() => {
    return filteredMovsList.reduce((acc, m) => {
      const isNegative = ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA"].includes(m.tipo);
      return isNegative ? acc - (m.monto || 0) : acc + (m.monto || 0);
    }, 0);
  }, [filteredMovsList]);

  if (showPrint) {
    const printedRange = activeCierre
      ? `${formatDateTimeRD(activeCierre.abierta_en)} al ${formatDateTimeRD(activeCierre.cerrada_en!)}`
      : `${formatDateTimeRD(desde)} al ${formatDateTimeRD(hasta)}`;

    return (
      <ReporteCuadreThermal
        ordenes={ordenes}
        movimientos={movimientos}
        tenant={tenant}
        empleadoName={
          selectedEmpleado
            ? `${selectedEmpleado.nombre} ${selectedEmpleado.apellido || ""}`
            : "Todos los empleados"
        }
        rango={printedRange}
        formato={formato}
        mostrarRango={true}
        montoInicial={activeCierre?.monto_inicial || 0}
        onBack={() => setShowPrint(false)}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col p-0 gap-0 rounded-3xl overflow-hidden shadow-2xl border border-border/70 bg-background">
        {/* Header */}
        <div className="px-6 py-4.5 pr-14 sm:pr-16 border-b border-border/60 bg-surface/50 backdrop-blur-xs flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-display font-black text-foreground tracking-tight flex items-center gap-2">
                <span>Imprimir Cuadre POS</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  Térmico
                </span>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Resumen de ventas y balance de caja para emisión de ticket térmico.
              </p>
            </div>
          </div>

          {/* Formato Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 mr-4 sm:mr-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1.5 flex items-center gap-1 hidden sm:flex">
              <Printer className="h-3 w-3" />
              Rollo:
            </span>
            <button
              type="button"
              onClick={() => setFormato("80mm")}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                formato === "80mm"
                  ? "bg-white dark:bg-slate-900 text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              80mm
            </button>
            <button
              type="button"
              onClick={() => setFormato("57mm")}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                formato === "57mm"
                  ? "bg-white dark:bg-slate-900 text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              57mm
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Barra de Filtros */}
          <div className="p-3.5 bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              {/* Selector de Modo */}
              <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setFiltrarFechas(false)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    !filtrarFechas
                      ? "bg-[#1B4B73] text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <History className="h-3.5 w-3.5" />
                  <span>Por Cierre</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFiltrarFechas(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filtrarFechas
                      ? "bg-[#1B4B73] text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Por Fechas</span>
                </button>
              </div>

              {/* Filtro de Empleado */}
              <div className="flex items-center gap-2 sm:max-w-[300px] w-full sm:w-auto">
                <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap flex items-center gap-1.5 shrink-0">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Filtrar empleado:</span>
                </span>
                <div className="flex-1 min-w-[150px]">
                  <Select value={empId} onValueChange={setEmpId}>
                    <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-800 rounded-xl font-semibold border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="Todos los empleados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los empleados</SelectItem>
                      {empleados.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.nombre} {e.apellido || ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Opciones según el modo */}
            {!filtrarFechas ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800 items-start">
                {/* Columna 1: Cierre de Turno */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                    >
                      <History className="h-3 w-3 mr-1 inline" />
                      Cierre de Turno
                    </Badge>
                  </div>
                  <Select
                    value={selectedCierreId}
                    onValueChange={handleCierreChange}
                  >
                    <SelectTrigger className="h-10 text-xs bg-white dark:bg-slate-800 rounded-xl font-bold border-slate-200 dark:border-slate-700 shadow-2xs">
                      <SelectValue placeholder="Seleccionar Cierre" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {cierres.map((c, idx) => {
                        const dateStr = new Date(c.cerrada_en || c.abierta_en).toLocaleDateString("es-DO", { day: "2-digit", month: "short" });
                        const timeStr = c.cerrada_en ? new Date(c.cerrada_en).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" }) : "";
                        const turno = c.notas_apertura ? c.notas_apertura.replace("Turno:", "").trim() : "";
                        return (
                          <SelectItem key={c.id} value={c.id}>
                            {idx === 0 ? "★ Último Cierre" : `Cierre #${cierres.length - idx}`} · {dateStr} {timeStr ? `(${timeStr})` : ""} {turno ? `· Turno ${turno}` : ""}
                          </SelectItem>
                        );
                      })}
                      {cierres.length === 0 && (
                        <SelectItem value="none" disabled>
                          Sin cierres registrados
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Columna 2: Horario y Turno */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <Badge
                      variant="outline"
                      className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                    >
                      <Clock className="h-3 w-3 mr-1 inline" />
                      Horario y Balance
                    </Badge>
                    {activeCierre?.notas_apertura && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/80 uppercase">
                        {activeCierre.notas_apertura.toLowerCase().includes("noche") ? (
                          <Moon className="h-3 w-3 text-indigo-500 shrink-0" />
                        ) : (
                          <Sun className="h-3 w-3 text-amber-500 shrink-0" />
                        )}
                        Turno {activeCierre.notas_apertura.replace("Turno:", "").trim()}
                      </span>
                    )}
                  </div>
                  {activeCierre ? (
                    <div className="h-10 px-3 flex items-center justify-between gap-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-xs shadow-2xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap flex items-center gap-1.5 text-[11px]">
                        <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        {new Date(activeCierre.abierta_en).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}
                        {" → "}
                        {activeCierre.cerrada_en ? new Date(activeCierre.cerrada_en).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" }) : "Abierta"}
                      </span>
                      {activeCierre.monto_inicial !== undefined && (
                        <div className="text-right shrink-0 whitespace-nowrap">
                          <span className="text-[10px] text-muted-foreground mr-1">Fondo inicial:</span>
                          <span className="font-black text-slate-900 dark:text-slate-100 text-[11px]">
                            {formatRD(activeCierre.monto_inicial)}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-10 px-3 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-dashed border-slate-200 text-xs text-muted-foreground">
                      Sin cierre seleccionado
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800 items-end">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Desde
                  </label>
                  <DMYDatePicker
                    value={desde}
                    onChange={setDesde}
                    placeholder="DD/MM/AAAA"
                    className="h-9 text-xs bg-white dark:bg-slate-800 rounded-xl border-slate-200 dark:border-slate-700 shadow-2xs"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Hasta
                  </label>
                  <DMYDatePicker
                    value={hasta}
                    onChange={setHasta}
                    placeholder="DD/MM/AAAA"
                    className="h-9 text-xs bg-white dark:bg-slate-800 rounded-xl border-slate-200 dark:border-slate-700 shadow-2xs"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleSearch}
                  className="h-9 text-xs font-bold rounded-xl bg-[#1B4B73] hover:bg-[#143a59] text-white flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Consultar</span>
                </Button>
              </div>
            )}
          </div>

          {/* Tarjetas KPI de Resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                Total Facturado
              </span>
              <span className="text-base sm:text-lg font-black text-foreground block mt-0.5">
                {formatRD(kpiTotalFacturado)}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 block mt-0.5">
                {ordenes.length} {ordenes.length === 1 ? "orden" : "órdenes"}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
                En Efectivo
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">
                {formatRD(kpiEfectivo)}
              </span>
              <span className="text-[10px] font-semibold text-emerald-600/80 block mt-0.5">
                Ventas de contado
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 block">
                Tarjeta / Transf.
              </span>
              <span className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 block mt-0.5">
                {formatRD(kpiTarjetaTransf)}
              </span>
              <span className="text-[10px] font-semibold text-blue-600/80 block mt-0.5">
                Cobro electrónico
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 block">
                Movimientos Caja
              </span>
              <span className={`text-base sm:text-lg font-black block mt-0.5 ${kpiMovimientosNeto < 0 ? "text-rose-600" : "text-amber-600 dark:text-amber-400"}`}>
                {kpiMovimientosNeto > 0 ? "+" : ""}{formatRD(kpiMovimientosNeto)}
              </span>
              <span className="text-[10px] font-semibold text-amber-600/80 block mt-0.5">
                {filteredMovsList.length} registros
              </span>
            </div>
          </div>

          {/* Selector de pestañas */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab("ordenes")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "ordenes"
                      ? "bg-[#1B4B73] text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>Órdenes</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    activeTab === "ordenes" ? "bg-white/20 text-white" : "bg-black/10 dark:bg-white/10"
                  }`}>
                    {ordenes.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("movimientos")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "movimientos"
                      ? "bg-[#1B4B73] text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  <Coins className="h-3.5 w-3.5" />
                  <span>Movimientos</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    activeTab === "movimientos" ? "bg-white/20 text-white" : "bg-black/10 dark:bg-white/10"
                  }`}>
                    {filteredMovsList.length}
                  </span>
                </button>
              </div>

              <span className="text-[11px] text-muted-foreground hidden sm:inline-block">
                {activeTab === "ordenes" ? "Detalle de ventas incluidas en el cuadre" : "Abonos, gastos y retiros del turno"}
              </span>
            </div>

            {/* Contenido de pestaña */}
            {loading ? (
              <div className="py-14 text-center text-muted-foreground text-xs flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span>Cargando datos del cuadre...</span>
              </div>
            ) : activeTab === "ordenes" ? (
              ordenes.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-border/80 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
                  <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground font-semibold">
                    No se encontraron órdenes registradas en este período.
                  </p>
                </div>
              ) : (
                <div className="border border-border/80 rounded-2xl overflow-hidden max-h-[260px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-border/80 text-[10px] uppercase font-bold text-muted-foreground z-10">
                      <tr>
                        <th className="px-3.5 py-2.5 text-left font-extrabold">Orden</th>
                        <th className="px-3.5 py-2.5 text-left font-extrabold">Fecha y Hora</th>
                        <th className="px-3.5 py-2.5 text-center font-extrabold">Pago</th>
                        <th className="px-3.5 py-2.5 text-center font-extrabold">Estado</th>
                        <th className="px-3.5 py-2.5 text-right font-extrabold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 bg-background">
                      {ordenes.map((o) => (
                        <tr key={o.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="px-3.5 py-2.5 font-mono font-bold text-foreground">
                            #{o.numero}
                          </td>
                          <td className="px-3.5 py-2.5 text-muted-foreground whitespace-nowrap">
                            {formatDateTimeRD(o.creado_en)}
                          </td>
                          <td className="px-3.5 py-2.5 text-center">
                            {getCuadreMetodoBadge(o.metodo_pago)}
                          </td>
                          <td className="px-3.5 py-2.5 text-center">
                            {getCuadreEstadoBadge(o.estado)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-black text-foreground">
                            {formatRD(o.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              filteredMovsList.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-border/80 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
                  <Coins className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground font-semibold">
                    No se registraron abonos, ingresos o gastos en este período.
                  </p>
                </div>
              ) : (
                <div className="border border-border/80 rounded-2xl overflow-hidden max-h-[260px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-border/80 text-[10px] uppercase font-bold text-muted-foreground z-10">
                      <tr>
                        <th className="px-3.5 py-2.5 text-left font-extrabold">Hora</th>
                        <th className="px-3.5 py-2.5 text-left font-extrabold">Tipo</th>
                        <th className="px-3.5 py-2.5 text-left font-extrabold">Concepto</th>
                        <th className="px-3.5 py-2.5 text-center font-extrabold">Método</th>
                        <th className="px-3.5 py-2.5 text-right font-extrabold">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 bg-background">
                      {filteredMovsList.map((m) => {
                        const isNegative = ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA"].includes(m.tipo);
                        const isAbono = m.tipo === "ABONO" || m.concepto.includes("Abono");
                        return (
                          <tr key={m.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/50 transition-colors">
                            <td className="px-3.5 py-2.5 text-muted-foreground whitespace-nowrap font-medium">
                              {formatDateTimeRD(m.creado_en).split(",")[1]?.trim() || "—"}
                            </td>
                            <td className="px-3.5 py-2.5">
                              <Badge
                                variant="outline"
                                className={`text-[9px] font-black rounded-lg px-2 py-0.5 uppercase ${
                                  isAbono
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : m.tipo === "INGRESO"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : isNegative
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}
                              >
                                {isAbono ? "ABONO" : m.tipo}
                              </Badge>
                            </td>
                            <td className="px-3.5 py-2.5 max-w-xs truncate font-medium text-foreground" title={m.concepto}>
                              {m.concepto}
                            </td>
                            <td className="px-3.5 py-2.5 text-center">
                              {getCuadreMetodoBadge(m.metodo)}
                            </td>
                            <td className={`px-3.5 py-2.5 text-right font-black ${isNegative ? "text-rose-600" : "text-emerald-600"}`}>
                              {isNegative ? "-" : "+"}{formatRD(m.monto)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-border/60 bg-slate-50/90 dark:bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground font-medium">Total ventas:</span>
            <span className="font-black text-sm text-[#1B4B73] dark:text-sky-300">
              {formatRD(kpiTotalFacturado)}
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-[11px] text-muted-foreground">
              Formato: <b className="text-foreground">{formato}</b>
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9.5 px-4 rounded-xl font-bold text-xs"
            >
              Cerrar
            </Button>
            <Button
              type="button"
              onClick={() => setShowPrint(true)}
              disabled={ordenes.length === 0 && movimientos.length === 0}
              className="h-9.5 px-5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir Cuadre Térmico</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReporteCuadreThermal({
  ordenes,
  movimientos = [],
  tenant,
  empleadoName,
  rango,
  formato,
  mostrarRango,
  montoInicial = 0,
  onBack,
}: {
  ordenes: Orden[];
  movimientos?: MovimientoCaja[];
  tenant: Tenant;
  empleadoName: string;
  rango: string;
  formato: "57mm" | "80mm";
  mostrarRango?: boolean;
  montoInicial?: number;
  onBack: () => void;
}) {


  const total = ordenes.reduce((s, o) => s + o.total, 0);
  const cashSales = ordenes
    .filter((o) => o.metodo_pago === "EFECTIVO")
    .reduce((s, o) => s + o.total, 0);
  const cardSales = ordenes
    .filter((o) => o.metodo_pago === "TARJETA")
    .reduce((s, o) => s + o.total, 0);
  const transferSales = ordenes
    .filter((o) => o.metodo_pago === "TRANSFERENCIA")
    .reduce((s, o) => s + o.total, 0);
  const credit = ordenes
    .filter((o) => o.metodo_pago === "CREDITO")
    .reduce((s, o) => s + o.total, 0);
  const retirar = ordenes
    .filter((o) => o.metodo_pago === "PAGO_AL_RETIRAR")
    .reduce((s, o) => s + o.total, 0);
  const ventasContado = cashSales + cardSales + transferSales;
  const ventasCredito = credit;
  const totalFacturado = total;

  const cash = movimientos
    .filter(
      (m) =>
        m.tipo === "VENTA" &&
        m.metodo === "EFECTIVO" &&
        !m.concepto.startsWith("Cobro de saldo orden #"),
    )
    .reduce((s, m) => s + m.monto, 0);
  const card = movimientos
    .filter(
      (m) =>
        m.tipo === "VENTA" &&
        m.metodo === "TARJETA" &&
        !m.concepto.startsWith("Cobro de saldo orden #"),
    )
    .reduce((s, m) => s + m.monto, 0);
  const transfer = movimientos
    .filter(
      (m) =>
        m.tipo === "VENTA" &&
        m.metodo === "TRANSFERENCIA" &&
        !m.concepto.startsWith("Cobro de saldo orden #"),
    )
    .reduce((s, m) => s + m.monto, 0);

  const abonosCredito = movimientos
    .filter(
      (m) =>
        m.tipo === "ABONO" ||
        m.concepto.includes("Abono inicial orden") ||
        m.concepto.startsWith("Cobro de saldo orden #"),
    )
    .reduce((s, m) => s + m.monto, 0);
  const abonosEfectivo = movimientos
    .filter(
      (m) =>
        (m.tipo === "ABONO" ||
          m.concepto.includes("Abono inicial orden") ||
          m.concepto.startsWith("Cobro de saldo orden #")) &&
        m.metodo === "EFECTIVO",
    )
    .reduce((s, m) => s + m.monto, 0);
  const abonosTarjeta = movimientos
    .filter(
      (m) =>
        (m.tipo === "ABONO" ||
          m.concepto.includes("Abono inicial orden") ||
          m.concepto.startsWith("Cobro de saldo orden #")) &&
        m.metodo === "TARJETA",
    )
    .reduce((s, m) => s + m.monto, 0);
  const abonosTransferencia = movimientos
    .filter(
      (m) =>
        (m.tipo === "ABONO" ||
          m.concepto.includes("Abono inicial orden") ||
          m.concepto.startsWith("Cobro de saldo orden #")) &&
        m.metodo === "TRANSFERENCIA",
    )
    .reduce((s, m) => s + m.monto, 0);
  const totalTarjetas = card + abonosTarjeta;
  const totalTransferencias = transfer + abonosTransferencia;
  const totalDigital = totalTarjetas + totalTransferencias;
  const manualIngresos = movimientos
    .filter((m) => m.tipo === "INGRESO" && !m.concepto.includes("Apertura de caja"))
    .reduce((s, m) => s + m.monto, 0);
  const manualEgresos = movimientos
    .filter(
      (m) =>
        ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA"].includes(m.tipo) &&
        !m.concepto.includes("Reembolso: Anulaci"),
    )
    .reduce((s, m) => s + m.monto, 0);
  const anulado = movimientos
    .filter((m) => m.concepto.includes("Reembolso: Anulaci"))
    .reduce((s, m) => s + m.monto, 0);

  const realTotalEfectivo =
    cash + abonosEfectivo + montoInicial + manualIngresos - manualEgresos - anulado;
  const totalDineroRecaudado = cash + card + transfer + abonosCredito;

  const displayMovs = movimientos.filter((m) => {
    if (m.orden_id && ordenes.some((o) => o.id === m.orden_id)) {
      return false;
    }
    return (
      !m.concepto.startsWith("Venta orden #") &&
      !m.concepto.startsWith("Abono inicial orden #") &&
      m.tipo !== "ABONO"
    );
  });

  const ventasRealizadas = ordenes.filter((o) => o.estado !== "ANULADA").length;
  const devoluciones =
movimientos.filter((m) => m.concepto.includes("Reembolso: Anulaci")).length ||
    ordenes.filter((o) => o.estado === "ANULADA").length;
  const montoDescontado = ordenes
    .filter((o) => o.estado !== "ANULADA")
    .reduce((s, o) => s + (o.descuento || 0), 0);
  const itbisRecaudado = ordenes
    .filter((o) => o.estado !== "ANULADA")
    .reduce((s, o) => s + (o.itbis || 0), 0);
  const w = formato === "57mm" ? "w-[58mm] max-w-[58mm]" : "w-[80mm] max-w-[80mm]";

  return createPortal(
    <div className="fixed inset-0 bg-white z-[99999] overflow-y-auto pointer-events-auto atomic-print-target flex flex-col items-center py-6 print:p-0">
      <div className="w-full max-w-md mx-auto print:max-w-none print:m-0 flex flex-col items-center">
        <div className="w-full flex justify-between items-center border-b-2 border-primary/20 pb-4 mb-6 print:hidden">
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              onBack();
            }}
            className="cursor-pointer"
          >
            Cerrar
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              window.print();
            }}
            className="bg-primary text-white gap-2 cursor-pointer font-bold shadow-sm"
          >
            <Printer className="h-4 w-4" /> Imprimir ahora
          </Button>
        </div>

        <div
          className={`thermal-ticket mx-auto ${w} bg-white px-3 py-3 text-[11px] leading-snug text-black border border-dashed border-black/20 print:border-none`}
          style={{
            fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
        >
          {/* Encabezado */}
          <div className="text-center space-y-0.5">
            {tenant.logo_url ? (
              <div className="flex justify-center mb-1">
                <img
                  src={tenant.logo_url}
                  alt="Logo"
                  className="h-16 w-auto max-w-[180px] object-contain filter grayscale mx-auto"
                />
              </div>
            ) : (
              <div className="text-xl font-bold uppercase tracking-tight text-center leading-tight">
                {tenant.nombre}
              </div>
            )}
            {tenant.nombre_sucursal && (
              <div className="text-[10px] uppercase font-semibold text-black/80">{tenant.nombre_sucursal}</div>
            )}
            {tenant.rnc && (
              <div className="text-[10px] font-medium">RNC: {tenant.rnc}</div>
            )}
            {tenant.telefono && (
              <div className="text-[10px] font-medium">Tel: {tenant.telefono}</div>
            )}
            <div className="my-2 border-t-[1.5px] border-dashed border-black" />
            <div className="text-center font-black uppercase text-[12px] py-1 tracking-wider text-black border border-black rounded-xs">
              ★ CUADRE DE CAJA ★
            </div>
            {mostrarRango && (
              <div className="text-[10px] text-center uppercase font-bold text-black mt-1">{rango}</div>
            )}
          </div>

          <div className="my-2 border-t-[1.5px] border-dashed border-black" />

          {/* Metadatos */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Empleado:</span>
              <span className="font-bold text-black">{empleadoName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Fecha de Emisión:</span>
              <span className="font-semibold tabular-nums text-black">
                {new Date().toLocaleString("es-DO", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>
          </div>

          {/* [1] RESUMEN DE VENTAS */}
          <div className="mt-3 border-t-[1.5px] border-dashed border-black" />
          <div className="text-center font-bold tracking-widest text-[11px] uppercase py-0.5">
            [1] RESUMEN DE VENTAS
          </div>
          <div className="border-t border-dashed border-black my-1" />
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Ventas al Contado:</span>
              <span className="font-bold tabular-nums">{formatRD(ventasContado)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Ventas a Crédito:</span>
              <span className="font-bold tabular-nums">{formatRD(ventasCredito)}</span>
            </div>
            {retirar > 0 && (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black/80">Pago al Retirar:</span>
                <span className="font-bold tabular-nums">{formatRD(retirar)}</span>
              </div>
            )}
            <div className="border-t-2 border-black my-1.5" />
            <div className="flex justify-between items-center text-[12px] font-black">
              <span>TOTAL FACTURADO:</span>
              <span className="tabular-nums">{formatRD(totalFacturado)}</span>
            </div>
          </div>

          {/* [2] MOVIMIENTOS DE CAJA */}
          <div className="mt-3 border-t-[1.5px] border-dashed border-black" />
          <div className="text-center font-bold tracking-widest text-[11px] uppercase py-0.5">
            [2] MOVIMIENTOS DE CAJA
          </div>
          <div className="border-t border-dashed border-black my-1" />

          {/* Sub-bloque: MOVIMIENTOS EN EFECTIVO */}
          <div className="text-[10.5px] font-black uppercase text-black text-center tracking-wider my-0.5">
            -- MOVIMIENTOS EN EFECTIVO --
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">(+) Fondo Inicial (Apertura):</span>
              <span className="font-bold tabular-nums">{formatRD(montoInicial)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">(+) Ventas en Efectivo:</span>
              <span className="font-bold tabular-nums">{formatRD(cash)}</span>
            </div>
            {abonosEfectivo > 0 && (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black/80">(+) Abonos a Crédito (Efectivo):</span>
                <span className="font-bold tabular-nums">{formatRD(abonosEfectivo)}</span>
              </div>
            )}
            {manualIngresos > 0 && (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black/80">(+) Otros Ingresos (Efectivo):</span>
                <span className="font-bold tabular-nums">{formatRD(manualIngresos)}</span>
              </div>
            )}
            {manualEgresos > 0 && (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black/80">(-) Egresos / Retiros:</span>
                <span className="font-bold tabular-nums">{formatRD(manualEgresos)}</span>
              </div>
            )}
            {anulado > 0 && (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black/80">(-) Anulaciones / Reembolsos:</span>
                <span className="font-bold tabular-nums">{formatRD(anulado)}</span>
              </div>
            )}
            <div className="border-t-2 border-black my-1.5" />
            <div className="flex justify-between items-center text-[12px] font-black">
              <span>TOTAL EFECTIVO EN CAJA:</span>
              <span className="tabular-nums">{formatRD(realTotalEfectivo)}</span>
            </div>
          </div>

          {/* Sub-bloque: COBROS DIGITALES / BANCO */}
          <div className="mt-2.5 border-t border-dotted border-black/50" />
          <div className="text-[10.5px] font-black uppercase text-black text-center tracking-wider my-0.5">
            -- COBROS DIGITALES / BANCO --
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">(+) Tarjetas (Verifone):</span>
              <span className="font-bold tabular-nums">{formatRD(card)}</span>
            </div>
            {abonosTarjeta > 0 && (
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-medium text-black/70 pl-2">↳ Abonos con Tarjeta:</span>
                <span className="font-bold tabular-nums">{formatRD(abonosTarjeta)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">(+) Transferencias (Banco):</span>
              <span className="font-bold tabular-nums">{formatRD(transfer)}</span>
            </div>
            {abonosTransferencia > 0 && (
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-medium text-black/70 pl-2">↳ Abonos por Transferencia:</span>
                <span className="font-bold tabular-nums">{formatRD(abonosTransferencia)}</span>
              </div>
            )}
            <div className="border-t border-black my-1" />
            <div className="flex justify-between items-center text-[11.5px] font-bold">
              <span>TOTAL DIGITAL / BANCO:</span>
              <span className="tabular-nums">{formatRD(totalDigital)}</span>
            </div>
          </div>

          {/* Gran Total */}
          <div className="mt-3 border-t-[1.5px] border-dashed border-black pt-1" />
          <div className="flex justify-between items-center text-[13px] font-black py-0.5">
            <span className="tracking-tight">TOTAL GENERAL:</span>
            <span className="tabular-nums font-black text-[13.5px]">{formatRD(totalDineroRecaudado)}</span>
          </div>

          {/* [3] DETALLE DE ÓRDENES */}
          <div className="mt-3 border-t-[1.5px] border-dashed border-black" />
          <div className="text-center font-bold tracking-widest text-[11px] uppercase py-0.5">
            [3] DETALLE DE ÓRDENES ({ordenes.length})
          </div>
          <div className="border-t border-dashed border-black my-1" />
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold border-b border-black/20 pb-1">
              <span># ORDEN (MÉTODO)</span>
              <span>MONTO</span>
            </div>
            {ordenes.map((o) => {
              const label =
                o.metodo_pago === "CREDITO"
                  ? "CRÉDITO"
                  : o.metodo_pago === "PAGO_AL_RETIRAR"
                    ? "AL RETIRAR"
                    : o.metodo_pago || "CONTADO";

              return (
                <div key={o.id} className="flex justify-between items-center text-[11px] border-b border-dotted border-black/20 pb-0.5">
                  <span className="font-semibold text-black">
                    {o.numero} <span className="font-bold text-black uppercase text-[10px]">({label})</span>
                  </span>
                  <span className="font-bold tabular-nums text-black">{formatRD(o.total)}</span>
                </div>
              );
            })}
          </div>

          {/* [4] OTROS MOVIMIENTOS DE CAJA */}
          {displayMovs.length > 0 && (
            <>
              <div className="mt-3 border-t-[1.5px] border-dashed border-black" />
              <div className="text-center font-bold tracking-widest text-[11px] uppercase py-0.5">
                [4] OTROS MOVIMIENTOS DE CAJA
              </div>
              <div className="border-t border-dashed border-black my-1" />
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-[10px] font-bold border-b border-black/20 pb-1">
                  <span>CONCEPTO</span>
                  <span>MONTO</span>
                </div>
                {displayMovs.map((m) => {
                  const isNegative = ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA"].includes(m.tipo);
                  return (
                    <div key={m.id} className="flex justify-between items-start gap-1 border-b border-dotted border-black/20 pb-0.5">
                      <span className="text-left font-medium leading-tight max-w-[70%]">
                        {m.concepto.replace(/\s*\[(EFECTIVO|TARJETA|TRANSFERENCIA|CREDITO|PAGO_AL_RETIRAR|.*?)]/gi, "").trim()}
                      </span>
                      <span className="font-bold tabular-nums shrink-0">
                        {isNegative ? "-" : "+"}
                        {formatRD(m.monto)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* [5] ESTADÍSTICAS DEL TURNO */}
          <div className="mt-3 border-t-[1.5px] border-dashed border-black" />
          <div className="text-center font-bold tracking-widest text-[11px] uppercase py-0.5">
            [5] ESTADÍSTICAS DEL TURNO
          </div>
          <div className="border-t border-dashed border-black my-1" />
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Órdenes Procesadas:</span>
              <span className="font-bold tabular-nums">{ventasRealizadas}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Devoluciones / Anulaciones:</span>
              <span className="font-bold tabular-nums">{devoluciones}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Descuentos Aplicados:</span>
              <span className="font-bold tabular-nums">{formatRD(montoDescontado)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">ITBIS Recaudado ({tenant.config?.itbis_porcentaje ?? 18}%):</span>
              <span className="font-bold tabular-nums">{formatRD(itbisRecaudado)}</span>
            </div>
          </div>

          {/* Firma Cajero */}
          <div className="mt-14 text-center">
            <div className="border-t border-black w-48 mx-auto" />
            <div className="font-bold text-[11px] mt-1 uppercase">Cajero(a) en Turno</div>
            <div className="text-[10px] text-black/70 font-medium">{empleadoName}</div>
          </div>

          {/* Pie de ticket */}
          <div className="mt-6 border-t-[1.5px] border-dashed border-black pt-2 text-center text-[10px] text-black/70 font-medium">
            Documento emitido por el sistema.
            <div className="font-bold text-black mt-0.5">Klynn Cloud • {new Date().toLocaleString("es-DO")}</div>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page {
            size: ${formato === "57mm" ? "57mm auto" : "80mm auto"};
            margin: 0 auto !important;
          }

          html,
          body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            overflow: visible !important;
            height: auto !important;
          }

          /* Ocultar todo el sitio */
          body > *:not(.atomic-print-target) { display: none !important; }

          /* Centrar el ticket en la página de impresión */
          .atomic-print-target {
            display: flex !important;
            justify-content: center !important;
            align-items: flex-start !important;
            width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            position: static !important;
            background: white !important;
            box-sizing: border-box !important;
          }

          .thermal-ticket {
            display: block !important;
            width: ${formato === "57mm" ? "58mm" : "80mm"} !important;
            max-width: ${formato === "57mm" ? "58mm" : "80mm"} !important;
            margin: 0 auto !important;
            padding: 2mm 3mm !important;
            box-sizing: border-box !important;
            border: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Evitar cortes */
          .atomic-print-target * {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            visibility: visible !important;
          }

          .no-print { display: none !important; }
        }
      `,
        }}
      />
    </div>,
    document.body,
  );
}

function ReporteMovimientosTurnoThermal({
  caja,
  movimientos,
  tenant,
  empleadoName,
  ventasEf,
  ventasTar,
  ventasTrans,
  otrosIng,
  egresos,
  efectivoEsperado,
  formato = "80mm",
  onBack,
}: {
  caja: Caja;
  movimientos: MovimientoCaja[];
  tenant: Tenant;
  empleadoName: string;
  ventasEf: number;
  ventasTar: number;
  ventasTrans: number;
  otrosIng: number;
  egresos: number;
  efectivoEsperado: number;
  formato?: "57mm" | "80mm";
  onBack: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  // Orden cronológico (del más antiguo al más reciente para fines de auditoría)
  const cronoSortedMovs = useMemo(() => {
    return [...movimientos].sort(
      (a, b) => +new Date(a.creado_en) - +new Date(b.creado_en),
    );
  }, [movimientos]);

  const w = formato === "57mm" ? "w-[58mm] max-w-[58mm]" : "w-[80mm] max-w-[80mm]";

  return createPortal(
    <div className="fixed inset-0 bg-white z-[99999] overflow-y-auto pointer-events-auto atomic-print-target flex flex-col items-center py-6 print:p-0">
      <div className="w-full max-w-md mx-auto print:max-w-none print:m-0 flex flex-col items-center">
        <div className="w-full flex justify-between items-center border-b-2 border-primary/20 pb-4 mb-6 print:hidden">
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              onBack();
            }}
            className="cursor-pointer"
          >
            Cerrar
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              window.print();
            }}
            className="bg-primary text-white gap-2 cursor-pointer font-bold shadow-sm"
          >
            <Printer className="h-4 w-4" /> Imprimir ahora
          </Button>
        </div>

        <div
          className={`thermal-ticket mx-auto ${w} bg-white px-3 py-3 text-[11px] leading-snug text-black border border-dashed border-black/20 print:border-none`}
          style={{
            fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
        >
          {/* Encabezado */}
          <div className="text-center space-y-0.5">
            {tenant.logo_url ? (
              <div className="flex justify-center mb-1">
                <img
                  src={tenant.logo_url}
                  alt="Logo"
                  className="h-16 w-auto max-w-[180px] object-contain filter grayscale mx-auto"
                />
              </div>
            ) : (
              <div className="text-xl font-bold uppercase tracking-tight text-center leading-tight">
                {tenant.nombre}
              </div>
            )}
            {tenant.nombre_sucursal && (
              <div className="text-[10px] uppercase font-semibold text-black/80">{tenant.nombre_sucursal}</div>
            )}
            {tenant.rnc && (
              <div className="text-[10px] font-medium">RNC: {tenant.rnc}</div>
            )}
            {tenant.telefono && (
              <div className="text-[10px] font-medium">Tel: {tenant.telefono}</div>
            )}
            <div className="my-2 border-t-[1.5px] border-dashed border-black" />
            <div className="text-center font-black uppercase text-[12px] py-1 tracking-wider text-black border border-black rounded-xs">
              ★ AUDITORÍA DE MOVIMIENTOS ★
            </div>
            <div className="text-[10px] text-center uppercase font-bold text-black mt-1">
              TURNO / CAJA {caja.estado === "ABIERTA" ? "(EN CURSO)" : "(CERRADA)"}
            </div>
          </div>

          <div className="my-2 border-t-[1.5px] border-dashed border-black" />

          {/* Datos del Turno */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Cajero / Responsable:</span>
              <span className="font-bold text-black">{empleadoName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Apertura de Caja:</span>
              <span className="font-semibold tabular-nums text-black">{formatDateTimeRD(caja.abierta_en)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Fecha Auditoría:</span>
              <span className="font-semibold tabular-nums text-black">
                {new Date().toLocaleString("es-DO", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Total Movimientos:</span>
              <span className="font-bold tabular-nums text-black">{movimientos.length}</span>
            </div>
          </div>

          {/* [1] Resumen Financiero */}
          <div className="mt-3 border-t-[1.5px] border-dashed border-black" />
          <div className="text-center font-bold tracking-widest text-[11px] uppercase py-0.5">
            [1] RESUMEN FINANCIERO
          </div>
          <div className="border-t border-dashed border-black my-1" />

          {/* Sub-bloque: MOVIMIENTOS EN EFECTIVO */}
          <div className="text-[10.5px] font-black uppercase text-black text-center tracking-wider my-0.5">
            -- MOVIMIENTOS EN EFECTIVO --
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">(+) Fondo Inicial (Apertura):</span>
              <span className="font-bold tabular-nums">{formatRD(caja.monto_inicial || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">(+) Ventas en Efectivo:</span>
              <span className="font-bold tabular-nums">{formatRD(ventasEf)}</span>
            </div>
            {otrosIng > 0 && (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black/80">(+) Otros Ingresos / Abonos:</span>
                <span className="font-bold tabular-nums">{formatRD(otrosIng)}</span>
              </div>
            )}
            {egresos > 0 && (
              <div className="flex justify-between items-center text-black">
                <span className="font-semibold text-black/80">(-) Egresos / Gastos / Retiros:</span>
                <span className="font-bold tabular-nums">{formatRD(egresos)}</span>
              </div>
            )}
            <div className="border-t-2 border-black my-1.5" />
            <div className="flex justify-between items-center text-[12px] font-black">
              <span>TOTAL EFECTIVO EN CAJA:</span>
              <span className="tabular-nums">{formatRD(efectivoEsperado)}</span>
            </div>
          </div>

          {/* Sub-bloque: COBROS DIGITALES / BANCO */}
          <div className="mt-2.5 border-t border-dotted border-black/50" />
          <div className="text-[10.5px] font-black uppercase text-black text-center tracking-wider my-0.5">
            -- COBROS DIGITALES / BANCO --
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">(+) Tarjetas (Verifone):</span>
              <span className="font-bold tabular-nums">{formatRD(ventasTar)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">(+) Transferencias (Banco):</span>
              <span className="font-bold tabular-nums">{formatRD(ventasTrans)}</span>
            </div>
            <div className="border-t border-black my-1" />
            <div className="flex justify-between items-center text-[11.5px] font-bold">
              <span>TOTAL DIGITAL / BANCO:</span>
              <span className="tabular-nums">{formatRD(ventasTar + ventasTrans)}</span>
            </div>
          </div>

          {/* Gran Total */}
          <div className="mt-3 border-t-[1.5px] border-dashed border-black pt-1" />
          <div className="flex justify-between items-center text-[13px] font-black py-0.5">
            <span className="tracking-tight">TOTAL GENERAL:</span>
            <span className="tabular-nums font-black text-[13.5px]">{formatRD(ventasEf + ventasTar + ventasTrans + otrosIng)}</span>
          </div>

          {/* [2] Detalle Cronológico */}
          <div className="mt-3 border-t-[1.5px] border-dashed border-black" />
          <div className="text-center font-bold tracking-widest text-[11px] uppercase py-0.5">
            [2] REGISTRO DETALLADO ({cronoSortedMovs.length})
          </div>
          <div className="border-t border-dashed border-black my-1" />

          <div className="space-y-1.5">
            {cronoSortedMovs.map((m, idx) => {
              const isEgreso = ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA"].includes(m.tipo);
              const sign = isEgreso ? "-" : "+";
              const timeStr = new Date(m.creado_en).toLocaleTimeString("es-DO", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              });

              const cleanConcepto = (m.concepto || "Sin concepto")
                .replace(/\s*\[(EFECTIVO|TARJETA|TRANSFERENCIA|CREDITO|PAGO_AL_RETIRAR|.*?)]/gi, "")
                .trim();

              return (
                <div key={m.id || idx} className="border-b border-dotted border-black/30 pb-1.5 text-[11px]">
                  <div className="flex justify-between items-center font-bold">
                    <span>
                      #{idx + 1} {timeStr} <span className="uppercase text-[9.5px] px-1 py-0.2 border border-black rounded-xs">{m.tipo}</span>
                    </span>
                    <span className="tabular-nums font-black">
                      {sign}{formatRD(m.monto)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-black/80 mt-0.5">
                    <span className="truncate max-w-[32ch] font-medium">{cleanConcepto}</span>
                    <span className="font-bold uppercase text-[10px] text-black">{m.metodo || "N/A"}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* [3] Cuadre de Auditoría y Firmas */}
          <div className="mt-4 border-t-[1.5px] border-dashed border-black" />
          <div className="text-center font-bold tracking-widest text-[11px] uppercase py-0.5">
            [3] VERIFICACIÓN Y AUDITORÍA
          </div>
          <div className="border-t border-dashed border-black my-1" />

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Efectivo Contado en Caja:</span>
              <span className="font-bold">RD$ ____________</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Diferencia (Sobrante/Faltante):</span>
              <span className="font-bold">RD$ ____________</span>
            </div>
            <div className="pt-2 text-center text-[10px] font-bold uppercase">
              [  ] CONFORME   /   [  ] CON OBSERVACIÓN
            </div>
          </div>

          {/* Firma Cajero */}
          <div className="mt-14 text-center">
            <div className="border-t border-black w-48 mx-auto" />
            <div className="font-bold text-[11px] mt-1 uppercase">Cajero(a) en Turno</div>
            <div className="text-[10px] text-black/70 font-medium">{empleadoName}</div>
          </div>

          {/* Pie de ticket */}
          <div className="mt-6 border-t-[1.5px] border-dashed border-black pt-2 text-center text-[10px] text-black/70 font-medium">
            Documento emitido para fines de auditoría interna.
            <div className="font-bold text-black mt-0.5">Klynn Cloud • {new Date().toLocaleString("es-DO")}</div>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page {
            size: ${formato === "57mm" ? "57mm auto" : "80mm auto"};
            margin: 0 auto !important;
          }

          html,
          body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            overflow: visible !important;
            height: auto !important;
          }

          body > *:not(.atomic-print-target) { display: none !important; }

          /* Centrar el ticket en la página de impresión */
          .atomic-print-target {
            display: flex !important;
            justify-content: center !important;
            align-items: flex-start !important;
            width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            position: static !important;
            background: white !important;
            box-sizing: border-box !important;
          }

          .thermal-ticket {
            display: block !important;
            width: ${formato === "57mm" ? "58mm" : "80mm"} !important;
            max-width: ${formato === "57mm" ? "58mm" : "80mm"} !important;
            margin: 0 auto !important;
            padding: 2mm 3mm !important;
            box-sizing: border-box !important;
            border: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Evitar cortes */
          .atomic-print-target * {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            visibility: visible !important;
          }

          .no-print { display: none !important; }
        }
      `,
        }}
      />
    </div>,
    document.body,
  );
}

function SetCajaChicaDialog({
  open,
  onOpenChange,
  tenant,
  cajaId,
  empleadoId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tenant: Tenant;
  cajaId?: string;
  empleadoId?: string;
  onDone: () => void;
}) {
  const [montoStr, setMontoStr] = useState<string>(tenant.monto_caja_chica?.toString() || "");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const monto = parseAmount(montoStr);
    setLoading(true);
    try {
      await saveTenant({ ...tenant, monto_caja_chica: monto, monto_actual_caja_chica: monto });

      // Si hay caja abierta, registrar movimiento de entrada por la recarga
      if (tenant.id && cajaId && empleadoId) {
        await saveMovimiento({
          id: uid("mov"),
          tenant_id: tenant.id,
          caja_id: cajaId,
          empleado_id: empleadoId,
          tipo: "INGRESO",
          concepto: "Recarga / Asignación de Caja Chica",
          monto: monto,
          metodo: "EFECTIVO",
          creado_en: new Date().toISOString(),
        });
      }

      toast.success("Caja Chica recargada 🐷");
      onDone();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Error al guardar: " + (err.message || "Servicio no disponible"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-2xl text-primary">
              <PiggyBank className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-display font-black">
                Asignar Caja Chica
              </DialogTitle>
              <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">
                Fondo fijo del negocio
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="py-6">
          <div className="relative group">
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 flex items-center justify-center px-4 border-r border-slate-200 bg-white rounded-l-xl transition-colors group-focus-within:border-primary/30 group-focus-within:bg-primary/5">
              <span className="text-sm font-black text-primary/60">RD$</span>
            </div>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              data-form-type="other"
              autoFocus
              value={montoStr}
              onChange={(e) => setMontoStr(formatAmountInput(e.target.value))}
              onBlur={() => {
                const n = parseAmount(montoStr);
                if (n === 0) setMontoStr("");
                else
                  setMontoStr(
                    n.toLocaleString("en-US", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }),
                  );
              }}
              placeholder="0.00"
              className="h-20 w-full px-6 text-center font-display text-5xl font-bold text-primary tracking-tighter rounded-xl border-2 border-slate-200 bg-white shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none placeholder:text-slate-100"
            />
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground leading-relaxed">
            Este monto es el fondo fijo que siempre debe haber disponible en la caja chica de la
            lavandería.
          </p>
        </div>

        <DialogFooter className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 h-10 rounded-xl text-muted-foreground font-bold"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 h-10 rounded-xl bg-primary text-white font-bold shadow-sm hover:bg-primary/90"
            onClick={submit}
            disabled={loading}
          >
            {loading ? "Guardando..." : "Guardar Monto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
