import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatRD, saveTenantConfig, type Tenant, type Plan } from "@/lib/storage";
import { 
  Receipt, Calendar, FileText, Download, Printer, CheckCircle2, 
  ArrowLeft, ShieldCheck, Landmark, CreditCard, ChevronLeft, ChevronRight, X
} from "lucide-react";
import { toast } from "sonner";

interface HistorialPagosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant;
  plans: Plan[];
  isAdmin?: boolean;
}

export type MetodoPagoSaaS = "Transferencia Bancaria" | "Pago Vía Stripe";

export interface SaasInvoiceItem {
  id: string;
  numeroFactura: string;
  fechaPago: string;
  periodoInicio: string;
  periodoFin: string;
  planNombre: string;
  monto: number;
  metodoPago: MetodoPagoSaaS;
  estado: "PAGADO" | "PENDIENTE";
}

const ALL_MODULES_LIST = [
  { key: "whatsapp", label: "Mensajería WhatsApp", extra: "(Costo adicional)" },
  { key: "facturacion_fiscal", label: "Facturación Electrónica", extra: "(Costo adicional)" },
  { key: "multisucursal", label: "Multisucursal", extra: "(Costo adicional)" },
  { key: "pos_offline", label: "Modo Offline", extra: "(Factura sin conexión)" },
  { key: "logistica", label: "Envío a domicilio" },
  { key: "procesos", label: "Tablero de Procesos" },
  { key: "estanteria", label: "Estantería virtual" },
];

const BASE_FEATURES = [
  "Clientes ilimitados",
  "Generación de reportes",
  "Actualizaciones de software",
  "Cuentas x cobrar",
  "Impresión A4/80mm",
];

const ITEMS_PER_PAGE = 3;

export function HistorialPagosModal({ open, onOpenChange, tenant, plans, isAdmin = false }: HistorialPagosModalProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<SaasInvoiceItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [metodosMap, setMetodosMap] = useState<Record<string, MetodoPagoSaaS>>(
    (tenant.config as any)?.saas_facturas_metodos || {}
  );
  const [savingMethodId, setSavingMethodId] = useState<string | null>(null);

  const plan = plans.find((p) => p.id === tenant.plan_id) || {
    id: tenant.plan_id,
    nombre: tenant.plan_id === "pro" ? "Pro" : tenant.plan_id === "enterprise" ? "Enterprise" : "Básico",
    precio_mensual: tenant.plan_id === "pro" ? 3500 : tenant.plan_id === "enterprise" ? 5000 : 2500,
    modulos: tenant.plan_id === "pro"
      ? { facturacion_fiscal: true, multisucursal: true, procesos: true, estanteria: true }
      : tenant.plan_id === "enterprise"
      ? { whatsapp: true, facturacion_fiscal: true, multisucursal: true, logistica: true, procesos: true, estanteria: true }
      : { facturacion_fiscal: true, multisucursal: true, procesos: true },
  };

  // Filtrar SOLO los módulos que están activos en el plan
  const activePlanModules = ALL_MODULES_LIST.filter(({ key }) => !!(plan as any)?.modulos?.[key]);

  // Generar el historial de pagos del tenant
  const invoices: SaasInvoiceItem[] = [];

  const isDemo =
    tenant.slug === "reynita" ||
    tenant.slug === "demo" ||
    tenant.email?.toLowerCase().includes("demo@klynn");

  if (tenant.estado === "ACTIVO" && !isDemo) {
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
        metodoPago: assignedMethod,
        estado: "PAGADO",
      });
    }
  }

  const totalPages = Math.ceil(invoices.length / ITEMS_PER_PAGE) || 1;
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const paginatedInvoices = invoices.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  const handleUpdatePaymentMethod = async (invId: string, newMethod: MetodoPagoSaaS) => {
    try {
      setSavingMethodId(invId);
      const updatedMap = {
        ...metodosMap,
        [invId]: newMethod,
      };
      setMetodosMap(updatedMap);

      if (tenant.id) {
        const freshConfig = {
          ...(tenant.config || {}),
          saas_facturas_metodos: updatedMap,
          metodo_pago_saas: newMethod,
        };
        await saveTenantConfig(tenant.id, freshConfig as any);
        tenant.config = freshConfig as any;
        toast.success(`Método de pago actualizado: ${newMethod}`);
      }
    } catch (e) {
      console.error("Error guardando método de pago:", e);
      toast.error("No se pudo guardar el método de pago");
    } finally {
      setSavingMethodId(null);
    }
  };

  const totalAcumulado = invoices.reduce((s, inv) => s + inv.monto, 0);

  return (
    <>
      <Dialog open={open && !selectedInvoice} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl rounded-3xl p-0 overflow-hidden border border-border/80 shadow-2xl bg-card font-sans">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1B4B73] to-[#143755] text-white p-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-44 h-44 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-start justify-between gap-4 relative z-10">
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
                  <Receipt className="h-5.5 w-5.5 text-[#F0B900]" />
                </div>
                <div>
                  <DialogTitle className="text-lg sm:text-xl font-display font-black tracking-tight text-white flex items-center gap-2">
                    Historial de Pagos
                    <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      ● Al día
                    </Badge>
                  </DialogTitle>
                  <p className="text-xs text-white/75 mt-0.5">
                    {isAdmin
                      ? "Gestiona el método de pago de cada mensualidad y descarga las facturas oficiales."
                      : "Consulta tus mensualidades pagadas y descarga tus facturas de servicio en PDF."}
                  </p>
                </div>
              </div>
            </div>

            {/* Sub-cards Info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4 pt-3.5 border-t border-white/10 text-xs">
              <div className="bg-white/5 rounded-xl p-2.5 backdrop-blur-sm border border-white/10">
                <span className="text-[10px] uppercase font-bold text-white/60 block">Lavandería</span>
                <span className="font-bold text-white truncate block">{tenant.nombre}</span>
              </div>
              <div className="bg-white/5 rounded-xl p-2.5 backdrop-blur-sm border border-white/10">
                <span className="text-[10px] uppercase font-bold text-white/60 block">Plan Actual</span>
                <span className="font-bold text-white">{plan.nombre} ({formatRD(plan.precio_mensual)}/mes)</span>
              </div>
              <div className="bg-white/5 rounded-xl p-2.5 backdrop-blur-sm border border-white/10 col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-bold text-white/60 block">Total Invertido</span>
                <span className="font-black text-[#F0B900] text-sm">{formatRD(totalAcumulado)}</span>
              </div>
            </div>
          </div>

          {/* Table Body */}
          <div className="p-4 sm:p-5 max-h-[56vh] overflow-y-auto custom-scrollbar space-y-3">
            {invoices.length === 0 ? (
              <div className="text-center py-10 px-4 space-y-3">
                <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <FileText className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-foreground text-sm">No hay facturas generadas aún</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    {tenant.estado === "TRIAL"
                      ? "Tu cuenta se encuentra en período de prueba gratuita. Al activar tu plan aparecerán aquí tus comprobantes de pago."
                      : "Aún no se registran pagos de mensualidad en el sistema."}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Cabecera de columnas con fondo primario elegante */}
                <div className="hidden sm:grid grid-cols-12 gap-2.5 px-4 py-2.5 rounded-xl bg-[#1B4B73] text-white text-[10.5px] font-black uppercase tracking-wider shadow-2xs">
                  <div className="col-span-3">Comprobante</div>
                  <div className="col-span-3">Período</div>
                  <div className="col-span-4">Método de Pago</div>
                  <div className="col-span-2 text-center">Factura</div>
                </div>

                <div className="space-y-2.5">
                  {paginatedInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3 rounded-2xl border border-border/70 hover:border-primary/40 bg-surface hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-all flex flex-col sm:grid sm:grid-cols-12 sm:items-center gap-2.5 shadow-2xs"
                    >
                      {/* 1. Comprobante: Factura # & Fecha (3 cols) */}
                      <div className="sm:col-span-3 flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-[#1B4B73]/10 text-[#1B4B73] dark:bg-[#1B4B73]/30 dark:text-blue-300 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-foreground tracking-tight truncate">{inv.numeroFactura}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
                            {new Date(inv.fechaPago).toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" })}
                          </div>
                        </div>
                      </div>

                      {/* 2. Período: Plan & Fechas (3 cols) */}
                      <div className="sm:col-span-3 space-y-0.5">
                        <div className="font-semibold text-xs text-foreground flex items-center gap-1.5 flex-wrap">
                          <span>Plan {inv.planNombre}</span>
                          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 text-[9px] font-bold px-1.5 py-0 flex items-center gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Pagada
                          </Badge>
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {new Date(inv.periodoInicio).toLocaleDateString("es-DO")} — {new Date(inv.periodoFin).toLocaleDateString("es-DO")}
                        </div>
                      </div>

                      {/* 3. Selector de Método de Pago con Iconos SVG Lucide (4 cols) */}
                      <div className="sm:col-span-4">
                        <span className="sm:hidden text-[10px] font-bold uppercase text-muted-foreground block mb-1">Método de Pago:</span>
                        {isAdmin ? (
                          <Select
                            value={inv.metodoPago}
                            onValueChange={(val: MetodoPagoSaaS) => handleUpdatePaymentMethod(inv.id, val)}
                            disabled={savingMethodId === inv.id}
                          >
                            <SelectTrigger className="h-8.5 rounded-xl text-xs bg-background border-border/80 shadow-2xs font-medium w-full cursor-pointer px-2.5">
                              <div className="flex items-center gap-2 truncate">
                                {inv.metodoPago === "Pago Vía Stripe" ? (
                                  <CreditCard className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                ) : (
                                  <Landmark className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                )}
                                <span className="truncate">{inv.metodoPago}</span>
                              </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-elegant text-xs">
                              <SelectItem value="Transferencia Bancaria" className="rounded-lg font-medium cursor-pointer">
                                <div className="flex items-center gap-2">
                                  <Landmark className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  <span>Transferencia Bancaria</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="Pago Vía Stripe" className="rounded-lg font-medium cursor-pointer">
                                <div className="flex items-center gap-2">
                                  <CreditCard className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                  <span>Pago Vía Stripe</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-foreground font-semibold text-xs border border-border/60">
                            {inv.metodoPago === "Pago Vía Stripe" ? (
                              <CreditCard className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                            ) : (
                              <Landmark className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            )}
                            <span>{inv.metodoPago}</span>
                          </div>
                        )}
                      </div>

                      {/* 4. Botón Factura A4 (2 cols) - Centrado */}
                      <div className="sm:col-span-2 flex items-center justify-center">
                        <Button
                          size="sm"
                          onClick={() => setSelectedInvoice(inv)}
                          className="w-full sm:w-auto h-8 px-3 rounded-xl bg-[#1B4B73] hover:bg-[#143755] text-white font-bold text-xs gap-1.5 shadow-2xs cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Factura A4</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Barra de Paginación para 3 facturas por página */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-3 border-t border-border/60 text-xs text-muted-foreground px-1">
                    <div className="text-[11px] font-medium text-slate-500">
                      Mostrando {(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(safeCurrentPage * ITEMS_PER_PAGE, invoices.length)} de {invoices.length} facturas
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={safeCurrentPage === 1}
                        className="h-7 w-7 p-0 rounded-lg cursor-pointer"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>

                      {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
                        <Button
                          key={p}
                          variant={p === safeCurrentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(p)}
                          className={`h-7 w-7 p-0 rounded-lg text-xs font-bold cursor-pointer ${
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
                        className="h-7 w-7 p-0 rounded-lg cursor-pointer"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border-t border-border/60 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 text-[11px] truncate">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              Facturas oficiales de Klynn Cloud para fines contables y tributarios.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl h-8 text-xs font-bold cursor-pointer shrink-0"
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Visor de Factura A4 con diseño limpio y tipografía Plus Jakarta Sans */}
      <Dialog open={!!selectedInvoice} onOpenChange={(openVal) => !openVal && setSelectedInvoice(null)}>
        {selectedInvoice && (
          <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 rounded-3xl border border-border shadow-2xl bg-white text-slate-900 custom-scrollbar font-sans">
            {/* Barra de herramientas superior */}
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

              <div className="flex items-center justify-end pr-6">
              </div>
            </div>

            {/* Contenedor de la Factura en Blanco Limpio */}
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
                    <div className="inline-block bg-[#1B4B73]/10 text-[#1B4B73] px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider">
                      Factura de Servicio
                    </div>
                    <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight pt-1">
                      {selectedInvoice.numeroFactura}
                    </div>
                    <div className="text-xs text-slate-500">
                      Fecha de Emisión: <strong>{new Date(selectedInvoice.fechaPago).toLocaleDateString("es-DO")}</strong>
                    </div>
                    <div className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" /> PAGADA EN LÍNEA
                    </div>
                  </div>
                </div>

                {/* DATOS DEL CLIENTE / RECEPTOR */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Facturado A:
                    </span>
                    <div className="font-black text-slate-900 text-sm">{tenant.nombre}</div>
                    <div className="text-slate-600 mt-0.5">
                      RNC / Cédula: <strong>{tenant.rnc || "Consumidor Final"}</strong>
                    </div>
                    <div className="text-slate-600 truncate">{tenant.direccion || "República Dominicana"}</div>
                  </div>

                  <div className="sm:border-l sm:border-slate-200 sm:pl-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Detalle de Suscripción:
                    </span>
                    <div className="font-bold text-slate-900">
                      Plan Klynn {selectedInvoice.planNombre} (Mensual)
                    </div>
                    <div className="text-slate-600 mt-0.5">
                      Período: {new Date(selectedInvoice.periodoInicio).toLocaleDateString("es-DO")} al {new Date(selectedInvoice.periodoFin).toLocaleDateString("es-DO")}
                    </div>
                    <div className="text-slate-700 font-semibold mt-0.5">
                      Método de Pago: <strong className="text-slate-900">{selectedInvoice.metodoPago}</strong>
                    </div>
                  </div>
                </div>

                {/* TABLA DE CONCEPTOS CON MÓDULOS ACTIVOS DEL PLAN + BASE FEATURES */}
                <div className="my-6">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-[#1B4B73] text-white text-[11px] font-bold uppercase">
                        <th className="py-2.5 px-3 rounded-l-lg">Descripción del Servicio</th>
                        <th className="py-2.5 px-3 text-center">Cant.</th>
                        <th className="py-2.5 px-3 text-right">Precio Unitario</th>
                        <th className="py-2.5 px-3 text-right rounded-r-lg">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr className="text-slate-800">
                        <td className="py-4 px-3">
                          <div className="font-bold text-sm text-slate-900">
                            Suscripción Cloud — Plan {selectedInvoice.planNombre}
                          </div>
                          <div className="text-[11.5px] text-slate-500 mt-0.5 leading-relaxed">
                            Acceso completo al software de lavandería <strong className="text-slate-800 font-bold">Klynn</strong>, catálogo, módulos operativos, facturación y almacenamiento en la nube correspondiente al período <strong className="text-slate-800 font-bold">{new Date(selectedInvoice.periodoInicio).toLocaleDateString("es-DO")}</strong> al <strong className="text-slate-800 font-bold">{new Date(selectedInvoice.periodoFin).toLocaleDateString("es-DO")}</strong>.
                          </div>

                          {/* Desglose de Módulos y Servicios Activos (Sin tachados) */}
                          <div className="mt-4 pt-3.5 border-t border-slate-200/90 space-y-2.5">
                            <div className="text-center space-y-1">
                              <div className="text-[10.5px] font-black uppercase tracking-wider text-slate-700">
                                MÓDULOS Y SERVICIOS ACTIVOS INCLUIDOS ({activePlanModules.length + BASE_FEATURES.length}):
                              </div>
                              {plan.limite_empleados && (
                                <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-600 font-semibold border border-slate-200">
                                  <span>Hasta {plan.limite_empleados} Empleados</span>
                                  <span>•</span>
                                  <span>{plan.limite_ordenes_mes ? `${Number(plan.limite_ordenes_mes).toLocaleString()} Órdenes/mes` : "Órdenes ilimitadas"}</span>
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pt-1">
                              {/* 1. Módulos activos del Plan */}
                              {activePlanModules.map(({ label, extra }, idx) => (
                                <div
                                  key={`mod-${idx}`}
                                  className="flex items-center gap-2 text-[11px] text-slate-800 font-medium leading-tight"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  <span className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold">{label}</span>
                                    {extra && (
                                      <span className="text-[9.5px] font-normal text-amber-800 bg-amber-50/80 px-1.5 py-0.5 rounded border border-amber-200/70">
                                        {extra}
                                      </span>
                                    )}
                                  </span>
                                </div>
                              ))}

                              {/* 2. Características base incluidas */}
                              {BASE_FEATURES.map((feat, idx) => (
                                <div
                                  key={`feat-${idx}`}
                                  className="flex items-center gap-2 text-[11px] text-slate-700 font-medium leading-tight"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  <span>{feat}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-3 text-center font-bold align-top pt-4">1 mes</td>
                        <td className="py-4 px-3 text-right font-medium align-top pt-4">{formatRD(selectedInvoice.monto)}</td>
                        <td className="py-4 px-3 text-right font-bold text-slate-900 align-top pt-4">{formatRD(selectedInvoice.monto)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* TOTALES (SIN ITBIS) */}
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

                {/* PIE DE PÁGINA FORMAL */}
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

/** Función de impresión directa con Plus Jakarta Sans */
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
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body {
            font-family: 'Plus Jakarta Sans', sans-serif !important;
            background: white !important;
            margin: 0;
            padding: 0;
            color: #0f172a;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        </style>
      </head>
      <body>
        <div style="padding: 6mm 10mm; font-family: 'Plus Jakarta Sans', sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;">
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
      console.error("Error al imprimir:", e);
      window.print();
    } finally {
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 2000);
    }
  }, 400);
}
