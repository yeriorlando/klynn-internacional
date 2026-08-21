import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
import { 
  Building2, 
  TrendingUp, 
  Package, 
  ArrowRight, 
  LogOut, 
  Shield, 
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
  DollarSign,
  Users,
  Wallet,
  Calendar,
  ArrowLeft,
  Download,
  FileSpreadsheet,
  Printer,
  CreditCard,
  Tag,
  Shirt,
  Bell,
  BarChart3,
  Zap,
  Truck,
  Coins,
  Info,
  WashingMachine,
  ListTodo,
  AlertCircle,
  Landmark,
  Layers,
  FileText,
  Clock,
  Search,
  Check,
  Percent,
  Phone,
  CalendarDays,
  FileCheck2,
  ChevronRight,
  ChevronLeft,
  Send,
  Boxes,
  LayoutGrid,
  Scale,
  Award,
  Briefcase,
  Mail,
  MapPin,
  Navigation,
  Bike,
  PackageCheck,
  RotateCw,
  Box,
  Receipt,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft,
  UserCheck,
  Sun,
  Moon,
  Sunrise,
  Wrench,
  Megaphone,
  PiggyBank,
  X as XIcon,
  SlidersHorizontal,
  ChevronDown,
  List,
  BarChart2
} from "lucide-react";
import { Logo } from "@/components/klynn/Logo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent 
} from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { toast } from "sonner";
import { exportToCsv } from "@/lib/export";

const MESES_NOMBRES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const ANIOS_DISPONIBLES = [2024, 2025, 2026, 2027, 2028];

type DateFilter = "all" | "today" | "yesterday" | "7d" | "this_month" | "last_month" | "30d" | "this_year" | "month_select" | "custom";
import { 
  getTenantsForUser, 
  getOrdenes, 
  getGastos,
  getMovimientos,
  getEmpleados,
  getCajas,
  getClientes,
  getPlans,
  getCatalogo,
  getServicios,
  getTenantBranchName,
  formatRD, 
  formatPhoneRD,
  setActiveTenant,
  setSession,
  logout,
  type Tenant,
  type Cliente,
  type Plan,
  type CatalogoItem,
  type Servicio
} from "@/lib/storage";

// Catálogo Oficial de Comprobantes Fiscales y Electrónicos DGII (República Dominicana)
const DGII_CATALOGO_MAP: Record<string, {
  codigo: string;
  nombreOficial: string;
  subtitulo: string;
  esElectronico: boolean;
  colorClass: string;
  badgeBg: string;
}> = {
  E31: { codigo: "E31", nombreOficial: "E31 - CRÉDITO FISCAL", subtitulo: "Factura de Crédito Fiscal Electrónica (B2B)", esElectronico: true, colorClass: "text-indigo-700 dark:text-indigo-300", badgeBg: "bg-indigo-600" },
  E32: { codigo: "E32", nombreOficial: "E32 - CONSUMIDOR FINAL", subtitulo: "Factura de Consumo Electrónica (Consumo Final)", esElectronico: true, colorClass: "text-sky-700 dark:text-sky-300", badgeBg: "bg-sky-600" },
  E33: { codigo: "E33", nombreOficial: "E33 - NOTA DE DÉBITO", subtitulo: "Nota de Débito Electrónica", esElectronico: true, colorClass: "text-amber-700 dark:text-amber-300", badgeBg: "bg-amber-600" },
  E34: { codigo: "E34", nombreOficial: "E34 - NOTA DE CRÉDITO", subtitulo: "Nota de Crédito Electrónica", esElectronico: true, colorClass: "text-rose-700 dark:text-rose-300", badgeBg: "bg-rose-600" },
  E41: { codigo: "E41", nombreOficial: "E41 - COMPRAS", subtitulo: "Compras Electrónico (Proveedores Informales)", esElectronico: true, colorClass: "text-slate-700 dark:text-slate-300", badgeBg: "bg-slate-700" },
  E43: { codigo: "E43", nombreOficial: "E43 - GASTOS MENORES", subtitulo: "Gastos Menores Electrónico", esElectronico: true, colorClass: "text-slate-700 dark:text-slate-300", badgeBg: "bg-slate-700" },
  E44: { codigo: "E44", nombreOficial: "E44 - REGÍMENES ESPECIALES", subtitulo: "Regímenes Especiales de Tributación Electrónico", esElectronico: true, colorClass: "text-purple-700 dark:text-purple-300", badgeBg: "bg-purple-600" },
  E45: { codigo: "E45", nombreOficial: "E45 - GUBERNAMENTAL", subtitulo: "Facturación Gubernamental Electrónica", esElectronico: true, colorClass: "text-blue-700 dark:text-blue-300", badgeBg: "bg-blue-600" },
  E46: { codigo: "E46", nombreOficial: "E46 - EXPORTACIONES", subtitulo: "Comprobante de Exportaciones Electrónico", esElectronico: true, colorClass: "text-teal-700 dark:text-teal-300", badgeBg: "bg-teal-600" },
  E47: { codigo: "E47", nombreOficial: "E47 - PAGOS AL EXTERIOR", subtitulo: "Pagos al Exterior Electrónico", esElectronico: true, colorClass: "text-slate-700 dark:text-slate-300", badgeBg: "bg-slate-700" },

  B01: { codigo: "B01", nombreOficial: "B01 - CRÉDITO FISCAL", subtitulo: "Factura para Crédito Fiscal Tradicional", esElectronico: false, colorClass: "text-indigo-700 dark:text-indigo-300", badgeBg: "bg-indigo-600" },
  B02: { codigo: "B02", nombreOficial: "B02 - CONSUMIDOR FINAL", subtitulo: "Factura de Consumo Final Tradicional", esElectronico: false, colorClass: "text-sky-700 dark:text-sky-300", badgeBg: "bg-sky-600" },
  B03: { codigo: "B03", nombreOficial: "B03 - NOTA DE DÉBITO", subtitulo: "Nota de Débito Tradicional", esElectronico: false, colorClass: "text-amber-700 dark:text-amber-300", badgeBg: "bg-amber-600" },
  B04: { codigo: "B04", nombreOficial: "B04 - NOTA DE CRÉDITO", subtitulo: "Nota de Crédito Tradicional", esElectronico: false, colorClass: "text-rose-700 dark:text-rose-300", badgeBg: "bg-rose-600" },
  B11: { codigo: "B11", nombreOficial: "B11 - COMPRAS", subtitulo: "Registro de Proveedores Informales", esElectronico: false, colorClass: "text-slate-700 dark:text-slate-300", badgeBg: "bg-slate-700" },
  B12: { codigo: "B12", nombreOficial: "B12 - REGISTRO ÚNICO DE INGRESOS", subtitulo: "Registro Único de Ingresos", esElectronico: false, colorClass: "text-slate-700 dark:text-slate-300", badgeBg: "bg-slate-700" },
  B13: { codigo: "B13", nombreOficial: "B13 - GASTOS MENORES", subtitulo: "Gastos Menores Tradicional", esElectronico: false, colorClass: "text-slate-700 dark:text-slate-300", badgeBg: "bg-slate-700" },
  B14: { codigo: "B14", nombreOficial: "B14 - REGÍMENES ESPECIALES", subtitulo: "Regímenes Especiales Tradicional", esElectronico: false, colorClass: "text-purple-700 dark:text-purple-300", badgeBg: "bg-purple-600" },
  B15: { codigo: "B15", nombreOficial: "B15 - GUBERNAMENTAL", subtitulo: "Comprobante Gubernamental Tradicional", esElectronico: false, colorClass: "text-blue-700 dark:text-blue-300", badgeBg: "bg-blue-600" },
  B16: { codigo: "B16", nombreOficial: "B16 - EXPORTACIONES", subtitulo: "Comprobante para Exportaciones Tradicional", esElectronico: false, colorClass: "text-teal-700 dark:text-teal-300", badgeBg: "bg-teal-600" },
};
/**
 * Componente para renderizar cifras de métricas con tipografía adaptativa inteligente:
 * - Reduce gradualmente el tamaño del texto según la longitud de caracteres (millones, decenas de millones)
 * - Evita desbordes o rupturas de tarjetas mediante `min-w-0`, `truncate` y `whitespace-nowrap`
 * - Incluye tooltip nativo `title` para que el usuario pueda ver la cifra exacta completa en cualquier pantalla
 */
function MetricDisplay({ 
  value, 
  isCurrency = true,
  colorClass = "text-foreground",
  className = "" 
}: { 
  value: number | string; 
  isCurrency?: boolean;
  colorClass?: string;
  className?: string;
}) {
  const formatted = typeof value === 'number' 
    ? (isCurrency ? formatRD(value) : new Intl.NumberFormat("es-DO").format(value))
    : String(value);
  const len = formatted.length;
  
  // Escalado dinámico y suave:
  // <= 10 chars (ej: RD$728.26): text-xl sm:text-2xl
  // 11 - 13 chars (ej: RD$246,153.56): text-lg sm:text-xl
  // 14 - 16 chars (ej: RD$1,246,153.56): text-base sm:text-lg
  // 17 - 19 chars (ej: RD$122,246,153.56): text-sm sm:text-base
  // >= 20 chars (ej: RD$1,122,246,153.56): text-xs sm:text-sm
  let sizeClass = "text-xl sm:text-2xl";
  if (len >= 20) {
    sizeClass = "text-xs sm:text-sm";
  } else if (len >= 17) {
    sizeClass = "text-sm sm:text-base";
  } else if (len >= 14) {
    sizeClass = "text-base sm:text-lg";
  } else if (len >= 11) {
    sizeClass = "text-lg sm:text-xl";
  }

  return (
    <div 
      title={formatted}
      className={`font-bold font-display tracking-tight tabular-nums truncate whitespace-nowrap leading-tight transition-all duration-150 ${sizeClass} ${colorClass} ${className}`}
    >
      {formatted}
    </div>
  );
}

/**
 * Formatea números telefónicos al estándar (XXX) XXX-XXXX
 */
function formatPhone(phone?: string | null): string {
  if (!phone || phone.trim() === "" || phone === "---" || phone === "Sin teléfono") return "—";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 0) return "—";
  if (cleaned.length < 7) return phone;
  return formatPhoneRD(phone);
}

function getReporteCategoriaInfo(cat: string) {
  const c = (cat || "").toLowerCase();
  if (c.includes("servicio") || c.includes("luz") || c.includes("agua") || c.includes("internet")) {
    return {
      label: "Servicios",
      fullLabel: "Servicios (Luz, Agua, Internet)",
      icon: Zap,
      bgLight: "bg-amber-100 dark:bg-amber-950/80",
      text: "text-amber-700 dark:text-amber-300",
      barColor: "bg-amber-500",
    };
  }
  if (c.includes("mantenimiento") || c.includes("reparac")) {
    return {
      label: "Mantenimiento",
      fullLabel: "Mantenimiento & Reparaciones",
      icon: Wrench,
      bgLight: "bg-blue-100 dark:bg-blue-950/80",
      text: "text-blue-700 dark:text-blue-300",
      barColor: "bg-blue-500",
    };
  }
  if (c.includes("marketing") || c.includes("publicidad")) {
    return {
      label: "Marketing",
      fullLabel: "Marketing & Publicidad",
      icon: Megaphone,
      bgLight: "bg-purple-100 dark:bg-purple-950/80",
      text: "text-purple-700 dark:text-purple-300",
      barColor: "bg-purple-500",
    };
  }
  if (c.includes("suministro") || c.includes("insumo") || c.includes("detergente")) {
    return {
      label: "Suministros",
      fullLabel: "Suministros & Insumos",
      icon: Package,
      bgLight: "bg-teal-100 dark:bg-teal-950/80",
      text: "text-teal-700 dark:text-teal-300",
      barColor: "bg-teal-500",
    };
  }
  if (c.includes("salario") || c.includes("nomina") || c.includes("sueldo") || c.includes("personal")) {
    return {
      label: "Salarios",
      fullLabel: "Nómina & Personal",
      icon: Users,
      bgLight: "bg-indigo-100 dark:bg-indigo-950/80",
      text: "text-indigo-700 dark:text-indigo-300",
      barColor: "bg-indigo-500",
    };
  }
  if (c.includes("alquiler") || c.includes("renta") || c.includes("local")) {
    return {
      label: "Alquiler",
      fullLabel: "Alquiler de Local",
      icon: Building2,
      bgLight: "bg-emerald-100 dark:bg-emerald-950/80",
      text: "text-emerald-700 dark:text-emerald-300",
      barColor: "bg-emerald-500",
    };
  }
  if (c.includes("transporte") || c.includes("combustible") || c.includes("delivery")) {
    return {
      label: "Transporte",
      fullLabel: "Transporte & Logística",
      icon: Truck,
      bgLight: "bg-orange-100 dark:bg-orange-950/80",
      text: "text-orange-700 dark:text-orange-300",
      barColor: "bg-orange-500",
    };
  }
  if (c.includes("caja chica")) {
    return {
      label: "Caja Chica",
      fullLabel: "Caja Chica (Gastos Menores)",
      icon: PiggyBank,
      bgLight: "bg-rose-100 dark:bg-rose-950/80",
      text: "text-rose-700 dark:text-rose-300",
      barColor: "bg-rose-500",
    };
  }
  return {
    label: cat || "Otros",
    fullLabel: cat || "Otros Gastos Operativos",
    icon: Tag,
    bgLight: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-300",
    barColor: "bg-slate-500",
  };
}

export const Route = createFileRoute("/reportes")({
  component: ReportesPage,
});

function ReportesPage() {
  const auth = useRequireAuth();
  const navigate = useNavigate();
  const [selectedInspectTenant, setSelectedInspectTenant] = useState<Tenant | null>(null);
  const [inspectLoading, setInspectLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("finanzas");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [isCustomDateOpen, setIsCustomDateOpen] = useState<boolean>(false);
  const [debtSearch, setDebtSearch] = useState<string>("");
  const [debtPage, setDebtPage] = useState<number>(1);
  const DEBT_PAGE_SIZE = 5;

  // Estados para Filtros y Paginación de Prendas & Servicios
  const [prendaSearch, setPrendaSearch] = useState<string>("");
  const [prendaCategory, setPrendaCategory] = useState<string>("all");
  const [prendaView, setPrendaView] = useState<"grid" | "chart" | "list">("grid");
  const [prendaPage, setPrendaPage] = useState<number>(1);
  const PRENDA_PAGE_SIZE = 8;
  const [serviceSearch, setServiceSearch] = useState<string>("");
  const [teamSearch, setTeamSearch] = useState<string>("");
  const [logisticaSearch, setLogisticaSearch] = useState<string>("" );
  const [auditoriaFilter, setAuditoriaFilter] = useState<"all" | "cobros" | "caja" | "gastos">("all");
  const [selectedCierreDesglose, setSelectedCierreDesglose] = useState<any | null>(null);
  const [cierreModalStep, setCierreModalStep] = useState<1 | 2>(1);

  const [inspectData, setInspectData] = useState<{
    ordenes: any[];
    gastos: any[];
    empleados: any[];
    movimientos: any[];
    cajas: any[];
    clientes: Cliente[];
    plans: Plan[];
    catalogo: CatalogoItem[];
    servicios: Servicio[];
  } | null>(null);

  useEffect(() => {
    async function load() {
      if (!auth?.empleado.email || auth.empleado.id === '__loading__') return;
      const params = new URLSearchParams(window.location.search);
      const tenantId = params.get("tenantId");
      if (!tenantId) {
        navigate({ to: "/dashboard-admin" });
        return;
      }

      setInspectLoading(true);
      try {
        const tenants = await getTenantsForUser(auth.empleado.email);
        const tenant = tenants.find(t => t.id === tenantId);
        if (!tenant) {
          navigate({ to: "/dashboard-admin" });
          return;
        }
        setSelectedInspectTenant(tenant);

        const [oList, gList, eList, mList, cList, clList, pList, catList, srvList] = await Promise.all([
          getOrdenes(tenantId),
          getGastos(tenantId),
          getEmpleados(tenantId),
          getMovimientos(tenantId),
          getCajas(tenantId),
          getClientes(tenantId),
          getPlans(),
          getCatalogo(tenantId),
          getServicios(tenantId)
        ]);

        setInspectData({
          ordenes: oList || [],
          gastos: gList || [],
          empleados: eList || [],
          movimientos: mList || [],
          cajas: cList || [],
          clientes: clList || [],
          plans: pList || [],
          catalogo: catList || [],
          servicios: srvList || []
        });
      } catch (err) {
        console.error("Error loading inspect data:", err);
        toast.error("Error al cargar estadísticas de la sucursal");
      } finally {
        setInspectLoading(false);
      }
    }
    load();
  }, [auth?.empleado.email, navigate]);

  // Active Modules Discovery
  const activeModules = useMemo(() => {
    if (!selectedInspectTenant || !inspectData) {
      return { whatsapp: false, facturacion_fiscal: false, multisucursal: false, logistica: false, procesos: true, estanteria: true };
    }
    const t = selectedInspectTenant;
    const planOfTenant = inspectData.plans.find(p => p.id === t.plan_id);

    const hasWa = t.config?.modulos_override?.whatsapp !== undefined 
      ? t.config.modulos_override.whatsapp 
      : !!planOfTenant?.modulos?.whatsapp;
    const hasFiscal = t.config?.modulos_override?.facturacion_fiscal !== undefined 
      ? t.config.modulos_override.facturacion_fiscal 
      : !!planOfTenant?.modulos?.facturacion_fiscal;
    const hasSucursales = t.config?.modulos_override?.multisucursal !== undefined 
      ? t.config.modulos_override.multisucursal 
      : ((t.max_sucursales || 1) > 1 || !!planOfTenant?.modulos?.multisucursal);
    const hasLogistica = t.config?.modulos_override?.logistica !== undefined 
      ? t.config.modulos_override.logistica 
      : !!planOfTenant?.modulos?.logistica;
    const hasProcesos = t.config?.modulos_override?.procesos !== undefined 
      ? t.config.modulos_override.procesos 
      : (planOfTenant?.modulos?.procesos !== undefined ? !!planOfTenant.modulos.procesos : true);
    const hasEstanteria = t.config?.modulos_override?.estanteria !== undefined 
      ? t.config.modulos_override.estanteria 
      : (planOfTenant?.modulos?.estanteria !== undefined ? !!planOfTenant.modulos.estanteria : true);

    return {
      whatsapp: hasWa,
      facturacion_fiscal: hasFiscal,
      multisucursal: hasSucursales,
      logistica: hasLogistica,
      procesos: hasProcesos,
      estanteria: hasEstanteria
    };
  }, [selectedInspectTenant, inspectData]);

  // Desglose detallado del Cierre seleccionado en Modal
  const cierreDesgloseDetalle = useMemo(() => {
    if (!selectedCierreDesglose || !inspectData) return null;
    const c = selectedCierreDesglose;
    const allMovs = inspectData.movimientos || [];
    
    const start = c.abierta_en || "";
    const end = c.cerrada_en || new Date().toISOString();
    
    const movsDelTurno = allMovs.filter((m: any) => {
      if (m.caja_id && m.caja_id === c.id) return true;
      const creado = m.creado_en || "";
      if (start && end) {
        return creado >= start && creado <= end;
      }
      return false;
    });

    const fondoInicial = Number(c.monto_inicial) || 0;
    const efectivoFisico = Number(c.monto_contado_efectivo) || 0;
    const tarjetaFisica = Number(c.monto_contado_tarjeta) || 0;
    const transfFisica = Number(c.monto_contado_transferencia) || 0;
    const dif = Number(c.diferencia) || 0;

    const ventasEfectivo = movsDelTurno
      .filter((m: any) => (m.tipo === "VENTA" || m.tipo === "COBRO") && (m.metodo === "EFECTIVO" || !m.metodo))
      .reduce((s: number, m: any) => s + (Number(m.monto) || 0), 0);

    const ventasTarjeta = movsDelTurno
      .filter((m: any) => (m.tipo === "VENTA" || m.tipo === "COBRO") && m.metodo === "TARJETA")
      .reduce((s: number, m: any) => s + (Number(m.monto) || 0), 0);

    const ventasTransf = movsDelTurno
      .filter((m: any) => (m.tipo === "VENTA" || m.tipo === "COBRO") && m.metodo === "TRANSFERENCIA")
      .reduce((s: number, m: any) => s + (Number(m.monto) || 0), 0);

    const ventasOtros = movsDelTurno
      .filter((m: any) => (m.tipo === "VENTA" || m.tipo === "COBRO") && !["EFECTIVO", "TARJETA", "TRANSFERENCIA"].includes(m.metodo))
      .reduce((s: number, m: any) => s + (Number(m.monto) || 0), 0);

    const abonosEfectivo = movsDelTurno
      .filter((m: any) => m.tipo === "ABONO" && (m.metodo === "EFECTIVO" || !m.metodo))
      .reduce((s: number, m: any) => s + (Number(m.monto) || 0), 0);

    const abonosBanco = movsDelTurno
      .filter((m: any) => m.tipo === "ABONO" && m.metodo !== "EFECTIVO")
      .reduce((s: number, m: any) => s + (Number(m.monto) || 0), 0);

    const gastosCajaChica = movsDelTurno
      .filter((m: any) => ["GASTO_CAJA_CHICA", "EGRESO", "GASTO"].includes(m.tipo))
      .reduce((s: number, m: any) => s + (Number(m.monto) || 0), 0);

    const retirosManuales = movsDelTurno
      .filter((m: any) => ["RETIRO", "RETIRO_MANUAL"].includes(m.tipo))
      .reduce((s: number, m: any) => s + (Number(m.monto) || 0), 0);

    const efectivoEsperado = fondoInicial + ventasEfectivo + abonosEfectivo - gastosCajaChica - retirosManuales;
    const totalFacturadoTurno = ventasEfectivo + ventasTarjeta + ventasTransf + ventasOtros + abonosEfectivo + abonosBanco;

    return {
      c,
      movsDelTurno,
      fondoInicial,
      efectivoFisico,
      tarjetaFisica: tarjetaFisica || ventasTarjeta,
      transfFisica: transfFisica || ventasTransf,
      dif,
      ventasEfectivo,
      ventasTarjeta,
      ventasTransf,
      ventasOtros,
      abonosEfectivo,
      abonosBanco,
      gastosCajaChica,
      retirosManuales,
      efectivoEsperado: Number(c.monto_esperado_efectivo) || efectivoEsperado,
      totalFacturadoTurno
    };
  }, [selectedCierreDesglose, inspectData]);

  // Filter Data by Date (Histórico, Meses, Días y Rango Personalizado)
  const filteredData = useMemo(() => {
    if (!inspectData) return null;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
    const endOfYesterday = startOfToday - 1;
    const startOf7d = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const startOf30d = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

    // Mes Seleccionado Específico
    const startOfSelectedMonth = new Date(selectedYear, selectedMonth, 1).getTime();
    const endOfSelectedMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999).getTime();

    // Rango Personalizado
    const customStart = customStartDate ? new Date(customStartDate + "T00:00:00").getTime() : 0;
    const customEnd = customEndDate ? new Date(customEndDate + "T23:59:59.999").getTime() : Infinity;

    const isMatch = (dateStr?: string) => {
      if (!dateStr) return false;
      if (dateFilter === "all") return true;
      const t = new Date(dateStr).getTime();
      if (isNaN(t)) return false;

      if (dateFilter === "today") return t >= startOfToday;
      if (dateFilter === "yesterday") return t >= startOfYesterday && t <= endOfYesterday;
      if (dateFilter === "7d") return t >= startOf7d;
      if (dateFilter === "30d") return t >= startOf30d;
      if (dateFilter === "this_month") return t >= startOfMonth;
      if (dateFilter === "last_month") return t >= startOfLastMonth && t <= endOfLastMonth;
      if (dateFilter === "this_year") return t >= startOfYear;
      if (dateFilter === "month_select") return t >= startOfSelectedMonth && t <= endOfSelectedMonth;
      if (dateFilter === "custom") {
        if (customStart && t < customStart) return false;
        if (customEnd && t > customEnd) return false;
        return true;
      }
      return true;
    };

    const ordenes = inspectData.ordenes.filter(o => isMatch(o.creado_en));
    const gastos = inspectData.gastos.filter(g => isMatch(g.fecha || g.creado_en));
    const movimientos = inspectData.movimientos.filter(m => isMatch(m.creado_en));
    const cajas = inspectData.cajas.filter(c => isMatch(c.abierta_en || c.cerrada_en));

    return {
      ordenes,
      gastos,
      movimientos,
      cajas,
      empleados: inspectData.empleados,
      clientes: inspectData.clientes
    };
  }, [inspectData, dateFilter, selectedMonth, selectedYear, customStartDate, customEndDate]);

  // Etiqueta legible del filtro temporal activo
  const activeFilterLabel = useMemo(() => {
    switch (dateFilter) {
      case "all": return "Todo el histórico";
      case "today": return "Hoy";
      case "yesterday": return "Ayer";
      case "7d": return "Últimos 7 días";
      case "this_month": return "Este mes";
      case "last_month": return "Mes anterior";
      case "30d": return "Últimos 30 días";
      case "this_year": return `Año ${new Date().getFullYear()}`;
      case "month_select": return `${MESES_NOMBRES[selectedMonth]} ${selectedYear}`;
      case "custom": {
        if (customStartDate && customEndDate) return `${customStartDate} al ${customEndDate}`;
        if (customStartDate) return `Desde ${customStartDate}`;
        if (customEndDate) return `Hasta ${customEndDate}`;
        return "Rango personalizado";
      }
      default: return "Período personalizado";
    }
  }, [dateFilter, selectedMonth, selectedYear, customStartDate, customEndDate]);

  // General & Deep Metrics Calculations
  const stats = useMemo(() => {
    if (!filteredData) return null;
    const { ordenes, gastos, movimientos, cajas, clientes } = filteredData;

    const totalVentas = ordenes.reduce((s, o) => s + (o.total || 0), 0);
    const totalITBIS = ordenes.reduce((s, o) => s + (o.itbis || 0), 0);
    const totalDescuentos = ordenes.reduce((s, o) => s + (o.descuento || 0), 0);
    
    // Gastos (Total unificado de la tabla gastos)
    const gastosManuales = gastos.filter(g => !g.is_caja_chica).reduce((s, g) => s + (g.monto || 0), 0);
    const gastosCajaChica = gastos.filter(g => g.is_caja_chica).reduce((s, g) => s + (g.monto || 0), 0);
    const totalGastos = gastos.reduce((s, g) => s + (g.monto || 0), 0);
    const rentabilidad = totalVentas - totalGastos;
    const margenBeneficio = totalVentas > 0 ? (rentabilidad / totalVentas) * 100 : 0;
    const ticketPromedio = ordenes.length > 0 ? totalVentas / ordenes.length : 0;

    // Métodos de Pago
    const porMetodo = ordenes.reduce((m, o) => { 
      const method = o.metodo_pago || "EFECTIVO";
      m[method] = (m[method] || 0) + (o.total || 0); 
      return m; 
    }, {} as Record<string, number>);

    // Gastos por Categoría
    const porCategoria = gastos.reduce((m, g) => {
      const cat = g.categoria || "Operación General";
      m[cat] = (m[cat] || 0) + g.monto;
      return m;
    }, {} as Record<string, number>);

    // Estados de Órdenes y Montos por Etapa del Pipeline
    const porEstado: Record<string, number> = {};
    const porEstadoMonto: Record<string, number> = {};
    ordenes.forEach(o => {
      const st = o.estado || "RECIBIDA";
      porEstado[st] = (porEstado[st] || 0) + 1;
      porEstadoMonto[st] = (porEstadoMonto[st] || 0) + (o.total || 0);
    });

    const ordenesEnTaller = (porEstado["RECIBIDA"] || 0) + (porEstado["EN_PROCESO"] || 0);
    const ordenesListasDespacho = (porEstado["LISTA"] || 0) + (porEstado["EN_CAMINO"] || 0);
    const ordenesCompletadas = porEstado["ENTREGADA"] || 0;
    const tasaCompletitud = ordenes.length > 0 ? Math.round((ordenesCompletadas / ordenes.length) * 100) : 0;

    // Cierres de caja enriquecidos con Empleado, Turno y Horarios
    const empsList = inspectData?.empleados || [];
    const empMap = new Map<string, any>();
    empsList.forEach((e: any) => {
      if (e.id) empMap.set(e.id, e);
    });

    const cierresCaja = [...cajas]
      .filter((c: any) => c.estado === "CERRADA")
      .map((c: any) => {
        const emp = empMap.get(c.empleado_id) || empsList.find((e: any) => e.id === c.empleado_id);
        const cajeroNombre = emp?.nombre || c.usuario_nombre || c.empleado_nombre || "Cajero Principal";
        const rawRol = emp?.rol || "";
        const cajeroRol = rawRol === "ADMIN" 
          ? "Administrador" 
          : rawRol === "ENCARGADO" 
            ? "Encargado de Sucursal" 
            : rawRol === "CAJERO" 
              ? "Cajero de Turno" 
              : (rawRol || "Cajero / Operador");
        
        // Determinar turno (Mañana, Tarde, Noche)
        const rawNotas = (c.notas_cierre || c.notas_apertura || c.notas || "").trim();
        const lowerNotas = rawNotas.toLowerCase();
        
        let turnoTipo: "MAÑANA" | "TARDE" | "NOCHE" = "MAÑANA";
        let turnoLabel = "Turno Mañana";
        let turnoIcon = "🌅";
        let turnoBadgeClass = "bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800";
        
        // Prioridad 1: Detección explícita en notas del cajero
        if (lowerNotas.includes("mañana") || lowerNotas.includes("matutino")) {
          turnoTipo = "MAÑANA";
          turnoLabel = "Turno Mañana";
          turnoIcon = "🌅";
          turnoBadgeClass = "bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800";
        } else if (lowerNotas.includes("tarde") || lowerNotas.includes("vespertino")) {
          turnoTipo = "TARDE";
          turnoLabel = "Turno Tarde";
          turnoIcon = "☀️";
          turnoBadgeClass = "bg-orange-50 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 border-orange-200/80 dark:border-orange-800";
        } else if (lowerNotas.includes("noche") || lowerNotas.includes("nocturno")) {
          turnoTipo = "NOCHE";
          turnoLabel = "Turno Noche";
          turnoIcon = "🌙";
          turnoBadgeClass = "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800";
        } else {
          // Prioridad 2: Detección por hora de apertura o cierre
          const horaRef = c.abierta_en || c.cerrada_en;
          if (horaRef) {
            const d = new Date(horaRef);
            const h = d.getHours();
            if (h >= 5 && h < 13) {
              turnoTipo = "MAÑANA";
              turnoLabel = "Turno Mañana";
              turnoIcon = "🌅";
              turnoBadgeClass = "bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800";
            } else if (h >= 13 && h < 19) {
              turnoTipo = "TARDE";
              turnoLabel = "Turno Tarde";
              turnoIcon = "☀️";
              turnoBadgeClass = "bg-orange-50 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 border-orange-200/80 dark:border-orange-800";
            } else {
              turnoTipo = "NOCHE";
              turnoLabel = "Turno Noche";
              turnoIcon = "🌙";
              turnoBadgeClass = "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800";
            }
          }
        }

        // Limpiar nota para no mostrar texto redundante de turno en el footer
        const cleanedNotas = rawNotas
          .replace(/^["']?turno:\s*(mañana|tarde|noche|matutino|vespertino|nocturno)["']?/i, "")
          .replace(/^["']?turno\s*(mañana|tarde|noche|matutino|vespertino|nocturno)["']?/i, "")
          .trim();

        return {
          ...c,
          cajeroNombre,
          cajeroRol,
          turnoTipo,
          turnoLabel,
          turnoIcon,
          turnoBadgeClass,
          notas: cleanedNotas
        };
      })
      .sort((a, b) => new Date(b.cerrada_en || 0).getTime() - new Date(a.cerrada_en || 0).getTime());

    // Cuentas por Cobrar (Deudas) y Clientes Deudores
    const allTenantOrders = inspectData?.ordenes || [];
    const debtClientsMap: Record<string, {
      cliente: Cliente | { id: string; nombre: string; telefono?: string; email?: string; rnc_cedula?: string };
      totalDeuda: number;
      totalFacturado: number;
      facturasPendientes: any[];
      diasMaxAntiguedad: number;
      totalOrdenesHistoricas: number;
      categoriaCliente: string;
      categoriaColor: string;
    }> = {};

    let totalDeuda = 0;
    let totalAbonadoEnOrdenes = 0;
    let cantidadDeudas = 0;

    ordenes.forEach(o => {
      const saldo = o.saldo || 0;
      const pagado = o.pagado || 0;
      if (saldo > 0) {
        totalDeuda += saldo;
        totalAbonadoEnOrdenes += pagado;
        cantidadDeudas += 1;

        const cId = o.cliente_id || "desconocido";
        if (!debtClientsMap[cId]) {
          const clientFound = clientes.find(c => c.id === cId);

          // Total de órdenes históricas del cliente en la sucursal
          const clientOrders = allTenantOrders.filter(ao => 
            (cId !== "desconocido" && ao.cliente_id === cId) || 
            (ao.cliente_nombre && o.cliente_nombre && ao.cliente_nombre.toLowerCase() === o.cliente_nombre.toLowerCase())
          );
          const totalOrdenesHistoricas = Math.max(clientOrders.length, 1);

          let categoriaCliente = "Cliente Nuevo";
          let categoriaColor = "text-slate-600 dark:text-slate-400";

          if (totalOrdenesHistoricas >= 10) {
            categoriaCliente = "VIP";
            categoriaColor = "text-amber-600 dark:text-amber-400";
          } else if (totalOrdenesHistoricas >= 4) {
            categoriaCliente = "Frecuente";
            categoriaColor = "text-primary";
          } else if (totalOrdenesHistoricas >= 2) {
            categoriaCliente = "Recurrente";
            categoriaColor = "text-blue-600 dark:text-blue-400";
          }

          debtClientsMap[cId] = {
            cliente: clientFound || { id: cId, nombre: o.cliente_nombre || "Cliente Sin Nombre", telefono: o.cliente_telefono, rnc_cedula: o.cliente_rnc || o.rnc },
            totalDeuda: 0,
            totalFacturado: 0,
            facturasPendientes: [],
            diasMaxAntiguedad: 0,
            totalOrdenesHistoricas,
            categoriaCliente,
            categoriaColor
          };
        }
        debtClientsMap[cId].totalDeuda += saldo;
        debtClientsMap[cId].totalFacturado += (o.total || 0);
        debtClientsMap[cId].facturasPendientes.push(o);

        const ageDays = Math.floor((Date.now() - new Date(o.creado_en).getTime()) / (1000 * 60 * 60 * 24));
        if (ageDays > debtClientsMap[cId].diasMaxAntiguedad) {
          debtClientsMap[cId].diasMaxAntiguedad = ageDays;
        }
      }
    });

    const listaDeudores = Object.values(debtClientsMap).sort((a, b) => b.totalDeuda - a.totalDeuda);

    // Plazo oficial de crédito configurado en la sucursal (/nueva-orden)
    const plazoCreditoBase = selectedInspectTenant?.limite_credito_dias || 30;

    // Envejecimiento de la deuda por Vencimiento (Opción B: Exactitud sobre el plazo establecido)
    const aging = {
      plazoDias: plazoCreditoBase,
      enPlazo: 0,        // Dentro de los X días del plazo acordado (diasEmision <= plazo)
      vencida1_15: 0,    // 1 a 15 días de vencida sobre su plazo (diasMora entre 1 y 15)
      vencida16_30: 0,   // 16 a 30 días de vencida sobre su plazo (diasMora entre 16 y 30)
      moraCritica: 0,    // Más de 30 días de vencida sobre su plazo (diasMora > 30)
    };

    ordenes.filter(o => (o.saldo || 0) > 0).forEach(o => {
      const days = Math.floor((Date.now() - new Date(o.creado_en).getTime()) / (1000 * 60 * 60 * 24));
      const s = o.saldo || 0;
      const plazoOrden = o.dias_credito || plazoCreditoBase;
      const diasMora = days - plazoOrden;

      if (diasMora <= 0) {
        aging.enPlazo += s;
      } else if (diasMora <= 15) {
        aging.vencida1_15 += s;
      } else if (diasMora <= 30) {
        aging.vencida16_30 += s;
      } else {
        aging.moraCritica += s;
      }
    });

    // Abonos de caja
    const realAbonosMovs = movimientos.filter(m => m.concepto?.toLowerCase().includes("abono") || m.tipo === "ABONO");
    const totalAbonosCaja = realAbonosMovs.reduce((s, m) => s + m.monto, 0);

    // Top Prendas & Servicios Enriquecidos con Catálogo (/catalogo)
    const garmentCounts: Record<string, { 
      count: number; 
      total: number; 
      es_libra?: boolean;
      imagen_url?: string | null;
      categoria?: string;
      icono?: string | null;
      precio_base?: number;
    }> = {};

    let totalPiezas = 0;
    let totalLibras = 0;
    let totalMontoPrendas = 0;

    ordenes.forEach(o => {
      if (Array.isArray(o.items)) {
        o.items.forEach((item: any) => {
          const rawDesc = item.descripcion || "Prenda General";
          // Limpiar prefijo de desglose si vino de un sub-servicio ("↳ ")
          const desc = rawDesc.replace(/^↳\s*/, "").trim();
          const qty = Number(item.cantidad) || 0;
          const sub = (Number(item.precio_unitario) || 0) * qty;
          
          if (!garmentCounts[desc]) {
            // Buscamos coincidencia en catálogo
            const catMatch = inspectData?.catalogo?.find(c => 
              c.nombre?.toLowerCase().trim() === desc.toLowerCase().trim()
            );
            const isLibra = !!(item.es_libra || catMatch?.por_libra);
            garmentCounts[desc] = { 
              count: 0, 
              total: 0, 
              es_libra: isLibra,
              imagen_url: catMatch?.imagen_url || null,
              categoria: catMatch?.categoria || (isLibra ? "Lavandería por Libra" : "Prendas"),
              icono: catMatch?.icono || null,
              precio_base: catMatch?.precio || item.precio_unitario || 0
            };
          }
          garmentCounts[desc].count += qty;
          garmentCounts[desc].total += sub;
          totalMontoPrendas += sub;

          if (garmentCounts[desc].es_libra || item.es_libra) {
            totalLibras += qty;
          } else {
            totalPiezas += qty;
          }
        });
      }
    });

    const topPrendas = Object.entries(garmentCounts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);

    const serviceCounts: Record<string, { 
      count: number; 
      total: number;
      imagen_url?: string | null;
      descripcion?: string;
      icono?: string | null;
      precio_base?: number;
    }> = {};
    let totalMontoServicios = 0;

    ordenes.forEach(o => {
      if (Array.isArray(o.servicios)) {
        o.servicios.forEach((sName: string) => {
          const price = o.servicios_precios?.[sName] || 0;
          if (!serviceCounts[sName]) {
            const srvMatch = inspectData?.servicios?.find(s => 
              s.nombre?.toLowerCase().trim() === sName.toLowerCase().trim()
            );
            serviceCounts[sName] = { 
              count: 0, 
              total: 0,
              imagen_url: srvMatch?.imagen_url || null,
              descripcion: srvMatch?.descripcion || "Servicio especializado de lavandería",
              icono: srvMatch?.icono || null,
              precio_base: srvMatch?.precio || price || 0
            };
          }
          serviceCounts[sName].count += 1;
          serviceCounts[sName].total += price;
          totalMontoServicios += price;
        });
      }
    });

    const topServicios = Object.entries(serviceCounts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);

    // Delivery & Logística (100% alineado con /logistica y búsqueda de cliente)
    const clientesMap = new Map((inspectData?.clientes || []).map(c => [c.id, c]));

    const ordsDomicilio = ordenes.filter(o => {
      if (o.estado === "ANULADA") return false;
      const cli = clientesMap.get(o.cliente_id);
      return o.entrega_domicilio || (o.costo_envio && o.costo_envio > 0) || !!cli?.direccion || !!o.repartidor_id || o.tipo_entrega === "DOMICILIO" || !!o.sector_entrega;
    });

    const ordsLocal = ordenes.length - ordsDomicilio.length;
    const deliveryEntregados = ordsDomicilio.filter(o => o.estado === "ENTREGADA").length;
    const deliveryEnRuta = ordsDomicilio.filter(o => o.estado === "EN_CAMINO").length;
    const deliveryPendientes = ordsDomicilio.filter(o => ["RECIBIDA", "EN_PROCESO", "LISTA", "EN_CAMINO", "INCIDENCIA"].includes(o.estado)).length;
    const deliveryIngresosEnvio = ordsDomicilio.reduce((s, o) => s + (o.costo_envio || 0), 0);
    const deliveryTotalFacturado = ordsDomicilio.reduce((s, o) => s + (o.total || 0), 0);

    // Sectores de entrega más frecuentes con métricas enriquecidas
    const sectoresMap: Record<string, { 
      count: number; 
      entregadas: number; 
      pendientes: number; 
      enCamino: number;
      totalFacturado: number; 
      totalTarifas: number;
    }> = {};

    ordsDomicilio.forEach(o => {
      const cli = clientesMap.get(o.cliente_id);
      let sector = (
        o.sector_entrega || 
        cli?.sector || 
        o.sector || 
        (o.direccion_entrega ? o.direccion_entrega.split(',')[0].trim() : "") || 
        (cli?.direccion ? cli.direccion.split(',')[0].trim() : "") || 
        "Sin sector especificado"
      ).trim();
      
      if (!sector) sector = "Sin sector especificado";

      if (!sectoresMap[sector]) {
        sectoresMap[sector] = { 
          count: 0, 
          entregadas: 0, 
          pendientes: 0, 
          enCamino: 0,
          totalFacturado: 0, 
          totalTarifas: 0 
        };
      }
      sectoresMap[sector].count += 1;
      if (o.estado === "ENTREGADA") {
        sectoresMap[sector].entregadas += 1;
      } else if (o.estado === "EN_CAMINO") {
        sectoresMap[sector].enCamino += 1;
        sectoresMap[sector].pendientes += 1;
      } else {
        sectoresMap[sector].pendientes += 1;
      }
      sectoresMap[sector].totalFacturado += (o.total || 0);
      sectoresMap[sector].totalTarifas += (o.costo_envio || 0);
    });

    const topSectores = Object.entries(sectoresMap)
      .map(([sector, data]) => ({ sector, ...data }))
      .sort((a, b) => b.count - a.count);

    // Facturación Fiscal e-CF y NCF (Clasificación Oficial DGII)
    const ordsFiscales = ordenes.filter(o => !!o.ncf || !!o.tipo_ecf);
    const fiscalMap: Record<string, {
      codigo: string;
      nombreOficial: string;
      subtitulo: string;
      esElectronico: boolean;
      colorClass: string;
      badgeBg: string;
      count: number;
      totalVentas: number;
      totalItbis: number;
    }> = {};

    ordsFiscales.forEach(o => {
      let raw = (o.tipo_ecf || o.ncf || "").trim().toUpperCase();
      const match = raw.match(/^([EB]\d{2})/);
      let code = match ? match[1] : raw.substring(0, 3);
      if (!DGII_CATALOGO_MAP[code]) {
        if (raw.includes("CRÉDITO FISCAL") || raw.includes("CREDITO FISCAL")) {
          code = raw.startsWith("E") ? "E31" : "B01";
        } else if (raw.includes("CONSUMIDOR FINAL") || raw.includes("CONSUMO")) {
          code = raw.startsWith("E") ? "E32" : "B02";
        }
      }

      const meta = DGII_CATALOGO_MAP[code] || {
        codigo: code || "OTRO",
        nombreOficial: raw || "COMPROBANTE FISCAL",
        subtitulo: "Comprobante emitido según normativa DGII",
        esElectronico: raw.startsWith("E"),
        colorClass: "text-slate-700 dark:text-slate-300",
        badgeBg: "bg-slate-700"
      };

      const key = meta.codigo;
      if (!fiscalMap[key]) {
        fiscalMap[key] = {
          ...meta,
          count: 0,
          totalVentas: 0,
          totalItbis: 0
        };
      }

      fiscalMap[key].count += 1;
      fiscalMap[key].totalVentas += (o.total || 0);
      fiscalMap[key].totalItbis += (o.itbis || 0);
    });

    const listaComprobantesFiscales = Object.values(fiscalMap).sort((a, b) => b.count - a.count);
    const totalVentasFiscales = ordsFiscales.reduce((s, o) => s + (o.total || 0), 0);
    const totalItbisFiscal = ordsFiscales.reduce((s, o) => s + (o.itbis || 0), 0);

    // Mensajería WhatsApp
    const waSentMonth = selectedInspectTenant?.whatsapp_sent_month || 0;
    const waLimit = inspectData?.plans?.find(p => p.id === selectedInspectTenant?.plan_id)?.limite_whatsapp_mes || null;
    const waPct = waLimit ? Math.min(100, Math.round((waSentMonth / waLimit) * 100)) : 0;

    // Estantería Virtual y Gestión de Casilleros
    const estanteriaZonasRaw: any[] = selectedInspectTenant?.config?.estanteria_zonas || [];
    let totalCapacidadEstanteria = 0;

    // Todas las órdenes con ubicación asignada
    const ordenesUbicadasDetalle = ordenes.filter(o => 
      o.estado !== "ENTREGADA" && 
      o.estado !== "ANULADA" && 
      !!o.ubicacion_ropa
    );

    // Mapa rápido de órdenes por nombre de slot en minúsculas
    const slotOcupadoPorOrden = new Map<string, any>();
    ordenesUbicadasDetalle.forEach(o => {
      if (o.ubicacion_ropa) {
        slotOcupadoPorOrden.set(o.ubicacion_ropa.trim().toLowerCase(), o);
      }
    });

    const estanteriaZonasDetalle = estanteriaZonasRaw.map((z: any) => {
      const slotList: string[] = Array.isArray(z.slots) ? z.slots : [];
      const capacidad = slotList.length > 0 ? slotList.length : (Number(z.capacidad) || (typeof z.slots === "number" ? z.slots : 0));
      totalCapacidadEstanteria += capacidad;

      // Buscar órdenes en esta zona
      const slotSet = new Set(slotList.map(s => s.trim().toLowerCase()));
      const ordenesEnEstaZona = ordenesUbicadasDetalle.filter(o => 
        slotSet.has(o.ubicacion_ropa?.trim().toLowerCase()) || 
        (z.nombre && o.ubicacion_ropa?.toLowerCase().includes(z.nombre.toLowerCase()))
      );

      const ocupados = ordenesEnEstaZona.length;
      const libres = Math.max(0, capacidad - ocupados);
      const tasaOcupacion = capacidad > 0 ? Math.min(100, Math.round((ocupados / capacidad) * 100)) : 0;

      // Desglose de cada slot de la zona
      const slotsConEstado = slotList.map(slotName => {
        const occ = slotOcupadoPorOrden.get(slotName.trim().toLowerCase());
        return {
          slotName,
          ocupado: !!occ,
          orden: occ || null
        };
      });

      return {
        id: z.id || z.nombre,
        nombre: z.nombre || "Zona Sin Nombre",
        tipo: z.tipo || "riel",
        prefijo: z.prefijo || "",
        slots: slotList,
        slotsConEstado,
        capacidad,
        ocupados,
        libres,
        tasaOcupacion,
        ordenes: ordenesEnEstaZona
      };
    });

    const ordenesEnEstanteria = ordenesUbicadasDetalle.length;
    const slotsDisponiblesTotal = Math.max(0, totalCapacidadEstanteria - ordenesEnEstanteria);
    const pctOcupacionEstanteria = totalCapacidadEstanteria > 0 
      ? Math.min(100, Math.round((ordenesEnEstanteria / totalCapacidadEstanteria) * 100)) 
      : 0;

    let totalPrendasEnEstanteria = 0;
    ordenesUbicadasDetalle.forEach(o => {
      if (Array.isArray(o.items)) {
        o.items.forEach((it: any) => {
          totalPrendasEnEstanteria += (Number(it.cantidad) || 1);
        });
      }
    });

    // Auditoría & Cierres de Caja
    const totalCierres = cierresCaja.length;
    const cierresCuadrados = cierresCaja.filter((c: any) => (c.diferencia || 0) === 0).length;
    const cierresSobrantes = cierresCaja.filter((c: any) => (c.diferencia || 0) > 0).length;
    const cierresFaltantes = cierresCaja.filter((c: any) => (c.diferencia || 0) < 0).length;
    const tasaCuadrePerfecto = totalCierres > 0 ? Math.round((cierresCuadrados / totalCierres) * 100) : 100;
    const totalEfectivoAuditado = cierresCaja.reduce((sum: number, c: any) => sum + (Number(c.monto_contado_efectivo) || 0), 0);
    const totalFondosIniciales = cierresCaja.reduce((sum: number, c: any) => sum + (Number(c.monto_inicial) || 0), 0);
    const totalDiferenciaNeta = cierresCaja.reduce((sum: number, c: any) => sum + (Number(c.diferencia) || 0), 0);

    // Actividad Reciente y Bitácora de Auditoría
    const feedItems: any[] = [];
    
    // 1. Órdenes Recibidas
    ordenes.forEach(o => {
      feedItems.push({
        id: `ord-${o.id}`,
        tipoCategoria: "cobros",
        titulo: `Orden Recibida #${o.numero}`,
        desc: `Cliente: ${o.cliente_nombre || "Mostrador"} — ${o.items?.length || 0} prendas`,
        monto: o.total,
        isIngreso: true,
        fecha: o.creado_en,
        badgeText: "PEDIDO",
        colorClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
      });
    });

    // 2. Movimientos de Caja
    movimientos.forEach(m => {
      const c = (m.concepto || "").toLowerCase();
      let titulo = "Movimiento de Caja";
      let colorClass = "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-850 dark:text-slate-300";
      let badgeText = "CAJA";
      let tipoCategoria = "caja";
      let isIngreso = true;

      if (c.includes("apertura")) {
        titulo = "Apertura de Caja";
        colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
        badgeText = "APERTURA";
        tipoCategoria = "caja";
      } else if (c.includes("cierre")) {
        titulo = "Cierre de Caja";
        colorClass = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
        badgeText = "CIERRE";
        tipoCategoria = "caja";
      } else if (m.tipo === "GASTO_CAJA_CHICA") {
        titulo = "Gasto Caja Chica";
        colorClass = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
        badgeText = "EGRESO CAJA CHICA";
        tipoCategoria = "gastos";
        isIngreso = false;
      } else if (m.tipo === "VENTA" || m.tipo === "ABONO") {
        titulo = m.tipo === "VENTA" ? "Cobro Recibido" : "Abono a Cuenta";
        colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
        badgeText = "COBRO";
        tipoCategoria = "cobros";
      }

      feedItems.push({
        id: `mov-${m.id}`,
        tipoCategoria,
        titulo,
        desc: m.concepto || "Operación registrada",
        monto: m.monto,
        isIngreso,
        fecha: m.creado_en,
        badgeText,
        colorClass
      });
    });

    // 3. Gastos
    gastos.filter(g => !g.is_caja_chica).forEach(g => {
      feedItems.push({
        id: `gas-${g.id}`,
        tipoCategoria: "gastos",
        titulo: `Gasto: ${g.categoria || "Operacional"}`,
        desc: g.descripcion || "Egreso bancario / transferencia",
        monto: g.monto,
        isIngreso: false,
        fecha: g.fecha || g.creado_en,
        badgeText: "GASTO",
        colorClass: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
      });
    });

    const recientes = feedItems.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 50);

    return {
      totalVentas,
      totalITBIS,
      totalDescuentos,
      totalGastos,
      gastosManuales,
      gastosCajaChica,
      rentabilidad,
      margenBeneficio,
      ticketPromedio,
      porMetodo,
      porCategoria,
      porEstado,
      porEstadoMonto,
      ordenesEnTaller,
      ordenesListasDespacho,
      ordenesCompletadas,
      tasaCompletitud,
      cierresCaja,
      totalCierres,
      cierresCuadrados,
      cierresSobrantes,
      cierresFaltantes,
      tasaCuadrePerfecto,
      totalEfectivoAuditado,
      totalFondosIniciales,
      totalDiferenciaNeta,
      totalDeuda,
      totalAbonadoEnOrdenes,
      totalAbonosCaja,
      cantidadDeudas,
      listaDeudores,
      aging,
      totalPiezas,
      totalLibras,
      totalMontoPrendas,
      totalMontoServicios,
      topPrendas,
      topServicios,
      ordsDomicilio: ordsDomicilio.length,
      ordsLocal,
      deliveryEntregados,
      deliveryEnRuta,
      deliveryPendientes,
      deliveryIngresosEnvio,
      deliveryTotalFacturado,
      topSectores,
      ordsFiscalesCount: ordsFiscales.length,
      listaComprobantesFiscales,
      totalVentasFiscales,
      totalItbisFiscal,
      waSentMonth,
      waLimit,
      waPct,
      totalCapacidadEstanteria,
      ordenesEnEstanteria,
      slotsDisponiblesTotal,
      pctOcupacionEstanteria,
      totalPrendasEnEstanteria,
      estanteriaZonasDetalle,
      ordenesUbicadasDetalle,
      feedItems,
      recientes: recientes || []
    };
  }, [filteredData, selectedInspectTenant, inspectData]);

  // Listas filtradas y paginadas para Prendas
  const filteredPrendas = useMemo(() => {
    if (!stats?.topPrendas) return [];
    const q = prendaSearch.toLowerCase().trim();
    return stats.topPrendas.filter(p => {
      const matchQuery = !q || p.name.toLowerCase().includes(q) || (p.categoria && p.categoria.toLowerCase().includes(q));
      const matchCat = prendaCategory === "all" || p.categoria === prendaCategory;
      return matchQuery && matchCat;
    });
  }, [stats?.topPrendas, prendaSearch, prendaCategory]);

  const totalPrendaPages = Math.max(1, Math.ceil(filteredPrendas.length / PRENDA_PAGE_SIZE));
  const paginatedPrendas = useMemo(() => {
    const start = (prendaPage - 1) * PRENDA_PAGE_SIZE;
    return filteredPrendas.slice(start, start + PRENDA_PAGE_SIZE);
  }, [filteredPrendas, prendaPage]);

  // Reiniciar página de prendas al buscar o cambiar categoría
  useEffect(() => {
    setPrendaPage(1);
  }, [prendaSearch, prendaCategory]);

  // Categorías presentes en topPrendas
  const prendaCategories = useMemo(() => {
    if (!stats?.topPrendas) return [];
    const cats = new Set<string>();
    stats.topPrendas.forEach(p => {
      if (p.categoria) cats.add(p.categoria);
    });
    return Array.from(cats);
  }, [stats?.topPrendas]);

  // Servicios filtrados por búsqueda
  const filteredTopServicios = useMemo(() => {
    if (!stats?.topServicios) return [];
    const q = serviceSearch.toLowerCase().trim();
    return stats.topServicios.filter(s => {
      return !q || s.name.toLowerCase().includes(q) || (s.descripcion && s.descripcion.toLowerCase().includes(q));
    });
  }, [stats?.topServicios, serviceSearch]);

  // Filter debtor clients by search query
  const filteredDeudores = useMemo(() => {
    if (!stats?.listaDeudores) return [];
    if (!debtSearch.trim()) return stats.listaDeudores;
    const q = debtSearch.toLowerCase();
    return stats.listaDeudores.filter(d => 
      d.cliente.nombre?.toLowerCase().includes(q) || 
      d.cliente.telefono?.toLowerCase().includes(q)
    );
  }, [stats?.listaDeudores, debtSearch]);

  // Reset pagination when search or date filter changes
  useEffect(() => {
    setDebtPage(1);
  }, [debtSearch, dateFilter]);

  const totalDebtPages = Math.max(1, Math.ceil(filteredDeudores.length / DEBT_PAGE_SIZE));
  const paginatedDeudores = useMemo(() => {
    const startIndex = (debtPage - 1) * DEBT_PAGE_SIZE;
    return filteredDeudores.slice(startIndex, startIndex + DEBT_PAGE_SIZE);
  }, [filteredDeudores, debtPage]);

  function handleManage(tenantId: string, slug: string) {
    setSession({ empleado_id: auth?.empleado.id || 'admin', tenant_id: tenantId, iniciado_en: new Date().toISOString() });
    setActiveTenant(slug);
    toast.success(`Entrando a ${slug}...`);
    setTimeout(() => window.location.assign(`/t/${slug}`), 500);
  }

  async function handleLogout() {
    const slug = auth?.tenant?.slug || selectedInspectTenant?.slug || (typeof window !== "undefined" ? window.location.pathname.match(/^\/t\/([^/]+)/)?.[1] : null);
    setIsLoggingOut(true);
    await logout();
    setTimeout(() => {
      if (slug && slug !== "admin") {
        navigate({ to: "/t/$slug/login", params: { slug } });
      } else {
        navigate({ to: "/login" });
      }
    }, 450);
  }

  if (isLoggingOut) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-[9999]">
        <GlobalPageLoader text="Cerrando Sesión..." minHeight="min-h-screen" />
      </div>
    );
  }

  if (!auth || auth.empleado.id === '__loading__' || !selectedInspectTenant) {
    return <GlobalPageLoader text="Cargando reportes de sucursal..." minHeight="min-h-screen" />;
  }

  const branchName = getTenantBranchName(selectedInspectTenant);

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950/90 text-foreground transition-colors duration-200">
      {/* HEADER SUPERIOR */}
      <header className="border-b border-border bg-surface sticky top-0 z-30 shadow-2xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge className="bg-[#1B4B73] hover:bg-[#1B4B73] text-white border-0 font-bold text-xs shadow-2xs px-3 py-1 rounded-xl">
              <Shield className="mr-1.5 h-3.5 w-3.5 text-[#F0B900]" /> Reportes & Analítica
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              size="sm" 
              onClick={() => navigate({ to: "/dashboard-admin" })} 
              className="h-9 px-4 rounded-xl font-bold shadow-xs transition-all bg-[#1B4B73] hover:bg-[#153a5b] text-white border-0 text-xs sm:text-sm cursor-pointer active:scale-95 gap-1.5"
            >
              <ArrowLeft className="h-4 w-4 text-white" />
              <span>Volver al Dashboard</span>
            </Button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm bg-rose-600 hover:bg-rose-700 active:scale-95 text-white border border-rose-600 transition-all cursor-pointer shrink-0 whitespace-nowrap"
            >
              <LogOut className="h-4 w-4 shrink-0 text-white" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* BANNER PRINCIPAL DE LA SUCURSAL */}
        <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-border/80 shadow-card flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5">
            {selectedInspectTenant.logo_url ? (
              <div className="h-20 w-20 rounded-2xl p-2 bg-white dark:bg-slate-900 border border-border/70 shadow-xs flex items-center justify-center shrink-0">
                <img 
                  src={selectedInspectTenant.logo_url} 
                  alt="Logo" 
                  className="max-h-full max-w-full object-contain" 
                />
              </div>
            ) : (
              <div 
                className="h-20 w-20 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-md shrink-0"
                style={{ backgroundColor: selectedInspectTenant.color_primario || '#1B4B73' }}
              >
                {selectedInspectTenant.nombre.charAt(0)}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-display font-black text-foreground tracking-tight">
                  {selectedInspectTenant.nombre}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                  {branchName}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {selectedInspectTenant.plan_id.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground flex-wrap justify-center sm:justify-start pt-0.5">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                  <strong className="text-foreground font-bold">Tel:</strong> {formatPhone(selectedInspectTenant.telefono)}
                </span>
                <span className="text-muted-foreground/40 select-none">•</span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                  <strong className="text-foreground font-bold">RNC:</strong> {selectedInspectTenant.rnc || "Sin RNC"}
                </span>
                {selectedInspectTenant.direccion && (
                  <>
                    <span className="text-muted-foreground/40 select-none">•</span>
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{selectedInspectTenant.direccion}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-center">
            <Button 
              onClick={() => handleManage(selectedInspectTenant.id, selectedInspectTenant.slug)}
              className="gap-2 bg-[#1B4B73] hover:bg-[#143755] text-white h-10 px-5 rounded-xl font-bold shadow-md cursor-pointer active:scale-95 transition-all text-xs sm:text-sm border border-[#1B4B73]/20"
            >
              <Building2 className="h-4 w-4 text-[#F0B900]" />
              <span>Gestionar Sucursal</span>
              <ArrowRight className="h-3.5 w-3.5 opacity-80" />
            </Button>
          </div>
        </div>

        {/* BARRA DE HERRAMIENTAS AVANZADA: FILTROS TEMPORALES, MESES, RANGO + EXPORTACIÓN */}
        <div className="bg-surface p-4 rounded-3xl border border-border/80 shadow-xs space-y-3">
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3">
            {/* 1. Botones Rápidos (Pills) */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full xl:w-auto pb-0.5 xl:pb-0 scrollbar-none">
              <span className="text-xs font-bold text-muted-foreground mr-1 flex items-center gap-1 shrink-0">
                <CalendarDays className="h-3.5 w-3.5 text-primary" /> Período:
              </span>
              {[
                { id: "all", label: "Todo el histórico" },
                { id: "today", label: "Hoy" },
                { id: "yesterday", label: "Ayer" },
                { id: "7d", label: "Últimos 7 días" },
                { id: "this_month", label: "Este mes" },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setDateFilter(f.id as DateFilter)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap border ${
                    dateFilter === f.id
                      ? "bg-primary text-white border-primary shadow-xs"
                      : "bg-white dark:bg-slate-900 border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* 2. Selectores Específicos: Mes/Año + Rango Personalizado + Acciones */}
            <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-start xl:justify-end">
              {/* Selector de Mes Específico */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-border/80 shadow-2xs">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground ml-2 shrink-0" />
                <Select
                  value={String(selectedMonth)}
                  onValueChange={(val) => {
                    setSelectedMonth(Number(val));
                    setDateFilter("month_select");
                  }}
                >
                  <SelectTrigger className="h-8 border-none bg-transparent text-xs font-bold w-[120px] focus:ring-0 shadow-none px-2 cursor-pointer">
                    <SelectValue placeholder="Mes" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl shadow-xl max-h-60">
                    {MESES_NOMBRES.map((mes, idx) => (
                      <SelectItem key={mes} value={String(idx)} className="text-xs font-bold cursor-pointer rounded-xl">
                        {mes}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={String(selectedYear)}
                  onValueChange={(val) => {
                    setSelectedYear(Number(val));
                    setDateFilter("month_select");
                  }}
                >
                  <SelectTrigger className="h-8 border-none bg-transparent text-xs font-bold w-[80px] focus:ring-0 shadow-none px-2 border-l border-border/50 cursor-pointer">
                    <SelectValue placeholder="Año" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl shadow-xl">
                    {ANIOS_DISPONIBLES.map((y) => (
                      <SelectItem key={y} value={String(y)} className="text-xs font-bold cursor-pointer rounded-xl">
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Popover Rango Personalizado */}
              <Popover open={isCustomDateOpen} onOpenChange={setIsCustomDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`h-9 px-3.5 rounded-2xl text-xs font-bold border-border/80 gap-1.5 cursor-pointer shadow-2xs ${
                      dateFilter === "custom" ? "bg-primary text-white border-primary" : "bg-white dark:bg-slate-900 hover:bg-muted"
                    }`}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    <span>Rango Fechas</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 p-4 rounded-3xl shadow-2xl space-y-3 border-border/80 bg-background text-foreground">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="text-xs font-black font-display text-foreground">Rango de Fechas</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded-lg" 
                      onClick={() => setIsCustomDateOpen(false)}
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">Fecha Desde</label>
                      <Input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="h-9 rounded-xl bg-white dark:bg-slate-950 border border-border/80 text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">Fecha Hasta</label>
                      <Input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="h-9 rounded-xl bg-white dark:bg-slate-950 border border-border/80 text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      className="flex-1 h-8 rounded-xl text-xs font-bold cursor-pointer"
                      onClick={() => {
                        setCustomStartDate("");
                        setCustomEndDate("");
                        setDateFilter("all");
                        setIsCustomDateOpen(false);
                      }}
                    >
                      Limpiar
                    </Button>
                    <Button
                      className="flex-1 h-8 rounded-xl text-xs font-bold bg-primary text-white cursor-pointer"
                      onClick={() => {
                        if (customStartDate || customEndDate) {
                          setDateFilter("custom");
                        }
                        setIsCustomDateOpen(false);
                      }}
                    >
                      Aplicar
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Botón Exportar */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 h-9 px-4 rounded-2xl font-bold border-border/80 bg-white dark:bg-slate-900 hover:bg-muted text-xs cursor-pointer shadow-2xs">
                    <Download className="h-3.5 w-3.5 text-primary" />
                    <span>Exportar</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-2xl shadow-xl p-1.5">
                  <DropdownMenuItem 
                    className="gap-2 cursor-pointer py-2 rounded-xl text-xs font-bold" 
                    onClick={() => {
                      if (!stats || !inspectData) return;
                      const rows = [
                        ["Ingresos totales (Ventas)", formatRD(stats.totalVentas)],
                        ["Gastos totales", formatRD(stats.totalGastos)],
                        ["Rentabilidad neta", formatRD(stats.rentabilidad)],
                        ["ITBIS generado", formatRD(stats.totalITBIS)],
                        ["Ticket promedio", formatRD(stats.ticketPromedio)],
                        ["Cuentas por cobrar (Deudas)", formatRD(stats.totalDeuda)],
                        ["Abonos recibidos", formatRD(stats.totalAbonadoEnOrdenes + stats.totalAbonosCaja)],
                        ["Prendas por pieza", `${stats.totalPiezas} piezas`],
                        ["Prendas por libra", `${stats.totalLibras} libras`],
                        ...stats.topServicios.map((s: any) => [`Servicio: ${s.name}`, `${s.count} órdenes (${formatRD(s.total)})`]),
                        ...stats.topPrendas.map((p: any) => [`Prenda: ${p.name}`, `${p.count} cant. (${formatRD(p.total)})`]),
                      ];
                      exportToCsv(`Reporte_${selectedInspectTenant.slug}_${activeFilterLabel.replace(/\s+/g, "_")}`, ["Concepto / Indicador", "Valor Registrado"], rows);
                      toast.success("Reporte exportado exitosamente");
                    }}
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    <span>Exportar CSV / Excel</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="gap-2 cursor-pointer py-2 rounded-xl text-xs font-bold" 
                    onClick={() => setIsPrinting(true)}
                  >
                    <Printer className="h-4 w-4 text-rose-600" />
                    <span>Imprimir / PDF</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Botón Imprimir */}
              <Button 
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 rounded-2xl font-bold shadow-xs cursor-pointer active:scale-95 transition-all text-xs" 
                onClick={() => setIsPrinting(true)}
              >
                <Printer className="h-4 w-4" />
                <span>Imprimir</span>
              </Button>
            </div>
          </div>

          {/* 3. Sub-Banner de Estado del Filtro Activo */}
          {dateFilter !== "all" && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-border/60 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-primary/10 text-primary font-bold text-[11px] border border-primary/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                  Filtrando: {activeFilterLabel}
                </span>
                <span className="text-muted-foreground text-[11px]">
                  Mostrando <strong className="text-foreground">{filteredData?.ordenes.length || 0}</strong> órdenes, <strong className="text-foreground">{filteredData?.gastos.length || 0}</strong> gastos y <strong className="text-foreground">{filteredData?.cajas.length || 0}</strong> turnos de caja.
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDateFilter("all");
                  setCustomStartDate("");
                  setCustomEndDate("");
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 cursor-pointer hover:underline"
              >
                <XIcon className="h-3 w-3" />
                <span>Restablecer (Ver Todo)</span>
              </button>
            </div>
          )}
        </div>

        {inspectLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 bg-surface rounded-3xl border border-border/80 shadow-xs">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-semibold text-muted-foreground animate-pulse">
              Calculando analítica y estados en tiempo real...
            </p>
          </div>
        ) : stats && inspectData && filteredData ? (
          /* PESTAÑAS INDEPENDIENTES CON ESTILO /ADMIN Y BOTÓN ICONO PASTEL */
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3 bg-transparent p-0 border-none h-auto w-full">
              {/* Tab 1: Finanzas */}
              <TabsTrigger 
                value="finanzas"
                className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl font-bold bg-surface border border-border/80 text-foreground shadow-2xs data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-md transition-all hover:bg-muted/60 hover:border-border cursor-pointer text-left justify-start h-full w-full group select-none relative overflow-hidden"
              >
                <span className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 shrink-0 transition-transform group-hover:scale-105 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white">
                  <TrendingUp className="h-5 w-5 shrink-0" />
                </span>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-bold text-xs sm:text-[13px] leading-tight truncate text-foreground group-data-[state=active]:text-white">
                    Finanzas & Caja
                  </span>
                  <span className="text-[10px] text-muted-foreground group-data-[state=active]:text-white/80 leading-tight truncate font-normal mt-1">
                    Ingresos y balances
                  </span>
                </div>
              </TabsTrigger>

              {/* Tab 2: CXC (Deudas) */}
              <TabsTrigger 
                value="deudas"
                className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl font-bold bg-surface border border-border/80 text-foreground shadow-2xs data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-md transition-all hover:bg-muted/60 hover:border-border cursor-pointer text-left justify-start h-full w-full group select-none relative overflow-hidden"
              >
                <span className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 shrink-0 transition-transform group-hover:scale-105 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white">
                  <Landmark className="h-5 w-5 shrink-0" />
                </span>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-bold text-xs sm:text-[13px] leading-tight truncate text-foreground group-data-[state=active]:text-white">
                    CXC
                  </span>
                  <span className="text-[10px] text-muted-foreground group-data-[state=active]:text-white/80 leading-tight truncate font-normal mt-1">
                    {stats.cantidadDeudas} pendientes
                  </span>
                </div>
              </TabsTrigger>

              {/* Tab 3: Prendas & Servicios */}
              <TabsTrigger 
                value="prendas"
                className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl font-bold bg-surface border border-border/80 text-foreground shadow-2xs data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-md transition-all hover:bg-muted/60 hover:border-border cursor-pointer text-left justify-start h-full w-full group select-none relative overflow-hidden"
              >
                <span className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 shrink-0 transition-transform group-hover:scale-105 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white">
                  <Shirt className="h-5 w-5 shrink-0" />
                </span>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-bold text-xs sm:text-[13px] leading-tight truncate text-foreground group-data-[state=active]:text-white">
                    Prendas & Servicios
                  </span>
                  <span className="text-[10px] text-muted-foreground group-data-[state=active]:text-white/80 leading-tight truncate font-normal mt-1">
                    Operaciones
                  </span>
                </div>
              </TabsTrigger>

              {/* Tab 4: Equipo de Trabajo */}
              <TabsTrigger 
                value="equipo"
                className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl font-bold bg-surface border border-border/80 text-foreground shadow-2xs data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-md transition-all hover:bg-muted/60 hover:border-border cursor-pointer text-left justify-start h-full w-full group select-none relative overflow-hidden"
              >
                <span className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 shrink-0 transition-transform group-hover:scale-105 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white">
                  <Users className="h-5 w-5 shrink-0" />
                </span>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-bold text-xs sm:text-[13px] leading-tight truncate text-foreground group-data-[state=active]:text-white">
                    Equipo de Trabajo
                  </span>
                  <span className="text-[10px] text-muted-foreground group-data-[state=active]:text-white/80 leading-tight truncate font-normal mt-1">
                    Ventas y personal
                  </span>
                </div>
              </TabsTrigger>

              {/* Tab 5: Logística & Delivery (CONDICIONAL) */}
              {activeModules.logistica && (
                <TabsTrigger 
                  value="logistica"
                  className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl font-bold bg-surface border border-border/80 text-foreground shadow-2xs data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-md transition-all hover:bg-muted/60 hover:border-border cursor-pointer text-left justify-start h-full w-full group select-none relative overflow-hidden"
                >
                  <span className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 shrink-0 transition-transform group-hover:scale-105 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white">
                    <Truck className="h-5 w-5 shrink-0" />
                  </span>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-bold text-xs sm:text-[13px] leading-tight truncate text-foreground group-data-[state=active]:text-white">
                      Logística & Delivery
                    </span>
                    <span className="text-[10px] text-muted-foreground group-data-[state=active]:text-white/80 leading-tight truncate font-normal mt-1">
                      Envíos a domicilio
                    </span>
                  </div>
                </TabsTrigger>
              )}

              {/* Tab 6: Facturación Fiscal e-CF (CONDICIONAL) */}
              {activeModules.facturacion_fiscal && (
                <TabsTrigger 
                  value="fiscal"
                  className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl font-bold bg-surface border border-border/80 text-foreground shadow-2xs data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-md transition-all hover:bg-muted/60 hover:border-border cursor-pointer text-left justify-start h-full w-full group select-none relative overflow-hidden"
                >
                  <span className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 shrink-0 transition-transform group-hover:scale-105 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white">
                    <FileCheck2 className="h-5 w-5 shrink-0" />
                  </span>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-bold text-xs sm:text-[13px] leading-tight truncate text-foreground group-data-[state=active]:text-white">
                      Facturación e-CF
                    </span>
                    <span className="text-[10px] text-muted-foreground group-data-[state=active]:text-white/80 leading-tight truncate font-normal mt-1">
                      Comprobantes DGII
                    </span>
                  </div>
                </TabsTrigger>
              )}

              {/* Tab 7: Mensajería WhatsApp (CONDICIONAL) */}
              {activeModules.whatsapp && (
                <TabsTrigger 
                  value="whatsapp"
                  className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl font-bold bg-surface border border-border/80 text-foreground shadow-2xs data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-md transition-all hover:bg-muted/60 hover:border-border cursor-pointer text-left justify-start h-full w-full group select-none relative overflow-hidden"
                >
                  <span className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 shrink-0 transition-transform group-hover:scale-105 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white">
                    <MessageCircle className="h-5 w-5 shrink-0" />
                  </span>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-bold text-xs sm:text-[13px] leading-tight truncate text-foreground group-data-[state=active]:text-white">
                      WhatsApp
                    </span>
                    <span className="text-[10px] text-muted-foreground group-data-[state=active]:text-white/80 leading-tight truncate font-normal mt-1">
                      Avisos automáticos
                    </span>
                  </div>
                </TabsTrigger>
              )}

              {/* Tab 8: Tablero de Procesos (CONDICIONAL) */}
              {activeModules.procesos && (
                <TabsTrigger 
                  value="procesos"
                  className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl font-bold bg-surface border border-border/80 text-foreground shadow-2xs data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-md transition-all hover:bg-muted/60 hover:border-border cursor-pointer text-left justify-start h-full w-full group select-none relative overflow-hidden"
                >
                  <span className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 shrink-0 transition-transform group-hover:scale-105 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white">
                    <ListTodo className="h-5 w-5 shrink-0" />
                  </span>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-bold text-xs sm:text-[13px] leading-tight truncate text-foreground group-data-[state=active]:text-white">
                      Flujo de Procesos
                    </span>
                    <span className="text-[10px] text-muted-foreground group-data-[state=active]:text-white/80 leading-tight truncate font-normal mt-1">
                      Etapas y tiempos
                    </span>
                  </div>
                </TabsTrigger>
              )}

              {/* Tab 9: Estantería Virtual (CONDICIONAL) */}
              {activeModules.estanteria && (
                <TabsTrigger 
                  value="estanteria"
                  className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl font-bold bg-surface border border-border/80 text-foreground shadow-2xs data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-md transition-all hover:bg-muted/60 hover:border-border cursor-pointer text-left justify-start h-full w-full group select-none relative overflow-hidden"
                >
                  <span className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400 shrink-0 transition-transform group-hover:scale-105 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white">
                    <Layers className="h-5 w-5 shrink-0" />
                  </span>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-bold text-xs sm:text-[13px] leading-tight truncate text-foreground group-data-[state=active]:text-white">
                      Estantería Virtual
                    </span>
                    <span className="text-[10px] text-muted-foreground group-data-[state=active]:text-white/80 leading-tight truncate font-normal mt-1">
                      Rieles y casilleros
                    </span>
                  </div>
                </TabsTrigger>
              )}

              {/* Tab 10: Auditoría & Cierres */}
              <TabsTrigger 
                value="auditoria"
                className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl font-bold bg-surface border border-border/80 text-foreground shadow-2xs data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-md transition-all hover:bg-muted/60 hover:border-border cursor-pointer text-left justify-start h-full w-full group select-none relative overflow-hidden"
              >
                <span className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0 transition-transform group-hover:scale-105 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white">
                  <Bell className="h-5 w-5 shrink-0" />
                </span>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-bold text-xs sm:text-[13px] leading-tight truncate text-foreground group-data-[state=active]:text-white">
                    Auditoría & Caja
                  </span>
                  <span className="text-[10px] text-muted-foreground group-data-[state=active]:text-white/80 leading-tight truncate font-normal mt-1">
                    Historial y arqueo
                  </span>
                </div>
              </TabsTrigger>
            </TabsList>

            {/* ============================================================ */}
            {/* CONTENIDO 1: FINANZAS & CAJA                                 */}
            {/* ============================================================ */}
            <TabsContent value="finanzas" className="space-y-6">
              {/* KPIs Financieros con Paleta Pastel /admin */}
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {/* 1. Ventas Totales: Card Destacada Oscura Estilo MRR Admin */}
                <Card className="p-4 sm:p-5 bg-gradient-to-br from-[#183659] to-[#0f243c] text-white border-0 rounded-2xl shadow-md flex flex-col justify-between space-y-3 hover:shadow-lg transition-all min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-[11px] font-bold text-white/80 uppercase tracking-wider">
                    <span>Ventas Totales</span>
                    <span className="p-2 rounded-xl bg-white/10 text-emerald-400">
                      <TrendingUp className="h-4 w-4" />
                    </span>
                  </div>
                  <MetricDisplay value={stats.totalVentas} colorClass="text-white font-black" />
                  <div className="flex items-center gap-1.5 text-[11px] text-white/80 font-medium pt-2 border-t border-white/10">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="truncate">{filteredData.ordenes.length} órdenes facturadas</span>
                  </div>
                </Card>

                {/* 2. Gastos Operativos: Pastel Rosa */}
                <Card className="p-4 sm:p-5 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-rose-300 dark:hover:border-rose-800 transition-all min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                    <span>Gastos Operativos</span>
                    <span className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/70 text-rose-600 dark:text-rose-300">
                      <DollarSign className="h-4 w-4" />
                    </span>
                  </div>
                  <MetricDisplay value={stats.totalGastos} colorClass="text-rose-700 dark:text-rose-400 font-black" />
                  <div className="flex items-center gap-1.5 text-[11px] text-rose-800/80 dark:text-rose-300/80 font-medium pt-2 border-t border-rose-200/60 dark:border-rose-900/50">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span className="truncate">Manuales + caja chica</span>
                  </div>
                </Card>

                {/* 3. Rentabilidad Neta: Pastel Verde Esmeralda */}
                <Card className="p-4 sm:p-5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    <span>Rentabilidad Neta</span>
                    <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/70 text-emerald-600 dark:text-emerald-300">
                      <Wallet className="h-4 w-4" />
                    </span>
                  </div>
                  <MetricDisplay 
                    value={stats.rentabilidad} 
                    colorClass={stats.rentabilidad >= 0 ? 'text-emerald-700 dark:text-emerald-400 font-black' : 'text-rose-700 dark:text-rose-400 font-black'} 
                  />
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-800/80 dark:text-emerald-300/80 font-medium pt-2 border-t border-emerald-200/60 dark:border-emerald-900/50">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate">Margen: {Math.round(stats.margenBeneficio)}% de utilidad</span>
                  </div>
                </Card>

                {/* 4. ITBIS Retenido: Pastel Azul Cielo */}
                <Card className="p-4 sm:p-5 bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-sky-300 dark:hover:border-sky-800 transition-all min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-[11px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider">
                    <span>ITBIS Retenido</span>
                    <span className="p-2 rounded-xl bg-sky-100 dark:bg-sky-900/70 text-sky-600 dark:text-sky-300">
                      <Shield className="h-4 w-4" />
                    </span>
                  </div>
                  <MetricDisplay value={stats.totalITBIS} colorClass="text-sky-700 dark:text-sky-400 font-black" />
                  <div className="flex items-center gap-1.5 text-[11px] text-sky-800/80 dark:text-sky-300/80 font-medium pt-2 border-t border-sky-200/60 dark:border-sky-900/50">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" />
                    <span className="truncate">Declaración DGII</span>
                  </div>
                </Card>

                {/* 5. Ticket Promedio: Pastel Ámbar / Dorado */}
                <Card className="p-4 sm:p-5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-amber-300 dark:hover:border-amber-800 transition-all col-span-2 sm:col-span-1 min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                    <span>Ticket Promedio</span>
                    <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/70 text-amber-600 dark:text-amber-300">
                      <Sparkles className="h-4 w-4" />
                    </span>
                  </div>
                  <MetricDisplay value={stats.ticketPromedio} colorClass="text-amber-700 dark:text-amber-400 font-black" />
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-800/80 dark:text-amber-300/80 font-medium pt-2 border-t border-amber-200/60 dark:border-amber-900/50">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="truncate">Promedio por orden</span>
                  </div>
                </Card>
              </div>

              {/* Gráficos de Distribución Ejecutivos */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* 1. Métodos de Cobro */}
                <Card className="p-6 bg-surface border border-border/80 shadow-card rounded-3xl space-y-5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <span className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 shadow-2xs">
                        <CreditCard className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="font-display font-bold text-lg text-foreground leading-tight">Métodos de Cobro</h3>
                        <p className="text-xs text-muted-foreground">Distribución de ingresos por canal de pago</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider block">Total Facturado</span>
                      <span className="text-base font-display font-black text-emerald-700 dark:text-emerald-400">
                        {formatRD(stats.totalVentas)}
                      </span>
                    </div>
                  </div>

                  {/* Barra Multi-Segmento de Participación */}
                  <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex shadow-inner">
                    {["EFECTIVO", "TARJETA", "TRANSFERENCIA", "MIXTO"].map((m) => {
                      const v = stats.porMetodo[m] || 0;
                      const pct = stats.totalVentas > 0 ? (v / stats.totalVentas) * 100 : 0;
                      if (pct <= 0) return null;
                      const colors: Record<string, string> = {
                        EFECTIVO: "bg-emerald-500",
                        TARJETA: "bg-sky-500",
                        TRANSFERENCIA: "bg-indigo-500",
                        MIXTO: "bg-amber-500",
                      };
                      return (
                        <div 
                          key={m}
                          style={{ width: `${pct}%` }} 
                          className={`h-full ${colors[m] || "bg-slate-400"} transition-all duration-500 first:rounded-l-full last:rounded-r-full`}
                          title={`${m}: ${formatRD(v)} (${Math.round(pct)}%)`}
                        />
                      );
                    })}
                  </div>

                  {/* Filas de Métodos de Pago */}
                  <div className="space-y-2.5">
                    {[
                      { key: "EFECTIVO", label: "Efectivo", icon: Coins, bg: "bg-emerald-100 dark:bg-emerald-950/80", text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" },
                      { key: "TARJETA", label: "Tarjeta (POS / Datáfono)", icon: CreditCard, bg: "bg-sky-100 dark:bg-sky-950/80", text: "text-sky-600 dark:text-sky-400", bar: "bg-sky-500" },
                      { key: "TRANSFERENCIA", label: "Transferencia Bancaria", icon: Landmark, bg: "bg-indigo-100 dark:bg-indigo-950/80", text: "text-indigo-600 dark:text-indigo-400", bar: "bg-indigo-500" },
                      { key: "MIXTO", label: "Pago Mixto / Otros", icon: Wallet, bg: "bg-amber-100 dark:bg-amber-950/80", text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500" },
                    ].map((m) => {
                      const v = stats.porMetodo[m.key] || 0;
                      const pct = stats.totalVentas > 0 ? (v / stats.totalVentas) * 100 : 0;
                      const Icon = m.icon;
                      return (
                        <div key={m.key} className="p-3 rounded-2xl bg-muted/20 border border-border/50 hover:bg-muted/40 transition-colors space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`p-1.5 rounded-xl ${m.bg} ${m.text} shrink-0`}>
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className="font-bold text-foreground truncate">{m.label}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-black font-display text-foreground text-sm">
                                {formatRD(v)}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-muted text-muted-foreground border border-border/50">
                                {Math.round(pct)}%
                              </span>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-200/60 dark:bg-slate-800 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${m.bar} transition-all duration-500`}
                              style={{ width: `${pct}%` }} 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* 2. Gastos por Categoría */}
                <Card className="p-6 bg-surface border border-border/80 shadow-card rounded-3xl space-y-5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <span className="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 shadow-2xs">
                        <Tag className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="font-display font-bold text-lg text-foreground leading-tight">Gastos por Categoría</h3>
                        <p className="text-xs text-muted-foreground">Egresos operativos del negocio</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider block">Total Gastos</span>
                      <span className="text-base font-display font-black text-rose-600 dark:text-rose-400">
                        {formatRD(stats.totalGastos)}
                      </span>
                    </div>
                  </div>

                  {/* Barra Multi-Segmento de Gastos */}
                  {stats.totalGastos > 0 && (
                    <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex shadow-inner">
                      {Object.entries(stats.porCategoria).map(([cat, val]) => {
                        const pct = stats.totalGastos > 0 ? ((val as number) / stats.totalGastos) * 100 : 0;
                        if (pct <= 0) return null;
                        const catInfo = getReporteCategoriaInfo(cat);
                        return (
                          <div 
                            key={cat}
                            style={{ width: `${pct}%` }} 
                            className={`h-full ${catInfo.barColor} transition-all duration-500 first:rounded-l-full last:rounded-r-full`}
                            title={`${cat}: ${formatRD(val as number)} (${Math.round(pct)}%)`}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Lista de Categorías */}
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {Object.entries(stats.porCategoria).length > 0 ? (
                      Object.entries(stats.porCategoria).map(([cat, val]) => {
                        const pct = stats.totalGastos > 0 ? ((val as number) / stats.totalGastos) * 100 : 0;
                        const catInfo = getReporteCategoriaInfo(cat);
                        const Icon = catInfo.icon;
                        return (
                          <div key={cat} className="p-3 rounded-2xl bg-muted/20 border border-border/50 hover:bg-muted/40 transition-colors space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`p-1.5 rounded-xl ${catInfo.bgLight} ${catInfo.text} shrink-0`}>
                                  <Icon className="h-4 w-4" />
                                </span>
                                <span className="font-bold text-foreground truncate capitalize">{catInfo.fullLabel}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-black font-display text-rose-600 dark:text-rose-400 text-sm">
                                  {formatRD(val as number)}
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                                  {Math.round(pct)}%
                                </span>
                              </div>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-200/60 dark:bg-slate-800 overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${catInfo.barColor} transition-all duration-500`}
                                style={{ width: `${pct}%` }} 
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-12 text-center text-xs text-muted-foreground font-semibold">
                        <Tag className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                        Sin gastos registrados en el período seleccionado.
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* ============================================================ */}
            {/* CONTENIDO 2: CUENTAS POR COBRAR (DEUDAS)                      */}
            {/* ============================================================ */}
            <TabsContent value="deudas" className="space-y-6">
              {/* KPIs de Cartera de Créditos con Colores Pastel */}
              <div className="grid gap-3.5 sm:grid-cols-3">
                {/* 1. Deuda Total Pendiente: Pastel Rosa */}
                <Card className="p-4 sm:p-5 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-rose-300 dark:hover:border-rose-800 transition-all min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                    <span>Deuda Total Pendiente</span>
                    <span className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/70 text-rose-600 dark:text-rose-300">
                      <AlertTriangle className="h-4 w-4" />
                    </span>
                  </div>
                  <MetricDisplay value={stats.totalDeuda} colorClass="text-rose-700 dark:text-rose-400 font-black" />
                  <div className="flex items-center gap-1.5 text-[11px] text-rose-800/80 dark:text-rose-300/80 font-medium pt-2 border-t border-rose-200/60 dark:border-rose-900/50">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span>{stats.cantidadDeudas} facturas pendientes</span>
                  </div>
                </Card>

                {/* 2. Abonos Recibidos: Pastel Esmeralda */}
                <Card className="p-4 sm:p-5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    <span>Abonos Recibidos</span>
                    <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/70 text-emerald-600 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                  </div>
                  <MetricDisplay value={stats.totalAbonadoEnOrdenes + stats.totalAbonosCaja} colorClass="text-emerald-700 dark:text-emerald-400 font-black" />
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-800/80 dark:text-emerald-300/80 font-medium pt-2 border-t border-emerald-200/60 dark:border-emerald-900/50">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>Pagos parciales aplicados</span>
                  </div>
                </Card>

                {/* 3. Clientes con Deuda: Pastel Índigo */}
                <Card className="p-4 sm:p-5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-[11px] font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
                    <span>Clientes con Deuda</span>
                    <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/70 text-indigo-600 dark:text-indigo-300">
                      <Users className="h-4 w-4" />
                    </span>
                  </div>
                  <MetricDisplay value={stats.listaDeudores.length} isCurrency={false} colorClass="text-indigo-700 dark:text-indigo-400 font-black" />
                  <div className="flex items-center gap-1.5 text-[11px] text-indigo-800/80 dark:text-indigo-300/80 font-medium pt-2 border-t border-indigo-200/60 dark:border-indigo-900/50">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                    <span>Cartera activa con saldo pendiente</span>
                  </div>
                </Card>
              </div>

              {/* Aging de Deudas Dinámico según Plazo de Crédito (/nueva-orden) */}
              <Card className="p-6 bg-surface border border-border/80 shadow-card rounded-3xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                      <Clock className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-display font-bold text-lg text-foreground">
                        Envejecimiento de la Deuda (Por Vencimiento de Crédito)
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Calculado con base en el plazo de <strong className="text-foreground">{stats.aging.plazoDias} días</strong> configurado en facturación
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-xl text-xs font-bold bg-muted/60 text-muted-foreground border border-border/60 self-start sm:self-auto">
                    Plazo Base: {stats.aging.plazoDias} Días
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  {/* Tarjeta 1: En Plazo */}
                  <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        0 a {stats.aging.plazoDias} Días
                      </span>
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    </div>
                    <div className="my-1">
                      <MetricDisplay value={stats.aging.enPlazo} colorClass="text-emerald-700 dark:text-emerald-400" />
                    </div>
                    <span className="text-[10px] font-medium text-emerald-800/80 dark:text-emerald-300/80">
                      En Plazo (Corriente)
                    </span>
                  </div>

                  {/* Tarjeta 2: Vencida 1 a 15 Días */}
                  <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                        Vencida: 1 a 15 Días
                      </span>
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                    </div>
                    <div className="my-1">
                      <MetricDisplay value={stats.aging.vencida1_15} colorClass="text-amber-700 dark:text-amber-400" />
                    </div>
                    <span className="text-[10px] font-medium text-amber-800/80 dark:text-amber-300/80">
                      Retraso leve sobre plazo
                    </span>
                  </div>

                  {/* Tarjeta 3: Vencida 16 a 30 Días */}
                  <div className="p-4 rounded-2xl bg-orange-50/80 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-900/60 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-800 dark:text-orange-300">
                        Vencida: 16 a 30 Días
                      </span>
                      <span className="h-2 w-2 rounded-full bg-orange-500" />
                    </div>
                    <div className="my-1">
                      <MetricDisplay value={stats.aging.vencida16_30} colorClass="text-orange-700 dark:text-orange-400" />
                    </div>
                    <span className="text-[10px] font-medium text-orange-800/80 dark:text-orange-300/80">
                      Gestión de cobro activa
                    </span>
                  </div>

                  {/* Tarjeta 4: Mora Crítica (+30 Días de retraso) */}
                  <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                        Mora Crítica (+30 Días)
                      </span>
                      <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                    </div>
                    <div className="my-1">
                      <MetricDisplay value={stats.aging.moraCritica} colorClass="text-rose-700 dark:text-rose-400" />
                    </div>
                    <span className="text-[10px] font-medium text-rose-800/80 dark:text-rose-300/80">
                      Riesgo alto de mora
                    </span>
                  </div>
                </div>
              </Card>

              {/* Tabla Detallada de Clientes Deudores (Estilo Premium) */}
              <Card className="p-5 sm:p-6 bg-surface border border-border/80 shadow-card rounded-3xl space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/60 shrink-0">
                      <Landmark className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-bold text-lg sm:text-xl text-foreground">Listado de Clientes con Deuda (CXC)</h3>
                        <Badge variant="outline" className="text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900">
                          {filteredDeudores.length} {filteredDeudores.length === 1 ? 'cliente' : 'clientes'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Control de saldos pendientes y antigüedad de facturación por cliente</p>
                    </div>
                  </div>

                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar por cliente o teléfono..."
                      value={debtSearch}
                      onChange={(e) => setDebtSearch(e.target.value)}
                      className="pl-9.5 pr-8 h-10 rounded-xl text-xs bg-muted/30 border-border/70 focus:bg-background transition-all"
                    />
                    {debtSearch && (
                      <button
                        type="button"
                        onClick={() => setDebtSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 overflow-hidden bg-surface shadow-2xs">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/70">
                          <th className="py-3 px-4">Cliente</th>
                          <th className="py-3 px-4">Contacto</th>
                          <th className="py-3 px-4 text-center">Facturas</th>
                          <th className="py-3 px-4 text-center">Antigüedad</th>
                          <th className="py-3 px-4 text-right">Total Facturado</th>
                          <th className="py-3 px-4 text-right">Saldo Pendiente</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {paginatedDeudores.length > 0 ? (
                          paginatedDeudores.map((d) => {
                            const initials = (d.cliente.nombre || "CL").substring(0, 2).toUpperCase();
                            const isCritical = d.diasMaxAntiguedad > 30;
                            const isWarning = d.diasMaxAntiguedad > 15;
                            
                            return (
                              <tr key={d.cliente.id} className="hover:bg-muted/30 transition-colors group">
                                {/* Cliente con Iniciales y Segmentación */}
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 border border-primary/20">
                                      {initials}
                                    </div>
                                    <div className="min-w-0">
                                      <span className="font-bold text-sm text-foreground block truncate group-hover:text-primary transition-colors">
                                        {d.cliente.nombre}
                                      </span>
                                      <div className="flex items-center gap-1.5 text-[11px] mt-0.5 flex-wrap">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-muted/60 inline-flex items-center gap-1 ${d.categoriaColor}`}>
                                          {d.totalOrdenesHistoricas >= 10 && <Sparkles className="h-2.5 w-2.5 text-amber-500" />}
                                          {d.categoriaCliente}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground font-medium">
                                          • {d.totalOrdenesHistoricas} {d.totalOrdenesHistoricas === 1 ? 'orden realizada' : 'órdenes realizadas'}
                                        </span>
                                        {(d.cliente as any).rnc_cedula && (
                                          <span className="text-[10px] text-muted-foreground font-mono">
                                            • RNC: {(d.cliente as any).rnc_cedula}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Teléfono con Formato Estricto (XXX) XXX-XXXX */}
                                <td className="py-3.5 px-4 text-muted-foreground">
                                  {d.cliente.telefono && d.cliente.telefono !== "---" ? (
                                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                                      <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                      <span className="font-mono text-xs">{formatPhone(d.cliente.telefono)}</span>
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground/60 italic text-[11px]">No registrado</span>
                                  )}
                                </td>

                                {/* Facturas Pendientes */}
                                <td className="py-3.5 px-4 text-center">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted/60 border border-border/60 text-xs font-bold text-foreground tabular-nums">
                                    <FileText className="h-3 w-3 text-muted-foreground" />
                                    {d.facturasPendientes.length} {d.facturasPendientes.length === 1 ? 'factura' : 'facturas'}
                                  </span>
                                </td>

                                {/* Antigüedad & Mora relativa al Plazo de Crédito */}
                                <td className="py-3.5 px-4 text-center">
                                  {(() => {
                                    const diasMora = d.diasMaxAntiguedad - (stats.aging.plazoDias || 30);
                                    const isEnPlazo = diasMora <= 0;
                                    const isCritica = diasMora > 30;
                                    const isWarning = diasMora > 0 && diasMora <= 30;

                                    return (
                                      <div className="inline-flex flex-col items-center gap-0.5">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                                          isCritica 
                                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'
                                            : isWarning
                                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60'
                                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60'
                                        }`}>
                                          <Clock className="h-3 w-3 shrink-0" />
                                          <span>{d.diasMaxAntiguedad} {d.diasMaxAntiguedad === 1 ? 'día' : 'días'}</span>
                                        </span>
                                        <span className={`text-[9px] font-extrabold ${
                                          isCritica ? 'text-rose-600 dark:text-rose-400' : isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                                        }`}>
                                          {isEnPlazo ? 'En plazo' : `+${diasMora}d vencida`}
                                        </span>
                                      </div>
                                    );
                                  })()}
                                </td>

                                {/* Total Facturado */}
                                <td className="py-3.5 px-4 text-right text-muted-foreground font-semibold tabular-nums text-xs sm:text-sm">
                                  {formatRD(d.totalFacturado)}
                                </td>

                                {/* Saldo Pendiente */}
                                <td className="py-3.5 px-4 text-right">
                                  <div className="inline-flex items-center justify-end">
                                    <span className="px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60 font-bold font-display text-xs sm:text-sm tabular-nums tracking-tight">
                                      {formatRD(d.totalDeuda)}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-muted-foreground">
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                                  <CheckCircle2 className="h-6 w-6" />
                                </div>
                                <span className="font-bold text-sm text-foreground">
                                  {debtSearch ? "No se encontraron clientes con ese criterio" : "No hay cuentas por cobrar pendientes"}
                                </span>
                                <p className="text-xs text-muted-foreground max-w-sm">
                                  {debtSearch ? "Prueba a buscar con otro nombre o número de teléfono." : "Todas las órdenes y facturas registradas en este período se encuentran completamente saldadas."}
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer de Paginación para cada 5 elementos */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 border-t border-border/70 bg-muted/20">
                    <span className="text-xs text-muted-foreground font-medium">
                      Mostrando <span className="font-bold text-foreground">{filteredDeudores.length === 0 ? 0 : (debtPage - 1) * DEBT_PAGE_SIZE + 1}</span> a <span className="font-bold text-foreground">{Math.min(debtPage * DEBT_PAGE_SIZE, filteredDeudores.length)}</span> de <span className="font-bold text-foreground">{filteredDeudores.length}</span> {filteredDeudores.length === 1 ? 'cliente' : 'clientes'}
                    </span>

                    {totalDebtPages > 1 && (
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDebtPage(p => Math.max(1, p - 1))}
                          disabled={debtPage === 1}
                          className="h-8 px-2.5 rounded-xl text-xs gap-1 border-border/70 hover:bg-background cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          <span>Anterior</span>
                        </Button>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalDebtPages }, (_, i) => i + 1).map((pageNum) => (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setDebtPage(pageNum)}
                              className={`h-8 w-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                debtPage === pageNum
                                  ? "bg-primary text-white shadow-xs"
                                  : "bg-surface border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                              }`}
                            >
                              {pageNum}
                            </button>
                          ))}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDebtPage(p => Math.min(totalDebtPages, p + 1))}
                          disabled={debtPage === totalDebtPages}
                          className="h-8 px-2.5 rounded-xl text-xs gap-1 border-border/70 hover:bg-background cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <span>Siguiente</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* ============================================================ */}
            {/* CONTENIDO 3: PRENDAS & SERVICIOS (VISTA EN TARJETAS SUTILES) */}
            {/* ============================================================ */}
            <TabsContent value="prendas" className="space-y-6">
              {/* KPIs de Operación de Prendas & Servicios con Fondos Pastel */}
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1. Piezas Procesadas: Pastel Índigo */}
                <Card className="p-4 sm:p-5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-[11px] font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
                    <span>Prendas por Piezas</span>
                    <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/70 text-indigo-600 dark:text-indigo-300">
                      <Shirt className="h-4 w-4" />
                    </span>
                  </div>
                  <MetricDisplay value={stats.totalPiezas} isCurrency={false} colorClass="text-indigo-700 dark:text-indigo-400 font-black" />
                  <div className="flex items-center gap-1.5 text-[11px] text-indigo-800/80 dark:text-indigo-300/80 font-medium pt-2 border-t border-indigo-200/60 dark:border-indigo-900/50">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                    <span>{stats.totalPiezas + stats.totalLibras > 0 ? Math.round((stats.totalPiezas / (stats.totalPiezas + stats.totalLibras)) * 100) : 0}% del volumen total</span>
                  </div>
                </Card>

                {/* 2. Lavado por Libras: Pastel Azul Cielo */}
                <Card className="p-4 sm:p-5 bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-sky-300 dark:hover:border-sky-800 transition-all min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-[11px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider">
                    <span>Volumen por Libras</span>
                    <span className="p-2 rounded-xl bg-sky-100 dark:bg-sky-900/70 text-sky-600 dark:text-sky-300">
                      <Layers className="h-4 w-4" />
                    </span>
                  </div>
                  <MetricDisplay value={`${stats.totalLibras} lbs`} isCurrency={false} colorClass="text-sky-700 dark:text-sky-400 font-black" />
                  <div className="flex items-center gap-1.5 text-[11px] text-sky-800/80 dark:text-sky-300/80 font-medium pt-2 border-t border-sky-200/60 dark:border-sky-900/50">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" />
                    <span>Lavado y secado por peso</span>
                  </div>
                </Card>

                {/* 3. Facturación de Prendas: Pastel Esmeralda */}
                <Card className="p-4 sm:p-5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    <span>Facturación de Prendas</span>
                    <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/70 text-emerald-600 dark:text-emerald-300">
                      <TrendingUp className="h-4 w-4" />
                    </span>
                  </div>
                  <MetricDisplay value={stats.totalMontoPrendas} colorClass="text-emerald-700 dark:text-emerald-400 font-black" />
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-800/80 dark:text-emerald-300/80 font-medium pt-2 border-t border-emerald-200/60 dark:border-emerald-900/50">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>Ingresos brutos por prendas</span>
                  </div>
                </Card>

                {/* 4. Servicios Aplicados: Pastel Ámbar */}
                <Card className="p-4 sm:p-5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-amber-300 dark:hover:border-amber-800 transition-all min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                    <span>Servicios Aplicados</span>
                    <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/70 text-amber-600 dark:text-amber-300">
                      <WashingMachine className="h-4 w-4" />
                    </span>
                  </div>
                  <MetricDisplay value={stats.topServicios.reduce((s, x) => s + x.count, 0)} isCurrency={false} colorClass="text-amber-700 dark:text-amber-400 font-black" />
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-800/80 dark:text-amber-300/80 font-medium pt-2 border-t border-amber-200/60 dark:border-amber-900/50">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>Facturado: {formatRD(stats.totalMontoServicios)}</span>
                  </div>
                </Card>
              </div>

              {/* Barra de Distribución por Formato (Rediseño Visual Premium) */}
              <Card className="p-5 sm:p-6 bg-surface border border-border/80 rounded-3xl shadow-card space-y-4">
                {/* Header de la Comparativa */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-2xl bg-[#1B4B73]/10 text-[#1B4B73] dark:bg-sky-950/60 dark:text-sky-400 flex items-center justify-center border border-[#1B4B73]/20 shrink-0 shadow-2xs">
                      <Percent className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-sm sm:text-base text-foreground leading-tight">
                        Distribución de Carga: Piezas vs. Libras
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Proporción del volumen de trabajo procesado por unidad individual vs. por peso
                      </p>
                    </div>
                  </div>

                  {/* Badge de Modelo Predominante */}
                  {stats.totalPiezas + stats.totalLibras > 0 && (
                    <div className="self-start sm:self-auto">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#1B4B73]/10 text-[#1B4B73] dark:bg-sky-950/60 dark:text-sky-300 border border-[#1B4B73]/20 shadow-2xs">
                        <Sparkles className="h-3.5 w-3.5 text-[#F0B900]" />
                        Predominante: {stats.totalPiezas >= stats.totalLibras ? "Por Piezas" : "Por Libras"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Barra Visual Segmentada de Alto Impacto */}
                {(() => {
                  const totalCarga = stats.totalPiezas + stats.totalLibras;
                  const pctPiezas = totalCarga > 0 ? Math.round((stats.totalPiezas / totalCarga) * 100) : 50;
                  const pctLibras = totalCarga > 0 ? Math.round((stats.totalLibras / totalCarga) * 100) : 50;

                  return (
                    <div className="space-y-3">
                      {/* Barra Segmentada */}
                      <div className="relative h-6 sm:h-7 rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-1 flex overflow-hidden border border-slate-200/80 dark:border-slate-700/80 shadow-inner">
                        {/* Segmento Piezas (Azul Añil #1B4B73) */}
                        <div
                          className="h-full bg-gradient-to-r from-[#143755] to-[#1B4B73] rounded-xl flex items-center justify-center text-white text-[11px] font-black transition-all duration-700 shadow-xs relative overflow-hidden"
                          style={{ width: `${pctPiezas}%` }}
                          title={`Piezas: ${stats.totalPiezas} (${pctPiezas}%)`}
                        >
                          {pctPiezas >= 15 && (
                            <span className="truncate px-2 flex items-center gap-1.5 tracking-wider">
                              <Shirt className="h-3 w-3 shrink-0" />
                              {pctPiezas}% Piezas
                            </span>
                          )}
                        </div>

                        {/* Segmento Libras (Amarillo Jabón #F0B900) */}
                        <div
                          className="h-full bg-gradient-to-r from-[#D9A600] to-[#F0B900] rounded-xl flex items-center justify-center text-slate-900 text-[11px] font-black transition-all duration-700 shadow-xs relative overflow-hidden ml-1"
                          style={{ width: `${pctLibras}%` }}
                          title={`Libras: ${stats.totalLibras} lbs (${pctLibras}%)`}
                        >
                          {pctLibras >= 10 && (
                            <span className="truncate px-2 flex items-center gap-1.5 tracking-wider font-extrabold">
                              <Layers className="h-3 w-3 shrink-0" />
                              {pctLibras}% Libras
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Tarjetas de Detalle Inferiores (Leyendas Estructuradas) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {/* Detalle Piezas */}
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800">
                          <div className="flex items-center gap-2.5">
                            <div className="h-4 w-4 rounded-full bg-[#1B4B73] flex items-center justify-center shrink-0">
                              <div className="h-1.5 w-1.5 rounded-full bg-white" />
                            </div>
                            <div>
                              <span className="text-xs font-extrabold text-foreground block">
                                Procesamiento por Piezas
                              </span>
                              <span className="text-[11px] text-muted-foreground font-medium">
                                Prendas del catálogo individual
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-display font-black text-sm sm:text-base text-[#1B4B73] dark:text-sky-400 block">
                              {stats.totalPiezas} pz
                            </span>
                            <span className="text-[10.5px] font-bold text-muted-foreground">
                              {pctPiezas}% del total
                            </span>
                          </div>
                        </div>

                        {/* Detalle Libras */}
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800">
                          <div className="flex items-center gap-2.5">
                            <div className="h-4 w-4 rounded-full bg-[#F0B900] flex items-center justify-center shrink-0">
                              <div className="h-1.5 w-1.5 rounded-full bg-slate-900" />
                            </div>
                            <div>
                              <span className="text-xs font-extrabold text-foreground block">
                                Procesamiento por Libras
                              </span>
                              <span className="text-[11px] text-muted-foreground font-medium">
                                Lavado y secado pesado
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-display font-black text-sm sm:text-base text-amber-600 dark:text-amber-400 block">
                              {stats.totalLibras} lbs
                            </span>
                            <span className="text-[10.5px] font-bold text-muted-foreground">
                              {pctLibras}% del total
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </Card>

              {/* ========================================================= */}
              {/* SECCIÓN 1: PRENDAS DEL CATÁLOGO (GRID DE TARJETAS SUTILES) */}
              {/* ========================================================= */}
              <Card className="p-6 bg-surface border border-border/80 shadow-card rounded-3xl space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Shirt className="h-6 w-6" />
                    </span>
                    <div>
                      <h3 className="font-display font-bold text-lg sm:text-xl text-foreground">Prendas Más Solicitadas</h3>
                      <p className="text-xs text-muted-foreground">Demanda, volumen y facturación individual de cada prenda del catálogo</p>
                    </div>
                  </div>

                  {/* Selector de Vistas y Barra de Búsqueda */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* View Toggle Tabs (Tarjetas / Gráfico / Lista) */}
                    <div className="inline-flex items-center p-1 rounded-xl bg-slate-200/60 dark:bg-slate-800/80 border border-slate-300/50 dark:border-slate-700/60">
                      <button
                        type="button"
                        onClick={() => setPrendaView("grid")}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          prendaView === "grid"
                            ? "bg-[#1B4B73] text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                        title="Vista en Tarjetas"
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        <span>Tarjetas</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPrendaView("chart")}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          prendaView === "chart"
                            ? "bg-[#1B4B73] text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                        title="Vista en Gráfico"
                      >
                        <BarChart2 className="h-3.5 w-3.5" />
                        <span>Gráfico</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPrendaView("list")}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          prendaView === "list"
                            ? "bg-[#1B4B73] text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                        title="Vista en Lista / Tabla"
                      >
                        <List className="h-3.5 w-3.5" />
                        <span>Lista</span>
                      </button>
                    </div>

                    {/* Barra de Búsqueda de Prendas */}
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por prenda o categoría..."
                        value={prendaSearch}
                        onChange={(e) => setPrendaSearch(e.target.value)}
                        className="pl-9 pr-8 h-9.5 rounded-xl bg-background border-border/70 text-xs shadow-2xs focus-visible:ring-primary/20"
                      />
                      {prendaSearch && (
                        <button
                          type="button"
                          onClick={() => setPrendaSearch("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Filtro por Categorías de Prendas */}
                {prendaCategories.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-nowrap sm:flex-wrap">
                    <button
                      type="button"
                      onClick={() => setPrendaCategory("all")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        prendaCategory === "all"
                          ? "bg-[#1B4B73] text-white shadow-xs"
                          : "bg-muted/40 border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                      }`}
                    >
                      Todas ({stats.topPrendas.length})
                    </button>
                    {prendaCategories.map((cat) => {
                      const countInCat = stats.topPrendas.filter(p => p.categoria === cat).length;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setPrendaCategory(cat)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                            prendaCategory === cat
                              ? "bg-[#1B4B73] text-white shadow-xs"
                              : "bg-muted/40 border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                          }`}
                        >
                          {cat} ({countInCat})
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Visualización Según Vista Seleccionada (Tarjetas / Gráfico / Lista) */}
                {paginatedPrendas.length > 0 ? (
                  (() => {
                    const maxQ = Math.max(...stats.topPrendas.map(p => p.count), 1);

                    if (prendaView === "chart") {
                      /* ================= VISTA GRÁFICO (BARRAS HORIZONTALES) ================= */
                      return (
                        <div className="space-y-3">
                          {paginatedPrendas.map((p, idx) => {
                            const rank = (prendaPage - 1) * PRENDA_PAGE_SIZE + idx + 1;
                            const pct = Math.round((p.count / maxQ) * 100);
                            return (
                              <div
                                key={p.name}
                                className="p-3.5 rounded-2xl bg-surface border border-border/70 hover:border-primary/40 shadow-2xs transition-all space-y-2"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-muted font-black text-xs text-muted-foreground shrink-0">
                                      #{rank}
                                    </span>
                                    <div className="h-9 w-9 rounded-xl bg-muted/40 overflow-hidden border border-border/40 shrink-0 flex items-center justify-center">
                                      {p.imagen_url ? (
                                        <img src={p.imagen_url} alt={p.name} className="h-full w-full object-cover" />
                                      ) : (
                                        <Shirt className="h-4 w-4 text-indigo-500" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-foreground truncate">{p.name}</span>
                                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold">
                                          {p.categoria}
                                        </Badge>
                                      </div>
                                      <span className="text-[11px] text-muted-foreground">
                                        Catálogo: {formatRD(p.precio_base)}{p.es_libra ? '/lb' : ''}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4 shrink-0 text-right">
                                    <div>
                                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">Volumen</span>
                                      <span className="font-extrabold text-foreground text-xs sm:text-sm">
                                        {p.count} {p.es_libra ? 'lbs' : 'pz'}
                                      </span>
                                    </div>
                                    <div className="w-24 sm:w-28 text-right">
                                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">Facturado</span>
                                      <span className="font-black font-display text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                                        {formatRD(p.total)}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-bold text-muted-foreground shrink-0 w-10 text-right">
                                    {pct}%
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                    if (prendaView === "list") {
                      /* ================= VISTA LISTA / TABLA ================= */
                      return (
                        <div className="overflow-x-auto rounded-2xl border border-border/80 bg-surface shadow-2xs">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-muted/40 text-muted-foreground font-bold uppercase text-[10px] border-b border-border/60">
                              <tr>
                                <th className="px-4 py-3 w-12 text-center">#</th>
                                <th className="px-4 py-3">Prenda</th>
                                <th className="px-4 py-3">Categoría</th>
                                <th className="px-4 py-3 text-center">Formato</th>
                                <th className="px-4 py-3 text-right">Precio Base</th>
                                <th className="px-4 py-3 text-center">Volumen</th>
                                <th className="px-4 py-3 text-right">Facturación</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                              {paginatedPrendas.map((p, idx) => {
                                const rank = (prendaPage - 1) * PRENDA_PAGE_SIZE + idx + 1;
                                return (
                                  <tr key={p.name} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-3 text-center font-black text-muted-foreground">
                                      #{rank}
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2.5">
                                        <div className="h-8 w-8 rounded-lg bg-muted/40 overflow-hidden border border-border/40 shrink-0 flex items-center justify-center">
                                          {p.imagen_url ? (
                                            <img src={p.imagen_url} alt={p.name} className="h-full w-full object-cover" />
                                          ) : (
                                            <Shirt className="h-4 w-4 text-indigo-500" />
                                          )}
                                        </div>
                                        <span className="font-bold text-foreground">{p.name}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <Badge variant="outline" className="text-[10.5px] py-0.5 px-2 font-bold">
                                        {p.categoria}
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <span className="text-[11px] font-semibold text-muted-foreground">
                                        {p.es_libra ? 'Por Libra' : 'Por Pieza'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-foreground">
                                      {formatRD(p.precio_base)}{p.es_libra ? '/lb' : ''}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <span className="font-extrabold text-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                        {p.count} {p.es_libra ? 'lbs' : 'pz'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-black font-display text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                                      {formatRD(p.total)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    }

                    /* ================= VISTA GRID (TARJETAS) ================= */
                    return (
                      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {paginatedPrendas.map((p) => {
                          const pct = Math.round((p.count / maxQ) * 100);
                          return (
                            <div
                              key={p.name}
                              className="group bg-surface rounded-2xl border border-border/80 hover:border-primary/50 p-4 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-3.5 relative overflow-hidden"
                            >
                              {/* Contenedor Visual (Foto de /catalogo o Icono Pastel Sustituto) */}
                              <div className="relative h-32 w-full rounded-xl overflow-hidden bg-muted/30 border border-border/40 shrink-0">
                                {p.imagen_url ? (
                                  <img
                                    src={p.imagen_url}
                                    alt={p.name}
                                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <div className="h-full w-full bg-gradient-to-br from-indigo-50/80 via-purple-50/40 to-sky-50/80 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-sky-950/40 flex flex-col items-center justify-center relative">
                                    <div className="p-3.5 rounded-2xl bg-surface/90 dark:bg-slate-900/90 shadow-2xs text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-200">
                                      <Shirt className="h-7 w-7" />
                                    </div>
                                  </div>
                                )}

                                {/* Badge Categoría Flotante */}
                                <div className="absolute top-2 left-2">
                                  <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white text-[10px] font-extrabold uppercase tracking-wider shadow-xs">
                                    {p.categoria}
                                  </span>
                                </div>

                                {/* Badge Formato */}
                                {p.es_libra && (
                                  <div className="absolute top-2 right-2">
                                    <span className="px-2 py-0.5 rounded-md bg-sky-600 text-white text-[10px] font-extrabold tracking-wider shadow-xs">
                                      Por Libra
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Información de la Prenda */}
                              <div className="space-y-1 flex-1">
                                <span 
                                  className="font-bold text-sm text-foreground truncate block group-hover:text-primary transition-colors"
                                  title={p.name}
                                >
                                  {p.name}
                                </span>
                                {p.precio_base > 0 && (
                                  <span className="text-[11px] text-muted-foreground block font-medium">
                                    Precio Catálogo: <strong className="text-foreground">{formatRD(p.precio_base)}</strong>{p.es_libra ? '/lb' : ''}
                                  </span>
                                )}
                              </div>

                              {/* Volumen y Facturación */}
                              <div className="pt-2.5 border-t border-border/50 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <div>
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Volumen</span>
                                    <span className="font-extrabold text-foreground text-xs">
                                      {p.count} {p.es_libra ? 'libras' : 'piezas'}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Facturado</span>
                                    <span className="font-black font-display text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                                      {formatRD(p.total)}
                                    </span>
                                  </div>
                                </div>

                                {/* Barra de Popularidad */}
                                <div className="space-y-1">
                                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div 
                                      className="h-full rounded-full bg-indigo-500 transition-all duration-500" 
                                      style={{ width: `${pct}%` }} 
                                    />
                                  </div>
                                  <span className="text-[9px] text-muted-foreground block text-right font-medium">
                                    {pct}% del top
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                        <Shirt className="h-6 w-6" />
                      </div>
                      <span className="font-bold text-sm text-foreground">
                        {prendaSearch ? "No se encontraron prendas con ese filtro" : "Sin prendas registradas en este período"}
                      </span>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {prendaSearch ? "Intenta buscar con otro término o selecciona otra categoría." : "Las órdenes de este período no contienen prendas procesadas."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Footer de Paginación de Prendas (8 por página) */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/70">
                  <span className="text-xs text-muted-foreground font-medium">
                    Mostrando <span className="font-bold text-foreground">{filteredPrendas.length === 0 ? 0 : (prendaPage - 1) * PRENDA_PAGE_SIZE + 1}</span> a <span className="font-bold text-foreground">{Math.min(prendaPage * PRENDA_PAGE_SIZE, filteredPrendas.length)}</span> de <span className="font-bold text-foreground">{filteredPrendas.length}</span> prendas
                  </span>

                  {totalPrendaPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPrendaPage(p => Math.max(1, p - 1))}
                        disabled={prendaPage === 1}
                        className="h-8 px-2.5 rounded-xl text-xs gap-1 border-border/70 hover:bg-background cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span>Anterior</span>
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPrendaPages }, (_, i) => i + 1).map((pageNum) => (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setPrendaPage(pageNum)}
                            className={`h-8 w-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              prendaPage === pageNum
                                ? "bg-primary text-white shadow-xs"
                                : "bg-surface border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                            }`}
                          >
                            {pageNum}
                          </button>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPrendaPage(p => Math.min(totalPrendaPages, p + 1))}
                        disabled={prendaPage === totalPrendaPages}
                        className="h-8 px-2.5 rounded-xl text-xs gap-1 border-border/70 hover:bg-background cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <span>Siguiente</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>

              {/* ========================================================= */}
              {/* SECCIÓN 2: TOP SERVICIOS DE LAVANDERÍA (GRID DE TARJETAS) */}
              {/* ========================================================= */}
              <Card className="p-6 bg-surface border border-border/80 shadow-card rounded-3xl space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 rounded-2xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 shrink-0">
                      <WashingMachine className="h-6 w-6" />
                    </span>
                    <div>
                      <h3 className="font-display font-bold text-lg sm:text-xl text-foreground">Top Servicios de Lavandería</h3>
                      <p className="text-xs text-muted-foreground">Demanda acumulada y recaudación generada por cada tipo de servicio</p>
                    </div>
                  </div>

                  {/* Búsqueda de Servicios */}
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar servicios..."
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      className="pl-9 pr-8 h-10 rounded-xl bg-background border-border/70 text-xs shadow-2xs focus-visible:ring-primary/20"
                    />
                    {serviceSearch && (
                      <button
                        type="button"
                        onClick={() => setServiceSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Grid de Tarjetas de Servicios */}
                {filteredTopServicios.length > 0 ? (
                  (() => {
                    const maxCount = Math.max(...stats.topServicios.map(s => s.count), 1);
                    return (
                      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {filteredTopServicios.map((srv) => {
                          const pct = Math.round((srv.count / maxCount) * 100);
                          const ticketPromedioSrv = srv.count > 0 ? srv.total / srv.count : 0;
                          return (
                            <div
                              key={srv.name}
                              className="group bg-surface rounded-2xl border border-border/80 hover:border-blue-500/50 p-4 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-3.5 relative overflow-hidden"
                            >
                              <div className="flex items-start gap-3">
                                {/* Thumbnail del Servicio o Icono Pastel */}
                                {srv.imagen_url ? (
                                  <img
                                    src={srv.imagen_url}
                                    alt={srv.name}
                                    className="h-12 w-12 rounded-xl object-cover border border-border/60 shadow-2xs shrink-0 group-hover:scale-105 transition-transform"
                                  />
                                ) : (
                                  <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200/60 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                                    <WashingMachine className="h-6 w-6" />
                                  </div>
                                )}

                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <span className="font-bold text-sm text-foreground truncate block group-hover:text-primary transition-colors" title={srv.name}>
                                    {srv.name}
                                  </span>
                                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                                    {srv.descripcion}
                                  </p>
                                </div>
                              </div>

                              {/* Badges de Frecuencia y Total */}
                              <div className="pt-2 border-t border-border/50 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-extrabold text-[11px] border border-blue-200/60 dark:border-blue-900/50">
                                    {srv.count} órdenes
                                  </span>
                                  <span className="font-black font-display text-primary text-sm sm:text-base">
                                    {formatRD(srv.total)}
                                  </span>
                                </div>

                                {/* Barra de Proporción */}
                                <div className="space-y-1">
                                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div 
                                      className="h-full rounded-full bg-blue-600 transition-all duration-500" 
                                      style={{ width: `${pct}%` }} 
                                    />
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                                    <span>{pct}% de frecuencia</span>
                                    <span>Promedio: <strong>{formatRD(ticketPromedioSrv)}</strong></span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                        <WashingMachine className="h-6 w-6" />
                      </div>
                      <span className="font-bold text-sm text-foreground">
                        {serviceSearch ? "No se encontraron servicios con ese término" : "Sin servicios registrados en este período"}
                      </span>
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* ============================================================ */}
            {/* CONTENIDO 4: EQUIPO & COLABORADORES                          */}
            {/* ============================================================ */}
            <TabsContent value="equipo" className="space-y-6">
              {/* KPIs de Rendimiento del Equipo en Fondos Pastel */}
              {(() => {
                const emps = inspectData?.empleados || [];
                const empsStats = emps.map(emp => {
                  const empOrds = filteredData.ordenes.filter(o => o.empleado_id === emp.id);
                  const total = empOrds.reduce((s, o) => s + (o.total || 0), 0);
                  const avg = empOrds.length > 0 ? total / empOrds.length : 0;
                  return { emp, empOrds, total, avg, count: empOrds.length };
                }).sort((a, b) => b.total - a.total);

                const totalTeamOrders = empsStats.reduce((s, x) => s + x.count, 0);
                const totalTeamRevenue = empsStats.reduce((s, x) => s + x.total, 0);
                const avgTeamTicket = totalTeamOrders > 0 ? totalTeamRevenue / totalTeamOrders : 0;

                const filteredEmps = empsStats.filter(x => {
                  const q = teamSearch.toLowerCase().trim();
                  if (!q) return true;
                  const fullName = `${x.emp.nombre} ${x.emp.apellido || ""}`.toLowerCase();
                  return fullName.includes(q) || (x.emp.email && x.emp.email.toLowerCase().includes(q)) || (x.emp.rol && x.emp.rol.toLowerCase().includes(q));
                });

                return (
                  <>
                    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                      {/* 1. Colaboradores: Pastel Índigo */}
                      <Card className="p-4 sm:p-5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all min-w-0 overflow-hidden">
                        <div className="flex items-center justify-between text-[11px] font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
                          <span>Equipo de Trabajo</span>
                          <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/70 text-indigo-600 dark:text-indigo-300">
                            <Users className="h-4 w-4" />
                          </span>
                        </div>
                        <MetricDisplay value={emps.length} isCurrency={false} colorClass="text-indigo-700 dark:text-indigo-400 font-black" />
                        <div className="flex items-center gap-1.5 text-[11px] text-indigo-800/80 dark:text-indigo-300/80 font-medium pt-2 border-t border-indigo-200/60 dark:border-indigo-900/50">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                          <span>Colaboradores registrados</span>
                        </div>
                      </Card>

                      {/* 2. Órdenes Gestionadas: Pastel Azul Cielo */}
                      <Card className="p-4 sm:p-5 bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-sky-300 dark:hover:border-sky-800 transition-all min-w-0 overflow-hidden">
                        <div className="flex items-center justify-between text-[11px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider">
                          <span>Órdenes Atendidas</span>
                          <span className="p-2 rounded-xl bg-sky-100 dark:bg-sky-900/70 text-sky-600 dark:text-sky-300">
                            <Briefcase className="h-4 w-4" />
                          </span>
                        </div>
                        <MetricDisplay value={totalTeamOrders} isCurrency={false} colorClass="text-sky-700 dark:text-sky-400 font-black" />
                        <div className="flex items-center gap-1.5 text-[11px] text-sky-800/80 dark:text-sky-300/80 font-medium pt-2 border-t border-sky-200/60 dark:border-sky-900/50">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" />
                          <span>{filteredData.ordenes.length > 0 ? Math.round((totalTeamOrders / filteredData.ordenes.length) * 100) : 0}% de órdenes del período</span>
                        </div>
                      </Card>

                      {/* 3. Facturación del Personal: Pastel Esmeralda */}
                      <Card className="p-4 sm:p-5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all min-w-0 overflow-hidden">
                        <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                          <span>Ventas por Colaborador</span>
                          <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/70 text-emerald-600 dark:text-emerald-300">
                            <TrendingUp className="h-4 w-4" />
                          </span>
                        </div>
                        <MetricDisplay value={totalTeamRevenue} colorClass="text-emerald-700 dark:text-emerald-400 font-black" />
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-800/80 dark:text-emerald-300/80 font-medium pt-2 border-t border-emerald-200/60 dark:border-emerald-900/50">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span>Ingresos atribuidos al equipo</span>
                        </div>
                      </Card>

                      {/* 4. Ticket Promedio del Equipo: Pastel Púrpura */}
                      <Card className="p-4 sm:p-5 bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-purple-300 dark:hover:border-purple-800 transition-all min-w-0 overflow-hidden">
                        <div className="flex items-center justify-between text-[11px] font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider">
                          <span>Ticket Promedio</span>
                          <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/70 text-purple-600 dark:text-purple-300">
                            <Award className="h-4 w-4" />
                          </span>
                        </div>
                        <MetricDisplay value={avgTeamTicket} colorClass="text-purple-700 dark:text-purple-400 font-black" />
                        <div className="flex items-center gap-1.5 text-[11px] text-purple-800/80 dark:text-purple-300/80 font-medium pt-2 border-t border-purple-200/60 dark:border-purple-900/50">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0" />
                          <span>Promedio generado por orden</span>
                        </div>
                      </Card>
                    </div>

                    {/* Contenedor Principal de Tarjetas de Rendimiento */}
                    <Card className="p-6 bg-surface border border-border/80 shadow-card rounded-3xl space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="p-2.5 rounded-2xl bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 shrink-0">
                            <Users className="h-6 w-6" />
                          </span>
                          <div>
                            <h3 className="font-display font-bold text-lg sm:text-xl text-foreground">Rendimiento por Colaborador</h3>
                            <p className="text-xs text-muted-foreground">Productividad, volumen de órdenes y facturación procesada por cada miembro</p>
                          </div>
                        </div>

                        {/* Barra de Búsqueda de Colaboradores */}
                        <div className="relative w-full md:w-72">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar colaborador o rol..."
                            value={teamSearch}
                            onChange={(e) => setTeamSearch(e.target.value)}
                            className="pl-9 pr-8 h-10 rounded-xl bg-background border-border/70 text-xs shadow-2xs focus-visible:ring-primary/20"
                          />
                          {teamSearch && (
                            <button
                              type="button"
                              onClick={() => setTeamSearch("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Cuadrícula de Tarjetas de Empleados */}
                      {filteredEmps.length > 0 ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {filteredEmps.map(({ emp, total, avg, count }, idx) => {
                            const maxEmpRevenue = empsStats[0]?.total || 1;
                            const pctContr = Math.round((total / (totalTeamRevenue || 1)) * 100);
                            const roleNormalized = (emp.rol || "").toUpperCase();
                            
                            const roleBadgeStyle = roleNormalized.includes("ADMIN")
                              ? "bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800"
                              : roleNormalized.includes("CAJER")
                                ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800"
                                : roleNormalized.includes("REPART") || roleNormalized.includes("DELIV")
                                  ? "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800"
                                  : roleNormalized.includes("LAVAN") || roleNormalized.includes("OPER")
                                    ? "bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";

                            return (
                              <div
                                key={emp.id}
                                className="group relative p-5 rounded-2xl bg-surface border border-border/80 hover:border-primary/50 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 overflow-hidden"
                              >
                                {/* Cabecera de la Tarjeta con Avatar y Rol */}
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div 
                                      className="h-12 w-12 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-xs shrink-0 group-hover:scale-105 transition-transform"
                                      style={{ backgroundColor: selectedInspectTenant?.color_primario || '#1B4B73' }}
                                    >
                                      {emp.nombre.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 space-y-0.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-sm text-foreground truncate block group-hover:text-primary transition-colors" title={`${emp.nombre} ${emp.apellido || ""}`}>
                                          {emp.nombre} {emp.apellido || ""}
                                        </span>
                                      </div>
                                      <span className="text-[11px] text-muted-foreground truncate block flex items-center gap-1">
                                        <Mail className="h-3 w-3 shrink-0" />
                                        <span className="truncate">{emp.email || "Sin email registrado"}</span>
                                      </span>
                                    </div>
                                  </div>

                                  <span className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wider border shadow-2xs shrink-0 ${roleBadgeStyle}`}>
                                    {emp.rol || "COLABORADOR"}
                                  </span>
                                </div>

                                {/* Bloques de Métricas de Alto Impacto */}
                                <div className="grid grid-cols-2 gap-2.5 pt-1">
                                  {/* Órdenes Atendidas */}
                                  <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 space-y-1">
                                    <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase block tracking-wider">
                                      Órdenes
                                    </span>
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-base font-black text-foreground">
                                        {count}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground font-semibold">atendidas</span>
                                    </div>
                                  </div>

                                  {/* Total Facturado */}
                                  <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 space-y-1 text-right">
                                    <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase block tracking-wider">
                                      Facturado
                                    </span>
                                    <span className="text-xs sm:text-sm font-black font-display text-emerald-700 dark:text-emerald-400 block truncate">
                                      {formatRD(total)}
                                    </span>
                                  </div>
                                </div>

                                {/* Barra de Rendimiento y Ticket Medio */}
                                <div className="pt-2 border-t border-border/50 space-y-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-[11px] text-muted-foreground font-medium">
                                      Ticket promedio: <strong className="text-foreground">{formatRD(avg)}</strong>
                                    </span>
                                    <span className="text-[11px] font-extrabold text-primary">
                                      {pctContr}% de las ventas
                                    </span>
                                  </div>

                                  {/* Barra de Progreso de Contribución */}
                                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div 
                                      className="h-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-500" 
                                      style={{ width: `${maxEmpRevenue > 0 ? (total / maxEmpRevenue) * 100 : 0}%` }} 
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-12 text-center text-muted-foreground">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600">
                              <Users className="h-6 w-6" />
                            </div>
                            <span className="font-bold text-sm text-foreground">
                              {teamSearch ? "No se encontraron colaboradores con ese término" : "Sin colaboradores registrados en esta sucursal"}
                            </span>
                          </div>
                        </div>
                      )}
                    </Card>
                  </>
                );
              })()}
            </TabsContent>

            {/* ============================================================ */}
            {/* CONTENIDO 5: LOGÍSTICA & DELIVERY (MÓDULO CONDICIONAL)       */}
            {/* ============================================================ */}
            {activeModules.logistica && (
              <TabsContent value="logistica" className="space-y-6">
                {/* 4 KPIs Principales en Fondos Pastel */}
                <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                  {/* 1. Pedidos a Domicilio: Pastel Ámbar */}
                  <Card className="p-4 sm:p-5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-amber-300 dark:hover:border-amber-800 transition-all min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                      <span>Pedidos a Domicilio</span>
                      <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/70 text-amber-600 dark:text-amber-300">
                        <Truck className="h-4 w-4" />
                      </span>
                    </div>
                    <MetricDisplay value={stats.ordsDomicilio} isCurrency={false} colorClass="text-amber-700 dark:text-amber-400 font-black" />
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-800/80 dark:text-amber-300/80 font-medium pt-2 border-t border-amber-200/60 dark:border-amber-900/50">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span>{filteredData.ordenes.length > 0 ? Math.round((stats.ordsDomicilio / filteredData.ordenes.length) * 100) : 0}% del volumen total</span>
                    </div>
                  </Card>

                  {/* 2. Entregados con Éxito: Pastel Esmeralda */}
                  <Card className="p-4 sm:p-5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                      <span>Entregados con Éxito</span>
                      <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/70 text-emerald-600 dark:text-emerald-300">
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                    </div>
                    <MetricDisplay value={stats.deliveryEntregados} isCurrency={false} colorClass="text-emerald-700 dark:text-emerald-400 font-black" />
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-800/80 dark:text-emerald-300/80 font-medium pt-2 border-t border-emerald-200/60 dark:border-emerald-900/50">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>{stats.ordsDomicilio > 0 ? Math.round((stats.deliveryEntregados / stats.ordsDomicilio) * 100) : 0}% tasa de éxito</span>
                    </div>
                  </Card>

                  {/* 3. En Ruta / Pendientes: Pastel Azul Cielo */}
                  <Card className="p-4 sm:p-5 bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-sky-300 dark:hover:border-sky-800 transition-all min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between text-[11px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider">
                      <span>En Ruta / Pendientes</span>
                      <span className="p-2 rounded-xl bg-sky-100 dark:bg-sky-900/70 text-sky-600 dark:text-sky-300">
                        <Clock className="h-4 w-4" />
                      </span>
                    </div>
                    <MetricDisplay value={stats.deliveryPendientes} isCurrency={false} colorClass="text-sky-700 dark:text-sky-400 font-black" />
                    <div className="flex items-center gap-1.5 text-[11px] text-sky-800/80 dark:text-sky-300/80 font-medium pt-2 border-t border-sky-200/60 dark:border-sky-900/50">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" />
                      <span>{stats.deliveryEnRuta > 0 ? `${stats.deliveryEnRuta} en camino` : "Órdenes por despachar"}</span>
                    </div>
                  </Card>

                  {/* 4. Ingresos por Envío: Pastel Púrpura */}
                  <Card className="p-4 sm:p-5 bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-purple-300 dark:hover:border-purple-800 transition-all min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between text-[11px] font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider">
                      <span>Ingresos por Envío</span>
                      <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/70 text-purple-600 dark:text-purple-300">
                        <Coins className="h-4 w-4" />
                      </span>
                    </div>
                    <MetricDisplay value={stats.deliveryIngresosEnvio} colorClass="text-purple-700 dark:text-purple-400 font-black" />
                    <div className="flex items-center gap-1.5 text-[11px] text-purple-800/80 dark:text-purple-300/80 font-medium pt-2 border-t border-purple-200/60 dark:border-purple-900/50">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0" />
                      <span>Facturado: {formatRD(stats.deliveryTotalFacturado)}</span>
                    </div>
                  </Card>
                </div>

                {/* Módulo Principal: Sectores y Rutas Frecuentes */}
                <Card className="p-6 bg-surface border border-border/80 shadow-card rounded-3xl space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 shrink-0">
                        <MapPin className="h-6 w-6" />
                      </span>
                      <div>
                        <h3 className="font-display font-bold text-lg sm:text-xl text-foreground">Sectores y Rutas Frecuentes</h3>
                        <p className="text-xs text-muted-foreground">Demanda geográfica, volumen de entregas, facturación y tarifas cobradas por zona</p>
                      </div>
                    </div>

                    {/* Barra de Búsqueda de Sectores */}
                    <div className="relative w-full md:w-72">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar sector o ruta..."
                        value={logisticaSearch}
                        onChange={(e) => setLogisticaSearch(e.target.value)}
                        className="pl-9 pr-8 h-10 rounded-xl bg-background border-border/70 text-xs shadow-2xs focus-visible:ring-primary/20"
                      />
                      {logisticaSearch && (
                        <button
                          type="button"
                          onClick={() => setLogisticaSearch("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Cuadrícula de Tarjetas de Sectores */}
                  {(() => {
                    const filteredSectores = (stats.topSectores || []).filter(sec => {
                      const q = logisticaSearch.toLowerCase().trim();
                      if (!q) return true;
                      return sec.sector.toLowerCase().includes(q);
                    });

                    const maxSectorDeliveries = Math.max(...(stats.topSectores || []).map(s => s.count), 1);

                    return filteredSectores.length > 0 ? (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredSectores.map((sec, idx) => {
                          const pct = Math.round((sec.count / maxSectorDeliveries) * 100);
                          const pctGlobal = Math.round((sec.count / (stats.ordsDomicilio || 1)) * 100);

                          return (
                            <div
                              key={sec.sector}
                              className="group relative p-5 rounded-2xl bg-surface border border-border/80 hover:border-amber-500/50 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 overflow-hidden"
                            >
                              {/* Cabecera del Sector con Ranking y Conteo */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="h-7 w-7 rounded-xl bg-amber-600 text-white font-display font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                    #{idx + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <span className="font-bold text-sm text-foreground truncate block group-hover:text-amber-600 transition-colors" title={sec.sector}>
                                      {sec.sector}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-medium block">
                                      {pctGlobal}% de las entregas a domicilio
                                    </span>
                                  </div>
                                </div>

                                <span className="px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800 shadow-2xs shrink-0">
                                  {sec.count} {sec.count === 1 ? 'entrega' : 'entregas'}
                                </span>
                              </div>

                              {/* Bloques de Métricas del Sector */}
                              <div className="grid grid-cols-2 gap-2.5 pt-1">
                                {/* Estado de Entregas */}
                                <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-1">
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase block tracking-wider">
                                    Estado
                                  </span>
                                  <div className="flex flex-col gap-0.5 text-[11px] font-bold">
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                      {sec.entregadas} completadas
                                    </span>
                                    {sec.pendientes > 0 && (
                                      <span className="text-sky-600 dark:text-sky-400">
                                        {sec.pendientes} pendientes
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Facturación & Tarifas */}
                                <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 space-y-1 text-right">
                                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase block tracking-wider">
                                    Facturado
                                  </span>
                                  <span className="text-xs sm:text-sm font-black font-display text-emerald-700 dark:text-emerald-400 block truncate">
                                    {formatRD(sec.totalFacturado)}
                                  </span>
                                  {sec.totalTarifas > 0 && (
                                    <span className="text-[10px] text-muted-foreground font-semibold block truncate">
                                      Tarifas: {formatRD(sec.totalTarifas)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Barra de Proporción Geográfica */}
                              <div className="pt-2 border-t border-border/50 space-y-2">
                                <div className="flex items-center justify-between text-xs font-semibold">
                                  <span className="text-[10px] text-muted-foreground">Demanda en la ruta</span>
                                  <span className="text-[10px] font-black text-amber-700 dark:text-amber-300">{pct}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div 
                                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500" 
                                    style={{ width: `${pct}%` }} 
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600">
                            <Truck className="h-6 w-6" />
                          </div>
                          <span className="font-bold text-sm text-foreground">
                            {logisticaSearch ? "No se encontraron sectores con ese término" : "No hay entregas a domicilio registradas en el período"}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </Card>
              </TabsContent>
            )}

            {/* ============================================================ */}
            {/* CONTENIDO 6: FACTURACIÓN FISCAL e-CF (MÓDULO CONDICIONAL)   */}
            {/* ============================================================ */}
            {activeModules.facturacion_fiscal && (
              <TabsContent value="fiscal" className="space-y-6">
                <div className="grid gap-3.5 sm:grid-cols-3">
                  {/* 1. Comprobantes Fiscales: Pastel Azul Cielo */}
                  <Card className="p-4 sm:p-5 bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-sky-300 dark:hover:border-sky-800 transition-all min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between text-[11px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider">
                      <span>Comprobantes Fiscales</span>
                      <span className="p-2 rounded-xl bg-sky-100 dark:bg-sky-900/70 text-sky-600 dark:text-sky-300">
                        <FileCheck2 className="h-4 w-4" />
                      </span>
                    </div>
                    <MetricDisplay value={stats.ordsFiscalesCount} isCurrency={false} colorClass="text-sky-700 dark:text-sky-400 font-black" />
                    <div className="flex items-center gap-1.5 text-[11px] text-sky-800/80 dark:text-sky-300/80 font-medium pt-2 border-t border-sky-200/60 dark:border-sky-900/50">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" />
                      <span>Comprobantes NCF / e-CF emitidos</span>
                    </div>
                  </Card>

                  {/* 2. Ventas con Comprobante: Pastel Esmeralda */}
                  <Card className="p-4 sm:p-5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                      <span>Ventas con Comprobante</span>
                      <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/70 text-emerald-600 dark:text-emerald-300">
                        <TrendingUp className="h-4 w-4" />
                      </span>
                    </div>
                    <MetricDisplay value={stats.totalVentasFiscales} colorClass="text-emerald-700 dark:text-emerald-400 font-black" />
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-800/80 dark:text-emerald-300/80 font-medium pt-2 border-t border-emerald-200/60 dark:border-emerald-900/50">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>Facturación declarada DGII</span>
                    </div>
                  </Card>

                  {/* 3. ITBIS en Comprobantes: Pastel Índigo */}
                  <Card className="p-4 sm:p-5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between text-[11px] font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
                      <span>ITBIS en Comprobantes</span>
                      <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/70 text-indigo-600 dark:text-indigo-300">
                        <Percent className="h-4 w-4" />
                      </span>
                    </div>
                    <MetricDisplay value={stats.totalItbisFiscal} colorClass="text-indigo-700 dark:text-indigo-400 font-black" />
                    <div className="flex items-center gap-1.5 text-[11px] text-indigo-800/80 dark:text-indigo-300/80 font-medium pt-2 border-t border-indigo-200/60 dark:border-indigo-900/50">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span>Impuesto reportado</span>
                    </div>
                  </Card>
                </div>

                <Card className="p-6 bg-surface border border-border/80 shadow-card rounded-3xl space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="p-2.5 rounded-2xl bg-sky-100 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 shrink-0">
                        <FileCheck2 className="h-6 w-6" />
                      </span>
                      <div>
                        <h3 className="font-display font-bold text-lg sm:text-xl text-foreground">
                          Desglose por Tipo de Comprobante (DGII)
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Volumen emitido, facturación declarada e ITBIS clasificados según normativa oficial de la DGII
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-auto">
                      <span className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200/70 dark:border-sky-900/60 text-sky-800 dark:text-sky-300 font-extrabold text-xs shadow-2xs">
                        {stats.ordsFiscalesCount} comprobantes emitidos
                      </span>
                    </div>
                  </div>

                  {/* Cuadrícula de Tarjetas de Comprobantes DGII */}
                  {stats.listaComprobantesFiscales && stats.listaComprobantesFiscales.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {stats.listaComprobantesFiscales.map((comp) => {
                        const pct = stats.ordsFiscalesCount > 0 ? Math.round((comp.count / stats.ordsFiscalesCount) * 100) : 0;
                        return (
                          <div
                            key={comp.codigo}
                            className="group relative p-5 rounded-2xl bg-surface border border-border/80 hover:border-sky-500/50 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 overflow-hidden"
                          >
                            {/* Cabecera: Código, Nombre Oficial, Badge e-CF/NCF y Conteo */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <span className={`px-2.5 py-1 rounded-xl text-white font-display font-black text-xs shadow-2xs shrink-0 ${comp.badgeBg}`}>
                                  {comp.codigo}
                                </span>
                                <div className="min-w-0 space-y-0.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-display font-bold text-sm text-foreground truncate block group-hover:text-primary transition-colors">
                                      {comp.nombreOficial}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border shadow-2xs ${
                                      comp.esElectronico 
                                        ? "bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                    }`}>
                                      {comp.esElectronico ? "e-CF Electrónico" : "NCF Tradicional"}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                                    {comp.subtitulo}
                                  </p>
                                </div>
                              </div>

                              <span className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/70 border border-sky-200/80 dark:border-sky-900/60 text-sky-800 dark:text-sky-300 font-black text-xs shadow-2xs shrink-0">
                                {comp.count} {comp.count === 1 ? 'emitido' : 'emitidos'}
                              </span>
                            </div>

                            {/* Bloques de Facturación & ITBIS */}
                            <div className="grid grid-cols-2 gap-2.5 pt-1">
                              {/* Ventas Declaradas */}
                              <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 space-y-1">
                                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase block tracking-wider">
                                  Ventas Declaradas
                                </span>
                                <span className="text-xs sm:text-sm font-black font-display text-emerald-700 dark:text-emerald-400 block truncate">
                                  {formatRD(comp.totalVentas)}
                                </span>
                              </div>

                              {/* ITBIS Reportado */}
                              <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40 space-y-1 text-right">
                                <span className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 uppercase block tracking-wider">
                                  ITBIS Reportado
                                </span>
                                <span className="text-xs sm:text-sm font-black font-display text-indigo-700 dark:text-indigo-400 block truncate">
                                  {formatRD(comp.totalItbis)}
                                </span>
                              </div>
                            </div>

                            {/* Barra de Proporción Fiscal */}
                            <div className="pt-2 border-t border-border/50 space-y-2">
                              <div className="flex items-center justify-between text-xs font-semibold">
                                <span className="text-[10px] text-muted-foreground">Participación fiscal</span>
                                <span className="text-[10px] font-black text-primary">{pct}% de comprobantes</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div 
                                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 transition-all duration-500" 
                                  style={{ width: `${pct}%` }} 
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600">
                          <FileCheck2 className="h-6 w-6" />
                        </div>
                        <span className="font-bold text-sm text-foreground">
                          No se han emitido comprobantes fiscales NCF / e-CF en este período
                        </span>
                      </div>
                    </div>
                  )}
                </Card>
              </TabsContent>
            )}

            {/* ============================================================ */}
            {/* CONTENIDO 7: MENSAJERÍA WHATSAPP (MÓDULO CONDICIONAL)        */}
            {/* ============================================================ */}
            {activeModules.whatsapp && (
              <TabsContent value="whatsapp" className="space-y-6">
                <div className="grid gap-3.5 sm:grid-cols-3">
                  {/* 1. Mensajes Enviados: Pastel Verde Azulado */}
                  <Card className="p-4 sm:p-5 bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-teal-300 dark:hover:border-teal-800 transition-all min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between text-[11px] font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider">
                      <span>Mensajes Enviados</span>
                      <span className="p-2 rounded-xl bg-teal-100 dark:bg-teal-900/70 text-teal-600 dark:text-teal-300">
                        <Send className="h-4 w-4" />
                      </span>
                    </div>
                    <MetricDisplay value={stats.waSentMonth.toLocaleString()} colorClass="text-teal-700 dark:text-teal-400 font-black" />
                    <div className="flex items-center gap-1.5 text-[11px] text-teal-800/80 dark:text-teal-300/80 font-medium pt-2 border-t border-teal-200/60 dark:border-teal-900/50">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-500 shrink-0" />
                      <span>Consumo este mes</span>
                    </div>
                  </Card>

                  {/* 2. Límite del Plan: Pastel Índigo */}
                  <Card className="p-4 sm:p-5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between text-[11px] font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
                      <span>Límite del Plan</span>
                      <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/70 text-indigo-600 dark:text-indigo-300">
                        <MessageCircle className="h-4 w-4" />
                      </span>
                    </div>
                    <MetricDisplay value={stats.waLimit ? stats.waLimit.toLocaleString() : "Ilimitados"} colorClass="text-indigo-700 dark:text-indigo-400 font-black" />
                    <div className="flex items-center gap-1.5 text-[11px] text-indigo-800/80 dark:text-indigo-300/80 font-medium pt-2 border-t border-indigo-200/60 dark:border-indigo-900/50">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span>Capacidad mensual asignada</span>
                    </div>
                  </Card>

                  {/* 3. Uso de Cuota: Pastel Ámbar */}
                  <Card className="p-4 sm:p-5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-amber-300 dark:hover:border-amber-800 transition-all min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                      <span>Uso de Cuota</span>
                      <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/70 text-amber-600 dark:text-amber-300">
                        <Percent className="h-4 w-4" />
                      </span>
                    </div>
                    <MetricDisplay value={stats.waLimit ? `${stats.waPct}%` : "0%"} colorClass="text-amber-700 dark:text-amber-400 font-black" />
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-800/80 dark:text-amber-300/80 font-medium pt-2 border-t border-amber-200/60 dark:border-amber-900/50">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span>{stats.waLimit ? `${stats.waLimit - stats.waSentMonth} disponibles` : "Sin restricciones"}</span>
                    </div>
                  </Card>
                </div>

                <Card className="p-6 bg-surface border border-border/80 shadow-card rounded-3xl space-y-6">
                  {/* Cabecera del Módulo con Estado de Conexión */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="p-2.5 rounded-2xl bg-teal-100 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 shrink-0">
                        <MessageCircle className="h-6 w-6" />
                      </span>
                      <div>
                        <h3 className="font-display font-bold text-lg sm:text-xl text-foreground">
                          Automatizaciones de WhatsApp
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Flujos automáticos de mensajería directa y notificaciones al cliente en cada etapa de la orden
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-auto">
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs shadow-2xs">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        <span>Canal Activo y Operativo</span>
                      </span>
                    </div>
                  </div>

                  {/* Cuadrícula de Flujos de Automatización */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {/* 1. Ticket Digital & Recepción */}
                    <div className="group relative p-5 rounded-2xl bg-surface border border-border/80 hover:border-teal-500/50 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 overflow-hidden">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 shadow-2xs shrink-0">
                            <FileText className="h-5 w-5" />
                          </span>
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800 shadow-2xs">
                            Recepción Inmediata
                          </span>
                        </div>
                        <div>
                          <h4 className="font-display font-bold text-sm text-foreground group-hover:text-teal-600 transition-colors">
                            1. Ticket Digital de Recepción
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            Envío instantáneo del ticket digital, detalle de prendas, abono inicial y fecha prometida de entrega al recibir la ropa.
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-border/50 flex items-center justify-between text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                        <span className="flex items-center gap-1">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Disparo al crear orden</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold">
                          Activo
                        </span>
                      </div>
                    </div>

                    {/* 2. Ropa Lista para Entrega */}
                    <div className="group relative p-5 rounded-2xl bg-surface border border-border/80 hover:border-blue-500/50 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 overflow-hidden">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 shadow-2xs shrink-0">
                            <CheckCircle2 className="h-5 w-5" />
                          </span>
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 shadow-2xs">
                            Aviso de Lista
                          </span>
                        </div>
                        <div>
                          <h4 className="font-display font-bold text-sm text-foreground group-hover:text-blue-600 transition-colors">
                            2. Ropa Lista para Entrega
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            Notificación automática cuando el proceso de lavado/planchado concluye, indicando saldo por pagar y casillero asignado.
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-border/50 flex items-center justify-between text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                        <span className="flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" />
                          <span>Disparo al cambiar a LISTA</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold">
                          Activo
                        </span>
                      </div>
                    </div>

                    {/* 3. Despacho Delivery (En Camino) */}
                    <div className="group relative p-5 rounded-2xl bg-surface border border-border/80 hover:border-amber-500/50 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 overflow-hidden">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 shadow-2xs shrink-0">
                            <Truck className="h-5 w-5" />
                          </span>
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800 shadow-2xs">
                            Logística en Ruta
                          </span>
                        </div>
                        <div>
                          <h4 className="font-display font-bold text-sm text-foreground group-hover:text-amber-600 transition-colors">
                            3. Salida de Repartidor
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            Alerta al cliente cuando el delivery sale de la sucursal con la ropa hacia su domicilio, confirmando dirección.
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-border/50 flex items-center justify-between text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                        <span className="flex items-center gap-1">
                          <Navigation className="h-3.5 w-3.5" />
                          <span>Disparo al asignar ruta</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold">
                          Activo
                        </span>
                      </div>
                    </div>

                    {/* 4. Entrega Final y Recibo */}
                    <div className="group relative p-5 rounded-2xl bg-surface border border-border/80 hover:border-indigo-500/50 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 overflow-hidden">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 shadow-2xs shrink-0">
                            <Award className="h-5 w-5" />
                          </span>
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 shadow-2xs">
                            Recibo Final
                          </span>
                        </div>
                        <div>
                          <h4 className="font-display font-bold text-sm text-foreground group-hover:text-indigo-600 transition-colors">
                            4. Entrega y Agradecimiento
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            Confirmación de entrega exitosa con comprobante final saldado y mensaje de fidelización para próximas órdenes.
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-border/50 flex items-center justify-between text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Disparo al entregar ropa</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold">
                          Activo
                        </span>
                      </div>
                    </div>

                    {/* 5. Recordatorios de Retiro Prolongado */}
                    <div className="group relative p-5 rounded-2xl bg-surface border border-border/80 hover:border-rose-500/50 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 overflow-hidden">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 shadow-2xs shrink-0">
                            <Bell className="h-5 w-5" />
                          </span>
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800 shadow-2xs">
                            Alerta de Estancia
                          </span>
                        </div>
                        <div>
                          <h4 className="font-display font-bold text-sm text-foreground group-hover:text-rose-600 transition-colors">
                            5. Recordatorios de Retiro
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            Alertas periódicas automatizadas para prendas con más de 7 o 15 días listas en estantería para evitar acumulación.
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-border/50 flex items-center justify-between text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Día 7 y 15 en casillero</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold">
                          Activo
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            )}

            {/* ============================================================ */}
            {/* CONTENIDO 8: FLUDO DE PROCESOS (MÓDULO CONDICIONAL)         */}
            {/* ============================================================ */}
            {activeModules.procesos && (
              <TabsContent value="procesos" className="space-y-6">
                {/* 1. Tarjetas Superiores KPI Pastel */}
                <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                  {/* 1. Total en Flujo: Pastel Azul Cielo */}
                  <Card className="p-4 sm:p-5 bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-sky-300 dark:hover:border-sky-800 transition-all min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between text-[11px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider">
                      <span>Total en Flujo</span>
                      <span className="p-2 rounded-xl bg-sky-100 dark:bg-sky-900/70 text-sky-600 dark:text-sky-300">
                        <Package className="h-4 w-4" />
                      </span>
                    </div>
                    <MetricDisplay value={filteredData.ordenes.length} isCurrency={false} colorClass="text-sky-700 dark:text-sky-400 font-black" />
                    <div className="flex items-center gap-1.5 text-[11px] text-sky-800/80 dark:text-sky-300/80 font-medium pt-2 border-t border-sky-200/60 dark:border-sky-900/50">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" />
                      <span>Órdenes en el período</span>
                    </div>
                  </Card>

                  {/* 2. En Operación (Taller): Pastel Índigo */}
                  <Card className="p-4 sm:p-5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between text-[11px] font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
                      <span>En Operación Activa</span>
                      <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/70 text-indigo-600 dark:text-indigo-300">
                        <WashingMachine className="h-4 w-4" />
                      </span>
                    </div>
                    <MetricDisplay value={stats.ordenesEnTaller} isCurrency={false} colorClass="text-indigo-700 dark:text-indigo-400 font-black" />
                    <div className="flex items-center gap-1.5 text-[11px] text-indigo-800/80 dark:text-indigo-300/80 font-medium pt-2 border-t border-indigo-200/60 dark:border-indigo-900/50">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span>Cola inicial y lavado</span>
                    </div>
                  </Card>

                  {/* 3. Listas para Despacho: Pastel Ámbar */}
                  <Card className="p-4 sm:p-5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-amber-300 dark:hover:border-amber-800 transition-all min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                      <span>Listas para Despacho</span>
                      <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/70 text-amber-600 dark:text-amber-300">
                        <PackageCheck className="h-4 w-4" />
                      </span>
                    </div>
                    <MetricDisplay value={stats.ordenesListasDespacho} isCurrency={false} colorClass="text-amber-700 dark:text-amber-400 font-black" />
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-800/80 dark:text-amber-300/80 font-medium pt-2 border-t border-amber-200/60 dark:border-amber-900/50">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span>En estantería o ruta</span>
                    </div>
                  </Card>

                  {/* 4. Tasa de Entrega: Pastel Esmeralda */}
                  <Card className="p-4 sm:p-5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                      <span>Tasa de Entrega</span>
                      <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/70 text-emerald-600 dark:text-emerald-300">
                        <Award className="h-4 w-4" />
                      </span>
                    </div>
                    <MetricDisplay value={`${stats.tasaCompletitud}%`} isCurrency={false} colorClass="text-emerald-700 dark:text-emerald-400 font-black" />
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-800/80 dark:text-emerald-300/80 font-medium pt-2 border-t border-emerald-200/60 dark:border-emerald-900/50">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>{stats.ordenesCompletadas} órdenes entregadas</span>
                    </div>
                  </Card>
                </div>

                {/* 2. Módulo Principal: Pipeline de Estados */}
                <Card className="p-6 bg-surface border border-border/80 shadow-card rounded-3xl space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="p-2.5 rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 shrink-0">
                        <ListTodo className="h-6 w-6" />
                      </span>
                      <div>
                        <h3 className="font-display font-bold text-lg sm:text-xl text-foreground">
                          Pipeline y Estado Operativo de las Órdenes
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Trazabilidad del flujo de trabajo por fases operativas desde la recepción hasta la entrega
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-auto">
                      <span className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/70 dark:border-indigo-900/60 text-indigo-800 dark:text-indigo-300 font-extrabold text-xs shadow-2xs">
                        {filteredData.ordenes.length} órdenes en flujo
                      </span>
                    </div>
                  </div>

                  {/* Barra Visual de Distribución del Flujo (Embudo Continuo) */}
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-muted-foreground uppercase text-[10px] tracking-wider">Embudo Operativo del Taller</span>
                      <span className="text-primary text-[11px] font-black">100% de la carga procesada</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden flex shadow-inner">
                      {[
                        { key: "RECIBIDA", count: stats.porEstado["RECIBIDA"] || 0, color: "bg-sky-500", label: "Recibidas" },
                        { key: "EN_PROCESO", count: stats.porEstado["EN_PROCESO"] || 0, color: "bg-indigo-600", label: "En Proceso" },
                        { key: "LISTA", count: (stats.porEstado["LISTA"] || 0) + (stats.porEstado["EN_CAMINO"] || 0), color: "bg-emerald-500", label: "Listas" },
                        { key: "ENTREGADA", count: stats.porEstado["ENTREGADA"] || 0, color: "bg-purple-600", label: "Entregadas" },
                      ].map(st => {
                        const pct = filteredData.ordenes.length > 0 ? (st.count / filteredData.ordenes.length) * 100 : 0;
                        if (pct <= 0) return null;
                        return (
                          <div
                            key={st.key}
                            className={`h-full ${st.color} transition-all duration-500 first:rounded-l-full last:rounded-r-full`}
                            style={{ width: `${pct}%` }}
                            title={`${st.label}: ${st.count} órdenes (${Math.round(pct)}%)`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* 4 Tarjetas del Pipeline Operativo */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      {
                        state: "RECIBIDA",
                        stepNum: "1",
                        title: "Recibidas",
                        subtitle: "Prendas ingresadas en recepción",
                        badge: "Cola Inicial",
                        icon: Clock,
                        stepPillBg: "bg-sky-600 text-white",
                        badgeColor: "bg-sky-50 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border-sky-200/80 dark:border-sky-800",
                        iconBoxColor: "bg-sky-100 dark:bg-sky-950/70 text-sky-600 dark:text-sky-300 border-sky-200/70 dark:border-sky-900/60",
                        barGradient: "from-sky-400 to-blue-600",
                        hoverBorder: "hover:border-sky-500/60",
                        count: stats.porEstado["RECIBIDA"] || 0,
                        monto: stats.porEstadoMonto?.["RECIBIDA"] || 0,
                        extraInfo: null
                      },
                      {
                        state: "EN_PROCESO",
                        stepNum: "2",
                        title: "En Proceso",
                        subtitle: "Lavado, secado y planchado activo",
                        badge: "Taller Activo",
                        icon: WashingMachine,
                        stepPillBg: "bg-indigo-600 text-white",
                        badgeColor: "bg-indigo-50 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800",
                        iconBoxColor: "bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 border-indigo-200/70 dark:border-indigo-900/60",
                        barGradient: "from-indigo-400 to-purple-600",
                        hoverBorder: "hover:border-indigo-500/60",
                        count: stats.porEstado["EN_PROCESO"] || 0,
                        monto: stats.porEstadoMonto?.["EN_PROCESO"] || 0,
                        extraInfo: null
                      },
                      {
                        state: "LISTA",
                        stepNum: "3",
                        title: "Listas para Entrega",
                        subtitle: "Empacadas en casilleros o mostrador",
                        badge: "Para Retiro",
                        icon: PackageCheck,
                        stepPillBg: "bg-emerald-600 text-white",
                        badgeColor: "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800",
                        iconBoxColor: "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-900/60",
                        barGradient: "from-emerald-400 to-teal-600",
                        hoverBorder: "hover:border-emerald-500/60",
                        count: (stats.porEstado["LISTA"] || 0) + (stats.porEstado["EN_CAMINO"] || 0),
                        monto: (stats.porEstadoMonto?.["LISTA"] || 0) + (stats.porEstadoMonto?.["EN_CAMINO"] || 0),
                        extraInfo: (stats.porEstado["EN_CAMINO"] || 0) > 0 ? `${stats.porEstado["EN_CAMINO"]} en reparto` : null
                      },
                      {
                        state: "ENTREGADA",
                        stepNum: "4",
                        title: "Entregadas",
                        subtitle: "Servicio completado y retirado",
                        badge: "Completada",
                        icon: Award,
                        stepPillBg: "bg-purple-600 text-white",
                        badgeColor: "bg-purple-50 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-200/80 dark:border-purple-800",
                        iconBoxColor: "bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-300 border-purple-200/70 dark:border-purple-900/60",
                        barGradient: "from-purple-400 to-indigo-600",
                        hoverBorder: "hover:border-purple-500/60",
                        count: stats.porEstado["ENTREGADA"] || 0,
                        monto: stats.porEstadoMonto?.["ENTREGADA"] || 0,
                        extraInfo: null
                      },
                    ].map(st => {
                      const IconComponent = st.icon;
                      const count = st.count;
                      const monto = st.monto;
                      const pct = filteredData.ordenes.length > 0 ? Math.round((count / filteredData.ordenes.length) * 100) : 0;
                      return (
                        <div
                          key={st.state}
                          className={`group relative p-5 rounded-2xl bg-surface border border-border/80 ${st.hoverBorder} shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 overflow-hidden`}
                        >
                          {/* Cabecera: Paso, Badge e Icono Integrados */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`px-2.5 py-1 rounded-xl font-display font-black text-[11px] shadow-2xs shrink-0 ${st.stepPillBg}`}>
                                  PASO {st.stepNum}
                                </span>
                                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-2xs ${st.badgeColor}`}>
                                  {st.badge}
                                </span>
                              </div>

                              <span className={`p-2 rounded-xl border shadow-2xs shrink-0 ${st.iconBoxColor}`}>
                                <IconComponent className="h-4 w-4" />
                              </span>
                            </div>

                            <div className="pt-0.5">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="font-display font-black text-base text-foreground group-hover:text-primary transition-colors">
                                  {st.title}
                                </h4>
                                {st.extraInfo && (
                                  <span className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[10px] font-black border border-amber-200/80">
                                    {st.extraInfo}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {st.subtitle}
                              </p>
                            </div>
                          </div>

                          {/* Bloques de Métricas: Conteo y Monto en Etapa */}
                          <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-1">
                            <div className="flex items-baseline justify-between">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase">Volumen</span>
                              <span className="text-sm font-black font-display text-foreground">
                                {count} {count === 1 ? 'orden' : 'órdenes'}
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between pt-1 border-t border-border/40">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase">Valor</span>
                              <span className="text-xs font-black font-display text-emerald-600 dark:text-emerald-400">
                                {formatRD(monto)}
                              </span>
                            </div>
                          </div>

                          {/* Barra de Proporción Operativa */}
                          <div className="pt-2 border-t border-border/50 space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="text-[10px] text-muted-foreground">Cuota de flujo</span>
                              <span className="text-[10px] font-black text-primary">{pct}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${st.barGradient} transition-all duration-500`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </TabsContent>
            )}

            {/* ============================================================ */}
            {/* CONTENIDO 9: ESTANTERÍA VIRTUAL (MÓDULO CONDICIONAL)         */}
            {/* ============================================================ */}
            {activeModules.estanteria && (
              <TabsContent value="estanteria" className="space-y-6">
                {/* 1. Tarjetas Superiores KPI Pastel */}
                <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                  {/* 1. Capacidad de Casilleros: Pastel Violeta */}
                  <Card className="p-4 sm:p-5 bg-violet-50/80 dark:bg-violet-950/40 border border-violet-200/80 dark:border-violet-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-violet-300 dark:hover:border-violet-800 transition-all min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between text-[11px] font-bold text-violet-800 dark:text-violet-300 uppercase tracking-wider">
                      <span>Capacidad de Casilleros</span>
                      <span className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/70 text-violet-600 dark:text-violet-300">
                        <Layers className="h-4 w-4" />
                      </span>
                    </div>
                    <MetricDisplay value={stats.totalCapacidadEstanteria} isCurrency={false} colorClass="text-violet-700 dark:text-violet-400 font-black" />
                    <div className="flex items-center gap-1.5 text-[11px] text-violet-800/80 dark:text-violet-300/80 font-medium pt-2 border-t border-violet-200/60 dark:border-violet-900/50">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0" />
                      <span>{stats.estanteriaZonasDetalle?.length || 0} zonas configuradas</span>
                    </div>
                  </Card>

                  {/* 2. Órdenes Ubicadas: Pastel Azul Cielo */}
                  <Card className="p-4 sm:p-5 bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-sky-300 dark:hover:border-sky-800 transition-all min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between text-[11px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider">
                      <span>Órdenes Ubicadas</span>
                      <span className="p-2 rounded-xl bg-sky-100 dark:bg-sky-900/70 text-sky-600 dark:text-sky-300">
                        <Boxes className="h-4 w-4" />
                      </span>
                    </div>
                    <MetricDisplay value={stats.ordenesEnEstanteria} isCurrency={false} colorClass="text-sky-700 dark:text-sky-400 font-black" />
                    <div className="flex items-center gap-1.5 text-[11px] text-sky-800/80 dark:text-sky-300/80 font-medium pt-2 border-t border-sky-200/60 dark:border-sky-900/50">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" />
                      <span>{stats.totalPrendasEnEstanteria || 0} prendas en casilleros</span>
                    </div>
                  </Card>

                  {/* 3. Espacio Libre Disponible: Pastel Esmeralda */}
                  <Card className="p-4 sm:p-5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                      <span>Espacio Disponible</span>
                      <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/70 text-emerald-600 dark:text-emerald-300">
                        <PackageCheck className="h-4 w-4" />
                      </span>
                    </div>
                    <MetricDisplay value={stats.slotsDisponiblesTotal} isCurrency={false} colorClass="text-emerald-700 dark:text-emerald-400 font-black" />
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-800/80 dark:text-emerald-300/80 font-medium pt-2 border-t border-emerald-200/60 dark:border-emerald-900/50">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>Slots libres para guardar ropa</span>
                    </div>
                  </Card>

                  {/* 4. Tasa de Ocupación: Pastel Ámbar */}
                  <Card className="p-4 sm:p-5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-amber-300 dark:hover:border-amber-800 transition-all min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                      <span>Tasa de Ocupación</span>
                      <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/70 text-amber-600 dark:text-amber-300">
                        <Percent className="h-4 w-4" />
                      </span>
                    </div>
                    <MetricDisplay value={`${stats.pctOcupacionEstanteria}%`} isCurrency={false} colorClass="text-amber-700 dark:text-amber-400 font-black" />
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-800/80 dark:text-amber-300/80 font-medium pt-2 border-t border-amber-200/60 dark:border-amber-900/50">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span>{stats.pctOcupacionEstanteria > 80 ? "Ocupación Alta" : stats.pctOcupacionEstanteria > 40 ? "Ocupación Moderada" : "Capacidad Amplia"}</span>
                    </div>
                  </Card>
                </div>

                {/* 2. Zonas de Estantería y Distribución de Slots */}
                <Card className="p-6 bg-surface border border-border/80 shadow-card rounded-3xl space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="p-2.5 rounded-2xl bg-violet-100 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400 shrink-0">
                        <Layers className="h-6 w-6" />
                      </span>
                      <div>
                        <h3 className="font-display font-bold text-lg sm:text-xl text-foreground">
                          Distribución de Zonas y Espacios Físicos
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Organización de rieles, estantes, ganchos y casilleros configurados en la sucursal
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-auto">
                      <span className="px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/60 border border-violet-200/70 dark:border-violet-900/60 text-violet-800 dark:text-violet-300 font-extrabold text-xs shadow-2xs">
                        {stats.totalCapacidadEstanteria} espacios totales
                      </span>
                    </div>
                  </div>

                  {/* Cuadrícula de Zonas */}
                  {stats.estanteriaZonasDetalle && stats.estanteriaZonasDetalle.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {stats.estanteriaZonasDetalle.map((zona: any) => {
                        return (
                          <div
                            key={zona.id}
                            className="group relative p-5 rounded-2xl bg-surface border border-border/80 hover:border-violet-500/50 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 overflow-hidden"
                          >
                            {/* Cabecera de Zona */}
                            <div className="space-y-2.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="p-2.5 rounded-xl bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 shadow-2xs shrink-0">
                                    {zona.tipo === "conveyor" ? <RotateCw className="h-4 w-4" /> : zona.tipo === "estante" ? <Boxes className="h-4 w-4" /> : <Tag className="h-4 w-4" />}
                                  </span>
                                  <div className="min-w-0">
                                    <h4 className="font-display font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                      {zona.nombre}
                                    </h4>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                      {zona.tipo === "conveyor" ? "Conveyor Giratorio" : zona.tipo === "estante" ? "Estantería / Casillero" : zona.tipo === "cesta" ? "Cesta" : "Riel Fijo / Perchero"}
                                    </span>
                                  </div>
                                </div>

                                <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-violet-50 dark:bg-violet-950/70 border border-violet-200/80 dark:border-violet-900/60 text-violet-800 dark:text-violet-300 shadow-2xs shrink-0">
                                  {zona.capacidad} {zona.capacidad === 1 ? 'slot' : 'slots'}
                                </span>
                              </div>

                              {/* Barra de Ocupación de la Zona */}
                              <div className="space-y-1.5 pt-1">
                                <div className="flex items-center justify-between text-xs font-semibold">
                                  <span className="text-[11px] text-muted-foreground">
                                    {zona.ocupados} ocupados · {zona.libres} disponibles
                                  </span>
                                  <span className="text-[11px] font-black text-violet-700 dark:text-violet-300">
                                    {zona.tasaOcupacion}%
                                  </span>
                                </div>
                                <div className="h-2 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 transition-all duration-500"
                                    style={{ width: `${zona.tasaOcupacion}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Espacios Creados (Chips de Slots de la Zona) */}
                            <div className="space-y-2 pt-2 border-t border-border/50">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                                Espacios creados ({zona.slots?.length || 0})
                              </span>
                              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                                {zona.slotsConEstado && zona.slotsConEstado.length > 0 ? (
                                  zona.slotsConEstado.map((s: any) => (
                                    <div
                                      key={s.slotName}
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                                        s.ocupado
                                          ? "bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 shadow-2xs"
                                          : "bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80"
                                      }`}
                                      title={s.ocupado ? `Ocupado por Orden #${s.orden?.numero} (${s.orden?.cliente_nombre || "Cliente"})` : `${s.slotName} (Disponible)`}
                                    >
                                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${s.ocupado ? "bg-indigo-500 animate-pulse" : "bg-emerald-500"}`} />
                                      <span className="truncate max-w-[120px]">{s.slotName}</span>
                                      {s.ocupado && (
                                        <span className="text-[9px] font-extrabold px-1 rounded bg-indigo-200/70 dark:bg-indigo-900/80 text-indigo-900 dark:text-indigo-200 shrink-0">
                                          #{s.orden?.numero}
                                        </span>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">Sin slots definidos en esta zona</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="p-3 rounded-2xl bg-violet-50 dark:bg-violet-950/60 text-violet-600">
                          <Layers className="h-6 w-6" />
                        </div>
                        <span className="font-bold text-sm text-foreground">
                          No hay zonas de estantería creadas en la configuración
                        </span>
                        <p className="text-xs text-muted-foreground max-w-sm">
                          Puedes crear y organizar rieles, casilleros y percheros desde el módulo de Estantería Virtual (/estanteria).
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Detalle de Órdenes Almacenadas en Estantería */}
                  {stats.ordenesUbicadasDetalle && stats.ordenesUbicadasDetalle.length > 0 && (
                    <div className="pt-4 border-t border-border/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-display font-bold text-sm text-foreground">
                          Prendas Listas en Custodia ({stats.ordenesUbicadasDetalle.length})
                        </h4>
                        <span className="text-xs text-muted-foreground">Órdenes esperando retiro con ubicación asignada</span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {stats.ordenesUbicadasDetalle.slice(0, 9).map((o: any) => {
                          const itemsCount = (o.items || []).reduce((sum: number, it: any) => sum + (Number(it.cantidad) || 1), 0);
                          const daysInLocker = Math.floor((Date.now() - new Date(o.creado_en).getTime()) / (1000 * 60 * 60 * 24));
                          return (
                            <div key={o.id} className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 flex items-center justify-between gap-3 text-xs">
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-foreground">#{o.numero}</span>
                                  <span className="px-2 py-0.5 rounded-lg bg-violet-100 dark:bg-violet-950/80 text-violet-800 dark:text-violet-300 font-extrabold text-[10px]">
                                    {o.ubicacion_ropa}
                                  </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground truncate font-medium">
                                  {o.cliente_nombre || "Cliente Mostrador"}
                                </p>
                              </div>

                              <div className="text-right shrink-0 space-y-0.5">
                                <span className="font-extrabold text-foreground block">
                                  {itemsCount} {itemsCount === 1 ? 'pieza' : 'piezas'}
                                </span>
                                <span className={`text-[10px] font-bold block ${daysInLocker >= 7 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                                  {daysInLocker === 0 ? 'Hoy' : `Hace ${daysInLocker}d`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              </TabsContent>
            )}

            {/* ============================================================ */}
            {/* CONTENIDO 10: AUDITORÍA & CAJA                               */}
            {/* ============================================================ */}
            <TabsContent value="auditoria" className="space-y-6">
              {/* 1. Tarjetas Superiores KPI Pastel */}
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1. Arqueos Realizados: Pastel Ámbar */}
                <Card className="p-4 sm:p-5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-amber-300 dark:hover:border-amber-800 transition-all min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                    <span>Arqueos Registrados</span>
                    <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/70 text-amber-600 dark:text-amber-300">
                      <Coins className="h-4 w-4" />
                    </span>
                  </div>
                  <MetricDisplay value={stats.totalCierres} isCurrency={false} colorClass="text-amber-700 dark:text-amber-400 font-black" />
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-800/80 dark:text-amber-300/80 font-medium pt-2 border-t border-amber-200/60 dark:border-amber-900/50">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>Fondos iniciales: {formatRD(stats.totalFondosIniciales)}</span>
                  </div>
                </Card>

                {/* 2. Precisión de Cuadre: Pastel Esmeralda */}
                <Card className="p-4 sm:p-5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    <span>Precisión de Cuadre</span>
                    <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/70 text-emerald-600 dark:text-emerald-300">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                  </div>
                  <MetricDisplay value={`${stats.tasaCuadrePerfecto}%`} isCurrency={false} colorClass="text-emerald-700 dark:text-emerald-400 font-black" />
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-800/80 dark:text-emerald-300/80 font-medium pt-2 border-t border-emerald-200/60 dark:border-emerald-900/50">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>{stats.cierresCuadrados} de {stats.totalCierres} turnos cuadrados al centavo</span>
                  </div>
                </Card>

                {/* 3. Efectivo Físico Auditado: Pastel Azul Cielo */}
                <Card className="p-4 sm:p-5 bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-sky-300 dark:hover:border-sky-800 transition-all min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-[11px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider">
                    <span>Efectivo Auditado</span>
                    <span className="p-2 rounded-xl bg-sky-100 dark:bg-sky-900/70 text-sky-600 dark:text-sky-300">
                      <Wallet className="h-4 w-4" />
                    </span>
                  </div>
                  <MetricDisplay value={stats.totalEfectivoAuditado} isCurrency={true} colorClass="text-sky-700 dark:text-sky-400 font-black" />
                  <div className="flex items-center gap-1.5 text-[11px] text-sky-800/80 dark:text-sky-300/80 font-medium pt-2 border-t border-sky-200/60 dark:border-sky-900/50">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" />
                    <span>Contado físicamente en gavetas</span>
                  </div>
                </Card>

                {/* 4. Balance de Conciliación: Pastel Violeta */}
                <Card className="p-4 sm:p-5 bg-violet-50/80 dark:bg-violet-950/40 border border-violet-200/80 dark:border-violet-900/60 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-violet-300 dark:hover:border-violet-800 transition-all min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-[11px] font-bold text-violet-800 dark:text-violet-300 uppercase tracking-wider">
                    <span>Balance de Ajustes</span>
                    <span className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/70 text-violet-600 dark:text-violet-300">
                      <Scale className="h-4 w-4" />
                    </span>
                  </div>
                  <MetricDisplay value={stats.totalDiferenciaNeta} isCurrency={true} colorClass="text-violet-700 dark:text-violet-400 font-black" />
                  <div className="flex items-center gap-1.5 text-[11px] text-violet-800/80 dark:text-violet-300/80 font-medium pt-2 border-t border-violet-200/60 dark:border-violet-900/50">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0" />
                    <span>{stats.cierresSobrantes} sobrantes · {stats.cierresFaltantes} faltantes</span>
                  </div>
                </Card>
              </div>

              {/* 2. Cuadrícula Principal de Auditoría y Caja (2 Columnas) */}
              <div className="grid gap-6 lg:grid-cols-12 items-start">
                {/* Columna Izquierda: Historial de Cierres de Caja y Cuadres (7 Columnas) */}
                <Card className="lg:col-span-7 p-6 bg-surface border border-border/80 shadow-card rounded-3xl space-y-5 flex flex-col justify-start">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 shrink-0">
                          <Coins className="h-5 w-5" />
                        </span>
                        <div>
                          <h3 className="font-display font-bold text-base sm:text-lg text-foreground">
                            Cierres de Caja y Cuadres de Turno
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Auditoría de apertura, fondo inicial y conciliación de gaveta física
                          </p>
                        </div>
                      </div>

                      <span className="px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/70 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 font-extrabold text-xs shadow-2xs self-start sm:self-auto">
                        {stats.cierresCaja.length} turnos auditados
                      </span>
                    </div>

                    {/* Resumen Informativo de Auditoría */}
                    {stats.cierresCaja.length > 0 && (
                      <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-2 ${
                        stats.tasaCuadrePerfecto === 100 
                          ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                          : "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300"
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-current shrink-0 animate-pulse" />
                          <span className="font-bold">
                            {stats.tasaCuadrePerfecto === 100 
                              ? "Control Óptimo: Todos los turnos cerraron con balance exacto"
                              : `Atención: Se registraron diferencias en ${stats.cierresSobrantes + stats.cierresFaltantes} cierres de turno`}
                          </span>
                        </div>
                        <span className="text-[11px] font-extrabold">
                          {stats.cierresCuadrados}/{stats.totalCierres} Cuadrados
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Lista de Tarjetas de Cierres de Turno */}
                  <div className="space-y-3.5 max-h-[580px] overflow-y-auto pr-1">
                    {stats.cierresCaja.length > 0 ? (
                      stats.cierresCaja.map((c: any) => {
                        const dif = Number(c.diferencia) || 0;
                        const montoInicial = Number(c.monto_inicial) || 0;
                        const efectivoContado = Number(c.monto_contado_efectivo) || 0;
                        
                        const isCuadrada = dif === 0;
                        const isSobrante = dif > 0;
                        const isFaltante = dif < 0;

                        return (
                          <div 
                            key={c.id} 
                            className="group p-4 rounded-2xl bg-muted/20 border border-border/70 hover:border-amber-500/40 hover:bg-muted/40 transition-all duration-200 space-y-3.5 shadow-2xs"
                          >
                            {/* Cabecera del Cierre: Turno y Resultado */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border shadow-2xs ${c.turnoBadgeClass}`}>
                                  <span>{c.turnoIcon}</span>
                                  {c.turnoLabel}
                                </span>
                                <span className="px-2 py-0.5 rounded-lg text-[11px] font-black font-mono bg-muted/60 text-muted-foreground border border-border/50">
                                  #{c.id.slice(0, 6)}
                                </span>
                              </div>

                              {/* Píldora de Estado del Cuadre y Botón de Desglose */}
                              <div className="flex items-center gap-2 shrink-0">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => {
                                    setCierreModalStep(1);
                                    setSelectedCierreDesglose(c);
                                  }} 
                                  className="h-7 px-2.5 rounded-xl text-[11px] font-extrabold gap-1 border-amber-300/80 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 shadow-2xs cursor-pointer"
                                >
                                  <Receipt className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                  Ver Desglose
                                </Button>

                                {isCuadrada ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                                    <Check className="h-3 w-3" />
                                    Cuadrada
                                  </span>
                                ) : isSobrante ? (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 shadow-2xs">
                                    <ArrowUpRight className="h-3 w-3" />
                                    Sobrante: +{formatRD(dif)}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-2xs">
                                    <ArrowDownLeft className="h-3 w-3" />
                                    Faltante: -{formatRD(Math.abs(dif))}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Fila del Empleado / Cajero Responsable y Horarios */}
                            <div className="p-3 rounded-xl bg-surface/80 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 shadow-2xs shrink-0">
                                  <UserCheck className="h-4 w-4" />
                                </span>
                                <div className="min-w-0 space-y-0.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-display font-black text-sm text-foreground truncate">
                                      {c.cajeroNombre}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase bg-muted text-muted-foreground border border-border/50">
                                      {c.cajeroRol}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">
                                    Cajero responsable de la custodia y conteo del efectivo
                                  </p>
                                </div>
                              </div>

                              <div className="text-left sm:text-right shrink-0 space-y-0.5 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-border/40">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center sm:justify-end gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {c.cerrada_en ? new Date(c.cerrada_en).toLocaleDateString("es-DO", { day: '2-digit', month: 'short', year: 'numeric' }) : "Fecha no disp."}
                                </span>
                                <span className="text-xs font-bold text-foreground flex items-center sm:justify-end gap-1">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  {c.abierta_en ? new Date(c.abierta_en).toLocaleTimeString("es-DO", { hour: '2-digit', minute: '2-digit' }) : "—"}
                                  {" ➔ "}
                                  {c.cerrada_en ? new Date(c.cerrada_en).toLocaleTimeString("es-DO", { hour: '2-digit', minute: '2-digit' }) : "—"}
                                </span>
                              </div>
                            </div>

                            {/* Desglose Numérico de Auditoría en 3 Columnas */}
                            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-surface border border-border/50 text-center">
                              <div className="space-y-0.5 text-left pl-1">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Fondo Inicial</span>
                                <span className="text-xs font-black font-display text-foreground block">{formatRD(montoInicial)}</span>
                              </div>
                              <div className="space-y-0.5 border-x border-border/40 px-1">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Efectivo Físico</span>
                                <span className="text-xs font-black font-display text-sky-700 dark:text-sky-300 block">{formatRD(efectivoContado)}</span>
                              </div>
                              <div className="space-y-0.5 text-right pr-1">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Diferencia</span>
                                <span className={`text-xs font-black font-display block ${isCuadrada ? 'text-emerald-600 dark:text-emerald-400' : isSobrante ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                  {isCuadrada ? "RD$0.00" : formatRD(dif)}
                                </span>
                              </div>
                            </div>

                            {/* Notas / Observaciones de Auditoría */}
                            {c.notas && (
                              <div className="p-2 rounded-lg bg-muted/40 border border-border/40 text-[11px] text-muted-foreground flex items-center gap-1.5">
                                <Info className="h-3 w-3 text-amber-600 shrink-0" />
                                <span className="italic">"{c.notas}"</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-16 text-center text-xs text-muted-foreground">
                        <Coins className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                        No hay cierres de caja registrados en este período.
                      </div>
                    )}
                  </div>
                </Card>

                {/* Columna Derecha: Bitácora de Actividad en Vivo (5 Columnas) */}
                <Card className="lg:col-span-5 p-6 bg-surface border border-border/80 shadow-card rounded-3xl space-y-5 flex flex-col justify-start">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                          <Bell className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-display font-bold text-base sm:text-lg text-foreground truncate">
                            Bitácora de Auditoría
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Eventos de caja, cobros y ventas
                          </p>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200/80 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-extrabold text-[10px] shadow-2xs shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        En Vivo
                      </span>
                    </div>

                    {/* Filtros Interactivos de la Bitácora */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {[
                        { key: "all", label: "Todos", count: stats.recientes?.length || 0 },
                        { key: "cobros", label: "Cobros & Ventas", count: (stats.recientes || []).filter((r: any) => r.tipoCategoria === "cobros").length },
                        { key: "caja", label: "Caja", count: (stats.recientes || []).filter((r: any) => r.tipoCategoria === "caja").length },
                        { key: "gastos", label: "Gastos", count: (stats.recientes || []).filter((r: any) => r.tipoCategoria === "gastos").length },
                      ].map(f => (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => setAuditoriaFilter(f.key as any)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                            auditoriaFilter === f.key
                              ? "bg-foreground text-background shadow-xs font-black"
                              : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {f.label} ({f.count})
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Feed de Eventos Filtrado */}
                  <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                    {stats.recientes && stats.recientes.length > 0 ? (
                      stats.recientes
                        .filter((act: any) => auditoriaFilter === "all" || act.tipoCategoria === auditoriaFilter)
                        .map((act: any) => (
                          <div 
                            key={act.id} 
                            className="p-3 rounded-2xl bg-muted/20 border border-border/60 hover:border-border hover:bg-muted/40 transition-colors flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground truncate block">{act.titulo}</span>
                              </div>
                              <span className="text-[11px] text-muted-foreground block truncate">{act.desc}</span>
                              <span className="text-[10px] text-muted-foreground/80 flex items-center gap-1 pt-0.5">
                                <Clock className="h-3 w-3" />
                                {new Date(act.fecha).toLocaleString("es-DO", { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                              </span>
                            </div>

                            <div className="flex flex-col items-end gap-1 shrink-0">
                              {act.monto > 0 && (
                                <span className={`font-black text-xs font-display ${act.isIngreso ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                                  {act.isIngreso ? `+${formatRD(act.monto)}` : `-${formatRD(act.monto)}`}
                                </span>
                              )}
                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border shadow-2xs ${act.colorClass}`}>
                                {act.badgeText}
                              </span>
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="py-16 text-center text-xs text-muted-foreground">
                        <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                        Sin actividad registrada en este período.
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        ) : null}

        {/* DIALOG DE DESGLOSE TIPO WIZARD COMPACTO */}
        <Dialog open={!!selectedCierreDesglose} onOpenChange={(open) => !open && setSelectedCierreDesglose(null)}>
          <DialogContent className="rounded-3xl max-w-lg p-0 gap-0 overflow-hidden border-none shadow-2xl bg-background text-foreground">
            {cierreDesgloseDetalle && selectedCierreDesglose && (
              <>
                {/* STEPPER HEADER (PREMIUM COMPACT REDESIGN ESTILO /PERSONAL) */}
                <div className="bg-slate-50/80 dark:bg-slate-900/70 p-4 sm:p-5 pb-2 relative border-b border-border/50">
                  {/* Fila del Título y Cajero */}
                  <div className="flex items-center justify-between mb-3 pr-8">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/15 shadow-xs shrink-0">
                        {cierreModalStep === 1 ? <Coins className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <DialogTitle className="text-base font-display font-black text-foreground truncate">
                          Desglose de Cuadre de Caja
                        </DialogTitle>
                        <p className="text-xs text-muted-foreground truncate">
                          {cierreModalStep === 1 
                            ? "Paso 1: Cobros y métodos de pago del turno" 
                            : "Paso 2: Arqueo físico y conciliación de gaveta"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Stepper Buttons de 2 Pasos */}
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-200/60 dark:bg-slate-800/80">
                    <button
                      type="button"
                      onClick={() => setCierreModalStep(1)}
                      className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        cierreModalStep === 1
                          ? "bg-primary text-white shadow-md font-bold"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <span
                        className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                          cierreModalStep === 1
                            ? "bg-white/25 text-white"
                            : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        1
                      </span>
                      <span>Métodos de Pago</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCierreModalStep(2)}
                      className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        cierreModalStep === 2
                          ? "bg-primary text-white shadow-md font-bold"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <span
                        className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                          cierreModalStep === 2
                            ? "bg-white/25 text-white"
                            : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        2
                      </span>
                      <span>Arqueo & Gaveta</span>
                    </button>
                  </div>
                </div>

                {/* DIALOG BODY ULTRA COMPACTO */}
                <div className="p-4 sm:p-5 space-y-4 max-h-[68vh] overflow-y-auto">
                  {/* Barra Informativa del Cajero y Turno */}
                  <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-black border shadow-2xs ${selectedCierreDesglose.turnoBadgeClass}`}>
                        <span>{selectedCierreDesglose.turnoIcon}</span>
                        {selectedCierreDesglose.turnoLabel}
                      </span>
                      <span className="font-bold text-foreground truncate">
                        {selectedCierreDesglose.cajeroNombre}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">
                        ({selectedCierreDesglose.cajeroRol})
                      </span>
                    </div>

                    <span className="text-[11px] text-muted-foreground font-semibold shrink-0">
                      {selectedCierreDesglose.cerrada_en ? new Date(selectedCierreDesglose.cerrada_en).toLocaleDateString("es-DO", { day: '2-digit', month: 'short' }) : "—"}
                    </span>
                  </div>

                  {/* 4 Mini Cards de Resumen */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/50">
                      <span className="text-[9px] font-bold text-amber-800 dark:text-amber-300 uppercase block">Fondo</span>
                      <span className="text-xs font-black font-display text-amber-900 dark:text-amber-200 block truncate">
                        {formatRD(cierreDesgloseDetalle.fondoInicial)}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200/70 dark:border-sky-900/50">
                      <span className="text-[9px] font-bold text-sky-800 dark:text-sky-300 uppercase block">Efectivo</span>
                      <span className="text-xs font-black font-display text-sky-900 dark:text-sky-200 block truncate">
                        {formatRD(cierreDesgloseDetalle.efectivoFisico)}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-900/50">
                      <span className="text-[9px] font-bold text-indigo-800 dark:text-indigo-300 uppercase block">Digital</span>
                      <span className="text-xs font-black font-display text-indigo-900 dark:text-indigo-200 block truncate">
                        {formatRD(cierreDesgloseDetalle.tarjetaFisica + cierreDesgloseDetalle.transfFisica)}
                      </span>
                    </div>
                    <div className={`p-2 rounded-xl border ${
                      cierreDesgloseDetalle.dif === 0 
                        ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200/70 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200"
                        : cierreDesgloseDetalle.dif > 0
                          ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-200/70 dark:border-blue-900/50 text-blue-900 dark:text-blue-200"
                          : "bg-rose-50/70 dark:bg-rose-950/40 border-rose-200/70 dark:border-rose-900/50 text-rose-900 dark:text-rose-200"
                    }`}>
                      <span className="text-[9px] font-bold uppercase block">Diferencia</span>
                      <span className="text-xs font-black font-display block truncate">
                        {cierreDesgloseDetalle.dif === 0 ? "RD$0.00" : formatRD(cierreDesgloseDetalle.dif)}
                      </span>
                    </div>
                  </div>

                  {/* VISTA DEL PASO 1: MÉTODOS DE PAGO */}
                  {cierreModalStep === 1 && (
                    <div className="space-y-3 animate-in fade-in-50 duration-200">
                      <div className="p-3.5 rounded-2xl bg-surface border border-border/80 space-y-2.5 text-xs shadow-2xs">
                        <div className="flex items-center justify-between pb-2 border-b border-border/50">
                          <span className="flex items-center gap-2 font-medium">
                            <span className="p-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                              <Coins className="h-3.5 w-3.5" />
                            </span>
                            Efectivo en Gaveta
                          </span>
                          <span className="font-black font-display text-foreground">
                            {formatRD(cierreDesgloseDetalle.efectivoFisico)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pb-2 border-b border-border/50">
                          <span className="flex items-center gap-2 font-medium">
                            <span className="p-1 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
                              <CreditCard className="h-3.5 w-3.5" />
                            </span>
                            Tarjeta (POS / Datáfono)
                          </span>
                          <span className="font-black font-display text-foreground">
                            {formatRD(cierreDesgloseDetalle.tarjetaFisica)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pb-2 border-b border-border/50">
                          <span className="flex items-center gap-2 font-medium">
                            <span className="p-1 rounded-lg bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400">
                              <Landmark className="h-3.5 w-3.5" />
                            </span>
                            Transferencia Bancaria
                          </span>
                          <span className="font-black font-display text-foreground">
                            {formatRD(cierreDesgloseDetalle.transfFisica)}
                          </span>
                        </div>

                        {cierreDesgloseDetalle.ventasOtros > 0 && (
                          <div className="flex items-center justify-between pb-2 border-b border-border/50">
                            <span className="flex items-center gap-2 font-medium">
                              <span className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                <Receipt className="h-3.5 w-3.5" />
                              </span>
                              Otros Medios
                            </span>
                            <span className="font-black font-display text-foreground">
                              {formatRD(cierreDesgloseDetalle.ventasOtros)}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 font-bold">
                          <span className="text-muted-foreground uppercase text-[10px] tracking-wider">Total Facturado en Turno</span>
                          <span className="font-black font-display text-primary text-sm">
                            {formatRD(cierreDesgloseDetalle.totalFacturadoTurno)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VISTA DEL PASO 2: ARQUEO & GAVETA */}
                  {cierreModalStep === 2 && (
                    <div className="space-y-3 animate-in fade-in-50 duration-200">
                      <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>(+) Fondo Inicial de Apertura</span>
                          <span className="font-bold text-foreground">{formatRD(cierreDesgloseDetalle.fondoInicial)}</span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>(+) Cobros en Efectivo</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            +{formatRD(cierreDesgloseDetalle.ventasEfectivo)}
                          </span>
                        </div>
                        {cierreDesgloseDetalle.abonosEfectivo > 0 && (
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>(+) Abonos a CXC en Efectivo</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              +{formatRD(cierreDesgloseDetalle.abonosEfectivo)}
                            </span>
                          </div>
                        )}
                        {cierreDesgloseDetalle.gastosCajaChica > 0 && (
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>(-) Gastos de Caja Chica</span>
                            <span className="font-bold text-rose-600 dark:text-rose-400">
                              -{formatRD(cierreDesgloseDetalle.gastosCajaChica)}
                            </span>
                          </div>
                        )}
                        {cierreDesgloseDetalle.retirosManuales > 0 && (
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>(-) Retiros de Efectivo</span>
                            <span className="font-bold text-rose-600 dark:text-rose-400">
                              -{formatRD(cierreDesgloseDetalle.retirosManuales)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-border/60 font-bold">
                          <span className="text-foreground">(=) Efectivo Físico Contado</span>
                          <span className="font-black font-display text-foreground text-sm">
                            {formatRD(cierreDesgloseDetalle.efectivoFisico)}
                          </span>
                        </div>
                      </div>

                      {/* Observaciones si existen */}
                      {selectedCierreDesglose.notas && (
                        <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                          <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                          <p className="italic text-[11px]">"{selectedCierreDesglose.notas}"</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* STEPPER FOOTER DE NAVEGACIÓN */}
                <div className="p-3 sm:p-4 bg-slate-50/70 dark:bg-slate-900/60 border-t border-border/60 flex items-center justify-between gap-2">
                  {cierreModalStep === 1 ? (
                    <>
                      <Button 
                        variant="outline" 
                        onClick={() => setSelectedCierreDesglose(null)}
                        className="rounded-xl px-4 text-xs font-bold"
                      >
                        Cerrar
                      </Button>
                      <Button 
                        onClick={() => setCierreModalStep(2)}
                        className="rounded-xl px-4 text-xs font-bold gap-1.5 bg-primary text-white shadow-xs"
                      >
                        <span>Arqueo Físico</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        variant="outline" 
                        onClick={() => setCierreModalStep(1)}
                        className="rounded-xl px-4 text-xs font-bold gap-1.5"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Volver a Métodos</span>
                      </Button>
                      <Button 
                        onClick={() => setSelectedCierreDesglose(null)}
                        className="rounded-xl px-4 text-xs font-bold gap-1.5 bg-primary text-white shadow-xs"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Finalizar</span>
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>

      {/* PORTAL DE IMPRESIÓN COMPLETO */}
      {isPrinting && selectedInspectTenant && stats && inspectData && (
        <ReportesPrintPortal 
          stats={stats}
          tenant={selectedInspectTenant}
          ordenes={filteredData?.ordenes || []}
          gastos={filteredData?.gastos || []}
          emps={inspectData.empleados}
          movs={filteredData?.movimientos || []}
          cajas={filteredData?.cajas || []}
          onClose={() => setIsPrinting(false)}
        />
      )}
    </div>
  );
}

function ReportesPrintPortal({ 
  stats, 
  tenant, 
  ordenes, 
  emps, 
  onClose 
}: { 
  stats: any; 
  tenant: any; 
  ordenes: any[]; 
  gastos: any[]; 
  emps: any[]; 
  movs: any[]; 
  cajas: any[]; 
  onClose: () => void 
}) {
  return createPortal(
    <div className="fixed inset-0 bg-white z-[99999] overflow-y-auto pointer-events-auto atomic-print-target text-slate-800">
      <div className="max-w-4xl mx-auto p-8 print:p-12 print:max-w-4xl print:mx-auto">
        <div className="flex justify-between items-center border-b-2 border-primary/20 pb-6 mb-8 print:hidden relative z-[100000]">
          <Button variant="outline" onClick={onClose} className="gap-2 cursor-pointer">
            Cerrar Reporte
          </Button>
          <Button onClick={() => window.print()} className="bg-primary text-white gap-2 cursor-pointer">
            <Printer className="h-4 w-4" /> Imprimir / Guardar PDF
          </Button>
        </div>

        <div className="print-area">
          <div className="flex justify-between items-start mb-10 pb-6 border-b border-slate-200">
            <div>
              {tenant.logo_url ? (
                <img src={tenant.logo_url} alt={tenant.nombre} className="h-16 object-contain mb-4" />
              ) : (
                <h1 className="text-4xl font-display font-black text-primary uppercase tracking-tighter mb-1">{tenant.nombre}</h1>
              )}
              <div className="text-sm font-bold text-slate-500 uppercase">
                {tenant.rnc ? `RNC: ${tenant.rnc}` : "Sin RNC Configurado"}
              </div>
              <div className="text-xs text-slate-500 max-w-sm mt-1">{tenant.direccion}</div>
              <div className="text-xs text-slate-500">Tel: {tenant.telefono} | {tenant.email}</div>
            </div>

            <div className="text-right">
              <h2 className="text-2xl font-display font-black uppercase text-slate-900 mb-1">
                Reporte de Rendimiento
              </h2>
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
                ESTADÍSTICAS E INDICADORES
              </div>
              <div className="text-xs text-slate-600">
                <span className="font-bold">Generado:</span> {new Date().toLocaleString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}
              </div>
            </div>
          </div>

          {/* Sección 1: KPIs Financieros */}
          <div className="grid grid-cols-5 gap-3 mb-8">
            <div className="p-3 border border-slate-200 rounded-xl text-center bg-slate-50">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ingresos Totales</div>
              <div className="text-sm font-bold text-slate-800">{formatRD(stats.totalVentas)}</div>
            </div>
            <div className="p-3 border border-slate-200 rounded-xl text-center bg-slate-50">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Gastos Totales</div>
              <div className="text-sm font-bold text-rose-600">{formatRD(stats.totalGastos)}</div>
            </div>
            <div className="p-3 border border-slate-200 rounded-xl text-center bg-slate-50 border-l-2 border-l-emerald-500">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Rentabilidad Neta</div>
              <div className={`text-sm font-bold ${stats.rentabilidad >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatRD(stats.rentabilidad)}
              </div>
            </div>
            <div className="p-3 border border-slate-200 rounded-xl text-center bg-slate-50">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">ITBIS Recaudado</div>
              <div className="text-sm font-bold text-blue-600">{formatRD(stats.totalITBIS)}</div>
            </div>
            <div className="p-3 border border-slate-200 rounded-xl text-center bg-slate-50">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ticket Promedio</div>
              <div className="text-sm font-bold text-slate-800">{formatRD(stats.ticketPromedio)}</div>
            </div>
          </div>

          {/* Sección 2: Cuentas por Cobrar */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between gap-6 mb-8">
            <div className="flex-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Cuentas por Cobrar (Clientes)</span>
              <div className="text-xl font-bold text-rose-600">{formatRD(stats.totalDeuda)}</div>
              <span className="text-[9px] text-slate-500">Pendiente en {stats.cantidadDeudas} facturas</span>
            </div>
            <div className="w-px bg-slate-200 self-stretch" />
            <div className="flex-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Abonos Recibidos</span>
              <div className="text-xl font-bold text-emerald-600">{formatRD(stats.totalAbonadoEnOrdenes + stats.totalAbonosCaja)}</div>
              <span className="text-[9px] text-slate-500">Pagos parciales aplicados</span>
            </div>
          </div>

          {/* Sección 3: Métodos y Servicios */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                Métodos de Pago
              </h3>
              <table className="w-full text-xs">
                <tbody>
                  {["EFECTIVO", "TARJETA", "TRANSFERENCIA", "MIXTO"].map((m) => (
                    <tr key={m} className="border-b border-slate-100/50">
                      <td className="py-1.5 font-medium text-slate-700">{m}</td>
                      <td className="py-1.5 text-right font-bold text-slate-800">{formatRD(stats.porMetodo[m] || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                Rendimiento de Colaboradores
              </h3>
              <table className="w-full text-xs">
                <tbody>
                  {emps.map((e: any) => {
                    const oCount = ordenes.filter((o: any) => o.empleado_id === e.id).length;
                    return (
                      <tr key={e.id} className="border-b border-slate-100/50">
                        <td className="py-1.5 font-medium text-slate-700">{e.nombre}</td>
                        <td className="py-1.5 text-right font-bold text-slate-800">{oCount} órdenes</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between items-end border-t border-slate-200 pt-6 mt-12">
            <div className="text-left text-[9px] text-slate-400 italic">
              Este reporte fue generado de forma automática y es propiedad confidencial de {tenant.nombre}.
            </div>
            <div className="text-right text-[10px] font-bold text-slate-500">
              Klynn Cloud POS
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
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
      `}} />
    </div>,
    document.body
  );
}
