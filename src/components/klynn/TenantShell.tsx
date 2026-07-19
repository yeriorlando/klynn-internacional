import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMemo, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { playNotificationSoundDebounced } from "@/lib/notificationSound";
import {
  LayoutDashboard, Wallet, Users, Truck, Settings, LogOut, Bell, Menu, X, Shield, Droplets, ChevronDown, Banknote, BookOpen, Check, PlusCircle, MessageCircle, CreditCard, Phone, HelpCircle,
  Monitor, ShoppingCart, Package, LayoutGrid, User, BarChart3, Keyboard, Inbox, RotateCw, CheckCircle2, Ban,
  Sparkles, Scale, Flame, Printer, StickyNote, Trash2, Plus, ChevronRight, Search, FileText, Wrench, Clock, Shirt
} from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { BrandStyle } from "@/components/klynn/BrandStyle";
import { Logo } from "@/components/klynn/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  logout, getCajaAbierta, formatRD, can, getTenantsForUser, 
  setActiveTenant, setSession, switchSession, getPlans,
  getOrdenes, getClientes, getCatalogo, getServicios, 
  getCajas, getMovimientos, getGastos, getGlobalConfig, getECFConfig,
  isModuleEnabled,
  getNotificaciones, marcarNotificacionLeida, marcarTodasNotificacionesLeidas, type Notificacion
} from "@/lib/storage";
import { Toaster, toast } from "sonner";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { CloudSync } from "@/components/klynn/CloudSync";
import { TourManager, resetTours } from "@/components/klynn/onboarding/TourManager";
import { queryClient } from "@/router";
import { useCajaAbierta } from "@/hooks/use-queries";
import ThemeSwitch from "@/components/theme-switch";
import { TicketPrintPortal } from "@/components/klynn/OrdenesPage";

interface NavItem {
  to: string;
  label: string;
  icon: any;
  permission?: string;
  exact?: boolean;
  highlight?: boolean;
  hasArrow?: boolean;
  onClick?: () => void;
  isSoporte?: boolean;
  shortcut?: string;
}

const NAV: (slug: string) => NavItem[] = (slug) => [
  { to: `/t/${slug}`, label: "Dashboard", icon: LayoutDashboard, exact: true, permission: "dashboard" },
  { to: `/t/${slug}/conversations`, label: "Conversaciones", icon: MessageCircle, permission: "conversations" },
  {to: `/t/${slug}/nueva-orden`, label: "Punto de Venta", icon: Monitor, permission: "nueva-orden"},
  {to: `/t/${slug}/ordenes`, label: "Órdenes", icon: ShoppingCart, permission: "ordenes"},
  { to: `/t/${slug}/caja`, label: "Caja", icon: Wallet, permission: "caja" },
  { to: `/t/${slug}/clientes`, label: "Clientes", icon: User, permission: "clientes" },
  { to: `/t/${slug}/catalogo`, label: "Productos", icon: Package, permission: "catalogo" },
  { to: `/t/${slug}/personal`, label: "Usuarios", icon: Users, permission: "personal" },
  { to: `/t/${slug}/logistica`, label: "Logística", icon: Truck, permission: "logistica" },
  { to: `/t/${slug}/gastos`, label: "Gastos", icon: Banknote, permission: "gastos" },
  { to: `/t/${slug}/reportes`, label: "Reportes", icon: BarChart3, permission: "reportes" },
  { to: `/t/${slug}/configuracion`, label: "Configuración", icon: Settings, permission: "configuracion" },
];

export function TenantShell() {
  const user = useRequireAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSoporteModal, setShowSoporteModal] = useState(false);
  const [showAtajosModal, setShowAtajosModal] = useState(false);
  const [showHerramientasModal, setShowHerramientasModal] = useState(false);
  const [activeTool, setActiveTool] = useState<null | "calculadora" | "urgentes" | "ultima_factura" | "notas">(null);

  const { data: cajaData } = useCajaAbierta(user?.tenant?.id || '');
  const cajaAbierta = !!cajaData;

  // UNREAD COUNT BADGE & GLOBAL REAL-TIME NOTIFICATIONS
  const [unreadCount, setUnreadCount] = useState(0);
  const prevUnreadRef = useRef(-1);
  const tenantId = user?.tenant?.id;

  const [hasLogistica, setHasLogistica] = useState<boolean>(true);
  const [hasWhatsApp, setHasWhatsApp] = useState<boolean>(true);

  // NOTIFICACIONES GENERALES
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [deletedNotifIds, setDeletedNotifIds] = useState<string[]>([]);
  const unreadNotifs = notificaciones.filter(n => !n.leida && !deletedNotifIds.includes(n.id)).length;

  useEffect(() => {
    if (!user || user.tenant.id === '__loading__') return;
    getPlans().then(plans => {
      const plan = plans.find(p => p.id === user.tenant.plan_id);
      setHasLogistica(isModuleEnabled(user.tenant, 'logistica', plan));
      setHasWhatsApp(isModuleEnabled(user.tenant, 'whatsapp', plan));
    });
  }, [user?.tenant?.id, user?.tenant?.plan_id, user?.tenant?.config?.modulos_override]);

  useEffect(() => {
    if (!tenantId || tenantId === '__loading__') return;

    const fetchUnreadCount = async (changedConvId?: string) => {
      const { data, error } = await supabase
        .from('conversations')
        .select('unread')
        .eq('tenant_id', tenantId);

      if (!error && data) {
        const total = data.reduce((acc, current) => acc + (current.unread || 0), 0);
        
        // Play sound only when unread count increased (skip initial load)
        if (prevUnreadRef.current >= 0 && total > prevUnreadRef.current) {
          const activeChatId = localStorage.getItem('klynn_active_chat_id');
          if (changedConvId && changedConvId === activeChatId) {
            // Do not play sound in any tab if it corresponds to the active chat
          } else if (window.location.pathname.includes("/conversations")) {
            // Omit in global shell if user is already on the chat page (let conversations.tsx play it)
          } else {
            playNotificationSoundDebounced();
          }
        }
        prevUnreadRef.current = total;
        setUnreadCount(total);
      }
    };

    fetchUnreadCount();

    // Subscribe to real-time updates for unread badge
    const channel = supabase
      .channel('conversations-unread-badge-shell')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'conversations'
        },
        (payload) => {
          const row = (payload.new || payload.old) as any;
          if (row && row.tenant_id === tenantId) {
            fetchUnreadCount(row.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  // CARGAR NOTIFICACIONES EN TIEMPO REAL
  useEffect(() => {
    if (!tenantId || tenantId === '__loading__') return;
    
    // Cargar notificaciones y ordenes para mezclar
    const loadNotificaciones = async () => {
      const dbNotifs = await getNotificaciones(tenantId);
      const orders = await getOrdenes(tenantId) || [];
      const clients = await getClientes(tenantId) || [];
      const clientMap = new Map(clients.map(c => [c.id, c.nombre]));
      
      const virtualNotifs: Notificacion[] = [];
      const today = new Date();
      today.setHours(0,0,0,0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);
      
      // Leer notificaciones virtuales marcadas como leídas
      const readVirtualsStr = localStorage.getItem('klynn_read_virtuals') || '[]';
      let readVirtuals: string[] = [];
      try { readVirtuals = JSON.parse(readVirtualsStr); } catch(e){}

      // Leer notificaciones virtuales eliminadas
      const deletedVirtualsStr = localStorage.getItem('klynn_deleted_virtuals') || '[]';
      let deletedVirtuals: string[] = [];
      try { deletedVirtuals = JSON.parse(deletedVirtualsStr); } catch(e){}

      // Filtrar órdenes pendientes y en proceso (no entregadas, ni anuladas, ni listas)
      const pendingOrders = orders.filter(o => o.estado !== 'ENTREGADA' && o.estado !== 'ANULADA' && o.estado !== 'LISTA');
      
      for (const o of pendingOrders) {
        if (!o.fecha_entrega) continue;
        const deliveryDate = new Date(o.fecha_entrega);
        // Si deliveryDate es HOY o MAÑANA
        if (deliveryDate >= today && deliveryDate < dayAfter) {
          const isToday = deliveryDate < tomorrow;
          const label = isToday ? 'hoy' : 'mañana';
          const vId = `virtual-orden-${o.id}`;
          if (!deletedVirtuals.includes(vId)) {
            const clientName = clientMap.get(o.cliente_id) || 'Cliente Desconocido';
            virtualNotifs.push({
              id: vId,
              tenant_id: tenantId,
              titulo: `Entrega para ${label}`,
              mensaje: `La orden #${o.numero} del cliente ${clientName} debe entregarse ${label}.`,
              tipo: 'WARNING',
              leida: readVirtuals.includes(vId),
              link: `/ordenes?view=${o.numero}`,
              created_at: new Date().toISOString()
            });
          }
        }
      }
      
      setNotificaciones([...virtualNotifs, ...dbNotifs].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    };

    loadNotificaciones();

    const channel = supabase
      .channel('notificaciones-shell')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notificaciones' },
        (payload) => {
          const row = (payload.new || payload.old) as any;
          if (row && row.tenant_id === tenantId) {
            if (payload.eventType === 'INSERT') {
              playNotificationSoundDebounced();
            }
            loadNotificaciones();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenantId]);

  // Protección de rutas — DEBE estar antes del return condicional
  useEffect(() => {
    if (!user || user.tenant.id === '__loading__') return;

    if (pathname.includes("/conversations") && !hasWhatsApp) {
      navigate({ to: `/t/${user.tenant.slug}` });
      return;
    }
    if (pathname.includes("/logistica") && !hasLogistica) {
      navigate({ to: `/t/${user.tenant.slug}` });
      return;
    }

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
  }, [pathname, user, navigate, hasLogistica, hasWhatsApp]);

  useEffect(() => {
    const slug = user?.tenant?.slug;
    if (!slug) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowAtajosModal(false);
      }

      if ((e.key === "k" || e.key === "K") && e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        setShowAtajosModal(prev => !prev);
        return;
      }

      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
         target.tagName === "TEXTAREA" ||
         target.isContentEditable)
      ) {
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
        return;
      }

      const key = e.key.toUpperCase();
      if (key === "N") {
        e.preventDefault();
        navigate({ to: `/t/${slug}/nueva-orden` });
      } else if (key === "D") {
        e.preventDefault();
        navigate({ to: `/t/${slug}` });
      } else if (key === "O") {
        e.preventDefault();
        navigate({ to: `/t/${slug}/ordenes` });
      } else if (key === "C") {
        e.preventDefault();
        navigate({ to: `/t/${slug}/caja` });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [user?.tenant?.slug, navigate]);

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

  const isActive = (to: string, exact?: boolean) => {
    const [toPath, toSearch] = to.split('?');
    if (toSearch) {
      const currentSearch = typeof window !== 'undefined' ? window.location.search : '';
      return pathname === toPath && currentSearch.includes(toSearch);
    }
    return exact ? pathname === toPath : pathname === toPath || pathname.startsWith(toPath + "/");
  };

  const onNotificacionClick = async (n: Notificacion) => {
    if (!n.leida) {
      if (n.id.startsWith('virtual-')) {
        const readVirtuals = JSON.parse(localStorage.getItem('klynn_read_virtuals') || '[]');
        if (!readVirtuals.includes(n.id)) {
          readVirtuals.push(n.id);
          localStorage.setItem('klynn_read_virtuals', JSON.stringify(readVirtuals));
        }
      } else {
        await marcarNotificacionLeida(n.id);
      }
      setNotificaciones(prev => prev.map(x => x.id === n.id ? { ...x, leida: true } : x));
    }
    setDeletedNotifIds(prev => [...prev, n.id]);
    if (n.link) navigate({ to: `/t/${tenant.slug}${n.link}` });
  };

  const handleMarcarLeida = async (id: string) => {
    setDeletedNotifIds(prev => [...prev, id]);
    if (id.startsWith('virtual-')) {
      const readVirtuals = JSON.parse(localStorage.getItem('klynn_read_virtuals') || '[]');
      if (!readVirtuals.includes(id)) {
        readVirtuals.push(id);
        localStorage.setItem('klynn_read_virtuals', JSON.stringify(readVirtuals));
      }
    } else {
      await marcarNotificacionLeida(id);
    }
    setNotificaciones(prev => prev.map(x => x.id === id ? { ...x, leida: true } : x));
  };

  const handleEliminarNotificacion = async (id: string) => {
    setDeletedNotifIds(prev => [...prev, id]);
    if (id.startsWith('virtual-')) {
      const deletedVirtuals = JSON.parse(localStorage.getItem('klynn_deleted_virtuals') || '[]');
      if (!deletedVirtuals.includes(id)) {
        deletedVirtuals.push(id);
        localStorage.setItem('klynn_deleted_virtuals', JSON.stringify(deletedVirtuals));
      }
    } else {
      await supabase.from('notificaciones').delete().eq('id', id);
    }
    setNotificaciones(prev => prev.filter(x => x.id !== id));
  };


  return (
    <div className={`bg-background print:hidden ${pathname.endsWith('/conversations') ? 'h-full overflow-hidden' : 'min-h-screen'}`}>
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
                    className="h-11 w-full rounded-xl bg-slate-950 hover:bg-slate-900 text-white text-sm font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
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

      {/* Modal Soporte (Matching Modal 1 Design & Preserving Size) */}
      {showSoporteModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-background border-none shadow-2xl text-foreground">
            {/* STEPPER-STYLE HEADER */}
            <div className="bg-slate-50/70 dark:bg-slate-900/60 p-4 sm:p-5 pb-3 border-b border-border/60 relative">
              <div className="flex items-center justify-between pr-8">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/15 shadow-xs shrink-0">
                    <HelpCircle className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-display font-bold text-foreground">
                      Soporte Técnico
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Elige la opción que prefieras para contactarnos.
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSoporteModal(false)}
                className="absolute right-4 top-4 h-7 w-7 rounded-full bg-primary text-white flex items-center justify-center opacity-90 transition-all hover:opacity-100 hover:scale-105 shadow-xs"
                aria-label="Cerrar"
              >
                <X className="h-3.5 w-3.5 text-white" />
              </button>
            </div>

            {/* DIALOG BODY */}
            <div className="p-4 sm:p-5 space-y-3">
              {/* Tarjeta 1: Llamar */}
              <div className="p-3.5 rounded-2xl bg-surface/80 border border-border/60 shadow-2xs flex flex-col items-center gap-1 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3 text-primary" /> Llámanos al:
                </span>
                <span className="text-lg font-bold text-foreground">+1 (829) 941-6546</span>
              </div>

              {/* Tarjeta 2: WhatsApp */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-2xs flex flex-col items-center gap-2.5 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Contacta por WhatsApp</span>
                <Button 
                  className="h-9 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                  onClick={() => window.open(`https://wa.me/18299416546?text=Hola Klynn, requiero asistencia de soporte técnico para mi lavandería ${tenant.nombre}.`, "_blank")}
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Abrir WhatsApp
                </Button>
              </div>

              {/* FOOTER */}
              <div className="pt-2 mt-1 border-t border-border/50 flex justify-end">
                <Button 
                  type="button"
                  variant="outline" 
                  className="rounded-xl h-8.5 px-4 text-xs font-medium border-slate-200"
                  onClick={() => setShowSoporteModal(false)}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Atajos de Teclado */}
      {showAtajosModal && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/25 backdrop-blur-[2px] p-4"
          onClick={() => setShowAtajosModal(false)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-slate-950 shadow-2xl p-7 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pr-10">
              <h3 className="font-display text-xl font-black text-slate-900 dark:text-white">
                Atajos de Teclado del Sistema Klynn
              </h3>
            </div>
            <button
              onClick={() => setShowAtajosModal(false)}
              className="absolute right-4 top-4 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-90 transition-all hover:opacity-100 hover:scale-105 focus:outline-none shadow-sm"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Grid of Shortcuts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Ir a POS / Ventas", key: "N" },
                { label: "Ir a Dashboard", key: "D" },
                { label: "Ir a Órdenes", key: "O" },
                { label: "Ver/Abrir Caja", key: "C" },
              ].map(({ label, key }) => (
                <div key={key} className="py-2 px-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-snug">{label}</span>
                  <kbd className="px-3 py-1 flex items-center justify-center rounded-xl bg-primary text-xs font-bold text-white border-0 shadow-sm select-none shrink-0 tracking-wide whitespace-nowrap">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-1">
              <Button
                className="bg-primary hover:bg-primary/90 text-white rounded-xl h-8 text-sm px-7 font-bold shadow-sm transition-colors"
                onClick={() => setShowAtajosModal(false)}
              >
                Entendido
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Principal: Herramientas del Sistema */}
      {showHerramientasModal && (
        <HerramientasModal 
          tenant={tenant}
          empleado={empleado}
          onClose={() => { setShowHerramientasModal(false); setActiveTool(null); }}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
        />
      )}


      {/* Sidebar desktop */}
      <aside id="tour-sidebar" className="sidebar-desktop fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-surface lg:flex lg:flex-col transition-all duration-500 ease-in-out">
        <SidebarContent tenant={tenant} empleado={empleado} pathname={pathname} isActive={isActive} unreadCount={unreadCount} setShowSoporteModal={setShowSoporteModal} setShowHerramientasModal={setShowHerramientasModal} hasLogistica={hasLogistica} hasWhatsApp={hasWhatsApp} />
      </aside>

      {/* Sidebar móvil */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-surface shadow-elegant flex flex-col">
            <SidebarContent tenant={tenant} empleado={empleado} pathname={pathname} isActive={isActive} unreadCount={unreadCount} onNavigate={() => setMobileOpen(false)} setShowSoporteModal={setShowSoporteModal} setShowHerramientasModal={setShowHerramientasModal} hasLogistica={hasLogistica} hasWhatsApp={hasWhatsApp} />
          </aside>
        </div>
      )}

      <div className={`main-content-wrapper lg:pl-64 transition-all duration-500 ease-in-out ${pathname.endsWith('/conversations') ? 'h-full flex flex-col overflow-hidden' : ''}`}>
        {/* Header */}
        <header className="main-header sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-surface/80 px-4 backdrop-blur-xl md:px-6 transition-all duration-500 ease-in-out shrink-0">
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
            {!pathname.endsWith('/nueva-orden') && <CloudSync tenantId={tenant.id} />}
            {!pathname.endsWith('/nueva-orden') && (
              <button 
                onClick={() => setShowAtajosModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                title="Mostrar atajos de teclado (Alt+K)"
              >
                <Keyboard className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <span>Atajos</span>
                <kbd className="h-4 px-1.5 flex items-center justify-center rounded-md bg-primary text-[9px] font-bold text-white select-none border-0">
                  Alt+K
                </kbd>
              </button>
            )}
          </div>

          <ThemeSwitch />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative rounded-md p-2 hover:bg-accent transition-colors" aria-label="Notificaciones">
                <Bell className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                {unreadNotifs > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white shadow-sm ring-2 ring-surface">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75"></span>
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[325px] sm:w-[355px] rounded-2xl shadow-elegant shadow-2xl border border-slate-200/80 dark:border-slate-800 p-0 overflow-hidden bg-white dark:bg-slate-950 animate-in fade-in duration-200">
              <div className="bg-primary text-white p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-display font-black text-sm uppercase tracking-wider text-white">Notificaciones</span>
                  {unreadNotifs > 0 && (
                    <span className="bg-white/20 text-white rounded-full px-2 py-0.5 text-[9px] font-black leading-none">
                      {unreadNotifs}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-1.5 shrink-0">
                  <button 
                    onClick={async () => {
                      if (tenantId) await marcarTodasNotificacionesLeidas(tenantId);
                      
                      // Marcar virtuales como leídas localmente
                      const virtualIds = notificaciones.filter(n => n.id.startsWith('virtual-') && !n.leida).map(n => n.id);
                      if (virtualIds.length > 0) {
                        const readVirtuals = JSON.parse(localStorage.getItem('klynn_read_virtuals') || '[]');
                        localStorage.setItem('klynn_read_virtuals', JSON.stringify([...readVirtuals, ...virtualIds]));
                      }

                      const unreadIds = notificaciones.filter(n => !n.leida).map(n => n.id);
                      setDeletedNotifIds(prev => [...prev, ...unreadIds]);
                      setNotificaciones(prev => prev.map(n => ({...n, leida: true})));
                    }}
                    className="h-6.5 px-2 rounded-md flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white transition-all text-[10.5px] font-black cursor-pointer shadow-xs border-none"
                    title="Marcar todas como leídas"
                  >
                    <Check className="h-3 w-3" />
                    <span>Leídas</span>
                  </button>
                  <button 
                    onClick={async () => {
                      const allIds = notificaciones.map(n => n.id);
                      setDeletedNotifIds(prev => [...prev, ...allIds]);
                      
                      if (tenantId) {
                        await supabase.from('notificaciones').delete().eq('tenant_id', tenantId);
                      }
                      
                      const virtualIds = notificaciones.filter(n => n.id.startsWith('virtual-')).map(n => n.id);
                      if (virtualIds.length > 0) {
                        const deletedVirtuals = JSON.parse(localStorage.getItem('klynn_deleted_virtuals') || '[]');
                        localStorage.setItem('klynn_deleted_virtuals', JSON.stringify([...deletedVirtuals, ...virtualIds]));
                      }

                      setNotificaciones([]);
                    }}
                    className="h-6.5 px-2 rounded-md flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white transition-all text-[10.5px] font-black cursor-pointer shadow-xs border-none"
                    title="Limpiar todas"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Limpiar</span>
                  </button>
                </div>
              </div>
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
                {notificaciones.filter(n => !deletedNotifIds.includes(n.id)).length === 0 ? (
                  <div className="py-10 px-4 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-muted-foreground/50">
                      <Bell className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-bold tracking-tight">No tienes notificaciones</span>
                  </div>
                ) : (
                  notificaciones.filter(n => !deletedNotifIds.includes(n.id)).map((n) => {
                    const isUnread = !n.leida;
                    // Strip emojis/emoticons from title and message
                    const emojiRegex = /[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g;
                    const cleanTitle = n.titulo.replace(emojiRegex, "").trim();
                    const cleanMessage = n.mensaje.replace(emojiRegex, "").trim();
                    
                    const getIcon = () => {
                      const t = (cleanTitle + ' ' + cleanMessage).toLowerCase();
                      if (t.includes('entrega') || t.includes('domicilio') || t.includes('envío') || t.includes('delivery') || t.includes('orden') || t.includes('prenda')) {
                        return <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white shrink-0"><Shirt className="h-4 w-4" /></div>;
                      }
                      if (t.includes('urgente') || t.includes('alerta') || t.includes('advertencia') || t.includes('error')) {
                        return <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0"><AlertTriangle className="h-4 w-4" /></div>;
                      }
                      if (t.includes('caja') || t.includes('gasto') || t.includes('pago') || t.includes('cobro') || t.includes('venta')) {
                        return <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0"><Wallet className="h-4 w-4" /></div>;
                      }
                      return <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0"><Bell className="h-4 w-4" /></div>;
                    };

                    return (
                      <div 
                        key={n.id}
                        onClick={() => onNotificacionClick(n)}
                        className={`p-3 transition-all flex gap-2.5 items-start cursor-pointer select-none border-l-2 ${
                          isUnread 
                            ? 'bg-primary/[0.02] dark:bg-primary/[0.01] hover:bg-primary/[0.04] dark:hover:bg-primary/[0.015] border-primary' 
                            : 'opacity-85 hover:bg-slate-50/80 dark:hover:bg-slate-900/60 border-transparent'
                        }`}
                      >
                        {getIcon()}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1.5">
                            <span className={`text-[13px] font-bold leading-tight ${isUnread ? 'text-slate-900 dark:text-white font-black' : 'text-slate-700 dark:text-slate-355'}`}>
                              {cleanTitle}
                            </span>
                            {isUnread && (
                              <span className="relative flex h-1.5 w-1.5 mt-1 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                            {cleanMessage.split(/(#KL-[a-zA-Z0-9-]+)/).map((part, i) => {
                              if (part.startsWith('#KL-')) {
                                return (
                                  <span key={i} className="inline-block px-1.5 py-0.5 rounded bg-primary text-white font-black font-mono text-[10px] tracking-tight">
                                    {part.replace('#', '')}
                                  </span>
                                );
                              }

                              const formatTextSegment = (text: string): React.ReactNode => {
                                const clientMatch = text.match(/(.*?\bdel cliente\s+)(.*?)(?=\s+(?:debe|ha|se|creada|registrada)\b|\.|$)(.*)/i);
                                if (clientMatch) {
                                  const [_, before, clientName, after] = clientMatch;

                                  const formatTimeOnly = (t: string) => {
                                    const timeRegex = /(\d{1,2}:\d{2}\s*(?:[ap]\.\s*[mr]\.|[ap]m))/i;
                                    return t.split(timeRegex).map((subpart, j) => {
                                      if (timeRegex.test(subpart)) {
                                        return <strong key={j} className="font-extrabold text-slate-800 dark:text-slate-200">{subpart}</strong>;
                                      }
                                      return subpart;
                                    });
                                  };

                                  return (
                                    <>
                                      {formatTimeOnly(before)}
                                      <strong className="font-extrabold text-slate-800 dark:text-slate-200">{clientName}</strong>
                                      {formatTimeOnly(after)}
                                    </>
                                  );
                                }

                                const timeRegex = /(\d{1,2}:\d{2}\s*(?:[ap]\.\s*[mr]\.|[ap]m))/i;
                                return (
                                  <>
                                    {text.split(timeRegex).map((subpart, j) => {
                                      if (timeRegex.test(subpart)) {
                                        return <strong key={j} className="font-extrabold text-slate-800 dark:text-slate-200">{subpart}</strong>;
                                      }
                                      return subpart;
                                    })}
                                  </>
                                );
                              };

                              return <span key={i}>{formatTextSegment(part)}</span>;
                            })}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-primary mt-1.5 font-extrabold">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>
                              {new Date(n.created_at).toLocaleString('es-DO', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <UserMenu nombre={empleado.nombre} rol={empleado.rol} empleadoId={empleado.id} onLogout={onLogout} />
        </header>

        <main className={`flex flex-col ${
          pathname.endsWith('/conversations') 
            ? 'flex-1 overflow-hidden p-0' 
            : pathname.endsWith('/nueva-orden')
              ? 'h-[calc(100vh-4rem)] overflow-hidden p-4 md:p-5'
              : 'min-h-[calc(100vh-4rem)] p-4 md:p-6 lg:p-8'
        }`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  tenant, empleado, pathname, isActive, unreadCount, onNavigate, setShowSoporteModal, setShowHerramientasModal, hasLogistica, hasWhatsApp
}: {
  tenant: { id: string; nombre: string; slug: string; color_primario: string; color_secundario: string; logo_url?: string; plan_id: string };
  empleado: any;
  pathname: string;
  isActive: (to: string, exact?: boolean) => boolean;
  unreadCount: number;
  onNavigate?: () => void;
  setShowSoporteModal: (show: boolean) => void;
  setShowHerramientasModal: (show: boolean) => void;
  hasLogistica: boolean;
  hasWhatsApp: boolean;
}) {
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [myTenants, setMyTenants] = useState<any[]>([]);
  useEffect(() => {
    getTenantsForUser(empleado.email).then(setMyTenants);
  }, [empleado.email]);

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

  const filteredCategories = useMemo(() => {
    const slug = tenant.slug;
    const itemsList = [
      {
        title: "OPERACIÓN",
        items: [
          {to: `/t/${slug}`, label: "Dashboard", icon: LayoutDashboard, exact: true, permission: "dashboard", shortcut: "D"},
          { to: `/t/${slug}/conversations`, label: "Conversaciones", icon: MessageCircle, permission: "conversations" },
          {to: `/t/${slug}/ordenes`, label: "Órdenes", icon: ShoppingCart, permission: "ordenes", shortcut: "O"},
          { to: `/t/${slug}/caja`, label: "Caja", icon: Wallet, permission: "caja", shortcut: "C" },
          { to: `/t/${slug}/gastos`, label: "Gastos", icon: Banknote, permission: "gastos" },
          { to: `/t/${slug}/logistica`, label: "Logística", icon: Truck, permission: "logistica" },
        ]
      },
      {
        title: "CATÁLOGO",
        items: [
          { to: `/t/${slug}/catalogo?tab=prendas`, label: "Prendas", icon: Package, permission: "catalogo" },
          { to: `/t/${slug}/catalogo?tab=servicios`, label: "Servicios", icon: LayoutGrid, permission: "catalogo", hasArrow: true }
        ]
      },
      {
        title: "PERSONAS",
        items: [
          { to: `/t/${slug}/clientes`, label: "Clientes", icon: User, permission: "clientes" },
          { to: `/t/${slug}/personal`, label: "Usuarios", icon: Users, permission: "personal" }
        ]
      },
      {
        title: "ANÁLISIS",
        items: [
          { to: `/t/${slug}/reportes`, label: "Reportes", icon: BarChart3, permission: "reportes" }
        ]
      },
      {
        title: "SISTEMA",
        items: [
          { to: `/t/${slug}/configuracion`, label: "Configuración", icon: Settings, permission: "configuracion", hasArrow: true },
          { to: "#", label: "Soporte", icon: HelpCircle, isSoporte: true }
        ]
      }
    ];

    return itemsList.map(cat => {
      let items = cat.items;
      if (!hasLogistica) items = items.filter(i => i.permission !== "logistica");
      if (!hasWhatsApp) items = items.filter(i => i.permission !== "conversations");
      items = items.filter(i => !i.permission || can(empleado, i.permission));
      return { ...cat, items };
    }).filter(cat => cat.items.length > 0);
  }, [tenant.slug, empleado, hasLogistica, hasWhatsApp]);

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

      <div className="relative border-b border-border/80 px-4 py-3 shrink-0">
        <div 
          className={`flex items-center gap-3.5 transition-all ${
            empleado.rol === "ADMIN" && myTenants.length > 1 ? "cursor-pointer rounded-2xl p-1 -m-1 hover:bg-accent/50" : ""
          }`}
          onClick={() => empleado.rol === "ADMIN" && myTenants.length > 1 && setShowSwitcher(!showSwitcher)}
        >
          <div className="relative h-14 w-14 rounded-full overflow-hidden bg-white shadow-xs border-2 border-primary/30 shrink-0 flex items-center justify-center p-0.5 ring-2 ring-primary/15">
            {tenant.logo_url ? (
              <img src={tenant.logo_url} alt={tenant.nombre} className="h-full w-full object-contain rounded-full" />
            ) : (
              <div className="h-full w-full rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-black text-lg">
                {tenant.nombre.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className="truncate font-display text-[15px] font-black text-slate-900 dark:text-white tracking-tight">
                {tenant.nombre}
              </span>
              {empleado.rol === "ADMIN" && myTenants.length > 1 && (
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${showSwitcher ? "rotate-180" : ""}`} />
              )}
            </div>
            
            <div className="mt-1 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {tenant.rnc ? `RNC: ${tenant.rnc}` : "Sucursal Activa"}
              </span>
            </div>
          </div>
        </div>

        {/* Dropdown de sucursales */}
        {showSwitcher && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowSwitcher(false)} />
            <div className="absolute left-3.5 right-3.5 top-[calc(100%-4px)] z-50 mt-1 overflow-hidden rounded-2xl border border-border bg-popover shadow-xl animate-in fade-in zoom-in-95 duration-200 p-1.5">
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mis Sucursales</div>
              <div className="max-h-[220px] overflow-y-auto space-y-1 custom-scrollbar">
                {myTenants.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { switchBranch(t); setShowSwitcher(false); }}
                    className={`flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition ${t.id === tenant.id ? "bg-primary/10 text-primary font-bold" : "hover:bg-accent"}`}
                  >
                    <div className="h-7 w-7 rounded-lg overflow-hidden bg-white border border-border shadow-xs shrink-0 flex items-center justify-center">
                      {t.logo_url ? <img src={t.logo_url} className="h-full w-full object-cover" /> : <Droplets className="h-3.5 w-3.5 text-primary" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold">{t.nombre}</div>
                      <div className="truncate text-[10px] text-muted-foreground">{t.rnc ? `RNC ${t.rnc}` : "Sucursal principal"}</div>
                    </div>
                    {t.id === tenant.id && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-3 space-y-4 custom-scrollbar">
        {/* Punto de Venta CTA Button */}
        {can(empleado, "nueva-orden") && (
          <div className="px-1 pb-2 flex justify-center shrink-0">
            <Link
              to={`/t/${tenant.slug}/nueva-orden`}
              id="tour-nav-nueva-orden"
              onClick={onNavigate}
              onMouseEnter={() => prefetch('nueva-orden')}
              className="w-full h-11 px-4 rounded-xl text-white shadow-md flex items-center justify-between font-bold text-[14.5px] transition-all hover:scale-[1.02] active:scale-95 border-none bg-[#16A34A] hover:bg-[#15803D] dark:bg-[#15803D] dark:hover:bg-[#16A34A]"
            >
              <div className="flex items-center gap-2.5">
                <PlusCircle className="h-5.5 w-5.5 shrink-0" strokeWidth={2.2} />
                <span>Nueva orden</span>
              </div>
              <kbd className="hidden sm:inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[11px] font-extrabold text-white/95 border border-white/10 shadow-sm shrink-0">
                N
              </kbd>
            </Link>
          </div>
        )}

        {filteredCategories.map((category) => (
          <div key={category.title} className="space-y-1">
            {/* Category Header */}
            <div className="px-3.5 pt-3 pb-1.5 text-[11.5px] font-bold uppercase tracking-wider text-muted-foreground/60 select-none">
              {category.title}
            </div>

            {/* Category Items */}
            <div className="space-y-0.5">
              {category.items.map((item) => {
                const active = item.isSoporte ? false : isActive(item.to, item.exact);
                const isConversations = item.permission === "conversations";

                if (item.isSoporte) {
                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        setShowSoporteModal(true);
                        if (onNavigate) onNavigate();
                      }}
                      className="w-full text-left relative flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-medium transition duration-200 text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-black dark:hover:text-white cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.8} />
                        <span>{item.label}</span>
                      </div>
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    id={`tour-nav-${item.permission}`}
                    onClick={onNavigate}
                    onMouseEnter={() => item.permission && prefetch(item.permission)}
                    className={`relative flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-medium transition duration-200 ${
                      active
                        ? "bg-primary/10 text-black dark:text-white font-semibold"
                        : "text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-black dark:hover:text-white"
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-r-full" style={{ backgroundColor: "var(--primary)" }} />
                    )}
                    <div className="flex items-center gap-3">
                      <item.icon 
                        className="h-5 w-5 shrink-0 transition-colors text-primary" 
                        strokeWidth={1.8}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.hasArrow && (
                      <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" strokeWidth={1.8} />
                    )}

                    {isConversations && unreadCount > 0 && (
                      <Badge className={`text-[10px] h-5 min-w-[20px] flex items-center justify-center font-bold px-1.5 rounded-full border-none shadow-sm animate-in zoom-in duration-300 ${
                        active ? "bg-primary text-white" : "bg-primary text-primary-foreground"
                      }`}>
                        {unreadCount}
                      </Badge>
                    )}

                    {item.shortcut && (
                      <kbd className="hidden sm:inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black shadow-sm shrink-0 uppercase select-none bg-primary text-white border-none">
                        {item.shortcut}
                      </kbd>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {empleado.rol === "ADMIN" && (
        <div className="p-4 pb-2 shrink-0">
          <Link to="/dashboard-admin" onClick={onNavigate}>
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-2xs group">
              <Shield className="h-4 w-4 text-slate-600 dark:text-slate-300 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-bold tracking-wide uppercase">Panel Administrador</span>
            </div>
          </Link>
        </div>
      )}

      {/* Tarjeta Herramientas */}
      <div className="mt-auto border-t border-border p-3 shrink-0">
        <button
          type="button"
          onClick={() => {
            setShowHerramientasModal(true);
            if (onNavigate) onNavigate();
          }}
          className="w-full flex items-center justify-between gap-2 py-1.5 pl-4 pr-1.5 rounded-2xl bg-gradient-to-r from-[#1B365D] to-[#2B4C7E] text-white shadow-md hover:shadow-lg hover:scale-[1.01] transition-all cursor-pointer group border border-white/10 active:scale-95"
          title="Abrir Herramientas Klynn"
        >
          <span className="flex-1 text-center font-display font-black text-[14.5px] tracking-tight text-white">
            Herramientas Klynn
          </span>
          
          <div className="h-7.5 w-7.5 rounded-full bg-amber-400 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 group-hover:rotate-12 transition-transform">
            <Wrench className="h-4 w-4 text-[#1B365D]" />
          </div>
        </button>
      </div>
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
              onClick={() => { window.open("https://wa.me/18299416546?text=Hola Klynn, necesito soporte.", "_blank"); setOpen(false); }} 
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-accent border-b border-border"
            >
              <MessageCircle className="h-4 w-4 text-emerald-500 animate-pulse" /> Soporte
            </button>
            <button 
              onClick={() => { toast.info("Tutoriales y guías próximamente 🚀"); setOpen(false); }} 
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-accent border-b border-border"
            >
              <BookOpen className="h-4 w-4 text-blue-500" /> Tutoriales y guías
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

// Helper: estado badge para reusar con iconos hermosos estilo POS
export function EstadoBadge({ estado }: { estado: string }) {
  const norm = estado.replace("_", " ").toUpperCase();

  const config: Record<string, { icon: any; style: string }> = {
    RECIBIDA: {
      icon: Inbox,
      style: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300",
    },
    "EN PROCESO": {
      icon: RotateCw,
      style: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
    },
    EN_PROCESO: {
      icon: RotateCw,
      style: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
    },
    LISTA: {
      icon: CheckCircle2,
      style: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
    },
    EN_CAMINO: {
      icon: Truck,
      style: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300",
    },
    "EN CAMINO": {
      icon: Truck,
      style: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300",
    },
    ENTREGADA: {
      icon: Truck,
      style: "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/50 dark:bg-purple-950/40 dark:text-purple-300",
    },
    PAGADA: {
      icon: CheckCircle2,
      style: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
    },
    ANULADA: {
      icon: Ban,
      style: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300",
    },
  };

  const item = config[norm] || config[estado] || { icon: CheckCircle2, style: "border-slate-200 bg-slate-50 text-slate-700" };
  const Icon = item.icon;

  return (
    <Badge
      variant="outline"
      className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${item.style}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{norm}</span>
    </Badge>
  );
}

/* ==========================================
 * SUITE DE HERRAMIENTAS DEL SISTEMA
 * ========================================== */

function HerramientasModal({
  tenant,
  empleado,
  onClose,
  activeTool,
  setActiveTool,
}: {
  tenant: any;
  empleado: any;
  onClose: () => void;
  activeTool: null | "calculadora" | "urgentes" | "ultima_factura" | "notas";
  setActiveTool: (t: null | "calculadora" | "urgentes" | "ultima_factura" | "notas") => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[560px] overflow-hidden rounded-3xl bg-background border border-slate-200/80 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200 [&>button]:bg-slate-100 [&>button]:text-slate-600 [&>button]:hover:bg-slate-200 [&>button]:border [&>button]:border-slate-200 [&>button]:h-7.5 [&>button]:w-7.5 [&>button]:top-4 [&>button]:right-4 [&>button]:rounded-full"
        onClick={(e) => e.stopPropagation()}
      >
        {!activeTool ? (
          <>
            <div className="flex items-center justify-between border-b border-border/50 pb-3.5">
              <div className="flex items-center gap-3">
                <Wrench className="h-7 w-7 text-primary shrink-0" />
                <div className="text-left">
                  <h3 className="font-extrabold text-base text-foreground tracking-tight">
                    Herramientas Klynn
                  </h3>
                  <p className="text-[11.5px] text-muted-foreground mt-0.5">Utilidades operativas rápidas para tu lavandería</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 hover:scale-105 transition-all shadow-xs border-none cursor-pointer shrink-0"
              >
                <X className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Tool 1 */}
              <button
                onClick={() => setActiveTool("calculadora")}
                className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 hover:bg-amber-500/5 dark:hover:bg-amber-950/20 border border-slate-200/80 dark:border-slate-800 hover:border-amber-500/40 text-left transition-all group shadow-2xs hover:shadow-md cursor-pointer flex flex-col justify-between h-[120px]"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 group-hover:scale-110 transition-transform">
                    <Scale className="h-4.5 w-4.5" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                </div>
                <div>
                  <div className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm">Calculadora de Libras</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">Calcula costo por peso con tarifa por libra y desgloses</div>
                </div>
              </button>

              {/* Tool 2 */}
              <button
                onClick={() => setActiveTool("urgentes")}
                className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 hover:bg-rose-500/5 dark:hover:bg-rose-950/20 border border-slate-200/80 dark:border-slate-800 hover:border-rose-500/40 text-left transition-all group shadow-2xs hover:shadow-md cursor-pointer flex flex-col justify-between h-[120px]"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 group-hover:scale-110 transition-transform">
                    <Flame className="h-4.5 w-4.5" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
                </div>
                <div>
                  <div className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm">Órdenes Urgentes</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">Ver y dar seguimiento a órdenes prioritarias del turno</div>
                </div>
              </button>

              {/* Tool 3 */}
              <button
                onClick={() => setActiveTool("ultima_factura")}
                className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 hover:bg-emerald-500/5 dark:hover:bg-emerald-950/20 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/40 text-left transition-all group shadow-2xs hover:shadow-md cursor-pointer flex flex-col justify-between h-[120px]"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                    <Printer className="h-4.5 w-4.5" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                </div>
                <div>
                  <div className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm">Imprimir Última Factura</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">Reimprime de forma instantánea el ticket de la última orden</div>
                </div>
              </button>

              {/* Tool 4 */}
              <button
                onClick={() => setActiveTool("deliveries")}
                className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 hover:bg-sky-500/5 dark:hover:bg-sky-950/20 border border-slate-200/80 dark:border-slate-800 hover:border-sky-500/40 text-left transition-all group shadow-2xs hover:shadow-md cursor-pointer flex flex-col justify-between h-[120px]"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20 group-hover:scale-110 transition-transform">
                    <Truck className="h-4.5 w-4.5" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
                </div>
                <div>
                  <div className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm">Consulta de Delivery</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">Órdenes activas con envío a domicilio y dirección registrada</div>
                </div>
              </button>

              {/* Tool 5 */}
              <button
                onClick={() => setActiveTool("conveyor")}
                className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 hover:bg-primary/5 dark:hover:bg-primary/10 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 text-left transition-all group shadow-2xs hover:shadow-md cursor-pointer flex flex-col justify-between h-[120px] sm:col-span-2"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-110 transition-transform">
                    <Package className="h-4.5 w-4.5" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <div>
                  <div className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm">Ubicación en Conveyor / Perchero</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">Localiza rápidamente el gancho o perchero colgado de la prenda</div>
                </div>
              </button>
            </div>
          </>
        ) : (
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-border mb-4">
              <button
                onClick={() => setActiveTool(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-extrabold shadow-xs hover:bg-primary/90 hover:scale-[1.02] transition-all cursor-pointer border-none"
              >
                <ChevronRight className="h-3.5 w-3.5 rotate-180" /> Volver atrás
              </button>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 hover:scale-105 transition-all shadow-xs border-none cursor-pointer shrink-0"
              >
                <X className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>

            {activeTool === "calculadora" && <CalculadoraLibrasTool tenant={tenant} />}
            {activeTool === "urgentes" && <OrdenesUrgentesTool tenant={tenant} onClose={onClose} />}
            {activeTool === "ultima_factura" && <UltimaFacturaTool tenant={tenant} empleado={empleado} />}
            {activeTool === "deliveries" && <DeliveryEnveosTool tenant={tenant} onClose={onClose} />}
            {activeTool === "conveyor" && <UbicacionConveyorTool tenant={tenant} />}
            {activeTool === "notas" && <NotasRecordatoriosTool tenant={tenant} empleado={empleado} />}
          </div>
        )}
      </div>
    </div>
  );
}

/* 1. CALCULADORA DE LIBRAS TOOL */
function CalculadoraLibrasTool({ tenant }: { tenant: any }) {
  const [precioLibra, setPrecioLibra] = useState<number>(35);
  const [libras, setLibras] = useState<number>(10);

  const total = precioLibra * libras;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <Scale className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-display text-lg font-black text-slate-900 dark:text-white">Calculadora de Libras</h4>
          <p className="text-xs text-muted-foreground">Estima rápidamente el costo de lavado por peso</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Precio por libra (RD$)</label>
          <input
            type="number"
            min="1"
            value={precioLibra}
            onChange={(e) => setPrecioLibra(Math.max(0, Number(e.target.value)))}
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cantidad de libras (lbs)</label>
          <input
            type="number"
            min="0.5"
            step="0.5"
            value={libras}
            onChange={(e) => setLibras(Math.max(0, Number(e.target.value)))}
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Añadir libras rápido:</span>
        <div className="flex gap-2 flex-wrap">
          {[5, 10, 15, 20, 30, 50].map((num) => (
            <button
              key={num}
              onClick={() => setLibras((prev) => prev + num)}
              className="px-3 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              +{num} lbs
            </button>
          ))}
          <button
            onClick={() => setLibras(0)}
            className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/25 flex items-center justify-between shadow-2xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 block">Total Estimado</span>
          <span className="text-xs text-amber-700/80 dark:text-amber-400">{libras} lbs × RD${precioLibra}.00/lb</span>
        </div>
        <div className="font-display text-3xl font-black text-amber-900 dark:text-amber-200">
          {formatRD(total)}
        </div>
      </div>
    </div>
  );
}

/* 2. ÓRDENES URGENTES TOOL */
function OrdenesUrgentesTool({ tenant, onClose }: { tenant: any; onClose: () => void }) {
  const navigate = useNavigate();
  const [urgentes, setUrgentes] = useState<any[]>([]);
  const [clientesList, setClientesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getOrdenes(tenant.id),
      getClientes(tenant.id)
    ]).then(([all, clis]) => {
      const list = (all || []).filter((o: any) => o.es_urgente && o.estado !== "ENTREGADA" && o.estado !== "ANULADA");
      setUrgentes(list);
      setClientesList(clis || []);
      setLoading(false);
    });
  }, [tenant.id]);

  const getClienteNombre = (ord: any) => {
    if (ord.cliente_nombre) return ord.cliente_nombre;
    const c = clientesList.find((x: any) => x.id === ord.cliente_id);
    if (c) {
      const full = `${c.nombre} ${c.apellido || ""}`.trim();
      return full || "Consumidor Final";
    }
    return "Consumidor Final";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
          <Flame className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-display text-lg font-black text-slate-900 dark:text-white">Órdenes Urgentes Activas</h4>
          <p className="text-xs text-muted-foreground">{urgentes.length} órdenes prioritarias pendientes de entrega</p>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">Cargando órdenes urgentes...</div>
      ) : urgentes.length === 0 ? (
        <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
          <div className="text-sm font-bold text-slate-700 dark:text-slate-300">¡No hay órdenes urgentes pendientes!</div>
          <div className="text-xs text-muted-foreground">Todas las prendas prioritarias han sido entregadas o procesadas.</div>
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar pr-1">
          {urgentes.map((ord) => (
            <div key={ord.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-rose-500/25 flex items-center justify-between gap-3 shadow-2xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground">Orden #{ord.numero}</span>
                  <EstadoBadge estado={ord.estado} />
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Cliente: <span className="font-medium text-foreground">{getClienteNombre(ord)}</span></div>
              </div>
              <div className="text-right">
                <div className="font-display font-black text-sm text-rose-600 dark:text-rose-400">{formatRD(ord.total)}</div>
                <button
                  onClick={() => {
                    onClose();
                    navigate({ to: `/t/${tenant.slug}/ordenes` });
                  }}
                  className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                >
                  Ver en órdenes →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* 3. IMPRIMIR ÚLTIMA FACTURA TOOL */
function UltimaFacturaTool({ tenant, empleado }: { tenant: any; empleado: any }) {
  const [ultimaOrden, setUltimaOrden] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPrintPortal, setShowPrintPortal] = useState(false);
  const [clientesList, setClientesList] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      getOrdenes(tenant.id),
      getClientes(tenant.id)
    ]).then(([all, clis]) => {
      if (all && all.length > 0) {
        setUltimaOrden(all[0]);
      }
      setClientesList(clis || []);
      setLoading(false);
    });
  }, [tenant.id]);

  const handlePrint = () => {
    if (!ultimaOrden) return;
    setShowPrintPortal(true);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <Printer className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-display text-lg font-black text-slate-900 dark:text-white">Imprimir Última Factura</h4>
          <p className="text-xs text-muted-foreground">Reimprime el ticket térmico de la orden más reciente</p>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">Buscando última orden registrada...</div>
      ) : !ultimaOrden ? (
        <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <div className="text-sm font-bold text-slate-700 dark:text-slate-300">No hay órdenes en el sistema</div>
          <div className="text-xs text-muted-foreground mt-0.5">Aún no se han registrado ventas en esta sucursal.</div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Última Orden Registrada</span>
              <EstadoBadge estado={ultimaOrden.estado} />
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <div>
                <div className="font-display text-xl font-black text-foreground">Orden #{ultimaOrden.numero}</div>
                <div className="text-xs text-muted-foreground">Cliente: {clientesList.find(c => c.id === ultimaOrden.cliente_id)?.nombre || ultimaOrden.cliente_nombre || "Consumidor Final"}</div>
              </div>
              <div className="font-display text-2xl font-black text-emerald-700 dark:text-emerald-400">
                {formatRD(ultimaOrden.total)}
              </div>
            </div>
          </div>

          <Button
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs gap-2 shadow-sm cursor-pointer"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4" /> Reimprimir Ticket
          </Button>

          {showPrintPortal && (
            <TicketPrintPortal
              orden={ultimaOrden}
              tenant={tenant}
              clientes={clientesList}
              empleados={[empleado]}
              onClose={() => setShowPrintPortal(false)}
              hiddenPreview={true}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* 4. CONSULTA DE DELIVERY Y ENVÍOS ACTIVOS TOOL */
function DeliveryEnveosTool({ tenant, onClose }: { tenant: any; onClose: () => void }) {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getOrdenes(tenant.id),
      getClientes(tenant.id)
    ]).then(([all, clis]) => {
      const activeDeliveries = (all || []).filter((o: any) => {
        const c = (clis || []).find((x: any) => x.id === o.cliente_id);
        const tieneCostoEnvio = o.costo_envio && o.costo_envio > 0;
        const tieneDireccionCliente = c && c.direccion && c.direccion.trim().length > 0;
        const noFinalizada = o.estado !== "ENTREGADA" && o.estado !== "ANULADA";
        return (tieneCostoEnvio || tieneDireccionCliente) && noFinalizada;
      }).map((o: any) => {
        const c = (clis || []).find((x: any) => x.id === o.cliente_id);
        return {
          ...o,
          cliente_info: c
        };
      });

      setDeliveries(activeDeliveries);
      setLoading(false);
    });
  }, [tenant.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
          <Truck className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-display text-lg font-black text-slate-900 dark:text-white">Delivery y Envíos Activos</h4>
          <p className="text-xs text-muted-foreground">{deliveries.length} envíos pendientes de despacho con dirección registrada</p>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">Cargando envíos activos...</div>
      ) : deliveries.length === 0 ? (
        <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
          <div className="text-sm font-bold text-slate-700 dark:text-slate-300">¡No hay envíos pendientes!</div>
          <div className="text-xs text-muted-foreground">Todas las órdenes con envío han sido entregadas o no hay direcciones registradas.</div>
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
          {deliveries.map((ord) => {
            const cliName = ord.cliente_info ? `${ord.cliente_info.nombre} ${ord.cliente_info.apellido || ""}`.trim() : ord.cliente_nombre || "Consumidor Final";
            const dir = ord.cliente_info?.direccion || "Dirección no especificada";
            const tel = ord.cliente_info?.telefono || ord.telefono;

            return (
              <div key={ord.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-sky-500/25 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-foreground">Orden #{ord.numero}</span>
                    <EstadoBadge estado={ord.estado} />
                  </div>
                  <span className="font-display font-black text-sm text-sky-700 dark:text-sky-400">{formatRD(ord.total)}</span>
                </div>

                <div className="text-xs space-y-0.5 text-muted-foreground">
                  <div><span className="font-bold text-foreground">Cliente:</span> {cliName}</div>
                  <div className="flex items-start gap-1 text-slate-700 dark:text-slate-300 font-medium">
                    <span className="font-bold text-foreground shrink-0">📍 Dirección:</span>
                    <span className="line-clamp-2">{dir}</span>
                  </div>
                  {tel && tel !== "---" && (
                    <div className="pt-0.5">
                      <a
                        href={`https://wa.me/1${tel.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline"
                      >
                        <MessageCircle className="h-3 w-3" /> Tel: {tel}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* 5. CONSULTAR UBICACIÓN EN CONVEYOR / PERCHERO TOOL */
function UbicacionConveyorTool({ tenant }: { tenant: any }) {
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [clientesList, setClientesList] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getOrdenes(tenant.id),
      getClientes(tenant.id)
    ]).then(([all, clis]) => {
      setOrdenes((all || []).filter((o: any) => o.estado === "LISTA"));
      setClientesList(clis || []);
      setLoading(false);
    });
  }, [tenant.id]);

  const result = ordenes.filter((ord) => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return true;
    const num = (ord.numero || "").toLowerCase();
    const ubi = (ord.ubicacion_ropa || "").toLowerCase();
    const c = clientesList.find((x) => x.id === ord.cliente_id);
    const cliName = c ? `${c.nombre} ${c.apellido || ""}`.toLowerCase() : "";
    return num.includes(q) || ubi.includes(q) || cliName.includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
          <Package className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-display text-lg font-black text-slate-900 dark:text-white">Ubicación en Conveyor / Perchero</h4>
          <p className="text-xs text-muted-foreground">{ordenes.length} órdenes listas colgadas en conveyor o perchero</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por # de Orden, Nombre de Cliente o Gancho..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">Cargando posiciones en conveyor...</div>
      ) : result.length === 0 ? (
        <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-muted-foreground">
          No se encontraron coincidencias para la búsqueda.
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
          {result.slice(0, 15).map((ord) => {
            const c = clientesList.find((x) => x.id === ord.cliente_id);
            const cliName = c ? `${c.nombre} ${c.apellido || ""}`.trim() : ord.cliente_nombre || "Consumidor Final";

            return (
              <div key={ord.id} className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shadow-2xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-foreground">Orden #{ord.numero}</span>
                    <EstadoBadge estado={ord.estado} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">Cliente: <span className="font-medium text-foreground">{cliName}</span></div>
                </div>

                <div className="text-right">
                  {ord.ubicacion_ropa ? (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary/10 text-primary border border-primary/25 font-black text-sm sm:text-base shadow-2xs">
                      📍 {ord.ubicacion_ropa}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs">
                      Sin Ubicación
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { formatRD };
