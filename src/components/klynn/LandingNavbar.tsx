import { Link, useLocation } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  MapPin,
  Clock,
  MessageCircle,
  Shield,
  Lock,
  Sparkles,
  ArrowRight,
  Menu,
  X,
  CreditCard,
  Droplets,
  Users,
  BookOpen,
} from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
  { label: "Funciones", href: "/#features", icon: Sparkles, desc: "POS, NCF, ITBIS, tickets" },
  {
    label: "Para quién",
    href: "/#sectores",
    icon: Users,
    desc: "Lavanderías, sastrerías, hoteles",
  },
  { label: "Planes", href: "/#planes", icon: CreditCard, desc: "Desde RD$ 1,500/mes" },
  { label: "Blog", href: "/blog", icon: BookOpen, desc: "Consejos y tecnología" },
  { label: "FAQ", href: "/#faq", icon: MessageCircle, desc: "Preguntas frecuentes" },
];

export function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const [activeHash, setActiveHash] = useState<string>("");

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      setActiveHash(window.location.hash || "");
    };
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (location.pathname !== "/") return;

    const sections = ["features", "sectores", "planes", "faq"];
    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveHash(`#${entry.target.id}`);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      rootMargin: "-20% 0px -50% 0px",
    });

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [location.pathname]);

  const isActive = (itemHref: string) => {
    if (itemHref.startsWith("/blog")) {
      return location.pathname.startsWith("/blog");
    }
    if (location.pathname === "/") {
      if (activeHash) {
        return itemHref === `/${activeHash}`;
      }
      return itemHref === "/#features";
    }
    return false;
  };

  return (
    <>


      {/* NAV HEADER WITH SINGLE FLOATING PILL MORPH ON SCROLL */}
      <header
        className={`sticky top-0 z-50 transition-all duration-500 ease-out ${
          scrolled
            ? "flex justify-center px-3 md:px-6 pt-3 md:pt-4 bg-transparent pointer-events-none"
            : "w-full bg-white border-b border-slate-200/80 shadow-2xs"
        }`}
      >
        <div
          className={`transition-all duration-500 ease-out flex items-center justify-between gap-3 ${
            scrolled
              ? "pointer-events-auto max-w-6xl w-full h-16 py-2.5 rounded-full border border-slate-200/80 bg-white/95 shadow-xl backdrop-blur-2xl px-6 md:px-8"
              : "mx-auto max-w-6xl w-full h-16 md:h-18 px-6 md:px-8 lg:px-10"
          }`}
        >
          <Logo />

          {/* Centered nav items with icons */}
          <nav
            className={`hidden items-center gap-1 text-sm font-medium transition-all duration-300 lg:flex ${
              scrolled
                ? "bg-transparent p-0 border-0 shadow-none text-muted-foreground"
                : "rounded-full border border-slate-200/80 bg-slate-50/80 p-1 text-slate-600 shadow-2xs backdrop-blur"
            }`}
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`group inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 whitespace-nowrap text-sm font-medium transition-all ${
                    active
                      ? "bg-[#EAF2FF] text-[#1B4B73] font-semibold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-[#1B4B73]"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      active ? "text-[#1B4B73]" : "text-slate-500 group-hover:text-[#1B4B73]"
                    }`}
                  />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="https://wa.link/vxstq4"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden h-9 w-9 items-center justify-center rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-sm transition-all hover:scale-105 active:scale-95 md:inline-flex shrink-0 border-0"
              aria-label="WhatsApp"
            >
              <svg className="h-4.5 w-4.5 fill-white" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.197 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.05 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>
            <Link to="/login" className="hidden sm:block">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-slate-700 hover:text-[#1B4B73] gap-1.5 font-semibold"
              >
                <Lock className="h-3.5 w-3.5 text-slate-500" />
                <span>Iniciar sesión</span>
              </Button>
            </Link>
            <Link to="/registro" className="hidden sm:block">
              <Button className="btn btn--yellow btn--nav rounded-full font-bold border-0 gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Probar gratis</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface shadow-card transition hover:bg-accent lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col overflow-hidden bg-white shadow-2xl"
            >
              {/* Drawer header */}
              <div className="relative overflow-hidden border-b border-slate-100 bg-white p-6 pb-5">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex w-full items-start justify-between">
                    <div className="w-9" /> {/* Spacer to balance the close button */}
                    <Logo />
                    <button
                      onClick={() => setMobileOpen(false)}
                      className="h-8 w-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xs border border-slate-200/80"
                      aria-label="Cerrar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <div className="text-xs font-medium text-slate-500">Hecho en RD 🇩🇴</div>
                    <div className="mt-2.5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      <span className="flex items-center gap-1">
                        <Shield className="h-3 w-3" /> ITBIS · NCF
                      </span>
                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> LUN–SÁB 8–8
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nav items */}
              <nav className="flex-1 overflow-y-auto p-4 space-y-5">
                <div>
                  <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Navegación
                  </div>
                  <div className="space-y-1">
                    {NAV_ITEMS.map((item, i) => (
                      <motion.a
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 + i * 0.04 }}
                        className="group flex items-center gap-3 rounded-xl border border-transparent p-2.5 transition hover:bg-slate-50"
                      >
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-[#1B4B73] transition group-hover:bg-[#1B4B73]/10">
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900 leading-tight">{item.label}</div>
                          <div className="truncate text-[11px] text-slate-400 font-medium">
                            {item.desc}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#1B4B73]" />
                      </motion.a>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Contacto
                  </div>
                  <a
                    href="https://wa.link/vxstq4"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-50/50 p-3.5 transition hover:bg-emerald-50"
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600">
                      <MessageCircle className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-slate-900">WhatsApp</div>
                      <div className="text-[11px] font-medium text-slate-500">+1 (829) 941-6546</div>
                    </div>
                  </a>
                </div>
              </nav>

              {/* CTAs elevadas */}
              <div className="space-y-2 border-t border-slate-100 bg-white p-4 pt-4 pb-12 shadow-inner">
                <Link to="/registro" onClick={() => setMobileOpen(false)} className="block">
                  <Button className="h-11 w-full bg-[#EBB82D] hover:bg-[#D4A300] text-[#133857] font-extrabold border-0 rounded-xl shadow-xs text-sm">
                    Probar gratis 14 días
                  </Button>
                </Link>
                <Link to="/login" onClick={() => setMobileOpen(false)} className="block">
                  <Button variant="outline" className="h-11 w-full gap-2 rounded-xl font-bold border-slate-200 bg-white text-slate-800 hover:bg-slate-50 text-sm">
                    <Lock className="h-3.5 w-3.5 text-slate-600" />
                    Iniciar sesión
                  </Button>
                </Link>
                <p className="pt-0.5 text-center text-[10px] font-medium text-slate-400">
                  Sin tarjeta de crédito · Cancela cuando quieras
                </p>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
