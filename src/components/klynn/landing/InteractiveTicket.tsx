import { useMemo } from "react";
import { motion } from "framer-motion";
import { QrCode } from "lucide-react";
import { type CountryDemoData } from "./CountryDemoData";

interface InteractiveTicketProps {
  data: CountryDemoData;
}

export function InteractiveTicket({ data }: InteractiveTicketProps) {
  const subtotal = useMemo(() => {
    return data.items.reduce((sum, item) => sum + item.price, 0);
  }, [data]);

  const taxAmount = useMemo(() => {
    return subtotal * (data.taxRate / 100);
  }, [subtotal, data.taxRate]);

  const total = useMemo(() => {
    return subtotal + taxAmount;
  }, [subtotal, taxAmount]);

  const formatPrice = (val: number) => {
    return val.toLocaleString("es-ES", {
      minimumFractionDigits: data.currencyDecimals,
      maximumFractionDigits: data.currencyDecimals,
    });
  };

  return (
    <div className="relative mx-auto flex flex-col items-center">
      {/* Tarjeta del Ticket Físico Simulado */}
      <motion.div
        layout
        className="relative rounded-2xl bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-800 shadow-[0_16px_36px_-8px_rgba(27,75,115,0.18)] transition-all duration-300 font-mono text-xs select-none w-full max-w-[310px]"
      >
        {/* Cabezal de la impresora térmica (simulación) */}
        <div className="h-2 w-full bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-t-2xl" />

        <div className="p-4 sm:p-5 space-y-2.5">
          {/* Badge del país activo */}
          <div className="flex items-center justify-between gap-2 border-b border-dashed border-slate-200 dark:border-slate-800 pb-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 font-sans text-[11px] font-bold border border-sky-200/70 dark:border-sky-800/60">
              <img
                src={`https://flagcdn.com/w80/${data.code.toLowerCase()}.png`}
                alt={`Bandera de ${data.name}`}
                width={16}
                height={11}
                className="w-4 h-2.5 object-cover rounded-xs shrink-0 shadow-2xs border border-black/10"
                loading="lazy"
              />
              <span className="truncate max-w-[130px]">{data.name}</span>
            </span>
            <span className="font-sans text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              EMISIÓN LOCAL
            </span>
          </div>

          {/* Encabezado del negocio */}
          <div className="text-center space-y-0.5">
            <h4 className="font-sans text-sm font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">
              {data.laundryName}
            </h4>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
              {data.code === "DO" ? `${data.docLabel}: ${data.docSample}` : `Sucursal Centro · Tel: ${data.phoneSample}`}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {data.addressSample}
            </p>
          </div>

          <div className="border-t border-dashed border-slate-200 dark:border-slate-800" />

          {/* Metadatos de la orden */}
          <div className="space-y-0.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">ORDEN:</span>
              <span className="font-bold">#KL-2026-0428</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{data.code === "DO" ? "FISCAL (e-CF):" : "COMPROBANTE:"}</span>
              <span className="font-bold text-sky-700 dark:text-sky-300">
                {data.code === "DO" ? data.fiscalType : "#REC-00428"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">FECHA:</span>
              <span>{new Date().toLocaleDateString("es-ES")} 10:45 AM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">CLIENTE:</span>
              <span className="font-bold truncate max-w-[150px]">Carlos Mendoza</span>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-200 dark:border-slate-800" />

          {/* Items de la orden */}
          <div className="space-y-1.5">
            {data.items.slice(0, 3).map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between items-baseline font-bold text-[11px]">
                  <span className="truncate pr-2">{item.name}</span>
                  <span className="shrink-0">
                    {data.currencySymbol} {formatPrice(item.price)}
                  </span>
                </div>
                {item.detail && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-sans italic">
                    {item.detail}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="border-t-2 border-slate-800 dark:border-slate-200" />

          {/* Totales y desglose de impuesto */}
          <div className="space-y-0.5 text-[11px]">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>SUBTOTAL</span>
              <span>
                {data.currencySymbol} {formatPrice(subtotal)}
              </span>
            </div>
            <div className="flex justify-between font-bold text-sky-800 dark:text-sky-300">
              <span>
                {data.taxName} ({data.taxRate}%)
              </span>
              <span>
                {data.currencySymbol} {formatPrice(taxAmount)}
              </span>
            </div>
            <div className="flex justify-between items-baseline text-sm font-black pt-1 border-t border-dashed border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
              <span>TOTAL</span>
              <span className="text-base text-primary">
                {data.currencySymbol} {formatPrice(total)} {data.currencyCode}
              </span>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-200 dark:border-slate-800" />

          {/* Pie de ticket y simulación de código de barras / QR */}
          <div className="pt-0.5 text-center space-y-1.5">
            <div className="flex items-center justify-center gap-3">
              <div className="p-1 rounded bg-slate-100 dark:bg-slate-800 shrink-0">
                <QrCode className="h-8 w-8 text-slate-800 dark:text-slate-200" />
              </div>
              <div className="text-left text-[9px] text-slate-400 dark:text-slate-500 space-y-0.5">
                <p className="font-bold text-slate-700 dark:text-slate-300">ESC/POS 57/80mm</p>
                <p>{data.code === "DO" ? "Facturación Fiscal DGII" : "Ticket de Venta Mostrador"}</p>
                <p className="text-emerald-600 font-bold">{data.code === "DO" ? "DGII e-CF Listo" : "Klynn Cloud POS"}</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-sans font-semibold">
              ¡Gracias por confiar en {data.laundryName}! 🧺
            </p>
          </div>
        </div>

        {/* Borde dentado de corte de papel térmico (CSS Zig-zag SVG) */}
        <div
          className="h-2.5 w-full bg-slate-200/40 dark:bg-slate-800/40"
          style={{
            clipPath:
              "polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)",
          }}
        />
      </motion.div>
    </div>
  );
}
