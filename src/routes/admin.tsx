import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Building2, Shield, TrendingUp, Users, Trash2, ExternalLink, Plus, Pencil,
  RefreshCw, Package, LogOut, MoreHorizontal, Key, Droplets as DropletsIcon,
  CreditCard, Calendar, Layers, Laptop, ShieldCheck, Search, Filter, CheckCircle2,
  AlertCircle, Clock, MessageSquare, Truck, FileText, Zap, Crown, Rocket, Sparkles, CheckSquare, X
} from "lucide-react";
import { Logo } from "@/components/klynn/Logo";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { SeedBootstrap } from "@/components/klynn/SeedBootstrap";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getTenants,
  deleteTenant,
  getPlans,
  getOrdenes,
  formatRD,
  setActiveTenant,
  setSession,
  logout,
  savePlan,
  deletePlan,
  updateTenantAdmin,
  updateTenantPlan,
  updateTenantStatus,
  updateTenantMaxSucursales,
  updateTenantTrialHasta,
  updateTenantModulosOverride,
  getGlobalConfig,
  saveGlobalConfig,
  ADMIN_EMAILS,
  formatCedulaRD,
  getLicenciasLocales,
  createLicenciaLocal,
  updateLicenciaLocal,
  deleteLicenciaLocal,

  type Plan, type PlanId, type Tenant, type GlobalConfig, type LicenciaLocal
} from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { listAssociatedCompaniesPronesoft } from "@/lib/fiscal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Super Admin — Klynn" }] }),
  component: AdminPage,
});

function PlanBadge({ id }: { id: PlanId }) {
  const configs: Record<PlanId, { label: string; icon: any; className: string; iconColor: string }> = {
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
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full uppercase text-[10px] font-extrabold tracking-wider shadow-2xs ${config.className}`}
    >
      <Icon className={`h-3 w-3 shrink-0 ${config.iconColor}`} />
      <span>{config.label}</span>
    </Badge>
  );
}

function AdminPage() {
  const user = useRequireAuth();
  const navigate = useNavigate();

  // Validar que sea super admin
  useEffect(() => {
    if (user && user.empleado.id !== '__loading__') {
      if (!ADMIN_EMAILS.includes(user.empleado.email.toLowerCase())) {
        toast.error("No tienes permisos para acceder al panel central");
        navigate({ to: '/login' });
      }
    }
  }, [user, navigate]);

  const [tick, setTick] = useState(0);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);
  const [openBatchDeleteDialog, setOpenBatchDeleteDialog] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [totalOrdenes, setTotalOrdenes] = useState(0);
  const [ordenesByTenant, setOrdenesByTenant] = useState<Record<string, { count: number; total: number }>>({});
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({ requirePlanOnRegistration: true, trialDays: 14, defaultPlanId: 'basico' });
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [openPlan, setOpenPlan] = useState(false);
  const [openBank, setOpenBank] = useState(false);

  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>("basico");
  const [newStatus, setNewStatus] = useState<any>("ACTIVO");
  const [newMaxSucursales, setNewMaxSucursales] = useState<number>(1);
  const [newDaysLimit, setNewDaysLimit] = useState<number>(30);
  const [newMesesPagados, setNewMesesPagados] = useState<number>(1);

  const [modOverrideWa, setModOverrideWa] = useState(false);
  const [modOverrideFiscal, setModOverrideFiscal] = useState(false);
  const [modOverrideMultisucursal, setModOverrideMultisucursal] = useState(false);
  const [modOverrideLogistica, setModOverrideLogistica] = useState(false);
  const [modOverrideProcesos, setModOverrideProcesos] = useState(false);

  const [licencias, setLicencias] = useState<LicenciaLocal[]>([]);
  const [openLicenciaModal, setOpenLicenciaModal] = useState(false);
  const [editingLicencia, setEditingLicencia] = useState<LicenciaLocal | null>(null);
  const [deleteLicencia, setDeleteLicencia] = useState<LicenciaLocal | null>(null);

  const [pronesoftCompanies, setPronesoftCompanies] = useState<any[]>([]);
  const [ecfConfigsMap, setEcfConfigsMap] = useState<Record<string, any>>({});
  const [loadingPronesoft, setLoadingPronesoft] = useState(false);

  const isTenantAbandoned = (t: Tenant) => {
    const ords = ordenesByTenant[t.id]?.count || 0;
    const daysRemaining = t.trial_hasta
      ? Math.max(0, Math.ceil((new Date(t.trial_hasta).getTime() - Date.now()) / 86400000))
      : 0;
    return ords === 0 || (t.estado === "TRIAL" && daysRemaining === 0 && (ordenesByTenant[t.id]?.total || 0) === 0);
  };

  const abandonedTenants = tenants.filter(isTenantAbandoned);

  const filteredTenants = tenants.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q || 
      t.nombre.toLowerCase().includes(q) || 
      t.email?.toLowerCase().includes(q) || 
      t.telefono?.toLowerCase().includes(q) ||
      t.slug.toLowerCase().includes(q) ||
      (t.rnc && t.rnc.toLowerCase().includes(q));
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "ACTIVO" && t.estado === "ACTIVO") ||
      (statusFilter === "TRIAL" && t.estado === "TRIAL") ||
      (statusFilter === "SUSPENDIDO" && t.estado === "SUSPENDIDO") ||
      (statusFilter === "INACTIVO" && isTenantAbandoned(t));

    return matchesQuery && matchesStatus;
  });

  async function handleBatchDelete() {
    if (selectedTenantIds.length === 0) return;
    setIsDeletingBatch(true);
    try {
      for (const id of selectedTenantIds) {
        await deleteTenant(id);
      }
      toast.success(`${selectedTenantIds.length} lavanderías eliminadas correctamente.`);
      setSelectedTenantIds([]);
      setTick((t) => t + 1);
      setOpenBatchDeleteDialog(false);
    } catch (e: any) {
      toast.error("Error al eliminar lavanderías: " + e.message);
    } finally {
      setIsDeletingBatch(false);
    }
  }

  async function loadPronesoftData() {
    setLoadingPronesoft(true);
    try {
      const res = await listAssociatedCompaniesPronesoft(undefined, 'production');
      console.log("[Pronesoft API] Empresas asociadas recibidas:", res);
      const apiItems: any[] = res?.data || (Array.isArray(res) ? res : []);
      setPronesoftCompanies(apiItems);
    } catch (err: any) {
      console.warn("Aviso al cargar empresas de Pronesoft:", err.message);
      toast.error("Error al consultar Pronesoft: " + err.message);
    } finally {
      setLoadingPronesoft(false);
    }
  }

  useEffect(() => {
    async function load() {
      const [t, p, cfg, lics] = await Promise.all([getTenants(), getPlans(), getGlobalConfig(), getLicenciasLocales()]);
      setTenants(t);
      setPlans(p);
      setGlobalConfig(cfg);
      setLicencias(lics);
      loadPronesoftData(t);
      const ordsMap: Record<string, { count: number; total: number }> = {};
      let grandTotal = 0;
      for (const tenant of t) {
        const ords = await getOrdenes(tenant.id);
        const ordsArr = Array.isArray(ords) ? ords : [];
        const ingr = ordsArr.reduce((s: number, o: any) => s + (o.total || 0), 0);
        ordsMap[tenant.id] = { count: ordsArr.length, total: ingr };
        grandTotal += ordsArr.length;
      }
      setOrdenesByTenant(ordsMap);
      setTotalOrdenes(grandTotal);
    }
    load();
  }, [tick]);

  const isDemoTenant = (t: Tenant) => 
    t.slug === 'reynita' || 
    t.slug === 'demo' || 
    t.email?.toLowerCase().includes('demo@klynn') || 
    t.nombre?.toLowerCase().includes('reynita');

  function getTenantSaaSStats(t: Tenant, plansList: Plan[]) {
    const plan = plansList.find((p) => p.id === t.plan_id);
    const monthlyPrice = plan?.precio_mensual || 0;
    const isDemo = isDemoTenant(t);

    if (t.estado !== "ACTIVO" || isDemo) {
      return {
        mrr: 0,
        months: 0,
        totalEarned: 0,
        planPrice: monthlyPrice,
        isDemo
      };
    }

    const mrr = monthlyPrice;
    const startDateStr = t.plan_fecha_inicio || t.creado_en;
    let months = 1;

    // Cálculo automático de mensualidades cobradas
    if (t.nombre.toLowerCase().includes("mr lavanderia") || t.email?.toLowerCase().includes("mrgroup")) {
      const now = new Date();
      const isCyclePassed = now.getDate() >= 25;
      months = isCyclePassed ? 3 : 2;
    } else if (startDateStr) {
      const start = new Date(startDateStr);
      const now = new Date();
      const diffYears = now.getFullYear() - start.getFullYear();
      const diffMonths = now.getMonth() - start.getMonth();
      const totalMonthDiff = (diffYears * 12) + diffMonths;
      months = Math.max(1, 1 + totalMonthDiff);
    }

    return {
      mrr,
      months,
      totalEarned: months * monthlyPrice,
      planPrice: monthlyPrice,
      isDemo: false
    };
  }

  const activeTenants = tenants.filter((t) => t.estado === "ACTIVO" && !isDemoTenant(t));
  const trialTenants = tenants.filter((t) => t.estado === "TRIAL");

  // MRR Estimado: Solo lavanderías con suscripción ACTIVA reales (excluye demos)
  const mrrEstimado = activeTenants.reduce((s, t) => {
    const stats = getTenantSaaSStats(t, plans);
    return s + stats.mrr;
  }, 0);

  // Ganancias Totales SaaS acumuladas a lo largo del tiempo
  const totalSaaSGenerado = activeTenants.reduce((s, t) => {
    const stats = getTenantSaaSStats(t, plans);
    return s + stats.totalEarned;
  }, 0);

  // Total facturado por todas las lavanderías en la plataforma
  const totalFacturadoPlataforma = Object.values(ordenesByTenant).reduce((s, o) => s + (o.total || 0), 0);

  function openEditTenant(t: Tenant) {
    setEditingTenant(t);
    setNewEmail(t.email);
    setNewPassword("");
    setSelectedPlanId(t.plan_id);
    setNewStatus(t.estado);
    setNewMaxSucursales(t.max_sucursales || t.config?.max_sucursales || 1);

    const daysRemaining = t.trial_hasta
      ? Math.max(0, Math.ceil((new Date(t.trial_hasta).getTime() - Date.now()) / 86400000))
      : 0;
    setNewDaysLimit(daysRemaining || 30);

    const pOfTenant = plans.find(pl => pl.id === t.plan_id);
    setModOverrideWa(t.config?.modulos_override?.whatsapp !== undefined
      ? t.config.modulos_override.whatsapp
      : !!pOfTenant?.modulos.whatsapp);
    setModOverrideFiscal(t.config?.modulos_override?.facturacion_fiscal !== undefined
      ? t.config.modulos_override.facturacion_fiscal
      : !!pOfTenant?.modulos.facturacion_fiscal);
    setModOverrideMultisucursal(t.config?.modulos_override?.multisucursal !== undefined
      ? t.config.modulos_override.multisucursal
      : !!pOfTenant?.modulos.multisucursal);
    setModOverrideLogistica(t.config?.modulos_override?.logistica !== undefined
      ? t.config.modulos_override.logistica
      : !!pOfTenant?.modulos.logistica);
    setModOverrideProcesos(t.config?.modulos_override?.procesos !== undefined
      ? t.config.modulos_override.procesos
      : (pOfTenant?.modulos.procesos !== undefined ? !!pOfTenant.modulos.procesos : true));

    setOpenEditModal(true);
  }

  async function handleUpdateAdmin() {
    if (!editingTenant) return;
    try {
      await updateTenantAdmin(editingTenant.id, newEmail, newPassword || undefined);
      await updateTenantPlan(editingTenant.id, selectedPlanId);
      await updateTenantStatus(editingTenant.id, newStatus);
      await updateTenantMaxSucursales(editingTenant.id, newMaxSucursales);

      const trialHasta = new Date(Date.now() + newDaysLimit * 24 * 60 * 60 * 1000).toISOString();
      await updateTenantTrialHasta(editingTenant.id, trialHasta);

      // Guardar anulaciones de módulos
      await updateTenantModulosOverride(
        editingTenant.id,
        {
          whatsapp: modOverrideWa,
          facturacion_fiscal: modOverrideFiscal,
          multisucursal: modOverrideMultisucursal,
          logistica: modOverrideLogistica,
          procesos: modOverrideProcesos,
        }
      );

      toast.success("Información de lavandería actualizada");
      setOpenEditModal(false);
      setTick(t => t + 1);
    } catch (error) {
      console.error("Error updating tenant:", error);
      toast.error("Error al actualizar la lavandería");
    }
  }

  function handleLogout() {
    logout();
    window.location.assign("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <SeedBootstrap />
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge variant="outline" className="border-gold/40 bg-gold/10"><Shield className="mr-1 h-3 w-3" /> Super Admin</Badge>
          </div>
          <div className="flex items-center gap-3">
            {user?.empleado?.email && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 border border-border/60 text-xs font-medium text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="truncate max-w-[180px]">{user.empleado.email}</span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-95 shadow-sm transition-all duration-150 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5 text-white" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-display text-4xl">Panel central Klynn</h1>
        <p className="mt-1 text-muted-foreground">Administra todas las lavanderías y los planes SaaS.</p>

        <div className="mt-5 sm:mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KPI 
            title="MRR Estimado" 
            value={formatRD(mrrEstimado)} 
            sub={`${activeTenants.length} ${activeTenants.length === 1 ? 'lavandería activa' : 'lavanderías activas'}`} 
            icon={TrendingUp} 
            variant="primary" 
          />
          <KPI 
            title="Ganancias SaaS" 
            value={formatRD(totalSaaSGenerado)} 
            sub="Cobrado acumulado" 
            icon={CreditCard} 
            variant="emerald" 
          />
          <KPI 
            title="Lavanderías" 
            value={`${activeTenants.length} / ${tenants.length}`} 
            sub={`${activeTenants.length} Activas • ${trialTenants.length} Pruebas`} 
            icon={Building2} 
            variant="amber" 
          />
          <KPI 
            title="Órdenes Totales" 
            value={totalOrdenes.toLocaleString("es-DO")} 
            sub={
              <span>
                Facturación: <strong className="font-black text-indigo-950 dark:text-indigo-100">{formatRD(totalFacturadoPlataforma)}</strong>
              </span>
            } 
            icon={Package} 
            variant="indigo" 
          />
        </div>

        <Tabs defaultValue="tenants" className="mt-6 sm:mt-8">
          <TabsList className="flex items-center gap-2 sm:gap-3 bg-transparent p-0 border-none h-auto w-full justify-start overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none flex-nowrap sm:flex-wrap">
            <TabsTrigger 
              value="tenants"
              className="flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-surface border border-border/80 text-foreground shadow-sm data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-md transition-all hover:bg-muted/60 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Building2 className="h-4 w-4 shrink-0" />
              <span>Lavanderías</span>
            </TabsTrigger>

            <TabsTrigger 
              value="plans"
              className="flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-surface border border-border/80 text-foreground shadow-sm data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-md transition-all hover:bg-muted/60 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Layers className="h-4 w-4 shrink-0" />
              <span>Planes SaaS</span>
            </TabsTrigger>

            <TabsTrigger 
              value="licencias"
              className="flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-surface border border-border/80 text-foreground shadow-sm data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-md transition-all hover:bg-muted/60 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Laptop className="h-4 w-4 shrink-0" />
              <span>Licencias Desktop</span>
            </TabsTrigger>

            <TabsTrigger 
              value="fiscal-companies"
              className="flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-surface border border-border/80 text-foreground shadow-sm data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-md transition-all hover:bg-muted/60 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Empresas Fiscales (Pronesoft)</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tenants" className="space-y-4 mt-6">
            {/* Barra superior de herramientas y filtros */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-surface p-3.5 sm:p-4 rounded-2xl border border-border/50 shadow-xs">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, correo, RNC o slug..."
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
                    Todas ({tenants.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("ACTIVO")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${statusFilter === "ACTIVO" ? "bg-emerald-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Activas ({tenants.filter(t => t.estado === "ACTIVO").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("TRIAL")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${statusFilter === "TRIAL" ? "bg-amber-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Pruebas ({tenants.filter(t => t.estado === "TRIAL").length})
                  </button>
                </div>
              </div>
            </div>

            {selectedTenantIds.length > 0 && (() => {
              const singleTenant = selectedTenantIds.length === 1 ? tenants.find(t => t.id === selectedTenantIds[0]) : null;

              return (
                <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-3.5 sm:px-5 rounded-2xl bg-gradient-to-r from-blue-100/95 via-sky-50 to-indigo-100/95 dark:from-slate-850 dark:via-blue-950/70 dark:to-slate-900 border-2 border-blue-300 dark:border-blue-700/80 shadow-md animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse shrink-0 ring-4 ring-blue-500/20" />
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {singleTenant ? (
                        <span>Lavandería seleccionada: <strong className="text-blue-700 dark:text-blue-300 font-black">{singleTenant.nombre}</strong></span>
                      ) : (
                        <span><strong className="text-blue-700 dark:text-blue-300">{selectedTenantIds.length}</strong> lavanderías seleccionadas</span>
                      )}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button 
                      size="sm" 
                      onClick={() => setSelectedTenantIds([])}
                      className="h-8.5 px-3.5 rounded-xl font-bold text-xs bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 shadow-2xs gap-1.5 cursor-pointer transition-all"
                    >
                      <X className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                      <span>Desmarcar</span>
                    </Button>

                    {singleTenant && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSession({ empleado_id: 'admin', tenant_id: singleTenant.id, iniciado_en: new Date().toISOString() });
                            setActiveTenant(singleTenant.slug);
                            toast.success(`Entrando a ${singleTenant.nombre}...`);
                            setTimeout(() => window.location.assign(`/t/${singleTenant.slug}`), 500);
                          }}
                          className="h-8.5 px-3.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border border-emerald-500/80 shadow-xs gap-1.5 cursor-pointer transition-all"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>Visitar lavandería</span>
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => openEditTenant(singleTenant)}
                          className="h-8.5 px-3.5 rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-100/90 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-200/90 dark:hover:bg-blue-900/60 font-bold text-xs gap-1.5 shadow-2xs cursor-pointer transition-all"
                        >
                          <Pencil className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Editar configuración</span>
                        </Button>
                      </>
                    )}

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (singleTenant) {
                          setTenantToDelete(singleTenant);
                        } else {
                          setOpenBatchDeleteDialog(true);
                        }
                      }}
                      className="h-8.5 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>{singleTenant ? 'Eliminar lavandería' : `Eliminar Selección (${selectedTenantIds.length})`}</span>
                    </Button>
                  </div>
                </div>
              );
            })()}

            {/* VISTA ESCRITORIO (Tabla completa) */}
            <Card className="hidden md:block overflow-hidden border border-border/60 shadow-card rounded-2xl bg-surface">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="relative z-10 text-[11px] uppercase tracking-wider font-black shadow-[0_4px_12px_-2px_rgba(0,0,0,0.06)] border-b border-border/80">
                    <tr>
                      <th className="px-4 py-3.5 text-center whitespace-nowrap bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200/70 dark:from-slate-800 dark:via-slate-800 dark:to-slate-850 text-slate-800 dark:text-slate-200">
                        Lavandería / Marca
                      </th>
                      <th className="px-3 py-3.5 text-center whitespace-nowrap bg-gradient-to-b from-blue-50 via-blue-100/90 to-blue-200/60 dark:from-blue-950/70 dark:via-blue-950/90 dark:to-blue-900/60 text-blue-950 dark:text-blue-200 border-x border-blue-200/50 dark:border-blue-800/40">
                        Plan SaaS
                      </th>
                      <th className="px-3 py-3.5 text-center whitespace-nowrap bg-gradient-to-b from-emerald-50 via-emerald-100/90 to-emerald-200/60 dark:from-emerald-950/70 dark:via-emerald-950/90 dark:to-emerald-900/60 text-emerald-950 dark:text-emerald-200 border-r border-emerald-200/50 dark:border-emerald-800/40">
                        Estado
                      </th>
                      <th className="px-3 py-3.5 text-center whitespace-nowrap bg-gradient-to-b from-purple-50 via-purple-100/90 to-purple-200/60 dark:from-purple-950/70 dark:via-purple-950/90 dark:to-purple-900/60 text-purple-950 dark:text-purple-200 border-r border-purple-200/50 dark:border-purple-800/40">
                        Módulos Habilitados
                      </th>
                      <th className="px-3 py-3.5 text-center whitespace-nowrap bg-gradient-to-b from-cyan-50 via-cyan-100/90 to-cyan-200/60 dark:from-cyan-950/70 dark:via-cyan-950/90 dark:to-cyan-900/60 text-cyan-950 dark:text-cyan-200 border-r border-cyan-200/50 dark:border-cyan-800/40">
                        Órdenes
                      </th>
                      <th className="px-3 py-3.5 text-center whitespace-nowrap bg-gradient-to-b from-amber-50 via-amber-100/90 to-amber-200/60 dark:from-amber-950/70 dark:via-amber-950/90 dark:to-amber-900/60 text-amber-950 dark:text-amber-200 border-r border-amber-200/50 dark:border-amber-800/40">
                        Facturación
                      </th>
                      <th className="px-4 py-3.5 text-center whitespace-nowrap bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200/70 dark:from-slate-800 dark:via-slate-800 dark:to-slate-850 text-slate-800 dark:text-slate-200">
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
                        const tenantOrds = ordenesByTenant[t.id] || { count: 0, total: 0 };
                        const planOfTenant = plans.find(p => p.id === t.plan_id);
                        const saasStats = getTenantSaaSStats(t, plans);
                        
                        const hasWa = t.config?.modulos_override?.whatsapp !== undefined 
                          ? t.config.modulos_override.whatsapp 
                          : !!planOfTenant?.modulos.whatsapp;
                        const hasFiscal = t.config?.modulos_override?.facturacion_fiscal !== undefined 
                          ? t.config.modulos_override.facturacion_fiscal 
                          : !!planOfTenant?.modulos.facturacion_fiscal;
                        const hasSucursales = t.config?.modulos_override?.multisucursal !== undefined 
                          ? t.config.modulos_override.multisucursal 
                          : ((t.max_sucursales || 1) > 1 || !!planOfTenant?.modulos.multisucursal);
                        const hasLogistica = t.config?.modulos_override?.logistica !== undefined 
                          ? t.config.modulos_override.logistica 
                          : !!planOfTenant?.modulos.logistica;
                        const hasProcesos = t.config?.modulos_override?.procesos !== undefined 
                          ? t.config.modulos_override.procesos 
                          : (planOfTenant?.modulos.procesos !== undefined ? !!planOfTenant.modulos.procesos : true);

                        const daysRemaining = t.trial_hasta
                          ? Math.max(0, Math.ceil((new Date(t.trial_hasta).getTime() - Date.now()) / 86400000))
                          : 0;
                        
                        const isSelected = selectedTenantIds.includes(t.id);

                        return (
                          <tr 
                            key={t.id} 
                            onClick={() => {
                              setSelectedTenantIds(selectedTenantIds.includes(t.id) ? [] : [t.id]);
                            }}
                            className={`cursor-pointer transition-all duration-150 group border-b border-border/40 ${
                              isSelected 
                                ? 'bg-primary/[0.08] dark:bg-primary/[0.18] ring-1 ring-inset ring-primary/30 shadow-xs' 
                                : 'hover:bg-muted/30'
                            }`}
                          >
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                {t.logo_url ? (
                                  <img
                                    src={t.logo_url}
                                    alt={t.nombre}
                                    className="h-12 w-12 rounded-full object-contain border-2 border-border/70 bg-white p-1 shrink-0 shadow-xs ring-2 ring-primary/10"
                                  />
                                ) : (
                                  <div
                                    className="h-12 w-12 rounded-full flex items-center justify-center font-black text-white text-base shrink-0 shadow-xs ring-2 ring-black/10 dark:ring-white/10"
                                    style={{ backgroundColor: t.color_primario || "#0891b2" }}
                                  >
                                    {t.nombre.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="font-bold text-foreground text-sm tracking-tight hover:text-primary transition-colors flex items-center gap-1.5">
                                    <span className="truncate">{t.nombre}</span>
                                    {isSelected && (
                                      <span className="h-2 w-2 rounded-full bg-primary shrink-0 animate-pulse" />
                                    )}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground mt-0.5 space-y-0.5">
                                    <div className="truncate">
                                      <span className="font-medium text-foreground/80">Correo:</span> {t.email || "Sin correo"}
                                    </div>
                                    <div className="truncate">
                                      <span className="font-medium text-foreground/80">Teléfono:</span> {t.telefono || "Sin teléfono"}
                                    </div>
                                    <div className="flex items-center gap-1.5 pt-0.5">
                                      <span className="font-medium text-foreground/80">RNC:</span>
                                      {t.rnc ? (
                                        <Badge className="bg-primary hover:bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0 rounded-md border-none shadow-2xs">
                                          {t.rnc}
                                        </Badge>
                                      ) : (
                                        <span className="italic text-muted-foreground/60 text-[10.5px]">Sin RNC</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-3 py-3 text-center whitespace-nowrap bg-blue-500/[0.015] border-r border-border/20">
                              {t.plan_id === 'basico' && (
                                <Badge className="bg-sky-50 text-sky-700 hover:bg-sky-50 border-sky-200 text-[10.5px] font-black uppercase px-2.5 py-0.5 rounded-full gap-1 shadow-2xs">
                                  <Zap className="h-3 w-3 text-sky-600" /> Básico
                                </Badge>
                              )}
                              {t.plan_id === 'pro' && (
                                <Badge className="bg-purple-50 text-purple-700 hover:bg-purple-50 border-purple-200 text-[10.5px] font-black uppercase px-2.5 py-0.5 rounded-full gap-1 shadow-2xs">
                                  <Crown className="h-3 w-3 text-purple-600" /> Pro
                                </Badge>
                              )}
                              {t.plan_id === 'enterprise' && (
                                <Badge className="bg-amber-50 text-amber-800 hover:bg-amber-50 border-amber-300 text-[10.5px] font-black uppercase px-2.5 py-0.5 rounded-full gap-1 shadow-2xs">
                                  <Rocket className="h-3 w-3 text-amber-600" /> Enterprise
                                </Badge>
                              )}
                              {t.plan_id !== 'basico' && t.plan_id !== 'pro' && t.plan_id !== 'enterprise' && (
                                <Badge variant="outline" className="text-[10px] font-bold uppercase">{t.plan_id}</Badge>
                              )}
                            </td>

                            <td className="px-3 py-3 text-center whitespace-nowrap bg-emerald-500/[0.015] border-r border-border/20">
                              {t.estado === "ACTIVO" ? (
                                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full gap-1.5 shadow-2xs">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Activo
                                </Badge>
                              ) : t.estado === "TRIAL" ? (
                                <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full gap-1.5 shadow-2xs">
                                  <Clock className="h-3 w-3 text-amber-600" /> Prueba ({daysRemaining}d)
                                </Badge>
                              ) : (
                                <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border-rose-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full gap-1.5 shadow-2xs">
                                  <AlertCircle className="h-3 w-3 text-rose-600" /> Suspendido
                                </Badge>
                              )}
                            </td>

                            <td className="px-3 py-3 text-center whitespace-nowrap bg-purple-500/[0.015] border-r border-border/20">
                              <div className="flex items-center justify-center gap-1">
                                <span
                                  title={hasWa ? "WhatsApp Cloud: Habilitado" : "WhatsApp: Inactivo"}
                                  className={`p-1.5 rounded-lg transition-all ${
                                    hasWa
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700 shadow-2xs"
                                      : "bg-muted/30 text-muted-foreground/30 border border-transparent opacity-30"
                                  }`}
                                >
                                  <MessageSquare className="h-3.5 w-3.5" />
                                </span>
                                <span
                                  title={hasFiscal ? "Facturación Fiscal (e-CF): Habilitada" : "Facturación Fiscal: Inactiva"}
                                  className={`p-1.5 rounded-lg transition-all ${
                                    hasFiscal
                                      ? "bg-blue-50 text-blue-700 border border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-700 shadow-2xs"
                                      : "bg-muted/30 text-muted-foreground/30 border border-transparent opacity-30"
                                  }`}
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                </span>
                                <span
                                  title={hasSucursales ? "Sucursales Múltiples: Habilitadas" : "Sucursales: Inactivas"}
                                  className={`p-1.5 rounded-lg transition-all ${
                                    hasSucursales
                                      ? "bg-purple-50 text-purple-700 border border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-700 shadow-2xs"
                                      : "bg-muted/30 text-muted-foreground/30 border border-transparent opacity-30"
                                  }`}
                                >
                                  <Building2 className="h-3.5 w-3.5" />
                                </span>
                                <span
                                  title={hasLogistica ? "Logística y Repartidores: Habilitada" : "Logística: Inactiva"}
                                  className={`p-1.5 rounded-lg transition-all ${
                                    hasLogistica
                                      ? "bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700 shadow-2xs"
                                      : "bg-muted/30 text-muted-foreground/30 border border-transparent opacity-30"
                                  }`}
                                >
                                  <Truck className="h-3.5 w-3.5" />
                                </span>
                                <span
                                  title={hasProcesos ? "Control de Producción/Procesos: Habilitado" : "Procesos: Inactivo"}
                                  className={`p-1.5 rounded-lg transition-all ${
                                    hasProcesos
                                      ? "bg-teal-50 text-teal-700 border border-teal-300 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-700 shadow-2xs"
                                      : "bg-muted/30 text-muted-foreground/30 border border-transparent opacity-30"
                                  }`}
                                >
                                  <Layers className="h-3.5 w-3.5" />
                                </span>
                              </div>
                            </td>

                            <td className="px-3 py-3 text-center whitespace-nowrap bg-cyan-500/[0.015] border-r border-border/20">
                              <span className="font-bold text-foreground bg-muted/70 px-2.5 py-0.5 rounded-md border border-border/50 text-xs">
                                {tenantOrds.count}
                              </span>
                            </td>

                            <td className="px-3 py-3 text-center whitespace-nowrap bg-amber-500/[0.015] border-r border-border/20">
                              <div className="font-bold text-foreground text-sm tracking-tight" title="Total procesado en órdenes por esta lavandería">
                                {formatRD(tenantOrds.total)}
                              </div>
                              {saasStats.isDemo ? (
                                <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700 shadow-2xs">
                                  Demo Propia (RD$0)
                                </div>
                              ) : t.estado === "ACTIVO" && saasStats.totalEarned > 0 ? (
                                <div 
                                  className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10.5px] font-bold border border-emerald-200/70 dark:border-emerald-800 shadow-2xs" 
                                  title={`Plan SaaS: ${saasStats.months} ${saasStats.months === 1 ? 'mes cobrado' : 'meses cobrados'} (${formatRD(saasStats.planPrice)}/mes)`}
                                >
                                  <span>SaaS: {formatRD(saasStats.totalEarned)}</span>
                                  <span className="text-[9.5px] font-semibold text-emerald-600/80 dark:text-emerald-400/80">({saasStats.months}m)</span>
                                </div>
                              ) : (
                                <div className="mt-1 text-[10px] text-muted-foreground/60 font-medium italic">
                                  Prueba (RD$0)
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7.5 px-2.5 rounded-lg gap-1 font-bold text-xs bg-background hover:bg-primary hover:text-white border-border/80 shadow-2xs transition-all cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSession({ empleado_id: 'admin', tenant_id: t.id, iniciado_en: new Date().toISOString() });
                                    setActiveTenant(t.slug);
                                    toast.success(`Entrando a ${t.nombre}...`);
                                    setTimeout(() => window.location.assign(`/t/${t.slug}`), 500);
                                  }}
                                  title="Entrar a la sucursal"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  <span>Entrar</span>
                                </Button>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button size="icon" variant="ghost" className="h-7.5 w-7.5 rounded-lg hover:bg-muted cursor-pointer">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-2xl border border-border/80 p-0 overflow-hidden bg-surface">
                                    <div className="bg-gradient-to-r from-slate-100 via-slate-200/80 to-slate-100 dark:from-slate-800 dark:via-slate-850 dark:to-slate-850 border-b border-border/70 px-3.5 py-2 flex items-center justify-between">
                                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">Opciones de Lavandería</span>
                                    </div>
                                    <div className="p-1.5 space-y-1">
                                      <DropdownMenuItem
                                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-foreground hover:bg-primary/10 hover:text-primary transition-all cursor-pointer"
                                        onClick={() => openEditTenant(t)}
                                      >
                                        <div className="h-6 w-6 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
                                          <Pencil className="h-3.5 w-3.5" />
                                        </div>
                                        <span>Editar configuración</span>
                                      </DropdownMenuItem>

                                      <div className="border-t border-border/50 my-1" />

                                      <DropdownMenuItem
                                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 transition-all cursor-pointer w-full text-left"
                                        onClick={() => setTenantToDelete(t)}
                                      >
                                        <div className="h-6 w-6 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-2xs">
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </div>
                                        <span>Eliminar lavandería</span>
                                      </DropdownMenuItem>
                                    </div>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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

            {/* VISTA MÓVIL (Tarjetas estilizadas y táctiles) */}
            <div className="block md:hidden space-y-3">
              {filteredTenants.length === 0 ? (
                <Card className="p-8 text-center bg-surface border border-border/60 rounded-2xl">
                  <Building2 className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm font-semibold text-foreground">No se encontraron lavanderías</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Prueba a cambiar el filtro o la búsqueda.</p>
                </Card>
              ) : (
                filteredTenants.map((t) => {
                  const tenantOrds = ordenesByTenant[t.id] || { count: 0, total: 0 };
                  const planOfTenant = plans.find(p => p.id === t.plan_id);
                  const saasStats = getTenantSaaSStats(t, plans);
                  
                  const hasWa = t.config?.modulos_override?.whatsapp !== undefined ? t.config.modulos_override.whatsapp : !!planOfTenant?.modulos.whatsapp;
                  const hasFiscal = t.config?.modulos_override?.facturacion_fiscal !== undefined ? t.config.modulos_override.facturacion_fiscal : !!planOfTenant?.modulos.facturacion_fiscal;
                  const hasSucursales = t.config?.modulos_override?.multisucursal !== undefined ? t.config.modulos_override.multisucursal : ((t.max_sucursales || 1) > 1 || !!planOfTenant?.modulos.multisucursal);
                  const hasLogistica = t.config?.modulos_override?.logistica !== undefined ? t.config.modulos_override.logistica : !!planOfTenant?.modulos.logistica;
                  const hasProcesos = t.config?.modulos_override?.procesos !== undefined ? t.config.modulos_override.procesos : (planOfTenant?.modulos.procesos !== undefined ? !!planOfTenant.modulos.procesos : true);

                  const daysRemaining = t.trial_hasta
                    ? Math.max(0, Math.ceil((new Date(t.trial_hasta).getTime() - Date.now()) / 86400000))
                    : 0;
                  
                  const isSelected = selectedTenantIds.includes(t.id);

                  return (
                    <Card
                      key={t.id}
                      onClick={() => setSelectedTenantIds(selectedTenantIds.includes(t.id) ? [] : [t.id])}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-primary/[0.08] dark:bg-primary/[0.18] border-primary/40 ring-2 ring-primary/30 shadow-md' 
                          : 'bg-surface border-border/70 hover:border-primary/30 shadow-xs'
                      }`}
                    >
                      {/* Cabecera: Logo + Info Principal + Estado */}
                      <div className="flex items-start gap-3">
                        {t.logo_url ? (
                          <img
                            src={t.logo_url}
                            alt={t.nombre}
                            className="h-12 w-12 rounded-full object-contain border-2 border-border/70 bg-white p-1 shrink-0 shadow-xs ring-2 ring-primary/10"
                          />
                        ) : (
                          <div
                            className="h-12 w-12 rounded-full flex items-center justify-center font-black text-white text-base shrink-0 shadow-xs ring-2 ring-black/10 dark:ring-white/10"
                            style={{ backgroundColor: t.color_primario || "#0891b2" }}
                          >
                            {t.nombre.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <h3 className="font-bold text-foreground text-sm tracking-tight truncate flex items-center gap-1.5">
                              <span>{t.nombre}</span>
                              {isSelected && <span className="h-2 w-2 rounded-full bg-primary shrink-0 animate-pulse" />}
                            </h3>
                            {t.estado === "ACTIVO" ? (
                              <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                                Activo
                              </Badge>
                            ) : t.estado === "TRIAL" ? (
                              <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                                Prueba ({daysRemaining}d)
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                                Suspendido
                              </Badge>
                            )}
                          </div>

                          <div className="text-[11px] text-muted-foreground mt-0.5 space-y-0.5">
                            <div className="truncate"><span className="font-medium text-foreground/80">Correo:</span> {t.email || "Sin correo"}</div>
                            <div className="truncate"><span className="font-medium text-foreground/80">Teléfono:</span> {t.telefono || "Sin teléfono"}</div>
                            {t.rnc && (
                              <div className="flex items-center gap-1 pt-0.5">
                                <span className="font-medium text-foreground/80">RNC:</span>
                                <Badge className="bg-primary text-primary-foreground text-[9.5px] font-bold px-1.5 py-0 rounded-md border-none">{t.rnc}</Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Métricas y Plan */}
                      <div className="mt-3 pt-2.5 border-t border-border/50 grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-blue-500/[0.04] p-2.5 rounded-xl border border-blue-500/10">
                          <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 block mb-1">Plan & Módulos</span>
                          <div className="flex items-center gap-1 flex-wrap">
                            {t.plan_id === 'basico' && <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-black uppercase px-2 py-0"><Zap className="h-2.5 w-2.5 mr-0.5" /> Básico</Badge>}
                            {t.plan_id === 'pro' && <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-black uppercase px-2 py-0"><Crown className="h-2.5 w-2.5 mr-0.5" /> Pro</Badge>}
                            {t.plan_id === 'enterprise' && <Badge className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-black uppercase px-2 py-0"><Rocket className="h-2.5 w-2.5 mr-0.5" /> Enterprise</Badge>}
                            {t.plan_id !== 'basico' && t.plan_id !== 'pro' && t.plan_id !== 'enterprise' && <Badge variant="outline" className="text-[9.5px] font-bold">{t.plan_id}</Badge>}
                          </div>
                          <div className="flex items-center gap-1 mt-1.5">
                            <span className={`p-1 rounded ${hasWa ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60' : 'text-muted-foreground/30 opacity-40'}`}><MessageSquare className="h-3 w-3" /></span>
                            <span className={`p-1 rounded ${hasFiscal ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/60' : 'text-muted-foreground/30 opacity-40'}`}><FileText className="h-3 w-3" /></span>
                            <span className={`p-1 rounded ${hasSucursales ? 'text-purple-600 bg-purple-50 dark:bg-purple-950/60' : 'text-muted-foreground/30 opacity-40'}`}><Building2 className="h-3 w-3" /></span>
                            <span className={`p-1 rounded ${hasLogistica ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/60' : 'text-muted-foreground/30 opacity-40'}`}><Truck className="h-3 w-3" /></span>
                            <span className={`p-1 rounded ${hasProcesos ? 'text-teal-600 bg-teal-50 dark:bg-teal-950/60' : 'text-muted-foreground/30 opacity-40'}`}><Layers className="h-3 w-3" /></span>
                          </div>
                        </div>

                        <div className="bg-amber-500/[0.04] p-2.5 rounded-xl border border-amber-500/10 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 block mb-0.5">Facturación</span>
                            <div className="font-bold text-foreground text-xs">{formatRD(tenantOrds.total)} ({tenantOrds.count} ord)</div>
                          </div>
                          <div className="mt-1">
                            {saasStats.isDemo ? (
                              <span className="inline-block text-[9.5px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Demo (RD$0)</span>
                            ) : t.estado === "ACTIVO" && saasStats.totalEarned > 0 ? (
                              <span className="inline-block text-[9.5px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">SaaS: {formatRD(saasStats.totalEarned)} ({saasStats.months}m)</span>
                            ) : (
                              <span className="text-[9.5px] text-muted-foreground/60 italic">Prueba (RD$0)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Botones de acción móvil */}
                      <div className="mt-3 pt-2.5 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSession({ empleado_id: 'admin', tenant_id: t.id, iniciado_en: new Date().toISOString() });
                            setActiveTenant(t.slug);
                            toast.success(`Entrando a ${t.nombre}...`);
                            setTimeout(() => window.location.assign(`/t/${t.slug}`), 500);
                          }}
                          className="flex-1 h-8 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>Entrar</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditTenant(t);
                          }}
                          className="h-8 px-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold text-xs gap-1 cursor-pointer shadow-2xs"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Editar</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTenantToDelete(t);
                          }}
                          className="h-8 w-8 p-0 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>

            <AlertDialog open={!!tenantToDelete} onOpenChange={(open) => !open && setTenantToDelete(null)}>
              <AlertDialogContent className="rounded-2xl border border-border/80 shadow-2xl max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-rose-600 flex items-center gap-2 text-lg">
                    <Trash2 className="h-5 w-5" />
                    ¿Eliminar {tenantToDelete?.nombre}?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3 pt-2 text-sm">
                    <p>
                      Esta acción eliminará <strong>permanentemente</strong> la lavandería <span className="font-bold text-foreground">{tenantToDelete?.nombre}</span> y todos sus datos en Supabase (clientes, órdenes, configuración, usuarios de acceso y archivos).
                    </p>
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 font-medium">
                      ⚠️ Esta operación no se puede deshacer.
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4">
                  <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async (e) => {
                      e.preventDefault();
                      if (!tenantToDelete) return;
                      try {
                        toast.loading(`Eliminando ${tenantToDelete.nombre}...`, { id: "delete-tenant" });
                        await deleteTenant(tenantToDelete.id);
                        setTick((r) => r + 1);
                        toast.success(`Lavandería ${tenantToDelete.nombre} eliminada correctamente.`, { id: "delete-tenant" });
                      } catch (err: any) {
                        toast.error(`Error al eliminar: ${err.message}`, { id: "delete-tenant" });
                      } finally {
                        setTenantToDelete(null);
                      }
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Sí, Eliminar Definitivamente</span>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Modal de confirmación para eliminación masiva */}
            <AlertDialog open={openBatchDeleteDialog} onOpenChange={setOpenBatchDeleteDialog}>
              <AlertDialogContent className="rounded-2xl border border-border/80 shadow-2xl max-w-lg">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-rose-600 flex items-center gap-2 text-lg">
                    <Trash2 className="h-5 w-5" />
                    ¿Eliminar {selectedTenantIds.length} lavanderías de la base de datos?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3 pt-2 text-sm">
                    <p>
                      Estás a punto de eliminar definitivamente <strong>{selectedTenantIds.length} lavanderías</strong>. Esta acción borrará permanentemente sus clientes, órdenes, configuración, usuarios de acceso y archivos en la nube.
                    </p>
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-border/60 bg-muted/40 p-2.5 space-y-1.5">
                      {tenants.filter(t => selectedTenantIds.includes(t.id)).map(t => {
                        const ords = ordenesByTenant[t.id]?.count || 0;
                        return (
                          <div key={t.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-surface border border-border/40">
                            <span className="font-bold text-foreground truncate max-w-[200px]">{t.nombre}</span>
                            <span className="text-muted-foreground text-[11px]">{ords} órdenes • {t.email || "Sin correo"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4">
                  <AlertDialogCancel disabled={isDeletingBatch} className="rounded-xl">Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isDeletingBatch}
                    onClick={(e) => {
                      e.preventDefault();
                      handleBatchDelete();
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold gap-1.5"
                  >
                    {isDeletingBatch ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Eliminando...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        <span>Confirmar y Eliminar ({selectedTenantIds.length})</span>
                      </>
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          <TabsContent value="plans">
            <div className="mb-6 rounded-2xl border border-border/50 bg-surface p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-lg">Configuración de Registro</h3>
                  <p className="text-sm text-muted-foreground">Controla cómo se registran las nuevas lavanderías.</p>
                </div>
                <div className="flex flex-wrap items-center gap-4 md:gap-6">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Días de prueba</Label>
                    <Input
                      type="number"
                      className="w-16 h-9 rounded-lg"
                      value={globalConfig.trialDays}
                      onChange={(e) => setGlobalConfig({ ...globalConfig, trialDays: Number(e.target.value) })}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground whitespace-nowrap">Solicitar plan al registro</Label>
                    <Switch
                      checked={globalConfig.requirePlanOnRegistration}
                      onCheckedChange={(v) => setGlobalConfig({ ...globalConfig, requirePlanOnRegistration: v })}
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={async () => {
                      await saveGlobalConfig(globalConfig);
                      toast.success("Configuración guardada");
                    }}
                    className="h-9 px-4 rounded-lg shadow-md font-bold"
                  >
                    Guardar cambios
                  </Button>
                </div>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{plans.length} planes configurados</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOpenBank(true)} className="rounded-lg h-9 px-5 border-primary/20 text-primary hover:bg-primary/5">
                  <CreditCard className="mr-1.5 h-4 w-4" /> Metodos de Pago
                </Button>
                <Button onClick={() => { setEditingPlan(null); setOpenPlan(true); }} className="bg-gradient-primary text-white rounded-lg shadow-md h-9 px-5">
                  <Plus className="mr-1.5 h-4 w-4" /> Nuevo plan
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((p) => (
                <Card key={p.id} className={`border-none p-6 shadow-card ${p.destacado ? "ring-2 ring-primary" : ""}`}>
                  <div className="flex items-start justify-between">
                    <span className="font-display text-2xl">{p.nombre}</span>
                    {p.destacado && <Badge>Popular</Badge>}
                  </div>
                  <div className="mt-2 font-display text-3xl text-primary">{formatRD(p.precio_mensual)}<span className="text-sm font-normal text-muted-foreground">/mes</span></div>
                  {p.precio_anual && (
                    <div className="text-xs text-muted-foreground font-medium">o {formatRD(p.precio_anual)}/año</div>
                  )}
                  <div className="mt-4 space-y-2 text-sm">
                    <div>👥 {p.limite_empleados} Empleados</div>
                    <div>📦 {p.limite_ordenes_mes ?? "∞"} Órdenes/mes</div>
                    {p.modulos?.whatsapp && (
                      <div className="text-blue-600 font-medium">💬 {(p.limite_whatsapp_mes || 0).toLocaleString()} Mensajes WhatsApp</div>
                    )}
                    <div className="border-t border-border pt-2.5 mt-2.5 text-left">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Módulos Habilitados
                      </div>
                      <div className="space-y-1.5">
                        {[
                          { key: "whatsapp", label: "Mensajería WhatsApp" },
                          { key: "facturacion_fiscal", label: "Facturación Electrónica" },
                          { key: "multisucursal", label: "Multisucursal" },
                          { key: "logistica", label: "Envío a domicilio" },
                          { key: "procesos", label: "Tablero de Procesos" },
                        ].map(({ key, label }) => {
                          const v = !!p.modulos?.[key as keyof typeof p.modulos];
                          return (
                            <div 
                              key={key} 
                              className={`flex items-center gap-2 text-xs font-semibold ${
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
                              <span>{label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditingPlan(p); setOpenPlan(true); }}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={async () => {
                      if (confirm(`¿Eliminar plan ${p.nombre}?`)) {
                        await deletePlan(p.id);
                        setTick((r) => r + 1);
                      }
                    }}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="licencias">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl">Licencias de Software</h2>
                <p className="text-sm text-muted-foreground">Genera y controla el acceso a las instalaciones de Klynn Local.</p>
              </div>
              <Button onClick={() => { setEditingLicencia(null); setOpenLicenciaModal(true); }} className="bg-gradient-primary text-white rounded-lg shadow-md h-9 px-5">
                <Plus className="mr-1.5 h-4 w-4" /> Nueva Licencia
              </Button>
            </div>

            <Card className="overflow-hidden border-none shadow-card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-elevated text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-6 py-4 text-left font-bold">Código / Lavandería</th>
                      <th className="px-6 py-4 text-center font-bold">Estado</th>
                      <th className="px-6 py-4 text-center font-bold">WhatsApp</th>
                      <th className="px-6 py-4 text-center font-bold">Facturación</th>
                      <th className="px-6 py-4 text-center font-bold">Vencimiento</th>
                      <th className="px-6 py-4 text-center font-bold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {licencias.map((l) => (
                      <tr key={l.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-mono text-sm font-bold text-primary tracking-wider">{l.codigo}</div>
                          <div className="text-xs font-semibold text-foreground mt-0.5">{l.nombre_lavanderia}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant={l.estado === "ACTIVO" ? "success" : "outline"} className={l.estado === "INACTIVO" ? "bg-muted text-muted-foreground" : ""}>
                            {l.estado}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Switch
                            checked={l.whatsapp_activo}
                            onCheckedChange={async (v) => {
                              await updateLicenciaLocal(l.id, { whatsapp_activo: v });
                              setTick(t => t + 1);
                              toast.success("WhatsApp actualizado");
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Switch
                            checked={l.facturacion_activa}
                            onCheckedChange={async (v) => {
                              await updateLicenciaLocal(l.id, { facturacion_activa: v });
                              setTick(t => t + 1);
                              toast.success("Facturación actualizada");
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 text-center text-xs">
                          {l.es_anual && l.expira_en ? new Date(l.expira_en).toLocaleDateString("es-DO") : "Permanente"}
                        </td>
                        <td className="px-6 py-4 text-center flex justify-center gap-2">
                          <Button size="icon" variant="ghost" onClick={() => { setEditingLicencia(l); setOpenLicenciaModal(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeleteLicencia(l)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {licencias.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-muted-foreground font-medium">No se encontraron licencias creadas</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="fiscal-companies">
            <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-600" /> Empresas Fiscales Asociadas (Pronesoft / DGII)
                </h2>
                <p className="text-sm text-muted-foreground">
                  Directorio maestro de lavanderías registradas como empresas emisoras e-CF en la API de Pronesoft.
                </p>
              </div>
              <Button 
                onClick={loadPronesoftData} 
                disabled={loadingPronesoft}
                variant="outline"
                className="h-9 px-4 rounded-xl font-bold border-primary/20 text-primary hover:bg-primary/5 gap-1.5 shrink-0"
              >
                <RefreshCw className={`h-4 w-4 ${loadingPronesoft ? "animate-spin" : ""}`} /> 
                {loadingPronesoft ? "Cargando..." : "Refrescar Pronesoft"}
              </Button>
            </div>

            <Card className="overflow-hidden border-none shadow-card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-elevated text-xs uppercase text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-6 py-4 text-left font-bold">Empresa / Razón Social</th>
                      <th className="px-6 py-4 text-center font-bold">RNC / Cédula</th>
                      <th className="px-6 py-4 text-center font-bold">Pronesoft Tenant ID</th>
                      <th className="px-6 py-4 text-center font-bold">Ambiente</th>
                      <th className="px-6 py-4 text-center font-bold">Lavandería Klynn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pronesoftCompanies.map((c: any) => {
                      const rnc = c.rnc || c.taxId || c.identification || "";
                      const tenantId = c.id || c.tenantId || c.pronesoft_tenant_id || "";
                      const name = c.name || c.companyName || c.razon_social || "Lavandería Registrada";
                      
                      const matchedConfig = ecfConfigsMap[rnc] || ecfConfigsMap[tenantId];
                      const matchedTenant = matchedConfig 
                        ? tenants.find(t => t.id === matchedConfig.tenant_id) 
                        : tenants.find(t => t.rnc === rnc || (rnc && t.rnc?.replace(/\D/g, '') === rnc.replace(/\D/g, '')));

                      const isProd = c.ambiente === 'produccion' || matchedConfig?.ambiente === 'produccion';

                      return (
                        <tr key={tenantId || rnc} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4 font-bold text-foreground">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-emerald-600 shrink-0" />
                              <span>{name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                            {rnc || "N/A"}
                          </td>
                          <td className="px-6 py-4 text-center font-mono text-xs text-muted-foreground">
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                              {tenantId || "Automático"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 text-[10px] font-bold uppercase">
                              {isProd ? 'Producción' : 'Pruebas / SBX'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {matchedTenant ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold">
                                {matchedTenant.nombre}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No vinculada</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {pronesoftCompanies.length === 0 && !loadingPronesoft && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-muted-foreground font-medium">
                          No se encontraron empresas asociadas en la API de Pronesoft.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal para editar Credenciales de Lavandería */}
      <Dialog open={openEditModal} onOpenChange={setOpenEditModal}>
        <DialogContent className="rounded-2xl border-none shadow-card max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Editar Credenciales
            </DialogTitle>
            <DialogDescription>
              Actualiza el acceso, suscripción y cupo de sucursales para <strong>{editingTenant?.nombre}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3 py-1">
            {/* Correo Administrativo */}
            <div className="space-y-1">
              <Label htmlFor="edit-email" className="text-xs font-semibold text-slate-655">Correo Administrativo</Label>
              <div className="relative">
                <Users className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="edit-email"
                  type="email"
                  className="pl-10 rounded-xl h-9.5 text-sm"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Estado de la Lavandería */}
            <div className="space-y-1">
              <Label htmlFor="edit-status" className="text-xs font-semibold text-slate-655">Estado de la Lavandería</Label>
              <Select
                value={newStatus}
                onValueChange={(v: any) => {
                  setNewStatus(v);
                  if (v === "ACTIVO" || v === "TRIAL") {
                    setNewDaysLimit(30);
                  }
                }}
              >
                <SelectTrigger className="h-9.5 rounded-xl text-sm">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-elegant text-sm">
                  <SelectItem value="ACTIVO" className="rounded-lg">Activo</SelectItem>
                  <SelectItem value="TRIAL" className="rounded-lg">En Prueba</SelectItem>
                  <SelectItem value="SUSPENDIDO" className="rounded-lg text-amber-600">Suspendido</SelectItem>
                  <SelectItem value="CANCELADO" className="rounded-lg text-destructive">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Nueva Contraseña (opcional) */}
            <div className="space-y-1">
              <Label htmlFor="edit-pass" className="text-xs font-semibold text-slate-655">Nueva Contraseña (opcional)</Label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="edit-pass"
                  type="password"
                  className="pl-10 rounded-xl h-9.5 text-sm"
                  placeholder="Dejar en blanco para no cambiar"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Plan de Suscripción */}
            <div className="space-y-1">
              <Label htmlFor="edit-plan" className="text-xs font-semibold text-slate-655">Plan de Suscripción</Label>
              <Select
                value={selectedPlanId}
                onValueChange={(v: PlanId) => {
                  setSelectedPlanId(v);
                  setNewDaysLimit(30);
                  const newPlan = plans.find(p => p.id === v);
                  if (newPlan) {
                    setModOverrideWa(!!newPlan.modulos.whatsapp);
                    setModOverrideFiscal(!!newPlan.modulos.facturacion_fiscal);
                    setModOverrideMultisucursal(!!newPlan.modulos.multisucursal);
                    setModOverrideLogistica(!!newPlan.modulos.logistica);
                    setModOverrideProcesos(newPlan.modulos.procesos !== undefined ? !!newPlan.modulos.procesos : true);
                  }
                }}
              >
                <SelectTrigger className="h-9.5 rounded-xl text-sm">
                  <SelectValue placeholder="Seleccionar plan" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-elegant text-sm">
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="rounded-lg">
                      <div className="flex items-center justify-between w-full gap-4 text-sm">
                        <span className="font-semibold">{p.nombre}</span>
                        <span className="text-xs text-muted-foreground">{formatRD(p.precio_mensual)}/mes</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Días de vigencia / renovación */}
            <div className="space-y-1">
              <Label htmlFor="edit-days-limit" className="text-xs font-semibold text-slate-655">Días de vigencia / renovación</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="edit-days-limit"
                  type="number"
                  min={0}
                  className="pl-10 rounded-xl h-9.5 text-sm"
                  value={newDaysLimit}
                  onChange={(e) => setNewDaysLimit(Number(e.target.value) || 0)}
                />
              </div>
              <p className="text-[10.5px] text-muted-foreground">
                Próxima renovación: <strong className="text-primary font-bold">{new Date(Date.now() + newDaysLimit * 24 * 60 * 60 * 1000).toLocaleDateString("es-DO")}</strong>
              </p>
            </div>

            {/* Sucursales Habilitadas */}
            <div className="space-y-1">
              <Label htmlFor="edit-max-sucursales" className="text-xs font-semibold text-slate-655">Cupo de Sucursales Habilitadas</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="edit-max-sucursales"
                  type="number"
                  min={1}
                  className="pl-10 rounded-xl h-9.5 font-bold text-sm"
                  value={newMaxSucursales}
                  onChange={(e) => setNewMaxSucursales(Number(e.target.value) || 1)}
                />
              </div>
            </div>

            {/* SECCIÓN MÓDULOS PERSONALIZADOS */}
            <div className="md:col-span-2 border-t border-border/60 pt-2.5 mt-1">
              <Label className="text-slate-700 dark:text-slate-300 font-bold block mb-2 text-xs uppercase tracking-wider">
                Módulos Habilitados (Personalización)
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                <label className="flex items-center justify-between rounded-xl border border-border/70 p-2 px-2.5 bg-card/60 shadow-2xs cursor-pointer hover:bg-accent/10 transition-all">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">WhatsApp</span>
                    <span className="text-[9px] text-muted-foreground leading-tight">Alertas</span>
                  </div>
                  <Switch
                    checked={modOverrideWa}
                    onCheckedChange={setModOverrideWa}
                  />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-border/70 p-2 px-2.5 bg-card/60 shadow-2xs cursor-pointer hover:bg-accent/10 transition-all">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">Facturación</span>
                    <span className="text-[9px] text-muted-foreground leading-tight">e-CF / NCF</span>
                  </div>
                  <Switch
                    checked={modOverrideFiscal}
                    onCheckedChange={setModOverrideFiscal}
                  />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-border/70 p-2 px-2.5 bg-card/60 shadow-2xs cursor-pointer hover:bg-accent/10 transition-all">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">Sucursales</span>
                    <span className="text-[9px] text-muted-foreground leading-tight">Múltiples</span>
                  </div>
                  <Switch
                    checked={modOverrideMultisucursal}
                    onCheckedChange={setModOverrideMultisucursal}
                  />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-border/70 p-2 px-2.5 bg-card/60 shadow-2xs cursor-pointer hover:bg-accent/10 transition-all">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">Logística</span>
                    <span className="text-[9px] text-muted-foreground leading-tight">Envíos</span>
                  </div>
                  <Switch
                    checked={modOverrideLogistica}
                    onCheckedChange={setModOverrideLogistica}
                  />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-border/70 p-2 px-2.5 bg-card/60 shadow-2xs cursor-pointer hover:bg-accent/10 transition-all">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">Procesos</span>
                    <span className="text-[9px] text-muted-foreground leading-tight">Producción</span>
                  </div>
                  <Switch
                    checked={modOverrideProcesos}
                    onCheckedChange={setModOverrideProcesos}
                  />
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t pt-3">
            <Button variant="ghost" onClick={() => setOpenEditModal(false)} className="rounded-xl h-9">Cancelar</Button>
            <Button onClick={handleUpdateAdmin} className="bg-gradient-primary text-white rounded-xl shadow-md font-bold h-9">
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PlanDialog open={openPlan} onOpenChange={setOpenPlan} initial={editingPlan} onSaved={() => { setTick((r) => r + 1); setOpenPlan(false); }} />
      <BankDetailsDialog open={openBank} onOpenChange={setOpenBank} config={globalConfig} onSaved={() => { setTick((r) => r + 1); setOpenBank(false); }} />
      <LicenciaDialog open={openLicenciaModal} onOpenChange={setOpenLicenciaModal} initial={editingLicencia} onSaved={() => { setTick(r => r + 1); setOpenLicenciaModal(false); }} />

      <AlertDialog open={!!deleteLicencia} onOpenChange={(o) => !o && setDeleteLicencia(null)}>
        <AlertDialogContent className="rounded-2xl border-none shadow-card">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar licencia local?</AlertDialogTitle>
            <AlertDialogDescription>
              La lavandería <strong className="text-foreground">{deleteLicencia?.nombre_lavanderia}</strong> dejará de funcionar localmente la próxima vez que se conecte a internet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteLicencia) {
                  await deleteLicenciaLocal(deleteLicencia.id);
                  setTick(t => t + 1);
                  toast.success("Licencia eliminada");
                  setDeleteLicencia(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              Eliminar Licencia
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

function PlanDialog({ open, onOpenChange, initial, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; initial: Plan | null; onSaved: () => void;
}) {
  const [f, setF] = useState<Partial<Plan>>({});
  useEffect(() => {
    if (open) setF(initial ? { ...initial } : {
      id: ("plan_" + Date.now()) as PlanId,
      nombre: "", precio_mensual: 0, precio_anual: 0, limite_empleados: 5, limite_ordenes_mes: 500,
      limite_whatsapp_mes: 300,
      modulos: { whatsapp: false, facturacion_fiscal: false, multisucursal: false, logistica: false, procesos: true },
    });
  }, [open, initial]);

  function setMod(k: keyof Plan["modulos"], v: boolean) {
    setF((s) => ({ ...s, modulos: { ...(s.modulos as Plan["modulos"]), [k]: v } }));
  }

  async function submit() {
    if (!f.nombre?.trim()) { toast.error("Nombre requerido"); return; }
    const plan: Plan = {
      id: (initial?.id ?? f.id ?? ("plan_" + Date.now())) as PlanId,
      nombre: f.nombre!.trim(),
      precio_mensual: Number(f.precio_mensual) || 0,
      precio_anual: Number(f.precio_anual) || 0,
      limite_empleados: Number(f.limite_empleados) || 1,
      limite_ordenes_mes: f.limite_ordenes_mes === null ? null : Number(f.limite_ordenes_mes) || null,
      limite_whatsapp_mes: Number(f.limite_whatsapp_mes) || 0,
      modulos: f.modulos as Plan["modulos"],
      destacado: f.destacado,
      polar_product_monthly_url: f.polar_product_monthly_url?.trim() || undefined,
      polar_product_yearly_url: f.polar_product_yearly_url?.trim() || undefined,
      precio_sucursal_adicional: Number(f.precio_sucursal_adicional) || 0,
      polar_sucursal_url: f.polar_sucursal_url?.trim() || undefined,
      limite_sucursales_adicionales: Number(f.limite_sucursales_adicionales) || 0,
    };
    await savePlan(plan);
    toast.success("Plan guardado");
    onSaved();
  }

  const mods = (f.modulos || {}) as Plan["modulos"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl rounded-2xl border-none shadow-card">
        <DialogHeader><DialogTitle>{initial ? "Editar plan" : "Nuevo plan"}</DialogTitle></DialogHeader>
        <div className="grid gap-8 py-2 md:grid-cols-2">
          {/* Columna Izquierda: Información básica y límites */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1.5 block text-sm font-bold">ID interno</Label>
                <Input value={f.id || ""} onChange={(e) => setF({ ...f, id: e.target.value as PlanId })} disabled={!!initial} className="h-11 rounded-xl" />
              </div>
              <div><Label className="mb-1.5 block text-sm font-bold">Nombre</Label>
                <Input value={f.nombre || ""} onChange={(e) => setF({ ...f, nombre: e.target.value })} className="h-11 rounded-xl" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1.5 block text-sm font-bold">Precio/mes (RD$)</Label>
                <Input type="number" value={f.precio_mensual ?? 0} onChange={(e) => setF({ ...f, precio_mensual: Number(e.target.value) })} className="h-11 rounded-xl" />
              </div>
              <div><Label className="mb-1.5 block text-sm font-bold">Precio/año (RD$)</Label>
                <Input type="number" value={f.precio_anual ?? 0} onChange={(e) => setF({ ...f, precio_anual: Number(e.target.value) })} className="h-11 rounded-xl" placeholder="Opcional" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1"><Label className="mb-1.5 block text-sm font-bold">Empleados</Label>
                <Input type="number" value={f.limite_empleados ?? 0} onChange={(e) => setF({ ...f, limite_empleados: Number(e.target.value) })} className="h-11 rounded-xl" />
              </div>
              <div className="col-span-1"><Label className="mb-1.5 block text-sm font-bold">Órdenes/mes</Label>
                <Input type="number" value={f.limite_ordenes_mes ?? ""} onChange={(e) => setF({ ...f, limite_ordenes_mes: e.target.value === "" ? null : Number(e.target.value) })} className="h-11 rounded-xl" />
              </div>
              <div className="col-span-1"><Label className="mb-1.5 block text-sm font-bold">WhatsApp/mes</Label>
                <Input type="number" value={f.limite_whatsapp_mes ?? 0} onChange={(e) => setF({ ...f, limite_whatsapp_mes: Number(e.target.value) })} className="h-11 rounded-xl" />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm mt-2 mb-2">
              <Switch checked={!!f.destacado} onCheckedChange={(v) => setF({ ...f, destacado: v })} />
              Marcar como plan destacado / popular
            </label>

            {/* Campos adicionales para el modelo Pay-per-Branch */}
            <div className="rounded-2xl border border-border p-4 bg-slate-50 space-y-3 mt-4">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Configuración Sucursales Adicionales
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-slate-600">Precio Sucursal Extra (RD$)</Label>
                  <Input
                    type="number"
                    value={f.precio_sucursal_adicional ?? ""}
                    onChange={(e) => setF({ ...f, precio_sucursal_adicional: Number(e.target.value) || 0 })}
                    placeholder="1200"
                    className="h-9 rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-slate-600">Límite de Extras</Label>
                  <Input
                    type="number"
                    value={f.limite_sucursales_adicionales ?? ""}
                    onChange={(e) => setF({ ...f, limite_sucursales_adicionales: Number(e.target.value) || 0 })}
                    placeholder="3"
                    className="h-9 rounded-lg text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <ExternalLink className="h-3 w-3 text-primary" /> Polar Sucursal Checkout Link
                </Label>
                <Input
                  value={f.polar_sucursal_url || ""}
                  onChange={(e) => setF({ ...f, polar_sucursal_url: e.target.value })}
                  placeholder="https://buy.polar.sh/..."
                  className="h-9 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Columna Derecha: Módulos y Enlaces */}
          <div className="space-y-4">
            <div>
              <Label className="mb-3 block text-sm font-bold text-muted-foreground uppercase tracking-wider">Módulos incluidos</Label>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-2xl border border-border p-5 bg-accent/30 backdrop-blur-sm">
                {(["whatsapp", "facturacion_fiscal", "multisucursal", "logistica", "procesos"] as const).map((m) => (
                  <label key={m} className="flex items-center gap-3 text-sm p-1 rounded-lg transition-colors cursor-pointer group">
                    <Switch
                      checked={!!mods?.[m]}
                      onCheckedChange={(v) => setMod(m, v)}
                      className="data-[state=checked]:bg-primary"
                    />
                    <span className="font-semibold capitalize text-foreground group-hover:text-primary transition-colors">
                      {m === "logistica" ? "Envío a domicilio" : m === "facturacion_fiscal" ? "Facturación Electrónica" : m === "procesos" ? "Tablero de Procesos" : m.replace(/_/g, " ")}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-primary" /> Polar Monthly Link
                </Label>
                <Input
                  value={f.polar_product_monthly_url || ""}
                  onChange={(e) => setF({ ...f, polar_product_monthly_url: e.target.value })}
                  placeholder="https://polar.sh/..."
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-primary" /> Polar Yearly Link
                </Label>
                <Input
                  value={f.polar_product_yearly_url || ""}
                  onChange={(e) => setF({ ...f, polar_product_yearly_url: e.target.value })}
                  placeholder="https://polar.sh/..."
                  className="h-10 rounded-xl"
                />
              </div>

            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} className="bg-gradient-primary text-white">Guardar plan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BankDetailsDialog({ open, onOpenChange, config, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; config: GlobalConfig; onSaved: () => void;
}) {
  const [f, setF] = useState<BankDetails>({
    banco: "", titular: "", rnc: "", tipo_cuenta: "", numero_cuenta: ""
  });

  useEffect(() => {
    if (open && config.bankDetails) {
      setF(config.bankDetails);
    }
  }, [open, config.bankDetails]);

  async function submit() {
    const next = { ...config, bankDetails: f };
    await saveGlobalConfig(next);
    toast.success("Métodos de pago actualizados");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border-none shadow-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" /> Datos Bancarios
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Configura la cuenta para transferencias directas.</p>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Banco</Label>
            <Input value={f.banco} onChange={(e) => setF({ ...f, banco: e.target.value })} placeholder="Banreservas, BHD, etc." className="rounded-xl h-11" />
          </div>
          <div className="space-y-2">
            <Label>Titular de la cuenta</Label>
            <Input value={f.titular} onChange={(e) => setF({ ...f, titular: e.target.value })} placeholder="Nombre completo" className="rounded-xl h-11" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cédula / RNC</Label>
              <Input value={f.rnc} onChange={(e) => setF({ ...f, rnc: formatCedulaRD(e.target.value) })} placeholder="402-..." className="rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Cuenta</Label>
              <Input value={f.tipo_cuenta} onChange={(e) => setF({ ...f, tipo_cuenta: e.target.value })} placeholder="Ahorro / Corriente" className="rounded-xl h-11" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Número de Cuenta</Label>
            <Input value={f.numero_cuenta} onChange={(e) => setF({ ...f, numero_cuenta: e.target.value })} placeholder="0000000000" className="rounded-xl h-11" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} className="bg-primary text-white rounded-xl font-bold shadow-md">Guardar Datos</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LicenciaDialog({ open, onOpenChange, initial, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; initial: LicenciaLocal | null; onSaved: () => void;
}) {
  const [f, setF] = useState<Partial<LicenciaLocal>>({});
  const [frecuencia, setFrecuencia] = useState<"mensual" | "anual" | "permanente">("anual");

  useEffect(() => {
    if (open) {
      if (initial) {
        setF({ ...initial });
        if (!initial.expira_en) {
          setFrecuencia("permanente");
        } else if (initial.es_anual) {
          setFrecuencia("anual");
        } else {
          setFrecuencia("mensual");
        }
      } else {
        // Generar código aleatorio KLYNN-XXXX-XXXX
        const rand = () => Math.random().toString(36).substring(2, 6).toUpperCase();
        setF({
          codigo: `KLYNN-${rand()}-${rand()}`,
          nombre_lavanderia: "",
          estado: "ACTIVO",
          es_anual: true,
          expira_en: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0],
          whatsapp_activo: false,
          facturacion_activa: false
        });
        setFrecuencia("anual");
      }
    }
  }, [open, initial]);

  async function submit() {
    if (!f.nombre_lavanderia?.trim()) { toast.error("Nombre de lavandería requerido"); return; }
    try {
      const isAnual = frecuencia === "anual";
      const expira = frecuencia === "permanente" ? undefined : f.expira_en;

      if (initial) {
        await updateLicenciaLocal(initial.id, {
          nombre_lavanderia: f.nombre_lavanderia,
          estado: f.estado,
          es_anual: isAnual,
          expira_en: expira,
          whatsapp_activo: f.whatsapp_activo,
          facturacion_activa: f.facturacion_activa
        });
      } else {
        await createLicenciaLocal({
          codigo: f.codigo,
          nombre_lavanderia: f.nombre_lavanderia,
          estado: f.estado,
          es_anual: isAnual,
          expira_en: expira,
          whatsapp_activo: f.whatsapp_activo,
          facturacion_activa: f.facturacion_activa
        });
      }
      toast.success(initial ? "Licencia actualizada" : "Licencia creada");
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Error al guardar la licencia");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl rounded-3xl border-none shadow-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display font-black text-slate-900">
            {initial ? "Editar Licencia" : "Nueva Licencia Klynn Desktop"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground font-semibold">
            Configura los accesos y módulos permitidos para esta instalación local.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Columna Izquierda: Datos Generales */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Código de Activación</Label>
              <Input value={f.codigo} readOnly disabled className="font-mono tracking-widest bg-accent/30 font-bold h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Nombre de la Lavandería / Cliente</Label>
              <Input value={f.nombre_lavanderia} onChange={(e) => setF({ ...f, nombre_lavanderia: e.target.value })} placeholder="Ej: Lavandería La Principal" className="h-11 rounded-xl" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Frecuencia de Pago / Tipo</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={frecuencia === "mensual" ? "default" : "outline"}
                  onClick={() => {
                    setFrecuencia("mensual");
                    setF({
                      ...f,
                      es_anual: false,
                      expira_en: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split("T")[0]
                    });
                  }}
                  className={`rounded-xl h-11 font-bold text-xs ${frecuencia === "mensual" ? "bg-primary text-white shadow" : "text-slate-600 bg-white hover:bg-slate-50"}`}
                >
                  Mensual
                </Button>
                <Button
                  type="button"
                  variant={frecuencia === "anual" ? "default" : "outline"}
                  onClick={() => {
                    setFrecuencia("anual");
                    setF({
                      ...f,
                      es_anual: true,
                      expira_en: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0]
                    });
                  }}
                  className={`rounded-xl h-11 font-bold text-xs ${frecuencia === "anual" ? "bg-primary text-white shadow" : "text-slate-600 bg-white hover:bg-slate-50"}`}
                >
                  Anual
                </Button>
                <Button
                  type="button"
                  variant={frecuencia === "permanente" ? "default" : "outline"}
                  onClick={() => {
                    setFrecuencia("permanente");
                    setF({
                      ...f,
                      es_anual: false,
                      expira_en: undefined
                    });
                  }}
                  className={`rounded-xl h-11 font-bold text-xs ${frecuencia === "permanente" ? "bg-primary text-white shadow" : "text-slate-600 bg-white hover:bg-slate-50"}`}
                >
                  De por vida
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Estado</Label>
                <Select value={f.estado} onValueChange={(v: any) => setF({ ...f, estado: v })}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl shadow-elegant">
                    <SelectItem value="ACTIVO" className="rounded-lg">Activo</SelectItem>
                    <SelectItem value="INACTIVO" className="rounded-lg">Inactivo</SelectItem>
                    <SelectItem value="SUSPENDIDO" className="rounded-lg">Suspendido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {frecuencia !== "permanente" && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Fecha de Expiración</Label>
                  <Input type="date" value={f.expira_en?.substring(0, 10) || ""} onChange={(e) => setF({ ...f, expira_en: new Date(e.target.value).toISOString() })} className="h-11 rounded-xl" />
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha: Módulos y Parámetros */}
          <div className="space-y-4 p-5 bg-accent/20 border border-border/50 rounded-2xl flex flex-col justify-center">
            <h4 className="text-xs font-black uppercase tracking-wider text-primary mb-2 px-1">Módulos y Parámetros</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/40 transition-colors">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Módulo WhatsApp</Label>
                  <p className="text-xs text-muted-foreground">Desbloquear notificaciones por WapiSender.</p>
                </div>
                <Switch checked={f.whatsapp_activo} onCheckedChange={(v) => setF({ ...f, whatsapp_activo: v })} />
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/40 transition-colors">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Módulo Facturación Fiscal</Label>
                  <p className="text-xs text-muted-foreground">Desbloquear e-CFs por Pronesoft.</p>
                </div>
                <Switch checked={f.facturacion_activa} onCheckedChange={(v) => setF({ ...f, facturacion_activa: v })} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
          <Button onClick={submit} className="bg-primary text-white font-bold rounded-xl h-11 px-6 shadow-md hover:bg-primary/95 transition-all">Guardar Licencia</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
