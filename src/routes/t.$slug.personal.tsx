import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  UserPlus,
  Trash2,
  Shield,
  Eye,
  EyeOff,
  Loader2,
  User,
  Mail,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  Check,
  Lock,
  KeyRound,
  Sparkles,
  Pencil,
  ShoppingCart,
  DollarSign,
  LayoutDashboard,
  ShoppingBag,
  PlusCircle,
  Wrench,
  Wallet,
  Users,
  Layers,
  UserCheck,
  Truck,
  Receipt,
  BarChart3,
  Settings,
  FileMinus,
  FilePlus,
  Ban,
  BadgePercent,
} from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getEmpleados,
  saveEmpleado,
  deleteEmpleado,
  getOrdenes,
  formatRD,
  uid,
  PERMISOS_SISTEMA,
  getPermisosPorRol,
  can,
  sendEmployeeSignUpOtp,
  resendEmployeeSignUpOtp,
  verifyEmployeeOtpAndSave,
  getGlobalConfig,
  type Empleado,
  type RolEmpleado,
  type Orden,
  type Caja,
  type GlobalConfig,
} from "@/lib/storage";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const PERMISOS_CONFIG: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  dashboard: { icon: LayoutDashboard, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-950/60", border: "border-sky-200 dark:border-sky-800" },
  "nueva-orden": { icon: PlusCircle, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/60", border: "border-emerald-200 dark:border-emerald-800" },
  ordenes: { icon: ShoppingBag, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/60", border: "border-blue-200 dark:border-blue-800" },
  procesos: { icon: Wrench, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-950/60", border: "border-teal-200 dark:border-teal-800" },
  caja: { icon: Wallet, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/60", border: "border-amber-200 dark:border-amber-800" },
  clientes: { icon: Users, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/60", border: "border-purple-200 dark:border-purple-800" },
  catalogo: { icon: Layers, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/60", border: "border-indigo-200 dark:border-indigo-800" },
  personal: { icon: UserCheck, color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-950/60", border: "border-pink-200 dark:border-pink-800" },
  logistica: { icon: Truck, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/60", border: "border-orange-200 dark:border-orange-800" },
  gastos: { icon: Receipt, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/60", border: "border-red-200 dark:border-red-800" },
  reportes: { icon: BarChart3, color: "text-fuchsia-600 dark:text-fuchsia-400", bg: "bg-fuchsia-50 dark:bg-fuchsia-950/60", border: "border-fuchsia-200 dark:border-fuchsia-800" },
  configuracion: { icon: Settings, color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-100 dark:bg-slate-800", border: "border-slate-300 dark:border-slate-700" },
  "anular-orden": { icon: Ban, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/60", border: "border-rose-200 dark:border-rose-800" },
  "condonar-deuda": { icon: BadgePercent, color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-950/60", border: "border-amber-300 dark:border-amber-700" },
  "nota-credito": { icon: FileMinus, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-950/60", border: "border-cyan-200 dark:border-cyan-800" },
  "nota-debito": { icon: FilePlus, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/60", border: "border-violet-200 dark:border-violet-800" },
};

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
    case "OPERARIO":
      return "bg-teal-600 text-white border-teal-700 shadow-2xs";
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

  const [globalConfig, setGlobalConfig] = useState<GlobalConfig | null>(null);

  const tenant = user?.tenant;
  const tenantId = tenant?.id || "";

  useEffect(() => {
    async function load() {
      if (!user || !tenant || !tenantId || tenantId === "__loading__") return;
      setLoading(true);
      const [eList, oList, lim, cfg] = await Promise.all([
        getEmpleados(tenantId),
        getOrdenes(tenantId),
        checkPlanLimits(tenant),
        getGlobalConfig(),
      ]);
      setEmps(eList);
      setOrdenes(oList);
      setLimits(lim);
      setGlobalConfig(cfg);
      setLoading(false);
    }
    load();
  }, [tenantId, refresh]);

  if (!user || user.tenant.id === "__loading__" || (loading && emps.length === 0)) {
    return <GlobalPageLoader text="Cargando personal..." />;
  }

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

  const staffCount = emps.filter((e) => e.rol !== "ADMIN").length;

  return (
    <div>
      {/* HEADER DE PÁGINA */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-foreground tracking-tight">Personal</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-medium">
            {staffCount} empleados (excluyendo administradores)
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button 
            onClick={handleAdd} 
            className="flex items-center gap-2 rounded-xl h-10 px-5 font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
          >
            <UserPlus className="h-4 w-4 text-[#F0B900] shrink-0" />
            <span>Nuevo empleado</span>
          </Button>
        </div>
      </div>

      {/* GRID DE 3 COLUMNAS DE TARJETAS */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {emps.map((e) => {
          const stats = ordenes.filter((o) => o.empleado_id === e.id && o.estado !== "ANULADA");
          const total = stats.reduce((s, o) => s + o.total, 0);
          const approvedPerms = e.rol === "ADMIN"
            ? PERMISOS_SISTEMA
            : PERMISOS_SISTEMA.filter((p) =>
                (e.permisos && e.permisos.length > 0 ? e.permisos : getPermisosPorRol(e.rol)).includes(p.id)
              );

          return (
            <Card
              key={e.id}
              onClick={() => setEdit(e)}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/80 bg-surface p-5 shadow-2xs transition-all duration-200 hover:shadow-md hover:border-[#1B4B73]/40 active:scale-[0.99] flex flex-col justify-between gap-3.5"
            >
              {/* Header: Avatar, Name, Email (1 sola línea), Role & Pencil */}
              <div className="flex items-center justify-between gap-2.5 min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <UserAvatar
                    name={[e.nombre, e.apellido].filter(Boolean).join(" ")}
                    avatarUrl={e.avatar_url}
                    size={44}
                    className="border border-border/80 shadow-2xs ring-2 ring-[#1B4B73]/15 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-[15px] font-bold text-foreground group-hover:text-[#1B4B73] dark:group-hover:text-sky-300 transition-colors truncate">
                      {e.nombre} {e.apellido || ""}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium truncate block mt-0.5" title={e.email}>
                      {e.email}
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <Badge className={`border-none text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-2xs ${getRoleBadgeClass(e.rol)}`}>
                    {e.rol}
                  </Badge>
                </div>
              </div>

              {/* Permisos Activos con Iconos Circulares */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-extrabold uppercase tracking-wide text-[10px]">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Permisos activos</span>
                  </span>
                  {e.rol === "ADMIN" ? (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-500/30 font-black shadow-2xs">
                      Acceso Total
                    </span>
                  ) : (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/30 font-black shadow-2xs">
                      {approvedPerms.length} activos
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 min-h-[30px]">
                  {approvedPerms.length > 0 ? (
                    approvedPerms.map((p) => {
                      const conf = PERMISOS_CONFIG[p.id] || { icon: Shield, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" };
                      const Icon = conf.icon;

                      return (
                        <div
                          key={p.id}
                          title={`${p.nombre}: ${p.descripcion}`}
                          className={`h-7 w-7 rounded-full flex items-center justify-center border shadow-2xs transition-transform hover:scale-115 cursor-help ${conf.bg} ${conf.border} ${conf.color}`}
                        >
                          <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-xs text-muted-foreground italic py-1">Sin permisos asignados</span>
                  )}
                </div>
              </div>

              {/* KPI Mini-Boxes: Órdenes & Ventas Realizadas */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                <div className="rounded-xl bg-muted/40 dark:bg-muted/20 px-3 py-2 border border-border/40 shrink-0 min-w-[80px]">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                    <ShoppingCart className="h-3 w-3 text-[#1B4B73] dark:text-sky-400 shrink-0" />
                    <span>Órdenes</span>
                  </div>
                  <div className="font-display text-base font-black text-foreground mt-0.5">
                    {stats.length}
                  </div>
                </div>

                <div className="rounded-xl bg-muted/40 dark:bg-muted/20 px-3 py-2 border border-border/40 flex-1 min-w-0">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Ventas Realizadas</span>
                  </div>
                  <div className="font-display text-[15px] sm:text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5 whitespace-nowrap overflow-x-auto scrollbar-none">
                    {formatRD(total)}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <EmpleadoDialog
        open={showNew || Boolean(edit)}
        onOpenChange={(o) => {
          if (!o) {
            setShowNew(false);
            setEdit(null);
          }
        }}
        empleado={edit}
        tenantId={user.tenant.id}
        existingEmployees={emps}
        currentUserEmail={user.empleado.email}
        currentEmployeeId={user.empleado.id}
        requireEmployeeOtp={Boolean(globalConfig?.requireEmployeeOtp)}
        onDone={() => {
          setRefresh((r) => r + 1);
          setShowNew(false);
          setEdit(null);
        }}
      />

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

function EmpleadoDialog({
  open,
  onOpenChange,
  empleado,
  tenantId,
  existingEmployees = [],
  currentUserEmail,
  currentEmployeeId,
  requireEmployeeOtp = false,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  empleado: Empleado | null;
  tenantId: string;
  existingEmployees?: Empleado[];
  currentUserEmail?: string;
  currentEmployeeId?: string;
  requireEmployeeOtp?: boolean;
  onDone: () => void;
}) {
  const empty = {
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    pin: "",
    rol: "VENDEDOR" as RolEmpleado,
    activo: true,
    permisos: getPermisosPorRol("VENDEDOR"),
    max_descuento_porcentaje: 10,
  };
  const [f, setF] = useState(
    empleado
      ? {
          ...empty,
          ...empleado,
          permisos: empleado.permisos || getPermisosPorRol(empleado.rol),
          max_descuento_porcentaje: empleado.max_descuento_porcentaje ?? 10,
        }
      : empty,
  );
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isOtpRequired, setIsOtpRequired] = useState(requireEmployeeOtp);

  // Estados para verificación OTP
  const [otpCode, setOtpCode] = useState("");
  const [otpTimer, setOtpTimer] = useState(60);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);

  useEffect(() => {
    setIsOtpRequired(requireEmployeeOtp);
    if (open) {
      getGlobalConfig().then((cfg) => {
        if (cfg?.requireEmployeeOtp !== undefined) {
          setIsOtpRequired(Boolean(cfg.requireEmployeeOtp));
        }
      });
    }
  }, [open, requireEmployeeOtp]);

  useEffect(() => {
    setStep(1);
    setOtpCode("");
    setOtpTimer(60);
    setCanResendOtp(false);
    if (empleado) {
      setF({
        ...empty,
        ...empleado,
        permisos: empleado.permisos || getPermisosPorRol(empleado.rol),
        max_descuento_porcentaje:
          empleado.max_descuento_porcentaje ?? (empleado.rol === "ADMIN" ? 100 : 10),
        password: "",
      });
    } else {
      setF(empty);
    }
  }, [empleado, open]);

  // Contador de reenvío OTP
  useEffect(() => {
    let interval: any;
    if (step === 3 && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            setCanResendOtp(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, otpTimer]);

  const togglePermiso = (id: string) => {
    const next = f.permisos.includes(id) ? f.permisos.filter((p) => p !== id) : [...f.permisos, id];
    setF({ ...f, permisos: next });
  };

  const selectAllPermisos = () => {
    setF({ ...f, permisos: PERMISOS_SISTEMA.map((p) => p.id) });
  };

  const deselectAllPermisos = () => {
    setF({ ...f, permisos: [] });
  };

  const resetRoleDefaults = () => {
    const defaults = getPermisosPorRol(f.rol);
    setF({ ...f, permisos: defaults });
    toast.info(`Permisos restablecidos para el rol ${f.rol}`);
  };

  function validateStep1(): boolean {
    const nom = (f.nombre || "").trim();
    const ape = (f.apellido || "").trim();
    const em = (f.email || "").trim().toLowerCase();

    if (!nom) {
      toast.error("El nombre del empleado es obligatorio");
      return false;
    }
    if (!ape) {
      toast.error("El apellido del empleado es obligatorio");
      return false;
    }
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      toast.error("Ingresa un correo electrónico válido (ej. empleado@gmail.com)");
      return false;
    }
    if (!f.rol) {
      toast.error("Debes seleccionar un rol para el empleado");
      return false;
    }
    // Si se está creando un empleado nuevo y se usa el correo del admin que está en sesión
    if (!empleado && currentUserEmail && em === currentUserEmail.toLowerCase().trim()) {
      toast.error("No puedes asignar el correo del administrador principal a otro empleado");
      return false;
    }
    // Si se duplica el correo de otro empleado en esta sucursal
    const duplicate = existingEmployees.find(
      (other) => other.id !== empleado?.id && (other.email || "").toLowerCase().trim() === em
    );
    if (duplicate) {
      toast.error(`El correo "${em}" ya está registrado para el empleado ${duplicate.nombre} ${duplicate.apellido || ""}`);
      return false;
    }
    if (!empleado && (f.password || "").length < 8) {
      toast.error("La contraseña inicial debe tener al menos 8 caracteres");
      return false;
    }
    return true;
  }

  function handleNext() {
    if (!validateStep1()) return;
    setStep(2);
  }

  async function handleResendOtp() {
    if (!canResendOtp || resendingOtp) return;
    setResendingOtp(true);
    try {
      await resendEmployeeSignUpOtp(f.email.trim());
      setOtpTimer(60);
      setCanResendOtp(false);
      toast.success("Código de verificación reenviado a " + f.email);
    } catch (err: any) {
      toast.error(err.message || "Error al reenviar código");
    } finally {
      setResendingOtp(false);
    }
  }

  async function handleVerifyOtp() {
    if (otpCode.trim().length !== 6) {
      toast.error("Ingresa el código completo de 6 dígitos");
      return;
    }

    setLoading(true);
    try {
      const e: Empleado = {
        id: uid("emp"),
        tenant_id: tenantId,
        nombre: f.nombre.trim(),
        apellido: f.apellido ? f.apellido.trim() : undefined,
        email: f.email.trim().toLowerCase(),
        password: f.password,
        pin: f.pin ? f.pin.trim() : undefined,
        rol: f.rol,
        activo: f.activo,
        permisos: f.permisos,
        max_descuento_porcentaje: f.rol === "ADMIN" ? 100 : Number(f.max_descuento_porcentaje) || 0,
        creado_en: new Date().toISOString(),
      };
      await verifyEmployeeOtpAndSave(otpCode.trim(), e);
      toast.success("¡Empleado verificado y registrado exitosamente!");
      onDone();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Código OTP inválido o expirado");
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (!validateStep1()) {
      setStep(1);
      return;
    }

    // Si la configuración global exige OTP y es un empleado NUEVO
    if (isOtpRequired && !empleado) {
      setLoading(true);
      try {
        await sendEmployeeSignUpOtp(f.email, f.password, f.nombre, tenantId, f.rol);
        setStep(3);
        setOtpTimer(60);
        setCanResendOtp(false);
        toast.info(`Hemos enviado un código OTP de 6 dígitos al correo ${f.email}`);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Error al enviar código de verificación");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Flujo normal directo (sin OTP o edición de empleado existente)
    setLoading(true);
    try {
      const e: Empleado = {
        id: empleado?.id || uid("emp"),
        tenant_id: tenantId,
        nombre: f.nombre.trim(),
        apellido: f.apellido ? f.apellido.trim() : undefined,
        email: f.email.trim().toLowerCase(),
        password: f.password || (empleado ? "***" : ""),
        pin: f.pin ? f.pin.trim() : undefined,
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

  const isThreeSteps = isOtpRequired && !empleado;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-lg p-0 overflow-hidden border-none shadow-2xl bg-background text-foreground">
        {/* STEPPER HEADER */}
        <div className="bg-slate-50/80 dark:bg-slate-900/70 p-4 pb-2.5 relative border-b border-slate-100 dark:border-slate-800">
          {/* Title row with right padding to clear the close icon */}
          <div className="flex items-center justify-between mb-2.5 pr-10">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/15 shadow-xs">
                {step === 1 ? (
                  <User className="h-5 w-5" />
                ) : step === 2 ? (
                  <ShieldCheck className="h-5 w-5" />
                ) : (
                  <KeyRound className="h-5 w-5" />
                )}
              </div>
              <div>
                <DialogTitle className="text-base font-display font-bold text-foreground">
                  {empleado ? "Editar empleado" : "Nuevo empleado"}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  {step === 1
                    ? "Paso 1: Datos personales y de acceso"
                    : step === 2
                    ? "Paso 2: Permisos por módulo del sistema"
                    : "Paso 3: Verificación de código OTP"}
                </p>
              </div>
            </div>
          </div>

          {/* Stepper Buttons */}
          <div className={`grid ${isThreeSteps ? "grid-cols-3" : "grid-cols-2"} gap-1.5 p-1 rounded-xl bg-slate-200/60 dark:bg-slate-800/80`}>
            <button
              type="button"
              onClick={() => step !== 3 && setStep(1)}
              disabled={step === 3}
              className={`flex items-center justify-center gap-2 py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
                step === 1
                  ? "bg-primary text-white shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              } ${step === 3 ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span
                className={`h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-black ${
                  step === 1
                    ? "bg-white/25 text-white"
                    : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                1
              </span>
              <span className="truncate">Datos</span>
            </button>

            <button
              type="button"
              onClick={() => step !== 3 && handleNext()}
              disabled={step === 3}
              className={`flex items-center justify-center gap-2 py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
                step === 2
                  ? "bg-primary text-white shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              } ${step === 3 ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span
                className={`h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-black ${
                  step === 2
                    ? "bg-white/25 text-white"
                    : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                2
              </span>
              <span className="truncate">Permisos</span>
            </button>

            {isThreeSteps && (
              <div
                className={`flex items-center justify-center gap-2 py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
                  step === 3
                    ? "bg-[#1B4B73] text-white shadow-sm font-bold"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-black ${
                    step === 3
                      ? "bg-[#F0B900] text-[#1B4B73]"
                      : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  3
                </span>
                <span className="truncate">Código OTP</span>
              </div>
            )}
          </div>
        </div>

        {/* DIALOG BODY - TIGHT SEAMLESS ATTACHMENT */}
        <div className="px-4 sm:px-5 pt-2 pb-4">
          {step === 1 && (
            /* STEP 1: INFORMACIÓN Y ACCESO */
            <div className="space-y-2.5 animate-in fade-in slide-in-from-left-3 duration-200">
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nombre *
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      value={f.nombre}
                      onChange={(e) => setF({ ...f, nombre: e.target.value })}
                      placeholder="Ej. Juan"
                      className="h-10 pl-9.5 rounded-xl bg-surface border-border/60 text-xs sm:text-sm font-medium focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Apellido *
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      value={f.apellido}
                      onChange={(e) => setF({ ...f, apellido: e.target.value })}
                      placeholder="Ej. Pérez"
                      className="h-10 pl-9.5 rounded-xl bg-surface border-border/60 text-xs sm:text-sm font-medium focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <span>Correo Electrónico</span>
                  <span className="text-destructive font-black">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    type="email"
                    required
                    value={f.email}
                    onChange={(e) => setF({ ...f, email: e.target.value })}
                    placeholder="ej. empleado@gmail.com"
                    className="h-10 pl-9.5 rounded-xl bg-surface border-border/60 text-xs sm:text-sm font-medium focus:ring-1 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <span>{empleado ? "Cambiar contraseña" : "Contraseña"}</span>
                    {!empleado && <span className="text-destructive font-black">*</span>}
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={f.password}
                      onChange={(e) => setF({ ...f, password: e.target.value })}
                      placeholder={empleado ? "••••••••" : "Mín. 8 caracteres"}
                      className="h-10 pl-9.5 pr-10 rounded-xl bg-surface border-border/60 text-xs sm:text-sm font-medium focus:ring-1 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-0.5 cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    PIN Acceso Rápido (POS)
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      value={f.pin}
                      onChange={(e) => setF({ ...f, pin: e.target.value.slice(0, 4) })}
                      placeholder="4 dígitos"
                      maxLength={4}
                      className="h-10 pl-9.5 rounded-xl bg-surface border-border/60 tracking-widest font-mono text-center text-xs sm:text-sm font-bold focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 items-center">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <span>Rol en el negocio</span>
                    <span className="text-destructive font-black">*</span>
                  </Label>
                  <Select
                    value={f.rol}
                    onValueChange={(v) => {
                      const rol = v as RolEmpleado;
                      setF({ ...f, rol, permisos: getPermisosPorRol(rol) });
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl bg-surface border-border/60 text-xs sm:text-sm font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {(
                        [
                          "ADMIN",
                          "SUPERVISOR",
                          "VENDEDOR",
                          "RECEPCIONISTA",
                          "REPARTIDOR",
                          "OPERARIO",
                        ] as RolEmpleado[]
                      ).map((r) => (
                        <SelectItem key={r} value={r} className="rounded-lg text-xs sm:text-sm">
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between h-10 px-3 rounded-xl border border-border/60 bg-surface/50 mt-4 sm:mt-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="activo"
                      checked={f.activo}
                      onCheckedChange={(v) => setF({ ...f, activo: !!v })}
                    />
                    <Label htmlFor="activo" className="text-xs font-bold cursor-pointer">
                      Empleado Activo
                    </Label>
                  </div>
                  <Badge
                    variant={f.activo ? "default" : "outline"}
                    className={
                      f.activo
                        ? "bg-emerald-600 text-white text-[10px] px-2 py-0.5 font-bold"
                        : "text-[10px] px-2 py-0.5"
                    }
                  >
                    {f.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </div>

              <div>
                <PasswordStrengthIndicator password={f.password} />
              </div>
            </div>
          )}

          {step === 2 && (
            /* STEP 2: PERMISOS DE ACCESO */
            <div className="space-y-2.5 animate-in fade-in slide-in-from-right-3 duration-200">
              {/* Toolbar Actions (Primary Brand Background Card) */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 p-2 px-3 rounded-xl bg-primary/10 border border-primary/20 shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <Badge
                    className={`font-semibold text-[10px] px-2 py-0.5 border-none ${getRoleBadgeClass(f.rol)}`}
                  >
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
                    className="h-7.5 rounded-lg text-[10px] text-primary hover:bg-primary/10 gap-1 px-2 font-bold cursor-pointer"
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
                    className="h-7.5 rounded-lg text-[10px] text-slate-700 hover:bg-slate-200 dark:text-slate-300 px-2 font-bold cursor-pointer"
                  >
                    Todos
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={deselectAllPermisos}
                    disabled={f.rol === "ADMIN"}
                    className="h-7.5 rounded-lg text-[10px] text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-800 px-2 font-bold cursor-pointer"
                  >
                    Ninguno
                  </Button>
                </div>
              </div>

              {f.rol === "ADMIN" && (
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-[11px] text-primary-dark font-medium leading-tight">
                    Los usuarios con rol <strong>ADMINISTRADOR</strong> tienen acceso total a todos
                    los módulos.
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
                    Porcentaje máximo de descuento que este usuario podrá aplicar en POS / Nueva
                    Orden.
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
                    className="h-8.5 text-center font-black text-xs rounded-xl bg-white dark:bg-slate-900 border-amber-300/80 dark:border-amber-700/80 pr-6"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-amber-600 dark:text-amber-400 pointer-events-none">
                    %
                  </span>
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
                        className={`flex items-start gap-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
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
                          className="mt-0.5 rounded-md h-3.5 w-3.5 cursor-pointer"
                        />
                        <div className="grid gap-0.5">
                          <Label
                            htmlFor={p.id}
                            className="text-xs font-bold leading-tight cursor-pointer"
                          >
                            {p.nombre}
                          </Label>
                          <p className="text-[10px] text-muted-foreground leading-tight">
                            {p.descripcion}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {step === 3 && (
            /* STEP 3: VERIFICACIÓN OTP */
            <div className="space-y-4 py-2 animate-in fade-in zoom-in-95 duration-200">
              <div className="text-center space-y-2 p-4 rounded-2xl bg-primary/5 border border-primary/15">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-[#1B4B73] text-white flex items-center justify-center shadow-md">
                  <Mail className="h-6 w-6 text-[#F0B900]" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-base text-foreground">
                    Verificación de Correo Electrónico
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                    Hemos enviado un código OTP de 6 dígitos al correo del empleado:
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-primary/20 shadow-xs">
                    <span className="font-mono text-xs font-bold text-primary">{f.email}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center space-y-3 pt-1">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-center block">
                  Ingresa los 6 dígitos del código
                </Label>
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={(val) => setOtpCode(val)}
                  onComplete={() => {}}
                  autoFocus
                >
                  <InputOTPGroup className="gap-2 sm:gap-2.5">
                    <InputOTPSlot index={0} className="h-12 w-10 sm:h-13 sm:w-11 text-lg sm:text-xl font-black rounded-xl border-slate-300 dark:border-slate-700 bg-surface focus:border-[#1B4B73] focus:ring-[#1B4B73]" />
                    <InputOTPSlot index={1} className="h-12 w-10 sm:h-13 sm:w-11 text-lg sm:text-xl font-black rounded-xl border-slate-300 dark:border-slate-700 bg-surface focus:border-[#1B4B73] focus:ring-[#1B4B73]" />
                    <InputOTPSlot index={2} className="h-12 w-10 sm:h-13 sm:w-11 text-lg sm:text-xl font-black rounded-xl border-slate-300 dark:border-slate-700 bg-surface focus:border-[#1B4B73] focus:ring-[#1B4B73]" />
                    <InputOTPSlot index={3} className="h-12 w-10 sm:h-13 sm:w-11 text-lg sm:text-xl font-black rounded-xl border-slate-300 dark:border-slate-700 bg-surface focus:border-[#1B4B73] focus:ring-[#1B4B73]" />
                    <InputOTPSlot index={4} className="h-12 w-10 sm:h-13 sm:w-11 text-lg sm:text-xl font-black rounded-xl border-slate-300 dark:border-slate-700 bg-surface focus:border-[#1B4B73] focus:ring-[#1B4B73]" />
                    <InputOTPSlot index={5} className="h-12 w-10 sm:h-13 sm:w-11 text-lg sm:text-xl font-black rounded-xl border-slate-300 dark:border-slate-700 bg-surface focus:border-[#1B4B73] focus:ring-[#1B4B73]" />
                  </InputOTPGroup>
                </InputOTP>

                <div className="text-center pt-2">
                  <p className="text-xs text-muted-foreground">
                    ¿No recibió el código en su bandeja o spam?
                  </p>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    disabled={!canResendOtp || resendingOtp}
                    onClick={handleResendOtp}
                    className="text-xs font-bold text-primary hover:underline h-7 p-0 cursor-pointer disabled:opacity-50 disabled:no-underline"
                  >
                    {resendingOtp ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Reenviando...
                      </span>
                    ) : canResendOtp ? (
                      "Reenviar código OTP"
                    ) : (
                      `Reenviar código en ${otpTimer}s`
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div className="pt-3 mt-3 border-t border-border/50 flex items-center justify-between gap-2">
            <div>
              {empleado && step === 1 ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-3.5 text-xs h-9.5 gap-1.5 transition-all active:scale-95 border-none shadow-xs font-bold cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-white" /> Eliminar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-lg">
                        ¿Eliminar a {empleado.nombre}?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-xs">
                        Esta acción es irreversible. Se eliminará el acceso del empleado.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                      <AlertDialogCancel className="rounded-xl h-9 text-xs font-medium">
                        Cancelar
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={remove}
                        className="bg-destructive text-white rounded-xl h-9 text-xs font-bold hover:bg-destructive/90"
                      >
                        Confirmar eliminación
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : step === 2 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="rounded-xl h-9.5 px-4 text-xs font-semibold gap-1.5 border-slate-300 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Anterior
                </Button>
              ) : step === 3 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="rounded-xl h-9.5 px-4 text-xs font-semibold gap-1.5 border-slate-300 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Editar datos
                </Button>
              ) : null}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl h-9.5 px-4 text-xs font-medium border-slate-200 cursor-pointer"
              >
                Cancelar
              </Button>

              {step === 1 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="bg-primary hover:bg-primary/95 text-white rounded-xl h-9.5 px-5 text-xs font-bold shadow-md gap-1.5 transition-all cursor-pointer"
                >
                  Siguiente: Permisos <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : step === 2 ? (
                <Button
                  type="button"
                  onClick={submit}
                  disabled={loading}
                  className="bg-gradient-primary text-white rounded-xl h-9.5 px-5 text-xs font-bold shadow-glow hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer gap-1.5"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {empleado
                      ? "Guardar cambios"
                      : isOtpRequired
                      ? "Continuar con Verificación OTP"
                      : "Crear empleado"}
                  </span>
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={loading || otpCode.trim().length !== 6}
                  className="bg-[#1B4B73] hover:bg-[#143755] text-white rounded-xl h-9.5 px-5 text-xs font-bold shadow-glow hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer gap-1.5"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#F0B900]" />
                  )}
                  <span>Verificar y Registrar</span>
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
            className={`h-1 flex-1 rounded-full transition-all duration-500 ${
              i <= strength ? colors[strength] : "bg-slate-100"
            }`}
          />
        ))}
      </div>
      {password && (
        <div className="flex items-center justify-between">
          <p
            className={`text-[10px] font-bold uppercase tracking-wider ${strength <= 2 ? "text-orange-500" : "text-success"}`}
          >
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
