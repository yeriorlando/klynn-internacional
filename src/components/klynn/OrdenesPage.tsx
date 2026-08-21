import { QRCodeSVG } from "qrcode.react";
import { useMemo, useState, useEffect } from "react";
import { createPortal, flushSync } from "react-dom";
import { Search, Printer, Eye, X, XCircle, MessageCircle, DownloadCloud, MoreVertical, MoreHorizontal, ArrowUpCircle, ArrowDownCircle, FileText, Download, FileSpreadsheet, DollarSign, Coins, Loader2, Check, CheckCircle2, ArrowLeft, ChevronLeft, ChevronRight, Phone, Activity, Shirt, UserCog, Inbox, RefreshCw, Truck, Wallet, Scale, User, Sparkles, Droplets, Wind, Tag } from "lucide-react";
import { notificarWhatsApp, calcularDiasEnAlmacen, fueNotificadoHoy } from "@/lib/whatsapp";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
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
  getOrdenes, saveOrden, getClientes, getEmpleadoById, formatRD, formatDateRD, formatDateTimeRD, formatPhoneRD, getServicios,
  type Orden, type EstadoOrden, type Cliente, type Caja, type MetodoPago, type Empleado, type Tenant,
  checkPlanLimits, getCajaAbierta, saveMovimiento, uid, nextECFNumero, saveECFDocument, IS_LOCAL_MODE,
  updateOrdenEstado, can
} from "@/lib/storage";
import { emitirECF, getECFConfig, isECFReady } from "@/lib/fiscal";
import { toast } from "sonner";
import { AlertTriangle, Rocket, Building2, Zap, Calendar, Receipt, CircleCheck, Ban, LayoutGrid, Banknote, CreditCard, Trash2, Clock, Gift, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { useOrdenes, useClientes, useCajaAbierta, useEmpleados, useServicios, useECFConfig, useECFSequences } from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";
import { useSearch, useNavigate } from "@tanstack/react-router";
import { encodeEscPos, printDirectRaw } from "@/lib/impresora";
import { UbicacionSelectorDialog } from "@/components/klynn/UbicacionSelectorDialog";

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

function formatMetodoPagoLabel(metodo?: string): string {
  if (!metodo) return "—";
  return metodo.replace(/_/g, " ");
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
  const [filtroEstado, setFiltroEstado] = useState<EstadoOrden | "todos" | "hoy" | "urgente">("todos");
  const [filtroEntrega, setFiltroEntrega] = useState<"todas" | "hoy" | "atrasadas" | "sin_retirar">("todas");
  const [filtroUrgencia, setFiltroUrgencia] = useState<"todas" | "urgente" | "estandar">("todas");
  const [filtroPago, setFiltroPago] = useState<"todas" | MetodoPago>("todas");
  const [view, setView] = useState<Orden | null>(null);
  const [anular, setAnular] = useState<Orden | null>(null);
  const [motivoAnular, setMotivoAnular] = useState("");
  const [codigoAnular, setCodigoAnular] = useState("01");
  const [debito, setDebito] = useState<Orden | null>(null);
  const [montoDebito, setMontoDebito] = useState(0);
  const [motivoDebito, setMotivoDebito] = useState("");
  const [credito, setCredito] = useState<Orden | null>(null);
  const [montoCredito, setMontoCredito] = useState(0);
  const [motivoCredito, setMotivoCredito] = useState("");
  const [codigoCredito, setCodigoCredito] = useState("04");
  const [showPrint, setShowPrint] = useState<Orden | null>(null);
  const [showPrintProduccion, setShowPrintProduccion] = useState<Orden | null>(null);
  const [pagoRecibidoParaTicket, setPagoRecibidoParaTicket] = useState<number | undefined>(undefined);
  const [showDownloadA4, setShowDownloadA4] = useState<Orden | null>(null);
  const [isPrintingList, setIsPrintingList] = useState(false);
  const [cobrarOrden, setCobrarOrden] = useState<Orden | null>(null);
  const [showPendientes, setShowPendientes] = useState(false);
  const [searchPendientes, setSearchPendientes] = useState("");
  const [filtroPendientes, setFiltroPendientes] = useState<"todos" | "RECIBIDA" | "EN_PROCESO" | "LISTA" | "EN_CAMINO">("todos");
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
  const { data: ecfConfig } = useECFConfig(tenantId);
  const { data: ecfSequences = [] } = useECFSequences(tenantId);
  const searchParams = useSearch({ strict: false }) as { view?: string; action?: string; filter?: string };

  const hasSecuenciaCredito = ecfSequences.some(
    (s) => s.is_active && (s.tipo_ecf === "E34" || s.tipo_ecf === "34" || s.tipo_ecf === "B04") && (s.valor_actual === undefined || s.valor_actual < s.valor_final)
  );
  const hasSecuenciaDebito = ecfSequences.some(
    (s) => s.is_active && (s.tipo_ecf === "E33" || s.tipo_ecf === "33" || s.tipo_ecf === "B03") && (s.valor_actual === undefined || s.valor_actual < s.valor_final)
  );

  useEffect(() => {
    if (searchParams.filter === "almacenadas" || searchParams.filter === "sin_retirar") {
      setFiltroEntrega("sin_retirar");
    }
  }, [searchParams.filter]);

  const emp = user?.empleado;
  const hasNotaCredito = emp ? can(emp, "nota-credito") : false;
  const hasNotaDebito = emp ? can(emp, "nota-debito") : false;
  const hasAnularOrden = emp ? can(emp, "anular-orden") : false;
  const hasCondonarDeuda = emp ? can(emp, "condonar-deuda") : false;

  const [limits, setLimits] = useState<any>({ orderLimit: null, orderCount: 0, ordersReached: false });
  const [loadingLimits, setLoadingLimits] = useState(false);

  useEffect(() => {
    if (!tenantId || tenantId === '__loading__' || ordenes.length === 0) return;
    if (searchParams.view) {
      const orderToView = ordenes.find(o => o.numero === searchParams.view || o.id === searchParams.view);
      if (orderToView) {
        if (searchParams.action === "credito") {
          setCredito(orderToView);
          setMontoCredito(0);
          setMotivoCredito("");
          setCodigoCredito("04");
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
    if (!tenantId || tenantId === '__loading__') return;
    setLoadingLimits(true);
    checkPlanLimits(tenant).then(lim => {
      setLimits(lim);
      setLoadingLimits(false);
    });
  }, [tenantId, ordenes.length]);

  useEffect(() => {
    if (typeof window === "undefined" || !tenantId || tenantId === "__loading__") return;

    const handleFiscalUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes', tenantId] });
    };

    window.addEventListener("klynn-order-fiscal-updated", handleFiscalUpdate);
    window.addEventListener("klynn-sync-completed", handleFiscalUpdate);

    return () => {
      window.removeEventListener("klynn-order-fiscal-updated", handleFiscalUpdate);
      window.removeEventListener("klynn-sync-completed", handleFiscalUpdate);
    };
  }, [tenantId, queryClient]);

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
      } else if (filtroEntrega === "sin_retirar") {
        const diasAlmacen = calcularDiasEnAlmacen(o.creado_en);
        const minDias = tenant?.config?.dias_almacenamiento_sin_retirar || tenant?.config?.whatsapp?.dias_recordatorio_sin_retirar || 5;
        if (o.estado !== "LISTA" || diasAlmacen < minDias) return false;
      }

      // Filtro de urgencia
      if (filtroUrgencia === "urgente" && !o.es_urgente) return false;
      if (filtroUrgencia === "estandar" && o.es_urgente) return false;

      // Filtro de pago
      if (filtroPago !== "todas" && o.metodo_pago !== filtroPago) return false;

      if (!q) return true;
      const c = clientes.find((x) => x.id === o.cliente_id);
      const nombreCompleto = c ? `${c.nombre} ${c.apellido || ""}` : "";
      const searchLower = q.toLowerCase();
      const dateStr = o.creado_en ? new Date(o.creado_en).toLocaleDateString("es-DO").toLowerCase() : "";
      const dateStrFull = o.creado_en ? new Date(o.creado_en).toLocaleDateString("es-DO", { day: "2-digit", month: "long", year: "numeric" }).toLowerCase() : "";
      const totalStr = String(o.total);
      const saldoStr = String(o.saldo);

      return o.numero.toLowerCase().includes(searchLower) || 
             nombreCompleto.toLowerCase().includes(searchLower) ||
             (o.pago_referencia && o.pago_referencia.toLowerCase().includes(searchLower)) ||
             dateStr.includes(searchLower) ||
             dateStrFull.includes(searchLower) ||
             totalStr.includes(searchLower) ||
             saldoStr.includes(searchLower);
    }).sort((a, b) => +new Date(b.creado_en) - +new Date(a.creado_en));
  }, [ordenes, clientes, filtroEstado, filtroEntrega, filtroUrgencia, filtroPago, q]);

  const pendientesCobroList = useMemo(() => {
    return ordenes
      .filter(o =>
        o.saldo > 0 &&
        o.metodo_pago === "PAGO_AL_RETIRAR" &&
        o.estado !== "ENTREGADA" &&
        o.estado !== "ANULADA" &&
        ["RECIBIDA", "EN_PROCESO", "LISTA", "EN_CAMINO"].includes(o.estado)
      )
      .sort((a, b) => +new Date(b.creado_en) - +new Date(a.creado_en));
  }, [ordenes]);

  const filteredPendientes = useMemo(() => {
    const searchLower = searchPendientes.trim().toLowerCase();

    return pendientesCobroList.filter(o => {
      if (filtroPendientes !== "todos" && o.estado !== filtroPendientes) return false;
      if (!searchLower) return true;

      const clienteObj = clientes.find(c => c.id === o.cliente_id);
      const clienteNombre = clienteObj ? `${clienteObj.nombre} ${clienteObj.apellido || ""}`.toLowerCase() : "";
      const dateStr = o.creado_en ? new Date(o.creado_en).toLocaleDateString("es-DO").toLowerCase() : "";
      const dateStrFull = o.creado_en ? new Date(o.creado_en).toLocaleDateString("es-DO", { day: "2-digit", month: "long", year: "numeric" }).toLowerCase() : "";

      return o.numero.toLowerCase().includes(searchLower) ||
        clienteNombre.includes(searchLower) ||
        String(o.total).includes(searchLower) ||
        String(o.saldo).includes(searchLower) ||
        dateStr.includes(searchLower) ||
        dateStrFull.includes(searchLower);
    });
  }, [pendientesCobroList, filtroPendientes, searchPendientes, clientes]);

  const totalPendienteCobro = useMemo(
    () => pendientesCobroList.reduce((total, orden) => total + orden.saldo, 0),
    [pendientesCobroList]
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
  }, [filt.length, filtroEstado, filtroEntrega, filtroUrgencia, filtroPago, q]);

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

  if (!user || user.tenant.id === '__loading__' || (loading && ordenes.length === 0)) {
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
    if (estado === "LISTA" && tenant?.config?.usar_ubicacion_ropa) {
      setConveyorOrden(o);
      setConveyorUbicacion("");
      return false; // Don't close the current modal immediately
    }
    try {
      const ordenActualizada: Orden = { ...o, estado };

      // Actualización directa e instantánea de la tabla de órdenes en React Query
      queryClient.setQueryData<Orden[]>(['ordenes', tenantId], (old) => {
        if (!old) return [ordenActualizada];
        return old.map(item => item.id === o.id ? ordenActualizada : item);
      });
      queryClient.setQueriesData({ queryKey: ['ordenes'] }, (old: Orden[] | undefined) => {
        if (!old) return old;
        return old.map(item => item.id === o.id ? ordenActualizada : item);
      });

      if (estadoModal && estadoModal.id === o.id) {
        setEstadoModal(ordenActualizada);
      }
      if (view && view.id === o.id) {
        setView(ordenActualizada);
      }

      await saveOrden(ordenActualizada);
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
          notificarWhatsApp(tenant, cli, ordenActualizada, estado === "LISTA" ? "lista" : "entregada");
        }
      }
      return true;
    } catch (err: any) {
      toast.error("Error al actualizar estado");
      queryClient.invalidateQueries({ queryKey: ['ordenes', tenantId] });
      return true;
    }
  }

  async function confirmarConveyor(ubicacionParam?: string) {
    if (!conveyorOrden) return;
    const ubiToUse = ubicacionParam !== undefined ? ubicacionParam : conveyorUbicacion;
    setSavingConveyor(true);
    try {
      const ordenActualizada = { ...conveyorOrden, estado: "LISTA" as EstadoOrden, ubicacion_ropa: ubiToUse || undefined };
      
      queryClient.setQueryData<Orden[]>(['ordenes', tenantId], (old) => {
        if (!old) return [ordenActualizada];
        return old.map(item => item.id === conveyorOrden.id ? ordenActualizada : item);
      });
      queryClient.setQueriesData({ queryKey: ['ordenes'] }, (old: Orden[] | undefined) => {
        if (!old) return old;
        return old.map(item => item.id === conveyorOrden.id ? ordenActualizada : item);
      });

      await saveOrden(ordenActualizada);
      await updateOrdenEstado(conveyorOrden.id, "LISTA" as EstadoOrden, ubiToUse || undefined);
      queryClient.invalidateQueries({ queryKey: ['ordenes', tenantId] });
      
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
    } finally {
      setSavingConveyor(false);
    }
  }

  async function anularOrden() {
    if (!anular || motivoAnular.length < 5) { toast.error("Indica el motivo (mín 5 caracteres)"); return; }
    
    try {
      let notaCreditoNCF = "";
      
      // 1. Generar Nota de Crédito (E34) si la orden tenía NCF electrónico
      if (anular.tipo_ecf && anular.ncf) {
        try {
          const cfg = await getECFConfig(tenant.id);
          if (isECFReady(cfg)) {
            const cliente = clientes.find(c => c.id === anular.cliente_id) || null;
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
          if (isECFReady(cfg)) {
            const cliente = clientes.find(c => c.id === debito.cliente_id) || null;
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

  async function generarNotaCredito() {
    if (!credito) return;
    try {
      const isECF = credito.ncf?.startsWith("E");
      let notaCreditoNCF = "";
      let notaCreditoID = "";

      if (isECF) {
        try {
          const cfg = await getECFConfig(tenant.id);
          if (isECFReady(cfg)) {
            const cliente = clientes.find(c => c.id === credito.cliente_id) || null;
            // Clonamos la orden para ajustar el total de la NC
            const ordenNC = { ...credito, total: montoCredito, subtotal: montoCredito, itbis: 0 };
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
                code: codigoCredito // 02=Anulación Parcial, 03=Descuento, 04=Devolución, etc.
              }
            );
            notaCreditoNCF = res.encf;
            notaCreditoID = res.document.id;
          } else {
            const next = await nextECFNumero(tenant.id, "34"); // E34
            if (next) {
              notaCreditoNCF = next.ncf;
              notaCreditoID = uid("ecf");
              await saveECFDocument({
                id: notaCreditoID,
                tenant_id: tenant.id,
                tipo: "34",
                ncf: notaCreditoNCF,
                monto_total: montoCredito,
                rnc_receptor: clientes.find(c => c.id === credito.cliente_id)?.cedula || "",
                fecha_emision: new Date().toISOString(),
                estado: "ACEPTADO",
                ncf_modificado: credito.ncf
              });
            }
          }
        } catch (e: any) {
          console.error("Error NC Fiscal:", e);
          toast.error("Error al emitir Nota de Crédito fiscal.");
          return;
        }
      }

      const ordenActualizada: Orden = {
        ...credito,
        total: Math.max(0, credito.total - montoCredito),
        saldo: Math.max(0, credito.saldo - montoCredito),
        nota_credito_ncf: notaCreditoNCF || undefined,
        nota_credito_id: notaCreditoID || undefined,
        nota_credito_monto: montoCredito
      };

      await saveOrden(ordenActualizada);
      
      // Registrar egreso en caja si hay caja abierta y se indicó motivo (opcional)
      if (cajaAbierta && montoCredito > 0) {
        await saveMovimiento({
          id: uid("mov"),
          tenant_id: tenant.id,
          caja_id: cajaAbierta.id,
          empleado_id: user.empleado.id,
          tipo: "EGRESO",
          concepto: `Reembolso NC: ${motivoCredito || "Nota de Crédito"} - ${credito.numero}`,
          monto: montoCredito,
          metodo: credito.metodo_pago,
          orden_id: credito.id,
          creado_en: new Date().toISOString(),
        });
      }
      
      setCredito(null);
      setMontoCredito(0);
      setMotivoCredito("");
      setCodigoCredito("04");
      queryClient.invalidateQueries({ queryKey: ['ordenes', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['movimientos', tenantId] });
      setShowPrint(ordenActualizada);
      
      toast.success("Nota de Crédito generada correctamente ✓");
    } catch (err) {
      console.error("Error NC:", err);
      toast.error("Error al generar Nota de Crédito");
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
        count: pendientesCobroList.filter(o => o.estado === "RECIBIDA").length,
        icon: Inbox,
        bg: "bg-blue-50 text-blue-700 border-blue-200",
        activeBg: "bg-blue-600 text-white border-blue-600 shadow-md",
      },
      {
        value: "EN_PROCESO" as const,
        label: "En proceso",
        count: pendientesCobroList.filter(o => o.estado === "EN_PROCESO").length,
        icon: RefreshCw,
        bg: "bg-amber-50 text-amber-700 border-amber-200",
        activeBg: "bg-amber-500 text-white border-amber-500 shadow-md",
      },
      {
        value: "LISTA" as const,
        label: "Listas",
        count: pendientesCobroList.filter(o => o.estado === "LISTA").length,
        icon: CircleCheck,
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        activeBg: "bg-emerald-600 text-white border-emerald-600 shadow-md",
      },
      {
        value: "EN_CAMINO" as const,
        label: "En camino",
        count: pendientesCobroList.filter(o => o.estado === "EN_CAMINO").length,
        icon: Truck,
        bg: "bg-purple-50 text-purple-700 border-purple-200",
        activeBg: "bg-purple-600 text-white border-purple-600 shadow-md",
      },
    ];
    const listasParaEntrega = pendientesCobroList.filter(o => o.estado === "LISTA" || o.estado === "EN_CAMINO").length;

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
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">Centro de cobros</p>
                  <h1 className="mt-1 font-display text-2xl font-black tracking-tight text-slate-950 md:text-3xl dark:text-white">
                    Órdenes pendientes de cobro
                  </h1>
                  <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-600 md:text-sm dark:text-slate-400">
                    Encuentra las órdenes con pago al retirar y registra cada cobro desde un solo lugar.
                  </p>
                </div>
              </div>

              <div className="grid min-w-0 grid-cols-2 gap-2.5 md:grid-cols-[0.82fr_1.5fr_0.95fr] xl:min-w-[580px]">
                <div className="order-1 flex min-h-[104px] min-w-0 flex-col justify-between rounded-2xl border border-white/90 bg-white/80 p-3.5 shadow-sm backdrop-blur transition-transform hover:-translate-y-0.5 dark:border-white/10 dark:bg-slate-900/75">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:ring-blue-900/60">
                      <Receipt className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <span className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Órdenes</span>
                  </div>
                  <div className="flex items-baseline justify-center gap-2 text-center">
                    <p className="text-2xl font-black tabular-nums tracking-tight text-slate-950 dark:text-white">{pendientesCobroList.length}</p>
                    <span className="text-[9px] font-semibold text-slate-400">Pendientes</span>
                  </div>
                </div>

                <div className="order-3 col-span-2 flex min-h-[104px] min-w-0 flex-col justify-between overflow-visible rounded-2xl border border-primary/15 bg-gradient-to-br from-white via-white to-emerald-50/90 p-3.5 shadow-sm backdrop-blur transition-transform hover:-translate-y-0.5 md:order-2 md:col-span-1 dark:border-primary/25 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/40">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:bg-primary/20">
                        <Wallet className="h-4 w-4" strokeWidth={2} />
                      </span>
                      <span className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Total por cobrar</span>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[8px] font-extrabold uppercase tracking-wider text-primary">Saldo</span>
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
                    <span className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Para entregar</span>
                  </div>
                  <div className="flex items-baseline justify-center gap-2 text-center">
                    <p className="text-2xl font-black tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">{listasParaEntrega}</p>
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
              {filtrosDeCobro.map(filtro => {
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
                    <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                      active ? "bg-white/25" : "bg-black/5"
                    }`}>
                      {filtro.count}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="shrink-0 text-[10px] font-bold text-slate-500 dark:text-slate-400">
              Mostrando <span className="text-slate-900 dark:text-white">{filteredPendientes.length}</span> de {pendientesCobroList.length}
            </p>
          </div>
        </div>

        {pendientesCobroList.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white px-6 py-16 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-900/60">
              <CheckCircle2 className="h-7 w-7" strokeWidth={1.8} />
              <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-4 border-white bg-emerald-500 dark:border-slate-950" />
            </div>
            <h4 className="mt-5 text-lg font-black text-slate-950 dark:text-white">Todo está cobrado</h4>
            <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-500 dark:text-slate-400">No hay órdenes con pago al retirar que tengan un saldo pendiente.</p>
            <Button onClick={() => setShowPendientes(false)} className="mt-5 h-9 rounded-xl bg-primary px-4 text-xs font-bold text-white hover:bg-primary/90">
              Volver a Órdenes
            </Button>
          </div>
        ) : filteredPendientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-950/70">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <Search className="h-5 w-5" />
            </div>
            <h4 className="mt-4 text-sm font-extrabold text-slate-900 dark:text-white">No encontramos coincidencias</h4>
            <p className="mt-1 max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">Prueba con otro número de orden, cliente, monto o selecciona un estado diferente.</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setSearchPendientes(""); setFiltroPendientes("todos"); }}
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
      <PageHeader title="Órdenes" description={`${ordenes.length} órdenes registradas`}>
        <div className="flex items-center gap-2.5 flex-wrap">
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
                onClick={() => exportToCsv(exportData.filename, exportData.columns, exportData.data)}
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel (CSV)
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
            className="flex items-center gap-2 rounded-xl h-10 px-4 font-bold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-xs text-xs sm:text-sm cursor-pointer transition-all active:scale-95" 
            onClick={() => setIsPrintingList(true)}
          >
            <Printer className="h-4 w-4 text-white shrink-0" />
            <span>Imprimir</span>
          </Button>

        </div>
      </PageHeader>

      {limits.orderLimit !== null && (
        (() => {
          const count = limits.orderCount || 0;
          const limit = limits.orderLimit;
          const effectiveLimit = limits.effectiveLimit || (limit + (limits.graceBonus || 15));
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
                              : pct
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
        })()
      )}

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por número de orden, cliente, monto, fecha..." className="pl-10" />
        </div>
        <Select value={filtroEntrega} onValueChange={(v: any) => setFiltroEntrega(v)}>
          <SelectTrigger className="w-[175px] font-semibold text-xs shrink-0">
            <Calendar className="h-4 w-4 text-primary shrink-0 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[220px]">
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="hoy">Para hoy</SelectItem>
            <SelectItem value="atrasadas">Atrasadas</SelectItem>
            <SelectItem value="sin_retirar">Sin retirar ({`> ${tenant?.config?.dias_almacenamiento_sin_retirar || tenant?.config?.whatsapp?.dias_recordatorio_sin_retirar || 5}d`})</SelectItem>
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
        <Select value={filtroPago} onValueChange={(v: any) => setFiltroPago(v)}>
          <SelectTrigger className="w-[160px] font-semibold text-xs shrink-0">
            <DollarSign className="h-4 w-4 text-emerald-500 shrink-0 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Formas de Pago</SelectItem>
            <SelectItem value="EFECTIVO">Efectivo</SelectItem>
            <SelectItem value="TARJETA">Tarjeta</SelectItem>
            <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
            <SelectItem value="CREDITO">Crédito</SelectItem>
            <SelectItem value="PAGO_AL_RETIRAR">Pago al retirar</SelectItem>
            <SelectItem value="MIXTO">Mixto</SelectItem>
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
                      {(() => {
                        const isECFOrder = !!(o.tipo_ecf?.startsWith("E") || o.ncf?.startsWith("E") || o.ecf_status === "PENDING_OFFLINE_TRANSMISSION");
                        const isSignedECF = isECFOrder && Boolean(o.ecf_security_code && o.ecf_security_code !== "null" && o.ecf_security_code.trim() !== "");
                        const isPendingECF = isECFOrder && !isSignedECF;

                        return (
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef2f6] text-[#2c4e82] dark:bg-slate-800 dark:text-blue-400 animate-in fade-in zoom-in duration-200 border border-[#d6e0ea]/50">
                              <Receipt className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-sm font-bold text-[#2c4e82] dark:text-[#5c85c2]">
                                  {o.numero}
                                </span>
                                {isPendingECF && (
                                  <span
                                    title="Pendiente de timbrado e-CF (se firmará con Pronesoft/DGII al sincronizar)"
                                    className="inline-flex items-center text-amber-500 hover:text-amber-600 transition-colors"
                                  >
                                    <Clock className="h-3.5 w-3.5 animate-pulse" />
                                  </span>
                                )}
                                {isSignedECF && (
                                  <span
                                    title={`e-CF Firmado con Pronesoft / DGII (${o.ncf || o.tipo_ecf})`}
                                    className="inline-flex items-center text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors"
                                  >
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                  </span>
                                )}
                              </div>
                              <span className="font-bold text-sm text-foreground truncate max-w-[220px]" title={c ? `${c.nombre} ${c.apellido || ""}` : ""}>
                                {c ? `${c.nombre} ${c.apellido || ""}` : "Consumidor Final"}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-medium">
                                {formatDateTimeRD(o.creado_en)}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
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
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        {o.saldo > 0 ? (
                          <>
                            <button
                              onClick={() => o.estado !== "ANULADA" && setCobrarOrden(o)}
                              className="transition-transform active:scale-95 cursor-pointer"
                              title="Cobrar saldo de esta orden"
                            >
                              <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning-foreground hover:bg-warning/25 transition-colors font-bold">
                                {formatRD(o.saldo)}
                              </Badge>
                            </button>
                            {o.estado !== "ANULADA" && (o.metodo_pago === "PAGO_AL_RETIRAR" || o.metodo_pago === "CREDITO") && (
                              <button
                                onClick={() => setCobrarOrden(o)}
                                className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                              >
                                <DollarSign className="h-2.5 w-2.5" /> Cobrar
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      <div className="flex flex-col items-center">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {o.metodo_pago === "PAGO_AL_RETIRAR" ? "AL RETIRAR" : o.metodo_pago}
                        </span>
                        {o.pago_referencia && (
                          <span className="text-[9px] text-muted-foreground font-mono mt-0.5 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200/50 dark:border-slate-700/50" title={`Referencia: ${o.pago_referencia}`}>
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
                          {o.estado === "LISTA" && calcularDiasEnAlmacen(o.creado_en) >= (tenant?.config?.whatsapp?.dias_recordatorio_sin_retirar || 5) && (
                            <Badge className="bg-amber-600 text-white text-[9px] font-black uppercase tracking-wider py-0.5 px-1.5 rounded-sm gap-0.5 shadow-sm border-0">
                              <Clock className="h-2.5 w-2.5" /> {calcularDiasEnAlmacen(o.creado_en)}d en almacén
                            </Badge>
                          )}
                          {o.estado === "LISTA" && fueNotificadoHoy(o.ultimo_recordatorio_en) && (
                            <Badge className="bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider py-0.5 px-1.5 rounded-sm gap-0.5 shadow-sm border-0">
                              <Check className="h-2.5 w-2.5" /> Notificado hoy
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
                              
                              {o.estado === "LISTA" && (
                                <button 
                                  onClick={async () => {
                                    setOpenMenuId(null);
                                    const cli = clientes.find((c) => c.id === o.cliente_id);
                                    if (!cli) {
                                      toast.error("No se encontró la información del cliente");
                                      return;
                                    }
                                    const res = await notificarWhatsApp(tenant, cli, o, "sin_retirar");
                                    if (res.ok) {
                                      toast.success(`Recordatorio WhatsApp enviado a ${cli.nombre} ✅`);
                                      queryClient.invalidateQueries({ queryKey: ['ordenes', tenantId] });
                                    } else {
                                      toast.error(`No se pudo enviar: ${res.reason || "Error de red"}`);
                                    }
                                  }}
                                  className="text-emerald-600 dark:text-emerald-400 font-bold"
                                >
                                  <MessageCircle className="text-emerald-500" /> Notificar WhatsApp
                                </button>
                              )}
                              
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
                                <Printer /> Imprimir Ticket (Cliente)
                              </button>

                              <button 
                                onClick={() => { setOpenMenuId(null); setShowPrintProduccion(o); }}
                                className="text-amber-700 dark:text-amber-300 font-semibold"
                              >
                                <Tag className="text-amber-600 dark:text-amber-400" /> Imprimir Ticket de Taller
                              </button>
                              
                              <button 
                                onClick={() => { setOpenMenuId(null); setShowDownloadA4(o); }}
                              >
                                <DownloadCloud /> Ver Factura A4
                              </button>

                              {o.estado !== "ANULADA" && ecfConfig?.is_active && o.ncf?.startsWith("E") && (
                                <>
                                  <button
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      setCredito(o);
                                      setMontoCredito(0);
                                      setMotivoCredito("");
                                      setCodigoCredito("04");
                                    }}
                                    className="text-amber-600 dark:text-amber-400"
                                  >
                                    <ArrowDownCircle className="h-4 w-4" /> Nota de Crédito
                                  </button>
                                  <button 
                                    onClick={() => { setOpenMenuId(null); setDebito(o); }}
                                  >
                                    <ArrowUpCircle className="text-blue-600 dark:text-blue-400" /> Nota de Débito
                                  </button>
                                </>
                              )}
   
                              {o.estado !== "ANULADA" && (
                                <>
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
          <div className="px-5 py-3.5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface/50">
            <div className="text-xs text-muted-foreground font-medium">
              Mostrando <span className="font-bold text-foreground">{(currentPage - 1) * PAGE_SIZE + 1}</span>–<span className="font-bold text-foreground">{Math.min(currentPage * PAGE_SIZE, filt.length)}</span> de <span className="font-bold text-foreground">{filt.length}</span> órdenes
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 rounded-lg text-xs font-semibold border-border hover:bg-accent transition-all active:scale-[0.98]"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Anterior
              </Button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((page, idx, arr) => {
                    const prevPage = arr[idx - 1];
                    const showEllipsis = prevPage && page - prevPage > 1;
                    return (
                      <div key={page} className="flex items-center gap-1">
                        {showEllipsis && <span className="px-1 text-xs text-muted-foreground">...</span>}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`h-8 min-w-8 px-2.5 rounded-lg text-xs font-bold transition-all ${
                            currentPage === page
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          }`}
                        >
                          {page}
                        </button>
                      </div>
                    );
                  })}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 rounded-lg text-xs font-semibold border-border hover:bg-accent transition-all active:scale-[0.98]"
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl p-5">
          {view && (
            <OrderDetail 
              view={view} 
              tenant={tenant} 
              clientes={clientes} 
              empleados={empleados}
              cambiarEstado={cambiarEstado} 
              setView={setView} 
              onPrint={() => setShowPrint(view)}
              onPrintProduccion={() => setShowPrintProduccion(view)}
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

      {/* Nota de Crédito */}
      <Dialog open={!!credito} onOpenChange={(o) => !o && setCredito(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-amber-600" />
              Generar Nota de Crédito
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 p-3 rounded-lg text-xs text-amber-700 border border-amber-100">
              Esta acción generará un <b>e-NCF E34</b>, deducirá el monto de la orden #{credito?.numero} y registrará un egreso de caja.
            </div>
            <div>
              <label className="text-sm font-bold mb-1.5 block">Tipo de Modificación (DGII)</label>
              <Select value={codigoCredito} onValueChange={setCodigoCredito}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccione código" />
                </SelectTrigger>
                <SelectContent align="start" sideOffset={4}>
                  <SelectItem value="02">02 - Anulación Parcial</SelectItem>
                  <SelectItem value="03">03 - Descuento o Bonificación</SelectItem>
                  <SelectItem value="04">04 - Devolución de Mercancía</SelectItem>
                  <SelectItem value="05">05 - Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-bold mb-1.5 block">Monto a deducir (RD$)</label>
              <Input 
                type="number" 
                value={montoCredito} 
                onChange={(e) => setMontoCredito(Number(e.target.value))} 
                placeholder="0.00" 
                className="text-lg font-bold"
              />
            </div>
            <div>
              <label className="text-sm font-bold mb-1.5 block">Motivo descriptivo</label>
              <Input 
                value={motivoCredito} 
                onChange={(e) => setMotivoCredito(e.target.value)} 
                placeholder="Ej: Devolución de prenda dañada" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCredito(null)}>Cancelar</Button>
            <Button onClick={generarNotaCredito} disabled={montoCredito <= 0} className="bg-amber-600 hover:bg-amber-700">Generar Nota de Crédito</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        setShowPrintProduccion={setShowPrintProduccion}
      />

      {/* Modal Estantería Virtual / Ubicación */}
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

      {estadoModal && (
        <TicketPrintPortal 
          orden={estadoModal} 
          tenant={tenant} 
          clientes={clientes} 
          empleados={empleados} 
          onClose={() => {}}
          hiddenPreview={true}
        />
      )}
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
}: EstadoOrdenDialogProps) {
  if (!estadoModal) return null;

  return (
    <Dialog open={!!estadoModal} onOpenChange={(o) => { if (!o) setEstadoModal(null); }}>
      <DialogContent className="sm:max-w-3xl rounded-[24px] p-6 overflow-hidden bg-white shadow-2xl">
        {/* Header Top Left */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white shrink-0 ${
              estadoModal.estado === "RECIBIDA" ? "bg-blue-500" :
              estadoModal.estado === "EN_PROCESO" ? "bg-amber-500" :
              estadoModal.estado === "LISTA" ? "bg-emerald-500" :
              "bg-purple-500"
            }`}>
              {estadoModal.estado === "RECIBIDA" && <Inbox className="h-4 w-4" />}
              {estadoModal.estado === "EN_PROCESO" && <RefreshCw className="h-4 w-4" />}
              {estadoModal.estado === "LISTA" && <CircleCheck className="h-4 w-4" />}
              {estadoModal.estado === "ENTREGADA" && <Truck className="h-4 w-4" />}
            </div>
            <div>
              <DialogTitle className="text-sm font-black leading-tight text-slate-900">{estadoModal.numero}</DialogTitle>
              <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">
                {clientes.find(c => c.id === estadoModal.cliente_id)?.nombre || "Consumidor Final"}
              </div>
            </div>
          </div>
        </div>
        
        {/* Título Central Elevado */}
        <div className="text-center mb-4 -mt-7 px-8">
          <h2 className="text-xl font-black text-slate-900 tracking-tight leading-snug">Cambiar estado de la orden</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Selecciona el nuevo estado: <span className="font-bold text-blue-600">1. Recibida</span> · <span className="font-bold text-amber-600">2. En proceso</span> · <span className="font-bold text-emerald-600">3. Lista</span> · <span className="font-bold text-purple-600">4. Entregada</span>
          </p>
        </div>
        
        {/* Tarjetas de Estados */}
        <div className="grid grid-cols-4 gap-2.5 mb-3.5 px-1">
          {([
            { step: 1, value: "RECIBIDA" as EstadoOrden, label: "Recibida", icon: Inbox, color: "blue", desc: "Orden recibida e ingresada al sistema." },
            { step: 2, value: "EN_PROCESO" as EstadoOrden, label: "En proceso", icon: RefreshCw, color: "amber", desc: "Servicios siendo procesados actualmente." },
            { step: 3, value: "LISTA" as EstadoOrden, label: "Lista", icon: CircleCheck, color: "emerald", desc: "Servicios completados y listos para entrega." },
            { step: 4, value: "ENTREGADA" as EstadoOrden, label: "Entregada", icon: Truck, color: "purple", desc: "Orden entregada con éxito al cliente." },
          ]).map((s) => {
            const Icon = s.icon;
            const isCurrent = estadoModal.estado === s.value;
            const isCredito = isMetodoCredito(estadoModal.metodo_pago);
            const isAllowed = esTransicionEstadoPermitida(estadoModal.estado, s.value, estadoModal.saldo, estadoModal.metodo_pago);
            const isBlockedBySaldo = s.value === "ENTREGADA" && estadoModal.saldo > 0 && !isCredito;

            const colorClasses = {
              blue: { iconBg: "bg-blue-100", iconColor: "text-blue-600", activeCardBg: "bg-blue-50/60", activeBorder: "border-blue-500", activeCheckBg: "bg-blue-500" },
              amber: { iconBg: "bg-amber-100", iconColor: "text-amber-600", activeCardBg: "bg-amber-50/60", activeBorder: "border-amber-500", activeCheckBg: "bg-amber-500" },
              emerald: { iconBg: "bg-emerald-100", iconColor: "text-emerald-600", activeCardBg: "bg-emerald-50/60", activeBorder: "border-emerald-500", activeCheckBg: "bg-emerald-500" },
              purple: { iconBg: "bg-purple-100", iconColor: "text-purple-600", activeCardBg: "bg-purple-50/60", activeBorder: "border-purple-500", activeCheckBg: "bg-purple-500" }
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
                    setEstadoModal({ ...estadoModal, estado: s.value });
                    const shouldCloseImmediately = await cambiarEstado(estadoModal, s.value);
                    if (shouldCloseImmediately) {
                      setTimeout(() => setEstadoModal(null), 350);
                    } else {
                      setTimeout(() => setEstadoModal(null), 100);
                    }
                  }
                }}
                disabled={!isAllowed}
                className={`relative flex flex-col items-center justify-start text-center rounded-[16px] p-2.5 py-3 transition-all duration-200 ${cardClass}`}
              >
                {/* Badge Superior */}
                <div className="absolute top-2 right-2">
                  {isCurrent ? (
                    <div className={`h-[18px] px-2 rounded-full flex items-center gap-1 text-white shadow-xs text-[9px] font-black uppercase tracking-wider ${colorClasses.activeCheckBg}`} title="Estado actual">
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

                <div className={`h-[40px] w-[40px] rounded-full flex items-center justify-center mb-1.5 ${iconContainerClass}`}>
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
        {estadoModal.estado !== "ANULADA" && (hasNotaCredito || hasNotaDebito || hasCondonarDeuda || hasAnularOrden) && (
          <div className="mb-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
            <div className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight text-center mb-2">
              Acciones Especiales
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {hasNotaCredito && (estadoModal.ncf?.startsWith("E") || ecfConfig?.is_active) && setCredito && setMontoCredito && setMotivoCredito && setCodigoCredito && (
                <button
                  type="button"
                  onClick={() => {
                    const target = estadoModal;
                    setEstadoModal(null);
                    setCredito(target);
                    setMontoCredito(0);
                    setMotivoCredito("");
                    setCodigoCredito("04");
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100/90 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 px-3 py-1.5 rounded-xl transition-all cursor-pointer border border-slate-200/80 dark:border-slate-700 active:scale-95"
                >
                  <ArrowDownCircle className="h-4 w-4 text-slate-800 dark:text-slate-200" />
                  Nota de Crédito
                </button>
              )}
              {hasNotaDebito && (estadoModal.ncf?.startsWith("E") || ecfConfig?.is_active) && setDebito && (
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
  onPrintProduccion,
  setCobrarOrden 
}: { 
  view: Orden; 
  tenant: any; 
  clientes: any[]; 
  empleados: any[]; 
  cambiarEstado: any; 
  setView: any; 
  onPrint: () => void; 
  onPrintProduccion?: () => void;
  setCobrarOrden: any;
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
      <DialogHeader className="mb-4 flex flex-row items-center justify-between space-y-0 pr-8">
        <DialogTitle className="flex items-center gap-2.5 text-xl font-bold text-slate-800 dark:text-slate-100">
          <Receipt className="h-5.5 w-5.5 text-primary" />
          Orden {view.numero}
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
        </div>
      </DialogHeader>
      
      <div className="grid gap-6 md:grid-cols-2 items-start">
        <div className="flex flex-col gap-4">
          {/* List items layout con fuentes más grandes */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between border-b-2 border-slate-200/70 dark:border-slate-800 py-2.5">
              <div className="flex items-center gap-3 text-slate-600">
                <User className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm">Cliente</span>
              </div>
              <div className="font-extrabold text-slate-900 text-[15px]">{c.nombre} {c.apellido || ""}</div>
            </div>

            {c.telefono && c.telefono !== "---" && (
              <div className="flex items-center justify-between border-b-2 border-slate-200/70 dark:border-slate-800 py-2.5">
                <div className="flex items-center gap-3 text-slate-600">
                  <Phone className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-sm">Teléfono</span>
                </div>
                <div className="font-extrabold text-slate-900 text-[15px]">{formatPhoneRD(c.telefono)}</div>
              </div>
            )}

            <div className="flex items-center justify-between border-b-2 border-slate-200/70 dark:border-slate-800 py-2.5">
              <div className="flex items-center gap-3 text-slate-600">
                <Wallet className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm">Pagado</span>
              </div>
              <div className="font-extrabold text-slate-900 text-[15px]">{formatRD(view.pagado)}</div>
            </div>

            <div className="flex items-center justify-between border-b-2 border-slate-200/70 dark:border-slate-800 py-2.5">
              <div className="flex items-center gap-3 text-slate-600">
                <Scale className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm">Saldo</span>
              </div>
              <div className="font-extrabold text-amber-600 text-[15px]">{formatRD(view.saldo)}</div>
            </div>

            <div className="flex items-center justify-between border-b-2 border-slate-200/70 dark:border-slate-800 py-2.5">
              <div className="flex items-center gap-3 text-slate-600">
                <UserCog className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm">Atendido por</span>
              </div>
              <div className="font-extrabold text-slate-900 text-[15px]">{emp.nombre}</div>
            </div>

            <div className="flex items-center justify-between border-b-2 border-slate-200/70 dark:border-slate-800 py-2.5">
              <div className="flex items-center gap-3 text-slate-600">
                <Shirt className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm">Total de prendas</span>
              </div>
              <div className="font-extrabold text-slate-900 dark:text-slate-100 text-lg">
                {(view.items || []).filter(it => !it.descripcion.toLowerCase().startsWith("servicio:")).reduce((acc, it) => acc + it.cantidad, 0)}
              </div>
            </div>
          </div>
            
          {view.motivo_anulacion && <div className="rounded-xl bg-destructive/10 p-3 text-destructive border border-destructive/20 text-sm mt-2"><strong>Motivo anulación:</strong> {view.motivo_anulacion}</div>}



          <div className="pt-2">
            <div className="mb-3 text-center text-sm font-extrabold text-slate-900 uppercase tracking-wide">Cambiar estado</div>
            <div className="grid grid-cols-4 gap-2">
              {(["RECIBIDA", "EN_PROCESO", "LISTA", "ENTREGADA"] as EstadoOrden[]).map((s) => {
                const isActive = view.estado === s;
                let Icon = Inbox;
                if (s === "EN_PROCESO") Icon = RefreshCw;
                if (s === "LISTA") Icon = CheckCircle2;
                if (s === "ENTREGADA") Icon = Truck;

                return (
                  <Button 
                    key={s} 
                    variant="outline" 
                    disabled={isActive || !esTransicionEstadoPermitida(view.estado, s, view.saldo, view.metodo_pago)}
                    className={`h-11 flex-col gap-1 px-1 py-1.5 transition-all text-[9px] font-bold border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                      isActive 
                        ? 'bg-[#2E4A79] text-white border-transparent hover:bg-[#253d63]' 
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                    onClick={async () => { 
                      const shouldChange = await cambiarEstado(view, s); 
                      if (shouldChange) setView({ ...view, estado: s }); 
                    }}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    {s.replace("_", " ")}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            {view.estado !== "ANULADA" && (
              view.saldo > 0 ? (
                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md font-bold h-12 rounded-2xl text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                  onClick={() => {
                    setView(null);
                    setCobrarOrden(view);
                  }}
                >
                  <DollarSign className="h-5 w-5" />
                  Cobrar Orden ({formatRD(view.saldo)})
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  className="w-full bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-700 border-emerald-200 font-bold h-12 rounded-2xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  onClick={() => {
                    setView(null);
                    setCobrarOrden(view);
                  }}
                >
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Orden Pagada · Ver Cobros
                </Button>
              )
            )}
          </div>
        </div>

        {/* Tarjeta con Fondo Temático de Lavandería (Alineada arriba a nivel de Cliente) */}
        <div className="relative w-full max-h-[500px] overflow-y-auto custom-scrollbar rounded-2xl bg-slate-100/90 dark:bg-slate-900/60 p-3 shadow-inner border border-slate-200/60 dark:border-slate-800 flex justify-center items-start">
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

          {/* Recibo Térmico */}
          <div className="relative z-10 shrink-0" style={{ zoom: 0.78 }}>
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
  esProduccion = false
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
}) {
  const initialEmp = empleados.find(x => x.id === orden.empleado_id) || { nombre: "Personal" };
  const initialCli = clientes.find(c => c.id === orden.cliente_id) || { nombre: "Consumidor", apellido: "Final", cedula: "", telefono: "" };
  
  const [emp, setEmp] = useState<any>(initialEmp);
  const [cli, setCli] = useState<any>(initialCli);
  const [srvList, setSrvList] = useState<any[]>([]);

  // Async data fetch for extra details
  useEffect(() => {
    Promise.all([
      getEmpleadoById(orden.empleado_id).catch(() => null),
      Promise.resolve(clientes.find(c => c.id === orden.cliente_id)),
      getServicios(tenant.id)
    ]).then(([e, c, s]) => {
      if (e) setEmp(e);
      if (c) setCli(c);
      setSrvList(s);
    });
  }, [orden, tenant.id, clientes, empleados]);

  // Hook para impresión física directa si está configurada
  useEffect(() => {
    if (emp && cli && srvList.length > 0) {
      const printerType = tenant.config?.impresora_tipo || "usb";
      if (printerType === "bluetooth" || printerType === "serial") {
        const runPhysicalPrint = async () => {
          try {
            const bytes = encodeEscPos(orden, tenant, cli, emp, srvList, pagoRecibido, ocultarUbicacion, ocultarNotas, esProduccion);
            const success = await printDirectRaw(bytes, tenant.config);
            if (success) {
              toast.success("¡Ticket impreso en impresora física!");
            } else {
              toast.error("No se pudo imprimir en la impresora física.");
            }
          } catch (err: any) {
            console.error(err);
            toast.error("Error al imprimir físicamente: " + err.message);
          } finally {
            onClose();
          }
        };
        runPhysicalPrint();
      }
    }
  }, [emp, cli, srvList, orden, tenant, pagoRecibido, ocultarUbicacion, ocultarNotas, esProduccion, onClose]);

  if (!emp || !cli) return null;

  return createPortal(
    <div className={`fixed inset-0 bg-white z-[99999] overflow-y-auto pointer-events-auto atomic-print-target ${hiddenPreview ? 'opacity-0 pointer-events-none print:opacity-100' : ''}`}>
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
          ocultarUbicacion={ocultarUbicacion}
          ocultarNotas={ocultarNotas}
          esProduccion={esProduccion}
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
            font-family: "Segoe UI", Arial, sans-serif !important;
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

  const isECF = !!(orden.tipo_ecf?.startsWith("E") || orden.ncf?.startsWith("E"));
  const isPendingECF = isECF && (
    !orden.ecf_security_code ||
    orden.ecf_security_code === "null" ||
    orden.ecf_security_code.trim() === "" ||
    (orden as any).ecf_status === "PENDING_OFFLINE_TRANSMISSION"
  );
  const isCréditoFiscal = orden.tipo_ecf === "E31" || orden.ncf?.startsWith("E31") || orden.ncf?.startsWith("B01");
  const actualQR = orden.ecf_qr === "null" ? "" : (orden.ecf_qr || "");
  const qrData = !isPendingECF && (actualQR || (isECF && orden.ncf ? `https://dgii.gov.do/consulta_ecf?RNC_EMISOR=${tenant.rnc}&E_NCF=${orden.ncf}&MONTO_TOTAL=${orden.total}&FECHA_EMISION=${new Date(orden.creado_en).toLocaleDateString('en-GB').replace(/\//g, '')}` : ""));
  const cfg = tenant.config;

  let docTitle = "Factura de Consumo";
  if (orden.nota_credito_ncf) {
    docTitle = isECF ? "Nota de Crédito Electrónica" : "Nota de Crédito";
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
                {docTitle}
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
                ) : isPendingECF ? (
                  <>
                    <tr><td className="font-bold pr-1.5 text-right whitespace-nowrap">e-NCF:</td><td className="font-mono text-left font-bold text-amber-600">Pendiente de timbrado</td></tr>
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
              ¡Gracias por su preferencia!<br/>
              Documento generado por Klynn POS
            </div>
            
            {isPendingECF && (
              <div className="text-center text-xs font-bold text-amber-800 bg-amber-50 border border-dashed border-amber-300 px-4 py-2 rounded-lg">
                Documento sujeto a timbrado e-CF.
              </div>
            )}

            {isECF && !isPendingECF && qrData && (
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
  inline = false,
  onClose
}: {
  tenant: any;
  ordenes: any[];
  clientes: any[];
  inline?: boolean;
  onClose: () => void;
}) {
  const [printing, setPrinting] = useState(false);
  const totalMontoGlobal = ordenes.reduce((acc, curr) => acc + curr.total, 0);
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
          <Button onClick={onClose} className="gap-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
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
                      <td className="py-2.5 px-4 text-center text-slate-500 whitespace-nowrap">{formatMetodoPagoLabel(o.metodo_pago)}</td>
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

export function CobrarOrdenDialog({ orden, onClose, tenant, cajaAbierta, clientes, queryClient, showPrintPortal, onSuccess }: CobrarOrdenDialogProps) {
  const user = useRequireAuth();
  const isAuthorized = user?.empleado?.rol === "ADMIN" || user?.empleado?.rol === "SUPERVISOR";
  const [metodo, setMetodo] = useState<MetodoPago>("EFECTIVO");
  const [recibido, setRecibido] = useState<number>(orden.saldo);
  const [entregarAlCobrar, setEntregarAlCobrar] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [showCondonar, setShowCondonar] = useState<boolean>(false);
  const [referencia, setReferencia] = useState("");
  const [showRefInput, setShowRefInput] = useState(false);

  const totalCobrar = orden.saldo;
  const vuelto = metodo === "EFECTIVO" && recibido > totalCobrar ? recibido - totalCobrar : 0;
  const faltante = recibido > 0 && recibido < totalCobrar ? totalCobrar - recibido : 0;

  const cli = clientes.find((c) => c.id === orden.cliente_id) || { nombre: "Consumidor", apellido: "Final", telefono: "", tipo: "Consumidor Final" as Cliente["tipo"], cedula: undefined };

  const handleMetodoChange = (m: MetodoPago) => {
    setMetodo(m);
    setReferencia("");
    setShowRefInput(false);
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
        : (nuevoSaldo === 0 && entregarAlCobrar ? "ENTREGADA" : orden.estado);

      let finalNCF: string | undefined = orden.ncf;
      let finalNcfVencimiento: string | undefined = orden.ncf_vencimiento;
      let finalTipoECF: string | undefined = orden.tipo_ecf;
      let finalEcfStatus: string | undefined = orden.ecf_status;
      let finalEcfId: string | undefined = orden.ecf_id;
      let finalEcfQr: string | undefined = orden.ecf_qr;
      let finalEcfSecurityCode: string | undefined = orden.ecf_security_code;
      let finalEcfSignatureDate: string | undefined = orden.ecf_signature_date;

      const fiscalConfig = await getECFConfig(tenant.id);
      const isElectronic = !!fiscalConfig?.is_active;

      if (tenant.config?.ncf_facturacion_activa && !orden.ncf && nuevoSaldo === 0) {
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
        } else if (typeof window !== "undefined" && !navigator.onLine) {
          // ⚠️ Modo Offline: Cobro registrado, Pre-Factura y encolado para timbrado al sincronizar
          finalNCF = undefined;
          finalTipoECF = tipoECFDefault;
          finalEcfStatus = "PENDING_OFFLINE_TRANSMISSION";
          toast.info("⚠️ Modo Offline: Cobro registrado con Pre-Factura. Se timbrará con DGII al sincronizar.");
        } else {
          try {
            let nextNCF: string | undefined = undefined;
            try {
              const { ncf, expiration_date } = await nextECFNumero(tenant.id, tipoECFDefault);
              nextNCF = ncf;
              finalNcfVencimiento = expiration_date;
            } catch (seqErr) {
              console.warn("Aviso al obtener secuencia local:", seqErr);
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
            finalEcfStatus = "SIGNED";
            finalEcfId = result.document.id;
            finalEcfQr = result.stamp_url || result.document.document_stamp_url || '';
            finalEcfSecurityCode = result.security_code || '';
            finalEcfSignatureDate = result.document.signature_date || new Date().toISOString();

            toast.success(`✅ Comprobante DGII ${result.encf} emitido con éxito`);
          } catch (fErr: any) {
            console.error("Error Fiscal al cobrar:", fErr);
            // Fallback resiliente
            finalNCF = undefined;
            finalTipoECF = tipoECFDefault;
            finalEcfStatus = "PENDING_OFFLINE_TRANSMISSION";
            toast.warning("Aviso de red: Cobro registrado con Pre-Factura. Se timbrará con DGII al sincronizar.");
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
        metodo_pago: orden.metodo_pago === "CREDITO"
          ? "CREDITO"
          : (nuevoSaldo === 0 ? metodo : orden.metodo_pago),
        ncf: finalNCF,
        ncf_vencimiento: finalNcfVencimiento,
        tipo_ecf: finalTipoECF,
        ecf_id: finalEcfId,
        ecf_qr: finalEcfQr,
        ecf_security_code: finalEcfSecurityCode,
        ecf_signature_date: finalEcfSignatureDate,
        ecf_status: finalEcfStatus || (finalEcfSecurityCode?.startsWith("SBX") ? "PENDING_OFFLINE_TRANSMISSION" : (orden as any).ecf_status),
        pago_referencia: (metodo === "TARJETA" || metodo === "TRANSFERENCIA") && referencia ? referencia : orden.pago_referencia
      });

      await saveOrden(ordenActualizada);

      const eraPagoAlRetirar = orden.metodo_pago === "PAGO_AL_RETIRAR";

      // 2. Registrar el movimiento de entrada en caja
      await saveMovimiento({
        id: uid("mov"),
        tenant_id: tenant.id,
        caja_id: cajaAbierta.id,
        empleado_id: ordenActualizada.empleado_id,
        tipo: eraPagoAlRetirar ? "VENTA" : (nuevoSaldo === 0 ? "VENTA" : "ABONO"),
        concepto: eraPagoAlRetirar
          ? (nuevoSaldo === 0
            ? `Cobro de orden al retirar #${orden.numero} (${entregarAlCobrar ? 'Entregada' : 'No entregada'})`
            : `Abono a orden al retirar #${orden.numero} (Saldo restante: ${formatRD(nuevoSaldo)})`)
          : (nuevoSaldo === 0
            ? `Cobro de saldo orden #${orden.numero} (${entregarAlCobrar ? 'Entregada' : 'No entregada'})`
            : `Abono a orden #${orden.numero} (Saldo restante: ${formatRD(nuevoSaldo)})`),
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (!loading && cajaAbierta && recibido > 0 && !(metodo !== "EFECTIVO" && recibido > totalCobrar)) {
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

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl rounded-2xl p-0 border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden bg-background [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary/90 [&>button]:border-none [&>button]:shadow-md [&>button]:h-9 [&>button]:w-9 [&>button]:top-4 [&>button]:right-4 [&>button]:rounded-full [&>button]:z-20">
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[420px]">
          {/* COLUMNA IZQUIERDA: RESUMEN DE LA ORDEN + ACCIONES SECUNDARIAS */}
          <div className="md:col-span-5 bg-slate-50 dark:bg-slate-900/60 p-5 flex flex-col justify-between border-r border-slate-200/80 dark:border-slate-800 relative">
            <div className="space-y-3">
              {/* Header sin badge detrás del icono invoice */}
              <div className="flex items-center gap-2.5 mb-4.5">
                <Receipt className="h-6 w-6 text-primary shrink-0 stroke-[2.2]" />
                <div>
                  <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 block uppercase tracking-wider">Detalle de Cobro</span>
                  <span className="font-mono text-base font-black text-primary block mt-0.5">Orden #{orden.numero}</span>
                </div>
              </div>

              {/* Cliente Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-300 font-medium">
                  <span className="font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">Cliente</span>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[8px] font-extrabold uppercase tracking-wider border border-primary/20">
                    {cli.tipo === "Empresa" ? "Empresa" : "Personal"}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs shrink-0">
                    {cli.tipo === "Empresa" ? <Building2 className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">{cli.nombre} {cli.apellido || ""}</p>
                    {cli.telefono && <p className="text-[10px] text-slate-600 dark:text-slate-300 font-mono font-extrabold mt-0.5">{formatPhoneRD(cli.telefono)}</p>}
                  </div>
                </div>
              </div>

              {/* Montos Resumen */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 grid grid-cols-2 gap-2 shadow-xs">
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">Total Orden</span>
                  <span className="text-sm font-black text-slate-900 dark:text-slate-100 block mt-0.5">{formatRD(orden.total)}</span>
                </div>
                <div className="border-l border-slate-200/80 dark:border-slate-800 pl-2.5">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">Abonado</span>
                  <span className="text-sm font-black text-primary block mt-0.5">{formatRD(orden.pagado)}</span>
                </div>
              </div>

              {/* Saldo Destacado (Total a Saldar) */}
              <div className="bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl p-3 flex items-center justify-between shadow-xs">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-300 block">Total a Saldar</span>
                  <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 block tracking-tight">{formatRD(totalCobrar)}</span>
                </div>
                <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
                  <Wallet className="h-4.5 w-4.5" />
                </div>
              </div>
            </div>

            {/* BOTONES CANCELAR Y CONDONAR DEUDA (MOVIDOS AL PANEL IZQUIERDO SEGÚN LA 2DA IMAGEN) */}
            <div className="flex gap-2 mt-4 pt-2 border-t border-slate-200/60 dark:border-slate-800">
              <Button
                variant="outline"
                type="button"
                onClick={onClose}
                className="flex-1 h-9 rounded-xl text-[11px] font-extrabold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 cursor-pointer shadow-xs"
              >
                Cancelar
              </Button>

              {isAuthorized && (
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setShowCondonar(true)}
                  className="flex-1 h-9 rounded-xl text-[10px] font-extrabold border-amber-300/80 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 gap-1.5 cursor-pointer shadow-xs"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  Condonar Deuda
                </Button>
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA: REGISTRO DE COBRO */}
          <div className="md:col-span-7 p-5 flex flex-col justify-between space-y-4 bg-slate-50/30 dark:bg-slate-950">
            <div className="space-y-4">
              {/* Header Title */}
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  Registrar Pago
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-bold mt-0.5">
                  Selecciona la forma de pago e ingresa el monto.
                </p>
              </div>

              {/* Selector de Método de Pago */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                  Método de Pago
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "EFECTIVO", label: "Efectivo", icon: Banknote },
                    { id: "TARJETA", label: "Tarjeta", icon: CreditCard },
                    { id: "TRANSFERENCIA", label: "Transferencia", icon: Building2 }
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = metodo === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleMetodoChange(m.id as MetodoPago)}
                        className={`flex flex-col items-center justify-center py-2 px-2.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-[1.02]"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-emerald-500/40"
                        }`}
                      >
                        <Icon className={`h-4.5 w-4.5 mb-1 ${isSelected ? "text-white" : "text-slate-600 dark:text-slate-300"}`} />
                        <span className="text-[11px] font-extrabold">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Entrada de Monto (AUMENTADO TAMAÑO DE FUENTE E INPUT SEGÚN LA 3RA IMAGEN) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                    {metodo === "EFECTIVO" ? "Monto Entregado" : "Monto a Cobrar"}
                  </label>
                  {metodo === "EFECTIVO" && (
                    <button
                      type="button"
                      onClick={() => setRecibido(totalCobrar)}
                      className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Monto Exacto ({formatRD(totalCobrar)})
                    </button>
                  )}
                </div>

                <div className="relative h-12 rounded-xl border border-slate-200 dark:border-slate-800 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 bg-white dark:bg-slate-900 flex items-center px-3.5 transition-all shadow-xs">
                  <span className="font-black text-slate-400 text-lg mr-2 select-none shrink-0">RD$</span>
                  <input
                    type="text"
                    className="w-full h-full border-0 outline-none focus:outline-none focus:ring-0 text-3xl md:text-3xl font-black text-slate-900 dark:text-slate-100 p-0 bg-transparent tracking-tight"
                    value={recibido ? formatAmountInput(String(recibido)) : ""}
                    onChange={(e) => setRecibido(parseAmount(e.target.value))}
                    placeholder="0.00"
                    autoFocus
                  />
                </div>

                {/* Botones Rápidos de Monto (Presets POS) */}
                {metodo === "EFECTIVO" && (
                  <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto">
                    {[100, 500, 1000, 2000].map((add) => (
                      <button
                        key={add}
                        type="button"
                        onClick={() => setRecibido(prev => prev + add)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 text-[10px] font-extrabold transition-all cursor-pointer shrink-0 shadow-2xs"
                      >
                        +{add} RD$
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Referencia de Transacción para Tarjeta/Transferencia */}
              {(metodo === "TARJETA" || metodo === "TRANSFERENCIA") && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                    Referencia de Transacción
                  </label>
                  {!showRefInput ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowRefInput(true)}
                      className="w-full h-10 rounded-xl font-bold gap-2 text-primary border-primary/20 hover:bg-primary/5 hover:text-primary cursor-pointer text-xs"
                    >
                      <FileText className="h-4 w-4" /> Añadir referencia (Opcional)
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={referencia}
                        onChange={(e) => setReferencia(e.target.value)}
                        placeholder={metodo === "TARJETA" ? "Número de aprobación, autorización, Auth # o APR." : "Número de aprobación, transferencia, cuenta, etc."}
                        className="h-10 bg-white border-2 border-primary/20 focus-visible:ring-primary/30 rounded-xl font-medium text-xs"
                        autoFocus
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => {
                          setReferencia("");
                          setShowRefInput(false);
                        }}
                        className="h-10 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold gap-1.5 cursor-pointer text-xs border-none"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Quitar
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Indicador de Vuelto / Faltante */}
              {metodo === "EFECTIVO" ? (
                <div className={`p-2.5 px-3.5 rounded-xl border transition-all flex items-center justify-between ${
                  faltante > 0
                    ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300"
                    : "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 text-emerald-800 dark:text-emerald-300"
                }`}>
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${faltante > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                      <Coins className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider block">
                        {faltante > 0 ? "Falta por Cobrar" : "Cambio a Entregar"}
                      </span>
                      <span className="text-[9px] font-bold opacity-90 block">
                        {faltante > 0 ? "Saldo restante" : "Cambio para el cliente"}
                      </span>
                    </div>
                  </div>
                  <span className="text-xl font-black tracking-tight">
                    {formatRD(faltante > 0 ? faltante : vuelto)}
                  </span>
                </div>
              ) : (
                faltante > 0 && (
                  <div className="p-2.5 px-3.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider">Saldo Restante</span>
                    <span className="text-lg font-black">{formatRD(faltante)}</span>
                  </div>
                )
              )}
            </div>

            {/* Acciones Finales (Botón Verde COBRAR ORDEN Grande y Limpio) */}
            <div className="space-y-2 pt-1">
              {orden.estado !== "ENTREGADA" && (
                <div className="flex items-center justify-between py-1 px-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col text-left pl-2">
                    <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">Marcar ropa como entregada</span>
                    <span className="text-[9px] font-medium text-slate-500">Cambiar estado a Entregada al confirmar cobro</span>
                  </div>
                  <Switch
                    checked={entregarAlCobrar}
                    onCheckedChange={setEntregarAlCobrar}
                    className="scale-90 origin-right mr-1"
                  />
                </div>
              )}
              <Button
                size="lg"
                className="w-full h-12 font-black text-sm rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md shadow-emerald-600/20 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
                onClick={handleConfirmarCobro}
                disabled={loading || !cajaAbierta || recibido <= 0 || (metodo !== "EFECTIVO" && recibido > totalCobrar)}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-5 w-5 stroke-[3]" />
                )}
                <span>COBRAR ORDEN</span>
                <span className="ml-1.5 px-2 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-700/50 text-white rounded-md border border-white/20 tracking-wider shadow-2xs">
                  ESPACIO
                </span>
              </Button>
              
              {!cajaAbierta && (
                <p className="text-[9px] font-black text-rose-600 text-center flex items-center justify-center gap-1 animate-pulse">
                  <AlertTriangle className="h-3 w-3" /> La caja está cerrada. Abre la caja antes de registrar un pago.
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ TARJETA DE ORDEN PENDIENTE INTERACTIVA ============
export interface PendienteCardProps {
  o: Orden;
  clientes: Cliente[];
  cajaAbierta: Caja | null | undefined;
  onCobrarClick: (orden: Orden) => void;
  compact?: boolean;
}

export function PendienteCard({ o, clientes, cajaAbierta, onCobrarClick, compact = false }: PendienteCardProps) {
  const c = clientes.find(cli => cli.id === o.cliente_id) || { nombre: "Consumidor", apellido: "Final", tipo: "Consumidor Final" };
  const clienteNombre = `${c.nombre} ${c.apellido || ""}`.trim();
  const clienteIniciales = clienteNombre.split(" ").filter(Boolean).map(parte => parte[0]).slice(0, 2).join("").toUpperCase();
  const estadoAccent = ({
    RECIBIDA: "from-blue-500 to-indigo-500",
    EN_PROCESO: "from-amber-500 to-orange-500",
    LISTA: "from-emerald-500 to-teal-500",
    EN_CAMINO: "from-violet-500 to-purple-500",
  } as Record<string, string>)[o.estado] || "from-slate-400 to-slate-500";

  const handleCardClick = () => {
    if (!cajaAbierta) {
      toast.error("Abre la caja antes de registrar cobros");
      return;
    }
    onCobrarClick(o);
  };

  return (
    <Card className={`group relative flex h-full cursor-pointer flex-col overflow-hidden border border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_20px_50px_-28px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950 ${compact ? "rounded-2xl" : "rounded-3xl"}`}>
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
            <span className="text-[10px]">{new Date(o.creado_en).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
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
              c.tipo === "Empresa"
                ? "bg-[#1B4B73] text-white"
                : "bg-[#F0B900] text-slate-950"
            }`}
          >
            {c.tipo === "Empresa" ? <Building2 className="h-4 w-4" /> : clienteIniciales}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground leading-none block">
              Cliente
            </span>
            <span className="mt-0.5 truncate text-xs sm:text-[13px] font-bold text-foreground block" title={clienteNombre}>
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

        <div className={`${compact ? "mt-2 p-3" : "mt-3 p-4"} rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/[0.09] via-primary/[0.04] to-emerald-50/70 dark:border-primary/20 dark:from-primary/20 dark:via-primary/10 dark:to-emerald-950/30`}>
          {compact ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-[8px] font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Pendiente por cobrar</p>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-white/80 px-2 py-1 text-[8px] font-extrabold uppercase tracking-wider text-amber-700 shadow-sm dark:border-amber-900/60 dark:bg-slate-900/70 dark:text-amber-300">
                  <Coins className="h-3 w-3" />
                  Al retirar
                </span>
              </div>
              <p className="mt-1 truncate text-xl font-black tracking-tight text-slate-950 dark:text-white" title={formatRD(o.saldo)}>{formatRD(o.saldo)}</p>
            </>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Pendiente por cobrar</p>
                <p className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{formatRD(o.saldo)}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white/80 px-2 py-1 text-[8px] font-extrabold uppercase tracking-wider text-amber-700 shadow-sm dark:border-amber-900/60 dark:bg-slate-900/70 dark:text-amber-300">
                <Coins className="h-3 w-3" />
                Al retirar
              </span>
            </div>
          )}
          {o.total !== o.saldo && (
            <div className={`${compact ? "mt-2" : "mt-3"} flex items-center justify-between border-t border-primary/10 pt-2 text-[10px] font-semibold text-slate-500 dark:border-primary/20 dark:text-slate-400`}>
              <span>Total de la orden</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">{formatRD(o.total)}</span>
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
    nota_debito_ncf: o.nota_debito_ncf,
    nota_debito_id: o.nota_debito_id,
    nota_debito_monto: o.nota_debito_monto,
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
