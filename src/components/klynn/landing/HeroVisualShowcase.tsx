import { motion } from "framer-motion";
import {
  Home,
  Receipt,
  Users,
  FileText,
  Package,
  BarChart3,
  Settings,
  MessageCircle,
  QrCode,
} from "lucide-react";

const SHOWCASE_COUNTRIES = [
  { code: "do", name: "Rep. Dominicana" },
  { code: "mx", name: "México" },
  { code: "co", name: "Colombia" },
  { code: "pa", name: "Panamá" },
  { code: "cr", name: "Costa Rica" },
  { code: "pe", name: "Perú" },
  { code: "cl", name: "Chile" },
  { code: "ec", name: "Ecuador" },
  { code: "es", name: "España" },
  { code: "gt", name: "Guatemala" },
  { code: "hn", name: "Honduras" },
  { code: "sv", name: "El Salvador" },
  { code: "uy", name: "Uruguay" },
];

export function HeroVisualShowcase() {
  return (
    <div className="relative w-full max-w-[560px] lg:max-w-[600px] min-h-[480px] sm:min-h-[520px] flex items-center justify-center select-none mx-auto py-0">
      {/* ─── FONDOS AMBIENTALES Y RESPLANDOR ─── */}
      <div className="absolute top-1/4 right-8 w-72 h-72 bg-amber-300/20 dark:bg-amber-400/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-6 left-6 w-60 h-60 bg-sky-300/20 dark:bg-sky-500/10 rounded-full blur-2xl pointer-events-none -z-10" />

      {/* ─── CAPA 1: TABLET SOFTWARE KLYNN (DETRÁS A LA IZQUIERDA) ─── */}
      <motion.div
        initial={{ opacity: 0, x: -20, rotate: -4 }}
        animate={{ opacity: 1, x: 0, rotate: -3 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="absolute left-0 sm:left-4 top-4 sm:top-6 w-[230px] sm:w-[260px] h-[360px] sm:h-[400px] rounded-2xl bg-white dark:bg-slate-900 border-[3px] border-slate-700/85 dark:border-slate-600 shadow-2xl p-3 sm:p-4 flex flex-col z-0 -rotate-3 transform pointer-events-none"
      >
        {/* Barra superior de la tablet */}
        <div className="flex items-center pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <img
            src="/Logo klynn.webp"
            alt="Klynn"
            className="h-6 sm:h-7 w-auto object-contain shrink-0 dark:brightness-0 dark:invert"
          />
        </div>

        {/* Menú de la aplicación */}
        <div className="mt-2.5 space-y-1 text-[11px] font-semibold">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-sky-100/70 dark:bg-sky-950/70 text-[#1B4B73] dark:text-sky-300 font-bold">
            <Home className="h-3.5 w-3.5 shrink-0" />
            <span>Inicio</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-500 dark:text-slate-400">
            <Receipt className="h-3.5 w-3.5 shrink-0" />
            <span>Órdenes</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-500 dark:text-slate-400">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>Clientes</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-500 dark:text-slate-400">
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span>Facturación</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-500 dark:text-slate-400">
            <Package className="h-3.5 w-3.5 shrink-0" />
            <span>Productos</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-500 dark:text-slate-400">
            <BarChart3 className="h-3.5 w-3.5 shrink-0" />
            <span>Reportes</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-500 dark:text-slate-400">
            <Settings className="h-3.5 w-3.5 shrink-0" />
            <span>Configuración</span>
          </div>
        </div>
      </motion.div>

      {/* ─── CAPA 2: TICKET TÉRMICO REALISTA (CENTRO) ─── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative z-10 w-[265px] sm:w-[285px] rounded-2xl bg-white text-slate-800 border border-slate-200/90 shadow-[0_20px_48px_-12px_rgba(27,75,115,0.25)] font-mono text-xs select-none"
      >
        {/* Cabecera del ticket */}
        <div className="p-4 pb-2.5 text-center">
          <div className="w-10 h-10 mx-auto mb-1.5 rounded-full border-2 border-[#133857] bg-white flex items-center justify-center shadow-xs">
            <span className="text-lg">🧺</span>
          </div>
          <h4 className="font-sans text-sm font-extrabold text-slate-900 tracking-tight uppercase">
            Lavandería Express
          </h4>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Ticket de Venta · Mostrador
          </p>
          <p className="text-[9px] text-slate-400">
            Soporte WhatsApp: +1 (849) 918-2727
          </p>
        </div>

        <div className="border-t border-dashed border-slate-300 mx-3" />

        {/* Metadatos de la orden */}
        <div className="px-4 py-2 space-y-0.5 text-[10px]">
          <div className="flex justify-between">
            <span className="text-slate-500">ORDEN:</span>
            <span className="font-bold text-slate-800">KL-2026-0042</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">RECIBO:</span>
            <span className="font-bold text-[#1B4B73]">#0042-2026</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Fecha:</span>
            <span>02/05/2026 · 10:30 AM</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Cliente:</span>
            <span className="font-bold truncate max-w-[130px]">Juan Pérez (809-555-0142)</span>
          </div>
        </div>

        <div className="border-t border-dashed border-slate-300 mx-3" />

        {/* Prendas / Items */}
        <div className="px-4 py-2 space-y-1 text-[10px]">
          <div className="flex justify-between font-bold">
            <span>Camisa M/L x2</span>
            <span>$ 300.00</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Pantalón vestir x1</span>
            <span>$ 200.00</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Lavado por kilo / libra</span>
            <span>$ 280.00</span>
          </div>
        </div>

        <div className="border-t border-dashed border-slate-300 mx-3" />

        {/* Totales */}
        <div className="px-4 py-2 space-y-0.5 text-[10px]">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span>$ 780.00</span>
          </div>
          <div className="flex justify-between text-slate-600 font-semibold">
            <span>Impuesto (ITBIS / IVA / IGV)</span>
            <span>$ 140.40</span>
          </div>
          <div className="flex justify-between text-xs font-black pt-1 border-t border-dashed border-slate-300 text-slate-900 mt-0.5">
            <span>TOTAL</span>
            <span className="text-sm font-black text-[#1B4B73]">$ 920.40</span>
          </div>
        </div>

        <div className="border-t border-dashed border-slate-300 mx-3" />

        {/* Pie de ticket */}
        <div className="px-4 py-2 text-center text-[9px] text-slate-500 space-y-1">
          <div>Gancho asignado: <strong>G-24 (Conveyor A)</strong></div>
          <div className="text-emerald-700 font-medium">¡Aviso automático enviado por WhatsApp! 📲</div>
          <div className="font-sans pt-0.5">¡Gracias por su preferencia! 🧺</div>
        </div>

        {/* Corte dentado inferior en zig-zag */}
        <div
          className="h-2.5 w-full bg-slate-200/60 rounded-b-2xl"
          style={{
            clipPath:
              "polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)",
          }}
        />
      </motion.div>

      {/* ─── CAPA 3: PILA DE TOALLAS LIMPIAS (BASE IZQUIERDA) ─── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="absolute -bottom-3 left-2 sm:left-6 z-20 hidden xs:flex flex-col items-center drop-shadow-md pointer-events-none"
      >
        {/* Toalla celeste superior */}
        <div className="w-28 sm:w-32 h-5.5 sm:h-6 rounded-lg bg-gradient-to-r from-sky-300 via-sky-200 to-sky-300 border border-sky-300/80 shadow-xs" />
        {/* Toalla blanca central */}
        <div className="w-32 sm:w-36 h-5.5 sm:h-6 -mt-1.5 rounded-lg bg-gradient-to-r from-slate-200 via-white to-slate-200 border border-slate-200 shadow-xs" />
        {/* Toalla beige inferior */}
        <div className="w-36 sm:w-40 h-6 sm:h-7 -mt-1.5 rounded-lg bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 border border-amber-200 shadow-sm" />
      </motion.div>

      {/* ─── CAPA 4: FLECHA DIBUJADA A MANO (ARRIBA DERECHA) ─── */}
      <div className="absolute top-1 sm:top-2 right-[128px] sm:right-[150px] z-20 pointer-events-none hidden sm:block">
        <svg width="42" height="38" viewBox="0 0 42 38" fill="none" className="text-slate-800 dark:text-slate-200">
          <path
            d="M6 32 C12 16, 22 8, 36 10"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeDasharray="4 3"
          />
          <path
            d="M32 4 L38 10 L30 14"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* ─── CAPA 5: TARJETA FLOTANTE "DISPONIBLE EN:" (SUPERIOR DERECHA) ─── */}
      <motion.div
        initial={{ opacity: 0, x: 20, y: -10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="absolute -top-1 sm:top-1 -right-1 sm:right-1 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xl p-3 sm:p-3.5 w-[138px] sm:w-[150px]"
      >
        <div className="flex items-center justify-between gap-1 mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            Disponible en:
          </span>
          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-[#1B4B73] dark:text-sky-300">
            13
          </span>
        </div>
        <div className="space-y-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 max-h-[280px] sm:max-h-[320px] overflow-y-auto pr-0.5 scrollbar-thin">
          {SHOWCASE_COUNTRIES.map((country) => (
            <div key={country.code} className="flex items-center gap-2">
              <img
                src={`https://flagcdn.com/w80/${country.code}.png`}
                alt={country.name}
                className="w-4 h-4 rounded-full object-cover shrink-0 shadow-2xs border border-black/10"
                loading="lazy"
              />
              <span className="text-[11px] sm:text-[11.5px] truncate font-medium text-slate-800 dark:text-slate-200">
                {country.name}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ─── CAPA 6: BADGE FLOTANTE DE WHATSAPP (INFERIOR DERECHA) ─── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="absolute -bottom-3 sm:-bottom-2 -right-1 sm:right-0 z-20 bg-white dark:bg-slate-900 border-2 border-emerald-400 dark:border-emerald-500 rounded-2xl shadow-xl px-3.5 py-2.5 flex items-center gap-2.5 max-w-[210px] transform hover:scale-105 transition-transform"
      >
        {/* Rayos de destello dorados */}
        <div className="absolute -top-3.5 -right-1.5 text-amber-400 font-bold text-sm pointer-events-none select-none">
          ✨
        </div>
        <div className="h-8 w-8 rounded-full bg-[#25D366] flex items-center justify-center shrink-0 shadow-sm text-white">
          <MessageCircle className="h-4 w-4 fill-white" />
        </div>
        <div className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 leading-tight">
          Notificación automática por WhatsApp
        </div>
      </motion.div>
    </div>
  );
}
