import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useCallback, useEffect } from "react";
import { 
  ArrowRight, Sparkles, Receipt, Wallet, Users, Truck, 
  BarChart3, Printer, Check, Smartphone, MapPin, Star,
  ShieldCheck, CheckCircle2, MessageSquare, Layers, Clock,
  HelpCircle, Phone, ArrowUpRight, Calculator, FileText, Banknote, Cloud, Lock, QrCode, Building2,
  Scissors, Package, Droplets, CreditCard, Globe, WifiOff, Headphones, Shield
} from "lucide-react";
import { LandingNavbar } from "@/components/klynn/LandingNavbar";
import { Logo } from "@/components/klynn/Logo";
import { Button } from "@/components/ui/button";
import { COUNTRIES } from "@/lib/countries";
import { DEFAULT_COUNTRY_PLANS, formatCurrencyByCountry, type Plan } from "@/lib/storage";

const WHATSAPP_LINK = "https://wa.link/vxstq4";

export interface CountryTicketItem {
  name: string;
  detail?: string;
  price: number;
}

export interface CountryTicketData {
  businessName: string;
  docLabel: string;
  docValue: string;
  phone: string;
  address: string;
  orderNumber: string;
  fiscalNumber: string;
  dateStr: string;
  clientName: string;
  items: CountryTicketItem[];
}

export interface CountryChallenge {
  title: string;
  description: string;
  icon: any;
  badge: string;
}

export interface CountryFAQItem {
  question: string;
  answer: string;
}

export interface CountryLandingProps {
  countryCode: "MX" | "PE" | "CO" | string;
  countryName: string;
  countryFlag: string;
  currencySymbol: string;
  currencyCode: string;
  currencyDecimals: number;
  taxName: string;
  taxRate: number;
  regulatoryBody: string;
  docLabel: string;
  heroHeadline: string;
  heroHighlight: string;
  heroSubtitle: string;
  regionsLabel: string;
  regions: string[];
  ticketData: CountryTicketData;
  challenges: CountryChallenge[];
  testimonial: {
    name: string;
    role: string;
    business: string;
    location: string;
    text: string;
    rating: number;
  };
  faqs: CountryFAQItem[];
}

function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const hasRun = useRef(false);

  const runCount = useCallback(() => {
    const el = ref.current;
    if (!el || hasRun.current) return;
    hasRun.current = true;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || to === 0) {
      el.textContent = to.toLocaleString("en-US");
      return;
    }

    const dur = 1200;
    const start = performance.now();
    function tick(now: number) {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el!.textContent = Math.round(to * eased).toLocaleString("en-US");
      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        el!.textContent = to.toLocaleString("en-US");
        el!.animate?.(
          [{ transform: "scale(1)" }, { transform: "scale(1.07)" }, { transform: "scale(1)" }],
          { duration: 320, easing: "ease-out" },
        );
      }
    }
    requestAnimationFrame(tick);
  }, [to]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) { runCount(); return; }
    const io = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) { runCount(); io.unobserve(e.target); } }); },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [runCount]);

  return <span ref={ref}>0</span>;
}

const features = [
  { icon: Receipt, title: "Órdenes y facturación", desc: "Flujo ágil con prendas, peso y cobro mixto. Configurable con impuestos de tu país (IVA, ITBIS, IGV, ITBMS)." },
  { icon: Printer, title: "Tickets térmicos 57/80mm", desc: "Impresión ESC/POS compatible con Epson, Xprinter, Bixolon y Star. Logo y pie de página personalizados." },
  { icon: Wallet, title: "Caja y cuadre diario", desc: "Apertura, movimientos en vivo, gastos de caja chica, cobros por efectivo, tarjeta y transferencias locales. Cierre con firma." },
  { icon: Users, title: "CRM y fidelización", desc: "Historial por cliente, deudas, abonos, clientes VIP y crédito autorizado. Avisos automáticos por WhatsApp." },
  { icon: Truck, title: "Entregas a domicilio", desc: "Asigna repartidores, rutas por sector o comuna y notifica al cliente con enlaces de seguimiento al salir y al llegar." },
  { icon: BarChart3, title: "Reportes contables y de ventas", desc: "Resumen detallado de ingresos, cobros e impuestos exportable en CSV y XLSX listo para tu contador." },
  { icon: Scissors, title: "Módulo de sastrería", desc: "Ajustes, ruedos, cierres y composturas con medidas y fecha de entrega coordinada con el lavado." },
  { icon: Package, title: "Lavado por peso y prendas", desc: "Cobra por peso (kg o lb) o por prenda individual. Combina ambos en la misma orden con cargos de planchado o urgencia." },
  { icon: Smartphone, title: "WhatsApp integrado", desc: "Envía recibos digitales, recordatorios de retiro y promociones desde el sistema directo al móvil del cliente." },
  { icon: Layers, title: "Estantería y ganchos", desc: "Mapea casilleros, rieles y percheros. Ubica cualquier prenda y entrega en 5 segundos sin confusiones." },
  { icon: WifiOff, title: "Modo Offline & Contingencia", desc: "Sigue facturando, cobrando e imprimiendo tickets térmicos aunque no haya internet. Sincronización automática." },
  { icon: Globe, title: "Adaptación fiscal y de moneda", desc: "Moneda local, prefijos telefónicos e impuestos configurados exactamente para operar sin trabas." },
];

export function CountryLanding({
  countryCode,
  countryName,
  countryFlag,
  currencySymbol,
  currencyCode,
  currencyDecimals,
  taxName,
  taxRate,
  regulatoryBody,
  docLabel,
  heroHeadline,
  heroHighlight,
  heroSubtitle,
  regionsLabel,
  regions,
  ticketData,
  challenges,
  testimonial,
  faqs,
}: CountryLandingProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [activeWaTab, setActiveWaTab] = useState<"lista" | "recibo">("lista");

  const plans: Plan[] = DEFAULT_COUNTRY_PLANS[countryCode.toUpperCase()] || DEFAULT_COUNTRY_PLANS["DO"] || [];

  const formatPrice = (val: number) => {
    return val.toLocaleString("es-ES", {
      minimumFractionDigits: currencyDecimals,
      maximumFractionDigits: currencyDecimals,
    });
  };

  const subtotal = ticketData.items.reduce((acc, it) => acc + it.price, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-[#F0B900] selection:text-slate-950">
      <LandingNavbar />

      {/* ─── 1. HERO SECTION (RÉPLICA EXACTA DE LA LANDING OFICIAL) ─── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky-50/60 via-white to-sky-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 border-b border-border/60 pt-4 sm:pt-6 md:pt-8 pb-10 md:pb-14">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-center">
            {/* Columna Izquierda: Lead */}
            <div className="flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-slate-900/95 border border-sky-200/80 dark:border-sky-800/80 shadow-[0_4px_14px_-2px_rgba(27,75,115,0.12)] backdrop-blur-md mb-3.5 select-none self-start transition-all hover:border-sky-300 hover:shadow-md">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-gradient-to-tr from-[#1B4B73] via-[#0284c7] to-[#38bdf8] text-white shadow-xs">
                  <Cloud className="h-3.5 w-3.5 fill-white/20 stroke-[2.2]" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                  {countryFlag} Plataforma en la nube · {countryName}
                </span>
                <span className="h-3.5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  100% Online
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-[38px] xl:text-[40px] font-black tracking-tight text-slate-900 dark:text-white leading-[1.14]">
                El software #1 para{" "}
                <span className="relative inline-block text-[#1B4B73] dark:text-sky-400">
                  lavanderías
                  <svg
                    className="absolute -bottom-1 sm:-bottom-1.5 left-0 w-full h-3 sm:h-3.5 text-[#F0B900] pointer-events-none"
                    viewBox="0 0 200 12"
                    fill="none"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M3 8.5C40 2 120 2 197 7.5"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>{" "}
                en {countryName}.
              </h1>

              <p className="mt-3.5 sm:mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                {heroSubtitle}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3.5">
                <Link
                  to="/registro"
                  search={{ country: countryCode }}
                  className="btn btn--anil font-bold text-white shadow-md hover:shadow-lg"
                >
                  Comenzar prueba de 14 días <span className="btn__arrow">→</span>
                </Link>
                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--yellow font-bold text-slate-900 shadow-md hover:shadow-lg"
                >
                  Solicitar demostración
                </a>
              </div>

              {/* Badges de confianza en una sola línea */}
              <div className="mt-6 flex items-center gap-2 flex-nowrap overflow-x-auto pt-4 border-t border-slate-200/60 dark:border-slate-800">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-[0_2px_6px_-2px_rgba(15,23,42,0.06)] whitespace-nowrap shrink-0 transition-all hover:-translate-y-0.5 hover:shadow-xs">
                  <div className="h-5 w-5 rounded-full bg-sky-100/90 dark:bg-sky-950/80 text-[#1B4B73] dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-200/80 dark:border-sky-900 shadow-3xs">
                    <CreditCard className="h-2.5 w-2.5 stroke-[2.2]" />
                  </div>
                  <span className="text-[11.5px] font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                    Sin tarjeta de crédito
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-[0_2px_6px_-2px_rgba(15,23,42,0.06)] whitespace-nowrap shrink-0 transition-all hover:-translate-y-0.5 hover:shadow-xs">
                  <div className="h-5 w-5 rounded-full bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/80 dark:border-emerald-900 shadow-3xs">
                    <Globe className="h-2.5 w-2.5 stroke-[2.4]" />
                  </div>
                  <span className="text-[11.5px] font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                    {countryName} ({currencyCode})
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-[0_2px_6px_-2px_rgba(15,23,42,0.06)] whitespace-nowrap shrink-0 transition-all hover:-translate-y-0.5 hover:shadow-xs">
                  <div className="h-5 w-5 rounded-full bg-sky-100/90 dark:bg-sky-950/80 text-[#1B4B73] dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-200/80 dark:border-sky-900 shadow-3xs">
                    <Cloud className="h-2.5 w-2.5 stroke-[2.2]" />
                  </div>
                  <span className="text-[11.5px] font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                    Datos en la nube
                  </span>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Mockup Visual con landing.webp (1:1 de la Landing Oficial) */}
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex items-center justify-center relative w-full"
            >
              <div className="absolute top-1/4 right-0 w-72 h-72 bg-amber-300/20 dark:bg-amber-400/10 rounded-full blur-3xl pointer-events-none -z-10" />
              <div className="absolute bottom-2 left-0 w-64 h-64 bg-sky-300/20 dark:bg-sky-500/10 rounded-full blur-2xl pointer-events-none -z-10" />

              <div className="relative w-full flex items-center justify-center">
                <img
                  src="/landing.webp"
                  alt={`Klynn — Software de Gestión Operativa para Lavanderías en ${countryName}`}
                  className="w-full h-auto object-contain max-h-[440px] drop-shadow-xl hover:scale-[1.01] transition-transform duration-300 select-none"
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── 2. REJILLA DE LOS 13 PAÍSES CON EL PAÍS SELECCIONADO DESTACADO ─── */}
      <section className="border-y border-border bg-slate-50/80 dark:bg-slate-900/60 py-10 md:py-12" id="paises">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-primary mb-2">
                <Globe className="h-4 w-4" />
                <span>Disponibilidad Regional</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Disponible en 13 países para tu lavandería
              </h2>
              <p className="mt-1.5 text-sm sm:text-base text-muted-foreground max-w-2xl">
                Klynn está listo para operar en lavanderías y tintorerías de {countryName} y toda la región.
              </p>
            </div>
            <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3.5 py-1.5 rounded-full shrink-0">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Activo en {countryName}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {COUNTRIES.map((c) => {
              const isCurrent = c.code.toUpperCase() === countryCode.toUpperCase();
              return (
                <div
                  key={c.code}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-200 text-center min-h-[110px] ${
                    isCurrent
                      ? "border-[#1B4B73] dark:border-sky-500 bg-white dark:bg-slate-900 shadow-md ring-2 ring-[#1B4B73]/20"
                      : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5"
                  }`}
                >
                  <img
                    src={`https://flagcdn.com/w80/${c.code.toLowerCase()}.png`}
                    alt={`Bandera de ${c.name}`}
                    width={56}
                    height={38}
                    className="w-14 h-9.5 object-cover rounded-md shadow-sm border border-slate-200/80 dark:border-slate-700 mb-2.5 shrink-0"
                    loading="lazy"
                  />
                  <span className={`font-bold text-xs sm:text-sm leading-snug ${isCurrent ? "text-primary" : "text-slate-900 dark:text-white"}`}>
                    {c.name}
                  </span>
                  {isCurrent && (
                    <span className="mt-1 text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                      ● Aquí estás
                    </span>
                  )}
                </div>
              );
            })}

            {/* Tarjeta 14: Expansión */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 text-center min-h-[110px]">
              <div className="w-14 h-9.5 rounded-md bg-muted/80 flex items-center justify-center text-xl shadow-2xs border border-dashed border-slate-300 dark:border-slate-700 mb-2.5 shrink-0">
                🌎
              </div>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-xs sm:text-sm text-primary hover:underline leading-snug"
              >
                ¿Tu país no está?
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. EL IMPACTO EN TU LAVANDERÍA (BIGNUMS) ─── */}
      <section className="border-y border-border bg-surface-elevated py-16 md:py-20" id="impacto">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <p className="eyebrow justify-center">
              <span className="eyebrow__dot" style={{ background: "#22c55e" }}></span> EL IMPACTO EN TU LAVANDERÍA EN {countryName.toUpperCase()}
            </p>
            <h2 className="section__title text-balance" style={{ margin: "0 auto", maxWidth: "42ch" }}>
              Más rapidez en mostrador. Control total de tus ingresos.
            </h2>
          </div>
          <dl className="numbers">
            <div className="bignum">
              <dd className="bignum__v">
                <span className="bignum__pre">≈</span>
                <CountUp to={20} />
                <span className="bignum__u">seg</span>
              </dd>
              <dt className="bignum__k">Tiempo promedio para registrar una orden e imprimir ticket térmico.</dt>
            </div>
            <div className="bignum">
              <dd className="bignum__v">
                <CountUp to={100} />
                <span className="bignum__u">%</span>
              </dd>
              <dt className="bignum__k">Adaptado con {taxName} ({taxRate}%) y {docLabel} según {regulatoryBody}.</dt>
            </div>
            <div className="bignum">
              <dd className="bignum__v">
                <CountUp to={0} />
              </dd>
              <dt className="bignum__k">Prendas extraviadas gracias a la estantería y control de ganchos.</dt>
            </div>
          </dl>
        </div>
      </section>

      {/* ─── 4. PROBLEMA / SOLUCIÓN ─── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">¿Por qué Klynn?</div>
            <h2 className="text-balance text-4xl md:text-5xl font-black text-slate-900 dark:text-white">
              Deja la libreta y el Excel. <span className="text-primary">Tu lavandería en {countryName} merece un estándar internacional.</span>
            </h2>
            <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
              En {countryName}, demasiadas lavanderías todavía anotan pedidos en papelitos que se mojan, pierden tickets y cuadran la caja "a ojo". El resultado: prendas traspapeladas, clientes molestos y fugas de dinero silenciosas.
            </p>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              Klynn fue diseñado junto a dueños reales de lavanderías y tintorerías para resolver eso de raíz: cálculo exacto de {taxName} ({taxRate}%), tickets térmicos universales de 58/80mm y notificaciones automáticas por WhatsApp.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Calculator, t: `Cálculo de ${taxName} ${taxRate}%`, d: `Configurado automáticamente para ${regulatoryBody} sin cálculos manuales.` },
              { icon: FileText, t: `Tickets térmicos y ${docLabel}`, d: `Tickets claros con QR de entrega y control de documentos fiscales.` },
              { icon: Banknote, t: `Moneda en ${currencyCode}`, d: `Cobra en ${currencyCode} (${currencySymbol}) con cuadre exacto de caja.` },
              { icon: Cloud, t: "100% en la nube", d: "Entra desde cualquier computadora Windows/Mac, tablet o móvil." },
              { icon: WifiOff, t: "Modo Offline POS", d: "Sigue cobrando e imprimiendo aunque no haya internet." },
              { icon: Headphones, t: "Soporte en español", d: "Atención directa vía WhatsApp por especialistas." },
            ].map((b) => (
              <div key={b.t} className="rounded-2xl border border-border bg-surface p-5 shadow-card hover:shadow-md transition-shadow">
                <b.icon className="mb-3 h-5 w-5 text-primary" />
                <div className="font-display text-lg font-bold text-slate-900 dark:text-white">{b.t}</div>
                <div className="mt-1 text-sm text-muted-foreground leading-relaxed">{b.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 5. TICKET TÉRMICO INTERACTIVO LOCALIZADO ─── */}
      <section className="border-y border-border bg-slate-50/70 dark:bg-slate-900/40 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <Printer className="h-4 w-4" /> Impresión Local ESC/POS
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                Tickets térmicos de 58mm y 80mm adaptados a {countryName}
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed">
                Tus tickets salen con el logotipo de tu lavandería, número de {docLabel}, desglose transparente de {taxName} al {taxRate}%, código de orden y código QR para entrega inmediata.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Check className="h-3.5 w-3.5 text-emerald-500" /> Compatible Epson, Xprinter, Star
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Check className="h-3.5 w-3.5 text-emerald-500" /> USB, Bluetooth y Red
                </span>
              </div>
            </div>

            {/* Simulación física del ticket térmico */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="ticket-card" id="starter">
                <div className="ticket-card__head">
                  <div className="ticket-card__logo">
                    <span className="bub-mark" aria-hidden="true"></span>
                  </div>
                  <p className="ticket-card__title">{ticketData.businessName}</p>
                  <p className="ticket-card__sub">
                    {ticketData.docLabel}: {ticketData.docValue}<br />
                    Tel: {ticketData.phone}<br />
                    <span className="text-[10px] text-slate-400">{ticketData.address}</span>
                  </p>
                </div>

                <hr className="ticket-card__hr" />

                <div className="ticket-card__meta">
                  <div>ORDEN: {ticketData.orderNumber}</div>
                  <div>FOLIO: {ticketData.fiscalNumber}</div>
                  <div>Fecha: {ticketData.dateStr}</div>
                  <div>Cliente: {ticketData.clientName}</div>
                </div>

                <hr className="ticket-card__hr" />

                <div className="ticket-card__items">
                  {ticketData.items.map((item, idx) => (
                    <div key={idx} className="ticket-card__item">
                      <div>
                        <div className="font-bold">{item.name}</div>
                        {item.detail && <div className="text-[10px] text-slate-400">{item.detail}</div>}
                      </div>
                      <span className="font-bold shrink-0">{currencySymbol} {formatPrice(item.price)}</span>
                    </div>
                  ))}
                </div>

                <hr className="ticket-card__hr" />

                <div className="ticket-card__totals">
                  <div className="ticket-card__total-row">
                    <span>Subtotal</span>
                    <span>{currencySymbol} {formatPrice(subtotal)}</span>
                  </div>
                  <div className="ticket-card__total-row text-sky-700 dark:text-sky-400 font-semibold">
                    <span>{taxName} ({taxRate}%)</span>
                    <span>{currencySymbol} {formatPrice(taxAmount)}</span>
                  </div>
                  <div className="ticket-card__total-row ticket-card__total-row--final">
                    <span>TOTAL</span>
                    <span>{currencySymbol} {formatPrice(total)} {currencyCode}</span>
                  </div>
                </div>

                <div className="pt-3 text-center">
                  <p className="ticket-card__footer">
                    ¡Gracias por su preferencia! 🧺 · 58mm / 80mm
                  </p>
                  <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider mt-1">
                    ✓ {regulatoryBody} Compatible
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. FEATURES ("OPERACIÓN COMPLETA") ─── */}
      <section id="features" className="border-b border-border bg-surface-elevated">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-14 mx-auto max-w-2xl text-center">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Operación completa</div>
            <h2 className="text-balance text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
              Todo lo que necesita tu lavandería en {countryName}.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Cubrimos cada paso desde que el cliente entra al mostrador hasta el cuadre de caja del día.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="group rounded-2xl border border-border bg-surface p-6 shadow-card transition hover:-translate-y-1 hover:shadow-elegant"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary/20">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-xl font-bold font-display text-slate-900 dark:text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 7. WHATSAPP AUTOMATIZADO CON SIMULADOR DE CHAT ─── */}
      <section id="whatsapp-integration" className="bg-[#0b132b] text-white py-20 border-y border-slate-800 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#25D366]/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="mx-auto max-w-6xl px-6 relative z-10">
          <div className="max-w-3xl mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] text-xs font-bold uppercase tracking-wider mb-6 shadow-[0_0_15px_rgba(37,211,102,0.2)]">
              <span>★</span> FUNCIONALIDAD ESTRELLA EN {countryName.toUpperCase()}
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
              Tu lavandería notifica <br />
              <span className="text-[#25D366] drop-shadow-[0_0_25px_rgba(37,211,102,0.45)]">automáticamente por WhatsApp</span>
            </h2>
            <p className="mt-5 text-lg md:text-xl text-slate-300 leading-relaxed max-w-2xl font-normal">
              Klynn envía avisos automáticos a tus clientes en {countryName}. Sin llamadas, sin malentendidos — el cliente sabe exactamente cuándo está lista su ropa.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7 grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Aviso automático al estar lista",
                  desc: "Klynn envía el mensaje en cuanto cambias el estado de la orden a 'Lista'. Sin esfuerzo extra para tu personal.",
                  badge: "Tiempo real",
                },
                {
                  title: `Detalle claro con ${taxName}`,
                  desc: `El cliente recibe número de orden, desglose de prendas, ${taxName} ${taxRate}% y total en ${currencyCode}.`,
                  badge: "Transparente",
                },
                {
                  title: "Menos llamadas en mostrador",
                  desc: "Elimina las interrupciones constantes. Tus clientes retiran sus pedidos a tiempo.",
                  badge: "+90% eficiencia",
                },
                {
                  title: "Tickets térmicos digitales",
                  desc: "Envía el comprobante digital con código QR para que el cliente lo tenga siempre a mano en su teléfono.",
                  badge: "Cero extravíos",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="group relative rounded-2xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-sm transition-all duration-300 hover:border-[#25D366]/50 hover:bg-slate-900 hover:shadow-[0_10px_30px_rgba(37,211,102,0.12)] hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#25D366]/15 text-[#25D366]">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-white group-hover:text-[#25D366] transition-colors leading-snug mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Simulador de WhatsApp */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-slate-700 bg-slate-950 p-4 shadow-2xl relative overflow-hidden">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-800 px-2">
                  <div className="relative">
                    <img
                      src="/favicon.webp"
                      alt="Klynn"
                      className="h-10 w-10 rounded-full object-cover border border-slate-700 bg-slate-900 p-0.5 shadow-sm"
                    />
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-slate-950" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">{ticketData.businessName}</div>
                    <span className="text-[11px] text-emerald-400 font-medium">WhatsApp Business · {countryName}</span>
                  </div>
                </div>

                <div className="py-4 px-1 space-y-3.5 font-sans text-xs">
                  <div className="flex justify-end">
                    <div className="bg-[#005c4b] text-slate-100 rounded-2xl rounded-tr-none p-4 max-w-[90%] shadow-md border border-[#007a63]/50">
                      <p className="font-semibold text-white mb-2 text-sm leading-snug">
                        ¡Hola {ticketData.clientName.split(" ")[0]}! Tu orden <span className="underline decoration-[#25D366]">{ticketData.orderNumber}</span> ya está <span className="bg-[#25D366]/20 text-[#25D366] px-1.5 py-0.5 rounded font-bold">¡LISTA!</span>
                      </p>

                      <div className="bg-black/20 rounded-lg p-2.5 my-2 space-y-1.5 text-[11px] text-slate-200 border border-white/5">
                        {ticketData.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="text-slate-300">{it.name}:</span>
                            <span className="font-mono">{currencySymbol} {formatPrice(it.price)}</span>
                          </div>
                        ))}
                        <div className="border-t border-white/10 pt-1.5 flex justify-between font-bold text-white text-xs">
                          <span>TOTAL {taxName} INCL.:</span>
                          <span className="text-[#25D366]">{currencySymbol} {formatPrice(total)} {currencyCode}</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-300 space-y-1 mt-2">
                        <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> {ticketData.address}</div>
                        <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> Horario: Lun-Sáb 8:00 AM - 7:00 PM</div>
                      </div>

                      <div className="mt-2.5 pt-1.5 border-t border-white/10 flex items-center justify-end text-[10px]">
                        <div className="flex items-center gap-1 text-[#25D366]">
                          <span>10:31 AM</span>
                          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.41 11.93l-1.41 1.41 5.66 5.66 12-12-1.42-1.41zM.41 13.34l5.66 5.66 1.41-1.41-5.66-5.66-1.41 1.41z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <div className="bg-slate-800 text-slate-200 rounded-2xl rounded-tl-none p-3.5 max-w-[85%] border border-slate-700/60 shadow-sm">
                      <p className="text-sm font-normal">¡Excelente! Paso en 15 minutos a retirarla. ¡Muchas gracias!</p>
                      <span className="text-[10px] text-slate-400 text-right block mt-1">10:32 AM</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 8. PLANES Y PRECIOS EN MONEDA LOCAL ─── */}
      <section id="planes" className="border-y border-border bg-surface-elevated py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary inline-flex items-center justify-center gap-1.5">
              <span>{countryFlag}</span>
              <span>Precios en {countryName} ({currencySymbol} {currencyCode})</span>
            </div>
            <h2 className="text-balance text-4xl md:text-5xl font-black text-slate-900 dark:text-white">
              Precios honestos, sin sorpresas.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              <strong className="font-bold text-slate-900 dark:text-white">14 días de prueba gratis</strong> en cualquier plan. Cambia o cancela cuando quieras.
            </p>

            {/* Toggle Mensual / Anual */}
            <div className="mt-8 flex items-center justify-center gap-4">
              <span className={`text-sm font-bold transition-colors ${billingCycle === "monthly" ? "text-primary" : "text-muted-foreground"}`}>Pago Mensual</span>
              <button
                type="button"
                onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
                className="relative h-7 w-12 rounded-full bg-slate-200 dark:bg-slate-700 p-1 transition-colors hover:bg-slate-300 cursor-pointer"
              >
                <motion.div
                  animate={{ x: billingCycle === "monthly" ? 0 : 20 }}
                  className="h-5 w-5 rounded-full bg-white shadow-sm"
                />
              </button>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold transition-colors ${billingCycle === "yearly" ? "text-primary" : "text-muted-foreground"}`}>Pago Anual</span>
                <span className="rounded-full bg-[#F0B900]/20 px-2.5 py-0.5 text-xs font-extrabold text-[#b88c00] dark:text-[#F0B900] border border-[#F0B900]/40 shadow-xs uppercase tracking-wider flex items-center gap-1">
                  🎁 2 MESES GRATIS
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {plans.filter(p => !p.es_especial).map((plan) => {
              const rawPrice = billingCycle === "monthly" ? plan.precio_mensual : (plan.precio_anual || (plan.precio_mensual * 12 * 0.85));
              const displayPrice = formatCurrencyByCountry(rawPrice, countryCode);

              return (
                <div
                  key={plan.id}
                  className={`plan-card ${plan.destacado ? "plan-card--featured" : ""}`}
                >
                  {plan.destacado && (
                    <div className="plan-card__badge">Más popular</div>
                  )}
                  <div className="flex flex-col">
                    <div className="font-display text-2xl font-bold text-slate-900">{plan.nombre}</div>
                    <div className="mt-1.5 flex items-baseline gap-1">
                      <span className="font-display text-3xl font-bold tracking-tight text-slate-900">{displayPrice}</span>
                    </div>
                    <div className="-mt-0.5 text-xs font-semibold text-slate-500">{billingCycle === "monthly" ? "por mes" : "por año"}</div>
                  </div>

                  <div className="my-6 space-y-4 text-sm">
                    <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Hasta {plan.limite_empleados === 999 ? "ilimitados" : plan.limite_empleados} usuarios</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>{plan.limite_ordenes_mes ? `${plan.limite_ordenes_mes} órdenes/mes` : "Órdenes ilimitadas"}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Tickets térmicos 58mm y 80mm</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Avisos por WhatsApp incluidos</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Control de caja y reportes</span>
                      </li>
                      {plan.modulos?.logistica && (
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span className="font-bold text-slate-900">App para Repartidores y Rutas</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  <Link
                    to="/registro"
                    search={{ country: countryCode }}
                    className={`btn w-full justify-center ${plan.destacado ? "btn--anil font-bold text-white" : "btn--outline"}`}
                  >
                    Comenzar prueba gratis <span className="btn__arrow">→</span>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 9. TESTIMONIO LOCAL ─── */}
      <section className="py-16 bg-[#1B4B73] text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="mx-auto max-w-4xl px-6 text-center space-y-6 relative z-10">
          <div className="flex justify-center gap-1 text-[#F0B900]">
            {[...Array(testimonial.rating || 5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-current" />
            ))}
          </div>
          <blockquote className="text-lg sm:text-2xl font-display font-medium leading-relaxed">
            "{testimonial.text}"
          </blockquote>
          <div className="space-y-1">
            <div className="font-bold text-base text-white">{testimonial.name}</div>
            <div className="text-xs sm:text-sm text-slate-300">
              {testimonial.role} · <strong className="text-[#F0B900]">{testimonial.business}</strong> ({testimonial.location})
            </div>
          </div>
        </div>
      </section>

      {/* ─── 10. PREGUNTAS FRECUENTES (FAQ) ─── */}
      <section className="mx-auto max-w-4xl px-6 py-20" id="faq">
        <div className="mb-12 text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Dudas resueltas</div>
          <h2 className="text-balance text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
            Preguntas frecuentes sobre Klynn en {countryName}
          </h2>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <details key={idx} className="group rounded-2xl border border-border bg-surface p-6 shadow-card">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-display text-lg font-bold text-slate-900 dark:text-white">
                {faq.question}
                <span className="text-primary transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ─── 11. CTA FINAL ─── */}
      <section className="bg-gradient-to-br from-[#1B4B73] to-[#0f2c45] text-white py-20 px-6 text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto space-y-6 relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F0B900]/20 text-[#F0B900] border border-[#F0B900]/30">
            <Sparkles className="h-3.5 w-3.5" /> 14 Días de Prueba Sin Compromiso
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-black tracking-tight">
            Comienza hoy con el software #1 para lavanderías en {countryName}
          </h2>
          <p className="text-sm sm:text-base text-slate-200 max-w-xl mx-auto leading-relaxed">
            Automatiza tu mostrador, elimina descuadres de caja y mantén a tus clientes informados en {countryName} con Klynn Cloud.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link to="/registro" search={{ country: countryCode }}>
              <Button className="h-12 px-8 text-sm font-black bg-[#F0B900] hover:bg-[#d9a700] text-slate-950 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer">
                Comenzar prueba gratis de 14 días <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a 
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-12 px-6 rounded-2xl border border-white/25 bg-white/10 hover:bg-white/15 text-white text-sm font-bold backdrop-blur-md transition-all cursor-pointer"
            >
              <Phone className="h-4 w-4 text-[#F0B900]" />
              <span>Hablar con un asesor</span>
            </a>
          </div>
        </div>
      </section>

      {/* ─── 12. PIE DE PÁGINA (IDÉNTICO AL OFICIAL) ─── */}
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-8 md:grid-cols-5">
            <div>
              <Logo size="sm" className="[&_img]:!h-[52px]" />
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Software de gestión y punto de venta para lavanderías y tintorerías en {countryName} y Latinoamérica. Facturación fiscal, tickets térmicos y WhatsApp automatizado.
              </p>
            </div>
            <div>
              <div className="mb-3 text-sm font-semibold">Producto</div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><a href="#paises" className="hover:text-foreground">Países disponibles</a></li>
                <li><a href="#features" className="hover:text-foreground">Funciones</a></li>
                <li><a href="#planes" className="hover:text-foreground">Planes y precios</a></li>
                <li><a href={WHATSAPP_LINK} className="hover:text-foreground">Solicitar demo</a></li>
                <li><Link to="/registro" search={{ country: countryCode }} className="hover:text-foreground">Crear cuenta</Link></li>
              </ul>
            </div>
            <div>
              <div className="mb-3 text-sm font-semibold">Recursos</div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><Link to="/blog" className="hover:text-foreground">Blog y Consejos</Link></li>
                <li><a href="#faq" className="hover:text-foreground">Preguntas frecuentes</a></li>
                <li><a href="#impacto" className="hover:text-foreground">Impacto operativo</a></li>
              </ul>
            </div>
            <div>
              <div className="mb-3 text-sm font-semibold">Países soportados</div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li><Link to="/software-lavanderia-mexico" className="hover:text-foreground">🇲🇽 Lavanderías México</Link></li>
                <li><Link to="/software-lavanderia-colombia" className="hover:text-foreground">🇨🇴 Lavanderías Colombia</Link></li>
                <li><Link to="/software-lavanderia-peru" className="hover:text-foreground">🇵🇪 Lavanderías Perú</Link></li>
                <li><Link to="/software-lavanderia-republica-dominicana" className="hover:text-foreground">🇩🇴 Lavanderías Rep. Dominicana</Link></li>
                <li><Link to="/software-lavanderia-panama" className="hover:text-foreground">🇵🇦 Lavanderías Panamá</Link></li>
                <li><Link to="/software-lavanderia-costa-rica" className="hover:text-foreground">🇨🇷 Lavanderías Costa Rica</Link></li>
                <li><Link to="/software-lavanderia-chile" className="hover:text-foreground">🇨🇱 Lavanderías Chile</Link></li>
                <li><Link to="/software-lavanderia-ecuador" className="hover:text-foreground">🇪🇨 Lavanderías Ecuador</Link></li>
                <li><Link to="/software-lavanderia-espana" className="hover:text-foreground">🇪🇸 Lavanderías España</Link></li>
                <li><Link to="/software-lavanderia-guatemala" className="hover:text-foreground">🇬🇹 Lavanderías Guatemala</Link></li>
                <li><Link to="/software-lavanderia-honduras" className="hover:text-foreground">🇭🇳 Lavanderías Honduras</Link></li>
                <li><Link to="/software-lavanderia-el-salvador" className="hover:text-foreground">🇸🇻 Lavanderías El Salvador</Link></li>
                <li><Link to="/software-lavanderia-uruguay" className="hover:text-foreground">🇺🇾 Lavanderías Uruguay</Link></li>
              </ul>
            </div>
            <div>
              <div className="mb-3 text-sm font-semibold">Legal</div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><Link to="/terminos" className="hover:text-foreground">Términos de Uso</Link></li>
                <li><Link to="/privacidad" className="hover:text-foreground">Política de Privacidad</Link></li>
                <li><Link to="/cookies" className="hover:text-foreground">Política de Cookies</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 md:flex-row">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Klynn · Hecho para lavanderías en {countryName} y el mundo 🌎
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Link to="/terminos" className="hover:text-foreground">Términos</Link>
              <Link to="/privacidad" className="hover:text-foreground">Privacidad</Link>
              <div className="flex items-center gap-3 ml-4">
                <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Datos seguros</span>
                <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> 13 Países</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
