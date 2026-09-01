import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Download, 
  Printer, 
  FileSpreadsheet,
  Search,
  Calendar,
  CalendarDays,
  CreditCard,
  Coins,
  Landmark,
  FileText,
  Receipt,
  Check,
  X as XIcon,
  ShieldCheck,
  PiggyBank,
  DollarSign,
  Zap,
  Wrench,
  Megaphone,
  Package,
  Users,
  Building2,
  Truck,
  Tag,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  TrendingDown,
  Info,
  Filter,
  LayoutGrid,
  SlidersHorizontal,
  Coffee,
  Droplets,
  Utensils,
  UtensilsCrossed,
  Cookie,
  Bus,
  Car,
  Fuel,
  Milestone,
  Pencil,
  Banknote,
  Send
} from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
import { createPortal } from "react-dom";
import { exportToCsv } from "@/lib/export";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

const MESES_NOMBRES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];
const ANIOS_DISPONIBLES = [2024, 2025, 2026, 2027, 2028];
import { 
  getGastos, 
  saveGasto, 
  deleteGasto, 
  formatRD, 
  formatDateRD, 
  uid, 
  CATEGORIAS_GASTOS, 
  getECFDocumentosRecibidos, 
  updateEstadoComercialECF, 
  getTenantPlan, 
  getECFConfig, 
  DEFAULT_CONFIG, 
  type Gasto, 
  type ECFDocumentRecibido,
  getCajaAbierta, 
  saveMovimiento, 
  type MetodoPago,
  type Tenant,
  type TenantConfig,
  type Orden,
  isModuleEnabled,
  formatAmountInput,
  parseAmount
} from "@/lib/storage";
import { emitirECF } from "@/lib/fiscal";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlans, useGastos, useECFConfig } from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader,
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/t/$slug/gastos")({
  component: GastosPage,
});

// Función para obtener clases visuales modernas para categorías de gastos
export function getGastoCategoriaVisual(cat: string) {
  const c = (cat || "").toLowerCase();
  if (c.includes("servicio") || c.includes("luz") || c.includes("agua") || c.includes("internet") || c.includes("electricidad")) {
    return {
      label: "Servicios Básicos",
      fullLabel: "Servicios Básicos (Luz/Agua/Net)",
      icon: Zap,
      bgLight: "bg-amber-50 dark:bg-amber-950/60",
      border: "border-amber-200 dark:border-amber-800",
      text: "text-amber-700 dark:text-amber-300",
      chipBg: "bg-amber-100/80 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300/70",
      barColor: "bg-amber-500",
      pillBg: "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      pillActive: "bg-amber-600 text-white border-amber-600 shadow-md",
      innerBadge: "bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100",
    };
  }
  if (c.includes("mantenimiento") || c.includes("reparacion") || c.includes("maquinaria") || c.includes("tecnico")) {
    return {
      label: "Mantenimiento",
      fullLabel: "Mantenimiento & Reparaciones",
      icon: Wrench,
      bgLight: "bg-blue-50 dark:bg-blue-950/60",
      border: "border-blue-200 dark:border-blue-800",
      text: "text-blue-700 dark:text-blue-300",
      chipBg: "bg-blue-100/80 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-300/70",
      barColor: "bg-blue-500",
      pillBg: "bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      pillActive: "bg-blue-600 text-white border-blue-600 shadow-md",
      innerBadge: "bg-blue-200/70 dark:bg-blue-900/60 text-blue-900 dark:text-blue-100",
    };
  }
  if (c.includes("marketing") || c.includes("publicidad")) {
    return {
      label: "Marketing",
      fullLabel: "Marketing & Publicidad",
      icon: Megaphone,
      bgLight: "bg-purple-50 dark:bg-purple-950/60",
      border: "border-purple-200 dark:border-purple-800",
      text: "text-purple-700 dark:text-purple-300",
      chipBg: "bg-purple-100/80 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border-purple-300/70",
      barColor: "bg-purple-500",
      pillBg: "bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      pillActive: "bg-purple-600 text-white border-purple-600 shadow-md",
      innerBadge: "bg-purple-200/70 dark:bg-purple-900/60 text-purple-900 dark:text-purple-100",
    };
  }
  if (c.includes("suministro") || c.includes("insumo") || c.includes("detergente") || c.includes("quimico")) {
    return {
      label: "Suministros",
      fullLabel: "Suministros & Insumos",
      icon: Package,
      bgLight: "bg-teal-50 dark:bg-teal-950/60",
      border: "border-teal-200 dark:border-teal-800",
      text: "text-teal-700 dark:text-teal-300",
      chipBg: "bg-teal-100/80 dark:bg-teal-950 text-teal-800 dark:text-teal-200 border-teal-300/70",
      barColor: "bg-teal-500",
      pillBg: "bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800",
      pillActive: "bg-teal-600 text-white border-teal-600 shadow-md",
      innerBadge: "bg-teal-200/70 dark:bg-teal-900/60 text-teal-900 dark:text-teal-100",
    };
  }
  if (c.includes("salario") || c.includes("nomina") || c.includes("sueldo") || c.includes("personal")) {
    return {
      label: "Salarios",
      fullLabel: "Nómina & Salarios",
      icon: Users,
      bgLight: "bg-indigo-50 dark:bg-indigo-950/60",
      border: "border-indigo-200 dark:border-indigo-800",
      text: "text-indigo-700 dark:text-indigo-300",
      chipBg: "bg-indigo-100/80 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border-indigo-300/70",
      barColor: "bg-indigo-500",
      pillBg: "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
      pillActive: "bg-indigo-600 text-white border-indigo-600 shadow-md",
      innerBadge: "bg-indigo-200/70 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-100",
    };
  }
  if (c.includes("alquiler") || c.includes("renta") || c.includes("local")) {
    return {
      label: "Alquiler",
      fullLabel: "Alquiler de Local",
      icon: Building2,
      bgLight: "bg-rose-50 dark:bg-rose-950/60",
      border: "border-rose-200 dark:border-rose-800",
      text: "text-rose-700 dark:text-rose-300",
      chipBg: "bg-rose-100/80 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-300/70",
      barColor: "bg-rose-500",
      pillBg: "bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      pillActive: "bg-rose-600 text-white border-rose-600 shadow-md",
      innerBadge: "bg-rose-200/70 dark:bg-rose-900/60 text-rose-900 dark:text-rose-100",
    };
  }
  if (c.includes("transporte") || c.includes("combustible") || c.includes("delivery") || c.includes("gasolina") || c.includes("vehiculo")) {
    return {
      label: "Logística",
      fullLabel: "Logística & Combustible",
      icon: Truck,
      bgLight: "bg-orange-50 dark:bg-orange-950/60",
      border: "border-orange-200 dark:border-orange-800",
      text: "text-orange-700 dark:text-orange-300",
      chipBg: "bg-orange-100/80 dark:bg-orange-950 text-orange-800 dark:text-orange-200 border-orange-300/70",
      barColor: "bg-orange-500",
      pillBg: "bg-orange-50 dark:bg-orange-950/50 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800",
      pillActive: "bg-orange-600 text-white border-orange-600 shadow-md",
      innerBadge: "bg-orange-200/70 dark:bg-orange-900/60 text-orange-900 dark:text-orange-100",
    };
  }
  return {
    label: cat || "General",
    fullLabel: cat || "Gastos Generales",
    icon: Tag,
    bgLight: "bg-slate-50 dark:bg-slate-900/60",
    border: "border-slate-200 dark:border-slate-700",
    text: "text-slate-700 dark:text-slate-300",
    chipBg: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300/70",
    barColor: "bg-slate-500",
    pillBg: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    pillActive: "bg-slate-700 text-white border-slate-700 shadow-md",
    innerBadge: "bg-slate-200/70 dark:bg-slate-700 text-slate-800 dark:text-slate-200",
  };
}

// Mapeo visual para Métodos de Pago
function getGastoMetodoVisual(metodo: string) {
  const m = (metodo || "").toUpperCase();
  if (m.includes("EFECTIVO")) {
    return {
      label: "Efectivo",
      icon: Coins,
      badgeClass: "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800",
      iconColor: "text-emerald-600 dark:text-emerald-400"
    };
  }
  if (m.includes("TARJETA")) {
    return {
      label: "Tarjeta (POS)",
      icon: CreditCard,
      badgeClass: "bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800",
      iconColor: "text-sky-600 dark:text-sky-400"
    };
  }
  if (m.includes("TRANSFERENCIA")) {
    return {
      label: "Transferencia",
      icon: Landmark,
      badgeClass: "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800",
      iconColor: "text-indigo-600 dark:text-indigo-400"
    };
  }
  if (m.includes("CHEQUE")) {
    return {
      label: "Cheque",
      icon: FileText,
      badgeClass: "bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800",
      iconColor: "text-amber-600 dark:text-amber-400"
    };
  }
  return {
    label: metodo || "Otro",
    icon: Tag,
    badgeClass: "bg-slate-50 dark:bg-slate-900/70 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800",
    iconColor: "text-slate-600 dark:text-slate-400"
  };
}

function GastosPage() {
  const user = useRequireAuth();
  const tenant = user?.tenant;
  const tenantId = tenant?.id || "";
  const queryClient = useQueryClient();

  const { data: rawGastos = [], isLoading: loadingGastos } = useGastos(tenantId);
  const { data: ecfConfig } = useECFConfig(tenantId);
  const { data: plans = [] } = usePlans();

  const [showGastoModal, setShowGastoModal] = useState(false);
  const [showCompraModal, setShowCompraModal] = useState(false);
  const [recibidos, setRecibidos] = useState<ECFDocumentRecibido[]>([]);
  const [activeTab, setActiveTab] = useState("manual");
  const [isPrinting, setIsPrinting] = useState(false);

  // Filtros interactivos
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "yesterday" | "7d" | "this_month" | "this_year" | "month_select" | "custom">("all");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);

  useEffect(() => {
    async function loadRecibidos() {
      if (!tenantId || tenantId === "__loading__") return;
      try {
        const listRecibidos = await getECFDocumentosRecibidos(tenantId);
        setRecibidos(listRecibidos || []);
      } catch (err) {
        console.error("Error cargando recibidos:", err);
      }
    }
    loadRecibidos();
  }, [tenantId]);

  const gastos = useMemo(() => {
    return [...rawGastos].sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha));
  }, [rawGastos]);

  const isElectronic = !!ecfConfig?.is_active;

  const plan = plans.find(p => p.id === user?.tenant?.plan_id) || (user ? getTenantPlan(user.tenant) : null);
  const canSeeFiscal = isModuleEnabled(user?.tenant || null, "facturacion_fiscal", plan || undefined);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["gastos", tenantId] });
    queryClient.invalidateQueries({ queryKey: ["ecf-documents", tenantId] });
    queryClient.invalidateQueries({ queryKey: ["ecf-sequences", tenantId] });
    queryClient.invalidateQueries({ queryKey: ["caja", tenantId] });
  };

  // Segmentación de Gastos
  const manualGastos = useMemo(() => gastos.filter(g => !g.is_caja_chica), [gastos]);
  const cajaChicaGastos = useMemo(() => gastos.filter(g => g.is_caja_chica), [gastos]);

  // Lista activa de gastos según tab seleccionado
  const currentList = useMemo(() => {
    if (activeTab === "manual") return manualGastos;
    if (activeTab === "caja-chica") return cajaChicaGastos;
    return [];
  }, [activeTab, manualGastos, cajaChicaGastos]);

  // Filtrado temporal y por búsqueda
  const filteredList = useMemo(() => {
    let list = currentList;
    const now = new Date();

    // Filtro de fecha
    if (dateFilter === "today") {
      const todayStr = now.toISOString().slice(0, 10);
      list = list.filter(g => (g.fecha || "").startsWith(todayStr));
    } else if (dateFilter === "yesterday") {
      const yesterday = new Date(now.getTime() - 86400000);
      const yStr = yesterday.toISOString().slice(0, 10);
      list = list.filter(g => (g.fecha || "").startsWith(yStr));
    } else if (dateFilter === "7d") {
      const past7 = new Date(now.getTime() - 7 * 86400000);
      past7.setHours(0, 0, 0, 0);
      list = list.filter(g => new Date(g.fecha) >= past7);
    } else if (dateFilter === "this_month") {
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      list = list.filter(g => (g.fecha || "").startsWith(ym));
    } else if (dateFilter === "this_year") {
      const y = `${now.getFullYear()}`;
      list = list.filter(g => (g.fecha || "").startsWith(y));
    } else if (dateFilter === "month_select") {
      const ym = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
      list = list.filter(g => (g.fecha || "").startsWith(ym));
    } else if (dateFilter === "custom") {
      if (customStartDate && customEndDate) {
        list = list.filter(g => {
          const f = (g.fecha || "").slice(0, 10);
          return f >= customStartDate && f <= customEndDate;
        });
      } else if (customStartDate) {
        list = list.filter(g => (g.fecha || "").slice(0, 10) >= customStartDate);
      } else if (customEndDate) {
        list = list.filter(g => (g.fecha || "").slice(0, 10) <= customEndDate);
      }
    }

    // Filtro por categoría
    if (selectedCategory !== "all") {
      list = list.filter(g => g.categoria === selectedCategory);
    }

    // Búsqueda
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(g => 
        (g.descripcion && g.descripcion.toLowerCase().includes(q)) ||
        (g.proveedor && g.proveedor.toLowerCase().includes(q)) ||
        (g.categoria && g.categoria.toLowerCase().includes(q)) ||
        (g.metodo_pago && g.metodo_pago.toLowerCase().includes(q)) ||
        String(g.monto).includes(q)
      );
    }

    return list;
  }, [currentList, dateFilter, selectedMonth, selectedYear, customStartDate, customEndDate, selectedCategory, searchQuery]);

  // Métricas Financieras
  const totalEgresosGlobal = useMemo(() => gastos.reduce((s, g) => s + (g.monto || 0), 0), [gastos]);
  const totalManuales = useMemo(() => manualGastos.reduce((s, g) => s + (g.monto || 0), 0), [manualGastos]);
  const totalCajaChica = useMemo(() => cajaChicaGastos.reduce((s, g) => s + (g.monto || 0), 0), [cajaChicaGastos]);

  // Desglose por categoría de todos los gastos
  const porCategoria = useMemo(() => {
    return gastos.reduce((m, g) => {
      m[g.categoria] = (m[g.categoria] || 0) + (g.monto || 0);
      return m;
    }, {} as Record<string, number>);
  }, [gastos]);

  // Categoría de mayor impacto
  const topCategoria = useMemo(() => {
    const entries = Object.entries(porCategoria);
    if (entries.length === 0) return { name: "Sin egresos", amount: 0, pct: 0 };
    entries.sort((a, b) => b[1] - a[1]);
    const top = entries[0];
    const sum = entries.reduce((s, e) => s + e[1], 0);
    const pct = sum > 0 ? Math.round((top[1] / sum) * 100) : 0;
    return { name: top[0], amount: top[1], pct };
  }, [porCategoria]);

  const exportData = useMemo(() => {
    if (activeTab === "caja-chica") {
      return {
        filename: "Gastos_Caja_Chica",
        columns: ["Fecha", "Categoría", "Descripción", "Método de Pago", "Monto"],
        data: cajaChicaGastos.map(g => [
          formatDateRD(g.fecha),
          g.categoria,
          g.descripcion,
          g.metodo_pago,
          formatRD(g.monto)
        ])
      };
    }
    return {
      filename: "Gastos_Manuales",
      columns: ["Fecha", "Categoría", "Descripción", "Proveedor", "Método de Pago", "Monto"],
      data: manualGastos.map(g => [
        formatDateRD(g.fecha),
        g.categoria,
        g.descripcion,
        g.proveedor || "—",
        g.metodo_pago,
        formatRD(g.monto)
      ])
    };
  }, [activeTab, manualGastos, cajaChicaGastos]);

  if (!user || user.tenant.id === "__loading__" || (loadingGastos && rawGastos.length === 0)) {
    return <GlobalPageLoader text="Cargando egresos y gastos..." />;
  }

  return (
    <Tabs 
      value={activeTab} 
      onValueChange={(t) => { setActiveTab(t); setSelectedCategory("all"); }} 
      className="space-y-6 pb-12 animate-in fade-in-50 duration-300 w-full"
    >
      {/* HEADER DE PÁGINA CON PESTAÑAS /ADMIN INTEGRADAS */}
      <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-3.5 sm:gap-4">
        {/* Título, Contador & Tabs */}
        <div className="flex flex-wrap items-center gap-3.5 sm:gap-5">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-black text-foreground tracking-tight">Gastos</h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              {activeTab === "manual" ? manualGastos.length : cajaChicaGastos.length} egresos registrados
            </p>
          </div>

          {/* PESTAÑAS ESTILO /ADMIN (STANDALONE BUTTONS CON COLORES DIFERENCIADOS) */}
          <TabsList className="flex items-center gap-2 bg-transparent p-0 border-none h-auto justify-start overflow-x-auto scrollbar-none">
            {/* Gastos Manuales (Azul Añil / Primary) */}
            <TabsTrigger 
              value="manual"
              className="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-surface border border-border/80 text-foreground shadow-xs data-[state=active]:bg-[#1B4B73] data-[state=active]:text-white data-[state=active]:border-[#1B4B73] data-[state=active]:shadow-md transition-all hover:bg-muted/60 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Receipt className={`h-4 w-4 shrink-0 transition-colors ${
                activeTab === "manual" ? "text-[#F0B900]" : "text-[#1B4B73] dark:text-sky-400"
              }`} />
              <span>Gastos Manuales</span>
              <span className={`ml-0.5 rounded-full px-2 py-0.5 text-[10px] font-black leading-none ${
                activeTab === "manual" ? "bg-white/20 text-white" : "bg-[#1B4B73]/10 text-[#1B4B73] dark:bg-sky-950 dark:text-sky-300"
              }`}>
                {manualGastos.length}
              </span>
            </TabsTrigger>

            {/* Caja Chica (Ámbar / Oro) */}
            <TabsTrigger 
              value="caja-chica"
              className="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-surface border border-border/80 text-foreground shadow-xs data-[state=active]:bg-amber-600 data-[state=active]:text-white data-[state=active]:border-amber-600 data-[state=active]:shadow-md transition-all hover:bg-muted/60 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <PiggyBank className={`h-4 w-4 shrink-0 transition-colors ${
                activeTab === "caja-chica" ? "text-white" : "text-amber-600 dark:text-amber-400"
              }`} />
              <span>Caja Chica</span>
              <span className={`ml-0.5 rounded-full px-2 py-0.5 text-[10px] font-black leading-none ${
                activeTab === "caja-chica" ? "bg-white/20 text-white" : "bg-amber-500/15 text-amber-800 dark:text-amber-300"
              }`}>
                {cajaChicaGastos.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                className="flex items-center gap-2 rounded-xl h-10 px-3.5 sm:px-4 font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
              >
                <Download className="h-4 w-4 text-[#F0B900] shrink-0" />
                <span>Exportar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-2xl shadow-xl p-1.5">
              <DropdownMenuItem 
                className="gap-2 cursor-pointer py-2 rounded-xl text-xs font-bold" 
                onClick={() => exportToCsv(exportData.filename, exportData.columns, exportData.data)}
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="gap-2 cursor-pointer py-2 rounded-xl text-xs font-bold" 
                onClick={() => setIsPrinting(true)}
              >
                <Printer className="h-4 w-4 text-rose-600" /> PDF / Impresión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            type="button"
            className="flex items-center gap-2 rounded-xl h-10 px-3.5 sm:px-4 font-bold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0" 
            onClick={() => setIsPrinting(true)}
          >
            <Printer className="h-4 w-4 text-white shrink-0" />
            <span>Imprimir</span>
          </Button>

          {/* Botón 1: NUEVA COMPRA (E41 - Proveedores Informales con Retención) */}
          <Button 
            type="button"
            onClick={() => setShowCompraModal(true)} 
            className="flex items-center gap-2 rounded-xl h-10 px-3.5 sm:px-4 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs border border-blue-600 cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
          >
            <ShoppingBag className="h-4 w-4 text-white shrink-0" />
            <span>Nueva Compra</span>
          </Button>

          {/* Botón 2: NUEVO GASTO (E43 - Gastos Menores / Control Interno) */}
          <Button 
            type="button"
            onClick={() => setShowGastoModal(true)} 
            className="flex items-center gap-2 rounded-xl h-10 px-3.5 sm:px-4.5 font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
          >
            <Plus className="h-4 w-4 text-[#F0B900] shrink-0" />
            <span>Nuevo Gasto</span>
          </Button>
        </div>
      </div>

      {/* 4 EXECUTIVE KPI CARDS (EXACTO ESTILO /CAJA) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Total Egresos Globales (Variant: Solid Azul Añil #1B4B73) */}
        <Card className="p-4 sm:p-4.5 rounded-2xl bg-[#1B4B73] text-white shadow-md border-0 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-[13px] uppercase tracking-wider text-white/90 font-black">Total Egresos</span>
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-[#F0B900]" />
          </div>
          <div className="my-1.5 font-display font-black tracking-tight text-white text-xl sm:text-2xl truncate" title={formatRD(totalEgresosGlobal)}>
            {formatRD(totalEgresosGlobal)}
          </div>
          <div className="text-xs sm:text-[13px] font-semibold truncate text-white/90">
            {gastos.length} Operaciones registradas
          </div>
        </Card>

        {/* 2. Gastos Manuales Operativos (Variant: Rose) */}
        <Card className="p-4 sm:p-4.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-[13px] uppercase tracking-wider text-rose-800 dark:text-rose-300 font-black">Gastos Operativos</span>
            <Receipt className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="my-1.5 font-display font-black tracking-tight text-foreground text-xl sm:text-2xl truncate" title={formatRD(totalManuales)}>
            {formatRD(totalManuales)}
          </div>
          <div className="text-xs sm:text-[13px] font-bold truncate text-rose-800 dark:text-rose-300">
            {manualGastos.length} Egresos directos
          </div>
        </Card>

        {/* 3. Caja Chica / Gastos Menores (Variant: Amber) */}
        <Card className="p-4 sm:p-4.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-[13px] uppercase tracking-wider text-amber-800 dark:text-amber-300 font-black">Caja Chica</span>
            <PiggyBank className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="my-1.5 font-display font-black tracking-tight text-foreground text-xl sm:text-2xl truncate" title={formatRD(totalCajaChica)}>
            {formatRD(totalCajaChica)}
          </div>
          <div className="text-xs sm:text-[13px] font-bold truncate text-amber-800 dark:text-amber-300">
            {cajaChicaGastos.length} Compras menores
          </div>
        </Card>

        {/* 4. Mayor Impacto Presupuestario (Variant: Indigo) */}
        <Card className="p-4 sm:p-4.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-[13px] uppercase tracking-wider text-indigo-800 dark:text-indigo-300 font-black">Mayor Categoría</span>
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="my-1.5 font-display font-black tracking-tight text-foreground text-xl sm:text-2xl truncate capitalize" title={topCategoria.name}>
            {topCategoria.name}
          </div>
          <div className="text-xs sm:text-[13px] font-bold truncate text-indigo-800 dark:text-indigo-300">
            {formatRD(topCategoria.amount)} ({topCategoria.pct}%)
          </div>
        </Card>
      </div>

      {/* CONTENIDO DE PESTAÑA */}
      <div className="space-y-5">

        {/* BARRA DE CATEGORÍAS RÁPIDAS (ESTILO BADGES /ORDENES) */}
        {Object.entries(porCategoria).length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 custom-scrollbar">
            {/* Botón Todas */}
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap hover:shadow-xs ${
                selectedCategory === "all"
                  ? "bg-[#183659] text-white border-[#183659] shadow-md"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
              <span>Todas</span>
              <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none ${
                selectedCategory === "all" ? "bg-white/25 text-white" : "bg-black/10 dark:bg-white/10 text-slate-800 dark:text-slate-200"
              }`}>
                {currentList.length}
              </span>
            </button>

            {/* Categorías individuales */}
            {Object.entries(porCategoria).map(([cat, val]) => {
              const catVisual = getGastoCategoriaVisual(cat);
              const Icon = catVisual.icon;
              const count = currentList.filter(g => g.categoria === cat).length;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(isSelected ? "all" : cat)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap hover:shadow-xs ${
                    isSelected ? catVisual.pillActive : catVisual.pillBg
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="capitalize">{catVisual.label}</span>
                  <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none ${
                    isSelected ? "bg-white/25 text-white" : catVisual.innerBadge
                  }`}>
                    {count}
                  </span>
                  <span className={`text-[11px] font-black tracking-tight ${isSelected ? "text-white" : "text-foreground font-extrabold"}`}>
                    · {formatRD(val)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* BARRA DE FILTROS & BÚSQUEDA */}
        {activeTab !== "fiscal" && (
          <div className="bg-surface p-3 sm:p-3.5 rounded-2xl border border-border/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Input de Búsqueda */}
            <div className="relative w-full md:flex-1 md:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por concepto, proveedor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9.5 h-10 rounded-xl bg-background border-border/60 text-xs sm:text-sm font-medium focus-visible:ring-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs cursor-pointer p-0.5"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Controles de Filtro Temporal: Píldoras (Todo, 7 días) + Mes/Año + Rango */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-start md:justify-end shrink-0">
              {/* Píldoras: Todo el histórico y Últimos 7 días */}
              <div className="flex items-center gap-1.5">
                {[
                  { id: "all", label: "Todo el histórico" },
                  { id: "7d", label: "Últimos 7 días" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setDateFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap border ${
                      dateFilter === f.id
                        ? "bg-[#1B4B73] text-white border-[#1B4B73] shadow-xs"
                        : "bg-surface border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Selector de Mes / Año */}
              <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border/80 shadow-2xs">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground ml-2 shrink-0" />
                <Select
                  value={dateFilter === "all" ? "all" : String(selectedMonth)}
                  onValueChange={(val) => {
                    if (val === "all") {
                      setDateFilter("all");
                    } else {
                      setSelectedMonth(Number(val));
                      setDateFilter("month_select");
                    }
                  }}
                >
                  <SelectTrigger className="h-8 border-none bg-transparent text-xs font-bold w-[125px] focus:ring-0 shadow-none px-2 cursor-pointer">
                    <SelectValue placeholder="Mes" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl shadow-xl max-h-60">
                    <SelectItem value="all" className="text-xs font-bold cursor-pointer rounded-xl">
                      Todo el año
                    </SelectItem>
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
                    if (dateFilter !== "all" && dateFilter !== "custom") {
                      setDateFilter("month_select");
                    }
                  }}
                >
                  <SelectTrigger className="h-8 border-none bg-transparent text-xs font-bold w-[75px] focus:ring-0 shadow-none px-2 border-l border-border/50 cursor-pointer">
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
                    className={`h-10 px-3.5 rounded-xl text-xs font-bold border-border/80 gap-1.5 cursor-pointer shadow-2xs ${
                      dateFilter === "custom" ? "bg-[#1B4B73] text-white border-[#1B4B73]" : "bg-surface hover:bg-muted"
                    }`}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 text-[#F0B900]" />
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
                        className="h-9 rounded-xl bg-background border border-border/80 text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">Fecha Hasta</label>
                      <Input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="h-9 rounded-xl bg-background border border-border/80 text-xs font-medium"
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
                      className="flex-1 h-8 rounded-xl text-xs font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white cursor-pointer"
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
            </div>
          </div>
        )}

        {/* TAB 1: GASTOS MANUALES */}
        <TabsContent value="manual" className="space-y-4 m-0">
          <Card className="overflow-hidden rounded-3xl border border-border/80 shadow-card bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border/80 bg-muted/40 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3.5 text-left">Fecha</th>
                    <th className="px-5 py-3.5 text-left">Categoría</th>
                    <th className="px-5 py-3.5 text-left">Concepto & Detalle</th>
                    <th className="px-5 py-3.5 text-left">Proveedor / Beneficiario</th>
                    <th className="px-5 py-3.5 text-left">Método de Pago</th>
                    <th className="px-5 py-3.5 text-right">Monto</th>
                    <th className="px-5 py-3.5 text-center w-16">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredList.map((g) => {
                    const catVisual = getGastoCategoriaVisual(g.categoria);
                    const metodoVisual = getGastoMetodoVisual(g.metodo_pago);
                    const CatIcon = catVisual.icon;
                    const MetIcon = metodoVisual.icon;
                    return (
                      <tr key={g.id} className="hover:bg-muted/30 transition-colors group">
                        {/* Fecha */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-muted text-muted-foreground shrink-0">
                              <Calendar className="h-3.5 w-3.5" />
                            </span>
                            <span className="text-xs font-bold text-foreground">
                              {formatDateRD(g.fecha)}
                            </span>
                          </div>
                        </td>

                        {/* Categoría */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-2xs ${catVisual.chipBg}`}>
                            <CatIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="capitalize">{catVisual.label}</span>
                          </span>
                        </td>

                        {/* Concepto / Descripción */}
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-foreground text-xs block">
                              {g.descripcion}
                            </span>
                            {g.ncf && (
                              <Badge variant="outline" className="font-mono text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs">
                                {g.ncf}
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* Proveedor */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {g.proveedor ? (
                            <div className="flex items-center gap-2">
                              <span className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] flex items-center justify-center shrink-0">
                                {g.proveedor.slice(0, 1).toUpperCase()}
                              </span>
                              <span className="text-xs font-semibold text-foreground truncate max-w-[150px]">
                                {g.proveedor}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">—</span>
                          )}
                        </td>

                        {/* Método de Pago */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border shadow-2xs ${metodoVisual.badgeClass}`}>
                            <MetIcon className="h-3 w-3" />
                            {metodoVisual.label}
                          </span>
                        </td>

                        {/* Monto */}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <span className="font-display font-black text-rose-600 dark:text-rose-400 text-sm">
                            {formatRD(g.monto)}
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="px-5 py-3.5 text-center">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-3xl border border-border shadow-2xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="font-display font-bold">¿Eliminar registro de gasto?</AlertDialogTitle>
                                <AlertDialogDescription className="text-xs">
                                  Esta acción eliminará de forma permanente el gasto de <strong className="text-rose-600">{formatRD(g.monto)}</strong> correspondiente a <em>"{g.descripcion}"</em>.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl text-xs font-bold">Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={async () => { 
                                    try {
                                      await deleteGasto(g.id, tenantId); 
                                      refresh(); 
                                      toast.success("Gasto eliminado correctamente 🗑️"); 
                                    } catch (err: any) {
                                      console.error("Error al eliminar gasto:", err);
                                      toast.error(err?.message || "Error al eliminar gasto");
                                    }
                                  }} 
                                  className="bg-destructive text-white rounded-xl text-xs font-bold"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center max-w-md mx-auto px-4 space-y-3">
                          <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/60 p-4 text-rose-600 shadow-2xs">
                            <Receipt className="h-8 w-8" />
                          </div>
                          <h3 className="font-display text-base font-bold text-foreground">
                            {searchQuery || selectedCategory !== "all" || dateFilter !== "all" 
                              ? "No se encontraron egresos con estos filtros" 
                              : "¡Sin gastos manuales registrados!"}
                          </h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {searchQuery || selectedCategory !== "all" || dateFilter !== "all"
                              ? "Intenta modificar tu búsqueda o limpiar los filtros seleccionados."
                              : "Registra los egresos operativos (renta, luz, nómina) para mantener un balance financiero exacto."}
                          </p>
                          <Button 
                            onClick={() => setShow(true)} 
                            className="bg-gradient-primary text-white font-bold rounded-xl text-xs shadow-md mt-2"
                          >
                            <Plus className="mr-1.5 h-3.5 w-3.5" /> Registrar primer gasto
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 2: CAJA CHICA */}
        <TabsContent value="caja-chica" className="space-y-4 m-0">
          <Card className="overflow-hidden rounded-3xl border border-border/80 shadow-card bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border/80 bg-muted/40 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3.5 text-left">Fecha</th>
                    <th className="px-5 py-3.5 text-left">Categoría</th>
                    <th className="px-5 py-3.5 text-left">Concepto & Compra Menor</th>
                    <th className="px-5 py-3.5 text-left">Método</th>
                    <th className="px-5 py-3.5 text-right">Monto Descontado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredList.map((g) => {
                    const catVisual = getGastoCategoriaVisual(g.categoria);
                    const CatIcon = catVisual.icon;
                    return (
                      <tr key={g.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-muted text-muted-foreground shrink-0">
                              <Calendar className="h-3.5 w-3.5" />
                            </span>
                            <span className="text-xs font-bold text-foreground">
                              {formatDateRD(g.fecha)}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-2xs ${catVisual.chipBg}`}>
                            <CatIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="capitalize">{catVisual.label}</span>
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-foreground text-xs block">
                              {g.descripcion}
                            </span>
                            {g.ncf && (
                              <Badge variant="outline" className="font-mono text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs">
                                {g.ncf}
                              </Badge>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800 shadow-2xs">
                            <Coins className="h-3 w-3" />
                            Caja Chica (Efectivo)
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <span className="font-display font-black text-rose-600 dark:text-rose-400 text-sm">
                            {formatRD(g.monto)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center max-w-md mx-auto px-4 space-y-3">
                          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/60 p-4 text-amber-600 shadow-2xs">
                            <PiggyBank className="h-8 w-8" />
                          </div>
                          <h3 className="font-display text-base font-bold text-foreground">
                            Sin egresos de caja chica
                          </h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Aquí aparecerán los gastos menores o compras de suministros descontados directamente de los fondos de caja chica.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </div>

      {/* MODAL 1: REGISTRAR NUEVO GASTO (E43 / INTERNO) */}
      <NewGasto 
        open={showGastoModal} 
        onOpenChange={setShowGastoModal} 
        tenant={user.tenant}
        tenantConfig={user.tenantConfig}
        ecfConfig={ecfConfig}
        tenantId={user.tenant.id} 
        empleadoId={user.empleado.id} 
        onDone={() => { refresh(); setShowGastoModal(false); }} 
      />

      {/* MODAL 2: REGISTRAR NUEVA COMPRA FISCAL (E41 · PROVEEDORES INFORMALES) */}
      <NewCompraModal
        open={showCompraModal}
        onOpenChange={setShowCompraModal}
        tenant={user.tenant}
        tenantConfig={user.tenantConfig}
        ecfConfig={ecfConfig}
        tenantId={user.tenant.id}
        empleadoId={user.empleado.id}
        onDone={() => { refresh(); setShowCompraModal(false); }}
      />

      {/* PORTAL DE IMPRESIÓN */}
      {isPrinting && (
        <GastosPrintPortal 
          activeTab={activeTab}
          tenant={user.tenant}
          manualGastos={manualGastos}
          cajaChicaGastos={cajaChicaGastos}
          onClose={() => setIsPrinting(false)}
        />
      )}
    </Tabs>
  );
}

// ==========================================
// MODAL 1: NUEVO GASTO MENOR (CON PLANTILLAS DE CONCEPTOS Y FECHAS DINÁMICAS)
// ==========================================
const SUGERENCIAS_GASTOS_MENORES = [
  { label: "Café", icon: Coffee },
  { label: "Agua", icon: Droplets },
  { label: "Desayuno", icon: Utensils },
  { label: "Almuerzo", icon: UtensilsCrossed },
  { label: "Merienda", icon: Cookie },
  { label: "Transporte", icon: Bus },
  { label: "Taxi", icon: Car },
  { label: "Combustible", icon: Fuel },
  { label: "Parqueo", icon: Car },
  { label: "Peaje", icon: Milestone },
  { label: "Papelería", icon: Pencil },
  { label: "Fotocopias", icon: Printer },
  { label: "Limpieza", icon: Sparkles },
  { label: "Mensajería", icon: Package },
  { label: "Ferretería", icon: Wrench },
  { label: "Propina", icon: Banknote },
];

interface GastoConceptoItem {
  id: string;
  fecha: string;
  descripcion: string;
  monto: number;
  rawMonto: string;
}

function formatToDMY(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length === 3) {
    return `${parts[2].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[0]}`;
  }
  return isoDate;
}

// Componente de Selección de Fecha formato Día/Mes/Año (DD/MM/AAAA) con Popover Calendario
function DMYDatePicker({
  value,
  onChange,
  className,
}: {
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const dateObj = useMemo(() => {
    if (!value) return new Date();
    const parts = value.split("-").map(Number);
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return new Date();
  }, [value]);

  const displayStr = useMemo(() => {
    if (!value) return "";
    const parts = value.split("-");
    if (parts.length === 3) {
      return `${parts[2].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[0]}`;
    }
    return value;
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center justify-between text-left font-mono font-medium rounded-xl bg-surface border border-border/80 text-xs px-2.5 transition-all hover:bg-muted/40 hover:border-blue-400 cursor-pointer shadow-2xs select-none",
            className
          )}
        >
          <span className="truncate">{displayStr || "DD/MM/AAAA"}</span>
          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50 rounded-2xl shadow-xl border border-border bg-background" align="start">
        <CalendarComponent
          mode="single"
          selected={dateObj}
          onSelect={(d) => {
            if (d) {
              const yyyy = d.getFullYear();
              const mm = String(d.getMonth() + 1).padStart(2, "0");
              const dd = String(d.getDate()).padStart(2, "0");
              onChange(`${yyyy}-${mm}-${dd}`);
              setOpen(false);
            }
          }}
          initialFocus
          locale={es}
        />
      </PopoverContent>
    </Popover>
  );
}

function NewGasto({ 
  open, 
  onOpenChange, 
  tenant,
  tenantConfig,
  ecfConfig,
  tenantId, 
  empleadoId, 
  onDone 
}: { 
  open: boolean; 
  onOpenChange: (o: boolean) => void; 
  tenant?: Tenant;
  tenantConfig?: TenantConfig;
  ecfConfig?: any;
  tenantId: string; 
  empleadoId: string; 
  onDone: () => void;
}) {
  const isElectronic = !!ecfConfig?.is_active || !!ecfConfig?.ef2_environment || !!tenant?.rnc;

  const todayStr = new Date().toISOString().split("T")[0];
  const [step, setStep] = useState<1 | 2>(1);
  const [fechaDocumento, setFechaDocumento] = useState(todayStr);
  const [items, setItems] = useState<GastoConceptoItem[]>([
    { id: uid("it"), fecha: todayStr, descripcion: "", monto: 0, rawMonto: "" }
  ]);
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [showBeneficiario, setShowBeneficiario] = useState(false);
  const [proveedor, setProveedor] = useState("");
  const [emitirFiscal, setEmitirFiscal] = useState(isElectronic);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().split("T")[0];
      setStep(1);
      setFechaDocumento(today);
      setItems([{ id: uid("it"), fecha: today, descripcion: "", monto: 0, rawMonto: "" }]);
      setMetodoPago("Efectivo");
      setShowBeneficiario(false);
      setProveedor("");
      setEmitirFiscal(isElectronic);
    }
  }, [open, isElectronic]);

  const totalMonto = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.monto || 0), 0);
  }, [items]);

  const validItems = useMemo(() => {
    return items.filter(it => it.descripcion.trim() && it.monto > 0);
  }, [items]);

  function handleAddSuggestion(label: string) {
    if (items.length === 1 && !items[0].descripcion.trim() && items[0].monto === 0) {
      setItems([{ ...items[0], descripcion: label, fecha: fechaDocumento }]);
    } else {
      setItems(prev => [
        ...prev,
        { id: uid("it"), fecha: fechaDocumento, descripcion: label, monto: 0, rawMonto: "" }
      ]);
    }
  }

  function handleAddBlankItem() {
    setItems(prev => [
      ...prev,
      { id: uid("it"), fecha: fechaDocumento, descripcion: "", monto: 0, rawMonto: "" }
    ]);
  }

  function handleUpdateItem(id: string, field: keyof GastoConceptoItem, value: any) {
    setItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      if (field === "rawMonto") {
        const formatted = formatAmountInput(value);
        return { ...it, rawMonto: formatted, monto: parseAmount(formatted) };
      }
      return { ...it, [field]: value };
    }));
  }

  function handleRemoveItem(id: string) {
    setItems(prev => {
      const next = prev.filter(it => it.id !== id);
      if (next.length === 0) {
        return [{ id: uid("it"), fecha: fechaDocumento, descripcion: "", monto: 0, rawMonto: "" }];
      }
      return next;
    });
  }

  function handleNextStep() {
    if (validItems.length === 0) {
      toast.error("Ingresa al menos un concepto con monto mayor a RD$0.00");
      return;
    }
    if (totalMonto <= 0) {
      toast.error("El monto total a registrar debe ser mayor a RD$0.00");
      return;
    }
    setStep(2);
  }

  async function submit() {
    if (validItems.length === 0) {
      toast.error("Ingresa al menos un concepto con monto mayor a RD$0.00");
      setStep(1);
      return;
    }

    if (totalMonto <= 0) {
      toast.error("El monto total a registrar debe ser mayor a RD$0.00");
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      const gastoId = uid("gas");
      let emittedNcf: string | undefined = undefined;
      let emittedType: string | undefined = undefined;
      let emittedStatus: string | undefined = undefined;
      let emittedTrackId: string | undefined = undefined;
      let emittedQr: string | undefined = undefined;

      const conceptoResumen = validItems.map(it => it.descripcion.trim()).join(", ");

      // Emisión Fiscal automática E43 ante la DGII si está activada
      if (isElectronic && emitirFiscal && tenant) {
        try {
          toast.info("Emitiendo Comprobante de Gastos Menores (E43) ante la DGII...");

          const dummyOrder: Orden = {
            id: gastoId,
            tenant_id: tenant.id,
            numero: `EXP-${Date.now().toString().slice(-6)}`,
            cliente_nombre: conceptoResumen,
            total: totalMonto,
            subtotal: totalMonto,
            itbis: 0,
            descuento: 0,
            estado: "ENTREGADO",
            metodo_pago: metodoPago === "Cheque" ? "EFECTIVO" : (metodoPago.toUpperCase() as MetodoPago),
            tipo_ecf: "E43",
            saldo: 0,
            creado_en: `${fechaDocumento}T12:00:00.000Z`,
            items: validItems.map(it => ({
              descripcion: it.descripcion,
              cantidad: 1,
              precio_unitario: it.monto,
              is_exento: true,
            })),
          } as any;

          const res = await emitirECF(
            dummyOrder,
            { id: "expense", nombre: conceptoResumen, cedula: "" } as any,
            undefined,
            (tenantConfig || { ncf_secuencia: "E43", itbis_incluido: false }) as any,
            tenant,
            "E43"
          );

          emittedNcf = res.encf;
          emittedType = "E43";
          emittedStatus = res.legal_status || "ACCEPTED";
          emittedTrackId = res.track_id;
          emittedQr = res.qr_content;
        } catch (fiscalErr: any) {
          console.error("Error al emitir e-CF de gasto menor:", fiscalErr);
          toast.error(`Aviso DGII: ${fiscalErr.message || "No se pudo emitir el e-CF"}`);
        }
      }

      await saveGasto({ 
        id: gastoId, 
        tenant_id: tenantId, 
        empleado_id: empleadoId, 
        categoria: "Suministros",
        descripcion: conceptoResumen,
        monto: totalMonto, 
        metodo_pago: metodoPago, 
        proveedor: (showBeneficiario && proveedor.trim()) ? proveedor.trim() : undefined, 
        ncf: emittedNcf,
        tipo_ecf: emittedType,
        ecf_status: emittedStatus,
        ecf_track_id: emittedTrackId,
        ecf_qr: emittedQr,
        fecha: `${fechaDocumento}T12:00:00.000Z`, 
        aprobado: true 
      });
      
      try {
        const caja = await getCajaAbierta(tenantId);
        if (caja) {
          const metodo = metodoPago === "Cheque" ? "EFECTIVO" : (metodoPago.toUpperCase() as MetodoPago);
          await saveMovimiento({
            id: uid("mov"),
            tenant_id: tenantId,
            caja_id: caja.id,
            empleado_id: empleadoId,
            tipo: "EGRESO",
            concepto: `Gasto Menor: ${conceptoResumen}${emittedNcf ? ` (${emittedNcf})` : ""}`,
            monto: totalMonto,
            metodo,
            referencia: gastoId,
            creado_en: `${fechaDocumento}T12:00:00.000Z`,
          });
        }
      } catch (cajaErr) {
        console.error("Error al registrar movimiento en caja:", cajaErr);
      }

      if (emittedNcf) {
        toast.success(`Gasto registrado y comprobante ${emittedNcf} emitido ante la DGII ✓`); 
      } else {
        toast.success("Gasto registrado correctamente ✅"); 
      }
      onDone();
    } catch (err: any) {
      console.error("Error al registrar gasto:", err);
      toast.error(err?.message || "Error al registrar gasto");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-lg sm:max-w-xl p-0 gap-0 overflow-hidden border-none shadow-2xl bg-background text-foreground max-h-[88vh] flex flex-col">
        {/* Cabecera Azul con Stepper Wizard Compacto */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white p-3.5 sm:p-4 pb-2.5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 pr-3">
              <div className="h-9 w-9 rounded-xl bg-white/20 text-white flex items-center justify-center border border-white/25 shadow-2xs shrink-0">
                <Coffee className="h-4.5 w-4.5" />
              </div>
              <div>
                <DialogTitle className="text-sm sm:text-base font-display font-black text-white leading-tight">
                  Registrar gasto menor
                </DialogTitle>
                <p className="text-[10.5px] sm:text-[11px] text-blue-100/90 mt-0.5">
                  {step === 1
                    ? "Paso 1: Agrega la fecha y conceptos con sus montos"
                    : "Paso 2: Selecciona el canal de pago y opciones fiscales"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-white/20 text-white text-[11px] font-bold font-mono border border-white/25 shadow-2xs">
                E43
              </span>
            </div>
          </div>

          {/* Stepper Buttons (Centered Compact Pills) */}
          <div className="grid grid-cols-2 gap-1 p-0.5 rounded-xl bg-black/20 backdrop-blur-xs mt-2.5 border border-white/10">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                step === 1
                  ? "bg-white text-blue-800 shadow-sm font-black"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <span
                className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[10.5px] font-black ${
                  step === 1
                    ? "bg-blue-800 text-white"
                    : "bg-white/20 text-white"
                }`}
              >
                1
              </span>
              <span>Conceptos & Montos</span>
            </button>

            <button
              type="button"
              onClick={handleNextStep}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                step === 2
                  ? "bg-white text-blue-800 shadow-sm font-black"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <span
                className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[10.5px] font-black ${
                  step === 2
                    ? "bg-blue-800 text-white"
                    : "bg-white/20 text-white"
                }`}
              >
                2
              </span>
              <span>Pago & Fiscal</span>
            </button>
          </div>
        </div>

        {/* Contenido Dinámico por Paso */}
        <div className="p-3.5 sm:p-4 overflow-y-auto flex-1 space-y-3 sm:space-y-3.5">
          {/* ======================================================== */}
          {/* PASO 1: Fecha de Emisión y Filas de Conceptos */}
          {/* ======================================================== */}
          {step === 1 && (
            <div className="space-y-3 animate-in fade-in-50 duration-200">
              {/* Fecha de Emisión del Documento en formato DD/MM/AAAA */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">Fecha de emisión del documento</Label>
                <DMYDatePicker
                  value={fechaDocumento}
                  onChange={(newDate) => {
                    setFechaDocumento(newDate);
                    setItems(prev => prev.map(it => ({ ...it, fecha: newDate })));
                  }}
                  className="h-9.5 w-full rounded-xl"
                />
              </div>

              {/* Sección de Conceptos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs sm:text-sm font-bold text-foreground">Conceptos</Label>
                  <span className="text-[10.5px] text-muted-foreground">Cada concepto puede tener su propia fecha</span>
                </div>

                {/* Sugerencias (Chips de Plantillas) */}
                <div className="space-y-1">
                  <span className="text-[10.5px] font-bold text-muted-foreground">Sugerencias:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {SUGERENCIAS_GASTOS_MENORES.map((sug) => {
                      const Icon = sug.icon;
                      return (
                        <button
                          key={sug.label}
                          type="button"
                          onClick={() => handleAddSuggestion(sug.label)}
                          className="px-2 py-0.5 rounded-full border border-dashed border-border/80 bg-surface hover:bg-blue-50/70 dark:hover:bg-blue-950/40 hover:border-blue-400 text-foreground text-[10.5px] font-medium flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-2xs"
                        >
                          <Icon className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                          <span>{sug.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Filas de Conceptos Dinámicas */}
                <div className="space-y-1.5 pt-0.5">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-1.5 animate-in fade-in-50 duration-200">
                      {/* Fecha Individual del Concepto (Día/Mes/Año) */}
                      <DMYDatePicker
                        value={item.fecha}
                        onChange={(d) => handleUpdateItem(item.id, "fecha", d)}
                        className="h-9 w-28 sm:w-30 shrink-0"
                      />

                      {/* Nombre del Concepto */}
                      <Input
                        placeholder="Ej. Combustible, Agua..."
                        value={item.descripcion}
                        onChange={(e) => handleUpdateItem(item.id, "descripcion", e.target.value)}
                        className="h-9 flex-1 rounded-xl bg-surface border border-border/80 text-xs shadow-2xs"
                      />

                      {/* Monto con Separador de Miles */}
                      <div className="relative w-24 sm:w-28 shrink-0 flex items-center rounded-xl bg-surface border border-border/80 shadow-2xs focus-within:border-blue-500 overflow-hidden">
                        <span className="pl-2 font-display font-black text-[11px] text-muted-foreground select-none">
                          RD$
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={item.rawMonto}
                          onChange={(e) => handleUpdateItem(item.id, "rawMonto", e.target.value)}
                          className="w-full h-9 pl-1 pr-2 bg-transparent text-xs font-black font-display text-foreground focus:outline-none"
                        />
                      </div>

                      {/* Botón Eliminar Fila */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="h-8.5 w-8.5 rounded-xl flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all cursor-pointer shrink-0"
                        title="Eliminar concepto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Botón Agregar Otro Concepto */}
                <button
                  type="button"
                  onClick={handleAddBlankItem}
                  className="w-full py-2 rounded-xl border-2 border-dashed border-blue-400/60 hover:border-blue-600 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.99] mt-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Agregar otro concepto</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* PASO 2: Resumen, Canal de Pago & Opciones Fiscales */}
          {/* ======================================================== */}
          {step === 2 && (
            <div className="space-y-3 sm:space-y-3.5 animate-in fade-in-50 duration-200">
              {/* Resumen del Gasto */}
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/60 dark:from-blue-950/40 dark:to-indigo-950/20 border border-blue-200/80 dark:border-blue-900/60 flex items-center justify-between gap-2.5 shadow-2xs">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5 text-blue-600" />
                    <span>{validItems.length} concepto{validItems.length > 1 ? "s" : ""} ({formatToDMY(fechaDocumento)})</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {validItems.map(it => `${it.descripcion} (${formatRD(it.monto)})`).join(", ")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[9.5px] uppercase font-bold text-blue-700 dark:text-blue-300">Total</span>
                  <div className="font-display font-black text-rose-600 dark:text-rose-400 text-lg sm:text-xl leading-none mt-0.5">
                    {formatRD(totalMonto)}
                  </div>
                </div>
              </div>

              {/* Canal de Pago */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Canal de Pago *</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: "Efectivo", label: "Efectivo", icon: Coins },
                    { key: "Transferencia", label: "Transferencia", icon: Landmark },
                    { key: "Tarjeta", label: "Tarjeta", icon: CreditCard },
                    { key: "Cheque", label: "Cheque", icon: FileText },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = metodoPago === m.key;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setMetodoPago(m.key)}
                        className={`py-2 px-1.5 rounded-xl text-xs font-bold text-center flex flex-col items-center gap-1 transition-all border cursor-pointer ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm font-black scale-[1.02]"
                            : "bg-surface border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="leading-tight text-[11px]">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toggle Añadir Beneficiario / Proveedor */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-muted/20 border border-border/60 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-foreground">Añadir Beneficiario / Proveedor (Opcional)</div>
                    <p className="text-[10px] text-muted-foreground">Indicar a quién se le pagó el egreso menor</p>
                  </div>
                  <Switch
                    checked={showBeneficiario}
                    onCheckedChange={setShowBeneficiario}
                    className="data-[state=checked]:bg-blue-600 shrink-0"
                  />
                </div>

                {showBeneficiario && (
                  <div className="pt-1 animate-in fade-in-50">
                    <Input
                      autoFocus
                      placeholder="Ej: Colmado La Fe, Chofer Juan, Estación Gasolina..."
                      value={proveedor}
                      onChange={(e) => setProveedor(e.target.value)}
                      className="h-9 rounded-xl bg-surface border border-border/80 text-xs shadow-2xs"
                    />
                  </div>
                )}
              </div>

              {/* Toggle Emisión Fiscal DGII E43 */}
              {isElectronic && (
                <div className={`p-2.5 sm:p-3 rounded-xl border transition-all ${
                  emitirFiscal
                    ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 shadow-2xs"
                    : "bg-muted/20 border-border/60"
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Emitir Comprobante Fiscal DGII (E43 · Gastos Menores)</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {emitirFiscal
                          ? "✓ Deducible ante la DGII sin necesidad de RNC del proveedor."
                          : "Gasto registrado únicamente para control interno de caja."}
                      </p>
                    </div>
                    <Switch
                      checked={emitirFiscal}
                      onCheckedChange={setEmitirFiscal}
                      className="data-[state=checked]:bg-emerald-600 shrink-0 scale-105"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer con Total y Botones de Navegación del Wizard */}
        <div className="p-3 px-4 sm:px-5 bg-slate-50 dark:bg-slate-900 border-t border-border/60 flex items-center justify-between gap-3 shrink-0">
          <div>
            <div className="text-[10px] font-medium text-muted-foreground">Total a registrar (exento)</div>
            <div className="text-lg sm:text-xl font-black font-display text-slate-900 dark:text-white">
              {formatRD(totalMonto)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {step === 1 ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  className="rounded-xl px-3.5 sm:px-4 text-xs font-bold h-9.5 cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleNextStep} 
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 sm:px-5 h-9.5 text-xs font-bold shadow-md gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <span>Continuar a Pago</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setStep(1)}
                  className="rounded-xl px-3.5 sm:px-4 text-xs font-bold h-9.5 cursor-pointer"
                >
                  ← Volver a Conceptos
                </Button>
                <Button 
                  onClick={submit} 
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 h-9.5 text-xs font-bold shadow-md gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isSubmitting ? "Emitiendo..." : "Emitir gasto menor"}</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// MODAL 2: NUEVA COMPRA FISCAL (E41 · PROVEEDORES INFORMALES CON RETENCIONES)
// ==========================================
function NewCompraModal({
  open,
  onOpenChange,
  tenant,
  tenantConfig,
  ecfConfig,
  tenantId,
  empleadoId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tenant?: Tenant;
  tenantConfig?: TenantConfig;
  ecfConfig?: any;
  tenantId: string;
  empleadoId: string;
  onDone: () => void;
}) {
  const isElectronic = !!ecfConfig?.is_active || !!ecfConfig?.ef2_environment || !!tenant?.rnc;

  const [rawMonto, setRawMonto] = useState("");
  const [monto, setMonto] = useState(0);
  const [proveedorNombre, setProveedorNombre] = useState("");
  const [proveedorRnc, setProveedorRnc] = useState("");
  const [concepto, setConcepto] = useState("");
  const [categoria, setCategoria] = useState("Mantenimiento");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setRawMonto("");
      setMonto(0);
      setProveedorNombre("");
      setProveedorRnc("");
      setConcepto("");
      setCategoria("Mantenimiento");
      setMetodoPago("Efectivo");
    }
  }, [open]);

  // Cálculos fiscales DGII para E41 (Compras con retención 100% ITBIS + 10% ISR)
  const itbisAmount = Number((monto * 0.18).toFixed(2));
  const itbisRetenido = itbisAmount; // 100% Retención ITBIS
  const isrRetenido = Number((monto * 0.10).toFixed(2)); // 10% Retención ISR
  const totalConItbis = monto + itbisAmount;
  const totalRetenciones = itbisRetenido + isrRetenido;
  const netoAPagar = Number((totalConItbis - totalRetenciones).toFixed(2));

  async function submit() {
    if (!proveedorNombre.trim()) {
      toast.error("Ingresa el nombre del proveedor o técnico");
      return;
    }
    if (!proveedorRnc.trim()) {
      toast.error("Ingresa el RNC o Cédula del proveedor informal");
      return;
    }
    if (!concepto.trim()) {
      toast.error("Ingresa el concepto de la compra o servicio");
      return;
    }
    if (monto <= 0) {
      toast.error("Ingresa un monto válido mayor a RD$0.00");
      return;
    }

    setIsSubmitting(true);
    try {
      const compraId = uid("gas");
      let emittedNcf: string | undefined = undefined;
      let emittedType: string | undefined = "E41";
      let emittedStatus: string | undefined = undefined;
      let emittedTrackId: string | undefined = undefined;
      let emittedQr: string | undefined = undefined;

      if (isElectronic && tenant) {
        try {
          toast.info("Emitiendo Comprobante de Compras (E41) ante la DGII...");

          const dummyOrder: Orden = {
            id: compraId,
            tenant_id: tenant.id,
            numero: `PUR-${Date.now().toString().slice(-6)}`,
            cliente_nombre: proveedorNombre,
            total: totalConItbis,
            subtotal: monto,
            itbis: itbisAmount,
            descuento: 0,
            estado: "ENTREGADO",
            metodo_pago: metodoPago === "Cheque" ? "EFECTIVO" : (metodoPago.toUpperCase() as MetodoPago),
            tipo_ecf: "E41",
            saldo: 0,
            creado_en: new Date().toISOString(),
            items: [
              {
                descripcion: concepto,
                cantidad: 1,
                precio_unitario: monto,
                is_exento: false,
              },
            ],
          } as any;

          const res = await emitirECF(
            dummyOrder,
            { id: "supplier", nombre: proveedorNombre, cedula: proveedorRnc } as any,
            undefined,
            (tenantConfig || { ncf_secuencia: "E41", itbis_incluido: false }) as any,
            tenant,
            "E41"
          );

          emittedNcf = res.encf;
          emittedStatus = res.legal_status || "ACCEPTED";
          emittedTrackId = res.track_id;
          emittedQr = res.qr_content;
        } catch (fiscalErr: any) {
          console.error("Error al emitir e-CF E41:", fiscalErr);
          toast.error(`Aviso DGII: ${fiscalErr.message || "No se pudo emitir el e-CF"}`);
        }
      }

      // Guardar registro en Gastos
      await saveGasto({
        id: compraId,
        tenant_id: tenantId,
        empleado_id: empleadoId,
        categoria,
        descripcion: concepto,
        monto: netoAPagar > 0 ? netoAPagar : monto,
        metodo_pago: metodoPago,
        proveedor: proveedorNombre,
        proveedor_rnc: proveedorRnc,
        ncf: emittedNcf,
        tipo_ecf: "E41",
        ecf_status: emittedStatus || "ACCEPTED",
        ecf_track_id: emittedTrackId,
        ecf_qr: emittedQr,
        fecha: new Date().toISOString(),
        aprobado: true,
      });

      // Descuento en Caja Abierta
      try {
        const caja = await getCajaAbierta(tenantId);
        if (caja) {
          const metodo = metodoPago === "Cheque" ? "EFECTIVO" : (metodoPago.toUpperCase() as MetodoPago);
          await saveMovimiento({
            id: uid("mov"),
            tenant_id: tenantId,
            caja_id: caja.id,
            empleado_id: empleadoId,
            tipo: "EGRESO",
            concepto: `Compra E41: ${proveedorNombre} - ${concepto}${emittedNcf ? ` (${emittedNcf})` : ""}`,
            monto: netoAPagar > 0 ? netoAPagar : monto,
            metodo,
            referencia: compraId,
            creado_en: new Date().toISOString(),
          });
        }
      } catch (cajaErr) {
        console.error("Error al registrar movimiento en caja:", cajaErr);
      }

      if (emittedNcf) {
        toast.success(`Compra registrada y comprobante ${emittedNcf} (E41) emitido ante la DGII ✓`);
      } else {
        toast.success("Compra registrada correctamente ✅");
      }
      onDone();
    } catch (err: any) {
      console.error("Error al registrar compra:", err);
      toast.error(err?.message || "Error al registrar compra");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-lg sm:max-w-xl p-0 gap-0 overflow-hidden border-none shadow-2xl bg-background text-foreground max-h-[92vh] flex flex-col">
        {/* Cabecera del Diálogo */}
        <div className="bg-blue-50/90 dark:bg-blue-950/40 p-5 pb-4 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-3.5 pr-8">
            <div className="h-11 w-11 rounded-2xl bg-blue-100 dark:bg-blue-900/80 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/80 dark:border-blue-800 shadow-2xs shrink-0">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-display font-black text-foreground">
                Registrar Compra Fiscal (E41)
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Comprobante para compras o servicios de proveedores y técnicos informales
              </p>
            </div>
          </div>
        </div>

        {/* Formulario Espacioso */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Fila Proveedor & RNC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-bold text-foreground">Nombre Proveedor / Técnico *</Label>
              <Input
                autoFocus
                placeholder="Ej: Juan Pérez (Electricista)"
                value={proveedorNombre}
                onChange={(e) => setProveedorNombre(e.target.value)}
                className="h-10.5 rounded-xl bg-surface border border-border/80 text-xs sm:text-sm shadow-2xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-bold text-foreground">RNC o Cédula *</Label>
              <Input
                placeholder="Ej: 00112345678"
                value={proveedorRnc}
                onChange={(e) => setProveedorRnc(e.target.value)}
                className="h-10.5 rounded-xl bg-surface border border-border/80 text-xs sm:text-sm shadow-2xs font-mono"
              />
            </div>
          </div>

          {/* Concepto */}
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm font-bold text-foreground">Concepto del Bien o Servicio *</Label>
            <Input
              placeholder="Ej: Reparación eléctrica local, plomería, repuestos..."
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="h-10.5 rounded-xl bg-surface border border-border/80 text-xs sm:text-sm shadow-2xs"
            />
          </div>

          {/* Fila Monto & Categoría */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-bold text-foreground">Monto Bruto (RD$) *</Label>
              <div className="relative flex items-center rounded-xl bg-surface border border-border/80 shadow-2xs focus-within:border-blue-500 transition-all overflow-hidden">
                <span className="pl-3 font-display font-black text-xs sm:text-sm text-muted-foreground select-none">
                  RD$
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={rawMonto}
                  onChange={(e) => {
                    const formatted = formatAmountInput(e.target.value);
                    setRawMonto(formatted);
                    setMonto(parseAmount(formatted));
                  }}
                  className="w-full h-10.5 pl-2 pr-3 bg-transparent text-sm sm:text-base font-black font-display text-foreground focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-bold text-foreground">Categoría</Label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full h-10.5 px-3 rounded-xl bg-surface border border-border/80 text-xs sm:text-sm font-medium text-foreground shadow-2xs focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {CATEGORIAS_GASTOS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Canal de Pago */}
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm font-bold text-foreground">Canal de Pago</Label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: "Efectivo", label: "Efectivo", icon: Coins },
                { key: "Transferencia", label: "Transferencia", icon: Landmark },
                { key: "Tarjeta", label: "Tarjeta", icon: CreditCard },
                { key: "Cheque", label: "Cheque", icon: FileText },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = metodoPago === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMetodoPago(m.key)}
                    className={`py-2 px-1.5 rounded-xl text-xs sm:text-sm font-bold text-center flex flex-col items-center gap-1.5 transition-all border cursor-pointer ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs font-black scale-[1.02]"
                        : "bg-surface border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="leading-tight">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desglose de Retenciones Fiscales DGII */}
          {monto > 0 && (
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 space-y-2 text-xs sm:text-sm animate-in fade-in-50">
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>Monto Bruto del Servicio:</span>
                <span className="font-semibold text-foreground">{formatRD(monto)}</span>
              </div>
              <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-xs">
                <span>Retención 100% ITBIS (18%):</span>
                <span className="font-bold">- {formatRD(itbisRetenido)}</span>
              </div>
              <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-xs">
                <span>Retención ISR (10%):</span>
                <span className="font-bold">- {formatRD(isrRetenido)}</span>
              </div>
              <div className="pt-2 border-t border-blue-200/60 dark:border-blue-800/60 flex items-center justify-between">
                <span className="font-black text-foreground text-xs sm:text-sm">Neto Total a Pagar al Proveedor:</span>
                <span className="font-display font-black text-base sm:text-lg text-blue-600 dark:text-blue-400">
                  {formatRD(netoAPagar)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-5 sm:px-6 bg-slate-50/90 dark:bg-slate-900/80 border-t border-border/60 flex items-center justify-between gap-3 shrink-0">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="rounded-xl px-4 sm:px-5 text-xs sm:text-sm font-bold h-10 cursor-pointer"
          >
            Cancelar
          </Button>
          <Button 
            onClick={submit} 
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 text-xs sm:text-sm font-bold shadow-xs gap-1.5 cursor-pointer h-10"
          >
            <Check className="h-4 w-4" />
            <span>{isSubmitting ? "Emitiendo..." : "Emitir Compra E41"}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Portal de Impresión Profesional
function GastosPrintPortal({
  activeTab,
  tenant,
  manualGastos,
  cajaChicaGastos,
  onClose
}: {
  activeTab: string;
  tenant: any;
  manualGastos: any[];
  cajaChicaGastos: any[];
  onClose: () => void;
}) {
  const isCaja = activeTab === "caja-chica";
  const title = isCaja ? "Reporte de Caja Chica" : "Reporte de Gastos Operativos";

  const totalMonto = isCaja 
    ? cajaChicaGastos.reduce((s, g) => s + g.monto, 0)
    : manualGastos.reduce((s, g) => s + g.monto, 0);

  const totalCount = isCaja 
    ? cajaChicaGastos.length 
    : manualGastos.length;

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
                <h1 className="text-3xl font-display font-black text-primary uppercase tracking-tighter mb-1">{tenant.nombre}</h1>
              )}
              <div className="text-sm font-bold text-slate-500 uppercase">
                {tenant.rnc ? `RNC: ${tenant.rnc}` : "Sin RNC Configurado"}
              </div>
              <div className="text-xs text-slate-500 max-w-sm mt-1">{tenant.direccion}</div>
              <div className="text-xs text-slate-500">Tel: {tenant.telefono} | {tenant.email}</div>
            </div>

            <div className="text-right">
              <h2 className="text-2xl font-display font-black uppercase text-slate-900 mb-1">
                {title}
              </h2>
              <div className="text-sm font-bold text-rose-600 uppercase tracking-wider mb-2">
                Total: {formatRD(totalMonto)} ({totalCount} registros)
              </div>
              <div className="text-xs text-slate-600">
                <span className="font-bold">Generado:</span> {new Date().toLocaleString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 bg-slate-50 text-[10px] uppercase font-bold text-slate-600">
                  {!isCaja ? (
                    <>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Categoría</th>
                      <th className="py-3 px-4">Descripción</th>
                      <th className="py-3 px-4">Proveedor</th>
                      <th className="py-3 px-4">Método</th>
                      <th className="py-3 px-4 text-right">Monto</th>
                    </>
                  ) : (
                    <>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Categoría</th>
                      <th className="py-3 px-4">Descripción</th>
                      <th className="py-3 px-4">Método</th>
                      <th className="py-3 px-4 text-right">Monto</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {!isCaja && manualGastos.map((g, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{formatDateRD(g.fecha)}</td>
                    <td className="py-2.5 px-4"><span className="inline-flex items-center rounded-full bg-slate-100 text-slate-800 px-2 py-0.5 text-[9px] font-bold">{g.categoria}</span></td>
                    <td className="py-2.5 px-4 font-medium text-slate-850">{g.descripcion}</td>
                    <td className="py-2.5 px-4 text-slate-500">{g.proveedor || "—"}</td>
                    <td className="py-2.5 px-4 text-slate-600">{g.metodo_pago}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-rose-600">{formatRD(g.monto)}</td>
                  </tr>
                ))}
                {isCaja && cajaChicaGastos.map((g, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{formatDateRD(g.fecha)}</td>
                    <td className="py-2.5 px-4"><span className="inline-flex items-center rounded-full bg-blue-50 text-primary px-2 py-0.5 text-[9px] font-bold">{g.categoria}</span></td>
                    <td className="py-2.5 px-4 font-medium text-slate-850">{g.descripcion}</td>
                    <td className="py-2.5 px-4 text-slate-600">{g.metodo_pago}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-rose-600">{formatRD(g.monto)}</td>
                  </tr>
                ))}

                {totalCount === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 italic">
                      No hay egresos registrados en esta sección
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-end border-t border-slate-200 pt-6 mt-12">
            <div className="text-left text-[9px] text-slate-400 italic leading-relaxed max-w-sm">
              Este reporte fue generado de forma automática y es propiedad confidencial.
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
