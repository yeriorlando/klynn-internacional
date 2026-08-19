import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { 
  ArrowRight, Sparkles, Receipt, Wallet, Users, Truck, 
  BarChart3, Printer, Check, Smartphone, MapPin, Star,
  ShieldCheck, CheckCircle2, MessageSquare, Layers, Clock,
  HelpCircle, Phone, ArrowUpRight, Calculator, FileText, Banknote, Cloud, Lock, Headphones
} from "lucide-react";
import { LandingNavbar } from "@/components/klynn/LandingNavbar";
import { Logo } from "@/components/klynn/Logo";
import { Button } from "@/components/ui/button";

const WHATSAPP_LINK = "https://wa.link/vxstq4";

interface CityTicketData {
  businessName: string;
  rnc: string;
  phone: string;
  address: string;
  orderNumber: string;
  ncf: string;
  dateStr: string;
  clientName: string;
  items: { name: string; detail?: string; price: string }[];
  subtotal: string;
  itbis: string;
  total: string;
}

interface LocalChallenge {
  title: string;
  description: string;
  icon: any;
  badge: string;
}

interface CityLandingProps {
  city: string;
  fullName: string;
  slug: "santo-domingo" | "santiago" | "punta-cana";
  sectors: string[];
  description: string;
  ticketData: CityTicketData;
  challenges: LocalChallenge[];
  testimonial: {
    name: string;
    role: string;
    business: string;
    location: string;
    text: string;
    rating: number;
  };
}

export function CityLanding({ 
  city, 
  fullName, 
  slug,
  sectors, 
  description,
  ticketData,
  challenges,
  testimonial
}: CityLandingProps) {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-[#F0B900] selection:text-slate-950">
      <LandingNavbar />

      {/* ─── 1. HERO SECTION (RÉPLICA EXACTA 1:1 DE LA LANDING OFICIAL CON DATOS GEOLOCALIZADOS) ─── */}
      <section className="hero">
        <div className="hero__grid">
          <div className="hero__lead">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 mb-3 select-none">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Software de Gestión Operativa · {city}, RD</span>
            </div>
            
            <h1 className="hero__title">
              El software #1 para <span style={{ color: "var(--color-anil, #1B4B73)" }}>lavanderías</span> en {fullName}.
            </h1>
            
            <p className="hero__lede">
              {description} Cobra con ITBIS y NCF, imprime tickets térmicos 57/80mm, controla caja, clientes y repartidores en {sectors.slice(0, 4).join(", ")} y más. Multi-sucursal, en pesos dominicanos y con soporte criollo por WhatsApp.
            </p>
            
            <div className="hero__cta">
              <Link to="/registro" className="btn btn--anil">
                Comenzar prueba de 14 días <span className="btn__arrow">→</span>
              </Link>
              <a 
                href={WHATSAPP_LINK} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn--outline btn--ink"
              >
                Solicitar demostración
              </a>
            </div>
            
            <div className="hero__checks">
              <span><span className="check-icon">✓</span> Sin tarjeta de crédito</span>
              <span><span className="check-icon">✓</span> Cancela cuando quieras</span>
              <span><span className="check-icon">✓</span> Datos en la nube</span>
            </div>
          </div>

          {/* Ticket térmico geolocalizado interactivo */}
          <div className="hero__stage">
            <div className="ticket-card" id="starter">
              <div className="ticket-card__head">
                <div className="ticket-card__logo">
                  <span className="bub-mark" aria-hidden="true"></span>
                </div>
                <p className="ticket-card__title">{ticketData.businessName}</p>
                <p className="ticket-card__sub">
                  RNC: {ticketData.rnc}<br />
                  Tel: {ticketData.phone}<br />
                  <span className="text-[10px] text-slate-400">{ticketData.address}</span>
                </p>
              </div>
              
              <hr className="ticket-card__hr" />
              
              <div className="ticket-card__meta">
                <div>ORDEN: {ticketData.orderNumber}</div>
                <div>NCF: {ticketData.ncf}</div>
                <div>Fecha: {ticketData.dateStr}</div>
                <div>Cliente: {ticketData.clientName}</div>
              </div>
              
              <hr className="ticket-card__hr" />
              
              <div className="ticket-card__items">
                {ticketData.items.map((item, idx) => (
                  <div key={idx} className="ticket-card__item">
                    <span>{item.name}</span>
                    <span>{item.price}</span>
                  </div>
                ))}
              </div>
              
              <hr className="ticket-card__hr" />
              
              <div className="ticket-card__totals">
                <div className="ticket-card__total-row">
                  <span>Subtotal</span>
                  <span>{ticketData.subtotal}</span>
                </div>
                <div className="ticket-card__total-row">
                  <span>ITBIS 18%</span>
                  <span>{ticketData.itbis}</span>
                </div>
                <div className="ticket-card__total-row ticket-card__total-row--final">
                  <span>TOTAL</span>
                  <span>{ticketData.total}</span>
                </div>
              </div>
              
              <p className="ticket-card__footer">
                ¡Gracias por su visita! 🧺 · 57mm / 80mm
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. EL IMPACTO EN TU LAVANDERÍA (BIGNUMS IDÉNTICOS A LA LANDING) ─── */}
      <section className="border-y border-border bg-surface-elevated py-16 md:py-20" id="impacto">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <p className="eyebrow justify-center">
              <span className="eyebrow__dot" style={{ background: "#22c55e" }}></span> EL IMPACTO EN TU LAVANDERÍA EN {city.toUpperCase()}
            </p>
            <h2 className="section__title text-balance" style={{ margin: "0 auto", maxWidth: "42ch" }}>
              Más rapidez en mostrador. Control total de tus ingresos en {fullName}.
            </h2>
          </div>
          <dl className="numbers">
            <div className="bignum">
              <dd className="bignum__v">
                <span className="bignum__pre">≈</span>
                <span>30</span>
                <span className="bignum__u">seg</span>
              </dd>
              <dt className="bignum__k">Tiempo promedio para registrar una orden y emitir ticket térmico.</dt>
            </div>
            <div className="bignum">
              <dd className="bignum__v">
                <span>100</span>
                <span className="bignum__u">%</span>
              </dd>
              <dt className="bignum__k">Facturación electrónica con NCF, e-CF e ITBIS integrado según la DGII.</dt>
            </div>
            <div className="bignum">
              <dd className="bignum__v">
                <span>0</span>
              </dd>
              <dt className="bignum__k">Prendas extraviadas gracias al control de estados y códigos QR en ticket.</dt>
            </div>
          </dl>
        </div>
      </section>

      {/* ─── 3. SECTORES Y COBERTURA EN LA CIUDAD ─── */}
      <section className="border-b border-border bg-slate-50/70 dark:bg-slate-900/50 py-12">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-2">
            <MapPin className="h-4 w-4 text-[#F0B900]" /> Cobertura y Operación Local
          </div>
          <h2 className="text-2xl md:text-3xl font-display font-extrabold text-foreground mb-3">
            Optimizando lavanderías y entregas en todo {fullName}
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto mb-6">
            Klynn sincroniza tus repartidores, recepción en mostrador y notificaciones de entrega en los sectores de mayor demanda:
          </p>
          <div className="flex flex-wrap justify-center gap-2.5 max-w-4xl mx-auto">
            {sectors.map((sector) => (
              <span 
                key={sector} 
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white dark:bg-slate-950 border border-border/80 text-xs sm:text-sm font-bold text-foreground shadow-2xs hover:border-primary/50 transition-colors"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                {sector}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4. CASOS DE USO Y RETOS LOCALES DE LA CIUDAD ─── */}
      <section className="py-16 md:py-24 mx-auto max-w-7xl px-6">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="h-3.5 w-3.5 text-[#F0B900]" /> Realidad Operativa Local
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-black text-foreground tracking-tight">
            Diseñado para los desafíos reales de las lavanderías en {city}
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Desde el ritmo del mostrador hasta el tráfico y la facturación, resolvemos las fricciones diarias de tu negocio.
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
                  <span>Optimizado para {city}</span>
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
              <span>★</span> FUNCIONALIDAD ESTRELLA EN {city.toUpperCase()}
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-[1.15]">
              Tu lavandería notifica <br />
              <span className="text-[#25D366] drop-shadow-[0_0_25px_rgba(37,211,102,0.45)]">automáticamente por WhatsApp</span>
            </h2>
            <p className="mt-4 text-base md:text-lg text-slate-300 leading-relaxed font-normal">
              Klynn envía avisos automáticos a tus clientes en {fullName}. Sin llamadas manuales, sin clientes preguntando — reciben el aviso en su chat en el instante exacto en que la ropa está lista.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
              <div className="text-emerald-400 font-bold text-sm mb-1">Aviso automático</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                El cliente recibe el mensaje tan pronto marcas la orden como lista en tu pantalla.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
              <div className="text-emerald-400 font-bold text-sm mb-1">Detalle con ITBIS</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Desglose transparente de prendas, balance pendiente y método de pago en su WhatsApp.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
              <div className="text-emerald-400 font-bold text-sm mb-1">-90% de llamadas</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tu mostrador trabaja sin interrupciones telefónicas y los clientes retiran más rápido.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
              <div className="text-emerald-400 font-bold text-sm mb-1">Soporte Criollo</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Asistencia directa en República Dominicana por nuestro equipo vía WhatsApp.
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
              Todo lo que tu lavandería en {city} necesita para operar al 100%
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Sin configuraciones complejas. Listo para usar desde computadoras, tablets o celulares.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-950 border border-border/80 shadow-xs hover:border-primary/50 transition-all">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Clock className="h-5 w-5" />
              </div>
              <h4 className="text-base font-display font-bold text-foreground mb-1.5">Recepción en 15 Segundos</h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Registra prendas por pieza o libra, imprime el ticket térmico con código de barra y recibe abonos en segundos.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-950 border border-border/80 shadow-xs hover:border-primary/50 transition-all">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4">
                <Receipt className="h-5 w-5" />
              </div>
              <h4 className="text-base font-display font-bold text-foreground mb-1.5">NCF y e-CF DGII</h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Emite facturas de crédito fiscal (B01), consumo (B02) y régimen especial con control de secuencias y cálculo automático de ITBIS.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-950 border border-border/80 shadow-xs hover:border-primary/50 transition-all">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-4">
                <Wallet className="h-5 w-5" />
              </div>
              <h4 className="text-base font-display font-bold text-foreground mb-1.5">Arqueo y Cuadre de Caja</h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Control ciego de efectivo, tarjetas, transferencias y gastos de caja chica. Cero descuadres al final del turno.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-950 border border-border/80 shadow-xs hover:border-primary/50 transition-all">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h4 className="text-base font-display font-bold text-foreground mb-1.5">WhatsApp Automatizado</h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Notifica a los clientes de {city} automáticamente: "Tu ropa está lista para retirar o entregar a domicilio".
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-950 border border-border/80 shadow-xs hover:border-primary/50 transition-all">
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center mb-4">
                <Layers className="h-5 w-5" />
              </div>
              <h4 className="text-base font-display font-bold text-foreground mb-1.5">Flujo Kanban de Ropa</h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Monitorea el estado de cada prenda en tiempo real: Recepción → Lavado → Secado → Planchado → Listo.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-950 border border-border/80 shadow-xs hover:border-primary/50 transition-all">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4">
                <Truck className="h-5 w-5" />
              </div>
              <h4 className="text-base font-display font-bold text-foreground mb-1.5">App para Repartidores</h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Coordina recogidas y entregas con GPS, cobro contra entrega y firma digital del cliente en destino.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. TABLA COMPARATIVA: ANTES VS CON KLYNN ─── */}
      <section className="py-16 md:py-20 mx-auto max-w-5xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl md:text-3xl font-display font-black text-foreground">
            La diferencia de trabajar con Klynn en {city}
          </h2>
        </div>

        <div className="rounded-3xl border border-border/80 bg-surface overflow-hidden shadow-card">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/80">
            {/* Lado Manual */}
            <div className="p-6 sm:p-8 space-y-4 bg-rose-50/30 dark:bg-rose-950/10">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span>Gestión Tradicional en Papel</span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span>Talonarios manuales que se pierden o se manchan con agua.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span>Descuadres frecuentes de caja por cálculos a mano.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span>Clientes llamando constantemente para saber si su ropa está lista.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span>Riesgo de sanciones por mal manejo de comprobantes fiscales DGII.</span>
                </li>
              </ul>
            </div>

            {/* Lado Klynn */}
            <div className="p-6 sm:p-8 space-y-4 bg-emerald-50/40 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Con Klynn Cloud en {city}</span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-foreground font-medium">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Tickets térmicos nítidos de 57mm y 80mm con código de orden.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Arqueo exacto y transparente en efectivo, tarjeta y transferencias.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Mensajes automáticos por WhatsApp directo al celular del cliente.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Facturación electrónica e-CF y NCF 100% en regla con la DGII.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 8. TESTIMONIO LOCAL DE LA CIUDAD ─── */}
      <section className="py-16 bg-[#1B4B73] text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="mx-auto max-w-4xl px-6 text-center space-y-6 relative z-10">
          <div className="flex justify-center gap-1 text-[#F0B900]">
            {[...Array(5)].map((_, i) => (
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

      {/* ─── 9. PREGUNTAS FRECUENTES (FAQ) LOCALES ─── */}
      <section className="py-16 md:py-24 mx-auto max-w-4xl px-6">
        <div className="text-center mb-12 space-y-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
            <HelpCircle className="h-4 w-4" /> Dudas Habituales en {city}
          </span>
          <h2 className="text-2xl md:text-3xl font-display font-black text-foreground">
            Preguntas frecuentes sobre Klynn en {fullName}
          </h2>
        </div>

        <div className="space-y-4">
          <div className="p-5 rounded-2xl border border-border/80 bg-surface space-y-2 shadow-2xs">
            <h3 className="font-display font-bold text-foreground text-sm sm:text-base">
              ¿Qué impresoras térmicas son compatibles en República Dominicana?
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Klynn funciona de forma nativa con cualquier impresora térmica estándar de 57mm u 80mm conectada por USB, Bluetooth o Red (Epson, Xprinter, Netum, Rongta, etc.) sin necesidad de controladores especiales.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-border/80 bg-surface space-y-2 shadow-2xs">
            <h3 className="font-display font-bold text-foreground text-sm sm:text-base">
              ¿Cumple Klynn con los requisitos de la DGII para NCF y e-CF?
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Sí, 100%. Podrás emitir comprobantes de Crédito Fiscal (B01), Consumo (B02), Gubernamental (B15), y los nuevos Comprobantes Fiscales Electrónicos (e-CF) con control de secuencias y vencimientos.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-border/80 bg-surface space-y-2 shadow-2xs">
            <h3 className="font-display font-bold text-foreground text-sm sm:text-base">
              ¿Puedo administrar varias sucursales en {city} desde una sola cuenta?
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Totalmente. Puedes gestionar múltiples sucursales con cajas independientes, inventarios y reportes consolidados en tiempo real desde tu panel de propietario.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-border/80 bg-surface space-y-2 shadow-2xs">
            <h3 className="font-display font-bold text-foreground text-sm sm:text-base">
              ¿Cómo puedo comenzar mi prueba gratuita de 14 días?
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Solo necesitas hacer clic en "Comenzar prueba", ingresar los datos de tu lavandería en {city} y en menos de 2 minutos estarás listo para registrar tu primera orden. No solicitamos tarjeta de crédito.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 10. CTA FINAL ─── */}
      <section className="bg-gradient-to-br from-[#1B4B73] to-[#0f2c45] text-white py-20 px-6 text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto space-y-6 relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F0B900]/20 text-[#F0B900] border border-[#F0B900]/30">
            <Sparkles className="h-3.5 w-3.5" /> 14 Días de Prueba Sin Compromiso
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-black tracking-tight">
            Moderniza tu lavandería en {fullName} hoy mismo
          </h2>
          <p className="text-sm sm:text-base text-slate-200 max-w-xl mx-auto leading-relaxed">
            Únete a los negocios de {city} que han automatizado sus operaciones, eliminado descuadres y aumentado su rentabilidad con Klynn.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link to="/registro">
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
    </div>
  );
}
