import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  formatRD, 
  saveTenantConfig, 
  addSaasPago, 
  deleteSaasPago, 
  resequenceSaasPagos,
  updateTenantSubscriptionBilling,
  type Tenant, 
  type Plan,
  type SaasPagoRegistro,
  type MetodoPagoSaaS
} from "@/lib/storage";
import { 
  Receipt, Calendar, FileText, Download, Printer, CheckCircle2, 
  ArrowLeft, ShieldCheck, Landmark, CreditCard, ChevronLeft, ChevronRight, X,
  Plus, Trash2, Edit3, DollarSign, Clock, Sparkles, Check, Banknote,
  CalendarDays, ArrowRight, RefreshCw
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { DMYDatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";

export function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDMY(dateInput?: string | null): string {
  if (!dateInput) return "";
  const clean = dateInput.substring(0, 10);
  const parts = clean.split("-");
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    const yyyy = parts[0];
    const mm = parts[1].padStart(2, "0");
    const dd = parts[2].padStart(2, "0");
    return `${dd}/${mm}/${yyyy}`;
  }
  return dateInput;
}

export function calculateEndDate(startStr: string, months: number): string {
  const parts = startStr.split("-").map(Number);
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    const target = new Date(parts[0], parts[1] - 1 + months, parts[2]);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, "0");
    const dd = String(target.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return startStr;
}

interface HistorialPagosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant;
  plans: Plan[];
  isAdmin?: boolean;
  onPaymentUpdated?: (updatedTenant?: Tenant) => void;
}

export type { MetodoPagoSaaS, SaasPagoRegistro };

export interface SaasInvoiceItem {
  id: string;
  numeroFactura: string;
  fechaPago: string;
  periodoInicio: string;
  periodoFin: string;
  planNombre: string;
  monto: number;
  meses: number;
  metodoPago: MetodoPagoSaaS;
  estado: "PAGADO" | "PENDIENTE";
  referencia?: string;
  nota?: string;
  isRegistered?: boolean;
}

const ALL_MODULES_LIST = [
  { key: "procesos", label: "Tablero de Procesos" },
  { key: "estanteria", label: "Estantería virtual" },
  { key: "promociones", label: "Promociones y Cupones" },
  { key: "logistica", label: "Envío a domicilio" },
  { key: "pos_offline", label: "Modo Offline" },
  { key: "facturacion_fiscal", label: "Facturación Electrónica e-CF" },
  { key: "whatsapp", label: "Mensajería WhatsApp" },
  { key: "traslados_red", label: "Red y Traslados" },
  { key: "multisucursal", label: "Sucursal Adicional" },
];

const BASE_FEATURES = [
  "Clientes ilimitados",
  "Generación de reportes",
  "Actualizaciones de software",
  "Cuentas x cobrar",
  "Impresión A4/80mm",
];

const ITEMS_PER_PAGE = 4;

export function HistorialPagosModal({ open, onOpenChange, tenant, plans, isAdmin = false, onPaymentUpdated }: HistorialPagosModalProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<SaasInvoiceItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [metodosMap, setMetodosMap] = useState<Record<string, MetodoPagoSaaS>>(
    (tenant.config as any)?.saas_facturas_metodos || {}
  );
  const [savingMethodId, setSavingMethodId] = useState<string | null>(null);

  // Estado del Wizard de Registro de Pago (2 Pasos)
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [editingPagoId, setEditingPagoId] = useState<string | null>(null);
  const [formMonto, setFormMonto] = useState<number>(3500);
  const [formMeses, setFormMeses] = useState<number>(1);
  const [formFecha, setFormFecha] = useState<string>(() => formatYMD(new Date()));
  const [formPeriodoInicio, setFormPeriodoInicio] = useState<string>(() => formatYMD(new Date()));
  const [formPeriodoFin, setFormPeriodoFin] = useState<string>(() => calculateEndDate(formatYMD(new Date()), 1));
  const [formMetodo, setFormMetodo] = useState<MetodoPagoSaaS>("Transferencia Bancaria");
  const [formNumeroFactura, setFormNumeroFactura] = useState<string>("");
  const [formReferencia, setFormReferencia] = useState<string>("");
  const [formNota, setFormNota] = useState<string>("");
  const [formAvanzarRenovacion, setFormAvanzarRenovacion] = useState<boolean>(false);
  const [isSavingPago, setIsSavingPago] = useState<boolean>(false);

  const plan = plans.find((p) => p.id === tenant.plan_id) || {
    id: tenant.plan_id,
    nombre: tenant.plan_id === "pro" ? "Pro" : tenant.plan_id === "enterprise" ? "Enterprise" : "Básico",
    precio_mensual: tenant.plan_id === "pro" ? 3500 : tenant.plan_id === "enterprise" ? 5000 : 2500,
    modulos: tenant.plan_id === "pro"
      ? { facturacion_fiscal: true, multisucursal: true, procesos: true, estanteria: true, traslados_red: true }
      : tenant.plan_id === "enterprise"
      ? { whatsapp: true, facturacion_fiscal: true, multisucursal: true, logistica: true, procesos: true, estanteria: true, traslados_red: true }
      : { facturacion_fiscal: true, multisucursal: true, procesos: true, traslados_red: false },
  };

  const activePlanModules = ALL_MODULES_LIST.filter(({ key }) => !!(plan as any)?.modulos?.[key]);

  const registeredPagos: SaasPagoRegistro[] = resequenceSaasPagos(
    Array.isArray(tenant.config?.saas_pagos) ? tenant.config.saas_pagos : []
  );

  const invoices: SaasInvoiceItem[] = [];

  const isDemo =
    tenant.slug === "reynita" ||
    tenant.slug === "demo" ||
    tenant.email?.toLowerCase().includes("demo@klynn");

  if (registeredPagos.length > 0) {
    registeredPagos.forEach((pago) => {
      invoices.push({
        id: pago.id,
        numeroFactura: pago.numero_factura || `KL-${pago.id.substring(0, 8)}`,
        fechaPago: pago.fecha_pago,
        periodoInicio: pago.periodo_inicio || pago.fecha_pago,
        periodoFin: pago.periodo_fin || pago.fecha_pago,
        planNombre: pago.plan_nombre || plan.nombre,
        monto: Number(pago.monto) || 0,
        meses: Number(pago.meses) || 1,
        metodoPago: pago.metodo_pago || "Transferencia Bancaria",
        estado: "PAGADO",
        referencia: pago.referencia,
        nota: pago.nota,
        isRegistered: true,
      });
    });
    invoices.sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime());
  } else if (tenant.estado === "ACTIVO" && !isDemo) {
    const isMrLavanderia =
      tenant.nombre.toLowerCase().includes("mr lavanderia") ||
      tenant.email?.toLowerCase().includes("mrgroup");

    let monthsCount = 1;
    if (isMrLavanderia) {
      monthsCount = 3;
    } else if (typeof tenant.config?.meses_pagados === "number" && tenant.config.meses_pagados >= 0) {
      monthsCount = tenant.config.meses_pagados;
    } else {
      const startDateStr = tenant.plan_fecha_inicio || tenant.creado_en;
      if (startDateStr) {
        const start = new Date(startDateStr);
        if (!isNaN(start.getTime())) {
          const now = new Date();
          let monthDiff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
          if (now.getDate() < start.getDate()) {
            monthDiff--;
          }
          monthsCount = Math.max(1, 1 + Math.max(0, monthDiff));
        }
      }
    }

    let startDateStr = tenant.plan_fecha_inicio || tenant.creado_en || new Date().toISOString();
    if (isMrLavanderia) {
      startDateStr = "2026-06-26T12:00:00.000Z";
    }

    const baseDate = new Date(startDateStr);
    const startDay = !isNaN(baseDate.getTime()) ? baseDate.getDate() : 1;

    for (let i = 0; i < monthsCount; i++) {
      const cycleStart = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, startDay);
      const cycleEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + i + 1, startDay);
      const invoiceNumber = `KL-${cycleStart.getFullYear()}${String(cycleStart.getMonth() + 1).padStart(2, "0")}-${String(i + 1).padStart(3, "0")}`;
      
      let totalAmount = plan.precio_mensual;
      if (isMrLavanderia) {
        totalAmount = i < 2 ? 2000 : 2500;
      }

      const invId = `inv-${tenant.id}-${i + 1}`;
      const assignedMethod: MetodoPagoSaaS =
        metodosMap[invId] ||
        metodosMap[invoiceNumber] ||
        (tenant.config as any)?.metodo_pago_saas ||
        "Transferencia Bancaria";

      invoices.unshift({
        id: invId,
        numeroFactura: invoiceNumber,
        fechaPago: cycleStart.toISOString(),
        periodoInicio: cycleStart.toISOString(),
        periodoFin: cycleEnd.toISOString(),
        planNombre: plan.nombre,
        monto: totalAmount,
        meses: 1,
        metodoPago: assignedMethod,
        estado: "PAGADO",
        isRegistered: false,
      });
    }
  }

  const totalPages = Math.ceil(invoices.length / ITEMS_PER_PAGE) || 1;
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const paginatedInvoices = invoices.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  const totalAcumulado = invoices.reduce((s, inv) => s + inv.monto, 0);
  const totalMonthsCount = invoices.reduce((s, inv) => s + (inv.meses || 1), 0);

  const handleOpenNewPayment = () => {
    setEditingPagoId(null);
    setFormMonto(plan.precio_mensual);
    setFormMeses(1);
    const todayStr = formatYMD(new Date());
    setFormFecha(todayStr);
    setFormPeriodoInicio(todayStr);
    setFormPeriodoFin(calculateEndDate(todayStr, 1));
    const nextSeq = String(registeredPagos.length + 1).padStart(3, "0");
    const [ano, mes] = todayStr.split("-");
    setFormNumeroFactura(`KL-${ano}${mes}-${nextSeq}`);
    setFormMetodo("Transferencia Bancaria");
    setFormReferencia("");
    setFormNota("");
    setFormAvanzarRenovacion(false);
    setWizardStep(1);
    setShowPaymentForm(true);
  };

  const handleEditPayment = (inv: SaasInvoiceItem) => {
    setEditingPagoId(inv.id);
    setFormMonto(inv.monto);
    setFormMeses(inv.meses || 1);
    setFormFecha(inv.fechaPago.substring(0, 10));
    setFormPeriodoInicio(inv.periodoInicio.substring(0, 10));
    setFormPeriodoFin(inv.periodoFin.substring(0, 10));
    setFormNumeroFactura(inv.numeroFactura);
    setFormMetodo(inv.metodoPago);
    setFormReferencia(inv.referencia || "");
    setFormNota(inv.nota || "");
    setFormAvanzarRenovacion(false);
    setWizardStep(1);
    setShowPaymentForm(true);
  };

  const handleFechaInicioChange = (newStart: string) => {
    setFormPeriodoInicio(newStart);
    setFormPeriodoFin(calculateEndDate(newStart, formMeses || 1));
  };

  const handleMesesChange = (newMeses: number) => {
    setFormMeses(newMeses);
    setFormPeriodoFin(calculateEndDate(formPeriodoInicio, newMeses));
  };

  const handleSavePago = async () => {
    if (!formMonto || formMonto <= 0) {
      toast.error("Ingresa un monto válido");
      setWizardStep(1);
      return;
    }
    if (!formFecha) {
      toast.error("Selecciona una fecha de pago");
      setWizardStep(1);
      return;
    }

    try {
      setIsSavingPago(true);

      const savedPago = await addSaasPago(tenant.id, {
        id: editingPagoId || undefined,
        numero_factura: formNumeroFactura.trim() || undefined,
        monto: Number(formMonto),
        meses: Number(formMeses) || 1,
        fecha_pago: formFecha,
        periodo_inicio: formPeriodoInicio,
        periodo_fin: formPeriodoFin,
        metodo_pago: formMetodo,
        referencia: formReferencia.trim() || undefined,
        nota: formNota.trim() || undefined,
        plan_nombre: plan.nombre,
      });

      if (!savedPago) throw new Error("No se pudo guardar");

      if (formAvanzarRenovacion && formPeriodoFin) {
        try {
          const nextRenewalIso = new Date(formPeriodoFin + "T12:00:00").toISOString();
          await updateTenantSubscriptionBilling(
            tenant.id,
            true,
            formPeriodoFin ? new Date(formPeriodoFin + "T12:00:00").toISOString() : undefined,
            nextRenewalIso,
            false
          );
        } catch (renErr) {
          console.warn("Aviso al actualizar corte:", renErr);
        }
      }

      const freshPagos = Array.isArray(tenant.config?.saas_pagos) ? [...tenant.config.saas_pagos] : [];
      const exIdx = freshPagos.findIndex(p => p.id === savedPago.id);
      if (exIdx >= 0) {
        freshPagos[exIdx] = savedPago;
      } else {
        freshPagos.unshift(savedPago);
      }
      const sequencedPagos = resequenceSaasPagos(freshPagos);

      tenant.config = {
        ...(tenant.config || {}),
        saas_pagos: sequencedPagos,
      };

      toast.success(editingPagoId ? "Pago actualizado" : `Pago de ${formatRD(formMonto)} guardado con éxito`);
      setShowPaymentForm(false);
      setEditingPagoId(null);
      setWizardStep(1);
      onPaymentUpdated?.(tenant);
    } catch (e: any) {
      toast.error(`Error: ${e?.message || "Intenta nuevamente"}`);
    } finally {
      setIsSavingPago(false);
    }
  };

  const handleDeletePayment = async (pagoId: string) => {
    if (!confirm("¿Eliminar este pago del historial contable de la lavandería?")) return;
    try {
      setIsSavingPago(true);
      const ok = await deleteSaasPago(tenant.id, pagoId);
      if (ok) {
        if (tenant.config?.saas_pagos) {
          tenant.config.saas_pagos = tenant.config.saas_pagos.filter(p => p.id !== pagoId);
        }
        toast.success("Pago eliminado");
        onPaymentUpdated?.(tenant);
      }
    } catch (e) {
      toast.error("Error al eliminar");
    } finally {
      setIsSavingPago(false);
    }
  };

  const handleConvertAutoToRegistered = async () => {
    if (invoices.length === 0) return;
    try {
      setIsSavingPago(true);
      const convertedPagos: SaasPagoRegistro[] = invoices.map((inv, idx) => ({
        id: `spago_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        numero_factura: inv.numeroFactura,
        fecha_pago: inv.fechaPago.substring(0, 10),
        monto: inv.monto,
        meses: 1,
        periodo_inicio: inv.periodoInicio.substring(0, 10),
        periodo_fin: inv.periodoFin.substring(0, 10),
        metodo_pago: inv.metodoPago,
        plan_nombre: inv.planNombre,
        creado_en: new Date().toISOString(),
      }));

      const nextConfig = {
        ...(tenant.config || {}),
        saas_pagos: convertedPagos,
      };

      await saveTenantConfig(tenant.id, nextConfig);
      tenant.config = nextConfig as any;
      toast.success("Historial convertido a registros permanentes.");
      onPaymentUpdated?.(tenant);
    } catch (e) {
      toast.error("No se pudo convertir");
    } finally {
      setIsSavingPago(false);
    }
  };

  const handleUpdatePaymentMethod = async (invId: string, newMethod: MetodoPagoSaaS) => {
    try {
      setSavingMethodId(invId);
      const updatedMap = { ...metodosMap, [invId]: newMethod };
      setMetodosMap(updatedMap);

      if (tenant.id) {
        const currentPagos = Array.isArray(tenant.config?.saas_pagos) ? [...tenant.config.saas_pagos] : [];
        const targetPago = currentPagos.find(p => p.id === invId);
        if (targetPago) targetPago.metodo_pago = newMethod;

        const freshConfig = {
          ...(tenant.config || {}),
          saas_facturas_metodos: updatedMap,
          metodo_pago_saas: newMethod,
          ...(targetPago ? { saas_pagos: currentPagos } : {}),
        };
        await saveTenantConfig(tenant.id, freshConfig as any);
        tenant.config = freshConfig as any;
        toast.success(`Método actualizado: ${newMethod}`);
        onPaymentUpdated?.(tenant);
      }
    } catch (e) {
      toast.error("Error al guardar método");
    } finally {
      setSavingMethodId(null);
    }
  };

  return (
    <>
      <Dialog open={open && !selectedInvoice} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl w-[96vw] max-h-[90vh] flex flex-col rounded-3xl p-0 gap-0 overflow-hidden border border-border/80 shadow-2xl bg-card font-sans">
          {/* HEADER PRINCIPAL CON INFORMACIÓN COMPLETA Y CARDS DE ESTADO */}
          <div className="bg-gradient-to-r from-[#1B4B73] via-[#163e61] to-[#102c46] text-white px-6 sm:px-8 py-5 shrink-0">
            {/* Fila Superior: Título, Estado y Botón Registrar */}
            <div className="flex items-center justify-between gap-4 pr-12 sm:pr-14">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="h-11 w-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-[#F0B900] shrink-0 shadow-inner">
                  <Receipt className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-white">
                      Historial de Pagos SaaS
                    </DialogTitle>
                    <span className="inline-flex items-center bg-emerald-500/25 text-emerald-300 border border-emerald-400/30 text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0 pointer-events-none select-none">
                      ● {tenant.estado === "ACTIVO" ? "Al día" : tenant.estado}
                    </span>
                  </div>
                  <p className="text-xs text-white/80 font-medium truncate mt-0.5">
                    Registra cobros manuales o históricos con cualquier tarifa y emite facturas oficiales.
                  </p>
                </div>
              </div>

              {isAdmin && !showPaymentForm && (
                <Button
                  onClick={handleOpenNewPayment}
                  className="rounded-xl font-bold text-xs sm:text-sm bg-[#F0B900] hover:bg-[#d9a700] text-slate-900 gap-2 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer h-10 px-4 shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>Registrar Pago</span>
                </Button>
              )}
            </div>

            {/* Fila Inferior: 4 Tarjetas de Métricas Claras */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-white/10">
              <div className="px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 min-w-0">
                <span className="text-[10px] uppercase font-bold text-white/70 block tracking-wider">
                  Lavandería
                </span>
                <span className="text-sm font-bold text-white truncate block mt-0.5" title={tenant.nombre}>
                  {tenant.nombre}
                </span>
              </div>

              <div className="px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 min-w-0">
                <span className="text-[10px] uppercase font-bold text-white/70 block tracking-wider">
                  Plan Actual
                </span>
                <span className="text-sm font-bold text-white truncate block mt-0.5">
                  {plan.nombre} ({formatRD(plan.precio_mensual)}/m)
                </span>
              </div>

              <div className="px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 min-w-0">
                <span className="text-[10px] uppercase font-bold text-white/70 block tracking-wider">
                  Meses Cobrados
                </span>
                <span className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                  <Clock className="h-3.5 w-3.5 text-blue-300 shrink-0" />
                  <span>{totalMonthsCount} {totalMonthsCount === 1 ? "mes" : "meses"}</span>
                </span>
              </div>

              <div className="px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 min-w-0">
                <span className="text-[10px] uppercase font-bold text-[#F0B900]/90 block tracking-wider">
                  Total Cobrado
                </span>
                <span className="text-sm sm:text-base font-black text-[#F0B900] block mt-0.5">
                  {formatRD(totalAcumulado)}
                </span>
              </div>
            </div>
          </div>

          {/* VISTA A: WIZARD DE REGISTRO EN 2 PASOS */}
          {showPaymentForm && isAdmin ? (
            <div className="flex-1 flex flex-col min-h-0 bg-surface">
              {/* Stepper Tabs Bar */}
              <div className="bg-slate-100/90 dark:bg-slate-850 px-6 sm:px-8 py-3 border-b border-border/70 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                      wizardStep === 1
                        ? "bg-[#1B4B73] text-white shadow-sm"
                        : "bg-surface text-muted-foreground hover:text-foreground border border-border/60"
                    }`}
                  >
                    <span className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">1</span>
                    <span>Monto & Período</span>
                  </button>

                  <span className="text-muted-foreground/40 font-bold">→</span>

                  <button
                    type="button"
                    onClick={() => {
                      if (!formMonto || formMonto <= 0) return toast.error("Ingresa un monto válido");
                      setWizardStep(2);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                      wizardStep === 2
                        ? "bg-[#1B4B73] text-white shadow-sm"
                        : "bg-surface text-muted-foreground hover:text-foreground border border-border/60"
                    }`}
                  >
                    <span className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">2</span>
                    <span>Método & Comprobante</span>
                  </button>
                </div>

                <Button
                  size="sm"
                  onClick={() => setShowPaymentForm(false)}
                  className="h-9 px-3.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border-0 shadow-xs cursor-pointer flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  title="Cancelar y volver a la lista"
                >
                  <X className="h-4 w-4 text-white stroke-[2.5]" />
                  <span className="font-bold text-white">Cerrar registro</span>
                </Button>
              </div>

              {/* Wizard Content Body: APROVECHA EL ANCHO COMPLETO SIN MÁRGENES DESPERDICIADOS */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                {wizardStep === 1 ? (
                  /* ================= PASO 1: MONTO & PERÍODO (FULL WIDTH) ================= */
                  <div className="w-full space-y-6">
                    <div className="flex items-start gap-3 pb-3 border-b border-border/60">
                      <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <DollarSign className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-foreground">
                          Paso 1: Monto, Meses y Fecha del Cobro
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Ingresa el monto cobrado (puedes registrar tarifas anteriores, ofertas especiales o el precio oficial).
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                      {/* Columna Izquierda: Monto & Fecha */}
                      <div className="space-y-5">
                        {/* Monto con coma como separador de miles */}
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-foreground/80">
                            Monto Cobrado (RD$) *
                          </Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={formMonto ? Number(formMonto).toLocaleString("en-US") : ""}
                              onChange={(e) => {
                                const clean = e.target.value.replace(/,/g, "").replace(/[^\d]/g, "");
                                setFormMonto(clean ? Number(clean) : 0);
                              }}
                              className="pl-10 h-11 rounded-xl font-bold text-base bg-background border-border/80 shadow-xs"
                              placeholder="3,500"
                            />
                          </div>
                          {/* Botoncitos rápidos de precio */}
                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            {[2000, 2500, 3500, 5000].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setFormMonto(val)}
                                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                                  formMonto === val
                                    ? "bg-[#1B4B73] text-white shadow-2xs"
                                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                                }`}
                              >
                                {formatRD(val)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Fecha de Pago con DMYDatePicker (abre calendario directo) */}
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-foreground/80 flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-primary" /> Fecha en que Pagó (Día/Mes/Año) *
                          </Label>
                          <DMYDatePicker
                            value={formFecha}
                            onChange={(val) => {
                              setFormFecha(val);
                              handleFechaInicioChange(val);
                              const parts = val.split("-");
                              if (parts.length >= 2 && (!formNumeroFactura || /^KL-\d{6}-\d{3}$/.test(formNumeroFactura))) {
                                const nextSeq = String(registeredPagos.length + (editingPagoId ? 0 : 1)).padStart(3, "0");
                                setFormNumeroFactura(`KL-${parts[0]}${parts[1]}-${nextSeq}`);
                              }
                            }}
                            placeholder="DD/MM/AAAA"
                            className="h-11 text-sm rounded-xl font-sans font-semibold bg-background border border-slate-200 dark:border-slate-700 shadow-xs text-slate-900 dark:text-slate-100"
                          />
                          <span className="text-xs text-muted-foreground block">
                            Puedes seleccionar fechas del pasado para registrar cobros históricos.
                          </span>
                        </div>
                      </div>

                      {/* Columna Derecha: Meses & Período */}
                      <div className="space-y-5">
                        {/* Meses Cubiertos */}
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-foreground/80">
                            Meses que Cubre *
                          </Label>
                          <Select
                            value={String(formMeses)}
                            onValueChange={(val) => handleMesesChange(Number(val))}
                          >
                            <SelectTrigger className="h-11 rounded-xl text-sm bg-background border-border/80 font-bold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-elegant text-sm font-medium">
                              <SelectItem value="1">1 Mes (Mensual)</SelectItem>
                              <SelectItem value="2">2 Meses</SelectItem>
                              <SelectItem value="3">3 Meses (Trimestral)</SelectItem>
                              <SelectItem value="6">6 Meses (Semestral)</SelectItem>
                              <SelectItem value="12">12 Meses (Anual)</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className="text-xs text-muted-foreground block">
                            Determina la cantidad de meses computados en el badge SaaS.
                          </span>
                        </div>

                        {/* Período Cubierto con DMYDatePicker directo */}
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-foreground/80">
                            Período Cubierto (Desde — Hasta)
                          </Label>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                                Desde (Inicio)
                              </span>
                              <DMYDatePicker
                                value={formPeriodoInicio}
                                onChange={(val) => handleFechaInicioChange(val)}
                                placeholder="DD/MM/AAAA"
                                className="h-11 text-sm rounded-xl font-sans font-medium bg-background border border-slate-200 dark:border-slate-700 shadow-xs text-slate-900 dark:text-slate-100"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                                Hasta (Fin)
                              </span>
                              <DMYDatePicker
                                value={formPeriodoFin}
                                onChange={(val) => setFormPeriodoFin(val)}
                                placeholder="DD/MM/AAAA"
                                className="h-11 text-sm rounded-xl font-sans font-medium bg-background border border-slate-200 dark:border-slate-700 shadow-xs text-slate-900 dark:text-slate-100"
                              />
                            </div>
                          </div>

                          {/* Badge estilizado con iconos y fechas en DD/MM/AAAA - CENTRADO */}
                          <div className="pt-2.5 flex justify-center w-full">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 text-blue-900 dark:text-blue-200 text-xs font-semibold shadow-2xs">
                              <CalendarDays className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                              <span className="text-blue-700/80 dark:text-blue-300/80">Ciclo activo:</span>
                              <span className="font-bold text-slate-900 dark:text-white">{formatDMY(formPeriodoInicio)}</span>
                              <ArrowRight className="h-3 w-3 text-blue-500 shrink-0" />
                              <span className="font-bold text-slate-900 dark:text-white">{formatDMY(formPeriodoFin)}</span>
                              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-[#1B4B73] text-white shrink-0 ml-1">
                                {formMeses} {formMeses === 1 ? "Mes" : "Meses"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ================= PASO 2: MÉTODO & COMPROBANTE (FULL WIDTH) ================= */
                  <div className="w-full space-y-6">
                    <div className="flex items-start gap-3 pb-3 border-b border-border/60">
                      <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-foreground">
                          Paso 2: Método de Pago y Comprobante
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Especifica el canal por el que se recibió el cobro y detalles del comprobante para auditoría.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                      {/* Método de Pago */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-foreground/80">
                          Método de Pago *
                        </Label>
                        <Select
                          value={formMetodo}
                          onValueChange={(val: MetodoPagoSaaS) => setFormMetodo(val)}
                        >
                          <SelectTrigger className="h-11 rounded-xl text-sm bg-background border-border/80 font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-elegant text-sm font-medium">
                            <SelectItem value="Transferencia Bancaria">
                              <div className="flex items-center gap-2">
                                <Landmark className="h-4 w-4 text-emerald-600" />
                                <span>Transferencia Bancaria</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="Pago Vía Stripe">
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-blue-600" />
                                <span>Pago Vía Stripe / Pasarela</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="Efectivo">
                              <div className="flex items-center gap-2">
                                <Banknote className="h-4 w-4 text-amber-600" />
                                <span>Efectivo</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="Tarjeta de Crédito">
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-indigo-600" />
                                <span>Tarjeta de Crédito</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="Otro">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* No. Factura / Comprobante Oficial */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-foreground/80 flex items-center justify-between">
                          <span>No. Factura / Comprobante *</span>
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Secuencial continuo
                          </span>
                        </Label>
                        <Input
                          type="text"
                          value={formNumeroFactura}
                          onChange={(e) => setFormNumeroFactura(e.target.value)}
                          placeholder="Ej. KL-202610-003"
                          className="h-11 rounded-xl text-sm bg-background border-border/80 font-bold tracking-wide"
                        />
                      </div>

                      {/* Referencia */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-foreground/80">
                          Referencia / No. Transacción (Opcional)
                        </Label>
                        <Input
                          type="text"
                          value={formReferencia}
                          onChange={(e) => setFormReferencia(e.target.value)}
                          placeholder="Ej. BHD Transf #849102, Depósito..."
                          className="h-11 rounded-xl text-sm bg-background border-border/80 font-medium"
                        />
                      </div>

                      {/* Nota */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-foreground/80">
                          Nota u Observación (Opcional)
                        </Label>
                        <Input
                          type="text"
                          value={formNota}
                          onChange={(e) => setFormNota(e.target.value)}
                          placeholder="Ej. Tarifa histórica acordada..."
                          className="h-11 rounded-xl text-sm bg-background border-border/80 font-medium"
                        />
                      </div>
                    </div>

                    {/* Toggle amigable y compacto para renovar fecha de corte */}
                    <div
                      onClick={() => setFormAvanzarRenovacion(!formAvanzarRenovacion)}
                      className={`w-full px-4 py-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                        formAvanzarRenovacion
                          ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 shadow-2xs"
                          : "bg-slate-50/70 dark:bg-slate-900/40 border-border/70 hover:bg-slate-100/60"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            formAvanzarRenovacion
                              ? "bg-[#1B4B73] text-white shadow-2xs"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <RefreshCw className={`h-4 w-4 ${formAvanzarRenovacion ? "text-white" : ""}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs sm:text-sm text-foreground">
                              Avanzar próxima renovación a {formatDMY(formPeriodoFin)}
                            </span>
                            {formAvanzarRenovacion ? (
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-600 text-white shrink-0">
                                Activado
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-md bg-muted text-muted-foreground shrink-0">
                                Desactivado
                              </span>
                            )}
                          </div>
                          <p className="text-[11.5px] text-muted-foreground truncate mt-0.5">
                            Fija automáticamente la fecha de corte de la suscripción al término de este ciclo ({formatDMY(formPeriodoFin)}).
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 pl-2" onClick={(e) => e.stopPropagation()}>
                        <Switch
                          id="avanzar-renovacion"
                          checked={formAvanzarRenovacion}
                          onCheckedChange={setFormAvanzarRenovacion}
                        />
                      </div>
                    </div>

                    {/* Resumen Final con estilo de Badges e Iconos */}
                    <div className="w-full px-5 py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <span className="text-[11px] uppercase font-bold text-emerald-800 dark:text-emerald-300 block tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Resumen a Guardar:</span>
                        </span>
                        
                        <div className="flex items-center gap-2.5 flex-wrap">
                          {/* 1. Badge Duración / Meses */}
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-border/80 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-2xs">
                            <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span>{formMeses} {formMeses === 1 ? "Mes" : "Meses"}</span>
                          </div>

                          {/* 2. Badge Método de Pago */}
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-border/80 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-2xs">
                            {formMetodo === "Pago Vía Stripe" ? (
                              <CreditCard className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                            ) : formMetodo === "Efectivo" ? (
                              <Banknote className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            ) : (
                              <Landmark className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            )}
                            <span>{formMetodo}</span>
                          </div>

                          {/* 3. Badge Ciclo con el mismo diseño del Paso 1 */}
                          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 text-blue-900 dark:text-blue-200 text-xs font-semibold shadow-2xs">
                            <CalendarDays className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span className="font-bold text-slate-900 dark:text-white">{formatDMY(formPeriodoInicio)}</span>
                            <ArrowRight className="h-3 w-3 text-blue-500 shrink-0" />
                            <span className="font-bold text-slate-900 dark:text-white">{formatDMY(formPeriodoFin)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-left md:text-right shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-emerald-500/20">
                        <span className="text-[10px] uppercase font-bold text-emerald-800/70 dark:text-emerald-300/70 block tracking-wider">Monto Total</span>
                        <span className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300 block">
                          {formatRD(formMonto)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Wizard Footer Controls */}
              <div className="shrink-0 bg-slate-50 dark:bg-slate-900/60 border-t border-border/70 px-6 sm:px-8 py-4 flex items-center justify-between">
                {wizardStep === 1 ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPaymentForm(false)}
                      className="rounded-xl h-10 px-5 text-sm font-semibold cursor-pointer"
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!formMonto || formMonto <= 0) return toast.error("Ingresa un monto válido");
                        if (!formFecha) return toast.error("Selecciona la fecha de pago");
                        setWizardStep(2);
                      }}
                      className="rounded-xl h-10 px-6 text-sm font-bold bg-[#1B4B73] hover:bg-[#143755] text-white gap-2 cursor-pointer shadow-sm transition-all hover:scale-[1.01]"
                    >
                      <span>Siguiente: Método & Comprobante</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setWizardStep(1)}
                      className="rounded-xl h-10 px-5 text-sm font-semibold gap-2 cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Volver al Paso 1</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSavePago}
                      disabled={isSavingPago}
                      className="rounded-xl h-10 px-6 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 cursor-pointer shadow-sm transition-all hover:scale-[1.01]"
                    >
                      <Check className="h-4 w-4" />
                      <span>{editingPagoId ? "Guardar Cambios" : "Guardar Pago SaaS"}</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* VISTA B: TABLA DE COMPROBANTES Y PAGOS REALES */
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4 custom-scrollbar">
              {isAdmin && registeredPagos.length === 0 && invoices.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold text-foreground text-sm">Pagos calculados automáticamente</h5>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Esta lavandería tiene {invoices.length} meses calculados por antigüedad. Puedes fijarlos a registros permanentes para ajustar tarifas históricas.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleConvertAutoToRegistered}
                    disabled={isSavingPago}
                    className="rounded-xl h-9 px-4 text-xs font-bold border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 shrink-0 cursor-pointer"
                  >
                    Fijar a Registros Permanentes
                  </Button>
                </div>
              )}

              {invoices.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-3">
                  <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <FileText className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-foreground text-base">No hay pagos registrados aún</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                      {tenant.estado === "TRIAL"
                        ? "Esta lavandería se encuentra en período de prueba gratuita."
                        : "Aún no se han registrado cobros de mensualidad. Pulsa '+ Registrar Pago' para añadir uno."}
                    </p>
                  </div>
                  {isAdmin && (
                    <Button
                      size="sm"
                      onClick={handleOpenNewPayment}
                      className="rounded-xl font-bold text-xs sm:text-sm bg-primary text-white gap-2 shadow-sm h-9 px-5 mt-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Registrar primer pago</span>
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Cabecera de columnas con anchos definidos que garantizan que NUNCA se monten los textos */}
                  <div className="hidden md:flex items-center gap-4 px-5 py-3 rounded-xl bg-[#1B4B73] text-white text-xs font-bold uppercase tracking-wider shadow-2xs">
                    <div className="w-[180px] shrink-0">Comprobante / Fecha</div>
                    <div className="flex-1 min-w-[180px]">Período / Detalle</div>
                    <div className="w-[190px] shrink-0">Método de Pago</div>
                    <div className="w-[130px] shrink-0 text-right">Monto</div>
                    <div className="w-[140px] shrink-0 text-right">Acciones</div>
                  </div>

                  <div className="space-y-2.5">
                    {paginatedInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-4 rounded-2xl border border-border/70 hover:border-primary/40 bg-surface flex flex-col md:flex-row md:items-center gap-4 shadow-2xs transition-colors"
                      >
                        {/* 1. Comprobante & Fecha */}
                        <div className="w-full md:w-[180px] shrink-0 flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-[#1B4B73]/10 text-[#1B4B73] dark:bg-[#1B4B73]/30 dark:text-blue-300 flex items-center justify-center shrink-0">
                            <FileText className="h-4.5 w-4.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs sm:text-sm text-foreground tracking-tight truncate flex items-center gap-1.5">
                              <span>{inv.numeroFactura}</span>
                              {inv.isRegistered && (
                                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Registro contable permanente" />
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
                              <span className="font-medium">{formatDMY(inv.fechaPago)}</span>
                            </div>
                          </div>
                        </div>

                        {/* 2. Período: Plan & Fechas */}
                        <div className="w-full md:flex-1 min-w-[180px] space-y-1.5">
                          <div className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-2 flex-wrap">
                            <span>Plan {inv.planNombre}</span>
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/90 dark:border-emerald-800/80 text-[10px] font-bold px-2 py-0.5 rounded-md pointer-events-none select-none">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>{inv.meses > 1 ? `${inv.meses} meses` : "Pagada"}</span>
                            </span>
                          </div>
                          <div className="pt-0.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/60 text-blue-900 dark:text-blue-200 text-[11px] font-semibold tracking-tight shadow-2xs">
                              <CalendarDays className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
                              <span>{formatDMY(inv.periodoInicio)}</span>
                              <ArrowRight className="h-2.5 w-2.5 text-blue-500/80 shrink-0" />
                              <span>{formatDMY(inv.periodoFin)}</span>
                            </span>
                          </div>
                          {inv.nota && (
                            <div className="text-xs text-primary/90 font-medium truncate italic" title={inv.nota}>
                              Nota: {inv.nota}
                            </div>
                          )}
                        </div>

                        {/* 3. Método de Pago */}
                        <div className="w-full md:w-[190px] shrink-0">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-foreground font-semibold text-xs border border-border/60 max-w-full">
                            {inv.metodoPago === "Pago Vía Stripe" ? (
                              <CreditCard className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                            ) : inv.metodoPago === "Efectivo" ? (
                              <Banknote className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            ) : (
                              <Landmark className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            )}
                            <span className="truncate">{inv.metodoPago}</span>
                          </div>
                          {inv.referencia && (
                            <div className="text-xs text-muted-foreground truncate mt-1" title={inv.referencia}>
                              Ref: {inv.referencia}
                            </div>
                          )}
                        </div>

                        {/* 4. Monto (Columna dedicada con alineación propia, sin colisión) */}
                        <div className="w-full md:w-[130px] shrink-0 md:text-right">
                          <span className="font-black text-sm sm:text-base text-emerald-600 dark:text-emerald-400 block">
                            {formatRD(inv.monto)}
                          </span>
                        </div>

                        {/* 5. Acciones */}
                        <div className="w-full md:w-[140px] shrink-0 flex items-center justify-start md:justify-end gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => setSelectedInvoice(inv)}
                            className="h-8 px-3 rounded-xl bg-[#1B4B73] hover:bg-[#143755] text-white font-bold text-xs gap-1.5 shadow-2xs cursor-pointer"
                            title="Descargar o imprimir Factura A4"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Factura</span>
                          </Button>

                          {isAdmin && inv.isRegistered && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditPayment(inv)}
                                className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-foreground hover:bg-muted cursor-pointer"
                                title="Editar monto o detalles de este pago"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeletePayment(inv.id)}
                                className="h-8 w-8 p-0 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                title="Eliminar este pago del historial"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Barra de Paginación */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-3 border-t border-border/60 text-xs text-muted-foreground px-1">
                      <div className="text-xs font-medium text-slate-500">
                        Mostrando {(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(safeCurrentPage * ITEMS_PER_PAGE, invoices.length)} de {invoices.length} facturas
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={safeCurrentPage === 1}
                          className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>

                        {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
                          <Button
                            key={p}
                            variant={p === safeCurrentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(p)}
                            className={`h-8 w-8 p-0 rounded-lg text-xs font-bold cursor-pointer ${
                              p === safeCurrentPage ? "bg-[#1B4B73] hover:bg-[#143755] text-white shadow-2xs" : ""
                            }`}
                          >
                            {p}
                          </Button>
                        ))}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={safeCurrentPage === totalPages}
                          className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Footer (solo visible si no está en modo wizard) */}
          {!showPaymentForm && (
            <div className="shrink-0 p-4 sm:px-8 bg-slate-50 dark:bg-slate-900/60 border-t border-border/60 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 text-xs truncate">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                Facturas oficiales de Klynn Cloud para fines contables y tributarios.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="rounded-xl h-9 px-5 text-xs sm:text-sm font-bold cursor-pointer shrink-0"
              >
                Cerrar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Visor de Factura A4 con diseño limpio y tipografía Plus Jakarta Sans */}
      <Dialog open={!!selectedInvoice} onOpenChange={(openVal) => !openVal && setSelectedInvoice(null)}>
        {selectedInvoice && (
          <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 rounded-3xl border border-border shadow-2xl bg-white text-slate-900 custom-scrollbar font-sans">
            <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-3.5 grid grid-cols-3 items-center">
              <div className="flex items-center justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedInvoice(null)}
                  className="rounded-xl font-bold text-xs h-8.5 gap-1.5 cursor-pointer text-slate-700 hover:bg-slate-100"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Volver</span>
                </Button>
              </div>

              <div className="flex items-center justify-center">
                <Button
                  size="sm"
                  onClick={() => printInvoiceSheet("saas-invoice-print-area")}
                  className="h-8.5 px-5 rounded-xl bg-[#1B4B73] hover:bg-[#143755] text-white font-bold text-xs gap-2 shadow-md cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Printer className="h-4 w-4" />
                  <span>Imprimir factura</span>
                </Button>
              </div>

              <div className="flex items-center justify-end pr-6"></div>
            </div>

            <div className="p-6 sm:p-10 bg-white">
              <div
                id="saas-invoice-print-area"
                className="w-full text-slate-900 text-left"
                style={{ fontFamily: "'Plus Jakarta Sans', var(--font-sans), sans-serif" }}
              >
                {/* ENCABEZADO CORPORATIVO CON LOGO */}
                <div className="flex items-start justify-between gap-6 border-b-2 border-slate-200 pb-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <img
                        src="/Logo klynn.webp"
                        alt="Klynn"
                        className="h-11 sm:h-12 w-auto object-contain shrink-0"
                      />
                      <span className="bg-[#1B4B73] text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                        SOFTWARE CLOUD
                      </span>
                    </div>
                    <div className="text-[11.5px] text-slate-600 leading-relaxed pt-1">
                      <div className="font-bold text-slate-800 text-xs tracking-tight">Simplifica tu lavandería</div>
                      <div>Santo Domingo Este, República Dominicana</div>
                      <div>Tel: (829) 941-6546 • Soporte@klynn.com.do</div>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="inline-block bg-[#1B4B73] text-white px-3.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider shadow-2xs">
                      FACTURA DE SERVICIO
                    </div>
                    <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight pt-1">
                      {selectedInvoice.numeroFactura}
                    </div>
                    <div className="text-xs text-slate-500">
                      Fecha de Emisión: <strong>{formatDMY(selectedInvoice.fechaPago)}</strong>
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold border border-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>
                        {selectedInvoice.metodoPago === "Pago Vía Stripe" ||
                        selectedInvoice.metodoPago?.toLowerCase().includes("stripe") ||
                        selectedInvoice.metodoPago?.toLowerCase().includes("polar") ||
                        selectedInvoice.metodoPago?.toLowerCase().includes("pasarela") ||
                        selectedInvoice.metodoPago?.toLowerCase().includes("linea") ||
                        selectedInvoice.metodoPago?.toLowerCase().includes("línea")
                          ? "PAGADA EN LÍNEA"
                          : "PAGADA"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* DATOS DEL CLIENTE / RECEPTOR */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      FACTURADO A:
                    </span>
                    <div className="font-black text-slate-900 text-sm">{tenant.nombre}</div>
                    <div className="text-slate-600 mt-0.5">
                      RNC / Cédula: <strong>{tenant.rnc || "Consumidor Final"}</strong>
                    </div>
                    <div className="text-slate-600 truncate">{tenant.direccion || "República Dominicana"}</div>
                  </div>

                  <div className="sm:border-l sm:border-slate-200 sm:pl-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      DETALLE DE SUSCRIPCIÓN:
                    </span>
                    <div className="font-bold text-slate-900">
                      Plan Klynn {selectedInvoice.planNombre} {selectedInvoice.meses > 1 ? `(${selectedInvoice.meses} meses)` : "(Mensual)"}
                    </div>
                    <div className="text-slate-600 mt-0.5">
                      Período: {formatDMY(selectedInvoice.periodoInicio)} al {formatDMY(selectedInvoice.periodoFin)}
                    </div>
                    <div className="text-slate-700 font-semibold mt-0.5">
                      Método de Pago: <strong className="text-slate-900">{selectedInvoice.metodoPago}</strong>
                    </div>
                    {selectedInvoice.referencia && (
                      <div className="text-slate-600 mt-0.5">
                        Referencia: <strong>{selectedInvoice.referencia}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* TABLA DE CONCEPTOS */}
                <div className="my-6">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-[#1B4B73] text-white text-[11px] font-bold uppercase">
                        <th className="py-2.5 px-4 rounded-l-lg">Descripción del Servicio</th>
                        <th className="py-2.5 px-3 text-center">Cant.</th>
                        <th className="py-2.5 px-3 text-right">Precio Unitario</th>
                        <th className="py-2.5 px-4 text-right rounded-r-lg">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr className="text-slate-800 align-top">
                        <td className="py-4 px-4 align-top">
                          <div className="font-bold text-sm text-slate-900">
                            Suscripción Cloud — Plan {selectedInvoice.planNombre}
                          </div>
                          <div className="text-[11.5px] text-slate-500 mt-1 leading-relaxed max-w-md">
                            Acceso completo al software de lavandería <strong className="text-slate-800 font-bold">Klynn</strong>, catálogo, módulos operativos, facturación y almacenamiento en la nube correspondiente al período <strong className="text-slate-800 font-bold">{formatDMY(selectedInvoice.periodoInicio)}</strong> al <strong className="text-slate-800 font-bold">{formatDMY(selectedInvoice.periodoFin)}</strong>.
                            {selectedInvoice.nota && (
                              <div className="mt-1 text-slate-600 italic">Nota: {selectedInvoice.nota}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-3 text-center font-bold text-slate-700 align-top whitespace-nowrap pt-4">
                          {selectedInvoice.meses || 1} {selectedInvoice.meses === 1 ? "mes" : "meses"}
                        </td>
                        <td className="py-4 px-3 text-right font-medium text-slate-700 align-top whitespace-nowrap pt-4">
                          {formatRD(selectedInvoice.monto / (selectedInvoice.meses || 1))}
                        </td>
                        <td className="py-4 px-4 text-right font-black text-slate-900 text-sm align-top whitespace-nowrap pt-4">
                          {formatRD(selectedInvoice.monto)}
                        </td>
                      </tr>

                      {/* Módulos centrados en toda la extensión del documento */}
                      <tr>
                        <td colSpan={4} className="py-6 px-4 border-t border-slate-200">
                          <div className="w-full flex flex-col items-center justify-center text-center space-y-2.5">
                            <div className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                              MÓDULOS Y SERVICIOS ACTIVOS INCLUIDOS (10):
                            </div>
                            <div>
                              <span className="inline-block bg-[#1B4B73] text-white text-[11px] px-4 py-1 rounded-full font-bold shadow-xs tracking-wide">
                                Hasta 4 Empleados • 500 Órdenes/mes
                              </span>
                            </div>

                            {/* Centrado óptico exacto */}
                            <div className="w-fit mx-auto pt-2">
                              <div className="grid grid-cols-2 gap-x-12 sm:gap-x-16 gap-y-3 text-left">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-800">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span>Tablero de Procesos</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-800">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span>Facturación Electrónica e-CF</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-800">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span>Sucursal Adicional</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-800">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span>Generación de reportes</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-800">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span>Cuentas x cobrar</span>
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-800">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span>Estantería virtual</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-800">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span>Mensajería WhatsApp</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-800">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span>Clientes ilimitados</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-800">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span>Actualizaciones de software</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-800">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span>Impresión A4/80mm</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* TOTALES */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-t-2 border-slate-200 pt-6 mt-6">
                  <div className="max-w-xs text-[11px] text-slate-500 space-y-1">
                    <div className="font-bold text-slate-700">Términos & Condiciones:</div>
                    <p>
                      Este comprobante certifica la prestación y activación continua de los servicios en la plataforma Klynn. Válido como soporte de gasto operativo de software.
                    </p>
                  </div>

                  <div className="w-full sm:w-56 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-bold text-slate-800">{formatRD(selectedInvoice.monto)}</span>
                    </div>
                    <div className="flex items-center justify-between text-base font-black text-slate-900 border-t border-slate-200 pt-2">
                      <span>Total Pagado:</span>
                      <span className="text-[#1B4B73]">{formatRD(selectedInvoice.monto)}</span>
                    </div>
                  </div>
                </div>

                {/* PIE DE PÁGINA */}
                <div className="mt-12 pt-6 border-t border-slate-200 text-center text-[10.5px] text-slate-400">
                  <div className="font-bold text-slate-600">Klynn Cloud • Simplifica tu lavandería</div>
                  <div>www.klynn.com.do • Soporte: (829) 941-6546 • Soporte@klynn.com.do</div>
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

function printInvoiceSheet(elementId: string) {
  const elem = document.getElementById(elementId);
  if (!elem) {
    toast.error("No se encontró el documento para imprimir");
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Factura de Servicio - Klynn</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @page { size: A4 portrait; margin: 8mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          body { font-family: 'Plus Jakarta Sans', sans-serif !important; background: white !important; margin: 0; padding: 0; color: #0f172a; }
        </style>
      </head>
      <body>
        <div style="padding: 6mm 10mm; font-family: 'Plus Jakarta Sans', sans-serif;">
          ${elem.innerHTML}
        </div>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      window.print();
    } finally {
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 2000);
    }
  }, 400);
}
