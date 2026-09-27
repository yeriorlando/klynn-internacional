import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Globe, ArrowRight, ShieldCheck, Banknote, FileCheck, Phone, Check } from "lucide-react";
import { COUNTRIES, type CountryConfig } from "@/lib/countries";
import { COUNTRY_DEMO_DATA } from "./CountryDemoData";

interface InternationalPresenceGridProps {
  selectedCountryCode: string;
  onSelectCountry: (code: string) => void;
}

export function InternationalPresenceGrid({
  selectedCountryCode,
  onSelectCountry,
}: InternationalPresenceGridProps) {
  return (
    <section id="paises" className="border-y border-border bg-surface-elevated py-20">
      <div className="mx-auto max-w-7xl px-6">
        {/* Cabecera de la sección */}
        <div className="mb-14 mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary mb-3">
            <Globe className="h-3.5 w-3.5" />
            <span>Presencia & Cobertura Internacional</span>
          </div>
          <h2 className="text-balance text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Un solo software. <span className="text-primary">13 países</span> con adaptación fiscal y monetaria nativa.
          </h2>
          <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
            Al registrar tu lavandería o tintorería, Klynn detecta o aplica tu país de forma automática.
            Los impuestos, las monedas, las secuencias de comprobantes y los prefijos de WhatsApp quedan configurados al instante.
          </p>
        </div>

        {/* Rejilla de los 13 países */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {COUNTRIES.map((c, i) => {
            const demo = COUNTRY_DEMO_DATA[c.code] || COUNTRY_DEMO_DATA.DO;
            const isSelected = c.code.toUpperCase() === selectedCountryCode.toUpperCase();

            return (
              <motion.div
                key={c.code}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.35, delay: i * 0.03 }}
                onClick={() => onSelectCountry(c.code)}
                className={`group relative rounded-2xl border p-5 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-white dark:bg-slate-900 border-[#1B4B73] dark:border-sky-500 shadow-md ring-2 ring-[#1B4B73]/20"
                    : "bg-surface border-border/80 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm hover:-translate-y-0.5"
                }`}
              >
                {/* Header de la tarjeta */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-3xl leading-none">{c.flag}</span>
                      <div>
                        <h3 className="font-display font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                          {c.name}
                        </h3>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          {c.code} · {c.phonePrefix}
                        </span>
                      </div>
                    </div>

                    {isSelected ? (
                      <span className="h-6 px-2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0">
                        <Check className="h-3 w-3 stroke-[3]" /> Activo
                      </span>
                    ) : (
                      <span className="h-5 w-5 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors text-[10px]">
                        →
                      </span>
                    )}
                  </div>

                  {/* Especificaciones locales */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Banknote className="h-3.5 w-3.5 text-slate-400" />
                        <span>Moneda:</span>
                      </span>
                      <span className="font-extrabold font-mono text-slate-800 dark:text-slate-200">
                        {c.currency.code} ({c.currency.symbol})
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                        <span>Impuesto:</span>
                      </span>
                      <span className="font-bold text-sky-700 dark:text-sky-300">
                        {c.tax.name} {c.tax.defaultRate}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <FileCheck className="h-3.5 w-3.5 text-slate-400" />
                        <span>Identificación:</span>
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {c.doc.label}
                      </span>
                    </div>
                  </div>

                  {/* Organismo regulador */}
                  <div className="mt-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2 text-[10px] text-slate-500 dark:text-slate-400 font-semibold border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 uppercase tracking-wider block text-[9px]">Regulación:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{demo.regulatoryBody}</span>
                  </div>
                </div>

                {/* Botón de acción */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <Link
                    to="/registro"
                    search={{ country: c.code }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-between w-full py-1.5 px-2.5 rounded-lg text-xs font-bold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                  >
                    <span>Empezar en {c.name.split(" ")[0]}</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Nota al pie de la cuadrícula */}
        <div className="mt-12 rounded-2xl bg-gradient-to-r from-sky-50 via-indigo-50 to-sky-50 dark:from-sky-950/30 dark:via-indigo-950/20 dark:to-sky-950/30 p-6 md:p-8 border border-sky-100 dark:border-sky-900/60 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center md:text-left">
            <h4 className="font-display font-extrabold text-lg text-slate-900 dark:text-white">
              ¿Tu lavandería está en otro país de habla hispana?
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Klynn permite personalizar cualquier moneda, símbolo, tasa de impuesto y formato de ticket térmico desde el panel de configuración de tu negocio.
            </p>
          </div>
          <Link
            to="/registro"
            className="h-11 px-6 rounded-xl bg-[#1B4B73] hover:bg-[#133857] text-white font-extrabold text-xs shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <span>Crear cuenta gratis</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
