/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import { useState, useEffect, useMemo } from "react";
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
import { usePlans } from "@/hooks/use-queries";
import { notificarWhatsApp, calcularDiasEnAlmacen } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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
  const tenantId = user?.tenant?.id;

  const { data: plans = [] } = usePlans();
  const activePlan = plans.find((p) => p.id === user?.tenant?.plan_id);
  const hasProcesosModule = isModuleEnabled(user?.tenant || null, "procesos", activePlan);

  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [printProduccionOrden, setPrintProduccionOrden] = useState<Orden | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [servicioFilter, setServicioFilter] = useState<string>("todos");
  const [soloUrgentes, setSoloUrgentes] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [notaModalOrden, setNotaModalOrden] = useState<Orden | null>(null);
  const [diasAlmacen, setDiasAlmacen] = useState<number>(
    user?.tenant?.config?.dias_almacenamiento_sin_retirar || user?.tenant?.config?.whatsapp?.dias_recordatorio_sin_retirar || 5
  );

  useEffect(() => {
    if (user?.tenant?.config) {
      const cfgVal = user.tenant.config.dias_almacenamiento_sin_retirar || user.tenant.config.whatsapp?.dias_recordatorio_sin_retirar || 5;
      setDiasAlmacen(cfgVal);
    }
  }, [user?.tenant?.config]);

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
      toast.success(`Días de almacenamiento actualizados a ${nuevoVal} días`);
    } catch (err) {
      console.error("Error guardando días de almacenamiento:", err);
      toast.error("No se pudo guardar la configuración");
    }
  };

  const ordenesAlmacenadasCount = useMemo(() => {
    return ordenes.filter((o) => o.estado === "LISTA" && calcularDiasEnAlmacen(o.creado_en) >= diasAlmacen).length;
  }, [ordenes, diasAlmacen]);

  const loadData = async () => {
    if (!tenantId || tenantId === "__loading__") {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [ords, clis, emps] = await Promise.all([
        getOrdenes(tenantId), 
        getClientes(tenantId),
        getEmpleados(tenantId)
      ]);
      const activasConServicio = (ords || []).filter((o) => {
        if (o.estado === "ENTREGADA" || o.estado === "ANULADA" || o.estado === "PAGADA") {
          return false;
        }
        const tieneArrayServicios = Array.isArray(o.servicios) && o.servicios.length > 0;
        const tieneItemServicios =
          Array.isArray(o.items) && o.items.some((it) => !!it.servicio_origen);
        return tieneArrayServicios || tieneItemServicios;
      });
      setOrdenes(activasConServicio);
      setClientes(clis || []);
      setEmpleados(emps || []);
    } catch (err) {
      console.error("Error cargando procesos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId && tenantId !== "__loading__") {
      loadData();
    }
  }, [tenantId]);

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

  // Determinar en qué columna cae la orden (3 COLUMNAS DIRECTAS)
  const getFaseOrden = (orden: Orden): string => {
    if (orden.estado === "RECIBIDA") return "recibida";
    if (orden.estado === "LISTA") return "lista";
    if (orden.estado === "EN_PROCESO") return "proceso";
    return "recibida";
  };

  // Filtrado de órdenes por búsqueda, servicio real y urgencia
  const ordenesFiltradas = useMemo(() => {
    return ordenes.filter((o) => {
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
        const matchServArray = o.servicios?.some((s) => s.toLowerCase() === target);
        const matchItemServ = o.items?.some(
          (it) => (it.servicio_origen || "").toLowerCase() === target,
        );
        if (!matchServArray && !matchItemServ) return false;
      }

      return true;
    });
  }, [ordenes, searchQuery, servicioFilter, soloUrgentes, clienteMap]);

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
      toast.success(
        newValue
          ? "Envío automático por WhatsApp ACTIVADO"
          : "Envío automático por WhatsApp DESACTIVADO",
      );
    } catch (err) {
      console.error("Error al guardar preferencia de WhatsApp en Supabase:", err);
      setLocalAutoSend(!newValue);
      toast.error("No se pudo guardar la preferencia en Supabase");
    }
  };

  const showManualWhatsAppToast = (cli: Cliente, numLimpio: string) => {
    toast.custom(
      (t) => (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex items-center gap-3 rounded-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-2 px-3.5 shadow-xl border border-slate-200/90 dark:border-slate-800 shrink-0 whitespace-nowrap"
        >
          {/* Icono de WhatsApp en verde */}
          <div className="h-7 w-7 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 fill-emerald-600/20" />
          </div>

          {/* Contenido en una sola línea */}
          <div className="flex items-center gap-1.5 text-xs font-bold whitespace-nowrap">
            <span className="text-slate-900 dark:text-white">¡Orden {numLimpio} lista!</span>
            <span className="text-slate-400 font-normal">•</span>
            <span className="text-slate-600 dark:text-slate-300 font-medium">
              Notificar a{" "}
              <strong className="font-bold text-slate-900 dark:text-white">
                {[cli.nombre, cli.apellido].filter((x) => x && x !== "null").join(" ") ||
                  "Consumidor Final"}
              </strong>
            </span>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-1 shrink-0 ml-1">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full px-3 h-7 text-xs shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1 border-none"
              onClick={() => {
                toast.dismiss(t);
                const msg = encodeURIComponent(
                  `Hola ${cli.nombre} 👋, tu orden ${numLimpio} en ${user?.tenant?.nombre || "la lavandería"} ya está LISTA para retirar. ¡Te esperamos!`,
                );
                window.open(
                  `https://wa.me/${cli.telefono.replace(/\D/g, "")}?text=${msg}`,
                  "_blank",
                );
              }}
            >
              <MessageCircle className="h-3 w-3 fill-white text-white" />
              <span>Enviar WA</span>
            </Button>

            <button
              type="button"
              onClick={() => toast.dismiss(t)}
              className="h-6 w-6 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer ml-0.5"
              title="Cerrar aviso"
            >
              ✕
            </button>
          </div>
        </motion.div>
      ),
      {
        duration: 9000,
        unstyled: true,
      },
    );
  };

  // Avanzar una orden a la siguiente fase operativa en 3 columnas
  const handleAvanzarFase = async (orden: Orden, faseActualId: string) => {
    setProcessingId(orden.id);
    try {
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

      await updateOrdenEstado(orden.id, nuevoEstado, etiquetaUbicacion);

      setOrdenes((prev) =>
        prev.map((item) =>
          item.id === orden.id
            ? { ...item, estado: nuevoEstado, ubicacion_ropa: etiquetaUbicacion }
            : item,
        ),
      );

      const nomFase =
        FASES_OPERATIVAS.find((f) => f.id === siguienteFaseId)?.titulo || siguienteFaseId;
      const numLimpio = orden.numero.replace(/^#/, "");
      toast.success(`Orden ${numLimpio} movida a "${nomFase}"`);

      if (nuevoEstado === "LISTA") {
        const cli = clienteMap.get(orden.cliente_id);
        if (cli?.telefono) {
          if (autoSendWhatsApp && user?.tenant) {
            toast.loading("Enviando WhatsApp a " + cli.nombre + "...", { id: `wa-${orden.id}` });
            const res = await notificarWhatsApp(user.tenant, cli, orden, "lista");
            toast.dismiss(`wa-${orden.id}`);

            if (res.ok) {
              toast.success(`Notificación enviada a ${cli.nombre}`, {
                description: `Orden ${numLimpio} notificada con éxito.`,
                duration: 4000,
              });
            } else {
              toast.error(`WhatsApp no enviado: ${res.reason || "Error de API"}`, {
                description: "Puedes enviarlo manualmente a continuación.",
              });
              showManualWhatsAppToast(cli, numLimpio);
            }
          } else {
            showManualWhatsAppToast(cli, numLimpio);
          }
        }
      }
    } catch (err) {
      console.error("Error al mover fase:", err);
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

  if (loading && ordenes.length === 0 && (typeof navigator === "undefined" || navigator.onLine)) {
    return <GlobalPageLoader text="Cargando operaciones..." />;
  }

  if (!loading && user?.empleado && !can(user.empleado, "procesos")) {
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

  if (!loading && !hasProcesosModule) {
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

          <div className="flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50/60 px-4 py-2 shadow-2xs dark:border-rose-900/50 dark:bg-rose-950/30">
            <Flame className="h-4 w-4 text-rose-600 dark:text-rose-400 animate-pulse" />
            <div className="text-left">
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Urgentes
              </div>
              <div className="text-sm font-extrabold text-rose-900 dark:text-rose-200">
                {stats.urgentes}
              </div>
            </div>
          </div>

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

          {/* BOTÓN PANTALLA COMPLETA EN COLOR PRIMARIO Y ALTURA ESTÁNDAR H-10 */}
          <Button
            onClick={toggleFullscreen}
            className="rounded-xl h-10 px-4 sm:px-5 bg-[#1B4B73] hover:bg-[#143a59] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-all active:scale-95 border border-[#1B4B73] cursor-pointer shrink-0"
            title={isFullscreen ? "Salir de Pantalla Completa" : "Modo Pantalla Completa"}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-4 w-4 text-[#F0B900] shrink-0" />
                <span>Salir Pantalla Completa</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4 text-[#F0B900] shrink-0" />
                <span>Pantalla Completa</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={loadData}
            className="rounded-xl h-10 w-10 p-0 border border-border/80 bg-surface shadow-xs hover:bg-muted/60 text-foreground flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all"
            title="Refrescar datos"
          >
            <RefreshCw className={`h-4 w-4 text-primary ${loading ? "animate-spin" : ""}`} />
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

        {/* FILTRO DESPLEGABLE (SELECT) DE SERVICIOS REALES */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> <span className="hidden lg:inline">Servicio:</span>
          </span>

          <select
            value={servicioFilter}
            onChange={(e) => setServicioFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950 px-3 text-xs font-bold text-slate-800 dark:text-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs transition-all cursor-pointer min-w-[160px] max-w-[210px]"
          >
            <option value="todos">Todos los Servicios ({ordenes.length})</option>
            {serviciosPresentes.map((srv) => {
              const target = srv.toLowerCase();
              const count = ordenes.filter(
                (o) =>
                  o.servicios?.some((s) => s.toLowerCase() === target) ||
                  o.items?.some((it) => (it.servicio_origen || "").toLowerCase() === target),
              ).length;

              return (
                <option key={srv} value={srv}>
                  {srv} ({count})
                </option>
              );
            })}
          </select>
        </div>

        {/* TOGGLE URGENTES */}
        <button
          type="button"
          onClick={() => setSoloUrgentes((prev) => !prev)}
          className={`rounded-xl px-4 h-10 text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 border shrink-0 cursor-pointer shadow-xs active:scale-95 ${
            soloUrgentes
              ? "bg-rose-500 hover:bg-rose-600 text-white border-rose-500"
              : "bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
          }`}
        >
          <Flame className={`h-4 w-4 shrink-0 ${soloUrgentes ? "fill-white text-white" : "text-rose-500"}`} />
          <span>Urgentes</span>
          <span
            className={`ml-0.5 rounded-full px-2 py-0.5 text-[10px] font-black leading-none shadow-2xs ${
              soloUrgentes ? "bg-white text-rose-600" : "bg-rose-500 text-white"
            }`}
          >
            {stats.urgentes}
          </span>
        </button>

        {/* TOGGLE AUTO-ENVÍO WHATSAPP */}
        <button
          type="button"
          onClick={toggleAutoSendWhatsApp}
          title={
            autoSendWhatsApp
              ? "Auto-envío activo. Al pasar a Terminada se notifica por WhatsApp vía API."
              : "Auto-envío inactivo. Haz clic para activar el envío automático por WhatsApp."
          }
          className={`rounded-xl px-4 h-10 text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 border shrink-0 cursor-pointer shadow-xs active:scale-95 ${
            autoSendWhatsApp
              ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
              : "border border-border/80 bg-surface text-foreground hover:bg-muted/60"
          }`}
        >
          <MessageCircle
            className={`h-4 w-4 shrink-0 ${autoSendWhatsApp ? "fill-white text-white" : "text-emerald-600 dark:text-emerald-400"}`}
          />
          <span>{autoSendWhatsApp ? "WhatsApp Auto ON" : "WhatsApp Auto OFF"}</span>
          <span
            className={`h-2 w-2 rounded-full shrink-0 ${
              autoSendWhatsApp ? "bg-white animate-pulse" : "bg-slate-400"
            }`}
          />
        </button>
      </div>

      {/* TABLERO KANBAN DE 3 COLUMNAS FIJAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start flex-1">
        {FASES_OPERATIVAS.map((fase) => {
          const Icon = fase.icon;
          const ordenesEnFase = ordenesFiltradas.filter((o) => getFaseOrden(o) === fase.id);

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
                    ordenesEnFase.map((orden) => {
                      const cliente = clienteMap.get(orden.cliente_id);
                      const clienteNombreCompleto = cliente
                        ? [cliente.nombre, cliente.apellido]
                            .filter((x) => x && x !== "null")
                            .join(" ")
                        : "Consumidor Final";
                      const isProcessing = processingId === orden.id;
                      const tieneNota = !!orden.notas || orden.items?.some((it) => !!it.notas);

                      const ubicacionRaw = orden.ubicacion_ropa || fase.etiquetaUbicacion || "";
                      const ubicacionLimpia = ubicacionRaw.replace(
                        "Área de Planchado",
                        "Área de Trabajo",
                      );

                      return (
                        <motion.div
                          key={orden.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
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
                                <Clock className="h-3 w-3" />
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

                          {/* LISTADO COMPLETO DE PRENDAS Y SERVICIOS (SIN TRUNCAR) */}
                          <div className="space-y-1 mb-3 bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800 max-h-52 overflow-y-auto">
                            {orden.items.map((it, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-[11px] py-0.5 border-b last:border-b-0 border-slate-100 dark:border-slate-800/60"
                              >
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                  {it.cantidad}x {it.descripcion}
                                </span>
                                {it.notas && (
                                  <span className="text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded font-mono truncate max-w-[90px]">
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
                                className={`h-7 px-2.5 text-[10px] font-bold rounded-lg transition-all shadow-xs flex items-center gap-1 active:scale-95 shrink-0 ${
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
