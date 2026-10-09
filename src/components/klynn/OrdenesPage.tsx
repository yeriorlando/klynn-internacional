import { QRCodeSVG } from "qrcode.react";
import { useMemo, useState, useEffect, useRef } from "react";
import { createPortal, flushSync } from "react-dom";
import {
  Search,
  Printer,
  Eye,
  X,
  XCircle,
  MessageCircle,
  DownloadCloud,
  MoreVertical,
  MoreHorizontal,
  ArrowUpCircle,
  ArrowDownCircle,
  FileText,
  Download,
  FileSpreadsheet,
  DollarSign,
  Coins,
  Loader2,
  Check,
  CheckCircle2,
  CheckCheck,
  ArrowLeft,
  Globe,
  Star,
  ArrowRightLeft,
  Store,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  Phone,
  Activity,
  Shirt,
  UserCog,
  Inbox,
  RefreshCw,
  Truck,
  Wallet,
  Scale,
  User,
  Sparkles,
  Droplets,
  Wind,
  Tag,
  MapPin,
  Layers,
  Copy,
  Eraser,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AnimatePresence, motion } from "framer-motion";
import {
  notificarWhatsApp,
  calcularDiasEnAlmacen,
  fueNotificadoHoy,
  construirMensajeWhatsAppPredeterminado,
  isWhatsAppAutomatedActive,
  toastWhatsAppSuccess,
} from "@/lib/whatsapp";
import { showWhatsAppManualToast } from "@/components/klynn/WhatsAppManualToast";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
import { exportToCsv } from "@/lib/export";
import { exportOrdenesToExcel } from "@/lib/excel-ordenes";
import { EstadoBadge } from "@/components/klynn/TenantShell";
import { Ticket } from "@/components/klynn/Ticket";
import { MarquillasTicket } from "@/components/klynn/MarquillasTicket";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Switch } from "@/components/ui/switch";
import { DMYDatePicker } from "@/components/ui/date-picker";
import {
  getOrdenes,
  saveOrden,
  getClientes,
  getClienteById,
  getEmpleadoById,
  formatRD,
  formatDateRD,
  formatDateTimeRD,
  formatPhoneRD,
  getServicios,
  type Orden,
  type EstadoOrden,
  type Cliente,
  type Caja,
  type MetodoPago,
  type Empleado,
  type Tenant,
  type EstanteriaZona,
  checkPlanLimits,
  getCajaAbierta,
  saveMovimiento,
  uid,
  nextECFNumero,
  nextNCFTradicional,
  saveECFDocument,
  IS_LOCAL_MODE,
  updateOrdenEstado,
  can,
  read,
  write,
  KEY,
  getOrdenesRed,
  transferirOrdenEntreSucursales,
  getSisterTenantsForTenant,
  isTenantPrincipal,
  getTenantBranchName,
  isModuleEnabled,
} from "@/lib/storage";
import { emitirECF, getECFConfig, isECFReady, formatEcfStatus } from "@/lib/fiscal";
import { emitirFacturaSRI, emitirNotaCreditoSRI, emitirNotaDebitoSRI } from "@/lib/fiscal/sri-orden";
import { showDGIIToast } from "@/components/klynn/DGIIToast";
import { showOrderPaidToast } from "@/components/klynn/OrderCreatedToast";
import { toast } from "sonner";
import {
  AlertTriangle,
  Rocket,
  Building,
  Building2,
  Zap,
  Calendar,
  CalendarDays,
  CalendarCheck,
  History,
  CalendarClock,
  CalendarRange,
  SlidersHorizontal,
  PackageX,
  PackageCheck,
  ArrowLeftRight,
  Split,
  MapPinOff,
  Receipt,
  CircleCheck,
  Ban,
  LayoutGrid,
  Banknote,
  CreditCard,
  Trash2,
  Clock,
  Gift,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { supabase, ensureFreshSupabaseSession } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  useOrdenes,
  useClientes,
  useCajaAbierta,
  useEmpleados,
  useServicios,
  useECFConfig,
  useECFSequences,
} from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";
import { useSearch, useNavigate } from "@tanstack/react-router";
import {
  encodeEscPos,
  encodeMarquillasEscPos,
  printBrowserElementsIndividually,
  printDirectRaw,
} from "@/lib/impresora";
import { UbicacionSelectorDialog } from "@/components/klynn/UbicacionSelectorDialog";
import { EditOrderDialog } from "@/components/klynn/EditOrderDialog";
import { OrdenesDailyMetricsCards } from "@/components/klynn/OrdenesDailyMetricsCards";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

function orderEditLabel(orden: Orden): string {
  return ["RECIBIDA", "EN_PROCESO", "LISTA"].includes(orden.estado) &&
    !orden.ncf &&
    !orden.ecf_id &&
    !orden.ecf_status
    ? "Editar orden"
    : "Historial de edición";
}

export type PeriodoCreacion =
  | "todas"
  | "hoy"
  | "ayer"
  | "esta_semana"
  | "semana_pasada"
  | "este_mes"
  | "mes_pasado"
  | "personalizado";

function isCreadaHoy(fechaStr?: string): boolean {
  if (!fechaStr) return false;
  const d = new Date(fechaStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isCreadaAyer(fechaStr?: string): boolean {
  if (!fechaStr) return false;
  const d = new Date(fechaStr);
  if (isNaN(d.getTime())) return false;
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  return (
    d.getFullYear() === ayer.getFullYear() &&
    d.getMonth() === ayer.getMonth() &&
    d.getDate() === ayer.getDate()
  );
}

function isEstaSemana(fechaStr?: string): boolean {
  if (!fechaStr) return false;
  const d = new Date(fechaStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const startOfWeek = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + diffToMonday,
    0,
    0,
    0,
    0,
  );
  const endOfWeek = new Date(
    startOfWeek.getFullYear(),
    startOfWeek.getMonth(),
    startOfWeek.getDate() + 6,
    23,
    59,
    59,
    999,
  );
  return d >= startOfWeek && d <= endOfWeek;
}

function isSemanaPasada(fechaStr?: string): boolean {
  if (!fechaStr) return false;
  const d = new Date(fechaStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day === 0 ? -6 : 1 - day) - 7;
  const startOfLastWeek = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + diffToMonday,
    0,
    0,
    0,
    0,
  );
  const endOfLastWeek = new Date(
    startOfLastWeek.getFullYear(),
    startOfLastWeek.getMonth(),
    startOfLastWeek.getDate() + 6,
    23,
    59,
    59,
    999,
  );
  return d >= startOfLastWeek && d <= endOfLastWeek;
}

function isEsteMes(fechaStr?: string): boolean {
  if (!fechaStr) return false;
  const d = new Date(fechaStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function isMesPasado(fechaStr?: string): boolean {
  if (!fechaStr) return false;
  const d = new Date(fechaStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  const targetYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const targetMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
}

function isRangoPersonalizado(fechaStr?: string, desde?: string, hasta?: string): boolean {
  if (!fechaStr) return false;
  const d = new Date(fechaStr);
  if (isNaN(d.getTime())) return false;
  if (desde) {
    const [y, m, day] = desde.split("-").map(Number);
    const start = new Date(y, m - 1, day, 0, 0, 0, 0);
    if (d < start) return false;
  }
  if (hasta) {
    const [y, m, day] = hasta.split("-").map(Number);
    const end = new Date(y, m - 1, day, 23, 59, 59, 999);
    if (d > end) return false;
  }
  return true;
}

function matchesPeriodoCreacion(
  fechaStr?: string,
  periodo: PeriodoCreacion = "todas",
  desde?: string,
  hasta?: string,
): boolean {
  if (periodo === "todas") return true;
  if (!fechaStr) return false;
  switch (periodo) {
    case "hoy":
      return isCreadaHoy(fechaStr);
    case "ayer":
      return isCreadaAyer(fechaStr);
    case "esta_semana":
      return isEstaSemana(fechaStr);
    case "semana_pasada":
      return isSemanaPasada(fechaStr);
    case "este_mes":
      return isEsteMes(fechaStr);
    case "mes_pasado":
      return isMesPasado(fechaStr);
    case "personalizado":
      return isRangoPersonalizado(fechaStr, desde, hasta);
    default:
      return true;
  }
}

function formatLocalDateToInput(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPeriodoLabel(periodo: PeriodoCreacion, desde?: string, hasta?: string): string {
  switch (periodo) {
    case "hoy":
      return "Creadas hoy";
    case "ayer":
      return "Creadas ayer";
    case "esta_semana":
      return "Esta semana";
    case "semana_pasada":
      return "Semana pasada";
    case "este_mes":
      return "Este mes";
    case "mes_pasado":
      return "Mes pasado";
    case "personalizado":
      if (desde && hasta) return `Del ${desde} al ${hasta}`;
      if (desde) return `Desde ${desde}`;
      if (hasta) return `Hasta ${hasta}`;
      return "Rango personalizado";
    case "todas":
    default:
      return "Todas las fechas";
  }
}

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

function formatMetodoPagoLabel(metodo?: string): string {
  if (!metodo) return "—";
  return metodo.replace(/_/g, " ");
}

function getNotaCreditoMonto(orden: Orden): number {
  return Math.max(0, Number(orden.nota_credito_monto || 0));
}

function getNotaDebitoMonto(orden: Orden): number {
  return Math.max(0, Number(orden.nota_debito_monto || 0));
}

function getTotalNetoOrden(orden: Orden): number {
  return Math.max(
    0,
    Number((orden.total - getNotaCreditoMonto(orden) + getNotaDebitoMonto(orden)).toFixed(2)),
  );
}

export function isMetodoCredito(metodo?: string): boolean {
  if (!metodo) return false;
  const m = metodo.toUpperCase().trim();
  return m === "CREDITO" || m === "CRÉDITO";
}

export function esTransicionEstadoPermitida(
  actual: EstadoOrden,
  destino: EstadoOrden,
  saldo: number,
  metodoPago?: string,
): boolean {
  if (actual === destino) return false;
  if (actual === "ANULADA" || destino === "ANULADA") return false;

  // Regla especial: Solo se bloquea la entrega si tiene saldo pendiente Y NO ES A CRÉDITO
  if (destino === "ENTREGADA" && saldo > 0 && !isMetodoCredito(metodoPago)) {
    return false;
  }

  return true;
}

interface NetworkBranchSelectProps {
  tenants: Tenant[];
  currentTenant?: Tenant | null;
  value: string; // "ALL" | "LOCAL_ONLY" | "TRANSFERIDAS_TODAS" | "SATELLITES_ONLY" | tenant.id
  onChange: (val: string) => void;
  className?: string;
  triggerClassName?: string;
  orderCountsByBranch?: Record<string, number>;
  totalLocalesCount?: number;
  totalTransferidasCount?: number;
  showTransferFilterOptions?: boolean;
}

function NetworkBranchSelect({
  tenants,
  currentTenant,
  value,
  onChange,
  className = "",
  triggerClassName = "",
  orderCountsByBranch,
  totalLocalesCount,
  totalTransferidasCount,
  showTransferFilterOptions = false,
}: NetworkBranchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Excluir la sucursal donde el usuario está actualmente ubicado
  const otherTenants = useMemo(() => {
    return tenants.filter((t) => !currentTenant?.id || t.id !== currentTenant.id);
  }, [tenants, currentTenant?.id]);

  const selectedTenant = useMemo(() => {
    if (value === "ALL" || value === "LOCAL_ONLY" || value === "TRANSFERIDAS_TODAS" || value === "SATELLITES_ONLY") return null;
    return otherTenants.find((t) => t.id === value) || null;
  }, [otherTenants, value]);

  const filteredTenants = useMemo(() => {
    if (!search.trim()) return otherTenants;
    const q = search.toLowerCase().trim();
    return otherTenants.filter((t) => {
      const name = (t.nombre || "").toLowerCase();
      const slug = (t.slug || "").toLowerCase();
      const branchName = getTenantBranchName(t).toLowerCase();
      return name.includes(q) || slug.includes(q) || branchName.includes(q);
    });
  }, [otherTenants, search]);

  const satelliteCount = useMemo(() => {
    return otherTenants.filter((t) => !isTenantPrincipal(t)).length;
  }, [otherTenants]);

  const isCurrentPrincipal = isTenantPrincipal(currentTenant);

  function handleSelect(id: string) {
    onChange(id);
    setOpen(false);
    setSearch("");
  }

  const label = useMemo(() => {
    if (value === "LOCAL_ONLY") return "Solo creadas aquí";
    if (selectedTenant) {
      const name = selectedTenant.nombre_sucursal || selectedTenant.nombre || getTenantBranchName(selectedTenant);
      const count = orderCountsByBranch?.[selectedTenant.id] ?? 0;
      return `${name} (${count})`;
    }
    if (value === "ALL") return "Todas las sucursales";
    if (value === "SATELLITES_ONLY") return "Solo Satélites";
    return "Solo creadas aquí";
  }, [value, selectedTenant, orderCountsByBranch]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{ backgroundColor: "#ffffff" }}
        className={`group flex items-center justify-between gap-2 border border-slate-300 dark:border-slate-700 !bg-white dark:!bg-slate-900 px-3 shadow-2xs transition-all hover:border-[#1B4B73] hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-[#1B4B73]/20 active:scale-[0.99] cursor-pointer min-w-[200px] sm:min-w-[230px] ${
          triggerClassName || "h-10 rounded-xl"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex h-6.5 w-6.5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-2xs">
            {value === "LOCAL_ONLY" ? (
              <div className="h-full w-full bg-emerald-600 text-white flex items-center justify-center">
                <Store className="h-3 w-3" />
              </div>
            ) : selectedTenant?.logo_url ? (
              <img
                src={selectedTenant.logo_url}
                alt={selectedTenant.nombre}
                className="h-full w-full object-contain p-0.5"
                loading="lazy"
              />
            ) : selectedTenant ? (
              <div
                className="h-full w-full flex items-center justify-center font-black text-white text-[10px]"
                style={{ backgroundColor: selectedTenant.color_primario || "#0891b2" }}
              >
                {selectedTenant.nombre?.charAt(0).toUpperCase() || "S"}
              </div>
            ) : (
              <div className="h-full w-full bg-[#1B4B73] text-[#F0B900] flex items-center justify-center">
                <Store className="h-3 w-3" />
              </div>
            )}
          </div>

          <div className="flex flex-col text-left truncate">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
              {label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          {value === "LOCAL_ONLY" ? (
            <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {totalLocalesCount !== undefined ? `${totalLocalesCount} locales` : "Local"}
            </span>
          ) : selectedTenant ? (
            <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold border bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-200">
              {orderCountsByBranch?.[selectedTenant.id] !== undefined
                ? `${orderCountsByBranch[selectedTenant.id]} recibidas`
                : "Recibidas"}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {otherTenants.length + 1} sedes
            </span>
          )}

          <ChevronDown
            className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
              open ? "rotate-180 text-blue-600" : "group-hover:text-slate-600"
            }`}
          />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute left-0 sm:right-0 sm:left-auto z-50 mt-1 max-h-84 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-black/5 min-w-[280px] w-full sm:w-[320px]"
          >
            {/* Buscador interno */}
            <div className="sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-2 backdrop-blur-sm">
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar sucursal o sede..."
                  className="h-8.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 pl-8 pr-3 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Opciones */}
            <div className="max-h-68 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
              {showTransferFilterOptions ? (
                <>
                  {/* Opción única base: Solo creadas aquí (Locales) */}
                  <button
                    type="button"
                    onClick={() => handleSelect("LOCAL_ONLY")}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer ${
                      value === "LOCAL_ONLY"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800 font-bold"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Store className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-foreground truncate">
                          Solo creadas aquí (Locales)
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate">
                          Órdenes originadas en esta sucursal ({totalLocalesCount ?? 0})
                        </span>
                      </div>
                    </div>
                    {value === "LOCAL_ONLY" && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
                  </button>

                  {/* Sucursales hermanas directamente debajo */}
                  {filteredTenants.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      No se encontraron otras sucursales para "{search}"
                    </div>
                  ) : (
                    filteredTenants.map((t) => {
                      const isSelected = t.id === value;
                      const displayName = t.nombre_sucursal || t.nombre || "Sucursal";
                      const countRecibidas = orderCountsByBranch?.[t.id] ?? 0;

                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelect(t.id)}
                          className={`flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer ${
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800 font-bold"
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
                              <span className="text-xs font-bold text-foreground truncate">
                                {displayName} ({countRecibidas})
                              </span>
                              <span className="text-[10px] text-muted-foreground truncate">
                                Órdenes recibidas de esta sucursal ({countRecibidas})
                              </span>
                            </div>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleSelect("ALL")}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer ${
                      value === "ALL"
                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800 font-bold"
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
                          Red completa ({otherTenants.length + 1} sedes activas)
                        </span>
                      </div>
                    </div>
                    {value === "ALL" && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                  </button>

                  {isCurrentPrincipal && satelliteCount > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSelect("SATELLITES_ONLY")}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer ${
                        value === "SATELLITES_ONLY"
                          ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800 font-bold"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
                          <Store className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-foreground truncate">
                            Solo Sucursales Satélites
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            Filtrar todas las satélites ({satelliteCount} receptoras)
                          </span>
                        </div>
                      </div>
                      {value === "SATELLITES_ONLY" && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                    </button>
                  )}

                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

                  {filteredTenants.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      No se encontraron otras sucursales para "{search}"
                    </div>
                  ) : (
                    filteredTenants.map((t) => {
                      const isSelected = t.id === value;
                      const esPrincipal = isTenantPrincipal(t);
                      const displayName = t.nombre_sucursal || t.nombre || (esPrincipal ? "Sucursal principal" : "Sucursal Satélite");
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelect(t.id)}
                          className={`flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer ${
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800 font-bold"
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
                              <span className="text-xs font-bold text-foreground truncate">
                                {displayName}
                              </span>
                              <span className="text-[10px] text-muted-foreground truncate">
                                {t.rnc ? `RNC: ${t.rnc}` : t.direccion || t.telefono || t.slug}
                              </span>
                            </div>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OrderStatusBadge({ estado }: { estado: string }) {
  const norm = (estado || "").toUpperCase();
  if (norm === "RECIBIDA") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 shadow-2xs">
        <Inbox className="h-3 w-3" />
        <span>Recibida</span>
      </span>
    );
  }
  if (norm === "EN_PROCESO") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 shadow-2xs">
        <RefreshCw className="h-3 w-3" />
        <span>En proceso</span>
      </span>
    );
  }
  if (norm === "LISTA") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 shadow-2xs">
        <CheckCircle2 className="h-3 w-3" />
        <span>Lista</span>
      </span>
    );
  }
  if (norm === "ENTREGADA") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800 shadow-2xs">
        <Truck className="h-3 w-3" />
        <span>Entregada</span>
      </span>
    );
  }
  if (norm === "ANULADA" || norm === "CANCELADA") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800 shadow-2xs">
        <Ban className="h-3 w-3" />
        <span>Anulada</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 shadow-2xs">
      {norm.replace("_", " ")}
    </span>
  );
}

interface TransferDestinoSelectProps {
  branches: Tenant[];
  value: string;
  onChange: (branchId: string) => void;
  placeholder?: string;
}

function TransferDestinoSelect({
  branches,
  value,
  onChange,
  placeholder = "Elige la sucursal de destino...",
}: TransferDestinoSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const selectedBranch = useMemo(() => {
    return branches.find((b) => b.id === value) || null;
  }, [branches, value]);

  const filteredBranches = useMemo(() => {
    if (!search.trim()) return branches;
    const q = search.toLowerCase().trim();
    return branches.filter((b) => {
      const name = (b.nombre || "").toLowerCase();
      const slug = (b.slug || "").toLowerCase();
      const branchName = getTenantBranchName(b).toLowerCase();
      return name.includes(q) || slug.includes(q) || branchName.includes(q);
    });
  }, [branches, search]);

  function handleSelect(id: string) {
    onChange(id);
    setOpen(false);
    setSearch("");
  }

  const isPrincipal = selectedBranch ? isTenantPrincipal(selectedBranch) : false;

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{ backgroundColor: "#ffffff" }}
        className="group flex h-12 w-full items-center justify-between gap-3 rounded-2xl border border-slate-300 dark:border-slate-700 !bg-white dark:!bg-slate-900 px-3.5 shadow-xs transition-all hover:border-[#1B4B73] hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-[#1B4B73]/20 active:scale-[0.99] cursor-pointer text-left"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-2xs">
            {selectedBranch ? (
              isPrincipal ? (
                <div className="h-full w-full bg-amber-500 text-white flex items-center justify-center">
                  <Star className="h-4 w-4 fill-white text-white" />
                </div>
              ) : selectedBranch.logo_url ? (
                <img
                  src={selectedBranch.logo_url}
                  alt={selectedBranch.nombre}
                  className="h-full w-full object-contain p-0.5"
                  loading="lazy"
                />
              ) : (
                <div
                  className="h-full w-full flex items-center justify-center font-black text-white text-xs"
                  style={{ backgroundColor: selectedBranch.color_primario || "#1B4B73" }}
                >
                  {selectedBranch.nombre?.charAt(0).toUpperCase() || "S"}
                </div>
              )
            ) : (
              <div className="h-full w-full bg-[#1B4B73] text-white flex items-center justify-center">
                <Store className="h-4 w-4" />
              </div>
            )}
          </div>

          <div className="flex flex-col min-w-0 flex-1 truncate">
            {selectedBranch ? (
              <>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate flex items-center gap-1.5">
                  {getTenantBranchName(selectedBranch)}
                  {isPrincipal && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 text-[9px] font-bold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      <Star className="h-2 w-2 fill-amber-500" />
                      Matriz
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {selectedBranch.nombre} {isPrincipal ? "• Sede Central" : "• Sucursal Satélite"}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground font-medium">
                {placeholder}
              </span>
            )}
          </div>
        </div>

        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0 ${
            open ? "rotate-180 text-blue-600" : "group-hover:text-slate-600"
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-black/5 w-full"
          >
            {/* Buscador interno */}
            <div className="sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-2 backdrop-blur-sm">
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar sucursal o sede..."
                  className="h-8.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 pl-8 pr-3 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Lista de sucursales */}
            <div className="max-h-60 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
              {filteredBranches.length === 0 ? (
                <div className="p-3 text-center text-xs text-muted-foreground">
                  No se encontraron sucursales para "{search}"
                </div>
              ) : (
                filteredBranches.map((branch) => {
                  const isSelected = branch.id === value;
                  const branchPrincipal = isTenantPrincipal(branch);
                  const displayName = getTenantBranchName(branch);

                  return (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => handleSelect(branch.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2.5 text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800 font-bold"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative flex h-7.5 w-7.5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 bg-white p-0.5 shadow-2xs">
                          {branchPrincipal ? (
                            <div className="h-full w-full bg-amber-500 text-white flex items-center justify-center">
                              <Star className="h-3.5 w-3.5 fill-white text-white" />
                            </div>
                          ) : branch.logo_url ? (
                            <img src={branch.logo_url} alt="" className="h-full w-full object-contain" />
                          ) : (
                            <div
                              className="h-full w-full flex items-center justify-center font-black text-white text-[11px]"
                              style={{ backgroundColor: branch.color_primario || "#1B4B73" }}
                            >
                              {branch.nombre.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
                            {displayName}
                            {branchPrincipal && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 text-[9px] font-bold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                <Star className="h-2 w-2 fill-amber-500" />
                                Matriz
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {branch.nombre} {branchPrincipal ? "• Sede Central" : "• Sucursal Satélite"}
                          </span>
                        </div>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
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

export function canSucursalCobrarOrden(orden?: Orden | null, currentTenant?: Tenant | null): boolean {
  if (!orden || !currentTenant?.id) return false;
  const cId = String(currentTenant.id).toLowerCase().trim();
  const destId = orden.sucursal_destino_id ? String(orden.sucursal_destino_id).toLowerCase().trim() : "";
  const origTenantId = orden.tenant_id ? String(orden.tenant_id).toLowerCase().trim() : "";

  // 1. Fue transferida con destino explícito a esta sucursal actual
  if (destId && destId === cId) {
    return true;
  }

  // 2. Si no tiene destino por ID, verificar por nombre de sucursal destino
  if (!destId && orden.sucursal_destino_nombre) {
    const destNom = orden.sucursal_destino_nombre.toLowerCase().trim();
    const tenNom = (currentTenant.nombre || "").toLowerCase().trim();
    const tenSuc = (currentTenant.nombre_sucursal || "").toLowerCase().trim();
    if (destNom && (destNom === tenNom || destNom === tenSuc || destNom.includes(tenSuc) || destNom.includes(tenNom))) {
      return true;
    }
  }

  // 3. Pertenece a esta sucursal originaria y NO ha sido transferida a otra sucursal
  if (origTenantId === cId) {
    if (!destId || destId === cId) {
      return true;
    }
  }

  return false;
}

function TransferredOrderBadge({
  orden,
  currentTenant,
}: {
  orden: Orden;
  currentTenant?: Tenant | null;
}) {
  if (
    !orden.sucursal_destino_nombre &&
    !orden.sucursal_origen_nombre &&
    (!orden.traslado_historial || orden.traslado_historial.length === 0)
  ) {
    return null;
  }

  const currentTenantId = currentTenant?.id;
  const isCurrentPrincipal = isTenantPrincipal(currentTenant);

  // Determinar si esta sucursal es la receptora (destino) o la emisora (origen)
  const isDestino = Boolean(
    (orden.sucursal_destino_id && orden.sucursal_destino_id === currentTenantId) ||
    (orden.tenant_id === currentTenantId && orden.sucursal_origen_id && orden.sucursal_origen_id !== currentTenantId)
  );

  const isIncoming = isDestino || (orden.tenant_id === currentTenantId && Boolean(orden.sucursal_origen_nombre));

  let badgeText = "";
  let tooltipTitle = "";
  let tooltipBranch = "";
  let tooltipPhone = "";
  let tooltipAddress = "";

  if (isIncoming) {
    // La orden está aquí porque fue transferida/enviada desde otra sede
    if (isCurrentPrincipal) {
      // Estamos en la principal: vino de una satélite
      badgeText = "Sucursal satélite";
      tooltipTitle = "Recibida desde:";
      tooltipBranch = orden.sucursal_origen_nombre || "Sucursal Satélite";
    } else {
      // Estamos en una satélite: vino de la principal (u otra)
      badgeText = "Sucursal principal";
      tooltipTitle = "Recibida desde:";
      tooltipBranch = orden.sucursal_origen_nombre || "Sucursal Principal";
    }
    tooltipPhone = orden.sucursal_origen_telefono || "";
    tooltipAddress = orden.sucursal_origen_direccion || "";
  } else {
    // La orden fue enviada desde aquí hacia otra sede
    if (!isCurrentPrincipal) {
      // Estamos en satélite: fue enviada a la principal
      badgeText = "Sucursal principal";
      tooltipTitle = "Transferida a:";
      tooltipBranch = orden.sucursal_destino_nombre || "Sucursal Principal";
    } else {
      // Estamos en la principal: fue enviada a satélite
      badgeText = "Sucursal satélite";
      tooltipTitle = "Transferida a:";
      tooltipBranch = orden.sucursal_destino_nombre || "Sucursal Satélite";
    }
    tooltipPhone = orden.sucursal_destino_telefono || "";
    tooltipAddress = orden.sucursal_destino_direccion || "";
  }

  const tooltipFull = `${tooltipTitle} ${tooltipBranch}${tooltipPhone ? ` • Tel: ${tooltipPhone}` : ""}${tooltipAddress ? ` • ${tooltipAddress}` : ""}`;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex items-center gap-1 text-[9.5px] font-bold py-0.5 px-2 rounded-md shadow-xs cursor-help border transition-colors select-none bg-[#1B4B73] hover:bg-[#143d5f] text-white border-[#143d5f] shadow-[#1B4B73]/20"
            title={tooltipFull}
          >
            {isIncoming ? (
              <ArrowDownLeft className="h-3 w-3 shrink-0 text-white" />
            ) : (
              <ArrowUpRight className="h-3 w-3 shrink-0 text-white" />
            )}
            <span>{badgeText}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl border border-slate-700 max-w-xs space-y-1 text-center pointer-events-none"
        >
          <div className="font-extrabold text-[11px] text-blue-300">
            {tooltipTitle} {tooltipBranch}
          </div>
          {tooltipPhone && (
            <div className="text-[10px] text-slate-300 flex items-center justify-center gap-1">
              <Phone className="h-3 w-3 text-emerald-400" /> {tooltipPhone}
            </div>
          )}
          {tooltipAddress && (
            <div className="text-[10px] text-slate-400 truncate max-w-[220px]">
              {tooltipAddress}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface OrdenesPageProps {
  authUser?: { empleado: Empleado; tenant: Tenant } | null;
  embedded?: boolean;
}

export function OrdenesPage({ authUser, embedded = false }: OrdenesPageProps = {}) {
  const requiredUser = useRequireAuth();
  const user = authUser ?? requiredUser;
  const isAuthorized = user?.empleado?.rol === "ADMIN" || user?.empleado?.rol === "SUPERVISOR";
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoOrden | "todos" | "hoy" | "urgente">(
    "todos",
  );
  const [periodoCreacion, setPeriodoCreacion] = useState<PeriodoCreacion>("todas");
  const [customFechaDesde, setCustomFechaDesde] = useState<string>("");
  const [customFechaHasta, setCustomFechaHasta] = useState<string>("");
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [tempDesde, setTempDesde] = useState<string>("");
  const [tempHasta, setTempHasta] = useState<string>("");
  const [filtroEntrega, setFiltroEntrega] = useState<"todas" | "hoy" | "atrasadas" | "sin_retirar">(
    "todas",
  );
  const [filtroUrgencia, setFiltroUrgencia] = useState<
    "todas" | "urgente" | "estandar" | "pagadas" | "pendientes_pago"
  >("todas");
  const [filtroPago, setFiltroPago] = useState<"todas" | MetodoPago>("todas");
  const [filtroUbicacion, setFiltroUbicacion] = useState<string>("todas");
  const [editingUbicacionOrden, setEditingUbicacionOrden] = useState<Orden | null>(null);
  const [editingUbicacionValue, setEditingUbicacionValue] = useState<string>("");
  const [view, setView] = useState<Orden | null>(null);
  const [editOrder, setEditOrder] = useState<Orden | null>(null);
  const [anular, setAnular] = useState<Orden | null>(null);
  const [motivoAnular, setMotivoAnular] = useState("");
  const [codigoAnular, setCodigoAnular] = useState("01");
  const [confirmarAnulacion, setConfirmarAnulacion] = useState(false);
  const [isAnulando, setIsAnulando] = useState(false);
  const [debito, setDebito] = useState<Orden | null>(null);
  const [montoDebito, setMontoDebito] = useState(0);
  const [motivoDebito, setMotivoDebito] = useState("");
  const [confirmarNotaDebito, setConfirmarNotaDebito] = useState(false);
  const [isGenerandoDebito, setIsGenerandoDebito] = useState(false);
  const [credito, setCredito] = useState<Orden | null>(null);
  const [montoCredito, setMontoCredito] = useState(0);
  const [motivoCredito, setMotivoCredito] = useState("");
  const [codigoCredito, setCodigoCredito] = useState("");
  const [confirmarNotaCredito, setConfirmarNotaCredito] = useState(false);
  const [isGenerandoCredito, setIsGenerandoCredito] = useState(false);
  const [showPrint, setShowPrint] = useState<Orden | null>(null);
  const [showPrintProduccion, setShowPrintProduccion] = useState<Orden | null>(null);
  const [showPrintMarquillas, setShowPrintMarquillas] = useState<Orden | null>(null);
  const [pagoRecibidoParaTicket, setPagoRecibidoParaTicket] = useState<number | undefined>(
    undefined,
  );
  const [showDownloadA4, setShowDownloadA4] = useState<Orden | null>(null);
  const [isPrintingList, setIsPrintingList] = useState(false);
  const [cobrarOrden, setCobrarOrden] = useState<Orden | null>(null);
  const [showPendientes, setShowPendientes] = useState(false);
  const [searchPendientes, setSearchPendientes] = useState("");
  const [filtroPendientes, setFiltroPendientes] = useState<
    "todos" | "RECIBIDA" | "EN_PROCESO" | "LISTA" | "EN_CAMINO"
  >("todos");
  const [condonarOrden, setCondonarOrden] = useState<Orden | null>(null);
  const navigate = useNavigate();
  const [conveyorOrden, setConveyorOrden] = useState<Orden | null>(null);
  const [conveyorUbicacion, setConveyorUbicacion] = useState("");
  const [savingConveyor, setSavingConveyor] = useState(false);
  const [estadoModal, setEstadoModal] = useState<Orden | null>(null);

  const tenant = user?.tenant;
  const tenantId = tenant?.id || "";

  const { data: ordenes = [], isLoading: loadingOrdenes } = useOrdenes(tenantId);
  const { data: clientes = [], isLoading: loadingClientes } = useClientes(tenantId);
  const { data: cajaAbierta, isLoading: loadingCaja } = useCajaAbierta(tenantId);
  const { data: empleados = [] } = useEmpleados(tenantId);
  const { data: servicios = [] } = useServicios(tenantId);
  const { data: ecfConfig } = useECFConfig(tenantId);
  const { data: ecfSequences = [] } = useECFSequences(tenantId);
  const searchParams = useSearch({ strict: false }) as {
    view?: string;
    action?: string;
    filter?: string;
    periodo?: string;
    sucursal?: string;
  };

  // Estados para Consulta Rápida Inter-Sucursales y Transferencias
  const [showNetworkSearchModal, setShowNetworkSearchModal] = useState(false);
  const [isViewFromNetwork, setIsViewFromNetwork] = useState(false);
  const [networkOrders, setNetworkOrders] = useState<Array<Orden & { tenant_nombre?: string; tenant_sucursal?: string; tenant_slug?: string; es_local: boolean; es_principal?: boolean }>>([]);
  const [networkSearchQuery, setNetworkSearchQuery] = useState("");
  const [networkBranchFilter, setNetworkBranchFilter] = useState<string>("ALL");
  const [filtroSucursalRed, setFiltroSucursalRed] = useState<string>(
    searchParams.sucursal || "LOCAL_ONLY"
  );
  const [networkCurrentPage, setNetworkCurrentPage] = useState<number>(1);
  const NETWORK_PAGE_SIZE = 10;
  const [isLoadingNetworkOrders, setIsLoadingNetworkOrders] = useState(false);
  const [sisterBranches, setSisterBranches] = useState<Tenant[]>([]);
  
  // Estado para modal de transferir orden
  const [transferOrderTarget, setTransferOrderTarget] = useState<Orden | null>(null);
  const [selectedDestinoTenantId, setSelectedDestinoTenantId] = useState<string>("");
  const [motivoTransferencia, setMotivoTransferencia] = useState("Cliente solicita retirar en otra sucursal");
  const [isTransferring, setIsTransferring] = useState(false);

  // Transferencia masiva / en lote (Ctrl + Clic)
  const [selectedBatchOrders, setSelectedBatchOrders] = useState<Orden[]>([]);
  const [showBatchTransferModal, setShowBatchTransferModal] = useState<boolean>(false);
  const [batchDestinoTenantId, setBatchDestinoTenantId] = useState<string>("");
  const [batchMotivoTransferencia, setBatchMotivoTransferencia] = useState<string>("Traslado en lote de órdenes para lavado/producción");
  const [isTransferringBatch, setIsTransferringBatch] = useState<boolean>(false);

  const toggleBatchOrder = (orden: Orden) => {
    setSelectedBatchOrders((prev) => {
      const exists = prev.some((o) => o.id === orden.id);
      if (exists) {
        return prev.filter((o) => o.id !== orden.id);
      } else {
        return [...prev, orden];
      }
    });
  };

  const clearBatchOrders = () => {
    setSelectedBatchOrders([]);
  };

  const totalPrendasBatch = useMemo(() => {
    return selectedBatchOrders.reduce((acc, ord) => {
      const itemsCount = ord.items?.reduce((iAcc, item) => iAcc + (item.cantidad || 0), 0) || 0;
      return acc + itemsCount;
    }, 0);
  }, [selectedBatchOrders]);

  const totalMontoBatch = useMemo(() => {
    return selectedBatchOrders.reduce((acc, ord) => acc + (ord.total || 0), 0);
  }, [selectedBatchOrders]);

  // Email del usuario autenticado para buscar sus sucursales hermanas
  const userEmail = user?.empleado?.email || user?.tenant?.email || tenant?.email || "";

  useEffect(() => {
    let isMounted = true;
    if (tenant?.id) {
      getSisterTenantsForTenant(tenant.id, userEmail)
        .then((branches) => {
          if (!isMounted) return;
          if (branches && branches.length > 0) {
            setSisterBranches(branches);
          } else {
            setSisterBranches([tenant]);
          }
        })
        .catch((err) => {
          console.warn("Error cargando sucursales hermanas:", err);
          if (isMounted) setSisterBranches([tenant]);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [tenant?.id, userEmail]);

  // Pre-seleccionar automáticamente la sucursal de destino si no está elegida
  useEffect(() => {
    const destinations = sisterBranches.filter((b) => b.id !== tenant?.id);
    if (destinations.length > 0 && (!selectedDestinoTenantId || !destinations.some((d) => d.id === selectedDestinoTenantId))) {
      const principal = destinations.find((b) => isTenantPrincipal(b));
      setSelectedDestinoTenantId(principal ? principal.id : destinations[0].id);
    }
  }, [sisterBranches, tenant?.id, selectedDestinoTenantId]);

  const handleOpenNetworkSearch = async () => {
    setShowNetworkSearchModal(true);
    setIsLoadingNetworkOrders(true);
    try {
      const allNet = await getOrdenesRed(tenant.id, userEmail);
      setNetworkOrders(allNet);
    } catch (err) {
      console.error("Error loading network orders:", err);
      toast.error("No se pudieron cargar las órdenes de la red.");
    } finally {
      setIsLoadingNetworkOrders(false);
    }
  };

  const filteredNetworkOrders = useMemo(() => {
    let list = networkOrders;

    // 1. Filtrado por sucursal / satélites
    if (networkBranchFilter === "SATELLITES_ONLY") {
      list = list.filter((o) => !o.es_principal);
    } else if (networkBranchFilter !== "ALL") {
      list = list.filter(
        (o) => o.tenant_id === networkBranchFilter || o.sucursal_origen_id === networkBranchFilter
      );
    }

    // 2. Filtrado por texto de búsqueda (número, cliente, notas, sucursales)
    if (networkSearchQuery.trim()) {
      const qLower = networkSearchQuery.toLowerCase().trim();
      const qClean = qLower.replace(/^#/, "");
      list = list.filter((o) => {
        const num = (o.numero || "").toLowerCase();
        const numClean = num.replace(/^#/, "");
        const localCli = clientes.find((c) => c.id === o.cliente_id);
        const localCliName = localCli ? `${localCli.nombre || ""} ${localCli.apellido || ""}`.trim().toLowerCase() : "";
        const netCliName = ((o as any).cliente_nombre || "").toLowerCase();
        const notas = (o.notas || "").toLowerCase();
        const ubi = (o.ubicacion_ropa || "").toLowerCase();
        const orig = (o.sucursal_origen_nombre || "").toLowerCase();
        const dest = (o.sucursal_destino_nombre || "").toLowerCase();
        const tenSuc = (o.tenant_sucursal || "").toLowerCase();
        const tenNom = (o.tenant_nombre || "").toLowerCase();

        return (
          num.includes(qLower) ||
          numClean.includes(qClean) ||
          netCliName.includes(qLower) ||
          localCliName.includes(qLower) ||
          notas.includes(qLower) ||
          ubi.includes(qLower) ||
          orig.includes(qLower) ||
          dest.includes(qLower) ||
          tenSuc.includes(qLower) ||
          tenNom.includes(qLower)
        );
      });
    }

    return list;
  }, [networkOrders, networkSearchQuery, networkBranchFilter, clientes]);

  const totalNetworkPages = Math.ceil(filteredNetworkOrders.length / NETWORK_PAGE_SIZE) || 1;
  const paginatedNetworkOrders = useMemo(() => {
    const start = (networkCurrentPage - 1) * NETWORK_PAGE_SIZE;
    return filteredNetworkOrders.slice(start, start + NETWORK_PAGE_SIZE);
  }, [filteredNetworkOrders, networkCurrentPage]);

  const handleExecuteTransfer = async () => {
    if (!hasTransferirOrden) {
      toast.error("No tienes permiso para transferir órdenes.");
      return;
    }
    if (!transferOrderTarget || !selectedDestinoTenantId) {
      toast.error("Por favor selecciona la sucursal de destino.");
      return;
    }
    const destinoTenant = sisterBranches.find((b) => b.id === selectedDestinoTenantId);
    if (!destinoTenant) {
      toast.error("Sucursal de destino no válida.");
      return;
    }
    setIsTransferring(true);
    try {
      const updated = await transferirOrdenEntreSucursales({
        orden: transferOrderTarget,
        origenTenant: tenant,
        origenTenantNombre: getTenantBranchName(tenant),
        destinoTenant,
        motivo: motivoTransferencia,
        empleadoNombre: user?.empleado?.nombre || "Personal de mostrador",
      });
      if (updated) {
        toast.success(`¡Orden #${transferOrderTarget.numero} transferida exitosamente a ${getTenantBranchName(destinoTenant)}!`);
        queryClient.invalidateQueries({ queryKey: ["ordenes"] });
        if (view && view.id === updated.id) {
          setView(updated);
        }
        setTransferOrderTarget(null);
        if (showNetworkSearchModal) {
          const allNet = await getOrdenesRed(tenant.id, userEmail);
          setNetworkOrders(allNet);
        }
      } else {
        toast.error("Error al transferir la orden.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Ocurrió un error al realizar la transferencia.");
    } finally {
      setIsTransferring(false);
    }
  };

  const handleExecuteBatchTransfer = async () => {
    if (!hasTransferirOrden) {
      toast.error("No tienes permiso para transferir órdenes.");
      return;
    }
    if (selectedBatchOrders.length === 0 || !batchDestinoTenantId) {
      toast.error("Por favor selecciona la sucursal de destino.");
      return;
    }
    const destinoTenant = sisterBranches.find((b) => b.id === batchDestinoTenantId);
    if (!destinoTenant) {
      toast.error("Sucursal de destino no válida.");
      return;
    }

    setIsTransferringBatch(true);
    try {
      let successCount = 0;
      for (const ord of selectedBatchOrders) {
        try {
          const updated = await transferirOrdenEntreSucursales({
            orden: ord,
            origenTenant: tenant,
            origenTenantNombre: getTenantBranchName(tenant),
            destinoTenant,
            motivo: batchMotivoTransferencia || "Traslado en lote de órdenes",
            empleadoNombre: user?.empleado?.nombre || "Personal de mostrador",
          });
          if (updated) successCount++;
        } catch (e) {
          console.error(`Error transfiriendo orden #${ord.numero}:`, e);
        }
      }

      toast.success(
        `¡${successCount} ${successCount === 1 ? "orden transferida" : "órdenes transferidas"} exitosamente a ${getTenantBranchName(destinoTenant)}!`
      );
      queryClient.invalidateQueries({ queryKey: ["ordenes"] });
      if (showNetworkSearchModal) {
        const allNet = await getOrdenesRed(tenant.id, userEmail);
        setNetworkOrders(allNet);
      }
      clearBatchOrders();
      setShowBatchTransferModal(false);
    } catch (e) {
      console.error(e);
      toast.error("Ocurrió un error al realizar la transferencia en lote.");
    } finally {
      setIsTransferringBatch(false);
    }
  };

  const isConveyorEnabled = useMemo(() => {
    return Boolean(
      tenant?.config?.usar_ubicacion_ropa ||
      (typeof window !== "undefined" &&
        (JSON.parse(localStorage.getItem(`klynn_tenant_id_${tenantId}`) || "{}")?.config
          ?.usar_ubicacion_ropa ||
          JSON.parse(localStorage.getItem(`klynn_tenant_cache_${tenant?.slug || ""}`) || "{}")
            ?.config?.usar_ubicacion_ropa)),
    );
  }, [tenant?.config?.usar_ubicacion_ropa, tenant?.slug, tenantId]);

  const isTallerEnabled = useMemo(() => {
    return Boolean(
      tenant?.config?.ticket_imprimir_taller_auto ||
      (typeof window !== "undefined" &&
        (JSON.parse(localStorage.getItem(`klynn_tenant_id_${tenantId}`) || "{}")?.config
          ?.ticket_imprimir_taller_auto ||
          JSON.parse(localStorage.getItem(`klynn_tenant_cache_${tenant?.slug || ""}`) || "{}")
            ?.config?.ticket_imprimir_taller_auto)),
    );
  }, [tenant?.config?.ticket_imprimir_taller_auto, tenant?.slug, tenantId]);

  const isMarquillasEnabled = useMemo(() => {
    return Boolean(
      tenant?.config?.ticket_imprimir_marquillas_auto ||
      (typeof window !== "undefined" &&
        (JSON.parse(localStorage.getItem(`klynn_tenant_id_${tenantId}`) || "{}")?.config
          ?.ticket_imprimir_marquillas_auto ||
          JSON.parse(localStorage.getItem(`klynn_tenant_cache_${tenant?.slug || ""}`) || "{}")
            ?.config?.ticket_imprimir_marquillas_auto)),
    );
  }, [tenant?.config?.ticket_imprimir_marquillas_auto, tenant?.slug, tenantId]);

  const { orderCountsByBranch, totalLocalesCount, totalTransferidasCount } = useMemo(() => {
    const counts: Record<string, number> = {};
    let locales = 0;
    let transferidas = 0;

    for (const o of ordenes) {
      if (o.sucursal_origen_id && o.sucursal_origen_id !== tenantId) {
        counts[o.sucursal_origen_id] = (counts[o.sucursal_origen_id] || 0) + 1;
        transferidas++;
      } else {
        locales++;
      }
    }
    return { orderCountsByBranch: counts, totalLocalesCount: locales, totalTransferidasCount: transferidas };
  }, [ordenes, tenantId]);

  const ordenesBaseParaTabs = useMemo(() => {
    if (filtroSucursalRed === "ALL") return ordenes;
    if (filtroSucursalRed === "LOCAL_ONLY") {
      return ordenes.filter((o) => !o.sucursal_origen_id || o.sucursal_origen_id === tenantId);
    }
    if (filtroSucursalRed === "TRANSFERIDAS_TODAS") {
      return ordenes.filter((o) => o.sucursal_origen_id && o.sucursal_origen_id !== tenantId);
    }
    if (filtroSucursalRed === "SATELLITES_ONLY") {
      return ordenes.filter((o) => {
        const b = sisterBranches.find((s) => s.id === o.sucursal_origen_id);
        return b && !isTenantPrincipal(b);
      });
    }
    const targetBranch = sisterBranches.find((b) => b.id === filtroSucursalRed);
    return ordenes.filter((o) => {
      const matchesId =
        o.sucursal_origen_id === filtroSucursalRed ||
        (o.tenant_id === filtroSucursalRed && o.sucursal_destino_id === tenantId);
      const matchesNombre = Boolean(
        targetBranch &&
          o.sucursal_origen_nombre &&
          (o.sucursal_origen_nombre === targetBranch.nombre ||
            o.sucursal_origen_nombre === targetBranch.nombre_sucursal ||
            o.sucursal_origen_nombre === getTenantBranchName(targetBranch))
      );
      return matchesId || matchesNombre;
    });
  }, [ordenes, filtroSucursalRed, tenantId, sisterBranches]);
  const hasPendingFiscalStatus = ordenes.some(
    (order) =>
      (order.ncf?.startsWith("E") || order.tipo_ecf?.startsWith("E")) &&
      !/ACEPT|PROCESAD|APROB|RECHAZ|ERROR/i.test(String(order.ecf_status || "")),
  );

  useEffect(() => {
    if (!tenantId || tenantId === "__loading__" || !hasPendingFiscalStatus) return;
    const interval = window.setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: ["ordenes", tenantId] });
      void queryClient.invalidateQueries({ queryKey: ["ecf-documents", tenantId] });
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [hasPendingFiscalStatus, queryClient, tenantId]);

  const hasSecuenciaCredito = ecfSequences.some(
    (s) =>
      s.is_active &&
      (s.tipo_ecf === "E34" || s.tipo_ecf === "34" || s.tipo_ecf === "B04") &&
      (s.valor_actual === undefined || s.valor_actual < s.valor_final),
  );
  const hasSecuenciaDebito = ecfSequences.some(
    (s) =>
      s.is_active &&
      (s.tipo_ecf === "E33" || s.tipo_ecf === "33" || s.tipo_ecf === "B03") &&
      (s.valor_actual === undefined || s.valor_actual < s.valor_final),
  );

  useEffect(() => {
    if (searchParams.filter === "almacenadas" || searchParams.filter === "sin_retirar") {
      setFiltroEntrega("sin_retirar");
    }
    if (
      searchParams.periodo &&
      ["hoy", "ayer", "esta_semana", "semana_pasada", "este_mes", "mes_pasado"].includes(
        searchParams.periodo,
      )
    ) {
      setPeriodoCreacion(searchParams.periodo as PeriodoCreacion);
    }
    if (searchParams.sucursal) {
      setFiltroSucursalRed(searchParams.sucursal);
      setCurrentPage(1);
      if (!searchParams.filter) {
        setFiltroEntrega("todas");
      }
    }
  }, [searchParams.filter, searchParams.periodo, searchParams.sucursal]);

  const emp = user?.empleado;
  const hasNotaCredito = emp ? can(emp, "nota-credito") : false;
  const hasNotaDebito = emp ? can(emp, "nota-debito") : false;
  const hasAnularOrden = emp ? can(emp, "anular-orden") : false;
  const hasCondonarDeuda = emp ? can(emp, "condonar-deuda") : false;
  const hasModuleTrasladosRed = isModuleEnabled(tenant, "traslados_red");
  const hasTransferirOrden = hasModuleTrasladosRed && emp ? can(emp, "transferir-orden") : false;

  const [limits, setLimits] = useState<any>({
    orderLimit: null,
    orderCount: 0,
    ordersReached: false,
  });
  const [loadingLimits, setLoadingLimits] = useState(false);

  useEffect(() => {
    if (!tenantId || tenantId === "__loading__" || ordenes.length === 0) return;
    if (searchParams.view) {
      const orderToView = ordenes.find(
        (o) => o.numero === searchParams.view || o.id === searchParams.view,
      );
      if (orderToView) {
        if (searchParams.action === "credito") {
          setCredito(orderToView);
          setMontoCredito(0);
          setMotivoCredito("");
          setCodigoCredito("");
        } else if (searchParams.action === "debito") {
          setDebito(orderToView);
        } else if (searchParams.action === "condonar") {
          setCondonarOrden(orderToView);
        } else if (searchParams.action === "anular") {
          setAnular(orderToView);
        } else {
          setView(orderToView);
        }
        // Clear param so it doesn't reopen if they close it
        navigate({ search: {}, replace: true });
      }
    }
  }, [searchParams.view, searchParams.action, ordenes, tenantId, navigate]);

  useEffect(() => {
    if (!tenantId || tenantId === "__loading__") return;
    setLoadingLimits(true);
    checkPlanLimits(tenant).then((lim) => {
      setLimits(lim);
      setLoadingLimits(false);
    });
  }, [tenantId, ordenes.length]);

  useEffect(() => {
    if (typeof window === "undefined" || !tenantId || tenantId === "__loading__") return;

    const handleFiscalUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["ordenes", tenantId] });
    };

    window.addEventListener("klynn-order-fiscal-updated", handleFiscalUpdate);
    window.addEventListener("klynn-sync-completed", handleFiscalUpdate);

    return () => {
      window.removeEventListener("klynn-order-fiscal-updated", handleFiscalUpdate);
      window.removeEventListener("klynn-sync-completed", handleFiscalUpdate);
    };
  }, [tenantId, queryClient]);

  const loading = loadingOrdenes || loadingClientes || loadingCaja;

  const zonas: EstanteriaZona[] = useMemo(() => {
    if (tenant?.config?.estanteria_zonas && tenant.config.estanteria_zonas.length > 0) {
      return tenant.config.estanteria_zonas;
    }
    return [];
  }, [tenant?.config?.estanteria_zonas]);

  async function cambiarUbicacionDirecta(orden: Orden, nuevaUbicacion: string) {
    const ubi = nuevaUbicacion.trim();
    const ordenActualizada: Orden = { ...orden, ubicacion_ropa: ubi || undefined };

    queryClient.setQueryData<Orden[]>(["ordenes", tenantId], (old) => {
      if (!old) return [ordenActualizada];
      return old.map((item) => (item.id === orden.id ? ordenActualizada : item));
    });
    queryClient.setQueriesData({ queryKey: ["ordenes"] }, (old: Orden[] | undefined) => {
      if (!old) return old;
      return old.map((item) => (item.id === orden.id ? ordenActualizada : item));
    });
    if (estadoModal && estadoModal.id === orden.id) {
      setEstadoModal(ordenActualizada);
    }
    if (view && view.id === orden.id) {
      setView(ordenActualizada);
    }

    try {
      await saveOrden(ordenActualizada);
      await updateOrdenEstado(orden.id, orden.estado, ubi || undefined);
      queryClient.invalidateQueries({ queryKey: ["ordenes", tenantId] });
      toast.success(ubi ? `Ubicación actualizada: ${ubi}` : "Ubicación eliminada");
    } catch (err: any) {
      toast.error("Error al actualizar la ubicación");
    }
  }

  const filt = useMemo(() => {
    return ordenes
      .filter((o) => {
        if (filtroEstado === "hoy") {
          if (!esParaHoy(o.fecha_entrega)) return false;
        } else if (filtroEstado === "urgente") {
          if (!o.es_urgente) return false;
        } else if (filtroEstado !== "todos" && o.estado !== filtroEstado) {
          return false;
        }

        // Filtro por fecha de creación (o fecha de entrega si se filtra específicamente por ENTREGADA)
        const targetDateForPeriod =
          filtroEstado === "ENTREGADA" && (o.pod_fecha || o.fecha_entrega)
            ? o.pod_fecha || o.fecha_entrega
            : o.creado_en;
        if (
          !matchesPeriodoCreacion(
            targetDateForPeriod,
            periodoCreacion,
            customFechaDesde,
            customFechaHasta,
          )
        ) {
          return false;
        }

        // Filtro de entrega (Plazo)
        if (filtroEntrega === "hoy") {
          if (!esParaHoy(o.fecha_entrega)) return false;
        } else if (filtroEntrega === "atrasadas") {
          if (!esAtrasada(o.fecha_entrega, o.estado)) return false;
        } else if (filtroEntrega === "sin_retirar") {
          const diasAlmacen = calcularDiasEnAlmacen(o.creado_en);
          const minDias =
            tenant?.config?.dias_almacenamiento_sin_retirar ||
            tenant?.config?.whatsapp?.dias_recordatorio_sin_retirar ||
            5;
          if (o.estado !== "LISTA" || diasAlmacen < minDias) return false;
        }

        // Filtro de urgencia / estado de pago
        if (filtroUrgencia === "urgente" && !o.es_urgente) return false;
        if (filtroUrgencia === "estandar" && o.es_urgente) return false;
        if (filtroUrgencia === "pagadas") {
          if (Number(o.saldo || 0) > 0) return false;
          if (filtroEstado !== "ANULADA" && o.estado === "ANULADA") return false;
        }
        if (filtroUrgencia === "pendientes_pago") {
          if (Number(o.saldo || 0) <= 0) return false;
          if (o.estado === "ANULADA") return false;
        }

        // Filtro de pago
        if (filtroPago !== "todas" && o.metodo_pago !== filtroPago) return false;

        // Filtro de ubicación (solo si conveyor está activo)
        if (isConveyorEnabled) {
          if (filtroUbicacion === "con_ubicacion") {
            if (!o.ubicacion_ropa || !o.ubicacion_ropa.trim()) return false;
          } else if (filtroUbicacion === "sin_ubicacion") {
            if (o.ubicacion_ropa && o.ubicacion_ropa.trim()) return false;
          } else if (filtroUbicacion.startsWith("zona:")) {
            const zonaId = filtroUbicacion.replace("zona:", "");
            const targetZona = zonas.find((z) => z.id === zonaId);
            if (targetZona) {
              if (!o.ubicacion_ropa) return false;
              const ubiLower = o.ubicacion_ropa.toLowerCase().trim();
              const matchesSlot = targetZona.slots?.some(
                (s) => s.toLowerCase().trim() === ubiLower,
              );
              const matchesPrefix =
                targetZona.prefijo && ubiLower.startsWith(targetZona.prefijo.toLowerCase());
              const matchesName =
                targetZona.nombre && ubiLower.includes(targetZona.nombre.toLowerCase());
              if (!matchesSlot && !matchesPrefix && !matchesName) return false;
            }
          }
        }

        // Filtro por Red / Sucursal de Origen (órdenes transferidas)
        if (filtroSucursalRed !== "ALL") {
          if (filtroSucursalRed === "LOCAL_ONLY") {
            if (o.sucursal_origen_id && o.sucursal_origen_id !== tenantId) return false;
          } else if (filtroSucursalRed === "TRANSFERIDAS_TODAS") {
            if (!o.sucursal_origen_id || o.sucursal_origen_id === tenantId) return false;
          } else if (filtroSucursalRed === "SATELLITES_ONLY") {
            const originBranch = sisterBranches.find((b) => b.id === o.sucursal_origen_id);
            if (!originBranch || isTenantPrincipal(originBranch)) return false;
          } else {
            // Específica por branch.id o nombre
            const targetBranch = sisterBranches.find((b) => b.id === filtroSucursalRed);
            const matchesId =
              o.sucursal_origen_id === filtroSucursalRed ||
              (o.tenant_id === filtroSucursalRed && o.sucursal_destino_id === tenantId);
            const matchesNombre = Boolean(
              targetBranch &&
                o.sucursal_origen_nombre &&
                (o.sucursal_origen_nombre === targetBranch.nombre ||
                  o.sucursal_origen_nombre === targetBranch.nombre_sucursal ||
                  o.sucursal_origen_nombre === getTenantBranchName(targetBranch))
            );
            if (!matchesId && !matchesNombre) return false;
          }
        }

        if (!q) return true;
        const c = clientes.find((x) => x.id === o.cliente_id);
        const nombreCompleto = c ? `${c.nombre} ${c.apellido || ""}` : "";
        const searchLower = q.toLowerCase().trim();
        const isPureNumberSearch = /^\d+$/.test(searchLower);
        const dateStr = o.creado_en
          ? new Date(o.creado_en).toLocaleDateString("es-DO").toLowerCase()
          : "";
        const dateStrFull = o.creado_en
          ? new Date(o.creado_en)
              .toLocaleDateString("es-DO", { day: "2-digit", month: "long", year: "numeric" })
              .toLowerCase()
          : "";
        const totalStr = String(o.total);
        const saldoStr = String(o.saldo);
        const matchesDate =
          !isPureNumberSearch &&
          (dateStr.includes(searchLower) || dateStrFull.includes(searchLower));

        const phoneClean = c?.telefono ? c.telefono.replace(/\D/g, "") : "";
        const searchPhoneClean = searchLower.replace(/\D/g, "");
        const matchesPhone = searchPhoneClean.length >= 3 && phoneClean.includes(searchPhoneClean);
        const matchesNotas = o.notas ? o.notas.toLowerCase().includes(searchLower) : false;

        return (
          o.numero.toLowerCase().includes(searchLower) ||
          nombreCompleto.toLowerCase().includes(searchLower) ||
          matchesPhone ||
          matchesNotas ||
          (isConveyorEnabled &&
            o.ubicacion_ropa &&
            o.ubicacion_ropa.toLowerCase().includes(searchLower)) ||
          (o.pago_referencia && o.pago_referencia.toLowerCase().includes(searchLower)) ||
          matchesDate ||
          totalStr.includes(searchLower) ||
          saldoStr.includes(searchLower)
        );
      })
      .sort((a, b) => +new Date(b.creado_en) - +new Date(a.creado_en));
  }, [
    ordenes,
    clientes,
    filtroEstado,
    filtroEntrega,
    filtroUrgencia,
    filtroPago,
    filtroUbicacion,
    filtroSucursalRed,
    sisterBranches,
    tenantId,
    zonas,
    q,
    isConveyorEnabled,
    periodoCreacion,
    customFechaDesde,
    customFechaHasta,
  ]);

  const pendientesCobroList = useMemo(() => {
    return ordenes
      .filter(
        (o) =>
          o.saldo > 0 &&
          o.metodo_pago === "PAGO_AL_RETIRAR" &&
          o.estado !== "ENTREGADA" &&
          o.estado !== "ANULADA" &&
          ["RECIBIDA", "EN_PROCESO", "LISTA", "EN_CAMINO"].includes(o.estado),
      )
      .sort((a, b) => +new Date(b.creado_en) - +new Date(a.creado_en));
  }, [ordenes]);

  const filteredPendientes = useMemo(() => {
    const searchLower = searchPendientes.trim().toLowerCase();
    const isPureNumberSearch = /^\d+$/.test(searchLower);

    return pendientesCobroList.filter((o) => {
      if (filtroPendientes !== "todos" && o.estado !== filtroPendientes) return false;
      if (!searchLower) return true;

      const clienteObj = clientes.find((c) => c.id === o.cliente_id);
      const clienteNombre = clienteObj
        ? `${clienteObj.nombre} ${clienteObj.apellido || ""}`.toLowerCase()
        : "";
      const dateStr = o.creado_en
        ? new Date(o.creado_en).toLocaleDateString("es-DO").toLowerCase()
        : "";
      const dateStrFull = o.creado_en
        ? new Date(o.creado_en)
            .toLocaleDateString("es-DO", { day: "2-digit", month: "long", year: "numeric" })
            .toLowerCase()
        : "";
      const matchesDate =
        !isPureNumberSearch && (dateStr.includes(searchLower) || dateStrFull.includes(searchLower));

      return (
        o.numero.toLowerCase().includes(searchLower) ||
        clienteNombre.includes(searchLower) ||
        (o.ubicacion_ropa && o.ubicacion_ropa.toLowerCase().includes(searchLower)) ||
        String(o.total).includes(searchLower) ||
        String(o.saldo).includes(searchLower) ||
        matchesDate
      );
    });
  }, [pendientesCobroList, filtroPendientes, searchPendientes, clientes]);

  const totalPendienteCobro = useMemo(
    () => pendientesCobroList.reduce((total, orden) => total + orden.saldo, 0),
    [pendientesCobroList],
  );

  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(filt.length / PAGE_SIZE));

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filt.slice(start, start + PAGE_SIZE);
  }, [filt, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    filt.length,
    filtroEstado,
    filtroEntrega,
    filtroUrgencia,
    filtroPago,
    filtroUbicacion,
    periodoCreacion,
    customFechaDesde,
    customFechaHasta,
    q,
  ]);

  const exportData = useMemo(() => {
    return {
      filename: "Ordenes",
      columns: isConveyorEnabled
        ? [
            "Número",
            "Cliente",
            "Estado",
            "Ubicación",
            "Total original",
            "Nota crédito",
            "Nota débito",
            "Total neto",
            "Saldo",
            "Pago",
            "Fecha",
          ]
        : [
            "Número",
            "Cliente",
            "Estado",
            "Total original",
            "Nota crédito",
            "Nota débito",
            "Total neto",
            "Saldo",
            "Pago",
            "Fecha",
          ],
      data: filt.map((o) => {
        const row = [
          o.numero,
          clientes.find((c) => c.id === o.cliente_id)?.nombre || "—",
          o.estado,
        ];
        if (isConveyorEnabled) {
          row.push(o.ubicacion_ropa || "Sin asignar");
        }
        row.push(
          formatRD(o.total),
          formatRD(getNotaCreditoMonto(o)),
          formatRD(getNotaDebitoMonto(o)),
          formatRD(getTotalNetoOrden(o)),
          formatRD(o.saldo),
          o.metodo_pago,
          formatDateTimeRD(o.creado_en),
        );
        return row;
      }),
    };
  }, [filt, clientes, isConveyorEnabled]);

  if (!user || user.tenant.id === "__loading__" || (loading && ordenes.length === 0)) {
    return <GlobalPageLoader text="Cargando órdenes..." />;
  }

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
      (typeof window !== "undefined" &&
        (JSON.parse(localStorage.getItem(`klynn_tenant_id_${tenantId}`) || "{}")?.config
          ?.usar_ubicacion_ropa ||
          JSON.parse(localStorage.getItem(`klynn_tenant_cache_${tenant?.slug || ""}`) || "{}")
            ?.config?.usar_ubicacion_ropa)),
    );

    if (estado === "LISTA" && isConveyorEnabled) {
      setConveyorOrden(o);
      setConveyorUbicacion(o.ubicacion_ropa || "");
      return false; // Don't close or treat as completed immediately
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
      if (view && view.id === o.id) {
        setView(ordenActualizada);
      }

      await saveOrden(ordenActualizada);
      await updateOrdenEstado(o.id, estado);
      queryClient.invalidateQueries({ queryKey: ["ordenes", tenantId] });

      const labels: Record<EstadoOrden, string> = {
        RECIBIDA: "Orden recibida",
        EN_PROCESO: "Orden en proceso",
        LISTA: "Orden lista",
        ENTREGADA: "Orden entregada",
        ANULADA: "Orden anulada",
      };
      toast.success(labels[estado]);
      // Notificar por WhatsApp si aplica
      if (estado === "LISTA") {
        const cli = clientes.find((c) => c.id === o.cliente_id);
        const isConsumidorFinal =
          !cli ||
          (cli.nombre === "Consumidor" && cli.apellido === "Final") ||
          (cli.id && cli.id.includes("f000"));
        const rawPhone = (cli?.telefono || "").replace(/---/g, "").trim().replace(/\D/g, "");
        const hasClientPhone = rawPhone.length >= 10;

        if (!isConsumidorFinal && hasClientPhone && cli) {
          const waConfig = tenant.config?.whatsapp;
          const isAutomatedActive = isWhatsAppAutomatedActive(waConfig);
          const allowManual = (tenant.config?.whatsapp_web_manual ?? true) !== false;
          const clienteNombre =
            [cli.nombre, cli.apellido].filter((x) => x && x !== "null").join(" ") || cli.nombre;

          if (isAutomatedActive) {
            notificarWhatsApp(tenant, cli, ordenActualizada, "lista").then(async (res) => {
              if (res.ok) {
                toastWhatsAppSuccess("WhatsApp enviado al cliente");
              } else if (allowManual) {
                const msg = await construirMensajeWhatsAppPredeterminado(
                  tenant,
                  cli,
                  ordenActualizada,
                  "lista",
                );
                showWhatsAppManualToast({
                  title: "¡Orden lista!",
                  actionText: "Notificar a",
                  clienteNombre,
                  telefono: cli.telefono,
                  mensaje: msg,
                });
              }
            });
          } else if (allowManual) {
            construirMensajeWhatsAppPredeterminado(tenant, cli, ordenActualizada, "lista").then(
              (msg) => {
                showWhatsAppManualToast({
                  title: "¡Orden lista!",
                  actionText: "Notificar a",
                  clienteNombre,
                  telefono: cli.telefono,
                  mensaje: msg,
                });
              },
            );
          }
        }
      } else if (estado === "ENTREGADA") {
        const cli = clientes.find((c) => c.id === o.cliente_id);
        if (cli) {
          notificarWhatsApp(tenant, cli, ordenActualizada, "entregada");
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
      const ordenActualizada = {
        ...conveyorOrden,
        estado: "LISTA" as EstadoOrden,
        ubicacion_ropa: ubiToUse || undefined,
      };

      queryClient.setQueryData<Orden[]>(["ordenes", tenantId], (old) => {
        if (!old) return [ordenActualizada];
        return old.map((item) => (item.id === conveyorOrden.id ? ordenActualizada : item));
      });
      queryClient.setQueriesData({ queryKey: ["ordenes"] }, (old: Orden[] | undefined) => {
        if (!old) return old;
        return old.map((item) => (item.id === conveyorOrden.id ? ordenActualizada : item));
      });

      await saveOrden(ordenActualizada);
      await updateOrdenEstado(conveyorOrden.id, "LISTA" as EstadoOrden, ubiToUse || undefined);
      queryClient.invalidateQueries({ queryKey: ["ordenes", tenantId] });

      const cli = clientes.find((c) => c.id === conveyorOrden.cliente_id);
      const isConsumidorFinal =
        !cli ||
        (cli.nombre === "Consumidor" && cli.apellido === "Final") ||
        (cli.id && cli.id.includes("f000"));
      const rawPhone = (cli?.telefono || "").replace(/---/g, "").trim().replace(/\D/g, "");
      const hasClientPhone = rawPhone.length >= 10;

      if (!isConsumidorFinal && hasClientPhone && cli) {
        const waConfig = tenant.config?.whatsapp;
        const isAutomatedActive = isWhatsAppAutomatedActive(waConfig);
        const allowManual = (tenant.config?.whatsapp_web_manual ?? true) !== false;
        const clienteNombre =
          [cli.nombre, cli.apellido].filter((x) => x && x !== "null").join(" ") || cli.nombre;

        if (isAutomatedActive) {
          notificarWhatsApp(tenant, cli, ordenActualizada, "lista").then(async (r) => {
            if (r.ok) {
              toastWhatsAppSuccess("WhatsApp enviado al cliente");
            } else if (allowManual) {
              const msg = await construirMensajeWhatsAppPredeterminado(
                tenant,
                cli,
                ordenActualizada,
                "lista",
              );
              showWhatsAppManualToast({
                title: "¡Orden lista!",
                actionText: "Notificar a",
                clienteNombre,
                telefono: cli.telefono,
                mensaje: msg,
              });
            }
          });
        } else if (allowManual) {
          construirMensajeWhatsAppPredeterminado(tenant, cli, ordenActualizada, "lista").then(
            (msg) => {
              showWhatsAppManualToast({
                title: "¡Orden lista!",
                actionText: "Notificar a",
                clienteNombre,
                telefono: cli.telefono,
                mensaje: msg,
              });
            },
          );
        }
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

  async function anularOrden() {
    if (!anular || motivoAnular.length < 5) {
      toast.error("Indica el motivo (mín 5 caracteres)");
      return;
    }
    if (isAnulando) return;

    setIsAnulando(true);
    try {
      let notaCreditoNCF = "";
      let notaCreditoMetadata: Partial<Orden> = {};

      // 1. ECUADOR: Generar Nota de Crédito SRI si la orden tenía clave de acceso SRI
      if (tenant.pais_codigo === "EC" && anular.sri_clave_acceso && tenant.config?.sri_config?.activo) {
        try {
          const cliente = clientes.find((c) => c.id === anular.cliente_id) || null;
          const sriRes = await emitirNotaCreditoSRI({
            orden: anular,
            cliente,
            tenant,
            motivo: motivoAnular.trim() || "Anulación de orden",
            montoDevolucion: anular.total,
          });
          if (!sriRes.success) {
            throw new Error(`El SRI no autorizó la Nota de Crédito: ${sriRes.error || "No autorizada"}`);
          }
          notaCreditoNCF = sriRes.claveAcceso || "";
          notaCreditoMetadata = {
            nota_credito_qr: sriRes.rideUrl,
            nota_credito_estado: sriRes.estado || "AUTORIZADO",
            nota_credito_pdf_url: sriRes.rideUrl,
            nota_credito_xml_url: sriRes.xmlUrl,
          };
          toast.success(`Nota de Crédito SRI Autorizada para anulación.`);
        } catch (e: any) {
          console.error("Error fiscal SRI:", e);
          throw new Error(e?.message || "El SRI no aceptó la Nota de Crédito. La orden no fue anulada.");
        }
      } else if (anular.tipo_ecf && anular.ncf) {
        try {
          const cfg = await getECFConfig(tenant.id);
          if (!isECFReady(cfg)) {
            throw new Error(
              "La facturación electrónica no está configurada. No se puede anular localmente una factura ya emitida ante la DGII.",
            );
          }

          const cliente = clientes.find((c) => c.id === anular.cliente_id) || null;
          const res = await emitirECF(
            anular,
            cliente,
            cfg?.pronesoft_tenant_id || undefined,
            cfg,
            tenant,
            "E34", // Tipo: Nota de Crédito
            {
              ncf: anular.ncf,
              date: anular.creado_en,
              code: codigoAnular, // 01=Anulación total, etc.
              reason: motivoAnular,
            },
          );

          const legalStatus = String(res.legal_status || "").toUpperCase();
          if (legalStatus !== "ACCEPTED") {
            throw new Error(
              `EF2 generó ${res.encf || "la Nota de Crédito"}, pero la DGII todavía no la ha aceptado (estado: ${legalStatus || "PENDIENTE"}). La orden no fue anulada.`,
            );
          }

          notaCreditoNCF = res.encf;
          notaCreditoMetadata = {
            nota_credito_id: res.document.id,
            nota_credito_qr: res.document.qr_content || res.document.document_stamp_url,
            nota_credito_codigo_seguridad: res.document.security_code,
            nota_credito_fecha_firma: res.document.signature_date,
            nota_credito_fecha_emision: res.document.fecha_emision,
            nota_credito_estado: legalStatus,
            nota_credito_pdf_url: res.document.pdf_url,
            nota_credito_xml_url: res.document.xml_url,
          };
          toast.info(`Nota de Crédito aceptada: ${notaCreditoNCF} 📄`);
        } catch (e: any) {
          console.error("Error fiscal:", e);
          throw new Error(
            e?.message || "EF2/DGII no aceptó la Nota de Crédito. La orden no fue anulada.",
          );
        }
      }

      // 2. Actualizar orden
      const ordenAnulada: Orden = {
        ...anular,
        estado: "ANULADA",
        motivo_anulacion: motivoAnular,
        motivo_anulacion_codigo: codigoAnular,
        nota_credito_ncf: notaCreditoNCF || undefined,
        nota_credito_anula_totalmente: Boolean(notaCreditoNCF),
        ...notaCreditoMetadata,
      };

      await saveOrden(ordenAnulada);

      // 3. Registrar egreso automático si hubo pago y hay caja abierta
      if (anular.pagado > 0 && cajaAbierta) {
        await saveMovimiento({
          id: uid("mov"),
          tenant_id: tenant.id,
          caja_id: cajaAbierta.id,
          empleado_id: user.empleado.id,
          tipo: "EGRESO",
          concepto: `Reembolso: Anulación ${anular.numero}`,
          monto: anular.pagado,
          metodo: anular.metodo_pago,
          referencia: notaCreditoNCF ? `DGII:E34:${notaCreditoNCF}` : "ANULACION_INTERNA",
          orden_id: anular.id,
          creado_en: new Date().toISOString(),
        });
        toast.info(
          `Se registró un egreso de ${formatRD(anular.pagado)} en caja por el reembolso. 💸`,
        );
      }

      setAnular(null);
      setConfirmarAnulacion(false);
      setMotivoAnular("");
      queryClient.invalidateQueries({ queryKey: ["ordenes", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["movimientos", tenantId] });

      // ACTIVAR MODAL DE IMPRESIÓN AUTOMÁTICAMENTE
      setShowPrint(ordenAnulada);

      toast.success("Orden anulada correctamente ✓");
    } catch (err: any) {
      console.error("DEBUG: Error en anularOrden:", err);
      toast.error(err?.message || "No se pudo anular la orden.");
    } finally {
      setIsAnulando(false);
    }
  }

  async function generarNotaDebito() {
    if (!debito) return;
    if (montoDebito <= 0) {
      toast.error("Indica un monto mayor que cero.");
      return;
    }
    if (motivoDebito.trim().length < 5) {
      toast.error("Indica un motivo de al menos 5 caracteres.");
      return;
    }
    if (isGenerandoDebito) return;
    setIsGenerandoDebito(true);
    try {
      const isECF = debito.ncf?.startsWith("E");
      let notaDebitoNCF = "";
      let notaDebitoID = "";
      let notaDebitoMetadata: Partial<Orden> = {};

      if (tenant.pais_codigo === "EC" && (debito.sri_clave_acceso || tenant.config?.sri_config?.activo)) {
        try {
          const cliente = clientes.find((c) => c.id === debito.cliente_id) || null;
          const res = await emitirNotaDebitoSRI({
            orden: debito,
            cliente,
            tenant,
            motivo: motivoDebito,
            montoAumento: montoDebito,
          });
          if (!res.success) {
            throw new Error(`El SRI no autorizó la Nota de Débito: ${res.error || "No autorizada"}`);
          }
          notaDebitoNCF = res.claveAcceso || "";
          notaDebitoMetadata = {
            nota_debito_qr: res.rideUrl,
            nota_debito_estado: res.estado || "AUTORIZADO",
            nota_debito_pdf_url: res.rideUrl,
            nota_debito_xml_url: res.xmlUrl,
          };
          toast.success(`Nota de Débito SRI Autorizada.`);
        } catch (e: any) {
          console.error("Error fiscal SRI:", e);
          throw new Error(e?.message || "El SRI no aceptó la Nota de Débito.");
        }
      } else if (isECF) {
        try {
          const cfg = await getECFConfig(tenant.id);
          if (isECFReady(cfg)) {
            const cliente = clientes.find((c) => c.id === debito.cliente_id) || null;
            // Clonamos la orden para ajustar el total de la ND
            const ordenND = { ...debito, total: montoDebito, subtotal: montoDebito, itbis: 0 };
            const res = await emitirECF(
              ordenND,
              cliente,
              cfg?.pronesoft_tenant_id || undefined,
              cfg,
              tenant,
              "E33", // Nota de Débito
              {
                ncf: debito.ncf!,
                date: debito.creado_en,
                code: "03",
                reason: motivoDebito,
              },
            );
            const legalStatus = String(res.legal_status || "").toUpperCase();
            if (legalStatus !== "ACCEPTED") {
              throw new Error(`La DGII no aceptó la E33 (estado: ${legalStatus || "PENDIENTE"}).`);
            }
            notaDebitoNCF = res.encf;
            notaDebitoID = res.document.id;
            notaDebitoMetadata = {
              nota_debito_qr: res.document.qr_content || res.document.document_stamp_url,
              nota_debito_codigo_seguridad: res.document.security_code,
              nota_debito_fecha_firma: res.document.signature_date,
              nota_debito_fecha_emision: res.document.fecha_emision,
              nota_debito_estado: legalStatus,
              nota_debito_pdf_url: res.document.pdf_url,
              nota_debito_xml_url: res.document.xml_url,
            };
          } else {
            throw new Error(
              "La facturación electrónica no está configurada; no se puede crear una E33 local para una factura DGII.",
            );
          }
        } catch (e: any) {
          console.error("Error ND Fiscal:", e);
          throw new Error(e?.message || "Error al emitir la Nota de Débito fiscal.");
        }
      }

      const ordenActualizada: Orden = {
        ...debito,
        total: debito.total + montoDebito,
        saldo: debito.saldo + montoDebito,
        nota_debito_ncf: notaDebitoNCF || undefined,
        nota_debito_id: notaDebitoID || undefined,
        nota_debito_monto: Number(((debito.nota_debito_monto || 0) + montoDebito).toFixed(2)),
        ...notaDebitoMetadata,
      };

      await saveOrden(ordenActualizada);

      setDebito(null);
      setConfirmarNotaDebito(false);
      setMontoDebito(0);
      setMotivoDebito("");
      queryClient.invalidateQueries({ queryKey: ["ordenes", tenantId] });
      setShowPrint(ordenActualizada);

      toast.success("Nota de Débito generada correctamente ✓");
    } catch (err: any) {
      console.error("Error ND:", err);
      toast.error(err?.message || "Error al generar la Nota de Débito");
    } finally {
      setIsGenerandoDebito(false);
    }
  }

  async function generarNotaCredito() {
    if (!credito) return;
    if (!codigoCredito) {
      toast.error("Selecciona el tipo de modificación DGII.");
      return;
    }
    if (motivoCredito.trim().length < 5) {
      toast.error("Indica un motivo descriptivo de al menos 5 caracteres.");
      return;
    }
    const anulaTotalmente = codigoCredito === "01";
    const corrigeMontos = codigoCredito === "03";
    if (corrigeMontos && (montoCredito <= 0 || montoCredito > credito.total)) {
      toast.error(`El monto debe ser mayor que cero y no superar ${formatRD(credito.total)}.`);
      return;
    }
    if (isGenerandoCredito) return;

    setIsGenerandoCredito(true);
    try {
      const isECF = credito.ncf?.startsWith("E");
      let notaCreditoNCF = "";
      let notaCreditoID = "";
      let notaCreditoMetadata: Partial<Orden> = {};
      const montoAcreditado = anulaTotalmente ? credito.total : corrigeMontos ? montoCredito : 0;
      const montoDocumento = montoAcreditado > 0 ? montoAcreditado : credito.total;

      if (tenant.pais_codigo === "EC" && (credito.sri_clave_acceso || tenant.config?.sri_config?.activo)) {
        try {
          const cliente = clientes.find((c) => c.id === credito.cliente_id) || null;
          const res = await emitirNotaCreditoSRI({
            orden: credito,
            cliente,
            tenant,
            motivo: motivoCredito,
            montoDevolucion: montoDocumento,
          });
          if (!res.success) {
            throw new Error(`El SRI no autorizó la Nota de Crédito: ${res.error || "No autorizada"}`);
          }
          notaCreditoNCF = res.claveAcceso || "";
          notaCreditoMetadata = {
            nota_credito_qr: res.rideUrl,
            nota_credito_estado: res.estado || "AUTORIZADO",
            nota_credito_pdf_url: res.rideUrl,
            nota_credito_xml_url: res.xmlUrl,
          };
          toast.success(`Nota de Crédito SRI Autorizada.`);
        } catch (e: any) {
          console.error("Error NC SRI:", e);
          throw new Error(e?.message || "El SRI no aceptó la Nota de Crédito.");
        }
      } else if (isECF) {
        try {
          const cfg = await getECFConfig(tenant.id);
          if (isECFReady(cfg)) {
            const cliente = clientes.find((c) => c.id === credito.cliente_id) || null;
            // Para corrección de montos conservamos la proporción base/ITBIS
            // del comprobante original. Texto y contingencia no afectan montos.
            const factor = credito.total > 0 ? montoDocumento / credito.total : 1;
            const ordenNC = {
              ...credito,
              total: montoDocumento,
              subtotal: Number((credito.subtotal * factor).toFixed(2)),
              itbis: Number((credito.itbis * factor).toFixed(2)),
              descuento: Number((credito.descuento * factor).toFixed(2)),
            };
            const res = await emitirECF(
              ordenNC,
              cliente,
              cfg?.pronesoft_tenant_id || undefined,
              cfg,
              tenant,
              "E34", // Nota de Crédito
              {
                ncf: credito.ncf!,
                date: credito.creado_en,
                code: codigoCredito,
                reason: motivoCredito,
              },
            );
            const legalStatus = String(res.legal_status || "").toUpperCase();
            if (legalStatus !== "ACCEPTED") {
              throw new Error(`La DGII no aceptó la E34 (estado: ${legalStatus || "PENDIENTE"}).`);
            }
            notaCreditoNCF = res.encf;
            notaCreditoID = res.document.id;
            notaCreditoMetadata = {
              nota_credito_qr: res.document.qr_content || res.document.document_stamp_url,
              nota_credito_codigo_seguridad: res.document.security_code,
              nota_credito_fecha_firma: res.document.signature_date,
              nota_credito_fecha_emision: res.document.fecha_emision,
              nota_credito_estado: legalStatus,
              nota_credito_pdf_url: res.document.pdf_url,
              nota_credito_xml_url: res.document.xml_url,
            };
          } else {
            throw new Error(
              "La facturación electrónica no está configurada; no se puede crear una E34 local para una factura DGII.",
            );
          }
        } catch (e: any) {
          console.error("Error NC Fiscal:", e);
          throw new Error(e?.message || "Error al emitir la Nota de Crédito fiscal.");
        }
      }

      const ordenActualizada: Orden = {
        ...credito,
        // El total original se conserva como historial; el efecto fiscal neto
        // queda representado por nota_credito_monto y la E34 aceptada.
        saldo: Math.max(0, credito.saldo - montoAcreditado),
        estado: anulaTotalmente ? "ANULADA" : credito.estado,
        nota_credito_ncf: notaCreditoNCF || undefined,
        nota_credito_id: notaCreditoID || undefined,
        nota_credito_monto: Number(
          ((credito.nota_credito_monto || 0) + montoAcreditado).toFixed(2),
        ),
        nota_credito_anula_totalmente: Boolean(
          credito.nota_credito_anula_totalmente || anulaTotalmente,
        ),
        ...notaCreditoMetadata,
      };

      await saveOrden(ordenActualizada);

      const montoReembolso = Math.min(credito.pagado, montoAcreditado);
      if (cajaAbierta && montoReembolso > 0) {
        await saveMovimiento({
          id: uid("mov"),
          tenant_id: tenant.id,
          caja_id: cajaAbierta.id,
          empleado_id: user.empleado.id,
          tipo: "EGRESO",
          concepto: `Reembolso NC: ${motivoCredito || "Nota de Crédito"} - ${credito.numero}`,
          monto: montoReembolso,
          metodo: credito.metodo_pago,
          referencia: notaCreditoNCF ? `DGII:E34:${notaCreditoNCF}` : "NOTA_CREDITO_INTERNA",
          orden_id: credito.id,
          creado_en: new Date().toISOString(),
        });
      }

      setCredito(null);
      setConfirmarNotaCredito(false);
      setMontoCredito(0);
      setMotivoCredito("");
      setCodigoCredito("");
      queryClient.invalidateQueries({ queryKey: ["ordenes", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["movimientos", tenantId] });
      setShowPrint(ordenActualizada);

      toast.success("Nota de Crédito generada correctamente ✓");
    } catch (err: any) {
      console.error("Error NC:", err);
      toast.error(err?.message || "Error al generar la Nota de Crédito");
    } finally {
      setIsGenerandoCredito(false);
    }
  }

  if (loading && ordenes.length === 0) {
    return <GlobalPageLoader text="Cargando órdenes..." />;
  }

  if (showPendientes) {
    const filtrosDeCobro = [
      {
        value: "todos" as const,
        label: "Todas",
        count: pendientesCobroList.length,
        icon: LayoutGrid,
        bg: "bg-slate-100 text-slate-700 border-slate-200",
        activeBg: "bg-[#2c4e82] text-white border-[#2c4e82] shadow-md",
      },
      {
        value: "RECIBIDA" as const,
        label: "Recibidas",
        count: pendientesCobroList.filter((o) => o.estado === "RECIBIDA").length,
        icon: Inbox,
        bg: "bg-blue-50 text-blue-700 border-blue-200",
        activeBg: "bg-blue-600 text-white border-blue-600 shadow-md",
      },
      {
        value: "EN_PROCESO" as const,
        label: "En proceso",
        count: pendientesCobroList.filter((o) => o.estado === "EN_PROCESO").length,
        icon: RefreshCw,
        bg: "bg-amber-50 text-amber-700 border-amber-200",
        activeBg: "bg-amber-500 text-white border-amber-500 shadow-md",
      },
      {
        value: "LISTA" as const,
        label: "Listas",
        count: pendientesCobroList.filter((o) => o.estado === "LISTA").length,
        icon: CircleCheck,
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        activeBg: "bg-emerald-600 text-white border-emerald-600 shadow-md",
      },
      {
        value: "EN_CAMINO" as const,
        label: "En camino",
        count: pendientesCobroList.filter((o) => o.estado === "EN_CAMINO").length,
        icon: Truck,
        bg: "bg-purple-50 text-purple-700 border-purple-200",
        activeBg: "bg-purple-600 text-white border-purple-600 shadow-md",
      },
    ];
    const listasParaEntrega = pendientesCobroList.filter(
      (o) => o.estado === "LISTA" || o.estado === "EN_CAMINO",
    ).length;

    return (
      <div className="space-y-5 pb-8 animate-in fade-in slide-in-from-bottom-1 duration-300">
        <section className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/[0.10] via-white to-emerald-50/70 shadow-sm dark:border-primary/20 dark:from-primary/20 dark:via-slate-950 dark:to-emerald-950/30">
          <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-300/10 blur-3xl" />

          <div className="relative p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                onClick={() => setShowPendientes(false)}
                className="h-9 gap-2 rounded-xl border border-primary bg-primary px-3 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 hover:text-primary-foreground"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
                Volver a Órdenes
              </Button>

              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50/90 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-amber-700 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Cobros al retirar
              </span>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(580px,0.95fr)] xl:items-end">
              <div className="flex items-start gap-3.5">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                  <Coins className="h-6 w-6" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">
                    Centro de cobros
                  </p>
                  <h1 className="mt-1 font-display text-2xl font-black tracking-tight text-slate-950 md:text-3xl dark:text-white">
                    Órdenes pendientes de cobro
                  </h1>
                  <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-600 md:text-sm dark:text-slate-400">
                    Encuentra las órdenes con pago al retirar y registra cada cobro desde un solo
                    lugar.
                  </p>
                </div>
              </div>

              <div className="grid min-w-0 grid-cols-2 gap-2.5 md:grid-cols-[0.82fr_1.5fr_0.95fr] xl:min-w-[580px]">
                <div className="order-1 flex min-h-[104px] min-w-0 flex-col justify-between rounded-2xl border border-white/90 bg-white/80 p-3.5 shadow-sm backdrop-blur transition-transform hover:-translate-y-0.5 dark:border-white/10 dark:bg-slate-900/75">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:ring-blue-900/60">
                      <Receipt className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <span className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                      Órdenes
                    </span>
                  </div>
                  <div className="flex items-baseline justify-center gap-2 text-center">
                    <p className="text-2xl font-black tabular-nums tracking-tight text-slate-950 dark:text-white">
                      {pendientesCobroList.length}
                    </p>
                    <span className="text-[9px] font-semibold text-slate-400">Pendientes</span>
                  </div>
                </div>

                <div className="order-3 col-span-2 flex min-h-[104px] min-w-0 flex-col justify-between overflow-visible rounded-2xl border border-primary/15 bg-gradient-to-br from-white via-white to-emerald-50/90 p-3.5 shadow-sm backdrop-blur transition-transform hover:-translate-y-0.5 md:order-2 md:col-span-1 dark:border-primary/25 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/40">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:bg-primary/20">
                        <Wallet className="h-4 w-4" strokeWidth={2} />
                      </span>
                      <span className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                        Total por cobrar
                      </span>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[8px] font-extrabold uppercase tracking-wider text-primary">
                      Saldo
                    </span>
                  </div>
                  <p className="mt-2 whitespace-nowrap text-[clamp(1.35rem,2vw,1.8rem)] font-black tabular-nums tracking-[-0.04em] text-primary">
                    {formatRD(totalPendienteCobro)}
                  </p>
                </div>

                <div className="order-2 flex min-h-[104px] min-w-0 flex-col justify-between rounded-2xl border border-white/90 bg-white/80 p-3.5 shadow-sm backdrop-blur transition-transform hover:-translate-y-0.5 md:order-3 dark:border-white/10 dark:bg-slate-900/75">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-900/60">
                      <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <span className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                      Para entregar
                    </span>
                  </div>
                  <div className="flex items-baseline justify-center gap-2 text-center">
                    <p className="text-2xl font-black tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
                      {listasParaEntrega}
                    </p>
                    <span className="text-[9px] font-semibold text-slate-400">Listas</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div>
          <Card className="flex flex-wrap items-center gap-3 p-4">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchPendientes}
                onChange={(e) => setSearchPendientes(e.target.value)}
                placeholder="Buscar por número de orden, cliente, monto, fecha..."
                aria-label="Buscar órdenes pendientes de cobro"
                className="pl-10"
              />
            </div>
          </Card>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="custom-scrollbar flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              {filtrosDeCobro.map((filtro) => {
                const active = filtroPendientes === filtro.value;
                const Icon = filtro.icon;
                return (
                  <button
                    key={filtro.value}
                    type="button"
                    onClick={() => setFiltroPendientes(filtro.value)}
                    className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${
                      active ? filtro.activeBg : filtro.bg
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {filtro.label}
                    <span
                      className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                        active ? "bg-white/25" : "bg-black/5"
                      }`}
                    >
                      {filtro.count}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="shrink-0 text-[10px] font-bold text-slate-500 dark:text-slate-400">
              Mostrando{" "}
              <span className="text-slate-900 dark:text-white">{filteredPendientes.length}</span> de{" "}
              {pendientesCobroList.length}
            </p>
          </div>
        </div>

        {pendientesCobroList.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white px-6 py-16 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-900/60">
              <CheckCircle2 className="h-7 w-7" strokeWidth={1.8} />
              <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-4 border-white bg-emerald-500 dark:border-slate-950" />
            </div>
            <h4 className="mt-5 text-lg font-black text-slate-950 dark:text-white">
              Todo está cobrado
            </h4>
            <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-500 dark:text-slate-400">
              No hay órdenes con pago al retirar que tengan un saldo pendiente.
            </p>
            <Button
              onClick={() => setShowPendientes(false)}
              className="mt-5 h-9 rounded-xl bg-primary px-4 text-xs font-bold text-white hover:bg-primary/90"
            >
              Volver a Órdenes
            </Button>
          </div>
        ) : filteredPendientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-950/70">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <Search className="h-5 w-5" />
            </div>
            <h4 className="mt-4 text-sm font-extrabold text-slate-900 dark:text-white">
              No encontramos coincidencias
            </h4>
            <p className="mt-1 max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">
              Prueba con otro número de orden, cliente, monto o selecciona un estado diferente.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearchPendientes("");
                setFiltroPendientes("todos");
              }}
              className="mt-4 h-9 rounded-xl text-xs font-bold"
            >
              Limpiar búsqueda y filtros
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredPendientes.map((o) => (
              <PendienteCard
                key={o.id}
                o={o}
                clientes={clientes}
                cajaAbierta={cajaAbierta}
                onCobrarClick={setCobrarOrden}
                compact
              />
            ))}
          </div>
        )}

        {/* Modal de cobro unificado */}
        {cobrarOrden && (
          <CobrarOrdenDialog
            orden={cobrarOrden}
            onClose={() => setCobrarOrden(null)}
            tenant={tenant}
            cajaAbierta={cajaAbierta}
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
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Control de Órdenes"
        description="Seguimiento en tiempo real de prendas, estados de lavado, entregas y pagos pendientes"
      >
        {/* Pendientes de pago (Amarillo Jabón #F0B900 Sólido) */}
        <Button
          onClick={() => setShowPendientes(true)}
          className="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-extrabold text-xs sm:text-sm bg-[#F0B900] hover:bg-[#d9a700] text-[#1B4B73] border border-[#F0B900] shadow-xs transition-all cursor-pointer shrink-0 whitespace-nowrap h-10 active:scale-95"
        >
          <Coins className="h-4 w-4 text-[#1B4B73] shrink-0" />
          <span>Pendientes de pago</span>
          {pendientesCobroList.length > 0 && (
            <span className="ml-0.5 rounded-full px-2 py-0.5 text-[10px] font-black leading-none bg-[#1B4B73] text-white shadow-xs">
              {pendientesCobroList.length}
            </span>
          )}
        </Button>

        {/* Exportar (Azul Añil #1B4B73 Sólido) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="flex items-center gap-2 rounded-xl h-10 px-4 font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-xs text-xs sm:text-sm cursor-pointer transition-all active:scale-95">
              <Download className="h-4 w-4 text-[#F0B900] shrink-0" />
              <span>Exportar</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-2xl shadow-xl p-1.5">
            <DropdownMenuItem
              className="gap-2 cursor-pointer py-2 rounded-xl text-xs font-bold"
              onClick={() => {
                try {
                  let filtroActivoDesc = "Todas las órdenes";
                  const partes: string[] = [];
                  if (periodoCreacion !== "todas")
                    partes.push(
                      `Período: ${getPeriodoLabel(periodoCreacion, customFechaDesde, customFechaHasta)}`,
                    );
                  if (filtroEstado !== "todos") partes.push(`Estado: ${filtroEstado}`);
                  if (filtroEntrega !== "todas") partes.push(`Entrega: ${filtroEntrega}`);
                  if (filtroUrgencia !== "todas") {
                    const urgLabel =
                      filtroUrgencia === "urgente"
                        ? "Urgentes"
                        : filtroUrgencia === "estandar"
                          ? "Estándar"
                          : filtroUrgencia === "pagadas"
                            ? "Ya pagadas"
                            : filtroUrgencia === "pendientes_pago"
                              ? "Pendientes de pago"
                              : filtroUrgencia;
                    partes.push(`Prioridad: ${urgLabel}`);
                  }
                  if (filtroPago !== "todas") partes.push(`Pago: ${filtroPago}`);
                  if (q.trim()) partes.push(`Búsqueda: "${q}"`);
                  if (partes.length > 0) filtroActivoDesc = partes.join(" | ");

                  exportOrdenesToExcel({
                    ordenes: filt,
                    clientes,
                    tenantName: user?.tenant?.nombre || "Klynn Lavandería",
                    isConveyorEnabled,
                    filtroActivo: filtroActivoDesc,
                  });
                  toast.success("Órdenes exportadas a Excel (.xlsx) con diseño exitosamente");
                } catch (err) {
                  console.error("Error al exportar órdenes a Excel:", err);
                  toast.error("Error al exportar a Excel");
                }
              }}
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 cursor-pointer py-2 rounded-xl text-xs font-bold"
              onClick={() => setIsPrintingList(true)}
            >
              <Printer className="h-4 w-4 text-rose-600" /> PDF / Impresión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Imprimir (Esmeralda Sólido) */}
        <Button
          className="flex items-center gap-2 rounded-xl h-10 px-4 font-bold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-xs text-xs sm:text-sm cursor-pointer transition-all active:scale-95 shrink-0"
          onClick={() => setIsPrintingList(true)}
        >
          <Printer className="h-4 w-4 text-white shrink-0" />
          <span>Imprimir</span>
        </Button>
      </PageHeader>

      {limits.orderLimit !== null &&
        (() => {
          const count = limits.orderCount || 0;
          const limit = limits.orderLimit;
          const effectiveLimit = limits.effectiveLimit || limit + (limits.graceBonus || 15);
          const isGrace = !!limits.isGracePeriod;
          const isDanger = !!limits.ordersReached;
          const pct = Math.min(100, Math.round((count / limit) * 100));
          const isWarning = !isDanger && !isGrace && pct >= 80;

          return (
            <div
              className={`mb-4 p-3.5 sm:p-4 rounded-2xl border transition-all relative overflow-hidden ${
                isDanger
                  ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 shadow-2xs"
                  : isGrace
                    ? "bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border-amber-500/30 dark:border-amber-500/20 shadow-2xs"
                    : isWarning
                      ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 shadow-2xs"
                      : "bg-white/90 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 shadow-2xs"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                {/* Left side: Icon + Title + Description */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-2xs ${
                      isDanger
                        ? "bg-rose-500/15 text-rose-600 border-rose-500/25"
                        : isGrace
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse"
                          : isWarning
                            ? "bg-amber-500/15 text-amber-600 border-amber-500/25"
                            : "bg-primary/10 text-primary border-primary/20"
                    }`}
                  >
                    {isDanger ? (
                      <AlertTriangle className="h-5 w-5 stroke-[2.5]" />
                    ) : isGrace ? (
                      <Gift className="h-5 w-5 stroke-[2.5]" />
                    ) : isWarning ? (
                      <Zap className="h-5 w-5 stroke-[2.5]" />
                    ) : (
                      <Rocket className="h-5 w-5 stroke-[2.5]" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-foreground">
                        {isDanger
                          ? "Límite del plan y cortesía agotados"
                          : isGrace
                            ? "🎁 Período de Gracia: +15 órdenes de cortesía activas"
                            : "Capacidad mensual del plan"}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs ${
                          isDanger
                            ? "bg-rose-500 text-white"
                            : isGrace
                              ? "bg-gradient-to-r from-amber-500 to-indigo-600 text-white"
                              : isWarning
                                ? "bg-amber-500 text-white"
                                : "bg-primary text-white"
                        }`}
                      >
                        {isDanger
                          ? "100% CONSUMIDO"
                          : isGrace
                            ? `${limits.graceRemaining ?? 0} DE REGALO RESTANTES`
                            : `${pct}% consumido`}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                      {isDanger
                        ? "Has utilizado todas las órdenes de tu plan y las 15 de cortesía. Actualiza tu plan para continuar registrando."
                        : isGrace
                          ? `Has alcanzado el límite de tu plan (${limit} órdenes). Klynn te ha otorgado 15 órdenes de cortesía (has usado ${limits.graceUsed ?? 0} de 15) para que tu mostrador no se detenga. Recuerda actualizar tu plan antes de que se agoten.`
                          : isWarning
                            ? "Estás cerca del límite mensual. Considera cambiar a un plan superior."
                            : "Llevas un excelente ritmo en el ciclo de facturación actual."}
                    </p>
                  </div>
                </div>

                {/* Right side: Progress meter + Upgrade Button */}
                <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                  {/* Visual Meter */}
                  <div className="flex flex-col items-start md:items-end gap-1.5 min-w-[140px]">
                    <div className="text-xs font-display flex items-baseline gap-1">
                      <strong className="text-foreground font-black text-sm">{count}</strong>
                      <span className="text-muted-foreground font-bold">
                        / {isGrace || isDanger ? effectiveLimit : limit} órdenes
                      </span>
                    </div>
                    <div className="w-36 sm:w-48 h-3 rounded-full bg-slate-100 dark:bg-slate-800/80 overflow-hidden p-0.5 border border-slate-200/90 dark:border-slate-700 shadow-inner">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isDanger
                            ? "bg-rose-500 shadow-xs"
                            : isGrace
                              ? "bg-gradient-to-r from-amber-500 to-indigo-600 shadow-xs"
                              : isWarning
                                ? "bg-amber-500 shadow-xs"
                                : "bg-primary shadow-xs"
                        }`}
                        style={{
                          width: `${Math.max(
                            5,
                            isGrace
                              ? Math.min(100, Math.round((count / (effectiveLimit || limit)) * 100))
                              : pct,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Button */}
                  <Button
                    onClick={() =>
                      navigate({
                        to: "/t/$slug/configuracion",
                        params: { slug: tenant.slug },
                        search: { tab: "plan" } as any,
                      })
                    }
                    className="flex items-center gap-2 h-10 px-4 sm:px-5 rounded-xl font-bold text-xs sm:text-sm bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <Sparkles className="h-4 w-4 text-[#F0B900] shrink-0" />
                    <span>Ver Planes</span>
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Tarjetas Profesionales de Órdenes Recibidas y Entregadas por Día */}
      <OrdenesDailyMetricsCards
        ordenes={ordenes}
        periodoCreacion={periodoCreacion}
        filtroEstado={filtroEstado}
        customFechaDesde={customFechaDesde}
        filtroSucursalRed={filtroSucursalRed}
        onFilterPeriodo={(p, customDate) => {
          if (customDate) {
            setPeriodoCreacion("personalizado");
            setCustomFechaDesde(customDate);
            setCustomFechaHasta(customDate);
          } else {
            setPeriodoCreacion(p);
            setCustomFechaDesde("");
            setCustomFechaHasta("");
          }
        }}
        onFilterEstado={(st) => setFiltroEstado(st)}
        onResetFilter={() => {
          setPeriodoCreacion("todas");
          setFiltroEstado("todos");
          setCustomFechaDesde("");
          setCustomFechaHasta("");
          setFiltroSucursalRed("LOCAL_ONLY");
        }}
        toolbarActions={
          hasModuleTrasladosRed ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs sm:text-[12.5px] font-extrabold text-[#1B4B73] dark:text-sky-200 tracking-tight select-none">
                Consulta y transfiere órdenes entre sucursales
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  onClick={handleOpenNetworkSearch}
                  className="h-10 px-3.5 rounded-xl font-bold text-xs sm:text-sm bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-2xs flex items-center gap-1.5 shrink-0 cursor-pointer transition-all active:scale-95"
                  title="Consultar órdenes en toda la red de sucursales"
                >
                  <Globe className="h-4 w-4 text-[#F0B900]" />
                  <span className="hidden sm:inline">Consultar en la Red</span>
                  <span className="sm:hidden">Red</span>
                </Button>

                <span className="text-[11px] font-black text-[#1B4B73] dark:text-sky-200 tracking-wider uppercase select-none px-0.5">
                  Filtrar:
                </span>

                <NetworkBranchSelect
                  tenants={sisterBranches}
                  currentTenant={tenant}
                  value={filtroSucursalRed}
                  onChange={(val) => {
                    setFiltroSucursalRed(val);
                    setCurrentPage(1);
                  }}
                  orderCountsByBranch={orderCountsByBranch}
                  totalLocalesCount={totalLocalesCount}
                  totalTransferidasCount={totalTransferidasCount}
                  showTransferFilterOptions
                  triggerClassName="h-10 rounded-xl"
                  className="shrink-0"
                />
              </div>
            </div>
          ) : undefined
        }
      />

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por número de orden, cliente, monto, fecha..."
            className="pl-10"
          />
        </div>
        <Select
          value={periodoCreacion}
          onValueChange={(v: PeriodoCreacion) => {
            if (v === "personalizado") {
              setTempDesde(customFechaDesde || formatLocalDateToInput(new Date()));
              setTempHasta(customFechaHasta || formatLocalDateToInput(new Date()));
              setShowCustomDateModal(true);
            } else {
              setPeriodoCreacion(v);
            }
          }}
        >
          <SelectTrigger className="w-[185px] font-semibold text-xs shrink-0">
            <Calendar className="h-4 w-4 text-primary shrink-0 mr-1.5" />
            <SelectValue placeholder="Fecha de creación" />
          </SelectTrigger>
          <SelectContent className="min-w-[230px]">
            <SelectItem
              value="todas"
              icon={<CalendarRange className="h-4 w-4 text-primary shrink-0 transition-colors group-data-[highlighted]:text-white group-hover:text-white" />}
            >
              Todas las fechas
            </SelectItem>
            <SelectItem
              value="hoy"
              icon={<CalendarCheck className="h-4 w-4 text-primary shrink-0 transition-colors group-data-[highlighted]:text-white group-hover:text-white" />}
            >
              Creadas hoy
            </SelectItem>
            <SelectItem
              value="ayer"
              icon={<History className="h-4 w-4 text-primary shrink-0 transition-colors group-data-[highlighted]:text-white group-hover:text-white" />}
            >
              Creadas ayer
            </SelectItem>
            <SelectItem
              value="esta_semana"
              icon={<CalendarDays className="h-4 w-4 text-primary shrink-0 transition-colors group-data-[highlighted]:text-white group-hover:text-white" />}
            >
              Esta semana
            </SelectItem>
            <SelectItem
              value="semana_pasada"
              icon={<CalendarClock className="h-4 w-4 text-primary shrink-0 transition-colors group-data-[highlighted]:text-white group-hover:text-white" />}
            >
              Semana pasada
            </SelectItem>
            <SelectItem
              value="este_mes"
              icon={<Calendar className="h-4 w-4 text-primary shrink-0 transition-colors group-data-[highlighted]:text-white group-hover:text-white" />}
            >
              Este mes
            </SelectItem>
            <SelectItem
              value="mes_pasado"
              icon={<CalendarRange className="h-4 w-4 text-primary shrink-0 transition-colors group-data-[highlighted]:text-white group-hover:text-white" />}
            >
              Mes pasado
            </SelectItem>
            <SelectItem
              value="personalizado"
              icon={<SlidersHorizontal className="h-4 w-4 text-primary shrink-0 transition-colors group-data-[highlighted]:text-white group-hover:text-white" />}
            >
              {periodoCreacion === "personalizado" && (customFechaDesde || customFechaHasta)
                ? `Personalizado (${customFechaDesde || "..."} - ${customFechaHasta || "..."})`
                : "Rango personalizado..."}
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroEntrega} onValueChange={(v: any) => setFiltroEntrega(v)}>
          <SelectTrigger className="w-[175px] font-semibold text-xs shrink-0">
            <Truck className="h-4 w-4 text-primary shrink-0 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[220px]">
            <SelectItem
              value="todas"
              icon={<Truck className="h-4 w-4 text-primary shrink-0 transition-colors group-data-[highlighted]:text-white group-hover:text-white" />}
            >
              Entregas: Todas
            </SelectItem>
            <SelectItem
              value="hoy"
              icon={<Clock className="h-4 w-4 text-primary shrink-0 transition-colors group-data-[highlighted]:text-white group-hover:text-white" />}
            >
              Para entregar hoy
            </SelectItem>
            <SelectItem
              value="atrasadas"
              icon={<AlertTriangle className="h-4 w-4 text-primary shrink-0 transition-colors group-data-[highlighted]:text-white group-hover:text-white" />}
            >
              Atrasadas
            </SelectItem>
            <SelectItem
              value="sin_retirar"
              icon={<PackageX className="h-4 w-4 text-primary shrink-0 transition-colors group-data-[highlighted]:text-white group-hover:text-white" />}
            >
              Sin retirar (
              {`> ${tenant?.config?.dias_almacenamiento_sin_retirar || tenant?.config?.whatsapp?.dias_recordatorio_sin_retirar || 5}d`}
              )
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroUrgencia} onValueChange={(v: any) => setFiltroUrgencia(v)}>
          <SelectTrigger className="w-[170px] font-semibold text-xs shrink-0">
            {filtroUrgencia === "pagadas" ? (
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mr-1.5" />
            ) : filtroUrgencia === "pendientes_pago" ? (
              <Clock className="h-4 w-4 text-primary shrink-0 mr-1.5" />
            ) : (
              <Zap className="h-4 w-4 text-primary shrink-0 mr-1.5" />
            )}
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[200px]">
            <SelectItem
              value="todas"
              icon={<Zap className="h-4 w-4 text-primary shrink-0 transition-colors group-data-[highlighted]:text-white group-hover:text-white" />}
            >
              Prioridades
            </SelectItem>
            <SelectItem
              value="urgente"
              icon={<Zap className="h-4 w-4 text-primary shrink-0 transition-colors group-data-[highlighted]:text-white group-hover:text-white" />}
            >
              Urgentes
            </SelectItem>
            <SelectItem
              value="estandar"
              icon={<Layers className="h-4 w-4 text-primary shrink-0 transition-colors group-data-[highlighted]:text-white group-hover:text-white" />}
            >
              Estándar
            </SelectItem>
            <SelectItem
              value="pagadas"
              icon={<CheckCircle2 className="h-4 w-4 text-primary shrink-0 transition-colors group-data-[highlighted]:text-white group-hover:text-white" />}
            >
              Ya pagadas
            </SelectItem>
            <SelectItem
              value="pendientes_pago"
              icon={<Clock className="h-4 w-4 text-primary shrink-0 transition-colors group-data-[highlighted]:text-white group-hover:text-white" />}
            >
              Pendientes de pago
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroPago} onValueChange={(v: any) => setFiltroPago(v)}>
          <SelectTrigger className="w-[160px] font-semibold text-xs shrink-0">
            <DollarSign className="h-4 w-4 text-primary shrink-0 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[195px]">
            <SelectItem
              value="todas"
              icon={<DollarSign className="h-4 w-4 text-primary shrink-0 transition-colors group-data-[highlighted]:text-white group-hover:text-white" />}
            >
              Formas de Pago
            </SelectItem>
            <SelectItem
              value="EFECTIVO"
              icon={<Banknote className="h-4 w-4 text-primary shrink-0 transition-colors group-data-[highlighted]:text-white group-hover:text-white" />}
            >
              Efectivo
            </SelectItem>
            <SelectItem
              value="TARJETA"
              icon={<CreditCard className="h-4 w-4 text-primary shrink-0 transition-colors group-data-[highlighted]:text-white group-hover:text-white" />}
            >
              Tarjeta
            </SelectItem>
            <SelectItem
              value="TRANSFERENCIA"
              icon={<ArrowLeftRight className="h-4 w-4 text-primary shrink-0 transition-colors group-data-[highlighted]:text-white group-hover:text-white" />}
            >
              Transferencia
            </SelectItem>
            <SelectItem
              value="CREDITO"
              icon={<Receipt className="h-4 w-4 text-primary shrink-0 transition-colors group-data-[highlighted]:text-white group-hover:text-white" />}
            >
              Crédito
            </SelectItem>
            <SelectItem
              value="PAGO_AL_RETIRAR"
              icon={<PackageCheck className="h-4 w-4 text-primary shrink-0 transition-colors group-data-[highlighted]:text-white group-hover:text-white" />}
            >
              Pago al retirar
            </SelectItem>
            <SelectItem
              value="MIXTO"
              icon={<Split className="h-4 w-4 text-primary shrink-0 transition-colors group-data-[highlighted]:text-white group-hover:text-white" />}
            >
              Mixto
            </SelectItem>
          </SelectContent>
        </Select>
        {isConveyorEnabled && (
          <Select value={filtroUbicacion} onValueChange={(v: any) => setFiltroUbicacion(v)}>
            <SelectTrigger className="w-[170px] font-semibold text-xs shrink-0">
              <MapPin className="h-4 w-4 text-primary shrink-0 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="min-w-[210px]">
              <SelectItem
                value="todas"
                icon={<MapPin className="h-4 w-4 text-primary shrink-0 transition-colors group-data-[highlighted]:text-white group-hover:text-white" />}
              >
                Todas las ubicaciones
              </SelectItem>
              <SelectItem
                value="con_ubicacion"
                icon={<MapPin className="h-4 w-4 text-primary shrink-0 transition-colors group-data-[highlighted]:text-white group-hover:text-white" />}
              >
                Con ubicación asignada
              </SelectItem>
              <SelectItem
                value="sin_ubicacion"
                icon={<MapPinOff className="h-4 w-4 text-primary shrink-0 transition-colors group-data-[highlighted]:text-white group-hover:text-white" />}
              >
                Sin ubicación
              </SelectItem>
              {zonas.length > 0 && (
                <>
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-t border-border/50 mt-1">
                    Por Zona de Estantería
                  </div>
                  {zonas.map((z) => (
                    <SelectItem key={z.id} value={`zona:${z.id}`}>
                      <span className="flex items-center gap-1.5">
                        <Layers className="h-3 w-3 text-primary shrink-0" />
                        <span>{z.nombre}</span>
                      </span>
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        )}
      </Card>

      {/* Banner informativo de período activo */}
      {periodoCreacion !== "todas" && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#1B4B73] text-white text-xs font-bold shadow-xs">
              <Calendar className="h-3.5 w-3.5 text-[#F0B900]" />
              {getPeriodoLabel(periodoCreacion, customFechaDesde, customFechaHasta)}
            </span>

            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-black text-slate-800 dark:text-slate-100 tabular-nums border border-slate-200/60 dark:border-slate-700">
                {filt.length}
              </span>
              {filt.length === 1 ? "orden encontrada" : "órdenes encontradas"}
            </span>

            <span className="hidden sm:inline-block h-4 w-px bg-slate-200 dark:bg-slate-700" />

            {/* Total facturado destacado y más grande */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/90 dark:border-emerald-800/60 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Total facturado:
              </span>
              <span className="font-display font-black text-sm sm:text-base text-emerald-700 dark:text-emerald-300 tabular-nums">
                {formatRD(filt.reduce((acc, o) => acc + (o.total || 0), 0))}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {periodoCreacion === "personalizado" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTempDesde(customFechaDesde || formatLocalDateToInput(new Date()));
                  setTempHasta(customFechaHasta || formatLocalDateToInput(new Date()));
                  setShowCustomDateModal(true);
                }}
                className="h-8 text-xs px-3 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 cursor-pointer shadow-2xs transition-all active:scale-95"
              >
                Cambiar fechas
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                setPeriodoCreacion("todas");
                setCustomFechaDesde("");
                setCustomFechaHasta("");
              }}
              className="h-8 text-xs px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black transition-all cursor-pointer shadow-xs active:scale-95 border-0 flex items-center gap-1.5"
            >
              <X className="h-3.5 w-3.5 text-white" />
              <span>Ver todas las fechas</span>
            </Button>
          </div>
        </div>
      )}

      {/* Badge tabs de estado */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {[
          {
            value: "todos",
            label: "Todas",
            icon: LayoutGrid,
            bg: "bg-slate-100 text-slate-700 border-slate-200",
            activeBg: "bg-[#2c4e82] text-white border-[#2c4e82] shadow-md",
          },
          {
            value: "RECIBIDA",
            label: "Recibida",
            icon: Inbox,
            bg: "bg-blue-50 text-blue-700 border-blue-200",
            activeBg: "bg-blue-600 text-white border-blue-600 shadow-md",
          },
          {
            value: "hoy",
            label: "Para hoy",
            icon: Calendar,
            bg: "bg-orange-50 text-orange-700 border-orange-200",
            activeBg: "bg-orange-600 text-white border-orange-600 shadow-md",
          },
          {
            value: "urgente",
            label: "Urgentes",
            icon: Zap,
            bg: "bg-rose-50 text-rose-700 border-rose-200",
            activeBg: "bg-rose-600 text-white border-rose-600 shadow-md",
          },
          {
            value: "EN_PROCESO",
            label: "En proceso",
            icon: RefreshCw,
            bg: "bg-amber-50 text-amber-700 border-amber-200",
            activeBg: "bg-amber-500 text-white border-amber-500 shadow-md",
          },
          {
            value: "LISTA",
            label: "Lista",
            icon: CircleCheck,
            bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
            activeBg: "bg-emerald-600 text-white border-emerald-600 shadow-md",
          },
          {
            value: "ENTREGADA",
            label: "Entregada",
            icon: Truck,
            bg: "bg-purple-50 text-purple-700 border-purple-200",
            activeBg: "bg-purple-600 text-white border-purple-600 shadow-md",
          },
          {
            value: "ANULADA",
            label: "Anulada",
            icon: Ban,
            bg: "bg-red-50 text-red-700 border-red-200",
            activeBg: "bg-red-600 text-white border-red-600 shadow-md",
          },
        ].map((tab) => {
          const count =
            tab.value === "todos"
              ? ordenesBaseParaTabs.length
              : tab.value === "hoy"
                ? ordenesBaseParaTabs.filter((o) => esParaHoy(o.fecha_entrega)).length
                : tab.value === "urgente"
                  ? ordenesBaseParaTabs.filter((o) => o.es_urgente).length
                  : ordenesBaseParaTabs.filter((o) => o.estado === tab.value).length;
          const isActive = filtroEstado === tab.value;
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              onClick={() => setFiltroEstado(tab.value as any)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer hover:shadow-sm ${
                isActive ? tab.activeBg : tab.bg
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  isActive ? "bg-white/25" : "bg-black/5"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <Card className="overflow-hidden">
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
              {paginatedOrders.map((o) => {
                const c = clientes.find((x) => x.id === o.cliente_id);
                const isECFOrder = !!(
                  o.tipo_ecf?.startsWith("E") ||
                  o.ncf?.startsWith("E") ||
                  o.ecf_status === "PENDING_OFFLINE_TRANSMISSION"
                );
                const isAcceptedECF =
                  isECFOrder &&
                  (/ACEPT|PROCESAD|APROB|REGISTERED|EMITID|COMPLETAD|VALID/i.test(
                    o.ecf_status || "",
                  ) ||
                    o.ecf_status === "ACCEPTED" ||
                    o.ecf_status === "ACCEPTED_WITH_OBSERVATIONS");
                const isRejectedECF =
                  isECFOrder &&
                  (/RECHAZ|ERROR/i.test(o.ecf_status || "") ||
                    o.ecf_status === "REJECTED" ||
                    o.ecf_status === "ERROR");
                const isPendingECF = isECFOrder && !isAcceptedECF && !isRejectedECF;

                const isSelectedInBatch = selectedBatchOrders.some((b) => b.id === o.id);

                return (
                  <tr
                    key={o.id}
                    className={cn(
                      "border-b border-border/50 hover:bg-accent/40 cursor-pointer transition-colors duration-100",
                      isSelectedInBatch && "bg-blue-100/70 dark:bg-blue-950/70 ring-2 ring-inset ring-blue-500 font-semibold"
                    )}
                    onClick={(e) => {
                      // Don't open modal if clicking on action buttons or badges
                      const target = e.target as HTMLElement;
                      if (
                        target.closest("button") ||
                        target.closest('[role="menuitem"]') ||
                        target.closest(".action-menu-container")
                      )
                        return;
                      if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        if (!hasTransferirOrden) {
                          toast.error("No tienes permiso para transferir órdenes.");
                          return;
                        }
                        toggleBatchOrder(o);
                        return;
                      }
                      if (o.estado !== "ANULADA") setEstadoModal(o);
                    }}
                  >
                    <td className="px-4 py-3 min-w-[280px]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef2f6] text-[#2c4e82] dark:bg-slate-800 dark:text-blue-400 animate-in fade-in zoom-in duration-200 border border-[#d6e0ea]/50">
                          <Receipt className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-nowrap whitespace-nowrap">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-sm font-black text-[#1B4B73] dark:text-sky-400 shrink-0">
                              {o.numero}
                            </span>
                            {isSelectedInBatch && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-[#1B4B73] text-white shadow-2xs animate-in zoom-in-90 shrink-0 whitespace-nowrap">
                                <Check className="h-2.5 w-2.5 stroke-[3]" /> Seleccionada
                              </span>
                            )}
                            {isConveyorEnabled && o.ubicacion_ropa && (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingUbicacionOrden(o);
                                  setEditingUbicacionValue(o.ubicacion_ropa || "");
                                }}
                                title={`Ubicación en estantería / conveyor: ${o.ubicacion_ropa} (Clic para cambiar)`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/25 text-[10.5px] font-bold transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 shrink-0"
                              >
                                <MapPin className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
                                <span className="truncate max-w-[120px]">{o.ubicacion_ropa}</span>
                              </span>
                            )}
                            {isPendingECF && (
                              <span
                                title={`e-CF Pendiente de validación DGII (${o.ncf || o.tipo_ecf})`}
                                className="inline-flex items-center text-amber-500 hover:text-amber-600 transition-colors shrink-0"
                              >
                                <Clock className="h-3.5 w-3.5 animate-pulse" />
                              </span>
                            )}
                            {isAcceptedECF && (
                              <span
                                title={`e-CF Aceptado por DGII (${o.ncf || o.tipo_ecf})`}
                                className="inline-flex items-center text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors shrink-0"
                              >
                                <ShieldCheck className="h-3.5 w-3.5" />
                              </span>
                            )}
                            {isRejectedECF && (
                              <span
                                title={`e-CF Rechazado por DGII (${o.ncf || o.tipo_ecf}) - Ver /fiscal`}
                                className="inline-flex items-center text-rose-500 hover:text-rose-600 transition-colors shrink-0"
                              >
                                <ShieldAlert className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </div>
                          <span
                            className="font-bold text-sm text-foreground truncate max-w-[320px]"
                            title={c ? `${c.nombre} ${c.apellido || ""}` : ""}
                          >
                            {c ? `${c.nombre} ${c.apellido || ""}` : "Consumidor Final"}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-medium whitespace-nowrap">
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
                    <td className="px-4 py-3 text-center">
                      {getNotaCreditoMonto(o) > 0 || getNotaDebitoMonto(o) > 0 ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatRD(getTotalNetoOrden(o))}
                          </span>
                          <span
                            className="text-[10px] text-muted-foreground line-through"
                            title="Total original de la factura"
                          >
                            Original {formatRD(o.total)}
                          </span>
                          {getNotaCreditoMonto(o) > 0 && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                              title={o.nota_credito_ncf || "Nota de Crédito"}
                            >
                              <ArrowDownCircle className="h-3 w-3" /> E34 −
                              {formatRD(getNotaCreditoMonto(o))}
                            </span>
                          )}
                          {getNotaDebitoMonto(o) > 0 && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                              title={o.nota_debito_ncf || "Nota de Débito"}
                            >
                              <ArrowUpCircle className="h-3 w-3" /> E33 +
                              {formatRD(getNotaDebitoMonto(o))}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="font-medium">{formatRD(o.total)}</span>
                      )}
                    </td>
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
                          {o.estado === "LISTA" &&
                            calcularDiasEnAlmacen(o.creado_en) >=
                              (tenant?.config?.whatsapp?.dias_recordatorio_sin_retirar || 5) && (
                              <Badge className="bg-amber-600 text-white text-[9px] font-black uppercase tracking-wider py-0.5 px-1.5 rounded-sm gap-0.5 shadow-sm border-0">
                                <Clock className="h-2.5 w-2.5" />{" "}
                                {calcularDiasEnAlmacen(o.creado_en)}d en almacén
                              </Badge>
                            )}
                          {o.estado === "LISTA" && fueNotificadoHoy(o.ultimo_recordatorio_en) && (
                            <Badge className="bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider py-0.5 px-1.5 rounded-sm gap-0.5 shadow-sm border-0">
                              <Check className="h-2.5 w-2.5" /> Notificado hoy
                            </Badge>
                          )}
                          <TransferredOrderBadge orden={o} currentTenant={tenant} />
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
                              {hasTransferirOrden && (
                                <DropdownMenuItem
                                  onClick={() => setTransferOrderTarget(o)}
                                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl cursor-pointer hover:bg-accent focus:bg-accent transition-colors text-blue-600 dark:text-blue-400"
                                >
                                  <ArrowRightLeft className="h-4 w-4 shrink-0" />
                                  <span>Transferir a otra sucursal</span>
                                </DropdownMenuItem>
                              )}
                              {emp && can(emp, "editar-orden") && (
                                <DropdownMenuItem
                                  onClick={() => setEditOrder(o)}
                                  className="gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer"
                                >
                                  <Pencil className="h-4 w-4" />
                                  {orderEditLabel(o)}
                                </DropdownMenuItem>
                              )}

                              {o.estado === "LISTA" && (
                                <DropdownMenuItem
                                  onClick={async () => {
                                    const cli = clientes.find((c) => c.id === o.cliente_id);
                                    if (!cli) {
                                      toast.error("No se encontró la información del cliente");
                                      return;
                                    }
                                    const res = await notificarWhatsApp(
                                      tenant,
                                      cli,
                                      o,
                                      "sin_retirar",
                                    );
                                    if (res.ok) {
                                      toast.success(
                                        `Recordatorio WhatsApp enviado a ${cli.nombre} ✅`,
                                      );
                                      queryClient.invalidateQueries({
                                        queryKey: ["ordenes", tenantId],
                                      });
                                    } else {
                                      toast.error(
                                        `No se pudo enviar: ${res.reason || "Error de red"}`,
                                      );
                                    }
                                  }}
                                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 focus:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl cursor-pointer transition-colors"
                                >
                                  <MessageCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                                  <span>Notificar WhatsApp</span>
                                </DropdownMenuItem>
                              )}

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
                                <span>Imprimir Ticket (Cliente)</span>
                              </DropdownMenuItem>

                              {isTallerEnabled && (
                                <DropdownMenuItem
                                  onClick={() => setShowPrintProduccion(o)}
                                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-xl cursor-pointer transition-colors"
                                >
                                  <Tag className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                  <span>Imprimir Ticket de Taller</span>
                                </DropdownMenuItem>
                              )}

                              {isMarquillasEnabled && (
                                <DropdownMenuItem
                                  onClick={() => setShowPrintMarquillas(o)}
                                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl cursor-pointer transition-colors"
                                >
                                  <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                  <span>Imprimir Marquillas</span>
                                </DropdownMenuItem>
                              )}

                              {isConveyorEnabled && o.estado !== "ANULADA" && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingUbicacionOrden(o);
                                    setEditingUbicacionValue(o.ubicacion_ropa || "");
                                  }}
                                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-xl cursor-pointer transition-colors"
                                >
                                  <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                  <span>
                                    {o.ubicacion_ropa
                                      ? `Ubicación: ${o.ubicacion_ropa}`
                                      : "Asignar Ubicación"}
                                  </span>
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                onClick={() => setShowDownloadA4(o)}
                                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl cursor-pointer hover:bg-accent focus:bg-accent transition-colors"
                              >
                                <DownloadCloud className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span>Ver Factura A4</span>
                              </DropdownMenuItem>

                              {o.estado !== "ANULADA" &&
                                ((ecfConfig?.is_active && o.ncf?.startsWith("E")) ||
                                  (tenant.pais_codigo === "EC" && Boolean(o.sri_clave_acceso))) && (
                                  <>
                                    <DropdownMenuSeparator className="my-1 bg-border/60" />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setCredito(o);
                                        setMontoCredito(0);
                                        setMotivoCredito("");
                                        setCodigoCredito(tenant.pais_codigo === "EC" ? "01" : "");
                                      }}
                                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-xl cursor-pointer transition-colors"
                                    >
                                      <ArrowDownCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                      <span>Nota de Crédito {tenant.pais_codigo === "EC" ? "SRI" : ""}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => setDebito(o)}
                                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl cursor-pointer transition-colors"
                                    >
                                      <ArrowUpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                      <span>Nota de Débito {tenant.pais_codigo === "EC" ? "SRI" : ""}</span>
                                    </DropdownMenuItem>
                                    {tenant.pais_codigo === "EC" && o.sri_ride_url && (
                                      <DropdownMenuItem
                                        onClick={() => window.open(o.sri_ride_url, "_blank")}
                                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl cursor-pointer transition-colors"
                                      >
                                        <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                                        <span>Ver RIDE (PDF SRI)</span>
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                )}

                              {/* ECUADOR: Reintentar Timbrado SRI */}
                              {tenant.pais_codigo === "EC" &&
                                tenant.config?.sri_config?.activo &&
                                o.estado !== "ANULADA" &&
                                (!o.sri_clave_acceso || o.sri_estado !== "AUTORIZADO") && (
                                  <>
                                    <DropdownMenuSeparator className="my-1 bg-border/60" />
                                    <DropdownMenuItem
                                      onClick={async () => {
                                        toast.info(`Transmitiendo factura SRI para #${o.numero}...`);
                                        try {
                                          const cliente =
                                            clientes.find((x) => x.id === o.cliente_id) ||
                                            (o.cliente_id ? await getClienteById(o.cliente_id) : null);
                                          const sriRes = await emitirFacturaSRI(o, cliente, tenant);
                                          if (sriRes.success) {
                                            const updated: Orden = {
                                              ...o,
                                              sri_clave_acceso: sriRes.claveAcceso,
                                              sri_numero_autorizacion: sriRes.numeroAutorizacion,
                                              sri_fecha_autorizacion: sriRes.fechaAutorizacion,
                                              sri_estado: sriRes.estado || "AUTORIZADO",
                                              sri_ride_url: sriRes.rideUrl,
                                              sri_xml_url: sriRes.xmlUrl,
                                              sri_secuencial: `${tenant.config?.sri_config?.establecimiento || "001"}-${tenant.config?.sri_config?.punto_emision || "001"}-${String(o.numero).padStart(9, "0")}`,
                                            };
                                            await saveOrden(updated);
                                            await queryClient.invalidateQueries({
                                              queryKey: ["ordenes", tenantId],
                                            });
                                            await queryClient.refetchQueries({
                                              queryKey: ["ordenes", tenantId],
                                            });
                                            toast.success(
                                              `¡Factura Electrónica SRI Autorizada! Clave: ${sriRes.claveAcceso?.substring(0, 10)}...`,
                                            );
                                          } else {
                                            toast.error(`Aviso del SRI: ${sriRes.error || "No autorizada"}`);
                                          }
                                        } catch (err: any) {
                                          toast.error(
                                            `Error al transmitir al SRI: ${err?.message || "Error desconocido"}`,
                                          );
                                        }
                                      }}
                                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 rounded-xl cursor-pointer transition-colors"
                                    >
                                      <RefreshCw className="h-4 w-4 text-sky-500 shrink-0" />
                                      <span>Reintentar Timbrado SRI</span>
                                    </DropdownMenuItem>
                                  </>
                                )}

                              {/* REPÚBLICA DOMINICANA: Reintentar Timbrado DGII */}
                              {tenant.pais_codigo !== "EC" && o.estado !== "ANULADA" && (isPendingECF || isRejectedECF) && (
                                <>
                                  <DropdownMenuSeparator className="my-1 bg-border/60" />
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      if (o.ncf && (/ACEPT|PROCESAD|APROB|REGISTERED|EMITID|COMPLETAD|VALID/i.test(o.ecf_status || "") || o.ecf_status === "ACCEPTED" || o.ecf_status === "ACCEPTED_WITH_OBSERVATIONS")) {
                                        toast.info(`La orden #${o.numero} ya tiene el comprobante ${o.ncf} emitido y aceptado por la DGII.`);
                                        return;
                                      }
                                      toast.info(`Reintentando timbrado DGII para #${o.numero}...`);
                                      try {
                                        await ensureFreshSupabaseSession();
                                        const cliente =
                                          clientes.find((x) => x.id === o.cliente_id) ||
                                          (o.cliente_id
                                            ? await getClienteById(o.cliente_id)
                                            : null);
                                        const isEmpresa = cliente?.tipo === "Empresa" || Boolean(cliente?.cedula && cliente.cedula.replace(/\D/g, "").length >= 9);
                                        const targetTipoECF =
                                          o.tipo_ecf ||
                                          (o.ncf?.startsWith("E") ? o.ncf.substring(0, 3) : undefined) ||
                                          (isEmpresa ? "E31" : "E32");
                                        const ordenAProcesar: Orden = {
                                          ...o,
                                          tipo_ecf: targetTipoECF,
                                        };
                                        const res = await emitirECF(
                                          ordenAProcesar,
                                          cliente,
                                          ecfConfig?.pronesoft_tenant_id,
                                          tenant.config,
                                          tenant,
                                          targetTipoECF,
                                        );
                                        const legalStatus = String(
                                          res.legal_status || res.document?.legal_status || "",
                                        ).toUpperCase();
                                        const accepted =
                                          Boolean(res.encf) &&
                                          !/RECHAZ|ERROR|INVALID/.test(legalStatus);
                                        const updated = {
                                          ...o,
                                          ncf: res.encf,
                                          tipo_ecf: targetTipoECF,
                                          ecf_status: accepted ? "ACCEPTED" : "REJECTED",
                                          ecf_id: res.document?.id,
                                          ecf_qr:
                                            res.stamp_url ||
                                            (res.document as any)?.document_stamp_url ||
                                            "",
                                          ecf_security_code: res.security_code || "",
                                          ecf_signature_date:
                                            (res.document as any)?.signature_date ||
                                            new Date().toISOString(),
                                        };
                                        await saveOrden(updated);
                                        await queryClient.invalidateQueries({
                                          queryKey: ["ordenes", tenantId],
                                        });
                                        await queryClient.refetchQueries({
                                          queryKey: ["ordenes", tenantId],
                                        });
                                        if (accepted) {
                                          showDGIIToast(res.encf);
                                        } else {
                                          const rawDgii = res.document?.dgii_response as any;
                                          const dgiiMensaje =
                                            rawDgii?.dgii?.mensaje ||
                                            rawDgii?.dgii_info?.mensaje ||
                                            rawDgii?.mensaje ||
                                            rawDgii?.error ||
                                            rawDgii?.message ||
                                            res.message ||
                                            "";
                                          const motivo = dgiiMensaje ? `: ${dgiiMensaje}` : "";
                                          toast.error(
                                            `Comprobante ${res.encf} rechazado por DGII${motivo}`,
                                            {
                                              duration: 10000,
                                            },
                                          );
                                        }
                                      } catch (err: any) {
                                        toast.error(
                                          `Error al retransmitir e-CF: ${err?.message || "Error desconocido"}`,
                                        );
                                      }
                                    }}
                                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl cursor-pointer transition-colors"
                                  >
                                    <RefreshCw className="h-4 w-4 text-emerald-500 shrink-0" />
                                    <span>Reintentar Timbrado DGII</span>
                                  </DropdownMenuItem>
                                </>
                              )}

                              {o.estado !== "ANULADA" && (
                                <>
                                  <DropdownMenuSeparator className="my-1 bg-border/60" />
                                  {o.saldo > 0 && isAuthorized && (
                                    <DropdownMenuItem
                                      onClick={() => setCondonarOrden(o)}
                                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-xl cursor-pointer transition-colors"
                                    >
                                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                                      <span>Condonar Deuda</span>
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => setAnular(o)}
                                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive rounded-xl cursor-pointer transition-colors"
                                  >
                                    <XCircle className="h-4 w-4 text-destructive shrink-0" />
                                    <span>Anular Orden</span>
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filt.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center py-10 max-w-md mx-auto px-4">
                      <div className="rounded-2xl bg-primary/10 p-4 mb-4 text-primary shadow-sm">
                        <FileText className="h-10 w-10" />
                      </div>
                      <h3 className="font-display text-lg font-bold text-foreground">
                        ¡No hay órdenes registradas!
                      </h3>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                        Aquí verás las órdenes de servicios de lavandería creadas por tus
                        operadores, su estado de lavado, entrega y pago en tiempo real.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface/50">
            <div className="text-xs text-muted-foreground font-medium">
              Mostrando{" "}
              <span className="font-bold text-foreground">{(currentPage - 1) * PAGE_SIZE + 1}</span>
              –
              <span className="font-bold text-foreground">
                {Math.min(currentPage * PAGE_SIZE, filt.length)}
              </span>{" "}
              de <span className="font-bold text-foreground">{filt.length}</span> órdenes
            </div>
            <div className="flex items-center gap-1.5 font-['Plus_Jakarta_Sans',sans-serif]">
              <Button
                type="button"
                size="sm"
                className="h-8.5 px-3.5 rounded-xl text-xs font-bold bg-[#1B4B73] hover:bg-[#133857] text-white cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Anterior
              </Button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((page, idx, arr) => {
                    const prevPage = arr[idx - 1];
                    const showEllipsis = prevPage && page - prevPage > 1;
                    return (
                      <div key={page} className="flex items-center gap-1">
                        {showEllipsis && (
                          <span className="px-1 text-xs text-muted-foreground">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`h-8 min-w-8 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            currentPage === page
                              ? "bg-[#1B4B73] text-white shadow-xs font-bold"
                              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          {page}
                        </button>
                      </div>
                    );
                  })}
              </div>

              <Button
                type="button"
                size="sm"
                className="h-8.5 px-3.5 rounded-xl text-xs font-bold bg-[#1B4B73] hover:bg-[#133857] text-white cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
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
      {editOrder && (
        <EditOrderDialog
          key={editOrder.id}
          orden={editOrder}
          clientes={clientes}
          servicios={servicios}
          empleados={empleados}
          ubicacionEnabled={isConveyorEnabled}
          tenant={tenant}
          onClose={() => setEditOrder(null)}
          onSaved={async (updated) => {
            setEditOrder(null);
            setView(updated);
            // 1. Actualizar React Query en memoria inmediatamente para ver los cambios sin recargar
            queryClient.setQueryData<Orden[]>(["ordenes", tenantId], (current) =>
              current ? current.map((o) => (o.id === updated.id ? updated : o)) : [updated],
            );
            queryClient.setQueriesData({ queryKey: ["ordenes"] }, (old: Orden[] | undefined) =>
              old ? old.map((o) => (o.id === updated.id ? updated : o)) : old,
            );
            // 2. Persistir de inmediato en IndexedDB y LocalStorage
            try {
              await offlineDB.put("ordenes", updated);
              const local = read<Orden[]>(KEY.ordenes, []);
              const idx = local.findIndex((x) => x.id === updated.id);
              if (idx >= 0) local[idx] = updated;
              else local.push(updated);
              write(KEY.ordenes, local);
            } catch (e) {
              console.warn("Storage sync warning on order edit:", e);
            }
            // 3. Forzar refetch de todas las listas
            void queryClient.invalidateQueries({ queryKey: ["ordenes"] });
            void queryClient.refetchQueries({ queryKey: ["ordenes"] });
            toast.success("Orden actualizada. El cambio quedó registrado en el historial.", {
              action: { label: "Imprimir ticket", onClick: () => setShowPrint(updated) },
            });
          }}
        />
      )}
      <Dialog
        open={!!view}
        onOpenChange={(o) => {
          if (!o) {
            setView(null);
            if (isViewFromNetwork) {
              setShowNetworkSearchModal(true);
              setIsViewFromNetwork(false);
            }
          }
        }}
      >
        <DialogContent
          className={cn(
            "max-w-3xl overflow-hidden rounded-3xl p-4 sm:p-5 flex flex-col",
            isViewFromNetwork ? "max-h-[90vh] sm:max-h-[88vh]" : "max-h-[84vh]"
          )}
        >
          {view && (
            <OrderDetail
              view={view}
              tenant={tenant}
              clientes={clientes}
              empleados={empleados}
              cambiarEstado={cambiarEstado}
              setView={(v: any) => {
                setView(v);
                if (!v && isViewFromNetwork) {
                  setShowNetworkSearchModal(true);
                  setIsViewFromNetwork(false);
                }
              }}
              onPrint={() => setShowPrint(view)}
              onEdit={
                emp && can(emp, "editar-orden")
                  ? () => {
                      setEditOrder(view);
                      setView(null);
                      setIsViewFromNetwork(false);
                    }
                  : undefined
              }
              onPrintProduccion={isTallerEnabled ? () => setShowPrintProduccion(view) : undefined}
              onPrintMarquillas={
                isMarquillasEnabled ? () => setShowPrintMarquillas(view) : undefined
              }
              setCobrarOrden={(ord: any) => {
                setCobrarOrden(ord);
                setIsViewFromNetwork(false);
              }}
              isConveyorEnabled={isConveyorEnabled}
              onEditUbicacion={(ord) => {
                setEditingUbicacionOrden(ord);
                setEditingUbicacionValue(ord.ubicacion_ropa || "");
              }}
              onTransfer={
                hasTransferirOrden
                  ? (ord) => {
                      setTransferOrderTarget(ord);
                      setIsViewFromNetwork(false);
                    }
                  : undefined
              }
              isFromNetwork={isViewFromNetwork}
              onBackToNetwork={() => {
                setView(null);
                setShowNetworkSearchModal(true);
                setIsViewFromNetwork(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL: CONSULTA RÁPIDA EN LA RED DE SUCURSALES */}
      <Dialog open={showNetworkSearchModal} onOpenChange={setShowNetworkSearchModal}>
        <DialogContent
          style={{ backgroundColor: "#ffffff" }}
          className="max-w-4xl h-[86vh] max-h-[86vh] overflow-hidden rounded-3xl p-4 sm:p-5 !bg-white dark:!bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
        >
          <DialogHeader className="pb-2.5 border-b border-border/70 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-sm">
                  <Globe className="h-4.5 w-4.5" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-black text-foreground tracking-tight flex items-center gap-2">
                    <span>Consulta en la Red de Sucursales</span>
                    <Badge variant="outline" className="text-[10px] font-bold border-indigo-200 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300">
                      Multi-Sucursal
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Busca órdenes registradas en cualquiera de tus sucursales y taller central en tiempo real.
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Buscador dentro del modal */}
          <div className="py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={networkSearchQuery}
                onChange={(e) => {
                  setNetworkSearchQuery(e.target.value);
                  setNetworkCurrentPage(1);
                }}
                placeholder="Escribe número de orden (#1045), cliente, notas o sucursal..."
                style={{ backgroundColor: "#ffffff" }}
                className="pl-10 pr-24 h-11 rounded-2xl !bg-white dark:!bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-xs font-medium text-xs sm:text-sm text-foreground focus-visible:ring-2 focus-visible:ring-blue-500"
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  setNetworkSearchQuery("");
                  setNetworkCurrentPage(1);
                }}
                title="Limpiar campo de búsqueda"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white flex items-center gap-1.5 text-xs font-bold font-display shadow-xs transition-all active:scale-95 cursor-pointer z-10"
              >
                <Eraser className="h-3.5 w-3.5 shrink-0" />
                <span>Limpiar</span>
              </button>
            </div>
            <NetworkBranchSelect
              tenants={sisterBranches}
              currentTenant={tenant}
              value={networkBranchFilter}
              onChange={(val) => {
                setNetworkBranchFilter(val);
                setNetworkCurrentPage(1);
              }}
              triggerClassName="h-11 rounded-2xl"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleOpenNetworkSearch}
              className="h-11 w-11 px-0 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-sm shadow-emerald-600/20 shrink-0 flex items-center justify-center transition-all cursor-pointer"
              title="Refrescar órdenes de la red"
            >
              <RefreshCw className={`h-4.5 w-4.5 text-white ${isLoadingNetworkOrders ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Indicador de ayuda selección múltiple con Ctrl */}
          {hasTransferirOrden && (
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 -mt-1 mb-1">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 text-[9.5px] font-mono font-bold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300">Ctrl</kbd>
                <span>+ Clic para seleccionar múltiples órdenes y transferir en lote</span>
              </span>
              {selectedBatchOrders.length > 0 && (
                <span className="font-bold text-[#1B4B73] dark:text-blue-400 flex items-center gap-1">
                  <Check className="h-3 w-3 stroke-[2.5]" /> {selectedBatchOrders.length} seleccionada(s)
                </span>
              )}
            </div>
          )}

          {/* Lista de resultados compacta con scroll interior garantizado */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 -mr-1 space-y-2">
            {isLoadingNetworkOrders ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
                <p className="text-xs font-semibold">Consultando la red de sucursales...</p>
              </div>
            ) : filteredNetworkOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Globe className="h-9 w-9 mx-auto mb-2 opacity-30" />
                <p className="font-bold text-sm text-foreground">No se encontraron órdenes en la red</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {networkSearchQuery ? "Prueba con otro número de orden o nombre de cliente." : "No hay órdenes sincronizadas."}
                </p>
              </div>
            ) : (
              paginatedNetworkOrders.map((o) => {
                const saldo = o.saldo || 0;
                const isSelectedInBatch = selectedBatchOrders.some((b) => b.id === o.id);
                return (
                  <div
                    key={o.id}
                    onClick={(e) => {
                      if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        if (!hasTransferirOrden) {
                          toast.error("No tienes permiso para transferir órdenes.");
                          return;
                        }
                        toggleBatchOrder(o);
                      }
                    }}
                    className={`p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelectedInBatch
                        ? "ring-2 ring-blue-500 bg-blue-100/75 dark:bg-blue-950/70 border-blue-400 dark:border-blue-700 shadow-md"
                        : o.es_local
                          ? "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                          : "bg-blue-50/40 dark:bg-blue-950/20 border-blue-200/70 dark:border-blue-900/40 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg font-mono font-black text-xs bg-[#1B4B73] text-white shadow-2xs">
                            {(o.numero || "").replace(/^#/, "")}
                          </span>
                          {isSelectedInBatch && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-[#1B4B73] text-white shadow-2xs animate-in zoom-in-90 shrink-0 whitespace-nowrap">
                              <Check className="h-3 w-3 stroke-[3]" /> Seleccionada
                            </span>
                          )}
                          {Boolean((o as any).cliente_nombre || clientes.find((c) => c.id === o.cliente_id)?.nombre) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                              <User className="h-2.5 w-2.5 text-[#1B4B73] dark:text-sky-300 shrink-0" />
                              <span>{(o as any).cliente_nombre || `${clientes.find((c) => c.id === o.cliente_id)?.nombre || ""} ${clientes.find((c) => c.id === o.cliente_id)?.apellido || ""}`.trim()}</span>
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                            <Store className="h-2.5 w-2.5 text-[#1B4B73] dark:text-sky-300 shrink-0" />
                            <span>Origen: <strong className="font-extrabold">{o.sucursal_origen_nombre || o.tenant_sucursal || o.tenant_nombre}</strong></span>
                          </span>
                          {o.sucursal_destino_nombre && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shadow-2xs">
                              <ArrowRightLeft className="h-2.5 w-2.5 text-[#1B4B73] dark:text-sky-300 shrink-0" />
                              <span>Destino: <strong className="font-extrabold">{o.sucursal_destino_nombre}</strong></span>
                            </span>
                          )}
                          <OrderStatusBadge estado={o.estado} />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          {o.ubicacion_ropa && (
                            <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-700 dark:text-slate-300">
                              <MapPin className="h-3 w-3 text-[#1B4B73] dark:text-sky-300 shrink-0" />
                              <span>{o.ubicacion_ropa}</span>
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-700 dark:text-slate-300">
                            <Calendar className="h-3 w-3 text-[#1B4B73] dark:text-sky-300 shrink-0" />
                            <span>Entrega: {o.fecha_entrega ? formatDateRD(o.fecha_entrega) : "—"}</span>
                          </span>
                          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-700 dark:text-slate-300">
                            <Shirt className="h-3 w-3 text-[#1B4B73] dark:text-sky-300 shrink-0" />
                            <span>{(o.items || []).reduce((acc, it) => acc + (it.cantidad || 0), 0)} prendas</span>
                          </span>
                          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-700 dark:text-slate-300">
                            <DollarSign className="h-3 w-3 text-[#1B4B73] dark:text-sky-300 shrink-0" />
                            <span className="font-bold text-slate-900 dark:text-slate-100">Total: {formatRD(o.total)}</span>
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              saldo > 0
                                ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            }`}
                          >
                            {saldo > 0 ? (
                              <>
                                <AlertTriangle className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                                <span>Saldo: {formatRD(saldo)}</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                                <span>Pagado</span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsViewFromNetwork(true);
                            setView(o);
                            setShowNetworkSearchModal(false);
                          }}
                          className="h-7.5 px-2 text-xs font-bold rounded-lg border-border cursor-pointer hover:bg-accent"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Detalle
                        </Button>
                        {hasTransferirOrden && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setTransferOrderTarget(o);
                              setSelectedDestinoTenantId(tenant.id);
                            }}
                            className="h-7.5 px-2.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                          >
                            <ArrowRightLeft className="h-3 w-3 mr-1" />
                            Transferir
                          </Button>
                        )}
                        {saldo > 0 && o.estado !== "ANULADA" && canSucursalCobrarOrden(o, tenant) && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setCobrarOrden(o);
                              setShowNetworkSearchModal(false);
                            }}
                            className="h-7.5 px-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                          >
                            <DollarSign className="h-3 w-3 mr-0.5" />
                            Cobrar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Barra de acción en lote dentro del modal de red */}
          {hasTransferirOrden && selectedBatchOrders.length > 0 && (
            <div
              style={{ backgroundColor: "#ffffff" }}
              className="shrink-0 p-2.5 rounded-2xl !bg-white dark:!bg-slate-900 text-slate-900 dark:text-slate-100 shadow-md border-2 border-[#1B4B73]/25 dark:border-blue-500/40 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                  {selectedBatchOrders.length}
                </div>
                <div className="min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {selectedBatchOrders.length === 1 ? "1 orden seleccionada" : `${selectedBatchOrders.length} órdenes seleccionadas`}
                    </span>
                  </div>
                  <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium truncate">
                    {totalPrendasBatch} {totalPrendasBatch === 1 ? "prenda" : "prendas"} • <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatRD(totalMontoBatch)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={clearBatchOrders}
                  className="h-8 px-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs shadow-xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <X className="h-3 w-3 stroke-[3] text-white" />
                  <span>Deseleccionar</span>
                </button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const availableBranches = sisterBranches.filter((b) => b.id !== (tenant?.id || ""));
                    if (!batchDestinoTenantId && availableBranches.length > 0) {
                      setBatchDestinoTenantId(availableBranches[0].id);
                    }
                    setShowBatchTransferModal(true);
                  }}
                  className="h-8 px-3 rounded-xl bg-[#1B4B73] hover:bg-[#143a59] text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span>Transferir Lote ({selectedBatchOrders.length})</span>
                </Button>
              </div>
            </div>
          )}

          {/* Pie de Paginación Fijo y Compacto */}
          {filteredNetworkOrders.length > 0 && (
            <div
              style={{ backgroundColor: "#ffffff" }}
              className="shrink-0 pt-2.5 mt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 !bg-white dark:!bg-slate-900"
            >
              <div className="text-xs text-muted-foreground font-medium truncate">
                Mostrando <span className="font-bold text-foreground">{(networkCurrentPage - 1) * NETWORK_PAGE_SIZE + 1}</span> -{" "}
                <span className="font-bold text-foreground">{Math.min(networkCurrentPage * NETWORK_PAGE_SIZE, filteredNetworkOrders.length)}</span> de{" "}
                <span className="font-bold text-foreground">{filteredNetworkOrders.length}</span> órdenes
              </div>
              {totalNetworkPages > 1 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    disabled={networkCurrentPage <= 1}
                    onClick={() => setNetworkCurrentPage((p) => Math.max(p - 1, 1))}
                    className="h-8 px-3 rounded-xl text-xs font-bold bg-[#1B4B73] hover:bg-[#143d5f] text-white shadow-xs cursor-pointer border-0 disabled:opacity-40 disabled:hover:bg-[#1B4B73]"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    Anterior
                  </Button>
                  <div className="px-2.5 py-1 text-xs font-black text-foreground bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
                    {networkCurrentPage} / {totalNetworkPages}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={networkCurrentPage >= totalNetworkPages}
                    onClick={() => setNetworkCurrentPage((p) => Math.min(p + 1, totalNetworkPages))}
                    className="h-8 px-3 rounded-xl text-xs font-bold bg-[#1B4B73] hover:bg-[#143d5f] text-white shadow-xs cursor-pointer border-0 disabled:opacity-40 disabled:hover:bg-[#1B4B73]"
                  >
                    Siguiente
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL: TRANSFERIR ORDEN ENTRE SUCURSALES */}
      <Dialog open={!!transferOrderTarget} onOpenChange={(open) => !open && setTransferOrderTarget(null)}>
        <DialogContent
          style={{ backgroundColor: "#ffffff" }}
          className="max-w-md rounded-3xl p-5 sm:p-6 !bg-white dark:!bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl"
        >
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-foreground">
                  Transferir Orden #{transferOrderTarget?.numero}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Transfiere esta orden a otra sucursal o al taller central de la red.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div
              style={{ backgroundColor: "#ffffff" }}
              className="p-3.5 rounded-2xl !bg-white dark:!bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-6 w-6 rounded-lg bg-[#1B4B73] text-white flex items-center justify-center shadow-xs">
                    <Store className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="font-medium">Sucursal Origen</span>
                </div>
                <span className="font-bold text-foreground truncate max-w-[200px]">
                  {transferOrderTarget?.sucursal_origen_nombre || getTenantBranchName(tenant)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-6 w-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <DollarSign className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="font-medium">Total / Saldo</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-foreground">
                    {formatRD(transferOrderTarget?.total || 0)}
                  </span>
                  <span className="ml-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    (Saldo: {formatRD(transferOrderTarget?.saldo || 0)})
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-6 w-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Activity className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="font-medium">Estado Actual</span>
                </div>
                <div>
                  <OrderStatusBadge estado={transferOrderTarget?.estado || "RECIBIDA"} />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                Selecciona la Sucursal de Destino *
              </label>
              <TransferDestinoSelect
                branches={sisterBranches.filter((branch) => branch.id !== (transferOrderTarget?.tenant_id || tenant.id))}
                value={selectedDestinoTenantId}
                onChange={setSelectedDestinoTenantId}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                Motivo del traslado
              </label>
              <Select value={motivoTransferencia} onValueChange={setMotivoTransferencia}>
                <SelectTrigger
                  style={{ backgroundColor: "#ffffff" }}
                  className="h-12 rounded-2xl !bg-white dark:!bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-xs font-medium text-xs sm:text-sm"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-1.5">
                  <SelectItem value="Cliente solicita retirar en otra sucursal">
                    Cliente solicita retirar en otra sucursal
                  </SelectItem>
                  <SelectItem value="Envío a Taller Central / Matriz para lavado">
                    Envío a Taller Central / Matriz para lavado
                  </SelectItem>
                  <SelectItem value="Retorno de prendas terminadas a sucursal">
                    Retorno de prendas terminadas a sucursal
                  </SelectItem>
                  <SelectItem value="Apoyo logístico por alta demanda de trabajo">
                    Apoyo logístico por alta demanda de trabajo
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTransferOrderTarget(null)}
              className="h-9 px-3 text-xs font-bold rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isTransferring || !selectedDestinoTenantId}
              onClick={handleExecuteTransfer}
              className="h-9 px-4 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              {isTransferring ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Transfiriendo...</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span>Confirmar Transferencia</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: TRANSFERENCIA EN LOTE DE ÓRDENES */}
      <Dialog open={showBatchTransferModal} onOpenChange={setShowBatchTransferModal}>
        <DialogContent
          style={{ backgroundColor: "#ffffff" }}
          className="max-w-lg rounded-3xl p-5 sm:p-6 !bg-white dark:!bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-[70]"
        >
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-2xl bg-[#1B4B73]/10 text-[#1B4B73] dark:bg-blue-900/30 dark:text-blue-300 flex items-center justify-center shrink-0">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-foreground">
                  Transferir {selectedBatchOrders.length} {selectedBatchOrders.length === 1 ? "Orden en Lote" : "Órdenes en Lote"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Transfiere las órdenes seleccionadas a otra sucursal o al taller central de la red.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Resumen del lote */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span>Órdenes seleccionadas ({selectedBatchOrders.length})</span>
                <span className="text-[11px] text-muted-foreground">
                  Total: <strong className="text-emerald-600 dark:text-emerald-400">{formatRD(totalMontoBatch)}</strong>
                </span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {selectedBatchOrders.map((ord) => {
                  const prendasCount = ord.items?.reduce((acc, i) => acc + (i.cantidad || 0), 0) || 0;
                  return (
                    <div
                      key={ord.id}
                      className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          #{ord.numero}
                        </span>
                        <span className="font-medium text-foreground truncate max-w-[140px] sm:max-w-[180px]">
                          {ord.cliente_nombre || "Cliente"}
                        </span>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          ({prendasCount} {prendasCount === 1 ? "prenda" : "prendas"})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {formatRD(ord.total || 0)}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleBatchOrder(ord)}
                          className="h-6 w-6 rounded-md hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                          title="Remover de este lote"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                Selecciona la Sucursal de Destino *
              </label>
              <TransferDestinoSelect
                branches={sisterBranches.filter((branch) => branch.id !== (tenant?.id || ""))}
                value={batchDestinoTenantId}
                onChange={setBatchDestinoTenantId}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                Motivo del traslado en lote
              </label>
              <Select value={batchMotivoTransferencia} onValueChange={setBatchMotivoTransferencia}>
                <SelectTrigger
                  style={{ backgroundColor: "#ffffff" }}
                  className="h-11 rounded-2xl !bg-white dark:!bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-xs font-medium text-xs sm:text-sm"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-1.5">
                  <SelectItem value="Traslado en lote de órdenes para lavado/producción">
                    Traslado en lote de órdenes para lavado/producción
                  </SelectItem>
                  <SelectItem value="Envío a Taller Central / Matriz para lavado">
                    Envío a Taller Central / Matriz para lavado
                  </SelectItem>
                  <SelectItem value="Retorno de prendas terminadas a sucursal">
                    Retorno de prendas terminadas a sucursal
                  </SelectItem>
                  <SelectItem value="Apoyo logístico por alta demanda de trabajo">
                    Apoyo logístico por alta demanda de trabajo
                  </SelectItem>
                  <SelectItem value="Cliente solicita retirar en otra sucursal">
                    Cliente solicita retirar en otra sucursal
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowBatchTransferModal(false)}
              className="h-9 px-3 text-xs font-bold rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isTransferringBatch || !batchDestinoTenantId || selectedBatchOrders.length === 0}
              onClick={handleExecuteBatchTransfer}
              className="h-9 px-4 text-xs font-bold rounded-xl bg-[#1B4B73] hover:bg-[#143a59] text-white shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
            >
              {isTransferringBatch ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Transfiriendo lote...</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span>Confirmar Traslado ({selectedBatchOrders.length})</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BARRA FLOTANTE INFERIOR DE ACCIÓN EN LOTE (CTRL + CLIC) */}
      <AnimatePresence>
        {hasTransferirOrden && selectedBatchOrders.length > 0 && !showNetworkSearchModal && !showBatchTransferModal && (
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{ backgroundColor: "#ffffff" }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-auto max-w-[95vw] !bg-white dark:!bg-slate-900 border-2 border-[#1B4B73]/25 dark:border-blue-500/40 shadow-2xl rounded-2xl p-2.5 sm:p-3 flex items-center justify-center gap-3 sm:gap-5 text-slate-900 dark:text-slate-100"
          >
            <div className="flex items-center gap-3 shrink-0">
              <div className="h-9 w-9 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                {selectedBatchOrders.length}
              </div>
              <div className="flex flex-col justify-center shrink-0">
                <div className="flex items-center gap-2 flex-nowrap">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">
                    {selectedBatchOrders.length === 1 ? "1 orden seleccionada" : `${selectedBatchOrders.length} órdenes seleccionadas`}
                  </span>
                </div>
                <div className="text-[11.5px] text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5 whitespace-nowrap">
                  <span>{totalPrendasBatch} {totalPrendasBatch === 1 ? "prenda" : "prendas"}</span>
                  <span>•</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatRD(totalMontoBatch)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={clearBatchOrders}
                className="h-9 sm:h-10 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <X className="h-3.5 w-3.5 stroke-[3] text-white" />
                <span>Deseleccionar</span>
              </button>

              <Button
                type="button"
                onClick={() => {
                  const availableBranches = sisterBranches.filter((b) => b.id !== (tenant?.id || ""));
                  if (!batchDestinoTenantId && availableBranches.length > 0) {
                    setBatchDestinoTenantId(availableBranches[0].id);
                  }
                  setShowBatchTransferModal(true);
                }}
                className="h-9 sm:h-10 px-4 rounded-xl bg-[#1B4B73] hover:bg-[#143a59] active:bg-[#0f2c44] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#1B4B73]/20 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0"
              >
                <ArrowRightLeft className="h-4 w-4" />
                <span>Transferir Lote ({selectedBatchOrders.length})</span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {showPrintProduccion && (
        <TicketPrintPortal
          orden={showPrintProduccion}
          tenant={tenant}
          clientes={clientes}
          empleados={empleados}
          esProduccion={true}
          onClose={() => {
            setShowPrintProduccion(null);
          }}
        />
      )}

      {showPrintMarquillas && (
        <TicketPrintPortal
          orden={showPrintMarquillas}
          tenant={tenant}
          clientes={clientes}
          empleados={empleados}
          esMarquillas={true}
          onClose={() => {
            setShowPrintMarquillas(null);
          }}
        />
      )}

      {showDownloadA4 && (
        <FacturaA4PrintPortal
          orden={showDownloadA4}
          tenant={tenant}
          clientes={clientes}
          empleados={empleados}
          onClose={() => setShowDownloadA4(null)}
        />
      )}

      {/* Anular */}
      <Dialog
        open={!!anular}
        onOpenChange={(o) => {
          if (!o && !isAnulando) {
            setAnular(null);
            setConfirmarAnulacion(false);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-rose-600" />
              <span>Anular {anular?.numero}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {anular?.ncf ? (
              <>
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 text-xs flex items-start gap-2.5">
                  <FileText className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-[13px] block">Factura DGII: {anular.ncf}</span>
                    <p className="text-slate-600 dark:text-slate-300 text-[11.5px] leading-relaxed">
                      Esta orden tiene un comprobante fiscal emitido. Al anularla se transmitirá
                      automáticamente una <b>Nota de Crédito (E34)</b> a la DGII.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground mb-1.5 block">
                    Tipo de Modificación (DGII)
                  </label>
                  <Select value="01" onValueChange={setCodigoAnular} disabled>
                    <SelectTrigger className="w-full h-10 rounded-xl bg-white text-slate-900 dark:bg-white dark:text-slate-900 disabled:opacity-100">
                      <SelectValue placeholder="Seleccione código DGII" />
                    </SelectTrigger>
                    <SelectContent
                      align="start"
                      sideOffset={4}
                      className="bg-white text-slate-900 dark:bg-white dark:text-slate-900"
                    >
                      <SelectItem value="01">01 - Anulación total del comprobante</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs flex items-start gap-2.5">
                <XCircle className="h-4.5 w-4.5 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-foreground block text-[13px]">
                    Anulación Interna
                  </span>
                  <p className="text-muted-foreground text-[11.5px] leading-relaxed">
                    Esta orden no tiene comprobante fiscal reportado ante la DGII. Se anulará
                    directamente en el sistema.
                    {anular && anular.pagado > 0 && cajaAbierta && (
                      <span className="block mt-1.5 font-bold text-amber-700 dark:text-amber-300">
                        💸 Se registrará un egreso por reembolso de {formatRD(anular.pagado)} en la
                        caja abierta.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-foreground mb-1.5 block">
                {anular?.ncf ? "Motivo descriptivo (DGII)" : "Motivo de la anulación"}
              </label>
              <Input
                value={motivoAnular}
                onChange={(e) => setMotivoAnular(e.target.value)}
                placeholder={
                  anular?.ncf ? "Ej: Error en el monto digitado" : "Ej: Cliente canceló el servicio"
                }
                className="h-10 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 dark:bg-white dark:text-slate-900 disabled:opacity-100"
                disabled={isAnulando}
              />
              <span className="text-[11px] text-muted-foreground mt-1 block">
                Mínimo 5 caracteres para confirmar.
              </span>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="rounded-xl h-10 font-bold"
              onClick={() => setAnular(null)}
              disabled={isAnulando}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl h-10 font-bold gap-2 cursor-pointer shadow-xs active:scale-95 transition-all"
              onClick={() => setConfirmarAnulacion(true)}
              disabled={motivoAnular.trim().length < 5 || isAnulando}
            >
              {isAnulando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span>
                {isAnulando
                  ? anular?.ncf
                    ? "Procesando con DGII…"
                    : "Anulando orden…"
                  : "Anular orden"}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmarAnulacion}
        onOpenChange={(open) => !isAnulando && setConfirmarAnulacion(open)}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
              <AlertTriangle className="h-5 w-5" />
              Confirmar anulación definitiva
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-left">
              <span className="block">
                ¿Confirmas que deseas anular la orden <b>{anular?.numero}</b>?
              </span>
              {anular?.ncf && (
                <span className="block rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                  Se emitirá una Nota de Crédito electrónica E34 contra <b>{anular.ncf}</b>. Klynn
                  solo marcará la orden como anulada cuando EF2/DGII acepte el comprobante.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isAnulando}>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void anularOrden();
              }}
              disabled={isAnulando}
              className="bg-rose-600 text-white hover:bg-rose-700 gap-2"
            >
              {isAnulando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {isAnulando
                ? anular?.ncf
                  ? "Enviando a EF2/DGII…"
                  : "Anulando orden…"
                : anular?.ncf
                  ? "Sí, anular y emitir E34"
                  : "Sí, anular orden"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Nota de Débito */}
      <Dialog
        open={!!debito}
        onOpenChange={(open) => {
          if (!open && !isGenerandoDebito) {
            setDebito(null);
            setConfirmarNotaDebito(false);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-blue-600" />
              Generar Nota de Débito
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="flex items-start gap-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 text-xs text-blue-950 dark:text-blue-200">
              <FileText className="mt-0.5 h-4.5 w-4.5 shrink-0 text-blue-600" />
              <div className="space-y-0.5">
                <span className="block text-[13px] font-bold">Factura DGII: {debito?.ncf}</span>
                <p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                  Se transmitirá una <b>Nota de Débito electrónica E33</b> por un cargo adicional.
                  Klynn solo aumentará la deuda cuando EF2/DGII la acepte.
                </p>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold">Monto adicional (RD$)</label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                value={montoDebito || ""}
                onChange={(e) => setMontoDebito(Number(e.target.value))}
                placeholder="0.00"
                className="h-10 rounded-xl bg-white text-base font-bold text-slate-900 placeholder:text-slate-400 dark:bg-white dark:text-slate-900 disabled:opacity-100"
                disabled={isGenerandoDebito}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold">Razón de modificación (DGII)</label>
              <Input
                value={motivoDebito}
                onChange={(e) => setMotivoDebito(e.target.value)}
                placeholder="Ej: Cargo adicional por servicio express"
                className="h-10 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 dark:bg-white dark:text-slate-900 disabled:opacity-100"
                disabled={isGenerandoDebito}
              />
              <span className="mt-1 block text-[11px] text-muted-foreground">
                Mínimo 5 caracteres para confirmar.
              </span>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="h-10 rounded-xl font-bold"
              onClick={() => setDebito(null)}
              disabled={isGenerandoDebito}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => setConfirmarNotaDebito(true)}
              disabled={isGenerandoDebito || montoDebito <= 0 || motivoDebito.trim().length < 5}
              className="h-10 rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-700 gap-2"
            >
              {isGenerandoDebito ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpCircle className="h-4 w-4" />
              )}
              {isGenerandoDebito
                ? tenant.pais_codigo === "EC"
                  ? "Transmitiendo al SRI…"
                  : "Procesando con DGII…"
                : "Generar Nota de Débito"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmarNotaDebito}
        onOpenChange={(open) => !isGenerandoDebito && setConfirmarNotaDebito(open)}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <AlertTriangle className="h-5 w-5" /> Confirmar Nota de Débito{" "}
              {tenant.pais_codigo === "EC" ? "SRI (05)" : "E33"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-left">
              <span className="block">
                ¿Confirmas el cargo adicional de{" "}
                <b>{tenant.pais_codigo === "EC" ? `$${montoDebito.toFixed(2)}` : formatRD(montoDebito)}</b>{" "}
                para la orden <b>{debito?.numero}</b>?
              </span>
              <span className="block rounded-lg border border-blue-300 bg-blue-50 p-3 text-blue-900 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
                La {tenant.pais_codigo === "EC" ? "Nota de Débito SRI" : "E33"} referenciará el
                comprobante <b>{debito?.sri_secuencial || debito?.ncf || debito?.numero}</b>.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isGenerandoDebito}>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void generarNotaDebito();
              }}
              disabled={isGenerandoDebito}
              className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              {isGenerandoDebito ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpCircle className="h-4 w-4" />
              )}
              {isGenerandoDebito
                ? "Transmitiendo al SRI…"
                : tenant.pais_codigo === "EC"
                  ? "Sí, emitir Nota de Débito SRI"
                  : "Sí, emitir E33"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Nota de Crédito */}
      <Dialog
        open={!!credito}
        onOpenChange={(open) => {
          if (!open && !isGenerandoCredito) {
            setCredito(null);
            setConfirmarNotaCredito(false);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-amber-600" />
              Generar Nota de Crédito
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-950 dark:text-amber-200">
              <FileText className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-600" />
              <div className="space-y-0.5">
                <span className="block text-[13px] font-bold">
                  {tenant.pais_codigo === "EC"
                    ? `Factura SRI: ${credito?.sri_secuencial || credito?.numero}`
                    : `Factura DGII: ${credito?.ncf}`}
                </span>
                <p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                  {tenant.pais_codigo === "EC"
                    ? "Se transmitirá una Nota de Crédito oficial (código 04) autorizada ante el SRI Ecuador."
                    : "Se transmitirá una Nota de Crédito electrónica E34. Klynn solo aplicará el ajuste cuando EF2/DGII la acepte."}
                </p>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold">
                Tipo de Modificación ({tenant.pais_codigo === "EC" ? "SRI" : "DGII"})
              </label>
              <Select
                value={codigoCredito}
                onValueChange={(value) => {
                  setCodigoCredito(value);
                  if (value !== "03") setMontoCredito(0);
                }}
                disabled={isGenerandoCredito}
              >
                <SelectTrigger className="h-10 w-full rounded-xl bg-white text-slate-900 dark:bg-white dark:text-slate-900 disabled:opacity-100">
                  <SelectValue placeholder="-- Seleccione --" />
                </SelectTrigger>
                <SelectContent
                  align="start"
                  sideOffset={4}
                  className="bg-white text-slate-900 dark:bg-white dark:text-slate-900"
                >
                  <SelectItem value="01">
                    {tenant.pais_codigo === "EC" ? "01 — Anulación Total de Factura" : "1 - Anulación Total"}
                  </SelectItem>
                  {tenant.pais_codigo !== "EC" && (
                    <SelectItem value="02">2 - Corrección de Texto</SelectItem>
                  )}
                  <SelectItem value="03">
                    {tenant.pais_codigo === "EC" ? "03 — Descuento / Devolución Parcial" : "3 - Corrección de Montos"}
                  </SelectItem>
                  {tenant.pais_codigo !== "EC" && (
                    <SelectItem value="04">4 - Reemplazo por Contingencia</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            {codigoCredito === "03" && (
              <div>
                <label className="mb-1.5 block text-xs font-bold">
                  {tenant.pais_codigo === "EC" ? "Monto a devolver (USD $)" : "Monto a corregir (RD$)"}
                </label>
                <Input
                  type="number"
                  min={0.01}
                  max={credito?.total || 0}
                  step="0.01"
                  value={montoCredito || ""}
                  onChange={(e) => setMontoCredito(Number(e.target.value))}
                  placeholder="0.00"
                  className="h-10 rounded-xl bg-white text-base font-bold text-slate-900 placeholder:text-slate-400 dark:bg-white dark:text-slate-900 disabled:opacity-100"
                  disabled={isGenerandoCredito}
                />
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  Máximo: {tenant.pais_codigo === "EC" ? `$${(credito?.total || 0).toFixed(2)}` : formatRD(credito?.total || 0)}
                </span>
              </div>
            )}
            {codigoCredito === "01" && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                {tenant.pais_codigo === "EC"
                  ? `La Nota de Crédito SRI acreditará el total de $${(credito?.total || 0).toFixed(2)} y la orden quedará anulada.`
                  : `La E34 acreditará el total de ${formatRD(credito?.total || 0)} y la orden quedará anulada.`}
              </div>
            )}
            {(codigoCredito === "02" || codigoCredito === "04") && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                Este tipo de modificación no rebaja el monto ni genera un reembolso de caja.
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-bold">
                Motivo descriptivo ({tenant.pais_codigo === "EC" ? "SRI" : "DGII"})
              </label>
              <Input
                value={motivoCredito}
                onChange={(e) => setMotivoCredito(e.target.value)}
                placeholder="Ej: Devolución por servicio o anulación"
                className="h-10 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 dark:bg-white dark:text-slate-900 disabled:opacity-100"
                disabled={isGenerandoCredito}
              />
              <span className="mt-1 block text-[11px] text-muted-foreground">
                Mínimo 5 caracteres para confirmar.
              </span>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="h-10 rounded-xl font-bold"
              onClick={() => setCredito(null)}
              disabled={isGenerandoCredito}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => setConfirmarNotaCredito(true)}
              disabled={
                isGenerandoCredito ||
                !codigoCredito ||
                motivoCredito.trim().length < 5 ||
                (codigoCredito === "03" &&
                  (montoCredito <= 0 || montoCredito > (credito?.total || 0)))
              }
              className="h-10 rounded-xl bg-amber-600 font-bold text-white hover:bg-amber-700 gap-2"
            >
              {isGenerandoCredito ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowDownCircle className="h-4 w-4" />
              )}
              {isGenerandoCredito
                ? tenant.pais_codigo === "EC"
                  ? "Transmitiendo al SRI…"
                  : "Procesando con DGII…"
                : "Generar Nota de Crédito"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmarNotaCredito}
        onOpenChange={(open) => !isGenerandoCredito && setConfirmarNotaCredito(open)}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5" /> Confirmar Nota de Crédito{" "}
              {tenant.pais_codigo === "EC" ? "SRI (04)" : "E34"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-left">
              <span className="block">
                ¿Confirmas la emisión de la Nota de Crédito para la orden <b>{credito?.numero}</b>?
              </span>
              <span className="block rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                Tipo {codigoCredito || "—"} ·{" "}
                {codigoCredito === "01"
                  ? "Anulación Total"
                  : codigoCredito === "02"
                    ? "Corrección de Texto"
                    : codigoCredito === "03"
                      ? `Corrección de Montos (${tenant.pais_codigo === "EC" ? `$${montoCredito.toFixed(2)}` : formatRD(montoCredito)})`
                      : "Reemplazo por Contingencia"}
                . Esta acción se enviará {tenant.pais_codigo === "EC" ? "al SRI Ecuador" : "a EF2/DGII"}.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isGenerandoCredito}>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void generarNotaCredito();
              }}
              disabled={isGenerandoCredito}
              className="gap-2 bg-amber-600 text-white hover:bg-amber-700"
            >
              {isGenerandoCredito ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowDownCircle className="h-4 w-4" />
              )}
              {isGenerandoCredito
                ? "Transmitiendo al SRI…"
                : tenant.pais_codigo === "EC"
                  ? "Sí, emitir Nota de Crédito SRI"
                  : "Sí, emitir E34"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isPrintingList && (
        <OrdenesPrintPortal
          tenant={user.tenant}
          ordenes={filt}
          clientes={clientes}
          inline={embedded}
          onClose={() => setIsPrintingList(false)}
        />
      )}

      {cobrarOrden && (
        <CobrarOrdenDialog
          orden={cobrarOrden}
          onClose={() => setCobrarOrden(null)}
          tenant={user.tenant}
          cajaAbierta={cajaAbierta}
          clientes={clientes}
          queryClient={queryClient}
          showPrintPortal={(upd, rec) => {
            setShowPrint(upd);
            setPagoRecibidoParaTicket(rec);
          }}
        />
      )}

      {condonarOrden && (
        <CondonarDeudaDialog
          orden={condonarOrden}
          onClose={() => setCondonarOrden(null)}
          tenantId={tenantId}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["ordenes", tenantId] });
          }}
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
        setCredito={setCredito}
        setMontoCredito={setMontoCredito}
        setMotivoCredito={setMotivoCredito}
        setCodigoCredito={setCodigoCredito}
        setDebito={setDebito}
        setCondonarOrden={setCondonarOrden}
        setAnular={setAnular}
        setCobrarOrden={setCobrarOrden}
        setShowPrint={setShowPrint}
        setShowPrintProduccion={isTallerEnabled ? setShowPrintProduccion : undefined}
        isConveyorEnabled={isConveyorEnabled}
      />

      {/* Modal Estantería Virtual / Ubicación Directa */}
      <UbicacionSelectorDialog
        open={!!editingUbicacionOrden}
        onOpenChange={(o) => {
          if (!o) {
            setEditingUbicacionOrden(null);
            setEditingUbicacionValue("");
          }
        }}
        ubicacionActual={editingUbicacionValue}
        onSelectUbicacion={(ubi) => {
          if (editingUbicacionOrden) {
            cambiarUbicacionDirecta(editingUbicacionOrden, ubi);
          }
          setEditingUbicacionOrden(null);
          setEditingUbicacionValue("");
        }}
        tenant={tenant}
        ordenesActivas={ordenes}
        ordenActualId={editingUbicacionOrden?.id}
      />

      {/* Modal Estantería Virtual / Ubicación al pasar a Lista */}
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

      {/* Modal de Rango de Fechas Personalizado */}
      <Dialog open={showCustomDateModal} onOpenChange={setShowCustomDateModal}>
        <DialogContent className="max-w-md rounded-3xl p-6 shadow-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <CalendarDays className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Filtrar por rango de fechas
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Selecciona el período de creación de las órdenes que deseas consultar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Accesos rápidos */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                Accesos rápidos
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(() => {
                  const todayStr = formatLocalDateToInput(new Date());
                  const ayerDate = new Date();
                  ayerDate.setDate(ayerDate.getDate() - 1);
                  const ayerStr = formatLocalDateToInput(ayerDate);

                  const d7 = new Date();
                  d7.setDate(d7.getDate() - 7);
                  const d7Str = formatLocalDateToInput(d7);

                  const d15 = new Date();
                  d15.setDate(d15.getDate() - 15);
                  const d15Str = formatLocalDateToInput(d15);

                  const d30 = new Date();
                  d30.setDate(d30.getDate() - 30);
                  const d30Str = formatLocalDateToInput(d30);

                  const hoyDate = new Date();
                  const primerDia = new Date(hoyDate.getFullYear(), hoyDate.getMonth(), 1);
                  const mesActualStr = formatLocalDateToInput(primerDia);

                  const presets = [
                    { id: "hoy", label: "Hoy", desde: todayStr, hasta: todayStr },
                    { id: "ayer", label: "Ayer", desde: ayerStr, hasta: ayerStr },
                    { id: "7dias", label: "Últimos 7 días", desde: d7Str, hasta: todayStr },
                    { id: "15dias", label: "Últimos 15 días", desde: d15Str, hasta: todayStr },
                    { id: "30dias", label: "Últimos 30 días", desde: d30Str, hasta: todayStr },
                    { id: "mes_actual", label: "Mes actual", desde: mesActualStr, hasta: todayStr },
                  ];

                  return presets.map((p) => {
                    const isSelected = tempDesde === p.desde && tempHasta === p.hasta;
                    return (
                      <Button
                        key={p.id}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className={`text-xs h-9 font-bold rounded-xl transition-all active:scale-[0.98] cursor-pointer ${
                          isSelected
                            ? "bg-primary text-white border-primary shadow-xs hover:bg-primary/95 hover:text-white"
                            : "bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-primary/50 hover:text-primary"
                        }`}
                        onClick={() => {
                          setTempDesde(p.desde);
                          setTempHasta(p.hasta);
                        }}
                      >
                        {p.label}
                      </Button>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Inputs de fecha con DMYDatePicker */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground font-sans">Desde (Inicio)</label>
                <DMYDatePicker
                  value={tempDesde}
                  onChange={setTempDesde}
                  placeholder="DD/MM/AAAA"
                  className="h-10 text-xs sm:text-sm rounded-xl font-sans font-medium !bg-white bg-white hover:!bg-white hover:bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs text-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground font-sans">Hasta (Fin)</label>
                <DMYDatePicker
                  value={tempHasta}
                  onChange={setTempHasta}
                  placeholder="DD/MM/AAAA"
                  className="h-10 text-xs sm:text-sm rounded-xl font-sans font-medium !bg-white bg-white hover:!bg-white hover:bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setPeriodoCreacion("todas");
                setCustomFechaDesde("");
                setCustomFechaHasta("");
                setShowCustomDateModal(false);
              }}
              className="text-xs font-medium text-muted-foreground hover:text-foreground mr-auto"
            >
              Restablecer
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCustomDateModal(false)}
              className="text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-750"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (!tempDesde && !tempHasta) {
                  toast.error("Selecciona al menos una fecha");
                  return;
                }
                if (tempDesde && tempHasta && tempDesde > tempHasta) {
                  toast.error("La fecha 'Desde' no puede ser posterior a 'Hasta'");
                  return;
                }
                setCustomFechaDesde(tempDesde);
                setCustomFechaHasta(tempHasta);
                setPeriodoCreacion("personalizado");
                setShowCustomDateModal(false);
              }}
              className="text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
            >
              Aplicar rango
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export interface EstadoOrdenDialogProps {
  estadoModal: Orden | null;
  setEstadoModal: (o: Orden | null) => void;
  clientes: Cliente[];
  cambiarEstado: any;
  hasNotaCredito?: boolean;
  hasNotaDebito?: boolean;
  hasCondonarDeuda?: boolean;
  hasAnularOrden?: boolean;
  ecfConfig?: any;
  setCredito?: (o: Orden) => void;
  setMontoCredito?: (n: number) => void;
  setMotivoCredito?: (s: string) => void;
  setCodigoCredito?: (s: string) => void;
  setDebito?: (o: Orden) => void;
  setCondonarOrden?: (o: Orden) => void;
  setAnular?: (o: Orden) => void;
  setCobrarOrden?: (o: Orden) => void;
  setShowPrint?: (o: Orden) => void;
  setShowPrintProduccion?: (o: Orden) => void;
  isConveyorEnabled?: boolean;
}

export function EstadoOrdenDialog({
  estadoModal,
  setEstadoModal,
  clientes,
  cambiarEstado,
  hasNotaCredito = false,
  hasNotaDebito = false,
  hasCondonarDeuda = false,
  hasAnularOrden = false,
  ecfConfig,
  setCredito,
  setMontoCredito,
  setMotivoCredito,
  setCodigoCredito,
  setDebito,
  setCondonarOrden,
  setAnular,
  setCobrarOrden,
  setShowPrint,
  setShowPrintProduccion,
  isConveyorEnabled = false,
}: EstadoOrdenDialogProps) {
  if (!estadoModal) return null;

  return (
    <Dialog
      open={!!estadoModal}
      onOpenChange={(o) => {
        if (!o) setEstadoModal(null);
      }}
    >
      <DialogContent className="sm:max-w-3xl rounded-[24px] p-6 overflow-hidden bg-white shadow-2xl">
        {/* Header Top Left */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-white shrink-0 ${
                estadoModal.estado === "RECIBIDA"
                  ? "bg-blue-500"
                  : estadoModal.estado === "EN_PROCESO"
                    ? "bg-amber-500"
                    : estadoModal.estado === "LISTA"
                      ? "bg-emerald-500"
                      : "bg-purple-500"
              }`}
            >
              {estadoModal.estado === "RECIBIDA" && <Inbox className="h-4 w-4" />}
              {estadoModal.estado === "EN_PROCESO" && <RefreshCw className="h-4 w-4" />}
              {estadoModal.estado === "LISTA" && <CircleCheck className="h-4 w-4" />}
              {estadoModal.estado === "ENTREGADA" && <CheckCheck className="h-4 w-4" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <DialogTitle className="text-sm font-black leading-tight text-slate-900">
                  {estadoModal.numero}
                </DialogTitle>
                {isConveyorEnabled && estadoModal.ubicacion_ropa && (
                  <Badge className="bg-amber-500/15 text-amber-800 border-amber-300 text-[10px] font-bold px-1.5 py-0 shadow-2xs">
                    📍 {estadoModal.ubicacion_ropa}
                  </Badge>
                )}
              </div>
              <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">
                {clientes.find((c) => c.id === estadoModal.cliente_id)?.nombre ||
                  "Consumidor Final"}
              </div>
            </div>
          </div>
        </div>

        {/* Título Central Elevado */}
        <div className="text-center mb-4 -mt-7 px-8">
          <h2 className="text-xl font-black text-slate-900 tracking-tight leading-snug">
            Cambiar estado de la orden
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Selecciona el nuevo estado: <span className="font-bold text-blue-600">1. Recibida</span>{" "}
            · <span className="font-bold text-amber-600">2. En proceso</span> ·{" "}
            <span className="font-bold text-emerald-600">3. Lista</span> ·{" "}
            <span className="font-bold text-purple-600">4. Entregada</span>
          </p>
        </div>

        {/* Tarjetas de Estados */}
        <div className="grid grid-cols-4 gap-2.5 mb-3.5 px-1">
          {[
            {
              step: 1,
              value: "RECIBIDA" as EstadoOrden,
              label: "Recibida",
              icon: Inbox,
              color: "blue",
              desc: "Orden recibida e ingresada al sistema.",
            },
            {
              step: 2,
              value: "EN_PROCESO" as EstadoOrden,
              label: "En proceso",
              icon: RefreshCw,
              color: "amber",
              desc: "Servicios siendo procesados actualmente.",
            },
            {
              step: 3,
              value: "LISTA" as EstadoOrden,
              label: "Lista",
              icon: CircleCheck,
              color: "emerald",
              desc: "Servicios completados y listos para entrega.",
            },
            {
              step: 4,
              value: "ENTREGADA" as EstadoOrden,
              label: "Entregada",
              icon: CheckCheck,
              color: "purple",
              desc: "Orden entregada con éxito al cliente.",
            },
          ].map((s) => {
            const Icon = s.icon;
            const isCurrent = estadoModal.estado === s.value;
            const isCredito = isMetodoCredito(estadoModal.metodo_pago);
            const isAllowed = esTransicionEstadoPermitida(
              estadoModal.estado,
              s.value,
              estadoModal.saldo,
              estadoModal.metodo_pago,
            );
            const isBlockedBySaldo = s.value === "ENTREGADA" && estadoModal.saldo > 0 && !isCredito;

            const colorClasses = {
              blue: {
                iconBg: "bg-blue-100",
                iconColor: "text-blue-600",
                activeCardBg: "bg-blue-50/60",
                activeBorder: "border-blue-500",
                activeCheckBg: "bg-blue-500",
              },
              amber: {
                iconBg: "bg-amber-100",
                iconColor: "text-amber-600",
                activeCardBg: "bg-amber-50/60",
                activeBorder: "border-amber-500",
                activeCheckBg: "bg-amber-500",
              },
              emerald: {
                iconBg: "bg-emerald-100",
                iconColor: "text-emerald-600",
                activeCardBg: "bg-emerald-50/60",
                activeBorder: "border-emerald-500",
                activeCheckBg: "bg-emerald-500",
              },
              purple: {
                iconBg: "bg-purple-100",
                iconColor: "text-purple-600",
                activeCardBg: "bg-purple-50/60",
                activeBorder: "border-purple-500",
                activeCheckBg: "bg-purple-500",
              },
            }[s.color]!;

            let cardClass = "";
            let iconContainerClass = "";
            let iconColorClass = "";

            if (isCurrent) {
              // Único elemento seleccionado / sombreado: Estado actual
              cardClass = `border-2 ${colorClasses.activeBorder} ${colorClasses.activeCardBg} shadow-xs`;
              iconContainerClass = colorClasses.iconBg;
              iconColorClass = colorClasses.iconColor;
            } else if (isAllowed) {
              // Disponible para hacer clic directamente sin bloqueos secuenciales
              cardClass = `border border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50/80 hover:shadow-sm cursor-pointer active:scale-95 group transition-all`;
              iconContainerClass = "bg-slate-100 group-hover:bg-slate-200/80 transition-colors";
              iconColorClass = "text-slate-600 group-hover:text-slate-900 transition-colors";
            } else {
              // Bloqueado (solo entrega con saldo pendiente si no es a crédito)
              cardClass = `border border-amber-200/70 bg-amber-50/25 opacity-70 cursor-not-allowed`;
              iconContainerClass = "bg-amber-100/70";
              iconColorClass = "text-amber-600";
            }

            return (
              <button
                key={s.value}
                type="button"
                onClick={async () => {
                  if (isAllowed) {
                    const shouldCloseImmediately = await cambiarEstado(estadoModal, s.value);
                    if (shouldCloseImmediately) {
                      setEstadoModal({ ...estadoModal, estado: s.value });
                      setTimeout(() => setEstadoModal(null), 350);
                    } else {
                      // El modal de conveyor se activó: cerramos el selector de estados de inmediato
                      setEstadoModal(null);
                    }
                  }
                }}
                disabled={!isAllowed}
                className={`relative flex flex-col items-center justify-start text-center rounded-[16px] p-2.5 py-3 transition-all duration-200 ${cardClass}`}
              >
                {/* Badge Superior */}
                <div className="absolute top-2 right-2">
                  {isCurrent ? (
                    <div
                      className={`h-[18px] px-2 rounded-full flex items-center gap-1 text-white shadow-xs text-[9px] font-black uppercase tracking-wider ${colorClasses.activeCheckBg}`}
                      title="Estado actual"
                    >
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      <span>Actual</span>
                    </div>
                  ) : isAllowed ? (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-all flex items-center gap-0.5">
                      <span>Marcar</span>
                      <span>→</span>
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                      Saldo pendiente
                    </span>
                  )}
                </div>

                <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 self-start mb-1 px-1">
                  Paso {s.step}
                </div>

                <div
                  className={`h-[40px] w-[40px] rounded-full flex items-center justify-center mb-1.5 ${iconContainerClass}`}
                >
                  <Icon className={`h-5 w-5 ${iconColorClass}`} strokeWidth={2.5} />
                </div>
                <h3 className="text-xs font-bold text-slate-900 mb-0.5">{s.label}</h3>
                <p className="text-[10px] text-slate-500 leading-tight font-medium">
                  {isBlockedBySaldo
                    ? "Requiere estar pagada o a crédito para entregar."
                    : s.value === "ENTREGADA" && isCredito && estadoModal.saldo > 0
                      ? "Entrega a crédito (CxC)."
                      : s.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Acciones Adicionales / Notas, Condonación & Anulación */}
        {estadoModal.estado !== "ANULADA" &&
          (hasNotaCredito || hasNotaDebito || hasCondonarDeuda || hasAnularOrden) && (
            <div className="mb-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <div className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight text-center mb-2">
                Acciones Especiales
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {hasNotaCredito &&
                  (estadoModal.ncf?.startsWith("E") ||
                    ecfConfig?.is_active ||
                    (tenant.pais_codigo === "EC" && Boolean(estadoModal.sri_clave_acceso))) &&
                  setCredito &&
                  setMontoCredito &&
                  setMotivoCredito &&
                  setCodigoCredito && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = estadoModal;
                        setEstadoModal(null);
                        setCredito(target);
                        setMontoCredito(0);
                        setMotivoCredito("");
                        setCodigoCredito(tenant.pais_codigo === "EC" ? "01" : "");
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100/90 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 px-3 py-1.5 rounded-xl transition-all cursor-pointer border border-slate-200/80 dark:border-slate-700 active:scale-95"
                    >
                      <ArrowDownCircle className="h-4 w-4 text-slate-800 dark:text-slate-200" />
                      Nota de Crédito
                    </button>
                  )}
                {hasNotaDebito &&
                  (estadoModal.ncf?.startsWith("E") ||
                    ecfConfig?.is_active ||
                    (tenant.pais_codigo === "EC" && Boolean(estadoModal.sri_clave_acceso))) &&
                  setDebito && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = estadoModal;
                        setEstadoModal(null);
                        setDebito(target);
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-3 py-1.5 rounded-xl transition-all cursor-pointer border border-blue-200/70 dark:border-blue-800/70 active:scale-95"
                    >
                      <ArrowUpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Nota de Débito
                    </button>
                  )}
                {hasCondonarDeuda && estadoModal.saldo > 0 && setCondonarOrden && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = estadoModal;
                      setEstadoModal(null);
                      setCondonarOrden(target);
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 px-3 py-1.5 rounded-xl transition-all cursor-pointer border border-amber-200/70 dark:border-amber-800/70 active:scale-95"
                  >
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    Condonar Deuda
                  </button>
                )}
                {hasAnularOrden && setAnular && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = estadoModal;
                      setEstadoModal(null);
                      setAnular(target);
                    }}
                    className="flex items-center gap-2 text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 px-4 py-2 rounded-xl transition-all cursor-pointer border border-rose-200/80 dark:border-rose-800/80 active:scale-95 shadow-xs"
                  >
                    <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    <span>Anular Orden</span>
                  </button>
                )}
              </div>
            </div>
          )}

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button
            variant="outline"
            className="flex items-center gap-2 text-xs sm:text-sm font-bold h-10 px-4 rounded-xl border border-border/80 bg-surface hover:bg-muted/60 text-foreground shadow-xs transition-all cursor-pointer"
            onClick={() => setEstadoModal(null)}
          >
            Cancelar
          </Button>
          {estadoModal.saldo > 0 && estadoModal.estado !== "ANULADA" && setCobrarOrden && (
            <Button
              className="flex items-center gap-2 text-xs sm:text-sm font-bold h-10 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
              onClick={() => {
                const targetOrden = estadoModal;
                setEstadoModal(null);
                setCobrarOrden(targetOrden);
              }}
            >
              <DollarSign className="h-4 w-4 stroke-[3]" />
              <span>Cobrar Orden</span>
            </Button>
          )}
          {setShowPrint && (
            <Button
              className="flex items-center gap-2 text-xs sm:text-sm font-bold h-10 px-5 rounded-xl bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-xs active:scale-95 transition-all cursor-pointer"
              onClick={() => {
                const target = estadoModal;
                setEstadoModal(null);
                setShowPrint(target);
              }}
            >
              <Printer className="h-4 w-4 text-[#F0B900] shrink-0" />
              <span>Imprimir Ticket</span>
            </Button>
          )}
          {setShowPrintProduccion && (
            <Button
              variant="outline"
              className="flex items-center gap-2 text-xs sm:text-sm font-bold h-10 px-4 rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 shadow-xs active:scale-95 transition-all cursor-pointer"
              onClick={() => {
                const target = estadoModal;
                setEstadoModal(null);
                setShowPrintProduccion(target);
              }}
              title="Imprimir copia de uso interno / taller"
            >
              <Tag className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Ticket Taller</span>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function OrderDetail({
  view,
  tenant,
  clientes,
  empleados,
  cambiarEstado,
  setView,
  onPrint,
  onEdit,
  onPrintProduccion,
  onPrintMarquillas,
  setCobrarOrden,
  onEditUbicacion,
  isConveyorEnabled = false,
  onTransfer,
  isFromNetwork = false,
  onBackToNetwork,
}: {
  view: Orden;
  tenant: any;
  clientes: any[];
  empleados: any[];
  cambiarEstado: any;
  setView: any;
  onPrint: () => void;
  onEdit?: () => void;
  onPrintProduccion?: () => void;
  onPrintMarquillas?: () => void;
  setCobrarOrden: any;
  onEditUbicacion?: (orden: Orden) => void;
  isConveyorEnabled?: boolean;
  onTransfer?: (orden: Orden) => void;
  isFromNetwork?: boolean;
  onBackToNetwork?: () => void;
}) {
  const [empleadoView, setEmpleadoView] = useState<any>(null);
  const [srvList, setSrvList] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  const handleCopyOrderNumber = () => {
    if (!view?.numero) return;
    navigator.clipboard.writeText(view.numero);
    setCopied(true);
    toast.success(`Orden ${view.numero} copiada`);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (view) {
      getEmpleadoById(view.empleado_id)
        .then((res) => setEmpleadoView(res))
        .catch(() => setEmpleadoView(null));
      getServicios(tenant.id).then(setSrvList);
    }
  }, [view, tenant.id]);

  const c = clientes.find((x) => x.id === view?.cliente_id) || {
    nombre: (view as any).cliente_nombre || "Consumidor",
    apellido: (view as any).cliente_nombre ? "" : "Final",
    cedula: "",
    telefono: (view as any).cliente_telefono || "",
  };
  const emp = empleadoView ||
    empleados.find((e) => e.id === view?.empleado_id) || { nombre: "Personal" };

  return (
    <>
      <DialogHeader className="mb-4 flex flex-row items-center justify-between space-y-0 pr-8">
        <DialogTitle asChild>
          <div className="flex items-center gap-2">
            {isFromNetwork && onBackToNetwork && (
              <Button
                type="button"
                size="sm"
                onClick={onBackToNetwork}
                className="h-8.5 px-3 rounded-xl bg-[#1B4B73] hover:bg-[#143d5f] text-white font-bold text-xs shadow-xs border-0 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                style={{ backgroundColor: "#1B4B73", color: "#ffffff" }}
                title="Volver a la Consulta en la Red"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-white stroke-[2.5]" />
                <span className="text-white font-bold">Volver a la red</span>
              </Button>
            )}
            <button
              type="button"
              onClick={handleCopyOrderNumber}
              title="Clic para copiar número de orden"
              className="group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700/90 text-slate-800 dark:text-slate-100 shadow-xs transition-all duration-150 cursor-pointer active:scale-95 select-none"
            >
              <Receipt className="h-4 w-4 text-primary shrink-0" />
              <span className="font-sans text-xs sm:text-sm font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                Orden {view.numero}
              </span>
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary shrink-0 transition-colors" />
              )}

              {/* Burbuja flotante emergente "Copiado" */}
              {copied && (
                <span className="absolute -top-7.5 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-bold py-0.5 px-2 rounded-md shadow-md pointer-events-none animate-in fade-in zoom-in-95 duration-150 whitespace-nowrap z-50">
                  Copiado
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 dark:bg-slate-100 rotate-45" />
                </span>
              )}
            </button>
          </div>
        </DialogTitle>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={onPrint}
            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] font-bold text-xs sm:text-sm shadow-xs cursor-pointer active:scale-95 transition-all"
            title="Imprimir ticket regular del cliente"
          >
            <Printer className="h-4 w-4 text-[#F0B900] shrink-0" />
            <span>Ticket Cliente</span>
          </Button>
          {onPrintProduccion && (
            <Button
              onClick={onPrintProduccion}
              variant="outline"
              className="flex items-center gap-2 h-10 px-4 rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 font-bold text-xs sm:text-sm shadow-xs cursor-pointer active:scale-95 transition-all"
              title="Imprimir ticket para taller/producción con notas y ubicación"
            >
              <Tag className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Ticket Taller</span>
            </Button>
          )}
          {onPrintMarquillas && (
            <Button
              onClick={onPrintMarquillas}
              variant="outline"
              className="flex items-center gap-2 h-10 px-4 rounded-xl border border-blue-300 dark:border-blue-700/80 bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-900 dark:text-blue-200 font-bold text-xs sm:text-sm shadow-xs cursor-pointer active:scale-95 transition-all"
              title="Imprimir marquillas de prendas con corte automático"
            >
              <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Marquillas</span>
            </Button>
          )}
        </div>
      </DialogHeader>

      <div className="grid gap-4 sm:gap-5 md:grid-cols-2 items-start">
        <div
          className={`flex flex-col pr-1 custom-scrollbar overflow-y-auto ${
            isFromNetwork
              ? "gap-1.5 max-h-[calc(92vh-100px)] pb-5"
              : "gap-2 max-h-[calc(94vh-90px)]"
          }`}
        >
          {/* List items layout compactado */}
          <div className="flex flex-col">
            <div className={`flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 ${isFromNetwork ? "py-1" : "py-1.5"}`}>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <User className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold text-xs sm:text-sm">Cliente</span>
              </div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm truncate max-w-[200px]">
                {c.nombre} {c.apellido || ""}
              </div>
            </div>

            {c.telefono && c.telefono !== "---" && (
              <div className={`flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 ${isFromNetwork ? "py-1" : "py-1.5"}`}>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Phone className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-semibold text-xs sm:text-sm">Teléfono</span>
                </div>
                <div className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                  {formatPhoneRD(c.telefono)}
                </div>
              </div>
            )}

            {isConveyorEnabled && (
              <div className={`flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 ${isFromNetwork ? "py-1" : "py-1.5"}`}>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-semibold text-xs sm:text-sm">Ubicación / Conveyor</span>
                </div>
                <div className="flex items-center gap-2">
                  {view.ubicacion_ropa ? (
                    <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/60 text-xs font-black px-2 py-0.5 shadow-2xs">
                      📍 {view.ubicacion_ropa}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs italic">Sin asignar</span>
                  )}
                  {onEditUbicacion && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-6.5 text-[11px] font-bold px-2 rounded-lg border-slate-200 hover:bg-slate-100 dark:border-slate-700 active:scale-95"
                      onClick={() => {
                        setView(null);
                        onEditUbicacion(view);
                      }}
                    >
                      {view.ubicacion_ropa ? "Cambiar" : "Asignar"}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {(getNotaCreditoMonto(view) > 0 || getNotaDebitoMonto(view) > 0) && (
              <div className="my-1.5 rounded-xl border border-amber-200 bg-amber-50/80 p-2.5 dark:border-amber-800 dark:bg-amber-950/30">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span>Total original</span>
                  <span className="font-semibold line-through">{formatRD(view.total)}</span>
                </div>
                {getNotaCreditoMonto(view) > 0 && (
                  <div className="mt-1 flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-300">
                    <span className="inline-flex items-center gap-1">
                      <ArrowDownCircle className="h-3.5 w-3.5" /> Nota de Crédito E34
                    </span>
                    <span>−{formatRD(getNotaCreditoMonto(view))}</span>
                  </div>
                )}
                {getNotaDebitoMonto(view) > 0 && (
                  <div className="mt-1 flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-300">
                    <span className="inline-flex items-center gap-1">
                      <ArrowUpCircle className="h-3.5 w-3.5" /> Nota de Débito E33
                    </span>
                    <span>+{formatRD(getNotaDebitoMonto(view))}</span>
                  </div>
                )}
                <div className="mt-1.5 flex items-center justify-between border-t border-amber-200 pt-1.5 font-extrabold text-slate-950 dark:border-amber-800 dark:text-white">
                  <span>Total neto</span>
                  <span>{formatRD(getTotalNetoOrden(view))}</span>
                </div>
                {view.nota_credito_ncf && (
                  <div className="mt-0.5 text-right font-mono text-[10px] text-muted-foreground">
                    {view.nota_credito_ncf}
                  </div>
                )}
              </div>
            )}

            <div className={`flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 ${isFromNetwork ? "py-1" : "py-1.5"}`}>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Wallet className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold text-xs sm:text-sm">
                  {getNotaCreditoMonto(view) > 0 ? "Pagado originalmente" : "Pagado"}
                </span>
              </div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                {formatRD(view.pagado)}
              </div>
            </div>

            <div className={`flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 ${isFromNetwork ? "py-1" : "py-1.5"}`}>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Scale className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold text-xs sm:text-sm">Saldo</span>
              </div>
              <div className="font-black text-amber-600 dark:text-amber-400 text-xs sm:text-sm">
                {formatRD(view.saldo)}
              </div>
            </div>

            <div className={`flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 ${isFromNetwork ? "py-1" : "py-1.5"}`}>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <UserCog className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold text-xs sm:text-sm">Atendido por</span>
              </div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                {emp.nombre}
              </div>
            </div>

            <div className={`flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 ${isFromNetwork ? "py-1" : "py-1.5"}`}>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Shirt className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold text-xs sm:text-sm">Total de prendas</span>
              </div>
              <div className="font-black text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                {(() => {
                  const lbs = (view.items || []).filter((it) => it.es_libra).reduce((a, b) => a + (Number(b.cantidad) || 0), 0);
                  const pzsPorLibra = (view.items || []).filter((it) => it.es_libra).reduce((a, b) => a + (b.cantidad_prendas || 0), 0);
                  const pzsOtras = (view.items || [])
                    .filter((it) => !it.es_libra && !it.descripcion.toLowerCase().startsWith("servicio:"))
                    .reduce((a, b) => a + b.cantidad, 0);
                  const totalPzs = pzsOtras + pzsPorLibra;
                  if (lbs > 0) {
                    return pzsPorLibra > 0
                      ? `${totalPzs} (${+lbs.toFixed(2)} lb)`
                      : pzsOtras > 0
                        ? `${pzsOtras} (${+lbs.toFixed(2)} lb)`
                        : `${+lbs.toFixed(2)} lb`;
                  }
                  return totalPzs;
                })()}
              </div>
            </div>
          </div>

          {(view.sucursal_destino_nombre || view.sucursal_origen_nombre || (view.traslado_historial && view.traslado_historial.length > 0)) && (
            <div className={`rounded-xl border border-blue-200/80 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 px-2.5 ${isFromNetwork ? "py-1 my-1" : "py-1.5 my-1.5"} text-xs`}>
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <div className="flex items-center gap-1.5 font-bold text-[11px] text-blue-950 dark:text-blue-100 min-w-0">
                  <ArrowRightLeft className="h-3 w-3 text-blue-600 shrink-0" />
                  <span className="truncate max-w-[130px] sm:max-w-[160px] text-indigo-700 dark:text-indigo-300 font-extrabold" title={view.sucursal_origen_nombre}>
                    {view.sucursal_origen_nombre || "Origen"}
                  </span>
                  <span className="text-muted-foreground text-[10px] shrink-0 font-normal">➔</span>
                  <span className="truncate max-w-[130px] sm:max-w-[160px] text-sky-700 dark:text-sky-300 font-extrabold" title={view.sucursal_destino_nombre}>
                    {view.sucursal_destino_nombre || "Destino"}
                  </span>
                </div>
                {view.traslado_fecha && (
                  <span className="text-[10px] text-muted-foreground font-normal shrink-0">
                    {formatDateRD(view.traslado_fecha)}
                  </span>
                )}
              </div>

              {(view.traslado_motivo || view.sucursal_origen_telefono) && (
                <div className="flex items-center justify-between gap-2 mt-1 text-[10px] text-muted-foreground border-t border-blue-100/60 dark:border-blue-900/30 pt-1">
                  <span className="truncate text-slate-600 dark:text-slate-400">
                    {view.traslado_motivo ? (
                      <>
                        <strong className="text-slate-700 dark:text-slate-300">Motivo:</strong> {view.traslado_motivo}
                        {view.traslado_por_empleado && <span className="text-muted-foreground"> · {view.traslado_por_empleado}</span>}
                      </>
                    ) : null}
                  </span>
                  {view.sucursal_origen_telefono && (
                    <span className="shrink-0 flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
                      <Phone className="h-2.5 w-2.5" /> {view.sucursal_origen_telefono}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {view.motivo_anulacion && (
            <div className="rounded-xl bg-destructive/10 p-2.5 text-destructive border border-destructive/20 text-xs mt-1">
              <strong>Motivo anulación:</strong> {view.motivo_anulacion}
            </div>
          )}

          <div className={isFromNetwork ? "pt-0.5" : "pt-1"}>
            {onTransfer && (
              <Button
                type="button"
                variant="outline"
                className={`w-full ${isFromNetwork ? "h-8 mb-1 text-[11.5px]" : "h-9 mb-2 text-xs"} rounded-xl border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-bold shadow-xs transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2`}
                onClick={() => onTransfer(view)}
              >
                <ArrowRightLeft className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Transferir a otra sucursal de la red</span>
              </Button>
            )}
            {onEdit && (
              <Button
                type="button"
                className={`w-full ${isFromNetwork ? "h-8 mb-1 text-[11.5px]" : "h-9 mb-2 text-xs"} rounded-xl !bg-[#1B4B73] hover:!bg-[#133857] !text-white font-bold shadow-md transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 border-0`}
                style={{ backgroundColor: "#1B4B73", color: "#ffffff" }}
                onClick={onEdit}
              >
                <Pencil className="h-3.5 w-3.5 text-white shrink-0" />
                <span className="text-white font-bold tracking-wide">{orderEditLabel(view)}</span>
              </Button>
            )}
            <div className="text-center font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[9.5px] sm:text-[10px] mt-1.5 mb-1.5">
              Cambiar estado
            </div>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {(["RECIBIDA", "EN_PROCESO", "LISTA", "ENTREGADA"] as EstadoOrden[]).map((s) => {
                const isActive = view.estado === s;
                let Icon = Inbox;
                if (s === "EN_PROCESO") Icon = RefreshCw;
                if (s === "LISTA") Icon = CheckCircle2;
                if (s === "ENTREGADA") Icon = CheckCheck;

                const colorConfig: Record<
                  EstadoOrden,
                  {
                    active: string;
                    inactive: string;
                    iconActive: string;
                    iconInactive: string;
                  }
                > = {
                  RECIBIDA: {
                    active: "bg-[#1B4B73] hover:bg-[#143d5f] text-white border-[#1B4B73] ring-2 ring-[#1B4B73]/25 shadow-xs",
                    inactive: "bg-blue-50/90 hover:bg-blue-100/90 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 dark:text-blue-300 dark:border-blue-800",
                    iconActive: "text-white",
                    iconInactive: "text-blue-600 dark:text-blue-400",
                  },
                  EN_PROCESO: {
                    active: "bg-amber-500 hover:bg-amber-600 text-white border-amber-500 ring-2 ring-amber-400/30 shadow-xs",
                    inactive: "bg-amber-50/90 hover:bg-amber-100/90 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 dark:text-amber-300 dark:border-amber-800",
                    iconActive: "text-white",
                    iconInactive: "text-amber-600 dark:text-amber-400",
                  },
                  LISTA: {
                    active: "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 ring-2 ring-emerald-400/30 shadow-xs",
                    inactive: "bg-emerald-50/90 hover:bg-emerald-100/90 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-800",
                    iconActive: "text-white",
                    iconInactive: "text-emerald-600 dark:text-emerald-400",
                  },
                  ENTREGADA: {
                    active: "bg-purple-600 hover:bg-purple-700 text-white border-purple-600 ring-2 ring-purple-400/30 shadow-xs",
                    inactive: "bg-purple-50/90 hover:bg-purple-100/90 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 dark:text-purple-300 dark:border-purple-800",
                    iconActive: "text-white",
                    iconInactive: "text-purple-600 dark:text-purple-400",
                  },
                  ANULADA: {
                    active: "bg-red-600 text-white border-red-600 shadow-xs",
                    inactive: "bg-red-50 text-red-700 border-red-200",
                    iconActive: "text-white",
                    iconInactive: "text-red-600",
                  },
                };

                const currentConfig = colorConfig[s] || {
                  active: "bg-slate-700 text-white border-slate-700",
                  inactive: "bg-slate-100 text-slate-700 border-slate-200",
                  iconActive: "text-white",
                  iconInactive: "text-slate-500",
                };

                const isAllowed = esTransicionEstadoPermitida(view.estado, s, view.saldo, view.metodo_pago);

                return (
                  <Button
                    key={s}
                    variant="outline"
                    disabled={isActive || !isAllowed}
                    className={`h-8.5 sm:h-9 flex-col justify-center items-center gap-0.5 px-1 py-1 transition-all font-bold border rounded-xl text-[8.5px] sm:text-[9px] shadow-2xs ${
                      isActive
                        ? `${currentConfig.active} disabled:opacity-100 cursor-default`
                        : `${currentConfig.inactive} disabled:opacity-40 disabled:cursor-not-allowed`
                    }`}
                    onClick={async () => {
                      const shouldChange = await cambiarEstado(view, s);
                      if (shouldChange) {
                        setView({ ...view, estado: s });
                      } else {
                        // El modal de conveyor se activó: cerramos la vista de detalles para mostrarlo
                        setView(null);
                      }
                    }}
                  >
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? currentConfig.iconActive : currentConfig.iconInactive}`} />
                    <span className="truncate leading-none">{s.replace("_", " ")}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 pb-0.5">
            {view.estado !== "ANULADA" &&
              (view.saldo > 0 ? (
                canSucursalCobrarOrden(view, tenant) ? (
                  <Button
                    className={`w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md font-bold ${
                      isFromNetwork ? "h-9.5 text-xs sm:text-[13px]" : "h-10 text-xs sm:text-sm"
                    } rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer`}
                    onClick={() => {
                      setView(null);
                      setCobrarOrden(view);
                    }}
                  >
                    <DollarSign className="h-4 w-4" />
                    Cobrar Orden ({formatRD(view.saldo)})
                  </Button>
                ) : (
                  <div className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 text-center flex items-center justify-center gap-1.5 shadow-2xs">
                    <Store className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Cobro disponible solo en sucursal dueña o destino</span>
                  </div>
                )
              ) : (
                <Button
                  variant="outline"
                  className={`w-full bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-700 border-emerald-200 font-bold ${
                    isFromNetwork ? "h-9.5 text-xs sm:text-[13px]" : "h-10 text-xs sm:text-sm"
                  } rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer`}
                  onClick={() => {
                    setView(null);
                    onPrint();
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Orden Pagada · Ver Recibo
                </Button>
              ))}
          </div>
        </div>

        {/* Tarjeta con Fondo Temático de Lavandería (Alineada arriba a nivel de Cliente) */}
        <div
          className={`relative w-full ${
            isFromNetwork
              ? "max-h-[calc(88vh-90px)] sm:max-h-[600px]"
              : "max-h-[calc(84vh-90px)] sm:max-h-[580px]"
          } overflow-y-auto custom-scrollbar rounded-2xl bg-slate-100/90 dark:bg-slate-900/60 p-3 shadow-inner border border-slate-200/60 dark:border-slate-800 flex flex-col items-center`}
        >
          {/* Fondo de Iconos de Lavandería Sutiles (Marca de Agua) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none opacity-[0.06] text-primary flex flex-wrap justify-between p-6 gap-8">
            <Shirt className="h-12 w-12 -rotate-12" />
            <Droplets className="h-10 w-10 rotate-45" />
            <Sparkles className="h-11 w-11" />
            <Wind className="h-10 w-10 -rotate-45" />
            <Shirt className="h-14 w-14 rotate-12" />
            <Droplets className="h-12 w-12 -rotate-12" />
            <Sparkles className="h-10 w-10 rotate-12" />
            <Wind className="h-12 w-12" />
          </div>

          {/* Recibo Térmico Centrado con espacio inferior generoso para permitir desplazamiento completo */}
          <div className="relative z-10 w-full flex justify-center pt-1 pb-28">
            <div
              className="mx-auto flex justify-center [&_.thermal-ticket]:mx-auto [&_.thermal-ticket]:px-4 [&_.thermal-ticket]:shadow-lg [&_.thermal-ticket]:rounded-sm [&_.thermal-ticket]:mb-6"
              style={{ zoom: 0.8 }}
            >
              <Ticket
                orden={view}
                tenant={tenant}
                empleado={emp}
                cliente={c}
                formato={tenant.config!.formato_ticket}
                serviciosList={srvList}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function TicketPrintPortal({
  orden,
  tenant,
  clientes,
  empleados,
  onClose,
  pagoRecibido,
  hiddenPreview = false,
  ocultarUbicacion = false,
  ocultarNotas = false,
  esProduccion = false,
  esMarquillas = false,
}: {
  orden: Orden;
  tenant: any;
  clientes: any[];
  empleados: any[];
  onClose: () => void;
  pagoRecibido?: number;
  hiddenPreview?: boolean;
  ocultarUbicacion?: boolean;
  ocultarNotas?: boolean;
  esProduccion?: boolean;
  esMarquillas?: boolean;
}) {
  const initialEmp = empleados.find((x) => x.id === orden.empleado_id) || { nombre: "Personal" };
  const initialCli = clientes.find((c) => c.id === orden.cliente_id) || {
    nombre: "Consumidor",
    apellido: "Final",
    cedula: "",
    telefono: "",
  };

  const [emp, setEmp] = useState<any>(initialEmp);
  const [cli, setCli] = useState<any>(initialCli);
  const [srvList, setSrvList] = useState<any[]>([]);
  const [ready, setReady] = useState(false);
  const hasPrintedRef = useRef(false);
  const printRootRef = useRef<HTMLDivElement>(null);

  // Async data fetch for extra details
  useEffect(() => {
    let active = true;
    Promise.all([
      getEmpleadoById(orden.empleado_id).catch(() => null),
      Promise.resolve(clientes.find((c) => c.id === orden.cliente_id)),
      getServicios(tenant.id),
    ]).then(([e, c, s]) => {
      if (!active) return;
      if (e) setEmp(e);
      if (c) setCli(c);
      if (s) setSrvList(s);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [orden, tenant.id, clientes, empleados]);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Hook para impresión directa instantánea (Modo Kiosk) - SE EJECUTA EXACTAMENTE UNA SOLA VEZ
  useEffect(() => {
    if (!ready || hasPrintedRef.current) return;
    hasPrintedRef.current = true;

    let closed = false;
    const safeClose = () => {
      if (closed) return;
      closed = true;
      window.removeEventListener("afterprint", safeClose);
      onCloseRef.current();
    };

    const tryPrint = async () => {
      try {
        const bytes = esMarquillas
          ? encodeMarquillasEscPos(orden, tenant, cli, emp)
          : encodeEscPos(
              orden,
              tenant,
              cli,
              emp,
              srvList,
              pagoRecibido,
              ocultarUbicacion,
              ocultarNotas,
              esProduccion,
            );
        const success = await printDirectRaw(bytes, tenant.config);
        if (success) {
          toast.success(
            esMarquillas
              ? "¡Marquillas impresas con corte automático!"
              : "¡Ticket impreso en impresora física! 🖨️",
          );
          safeClose();
          return;
        }
      } catch (err: any) {
        console.error("Direct print failed in OrdenesPage:", err);
      }

      if (esMarquillas && printRootRef.current) {
        try {
          const printed = await printBrowserElementsIndividually(
            printRootRef.current,
            ".marquilla-item",
          );
          if (printed) {
            safeClose();
            return;
          }
        } catch (err) {
          console.error("No se pudieron separar las marquillas en trabajos individuales:", err);
        }
      }

      // Fallback a diálogo del navegador (window.print)
      window.addEventListener("afterprint", safeClose, { once: true });
      const printTimer = setTimeout(() => {
        try {
          window.print();
        } catch (err) {
          console.error("Error al disparar window.print:", err);
          safeClose();
        }
      }, 200);

      const fallbackTimer = setTimeout(() => {
        safeClose();
      }, 7000);

      return () => {
        clearTimeout(printTimer);
        clearTimeout(fallbackTimer);
      };
    };

    void tryPrint();

    return () => {
      window.removeEventListener("afterprint", safeClose);
    };
  }, [ready]);

  if (!emp || !cli) return null;

  return createPortal(
    <div
      ref={printRootRef}
      className="fixed inset-0 bg-white z-[99999] overflow-y-auto pointer-events-auto atomic-print-target opacity-0 pointer-events-none print:opacity-100"
    >
      <div className="max-w-md mx-auto p-0 print:p-0 print:max-w-none print:m-0">
        {esMarquillas ? (
          <MarquillasTicket
            orden={orden}
            tenant={tenant}
            cliente={cli}
            empleado={emp}
            formato={tenant.config?.formato_ticket || "80mm"}
          />
        ) : (
          <div
            className="ticket-page"
            data-print-job="true"
            data-print-kind={esProduccion ? "taller" : "cliente"}
          >
            <Ticket
              orden={orden}
              tenant={tenant}
              empleado={emp}
              cliente={cli}
              formato={tenant.config?.formato_ticket || "80mm"}
              serviciosList={srvList}
              pagoRecibido={pagoRecibido}
              ocultarUbicacion={ocultarUbicacion}
              ocultarNotas={ocultarNotas}
              esProduccion={esProduccion}
            />
          </div>
        )}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page {
            margin: 0 !important;
          }

          html,
          body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff;
            overflow: visible !important;
            height: auto !important;
          }

          /* Ocultar todo el sitio */
          body > *:not(.atomic-print-target) { display: none !important; }

          /* Mostrar solo el ticket */
          .atomic-print-target {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: relative !important;
            left: -2mm !important;
            width: 100% !important;
            max-width: ${tenant.config?.formato_ticket === "57mm" ? "52mm" : "72mm"} !important;
            padding: ${tenant.config?.formato_ticket === "57mm" ? "1.5mm" : "2mm"} !important;
            margin: 0 auto !important;
            background: white;
            color: black;
            font-family: "Segoe UI", Arial, sans-serif !important;
            font-size: ${tenant.config?.formato_ticket === "57mm" ? "10px" : "12px"};
            line-height: ${tenant.config?.formato_ticket === "57mm" ? "1.2" : "1.3"};
            box-sizing: border-box !important;
          }

          .marquillas-container {
            display: block !important;
            width: 100% !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          .ticket-page,
          .marquilla-item {
            display: block !important;
            width: 100% !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .ticket-page:last-child,
          .marquilla-item:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .page-break-divider {
            display: block !important;
            page-break-after: always !important;
            break-after: page !important;
            height: 0px !important;
            margin: 0 !important;
            padding: 0 !important;
            clear: both !important;
          }

          .no-print, nav, aside, header, footer, button {
            display: none !important;
          }
        }
      `,
        }}
      />
    </div>,
    document.body,
  );
}

export function FacturaA4PrintPortal({
  orden,
  tenant,
  clientes = [],
  empleados = [],
  onClose,
}: {
  orden: Orden;
  tenant: any;
  clientes?: any[];
  empleados?: any[];
  onClose: () => void;
}) {
  const [emp, setEmp] = useState<any>(null);
  const [cli, setCli] = useState<any>(null);
  const [srvList, setSrvList] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      orden.empleado_id
        ? getEmpleadoById(orden.empleado_id).catch(() => null)
        : Promise.resolve(null),
      orden.cliente_id
        ? clientes?.find((c) => c.id === orden.cliente_id) ||
          getClienteById(orden.cliente_id).catch(() => null)
        : Promise.resolve(null),
      tenant?.id ? getServicios(tenant.id).catch(() => []) : Promise.resolve([]),
    ])
      .then(([e, c, s]) => {
        setEmp(e || empleados?.find((x) => x.id === orden.empleado_id) || { nombre: "Personal" });
        setCli(c || { nombre: "Consumidor", apellido: "Final", cedula: "", telefono: "" });
        setSrvList(s || []);
      })
      .catch(() => {
        setEmp({ nombre: "Personal" });
        setCli({ nombre: "Consumidor", apellido: "Final", cedula: "", telefono: "" });
        setSrvList([]);
      });
  }, [orden, tenant?.id, clientes, empleados]);

  if (!emp || !cli) return null;

  const isECF = !!(orden.tipo_ecf?.startsWith("E") || orden.ncf?.startsWith("E"));
  const isCreditNote = Boolean(orden.nota_credito_ncf);
  const isDebitNote = !isCreditNote && Boolean(orden.nota_debito_ncf);
  const fiscalQR = isCreditNote
    ? orden.nota_credito_qr
    : isDebitNote
      ? orden.nota_debito_qr
      : orden.ecf_qr;
  const fiscalSecurityCode = isCreditNote
    ? orden.nota_credito_codigo_seguridad
    : isDebitNote
      ? orden.nota_debito_codigo_seguridad
      : orden.ecf_security_code;
  const fiscalSignatureDate = isCreditNote
    ? orden.nota_credito_fecha_firma
    : isDebitNote
      ? orden.nota_debito_fecha_firma
      : orden.ecf_signature_date;
  const fiscalIssueDate = isCreditNote
    ? orden.nota_credito_fecha_emision
    : isDebitNote
      ? orden.nota_debito_fecha_emision
      : orden.creado_en;
  const ecfStatus = String(
    isCreditNote
      ? orden.nota_credito_estado
      : isDebitNote
        ? orden.nota_debito_estado
        : orden.ecf_status || "",
  ).toUpperCase();
  const isRejectedECF = isECF && (ecfStatus === "REJECTED" || ecfStatus === "ERROR");
  const isAcceptedECF =
    isECF &&
    !isRejectedECF &&
    (ecfStatus === "ACCEPTED" ||
      ecfStatus === "ACCEPTED_WITH_OBSERVATIONS" ||
      ecfStatus === "REGISTERED" ||
      ecfStatus === "SIGNED" ||
      ecfStatus === "DELIVERED" ||
      (!!fiscalQR && fiscalQR !== "null" && fiscalQR.length > 5));
  const isPendingECF = isECF && !isRejectedECF && !isAcceptedECF;
  const isCréditoFiscal =
    orden.tipo_ecf === "E31" || orden.ncf?.startsWith("E31") || orden.ncf?.startsWith("B01");
  const actualQR = fiscalQR === "null" ? "" : fiscalQR || "";
  const qrData = isAcceptedECF ? actualQR : "";
  const cfg = tenant.config;

  let docTitle = "Factura de Consumo";
  if (orden.nota_credito_ncf) {
    docTitle = isECF ? "Nota de Crédito Electrónica" : "Nota de Crédito";
  } else if (orden.nota_debito_ncf) {
    docTitle = isECF ? "Nota de Débito Electrónica" : "Nota de Débito";
  } else if (isRejectedECF) {
    docTitle = "Comprobante e-CF rechazado - No válido";
  } else if (isPendingECF) {
    docTitle = isCréditoFiscal ? "Pre-Factura Crédito Fiscal" : "Pre-Factura Consumidor Final";
  } else if (isCréditoFiscal) {
    docTitle = "Factura de Crédito Fiscal";
  } else if (isECF) {
    docTitle = "Factura de Consumo Electrónica";
  }

  return createPortal(
    <div className="fixed inset-0 bg-white z-[99999] overflow-y-auto pointer-events-auto atomic-print-target">
      <div className="max-w-4xl mx-auto p-8 print:p-12 print:max-w-4xl print:mx-auto">
        <div className="flex justify-between items-start border-b-2 border-primary/20 pb-6 mb-8 print:hidden relative z-[100000]">
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="gap-2 cursor-pointer"
          >
            Cerrar
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.print();
            }}
            className="bg-primary text-white gap-2 cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Imprimir / Guardar PDF
          </Button>
        </div>

        <div className="print-area">
          <div className="flex justify-between items-start mb-10">
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
              <div className="text-xs text-slate-500">Tel: {tenant.telefono}</div>
            </div>

            <div className="text-right">
              <h2 className="text-2xl font-display font-black uppercase text-slate-900 mb-1">
                {docTitle}
              </h2>
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
                ORDEN #{orden.numero}
              </div>

              <table
                className="text-xs text-slate-600 ml-auto"
                style={{ borderSpacing: 0, borderCollapse: "collapse" }}
              >
                <tbody>
                  <tr>
                    <td className="font-bold pr-1.5 text-right whitespace-nowrap">Fecha:</td>
                    <td className="text-left">
                      {new Date(fiscalIssueDate || orden.creado_en).toLocaleString("es-DO", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </td>
                  </tr>
                  {orden.nota_credito_ncf ? (
                    <>
                      <tr>
                        <td className="font-bold pr-1.5 text-right text-destructive whitespace-nowrap">
                          {isECF ? "e-NCF:" : "NCF:"}
                        </td>
                        <td className="font-mono font-bold text-destructive text-left">
                          {orden.nota_credito_ncf}
                        </td>
                      </tr>
                      {orden.ncf_vencimiento && (
                        <tr>
                          <td className="font-bold pr-1.5 text-right whitespace-nowrap">
                            Fecha Vencimiento:
                          </td>
                          <td className="text-left font-bold">
                            {formatDateRD(orden.ncf_vencimiento)}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td className="font-bold pr-1.5 text-right whitespace-nowrap">
                          Doc. Modificado:
                        </td>
                        <td className="font-mono text-left">{orden.ncf}</td>
                      </tr>
                    </>
                  ) : orden.nota_debito_ncf ? (
                    <>
                      <tr>
                        <td className="font-bold pr-1.5 text-right text-blue-700 whitespace-nowrap">
                          {isECF ? "e-NCF:" : "NCF:"}
                        </td>
                        <td className="font-mono font-bold text-blue-700 text-left">
                          {orden.nota_debito_ncf}
                        </td>
                      </tr>
                      <tr>
                        <td className="font-bold pr-1.5 text-right whitespace-nowrap">
                          Doc. Modificado:
                        </td>
                        <td className="font-mono text-left">{orden.ncf}</td>
                      </tr>
                    </>
                  ) : isPendingECF ? (
                    <>
                      <tr>
                        <td className="font-bold pr-1.5 text-right whitespace-nowrap">e-NCF:</td>
                        <td className="font-mono text-left font-bold text-amber-600">
                          Pendiente de timbrado
                        </td>
                      </tr>
                    </>
                  ) : (
                    orden.ncf && (
                      <>
                        <tr>
                          <td className="font-bold pr-1.5 text-right whitespace-nowrap">
                            {isECF ? "e-NCF:" : "NCF:"}
                          </td>
                          <td className="font-mono text-left">{orden.ncf}</td>
                        </tr>
                        {orden.ncf_vencimiento && (
                          <tr>
                            <td className="font-bold pr-1.5 text-right whitespace-nowrap">
                              Fecha Vencimiento:
                            </td>
                            <td className="text-left font-bold">
                              {formatDateRD(orden.ncf_vencimiento)}
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  )}
                  {fiscalSecurityCode && fiscalSecurityCode !== "null" && (
                    <tr>
                      <td className="font-bold pr-1.5 text-right whitespace-nowrap">
                        Cod. Seguridad:
                      </td>
                      <td className="font-mono text-left">{fiscalSecurityCode}</td>
                    </tr>
                  )}
                  {fiscalSignatureDate && fiscalSignatureDate !== "null" && (
                    <tr>
                      <td className="font-bold pr-1.5 text-right whitespace-nowrap">
                        Fecha Firma:
                      </td>
                      <td className="text-left">{formatDateTimeRD(fiscalSignatureDate)}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="font-bold pr-1.5 text-right whitespace-nowrap">Atendido por:</td>
                    <td className="text-left">{emp.nombre}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {!(cli.nombre === "Consumidor" && cli.apellido === "Final") && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 print:bg-white mb-8 flex justify-between items-center">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Facturado a
                </div>
                <div className="text-lg font-bold text-slate-900">
                  {cli.nombre} {cli.apellido || ""}
                </div>
                {cli.cedula && (
                  <div className="text-sm text-slate-600">
                    <span className="font-bold">{cli.tipo === "Empresa" ? "RNC:" : "Cédula:"}</span>{" "}
                    {cli.cedula}
                  </div>
                )}
                {cli.direccion && <div className="text-sm text-slate-600">{cli.direccion}</div>}
                {cli.telefono && cli.telefono !== "---" && (
                  <div className="text-sm text-slate-600">Tel: {cli.telefono}</div>
                )}
              </div>
            </div>
          )}

          {(() => {
            const mostrarColumnaItbis =
              Boolean(orden.itbis && orden.itbis > 0) && (cfg?.mostrar_columna_itbis ?? true);
            return (
              <table className="w-full text-left border-collapse mb-8">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="py-4 px-2 w-16">Cant.</th>
                    <th className="py-4 px-2">Descripción</th>
                    <th className="py-4 px-2 text-right">Precio Unit.</th>
                    {mostrarColumnaItbis && <th className="py-4 px-2 text-right">ITBIS</th>}
                    <th className="py-4 px-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {(() => {
                    const subtotalBruto =
                      orden.items.reduce((acc, it) => acc + it.cantidad * ((it.precio_unitario || 0) + (it.cargo_adicional || 0)), 0) +
                      (orden.servicios
                        ?.map((s) => srvList.find((x) => x.nombre === s)?.precio || 0)
                        .reduce((a, b) => a + b, 0) || 0);
                    const isItbisIncluidoEnEstaOrden =
                      cfg?.ncf_facturacion_activa && orden.itbis > 0
                        ? subtotalBruto - orden.subtotal > 1
                        : !!cfg?.itbis_incluido;
                    return (
                      <>
                        {orden.items.map((it, i) => {
                          let baseTotal = it.cantidad * ((it.precio_unitario || 0) + (it.cargo_adicional || 0));
                          let itemItbis = 0;
                          let valor = baseTotal;
                          if (cfg?.ncf_facturacion_activa && orden.itbis > 0) {
                            if (isItbisIncluidoEnEstaOrden) {
                              itemItbis =
                                baseTotal - baseTotal / (1 + (cfg.itbis_porcentaje || 18) / 100);
                              valor = mostrarColumnaItbis ? baseTotal - itemItbis : baseTotal;
                            } else {
                              itemItbis = baseTotal * ((cfg.itbis_porcentaje || 18) / 100);
                              valor = baseTotal;
                            }
                          }
                          const unitNet =
                            isItbisIncluidoEnEstaOrden &&
                            cfg?.ncf_facturacion_activa &&
                            orden.itbis > 0 &&
                            it.cantidad > 0 &&
                            mostrarColumnaItbis
                              ? valor / it.cantidad
                              : it.precio_unitario;

                          return (
                            <tr key={i} className="border-b border-slate-100">
                              <td className="py-4 px-2 font-bold text-slate-500">{it.cantidad}</td>
                              <td className="py-4 px-2 font-medium">
                                <div>{it.descripcion}</div>
                                {it.cargo_adicional && it.cargo_adicional > 0 ? (
                                  <span className="block text-xs font-semibold text-amber-600 dark:text-amber-400">
                                    + Cargo extra: {formatRD(it.cargo_adicional, tenant)} {it.cargo_adicional_motivo ? `(${it.cargo_adicional_motivo})` : ""}
                                  </span>
                                ) : null}
                              </td>
                              <td className="py-4 px-2 text-right text-slate-500">
                                {formatRD(unitNet)}
                              </td>
                              {mostrarColumnaItbis && (
                                <td className="py-4 px-2 text-right text-slate-500">
                                  {itemItbis > 0 ? formatRD(itemItbis) : "—"}
                                </td>
                              )}
                              <td className="py-4 px-2 text-right font-bold text-slate-900">
                                {formatRD(valor)}
                              </td>
                            </tr>
                          );
                        })}
                        {Array.from(new Set(orden.servicios || [])).map((sName, i) => {
                          const srv = srvList.find((s) => s.nombre === sName);
                          const unitPrice = orden.servicios_precios?.[sName] !== undefined ? orden.servicios_precios[sName] : (srv ? srv.precio : 0);
                          const qty = orden.servicios_cantidades?.[sName] || (orden.servicios?.filter((x) => x === sName).length || 1);
                          let baseTotal = unitPrice * qty;
                          let itemItbis = 0;
                          let valor = baseTotal;
                          if (cfg?.ncf_facturacion_activa && orden.itbis > 0) {
                            if (isItbisIncluidoEnEstaOrden) {
                              itemItbis =
                                baseTotal - baseTotal / (1 + (cfg.itbis_porcentaje || 18) / 100);
                              valor = mostrarColumnaItbis ? baseTotal - itemItbis : baseTotal;
                            } else {
                              itemItbis = baseTotal * ((cfg.itbis_porcentaje || 18) / 100);
                              valor = baseTotal;
                            }
                          }
                          const unitNet =
                            isItbisIncluidoEnEstaOrden &&
                            cfg?.ncf_facturacion_activa &&
                            orden.itbis > 0 &&
                            mostrarColumnaItbis
                              ? (valor / qty)
                              : unitPrice;
                          return (
                            <tr key={"s" + i} className="border-b border-slate-100">
                              <td className="py-4 px-2 font-bold text-slate-500">{qty}</td>
                              <td className="py-4 px-2 font-medium">Servicio: {sName}</td>
                              <td className="py-4 px-2 text-right text-slate-500">
                                {formatRD(unitNet)}
                              </td>
                              {mostrarColumnaItbis && (
                                <td className="py-4 px-2 text-right text-slate-500">
                                  {unitPrice > 0 && itemItbis > 0 ? formatRD(itemItbis) : "—"}
                                </td>
                              )}
                              <td className="py-4 px-2 text-right font-bold text-slate-900">
                                {formatRD(unitPrice > 0 ? valor : 0)}
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            );
          })()}

          {orden.estado === "ANULADA" && (
            <div className="mt-4 mb-8 p-6 border-2 border-destructive/20 bg-destructive/5 rounded-2xl text-center animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="text-destructive font-display font-black uppercase tracking-[0.2em] text-xs mb-2">
                Orden Anulada
              </div>
              {orden.nota_credito_ncf && (
                <div className="text-lg font-bold text-slate-900 mb-1">
                  Nota de Crédito Fiscal:{" "}
                  <span className="font-mono text-primary">{orden.nota_credito_ncf}</span>
                </div>
              )}
              {orden.motivo_anulacion && (
                <div className="text-sm text-slate-500 italic">
                  Motivo ({orden.motivo_anulacion_codigo || "01"}): " {orden.motivo_anulacion} "
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end mb-10">
            <div className="w-64">
              <div className="flex justify-between py-2 border-b border-slate-100 text-sm text-slate-600">
                <span>Total de prendas:</span>
                <span>
                  {(() => {
                    const lbs = (orden.items || []).filter((it) => it.es_libra).reduce((a, b) => a + (Number(b.cantidad) || 0), 0);
                    const pzsPorLibra = (orden.items || []).filter((it) => it.es_libra).reduce((a, b) => a + (b.cantidad_prendas || 0), 0);
                    const pzsOtras = (orden.items || [])
                      .filter((it) => !it.es_libra && !it.descripcion.toLowerCase().startsWith("servicio:"))
                      .reduce((a, b) => a + b.cantidad, 0);
                    const totalPzs = pzsOtras + pzsPorLibra;
                    if (lbs > 0) {
                      return pzsPorLibra > 0
                        ? `${totalPzs} (${+lbs.toFixed(2)} lb)`
                        : pzsOtras > 0
                          ? `${pzsOtras} (${+lbs.toFixed(2)} lb)`
                          : `${+lbs.toFixed(2)} lb`;
                    }
                    return totalPzs;
                  })()}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 text-sm text-slate-600">
                <span>Subtotal:</span>
                <span>{formatRD(orden.subtotal)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 text-sm text-slate-600">
                <span>ITBIS ({cfg?.itbis_porcentaje ?? 18}%):</span>
                <span>{formatRD(orden.total - orden.subtotal)}</span>
              </div>
              <div className="flex justify-between py-4 text-xl font-black text-primary">
                <span>TOTAL:</span>
                <span>{formatRD(orden.total)}</span>
              </div>
              <div className="flex justify-between py-2 text-xs text-slate-500">
                <span>Pago ({formatMetodoPagoLabel(orden.metodo_pago)}):</span>
                <span>{formatRD(orden.pagado)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-end border-t border-slate-200 pt-6">
            <div className="text-center text-[10px] text-slate-400 italic max-w-xs text-left">
              ¡Gracias por su preferencia!
              <br />
              Documento generado por Klynn POS
            </div>

            {isPendingECF && (
              <div className="text-center text-xs font-bold text-amber-800 bg-amber-50 border border-dashed border-amber-300 px-4 py-2 rounded-lg">
                Documento sujeto a timbrado e-CF.
              </div>
            )}

            {isECF && !isPendingECF && qrData && (
              <div className="flex flex-col items-center gap-1.5">
                <QRCodeSVG value={qrData} size={100} level="M" />
                <div className="text-[10px] text-center leading-tight text-slate-600 font-medium">
                  {fiscalSecurityCode && fiscalSecurityCode !== "null" && (
                    <div>
                      Código de Seguridad:{" "}
                      <span className="font-mono font-bold">{fiscalSecurityCode}</span>
                    </div>
                  )}
                  {fiscalSignatureDate && fiscalSignatureDate !== "null" && (
                    <div>Fecha Firma: {formatDateTimeRD(fiscalSignatureDate)}</div>
                  )}
                  {ecfStatus && (
                    <div>
                      Estado DGII: <span className="font-bold">{formatEcfStatus(ecfStatus)}</span>
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-center font-bold text-slate-500">
                  Consulte su factura en:
                  <br />
                  dgii.gov.do
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page { size: portrait; margin: 20mm; }
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

function OrdenesPrintPortal({
  tenant,
  ordenes,
  clientes,
  inline = false,
  onClose,
}: {
  tenant: any;
  ordenes: any[];
  clientes: any[];
  inline?: boolean;
  onClose: () => void;
}) {
  const [printing, setPrinting] = useState(false);
  const totalMontoGlobal = ordenes.reduce((acc, curr) => acc + getTotalNetoOrden(curr), 0);
  const totalSaldoGlobal = ordenes.reduce((acc, curr) => acc + curr.saldo, 0);

  const handlePrint = () => {
    if (inline) {
      flushSync(() => setPrinting(true));
      window.print();
      setPrinting(false);
      return;
    }
    window.print();
  };

  const report = (
    <div
      className={`${inline && !printing ? "absolute" : "fixed"} inset-0 z-[99999] overflow-y-auto overscroll-y-contain touch-pan-y bg-white text-slate-800 pointer-events-auto atomic-print-target`}
      data-scroll-lock-scrollable
    >
      <div className="sticky top-0 z-[100001] h-0 print:hidden">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar reporte y volver a Órdenes"
          title="Cerrar reporte"
          className="pointer-events-auto absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border-2 border-white/90 bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-105 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <X className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-8 print:p-12 print:max-w-4xl print:mx-auto">
        {/* Controles de impresión (ocultos al imprimir) */}
        <div className="flex justify-between items-center border-b-2 border-primary/20 pb-6 mb-8 pr-14 print:hidden relative z-[100000]">
          <Button
            onClick={onClose}
            className="gap-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            Cerrar Reporte
          </Button>
          <Button onClick={handlePrint} className="bg-primary text-white gap-2 cursor-pointer">
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
                Reporte de Órdenes
              </h2>
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
                HISTÓRICO Y ESTADOS DE SERVICIOS
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
                Total de Órdenes
              </div>
              <div className="text-xl font-bold text-slate-800">
                {ordenes.length} {ordenes.length === 1 ? "orden" : "órdenes"}
              </div>
              <div className="text-[8px] text-slate-400 mt-0.5">En el listado actual</div>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Monto Neto Facturado
              </div>
              <div className="text-xl font-bold text-emerald-600">{formatRD(totalMontoGlobal)}</div>
              <div className="text-[8px] text-slate-400 mt-0.5">
                Después de notas de crédito y débito
              </div>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Cuentas por Cobrar (Saldos)
              </div>
              <div className="text-xl font-bold text-rose-600">{formatRD(totalSaldoGlobal)}</div>
              <div className="text-[8px] text-slate-400 mt-0.5">Pendiente por cobrar</div>
            </div>
          </div>

          {/* Sección 2: Tabla de Datos */}
          <div className="border border-slate-200 rounded-xl overflow-hidden mb-8">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Número</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Saldo</th>
                  <th className="py-3 px-4 text-center">Método Pago</th>
                  <th className="py-3 px-4 text-center">Fecha / Hora</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map((o, i) => {
                  const c = clientes.find((x) => x.id === o.cliente_id);
                  return (
                    <tr
                      key={i}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                    >
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-855">{o.numero}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-700">
                        {c?.nombre || "—"}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[8px] font-black uppercase border ${
                            o.estado === "RECIBIDA"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : o.estado === "EN_PROCESO"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : o.estado === "LISTA"
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                  : o.estado === "ENTREGADA"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {o.estado.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="font-semibold text-slate-700">
                          {formatRD(getTotalNetoOrden(o))}
                        </div>
                        {getNotaCreditoMonto(o) > 0 && (
                          <div className="mt-0.5 text-[8px] font-bold text-amber-700">
                            E34 −{formatRD(getNotaCreditoMonto(o))} · original {formatRD(o.total)}
                          </div>
                        )}
                        {getNotaDebitoMonto(o) > 0 && (
                          <div className="mt-0.5 text-[8px] font-bold text-blue-700">
                            E33 +{formatRD(getNotaDebitoMonto(o))} · original {formatRD(o.total)}
                          </div>
                        )}
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-bold ${o.saldo > 0 ? "text-rose-600" : "text-slate-500"}`}
                      >
                        {o.saldo > 0 ? formatRD(o.saldo) : "—"}
                      </td>
                      <td className="py-2.5 px-4 text-center text-slate-500 whitespace-nowrap">
                        {formatMetodoPagoLabel(o.metodo_pago)}
                      </td>
                      <td className="py-2.5 px-4 text-center text-slate-500 whitespace-nowrap">
                        {formatDateTimeRD(o.creado_en)}
                      </td>
                    </tr>
                  );
                })}

                {ordenes.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 italic">
                      No hay órdenes registradas que coincidan con los filtros
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
    </div>
  );

  if (inline && !printing) return report;
  return createPortal(report, document.body);
}

// ============ DIALOG DE COBRO DE SALDO (PAGO AL RETIRAR) ============
export interface CobrarOrdenDialogProps {
  orden: Orden;
  onClose: () => void;
  tenant: any;
  cajaAbierta: Caja | null | undefined;
  clientes: Cliente[];
  queryClient: any;
  showPrintPortal?: (orden: Orden, pagoRecibido?: number) => void;
  onSuccess?: (orden: Orden) => void;
}

export function CobrarOrdenDialog({
  orden,
  onClose,
  tenant,
  cajaAbierta,
  clientes,
  queryClient,
  showPrintPortal,
  onSuccess,
}: CobrarOrdenDialogProps) {
  const currencySymbol = tenant?.moneda_simbolo || tenant?.config?.moneda_simbolo || "RD$";
  const user = useRequireAuth();
  const isAuthorized = user?.empleado?.rol === "ADMIN" || user?.empleado?.rol === "SUPERVISOR";
  const [metodo, setMetodo] = useState<MetodoPago>("EFECTIVO");
  const [recibido, setRecibido] = useState<number>(orden.saldo);
  const COBRO_PREF_KEY = "klynn_cobro_marcar_entregada_pref";
  const isAlRetirar =
    orden.metodo_pago === "PAGO_AL_RETIRAR" ||
    (orden as any).condicion_cobro === "AL_RETIRAR";

  const [entregarAlCobrar, setEntregarAlCobrar] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(COBRO_PREF_KEY);
      if (saved !== null) {
        return JSON.parse(saved) === true;
      }
    } catch {
      // fallback a condicion inicial
    }
    return isAlRetirar;
  });

  const handleToggleEntregar = (checked: boolean) => {
    setEntregarAlCobrar(checked);
    try {
      localStorage.setItem(COBRO_PREF_KEY, JSON.stringify(checked));
    } catch (e) {
      console.warn("Error guardando preferencia de marcar como entregada", e);
    }
  };

  useEffect(() => {
    if (orden.saldo <= 0) {
      toast.info(`La orden #${orden.numero} ya se encuentra pagada.`);
      onClose();
    }
  }, [orden.saldo, orden.numero, onClose]);
  const [loading, setLoading] = useState<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);
  const [showCondonar, setShowCondonar] = useState<boolean>(false);
  const [referencia, setReferencia] = useState("");
  const [showRefInput, setShowRefInput] = useState(false);

  const totalCobrar = orden.saldo;
  const vuelto = metodo === "EFECTIVO" && recibido > totalCobrar ? recibido - totalCobrar : 0;
  const faltante = recibido > 0 && recibido < totalCobrar ? totalCobrar - recibido : 0;

  const cli = clientes.find((c) => c.id === orden.cliente_id) || {
    nombre: "Consumidor",
    apellido: "Final",
    telefono: "",
    tipo: "Consumidor Final" as Cliente["tipo"],
    cedula: undefined,
  };

  const handleMetodoChange = (m: MetodoPago) => {
    setMetodo(m);
    setReferencia("");
    setShowRefInput(false);
    if (m !== "EFECTIVO" && recibido > totalCobrar) {
      setRecibido(totalCobrar);
    }
  };

  async function handleConfirmarCobro() {
    if (isSubmittingRef.current || loading) return;
    if (!cajaAbierta) {
      toast.error("Debes abrir la caja antes de registrar un pago");
      return;
    }
    if (recibido <= 0) {
      toast.error("El monto recibido debe ser mayor a cero");
      return;
    }
    if (metodo !== "EFECTIVO" && recibido > totalCobrar) {
      toast.error("El monto no puede superar el saldo pendiente para este método de pago");
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    try {
      // 1. Re-verificar contra cache local para no depender únicamente de internet
      const localExistingOrders = read<Orden[]>(KEY.ordenes, []);
      const localOrd = localExistingOrders.find((o) => o.id === orden.id);
      if (localOrd && Number(localOrd.saldo) <= 0) {
        toast.warning(`La orden #${orden.numero} ya fue saldada previamente.`);
        queryClient.invalidateQueries({ queryKey: ["ordenes", tenant.id] });
        queryClient.invalidateQueries({ queryKey: ["movimientos", tenant.id] });
        onClose();
        return;
      }

      // 2. Re-verificar contra la base de datos para evitar cobros dobles por datos desactualizados
      let targetOrden: Orden = localOrd ? { ...localOrd } : { ...orden };
      if (typeof window !== "undefined" && navigator.onLine) {
        try {
          const { data: freshOrden, error: freshErr } = await supabase
            .from("ordenes")
            .select("id, total, pagado, saldo, estado, metodo_pago")
            .eq("id", orden.id)
            .maybeSingle();

          if (!freshErr && freshOrden) {
            if (Number(freshOrden.saldo) <= 0) {
              toast.warning(`La orden #${orden.numero} ya fue saldada previamente.`);
              queryClient.invalidateQueries({ queryKey: ["ordenes", tenant.id] });
              queryClient.invalidateQueries({ queryKey: ["movimientos", tenant.id] });
              onClose();
              return;
            }
            targetOrden = { ...targetOrden, ...freshOrden };
          }
        } catch (freshErr) {
          console.warn("Aviso al verificar saldo fresco de orden:", freshErr);
        }
      }

      const freshTotalCobrar = Number(targetOrden.saldo);
      const montoAPagar = metodo === "EFECTIVO" ? Math.min(recibido, freshTotalCobrar) : recibido;
      if (montoAPagar <= 0) {
        toast.warning(`La orden #${orden.numero} no tiene saldo pendiente por cobrar.`);
        onClose();
        return;
      }
      const nuevoPagado = targetOrden.pagado + montoAPagar;
      const nuevoSaldo = Math.max(0, freshTotalCobrar - montoAPagar);
      const nuevoEstado: EstadoOrden =
        targetOrden.estado === "ENTREGADA"
          ? "ENTREGADA"
          : nuevoSaldo === 0 && entregarAlCobrar
            ? "ENTREGADA"
            : targetOrden.estado;

      let finalNCF: string | undefined = targetOrden.ncf;
      let finalNcfVencimiento: string | undefined = targetOrden.ncf_vencimiento;
      let finalTipoECF: string | undefined = targetOrden.tipo_ecf;
      let finalEcfStatus: string | undefined = targetOrden.ecf_status;
      let finalEcfId: string | undefined = orden.ecf_id;
      let finalEcfQr: string | undefined = orden.ecf_qr;
      let finalEcfSecurityCode: string | undefined = orden.ecf_security_code;
      let finalEcfSignatureDate: string | undefined = orden.ecf_signature_date;

      const fiscalConfig = await getECFConfig(tenant.id);
      const isElectronic = !!(
        fiscalConfig?.is_active || tenant.config?.modo_facturacion === "electronica"
      );

      const isFiscalActive = Boolean(
        isElectronic ||
        tenant.config?.ncf_facturacion_activa ||
        tenant.config?.modo_facturacion === "tradicional" ||
        tenant.config?.modo_facturacion === "electronica",
      );

      // ECUADOR SRI: Emisión electrónica ante el SRI al cobrar orden
      let sriExtraData: Partial<Orden> = {};
      if (
        tenant.pais_codigo === "EC" &&
        tenant.config?.sri_config?.activo &&
        !orden.sri_clave_acceso &&
        nuevoSaldo === 0
      ) {
        try {
          const ordenTemporal: Orden = {
            ...orden,
            pagado: nuevoPagado,
            saldo: nuevoSaldo,
            estado: nuevoEstado,
            metodo_pago: metodo,
          };
          const sriRes = await emitirFacturaSRI(ordenTemporal, cli as Cliente, tenant);
          if (sriRes.success) {
            sriExtraData = {
              sri_clave_acceso: sriRes.claveAcceso,
              sri_numero_autorizacion: sriRes.numeroAutorizacion,
              sri_fecha_autorizacion: sriRes.fechaAutorizacion,
              sri_estado: sriRes.estado || "AUTORIZADO",
              sri_ride_url: sriRes.rideUrl,
              sri_xml_url: sriRes.xmlUrl,
              sri_secuencial: `${tenant.config?.sri_config?.establecimiento || "001"}-${tenant.config?.sri_config?.punto_emision || "001"}-${String(orden.numero).padStart(9, "0")}`,
            };
            toast.success("¡Factura Electrónica SRI Autorizada!");
          } else {
            toast.info(`Cobro guardado. Aviso SRI: ${sriRes.error || "Pendiente de timbrado"}`);
          }
        } catch (sriErr: any) {
          console.warn("[SRI Cobro Error]", sriErr);
          toast.info("Cobro guardado. Puedes reintentar el timbrado SRI desde la lista de órdenes.");
        }
      }

      const shouldEmitFiscal = tenant.pais_codigo !== "EC" && isFiscalActive && !targetOrden.ncf && nuevoSaldo === 0;

      if (shouldEmitFiscal) {
        const isEmpresa = cli.tipo === "Empresa" || (cli.cedula && cli.cedula.length >= 9);
        const tipoECFDefault =
          orden.tipo_ecf ||
          (isElectronic ? (isEmpresa ? "E31" : "E32") : isEmpresa ? "B01" : "B02");

        if (!isElectronic) {
          try {
            const { ncf: nextNCF, expiration_date } = await nextNCFTradicional(
              tenant.id,
              tipoECFDefault,
            );
            finalNCF = nextNCF;
            finalNcfVencimiento = expiration_date;
          } catch (seqErr) {
            console.log(
              "No dynamic sequence for traditional NCF, falling back to legacy sequence.",
            );
            finalNCF = `${tenant.config?.ncf_secuencia || "B02"}${String(tenant.config?.ncf_proximo || 1).padStart(8, "0")}`;
          }
        } else if (typeof window !== "undefined" && !navigator.onLine) {
          // ⚠️ Modo Offline: Cobro registrado, Pre-Factura y encolado para timbrado al sincronizar
          finalNCF = undefined;
          finalTipoECF = tipoECFDefault;
          finalEcfStatus = "PENDING_OFFLINE_TRANSMISSION";
          toast.info(
            "⚠️ Modo Offline: Cobro registrado con Pre-Factura. Se timbrará con DGII al sincronizar.",
          );
        } else {
          try {
            let nextNCF: string | undefined = undefined;
            if (fiscalConfig?.ambiente === "produccion") {
              try {
                const { ncf, expiration_date } = await nextECFNumero(tenant.id, tipoECFDefault);
                nextNCF = ncf;
                finalNcfVencimiento = expiration_date;
              } catch (seqErr) {
                console.warn("Aviso al obtener secuencia local:", seqErr);
              }
            }

            const ordenTemporal: Orden = {
              ...orden,
              pagado: nuevoPagado,
              saldo: nuevoSaldo,
              estado: nuevoEstado,
              metodo_pago: metodo,
              ncf: nextNCF,
            };

            const result = await emitirECF(
              ordenTemporal,
              cli as Cliente,
              fiscalConfig?.pronesoft_tenant_id,
              tenant.config,
              tenant,
              tipoECFDefault,
            );

            const legalStatusUpper = String(
              result.legal_status || result.document?.legal_status || result.document?.status || "",
            ).toUpperCase();
            const isRejected = /RECHAZ|ERROR|INVALID/.test(legalStatusUpper);
            const isAccepted =
              !isRejected &&
              (Boolean(result.encf) ||
                /ACEPT|PROCESAD|APROB|REGISTERED|EMITID|COMPLETAD|VALID|SUCCESS/.test(
                  legalStatusUpper,
                ));
            finalNCF = result.encf;
            finalTipoECF = tipoECFDefault;
            finalEcfStatus = isAccepted ? "ACCEPTED" : isRejected ? "REJECTED" : "REGISTERED";
            finalEcfId = result.document?.id;
            finalEcfQr = result.stamp_url || (result.document as any)?.document_stamp_url || "";
            finalEcfSecurityCode = result.security_code || "";
            finalEcfSignatureDate =
              (result.document as any)?.signature_date || new Date().toISOString();

            if (isAccepted) {
              showDGIIToast(result.encf);
            } else if (isRejected) {
              toast.error(`El e-CF ${result.encf} fue rechazado por DGII.`);
            } else {
              toast.info(`e-CF ${result.encf} emitido. Validación DGII pendiente.`);
            }
          } catch (fErr: any) {
            console.error("Error Fiscal al cobrar:", fErr);
            const message = String(fErr?.message || fErr || "");
            const isConnectivityFailure =
              (typeof navigator !== "undefined" && !navigator.onLine) ||
              /failed to fetch|network|connection|timeout|timed out|load failed|jwt expired|token expired|session expired|unauthorized|401|auth|gateway|502|503|504/i.test(
                message,
              );
            finalNCF = undefined;
            finalTipoECF = tipoECFDefault;
            finalEcfStatus = isConnectivityFailure ? "PENDING_OFFLINE_TRANSMISSION" : "ERROR";
            if (isConnectivityFailure) {
              toast.warning(
                "Aviso de red: Cobro registrado con Pre-Factura. Se timbrará con DGII al sincronizar.",
              );
            } else {
              toast.error(`No se pudo emitir el e-CF: ${message}`);
            }
          }
        }
      }

      // 1. Guardar la orden con los saldos actualizados, el nuevo estado y datos fiscales
      // Use cleanOrden to strip runtime-only fields (e.g. CXCOrden extras) before Supabase upsert
      const ordenActualizada: Orden = cleanOrden({
        ...orden,
        pagado: nuevoPagado,
        saldo: nuevoSaldo,
        estado: nuevoEstado,
        metodo_pago:
          orden.metodo_pago === "CREDITO"
            ? "CREDITO"
            : nuevoSaldo === 0
              ? metodo
              : orden.metodo_pago,
        ncf: finalNCF,
        ncf_vencimiento: finalNcfVencimiento,
        tipo_ecf: finalTipoECF,
        ecf_id: finalEcfId,
        ecf_qr: finalEcfQr,
        ecf_security_code: finalEcfSecurityCode,
        ecf_signature_date: finalEcfSignatureDate,
        ecf_status:
          finalEcfStatus ||
          (finalEcfSecurityCode?.startsWith("SBX")
            ? "PENDING_OFFLINE_TRANSMISSION"
            : (orden as any).ecf_status),
        pago_referencia:
          (metodo === "TARJETA" || metodo === "TRANSFERENCIA") && referencia
            ? referencia
            : orden.pago_referencia,
        ...sriExtraData,
      });

      await saveOrden(ordenActualizada);

      const eraPagoAlRetirar = orden.metodo_pago === "PAGO_AL_RETIRAR";

      // 2. Registrar el movimiento de entrada en caja
      await saveMovimiento({
        id: uid("mov"),
        tenant_id: tenant.id,
        caja_id: cajaAbierta.id,
        empleado_id: user?.empleado?.id || ordenActualizada.empleado_id,
        tipo: eraPagoAlRetirar ? "VENTA" : nuevoSaldo === 0 ? "VENTA" : "ABONO",
        concepto: eraPagoAlRetirar
          ? nuevoSaldo === 0
            ? `Cobro de orden al retirar #${orden.numero} (${entregarAlCobrar ? "Entregada" : "No entregada"})`
            : `Abono a orden al retirar #${orden.numero} (Saldo restante: ${formatRD(nuevoSaldo)})`
          : nuevoSaldo === 0
            ? `Cobro de saldo orden #${orden.numero} (${entregarAlCobrar ? "Entregada" : "No entregada"})`
            : `Abono a orden #${orden.numero} (Saldo restante: ${formatRD(nuevoSaldo)})`,
        monto: montoAPagar,
        metodo: metodo,
        orden_id: orden.id,
        creado_en: new Date().toISOString(),
      });

      // 3. Notificación de WhatsApp si corresponde
      if (entregarAlCobrar && nuevoSaldo === 0) {
        import("@/lib/whatsapp").then(({ notificarWhatsApp }) => {
          const cliFull = clientes.find((c) => c.id === orden.cliente_id);
          if (cliFull) {
            notificarWhatsApp(tenant, cliFull, ordenActualizada, "entregada", montoAPagar).then(
              (r) => {
                if (r.ok) toast.success("WhatsApp de entrega enviado ✅");
              },
            );
          }
        });
      }

      const targetNombre = cli
        ? [cli.nombre, cli.apellido].filter((x) => x && x !== "null").join(" ") || cli.nombre
        : undefined;

      showOrderPaidToast({
        numero: orden.numero,
        monto: montoAPagar,
        isSaldada: nuevoSaldo === 0,
        clienteNombre: targetNombre,
        currencySymbol,
      });

      // Actualización optimista inmediata en memoria de la UI (0ms de latencia)
      queryClient.setQueryData<Orden[]>(["ordenes", tenant.id], (old) => {
        if (!old) return old;
        return old.map((o) => (o.id === ordenActualizada.id ? ordenActualizada : o));
      });
      queryClient.setQueriesData({ queryKey: ["ordenes"] }, (old: Orden[] | undefined) =>
        old ? old.map((o) => (o.id === ordenActualizada.id ? ordenActualizada : o)) : old,
      );

      queryClient.invalidateQueries({ queryKey: ["ordenes", tenant.id] });
      queryClient.invalidateQueries({ queryKey: ["movimientos", tenant.id] });
      queryClient.invalidateQueries({ queryKey: ["ecf-sequences"] });

      onClose();
      if (showPrintPortal) {
        showPrintPortal(ordenActualizada, montoAPagar);
      }
      if (onSuccess) {
        onSuccess(ordenActualizada);
      }
    } catch (err: any) {
      toast.error("Error al registrar el cobro: " + err.message);
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  }

  const formatAmountInput = (val: string) => {
    if (!val) return "";
    const clean = val.replace(/,/g, "").replace(/[^0-9.]/g, "");
    const parts = clean.split(".");
    const integerPart = parts[0];
    const decimalPart = parts.length > 1 ? parts.slice(1).join("") : null;
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (decimalPart !== null) {
      return formattedInteger + "." + decimalPart.substring(0, 2);
    }
    return formattedInteger;
  };

  const parseAmount = (val: string) => {
    const clean = val.replace(/,/g, "").replace(/[^0-9.]/g, "");
    return parseFloat(clean) || 0;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (
          !loading &&
          !isSubmittingRef.current &&
          cajaAbierta &&
          recibido > 0 &&
          !(metodo !== "EFECTIVO" && recibido > totalCobrar)
        ) {
          handleConfirmarCobro();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, cajaAbierta, recibido, totalCobrar, metodo]);

  if (showCondonar) {
    return (
      <CondonarDeudaDialog
        orden={orden}
        onClose={() => {
          setShowCondonar(false);
          onClose();
        }}
        tenantId={tenant.id}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["ordenes", tenant.id] });
          if (onSuccess) onSuccess(orden);
        }}
      />
    );
  }

  if (orden.saldo <= 0) {
    return null;
  }

  const numeroLimpio = String(orden.numero || "").replace(/^[#$]+/, "");
  const clienteNombreLimpio =
    `${String(cli.nombre || "").replace(/^\$/, "")} ${String(cli.apellido || "").replace(/^\$/, "")}`.trim();

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl sm:max-w-2xl rounded-3xl py-3.5 px-5 sm:px-6 border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden bg-white dark:bg-slate-950 font-sans [&>button]:!flex [&>button]:!items-center [&>button]:!justify-center [&>button]:!bg-rose-500 [&>button]:hover:!bg-rose-600 [&>button]:!text-white [&>button]:!h-7 [&>button]:!w-7 [&>button]:!rounded-full [&>button]:!shadow-md [&>button]:!right-3.5 [&>button]:!top-3.5 [&>button]:!border-none [&>button]:!z-50 [&>button]:!opacity-100 [&>button]:cursor-pointer [&>button]:transition-all [&>button]:active:scale-95">
        {/* DIALOG HEADER CON LOGO, TITULO Y TOTAL A COBRAR */}
        <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between gap-3">
            {/* Logo + Título */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 shadow-xs shrink-0">
                <img
                  src="/favicon.webp"
                  alt="Klynn Logo"
                  className="h-5.5 w-5.5 object-contain drop-shadow-xs"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>
              <div className="text-left">
                <DialogTitle className="text-lg sm:text-xl font-display font-extrabold text-[#1B4B73] dark:text-white leading-tight">
                  Panel de Cobro
                </DialogTitle>
                <div className="flex flex-col mt-0.5 leading-tight">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                    Orden {numeroLimpio}
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {clienteNombreLimpio}
                  </span>
                </div>
              </div>
            </div>

            {/* Total Header Right */}
            <div className="text-right pr-8 sm:pr-10">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#1B4B73]/70 dark:text-sky-400 block leading-none mb-0.5">
                TOTAL A COBRAR
              </span>
              <span className="text-2xl sm:text-3xl font-display font-black text-[#1B4B73] dark:text-sky-300 tracking-tight leading-none">
                {formatRD(totalCobrar)}
              </span>
            </div>
          </div>
          <DialogDescription className="sr-only">
            Selecciona el método de cobro y confirma el pago de la orden.
          </DialogDescription>
        </DialogHeader>

        {/* BODY */}
        <div className="space-y-2.5 pt-2">
          {/* BARRA RESUMEN DE SALDOS */}
          <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
            <div className="flex flex-col justify-center">
              <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider leading-none">
                Total Orden
              </span>
              <span className="font-black text-slate-800 dark:text-slate-100 text-base sm:text-lg tracking-tight leading-tight mt-1">
                {formatRD(orden.total)}
              </span>
            </div>
            <div className="flex flex-col justify-center border-x border-slate-200 dark:border-slate-800 px-2 sm:px-3">
              <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider leading-none">
                Abonado
              </span>
              <span className="font-black text-[#1B4B73] dark:text-sky-400 text-base sm:text-lg tracking-tight leading-tight mt-1">
                {formatRD(orden.pagado)}
              </span>
            </div>
            <div className="flex flex-col justify-center pl-1 sm:pl-2">
              <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider leading-none">
                Saldo Pendiente
              </span>
              <span className="font-black text-emerald-600 dark:text-emerald-400 text-base sm:text-lg tracking-tight leading-tight mt-1">
                {formatRD(totalCobrar)}
              </span>
            </div>
          </div>

          {/* 1. MÉTODOS DE PAGO (PÍLDORAS HORIZONTALES) */}
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-wider text-[#1B4B73] dark:text-sky-300 block">
              MÉTODO DE COBRO
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: "EFECTIVO", label: "EFECTIVO", icon: Banknote },
                { id: "TARJETA", label: "TARJETA", icon: CreditCard },
                { id: "TRANSFERENCIA", label: "TRANSFERENCIA", icon: Building2 },
              ].map((inst) => {
                const isSel = metodo === inst.id;
                const Icon = inst.icon;
                return (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => handleMetodoChange(inst.id as MetodoPago)}
                    className={`relative flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 px-3 transition-all duration-200 active:scale-95 cursor-pointer ${
                      isSel
                        ? "border-[#1B4B73] bg-[#1B4B73] text-white font-black shadow-xs scale-[1.01]"
                        : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#1B4B73]/30 text-slate-700 dark:text-slate-300 font-bold shadow-2xs"
                    }`}
                  >
                    <Icon className={`h-4.5 w-4.5 shrink-0 ${isSel ? "text-[#F0B900]" : ""}`} />
                    <span className="text-xs tracking-wider">{inst.label}</span>
                    {isSel && (
                      <div className="h-3.5 w-3.5 rounded-full bg-[#F0B900] text-slate-900 flex items-center justify-center shrink-0 ml-0.5">
                        <Check className="h-2 w-2 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. CAMPOS DE MONTO */}
          {metodo === "EFECTIVO" && (
            <div className="space-y-2 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
                {/* Monto Recibido */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-[#1B4B73] dark:text-sky-300 block">
                      MONTO RECIBIDO (EFECTIVO)
                    </label>
                    <button
                      type="button"
                      onClick={() => setRecibido(totalCobrar)}
                      className="text-[9px] font-extrabold text-[#1B4B73] dark:text-sky-400 hover:underline cursor-pointer"
                    >
                      Monto Exacto
                    </button>
                  </div>
                  <div className="rounded-xl border-2 border-sky-100 dark:border-sky-900/40 bg-sky-50/40 dark:bg-sky-950/20 p-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-1">
                      <span className="font-black text-sm text-slate-400 dark:text-slate-500 pl-1">
                        RD$
                      </span>
                      <input
                        type="text"
                        className="h-8 w-full !text-xl sm:!text-2xl font-black font-display bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-[#1B4B73] dark:text-sky-200 p-0 shadow-none"
                        value={recibido ? formatAmountInput(String(recibido)) : ""}
                        onChange={(e) => setRecibido(parseAmount(e.target.value))}
                        placeholder="0.00"
                        autoFocus
                      />
                    </div>
                    <div className="h-7 w-7 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0">
                      <Banknote className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Cambio / Saldo */}
                <div>
                  <label
                    className={`text-[9px] font-black uppercase tracking-wider mb-1 block ${faltante > 0 ? "text-amber-600" : "text-emerald-600"}`}
                  >
                    {faltante > 0 ? "FALTA POR COBRAR" : "CAMBIO A ENTREGAR"}
                  </label>
                  <div
                    className={`rounded-xl border-2 p-2 flex items-center justify-between ${
                      faltante > 0
                        ? "border-amber-100 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400"
                        : "border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 pl-1">
                      <span className="font-bold text-xs opacity-80">RD$</span>
                      <span className="text-xl sm:text-2xl font-display font-black leading-none">
                        {formatRD(faltante > 0 ? faltante : vuelto)
                          .replace("RD$", "")
                          .trim()}
                      </span>
                    </div>
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                        faltante > 0
                          ? "bg-amber-100 dark:bg-amber-900/60 text-amber-600"
                          : "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600"
                      }`}
                    >
                      {faltante > 0 ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones Rápidos de Monto */}
              <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {[100, 500, 1000, 2000].map((add) => (
                  <button
                    key={add}
                    type="button"
                    onClick={() => setRecibido((prev) => prev + add)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#1B4B73]/10 dark:hover:bg-[#1B4B73]/30 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 text-[11px] font-black transition-all cursor-pointer shrink-0 shadow-2xs"
                  >
                    +{add} RD$
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setRecibido(totalCobrar)}
                  className="px-2.5 py-1 rounded-lg bg-[#F0B900]/20 hover:bg-[#F0B900]/30 text-amber-900 dark:text-amber-300 border border-[#F0B900]/40 text-[11px] font-black transition-all cursor-pointer shrink-0"
                >
                  Monto Exacto ({formatRD(totalCobrar)})
                </button>
              </div>
            </div>
          )}

          {/* TARJETA */}
          {metodo === "TARJETA" && (
            <div className="space-y-2 animate-in fade-in duration-200">
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider text-[#1B4B73] dark:text-sky-300 mb-1 block">
                  MONTO A COBRAR
                </label>
                <div className="rounded-xl border-2 border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 p-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="font-black text-sm text-slate-400 dark:text-slate-500 pl-1">
                      RD$
                    </span>
                    <input
                      type="text"
                      className="h-8 w-full !text-xl sm:!text-2xl font-black font-display bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-indigo-900 dark:text-indigo-200 p-0 shadow-none"
                      value={recibido ? formatAmountInput(String(recibido)) : ""}
                      onChange={(e) => setRecibido(parseAmount(e.target.value))}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="h-7 w-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
                    <CreditCard className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                  REFERENCIA DE TARJETA / APROBACIÓN (OPCIONAL)
                </label>
                <Input
                  placeholder="Número de aprobación, autorización, Auth # o APR."
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  className="h-9 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 focus-visible:ring-[#1B4B73]/30 rounded-xl font-medium text-xs px-3 shadow-2xs"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* TRANSFERENCIA */}
          {metodo === "TRANSFERENCIA" && (
            <div className="space-y-2 animate-in fade-in duration-200">
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider text-[#1B4B73] dark:text-sky-300 mb-1 block">
                  MONTO A COBRAR
                </label>
                <div className="rounded-xl border-2 border-sky-100 dark:border-sky-900/40 bg-sky-50/40 dark:bg-sky-950/20 p-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="font-black text-sm text-slate-400 dark:text-slate-500 pl-1">
                      RD$
                    </span>
                    <input
                      type="text"
                      className="h-8 w-full !text-xl sm:!text-2xl font-black font-display bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-sky-900 dark:text-sky-200 p-0 shadow-none"
                      value={recibido ? formatAmountInput(String(recibido)) : ""}
                      onChange={(e) => setRecibido(parseAmount(e.target.value))}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="h-7 w-7 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black uppercase tracking-wider text-[#1B4B73] dark:text-sky-200 block">
                    NO. DE TRANSFERENCIA / COMPROBANTE * (OBLIGATORIA)
                  </label>
                  {!referencia.trim() && (
                    <span className="text-[9px] text-destructive font-black">* Requerida</span>
                  )}
                </div>
                <Input
                  placeholder="Número de aprobación, transferencia bancaria, cuenta..."
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  className={`h-9 bg-white dark:bg-slate-900 border-2 rounded-xl font-medium text-xs px-3 shadow-2xs ${
                    !referencia.trim()
                      ? "border-destructive focus-visible:ring-destructive"
                      : "border-slate-200 dark:border-slate-700 focus-visible:ring-[#1B4B73]/40"
                  }`}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* OPCIONES SECUNDARIAS (ENTREGA & CONDONAR DEUDA) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Tarjeta interactiva Marcar ropa como entregada */}
            <div
              onClick={() => {
                if (orden.estado !== "ENTREGADA") {
                  handleToggleEntregar(!entregarAlCobrar);
                }
              }}
              className={`flex-1 flex items-center justify-between p-2.5 rounded-xl border-2 transition-all select-none ${
                orden.estado === "ENTREGADA"
                  ? "bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-80 cursor-default"
                  : entregarAlCobrar
                    ? "bg-emerald-50/80 hover:bg-emerald-50 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/40 border-emerald-500/80 dark:border-emerald-500 shadow-2xs cursor-pointer active:scale-[0.99]"
                    : "bg-slate-50 hover:bg-slate-100/90 dark:bg-slate-900/60 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800 cursor-pointer active:scale-[0.99]"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-2xs ${
                    orden.estado === "ENTREGADA"
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-500"
                      : entregarAlCobrar
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  <PackageCheck className="h-5 w-5 stroke-[2.2]" />
                </div>

                <div className="flex flex-col text-left min-w-0">
                  <span
                    className={`text-xs font-black leading-tight tracking-tight truncate ${
                      entregarAlCobrar && orden.estado !== "ENTREGADA"
                        ? "text-emerald-950 dark:text-emerald-200"
                        : "text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    Marcar ropa como entregada
                  </span>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
                    {orden.estado === "ENTREGADA"
                      ? "Esta orden ya se encuentra en estado Entregada"
                      : entregarAlCobrar
                        ? "Cambiar estado a Entregada al confirmar cobro"
                        : "Solo registrar cobro (no marcar como entregada)"}
                  </span>
                </div>
              </div>

              {orden.estado !== "ENTREGADA" && (
                <div className="ml-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={entregarAlCobrar}
                    onCheckedChange={handleToggleEntregar}
                    className="data-[state=checked]:bg-emerald-600 scale-95"
                  />
                </div>
              )}
            </div>

            {/* Botón Condonar Deuda con Fondo y Borde Sólido */}
            {isAuthorized && (
              <button
                type="button"
                onClick={() => setShowCondonar(true)}
                className="h-11 sm:h-auto self-stretch px-3.5 rounded-xl font-black text-xs bg-amber-600 hover:bg-amber-700 text-white border-2 border-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 dark:border-amber-500 shadow-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-all active:scale-95"
                title="Condonar el saldo pendiente de esta orden"
              >
                <AlertTriangle className="h-4 w-4 text-white stroke-[2.5]" />
                <span>Condonar Deuda</span>
              </button>
            )}
          </div>

          {!cajaAbierta && (
            <p className="text-[11px] font-bold text-rose-600 text-center flex items-center justify-center gap-1.5 p-1 rounded-lg bg-rose-50 border border-rose-200">
              <AlertTriangle className="h-3.5 w-3.5" /> La caja está cerrada. Abre la caja antes de
              registrar un pago.
            </p>
          )}

          {/* 3. FOOTER: SEGURIDAD + BOTÓN VERDE (#16A34A) IDÉNTICO A NUEVA ORDEN */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Security badge */}
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[#1B4B73]/[0.06] text-[#1B4B73] dark:text-sky-400 flex items-center justify-center border border-[#1B4B73]/15 shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block leading-tight">
                  Transacción segura
                </span>
                <span className="text-[9px] text-slate-400 block leading-none mt-0.5">
                  Tus datos están protegidos
                </span>
              </div>
            </div>

            {/* Botón Verde (#16A34A) */}
            <Button
              size="lg"
              className="w-full sm:w-auto h-10 px-5 text-xs sm:text-sm font-extrabold tracking-wide rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              onClick={handleConfirmarCobro}
              disabled={
                loading ||
                isSubmittingRef.current ||
                !cajaAbierta ||
                recibido <= 0 ||
                (metodo === "TRANSFERENCIA" && !referencia.trim()) ||
                (metodo !== "EFECTIVO" && recibido > totalCobrar)
              }
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> PROCESANDO...
                </>
              ) : (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </div>
                  <span>COBRAR ORDEN</span>
                  <span className="ml-1 rounded bg-white/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                    ESPACIO
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export interface PendienteCardProps {
  o: Orden;
  clientes: Cliente[];
  cajaAbierta: Caja | null | undefined;
  onCobrarClick: (orden: Orden) => void;
  compact?: boolean;
}

export function PendienteCard({
  o,
  clientes,
  cajaAbierta,
  onCobrarClick,
  compact = false,
}: PendienteCardProps) {
  const c = clientes.find((cli) => cli.id === o.cliente_id) || {
    nombre: "Consumidor",
    apellido: "Final",
    tipo: "Consumidor Final",
  };
  const clienteNombre = `${c.nombre} ${c.apellido || ""}`.trim();
  const clienteIniciales = clienteNombre
    .split(" ")
    .filter(Boolean)
    .map((parte) => parte[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const estadoAccent =
    (
      {
        RECIBIDA: "from-blue-500 to-indigo-500",
        EN_PROCESO: "from-amber-500 to-orange-500",
        LISTA: "from-emerald-500 to-teal-500",
        EN_CAMINO: "from-violet-500 to-purple-500",
      } as Record<string, string>
    )[o.estado] || "from-slate-400 to-slate-500";

  const handleCardClick = () => {
    if (!cajaAbierta) {
      toast.error("Abre la caja antes de registrar cobros");
      return;
    }
    onCobrarClick(o);
  };

  return (
    <Card
      className={`group relative flex h-full cursor-pointer flex-col overflow-hidden border border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_20px_50px_-28px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950 ${compact ? "rounded-2xl" : "rounded-3xl"}`}
    >
      <button
        type="button"
        onClick={handleCardClick}
        className={`absolute inset-0 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${compact ? "rounded-2xl" : "rounded-3xl"}`}
        aria-label={`Abrir cobro de ${formatRD(o.saldo)} para la orden ${o.numero}`}
      >
        <span className="sr-only">Abrir cobro de la orden {o.numero}</span>
      </button>
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${estadoAccent}`} />

      <div className={`flex flex-1 flex-col ${compact ? "p-3.5 pt-4" : "p-4 pt-5"}`}>
        {/* Fila 1: Número de Orden + Icono y Estado Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#1B4B73]/10 text-[#1B4B73] dark:bg-[#1B4B73]/25 dark:text-sky-300 border border-[#1B4B73]/20">
              <Receipt className="h-3.5 w-3.5" strokeWidth={2.2} />
            </div>
            <span className="font-mono text-xs sm:text-[13px] font-bold text-[#1B4B73] dark:text-sky-300 tracking-tight whitespace-nowrap">
              {o.numero}
            </span>
          </div>
          <div className="shrink-0">
            <EstadoBadge estado={o.estado} />
          </div>
        </div>

        {/* Fila 2: Fecha y Hora completa en una sola línea */}
        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground font-medium">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
            <span>{formatDateRD(o.creado_en)}</span>
            <span className="text-muted-foreground/40">•</span>
            <span className="text-[10px]">
              {new Date(o.creado_en).toLocaleTimeString("es-DO", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
            </span>
          </div>
          {o.es_urgente && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 text-white px-2 py-0.5 text-[9px] font-bold shadow-2xs shrink-0">
              <Zap className="h-2.5 w-2.5 fill-white" /> Urgente
            </span>
          )}
        </div>

        {/* Fila 3: Cliente */}
        <div className="mt-2.5 flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 dark:bg-slate-900/50 border border-border/50">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold text-[11px] shadow-2xs ${
              c.tipo === "Empresa" ? "bg-[#1B4B73] text-white" : "bg-[#F0B900] text-slate-950"
            }`}
          >
            {c.tipo === "Empresa" ? <Building2 className="h-4 w-4" /> : clienteIniciales}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground leading-none block">
              Cliente
            </span>
            <span
              className="mt-0.5 truncate text-xs sm:text-[13px] font-bold text-foreground block"
              title={clienteNombre}
            >
              {clienteNombre}
            </span>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
              c.tipo === "Empresa"
                ? "bg-[#1B4B73]/10 text-[#1B4B73] dark:bg-[#1B4B73]/30 dark:text-sky-300"
                : "bg-[#F0B900]/20 text-amber-900 dark:bg-[#F0B900]/30 dark:text-amber-300"
            }`}
          >
            {c.tipo === "Empresa" ? "Empresa" : "Personal"}
          </span>
        </div>

        <div
          className={`${compact ? "mt-2 p-3" : "mt-3 p-4"} rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/[0.09] via-primary/[0.04] to-emerald-50/70 dark:border-primary/20 dark:from-primary/20 dark:via-primary/10 dark:to-emerald-950/30`}
        >
          {compact ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-[8px] font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Pendiente por cobrar
                </p>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-white/80 px-2 py-1 text-[8px] font-extrabold uppercase tracking-wider text-amber-700 shadow-sm dark:border-amber-900/60 dark:bg-slate-900/70 dark:text-amber-300">
                  <Coins className="h-3 w-3" />
                  Al retirar
                </span>
              </div>
              <p
                className="mt-1 truncate text-xl font-black tracking-tight text-slate-950 dark:text-white"
                title={formatRD(o.saldo)}
              >
                {formatRD(o.saldo)}
              </p>
            </>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Pendiente por cobrar
                </p>
                <p className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                  {formatRD(o.saldo)}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white/80 px-2 py-1 text-[8px] font-extrabold uppercase tracking-wider text-amber-700 shadow-sm dark:border-amber-900/60 dark:bg-slate-900/70 dark:text-amber-300">
                <Coins className="h-3 w-3" />
                Al retirar
              </span>
            </div>
          )}
          {o.total !== o.saldo && (
            <div
              className={`${compact ? "mt-2" : "mt-3"} flex items-center justify-between border-t border-primary/10 pt-2 text-[10px] font-semibold text-slate-500 dark:border-primary/20 dark:text-slate-400`}
            >
              <span>Total de la orden</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {formatRD(o.total)}
              </span>
            </div>
          )}
        </div>

        <Button
          type="button"
          onClick={handleCardClick}
          className={`relative z-20 w-full justify-center gap-2 rounded-xl border-none text-center text-xs font-extrabold text-white shadow-md transition-all active:scale-[0.99] ${compact ? "mt-3 h-10 px-10" : "mt-4 h-11 px-12"} ${
            cajaAbierta
              ? "bg-primary shadow-primary/20 hover:bg-primary/90"
              : "bg-slate-400 shadow-slate-400/15 hover:bg-slate-500 dark:bg-slate-700 dark:hover:bg-slate-600"
          }`}
          aria-label={`Cobrar ${formatRD(o.saldo)} de la orden ${o.numero}`}
        >
          <Wallet className="h-4 w-4" strokeWidth={2.25} />
          {cajaAbierta ? "Cobrar orden" : "Caja cerrada"}
          <ChevronRight className="absolute right-4 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </div>
    </Card>
  );
}

interface CondonarDeudaDialogProps {
  orden: Orden;
  onClose: () => void;
  tenantId: string;
  onSuccess: () => void;
}

function cleanOrden(o: any): Orden {
  return {
    id: o.id,
    tenant_id: o.tenant_id,
    numero: o.numero,
    cliente_id: o.cliente_id,
    empleado_id: o.empleado_id,
    servicios: o.servicios,
    servicios_precios: o.servicios_precios,
    items: o.items,
    subtotal: o.subtotal,
    itbis: o.itbis,
    descuento: o.descuento,
    total: o.total,
    pagado: o.pagado,
    saldo: o.saldo,
    metodo_pago: o.metodo_pago,
    estado: o.estado,
    fecha_entrega: o.fecha_entrega,
    es_urgente: o.es_urgente,
    notas: o.notas,
    creado_en: o.creado_en,
    ncf: o.ncf,
    tipo_ecf: o.tipo_ecf,
    ecf_id: o.ecf_id,
    motivo_anulacion: o.motivo_anulacion,
    motivo_anulacion_codigo: o.motivo_anulacion_codigo,
    nota_credito_ncf: o.nota_credito_ncf,
    nota_credito_id: o.nota_credito_id,
    nota_credito_anula_totalmente: o.nota_credito_anula_totalmente,
    nota_credito_qr: o.nota_credito_qr,
    nota_credito_codigo_seguridad: o.nota_credito_codigo_seguridad,
    nota_credito_fecha_firma: o.nota_credito_fecha_firma,
    nota_credito_fecha_emision: o.nota_credito_fecha_emision,
    nota_credito_estado: o.nota_credito_estado,
    nota_credito_pdf_url: o.nota_credito_pdf_url,
    nota_credito_xml_url: o.nota_credito_xml_url,
    nota_debito_ncf: o.nota_debito_ncf,
    nota_debito_id: o.nota_debito_id,
    nota_debito_monto: o.nota_debito_monto,
    nota_debito_qr: o.nota_debito_qr,
    nota_debito_codigo_seguridad: o.nota_debito_codigo_seguridad,
    nota_debito_fecha_firma: o.nota_debito_fecha_firma,
    nota_debito_fecha_emision: o.nota_debito_fecha_emision,
    nota_debito_estado: o.nota_debito_estado,
    nota_debito_pdf_url: o.nota_debito_pdf_url,
    nota_debito_xml_url: o.nota_debito_xml_url,
    entrega_domicilio: o.entrega_domicilio,
    costo_envio: o.costo_envio,
    repartidor_id: o.repartidor_id,
    ecf_status: o.ecf_status,
    ecf_qr: o.ecf_qr,
    ecf_security_code: o.ecf_security_code,
    ecf_signature_date: o.ecf_signature_date,
    ncf_vencimiento: o.ncf_vencimiento,
    pago_referencia: o.pago_referencia,
  };
}

export function CondonarDeudaDialog({
  orden,
  onClose,
  tenantId,
  onSuccess,
}: CondonarDeudaDialogProps) {
  const [motivo, setMotivo] = useState("Redondeo / Centavos");
  const [loading, setLoading] = useState(false);

  async function handleConfirmar() {
    setLoading(true);
    try {
      const notaAjuste = motivo.trim();
      const nuevoNotas = orden.notas
        ? `${orden.notas} | Deuda condonada: ${notaAjuste}`
        : `Deuda condonada: ${notaAjuste}`;

      const ordenActualizada: Orden = {
        ...orden,
        saldo: 0,
        estado: orden.estado === "ENTREGADA" ? "ENTREGADA" : "PAGADA",
        notas: nuevoNotas,
      };

      const cleaned = cleanOrden(ordenActualizada);

      await saveOrden(cleaned);

      toast.success(`Deuda de la orden #${orden.numero} condonada con éxito ✅`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error al condonar:", err);
      toast.error("Error al condonar deuda: " + (err.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-display font-black text-amber-800">
            <div className="bg-amber-100 p-2 rounded-xl">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            Condonar Deuda
          </DialogTitle>
          <p className="text-xs text-muted-foreground pt-1">
            Esta acción eliminará el saldo pendiente de la orden sin registrar un ingreso de dinero
            real en la caja.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-2xl bg-amber-50/50 border border-amber-100 p-4 text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">
              Orden #{orden.numero}
            </span>
            <span className="text-2xl font-black text-amber-600 block">
              {formatRD(orden.saldo)}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-1">
              Saldo pendiente a condonar
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Motivo / Justificación
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="Redondeo / Centavos">Redondeo / Centavos</option>
              <option value="Descuento especial">Descuento especial</option>
              <option value="Cliente recurrente / Cortesía">Cliente recurrente / Cortesía</option>
              <option value="Saldo incobrable / Pérdida">Saldo incobrable / Pérdida</option>
              <option value="Error de facturación">Error de facturación</option>
            </select>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={loading}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold"
          >
            {loading ? "Procesando..." : "Confirmar Condonación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
