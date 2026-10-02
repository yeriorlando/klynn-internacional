import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowRight,
  MessageCircle,
  Flame,
  MapPin,
  Layers,
  Maximize2,
  Minimize2,
  Filter,
  Search,
  StickyNote,
  Receipt,
  User,
  Shield,
  Settings,
  Lock,
  Printer,
  Tag,
  Target,
  TrendingUp,
  X,
  Building2,
  Store,
  Star,
  ChevronDown,
  Check,
} from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
import {
  getOrdenes,
  getClientes,
  getEmpleados,
  updateOrdenEstado,
  saveTenant,
  isModuleEnabled,
  can,
  type Orden,
  type Cliente,
  type Empleado,
  type EstadoOrden,
} from "@/lib/storage";
import { TicketPrintPortal } from "@/components/klynn/OrdenesPage";
import { usePlans, useOrdenes, useClientes, useEmpleados, useServicios, useMetasServicios } from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";
import { notificarWhatsApp, calcularDiasEnAlmacen, construirMensajeWhatsAppPredeterminado, toastWhatsAppSuccess, toastWhatsAppLoading } from "@/lib/whatsapp";
import { WhatsAppOfficialIcon, showWhatsAppManualToast } from "@/components/klynn/WhatsAppManualToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { LotesServicioModal } from "@/components/klynn/procesos/LotesServicioModal";

// Definición de Fases Operativas del Kanban (3 COLUMNAS: RECIBIDO, EN PROCESO, TERMINADO)
export interface FaseOperativa {
  id: string;
  titulo: string;
  subtitulo: string;
  icon: React.ElementType;
  colorHeader: string;
  colorBorder: string;
  badgeBg: string;
  badgeText: string;
  estadoOrden: EstadoOrden;
  etiquetaUbicacion?: string;
}

const FASES_OPERATIVAS: FaseOperativa[] = [
  {
    id: "recibida",
    titulo: "RECIBIDAS",
    subtitulo: "Órdenes ingresadas en recepción",
    icon: Layers,
    colorHeader: "bg-blue-600/85 text-white border-blue-700/70",
    colorBorder: "border-blue-200 dark:border-blue-900/40",
    badgeBg: "bg-blue-800/80 text-white",
    badgeText: "Recibidas",
    estadoOrden: "RECIBIDA",
    etiquetaUbicacion: "Recepción",
  },
  {
    id: "proceso",
    titulo: "EN PROCESO",
    subtitulo: "Órdenes actualmente en producción",
    icon: RefreshCw,
    colorHeader: "bg-amber-500/85 text-white border-amber-600/70",
    colorBorder: "border-amber-200 dark:border-amber-900/40",
    badgeBg: "bg-amber-700/80 text-white",
    badgeText: "En Proceso",
    estadoOrden: "EN_PROCESO",
    etiquetaUbicacion: "Área de Trabajo",
  },
  {
    id: "lista",
    titulo: "TERMINADO",
    subtitulo: "Listas para entrega al cliente",
    icon: CheckCircle2,
    colorHeader: "bg-emerald-600/85 text-white border-emerald-700/70",
    colorBorder: "border-emerald-200 dark:border-emerald-900/40",
    badgeBg: "bg-emerald-800/80 text-white",
    badgeText: "Terminado",
    estadoOrden: "LISTA",
    etiquetaUbicacion: "Mostrador",
  },
];

export function ProcesosPage() {
  const user = useRequireAuth();
  const tenantId = user?.tenant?.id || "";
  const queryClient = useQueryClient();

  const { data: plans = [] } = usePlans();
  const activePlan = plans.find((p) => p.id === user?.tenant?.plan_id);
  const hasProcesosModule = isModuleEnabled(user?.tenant || null, "procesos", activePlan);

  const { data: rawOrdenes = [], isLoading: loadingOrdenes } = useOrdenes(tenantId);
  const { data: clientes = [] } = useClientes(tenantId);
  const { data: empleados = [] } = useEmpleados(tenantId);
  const { data: servicios = [] } = useServicios(tenantId);
  const { data: metasConfig = {} } = useMetasServicios(tenantId);

  const [showLotesModal, setShowLotesModal] = useState(false);
  const [loteLimiteCantidad, setLoteLimiteCantidad] = useState<number | null>(null);
  const [loteServicioActivo, setLoteServicioActivo] = useState<string | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [printProduccionOrden, setPrintProduccionOrden] = useState<Orden | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [servicioFilter, setServicioFilter] = useState<string>("todos");
  const [sucursalFilter, setSucursalFilter] = useState<string>("todas");
  const [soloUrgentes, setSoloUrgentes] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Estados y referencias para los menús desplegables estilo Red de Sucursales
  const servicioDropdownRef = useRef<HTMLDivElement>(null);
  const sucursalDropdownRef = useRef<HTMLDivElement>(null);
  const [openServicioDropdown, setOpenServicioDropdown] = useState(false);
  const [searchServicioText, setSearchServicioText] = useState("");
  const [openSucursalDropdown, setOpenSucursalDropdown] = useState(false);
  const [searchSucursalText, setSearchSucursalText] = useState("");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        servicioDropdownRef.current &&
        !servicioDropdownRef.current.contains(event.target as Node)
      ) {
        setOpenServicioDropdown(false);
      }
      if (
        sucursalDropdownRef.current &&
        !sucursalDropdownRef.current.contains(event.target as Node)
      ) {
        setOpenSucursalDropdown(false);
      }
    }
    if (openServicioDropdown || openSucursalDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openServicioDropdown, openSucursalDropdown]);
  const [notaModalOrden, setNotaModalOrden] = useState<Orden | null>(null);
  const [diasAlmacen, setDiasAlmacen] = useState<number>(
    user?.tenant?.config?.dias_almacenamiento_sin_retirar || user?.tenant?.config?.whatsapp?.dias_recordatorio_sin_retirar || 5
  );
  const [limiteVisiblePorFase, setLimiteVisiblePorFase] = useState<Record<string, number>>({
    recibida: 50,
    proceso: 50,
    lista: 50,
  });

  const getServiciosDeOrden = (o: Orden): string[] => {
    const srvSet = new Set<string>();
    if (Array.isArray(o.servicios)) {
      o.servicios.forEach((s) => {
        const name = typeof s === "string" ? s.trim() : (s as any)?.nombre?.trim();
        if (name) srvSet.add(name);
      });
    }
    if (Array.isArray(o.items)) {
      o.items.forEach((it) => {
        if (it.servicio_origen && it.servicio_origen.trim()) {
          srvSet.add(it.servicio_origen.trim());
        }
      });
    }
    return Array.from(srvSet);
  };

  const handleFiltrarLote = (servicioNombre: string, limite?: number) => {
    setServicioFilter(servicioNombre);
    setLoteServicioActivo(servicioNombre);
    setLoteLimiteCantidad(limite || null);
    toast.success(`Filtro aplicado: Lote de "${servicioNombre}" (${limite || "todas"} órdenes máx) 🎯`);
  };

  const handleLimpiarLote = () => {
    setServicioFilter("todos");
    setLoteServicioActivo(null);
    setLoteLimiteCantidad(null);
  };

  useEffect(() => {
    if (user?.tenant?.config) {
      const cfgVal = user.tenant.config.dias_almacenamiento_sin_retirar || user.tenant.config.whatsapp?.dias_recordatorio_sin_retirar || 5;
      setDiasAlmacen(cfgVal);
    }
  }, [user?.tenant?.config]);

  const ordenes = useMemo(() => {
    return (rawOrdenes || []).filter((o) => {
      if (o.estado === "ENTREGADA" || o.estado === "ANULADA" || o.estado === "PAGADA") {
        return false;
      }
      return true;
    });
  }, [rawOrdenes]);

  // Sucursales de origen presentes en las órdenes para filtrado en Taller / Red
  const sucursalesOrigenPresentes = useMemo(() => {
    const map = new Map<string, string>();
    (ordenes || []).forEach((o) => {
      if (o.sucursal_origen_id && o.sucursal_origen_nombre && o.sucursal_origen_id !== tenantId) {
        map.set(o.sucursal_origen_id, o.sucursal_origen_nombre);
      }
    });
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [ordenes, tenantId]);

  const hasTrasladosRed = isModuleEnabled(user?.tenant || null, "traslados_red", activePlan);
  const mostrarFiltroSucursal = hasTrasladosRed || sucursalesOrigenPresentes.length > 0;

  // Estadísticas del lote activo en tiempo real
  const loteActivoStats = useMemo(() => {
    if (!loteServicioActivo) return null;
    const target = loteServicioActivo.toLowerCase();

    const ordenesSrv = (ordenes || []).filter((o) => {
      if (o.estado === "ANULADA") return false;
      const tieneSrv = Array.isArray(o.servicios) && o.servicios.some((s) => (typeof s === "string" ? s : (s as any)?.nombre || "").toLowerCase().includes(target));
      const tieneItem = Array.isArray(o.items) && o.items.some((it) => (it.servicio_origen || "").toLowerCase().includes(target) || (it.nombre || "").toLowerCase().includes(target));
      return tieneSrv || tieneItem;
    });

    const total = ordenesSrv.length;
    const listas = ordenesSrv.filter((o) => o.estado === "LISTA" || o.estado === "ENTREGADA").length;
    const enCola = ordenesSrv.filter((o) => o.estado === "RECIBIDA" || o.estado === "EN_PROCESO").length;
    const meta = loteLimiteCantidad || 25;
    const porcentaje = meta > 0 ? Math.min(100, Math.round((listas / meta) * 100)) : 0;
    const isCumplida = listas >= meta && meta > 0;

    return { total, listas, enCola, meta, porcentaje, isCumplida };
  }, [ordenes, loteServicioActivo, loteLimiteCantidad]);

  const loadData = () => {
    queryClient.invalidateQueries({ queryKey: ["ordenes", tenantId] });
    queryClient.invalidateQueries({ queryKey: ["clientes", tenantId] });
    queryClient.invalidateQueries({ queryKey: ["empleados", tenantId] });
  };

  const updateDiasAlmacen = async (val: number) => {
    const nuevoVal = Math.max(1, val);
    setDiasAlmacen(nuevoVal);
    if (!user?.tenant) return;
    try {
      const updatedTenant = {
        ...user.tenant,
        config: {
          ...(user.tenant.config || {}),
          dias_almacenamiento_sin_retirar: nuevoVal,
        },
      };
      await saveTenant(updatedTenant);
      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
      toast.success(`Días de almacenamiento actualizados a ${nuevoVal} días${isOffline ? " (guardado en local)" : ""}`);
    } catch (err) {
      console.error("Error guardando días de almacenamiento:", err);
      toast.error("No se pudo guardar la configuración");
    }
  };

  const ordenesAlmacenadasCount = useMemo(() => {
    return ordenes.filter((o) => o.estado === "LISTA" && calcularDiasEnAlmacen(o.creado_en) >= diasAlmacen).length;
  }, [ordenes, diasAlmacen]);

  // Manejo de Pantalla Completa
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => document.removeEventListener("fullscreenchange", handleFSChange);
  }, []);

  const clienteMap = useMemo(() => {
    return new Map(clientes.map((c) => [c.id, c]));
  }, [clientes]);

  // Extraer la lista DINÁMICA exclusivamente de SERVICIOS reales
  const serviciosPresentes = useMemo(() => {
    const setServicios = new Set<string>();
    ordenes.forEach((o) => {
      if (Array.isArray(o.servicios)) {
        o.servicios.forEach((s) => {
          if (s && s.trim()) setServicios.add(s.trim());
        });
      }
      if (Array.isArray(o.items)) {
        o.items.forEach((it) => {
          if (it.servicio_origen && it.servicio_origen.trim()) {
            setServicios.add(it.servicio_origen.trim());
          }
        });
      }
    });
    return Array.from(setServicios);
  }, [ordenes]);

  const filteredServiciosList = useMemo(() => {
    if (!searchServicioText.trim()) return serviciosPresentes;
    const q = searchServicioText.toLowerCase().trim();
    return serviciosPresentes.filter((s) => s.toLowerCase().includes(q));
  }, [serviciosPresentes, searchServicioText]);

  const filteredSucursalesList = useMemo(() => {
    if (!searchSucursalText.trim()) return sucursalesOrigenPresentes;
    const q = searchSucursalText.toLowerCase().trim();
    return sucursalesOrigenPresentes.filter((s) => s.nombre.toLowerCase().includes(q));
  }, [sucursalesOrigenPresentes, searchSucursalText]);

  const labelSucursalSeleccionada = useMemo(() => {
    if (sucursalFilter === "todas") return "Todas las sucursales";
    if (sucursalFilter === "local") return "Solo creadas aquí";
    if (sucursalFilter === "transferidas") return "De la red";
    const found = sucursalesOrigenPresentes.find((s) => s.id === sucursalFilter);
    return found ? found.nombre : "Sucursal";
  }, [sucursalFilter, sucursalesOrigenPresentes]);

  const countSucursalSeleccionada = useMemo(() => {
    if (sucursalFilter === "todas") return ordenes.length;
    if (sucursalFilter === "local") return ordenes.filter((o) => !o.sucursal_origen_id || o.sucursal_origen_id === tenantId).length;
    if (sucursalFilter === "transferidas") return ordenes.filter((o) => o.sucursal_origen_id && o.sucursal_origen_id !== tenantId).length;
    return ordenes.filter((o) => o.sucursal_origen_id === sucursalFilter).length;
  }, [sucursalFilter, ordenes, tenantId]);

  const countServicioSeleccionado = useMemo(() => {
    if (servicioFilter === "todos") return ordenes.length;
    const target = servicioFilter.toLowerCase();
    return ordenes.filter(
      (o) =>
        o.servicios?.some((s) => (typeof s === "string" ? s : (s as any)?.nombre || "").toLowerCase() === target) ||
        o.items?.some((it) => (it.servicio_origen || "").toLowerCase() === target),
    ).length;
  }, [servicioFilter, ordenes]);

  // Determinar en qué columna cae la orden (3 COLUMNAS DIRECTAS)
  const getFaseOrden = (orden: Orden): string => {
    if (orden.estado === "RECIBIDA") return "recibida";
    if (orden.estado === "LISTA") return "lista";
    if (orden.estado === "EN_PROCESO") return "proceso";
    return "recibida";
  };

  // Filtrado de órdenes por búsqueda, servicio real y urgencia
  const ordenesFiltradas = useMemo(() => {
    const matched = ordenes.filter((o) => {
      if (soloUrgentes && !o.es_urgente) return false;

      // La búsqueda por texto filtra ÚNICAMENTE las órdenes en la columna RECIBIDO
      if (searchQuery.trim() && getFaseOrden(o) === "recibida") {
        const q = searchQuery.toLowerCase().trim();
        const cli = clienteMap.get(o.cliente_id);
        const matchNum = o.numero.toLowerCase().includes(q);
        const nomCompleto = cli
          ? [cli.nombre, cli.apellido]
              .filter((x) => x && x !== "null")
              .join(" ")
              .toLowerCase()
          : "consumidor final";
        const matchCliente = nomCompleto.includes(q) || (cli?.telefono && cli.telefono.includes(q));
        const matchNotas = o.notas?.toLowerCase().includes(q);
        if (!matchNum && !matchCliente && !matchNotas) return false;
      }

      if (servicioFilter !== "todos") {
        const target = servicioFilter.toLowerCase();
        const matchServArray = o.servicios?.some((s) => (typeof s === "string" ? s : (s as any)?.nombre || "").toLowerCase().includes(target));
        const matchItemServ = o.items?.some(
          (it) => (it.servicio_origen || "").toLowerCase().includes(target) || (it.nombre || "").toLowerCase().includes(target),
        );
        if (!matchServArray && !matchItemServ) return false;
      }

      if (sucursalFilter === "local") {
        if (o.sucursal_origen_id && o.sucursal_origen_id !== tenantId) return false;
      } else if (sucursalFilter === "transferidas") {
        if (!o.sucursal_origen_id || o.sucursal_origen_id === tenantId) return false;
      } else if (sucursalFilter !== "todas") {
        if (o.sucursal_origen_id !== sucursalFilter) return false;
      }

      return true;
    });

    if (loteLimiteCantidad && loteLimiteCantidad > 0) {
      // Separar las órdenes pendientes (RECIBIDA / EN_PROCESO) y limitar su cantidad a la meta diaria
      const pendientes = matched.filter((o) => o.estado === "RECIBIDA" || o.estado === "EN_PROCESO");
      const terminadas = matched.filter((o) => o.estado === "LISTA");
      
      const lotePendientes = pendientes.slice(0, loteLimiteCantidad);
      return [...lotePendientes, ...terminadas];
    }

    return matched;
  }, [ordenes, searchQuery, servicioFilter, sucursalFilter, soloUrgentes, clienteMap, loteLimiteCantidad, tenantId]);

  const [localAutoSend, setLocalAutoSend] = useState<boolean | null>(null);

  const autoSendWhatsApp =
    localAutoSend !== null ? localAutoSend : (user?.tenant?.config?.whatsapp_auto_procesos ?? true);

  const toggleAutoSendWhatsApp = async () => {
    if (!user?.tenant) return;
    const newValue = !autoSendWhatsApp;
    setLocalAutoSend(newValue);
    try {
      const updatedTenant = {
        ...user.tenant,
        config: {
          ...(user.tenant.config || {}),
          whatsapp_auto_procesos: newValue,
        },
      };
      await saveTenant(updatedTenant);
      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
      const offlineSuffix = isOffline ? " (guardado en local)" : "";
      toast.success(
        newValue
          ? `Envío automático por WhatsApp ACTIVADO${offlineSuffix}`
          : `Envío automático por WhatsApp DESACTIVADO${offlineSuffix}`,
      );
    } catch (err) {
      console.error("Error al guardar preferencia de WhatsApp:", err);
      if (typeof navigator !== "undefined" && navigator.onLine) {
        setLocalAutoSend(!newValue);
        toast.error("No se pudo guardar la preferencia");
      }
    }
  };

  const showManualWhatsAppToast = async (cli: Cliente, numLimpio: string, ordenObj?: Orden) => {
    let msg = `Hola ${cli.nombre} 👋, tu orden ${numLimpio} en ${user?.tenant?.nombre || "la lavandería"} ya está LISTA para retirar. ¡Te esperamos!`;
    if (user?.tenant && ordenObj) {
      try {
        msg = await construirMensajeWhatsAppPredeterminado(user.tenant, cli, ordenObj, "lista");
      } catch (e) {
        console.error("Error al construir plantilla whatsapp:", e);
      }
    }
    const clienteNombre = [cli.nombre, cli.apellido].filter((x) => x && x !== "null").join(" ") || cli.nombre || "Consumidor Final";
    showWhatsAppManualToast({
      title: "¡Orden lista!",
      actionText: "Notificar a",
      clienteNombre,
      telefono: cli.telefono,
      mensaje: msg,
    });
  };

  // Avanzar una orden a la siguiente fase operativa en 3 columnas
  const handleAvanzarFase = async (orden: Orden, faseActualId: string) => {
    let siguienteFaseId = "recibida";
    let nuevoEstado: EstadoOrden = "EN_PROCESO";
    let etiquetaUbicacion = orden.ubicacion_ropa || "";

    if (faseActualId === "recibida") {
      siguienteFaseId = "proceso";
      nuevoEstado = "EN_PROCESO";
      etiquetaUbicacion = "Área de Trabajo";
    } else if (faseActualId === "proceso") {
      siguienteFaseId = "lista";
      nuevoEstado = "LISTA";
      etiquetaUbicacion = "Mostrador";
    }

    const nomFase =
      FASES_OPERATIVAS.find((f) => f.id === siguienteFaseId)?.titulo || siguienteFaseId;
    const numLimpio = orden.numero.replace(/^#/, "");
    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

    const ordenActualizada: Orden = {
      ...orden,
      estado: nuevoEstado,
      ubicacion_ropa: etiquetaUbicacion,
    };

    // 1. ACTUALIZACIÓN INSTANTÁNEA OPTIMISTA (0 ms de espera en pantalla)
    queryClient.setQueryData<Orden[]>(["ordenes", tenantId], (old) => {
      if (!old) return [ordenActualizada];
      return old.map((item) => (item.id === orden.id ? ordenActualizada : item));
    });
    queryClient.setQueriesData({ queryKey: ["ordenes"] }, (old: Orden[] | undefined) => {
      if (!old) return old;
      return old.map((item) => (item.id === orden.id ? ordenActualizada : item));
    });

    toast.success(`Orden ${numLimpio} movida a "${nomFase}"${isOffline ? " (guardada en local)" : ""}`);

    setProcessingId(orden.id);
    try {
      await updateOrdenEstado(orden.id, nuevoEstado, etiquetaUbicacion);

      if (nuevoEstado === "LISTA") {
        const cli = clienteMap.get(orden.cliente_id);
        const isConsumidorFinal = !cli || 
          (cli.nombre === "Consumidor" && cli.apellido === "Final") ||
          (cli.id && cli.id.includes("f000"));
        const rawPhone = (cli?.telefono || "").replace(/---/g, "").trim().replace(/\D/g, "");
        const hasClientPhone = rawPhone.length >= 10;

        if (!isConsumidorFinal && hasClientPhone && cli) {
          if (isOffline) {
            toast.info(`Orden ${numLimpio} lista (guardada en local). Notificación de WhatsApp pendiente.`);
          } else if (autoSendWhatsApp && user?.tenant) {
            toastWhatsAppLoading("Enviando WhatsApp a " + cli.nombre + "...", { id: `wa-${orden.id}` });
            const res = await notificarWhatsApp(user.tenant, cli, ordenActualizada, "lista");
            toast.dismiss(`wa-${orden.id}`);

            if (res.ok) {
              toastWhatsAppSuccess(`Notificación enviada a ${cli.nombre}`,  {
                description: `Orden ${numLimpio} notificada con éxito.`,
                duration: 4000,
              });
            } else {
              toast.error(`WhatsApp no enviado: ${res.reason || "Error de API"}`, {
                description: "Puedes enviarlo manualmente a continuación.",
              });
              showManualWhatsAppToast(cli, numLimpio, ordenActualizada);
            }
          } else {
            showManualWhatsAppToast(cli, numLimpio, ordenActualizada);
          }
        }
      }
    } catch (err) {
      console.error("Error al mover fase:", err);
      // Revertir optimismo en caso de error
      queryClient.setQueryData<Orden[]>(["ordenes", tenantId], (old) => {
        if (!old) return [orden];
        return old.map((item) => (item.id === orden.id ? orden : item));
      });
      queryClient.setQueriesData({ queryKey: ["ordenes"] }, (old: Orden[] | undefined) => {
        if (!old) return old;
        return old.map((item) => (item.id === orden.id ? orden : item));
      });
      toast.error("No se pudo actualizar el estado de la orden");
    } finally {
      setProcessingId(null);
    }
  };

  // Calcular métricas superiores
  const stats = useMemo(() => {
    const total = ordenes.length;
    const urgentes = ordenes.filter((o) => o.es_urgente).length;
    const enProceso = ordenes.filter((o) => o.estado === "EN_PROCESO").length;
    const listas = ordenes.filter((o) => o.estado === "LISTA").length;
    return { total, urgentes, enProceso, listas };
  }, [ordenes]);

  if (loadingOrdenes && rawOrdenes.length === 0 && (typeof navigator === "undefined" || navigator.onLine)) {
    return <GlobalPageLoader text="Cargando operaciones..." />;
  }

  if (!loadingOrdenes && user?.empleado && !can(user.empleado, "procesos")) {
    return (
      <div className="p-12 text-center">
        <Shield className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="font-display text-2xl font-bold">Acceso restringido</h3>
        <p className="text-sm text-muted-foreground">
          No tienes permisos para ver el tablero de Operaciones.
        </p>
      </div>
    );
  }

  if (!loadingOrdenes && !hasProcesosModule) {
    return (
      <div className="min-h-[70vh] bg-slate-50/50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
            <Lock className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-display">
              Tablero de Procesos
            </h2>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              El módulo de <strong>Control de Producción por Etapas</strong> no está incluido en tu plan actual. Actualiza tu suscripción para desbloquear esta funcionalidad.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/t/$slug/configuracion"
              search={{ tab: "plan" }}
              params={{ slug: user?.tenant?.slug || "" }}
            >
              <Button className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-extrabold text-sm shadow-md transition-all active:scale-95 cursor-pointer">
                Ver planes y actualizar
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-[99999] bg-slate-50 dark:bg-slate-950 p-4 md:p-6 overflow-y-auto w-screen h-screen flex flex-col space-y-4"
          : "min-h-screen bg-slate-50/60 dark:bg-slate-950 pt-2 px-4 md:px-6 pb-6 space-y-4"
      }
    >
      {/* TÍTULO CENTRADO Y LIMPIO */}
      <div className="flex flex-col items-center justify-center text-center space-y-3 border-b border-slate-200/80 dark:border-slate-800 pb-4 shrink-0">
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2 justify-center">
            <h1 className="font-display text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Tablero de Operaciones
            </h1>
            {isFullscreen && (
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                Pantalla Completa
              </Badge>
            )}
          </div>
          <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400">
            Control de producción por etapas
          </p>
        </div>

        {/* METRICAS DEBAJO DEL TÍTULO CENTRADAS */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
          <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <Layers className="h-4 w-4 text-slate-500" />
            <div className="text-left">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                En Planta
              </div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                {stats.total}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-2xl border border-blue-200 bg-blue-50/60 px-4 py-2 shadow-2xs dark:border-blue-900/50 dark:bg-blue-950/30">
            <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <div className="text-left">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                En Proceso
              </div>
              <div className="text-sm font-extrabold text-blue-900 dark:text-blue-200">
                {stats.enProceso}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSoloUrgentes((prev) => !prev)}
            title={soloUrgentes ? "Filtrando por urgentes (clic para ver todas)" : "Clic para filtrar solo órdenes urgentes"}
            className={`flex items-center gap-2.5 rounded-2xl px-4 py-2 shadow-2xs transition-all cursor-pointer text-left active:scale-95 ${
              soloUrgentes
                ? "bg-rose-500 text-white border border-rose-600 ring-2 ring-rose-400/40 shadow-sm"
                : "border border-rose-200 bg-rose-50/60 hover:bg-rose-100/70 dark:border-rose-900/50 dark:bg-rose-950/30 dark:hover:bg-rose-950/50"
            }`}
          >
            <Flame className={`h-4 w-4 shrink-0 ${soloUrgentes ? "text-white animate-bounce" : "text-rose-600 dark:text-rose-400 animate-pulse"}`} />
            <div className="text-left">
              <div className={`text-[10px] font-bold uppercase tracking-wider ${soloUrgentes ? "text-rose-100" : "text-rose-600 dark:text-rose-400"}`}>
                Urgentes {soloUrgentes && "✓"}
              </div>
              <div className={`text-sm font-extrabold ${soloUrgentes ? "text-white" : "text-rose-900 dark:text-rose-200"}`}>
                {stats.urgentes}
              </div>
            </div>
          </button>

          {/* PILL / CARD DE AJUSTE RÁPIDO DE PRENDAS SIN RETIRAR */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-2 shadow-2xs dark:border-amber-900/50 dark:bg-amber-950/30 hover:bg-amber-100/60 dark:hover:bg-amber-950/50 transition-all cursor-pointer text-left shrink-0 active:scale-95"
                title="Ajustar días de almacenamiento para prendas sin retirar"
              >
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <div className="text-left">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    Sin Retirar
                    <Settings className="h-2.5 w-2.5 opacity-70" />
                  </div>
                  <div className="text-xs font-extrabold text-amber-900 dark:text-amber-200">
                    Más de {diasAlmacen} días
                  </div>
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 rounded-2xl shadow-xl border border-amber-500/25 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <Clock className="h-4 w-4 text-amber-500" />
                <span>Prendas sin retirar</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Define el tiempo límite en días (estado LISTA) para considerar órdenes almacenadas sin retirar.
              </p>
              <div className="flex items-center gap-1.5 bg-amber-50/60 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-500/20">
                {[3, 5, 7, 14].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => updateDiasAlmacen(d)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      diasAlmacen === d
                        ? "bg-amber-500 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800"
                    }`}
                  >
                    {d}d
                  </button>
                ))}
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                  <Input
                    className="h-6 w-10 text-xs font-black text-center p-0 border-0 bg-transparent focus-visible:ring-0"
                    type="number"
                    min={1}
                    max={90}
                    value={diasAlmacen}
                    onChange={(e) => updateDiasAlmacen(Number(e.target.value))}
                  />
                  <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase">días</span>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* BOTÓN LOTES POR SERVICIO CON DISPARADOR INSTANTÁNEO */}
          <LotesServicioModal
            tenantId={tenantId}
            servicios={servicios}
            ordenes={ordenes}
            metasConfig={metasConfig}
            onFiltrarLote={handleFiltrarLote}
          />

          <Button
            variant="outline"
            onClick={loadData}
            className="rounded-xl h-10 w-10 p-0 border border-border/80 bg-surface shadow-xs hover:bg-muted/60 text-foreground flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all"
            title="Refrescar datos"
          >
            <RefreshCw className={`h-4 w-4 text-primary ${loadingOrdenes ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* BARRA DE FILTROS CENTRADA: BUSCADOR, DESPLEGABLE DE SERVICIOS, URGENTES & TOGGLE WHATSAPP */}
      <div className="flex flex-wrap md:flex-nowrap items-center justify-center gap-2.5 bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs shrink-0 max-w-6xl mx-auto w-full">
        {/* BUSCADOR SIMPLE DE ÓRDENES */}
        <div
          className={`relative flex-1 min-w-[200px] shrink-0 transition-all ${
            isFullscreen ? "max-w-md xl:max-w-xl" : "max-w-[280px] lg:max-w-xs"
          }`}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 shrink-0" />
          <Input
            type="text"
            placeholder="Buscar en Recibido (#orden o cliente)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-7 h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 text-xs font-medium focus:bg-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* FILTRO DESPLEGABLE DE SERVICIOS (ESTILO RED DE SUCURSALES) */}
        <div className="relative shrink-0" ref={servicioDropdownRef}>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> <span className="hidden lg:inline">Servicio:</span>
            </span>

            <button
              type="button"
              onClick={() => {
                setOpenServicioDropdown((prev) => !prev);
                setOpenSucursalDropdown(false);
              }}
              className="group flex items-center justify-between gap-2 border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950 px-3 h-10 rounded-xl shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer min-w-[160px] max-w-[220px] focus:outline-none focus:ring-2 focus:ring-primary/20 text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Tag className="h-3 w-3" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                    {servicioFilter === "todos" ? "Todos los Servicios" : servicioFilter}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-1">
                <span className="inline-flex items-center rounded-full bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-700 dark:text-slate-300">
                  {countServicioSeleccionado}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                    openServicioDropdown ? "rotate-180 text-primary" : "group-hover:text-slate-600"
                  }`}
                />
              </div>
            </button>
          </div>

          <AnimatePresence>
            {openServicioDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 4, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="absolute left-0 sm:right-0 sm:left-auto z-50 mt-1 max-h-84 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-black/5 min-w-[260px] w-full sm:w-[290px]"
              >
                {/* Buscador interno */}
                <div className="sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-2 backdrop-blur-sm">
                  <div className="relative flex items-center">
                    <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={searchServicioText}
                      onChange={(e) => setSearchServicioText(e.target.value)}
                      placeholder="Buscar servicio..."
                      className="h-8.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 pl-8 pr-3 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:border-primary focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Opciones */}
                <div className="max-h-68 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                  {/* Opción Todos los Servicios */}
                  <button
                    type="button"
                    onClick={() => {
                      setServicioFilter("todos");
                      setOpenServicioDropdown(false);
                      setSearchServicioText("");
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer ${
                      servicioFilter === "todos"
                        ? "bg-primary/10 text-primary font-bold ring-1 ring-primary/20"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-7 w-7 rounded-full bg-primary text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Tag className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold truncate">Todos los Servicios</span>
                        <span className="text-[10px] text-muted-foreground truncate">
                          Total órdenes ({ordenes.length})
                        </span>
                      </div>
                    </div>
                    {servicioFilter === "todos" && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>

                  {filteredServiciosList.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      No se encontraron servicios para "{searchServicioText}"
                    </div>
                  ) : (
                    filteredServiciosList.map((srv) => {
                      const isSelected = servicioFilter === srv;
                      const target = srv.toLowerCase();
                      const count = ordenes.filter(
                        (o) =>
                          o.servicios?.some((s) => (typeof s === "string" ? s : (s as any)?.nombre || "").toLowerCase() === target) ||
                          o.items?.some((it) => (it.servicio_origen || "").toLowerCase() === target),
                      ).length;

                      return (
                        <button
                          key={srv}
                          type="button"
                          onClick={() => {
                            setServicioFilter(srv);
                            setOpenServicioDropdown(false);
                            setSearchServicioText("");
                          }}
                          className={`flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer ${
                            isSelected
                              ? "bg-primary/10 text-primary font-bold ring-1 ring-primary/20"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs">
                              <Tag className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold truncate">{srv}</span>
                              <span className="text-[10px] text-muted-foreground truncate">
                                {count} {count === 1 ? "orden" : "órdenes"} en proceso
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

        {/* FILTRO DESPLEGABLE DE SUCURSAL (ESTILO RED DE SUCURSALES) */}
        {mostrarFiltroSucursal && (
          <div className="relative shrink-0" ref={sucursalDropdownRef}>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Store className="h-3.5 w-3.5" /> <span className="hidden xl:inline">Sucursal:</span>
              </span>

              <button
                type="button"
                onClick={() => {
                  setOpenSucursalDropdown((prev) => !prev);
                  setOpenServicioDropdown(false);
                }}
                className="group flex items-center justify-between gap-2 border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950 px-3 h-10 rounded-xl shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer min-w-[160px] max-w-[230px] focus:outline-none focus:ring-2 focus:ring-primary/20 text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-6 w-6 rounded-lg bg-emerald-600/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <Store className="h-3 w-3" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                      {labelSucursalSeleccionada}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-1">
                  <span className="inline-flex items-center rounded-full bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-700 dark:text-slate-300">
                    {countSucursalSeleccionada}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                      openSucursalDropdown ? "rotate-180 text-primary" : "group-hover:text-slate-600"
                    }`}
                  />
                </div>
              </button>
            </div>

            <AnimatePresence>
              {openSucursalDropdown && (
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
                        type="text"
                        value={searchSucursalText}
                        onChange={(e) => setSearchSucursalText(e.target.value)}
                        placeholder="Buscar sucursal o sede..."
                        className="h-8.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 pl-8 pr-3 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  {/* Opciones */}
                  <div className="max-h-68 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                    {/* Opción Todas las sucursales */}
                    <button
                      type="button"
                      onClick={() => {
                        setSucursalFilter("todas");
                        setOpenSucursalDropdown(false);
                        setSearchSucursalText("");
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer ${
                        sucursalFilter === "todas"
                          ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800 font-bold"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <Layers className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold truncate">Todas las sucursales</span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            Red completa ({ordenes.length} órdenes)
                          </span>
                        </div>
                      </div>
                      {sucursalFilter === "todas" && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                    </button>

                    {/* Opción Solo creadas aquí (Locales) */}
                    <button
                      type="button"
                      onClick={() => {
                        setSucursalFilter("local");
                        setOpenSucursalDropdown(false);
                        setSearchSucursalText("");
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer ${
                        sucursalFilter === "local"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800 font-bold"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <Store className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold truncate">Solo creadas aquí (Locales)</span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            Órdenes originadas en esta sucursal ({ordenes.filter((o) => !o.sucursal_origen_id || o.sucursal_origen_id === tenantId).length})
                          </span>
                        </div>
                      </div>
                      {sucursalFilter === "local" && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
                    </button>

                    {/* Opción De la red (Transferidas en general) si hay más de 1 sucursal */}
                    {sucursalesOrigenPresentes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSucursalFilter("transferidas");
                          setOpenSucursalDropdown(false);
                          setSearchSucursalText("");
                        }}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer ${
                          sucursalFilter === "transferidas"
                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800 font-bold"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-7 w-7 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <Building2 className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold truncate">De la red (Transferidas)</span>
                            <span className="text-[10px] text-muted-foreground truncate">
                              Todas las órdenes recibidas de otras sedes ({ordenes.filter((o) => o.sucursal_origen_id && o.sucursal_origen_id !== tenantId).length})
                            </span>
                          </div>
                        </div>
                        {sucursalFilter === "transferidas" && <Check className="h-4 w-4 text-amber-600 shrink-0" />}
                      </button>
                    )}

                    {/* Lista de sucursales específicas */}
                    {filteredSucursalesList.length === 0 && searchSucursalText.trim() ? (
                      <div className="p-3 text-center text-xs text-muted-foreground">
                        No se encontraron sucursales para "{searchSucursalText}"
                      </div>
                    ) : (
                      filteredSucursalesList.map((suc) => {
                        const isSelected = sucursalFilter === suc.id;
                        const count = ordenes.filter((o) => o.sucursal_origen_id === suc.id).length;
                        const esPrincipal = suc.nombre.toLowerCase().includes("principal");

                        return (
                          <button
                            key={suc.id}
                            type="button"
                            onClick={() => {
                              setSucursalFilter(suc.id);
                              setOpenSucursalDropdown(false);
                              setSearchSucursalText("");
                            }}
                            className={`flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer ${
                              isSelected
                                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800 font-bold"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 shadow-2xs text-white ${
                                esPrincipal ? "bg-amber-500" : "bg-[#1B4B73]"
                              }`}>
                                {esPrincipal ? (
                                  <Star className="h-3.5 w-3.5 fill-white text-white" />
                                ) : (
                                  <Store className="h-3.5 w-3.5" />
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold truncate">{suc.nombre}</span>
                                  {esPrincipal && (
                                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500 text-white px-1.5 py-0.2 text-[8px] font-black uppercase">
                                      <Star className="h-2 w-2 fill-white" /> Principal
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-muted-foreground truncate">
                                  {count} {count === 1 ? "orden recibida" : "órdenes recibidas"}
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
        )}

        {/* TOGGLE AUTO-ENVÍO WHATSAPP COMPACTO */}
        <button
          type="button"
          onClick={toggleAutoSendWhatsApp}
          title={
            autoSendWhatsApp
              ? "WhatsApp automático activo al pasar a Terminada"
              : "WhatsApp automático inactivo (clic para activar)"
          }
          className={`rounded-xl px-3 h-10 text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border shrink-0 cursor-pointer shadow-xs active:scale-95 ${
            autoSendWhatsApp
              ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
              : "border border-border/80 bg-slate-50/80 dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:bg-muted/60"
          }`}
        >
          <MessageCircle
            className={`h-3.5 w-3.5 shrink-0 ${autoSendWhatsApp ? "fill-white text-white" : "text-emerald-600 dark:text-emerald-400"}`}
          />
          <span className="hidden sm:inline">WhatsApp</span>
          <span>{autoSendWhatsApp ? "Auto" : "Manual"}</span>
          <span
            className={`h-1.5 w-1.5 rounded-full shrink-0 ${
              autoSendWhatsApp ? "bg-white animate-pulse" : "bg-slate-400"
            }`}
          />
        </button>
      </div>

      {/* SECCIÓN DE 2 COLUMNAS: CONTROL DE LOTE + AVANCE EN TIEMPO REAL */}
      {loteServicioActivo && loteActivoStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-top-2 duration-200">
          {/* TARJETA 1: INFO Y CONTROL DEL LOTE */}
          <div className="p-3 px-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                <Target className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate">
                  <span>Lote Activo:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-extrabold truncate">{loteServicioActivo}</span>
                  <Badge className="bg-amber-600 text-white text-[9px] font-black px-1.5 py-0 shrink-0">
                    {loteLimiteCantidad} máx
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  Mostrando las {loteLimiteCantidad} órdenes prioritarias para hoy.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLimpiarLote}
              className="h-8 px-3 text-xs font-bold rounded-xl border-amber-500/30 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 cursor-pointer shadow-2xs shrink-0 active:scale-95 transition-all ml-2"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              <span>Quitar</span>
            </Button>
          </div>

          {/* TARJETA 2: PROGRESO Y AVANCE EN TIEMPO REAL */}
          <div className="p-3 px-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-center space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-700 dark:text-slate-200 flex items-center gap-1.5 truncate">
                <TrendingUp className="h-4 w-4 text-primary shrink-0" />
                <span>Avance de hoy: <strong className="text-foreground">{loteActivoStats.listas} / {loteActivoStats.meta}</strong> listas</span>
                {loteActivoStats.enCola > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 font-bold ml-1 text-[11px]">
                    ({loteActivoStats.enCola} en cola)
                  </span>
                )}
              </span>

              <span className={`font-black text-xs shrink-0 ${loteActivoStats.isCumplida ? "text-emerald-600 dark:text-emerald-400" : "text-primary"}`}>
                {loteActivoStats.isCumplida ? "🎉 Meta Lista" : `${loteActivoStats.porcentaje}%`}
              </span>
            </div>

            {/* Barra de progreso */}
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden border border-border/40">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  loteActivoStats.isCumplida
                    ? "bg-emerald-500"
                    : loteActivoStats.porcentaje > 50
                    ? "bg-[#1B4B73]"
                    : "bg-[#F0B900]"
                }`}
                style={{ width: `${loteActivoStats.porcentaje}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* TABLERO KANBAN DE 3 COLUMNAS FIJAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start flex-1">
        {FASES_OPERATIVAS.map((fase) => {
          const Icon = fase.icon;
          const ordenesEnFase = ordenesFiltradas.filter((o) => getFaseOrden(o) === fase.id);
          const limite = limiteVisiblePorFase[fase.id] || 50;
          const ordenesVisibles = ordenesEnFase.slice(0, limite);
          const ordenesRestantes = Math.max(0, ordenesEnFase.length - ordenesVisibles.length);

          return (
            <div
              key={fase.id}
              className={`flex flex-col rounded-2xl border ${fase.colorBorder} bg-slate-100/50 dark:bg-slate-900/40 overflow-hidden shadow-xs h-full`}
            >
              {/* ENCABEZADO DE COLUMNA DE COLOR SÓLIDO CENTRADO */}
              <div
                className={`p-3 px-3.5 border-b flex items-center justify-between shadow-xs ${fase.colorHeader}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className="h-5 w-5 shrink-0 text-white" />
                  <div className="min-w-0">
                    <h3 className="font-black tracking-wider uppercase text-white text-xs sm:text-sm leading-tight truncate">
                      {fase.titulo}
                    </h3>
                    {fase.subtitulo && (
                      <p className="text-[10px] text-white/80 font-medium truncate mt-0.5">
                        {fase.subtitulo}
                      </p>
                    )}
                  </div>
                </div>
                <Badge
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-black shadow-xs shrink-0 ${fase.badgeBg}`}
                >
                  {ordenesEnFase.length}
                </Badge>
              </div>

              {/* LISTA DE TARJETAS EN ESTA COLUMNA */}
              <div className="p-2 space-y-2.5 min-h-[440px] max-h-[72vh] overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {ordenesEnFase.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 text-center text-slate-400">
                      <Icon className="h-8 w-8 opacity-20 mb-2" />
                      <p className="text-xs font-medium">Sin órdenes en esta fase</p>
                    </div>
                  ) : (
                    ordenesVisibles.map((orden) => {
                      const cliente = clienteMap.get(orden.cliente_id);
                      const clienteNombreCompleto = cliente
                        ? [cliente.nombre, cliente.apellido]
                            .filter((x) => x && x !== "null")
                            .join(" ")
                        : "Consumidor Final";
                      const isProcessing = processingId === orden.id;
                      const tieneNota = !!orden.notas || orden.items?.some((it) => !!it.notas);
                      const serviciosDeEstaOrden = getServiciosDeOrden(orden);

                      const ubicacionRaw = orden.ubicacion_ropa || fase.etiquetaUbicacion || "";
                      const ubicacionLimpia = ubicacionRaw.replace(
                        "Área de Planchado",
                        "Área de Trabajo",
                      );

                      return (
                        <motion.div
                          key={orden.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          className={`relative rounded-xl border bg-white dark:bg-slate-900 p-3 shadow-xs transition-all hover:shadow-md ${
                            orden.es_urgente
                              ? "border-rose-400 dark:border-rose-700 ring-2 ring-rose-500/20"
                              : "border-slate-200 dark:border-slate-800"
                          }`}
                        >
                          {/* BADGE DE URGENCIA */}
                          {orden.es_urgente && (
                            <div className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full px-2 py-0.5 text-[9px] font-black flex items-center gap-1 shadow-sm uppercase tracking-wider animate-pulse">
                              <Flame className="h-3 w-3" /> Urgente
                            </div>
                          )}

                          {/* BADGE DE SUCURSAL CENTRADO ARRIBA DE LA TARJETA */}
                          {Boolean(orden.es_transferida || orden.sucursal_origen_nombre) && (
                            <div className="flex justify-center mb-2">
                              {(() => {
                                const esPrincipal = orden.sucursal_origen_nombre?.toLowerCase().includes("principal");
                                if (esPrincipal) {
                                  return (
                                    <span
                                      className="inline-flex items-center gap-1.5 text-[10.5px] font-black text-white bg-amber-500 hover:bg-amber-600 px-3 py-0.5 rounded-full shadow-xs shrink-0"
                                      title={`Transferida desde: ${orden.sucursal_origen_nombre}`}
                                    >
                                      <Star className="h-3 w-3 fill-white text-white shrink-0" />
                                      <span>Sucursal principal</span>
                                    </span>
                                  );
                                }
                                return (
                                  <span
                                    className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-500/30 px-2.5 py-0.5 text-[9.5px] font-black shrink-0"
                                    title={`Transferida desde: ${orden.sucursal_origen_nombre || "Otra sucursal"}`}
                                  >
                                    <Store className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                    <span className="truncate max-w-[140px]">{orden.sucursal_origen_nombre || "Sucursal"}</span>
                                  </span>
                                );
                              })()}
                            </div>
                          )}

                          {/* CABECERA TARJETA CON ETIQUETAS E ICONOS EN COLOR PRIMARIO */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-primary">
                                <Receipt className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span>Orden:</span>
                                <span className="font-mono font-black text-slate-900 dark:text-white text-xs">
                                  {orden.numero.replace(/^#/, "")}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900 dark:text-white min-w-0 flex-1">
                                <User className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span className="text-[11px] font-extrabold text-primary shrink-0">
                                  Cliente:
                                </span>
                                <span
                                  className="truncate font-extrabold text-slate-900 dark:text-white min-w-0"
                                  title={clienteNombreCompleto}
                                >
                                  {clienteNombreCompleto}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {new Date(orden.creado_en).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <button
                                type="button"
                                onClick={() => setPrintProduccionOrden(orden)}
                                className="h-6 w-6 rounded-md bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center transition-colors cursor-pointer border border-amber-200 dark:border-amber-800"
                                title="Imprimir Ticket de Taller / Producción"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* SERVICIOS DE LA ORDEN */}
                          {serviciosDeEstaOrden.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                              {serviciosDeEstaOrden.map((srv, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="inline-flex items-center gap-1 rounded-md bg-[#1B4B73] text-white border border-[#1B4B73] shadow-xs px-2 py-0.5 text-[10px] font-black uppercase tracking-wider"
                                >
                                  <Tag className="h-2.5 w-2.5 text-[#F0B900] stroke-[2.5]" />
                                  <span>{srv}</span>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* LISTADO COMPLETO DE PRENDAS Y SERVICIOS */}
                          <div className="space-y-1 mb-3 bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800 max-h-52 overflow-y-auto">
                            {orden.items.map((it, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-[11px] py-1 border-b last:border-b-0 border-slate-100 dark:border-slate-800/60 gap-1.5"
                              >
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <span className="font-bold text-slate-800 dark:text-slate-200 shrink-0">
                                    {it.cantidad}x
                                  </span>
                                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                                    {it.descripcion.replace(/^↳\s*/, "")}
                                  </span>
                                  {it.servicio_origen && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shrink-0">
                                      {it.servicio_origen}
                                    </span>
                                  )}
                                </div>
                                {it.notas && (
                                  <span className="text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded font-mono truncate max-w-[90px] shrink-0">
                                    {it.notas}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* BOTÓN "VER NOTA" PARA ÓRDENES CON NOTAS */}
                          {tieneNota && (
                            <button
                              type="button"
                              onClick={() => setNotaModalOrden(orden)}
                              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/50 px-2.5 py-1.5 text-xs font-extrabold text-amber-900 dark:text-amber-200 transition-all shadow-2xs cursor-pointer mb-2 active:scale-98"
                            >
                              <StickyNote className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span>Ver nota</span>
                            </button>
                          )}

                          {/* FOOTER TARJETA: UBICACIÓN Y BOTÓN AVANZAR */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
                            <span
                              className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate max-w-[130px]"
                              title={ubicacionLimpia}
                            >
                              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="truncate">{ubicacionLimpia}</span>
                            </span>

                            {fase.id !== "lista" ? (
                              <Button
                                size="sm"
                                disabled={isProcessing}
                                onClick={() => handleAvanzarFase(orden, fase.id)}
                                className={`h-7 px-2.5 text-[10px] font-bold rounded-lg transition-all shadow-xs flex items-center gap-1 active:scale-95 shrink-0 cursor-pointer ${
                                  fase.id === "recibida"
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "bg-rose-600 hover:bg-rose-700 text-white"
                                }`}
                              >
                                <span>
                                  {fase.id === "recibida" ? "Iniciar trabajo" : "Terminar trabajo"}
                                </span>
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            ) : (
                              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white transition-colors duration-200 text-[9px] font-extrabold px-2.5 py-0.5 shrink-0 border border-emerald-500/20 cursor-default">
                                ✓ Listo
                              </Badge>
                            )}
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                  {ordenesRestantes > 0 && (
                    <div className="pt-2 pb-1 text-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setLimiteVisiblePorFase((prev) => ({
                            ...prev,
                            [fase.id]: (prev[fase.id] || 50) + 50,
                          }))
                        }
                        className="w-full text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 h-8 shadow-2xs transition-all cursor-pointer"
                      >
                        Mostrar más ({ordenesRestantes} órdenes restantes)
                      </Button>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DETALLADO "VER NOTA" */}
      <AnimatePresence>
        {notaModalOrden && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 text-slate-900 dark:text-white"
            >
              {/* HEADER MODAL */}
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 flex items-center justify-center border border-amber-200 dark:border-amber-800 shrink-0">
                    <StickyNote className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-slate-900 dark:text-white text-base leading-tight">
                      Instrucciones & Notas
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Orden #{notaModalOrden.numero.replace(/^#/, "")} ·{" "}
                      {clienteMap.get(notaModalOrden.cliente_id)?.nombre || "Cliente General"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNotaModalOrden(null)}
                  className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {/* CONTENIDO DE LA NOTA */}
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {notaModalOrden.notas && (
                  <div className="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-900/60 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1">
                      📌 Nota General de la Orden:
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
                      {notaModalOrden.notas}
                    </p>
                  </div>
                )}

                {/* NOTAS ESPECÍFICAS POR PRENDA */}
                {notaModalOrden.items?.some((it) => !!it.notas) && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                      🏷️ Notas por Prenda / Trabajo Especial:
                    </div>
                    {notaModalOrden.items
                      .filter((it) => !!it.notas)
                      .map((it, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1"
                        >
                          <div className="font-extrabold text-slate-900 dark:text-white">
                            {it.cantidad}x {it.descripcion}
                          </div>
                          <div className="text-amber-800 dark:text-amber-300 font-semibold bg-amber-50/50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200/50 dark:border-amber-900/40">
                            "{it.notas}"
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* FOOTER MODAL */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const target = notaModalOrden;
                    setNotaModalOrden(null);
                    setPrintProduccionOrden(target);
                  }}
                  className="h-9 px-4 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-900 dark:text-amber-200 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  Imprimir Ticket de Taller
                </Button>

                <Button
                  onClick={() => setNotaModalOrden(null)}
                  className="h-9 px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cerrar
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PORTAL DE IMPRESIÓN DE PRODUCCIÓN / TALLER */}
      {printProduccionOrden && (
        <TicketPrintPortal
          orden={printProduccionOrden}
          tenant={user.tenant}
          clientes={clientes}
          empleados={empleados}
          esProduccion={true}
          onClose={() => setPrintProduccionOrden(null)}
        />
      )}
    </div>
  );
}
