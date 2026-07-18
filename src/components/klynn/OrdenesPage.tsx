import { QRCodeSVG } from "qrcode.react";
import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, Printer, Eye, XCircle, MessageCircle, DownloadCloud, MoreVertical, MoreHorizontal, ArrowUpCircle, FileText, Download, FileSpreadsheet, DollarSign, Coins, Loader2, Check, CheckCircle2, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { notificarWhatsApp } from "@/lib/whatsapp";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { exportToCsv } from "@/lib/export";
import { EstadoBadge } from "@/components/klynn/TenantShell";
import { Ticket } from "@/components/klynn/Ticket";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  getOrdenes, saveOrden, getClientes, getEmpleadoById, formatRD, formatDateRD, formatDateTimeRD, getServicios,
  type Orden, type EstadoOrden, type Cliente, type Caja, type MetodoPago,
  checkPlanLimits, getCajaAbierta, saveMovimiento, uid, nextECFNumero, saveECFDocument, IS_LOCAL_MODE,
  updateOrdenEstado
} from "@/lib/storage";
import { emitirECF, getECFConfig } from "@/lib/fiscal";
import { toast } from "sonner";
import { AlertTriangle, Rocket, Building2, User, Zap, Calendar, Receipt, Inbox, RefreshCw, CircleCheck, Truck, Ban, LayoutGrid } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { useOrdenes, useClientes, useCajaAbierta, useEmpleados, useServicios } from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

function esParaHoy(fechaStr?: string): boolean {
  if (!fechaStr) return false;
  const d = new Date(fechaStr);
  const hoy = new Date();
  return d.getDate() === hoy.getDate() &&
         d.getMonth() === hoy.getMonth() &&
         d.getFullYear() === hoy.getFullYear();
}

function esAtrasada(fechaStr?: string, estado?: EstadoOrden): boolean {
  if (!fechaStr || estado === "ENTREGADA" || estado === "ANULADA") return false;
  return new Date(fechaStr).getTime() < Date.now();
}

export function OrdenesPage() {
  const user = useRequireAuth();
  const isAuthorized = user?.empleado?.rol === "ADMIN" || user?.empleado?.rol === "SUPERVISOR";
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoOrden | "todos" | "hoy" | "urgente">("todos");
  const [filtroEntrega, setFiltroEntrega] = useState<"todas" | "hoy" | "atrasadas">("todas");
  const [filtroUrgencia, setFiltroUrgencia] = useState<"todas" | "urgente" | "estandar">("todas");
  const [view, setView] = useState<Orden | null>(null);
  const [anular, setAnular] = useState<Orden | null>(null);
  const [motivoAnular, setMotivoAnular] = useState("");
  const [codigoAnular, setCodigoAnular] = useState("01");
  const [debito, setDebito] = useState<Orden | null>(null);
  const [montoDebito, setMontoDebito] = useState(0);
  const [motivoDebito, setMotivoDebito] = useState("");
  const [showPrint, setShowPrint] = useState<Orden | null>(null);
  const [pagoRecibidoParaTicket, setPagoRecibidoParaTicket] = useState<number | undefined>(undefined);
  const [showDownloadA4, setShowDownloadA4] = useState<Orden | null>(null);
  const [isPrintingList, setIsPrintingList] = useState(false);
  const [cobrarOrden, setCobrarOrden] = useState<Orden | null>(null);
  const [showPendientes, setShowPendientes] = useState(false);
  const [searchPendientes, setSearchPendientes] = useState("");
  const [condonarOrden, setCondonarOrden] = useState<Orden | null>(null);
  const navigate = useNavigate();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [conveyorOrden, setConveyorOrden] = useState<Orden | null>(null);
  const [conveyorUbicacion, setConveyorUbicacion] = useState("");
  const [savingConveyor, setSavingConveyor] = useState(false);
  const [estadoModal, setEstadoModal] = useState<Orden | null>(null);

  useEffect(() => {
    if (!openMenuId) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.action-menu-container')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [openMenuId]);

  const tenant = user?.tenant;
  const tenantId = tenant?.id || '';

  const { data: ordenes = [], isLoading: loadingOrdenes } = useOrdenes(tenantId);
  const { data: clientes = [], isLoading: loadingClientes } = useClientes(tenantId);
  const { data: cajaAbierta, isLoading: loadingCaja } = useCajaAbierta(tenantId);
  const { data: empleados = [] } = useEmpleados(tenantId);
  const { data: servicios = [] } = useServicios(tenantId);

  const [limits, setLimits] = useState<any>({ orderLimit: null, orderCount: 0, ordersReached: false });
  const [loadingLimits, setLoadingLimits] = useState(false);

  useEffect(() => {
    if (!tenantId || tenantId === '__loading__') return;
    setLoadingLimits(true);
    checkPlanLimits(tenant).then(lim => {
      setLimits(lim);
      setLoadingLimits(false);
    });
  }, [tenantId, ordenes.length]);

  const loading = loadingOrdenes || loadingClientes || loadingCaja;

  const filt = useMemo(() => {
    return ordenes.filter((o) => {
      if (filtroEstado === "hoy") {
        if (!esParaHoy(o.fecha_entrega)) return false;
      } else if (filtroEstado === "urgente") {
        if (!o.es_urgente) return false;
      } else if (filtroEstado !== "todos" && o.estado !== filtroEstado) {
        return false;
      }
      
      // Filtro de entrega (Plazo)
      if (filtroEntrega === "hoy") {
        if (!esParaHoy(o.fecha_entrega)) return false;
      } else if (filtroEntrega === "atrasadas") {
        if (!esAtrasada(o.fecha_entrega, o.estado)) return false;
      }

      // Filtro de urgencia
      if (filtroUrgencia === "urgente" && !o.es_urgente) return false;
      if (filtroUrgencia === "estandar" && o.es_urgente) return false;

      if (!q) return true;
      const c = clientes.find((x) => x.id === o.cliente_id);
      const nombreCompleto = c ? `${c.nombre} ${c.apellido || ""}` : "";
      return o.numero.toLowerCase().includes(q.toLowerCase()) || nombreCompleto.toLowerCase().includes(q.toLowerCase());
    }).sort((a, b) => {
      const getPriority = (order: any) => {
        if (order.es_urgente) return 2;
        if (esParaHoy(order.fecha_entrega)) return 1;
        return 0;
      };
      const pA = getPriority(a);
      const pB = getPriority(b);
      if (pA !== pB) return pB - pA;
      return +new Date(b.creado_en) - +new Date(a.creado_en);
    });
  }, [ordenes, clientes, filtroEstado, filtroEntrega, filtroUrgencia, q]);

  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(filt.length / 15);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * 15;
    return filt.slice(start, start + 15);
  }, [filt, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filt.length]);

  const exportData = useMemo(() => {
    return {
      filename: "Ordenes",
      columns: ["Número", "Cliente", "Estado", "Total", "Saldo", "Pago", "Fecha"],
      data: filt.map(o => [
        o.numero, 
        clientes.find(c => c.id === o.cliente_id)?.nombre || "—",
        o.estado,
        formatRD(o.total),
        formatRD(o.saldo),
        o.metodo_pago,
        formatDateTimeRD(o.creado_en)
      ])
    };
  }, [filt, clientes]);

  if (!user || user.tenant.id === '__loading__') return null;

  async function cambiarEstado(o: Orden, estado: EstadoOrden) {
    // If marking as LISTA and conveyor is enabled, show the modal first
    if (estado === "LISTA" && tenant?.config?.usar_ubicacion_ropa) {
      setConveyorOrden(o);
      setConveyorUbicacion("");
      return;
    }
    try {
      await updateOrdenEstado(o.id, estado);
      queryClient.invalidateQueries({ queryKey: ['ordenes', tenantId] });
      const labels: Record<EstadoOrden, string> = {
        RECIBIDA: "Orden recibida",
        EN_PROCESO: "Orden en proceso",
        LISTA: "Orden lista",
        ENTREGADA: "Orden entregada",
        ANULADA: "Orden anulada",
      };
      toast.success(labels[estado]);
      // Notificar silenciosamente por WhatsApp si aplica
      if (estado === "LISTA" || estado === "ENTREGADA") {
        const cli = clientes.find((c) => c.id === o.cliente_id);
        if (cli) {
          notificarWhatsApp(tenant, cli, o, estado === "LISTA" ? "lista" : "entregada");
        }
      }
    } catch (err: any) {
      toast.error("Error al actualizar estado");
    }
  }

  async function confirmarConveyor() {
    if (!conveyorOrden) return;
    setSavingConveyor(true);
    try {
      await updateOrdenEstado(conveyorOrden.id, "LISTA" as EstadoOrden, conveyorUbicacion || undefined);
      queryClient.invalidateQueries({ queryKey: ['ordenes', tenantId] });
      const ordenActualizada = { ...conveyorOrden, estado: "LISTA" as EstadoOrden, ubicacion_ropa: conveyorUbicacion || undefined };
      const cli = clientes.find((c) => c.id === conveyorOrden.cliente_id);
      if (cli) {
        notificarWhatsApp(tenant, cli, ordenActualizada, "lista").then((r) => {
          if (r.ok) toast.success("WhatsApp enviado al cliente ✅");
        });
      }
      toast.success("Orden marcada como Lista ✓");
      setShowPrint(ordenActualizada);
      setConveyorOrden(null);
      setConveyorUbicacion("");
    } catch (err: any) {
      toast.error("Error al guardar ubicación");
    }
    setSavingConveyor(false);
  }

  async function anularOrden() {
    if (!anular || motivoAnular.length < 5) { toast.error("Indica el motivo (mín 5 caracteres)"); return; }
    
    try {
      let notaCreditoNCF = "";
      
      // 1. Generar Nota de Crédito (E34) si la orden tenía NCF electrónico
      if (anular.tipo_ecf && anular.ncf) {
        try {
          const cfg = await getECFConfig(tenant.id);
          if (cfg?.is_active && cfg.pronesoft_tenant_id) {
            const cliente = clientes.find(c => c.id === anular.cliente_id) || null;
            const res = await emitirECF(
              anular,
              cliente,
              cfg.pronesoft_tenant_id,
              cfg,
              tenant,
              "E34", // Tipo: Nota de Crédito
              {
                ncf: anular.ncf,
                date: anular.creado_en,
                code: codigoAnular // 01=Anulación total, etc.
              }
            );
            notaCreditoNCF = res.encf;
            toast.info(`Nota de Crédito emitida: ${notaCreditoNCF} 📄`);
          } else {
            // Modo offline/local
            notaCreditoNCF = await nextECFNumero(tenant.id, "E34");
            await saveECFDocument({
              id: uid("ecf"),
              tenant_id: tenant.id,
              order_id: anular.id,
              encf: notaCreditoNCF,
              tipo_ecf: "E34",
              rnc_receptor: clientes.find(c => c.id === anular.cliente_id)?.cedula,
              status: "accepted",
              monto_total: anular.total,
              monto_itbis: anular.itbis,
              fecha_emision: new Date().toISOString(),
              xml_content: "ANULACION_LOCAL",
            });
            toast.info(`Nota de Crédito local: ${notaCreditoNCF} 📄`);
          }
        } catch (e: any) {
          console.error("Error fiscal:", e);
          toast.warning("No se pudo emitir la Nota de Crédito. Se anulará localmente.");
        }
      }

      // 2. Actualizar orden
      const ordenAnulada: Orden = { 
        ...anular, 
        estado: "ANULADA", 
        motivo_anulacion: motivoAnular,
        motivo_anulacion_codigo: codigoAnular,
        nota_credito_ncf: notaCreditoNCF || undefined
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
          orden_id: anular.id,
          creado_en: new Date().toISOString(),
        });
        toast.info(`Se registró un egreso de ${formatRD(anular.pagado)} en caja por el reembolso. 💸`);
      }

      setAnular(null); 
      setMotivoAnular(""); 
      queryClient.invalidateQueries({ queryKey: ['ordenes', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['movimientos', tenantId] });
      
      // ACTIVAR MODAL DE IMPRESIÓN AUTOMÁTICAMENTE
      setShowPrint(ordenAnulada);
      
      toast.success("Orden anulada correctamente ✓");
    } catch (err: any) {
      console.error("DEBUG: Error en anularOrden:", err);
      toast.error("Error al anular orden. Asegúrate de haber ejecutado el script SQL para añadir las nuevas columnas.");
    }
  }

  async function generarNotaDebito() {
    if (!debito) return;
    try {
      const isECF = debito.ncf?.startsWith("E");
      let notaDebitoNCF = "";
      let notaDebitoID = "";

      if (isECF) {
        try {
          const cfg = await getECFConfig(tenant.id);
          if (cfg?.is_active && cfg.pronesoft_tenant_id) {
            const cliente = clientes.find(c => c.id === debito.cliente_id) || null;
            // Clonamos la orden para ajustar el total de la ND
            const ordenND = { ...debito, total: montoDebito, subtotal: montoDebito, itbis: 0 };
            const res = await emitirECF(
              ordenND,
              cliente,
              cfg.pronesoft_tenant_id,
              cfg,
              tenant,
              "E33", // Nota de Débito
              {
                ncf: debito.ncf!,
                date: debito.creado_en,
                code: "03" // 03 = Ajuste de precio
              }
            );
            notaDebitoNCF = res.encf;
            notaDebitoID = res.document.id;
          } else {
            const next = await nextECFNumero(tenant.id, "33"); // E33
            if (next) {
              notaDebitoNCF = next.ncf;
              notaDebitoID = uid("ecf");
              await saveECFDocument({
                id: notaDebitoID,
                tenant_id: tenant.id,
                tipo: "33",
                ncf: notaDebitoNCF,
                monto_total: montoDebito,
                rnc_receptor: clientes.find(c => c.id === debito.cliente_id)?.cedula || "",
                fecha_emision: new Date().toISOString(),
                estado: "ACEPTADO",
                ncf_modificado: debito.ncf
              });
            }
          }
        } catch (e: any) {
          console.error("Error ND Fiscal:", e);
          toast.error("Error al emitir Nota de Débito fiscal.");
          return;
        }
      }

      const ordenActualizada: Orden = {
        ...debito,
        total: debito.total + montoDebito,
        saldo: debito.saldo + montoDebito,
        nota_debito_ncf: notaDebitoNCF || undefined,
        nota_debito_id: notaDebitoID || undefined,
        nota_debito_monto: montoDebito
      };

      await saveOrden(ordenActualizada);
      
      setDebito(null);
      setMontoDebito(0);
      setMotivoDebito("");
      queryClient.invalidateQueries({ queryKey: ['ordenes', tenantId] });
      setShowPrint(ordenActualizada);
      
      toast.success("Nota de Débito generada correctamente ✓");
    } catch (err) {
      console.error("Error ND:", err);
      toast.error("Error al generar Nota de Débito");
    }
  }

  if (showPendientes) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col space-y-1 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 sticky top-0 z-10 border-b border-border/10 pb-4">
          <div className="flex items-center">
            <Button 
              onClick={() => setShowPendientes(false)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 gap-1.5 font-bold"
            >
              <ArrowLeft className="h-4 w-4" /> Volver a Órdenes
            </Button>
          </div>
          <h1 className="text-3xl font-display font-black text-foreground tracking-tight pt-3">
            Órdenes Pendientes de Cobro
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aquí puedes ver, buscar y saldar todas las órdenes que tienen cobros pendientes de entrega.
          </p>
        </div>

        {/* Buscador de Pendientes */}
        <Card className="p-4 relative border border-primary/10 shadow-sm rounded-2xl bg-card">
          <Search className="pointer-events-none absolute left-7 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input 
            value={searchPendientes} 
            onChange={(e) => setSearchPendientes(e.target.value)} 
            placeholder="Buscar por número de orden, nombre de cliente o monto (ej: 590, KL-0147)..." 
            className="pl-12 h-11 bg-background border border-primary/10 rounded-2xl focus-visible:ring-amber-500 font-medium" 
          />
        </Card>

        {/* Cuadrícula de Tarjetas */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 py-2">
          {ordenes
            .filter(o => o.saldo > 0 && o.estado !== "ANULADA")
            .filter(o => {
              if (!searchPendientes) return true;
              const searchLower = searchPendientes.toLowerCase();
              const clienteObj = clientes.find(c => c.id === o.cliente_id);
              const clienteNombre = clienteObj ? `${clienteObj.nombre} ${clienteObj.apellido || ""}`.toLowerCase() : "";
              
              return o.numero.toLowerCase().includes(searchLower) ||
                     clienteNombre.includes(searchLower) ||
                     String(o.total).includes(searchLower) ||
                     String(o.saldo).includes(searchLower);
            })
            .sort((a, b) => +new Date(b.creado_en) - +new Date(a.creado_en))
            .map((o) => (
              <PendienteCard 
                key={o.id}
                o={o}
                clientes={clientes}
                cajaAbierta={cajaAbierta}
                onCobrarClick={(ordenToPay) => {
                  setCobrarOrden(ordenToPay);
                }}
              />
            ))}

          {ordenes.filter(o => o.saldo > 0 && o.estado !== "ANULADA").length === 0 && (
            <div className="col-span-full py-16 text-center flex flex-col items-center justify-center bg-card rounded-3xl border border-border shadow-sm">
              <div className="rounded-full bg-emerald-500/10 p-3.5 mb-3 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h4 className="font-bold text-base text-foreground">¡Todo al día!</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">No hay ninguna orden con saldos pendientes por cobrar en este momento.</p>
              <Button 
                onClick={() => setShowPendientes(false)}
                className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
              >
                Volver a Órdenes
              </Button>
            </div>
          )}

          {ordenes.filter(o => o.saldo > 0 && o.estado !== "ANULADA").length > 0 && 
           ordenes.filter(o => o.saldo > 0 && o.estado !== "ANULADA").filter(o => {
              if (!searchPendientes) return true;
              const searchLower = searchPendientes.toLowerCase();
              const clienteObj = clientes.find(c => c.id === o.cliente_id);
              const clienteNombre = clienteObj ? `${clienteObj.nombre} ${clienteObj.apellido || ""}`.toLowerCase() : "";
              
              return o.numero.toLowerCase().includes(searchLower) ||
                     clienteNombre.includes(searchLower) ||
                     String(o.total).includes(searchLower) ||
                     String(o.saldo).includes(searchLower);
           }).length === 0 && (
            <div className="col-span-full py-12 text-center flex flex-col items-center justify-center bg-card rounded-3xl border border-border shadow-sm">
              <h4 className="font-bold text-sm text-foreground">Sin resultados</h4>
              <p className="text-xs text-muted-foreground mt-1">No se encontraron órdenes pendientes que coincidan con "{searchPendientes}".</p>
            </div>
          )}
        </div>

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
      <PageHeader title="Órdenes" description={`${ordenes.length} órdenes registradas`}>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2 bg-slate-800 text-white hover:bg-slate-900 shadow-sm border-0 transition-all duration-200 active:scale-95">
                <Download className="h-4 w-4" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-elegant">
              <DropdownMenuItem 
                className="gap-2 cursor-pointer py-2 rounded-lg" 
                onClick={() => exportToCsv(exportData.filename, exportData.columns, exportData.data)}
              >
                <FileSpreadsheet className="h-4 w-4 text-green-600" /> Excel (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="gap-2 cursor-pointer py-2 rounded-lg" 
                onClick={() => setIsPrintingList(true)}
              >
                <Printer className="h-4 w-4 text-red-600" /> PDF / Impresión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm border-0 transition-all duration-200 active:scale-95" 
            onClick={() => setIsPrintingList(true)}
          >
            <Printer className="h-4 w-4" /> Imprimir
          </Button>

          {(() => {
            const cantidadPendientes = ordenes.filter(o => o.saldo > 0 && o.estado !== "ANULADA").length;
            return (
              <Button
                onClick={() => setShowPendientes(true)}
                className="gap-2 bg-amber-500 hover:bg-amber-600 text-white shadow-glow border-0 transition-all duration-200 active:scale-95 font-bold"
              >
                <Coins className="h-4 w-4" /> 
                Órdenes Pendientes
                {cantidadPendientes > 0 && (
                  <Badge className="ml-1 bg-white text-amber-600 hover:bg-white border-none font-black text-[10px] px-1.5 py-0.5 rounded-full shadow-sm">
                    {cantidadPendientes}
                  </Badge>
                )}
              </Button>
            );
          })()}
        </div>
      </PageHeader>

      {limits.orderLimit !== null && (
        <Card className={`mb-4 border-none shadow-sm overflow-hidden ${limits.ordersReached ? "bg-destructive/5" : "bg-primary/5"}`}>
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 gap-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${limits.ordersReached ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                {limits.ordersReached ? <AlertTriangle className="h-5 w-5" /> : <Rocket className="h-5 w-5" />}
              </div>
              <div>
                <div className="text-sm font-bold">
                  {limits.ordersReached 
                    ? "Has alcanzado el límite de órdenes de tu plan" 
                    : `Uso del plan: ${limits.orderCount} de ${limits.orderLimit} órdenes este mes`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {limits.ordersReached 
                    ? "Actualiza tu plan para seguir registrando nuevas órdenes." 
                    : "Llevas un buen ritmo, considera cambiar de Plan si creces más."}
                </div>
              </div>
            </div>
            <Button 
              className="bg-gradient-primary text-white h-9 px-5 font-bold shrink-0 shadow-sm border-0 transition-all active:scale-95"
              onClick={() => navigate({ to: "/t/$slug/configuracion", params: { slug: tenant.slug }, search: { tab: "plan" } as any })}
            >
              🚀 Ver planes
            </Button>
          </div>

        </Card>
      )}

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por número o cliente..." className="pl-10" />
        </div>
        <Select value={filtroEntrega} onValueChange={(v: any) => setFiltroEntrega(v)}>
          <SelectTrigger className="w-[140px] font-semibold text-xs shrink-0">
            <Calendar className="h-4 w-4 text-primary shrink-0 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="hoy">Para hoy</SelectItem>
            <SelectItem value="atrasadas">Atrasadas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroUrgencia} onValueChange={(v: any) => setFiltroUrgencia(v)}>
          <SelectTrigger className="w-[140px] font-semibold text-xs shrink-0">
            <Zap className="h-4 w-4 text-amber-500 shrink-0 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Prioridades</SelectItem>
            <SelectItem value="urgente">Urgentes</SelectItem>
            <SelectItem value="estandar">Estándar</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      {/* Badge tabs de estado */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {[
          { value: "todos", label: "Todas", icon: LayoutGrid, bg: "bg-slate-100 text-slate-700 border-slate-200", activeBg: "bg-[#2c4e82] text-white border-[#2c4e82] shadow-md" },
          { value: "RECIBIDA", label: "Recibida", icon: Inbox, bg: "bg-blue-50 text-blue-700 border-blue-200", activeBg: "bg-blue-600 text-white border-blue-600 shadow-md" },
          { value: "hoy", label: "Para hoy", icon: Calendar, bg: "bg-orange-50 text-orange-700 border-orange-200", activeBg: "bg-orange-600 text-white border-orange-600 shadow-md" },
          { value: "urgente", label: "Urgentes", icon: Zap, bg: "bg-rose-50 text-rose-700 border-rose-200", activeBg: "bg-rose-600 text-white border-rose-600 shadow-md" },
          { value: "EN_PROCESO", label: "En proceso", icon: RefreshCw, bg: "bg-amber-50 text-amber-700 border-amber-200", activeBg: "bg-amber-500 text-white border-amber-500 shadow-md" },
          { value: "LISTA", label: "Lista", icon: CircleCheck, bg: "bg-emerald-50 text-emerald-700 border-emerald-200", activeBg: "bg-emerald-600 text-white border-emerald-600 shadow-md" },
          { value: "ENTREGADA", label: "Entregada", icon: Truck, bg: "bg-purple-50 text-purple-700 border-purple-200", activeBg: "bg-purple-600 text-white border-purple-600 shadow-md" },
          { value: "ANULADA", label: "Anulada", icon: Ban, bg: "bg-red-50 text-red-700 border-red-200", activeBg: "bg-red-600 text-white border-red-600 shadow-md" },
        ].map((tab) => {
          const count = tab.value === "todos" ? ordenes.length :
                        tab.value === "hoy" ? ordenes.filter(o => esParaHoy(o.fecha_entrega)).length :
                        tab.value === "urgente" ? ordenes.filter(o => o.es_urgente).length :
                        ordenes.filter(o => o.estado === tab.value).length;
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
              <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                isActive ? "bg-white/25" : "bg-black/5"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-elevated text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Orden y Cliente</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Total</th>
                <th className="px-4 py-3 text-center">Saldo</th>
                <th className="px-4 py-3 text-center">Pago</th>
                <th className="px-4 py-3 text-center">Entrega</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((o) => {
                const c = clientes.find((x) => x.id === o.cliente_id);
                return (
                  <tr 
                    key={o.id} 
                    className="border-b border-border/50 hover:bg-accent/40 cursor-pointer transition-colors duration-100"
                    onClick={(e) => {
                      // Don't open modal if clicking on action buttons or badges
                      const target = e.target as HTMLElement;
                      if (target.closest('button') || target.closest('[role="menuitem"]') || target.closest('.action-menu-container')) return;
                      if (o.estado !== "ANULADA") setEstadoModal(o);
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef2f6] text-[#2c4e82] dark:bg-slate-800 dark:text-blue-400 animate-in fade-in zoom-in duration-200 border border-[#d6e0ea]/50">
                          <Receipt className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-mono text-sm font-bold text-[#2c4e82] dark:text-[#5c85c2]">
                            {o.numero}
                          </span>
                          <span className="font-bold text-sm text-foreground truncate max-w-[220px]" title={c ? `${c.nombre} ${c.apellido || ""}` : ""}>
                            {c ? `${c.nombre} ${c.apellido || ""}` : "Consumidor Final"}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {formatDateTimeRD(o.creado_en)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {o.estado === "ANULADA" ? (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600">
                          <Ban className="h-3 w-3" /> ANULADA
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                          o.estado === "RECIBIDA" ? "border-blue-200 bg-blue-50 text-blue-700" :
                          o.estado === "EN_PROCESO" ? "border-amber-200 bg-amber-50 text-amber-700" :
                          o.estado === "LISTA" ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
                          o.estado === "ENTREGADA" ? "border-purple-200 bg-purple-50 text-purple-700" :
                          "border-zinc-200 bg-zinc-50 text-zinc-600"
                        }`}>
                          {o.estado === "RECIBIDA" && <Inbox className="h-3 w-3" />}
                          {o.estado === "EN_PROCESO" && <RefreshCw className="h-3 w-3" />}
                          {o.estado === "LISTA" && <CircleCheck className="h-3 w-3" />}
                          {o.estado === "ENTREGADA" && <Truck className="h-3 w-3" />}
                          {o.estado.replace("_", " ")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-medium">{formatRD(o.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center">
                        {o.saldo > 0 ? (
                          <button
                            onClick={() => o.estado !== "ANULADA" && setCobrarOrden(o)}
                            className="transition-transform active:scale-95 cursor-pointer"
                            title="Cobrar saldo de esta orden"
                          >
                            <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning-foreground hover:bg-warning/25 transition-colors font-bold">
                              {formatRD(o.saldo)}
                            </Badge>
                          </button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-xs">{o.metodo_pago}</td>
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
                    <td className="px-4 py-3">
                        <div className="action-menu-container order-actions action-menu">
                          <button
                            type="button"
                            onClick={() => setOpenMenuId(openMenuId === o.id ? null : o.id)}
                            className={openMenuId === o.id ? "is-open" : ""}
                          >
                            <MoreHorizontal />
                          </button>
                          {openMenuId === o.id && (
                            <div 
                              className="action-menu-popover"
                              onMouseLeave={() => setOpenMenuId(null)}
                            >
                              <button 
                                onClick={() => { setOpenMenuId(null); setView(o); }}
                              >
                                <Eye /> Ver Detalles
                              </button>
                              
                              {o.saldo > 0 && o.estado !== "ANULADA" && (
                                <button 
                                  onClick={() => { setOpenMenuId(null); setCobrarOrden(o); }}
                                  className="text-emerald-600 dark:text-emerald-400"
                                >
                                  <DollarSign /> Cobrar Orden
                                </button>
                              )}

                              <button 
                                onClick={() => { setOpenMenuId(null); setShowPrint(o); }}
                              >
                                <Printer /> Imprimir Ticket
                              </button>
                              
                              <button 
                                onClick={() => { setOpenMenuId(null); setShowDownloadA4(o); }}
                              >
                                <DownloadCloud /> Ver Factura A4
                              </button>
   
                              {o.estado !== "ANULADA" && (
                                <>
                                  <button 
                                    onClick={() => { setOpenMenuId(null); setDebito(o); }}
                                  >
                                    <ArrowUpCircle className="text-blue-600 dark:text-blue-400" /> Nota de Débito
                                  </button>
                                  {o.saldo > 0 && isAuthorized && (
                                    <button 
                                      onClick={() => { setOpenMenuId(null); setCondonarOrden(o); }}
                                      className="text-amber-600 dark:text-amber-400"
                                    >
                                      <AlertTriangle /> Condonar Deuda
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => { setOpenMenuId(null); setAnular(o); }}
                                    className="danger"
                                  >
                                    <XCircle /> Anular Orden
                                  </button>
                                </>
                              )}
                            </div>
                          )}
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
                      <h3 className="font-display text-lg font-bold text-foreground">¡No hay órdenes registradas!</h3>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                        Aquí verás las órdenes de servicios de lavandería creadas por tus operadores, su estado de lavado, entrega y pago en tiempo real.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Página {currentPage} de {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                className="h-8 rounded-xl text-xs font-bold transition-all active:scale-[0.98] bg-primary text-white hover:bg-primary/90"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Anterior
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-8 rounded-xl text-xs font-bold transition-all active:scale-[0.98] bg-primary text-white hover:bg-primary/90"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                Siguiente <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Vista detalle */}
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {view && (
            <OrderDetail 
              view={view} 
              tenant={tenant} 
              clientes={clientes} 
              empleados={empleados}
              cambiarEstado={cambiarEstado} 
              setView={setView} 
              onPrint={() => setShowPrint(view)}
              setCobrarOrden={setCobrarOrden}
            />
          )}
        </DialogContent>
      </Dialog>

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
      <Dialog open={!!anular} onOpenChange={(o) => !o && setAnular(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular {anular?.numero}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold mb-1.5 block">Tipo de Modificación (DGII)</label>
              <Select value={codigoAnular} onValueChange={setCodigoAnular}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccione código" />
                </SelectTrigger>
                <SelectContent align="start" sideOffset={4}>
                  <SelectItem value="01">01 - Anulación Total</SelectItem>
                  <SelectItem value="02">02 - Anulación Parcial</SelectItem>
                  <SelectItem value="03">03 - Descuento o Bonificación</SelectItem>
                  <SelectItem value="04">04 - Devolución de Mercancía</SelectItem>
                  <SelectItem value="05">05 - Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-bold mb-1.5 block">Motivo descriptivo</label>
              <Input value={motivoAnular} onChange={(e) => setMotivoAnular(e.target.value)} placeholder="Ej: Error en el monto digitado" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnular(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={anularOrden}>Anular orden</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nota de Débito */}
      <Dialog open={!!debito} onOpenChange={(o) => !o && setDebito(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-blue-600" />
              Generar Nota de Débito
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 border border-blue-100">
              Esta acción generará un <b>e-NCF E33</b> y aumentará el total de la orden #{debito?.numero}.
            </div>
            <div>
              <label className="text-sm font-bold mb-1.5 block">Monto a adicionar (RD$)</label>
              <Input 
                type="number" 
                value={montoDebito} 
                onChange={(e) => setMontoDebito(Number(e.target.value))} 
                placeholder="0.00" 
                className="text-lg font-bold"
              />
            </div>
            <div>
              <label className="text-sm font-bold mb-1.5 block">Concepto / Motivo</label>
              <Input 
                value={motivoDebito} 
                onChange={(e) => setMotivoDebito(e.target.value)} 
                placeholder="Ej: Ajuste por servicio adicional" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDebito(null)}>Cancelar</Button>
            <Button onClick={generarNotaDebito} disabled={montoDebito <= 0}>Generar Nota de Débito</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isPrintingList && (
        <OrdenesPrintPortal
          tenant={user.tenant}
          ordenes={filt}
          clientes={clientes}
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
      <Dialog open={!!estadoModal} onOpenChange={(o) => { if (!o) setEstadoModal(null); }}>
        <DialogContent className="sm:max-w-3xl rounded-[24px] p-6 overflow-hidden bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm ${
              estadoModal?.estado === "RECIBIDA" ? "bg-blue-500" :
              estadoModal?.estado === "EN_PROCESO" ? "bg-amber-500" :
              estadoModal?.estado === "LISTA" ? "bg-emerald-500" :
              "bg-purple-500"
            }`}>
              {estadoModal?.estado === "RECIBIDA" && <Inbox className="h-5 w-5" />}
              {estadoModal?.estado === "EN_PROCESO" && <RefreshCw className="h-5 w-5" />}
              {estadoModal?.estado === "LISTA" && <CircleCheck className="h-5 w-5" />}
              {estadoModal?.estado === "ENTREGADA" && <Truck className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-lg font-black leading-tight text-slate-900">{estadoModal?.numero}</DialogTitle>
              <div className="text-xs font-medium mt-0.5 flex items-center gap-1.5">
                <span className="text-blue-600 uppercase tracking-wide">{clientes.find(c => c.id === estadoModal?.cliente_id)?.nombre || "Consumidor Final"}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500">Cambiar estado</span>
              </div>
            </div>
          </div>
          
          {/* Título Central */}
          <div className="text-center mb-5">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Cambiar estado de la orden</h2>
            <p className="text-[13px] text-slate-500">Selecciona el nuevo estado para actualizar el progreso de esta orden.</p>
          </div>
          
          {/* Tarjetas */}
          <div className="grid grid-cols-4 gap-3 mb-6 px-1">
            {([
              { value: "RECIBIDA" as EstadoOrden, label: "Recibida", icon: Inbox, color: "blue", desc: "La orden ha sido recibida y está pendiente de revisión." },
              { value: "EN_PROCESO" as EstadoOrden, label: "En proceso", icon: RefreshCw, color: "amber", desc: "La orden está siendo procesada actualmente." },
              { value: "LISTA" as EstadoOrden, label: "Lista", icon: CircleCheck, color: "emerald", desc: "La orden está lista para ser entregada." },
              { value: "ENTREGADA" as EstadoOrden, label: "Entregada", icon: Truck, color: "purple", desc: "La orden ha sido entregada al cliente." },
            ]).map((s) => {
              const Icon = s.icon;
              const isCurrent = estadoModal?.estado === s.value;
              
              const colorClasses = {
                blue: { iconBg: "bg-blue-100", iconColor: "text-blue-600", activeCardBg: "bg-blue-50/40", activeBorder: "border-blue-400", activeCheckBg: "bg-blue-500" },
                amber: { iconBg: "bg-amber-100", iconColor: "text-amber-500", activeCardBg: "bg-amber-50/40", activeBorder: "border-amber-400", activeCheckBg: "bg-amber-500" },
                emerald: { iconBg: "bg-emerald-100", iconColor: "text-emerald-600", activeCardBg: "bg-emerald-50/40", activeBorder: "border-emerald-400", activeCheckBg: "bg-emerald-500" },
                purple: { iconBg: "bg-purple-100", iconColor: "text-purple-600", activeCardBg: "bg-purple-50/40", activeBorder: "border-purple-400", activeCheckBg: "bg-purple-500" }
              }[s.color]!;

              const cardClass = isCurrent 
                ? `border-[1.5px] ${colorClasses.activeBorder} ${colorClasses.activeCardBg} shadow-sm`
                : `border border-slate-200 bg-white hover:shadow-md hover:border-slate-300`;

              return (
                <button
                  key={s.value}
                  onClick={() => {
                    if (!isCurrent && estadoModal) {
                      cambiarEstado(estadoModal, s.value);
                      setEstadoModal(null);
                    }
                  }}
                  disabled={isCurrent}
                  className={`relative flex flex-col items-center justify-start text-center rounded-[16px] p-4 transition-all duration-200 active:scale-95 cursor-pointer ${cardClass}`}
                >
                  {isCurrent && (
                    <div className={`absolute top-2.5 right-2.5 h-[18px] w-[18px] rounded-full flex items-center justify-center text-white shadow-sm ${colorClasses.activeCheckBg}`}>
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </div>
                  )}
                  <div className={`h-[52px] w-[52px] rounded-full flex items-center justify-center mb-3 ${colorClasses.iconBg}`}>
                    <Icon className={`h-6 w-6 ${colorClasses.iconColor}`} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-[15px] font-bold text-slate-900 mb-1.5">{s.label}</h3>
                  <p className="text-[11px] text-slate-500 leading-snug font-medium">{s.desc}</p>
                </button>
              );
            })}
          </div>

          <div className="flex justify-center">
            <Button variant="outline" className="text-sm text-slate-700 font-semibold h-9 px-8 rounded-xl border-slate-200 hover:bg-slate-50" onClick={() => setEstadoModal(null)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Conveyor - Ubicación de la ropa */}
      <Dialog open={!!conveyorOrden} onOpenChange={(o) => { if (!o) { setConveyorOrden(null); setConveyorUbicacion(""); } }}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <span className="text-xl">🔄</span>
              Ubicación en Conveyor
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Orden <span className="font-bold text-foreground">{conveyorOrden?.numero}</span> — Ingresa la posición del conveyor donde quedará colgada la ropa. Se imprimirá en el ticket de logística.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-xs font-bold text-muted-foreground block mb-1.5">Posición en Conveyor</label>
            <Input
              autoFocus
              value={conveyorUbicacion}
              onChange={(e) => setConveyorUbicacion(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !savingConveyor) confirmarConveyor(); }}
              placeholder="Ej. 1909, A-12, Gancho 5..."
              className="text-lg font-bold h-11 text-center tracking-widest"
            />
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">Puede dejar vacío si no aplica</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => { setConveyorOrden(null); setConveyorUbicacion(""); }}>
              Cancelar
            </Button>
            <Button size="sm" onClick={confirmarConveyor} disabled={savingConveyor} className="gap-1.5">
              {savingConveyor ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CircleCheck className="h-3.5 w-3.5" />}
              Guardar e Imprimir Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function OrderDetail({ view, tenant, clientes, empleados, cambiarEstado, setView, onPrint, setCobrarOrden }: { 
  view: Orden; tenant: any; clientes: any[]; empleados: any[]; cambiarEstado: any; setView: any; onPrint: () => void; setCobrarOrden: any;
}) {
  const [empleadoView, setEmpleadoView] = useState<any>(null);
  const [srvList, setSrvList] = useState<any[]>([]);
  
  useEffect(() => {
    if (view) {
      getEmpleadoById(view.empleado_id)
        .then(res => setEmpleadoView(res))
        .catch(() => setEmpleadoView(null));
      getServicios(tenant.id).then(setSrvList);
    }
  }, [view, tenant.id]);

  const c = clientes.find((x) => x.id === view?.cliente_id) || { nombre: "Consumidor", apellido: "Final", cedula: "", telefono: "" };
  const emp = empleadoView || empleados.find((e) => e.id === view?.empleado_id) || { nombre: "Personal" };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Orden {view.numero}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-6 md:grid-cols-2 items-start">
        <div className="space-y-2 text-sm">
          <div><strong>Cliente:</strong> {c.nombre} {c.apellido || ""}</div>
          {c.telefono && c.telefono !== "---" && <div><strong>Tel:</strong> {c.telefono}</div>}
          <div><strong>Estado:</strong> <EstadoBadge estado={view.estado} /></div>
          <div><strong>Total:</strong> {formatRD(view.total)}</div>
          <div><strong>Pagado:</strong> {formatRD(view.pagado)}</div>
          {view.saldo > 0 && <div className="text-warning-foreground"><strong>Saldo:</strong> {formatRD(view.saldo)}</div>}
          <div><strong>Atendido por:</strong> {emp.nombre}</div>
          <div><strong>Total de prendas:</strong> {(view.items || []).filter(it => !it.descripcion.toLowerCase().startsWith("servicio:")).reduce((acc, it) => acc + it.cantidad, 0)}</div>
          {view.motivo_anulacion && <div className="rounded-md bg-destructive/10 p-2 text-destructive"><strong>Motivo anulación:</strong> {view.motivo_anulacion}</div>}

          {/* Datos Fiscales */}
          {view.ncf && (
            <div className="mt-2 rounded-xl border border-primary/20 bg-primary/5 p-3 flex justify-between items-center gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="text-xs font-bold uppercase tracking-wider text-primary mb-1">Datos Fiscales</div>
                <div className="text-sm">
                  <strong>{view.ncf.startsWith("E") ? "e-NCF:" : "NCF:"}</strong> <span className="font-mono">{view.ncf}</span>
                  {view.ncf_vencimiento && (
                    <div className="text-[11px] font-bold mt-0.5">Fecha Vencimiento: {formatDateRD(view.ncf_vencimiento)}</div>
                  )}
                </div>
                {view.ecf_security_code && view.ecf_security_code !== "null" && (
                  <div className="text-xs"><strong>Cod. Seguridad:</strong> <span className="font-mono">{view.ecf_security_code}</span></div>
                )}
                {view.ecf_signature_date && view.ecf_signature_date !== "null" && (
                  <div className="text-[11px] text-muted-foreground italic"><strong>Firma:</strong> {formatDateTimeRD(view.ecf_signature_date)}</div>
                )}
              </div>
              {view.ncf.startsWith("E") && (
                <div className="bg-white p-1.5 rounded-lg shadow-sm border border-primary/10 shrink-0">
                  <QRCodeSVG 
                    value={view.ecf_qr || `https://dgii.gov.do/consulta_ecf?RNC_EMISOR=${tenant.rnc}&E_NCF=${view.ncf}&MONTO_TOTAL=${view.total}&FECHA_EMISION=${new Date(view.creado_en).toLocaleDateString('en-GB').replace(/\//g, '')}`} 
                    size={75} 
                    level="M" 
                  />
                </div>
              )}
            </div>
          )}

          <div className="pt-2">
            <div className="mb-2 text-xs uppercase text-muted-foreground">Cambiar estado</div>
            <div className="flex flex-wrap gap-1.5">
              {(["RECIBIDA", "EN_PROCESO", "LISTA", "ENTREGADA"] as EstadoOrden[]).map((s) => (
                <Button key={s} size="sm" variant={view.estado === s ? "default" : "outline"} onClick={() => { cambiarEstado(view, s); setView({ ...view, estado: s }); }}>{s.replace("_", " ")}</Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            {view.saldo > 0 && view.estado !== "ANULADA" && (
              <Button 
                className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white shadow-glow font-bold h-11 rounded-xl"
                onClick={() => {
                  setView(null);
                  setCobrarOrden(view);
                }}
              >
                <DollarSign className="mr-2 h-4.5 w-4.5" /> Cobrar Orden ({formatRD(view.saldo)})
              </Button>
            )}
            <div className="flex gap-2">
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" onClick={() => {
                if (!c.telefono) { toast.error("El cliente no tiene teléfono"); return; }
                const promise = notificarWhatsApp(tenant, c, view, "creada", view.pagado);
                toast.promise(promise, {
                  loading: "Enviando recibo por WhatsApp...",
                  success: (r) => r.ok ? "¡Recibo enviado exitosamente! ✅" : `Fallo al enviar: ${r.reason}`,
                  error: "Error inesperado al enviar WhatsApp",
                });
              }}>
                <MessageCircle className="mr-1.5 h-4 w-4" /> Enviar WhatsApp
              </Button>
              <Button className="flex-1 bg-gradient-primary text-white" onClick={onPrint}>
                <Printer className="mr-1.5 h-4 w-4" /> Imprimir
              </Button>
            </div>
          </div>
        </div>
        <div className="max-h-[500px] overflow-auto rounded-xl bg-zinc-100 p-4 shadow-inner dark:bg-zinc-800/50">
          <Ticket orden={view} tenant={tenant} empleado={emp} cliente={c} formato={tenant.config!.formato_ticket} serviciosList={srvList} />
        </div>
      </div>
    </>
  );
}

export function TicketPrintPortal({ orden, tenant, clientes, empleados, onClose, pagoRecibido }: { orden: Orden; tenant: any; clientes: any[]; empleados: any[]; onClose: () => void; pagoRecibido?: number }) {
  const [emp, setEmp] = useState<any>(null);
  const [cli, setCli] = useState<any>(null);
  const [srvList, setSrvList] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      getEmpleadoById(orden.empleado_id).catch(() => null),
      Promise.resolve(clientes.find(c => c.id === orden.cliente_id)),
      getServicios(tenant.id)
    ]).then(([e, c, s]) => {
      setEmp(e || empleados.find(x => x.id === orden.empleado_id) || { nombre: "Personal" });
      setCli(c || { nombre: "Consumidor", apellido: "Final", cedula: "", telefono: "" });
      setSrvList(s);
    });
  }, [orden, tenant.id, clientes, empleados]);

  if (!emp || !cli) return null;

  return createPortal(
    <div className="fixed inset-0 bg-white z-[99999] overflow-y-auto pointer-events-auto atomic-print-target">
      <div className="max-w-md mx-auto p-8 print:p-0 print:max-w-none print:m-0">
        <div className="flex justify-between items-start border-b-2 border-primary/20 pb-4 mb-8 print:hidden relative z-[100000]">
          <Button 
            variant="outline" 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
            className="cursor-pointer"
          >
            Cerrar vista de impresión
          </Button>
          <Button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.print(); }} 
            className="bg-primary text-white gap-2 cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Imprimir ahora
          </Button>
        </div>

        <Ticket 
          orden={orden} 
          tenant={tenant} 
          empleado={emp} 
          cliente={cli} 
          formato={tenant.config?.formato_ticket || "80mm"} 
          serviciosList={srvList}
          pagoRecibido={pagoRecibido}
        />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: ${tenant.config?.formato_ticket === "57mm" ? "57mm auto" : "80mm auto"};
            margin: 0;
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
            position: relative !important;
            left: -2mm !important;
            width: 100% !important;
            max-width: ${tenant.config?.formato_ticket === "57mm" ? "52mm" : "72mm"} !important;
            padding: ${tenant.config?.formato_ticket === "57mm" ? "1.5mm" : "2mm"} !important;
            margin: 0 auto !important;
            background: white;
            color: black;
            font-family: monospace;
            font-size: ${tenant.config?.formato_ticket === "57mm" ? "10px" : "12px"};
            line-height: ${tenant.config?.formato_ticket === "57mm" ? "1.2" : "1.3"};
            box-sizing: border-box !important;
          }

          .no-print, nav, aside, header, footer, button {
            display: none !important;
          }
        }
      `}} />
    </div>,
    document.body
  );
}

function FacturaA4PrintPortal({ orden, tenant, clientes, empleados, onClose }: { orden: Orden; tenant: any; clientes: any[]; empleados: any[]; onClose: () => void }) {
  const [emp, setEmp] = useState<any>(null);
  const [cli, setCli] = useState<any>(null);
  const [srvList, setSrvList] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      getEmpleadoById(orden.empleado_id).catch(() => null),
      Promise.resolve(clientes.find(c => c.id === orden.cliente_id)),
      getServicios(tenant.id)
    ]).then(([e, c, s]) => {
      setEmp(e || empleados.find(x => x.id === orden.empleado_id) || { nombre: "Personal" });
      setCli(c || { nombre: "Consumidor", apellido: "Final", cedula: "", telefono: "" });
      setSrvList(s);
    });
  }, [orden, tenant.id, clientes, empleados]);

  if (!emp || !cli) return null;

  const isCréditoFiscal = orden.ncf?.startsWith("E31") || orden.ncf?.startsWith("B01");
  const isECF = orden.ncf?.startsWith("E");
  const qrData = orden.ecf_qr || (isECF ? `https://dgii.gov.do/consulta_ecf?RNC_EMISOR=${tenant.rnc}&E_NCF=${orden.ncf}&MONTO_TOTAL=${orden.total}&FECHA_EMISION=${new Date(orden.creado_en).toLocaleDateString('en-GB').replace(/\//g, '')}` : "");
  const cfg = tenant.config;


  return createPortal(
    <div className="fixed inset-0 bg-white z-[99999] overflow-y-auto pointer-events-auto atomic-print-target">
      <div className="max-w-4xl mx-auto p-8 print:p-12 print:max-w-4xl print:mx-auto">
        <div className="flex justify-between items-start border-b-2 border-primary/20 pb-6 mb-8 print:hidden relative z-[100000]">
          <Button variant="outline" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }} className="gap-2 cursor-pointer">
            Cerrar
          </Button>
          <Button onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.print(); }} className="bg-primary text-white gap-2 cursor-pointer">
            <Printer className="h-4 w-4" /> Imprimir / Guardar PDF
          </Button>
        </div>

        <div className="print-area">
          <div className="flex justify-between items-start mb-10">
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
              <div className="text-xs text-slate-500">Tel: {tenant.telefono}</div>
            </div>

            <div className="text-right">
              <h2 className="text-2xl font-display font-black uppercase text-slate-900 mb-1">
                {orden.nota_credito_ncf ? (isECF ? "Nota de Crédito Electrónica" : "Nota de Crédito") : (isCréditoFiscal ? "Factura de Crédito Fiscal" : (isECF ? "Factura de Consumo Electrónica" : "Factura de Consumo"))}
              </h2>
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
                ORDEN #{orden.numero}
              </div>
              
              <table className="text-xs text-slate-600 ml-auto" style={{ borderSpacing: 0, borderCollapse: 'collapse' }}>
                <tbody>
                  <tr><td className="font-bold pr-1.5 text-right whitespace-nowrap">Fecha:</td><td className="text-left">{new Date(orden.creado_en).toLocaleString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}</td></tr>
                {orden.nota_credito_ncf ? (
                  <>
                    <tr><td className="font-bold pr-1.5 text-right text-destructive whitespace-nowrap">{isECF ? "e-NCF:" : "NCF:"}</td><td className="font-mono font-bold text-destructive text-left">{orden.nota_credito_ncf}</td></tr>
                    {orden.ncf_vencimiento && <tr><td className="font-bold pr-1.5 text-right whitespace-nowrap">Fecha Vencimiento:</td><td className="text-left font-bold">{formatDateRD(orden.ncf_vencimiento)}</td></tr>}
                    <tr><td className="font-bold pr-1.5 text-right whitespace-nowrap">Doc. Modificado:</td><td className="font-mono text-left">{orden.ncf}</td></tr>
                  </>
                ) : (
                  orden.ncf && (
                    <>
                      <tr><td className="font-bold pr-1.5 text-right whitespace-nowrap">{isECF ? "e-NCF:" : "NCF:"}</td><td className="font-mono text-left">{orden.ncf}</td></tr>
                      {orden.ncf_vencimiento && <tr><td className="font-bold pr-1.5 text-right whitespace-nowrap">Fecha Vencimiento:</td><td className="text-left font-bold">{formatDateRD(orden.ncf_vencimiento)}</td></tr>}
                    </>
                  )
                )}
                {orden.ecf_security_code && orden.ecf_security_code !== "null" && <tr><td className="font-bold pr-1.5 text-right whitespace-nowrap">Cod. Seguridad:</td><td className="font-mono text-left">{orden.ecf_security_code}</td></tr>}
                {orden.ecf_signature_date && orden.ecf_signature_date !== "null" && <tr><td className="font-bold pr-1.5 text-right whitespace-nowrap">Fecha Firma:</td><td className="text-left">{formatDateTimeRD(orden.ecf_signature_date)}</td></tr>}
                <tr><td className="font-bold pr-1.5 text-right whitespace-nowrap">Atendido por:</td><td className="text-left">{emp.nombre}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {!(cli.nombre === "Consumidor" && cli.apellido === "Final") && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 print:bg-white mb-8 flex justify-between items-center">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Facturado a</div>
                <div className="text-lg font-bold text-slate-900">{cli.nombre} {cli.apellido || ""}</div>
                {cli.cedula && (
                  <div className="text-sm text-slate-600">
                    <span className="font-bold">{cli.tipo === 'Empresa' ? "RNC:" : "Cédula:"}</span> {cli.cedula}
                  </div>
                )}
                {cli.direccion && <div className="text-sm text-slate-600">{cli.direccion}</div>}
                {cli.telefono && cli.telefono !== "---" && <div className="text-sm text-slate-600">Tel: {cli.telefono}</div>}
              </div>
            </div>
          )}

          <table className="w-full text-left border-collapse mb-8">
            <thead>
              <tr className="border-b-2 border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="py-4 px-2 w-16">Cant.</th>
                <th className="py-4 px-2">Descripción</th>
                <th className="py-4 px-2 text-right">Precio Unit.</th>
                <th className="py-4 px-2 text-right">ITBIS</th>
                <th className="py-4 px-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {(() => {
                const subtotalBruto = orden.items.reduce((acc, it) => acc + (it.cantidad * it.precio_unitario), 0) + 
                  (orden.servicios?.map(s => srvList.find(x => x.nombre === s)?.precio || 0).reduce((a,b) => a+b, 0) || 0);
                const isItbisIncluidoEnEstaOrden = cfg?.ncf_facturacion_activa && orden.itbis > 0 
                  ? (subtotalBruto - orden.subtotal > 1) 
                  : !!cfg?.itbis_incluido;
                return (
                  <>
                    {orden.items.map((it, i) => {
                      let baseTotal = it.cantidad * it.precio_unitario;
                      let itemItbis = 0;
                      let valor = baseTotal;
                      if (cfg?.ncf_facturacion_activa && orden.itbis > 0) {
                        if (isItbisIncluidoEnEstaOrden) {
                          itemItbis = baseTotal - (baseTotal / (1 + (cfg.itbis_porcentaje || 18) / 100));
                        } else {
                          itemItbis = baseTotal * ((cfg.itbis_porcentaje || 18) / 100);
                          valor = baseTotal + itemItbis;
                        }
                      }
                      return (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="py-4 px-2 font-bold text-slate-500">{it.cantidad}</td>
                          <td className="py-4 px-2 font-medium">{it.descripcion}</td>
                          <td className="py-4 px-2 text-right text-slate-500">{formatRD(it.precio_unitario)}</td>
                          <td className="py-4 px-2 text-right text-slate-500">{itemItbis > 0 ? formatRD(itemItbis) : "—"}</td>
                          <td className="py-4 px-2 text-right font-bold text-slate-900">{formatRD(valor)}</td>
                        </tr>
                      );
                    })}
                    {orden.servicios?.map((sName, i) => {
                      const srv = srvList.find(s => s.nombre === sName);
                      const p = srv ? srv.precio : 0;
                      let baseTotal = p;
                      let itemItbis = 0;
                      let valor = baseTotal;
                      if (cfg?.ncf_facturacion_activa && orden.itbis > 0) {
                        if (isItbisIncluidoEnEstaOrden) {
                          itemItbis = baseTotal - (baseTotal / (1 + (cfg.itbis_porcentaje || 18) / 100));
                        } else {
                          itemItbis = baseTotal * ((cfg.itbis_porcentaje || 18) / 100);
                          valor = baseTotal + itemItbis;
                        }
                      }
                      return (
                        <tr key={'s'+i} className="border-b border-slate-100">
                          <td className="py-4 px-2 font-bold text-slate-500">1</td>
                          <td className="py-4 px-2 font-medium">Servicio: {sName}</td>
                          <td className="py-4 px-2 text-right text-slate-500">{formatRD(p)}</td>
                          <td className="py-4 px-2 text-right text-slate-500">{p > 0 && itemItbis > 0 ? formatRD(itemItbis) : "—"}</td>
                          <td className="py-4 px-2 text-right font-bold text-slate-900">{formatRD(p > 0 ? valor : 0)}</td>
                        </tr>
                      );
                    })}
                  </>
                );
              })()}
            </tbody>
          </table>

          {orden.estado === "ANULADA" && (
            <div className="mt-4 mb-8 p-6 border-2 border-destructive/20 bg-destructive/5 rounded-2xl text-center animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="text-destructive font-display font-black uppercase tracking-[0.2em] text-xs mb-2">Orden Anulada</div>
              {orden.nota_credito_ncf && (
                <div className="text-lg font-bold text-slate-900 mb-1">
                  Nota de Crédito Fiscal: <span className="font-mono text-primary">{orden.nota_credito_ncf}</span>
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
                <span>{(orden.items || []).filter(it => !it.descripcion.toLowerCase().startsWith("servicio:")).reduce((acc, it) => acc + it.cantidad, 0)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 text-sm text-slate-600">
                <span>Subtotal:</span>
                <span>{formatRD(orden.subtotal)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 text-sm text-slate-600">
                <span>ITBIS (18%):</span>
                <span>{formatRD(orden.total - orden.subtotal)}</span>
              </div>
              <div className="flex justify-between py-4 text-xl font-black text-primary">
                <span>TOTAL:</span>
                <span>{formatRD(orden.total)}</span>
              </div>
              <div className="flex justify-between py-2 text-xs text-slate-500">
                <span>Pago ({orden.metodo_pago}):</span>
                <span>{formatRD(orden.pagado)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-end border-t border-slate-200 pt-6">
            <div className="text-center text-[10px] text-slate-400 italic max-w-xs text-left">
              ¡Gracias por su preferencia!<br/>
              Documento generado por Klynn POS
            </div>
            
            {isECF && qrData && (
              <div className="flex flex-col items-center gap-2">
                <QRCodeSVG value={qrData} size={100} level="M" />
                <div className="text-[10px] text-center font-bold text-slate-500">
                  Consulte su factura en:<br/>dgii.gov.do
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
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
      `}} />
    </div>,
    document.body
  );
}

function OrdenesPrintPortal({
  tenant,
  ordenes,
  clientes,
  onClose
}: {
  tenant: any;
  ordenes: any[];
  clientes: any[];
  onClose: () => void;
}) {
  const totalMontoGlobal = ordenes.reduce((acc, curr) => acc + curr.total, 0);
  const totalSaldoGlobal = ordenes.reduce((acc, curr) => acc + curr.saldo, 0);

  return createPortal(
    <div className="fixed inset-0 bg-white z-[99999] overflow-y-auto pointer-events-auto atomic-print-target text-slate-800">
      <div className="max-w-4xl mx-auto p-8 print:p-12 print:max-w-4xl print:mx-auto">
        {/* Controles de impresión (ocultos al imprimir) */}
        <div className="flex justify-between items-center border-b-2 border-primary/20 pb-6 mb-8 print:hidden relative z-[100000]">
          <Button variant="outline" onClick={onClose} className="gap-2 cursor-pointer">
            Cerrar Reporte
          </Button>
          <Button onClick={() => window.print()} className="bg-primary text-white gap-2 cursor-pointer">
            <Printer className="h-4 w-4" /> Imprimir / Guardar PDF
          </Button>
        </div>

        <div className="print-area">
          {/* Encabezado */}
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
                Reporte de Órdenes
              </h2>
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
                HISTÓRICO Y ESTADOS DE SERVICIOS
              </div>
              <div className="text-xs text-slate-600">
                <span className="font-bold">Generado:</span> {new Date().toLocaleString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}
              </div>
            </div>
          </div>

          {/* Sección 1: KPIs Rápidos */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total de Órdenes</div>
              <div className="text-xl font-bold text-slate-800">{ordenes.length} {ordenes.length === 1 ? 'orden' : 'órdenes'}</div>
              <div className="text-[8px] text-slate-400 mt-0.5">En el listado actual</div>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Monto Total Facturado</div>
              <div className="text-xl font-bold text-emerald-600">{formatRD(totalMontoGlobal)}</div>
              <div className="text-[8px] text-slate-400 mt-0.5">Suma de todas las órdenes</div>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cuentas por Cobrar (Saldos)</div>
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
                    <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-855">{o.numero}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-700">{c?.nombre || "—"}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[8px] font-black uppercase border ${
                          o.estado === 'RECIBIDA' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          o.estado === 'EN_PROCESO' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          o.estado === 'LISTA' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          o.estado === 'ENTREGADA' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {o.estado.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-slate-700">{formatRD(o.total)}</td>
                      <td className={`py-2.5 px-4 text-right font-bold ${o.saldo > 0 ? "text-rose-600" : "text-slate-500"}`}>{o.saldo > 0 ? formatRD(o.saldo) : "—"}</td>
                      <td className="py-2.5 px-4 text-center text-slate-500 whitespace-nowrap">{o.metodo_pago}</td>
                      <td className="py-2.5 px-4 text-center text-slate-500 whitespace-nowrap">{formatDateTimeRD(o.creado_en)}</td>
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

export function CobrarOrdenDialog({ orden, onClose, tenant, cajaAbierta, clientes, queryClient, showPrintPortal, onSuccess }: CobrarOrdenDialogProps) {
  const user = useRequireAuth();
  const isAuthorized = user?.empleado?.rol === "ADMIN" || user?.empleado?.rol === "SUPERVISOR";
  const [metodo, setMetodo] = useState<MetodoPago>("EFECTIVO");
  const [recibido, setRecibido] = useState<number>(orden.saldo);
  const [entregarAlCobrar] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [showCondonar, setShowCondonar] = useState<boolean>(false);

  const totalCobrar = orden.saldo;
  const vuelto = metodo === "EFECTIVO" && recibido > totalCobrar ? recibido - totalCobrar : 0;
  const faltante = recibido > 0 && recibido < totalCobrar ? totalCobrar - recibido : 0;

  const cli = clientes.find((c) => c.id === orden.cliente_id) || { nombre: "Consumidor", apellido: "Final", telefono: "", tipo: "Consumidor Final" as Cliente["tipo"], cedula: undefined };

  const handleMetodoChange = (m: MetodoPago) => {
    setMetodo(m);
    if (m !== "EFECTIVO" && recibido > totalCobrar) {
      setRecibido(totalCobrar);
    }
  };

  async function handleConfirmarCobro() {
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

    setLoading(true);
    try {
      const montoAPagar = metodo === "EFECTIVO" ? Math.min(recibido, totalCobrar) : recibido;
      const nuevoPagado = orden.pagado + montoAPagar;
      const nuevoSaldo = Math.max(0, totalCobrar - montoAPagar);
      const nuevoEstado: EstadoOrden = orden.estado === "ENTREGADA" 
        ? "ENTREGADA" 
        : (nuevoSaldo === 0 ? (entregarAlCobrar ? "ENTREGADA" : "PAGADA") : orden.estado);

      let finalNCF: string | undefined = orden.ncf;
      let finalNcfVencimiento: string | undefined = orden.ncf_vencimiento;
      let finalTipoECF: string | undefined = orden.tipo_ecf;
      let finalEcfId: string | undefined = orden.ecf_id;
      let finalEcfQr: string | undefined = orden.ecf_qr;
      let finalEcfSecurityCode: string | undefined = orden.ecf_security_code;
      let finalEcfSignatureDate: string | undefined = orden.ecf_signature_date;

      const fiscalConfig = await getECFConfig(tenant.id);
      const isElectronic = !!fiscalConfig?.is_active;

      if (tenant.config?.ncf_facturacion_activa && !orden.ncf) {
        const isEmpresa = cli.tipo === "Empresa" || (cli.cedula && cli.cedula.length >= 9);
        const tipoECFDefault = isElectronic 
          ? (isEmpresa ? "E31" : "E32")
          : (isEmpresa ? "B01" : "B02");

        if (!isElectronic) {
          try {
            const { ncf: nextNCF, expiration_date } = await nextECFNumero(tenant.id, tipoECFDefault);
            finalNCF = nextNCF;
            finalNcfVencimiento = expiration_date;
          } catch (seqErr) {
            console.log("No dynamic sequence for traditional NCF, falling back to legacy sequence.");
            finalNCF = `${tenant.config.ncf_secuencia || 'B02'}${String(tenant.config.ncf_proximo || 1).padStart(8, "0")}`;
          }
        } else {
          try {
            let nextNCF: string | undefined = undefined;
            if (fiscalConfig?.ambiente === 'produccion') {
              const { ncf, expiration_date } = await nextECFNumero(tenant.id, tipoECFDefault);
              nextNCF = ncf;
              finalNcfVencimiento = expiration_date;
            }

            const ordenTemporal: Orden = {
              ...orden,
              pagado: nuevoPagado,
              saldo: nuevoSaldo,
              estado: nuevoEstado,
              metodo_pago: metodo,
              ncf: nextNCF
            };

            const result = await emitirECF(
              ordenTemporal,
              cli as Cliente,
              fiscalConfig?.pronesoft_tenant_id,
              tenant.config,
              tenant,
              tipoECFDefault
            );

            finalNCF = result.encf;
            finalTipoECF = tipoECFDefault;
            finalEcfId = result.document.id;
            finalEcfQr = result.stamp_url || result.document.document_stamp_url || '';
            finalEcfSecurityCode = result.security_code || '';
            finalEcfSignatureDate = result.document.signature_date || new Date().toISOString();

            toast.success(`✅ Comprobante DGII ${result.encf} emitido con éxito`);
          } catch (fErr: any) {
            console.error("Error Fiscal al cobrar:", fErr);
            toast.error("Error al generar comprobante fiscal: " + fErr.message);
          }
        }
      }

      // 1. Guardar la orden con los saldos actualizados, el nuevo estado y datos fiscales
      const ordenActualizada: Orden = {
        ...orden,
        pagado: nuevoPagado,
        saldo: nuevoSaldo,
        estado: nuevoEstado,
        metodo_pago: orden.pagado > 0 ? "MIXTO" : metodo,
        ncf: finalNCF,
        ncf_vencimiento: finalNcfVencimiento,
        tipo_ecf: finalTipoECF,
        ecf_id: finalEcfId,
        ecf_qr: finalEcfQr,
        ecf_security_code: finalEcfSecurityCode,
        ecf_signature_date: finalEcfSignatureDate
      };

      await saveOrden(ordenActualizada);

      // 2. Registrar el movimiento de entrada en caja
      await saveMovimiento({
        id: uid("mov"),
        tenant_id: tenant.id,
        caja_id: cajaAbierta.id,
        empleado_id: ordenActualizada.empleado_id,
        tipo: nuevoSaldo === 0 ? "VENTA" : "ABONO",
        concepto: nuevoSaldo === 0
          ? `Cobro de saldo orden #${orden.numero} (${entregarAlCobrar ? 'Entregada' : 'No entregada'})`
          : `Abono a orden #${orden.numero} (Saldo restante: ${formatRD(nuevoSaldo)})`,
        monto: montoAPagar,
        metodo: metodo,
        orden_id: orden.id,
        creado_en: new Date().toISOString(),
      });

      // 3. Notificación de WhatsApp si corresponde
      if (entregarAlCobrar && nuevoSaldo === 0) {
        import("@/lib/whatsapp").then(({ notificarWhatsApp }) => {
          const cliFull = clientes.find(c => c.id === orden.cliente_id);
          if (cliFull) {
            notificarWhatsApp(tenant, cliFull, ordenActualizada, "entregada", montoAPagar).then((r) => {
              if (r.ok) toast.success("WhatsApp de entrega enviado ✅");
            });
          }
        });
      }

      toast.success(
        nuevoSaldo === 0
          ? `Orden #${orden.numero} saldada correctamente RD$${montoAPagar} ✅`
          : `Abono de RD$${montoAPagar} registrado a la orden #${orden.numero} ✅`
      );
      
      queryClient.invalidateQueries({ queryKey: ['ordenes', tenant.id] });
      queryClient.invalidateQueries({ queryKey: ['movimientos', tenant.id] });

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
      setLoading(false);
    }
  }

  const formatAmountInput = (val: string) => {
    if (!val) return "";
    // Eliminar comas previas y limpiar entrada
    const clean = val.replace(/,/g, "").replace(/[^0-9.]/g, "");
    const parts = clean.split(".");
    const integerPart = parts[0];
    const decimalPart = parts.length > 1 ? parts.slice(1).join("") : null;
    
    // Aplicar expresión regular para agregar comas de miles
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    
    if (decimalPart !== null) {
      // Limitar a un máximo de 2 dígitos decimales
      return formattedInteger + "." + decimalPart.substring(0, 2);
    }
    return formattedInteger;
  };

  const parseAmount = (val: string) => {
    const clean = val.replace(/,/g, "").replace(/[^0-9.]/g, "");
    return parseFloat(clean) || 0;
  };

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

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl rounded-3xl p-0 border border-primary/10 shadow-elegant overflow-hidden bg-background">
        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* COLUMNA IZQUIERDA: RESUMEN DE LA ORDEN */}
          <div className="md:col-span-5 bg-accent/5 p-6 border-r border-border/40 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <Coins className="h-5 w-5" />
                <span className="text-sm font-black uppercase tracking-wider">Resumen de Orden</span>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex flex-col space-y-1">
                  <span className="text-[10px] font-black uppercase text-muted-foreground">Número de Orden</span>
                  <span className="font-mono text-base font-black text-primary bg-primary/5 border border-primary/10 px-3 py-1 rounded-xl self-start">
                    #{orden.numero}
                  </span>
                </div>

                <div className="flex flex-col space-y-1">
                  <div className="flex items-center gap-1.5 justify-between">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">Cliente</span>
                    <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      cli.tipo === "Empresa" 
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400" 
                        : "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400"
                    }`}>
                      {cli.tipo === "Empresa" ? (
                        <>
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span>Empresa</span>
                        </>
                      ) : (
                        <>
                          <User className="h-3 w-3 shrink-0" />
                          <span>Personal</span>
                        </>
                      )}
                    </span>
                  </div>
                  <span className="font-bold text-sm text-foreground">
                    {cli.nombre} {cli.apellido || ""}
                  </span>
                </div>

                <div className="h-px bg-border/40 my-2" />

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground font-semibold">
                  <div className="flex flex-col">
                    <span>Total Orden</span>
                    <span className="text-foreground font-bold">{formatRD(orden.total)}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span>Monto ya pagado</span>
                    <span className="text-emerald-600 font-bold">{formatRD(orden.pagado)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Saldo destacado */}
            <div className="bg-emerald-500/[0.04] border border-emerald-500/10 rounded-2xl p-4 space-y-1 mt-auto">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">Saldo Pendiente a Cobrar</span>
              <span className="text-3xl font-black text-emerald-600 block">{formatRD(totalCobrar)}</span>
            </div>
          </div>

          {/* COLUMNA DERECHA: REGISTRO DE COBRO */}
          <div className="md:col-span-7 p-6 flex flex-col justify-between space-y-4">
            <div>
              <DialogHeader className="pb-3 border-b border-primary/5">
                <DialogTitle className="text-lg font-display font-black text-foreground">
                  Registrar Cobro
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Elige el método de pago e ingresa el monto para saldar la orden.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-4">
                {/* Selector de Método de Pago */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Método de Pago
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "EFECTIVO", label: "Efectivo", icon: "💵" },
                      { id: "TARJETA", label: "Tarjeta", icon: "💳" },
                      { id: "TRANSFERENCIA", label: "Transf.", icon: "🏦" }
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleMetodoChange(m.id as MetodoPago)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all active:scale-95 ${
                          metodo === m.id
                            ? "border-emerald-600 bg-emerald-500/[0.05] text-emerald-700 font-bold scale-[1.02] shadow-sm ring-1 ring-emerald-500/10"
                            : "border-border bg-card text-muted-foreground hover:border-emerald-500/30 hover:bg-emerald-500/[0.01]"
                        }`}
                      >
                        <span className="text-lg mb-0.5">{m.icon}</span>
                        <span className="text-[9px] font-black uppercase tracking-wider">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Formulario Efectivo / Tarjeta / Transferencia */}
                <div className="rounded-2xl border border-border/60 bg-accent/5 p-3.5 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      {metodo === "EFECTIVO" ? "Monto Recibido" : "Monto a Cobrar"}
                    </label>
                    <div className="relative h-14">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-lg text-muted-foreground/40">RD$</span>
                      <Input
                        className="h-full pl-14 text-2xl md:text-3xl font-black bg-background border border-primary/20 focus-visible:ring-emerald-500 focus-visible:ring-offset-0 rounded-2xl transition-all"
                        value={recibido ? formatAmountInput(String(recibido)) : ""}
                        onChange={(e) => setRecibido(parseAmount(e.target.value))}
                        placeholder="0.00"
                        autoFocus
                      />
                    </div>
                  </div>

                  {metodo === "EFECTIVO" ? (
                    <div className={`flex items-center justify-between p-2 rounded-xl border text-xs font-bold transition-all ${
                      faltante > 0 ? "bg-rose-50 border-rose-100 text-rose-700" : "bg-emerald-50 border-emerald-100 text-emerald-700"
                    }`}>
                      <span className="uppercase text-[9px] tracking-wider">
                        {faltante > 0 ? "Faltan" : "Vuelto a entregar"}
                      </span>
                      <span className="text-sm font-black">
                        {formatRD(faltante > 0 ? faltante : vuelto)}
                      </span>
                    </div>
                  ) : (
                    faltante > 0 && (
                      <div className="flex items-center justify-between p-2 rounded-xl border border-rose-100 bg-rose-50 text-xs font-bold text-rose-700 transition-all">
                        <span className="uppercase text-[9px] tracking-wider">Saldo Restante</span>
                        <span className="text-sm font-black">
                          {formatRD(faltante)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Acciones del Dialog */}
            <div className="space-y-2 pt-2 border-t border-border/40 mt-auto">
              <Button
                size="lg"
                className="w-full h-11 font-bold text-xs tracking-wider rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-glow transition-all active:scale-[0.98]"
                onClick={handleConfirmarCobro}
                disabled={loading || !cajaAbierta || recibido <= 0 || (metodo !== "EFECTIVO" && recibido > totalCobrar)}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                REGISTRAR COBRO
              </Button>
              
              {!cajaAbierta && (
                <p className="text-[9px] font-black text-destructive text-center flex items-center justify-center gap-1 animate-pulse">
                  <AlertTriangle className="h-3.5 w-3.5" /> La caja está cerrada. Abre la caja antes de registrar un pago.
                </p>
              )}

              <div className={isAuthorized ? "grid grid-cols-2 gap-2" : "w-full"}>
                <Button
                  variant="destructive"
                  type="button"
                  onClick={onClose}
                  className="w-full h-9 rounded-xl text-[10px] font-black bg-rose-600 hover:bg-rose-700 text-white border-none shadow-sm"
                >
                  CANCELAR COBRO
                </Button>

                {isAuthorized && (
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setShowCondonar(true)}
                    className="w-full h-9 rounded-xl text-[10px] font-black border-amber-500/30 text-amber-700 hover:bg-amber-50 hover:text-amber-800 gap-1.5"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    CONDONAR DEUDA (AJUSTE)
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ TARJETA DE ORDEN PENDIENTE INTERACTIVA ============
interface PendienteCardProps {
  o: Orden;
  clientes: Cliente[];
  cajaAbierta: Caja | null | undefined;
  onCobrarClick: (orden: Orden) => void;
}

function PendienteCard({ o, clientes, cajaAbierta, onCobrarClick }: PendienteCardProps) {
  const c = clientes.find(cli => cli.id === o.cliente_id) || { nombre: "Consumidor", apellido: "Final", tipo: "Consumidor Final" };

  return (
    <Card className="relative overflow-hidden border border-border bg-card hover:border-amber-500/30 hover:shadow-elegant transition-all duration-300 rounded-3xl flex flex-col min-h-[250px] justify-between group shadow-sm animate-in fade-in duration-300">
      <div className="p-4 space-y-3 flex-grow flex flex-col justify-start">
        {/* Header de tarjeta */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="font-mono text-xs font-black text-primary bg-primary/5 px-2.5 py-0.5 rounded-full border border-primary/10 self-start mb-1">
              #{o.numero}
            </span>
            <span className="text-[10px] text-muted-foreground font-semibold">
              {formatDateTimeRD(o.creado_en)}
            </span>
          </div>
          <EstadoBadge estado={o.estado} />
        </div>

        {/* Cliente y Tipo */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Cliente</span>
            <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${
              c.tipo === "Empresa" 
                ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400" 
                : "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400"
            }`}>
              {c.tipo === "Empresa" ? (
                <>
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span>Empresa</span>
                </>
              ) : (
                <>
                  <User className="h-3 w-3 shrink-0" />
                  <span>Personal</span>
                </>
              )}
            </span>
          </div>
          <div className="font-bold text-sm text-foreground line-clamp-1">
            {c.nombre} {c.apellido || ""}
          </div>
        </div>

        {/* Importes */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dashed border-border/80 mt-1">
          <div className="space-y-0.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">Total</span>
            <span className="text-sm font-black text-foreground">{formatRD(o.total)}</span>
          </div>
          <div className="space-y-0.5 text-right">
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 block">Saldo Pendiente</span>
            <span className="text-sm font-black text-amber-600 bg-amber-500/5 border border-amber-500/10 px-2.5 py-0.5 rounded-xl inline-block">{formatRD(o.saldo)}</span>
          </div>
        </div>
      </div>

      {/* Botón de Cobrar */}
      <div className="p-3 bg-accent/5 border-t border-border/40 rounded-b-3xl">
        <Button
          onClick={() => {
            if (!cajaAbierta) {
              toast.error("Abre la caja antes de registrar cobros");
              return;
            }
            onCobrarClick(o);
          }}
          className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white shadow-glow font-bold text-xs h-9 rounded-2xl transition-all duration-200 active:scale-95 gap-1.5"
        >
          <DollarSign className="h-3.5 w-3.5" />
          Cobrar Orden
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
    nota_debito_ncf: o.nota_debito_ncf,
    nota_debito_id: o.nota_debito_id,
    nota_debito_monto: o.nota_debito_monto,
    entrega_domicilio: o.entrega_domicilio,
    costo_envio: o.costo_envio,
    repartidor_id: o.repartidor_id,
    ecf_qr: o.ecf_qr,
    ecf_security_code: o.ecf_security_code,
    ecf_signature_date: o.ecf_signature_date,
    ncf_vencimiento: o.ncf_vencimiento,
  };
}

export function CondonarDeudaDialog({ orden, onClose, tenantId, onSuccess }: CondonarDeudaDialogProps) {
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
        notas: nuevoNotas
      };

      const cleaned = cleanOrden(ordenActualizada);

      if (!IS_LOCAL_MODE) {
        const { error } = await supabase.from('ordenes').upsert(cleaned);
        if (error) throw error;
      }

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
            Esta acción eliminará el saldo pendiente de la orden sin registrar un ingreso de dinero real en la caja.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-2xl bg-amber-50/50 border border-amber-100 p-4 text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">Orden #{orden.numero}</span>
            <span className="text-2xl font-black text-amber-600 block">{formatRD(orden.saldo)}</span>
            <span className="text-[10px] text-muted-foreground block mt-1">Saldo pendiente a condonar</span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Motivo / Justificación</label>
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
