import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { 
  ArrowRight, Sparkles, Receipt, Wallet, Users, Truck, 
  BarChart3, Printer, Check, Smartphone, MapPin, Star,
  ShieldCheck, CheckCircle2, MessageSquare, Layers, Clock,
  HelpCircle, Phone, ArrowUpRight, Calculator, FileText, Banknote, Cloud, Lock, QrCode, Building2
} from "lucide-react";
import { LandingNavbar } from "@/components/klynn/LandingNavbar";
import { Logo } from "@/components/klynn/Logo";
import { Button } from "@/components/ui/button";
import { DEFAULT_COUNTRY_PLANS, type Plan } from "@/lib/storage";

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

      {/* ─── 1. HERO SECTION ─── */}
      <section className="relative overflow-hidden pt-8 pb-16 md:pt-12 md:pb-24 border-b border-border/60">
        <div className="absolute inset-0 bg-radial-[circle_at_top,_var(--tw-gradient-stops)] from-sky-500/5 via-transparent to-transparent pointer-events-none" />

        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Lead content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary select-none">
                <span className="text-base leading-none">{countryFlag}</span>
                <span>Software de Facturación en la Nube y POS · {countryName}</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black tracking-tight text-slate-900 dark:text-white leading-[1.12]">
                {heroHeadline}{" "}
                <span className="text-[#1B4B73] dark:text-sky-400">{heroHighlight}</span>
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                {heroSubtitle}
              </p>

              {/* Keywords callout badges */}
              <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  ✓ Sistema de Facturación para Lavanderías
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  ✓ Software para Lavanderías y Tintorerías
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  ✓ Software en la Nube
                </span>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/registro"
                  search={{ country: countryCode }}
                  className="h-12 px-7 rounded-xl bg-[#1B4B73] hover:bg-[#133857] text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Comenzar prueba gratis de 14 días</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-12 px-6 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="h-4 w-4 text-emerald-500" />
                  <span>Solicitar demostración</span>
                </a>
              </div>

              {/* Proof badges */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1 font-medium">
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 stroke-[3]" /> Sin tarjeta de crédito
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 stroke-[3]" /> Cancela cuando quieras
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 stroke-[3]" /> Datos en la nube 24/7
                </span>
              </div>
            </div>

            {/* Localized Ticket Thermal Preview */}
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
                  <div>FOLIO / FISCAL: {ticketData.fiscalNumber}</div>
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
                    ¡Gracias por su preferencia! 🧺 · ESC/POS 58mm / 80mm
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

      {/* ─── 2. EL IMPACTO EN TU LAVANDERÍA (BIGNUMS) ─── */}
      <section className="border-b border-border bg-surface-elevated py-16 md:py-20" id="impacto">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <p className="eyebrow justify-center">
              <span className="eyebrow__dot" style={{ background: "#22c55e" }}></span> RESULTADOS COMPROBADOS EN {countryName.toUpperCase()}
            </p>
            <h2 className="section__title text-balance" style={{ margin: "0 auto", maxWidth: "44ch" }}>
              Más rapidez en mostrador. Control total de tus ingresos en {countryName}.
            </h2>
          </div>
          <dl className="numbers">
            <div className="bignum">
              <dd className="bignum__v">
                <span className="bignum__pre">≈</span>
                <span>20</span>
                <span className="bignum__u">seg</span>
              </dd>
              <dt className="bignum__k">Tiempo promedio para registrar una orden de ropa (por kilo o prenda) e imprimir ticket térmico.</dt>
            </div>
            <div className="bignum">
              <dd className="bignum__v">
                <span>100</span>
                <span className="bignum__u">%</span>
              </dd>
              <dt className="bignum__k">Facturación adaptada con {taxName} ({taxRate}%) y {docLabel} según las normas de {regulatoryBody}.</dt>
            </div>
            <div className="bignum">
              <dd className="bignum__v">
                <span>0</span>
              </dd>
              <dt className="bignum__k">Prendas extraviadas gracias al control de estantería, percheros y códigos QR en ticket.</dt>
            </div>
          </dl>
        </div>
      </section>

      {/* ─── 3. CIUDADES Y REGIONES EN EL PAÍS ─── */}
      <section className="border-b border-border bg-slate-50/70 dark:bg-slate-900/50 py-12">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-2">
            <MapPin className="h-4 w-4 text-[#F0B900]" /> Cobertura Nacional en {countryName}
          </div>
          <h2 className="text-2xl md:text-3xl font-display font-extrabold text-foreground mb-3">
            Optimizando lavanderías, tintorerías y planchadurías en todo {countryName}
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto mb-6">
            Klynn sincroniza tu recepción en mostrador, tickets térmicos, WhatsApp y repartidores en los principales {regionsLabel.toLowerCase()}:
          </p>
          <div className="flex flex-wrap justify-center gap-2.5 max-w-4xl mx-auto">
            {regions.map((region) => (
              <span 
                key={region} 
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white dark:bg-slate-950 border border-border/80 text-xs sm:text-sm font-bold text-foreground shadow-2xs hover:border-primary/50 transition-colors"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                {region}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4. DESAFÍOS REALES DEL MERCADO LOCAL ─── */}
      <section className="py-16 md:py-24 mx-auto max-w-7xl px-6">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="h-3.5 w-3.5 text-[#F0B900]" /> Realidad Operativa en {countryName}
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-black text-foreground tracking-tight">
            Diseñado para los desafíos cotidianos de las lavanderías en {countryName}
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Desde el ritmo acelerado del mostrador hasta el control de peso, notas de remisión y comprobantes fiscales, resolvemos las fricciones de tu negocio.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {challenges.map((ch, idx) => {
            const Icon = ch.icon;
            return (
              <div 
                key={idx} 
                className="p-6 rounded-3xl bg-surface border border-border/80 shadow-card hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {ch.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-display font-bold text-foreground">
                    {ch.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {ch.description}
                  </p>
                </div>
                
                <div className="pt-4 mt-4 border-t border-border/50 flex items-center gap-1.5 text-xs font-bold text-primary group-hover:translate-x-1 transition-transform">
                  <span>Optimizado para {countryName}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 5. WHATSAPP AUTOMATIZADO ─── */}
      <section className="bg-[#0b132b] text-white py-20 border-y border-slate-800 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#25D366]/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="mx-auto max-w-6xl px-6 relative z-10">
          <div className="max-w-3xl mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] text-xs font-bold uppercase tracking-wider mb-6 shadow-[0_0_15px_rgba(37,211,102,0.2)]">
              <span>★</span> FUNCIONALIDAD ESTRELLA EN {countryName.toUpperCase()}
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-[1.15]">
              Tu lavandería notifica <br />
              <span className="text-[#25D366] drop-shadow-[0_0_25px_rgba(37,211,102,0.45)]">automáticamente por WhatsApp</span>
            </h2>
            <p className="mt-4 text-base md:text-lg text-slate-300 leading-relaxed font-normal">
              Klynn envía avisos automáticos a tus clientes en {countryName}. Sin llamadas manuales, sin clientes preguntando — reciben el aviso en su chat en el instante exacto en que la ropa está lista para retirar o enviar.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
              <div className="text-emerald-400 font-bold text-sm mb-1">Aviso automático</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                El cliente recibe el mensaje tan pronto marcas la orden como lista en tu pantalla o tablet.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
              <div className="text-emerald-400 font-bold text-sm mb-1">Detalle con {taxName}</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Desglose transparente de prendas, peso, balance pendiente y método de pago en su WhatsApp.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
              <div className="text-emerald-400 font-bold text-sm mb-1">-90% de llamadas</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tu mostrador trabaja sin interrupciones telefónicas y los clientes retiran sus pedidos mucho más rápido.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
              <div className="text-emerald-400 font-bold text-sm mb-1">Soporte Continuo</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Asistencia directa en tu idioma por nuestro equipo especializado vía WhatsApp y chat.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. LOS 6 PILARES OPERATIVOS DE KLYNN ─── */}
      <section className="py-16 md:py-20 bg-slate-50 dark:bg-slate-900/40 border-y border-border">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Sistema Todo en Uno
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-black text-foreground tracking-tight">
              Todo lo que tu lavandería en {countryName} necesita para operar al 100%
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Sin instalaciones complicadas. Funciona en la nube desde cualquier computadora Windows/Mac, tablet o smartphone.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-950 border border-border/80 shadow-xs hover:border-primary/50 transition-all">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Clock className="h-5 w-5" />
              </div>
              <h4 className="text-base font-display font-bold text-foreground mb-1.5">Recepción Ágil en 20 Segundos</h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Registra prendas por pieza o por kilo, imprime el ticket térmico con código de barra o QR y cobra abonos en segundos.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-950 border border-border/80 shadow-xs hover:border-primary/50 transition-all">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4">
                <Receipt className="h-5 w-5" />
              </div>
              <h4 className="text-base font-display font-bold text-foreground mb-1.5">Facturación y {docLabel}</h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Emite comprobantes con desglose de {taxName} {taxRate}% y {docLabel} de clientes para cumplimiento ante {regulatoryBody}.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-950 border border-border/80 shadow-xs hover:border-primary/50 transition-all">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-4">
                <Wallet className="h-5 w-5" />
              </div>
              <h4 className="text-base font-display font-bold text-foreground mb-1.5">Arqueo y Cuadre de Caja</h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Control ciego de efectivo, tarjetas bancarias, transferencias locales y gastos de caja chica. Cero descuadres al final del día.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-950 border border-border/80 shadow-xs hover:border-primary/50 transition-all">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h4 className="text-base font-display font-bold text-foreground mb-1.5">WhatsApp Automatizado</h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Envía avisos directos al celular del cliente: "Tu ropa está lista para retirar o enviar a domicilio".
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-950 border border-border/80 shadow-xs hover:border-primary/50 transition-all">
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center mb-4">
                <Layers className="h-5 w-5" />
              </div>
              <h4 className="text-base font-display font-bold text-foreground mb-1.5">Estantería y Flujo Kanban</h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Asigna casilleros, estantes o percheros a cada orden y monitorea el estado de lavado, secado y planchado en tiempo real.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-950 border border-border/80 shadow-xs hover:border-primary/50 transition-all">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4">
                <Truck className="h-5 w-5" />
              </div>
              <h4 className="text-base font-display font-bold text-foreground mb-1.5">App para Repartidores</h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Coordina recolecciones y entregas con geolocalización, cobro contra entrega y confirmación digital del cliente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. TABLA COMPARATIVA: ANTES VS CON KLYNN ─── */}
      <section className="py-16 md:py-20 mx-auto max-w-5xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl md:text-3xl font-display font-black text-foreground">
            La diferencia de trabajar con Klynn en {countryName}
          </h2>
        </div>

        <div className="rounded-3xl border border-border/80 bg-surface overflow-hidden shadow-card">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/80">
            {/* Lado Manual */}
            <div className="p-6 sm:p-8 space-y-4 bg-rose-50/30 dark:bg-rose-950/10">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span>Gestión Tradicional en Papel / Excel</span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span>Talonarios manuales que se pierden, se borran o se manchan con agua.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span>Descuadres frecuentes de caja por sumas manuales y transferencias no registradas.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span>Clientes llamando constantemente para preguntar si su ropa ya está lista.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span>Falta de respaldo en la nube: si se daña la libreta o computadora, se pierde todo.</span>
                </li>
              </ul>
            </div>

            {/* Lado Klynn */}
            <div className="p-6 sm:p-8 space-y-4 bg-emerald-50/40 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Con Klynn Cloud en {countryName}</span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-foreground font-medium">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Tickets térmicos nítidos de 58mm y 80mm con código de orden y QR.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Arqueo de caja exacto con efectivo, tarjetas bancarias y transferencias.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Mensajes automáticos por WhatsApp directo al celular del cliente sin costo extra.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Adaptación fiscal con {taxName} y {docLabel} según {regulatoryBody}.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 8. PLANES Y PRECIOS EN MONEDA LOCAL ─── */}
      <section className="py-16 md:py-24 bg-slate-50 dark:bg-slate-900/50 border-y border-border" id="planes">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              <Banknote className="h-3.5 w-3.5 text-[#F0B900]" /> Precios Transparentes en {currencyCode}
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-black text-foreground tracking-tight">
              Planes adaptados a tu lavandería en {countryName}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Sin contratos forzosos. Prueba 14 días gratis sin ingresar tarjeta de crédito.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {plans.filter(p => p.id !== "inicial").map((p) => {
              const isPro = p.id === "pro";
              return (
                <div
                  key={p.id}
                  className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all ${
                    isPro
                      ? "bg-white dark:bg-slate-900 border-2 border-primary shadow-xl relative scale-102"
                      : "bg-surface border border-border/80 shadow-card hover:shadow-lg"
                  }`}
                >
                  {isPro && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-white font-extrabold text-[11px] uppercase tracking-wider shadow-sm">
                      Más Popular
                    </span>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-display font-bold text-foreground">{p.nombre}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {p.id === "basico" && "Para lavanderías independientes o en crecimiento"}
                        {p.id === "pro" && "Para lavanderías de alto volumen y multi-empleados"}
                        {p.id === "enterprise" && "Para cadenas de lavanderías y franquicias"}
                      </p>
                    </div>

                    <div className="pt-2 pb-4 border-b border-border/60">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-display font-black text-foreground">
                          {currencySymbol} {formatPrice(p.precio_mensual)}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          {currencyCode} / mes
                        </span>
                      </div>
                    </div>

                    <ul className="space-y-2.5 text-xs sm:text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Hasta {p.limite_empleados === 999 ? "ilimitados" : p.limite_empleados} usuarios/empleados</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>{p.limite_ordenes_mes ? `${p.limite_ordenes_mes} órdenes mensuales` : "Órdenes ilimitadas"}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Avisos automáticos por WhatsApp</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Tickets térmicos 58mm y 80mm</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Control de caja y reportes de ventas</span>
                      </li>
                      {p.modulos?.logistica && (
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span className="font-bold text-foreground">App para Repartidores y Rutas</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="pt-6 mt-6 border-t border-border/60">
                    <Link
                      to="/registro"
                      search={{ country: countryCode }}
                      className={`w-full py-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isPro
                          ? "bg-primary hover:bg-primary/90 text-white shadow-md"
                          : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground"
                      }`}
                    >
                      <span>Probar 14 días gratis</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 9. TESTIMONIO DE CLIENTE LOCAL ─── */}
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

      {/* ─── 10. PREGUNTAS FRECUENTES (FAQ) LOCALES ─── */}
      <section className="py-16 md:py-24 mx-auto max-w-4xl px-6" id="faq">
        <div className="text-center mb-12 space-y-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
            <HelpCircle className="h-4 w-4" /> Dudas Frecuentes en {countryName}
          </span>
          <h2 className="text-2xl md:text-3xl font-display font-black text-foreground">
            Preguntas frecuentes sobre Klynn en {countryName}
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="p-5 rounded-2xl border border-border/80 bg-surface space-y-2 shadow-2xs">
              <h3 className="font-display font-bold text-foreground text-sm sm:text-base">
                {faq.question}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {faq.answer}
              </p>
            </div>
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

      {/* ─── 12. PIE DE PÁGINA CON ENLACES INTERNOS REGIONALES ─── */}
      <footer className="border-t border-border bg-surface py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <Logo size="sm" className="[&_img]:!h-[50px]" />
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Software de gestión y facturación en la nube para lavanderías, tintorerías y planchadurías en {countryName} y Latinoamérica.
              </p>
            </div>
            <div>
              <div className="mb-3 text-sm font-semibold">Soluciones Locales</div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><Link to="/software-lavanderia-mexico" className="hover:text-foreground">🇲🇽 Software Lavanderías México</Link></li>
                <li><Link to="/software-lavanderia-colombia" className="hover:text-foreground">🇨🇴 Software Lavanderías Colombia</Link></li>
                <li><Link to="/software-lavanderia-peru" className="hover:text-foreground">🇵🇪 Software Lavanderías Perú</Link></li>
                <li><Link to="/software-lavanderia-santo-domingo" className="hover:text-foreground">🇩🇴 Software Lavanderías Santo Domingo</Link></li>
              </ul>
            </div>
            <div>
              <div className="mb-3 text-sm font-semibold">Funcionalidades</div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><span>Punto de Venta POS para Lavandería</span></li>
                <li><span>Cobro de ropa por kilo y piezas</span></li>
                <li><span>Tickets térmicos 58mm y 80mm</span></li>
                <li><span>Avisos automáticos por WhatsApp</span></li>
                <li><span>Control de estantería y percheros</span></li>
              </ul>
            </div>
            <div>
              <div className="mb-3 text-sm font-semibold">Legal & Soporte</div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><Link to="/terminos" className="hover:text-foreground">Términos de Servicio</Link></li>
                <li><Link to="/privacidad" className="hover:text-foreground">Política de Privacidad</Link></li>
                <li><a href={WHATSAPP_LINK} className="hover:text-foreground">Soporte por WhatsApp</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-border/60 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Klynn Cloud · Software para lavanderías en {countryName}.
          </div>
        </div>
      </footer>
    </div>
  );
}
