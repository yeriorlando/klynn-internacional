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
      {/* TOPBAR */}
      <div className="hidden border-b border-[#133857] bg-[#1B4B73] text-white md:block">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-6 text-xs font-medium">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3" /> Santo Domingo, RD 🇩🇴
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> Lun–Sáb 8:00am – 8:00pm
            </span>
          </div>
          <div className="flex items-center gap-5">
            <a
              href="https://wa.link/vxstq4"
              className="flex items-center gap-1.5 transition hover:text-[#F0B900]"
            >
              <MessageCircle className="h-3 w-3" /> +1 (829) 941-6546
            </a>
            <span className="flex items-center gap-1.5">
              <Shield className="h-3 w-3" /> ITBIS · NCF · DGII
            </span>
          </div>
        </div>
      </div>

      {/* NAV HEADER WITH SINGLE FLOATING PILL MORPH ON SCROLL */}
      <header className="sticky top-0 z-50 flex justify-center transition-all duration-500 ease-out px-3 md:px-6">
        <div
          className={`w-full transition-all duration-500 ease-out flex items-center justify-between gap-3 ${
            scrolled
              ? "max-w-6xl h-16 mt-4 md:mt-5 py-2.5 rounded-full border border-border/80 bg-white/95 shadow-xl backdrop-blur-2xl px-6 md:px-8"
              : "max-w-6xl h-16 md:h-18 border-b border-border/60 bg-white/85 backdrop-blur-xl px-4 md:px-6"
          }`}
        >
          <Logo />

          {/* Centered nav items with icons */}
          <nav
            className={`hidden items-center gap-1 text-sm font-medium transition-all duration-300 lg:flex ${
              scrolled
                ? "bg-transparent p-0 border-0 shadow-none text-muted-foreground"
                : "rounded-full border border-border bg-surface/70 p-1 text-muted-foreground shadow-card backdrop-blur"
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
              className="hidden h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-emerald-600 transition hover:bg-accent md:inline-flex"
              aria-label="WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
            <Link to="/login" className="hidden sm:block">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-slate-700 hover:text-[#1B4B73]"
              >
                Iniciar sesión
              </Button>
            </Link>
            <Link to="/registro" className="hidden sm:block">
              <Button className="h-9 px-5 bg-[#F0B900] hover:bg-[#D4A300] text-[#133857] rounded-full shadow-sm font-bold border-0 transition-colors">
                Probar gratis
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
              className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col overflow-hidden bg-background shadow-elegant"
            >
              {/* Drawer header */}
              <div className="relative overflow-hidden border-b border-border/60 bg-background p-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex w-full items-start justify-between">
                    <div className="w-9" /> {/* Spacer to balance the close button */}
                    <Logo />
                    <button
                      onClick={() => setMobileOpen(false)}
                      className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-surface shadow-card transition hover:bg-accent"
                      aria-label="Cerrar"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <div className="text-xs font-medium text-muted-foreground">Hecho en RD 🇩🇴</div>
                    <div className="mt-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      <span className="flex items-center gap-1">
                        <Shield className="h-3 w-3" /> ITBIS · NCF
                      </span>
                      <span className="h-1 w-1 rounded-full bg-border" />
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Lun–Sáb 8–8
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nav items */}
              <nav className="flex-1 overflow-y-auto p-4">
                <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Navegación
                </div>
                <div className="space-y-1.5">
                  {NAV_ITEMS.map((item, i) => (
                    <motion.a
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + i * 0.04 }}
                      className="group flex items-center gap-3 rounded-xl border border-transparent p-3 transition hover:border-border hover:bg-accent"
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary/20">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium leading-tight">{item.label}</div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {item.desc}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                    </motion.a>
                  ))}
                </div>

                <div className="mt-6 mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Contacto
                </div>
                <a
                  href="https://wa.link/vxstq4"
                  className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 p-3 transition hover:bg-success/10"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-success/15 text-success">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">WhatsApp</div>
                    <div className="text-[11px] text-muted-foreground">+1 (829) 941-6546</div>
                  </div>
                </a>
              </nav>

              {/* CTAs */}
              <div className="space-y-2 border-t border-border/60 bg-surface/50 p-4">
                <Link to="/registro" onClick={() => setMobileOpen(false)} className="block">
                  <Button className="h-11 w-full bg-[#F0B900] hover:bg-[#D4A300] text-[#133857] font-bold border-0">
                    Probar gratis 14 días
                  </Button>
                </Link>
                <Link to="/login" onClick={() => setMobileOpen(false)} className="block">
                  <Button variant="outline" className="h-11 w-full gap-1.5">
                    <Lock className="h-3.5 w-3.5" />
                    Iniciar sesión
                  </Button>
                </Link>
                <p className="pt-1 text-center text-[10px] text-muted-foreground">
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
