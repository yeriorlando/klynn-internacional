import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Building2, Shield, TrendingUp, Users, Trash2, ExternalLink, Plus, Pencil,
  RefreshCw, Package, LogOut, MoreHorizontal, Key, Droplets as DropletsIcon,
  CreditCard, Calendar
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
  const configs: Record<PlanId, { label: string; className: string }> = {
    basico: { label: "Básico", className: "bg-blue-50 text-blue-700 border-blue-200" },
    pro: { label: "Pro", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    enterprise: { label: "Enterprise", className: "bg-amber-50 text-amber-700 border-amber-200" },
  };
  const config = configs[id] || { label: id, className: "" };
  return (
    <Badge variant="outline" className={`px-3 py-0.5 rounded-full uppercase text-[10px] font-bold tracking-widest ${config.className}`}>
      {config.label}
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

  const [modOverrideWa, setModOverrideWa] = useState(false);
  const [modOverrideFiscal, setModOverrideFiscal] = useState(false);
  const [modOverrideMultisucursal, setModOverrideMultisucursal] = useState(false);
  const [modOverrideLogistica, setModOverrideLogistica] = useState(false);

  const [licencias, setLicencias] = useState<LicenciaLocal[]>([]);
  const [openLicenciaModal, setOpenLicenciaModal] = useState(false);
  const [editingLicencia, setEditingLicencia] = useState<LicenciaLocal | null>(null);
  const [deleteLicencia, setDeleteLicencia] = useState<LicenciaLocal | null>(null);

  useEffect(() => {
    async function load() {
      const [t, p, cfg, lics] = await Promise.all([getTenants(), getPlans(), getGlobalConfig(), getLicenciasLocales()]);
      setTenants(t);
      setPlans(p);
      setGlobalConfig(cfg);
      setLicencias(lics);
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

  const ingresos = tenants.reduce((s, t) => s + (plans.find((p) => p.id === t.plan_id)?.precio_mensual || 0), 0);

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
      await updateTenantModulosOverride(editingTenant.id, {
        whatsapp: modOverrideWa,
        facturacion_fiscal: modOverrideFiscal,
        multisucursal: modOverrideMultisucursal,
        logistica: modOverrideLogistica
      });

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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge variant="outline" className="border-gold/40 bg-gold/10"><Shield className="mr-1 h-3 w-3" /> Super Admin</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleLogout}
              className="h-9 px-4 rounded-lg font-bold shadow-md hover:opacity-90 transition-all"
            >
              <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="font-display text-4xl">Panel central Klynn</h1>
        <p className="mt-1 text-muted-foreground">Administra todas las lavanderías y los planes SaaS.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <KPI t="Lavanderías" v={String(tenants.length)} icon={Building2} />
          <KPI t="Activas" v={String(tenants.filter((t) => t.estado !== "CANCELADO").length)} icon={Users} />
          <KPI t="MRR estimado" v={formatRD(ingresos)} icon={TrendingUp} accent />
          <KPI t="Órdenes totales" v={String(totalOrdenes)} icon={Package} />
        </div>

        <Tabs defaultValue="tenants" className="mt-8">
          <TabsList>
            <TabsTrigger value="tenants">Lavanderías</TabsTrigger>
            <TabsTrigger value="plans">Planes SaaS</TabsTrigger>
            <TabsTrigger value="licencias">Licencias Desktop</TabsTrigger>
          </TabsList>

          <TabsContent value="tenants">
            <Card className="overflow-hidden border-none shadow-card">
              <div className="border-b border-border p-4"><h2 className="font-display text-xl">Lavanderías registradas</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-elevated text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-6 py-4 text-left font-bold">Marca</th>
                      <th className="px-6 py-4 text-center font-bold">Plan</th>
                      <th className="px-6 py-4 text-center font-bold">Estado</th>
                      <th className="px-6 py-4 text-center font-bold">Órdenes</th>
                      <th className="px-6 py-4 text-right font-bold">Ingresos</th>
                      <th className="px-6 py-4 text-center font-bold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((t) => {
                      const tenantOrds = ordenesByTenant[t.id] || { count: 0, total: 0 };
                      return (
                        <tr key={t.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="h-9 w-9 rounded-xl overflow-hidden flex items-center justify-center border border-slate-100 shadow-sm shrink-0 bg-white"
                                style={{
                                  background: t.logo_url ? "white" : `linear-gradient(135deg, ${t.color_primario}, ${t.color_secundario})`
                                }}
                              >
                                {t.logo_url ? (
                                  <img src={t.logo_url} alt="Logo" className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-[10px] font-bold text-white uppercase">{t.nombre.charAt(0)}</span>
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-foreground">{t.nombre}</div>
                                <div className="text-xs text-muted-foreground/80">{t.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <PlanBadge id={t.plan_id} />
                          </td>
                          <td className="px-6 py-4 text-center"><Badge variant="outline" className="bg-background">{t.estado === "TRIAL" ? "Prueba" : t.estado}</Badge></td>
                          <td className="px-6 py-4 text-center font-medium">{tenantOrds.count}</td>
                          <td className="px-6 py-4 text-right font-bold text-primary">{formatRD(tenantOrds.total)}</td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-accent">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-elegant border border-border/50 p-1">
                                  <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 py-1.5 font-bold">Gestión de Sucursal</DropdownMenuLabel>
                                  <DropdownMenuItem
                                    className="rounded-lg gap-2 cursor-pointer py-2"
                                    onClick={() => {
                                      // Admin accede directo — no necesita ser empleado
                                      setSession({ empleado_id: 'admin', tenant_id: t.id, iniciado_en: new Date().toISOString() });
                                      setActiveTenant(t.slug);
                                      toast.success(`Entrando a ${t.nombre}...`);
                                      setTimeout(() => window.location.assign(`/t/${t.slug}`), 500);
                                    }}
                                  >
                                    <ExternalLink className="h-4 w-4 text-primary" /> Visitar lavandería
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="rounded-lg gap-2 cursor-pointer py-2"
                                    onClick={() => {
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

                                      // Inicializar interruptores de módulos
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

                                      setOpenEditModal(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4 text-primary" /> Editar lavandería
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator className="bg-border/50 my-1" />

                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <button className="relative flex w-full cursor-default select-none items-center rounded-lg gap-2 px-2 py-2 text-sm outline-none transition-colors hover:bg-destructive/10 hover:text-destructive text-destructive font-medium">
                                        <Trash2 className="h-4 w-4" /> Eliminar lavandería
                                      </button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-2xl border-none shadow-card">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Esta acción eliminará permanentemente la lavandería <strong>{t.nombre}</strong> y todos sus datos asociados.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={async () => { await deleteTenant(t.id); setTick((r) => r + 1); toast.success("Lavandería eliminada"); }}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                                        >
                                          Eliminar
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {tenants.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-muted-foreground font-medium">No se encontraron lavanderías registradas</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
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
                          { key: "logistica", label: "Logística" }
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5 py-2">
            {/* Correo Administrativo */}
            <div className="space-y-1">
              <Label htmlFor="edit-email" className="text-xs font-semibold text-slate-655">Correo Administrativo</Label>
              <div className="relative">
                <Users className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="edit-email"
                  type="email"
                  className="pl-10 rounded-xl h-10 text-sm"
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
                <SelectTrigger className="h-10 rounded-xl text-sm">
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
                  className="pl-10 rounded-xl h-10 text-sm"
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
                  }
                }}
              >
                <SelectTrigger className="h-10 rounded-xl text-sm">
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

            {/* Días de vigencia / prueba del plan */}
            <div className="space-y-1">
              <Label htmlFor="edit-days-limit" className="text-xs font-semibold text-slate-655">Días de vigencia / prueba del plan</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="edit-days-limit"
                  type="number"
                  min={0}
                  className="pl-10 rounded-xl h-10 text-sm"
                  value={newDaysLimit}
                  onChange={(e) => setNewDaysLimit(Number(e.target.value) || 0)}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Fecha de renovación: <strong className="text-primary font-bold">{new Date(Date.now() + newDaysLimit * 24 * 60 * 60 * 1000).toLocaleDateString("es-DO")}</strong>
              </p>
            </div>

            {/* Sucursales Habilitadas */}
            <div className="space-y-1">
              <Label htmlFor="edit-max-sucursales" className="text-xs font-semibold text-slate-655">Sucursales Habilitadas (Cupo Total)</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="edit-max-sucursales"
                  type="number"
                  min={1}
                  className="pl-10 rounded-xl h-10 font-bold text-sm"
                  value={newMaxSucursales}
                  onChange={(e) => setNewMaxSucursales(Number(e.target.value) || 1)}
                />
              </div>
            </div>

            {/* SECCIÓN MÓDULOS PERSONALIZADOS */}
            <div className="md:col-span-2 border-t pt-3.5 mt-2">
              <Label className="text-slate-700 dark:text-slate-355 font-bold block mb-2 text-xs uppercase tracking-wider">
                Módulos Habilitados para esta Lavandería (Personalización)
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className="flex items-center justify-between rounded-xl border border-input p-2.5 px-3 bg-card shadow-sm cursor-pointer hover:bg-accent/10 transition-all">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">WhatsApp</span>
                    <span className="text-[9px] text-muted-foreground leading-tight">Mensajería y alertas</span>
                  </div>
                  <Switch
                    checked={modOverrideWa}
                    onCheckedChange={setModOverrideWa}
                  />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-input p-2.5 px-3 bg-card shadow-sm cursor-pointer hover:bg-accent/10 transition-all">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">Facturación</span>
                    <span className="text-[9px] text-muted-foreground leading-tight">DGII (e-CF / NCF)</span>
                  </div>
                  <Switch
                    checked={modOverrideFiscal}
                    onCheckedChange={setModOverrideFiscal}
                  />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-input p-2.5 px-3 bg-card shadow-sm cursor-pointer hover:bg-accent/10 transition-all">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">Sucursales</span>
                    <span className="text-[9px] text-muted-foreground leading-tight">Múltiples locales</span>
                  </div>
                  <Switch
                    checked={modOverrideMultisucursal}
                    onCheckedChange={setModOverrideMultisucursal}
                  />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-input p-2.5 px-3 bg-card shadow-sm cursor-pointer hover:bg-accent/10 transition-all">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">Logística</span>
                    <span className="text-[9px] text-muted-foreground leading-tight">Repartidores y envíos</span>
                  </div>
                  <Switch
                    checked={modOverrideLogistica}
                    onCheckedChange={setModOverrideLogistica}
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

function KPI({ t, v, icon: Icon, accent }: { t: string; v: string; icon: typeof Building2; accent?: boolean }) {
  return (
    <Card className={`border-none p-5 shadow-card ${accent ? "bg-gradient-primary text-white" : ""}`}>
      <div className="flex items-start justify-between">
        <div className={`text-xs uppercase ${accent ? "text-white/80" : "text-muted-foreground"}`}>{t}</div>
        <Icon className={`h-4 w-4 ${accent ? "text-white/80" : "text-muted-foreground"}`} />
      </div>
      <div className="mt-2 font-display text-3xl">{v}</div>
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
      modulos: { whatsapp: false, facturacion_fiscal: false, multisucursal: false, logistica: false },
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
                {(["whatsapp", "facturacion_fiscal", "multisucursal", "logistica"] as const).map((m) => (
                  <label key={m} className="flex items-center gap-3 text-sm p-1 rounded-lg transition-colors cursor-pointer group">
                    <Switch
                      checked={!!mods?.[m]}
                      onCheckedChange={(v) => setMod(m, v)}
                      className="data-[state=checked]:bg-primary"
                    />
                    <span className="font-semibold capitalize text-foreground group-hover:text-primary transition-colors">
                      {m === "logistica" ? "Logística y Repartidores" : m === "facturacion_fiscal" ? "Facturación Electrónica" : m.replace(/_/g, " ")}
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
