import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Building2, Shield, TrendingUp, Users, Trash2, ExternalLink, Plus, Pencil,
  RefreshCw, Package, LogOut, MoreHorizontal, Key, Droplets as DropletsIcon,
  CreditCard, Calendar, Layers, Laptop, ShieldCheck, Search, Filter, CheckCircle2,
  AlertCircle, Clock, MessageSquare, Truck, FileText, Zap, Crown, Rocket, Sparkles, CheckSquare, X,
  Wrench, ArrowLeft, ArrowRight, Ticket, Copy, Send, MessageCircle, Lock, WifiOff, Boxes,
  Server, HardDrive, Database, ArrowUpRight, Activity, Globe
} from "lucide-react";
import { Logo } from "@/components/klynn/Logo";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
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
  getTenantBranchName,
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
  updateECFConfig,
  getGlobalConfig,
  saveGlobalConfig,
  triggerStandbySync,
  updateStandbyFrequency,
  ADMIN_EMAILS,
  formatCedulaRD,
  getLicenciasLocales,
  createLicenciaLocal,
  updateLicenciaLocal,
  deleteLicenciaLocal,
  getInvitaciones,
  createInvitacion,
  deleteInvitacion,
  generateInvitationCode,

  type Plan, type PlanId, type Tenant, type GlobalConfig, type LicenciaLocal, type BankDetails, type InvitacionCodigo
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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
  const [editStep, setEditStep] = useState<1 | 2>(1);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>("basico");
  const [newStatus, setNewStatus] = useState<any>("ACTIVO");
  const [newMaxSucursales, setNewMaxSucursales] = useState<number>(1);
  const [newDaysLimit, setNewDaysLimit] = useState<number>(30);
  const [newMesesPagados, setNewMesesPagados] = useState<number>(1);

  const [isCustomOverride, setIsCustomOverride] = useState(false);
  const [modOverrideWa, setModOverrideWa] = useState(false);
  const [modOverrideFiscal, setModOverrideFiscal] = useState(false);
  const [modOverrideMultisucursal, setModOverrideMultisucursal] = useState(false);
  const [modOverrideLogistica, setModOverrideLogistica] = useState(false);
  const [modOverrideProcesos, setModOverrideProcesos] = useState(false);
  const [modOverrideEstanteria, setModOverrideEstanteria] = useState(true);
  const [modOverridePosOffline, setModOverridePosOffline] = useState(false);
  const [tenantFiscalEnvironment, setTenantFiscalEnvironment] = useState<"TesteCF" | "CerteCF" | "eCF">("TesteCF");

  const [licencias, setLicencias] = useState<LicenciaLocal[]>([]);
  const [openLicenciaModal, setOpenLicenciaModal] = useState(false);
  const [editingLicencia, setEditingLicencia] = useState<LicenciaLocal | null>(null);
  const [deleteLicencia, setDeleteLicencia] = useState<LicenciaLocal | null>(null);

  // Invitaciones VIP
  const [invitaciones, setInvitaciones] = useState<InvitacionCodigo[]>([]);
  const [openCreateInvModal, setOpenCreateInvModal] = useState(false);
  const [invNota, setInvNota] = useState("");
  const [invPlanId, setInvPlanId] = useState<PlanId>("pro");
  const [invExpiraHoras, setInvExpiraHoras] = useState<number | null>(24);
  const [invDiasTrial, setInvDiasTrial] = useState<number>(14);
  const [invSearchQuery, setInvSearchQuery] = useState("");
  const [invStatusFilter, setInvStatusFilter] = useState<string>("all");
  const [previewCode, setPreviewCode] = useState(generateInvitationCode());

  const [pronesoftCompanies, setPronesoftCompanies] = useState<any[]>([]);
  const [ecfConfigsMap, setEcfConfigsMap] = useState<Record<string, any>>({});
  const [loadingPronesoft, setLoadingPronesoft] = useState(false);
  const [fiscalEnvFilter, setFiscalEnvFilter] = useState<'all' | 'sandbox' | 'production'>('sandbox');

  // Standby Hetzner
  const [isSyncingStandby, setIsSyncingStandby] = useState(false);
  const [isSavingFrequency, setIsSavingFrequency] = useState(false);
  const [selectedStandbyFreq, setSelectedStandbyFreq] = useState<string>("2h");
  const [standbyLastResult, setStandbyLastResult] = useState<any>(null);
  const [liveParityMetrics, setLiveParityMetrics] = useState<{
    tenants: number;
    clientes: number;
    ordenes: number;
    functions: number;
  }>({
    tenants: 12,
    clientes: 543,
    ordenes: 1645,
    functions: 10,
  });

  const handleTriggerStandbySync = async () => {
    setIsSyncingStandby(true);
    try {
      const res = await triggerStandbySync();
      if (res.success) {
        setStandbyLastResult(res);
        try {
          const [tCount, cCount, oCount] = await Promise.all([
            supabase.from("tenants").select("id", { count: "exact", head: true }),
            supabase.from("clientes").select("id", { count: "exact", head: true }),
            supabase.from("ordenes").select("id", { count: "exact", head: true }),
          ]);
          const updatedMetrics = {
            tenants: tCount.count ?? res.metrics?.tenants ?? 12,
            clientes: cCount.count ?? res.metrics?.clientes ?? 543,
            ordenes: oCount.count ?? res.metrics?.ordenes ?? 1645,
            functions: 10,
          };
          setLiveParityMetrics(updatedMetrics);
          setGlobalConfig((prev) => ({
            ...prev,
            standby_last_sync_at: new Date().toISOString(),
            standby_last_sync_duration: res.duration || "14s",
            standby_last_sync_status: "OK",
            standby_last_sync_metrics: updatedMetrics,
          }));
        } catch {
          setGlobalConfig((prev) => ({
            ...prev,
            standby_last_sync_at: new Date().toISOString(),
            standby_last_sync_duration: res.duration || "14s",
            standby_last_sync_status: "OK",
          }));
        }
        toast.success("¡Respaldo en Hetzner sincronizado exitosamente!", {
          description: `Base de datos, Storage y 10 Edge Functions actualizados en ${res.duration || "14s"}.`,
        });
      } else {
        toast.error("Error al sincronizar con Hetzner", {
          description: res.message || "No se pudo completar la sincronización",
        });
      }
    } catch (err: any) {
      toast.error("Error en la sincronización: " + (err?.message || ""));
    } finally {
      setIsSyncingStandby(false);
    }
  };

  const handleSelectAndSaveStandbyFrequency = async (freq: string) => {
    setSelectedStandbyFreq(freq);
    setIsSavingFrequency(true);
    try {
      const ok = await updateStandbyFrequency(freq);
      if (ok) {
        setGlobalConfig((prev) => ({
          ...prev,
          standby_sync_frequency: freq as any,
        }));
        toast.success(`Frecuencia actualizada a "${freq}"`, {
          description: "La regla de respaldo automático ha sido configurada en el servidor.",
        });
      } else {
        toast.error("Error al actualizar la frecuencia");
      }
    } catch (err: any) {
      toast.error("Error: " + (err?.message || ""));
    } finally {
      setIsSavingFrequency(false);
    }
  };

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

  async function loadPronesoftData(selectedEnv?: 'all' | 'sandbox' | 'production') {
    const targetEnv = selectedEnv || fiscalEnvFilter;
    setLoadingPronesoft(true);
    try {
      // 1. Cargar mapa de configuraciones ECF locales desde Supabase
      const { data: ecfList } = await supabase.from('ecf_config').select('*');
      if (ecfList) {
        const map: Record<string, any> = {};
        for (const cfg of ecfList) {
          if (cfg.rnc_emisor) map[cfg.rnc_emisor.trim().toUpperCase()] = cfg;
          if (cfg.pronesoft_tenant_id) map[cfg.pronesoft_tenant_id.trim()] = cfg;
          if (cfg.tenant_id) map[cfg.tenant_id] = cfg;
        }
        setEcfConfigsMap(map);
      }

      // 2. Consultar empresas asociadas en la API de Pronesoft
      const res = await listAssociatedCompaniesPronesoft(undefined, targetEnv);
      console.log("[Pronesoft API] Empresas asociadas recibidas:", res);
      const apiItems: any[] = Array.isArray(res) ? res : ((res as any)?.data || []);
      setPronesoftCompanies(apiItems);
    } catch (err: any) {
      console.warn("Aviso al cargar empresas de Pronesoft:", err.message);
      const errMsg = err?.message || String(err);
      if (errMsg.includes('401') || errMsg.includes('Invalid client credentials')) {
        if (targetEnv === 'production') {
          toast.info("Ambiente Producción: Tus credenciales actuales son de Pruebas (Sandbox). Para Producción se activarán tras certificar ante DGII.");
        } else {
          toast.error("Credenciales de Pronesoft no autorizadas en Sandbox. Revisa tu Client ID y Secret.");
        }
        setPronesoftCompanies([]);
      } else {
        toast.error("Error al consultar Pronesoft: " + errMsg);
      }
    } finally {
      setLoadingPronesoft(false);
    }
  }

  useEffect(() => {
    async function load() {
      const [t, p, cfg, lics, invs, ecfRes] = await Promise.all([
        getTenants(),
        getPlans(),
        getGlobalConfig(),
        getLicenciasLocales(),
        getInvitaciones(),
        supabase.from('ecf_config').select('*'),
      ]);
      setTenants(t);
      setPlans(p);
      setGlobalConfig(cfg);
      if (cfg.standby_sync_frequency) {
        setSelectedStandbyFreq(cfg.standby_sync_frequency);
      }
      setLicencias(lics);
      setInvitaciones(invs);
      if (ecfRes.data) {
        const map: Record<string, any> = {};
        for (const c of ecfRes.data) {
          if (c.rnc_emisor) map[c.rnc_emisor.trim().toUpperCase()] = c;
          if (c.pronesoft_tenant_id) map[c.pronesoft_tenant_id.trim()] = c;
          if (c.tenant_id) map[c.tenant_id] = c;
        }
        setEcfConfigsMap(map);
      }
      const ordsResults = await Promise.all(
        t.map(async (tenant) => {
          try {
            const ords = await getOrdenes(tenant.id);
            const ordsArr = Array.isArray(ords) ? ords : [];
            const ingr = ordsArr.reduce((s: number, o: any) => s + (o.total || 0), 0);
            return { tenantId: tenant.id, count: ordsArr.length, total: ingr };
          } catch {
            return { tenantId: tenant.id, count: 0, total: 0 };
          }
        })
      );
      const ordsMap: Record<string, { count: number; total: number }> = {};
      let grandTotal = 0;
      for (const res of ordsResults) {
        ordsMap[res.tenantId] = { count: res.count, total: res.total };
        grandTotal += res.count;
      }
      setOrdenesByTenant(ordsMap);
      setTotalOrdenes(grandTotal);

      // Consulta exacta en tiempo real para paridad con Hetzner
      try {
        const [tCount, cCount, oCount] = await Promise.all([
          supabase.from("tenants").select("id", { count: "exact", head: true }),
          supabase.from("clientes").select("id", { count: "exact", head: true }),
          supabase.from("ordenes").select("id", { count: "exact", head: true }),
        ]);
        setLiveParityMetrics({
          tenants: tCount.count ?? t.length,
          clientes: cCount.count ?? (cfg.standby_last_sync_metrics?.clientes || 543),
          ordenes: oCount.count ?? (grandTotal > 0 ? grandTotal : 1645),
          functions: 10,
        });
      } catch {
        setLiveParityMetrics({
          tenants: t.length || 12,
          clientes: cfg.standby_last_sync_metrics?.clientes || 543,
          ordenes: grandTotal > 0 ? grandTotal : (cfg.standby_last_sync_metrics?.ordenes || 1645),
          functions: 10,
        });
      }
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

  async function openEditTenant(t: Tenant) {
    setEditingTenant(t);
    setNewEmail(t.email);
    setNewPassword("");
    setSelectedPlanId(t.plan_id);
    setNewStatus(t.estado);
    setNewMaxSucursales(t.max_sucursales || t.config?.max_sucursales || 1);

    let fiscalConfig = ecfConfigsMap[t.id];
    if (!fiscalConfig) {
      try {
        const { data } = await supabase.from('ecf_config').select('*').eq('tenant_id', t.id).maybeSingle();
        if (data) {
          fiscalConfig = data;
          setEcfConfigsMap(prev => ({
            ...prev,
            [t.id]: data,
            ...(data.rnc_emisor ? { [data.rnc_emisor.trim().toUpperCase()]: data } : {}),
            ...(data.pronesoft_tenant_id ? { [data.pronesoft_tenant_id.trim()]: data } : {}),
          }));
        }
      } catch (e) {
        console.warn("No se pudo cargar ecf_config del tenant:", e);
      }
    }

    setTenantFiscalEnvironment(
      fiscalConfig?.pronesoft_environment || (fiscalConfig?.ambiente === "produccion" ? "eCF" : "TesteCF")
    );

    const daysRemaining = t.trial_hasta
      ? Math.max(0, Math.ceil((new Date(t.trial_hasta).getTime() - Date.now()) / 86400000))
      : 0;
    setNewDaysLimit(daysRemaining || 30);

    const hasOverride = !!(t.config?.modulos_override && Object.keys(t.config.modulos_override).length > 0);
    setIsCustomOverride(hasOverride);

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
    setModOverrideEstanteria(t.config?.modulos_override?.estanteria !== undefined
      ? t.config.modulos_override.estanteria
      : (pOfTenant?.modulos.estanteria !== undefined ? !!pOfTenant.modulos.estanteria : true));
    setModOverridePosOffline(t.config?.modulos_override?.pos_offline !== undefined
      ? t.config.modulos_override.pos_offline
      : (pOfTenant?.modulos.pos_offline !== undefined ? !!pOfTenant.modulos.pos_offline : false));

    setEditStep(1);
    setOpenEditModal(true);
  }

  async function handleUpdateAdmin() {
    if (!editingTenant) return;
    try {
      await updateTenantAdmin(editingTenant.id, newEmail, newPassword || undefined);
      if (editingTenant.plan_id !== selectedPlanId) {
        await updateTenantPlan(editingTenant.id, selectedPlanId, false);
      }
      await updateTenantStatus(editingTenant.id, newStatus);
      await updateTenantMaxSucursales(editingTenant.id, newMaxSucursales);

      const trialHasta = new Date(Date.now() + newDaysLimit * 24 * 60 * 60 * 1000).toISOString();
      await updateTenantTrialHasta(editingTenant.id, trialHasta);

      if (ecfConfigsMap[editingTenant.id]) {
        await updateECFConfig(editingTenant.id, {
          pronesoft_environment: tenantFiscalEnvironment,
          ambiente: tenantFiscalEnvironment === "eCF" ? "produccion" : "pruebas",
        });
        setEcfConfigsMap(prev => ({
          ...prev,
          [editingTenant.id]: {
            ...prev[editingTenant.id],
            pronesoft_environment: tenantFiscalEnvironment,
            ambiente: tenantFiscalEnvironment === "eCF" ? "produccion" : "pruebas",
          }
        }));
      }

      // Guardar anulaciones si están activas o limpiar para heredar del plan oficial
      if (isCustomOverride) {
        await updateTenantModulosOverride(
          editingTenant.id,
          {
            whatsapp: modOverrideWa,
            facturacion_fiscal: modOverrideFiscal,
            multisucursal: modOverrideMultisucursal,
            logistica: modOverrideLogistica,
            procesos: modOverrideProcesos,
            estanteria: modOverrideEstanteria,
            pos_offline: modOverridePosOffline,
          }
        );
      } else {
        await updateTenantModulosOverride(editingTenant.id, null);
      }

      toast.success("Información de lavandería actualizada");
      setOpenEditModal(false);
      setTick(t => t + 1);
    } catch (error) {
      console.error("Error updating tenant:", error);
      toast.error("Error al actualizar la lavandería");
    }
  }

  async function handleCreateInvitacion() {
    try {
      const nueva = await createInvitacion({
        nota: invNota,
        plan_id: invPlanId,
        expira_horas: invExpiraHoras,
        dias_trial: invDiasTrial,
      });
      toast.success(`Código de invitación ${nueva.codigo} generado con éxito`);
      setOpenCreateInvModal(false);
      setInvNota("");
      setPreviewCode(generateInvitationCode());
      setTick((t) => t + 1);
    } catch (err: any) {
      toast.error("Error al generar código: " + (err.message || String(err)));
    }
  }

  function copyInvitationLink(codigo: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://klynn.com.do";
    const link = `${origin}/registro?code=${codigo}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(link);
      toast.success(`Enlace copiado al portapapeles: ${link}`);
    }
  }

  function shareWhatsAppInvitation(codigo: string, nota?: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://klynn.com.do";
    const link = `${origin}/registro?code=${codigo}`;
    const greeting = nota ? `¡Hola ${nota}!` : "¡Hola!";
    const msg = `${greeting} Aquí tienes tu enlace exclusivo para registrar tu lavandería en Klynn Cloud con 14 días de prueba sin costo:\n\n🔗 ${link}\n\nCódigo de acceso: *${codigo}*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  async function handleDeleteInvitacion(id: string) {
    await deleteInvitacion(id);
    toast.success("Invitación eliminada");
    setTick((t) => t + 1);
  }

  async function handleLogout() {
    const slug = user?.tenant?.slug || (typeof window !== "undefined" ? localStorage.getItem("klynn_active_tenant") : null);
    await logout();
    if (slug && slug !== "admin") {
      window.location.assign(`/t/${slug}/login`);
    } else {
      window.location.assign("/login");
    }
  }

  if (!user || user.empleado.id === '__loading__') {
    return <GlobalPageLoader text="Cargando panel de administración..." minHeight="min-h-screen" />;
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
              <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 sm:py-2.5 rounded-xl bg-surface border border-border/80 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-2xs">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="truncate max-w-[200px]">{user.empleado.email}</span>
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

            <TabsTrigger
              value="security"
              className="flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-surface border border-border/80 text-foreground shadow-sm data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-md transition-all hover:bg-muted/60 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Lock className="h-4 w-4 shrink-0" />
              <span>Seguridad</span>
            </TabsTrigger>

            <TabsTrigger 
              value="invitaciones"
              className="flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-surface border border-border/80 text-foreground shadow-sm data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-md transition-all hover:bg-muted/60 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Ticket className="h-4 w-4 shrink-0 text-amber-500" />
              <span>Códigos de Invitación ({invitaciones.filter(i => i.estado === "DISPONIBLE").length})</span>
            </TabsTrigger>

            <TabsTrigger 
              value="addons"
              className="flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-surface border border-border/80 text-foreground shadow-sm data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-md transition-all hover:bg-muted/60 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Boxes className="h-4 w-4 shrink-0 text-violet-500" />
              <span>Add-ons</span>
            </TabsTrigger>

            <TabsTrigger 
              value="standby"
              className="flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-surface border border-border/80 text-foreground shadow-sm data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-md transition-all hover:bg-muted/60 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Server className="h-4 w-4 shrink-0 text-emerald-500 data-[state=active]:text-white" />
              <span>Respaldo Hetzner</span>
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
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-sm">
                  <thead className="relative z-10 text-[10.5px] uppercase tracking-wider font-black shadow-[0_4px_12px_-2px_rgba(0,0,0,0.06)] border-b border-border/80">
                    <tr>
                      <th className="px-3.5 py-3 text-left whitespace-nowrap bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200/70 dark:from-slate-800 dark:via-slate-800 dark:to-slate-850 text-slate-800 dark:text-slate-200">
                        Lavandería / Marca
                      </th>
                      <th className="px-2 py-3 text-center whitespace-nowrap bg-gradient-to-b from-blue-50 via-blue-100/90 to-blue-200/60 dark:from-blue-950/70 dark:via-blue-950/90 dark:to-blue-900/60 text-blue-950 dark:text-blue-200 border-x border-blue-200/50 dark:border-blue-800/40">
                        Plan SaaS
                      </th>
                      <th className="px-2 py-3 text-center whitespace-nowrap bg-gradient-to-b from-emerald-50 via-emerald-100/90 to-emerald-200/60 dark:from-emerald-950/70 dark:via-emerald-950/90 dark:to-emerald-900/60 text-emerald-950 dark:text-emerald-200 border-r border-emerald-200/50 dark:border-emerald-800/40">
                        Estado
                      </th>
                      <th className="px-2 py-3 text-center whitespace-nowrap bg-gradient-to-b from-purple-50 via-purple-100/90 to-purple-200/60 dark:from-purple-950/70 dark:via-purple-950/90 dark:to-purple-900/60 text-purple-950 dark:text-purple-200 border-r border-purple-200/50 dark:border-purple-800/40">
                        Módulos Habilitados
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
                        const hasEstanteria = t.config?.modulos_override?.estanteria !== undefined 
                          ? t.config.modulos_override.estanteria 
                          : (planOfTenant?.modulos?.estanteria !== undefined ? !!planOfTenant.modulos.estanteria : true);
                        const hasOffline = t.config?.modulos_override?.pos_offline !== undefined 
                          ? t.config.modulos_override.pos_offline 
                          : (planOfTenant?.modulos?.pos_offline !== undefined ? !!planOfTenant.modulos.pos_offline : false);

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
                                    {isSelected && (
                                      <span className="h-2 w-2 rounded-full bg-primary shrink-0 animate-pulse" />
                                    )}
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
                              {t.plan_id === 'basico' && (
                                <Badge className="bg-sky-50 text-sky-700 hover:bg-sky-50 border-sky-200 text-[10px] font-black uppercase px-2 py-0.5 rounded-full gap-1 shadow-2xs">
                                  <Zap className="h-3 w-3 text-sky-600" /> Básico
                                </Badge>
                              )}
                              {t.plan_id === 'pro' && (
                                <Badge className="bg-purple-50 text-purple-700 hover:bg-purple-50 border-purple-200 text-[10px] font-black uppercase px-2 py-0.5 rounded-full gap-1 shadow-2xs">
                                  <Crown className="h-3 w-3 text-purple-600" /> Pro
                                </Badge>
                              )}
                              {t.plan_id === 'enterprise' && (
                                <Badge className="bg-amber-50 text-amber-800 hover:bg-amber-50 border-amber-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full gap-1 shadow-2xs">
                                  <Rocket className="h-3 w-3 text-amber-600" /> Enterprise
                                </Badge>
                              )}
                              {t.plan_id !== 'basico' && t.plan_id !== 'pro' && t.plan_id !== 'enterprise' && (
                                <Badge variant="outline" className="text-[10px] font-bold uppercase">{t.plan_id}</Badge>
                              )}
                            </td>

                            <td className="px-2 py-2.5 text-center whitespace-nowrap bg-emerald-500/[0.015] border-r border-border/20">
                              {t.estado === "ACTIVO" ? (
                                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full gap-1 shadow-2xs">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Activo
                                </Badge>
                              ) : t.estado === "TRIAL" ? (
                                <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full gap-1 shadow-2xs">
                                  <Clock className="h-3 w-3 text-amber-600" /> Prueba ({daysRemaining}d)
                                </Badge>
                              ) : (
                                <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full gap-1 shadow-2xs">
                                  <AlertCircle className="h-3 w-3 text-rose-600" /> Suspendido
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
                                  title={hasLogistica ? "Logística y Repartidores: Habilitada" : "Logística: Inactiva"}
                                  className={`p-1 rounded-md transition-all ${
                                    hasLogistica
                                      ? "bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700 shadow-2xs"
                                      : "bg-muted/30 text-muted-foreground/30 border border-transparent opacity-30"
                                  }`}
                                >
                                  <Truck className="h-3 w-3" />
                                </span>
                                <span
                                  title={hasProcesos ? "Tablero de Procesos: Habilitado" : "Procesos: Inactivo"}
                                  className={`p-1 rounded-md transition-all ${
                                    hasProcesos
                                      ? "bg-teal-50 text-teal-700 border border-teal-300 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-700 shadow-2xs"
                                      : "bg-muted/30 text-muted-foreground/30 border border-transparent opacity-30"
                                  }`}
                                >
                                  <Wrench className="h-3 w-3" />
                                </span>
                                <span
                                  title={hasEstanteria ? "Estantería virtual: Habilitada" : "Estantería: Inactiva"}
                                  className={`p-1 rounded-md transition-all ${
                                    hasEstanteria
                                      ? "bg-indigo-50 text-indigo-700 border border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-700 shadow-2xs"
                                      : "bg-muted/30 text-muted-foreground/30 border border-transparent opacity-30"
                                  }`}
                                >
                                  <Layers className="h-3 w-3" />
                                </span>
                                <span
                                  title={hasOffline ? "Modo Offline: Habilitado (Punto de Venta sin conexión)" : "Modo Offline: Inactivo"}
                                  className={`p-1 rounded-md transition-all ${
                                    hasOffline
                                      ? "bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-700 shadow-2xs"
                                      : "bg-muted/30 text-muted-foreground/30 border border-transparent opacity-30"
                                  }`}
                                >
                                  <WifiOff className="h-3 w-3" />
                                </span>
                              </div>
                            </td>

                            <td className="px-2 py-2.5 text-center whitespace-nowrap bg-cyan-500/[0.015] border-r border-border/20">
                              <span className="font-bold text-foreground bg-muted/70 px-2 py-0.5 rounded-md border border-border/50 text-xs">
                                {tenantOrds.count}
                              </span>
                            </td>

                            <td className="px-2.5 py-2.5 text-center whitespace-nowrap bg-amber-500/[0.015] border-r border-border/20">
                              <div className="font-bold text-foreground text-xs tracking-tight" title="Total procesado en órdenes por esta lavandería">
                                {formatRD(tenantOrds.total)}
                              </div>
                              {saasStats.isDemo ? (
                                <div className="mt-0.5 inline-flex items-center px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9.5px] font-bold border border-slate-200 dark:border-slate-700 shadow-2xs">
                                  Demo Propia (RD$0)
                                </div>
                              ) : t.estado === "ACTIVO" && saasStats.totalEarned > 0 ? (
                                <div 
                                  className="mt-0.5 inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[9.5px] font-bold border border-emerald-200/70 dark:border-emerald-800 shadow-2xs" 
                                  title={`Plan SaaS: ${saasStats.months} ${saasStats.months === 1 ? 'mes cobrado' : 'meses cobrados'} (${formatRD(saasStats.planPrice)}/mes)`}
                                >
                                  <span>SaaS: {formatRD(saasStats.totalEarned)}</span>
                                  <span className="text-[9px] font-semibold text-emerald-600/80 dark:text-emerald-400/80">({saasStats.months}m)</span>
                                </div>
                              ) : (
                                <div className="mt-0.5 text-[9.5px] text-muted-foreground/60 font-medium italic">
                                  Prueba (RD$0)
                                </div>
                              )}
                            </td>

                            <td className="px-3 py-2.5 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7.5 px-2 rounded-lg gap-1 font-bold text-xs bg-background hover:bg-primary hover:text-white border-border/80 shadow-2xs transition-all cursor-pointer"
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
                  const hasEstanteria = t.config?.modulos_override?.estanteria !== undefined ? t.config.modulos_override.estanteria : (planOfTenant?.modulos?.estanteria !== undefined ? !!planOfTenant.modulos.estanteria : true);
                  const hasOffline = t.config?.modulos_override?.pos_offline !== undefined ? t.config.modulos_override.pos_offline : (planOfTenant?.modulos?.pos_offline !== undefined ? !!planOfTenant.modulos.pos_offline : false);

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
                            <span className={`p-1 rounded ${hasProcesos ? 'text-teal-600 bg-teal-50 dark:bg-teal-950/60' : 'text-muted-foreground/30 opacity-40'}`}><Wrench className="h-3 w-3" /></span>
                            <span className={`p-1 rounded ${hasEstanteria ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60' : 'text-muted-foreground/30 opacity-40'}`} title={hasEstanteria ? "Estantería virtual: Habilitada" : "Estantería: Inactiva"}><Layers className="h-3 w-3" /></span>
                            <span className={`p-1 rounded ${hasOffline ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/60' : 'text-muted-foreground/30 opacity-40'}`} title={hasOffline ? "Modo Offline: Habilitado (Punto de Venta sin conexión)" : "Modo Offline: Inactivo"}><WifiOff className="h-3 w-3" /></span>
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

          <TabsContent value="plans" className="mt-6 sm:mt-8 space-y-6">
            <div className="mb-6 rounded-2xl border border-border/50 bg-surface p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-lg text-foreground">Configuración de Registro SaaS</h3>
                  <p className="text-xs text-muted-foreground">Controla las condiciones de prueba y planes para nuevas lavanderías.</p>
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
                      toast.success("Configuración de registro guardada");
                    }}
                    className="h-9 px-4 rounded-xl shadow-sm font-bold bg-[#1B4B73] hover:bg-[#143755] text-white cursor-pointer"
                  >
                    Guardar
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

            {/* 3 COLUMNAS DE PLANES PRINCIPALES */}
            <div className="grid gap-6 md:grid-cols-3 items-stretch pt-3">
              {plans.filter(p => !p.es_especial).map((p) => (
                <div
                  key={p.id}
                  style={{
                    borderColor: p.destacado ? '#F0B900' : undefined,
                    borderWidth: p.destacado ? '2.5px' : '1.5px',
                    borderStyle: 'solid',
                  }}
                  className={`plan-card relative rounded-3xl p-6 flex flex-col transition-all duration-300 ${
                    p.destacado
                      ? "plan-card--featured shadow-lg shadow-[#F0B900]/20"
                      : "shadow-sm hover:shadow-xl bg-card border-border/80"
                  }`}
                >
                  {p.destacado && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 font-sans font-extrabold text-[11px] tracking-wider uppercase px-4 py-1 bg-[#F0B900] text-[#133857] rounded-full shadow-md whitespace-nowrap z-10">
                      POPULAR
                    </div>
                  )}

                  <div className="space-y-0.5">
                    <div className="font-display text-xl font-bold text-foreground leading-none">{p.nombre}</div>
                    <div className="text-3xl font-black text-primary leading-tight">
                      {formatRD(p.precio_mensual)}<span className="text-xs font-normal text-muted-foreground">/mes</span>
                    </div>
                    {p.precio_anual && (
                      <div className="text-xs text-muted-foreground font-medium">o {formatRD(p.precio_anual)}/año</div>
                    )}
                  </div>

                  <div className="mt-3.5 space-y-2 text-xs font-semibold flex-1">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <Users className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
                      <span>{p.limite_empleados} Empleados</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <Package className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
                      <span>{p.limite_ordenes_mes ? `${p.limite_ordenes_mes.toLocaleString("es-DO")} Órdenes/mes` : "Órdenes/mes ilimitadas"}</span>
                    </div>
                    {p.modulos?.whatsapp && (
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <MessageSquare className="h-4 w-4 text-blue-500 shrink-0" />
                        <span>{p.limite_whatsapp_mes ? `${p.limite_whatsapp_mes.toLocaleString()} Mensajes WhatsApp` : "Mensajes WhatsApp Ilimitados"}</span>
                      </div>
                    )}
                    <div className="border-t border-border pt-2.5 mt-2.5 text-left">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Módulos Habilitados
                      </div>
                      <div className="space-y-1.5">
                        {[
                          { key: "whatsapp", label: "Mensajería WhatsApp", extra: "(Costo adicional)" },
                          { key: "facturacion_fiscal", label: "Facturación Electrónica", extra: "(Costo adicional)" },
                          { key: "multisucursal", label: "Multisucursal", extra: "(Costo adicional)" },
                          { key: "pos_offline", label: "Modo Offline", extra: "(Factura sin conexión)" },
                          { key: "logistica", label: "Envío a domicilio" },
                          { key: "procesos", label: "Tablero de Procesos" },
                          { key: "estanteria", label: "Estantería virtual" },
                        ].map(({ key, label, extra }) => {
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
                              <span className="flex items-center flex-wrap gap-1">
                                <span>{label}</span>
                                {extra && (
                                  <span className={`text-[10px] font-normal ${v ? "text-amber-700 dark:text-amber-400" : "text-slate-400"}`}>
                                    {extra}
                                  </span>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto pt-4 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 cursor-pointer" onClick={() => { setEditingPlan(p); setOpenPlan(true); }}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      title="Mover a Plan Especial (barra inferior)"
                      className="cursor-pointer px-2 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/50"
                      onClick={async () => {
                        await savePlan({ ...p, es_especial: true, titulo_especial: p.titulo_especial || "Plan especial" });
                        toast.success(`Plan "${p.nombre}" fijado como Plan Especial inferior`);
                        setTick((r) => r + 1);
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" className="cursor-pointer" onClick={async () => {
                      if (confirm(`¿Eliminar plan ${p.nombre}?`)) {
                        await deletePlan(p.id);
                        setTick((r) => r + 1);
                      }
                    }}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* SECCIÓN DE PLANES ESPECIALES (BARRA SUTIL INFERIOR) */}
            {plans.filter(p => !!p.es_especial).length > 0 && (
              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    <h3 className="font-display text-base font-bold text-foreground">Planes Especiales (Barra inferior sutil)</h3>
                    <Badge variant="outline" className="text-[10px] font-bold text-sky-700 bg-sky-50 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300">
                      {plans.filter(p => !!p.es_especial).length} plan{plans.filter(p => !!p.es_especial).length > 1 ? "es" : ""}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    Se muestran sutilmente debajo de las 3 columnas sin alterar la cuadrícula superior
                  </p>
                </div>

                {plans.filter(p => !!p.es_especial).map((p) => {
                  const specialLabel = p.titulo_especial?.trim() || "Plan especial";
                  return (
                    <div
                      key={p.id}
                      className="relative rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 bg-gradient-to-r from-slate-50/90 via-card to-sky-50/30 dark:from-slate-900/70 dark:via-slate-900/50 dark:to-sky-950/20 shadow-xs hover:shadow-sm transition-all"
                    >
                      {/* FILA SUPERIOR: INFORMACIÓN, LÍMITES Y ACCIONES */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3.5 border-b border-border/60">
                        
                        {/* Izquierda: Indicador, Nombre y Precio */}
                        <div className="min-w-[200px]">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 mb-1">
                            <Sparkles className="h-3 w-3 text-sky-600 dark:text-sky-400 shrink-0" />
                            <span>{specialLabel}</span>
                          </div>
                          <div className="font-display text-xl font-bold text-foreground leading-tight">{p.nombre}</div>
                          <div className="mt-0.5 text-2xl font-black text-primary leading-tight">
                            {formatRD(p.precio_mensual)}<span className="text-[11px] font-medium text-muted-foreground">/mes</span>
                          </div>
                          {p.precio_anual && (
                            <div className="text-[10.5px] text-muted-foreground font-medium">o {formatRD(p.precio_anual)}/año</div>
                          )}
                        </div>

                        {/* Centro: Límites Clave */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-2 lg:py-0 border-y lg:border-y-0 lg:border-x border-border/60 lg:px-5 flex-1">
                          <div className="space-y-0.5">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                              <Users className="h-3 w-3 text-slate-500 shrink-0" />
                              <span>Equipo</span>
                            </div>
                            <div className="text-xs font-bold text-foreground">
                              {p.limite_empleados} {p.limite_empleados === 1 ? "Empleado" : "Empleados"}
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                              <Package className="h-3 w-3 text-slate-500 shrink-0" />
                              <span>Facturación</span>
                            </div>
                            <div className="text-xs font-bold text-foreground">
                              {p.limite_ordenes_mes ? `${p.limite_ordenes_mes.toLocaleString("es-DO")} Órdenes/mes` : "Órdenes ilimitadas"}
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                              <MessageSquare className="h-3 w-3 text-blue-500 shrink-0" />
                              <span>WhatsApp</span>
                            </div>
                            <div className="text-xs font-bold text-foreground">
                              {p.modulos?.whatsapp
                                ? (p.limite_whatsapp_mes ? `${p.limite_whatsapp_mes.toLocaleString()} msgs/mes` : "Ilimitados")
                                : "No incluido"}
                            </div>
                          </div>
                        </div>

                        {/* Derecha: Acciones de Administración */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Button size="sm" variant="outline" className="h-8 px-3 text-xs cursor-pointer" onClick={() => { setEditingPlan(p); setOpenPlan(true); }}>
                            <Pencil className="mr-1 h-3 w-3" /> Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            title="Mover a 3 columnas principales"
                            className="h-8 px-3 text-xs cursor-pointer text-slate-600 hover:text-slate-900"
                            onClick={async () => {
                              await savePlan({ ...p, es_especial: false });
                              toast.success(`Plan "${p.nombre}" movido a las 3 columnas principales`);
                              setTick((r) => r + 1);
                            }}
                          >
                            Mover a columnas
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 px-2.5 cursor-pointer" onClick={async () => {
                            if (confirm(`¿Eliminar plan ${p.nombre}?`)) {
                              await deletePlan(p.id);
                              setTick((r) => r + 1);
                            }
                          }}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
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
                              { key: "pos_offline", label: "Modo Offline", extra: "(Factura sin conexión)" },
                              { key: "logistica", label: "Envío a domicilio" },
                              { key: "procesos", label: "Tablero de Procesos" },
                              { key: "estanteria", label: "Estantería virtual" },
                            ].map(({ key, label, extra }) => {
                              const v = !!p.modulos?.[key as keyof typeof p.modulos];
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
                              <div key={feat} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
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
          </TabsContent>

          <TabsContent value="licencias" className="mt-6 sm:mt-8 space-y-6">
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
                          <Badge variant="outline" className={l.estado === "ACTIVO" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300" : "bg-muted text-muted-foreground"}>
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

          <TabsContent value="fiscal-companies" className="mt-6 sm:mt-8 space-y-6">
            <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-600" /> Empresas Fiscales Asociadas (Pronesoft / DGII)
                </h2>
                <p className="text-sm text-muted-foreground">
                  Directorio maestro de lavanderías registradas como empresas emisoras e-CF en la API de Pronesoft.
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Selector de Ambiente */}
                <div className="flex items-center gap-1 bg-muted/60 border border-border/70 rounded-xl p-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setFiscalEnvFilter('all');
                      loadPronesoftData('all');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${fiscalEnvFilter === 'all' ? 'bg-primary text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Todos ({pronesoftCompanies.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFiscalEnvFilter('sandbox');
                      loadPronesoftData('sandbox');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${fiscalEnvFilter === 'sandbox' ? 'bg-amber-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Pruebas / Sandbox
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFiscalEnvFilter('production');
                      loadPronesoftData('production');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${fiscalEnvFilter === 'production' ? 'bg-emerald-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Producción (Live)
                  </button>
                </div>

                <Button 
                  onClick={() => loadPronesoftData(fiscalEnvFilter)} 
                  disabled={loadingPronesoft}
                  variant="outline"
                  className="h-9 px-4 rounded-xl font-bold border-primary/20 text-primary hover:bg-primary/5 gap-1.5 shrink-0"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingPronesoft ? "animate-spin" : ""}`} /> 
                  {loadingPronesoft ? "Consultando..." : "Refrescar"}
                </Button>
              </div>
            </div>

            <Card className="overflow-hidden border-none shadow-card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-elevated text-xs uppercase text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-6 py-4 text-left font-bold">Empresa / Razón Social</th>
                      <th className="px-6 py-4 text-center font-bold">RNC / Cédula</th>
                      <th className="px-6 py-4 text-center font-bold">Pronesoft Tenant ID</th>
                      <th className="px-6 py-4 text-center font-bold">Ambiente DGII</th>
                      <th className="px-6 py-4 text-center font-bold">Lavandería Klynn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pronesoftCompanies.map((c: any) => {
                      const rnc = (c.rnc || c.taxId || c.identification || "").trim();
                      const tenantId = (c.id || c.tenantId || c.pronesoft_tenant_id || "").trim();
                      const name = c.name || c.companyName || c.razon_social || "Lavandería Registrada";
                      
                      const cleanRnc = rnc.replace(/^SBX/i, '').replace(/\D/g, '');
                      const matchedConfig = ecfConfigsMap[rnc.toUpperCase()] || ecfConfigsMap[tenantId] || (cleanRnc ? ecfConfigsMap[cleanRnc] : null);
                      const matchedTenant = matchedConfig 
                        ? tenants.find(t => t.id === matchedConfig.tenant_id) 
                        : tenants.find(t => t.rnc === rnc || (cleanRnc && t.rnc?.replace(/\D/g, '') === cleanRnc));

                      const isProd = c._ambiente === 'production' || c.ambiente === 'produccion' || matchedConfig?.ambiente === 'produccion';

                      return (
                        <tr key={`${tenantId || rnc}-${c._ambiente || 'env'}`} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4 font-bold text-foreground">
                            <div className="flex items-center gap-2">
                              <Building2 className={`h-4 w-4 shrink-0 ${isProd ? "text-emerald-600" : "text-amber-600"}`} />
                              <span>{name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                            {rnc || "N/A"}
                          </td>
                          <td className="px-6 py-4 text-center font-mono text-xs text-muted-foreground">
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 select-all">
                              {tenantId || "Automático"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {isProd ? (
                              <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 text-[10px] font-bold uppercase gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Producción (Live)
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-50 text-amber-800 hover:bg-amber-50 border-amber-300 text-[10px] font-bold uppercase gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                Pruebas (Sandbox)
                              </Badge>
                            )}
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
                          No se encontraron empresas asociadas en la API de Pronesoft {fiscalEnvFilter === 'all' ? '' : `para ${fiscalEnvFilter}`}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6 mt-6">
            <Card className="rounded-3xl border border-border/70 overflow-hidden shadow-sm">
              <div className="p-5 sm:p-6 border-b border-border/60 bg-gradient-to-r from-slate-50 to-blue-50/60 dark:from-slate-900 dark:to-blue-950/30">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold">Control de ambiente fiscal</h2>
                    <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
                      Define si toda la plataforma usa un ambiente Pronesoft o si cada lavandería conserva su asignación individual. Las credenciales permanecen en Edge Runtime y nunca se muestran aquí.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6 space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {([
                    { value: "per_tenant", title: "Por lavandería", description: "Respeta el ambiente asignado al editar cada negocio.", tone: "border-slate-300 bg-slate-50 dark:bg-slate-900" },
                    { value: "TesteCF", title: "TesteCF", description: "Fuerza pruebas técnicas para toda la plataforma.", tone: "border-sky-300 bg-sky-50 dark:bg-sky-950/30" },
                    { value: "CerteCF", title: "CerteCF", description: "Fuerza homologación y certificación DGII.", tone: "border-amber-300 bg-amber-50 dark:bg-amber-950/30" },
                    { value: "eCF", title: "Producción eCF", description: "Usa credenciales y operaciones fiscales reales.", tone: "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30" },
                  ] as const).map((option) => {
                    const active = (globalConfig.fiscal_environment_policy || "per_tenant") === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setGlobalConfig({ ...globalConfig, fiscal_environment_policy: option.value })}
                        className={`text-left rounded-2xl border-2 p-4 transition-all cursor-pointer ${option.tone} ${active ? "ring-2 ring-primary/25 border-primary shadow-sm" : "opacity-80 hover:opacity-100"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-sm">{option.title}</span>
                          {active && <CheckCircle2 className="h-4 w-4 text-primary" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{option.description}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 dark:bg-amber-950/20 p-4">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                      Cambiar el modo global afecta las próximas llamadas al SDK. No mueve certificados, empresas ni secuencias entre ambientes.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={async () => {
                      await saveGlobalConfig(globalConfig);
                      toast.success("Política fiscal guardada");
                    }}
                    className="rounded-xl font-bold shrink-0"
                  >
                    Guardar política
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="invitaciones" className="space-y-6 mt-6">
            {/* Header de la sección de invitaciones */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 sm:p-6 rounded-2xl border border-border/60 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-amber-500" />
                    Códigos de Invitación & Acceso Privado
                  </h2>
                  <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 font-extrabold text-[10px] uppercase">
                    Exclusivo
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
                  Genera códigos aleatorios con formato <span className="font-mono font-bold text-primary">KLYNN-XXXXXXXX</span> y enlaces mágicos para permitir el registro de nuevas lavanderías de forma privada y controlada.
                </p>
              </div>

              <Button
                onClick={() => {
                  setPreviewCode(generateInvitationCode());
                  setOpenCreateInvModal(true);
                }}
                className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl gap-2 shadow-md shrink-0 h-10 px-5 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Generar Código VIP
              </Button>
            </div>

            {/* Mini KPIs de Invitaciones */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <Card className="p-4 rounded-2xl border-border/60 bg-surface shadow-xs flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
                  <Ticket className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block">Total Generadas</span>
                  <span className="text-xl font-bold font-display text-foreground">{invitaciones.length}</span>
                </div>
              </Card>

              <Card className="p-4 rounded-2xl border-border/60 bg-surface shadow-xs flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block">Disponibles</span>
                  <span className="text-xl font-bold font-display text-emerald-600 dark:text-emerald-400">
                    {invitaciones.filter(i => i.estado === "DISPONIBLE").length}
                  </span>
                </div>
              </Card>

              <Card className="p-4 rounded-2xl border-border/60 bg-surface shadow-xs flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block">Canjeadas / Usadas</span>
                  <span className="text-xl font-bold font-display text-purple-600 dark:text-purple-400">
                    {invitaciones.filter(i => i.estado === "USADO").length}
                  </span>
                </div>
              </Card>

              <Card className="p-4 rounded-2xl border-border/60 bg-surface shadow-xs flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block">Expiradas</span>
                  <span className="text-xl font-bold font-display text-rose-600 dark:text-rose-400">
                    {invitaciones.filter(i => i.estado === "EXPIRADO").length}
                  </span>
                </div>
              </Card>
            </div>

            {/* Barra de Filtros y Búsqueda */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3.5 sm:p-4 rounded-2xl border border-border/50 shadow-xs">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código (ej. KLYNN-7X4M9P2K), cliente o lavandería..."
                  value={invSearchQuery}
                  onChange={(e) => setInvSearchQuery(e.target.value)}
                  className="pl-10 h-10 rounded-xl bg-background border-border/80 text-sm focus-visible:ring-primary/20"
                />
              </div>

              <div className="flex items-center gap-1 bg-muted/50 border border-border/60 rounded-xl p-1 shrink-0 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setInvStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${invStatusFilter === "all" ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Todas ({invitaciones.length})
                </button>
                <button
                  type="button"
                  onClick={() => setInvStatusFilter("DISPONIBLE")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${invStatusFilter === "DISPONIBLE" ? "bg-emerald-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Disponibles ({invitaciones.filter(i => i.estado === "DISPONIBLE").length})
                </button>
                <button
                  type="button"
                  onClick={() => setInvStatusFilter("USADO")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${invStatusFilter === "USADO" ? "bg-purple-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Usadas ({invitaciones.filter(i => i.estado === "USADO").length})
                </button>
                <button
                  type="button"
                  onClick={() => setInvStatusFilter("EXPIRADO")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${invStatusFilter === "EXPIRADO" ? "bg-rose-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Expiradas ({invitaciones.filter(i => i.estado === "EXPIRADO").length})
                </button>
              </div>
            </div>

            {/* Tabla de Invitaciones */}
            <Card className="rounded-2xl border-border/60 overflow-hidden shadow-sm bg-surface">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-muted/50 border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3.5 font-bold">Código VIP</th>
                      <th className="px-5 py-3.5 font-bold">Cliente / Destinatario</th>
                      <th className="px-5 py-3.5 font-bold text-center">Plan Asignado</th>
                      <th className="px-5 py-3.5 font-bold text-center">Estado</th>
                      <th className="px-5 py-3.5 font-bold text-center">Creación / Expiración</th>
                      <th className="px-5 py-3.5 font-bold text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {invitaciones
                      .filter((inv) => {
                        const q = invSearchQuery.toLowerCase().trim();
                        const matchesQ = !q || inv.codigo.toLowerCase().includes(q) || (inv.nota && inv.nota.toLowerCase().includes(q)) || (inv.usado_por_slug && inv.usado_por_slug.toLowerCase().includes(q));
                        const matchesS = invStatusFilter === "all" || inv.estado === invStatusFilter;
                        return matchesQ && matchesS;
                      })
                      .map((inv) => {
                        const isExpired = inv.estado === "EXPIRADO" || (inv.estado === "DISPONIBLE" && inv.expira_en && new Date(inv.expira_en) < new Date());
                        const isUsed = inv.estado === "USADO";
                        const isAvailable = inv.estado === "DISPONIBLE" && !isExpired;

                        return (
                          <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-5 py-4 font-mono font-black text-sm">
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-1 rounded-lg border text-xs sm:text-sm tracking-wider font-extrabold font-mono ${
                                  isAvailable
                                    ? "bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border-amber-300"
                                    : isUsed
                                    ? "bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300"
                                }`}>
                                  {inv.codigo}
                                </span>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              {inv.nota ? (
                                <span className="font-bold text-foreground block">{inv.nota}</span>
                              ) : (
                                <span className="text-muted-foreground italic text-xs">Sin nota asignada</span>
                              )}
                              {isUsed && inv.usado_por_slug && (
                                <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold block mt-0.5">
                                  Registrado en: <strong>/t/{inv.usado_por_slug}</strong> {inv.usado_por_email ? `(${inv.usado_por_email})` : ''}
                                </span>
                              )}
                            </td>

                            <td className="px-5 py-4 text-center">
                              <div className="inline-flex items-center gap-1.5">
                                <PlanBadge id={inv.plan_id || "pro"} />
                                <span className="text-[11px] text-muted-foreground font-semibold">
                                  ({inv.dias_trial || 14}d)
                                </span>
                              </div>
                            </td>

                            <td className="px-5 py-4 text-center">
                              {isAvailable && (
                                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 text-[10px] font-bold uppercase gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Disponible
                                </Badge>
                              )}
                              {isUsed && (
                                <Badge className="bg-purple-50 text-purple-700 hover:bg-purple-50 border-purple-200 text-[10px] font-bold uppercase gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-purple-600" />
                                  Canjeado
                                </Badge>
                              )}
                              {isExpired && (
                                <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold uppercase gap-1">
                                  <Clock className="h-3 w-3 text-rose-500" />
                                  Expirado
                                </Badge>
                              )}
                            </td>

                            <td className="px-5 py-4 text-center text-xs">
                              <div className="text-muted-foreground">
                                Creado: {new Date(inv.creado_en).toLocaleDateString("es-DO")}
                              </div>
                              <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                                {inv.expira_en ? (
                                  <span>Expira: {new Date(inv.expira_en).toLocaleString("es-DO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: true })}</span>
                                ) : (
                                  <span className="text-emerald-600 font-bold">Sin expiración</span>
                                )}
                              </div>
                            </td>

                            <td className="px-5 py-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {isAvailable && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => copyInvitationLink(inv.codigo)}
                                      title="Copiar Enlace de Registro"
                                      className="h-8 px-2.5 rounded-lg border-border/80 hover:bg-primary hover:text-white transition-all text-xs font-bold gap-1 cursor-pointer"
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                      <span className="hidden sm:inline">Copiar Enlace</span>
                                    </Button>

                                    <Button
                                      size="sm"
                                      onClick={() => shareWhatsAppInvitation(inv.codigo, inv.nota)}
                                      title="Enviar por WhatsApp"
                                      className="h-8 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all text-xs font-bold gap-1 cursor-pointer"
                                    >
                                      <MessageCircle className="h-3.5 w-3.5" />
                                      <span className="hidden sm:inline">WhatsApp</span>
                                    </Button>
                                  </>
                                )}

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteInvitacion(inv.id)}
                                  title="Eliminar invitación"
                                  className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    {invitaciones.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-muted-foreground font-medium">
                          No has generado ningún código de invitación todavía. Haz clic en "Generar Código VIP" arriba.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="addons" className="space-y-6 mt-6">
            {/* Header de la sección de Add-ons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 sm:p-6 rounded-2xl border border-border/60 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                    <Boxes className="h-5 w-5 text-violet-500" />
                    Add-ons & Módulos Globales
                  </h2>
                  <Badge variant="outline" className="bg-violet-50 dark:bg-violet-950/50 text-violet-800 dark:text-violet-300 border-violet-300 font-extrabold text-[10px] uppercase tracking-wider">
                    Configuración Global
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
                  Configura y expande los motores de mensajería, autenticación y add-ons para todo el ecosistema Klynn.
                </p>
              </div>
            </div>

            {/* Grid de 4 Columnas de Add-ons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5 items-stretch">
              {/* Tarjeta 1: Motor WhatsApp Plataforma */}
              <Card className="p-5 rounded-2xl border border-border/70 bg-card shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-full group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-2xs group-hover:scale-105 transition-transform">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 ${(globalConfig.whatsapp_engine || 'klynn_connect') === 'klynn_connect' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300' : 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300'}`}>
                      {(globalConfig.whatsapp_engine || 'klynn_connect') === 'klynn_connect' ? "⚡ Klynn Connect" : "☁️ WASender"}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-foreground">
                      Motor WhatsApp Plataforma
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      {(globalConfig.whatsapp_engine || 'klynn_connect') === 'klynn_connect'
                        ? "Conexión nativa con código QR en wa.klynn.com.do para envío de tickets, recibos y avisos automáticos sin costo por mensaje."
                        : "Envío mediante API en la nube con API Key e ID de instancia personalizada."}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-border/50 space-y-2.5">
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/50">
                    <button
                      type="button"
                      onClick={async () => {
                        if ((globalConfig.whatsapp_engine || 'klynn_connect') === 'klynn_connect') return;
                        const updated = { ...globalConfig, whatsapp_engine: 'klynn_connect' as const };
                        setGlobalConfig(updated);
                        await saveGlobalConfig(updated);
                        toast.success("⚡ Klynn Connect activado como motor WhatsApp");
                      }}
                      className={`text-[11px] font-bold py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center ${
                        (globalConfig.whatsapp_engine || 'klynn_connect') === 'klynn_connect'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      ⚡ Klynn Connect
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (globalConfig.whatsapp_engine === 'wasender') return;
                        const updated = { ...globalConfig, whatsapp_engine: 'wasender' as const };
                        setGlobalConfig(updated);
                        await saveGlobalConfig(updated);
                        toast.success("☁️ WASenderAPI activado como motor WhatsApp");
                      }}
                      className={`text-[11px] font-bold py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center ${
                        globalConfig.whatsapp_engine === 'wasender'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      ☁️ WASenderAPI
                    </button>
                  </div>
                </div>
              </Card>

              {/* Tarjeta 2: Verificación OTP para Nuevos Empleados */}
              <Card className="p-5 rounded-2xl border border-border/70 bg-card shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-full group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-2xs group-hover:scale-105 transition-transform">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 ${globalConfig.requireEmployeeOtp ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200'}`}>
                      {globalConfig.requireEmployeeOtp ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-foreground">
                      Verificación OTP para Empleados
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      Exige un código de confirmación de 6 dígitos enviado al correo del empleado cada vez que un administrador lo cree en <code className="font-mono text-[10.5px] text-primary font-bold">/personal</code>.
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-border/50 flex items-center justify-between">
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <span className="text-xs font-bold text-foreground block truncate">
                      {globalConfig.requireEmployeeOtp ? "Obligatorio" : "Deshabilitado"}
                    </span>
                    <span className="text-[10.5px] text-muted-foreground block truncate">
                      {globalConfig.requireEmployeeOtp ? "Código OTP activo" : "Creación directa"}
                    </span>
                  </div>
                  <Switch
                    checked={Boolean(globalConfig.requireEmployeeOtp)}
                    onCheckedChange={async (v) => {
                      const updated = { ...globalConfig, requireEmployeeOtp: v };
                      setGlobalConfig(updated);
                      await saveGlobalConfig(updated);
                      toast.success(v ? "Verificación OTP activada correctamente" : "Verificación OTP desactivada");
                    }}
                    className="cursor-pointer shrink-0"
                  />
                </div>
              </Card>

              {/* Tarjeta 3: Pasarelas de Pago Online */}
              <Card className="p-5 rounded-2xl border border-border/60 bg-card/60 shadow-none hover:border-amber-500/40 hover:shadow-xs transition-all flex flex-col justify-between h-full group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-2xs group-hover:scale-105 transition-transform">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200">
                      Próximamente
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-foreground">
                      Pasarelas de Pago Online
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      Integración con Cardnet y Azul para cobro digital de órdenes con tarjeta de crédito, débito y links de pago para delivery.
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-border/40 flex items-center justify-between opacity-60">
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <span className="text-xs font-bold text-muted-foreground block truncate">
                      En desarrollo
                    </span>
                    <span className="text-[10.5px] text-muted-foreground block truncate">
                      Próximo lanzamiento
                    </span>
                  </div>
                  <Switch disabled checked={false} className="shrink-0 opacity-50" />
                </div>
              </Card>

              {/* Tarjeta 4: Notificaciones SMS Directas */}
              <Card className="p-5 rounded-2xl border border-border/60 bg-card/60 shadow-none hover:border-indigo-500/40 hover:shadow-xs transition-all flex flex-col justify-between h-full group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-2xs group-hover:scale-105 transition-transform">
                      <Send className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200">
                      Próximamente
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-foreground">
                      Notificaciones SMS Directas
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      Envío alternativo de tickets y avisos de retiro mediante mensajería SMS para clientes que no cuenten con conexión de WhatsApp.
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-border/40 flex items-center justify-between opacity-60">
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <span className="text-xs font-bold text-muted-foreground block truncate">
                      En desarrollo
                    </span>
                    <span className="text-[10.5px] text-muted-foreground block truncate">
                      Próximo lanzamiento
                    </span>
                  </div>
                  <Switch disabled checked={false} className="shrink-0 opacity-50" />
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* TAB: RESPALDO HETZNER */}
          <TabsContent value="standby" className="space-y-6 mt-6">
            {/* 1. HERO / HEALTH BANNER */}
            <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.07] via-background to-teal-500/[0.04] p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-inner">
                    <Server className="h-7 w-7" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight text-foreground">
                        Respaldo y Réplica en Hetzner Cloud
                      </h2>
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 px-3 py-0.5 rounded-full font-bold text-xs flex items-center gap-1.5 shadow-2xs">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Standby Conectado & Activo
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                      Servidor de contingencia en <strong className="text-foreground font-semibold">Alemania (2.28.50.140)</strong>. Sincroniza silenciosamente la base de datos PostgreSQL, archivos de Storage y las 10 Edge Functions de Klynn.
                    </p>
                  </div>
                </div>

                {/* BOTON DE ACCION PRINCIPAL: SINCRONIZAR AHORA */}
                <div className="flex flex-col items-stretch sm:items-end justify-end gap-2 shrink-0">
                  <Button
                    onClick={handleTriggerStandbySync}
                    disabled={isSyncingStandby}
                    size="lg"
                    className="h-12 px-6 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <RefreshCw className={`h-4.5 w-4.5 ${isSyncingStandby ? "animate-spin" : ""}`} />
                    <span>{isSyncingStandby ? "Sincronizando..." : "Sincronizar Respaldo Ahora"}</span>
                  </Button>
                  <span className="text-[11px] text-center sm:text-right text-muted-foreground block font-medium">
                    {isSyncingStandby ? "Transfiriendo DB, Storage y Funciones..." : "Tarda aprox. 12-14 segundos"}
                  </span>
                </div>
              </div>

              {/* BARRA DE ESTADO DE ULTIMO RESPALDO */}
              <div className="mt-6 pt-5 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground shrink-0">
                    <Clock className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground font-medium block">Última Sincronización</span>
                    <span className="text-xs sm:text-sm font-bold text-foreground block">
                      {globalConfig.standby_last_sync_at 
                        ? new Date(globalConfig.standby_last_sync_at).toLocaleString("es-DO", { dateStyle: "medium", timeStyle: "short" }) 
                        : "Hoy a las 05:38 PM"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground shrink-0">
                    <Zap className="h-4.5 w-4.5 text-amber-500" />
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground font-medium block">Duración del Último Sync</span>
                    <span className="text-xs sm:text-sm font-bold text-foreground block">
                      {globalConfig.standby_last_sync_duration || "14 segundos"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground shrink-0">
                    <Globe className="h-4.5 w-4.5 text-sky-500" />
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground font-medium block">Dominio de Contingencia</span>
                    <a 
                      href="https://api.app.klynn.com.do" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-xs sm:text-sm font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>api.app.klynn.com.do</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground shrink-0">
                    <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground font-medium block">Retención de Snapshots</span>
                    <span className="text-xs sm:text-sm font-bold text-foreground block">
                      7 Días (.sql.gz)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. SELECTOR DE FRECUENCIA Y PARIDAD */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* TARJETA DE CONTROL DE FRECUENCIA */}
              <Card className="lg:col-span-2 rounded-3xl p-6 border-border/60 bg-surface shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Frecuencia de Sincronización Automática
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      El servidor de Oracle ejecutará el volcado y la réplica hacia Hetzner en el intervalo seleccionado.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 rounded-lg border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10">
                    Actual: {globalConfig.standby_sync_frequency || selectedStandbyFreq || "2h"}
                  </Badge>
                </div>

                {/* BOTONES DE SELECCIÓN DE FRECUENCIA */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { key: "1h", label: "Cada 1 hora", desc: "Alta frecuencia (24 veces/día)" },
                    { key: "2h", label: "Cada 2 horas", desc: "Recomendado para Klynn", badge: "Óptimo" },
                    { key: "4h", label: "Cada 4 horas", desc: "6 veces al día" },
                    { key: "6h", label: "Cada 6 horas", desc: "4 veces al día" },
                    { key: "12h", label: "Cada 12 horas", desc: "2 veces al día" },
                    { key: "24h", label: "Diario (24h)", desc: "1 vez al día (medianoche)" },
                  ].map((item) => {
                    const isSelected = (globalConfig.standby_sync_frequency || selectedStandbyFreq) === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleSelectAndSaveStandbyFrequency(item.key)}
                        disabled={isSavingFrequency}
                        className={`relative text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-primary/10 border-primary text-foreground shadow-xs ring-1 ring-primary/30"
                            : "bg-background border-border/80 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                        }`}
                      >
                        {isSelected ? (
                          <span className="absolute top-2 right-2 px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-white">
                            Activo
                          </span>
                        ) : item.badge ? (
                          <span className="absolute top-2 right-2 px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-slate-500/80 text-white">
                            {item.badge}
                          </span>
                        ) : null}
                        <div className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${isSelected ? "bg-primary animate-pulse" : "bg-muted-foreground/40"}`} />
                          {item.label}
                        </div>
                        <span className="text-[11px] text-muted-foreground block mt-1 leading-snug">
                          {item.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Al seleccionar una tarjeta, se actualiza la tarea <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded font-mono">crontab</code> de Oracle automáticamente.
                  </span>
                  {isSavingFrequency && (
                    <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                      <RefreshCw className="h-3 w-3 animate-spin" /> Guardando...
                    </span>
                  )}
                </div>
              </Card>

              {/* TARJETA DE PARIDAD Y METRICAS */}
              <Card className="rounded-3xl p-6 border-border/60 bg-surface shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary" />
                    Paridad de Datos Respaldados
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Datos clonados en tiempo real entre Oracle y Hetzner:
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border/60">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-primary" />
                      Negocios (Tenants)
                    </span>
                    <span className="text-xs font-black text-foreground">{liveParityMetrics.tenants}</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border/60">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-purple-500" />
                      Clientes Totales
                    </span>
                    <span className="text-xs font-black text-foreground">
                      {liveParityMetrics.clientes}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border/60">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                      <Package className="h-3.5 w-3.5 text-indigo-500" />
                      Órdenes Facturadas
                    </span>
                    <span className="text-xs font-black text-foreground">
                      {liveParityMetrics.ordenes}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border/60">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      Edge Functions
                    </span>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{liveParityMetrics.functions} Sincronizadas</span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 text-[11px] text-muted-foreground space-y-1">
                    <div className="font-bold text-foreground flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-emerald-500" />
                      Failover Ready
                    </div>
                    <span>
                      En caso de contingencia en Oracle, Vercel o el frontend pueden apuntar inmediatamente a <code className="text-[10px] bg-muted px-1 py-0.2 rounded font-mono">api.app.klynn.com.do</code>.
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal para Gestionar Lavandería (Wizard) */}
      <Dialog open={openEditModal} onOpenChange={setOpenEditModal}>
        <DialogContent className="rounded-3xl max-w-xl p-0 gap-0 overflow-hidden border-none shadow-2xl bg-background text-foreground">
          {/* STEPPER HEADER */}
          <div className="bg-slate-50/70 dark:bg-slate-900/60 p-4 sm:px-5 sm:pt-4 sm:pb-3 relative border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center justify-between mb-3 pr-10">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/15 shadow-xs">
                  {editStep === 1 ? <Building2 className="h-4.5 w-4.5" /> : <Layers className="h-4.5 w-4.5" />}
                </div>
                <div>
                  <DialogTitle className="text-base font-display font-bold text-foreground">
                    Gestionar Lavandería: {editingTenant?.nombre || ""}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    {editStep === 1
                      ? "Paso 1: Accesos, suscripción y cupo de sucursales"
                      : "Paso 2: Módulos y funciones habilitadas"}
                  </p>
                </div>
              </div>
            </div>

            {/* Stepper Buttons */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-200/60 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => setEditStep(1)}
                className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  editStep === 1
                    ? "bg-primary text-white shadow-md font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span
                  className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                    editStep === 1
                      ? "bg-white/25 text-white"
                      : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  1
                </span>
                <span>Acceso & Suscripción</span>
              </button>

              <button
                type="button"
                onClick={() => setEditStep(2)}
                className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  editStep === 2
                    ? "bg-primary text-white shadow-md font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span
                  className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                    editStep === 2
                      ? "bg-white/25 text-white"
                      : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  2
                </span>
                <span>Módulos Habilitados ({[modOverrideWa, modOverrideFiscal, modOverrideMultisucursal, modOverrideLogistica, modOverrideProcesos, modOverrideEstanteria].filter(Boolean).length})</span>
              </button>
            </div>
          </div>

          {/* DIALOG BODY */}
          <div className="px-5 sm:px-6 py-4 max-h-[min(72vh,560px)] overflow-y-auto custom-scrollbar">
            {editStep === 1 ? (
              /* STEP 1: ACCESO & SUSCRIPCIÓN */
              <div className="space-y-3.5 animate-in fade-in slide-in-from-left-3 duration-200">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="edit-email" className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                      Correo Administrativo *
                    </Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="edit-email"
                        type="email"
                        className="pl-9.5 rounded-xl h-10 text-xs sm:text-sm bg-surface border-border/60 focus:ring-1 focus:ring-primary/20"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-status" className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                      Estado de la Lavandería
                    </Label>
                    <Select
                      value={newStatus}
                      onValueChange={(v: any) => {
                        setNewStatus(v);
                        if (v === "ACTIVO" || v === "TRIAL") {
                          setNewDaysLimit(30);
                        }
                      }}
                    >
                      <SelectTrigger className="h-10 rounded-xl text-xs sm:text-sm bg-surface border-border/60">
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-elegant text-xs sm:text-sm">
                        <SelectItem value="ACTIVO" className="rounded-lg">Activo</SelectItem>
                        <SelectItem value="TRIAL" className="rounded-lg">En Prueba</SelectItem>
                        <SelectItem value="SUSPENDIDO" className="rounded-lg text-amber-600">Suspendido</SelectItem>
                        <SelectItem value="CANCELADO" className="rounded-lg text-destructive">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="edit-pass" className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                      Nueva Contraseña (opcional)
                    </Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="edit-pass"
                        type="password"
                        className="pl-9.5 rounded-xl h-10 text-xs sm:text-sm bg-surface border-border/60 focus:ring-1 focus:ring-primary/20"
                        placeholder="Dejar en blanco para conservar"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-plan" className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                      Plan de Suscripción
                    </Label>
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
                          setModOverrideEstanteria(newPlan.modulos.estanteria !== undefined ? !!newPlan.modulos.estanteria : true);
                        }
                      }}
                    >
                      <SelectTrigger className="h-10 rounded-xl text-xs sm:text-sm bg-surface border-border/60">
                        <SelectValue placeholder="Seleccionar plan" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-elegant text-xs sm:text-sm">
                        {plans.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="rounded-lg">
                            <div className="flex items-center justify-between w-full gap-3 text-xs sm:text-sm">
                              <span className="font-semibold">{p.nombre}</span>
                              <span className="text-[11px] text-muted-foreground">{formatRD(p.precio_mensual)}/mes</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="edit-days-limit" className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                      Días de vigencia / renovación
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="edit-days-limit"
                        type="number"
                        min={0}
                        className="pl-9.5 rounded-xl h-10 text-xs sm:text-sm bg-surface border-border/60 focus:ring-1 focus:ring-primary/20"
                        value={newDaysLimit}
                        onChange={(e) => setNewDaysLimit(Number(e.target.value) || 0)}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground pt-0.5">
                      Próxima renovación: <strong className="text-primary font-bold">{new Date(Date.now() + newDaysLimit * 24 * 60 * 60 * 1000).toLocaleDateString("es-DO")}</strong>
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-max-sucursales" className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                      Cupo de Sucursales Habilitadas
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="edit-max-sucursales"
                        type="number"
                        min={1}
                        className="pl-9.5 rounded-xl h-10 font-bold text-xs sm:text-sm bg-surface border-border/60 focus:ring-1 focus:ring-primary/20"
                        value={newMaxSucursales}
                        onChange={(e) => setNewMaxSucursales(Number(e.target.value) || 1)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* STEP 2: MÓDULOS HABILITADOS (OVERRIDES) */
              <div className="space-y-3 animate-in fade-in slide-in-from-right-3 duration-200">
                <div className="rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/20 p-3.5 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="text-xs font-bold">Ambiente Pronesoft de esta lavandería</div>
                      <div className="text-[10px] text-muted-foreground">
                        Se aplica cuando Seguridad está configurada en “Por lavandería”.
                      </div>
                    </div>
                  </div>
                  {ecfConfigsMap[editingTenant?.id || ""] ? (
                    <Select value={tenantFiscalEnvironment} onValueChange={(value: "TesteCF" | "CerteCF" | "eCF") => setTenantFiscalEnvironment(value)}>
                      <SelectTrigger className="h-9 rounded-xl bg-background text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TesteCF">TesteCF — Pruebas técnicas</SelectItem>
                        <SelectItem value="CerteCF">CerteCF — Homologación DGII</SelectItem>
                        <SelectItem value="eCF">eCF — Producción real</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-[11px] text-amber-700 dark:text-amber-300">
                      Esta lavandería debe configurar primero Facturación Electrónica en su pestaña Fiscal.
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border/60">
                  <div>
                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      {isCustomOverride ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-bold">
                          <Sparkles className="h-3.5 w-3.5" /> Personalización manual activa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Heredando del Plan Oficial ({plans.find(p => p.id === selectedPlanId)?.nombre || selectedPlanId})
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {isCustomOverride 
                        ? "Este negocio tiene módulos asignados específicamente."
                        : "Sincronizado automáticamente con las funciones oficiales del plan."}
                    </p>
                  </div>
                  {isCustomOverride ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsCustomOverride(false);
                        const currentPlan = plans.find(p => p.id === selectedPlanId);
                        if (currentPlan) {
                          setModOverrideWa(!!currentPlan.modulos.whatsapp);
                          setModOverrideFiscal(!!currentPlan.modulos.facturacion_fiscal);
                          setModOverrideMultisucursal(!!currentPlan.modulos.multisucursal);
                          setModOverrideLogistica(!!currentPlan.modulos.logistica);
                          setModOverrideProcesos(currentPlan.modulos.procesos !== undefined ? !!currentPlan.modulos.procesos : true);
                          setModOverrideEstanteria(currentPlan.modulos.estanteria !== undefined ? !!currentPlan.modulos.estanteria : true);
                        }
                        toast.info("Restablecido a los módulos del Plan Oficial");
                      }}
                      className="h-7 text-xs font-bold px-2.5 rounded-lg border-primary/30 text-primary hover:bg-primary/10 shrink-0"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" /> Restablecer al Plan
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsCustomOverride(true);
                        toast.info("Personalización manual habilitada");
                      }}
                      className="h-7 text-xs font-bold px-2.5 rounded-lg border-slate-300 dark:border-slate-700 shrink-0"
                    >
                      <Sparkles className="h-3 w-3 mr-1" /> Personalizar
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { key: "whatsapp", label: "WhatsApp Cloud", desc: "Mensajes y alertas automáticas", icon: MessageSquare, checked: modOverrideWa, onChange: (v: boolean) => { setIsCustomOverride(true); setModOverrideWa(v); }, colorClass: "text-emerald-600 dark:text-emerald-400", bgClass: "bg-emerald-500/10" },
                    { key: "fiscal", label: "Facturación e-CF", desc: "Comprobantes DGII en línea", icon: FileText, checked: modOverrideFiscal, onChange: (v: boolean) => { setIsCustomOverride(true); setModOverrideFiscal(v); }, colorClass: "text-blue-600 dark:text-blue-400", bgClass: "bg-blue-500/10" },
                    { key: "multisucursal", label: "Multisucursal", desc: "Gestión de múltiples sedes", icon: Building2, checked: modOverrideMultisucursal, onChange: (v: boolean) => { setIsCustomOverride(true); setModOverrideMultisucursal(v); }, colorClass: "text-purple-600 dark:text-purple-400", bgClass: "bg-purple-500/10" },
                    { key: "pos_offline", label: "Modo Offline", desc: "Punto de Venta y cobros sin internet", icon: WifiOff, checked: modOverridePosOffline, onChange: (v: boolean) => { setIsCustomOverride(true); setModOverridePosOffline(v); }, colorClass: "text-rose-600 dark:text-rose-400", bgClass: "bg-rose-500/10" },
                    { key: "logistica", label: "Envío a Domicilio", desc: "Ruteo y choferes", icon: Truck, checked: modOverrideLogistica, onChange: (v: boolean) => { setIsCustomOverride(true); setModOverrideLogistica(v); }, colorClass: "text-amber-600 dark:text-amber-400", bgClass: "bg-amber-500/10" },
                    { key: "procesos", label: "Tablero de Procesos", desc: "Control Kanban por etapas", icon: Wrench, checked: modOverrideProcesos, onChange: (v: boolean) => { setIsCustomOverride(true); setModOverrideProcesos(v); }, colorClass: "text-teal-600 dark:text-teal-400", bgClass: "bg-teal-500/10" },
                    { key: "estanteria", label: "Estantería virtual", desc: "Ganchos, rieles y casilleros", icon: Layers, checked: modOverrideEstanteria, onChange: (v: boolean) => { setIsCustomOverride(true); setModOverrideEstanteria(v); }, colorClass: "text-indigo-600 dark:text-indigo-400", bgClass: "bg-indigo-500/10" },
                  ].map(({ key, label, desc, icon: IconComp, checked, onChange, colorClass, bgClass }) => (
                    <div
                      key={key}
                      onClick={() => onChange(!checked)}
                      className={`flex items-center justify-between p-2.5 px-3 rounded-2xl border transition-all cursor-pointer select-none ${
                        checked
                          ? "bg-white dark:bg-slate-900 border-primary/40 shadow-xs ring-1 ring-primary/20"
                          : "bg-surface/50 border-border/60 hover:bg-white hover:border-border"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className={`h-8 w-8 rounded-xl ${bgClass} ${colorClass} flex items-center justify-center shrink-0`}>
                          <IconComp className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-foreground leading-tight truncate">{label}</div>
                          <div className="text-[10px] text-muted-foreground leading-tight truncate">{desc}</div>
                        </div>
                      </div>
                      <Switch
                        checked={checked}
                        className="data-[state=checked]:bg-primary shrink-0 pointer-events-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* DIALOG FOOTER */}
          <div className="border-t border-border/50 p-3 sm:px-6 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/30">
            <div>
              {editStep === 1 ? (
                <Button
                  type="button"
                  onClick={() => setOpenEditModal(false)}
                  className="h-9 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 px-4 border border-slate-300 dark:border-slate-600 shadow-2xs active:scale-95 transition-all cursor-pointer"
                >
                  Cancelar
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setEditStep(1)}
                  className="h-9 rounded-xl text-xs font-bold gap-1.5 px-4"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Volver
                </Button>
              )}
            </div>

            <div>
              {editStep === 1 ? (
                <Button
                  onClick={() => setEditStep(2)}
                  className="h-9 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs gap-1.5 shadow-sm active:scale-95 transition-all px-4"
                >
                  <span>Siguiente: Módulos</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  onClick={handleUpdateAdmin}
                  className="h-9 rounded-xl bg-gradient-primary text-white font-bold text-xs shadow-md active:scale-95 transition-all gap-1.5 px-4"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Guardar Cambios</span>
                </Button>
              )}
            </div>
          </div>
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

      {/* Modal: Generar Código de Invitación VIP */}
      <Dialog open={openCreateInvModal} onOpenChange={setOpenCreateInvModal}>
        <DialogContent className="rounded-2xl max-w-[430px] p-0 gap-0 overflow-hidden border shadow-2xl bg-background text-foreground">
          {/* Header Compacto */}
          <div className="bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent p-3.5 sm:p-4 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-2xs shrink-0">
                <Ticket className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm font-display font-bold text-foreground leading-tight">
                  Generar Código de Invitación VIP
                </DialogTitle>
                <DialogDescription className="text-[11px] text-muted-foreground leading-tight">
                  Crea un código de activación único para una nueva lavandería.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Form Content Compacto */}
          <div className="p-3.5 sm:p-4 space-y-2.5">
            {/* Display del Código Generado */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border/80 text-center space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block leading-none">
                Código de Acceso Asignado
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-xl sm:text-2xl font-black tracking-widest text-primary bg-background px-3 py-1 rounded-lg border border-primary/30 shadow-2xs select-all">
                  {previewCode}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewCode(generateInvitationCode())}
                  title="Generar otro código"
                  className="rounded-lg h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground truncate">
                Enlace: <code className="font-mono text-primary font-bold">{typeof window !== 'undefined' ? window.location.origin : 'https://klynn.com.do'}/registro?code={previewCode}</code>
              </p>
            </div>

            {/* Campo: Nota o Nombre del Cliente */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Destinatario / Nota del Cliente
              </Label>
              <Input
                placeholder="Ej: Lavandería Don Pedro (Santo Domingo)"
                value={invNota}
                onChange={(e) => setInvNota(e.target.value)}
                className="h-8.5 rounded-lg bg-surface border-border/80 text-xs"
              />
            </div>

            {/* Fila: Plan & Días de Prueba */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Plan Inicial
                </Label>
                <Select value={invPlanId} onValueChange={(v: PlanId) => setInvPlanId(v)}>
                  <SelectTrigger className="h-8.5 rounded-lg bg-surface border-border/80 text-xs">
                    <SelectValue placeholder="Seleccionar plan" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.nombre} ({formatRD(p.precio_mensual)}/m)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Días de Prueba
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={invDiasTrial}
                  onChange={(e) => setInvDiasTrial(Number(e.target.value) || 14)}
                  className="h-8.5 rounded-lg bg-surface border-border/80 text-xs font-bold"
                />
              </div>
            </div>

            {/* Campo: Expiración del Código */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Vigencia de la Invitación
              </Label>
              <Select
                value={invExpiraHoras === null ? "null" : String(invExpiraHoras)}
                onValueChange={(v) => setInvExpiraHoras(v === "null" ? null : Number(v))}
              >
                <SelectTrigger className="h-8.5 rounded-lg bg-surface border-border/80 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="1" className="text-xs">1 Hora</SelectItem>
                  <SelectItem value="3" className="text-xs">3 Horas</SelectItem>
                  <SelectItem value="5" className="text-xs">5 Horas</SelectItem>
                  <SelectItem value="24" className="text-xs">24 Horas (1 día - Recomendado)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[9.5px] text-muted-foreground leading-tight">
                Una vez transcurrido este tiempo o canjeado el código, nadie más podrá utilizarlo.
              </p>
            </div>
          </div>

          {/* Footer Compacto */}
          <DialogFooter className="p-3 bg-muted/20 border-t border-border/60 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpenCreateInvModal(false)}
              className="h-8.5 rounded-lg font-bold px-3.5 text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreateInvitacion}
              className="bg-primary hover:bg-primary/90 text-white font-bold h-8.5 px-4 rounded-lg shadow-xs cursor-pointer gap-1 text-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Generar y Guardar
            </Button>
          </DialogFooter>
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

function PlanDialog({ open, onOpenChange, initial, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; initial: Plan | null; onSaved: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [f, setF] = useState<Partial<Plan>>({});

  useEffect(() => {
    if (open) {
      setStep(1);
      setF(initial ? { ...initial, modulos: { ...initial.modulos } } : {
        id: ("plan_" + Date.now()) as PlanId,
        nombre: "", precio_mensual: 0, precio_anual: 0, limite_empleados: 5, limite_ordenes_mes: 500,
        limite_whatsapp_mes: 300,
        modulos: { whatsapp: false, facturacion_fiscal: false, multisucursal: false, logistica: false, procesos: true, estanteria: true, pos_offline: false },
      });
    }
  }, [open, initial]);

  function setMod(k: keyof Plan["modulos"], v: boolean) {
    setF((s) => ({ ...s, modulos: { ...(s.modulos as Plan["modulos"]), [k]: v } }));
  }

  function handlePriceInput(field: keyof Plan, rawValue: string) {
    const clean = rawValue.replace(/,/g, "").replace(/[^\d]/g, "");
    setF((prev) => ({ ...prev, [field]: clean === "" ? 0 : Number(clean) }));
  }

  async function submit() {
    if (!f.nombre?.trim()) { toast.error("Nombre del plan requerido"); return; }
    const plan: Plan = {
      id: (initial?.id ?? f.id ?? ("plan_" + Date.now())) as PlanId,
      nombre: f.nombre!.trim(),
      precio_mensual: Number(f.precio_mensual) || 0,
      precio_anual: Number(f.precio_anual) || 0,
      limite_empleados: Number(f.limite_empleados) || 1,
      limite_ordenes_mes: f.limite_ordenes_mes === null ? null : Number(f.limite_ordenes_mes) || null,
      limite_whatsapp_mes: Number(f.limite_whatsapp_mes) || 0,
      modulos: {
        whatsapp: !!f.modulos?.whatsapp,
        facturacion_fiscal: !!f.modulos?.facturacion_fiscal,
        multisucursal: !!f.modulos?.multisucursal,
        pos_offline: !!f.modulos?.pos_offline,
        logistica: !!f.modulos?.logistica,
        procesos: !!f.modulos?.procesos,
        estanteria: !!f.modulos?.estanteria,
      },
      destacado: f.destacado,
      es_especial: !!f.es_especial,
      titulo_especial: f.titulo_especial?.trim() || "Plan especial",
      polar_product_monthly_url: f.polar_product_monthly_url?.trim() || undefined,
      polar_product_yearly_url: f.polar_product_yearly_url?.trim() || undefined,
      precio_sucursal_adicional: Number(f.precio_sucursal_adicional) || 0,
      polar_sucursal_url: f.polar_sucursal_url?.trim() || undefined,
      limite_sucursales_adicionales: Number(f.limite_sucursales_adicionales) || 0,
    };
    await savePlan(plan);
    toast.success("Plan guardado correctamente");
    onSaved();
  }

  const mods = (f.modulos || {}) as Plan["modulos"];
  const activeModsCount = Object.values(mods).filter(Boolean).length;

  const moduleItems: { key: keyof Plan["modulos"]; label: string; desc: string; icon: any; colorClass: string; bgClass: string }[] = [
    { key: "whatsapp", label: "WhatsApp Cloud", desc: "Mensajes y alertas automáticas", icon: MessageSquare, colorClass: "text-emerald-600 dark:text-emerald-400", bgClass: "bg-emerald-500/10" },
    { key: "facturacion_fiscal", label: "Facturación e-CF", desc: "Comprobantes DGII en línea", icon: FileText, colorClass: "text-blue-600 dark:text-blue-400", bgClass: "bg-blue-500/10" },
    { key: "multisucursal", label: "Multisucursal", desc: "Gestión de múltiples sedes", icon: Building2, colorClass: "text-purple-600 dark:text-purple-400", bgClass: "bg-purple-500/10" },
    { key: "pos_offline", label: "Modo Offline", desc: "Punto de Venta y cobros sin internet", icon: WifiOff, colorClass: "text-rose-600 dark:text-rose-400", bgClass: "bg-rose-500/10" },
    { key: "logistica", label: "Envío a Domicilio", desc: "Ruteo y choferes", icon: Truck, colorClass: "text-amber-600 dark:text-amber-400", bgClass: "bg-amber-500/10" },
    { key: "procesos", label: "Tablero de Procesos", desc: "Control Kanban por etapas", icon: Wrench, colorClass: "text-teal-600 dark:text-teal-400", bgClass: "bg-teal-500/10" },
    { key: "estanteria", label: "Estantería virtual", desc: "Ganchos, rieles y casilleros", icon: Layers, colorClass: "text-indigo-600 dark:text-indigo-400", bgClass: "bg-indigo-500/10" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-lg p-0 gap-0 overflow-hidden border-none shadow-2xl bg-background text-foreground">
        {/* STEPPER HEADER (COMPACT & SEAMLESS) */}
        <div className="bg-slate-50/70 dark:bg-slate-900/60 p-3 sm:px-4 sm:pt-3 sm:pb-2.5 relative border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center justify-between mb-2 pr-10">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/15 shadow-2xs">
                {step === 1 ? <Crown className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              </div>
              <div>
                <DialogTitle className="text-sm sm:text-base font-display font-bold text-foreground">
                  {initial ? `Editar plan "${f.nombre || ""}"` : "Crear nuevo plan"}
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground">
                  {step === 1
                    ? "Paso 1: Información básica, precios y capacidades"
                    : "Paso 2: Módulos habilitados y pasarelas Polar"}
                </p>
              </div>
            </div>
          </div>

          {/* Stepper Buttons (Centered Pills) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-200/60 dark:bg-slate-800/80">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-bold transition-all ${
                step === 1
                  ? "bg-primary text-white shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span
                className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-extrabold ${
                  step === 1
                    ? "bg-white/25 text-white"
                    : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                1
              </span>
              <span>Información y Límites</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!f.nombre?.trim()) { toast.error("Nombre del plan requerido"); return; }
                setStep(2);
              }}
              className={`flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-bold transition-all ${
                step === 2
                  ? "bg-primary text-white shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span
                className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-extrabold ${
                  step === 2
                    ? "bg-white/25 text-white"
                    : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                2
              </span>
              <span>Módulos y Checkout ({activeModsCount})</span>
            </button>
          </div>
        </div>

        {/* DIALOG BODY (COMPACT NO EXTRA GAPS) */}
        <div className="px-4 sm:px-5 py-3 max-h-[min(72vh,560px)] overflow-y-auto custom-scrollbar">
          {step === 1 ? (
            /* STEP 1: INFORMACIÓN BÁSICA, PRECIOS Y LÍMITES */
            <div className="space-y-2.5 animate-in fade-in slide-in-from-left-3 duration-200">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-0.5">
                  <Label className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">
                    ID Interno *
                  </Label>
                  <Input
                    value={f.id || ""}
                    onChange={(e) => setF({ ...f, id: e.target.value as PlanId })}
                    disabled={!!initial}
                    placeholder="ej. basico, pro, enterprise"
                    className="h-8 rounded-lg bg-surface border-border/60 text-xs font-mono"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">
                    Nombre Público *
                  </Label>
                  <Input
                    value={f.nombre || ""}
                    onChange={(e) => setF({ ...f, nombre: e.target.value })}
                    placeholder="Ej. Básico, Pro, Enterprise"
                    className="h-8 rounded-lg bg-surface border-border/60 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-0.5">
                  <Label className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">
                    Precio Mensual (RD$) *
                  </Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={f.precio_mensual !== undefined && f.precio_mensual !== null ? Number(f.precio_mensual).toLocaleString("en-US") : ""}
                    onChange={(e) => handlePriceInput("precio_mensual", e.target.value)}
                    placeholder="0"
                    className="h-8 rounded-lg bg-surface border-border/60 text-xs font-black text-primary"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">
                    Precio Anual (RD$)
                  </Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={f.precio_anual ? Number(f.precio_anual).toLocaleString("en-US") : ""}
                    onChange={(e) => handlePriceInput("precio_anual", e.target.value)}
                    placeholder="Opcional (ej. 25,000)"
                    className="h-8 rounded-lg bg-surface border-border/60 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* LÍMITES */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-0.5">
                  <Label className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">
                    Empleados
                  </Label>
                  <Input
                    type="number"
                    value={f.limite_empleados ?? 0}
                    onChange={(e) => setF({ ...f, limite_empleados: Number(e.target.value) })}
                    className="h-8 rounded-lg bg-surface border-border/60 text-xs text-center font-bold"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground" title="Dejar en blanco para ilimitadas">
                    Órdenes / Mes
                  </Label>
                  <Input
                    type="number"
                    value={f.limite_ordenes_mes ?? ""}
                    onChange={(e) => setF({ ...f, limite_ordenes_mes: e.target.value === "" ? null : Number(e.target.value) })}
                    placeholder="∞ Ilimitadas"
                    className="h-8 rounded-lg bg-surface border-border/60 text-xs text-center font-bold"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">
                    WhatsApp / Mes
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={f.limite_whatsapp_mes ?? 0}
                    onChange={(e) => setF({ ...f, limite_whatsapp_mes: Number(e.target.value) || 0 })}
                    placeholder="0 = Ilimitado"
                    className="h-8 rounded-lg bg-surface border-border/60 text-xs text-center font-bold"
                  />
                  <p className="text-[9px] text-muted-foreground text-center">0 = Ilimitado</p>
                </div>
              </div>

              {/* DESTACADO SWITCH (COMPACT) */}
              <label className="flex items-center justify-between p-2 px-2.5 rounded-xl border border-primary/20 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                  <div className="leading-tight">
                    <span className="text-xs font-bold text-foreground">Marcar como plan destacado / popular</span>
                    <p className="text-[9.5px] text-muted-foreground">Muestra la insignia en la tabla de precios</p>
                  </div>
                </div>
                <Switch checked={!!f.destacado} onCheckedChange={(v) => setF({ ...f, destacado: v })} />
              </label>

              {/* PLAN ESPECIAL SWITCH (INFERIOR SUTIL) */}
              <div className="rounded-xl border border-sky-200/80 dark:border-sky-800/60 bg-sky-50/40 dark:bg-sky-950/20 p-2.5 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
                    <div className="leading-tight">
                      <span className="text-xs font-bold text-foreground">Mostrar como Plan Especial / Barra inferior</span>
                      <p className="text-[9.5px] text-muted-foreground">Se mostrará sutilmente debajo de las 3 columnas principales sin alterar el diseño</p>
                    </div>
                  </div>
                  <Switch 
                    checked={!!f.es_especial} 
                    onCheckedChange={(v) => setF({ ...f, es_especial: v, titulo_especial: v ? (f.titulo_especial || "Plan especial") : f.titulo_especial })} 
                  />
                </label>

                {f.es_especial && (
                  <div className="pt-2 border-t border-sky-200/60 dark:border-sky-800/40 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    <Label className="text-[9.5px] font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">
                      Título / Indicador de la barra (ej: Plan especial, Plan Inicial, Edición Limitada)
                    </Label>
                    <Input
                      value={f.titulo_especial ?? "Plan especial"}
                      onChange={(e) => setF({ ...f, titulo_especial: e.target.value })}
                      placeholder="Plan especial"
                      className="h-8 rounded-lg bg-background border-sky-300 dark:border-sky-700 text-xs font-semibold"
                    />
                  </div>
                )}
              </div>

              {/* SUCURSALES ADICIONALES (COMPACT) */}
              <div className="rounded-xl border border-border/70 p-2.5 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" /> Multi-Sucursal (Pay-per-Branch)
                  </Label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <Label className="text-[9.5px] font-medium text-muted-foreground">Precio Sucursal Extra (RD$)</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={f.precio_sucursal_adicional ? Number(f.precio_sucursal_adicional).toLocaleString("en-US") : ""}
                      onChange={(e) => handlePriceInput("precio_sucursal_adicional", e.target.value)}
                      placeholder="1,200"
                      className="h-7.5 rounded-lg text-xs"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[9.5px] font-medium text-muted-foreground">Límite de Extras</Label>
                    <Input
                      type="number"
                      value={f.limite_sucursales_adicionales ?? ""}
                      onChange={(e) => setF({ ...f, limite_sucursales_adicionales: Number(e.target.value) || 0 })}
                      placeholder="3"
                      className="h-7.5 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[9.5px] font-medium text-muted-foreground flex items-center gap-1">
                    <ExternalLink className="h-3 w-3 text-primary" /> Polar Sucursal Checkout Link
                  </Label>
                  <Input
                    value={f.polar_sucursal_url || ""}
                    onChange={(e) => setF({ ...f, polar_sucursal_url: e.target.value })}
                    placeholder="https://buy.polar.sh/..."
                    className="h-7.5 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* STEP 2: MÓDULOS INCLUIDOS Y POLAR LINKS (COMPACT) */
            <div className="space-y-2.5 animate-in fade-in slide-in-from-right-3 duration-200">
              <div>
                <Label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Módulos incluidos en la suscripción
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {moduleItems.map(({ key, label, desc, icon: IconComp, colorClass, bgClass }) => {
                    const isChecked = !!mods?.[key];
                    return (
                      <div
                        key={key}
                        onClick={() => setMod(key, !isChecked)}
                        className={`flex items-center justify-between p-2 px-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                          isChecked
                            ? "bg-white dark:bg-slate-900 border-primary/40 shadow-2xs ring-1 ring-primary/20"
                            : "bg-surface/50 border-border/60 hover:bg-white hover:border-border"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-1.5">
                          <div className={`h-7 w-7 rounded-lg ${bgClass} ${colorClass} flex items-center justify-center shrink-0`}>
                            <IconComp className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-foreground leading-tight truncate">{label}</div>
                            <div className="text-[9.5px] text-muted-foreground leading-tight truncate">{desc}</div>
                          </div>
                        </div>
                        <Switch
                          checked={isChecked}
                          className="data-[state=checked]:bg-primary shrink-0 scale-90 pointer-events-none"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* POLAR CHECKOUT LINKS (COMPACT) */}
              <div className="rounded-xl border border-border/70 p-2.5 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-primary" /> Enlaces de Pago Polar
                </Label>
                <div className="space-y-1.5">
                  <div className="space-y-0.5">
                    <Label className="text-[9.5px] font-medium text-muted-foreground flex items-center gap-1">
                      <ExternalLink className="h-3 w-3 text-primary" /> Checkout Mensual Polar Link
                    </Label>
                    <Input
                      value={f.polar_product_monthly_url || ""}
                      onChange={(e) => setF({ ...f, polar_product_monthly_url: e.target.value })}
                      placeholder="https://buy.polar.sh/polar_cl_..."
                      className="h-7.5 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[9.5px] font-medium text-muted-foreground flex items-center gap-1">
                      <ExternalLink className="h-3 w-3 text-primary" /> Checkout Anual Polar Link
                    </Label>
                    <Input
                      value={f.polar_product_yearly_url || ""}
                      onChange={(e) => setF({ ...f, polar_product_yearly_url: e.target.value })}
                      placeholder="https://buy.polar.sh/polar_cl_..."
                      className="h-7.5 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DIALOG FOOTER (COMPACT & SEAMLESS) */}
        <div className="border-t border-border/50 p-2.5 sm:px-4 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/30">
          <div>
            {step === 1 ? (
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-8 rounded-lg text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 px-4 border border-slate-300 dark:border-slate-600 shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                Cancelar
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="h-8 rounded-lg text-xs font-bold gap-1 px-3"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver
              </Button>
            )}
          </div>

          <div>
            {step === 1 ? (
              <Button
                onClick={() => {
                  if (!f.nombre?.trim()) { toast.error("Nombre del plan requerido"); return; }
                  setStep(2);
                }}
                className="h-8 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold text-xs gap-1.5 shadow-2xs active:scale-95 transition-all px-3"
              >
                <span>Siguiente: Módulos</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                onClick={submit}
                className="h-8 rounded-lg bg-gradient-primary text-white font-bold text-xs shadow-xs active:scale-95 transition-all gap-1.5 px-3.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Guardar plan</span>
              </Button>
            )}
          </div>
        </div>
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
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl h-10 px-4 font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            Cancelar
          </Button>
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
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl h-10 px-4 font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            Cancelar
          </Button>
          <Button onClick={submit} className="bg-primary text-white font-bold rounded-xl h-11 px-6 shadow-md hover:bg-primary/95 transition-all">Guardar Licencia</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
