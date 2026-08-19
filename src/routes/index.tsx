import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowRight,
  Sparkles,
  Receipt,
  Wallet,
  Users,
  Truck,
  BarChart3,
  Shield,
  Printer,
  Check,
  Zap,
  MapPin,
  Phone,
  Clock,
  TrendingUp,
  Smartphone,
  CreditCard,
  FileText,
  Star,
  Building2,
  Headphones,
  Cloud,
  Lock,
  Globe,
  Calculator,
  MessageCircle,
  Package,
  Scissors,
  Banknote,
  Menu,
  X,
  Droplets,
  Download,
  Monitor,
  HardDrive,
  Wifi,
  Layers,
  MessageSquare,
} from "lucide-react";
import { Logo } from "@/components/klynn/Logo";
import { SeedBootstrap } from "@/components/klynn/SeedBootstrap";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LandingNavbar } from "@/components/klynn/LandingNavbar";
import { PLANS as STATIC_PLANS, formatRD, getPlans, type Plan } from "@/lib/storage";
import DRMap from "@/components/klynn/DRMap";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Klynn — Software #1 para lavanderías en República Dominicana | POS, ITBIS y NCF" },
      {
        name: "description",
        content:
          "La plataforma #1 para lavanderías en República Dominicana. Controla tus sucursales, repartidores, caja y WhatsApp desde la nube. ¡Simplifica tu operación y crece hoy mismo!",
      },
      {
        name: "keywords",
        content:
          "plataforma para lavanderías RD, software para lavanderías República Dominicana, sistema POS lavandería RD, gestión lavandería dominicana, control de repartidores lavandería, software lavandería Santo Domingo, programa lavandería Santiago",
      },
      { property: "og:title", content: "Klynn — Software para lavanderías en República Dominicana" },
      { property: "og:description", content: "Moderniza tu lavandería con nuestra plataforma integral. Controla sucursales, repartidores y caja desde la nube. Prueba gratis 14 días." },
      { property: "og:locale", content: "es_DO" },
    ],
  }),
  loader: async () => {
    try {
      const plans = await getPlans();
      return { plans: plans && plans.length > 0 ? plans : STATIC_PLANS };
    } catch (e) {
      console.warn("Loader failed to fetch dynamic plans, falling back to static plans", e);
      return { plans: STATIC_PLANS };
    }
  },
  component: LandingPage,
});

const features = [
  { icon: Receipt, title: "Órdenes y facturas con NCF", desc: "Flujo guiado de nueva orden con prendas, peso y cobro mixto. ITBIS 18% y secuencias NCF (B01, B02, B14, B15) configurables por sucursal." },
  { icon: Printer, title: "Tickets térmicos 57/80mm", desc: "Impresión ESC/POS compatible con Epson, Xprinter, Bixolon y Star. Logo, RNC y pie de página personalizados." },
  { icon: Wallet, title: "Caja y cuadre diario", desc: "Apertura, movimientos en vivo, gastos de caja chica, cobros por efectivo, tarjeta y transferencia. Cierre con firma del cajero." },
  { icon: Users, title: "CRM dominicano", desc: "Historial por cliente, deudas, abonos, clientes VIP y crédito autorizado. Cumpleaños y avisos automáticos por WhatsApp." },
  { icon: Truck, title: "Entregas a domicilio", desc: "Asigna repartidores, rutas por sector (Naco, Piantini, Bella Vista, Los Jardinesâ€¦) y notifica al cliente al salir y al llegar." },
  { icon: BarChart3, title: "Reportes para la DGII", desc: "606, 607 y resumen de ITBIS exportable en CSV y XLSX. Llega listo a tu contador cada mes." },
  { icon: Scissors, title: "Módulo de sastrería", desc: "Ajustes, ruedos, cierres y composturas con medidas y entrega coordinada con el lavado." },
  { icon: Package, title: "Lavado por libra y prendas", desc: "Cobra por peso (lb/kg) o por prenda. Combina ambos en la misma orden con cargos de planchado, suavizante o rapidez." },
  { icon: Smartphone, title: "WhatsApp integrado", desc: "Envía recibos, recordatorios de retiro y promociones desde el sistema. Tu cliente recibe el ticket en su celular." },
];

const testimonios = [
  {
    nombre: "Rosa Guzmán",
    negocio: "MR Lavandería Express, Haina, San Cristóbal",
    texto: "Klynn marcó un antes y un después en mi lavandería. Hoy mantengo mi CXC organizada, no pierdo facturas y tengo control total de la operación. Es ahorro de tiempo y atención al cliente más eficiente gracias a la automatización. La plataforma es intuitiva y el soporte técnico vía WhatsApp brinda respuesta inmediata. Gracias Klynn por facilitarme la gestión.",
  },
  {
    nombre: "Manuel Tavárez",
    negocio: "Express Wash, Santiago de los Caballeros",
    texto: "El soporte responde al instante por WhatsApp y la plataforma es sumamente fácil de usar. La generación de comprobantes fiscales y reportes me ahorra horas de trabajo cada mes.",
  },
  {
    nombre: "Carolina Méndez",
    negocio: "Cleanette, Punta Cana",
    texto: "Superviso mis sucursales directamente desde la laptop en mi oficina. Veo en tiempo real cuánto vende cada local y el estado del dinero en caja al cierre del día. Excelente sistema.",
  },
];

const faqs = [
  {
    q: "¿Klynn cumple con la normativa de la DGII en República Dominicana?",
    a: "Sí. Manejamos secuencias NCF (B01 consumidor final, B02 consumo, B14 régimen especial, B15 gubernamental), ITBIS 18% configurable y exportación de los formatos 606 y 607 en CSV y XLSX listos para tu contador o para subir al portal de la DGII.",
  },
  {
    q: "¿Necesito internet siempre para usarlo?",
    a: "Recomendamos conexión estable, pero el sistema sigue tomando órdenes en modo offline y sincroniza cuando vuelve la conexión. Ideal para apagones o problemas con Claro, Altice o Viva.",
  },
  {
    q: "¿Funciona con mi impresora térmica?",
    a: "Sí. Soportamos impresoras térmicas ESC/POS de 57mm y 80mm: Epson TM-T20, Xprinter XP-58, Bixolon SRP, Star Micronics y compatibles que se venden en CCN, PriceSmart, Plaza Lama y tiendas de tecnología en todo el país.",
  },
  {
    q: "¿Puedo usarlo desde el celular?",
    a: "Sí. Klynn es 100% web y responsive. Funciona en computadoras, tablets, iPhone y Android sin instalar nada. Ideal para que el dueño revise ventas desde la casa o la playa.",
  },
  {
    q: "¿Cuánto cuesta y en qué moneda?",
    a: "Todos los planes están en pesos dominicanos (RD$) sin sorpresas de tasa de cambio. Empiezas con 14 días gratis sin tarjeta de crédito. Después eliges el plan que se ajuste a tu lavandería.",
  },
  {
    q: "¿Puedo manejar varias sucursales?",
    a: "Sí. Desde el plan Pro puedes administrar múltiples sucursales con caja independiente, empleados por sucursal y reportes consolidados. Perfecto para cadenas en Santo Domingo, Santiago, La Vega o la zona Este.",
  },
  {
    q: "¿Mis datos están seguros?",
    a: "Sí. Tus datos viven cifrados en la nube con copias de seguridad diarias. Cada empleado tiene su usuario y permisos por rol (cajero, admin, repartidor) para que nadie vea más de lo que debe.",
  },
  {
    q: "¿Ofrecen soporte en español?",
    a: "Por supuesto. Equipo dominicano que responde por WhatsApp, correo y videollamada en horario laboral RD. Te ayudamos a configurar tu primera lavandería sin costo.",
  },
];

const ciudades = [
  "Santo Domingo", "Santiago", "La Vega", "San Pedro de Macorís", "San Cristóbal",
  "Puerto Plata", "La Romana", "Higüey", "Punta Cana", "Bávaro", "Bonao", "Moca",
  "San Francisco de Macorís", "Baní", "Azua", "Barahona", "Mao", "Nagua",
];

/* â”€â”€ CountUp: tick-up animation on viewport enter (hum-07 1:1) â”€â”€ */
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
      const eased = 1 - Math.pow(1 - p, 3); // cubic ease-out
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

function LandingPage() {
  const { plans: initialPlans } = Route.useLoaderData();
  const [plans, setPlans] = useState<Plan[]>(initialPlans || STATIC_PLANS);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [activeWaTab, setActiveWaTab] = useState<"lista" | "recibo">("lista");

  useEffect(() => {
    if (!initialPlans || initialPlans.length === 0) {
      getPlans().then((p) => {
        if (p && p.length > 0) setPlans(p);
      });
    }
  }, [initialPlans]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeedBootstrap />

      {/* JSON-LD: SoftwareApplication + LocalBusiness */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Klynn",
            "url": "https://klynn.com.do/",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            description:
              "Software de gestión para lavanderías en República Dominicana con ITBIS, NCF, tickets térmicos, caja, clientes y reportes DGII.",
            offers: {
              "@type": "Offer",
              price: "1500",
              priceCurrency: "DOP",
            },
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: "4.9",
              ratingCount: "127",
            },
            areaServed: { "@type": "Country", name: "Dominican Republic" },
            inLanguage: "es-DO",
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Klynn",
            "url": "https://klynn.com.do/",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://klynn.com.do/search?q={search_term_string}",
              "query-input": "required name=search_term_string"
            }
          }),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "itemListElement": [
              {
                "@type": "SiteNavigationElement",
                "position": 1,
                "name": "Funciones y Características",
                "url": "https://klynn.com.do/#features"
              },
              {
                "@type": "SiteNavigationElement",
                "position": 2,
                "name": "Planes y Precios",
                "url": "https://klynn.com.do/#planes"
              },
              {
                "@type": "SiteNavigationElement",
                "position": 3,
                "name": "Iniciar sesión",
                "url": "https://klynn.com.do/login"
              },
              {
                "@type": "SiteNavigationElement",
                "position": 4,
                "name": "Crear cuenta gratis",
                "url": "https://klynn.com.do/registro"
              },
              {
                "@type": "SiteNavigationElement",
                "position": 5,
                "name": "Preguntas frecuentes",
                "url": "https://klynn.com.do/#faq"
              }
            ]
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Inicio",
                "item": "https://klynn.com.do/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Login",
                "item": "https://klynn.com.do/login"
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": "Registro",
                "item": "https://klynn.com.do/registro"
              }
            ]
          }),
        }}
      />

      <LandingNavbar />

      {/* HERO SECTION - EXACT HUM-07 HTML 1:1 REPLICATION */}
      <section className="hero">
        <div className="hero__grid">
          <div className="hero__lead">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 mb-3 select-none">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Software de Gestión Operativa</span>
            </div>
            <h1 className="hero__title">
              El software #1 para <span style={{ color: "var(--color-anil, #1B4B73)" }}>lavanderías</span> en República Dominicana.
            </h1>
            <p className="hero__lede">
              Cobra con ITBIS y NCF, imprime tickets térmicos 57/80mm, controla caja, clientes y entregas desde una sola pantalla. Multi-sucursal, en pesos dominicanos y con soporte criollo por WhatsApp.
            </p>
            <div className="hero__cta">
              <Link to="/registro" className="btn btn--anil">
                Comenzar prueba de 14 días <span className="btn__arrow">→</span>
              </Link>
              <a href="https://wa.link/vxstq4" target="_blank" rel="noopener noreferrer" className="btn btn--outline btn--ink">
                Solicitar demostración
              </a>
            </div>
            <div className="hero__checks">
              <span><span className="check-icon">✓</span> Sin tarjeta de crédito</span>
              <span><span className="check-icon">✓</span> Cancela cuando quieras</span>
              <span><span className="check-icon">✓</span> Datos en la nube</span>
            </div>
          </div>

          <div className="hero__stage">
            <div className="ticket-card" id="starter">
              <div className="ticket-card__head">
                <div className="ticket-card__logo">
                  <span className="bub-mark" aria-hidden="true"></span>
                </div>
                <p className="ticket-card__title">Lavandería La Burbuja</p>
                <p className="ticket-card__sub">RNC: 131-12345-6<br />Tel: 809-555-0142</p>
              </div>
              <hr className="ticket-card__hr" />
              <div className="ticket-card__meta">
                <div>ORDEN: KL-202605-0042</div>
                <div>NCF: B0200000123</div>
                <div>Fecha: 02/05/2026 10:30 AM</div>
                <div>Cliente: Juan Pérez</div>
              </div>
              <hr className="ticket-card__hr" />
              <div className="ticket-card__items">
                <div className="ticket-card__item">
                  <span>Camisa M/L x2</span>
                  <span>RD$ 300.00</span>
                </div>
                <div className="ticket-card__item">
                  <span>Pantalón vestir x1</span>
                  <span>RD$ 200.00</span>
                </div>
                <div className="ticket-card__item">
                  <span>Lavado/lb 3.5lb</span>
                  <span>RD$ 280.00</span>
                </div>
              </div>
              <hr className="ticket-card__hr" />
              <div className="ticket-card__totals">
                <div className="ticket-card__total-row">
                  <span>Subtotal</span>
                  <span>RD$ 780.00</span>
                </div>
                <div className="ticket-card__total-row">
                  <span>ITBIS 18%</span>
                  <span>RD$ 140.40</span>
                </div>
                <div className="ticket-card__total-row ticket-card__total-row--final">
                  <span>TOTAL</span>
                  <span>RD$ 920.40</span>
                </div>
              </div>
              <p className="ticket-card__footer">¡Gracias por su visita! 🧺 · 57mm / 80mm</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── EL IMPACTO EN TU LAVANDERÍA (HUM-07 1:1) ─── */}
      <section className="border-y border-border bg-surface-elevated py-16 md:py-20" id="impacto">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <p className="eyebrow justify-center">
              <span className="eyebrow__dot" style={{ background: "#22c55e" }}></span> EL IMPACTO EN TU LAVANDERÍA
            </p>
            <h2 className="section__title text-balance" style={{ margin: "0 auto", maxWidth: "42ch" }}>
              Más rapidez en mostrador. Control total de tus ingresos.
            </h2>
          </div>
          <dl className="numbers">
            <div className="bignum">
              <dd className="bignum__v">
                <span className="bignum__pre">≈</span>
                <CountUp to={30} />
                <span className="bignum__u">seg</span>
              </dd>
              <dt className="bignum__k">Tiempo promedio para registrar una orden de cliente.</dt>
            </div>
            <div className="bignum">
              <dd className="bignum__v">
                <CountUp to={100} />
                <span className="bignum__u">%</span>
              </dd>
              <dt className="bignum__k">Facturación electrónica 100% operativa con NCF, e-CF e ITBIS integrado.</dt>
            </div>
            <div className="bignum">
              <dd className="bignum__v">
                <CountUp to={0} />
              </dd>
              <dt className="bignum__k">Prendas extraviadas gracias a la gestión eficaz del sistema Klynn.</dt>
            </div>
          </dl>
        </div>
      </section>

      {/* PROBLEMA / SOLUCIÓN */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">¿Por qué Klynn?</div>
            <h2 className="text-balance text-4xl md:text-5xl">
              Deja la libreta y el Excel. <span className="text-primary">Tu lavandería merece más.</span>
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              En República Dominicana, la mayoría de las lavanderías todavía anota órdenes a mano,
              pierde tickets y cuadra la caja "a ojo". El resultado: prendas perdidas, clientes molestos
              y dinero que se va sin saber por dónde.
            </p>
            <p className="mt-4 text-lg text-muted-foreground">
              Klynn nació en Santo Domingo para resolver exactamente eso. Un sistema diseñado con
              dueños de lavanderías dominicanas, que entiende cómo se cobra aquí, cómo se factura el
              ITBIS y cómo se entrega en sectores como Naco, Bella Vista o Los Cacicazgos.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Calculator, t: "ITBIS automático", d: "18% calculado en cada factura, sin errores." },
              { icon: FileText, t: "NCF por tipo", d: "B01, B02, B14, B15 con secuencias auto." },
              { icon: Banknote, t: "Pesos dominicanos", d: "Sin conversiones, sin tasas raras." },
              { icon: Cloud, t: "100% en la nube", d: "Entra desde cualquier dispositivo." },
              { icon: Lock, t: "Permisos por rol", d: "Cajero, admin, repartidor. Cada uno ve lo suyo." },
              { icon: Headphones, t: "Soporte criollo", d: "Te respondemos en WhatsApp en minutos." },
            ].map((b) => (
              <div key={b.t} className="rounded-2xl border border-border bg-surface p-5 shadow-card">
                <b.icon className="mb-3 h-5 w-5 text-primary" />
                <div className="font-display text-lg">{b.t}</div>
                <div className="mt-1 text-sm text-muted-foreground">{b.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="border-y border-border bg-surface-elevated">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-14 mx-auto max-w-2xl text-center">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Operación completa</div>
            <h2 className="text-balance text-3xl md:text-4xl">Todo lo que necesita una lavandería moderna en RD.</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Diseñado junto a lavanderías de Santo Domingo, Santiago y la zona Este. Cubrimos cada paso desde
              que el cliente entra por la puerta hasta el cierre de caja del día.
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
                <h3 className="mb-2 text-xl">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* WHATSAPP INTEGRATION FEATURE SECTION */}
      <section id="whatsapp-integration" className="bg-[#0b132b] text-white py-20 border-y border-slate-800 relative overflow-hidden">
        {/* Glow backdrop decorative gradient */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#25D366]/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="mx-auto max-w-6xl px-6 relative z-10">
          <div className="max-w-3xl mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] text-xs font-bold uppercase tracking-wider mb-6 shadow-[0_0_15px_rgba(37,211,102,0.2)]">
              <span>★</span> FUNCIONALIDAD ESTRELLA
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
              Tu lavandería habla <br />
              <span className="text-[#25D366] drop-shadow-[0_0_25px_rgba(37,211,102,0.45)]">por WhatsApp</span>
            </h2>
            <p className="mt-5 text-lg md:text-xl text-slate-300 leading-relaxed max-w-2xl font-normal">
              Klynn envía notificaciones automáticas a tus clientes directo a WhatsApp. Sin llamadas, sin malentendidos — el cliente sabe exactamente cuándo está lista su ropa.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-12 items-center">
            {/* Left side: Feature Cards */}
            <div className="lg:col-span-7 grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Aviso automático cuando la orden está lista",
                  desc: "Klynn envía el mensaje en cuanto cambias el estado de la orden a 'Lista'. Sin esfuerzo extra para tu personal.",
                  badge: "Tiempo real",
                },
                {
                  title: "Resumen de orden con detalle y precio",
                  desc: "El cliente recibe número de orden, desglose de prendas, ITBIS y total a pagar transparente en su chat.",
                  badge: "Detalle claro",
                },
                {
                  title: "Menos llamadas, más tiempo para trabajar",
                  desc: "Elimina las interrupciones constantes. Tus clientes se mantienen 100% informados sin mover un solo dedo.",
                  badge: "+90% eficiencia",
                },
                {
                  title: "Tickets térmicos digitales y avisos de retiro",
                  desc: "Envía el comprobante con código QR y programa recordatorios automáticos para prendas almacenadas más de 5 días.",
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

            {/* Right side: WhatsApp Chat Simulator Mockup */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-slate-700 bg-slate-950 p-4 shadow-2xl relative overflow-hidden">
                {/* Chat Header */}
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
                    <div className="font-bold text-sm text-white">
                      Lavandería La Burbuja
                    </div>
                    <span className="text-[11px] text-emerald-400 font-medium">WhatsApp Business</span>
                  </div>
                </div>

                {/* Chat Body */}
                <div className="py-4 px-1 space-y-3.5 font-sans text-xs">
                  <AnimatePresence mode="wait">
                    {activeWaTab === "lista" ? (
                      <motion.div
                        key="tab-lista"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-3.5"
                      >
                        {/* 1. Outbound Auto-Notification from Klynn */}
                        <div className="flex justify-end">
                          <div className="bg-[#005c4b] text-slate-100 rounded-2xl rounded-tr-none p-4 max-w-[90%] shadow-md border border-[#007a63]/50">
                            <p className="font-semibold text-white mb-2 text-sm leading-snug">
                              ¡Hola Juan! Tu orden <span className="underline decoration-[#25D366]">KL-202605-0042</span> ya está <span className="bg-[#25D366]/20 text-[#25D366] px-1.5 py-0.5 rounded font-bold">¡LISTA!</span>
                            </p>

                            <div className="bg-black/20 rounded-lg p-2.5 my-2 space-y-1.5 text-[11px] text-slate-200 border border-white/5">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-300 flex items-center gap-1.5"><Package className="h-3.5 w-3.5 text-emerald-400" /> Camisa M/L x2:</span>
                                <span className="font-mono">RD$ 300.00</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-300 flex items-center gap-1.5"><Scissors className="h-3.5 w-3.5 text-emerald-400" /> Pantalón vestir x1:</span>
                                <span className="font-mono">RD$ 200.00</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-300 flex items-center gap-1.5"><Droplets className="h-3.5 w-3.5 text-emerald-400" /> Lavado 3.5 lb:</span>
                                <span className="font-mono">RD$ 280.00</span>
                              </div>
                              <div className="border-t border-white/10 pt-1.5 flex justify-between font-bold text-white text-xs">
                                <span>TOTAL ITBIS INCL.:</span>
                                <span className="text-[#25D366]">RD$ 920.40</span>
                              </div>
                            </div>

                            <div className="text-[11px] text-slate-300 space-y-1 mt-2">
                              <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> Sucursal Naco · Av. Tiradentes #42</div>
                              <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> Horario retiro: Lun-Sáb 8am - 7pm</div>
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

                        {/* 2. Customer Reply */}
                        <div className="flex justify-start">
                          <div className="bg-slate-800 text-slate-200 rounded-2xl rounded-tl-none p-3.5 max-w-[85%] border border-slate-700/60 shadow-sm">
                            <p className="text-sm font-normal">¡Muchas gracias! Estaré allá en 10 minutos a retirarla.</p>
                            <span className="text-[10px] text-slate-400 text-right block mt-1">10:32 AM</span>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="tab-recibo"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-3.5"
                      >
                        {/* 1. Outbound Auto-Receipt / NCF Notification */}
                        <div className="flex justify-end">
                          <div className="bg-[#005c4b] text-slate-100 rounded-2xl rounded-tr-none p-3.5 max-w-[92%] shadow-md border border-[#007a63]/50">
                            <div className="text-center font-bold text-xs text-[#25D366] tracking-wider uppercase mb-1.5 flex items-center justify-center gap-1.5">
                              <FileText className="h-3.5 w-3.5" /> FACTURA PARA CONSUMIDOR FINAL
                            </div>
                            <div className="text-[11px] text-slate-200 space-y-1.5 font-mono bg-black/25 p-3 rounded-xl border border-white/5">
                              <div className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> <strong>Lavandería La Burbuja</strong></div>
                              <div className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" /> RNC: 131-12345-6</div>
                              <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" /> Av. Tiradentes #42, Naco</div>
                              <div className="border-t border-white/10 my-1 pt-1.5 text-slate-300 space-y-1">
                                <div className="flex items-center gap-1.5"><Receipt className="h-3.5 w-3.5 text-slate-400 shrink-0" /> ORDEN: <strong>KL-202605-0042</strong></div>
                                <div className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" /> NCF: <strong>B0200000123</strong></div>
                                <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" /> Fecha: 02/05/2026 10:30 AM</div>
                              </div>
                              <div className="border-t border-white/10 my-1 pt-1.5 text-slate-300 space-y-1">
                                <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-slate-400 shrink-0" /> CLIENTE: Juan Pérez</div>
                                <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" /> Tel: (809) 555-0142</div>
                              </div>
                              <div className="border-t border-white/10 my-1 pt-1.5 space-y-1">
                                <div className="text-emerald-300 font-bold font-sans text-xs flex items-center gap-1.5 mb-1"><Package className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> DETALLE PRENDAS:</div>
                                <div className="pl-2">• Camisa M/L x2: RD$ 300.00</div>
                                <div className="pl-2">• Pantalón vestir x1: RD$ 200.00</div>
                                <div className="pl-2">• Lavado/lb 3.5lb: RD$ 280.00</div>
                              </div>
                              <div className="border-t border-white/10 my-1 pt-1.5 font-bold space-y-0.5">
                                <div>SUBTOTAL: RD$ 780.00</div>
                                <div>ITBIS (18%): RD$ 140.40</div>
                                <div className="text-white text-xs mt-0.5">TOTAL: <span className="text-[#25D366]">RD$ 920.40</span></div>
                              </div>
                              <div className="border-t border-white/10 my-1 pt-1.5 text-[10px] text-slate-300 font-sans space-y-1">
                                <div className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-slate-400 shrink-0" /> Pago: EFECTIVO (Recibido: RD$ 1,000.00 | Vuelto: RD$ 79.60)</div>
                                <div className="flex items-center gap-2">
                                  <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-slate-400" /> Saldo: RD$ 0.00</span>
                                  <span className="flex items-center gap-1 text-emerald-400 font-bold"><Check className="h-3 w-3 text-emerald-400" /> Estado: RECIBIDA</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-2 text-[10px] text-slate-300 text-center font-medium">
                              ¡Gracias por su preferencia!
                            </div>

                            <div className="mt-2 pt-1 border-t border-white/10 flex items-center justify-end text-[10px]">
                              <div className="flex items-center gap-1 text-[#25D366]">
                                <span>10:30 AM</span>
                                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                                  <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.41 11.93l-1.41 1.41 5.66 5.66 12-12-1.42-1.41zM.41 13.34l5.66 5.66 1.41-1.41-5.66-5.66-1.41 1.41z" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 2. Customer Reply */}
                        <div className="flex justify-start">
                          <div className="bg-slate-800 text-slate-200 rounded-2xl rounded-tl-none p-3.5 max-w-[85%] border border-slate-700/60 shadow-sm">
                            <p className="text-sm font-normal">¡Excelente! Gracias por la confirmación y por el recibo digital.</p>
                            <span className="text-[10px] text-slate-400 text-right block mt-1">10:31 AM</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Interactive Tab Toggle Buttons */}
                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveWaTab("lista")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      activeWaTab === "lista"
                        ? "bg-[#25D366] text-slate-950 shadow-[0_0_15px_rgba(37,211,102,0.35)]"
                        : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" /> Orden Lista
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveWaTab("recibo")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      activeWaTab === "recibo"
                        ? "bg-[#25D366] text-slate-950 shadow-[0_0_15px_rgba(37,211,102,0.35)]"
                        : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <Receipt className="h-3.5 w-3.5" /> Recibo Digital (NCF)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-14 text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Empieza en 5 minutos</div>
          <h2 className="text-balance text-4xl md:text-5xl">Así de fácil arrancas con tu lavandería.</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          {[
            { n: "01", t: "Crea tu cuenta", d: "Regístrate gratis en 1 minuto. Sin tarjeta de crédito." },
            { n: "02", t: "Configura tu negocio", d: "Sube tu logo, RNC, sucursales y precios de prendas." },
            { n: "03", t: "Usa tu impresora", d: "Térmica 57 u 80mm. Plug & play con ESC/POS." },
            { n: "04", t: "Empieza a cobrar", d: "Recibe órdenes, imprime tickets y cuadra caja." },
          ].map((s) => (
            <div key={s.n} className="relative rounded-2xl border border-border bg-surface p-6 shadow-card">
              <div className="font-display text-5xl font-black text-primary/35 tracking-tight">{s.n}</div>
              <div className="mt-2 font-display text-xl font-bold text-slate-900">{s.t}</div>
              <div className="mt-2 text-sm text-muted-foreground">{s.d}</div>
            </div>
          ))}
        </div>
      </section>


      {/* PARA QUIÉN */}
      <section id="sectores" className="border-y border-border bg-surface-elevated">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-14 mx-auto max-w-2xl text-center">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Para quién es</div>
            <h2 className="text-balance text-3xl md:text-4xl">Cualquier lavandería dominicana, sin importar el tamaño.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Building2, t: "Lavanderías de barrio", d: "Manejas 30–80 órdenes al día. Necesitas cobrar rápido, imprimir ticket y no perder prendas. Klynn te lo resuelve desde RD$2,500/mes." },
              { icon: TrendingUp, t: "Cadenas multi-sucursal", d: "Tienes 2 o más locales en Santo Domingo, Santiago o la zona Este. Consolida ventas, inventario y empleados en un solo panel." },
              { icon: Star, t: "Lavanderías premium", d: "Tintorería, sastrería, planchado fino y entrega a domicilio. Cobra como hotel 5 estrellas con tickets y WhatsApp de marca." },
            ].map((s) => (
              <div key={s.t} className="rounded-2xl border border-border bg-surface p-7 shadow-card">
                <s.icon className="mb-4 h-7 w-7 text-primary" />
                <div className="font-display text-2xl font-bold text-slate-900">{s.t}</div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>

          {/* ─── Section · Klynn Desktop ─── */}
          <div className="mt-12" id="desktop">
            <div className="desktop-box">
              <div className="desktop-grid">
                <div>
                  <p className="eyebrow" style={{ color: "var(--color-anil, #1B4B73)", opacity: 1 }}>
                    <span className="eyebrow__dot" style={{ background: "var(--color-yellow, #F0B900)" }}></span> ¡NUEVO! VERSIÓN DESKTOP
                  </p>
                  <h2 className="section__title" id="desktop-title">
                    Klynn <span style={{ color: "var(--color-anil, #1B4B73)" }}>Desktop</span>
                  </h2>
                  <p className="section__lede">
                    Toda la potencia de Klynn instalada directamente en tu computadora Windows. Sin internet, sin suscripción mensual, con acceso ilimitado a tus datos.
                  </p>
                  <ul className="desktop-features">
                    <li>
                      <span className="desktop-features__icon">✓</span>
                      <span><strong>Funciona 100% sin internet:</strong> Ideal para zonas con señal inestable o apagones.</span>
                    </li>
                    <li>
                      <span className="desktop-features__icon">✓</span>
                      <span><strong>Datos en tu equipo:</strong> Tu información se guarda localmente, tú la controlas.</span>
                    </li>
                    <li>
                      <span className="desktop-features__icon">✓</span>
                      <span><strong>Impresoras térmicas ESC/POS:</strong> 57mm y 80mm. Plug & play igual que la versión cloud.</span>
                    </li>
                    <li>
                      <span className="desktop-features__icon">✓</span>
                      <span><strong>Rendimiento ultra rápido:</strong> Sin latencia de red. Respuesta instantánea en cada acción.</span>
                    </li>
                  </ul>
                  <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", marginTop: "1.5rem" }}>
                    <Link to="/descargar" search={{ autostart: true }} className="btn btn--anil">
                      Descargar gratis <span className="btn__arrow" aria-hidden="true">↓</span>
                    </Link>
                    <span style={{ fontFamily: "var(--font-label, monospace)", fontSize: "11px", color: "var(--color-muted, #64748b)" }}>
                      Windows 10 / 11 · 174 MB
                    </span>
                  </div>
                </div>
                <div className="desktop-window">
                  <div className="desktop-window__bar">
                    <span className="desktop-window__dot desktop-window__dot--red"></span>
                    <span className="desktop-window__dot desktop-window__dot--yellow"></span>
                    <span className="desktop-window__dot desktop-window__dot--green"></span>
                    <span className="desktop-window__title">Klynn Desktop v2.4</span>
                  </div>
                  <div className="desktop-window__body">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--color-rule, #e2e8f0)" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Caja #1 Mostrador</span>
                      <span style={{ background: "#16a34a", color: "#fff", fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "99px" }}>MODO OFFLINE</span>
                    </div>
                    <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.75rem", color: "var(--color-ink-2, #334155)", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span>ORDEN #4829</span><span>RD$ 450.00</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span>ORDEN #4830</span><span>RD$ 1,200.00</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span>ORDEN #4831</span><span>RD$ 380.00</span></div>
                    </div>
                    <div style={{ background: "rgba(27, 75, 115, 0.08)", padding: "0.6rem", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 600, textAlign: "center", color: "var(--color-anil, #1B4B73)" }}>
                      ✓ Sincronización automática pendiente (3 órdenes)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MÓDULOS PREMIUM */}
      <section id="modulos" className="border-y border-border bg-surface-elevated">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-14 mx-auto max-w-2xl text-center">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Módulos disponibles</div>
            <h2 className="text-balance text-3xl md:text-4xl">Módulos que potencian tu lavandería.</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Cada módulo amplía las capacidades de Klynn según las necesidades de tu negocio. Actívalos desde tu plan y escala sin límites.
            </p>
          </div>

          <div className="space-y-16">
            {/* 1. Facturación Electrónica */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6 }}
              className="grid gap-8 md:grid-cols-2 items-center"
            >
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 font-display text-xl font-black shrink-0">1</div>
                  <h3 className="font-display text-2xl md:text-3xl">Facturación Electrónica</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Cumple con las normativas fiscales de la DGII sin complicaciones. Genera comprobantes electrónicos (e-CF) directamente desde Klynn, sin necesidad de sistemas externos.
                </p>
                <div className="space-y-3">
                  {[
                    "Generación automática de NCF y e-CF (facturas de crédito fiscal, consumo, notas de crédito/débito)",
                    "Envío directo a la DGII desde tu panel — sin intermediarios",
                    "Historial completo de comprobantes para auditorías y reportes",
                    "Compatible con impresoras térmicas 57mm y 80mm para impresión de facturas fiscales",
                    "Panel de homologación integrado para completar el proceso DGII",
                  ].map((b, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm">
                      <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                      <span className="text-foreground/80">{b}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-8 shadow-card">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">Factura Electrónica</div>
                    <div className="text-[11px] text-muted-foreground">e-CF · Klynn Cloud</div>
                  </div>
                </div>
                <div className="space-y-3 text-xs font-mono">
                  <div className="flex justify-between border-b border-border/60 pb-2">
                    <span className="text-muted-foreground">RNC Emisor</span>
                    <span className="font-semibold">1-31-12345-6</span>
                  </div>
                  <div className="flex justify-between border-b border-border/60 pb-2">
                    <span className="text-muted-foreground">NCF</span>
                    <span className="font-semibold text-emerald-600">E310000000001</span>
                  </div>
                  <div className="flex justify-between border-b border-border/60 pb-2">
                    <span className="text-muted-foreground">Tipo</span>
                    <span className="font-semibold">Factura de Crédito Fiscal</span>
                  </div>
                  <div className="flex justify-between border-b border-border/60 pb-2">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">RD$ 2,500.00</span>
                  </div>
                  <div className="flex justify-between border-b border-border/60 pb-2">
                    <span className="text-muted-foreground">ITBIS (18%)</span>
                    <span className="font-semibold">RD$ 450.00</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="font-bold text-foreground">Total</span>
                    <span className="font-black text-emerald-600 text-sm">RD$ 2,950.00</span>
                  </div>
                </div>
                <div className="mt-4 rounded-xl bg-emerald-500/10 p-3 text-center text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                  ✓ Enviado a DGII · Aceptado
                </div>
              </div>
            </motion.div>

            {/* 2. Multisucursal */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6 }}
              className="grid gap-8 md:grid-cols-2 items-center"
            >
              <div className="md:order-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 font-display text-xl font-black shrink-0">2</div>
                  <h3 className="font-display text-2xl md:text-3xl">Multisucursal</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Gestiona todas tus sucursales desde un solo lugar. Alterna entre locales en segundos y mantén el control operativo de tu cadena de lavanderías.
                </p>
                <div className="space-y-3">
                  {[
                    "Conmutador rápido entre sucursales desde la barra superior sin necesidad de cerrar sesión",
                    "Cada sucursal opera con su propia caja, clientes, catálogo y equipo de trabajo independientes",
                    "Registro de nuevas sucursales vinculado automáticamente a la suscripción de tu plan principal",
                    "Control de acceso y permisos por sucursal para que cada empleado vea solo su punto de venta",
                    "Personalización de marca (logotipo y colores) independiente para cada local",
                  ].map((b, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm">
                      <Check className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                      <span className="text-foreground/80">{b}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="md:order-1 rounded-2xl border border-border bg-surface p-8 shadow-card">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-4">Panel multi-sucursal</div>
                <div className="space-y-3">
                  {[
                    { name: "Sucursal Gazcue", orders: 142, revenue: "RD$ 78,400", status: "Abierta" },
                    { name: "Sucursal Naco", orders: 89, revenue: "RD$ 52,100", status: "Abierta" },
                    { name: "Sucursal Bella Vista", orders: 67, revenue: "RD$ 38,900", status: "Cerrada" },
                  ].map((s) => (
                    <div key={s.name} className="flex items-center justify-between rounded-xl bg-accent/30 p-3">
                      <div>
                        <div className="font-bold text-sm">{s.name}</div>
                        <div className="text-[11px] text-muted-foreground">{s.orders} órdenes este mes</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-sm text-blue-600">{s.revenue}</div>
                        <div className={`text-[10px] font-bold ${s.status === "Abierta" ? "text-emerald-600" : "text-slate-400"}`}>
                          {s.status === "Abierta" ? "● " : "○ "}{s.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl bg-blue-500/10 p-3 text-center text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                  3 sucursales · RD$ 169,400 consolidado
                </div>
              </div>
            </motion.div>

            {/* 3. Envío a domicilio */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6 }}
              className="grid gap-8 md:grid-cols-2 items-center"
            >
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 font-display text-xl font-black shrink-0">3</div>
                  <h3 className="font-display text-2xl md:text-3xl">Envío a domicilio</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Gestión eficiente de pedidos para entrega a domicilio. Controla tus órdenes desde que están listas hasta que son entregadas en la puerta de tu cliente.
                </p>
                <div className="space-y-3">
                  {[
                    "Control de estados de entrega: Lista (Pendiente de envío), En camino y Entregada",
                    "Asignación de repartidores por orden para llevar el control de quién entrega cada pedido",
                    "Cobro de tarifa fija de delivery integrado directamente al total de la orden",
                    "Contacto directo por teléfono o WhatsApp con el cliente para coordinar la entrega en un clic",
                    "Barra de progreso de entregas del día y tiempo transcurrido por paquete",
                  ].map((b, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm">
                      <Check className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                      <span className="text-foreground/80">{b}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-8 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Progreso de entregas hoy</div>
                  <div className="text-xs font-bold text-orange-600">67% completado</div>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mb-6 overflow-hidden">
                  <div className="bg-orange-500 h-2 rounded-full w-[67%]" />
                </div>
                <div className="space-y-3">
                  {[
                    { driver: "Carlos M.", order: "#4832", address: "Av. Tiradentes #45", status: "En camino", color: "text-orange-600 bg-orange-50 border-orange-200" },
                    { driver: "Miguel R.", order: "#4829", address: "Calle El Conde #102", status: "Entregada", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
                    { driver: "Sin asignar", order: "#4835", address: "Av. Winston Churchill", status: "Lista", color: "text-blue-600 bg-blue-50 border-blue-200" },
                  ].map((d) => (
                    <div key={d.order} className="flex items-center justify-between rounded-xl border border-border bg-white dark:bg-slate-900 p-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                          <Truck className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <div className="font-bold text-sm flex items-center gap-2">
                            <span>{d.order}</span>
                            <span className="text-xs font-normal text-muted-foreground">({d.driver})</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-[160px]">{d.address}</div>
                        </div>
                      </div>
                      <div className={`text-[10px] font-bold px-2 py-1 rounded border ${d.color}`}>{d.status}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl bg-orange-500/10 p-3 text-center text-[11px] font-bold text-orange-700 uppercase tracking-wider">
                  2 entregadas · 1 en camino · 1 pendiente (Monto fijo RD$ 150)
                </div>
              </div>
            </motion.div>

            {/* 4. Tablero de Procesos */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6 }}
              className="grid gap-8 md:grid-cols-2 items-center"
            >
              <div className="md:order-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 font-display text-xl font-black shrink-0">4</div>
                  <h3 className="font-display text-2xl md:text-3xl">Tablero de Procesos</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Visualiza el flujo completo de trabajo en 3 columnas Kanban: Recibidas, En Proceso y Terminado. Mueve órdenes entre estados con un clic y mantén el control total de tu operación.
                </p>
                <div className="space-y-3">
                  {[
                    "3 columnas Kanban: RECIBIDAS (en recepción) → EN PROCESO (en producción) → TERMINADO (listas para entrega)",
                    "Cambia el estado de cada orden con un clic — se actualiza al instante en todo el sistema",
                    "Filtro de órdenes urgentes destacadas con marcador de prioridad",
                    "Alerta de prendas sin retirar: configura los días de almacenamiento y notifica por WhatsApp",
                    "Búsqueda rápida por número de orden, cliente o servicio desde el tablero",
                  ].map((b, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm">
                      <Check className="h-4 w-4 text-violet-600 mt-0.5 shrink-0" />
                      <span className="text-foreground/80">{b}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="md:order-1 rounded-2xl border border-border bg-surface p-6 shadow-card">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-4">Tablero de Procesos · Vista Kanban</div>
                <div className="grid grid-cols-3 gap-3">
                  {/* RECIBIDAS */}
                  <div className="space-y-2">
                    <div className="rounded-lg bg-blue-600/85 text-white px-3 py-2 text-center">
                      <div className="text-[10px] font-bold uppercase tracking-wider">Recibidas</div>
                      <div className="text-lg font-black">14</div>
                    </div>
                    {[
                      { id: "#4832", client: "María López", service: "Lavado y Sec.", urgent: true },
                      { id: "#4835", client: "Juan Pérez", service: "Planchado", urgent: false },
                      { id: "#4837", client: "Ana Díaz", service: "Lavado Completo", urgent: false },
                    ].map((o) => (
                      <div key={o.id} className={`rounded-lg border bg-white dark:bg-slate-900 p-2.5 text-[11px] shadow-sm ${o.urgent ? "border-red-300 ring-1 ring-red-200" : "border-border"}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-foreground">{o.id}</span>
                          {o.urgent && <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">🔥 URGENTE</span>}
                        </div>
                        <div className="text-muted-foreground truncate">{o.client}</div>
                        <div className="text-blue-600 font-semibold mt-0.5">{o.service}</div>
                      </div>
                    ))}
                  </div>
                  {/* EN PROCESO */}
                  <div className="space-y-2">
                    <div className="rounded-lg bg-amber-500/85 text-white px-3 py-2 text-center">
                      <div className="text-[10px] font-bold uppercase tracking-wider">En Proceso</div>
                      <div className="text-lg font-black">8</div>
                    </div>
                    {[
                      { id: "#4828", client: "Pedro Santos", service: "Lavado + Planch." },
                      { id: "#4830", client: "Rosa Marte", service: "Tintorería" },
                    ].map((o) => (
                      <div key={o.id} className="rounded-lg border border-border bg-white dark:bg-slate-900 p-2.5 text-[11px] shadow-sm">
                        <div className="font-bold text-foreground mb-1">{o.id}</div>
                        <div className="text-muted-foreground truncate">{o.client}</div>
                        <div className="text-amber-600 font-semibold mt-0.5">{o.service}</div>
                      </div>
                    ))}
                  </div>
                  {/* TERMINADO */}
                  <div className="space-y-2">
                    <div className="rounded-lg bg-emerald-600/85 text-white px-3 py-2 text-center">
                      <div className="text-[10px] font-bold uppercase tracking-wider">Terminado</div>
                      <div className="text-lg font-black">22</div>
                    </div>
                    {[
                      { id: "#4825", client: "Luis García", service: "Lavado y Sec.", days: 2 },
                      { id: "#4820", client: "Carmen Reyes", service: "Planchado", days: 5 },
                    ].map((o) => (
                      <div key={o.id} className="rounded-lg border border-border bg-white dark:bg-slate-900 p-2.5 text-[11px] shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-foreground">{o.id}</span>
                          {o.days >= 5 && <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">⏳ {o.days}d</span>}
                        </div>
                        <div className="text-muted-foreground truncate">{o.client}</div>
                        <div className="text-emerald-600 font-semibold mt-0.5">{o.service}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 rounded-xl bg-violet-500/10 p-3 text-center text-[11px] font-bold text-violet-700 uppercase tracking-wider">
                  44 órdenes activas · Recibidas 14 · Proceso 8 · Terminado 22
                </div>
              </div>
            </motion.div>

            {/* 5. WhatsApp Cloud Automatizado */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6 }}
              className="grid gap-8 md:grid-cols-2 items-center"
            >
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 font-display text-xl font-black shrink-0">5</div>
                  <h3 className="font-display text-2xl md:text-3xl">WhatsApp Cloud Automatizado</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Comunícate con tus clientes en piloto automático. Envía tickets digitales, notificaciones de ropa lista y recordatorios de entrega sin tocar un solo botón.
                </p>
                <div className="space-y-3">
                  {[
                    "Envío automático del ticket digital con enlace de seguimiento interactivo al recibir la orden",
                    "Aviso instantáneo por WhatsApp cuando las prendas están lavadas, planchadas y listas para retirar",
                    "Notificación de salida a reparto con datos del chofer y confirmación de entrega en domicilio",
                    "Recordatorios automáticos para prendas almacenadas que llevan más de 3 días listas",
                    "Plantillas verificadas con el logotipo, nombre y teléfono oficial de tu lavandería",
                  ].map((b, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm">
                      <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                      <span className="text-foreground/80">{b}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-6 sm:p-7 shadow-card">
                <div className="flex items-center justify-between mb-4 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm">Notificación de Orden</div>
                      <div className="text-[11px] text-muted-foreground">Klynn WhatsApp Cloud API</div>
                    </div>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">Enviado</Badge>
                </div>
                <div className="rounded-2xl bg-emerald-950/5 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40 p-4 space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                    <MessageCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>Lavandería Central ✨</span>
                  </div>
                  <p className="text-foreground/90 text-xs leading-relaxed">
                    ¡Hola <strong>María</strong>! 👋 Tu orden <strong>#KL-0097</strong> ya está lavada, planchada y <strong>lista para retirar</strong> en nuestra sucursal.
                  </p>
                  <div className="rounded-xl bg-white dark:bg-slate-900 border border-border/70 p-3 space-y-1 text-[11px] font-mono shadow-2xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Servicio:</span>
                      <span className="text-foreground font-semibold">Lavado + Planchado</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Total a pagar:</span>
                      <span className="text-emerald-600 font-bold">RD$ 850.00 (Pagado)</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Ubicación:</span>
                      <span className="text-indigo-600 font-bold">Gancho G-04</span>
                    </div>
                  </div>
                  <div className="pt-1 flex items-center justify-between text-[10.5px] text-muted-foreground">
                    <span>klynn.com.do/t/demo/o/4832</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">10:42 AM ✓✓</span>
                  </div>
                </div>
                <div className="mt-4 rounded-xl bg-emerald-500/10 p-2.5 text-center text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                  ✓ 100% Automatizado · Sin intervención manual
                </div>
              </div>
            </motion.div>

            {/* 6. Estantería Virtual */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6 }}
              className="grid gap-8 md:grid-cols-2 items-center"
            >
              <div className="md:order-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 font-display text-xl font-black shrink-0">6</div>
                  <h3 className="font-display text-2xl md:text-3xl">Estantería Virtual & Control de Ganchos</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Elimina el caos y la pérdida de tiempo buscando prendas en almacén. Mapea físicamente tus ganchos, rieles, casilleros y percheros, ubica cualquier pedido en 5 segundos y mantén el control de ocupación en tiempo real.
                </p>
                <div className="space-y-3">
                  {[
                    "Mapeo de zonas físicas: conveyors rotativos, rieles de ganchos, casilleros doblados y percheros",
                    "Generador de rangos de ganchos automático en lote (ej. G-01 a G-150) en un solo clic",
                    "Asignación y liberación rápida de espacios desde el punto de venta o terminal de etiquetado",
                    "Búsqueda instantánea por número de orden, cliente o código de gancho para entregas inmediatas",
                    "Métricas de ocupación y capacidad en vivo para evitar sobrecargas en el almacén",
                    "Liberación automática del gancho al momento de marcar la orden como entregada al cliente",
                  ].map((b, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm">
                      <Check className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                      <span className="text-foreground/80">{b}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="md:order-1 rounded-2xl border border-border bg-surface p-6 shadow-card">
                <div className="flex items-center justify-between mb-4 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm">Conveyor Principal · Zona A</div>
                      <div className="text-[11px] text-muted-foreground">30 espacios físicos · 8 ocupados</div>
                    </div>
                  </div>
                  <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold">26% Ocupación</Badge>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {[
                    { slot: "Gancho G-01", ord: "#KL-0097", client: "María L.", status: "OCUPADO" },
                    { slot: "Gancho G-02", ord: "#KL-0098", client: "Pedro S.", status: "OCUPADO" },
                    { slot: "Gancho G-03", ord: "", client: "Disponible", status: "LIBRE" },
                    { slot: "Gancho G-04", ord: "#KL-0102", client: "Rosa M.", status: "OCUPADO" },
                    { slot: "Gancho G-05", ord: "", client: "Disponible", status: "LIBRE" },
                    { slot: "Gancho G-06", ord: "", client: "Disponible", status: "LIBRE" },
                    { slot: "Gancho G-07", ord: "#KL-0109", client: "Carlos T.", status: "OCUPADO" },
                    { slot: "Gancho G-08", ord: "", client: "Disponible", status: "LIBRE" },
                  ].map((s) => (
                    <div key={s.slot} className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all shadow-2xs ${s.status === "OCUPADO" ? "bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 text-amber-800 dark:text-amber-200" : "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/70 text-emerald-700 dark:text-emerald-300"}`}>
                      <div className="text-[10.5px] font-extrabold truncate">{s.slot}</div>
                      <div className="text-[9.5px] font-mono mt-0.5 font-bold truncate">{s.ord || "Libre"}</div>
                      <div className="text-[8.5px] font-normal opacity-75 truncate">{s.client}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl bg-indigo-500/10 p-2.5 text-center text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                  ✓ Control de Ubicación Física Activo · Entrega en 5 seg
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* TESTIMONIOS */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-14 text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Lo que dicen los dueños</div>
          <h2 className="text-balance text-4xl md:text-5xl">Lavanderías dominicanas hablando claro.</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonios.map((t) => (
            <div key={t.nombre} className="rounded-2xl border border-border bg-surface p-7 shadow-card">
              <div className="flex gap-0.5 text-gold">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-gold" />)}
              </div>
              <p className="mt-4 text-base leading-relaxed text-foreground">"{t.texto}"</p>
              <div className="mt-5 border-t border-border pt-4">
                <div className="font-display text-base">{t.nombre}</div>
                <div className="text-xs text-muted-foreground">{t.negocio}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PLANES */}
      <section id="planes" className="border-y border-border bg-surface-elevated">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-14 text-center">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Planes en RD$</div>
            <h2 className="text-balance text-4xl md:text-5xl">Precios honestos, sin sorpresas.</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              <strong className="font-bold text-slate-900 dark:text-white">14 días de prueba gratis</strong> en cualquier plan. Cambia o cancela cuando quieras. Pagos en pesos dominicanos.
            </p>

            {/* TOGGLE MENSUAL / ANUAL */}
            <div className="mt-10 flex items-center justify-center gap-4">
              <span className={`text-sm font-bold transition-colors ${billingCycle === "monthly" ? "text-primary" : "text-muted-foreground"}`}>Pago Mensual</span>
              <button
                onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
                className="relative h-7 w-12 rounded-full bg-slate-200 p-1 transition-colors hover:bg-slate-300 cursor-pointer"
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
              const price = billingCycle === "monthly" ? plan.precio_mensual : (plan.precio_anual || (plan.precio_mensual * 12 * 0.85));
              const polarUrl = billingCycle === "monthly" ? plan.polar_product_monthly_url : plan.polar_product_yearly_url;
              const checkoutUrl = polarUrl || "/registro";

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
                      <span className="font-display text-3xl font-bold tracking-tight text-slate-900">{formatRD(price).replace("DOP", "RD$")}</span>
                    </div>
                    <div className="-mt-0.5 text-xs font-semibold text-slate-500">{billingCycle === "monthly" ? "por mes" : "por año"}</div>
                  </div>

                  <div className="my-6 space-y-4.5 text-sm">
                    {/* Límites / Características Básicas */}
                    <div className="space-y-2.5 text-left">
                      <div className="flex items-center gap-2.5 text-slate-700 font-semibold">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-green-700 shrink-0">
                          <circle cx="12" cy="12" r="10" />
                          <path d="m9 12 2 2 4-4" />
                        </svg>
                        <span>{plan.limite_empleados} empleados</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-slate-700 font-semibold">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-green-700 shrink-0">
                          <circle cx="12" cy="12" r="10" />
                          <path d="m9 12 2 2 4-4" />
                        </svg>
                        <span>{plan.limite_ordenes_mes ? `${plan.limite_ordenes_mes.toLocaleString("es-DO")} órdenes/facturas/mes` : "Órdenes/facturas ilimitadas"}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-slate-700 font-semibold">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-green-700 shrink-0">
                          <circle cx="12" cy="12" r="10" />
                          <path d="m9 12 2 2 4-4" />
                        </svg>
                        <span>Caja, clientes, gastos, reportes</span>
                      </div>
                    </div>

                    {/* Módulos Habilitados */}
                    <div className="border-t border-border pt-3.5 text-left">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                        Módulos Habilitados
                      </div>
                      <div className="space-y-2.5">
                        {[
                          { key: "whatsapp", label: "Mensajería WhatsApp", extra: "(Costo adicional)" },
                          { key: "facturacion_fiscal", label: "Facturación Electrónica", extra: "(Costo adicional)" },
                          { key: "multisucursal", label: "Multisucursal", extra: "(Costo adicional)" },
                          { key: "logistica", label: "Envío a domicilio" },
                          { key: "procesos", label: "Tablero de Procesos" },
                          { key: "estanteria", label: "Estantería virtual" },
                        ].map(({ key, label, extra }) => {
                          const v = !!plan.modulos?.[key as keyof typeof plan.modulos];
                          return (
                            <div 
                              key={key} 
                              className={`flex items-center gap-2.5 font-semibold ${
                                v 
                                  ? "text-green-700 dark:text-green-400" 
                                  : "text-slate-400 line-through opacity-70"
                              }`}
                            >
                              {v ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-green-700 shrink-0">
                                  <circle cx="12" cy="12" r="10" />
                                  <path d="m9 12 2 2 4-4" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-350 shrink-0">
                                  <circle cx="12" cy="12" r="10" />
                                  <path d="m15 9-6 6" />
                                  <path d="m9 9 6 6" />
                                </svg>
                              )}
                              <span className="flex items-center flex-wrap gap-1">
                                <span>{label}</span>
                                {extra && (
                                  <span className={`text-[10px] font-normal ${v ? "text-amber-700 dark:text-amber-400" : "text-slate-400"}`}>
                                    {extra}
                                  </span>
                                )}
                                {key === "whatsapp" && v && plan.limite_whatsapp_mes && (
                                  <span className="text-[10px] font-normal text-muted-foreground ml-0.5">
                                    ({plan.limite_whatsapp_mes.toLocaleString("es-DO")} msg/mes)
                                  </span>
                                )}
                                {key === "multisucursal" && v && (
                                  <span className="text-[9px] font-bold text-primary ml-0.5 bg-primary/10 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                    Hasta {1 + (plan.limite_sucursales_adicionales || 0)}
                                  </span>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Características Generales */}
                    <div className="border-t border-border pt-3 space-y-2.5">
                      {[
                        "Clientes ilimitados",
                        "Generación de reportes",
                        "Actualizaciones de software",
                        "Cuentas x cobrar",
                        "Impresión A4/80mm"
                      ].map((feat) => (
                        <div key={feat} className="flex items-center gap-2.5 font-semibold text-slate-500">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-400 shrink-0">
                            <circle cx="12" cy="12" r="10" />
                            <path d="m9 12 2 2 4-4" />
                          </svg>
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {polarUrl ? (
                    <a
                      href={checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`plan-btn mt-auto ${plan.destacado ? "plan-btn--yellow" : "plan-btn--outline"}`}
                    >
                      {plan.destacado ? `Probar Plan ${plan.nombre}` : `Comenzar 14 días gratis`}
                    </a>
                  ) : (
                    <Link
                      to="/registro"
                      className={`plan-btn mt-auto ${plan.destacado ? "plan-btn--yellow" : "plan-btn--outline"}`}
                    >
                      {plan.destacado ? `Probar Plan ${plan.nombre}` : plan.id === "enterprise" ? "Contactar ventas" : "Comenzar 14 días gratis"}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>

          {/* PLAN ESPECIAL (BARRA SUTIL INFERIOR EN LANDING) */}
          {plans.filter(p => !!p.es_especial).length > 0 && (
            <div className="mt-8 space-y-4">
              {plans.filter(p => !!p.es_especial).map((plan) => {
                const price = billingCycle === "monthly" ? plan.precio_mensual : (plan.precio_anual || (plan.precio_mensual * 12 * 0.85));
                const polarUrl = billingCycle === "monthly" ? plan.polar_product_monthly_url : plan.polar_product_yearly_url;
                const checkoutUrl = polarUrl || "/registro";
                const specialLabel = plan.titulo_especial?.trim() || "Plan especial";

                return (
                  <div
                    key={plan.id}
                    className="relative rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 bg-gradient-to-r from-slate-50/90 via-card to-sky-50/30 dark:from-slate-900/70 dark:via-slate-900/50 dark:to-sky-950/20 shadow-xs hover:shadow-sm transition-all"
                  >
                    {/* FILA SUPERIOR: INFORMACIÓN, PRECIO, LÍMITES Y BOTÓN CTA */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3.5 border-b border-border/60">
                      
                      {/* Izquierda: Indicador, Nombre y Precio */}
                      <div className="min-w-[200px]">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 mb-1">
                          <Sparkles className="h-3 w-3 text-sky-600 dark:text-sky-400 shrink-0" />
                          <span>{specialLabel}</span>
                        </div>
                        <div className="font-display text-xl font-bold text-slate-900 dark:text-white leading-tight">{plan.nombre}</div>
                        <div className="mt-0.5 flex items-baseline gap-1">
                          <span className="font-display text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                            {formatRD(price).replace("DOP", "RD$")}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500">
                            {billingCycle === "monthly" ? "/mes" : "/año"}
                          </span>
                        </div>
                      </div>

                      {/* Centro: Límites Clave */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-2 lg:py-0 border-y lg:border-y-0 lg:border-x border-border/60 lg:px-5 flex-1">
                        <div className="space-y-0.5">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            <Users className="h-3 w-3 text-slate-500 shrink-0" />
                            <span>Equipo</span>
                          </div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {plan.limite_empleados} {plan.limite_empleados === 1 ? "Empleado" : "Empleados"}
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            <Package className="h-3 w-3 text-slate-500 shrink-0" />
                            <span>Facturación</span>
                          </div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {plan.limite_ordenes_mes ? `${plan.limite_ordenes_mes.toLocaleString("es-DO")} Órdenes/mes` : "Órdenes ilimitadas"}
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            <MessageSquare className="h-3 w-3 text-blue-500 shrink-0" />
                            <span>WhatsApp</span>
                          </div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {plan.modulos?.whatsapp
                              ? (plan.limite_whatsapp_mes ? `${plan.limite_whatsapp_mes.toLocaleString()} msgs/mes` : "Ilimitados")
                              : "No incluido"}
                          </div>
                        </div>
                      </div>

                      {/* Derecha: Botón CTA */}
                      <div className="shrink-0 min-w-[170px] flex justify-end">
                        {polarUrl ? (
                          <a
                            href={checkoutUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="plan-btn w-full sm:w-auto h-9 px-5 text-xs font-bold shrink-0 plan-btn--outline bg-card hover:bg-muted/80 shadow-2xs"
                          >
                            Probar Plan {plan.nombre}
                          </a>
                        ) : (
                          <Link
                            to="/registro"
                            className="plan-btn w-full sm:w-auto h-9 px-5 text-xs font-bold shrink-0 plan-btn--outline bg-card hover:bg-muted/80 shadow-2xs"
                          >
                            Comenzar 14 días gratis
                          </Link>
                        )}
                      </div>

                    </div>

                    {/* FILA INFERIOR: MÓDULOS HABILITADOS Y CARACTERÍSTICAS GENERALES */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 pt-3.5">
                      
                      {/* Desglose de Módulos */}
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                          MÓDULOS HABILITADOS
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5">
                          {[
                            { key: "whatsapp", label: "Mensajería WhatsApp", extra: "(Costo adicional)" },
                            { key: "facturacion_fiscal", label: "Facturación Electrónica", extra: "(Costo adicional)" },
                            { key: "multisucursal", label: "Multisucursal", extra: "(Costo adicional)" },
                            { key: "logistica", label: "Envío a domicilio" },
                            { key: "procesos", label: "Tablero de Procesos" },
                            { key: "estanteria", label: "Estantería virtual" },
                          ].map(({ key, label, extra }) => {
                            const v = !!plan.modulos?.[key as keyof typeof plan.modulos];
                            return (
                              <div 
                                key={key} 
                                className={`flex items-center gap-1.5 text-[11px] font-semibold ${
                                  v 
                                    ? "text-green-700 dark:text-green-400" 
                                    : "text-slate-400 line-through opacity-70"
                                }`}
                              >
                                {v ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-green-700 shrink-0">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="m9 12 2 2 4-4" />
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-slate-350 shrink-0">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="m15 9-6 6" />
                                    <path d="m9 9 6 6" />
                                  </svg>
                                )}
                                <span className="flex items-center flex-wrap gap-1">
                                  <span>{label}</span>
                                  {extra && (
                                    <span className={`text-[9px] font-normal ${v ? "text-amber-700 dark:text-amber-400" : "text-slate-400"}`}>
                                      {extra}
                                    </span>
                                  )}
                                  {key === "multisucursal" && v && (
                                    <span className="text-[8.5px] font-bold text-primary ml-0.5 bg-primary/10 px-1 py-0.2 rounded uppercase tracking-wider">
                                      Hasta {1 + (plan.limite_sucursales_adicionales || 0)}
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Características Generales */}
                      <div className="border-t md:border-t-0 md:border-l border-border/50 md:pl-5 pt-3 md:pt-0">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                          CARACTERÍSTICAS INCLUIDAS
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5">
                          {[
                            "Clientes ilimitados",
                            "Generación de reportes",
                            "Actualizaciones de software",
                            "Cuentas x cobrar",
                            "Impresión A4/80mm"
                          ].map((feat) => (
                            <div key={feat} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-slate-400 shrink-0">
                                <circle cx="12" cy="12" r="10" />
                                <path d="m9 12 2 2 4-4" />
                              </svg>
                              <span>{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-muted-foreground">
            Todos los planes incluyen 14 días gratis. Sin compromiso, cancela cuando quieras.
            Aceptamos transferencia bancaria, tarjeta de crédito y AzulPagos.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-y border-border bg-surface-elevated">
        <div className="mx-auto max-w-4xl px-6 py-24">
          <div className="mb-12 text-center">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Preguntas frecuentes</div>
            <h2 className="text-balance text-4xl md:text-5xl">Lo que más nos preguntan en RD.</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-border bg-surface p-6 shadow-card">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-display text-lg font-bold">
                  {f.q}
                  <span className="text-primary transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACTO */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: MessageCircle, t: "WhatsApp", d: "+1 (849) 918-2727", s: "Lun–Sáb 8am–8pm" },
            { icon: Phone, t: "Teléfono", d: "+1 (849) 918-2727", s: "Soporte técnico" },
            { icon: Globe, t: "Oficina", d: "Av. 27 de Febrero, Santo Domingo", s: "República Dominicana" },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl border border-border bg-surface p-6 shadow-card">
              <c.icon className="mb-3 h-6 w-6 text-primary" />
              <div className="font-display text-lg font-bold text-slate-900">{c.t}</div>
              <div className="mt-1 text-sm font-bold text-slate-900">{c.d}</div>
              <div className="text-xs text-muted-foreground">{c.s}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-8 md:grid-cols-5">
            <div>
              <Logo size="sm" />
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Software de gestión hecho en República Dominicana 🇩🇴 para lavanderías que quieren crecer ordenadas, cobrar bien y dormir tranquilas.
              </p>
            </div>
            <div>
              <div className="mb-3 text-sm font-semibold">Producto</div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground">Funciones</a></li>
                <li><a href="#planes" className="hover:text-foreground">Planes y precios</a></li>
                <li><a href="#desktop" className="hover:text-foreground">Klynn Desktop</a></li>
                <li><a href="https://wa.link/vxstq4" className="hover:text-foreground">Solicitar demo</a></li>
                <li><Link to="/registro" className="hover:text-foreground">Crear cuenta</Link></li>
              </ul>
            </div>
            <div>
              <div className="mb-3 text-sm font-semibold">Recursos</div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><Link to="/blog" className="hover:text-foreground">Blog y Consejos</Link></li>
                <li><a href="#faq" className="hover:text-foreground">Preguntas frecuentes</a></li>
                <li><a href="#sectores" className="hover:text-foreground">¿Para quién es?</a></li>
                <li><span>Reportes DGII (606/607)</span></li>
              </ul>
            </div>
            <div>
              <div className="mb-3 text-sm font-semibold">Ciudades</div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><Link to="/software-lavanderia-santo-domingo" className="hover:text-foreground">Santo Domingo</Link></li>
                <li><Link to="/software-lavanderia-santiago" className="hover:text-foreground">Santiago</Link></li>
                <li><Link to="/software-lavanderia-punta-cana" className="hover:text-foreground">Punta Cana / Bávaro</Link></li>
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
              © {new Date().getFullYear()} Klynn · Hecho con 🧼 en República Dominicana
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Link to="/terminos" className="hover:text-foreground">Términos</Link>
              <Link to="/privacidad" className="hover:text-foreground">Privacidad</Link>
              <div className="flex items-center gap-3 ml-4">
                <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Datos seguros</span>
                <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" /> Pagos en RD$</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({ children, on }: { children: React.ReactNode; on: boolean }) {
  return (
    <li className={`flex items-start gap-2 ${on ? "" : "opacity-40 line-through"}`}>
      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${on ? "text-success" : "text-muted-foreground"}`} />
      <span>{children}</span>
    </li>
  );
}
