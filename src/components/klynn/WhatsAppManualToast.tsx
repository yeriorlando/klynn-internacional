export function WhatsAppToastIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <div 
      className={`klynn-wa-badge h-5.5 w-5.5 rounded-full flex items-center justify-center shrink-0 shadow-xs ${className}`}
      style={{ backgroundColor: "#25D366" }}
    >
      <svg 
        viewBox="0 0 24 24" 
        className="h-3.5 w-3.5 fill-white text-white" 
        style={{ width: "13px", height: "13px", fill: "#ffffff", strokeWidth: 0 }}
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.197 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.05 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    </div>
  );
}

export function WhatsAppLoadingIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <div className="relative flex items-center justify-center shrink-0 w-8 h-8">
      {/* Icono oficial verde de WhatsApp */}
      <div 
        className={`klynn-wa-badge h-5 w-5 rounded-full flex items-center justify-center shrink-0 shadow-xs z-10 ${className}`}
        style={{ backgroundColor: "#25D366" }}
      >
        <svg 
          viewBox="0 0 24 24" 
          className="h-3 w-3 fill-white text-white" 
          style={{ width: "12px", height: "12px", fill: "#ffffff", strokeWidth: 0 }}
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.197 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.05 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </div>
      {/* Anillo exterior animado de carga */}
      <div 
        className="absolute inset-0 rounded-full border-2 border-[#25D366]/20 border-t-[#25D366] animate-spin pointer-events-none" 
        style={{ animationDuration: "0.85s" }}
      />
    </div>
  );
}

export function toastWhatsAppLoading(message: string, options?: any) {
  return toast(message, {
    icon: <WhatsAppLoadingIcon />,
    duration: 120000,
    ...options,
  });
}

export function toastWhatsAppSuccess(message: string, options?: any) {
  return toast.success(message, {
    icon: <WhatsAppToastIcon />,
    ...options,
  });
}

import { toast } from "sonner";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { removerIconosWhatsApp } from "@/lib/whatsapp";

export function WhatsAppOfficialIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.197 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.05 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export interface WhatsAppManualToastOptions {
  title: string; // e.g. "¡Orden creada!" o "¡Orden lista!"
  actionText?: string; // e.g. "Enviar comprobante a" o "Notificar a"
  clienteNombre: string;
  telefono?: string;
  mensaje: string;
}

export function showWhatsAppManualToast({
  title,
  actionText,
  clienteNombre,
  telefono = "",
  mensaje,
}: WhatsAppManualToastOptions) {
  const cleanPhone = (telefono || "").replace(/\D/g, "");
  if (!cleanPhone || cleanPhone.length < 10) {
    return;
  }
  const normalizedPhone = cleanPhone.length === 10 ? `1${cleanPhone}` : cleanPhone;
  // Omitir iconos para evitar que WhatsApp Web los corrompa en caracteres ''
  const mensajeLimpio = removerIconosWhatsApp(mensaje);
  const encoded = encodeURIComponent(mensajeLimpio);
  const waUrl = `https://wa.me/${normalizedPhone}?text=${encoded}`;
  const defaultActionText = title.includes("creada") ? "Enviar comprobante a" : "Notificar a";
  const displayActionText = actionText || defaultActionText;

  toast.custom(
    (t) => (
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.96 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        style={{ fontFamily: "'Plus Jakarta Sans', var(--font-sans), sans-serif" }}
        className="flex items-center gap-3 rounded-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-2 px-3.5 shadow-xl border border-slate-200/90 dark:border-slate-800 shrink-0 whitespace-nowrap tracking-normal"
      >
        {/* Icono oficial de WhatsApp en verde oficial (#25D366) */}
        <div className="h-7.5 w-7.5 rounded-full bg-[#25D366]/15 text-[#25D366] flex items-center justify-center shrink-0">
          <WhatsAppOfficialIcon className="h-4.5 w-4.5 fill-[#25D366]" />
        </div>

        {/* Contenido en una sola línea con fuente Plus Jakarta Sans */}
        <div className="flex items-center gap-1.5 text-xs whitespace-nowrap font-medium">
          <span className="font-extrabold text-slate-900 dark:text-white">{title}</span>
          <span className="text-slate-400 font-normal">•</span>
          <span className="text-slate-600 dark:text-slate-300">
            {displayActionText}{" "}
            <strong className="font-extrabold text-slate-900 dark:text-white">
              {clienteNombre || "Consumidor Final"}
            </strong>
          </span>
        </div>

        {/* Botones de acción con icono oficial de WhatsApp y fuente Plus Jakarta Sans */}
        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          <Button
            size="sm"
            style={{ fontFamily: "'Plus Jakarta Sans', var(--font-sans), sans-serif" }}
            className="bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold rounded-full px-3.5 h-7.5 text-xs shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 border-none"
            onClick={() => {
              toast.dismiss(t);
              window.open(waUrl, "_blank");
            }}
          >
            <WhatsAppOfficialIcon className="h-3.5 w-3.5 fill-white" />
            <span>Enviar WhatsApp</span>
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
      duration: 10000,
      unstyled: true,
    }
  );
}
