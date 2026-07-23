import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { UserPlus, Trash2, Shield, Eye, EyeOff, Loader2, User, ShieldCheck, ArrowRight, ArrowLeft, CheckCircle2, RotateCcw, Check, Lock, KeyRound, Sparkles } from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getEmpleados, saveEmpleado, deleteEmpleado, getOrdenes, formatRD, uid,
  PERMISOS_SISTEMA, getPermisosPorRol, can,
  type Empleado, type RolEmpleado, type Orden, type Caja
} from "@/lib/storage";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { checkPlanLimits } from "@/lib/storage";
import { PlanLimitModal } from "@/components/klynn/PlanLimitModal";
import { UserAvatar } from "@/components/klynn/UserAvatar";
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

function getRoleBadgeClass(rol: RolEmpleado) {
  switch (rol) {
    case "ADMIN":
      return "bg-rose-600 text-white border-rose-700 shadow-2xs";
    case "SUPERVISOR":
      return "bg-indigo-600 text-white border-indigo-700 shadow-2xs";
    case "VENDEDOR":
      return "bg-emerald-600 text-white border-emerald-700 shadow-2xs";
    case "RECEPCIONISTA":
      return "bg-amber-500 text-white border-amber-600 shadow-2xs";
    case "REPARTIDOR":
      return "bg-sky-600 text-white border-sky-700 shadow-2xs";
    default:
      return "bg-slate-700 text-white";
  }
}

export const Route = createFileRoute("/t/$slug/personal")({ component: PersonalPage });

function PersonalPage() {
  const user = useRequireAuth();
  const [refresh, setRefresh] = useState(0);
  const [edit, setEdit] = useState<Empleado | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [emps, setEmps] = useState<Empleado[]>([]);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [limits, setLimits] = useState<any>({ employeesReached: false, employeeLimit: 0 });
  const [loading, setLoading] = useState(true);

  const tenant = user?.tenant;
  const tenantId = tenant?.id || '';

  useEffect(() => {
    async function load() {
      if (!user || !tenant || !tenantId || tenantId === '__loading__') return;
      setLoading(true);
      const [eList, oList, lim] = await Promise.all([
        getEmpleados(tenantId),
        getOrdenes(tenantId),
        checkPlanLimits(tenant)
      ]);
      setEmps(eList);
      setOrdenes(oList);
      setLimits(lim);
      setLoading(false);
    }
    load();
  }, [tenantId, refresh]);

  if (!user || user.tenant.id === '__loading__') return null;

  if (!can(user.empleado, "personal")) {
    return <NoAccess />;
  }



  function handleAdd() {
    if (limits.employeesReached) {
      setShowLimitModal(true);
    } else {
      setShowNew(true);
    }
  }

  const staffCount = emps.filter(e => e.rol !== "ADMIN").length;

  return (
    <div>
      <PageHeader title="Personal" description={`${staffCount} empleados (excluyendo administradores)`}>
        <Button onClick={handleAdd} className="bg-gradient-primary text-white"><UserPlus className="mr-1.5 h-4 w-4" /> Nuevo empleado</Button>
      </PageHeader>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {emps.map((e) => {
          const stats = ordenes.filter((o) => o.empleado_id === e.id && o.estado !== "ANULADA");
          const total = stats.reduce((s, o) => s + o.total, 0);
          return (
            <Card key={e.id} className="cursor-pointer p-5 hover:shadow-elegant" onClick={() => setEdit(e)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={[e.nombre, e.apellido].filter(Boolean).join(" ")}
                    avatarUrl={e.avatar_url}
                    size={40}
                    className="border border-border shadow-sm shrink-0"
                  />
                  <div>
                    <div className="font-display text-base font-bold text-slate-900 dark:text-white leading-tight">
                      {e.nombre} {e.apellido || ""}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{e.email}</div>
                  </div>
                </div>
                <Badge className={`border-none text-[10px] ${getRoleBadgeClass(e.rol)}`}>{e.rol}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
                <div><div className="text-muted-foreground">Órdenes</div><div className="font-display text-base">{stats.length}</div></div>
                <div><div className="text-muted-foreground">Ventas</div><div className="font-display text-base">{formatRD(total)}</div></div>
              </div>
            </Card>
          );
        })}
      </div>
      <EmpleadoDialog open={showNew || !!edit} onOpenChange={(o) => { if (!o) { setShowNew(false); setEdit(null); } }} empleado={edit} tenantId={user.tenant.id} onDone={() => { setRefresh((r) => r + 1); setShowNew(false); setEdit(null); }} />

      <PlanLimitModal
        open={showLimitModal}
        onOpenChange={setShowLimitModal}
        type="employees"
        limit={limits.employeeLimit}
        tenant={user.tenant}
      />
    </div>
  );
}

function EmpleadoDialog({ open, onOpenChange, empleado, tenantId, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; empleado: Empleado | null; tenantId: string; onDone: () => void }) {
  const empty = { nombre: "", apellido: "", email: "", password: "", pin: "", rol: "VENDEDOR" as RolEmpleado, activo: true, permisos: getPermisosPorRol("VENDEDOR"), max_descuento_porcentaje: 10 };
  const [f, setF] = useState(empleado ? { ...empty, ...empleado, permisos: empleado.permisos || getPermisosPorRol(empleado.rol), max_descuento_porcentaje: empleado.max_descuento_porcentaje ?? 10 } : empty);
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setStep(1);
    if (empleado) {
      setF({ ...empty, ...empleado, permisos: empleado.permisos || getPermisosPorRol(empleado.rol), max_descuento_porcentaje: empleado.max_descuento_porcentaje ?? (empleado.rol === "ADMIN" ? 100 : 10), password: "" });
    } else {
      setF(empty);
    }
  }, [empleado, open]);

  const togglePermiso = (id: string) => {
    const next = f.permisos.includes(id)
      ? f.permisos.filter(p => p !== id)
      : [...f.permisos, id];
    setF({ ...f, permisos: next });
  };

  const selectAllPermisos = () => {
    setF({ ...f, permisos: PERMISOS_SISTEMA.map(p => p.id) });
  };

  const deselectAllPermisos = () => {
    setF({ ...f, permisos: [] });
  };

  const resetRoleDefaults = () => {
    const defaults = getPermisosPorRol(f.rol);
    setF({ ...f, permisos: defaults });
    toast.info(`Permisos restablecidos para el rol ${f.rol}`);
  };

  function handleNext() {
    const nom = (f.nombre || "").trim();
    const ape = (f.apellido || "").trim();
    const em = (f.email || "").trim();

    if (!nom || !ape) {
      toast.error("Por favor ingresa nombre y apellido del empleado");
      return;
    }
    if (!em || !em.includes("@")) {
      toast.error("Ingresa un correo electrónico válido");
      return;
    }
    if (!empleado && (f.password || "").length < 8) {
      toast.error("La contraseña inicial debe tener al menos 8 caracteres");
      return;
    }
    setStep(2);
  }

  async function submit() {
    const nom = (f.nombre || "").trim();
    const ape = (f.apellido || "").trim();
    const em = (f.email || "").trim();

    if (!nom || !ape || !em.includes("@")) {
      toast.error("Nombre, apellido y email válidos requeridos");
      setStep(1);
      return;
    }
    if (!empleado && (f.password || "").length < 8) {
      toast.error("La contraseña inicial debe tener al menos 8 caracteres");
      setStep(1);
      return;
    }

    setLoading(true);
    try {
      const e: Empleado = {
        id: empleado?.id || uid("emp"),
        tenant_id: tenantId,
        nombre: f.nombre,
        apellido: f.apellido || undefined,
        email: f.email,
        password: f.password || (empleado ? '***' : ""),
        pin: f.pin || undefined,
        rol: f.rol,
        activo: f.activo,
        permisos: f.permisos,
        max_descuento_porcentaje: f.rol === "ADMIN" ? 100 : Number(f.max_descuento_porcentaje) || 0,
        creado_en: empleado?.creado_en || new Date().toISOString(),
      };
      await saveEmpleado(e);
      toast.success("Empleado guardado correctamente");
      onDone();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al guardar empleado");
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (empleado) {
      setLoading(true);
      try {
        await deleteEmpleado(empleado.id);
        toast.success("Empleado eliminado");
        onDone();
      } catch (err) {
        toast.error("Error al eliminar");
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-lg p-0 overflow-hidden border-none shadow-2xl bg-background text-foreground">
        {/* STEPPER HEADER (PREMIUM LIGHT REDESIGN) */}
        <div className="bg-slate-50/70 dark:bg-slate-900/60 p-4 sm:p-5 pb-1.5 relative">
          {/* Title row with right padding to clear the close icon */}
          <div className="flex items-center justify-between mb-2 pr-10">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/15 shadow-xs">
                {step === 1 ? <User className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              </div>
              <div>
                <DialogTitle className="text-base font-display text-foreground">
                  {empleado ? "Editar empleado" : "Nuevo empleado"}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  {step === 1 ? "Paso 1: Datos personales y de acceso" : "Paso 2: Permisos por módulo del sistema"}
                </p>
              </div>
            </div>
          </div>

          {/* Stepper Buttons (Perfectly Centered across full width) */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-200/60 dark:bg-slate-800/80">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                step === 1
                  ? "bg-primary text-white shadow-md font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                step === 1 ? "bg-white/25 text-white" : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
              }`}>
                1
              </span>
              <span>Información Básica</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                step === 2
                  ? "bg-primary text-white shadow-md font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                step === 2 ? "bg-white/25 text-white" : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
              }`}>
                2
              </span>
              <span>Permisos ({f.permisos.length})</span>
            </button>
          </div>
        </div>

        {/* DIALOG BODY (ULTRA COMPACT NO GAP) */}
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1.5">
          {step === 1 ? (
            /* STEP 1: INFORMACIÓN Y ACCESO */
            <div className="space-y-3 animate-in fade-in slide-in-from-left-3 duration-200">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nombre *</Label>
                  <Input
                    value={f.nombre}
                    onChange={(e) => setF({ ...f, nombre: e.target.value })}
                    placeholder="Ej. Juan"
                    className="h-9 rounded-xl bg-surface border-border/60 text-xs focus:ring-1 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Apellido *</Label>
                  <Input
                    value={f.apellido}
                    onChange={(e) => setF({ ...f, apellido: e.target.value })}
                    placeholder="Ej. Pérez"
                    className="h-9 rounded-xl bg-surface border-border/60 text-xs focus:ring-1 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Correo Electrónico *</Label>
                <Input
                  type="email"
                  value={f.email}
                  onChange={(e) => setF({ ...f, email: e.target.value })}
                  placeholder="empleado@klynn.do"
                  className="h-9 rounded-xl bg-surface border-border/60 text-xs focus:ring-1 focus:ring-primary/20"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {empleado ? "Cambiar contraseña" : "Contraseña *"}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={f.password}
                      onChange={(e) => setF({ ...f, password: e.target.value })}
                      placeholder={empleado ? "••••••••" : "Mín. 8 caracteres"}
                      className="h-9 rounded-xl bg-surface border-border/60 pr-8 text-xs focus:ring-1 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-0.5"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">PIN Acceso Rápido (POS)</Label>
                  <Input
                    value={f.pin}
                    onChange={(e) => setF({ ...f, pin: e.target.value.slice(0, 4) })}
                    placeholder="4 dígitos"
                    maxLength={4}
                    className="h-9 rounded-xl bg-surface border-border/60 tracking-widest font-mono text-center text-xs focus:ring-1 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 items-center">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rol en el negocio</Label>
                  <Select
                    value={f.rol}
                    onValueChange={(v) => {
                      const rol = v as RolEmpleado;
                      setF({ ...f, rol, permisos: getPermisosPorRol(rol) });
                    }}
                  >
                    <SelectTrigger className="h-9 rounded-xl bg-surface border-border/60 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {(["ADMIN", "SUPERVISOR", "VENDEDOR", "RECEPCIONISTA", "REPARTIDOR"] as RolEmpleado[]).map((r) => (
                        <SelectItem key={r} value={r} className="rounded-lg text-xs">
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between h-9 px-3 rounded-xl border border-border/60 bg-surface/50 mt-4 sm:mt-4">
                  <div className="flex items-center gap-2">
                    <Checkbox id="activo" checked={f.activo} onCheckedChange={(v) => setF({ ...f, activo: !!v })} />
                    <Label htmlFor="activo" className="text-xs font-bold cursor-pointer">Empleado Activo</Label>
                  </div>
                  <Badge variant={f.activo ? "default" : "outline"} className={f.activo ? "bg-emerald-600 text-white text-[9px] px-1.5 py-0" : "text-[9px] px-1.5 py-0"}>
                    {f.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </div>

              <div>
                <PasswordStrengthIndicator password={f.password} />
              </div>
            </div>
          ) : (
            /* STEP 2: PERMISOS DE ACCESO */
            <div className="space-y-3 animate-in fade-in slide-in-from-right-3 duration-200">
              {/* Toolbar Actions (Primary Brand Background Card) */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 p-2 px-3 rounded-xl bg-primary/10 border border-primary/20 shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <Badge className={`font-semibold text-[10px] px-2.5 py-0.5 border-none ${getRoleBadgeClass(f.rol)}`}>
                    Rol: {f.rol}
                  </Badge>
                  <span className="text-[11px] font-medium text-primary-dark dark:text-primary-light">
                    ({f.permisos.length}/{PERMISOS_SISTEMA.length})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetRoleDefaults}
                    disabled={f.rol === "ADMIN"}
                    className="h-7 rounded-lg text-[10px] text-primary hover:bg-primary/10 gap-1 px-2"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Valores del Rol
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectAllPermisos}
                    disabled={f.rol === "ADMIN"}
                    className="h-7 rounded-lg text-[10px] text-slate-700 hover:bg-slate-200 dark:text-slate-300 px-2"
                  >
                    Todos
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={deselectAllPermisos}
                    disabled={f.rol === "ADMIN"}
                    className="h-7 rounded-lg text-[10px] text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-800 px-2"
                  >
                    Ninguno
                  </Button>
                </div>
              </div>

              {f.rol === "ADMIN" && (
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-[11px] text-primary-dark font-medium leading-tight">
                    Los usuarios con rol <strong>ADMINISTRADOR</strong> tienen acceso total a todos los módulos.
                  </p>
                </div>
              )}

              {/* Límite de Descuento Permitido */}
              <div className="p-2.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    Descuento Máximo Permitido
                  </div>
                  <p className="text-[10px] text-amber-700/90 dark:text-amber-300/80 leading-tight">
                    Porcentaje máximo de descuento que este usuario podrá aplicar en POS / Nueva Orden.
                  </p>
                </div>
                <div className="relative w-24 shrink-0">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    disabled={f.rol === "ADMIN"}
                    value={f.rol === "ADMIN" ? 100 : (f.max_descuento_porcentaje ?? 10)}
                    onChange={(e) => {
                      const num = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                      setF({ ...f, max_descuento_porcentaje: num });
                    }}
                    className="h-8 text-center font-black text-xs rounded-xl bg-white dark:bg-slate-900 border-amber-300/80 dark:border-amber-700/80 pr-6"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-amber-600 dark:text-amber-400 pointer-events-none">%</span>
                </div>
              </div>

              {/* Grid of Permissions */}
              <ScrollArea className="h-[220px] pr-1.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-1">
                  {PERMISOS_SISTEMA.map((p) => {
                    const isChecked = f.permisos.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => f.rol !== "ADMIN" && togglePermiso(p.id)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isChecked
                            ? "bg-white dark:bg-slate-900 border-primary/40 shadow-xs ring-1 ring-primary/20"
                            : "bg-surface/50 border-border/50 hover:bg-white hover:border-border"
                        } ${f.rol === "ADMIN" ? "opacity-90 pointer-events-none" : ""}`}
                      >
                        <Checkbox
                          id={p.id}
                          checked={isChecked}
                          onCheckedChange={() => togglePermiso(p.id)}
                          disabled={f.rol === "ADMIN"}
                          className="mt-0.5 rounded-md h-3.5 w-3.5"
                        />
                        <div className="grid gap-0.5">
                          <Label htmlFor={p.id} className="text-xs font-bold leading-tight cursor-pointer">
                            {p.nombre}
                          </Label>
                          <p className="text-[10px] text-muted-foreground leading-tight">{p.descripcion}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* FOOTER ACTIONS (COMPACT) */}
          <div className="pt-3 mt-3 border-t border-border/50 flex items-center justify-between gap-2">
            <div>
              {empleado && step === 1 ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-3 text-xs h-8.5 gap-1 transition-all active:scale-95 border-none shadow-sm">
                      <Trash2 className="h-3.5 w-3.5 text-white" /> Eliminar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-lg">¿Eliminar a {empleado.nombre}?</AlertDialogTitle>
                      <AlertDialogDescription className="text-xs">
                        Esta acción es irreversible. Se eliminará el acceso del empleado.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                      <AlertDialogCancel className="rounded-xl h-9 text-xs">Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={remove} className="bg-destructive text-white rounded-xl h-9 text-xs hover:bg-destructive/90">Confirmar eliminación</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : step === 2 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="rounded-xl h-8.5 px-3 text-xs font-bold gap-1 border-slate-300"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Anterior
                </Button>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl h-8.5 px-3 text-xs font-medium border-slate-200"
              >
                Cancelar
              </Button>

              {step === 1 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="bg-primary hover:bg-primary/95 text-white rounded-xl h-8.5 px-4 text-xs font-bold shadow-sm gap-1 transition-all active:scale-95"
                >
                  Siguiente: Permisos <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={submit}
                  disabled={loading}
                  className="bg-gradient-primary text-white rounded-xl h-8.5 px-5 text-xs font-bold shadow-glow hover:opacity-95 disabled:opacity-50 transition-all active:scale-95 gap-1"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <>Guardar Empleado <CheckCircle2 className="h-3.5 w-3.5" /></>}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PasswordStrengthIndicator({ password }: { password: string }) {
  const getStrength = (p: string) => {
    let score = 0;
    if (!p) return 0;
    if (p.length >= 6) score++;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };

  const strength = Math.min(4, getStrength(password));
  const colors = ["bg-slate-200", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-success"];
  const labels = ["", "Muy débil", "Débil", "Media", "Fuerte"];

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= strength ? colors[strength] : "bg-slate-100"
              }`}
          />
        ))}
      </div>
      {password && (
        <div className="flex items-center justify-between">
          <p className={`text-[10px] font-bold uppercase tracking-wider ${strength <= 2 ? "text-orange-500" : "text-success"}`}>
            Seguridad: {labels[strength]}
          </p>
        </div>
      )}
    </div>
  );
}

function NoAccess() {
  return (
    <Card className="p-12 text-center">
      <Shield className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
      <h3 className="font-display text-2xl">Acceso restringido</h3>
      <p className="text-sm text-muted-foreground">Solo administradores pueden ver esta página.</p>
    </Card>
  );
}
