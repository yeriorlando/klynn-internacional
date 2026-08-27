import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
import { 
  Building2, 
  TrendingUp, 
  Package, 
  ExternalLink, 
  ArrowRight, 
  LayoutDashboard, 
  LogOut, 
  Shield, 
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Crown,
  MessageCircle,
  DollarSign,
  Users,
  Wallet,
  Calendar,
  Zap,
  Rocket,
  MessageSquare,
  FileText,
  Wrench,
  Layers,
  Clock,
  AlertCircle,
  Search,
  Filter,
  BarChart3,
  CreditCard,
  Truck
} from "lucide-react";
import { Logo } from "@/components/klynn/Logo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { 
  getTenantsForUser, 
  getTenantBranchName,
  getOrdenes, 
  getPlans,
  PLANS,
  formatRD, 
  setActiveTenant,
  setSession,
  logout,
  getGastos,
  getMovimientos,
  getEmpleados,
  getNextRenewalDate,
  getCajas,
  type Tenant,
  type Plan 
} from "@/lib/storage";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePlans } from "@/hooks/use-queries";

export const Route = createFileRoute("/dashboard-admin")({
  head: () => ({ meta: [{ title: "Mis Lavanderías — Klynn" }] }),
  component: DashboardAdminPage,
});

function PlanBadge({ id }: { id: string }) {
  const configs: Record<string, { label: string; icon: any; className: string; iconColor: string }> = {
    basico: { 
      label: "Básico", 
      icon: Zap, 
      className: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800",
      iconColor: "text-sky-500 dark:text-sky-400"
    },
    pro: { 
      label: "Pro", 
      icon: Crown, 
      className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
      iconColor: "text-purple-600 dark:text-purple-400"
    },
    enterprise: { 
      label: "Enterprise", 
      icon: Rocket, 
      className: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700",
      iconColor: "text-amber-600 dark:text-amber-400"
    },
  };
  const config = configs[id] || { label: id, icon: Zap, className: "bg-muted/60 text-foreground border-border", iconColor: "text-muted-foreground" };
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 w-fit ${config.className}`}
    >
      <Icon className={`h-3 w-3 ${config.iconColor}`} />
      <span>{config.label}</span>
    </Badge>
  );
}

function DashboardAdminPage() {
  const auth = useRequireAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userEmail = auth?.empleado.email || "";

  const { data: plans = [] } = usePlans();

  const { data: dashboardData, isLoading: loadingDashboard } = useQuery({
    queryKey: ["dashboard-admin-data", userEmail],
    queryFn: async () => {
      if (!userEmail) return null;
      const tenants = await getTenantsForUser(userEmail);

      const ordsResults = await Promise.all(
        tenants.map(async (t) => {
          try {
            const ords = await getOrdenes(t.id);
            const ordsArr = Array.isArray(ords) ? ords : [];
            const ingr = ordsArr.reduce((s: number, o: any) => s + (o.total || 0), 0);
            return { tenantId: t.id, count: ordsArr.length, total: ingr, estado: t.estado };
          } catch {
            return { tenantId: t.id, count: 0, total: 0, estado: t.estado };
          }
        })
      );

      let totalIngresos = 0, totalOrdenesCount = 0, activasCount = 0;
      const tStats: Record<string, { count: number; total: number }> = {};
      for (const res of ordsResults) {
        tStats[res.tenantId] = { count: res.count, total: res.total };
        totalIngresos += res.total;
        totalOrdenesCount += res.count;
        if (res.estado !== "CANCELADO") activasCount++;
      }

      return {
        tenants,
        tenantStats: tStats,
        stats: { totalIngresos, totalOrdenesCount, activasCount }
      };
    },
    enabled: !!userEmail && auth?.empleado.id !== '__loading__',
    staleTime: 60_000,
  });

  const myTenants = dashboardData?.tenants || [];
  const tenantStats = dashboardData?.tenantStats || {};
  const stats = dashboardData?.stats || { totalIngresos: 0, totalOrdenesCount: 0, activasCount: 0 };
  const loading = loadingDashboard && myTenants.length === 0;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const filteredTenants = useMemo(() => {
    return myTenants.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q || 
        t.nombre.toLowerCase().includes(q) || 
        t.email?.toLowerCase().includes(q) || 
        t.telefono?.toLowerCase().includes(q) || 
        t.slug.toLowerCase().includes(q) ||
        (t.rnc && t.rnc.toLowerCase().includes(q));
      
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "ACTIVO" && t.estado === "ACTIVO") ||
        (statusFilter === "TRIAL" && t.estado === "TRIAL");

      return matchesQuery && matchesStatus;
    });
  }, [myTenants, searchQuery, statusFilter]);

  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedInspectTenant, setSelectedInspectTenant] = useState<Tenant | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectData, setInspectData] = useState<{
    ordenes: any[];
    gastos: any[];
    empleados: any[];
    movimientos: any[];
    cajas: any[];
  } | null>(null);

  useEffect(() => {
    async function loadInspect() {
      if (!selectedInspectTenant) {
        setInspectData(null);
        return;
      }
      setInspectLoading(true);
      try {
        const [oList, gList, eList, mList, cList] = await Promise.all([
          getOrdenes(selectedInspectTenant.id),
          getGastos(selectedInspectTenant.id),
          getEmpleados(selectedInspectTenant.id),
          getMovimientos(selectedInspectTenant.id),
          getCajas(selectedInspectTenant.id)
        ]);
        setInspectData({
          ordenes: oList || [],
          gastos: gList || [],
          empleados: eList || [],
          movimientos: mList || [],
          cajas: cList || []
        });
      } catch (err) {
        console.error("Error loading inspect data:", err);
        toast.error("Error al cargar estadísticas de la sucursal");
      } finally {
        setInspectLoading(false);
      }
    }
    loadInspect();
  }, [selectedInspectTenant]);

  const inspectStats = useMemo(() => {
    if (!inspectData) return null;
    const { ordenes, gastos, movimientos, cajas } = inspectData;

    const totalVentas = ordenes.reduce((s, o) => s + (o.total || 0), 0);
    const totalITBIS = ordenes.reduce((s, o) => s + (o.itbis || 0), 0);
    
    // Gastos manuales + caja chica
    const gastosManuales = gastos.filter(g => !g.is_caja_chica).reduce((s, g) => s + g.monto, 0);
    const gastosCajaChica = gastos.filter(g => g.is_caja_chica).reduce((s, g) => s + g.monto, 0);
    const totalGastos = gastos.reduce((s, g) => s + (g.monto || 0), 0);

    const rentabilidad = totalVentas - totalGastos;
    const ticketPromedio = ordenes.length > 0 ? totalVentas / ordenes.length : 0;

    // Métodos de Pago
    const porMetodo = ordenes.reduce((m, o) => { 
      m[o.metodo_pago] = (m[o.metodo_pago] || 0) + (o.total || 0); 
      return m; 
    }, {} as Record<string, number>);

    // Gastos por Categoría
    const porCategoria = gastos.reduce((m, g) => {
      const cat = g.categoria || "Otros";
      m[cat] = (m[cat] || 0) + g.monto;
      return m;
    }, {} as Record<string, number>);

    // Estados de Órdenes
    const porEstado = ordenes.reduce((m, o) => {
      m[o.estado] = (m[o.estado] || 0) + 1;
      return m;
    }, {} as Record<string, number>);

    // Cierres de caja (últimos 5)
    const cierresCaja = [...cajas]
      .filter((c: any) => c.estado === "CERRADA")
      .sort((a, b) => new Date(b.cerrada_en || 0).getTime() - new Date(a.cerrada_en || 0).getTime())
      .slice(0, 5);

    // Actividad Reciente en las últimas 48 horas (unificada)
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    const feedItems: any[] = [];

    // 1. Órdenes
    ordenes.forEach(o => {
      feedItems.push({
        id: `ord-${o.id}`,
        titulo: `Orden Recibida`,
        desc: `Orden ${o.numero} creada`,
        monto: o.total,
        fecha: o.creado_en,
        badgeText: "PEDIDO",
        color: "bg-blue-50 text-blue-700 border-blue-100"
      });
    });

    // 2. Movimientos de caja (aperturas, cierres, abonos, ventas)
    movimientos.forEach(m => {
      const conceptoLower = (m.concepto || "").toLowerCase();
      let titulo = "Movimiento de Caja";
      let color = "bg-slate-50 text-slate-700 border-slate-100";
      let badgeText = "CAJA";

      if (conceptoLower.includes("apertura")) {
        titulo = "Apertura de Caja";
        color = "bg-emerald-50 text-emerald-700 border-emerald-100";
        badgeText = "APERTURA";
      } else if (conceptoLower.includes("cierre")) {
        titulo = "Cierre de Caja";
        color = "bg-amber-50 text-amber-700 border-amber-100";
        badgeText = "CIERRE";
      } else if (m.tipo === "GASTO_CAJA_CHICA") {
        titulo = "Gasto Caja Chica";
        color = "bg-rose-50 text-rose-700 border-rose-100";
        badgeText = "EGRESO CAJA CHICA";
      } else if (m.tipo === "VENTA" || m.tipo === "ABONO") {
        titulo = m.tipo === "VENTA" ? "Cobro Recibido" : "Abono Registrado";
        color = "bg-green-50 text-green-700 border-green-100";
        badgeText = "COBRO";
      } else if (m.tipo === "EGRESO" || m.tipo === "RETIRO") {
        titulo = m.tipo === "RETIRO" ? "Retiro de Efectivo" : "Egreso de Caja";
        color = "bg-rose-50 text-rose-700 border-rose-100";
        badgeText = "RETIRO";
      }

      feedItems.push({
        id: `mov-${m.id}`,
        titulo,
        desc: m.concepto,
        monto: m.monto,
        fecha: m.creado_en,
        badgeText,
        color
      });
    });

    // 3. Gastos manuales
    gastos.filter(g => !g.is_caja_chica).forEach(g => {
      feedItems.push({
        id: `gas-${g.id}`,
        titulo: `Gasto: ${g.categoria}`,
        desc: g.descripcion || "Egreso bancario",
        monto: g.monto,
        fecha: g.fecha,
        badgeText: "GASTO BANCARIO",
        color: "bg-rose-100 text-rose-800 border-rose-200"
      });
    });

    // Filtrar a las últimas 48 horas
    let recientes = feedItems.filter(item => new Date(item.fecha).getTime() >= cutoff);

    // Fallback: si no hay actividades en las últimas 48 horas, mostrar las últimas 5 generales
    if (recientes.length === 0) {
      recientes = [...feedItems];
    }

    recientes = recientes
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 10); // Límite de 10

    // --- 1. Top de Servicios Más Vendidos ---
    const serviceCounts: Record<string, { count: number; total: number }> = {};
    ordenes.forEach(o => {
      if (Array.isArray(o.items)) {
        o.items.forEach((item: any) => {
          const desc = item.descripcion || "Otros";
          const qty = item.cantidad || 1;
          const sub = (item.precio_unitario || 0) * qty;
          if (!serviceCounts[desc]) {
            serviceCounts[desc] = { count: 0, total: 0 };
          }
          serviceCounts[desc].count += qty;
          serviceCounts[desc].total += sub;
        });
      }
    });

    const topServicios = Object.entries(serviceCounts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // --- 2. Canal de Entrega ---
    const totalOrds = ordenes.length || 1;
    const ordsDomicilio = ordenes.filter(o => o.entrega_domicilio).length;
    const ordsLocal = totalOrds - ordsDomicilio;
    const pctDomicilio = Math.round((ordsDomicilio / totalOrds) * 100);
    const pctLocal = 100 - pctDomicilio;

    // --- 3. Tasa de Urgencia ---
    const ordsUrgentes = ordenes.filter(o => o.es_urgente).length;
    const pctUrgencia = Math.round((ordsUrgentes / totalOrds) * 100);

    // --- 4. Desglose Avanzado de Delivery ---
    const deliveryEntregados = ordenes.filter(o => o.entrega_domicilio && o.estado === "ENTREGADA").length;
    const deliveryCancelados = ordenes.filter(o => o.entrega_domicilio && o.estado === "ANULADA").length;
    const deliveryPendientes = ordenes.filter(o => o.entrega_domicilio && o.estado !== "ENTREGADA" && o.estado !== "ANULADA").length;

    // --- 5. Créditos y Deudas de Clientes ---
    const activeOrds = ordenes.filter(o => o.estado !== "ANULADA");
    const totalDeuda = activeOrds.reduce((s, o) => s + (o.saldo || 0), 0);
    const cantidadDeudas = activeOrds.filter(o => (o.saldo || 0) > 0).length;
    const totalAbonado = activeOrds.filter(o => (o.saldo || 0) > 0).reduce((s, o) => s + (o.pagado || 0), 0);

    // Buscar abonos reales en los movimientos de caja
    const realAbonosMovs = movimientos.filter(m => m.concepto?.toLowerCase().includes("abono"));
    const totalAbonosCaja = realAbonosMovs.reduce((s, m) => s + m.monto, 0);

    return {
      totalVentas,
      totalITBIS,
      totalGastos,
      rentabilidad,
      ticketPromedio,
      porMetodo,
      porCategoria,
      porEstado,
      cierresCaja,
      recientes,
      topServicios,
      ordsDomicilio,
      ordsLocal,
      pctDomicilio,
      pctLocal,
      ordsUrgentes,
      pctUrgencia,
      deliveryEntregados,
      deliveryCancelados,
      deliveryPendientes,
      totalDeuda,
      cantidadDeudas,
      totalAbonado,
      totalAbonosCaja
    };
  }, [inspectData]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment_success") === "true") {
      setShowSuccessModal(true);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  const mainTenant = myTenants[0];
  const sucursalesCreadas = myTenants.length;
  
  const plan = useMemo(() => {
    if (!mainTenant) return null;
    return plans.find(p => p.id === mainTenant.plan_id) || plans[0] || PLANS[0];
  }, [mainTenant, plans]);

  // Si no hay límite de sucursales en la columna max_sucursales, buscar en config o por defecto 1 (la base)
  const maxSucursalesContratadas = mainTenant?.max_sucursales || mainTenant?.config?.max_sucursales || 1;

  // Límite de adicionales según el plan
  const limiteAdicionalesPlan = useMemo(() => {
    if (!plan) return 3; // default
    if (plan.limite_sucursales_adicionales !== undefined) return plan.limite_sucursales_adicionales;
    return plan.id === "basico" ? 1 : plan.id === "pro" ? 3 : 5;
  }, [plan]);

  const totalMaxSucursalesPlan = 1 + limiteAdicionalesPlan;
  const tieneCuposLibres = sucursalesCreadas < maxSucursalesContratadas;
  const puedeComprarMas = maxSucursalesContratadas < totalMaxSucursalesPlan;
  
  const precioAdicional = useMemo(() => {
    if (!plan) return 1200;
    if (plan.precio_sucursal_adicional !== undefined) return plan.precio_sucursal_adicional;
    return plan.id === "basico" ? 1000 : plan.id === "pro" ? 1200 : 1500;
  }, [plan]);

  const polarSucursalUrl = plan?.polar_sucursal_url || "";

  function handleManage(tenantId: string, slug: string) {
    setSession({ empleado_id: auth?.empleado.id || 'admin', tenant_id: tenantId, iniciado_en: new Date().toISOString() });
    setActiveTenant(slug);
    toast.success(`Entrando a ${slug}...`);
    setTimeout(() => window.location.assign(`/t/${slug}`), 500);
  }

  async function handleLogout() {
    const slug = auth?.tenant?.slug || myTenants[0]?.slug || (typeof window !== "undefined" ? localStorage.getItem("klynn_active_tenant") : null);
    await logout();
    if (slug && slug !== "admin") {
      window.location.assign(`/t/${slug}/login`);
    } else {
      window.location.assign("/login");
    }
  }

  if (!auth || auth.empleado.id === '__loading__') {
    return <GlobalPageLoader text="Cargando panel de administración..." minHeight="min-h-screen" />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header replicado de admin.tsx */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge className="bg-[#1B4B73] hover:bg-[#1B4B73] text-white border-0 font-bold shadow-2xs text-xs px-3 py-1 rounded-xl">
              <Shield className="mr-1.5 h-3.5 w-3.5 text-[#F0B900]" /> Panel Propietario
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            {auth?.empleado?.email && (
              <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-[#1B4B73] border-0 text-white shadow-xs">
                <div className="h-6 w-6 rounded-full bg-white/20 text-[#F0B900] flex items-center justify-center text-[11px] font-black shrink-0">
                  {auth.empleado.email.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs sm:text-sm font-bold text-white tracking-tight truncate max-w-[200px]">
                  {auth.empleado.email}
                </span>
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-rose-600 hover:bg-rose-700 active:scale-95 text-white border border-rose-600 transition-all cursor-pointer shrink-0 whitespace-nowrap"
            >
              <LogOut className="h-4 w-4 shrink-0 text-white" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl tracking-tight">Panel central de Propietario</h1>
            <p className="mt-1 text-muted-foreground">Administra tus lavanderías y sucursales en tiempo real.</p>
          </div>
          <Button 
            onClick={() => setShowBranchModal(true)}
            className="bg-primary text-white hover:bg-primary/90 h-10 px-5 rounded-xl shadow-md transition-all active:scale-95 font-bold"
          >
            <Building2 className="mr-2 h-4 w-4" /> Registrar nueva sucursal
          </Button>
        </div>

        {/* KPIs replicados de admin.tsx */}
        <div className="mt-5 sm:mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KPI 
            title="Mis Lavanderías" 
            value={`${stats.activasCount} / ${myTenants.length}`} 
            sub={`${stats.activasCount} Activas • ${myTenants.filter(t => t.estado === 'TRIAL').length} Pruebas`} 
            icon={Building2} 
            variant="primary" 
          />
          <KPI 
            title="Ingresos Totales" 
            value={formatRD(stats.totalIngresos)} 
            sub="Facturado en plataforma" 
            icon={TrendingUp} 
            variant="emerald" 
          />
          <KPI 
            title="Órdenes Totales" 
            value={stats.totalOrdenesCount.toLocaleString("es-DO")} 
            sub="Pedidos acumulados" 
            icon={Package} 
            variant="indigo" 
          />
          <KPI 
            title="Cupos Sucursal" 
            value={`${sucursalesCreadas} / ${maxSucursalesContratadas}`} 
            sub={tieneCuposLibres ? "¡Cupo disponible para agregar!" : "Límite actual de tu plan"} 
            icon={Crown} 
            variant="amber" 
          />
        </div>

        {/* Barra de Búsqueda y Filtros de Estado */}
        <div className="mt-6 sm:mt-8 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-surface p-3.5 sm:p-4 rounded-2xl border border-border/50 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, correo, RNC o subdominio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 rounded-xl bg-background border-border/80 text-sm focus-visible:ring-primary/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-muted/50 border border-border/60 rounded-xl p-1 shrink-0 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${statusFilter === "all" ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Todas ({myTenants.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("ACTIVO")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${statusFilter === "ACTIVO" ? "bg-emerald-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Activas ({myTenants.filter(t => t.estado === "ACTIVO").length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("TRIAL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${statusFilter === "TRIAL" ? "bg-amber-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Pruebas ({myTenants.filter(t => t.estado === "TRIAL").length})
                </button>
              </div>
            </div>
          </div>

          {/* VISTA ESCRITORIO (Tabla completa con diseño optimizado) */}
          <Card className="hidden md:block overflow-hidden border border-border/60 shadow-card rounded-2xl bg-surface">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="relative z-10 text-[10.5px] uppercase tracking-wider font-black shadow-[0_4px_12px_-2px_rgba(0,0,0,0.06)] border-b border-border/80">
                  <tr>
                    <th className="px-3.5 py-3 text-left whitespace-nowrap bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200/70 dark:from-slate-800 dark:via-slate-800 dark:to-slate-850 text-slate-800 dark:text-slate-200">
                      Lavandería / Sucursal
                    </th>
                    <th className="px-2 py-3 text-center whitespace-nowrap bg-gradient-to-b from-blue-50 via-blue-100/90 to-blue-200/60 dark:from-blue-950/70 dark:via-blue-950/90 dark:to-blue-900/60 text-blue-950 dark:text-blue-200 border-x border-blue-200/50 dark:border-blue-800/40">
                      Plan SaaS
                    </th>
                    <th className="px-2 py-3 text-center whitespace-nowrap bg-gradient-to-b from-emerald-50 via-emerald-100/90 to-emerald-200/60 dark:from-emerald-950/70 dark:via-emerald-950/90 dark:to-emerald-900/60 text-emerald-950 dark:text-emerald-200 border-r border-emerald-200/50 dark:border-emerald-800/40">
                      Estado
                    </th>
                    <th className="px-2 py-3 text-center whitespace-nowrap bg-gradient-to-b from-purple-50 via-purple-100/90 to-purple-200/60 dark:from-purple-950/70 dark:via-purple-950/90 dark:to-purple-900/60 text-purple-950 dark:text-purple-200 border-r border-purple-200/50 dark:border-purple-800/40">
                      Módulos Activos
                    </th>
                    <th className="px-2 py-3 text-center whitespace-nowrap bg-gradient-to-b from-cyan-50 via-cyan-100/90 to-cyan-200/60 dark:from-cyan-950/70 dark:via-cyan-950/90 dark:to-cyan-900/60 text-cyan-950 dark:text-cyan-200 border-r border-cyan-200/50 dark:border-cyan-800/40">
                      Órdenes
                    </th>
                    <th className="px-2.5 py-3 text-center whitespace-nowrap bg-gradient-to-b from-amber-50 via-amber-100/90 to-amber-200/60 dark:from-amber-950/70 dark:via-amber-950/90 dark:to-amber-900/60 text-amber-950 dark:text-amber-200 border-r border-amber-200/50 dark:border-amber-800/40">
                      Facturación
                    </th>
                    <th className="px-3 py-3 text-center whitespace-nowrap bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200/70 dark:from-slate-800 dark:via-slate-800 dark:to-slate-850 text-slate-800 dark:text-slate-200">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-muted-foreground">
                        <Building2 className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                        <p className="text-base font-semibold text-foreground">No se encontraron lavanderías</p>
                        <p className="text-xs text-muted-foreground mt-1">Prueba a cambiar el filtro de búsqueda o el estado.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((t) => {
                      const ts = tenantStats[t.id] || { count: 0, total: 0 };
                      const planOfTenant = plans.find(p => p.id === t.plan_id);
                      
                      const hasWa = t.config?.modulos_override?.whatsapp !== undefined 
                        ? t.config.modulos_override.whatsapp 
                        : !!planOfTenant?.modulos?.whatsapp;
                      const hasFiscal = t.config?.modulos_override?.facturacion_fiscal !== undefined 
                        ? t.config.modulos_override.facturacion_fiscal 
                        : !!planOfTenant?.modulos?.facturacion_fiscal;
                      const hasSucursales = t.config?.modulos_override?.multisucursal !== undefined 
                        ? t.config.modulos_override.multisucursal 
                        : ((t.max_sucursales || 1) > 1 || !!planOfTenant?.modulos?.multisucursal);
                      const hasLogistica = t.config?.modulos_override?.logistica !== undefined 
                        ? t.config.modulos_override.logistica 
                        : !!planOfTenant?.modulos?.logistica;
                      const hasProcesos = t.config?.modulos_override?.procesos !== undefined 
                        ? t.config.modulos_override.procesos 
                        : (planOfTenant?.modulos?.procesos !== undefined ? !!planOfTenant.modulos.procesos : true);
                      const hasEstanteria = t.config?.modulos_override?.estanteria !== undefined 
                        ? t.config.modulos_override.estanteria 
                        : (planOfTenant?.modulos?.estanteria !== undefined ? !!planOfTenant.modulos.estanteria : true);

                      const daysRemaining = t.trial_hasta
                        ? Math.max(0, Math.ceil((new Date(t.trial_hasta).getTime() - Date.now()) / 86400000))
                        : 0;

                      return (
                        <tr 
                          key={t.id} 
                          className="hover:bg-muted/30 transition-colors border-b border-border/40"
                        >
                          <td className="px-3.5 py-2.5">
                            <div className="flex items-center gap-2.5">
                              {t.logo_url ? (
                                <img
                                  src={t.logo_url}
                                  alt={t.nombre}
                                  className="h-10 w-10 rounded-full object-contain border-2 border-border/70 bg-white p-0.5 shrink-0 shadow-xs ring-2 ring-primary/10"
                                />
                              ) : (
                                <div
                                  className="h-10 w-10 rounded-full flex items-center justify-center font-black text-white text-sm shrink-0 shadow-xs ring-2 ring-black/10 dark:ring-white/10"
                                  style={{ backgroundColor: t.color_primario || "#0891b2" }}
                                >
                                  {t.nombre.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-bold text-foreground text-[13px] tracking-tight hover:text-primary transition-colors flex items-center gap-1.5 flex-wrap">
                                  <span className="truncate">{t.nombre}</span>
                                  <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.2 rounded-md border border-emerald-200/60 dark:border-emerald-800/60 shadow-2xs">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    {getTenantBranchName(t)}
                                  </span>
                                </div>
                                <div className="text-[10.5px] text-muted-foreground mt-0.5 space-y-0.2">
                                  <div className="truncate">
                                    <span className="font-medium text-foreground/80">Correo:</span> {t.email || "Sin correo"}
                                  </div>
                                  <div className="truncate">
                                    <span className="font-medium text-foreground/80">Teléfono:</span> {t.telefono || "Sin teléfono"}
                                  </div>
                                  <div className="flex items-center gap-1.5 pt-0.2">
                                    <span className="font-medium text-foreground/80">RNC:</span>
                                    {t.rnc ? (
                                      <Badge className="bg-primary hover:bg-primary text-primary-foreground text-[9.5px] font-bold px-1.5 py-0 rounded-md border-none shadow-2xs">
                                        {t.rnc}
                                      </Badge>
                                    ) : (
                                      <span className="italic text-muted-foreground/60 text-[10px]">Sin RNC</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-2 py-2.5 text-center whitespace-nowrap bg-blue-500/[0.015] border-r border-border/20">
                            <PlanBadge id={t.plan_id} />
                          </td>

                          <td className="px-2 py-2.5 text-center whitespace-nowrap bg-emerald-500/[0.015] border-r border-border/20">
                            {t.estado === "ACTIVO" ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full gap-1 shadow-2xs">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Activo
                                </Badge>
                                {(() => {
                                  const isAuto = t.auto_renovacion !== undefined
                                    ? t.auto_renovacion
                                    : (t.config?.auto_renovacion !== undefined ? t.config.auto_renovacion : true);
                                  if (isAuto) {
                                    const nextRen = getNextRenewalDate(t.plan_fecha_inicio || t.config?.plan_fecha_inicio || t.creado_en);
                                    return (
                                      <span className="text-[9.5px] text-emerald-700/90 dark:text-emerald-400 font-bold flex items-center gap-0.5" title={`Renovación Automática. Próximo corte: ${nextRen.toLocaleDateString("es-DO")}`}>
                                        <RefreshCw className="h-2.5 w-2.5 text-emerald-600" />
                                        {nextRen.toLocaleDateString("es-DO")}
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="text-[9.5px] text-muted-foreground font-medium">
                                      {daysRemaining}d vigencia
                                    </span>
                                  );
                                })()}
                              </div>
                            ) : t.estado === "TRIAL" ? (
                              <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full gap-1 shadow-2xs">
                                <Clock className="h-3 w-3 text-amber-600" /> Prueba ({daysRemaining}d)
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full gap-1 shadow-2xs">
                                <AlertCircle className="h-3 w-3 text-rose-600" /> Inactivo
                              </Badge>
                            )}
                          </td>

                          <td className="px-2 py-2.5 text-center whitespace-nowrap bg-purple-500/[0.015] border-r border-border/20">
                            <div className="flex items-center justify-center gap-0.5">
                              <span
                                title={hasWa ? "WhatsApp Cloud: Habilitado" : "WhatsApp: Inactivo"}
                                className={`p-1 rounded-md transition-all ${
                                  hasWa
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700 shadow-2xs"
                                    : "bg-muted/30 text-muted-foreground/30 border border-transparent opacity-30"
                                }`}
                              >
                                <MessageSquare className="h-3 w-3" />
                              </span>
                              <span
                                title={hasFiscal ? "Facturación Fiscal (e-CF): Habilitada" : "Facturación Fiscal: Inactiva"}
                                className={`p-1 rounded-md transition-all ${
                                  hasFiscal
                                    ? "bg-blue-50 text-blue-700 border border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-700 shadow-2xs"
                                    : "bg-muted/30 text-muted-foreground/30 border border-transparent opacity-30"
                                }`}
                              >
                                <FileText className="h-3 w-3" />
                              </span>
                              <span
                                title={hasSucursales ? "Sucursales Múltiples: Habilitadas" : "Sucursales: Inactivas"}
                                className={`p-1 rounded-md transition-all ${
                                  hasSucursales
                                    ? "bg-purple-50 text-purple-700 border border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-700 shadow-2xs"
                                    : "bg-muted/30 text-muted-foreground/30 border border-transparent opacity-30"
                                }`}
                              >
                                <Building2 className="h-3 w-3" />
                              </span>
                              <span
                                title={hasLogistica ? "Envío a Domicilio: Habilitado" : "Logística: Inactiva"}
                                className={`p-1 rounded-md transition-all ${
                                  hasLogistica
                                    ? "bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700 shadow-2xs"
                                    : "bg-muted/30 text-muted-foreground/30 border border-transparent opacity-30"
                                }`}
                              >
                                <Truck className="h-3 w-3" />
                              </span>
                              <span
                                title={hasProcesos ? "Tablero Kanban de Procesos: Habilitado" : "Procesos: Inactivo"}
                                className={`p-1 rounded-md transition-all ${
                                  hasProcesos
                                    ? "bg-teal-50 text-teal-700 border border-teal-300 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-700 shadow-2xs"
                                    : "bg-muted/30 text-muted-foreground/30 border border-transparent opacity-30"
                                }`}
                              >
                                <Wrench className="h-3 w-3" />
                              </span>
                              <span
                                title={hasEstanteria ? "Estantería Virtual: Habilitada" : "Estantería: Inactiva"}
                                className={`p-1 rounded-md transition-all ${
                                  hasEstanteria
                                    ? "bg-indigo-50 text-indigo-700 border border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-700 shadow-2xs"
                                    : "bg-muted/30 text-muted-foreground/30 border border-transparent opacity-30"
                                }`}
                              >
                                <Layers className="h-3 w-3" />
                              </span>
                            </div>
                          </td>

                          <td className="px-2 py-2.5 text-center whitespace-nowrap bg-cyan-500/[0.015] border-r border-border/20">
                            <span className="font-bold text-xs text-foreground">{ts.count.toLocaleString("es-DO")}</span>
                            <span className="text-[9.5px] text-muted-foreground block">órdenes</span>
                          </td>

                          <td className="px-2.5 py-2.5 text-center whitespace-nowrap bg-amber-500/[0.015] border-r border-border/20">
                            <span className="font-extrabold text-xs text-foreground">{formatRD(ts.total)}</span>
                          </td>

                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => handleManage(t.id, t.slug)}
                                className="h-8 px-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border border-emerald-500/80 shadow-2xs gap-1 cursor-pointer transition-all"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>Entrar</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate({ to: "/reportes", search: { tenantId: t.id } })}
                                className="h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 font-bold text-xs gap-1 shadow-2xs cursor-pointer transition-all"
                                title="Ver reportes de ventas"
                              >
                                <BarChart3 className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                                <span>Reportes</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* VISTA MÓVIL (Tarjetas estilizadas idénticas a /admin) */}
          <div className="grid gap-3.5 md:hidden">
            {filteredTenants.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground rounded-2xl">
                <Building2 className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="font-semibold text-foreground text-sm">No se encontraron lavanderías</p>
                <p className="text-xs text-muted-foreground mt-0.5">Prueba con otro término de búsqueda.</p>
              </Card>
            ) : (
              filteredTenants.map((t) => {
                const ts = tenantStats[t.id] || { count: 0, total: 0 };
                const planOfTenant = plans.find(p => p.id === t.plan_id);
                const hasWa = t.config?.modulos_override?.whatsapp !== undefined ? t.config.modulos_override.whatsapp : !!planOfTenant?.modulos?.whatsapp;
                const hasFiscal = t.config?.modulos_override?.facturacion_fiscal !== undefined ? t.config.modulos_override.facturacion_fiscal : !!planOfTenant?.modulos?.facturacion_fiscal;
                const hasSucursales = t.config?.modulos_override?.multisucursal !== undefined ? t.config.modulos_override.multisucursal : ((t.max_sucursales || 1) > 1 || !!planOfTenant?.modulos?.multisucursal);
                const hasLogistica = t.config?.modulos_override?.logistica !== undefined ? t.config.modulos_override.logistica : !!planOfTenant?.modulos?.logistica;
                const hasProcesos = t.config?.modulos_override?.procesos !== undefined ? t.config.modulos_override.procesos : (planOfTenant?.modulos?.procesos !== undefined ? !!planOfTenant.modulos.procesos : true);
                const hasEstanteria = t.config?.modulos_override?.estanteria !== undefined ? t.config.modulos_override.estanteria : (planOfTenant?.modulos?.estanteria !== undefined ? !!planOfTenant.modulos.estanteria : true);

                const daysRemaining = t.trial_hasta
                  ? Math.max(0, Math.ceil((new Date(t.trial_hasta).getTime() - Date.now()) / 86400000))
                  : 0;

                return (
                  <Card 
                    key={t.id} 
                    className="p-4 rounded-2xl border border-border/70 shadow-xs bg-surface"
                  >
                    <div className="flex items-start gap-3">
                      {t.logo_url ? (
                        <img
                          src={t.logo_url}
                          alt={t.nombre}
                          className="h-12 w-12 rounded-full object-contain border-2 border-border/70 bg-white p-1 shrink-0 shadow-xs"
                        />
                      ) : (
                        <div
                          className="h-12 w-12 rounded-full flex items-center justify-center font-black text-white text-base shrink-0 shadow-xs"
                          style={{ backgroundColor: t.color_primario || "#0891b2" }}
                        >
                          {t.nombre.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="font-bold text-foreground text-sm truncate">{t.nombre}</h3>
                          {t.estado === "ACTIVO" ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                                Activo
                              </Badge>
                              {(() => {
                                const isAuto = t.auto_renovacion !== undefined
                                  ? t.auto_renovacion
                                  : (t.config?.auto_renovacion !== undefined ? t.config.auto_renovacion : true);
                                if (isAuto) {
                                  const nextRen = getNextRenewalDate(t.plan_fecha_inicio || t.config?.plan_fecha_inicio || t.creado_en);
                                  return (
                                    <span className="text-[9.5px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5" title={`Próxima renovación: ${nextRen.toLocaleDateString("es-DO")}`}>
                                      <RefreshCw className="h-2.5 w-2.5 text-emerald-600" />
                                      {nextRen.toLocaleDateString("es-DO")}
                                    </span>
                                  );
                                }
                                return (
                                  <span className="text-[9.5px] text-muted-foreground font-medium">
                                    {daysRemaining}d
                                  </span>
                                );
                              })()}
                            </div>
                          ) : t.estado === "TRIAL" ? (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                              Prueba ({daysRemaining}d)
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                              Inactivo
                            </Badge>
                          )}
                        </div>

                        <div className="text-[11px] text-muted-foreground mt-0.5 space-y-0.5">
                          <div className="truncate"><span className="font-medium text-foreground/80">Correo:</span> {t.email || "Sin correo"}</div>
                          <div className="truncate"><span className="font-medium text-foreground/80">Teléfono:</span> {t.telefono || "Sin teléfono"}</div>
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <span className="font-medium text-foreground/80">RNC:</span>
                            {t.rnc ? (
                              <Badge className="bg-primary hover:bg-primary text-primary-foreground text-[9.5px] font-bold px-1.5 py-0 rounded-md border-none shadow-2xs">{t.rnc}</Badge>
                            ) : (
                              <span className="italic text-muted-foreground/60 text-[10px]">Sin RNC</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Métricas y Módulos Móvil */}
                    <div className="mt-3 pt-2.5 border-t border-border/50 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-blue-500/[0.04] p-2.5 rounded-xl border border-blue-500/10">
                        <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 block mb-1">Plan & Módulos</span>
                        <div className="flex items-center gap-1 flex-wrap">
                          <PlanBadge id={t.plan_id} />
                        </div>
                        <div className="flex items-center gap-1 mt-1.5">
                          <span className={`p-1 rounded ${hasWa ? 'text-emerald-600 bg-emerald-50' : 'text-muted-foreground/30 opacity-40'}`}><MessageSquare className="h-3 w-3" /></span>
                          <span className={`p-1 rounded ${hasFiscal ? 'text-blue-600 bg-blue-50' : 'text-muted-foreground/30 opacity-40'}`}><FileText className="h-3 w-3" /></span>
                          <span className={`p-1 rounded ${hasSucursales ? 'text-purple-600 bg-purple-50' : 'text-muted-foreground/30 opacity-40'}`}><Building2 className="h-3 w-3" /></span>
                          <span className={`p-1 rounded ${hasLogistica ? 'text-amber-600 bg-amber-50' : 'text-muted-foreground/30 opacity-40'}`}><Truck className="h-3 w-3" /></span>
                          <span className={`p-1 rounded ${hasProcesos ? 'text-teal-600 bg-teal-50' : 'text-muted-foreground/30 opacity-40'}`}><Wrench className="h-3 w-3" /></span>
                          <span className={`p-1 rounded ${hasEstanteria ? 'text-indigo-600 bg-indigo-50' : 'text-muted-foreground/30 opacity-40'}`}><Layers className="h-3 w-3" /></span>
                        </div>
                      </div>

                      <div className="bg-amber-500/[0.04] p-2.5 rounded-xl border border-amber-500/10 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 block mb-0.5">Facturación</span>
                          <div className="font-bold text-foreground text-xs">{formatRD(ts.total)}</div>
                        </div>
                        <div className="text-[10.5px] text-muted-foreground font-medium mt-1">
                          {ts.count} órdenes
                        </div>
                      </div>
                    </div>

                    {/* Botones de acción móvil */}
                    <div className="mt-3 pt-2.5 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleManage(t.id, t.slug)}
                        className="flex-1 h-8 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Entrar</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate({ to: "/reportes", search: { tenantId: t.id } })}
                        className="h-8 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-bold text-xs gap-1 cursor-pointer shadow-2xs"
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                        <span>Reportes</span>
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Modal centralizado de Sucursales */}
      <Dialog open={showBranchModal} onOpenChange={setShowBranchModal}>
        <DialogContent className="sm:max-w-md rounded-2xl border-none shadow-card p-6 bg-white overflow-hidden">
          <DialogHeader className="text-center pb-2">
            <DialogTitle className="flex flex-col items-center gap-3 text-2xl font-bold tracking-tight">
              {tieneCuposLibres ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-sm">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              ) : puedeComprarMas ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 shadow-sm animate-pulse">
                  <Sparkles className="h-6 w-6" />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 shadow-sm">
                  <Crown className="h-6 w-6" />
                </div>
              )}
              {tieneCuposLibres ? "¡Cupo disponible!" : puedeComprarMas ? "Desbloquear nueva sucursal" : "Límite máximo alcanzado"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-center text-slate-800">
            {tieneCuposLibres ? (
              <>
                <p className="text-sm text-muted-foreground text-balance">
                  Tienes espacio disponible en tu cuenta para registrar tu nueva sucursal de inmediato sin costos adicionales.
                </p>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3.5 text-xs text-emerald-800 font-semibold flex items-center justify-between">
                  <span>Sucursales creadas:</span>
                  <span className="text-sm font-bold">{sucursalesCreadas} de {maxSucursalesContratadas} permitidas</span>
                </div>
                <div className="pt-2 flex flex-col gap-2">
                  <Link to="/nueva-sucursal">
                    <Button onClick={() => setShowBranchModal(false)} className="w-full bg-primary text-white font-bold h-11 rounded-xl shadow-glow">
                      Continuar a registro <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" onClick={() => setShowBranchModal(false)} className="h-10 rounded-xl text-slate-500 font-bold">
                    Cerrar
                  </Button>
                </div>
              </>
            ) : puedeComprarMas ? (
              <>
                <p className="text-sm text-muted-foreground text-balance">
                  Tu plan actual <strong className="font-bold text-slate-900">{plan?.nombre}</strong> te permite agregar hasta <strong className="font-bold text-slate-900">{limiteAdicionalesPlan}</strong> sucursales adicionales para expandir tu negocio.
                </p>
                
                <div className="rounded-2xl border border-border p-4 bg-slate-50 space-y-3.5 text-left text-xs text-slate-700">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="font-semibold text-slate-500">Plan actual:</span>
                    <Badge variant="outline" className="font-bold text-[10px] bg-white uppercase text-primary border-primary/20">{plan?.nombre}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-500">Cupos activos:</span>
                    <span className="font-bold text-slate-900">{maxSucursalesContratadas} sucursal(es)</span>
                  </div>
                  <div className="flex justify-between items-center text-primary">
                    <span className="font-bold">Sucursal adicional:</span>
                    <span className="font-extrabold text-sm">{formatRD(precioAdicional).replace("DOP", "RD$")}/mes</span>
                  </div>
                </div>

                <div className="pt-3 flex flex-col gap-2">
                  {polarSucursalUrl ? (
                    <a href={polarSucursalUrl} target="_blank" rel="noreferrer">
                      <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold h-11 rounded-xl shadow-md hover:opacity-95 flex items-center justify-center gap-2">
                        <Sparkles className="h-4 w-4" /> Desbloquear sucursal extra
                      </Button>
                    </a>
                  ) : (
                    <Button disabled className="w-full bg-slate-200 text-slate-500 font-bold h-11 rounded-xl">
                      Enlace de pago no disponible
                    </Button>
                  )}
                  
                  <div className="mt-2.5 flex items-center justify-center gap-2 text-sm text-slate-600 font-medium">
                    <span>¿Prefieres pago manual?</span>
                    <a 
                      href={`https://wa.me/18299416546?text=Hola%20Klynn,%20me%20gustaria%20activar%20una%20sucursal%20adicional%20para%20mi%20lavanderia%20${encodeURIComponent(mainTenant?.nombre || "")}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="font-bold text-primary hover:underline flex items-center gap-1.5"
                    >
                      <MessageCircle className="h-4 w-4 fill-primary/10" /> Habla con soporte
                    </a>
                  </div>
                  
                  <Button variant="ghost" onClick={() => setShowBranchModal(false)} className="h-10 rounded-xl text-slate-500 font-bold mt-1">
                    Cancelar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground text-balance">
                  Has alcanzado el límite máximo de sucursales permitido para el <strong className="font-bold text-slate-900">Plan {plan?.nombre}</strong> (<strong className="font-bold text-slate-900">{totalMaxSucursalesPlan}</strong> sucursales).
                </p>
                <div className="rounded-xl border border-rose-100 bg-rose-50/30 p-3.5 text-xs text-rose-800 font-semibold text-center">
                  Límite alcanzado: {sucursalesCreadas} de {totalMaxSucursalesPlan} contratadas.
                </div>
                <div className="pt-3 flex flex-col gap-2">
                  <a 
                    href={`https://wa.me/18299416546?text=Hola%20Klynn,%20he%20alcanzado%20el%20limite%20de%20sucursales%20en%20el%20plan%20${plan?.nombre}%20y%20me%20gustaria%20actualizar%20a%20un%20plan%20corporativo%20personalizado.`} 
                    target="_blank" 
                    rel="noreferrer"
                  >
                    <Button className="w-full bg-primary text-white font-bold h-11 rounded-xl shadow-glow flex items-center justify-center gap-2">
                      <Crown className="h-4 w-4" /> Solicitar plan corporativo
                    </Button>
                  </a>
                  <Button variant="ghost" onClick={() => setShowBranchModal(false)} className="h-10 rounded-xl text-slate-500 font-bold">
                    Cerrar
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE PAGO CONFIRMADO AUTOMATICO */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="rounded-2xl border-none shadow-card max-w-md text-center p-6 bg-white dark:bg-slate-900">
          <div className="mx-auto my-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 animate-bounce">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-center text-slate-800 dark:text-slate-100">
              ¡Pago Recibido con Éxito!
            </DialogTitle>
            <DialogDescription className="text-center text-slate-500 dark:text-slate-400 text-sm mt-2">
              Hemos confirmado tu pago en Polar. Tu nuevo cupo de sucursal adicional ha sido desbloqueado al instante. Ya puedes registrarla y empezar a expandir tu negocio.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-6 flex flex-col gap-2">
            <Link to="/nueva-sucursal">
              <Button onClick={() => setShowSuccessModal(false)} className="w-full bg-gradient-primary text-white font-bold h-11 rounded-xl shadow-glow">
                Registrar sucursal ahora
              </Button>
            </Link>
            <Button variant="ghost" onClick={() => setShowSuccessModal(false)} className="h-10 rounded-xl text-slate-500 font-bold">
              Hacerlo más tarde
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* MODAL DETALLADO DE ESTADÍSTICAS Y RENDIMIENTO DE SUCURSAL */}
      <Dialog open={!!selectedInspectTenant} onOpenChange={(open) => { if (!open) setSelectedInspectTenant(null); }}>
        <DialogContent className="max-w-5xl rounded-[1.5rem] border-none shadow-elegant p-0 overflow-y-auto max-h-[90vh] bg-slate-50">
          {selectedInspectTenant && (
            <div>
              {/* Encabezado Principal y Botón de Acción Centrado */}
              <div 
                className="p-6 text-white relative overflow-hidden flex flex-col items-center justify-center text-center gap-2 transition-all duration-300"
                style={{ 
                  background: `linear-gradient(135deg, ${selectedInspectTenant.color_primario || '#1B4B73'}, ${selectedInspectTenant.color_secundario || '#F0B900'})`
                }}
              >
                <div className="absolute inset-0 bg-cover bg-center opacity-10 pointer-events-none" />
                <div className="relative z-10 flex flex-col items-center">
                  {selectedInspectTenant.logo_url ? (
                    <img 
                      src={selectedInspectTenant.logo_url} 
                      alt="Logo" 
                      className="h-16 w-16 rounded-full object-cover border-2 border-white/40 shadow-md mb-2.5 bg-white p-1" 
                    />
                  ) : (
                    <span className="text-[9px] font-bold uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                      Rendimiento de Sucursal
                    </span>
                  )}
                  <h2 className="text-3xl font-display mt-2 leading-none">{selectedInspectTenant.nombre}</h2>
                  <p className="text-[10px] text-white/80 mt-1 font-mono">klynn.com.do/t/{selectedInspectTenant.slug}</p>
                  
                  <Button 
                    onClick={() => handleManage(selectedInspectTenant.id, selectedInspectTenant.slug)}
                    size="sm"
                    className="mt-3 bg-white hover:bg-white/95 text-slate-900 font-bold h-8 text-[11px] rounded-lg shadow-sm border-none transition-colors px-4 flex items-center gap-1.5"
                  >
                    Gestionar Sucursal <ArrowRight className="h-3.5 w-3.5" style={{ color: selectedInspectTenant.color_primario }} />
                  </Button>
                </div>
              </div>

              {inspectLoading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" style={{ color: selectedInspectTenant.color_primario }} />
                  <p className="text-sm font-semibold text-muted-foreground animate-pulse">Procesando datos en tiempo real...</p>
                </div>
              ) : inspectStats ? (
                <div className="p-6 space-y-6">
                  {/* Fila 1: KPIs Financieros */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <Card className="p-4 bg-white border-none shadow-sm flex flex-col justify-between h-28 hover:shadow transition-shadow">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-primary" style={{ color: selectedInspectTenant.color_primario }} /> Ingresos Totales
                      </div>
                      <div className="text-xl font-display font-bold mt-1 text-slate-800">
                        {formatRD(inspectStats.totalVentas)}
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-1">Suma total facturada</div>
                    </Card>

                    <Card className="p-4 bg-white border-none shadow-sm flex flex-col justify-between h-28 hover:shadow transition-shadow">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5 text-rose-500" /> Gastos Totales
                      </div>
                      <div className="text-xl font-display font-bold mt-1 text-rose-600">
                        {formatRD(inspectStats.totalGastos)}
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-1">Manuales + caja chica</div>
                    </Card>

                    <Card className="p-4 bg-white border-none shadow-sm flex flex-col justify-between h-28 hover:shadow transition-shadow border-l-4 border-l-emerald-500">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Wallet className="h-3.5 w-3.5 text-emerald-500" /> Rentabilidad Neta
                      </div>
                      <div className={`text-xl font-display font-bold mt-1 ${inspectStats.rentabilidad >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatRD(inspectStats.rentabilidad)}
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-1">Beneficio neto real</div>
                    </Card>

                    <Card className="p-4 bg-white border-none shadow-sm flex flex-col justify-between h-28 hover:shadow transition-shadow">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-blue-500" /> ITBIS Recaudado
                      </div>
                      <div className="text-xl font-display font-bold mt-1 text-blue-600">
                        {formatRD(inspectStats.totalITBIS)}
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-1">Declaración DGII</div>
                    </Card>

                    <Card className="p-4 bg-white border-none shadow-sm flex flex-col justify-between h-28 hover:shadow transition-shadow">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Ticket Promedio
                      </div>
                      <div className="text-xl font-display font-bold mt-1 text-slate-800">
                        {formatRD(inspectStats.ticketPromedio)}
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-1">Gasto medio por orden</div>
                    </Card>
                  </div>

                  {/* Doble Columna Principal */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Columna Izquierda: Gráficos y Desgloses */}
                    <div className="space-y-6">
                      {/* Estado de las Órdenes */}
                      <Card className="p-6 bg-white border-none shadow-sm rounded-2xl">
                        <h3 className="font-display text-lg text-slate-800 mb-4 flex items-center gap-2">
                          📋 Estado de las Órdenes
                        </h3>
                        <div className="space-y-4">
                          {[
                            { state: "RECIBIDA", label: "Recibidas", color: "bg-blue-500" },
                            { state: "EN_PROCESO", label: "En Proceso", color: "bg-indigo-500" },
                            { state: "LISTA", label: "Listas para Entrega", color: "bg-emerald-500" },
                            { state: "ENTREGADA", label: "Entregadas/Completadas", color: "bg-slate-500" },
                          ].map((item) => {
                            const count = inspectStats.porEstado[item.state] || 0;
                            const total = inspectData?.ordenes.length || 1;
                            const pct = Math.round((count / total) * 100);
                            return (
                              <div key={item.state} className="space-y-1">
                                <div className="flex justify-between text-xs font-semibold text-slate-700">
                                  <span>{item.label}</span>
                                  <span>{count} órdenes ({pct}%)</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full ${item.color}`} style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Card>

                      {/* Métodos de Pago Preferidos */}
                      <Card className="p-6 bg-white border-none shadow-sm rounded-2xl">
                        <h3 className="font-display text-lg text-slate-800 mb-4 flex items-center gap-2">
                          💳 Métodos de Pago
                        </h3>
                        <div className="space-y-3">
                          {["EFECTIVO", "TARJETA", "TRANSFERENCIA", "MIXTO"].map((m) => {
                            const v = inspectStats.porMetodo[m] || 0;
                            const pct = inspectStats.totalVentas > 0 ? (v / inspectStats.totalVentas) * 100 : 0;
                            const icons: Record<string, string> = {
                              EFECTIVO: "💵",
                              TARJETA: "💳",
                              TRANSFERENCIA: "🏦",
                              MIXTO: "💰"
                            };
                            return (
                              <div key={m}>
                                <div className="mb-1 flex justify-between text-xs font-semibold text-slate-700">
                                  <span className="flex items-center gap-1.5">
                                    <span>{icons[m] || "💰"}</span> {m}
                                  </span>
                                  <span>{formatRD(v)} ({Math.round(pct)}%)</span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                  <div 
                                    className="h-full bg-primary" 
                                    style={{ 
                                      width: `${pct}%`,
                                      backgroundColor: selectedInspectTenant.color_primario 
                                    }} 
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Card>

                      {/* Gastos por Categoría */}
                      <Card className="p-6 bg-white border-none shadow-sm rounded-2xl">
                        <h3 className="font-display text-lg text-slate-800 mb-4 flex items-center gap-2">
                          🏷️ Gastos por Categoría
                        </h3>
                        <div className="space-y-3">
                          {Object.entries(inspectStats.porCategoria).length > 0 ? (
                            Object.entries(inspectStats.porCategoria).map(([cat, val]: [string, any]) => {
                              const pct = inspectStats.totalGastos > 0 ? (val / inspectStats.totalGastos) * 100 : 0;
                              return (
                                <div key={cat}>
                                  <div className="mb-1 flex justify-between text-xs font-semibold text-slate-700">
                                    <span className="capitalize">{cat.toLowerCase()}</span>
                                    <span>{formatRD(val)} ({Math.round(pct)}%)</span>
                                  </div>
                                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                    <div className="h-full bg-rose-500" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center text-xs text-muted-foreground py-6">
                              Sin gastos registrados en este período.
                            </div>
                          )}
                        </div>
                      </Card>

                      {/* Servicios Más Populares */}
                      <Card className="p-6 bg-white border-none shadow-sm rounded-2xl">
                        <h3 className="font-display text-lg text-slate-800 mb-4 flex items-center gap-2">
                          🧺 Servicios Más Populares
                        </h3>
                        <div className="space-y-3">
                          {inspectStats.topServicios.length > 0 ? (
                            (() => {
                              const maxQty = Math.max(...inspectStats.topServicios.map(s => s.count), 1);
                              return inspectStats.topServicios.map((srv: any) => {
                                const pct = (srv.count / maxQty) * 100;
                                return (
                                  <div key={srv.name} className="space-y-1">
                                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                                      <span className="truncate max-w-[180px]">{srv.name}</span>
                                      <span className="text-[10px] text-muted-foreground shrink-0">
                                        {srv.count} cant. ({formatRD(srv.total)})
                                      </span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                      <div 
                                        className="h-full bg-indigo-500" 
                                        style={{ 
                                          width: `${pct}%`,
                                          backgroundColor: selectedInspectTenant.color_primario 
                                        }} 
                                      />
                                    </div>
                                  </div>
                                );
                              });
                            })()
                          ) : (
                            <div className="text-center text-xs text-muted-foreground py-6">
                              Sin servicios registrados en las órdenes de este período.
                            </div>
                          )}
                        </div>
                      </Card>

                      {/* Cierres de Caja Recientes */}
                      <Card className="p-6 bg-white border-none shadow-sm rounded-2xl">
                        <h3 className="font-display text-lg text-slate-800 mb-4 flex items-center gap-2">
                          📦 Cierres de Caja Recientes
                        </h3>
                        <div className="space-y-3">
                          {inspectStats.cierresCaja.length > 0 ? (
                            inspectStats.cierresCaja.map((c: any) => {
                              const dif = c.diferencia || 0;
                              const statusColor = dif === 0 
                                ? "text-emerald-600 bg-emerald-50 border-emerald-100" 
                                : dif > 0 
                                  ? "text-blue-600 bg-blue-50 border-blue-100" 
                                  : "text-rose-600 bg-rose-50 border-rose-100";
                              const statusText = dif === 0 
                                ? "Cuadrada" 
                                : dif > 0 
                                  ? `Sobrante: ${formatRD(dif)}` 
                                  : `Faltante: ${formatRD(dif)}`;

                              return (
                                <div key={c.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-2 text-xs">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-slate-800">
                                      Cierre de Caja
                                    </span>
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {c.cerrada_en ? new Date(c.cerrada_en).toLocaleDateString("es-DO") : ""}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 text-[9px] pt-1.5 border-t border-slate-100 text-slate-600">
                                    <div>
                                      <span className="block text-muted-foreground">Monto Inicial</span>
                                      <strong className="font-bold text-slate-800">{formatRD(c.monto_inicial)}</strong>
                                    </div>
                                    <div>
                                      <span className="block text-muted-foreground">Efectivo Real</span>
                                      <strong className="font-bold text-slate-800">{formatRD(c.monto_contado_efectivo || 0)}</strong>
                                    </div>
                                    <div className="text-right">
                                      <span className="block text-muted-foreground text-center">Cuadre</span>
                                      <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${statusColor}`}>
                                        {statusText}
                                      </span>
                                    </div>
                                  </div>
                                  {c.notas_cierre && (
                                    <p className="text-[9px] text-slate-500 italic mt-0.5 border-t border-dashed border-slate-100 pt-1">
                                      "{c.notas_cierre}"
                                    </p>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center text-xs text-muted-foreground py-8">
                              No se han registrado cierres de caja aún.
                            </div>
                          )}
                        </div>
                      </Card>
                    </div>

                    {/* Columna Derecha: Feed en Vivo y Personal */}
                    <div className="space-y-6">
                      {/* Actividad Reciente */}
                      <Card className="p-6 bg-white border-none shadow-sm rounded-2xl">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-display text-lg text-slate-800 flex items-center gap-2">
                            🔔 Actividad Reciente (48h)
                          </h3>
                          <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            Autolimpieza activa
                          </span>
                        </div>
                        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                          {inspectStats.recientes.length > 0 ? (
                            inspectStats.recientes.map((act: any) => {
                              return (
                                <div key={act.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100/50 hover:bg-slate-100/50 transition-colors">
                                  <div className="min-w-0 flex-1 pr-2">
                                    <div className="font-semibold text-xs text-slate-800 truncate">{act.titulo}</div>
                                    <div className="text-[10px] text-muted-foreground truncate">{act.desc}</div>
                                    <div className="text-[8px] text-slate-400 flex items-center gap-1 mt-1">
                                      <Calendar className="h-2.5 w-2.5" />
                                      {new Date(act.fecha).toLocaleString("es-DO", { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric' })}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2.5 shrink-0">
                                    {act.monto !== undefined && act.monto > 0 && (
                                      <div className="font-bold text-xs text-slate-800">{formatRD(act.monto)}</div>
                                    )}
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase border ${act.color}`}>
                                      {act.badgeText}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center text-xs text-muted-foreground py-8">
                              Sin actividades registradas en las últimas 48 horas.
                            </div>
                          )}
                        </div>
                      </Card>

                      {/* Equipo Registrado */}
                      <Card className="p-6 bg-white border-none shadow-sm rounded-2xl">
                        <h3 className="font-display text-lg text-slate-800 mb-4 flex items-center gap-2">
                          👥 Equipo de Trabajo
                        </h3>
                        <div className="space-y-3">
                          {inspectData?.empleados && inspectData.empleados.length > 0 ? (
                            inspectData.empleados.map((emp) => (
                              <div key={emp.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100/50">
                                <div className="flex items-center gap-2.5">
                                  <div 
                                    className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                                    style={{ backgroundColor: selectedInspectTenant.color_primario }}
                                  >
                                    {emp.nombre.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-xs text-slate-800">{emp.nombre} {emp.apellido || ""}</div>
                                    <div className="text-[9px] text-muted-foreground">{emp.email}</div>
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                  {emp.rol}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="text-center text-xs text-muted-foreground py-8">
                              No hay empleados configurados en esta sucursal.
                            </div>
                          )}
                        </div>
                      </Card>

                      {/* Ventas por Empleado */}
                      <Card className="p-6 bg-white border-none shadow-sm rounded-2xl">
                        <h3 className="font-display text-lg text-slate-800 mb-4 flex items-center gap-2">
                          📊 Ventas por Empleado
                        </h3>
                        <div className="space-y-3">
                          {inspectData?.empleados && inspectData.empleados.length > 0 ? (
                            (() => {
                              const empData = inspectData.empleados.map(emp => {
                                const empOrds = (inspectData.ordenes || []).filter(o => o.empleado_id === emp.id);
                                const total = empOrds.reduce((s, o) => s + (o.total || 0), 0);
                                const count = empOrds.length;
                                return { emp, total, count };
                              });

                              const maxVentas = Math.max(...empData.map(d => d.total), 1);

                              return empData.map(({ emp, total, count }) => {
                                const pct = (total / maxVentas) * 100;
                                return (
                                  <div key={emp.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div 
                                          className="h-6 w-6 rounded-full flex items-center justify-center text-white font-bold text-[10px]"
                                          style={{ backgroundColor: selectedInspectTenant.color_primario }}
                                        >
                                          {emp.nombre.charAt(0)}
                                        </div>
                                        <span className="font-semibold text-xs text-slate-800">{emp.nombre} {emp.apellido || ""}</span>
                                      </div>
                                      <span className="text-[10px] text-muted-foreground font-semibold">
                                        {count} {count === 1 ? "orden" : "órdenes"}
                                      </span>
                                    </div>
                                    <div>
                                      <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                                        <span>Total Ventas</span>
                                        <span>{formatRD(total)}</span>
                                      </div>
                                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                        <div 
                                          className="h-full rounded-full transition-all duration-500" 
                                          style={{ 
                                            width: `${pct}%`,
                                            backgroundColor: selectedInspectTenant.color_primario 
                                          }} 
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              });
                            })()
                          ) : (
                            <div className="text-center text-xs text-muted-foreground py-8">
                              No hay empleados registrados.
                            </div>
                          )}
                        </div>
                      </Card>

                      {/* Logística y Eficiencia Operativa */}
                      <Card className="p-6 bg-white border-none shadow-sm rounded-2xl">
                        <h3 className="font-display text-lg text-slate-800 mb-4 flex items-center gap-2">
                          ⚡ Logística y Eficiencia
                        </h3>
                        <div className="space-y-4">
                          {/* Canal de Entrega */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-semibold text-slate-700">
                              <span>Canal de Entrega</span>
                              <span className="text-[10px] text-muted-foreground">
                                {inspectStats.ordsDomicilio} delivery vs {inspectStats.ordsLocal} local
                              </span>
                            </div>
                            <div className="h-3 overflow-hidden rounded-full bg-slate-100 flex">
                              <div 
                                className="h-full text-[8px] font-bold text-white flex items-center justify-center transition-all" 
                                style={{ 
                                  width: `${inspectStats.pctDomicilio}%`,
                                  backgroundColor: selectedInspectTenant.color_primario || '#1B4B73'
                                }} 
                                title={`Delivery: ${inspectStats.pctDomicilio}%`}
                              >
                                {inspectStats.pctDomicilio >= 15 && `${inspectStats.pctDomicilio}% 🚚`}
                              </div>
                              <div 
                                className="h-full text-[8px] font-bold text-white flex items-center justify-center bg-slate-400 transition-all" 
                                style={{ 
                                  width: `${inspectStats.pctLocal}%`
                                }} 
                                title={`En Local: ${inspectStats.pctLocal}%`}
                              >
                                {inspectStats.pctLocal >= 15 && `${inspectStats.pctLocal}% 🧺`}
                              </div>
                            </div>
                            <div className="flex justify-between text-[8px] text-muted-foreground px-1">
                              <span>🚚 Delivery ({inspectStats.pctDomicilio}%)</span>
                              <span>🧺 En Local ({inspectStats.pctLocal}%)</span>
                            </div>
                          </div>

                          {/* Desglose de Delivery a Domicilio */}
                          <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-dashed border-slate-100 text-[10px] text-slate-600">
                            <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-100 flex flex-col justify-between">
                              <span className="text-[9px] text-emerald-800 font-medium">Entregados 🚚</span>
                              <strong className="text-emerald-700 font-bold text-xs mt-1">{inspectStats.deliveryEntregados}</strong>
                            </div>
                            <div className="bg-amber-50/70 p-2 rounded-xl border border-amber-100 flex flex-col justify-between">
                              <span className="text-[9px] text-amber-800 font-medium">En Ruta 📍</span>
                              <strong className="text-amber-700 font-bold text-xs mt-1">{inspectStats.deliveryPendientes}</strong>
                            </div>
                            <div className="bg-rose-50/70 p-2 rounded-xl border border-rose-100 flex flex-col justify-between">
                              <span className="text-[9px] text-rose-800 font-medium">Cancelados ❌</span>
                              <strong className="text-rose-700 font-bold text-xs mt-1">{inspectStats.deliveryCancelados}</strong>
                            </div>
                          </div>

                          {/* Tasa de Urgencia */}
                          <div className="pt-3 border-t border-slate-100 space-y-1.5">
                            <div className="flex justify-between text-xs font-semibold text-slate-700">
                              <span>Tasa de Órdenes Express / Urgentes</span>
                              <span className={`text-[10px] font-bold ${inspectStats.pctUrgencia > 20 ? 'text-amber-600' : 'text-slate-500'}`}>
                                {inspectStats.ordsUrgentes} urgentes
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                              <div 
                                className="h-full rounded-full transition-all duration-500" 
                                style={{ 
                                  width: `${inspectStats.pctUrgencia}%`,
                                  backgroundColor: inspectStats.pctUrgencia > 20 ? '#D97706' : (selectedInspectTenant.color_primario || '#1B4B73')
                                }} 
                              />
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-muted-foreground pt-0.5">
                              <span>⚡ Prioridad Express: {inspectStats.pctUrgencia}%</span>
                              <span>
                                {inspectStats.pctUrgencia > 20 ? (
                                  <span className="text-amber-600 font-medium">⚠️ Alta demanda express</span>
                                ) : (
                                  <span className="text-emerald-600 font-medium">🟢 Carga de trabajo stable</span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>

                      {/* Créditos, Deudas y Abonos de Clientes */}
                      <Card className="p-6 bg-white border-none shadow-sm rounded-2xl">
                        <h3 className="font-display text-lg text-slate-800 mb-4 flex items-center gap-2">
                          🏦 Créditos y Cuentas por Cobrar
                        </h3>
                        <div className="space-y-3">
                          {/* Deuda Pendiente */}
                          <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100/50 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-rose-800 font-bold uppercase tracking-wider block">Deuda Pendiente (Por Cobrar)</span>
                              <div className="text-2xl font-display font-bold text-rose-600 mt-1">
                                {formatRD(inspectStats.totalDeuda)}
                              </div>
                            </div>
                            <span className="px-2.5 py-1 bg-rose-100 text-rose-800 text-[10px] font-extrabold rounded-lg">
                              {inspectStats.cantidadDeudas} {inspectStats.cantidadDeudas === 1 ? "factura" : "facturas"}
                            </span>
                          </div>

                          {/* Abonos y Parciales */}
                          <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100/50 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">Abonos y Pagos Recibidos</span>
                              <div className="text-2xl font-display font-bold text-emerald-600 mt-1">
                                {formatRD(inspectStats.totalAbonado + inspectStats.totalAbonosCaja)}
                              </div>
                            </div>
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-lg">
                              Abonos Activos
                            </span>
                          </div>

                          {/* Nota aclaratoria con estilo */}
                          <div className="text-[9px] text-slate-500 bg-slate-50 border border-slate-100/80 p-2.5 rounded-xl text-center leading-normal">
                            ℹ️ <strong>Cuentas por cobrar:</strong> Representa los saldos pendientes de pago de tus clientes. Los abonos reflejan pagos parciales aplicados a órdenes vigentes.
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Botón de Cierre */}
              <div className="p-4 bg-slate-100 border-t flex justify-end">
                <Button 
                  onClick={() => setSelectedInspectTenant(null)}
                  className="rounded-xl font-bold h-10 px-6"
                  variant="outline"
                >
                  Cerrar panel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KPI({
  title,
  value,
  sub,
  icon: Icon,
  variant = "primary",
}: {
  title: string;
  value: string;
  sub?: React.ReactNode;
  icon: any;
  variant?: "primary" | "amber" | "emerald" | "rose" | "indigo";
}) {
  const styles = {
    primary: {
      card: "bg-gradient-primary text-white shadow-md border-0",
      title: "text-white/80 font-semibold",
      value: "text-white",
      sub: "text-white/90",
      icon: "text-white/80",
    },
    amber: {
      card: "bg-amber-500/10 border border-amber-500/20 shadow-2xs",
      title: "text-amber-800 dark:text-amber-300 font-semibold",
      value: "text-foreground",
      sub: "text-amber-900 dark:text-amber-300",
      icon: "text-amber-600 dark:text-amber-400",
    },
    emerald: {
      card: "bg-emerald-500/10 border border-emerald-500/20 shadow-2xs",
      title: "text-emerald-800 dark:text-emerald-300 font-semibold",
      value: "text-foreground",
      sub: "text-emerald-900 dark:text-emerald-300",
      icon: "text-emerald-600 dark:text-emerald-400",
    },
    rose: {
      card: "bg-rose-500/10 border border-rose-500/20 shadow-2xs",
      title: "text-rose-800 dark:text-rose-300 font-semibold",
      value: "text-foreground",
      sub: "text-rose-900 dark:text-rose-300",
      icon: "text-rose-600 dark:text-rose-400",
    },
    indigo: {
      card: "bg-indigo-500/10 border border-indigo-500/20 shadow-2xs",
      title: "text-indigo-800 dark:text-indigo-300 font-semibold",
      value: "text-foreground",
      sub: "text-indigo-900 dark:text-indigo-200",
      icon: "text-indigo-600 dark:text-indigo-400",
    },
  }[variant];

  const isLong = value.length > 9;

  return (
    <Card className={`p-3.5 sm:p-5 h-full rounded-2xl ${styles.card}`}>
      <div className="flex items-start justify-between gap-1.5">
        <div className={`text-[10px] sm:text-xs uppercase tracking-wider ${styles.title}`}>{title}</div>
        <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 mt-0.5 ${styles.icon}`} />
      </div>
      <div className={`mt-1.5 sm:mt-2 font-display font-black tracking-tight ${styles.value} ${isLong ? "text-lg sm:text-xl xl:text-[26px]" : "text-xl sm:text-2xl lg:text-3xl"}`} title={value}>
        {value}
      </div>
      {sub && <div className={`mt-0.5 sm:mt-1 text-[11px] sm:text-xs font-semibold truncate ${styles.sub}`}>{sub}</div>}
    </Card>
  );
}
