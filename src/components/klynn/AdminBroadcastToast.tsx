import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Megaphone,
  Rocket,
  Lightbulb,
  Wrench,
  CreditCard,
  ShieldAlert,
  X,
  ExternalLink,
} from "lucide-react";

export type AdminBroadcastType =
  | "ADMIN_ANUNCIO"
  | "ADMIN_NOVEDAD"
  | "ADMIN_TIP"
  | "ADMIN_MANTENIMIENTO"
  | "ADMIN_FACTURACION"
  | "ADMIN_URGENTE"
  | "BROADCAST";

export interface AdminBroadcastConfig {
  id: string;
  icon: any;
  label: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  pillBg: string;
  pillBorder: string;
  pillShadow: string;
  iconBg: string;
  iconBorder: string;
  iconColor: string;
  titleColor: string;
  textColor: string;
}

export const ADMIN_BROADCAST_TYPES: Record<string, AdminBroadcastConfig> = {
  ADMIN_ANUNCIO: {
    id: "ADMIN_ANUNCIO",
    icon: Megaphone,
    label: "Comunicado Oficial",
    description: "Anuncios institucionales y mensajes directos del equipo de Klynn",
    badgeBg: "bg-sky-100 dark:bg-sky-950/80",
    badgeText: "text-sky-800 dark:text-sky-300",
    pillBg: "bg-[#f0f9ff] dark:bg-slate-900",
    pillBorder: "border-[#7dd3fc]/90 dark:border-sky-800/80",
    pillShadow: "shadow-[0_14px_30px_-6px_rgba(2,132,199,0.22)]",
    iconBg: "bg-white dark:bg-slate-800",
    iconBorder: "border-sky-100 dark:border-slate-700",
    iconColor: "text-[#1B4B73] dark:text-sky-400",
    titleColor: "text-[#0c4a6e] dark:text-sky-200",
    textColor: "text-slate-600 dark:text-slate-300",
  },
  ADMIN_NOVEDAD: {
    id: "ADMIN_NOVEDAD",
    icon: Rocket,
    label: "Nueva Función",
    description: "Lanzamiento de nuevas herramientas, mejoras y actualizaciones",
    badgeBg: "bg-purple-100 dark:bg-purple-950/80",
    badgeText: "text-purple-800 dark:text-purple-300",
    pillBg: "bg-[#faf5ff] dark:bg-slate-900",
    pillBorder: "border-[#d8b4fe]/90 dark:border-purple-800/80",
    pillShadow: "shadow-[0_14px_30px_-6px_rgba(147,51,234,0.22)]",
    iconBg: "bg-white dark:bg-slate-800",
    iconBorder: "border-purple-100 dark:border-slate-700",
    iconColor: "text-purple-600 dark:text-purple-400",
    titleColor: "text-[#581c87] dark:text-purple-200",
    textColor: "text-slate-600 dark:text-slate-300",
  },
  ADMIN_TIP: {
    id: "ADMIN_TIP",
    icon: Lightbulb,
    label: "Consejo Operativo",
    description: "Tips de productividad, mejores prácticas y atajos para el personal",
    badgeBg: "bg-emerald-100 dark:bg-emerald-950/80",
    badgeText: "text-emerald-800 dark:text-emerald-300",
    pillBg: "bg-[#f0fdf4] dark:bg-slate-900",
    pillBorder: "border-[#86efac]/90 dark:border-emerald-800/80",
    pillShadow: "shadow-[0_14px_30px_-6px_rgba(22,101,52,0.22)]",
    iconBg: "bg-white dark:bg-slate-800",
    iconBorder: "border-emerald-100 dark:border-slate-700",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    titleColor: "text-[#14532d] dark:text-emerald-200",
    textColor: "text-slate-600 dark:text-slate-300",
  },
  ADMIN_MANTENIMIENTO: {
    id: "ADMIN_MANTENIMIENTO",
    icon: Wrench,
    label: "Mantenimiento",
    description: "Avisos de tareas técnicas preventivas o actualizaciones programadas",
    badgeBg: "bg-amber-100 dark:bg-amber-950/80",
    badgeText: "text-amber-800 dark:text-amber-300",
    pillBg: "bg-[#fffbeb] dark:bg-slate-900",
    pillBorder: "border-[#fde68a]/90 dark:border-amber-800/80",
    pillShadow: "shadow-[0_14px_30px_-6px_rgba(217,119,6,0.22)]",
    iconBg: "bg-white dark:bg-slate-800",
    iconBorder: "border-amber-100 dark:border-slate-700",
    iconColor: "text-amber-600 dark:text-amber-400",
    titleColor: "text-[#78350f] dark:text-amber-200",
    textColor: "text-slate-600 dark:text-slate-300",
  },
  ADMIN_FACTURACION: {
    id: "ADMIN_FACTURACION",
    icon: CreditCard,
    label: "Aviso de Cuenta / Plan",
    description: "Recordatorios de renovación, planes SaaS y facturación",
    badgeBg: "bg-indigo-100 dark:bg-indigo-950/80",
    badgeText: "text-indigo-800 dark:text-indigo-300",
    pillBg: "bg-[#eef2ff] dark:bg-slate-900",
    pillBorder: "border-[#c7d2fe]/90 dark:border-indigo-800/80",
    pillShadow: "shadow-[0_14px_30px_-6px_rgba(79,70,229,0.22)]",
    iconBg: "bg-white dark:bg-slate-800",
    iconBorder: "border-indigo-100 dark:border-slate-700",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    titleColor: "text-[#3730a3] dark:text-indigo-200",
    textColor: "text-slate-600 dark:text-slate-300",
  },
  ADMIN_URGENTE: {
    id: "ADMIN_URGENTE",
    icon: ShieldAlert,
    label: "Alerta Urgente",
    description: "Avisos de máxima prioridad que requieren atención inmediata",
    badgeBg: "bg-rose-100 dark:bg-rose-950/80",
    badgeText: "text-rose-800 dark:text-rose-300",
    pillBg: "bg-[#fff1f2] dark:bg-slate-900",
    pillBorder: "border-[#fecdd3]/90 dark:border-rose-800/80",
    pillShadow: "shadow-[0_14px_30px_-6px_rgba(225,29,72,0.22)]",
    iconBg: "bg-white dark:bg-slate-800",
    iconBorder: "border-rose-100 dark:border-slate-700",
    iconColor: "text-rose-600 dark:text-rose-400",
    titleColor: "text-[#9f1239] dark:text-rose-200",
    textColor: "text-slate-600 dark:text-slate-300",
  },
};

export interface AdminBroadcastToastProps {
  titulo: string;
  mensaje: string;
  tipo?: string;
  link?: string | null;
  onDismiss?: () => void;
  isStaticPreview?: boolean;
}

/**
 * Componente visual de tarjeta / pill toast de comunicado administrativo.
 */
export function AdminBroadcastToastCard({
  titulo,
  mensaje,
  tipo,
  link,
  onDismiss,
  isStaticPreview,
}: AdminBroadcastToastProps) {
  const normTipo = (tipo || "ADMIN_ANUNCIO").toUpperCase();
  const cfg = ADMIN_BROADCAST_TYPES[normTipo] || ADMIN_BROADCAST_TYPES.ADMIN_ANUNCIO;
  const Icon = cfg.icon;

  return (
    <div
      style={{ fontFamily: "'Plus Jakarta Sans', var(--font-sans), sans-serif" }}
      className={`relative flex items-center justify-between gap-3.5 sm:gap-4 rounded-[24px] ${cfg.pillBg} border ${cfg.pillBorder} py-3 px-4 sm:px-4.5 ${cfg.pillShadow} shrink-0 w-full max-w-[460px] select-none transition-all ${
        !isStaticPreview ? "cursor-pointer" : ""
      }`}
      onClick={() => {
        if (!isStaticPreview && link) {
          if (link.startsWith("http")) {
            window.open(link, "_blank");
          } else {
            window.location.assign(link);
          }
        }
      }}
    >
      {/* Icono temático con insignia circular blanca y sombra */}
      <div
        className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full ${cfg.iconBg} flex items-center justify-center shrink-0 shadow-xs border ${cfg.iconBorder}`}
      >
        <Icon className={`h-5 w-5 sm:h-5.5 sm:w-5.5 ${cfg.iconColor} stroke-[2.2]`} />
      </div>

      {/* Contenido: Badge superior, Título en negrita y Mensaje */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className={`text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${cfg.badgeBg} ${cfg.badgeText}`}
          >
            {cfg.label}
          </span>
          {link && (
            <span className="flex items-center gap-0.5 text-[9.5px] font-bold text-sky-600 dark:text-sky-400">
              <ExternalLink className="h-2.5 w-2.5" />
              <span>Ver enlace</span>
            </span>
          )}
        </div>
        <div
          className={`font-black text-[13.5px] sm:text-[14px] ${cfg.titleColor} leading-tight tracking-tight line-clamp-1`}
        >
          {titulo || "Título del comunicado"}
        </div>
        <div
          className={`font-medium text-[11.5px] sm:text-[12px] ${cfg.textColor} mt-0.5 tracking-tight line-clamp-2 leading-snug`}
        >
          {mensaje || "Detalle y descripción del mensaje que llegará a las terminales."}
        </div>
      </div>

      {/* Botón de cierre en píldora o preview */}
      {onDismiss ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="h-7 w-7 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer shrink-0"
          title="Cerrar aviso"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        <div className="h-7 w-7 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-400 shrink-0">
          <X className="h-3.5 w-3.5 opacity-50" />
        </div>
      )}
    </div>
  );
}

/**
 * Dispara una notificación animada tipo píldora flotante para comunicados administrativos.
 */
export function showAdminBroadcastToast(options: {
  titulo: string;
  mensaje: string;
  tipo?: string;
  link?: string | null;
}) {
  if (!options.titulo && !options.mensaje) return;

  toast.custom(
    (t) => (
      <motion.div
        initial={{ opacity: 0, y: -18, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.94 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="shrink-0"
      >
        <AdminBroadcastToastCard
          titulo={options.titulo}
          mensaje={options.mensaje}
          tipo={options.tipo}
          link={options.link}
          onDismiss={() => toast.dismiss(t)}
        />
      </motion.div>
    ),
    {
      duration: 12000,
      position: "top-center",
      unstyled: true,
      closeButton: false,
      style: {
        background: "transparent",
        border: "none",
        boxShadow: "none",
        padding: 0,
        margin: 0,
      },
      className: "!bg-transparent !border-0 !shadow-none !p-0 !m-0 !outline-none !ring-0",
    }
  );
}
