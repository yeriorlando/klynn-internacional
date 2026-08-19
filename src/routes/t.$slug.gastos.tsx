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
  ArrowRight,
  TrendingDown,
  Info,
  Filter,
  LayoutGrid,
  SlidersHorizontal
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
  isModuleEnabled,
  formatAmountInput,
  parseAmount
} from "@/lib/storage";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlans } from "@/hooks/use-queries";
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

export const Route = createFileRoute("/t/$slug/gastos")({ component: GastosPage });

// Mapeo visual y tipado para Categorías de Gastos
export function getGastoCategoriaVisual(cat: string) {
  const c = (cat || "").toLowerCase();
  if (c.includes("servicio") || c.includes("luz") || c.includes("agua") || c.includes("internet")) {
    return {
      label: "Servicios",
      fullLabel: "Servicios (Luz, Agua, Internet)",
      icon: Zap,
      bgLight: "bg-amber-50 dark:bg-amber-950/60",
      border: "border-amber-200 dark:border-amber-800",
      text: "text-amber-700 dark:text-amber-300",
      chipBg: "bg-amber-100/80 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300/70",
      barColor: "bg-amber-500",
      pillBg: "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      pillActive: "bg-amber-500 text-white border-amber-500 shadow-md",
      innerBadge: "bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100",
    };
  }
  if (c.includes("mantenimiento") || c.includes("reparac")) {
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
      bgLight: "bg-emerald-50 dark:bg-emerald-950/60",
      border: "border-emerald-200 dark:border-emerald-800",
      text: "text-emerald-700 dark:text-emerald-300",
      chipBg: "bg-emerald-100/80 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300/70",
      barColor: "bg-emerald-500",
      pillBg: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      pillActive: "bg-emerald-600 text-white border-emerald-600 shadow-md",
      innerBadge: "bg-emerald-200/70 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100",
    };
  }
  if (c.includes("transporte") || c.includes("combustible") || c.includes("delivery") || c.includes("gasolina")) {
    return {
      label: "Transporte",
      fullLabel: "Transporte & Combustible",
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
  if (c.includes("caja chica")) {
    return {
      label: "Caja Chica",
      fullLabel: "Caja Chica (Gastos Menores)",
      icon: PiggyBank,
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
  return {
    label: cat || "Otros",
    fullLabel: cat || "Otros Gastos",
    icon: Tag,
    bgLight: "bg-slate-50 dark:bg-slate-900/60",
    border: "border-slate-200 dark:border-slate-800",
    text: "text-slate-700 dark:text-slate-300",
    chipBg: "bg-slate-100/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300/70",
    barColor: "bg-slate-500",
    pillBg: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    pillActive: "bg-slate-700 text-white border-slate-700 shadow-md",
    innerBadge: "bg-slate-200/70 dark:bg-slate-700 text-slate-800 dark:text-slate-200",
  };
}

// Mapeo visual para Métodos de Pago
export function getGastoMetodoVisual(metodo: string) {
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
  const [show, setShow] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [recibidos, setRecibidos] = useState<ECFDocumentRecibido[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("manual");
  const [isElectronic, setIsElectronic] = useState(false);
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

  const tenant = user?.tenant;
  const tenantId = tenant?.id || "";

  useEffect(() => {
    async function load() {
      if (!tenantId || tenantId === "__loading__") return;
      setLoading(true);
      try {
        const [listGastos, listRecibidos, conf] = await Promise.all([
          getGastos(tenantId),
          getECFDocumentosRecibidos(tenantId),
          getECFConfig(tenantId)
        ]);
        setGastos(listGastos.sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha)));
        setRecibidos(listRecibidos);
        setIsElectronic(!!conf?.is_active);
      } catch (err) {
        console.error("Error cargando datos:", err);
      }
      setLoading(false);
    }
    load();
  }, [tenantId, refresh]);

  const { data: plans = [] } = usePlans();
  const plan = plans.find(p => p.id === user?.tenant?.plan_id) || (user ? getTenantPlan(user.tenant) : null);
  const canSeeFiscal = isModuleEnabled(user?.tenant || null, "facturacion_fiscal", plan || undefined);

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

  if (!user || user.tenant.id === "__loading__" || (loading && gastos.length === 0)) {
    return <GlobalPageLoader text="Cargando egresos y gastos..." />;
  }

  return (
    <Tabs 
      value={activeTab} 
      onValueChange={(t) => { setActiveTab(t); setSelectedCategory("all"); }} 
      className="space-y-6 pb-12 animate-in fade-in-50 duration-300 w-full"
    >
      {/* HEADER DE PÁGINA CON PESTAÑAS /ADMIN INTEGRADAS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Título & Contador */}
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-foreground tracking-tight">Gastos</h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            {activeTab === "manual" ? manualGastos.length : cajaChicaGastos.length} egresos registrados
          </p>
        </div>

        {/* PESTAÑAS ESTILO /ADMIN (STANDALONE BUTTONS CON COLORES DIFERENCIADOS) */}
        <TabsList className="flex items-center gap-2 sm:gap-2.5 bg-transparent p-0 border-none h-auto justify-start overflow-x-auto scrollbar-none">
          {/* Gastos Manuales (Azul Añil / Primary) */}
          <TabsTrigger 
            value="manual"
            className="flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-surface border border-border/80 text-foreground shadow-xs data-[state=active]:bg-[#1B4B73] data-[state=active]:text-white data-[state=active]:border-[#1B4B73] data-[state=active]:shadow-md transition-all hover:bg-muted/60 cursor-pointer shrink-0 whitespace-nowrap"
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
            className="flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-surface border border-border/80 text-foreground shadow-xs data-[state=active]:bg-amber-600 data-[state=active]:text-white data-[state=active]:border-amber-600 data-[state=active]:shadow-md transition-all hover:bg-muted/60 cursor-pointer shrink-0 whitespace-nowrap"
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

        {/* Acciones Rápidas */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                className="flex items-center gap-2 rounded-xl h-10 px-4 font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
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
            className="flex items-center gap-2 rounded-xl h-10 px-4 font-bold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0" 
            onClick={() => setIsPrinting(true)}
          >
            <Printer className="h-4 w-4 text-white shrink-0" />
            <span>Imprimir</span>
          </Button>

          <Button 
            type="button"
            onClick={() => setShow(true)} 
            className="flex items-center gap-2 rounded-xl h-10 px-5 font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
          >
            <Plus className="h-4 w-4 text-[#F0B900] shrink-0" />
            <span>Nuevo gasto</span>
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
                          <span className="font-bold text-foreground text-xs block">
                            {g.descripcion}
                          </span>
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
                                      await deleteGasto(g.id); 
                                      setRefresh((r) => r + 1); 
                                      toast.success("Gasto eliminado correctamente 🗑️"); 
                                    } catch (err) {
                                      toast.error("Error al eliminar gasto");
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
                          <span className="font-bold text-foreground text-xs block">
                            {g.descripcion}
                          </span>
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

      {/* MODAL REDISEÑADO DE NUEVO GASTO */}
      <NewGasto 
        open={show} 
        onOpenChange={setShow} 
        tenantId={user.tenant.id} 
        empleadoId={user.empleado.id} 
        onDone={() => { setRefresh((r) => r + 1); setShow(false); }} 
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

// Modal Rediseñado de Registro de Nuevo Gasto (Wizard de 2 Pasos Compacto)
function NewGasto({ 
  open, 
  onOpenChange, 
  tenantId, 
  empleadoId, 
  onDone 
}: { 
  open: boolean; 
  onOpenChange: (o: boolean) => void; 
  tenantId: string; 
  empleadoId: string; 
  onDone: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [rawMonto, setRawMonto] = useState("");
  const [otraCategoria, setOtraCategoria] = useState("");
  const [f, setF] = useState({ 
    categoria: CATEGORIAS_GASTOS[0], 
    descripcion: "", 
    monto: 0, 
    metodo_pago: "Efectivo", 
    proveedor: "" 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(1);
      setRawMonto("");
      setOtraCategoria("");
      setF({ categoria: CATEGORIAS_GASTOS[0], descripcion: "", monto: 0, metodo_pago: "Efectivo", proveedor: "" });
    }
  }, [open]);

  const catVisual = getGastoCategoriaVisual(f.categoria);
  const CatIcon = catVisual.icon;
  const displayCatName = (f.categoria === "Otros" && otraCategoria.trim()) ? otraCategoria.trim() : catVisual.label;

  function handleNextStep() {
    if (f.categoria === "Otros" && !otraCategoria.trim()) {
      toast.error("Por favor especifica el nombre de la categoría");
      return;
    }
    if (f.monto <= 0) {
      toast.error("Por favor ingresa un monto válido mayor a RD$0.00");
      return;
    }
    setStep(2);
  }

  async function submit() {
    if (!f.descripcion.trim()) { 
      toast.error("Ingresa una descripción o concepto del gasto"); 
      return; 
    }
    if (f.monto <= 0) { 
      toast.error("El monto debe ser mayor a RD$0.00"); 
      return; 
    }

    const categoriaFinal = (f.categoria === "Otros" && otraCategoria.trim()) ? otraCategoria.trim() : f.categoria;

    setIsSubmitting(true);
    try {
      const gastoId = uid("gas");
      await saveGasto({ 
        id: gastoId, 
        tenant_id: tenantId, 
        empleado_id: empleadoId, 
        ...f, 
        categoria: categoriaFinal,
        proveedor: f.proveedor || undefined, 
        fecha: new Date().toISOString(), 
        aprobado: true 
      });
      
      try {
        const caja = await getCajaAbierta(tenantId);
        if (caja) {
          const metodo = f.metodo_pago === "Cheque" ? "EFECTIVO" : (f.metodo_pago.toUpperCase() as MetodoPago);
          await saveMovimiento({
            id: uid("mov"),
            tenant_id: tenantId,
            caja_id: caja.id,
            empleado_id: empleadoId,
            tipo: "EGRESO",
            concepto: `Gasto: ${categoriaFinal} - ${f.descripcion}`,
            monto: f.monto,
            metodo,
            referencia: gastoId,
            creado_en: new Date().toISOString(),
          });
        }
      } catch (cajaErr) {
        console.error("Error al registrar movimiento en caja:", cajaErr);
      }

      toast.success("Gasto registrado correctamente ✅"); 
      onDone();
      setF({ categoria: CATEGORIAS_GASTOS[0], descripcion: "", monto: 0, metodo_pago: "Efectivo", proveedor: "" });
      setRawMonto("");
      setOtraCategoria("");
      setStep(1);
    } catch (err: any) {
      toast.error("Error al registrar gasto");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-lg p-0 gap-0 overflow-hidden border-none shadow-2xl bg-background text-foreground">
        {/* Cabecera del Diálogo */}
        <div className="bg-slate-50/80 dark:bg-slate-900/70 p-5 pb-3 border-b border-border/50">
          <div className="flex items-center gap-3 pr-8">
            <div className="h-10 w-10 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200/80 dark:border-rose-800 shadow-xs shrink-0">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-display font-black text-foreground">
                Registrar Nuevo Gasto
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                {step === 1 ? "Paso 1: Selecciona categoría y monto a egresar" : "Paso 2: Completa concepto y canal de pago"}
              </p>
            </div>
          </div>

          {/* Stepper Wizard Indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                step === 1
                  ? "bg-primary text-white border-primary shadow-xs"
                  : "bg-surface text-muted-foreground border-border/60 hover:text-foreground"
              }`}
            >
              <span className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[10px] font-black ${
                step === 1 ? "bg-white text-primary" : "bg-muted text-foreground"
              }`}>1</span>
              <span>Categoría & Monto</span>
            </button>

            <button
              type="button"
              onClick={() => { if (f.monto > 0) handleNextStep(); }}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                step === 2
                  ? "bg-primary text-white border-primary shadow-xs"
                  : "bg-surface text-muted-foreground border-border/60 hover:text-foreground"
              }`}
            >
              <span className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[10px] font-black ${
                step === 2 ? "bg-white text-primary" : "bg-muted text-foreground"
              }`}>2</span>
              <span>Detalle & Pago</span>
            </button>
          </div>
        </div>

        {/* PASO 1: Categoría & Monto */}
        {step === 1 && (
          <div className="p-5 space-y-3.5 animate-in fade-in-50 duration-200">
            {/* Selector de Categoría Visual */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Selecciona la Categoría</Label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIAS_GASTOS.map((c) => {
                  const vis = getGastoCategoriaVisual(c);
                  const Icon = vis.icon;
                  const isSelected = f.categoria === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setF({ ...f, categoria: c })}
                      className={`p-2.5 rounded-2xl text-left text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer border-2 shadow-2xs ${
                        isSelected
                          ? "bg-primary text-white border-primary shadow-sm font-black scale-[1.02]"
                          : "bg-white dark:bg-slate-950 border-border/80 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-900"
                      }`}
                    >
                      <span className={`p-1.5 rounded-xl shrink-0 transition-transform ${isSelected ? "bg-white/20 text-white" : `${vis.bgLight} ${vis.text}`}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="truncate capitalize">{vis.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campo desplegable para especificar cuando se elige OTROS */}
            {f.categoria === "Otros" && (
              <div className="space-y-1.5 animate-in fade-in-50 slide-in-from-top-2 duration-200">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-primary" />
                  <span>Especificar Categoría</span>
                </Label>
                <Input
                  autoFocus
                  placeholder="Ej: Impuestos, Licencias de Software, Seguros, Dietas..."
                  value={otraCategoria}
                  onChange={(e) => setOtraCategoria(e.target.value)}
                  className="h-11 rounded-2xl bg-white dark:bg-slate-950 border-2 border-border/80 text-xs shadow-xs text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
                />
              </div>
            )}

            {/* Monto con Fondo Blanco Puro y Separador de Miles */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-bold text-foreground">Monto a Registrar (RD$)</Label>
              <div className="relative flex items-center rounded-2xl bg-white dark:bg-slate-950 border-2 border-border/80 shadow-xs focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/15 transition-all overflow-hidden">
                <span className="pl-4 font-display font-black text-base text-muted-foreground select-none shrink-0">
                  RD$
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoFocus={f.categoria !== "Otros"}
                  placeholder="0.00"
                  value={rawMonto}
                  onChange={(e) => {
                    const formatted = formatAmountInput(e.target.value);
                    setRawMonto(formatted);
                    setF(prev => ({ ...prev, monto: parseAmount(formatted) }));
                  }}
                  className="w-full h-12.5 pl-3 pr-4 bg-transparent text-2xl font-black font-display text-slate-900 dark:text-white placeholder:text-muted-foreground/30 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* PASO 2: Detalle & Método de Pago */}
        {step === 2 && (
          <div className="p-5 space-y-4 animate-in fade-in-50 duration-200">
            {/* Banner Resumen de Selección */}
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-950 border-2 border-border/80 shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`p-1.5 rounded-xl ${catVisual.chipBg}`}>
                  <CatIcon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-foreground capitalize">{displayCatName}</span>
              </div>
              <span className="font-display font-black text-rose-600 dark:text-rose-400 text-base">
                {formatRD(f.monto)}
              </span>
            </div>

            {/* Concepto / Descripción con Fondo Blanco Puro */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Concepto o Descripción</Label>
              <Input 
                autoFocus
                placeholder="Ej: Factura de electricidad Edesur, compra de detergente..." 
                value={f.descripcion} 
                onChange={(e) => setF({ ...f, descripcion: e.target.value })} 
                className="h-11 rounded-2xl bg-white dark:bg-slate-950 border-2 border-border/80 text-xs shadow-xs text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
              />
            </div>

            {/* Método de Pago (Tarjetas Visuales Elevadas) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Canal de Pago</Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  {
                    key: "Efectivo",
                    label: "Efectivo",
                    icon: Coins,
                    activeClass: "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200",
                    iconBg: "bg-emerald-100 dark:bg-emerald-900/80 text-emerald-600 dark:text-emerald-300",
                  },
                  {
                    key: "Transferencia",
                    label: "Transferencia",
                    icon: Landmark,
                    activeClass: "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200",
                    iconBg: "bg-indigo-100 dark:bg-indigo-900/80 text-indigo-600 dark:text-indigo-300",
                  },
                  {
                    key: "Tarjeta",
                    label: "Tarjeta",
                    icon: CreditCard,
                    activeClass: "border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/70 dark:bg-sky-950/40 text-sky-950 dark:text-sky-200",
                    iconBg: "bg-sky-100 dark:bg-sky-900/80 text-sky-600 dark:text-sky-300",
                  },
                  {
                    key: "Cheque",
                    label: "Cheque",
                    icon: FileText,
                    activeClass: "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/70 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200",
                    iconBg: "bg-amber-100 dark:bg-amber-900/80 text-amber-600 dark:text-amber-300",
                  },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = f.metodo_pago === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setF({ ...f, metodo_pago: m.key })}
                      className={`py-2.5 px-2 rounded-2xl text-xs font-bold text-center flex flex-col items-center gap-1.5 transition-all border-2 cursor-pointer relative group ${
                        isSelected
                          ? `${m.activeClass} shadow-xs font-black scale-[1.02]`
                          : "bg-white dark:bg-slate-950 border-border/80 text-muted-foreground hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-foreground shadow-2xs"
                      }`}
                    >
                      <div className={`p-1.5 rounded-xl transition-transform group-hover:scale-110 shadow-2xs ${m.iconBg}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="leading-tight">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Proveedor con Fondo Blanco Puro */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Proveedor / Beneficiario (Opcional)</Label>
              <Input 
                placeholder="Ej: Claro Dominicana, Distribuidora XYZ..." 
                value={f.proveedor} 
                onChange={(e) => setF({ ...f, proveedor: e.target.value })} 
                className="h-11 rounded-2xl bg-white dark:bg-slate-950 border-2 border-border/80 text-xs shadow-xs text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
              />
            </div>
          </div>
        )}

        {/* Footer con Navegación del Wizard */}
        <div className="p-4 bg-slate-50/70 dark:bg-slate-900/60 border-t border-border/60 flex items-center justify-between gap-2">
          {step === 1 ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="rounded-xl px-4 text-xs font-bold"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleNextStep} 
                className="bg-primary text-white rounded-xl px-5 text-xs font-bold shadow-xs gap-1.5 cursor-pointer"
              >
                <span>Continuar a Detalle</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => setStep(1)}
                className="rounded-xl px-4 text-xs font-bold cursor-pointer"
              >
                ← Volver a Monto
              </Button>
              <Button 
                onClick={submit} 
                disabled={isSubmitting}
                className="bg-gradient-primary text-white rounded-xl px-5 text-xs font-bold shadow-xs gap-1.5 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                <span>{isSubmitting ? "Registrando..." : "Registrar Gasto"}</span>
              </Button>
            </>
          )}
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
