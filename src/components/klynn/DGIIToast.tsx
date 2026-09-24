import { toast } from "sonner";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

/**
 * Muestra el toast oficial de DGII con diseño en verde bosque,
 * círculo blanco con logotipo DGII, textos claros y número de comprobante
 * resaltado en negrita con el color amarillo jabón (#F0B900).
 */
export function showDGIIToast(ncf: string) {
  if (!ncf) return;

  toast.custom(
    () => (
      <motion.div
        initial={{ opacity: 0, y: -14, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        style={{ fontFamily: "'Plus Jakarta Sans', var(--font-sans), sans-serif" }}
        className="relative flex items-center justify-between gap-3.5 sm:gap-4 rounded-[22px] bg-gradient-to-r from-[#174627] via-[#1a4d2c] to-[#154224] border border-[#3ba058]/60 py-2.5 sm:py-2.5 px-4 sm:px-4.5 shadow-[0_14px_32px_-6px_rgba(10,40,20,0.55),0_0_0_1px_rgba(255,255,255,0.06)_inset] shrink-0 min-w-[310px] sm:min-w-[350px] max-w-[420px] select-none"
      >
        {/* Icono izquierdo: Círculo blanco con Logo oficial DGII */}
        <div className="h-10 w-10 sm:h-10.5 sm:w-10.5 rounded-full bg-white flex items-center justify-center shrink-0 shadow-md p-1.5">
          <img
            src="/LOGO DGII.png"
            alt="DGII"
            className="h-full w-full object-contain"
          />
        </div>

        {/* Textos: Título blanco y número de comprobante en amarillo jabón #F0B900 */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="font-extrabold text-[13.5px] sm:text-[14px] text-white leading-tight tracking-tight">
            Comprobante emitido a DGII
          </div>
          <div className="font-medium text-[11.5px] sm:text-[12px] text-emerald-100/90 mt-0.5 tracking-tight">
            Comprobante:{" "}
            <strong className="font-black text-[#F0B900] tracking-wide">
              {ncf}
            </strong>
          </div>
        </div>

        {/* Checkmark verde translúcido con brillo e ícono blanco */}
        <div className="h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-full bg-[#2da84e]/35 border border-[#48c76b]/80 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(52,199,89,0.4)]">
          <Check className="h-4.5 w-4.5 text-white stroke-[3.5]" />
        </div>
      </motion.div>
    ),
    {
      duration: 5500,
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
