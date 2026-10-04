import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone,
  Rocket,
  Lightbulb,
  Wrench,
  CreditCard,
  ShieldAlert,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { marcarNotificacionLeida, type Notificacion } from "@/lib/storage";
import { ADMIN_BROADCAST_TYPES, type AdminBroadcastConfig } from "./AdminBroadcastToast";

export interface DashboardAvisosBannerCardProps {
  titulo: string;
  mensaje: string;
  tipo?: string;
  link?: string | null;
  createdAt?: string;
  onDismiss?: () => void;
  isStaticPreview?: boolean;
  totalCount?: number;
  currentIndex?: number;
  onPrev?: () => void;
  onNext?: () => void;
}

/**
 * Normaliza cualquier tipo de aviso recibido (ej: ADMIN_BANNER_MANTENIMIENTO, ADMIN_BOTH_URGENTE, ADMIN_ANUNCIO)
 * a su categoría base registrada en ADMIN_BROADCAST_TYPES.
 */
export function resolveBroadcastCategory(tipo?: string): AdminBroadcastConfig {
  const norm = (tipo || "ADMIN_ANUNCIO").toUpperCase();
  if (norm.includes("NOVEDAD")) return ADMIN_BROADCAST_TYPES.ADMIN_NOVEDAD;
  if (norm.includes("TIP")) return ADMIN_BROADCAST_TYPES.ADMIN_TIP;
  if (norm.includes("MANTENIMIENTO")) return ADMIN_BROADCAST_TYPES.ADMIN_MANTENIMIENTO;
  if (norm.includes("FACTURACION")) return ADMIN_BROADCAST_TYPES.ADMIN_FACTURACION;
  if (norm.includes("URGENTE")) return ADMIN_BROADCAST_TYPES.ADMIN_URGENTE;
  return ADMIN_BROADCAST_TYPES.ADMIN_ANUNCIO;
}

/**
 * Estilos enriquecidos para la Tarjeta de Dashboard (Hallmark / Fintech Design).
 */
const BANNER_THEMES: Record<
  string,
  {
    bgGradient: string;
    border: string;
    accentBar: string;
    iconBoxBg: string;
    iconBoxBorder: string;
    iconBoxShadow: string;
    badgeBg: string;
    badgeText: string;
    titleColor: string;
    bodyColor: string;
    ctaButton: string;
    pulseDot: string;
  }
> = {
  ADMIN_ANUNCIO: {
    bgGradient: "from-sky-50/95 via-white to-sky-50/40 dark:from-sky-950/40 dark:via-slate-900/95 dark:to-sky-950/20",
    border: "border-sky-200/90 dark:border-sky-800/80",
    accentBar: "bg-sky-500",
    iconBoxBg: "bg-gradient-to-br from-sky-500 to-[#1B4B73] text-white",
    iconBoxBorder: "border-sky-300/40 dark:border-sky-500/30",
    iconBoxShadow: "shadow-[0_8px_20px_-4px_rgba(2,132,199,0.35)]",
    badgeBg: "bg-sky-100 dark:bg-sky-950/80",
    badgeText: "text-sky-900 dark:text-sky-300",
    titleColor: "text-slate-900 dark:text-white",
    bodyColor: "text-slate-600 dark:text-slate-300",
    ctaButton: "bg-[#1B4B73] hover:bg-[#143755] text-white shadow-xs",
    pulseDot: "bg-sky-500",
  },
  ADMIN_NOVEDAD: {
    bgGradient: "from-purple-50/95 via-white to-purple-50/40 dark:from-purple-950/40 dark:via-slate-900/95 dark:to-purple-950/20",
    border: "border-purple-200/90 dark:border-purple-800/80",
    accentBar: "bg-purple-500",
    iconBoxBg: "bg-gradient-to-br from-purple-500 to-indigo-700 text-white",
    iconBoxBorder: "border-purple-300/40 dark:border-purple-500/30",
    iconBoxShadow: "shadow-[0_8px_20px_-4px_rgba(147,51,234,0.35)]",
    badgeBg: "bg-purple-100 dark:bg-purple-950/80",
    badgeText: "text-purple-900 dark:text-purple-300",
    titleColor: "text-slate-900 dark:text-white",
    bodyColor: "text-slate-600 dark:text-slate-300",
    ctaButton: "bg-purple-700 hover:bg-purple-800 text-white shadow-xs",
    pulseDot: "bg-purple-500",
  },
  ADMIN_TIP: {
    bgGradient: "from-emerald-50/95 via-white to-emerald-50/40 dark:from-emerald-950/40 dark:via-slate-900/95 dark:to-emerald-950/20",
    border: "border-emerald-200/90 dark:border-emerald-800/80",
    accentBar: "bg-emerald-500",
    iconBoxBg: "bg-gradient-to-br from-emerald-500 to-teal-700 text-white",
    iconBoxBorder: "border-emerald-300/40 dark:border-emerald-500/30",
    iconBoxShadow: "shadow-[0_8px_20px_-4px_rgba(16,185,129,0.35)]",
    badgeBg: "bg-emerald-100 dark:bg-emerald-950/80",
    badgeText: "text-emerald-900 dark:text-emerald-300",
    titleColor: "text-slate-900 dark:text-white",
    bodyColor: "text-slate-600 dark:text-slate-300",
    ctaButton: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs",
    pulseDot: "bg-emerald-500",
  },
  ADMIN_MANTENIMIENTO: {
    bgGradient: "from-amber-50/95 via-white to-amber-50/40 dark:from-amber-950/40 dark:via-slate-900/95 dark:to-amber-950/20",
    border: "border-amber-200/90 dark:border-amber-800/80",
    accentBar: "bg-amber-500",
    iconBoxBg: "bg-gradient-to-br from-amber-500 to-orange-600 text-white",
    iconBoxBorder: "border-amber-300/40 dark:border-amber-500/30",
    iconBoxShadow: "shadow-[0_8px_20px_-4px_rgba(245,158,11,0.35)]",
    badgeBg: "bg-amber-100 dark:bg-amber-950/80",
    badgeText: "text-amber-900 dark:text-amber-300",
    titleColor: "text-slate-900 dark:text-white",
    bodyColor: "text-slate-600 dark:text-slate-300",
    ctaButton: "bg-amber-600 hover:bg-amber-700 text-white shadow-xs",
    pulseDot: "bg-amber-500",
  },
  ADMIN_FACTURACION: {
    bgGradient: "from-indigo-50/95 via-white to-indigo-50/40 dark:from-indigo-950/40 dark:via-slate-900/95 dark:to-indigo-950/20",
    border: "border-indigo-200/90 dark:border-indigo-800/80",
    accentBar: "bg-indigo-500",
    iconBoxBg: "bg-gradient-to-br from-indigo-500 to-blue-700 text-white",
    iconBoxBorder: "border-indigo-300/40 dark:border-indigo-500/30",
    iconBoxShadow: "shadow-[0_8px_20px_-4px_rgba(99,102,241,0.35)]",
    badgeBg: "bg-indigo-100 dark:bg-indigo-950/80",
    badgeText: "text-indigo-900 dark:text-indigo-300",
    titleColor: "text-slate-900 dark:text-white",
    bodyColor: "text-slate-600 dark:text-slate-300",
    ctaButton: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs",
    pulseDot: "bg-indigo-500",
  },
  ADMIN_URGENTE: {
    bgGradient: "from-rose-50/95 via-white to-rose-50/40 dark:from-rose-950/40 dark:via-slate-900/95 dark:to-rose-950/20",
    border: "border-rose-300 dark:border-rose-800/90",
    accentBar: "bg-rose-500",
    iconBoxBg: "bg-gradient-to-br from-rose-500 to-red-700 text-white",
    iconBoxBorder: "border-rose-300/40 dark:border-rose-500/30",
    iconBoxShadow: "shadow-[0_8px_20px_-4px_rgba(244,63,94,0.4)]",
    badgeBg: "bg-rose-100 dark:bg-rose-950/80",
    badgeText: "text-rose-900 dark:text-rose-300",
    titleColor: "text-slate-900 dark:text-white",
    bodyColor: "text-slate-600 dark:text-slate-300",
    ctaButton: "bg-rose-600 hover:bg-rose-700 text-white shadow-xs",
    pulseDot: "bg-rose-500 animate-ping",
  },
};

/**
 * Tarjeta visual de aviso para el Dashboard (puede usarse en producción y como preview).
 */
export function DashboardAvisosBannerCard({
  titulo,
  mensaje,
  tipo,
  link,
  createdAt,
  onDismiss,
  isStaticPreview = false,
  totalCount = 1,
  currentIndex = 0,
  onPrev,
  onNext,
}: DashboardAvisosBannerCardProps) {
  const baseCfg = resolveBroadcastCategory(tipo);
  const theme = BANNER_THEMES[baseCfg.id] || BANNER_THEMES.ADMIN_ANUNCIO;
  const Icon = baseCfg.icon;

  const isTitleEmpty = !titulo || !titulo.trim();
  const isMessageEmpty = !mensaje || !mensaje.trim();

  const handleAction = () => {
    if (!link || isStaticPreview) return;
    if (link.startsWith("http")) {
      window.open(link, "_blank", "noopener,noreferrer");
    } else {
      window.location.assign(link);
    }
  };

  // En modo vista previa dentro de formularios o modales estrechos, se adapta de forma vertical limpia
  if (isStaticPreview) {
    return (
      <div
        style={{ fontFamily: "'Plus Jakarta Sans', var(--font-sans), sans-serif" }}
        className={`relative w-full overflow-hidden rounded-2xl border ${theme.border} bg-gradient-to-r ${theme.bgGradient} p-4 shadow-sm transition-all flex flex-col justify-between gap-3 min-h-[170px] select-none`}
      >
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${theme.iconBoxBg} ${theme.iconBoxBorder} ${theme.iconBoxShadow}`}
          >
            <Icon className="h-5 w-5 stroke-[2.2]" />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${theme.badgeBg} ${theme.badgeText}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${theme.pulseDot}`} />
                <span>{baseCfg.label}</span>
              </span>

              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                • Equipo Klynn
              </span>
            </div>

            <h3 className={`text-xs sm:text-sm font-black ${theme.titleColor} tracking-tight leading-snug pt-0.5 break-words`}>
              {isTitleEmpty ? (
                <span className="text-slate-400 dark:text-slate-500 italic font-medium">
                  Escribe el título a la izquierda...
                </span>
              ) : (
                titulo
              )}
            </h3>

            <p className={`text-[11.5px] sm:text-xs ${theme.bodyColor} font-medium leading-relaxed break-words`}>
              {isMessageEmpty ? (
                <span className="text-slate-400/80 dark:text-slate-500/80 italic font-normal">
                  Aquí verás la vista previa del mensaje que redactes...
                </span>
              ) : (
                mensaje
              )}
            </p>
          </div>
        </div>

        {/* Barra inferior de la preview: Link opcional y Botón Entendido */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/5 dark:border-white/5">
          {link ? (
            <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black ${theme.ctaButton}`}>
              <span>Ver detalles</span>
              <ExternalLink className="h-3 w-3" />
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground/60 italic">Vista previa en tiempo real</span>
          )}

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1B4B73] dark:bg-sky-600 text-white text-[11px] font-bold shadow-xs opacity-90 shrink-0">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>Entendido, cerrar aviso</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ fontFamily: "'Plus Jakarta Sans', var(--font-sans), sans-serif" }}
      className={`relative w-full overflow-hidden rounded-2xl sm:rounded-3xl border ${theme.border} bg-gradient-to-r ${theme.bgGradient} p-4 sm:p-5 shadow-sm transition-all`}
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        {/* Contenido Principal con Ícono */}
        <div className="flex items-start gap-3.5 sm:gap-4 min-w-0 flex-1">
          {/* Ícono temático en contenedor con relieve y sombra */}
          <div
            className={`h-11 w-11 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center shrink-0 border ${theme.iconBoxBg} ${theme.iconBoxBorder} ${theme.iconBoxShadow}`}
          >
            <Icon className="h-5.5 w-5.5 sm:h-6 sm:w-6 stroke-[2.2]" />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            {/* Fila de Insignias / Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 text-[10px] sm:text-[10.5px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${theme.badgeBg} ${theme.badgeText}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${theme.pulseDot}`} />
                <span>{baseCfg.label}</span>
              </span>

              <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400">
                • Equipo Klynn
              </span>

              {createdAt && (
                <span className="text-[10px] text-muted-foreground hidden md:inline">
                  {new Date(createdAt).toLocaleDateString("es-DO", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}

              {/* Paginador si hay múltiples avisos */}
              {totalCount > 1 && (
                <div className="inline-flex items-center gap-1 ml-auto sm:ml-2 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full text-[10px] font-extrabold text-slate-700 dark:text-slate-200">
                  <span>{currentIndex + 1} de {totalCount}</span>
                </div>
              )}
            </div>

            {/* Título en Negrita Destacado */}
            <h3
              className={`text-sm sm:text-base font-black ${theme.titleColor} tracking-tight leading-snug pt-0.5 break-words`}
            >
              {titulo || "Aviso Oficial"}
            </h3>

            {/* Mensaje descriptivo con excelente legibilidad */}
            <p
              className={`text-xs sm:text-[13px] ${theme.bodyColor} font-medium leading-relaxed max-w-4xl break-words`}
            >
              {mensaje}
            </p>

            {/* Botón de Enlace / Acción (si tiene link) */}
            {link && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAction}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-transform active:scale-95 ${theme.ctaButton}`}
                >
                  <span>Ver detalles</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Controles de Cierre y Navegación entre avisos */}
        <div className="flex items-center justify-between md:justify-end gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-200/60 dark:border-slate-800">
          {/* Navegación carrusel si hay más de 1 aviso */}
          {totalCount > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onPrev}
                disabled={currentIndex === 0}
                className="h-8 w-8 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Aviso anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={currentIndex >= totalCount - 1}
                className="h-8 w-8 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Siguiente aviso"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Botón de Descartar / Cerrar aviso */}
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1B4B73] hover:bg-[#143755] dark:bg-sky-600 dark:hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
              title="Entendido, cerrar aviso"
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>Entendido, cerrar aviso</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1B4B73] dark:bg-sky-600 text-white text-xs font-bold shadow-xs opacity-75 shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>Entendido, cerrar aviso</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Componente principal que se monta en el Dashboard de la lavandería justo debajo de los 4 KPIs.
 * Gestiona persistencia en localStorage, sincronización con Supabase y descarte definitivo.
 */
export function DashboardAvisosBanner({ tenantId }: { tenantId: string }) {
  const [avisos, setAvisos] = useState<Notificacion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const storageKey = useMemo(
    () => `klynn_dismissed_dashboard_avisos_${tenantId}`,
    [tenantId]
  );

  // Obtener IDs descartados por el usuario en este navegador
  const getDismissedIds = useCallback((): Set<string> => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  }, [storageKey]);

  // Determinar si una notificación debe mostrarse como tarjeta en el Dashboard
  const isDashboardCardNotice = useCallback((tipo?: string): boolean => {
    const norm = (tipo || "").toUpperCase();
    return norm.includes("BANNER") || norm.includes("CARD") || norm.includes("BOTH");
  }, []);

  // Cargar avisos activos desde Supabase
  const loadAvisos = useCallback(async () => {
    if (!tenantId || tenantId === "__loading__") return;
    try {
      const dismissed = getDismissedIds();
      const { data, error } = await supabase
        .from("notificaciones")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("leida", false)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        const filtered = (data as Notificacion[]).filter(
          (n) => isDashboardCardNotice(n.tipo) && !dismissed.has(n.id)
        );
        setAvisos(filtered);
        setCurrentIndex(0);
      }
    } catch (e) {
      console.warn("Error cargando avisos del dashboard:", e);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, getDismissedIds, isDashboardCardNotice]);

  useEffect(() => {
    loadAvisos();
  }, [loadAvisos]);

  // Escuchar eventos en tiempo real (WebSockets + BroadcastChannel + eventos locales)
  useEffect(() => {
    if (!tenantId || tenantId === "__loading__") return;

    // 1. Escuchador de evento Custom local disparado por TenantShell
    const handleLocalEvent = (e: any) => {
      const row = e.detail;
      if (row && isDashboardCardNotice(row.tipo)) {
        const dismissed = getDismissedIds();
        if (!dismissed.has(row.id)) {
          setAvisos((prev) => {
            if (prev.some((a) => a.id === row.id)) return prev;
            return [row, ...prev];
          });
        }
      }
    };
    window.addEventListener("klynn_nuevo_aviso_dashboard", handleLocalEvent);

    // 2. BroadcastChannel entre pestañas del mismo navegador
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc = new BroadcastChannel(`klynn_tenant_${tenantId}`);
        bc.onmessage = (event) => {
          if (event.data?.type === "NUEVA_NOTIFICACION" && event.data?.notificacion) {
            const notif = event.data.notificacion;
            if (isDashboardCardNotice(notif.tipo)) {
              const dismissed = getDismissedIds();
              if (!dismissed.has(notif.id)) {
                setAvisos((prev) => {
                  if (prev.some((a) => a.id === notif.id)) return prev;
                  return [notif, ...prev];
                });
              }
            }
          }
        };
      }
    } catch {}

    // 3. Supabase Realtime Channel directo
    const channel = supabase
      .channel(`dashboard_banner_realtime_${tenantId}`)
      .on("broadcast", { event: "nueva_notificacion" }, (payload) => {
        const notif = payload.payload;
        if (notif && isDashboardCardNotice(notif.tipo)) {
          const dismissed = getDismissedIds();
          if (!dismissed.has(notif.id)) {
            setAvisos((prev) => {
              if (prev.some((a) => a.id === notif.id)) return prev;
              return [notif, ...prev];
            });
          }
        }
      })
      .subscribe();

    return () => {
      window.removeEventListener("klynn_nuevo_aviso_dashboard", handleLocalEvent);
      if (bc) bc.close();
      supabase.removeChannel(channel);
    };
  }, [tenantId, isDashboardCardNotice, getDismissedIds]);

  // Función para cerrar / descartar definitivamente el aviso actual
  const handleDismissCurrent = async () => {
    if (avisos.length === 0) return;
    const currentAviso = avisos[currentIndex];
    if (!currentAviso) return;

    // 1. Guardar en localStorage para que nunca más se muestre en este navegador
    try {
      const dismissed = getDismissedIds();
      dismissed.add(currentAviso.id);
      localStorage.setItem(storageKey, JSON.stringify(Array.from(dismissed)));
    } catch {}

    // 2. Marcar como leída en la base de datos de Supabase
    try {
      marcarNotificacionLeida(currentAviso.id);
    } catch {}

    // 3. Actualizar estado local
    setAvisos((prev) => {
      const next = prev.filter((a) => a.id !== currentAviso.id);
      if (currentIndex >= next.length && next.length > 0) {
        setCurrentIndex(next.length - 1);
      }
      return next;
    });
  };

  if (isLoading || avisos.length === 0) {
    return null;
  }

  const activeAviso = avisos[currentIndex] || avisos[0];
  if (!activeAviso) return null;

  return (
    <div className="w-full mt-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeAviso.id}
          initial={{ opacity: 0, y: -8, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, height: 0, y: -12, scale: 0.98 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
        >
          <DashboardAvisosBannerCard
            titulo={activeAviso.titulo}
            mensaje={activeAviso.mensaje}
            tipo={activeAviso.tipo}
            link={activeAviso.link}
            createdAt={activeAviso.created_at}
            totalCount={avisos.length}
            currentIndex={currentIndex}
            onPrev={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            onNext={() => setCurrentIndex((prev) => Math.min(avisos.length - 1, prev + 1))}
            onDismiss={handleDismissCurrent}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
