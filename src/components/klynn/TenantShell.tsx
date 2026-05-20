import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  LayoutDashboard, FilePlus2, Receipt, Wallet, Users, UserCog, Truck, FileBarChart,
  Settings, LogOut, Bell, Menu, X, Shield, Droplets, ChevronDown, Banknote, BookOpen, Check, PlusCircle, MessageCircle, CreditCard, Phone
} from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { BrandStyle } from "@/components/klynn/BrandStyle";
import { Logo } from "@/components/klynn/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  logout, getCajaAbierta, formatRD, can, getTenantsForUser, 
  setActiveTenant, setSession, switchSession, getPlans,
  getOrdenes, getClientes, getCatalogo, getServicios, 
  getCajas, getMovimientos, getGastos, getGlobalConfig, getECFConfig 
} from "@/lib/storage";
import { Toaster, toast } from "sonner";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { CloudSync } from "@/components/klynn/CloudSync";
import { TourManager, resetTours } from "@/components/klynn/onboarding/TourManager";
import { HelpCircle } from "lucide-react";
import { queryClient } from "@/router";
import { useCajaAbierta } from "@/hooks/use-queries";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: string;
  exact?: boolean;
  highlight?: boolean;
}

const NAV: (slug: string) => NavItem[] = (slug) => [
  { to: `/t/${slug}`, label: "Dashboard", icon: LayoutDashboard, exact: true, permission: "dashboard" },
  { to: `/t/${slug}/nueva-orden`, label: "Nueva orden", icon: FilePlus2, highlight: true, permission: "nueva-orden" },
  { to: `/t/${slug}/ordenes`, label: "Órdenes", icon: Receipt, permission: "ordenes" },
  { to: `/t/${slug}/caja`, label: "Caja", icon: Wallet, permission: "caja" },
  { to: `/t/${slug}/clientes`, label: "Clientes", icon: Users, permission: "clientes" },
  { to: `/t/${slug}/catalogo`, label: "Catálogo", icon: BookOpen, permission: "catalogo" },
  { to: `/t/${slug}/personal`, label: "Personal", icon: UserCog, permission: "personal" },
  { to: `/t/${slug}/logistica`, label: "Logística", icon: Truck, permission: "logistica" },
  { to: `/t/${slug}/gastos`, label: "Gastos", icon: Banknote, permission: "gastos" },
  { to: `/t/${slug}/reportes`, label: "Reportes", icon: FileBarChart, permission: "reportes" },
  { to: `/t/${slug}/configuracion`, label: "Configuración", icon: Settings, permission: "configuracion" },
];

export function TenantShell() {
  const user = useRequireAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSoporteModal, setShowSoporteModal] = useState(false);

  const { data: cajaData } = useCajaAbierta(user?.tenant?.id || '');
  const cajaAbierta = !!cajaData;

  // Protección de rutas — DEBE estar antes del return condicional
  useEffect(() => {
    if (!user || user.tenant.id === '__loading__') return;
    const items = NAV(user.tenant.slug);
    const current = items.find(i => {
      if (i.exact) return pathname === i.to;
      return pathname.startsWith(i.to);
    });

    if (current?.permission && !can(user.empleado, current.permission)) {
      const firstAllowed = items.find(i => can(user.empleado, i.permission!));
      if (firstAllowed) {
        navigate({ to: firstAllowed.to });
      }
    }
  }, [pathname, user, navigate]);

  if (!user || user.tenant.id === '__loading__') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-[9999]">
        <div className="flex flex-col items-center gap-3">
          <Droplets className="h-16 w-16 text-primary animate-pulse" />
          <div className="font-display text-2xl font-bold tracking-tight text-foreground/40 animate-pulse">
            Cargando...
          </div>
        </div>
      </div>
    );
  }

  const { tenant, empleado } = user;
  const trialDays = Math.max(0, Math.ceil((new Date(tenant.trial_hasta).getTime() - Date.now()) / 86400000));
  const isTrialExpired = tenant.estado === "TRIAL" && new Date(tenant.trial_hasta).getTime() < Date.now();

  function onLogout() {
    logout();
    navigate({ to: "/login" });
  }

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");


  return (
    <div className="min-h-screen bg-background print:hidden">
      <BrandStyle tenant={tenant} />
      {tenant.estado !== "SUSPENDIDO" && tenant.estado !== "CANCELADO" && <TourManager userId={empleado.id} />}

      {/* Overlay de Suspensión Premium Compacto */}
      {(tenant.estado === "SUSPENDIDO" || tenant.estado === "CANCELADO") && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/20 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.98, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/40 bg-white/90 shadow-[0_20px_50px_rgba(0,0,0,0.1)] backdrop-blur-xl"
          >
            <div className="relative p-6 pt-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive text-white shadow-xl ring-2 ring-white">
                <Shield className="h-6 w-6" />
              </div>
              
              <div className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-destructive mb-3 border border-destructive/20">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-destructive"></span>
                </span>
                Cuenta Suspendida
              </div>

              <h2 className="font-display text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">
                Acceso pausado
              </h2>
              
              <p className="mx-auto max-w-[240px] text-[13px] font-medium leading-relaxed text-slate-500">
                El acceso para <span className="text-slate-900 font-bold">{tenant.nombre}</span> ha sido restringido temporalmente.
              </p>
            </div>
            
            <div className="p-6 pt-0 space-y-4">
              <div className="rounded-xl bg-slate-900/5 p-4 text-center">
                <p className="text-[11px] font-semibold leading-relaxed text-slate-500">
                  Contacta a soporte para reactivar tu cuenta y servicios.
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  className="h-11 flex-1 rounded-xl bg-slate-950 text-white text-xs font-bold shadow-lg transition-all active:scale-95 group"
                  onClick={() => window.open(`https://wa.me/18299416546?text=Hola Klynn, mi lavandería ${tenant.nombre} tiene el acceso suspendido. Quisiera más información.`, "_blank")}
                >
                  <MessageCircle className="mr-1.5 h-3.5 w-3.5 text-emerald-400" /> Soporte
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-11 flex-1 rounded-xl text-slate-600 text-xs font-bold border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
                  onClick={onLogout}
                >
                  <LogOut className="mr-1.5 h-3.5 w-3.5" /> Salir
                </Button>
              </div>

              <div className="text-center pt-1">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Klynn · ID: {tenant.id.slice(0, 8)}</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Overlay de Prueba Vencida Premium */}
      {isTrialExpired && !pathname.endsWith("/configuracion") && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/20 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.98, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/40 bg-white/90 shadow-[0_20px_50px_rgba(0,0,0,0.1)] backdrop-blur-xl"
          >
            <div className="relative p-6 pt-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-xl ring-2 ring-white">
                <Shield className="h-6 w-6 animate-pulse" />
              </div>
              
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-700 mb-3 border border-amber-500/20">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                </span>
                Prueba Expirada
              </div>

              <h2 className="font-display text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">
                Periodo de Prueba Finalizado
              </h2>
              
              <p className="mx-auto max-w-[320px] text-[13px] font-medium leading-relaxed text-slate-500 mb-6">
                Tu período de prueba gratuito para <span className="text-slate-900 font-bold">{tenant.nombre}</span> ha expirado. Debes adquirir un plan activo para seguir utilizando Klynn.
              </p>

              <div className="space-y-4 mb-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    className="h-11 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                    onClick={() => setShowSoporteModal(true)}
                  >
                    <MessageCircle className="h-4 w-4" /> Contactar soporte
                  </Button>
                  
                  <Button 
                    className="h-11 w-full rounded-xl bg-primary hover:bg-primary/95 text-white text-sm font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                    onClick={() => navigate({ to: `/t/${tenant.slug}/configuracion?tab=plan&expired=true` })}
                  >
                    <CreditCard className="h-4 w-4" /> Ver planes
                  </Button>
                </div>

                <div className="flex justify-center">
                  <Button 
                    variant="outline" 
                    className="h-11 w-32 rounded-xl text-slate-600 text-sm font-bold border-slate-200 hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                    onClick={onLogout}
                  >
                    <LogOut className="h-3.5 w-3.5" /> Salir
                  </Button>
                </div>
              </div>

              <div className="text-center pt-3">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Klynn · ID: {tenant.id.slice(0, 8)}</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Soporte */}
      {showSoporteModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/40 bg-white/95 shadow-[0_20px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl p-6 space-y-5">
            <div className="text-center">
              <h3 className="font-display text-xl font-black text-slate-900 mb-1">
                Para contactar con Soporte:
              </h3>
              <p className="text-xs text-slate-500">
                Elige la opción que prefieras para contactarnos.
              </p>
            </div>

            <div className="grid gap-3">
              {/* Tarjeta 1: Llamar */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center gap-1 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Llámanos al:
                </span>
                <span className="text-lg font-bold text-slate-900">+1 (829) 941-6546</span>
              </div>

              {/* Tarjeta 2: WhatsApp */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex flex-col items-center gap-3 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Contacta por WhatsApp</span>
                <Button 
                  className="h-9 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                  onClick={() => window.open(`https://wa.me/18299416546?text=Hola Klynn, la prueba gratis de mi lavandería ${tenant.nombre} ha expirado. Quisiera más información sobre los planes pagos.`, "_blank")}
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Abrir WhatsApp
                </Button>
              </div>
            </div>

            <Button 
              variant="ghost" 
              className="h-10 w-full rounded-xl text-slate-600 text-sm font-bold hover:bg-slate-100 transition-all active:scale-95"
              onClick={() => setShowSoporteModal(false)}
            >
              Cerrar
            </Button>
          </div>
        </div>
      )}

      {/* Sidebar desktop */}
      <aside id="tour-sidebar" className="sidebar-desktop fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-surface lg:flex lg:flex-col transition-all duration-500 ease-in-out">
        <SidebarContent tenant={tenant} empleado={empleado} pathname={pathname} isActive={isActive} />
      </aside>

      {/* Sidebar móvil */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-surface shadow-elegant flex flex-col">
            <SidebarContent tenant={tenant} empleado={empleado} pathname={pathname} isActive={isActive} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="main-content-wrapper lg:pl-64 transition-all duration-500 ease-in-out">
        {/* Header */}
        <header className="main-header sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-surface/80 px-4 backdrop-blur-xl md:px-6 transition-all duration-500 ease-in-out">
          <button onClick={() => setMobileOpen(true)} className="rounded-md p-2 hover:bg-accent lg:hidden" aria-label="Menú">
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex flex-1 items-center gap-3">
            <Badge
              variant="outline"
              className={`gap-1.5 ${cajaAbierta ? "border-success/40 bg-success/10 text-success" : "border-destructive/40 bg-destructive/10 text-destructive"}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${cajaAbierta ? "bg-success" : "bg-destructive"} animate-pulse`} />
              Caja {cajaAbierta ? "ABIERTA" : "CERRADA"}
            </Badge>
            {tenant.estado === "TRIAL" && (
              <Badge variant="outline" className="hidden border-gold/40 bg-gold/10 text-gold-foreground sm:inline-flex">
                Prueba gratis · {trialDays} días
              </Badge>
            )}
            <CloudSync tenantId={tenant.id} />
          </div>

          <Link to="/t/$slug/nueva-orden" params={{ slug: tenant.slug }} className="hidden sm:block">
            <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700 border-0 shadow-sm transition-all">
              <PlusCircle className="mr-1.5 h-4 w-4" /> Nueva orden
            </Button>
          </Link>

          <button className="relative rounded-md p-2 hover:bg-accent" aria-label="Notificaciones">
            <Bell className="h-5 w-5" />
          </button>

          <UserMenu nombre={empleado.nombre} rol={empleado.rol} empleadoId={empleado.id} onLogout={onLogout} />
        </header>

        <main className="min-h-[calc(100vh-4rem)] p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  tenant, empleado, pathname, isActive, onNavigate,
}: {
  tenant: { id: string; nombre: string; slug: string; color_primario: string; color_secundario: string; logo_url?: string };
  empleado: any;
  pathname: string;
  isActive: (to: string, exact?: boolean) => boolean;
  onNavigate?: () => void;
}) {
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [myTenants, setMyTenants] = useState<any[]>([]);
  useEffect(() => {
    getTenantsForUser(empleado.email).then(setMyTenants);
  }, [empleado.email]);
  const [hasLogistica, setHasLogistica] = useState<boolean>(true);
  useEffect(() => {
    getPlans().then(plans => {
      const plan = plans.find(p => p.id === tenant.plan_id);
      setHasLogistica(!!plan?.modulos?.logistica);
    });
  }, [tenant.plan_id]);

  const allowedNav = useMemo(() => {
    let base = NAV(tenant.slug);
    if (!hasLogistica) base = base.filter(i => i.permission !== "logistica");
    return base.filter(item => !item.permission || can(empleado, item.permission));
  }, [tenant.slug, empleado, hasLogistica]);

  const switchBranch = async (t: any) => {
    if (t.slug === tenant.slug) return;
    const ok = await switchSession(t.id, empleado.email);
    if (ok) {
      window.location.href = `/t/${t.slug}`;
    } else {
      toast.error("No tienes acceso a esta sucursal");
    }
  };

  const prefetch = (permission: string) => {
    if (!tenant.id || tenant.id === '__loading__') return;
    
    const tid = tenant.id;
    switch(permission) {
      case 'ordenes':
        queryClient.prefetchQuery({ queryKey: ['ordenes', tid], queryFn: () => getOrdenes(tid) });
        break;
      case 'clientes':
        queryClient.prefetchQuery({ queryKey: ['clientes', tid], queryFn: () => getClientes(tid) });
        break;
      case 'catalogo':
        queryClient.prefetchQuery({ queryKey: ['catalogo', tid], queryFn: () => getCatalogo(tid) });
        queryClient.prefetchQuery({ queryKey: ['servicios', tid], queryFn: () => getServicios(tid) });
        break;
      case 'caja':
        queryClient.prefetchQuery({ queryKey: ['caja-abierta', tid], queryFn: () => getCajaAbierta(tid) });
        queryClient.prefetchQuery({ queryKey: ['cajas', tid], queryFn: () => getCajas(tid) });
        break;
      case 'gastos':
        queryClient.prefetchQuery({ queryKey: ['gastos', tid], queryFn: () => getGastos(tid) });
        break;
      case 'configuracion':
        queryClient.prefetchQuery({ queryKey: ['plans'], queryFn: () => getPlans() });
        queryClient.prefetchQuery({ queryKey: ['global-config'], queryFn: () => getGlobalConfig() });
        queryClient.prefetchQuery({ queryKey: ['ecf-config', tid], queryFn: () => getECFConfig(tid) });
        break;
      case 'nueva-orden':
        queryClient.prefetchQuery({ queryKey: ['catalogo', tid], queryFn: () => getCatalogo(tid) });
        queryClient.prefetchQuery({ queryKey: ['clientes', tid], queryFn: () => getClientes(tid) });
        break;
    }
  };

  return (
    <>
      <div className="relative flex h-24 flex-col items-center justify-center border-b border-border px-5">
        <Logo size="md" />
        <span className="mt-1 text-[10px] font-medium tracking-[0.1em] text-muted-foreground/60 uppercase">
          Your laundry, simplified.
        </span>
        {onNavigate && (
          <button onClick={onNavigate} className="absolute right-4 rounded-md p-1.5 hover:bg-accent lg:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="relative border-b border-border p-5">
        <div 
          className={`flex items-center gap-3 ${empleado.rol === "ADMIN" && myTenants.length > 1 ? "cursor-pointer rounded-xl p-1 -m-1 transition hover:bg-accent/50" : ""}`}
          onClick={() => empleado.rol === "ADMIN" && myTenants.length > 1 && setShowSwitcher(!showSwitcher)}
        >
          <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-white text-white shadow-sm border border-border shrink-0" style={{ background: tenant.logo_url ? "white" : `linear-gradient(135deg, var(--primary), var(--brand-secondary, ${tenant.color_secundario}))` }}>
            {tenant.logo_url ? (
              <img src={tenant.logo_url} alt="logo" className="h-full w-full object-cover" />
            ) : (
              <Droplets className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <div className="truncate font-display text-sm font-semibold" style={{ color: "var(--primary)" }}>{tenant.nombre}</div>
              {empleado.rol === "ADMIN" && myTenants.length > 1 && <ChevronDown className={`h-3 w-3 transition-transform ${showSwitcher ? "rotate-180" : ""}`} />}
            </div>
            <div className="truncate text-xs text-muted-foreground lowercase">klynn.com.do/t/{tenant.slug}</div>
          </div>
        </div>

        {/* Dropdown de sucursales */}
        {showSwitcher && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowSwitcher(false)} />
            <div className="absolute left-4 right-4 top-[calc(100%-8px)] z-50 mt-1 overflow-hidden rounded-xl border border-border bg-popover shadow-elegant animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-muted/50 p-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mis Sucursales</div>
              <div className="max-h-[200px] overflow-y-auto p-1">
                {myTenants.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { switchBranch(t); setShowSwitcher(false); }}
                    className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-accent ${t.id === tenant.id ? "bg-accent/50 pointer-events-none" : ""}`}
                  >
                    <div className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-white border border-border shadow-sm shrink-0" style={{ background: t.logo_url ? "white" : `linear-gradient(135deg, ${t.color_primario}, ${t.color_secundario})` }}>
                      {t.logo_url ? <img src={t.logo_url} className="h-full w-full object-cover" /> : <Droplets className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold">{t.nombre}</div>
                      <div className="truncate text-[10px] text-muted-foreground">klynn.com.do/t/{t.slug}</div>
                    </div>
                    {t.id === tenant.id && <Check className="h-3 w-3 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {allowedNav.map((item) => {
          const active = isActive(item.to, item.exact);
          return (
            <Link
              key={item.to}
              to={item.to}
              id={`tour-nav-${item.permission}`}
              onClick={onNavigate}
              onMouseEnter={() => item.permission && prefetch(item.permission)}
              className={`mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-gradient-primary text-white shadow-card"
                  : item.highlight
                    ? "text-primary hover:bg-accent"
                    : "text-foreground/80 hover:bg-accent hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {empleado.rol === "ADMIN" && (
        <div className="p-4 mt-auto">
          <Link to="/dashboard-admin" onClick={onNavigate}>
            <div className="flex items-center gap-3 px-4 py-3 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all shadow-sm group">
              <Shield className="h-4 w-4 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold tracking-wide uppercase">Panel Administrador</span>
            </div>
          </Link>
        </div>
      )}

    </>
  );
}

function UserMenu({ nombre, rol, empleadoId, onLogout }: { nombre: string; rol: string; empleadoId: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const initials = nombre.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent"
      >
        <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-primary text-xs font-bold text-white">{initials}</div>
        <div className="hidden text-left md:block">
          <div className="text-sm font-medium leading-tight">{nombre.split(" ")[0]}</div>
          <div className="text-[10px] uppercase text-muted-foreground">{rol}</div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-lg border border-border bg-popover shadow-elegant">
            <div className="border-b border-border p-3">
              <div className="text-sm font-semibold">{nombre}</div>
              <div className="text-xs text-muted-foreground">{rol}</div>
            </div>
            <button 
              onClick={() => { resetTours(empleadoId); setOpen(false); }} 
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-accent border-b border-border"
            >
              <HelpCircle className="h-4 w-4" /> Ver Tour de nuevo
            </button>
            <button onClick={onLogout} className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-accent">
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Helper: estado badge para reusar
export function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    RECIBIDA: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    EN_PROCESO: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    LISTA: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    EN_CAMINO: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    ENTREGADA: "border-zinc-500/40 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
    PAGADA: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    ANULADA: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
  };
  return <Badge variant="outline" className={map[estado] ?? ""}>{estado.replace("_", " ")}</Badge>;
}

export { formatRD };
