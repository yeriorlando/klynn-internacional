/* Hallmark · pre-emit critique: P5 H5 E4 S5 R4 V5 */
/* Hallmark · macrostructure: Workbench · theme: Klynn modern-minimal · enrichment: none · contrast: pass (40–41) · mobile: pass (34, 49, 50–57) */
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Trash2,
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
  User,
  Building2,
  Truck,
  Tag,
  Sparkles,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Scale,
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Info,
  Filter,
  LayoutGrid,
  SlidersHorizontal,
  Settings2,
  MoreHorizontal,
  Copy,
  Clock3,
  Layers3,
  ChevronDown,
} from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
import { exportGastosComparativaToExcel, exportGastosListToExcel } from "@/lib/excel-gastos";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

const MESES_NOMBRES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const ANIOS_DISPONIBLES = [2024, 2025, 2026, 2027, 2028];
import {
  getGastos,
  saveGasto,
  deleteGasto,
  formatRD,
  formatMoney,
  getTenantCurrencySymbol,
  formatDateRD,
  getActiveTenantLocalization,
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
  getMovimientos,
  saveMovimiento,
  type MetodoPago,
  type Tenant,
  type TenantConfig,
  type Orden,
  isModuleEnabled,
  formatAmountInput,
  parseAmount,
  saveGastoPlantilla,
  type GastoCategoria,
  type GastoPlantilla,
  type Suplidor,
} from "@/lib/storage";
import { emitirECF } from "@/lib/fiscal";
import { getCountry } from "@/lib/countries";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  usePlans,
  useGastos,
  useECFConfig,
  useGastoCategorias,
  useGastoPlantillas,
  useSuplidores,
} from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  ExpenseSetupDialog,
  CATEGORY_COLORS,
  getCategoryColor,
} from "@/components/gastos/ExpenseSetupDialog";

export const Route = createFileRoute("/t/$slug/gastos")({
  component: GastosPage,
});

// Función para obtener clases visuales modernas para categorías de gastos
export function getGastoCategoriaVisual(cat: string, configuredCategories?: GastoCategoria[]) {
  const c = (cat || "").toLowerCase();

  // Si existe una categoría configurada con color personalizado, usar su color seleccionado
  const matched = configuredCategories?.find(
    (item) => item.nombre.toLowerCase() === c || item.id === cat,
  );
  if (matched?.color) {
    const colorMap: Record<string, any> = {
      slate: {
        text: "text-slate-600 dark:text-slate-400",
        bgLight: "bg-slate-100 dark:bg-slate-800",
        border: "border-slate-200 dark:border-slate-700",
        chipBg: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300",
        barColor: "bg-slate-500",
        pillBg: "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200",
        pillActive: "bg-slate-700 text-white border-slate-700",
        innerBadge: "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200",
      },
      blue: {
        text: "text-blue-600 dark:text-blue-400",
        bgLight: "bg-blue-50 dark:bg-blue-950/60",
        border: "border-blue-200 dark:border-blue-800",
        chipBg: "bg-blue-100/80 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-300/70",
        barColor: "bg-blue-500",
        pillBg: "bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200",
        pillActive: "bg-blue-600 text-white border-blue-600 shadow-md",
        innerBadge: "bg-blue-200/70 dark:bg-blue-900/60 text-blue-900 dark:text-blue-100",
      },
      indigo: {
        text: "text-indigo-600 dark:text-indigo-400",
        bgLight: "bg-indigo-50 dark:bg-indigo-950/60",
        border: "border-indigo-200 dark:border-indigo-800",
        chipBg: "bg-indigo-100/80 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border-indigo-300/70",
        barColor: "bg-indigo-500",
        pillBg: "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border-indigo-200",
        pillActive: "bg-indigo-600 text-white border-indigo-600 shadow-md",
        innerBadge: "bg-indigo-200/70 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-100",
      },
      teal: {
        text: "text-teal-600 dark:text-teal-400",
        bgLight: "bg-teal-50 dark:bg-teal-950/60",
        border: "border-teal-200 dark:border-teal-800",
        chipBg: "bg-teal-100/80 dark:bg-teal-950 text-teal-800 dark:text-teal-200 border-teal-300/70",
        barColor: "bg-teal-500",
        pillBg: "bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border-teal-200",
        pillActive: "bg-teal-600 text-white border-teal-600 shadow-md",
        innerBadge: "bg-teal-200/70 dark:bg-teal-900/60 text-teal-900 dark:text-teal-100",
      },
      emerald: {
        text: "text-emerald-600 dark:text-emerald-400",
        bgLight: "bg-emerald-50 dark:bg-emerald-950/60",
        border: "border-emerald-200 dark:border-emerald-800",
        chipBg: "bg-emerald-100/80 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300/70",
        barColor: "bg-emerald-500",
        pillBg: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200",
        pillActive: "bg-emerald-600 text-white border-emerald-600 shadow-md",
        innerBadge: "bg-emerald-200/70 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100",
      },
      amber: {
        text: "text-amber-600 dark:text-amber-400",
        bgLight: "bg-amber-50 dark:bg-amber-950/60",
        border: "border-amber-200 dark:border-amber-800",
        chipBg: "bg-amber-100/80 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300/70",
        barColor: "bg-amber-500",
        pillBg: "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200",
        pillActive: "bg-amber-600 text-white border-amber-600 shadow-md",
        innerBadge: "bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100",
      },
      orange: {
        text: "text-orange-600 dark:text-orange-400",
        bgLight: "bg-orange-50 dark:bg-orange-950/60",
        border: "border-orange-200 dark:border-orange-800",
        chipBg: "bg-orange-100/80 dark:bg-orange-950 text-orange-800 dark:text-orange-200 border-orange-300/70",
        barColor: "bg-orange-500",
        pillBg: "bg-orange-50 dark:bg-orange-950/50 text-orange-800 dark:text-orange-300 border-orange-200",
        pillActive: "bg-orange-600 text-white border-orange-600 shadow-md",
        innerBadge: "bg-orange-200/70 dark:bg-orange-900/60 text-orange-900 dark:text-orange-100",
      },
      rose: {
        text: "text-rose-600 dark:text-rose-400",
        bgLight: "bg-rose-50 dark:bg-rose-950/60",
        border: "border-rose-200 dark:border-rose-800",
        chipBg: "bg-rose-100/80 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-300/70",
        barColor: "bg-rose-500",
        pillBg: "bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200",
        pillActive: "bg-rose-600 text-white border-rose-600 shadow-md",
        innerBadge: "bg-rose-200/70 dark:bg-rose-900/60 text-rose-900 dark:text-rose-100",
      },
      purple: {
        text: "text-purple-600 dark:text-purple-400",
        bgLight: "bg-purple-50 dark:bg-purple-950/60",
        border: "border-purple-200 dark:border-purple-800",
        chipBg: "bg-purple-100/80 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border-purple-300/70",
        barColor: "bg-purple-500",
        pillBg: "bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200",
        pillActive: "bg-purple-600 text-white border-purple-600 shadow-md",
        innerBadge: "bg-purple-200/70 dark:bg-purple-900/60 text-purple-900 dark:text-purple-100",
      },
    };
    const cStyle = colorMap[matched.color] || colorMap.slate;
    return {
      label: matched.nombre,
      fullLabel: matched.nombre,
      icon: Tag,
      ...cStyle,
    };
  }

  if (
    c.includes("servicio") ||
    c.includes("luz") ||
    c.includes("agua") ||
    c.includes("internet") ||
    c.includes("electricidad")
  ) {
    return {
      label: "Servicios Básicos",
      fullLabel: "Servicios Básicos (Luz/Agua/Net)",
      icon: Zap,
      bgLight: "bg-amber-50 dark:bg-amber-950/60",
      border: "border-amber-200 dark:border-amber-800",
      text: "text-amber-700 dark:text-amber-300",
      chipBg:
        "bg-amber-100/80 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300/70",
      barColor: "bg-amber-500",
      pillBg:
        "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      pillActive: "bg-amber-600 text-white border-amber-600 shadow-md",
      innerBadge: "bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100",
    };
  }
  if (
    c.includes("mantenimiento") ||
    c.includes("reparacion") ||
    c.includes("maquinaria") ||
    c.includes("tecnico")
  ) {
    return {
      label: "Mantenimiento",
      fullLabel: "Mantenimiento & Reparaciones",
      icon: Wrench,
      bgLight: "bg-blue-50 dark:bg-blue-950/60",
      border: "border-blue-200 dark:border-blue-800",
      text: "text-blue-700 dark:text-blue-300",
      chipBg: "bg-blue-100/80 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-300/70",
      barColor: "bg-blue-500",
      pillBg:
        "bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800",
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
      chipBg:
        "bg-purple-100/80 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border-purple-300/70",
      barColor: "bg-purple-500",
      pillBg:
        "bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      pillActive: "bg-purple-600 text-white border-purple-600 shadow-md",
      innerBadge: "bg-purple-200/70 dark:bg-purple-900/60 text-purple-900 dark:text-purple-100",
    };
  }
  if (
    c.includes("suministro") ||
    c.includes("insumo") ||
    c.includes("detergente") ||
    c.includes("quimico")
  ) {
    return {
      label: "Suministros",
      fullLabel: "Suministros & Insumos",
      icon: Package,
      bgLight: "bg-teal-50 dark:bg-teal-950/60",
      border: "border-teal-200 dark:border-teal-800",
      text: "text-teal-700 dark:text-teal-300",
      chipBg: "bg-teal-100/80 dark:bg-teal-950 text-teal-800 dark:text-teal-200 border-teal-300/70",
      barColor: "bg-teal-500",
      pillBg:
        "bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800",
      pillActive: "bg-teal-600 text-white border-teal-600 shadow-md",
      innerBadge: "bg-teal-200/70 dark:bg-teal-900/60 text-teal-900 dark:text-teal-100",
    };
  }
  if (
    c.includes("salario") ||
    c.includes("nomina") ||
    c.includes("sueldo") ||
    c.includes("personal")
  ) {
    return {
      label: "Salarios",
      fullLabel: "Nómina & Salarios",
      icon: Users,
      bgLight: "bg-indigo-50 dark:bg-indigo-950/60",
      border: "border-indigo-200 dark:border-indigo-800",
      text: "text-indigo-700 dark:text-indigo-300",
      chipBg:
        "bg-indigo-100/80 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border-indigo-300/70",
      barColor: "bg-indigo-500",
      pillBg:
        "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
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
      pillBg:
        "bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      pillActive: "bg-rose-600 text-white border-rose-600 shadow-md",
      innerBadge: "bg-rose-200/70 dark:bg-rose-900/60 text-rose-900 dark:text-rose-100",
    };
  }
  if (
    c.includes("transporte") ||
    c.includes("combustible") ||
    c.includes("delivery") ||
    c.includes("gasolina") ||
    c.includes("vehiculo")
  ) {
    return {
      label: "Logística",
      fullLabel: "Logística & Combustible",
      icon: Truck,
      bgLight: "bg-orange-50 dark:bg-orange-950/60",
      border: "border-orange-200 dark:border-orange-800",
      text: "text-orange-700 dark:text-orange-300",
      chipBg:
        "bg-orange-100/80 dark:bg-orange-950 text-orange-800 dark:text-orange-200 border-orange-300/70",
      barColor: "bg-orange-500",
      pillBg:
        "bg-orange-50 dark:bg-orange-950/50 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800",
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
    pillBg:
      "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
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
      badgeClass:
        "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    };
  }
  if (m.includes("TARJETA")) {
    return {
      label: "Tarjeta (POS)",
      icon: CreditCard,
      badgeClass:
        "bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800",
      iconColor: "text-sky-600 dark:text-sky-400",
    };
  }
  if (m.includes("TRANSFERENCIA")) {
    return {
      label: "Transferencia",
      icon: Landmark,
      badgeClass:
        "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800",
      iconColor: "text-indigo-600 dark:text-indigo-400",
    };
  }
  if (m.includes("CHEQUE")) {
    return {
      label: "Cheque",
      icon: FileText,
      badgeClass:
        "bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800",
      iconColor: "text-amber-600 dark:text-amber-400",
    };
  }
  return {
    label: metodo || "Otro",
    icon: Tag,
    badgeClass:
      "bg-slate-50 dark:bg-slate-900/70 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800",
    iconColor: "text-slate-600 dark:text-slate-400",
  };
}

// Función para formatear fechas próximas de gastos recurrentes de forma legible y elegante
function formatUpcomingDate(dateStr: string) {
  if (!dateStr) return { label: "Pendiente", isUrgent: false, isNear: false };
  try {
    const parts = dateStr.slice(0, 10).split("-").map(Number);
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parts[1] - 1;
      const day = parts[2];
      const target = new Date(year, monthIndex, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const diffTime = target.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return { label: `Vencido (${Math.abs(diffDays)}d)`, isUrgent: true, isNear: false };
      }
      if (diffDays === 0) {
        return { label: "Hoy", isUrgent: true, isNear: false };
      }
      if (diffDays === 1) {
        return { label: "Mañana", isUrgent: false, isNear: true };
      }
      if (diffDays <= 7) {
        return { label: `En ${diffDays}d`, isUrgent: false, isNear: true };
      }
      const months = [
        "Ene",
        "Feb",
        "Mar",
        "Abr",
        "May",
        "Jun",
        "Jul",
        "Ago",
        "Sep",
        "Oct",
        "Nov",
        "Dic",
      ];
      const isDifferentYear = target.getFullYear() !== today.getFullYear();
      const label = `${day} ${months[monthIndex] || ""}${isDifferentYear ? ` ${year}` : ""}`;
      return { label, isUrgent: false, isNear: false };
    }
  } catch {
    // fallback
  }
  return { label: dateStr, isUrgent: false, isNear: false };
}

// Indicador visual de comparación contra el mes anterior (MoM)
function MoMIndicator({
  diff,
  pct,
  hasData,
  theme = "default",
}: {
  diff: number;
  pct: number;
  hasData: boolean;
  theme?: "solid-blue" | "rose" | "amber" | "indigo" | "default";
}) {
  if (!hasData) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0",
          theme === "solid-blue"
            ? "bg-white/15 text-white/80"
            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400",
        )}
      >
        <Minus className="h-3 w-3" /> Sin datos ant.
      </span>
    );
  }

  const isSavings = diff < 0;
  const isIncrease = diff > 0;
  const isFlat = diff === 0;

  const formattedPct = `${isIncrease ? "+" : ""}${pct.toFixed(1)}%`;

  let badgeClasses = "";
  if (theme === "solid-blue") {
    if (isSavings) {
      badgeClasses = "bg-emerald-500/25 text-emerald-200 border border-emerald-400/40";
    } else if (isIncrease) {
      badgeClasses = "bg-rose-500/25 text-rose-200 border border-rose-400/40";
    } else {
      badgeClasses = "bg-white/20 text-white/90";
    }
  } else {
    if (isSavings) {
      badgeClasses =
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800";
    } else if (isIncrease) {
      badgeClasses =
        "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800";
    } else {
      badgeClasses =
        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700";
    }
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full shrink-0 shadow-2xs whitespace-nowrap",
        badgeClasses,
      )}
      title={
        isSavings
          ? `Ahorro de ${formatRD(Math.abs(diff))} vs mes anterior`
          : isIncrease
            ? `Incremento de ${formatRD(diff)} vs mes anterior`
            : "Gasto idéntico al mes anterior"
      }
    >
      {isSavings && (
        <TrendingDown className="h-3 w-3 shrink-0 text-emerald-500 dark:text-emerald-400" />
      )}
      {isIncrease && <TrendingUp className="h-3 w-3 shrink-0 text-rose-500 dark:text-rose-400" />}
      {isFlat && <Minus className="h-3 w-3 shrink-0 text-slate-400" />}
      <span>{formattedPct} vs mes ant.</span>
    </span>
  );
}

function GastoActions({
  gasto,
  onDuplicate,
  onDelete,
  compact = false,
}: {
  gasto: Gasto;
  onDuplicate: (gasto: Gasto) => void;
  onDelete: (gasto: Gasto) => void | Promise<void>;
  compact?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            "rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:bg-muted disabled:cursor-not-allowed disabled:opacity-55",
            compact ? "h-7 w-7" : "h-9 w-9",
          )}
          aria-label={`Acciones de ${gasto.descripcion}`}
        >
          <MoreHorizontal className={compact ? "h-4 w-4" : "h-5 w-5"} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 rounded-xl p-1.5">
        <DropdownMenuItem
          onClick={() => onDuplicate(gasto)}
          className="gap-2 rounded-lg text-xs font-bold"
        >
          <Copy className="h-4 w-4" /> Duplicar gasto
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => void onDelete(gasto)}
          className="gap-2 rounded-lg text-xs font-bold text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4" /> Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GastosPage() {
  const user = useRequireAuth();
  const tenant = user?.tenant;
  const currencySymbol = tenant?.moneda_simbolo || "RD$";
  const tenantId = tenant?.id || "";
  const queryClient = useQueryClient();

  const { data: rawGastos = [], isLoading: loadingGastos } = useGastos(tenantId);
  const { data: ecfConfig } = useECFConfig(tenantId);
  const { data: plans = [] } = usePlans();
  const { data: gastoCategorias = [] } = useGastoCategorias(tenantId);
  const { data: gastoPlantillas = [] } = useGastoPlantillas(tenantId);
  const { data: suplidores = [] } = useSuplidores(tenantId);

  const [showGastoModal, setShowGastoModal] = useState(false);
  const [showCompraModal, setShowCompraModal] = useState(false);
  const [showCompararModal, setShowCompararModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [prefillTemplate, setPrefillTemplate] = useState<GastoPlantilla | null>(null);
  const [recibidos, setRecibidos] = useState<ECFDocumentRecibido[]>([]);
  const [activeTab, setActiveTab] = useState("manual");
  const [isPrinting, setIsPrinting] = useState(false);

  // Filtros interactivos
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<
    "all" | "today" | "yesterday" | "7d" | "this_month" | "this_year" | "month_select" | "custom"
  >("all");
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

  const plan =
    plans.find((p) => p.id === user?.tenant?.plan_id) || (user ? getTenantPlan(user.tenant) : null);
  const canSeeFiscal = isModuleEnabled(
    user?.tenant || null,
    "facturacion_fiscal",
    plan || undefined,
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["gastos", tenantId] });
    queryClient.invalidateQueries({ queryKey: ["ecf-documents", tenantId] });
    queryClient.invalidateQueries({ queryKey: ["ecf-sequences", tenantId] });
    queryClient.invalidateQueries({ queryKey: ["caja-abierta", tenantId] });
    queryClient.invalidateQueries({ queryKey: ["cajas", tenantId] });
    queryClient.invalidateQueries({ queryKey: ["movimientos", tenantId] });
    queryClient.invalidateQueries({ queryKey: ["gasto-categorias", tenantId] });
    queryClient.invalidateQueries({ queryKey: ["gasto-plantillas", tenantId] });
  };

  const [gastoToDelete, setGastoToDelete] = useState<Gasto | null>(null);
  const [isDeletingGasto, setIsDeletingGasto] = useState(false);

  async function confirmDeleteGasto(gasto: Gasto) {
    setIsDeletingGasto(true);
    queryClient.setQueryData<Gasto[]>(["gastos", tenantId], (current = []) =>
      current.filter((item) => item.id !== gasto.id),
    );
    try {
      await deleteGasto(gasto.id, tenantId);
      refresh();
      toast.success(`Gasto "${gasto.descripcion}" eliminado permanentemente`);
      setGastoToDelete(null);
    } catch (error: any) {
      refresh();
      toast.error(error?.message || "No se pudo eliminar el gasto.");
    } finally {
      setIsDeletingGasto(false);
    }
  }

  function duplicateExpense(gasto: Gasto) {
    setPrefillTemplate({
      id: `duplicate-${gasto.id}`,
      tenant_id: tenantId,
      nombre: gasto.descripcion,
      descripcion: gasto.descripcion,
      categoria_id: gasto.categoria_id,
      categoria_nombre: gasto.categoria,
      suplidor_id: gasto.suplidor_id,
      proveedor_nombre: gasto.proveedor,
      metodo_pago: gasto.metodo_pago,
      monto_predeterminado: gasto.monto,
      es_recurrente: false,
      activo: true,
      usos: 0,
      creado_en: new Date().toISOString(),
    });
    setShowGastoModal(true);
  }

  // Segmentación de Gastos
  const manualGastos = useMemo(() => gastos.filter((g) => !g.is_caja_chica), [gastos]);
  const cajaChicaGastos = useMemo(() => gastos.filter((g) => g.is_caja_chica), [gastos]);

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
      list = list.filter((g) => (g.fecha || "").startsWith(todayStr));
    } else if (dateFilter === "yesterday") {
      const yesterday = new Date(now.getTime() - 86400000);
      const yStr = yesterday.toISOString().slice(0, 10);
      list = list.filter((g) => (g.fecha || "").startsWith(yStr));
    } else if (dateFilter === "7d") {
      const past7 = new Date(now.getTime() - 7 * 86400000);
      past7.setHours(0, 0, 0, 0);
      list = list.filter((g) => new Date(g.fecha) >= past7);
    } else if (dateFilter === "this_month") {
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      list = list.filter((g) => (g.fecha || "").startsWith(ym));
    } else if (dateFilter === "this_year") {
      const y = `${now.getFullYear()}`;
      list = list.filter((g) => (g.fecha || "").startsWith(y));
    } else if (dateFilter === "month_select") {
      const ym = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
      list = list.filter((g) => (g.fecha || "").startsWith(ym));
    } else if (dateFilter === "custom") {
      if (customStartDate && customEndDate) {
        list = list.filter((g) => {
          const f = (g.fecha || "").slice(0, 10);
          return f >= customStartDate && f <= customEndDate;
        });
      } else if (customStartDate) {
        list = list.filter((g) => (g.fecha || "").slice(0, 10) >= customStartDate);
      } else if (customEndDate) {
        list = list.filter((g) => (g.fecha || "").slice(0, 10) <= customEndDate);
      }
    }

    // Filtro por categoría
    if (selectedCategory !== "all") {
      list = list.filter((g) => g.categoria === selectedCategory);
    }

    // Búsqueda
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (g) =>
          (g.descripcion && g.descripcion.toLowerCase().includes(q)) ||
          (g.proveedor && g.proveedor.toLowerCase().includes(q)) ||
          (g.categoria && g.categoria.toLowerCase().includes(q)) ||
          (g.metodo_pago && g.metodo_pago.toLowerCase().includes(q)) ||
          String(g.monto).includes(q),
      );
    }

    return list;
  }, [
    currentList,
    dateFilter,
    selectedMonth,
    selectedYear,
    customStartDate,
    customEndDate,
    selectedCategory,
    searchQuery,
  ]);

  const visibleTotal = useMemo(
    () => filteredList.reduce((sum, item) => sum + (item.monto || 0), 0),
    [filteredList],
  );
  const visibleTopCategory = useMemo(() => {
    const totals = filteredList.reduce<Record<string, number>>((acc, item) => {
      acc[item.categoria] = (acc[item.categoria] || 0) + (item.monto || 0);
      return acc;
    }, {});
    const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
    return top
      ? {
          name: top[0],
          amount: top[1],
          pct: visibleTotal > 0 ? Math.round((top[1] / visibleTotal) * 100) : 0,
        }
      : { name: "Sin gastos", amount: 0, pct: 0 };
  }, [filteredList, visibleTotal]);

  // Métricas Financieras
  const totalEgresosGlobal = useMemo(
    () => gastos.reduce((s, g) => s + (g.monto || 0), 0),
    [gastos],
  );
  const totalManuales = useMemo(
    () => manualGastos.reduce((s, g) => s + (g.monto || 0), 0),
    [manualGastos],
  );
  const totalCajaChica = useMemo(
    () => cajaChicaGastos.reduce((s, g) => s + (g.monto || 0), 0),
    [cajaChicaGastos],
  );

  // Desglose por categoría de todos los gastos
  const porCategoria = useMemo(() => {
    return gastos.reduce(
      (m, g) => {
        m[g.categoria] = (m[g.categoria] || 0) + (g.monto || 0);
        return m;
      },
      {} as Record<string, number>,
    );
  }, [gastos]);
  const porCategoriaActual = useMemo(
    () =>
      currentList.reduce(
        (acc, item) => {
          acc[item.categoria] = (acc[item.categoria] || 0) + (item.monto || 0);
          return acc;
        },
        {} as Record<string, number>,
      ),
    [currentList],
  );
  const categoryBreakdown = useMemo(() => {
    const total = currentList.reduce((sum, item) => sum + (item.monto || 0), 0);
    const counts = currentList.reduce<Record<string, number>>((acc, item) => {
      acc[item.categoria] = (acc[item.categoria] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(porCategoriaActual)
      .map(([name, amount]) => ({
        name,
        amount,
        count: counts[name] || 0,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [currentList, porCategoriaActual]);

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

  const activeTemplates = useMemo(
    () =>
      gastoPlantillas.filter((item) => item.activo).sort((a, b) => (b.usos || 0) - (a.usos || 0)),
    [gastoPlantillas],
  );
  const upcomingRecurring = useMemo(
    () =>
      activeTemplates
        .filter((item) => item.es_recurrente && item.proxima_fecha)
        .sort((a, b) => String(a.proxima_fecha).localeCompare(String(b.proxima_fecha)))
        .slice(0, 3),
    [activeTemplates],
  );

  // Comparativa MoM (Mes seleccionado o actual vs Mes inmediatamente anterior)
  const momComparison = useMemo(() => {
    const now = new Date();
    let refYear = now.getFullYear();
    let refMonth = now.getMonth();

    if (dateFilter === "month_select") {
      refYear = selectedYear;
      refMonth = selectedMonth;
    }

    const curYearMonth = `${refYear}-${String(refMonth + 1).padStart(2, "0")}`;

    // Mes inmediatamente anterior
    const prevDate = new Date(refYear, refMonth - 1, 1);
    const prevYearMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

    // 1. Total Egresos Globales
    const curTotal = gastos
      .filter((g) => (g.fecha || "").startsWith(curYearMonth))
      .reduce((s, g) => s + (g.monto || 0), 0);
    const prevTotal = gastos
      .filter((g) => (g.fecha || "").startsWith(prevYearMonth))
      .reduce((s, g) => s + (g.monto || 0), 0);
    const totalDiff = curTotal - prevTotal;
    const totalPct =
      prevTotal === 0 ? (curTotal > 0 ? 100 : 0) : ((curTotal - prevTotal) / prevTotal) * 100;

    // 2. Gastos Operativos (Manuales)
    const curManual = manualGastos
      .filter((g) => (g.fecha || "").startsWith(curYearMonth))
      .reduce((s, g) => s + (g.monto || 0), 0);
    const prevManual = manualGastos
      .filter((g) => (g.fecha || "").startsWith(prevYearMonth))
      .reduce((s, g) => s + (g.monto || 0), 0);
    const manualDiff = curManual - prevManual;
    const manualPct =
      prevManual === 0 ? (curManual > 0 ? 100 : 0) : ((curManual - prevManual) / prevManual) * 100;

    // 3. Caja Chica
    const curCaja = cajaChicaGastos
      .filter((g) => (g.fecha || "").startsWith(curYearMonth))
      .reduce((s, g) => s + (g.monto || 0), 0);
    const prevCaja = cajaChicaGastos
      .filter((g) => (g.fecha || "").startsWith(prevYearMonth))
      .reduce((s, g) => s + (g.monto || 0), 0);
    const cajaDiff = curCaja - prevCaja;
    const cajaPct =
      prevCaja === 0 ? (curCaja > 0 ? 100 : 0) : ((curCaja - prevCaja) / prevCaja) * 100;

    // 4. Mayor Categoría
    const catName = topCategoria.name;
    const hasTopCat = catName && catName !== "Sin egresos";
    const curCat = hasTopCat
      ? gastos
          .filter((g) => (g.fecha || "").startsWith(curYearMonth) && g.categoria === catName)
          .reduce((s, g) => s + (g.monto || 0), 0)
      : 0;
    const prevCat = hasTopCat
      ? gastos
          .filter((g) => (g.fecha || "").startsWith(prevYearMonth) && g.categoria === catName)
          .reduce((s, g) => s + (g.monto || 0), 0)
      : 0;
    const catDiff = curCat - prevCat;
    const catPct = prevCat === 0 ? (curCat > 0 ? 100 : 0) : ((curCat - prevCat) / prevCat) * 100;

    return {
      curYearMonth,
      prevYearMonth,
      curMonthName: MESES_NOMBRES[refMonth],
      prevMonthName: MESES_NOMBRES[prevDate.getMonth()],
      total: {
        cur: curTotal,
        prev: prevTotal,
        diff: totalDiff,
        pct: totalPct,
        hasData: curTotal > 0 || prevTotal > 0,
      },
      manual: {
        cur: curManual,
        prev: prevManual,
        diff: manualDiff,
        pct: manualPct,
        hasData: curManual > 0 || prevManual > 0,
      },
      caja: {
        cur: curCaja,
        prev: prevCaja,
        diff: cajaDiff,
        pct: cajaPct,
        hasData: curCaja > 0 || prevCaja > 0,
      },
      cat: {
        name: catName,
        cur: curCat,
        prev: prevCat,
        diff: catDiff,
        pct: catPct,
        hasData: curCat > 0 || prevCat > 0,
      },
    };
  }, [
    gastos,
    manualGastos,
    cajaChicaGastos,
    topCategoria,
    dateFilter,
    selectedMonth,
    selectedYear,
  ]);

  const exportData = useMemo(() => {
    if (activeTab === "caja-chica") {
      return {
        filename: "Gastos_Caja_Chica",
        columns: ["Fecha", "Categoría", "Descripción", "Método de Pago", "Monto"],
        data: cajaChicaGastos.map((g) => [
          formatDateRD(g.fecha),
          g.categoria,
          g.descripcion,
          g.metodo_pago,
          formatRD(g.monto),
        ]),
      };
    }
    return {
      filename: "Gastos_Manuales",
      columns: ["Fecha", "Categoría", "Descripción", "Proveedor", "Método de Pago", "Monto"],
      data: manualGastos.map((g) => [
        formatDateRD(g.fecha),
        g.categoria,
        g.descripcion,
        g.proveedor || "—",
        g.metodo_pago,
        formatRD(g.monto),
      ]),
    };
  }, [activeTab, manualGastos, cajaChicaGastos]);

  if (!user || user.tenant.id === "__loading__" || (loadingGastos && rawGastos.length === 0)) {
    return <GlobalPageLoader text="Cargando egresos y gastos..." />;
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={(t) => {
        setActiveTab(t);
        setSelectedCategory("all");
      }}
      className="space-y-6 pb-12 animate-in fade-in-50 duration-300 w-full"
    >
      {/* HEADER DE PÁGINA LLAMATIVO CON DESCRIPCIÓN ESTILO NÓMINA */}
      <PageHeader
        title="Gastos"
        description="Registra una vez, reutiliza plantillas y mantén cada egreso correctamente clasificado"
      >
        <Button
          type="button"
          onClick={() => setShowSetupModal(true)}
          className="h-10 shrink-0 rounded-xl px-3.5 font-black whitespace-nowrap bg-[#F0B900] hover:bg-[#d9a700] text-[#1B4B73] border border-[#d4a300] shadow-sm active:translate-y-px transition-all cursor-pointer"
        >
          <Settings2 className="mr-2 h-4 w-4 text-[#1B4B73]" /> Organizar
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl bg-slate-700 hover:bg-slate-800 text-white shadow-sm active:translate-y-px transition-all cursor-pointer border-0"
              aria-label="Más acciones"
            >
              <MoreHorizontal className="h-4 w-4 text-white" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 sm:w-72 rounded-2xl p-2 shadow-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <DropdownMenuItem
              className="gap-3 rounded-xl py-2.5 px-3 text-sm font-bold cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setShowCompraModal(true)}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 shrink-0">
                <ShoppingBag className="h-4.5 w-4.5" />
              </div>
              <span>Registrar compra fiscal E41</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-3 rounded-xl py-2.5 px-3 text-sm font-bold cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setShowCompararModal(true)}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 shrink-0">
                <Scale className="h-4.5 w-4.5" />
              </div>
              <span>Comparar períodos</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-3 rounded-xl py-2.5 px-3 text-sm font-bold cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => {
                exportGastosListToExcel(
                  activeTab === "caja-chica" ? cajaChicaGastos : manualGastos,
                  activeTab,
                  user?.tenant?.nombre || "Klynn",
                  getTenantCurrencySymbol(user?.tenant),
                  user?.tenant?.moneda_codigo || "DOP",
                );
              }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                <FileSpreadsheet className="h-4.5 w-4.5" />
              </div>
              <span>Exportar Excel</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-3 rounded-xl py-2.5 px-3 text-sm font-bold cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setIsPrinting(true)}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-500/15 text-slate-700 dark:text-slate-300 shrink-0">
                <Printer className="h-4.5 w-4.5" />
              </div>
              <span>Imprimir o guardar PDF</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          type="button"
          onClick={() => {
            setPrefillTemplate(null);
            setShowGastoModal(true);
          }}
          className="h-10 shrink-0 rounded-xl bg-primary px-4 font-bold text-primary-foreground whitespace-nowrap hover:bg-primary/90 active:translate-y-px"
        >
          <Plus className="mr-2 h-4 w-4 text-secondary" /> Registrar gasto
        </Button>
      </PageHeader>

      {/* PESTAÑAS (Gastos Manuales & Caja Chica) */}
      <div className="flex items-center gap-2">
        <TabsList className="flex items-center gap-2 bg-transparent p-0 border-none h-auto justify-start overflow-x-auto scrollbar-none">
          {/* Gastos Manuales (Azul Añil / Primary) */}
          <TabsTrigger
            value="manual"
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-surface border border-border/80 text-foreground shadow-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-md transition-colors hover:bg-muted/60 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Receipt
              className={`h-4 w-4 shrink-0 transition-colors ${
                activeTab === "manual" ? "text-secondary" : "text-primary"
              }`}
            />
            <span>Gastos Manuales</span>
            <span
              className={`ml-0.5 rounded-full px-2 py-0.5 text-[10px] font-black leading-none ${
                activeTab === "manual" ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
              }`}
            >
              {manualGastos.length}
            </span>
          </TabsTrigger>

          {/* Caja Chica (Ámbar / Oro) */}
          <TabsTrigger
            value="caja-chica"
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-surface border border-border/80 text-foreground shadow-xs data-[state=active]:bg-amber-600 data-[state=active]:text-white data-[state=active]:border-amber-600 data-[state=active]:shadow-md transition-colors hover:bg-muted/60 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <PiggyBank
              className={`h-4 w-4 shrink-0 transition-colors ${
                activeTab === "caja-chica" ? "text-white" : "text-amber-600 dark:text-amber-400"
              }`}
            />
            <span>Caja Chica</span>
            <span
              className={`ml-0.5 rounded-full px-2 py-0.5 text-[10px] font-black leading-none ${
                activeTab === "caja-chica"
                  ? "bg-white/20 text-white"
                  : "bg-amber-500/15 text-amber-800 dark:text-amber-300"
              }`}
            >
              {cajaChicaGastos.length}
            </span>
          </TabsTrigger>
        </TabsList>
      </div>

      <section className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* 1. REGISTRO RÁPIDO CON PLANTILLAS */}
        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-surface p-4 sm:p-4.5 shadow-2xs transition-all hover:border-border hover:shadow-xs">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                  <Zap className="h-4.5 w-4.5 fill-amber-500/20" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-sm sm:text-[15px] font-black tracking-tight text-foreground">
                      Registro rápido
                    </h2>
                    {activeTemplates.length > 0 && (
                      <span className="rounded-full bg-muted/80 px-2 py-0.5 text-[10px] font-bold text-muted-foreground border border-border/50">
                        {activeTemplates.length}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    Elige una plantilla para completar el egreso en un clic
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setShowSetupModal(true)}
                className="h-8 shrink-0 gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3 text-xs font-bold text-white shadow-sm active:scale-95 transition-all border-0 cursor-pointer"
              >
                <Settings2 className="h-3.5 w-3.5 text-white" />
                <span className="hidden sm:inline">Administrar</span>
              </Button>
            </div>

            <div className="mt-3.5 flex items-center gap-2.5 overflow-x-auto pb-1 custom-scrollbar">
              {activeTemplates.slice(0, 8).map((template) => {
                const catMeta = getGastoCategoriaVisual(template.categoria_nombre);
                const IconComponent = catMeta.icon || Receipt;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => {
                      setPrefillTemplate(template);
                      setShowGastoModal(true);
                    }}
                    className="group relative flex min-h-[50px] shrink-0 items-center gap-2.5 rounded-xl border border-border/80 bg-background/90 px-3 py-1.5 text-left shadow-2xs transition-all hover:border-amber-500/50 hover:bg-amber-500/[0.03] hover:shadow-xs active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 group-hover:scale-105 transition-transform">
                      <IconComponent className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex flex-col min-w-0 pr-1">
                      <span className="max-w-[145px] truncate text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                        {template.nombre}
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px] leading-tight">
                        {template.monto_predeterminado ? (
                          <span className="font-mono font-bold text-foreground/85 tabular-nums">
                            {formatRD(template.monto_predeterminado)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/80 font-medium">Variable</span>
                        )}
                        {template.categoria_nombre && (
                          <>
                            <span className="text-muted-foreground/40">•</span>
                            <span className="truncate max-w-[85px] text-muted-foreground/80 font-medium">
                              {template.categoria_nombre}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setShowSetupModal(true)}
                className="group flex min-h-[50px] shrink-0 items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/[0.03] hover:bg-primary/[0.08] hover:border-primary/70 px-3.5 py-1.5 text-xs font-bold text-primary transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-2xs"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                  <Plus className="h-3.5 w-3.5" />
                </div>
                <span className="whitespace-nowrap">
                  {activeTemplates.length ? "Nueva plantilla" : "Crear primera plantilla"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. PRÓXIMOS GASTOS RECURRENTES */}
        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-surface p-4 sm:p-4.5 shadow-2xs transition-all hover:border-border hover:shadow-xs">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                  <Clock3 className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-sm sm:text-[15px] font-black tracking-tight text-foreground">
                      Próximos gastos
                    </h2>
                    {upcomingRecurring.length > 0 && (
                      <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 dark:bg-blue-500/20 border border-blue-500/20">
                        {upcomingRecurring.length}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    Egresos recurrentes programados
                  </p>
                </div>
              </div>
              {upcomingRecurring.length === 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-xs shrink-0 whitespace-nowrap select-none">
                  <Check className="h-3.5 w-3.5 stroke-[2.5] text-white shrink-0" />
                  <span>Al día</span>
                </span>
              )}
            </div>

            <div className="mt-3.5 space-y-2">
              {upcomingRecurring.map((template) => {
                const dateInfo = formatUpcomingDate(template.proxima_fecha || "");
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => {
                      setPrefillTemplate(template);
                      setShowGastoModal(true);
                    }}
                    className="group flex w-full items-center justify-between gap-2.5 rounded-xl border border-border/70 bg-background/80 hover:bg-card p-2 text-left transition-all hover:border-blue-500/40 hover:shadow-2xs active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex flex-col min-w-0">
                        <span className="truncate text-xs font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {template.nombre}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground leading-tight">
                          {template.monto_predeterminado ? (
                            <span className="font-mono font-bold text-foreground/85 tabular-nums">
                              {formatRD(template.monto_predeterminado)}
                            </span>
                          ) : (
                            <span>Monto variable</span>
                          )}
                          {template.frecuencia && (
                            <>
                              <span className="text-muted-foreground/30">•</span>
                              <span className="capitalize text-[10px] text-muted-foreground/80 font-medium">
                                {template.frecuencia.toLowerCase()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`rounded-lg px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                          dateInfo.isUrgent
                            ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/25"
                            : dateInfo.isNear
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25"
                            : "bg-muted text-muted-foreground border border-border/60"
                        }`}
                      >
                        {dateInfo.label}
                      </span>
                      <div className="flex h-6.5 w-6.5 items-center justify-center rounded-lg bg-primary/10 text-primary opacity-60 group-hover:opacity-100 group-hover:bg-primary group-hover:text-white transition-all">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </button>
                );
              })}

              {upcomingRecurring.length === 0 && (
                <div className="flex items-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/15 p-3 text-left">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground">Sin gastos pendientes</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Crea plantillas recurrentes para recordar tus pagos.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4 EXECUTIVE KPI CARDS (EXACTO ESTILO /CAJA CON COMPARATIVA MOM) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Total Egresos Globales (Variant: Solid Azul Añil #1B4B73) */}
        <Card className="p-4 sm:p-4.5 rounded-2xl bg-primary text-primary-foreground shadow-md border-0 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-[13px] uppercase tracking-wider text-white/90 font-black">
              Total visible
            </span>
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-secondary" />
          </div>
          <div
            className="my-1.5 font-display font-black tracking-tight text-white text-xl sm:text-2xl truncate tabular-nums"
            title={formatRD(visibleTotal)}
          >
            {formatRD(visibleTotal)}
          </div>
          <div className="flex items-center justify-between gap-1.5 flex-wrap pt-1.5 border-t border-white/10 mt-1">
            <span className="text-xs sm:text-[13px] font-semibold truncate text-white/90">
              {filteredList.length} operaciones
            </span>
            <span className="text-[10px] font-bold text-white/70">Según filtros</span>
          </div>
        </Card>

        {/* 2. Gastos Manuales Operativos (Variant: Rose) */}
        <Card className="p-4 sm:p-4.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-[13px] uppercase tracking-wider text-rose-800 dark:text-rose-300 font-black">
              Promedio por gasto
            </span>
            <Receipt className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-rose-600 dark:text-rose-400" />
          </div>
          <div
            className="my-1.5 font-display font-black tracking-tight text-foreground text-xl sm:text-2xl truncate tabular-nums"
            title={formatRD(filteredList.length ? visibleTotal / filteredList.length : 0)}
          >
            {formatRD(filteredList.length ? visibleTotal / filteredList.length : 0)}
          </div>
          <div className="flex items-center justify-between gap-1.5 flex-wrap pt-1.5 border-t border-rose-500/15 mt-1">
            <span className="text-xs sm:text-[13px] font-bold truncate text-rose-800 dark:text-rose-300">
              {activeTab === "caja-chica" ? "Caja chica" : "Operativos"}
            </span>
            <span className="text-[10px] font-bold text-rose-700/70 dark:text-rose-300/70">
              Por movimiento
            </span>
          </div>
        </Card>

        {/* 3. Caja Chica / Gastos Menores (Variant: Amber) */}
        <Card className="p-4 sm:p-4.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-[13px] uppercase tracking-wider text-amber-800 dark:text-amber-300 font-black">
              Plantillas activas
            </span>
            <Layers3 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="my-1.5 font-display font-black tracking-tight text-foreground text-xl sm:text-2xl truncate tabular-nums">
            {activeTemplates.length}
          </div>
          <div className="flex items-center justify-between gap-1.5 flex-wrap pt-1.5 border-t border-amber-500/15 mt-1">
            <span className="text-xs sm:text-[13px] font-bold truncate text-amber-800 dark:text-amber-300">
              {activeTemplates.filter((item) => item.es_recurrente).length} recurrentes
            </span>
            <button
              type="button"
              onClick={() => setShowSetupModal(true)}
              className="text-[10px] font-black text-amber-800 underline-offset-2 hover:underline dark:text-amber-300"
            >
              Administrar
            </button>
          </div>
        </Card>

        {/* 4. Mayor Impacto Presupuestario (Variant: Indigo) */}
        <Card className="p-4 sm:p-4.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-[13px] uppercase tracking-wider text-indigo-800 dark:text-indigo-300 font-black">
              Mayor Categoría
            </span>
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div
            className="my-1.5 font-display font-black tracking-tight text-foreground text-xl sm:text-2xl truncate capitalize"
            title={visibleTopCategory.name}
          >
            {visibleTopCategory.name}
          </div>
          <div className="flex items-center justify-between gap-1.5 flex-wrap pt-1.5 border-t border-indigo-500/15 mt-1">
            <span className="text-xs sm:text-[13px] font-bold truncate text-indigo-800 dark:text-indigo-300">
              {formatRD(visibleTopCategory.amount)} ({visibleTopCategory.pct}%)
            </span>
            <span className="text-[10px] font-bold text-indigo-700/70 dark:text-indigo-300/70">
              De lo visible
            </span>
          </div>
        </Card>
      </div>

      {/* CONTENIDO DE PESTAÑA */}
      <div className="space-y-5">
        {/* BARRA DE FILTROS & BÚSQUEDA */}
        {activeTab !== "fiscal" && (
          <div className="bg-surface p-3 sm:p-3.5 rounded-2xl border border-border/80 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-3">
            <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row lg:flex-1">
              {/* Input de Búsqueda */}
              <div className="relative min-w-0 flex-1 lg:max-w-md">
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
                    aria-label="Limpiar búsqueda"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:text-foreground"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Filtro profesional de categorías */}
              <Popover open={isCategoryFilterOpen} onOpenChange={setIsCategoryFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    aria-expanded={isCategoryFilterOpen}
                    className={cn(
                      "h-10 w-full justify-between gap-2 rounded-xl border-border/80 bg-background px-3 text-xs font-bold shadow-2xs sm:w-[13.5rem]",
                      "hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring active:bg-muted disabled:cursor-not-allowed disabled:opacity-55",
                      selectedCategory !== "all" && "border-primary/40 bg-primary/5 text-primary",
                    )}
                    disabled={categoryBreakdown.length === 0}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Tag className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {selectedCategory === "all" ? "Todas las categorías" : selectedCategory}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-black tabular-nums text-muted-foreground">
                        {selectedCategory === "all"
                          ? currentList.length
                          : categoryBreakdown.find((item) => item.name === selectedCategory)
                              ?.count || 0}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-80 max-w-[calc(100vw-2rem)] rounded-2xl border-border bg-background p-2 shadow-xl"
                >
                  <div className="border-b border-border px-2 pb-2 pt-1">
                    <p className="text-sm font-black text-foreground">Filtrar por categoría</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Importes correspondientes a la pestaña actual.
                    </p>
                  </div>

                  <div className="max-h-72 space-y-1 overflow-y-auto py-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory("all");
                        setIsCategoryFilterOpen(false);
                      }}
                      className={cn(
                        "flex min-h-11 w-full items-center gap-3 rounded-xl px-2.5 text-left transition-colors",
                        "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-muted/80",
                        selectedCategory === "all" && "bg-primary/10",
                      )}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <LayoutGrid className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-black text-foreground">
                          Todas
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {currentList.length} {currentList.length === 1 ? "gasto" : "gastos"}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block text-xs font-black tabular-nums text-foreground">
                          {formatRD(currentList.reduce((sum, item) => sum + (item.monto || 0), 0))}
                        </span>
                        <span className="block text-[10px] font-bold text-muted-foreground">
                          100%
                        </span>
                      </span>
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0 text-primary",
                          selectedCategory !== "all" && "invisible",
                        )}
                      />
                    </button>

                    {categoryBreakdown.map((item) => {
                      const visual = getGastoCategoriaVisual(item.name);
                      const Icon = visual.icon;
                      const isSelected = selectedCategory === item.name;
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(item.name);
                            setIsCategoryFilterOpen(false);
                          }}
                          className={cn(
                            "flex min-h-11 w-full items-center gap-3 rounded-xl px-2.5 text-left transition-colors",
                            "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-muted/80",
                            isSelected && "bg-primary/10",
                          )}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-black text-foreground">
                              {visual.label}
                            </span>
                            <span className="block text-[11px] text-muted-foreground">
                              {item.count} {item.count === 1 ? "gasto" : "gastos"}
                            </span>
                          </span>
                          <span className="text-right">
                            <span className="block text-xs font-black tabular-nums text-foreground">
                              {formatRD(item.amount)}
                            </span>
                            <span className="block text-[10px] font-bold text-muted-foreground">
                              {item.percentage}%
                            </span>
                          </span>
                          <Check
                            className={cn(
                              "h-4 w-4 shrink-0 text-primary",
                              !isSelected && "invisible",
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-[background-color,color,border-color,box-shadow] duration-200 cursor-pointer shrink-0 whitespace-nowrap border ${
                      dateFilter === f.id
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
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
                      <SelectItem
                        key={mes}
                        value={String(idx)}
                        className="text-xs font-bold cursor-pointer rounded-xl"
                      >
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
                      <SelectItem
                        key={y}
                        value={String(y)}
                        className="text-xs font-bold cursor-pointer rounded-xl"
                      >
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
                      dateFilter === "custom"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-surface hover:bg-muted"
                    }`}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 text-secondary" />
                    <span>Rango Fechas</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-72 p-4 rounded-3xl shadow-2xl space-y-3 border-border/80 bg-background text-foreground"
                >
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="text-xs font-black font-display text-foreground">
                      Rango de Fechas
                    </span>
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
                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                        Fecha Desde
                      </label>
                      <Input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="h-9 rounded-xl bg-white dark:bg-slate-950 border border-border/80 text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                        Fecha Hasta
                      </label>
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
                      className="flex-1 h-8 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
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
          <Card className="overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-card">
            {filteredList.length > 0 ? (
              <>
                <div className="hidden md:block">
                  <table className="w-full table-fixed text-sm">
                    <thead className="border-b border-border/80 bg-muted/35 text-xs font-black uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="w-[34%] px-4 py-3.5 text-left">Gasto / beneficiario</th>
                        <th className="w-[16%] px-4 py-3.5 text-left">Fecha</th>
                        <th className="w-[18%] px-4 py-3.5 text-left">Forma de pago</th>
                        <th className="w-[18%] px-4 py-3.5 text-right">Monto</th>
                        <th className="w-[14%] px-4 py-3.5 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {filteredList.map((g) => {
                        const catVisual = getGastoCategoriaVisual(g.categoria, gastoCategorias);
                        const metodoVisual = getGastoMetodoVisual(g.metodo_pago);
                        const CatIcon = catVisual.icon;
                        const MetIcon = metodoVisual.icon;
                        return (
                          <tr key={g.id} className="group transition-colors hover:bg-muted/25">
                            <td className="px-4 py-3.5">
                              <p
                                className="truncate text-sm font-black text-foreground"
                                title={g.descripcion}
                              >
                                {g.descripcion}
                              </p>
                              <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                                <CatIcon className={cn("h-3.5 w-3.5 shrink-0", catVisual.text)} />
                                <span className="shrink-0 font-bold">{catVisual.label}</span>
                                <span aria-hidden="true">·</span>
                                <span className="truncate">
                                  {g.proveedor || "Sin beneficiario"}
                                </span>
                                {g.ncf && (
                                  <Badge
                                    variant="outline"
                                    className="ml-1 h-5 shrink-0 px-1.5 font-mono text-[9px]"
                                  >
                                    {g.ncf}
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 text-sm font-bold text-foreground">
                              {formatDateRD(g.fecha)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${metodoVisual.badgeClass}`}
                              >
                                <MetIcon className="h-3.5 w-3.5" />
                                {metodoVisual.label}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 text-right">
                              <span className="font-display text-base font-black tabular-nums text-foreground">
                                {formatRD(g.monto)}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <GastoActions
                                gasto={g}
                                onDuplicate={duplicateExpense}
                                onDelete={(item) => setGastoToDelete(item)}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-border/60 md:hidden">
                  {filteredList.map((g) => {
                    const catVisual = getGastoCategoriaVisual(g.categoria, gastoCategorias);
                    const metodoVisual = getGastoMetodoVisual(g.metodo_pago);
                    const CatIcon = catVisual.icon;
                    const MetIcon = metodoVisual.icon;
                    return (
                      <article
                        key={g.id}
                        className="px-4 py-3.5 transition-colors active:bg-muted/40"
                      >
                        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-2">
                          <p className="min-w-0 text-sm font-black leading-snug text-foreground">
                            {g.descripcion}
                          </p>
                          <span className="whitespace-nowrap font-display text-base font-black tabular-nums text-foreground">
                            {formatRD(g.monto)}
                          </span>
                          <GastoActions
                            gasto={g}
                            onDuplicate={duplicateExpense}
                            onDelete={(item) => setGastoToDelete(item)}
                            compact
                          />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1 font-bold">
                            <CatIcon className={cn("h-3 w-3", catVisual.text)} /> {catVisual.label}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 font-bold">
                            <MetIcon className="h-3 w-3" /> {metodoVisual.label}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{formatDateRD(g.fecha)}</span>
                        </div>
                        <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                          <span className="truncate">{g.proveedor || "Sin beneficiario"}</span>
                          {g.ncf && (
                            <span className="shrink-0 font-mono text-[9px] font-bold">{g.ncf}</span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
                <div className="rounded-2xl bg-muted p-4 text-muted-foreground">
                  <Receipt className="h-8 w-8" />
                </div>
                <h3 className="mt-3 font-display text-base font-bold text-foreground">
                  {searchQuery || selectedCategory !== "all" || dateFilter !== "all"
                    ? "No se encontraron egresos con estos filtros"
                    : "Sin gastos manuales registrados"}
                </h3>
                <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
                  {searchQuery || selectedCategory !== "all" || dateFilter !== "all"
                    ? "Intenta modificar tu búsqueda o limpiar los filtros seleccionados."
                    : "Registra los egresos operativos para mantener un balance financiero exacto."}
                </p>
                <Button
                  onClick={() => {
                    setPrefillTemplate(null);
                    setShowGastoModal(true);
                  }}
                  className="mt-4 rounded-xl bg-primary text-xs font-bold text-primary-foreground"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Registrar gasto
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* TAB 2: CAJA CHICA */}
        <TabsContent value="caja-chica" className="space-y-4 m-0">
          <Card className="overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-card">
            {filteredList.length > 0 ? (
              <>
                <div className="hidden md:block">
                  <table className="w-full table-fixed text-sm">
                    <thead className="border-b border-border/80 bg-muted/35 text-xs font-black uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="w-[42%] px-4 py-3.5 text-left">Gasto / origen</th>
                        <th className="w-[19%] px-4 py-3.5 text-left">Fecha</th>
                        <th className="w-[20%] px-4 py-3.5 text-left">Forma de pago</th>
                        <th className="w-[19%] px-4 py-3.5 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {filteredList.map((g) => {
                        const catVisual = getGastoCategoriaVisual(g.categoria, gastoCategorias);
                        const CatIcon = catVisual.icon;
                        return (
                          <tr key={g.id} className="transition-colors hover:bg-muted/25">
                            <td className="px-4 py-3.5">
                              <p
                                className="truncate text-sm font-black text-foreground"
                                title={g.descripcion}
                              >
                                {g.descripcion}
                              </p>
                              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                                <CatIcon className={cn("h-3.5 w-3.5 shrink-0", catVisual.text)} />
                                <span className="font-bold">{catVisual.label}</span>
                                <span aria-hidden="true">·</span>
                                <span>Caja chica</span>
                                {g.ncf && (
                                  <span className="ml-1 font-mono text-[9px] font-bold">
                                    {g.ncf}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 text-sm font-bold text-foreground">
                              {formatDateRD(g.fecha)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5">
                              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs font-bold text-foreground">
                                <Coins className="h-3.5 w-3.5 text-muted-foreground" /> Efectivo
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 text-right">
                              <span className="font-display text-base font-black tabular-nums text-foreground">
                                {formatRD(g.monto)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-border/60 md:hidden">
                  {filteredList.map((g) => {
                    const catVisual = getGastoCategoriaVisual(g.categoria, gastoCategorias);
                    const CatIcon = catVisual.icon;
                    return (
                      <article
                        key={g.id}
                        className="px-4 py-3.5 transition-colors active:bg-muted/40"
                      >
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                          <p className="min-w-0 text-sm font-black leading-snug text-foreground">
                            {g.descripcion}
                          </p>
                          <span className="whitespace-nowrap font-display text-base font-black tabular-nums text-foreground">
                            {formatRD(g.monto)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1 font-bold">
                            <CatIcon className={cn("h-3 w-3", catVisual.text)} /> {catVisual.label}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 font-bold">
                            <Coins className="h-3 w-3" /> Efectivo
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{formatDateRD(g.fecha)}</span>
                        </div>
                        {g.ncf && (
                          <p className="mt-1 font-mono text-[9px] font-bold text-muted-foreground">
                            {g.ncf}
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
                <div className="rounded-2xl bg-muted p-4 text-muted-foreground">
                  <PiggyBank className="h-8 w-8" />
                </div>
                <h3 className="mt-3 font-display text-base font-bold text-foreground">
                  Sin egresos de caja chica
                </h3>
                <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
                  Aquí aparecerán los gastos menores descontados directamente de los fondos de caja
                  chica.
                </p>
              </div>
            )}
          </Card>
        </TabsContent>
      </div>

      {/* MODAL 1: REGISTRAR NUEVO GASTO (E43 / INTERNO) */}
      <NewGasto
        open={showGastoModal}
        onOpenChange={setShowGastoModal}
        tenant={user.tenant}
        tenantConfig={user.tenant.config || DEFAULT_CONFIG}
        ecfConfig={ecfConfig}
        tenantId={user.tenant.id}
        empleadoId={user.empleado.id}
        categories={gastoCategorias}
        templates={gastoPlantillas}
        suppliers={suplidores}
        initialTemplate={prefillTemplate}
        onManage={() => setShowSetupModal(true)}
        onDone={refresh}
      />

      <ExpenseSetupDialog
        open={showSetupModal}
        onOpenChange={setShowSetupModal}
        tenantId={tenantId}
        categories={gastoCategorias}
        templates={gastoPlantillas}
        suppliers={suplidores}
        onChanged={refresh}
      />

      {/* MODAL 2: REGISTRAR NUEVA COMPRA FISCAL (E41 · PROVEEDORES INFORMALES) */}
      <NewCompraModal
        open={showCompraModal}
        onOpenChange={setShowCompraModal}
        tenant={user.tenant}
        tenantConfig={user.tenant.config || DEFAULT_CONFIG}
        ecfConfig={ecfConfig}
        tenantId={user.tenant.id}
        empleadoId={user.empleado.id}
        categories={gastoCategorias}
        suppliers={suplidores}
        onDone={() => {
          refresh();
          setShowCompraModal(false);
        }}
      />

      {/* MODAL 3: COMPARAR PERÍODOS (LADO A LADO) */}
      <CompararPeriodosModal
        open={showCompararModal}
        onOpenChange={setShowCompararModal}
        gastos={gastos}
        tenantNombre={user.tenant.nombre}
        tenant={user.tenant}
      />

      {/* MODAL DE CONFIRMACIÓN PARA ELIMINAR GASTO */}
      <AlertDialog
        open={Boolean(gastoToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeletingGasto) setGastoToDelete(null);
        }}
      >
        <AlertDialogContent className="rounded-3xl max-w-md p-6 bg-background border shadow-2xl">
          <AlertDialogHeader className="flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-2">
              <Trash2 className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-lg font-display font-bold text-foreground">
              ¿Eliminar este gasto?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Esta acción eliminará el gasto de forma permanente tanto de la nube como de este dispositivo.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {gastoToDelete && (
            <div className="my-2 rounded-2xl border border-border/80 bg-muted/30 p-3.5 space-y-1.5 text-left">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-foreground truncate">
                  {gastoToDelete.descripcion}
                </span>
                <span className="font-mono font-black text-sm text-foreground shrink-0">
                  {formatRD(gastoToDelete.monto)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="font-semibold">{gastoToDelete.categoria}</span>
                <span>•</span>
                <span>{formatDateRD(gastoToDelete.fecha)}</span>
                <span>•</span>
                <span className="capitalize">{gastoToDelete.metodo_pago?.toLowerCase()}</span>
              </div>
            </div>
          )}

          <AlertDialogFooter className="mt-2 grid grid-cols-2 gap-2 sm:gap-2">
            <AlertDialogCancel
              disabled={isDeletingGasto}
              onClick={() => setGastoToDelete(null)}
              className="rounded-xl h-10 text-xs font-bold w-full m-0 cursor-pointer"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingGasto}
              onClick={(e) => {
                e.preventDefault();
                if (gastoToDelete) void confirmDeleteGasto(gastoToDelete);
              }}
              className="rounded-xl h-10 text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full m-0 cursor-pointer transition-all active:scale-[0.98]"
            >
              {isDeletingGasto ? "Eliminando..." : "Sí, eliminar gasto"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            "flex items-center justify-between text-left font-sans font-medium text-slate-900 dark:text-slate-100 rounded-xl bg-surface border border-border/80 text-xs sm:text-sm px-3 h-10 transition-colors hover:bg-muted/40 hover:border-primary cursor-pointer shadow-2xs select-none",
            className,
          )}
        >
          <span className="truncate">{displayStr || "DD/MM/AAAA"}</span>
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0 ml-1.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 z-50 rounded-2xl shadow-xl border border-border bg-background"
        align="start"
      >
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

function advanceRecurringDate(
  base: string,
  frequency?: GastoPlantilla["frecuencia"],
): string | undefined {
  if (!frequency) return undefined;
  const date = base ? new Date(`${base}T12:00:00`) : new Date();
  if (frequency === "SEMANAL") date.setDate(date.getDate() + 7);
  if (frequency === "MENSUAL") date.setMonth(date.getMonth() + 1);
  if (frequency === "TRIMESTRAL") date.setMonth(date.getMonth() + 3);
  if (frequency === "ANUAL") date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

function NewGasto({
  open,
  onOpenChange,
  tenant,
  tenantConfig,
  ecfConfig,
  tenantId,
  empleadoId,
  categories,
  templates,
  suppliers,
  initialTemplate,
  onManage,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant?: Tenant;
  tenantConfig?: TenantConfig;
  ecfConfig?: any;
  tenantId: string;
  empleadoId: string;
  categories: GastoCategoria[];
  templates: GastoPlantilla[];
  suppliers: Suplidor[];
  initialTemplate: GastoPlantilla | null;
  onManage: () => void;
  onDone: () => void;
}) {
  const currencySymbol = tenant?.moneda_simbolo || getActiveTenantLocalization().moneda_simbolo || "RD$";
  const isElectronic = !!ecfConfig?.is_active || !!ecfConfig?.ef2_environment || !!tenant?.rnc;
  const activeCategories = useMemo(() => categories.filter((item) => item.activo), [categories]);
  const activeTemplates = useMemo(() => templates.filter((item) => item.activo), [templates]);
  const activeSuppliers = useMemo(() => suppliers.filter((item) => item.activo), [suppliers]);
  const [templateId, setTemplateId] = useState("none");
  const [description, setDescription] = useState("");
  const [rawAmount, setRawAmount] = useState("");
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [supplierId, setSupplierId] = useState("none");
  const [manualSupplier, setManualSupplier] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [emitFiscal, setEmitFiscal] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const amount = parseAmount(rawAmount);

  function applyTemplate(template: GastoPlantilla | null) {
    if (!template) {
      setTemplateId("none");
      return;
    }
    setTemplateId(template.id.startsWith("duplicate-") ? "none" : template.id);
    setDescription(template.descripcion || template.nombre);
    setRawAmount(
      template.monto_predeterminado ? formatAmountInput(String(template.monto_predeterminado)) : "",
    );
    setCategoryId(
      template.categoria_id ||
        activeCategories.find((item) => item.nombre === template.categoria_nombre)?.id ||
        activeCategories[0]?.id ||
        "",
    );
    setPaymentMethod(template.metodo_pago || "Efectivo");
    setSupplierId(template.suplidor_id || "none");
    setManualSupplier(template.proveedor_nombre || "");
  }

  function resetForm(keepTemplate = false) {
    const today = new Date().toISOString().slice(0, 10);
    setDate(today);
    setAdvanced(false);
    setEmitFiscal(false);
    setSaveAsTemplate(false);
    setNewTemplateName("");
    if (keepTemplate) {
      setRawAmount("");
      return;
    }
    setTemplateId("none");
    setDescription("");
    setRawAmount("");
    setCategoryId(activeCategories[0]?.id || "");
    setPaymentMethod("Efectivo");
    setSupplierId("none");
    setManualSupplier("");
  }

  useEffect(() => {
    if (!open) return;
    setDate(new Date().toISOString().slice(0, 10));
    setAdvanced(false);
    setEmitFiscal(false);
    setSaveAsTemplate(false);
    setNewTemplateName("");
    setDescription(initialTemplate?.descripcion || initialTemplate?.nombre || "");
    setRawAmount(
      initialTemplate?.monto_predeterminado
        ? formatAmountInput(String(initialTemplate.monto_predeterminado))
        : "",
    );
    setCategoryId(
      initialTemplate?.categoria_id ||
        activeCategories.find((item) => item.nombre === initialTemplate?.categoria_nombre)?.id ||
        activeCategories[0]?.id ||
        "",
    );
    setPaymentMethod(initialTemplate?.metodo_pago || "Efectivo");
    setSupplierId(initialTemplate?.suplidor_id || "none");
    setManualSupplier(initialTemplate?.proveedor_nombre || "");
    setTemplateId(
      initialTemplate && !initialTemplate.id.startsWith("duplicate-") ? initialTemplate.id : "none",
    );
  }, [open, initialTemplate, activeCategories]);

  useEffect(() => {
    if (!categoryId && activeCategories[0]) setCategoryId(activeCategories[0].id);
  }, [activeCategories, categoryId]);

  async function submit(keepOpen: boolean) {
    const category = activeCategories.find((item) => item.id === categoryId);
    if (!description.trim()) {
      toast.error("Escribe el concepto del gasto.");
      return;
    }
    if (amount <= 0) {
      toast.error(`El monto debe ser mayor que ${formatRD(0)}.`);
      return;
    }
    if (!category) {
      toast.error("Selecciona una categoría activa.");
      return;
    }

    setSubmitting(true);
    try {
      const gastoId = uid("gas");
      const supplier = activeSuppliers.find((item) => item.id === supplierId);
      const supplierName = supplier?.nombre_comercial || manualSupplier.trim() || undefined;
      let fiscalData: Pick<Gasto, "ncf" | "tipo_ecf" | "ecf_status" | "ecf_track_id" | "ecf_qr"> =
        {};

      if (isElectronic && emitFiscal && tenant) {
        const order = {
          id: gastoId,
          tenant_id: tenant.id,
          numero: `EXP-${Date.now().toString().slice(-6)}`,
          cliente_nombre: description.trim(),
          total: amount,
          subtotal: amount,
          itbis: 0,
          descuento: 0,
          estado: "ENTREGADO",
          metodo_pago: paymentMethod === "Cheque" ? "EFECTIVO" : paymentMethod.toUpperCase(),
          tipo_ecf: "E43",
          saldo: 0,
          creado_en: `${date}T12:00:00.000Z`,
          items: [
            {
              descripcion: description.trim(),
              cantidad: 1,
              precio_unitario: amount,
              is_exento: true,
            },
          ],
        } as unknown as Orden;
        const result = await emitirECF(
          order,
          {
            id: supplier?.id || "expense",
            nombre: supplierName || description.trim(),
            cedula: supplier?.rnc_cedula || "",
          } as any,
          undefined,
          (tenantConfig || { ncf_secuencia: "E43", itbis_incluido: false }) as any,
          tenant,
          "E43",
        );
        fiscalData = {
          ncf: result.encf,
          tipo_ecf: "E43",
          ecf_status: result.legal_status || "ACCEPTED",
          ecf_track_id: result.document.track_id,
          ecf_qr: result.document.qr_content,
        };
      }

      const saveResult = await saveGasto({
        id: gastoId,
        tenant_id: tenantId,
        empleado_id: empleadoId,
        categoria: category.nombre,
        categoria_id: category.id,
        plantilla_id: templateId !== "none" ? templateId : undefined,
        suplidor_id: supplier?.id,
        descripcion: description.trim(),
        monto: amount,
        metodo_pago: paymentMethod,
        proveedor: supplierName,
        proveedor_rnc: supplier?.rnc_cedula,
        fecha: `${date}T12:00:00.000Z`,
        aprobado: true,
        origen: "OPERATIVO",
        estado: "REGISTRADO",
        ...fiscalData,
      });

      // Estos pasos complementarios no deben impedir que el gasto principal se
      // confirme si, por ejemplo, la caja o las plantillas aun no sincronizan.
      try {
        const caja = await getCajaAbierta(tenantId);
        if (caja) {
          await saveMovimiento({
            id: uid("mov"),
            tenant_id: tenantId,
            caja_id: caja.id,
            empleado_id: empleadoId,
            tipo: "EGRESO",
            concepto: `${category.nombre}: ${description.trim()}${fiscalData.ncf ? ` (${fiscalData.ncf})` : ""}`,
            monto: amount,
            metodo:
              paymentMethod === "Cheque"
                ? "EFECTIVO"
                : (paymentMethod.toUpperCase() as MetodoPago),
            referencia: gastoId,
            creado_en: `${date}T12:00:00.000Z`,
          });
        }
      } catch (cashError) {
        console.error("No se pudo vincular el gasto con caja:", cashError);
      }

      try {
        const selectedTemplate = activeTemplates.find((item) => item.id === templateId);
        if (selectedTemplate) {
          await saveGastoPlantilla({
            ...selectedTemplate,
            usos: (selectedTemplate.usos || 0) + 1,
            ultimo_uso_en: new Date().toISOString(),
            proxima_fecha: selectedTemplate.es_recurrente
              ? advanceRecurringDate(
                  selectedTemplate.proxima_fecha || date,
                  selectedTemplate.frecuencia,
                )
              : selectedTemplate.proxima_fecha,
          });
        }

        if (saveAsTemplate) {
          const now = new Date().toISOString();
          await saveGastoPlantilla({
            id: uid("gtpl"),
            tenant_id: tenantId,
            nombre: newTemplateName.trim() || description.trim(),
            descripcion: description.trim(),
            categoria_id: category.id,
            categoria_nombre: category.nombre,
            suplidor_id: supplier?.id,
            proveedor_nombre: supplierName,
            metodo_pago: paymentMethod,
            monto_predeterminado: amount,
            es_recurrente: false,
            activo: true,
            usos: 1,
            ultimo_uso_en: now,
            creado_en: now,
            actualizado_en: now,
          });
        }
      } catch (templateError) {
        console.error("No se pudo actualizar la plantilla del gasto:", templateError);
      }

      onDone();
      if (saveResult.queued) {
        const schemaPending = /column|schema cache|categoria_id|plantilla_id|suplidor_id|origen|estado/i.test(
          saveResult.error || "",
        );
        toast.warning("Gasto guardado localmente", {
          description: schemaPending
            ? "Supabase aun no tiene aplicada la migracion de Gastos. El registro queda pendiente y no se perdera."
            : "El registro queda pendiente y se sincronizara automaticamente cuando Supabase este disponible.",
          duration: 7000,
        });
      } else if (fiscalData.ncf) {
        toast.success(`Comprobante ${fiscalData.ncf} emitido y gasto registrado.`);
      } else {
        toast.success("Gasto registrado correctamente.");
      }
      if (keepOpen) resetForm(templateId !== "none");
      else onOpenChange(false);
    } catch (error: any) {
      console.error("Error al registrar gasto:", error);
      toast.error(error?.message || "No se pudo registrar el gasto.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[94vw] max-w-xl flex-col gap-0 overflow-hidden rounded-3xl border-none bg-background p-0 shadow-2xl text-foreground">
        {/* MODAL HEADER */}
        <div className="shrink-0 bg-slate-50/80 dark:bg-slate-900/60 p-3.5 sm:p-4 pb-3 relative border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center justify-between gap-3 pr-8">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/15 shadow-xs shrink-0">
                <Receipt className="h-4.5 w-4.5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-display font-bold text-foreground">
                  Registrar Gasto
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Completa el monto y detalles o aplica una plantilla rápida
                </DialogDescription>
              </div>
            </div>
            {isElectronic && (
              <Badge variant="outline" className="text-[10px] font-mono shrink-0 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-semibold px-2 py-0.5">
                E43 Opcional
              </Badge>
            )}
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 sm:px-5 py-3.5">
          {/* PLANTILLA RAPIDA */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                Plantilla rápida (Opcional)
              </Label>
              <button
                type="button"
                onClick={onManage}
                className="text-[11px] font-bold text-primary hover:underline cursor-pointer focus-visible:outline-none"
              >
                Administrar plantillas
              </button>
            </div>
            <div className="relative">
              <Zap className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
              <Select
                value={templateId}
                onValueChange={(value) => {
                  if (value === "none") resetForm(false);
                  else applyTemplate(activeTemplates.find((item) => item.id === value) || null);
                }}
              >
                <SelectTrigger className="h-10 pl-9.5 rounded-xl text-xs sm:text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <SelectValue placeholder="Sin plantilla — gasto libre" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg max-h-56">
                  <SelectItem value="none">Sin plantilla — gasto libre</SelectItem>
                  {activeTemplates.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      <div className="flex items-center gap-2">
                        <span>{item.nombre}</span>
                        {item.es_recurrente && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                            Recurrente
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* CONCEPTO & MONTO */}
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11.5rem]">
            <div className="space-y-1.5">
              <Label htmlFor="expense-description" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Concepto *
              </Label>
              <div className="relative">
                <Receipt className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                <Input
                  id="expense-description"
                  autoFocus
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Ej. Compra de detergente industrial"
                  className="h-10 pl-9.5 rounded-xl text-xs sm:text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs focus-visible:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expense-amount" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Monto *
              </Label>
              <div className="relative flex h-10 items-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                <span className="flex items-center pl-3 pr-2 text-xs font-black text-muted-foreground border-r border-slate-200 dark:border-slate-800 select-none">
                  {currencySymbol}
                </span>
                <input
                  id="expense-amount"
                  inputMode="decimal"
                  value={rawAmount}
                  onChange={(event) => setRawAmount(formatAmountInput(event.target.value))}
                  placeholder="0.00"
                  className="h-full min-w-0 flex-1 bg-transparent px-2.5 font-display text-sm sm:text-base font-bold tabular-nums outline-none text-foreground placeholder:text-muted-foreground/40"
                />
              </div>
            </div>
          </div>

          {/* FECHA & CATEGORIA */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Fecha *
              </Label>
              <DMYDatePicker
                value={date}
                onChange={setDate}
                className="h-10 w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-medium px-3 shadow-xs"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Categoría *
                </Label>
                <button
                  type="button"
                  onClick={onManage}
                  className="text-[11px] font-bold text-primary hover:underline cursor-pointer focus-visible:outline-none"
                >
                  Crear categoría
                </button>
              </div>
              <div className="relative">
                <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="h-10 pl-9.5 rounded-xl text-xs sm:text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg max-h-56">
                    {activeCategories.map((item) => {
                      const col = getCategoryColor(item.color);
                      return (
                        <SelectItem key={item.id} value={item.id}>
                          <div className="flex items-center gap-2">
                            <span className={cn("h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-black/10", col.bg)} />
                            <span className="truncate">{item.nombre}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* METODO DE PAGO & SUPLIDOR */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Método de pago
              </Label>
              <div className="relative">
                <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-10 pl-9.5 rounded-xl text-xs sm:text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg">
                    {[
                      { id: "Efectivo", icon: Coins },
                      { id: "Transferencia", icon: Landmark },
                      { id: "Tarjeta", icon: CreditCard },
                      { id: "Cheque", icon: FileText },
                    ].map(({ id, icon: ItemIcon }) => (
                      <SelectItem key={id} value={id}>
                        <div className="flex items-center gap-2">
                          <ItemIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{id}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Suplidor o beneficiario
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                <Select
                  value={supplierId}
                  onValueChange={(value) => {
                    setSupplierId(value);
                    if (value !== "manual") setManualSupplier("");
                  }}
                >
                  <SelectTrigger className="h-10 pl-9.5 rounded-xl text-xs sm:text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg max-h-56">
                    <SelectItem value="none">Sin suplidor</SelectItem>
                    <SelectItem value="manual">
                      <span className="font-semibold text-primary">Escribir otro beneficiario...</span>
                    </SelectItem>
                    {activeSuppliers.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{item.nombre_comercial}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {supplierId === "manual" && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
              <Label htmlFor="manual-supplier" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Nombre del beneficiario *
              </Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                <Input
                  id="manual-supplier"
                  value={manualSupplier}
                  onChange={(event) => setManualSupplier(event.target.value)}
                  placeholder="Ej. Técnico Juan Pérez"
                  className="h-10 pl-9.5 rounded-xl text-xs sm:text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs"
                />
              </div>
            </div>
          )}

          {/* OPCIONES AVANZADAS */}
          <div className={cn(
            "rounded-2xl border transition-all duration-200 overflow-hidden",
            advanced
              ? "border-primary/30 bg-slate-50/70 dark:bg-slate-900/60 shadow-xs"
              : "border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/50 dark:hover:bg-slate-900/60"
          )}>
            <button
              type="button"
              onClick={() => setAdvanced((value) => !value)}
              className="flex h-9.5 w-full items-center justify-between px-3 text-left cursor-pointer transition-colors focus-visible:outline-none"
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  "h-6 w-6 rounded-lg flex items-center justify-center transition-colors shrink-0",
                  advanced
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "bg-primary/10 text-primary border border-primary/15"
                )}>
                  <SlidersHorizontal className="h-3 w-3" />
                </div>
                <span className="text-xs font-bold text-foreground">Opciones avanzadas</span>
                {(emitFiscal || saveAsTemplate) && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-medium text-muted-foreground">
                  {advanced ? "Ocultar" : "Fiscal y plantilla"}
                </span>
                <div className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center transition-all duration-200",
                  advanced ? "bg-primary/15 text-primary rotate-180" : "bg-slate-200/70 dark:bg-slate-800 text-muted-foreground"
                )}>
                  <ChevronDown className="h-3 w-3" />
                </div>
              </div>
            </button>
            {advanced && (
              <div className="space-y-2 border-t border-slate-200/80 dark:border-slate-800/80 p-2.5 bg-background/50 animate-in fade-in duration-150">
                {isElectronic && (
                  <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/70 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-800/60">
                        <FileText className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground leading-tight">Emitir comprobante E43</p>
                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Gasto menor con validez fiscal DGII</p>
                      </div>
                    </div>
                    <Switch checked={emitFiscal} onCheckedChange={setEmitFiscal} className="scale-90" />
                  </div>
                )}
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/70 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/60 dark:border-amber-800/60">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground leading-tight">Guardar como plantilla</p>
                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Reutilizar estos datos en futuros registros</p>
                      </div>
                    </div>
                    <Switch checked={saveAsTemplate} onCheckedChange={setSaveAsTemplate} className="scale-90" />
                  </div>
                  {saveAsTemplate && (
                    <div className="relative pt-1 animate-in fade-in duration-150">
                      <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-500 pointer-events-none z-10" />
                      <Input
                        value={newTemplateName}
                        onChange={(event) => setNewTemplateName(event.target.value)}
                        placeholder="Nombre de la nueva plantilla"
                        className="h-8.5 pl-8.5 rounded-lg text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xs"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/70 dark:bg-slate-900/60 px-4 sm:px-5 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="h-9.5 rounded-xl px-3.5 text-xs sm:text-sm font-semibold border-slate-200 dark:border-slate-800 cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void submit(true)}
            disabled={submitting}
            className="h-9.5 rounded-xl px-3.5 text-xs sm:text-sm font-bold border-primary/20 text-primary hover:bg-primary/5 cursor-pointer whitespace-nowrap"
          >
            Guardar y seguir
          </Button>
          <Button
            type="button"
            onClick={() => void submit(false)}
            disabled={submitting}
            className="h-9.5 rounded-xl bg-primary px-4 text-xs sm:text-sm font-bold text-primary-foreground shadow-xs hover:bg-primary/90 active:translate-y-px cursor-pointer whitespace-nowrap"
          >
            <Check className="mr-1.5 h-4 w-4" /> {submitting ? "Guardando…" : "Guardar gasto"}
          </Button>
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
  categories,
  suppliers,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tenant?: Tenant;
  tenantConfig?: TenantConfig;
  ecfConfig?: any;
  tenantId: string;
  empleadoId: string;
  categories: GastoCategoria[];
  suppliers: Suplidor[];
  onDone: () => void;
}) {
  const isElectronic = !!ecfConfig?.is_active || !!ecfConfig?.ef2_environment || !!tenant?.rnc;

  const currentCountry = useMemo(() => {
    const code = tenant?.pais_codigo || tenantConfig?.pais_codigo || "DO";
    return getCountry(code);
  }, [tenant, tenantConfig]);

  const [rawMonto, setRawMonto] = useState("");
  const [monto, setMonto] = useState(0);
  const [proveedorNombre, setProveedorNombre] = useState("");
  const [proveedorRnc, setProveedorRnc] = useState("");
  const [supplierId, setSupplierId] = useState("manual");
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
      setSupplierId("manual");
      setConcepto("");
      setCategoria(
        categories.find((item) => item.activo && item.nombre === "Mantenimiento")?.nombre ||
          categories.find((item) => item.activo)?.nombre ||
          "Mantenimiento",
      );
      setMetodoPago("Efectivo");
    }
  }, [open, categories]);

  // Cálculos fiscales DGII para E41 (Compras con retención 100% ITBIS + 10% ISR)
  const itbisAmount = Number((monto * 0.18).toFixed(2));
  const itbisRetenido = itbisAmount; // 100% Retención ITBIS
  const isrRetenido = Number((monto * 0.1).toFixed(2)); // 10% Retención ISR
  const totalConItbis = monto + itbisAmount;
  const totalRetenciones = itbisRetenido + isrRetenido;
  const netoAPagar = Number((totalConItbis - totalRetenciones).toFixed(2));

  async function submit() {
    if (!proveedorNombre.trim()) {
      toast.error("Ingresa el nombre del proveedor o técnico");
      return;
    }
    if (!proveedorRnc.trim()) {
      toast.error(
        currentCountry.code === "DO"
          ? "Ingresa el RNC o Cédula del proveedor informal"
          : `Ingresa el ${currentCountry.doc.label} del proveedor`
      );
      return;
    }
    if (!concepto.trim()) {
      toast.error("Ingresa el concepto de la compra o servicio");
      return;
    }
    if (monto <= 0) {
      toast.error(`Ingresa un monto válido mayor a ${formatRD(0)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const compraId = uid("gas");
      let emittedNcf: string | undefined = undefined;
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
            metodo_pago:
              metodoPago === "Cheque" ? "EFECTIVO" : (metodoPago.toUpperCase() as MetodoPago),
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
            "E41",
          );

          emittedNcf = res.encf;
          emittedStatus = res.legal_status || "ACCEPTED";
          emittedTrackId = res.document.track_id;
          emittedQr = res.document.qr_content;
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
        categoria_id: categories.find((item) => item.nombre === categoria)?.id,
        suplidor_id: supplierId !== "manual" ? supplierId : undefined,
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
        origen: "FISCAL_E41",
        estado: "REGISTRADO",
      });

      // Descuento en Caja Abierta
      try {
        const caja = await getCajaAbierta(tenantId);
        if (caja) {
          const metodo =
            metodoPago === "Cheque" ? "EFECTIVO" : (metodoPago.toUpperCase() as MetodoPago);
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
        toast.success(`Compra registrada y comprobante ${emittedNcf} (E41) emitido ante la DGII.`);
      } else {
        toast.success("Compra registrada correctamente.");
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
      <DialogContent className="flex max-h-[92vh] w-[94vw] max-w-xl flex-col gap-0 overflow-hidden rounded-3xl border-none bg-background p-0 shadow-2xl text-foreground">
        {/* MODAL HEADER */}
        <div className="shrink-0 bg-slate-50/80 dark:bg-slate-900/60 p-3.5 sm:p-4 pb-3 relative border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center justify-between gap-3 pr-8">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20 shadow-xs shrink-0">
                <ShoppingBag className="h-4.5 w-4.5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-display font-bold text-foreground">
                  Registrar Compra Fiscal (E41)
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Comprobante para proveedores o técnicos informales con retenciones
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono shrink-0 bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800 font-semibold px-2 py-0.5">
              DGII E41
            </Badge>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 sm:px-5 py-3.5">
          {suppliers.some((item) => item.activo) && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                Usar suplidor guardado (Opcional)
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                <Select
                  value={supplierId}
                  onValueChange={(value) => {
                    setSupplierId(value);
                    if (value === "manual") {
                      setProveedorNombre("");
                      setProveedorRnc("");
                      return;
                    }
                    const supplier = suppliers.find((item) => item.id === value);
                    setProveedorNombre(supplier?.nombre_comercial || "");
                    setProveedorRnc(supplier?.rnc_cedula || "");
                  }}
                >
                  <SelectTrigger className="h-10 pl-9.5 rounded-xl text-xs sm:text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg max-h-56">
                    <SelectItem value="manual">Escribir proveedor manualmente</SelectItem>
                    {suppliers
                      .filter((item) => item.activo)
                      .map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{item.nombre_comercial}</span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* FILA PROVEEDOR & RNC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Nombre Proveedor / Técnico *
              </Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                <Input
                  autoFocus
                  placeholder="Ej. Juan Pérez (Electricista)"
                  value={proveedorNombre}
                  onChange={(e) => setProveedorNombre(e.target.value)}
                  className="h-10 pl-9.5 rounded-xl text-xs sm:text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs focus-visible:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                {currentCountry.code === "DO" ? "RNC o Cédula *" : `${currentCountry.doc.label} (${currentCountry.code}) *`}
              </Label>
              <div className="relative">
                <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                <Input
                  placeholder={currentCountry.code === "DO" ? "Ej. 00112345678" : currentCountry.doc.placeholder}
                  value={proveedorRnc}
                  onChange={(e) => setProveedorRnc(e.target.value)}
                  className="h-10 pl-9.5 rounded-xl text-xs sm:text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs focus-visible:ring-primary/20"
                />
              </div>
            </div>
          </div>

          {/* CONCEPTO */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">
              Concepto del Bien o Servicio *
            </Label>
            <div className="relative">
              <Receipt className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
              <Input
                placeholder="Ej. Reparación eléctrica local, plomería, repuestos..."
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                className="h-10 pl-9.5 rounded-xl text-xs sm:text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs focus-visible:ring-primary/20"
              />
            </div>
          </div>

          {/* MONTO BRUTO & CATEGORIA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Monto Bruto ({tenant?.moneda_simbolo || "RD$"}) *
              </Label>
              <div className="relative flex h-10 items-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                <span className="flex items-center pl-3 pr-2 text-xs font-black text-muted-foreground border-r border-slate-200 dark:border-slate-800 select-none">
                  {tenant?.moneda_simbolo || "RD$"}
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
                  className="h-full min-w-0 flex-1 bg-transparent px-2.5 font-display text-sm sm:text-base font-bold tabular-nums outline-none text-foreground placeholder:text-muted-foreground/40"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Categoría *
              </Label>
              <div className="relative">
                <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger className="h-10 pl-9.5 rounded-xl text-xs sm:text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg max-h-56">
                    {(categories.length
                      ? categories.filter((item) => item.activo).map((item) => item.nombre)
                      : CATEGORIAS_GASTOS
                    ).map((c) => {
                      const catObj = categories.find((item) => item.nombre === c);
                      const col = getCategoryColor(catObj?.color);
                      return (
                        <SelectItem key={c} value={c}>
                          <div className="flex items-center gap-2">
                            <span className={cn("h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-black/10", col.bg)} />
                            <span className="truncate">{c}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* CANAL DE PAGO */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">
              Canal de Pago
            </Label>
            <div className="relative">
              <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
              <Select value={metodoPago} onValueChange={setMetodoPago}>
                <SelectTrigger className="h-10 pl-9.5 rounded-xl text-xs sm:text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg">
                  {[
                    { id: "Efectivo", icon: Coins },
                    { id: "Transferencia", icon: Landmark },
                    { id: "Tarjeta", icon: CreditCard },
                    { id: "Cheque", icon: FileText },
                  ].map(({ id, icon: ItemIcon }) => (
                    <SelectItem key={id} value={id}>
                      <div className="flex items-center gap-2">
                        <ItemIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{id}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* DESGLOSE DE RETENCIONES FISCALES DGII */}
          {monto > 0 && (
            <div className="p-3.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/25 border border-purple-200/70 dark:border-purple-900/60 space-y-2 text-xs animate-in fade-in-50 duration-150">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Monto Bruto del Servicio:</span>
                <span className="font-semibold text-foreground font-mono">{formatRD(monto)}</span>
              </div>
              <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
                <span>Retención 100% ITBIS (18%):</span>
                <span className="font-bold font-mono">- {formatRD(itbisRetenido)}</span>
              </div>
              <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
                <span>Retención ISR (10%):</span>
                <span className="font-bold font-mono">- {formatRD(isrRetenido)}</span>
              </div>
              <div className="pt-2 border-t border-purple-200/60 dark:border-purple-800/60 flex items-center justify-between">
                <span className="font-bold text-foreground text-xs sm:text-sm">
                  Neto Total a Pagar al Proveedor:
                </span>
                <span className="font-display font-black text-base sm:text-lg text-purple-700 dark:text-purple-300 tabular-nums">
                  {formatRD(netoAPagar)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/70 dark:bg-slate-900/60 px-4 sm:px-5 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="h-9.5 rounded-xl px-3.5 text-xs sm:text-sm font-semibold border-slate-200 dark:border-slate-800 cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={isSubmitting}
            className="h-9.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-4 text-xs sm:text-sm font-bold shadow-xs active:translate-y-px cursor-pointer whitespace-nowrap"
          >
            <Check className="mr-1.5 h-4 w-4 text-secondary" />
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
  onClose,
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

  const totalCount = isCaja ? cajaChicaGastos.length : manualGastos.length;

  return createPortal(
    <div className="fixed inset-0 bg-white z-[99999] overflow-y-auto pointer-events-auto atomic-print-target text-slate-800">
      <div className="max-w-4xl mx-auto p-8 print:p-12 print:max-w-4xl print:mx-auto">
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
          <div className="flex justify-between items-start mb-10 pb-6 border-b border-slate-200">
            <div>
              {tenant.logo_url ? (
                <img
                  src={tenant.logo_url}
                  alt={tenant.nombre}
                  className="h-16 object-contain mb-4"
                />
              ) : (
                <h1 className="text-3xl font-display font-black text-primary uppercase tracking-tighter mb-1">
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
                {title}
              </h2>
              <div className="text-sm font-bold text-rose-600 uppercase tracking-wider mb-2">
                Total: {formatRD(totalMonto)} ({totalCount} registros)
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
                {!isCaja &&
                  manualGastos.map((g, i) => (
                    <tr
                      key={i}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                    >
                      <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatDateRD(g.fecha)}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-800 px-2 py-0.5 text-[9px] font-bold">
                          {g.categoria}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-850">{g.descripcion}</td>
                      <td className="py-2.5 px-4 text-slate-500">{g.proveedor || "—"}</td>
                      <td className="py-2.5 px-4 text-slate-600">{g.metodo_pago}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-rose-600">
                        {formatRD(g.monto)}
                      </td>
                    </tr>
                  ))}
                {isCaja &&
                  cajaChicaGastos.map((g, i) => (
                    <tr
                      key={i}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                    >
                      <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatDateRD(g.fecha)}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="inline-flex items-center rounded-full bg-blue-50 text-primary px-2 py-0.5 text-[9px] font-bold">
                          {g.categoria}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-850">{g.descripcion}</td>
                      <td className="py-2.5 px-4 text-slate-600">{g.metodo_pago}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-rose-600">
                        {formatRD(g.monto)}
                      </td>
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
            <div className="text-right text-[10px] font-bold text-slate-500">Klynn Cloud POS</div>
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

// ==========================================
// MODAL 3: COMPARAR PERÍODOS DE GASTOS (MULTI-PERÍODO LADO A LADO)
// ==========================================
interface PeriodConfig {
  id: string; // "A", "B", "C", "D"
  label: string;
  type: "month" | "year";
  month: number;
  year: number;
}

const PERIOD_THEMES: Record<
  string,
  {
    badgeBg: string;
    badgeText: string;
    cardBg: string;
    cardBorder: string;
    dotBg: string;
    pillClass: string;
    barColor: string;
  }
> = {
  A: {
    badgeBg: "bg-primary text-primary-foreground",
    badgeText: "text-primary",
    cardBg: "bg-blue-50/60 dark:bg-blue-950/30",
    cardBorder: "border-blue-200/80 dark:border-blue-800/60",
    dotBg: "bg-primary",
    pillClass: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200",
    barColor: "bg-primary",
  },
  B: {
    badgeBg: "bg-indigo-600 text-white",
    badgeText: "text-indigo-700 dark:text-indigo-300",
    cardBg: "bg-indigo-50/60 dark:bg-indigo-950/30",
    cardBorder: "border-indigo-200/80 dark:border-indigo-800/60",
    dotBg: "bg-indigo-600 dark:bg-indigo-400",
    pillClass:
      "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-200",
    barColor: "bg-indigo-500 dark:bg-indigo-400",
  },
  C: {
    badgeBg: "bg-emerald-600 text-white",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    cardBg: "bg-emerald-50/60 dark:bg-emerald-950/30",
    cardBorder: "border-emerald-200/80 dark:border-emerald-800/60",
    dotBg: "bg-emerald-600 dark:bg-emerald-400",
    pillClass:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200",
    barColor: "bg-emerald-500 dark:bg-emerald-400",
  },
  D: {
    badgeBg: "bg-amber-600 text-white",
    badgeText: "text-amber-700 dark:text-amber-300",
    cardBg: "bg-amber-50/60 dark:bg-amber-950/30",
    cardBorder: "border-amber-200/80 dark:border-amber-800/60",
    dotBg: "bg-amber-600 dark:bg-amber-400",
    pillClass: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200",
    barColor: "bg-amber-500 dark:bg-amber-400",
  },
};

function CompararPeriodosModal({
  open,
  onOpenChange,
  gastos,
  tenantNombre,
  tenant,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gastos: Gasto[];
  tenantNombre?: string;
  tenant?: Tenant;
}) {
  const currencySymbol = getTenantCurrencySymbol(tenant);
  const formatRD = (val: number) => formatMoney(val, tenant);
  const now = useMemo(() => new Date(), []);

  // Lista de períodos dinámicos a comparar (A, B, y opcionalmente C y D)
  const [periods, setPeriods] = useState<PeriodConfig[]>([
    {
      id: "A",
      label: "Período Base (A)",
      type: "month",
      month: now.getMonth(),
      year: now.getFullYear(),
    },
    {
      id: "B",
      label: "Período Comparativo (B)",
      type: "month",
      month: now.getMonth() === 0 ? 11 : now.getMonth() - 1,
      year: now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
    },
  ]);

  // Filtros internos
  const [scopeFilter, setScopeFilter] = useState<"all" | "manual" | "caja_chica">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"diff_desc" | "diff_asc" | "amount_a" | "amount_b" | "name">(
    "diff_desc",
  );

  // Actualizar un campo de un período
  const handleUpdatePeriod = (id: string, field: keyof PeriodConfig, value: any) => {
    setPeriods((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  // Añadir un nuevo período comparativo (hasta 4)
  const handleAddPeriod = () => {
    if (periods.length >= 4) {
      toast.error("Puedes comparar hasta 4 períodos al mismo tiempo.");
      return;
    }
    const nextLetters = ["C", "D"];
    const nextIndex = periods.length - 2;
    const nextId = nextLetters[nextIndex] || `P${periods.length + 1}`;
    const offsetMonths = periods.length;
    const refDate = new Date(now.getFullYear(), now.getMonth() - offsetMonths, 1);

    setPeriods((prev) => [
      ...prev,
      {
        id: nextId,
        label: `Período Comparativo (${nextId})`,
        type: "month",
        month: refDate.getMonth(),
        year: refDate.getFullYear(),
      },
    ]);
    toast.success(`Se añadió el Período ${nextId} a la comparativa`);
  };

  // Eliminar un período comparativo adicional
  const handleRemovePeriod = (idToRemove: string) => {
    if (periods.length <= 2) {
      toast.error("Debes mantener al menos 2 períodos para comparar.");
      return;
    }
    setPeriods((prev) => prev.filter((p) => p.id !== idToRemove));
    toast.info(`Período removido`);
  };

  // Presets Rápidos
  const applyPresetMesActualVsAnterior = () => {
    setPeriods([
      {
        id: "A",
        label: "Período Base (A)",
        type: "month",
        month: now.getMonth(),
        year: now.getFullYear(),
      },
      {
        id: "B",
        label: "Período Comparativo (B)",
        type: "month",
        month: now.getMonth() === 0 ? 11 : now.getMonth() - 1,
        year: now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
      },
    ]);
  };

  const applyPresetUltimos3Meses = () => {
    const d1 = new Date(now.getFullYear(), now.getMonth(), 1);
    const d2 = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const d3 = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    setPeriods([
      {
        id: "A",
        label: "Período Base (A)",
        type: "month",
        month: d1.getMonth(),
        year: d1.getFullYear(),
      },
      {
        id: "B",
        label: "Período Comparativo (B)",
        type: "month",
        month: d2.getMonth(),
        year: d2.getFullYear(),
      },
      {
        id: "C",
        label: "Período Comparativo (C)",
        type: "month",
        month: d3.getMonth(),
        year: d3.getFullYear(),
      },
    ]);
    toast.success("Se cargaron los últimos 3 meses consecutivos");
  };

  const applyPresetMismoMesAnioAnterior = () => {
    setPeriods([
      {
        id: "A",
        label: "Período Base (A)",
        type: "month",
        month: now.getMonth(),
        year: now.getFullYear(),
      },
      {
        id: "B",
        label: "Período Comparativo (B)",
        type: "month",
        month: now.getMonth(),
        year: now.getFullYear() - 1,
      },
    ]);
  };

  const applyPresetEsteAnioVsAnterior = () => {
    setPeriods([
      {
        id: "A",
        label: "Período Base (A)",
        type: "year",
        month: now.getMonth(),
        year: now.getFullYear(),
      },
      {
        id: "B",
        label: "Período Comparativo (B)",
        type: "year",
        month: now.getMonth(),
        year: now.getFullYear() - 1,
      },
    ]);
  };

  // Filtrado según ámbito (Todos, Operativos, Caja Chica)
  const scopedGastos = useMemo(() => {
    if (scopeFilter === "manual") return gastos.filter((g) => !g.is_caja_chica);
    if (scopeFilter === "caja_chica") return gastos.filter((g) => g.is_caja_chica);
    return gastos;
  }, [gastos, scopeFilter]);

  // Cálculos por cada período activo
  const periodResults = useMemo(() => {
    return periods.map((p) => {
      const prefix =
        p.type === "month" ? `${p.year}-${String(p.month + 1).padStart(2, "0")}` : `${p.year}`;
      const list = scopedGastos.filter((g) => (g.fecha || "").startsWith(prefix));
      const total = list.reduce((s, g) => s + (g.monto || 0), 0);
      const displayLabel =
        p.type === "month" ? `${MESES_NOMBRES[p.month]} ${p.year}` : `Año ${p.year}`;

      const catMap: Record<string, { total: number; count: number }> = {};
      list.forEach((g) => {
        const cat = g.categoria || "Sin categoría";
        if (!catMap[cat]) catMap[cat] = { total: 0, count: 0 };
        catMap[cat].total += g.monto || 0;
        catMap[cat].count += 1;
      });

      return {
        ...p,
        prefix,
        displayLabel,
        list,
        total,
        count: list.length,
        catMap,
      };
    });
  }, [periods, scopedGastos]);

  // Totales de referencia de A y B
  const periodA = periodResults[0] || null;
  const periodB = periodResults[1] || null;
  const totalA = periodA?.total || 0;
  const totalB = periodB?.total || 0;
  const diffTotalAB = totalA - totalB;
  const pctTotalAB = totalB === 0 ? (totalA > 0 ? 100 : 0) : ((totalA - totalB) / totalB) * 100;

  // Desglose consolidado por categoría
  const breakdown = useMemo(() => {
    const allCategories = Array.from(new Set(periodResults.flatMap((p) => Object.keys(p.catMap))));

    const items = allCategories.map((cat) => {
      const amounts: Record<string, number> = {};
      const counts: Record<string, number> = {};
      const shares: Record<string, number> = {};

      periodResults.forEach((p) => {
        const d = p.catMap[cat] || { total: 0, count: 0 };
        amounts[p.id] = d.total;
        counts[p.id] = d.count;
        shares[p.id] = p.total > 0 ? (d.total / p.total) * 100 : 0;
      });

      const amountA = amounts["A"] || 0;
      const amountB = amounts["B"] || 0;
      const diffAB = amountA - amountB;
      const pctAB = amountB === 0 ? (amountA > 0 ? 100 : 0) : ((amountA - amountB) / amountB) * 100;

      return {
        categoria: cat,
        amounts,
        counts,
        shares,
        amountA,
        amountB,
        diffAB,
        pctAB,
      };
    });

    // Búsqueda por texto
    let filtered = items;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((it) => it.categoria.toLowerCase().includes(q));
    }

    // Ordenación
    filtered.sort((a, b) => {
      if (sortBy === "diff_desc") return Math.abs(b.diffAB) - Math.abs(a.diffAB);
      if (sortBy === "diff_asc") return a.diffAB - b.diffAB;
      if (sortBy === "amount_a") return b.amountA - a.amountA;
      if (sortBy === "amount_b") return b.amountB - a.amountB;
      if (sortBy === "name") return a.categoria.localeCompare(b.categoria);
      return 0;
    });

    return filtered;
  }, [periodResults, searchQuery, sortBy]);

  // Categorías de mayor impacto
  const insights = useMemo(() => {
    if (breakdown.length === 0) return null;
    const sortedByDiffDesc = [...breakdown].sort((a, b) => b.diffAB - a.diffAB);
    const topIncrease = sortedByDiffDesc[0]?.diffAB > 0 ? sortedByDiffDesc[0] : null;

    const sortedByDiffAsc = [...breakdown].sort((a, b) => a.diffAB - b.diffAB);
    const topSavings = sortedByDiffAsc[0]?.diffAB < 0 ? sortedByDiffAsc[0] : null;

    return { topIncrease, topSavings };
  }, [breakdown]);

  // Exportar a Excel (.xlsx) con diseño, formato y estilos ejecutivos
  const handleExportExcel = () => {
    try {
      exportGastosComparativaToExcel({
        tenantName: tenantNombre || "Klynn",
        scopeFilter,
        periods,
        periodResults,
        breakdown,
        diffTotalAB,
        pctTotalAB,
        insights,
        currencySymbol,
        currencyCode: tenant?.moneda_codigo || "DOP",
      });
      toast.success("Comparativa exportada a Excel (.xlsx) con diseño exitosamente");
    } catch (err) {
      console.error("Error al exportar comparativa a Excel:", err);
      toast.error("Error al generar el archivo Excel");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl sm:max-w-6xl w-[95vw] max-h-[92vh] flex flex-col p-0 rounded-2xl overflow-hidden bg-background shadow-2xl border border-border">
        {/* ENCABEZADO */}
        <DialogHeader className="px-5 sm:px-6 pt-5 pb-4 border-b border-border/80 bg-muted/30 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-xs">
                <Scale className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-display font-black text-foreground tracking-tight">
                  Comparativa de Períodos de Gastos
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                  Compara dos o más meses o años lado a lado para evaluar variaciones, incrementos y
                  ahorros.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* PRESETS RÁPIDOS CON COLORES DIFERENCIADOS */}
          <div className="flex items-center gap-2 pt-3 overflow-x-auto custom-scrollbar">
            <span className="text-[11px] font-black text-muted-foreground shrink-0 uppercase tracking-wider">
              Accesos Rápidos:
            </span>
            <button
              type="button"
              onClick={applyPresetMesActualVsAnterior}
              className="px-3 py-1 rounded-xl text-xs font-bold bg-blue-100/80 hover:bg-blue-200/90 text-blue-900 border border-blue-300/80 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800 shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              Mes Actual vs Mes Anterior
            </button>
            <button
              type="button"
              onClick={applyPresetUltimos3Meses}
              className="px-3 py-1 rounded-xl text-xs font-bold bg-teal-100/80 hover:bg-teal-200/90 text-teal-900 border border-teal-300/80 dark:bg-teal-950/60 dark:text-teal-200 dark:border-teal-800 shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              Últimos 3 Meses
            </button>
            <button
              type="button"
              onClick={applyPresetMismoMesAnioAnterior}
              className="px-3 py-1 rounded-xl text-xs font-bold bg-purple-100/80 hover:bg-purple-200/90 text-purple-900 border border-purple-300/80 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800 shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              Mismo Mes Año Anterior (YoY)
            </button>
            <button
              type="button"
              onClick={applyPresetEsteAnioVsAnterior}
              className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-100/80 hover:bg-emerald-200/90 text-emerald-900 border border-emerald-300/80 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800 shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              Este Año vs Año Anterior
            </button>
          </div>
        </DialogHeader>

        {/* CONTENIDO DESPLAZABLE */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          {/* CONFIGURACIÓN DE PERÍODOS (3 COLUMNAS HORIZONTALES SIN ENVOLVIMIENTO) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-surface border border-border shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-primary" />
                Períodos Seleccionados para la Comparativa ({periods.length}/4)
              </span>

              {/* Botón para añadir otro período */}
              {periods.length < 4 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddPeriod}
                  className="h-8 px-3 rounded-xl font-black text-xs border-dashed border-primary/60 hover:bg-primary/10 text-primary cursor-pointer shadow-2xs transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 mr-1 text-secondary" />
                  <span>Añadir Otro Mes ({periods.length === 2 ? "Período C" : "Período D"})</span>
                </Button>
              )}
            </div>

            {/* Tarjetas de cada período con 3 columnas estrictas */}
            <div className="space-y-2.5">
              {periods.map((period, idx) => {
                const theme = PERIOD_THEMES[period.id] || PERIOD_THEMES.A;
                const result = periodResults.find((r) => r.id === period.id);

                return (
                  <div
                    key={period.id}
                    className={cn(
                      "p-3 rounded-xl border transition-[background-color,border-color,box-shadow]",
                      theme.cardBg,
                      theme.cardBorder,
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "w-5 h-5 rounded-md text-white flex items-center justify-center text-[11px] font-black",
                            theme.badgeBg,
                          )}
                        >
                          {period.id}
                        </span>
                        <span
                          className={cn(
                            "text-xs font-black uppercase tracking-wider",
                            theme.badgeText,
                          )}
                        >
                          {period.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] font-bold", theme.pillClass)}
                        >
                          {result?.displayLabel || ""}
                        </Badge>
                        {periods.length > 2 && period.id !== "A" && (
                          <button
                            type="button"
                            onClick={() => handleRemovePeriod(period.id)}
                            className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-500 transition-colors cursor-pointer"
                            title="Eliminar este período"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 3 COLUMNAS ESTRICTAS EN UNA SOLA FILA: TIPO, MES Y AÑO */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {/* Columna 1: Tipo */}
                      <div>
                        <Select
                          value={period.type}
                          onValueChange={(v: "month" | "year") =>
                            handleUpdatePeriod(period.id, "type", v)
                          }
                        >
                          <SelectTrigger className="h-9 text-xs font-bold bg-white dark:bg-slate-950 border-border">
                            <SelectValue placeholder="Tipo de Período" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="month">Mes Completo</SelectItem>
                            <SelectItem value="year">Año Completo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Columna 2: Mes */}
                      <div>
                        <Select
                          value={String(period.month)}
                          onValueChange={(v) => handleUpdatePeriod(period.id, "month", Number(v))}
                          disabled={period.type === "year"}
                        >
                          <SelectTrigger className="h-9 text-xs font-bold bg-white dark:bg-slate-950 border-border disabled:opacity-50">
                            <SelectValue placeholder="Mes" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {MESES_NOMBRES.map((m, mIdx) => (
                              <SelectItem key={mIdx} value={String(mIdx)}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Columna 3: Año */}
                      <div>
                        <Select
                          value={String(period.year)}
                          onValueChange={(v) => handleUpdatePeriod(period.id, "year", Number(v))}
                        >
                          <SelectTrigger className="h-9 text-xs font-bold bg-white dark:bg-slate-950 border-border">
                            <SelectValue placeholder="Año" />
                          </SelectTrigger>
                          <SelectContent>
                            {ANIOS_DISPONIBLES.map((y) => (
                              <SelectItem key={y} value={String(y)}>
                                {y}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TARJETAS DE IMPACTO Y RESUMEN DE CADA PERÍODO */}
          <div
            className={cn(
              "grid gap-3",
              periods.length === 2
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                : periods.length === 3
                  ? "grid-cols-1 sm:grid-cols-3"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
            )}
          >
            {periodResults.map((pr) => {
              const theme = PERIOD_THEMES[pr.id] || PERIOD_THEMES.A;
              return (
                <Card
                  key={pr.id}
                  className={cn(
                    "p-3.5 rounded-2xl border shadow-2xs",
                    theme.cardBg,
                    theme.cardBorder,
                  )}
                >
                  <div className="text-[11px] font-black uppercase tracking-wider flex items-center justify-between">
                    <span className={theme.badgeText}>
                      Total {pr.id} ({pr.displayLabel})
                    </span>
                    <span className={cn("w-2 h-2 rounded-full", theme.dotBg)} />
                  </div>
                  <div
                    className="my-1 text-xl font-display font-black text-foreground truncate"
                    title={formatRD(pr.total)}
                  >
                    {formatRD(pr.total)}
                  </div>
                  <div className="text-xs text-muted-foreground font-semibold truncate">
                    {pr.count} egresos registrados
                  </div>
                </Card>
              );
            })}

            {/* Variación Neta (A vs B) cuando son 2 períodos */}
            {periods.length === 2 && (
              <>
                <Card
                  className={cn(
                    "p-3.5 rounded-2xl border shadow-2xs",
                    diffTotalAB < 0
                      ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
                      : diffTotalAB > 0
                        ? "bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60"
                        : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800",
                  )}
                >
                  <div className="text-[11px] font-black uppercase tracking-wider flex items-center justify-between">
                    <span
                      className={
                        diffTotalAB < 0
                          ? "text-emerald-800 dark:text-emerald-300"
                          : diffTotalAB > 0
                            ? "text-rose-800 dark:text-rose-300"
                            : "text-muted-foreground"
                      }
                    >
                      Variación Neta (A vs B)
                    </span>
                    {diffTotalAB < 0 && (
                      <TrendingDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                    {diffTotalAB > 0 && (
                      <TrendingUp className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    )}
                    {diffTotalAB === 0 && <Minus className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div
                    className={cn(
                      "my-1 text-xl font-display font-black truncate",
                      diffTotalAB < 0
                        ? "text-emerald-700 dark:text-emerald-300"
                        : diffTotalAB > 0
                          ? "text-rose-700 dark:text-rose-300"
                          : "text-foreground",
                    )}
                  >
                    {diffTotalAB > 0 ? `+${formatRD(diffTotalAB)}` : formatRD(diffTotalAB)}
                  </div>
                  <div className="text-xs font-bold truncate">
                    {diffTotalAB < 0 ? (
                      <span className="text-emerald-700 dark:text-emerald-400">
                        Ahorro de {Math.abs(pctTotalAB).toFixed(1)}% vs B
                      </span>
                    ) : diffTotalAB > 0 ? (
                      <span className="text-rose-700 dark:text-rose-400">
                        Incremento de +{pctTotalAB.toFixed(1)}% vs B
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Sin variación (0%)</span>
                    )}
                  </div>
                </Card>

                {/* Categoría con Mayor Cambio */}
                <Card className="p-3.5 rounded-2xl bg-surface border border-border shadow-2xs">
                  <div className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Mayor Impacto</span>
                    <Sparkles className="h-4 w-4 text-amber-500" />
                  </div>
                  {insights?.topIncrease ? (
                    <div>
                      <div
                        className="my-1 text-base font-display font-black text-rose-600 dark:text-rose-400 truncate capitalize"
                        title={insights.topIncrease.categoria}
                      >
                        ▲ {insights.topIncrease.categoria}
                      </div>
                      <div className="text-xs font-bold text-muted-foreground truncate">
                        +{formatRD(insights.topIncrease.diffAB)} (+
                        {insights.topIncrease.pctAB.toFixed(0)}%)
                      </div>
                    </div>
                  ) : insights?.topSavings ? (
                    <div>
                      <div
                        className="my-1 text-base font-display font-black text-emerald-600 dark:text-emerald-400 truncate capitalize"
                        title={insights.topSavings.categoria}
                      >
                        ▼ {insights.topSavings.categoria}
                      </div>
                      <div className="text-xs font-bold text-muted-foreground truncate">
                        {formatRD(insights.topSavings.diffAB)} (
                        {insights.topSavings.pctAB.toFixed(0)}%)
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="my-1 text-base font-display font-bold text-muted-foreground truncate">
                        Sin cambios
                      </div>
                      <div className="text-xs text-muted-foreground">Mismos valores</div>
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>

          {/* FILTROS Y CONTROLES DE LA TABLA (CON FONDOS DIFERENCIADOS EN PESTAÑAS) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-1.5 text-xs font-bold flex-wrap">
              <button
                type="button"
                onClick={() => setScopeFilter("all")}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl border font-bold transition-[background-color,color,border-color,box-shadow] cursor-pointer shadow-2xs",
                  scopeFilter === "all"
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
                )}
              >
                Todos ({gastos.length})
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter("manual")}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl border font-bold transition-[background-color,color,border-color,box-shadow] cursor-pointer shadow-2xs",
                  scopeFilter === "manual"
                    ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                    : "bg-rose-50 hover:bg-rose-100/90 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60",
                )}
              >
                Operativos
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter("caja_chica")}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl border font-bold transition-[background-color,color,border-color,box-shadow] cursor-pointer shadow-2xs",
                  scopeFilter === "caja_chica"
                    ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                    : "bg-amber-50 hover:bg-amber-100/90 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60",
                )}
              >
                Caja Chica
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar categoría..."
                  className="pl-8 h-9 text-xs rounded-xl bg-white dark:bg-slate-950 border-border"
                />
              </div>

              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="h-9 w-36 text-xs font-bold rounded-xl bg-white dark:bg-slate-950">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="diff_desc">Mayor Diferencia</SelectItem>
                  <SelectItem value="amount_a">Mayor en A</SelectItem>
                  <SelectItem value="amount_b">Mayor en B</SelectItem>
                  <SelectItem value="name">Alfabético</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* TABLA COMPARATIVA MULTI-PERÍODO */}
          <div className="rounded-2xl border border-border/80 overflow-hidden bg-surface shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-border bg-muted/40 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Categoría</th>

                    {/* Encabezado dinámico por cada período */}
                    {periodResults.map((p) => {
                      const theme = PERIOD_THEMES[p.id] || PERIOD_THEMES.A;
                      return (
                        <th key={p.id} className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className={cn("w-2 h-2 rounded-full", theme.dotBg)} />
                            <span>
                              {p.id}: {p.displayLabel}
                            </span>
                          </div>
                        </th>
                      );
                    })}

                    {periods.length === 2 && (
                      <>
                        <th className="px-4 py-3 text-right">Diferencia (A - B)</th>
                        <th className="px-4 py-3 text-center">Variación</th>
                      </>
                    )}

                    <th className="px-4 py-3 text-center w-28 sm:w-36">Proporción Visual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {breakdown.length === 0 ? (
                    <tr>
                      <td
                        colSpan={periods.length + 3}
                        className="px-4 py-12 text-center text-muted-foreground italic"
                      >
                        No se encontraron egresos en los períodos seleccionados.
                      </td>
                    </tr>
                  ) : (
                    breakdown.map((row) => {
                      const visual = getGastoCategoriaVisual(row.categoria);
                      const Icon = visual.icon;
                      const maxRow = Math.max(
                        ...periodResults.map((p) => row.amounts[p.id] || 0),
                        1,
                      );
                      const isSavings = row.diffAB < 0;
                      const isIncrease = row.diffAB > 0;

                      return (
                        <tr key={row.categoria} className="hover:bg-muted/20 transition-colors">
                          {/* Categoría */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "p-1.5 rounded-lg border",
                                  visual.bgLight,
                                  visual.border,
                                )}
                              >
                                <Icon className={cn("h-3.5 w-3.5", visual.text)} />
                              </span>
                              <div>
                                <span className="font-bold text-foreground capitalize block">
                                  {visual.label}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {periodResults
                                    .map((p) => `${row.counts[p.id] || 0} en ${p.id}`)
                                    .join(" · ")}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Columnas de cada período */}
                          {periodResults.map((p) => {
                            const amt = row.amounts[p.id] || 0;
                            const sh = row.shares[p.id] || 0;
                            return (
                              <td key={p.id} className="px-4 py-3 text-right whitespace-nowrap">
                                <div className="font-bold text-foreground font-mono">
                                  {formatRD(amt)}
                                </div>
                                <div className="text-[10px] text-muted-foreground font-semibold">
                                  {sh.toFixed(1)}% de {p.id}
                                </div>
                              </td>
                            );
                          })}

                          {/* Comparativa cuando son 2 períodos */}
                          {periods.length === 2 && (
                            <>
                              {/* Diferencia (A - B) */}
                              <td className="px-4 py-3 text-right whitespace-nowrap font-mono">
                                <span
                                  className={cn(
                                    "font-bold",
                                    isSavings
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : isIncrease
                                        ? "text-rose-600 dark:text-rose-400"
                                        : "text-muted-foreground",
                                  )}
                                >
                                  {isIncrease ? `+${formatRD(row.diffAB)}` : formatRD(row.diffAB)}
                                </span>
                              </td>

                              {/* Variación (%) */}
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                {row.amountB === 0 && row.amountA > 0 ? (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-bold bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300"
                                  >
                                    Nuevo (+100%)
                                  </Badge>
                                ) : row.amountA === 0 && row.amountB > 0 ? (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-bold bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300"
                                  >
                                    Sin gasto (-100%)
                                  </Badge>
                                ) : (
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full",
                                      isSavings
                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                        : isIncrease
                                          ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200",
                                    )}
                                  >
                                    {isSavings && <TrendingDown className="h-3 w-3" />}
                                    {isIncrease && <TrendingUp className="h-3 w-3" />}
                                    {row.diffAB === 0 && <Minus className="h-3 w-3" />}
                                    <span>
                                      {isIncrease ? "+" : ""}
                                      {row.pctAB.toFixed(1)}%
                                    </span>
                                  </span>
                                )}
                              </td>
                            </>
                          )}

                          {/* Mini Barras Comparativas Proporcionales */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1 w-24 sm:w-32 mx-auto">
                              {periodResults.map((p) => {
                                const theme = PERIOD_THEMES[p.id] || PERIOD_THEMES.A;
                                const amt = row.amounts[p.id] || 0;
                                return (
                                  <div
                                    key={p.id}
                                    className="flex items-center gap-1.5"
                                    title={`${p.id}: ${formatRD(amt)}`}
                                  >
                                    <span
                                      className={cn(
                                        "text-[9px] font-black w-2.5 shrink-0",
                                        theme.badgeText,
                                      )}
                                    >
                                      {p.id}
                                    </span>
                                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className={cn("h-full rounded-full", theme.barColor)}
                                        style={{
                                          width: `${amt > 0 ? Math.max(5, Math.round((amt / maxRow) * 100)) : 0}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* PIE DEL MODAL */}
        <DialogFooter className="px-5 sm:px-6 py-3.5 border-t border-border/80 bg-muted/20 shrink-0 flex flex-col sm:flex-row items-center justify-between sm:justify-between gap-2.5">
          <div className="text-xs font-semibold text-muted-foreground">
            Comparando <span className="font-bold text-foreground">{breakdown.length}</span>{" "}
            categorías en{" "}
            <span className="font-bold text-foreground">{periods.length} períodos</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              onClick={handleExportExcel}
              disabled={breakdown.length === 0}
              className="flex items-center gap-2 rounded-xl h-9 px-3.5 font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border border-emerald-600 shadow-xs cursor-pointer text-xs transition-colors"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-white" />
              <span>Exportar Excel (.xlsx)</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl h-9 px-4 font-bold text-xs cursor-pointer"
            >
              Cerrar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
