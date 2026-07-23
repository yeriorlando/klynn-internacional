import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { encodeEscPos, printDirectRaw } from "@/lib/impresora";
import { supabase } from "@/lib/supabase";
import { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Plus, Trash2, Search, UserPlus, Check, AlertTriangle,
  Printer, Phone, Shirt, Truck, Maximize, Minimize, LayoutGrid, List, Receipt,
  ShoppingCart, User as UserIcon, X, Minus, CheckCircle2, Loader2, Building, Timer, Scale, WashingMachine,
  CreditCard, CornerDownLeft, Percent, Box, Calendar as CalendarIcon, Clock, CalendarDays, FileText, ChevronDown, ChevronUp,
  Building2, Banknote
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
import { Calendar } from "@/components/ui/calendar";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  getClientes, getOrdenes, saveCliente, getCatalogo, getServicios, getCajaAbierta, saveOrden, saveMovimiento,
  nextOrdenNumero, formatRD, formatPhoneRD, uid, DEFAULT_CONFIG,
  formatAmountInput, parseAmount, saveTenant, getTenantPlan,
  checkPlanLimits, getECFConfig, getECFSequences, nextECFNumero, saveECFDocument,
  isModuleEnabled,
  type Cliente, type OrdenItem, type MetodoPago, type Orden, type CatalogoItem, type Servicio, type Caja,
  type ECFConfig, type ECFSequence, type ECFDocument, type Empleado, NCF_NOMBRES
} from "@/lib/storage";
import { emitirECF } from "@/lib/fiscal";
import { getProneSoftClient } from "@/lib/fiscal/pronesoft-client";
import { PlanLimitModal } from "@/components/klynn/PlanLimitModal";
import { ClienteDialog } from "@/components/klynn/ClienteDialog";
import { useCatalogo, useServicios, useClientes, useCajaAbierta, useECFConfig, usePlans, useECFSequences } from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PriceInput } from "@/components/klynn/PriceInput";
import { PendingCollectionsDialog } from "@/components/klynn/PendingCollectionsDialog";

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

  const cfg = user?.tenant.config || DEFAULT_CONFIG;
  const enableServicios = cfg.pos_habilitar_servicios !== false;
  const enablePrendas = cfg.pos_habilitar_prendas !== false;

  function irAlPasoSiguienteDelCliente() {
    if (enableServicios) {
      setStep(2);
    } else if (enablePrendas) {
      setStep(3);
    } else {
      setStep(4);
    }
  }

  const [step, setStep] = useState(1);
  const [isPosMode, setIsPosMode] = useState(cfg.pos_modo_defecto !== false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (user?.tenant?.config) {
      setIsPosMode(user.tenant.config.pos_modo_defecto !== false);
    }
  }, [user?.tenant?.config?.pos_modo_defecto]);

  const [activeCategory, setActiveCategory] = useState<string>("TODOS");
  const [posFilterTab, setPosFilterTab] = useState<"TODOS" | "SERVICIOS" | "PRENDAS">("TODOS");
  const [showAllClothingCategories, setShowAllClothingCategories] = useState(false);
  const [posSearch, setPosSearch] = useState("");
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [isCatalogHeaderVisible, setIsCatalogHeaderVisible] = useState(true);
  const catalogScrollTopRef = useRef(0);

  const [isCobroModalOpen, setIsCobroModalOpen] = useState(false);
  const [showOrdersDialog, setShowOrdersDialog] = useState(false);
  const [searchGlow, setSearchGlow] = useState(false);

  useEffect(() => {
    if (!tenantId || tenantId === "__loading__") return;

    const preloadTimer = window.setTimeout(() => {
      void queryClient.prefetchQuery({
        queryKey: ["ordenes", tenantId],
        queryFn: () => getOrdenes(tenantId),
        staleTime: 30_000,
      });
    }, 150);

    return () => window.clearTimeout(preloadTimer);
  }, [queryClient, tenantId]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const [clienteSearch, setClienteSearch] = useState("");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [showNewCliente, setShowNewCliente] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  const [serviciosSel, setServiciosSel] = useState<string[]>([]);
  const [customServicePrices, setCustomServicePrices] = useState<Record<string, number>>({});
  const [items, setItems] = useState<OrdenItem[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [esUrgente, setEsUrgente] = useState(false);
  const [aplicarItbis, setAplicarItbis] = useState(true);
  const [descuento, setDescuento] = useState(0);
  const [fechaEntrega, setFechaEntrega] = useState<Date | undefined>(new Date());
  const [showDeliveryDatePickerPOS, setShowDeliveryDatePickerPOS] = useState(false);

  const getFormattedDeliveryLabel = (date?: Date) => {
    if (!date) return "No seleccionada";
    return date.toLocaleString('es-DO', { 
      month: 'short',
      day: 'numeric'
    });
  };

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
  const filteredClients = useMemo(() => {
    return clientes.filter(c =>
      c.nombre.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
      (c.apellido && c.apellido.toLowerCase().includes(clientSearchQuery.toLowerCase())) ||
      c.telefono.includes(clientSearchQuery)
    );
  }, [clientes, clientSearchQuery]);
  const fiscalConfig = fiscalConfigData || null;

  useEffect(() => {
    if (isPosMode && isFullscreen) {
      document.body.classList.add("pos-mode");
    } else {
      document.body.classList.remove("pos-mode");
    }
    return () => document.body.classList.remove("pos-mode");
  }, [isPosMode, isFullscreen]);

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

  const [metodo, setMetodo] = useState<MetodoPago>("PAGO_AL_RETIRAR");
  const [opcionPagoSelected, setOpcionPagoSelected] = useState<string>("PAGO_AL_RETIRAR");
  const [recibido, setRecibido] = useState<number>(0);
  const [isCreatingOrden, setIsCreatingOrden] = useState(false);
  const [abonoCredito, setAbonoCredito] = useState<number>(0);
  const [referencia, setReferencia] = useState("");
  const [showRefInput, setShowRefInput] = useState(false);

  const handleOpcionPagoChange = (opcionId: string) => {
    setOpcionPagoSelected(opcionId);
    setReferencia("");
    setShowRefInput(false);
    if (opcionId === "PAGO_AL_RETIRAR") {
      setMetodo("PAGO_AL_RETIRAR");
      setAbonoCredito(0);
    } else {
      setMetodo(opcionId as MetodoPago);
      if (opcionId === "CREDITO") {
        setAbonoCredito(0);
      }
    }
  };

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

  function handleSelectGeneric(tipo: "Persona" | "Empresa") {
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

    // Actualización inmediata e instantánea de UI (0ms delay)
    setCliente(c);
    setTipoECF(isPersona ? (isElectronic ? "E32" : "B02") : (isElectronic ? "E31" : "B01"));
    if (!isPosMode) {
      irAlPasoSiguienteDelCliente();
    }

    // Persistencia asíncrona en segundo plano sin congelar/retrasar la UI
    saveCliente(c)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['clientes', tenantId] });
      })
      .catch((e) => {
        console.warn("Cliente genérico ya existe", e);
      });
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
      irAlPasoSiguienteDelCliente();
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

  const visibleClothingCategories = useMemo(() => {
    const limit = 10;
    if (showAllClothingCategories || categoriesPrendas.length <= limit) return categoriesPrendas;

    const visible = categoriesPrendas.slice(0, limit);
    if (activeCategory !== "TODOS" && !visible.includes(activeCategory)) {
      return [...visible.slice(0, limit - 1), activeCategory];
    }
    return visible;
  }, [activeCategory, categoriesPrendas, showAllClothingCategories]);

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

  const internalCatalogHeading = useMemo(() => {
    const showsServices = enableServicios && posFilterTab !== "PRENDAS";

    if (showsServices) {
      return {
        title: "Servicios",
        count: servicesFiltered.length,
        type: "SERVICIOS" as const,
      };
    }

    if (enablePrendas) {
      return {
        title: "Prendas",
        count: catalogFiltered.length,
        type: "PRENDAS" as const,
      };
    }

    return {
      title: "Catálogo",
      count: 0,
      type: "CATALOGO" as const,
    };
  }, [catalogFiltered.length, enablePrendas, enableServicios, posFilterTab, servicesFiltered.length]);

  const catalogSummary = useMemo(() => {
    if (posFilterTab === "SERVICIOS") {
      return {
        title: "Servicios",
        count: servicesFiltered.length,
        helper: "Toca un servicio para agregarlo a la orden",
      };
    }

    if (posFilterTab === "PRENDAS") {
      return {
        title: "Prendas",
        count: catalogFiltered.length,
        helper: "Toca un artículo para agregarlo a la orden",
      };
    }

    return {
      title: "Catálogo",
      count: (enableServicios ? servicesFiltered.length : 0) + (enablePrendas ? catalogFiltered.length : 0),
      helper: "Toca un artículo o servicio para agregarlo a la orden",
    };
  }, [catalogFiltered.length, enablePrendas, enableServicios, posFilterTab, servicesFiltered.length]);

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

  useEffect(() => {
    if (!enableServicios) {
      setServiciosSel([]);
    }
  }, [enableServicios]);

  useEffect(() => {
    if (!enableServicios && enablePrendas) {
      setPosFilterTab("PRENDAS");
      setActiveCategory("TODAS LAS PRENDAS");
    } else if (enableServicios && !enablePrendas) {
      setPosFilterTab("SERVICIOS");
      setActiveCategory("TODOS");
    } else {
      setPosFilterTab("TODOS");
      setActiveCategory("TODOS");
    }
  }, [enableServicios, enablePrendas]);

  const posStateRef = useRef<any>(null);

  useEffect(() => {
    if (!isPosMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const state = posStateRef.current;
      if (!state) return;
      const target = e.target as HTMLElement;
      const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;

      // Enter to cobrar (open checkout modal) or confirm pay (if modal is open)
      if (e.key === "Enter") {
        const isTextarea = target.tagName === "TEXTAREA";
        if (!isTextarea) {
          if (!state.isCobroModalOpen) {
            if (state.items.length > 0 || state.serviciosSel.length > 0) {
              e.preventDefault();
              state.setIsCobroModalOpen(true);
            }
          } else {
            const isEfectivo = state.metodo === "EFECTIVO";
            const canConfirm = !isEfectivo || (state.recibido >= state.total);
            if (canConfirm) {
              e.preventDefault();
              state.onCrearOrden();
            }
          }
          return;
        }
      }

      // Space key to confirm and create order if checkout modal is open
      if (e.key === " " || e.code === "Space") {
        if (state.isCobroModalOpen) {
          const isTypingText = target.tagName === "TEXTAREA" || (target.tagName === "INPUT" && (target as HTMLInputElement).type === "text" && (target as HTMLInputElement).inputMode !== "decimal");
          if (!isTypingText) {
            e.preventDefault();
            e.stopPropagation();
            const isEfectivo = state.metodo === "EFECTIVO";
            const canConfirm = !isEfectivo || (state.recibido >= state.total);
            if (canConfirm) {
              state.onCrearOrden();
            } else {
              toast.error("El monto recibido es menor al total de la orden 💵");
            }
            return;
          }
        }
      }

      // Ctrl alone to focus search
      if (e.key === "Control") {
        e.preventDefault();
        setSearchGlow(true);
        const searchInput = document.querySelector('input[placeholder*="Buscar prenda"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
        return;
      }

      if (isInput) return;

      // P to toggle fullscreen mode
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "p") {
        if (e.repeat) return;
        e.preventDefault();
        state.toggleFullscreen();
        return;
      }

      // Z to open the orders modal
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "z") {
        if (e.repeat) return;
        e.preventDefault();
        state.setShowOrdersDialog(true);
        return;
      }

      // F2 to open client search modal
      if (e.key === "F2") {
        e.preventDefault();
        state.setIsClientModalOpen(true);
        return;
      }

      // F4 to open discount dialog
      if (e.key === "F4") {
        e.preventDefault();
        state.setShowDiscountPOS(true);
        return;
      }

      // Ctrl + Z to undo (deshacer)
      if (e.ctrlKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (state.items.length > 0) {
          setItems(prev => prev.slice(0, -1));
          toast.info("Prenda removida (Deshacer) ↩️");
        } else if (state.serviciosSel.length > 0) {
          setServiciosSel(prev => prev.slice(0, -1));
          toast.info("Servicio removido (Deshacer) ↩️");
        }
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Control") {
        setSearchGlow(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
    };
  }, [isPosMode]);

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

  const costoServicios = servicios.filter(s => serviciosSel.includes(s.nombre)).reduce((acc, s) => {
    const qty = serviciosSel.filter(x => x === s.nombre).length;
    const price = customServicePrices[s.nombre] !== undefined ? customServicePrices[s.nombre] : s.precio;
    return acc + (price * qty);
  }, 0);

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
  const subtotalBruto = subtotalGravableBase + subtotalExentoBase + costoServicios;
  const recargo = recargoTotal;

  if (cfg.ncf_facturacion_activa && aplicarItbis && itbisRate > 0) {
    if (cfg.itbis_incluido) {
      // ITBIS ya está en los precios. 
      // Calculamos cuánto de la base gravable es ITBIS
      const baseSinItbis = +(baseParaItbis / (1 + itbisRate)).toFixed(2);
      itbis = +(baseParaItbis - baseSinItbis).toFixed(2);
      subtotal = +(baseSinItbis + subtotalExentoBase).toFixed(2);
    } else {
      // ITBIS se suma a la base gravable
      itbis = +(baseParaItbis * itbisRate).toFixed(2);
      subtotal = +(baseParaItbis + subtotalExentoBase).toFixed(2);
    }
  }

  const subtotalConImpuestos = subtotal + itbis;
  const descuentoMonto = +((subtotalConImpuestos * descuento) / 100).toFixed(2);
  total = +(subtotalConImpuestos - descuentoMonto + costoEnvio).toFixed(2);

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
  function updateServiceQuantity(serviceName: string, delta: number) {
    setServiciosSel((arr) => {
      const currentCount = arr.filter(x => x === serviceName).length;
      if (delta < 0 && currentCount <= 1) return arr;
      if (delta < 0) {
        const idx = arr.indexOf(serviceName);
        if (idx > -1) {
          const result = [...arr];
          result.splice(idx, 1);
          return result;
        }
      } else if (delta > 0) {
        return [...arr, serviceName];
      }
      return arr;
    });
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((e) => {
        console.error(`Error al activar pantalla completa: ${e.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };



  async function onCrearOrden() {
    if (isCreatingOrden) return;
    setIsCreatingOrden(true);
    if (opcionPagoSelected === "CREDITO" && (!cliente || (cliente.nombre === "Consumidor" && cliente.apellido === "Final"))) {
      toast.error("Las ventas a crédito deben asignarse a un cliente registrado.");
      setIsCreatingOrden(false);
      return;
    }
    let targetCliente: Cliente | null = cliente;
    if (!targetCliente) {
      const isConsumoFinal = tipoECF === "E32" || tipoECF === "B02";
      if (isConsumoFinal) {
        const isPersona = true;
        const gid = tenantId.substring(0, 24) + "f000" + tenantId.substring(28);
        const c: Cliente = {
          id: gid,
          tenant_id: tenantId,
          nombre: "Consumidor",
          apellido: "Final",
          cedula: "",
          telefono: "---",
          email: "",
          direccion: "",
          tipo: "Consumidor Final",
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
        targetCliente = c;
      } else {
        toast.error("Selecciona un cliente");
        setIsCreatingOrden(false);
        return;
      }
    }
    if (items.length === 0 && serviciosSel.length === 0) {
      toast.error("Agrega al menos una prenda o selecciona un servicio");
      setIsCreatingOrden(false);
      return;
    }
    if ((metodo !== "CREDITO" || abonoCredito > 0) && !caja) {
      toast.error("Abre la caja antes de registrar un pago");
      setIsCreatingOrden(false);
      return;
    }
    if (metodo === "EFECTIVO" && recibido < total) {
      toast.error("El monto recibido es menor al total");
      setIsCreatingOrden(false);
      return;
    }
    if (metodo === "CREDITO" && abonoCredito >= total) {
      toast.error("El abono debe ser menor al total. Si desea pagar completo, cambie el método de pago.");
      setIsCreatingOrden(false);
      return;
    }

    try {
      const pagado = opcionPagoSelected === "PAGO_AL_RETIRAR" 
        ? 0 
        : (opcionPagoSelected === "CREDITO" ? abonoCredito : total);
      const saldo = +Math.max(0, total - pagado).toFixed(2);

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

      if (cfg.ncf_facturacion_activa && !isElectronic && opcionPagoSelected !== "PAGO_AL_RETIRAR" && opcionPagoSelected !== "CREDITO") {
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
        cliente_id: targetCliente.id,
        empleado_id: empleado.id,
        servicios: serviciosSel,
        servicios_precios: serviciosSel.reduce((acc, sName) => {
          const sPrice = customServicePrices[sName] !== undefined
            ? customServicePrices[sName]
            : (servicios.find(x => x.nombre === sName)?.precio || 0);
          acc[sName] = sPrice;
          return acc;
        }, {} as Record<string, number>),
        items,
        subtotal: +subtotal.toFixed(2),
        itbis,
        descuento: descuentoMonto,
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
        pago_referencia: (metodo === "TARJETA" || metodo === "TRANSFERENCIA") && referencia ? referencia : undefined,
      };

      // --- LOGICA FISCAL ELECTRONICA (Pronesoft) ---
      let ordenActualizada = { ...orden };
      if (isElectronic && activeTipo && opcionPagoSelected !== "PAGO_AL_RETIRAR" && opcionPagoSelected !== "CREDITO") {
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
            targetCliente,
            fiscalConfig?.pronesoft_tenant_id,
            cfg,
            tenant,
            activeTipo
          );

          const fiscalFields = {
            ncf: result.encf,
            tipo_ecf: activeTipo,
            ecf_id: result.document.id,
            ecf_qr: result.stamp_url || (result.document as any).document_stamp_url || '',
            ecf_security_code: result.security_code || '',
            ecf_signature_date: (result.document as any).signature_date || new Date().toISOString(),
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

      // Registrar movimiento de caja ÚNICAMENTE si se recibió un pago real (pagado > 0)
      if (pagado > 0 && caja) {
        await saveMovimiento({
          id: uid("mov"),
          tenant_id: tenant.id,
          caja_id: caja.id,
          empleado_id: empleado.id,
          tipo: metodo === "CREDITO" ? "ABONO" : "VENTA",
          concepto: metodo === "CREDITO"
            ? `Abono inicial orden #${ordenActualizada.numero}`
            : `Venta orden #${ordenActualizada.numero}`,
          monto: pagado,
          metodo: metodo === "CREDITO" ? "EFECTIVO" : metodo,
          orden_id: ordenActualizada.id,
          creado_en: new Date().toISOString(),
        });
      }

      setCreada({ ...ordenActualizada });
      setShowTicket(true);
      setIsCobroModalOpen(false);
      toast.success(`Orden ${ordenActualizada.numero} creada ✅`);

      if (targetCliente && servicioDomicilio && direccionDomicilio.trim() && direccionDomicilio !== targetCliente.direccion) {
        await saveCliente({ ...targetCliente, direccion: direccionDomicilio.trim() });
      }

      if (targetCliente) {
        queryClient.invalidateQueries({ queryKey: ['ordenes', tenantId] });
        queryClient.invalidateQueries({ queryKey: ['movimientos', tenantId] });
        import("@/lib/whatsapp").then(({ notificarWhatsApp }) =>
          notificarWhatsApp(tenant, targetCliente, ordenActualizada, "creada", recibido).then((r) => {
            if (r.ok) toast.success("WhatsApp enviado al cliente ✅");
          }),
        );
      }
      setIsCreatingOrden(false);
    } catch (err: any) {
      toast.error("Error al crear la orden: " + err.message);
      setIsCreatingOrden(false);
    }
  }

  async function next() {
    if (limits?.ordersReached) { setShowLimitModal(true); return; }
    if (step === 1 && !cliente) {
      const isConsumoFinal = tipoECF === "E32" || tipoECF === "B02";
      if (isConsumoFinal) {
        await handleSelectGeneric("Persona");
        return;
      }
      toast.error("Selecciona un cliente"); return;
    }
    if (step === 2 && serviciosSel.length === 0 && !enablePrendas) { toast.error("Selecciona al menos un servicio"); return; }
    if (step === 3 && items.length === 0 && (enableServicios ? serviciosSel.length === 0 : true)) {
      toast.error(enableServicios ? "Agrega al menos una prenda o selecciona un servicio" : "Agrega al menos una prenda");
      return;
    }

    let nextStep = step + 1;
    if (nextStep === 2 && !enableServicios) nextStep = 3;
    if (nextStep === 3 && !enablePrendas) nextStep = 4;
    setStep(Math.min(5, nextStep));
  }

  function prev() {
    let prevStep = step - 1;
    if (prevStep === 3 && !enablePrendas) prevStep = 2;
    if (prevStep === 2 && !enableServicios) prevStep = 1;
    setStep(Math.max(1, prevStep));
  }

  const stepsList = [
    { id: 1, label: "Cliente" },
    enableServicios && { id: 2, label: "Servicios" },
    enablePrendas && { id: 3, label: "Prendas" },
    { id: 4, label: "Resumen" },
    { id: 5, label: "Cobro" }
  ].filter(Boolean) as { id: number; label: string }[];

  const currentVisibleStepIndex = stepsList.findIndex(s => s.id === step);
  const currentVisibleStepNumber = currentVisibleStepIndex !== -1 ? currentVisibleStepIndex + 1 : 1;
  const totalVisibleSteps = stepsList.length;

  posStateRef.current = {
    isPosMode,
    items,
    serviciosSel,
    step,
    catalogFiltered,
    metodo,
    recibido,
    total,
    onCrearOrden,
    setIsClientModalOpen,
    setShowDiscountPOS,
    setShowOrdersDialog,
    toggleFullscreen,
    addItem,
    isCobroModalOpen,
    setIsCobroModalOpen
  };

  return (
    <div className={`mx-auto w-full ${isPosMode ? "max-w-none flex flex-col overflow-hidden h-full px-5 pt-3 pb-0" : "max-w-6xl px-4 md:px-6"}`}>
      {isPosMode ? (
        <style dangerouslySetInnerHTML={{
          __html: `
          main {
            padding: 0px !important;
            height: calc(100vh - 4rem) !important;
            min-height: calc(100vh - 4rem) !important;
            max-height: calc(100vh - 4rem) !important;
            overflow: hidden !important;
          }
        `}} />
      ) : (
        <style dangerouslySetInnerHTML={{
          __html: `
          main {
            height: auto !important;
            min-height: calc(100vh - 4rem) !important;
            max-height: none !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
          }
        `}} />
      )}
      {!caja && (
        <Card className="mb-4 flex items-center gap-3 border-warning/40 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="h-5 w-5 text-warning" />
          La caja está cerrada. Solo podrás registrar órdenes en crédito.
        </Card>
      )}

      {isPosMode ? (
        <div
          className="flex gap-6 overflow-hidden min-h-0 w-full flex-1"
        >
          {/* CATALOG GRID */}
          <div className="flex-1 flex flex-col gap-4 overflow-hidden h-full">
            {/* Top row of POS: action buttons */}
            <div className="flex w-full flex-wrap items-center justify-between gap-2.5 py-1 sm:justify-start">
              {/* Action Buttons Group */}
              <div className="flex min-w-0 flex-nowrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeliveryPOS(true)}
                  className={`group inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-bold uppercase tracking-[0.015em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${servicioDomicilio ? "bg-blue-700 text-white shadow-inner ring-2 ring-blue-400 ring-offset-1 dark:ring-offset-background" : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"}`}
                >
                  <Truck className={`h-4 w-4 transition-colors text-white ${servicioDomicilio ? "opacity-100" : "opacity-90 group-hover:opacity-100"}`} />
                  <span>{servicioDomicilio ? "Envío activo" : "Envío a domicilio"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDiscountPOS(true)}
                  className={`group inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-bold uppercase tracking-[0.015em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${descuento > 0 ? "bg-rose-700 text-white shadow-inner ring-2 ring-rose-400 ring-offset-1 dark:ring-offset-background" : "bg-rose-600 hover:bg-rose-700 text-white shadow-sm"}`}
                >
                  <Percent className={`h-4 w-4 transition-colors text-white ${descuento > 0 ? "opacity-100" : "opacity-90 group-hover:opacity-100"}`} />
                  <span>{descuento > 0 ? `Desc. ${descuento}%` : "Descuento"}</span>
                </button>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className={`group inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-bold uppercase tracking-[0.015em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${isFullscreen ? "bg-slate-800 text-white shadow-inner ring-2 ring-slate-400 ring-offset-1 dark:ring-offset-background" : "bg-slate-700 hover:bg-slate-800 text-white shadow-sm"}`}
                >
                  {isFullscreen ? (
                    <>
                      <Minimize className="h-4 w-4 text-white opacity-100" />
                      <span>Pantalla normal</span>
                    </>
                  ) : (
                    <>
                      <Maximize className="h-4 w-4 text-white opacity-90 transition-colors group-hover:opacity-100" />
                      <span>Pantalla completa</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowOrdersDialog(true)}
                  className="group inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-bold uppercase tracking-[0.015em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  <List className="h-4 w-4 text-white opacity-90 transition-colors group-hover:opacity-100" />
                  <span>Ver órdenes</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPosMode(false)}
                  title="Modo Clásico"
                  aria-label="Cambiar al modo clásico"
                  className="group inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 transition-colors hover:bg-slate-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Box className="h-4.5 w-4.5 text-slate-500 transition-colors group-hover:text-primary dark:text-slate-400" />
                </button>
              </div>
            </div>

            <PendingCollectionsDialog
              open={showOrdersDialog}
              onOpenChange={setShowOrdersDialog}
              authUser={user}
            />

            <DeliveryPOSDialog
              open={showDeliveryPOS}
              onOpenChange={(isOpen) => {
                setShowDeliveryPOS(isOpen);
                if (!isOpen && cliente) {
                  const isGenericClient = cliente.nombre === "Consumidor" && cliente.apellido === "Final";
                  if (!isGenericClient && direccionDomicilio.trim() && direccionDomicilio.trim() !== cliente.direccion) {
                    const updatedCliente = { ...cliente, direccion: direccionDomicilio.trim() };
                    setCliente(updatedCliente);
                    saveCliente(updatedCliente).then(() => {
                      queryClient.invalidateQueries({ queryKey: ['clientes', tenantId] });
                    });
                  }
                }
              }}
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
              empleado={user?.empleado}
            />

            <DeliveryDatePickerPOSDialog
              open={showDeliveryDatePickerPOS}
              onOpenChange={setShowDeliveryDatePickerPOS}
              fechaEntrega={fechaEntrega}
              setFechaEntrega={setFechaEntrega}
              esUrgente={esUrgente}
              setEsUrgente={setEsUrgente}
              cfg={cfg}
            />

            <Card className="flex-1 flex flex-col overflow-hidden border-2 border-primary/10 shadow-none rounded-3xl bg-card">
              {!(step === 1 && !cliente && !isPosMode) && (
                <div
                  aria-hidden={!isCatalogHeaderVisible}
                  className={`flex shrink-0 flex-col overflow-hidden border-b px-6 transition-[max-height,opacity,margin,padding,border-color] duration-300 ease-out motion-reduce:transition-none ${
                    isCatalogHeaderVisible
                      ? "pointer-events-auto mb-2 max-h-[32rem] gap-3 border-border/40 py-4 opacity-100"
                      : "pointer-events-none mb-0 max-h-0 gap-0 border-transparent py-0 opacity-0"
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-base font-black tracking-tight text-slate-950 dark:text-white md:text-lg">
                          {catalogSummary.title}
                        </h2>
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[9px] font-black tabular-nums text-white shadow-sm dark:bg-primary dark:text-white">
                          {catalogSummary.count}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        {catalogSummary.helper}
                      </p>
                    </div>

                    {enableServicios && enablePrendas && (
                      <div className="inline-flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-slate-100/90 p-1 shadow-inner shadow-slate-200/40 dark:bg-slate-900 dark:shadow-none">
                        {[
                          { id: "TODOS", label: "Todos", icon: LayoutGrid },
                          { id: "SERVICIOS", label: "Servicios", icon: WashingMachine },
                          { id: "PRENDAS", label: "Prendas", icon: Shirt },
                        ].map((tab) => {
                          const isSelected = posFilterTab === tab.id;
                          const Icon = tab.icon;

                          return (
                            <button
                              key={tab.id}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => {
                                setPosFilterTab(tab.id as typeof posFilterTab);
                                setActiveCategory(tab.id === "PRENDAS" ? "TODAS LAS PRENDAS" : "TODOS");
                              }}
                              className={`inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 text-[11px] font-extrabold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 md:text-xs ${
                                isSelected
                                  ? "bg-primary text-white shadow-sm shadow-primary/20"
                                  : "text-slate-500 hover:bg-white/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                              }`}
                            >
                              <Icon className={`h-3.5 w-3.5 ${isSelected ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
                              <span>{tab.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Sub-filtro de Categorías de Prendas */}
                  {enablePrendas && posFilterTab === "PRENDAS" && (
                    <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 animate-in slide-in-from-top-1 duration-200 dark:border-slate-800">
                      {visibleClothingCategories.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setActiveCategory(cat)}
                          className={`px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all shadow-sm border ${activeCategory === cat
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-card text-muted-foreground hover:bg-accent border-border/50"
                            }`}
                        >
                          {cat}
                        </button>
                      ))}
                      {categoriesPrendas.length > 10 && (
                        <button
                          type="button"
                          onClick={() => setShowAllClothingCategories((current) => !current)}
                          aria-expanded={showAllClothingCategories}
                          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-primary shadow-sm transition-all hover:border-primary/35 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                        >
                          {showAllClothingCategories ? (
                            <ChevronUp className="h-3 w-3" strokeWidth={2.5} />
                          ) : (
                            <ChevronDown className="h-3 w-3" strokeWidth={2.5} />
                          )}
                          {showAllClothingCategories ? "Ver menos" : "Ver más"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div
                className="flex-1 overflow-y-auto overscroll-contain px-6 py-4 custom-scrollbar space-y-8"
                onScroll={(event) => {
                  const scrollContainer = event.currentTarget;
                  const scrollTop = scrollContainer.scrollTop;
                  const previousScrollTop = catalogScrollTopRef.current;
                  const scrollDelta = scrollTop - previousScrollTop;
                  const maxScrollTop = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
                  const isNearBottom = maxScrollTop - scrollTop <= 12;

                  if (scrollTop <= 16) {
                    setIsCatalogHeaderVisible(true);
                  } else if (scrollDelta > 2 && scrollTop > 32) {
                    setIsCatalogHeaderVisible(false);
                  } else if (scrollDelta < -2 && !isNearBottom) {
                    setIsCatalogHeaderVisible(true);
                  }

                  catalogScrollTopRef.current = scrollTop;
                }}
              >
                <>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[auto_minmax(12rem,1fr)_auto]">
                    <h3 className="flex min-w-0 items-center gap-2.5 text-sm font-black text-slate-800 dark:text-slate-100 md:text-base">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/10 dark:bg-primary/20">
                        {internalCatalogHeading.type === "SERVICIOS" ? (
                          <WashingMachine className="h-4 w-4" strokeWidth={2.2} />
                        ) : internalCatalogHeading.type === "PRENDAS" ? (
                          <Shirt className="h-4 w-4" strokeWidth={2.2} />
                        ) : (
                          <LayoutGrid className="h-4 w-4" strokeWidth={2.2} />
                        )}
                      </span>
                      <span className="truncate">{internalCatalogHeading.title}</span>
                    </h3>

                    <div className={`relative col-span-2 row-start-2 min-w-0 rounded-xl transition-all duration-200 md:col-span-1 md:row-start-auto ${searchGlow ? "ring-2 ring-primary/30 shadow-[0_0_12px_rgba(var(--primary),0.15)]" : ""}`}>
                      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={posSearch}
                        onChange={(event) => setPosSearch(event.target.value)}
                        placeholder="Buscar prenda o servicio..."
                        aria-label="Buscar prenda o servicio"
                        className="h-10 rounded-xl border-slate-200 bg-slate-50/80 pl-10 pr-3 shadow-none transition-colors focus-visible:border-primary/40 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-primary/15 dark:border-slate-700 dark:bg-slate-900/80 dark:focus-visible:bg-slate-900"
                      />
                    </div>

                    <span className="inline-flex items-center justify-self-end rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary dark:bg-primary/20">
                      {internalCatalogHeading.count} disponibles
                    </span>
                  </div>

                  {/* SECCION SERVICIOS */}
                  {enableServicios && (posFilterTab === "TODOS" || posFilterTab === "SERVICIOS") && servicesFiltered.length > 0 && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 ${isFullscreen ? 'xl:grid-cols-5' : ''} gap-3`}>
                        {servicesFiltered.map(s => {
                          const srvCount = serviciosSel.filter(x => x === s.nombre).length;
                          return (
                            <button
                              key={s.id}
                              onClick={() => setServiciosSel((arr) => [...arr, s.nombre])}
                              className={`group relative flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all active:scale-95 text-center ${srvCount > 0 ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-card hover:border-primary/40 hover:bg-primary/5 hover:shadow-elegant"
                                }`}
                            >
                              {s.imagen_url ? (
                                <div className="h-24 w-24 rounded-2xl bg-background shadow-md overflow-hidden group-hover:scale-105 transition-transform duration-300">
                                  <img src={s.imagen_url} alt={s.nombre} className="h-full w-full object-cover" />
                                </div>
                              ) : (
                                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-accent/30 text-4xl group-hover:bg-primary/10 transition-colors">
                                  {s.icono || "🧹"}
                                </div>
                              )}
                              <div className="w-full text-center">
                                <div className="text-sm font-bold leading-tight line-clamp-1">{s.nombre}</div>
                                <div className="mt-1 text-base font-display font-extrabold text-primary tracking-tight">{formatRD(s.precio)}</div>
                              </div>
                              {srvCount > 0 && (
                                <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-xs font-black shadow-glow animate-in zoom-in duration-300 ring-4 ring-background">
                                  {srvCount}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SECCIONES DE CATEGORIAS DE PRENDAS */}
                  {enablePrendas && (posFilterTab === "TODOS" || posFilterTab === "PRENDAS") && Array.from(new Set(catalogFiltered.map(c => c.categoria || "Otros"))).map(catName => {
                    const itemsInCat = catalogFiltered.filter(c => (c.categoria || "Otros") === catName);
                    if (itemsInCat.length === 0) return null;

                    return (
                      <div key={catName} className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="flex items-center gap-2.5 text-sm font-black text-slate-800 dark:text-slate-100 md:text-base">
                            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/10 dark:bg-primary/20">
                              <Shirt className="h-4 w-4" strokeWidth={2.2} />
                            </span>
                            {catName}
                          </h3>
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary dark:bg-primary/20">
                            {itemsInCat.length} disponibles
                          </span>
                        </div>
                        <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 ${isFullscreen ? 'xl:grid-cols-5' : ''} gap-3`}>
                          {itemsInCat.map(item => {
                            const countInCart = items.filter(it => it.descripcion === item.nombre).reduce((acc, it) => acc + it.cantidad, 0);

                            return (
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
                                  <div className="h-24 w-24 rounded-2xl bg-background shadow-md overflow-hidden group-hover:scale-105 transition-transform duration-300">
                                    <img src={item.imagen_url} alt={item.nombre} className="h-full w-full object-cover" />
                                  </div>
                                ) : (
                                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-accent/30 text-4xl group-hover:bg-primary/10 transition-colors">
                                    {item.icono || "👕"}
                                  </div>
                                )}
                                <div className="w-full text-center">
                                  <div className="text-sm font-bold leading-tight line-clamp-1">{item.nombre}</div>
                                  <div className="mt-1 text-base font-display font-extrabold text-primary tracking-tight">{formatRD(item.precio)}</div>
                                </div>

                                {countInCart > 0 && (
                                  <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold shadow-glow animate-in zoom-in duration-200">
                                    {countInCart}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </>
              </div>

            </Card>
          </div>

          {/* SIDEBAR ORDER */}
          <Card className="w-80 md:w-96 flex flex-col overflow-hidden border-2 border-primary/10 shadow-none rounded-3xl h-full">
            <div className="p-3 border-b bg-accent/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80">Cliente</span>
                <div className="inline-flex rounded-full border border-border/60 bg-muted/40 p-0.5 scale-95 origin-right shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSelectGeneric("Persona")}
                    className={`inline-flex items-center justify-center py-1.5 px-3 rounded-full text-[11.5px] font-semibold transition-all duration-200 cursor-pointer ${cliente?.tipo === "Consumidor Final" || (cliente?.nombre === "Consumidor" && cliente?.apellido === "Final")
                      ? "bg-primary text-white shadow-xs"
                      : "text-primary hover:bg-primary/5"
                      }`}
                  >
                    <UserIcon className="h-3.5 w-3.5 mr-1 shrink-0" />
                    Consumidor Final (01)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmpresaDialogOpen(true)}
                    className={`inline-flex items-center justify-center py-1.5 px-3 rounded-full text-[11.5px] font-semibold transition-all duration-200 cursor-pointer ${cliente?.tipo === "Empresa" && !(cliente?.nombre === "Empresa" && cliente?.apellido === "Genérica")
                      ? "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-xs"
                      : "text-slate-600 dark:text-slate-355 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                  >
                    <Building className="h-3.5 w-3.5 mr-1 shrink-0" />
                    Crédito Fiscal (02)
                  </button>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full justify-between h-9 bg-background border-border/50 rounded-xl font-bold shadow-xs px-3 hover:bg-background/90 text-left"
                onClick={() => setIsClientModalOpen(true)}
              >
                <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                  <span className="text-muted-foreground shrink-0">
                    {cliente?.tipo === "Empresa" ? <Building className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                  </span>
                  <span className="truncate text-xs text-slate-700 dark:text-slate-200 font-bold">
                    {cliente ? `${cliente.nombre} ${cliente.apellido || ""}` : "Seleccionar cliente"}
                  </span>
                </div>
                <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 ml-2" />
              </Button>
            </div>

            {/* List: Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {items.length === 0 && serviciosSel.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center px-4 h-full animate-in fade-in duration-300 -mt-3">
                  <Receipt className="h-11 w-11 text-slate-400 mb-3 shrink-0" />
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">La orden está vacía</h4>
                  <p className="text-xs text-slate-400 mt-1">Agrega artículos desde el catálogo</p>
                </div>
              ) : (
                <>
                  {/* Servicios Seleccionados en Carrito POS */}
                  {servicios.filter(s => serviciosSel.includes(s.nombre)).map((srv, idx) => {
                    const count = serviciosSel.filter(x => x === srv.nombre).length;
                    const unitPrice = customServicePrices[srv.nombre] !== undefined ? customServicePrices[srv.nombre] : (srv.precio || 0);
                    return (
                      <div key={'pos-srv-' + idx} className="flex flex-col gap-1.5 p-2.5 rounded-xl border border-primary/20 bg-primary/5 mb-3 transition-all animate-in fade-in duration-200">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-primary leading-tight flex-1">
                            <span>🧺</span>
                            <span className="line-clamp-1">Servicio: {srv.nombre}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-destructive hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md shrink-0"
                            onClick={() => setServiciosSel(prev => {
                              const index = prev.indexOf(srv.nombre);
                              if (index > -1) {
                                const next = [...prev];
                                next.splice(index, 1);
                                return next;
                              }
                              return prev;
                            })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" className="h-6 w-6 rounded-md" onClick={() => updateServiceQuantity(srv.nombre, -1)}>
                              <Minus className="h-2.5 w-2.5" />
                            </Button>
                            <span className="text-xs font-bold w-5 text-center">{count}</span>
                            <Button variant="outline" size="icon" className="h-6 w-6 rounded-md" onClick={() => updateServiceQuantity(srv.nombre, 1)}>
                              <Plus className="h-2.5 w-2.5" />
                            </Button>
                          </div>

                          <div className="flex flex-col items-end gap-0.5 shrink-0">
                            {srv.permitir_editar_precio ? (
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-bold text-muted-foreground">RD$</span>
                                  <PriceInput
                                    className="w-16 h-7 px-1 text-center text-xs font-black border-primary/30 bg-background focus:border-primary focus-visible:ring-0 rounded-md shadow-sm"
                                    value={unitPrice}
                                    onChange={(val) => {
                                      setCustomServicePrices(prev => ({ ...prev, [srv.nombre]: val }));
                                    }}
                                  />
                                </div>
                                {count > 1 && (
                                  <span className="text-[9px] text-muted-foreground font-semibold">
                                    Tot: {formatRD(count * unitPrice)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs font-black text-primary">
                                {formatRD(count * unitPrice)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Prendas (Items) */}
                  {items.map((it, i) => {
                    const isDetail = it.descripcion.startsWith("↳");
                    const catalogMatch = catalogo.find(c => c.nombre === it.descripcion);
                    return (
                      <div key={i} className={`flex flex-col gap-1.5 p-2.5 rounded-xl border transition-all ${isDetail ? "bg-accent/5 ml-6 border-dashed border-primary/20 text-muted-foreground" : "bg-card shadow-sm hover:border-primary/25"
                        }`}>
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 text-xs font-bold leading-tight">
                              {isDetail && <Shirt className="h-3 w-3 text-primary shrink-0" />}
                              <span className="line-clamp-1">{it.descripcion}{isDetail && it.cantidad > 1 ? ` (x${it.cantidad})` : ""}</span>
                            </div>
                            {it.es_libra && (
                              <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                                {formatRD(it.precio_unitario)} por libra
                              </div>
                            )}
                          </div>
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md" onClick={() => removeItem(i)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex justify-between items-center">
                          {isDetail ? (
                            <div className="text-[10px] font-black uppercase text-primary/80 tracking-wide flex items-center gap-1">
                              <span>🧺</span> {it.cantidad > 1 ? `${it.cantidad} Unids. en Hamper` : "En Hamper"}
                            </div>
                          ) : it.es_libra ? (
                            <div className="flex items-center gap-1.5 text-xs font-semibold">
                              <span className="text-slate-850 dark:text-slate-300 text-[10px] font-black">Peso:</span>
                              <Input
                                type="number"
                                step="any"
                                min="0.1"
                                className="w-20 h-7 text-center text-xs font-black border-primary/30 focus:border-primary focus-visible:ring-0 rounded-md shadow-sm p-1"
                                value={it.cantidad}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setItems(prev => prev.map((item, idx) => idx === i ? { ...item, cantidad: val } : item));
                                }}
                              />
                              <span className="text-muted-foreground text-[10px] font-bold">Libras</span>
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
                            </div>
                          )}
                          <div className="flex flex-col items-end gap-0.5 shrink-0">
                            {(!isDetail && catalogMatch?.permitir_editar_precio) ? (
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-bold text-muted-foreground">RD$</span>
                                  <PriceInput
                                    className="w-16 h-7 px-1 text-center text-xs font-black border-primary/30 bg-background focus:border-primary focus-visible:ring-0 rounded-md shadow-sm"
                                    value={it.precio_unitario || 0}
                                    onChange={(val) => {
                                      setItems(prev => prev.map((item, idx) => idx === i ? { ...item, precio_unitario: val } : item));
                                    }}
                                  />
                                </div>
                                {it.cantidad > 1 && (
                                  <span className="text-[9px] text-muted-foreground font-semibold">
                                    Tot: {formatRD(it.cantidad * it.precio_unitario)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs font-black text-primary">
                                {isDetail ? "RD$0.00" : formatRD(it.cantidad * it.precio_unitario)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Sección de Fecha Estimada de Entrega */}
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/60 border-t border-border/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-350">
                    Fecha estimada de entrega
                  </span>
                </div>
                <Switch
                  checked={!!fechaEntrega}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      const d = new Date();
                      d.setHours(12, 0, 0, 0);
                      const standardHrs = cfg.tiempo_entrega_estandar || 24;
                      d.setTime(d.getTime() + standardHrs * 3600000);
                      setFechaEntrega(d);
                    } else {
                      setFechaEntrega(undefined);
                    }
                  }}
                  className="scale-90 data-[state=checked]:bg-primary"
                />
              </div>

              {fechaEntrega && (
                <div 
                  onClick={() => setShowDeliveryDatePickerPOS(true)}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl border border-transparent bg-primary text-white shadow-md hover:bg-primary/95 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <CalendarIcon className="h-4 w-4 text-white shrink-0" />
                    <span className="text-[13px] font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis">
                      {(() => {
                        const weekday = fechaEntrega.toLocaleDateString("es-DO", { weekday: "long" });
                        const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
                        const day = fechaEntrega.getDate();
                        const month = fechaEntrega.toLocaleDateString("es-DO", { month: "long" });
                        const capMonth = month.charAt(0).toUpperCase() + month.slice(1);
                        return `${capWeekday}, ${day} de ${capMonth}`;
                      })()}
                    </span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-yellow-400 text-black shrink-0 transition-all hover:bg-yellow-300 shadow-2xs ml-2">
                    Cambiar
                  </span>
                </div>
              )}
            </div>

            {/* TODO: Descomentar para restaurar "Marcar orden como urgente" si el usuario lo vuelve a solicitar.
            <div className="px-4 py-2.5 bg-rose-500/[0.02] border-t border-primary/10 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer w-full select-none justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-4 w-4 transition-colors duration-200 ${esUrgente ? "text-rose-600 animate-pulse" : "text-muted-foreground/50"}`} />
                  <span className={`text-xs font-bold transition-colors duration-200 ${esUrgente ? "text-rose-600 dark:text-rose-400 font-extrabold" : "text-muted-foreground"}`}>
                    Marcar orden como urgente {cfg.recargo_urgencia > 0 && `(+${cfg.recargo_urgencia}%)`}
                  </span>
                </div>
                <Switch
                  checked={esUrgente}
                  onCheckedChange={setEsUrgente}
                  className="scale-90 data-[state=checked]:bg-rose-600"
                />
              </label>
            </div>
            */}

            {/* Footer: Totals & Button */}
            <div className="p-3 bg-primary/5 border-t border-primary/10 space-y-1.5">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground font-bold">
                  <span>SUBTOTAL</span>
                  <span>{formatRD(subtotalBruto)}</span>
                </div>
                {esUrgente && recargoTotal > 0 && (
                  <div className="flex justify-between text-xs text-rose-600 font-bold">
                    <span>RECARGO URGENTE (+{cfg.recargo_urgencia}%)</span>
                    <span>+{formatRD(recargoTotal)}</span>
                  </div>
                )}
                {itbis > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground font-bold">
                    <span>ITBIS ({cfg.itbis_porcentaje}%)</span>
                    <span>{formatRD(itbis)}</span>
                  </div>
                )}
                {descuentoMonto > 0 && (
                  <div className="flex justify-between text-xs text-rose-600 font-bold">
                    <span>DESCUENTO ({descuento}%)</span>
                    <span>-{formatRD(descuentoMonto)}</span>
                  </div>
                )}
                {servicioDomicilio && costoEnvio > 0 && (
                  <div className="flex justify-between text-xs text-teal-600 font-bold">
                    <span>ENVÍO A DOMICILIO</span>
                    <span>+{formatRD(costoEnvio)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-primary/10">
                  <span className="text-sm font-black uppercase">Total</span>
                  <span className="text-2xl font-black text-primary">{formatRD(total)}</span>
                </div>
              </div>
              {isPosMode ? (
                <Button
                  disabled={!cliente || (items.length === 0 && serviciosSel.length === 0)}
                  className="w-full h-14 text-base bg-primary hover:bg-primary/95 text-white shadow-glow border-none transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2.5 rounded-2xl relative px-10"
                  onClick={() => { setIsCobroModalOpen(true); }}
                >
                  <div className="flex items-center gap-2 justify-center">
                    <CreditCard className="h-5.5 w-5.5 text-white" />
                    <span className="font-black tracking-wide">COBRAR ORDEN</span>
                  </div>
                  <kbd className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none rounded bg-white/20 px-2.5 py-1 text-[11px] font-black text-white shadow-sm border-none uppercase flex items-center gap-1">
                    <span>Enter</span>
                    <CornerDownLeft className="h-3 w-3 shrink-0" />
                  </kbd>
                </Button>
              ) : (
                <Button
                  disabled={!cliente || (items.length === 0 && serviciosSel.length === 0)}
                  className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 text-white shadow-glow border-none transition-all active:scale-[0.98] mt-2"
                  onClick={() => { setIsCobroModalOpen(true); }}
                >
                  COBRAR <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              )}
            </div>
          </Card>
        </div>
      ) : (
        <>
          {/* Header Bar */}
          <div className="relative flex items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-border max-w-4xl mx-auto w-full">
            {/* Left element spacer */}
            <div className="w-8 md:w-36 shrink-0" />

            {/* Centered Mode indicator */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5 whitespace-nowrap">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="font-display text-sm font-black uppercase tracking-[0.15em] text-slate-800 dark:text-slate-200">
                Modo Clásico
              </span>
            </div>

            {cfg.pos_modo_defecto !== false && (
              <Button
                onClick={() => setIsPosMode(true)}
                className="bg-primary text-white hover:bg-primary/90 rounded-xl font-bold text-xs gap-1.5 h-10 shadow-sm active:scale-95 transition-all shrink-0"
              >
                <LayoutGrid className="h-4 w-4" />
                <span>Cambiar a Modo POS</span>
              </Button>
            )}
          </div>

          {/* Centered Stepper Wizard */}
          <div className="mt-4 mb-3 flex justify-center w-full">
            <Stepper step={step} enableServicios={enableServicios} enablePrendas={enablePrendas} />
          </div>

          <Card className="w-full max-w-4xl mx-auto mt-0 p-6 md:p-8">
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
                      const name = NCF_NOMBRES[tipo.substring(0, 3)]?.replace("FISCAL", "")?.trim() || "Empresa";

                      const label = isConsumo ? "Consumidor Final (01)" : (isCredito ? "Crédito Fiscal (02)" : name);
                      const subLabel = isConsumo ? "Factura Consumo" : (isCredito ? "Crédito Fiscal" : `Comprobante ${tipo}`);
                      const Icon = isConsumo ? UserIcon : (isCredito ? Truck : Building);

                      const isSelected = tipoECF === tipo;
                      let borderClass = "";
                      let bgClass = "";
                      let bgIconClass = "";
                      let textClass = "";
                      let subTextClass = "";

                      if (isConsumo) {
                        bgClass = isSelected ? "bg-emerald-50/70 dark:bg-emerald-950/20" : "bg-emerald-50/20 dark:bg-emerald-950/5";
                        borderClass = isSelected
                          ? "border-emerald-500 ring-2 ring-emerald-500/20"
                          : "border-emerald-200/80 dark:border-emerald-900/40 hover:border-emerald-300";
                        bgIconClass = isSelected ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
                        textClass = isSelected ? "text-emerald-700 dark:text-emerald-300 font-extrabold" : "text-slate-700 dark:text-slate-355 font-bold";
                        subTextClass = isSelected ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400";
                      } else if (isCredito) {
                        bgClass = isSelected ? "bg-blue-50/70 dark:bg-blue-950/20" : "bg-blue-50/20 dark:bg-blue-950/5";
                        borderClass = isSelected
                          ? "border-blue-500 ring-2 ring-blue-500/20"
                          : "border-blue-200/80 dark:border-blue-900/40 hover:border-blue-300";
                        bgIconClass = isSelected ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
                        textClass = isSelected ? "text-blue-700 dark:text-blue-300 font-extrabold" : "text-slate-700 dark:text-slate-355 font-bold";
                        subTextClass = isSelected ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400";
                      } else {
                        bgClass = isSelected ? "bg-amber-50/70 dark:bg-amber-950/20" : "bg-amber-50/20 dark:bg-amber-950/5";
                        borderClass = isSelected
                          ? "border-amber-500 ring-2 ring-amber-500/20"
                          : "border-amber-200/80 dark:border-amber-900/40 hover:border-amber-300";
                        bgIconClass = isSelected ? "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
                        textClass = isSelected ? "text-amber-700 dark:text-amber-300 font-extrabold" : "text-slate-700 dark:text-slate-355 font-bold";
                        subTextClass = isSelected ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400";
                      }

                      // We only show non-consumo buttons if billing is active
                      if (!isConsumo && !isModuleEnabled(user.tenant, 'facturacion_fiscal', plans.find(p => p.id === user.tenant.plan_id))) {
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
                          className={`relative flex items-center gap-2.5 p-3 rounded-2xl border transition-all group text-left shadow-sm ${bgClass} ${borderClass}`}
                        >
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 ${bgIconClass}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1 pr-4">
                            <div className={`font-bold text-sm leading-tight line-clamp-1 ${textClass}`}>{label}</div>
                            <div className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 whitespace-nowrap ${subTextClass}`}>{subLabel}</div>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white shadow-sm ring-2 ring-background animate-in zoom-in duration-200">
                              <Check className="h-2.5 w-2.5" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-8 mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="h-3.5 w-1 bg-primary rounded-full animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-widest text-primary/80">
                        Búsqueda en base de datos
                      </span>
                      <div className="flex-1 h-px bg-primary/10 mr-4" />
                    </div>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm transition-all active:scale-95 shrink-0" size="sm" onClick={() => setShowNewCliente(true)}>
                      <UserPlus className="mr-1.5 h-4 w-4" /> Nuevo cliente
                    </Button>
                  </div>

                  <div className="mt-4 max-h-80 grid gap-3 grid-cols-1 sm:grid-cols-2 overflow-auto rounded-xl border border-border bg-accent/10 p-3">
                    {filtrados.length === 0 && <div className="col-span-full py-12 text-center text-sm text-muted-foreground">No se encontraron clientes</div>}
                    {filtrados.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setCliente(c);
                          if (!isPosMode) {
                            irAlPasoSiguienteDelCliente();
                          }
                        }}
                        className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-all min-w-0 ${cliente?.id === c.id
                          ? "border-primary bg-primary/10 ring-1 ring-primary shadow-sm"
                          : "border-border bg-card hover:border-primary/50 hover:bg-accent/30 hover:shadow-elegant"
                          }`}
                      >
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold shrink-0 ${cliente?.id === c.id ? "bg-primary text-white" : "bg-accent text-muted-foreground"
                            }`}>
                            {c.nombre.charAt(0)}{c.apellido?.charAt(0) || ""}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-display text-base font-semibold line-clamp-1" title={`${c.nombre} ${c.apellido || ""}`}>
                              {c.nombre} {c.apellido || ""}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                              <Phone className="h-3 w-3 shrink-0" /> {c.telefono}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
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
                        const srvCount = serviciosSel.filter(x => x === s.nombre).length;
                        return (
                          <button key={s.id} onClick={() => {
                            if (srvCount > 0) {
                              setServiciosSel((arr) => arr.filter(x => x !== s.nombre));
                              setCustomServicePrices((prev) => {
                                const next = { ...prev };
                                delete next[s.nombre];
                                return next;
                              });
                            } else {
                              setServiciosSel((arr) => [...arr, s.nombre]);
                            }
                          }}
                            className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left text-sm transition relative ${srvCount > 0 ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                              }`}>
                            <div className={`flex h-5 w-5 items-center justify-center rounded border-2 ${srvCount > 0 ? "border-primary bg-primary text-white" : "border-border"}`}>
                              {srvCount > 0 && <Check className="h-3 w-3" />}
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
                            {srvCount > 0 && (
                              <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-[9px] font-black shadow-sm ring-2 ring-background">
                                {srvCount}
                              </div>
                            )}
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
                    {servicios.filter(s => serviciosSel.includes(s.nombre)).map((srv, idx) => {
                      const count = serviciosSel.filter(x => x === srv.nombre).length;
                      const unitPrice = customServicePrices[srv.nombre] !== undefined ? customServicePrices[srv.nombre] : (srv.precio || 0);
                      return (
                        <div key={'srv-' + idx} className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 animate-in fade-in duration-200">
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

                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" className="h-6 w-6 rounded-md" onClick={() => updateServiceQuantity(srv.nombre, -1)}>
                              <Minus className="h-2.5 w-2.5" />
                            </Button>
                            <span className="text-xs font-bold w-5 text-center">{count}</span>
                            <Button variant="outline" size="icon" className="h-6 w-6 rounded-md" onClick={() => updateServiceQuantity(srv.nombre, 1)}>
                              <Plus className="h-2.5 w-2.5" />
                            </Button>
                          </div>

                          <div className="flex flex-col items-end gap-0.5 shrink-0">
                            {srv.permitir_editar_precio ? (
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-bold text-muted-foreground">RD$</span>
                                  <PriceInput
                                    className="w-20 h-8 px-1 text-center text-sm font-black border-primary/30 bg-background focus:border-primary focus-visible:ring-0 rounded-md shadow-sm"
                                    value={unitPrice}
                                    onChange={(val) => {
                                      setCustomServicePrices(prev => ({ ...prev, [srv.nombre]: val }));
                                    }}
                                  />
                                </div>
                                {count > 1 && (
                                  <span className="text-[10px] text-muted-foreground font-semibold">
                                    Tot: {formatRD(count * unitPrice)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="font-display text-base sm:text-lg font-bold text-primary">
                                {formatRD(count * unitPrice)}
                              </div>
                            )}
                          </div>
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
                              className="h-8 w-8 text-destructive hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md"
                              onClick={() => setServiciosSel(prev => prev.filter(x => x !== srv.nombre))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Items normal */}
                    {items.map((it, i) => {
                      const isDetail = it.descripcion.startsWith("↳");
                      const catalogMatch = catalogo.find(c => c.nombre === it.descripcion);
                      return (
                        <div key={i} className={`flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-all ${isDetail ? "bg-accent/5 ml-8 border-dashed border-primary/20 text-muted-foreground" : "bg-surface-elevated"
                          }`}>
                          <div className="flex-1">
                            <div className="font-medium flex items-center gap-2">
                              {isDetail && <Shirt className="h-3 w-3 text-primary" />}
                              {it.descripcion}{isDetail && it.cantidad > 1 ? ` (x${it.cantidad})` : ""}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {isDetail ? `${it.cantidad} ${it.cantidad > 1 ? "unidades" : "unidad"} en Hamper (Lavado Incluido)` : (it.es_libra ? `${it.cantidad} lb × ${formatRD(it.precio_unitario)}` : `${it.cantidad} unid. × ${formatRD(it.precio_unitario)}`)}
                              {it.notas ? ` · ${it.notas}` : ""}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {(!isDetail && catalogMatch?.permitir_editar_precio) ? (
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-bold text-muted-foreground">RD$</span>
                                  <PriceInput
                                    className="w-20 h-8 px-1 text-center text-sm font-black border-primary/30 bg-background focus:border-primary focus-visible:ring-0 rounded-md shadow-sm"
                                    value={it.precio_unitario || 0}
                                    onChange={(val) => {
                                      setItems(prev => prev.map((item, idx) => idx === i ? { ...item, precio_unitario: val } : item));
                                    }}
                                  />
                                </div>
                                {it.cantidad > 1 && (
                                  <span className="text-[10px] text-muted-foreground font-semibold">
                                    Total: {formatRD(it.cantidad * it.precio_unitario)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="font-display text-lg">
                                {isDetail ? "RD$0.00" : formatRD(it.cantidad * it.precio_unitario)}
                              </div>
                            )}
                          </div>
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

                  <div className="space-y-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-primary" />
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-250">
                          Detalles de la orden
                        </span>
                      </div>
                      <Badge className="bg-primary text-white hover:bg-primary/90 border-none shadow-sm text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
                        {serviciosSel.length + items.length} {(serviciosSel.length + items.length) === 1 ? "artículo" : "artículos"}
                      </Badge>
                    </div>
                    <div className="space-y-0 divide-y divide-dashed divide-slate-200 dark:divide-slate-800">
                      {servicios.filter(s => serviciosSel.includes(s.nombre)).map((srv, idx) => {
                        const count = serviciosSel.filter(x => x === srv.nombre).length;
                        const sPrice = customServicePrices[srv.nombre] !== undefined
                          ? customServicePrices[srv.nombre]
                          : (srv.precio || 0);
                        return (
                          <div key={`srv-${idx}`} className="flex justify-between items-center py-3 first:pt-0 last:pb-0 text-sm group">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-450 shrink-0">
                                <LayoutGrid className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-sm text-foreground truncate">{srv.nombre}</div>
                                <div className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider mt-0.5">
                                  Servicio • {count} {count > 1 ? "unidades" : "unidad"}
                                </div>
                              </div>
                            </div>
                            <div className="font-display font-black text-base text-primary font-bold">
                              {formatRD(count * sPrice)}
                            </div>
                          </div>
                        );
                      })}

                      {items.map((it, i) => (
                        <div key={i} className="flex justify-between items-center py-3 first:pt-0 last:pb-0 text-sm group">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-450 shrink-0">
                              <Shirt className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-sm text-foreground truncate">{it.descripcion}</div>
                              <div className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider mt-0.5">
                                Prenda • {it.cantidad} {it.es_libra ? "lb" : "unid."}
                              </div>
                            </div>
                          </div>
                          <div className="font-display font-bold text-base text-foreground">
                            {formatRD(it.cantidad * it.precio_unitario)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 grid-cols-1 lg:grid-cols-2">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Fecha de entrega">
                          <DatePicker date={fechaEntrega} setDate={setFechaEntrega} />
                        </Field>
                        <Field label="Descuento (%)">
                          <Input
                            type="number"
                            value={descuento}
                            onChange={(e) => {
                              const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                              const maxLimit = user?.empleado?.rol === "ADMIN" 
                                ? 100 
                                : (user?.empleado?.max_descuento_porcentaje ?? 100);
                              if (val > maxLimit) {
                                toast.error(`Límite permitido: ${maxLimit}%`);
                                setDescuento(maxLimit);
                              } else {
                                setDescuento(val);
                              }
                            }}
                            placeholder="0"
                            className="h-9"
                          />
                        </Field>
                      </div>

                      <div className="rounded-2xl border border-border/80 bg-accent/5 p-4 space-y-4">
                        {/* Option 1: Servicio a domicilio */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-450 shrink-0">
                                <Truck className="h-4.5 w-4.5" />
                              </div>
                              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Servicio a domicilio</span>
                            </div>
                            <Switch checked={servicioDomicilio} onCheckedChange={setServicioDomicilio} />
                          </div>

                          {servicioDomicilio && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-3 pl-12 pt-2 border-t border-dashed">
                              <Field label="Dirección de entrega">
                                <Input
                                  value={direccionDomicilio}
                                  onChange={(e) => setDireccionDomicilio(e.target.value)}
                                  onBlur={() => {
                                    if (cliente) {
                                      const isGenericClient = cliente.nombre === "Consumidor" && cliente.apellido === "Final";
                                      if (!isGenericClient && direccionDomicilio.trim() && direccionDomicilio.trim() !== cliente.direccion) {
                                        const updatedCliente = { ...cliente, direccion: direccionDomicilio.trim() };
                                        setCliente(updatedCliente);
                                        saveCliente(updatedCliente).then(() => {
                                          queryClient.invalidateQueries({ queryKey: ['clientes', tenantId] });
                                        });
                                      }
                                    }
                                  }}
                                  placeholder="Calle, No., Sector..."
                                  className="bg-background"
                                />
                              </Field>
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                Se guardará en la ficha del cliente si es nueva.
                              </p>
                              <Field label="Costo de envío (RD$)">
                                <PriceInput
                                  value={costoDomicilio}
                                  onChange={setCostoDomicilio}
                                  placeholder="0.00"
                                  className="bg-background"
                                />
                              </Field>
                            </motion.div>
                          )}
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-border/60" />

                        {/* Option 2: Urgente */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-450 shrink-0">
                              <AlertTriangle className="h-4.5 w-4.5" />
                            </div>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Pedido Urgente (+{cfg.recargo_urgencia}%)</span>
                          </div>
                          <Switch checked={esUrgente} onCheckedChange={setEsUrgente} />
                        </div>

                        {/* Divider if ITBIS is active */}
                        {cfg.ncf_facturacion_activa && (
                          <>
                            <div className="h-px bg-border/60" />
                            {/* Option 3: ITBIS */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-450 shrink-0">
                                  <Percent className="h-4 w-4" />
                                </div>
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Aplicar ITBIS ({cfg.itbis_porcentaje}%)</span>
                              </div>
                              <Switch checked={aplicarItbis} onCheckedChange={setAplicarItbis} />
                            </div>
                          </>
                        )}
                      </div>

                      {/* Notas (Observaciones) at the end */}
                      <Field label="Notas">
                        <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observaciones..." rows={3} />
                      </Field>
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

                        {descuentoMonto > 0 && (
                          <div className="text-sm font-bold text-destructive">
                            Descuento aplicado ({descuento}%): -{formatRD(descuentoMonto)}
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

                  <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 max-w-4xl mx-auto w-full">
                    {[
                      { id: "PAGO_AL_RETIRAR", label: "Pago al retirar", icon: Timer, color: "from-teal-500/10 to-teal-500/[0.02] border-teal-500/25 text-teal-700" },
                      { id: "EFECTIVO", label: "Efectivo", icon: Banknote, color: "from-emerald-500/10 to-emerald-500/[0.02] border-emerald-500/25 text-emerald-700" },
                      { id: "TARJETA", label: "Tarjeta", icon: CreditCard, color: "from-indigo-500/10 to-indigo-500/[0.02] border-indigo-500/25 text-indigo-700" },
                      { id: "TRANSFERENCIA", label: "Transferencia", icon: Building2, color: "from-sky-500/10 to-sky-500/[0.02] border-sky-500/25 text-sky-700" },
                      { id: "CREDITO", label: "Crédito", icon: FileText, color: "from-amber-500/10 to-amber-500/[0.02] border-amber-500/25 text-amber-700" }
                    ].map((m) => {
                      const isSelected = opcionPagoSelected === m.id;
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleOpcionPagoChange(m.id)}
                          className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 p-5 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 group text-center cursor-pointer ${isSelected
                            ? `bg-gradient-to-br ${m.color} ring-2 ring-primary/20 shadow-md scale-102`
                            : "border-slate-200 dark:border-slate-800 bg-card hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm text-slate-500"
                            }`}
                        >
                          <div className={`flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-105 shadow-inner ${isSelected ? "bg-white dark:bg-slate-900" : "bg-slate-100 dark:bg-slate-800"
                            }`}>
                            <Icon className="h-6 w-6 shrink-0" />
                          </div>
                          <div className={`font-black text-xs uppercase tracking-wider ${isSelected ? "font-black text-inherit" : "text-slate-600 dark:text-slate-400"
                            }`}>
                            {m.label}
                          </div>
                          {isSelected && (
                            <div className="absolute top-3 right-3 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-primary text-white shadow-sm ring-2 ring-background animate-in zoom-in duration-200">
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {opcionPagoSelected === "PAGO_AL_RETIRAR" && (
                    <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center gap-4 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-500/[0.03] p-4 text-teal-800 dark:text-teal-200">
                        <Timer className="h-8 w-8 text-teal-600 shrink-0" />
                        <div>
                          <strong className="block text-sm">Cobro contra entrega (Pago al retirar)</strong>
                          <span className="text-xs">La orden se registrará con <b>RD$0.00 pagados</b> y se creará un saldo pendiente de <b>{formatRD(total)}</b> que se cobrará cuando el cliente venga a retirar su ropa.</span>
                        </div>
                      </div>
                    </div>
                  )}

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
                            <PriceInput
                              className="h-full pl-24 !text-5xl font-black font-display bg-background border-2 border-primary/20 focus-visible:ring-primary/30"
                              value={recibido}
                              onChange={setRecibido}
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

                  {(metodo === "TARJETA" || metodo === "TRANSFERENCIA") && (
                    <div className="mt-4 rounded-2xl border-2 border-border/60 bg-accent/5 p-6 animate-in fade-in slide-in-from-top-1 duration-200 max-w-4xl mx-auto w-full">
                      <div className="flex flex-col gap-3">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Referencia de Transacción
                        </Label>
                        {!showRefInput ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowRefInput(true)}
                            className="w-full h-12 rounded-xl font-bold gap-2 text-primary border-primary/20 hover:bg-primary/5 hover:text-primary cursor-pointer"
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
                              className="h-12 bg-white border-2 border-primary/20 focus-visible:ring-primary/30 rounded-xl font-medium"
                              autoFocus
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              onClick={() => {
                                setReferencia("");
                                setShowRefInput(false);
                              }}
                              className="h-12 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold gap-2 cursor-pointer border-none"
                            >
                              <Trash2 className="h-4 w-4" /> Quitar
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {opcionPagoSelected === "CREDITO" && (
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
                      <div className="rounded-[1.75rem] border border-amber-200 dark:border-amber-800 bg-amber-500/[0.03] p-5 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center gap-2 mb-4">
                          <Timer className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                          <span className="text-[11px] font-black uppercase tracking-[0.08em] text-amber-800 dark:text-amber-300">
                            PLAZO DE CRÉDITO (DÍAS DE VENCIMIENTO)
                          </span>
                        </div>
                        <div className="grid grid-cols-6 gap-2.5">
                          {OPCIONES_CREDITO.map((op) => (
                            <button
                              key={op.dias}
                              type="button"
                              onClick={() => actualizarLimiteDias(op.dias)}
                              className={`relative flex flex-col items-center justify-center py-3.5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${limiteDiasSel === op.dias
                                ? "border-amber-500 bg-amber-500/[0.05] text-amber-700 dark:text-amber-300 font-bold scale-[1.03] shadow-sm ring-1 ring-amber-500/20"
                                : "border-border bg-card text-muted-foreground hover:border-amber-400 hover:bg-amber-500/5 shadow-sm"
                                }`}
                            >
                              <span className={`text-xl font-display font-black leading-none mb-1 ${limiteDiasSel === op.dias ? "text-amber-700 dark:text-amber-300" : "text-foreground"
                                }`}>{op.dias}</span>
                              <span className={`text-[9px] font-black uppercase tracking-wider leading-none ${limiteDiasSel === op.dias ? "text-amber-600" : "text-muted-foreground"
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
                          <PriceInput
                            className="!h-full pl-20 !text-4xl font-black font-display bg-background border-2 border-warning/20 focus-visible:ring-warning/30 rounded-2xl text-amber-700 dark:text-amber-300 font-bold"
                            value={abonoCredito}
                            onChange={(val) => {
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
                    disabled={(metodo === "EFECTIVO" && (faltante > 0)) || isCreatingOrden}
                  >
                    {isCreatingOrden ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> PROCESANDO...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-5 w-5" /> CONFIRMAR Y CREAR ORDEN
                      </>
                    )}
                  </Button>
                  <Button
                    variant="default"
                    className="h-10 px-8 rounded-xl bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 text-blue-600 dark:text-slate-300 font-bold text-xs active:scale-95 border border-blue-100 dark:border-transparent shadow-sm transition-all duration-200"
                    onClick={prev}
                  >
                    <ArrowLeft className="mr-2 h-3 w-3" /> VOLVER ATRÁS
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="default"
                    className="rounded-xl bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 text-blue-600 dark:text-slate-300 font-bold text-xs px-6 h-10 transition-all active:scale-95 border border-blue-100 dark:border-transparent shadow-sm disabled:opacity-50 disabled:pointer-events-none"
                    onClick={prev}
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
      <Dialog open={isClientModalOpen} onOpenChange={setIsClientModalOpen}>
        <DialogContent className="w-[90vw] sm:max-w-[580px] rounded-3xl p-6 overflow-hidden flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-display font-bold flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              <span>Buscar Cliente</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Busca por nombre o teléfono, o utiliza una de las opciones rápidas.
            </DialogDescription>
          </DialogHeader>

          <div className="py-1 space-y-4 w-full">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                value={clientSearchQuery}
                onChange={(e) => setClientSearchQuery(e.target.value)}
                placeholder="Escribe el nombre o teléfono del cliente..."
                className="w-full pl-10 h-11 bg-accent/20 border-border/50 focus-visible:ring-primary/20 rounded-xl text-sm"
                autoFocus
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 custom-scrollbar text-xs pr-1 w-full">
              <div className="flex items-center gap-2 mt-2.5 mb-2.5 px-1.5">
                <div className="h-3.5 w-1 bg-primary rounded-full" />
                <span className="text-xs font-black uppercase tracking-widest text-primary">
                  Clientes Rápidos
                </span>
                <div className="flex-1 h-px bg-primary/10" />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    handleSelectGeneric("Persona");
                    setIsClientModalOpen(false);
                  }}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all text-left border ${cliente?.tipo === "Consumidor Final" || (cliente?.nombre === "Consumidor" && cliente?.apellido === "Final")
                    ? "bg-primary border-transparent text-white font-bold shadow-sm"
                    : "hover:bg-primary hover:text-white hover:border-transparent border-transparent"
                    }`}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${cliente?.tipo === "Consumidor Final" || (cliente?.nombre === "Consumidor" && cliente?.apellido === "Final")
                    ? "bg-white/20 text-white"
                    : "bg-emerald-500/10 text-emerald-600 group-hover:bg-white/20 group-hover:text-white"
                    }`}>
                    <UserIcon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs truncate leading-tight">Consumidor Final (01)</div>
                    <div className={`text-[9px] truncate transition-colors mt-0.5 ${cliente?.tipo === "Consumidor Final" || (cliente?.nombre === "Consumidor" && cliente?.apellido === "Final")
                      ? "text-white/80"
                      : "text-muted-foreground group-hover:text-white/85"
                      }`}>
                      Venta rápida de mostrador
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsClientModalOpen(false);
                    setEmpresaDialogOpen(true);
                  }}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all text-left border ${cliente?.tipo === "Empresa" && !(cliente?.nombre === "Empresa" && cliente?.apellido === "Genérica")
                    ? "bg-primary border-transparent text-white font-bold shadow-sm"
                    : "hover:bg-primary hover:text-white hover:border-transparent border-transparent"
                    }`}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${cliente?.tipo === "Empresa" && !(cliente?.nombre === "Empresa" && cliente?.apellido === "Genérica")
                    ? "bg-white/20 text-white"
                    : "bg-blue-500/10 text-blue-600 group-hover:bg-white/20 group-hover:text-white"
                    }`}>
                    <Building className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs truncate leading-tight">Crédito Fiscal (02)</div>
                    <div className={`text-[9px] truncate transition-colors mt-0.5 ${cliente?.tipo === "Empresa" && !(cliente?.nombre === "Empresa" && cliente?.apellido === "Genérica")
                      ? "text-white/80"
                      : "text-muted-foreground group-hover:text-white/85"
                      }`}>
                      Buscar por RNC o Cédula
                    </div>
                  </div>
                </button>
              </div>

              <div className="flex items-center gap-2 mt-4 mb-2.5 px-1.5">
                <div className="h-3.5 w-1 bg-primary rounded-full animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest text-primary">
                  Base de Datos
                </span>
                <div className="flex-1 h-px bg-primary/10" />
              </div>

              {filteredClients
                .filter(c =>
                  c.id !== (tenantId.substring(0, 24) + "f000" + tenantId.substring(28)) &&
                  c.id !== (tenantId.substring(0, 24) + "e000" + tenantId.substring(28))
                )
                .map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCliente(c);
                      setIsClientModalOpen(false);
                      const isEmpresa = c.tipo === "Empresa" || (c.cedula && c.cedula.length >= 9);
                      const target = isElectronic ? (isEmpresa ? "E31" : "E32") : (isEmpresa ? "B01" : "B02");
                      if (validTipos.includes(target)) {
                        setTipoECF(target);
                      }
                    }}
                    className={`group flex w-full items-center justify-between rounded-xl px-3 py-2 transition-all text-left border ${cliente?.id === c.id
                      ? "bg-primary border-transparent text-white font-bold shadow-sm"
                      : "hover:bg-primary hover:text-white hover:border-transparent border-transparent"
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold shrink-0 transition-colors ${cliente?.id === c.id
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-white/20 group-hover:text-white"
                        }`}>
                        {c.tipo === "Empresa" ? <Building className="h-4.5 w-4.5" /> : <UserIcon className="h-4.5 w-4.5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm truncate leading-snug">{c.nombre} {c.apellido || ""}</div>
                        <div className={`text-xs transition-colors mt-0.5 ${cliente?.id === c.id
                          ? "text-white/80"
                          : "text-muted-foreground group-hover:text-white/85"
                          }`}>{c.telefono}</div>
                      </div>
                    </div>
                    {cliente?.id === c.id && <Check className="h-4.5 w-4.5 text-white shrink-0 transition-colors" />}
                  </button>
                ))}

              {filteredClients.length === 0 && (
                <div className="py-6 text-center text-muted-foreground text-[10px]">No se encontraron clientes</div>
              )}
            </div>
          </div>

          <div className="h-px bg-border my-1" />
          <div className="grid grid-cols-2 gap-3 w-full">
            <Button
              variant="default"
              size="sm"
              className="h-10 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm flex items-center justify-center gap-1.5 w-full transition-all active:scale-[0.98] dark:bg-emerald-600 dark:hover:bg-emerald-700"
              onClick={() => {
                setIsClientModalOpen(false);
                setShowNewCliente(true);
              }}
            >
              <UserPlus className="h-4 w-4" /> Nuevo Cliente
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-10 text-xs font-bold rounded-xl bg-[#1e293b] hover:bg-[#0f172a] text-white border-none shadow-sm flex items-center justify-center gap-1.5 w-full transition-all active:scale-[0.98] dark:bg-[#0f172a] dark:hover:bg-slate-950"
              onClick={() => {
                setIsClientModalOpen(false);
                setEmpresaDialogOpen(true);
              }}
            >
              <Search className="h-4 w-4" /> Buscar RNC (DGII)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ClienteDialog open={showNewCliente} onOpenChange={setShowNewCliente} tenant={user.tenant} onDone={(c) => {
        if (c) {
          setCliente(c);
          if (!isPosMode) {
            irAlPasoSiguienteDelCliente();
          }
        }
        setShowNewCliente(false);
      }} />

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

      <Dialog open={isCobroModalOpen} onOpenChange={setIsCobroModalOpen}>
        <DialogContent className="max-w-2xl p-5 rounded-2xl overflow-y-auto max-h-[95vh] custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-xl font-display font-bold text-foreground">Panel de Cobro</DialogTitle>
            <DialogDescription className="sr-only">
              Selecciona el método de pago y confirma la creación de la orden.
            </DialogDescription>
          </DialogHeader>

          <div className="py-1 space-y-4">
            <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-2">
              {[
                { id: "PAGO_AL_RETIRAR", label: "Pago al retirar", icon: Timer, color: "from-teal-500/10 to-teal-500/[0.02] border-teal-500/25 text-teal-700" },
                { id: "EFECTIVO", label: "Efectivo", icon: Banknote, color: "from-emerald-500/10 to-emerald-500/[0.02] border-emerald-500/25 text-emerald-700" },
                { id: "TARJETA", label: "Tarjeta", icon: CreditCard, color: "from-indigo-500/10 to-indigo-500/[0.02] border-indigo-500/25 text-indigo-700" },
                { id: "TRANSFERENCIA", label: "Transf.", icon: Building2, color: "from-sky-500/10 to-sky-500/[0.02] border-sky-500/25 text-sky-700" },
                { id: "CREDITO", label: "Crédito", icon: FileText, color: "from-amber-500/10 to-amber-500/[0.02] border-amber-500/25 text-amber-700" }
              ].map((m) => {
                const isSelected = opcionPagoSelected === m.id;
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleOpcionPagoChange(m.id)}
                    className={`relative flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 p-3 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 group text-center cursor-pointer ${isSelected
                      ? `bg-gradient-to-br ${m.color} ring-1 ring-primary shadow-glow scale-102`
                      : "border-border bg-card hover:border-primary/40 hover:shadow-xs text-slate-500"
                      }`}
                  >
                    <Icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-105 shrink-0" />
                    <div className={`font-bold text-xs uppercase tracking-tight ${isSelected ? "font-black text-inherit" : "text-foreground"}`}>
                      {m.label}
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white shadow-sm ring-2 ring-background animate-in zoom-in duration-200">
                        <Check className="h-2 w-2 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {opcionPagoSelected === "PAGO_AL_RETIRAR" && (
              <div className="space-y-4 mb-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-4 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-500/[0.03] p-4 text-teal-800 dark:text-teal-200">
                  <Timer className="h-8 w-8 text-teal-600 shrink-0" />
                  <div>
                    <strong className="block text-sm">Cobro contra entrega (Pago al retirar)</strong>
                    <span className="text-xs">La orden se registrará con <b>RD$0.00 pagados</b> y se creará un saldo pendiente de <b>{formatRD(total)}</b> que se cobrará cuando el cliente venga a retirar su ropa.</span>
                  </div>
                </div>
              </div>
            )}

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
              <div className="rounded-2xl border border-border/60 bg-accent/5 p-3 mb-3">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
                  <Field label="Monto recibido">
                    <div className="relative h-16">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-lg text-muted-foreground/50">RD$</span>
                      <PriceInput
                        className="!h-full pl-16 !text-3xl font-black font-display bg-background border border-primary/20 focus-visible:ring-primary/30 rounded-xl"
                        value={recibido}
                        onChange={(val) => {
                          if (val > 100000000) return;
                          setRecibido(val);
                        }}
                        placeholder="0.00"
                      />
                    </div>
                  </Field>

                  <Field label={faltante > 0 ? "Faltante" : "Cambio a entregar"}>
                    <div className={`flex items-center justify-center h-16 px-4 rounded-xl border transition-all duration-300 ${faltante > 0
                      ? "bg-destructive/5 border-destructive/30 text-destructive animate-pulse"
                      : "bg-emerald-500/5 border-emerald-500/30 text-emerald-600"
                      }`}>
                      <div className={`font-display font-black text-center break-all leading-tight ${(faltante > 0 ? faltante : vuelto) > 999999 ? "text-lg" : "text-2xl"}`}>
                        {formatRD(faltante > 0 ? faltante : vuelto)}
                      </div>
                    </div>
                  </Field>
                </div>
              </div>
            )}

            {(metodo === "TARJETA" || metodo === "TRANSFERENCIA") && (
              <div className="rounded-xl border border-border/60 bg-accent/5 p-4 mb-3 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex flex-col gap-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Referencia de Transacción
                  </Label>
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
                        className="h-10 bg-white border border-primary/20 focus-visible:ring-primary/30 rounded-xl font-medium text-xs"
                        autoFocus
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => {
                          setReferencia("");
                          setShowRefInput(false);
                        }}
                        className="h-10 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold gap-2 cursor-pointer border-none text-xs"
                      >
                        <Trash2 className="h-4 w-4" /> Quitar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {opcionPagoSelected === "CREDITO" && (
              <div className="space-y-4 mb-4">
                <div className="flex items-center gap-4 rounded-xl border border-warning/40 bg-warning/5 p-4 text-warning-foreground">
                  <AlertTriangle className="h-8 w-8 text-warning shrink-0" />
                  <div>
                    <strong className="block text-lg">Venta a crédito</strong>
                    Se registrará en el balance de <span className="font-bold">{cliente?.nombre}</span>.
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-amber-200 dark:border-amber-800 bg-amber-500/[0.03] p-5 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center gap-2 mb-4">
                    <Timer className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                    <span className="text-[11px] font-black uppercase tracking-[0.08em] text-amber-800 dark:text-amber-300">
                      PLAZO DE CRÉDITO (DÍAS DE VENCIMIENTO)
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-2.5">
                    {OPCIONES_CREDITO.map((op) => (
                      <button
                        key={op.dias}
                        type="button"
                        onClick={() => actualizarLimiteDias(op.dias)}
                        className={`relative flex flex-col items-center justify-center py-3.5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${limiteDiasSel === op.dias
                          ? "border-amber-500 bg-amber-500/[0.05] text-amber-700 dark:text-amber-300 font-bold scale-[1.03] shadow-sm ring-1 ring-amber-500/20"
                          : "border-border bg-card text-muted-foreground hover:border-amber-400 hover:bg-amber-500/5 shadow-sm"
                          }`}
                      >
                        <span className={`text-xl font-display font-black leading-none mb-1 ${limiteDiasSel === op.dias ? "text-amber-700 dark:text-amber-300" : "text-foreground"
                          }`}>{op.dias}</span>
                        <span className={`text-[9px] font-black uppercase tracking-wider leading-none ${limiteDiasSel === op.dias ? "text-amber-600" : "text-muted-foreground"
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
                    <PriceInput
                      className="!h-full pl-20 !text-4xl font-black font-display bg-background border-2 border-warning/20 focus-visible:ring-warning/30 rounded-2xl text-amber-700 dark:text-amber-300 font-bold"
                      value={abonoCredito}
                      onChange={(val) => {
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

            <div className="flex justify-center pt-4">
              <Button
                size="lg"
                className="w-full md:max-w-md h-14 text-base tracking-wide rounded-[1.25rem] font-bold bg-[#16A34A] hover:bg-[#15803D] text-white hover:-translate-y-0.5 transition-all shadow-none relative px-10"
                onClick={onCrearOrden}
                disabled={(metodo === "EFECTIVO" && faltante > 0) || isCreatingOrden}
              >
                {isCreatingOrden ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> PROCESANDO...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" /> CONFIRMAR Y CREAR ORDEN
                  </>
                )}
                {!isCreatingOrden && (
                  <kbd className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none rounded bg-white/20 px-2.5 py-1 text-[11px] font-black text-white shadow-sm border-none uppercase">
                    Espacio
                  </kbd>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stepper({ step, enableServicios, enablePrendas }: { step: number; enableServicios: boolean; enablePrendas: boolean }) {
  const stepsList = [
    { id: 1, label: "Cliente", icon: UserIcon },
    enableServicios && { id: 2, label: "Servicios", icon: LayoutGrid },
    enablePrendas && { id: 3, label: "Prendas", icon: Shirt },
    { id: 4, label: "Resumen", icon: Receipt },
    { id: 5, label: "Cobro", icon: CreditCard }
  ].filter(Boolean) as { id: number; label: string; icon: any }[];

  return (
    <div className="flex flex-wrap items-center justify-center gap-y-4 gap-x-2 md:gap-x-4 max-w-4xl mx-auto w-full py-4 px-2">
      {stepsList.map((stepItem, index) => {
        const done = step > stepItem.id;
        const cur = step === stepItem.id;
        const Icon = stepItem.icon;

        return (
          <div key={stepItem.label} className="flex items-center">
            {/* Step circle */}
            <div className="flex flex-col items-center text-center group">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 ${done
                  ? "bg-emerald-600 text-white shadow-md scale-105"
                  : cur
                    ? "bg-primary text-white shadow-glow ring-4 ring-primary/20 scale-110"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-250 dark:border-slate-700"
                  }`}
                title={stepItem.label}
              >
                {done ? (
                  <Check className="h-5 w-5 stroke-[2.5]" />
                ) : (
                  <Icon className="h-5 w-5 stroke-[1.8]" />
                )}
              </div>
              <div className={`mt-2 text-[10px] md:text-[11px] font-black uppercase tracking-wider ${cur ? "text-primary font-black animate-pulse" : done ? "text-emerald-700 font-bold" : "text-muted-foreground font-medium"
                }`}>
                {stepItem.label}
              </div>
            </div>

            {/* Connector Line */}
            {index < stepsList.length - 1 && (
              <div className="flex items-center justify-center px-1 md:px-3">
                <div className={`h-1 w-6 md:w-12 rounded-full transition-all duration-500 -mt-4 ${done ? "bg-emerald-600" : "bg-slate-200 dark:bg-slate-800"
                  }`} />
              </div>
            )}
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
  catalogo: CatalogoItem[];
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
      <DialogContent
        className="max-w-4xl p-0 overflow-hidden rounded-3xl"
        style={{ display: "flex", flexDirection: "column", height: "95vh", maxHeight: "90vh" }}
      >
        <DialogHeader className="p-6 pb-2 border-b border-border/50">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="text-2xl font-display font-bold">
              {isDesglose ? "Desglosar Ropa en Hamper" : "Seleccionar Prendas"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Selecciona las prendas que deseas agregar a la orden.
            </DialogDescription>
            <div className="relative flex-1 max-w-xs mr-10">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                className="pl-9 h-9 bg-accent/5 rounded-xl border-primary/10 shadow-sm text-sm"
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
                      {it.por_libra && (
                        <div className="mt-1.5 flex justify-center">
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                            <Scale className="h-3 w-3 text-amber-600" /> Cobro por libra
                          </span>
                        </div>
                      )}
                      <div className="mt-1 text-xs font-black text-primary">
                        {formatRD(it.precio)}{it.por_libra ? "/lb" : ""}
                      </div>
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
                  <PriceInput
                    value={cost}
                    onChange={setCost}
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
  open, onOpenChange, discount, setDiscount, empleado
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  discount: number; setDiscount: (d: number) => void;
  empleado?: Empleado;
}) {
  const [val, setVal] = useState(discount > 0 ? String(discount) : "");

  const maxLimit = empleado?.rol === "ADMIN" 
    ? 100 
    : (empleado?.max_descuento_porcentaje ?? 100);

  useEffect(() => {
    if (open) {
      setVal(discount > 0 ? String(discount) : "");
    }
  }, [open, discount]);

  function apply() {
    const num = parseFloat(val) || 0;
    if (num < 0 || num > 100) {
      toast.warning("El porcentaje de descuento debe estar entre 0% y 100%");
      return;
    }
    if (num > maxLimit) {
      toast.error(`Límite permitido: ${maxLimit}%`);
      return;
    }
    setDiscount(num);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-display font-bold flex items-center gap-2">
            <Percent className="h-6 w-6 text-amber-500" />
            Aplicar Descuento
          </DialogTitle>
          <DialogDescription className="sr-only">
            Ingresa el porcentaje del descuento que deseas aplicar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="relative h-24">
            <Input
              className="!h-full pr-16 pl-6 !text-5xl font-black font-display bg-accent/5 border-2 border-primary/20 focus-visible:ring-primary/30 rounded-3xl text-center"
              value={val}
              onChange={(e) => {
                const text = e.target.value.replace(/[^0-9.]/g, "");
                setVal(text);
              }}
              placeholder="0"
              autoFocus
              type="text"
              inputMode="decimal"
            />
            <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-2xl text-muted-foreground/30">%</span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            El descuento se aplicará al total de la orden.
            {maxLimit < 100 && (
              <span className="block mt-1.5 font-bold text-amber-600 dark:text-amber-400">
                Límite permitido: {maxLimit}%
              </span>
            )}
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { setDiscount(0); onOpenChange(false); }} className="flex-1 h-11 rounded-md border-rose-200 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold">
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
  useEffect(() => {
    const printerType = tenant.config?.impresora_tipo || "usb";
    if (printerType === "bluetooth" || printerType === "serial") {
      const runPhysicalPrint = async () => {
        try {
          const bytes = encodeEscPos(orden, tenant, cliente, empleado, serviciosList);
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
    } else {
      const timer = setTimeout(() => {
        window.print();
        onClose();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [onClose, orden, tenant, cliente, empleado, serviciosList]);

  return createPortal(
    <div className="fixed inset-0 bg-white z-[99999] overflow-y-auto pointer-events-auto atomic-print-target">
      <div className="max-w-md mx-auto p-8 print:p-0 print:max-w-none print:m-0">
        <div className="flex justify-between items-start border-b-2 border-primary/20 pb-4 mb-8 print:hidden relative z-[100000] hidden">
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

      <style dangerouslySetInnerHTML={{
        __html: `
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

function DeliveryDatePickerPOSDialog({
  open,
  onOpenChange,
  fechaEntrega,
  setFechaEntrega,
  esUrgente,
  setEsUrgente,
  cfg
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  fechaEntrega: Date | undefined;
  setFechaEntrega: (d: Date | undefined) => void;
  esUrgente: boolean;
  setEsUrgente: (u: boolean) => void;
  cfg: any;
}) {
  const [tempDate, setTempDate] = useState<Date | undefined>(fechaEntrega || new Date());
  const [tempIsUrgente, setTempIsUrgente] = useState(esUrgente);

  // Sync internal state when opened
  useEffect(() => {
    if (open) {
      setTempDate(fechaEntrega || new Date());
      setTempIsUrgente(esUrgente);
    }
  }, [open, fechaEntrega, esUrgente]);

  const aplicarAtajo = (horas: number, deUrgencia: boolean) => {
    const d = new Date();
    d.setHours(d.getHours() + horas);
    // Reiniciar horas para basarnos solo en fecha limpia
    d.setHours(12, 0, 0, 0);
    setTempDate(d);
    setTempIsUrgente(deUrgencia);
  };

  const handleSave = () => {
    if (tempDate) {
      // Forzar hora neutra (12:00 PM) para evitar desfases de zona horaria al basarse solo en fecha
      const cleanDate = new Date(tempDate);
      cleanDate.setHours(12, 0, 0, 0);
      setFechaEntrega(cleanDate);
    } else {
      setFechaEntrega(undefined);
    }
    setEsUrgente(tempIsUrgente);
    onOpenChange(false);
  };

  const tiempoEstandar = cfg.tiempo_entrega_estandar || 24;
  const tiempoUrgente = cfg.tiempo_entrega_urgente || 6;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-[530px] rounded-xl p-4.5 border-none bg-white dark:bg-slate-950 shadow-2xl">
        <DialogHeader className="pb-2.5 border-b border-border/40">
          <DialogTitle className="text-sm font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2 uppercase">
            <CalendarDays className="h-4 w-4 text-primary" />
            Programar Entrega
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-4 py-3">
          {/* Columna Izquierda: Atajos + Resumen */}
          <div className="flex-1 flex flex-col justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-2">
                Atajos Rápidos
              </span>
              
              <div className="grid grid-cols-2 gap-3">
                {/* COLUMNA URGENTE */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => aplicarAtajo(tiempoUrgente, true)}
                    className={`w-full py-1.5 px-2 rounded-lg border text-[11px] font-semibold tracking-tight transition-all text-center flex items-center justify-center gap-1 cursor-pointer h-9.5 ${
                      tempIsUrgente && tempDate && Math.abs(tempDate.getTime() - (new Date().getTime() + tiempoUrgente * 3600000)) < 60000
                        ? "bg-rose-500 border-rose-500 text-white shadow-xs"
                        : "bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100/70 hover:text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-400"
                    }`}
                  >
                    <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${tempIsUrgente && tempDate && Math.abs(tempDate.getTime() - (new Date().getTime() + tiempoUrgente * 3600000)) < 60000 ? "text-white" : "text-rose-500"}`} />
                    <span>Urgente ({tiempoUrgente}h)</span>
                  </button>

                  <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block mb-1">
                    Otros plazos urgentes:
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {[3, 6, 12].filter(h => h !== tiempoUrgente).map(h => {
                      const isAct = tempIsUrgente && tempDate && Math.abs(tempDate.getTime() - (new Date().getTime() + h * 3600000)) < 60000;
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => aplicarAtajo(h, true)}
                          className={`py-1 rounded-md border text-[10px] font-semibold transition-all text-center cursor-pointer h-7 ${
                            isAct
                              ? "bg-rose-500 border-rose-500 text-white shadow-xs"
                              : "border-rose-100 bg-rose-50/20 text-rose-600 hover:bg-rose-50 dark:border-rose-900/20 dark:bg-rose-950/10 dark:text-rose-400"
                          }`}
                        >
                          {h}h
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* COLUMNA ESTÁNDAR */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => aplicarAtajo(tiempoEstandar, false)}
                    className={`w-full py-1.5 px-2 rounded-lg border text-[11px] font-semibold tracking-tight transition-all text-center flex items-center justify-center gap-1 cursor-pointer h-9.5 ${
                      !tempIsUrgente && tempDate && Math.abs(tempDate.getTime() - (new Date().getTime() + tiempoEstandar * 3600000)) < 60000
                        ? "bg-primary border-primary text-white shadow-xs"
                        : "bg-primary/5 border-primary/10 text-primary hover:bg-primary/10 dark:bg-primary/20 dark:border-primary/40 dark:text-primary-foreground"
                    }`}
                  >
                    <span>Estándar ({tiempoEstandar >= 24 ? `${tiempoEstandar / 24}d` : `${tiempoEstandar}h`})</span>
                  </button>

                  <div className="text-[9px] font-bold text-slate-400 dark:text-slate-550 block mb-1">
                    Otros plazos estándar:
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {[24, 48, 72, 96].filter(h => h !== tiempoEstandar).map(h => {
                      const isAct = !tempIsUrgente && tempDate && Math.abs(tempDate.getTime() - (new Date().getTime() + h * 3600000)) < 60000;
                      const labelMap: Record<number, string> = {
                        24: "1d",
                        48: "2d",
                        72: "3d",
                        96: "4d"
                      };
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => aplicarAtajo(h, false)}
                          className={`py-1 rounded-md border text-[10px] font-semibold transition-all text-center cursor-pointer h-7 ${
                            isAct
                              ? "bg-primary border-primary text-white shadow-xs"
                              : "border-primary/10 bg-primary/5 text-primary hover:bg-primary/10 dark:border-primary/30 dark:bg-primary/10 dark:text-primary-foreground"
                          }`}
                        >
                          {labelMap[h]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Resumen */}
            <div className="p-3 rounded-xl border border-primary/10 bg-gradient-to-r from-primary/5 to-transparent relative overflow-hidden shadow-xs">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-primary" />
              <div className="pl-2">
                <div className="text-[9px] font-black uppercase tracking-widest text-primary/70 mb-1">
                  Fecha de entrega
                </div>
                <div className="text-[13px] font-black text-slate-800 dark:text-slate-100 capitalize">
                  {tempDate ? tempDate.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' }) : 'No definida'}
                </div>
                {tempIsUrgente && (
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-455 text-[8px] font-black uppercase tracking-wider">
                    Urgente (+{cfg.recargo_urgencia}%)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Columna Derecha: Calendario */}
          <div className="flex justify-center items-center border-t sm:border-t-0 sm:border-l border-border/40 pt-3 sm:pt-0 sm:pl-4">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1.5 self-start sm:ml-1">
                Selección de Fecha
              </span>
              <Calendar
                mode="single"
                selected={tempDate}
                onSelect={(d) => {
                  if (d) {
                    const newD = new Date(d);
                    newD.setHours(12, 0, 0, 0); // Limpio a mediodía neutro
                    setTempDate(newD);
                  }
                }}
                locale={es}
                className="rounded-xl border border-primary/20 shadow-lg shadow-primary/5 bg-white dark:bg-slate-900 p-2.5 scale-90 sm:scale-95 origin-center"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border/40 gap-1.5 flex-row justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border-border hover:bg-slate-100 dark:hover:bg-slate-900 text-xs font-bold cursor-pointer h-8 px-3"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-primary hover:bg-primary/95 text-white text-xs font-bold cursor-pointer h-8 px-3"
          >
            Aplicar Fecha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
