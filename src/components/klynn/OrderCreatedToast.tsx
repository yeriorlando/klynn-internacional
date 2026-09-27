import { toast } from "sonner";
import { motion } from "framer-motion";
import { Check, Receipt, Banknote } from "lucide-react";

export interface OrderCreatedToastOptions {
  numero: string;
  clienteNombre?: string;
}

export interface OrderPaidToastOptions {
  numero: string;
  monto: number;
  isSaldada: boolean;
  clienteNombre?: string;
  currencySymbol?: string;
}

/**
 * Muestra una notificación centrada y animada con el estilo suave y elegante
 * de Klynn para confirmar la creación exitosa de una orden.
 */
export function showOrderCreatedToast({ numero, clienteNombre }: OrderCreatedToastOptions) {
  if (!numero) return;

  toast.custom(
    (t) => (
      <motion.div
        initial={{ opacity: 0, y: -14, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onClick={() => toast.dismiss(t)}
        style={{ fontFamily: "'Plus Jakarta Sans', var(--font-sans), sans-serif" }}
        className="relative flex items-center justify-between gap-3.5 sm:gap-4 rounded-[22px] bg-[#f0fdf4] dark:bg-slate-900 border border-[#86efac]/90 dark:border-emerald-800/80 py-2.5 sm:py-2.5 px-4 sm:px-4.5 shadow-[0_14px_30px_-6px_rgba(22,101,52,0.18)] shrink-0 min-w-[310px] sm:min-w-[350px] max-w-[420px] select-none cursor-pointer"
      >
        {/* Icono izquierdo: Círculo blanco con icono de recibo/orden */}
        <div className="h-10 w-10 sm:h-10.5 sm:w-10.5 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-xs border border-emerald-100/80 dark:border-slate-700">
          <Receipt className="h-5 w-5 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
        </div>

        {/* Textos: Título en verde oscuro y número de orden con azul Klynn */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="font-extrabold text-[13.5px] sm:text-[14px] text-[#14532d] dark:text-white leading-tight tracking-tight">
            ¡Orden creada con éxito!
          </div>
          <div className="font-medium text-[11.5px] sm:text-[12px] text-slate-600 dark:text-slate-300 mt-0.5 tracking-tight truncate">
            Orden:{" "}
            <strong className="font-extrabold text-[#1B4B73] dark:text-[#38bdf8] tracking-wide">
              {numero}
            </strong>
            {clienteNombre && clienteNombre !== "Consumidor Final" && (
              <span className="text-slate-500 font-normal"> · {clienteNombre}</span>
            )}
          </div>
        </div>

        {/* Checkmark circular verde suave */}
        <div className="h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-full bg-emerald-100/90 dark:bg-emerald-950/60 border border-emerald-300/80 dark:border-emerald-700/60 flex items-center justify-center shrink-0 shadow-2xs">
          <Check className="h-4.5 w-4.5 text-emerald-700 dark:text-emerald-400 stroke-[3]" />
        </div>
      </motion.div>
    ),
    {
      duration: 2500,
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

/**
 * Muestra una notificación centrada y animada con el estilo suave y elegante
 * de Klynn para confirmar el cobro o abono exitoso de una orden.
 */
export function showOrderPaidToast({
  numero,
  monto,
  isSaldada,
  clienteNombre,
  currencySymbol = "RD$",
}: OrderPaidToastOptions) {
  if (!numero) return;

  const montoFormatted = `${currencySymbol}${Number(monto || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  toast.custom(
    (t) => (
      <motion.div
        initial={{ opacity: 0, y: -14, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onClick={() => toast.dismiss(t)}
        style={{ fontFamily: "'Plus Jakarta Sans', var(--font-sans), sans-serif" }}
        className="relative flex items-center justify-between gap-3.5 sm:gap-4 rounded-[22px] bg-[#f0fdf4] dark:bg-slate-900 border border-[#86efac]/90 dark:border-emerald-800/80 py-2.5 sm:py-2.5 px-4 sm:px-4.5 shadow-[0_14px_30px_-6px_rgba(22,101,52,0.18)] shrink-0 min-w-[310px] sm:min-w-[360px] max-w-[450px] select-none cursor-pointer"
      >
        {/* Icono izquierdo: Círculo blanco con icono de cobro/billete */}
        <div className="h-10 w-10 sm:h-10.5 sm:w-10.5 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-xs border border-emerald-100/80 dark:border-slate-700">
          <Banknote className="h-5 w-5 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
        </div>

        {/* Textos: Título en verde oscuro y número de orden + monto */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="font-extrabold text-[13.5px] sm:text-[14px] text-[#14532d] dark:text-white leading-tight tracking-tight">
            {isSaldada ? "¡Orden saldada con éxito!" : "¡Abono registrado con éxito!"}
          </div>
          <div className="font-medium text-[11.5px] sm:text-[12px] text-slate-600 dark:text-slate-300 mt-0.5 tracking-tight truncate">
            Orden:{" "}
            <strong className="font-extrabold text-[#1B4B73] dark:text-[#38bdf8] tracking-wide">
              {numero}
            </strong>
            <span className="font-bold text-emerald-700 dark:text-emerald-400 ml-1">
              · {montoFormatted}
            </span>
            {clienteNombre && clienteNombre !== "Consumidor Final" && (
              <span className="text-slate-500 font-normal"> · {clienteNombre}</span>
            )}
          </div>
        </div>

        {/* Checkmark circular verde suave */}
        <div className="h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-full bg-emerald-100/90 dark:bg-emerald-950/60 border border-emerald-300/80 dark:border-emerald-700/60 flex items-center justify-center shrink-0 shadow-2xs">
          <Check className="h-4.5 w-4.5 text-emerald-700 dark:text-emerald-400 stroke-[3]" />
        </div>
      </motion.div>
    ),
    {
      duration: 2500,
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
