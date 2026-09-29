import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
import { 
  Building2, 
  TrendingUp, 
  Package, 
  ExternalLink, 
  ArrowRight, 
  LayoutDashboard, 
  LogOut, 
  Shield, 
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Crown,
  MessageCircle,
  DollarSign,
  Users,
  Wallet,
  Calendar,
  Zap,
  Rocket,
  MessageSquare,
  FileText,
  Wrench,
  Layers,
  Clock,
  AlertCircle,
  Search,
  Filter,
  BarChart3,
  CreditCard,
  Truck,
  Pencil,
  Eye,
  X,
  Phone,
  Store,
  UserCheck,
  ChevronRight,
  Hash,
  Inbox,
  RotateCw,
  Ban,
  Shirt,
  Trash2,
  Receipt,
  PiggyBank,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  Check,
  Building,
  ChevronDown,
  Download,
  FileSpreadsheet
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/klynn/Logo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { 
  getTenantsForUser, 
  getTenantBranchName,
  getOrdenes, 
  getClientes,
  getServicios,
  getPlans,
  PLANS,
  formatRD, 
  formatDateRD,
  setActiveTenant,
  setSession,
  logout,
  getGastos,
  getMovimientos,
  getEmpleados,
  getNextRenewalDate,
  getCajas,
  saveOrden,
  getFacturasCXP,
  getEstadoMoraCXP,
  calcularDiasVencimientoCXP,
  type Tenant,
  type Plan,
  type Orden,
  type Cliente,
  type Servicio,
  type Empleado,
  type EstadoOrden,
  type FacturaCXP,
  type EstadoMoraCXP,
  type Gasto,
  type MovimientoCaja,
  type Suplidor
} from "@/lib/storage";
import { EditOrderDialog } from "@/components/klynn/EditOrderDialog";
import { OrderDetail, TicketPrintPortal } from "@/components/klynn/OrdenesPage";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DMYDatePicker } from "@/components/ui/date-picker";
import { exportConsolidadoToExcel } from "@/lib/excel-consolidado";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePlans } from "@/hooks/use-queries";

export const Route = createFileRoute("/dashboard-admin")({
  head: () => ({ meta: [{ title: "Mis Lavanderías — Klynn" }] }),
  component: DashboardAdminPage,
});

function PlanBadge({ id }: { id: string }) {
  const configs: Record<string, { label: string; icon: any; className: string; iconColor: string }> = {
    basico: { 
      label: "Básico", 
      icon: Zap, 
      className: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800",
      iconColor: "text-sky-500 dark:text-sky-400"
    },
    pro: { 
      label: "Pro", 
      icon: Crown, 
      className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
      iconColor: "text-purple-600 dark:text-purple-400"
    },
    enterprise: { 
      label: "Enterprise", 
      icon: Rocket, 
      className: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700",
      iconColor: "text-amber-600 dark:text-amber-400"
    },
  };
  const config = configs[id] || { label: id, icon: Zap, className: "bg-muted/60 text-foreground border-border", iconColor: "text-muted-foreground" };
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 w-fit ${config.className}`}
    >
      <Icon className={`h-3 w-3 ${config.iconColor}`} />
      <span>{config.label}</span>
    </Badge>
  );
}

function getEstadoBadge(estado: string) {
  const norm = (estado || "").replace("_", " ").toUpperCase().trim();

  const config: Record<string, { icon: any; label: string; style: string }> = {
    RECIBIDA: {
      icon: Inbox,
      label: "Recibida",
      style: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300",
    },
    RECIBIDO: {
      icon: Inbox,
      label: "Recibida",
      style: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300",
    },
    "EN PROCESO": {
      icon: RotateCw,
      label: "En Proceso",
      style: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
    },
    EN_PROCESO: {
      icon: RotateCw,
      label: "En Proceso",
      style: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
    },
    PROCESO: {
      icon: RotateCw,
      label: "En Proceso",
      style: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
    },
    LISTA: {
      icon: CheckCircle2,
      label: "Lista",
      style: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
    },
    LISTO: {
      icon: CheckCircle2,
      label: "Lista",
      style: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
    },
    "EN CAMINO": {
      icon: Truck,
      label: "En Camino",
      style: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300",
    },
    EN_CAMINO: {
      icon: Truck,
      label: "En Camino",
      style: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300",
    },
    ENTREGADA: {
      icon: CheckCircle2,
      label: "Entregada",
      style: "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/50 dark:bg-purple-950/40 dark:text-purple-300",
    },
    ENTREGADO: {
      icon: CheckCircle2,
      label: "Entregada",
      style: "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/50 dark:bg-purple-950/40 dark:text-purple-300",
    },
    PAGADA: {
      icon: CheckCircle2,
      label: "Pagada",
      style: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
    },
    PAGADO: {
      icon: CheckCircle2,
      label: "Pagada",
      style: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
    },
    CANCELADA: {
      icon: Ban,
      label: "Cancelada",
      style: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300",
    },
    CANCELADO: {
      icon: Ban,
      label: "Cancelada",
      style: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300",
    },
    ANULADA: {
      icon: Ban,
      label: "Anulada",
      style: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300",
    },
  };

  const item = config[norm] || config[estado] || {
    icon: CheckCircle2,
    label: estado,
    style: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
  };
  const Icon = item.icon;

  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide shadow-2xs border ${item.style}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span>{item.label}</span>
    </Badge>
  );
}

function EstadoMoraBadge({
  fechaVencimiento,
  saldo,
  estadoMora,
}: {
  fechaVencimiento: string;
  saldo: number;
  estadoMora?: EstadoMoraCXP;
}) {
  const mora = estadoMora || getEstadoMoraCXP(fechaVencimiento, saldo);
  const dias = calcularDiasVencimientoCXP(fechaVencimiento);

  if (mora === "PAGADA" || saldo <= 0) {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
        Pagada
      </Badge>
    );
  }

  if (mora === "CRITICA") {
    return (
      <Badge className="bg-rose-600 text-white border-0 text-[10px] font-bold px-2 py-0.5 rounded-full gap-1 shadow-2xs animate-pulse">
        <AlertTriangle className="h-3 w-3" />
        Crítica ({Math.abs(dias)}d vencida)
      </Badge>
    );
  }

  if (mora === "VENCIDA") {
    return (
      <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full gap-1">
        <Clock className="h-3 w-3 text-rose-600" />
        Vencida ({Math.abs(dias)}d)
      </Badge>
    );
  }

  if (mora === "POR_VENCER") {
    return (
      <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full gap-1">
        <AlertCircle className="h-3 w-3 text-amber-600" />
        Vence en {dias}d
      </Badge>
    );
  }

  return (
    <Badge className="bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
      Al día ({dias}d)
    </Badge>
  );
}

function parseLocalDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  if (dateStr.length === 10 && dateStr.includes("-")) {
    const parts = dateStr.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    }
  }
  const dt = new Date(dateStr);
  return isNaN(dt.getTime()) ? null : dt;
}

function checkWithinPeriod(
  dateStr?: string | null,
  periodo: "HOY" | "7D" | "ESTE_MES" | "MES_ANTERIOR" | "TODO" | "CUSTOM" = "ESTE_MES",
  desde?: string,
  hasta?: string
): boolean {
  if (!dateStr) return false;
  if (periodo === "TODO") return true;

  const d = parseLocalDate(dateStr);
  if (!d) return false;

  const now = new Date();

  if (periodo === "HOY") {
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }

  if (periodo === "7D") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return d >= start && d <= end;
  }

  if (periodo === "ESTE_MES") {
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth()
    );
  }

  if (periodo === "MES_ANTERIOR") {
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return (
      d.getFullYear() === prevMonthDate.getFullYear() &&
      d.getMonth() === prevMonthDate.getMonth()
    );
  }

  if (periodo === "CUSTOM") {
    if (!desde && !hasta) return true;
    const start = desde ? parseLocalDate(desde) : null;
    if (start) start.setHours(0, 0, 0, 0);
    const end = hasta ? parseLocalDate(hasta) : null;
    if (end) end.setHours(23, 59, 59, 999);

    if (start && end) return d >= start && d <= end;
    if (start) return d >= start;
    if (end) return d <= end;
    return true;
  }

  return true;
}

function getPeriodoLabel(
  periodo: "HOY" | "7D" | "ESTE_MES" | "MES_ANTERIOR" | "TODO" | "CUSTOM",
  desde?: string,
  hasta?: string
): string {
  const now = new Date();
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  if (periodo === "HOY") {
    return `Hoy (${now.getDate()} de ${meses[now.getMonth()]} ${now.getFullYear()})`;
  }
  if (periodo === "7D") {
    return "Últimos 7 Días";
  }
  if (periodo === "ESTE_MES") {
    return `${meses[now.getMonth()]} ${now.getFullYear()}`;
  }
  if (periodo === "MES_ANTERIOR") {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${meses[prev.getMonth()]} ${prev.getFullYear()}`;
  }
  if (periodo === "CUSTOM") {
    if (desde && hasta) return `Del ${desde} al ${hasta}`;
    if (desde) return `Desde ${desde}`;
    if (hasta) return `Hasta ${hasta}`;
    return "Rango Personalizado";
  }
  return "Histórico Completo";
}

interface BranchSelectProps {
  tenants: Tenant[];
  value: string; // "ALL" or tenant.id
  onChange: (tenantId: string) => void;
  className?: string;
}

function BranchSelect({ tenants, value, onChange, className = "" }: BranchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedTenant = useMemo(() => {
    if (value === "ALL") return null;
    return tenants.find((t) => t.id === value) || null;
  }, [tenants, value]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const filteredTenants = useMemo(() => {
    if (!search.trim()) return tenants;
    const q = search.toLowerCase().trim();
    return tenants.filter((t) => {
      const name = t.nombre.toLowerCase();
      const rnc = (t.rnc || "").toLowerCase();
      const slug = t.slug.toLowerCase();
      const branchName = getTenantBranchName(t).toLowerCase();
      return name.includes(q) || rnc.includes(q) || slug.includes(q) || branchName.includes(q);
    });
  }, [tenants, search]);

  function handleSelect(id: string) {
    onChange(id);
    setOpen(false);
    setSearch("");
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Botón Trigger Principal Estilo CountrySelect */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="group flex h-10 sm:h-11 w-full items-center justify-between gap-2.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 shadow-2xs transition-all hover:border-primary/50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 active:scale-[0.99] cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Logo Circular o Inicial de la Lavandería */}
          <div className="relative flex h-7.5 w-7.5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs ring-2 ring-white dark:ring-slate-900">
            {value === "ALL" ? (
              <div className="h-full w-full bg-[#1B4B73] text-[#F0B900] flex items-center justify-center">
                <Store className="h-3.5 w-3.5" />
              </div>
            ) : selectedTenant?.logo_url ? (
              <img
                src={selectedTenant.logo_url}
                alt={selectedTenant.nombre}
                className="h-full w-full object-contain p-0.5"
                loading="lazy"
              />
            ) : (
              <div
                className="h-full w-full flex items-center justify-center font-black text-white text-xs"
                style={{ backgroundColor: selectedTenant?.color_primario || "#0891b2" }}
              >
                {selectedTenant?.nombre?.charAt(0).toUpperCase() || "S"}
              </div>
            )}
          </div>

          {/* Nombre de la Lavandería */}
          <div className="flex flex-col text-left truncate">
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
              {value === "ALL" ? "Todas las sucursales" : selectedTenant?.nombre}
            </span>
          </div>
        </div>

        {/* Badges y Chevron */}
        <div className="flex items-center gap-1.5 shrink-0">
          {value === "ALL" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs">
              {tenants.length} sedes
            </span>
          ) : selectedTenant ? (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200/70 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {getTenantBranchName(selectedTenant)}
            </span>
          ) : null}

          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
              open ? "rotate-180 text-primary" : "group-hover:text-slate-600"
            }`}
          />
        </div>
      </button>

      {/* Menú Desplegable con Animación y Buscador */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute left-0 right-0 z-50 mt-1 max-h-84 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-black/5 min-w-[280px]"
          >
            {/* Buscador de sucursales */}
            <div className="sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-2 backdrop-blur-sm">
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar sucursal o sede..."
                  className="h-8.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 pl-8 pr-3 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:border-primary focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Lista de sucursales */}
            <div className="max-h-68 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
              {/* Opción "Todas las sucursales" */}
              <button
                type="button"
                onClick={() => handleSelect("ALL")}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer ${
                  value === "ALL"
                    ? "bg-primary/[0.08] dark:bg-primary/20 text-primary ring-1 ring-primary/20 font-bold"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-7 w-7 rounded-full bg-[#1B4B73] text-[#F0B900] flex items-center justify-center shrink-0 shadow-2xs">
                    <Store className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-foreground truncate">
                      Todas las sucursales
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      Red completa ({tenants.length} sedes activas)
                    </span>
                  </div>
                </div>
                {value === "ALL" && <Check className="h-4 w-4 text-primary shrink-0" />}
              </button>

              {filteredTenants.length === 0 ? (
                <div className="p-3 text-center text-xs text-muted-foreground">
                  No se encontraron sucursales para "{search}"
                </div>
              ) : (
                filteredTenants.map((t) => {
                  const isSelected = t.id === value;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelect(t.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary/[0.08] dark:bg-primary/20 text-primary ring-1 ring-primary/20 font-bold"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 bg-white p-0.5 shadow-2xs">
                          {t.logo_url ? (
                            <img src={t.logo_url} alt="" className="h-full w-full object-contain" />
                          ) : (
                            <div
                              className="h-full w-full flex items-center justify-center font-black text-white text-[11px]"
                              style={{ backgroundColor: t.color_primario || "#0891b2" }}
                            >
                              {t.nombre.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-foreground truncate">
                              {t.nombre}
                            </span>
                            <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 px-1.5 py-0 text-[9px] font-bold text-emerald-800 dark:text-emerald-300">
                              {getTenantBranchName(t)}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {t.rnc ? `RNC: ${t.rnc}` : t.email || t.slug}
                          </span>
                        </div>
                      </div>

                      {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DashboardAdminPage() {
  const auth = useRequireAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userEmail = auth?.empleado.email || "";

  const { data: plans = [] } = usePlans();

  const { data: dashboardData, isLoading: loadingDashboard } = useQuery({
    queryKey: ["dashboard-admin-data", userEmail],
    queryFn: async () => {
      if (!userEmail) return null;
      const tenants = await getTenantsForUser(userEmail);

      const ordsResults = await Promise.all(
        tenants.map(async (t) => {
          try {
            const [ords, clis, gsts, cxpList] = await Promise.all([
              getOrdenes(t.id),
              getClientes(t.id),
              getGastos(t.id),
              getFacturasCXP(t.id),
            ]);
            const ordsArr = Array.isArray(ords) ? (ords as Orden[]) : [];
            const clisArr = Array.isArray(clis) ? (clis as Cliente[]) : [];
            const gstsArr = Array.isArray(gsts) ? (gsts as Gasto[]) : [];
            const cxpArr = Array.isArray(cxpList) ? (cxpList as FacturaCXP[]) : [];
            const validOrds = ordsArr.filter((o) => o.estado !== "ANULADA");
            const ingrCobrado = validOrds.reduce((s: number, o: any) => s + (Number(o.pagado) || 0), 0);
            const totalFacturado = validOrds.reduce((s: number, o: any) => s + (Number(o.total) || 0), 0);
            const totalPorCobrar = validOrds.reduce((s: number, o: any) => s + (Number(o.saldo) || 0), 0);
            return { 
              tenantId: t.id, 
              count: validOrds.length, 
              total: ingrCobrado,
              facturado: totalFacturado,
              porCobrar: totalPorCobrar,
              estado: t.estado,
              ords: validOrds,
              clis: clisArr,
              gastos: gstsArr,
              cxp: cxpArr,
              tenant: t
            };
          } catch {
            return { 
              tenantId: t.id, 
              count: 0, 
              total: 0,
              facturado: 0,
              porCobrar: 0,
              estado: t.estado,
              ords: [],
              clis: [],
              gastos: [],
              cxp: [],
              tenant: t
            };
          }
        })
      );

      let totalIngresos = 0, totalFacturado = 0, totalPorCobrar = 0, totalOrdenesCount = 0, activasCount = 0;
      const tStats: Record<string, { count: number; total: number; facturado: number; porCobrar: number }> = {};
      const allOrdersWithTenant: Array<{ orden: Orden; tenant: Tenant; cliente?: Cliente }> = [];

      for (const res of ordsResults) {
        tStats[res.tenantId] = { count: res.count, total: res.total, facturado: res.facturado, porCobrar: res.porCobrar };
        totalIngresos += res.total;
        totalFacturado += res.facturado;
        totalPorCobrar += res.porCobrar;
        totalOrdenesCount += res.count;
        if (res.estado !== "CANCELADO") activasCount++;

        const clientMap = new Map((res.clis || []).map((c) => [c.id, c]));
        (res.ords || []).forEach((o: Orden) => {
          allOrdersWithTenant.push({
            orden: o,
            tenant: res.tenant,
            cliente: clientMap.get(o.cliente_id)
          });
        });
      }

      return {
        tenants,
        tenantStats: tStats,
        stats: { totalIngresos, totalFacturado, totalPorCobrar, totalOrdenesCount, activasCount },
        allOrdersWithTenant,
        tenantsFullData: ordsResults,
      };
    },
    enabled: !!userEmail && auth?.empleado.id !== '__loading__',
    staleTime: 60_000,
  });

  const myTenants = dashboardData?.tenants || [];
  const tenantStats = dashboardData?.tenantStats || {};
  const stats = dashboardData?.stats || { totalIngresos: 0, totalOrdenesCount: 0, activasCount: 0 };
  const allOrdersWithTenant = dashboardData?.allOrdersWithTenant || [];
  const loading = loadingDashboard && myTenants.length === 0;

  // Tabs del panel de propietario
  const [activeTab, setActiveTab] = useState<"sucursales" | "consolidado" | "cxp">("sucursales");

  // Filtros de Consolidado Financiero Multisede
  const [periodo, setPeriodo] = useState<"HOY" | "7D" | "ESTE_MES" | "MES_ANTERIOR" | "TODO" | "CUSTOM">("ESTE_MES");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");
  const [filtroSucursalConsolidado, setFiltroSucursalConsolidado] = useState<string>("ALL");
  const [busquedaConsolidado, setBusquedaConsolidado] = useState<string>("");

  // Filtros de Cuentas por Pagar (CXP)
  const [cxpFilterStatus, setCxpFilterStatus] = useState<"TODAS" | "PENDIENTES" | "VENCIDAS" | "PAGADAS">("PENDIENTES");
  const [cxpSearch, setCxpSearch] = useState<string>("");
  const [cxpTenantFilter, setCxpTenantFilter] = useState<string>("ALL");

  // Memos de Consolidado Financiero
  const consolidadoData = useMemo(() => {
    const tenantsList = dashboardData?.tenantsFullData || [];
    
    const sucursales = tenantsList.map((item) => {
      const ordsInPeriod = item.ords.filter((o) =>
        checkWithinPeriod(o.creado_en, periodo, fechaDesde, fechaHasta)
      );
      const gastosInPeriod = item.gastos.filter((g) =>
        checkWithinPeriod(g.fecha, periodo, fechaDesde, fechaHasta)
      );

      const ingresosCobrados = ordsInPeriod.reduce((sum, o) => sum + (Number(o.pagado) || 0), 0);
      const facturado = ordsInPeriod.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const porCobrarPeriodo = ordsInPeriod.reduce((sum, o) => sum + (Number(o.saldo) || 0), 0);
      const porCobrarTotal = item.ords.reduce((sum, o) => sum + (Number(o.saldo) || 0), 0);
      const totalGastos = gastosInPeriod.reduce((sum, g) => sum + (Number(g.monto) || 0), 0);
      const utilidadNeta = ingresosCobrados - totalGastos;
      const margenPct = ingresosCobrados > 0 ? (utilidadNeta / ingresosCobrados) * 100 : 0;

      // Métricas de Clientes
      const activeClientIds = new Set(ordsInPeriod.map((o) => o.cliente_id).filter(Boolean));
      const clientesActivos = activeClientIds.size;
      const totalCartera = item.clis.length;
      const ticketPromedioCliente = clientesActivos > 0 ? Math.round(ingresosCobrados / clientesActivos) : 0;
      const ticketPromedioOrden = ordsInPeriod.length > 0 ? Math.round(facturado / ordsInPeriod.length) : 0;

      // CXP
      const facturasPendientes = item.cxp.filter((f) => f.estado !== "PAGADA" && f.estado !== "ANULADA");
      const cxpPendiente = facturasPendientes.reduce(
        (sum, f) => sum + (Number(f.saldo_pendiente ?? (f.total - (f.monto_pagado || 0))) || 0),
        0
      );
      const cxpVencidas = facturasPendientes.filter(
        (f) => f.estado_mora === "VENCIDA" || f.estado_mora === "CRITICA"
      ).length;

      return {
        tenant: item.tenant,
        tenantId: item.tenantId,
        ordenesCount: ordsInPeriod.length,
        ingresosCobrados,
        facturado,
        porCobrarPeriodo,
        porCobrarTotal,
        gastosCount: gastosInPeriod.length,
        totalGastos,
        utilidadNeta,
        margenPct,
        clientesActivos,
        totalCartera,
        ticketPromedioCliente,
        ticketPromedioOrden,
        cxpPendiente,
        cxpVencidas,
        cxpTotalFacturas: item.cxp.length,
      };
    });

    // Totales de la Cadena
    const cadenaCobrado = sucursales.reduce((s, x) => s + x.ingresosCobrados, 0);
    const cadenaFacturado = sucursales.reduce((s, x) => s + x.facturado, 0);
    const cadenaGastos = sucursales.reduce((s, x) => s + x.totalGastos, 0);
    const cadenaGastosCount = sucursales.reduce((s, x) => s + x.gastosCount, 0);
    const cadenaUtilidad = cadenaCobrado - cadenaGastos;
    const cadenaMargen = cadenaCobrado > 0 ? (cadenaUtilidad / cadenaCobrado) * 100 : 0;
    const cadenaOrdenes = sucursales.reduce((s, x) => s + x.ordenesCount, 0);
    const cadenaClientesActivos = sucursales.reduce((s, x) => s + x.clientesActivos, 0);
    const cadenaTotalCartera = sucursales.reduce((s, x) => s + x.totalCartera, 0);
    const cadenaTicketCliente = cadenaClientesActivos > 0 ? Math.round(cadenaCobrado / cadenaClientesActivos) : 0;
    const cadenaTicketOrden = cadenaOrdenes > 0 ? Math.round(cadenaFacturado / cadenaOrdenes) : 0;
    const cadenaCXCPeriodo = sucursales.reduce((s, x) => s + x.porCobrarPeriodo, 0);
    const cadenaCXCTotal = sucursales.reduce((s, x) => s + x.porCobrarTotal, 0);
    const cadenaCXP = sucursales.reduce((s, x) => s + x.cxpPendiente, 0);
    const cadenaCXPVencidas = sucursales.reduce((s, x) => s + x.cxpVencidas, 0);

    return {
      sucursales,
      cadenaCobrado,
      cadenaFacturado,
      cadenaGastos,
      cadenaTotalGastosCount: cadenaGastosCount,
      cadenaUtilidad,
      cadenaMargen,
      cadenaOrdenes,
      cadenaClientesActivos,
      cadenaTotalCartera,
      cadenaTicketCliente,
      cadenaTicketOrden,
      cadenaCXCPeriodo,
      cadenaCXCTotal,
      cadenaCXP,
      cadenaCXPVencidas,
    };
  }, [dashboardData?.tenantsFullData, periodo, fechaDesde, fechaHasta]);

  const sucursalesFiltradasConsolidado = useMemo(() => {
    return consolidadoData.sucursales.filter((item) => {
      if (filtroSucursalConsolidado !== "ALL" && item.tenantId !== filtroSucursalConsolidado) {
        return false;
      }
      if (busquedaConsolidado.trim()) {
        const q = busquedaConsolidado.toLowerCase().trim();
        const nom = item.tenant.nombre.toLowerCase();
        const rnc = (item.tenant.rnc || "").toLowerCase();
        const slug = item.tenant.slug.toLowerCase();
        return nom.includes(q) || rnc.includes(q) || slug.includes(q);
      }
      return true;
    });
  }, [consolidadoData.sucursales, filtroSucursalConsolidado, busquedaConsolidado]);

  // CXP Flat List & Resumen
  const cxpFlatList = useMemo(() => {
    const tenantsList = dashboardData?.tenantsFullData || [];
    const list: Array<FacturaCXP & { tenant: Tenant }> = [];

    for (const item of tenantsList) {
      for (const f of item.cxp) {
        list.push({ ...f, tenant: item.tenant });
      }
    }

    return list.filter((f) => {
      if (cxpTenantFilter !== "ALL" && f.tenant_id !== cxpTenantFilter) return false;

      if (cxpFilterStatus === "PENDIENTES") {
        if (f.estado === "PAGADA" || f.estado === "ANULADA" || (f.saldo_pendiente ?? f.total) <= 0) return false;
      } else if (cxpFilterStatus === "VENCIDAS") {
        if (f.estado === "PAGADA" || f.estado === "ANULADA" || (f.saldo_pendiente ?? f.total) <= 0) return false;
        const mora = f.estado_mora || getEstadoMoraCXP(f.fecha_vencimiento, f.saldo_pendiente ?? f.total);
        if (mora !== "VENCIDA" && mora !== "CRITICA") return false;
      } else if (cxpFilterStatus === "PAGADAS") {
        if (f.estado !== "PAGADA" && (f.saldo_pendiente ?? f.total) > 0) return false;
      }

      if (cxpSearch.trim()) {
        const q = cxpSearch.toLowerCase().trim();
        const numMatch = (f.numero_factura || "").toLowerCase().includes(q);
        const ncfMatch = (f.ncf || "").toLowerCase().includes(q);
        const provMatch = (f.suplidor?.nombre_comercial || f.suplidor?.razon_social || "").toLowerCase().includes(q);
        const rncMatch = (f.suplidor?.rnc_cedula || "").toLowerCase().includes(q);
        const tenantMatch = f.tenant.nombre.toLowerCase().includes(q);
        return numMatch || ncfMatch || provMatch || rncMatch || tenantMatch;
      }

      return true;
    });
  }, [dashboardData?.tenantsFullData, cxpTenantFilter, cxpFilterStatus, cxpSearch]);

  const cxpResumen = useMemo(() => {
    const tenantsList = dashboardData?.tenantsFullData || [];
    let totalPendiente = 0;
    let totalPagado = 0;
    let totalFacturas = 0;
    let totalVencidas = 0;
    let totalCriticas = 0;
    const suplidoresConSaldo = new Set<string>();

    for (const item of tenantsList) {
      for (const f of item.cxp) {
        if (f.estado === "ANULADA") continue;
        totalFacturas++;
        const pagado = Number(f.monto_pagado) || 0;
        const saldo = Number(f.saldo_pendiente ?? (f.total - pagado)) || 0;
        totalPagado += pagado;
        if (saldo > 0 && f.estado !== "PAGADA") {
          totalPendiente += saldo;
          if (f.suplidor_id) suplidoresConSaldo.add(f.suplidor_id);
          const mora = f.estado_mora || getEstadoMoraCXP(f.fecha_vencimiento, saldo);
          if (mora === "VENCIDA") totalVencidas++;
          if (mora === "CRITICA") totalCriticas++;
        }
      }
    }

    return {
      totalPendiente,
      totalPagado,
      totalFacturas,
      totalVencidas,
      totalCriticas,
      suplidoresCount: suplidoresConSaldo.size,
    };
  }, [dashboardData?.tenantsFullData]);

  // Filtros de Sucursales
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Buscador Global Multicursal (Omnisearch)
  const [globalSearch, setGlobalSearch] = useState("");
  const [globalSearchBranch, setGlobalSearchBranch] = useState<string>("ALL");
  const [isOpeningOrder, setIsOpeningOrder] = useState(false);

  const selectedBranchTenant = useMemo(() => {
    return myTenants.find((t) => t.id === globalSearchBranch) || null;
  }, [myTenants, globalSearchBranch]);

  const globalSearchResults = useMemo(() => {
    const q = globalSearch.toLowerCase().trim();
    if (!q || q.length < 2) return [];
    const cleanQ = q.startsWith("#") ? q.slice(1) : q;

    return allOrdersWithTenant.filter(({ orden, tenant, cliente }) => {
      // Filtro por sucursal seleccionada
      if (globalSearchBranch !== "ALL" && tenant.id !== globalSearchBranch) {
        return false;
      }

      const numMatch = (orden.numero || "").toLowerCase().includes(cleanQ);
      const cliNameMatch = cliente 
        ? `${cliente.nombre} ${cliente.apellido || ""}`.toLowerCase().includes(q) 
        : false;
      const cliPhoneMatch = cliente?.telefono ? cliente.telefono.includes(cleanQ) : false;
      const tenantNameMatch = tenant.nombre.toLowerCase().includes(q);
      const notesMatch = (orden.notas || "").toLowerCase().includes(q);

      return numMatch || cliNameMatch || cliPhoneMatch || tenantNameMatch || notesMatch;
    }).slice(0, 20);
  }, [allOrdersWithTenant, globalSearch, globalSearchBranch]);

  const filteredTenants = useMemo(() => {
    return myTenants.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q || 
        t.nombre.toLowerCase().includes(q) || 
        t.email?.toLowerCase().includes(q) || 
        t.telefono?.toLowerCase().includes(q) || 
        t.slug.toLowerCase().includes(q) ||
        (t.rnc && t.rnc.toLowerCase().includes(q));
      
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "ACTIVO" && t.estado === "ACTIVO") ||
        (statusFilter === "TRIAL" && t.estado === "TRIAL");

      return matchesQuery && matchesStatus;
    });
  }, [myTenants, searchQuery, statusFilter]);

  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Estados para ver / editar órdenes desde la búsqueda global
  const [editingOrder, setEditingOrder] = useState<Orden | null>(null);
  const [editingOrderContext, setEditingOrderContext] = useState<{
    tenant: Tenant;
    clientes: Cliente[];
    servicios: Servicio[];
    empleados: Empleado[];
  } | null>(null);

  const [viewingOrder, setViewingOrder] = useState<Orden | null>(null);
  const [viewingOrderContext, setViewingOrderContext] = useState<{
    tenant: Tenant;
    clientes: Cliente[];
    servicios: Servicio[];
    empleados: Empleado[];
  } | null>(null);

  const [showPrint, setShowPrint] = useState<Orden | null>(null);

  // Handlers para Exportar a Excel (Consolidado y CXP)
  const handleExportConsolidadoExcel = (isAllHistory: boolean = false) => {
    try {
      const tenantsList = dashboardData?.tenantsFullData || [];
      if (tenantsList.length === 0) {
        toast.error("No hay datos de sucursales para exportar");
        return;
      }

      let sucursalesToExport: any[] = [];
      let cadenaTotals: any = null;
      let label = "";

      if (isAllHistory) {
        label = "Histórico Completo (Sin filtro de fecha)";
        const rawSucursales = tenantsList.map((item) => {
          const ords = item.ords;
          const gastos = item.gastos;
          const cobrado = ords.reduce((sum, o) => sum + (Number(o.pagado) || 0), 0);
          const facturado = ords.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
          const porCobrar = ords.reduce((sum, o) => sum + (Number(o.saldo) || 0), 0);
          const totalGastos = gastos.reduce((sum, g) => sum + (Number(g.monto) || 0), 0);
          const utilidad = cobrado - totalGastos;
          const margen = cobrado > 0 ? (utilidad / cobrado) * 100 : 0;
          const activeCliIds = new Set(ords.map((o) => o.cliente_id).filter(Boolean));
          const clisActivos = activeCliIds.size;
          const cartera = item.clis.length;
          const ticketCli = clisActivos > 0 ? Math.round(cobrado / clisActivos) : 0;
          const facturasPendientes = item.cxp.filter((f) => f.estado !== "PAGADA" && f.estado !== "ANULADA");
          const cxpPend = facturasPendientes.reduce(
            (sum, f) => sum + (Number(f.saldo_pendiente ?? (f.total - (f.monto_pagado || 0))) || 0),
            0
          );
          const cxpVenc = facturasPendientes.filter(
            (f) => f.estado_mora === "VENCIDA" || f.estado_mora === "CRITICA"
          ).length;

          return {
            nombre: item.tenant.nombre,
            sede: getTenantBranchName(item.tenant),
            rnc: item.tenant.rnc || "",
            clientesActivos: clisActivos,
            totalCartera: cartera,
            ingresosCobrados: cobrado,
            facturado: facturado,
            totalGastos: totalGastos,
            utilidadNeta: utilidad,
            margenPct: margen,
            ticketPromedioCliente: ticketCli,
            ordenesCount: ords.length,
            porCobrarTotal: porCobrar,
            cxpPendiente: cxpPend,
            cxpVencidas: cxpVenc,
          };
        });

        sucursalesToExport = rawSucursales;
        const cobradoTot = rawSucursales.reduce((s, x) => s + x.ingresosCobrados, 0);
        const facturadoTot = rawSucursales.reduce((s, x) => s + x.facturado, 0);
        const gastosTot = rawSucursales.reduce((s, x) => s + x.totalGastos, 0);
        const utilidadTot = cobradoTot - gastosTot;
        const margenTot = cobradoTot > 0 ? (utilidadTot / cobradoTot) * 100 : 0;
        const clisTot = rawSucursales.reduce((s, x) => s + x.clientesActivos, 0);
        const carteraTot = rawSucursales.reduce((s, x) => s + x.totalCartera, 0);
        const ticketTot = clisTot > 0 ? Math.round(cobradoTot / clisTot) : 0;
        const ordenesTot = rawSucursales.reduce((s, x) => s + x.ordenesCount, 0);
        const cxcTot = rawSucursales.reduce((s, x) => s + x.porCobrarTotal, 0);
        const cxpTot = rawSucursales.reduce((s, x) => s + x.cxpPendiente, 0);
        const cxpVencTot = rawSucursales.reduce((s, x) => s + x.cxpVencidas, 0);

        cadenaTotals = {
          cadenaCobrado: cobradoTot,
          cadenaFacturado: facturadoTot,
          cadenaGastos: gastosTot,
          cadenaUtilidad: utilidadTot,
          cadenaMargen: margenTot,
          cadenaClientesActivos: clisTot,
          cadenaTotalCartera: carteraTot,
          cadenaTicketCliente: ticketTot,
          cadenaOrdenes: ordenesTot,
          cadenaCXCTotal: cxcTot,
          cadenaCXP: cxpTot,
          cadenaCXPVencidas: cxpVencTot,
        };
      } else {
        label = getPeriodoLabel(periodo, fechaDesde, fechaHasta);
        const list = filtroSucursalConsolidado === "ALL" 
          ? consolidadoData.sucursales 
          : sucursalesFiltradasConsolidado;

        sucursalesToExport = list.map((item) => ({
          nombre: item.tenant.nombre,
          sede: getTenantBranchName(item.tenant),
          rnc: item.tenant.rnc || "",
          clientesActivos: item.clientesActivos,
          totalCartera: item.totalCartera,
          ingresosCobrados: item.ingresosCobrados,
          facturado: item.facturado,
          totalGastos: item.totalGastos,
          utilidadNeta: item.utilidadNeta,
          margenPct: item.margenPct,
          ticketPromedioCliente: item.ticketPromedioCliente,
          ordenesCount: item.ordenesCount,
          porCobrarTotal: item.porCobrarTotal,
          cxpPendiente: item.cxpPendiente,
          cxpVencidas: item.cxpVencidas,
        }));

        cadenaTotals = {
          cadenaCobrado: consolidadoData.cadenaCobrado,
          cadenaFacturado: consolidadoData.cadenaFacturado,
          cadenaGastos: consolidadoData.cadenaGastos,
          cadenaUtilidad: consolidadoData.cadenaUtilidad,
          cadenaMargen: consolidadoData.cadenaMargen,
          cadenaClientesActivos: consolidadoData.cadenaClientesActivos,
          cadenaTotalCartera: consolidadoData.cadenaTotalCartera,
          cadenaTicketCliente: consolidadoData.cadenaTicketCliente,
          cadenaOrdenes: consolidadoData.cadenaOrdenes,
          cadenaCXCTotal: consolidadoData.cadenaCXCTotal,
          cadenaCXP: consolidadoData.cadenaCXP,
          cadenaCXPVencidas: consolidadoData.cadenaCXPVencidas,
        };
      }

      // Facturas CXP para la segunda hoja
      const cxpFacturasExport: any[] = [];
      tenantsList.forEach((tItem) => {
        tItem.cxp.forEach((f) => {
          if (f.estado === "ANULADA") return;
          const saldo = Number(f.saldo_pendiente ?? (f.total - (f.monto_pagado || 0))) || 0;
          cxpFacturasExport.push({
            sucursal: tItem.tenant.nombre,
            suplidor: f.suplidor?.nombre_comercial || f.suplidor?.razon_social || "General",
            rnc: f.suplidor?.rnc_cedula || "",
            numeroFactura: f.numero_factura || f.id,
            ncf: f.ncf || "",
            fechaEmision: f.fecha_emision || "",
            fechaVencimiento: f.fecha_vencimiento || "",
            estadoMora: f.estado_mora || getEstadoMoraCXP(f.fecha_vencimiento, saldo),
            total: Number(f.total) || 0,
            montoPagado: Number(f.monto_pagado) || 0,
            saldoPendiente: saldo,
          });
        });
      });

      exportConsolidadoToExcel({
        periodoLabel: label,
        sucursales: sucursalesToExport,
        totalesCadena: cadenaTotals,
        cxpList: cxpFacturasExport,
      });

      toast.success("Reporte consolidado exportado a Excel exitosamente");
    } catch (err: any) {
      console.error("Error al exportar consolidado:", err);
      toast.error("Ocurrió un error al generar el archivo Excel");
    }
  };

  const handleExportCXPExcel = () => {
    try {
      const list = cxpFlatList;
      if (list.length === 0) {
        toast.error("No hay facturas de CXP para exportar con los filtros actuales");
        return;
      }
      const cxpFacturasExport = list.map((f) => {
        const saldo = Number(f.saldo_pendiente ?? (f.total - (f.monto_pagado || 0))) || 0;
        return {
          sucursal: f.tenant?.nombre || "Sucursal",
          suplidor: f.suplidor?.nombre_comercial || f.suplidor?.razon_social || "General",
          rnc: f.suplidor?.rnc_cedula || "",
          numeroFactura: f.numero_factura || f.id,
          ncf: f.ncf || "",
          fechaEmision: f.fecha_emision || "",
          fechaVencimiento: f.fecha_vencimiento || "",
          estadoMora: f.estado_mora || getEstadoMoraCXP(f.fecha_vencimiento, saldo),
          total: Number(f.total) || 0,
          montoPagado: Number(f.monto_pagado) || 0,
          saldoPendiente: saldo,
        };
      });

      exportConsolidadoToExcel({
        periodoLabel: `Cuentas por Pagar (${cxpFilterStatus})`,
        sucursales: [],
        totalesCadena: {
          cadenaCobrado: 0,
          cadenaFacturado: 0,
          cadenaGastos: 0,
          cadenaUtilidad: 0,
          cadenaMargen: 0,
          cadenaClientesActivos: 0,
          cadenaTotalCartera: 0,
          cadenaTicketCliente: 0,
          cadenaOrdenes: 0,
          cadenaCXCTotal: 0,
          cadenaCXP: cxpResumen.totalPendiente,
          cadenaCXPVencidas: cxpResumen.totalVencidas,
        },
        cxpList: cxpFacturasExport,
      });
      toast.success("Facturas de CXP exportadas exitosamente a Excel");
    } catch (err: any) {
      console.error("Error al exportar CXP:", err);
      toast.error("Error al exportar CXP");
    }
  };
  const handleOpenGlobalOrder = async (orden: Orden, tenant: Tenant, action: "view" | "edit") => {
    setIsOpeningOrder(true);
    try {
      const [clis, servs, emps] = await Promise.all([
        getClientes(tenant.id),
        getServicios(tenant.id),
        getEmpleados(tenant.id)
      ]);
      const ctx = {
        tenant,
        clientes: clis || [],
        servicios: servs || [],
        empleados: emps || []
      };
      if (action === "view") {
        setViewingOrderContext(ctx);
        setViewingOrder(orden);
      } else {
        setEditingOrderContext(ctx);
        setEditingOrder(orden);
      }
    } catch (e) {
      console.error("Error al preparar orden:", e);
      toast.error("Error al cargar datos para la orden");
    } finally {
      setIsOpeningOrder(false);
    }
  };


  // Guardar orden editada con actualización reactiva
  const handleOrderSaved = (updated: Orden) => {
    setEditingOrder(null);
    setEditingOrderContext(null);
    toast.success(`Orden #${updated.numero} actualizada con éxito`);

    if (viewingOrder?.id === updated.id) {
      setViewingOrder(updated);
    }

    queryClient.invalidateQueries({ queryKey: ["dashboard-admin-data"] });
  };

  // Cambiar estado de orden
  const handleCambiarEstado = async (ordenId: string, nuevoEstado: EstadoOrden) => {
    try {
      const orden = viewingOrder;
      if (!orden) return;
      const updated = { ...orden, estado: nuevoEstado };
      await saveOrden(updated);
      toast.success(`Estado de orden #${orden.numero} cambiado a ${nuevoEstado}`);

      if (viewingOrder?.id === ordenId) {
        setViewingOrder(updated);
      }

      queryClient.invalidateQueries({ queryKey: ["dashboard-admin-data"] });
    } catch (err) {
      console.error("Error al cambiar estado:", err);
      toast.error("Error al actualizar estado");
    }
  };


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment_success") === "true") {
      setShowSuccessModal(true);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  const mainTenant = myTenants[0];
  const sucursalesCreadas = myTenants.length;
  
  const plan = useMemo(() => {
    if (!mainTenant) return null;
    return plans.find(p => p.id === mainTenant.plan_id) || plans[0] || PLANS[0];
  }, [mainTenant, plans]);

  // Si no hay límite de sucursales en la columna max_sucursales, buscar en config o por defecto 1 (la base)
  const maxSucursalesContratadas = mainTenant?.max_sucursales || mainTenant?.config?.max_sucursales || 1;

  // Límite de adicionales según el plan
  const limiteAdicionalesPlan = useMemo(() => {
    if (!plan) return 3; // default
    if (plan.limite_sucursales_adicionales !== undefined) return plan.limite_sucursales_adicionales;
    return plan.id === "basico" ? 1 : plan.id === "pro" ? 3 : 5;
  }, [plan]);

  const totalMaxSucursalesPlan = 1 + limiteAdicionalesPlan;
  const tieneCuposLibres = sucursalesCreadas < maxSucursalesContratadas;
  const puedeComprarMas = maxSucursalesContratadas < totalMaxSucursalesPlan;
  
  const precioAdicional = useMemo(() => {
    if (!plan) return 1200;
    if (plan.precio_sucursal_adicional !== undefined) return plan.precio_sucursal_adicional;
    return plan.id === "basico" ? 1000 : plan.id === "pro" ? 1200 : 1500;
  }, [plan]);

  const polarSucursalUrl = plan?.polar_sucursal_url || "";

  function handleManage(tenantId: string, slug: string) {
    setSession({ empleado_id: auth?.empleado.id || 'admin', tenant_id: tenantId, iniciado_en: new Date().toISOString() });
    setActiveTenant(slug);
    toast.success(`Entrando a ${slug}...`);
    setTimeout(() => window.location.assign(`/t/${slug}`), 500);
  }

  async function handleLogout() {
    const slug = auth?.tenant?.slug || myTenants[0]?.slug || (typeof window !== "undefined" ? localStorage.getItem("klynn_active_tenant") : null);
    await logout();
    if (slug && slug !== "admin") {
      window.location.assign(`/t/${slug}/login`);
    } else {
      window.location.assign("/login");
    }
  }

  if (!auth || auth.empleado.id === '__loading__') {
    return <GlobalPageLoader text="Cargando panel de administración..." minHeight="min-h-screen" />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header replicado de admin.tsx */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge className="bg-[#1B4B73] hover:bg-[#1B4B73] text-white border-0 font-bold shadow-2xs text-xs px-3 py-1 rounded-xl">
              <Shield className="mr-1.5 h-3.5 w-3.5 text-[#F0B900]" /> Panel Propietario
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            {auth?.empleado?.email && (
              <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-[#1B4B73] border-0 text-white shadow-xs">
                <div className="h-6 w-6 rounded-full bg-white/20 text-[#F0B900] flex items-center justify-center text-[11px] font-black shrink-0">
                  {auth.empleado.email.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs sm:text-sm font-bold text-white tracking-tight truncate max-w-[200px]">
                  {auth.empleado.email}
                </span>
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-rose-600 hover:bg-rose-700 active:scale-95 text-white border border-rose-600 transition-all cursor-pointer shrink-0 whitespace-nowrap"
            >
              <LogOut className="h-4 w-4 shrink-0 text-white" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl tracking-tight">Panel central de Propietario</h1>
            <p className="mt-1 text-muted-foreground">Administra tus lavanderías y sucursales en tiempo real.</p>
          </div>
          <Button 
            onClick={() => setShowBranchModal(true)}
            className="bg-primary text-white hover:bg-primary/90 h-10 px-5 rounded-xl shadow-md transition-all active:scale-95 font-bold"
          >
            <Store className="mr-2 h-4 w-4" /> Registrar nueva sucursal
          </Button>
        </div>

        {/* Barra de Pestañas de Navegación */}
        <div className="mt-6 flex items-center gap-2 border-b border-border/80 pb-2.5 overflow-x-auto custom-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("sucursales")}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${
              activeTab === "sucursales"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Store className="h-4 w-4 shrink-0" />
            <span>Mis Sucursales</span>
            <Badge
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ml-1 transition-colors border-0 ${
                activeTab === "sucursales"
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              }`}
            >
              {myTenants.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("consolidado")}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${
              activeTab === "consolidado"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <BarChart3 className="h-4 w-4 shrink-0" />
            <span>Consolidado Financiero</span>
            <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold ml-1 border-0 shadow-2xs">
              Multi-Sede
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("cxp")}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${
              activeTab === "cxp"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Receipt className="h-4 w-4 shrink-0" />
            <span>Cuentas por Pagar (CXP)</span>
            {cxpResumen.totalVencidas + cxpResumen.totalCriticas > 0 ? (
              <Badge className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold ml-1 animate-pulse border-0 shadow-2xs">
                {cxpResumen.totalVencidas + cxpResumen.totalCriticas} vencida{(cxpResumen.totalVencidas + cxpResumen.totalCriticas) > 1 ? "s" : ""}
              </Badge>
            ) : (
              <Badge className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold ml-1 border-0 shadow-2xs">
                Suplidores
              </Badge>
            )}
          </button>
        </div>

        {activeTab === "sucursales" && (
          <div>
            {/* KPIs replicados de admin.tsx */}
            <div className="mt-5 sm:mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KPI 
            title="Mis Lavanderías" 
            value={`${stats.activasCount} / ${myTenants.length}`} 
            sub={`${stats.activasCount} Activas • ${myTenants.filter(t => t.estado === 'TRIAL').length} Pruebas`} 
            icon={Building2} 
            variant="primary" 
          />
          <KPI 
            title="Ingresos Cobrados" 
            value={formatRD(stats.totalIngresos)} 
            sub={`Facturado: ${formatRD((stats as any).totalFacturado || stats.totalIngresos)}`} 
            icon={TrendingUp} 
            variant="emerald" 
          />
          <KPI 
            title="Órdenes Totales" 
            value={stats.totalOrdenesCount.toLocaleString("es-DO")} 
            sub="Pedidos acumulados" 
            icon={Package} 
            variant="indigo" 
          />
          <KPI 
            title="Cupos Sucursal" 
            value={`${sucursalesCreadas} / ${maxSucursalesContratadas}`} 
            sub={tieneCuposLibres ? "¡Cupo disponible para agregar!" : "Límite actual de tu plan"} 
            icon={Crown} 
            variant="amber" 
          />
        </div>

        {/* Barra de Búsqueda Global Multicursal (Omnisearch) y Filtros */}
        <div className="mt-6 sm:mt-8 space-y-3">
          {/* Buscador Global Omnisearch con Selector de Sucursal Integrado */}
          <div className="relative">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-300/80 dark:border-slate-700 shadow-sm p-2 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                {/* Selector de Sucursal con Logo Circular, Búsqueda y Animación */}
                <BranchSelect
                  tenants={myTenants}
                  value={globalSearchBranch}
                  onChange={setGlobalSearchBranch}
                  className="w-full sm:w-[270px] shrink-0"
                />

                {/* Separador vertical para pantallas medianas/grandes */}
                <div className="hidden sm:block h-7 w-px bg-slate-200 dark:bg-slate-750 mx-0.5" />

                {/* Campo de búsqueda con borde definido, icono y botón de limpiar */}
                <div className="relative flex-1 flex items-center min-w-0 bg-slate-50/90 dark:bg-slate-800/90 border border-slate-300/90 dark:border-slate-600/90 rounded-xl px-3 h-11 transition-all focus-within:border-primary focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-2 focus-within:ring-primary/20 shadow-2xs gap-2">
                  <Search className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
                  <Input
                    placeholder={
                      globalSearchBranch === "ALL"
                        ? "Buscar orden # (ej. 0052), cliente o teléfono en todas las sucursales..."
                        : `Buscar en ${selectedBranchTenant?.nombre || "esta sucursal"}...`
                    }
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    className="border-0 shadow-none focus-visible:ring-0 text-xs sm:text-sm h-full bg-transparent flex-1 pl-1 placeholder:text-muted-foreground/70 font-medium"
                  />
                  {globalSearch && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setGlobalSearch("")}
                      className="h-8 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0 border-0"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-white stroke-[2.5]" />
                      <span>Limpiar Campo</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Resultados Flotantes de la Búsqueda Global */}
            {globalSearch.trim().length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-3 z-50 max-h-[460px] overflow-y-auto space-y-2">
                <div className="flex items-center justify-between px-2 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-2">
                  <span>
                    Resultados {globalSearchBranch !== "ALL" ? `en ${myTenants.find((t) => t.id === globalSearchBranch)?.nombre || "sucursal"}` : "en todas las sucursales"} ({globalSearchResults.length})
                  </span>
                  <span className="text-[10px] lowercase font-normal text-muted-foreground">haz clic en Ver o Editar</span>
                </div>

                {globalSearchResults.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-30 text-primary" />
                    No se encontraron órdenes o clientes coincidentes con <strong className="text-foreground">"{globalSearch}"</strong>.
                  </div>
                ) : (
                  globalSearchResults.map(({ orden, tenant, cliente }) => {
                    const totalPrendas = (orden.items || []).reduce((acc: number, it: any) => acc + (it.cantidad || 0), 0);

                    return (
                      <div
                        key={`${tenant.id}-${orden.id}`}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-primary/50 hover:shadow-md transition-all gap-3.5 group"
                      >
                        <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                          {/* Badge de Orden Horizontal Elegante (ancho automático sin cortes) */}
                          <div className="shrink-0">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs tabular-nums tracking-wide shadow-2xs whitespace-nowrap">
                              <Hash className="h-3 w-3 opacity-60 shrink-0" />
                              {orden.numero}
                            </span>
                          </div>

                          {/* Datos del Cliente, Sucursal y Fechas */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                {cliente ? `${cliente.nombre} ${cliente.apellido || ""}` : `Cliente registrado`}
                              </span>
                              {cliente?.telefono && (
                                <span className="text-xs text-muted-foreground font-mono">
                                  • {cliente.telefono}
                                </span>
                              )}
                              {globalSearchBranch === "ALL" && (
                                <Badge variant="outline" className="text-[10px] font-bold bg-sky-50 text-sky-800 border-sky-200/80 dark:bg-sky-950/60 dark:text-sky-300 inline-flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full shadow-2xs">
                                  <Store className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                                  <span>{tenant.nombre}</span>
                                </Badge>
                              )}
                              {getEstadoBadge(orden.estado)}
                              {orden.es_urgente && (
                                <Badge className="text-[9px] bg-rose-500 text-white font-bold h-4 px-1.5 inline-flex items-center gap-1">
                                  <Zap className="h-2.5 w-2.5" /> Urgente
                                </Badge>
                              )}
                            </div>

                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                              <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                                <Calendar className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400 shrink-0 stroke-[2.5]" />
                                <span className="font-extrabold text-slate-900 dark:text-white">Recibida:</span>
                                <span className="font-bold">{formatDateRD(orden.creado_en)}</span>
                              </span>
                              {orden.fecha_entrega && (
                                <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                                  <Truck className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400 shrink-0 stroke-[2.5]" />
                                  <span className="font-extrabold text-slate-900 dark:text-white">Entrega:</span>
                                  <span className="font-bold">{formatDateRD(orden.fecha_entrega)}</span>
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700 text-xs">
                                <Shirt className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400 shrink-0 stroke-[2]" />
                                <span>{totalPrendas} {totalPrendas === 1 ? "prenda" : "prendas"}</span>
                              </span>
                              <span className="font-bold text-foreground tabular-nums">
                                Total: {formatRD(orden.total)}
                              </span>
                              {orden.saldo > 0 ? (
                                <span className="text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900 text-[11px] tabular-nums">
                                  Debe: {formatRD(orden.saldo)}
                                </span>
                              ) : (
                                <span className="text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900 text-[11px]">
                                  Saldada
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botones de Acción */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 w-full sm:w-auto justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isOpeningOrder}
                            className="h-8 px-3 text-xs font-bold rounded-xl gap-1.5 cursor-pointer shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800"
                            onClick={() => handleOpenGlobalOrder(orden, tenant, "view")}
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" /> Ver
                          </Button>
                          <Button
                            size="sm"
                            disabled={isOpeningOrder}
                            className="h-8 px-3.5 text-xs font-bold rounded-xl gap-1.5 bg-primary hover:bg-primary/90 text-white cursor-pointer shadow-2xs"
                            onClick={() => handleOpenGlobalOrder(orden, tenant, "edit")}
                          >
                            <Pencil className="h-3.5 w-3.5" /> Editar
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Barra de Filtros de Sucursal */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-surface p-3.5 sm:p-4 rounded-2xl border border-border/50 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar sucursales por nombre, correo, RNC o subdominio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 rounded-xl bg-background border-border/80 text-sm focus-visible:ring-primary/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-muted/50 border border-border/60 rounded-xl p-1 shrink-0 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${statusFilter === "all" ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Todas ({myTenants.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("ACTIVO")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${statusFilter === "ACTIVO" ? "bg-emerald-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Activas ({myTenants.filter(t => t.estado === "ACTIVO").length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("TRIAL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${statusFilter === "TRIAL" ? "bg-amber-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Pruebas ({myTenants.filter(t => t.estado === "TRIAL").length})
                </button>
              </div>
            </div>
          </div>

          {/* VISTA ESCRITORIO (Tabla completa con diseño optimizado) */}
          <Card className="hidden md:block overflow-hidden border border-border/60 shadow-card rounded-2xl bg-surface">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="relative z-10 text-[10.5px] uppercase tracking-wider font-black shadow-[0_4px_12px_-2px_rgba(0,0,0,0.06)] border-b border-border/80">
                  <tr>
                    <th className="px-3.5 py-3 text-left whitespace-nowrap bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200/70 dark:from-slate-800 dark:via-slate-800 dark:to-slate-850 text-slate-800 dark:text-slate-200">
                      Lavandería / Sucursal
                    </th>
                    <th className="px-2 py-3 text-center whitespace-nowrap bg-gradient-to-b from-blue-50 via-blue-100/90 to-blue-200/60 dark:from-blue-950/70 dark:via-blue-950/90 dark:to-blue-900/60 text-blue-950 dark:text-blue-200 border-x border-blue-200/50 dark:border-blue-800/40">
                      Plan SaaS
                    </th>
                    <th className="px-2 py-3 text-center whitespace-nowrap bg-gradient-to-b from-emerald-50 via-emerald-100/90 to-emerald-200/60 dark:from-emerald-950/70 dark:via-emerald-950/90 dark:to-emerald-900/60 text-emerald-950 dark:text-emerald-200 border-r border-emerald-200/50 dark:border-emerald-800/40">
                      Estado
                    </th>
                    <th className="px-2 py-3 text-center whitespace-nowrap bg-gradient-to-b from-purple-50 via-purple-100/90 to-purple-200/60 dark:from-purple-950/70 dark:via-purple-950/90 dark:to-purple-900/60 text-purple-950 dark:text-purple-200 border-r border-purple-200/50 dark:border-purple-800/40">
                      Módulos Activos
                    </th>
                    <th className="px-2 py-3 text-center whitespace-nowrap bg-gradient-to-b from-cyan-50 via-cyan-100/90 to-cyan-200/60 dark:from-cyan-950/70 dark:via-cyan-950/90 dark:to-cyan-900/60 text-cyan-950 dark:text-cyan-200 border-r border-cyan-200/50 dark:border-cyan-800/40">
                      Órdenes
                    </th>
                    <th className="px-2.5 py-3 text-center whitespace-nowrap bg-gradient-to-b from-amber-50 via-amber-100/90 to-amber-200/60 dark:from-amber-950/70 dark:via-amber-950/90 dark:to-amber-900/60 text-amber-950 dark:text-amber-200 border-r border-amber-200/50 dark:border-amber-800/40">
                      Facturación
                    </th>
                    <th className="px-3 py-3 text-center whitespace-nowrap bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200/70 dark:from-slate-800 dark:via-slate-800 dark:to-slate-850 text-slate-800 dark:text-slate-200">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-muted-foreground">
                        <Building2 className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                        <p className="text-base font-semibold text-foreground">No se encontraron lavanderías</p>
                        <p className="text-xs text-muted-foreground mt-1">Prueba a cambiar el filtro de búsqueda o el estado.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((t) => {
                      const ts = tenantStats[t.id] || { count: 0, total: 0 };
                      const planOfTenant = plans.find(p => p.id === t.plan_id);
                      
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

                      const daysRemaining = t.trial_hasta
                        ? Math.max(0, Math.ceil((new Date(t.trial_hasta).getTime() - Date.now()) / 86400000))
                        : 0;

                      return (
                        <tr 
                          key={t.id} 
                          className="hover:bg-muted/30 transition-colors border-b border-border/40"
                        >
                          <td className="px-3.5 py-2.5">
                            <div
                              onClick={() => navigate({ to: "/reportes", search: { tenantId: t.id } })}
                              className="flex items-center gap-2.5 cursor-pointer group"
                              title="Haz clic para ver reportes y operativa de esta sucursal"
                            >
                              {t.logo_url ? (
                                <img
                                  src={t.logo_url}
                                  alt={t.nombre}
                                  className="h-10 w-10 rounded-full object-contain border-2 border-border/70 bg-white p-0.5 shrink-0 shadow-xs ring-2 ring-primary/10 group-hover:ring-primary/50 transition-all"
                                />
                              ) : (
                                <div
                                  className="h-10 w-10 rounded-full flex items-center justify-center font-black text-white text-sm shrink-0 shadow-xs ring-2 ring-black/10 dark:ring-white/10 group-hover:scale-105 transition-all"
                                  style={{ backgroundColor: t.color_primario || "#0891b2" }}
                                >
                                  {t.nombre.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-bold text-foreground text-[13px] tracking-tight group-hover:text-primary transition-colors flex items-center gap-1.5 flex-wrap">
                                  <span className="truncate underline-offset-2 group-hover:underline">{t.nombre}</span>
                                  <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.2 rounded-md border border-emerald-200/60 dark:border-emerald-800/60 shadow-2xs">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    {getTenantBranchName(t)}
                                  </span>
                                </div>
                                <div className="text-[10.5px] text-muted-foreground mt-0.5 space-y-0.2">
                                  <div className="truncate">
                                    <span className="font-medium text-foreground/80">Correo:</span> {t.email || "Sin correo"}
                                  </div>
                                  <div className="truncate">
                                    <span className="font-medium text-foreground/80">Teléfono:</span> {t.telefono || "Sin teléfono"}
                                  </div>
                                  <div className="flex items-center gap-1.5 pt-0.2">
                                    <span className="font-medium text-foreground/80">RNC:</span>
                                    {t.rnc ? (
                                      <Badge className="bg-primary hover:bg-primary text-primary-foreground text-[9.5px] font-bold px-1.5 py-0 rounded-md border-none shadow-2xs">
                                        {t.rnc}
                                      </Badge>
                                    ) : (
                                      <span className="italic text-muted-foreground/60 text-[10px]">Sin RNC</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-2 py-2.5 text-center whitespace-nowrap bg-blue-500/[0.015] border-r border-border/20">
                            <PlanBadge id={t.plan_id} />
                          </td>

                          <td className="px-2 py-2.5 text-center whitespace-nowrap bg-emerald-500/[0.015] border-r border-border/20">
                            {t.estado === "ACTIVO" ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full gap-1 shadow-2xs">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Activo
                                </Badge>
                                {(() => {
                                  const isAuto = t.auto_renovacion !== undefined
                                    ? t.auto_renovacion
                                    : (t.config?.auto_renovacion !== undefined ? t.config.auto_renovacion : true);
                                  if (isAuto) {
                                    const nextRen = getNextRenewalDate(t.plan_fecha_inicio || t.config?.plan_fecha_inicio || t.creado_en);
                                    return (
                                      <span className="text-[9.5px] text-emerald-700/90 dark:text-emerald-400 font-bold flex items-center gap-0.5" title={`Renovación Automática. Próximo corte: ${nextRen.toLocaleDateString("es-DO")}`}>
                                        <RefreshCw className="h-2.5 w-2.5 text-emerald-600" />
                                        {nextRen.toLocaleDateString("es-DO")}
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="text-[9.5px] text-muted-foreground font-medium">
                                      {daysRemaining}d vigencia
                                    </span>
                                  );
                                })()}
                              </div>
                            ) : t.estado === "TRIAL" ? (
                              <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full gap-1 shadow-2xs">
                                <Clock className="h-3 w-3 text-amber-600" /> Prueba ({daysRemaining}d)
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full gap-1 shadow-2xs">
                                <AlertCircle className="h-3 w-3 text-rose-600" /> Inactivo
                              </Badge>
                            )}
                          </td>

                          <td className="px-2 py-2.5 text-center whitespace-nowrap bg-purple-500/[0.015] border-r border-border/20">
                            <div className="flex items-center justify-center gap-0.5">
                              <span
                                title={hasWa ? "WhatsApp Cloud: Habilitado" : "WhatsApp: Inactivo"}
                                className={`p-1 rounded-md transition-all ${
                                  hasWa
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700 shadow-2xs"
                                    : "bg-muted/30 text-muted-foreground/30 border border-transparent opacity-30"
                                }`}
                              >
                                <MessageSquare className="h-3 w-3" />
                              </span>
                              <span
                                title={hasFiscal ? "Facturación Fiscal (e-CF): Habilitada" : "Facturación Fiscal: Inactiva"}
                                className={`p-1 rounded-md transition-all ${
                                  hasFiscal
                                    ? "bg-blue-50 text-blue-700 border border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-700 shadow-2xs"
                                    : "bg-muted/30 text-muted-foreground/30 border border-transparent opacity-30"
                                }`}
                              >
                                <FileText className="h-3 w-3" />
                              </span>
                              <span
                                title={hasSucursales ? "Sucursales Múltiples: Habilitadas" : "Sucursales: Inactivas"}
                                className={`p-1 rounded-md transition-all ${
                                  hasSucursales
                                    ? "bg-purple-50 text-purple-700 border border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-700 shadow-2xs"
                                    : "bg-muted/30 text-muted-foreground/30 border border-transparent opacity-30"
                                }`}
                              >
                                <Building2 className="h-3 w-3" />
                              </span>
                              <span
                                title={hasLogistica ? "Envío a Domicilio: Habilitado" : "Logística: Inactiva"}
                                className={`p-1 rounded-md transition-all ${
                                  hasLogistica
                                    ? "bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700 shadow-2xs"
                                    : "bg-muted/30 text-muted-foreground/30 border border-transparent opacity-30"
                                }`}
                              >
                                <Truck className="h-3 w-3" />
                              </span>
                              <span
                                title={hasProcesos ? "Tablero Kanban de Procesos: Habilitado" : "Procesos: Inactivo"}
                                className={`p-1 rounded-md transition-all ${
                                  hasProcesos
                                    ? "bg-teal-50 text-teal-700 border border-teal-300 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-700 shadow-2xs"
                                    : "bg-muted/30 text-muted-foreground/30 border border-transparent opacity-30"
                                }`}
                              >
                                <Wrench className="h-3 w-3" />
                              </span>
                              <span
                                title={hasEstanteria ? "Estantería Virtual: Habilitada" : "Estantería: Inactiva"}
                                className={`p-1 rounded-md transition-all ${
                                  hasEstanteria
                                    ? "bg-indigo-50 text-indigo-700 border border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-700 shadow-2xs"
                                    : "bg-muted/30 text-muted-foreground/30 border border-transparent opacity-30"
                                }`}
                              >
                                <Layers className="h-3 w-3" />
                              </span>
                            </div>
                          </td>

                          <td className="px-2 py-2.5 text-center whitespace-nowrap bg-cyan-500/[0.015] border-r border-border/20">
                            <span className="font-bold text-xs text-foreground">{ts.count.toLocaleString("es-DO")}</span>
                            <span className="text-[9.5px] text-muted-foreground block">órdenes</span>
                          </td>

                          <td className="px-2.5 py-2.5 text-center whitespace-nowrap bg-amber-500/[0.015] border-r border-border/20">
                            <span className="font-extrabold text-xs text-foreground block">{formatRD(ts.total)}</span>
                            <span className="text-[9.5px] text-muted-foreground block">Fact: {formatRD((ts as any).facturado ?? ts.total)}</span>
                          </td>

                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => navigate({ to: "/reportes", search: { tenantId: t.id } })}
                                className="h-8 px-3 rounded-full font-bold text-xs bg-[#1B4B73] hover:bg-[#153a5b] text-white border-0 shadow-2xs gap-1.5 cursor-pointer transition-all"
                                title="Inspeccionar reportes y operativa de la sucursal"
                              >
                                <Eye className="h-3.5 w-3.5 text-white" />
                                <span>Inspeccionar</span>
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => handleManage(t.id, t.slug)}
                                className="h-8 px-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border border-emerald-500/80 shadow-2xs gap-1 cursor-pointer transition-all"
                                title="Entrar al panel interno de esta sucursal"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>Entrar</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* VISTA MÓVIL (Tarjetas estilizadas idénticas a /admin) */}
          <div className="grid gap-3.5 md:hidden">
            {filteredTenants.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground rounded-2xl">
                <Building2 className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="font-semibold text-foreground text-sm">No se encontraron lavanderías</p>
                <p className="text-xs text-muted-foreground mt-0.5">Prueba con otro término de búsqueda.</p>
              </Card>
            ) : (
              filteredTenants.map((t) => {
                const ts = tenantStats[t.id] || { count: 0, total: 0 };
                const planOfTenant = plans.find(p => p.id === t.plan_id);
                const hasWa = t.config?.modulos_override?.whatsapp !== undefined ? t.config.modulos_override.whatsapp : !!planOfTenant?.modulos?.whatsapp;
                const hasFiscal = t.config?.modulos_override?.facturacion_fiscal !== undefined ? t.config.modulos_override.facturacion_fiscal : !!planOfTenant?.modulos?.facturacion_fiscal;
                const hasSucursales = t.config?.modulos_override?.multisucursal !== undefined ? t.config.modulos_override.multisucursal : ((t.max_sucursales || 1) > 1 || !!planOfTenant?.modulos?.multisucursal);
                const hasLogistica = t.config?.modulos_override?.logistica !== undefined ? t.config.modulos_override.logistica : !!planOfTenant?.modulos?.logistica;
                const hasProcesos = t.config?.modulos_override?.procesos !== undefined ? t.config.modulos_override.procesos : (planOfTenant?.modulos?.procesos !== undefined ? !!planOfTenant.modulos.procesos : true);
                const hasEstanteria = t.config?.modulos_override?.estanteria !== undefined ? t.config.modulos_override.estanteria : (planOfTenant?.modulos?.estanteria !== undefined ? !!planOfTenant.modulos.estanteria : true);

                const daysRemaining = t.trial_hasta
                  ? Math.max(0, Math.ceil((new Date(t.trial_hasta).getTime() - Date.now()) / 86400000))
                  : 0;

                return (
                  <Card 
                    key={t.id} 
                    className="p-4 rounded-2xl border border-border/70 shadow-xs bg-surface"
                  >
                    <div 
                      onClick={() => navigate({ to: "/reportes", search: { tenantId: t.id } })}
                      className="flex items-start gap-3 cursor-pointer group"
                      title="Toca para ver reportes y operativa de esta sucursal"
                    >
                      {t.logo_url ? (
                        <img
                          src={t.logo_url}
                          alt={t.nombre}
                          className="h-12 w-12 rounded-full object-contain border-2 border-border/70 bg-white p-1 shrink-0 shadow-xs group-hover:ring-2 group-hover:ring-primary/40 transition-all"
                        />
                      ) : (
                        <div
                          className="h-12 w-12 rounded-full flex items-center justify-center font-black text-white text-base shrink-0 shadow-xs group-hover:scale-105 transition-all"
                          style={{ backgroundColor: t.color_primario || "#0891b2" }}
                        >
                          {t.nombre.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors underline-offset-2 group-hover:underline">{t.nombre}</h3>
                          {t.estado === "ACTIVO" ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                                Activo
                              </Badge>
                              {(() => {
                                const isAuto = t.auto_renovacion !== undefined
                                  ? t.auto_renovacion
                                  : (t.config?.auto_renovacion !== undefined ? t.config.auto_renovacion : true);
                                if (isAuto) {
                                  const nextRen = getNextRenewalDate(t.plan_fecha_inicio || t.config?.plan_fecha_inicio || t.creado_en);
                                  return (
                                    <span className="text-[9.5px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5" title={`Próxima renovación: ${nextRen.toLocaleDateString("es-DO")}`}>
                                      <RefreshCw className="h-2.5 w-2.5 text-emerald-600" />
                                      {nextRen.toLocaleDateString("es-DO")}
                                    </span>
                                  );
                                }
                                return (
                                  <span className="text-[9.5px] text-muted-foreground font-medium">
                                    {daysRemaining}d
                                  </span>
                                );
                              })()}
                            </div>
                          ) : t.estado === "TRIAL" ? (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                              Prueba ({daysRemaining}d)
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                              Inactivo
                            </Badge>
                          )}
                        </div>

                        <div className="text-[11px] text-muted-foreground mt-0.5 space-y-0.5">
                          <div className="truncate"><span className="font-medium text-foreground/80">Correo:</span> {t.email || "Sin correo"}</div>
                          <div className="truncate"><span className="font-medium text-foreground/80">Teléfono:</span> {t.telefono || "Sin teléfono"}</div>
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <span className="font-medium text-foreground/80">RNC:</span>
                            {t.rnc ? (
                              <Badge className="bg-primary hover:bg-primary text-primary-foreground text-[9.5px] font-bold px-1.5 py-0 rounded-md border-none shadow-2xs">{t.rnc}</Badge>
                            ) : (
                              <span className="italic text-muted-foreground/60 text-[10px]">Sin RNC</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Métricas y Módulos Móvil */}
                    <div className="mt-3 pt-2.5 border-t border-border/50 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-blue-500/[0.04] p-2.5 rounded-xl border border-blue-500/10">
                        <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 block mb-1">Plan & Módulos</span>
                        <div className="flex items-center gap-1 flex-wrap">
                          <PlanBadge id={t.plan_id} />
                        </div>
                        <div className="flex items-center gap-1 mt-1.5">
                          <span className={`p-1 rounded ${hasWa ? 'text-emerald-600 bg-emerald-50' : 'text-muted-foreground/30 opacity-40'}`}><MessageSquare className="h-3 w-3" /></span>
                          <span className={`p-1 rounded ${hasFiscal ? 'text-blue-600 bg-blue-50' : 'text-muted-foreground/30 opacity-40'}`}><FileText className="h-3 w-3" /></span>
                          <span className={`p-1 rounded ${hasSucursales ? 'text-purple-600 bg-purple-50' : 'text-muted-foreground/30 opacity-40'}`}><Building2 className="h-3 w-3" /></span>
                          <span className={`p-1 rounded ${hasLogistica ? 'text-amber-600 bg-amber-50' : 'text-muted-foreground/30 opacity-40'}`}><Truck className="h-3 w-3" /></span>
                          <span className={`p-1 rounded ${hasProcesos ? 'text-teal-600 bg-teal-50' : 'text-muted-foreground/30 opacity-40'}`}><Wrench className="h-3 w-3" /></span>
                          <span className={`p-1 rounded ${hasEstanteria ? 'text-indigo-600 bg-indigo-50' : 'text-muted-foreground/30 opacity-40'}`}><Layers className="h-3 w-3" /></span>
                        </div>
                      </div>

                      <div className="bg-amber-500/[0.04] p-2.5 rounded-xl border border-amber-500/10 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 block mb-0.5">Facturación</span>
                          <div className="font-bold text-foreground text-xs">{formatRD(ts.total)}</div>
                        </div>
                        <div className="text-[10.5px] text-muted-foreground font-medium mt-1">
                          {ts.count} órdenes
                        </div>
                      </div>
                    </div>

                    {/* Botones de acción móvil */}
                    <div className="mt-3 pt-2.5 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        onClick={() => navigate({ to: "/reportes", search: { tenantId: t.id } })}
                        className="flex-1 h-8 rounded-full font-bold text-xs bg-[#1B4B73] hover:bg-[#153a5b] text-white border-0 shadow-2xs gap-1.5 cursor-pointer transition-all"
                        title="Inspeccionar reportes y operativa"
                      >
                        <Eye className="h-3.5 w-3.5 text-white" />
                        <span>Inspeccionar</span>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleManage(t.id, t.slug)}
                        className="flex-1 h-8 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Entrar</span>
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
      )}

        {/* ======================================================== */}
        {/* PESTAÑA: CONSOLIDADO FINANCIERO MULTISEDE ("SANTO GRIAL") */}
        {/* ======================================================== */}
        {activeTab === "consolidado" && (
          <div className="mt-6 space-y-6">
            {/* Barra de Filtro de Periodo y Selección de Rango */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-surface p-3.5 sm:p-4 rounded-2xl border border-border/60 shadow-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-muted-foreground uppercase tracking-wider mr-1">Periodo:</span>
                {(["HOY", "7D", "ESTE_MES", "MES_ANTERIOR", "TODO", "CUSTOM"] as const).map((p) => {
                  const labels: Record<string, string> = {
                    HOY: "Hoy",
                    "7D": "7 Días",
                    ESTE_MES: "Este Mes",
                    MES_ANTERIOR: "Mes Anterior",
                    TODO: "Histórico",
                    CUSTOM: "Personalizado",
                  };
                  const isActive = periodo === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPeriodo(p)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? "bg-[#1B4B73] text-white shadow-xs"
                          : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      {labels[p]}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {periodo === "CUSTOM" && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                      <span>Desde:</span>
                      <DMYDatePicker
                        value={fechaDesde}
                        onChange={setFechaDesde}
                        placeholder="DD/MM/AAAA"
                        className="h-8.5 text-xs w-36 rounded-xl bg-background border-border/80 shadow-2xs"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                      <span>Hasta:</span>
                      <DMYDatePicker
                        value={fechaHasta}
                        onChange={setFechaHasta}
                        placeholder="DD/MM/AAAA"
                        className="h-8.5 text-xs w-36 rounded-xl bg-background border-border/80 shadow-2xs"
                      />
                    </div>
                  </div>
                )}

                <Badge variant="outline" className="text-xs font-bold px-3 py-1 rounded-xl bg-blue-50/50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/80">
                  <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                  {getPeriodoLabel(periodo, fechaDesde, fechaHasta)}
                </Badge>
              </div>
            </div>

            {/* 4 KPIs Consolidados de la Cadena */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <KPI 
                title="Ingresos Cobrados Cadena" 
                value={formatRD(consolidadoData.cadenaCobrado)} 
                sub={`Facturado: ${formatRD(consolidadoData.cadenaFacturado)} • ${consolidadoData.cadenaOrdenes} órdenes`} 
                icon={TrendingUp} 
                variant="emerald" 
              />
              <KPI 
                title="Gastos Operativos Cadena" 
                value={formatRD(consolidadoData.cadenaGastos)} 
                sub={`${consolidadoData.cadenaTotalGastosCount} gastos registrados en periodo`} 
                icon={Receipt} 
                variant="rose" 
              />
              <KPI 
                title="Utilidad Neta Cadena" 
                value={formatRD(consolidadoData.cadenaUtilidad)} 
                sub={`Margen Neto: ${consolidadoData.cadenaMargen.toFixed(1)}% ${consolidadoData.cadenaUtilidad >= 0 ? "Ganancia" : "Déficit"}`} 
                icon={PiggyBank} 
                variant={consolidadoData.cadenaUtilidad >= 0 ? "emerald" : "rose"} 
              />
              <KPI 
                title="Clientes Activos Cadena" 
                value={`${consolidadoData.cadenaClientesActivos.toLocaleString("es-DO")}`} 
                sub={`Gasto prom.: ${formatRD(consolidadoData.cadenaTicketCliente)} / cli • ${consolidadoData.cadenaTotalCartera} en cartera`} 
                icon={Users} 
                variant="indigo" 
              />
            </div>

            {/* 2 Tarjetas Secundarias: Cuentas por Cobrar (CXC) y Cuentas por Pagar (CXP) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <Card className="p-4 rounded-2xl border border-sky-200/60 dark:border-sky-900/40 bg-sky-50/30 dark:bg-sky-950/20 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-sky-800 dark:text-sky-300">
                    <Wallet className="h-3.5 w-3.5 text-sky-600" />
                    <span>Por Cobrar a Clientes (CXC Cadena)</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-display font-black text-foreground">
                    {formatRD(consolidadoData.cadenaCXCTotal)}
                  </div>
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    Pendiente en órdenes del periodo: <span className="font-bold text-foreground">{formatRD(consolidadoData.cadenaCXCPeriodo)}</span>
                  </p>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </Card>

              <Card className="p-4 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    <Receipt className="h-3.5 w-3.5 text-amber-600" />
                    <span>Por Pagar a Proveedores (CXP Cadena)</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-display font-black text-foreground">
                    {formatRD(consolidadoData.cadenaCXP)}
                  </div>
                  <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    {consolidadoData.cadenaCXPVencidas > 0 ? (
                      <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {consolidadoData.cadenaCXPVencidas} factura{consolidadoData.cadenaCXPVencidas > 1 ? "s" : ""} vencida{consolidadoData.cadenaCXPVencidas > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-bold">100% al día con proveedores</span>
                    )}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                  <CreditCard className="h-5 w-5" />
                </div>
              </Card>
            </div>

            {/* Filtro y Búsqueda de Sucursal en la Tabla Comparativa */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3.5 rounded-2xl border border-border/60 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-foreground tracking-tight">Tabla Comparativa por Sucursal</h2>
                  <p className="text-[11px] text-muted-foreground">Desglose financiero y de clientes de cada sede en el periodo seleccionado</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <BranchSelect
                  tenants={myTenants}
                  value={filtroSucursalConsolidado}
                  onChange={setFiltroSucursalConsolidado}
                  className="w-full sm:w-[250px]"
                />

                <div className="relative w-full sm:w-48 lg:w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Filtrar sucursal..." 
                    value={busquedaConsolidado}
                    onChange={(e) => setBusquedaConsolidado(e.target.value)}
                    className="pl-8 h-10 sm:h-11 text-xs rounded-2xl bg-background"
                  />
                </div>

                {/* Dropdown de Exportar a Excel con el diseño idéntico a /reportes */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 h-10 sm:h-11 px-3.5 rounded-2xl font-bold border-border/80 bg-white dark:bg-slate-900 hover:bg-muted text-xs cursor-pointer shadow-2xs shrink-0">
                      <Download className="h-3.5 w-3.5 text-primary" />
                      <span>Exportar</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 rounded-2xl shadow-2xl p-2 bg-white dark:bg-slate-900 border border-border/80 text-foreground space-y-1">
                    <div className="px-2.5 py-1.5 border-b border-border/50">
                      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Exportación Ejecutiva Excel</p>
                      <p className="text-xs font-bold text-foreground truncate">
                        Consolidado Multisede: <span className="text-primary font-black">{getPeriodoLabel(periodo, fechaDesde, fechaHasta)}</span>
                      </p>
                    </div>

                    <div className="pt-1">
                      <p className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Consolidado por Sucursal</p>
                      <DropdownMenuItem
                        className="gap-2.5 cursor-pointer py-2 px-2.5 rounded-xl text-xs font-bold hover:bg-emerald-50 hover:text-emerald-900 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300 transition-colors"
                        onClick={() => handleExportConsolidadoExcel(false)}
                      >
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate">Exportar con filtro actual</span>
                          <span className="text-[10px] text-muted-foreground font-normal truncate">
                            {filtroSucursalConsolidado === "ALL" ? "Todas las sucursales" : myTenants.find(t => t.id === filtroSucursalConsolidado)?.nombre || "Sucursal"} ({getPeriodoLabel(periodo, fechaDesde, fechaHasta)})
                          </span>
                        </div>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        className="gap-2.5 cursor-pointer py-2 px-2.5 rounded-xl text-xs font-bold hover:bg-emerald-50 hover:text-emerald-900 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300 transition-colors"
                        onClick={() => handleExportConsolidadoExcel(true)}
                      >
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate">Exportar todo el histórico</span>
                          <span className="text-[10px] text-muted-foreground font-normal">Sin restricción de fecha ni filtro</span>
                        </div>
                      </DropdownMenuItem>
                    </div>

                    <DropdownMenuSeparator className="my-1" />

                    <div>
                      <p className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Proveedores (CXP)</p>
                      <DropdownMenuItem
                        className="gap-2.5 cursor-pointer py-2 px-2.5 rounded-xl text-xs font-bold hover:bg-amber-50 hover:text-amber-900 dark:hover:bg-amber-950/50 dark:hover:text-amber-300 transition-colors"
                        onClick={handleExportCXPExcel}
                      >
                        <Download className="h-4 w-4 text-amber-600 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate">Exportar Cuentas por Pagar (CXP)</span>
                          <span className="text-[10px] text-muted-foreground font-normal">Facturas de suplidores de la red</span>
                        </div>
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Tabla Comparativa Desktop ("El Santo Grial del Dueño") */}
            <Card className="hidden lg:block overflow-hidden border border-border/70 shadow-md rounded-2xl bg-surface">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-xs">
                  <thead className="relative z-10 text-[10px] uppercase tracking-wider font-black shadow-[0_4px_12px_-2px_rgba(0,0,0,0.06)] border-b border-border/80">
                    <tr>
                      <th className="px-3.5 py-3 text-left whitespace-nowrap bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200/70 dark:from-slate-800 dark:via-slate-800 dark:to-slate-850 text-slate-800 dark:text-slate-200">
                        Sucursal / Sede
                      </th>
                      <th className="px-3 py-3 text-center whitespace-nowrap bg-gradient-to-b from-blue-50 via-blue-100/90 to-blue-200/60 dark:from-blue-950/70 dark:via-blue-950/90 dark:to-blue-900/60 text-blue-950 dark:text-blue-200 border-x border-blue-200/50">
                        Clientes Activos
                      </th>
                      <th className="px-3 py-3 text-right whitespace-nowrap bg-gradient-to-b from-emerald-50 via-emerald-100/90 to-emerald-200/60 dark:from-emerald-950/70 dark:via-emerald-950/90 dark:to-emerald-900/60 text-emerald-950 dark:text-emerald-200 border-r border-emerald-200/50">
                        Cobrado (Flujo)
                      </th>
                      <th className="px-3 py-3 text-right whitespace-nowrap bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200/70 dark:from-slate-800 text-slate-800 dark:text-slate-200 border-r border-border/40">
                        Facturado
                      </th>
                      <th className="px-3 py-3 text-right whitespace-nowrap bg-gradient-to-b from-rose-50 via-rose-100/90 to-rose-200/60 dark:from-rose-950/70 dark:via-rose-950/90 dark:to-rose-900/60 text-rose-950 dark:text-rose-200 border-r border-rose-200/50">
                        Gastos
                      </th>
                      <th className="px-3 py-3 text-right whitespace-nowrap bg-gradient-to-b from-teal-50 via-teal-100/90 to-teal-200/60 dark:from-teal-950/70 dark:via-teal-950/90 dark:to-teal-900/60 text-teal-950 dark:text-teal-200 border-r border-teal-200/50">
                        Utilidad Neta
                      </th>
                      <th className="px-2.5 py-3 text-center whitespace-nowrap bg-gradient-to-b from-purple-50 via-purple-100/90 to-purple-200/60 dark:from-purple-950/70 text-purple-950 dark:text-purple-200 border-r border-purple-200/50">
                        Margen %
                      </th>
                      <th className="px-3 py-3 text-right whitespace-nowrap bg-gradient-to-b from-indigo-50 via-indigo-100/90 to-indigo-200/60 dark:from-indigo-950/70 text-indigo-950 dark:text-indigo-200 border-r border-indigo-200/50">
                        Ticket / Cliente
                      </th>
                      <th className="px-2 py-3 text-center whitespace-nowrap bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200/70 dark:from-slate-800 text-slate-800 dark:text-slate-200 border-r border-border/40">
                        Órdenes
                      </th>
                      <th className="px-3 py-3 text-right whitespace-nowrap bg-gradient-to-b from-sky-50 via-sky-100/90 to-sky-200/60 dark:from-sky-950/70 text-sky-950 dark:text-sky-200 border-r border-sky-200/50">
                        CXC (Cobrar)
                      </th>
                      <th className="px-3 py-3 text-right whitespace-nowrap bg-gradient-to-b from-amber-50 via-amber-100/90 to-amber-200/60 dark:from-amber-950/70 text-amber-950 dark:text-amber-200 border-r border-amber-200/50">
                        CXP (Pagar)
                      </th>
                      <th className="px-3 py-3 text-center whitespace-nowrap bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200/70 dark:from-slate-800 text-slate-800 dark:text-slate-200">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {sucursalesFiltradasConsolidado.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="p-8 text-center text-muted-foreground">
                          No se encontraron sucursales para el filtro actual.
                        </td>
                      </tr>
                    ) : (
                      sucursalesFiltradasConsolidado.map((item) => {
                        const t = item.tenant;
                        const tieneGanancia = item.utilidadNeta >= 0;
                        return (
                          <tr key={item.tenantId} className="hover:bg-muted/40 transition-colors">
                            {/* Sucursal */}
                            <td className="px-3.5 py-3">
                              <div className="flex items-center gap-2.5">
                                {t.logo_url ? (
                                  <img
                                    src={t.logo_url}
                                    alt=""
                                    className="h-8 w-8 rounded-full object-contain border border-border bg-white p-0.5 shrink-0 shadow-2xs"
                                  />
                                ) : (
                                  <div
                                    className="h-8 w-8 rounded-full flex items-center justify-center font-black text-white text-xs shrink-0 shadow-2xs"
                                    style={{ backgroundColor: t.color_primario || "#0891b2" }}
                                  >
                                    {t.nombre.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="font-bold text-foreground text-xs truncate flex items-center gap-1.5">
                                    <span>{t.nombre}</span>
                                    <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded-md border border-emerald-200/60">
                                      {getTenantBranchName(t)}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    {t.rnc ? `RNC: ${t.rnc}` : t.email || t.slug}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Clientes Activos */}
                            <td className="px-3 py-3 text-center">
                              <div className="font-black text-xs text-foreground">
                                {item.clientesActivos}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                de {item.totalCartera} cartera
                              </div>
                            </td>

                            {/* Cobrado */}
                            <td className="px-3 py-3 text-right">
                              <div className="font-black text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
                                {formatRD(item.ingresosCobrados)}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                flujo real
                              </div>
                            </td>

                            {/* Facturado */}
                            <td className="px-3 py-3 text-right">
                              <div className="font-bold text-xs text-foreground tabular-nums">
                                {formatRD(item.facturado)}
                              </div>
                            </td>

                            {/* Gastos */}
                            <td className="px-3 py-3 text-right">
                              <div className="font-bold text-xs text-rose-600 dark:text-rose-400 tabular-nums">
                                {formatRD(item.totalGastos)}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {item.gastosCount} reg.
                              </div>
                            </td>

                            {/* Utilidad Neta */}
                            <td className="px-3 py-3 text-right">
                              <div className={`font-black text-xs tabular-nums ${tieneGanancia ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                {formatRD(item.utilidadNeta)}
                              </div>
                            </td>

                            {/* Margen % */}
                            <td className="px-2.5 py-3 text-center">
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                  tieneGanancia 
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800" 
                                    : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800"
                                }`}
                              >
                                {tieneGanancia ? <TrendingUp className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                <span>{item.margenPct.toFixed(1)}%</span>
                              </Badge>
                            </td>

                            {/* Ticket Promedio */}
                            <td className="px-3 py-3 text-right">
                              <div className="font-bold text-xs text-foreground tabular-nums">
                                {formatRD(item.ticketPromedioCliente)}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                por cliente
                              </div>
                            </td>

                            {/* Órdenes */}
                            <td className="px-2 py-3 text-center">
                              <span className="font-black text-xs text-foreground">
                                {item.ordenesCount}
                              </span>
                            </td>

                            {/* CXC */}
                            <td className="px-3 py-3 text-right">
                              <div className="font-bold text-xs text-sky-700 dark:text-sky-300 tabular-nums">
                                {formatRD(item.porCobrarTotal)}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                per.: {formatRD(item.porCobrarPeriodo)}
                              </div>
                            </td>

                            {/* CXP */}
                            <td className="px-3 py-3 text-right">
                              <div className="font-bold text-xs text-amber-700 dark:text-amber-300 tabular-nums">
                                {formatRD(item.cxpPendiente)}
                              </div>
                              {item.cxpVencidas > 0 && (
                                <div className="text-[9.5px] font-bold text-rose-600 dark:text-rose-400">
                                  {item.cxpVencidas} vencida{item.cxpVencidas > 1 ? "s" : ""}
                                </div>
                              )}
                            </td>

                            {/* Acciones */}
                            <td className="px-3 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate({ to: "/reportes", search: { tenantId: t.id } })}
                                  className="h-7 px-2 text-[11px] font-bold rounded-lg cursor-pointer shadow-2xs"
                                  title="Inspeccionar reportes y cierre de caja"
                                >
                                  <Eye className="h-3 w-3 mr-1 text-slate-600 dark:text-slate-300" />
                                  Ver
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleManage(t.id, t.slug)}
                                  className="h-7 px-2 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs"
                                  title="Entrar a esta sucursal"
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Entrar
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>

                  {/* TOTAL CONSOLIDADO RED (Fila Destacada Santo Grial) */}
                  <tfoot className="bg-slate-900 text-white dark:bg-slate-950 border-t-2 border-slate-700 shadow-md">
                    <tr className="font-bold text-xs">
                      <td className="px-3.5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs">
                            Σ
                          </div>
                          <div>
                            <div className="font-black text-xs tracking-tight text-white uppercase">
                              TOTAL CONSOLIDADO RED
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {consolidadoData.sucursales.length} Lavanderías Activas
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3.5 text-center text-white">
                        <div className="font-black text-xs">
                          {consolidadoData.cadenaClientesActivos.toLocaleString("es-DO")}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          de {consolidadoData.cadenaTotalCartera} total
                        </div>
                      </td>

                      <td className="px-3 py-3.5 text-right text-emerald-400 font-black text-xs tabular-nums">
                        {formatRD(consolidadoData.cadenaCobrado)}
                      </td>

                      <td className="px-3 py-3.5 text-right text-slate-200 font-bold text-xs tabular-nums">
                        {formatRD(consolidadoData.cadenaFacturado)}
                      </td>

                      <td className="px-3 py-3.5 text-right text-rose-300 font-bold text-xs tabular-nums">
                        {formatRD(consolidadoData.cadenaGastos)}
                      </td>

                      <td className="px-3 py-3.5 text-right text-emerald-400 font-black text-sm tabular-nums">
                        {formatRD(consolidadoData.cadenaUtilidad)}
                      </td>

                      <td className="px-2.5 py-3.5 text-center text-white">
                        <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          {consolidadoData.cadenaMargen.toFixed(1)}%
                        </Badge>
                      </td>

                      <td className="px-3 py-3.5 text-right text-slate-200 font-bold text-xs tabular-nums">
                        {formatRD(consolidadoData.cadenaTicketCliente)}
                      </td>

                      <td className="px-2 py-3.5 text-center text-white font-black text-xs">
                        {consolidadoData.cadenaOrdenes}
                      </td>

                      <td className="px-3 py-3.5 text-right text-sky-300 font-bold text-xs tabular-nums">
                        {formatRD(consolidadoData.cadenaCXCTotal)}
                      </td>

                      <td className="px-3 py-3.5 text-right text-amber-300 font-bold text-xs tabular-nums">
                        {formatRD(consolidadoData.cadenaCXP)}
                      </td>

                      <td className="px-3 py-3.5 text-center text-slate-400 text-[10px]">
                        Red Completa
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>

            {/* Vista Móvil para Consolidado */}
            <div className="grid gap-3.5 lg:hidden">
              {sucursalesFiltradasConsolidado.map((item) => {
                const t = item.tenant;
                const tieneGanancia = item.utilidadNeta >= 0;
                return (
                  <Card key={item.tenantId} className="p-4 rounded-2xl border border-border/70 shadow-xs bg-surface space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {t.logo_url ? (
                          <img src={t.logo_url} alt="" className="h-10 w-10 rounded-full object-contain border bg-white p-0.5" />
                        ) : (
                          <div className="h-10 w-10 rounded-full flex items-center justify-center font-black text-white text-sm" style={{ backgroundColor: t.color_primario || "#0891b2" }}>
                            {t.nombre.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-foreground text-sm">{t.nombre}</h3>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 bg-emerald-50 text-emerald-700">
                              {getTenantBranchName(t)}
                            </Badge>
                            {t.rnc && <span>RNC: {t.rnc}</span>}
                          </div>
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          tieneGanancia ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {item.margenPct.toFixed(1)}% margen
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/40">
                      <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                        <span className="text-[10px] font-bold uppercase text-emerald-700 block">Cobrado (Flujo)</span>
                        <span className="font-black text-emerald-600 text-sm">{formatRD(item.ingresosCobrados)}</span>
                        <span className="text-[10px] text-muted-foreground block">Facturado: {formatRD(item.facturado)}</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/10">
                        <span className="text-[10px] font-bold uppercase text-rose-700 block">Gastos Operativos</span>
                        <span className="font-black text-rose-600 text-sm">{formatRD(item.totalGastos)}</span>
                        <span className="text-[10px] text-muted-foreground block">{item.gastosCount} gastos reg.</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-teal-500/5 border border-teal-500/10">
                        <span className="text-[10px] font-bold uppercase text-teal-700 block">Utilidad Neta</span>
                        <span className={`font-black text-sm ${tieneGanancia ? "text-emerald-600" : "text-rose-600"}`}>
                          {formatRD(item.utilidadNeta)}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">{item.ordenesCount} órdenes</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                        <span className="text-[10px] font-bold uppercase text-indigo-700 block">Clientes Activos</span>
                        <span className="font-black text-foreground text-sm">{item.clientesActivos}</span>
                        <span className="text-[10px] text-muted-foreground block">Ticket: {formatRD(item.ticketPromedioCliente)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 pt-1 border-t border-border/40">
                      <span>Por cobrar: <strong className="text-sky-700">{formatRD(item.porCobrarTotal)}</strong></span>
                      <span>Por pagar: <strong className="text-amber-700">{formatRD(item.cxpPendiente)}</strong></span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate({ to: "/reportes", search: { tenantId: t.id } })}
                        className="flex-1 h-8 text-xs font-bold rounded-xl"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Reportes
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleManage(t.id, t.slug)}
                        className="flex-1 h-8 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        Entrar
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA: CUENTAS POR PAGAR (CXP) MULTISEDE               */}
        {/* ======================================================== */}
        {activeTab === "cxp" && (
          <div className="mt-6 space-y-6">
            {/* 4 KPIs de CXP Cadena */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <KPI 
                title="Total Adeudado Suplidores" 
                value={formatRD(cxpResumen.totalPendiente)} 
                sub={`${cxpFlatList.length} facturas registradas`} 
                icon={Receipt} 
                variant="amber" 
              />
              <KPI 
                title="Facturas Vencidas / Críticas" 
                value={`${cxpResumen.totalVencidas + cxpResumen.totalCriticas}`} 
                sub={cxpResumen.totalCriticas > 0 ? `${cxpResumen.totalCriticas} en mora crítica (>30d)` : "Requieren atención de pago"} 
                icon={AlertTriangle} 
                variant={cxpResumen.totalVencidas + cxpResumen.totalCriticas > 0 ? "rose" : "emerald"} 
              />
              <KPI 
                title="Total Pagado a Suplidores" 
                value={formatRD(cxpResumen.totalPagado)} 
                sub="Pagos liquidados acumulados" 
                icon={TrendingUp} 
                variant="emerald" 
              />
              <KPI 
                title="Proveedores con Saldo" 
                value={`${cxpResumen.suplidoresCount}`} 
                sub="Suplidores con balance pendiente" 
                icon={Building} 
                variant="indigo" 
              />
            </div>

            {/* Barra de Filtros CXP */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-surface p-3.5 rounded-2xl border border-border/60 shadow-xs">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por suplidor, RNC, factura # o sucursal..."
                  value={cxpSearch}
                  onChange={(e) => setCxpSearch(e.target.value)}
                  className="pl-10 h-10 rounded-xl bg-background border-border/80 text-xs sm:text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <BranchSelect
                  tenants={myTenants}
                  value={cxpTenantFilter}
                  onChange={setCxpTenantFilter}
                  className="w-full sm:w-[250px]"
                />

                <div className="flex items-center gap-1 bg-muted/50 border border-border/60 rounded-xl p-1 shrink-0 overflow-x-auto">
                  {(["PENDIENTES", "VENCIDAS", "PAGADAS", "TODAS"] as const).map((st) => {
                    const labels: Record<string, string> = {
                      PENDIENTES: "Pendientes",
                      VENCIDAS: "Vencidas",
                      PAGADAS: "Pagadas",
                      TODAS: "Todas",
                    };
                    const isActive = cxpFilterStatus === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setCxpFilterStatus(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                          isActive ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {labels[st]}
                      </button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCXPExcel}
                  className="gap-2 h-10 sm:h-11 px-3.5 rounded-2xl font-bold border-border/80 bg-white dark:bg-slate-900 hover:bg-muted text-xs cursor-pointer shadow-2xs shrink-0 ml-auto"
                >
                  <Download className="h-3.5 w-3.5 text-primary" />
                  <span>Exportar CXP</span>
                </Button>
              </div>
            </div>

            {/* Tabla Desktop de CXP Multisede */}
            <Card className="hidden md:block overflow-hidden border border-border/70 shadow-md rounded-2xl bg-surface">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-xs">
                  <thead className="relative z-10 text-[10px] uppercase tracking-wider font-black shadow-[0_4px_12px_-2px_rgba(0,0,0,0.06)] border-b border-border/80">
                    <tr>
                      <th className="px-3.5 py-3 text-left whitespace-nowrap bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200/70 dark:from-slate-800 text-slate-800 dark:text-slate-200">
                        Sucursal
                      </th>
                      <th className="px-3.5 py-3 text-left whitespace-nowrap bg-gradient-to-b from-blue-50 via-blue-100/90 to-blue-200/60 dark:from-blue-950/70 text-blue-950 dark:text-blue-200 border-x border-blue-200/50">
                        Suplidor / Proveedor
                      </th>
                      <th className="px-3 py-3 text-center whitespace-nowrap bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200/70 dark:from-slate-800 text-slate-800 dark:text-slate-200 border-r border-border/40">
                        Factura # / NCF
                      </th>
                      <th className="px-3 py-3 text-center whitespace-nowrap bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200/70 dark:from-slate-800 text-slate-800 dark:text-slate-200 border-r border-border/40">
                        Emisión / Vence
                      </th>
                      <th className="px-3 py-3 text-center whitespace-nowrap bg-gradient-to-b from-amber-50 via-amber-100/90 to-amber-200/60 dark:from-amber-950/70 text-amber-950 dark:text-amber-200 border-r border-amber-200/50">
                        Estado Mora
                      </th>
                      <th className="px-3 py-3 text-right whitespace-nowrap bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200/70 dark:from-slate-800 text-slate-800 dark:text-slate-200 border-r border-border/40">
                        Total
                      </th>
                      <th className="px-3 py-3 text-right whitespace-nowrap bg-gradient-to-b from-emerald-50 via-emerald-100/90 to-emerald-200/60 dark:from-emerald-950/70 text-emerald-950 dark:text-emerald-200 border-r border-emerald-200/50">
                        Pagado
                      </th>
                      <th className="px-3 py-3 text-right whitespace-nowrap bg-gradient-to-b from-rose-50 via-rose-100/90 to-rose-200/60 dark:from-rose-950/70 text-rose-950 dark:text-rose-200 border-r border-rose-200/50">
                        Saldo Pendiente
                      </th>
                      <th className="px-3 py-3 text-center whitespace-nowrap bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200/70 dark:from-slate-800 text-slate-800 dark:text-slate-200">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {cxpFlatList.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-muted-foreground">
                          No se encontraron facturas de proveedores con los filtros seleccionados.
                        </td>
                      </tr>
                    ) : (
                      cxpFlatList.map((f) => {
                        const suplidorNombre = f.suplidor?.nombre_comercial || f.suplidor?.razon_social || "Proveedor sin nombre";
                        const saldo = Number(f.saldo_pendiente ?? (f.total - (f.monto_pagado || 0))) || 0;
                        return (
                          <tr key={f.id} className="hover:bg-muted/40 transition-colors">
                            {/* Sucursal */}
                            <td className="px-3.5 py-3">
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-foreground border-slate-300 dark:border-slate-700">
                                  {f.tenant.nombre}
                                </Badge>
                              </div>
                            </td>

                            {/* Suplidor */}
                            <td className="px-3.5 py-3">
                              <div className="font-bold text-xs text-foreground truncate max-w-[200px]">
                                {suplidorNombre}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {f.suplidor?.rnc_cedula ? `RNC: ${f.suplidor.rnc_cedula}` : f.categoria_gasto}
                              </div>
                            </td>

                            {/* Factura / NCF */}
                            <td className="px-3 py-3 text-center">
                              <span className="font-mono font-bold text-xs text-foreground">
                                #{f.numero_factura}
                              </span>
                              {f.ncf && (
                                <div className="text-[10px] font-mono text-muted-foreground">
                                  {f.ncf}
                                </div>
                              )}
                            </td>

                            {/* Fechas */}
                            <td className="px-3 py-3 text-center">
                              <div className="text-[11px] font-medium text-foreground">
                                Vence: {formatDateRD(f.fecha_vencimiento)}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                Emisión: {formatDateRD(f.fecha_emision)}
                              </div>
                            </td>

                            {/* Estado Mora */}
                            <td className="px-3 py-3 text-center">
                              <EstadoMoraBadge
                                fechaVencimiento={f.fecha_vencimiento}
                                saldo={saldo}
                                estadoMora={f.estado_mora}
                              />
                            </td>

                            {/* Total */}
                            <td className="px-3 py-3 text-right font-bold text-xs text-foreground tabular-nums">
                              {formatRD(f.total)}
                            </td>

                            {/* Pagado */}
                            <td className="px-3 py-3 text-right font-bold text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {formatRD(f.monto_pagado || 0)}
                            </td>

                            {/* Saldo Pendiente */}
                            <td className="px-3 py-3 text-right font-black text-xs text-rose-600 dark:text-rose-400 tabular-nums">
                              {formatRD(saldo)}
                            </td>

                            {/* Acciones */}
                            <td className="px-3 py-3 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleManage(f.tenant_id, f.tenant.slug)}
                                className="h-7 px-2.5 text-[11px] font-bold rounded-lg cursor-pointer shadow-2xs"
                                title="Ir a gestionar CXP en esta sucursal"
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Gestionar
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Vista Móvil CXP */}
            <div className="grid gap-3 md:hidden">
              {cxpFlatList.map((f) => {
                const suplidorNombre = f.suplidor?.nombre_comercial || f.suplidor?.razon_social || "Proveedor sin nombre";
                const saldo = Number(f.saldo_pendiente ?? (f.total - (f.monto_pagado || 0))) || 0;
                return (
                  <Card key={f.id} className="p-3.5 rounded-2xl border border-border/70 shadow-xs bg-surface space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 bg-slate-100 text-slate-800 mb-1">
                          {f.tenant.nombre}
                        </Badge>
                        <h4 className="font-bold text-xs text-foreground">{suplidorNombre}</h4>
                        <div className="text-[10px] text-muted-foreground">Factura #{f.numero_factura} {f.ncf && `• ${f.ncf}`}</div>
                      </div>
                      <EstadoMoraBadge
                        fechaVencimiento={f.fecha_vencimiento}
                        saldo={saldo}
                        estadoMora={f.estado_mora}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center text-xs pt-1 border-t border-border/40">
                      <div className="bg-muted/40 p-1.5 rounded-lg">
                        <span className="text-[9px] text-muted-foreground block">Total</span>
                        <span className="font-bold text-foreground">{formatRD(f.total)}</span>
                      </div>
                      <div className="bg-emerald-500/10 p-1.5 rounded-lg">
                        <span className="text-[9px] text-emerald-700 block">Pagado</span>
                        <span className="font-bold text-emerald-600">{formatRD(f.monto_pagado || 0)}</span>
                      </div>
                      <div className="bg-rose-500/10 p-1.5 rounded-lg">
                        <span className="text-[9px] text-rose-700 block">Pendiente</span>
                        <span className="font-bold text-rose-600">{formatRD(saldo)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                      <span>Vence: {formatDateRD(f.fecha_vencimiento)}</span>
                      <Button
                        size="sm"
                        onClick={() => handleManage(f.tenant_id, f.tenant.slug)}
                        className="h-6 px-2 text-[10px] font-bold rounded-lg bg-primary text-white"
                      >
                        Gestionar
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Modal centralizado de Sucursales */}
      <Dialog open={showBranchModal} onOpenChange={setShowBranchModal}>
        <DialogContent className="sm:max-w-[430px] rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl p-5 sm:p-6 bg-white dark:bg-slate-900 overflow-hidden text-foreground">
          <div className="relative">
            {/* Luz ambiental superior decorativa */}
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-24 bg-gradient-to-b from-[#1B4B73]/15 via-amber-500/10 to-transparent blur-2xl pointer-events-none" />

            <div className="space-y-3.5 pt-1">
              {tieneCuposLibres ? (
                <div className="space-y-3.5">
                  {/* Hero Header */}
                  <DialogHeader className="flex flex-col items-center text-center">
                    <div className="relative mb-2">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 border border-emerald-400/40">
                        <CheckCircle2 className="h-6 w-6 text-white stroke-[2.3]" />
                      </div>
                      <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-400 text-slate-900 flex items-center justify-center shadow-2xs">
                        <Sparkles className="h-3 w-3 fill-current text-white" />
                      </div>
                    </div>

                    <Badge className="mb-1.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-[11px] px-2.5 py-0.5 rounded-full">
                      Cupo de sucursal listo
                    </Badge>

                    <DialogTitle className="font-display font-black text-xl text-foreground tracking-tight">
                      ¡Espacio disponible!
                    </DialogTitle>

                    <DialogDescription className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed text-center">
                      Tienes cupo en tu cuenta para registrar y activar tu nueva sede de inmediato sin costos adicionales.
                    </DialogDescription>
                  </DialogHeader>

                  {/* Quota Progress Card */}
                  <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold gap-2">
                      <span className="text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 whitespace-nowrap shrink-0">
                        <Store className="h-3.5 w-3.5 text-emerald-600" />
                        Sucursales creadas
                      </span>
                      <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold text-xs whitespace-nowrap shrink-0">
                        {sucursalesCreadas} de {maxSucursalesContratadas} contratadas
                      </span>
                    </div>

                    <div className="h-2 w-full bg-emerald-200/50 dark:bg-emerald-900/40 rounded-full overflow-hidden p-0.5">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.round((sucursalesCreadas / maxSucursalesContratadas) * 100))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10.5px] text-emerald-800/80 dark:text-emerald-300/80">
                      <span className="whitespace-nowrap">Espacios disponibles:</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                        {Math.max(0, maxSucursalesContratadas - sucursalesCreadas)} sucursal(es) libres
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-1 flex flex-col gap-2">
                    <Link to="/nueva-sucursal" className="w-full">
                      <Button 
                        onClick={() => setShowBranchModal(false)} 
                        className="w-full bg-[#1B4B73] hover:bg-[#143a59] text-white font-bold h-11 rounded-xl shadow-md shadow-[#1B4B73]/20 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer transition-all active:scale-[0.98]"
                      >
                        <Store className="h-4 w-4 mr-1 text-[#F0B900]" />
                        <span>Continuar a registro de sucursal</span>
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowBranchModal(false)} 
                      className="h-9 rounded-xl text-slate-600 dark:text-slate-400 font-semibold border-border hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-xs"
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>
              ) : puedeComprarMas ? (
                <div className="space-y-3.5">
                  {/* Hero Header */}
                  <DialogHeader className="flex flex-col items-center text-center">
                    <div className="relative mb-2">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/25 border border-amber-400/40">
                        <Sparkles className="h-6 w-6 text-white stroke-[2.3]" />
                      </div>
                      <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-300 text-slate-900 flex items-center justify-center shadow-2xs">
                        <Store className="h-3 w-3" />
                      </div>
                    </div>

                    <Badge className="mb-1.5 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold text-[11px] px-2.5 py-0.5 rounded-full">
                      Plan {plan?.nombre} • Expansión disponible
                    </Badge>

                    <DialogTitle className="font-display font-black text-xl text-foreground tracking-tight">
                      Desbloquear nueva sucursal
                    </DialogTitle>

                    <DialogDescription className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed text-center">
                      Tu plan actual <strong className="text-foreground font-bold">{plan?.nombre}</strong> te permite añadir hasta <strong className="text-foreground font-bold">{limiteAdicionalesPlan} sucursales extra</strong>.
                    </DialogDescription>
                  </DialogHeader>

                  {/* Price and Quota Card */}
                  <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/60 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-200/80 dark:border-slate-800 gap-2">
                      <span className="font-medium text-muted-foreground whitespace-nowrap shrink-0">Plan contratado:</span>
                      <Badge variant="outline" className="font-bold text-[10px] bg-white dark:bg-slate-800 uppercase text-[#1B4B73] dark:text-sky-300 border-[#1B4B73]/20 whitespace-nowrap">
                        {plan?.nombre}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-200/80 dark:border-slate-800 gap-2">
                      <span className="font-medium text-muted-foreground whitespace-nowrap shrink-0">Cupos activos:</span>
                      <span className="font-bold text-foreground font-mono whitespace-nowrap">{maxSucursalesContratadas} sucursal(es)</span>
                    </div>

                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-bold text-foreground whitespace-nowrap shrink-0">Inversión sucursal extra:</span>
                      <span className="font-display font-black text-sm text-primary whitespace-nowrap">
                        {formatRD(precioAdicional).replace("DOP", "RD$")}<span className="text-[10px] font-semibold text-muted-foreground">/mes</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-1 flex flex-col gap-2">
                    {polarSucursalUrl ? (
                      <a href={polarSucursalUrl} target="_blank" rel="noreferrer" className="w-full">
                        <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold h-11 rounded-xl shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer transition-all active:scale-[0.98]">
                          <Sparkles className="h-4 w-4 text-white" />
                          <span>Desbloquear sucursal extra</span>
                          <ExternalLink className="h-3.5 w-3.5 text-white/70 ml-1" />
                        </Button>
                      </a>
                    ) : (
                      <Button disabled className="w-full bg-slate-200 text-slate-500 font-bold h-11 rounded-xl text-xs">
                        Enlace de pago no disponible
                      </Button>
                    )}

                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground font-medium py-0.5">
                      <span>¿Pago asistido?</span>
                      <a 
                        href={`https://wa.me/18299416546?text=Hola%20Klynn,%20me%20gustaria%20activar%20una%20sucursal%20adicional%20para%20mi%20lavanderia%20${encodeURIComponent(mainTenant?.nombre || "")}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="font-bold text-[#1B4B73] dark:text-sky-400 hover:underline inline-flex items-center gap-1"
                      >
                        <MessageCircle className="h-3 w-3" /> Soporte WhatsApp
                      </a>
                    </div>

                    <Button 
                      variant="outline" 
                      onClick={() => setShowBranchModal(false)} 
                      className="h-9 rounded-xl text-slate-600 dark:text-slate-400 font-semibold border-border hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-xs"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {/* Hero Header */}
                  <DialogHeader className="flex flex-col items-center text-center">
                    <div className="relative mb-2">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#1B4B73] to-[#0f2d47] text-white flex items-center justify-center shadow-md shadow-[#1B4B73]/25 border border-[#1B4B73]/30">
                        <Crown className="h-6 w-6 text-[#F0B900]" />
                      </div>
                      <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center shadow-2xs">
                        <Sparkles className="h-3 w-3 fill-current" />
                      </div>
                    </div>

                    <Badge className="mb-1.5 bg-[#1B4B73]/10 text-[#1B4B73] dark:bg-[#1B4B73]/25 dark:text-sky-300 border border-[#1B4B73]/25 font-bold text-[11px] px-2.5 py-0.5 rounded-full">
                      Plan {plan?.nombre || "Básico"} • Capacidad al 100%
                    </Badge>

                    <DialogTitle className="font-display font-black text-xl text-foreground tracking-tight">
                      Límite máximo alcanzado
                    </DialogTitle>

                    <DialogDescription className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed text-center">
                      Has completado el límite máximo de <strong className="text-foreground font-bold">{totalMaxSucursalesPlan} sucursales</strong> permitido para tu cuenta en el <strong className="text-foreground font-bold">Plan {plan?.nombre}</strong>.
                    </DialogDescription>
                  </DialogHeader>

                  {/* Quota Progress Card */}
                  <div className="rounded-2xl border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold gap-2">
                      <span className="text-rose-900 dark:text-rose-300 flex items-center gap-1.5 whitespace-nowrap shrink-0">
                        <Store className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                        Capacidad ocupada
                      </span>
                      <span className="font-mono text-rose-700 dark:text-rose-400 font-bold text-xs whitespace-nowrap shrink-0">
                        {sucursalesCreadas} de {totalMaxSucursalesPlan} contratadas (100%)
                      </span>
                    </div>

                    <div className="h-2 w-full bg-rose-200/50 dark:bg-rose-900/40 rounded-full overflow-hidden p-0.5">
                      <div className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full w-full" />
                    </div>

                    <div className="flex items-center justify-between text-[10.5px] text-rose-800/80 dark:text-rose-300/80">
                      <span className="whitespace-nowrap">Estado:</span>
                      <span className="font-bold text-rose-700 dark:text-rose-400 whitespace-nowrap">
                        Tope de sucursales alcanzado
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-1 flex flex-col gap-2">
                    <a 
                      href={`https://wa.me/18299416546?text=Hola%20Klynn,%20he%20alcanzado%20el%20limite%20de%20sucursales%20en%20el%20plan%20${plan?.nombre}%20y%20me%20gustaria%20actualizar%20a%20un%20plan%20corporativo%20personalizado.`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="w-full"
                    >
                      <Button className="w-full bg-[#1B4B73] hover:bg-[#143a59] text-white font-bold h-11 rounded-xl shadow-md shadow-[#1B4B73]/20 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer transition-all active:scale-[0.98]">
                        <Crown className="h-4 w-4 text-[#F0B900]" />
                        <span>Solicitar plan corporativo</span>
                        <ExternalLink className="h-3.5 w-3.5 text-white/70 ml-1" />
                      </Button>
                    </a>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowBranchModal(false)} 
                      className="h-9 rounded-xl text-slate-600 dark:text-slate-400 font-semibold border-border hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-xs"
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE PAGO CONFIRMADO AUTOMATICO */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="rounded-2xl border-none shadow-card max-w-md text-center p-6 bg-white dark:bg-slate-900">
          <div className="mx-auto my-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 animate-bounce">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-center text-slate-800 dark:text-slate-100">
              ¡Pago Recibido con Éxito!
            </DialogTitle>
            <DialogDescription className="text-center text-slate-500 dark:text-slate-400 text-sm mt-2">
              Hemos confirmado tu pago en Polar. Tu nuevo cupo de sucursal adicional ha sido desbloqueado al instante. Ya puedes registrarla y empezar a expandir tu negocio.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-6 flex flex-col gap-2">
            <Link to="/nueva-sucursal">
              <Button onClick={() => setShowSuccessModal(false)} className="w-full bg-gradient-primary text-white font-bold h-11 rounded-xl shadow-glow">
                Registrar sucursal ahora
              </Button>
            </Link>
            <Button variant="ghost" onClick={() => setShowSuccessModal(false)} className="h-10 rounded-xl text-slate-500 font-bold">
              Hacerlo más tarde
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* MODAL DE DETALLE DE ORDEN (TICKET, PRENDAS, DESGLOSE) */}
      <Dialog open={!!viewingOrder} onOpenChange={(o) => !o && setViewingOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[86vh] overflow-hidden rounded-3xl p-4 sm:p-5">
          {viewingOrder && (
            <OrderDetail 
              view={viewingOrder} 
              tenant={viewingOrderContext?.tenant} 
              clientes={viewingOrderContext?.clientes || []} 
              empleados={viewingOrderContext?.empleados || []}
              cambiarEstado={handleCambiarEstado} 
              setView={setViewingOrder} 
              onPrint={() => setShowPrint(viewingOrder)}
              onEdit={() => { 
                setEditingOrder(viewingOrder); 
                setEditingOrderContext(viewingOrderContext);
                setViewingOrder(null); 
              }}
              setCobrarOrden={() => {
                toast.info("Para gestionar movimientos de caja y cobros directos, accede a la sucursal.");
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL DE EDICIÓN DE ORDEN INTEGRAL */}
      {editingOrder && (
        <EditOrderDialog 
          key={editingOrder.id} 
          orden={editingOrder} 
          clientes={editingOrderContext?.clientes || []} 
          servicios={editingOrderContext?.servicios || []} 
          empleados={editingOrderContext?.empleados || []} 
          tenant={editingOrderContext?.tenant || undefined}
          onClose={() => {
            setEditingOrder(null);
            setEditingOrderContext(null);
          }}
          onSaved={handleOrderSaved}
        />
      )}

      {/* MODAL DE IMPRESIÓN DE TICKET */}
      {showPrint && (
        <TicketPrintPortal 
          orden={showPrint} 
          tenant={viewingOrderContext?.tenant || undefined} 
          clientes={viewingOrderContext?.clientes || []}
          empleados={viewingOrderContext?.empleados || []}
          onClose={() => setShowPrint(null)} 
        />
      )}
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
  sub?: React.ReactNode;
  icon: any;
  variant?: "primary" | "amber" | "emerald" | "rose" | "indigo";
}) {
  const styles = {
    primary: {
      card: "bg-gradient-primary text-white shadow-md border-0",
      title: "text-white/80 font-semibold",
      value: "text-white",
      sub: "text-white/90",
      icon: "text-white/80",
    },
    amber: {
      card: "bg-amber-500/10 border border-amber-500/20 shadow-2xs",
      title: "text-amber-800 dark:text-amber-300 font-semibold",
      value: "text-foreground",
      sub: "text-amber-900 dark:text-amber-300",
      icon: "text-amber-600 dark:text-amber-400",
    },
    emerald: {
      card: "bg-emerald-500/10 border border-emerald-500/20 shadow-2xs",
      title: "text-emerald-800 dark:text-emerald-300 font-semibold",
      value: "text-foreground",
      sub: "text-emerald-900 dark:text-emerald-300",
      icon: "text-emerald-600 dark:text-emerald-400",
    },
    rose: {
      card: "bg-rose-500/10 border border-rose-500/20 shadow-2xs",
      title: "text-rose-800 dark:text-rose-300 font-semibold",
      value: "text-foreground",
      sub: "text-rose-900 dark:text-rose-300",
      icon: "text-rose-600 dark:text-rose-400",
    },
    indigo: {
      card: "bg-indigo-500/10 border border-indigo-500/20 shadow-2xs",
      title: "text-indigo-800 dark:text-indigo-300 font-semibold",
      value: "text-foreground",
      sub: "text-indigo-900 dark:text-indigo-200",
      icon: "text-indigo-600 dark:text-indigo-400",
    },
  }[variant];

  const isLong = value.length > 9;

  return (
    <Card className={`p-3.5 sm:p-5 h-full rounded-2xl ${styles.card}`}>
      <div className="flex items-start justify-between gap-1.5">
        <div className={`text-[10px] sm:text-xs uppercase tracking-wider ${styles.title}`}>{title}</div>
        <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 mt-0.5 ${styles.icon}`} />
      </div>
      <div className={`mt-1.5 sm:mt-2 font-display font-black tracking-tight ${styles.value} ${isLong ? "text-lg sm:text-xl xl:text-[26px]" : "text-xl sm:text-2xl lg:text-3xl"}`} title={value}>
        {value}
      </div>
      {sub && <div className={`mt-0.5 sm:mt-1 text-[11px] sm:text-xs font-semibold truncate ${styles.sub}`}>{sub}</div>}
    </Card>
  );
}
