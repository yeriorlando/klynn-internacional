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
  Truck,
  Pencil,
  Eye,
  X,
  Phone,
  Store,
  UserCheck,
  ChevronRight,
  Hash,
  Inbox,
  RotateCw,
  Ban,
  Shirt,
  Trash2
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
  getClientes,
  getServicios,
  getPlans,
  PLANS,
  formatRD, 
  formatDateRD,
  setActiveTenant,
  setSession,
  logout,
  getGastos,
  getMovimientos,
  getEmpleados,
  getNextRenewalDate,
  getCajas,
  saveOrden,
  type Tenant,
  type Plan,
  type Orden,
  type Cliente,
  type Servicio,
  type Empleado,
  type EstadoOrden
} from "@/lib/storage";
import { EditOrderDialog } from "@/components/klynn/EditOrderDialog";
import { OrderDetail, TicketPrintPortal } from "@/components/klynn/OrdenesPage";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

function getEstadoBadge(estado: string) {
  const norm = (estado || "").replace("_", " ").toUpperCase().trim();

  const config: Record<string, { icon: any; label: string; style: string }> = {
    RECIBIDA: {
      icon: Inbox,
      label: "Recibida",
      style: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300",
    },
    RECIBIDO: {
      icon: Inbox,
      label: "Recibida",
      style: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300",
    },
    "EN PROCESO": {
      icon: RotateCw,
      label: "En Proceso",
      style: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
    },
    EN_PROCESO: {
      icon: RotateCw,
      label: "En Proceso",
      style: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
    },
    PROCESO: {
      icon: RotateCw,
      label: "En Proceso",
      style: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
    },
    LISTA: {
      icon: CheckCircle2,
      label: "Lista",
      style: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
    },
    LISTO: {
      icon: CheckCircle2,
      label: "Lista",
      style: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
    },
    "EN CAMINO": {
      icon: Truck,
      label: "En Camino",
      style: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300",
    },
    EN_CAMINO: {
      icon: Truck,
      label: "En Camino",
      style: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300",
    },
    ENTREGADA: {
      icon: CheckCircle2,
      label: "Entregada",
      style: "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/50 dark:bg-purple-950/40 dark:text-purple-300",
    },
    ENTREGADO: {
      icon: CheckCircle2,
      label: "Entregada",
      style: "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/50 dark:bg-purple-950/40 dark:text-purple-300",
    },
    PAGADA: {
      icon: CheckCircle2,
      label: "Pagada",
      style: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
    },
    PAGADO: {
      icon: CheckCircle2,
      label: "Pagada",
      style: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
    },
    CANCELADA: {
      icon: Ban,
      label: "Cancelada",
      style: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300",
    },
    CANCELADO: {
      icon: Ban,
      label: "Cancelada",
      style: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300",
    },
    ANULADA: {
      icon: Ban,
      label: "Anulada",
      style: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300",
    },
  };

  const item = config[norm] || config[estado] || {
    icon: CheckCircle2,
    label: estado,
    style: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
  };
  const Icon = item.icon;

  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide shadow-2xs border ${item.style}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span>{item.label}</span>
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
            const [ords, clis] = await Promise.all([
              getOrdenes(t.id),
              getClientes(t.id)
            ]);
            const ordsArr = Array.isArray(ords) ? (ords as Orden[]) : [];
            const clisArr = Array.isArray(clis) ? (clis as Cliente[]) : [];
            const ingr = ordsArr.reduce((s: number, o: any) => s + (o.total || 0), 0);
            return { 
              tenantId: t.id, 
              count: ordsArr.length, 
              total: ingr, 
              estado: t.estado,
              ords: ordsArr,
              clis: clisArr,
              tenant: t
            };
          } catch {
            return { 
              tenantId: t.id, 
              count: 0, 
              total: 0, 
              estado: t.estado,
              ords: [],
              clis: [],
              tenant: t
            };
          }
        })
      );

      let totalIngresos = 0, totalOrdenesCount = 0, activasCount = 0;
      const tStats: Record<string, { count: number; total: number }> = {};
      const allOrdersWithTenant: Array<{ orden: Orden; tenant: Tenant; cliente?: Cliente }> = [];

      for (const res of ordsResults) {
        tStats[res.tenantId] = { count: res.count, total: res.total };
        totalIngresos += res.total;
        totalOrdenesCount += res.count;
        if (res.estado !== "CANCELADO") activasCount++;

        const clientMap = new Map((res.clis || []).map((c) => [c.id, c]));
        (res.ords || []).forEach((o: Orden) => {
          allOrdersWithTenant.push({
            orden: o,
            tenant: res.tenant,
            cliente: clientMap.get(o.cliente_id)
          });
        });
      }

      return {
        tenants,
        tenantStats: tStats,
        stats: { totalIngresos, totalOrdenesCount, activasCount },
        allOrdersWithTenant
      };
    },
    enabled: !!userEmail && auth?.empleado.id !== '__loading__',
    staleTime: 60_000,
  });

  const myTenants = dashboardData?.tenants || [];
  const tenantStats = dashboardData?.tenantStats || {};
  const stats = dashboardData?.stats || { totalIngresos: 0, totalOrdenesCount: 0, activasCount: 0 };
  const allOrdersWithTenant = dashboardData?.allOrdersWithTenant || [];
  const loading = loadingDashboard && myTenants.length === 0;

  // Filtros de Sucursales
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Buscador Global Multicursal (Omnisearch)
  const [globalSearch, setGlobalSearch] = useState("");
  const [globalSearchBranch, setGlobalSearchBranch] = useState<string>("ALL");
  const [isOpeningOrder, setIsOpeningOrder] = useState(false);

  const selectedBranchTenant = useMemo(() => {
    return myTenants.find((t) => t.id === globalSearchBranch) || null;
  }, [myTenants, globalSearchBranch]);

  const globalSearchResults = useMemo(() => {
    const q = globalSearch.toLowerCase().trim();
    if (!q || q.length < 2) return [];
    const cleanQ = q.startsWith("#") ? q.slice(1) : q;

    return allOrdersWithTenant.filter(({ orden, tenant, cliente }) => {
      // Filtro por sucursal seleccionada
      if (globalSearchBranch !== "ALL" && tenant.id !== globalSearchBranch) {
        return false;
      }

      const numMatch = (orden.numero || "").toLowerCase().includes(cleanQ);
      const cliNameMatch = cliente 
        ? `${cliente.nombre} ${cliente.apellido || ""}`.toLowerCase().includes(q) 
        : false;
      const cliPhoneMatch = cliente?.telefono ? cliente.telefono.includes(cleanQ) : false;
      const tenantNameMatch = tenant.nombre.toLowerCase().includes(q);
      const notesMatch = (orden.notas || "").toLowerCase().includes(q);

      return numMatch || cliNameMatch || cliPhoneMatch || tenantNameMatch || notesMatch;
    }).slice(0, 20);
  }, [allOrdersWithTenant, globalSearch, globalSearchBranch]);

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
  
  // Estados para ver / editar órdenes desde la búsqueda global
  const [editingOrder, setEditingOrder] = useState<Orden | null>(null);
  const [editingOrderContext, setEditingOrderContext] = useState<{
    tenant: Tenant;
    clientes: Cliente[];
    servicios: Servicio[];
    empleados: Empleado[];
  } | null>(null);

  const [viewingOrder, setViewingOrder] = useState<Orden | null>(null);
  const [viewingOrderContext, setViewingOrderContext] = useState<{
    tenant: Tenant;
    clientes: Cliente[];
    servicios: Servicio[];
    empleados: Empleado[];
  } | null>(null);

  const [showPrint, setShowPrint] = useState<Orden | null>(null);



  // Handlers para abrir órdenes desde el buscador global
  const handleOpenGlobalOrder = async (orden: Orden, tenant: Tenant, action: "view" | "edit") => {
    setIsOpeningOrder(true);
    try {
      const [clis, servs, emps] = await Promise.all([
        getClientes(tenant.id),
        getServicios(tenant.id),
        getEmpleados(tenant.id)
      ]);
      const ctx = {
        tenant,
        clientes: clis || [],
        servicios: servs || [],
        empleados: emps || []
      };
      if (action === "view") {
        setViewingOrderContext(ctx);
        setViewingOrder(orden);
      } else {
        setEditingOrderContext(ctx);
        setEditingOrder(orden);
      }
    } catch (e) {
      console.error("Error al preparar orden:", e);
      toast.error("Error al cargar datos para la orden");
    } finally {
      setIsOpeningOrder(false);
    }
  };


  // Guardar orden editada con actualización reactiva
  const handleOrderSaved = (updated: Orden) => {
    setEditingOrder(null);
    setEditingOrderContext(null);
    toast.success(`Orden #${updated.numero} actualizada con éxito`);

    if (viewingOrder?.id === updated.id) {
      setViewingOrder(updated);
    }

    queryClient.invalidateQueries({ queryKey: ["dashboard-admin-data"] });
  };

  // Cambiar estado de orden
  const handleCambiarEstado = async (ordenId: string, nuevoEstado: EstadoOrden) => {
    try {
      const orden = viewingOrder;
      if (!orden) return;
      const updated = { ...orden, estado: nuevoEstado };
      await saveOrden(updated);
      toast.success(`Estado de orden #${orden.numero} cambiado a ${nuevoEstado}`);

      if (viewingOrder?.id === ordenId) {
        setViewingOrder(updated);
      }

      queryClient.invalidateQueries({ queryKey: ["dashboard-admin-data"] });
    } catch (err) {
      console.error("Error al cambiar estado:", err);
      toast.error("Error al actualizar estado");
    }
  };


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
            <Store className="mr-2 h-4 w-4" /> Registrar nueva sucursal
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

        {/* Barra de Búsqueda Global Multicursal (Omnisearch) y Filtros */}
        <div className="mt-6 sm:mt-8 space-y-3">
          {/* Buscador Global Omnisearch con Selector de Sucursal Integrado */}
          <div className="relative">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-300/80 dark:border-slate-700 shadow-sm p-2 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                {/* Selector de Sucursal con Logo Circular y Detalles */}
                <div className="shrink-0 w-full sm:w-auto">
                  <Select value={globalSearchBranch} onValueChange={setGlobalSearchBranch}>
                    <SelectTrigger className="h-11 border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 gap-2.5 px-3 shadow-2xs focus:ring-0 cursor-pointer transition-all w-full sm:w-auto sm:min-w-[270px]">
                      <SelectValue asChild>
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                          {globalSearchBranch === "ALL" ? (
                            <>
                              <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-2xs">
                                <Store className="h-3.5 w-3.5 stroke-[2.5]" />
                              </div>
                              <div className="truncate flex items-center gap-1.5 min-w-0">
                                <span className="font-extrabold text-xs text-foreground truncate">Todas las sucursales</span>
                                <span className="text-[10px] font-bold text-muted-foreground shrink-0">({myTenants.length})</span>
                              </div>
                            </>
                          ) : selectedBranchTenant ? (
                            <>
                              {selectedBranchTenant.logo_url ? (
                                <img
                                  src={selectedBranchTenant.logo_url}
                                  alt=""
                                  className="h-7 w-7 rounded-full object-contain border border-border/80 bg-white p-0.5 shrink-0 shadow-2xs"
                                />
                              ) : (
                                <div
                                  className="h-7 w-7 rounded-full flex items-center justify-center font-black text-white text-xs shrink-0 shadow-2xs"
                                  style={{ backgroundColor: selectedBranchTenant.color_primario || "#0891b2" }}
                                >
                                  {selectedBranchTenant.nombre.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="truncate flex items-center gap-1.5 min-w-0">
                                <span className="font-bold text-xs text-foreground truncate">{selectedBranchTenant.nombre}</span>
                                <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded-md border border-emerald-200/50 shrink-0">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  {getTenantBranchName(selectedBranchTenant)}
                                </span>
                              </div>
                            </>
                          ) : (
                            <span className="text-muted-foreground">Seleccionar sucursal</span>
                          )}
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 max-h-84 w-auto min-w-[320px] sm:min-w-[380px] max-w-[480px]">
                      {/* Opción Todas las Sucursales */}
                      <SelectItem 
                        value="ALL" 
                        className="py-2.5 px-3 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors my-0.5"
                      >
                        <div className="flex items-center gap-3 w-full pr-1">
                          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-2xs">
                            <Store className="h-4.5 w-4.5 stroke-[2.5]" />
                          </div>
                          <div className="min-w-0 flex-1 text-left whitespace-normal">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-xs text-foreground">Todas las sucursales</span>
                              <span className="bg-primary/10 text-primary font-bold text-[9.5px] px-1.5 py-0.2 rounded-md">
                                {myTenants.length} activas
                              </span>
                            </div>
                            <div className="text-[10.5px] text-muted-foreground mt-0.5 leading-tight font-medium">
                              Búsqueda global unificada en toda la red
                            </div>
                          </div>
                        </div>
                      </SelectItem>

                      <div className="h-px bg-slate-200/70 dark:bg-slate-800 my-1 mx-2" />

                      {/* Lista de Sucursales con Logo Circular y Detalles */}
                      {myTenants.map((t) => (
                        <SelectItem 
                          key={t.id} 
                          value={t.id} 
                          className="py-2.5 px-3 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors my-0.5"
                        >
                          <div className="flex items-center gap-3 w-full pr-1">
                            {/* Logotipo Circular */}
                            {t.logo_url ? (
                              <img
                                src={t.logo_url}
                                alt={t.nombre}
                                className="h-9 w-9 rounded-full object-contain border border-slate-200 dark:border-slate-700 bg-white p-0.5 shrink-0 shadow-2xs ring-1 ring-black/5"
                              />
                            ) : (
                              <div
                                className="h-9 w-9 rounded-full flex items-center justify-center font-black text-white text-xs shrink-0 shadow-2xs ring-1 ring-black/5"
                                style={{ backgroundColor: t.color_primario || "#0891b2" }}
                              >
                                {t.nombre.charAt(0).toUpperCase()}
                              </div>
                            )}

                            {/* Nombre, Badge de Sucursal y Datos Compactos */}
                            <div className="min-w-0 flex-1 text-left whitespace-normal">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-foreground truncate">{t.nombre}</span>
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded-md border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  {getTenantBranchName(t)}
                                </span>
                              </div>

                              <div className="text-[10.5px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                                {t.telefono && (
                                  <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {t.telefono}
                                  </span>
                                )}
                                {t.telefono && t.rnc && <span className="text-slate-300 dark:text-slate-600 font-bold">•</span>}
                                {t.rnc && (
                                  <span 
                                    className="font-mono font-bold px-2 py-0.5 rounded-md text-[10px] tracking-wide border border-white/20 shadow-2xs text-white"
                                    style={{ backgroundColor: '#1B4B73', color: '#FFFFFF' }}
                                  >
                                    RNC: {t.rnc}
                                  </span>
                                )}
                                {!t.telefono && !t.rnc && t.email && (
                                  <span className="truncate">{t.email}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Separador vertical para pantallas medianas/grandes */}
                <div className="hidden sm:block h-7 w-px bg-slate-200 dark:bg-slate-750 mx-0.5" />

                {/* Campo de búsqueda con borde definido, icono y botón de limpiar */}
                <div className="relative flex-1 flex items-center min-w-0 bg-slate-50/90 dark:bg-slate-800/90 border border-slate-300/90 dark:border-slate-600/90 rounded-xl px-3 h-11 transition-all focus-within:border-primary focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-2 focus-within:ring-primary/20 shadow-2xs gap-2">
                  <Search className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
                  <Input
                    placeholder={
                      globalSearchBranch === "ALL"
                        ? "Buscar orden # (ej. 0052), cliente o teléfono en todas las sucursales..."
                        : `Buscar en ${selectedBranchTenant?.nombre || "esta sucursal"}...`
                    }
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    className="border-0 shadow-none focus-visible:ring-0 text-xs sm:text-sm h-full bg-transparent flex-1 pl-1 placeholder:text-muted-foreground/70 font-medium"
                  />
                  {globalSearch && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setGlobalSearch("")}
                      className="h-8 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0 border-0"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-white stroke-[2.5]" />
                      <span>Limpiar Campo</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Resultados Flotantes de la Búsqueda Global */}
            {globalSearch.trim().length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-3 z-50 max-h-[460px] overflow-y-auto space-y-2">
                <div className="flex items-center justify-between px-2 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-2">
                  <span>
                    Resultados {globalSearchBranch !== "ALL" ? `en ${myTenants.find((t) => t.id === globalSearchBranch)?.nombre || "sucursal"}` : "en todas las sucursales"} ({globalSearchResults.length})
                  </span>
                  <span className="text-[10px] lowercase font-normal text-muted-foreground">haz clic en Ver o Editar</span>
                </div>

                {globalSearchResults.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-30 text-primary" />
                    No se encontraron órdenes o clientes coincidentes con <strong className="text-foreground">"{globalSearch}"</strong>.
                  </div>
                ) : (
                  globalSearchResults.map(({ orden, tenant, cliente }) => {
                    const totalPrendas = (orden.items || []).reduce((acc: number, it: any) => acc + (it.cantidad || 0), 0);

                    return (
                      <div
                        key={`${tenant.id}-${orden.id}`}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-primary/50 hover:shadow-md transition-all gap-3.5 group"
                      >
                        <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                          {/* Badge de Orden Horizontal Elegante (ancho automático sin cortes) */}
                          <div className="shrink-0">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs tabular-nums tracking-wide shadow-2xs whitespace-nowrap">
                              <Hash className="h-3 w-3 opacity-60 shrink-0" />
                              {orden.numero}
                            </span>
                          </div>

                          {/* Datos del Cliente, Sucursal y Fechas */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                {cliente ? `${cliente.nombre} ${cliente.apellido || ""}` : `Cliente registrado`}
                              </span>
                              {cliente?.telefono && (
                                <span className="text-xs text-muted-foreground font-mono">
                                  • {cliente.telefono}
                                </span>
                              )}
                              {globalSearchBranch === "ALL" && (
                                <Badge variant="outline" className="text-[10px] font-bold bg-sky-50 text-sky-800 border-sky-200/80 dark:bg-sky-950/60 dark:text-sky-300 inline-flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full shadow-2xs">
                                  <Store className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                                  <span>{tenant.nombre}</span>
                                </Badge>
                              )}
                              {getEstadoBadge(orden.estado)}
                              {orden.es_urgente && (
                                <Badge className="text-[9px] bg-rose-500 text-white font-bold h-4 px-1.5 inline-flex items-center gap-1">
                                  <Zap className="h-2.5 w-2.5" /> Urgente
                                </Badge>
                              )}
                            </div>

                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                              <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                                <Calendar className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400 shrink-0 stroke-[2.5]" />
                                <span className="font-extrabold text-slate-900 dark:text-white">Recibida:</span>
                                <span className="font-bold">{formatDateRD(orden.creado_en)}</span>
                              </span>
                              {orden.fecha_entrega && (
                                <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                                  <Truck className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400 shrink-0 stroke-[2.5]" />
                                  <span className="font-extrabold text-slate-900 dark:text-white">Entrega:</span>
                                  <span className="font-bold">{formatDateRD(orden.fecha_entrega)}</span>
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700 text-xs">
                                <Shirt className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400 shrink-0 stroke-[2]" />
                                <span>{totalPrendas} {totalPrendas === 1 ? "prenda" : "prendas"}</span>
                              </span>
                              <span className="font-bold text-foreground tabular-nums">
                                Total: {formatRD(orden.total)}
                              </span>
                              {orden.saldo > 0 ? (
                                <span className="text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900 text-[11px] tabular-nums">
                                  Debe: {formatRD(orden.saldo)}
                                </span>
                              ) : (
                                <span className="text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900 text-[11px]">
                                  Saldada
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botones de Acción */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 w-full sm:w-auto justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isOpeningOrder}
                            className="h-8 px-3 text-xs font-bold rounded-xl gap-1.5 cursor-pointer shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800"
                            onClick={() => handleOpenGlobalOrder(orden, tenant, "view")}
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" /> Ver
                          </Button>
                          <Button
                            size="sm"
                            disabled={isOpeningOrder}
                            className="h-8 px-3.5 text-xs font-bold rounded-xl gap-1.5 bg-primary hover:bg-primary/90 text-white cursor-pointer shadow-2xs"
                            onClick={() => handleOpenGlobalOrder(orden, tenant, "edit")}
                          >
                            <Pencil className="h-3.5 w-3.5" /> Editar
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Barra de Filtros de Sucursal */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-surface p-3.5 sm:p-4 rounded-2xl border border-border/50 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar sucursales por nombre, correo, RNC o subdominio..."
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
                        <Store className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
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
                            <div
                              onClick={() => navigate({ to: "/reportes", search: { tenantId: t.id } })}
                              className="flex items-center gap-2.5 cursor-pointer group"
                              title="Haz clic para ver reportes y operativa de esta sucursal"
                            >
                              {t.logo_url ? (
                                <img
                                  src={t.logo_url}
                                  alt={t.nombre}
                                  className="h-10 w-10 rounded-full object-contain border-2 border-border/70 bg-white p-0.5 shrink-0 shadow-xs ring-2 ring-primary/10 group-hover:ring-primary/50 transition-all"
                                />
                              ) : (
                                <div
                                  className="h-10 w-10 rounded-full flex items-center justify-center font-black text-white text-sm shrink-0 shadow-xs ring-2 ring-black/10 dark:ring-white/10 group-hover:scale-105 transition-all"
                                  style={{ backgroundColor: t.color_primario || "#0891b2" }}
                                >
                                  {t.nombre.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-bold text-foreground text-[13px] tracking-tight group-hover:text-primary transition-colors flex items-center gap-1.5 flex-wrap">
                                  <span className="truncate underline-offset-2 group-hover:underline">{t.nombre}</span>
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
                                onClick={() => navigate({ to: "/reportes", search: { tenantId: t.id } })}
                                className="h-8 px-3 rounded-full font-bold text-xs bg-[#1B4B73] hover:bg-[#153a5b] text-white border-0 shadow-2xs gap-1.5 cursor-pointer transition-all"
                                title="Inspeccionar reportes y operativa de la sucursal"
                              >
                                <Eye className="h-3.5 w-3.5 text-white" />
                                <span>Inspeccionar</span>
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => handleManage(t.id, t.slug)}
                                className="h-8 px-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border border-emerald-500/80 shadow-2xs gap-1 cursor-pointer transition-all"
                                title="Entrar al panel interno de esta sucursal"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>Entrar</span>
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
                <Store className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
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
                    <div 
                      onClick={() => navigate({ to: "/reportes", search: { tenantId: t.id } })}
                      className="flex items-start gap-3 cursor-pointer group"
                      title="Toca para ver reportes y operativa de esta sucursal"
                    >
                      {t.logo_url ? (
                        <img
                          src={t.logo_url}
                          alt={t.nombre}
                          className="h-12 w-12 rounded-full object-contain border-2 border-border/70 bg-white p-1 shrink-0 shadow-xs group-hover:ring-2 group-hover:ring-primary/40 transition-all"
                        />
                      ) : (
                        <div
                          className="h-12 w-12 rounded-full flex items-center justify-center font-black text-white text-base shrink-0 shadow-xs group-hover:scale-105 transition-all"
                          style={{ backgroundColor: t.color_primario || "#0891b2" }}
                        >
                          {t.nombre.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors underline-offset-2 group-hover:underline">{t.nombre}</h3>
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
                        onClick={() => navigate({ to: "/reportes", search: { tenantId: t.id } })}
                        className="flex-1 h-8 rounded-full font-bold text-xs bg-[#1B4B73] hover:bg-[#153a5b] text-white border-0 shadow-2xs gap-1.5 cursor-pointer transition-all"
                        title="Inspeccionar reportes y operativa"
                      >
                        <Eye className="h-3.5 w-3.5 text-white" />
                        <span>Inspeccionar</span>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleManage(t.id, t.slug)}
                        className="flex-1 h-8 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Entrar</span>
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
        <DialogContent className="sm:max-w-[430px] rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl p-5 sm:p-6 bg-white dark:bg-slate-900 overflow-hidden text-foreground">
          <div className="relative">
            {/* Luz ambiental superior decorativa */}
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-24 bg-gradient-to-b from-[#1B4B73]/15 via-amber-500/10 to-transparent blur-2xl pointer-events-none" />

            <div className="space-y-3.5 pt-1">
              {tieneCuposLibres ? (
                <div className="space-y-3.5">
                  {/* Hero Header */}
                  <DialogHeader className="flex flex-col items-center text-center">
                    <div className="relative mb-2">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 border border-emerald-400/40">
                        <CheckCircle2 className="h-6 w-6 text-white stroke-[2.3]" />
                      </div>
                      <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-400 text-slate-900 flex items-center justify-center shadow-2xs">
                        <Sparkles className="h-3 w-3 fill-current text-white" />
                      </div>
                    </div>

                    <Badge className="mb-1.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-[11px] px-2.5 py-0.5 rounded-full">
                      Cupo de sucursal listo
                    </Badge>

                    <DialogTitle className="font-display font-black text-xl text-foreground tracking-tight">
                      ¡Espacio disponible!
                    </DialogTitle>

                    <DialogDescription className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed text-center">
                      Tienes cupo en tu cuenta para registrar y activar tu nueva sede de inmediato sin costos adicionales.
                    </DialogDescription>
                  </DialogHeader>

                  {/* Quota Progress Card */}
                  <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold gap-2">
                      <span className="text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 whitespace-nowrap shrink-0">
                        <Store className="h-3.5 w-3.5 text-emerald-600" />
                        Sucursales creadas
                      </span>
                      <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold text-xs whitespace-nowrap shrink-0">
                        {sucursalesCreadas} de {maxSucursalesContratadas} contratadas
                      </span>
                    </div>

                    <div className="h-2 w-full bg-emerald-200/50 dark:bg-emerald-900/40 rounded-full overflow-hidden p-0.5">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.round((sucursalesCreadas / maxSucursalesContratadas) * 100))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10.5px] text-emerald-800/80 dark:text-emerald-300/80">
                      <span className="whitespace-nowrap">Espacios disponibles:</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                        {Math.max(0, maxSucursalesContratadas - sucursalesCreadas)} sucursal(es) libres
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-1 flex flex-col gap-2">
                    <Link to="/nueva-sucursal" className="w-full">
                      <Button 
                        onClick={() => setShowBranchModal(false)} 
                        className="w-full bg-[#1B4B73] hover:bg-[#143a59] text-white font-bold h-11 rounded-xl shadow-md shadow-[#1B4B73]/20 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer transition-all active:scale-[0.98]"
                      >
                        <Store className="h-4 w-4 mr-1 text-[#F0B900]" />
                        <span>Continuar a registro de sucursal</span>
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowBranchModal(false)} 
                      className="h-9 rounded-xl text-slate-600 dark:text-slate-400 font-semibold border-border hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-xs"
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>
              ) : puedeComprarMas ? (
                <div className="space-y-3.5">
                  {/* Hero Header */}
                  <DialogHeader className="flex flex-col items-center text-center">
                    <div className="relative mb-2">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/25 border border-amber-400/40">
                        <Sparkles className="h-6 w-6 text-white stroke-[2.3]" />
                      </div>
                      <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-300 text-slate-900 flex items-center justify-center shadow-2xs">
                        <Store className="h-3 w-3" />
                      </div>
                    </div>

                    <Badge className="mb-1.5 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold text-[11px] px-2.5 py-0.5 rounded-full">
                      Plan {plan?.nombre} • Expansión disponible
                    </Badge>

                    <DialogTitle className="font-display font-black text-xl text-foreground tracking-tight">
                      Desbloquear nueva sucursal
                    </DialogTitle>

                    <DialogDescription className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed text-center">
                      Tu plan actual <strong className="text-foreground font-bold">{plan?.nombre}</strong> te permite añadir hasta <strong className="text-foreground font-bold">{limiteAdicionalesPlan} sucursales extra</strong>.
                    </DialogDescription>
                  </DialogHeader>

                  {/* Price and Quota Card */}
                  <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/60 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-200/80 dark:border-slate-800 gap-2">
                      <span className="font-medium text-muted-foreground whitespace-nowrap shrink-0">Plan contratado:</span>
                      <Badge variant="outline" className="font-bold text-[10px] bg-white dark:bg-slate-800 uppercase text-[#1B4B73] dark:text-sky-300 border-[#1B4B73]/20 whitespace-nowrap">
                        {plan?.nombre}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-200/80 dark:border-slate-800 gap-2">
                      <span className="font-medium text-muted-foreground whitespace-nowrap shrink-0">Cupos activos:</span>
                      <span className="font-bold text-foreground font-mono whitespace-nowrap">{maxSucursalesContratadas} sucursal(es)</span>
                    </div>

                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-bold text-foreground whitespace-nowrap shrink-0">Inversión sucursal extra:</span>
                      <span className="font-display font-black text-sm text-primary whitespace-nowrap">
                        {formatRD(precioAdicional).replace("DOP", "RD$")}<span className="text-[10px] font-semibold text-muted-foreground">/mes</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-1 flex flex-col gap-2">
                    {polarSucursalUrl ? (
                      <a href={polarSucursalUrl} target="_blank" rel="noreferrer" className="w-full">
                        <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold h-11 rounded-xl shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer transition-all active:scale-[0.98]">
                          <Sparkles className="h-4 w-4 text-white" />
                          <span>Desbloquear sucursal extra</span>
                          <ExternalLink className="h-3.5 w-3.5 text-white/70 ml-1" />
                        </Button>
                      </a>
                    ) : (
                      <Button disabled className="w-full bg-slate-200 text-slate-500 font-bold h-11 rounded-xl text-xs">
                        Enlace de pago no disponible
                      </Button>
                    )}

                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground font-medium py-0.5">
                      <span>¿Pago asistido?</span>
                      <a 
                        href={`https://wa.me/18299416546?text=Hola%20Klynn,%20me%20gustaria%20activar%20una%20sucursal%20adicional%20para%20mi%20lavanderia%20${encodeURIComponent(mainTenant?.nombre || "")}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="font-bold text-[#1B4B73] dark:text-sky-400 hover:underline inline-flex items-center gap-1"
                      >
                        <MessageCircle className="h-3 w-3" /> Soporte WhatsApp
                      </a>
                    </div>

                    <Button 
                      variant="outline" 
                      onClick={() => setShowBranchModal(false)} 
                      className="h-9 rounded-xl text-slate-600 dark:text-slate-400 font-semibold border-border hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-xs"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {/* Hero Header */}
                  <DialogHeader className="flex flex-col items-center text-center">
                    <div className="relative mb-2">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#1B4B73] to-[#0f2d47] text-white flex items-center justify-center shadow-md shadow-[#1B4B73]/25 border border-[#1B4B73]/30">
                        <Crown className="h-6 w-6 text-[#F0B900]" />
                      </div>
                      <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center shadow-2xs">
                        <Sparkles className="h-3 w-3 fill-current" />
                      </div>
                    </div>

                    <Badge className="mb-1.5 bg-[#1B4B73]/10 text-[#1B4B73] dark:bg-[#1B4B73]/25 dark:text-sky-300 border border-[#1B4B73]/25 font-bold text-[11px] px-2.5 py-0.5 rounded-full">
                      Plan {plan?.nombre || "Básico"} • Capacidad al 100%
                    </Badge>

                    <DialogTitle className="font-display font-black text-xl text-foreground tracking-tight">
                      Límite máximo alcanzado
                    </DialogTitle>

                    <DialogDescription className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed text-center">
                      Has completado el límite máximo de <strong className="text-foreground font-bold">{totalMaxSucursalesPlan} sucursales</strong> permitido para tu cuenta en el <strong className="text-foreground font-bold">Plan {plan?.nombre}</strong>.
                    </DialogDescription>
                  </DialogHeader>

                  {/* Quota Progress Card */}
                  <div className="rounded-2xl border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold gap-2">
                      <span className="text-rose-900 dark:text-rose-300 flex items-center gap-1.5 whitespace-nowrap shrink-0">
                        <Store className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                        Capacidad ocupada
                      </span>
                      <span className="font-mono text-rose-700 dark:text-rose-400 font-bold text-xs whitespace-nowrap shrink-0">
                        {sucursalesCreadas} de {totalMaxSucursalesPlan} contratadas (100%)
                      </span>
                    </div>

                    <div className="h-2 w-full bg-rose-200/50 dark:bg-rose-900/40 rounded-full overflow-hidden p-0.5">
                      <div className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full w-full" />
                    </div>

                    <div className="flex items-center justify-between text-[10.5px] text-rose-800/80 dark:text-rose-300/80">
                      <span className="whitespace-nowrap">Estado:</span>
                      <span className="font-bold text-rose-700 dark:text-rose-400 whitespace-nowrap">
                        Tope de sucursales alcanzado
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-1 flex flex-col gap-2">
                    <a 
                      href={`https://wa.me/18299416546?text=Hola%20Klynn,%20he%20alcanzado%20el%20limite%20de%20sucursales%20en%20el%20plan%20${plan?.nombre}%20y%20me%20gustaria%20actualizar%20a%20un%20plan%20corporativo%20personalizado.`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="w-full"
                    >
                      <Button className="w-full bg-[#1B4B73] hover:bg-[#143a59] text-white font-bold h-11 rounded-xl shadow-md shadow-[#1B4B73]/20 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer transition-all active:scale-[0.98]">
                        <Crown className="h-4 w-4 text-[#F0B900]" />
                        <span>Solicitar plan corporativo</span>
                        <ExternalLink className="h-3.5 w-3.5 text-white/70 ml-1" />
                      </Button>
                    </a>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowBranchModal(false)} 
                      className="h-9 rounded-xl text-slate-600 dark:text-slate-400 font-semibold border-border hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-xs"
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>
              )}
            </div>
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
      {/* MODAL DE DETALLE DE ORDEN (TICKET, PRENDAS, DESGLOSE) */}
      <Dialog open={!!viewingOrder} onOpenChange={(o) => !o && setViewingOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[86vh] overflow-hidden rounded-3xl p-4 sm:p-5">
          {viewingOrder && (
            <OrderDetail 
              view={viewingOrder} 
              tenant={viewingOrderContext?.tenant} 
              clientes={viewingOrderContext?.clientes || []} 
              empleados={viewingOrderContext?.empleados || []}
              cambiarEstado={handleCambiarEstado} 
              setView={setViewingOrder} 
              onPrint={() => setShowPrint(viewingOrder)}
              onEdit={() => { 
                setEditingOrder(viewingOrder); 
                setEditingOrderContext(viewingOrderContext);
                setViewingOrder(null); 
              }}
              setCobrarOrden={() => {
                toast.info("Para gestionar movimientos de caja y cobros directos, accede a la sucursal.");
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL DE EDICIÓN DE ORDEN INTEGRAL */}
      {editingOrder && (
        <EditOrderDialog 
          key={editingOrder.id} 
          orden={editingOrder} 
          clientes={editingOrderContext?.clientes || []} 
          servicios={editingOrderContext?.servicios || []} 
          empleados={editingOrderContext?.empleados || []} 
          tenant={editingOrderContext?.tenant || undefined}
          onClose={() => {
            setEditingOrder(null);
            setEditingOrderContext(null);
          }}
          onSaved={handleOrderSaved}
        />
      )}

      {/* MODAL DE IMPRESIÓN DE TICKET */}
      {showPrint && (
        <TicketPrintPortal 
          orden={showPrint} 
          tenant={viewingOrderContext?.tenant || undefined} 
          clientes={viewingOrderContext?.clientes || []}
          empleados={viewingOrderContext?.empleados || []}
          onClose={() => setShowPrint(null)} 
        />
      )}
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
