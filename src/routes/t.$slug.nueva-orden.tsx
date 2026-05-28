import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Plus, Trash2, Search, UserPlus, Check, AlertTriangle,
  Printer, Phone, Shirt, Truck, Maximize2, Minimize2, LayoutGrid, List,
  ShoppingCart, User as UserIcon, X, Minus, CheckCircle2, Loader2, Building, Timer
} from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { Ticket } from "@/components/klynn/Ticket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import {
  getClientes, saveCliente, getCatalogo, getServicios, getCajaAbierta, saveOrden, saveMovimiento,
  nextOrdenNumero, formatRD, formatPhoneRD, uid, DEFAULT_CONFIG,
  formatAmountInput, parseAmount, saveTenant, getTenantPlan,
  checkPlanLimits, getECFConfig, getECFSequences, nextECFNumero, saveECFDocument,
  type Cliente, type OrdenItem, type MetodoPago, type Orden, type CatalogoItem, type Servicio, type Caja,
  type ECFConfig, type ECFSequence, type ECFDocument, NCF_NOMBRES
} from "@/lib/storage";
import { emitirECF } from "@/lib/fiscal";
import { getProneSoftClient } from "@/lib/fiscal/pronesoft-client";
import { PlanLimitModal } from "@/components/klynn/PlanLimitModal";
import { ClienteDialog } from "@/components/klynn/ClienteDialog";
import { useCatalogo, useServicios, useClientes, useCajaAbierta, useECFConfig, usePlans, useECFSequences } from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/t/$slug/nueva-orden")({
  component: NuevaOrdenPage,
});

const OPCIONES_CREDITO = [
  { dias: 10, label: "10 días" },
  { dias: 15, label: "15 días" },
  { dias: 30, label: "30 días" },
  { dias: 45, label: "45 días" },
  { dias: 60, label: "60 días" },
  { dias: 90, label: "90 días" },
];

function NuevaOrdenPage() {
  const user = useRequireAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: plansData } = usePlans();
  const plans = plansData || [];
  const tenantId = user?.tenant.id ?? "";

  const [step, setStep] = useState(1);
  const [isPosMode, setIsPosMode] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("TODOS");
  const [posFilterTab, setPosFilterTab] = useState<"TODOS" | "SERVICIOS" | "PRENDAS">("TODOS");
  const [posSearch, setPosSearch] = useState("");
  const [showLimitModal, setShowLimitModal] = useState(false);

  const [clienteSearch, setClienteSearch] = useState("");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [showNewCliente, setShowNewCliente] = useState(false);

  const [serviciosSel, setServiciosSel] = useState<string[]>(["Lavado y secado"]);
  const [items, setItems] = useState<OrdenItem[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [esUrgente, setEsUrgente] = useState(false);
  const [aplicarItbis, setAplicarItbis] = useState(true);
  const [descuento, setDescuento] = useState(0);
  const [fechaEntrega, setFechaEntrega] = useState<Date | undefined>(new Date());

  const [notas, setNotas] = useState("");
  const [showDeliveryPOS, setShowDeliveryPOS] = useState(false);
  const [showDiscountPOS, setShowDiscountPOS] = useState(false);
  const [servicioDomicilio, setServicioDomicilio] = useState(false);
  const [direccionDomicilio, setDireccionDomicilio] = useState("");
  const [costoDomicilio, setCostoDomicilio] = useState<number>(0);

  const [tipoECF, setTipoECF] = useState<string>("E32");
  const [indexDesglose, setIndexDesglose] = useState<number | null>(null);
  const [showDesgloseDialog, setShowDesgloseDialog] = useState(false);

  const { data: catalogoData = [], isLoading: loadingCatalog } = useCatalogo(tenantId);
  const { data: serviciosData = [], isLoading: loadingServicios } = useServicios(tenantId);
  const { data: clientes = [], isLoading: loadingClientes } = useClientes(tenantId);
  const { data: caja, isLoading: loadingCaja } = useCajaAbierta(tenantId);
  const { data: fiscalConfigData } = useECFConfig(tenantId);
  const { data: ecfSequences } = useECFSequences(tenantId);

  const isElectronic = fiscalConfigData?.is_active || false;

  // Calcular secuencias activas según el modo (electrónico o tradicional)
  const activeSequences = (ecfSequences || []).filter(s =>
    s.is_active &&
    (isElectronic ? s.tipo_ecf.startsWith('E') : s.tipo_ecf.startsWith('B'))
  );

  // Obtener los tipos únicos disponibles en base a las secuencias configuradas
  const validTipos = useMemo(() => {
    return activeSequences.length > 0
      ? Array.from(new Set(activeSequences.map(s => s.tipo_ecf))).sort()
      : (isElectronic ? ["E32", "E31"] : ["B02", "B01"]);
  }, [activeSequences, isElectronic]);

  const catalogo = useMemo(() => catalogoData.filter(i => i.activo), [catalogoData]);
  const servicios = useMemo(() => serviciosData.filter(s => s.activo), [serviciosData]);
  const fiscalConfig = fiscalConfigData || null;

  useEffect(() => {
    if (isPosMode) {
      document.body.classList.add("pos-mode");
    } else {
      document.body.classList.remove("pos-mode");
    }
    return () => document.body.classList.remove("pos-mode");
  }, [isPosMode]);

  // 1. Setea la dirección únicamente cuando cambia el cliente seleccionado realmente, pero mantiene el envío desactivado por defecto
  useEffect(() => {
    if (cliente) {
      setDireccionDomicilio(cliente.direccion || "");
    }
  }, [cliente?.id]);

  // 2. Auto-selecciona el tipo de comprobante fiscal cuando cambian datos de cliente o config fiscal
  useEffect(() => {
    if (cliente) {
      const isEmpresa = cliente.tipo === "Empresa" || (cliente.cedula && cliente.cedula.length >= 9);
      if (isEmpresa) {
        const target = isElectronic ? "E31" : "B01";
        if (validTipos.includes(target)) {
          setTipoECF(target);
        } else {
          const fallback = validTipos.find(t => t !== "E32" && t !== "B02");
          if (fallback) setTipoECF(fallback);
        }
      } else {
        const target = isElectronic ? "E32" : "B02";
        if (validTipos.includes(target)) {
          setTipoECF(target);
        } else {
          if (validTipos.length > 0) setTipoECF(validTipos[0]);
        }
      }
    }
  }, [cliente?.id, cliente?.tipo, cliente?.cedula, isElectronic, validTipos]);

  useEffect(() => {
    if (validTipos.length > 0 && !validTipos.includes(tipoECF)) {
      const isConsumo = tipoECF === "E32" || tipoECF === "B02";
      if (isConsumo) {
        const matchingConsumo = validTipos.find(t => t === "E32" || t === "B02");
        setTipoECF(matchingConsumo || validTipos[0]);
      } else {
        const matchingCredito = validTipos.find(t => t === "E31" || t === "B01");
        setTipoECF(matchingCredito || validTipos[0]);
      }
    }
  }, [validTipos, tipoECF]);

  const [metodo, setMetodo] = useState<MetodoPago>("EFECTIVO");
  const [recibido, setRecibido] = useState<number>(0);
  const [abonoCredito, setAbonoCredito] = useState<number>(0);

  const [limiteDiasSel, setLimiteDiasSel] = useState<number>(30);

  useEffect(() => {
    if (user?.tenant?.limite_credito_dias) {
      setLimiteDiasSel(user.tenant.limite_credito_dias);
    }
  }, [user?.tenant?.limite_credito_dias]);

  async function actualizarLimiteDias(dias: number) {
    setLimiteDiasSel(dias);
    try {
      const { error } = await supabase
        .from("tenants")
        .update({ limite_credito_dias: dias })
        .eq("id", tenantId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["activeTenant"] });
      toast.success(`Plazo de crédito asignado a ${dias} días ✅`);
    } catch (e) {
      console.error("Error al guardar plazo de crédito:", e);
    }
  }

  const [creada, setCreada] = useState<Orden | null>(null);
  const [showTicket, setShowTicket] = useState(false);
  const [showPrintPortal, setShowPrintPortal] = useState<Orden | null>(null);

  async function handleSelectGeneric(tipo: "Persona" | "Empresa") {
    const isPersona = tipo === "Persona";
    const gid = tenantId.substring(0, 24) + (isPersona ? "f000" : "e000") + tenantId.substring(28);
    const c: Cliente = {
      id: gid,
      tenant_id: tenantId,
      nombre: isPersona ? "Consumidor" : "Empresa",
      apellido: isPersona ? "Final" : "Genérica",
      cedula: "",
      telefono: "---",
      email: "",
      direccion: "",
      tipo: isPersona ? "Consumidor Final" : "Empresa",
      limite_credito: 0,
      creado_en: new Date().toISOString()
    };

    try {
      await saveCliente(c);
      queryClient.invalidateQueries({ queryKey: ['clientes', tenantId] });
    } catch (e) {
      console.warn("Cliente genérico ya existe");
    }

    setCliente(c);
    setTipoECF(isPersona ? (isElectronic ? "E32" : "B02") : (isElectronic ? "E31" : "B01"));
    setStep(2);
  }

  const [empresaDialogOpen, setEmpresaDialogOpen] = useState(false);
  const [rncInput, setRncInput] = useState("");
  const [rncLoading, setRncLoading] = useState(false);
  const [rncResult, setRncResult] = useState<{ name: string; rnc: string; status: string; regime: string } | null>(null);

  async function handleSearchEmpresaRNC() {
    if (!rncInput.trim() || rncInput.trim().length < 9) {
      toast.error("Ingrese un RNC o Cédula válido (mínimo 9 dígitos)");
      return;
    }
    setRncLoading(true);
    setRncResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('pronesoft-proxy', {
        body: {
          action: 'get-rnc',
          payload: { rnc: rncInput.trim() }
        }
      });

      if (error || !data) throw new Error(error?.message || "No se pudo conectar con el servicio de RNC");
      if (!data.name) throw new Error("No se encontró el contribuyente");

      setRncResult({
        name: data.name,
        rnc: data.rnc || rncInput.trim(),
        status: data.status || "DESCONOCIDO",
        regime: data.regime || "NORMAL"
      });
      toast.success("Datos obtenidos. Por favor verifique.");
    } catch (e: any) {
      toast.error(e.message || "Error al buscar RNC");
    } finally {
      setRncLoading(false);
    }
  }

  async function handleConfirmEmpresa() {
    if (!rncResult) return;

    setRncLoading(true);
    try {
      const c: Cliente = {
        id: uid("cli"),
        tenant_id: tenantId,
        nombre: rncResult.name,
        apellido: undefined,
        cedula: rncResult.rnc,
        telefono: "---",
        email: "",
        direccion: "",
        tipo: "Empresa",
        limite_credito: 0,
        creado_en: new Date().toISOString()
      };

      await saveCliente(c);
      queryClient.invalidateQueries({ queryKey: ['clientes', tenantId] });

      setCliente(c);
      setTipoECF(isElectronic ? "E31" : "B01");
      setStep(2);
      setEmpresaDialogOpen(false);
      setRncInput("");
      setRncResult(null);
      toast.success("Empresa guardada y seleccionada");
    } catch (e: any) {
      toast.error("Error al guardar cliente");
    } finally {
      setRncLoading(false);
    }
  }

  const [limits, setLimits] = useState<any>(null);

  useEffect(() => {
    async function check() {
      if (user?.tenant && user.tenant.id !== '__loading__') {
        const l = await checkPlanLimits(user.tenant);
        setLimits(l);
        if (l.ordersReached) {
          setShowLimitModal(true);
        }
      }
    }
    check();
  }, [user]);

  const categoriesPrendas = useMemo(() => {
    const cats = new Set(catalogo.map(c => c.categoria || "Otros"));
    return ["TODAS LAS PRENDAS", ...Array.from(cats)];
  }, [catalogo]);

  const catalogFiltered = useMemo(() => {
    let list = catalogo;
    if (posFilterTab === "PRENDAS") {
      if (activeCategory !== "TODAS LAS PRENDAS") {
        list = list.filter(c => (c.categoria || "Otros") === activeCategory);
      }
    }
    if (posSearch) {
      list = list.filter(c => c.nombre.toLowerCase().includes(posSearch.toLowerCase()));
    }
    return list;
  }, [catalogo, activeCategory, posSearch, posFilterTab]);

  const servicesFiltered = useMemo(() => {
    if (posSearch) {
      return servicios.filter(s => s.nombre.toLowerCase().includes(posSearch.toLowerCase()));
    }
    return servicios;
  }, [servicios, posSearch]);

  const cfg = user?.tenant.config || DEFAULT_CONFIG;

  // Efecto para calcular la fecha de entrega automáticamente
  useEffect(() => {
    if (!user || user.tenant.id === '__loading__') return;

    const horas = esUrgente
      ? (cfg.tiempo_entrega_urgente || 6)
      : (cfg.tiempo_entrega_estandar || 24);

    const d = new Date();
    d.setHours(d.getHours() + horas);

    // Formato YYYY-MM-DD para el input de fecha
    setFechaEntrega(d);
  }, [esUrgente, cfg.tiempo_entrega_estandar, cfg.tiempo_entrega_urgente, user?.tenant.id]);

  if (!user || user.tenant.id === '__loading__') return null;
  const { tenant, empleado } = user;

  const filtrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    c.telefono.includes(clienteSearch),
  );

  // Cálculo detallado de ITBIS
  const itbisRate = (cfg.itbis_porcentaje || 0) / 100;

  // Separar montos gravables y exentos
  const itemsGravables = items.filter(it => !it.is_exento);
  const itemsExentos = items.filter(it => it.is_exento);

  const subtotalGravableBase = itemsGravables.reduce((s, it) => s + it.cantidad * it.precio_unitario, 0);
  const subtotalExentoBase = itemsExentos.reduce((s, it) => s + it.cantidad * it.precio_unitario, 0);

  const costoServicios = servicios.filter(s => serviciosSel.includes(s.nombre)).reduce((acc, s) => acc + s.precio, 0);

  // El recargo de urgencia se aplica al subtotal base de prendas más el costo de los servicios
  const recargoTotal = esUrgente ? (subtotalGravableBase + subtotalExentoBase + costoServicios) * (cfg.recargo_urgencia / 100) : 0;

  // Costo de domicilio (se agrega al final, no entra en la base gravable de ITBIS por ser un servicio de entrega)
  const costoEnvio = servicioDomicilio ? costoDomicilio : 0;

  // Proporción del recargo que es gravable (si hay items exentos, el recargo suele ser gravable igual por ser un servicio, 
  // pero para ser conservadores en este flujo lo sumamos a la base gravable total)
  const baseParaItbis = subtotalGravableBase + costoServicios + recargoTotal;

  let itbis = 0;
  let total = 0;
  let subtotal = subtotalGravableBase + subtotalExentoBase + costoServicios + recargoTotal;

  // Aliases for missing variables in UI
  const subtotalBase = subtotalGravableBase + subtotalExentoBase;
  const subtotalBruto = subtotal;
  const recargo = recargoTotal;

  if (cfg.ncf_facturacion_activa && aplicarItbis && itbisRate > 0) {
    if (cfg.itbis_incluido) {
      // ITBIS ya está en los precios. 
      // Calculamos cuánto de la base gravable es ITBIS
      const baseSinItbis = +(baseParaItbis / (1 + itbisRate)).toFixed(2);
      itbis = +(baseParaItbis - baseSinItbis).toFixed(2);
      subtotal = +(baseSinItbis + subtotalExentoBase).toFixed(2);
      total = subtotal + itbis - descuento + costoEnvio;
    } else {
      // ITBIS se suma a la base gravable
      itbis = +(baseParaItbis * itbisRate).toFixed(2);
      subtotal = +(baseParaItbis + subtotalExentoBase).toFixed(2);
      total = subtotal + itbis - descuento + costoEnvio;
    }
  } else {
    // Sin facturación fiscal o ITBIS desactivado
    total = subtotal - descuento + costoEnvio;
  }

  const vuelto = metodo === "EFECTIVO" && recibido > total ? recibido - total : 0;
  const faltante = metodo === "EFECTIVO" && recibido > 0 && recibido < total ? total - recibido : 0;

  function addItem(it: OrdenItem) {
    setItems((arr) => {
      const idx = arr.findIndex(x => x.descripcion === it.descripcion && x.precio_unitario === it.precio_unitario);
      if (idx > -1) {
        return arr.map((item, i) => i === idx ? { ...item, cantidad: item.cantidad + it.cantidad } : item);
      }
      return [...arr, it];
    });
  }
  function removeItem(i: number) { setItems((arr) => arr.filter((_, idx) => idx !== i)); }
  function addItemDesglose(it: OrdenItem) {
    if (indexDesglose === null) return;
    setItems((arr) => {
      const idx = arr.findIndex(x => x.descripcion === it.descripcion && x.precio_unitario === it.precio_unitario);
      if (idx > -1) {
        return arr.map((item, i) => i === idx ? { ...item, cantidad: item.cantidad + it.cantidad } : item);
      }
      
      const result = [...arr];
      if (indexDesglose === -1) {
        return [...result, it];
      }
      result.splice(indexDesglose + 1, 0, it);
      return result;
    });
    toast.success(`${it.descripcion.replace('↳ ', '')} agregada al desglose`);
  }
  function updateItemQuantity(i: number, delta: number) {
    setItems((arr) => arr.map((it, idx) => {
      if (idx !== i) return it;
      const newQty = Math.max(1, it.cantidad + delta);
      return { ...it, cantidad: newQty };
    }));
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.error(`Error al activar pantalla completa: ${e.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };



  async function onCrearOrden() {
    if (limits?.ordersReached) { setShowLimitModal(true); return; }
    if (!cliente) { toast.error("Selecciona un cliente"); return; }
    if (items.length === 0) { toast.error("Agrega al menos una prenda"); return; }
    if ((metodo !== "CREDITO" || abonoCredito > 0) && !caja) {
      toast.error("Abre la caja antes de registrar un pago");
      return;
    }
    if (metodo === "EFECTIVO" && recibido < total) { toast.error("El monto recibido es menor al total"); return; }
    if (metodo === "CREDITO" && abonoCredito >= total) {
      toast.error("El abono debe ser menor al total. Si desea pagar completo, cambie el método de pago.");
      return;
    }

    try {
      const pagado = metodo === "CREDITO" ? abonoCredito : total;
      const saldo = total - pagado;

      const numero = await nextOrdenNumero(tenant.id);

      // Calcular la fecha final de entrega combinando el día del input con la hora calculada
      const deliveryDate = new Date(fechaEntrega || new Date());

      const horasAdd = esUrgente ? (cfg.tiempo_entrega_urgente || 3) : (cfg.tiempo_entrega_estandar || 24);
      const now = new Date();
      now.setHours(now.getHours() + horasAdd);
      deliveryDate.setHours(now.getHours(), now.getMinutes(), 0, 0);

      const isElectronic = !!fiscalConfig?.is_active;
      const activeTipo = isElectronic
        ? (tipoECF.startsWith('E') ? tipoECF : (tipoECF === 'B01' ? 'E31' : 'E32'))
        : (tipoECF.startsWith('B') ? tipoECF : (tipoECF === 'E31' ? 'B01' : 'B02'));

      let ncfVencimiento: string | undefined = undefined;
      let finalNCF: string | undefined = undefined;

      if (cfg.ncf_facturacion_activa && !isElectronic) {
        try {
          const { ncf: nextNCF, expiration_date } = await nextECFNumero(tenant.id, activeTipo);
          finalNCF = nextNCF;
          ncfVencimiento = expiration_date;
        } catch (seqErr) {
          console.log("No dynamic sequence for traditional NCF, falling back to legacy sequence.");
          finalNCF = `${cfg.ncf_secuencia || 'B02'}${String(cfg.ncf_proximo || 1).padStart(8, "0")}`;
          // Incrementar secuencia global heredada
          await saveTenant({
            ...tenant,
            config: {
              ...cfg,
              ncf_proximo: (cfg.ncf_proximo || 1) + 1
            }
          });
        }
      }

      const orden: Orden = {
        id: uid("ord"),
        tenant_id: tenant.id,
        numero,
        cliente_id: cliente.id,
        empleado_id: empleado.id,
        servicios: serviciosSel,
        items,
        subtotal: +subtotal.toFixed(2),
        itbis,
        descuento,
        total,
        pagado,
        saldo,
        metodo_pago: metodo,
        estado: "RECIBIDA",
        fecha_entrega: deliveryDate.toISOString(),
        es_urgente: esUrgente,
        notas: notas || undefined,
        creado_en: new Date().toISOString(),
        ncf: finalNCF,
        ncf_vencimiento: ncfVencimiento,
        entrega_domicilio: servicioDomicilio || undefined,
        costo_envio: servicioDomicilio && costoEnvio > 0 ? costoEnvio : undefined,
      };

      // --- LOGICA FISCAL ELECTRONICA (Pronesoft) ---
      let ordenActualizada = { ...orden };
      if (isElectronic && activeTipo) {
        try {
          let nextNCF: string | undefined = undefined;

          // En Sandbox de Pronesoft, las secuencias se generan automáticamente.
          // En Producción, gestionamos las secuencias localmente en Klynn.
          if (fiscalConfig?.ambiente === 'produccion') {
            const { ncf, expiration_date } = await nextECFNumero(tenant.id, activeTipo);
            nextNCF = ncf;
            ncfVencimiento = expiration_date;
          }

          const result = await emitirECF(
            { ...orden, ncf: nextNCF }, // Pasamos el NCF generado (o undefined en Sandbox)
            cliente,
            fiscalConfig?.pronesoft_tenant_id,
            cfg,
            tenant,
            activeTipo
          );

          const fiscalFields = {
            ncf: result.encf,
            tipo_ecf: activeTipo,
            ecf_id: result.document.id,
            ecf_qr: result.stamp_url || result.document.document_stamp_url || '',
            ecf_security_code: result.security_code || '',
            ecf_signature_date: result.document.signature_date || new Date().toISOString(),
            ncf_vencimiento: ncfVencimiento,
          };

          ordenActualizada = { ...orden, ...fiscalFields };
          await saveOrden(ordenActualizada);
          toast.success(`✅ Comprobante ${result.encf} emitido`);
        } catch (fErr: any) {
          console.error("Error Fiscal:", fErr);
          toast.error("Error al generar comprobante: " + fErr.message);
          await saveOrden(orden);
        }
      } else {
        await saveOrden(orden);
      }

      // Registrar movimiento de caja si se recibió un pago (ventas normales o abono de crédito)
      if ((metodo !== "CREDITO" || abonoCredito > 0) && caja) {
        const montoMov = metodo === "CREDITO" ? abonoCredito : total;
        await saveMovimiento({
          id: uid("mov"),
          tenant_id: tenant.id,
          caja_id: caja.id,
          empleado_id: empleado.id,
          tipo: "VENTA",
          concepto: metodo === "CREDITO"
            ? `Abono inicial orden #${ordenActualizada.numero}`
            : `Venta orden #${ordenActualizada.numero}`,
          monto: montoMov,
          metodo: metodo === "CREDITO" ? "EFECTIVO" : metodo,
          orden_id: ordenActualizada.id,
          creado_en: new Date().toISOString(),
        });
      }

      setCreada({ ...ordenActualizada });
      setShowTicket(true);
      toast.success(`Orden ${ordenActualizada.numero} creada ✅`);

      if (cliente && servicioDomicilio && direccionDomicilio.trim() && direccionDomicilio !== cliente.direccion) {
        await saveCliente({ ...cliente, direccion: direccionDomicilio.trim() });
      }

      if (cliente) {
        queryClient.invalidateQueries({ queryKey: ['ordenes', tenantId] });
        queryClient.invalidateQueries({ queryKey: ['movimientos', tenantId] });
        import("@/lib/whatsapp").then(({ notificarWhatsApp }) =>
          notificarWhatsApp(tenant, cliente, ordenActualizada, "creada", recibido).then((r) => {
            if (r.ok) toast.success("WhatsApp enviado al cliente ✅");
          }),
        );
      }
    } catch (err: any) {
      toast.error("Error al crear la orden: " + err.message);
    }
  }

  function next() {
    if (limits?.ordersReached) { setShowLimitModal(true); return; }
    if (step === 1 && !cliente) { toast.error("Selecciona un cliente"); return; }
    if (step === 2 && serviciosSel.length === 0) { toast.error("Selecciona al menos un servicio"); return; }
    if (step === 3 && items.length === 0) { toast.error("Agrega al menos una prenda"); return; }
    setStep((s) => Math.min(5, s + 1));
  }

  return (
    <div className={`mx-auto w-full px-4 md:px-6 ${isPosMode ? "max-w-none h-[calc(100vh-100px)] flex flex-col" : "max-w-6xl"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 flex-1">
          <PageHeader title={isPosMode ? "Terminal POS" : "Nueva orden"} description={isPosMode ? "Venta rápida" : `Paso ${step} de 5`} />
          {isPosMode && (
            <div className="relative w-72 max-w-md animate-in fade-in slide-in-from-left-4 duration-500">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                value={posSearch}
                onChange={(e) => setPosSearch(e.target.value)}
                placeholder="Buscar prenda o servicio..."
                className="pl-10 h-10 bg-accent/30 border-primary/5 focus-visible:ring-primary/20 rounded-xl shadow-inner border-0"
              />
              {posSearch && (
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-transparent" onClick={() => setPosSearch("")}>
                  <X className="h-3.5 w-3.5 text-muted-foreground/30" />
                </Button>
              )}
            </div>
          )}
          {isPosMode && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4 duration-500 delay-150">
              <Button
                size="sm"
                onClick={() => setShowDeliveryPOS(true)}
                className={`rounded-md px-4 font-bold transition-all border-none bg-teal-600 text-white shadow-glow hover:bg-teal-700`}
              >
                <Truck className="mr-2 h-4 w-4" />
                {servicioDomicilio ? "Envío activo" : "Envío a domicilio"}
              </Button>
              <Button
                size="sm"
                onClick={() => setShowDiscountPOS(true)}
                className={`rounded-md px-4 font-bold transition-all border-none bg-slate-600 text-white shadow-glow hover:bg-slate-700`}
              >
                <Plus className="mr-2 h-4 w-4" />
                {descuento > 0 ? `Desc. RD$${descuento}` : "Descuento"}
              </Button>

              <div className="flex items-center gap-3 px-3 h-9 rounded-md bg-card border border-primary/10 shadow-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-4 w-4 ${esUrgente ? "text-amber-500" : "text-muted-foreground/40"}`} />
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${esUrgente ? "text-amber-600" : "text-muted-foreground/60"}`}>Urgente</span>
                </div>
                <Switch checked={esUrgente} onCheckedChange={setEsUrgente} className="scale-[0.65] origin-right" />
              </div>

              <DeliveryPOSDialog
                open={showDeliveryPOS}
                onOpenChange={setShowDeliveryPOS}
                enabled={servicioDomicilio}
                setEnabled={setServicioDomicilio}
                address={direccionDomicilio}
                setAddress={setDireccionDomicilio}
                cost={costoDomicilio}
                setCost={setCostoDomicilio}
              />

              <DiscountPOSDialog
                open={showDiscountPOS}
                onOpenChange={setShowDiscountPOS}
                discount={descuento}
                setDiscount={setDescuento}
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isPosMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsPosMode(!isPosMode)}
            className={isPosMode ? "bg-primary text-white shadow-glow" : ""}
          >
            {isPosMode ? <List className="mr-2 h-4 w-4" /> : <LayoutGrid className="mr-2 h-4 w-4" />}
            {isPosMode ? "Modo Clásico" : "Modo POS"}
          </Button>
          {isPosMode && (
            <Button variant="outline" size="sm" onClick={toggleFullscreen}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {!caja && (
        <Card className="mb-4 flex items-center gap-3 border-warning/40 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="h-5 w-5 text-warning" />
          La caja está cerrada. Solo podrás registrar órdenes en crédito.
        </Card>
      )}

      {isPosMode ? (
        <div className="flex flex-1 gap-6 overflow-hidden min-h-[600px]">
          {/* CATALOG GRID */}
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            <div className="flex flex-col gap-3 pb-2 border-b border-border/40 mb-2">
              {/* Filtro Principal de 3 Pestañas */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "TODOS", label: "Todos", icon: "🌟" },
                  { id: "SERVICIOS", label: "Servicios", icon: "🧺" },
                  { id: "PRENDAS", label: "Prendas", icon: "👕" }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setPosFilterTab(tab.id as any);
                      if (tab.id === "PRENDAS") {
                        setActiveCategory("TODAS LAS PRENDAS");
                      } else {
                        setActiveCategory("TODOS");
                      }
                    }}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-95 border-2 shadow-sm ${
                      posFilterTab === tab.id
                        ? "bg-primary text-white border-primary shadow-glow ring-2 ring-primary/20"
                        : "bg-card text-muted-foreground hover:bg-primary/5 hover:border-primary/20 border-border/60"
                    }`}
                  >
                    <span className="text-sm">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Sub-filtro de Categorías de Prendas */}
              {posFilterTab === "PRENDAS" && (
                <div className="flex flex-wrap items-center gap-1.5 pt-2 animate-in slide-in-from-top-1 duration-200">
                  {categoriesPrendas.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all shadow-sm border ${
                        activeCategory === cat
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-card text-muted-foreground hover:bg-accent border-border/50"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8">
              {step === 5 ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-display font-bold text-foreground">Panel de Cobro</h2>
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => setStep(2)} className="bg-primary text-white shadow-glow hover:bg-primary/90 transition-all active:scale-95 rounded-md px-4 font-bold border-none">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Volver al catálogo
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
                    {[
                      { id: "EFECTIVO", label: "Efectivo", icon: "💵" },
                      { id: "TARJETA", label: "Tarjeta", icon: "💳" },
                      { id: "TRANSFERENCIA", label: "Transf.", icon: "🏦" },
                      { id: "CREDITO", label: "Crédito", icon: "📝" }
                    ].map((m) => (
                      <button key={m.id} onClick={() => setMetodo(m.id as MetodoPago)}
                        className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all active:scale-95 ${metodo === m.id
                            ? "border-primary bg-primary/5 ring-1 ring-primary shadow-glow"
                            : "border-border bg-card hover:border-primary/40"
                          }`}>
                        <span className="text-2xl">{m.icon}</span>
                        <div className="font-bold text-sm uppercase tracking-tight">{m.label}</div>
                        {metodo === m.id && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />}
                      </button>
                    ))}
                  </div>
                  {cfg.ncf_facturacion_activa && (
                    <div className="mb-4 p-4 rounded-2xl border-2 border-primary/10 bg-primary/5">
                      <Label className="text-xs font-black uppercase tracking-widest text-primary mb-2 block">Tipo de Comprobante Fiscal</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setTipoECF(isElectronic ? "E32" : "B02")}
                          className={`py-2 px-4 rounded-xl font-bold text-xs transition-all ${(tipoECF === "E32" || tipoECF === "B02") ? "bg-primary text-white" : "bg-background border border-border"}`}
                        >
                          CONSUMO ({isElectronic ? "E32" : "B02"})
                        </button>
                        <button
                          onClick={() => setTipoECF(isElectronic ? "E31" : "B01")}
                          className={`py-2 px-4 rounded-xl font-bold text-xs transition-all ${(tipoECF === "E31" || tipoECF === "B01") ? "bg-primary text-white" : "bg-background border border-border"}`}
                        >
                          CRÉDITO FISCAL ({isElectronic ? "E31" : "B01"})
                        </button>
                      </div>
                      {(tipoECF === "E31" || tipoECF === "B01") && !cliente?.cedula && (
                        <p className="mt-2 text-[10px] text-destructive font-bold flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> El cliente debe tener RNC/Cédula para Crédito Fiscal.
                        </p>
                      )}
                    </div>
                  )}

                  {metodo === "EFECTIVO" && (
                    <div className="rounded-3xl border-2 border-border/60 bg-accent/5 p-4 mb-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                        <Field label="Monto recibido">
                          <div className="relative h-24">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-2xl text-muted-foreground/50">RD$</span>
                            <Input
                              className="!h-full pl-24 !text-5xl font-black font-display bg-background border-2 border-primary/20 focus-visible:ring-primary/30 rounded-2xl"
                              value={recibido ? formatAmountInput(String(recibido)) : ""}
                              onChange={(e) => {
                                const val = parseAmount(e.target.value);
                                if (val > 100000000) return; // Limitar a 100M por cordura
                                setRecibido(val);
                              }}
                              placeholder="0.00"
                            />
                          </div>
                        </Field>

                        <div className={`flex flex-col items-center justify-center h-28 px-4 rounded-2xl border-2 transition-all duration-300 ${faltante > 0
                            ? "bg-destructive/5 border-destructive/30 text-destructive animate-pulse"
                            : "bg-emerald-500/5 border-emerald-500/30 text-emerald-600"
                          }`}>
                          <div className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1 text-center">
                            {faltante > 0 ? "Faltante" : "Vuelto a entregar"}
                          </div>
                          <div className={`font-display font-black text-center break-all leading-tight ${(faltante > 0 ? faltante : vuelto) > 9999999 ? "text-xl" :
                              (faltante > 0 ? faltante : vuelto) > 999999 ? "text-2xl" : "text-4xl"
                            }`}>
                            {formatRD(faltante > 0 ? faltante : vuelto)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {metodo === "CREDITO" && (
                    <div className="space-y-4 mb-4">
                      <div className="flex items-center gap-4 rounded-xl border border-warning/40 bg-warning/5 p-4 text-warning-foreground">
                        <AlertTriangle className="h-8 w-8 text-warning shrink-0" />
                        <div>
                          <strong className="block text-lg">Venta a crédito</strong>
                          Se registrará en el balance de <span className="font-bold">{cliente?.nombre}</span>.
                        </div>
                      </div>

                      {/* --- CREDIT LIMIT CARD --- */}
                      <div className="rounded-[1.75rem] border border-amber-200 bg-amber-500/[0.03] p-5 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center gap-2 mb-4">
                          <Timer className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                          <span className="text-[11px] font-black uppercase tracking-[0.08em] text-amber-800">
                            PLAZO DE CRÉDITO (DÍAS DE VENCIMIENTO)
                          </span>
                        </div>
                        <div className="grid grid-cols-6 gap-2.5">
                          {OPCIONES_CREDITO.map((op) => (
                            <button
                              key={op.dias}
                              type="button"
                              onClick={() => actualizarLimiteDias(op.dias)}
                              className={`relative flex flex-col items-center justify-center py-3.5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${
                                limiteDiasSel === op.dias
                                  ? "border-amber-500 bg-amber-500/[0.05] text-amber-700 font-bold scale-[1.03] shadow-sm ring-1 ring-amber-500/20"
                                  : "border-border bg-card text-muted-foreground hover:border-amber-400 hover:bg-amber-500/5 shadow-sm"
                              }`}
                            >
                              <span className={`text-xl font-display font-black leading-none mb-1 ${
                                limiteDiasSel === op.dias ? "text-amber-700" : "text-foreground"
                              }`}>{op.dias}</span>
                              <span className={`text-[9px] font-black uppercase tracking-wider leading-none ${
                                limiteDiasSel === op.dias ? "text-amber-600" : "text-muted-foreground"
                              }`}>DÍAS</span>
                              {limiteDiasSel === op.dias && (
                                <span className="absolute -top-1 right-6 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-background shadow" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-3xl border-2 border-warning/20 bg-warning/5 p-4 animate-in fade-in slide-in-from-top-1 duration-200">
                        <Label className="mb-2 block text-xs font-black uppercase tracking-widest text-amber-600">
                          ¿Monto a abonar inicialmente? (Opcional)
                        </Label>
                        <div className="relative h-20">
                          <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-xl text-amber-600/40">RD$</span>
                          <Input
                            className="!h-full pl-20 !text-4xl font-black font-display bg-background border-2 border-warning/20 focus-visible:ring-warning/30 rounded-2xl text-amber-700 font-bold"
                            value={abonoCredito ? formatAmountInput(String(abonoCredito)) : ""}
                            onChange={(e) => {
                              const val = parseAmount(e.target.value);
                              if (val > total) {
                                toast.warning("El abono no puede exceder el total de la orden");
                                return;
                              }
                              setAbonoCredito(val);
                            }}
                            placeholder="0.00"
                          />
                        </div>
                        <p className="mt-2 text-xs text-amber-600/70 font-medium">
                          El monto abonado se registrará en la caja activa. El saldo restante (<strong>{formatRD(total - abonoCredito)}</strong>) irá al balance de <strong>{cliente?.nombre}</strong>.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center px-4 pb-4">
                    <Button
                      size="lg"
                      className="w-full md:max-w-md h-14 text-base tracking-wide rounded-[1.25rem] font-bold bg-[#16A34A] hover:bg-[#15803D] text-white hover:-translate-y-0.5 transition-all shadow-none"
                      onClick={onCrearOrden}
                      disabled={metodo === "EFECTIVO" && faltante > 0}
                    >
                      <CheckCircle2 className="mr-2 h-5 w-5" /> CONFIRMAR Y CREAR ORDEN
                    </Button>
                  </div>
                </div>
              ) : (step === 1 && !cliente) ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-display font-bold">Seleccionar Cliente</h2>
                      <p className="text-sm text-muted-foreground">Busca un cliente existente o registra uno nuevo.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm transition-all active:scale-95" size="sm" onClick={() => setShowNewCliente(true)}>
                        <UserPlus className="mr-2 h-4 w-4" /> Nuevo cliente
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre o teléfono..."
                      className="pl-12 h-14 text-lg bg-card rounded-2xl shadow-sm border-primary/10"
                      value={clienteSearch}
                      onChange={(e) => setClienteSearch(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {validTipos.map((tipo) => {
                      const isConsumo = tipo === "E32" || tipo === "B02";
                      const isCredito = tipo === "E31" || tipo === "B01";
                      const name = NCF_NOMBRES[tipo.substring(0,3)]?.replace("FISCAL", "")?.trim() || "Empresa";
                      
                      const label = isConsumo ? "Consumidor Final" : (isCredito ? "Empresa / RNC" : name);
                      const subLabel = isConsumo ? "Para Factura de Consumo" : (isCredito ? "Para Crédito Fiscal" : `Para Comprobante ${tipo}`);
                      const Icon = isConsumo ? UserIcon : (isCredito ? Truck : Building);

                      let colorClass = "";
                      let bgIconClass = "";
                      let iconColorClass = "";
                      let textClass = "";

                      if (isConsumo) {
                         colorClass = tipoECF === tipo ? "border-primary bg-primary/20 ring-1 ring-primary shadow-sm" : "border-dashed border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40";
                         bgIconClass = "bg-primary/20";
                         iconColorClass = "text-primary";
                         textClass = "text-primary";
                      } else if (isCredito) {
                         colorClass = tipoECF === tipo ? "border-blue-600 bg-blue-50/80 ring-1 ring-blue-600 shadow-sm" : "border-dashed border-blue-200 bg-blue-50/50 hover:bg-blue-100/50 hover:border-blue-400";
                         bgIconClass = "bg-blue-100";
                         iconColorClass = "text-blue-600";
                         textClass = "text-blue-700";
                      } else {
                         colorClass = tipoECF === tipo ? "border-amber-600 bg-amber-50/80 ring-1 ring-amber-600 shadow-sm" : "border-dashed border-amber-200 bg-amber-50/50 hover:bg-amber-100/50 hover:border-amber-400";
                         bgIconClass = "bg-amber-100";
                         iconColorClass = "text-amber-600";
                         textClass = "text-amber-700";
                      }

                      if (!isConsumo && !((plans.find(p => p.id === user.tenant.plan_id) || getTenantPlan(user.tenant)).modulos.facturacion_fiscal)) {
                        return null;
                      }

                      return (
                        <button 
                          key={tipo}
                          onClick={() => {
                            setTipoECF(tipo);
                            if (isConsumo) {
                              handleSelectGeneric("Persona");
                            } else {
                              setEmpresaDialogOpen(true);
                            }
                          }}
                          className={`flex items-center gap-4 p-5 rounded-[2rem] border-2 transition-all group text-left ${colorClass}`}
                        >
                          <div className={`h-12 w-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${bgIconClass}`}>
                            <Icon className={`h-6 w-6 ${iconColorClass}`} />
                          </div>
                          <div>
                            <div className={`font-bold text-lg leading-tight ${textClass}`}>{label}</div>
                            <div className="text-[10px] uppercase tracking-widest font-black opacity-60">{subLabel}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-2 mb-4">O busca en tu base de datos</div>

                  <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                    {clientes.filter(c =>
                      c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
                      (c.apellido && c.apellido.toLowerCase().includes(clienteSearch.toLowerCase())) ||
                      c.telefono.includes(clienteSearch)
                    ).map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setCliente(c); setStep(2); }}
                        className="flex items-center justify-between p-4 rounded-2xl border-2 border-border hover:border-primary/40 hover:bg-primary/5 transition-all group"
                      >
                        <div className="flex items-center gap-4 text-left">
                          <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center font-bold text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                            {c.nombre.charAt(0)}{c.apellido?.charAt(0) || ""}
                          </div>
                          <div>
                            <div className="font-bold text-lg">{c.nombre} {c.apellido || ""}</div>
                            <div className="text-sm text-muted-foreground">{c.telefono}</div>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </button>
                    ))}
                  </div>
                  <ClienteDialog open={showNewCliente} onOpenChange={setShowNewCliente} tenant={user.tenant} onDone={(c) => { if (c) { setCliente(c); setStep(2); } setShowNewCliente(false); }} />
                </div>
              ) : (
                <>
                  {/* SECCION SERVICIOS */}
                  {(posFilterTab === "TODOS" || posFilterTab === "SERVICIOS" || posSearch) && servicesFiltered.length > 0 && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <div className="h-4 w-1 bg-primary rounded-full" />
                        Servicios
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {servicesFiltered.map(s => {
                          const sel = serviciosSel.includes(s.nombre);
                          return (
                            <button
                              key={s.id}
                              onClick={() => setServiciosSel((arr) => sel ? arr.filter((x) => x !== s.nombre) : [...arr, s.nombre])}
                              className={`group relative flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all active:scale-95 text-center ${sel ? "border-primary bg-primary/10 shadow-glow" : "border-transparent bg-card hover:border-primary/40 hover:bg-primary/5 hover:shadow-elegant"
                                }`}
                            >
                              {s.imagen_url ? (
                                <div className="h-24 w-24 rounded-2xl bg-white shadow-md overflow-hidden ring-2 ring-white/20">
                                  <img src={s.imagen_url} alt={s.nombre} className="h-full w-full object-cover" />
                                </div>
                              ) : (
                                <div className={`flex h-24 w-24 items-center justify-center rounded-2xl text-4xl transition-colors ${sel ? "bg-primary text-white" : "bg-accent/30"}`}>
                                  {s.icono || "🧺"}
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-bold leading-tight line-clamp-2">{s.nombre}</div>
                                {s.precio > 0 && <div className="mt-1 text-xs font-black text-primary">+{formatRD(s.precio)}</div>}
                              </div>
                              {sel && (
                                <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-glow">
                                  <Check className="h-3 w-3" />
                                </div>
                              )}
                              <Badge className="absolute top-2 left-2 text-[7px] font-normal uppercase px-1.5 py-0 bg-primary text-white border-none shadow-sm pointer-events-none ring-1 ring-white/20">Servicio</Badge>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SECCIONES DE CATEGORIAS DE PRENDAS */}
                  {(posFilterTab === "TODOS" || posFilterTab === "PRENDAS" || posSearch) && Array.from(new Set(catalogFiltered.map(c => c.categoria || "Otros"))).map(catName => {
                    const itemsInCat = catalogFiltered.filter(c => (c.categoria || "Otros") === catName);
                    if (itemsInCat.length === 0) return null;

                    return (
                      <div key={catName} className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <div className="h-4 w-1 bg-primary rounded-full" />
                          {catName}
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                          {itemsInCat.map(item => (
                            <button
                              key={item.id}
                              onClick={() => addItem({
                                descripcion: item.nombre,
                                cantidad: 1,
                                precio_unitario: item.precio,
                                es_libra: item.por_libra,
                                is_exento: item.is_exento
                              })}
                              className="group relative flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 border-border bg-card hover:border-primary/40 hover:bg-primary/5 hover:shadow-elegant transition-all active:scale-95 text-center"
                            >
                              {item.imagen_url ? (
                                <div className="h-24 w-24 rounded-2xl bg-white shadow-md overflow-hidden group-hover:scale-105 transition-transform duration-300">
                                  <img src={item.imagen_url} alt={item.nombre} className="h-full w-full object-cover" />
                                </div>
                              ) : (
                                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-accent/30 text-4xl group-hover:bg-primary/10 transition-colors">
                                  {item.icono || "👕"}
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-bold leading-tight line-clamp-2">{item.nombre}</div>
                                <div className="mt-1 text-xs font-black text-primary">{formatRD(item.precio)}</div>
                              </div>
                              {items.some(it => it.descripcion === item.nombre) && (
                                <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold shadow-glow animate-in zoom-in duration-200">
                                  {items.filter(it => it.descripcion === item.nombre).reduce((acc, it) => acc + it.cantidad, 0)}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* SIDEBAR ORDER */}
          <Card className="w-80 md:w-96 flex flex-col overflow-hidden border-2 border-primary/10 shadow-elegant rounded-3xl">
            {/* Header: Cliente */}
            <div className="p-4 border-b bg-accent/5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-black uppercase tracking-widest text-muted-foreground/70">Orden</div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => { setItems([]); setServiciosSel(["Lavado y secado"]); setCliente(null); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {!cliente && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={() => { setStep(1); }}>
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              {cliente ? (
                <div className="flex items-center justify-between bg-background p-3 rounded-xl border border-primary/20 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold">
                      {cliente.nombre.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-bold">{cliente.nombre}</div>
                      <div className="text-[10px] text-muted-foreground">{cliente.telefono}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCliente(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="py-2">
                  <Button variant="outline" className="w-full justify-start h-12 bg-accent/20 border-primary/10 hover:bg-primary/5 hover:border-primary/30 transition-all rounded-xl" onClick={() => { setStep(1); }}>
                    <Search className="mr-2 h-3 w-3" /> Seleccionar cliente...
                  </Button>
                </div>
              )}
            </div>

            {/* List: Items */}
            <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {serviciosSel.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4 border-b border-primary/10 pb-3">
                  {serviciosSel.map(sName => (
                    <Badge key={sName} variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold py-0.5">
                      {sName}
                    </Badge>
                  ))}
                </div>
              )}
              {items.length === 0 && serviciosSel.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-10">
                  <ShoppingCart className="h-10 w-10 mb-2" />
                  <p className="text-xs font-medium">Carrito vacío</p>
                </div>
              ) : (
                <>
                  {/* Servicios Seleccionados en Carrito POS */}
                  {servicios.filter(s => serviciosSel.includes(s.nombre)).map((srv, idx) => (
                    <div key={'pos-srv-'+idx} className="flex flex-col gap-1.5 p-2.5 rounded-xl border border-primary/20 bg-primary/5 mb-3 transition-all animate-in fade-in duration-200">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-primary leading-tight flex-1">
                          <span>🧺</span>
                          <span className="line-clamp-1">Servicio: {srv.nombre}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-destructive hover:bg-rose-50 rounded-md shrink-0"
                          onClick={() => setServiciosSel(prev => prev.filter(x => x !== srv.nombre))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex justify-between items-center">
                        {srv.permitir_desglose ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[9px] font-black uppercase text-primary hover:bg-primary/10 rounded-md gap-1"
                            onClick={() => {
                              setIndexDesglose(-1);
                              setShowDesgloseDialog(true);
                            }}
                          >
                            <Plus className="h-2.5 w-2.5" /> Detalle
                          </Button>
                        ) : <div />}
                        <div className="text-xs font-black text-primary">
                          {formatRD(srv.precio || 0)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Prendas (Items) */}
                  {items.map((it, i) => {
                    const isDetail = it.descripcion.startsWith("↳");
                    const catalogMatch = catalogo.find(c => c.nombre === it.descripcion);
                    return (
                      <div key={i} className={`flex flex-col gap-1.5 p-2.5 rounded-xl border transition-all ${
                        isDetail ? "bg-accent/5 ml-6 border-dashed border-primary/20 text-muted-foreground" : "bg-card shadow-sm hover:border-primary/25"
                      }`}>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-1.5 text-xs font-bold leading-tight flex-1">
                            {isDetail && <Shirt className="h-3 w-3 text-primary shrink-0" />}
                            <span className="line-clamp-1">{it.descripcion}{isDetail && it.cantidad > 1 ? ` (x${it.cantidad})` : ""}</span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:bg-rose-50 rounded-md" onClick={() => removeItem(i)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex justify-between items-center">
                          {isDetail ? (
                            <div className="text-[10px] font-black uppercase text-primary/80 tracking-wide flex items-center gap-1">
                              <span>🧺</span> {it.cantidad > 1 ? `${it.cantidad} Unids. en Hamper` : "En Hamper"}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="icon" className="h-6 w-6 rounded-md" onClick={() => updateItemQuantity(i, -1)}>
                                <Minus className="h-2.5 w-2.5" />
                              </Button>
                              <span className="text-xs font-bold w-5 text-center">{it.cantidad}</span>
                              <Button variant="outline" size="icon" className="h-6 w-6 rounded-md" onClick={() => updateItemQuantity(i, 1)}>
                                <Plus className="h-2.5 w-2.5" />
                              </Button>
                              
                              {catalogMatch?.permitir_desglose && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-[9px] font-black uppercase text-primary hover:bg-primary/10 rounded-md gap-1 ml-1"
                                  onClick={() => {
                                    setIndexDesglose(i);
                                    setShowDesgloseDialog(true);
                                  }}
                                >
                                  <Plus className="h-2.5 w-2.5" /> Detalle
                                </Button>
                              )}
                            </div>
                          )}
                          <div className="text-xs font-black text-primary">
                            {isDetail ? "RD$0.00" : formatRD(it.cantidad * it.precio_unitario)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Footer: Totals & Button */}
            <div className="p-4 bg-primary/5 border-t border-primary/10 space-y-2">
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground font-bold">
                  <span>SUBTOTAL</span>
                  <span>{formatRD(subtotalBruto)}</span>
                </div>
                {itbis > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground font-bold">
                    <span>ITBIS ({cfg.itbis_porcentaje}%)</span>
                    <span>{formatRD(itbis)}</span>
                  </div>
                )}
                {descuento > 0 && (
                  <div className="flex justify-between text-xs text-rose-600 font-bold">
                    <span>DESCUENTO</span>
                    <span>-{formatRD(descuento)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-primary/10">
                  <span className="text-sm font-black uppercase">Total</span>
                  <span className="text-2xl font-black text-primary">{formatRD(total)}</span>
                </div>
              </div>
              {!(isPosMode && step === 5) && (
                <Button
                  disabled={items.length === 0 || !cliente}
                  className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 text-white shadow-glow border-none transition-all active:scale-[0.98] mt-2"
                  onClick={() => { setStep(5); }}
                >
                  COBRAR <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              )}
            </div>
          </Card>
        </div>
      ) : (
        <>
          <Stepper step={step} />

          <Card className="w-full mt-6 p-6 md:p-8">
            <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="w-full">
              {step === 1 && (
                <>
                  <h2 className="mb-1 text-2xl font-display">Cliente</h2>
                  <p className="mb-5 text-sm text-muted-foreground">Busca por nombre o teléfono. Si no existe, créalo.</p>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={clienteSearch} onChange={(e) => setClienteSearch(e.target.value)} placeholder="Nombre o teléfono..." className="pl-10" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                    {validTipos.map((tipo) => {
                      const isConsumo = tipo === "E32" || tipo === "B02";
                      const isCredito = tipo === "E31" || tipo === "B01";
                      const name = NCF_NOMBRES[tipo.substring(0,3)]?.replace("FISCAL", "")?.trim() || "Empresa";
                      
                      const label = isConsumo ? "Consumidor Final" : (isCredito ? "Empresa / RNC" : name);
                      const subLabel = isConsumo ? "Factura de Consumo" : (isCredito ? "Crédito Fiscal" : `Comprobante ${tipo}`);
                      const Icon = isConsumo ? UserIcon : (isCredito ? Truck : Building);

                      let colorClass = "";
                      let bgIconClass = "";
                      let iconColorClass = "";
                      let textClass = "";

                      if (isConsumo) {
                         colorClass = tipoECF === tipo ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-dashed border-primary/20 bg-primary/5 hover:border-primary/40";
                         bgIconClass = "bg-primary/20";
                         iconColorClass = "text-primary";
                         textClass = "text-primary";
                      } else if (isCredito) {
                         colorClass = tipoECF === tipo ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600" : "border-dashed border-blue-200 bg-blue-50/50 hover:border-blue-400";
                         bgIconClass = "bg-blue-100";
                         iconColorClass = "text-blue-600";
                         textClass = "text-blue-700";
                      } else {
                         colorClass = tipoECF === tipo ? "border-amber-600 bg-amber-50 ring-1 ring-amber-600" : "border-dashed border-amber-200 bg-amber-50/50 hover:border-amber-400";
                         bgIconClass = "bg-amber-100";
                         iconColorClass = "text-amber-600";
                         textClass = "text-amber-700";
                      }

                      // We only show non-consumo buttons if billing is active
                      if (!isConsumo && !((plans.find(p => p.id === user.tenant.plan_id) || getTenantPlan(user.tenant)).modulos.facturacion_fiscal)) {
                        return null;
                      }

                      return (
                        <button 
                          key={tipo}
                          onClick={() => {
                            setTipoECF(tipo);
                            if (isConsumo) {
                              handleSelectGeneric("Persona");
                            } else {
                              setEmpresaDialogOpen(true);
                            }
                          }}
                          className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${colorClass}`}
                        >
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${bgIconClass}`}>
                            <Icon className={`h-5 w-5 ${iconColorClass}`} />
                          </div>
                          <div>
                            <div className={`font-bold text-sm leading-tight ${textClass}`}>{label}</div>
                            <div className="text-[10px] uppercase tracking-widest font-black opacity-60">{subLabel}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-8 flex items-center justify-between">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">O busca en tu base de datos</div>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm transition-all active:scale-95" size="sm" onClick={() => setShowNewCliente(true)}>
                      <UserPlus className="mr-1.5 h-4 w-4" /> Nuevo cliente
                    </Button>
                  </div>

                  <div className="mt-4 max-h-80 grid gap-3 grid-cols-1 sm:grid-cols-2 overflow-auto rounded-xl border border-border bg-accent/10 p-3">
                    {filtrados.length === 0 && <div className="col-span-full py-12 text-center text-sm text-muted-foreground">No se encontraron clientes</div>}
                    {filtrados.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setCliente(c)}
                        className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-all ${cliente?.id === c.id
                            ? "border-primary bg-primary/10 ring-1 ring-primary shadow-sm"
                            : "border-border bg-card hover:border-primary/50 hover:bg-accent/30 hover:shadow-elegant"
                          }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${cliente?.id === c.id ? "bg-primary text-white" : "bg-accent text-muted-foreground"
                            }`}>
                            {c.nombre.charAt(0)}{c.apellido?.charAt(0) || ""}
                          </div>
                          <div>
                            <div className="font-display text-base font-semibold">
                              {c.nombre} {c.apellido || ""}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" /> {c.telefono}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {c.tipo === "Empresa" ? (
                            <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-600">Empresa</Badge>
                          ) : (
                            <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">Consumidor Final</Badge>
                          )}
                          {cliente?.id === c.id && <Check className="h-5 w-5 text-primary animate-in zoom-in duration-200" />}
                        </div>
                      </button>
                    ))}
                  </div>

                  <ClienteDialog open={showNewCliente} onOpenChange={setShowNewCliente} tenant={user.tenant} onDone={(c) => { if (c) { setCliente(c); } setShowNewCliente(false); }} />
                </>
              )}

              {step === 2 && (
                <>
                  <h2 className="mb-1 text-2xl font-display">Servicios</h2>
                  <p className="mb-5 text-sm text-muted-foreground">Selecciona los servicios incluidos en esta orden.</p>
                  {servicios.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                      No hay servicios. Agrégalos en <strong>Catálogo</strong>.
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {servicios.map((s) => {
                        const sel = serviciosSel.includes(s.nombre);
                        return (
                          <button key={s.id} onClick={() => setServiciosSel((arr) => sel ? arr.filter((x) => x !== s.nombre) : [...arr, s.nombre])}
                            className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left text-sm transition ${sel ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                              }`}>
                            <div className={`flex h-5 w-5 items-center justify-center rounded border-2 ${sel ? "border-primary bg-primary text-white" : "border-border"}`}>
                              {sel && <Check className="h-3 w-3" />}
                            </div>
                            {s.imagen_url ? (
                              <img src={s.imagen_url} alt={s.nombre} className="h-8 w-8 rounded object-cover" />
                            ) : (
                              <span className="text-xl">{s.icono || "🧺"}</span>
                            )}
                            <div className="flex-1">
                              <div className="font-medium">{s.nombre}</div>
                              {s.descripcion && <div className="text-[11px] text-muted-foreground">{s.descripcion}</div>}
                              {s.precio > 0 && <div className="text-[10px] font-bold text-primary">+{formatRD(s.precio)}</div>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {step === 3 && (
                <>
                  <h2 className="mb-1 text-2xl font-display">Prendas y precios</h2>
                  <p className="mb-5 text-sm text-muted-foreground">Agrega cada prenda o desglosa los servicios contratados.</p>

                  <div className="space-y-2">
                    {/* Servicios Seleccionados para desglose */}
                    {servicios.filter(s => serviciosSel.includes(s.nombre)).map((srv, idx) => (
                      <div key={'srv-'+idx} className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 animate-in fade-in duration-200">
                        <div className="flex-1">
                          <div className="font-semibold text-primary flex items-center gap-1.5 text-sm sm:text-base">
                            <span>🧺</span> Servicio: {srv.nombre}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {srv.permitir_desglose 
                              ? "Servicio de la orden · Haz clic en \"+\" para detallar sus prendas"
                              : "Servicio de la orden"}
                          </div>
                        </div>
                        <div className="font-display text-base sm:text-lg font-bold text-primary">{formatRD(srv.precio || 0)}</div>
                        <div className="flex items-center gap-1">
                          {srv.permitir_desglose && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary hover:bg-primary/10 rounded-md"
                              title={`Desglosar prendas para el servicio ${srv.nombre}`}
                              onClick={() => {
                                setIndexDesglose(-1);
                                setShowDesgloseDialog(true);
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-rose-50 rounded-md"
                            onClick={() => setServiciosSel(prev => prev.filter(x => x !== srv.nombre))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Items normal */}
                    {items.map((it, i) => {
                      const isDetail = it.descripcion.startsWith("↳");
                      const catalogMatch = catalogo.find(c => c.nombre === it.descripcion);
                      return (
                        <div key={i} className={`flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-all ${
                          isDetail ? "bg-accent/5 ml-8 border-dashed border-primary/20 text-muted-foreground" : "bg-surface-elevated"
                        }`}>
                          <div className="flex-1">
                            <div className="font-medium flex items-center gap-2">
                              {isDetail && <Shirt className="h-3 w-3 text-primary" />}
                              {it.descripcion}{isDetail && it.cantidad > 1 ? ` (x${it.cantidad})` : ""}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {isDetail ? `${it.cantidad} ${it.cantidad > 1 ? "unidades" : "unidad"} en Hamper (Lavado Incluido)` : (it.es_libra ? `${it.cantidad} lb × ${formatRD(it.precio_unitario)}` : `${it.cantidad} unid. × ${formatRD(it.precio_unitario)}`)}
                              {it.notes || it.notas ? ` · ${it.notes || it.notas}` : ""}
                            </div>
                          </div>
                          <div className="font-display text-lg">{isDetail ? "RD$0.00" : formatRD(it.cantidad * it.precio_unitario)}</div>
                          <div className="flex items-center gap-1">
                            {!isDetail && catalogMatch?.permitir_desglose && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary hover:bg-primary/10 rounded-md"
                                title="Desglosar Ropa en Hamper / Bolsa"
                                onClick={() => {
                                  setIndexDesglose(i);
                                  setShowDesgloseDialog(true);
                                }}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      );
                    })}
                    {items.length === 0 && serviciosSel.length === 0 && <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">No hay prendas ni servicios agregados. Haz clic en "Agregar prenda".</div>}
                  </div>

                  <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm transition-all active:scale-95" onClick={() => setShowAddItem(true)}>
                    <Shirt className="mr-2 h-4 w-4" /> Agregar prenda
                  </Button>

                  <AddItemDialog
                    open={showAddItem}
                    onOpenChange={setShowAddItem}
                    catalogo={catalogo}
                    items={items}
                    onAdd={addItem}
                    onUpdateQty={updateItemQuantity}
                  />
                </>
              )}

              {step === 4 && (
                <>
                  <h2 className="mb-1 text-2xl font-display">Resumen</h2>
                  <p className="mb-5 text-sm text-muted-foreground">Revisa precios, fecha de entrega y opciones.</p>

                  <div className="space-y-1 rounded-xl border border-border/60 bg-accent/5 p-4">
                    <div className="mb-3 flex items-center gap-2 border-b border-border/40 pb-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Detalle de prendas</span>
                    </div>
                    <div className="space-y-2">
                      {items.map((it, i) => (
                        <div key={i} className="flex justify-between items-center text-sm group">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{it.descripcion}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{it.cantidad} {it.es_libra ? "lb" : "unid."}</span>
                          </div>
                          <div className="font-display font-semibold text-foreground">
                            {formatRD(it.cantidad * it.precio_unitario)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 grid-cols-1 lg:grid-cols-2">
                    <div className="space-y-3">
                      <Field label="Fecha de entrega"><DatePicker date={fechaEntrega} setDate={setFechaEntrega} /></Field>
                      <Field label="Notas">
                        <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observaciones..." rows={3} />
                      </Field>
                      <Field label="Descuento (RD$)"><Input type="number" value={descuento} onChange={(e) => setDescuento(Number(e.target.value) || 0)} /></Field>

                      <div className="rounded-lg border border-border p-3 space-y-3 bg-accent/5">
                        <label className="flex items-center justify-between cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Servicio a domicilio</span>
                          </div>
                          <Switch checked={servicioDomicilio} onCheckedChange={setServicioDomicilio} />
                        </label>

                        {servicioDomicilio && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-3">
                            <Field label="Dirección de entrega">
                              <Input
                                value={direccionDomicilio}
                                onChange={(e) => setDireccionDomicilio(e.target.value)}
                                placeholder="Calle, No., Sector..."
                                className="bg-background"
                              />
                            </Field>
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              Se guardará en la ficha del cliente si es nueva.
                            </p>
                            <Field label="Costo de envío (RD$)">
                              <Input
                                value={costoDomicilio ? formatAmountInput(String(costoDomicilio)) : ""}
                                onChange={(e) => setCostoDomicilio(parseAmount(e.target.value))}
                                placeholder="0.00"
                                className="bg-background"
                              />
                            </Field>
                          </motion.div>
                        )}
                      </div>

                      <div className="rounded-lg border border-border p-3 space-y-3 bg-accent/5">
                        <label className="flex items-center justify-between cursor-pointer">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <span className="text-sm font-medium">Urgente (+{cfg.recargo_urgencia}%)</span>
                          </div>
                          <Switch checked={esUrgente} onCheckedChange={setEsUrgente} />
                        </label>
                      </div>

                      {cfg.ncf_facturacion_activa && (
                        <div className="rounded-lg border border-border p-3 space-y-3 bg-accent/5">
                          <label className="flex items-center justify-between cursor-pointer">
                            <div className="flex items-center gap-2">
                              <Badge className="h-4 w-4 px-0 justify-center bg-primary/20 text-primary hover:bg-primary/20 border-none text-[10px]">Tax</Badge>
                              <span className="text-sm font-medium">Aplicar ITBIS {cfg.itbis_porcentaje}%</span>
                            </div>
                            <Switch checked={aplicarItbis} onCheckedChange={setAplicarItbis} />
                          </label>
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6">
                      <div className="space-y-4 text-center">
                        <div className="space-y-1">
                          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Subtotal prendas</div>
                          <div className="text-2xl font-display font-bold">{formatRD(subtotalBase)}</div>
                        </div>

                        {costoServicios > 0 && (
                          <div className="space-y-1">
                            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Costo servicios</div>
                            <div className="text-2xl font-display font-bold text-primary/80">{formatRD(costoServicios)}</div>
                          </div>
                        )}

                        {esUrgente && (
                          <div className="text-xs font-bold text-warning uppercase">
                            + {formatRD(recargo)} Recargo Urgencia
                          </div>
                        )}

                        {servicioDomicilio && costoEnvio > 0 && (
                          <div className="flex items-center justify-center gap-1 text-xs font-bold text-teal-600 uppercase">
                            <Truck className="h-3 w-3" />
                            + {formatRD(costoEnvio)} Envío a domicilio
                          </div>
                        )}

                        <div className="pt-4 border-t border-primary/20">
                          <div className="text-xs uppercase tracking-wider text-primary font-bold">Total a pagar</div>
                          <div className="mt-2 text-5xl font-display font-black text-primary animate-in zoom-in duration-300">
                            {formatRD(total)}
                          </div>
                        </div>

                        {descuento > 0 && (
                          <div className="text-sm font-bold text-destructive">
                            Descuento aplicado: -{formatRD(descuento)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {step === 5 && (
                <>
                  <div className="flex flex-col items-center text-center mb-10 mt-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-2">Total a cobrar</span>
                    <div className="text-6xl font-display font-black text-primary tracking-tight">
                      {formatRD(total)}
                    </div>
                    <div className="mt-6 w-16 h-1 bg-primary/10 rounded-full mb-6"></div>
                    <p className="text-sm font-bold text-muted-foreground/80">Selecciona el método de pago</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { id: "EFECTIVO", label: "Efectivo", icon: "💵" },
                      { id: "TARJETA", label: "Tarjeta", icon: "💳" },
                      { id: "TRANSFERENCIA", label: "Transf.", icon: "🏦" },
                      { id: "CREDITO", label: "Crédito", icon: "📝" }
                    ].map((m) => (
                      <button key={m.id} onClick={() => setMetodo(m.id as MetodoPago)}
                        className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all active:scale-95 ${metodo === m.id
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border bg-card hover:border-primary/40"
                          }`}>
                        <span className="text-2xl">{m.icon}</span>
                        <div className="font-bold text-sm uppercase tracking-tight">{m.label}</div>
                        {metodo === m.id && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />}
                      </button>
                    ))}
                  </div>

                  {cfg.ncf_facturacion_activa && (
                    <div className="mt-4 rounded-2xl border-2 border-primary/20 bg-primary/5 p-4">
                      <div className="text-xs font-bold uppercase tracking-widest text-primary mb-3">TIPO DE COMPROBANTE FISCAL</div>
                      {validTipos.length <= 2 ? (
                        <div className="flex gap-2">
                          {validTipos.map((tipo) => (
                            <Button
                              key={tipo}
                              variant="outline"
                              className={`flex-1 h-12 rounded-xl font-bold transition-all border-2 ${tipoECF === tipo ? "bg-primary text-white border-primary shadow-glow hover:bg-primary/90 hover:text-white" : "bg-card text-muted-foreground border-border hover:bg-accent/50"}`}
                              onClick={() => setTipoECF(tipo)}
                            >
                              {NCF_NOMBRES[tipo.substring(0, 3)]?.replace("FISCAL", "")?.trim() || "COMPROBANTE"} ({tipo})
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <Select value={tipoECF} onValueChange={setTipoECF}>
                          <SelectTrigger className="w-full h-14 bg-card border-2 border-border rounded-xl font-bold text-lg shadow-sm">
                            <SelectValue placeholder="Seleccione un comprobante" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {validTipos.map((tipo) => (
                              <SelectItem key={tipo} value={tipo} className="font-bold py-3 cursor-pointer">
                                {NCF_NOMBRES[tipo.substring(0, 3)] || "COMPROBANTE"} ({tipo})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}

                  {metodo === "EFECTIVO" && (
                    <div className="mt-4 rounded-2xl border-2 border-border/60 bg-accent/5 p-6">
                      <div className="grid gap-6 md:grid-cols-2 items-center">
                        <Field label="Monto recibido">
                          <div className="relative h-24">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-2xl text-muted-foreground/50">RD$</span>
                            <Input
                              className="h-full pl-24 !text-5xl font-black font-display bg-background border-2 border-primary/20 focus-visible:ring-primary/30"
                              value={recibido ? formatAmountInput(String(recibido)) : ""}
                              onChange={(e) => setRecibido(parseAmount(e.target.value))}
                              placeholder="0.00"
                            />
                          </div>
                        </Field>

                        <div className={`flex flex-col items-center justify-center h-28 rounded-xl border-2 transition-all duration-300 ${faltante > 0
                            ? "bg-destructive/5 border-destructive/30 text-destructive animate-pulse"
                            : "bg-emerald-500/5 border-emerald-500/30 text-emerald-600"
                          }`}>
                          <div className="text-xs font-black uppercase tracking-widest opacity-70">
                            {faltante > 0 ? "Faltante" : "Vuelto a entregar"}
                          </div>
                          <div className="text-4xl font-display font-black">
                            {formatRD(faltante > 0 ? faltante : vuelto)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {metodo === "CREDITO" && (
                    <div className="space-y-4 mt-6 w-full max-w-2xl mx-auto">
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 p-5 text-sm text-warning-foreground">
                        <AlertTriangle className="h-6 w-6 text-warning shrink-0" />
                        <div>
                          <strong className="block text-base">Venta a crédito</strong>
                          Esta orden se registrará como pendiente de cobro en el balance de <strong>{cliente?.nombre}</strong>.
                        </div>
                      </motion.div>

                      {/* --- CREDIT LIMIT CARD --- */}
                      <div className="rounded-[1.75rem] border border-amber-200 bg-amber-500/[0.03] p-5 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center gap-2 mb-4">
                          <Timer className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                          <span className="text-[11px] font-black uppercase tracking-[0.08em] text-amber-800">
                            PLAZO DE CRÉDITO (DÍAS DE VENCIMIENTO)
                          </span>
                        </div>
                        <div className="grid grid-cols-6 gap-2.5">
                          {OPCIONES_CREDITO.map((op) => (
                            <button
                              key={op.dias}
                              type="button"
                              onClick={() => actualizarLimiteDias(op.dias)}
                              className={`relative flex flex-col items-center justify-center py-3.5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${
                                limiteDiasSel === op.dias
                                  ? "border-amber-500 bg-amber-500/[0.05] text-amber-700 font-bold scale-[1.03] shadow-sm ring-1 ring-amber-500/20"
                                  : "border-border bg-card text-muted-foreground hover:border-amber-400 hover:bg-amber-500/5 shadow-sm"
                              }`}
                            >
                              <span className={`text-xl font-display font-black leading-none mb-1 ${
                                limiteDiasSel === op.dias ? "text-amber-700" : "text-foreground"
                              }`}>{op.dias}</span>
                              <span className={`text-[9px] font-black uppercase tracking-wider leading-none ${
                                limiteDiasSel === op.dias ? "text-amber-600" : "text-muted-foreground"
                              }`}>DÍAS</span>
                              {limiteDiasSel === op.dias && (
                                <span className="absolute -top-1 right-6 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-background shadow" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-3xl border-2 border-warning/20 bg-warning/5 p-5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <Label className="mb-2 block text-xs font-black uppercase tracking-widest text-amber-600">
                          ¿Monto a abonar inicialmente? (Opcional)
                        </Label>
                        <div className="relative h-20">
                          <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-xl text-amber-600/40">RD$</span>
                          <Input
                            className="!h-full pl-20 !text-4xl font-black font-display bg-background border-2 border-warning/20 focus-visible:ring-warning/30 rounded-2xl text-amber-700 font-bold"
                            value={abonoCredito ? formatAmountInput(String(abonoCredito)) : ""}
                            onChange={(e) => {
                              const val = parseAmount(e.target.value);
                              if (val > total) {
                                toast.warning("El abono no puede exceder el total de la orden");
                                return;
                              }
                              setAbonoCredito(val);
                            }}
                            placeholder="0.00"
                          />
                        </div>
                        <p className="mt-2 text-xs text-amber-600/70 font-medium">
                          El monto abonado se registrará en la caja activa. El saldo restante (<strong>{formatRD(total - abonoCredito)}</strong>) irá al balance de <strong>{cliente?.nombre}</strong>.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>

            <div className={`mt-4 flex ${step === 5 ? "flex-col items-center gap-6" : "items-center justify-between"} border-t border-border pt-8`}>
              {step === 5 ? (
                <>
                  <Button
                    size="lg"
                    className="w-full md:max-w-md h-14 text-base tracking-wide rounded-[1.25rem] font-bold bg-[#16A34A] hover:bg-[#15803D] text-white shadow-none transition-all active:scale-95"
                    onClick={onCrearOrden}
                    disabled={metodo === "EFECTIVO" && (faltante > 0)}
                  >
                    <CheckCircle2 className="mr-2 h-5 w-5" /> CONFIRMAR Y CREAR ORDEN
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 px-8 rounded-xl bg-accent/50 border-border/50 font-bold text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
                    onClick={() => setStep((s) => Math.max(1, s - 1))}
                  >
                    <ArrowLeft className="mr-2 h-3 w-3" /> VOLVER ATRÁS
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="rounded-xl bg-accent/50 border-border/50 font-bold text-xs px-6 h-10 transition-all hover:bg-accent"
                    onClick={() => setStep((s) => Math.max(1, s - 1))}
                    disabled={step === 1}
                  >
                    <ArrowLeft className="mr-2 h-3 w-3" /> ATRÁS
                  </Button>
                  <Button onClick={next} className="bg-gradient-primary text-white shadow-elegant hover:opacity-95 rounded-xl h-10 px-8 font-bold text-xs uppercase tracking-wider">
                    Continuar <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Modal ticket */}
      <Dialog open={showTicket} onOpenChange={(o) => { setShowTicket(o); if (!o) navigate({ to: "/t/$slug/ordenes", params: { slug: tenant.slug } }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>✓ Orden creada — {creada?.numero}</DialogTitle>
            <DialogDescription>
              La orden ha sido registrada correctamente. Puedes imprimir el ticket a continuación.
            </DialogDescription>
          </DialogHeader>
          {creada && cliente && (
            <div className="max-h-[60vh] overflow-auto rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800">
              <Ticket orden={creada} tenant={tenant} empleado={empleado} cliente={cliente} formato={cfg.formato_ticket} pagoRecibido={metodo === "EFECTIVO" ? recibido : undefined} serviciosList={servicios} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => navigate({ to: "/t/$slug/ordenes", params: { slug: tenant.slug } })}>Cerrar</Button>
            <Button onClick={() => setShowPrintPortal(creada)} className="bg-gradient-primary text-white"><Printer className="mr-1.5 h-4 w-4" /> Imprimir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showPrintPortal && (
        <TicketPrintPortal 
          orden={showPrintPortal} 
          tenant={tenant} 
          cliente={cliente} 
          empleado={empleado} 
          serviciosList={servicios} 
          onClose={() => {
            setShowPrintPortal(null);
            navigate({ to: "/t/$slug/ordenes", params: { slug: tenant.slug } });
          }} 
        />
      )}
      <PlanLimitModal
        open={showLimitModal}
        onOpenChange={setShowLimitModal}
        type="orders"
        limit={limits?.orderLimit ?? 0}
        tenant={user.tenant}
      />

      <Dialog open={empresaDialogOpen} onOpenChange={(o) => {
        setEmpresaDialogOpen(o);
        if (!o) { setRncResult(null); setRncInput(""); }
      }}>
        <DialogContent className="max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-display font-bold">Buscar Empresa por RNC</DialogTitle>
            <DialogDescription>
              Se conectará automáticamente con la base de datos de Pronesoft/DGII para obtener el nombre del contribuyente.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">RNC o Cédula (DGII)</Label>
              <div className="flex gap-2">
                <Input
                  value={rncInput}
                  onChange={(e) => setRncInput(e.target.value)}
                  placeholder="Ej. 131123456"
                  disabled={rncLoading}
                  className="h-10 rounded-xl border-border bg-background"
                  onKeyDown={(e) => e.key === "Enter" && handleSearchEmpresaRNC()}
                  autoFocus
                />
                <Button
                  onClick={handleSearchEmpresaRNC}
                  disabled={rncLoading}
                  className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white gap-2 font-bold shadow-sm transition-all active:scale-95"
                >
                  {rncLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  <span>Buscar</span>
                </Button>
              </div>
            </div>

            {rncResult && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-4 shadow-sm"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-widest text-primary font-black opacity-60">Nombre / Razón Social</Label>
                    <div className="font-bold text-foreground text-xl leading-tight uppercase">{rncResult.name}</div>
                  </div>
                  <Badge className={`${rncResult.status === "ACTIVO" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"} font-black px-3 py-1 rounded-full border-none shadow-sm`}>
                    {rncResult.status}
                  </Badge>
                </div>

                <div className="h-px bg-primary/10 w-full" />

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-widest text-primary font-black opacity-60">RNC</Label>
                    <div className="font-bold text-foreground text-lg tracking-tight">{rncResult.rnc}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-widest text-primary font-black opacity-60">Régimen de Pago</Label>
                    <div className="font-bold text-foreground/80 uppercase text-sm tracking-tight">{rncResult.regime}</div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEmpresaDialogOpen(false)} disabled={rncLoading} className="rounded-xl font-bold border-border hover:bg-accent h-10">
              Cancelar
            </Button>
            {rncResult && (
              <Button onClick={handleConfirmEmpresa} disabled={rncLoading} className="bg-primary hover:bg-primary/90 text-white gap-2 rounded-xl font-bold shadow-glow transition-all active:scale-95 h-10">
                <Check className="h-4 w-4" /> Continuar y Seleccionar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddItemDialog
        open={showDesgloseDialog}
        onOpenChange={setShowDesgloseDialog}
        catalogo={catalogo}
        items={items}
        onAdd={addItemDesglose}
        onUpdateQty={updateItemQuantity}
        isDesglose
        onAddDesglose={addItemDesglose}
      />
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const labels = ["Cliente", "Servicios", "Prendas", "Resumen", "Cobro"];
  return (
    <div className="flex items-center gap-2">
      {labels.map((l, i) => {
        const n = i + 1;
        const done = step > n; const cur = step === n;
        return (
          <div key={l} className="flex flex-1 items-center">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-success text-white" : cur ? "bg-gradient-primary text-white shadow-glow" : "bg-muted text-muted-foreground"
              }`}>{done ? <Check className="h-4 w-4" /> : n}</div>
            <div className={`ml-2 hidden text-xs sm:block ${cur ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{l}</div>
            {i < labels.length - 1 && <div className={`mx-2 h-0.5 flex-1 ${done ? "bg-success" : "bg-border"}`} />}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="mb-1.5 block text-sm font-medium">{label}</Label>{children}</div>;
}
function Row({ k, v, className = "" }: { k: string; v: string; className?: string }) {
  return <div className={`flex justify-between text-sm ${className}`}><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>;
}

// === Add Item Dialog ===
function AddItemDialog({
  open,
  onOpenChange,
  catalogo,
  items,
  onAdd,
  onUpdateQty,
  isDesglose = false,
  onAddDesglose
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  catalogo: ReturnType<typeof getCatalogo>;
  items: OrdenItem[];
  onAdd: (it: OrdenItem) => void;
  onUpdateQty: (i: number, d: number) => void;
  isDesglose?: boolean;
  onAddDesglose?: (it: OrdenItem) => void;
}) {
  const [activeCat, setActiveCat] = useState<string>("TODOS");
  const [search, setSearch] = useState("");

  const categories = useMemo(() => {
    const cats = new Set(catalogo.map(c => c.categoria || "Otros"));
    return ["TODOS", ...Array.from(cats)];
  }, [catalogo]);

  const itemsFiltered = useMemo(() => {
    let list = catalogo;
    if (activeCat !== "TODOS") {
      list = list.filter(c => (c.categoria || "Otros") === activeCat);
    }
    if (search) {
      list = list.filter(c => c.nombre.toLowerCase().includes(search.toLowerCase()));
    }
    return list;
  }, [catalogo, activeCat, search]);

  useEffect(() => {
    if (open) {
      setActiveCat("TODOS");
      setSearch("");
    }
  }, [open]);

  function handleItemClick(it: CatalogoItem) {
    if (isDesglose && onAddDesglose) {
      onAddDesglose({ descripcion: `↳ ${it.nombre}`, cantidad: 1, precio_unitario: 0, es_libra: false, is_exento: true });
      return;
    }
    const existingIdx = items.findIndex(x => x.descripcion === it.nombre);
    if (existingIdx > -1) {
      onUpdateQty(existingIdx, 1);
    } else {
      onAdd({ descripcion: it.nombre, cantidad: 1, precio_unitario: it.precio, es_libra: it.por_libra });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0 overflow-hidden flex flex-col rounded-3xl">
        <DialogHeader className="p-6 pb-2 border-b border-border/50">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="text-2xl font-display font-bold">
              {isDesglose ? "Desglosar Ropa en Hamper" : "Seleccionar Prendas"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Selecciona las prendas que deseas agregar a la orden.
            </DialogDescription>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                className="pl-9 h-11 bg-accent/5 rounded-2xl border-primary/10 shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 py-4 overflow-x-auto no-scrollbar">
            {categories.map(c => (
              <Button
                key={c}
                variant={activeCat === c ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCat(c)}
                className={`rounded-full px-5 h-9 text-xs font-bold uppercase tracking-tight transition-all ${activeCat === c ? "bg-primary text-white shadow-glow" : "opacity-70 hover:opacity-100 bg-background"
                  }`}
              >
                {c}
              </Button>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-accent/5">
          {itemsFiltered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground opacity-30">
              <Shirt className="h-16 w-16 mb-4" />
              <p className="font-medium">No se encontraron prendas</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {itemsFiltered.map((it) => {
                const count = items.filter(x => x.descripcion === it.nombre).reduce((acc, x) => acc + x.cantidad, 0);
                return (
                  <button
                    key={it.id}
                    onClick={() => handleItemClick(it)}
                    className={`group relative flex flex-col items-center justify-center gap-3 p-5 rounded-3xl border-2 transition-all active:scale-90 text-center ${count > 0
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:border-primary/40"
                      }`}
                  >
                    {it.imagen_url ? (
                      <img src={it.imagen_url} alt={it.nombre} className={`h-16 w-16 rounded-2xl object-cover shadow-sm transition-all duration-300 ${count > 0 ? "scale-110 ring-4 ring-primary/20" : "group-hover:scale-105"}`} />
                    ) : (
                      <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-3xl transition-all duration-300 ${count > 0 ? "bg-primary text-white scale-110 shadow-glow" : "bg-accent/30 group-hover:bg-primary/10"}`}>
                        {it.icono || "👕"}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-bold leading-tight line-clamp-1">{it.nombre}</div>
                      <div className="mt-1 text-xs font-black text-primary">{formatRD(it.precio)}</div>
                    </div>

                    {count > 0 && (
                      <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-xs font-black shadow-glow animate-in zoom-in duration-300 ring-4 ring-background">
                        {count}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-background border-t border-border/50">
          <Button onClick={() => onOpenChange(false)} className="w-full md:w-auto px-12 h-11 text-lg font-bold bg-primary text-white rounded-md shadow-glow border-none">
            Listo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeliveryPOSDialog({
  open, onOpenChange, enabled, setEnabled, address, setAddress, cost, setCost
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  enabled: boolean; setEnabled: (e: boolean) => void;
  address: string; setAddress: (a: string) => void;
  cost: number; setCost: (c: number) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-display font-bold flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            Envío a Domicilio
          </DialogTitle>
          <DialogDescription className="sr-only">
            Configura la dirección de entrega para esta orden.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-accent/5 border border-primary/10">
            <div className="space-y-0.5">
              <Label className="text-base font-bold">Habilitar Envío</Label>
              <p className="text-xs text-muted-foreground">¿Esta orden requiere delivery?</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {enabled && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold text-sm">Dirección de Entrega</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Calle, No., Sector..."
                  className="h-12 rounded-xl bg-card border-primary/20 focus-visible:ring-primary/30"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-sm">Costo de Envío (RD$)</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-muted-foreground/50">RD$</span>
                  <Input
                    value={cost ? formatAmountInput(String(cost)) : ""}
                    onChange={(e) => setCost(parseAmount(e.target.value))}
                    placeholder="0.00"
                    className="h-12 rounded-xl bg-card border-primary/20 focus-visible:ring-primary/30 pl-12"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Se sumará al total de la orden.</p>
              </div>
            </motion.div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full h-11 rounded-md bg-primary text-white font-bold shadow-glow border-none">
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DiscountPOSDialog({
  open, onOpenChange, discount, setDiscount
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  discount: number; setDiscount: (d: number) => void;
}) {
  const [val, setVal] = useState(discount > 0 ? String(discount) : "");

  useEffect(() => {
    if (open) {
      setVal(discount > 0 ? String(discount) : "");
    }
  }, [open, discount]);

  function apply() {
    setDiscount(parseAmount(val) || 0);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-display font-bold flex items-center gap-2">
            <Plus className="h-6 w-6 text-amber-500" />
            Aplicar Descuento
          </DialogTitle>
          <DialogDescription className="sr-only">
            Ingresa el monto del descuento que deseas aplicar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="relative h-24">
            <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-2xl text-muted-foreground/30">RD$</span>
            <Input
              className="!h-full pl-24 !text-5xl font-black font-display bg-accent/5 border-2 border-primary/20 focus-visible:ring-primary/30 rounded-3xl text-center"
              value={val}
              onChange={(e) => setVal(formatAmountInput(e.target.value))}
              placeholder="0"
              autoFocus
              type="text"
              inputMode="decimal"
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">El descuento se restará del total final de la orden.</p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { setDiscount(0); onOpenChange(false); }} className="flex-1 h-11 rounded-md border-rose-200 text-rose-600 hover:bg-rose-50 font-bold">
            Quitar Desc.
          </Button>
          <Button onClick={apply} className="flex-1 h-11 rounded-md bg-primary text-white font-bold shadow-glow border-none">
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TicketPrintPortal({ 
  orden, 
  tenant, 
  cliente, 
  empleado, 
  serviciosList, 
  onClose 
}: { 
  orden: Orden; 
  tenant: any; 
  cliente: any; 
  empleado: any; 
  serviciosList: any[]; 
  onClose: () => void 
}) {
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
          empleado={empleado} 
          cliente={cliente} 
          formato={tenant.config?.formato_ticket || "80mm"} 
          serviciosList={serviciosList}
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
            position: static !important;
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
