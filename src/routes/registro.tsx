import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { compressImage } from "@/lib/compressImage";
import { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Check, Building2, Palette, Package, UserCircle2, PartyPopper,
  AlertCircle, Search, MapPin, Upload, Image as ImageIcon, Receipt, MessageCircle, Sparkles,
  Eye, EyeOff, Cloud, Loader2, Droplet, Landmark, ShieldCheck, Trash2,
} from "lucide-react";
import { Logo } from "@/components/klynn/Logo";
import { SeedBootstrap } from "@/components/klynn/SeedBootstrap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  PLANS, formatRD, formatPhoneRD, isSlugAvailable, registerTenant,
  setActiveTenant, uid, PROVINCIAS_RD, NCF_TIPOS, DEFAULT_CONFIG, getGlobalConfig, getPlans,
  updateECFConfig, saveECFConfig,
  type PlanId, type Tenant, type TenantConfig, type GlobalConfig, type Empleado, type Plan, type ECFConfig,
} from "@/lib/storage";
import { registerTenantInPronesoft, consultarRNC } from "@/lib/fiscal";
import { toast } from "sonner";

// Definimos IS_LOCAL_MODE como false para asegurar compatibilidad 100% cloud
const IS_LOCAL_MODE = false;

export const Route = createFileRoute("/registro")({
  head: () => ({
    meta: [
      { title: "Registra tu lavandería — Klynn" },
      { name: "description", content: "Crea tu cuenta en Klynn en pocos pasos. 14 días gratis sin tarjeta." },
    ],
  }),
  component: RegistroPage,
});

const STEPS = [
  { id: 1, label: "Empresa", icon: Building2 },
  { id: 2, label: "Marca", icon: Palette },
  { id: 3, label: "Plan", icon: Package },
  { id: 4, label: "Admin", icon: UserCircle2 },
  { id: 5, label: "Listo", icon: PartyPopper },
];

interface FormState {
  // empresa
  nombre: string;
  razon_social: string;
  rnc: string;
  telefono: string;
  provincia: string;
  // marca
  slug: string;
  slugTouched: boolean;
  color_primario: string;
  color_secundario: string;
  logo_url: string;
  // fiscal
  itbis_porcentaje: number;
  ncf_tipos: string[];
  ticket_pie: string;
  // plan
  plan_id: PlanId;
  // admin
  admin_nombre: string;
  admin_email: string;
  admin_password: string;
  admin_password_confirm: string;
}

const initial: FormState = {
  nombre: "",
  razon_social: "",
  rnc: "",
  telefono: "",
  provincia: "",
  slug: "",
  slugTouched: false,
  color_primario: "#1B4B73",
  color_secundario: "#F0B900",
  logo_url: "",
  itbis_porcentaje: 18,
  ncf_tipos: ["B01", "B02"],
  ticket_pie: "¡Gracias por su preferencia!",
  plan_id: "pro",
  admin_nombre: "",
  admin_email: "",
  admin_password: "",
  admin_password_confirm: "",
};

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "").slice(0, 24);
}

function RegistroPage() {
  const navigate = useNavigate();
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({ requirePlanOnRegistration: true, trialDays: 14, defaultPlanId: 'basico' });
  const [plans, setPlans] = useState<Plan[]>(PLANS);
  
  useEffect(() => {
    Promise.all([getGlobalConfig(), getPlans()]).then(([cfg, pList]) => {
      setGlobalConfig(cfg);
      setPlans(pList);
      setForm(f => ({ ...f, plan_id: cfg.defaultPlanId }));
    });
  }, []);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [provOpen, setProvOpen] = useState(false);
  const [createdTenant, setCreatedTenant] = useState<Tenant | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisioningStep, setProvisioningStep] = useState(0);

  const logoInputRef = useRef<HTMLInputElement>(null);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { alert("Máximo 5MB"); return; }
    try {
      const compressed = await compressImage(f, 512, 512, 0.7);
      update("logo_url", compressed);
    } catch {
      alert("Error al procesar la imagen");
    }
  }

  const [loadingRNC, setLoadingRNC] = useState(false);
  const lastSearchedRNCRef = useRef<string>("");

  async function handleSearchRNC(rncValue?: string, force = false) {
    const val = rncValue !== undefined ? rncValue : form.rnc;
    const cleanRnc = val.replace(/\D/g, "");
    if (!cleanRnc || (cleanRnc.length !== 9 && cleanRnc.length !== 11)) return;

    if (!force && lastSearchedRNCRef.current === cleanRnc) return;
    lastSearchedRNCRef.current = cleanRnc;

    setLoadingRNC(true);
    try {
      const contribuyente = await consultarRNC(cleanRnc);
      if (contribuyente && contribuyente.name) {
        const suggestedName = contribuyente.commercialName || contribuyente.name;
        setForm((f) => ({
          ...f,
          rnc: contribuyente.rnc || cleanRnc,
          razon_social: contribuyente.name,
          nombre: f.nombre.trim() && f.nombre !== "Lavandería La Burbuja" ? f.nombre : suggestedName,
          slug: !f.slugTouched ? slugify(suggestedName) : f.slug,
        }));
        toast.success(`Contribuyente DGII: ${contribuyente.name} ✅`, { id: "dgii-rnc-toast" });
      } else {
        toast.error("No se encontró el contribuyente en DGII", { id: "dgii-rnc-toast" });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRNC(false);
    }
  }

  const provisioningSteps = useMemo(() => {
    if (IS_LOCAL_MODE) {
      return [
        "Creando base de datos IndexedDB local...",
        "Generando secuencias de facturación electrónica (e-CF)...",
        "Inicializando catálogo maestro de lavandería...",
        "Configurando almacenamiento físico seguro...",
        "¡Todo listo localmente!"
      ];
    }
    return [
      "Configurando subdominio en Cloudflare...",
      "Asignando certificados SSL...",
      "Aislando base de datos para el tenant...",
      "Configurando entorno de producción...",
      "¡Listo!"
    ];
  }, []);

  const filteredSteps = useMemo(() => {
    if (globalConfig.requirePlanOnRegistration) return STEPS;
    return STEPS.filter(s => s.id !== 3);
  }, [globalConfig.requirePlanOnRegistration]);

  const slugOk = useMemo(
    () => form.slug.length >= 3 && /^[a-z0-9]+$/.test(form.slug) && isSlugAvailable(form.slug),
    [form.slug]
  );

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => {
      const next = { ...f, [k]: v };
      // autollenar slug desde nombre si el usuario no lo ha tocado
      if (k === "nombre" && !f.slugTouched) {
        next.slug = slugify(String(v));
      }
      return next;
    });
    setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function validateStep(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (step === 1) {
      if (!form.nombre.trim()) e.nombre = "Requerido";
      if (!form.telefono || form.telefono.replace(/\D/g, "").length < 10) e.telefono = "Teléfono inválido";
      if (!form.provincia) e.provincia = "Selecciona tu provincia";
    }
    if (step === 2) {
      if (!slugOk) e.slug = "Subdominio inválido o no disponible";
    }
    if (step === 4) {
      if (!form.admin_nombre.trim()) e.admin_nombre = "Requerido";
      if (!form.admin_email.includes("@")) e.admin_email = "Email inválido";
      if (form.admin_password.length < 8) e.admin_password = "Mínimo 8 caracteres";
      if (form.admin_password !== form.admin_password_confirm) e.admin_password_confirm = "No coincide";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleFinalize() {
    const config: TenantConfig = {
      ...DEFAULT_CONFIG,
    };
    const cleanRnc = form.rnc.replace(/\D/g, "");
    const tenant: Tenant = {
      id: uid("ten"),
      nombre: form.nombre,
      slug: form.slug,
      rnc: cleanRnc || undefined,
      telefono: form.telefono,
      direccion: "",
      provincia: form.provincia,
      email: form.admin_email,
      logo_url: form.logo_url || undefined,
      color_primario: form.color_primario,
      color_secundario: form.color_secundario,
      plan_id: form.plan_id,
      estado: "TRIAL",
      trial_hasta: new Date(Date.now() + globalConfig.trialDays * 86400000).toISOString(),
      creado_en: new Date().toISOString(),
      plan_fecha_inicio: new Date().toISOString(),
      config,
    };

    const admin: Empleado = {
      id: "", // Se llenará en registerTenant con el ID de Auth
      tenant_id: tenant.id,
      nombre: form.admin_nombre,
      email: form.admin_email,
      password: form.admin_password,
      rol: "ADMIN",
      activo: true,
      creado_en: new Date().toISOString(),
    };

    setIsProvisioning(true);
    setProvisioningStep(0);

    try {
      await registerTenant(tenant, admin);

      // Guardar configuración inicial fiscal (ecf_config) vinculada al tenant
      try {
        await saveECFConfig({
          id: crypto.randomUUID(),
          tenant_id: tenant.id,
          rnc_emisor: cleanRnc || "",
          razon_social: form.razon_social || form.nombre,
          nombre_comercial: form.nombre,
          ambiente: "pruebas",
          usar_credenciales_propias: false,
          is_active: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as ECFConfig);
      } catch (ecfInitErr) {
        console.warn("Aviso al inicializar ecf_config:", ecfInitErr);
      }

      localStorage.setItem("klynn_tour_is_new_registration", "true");
      setActiveTenant(tenant.slug);
      setCreatedTenant(tenant);

      let current = 0;
      const interval = setInterval(() => {
        current++;
        setProvisioningStep(current);
        if (current >= provisioningSteps.length - 1) {
          clearInterval(interval);
          setTimeout(() => {
            setIsProvisioning(false);
            setStep(5);
          }, 800);
        }
      }, 1200);
    } catch (err: any) {
      setIsProvisioning(false);
      let errMsg = err.message || "Error al registrar";
      
      // Mapeo de errores técnicos a mensajes amigables
      if (errMsg.includes("tenants_slug_key")) {
        errMsg = "Este nombre de lavandería o subdominio ya está en uso. Por favor elige otro.";
        setErrors({ slug: errMsg });
        setStep(2); // Devolver al paso de marca
        return;
      }
      
      if (errMsg.includes("User already registered") || errMsg.includes("user_already_exists")) {
        errMsg = "Ya existe una cuenta registrada con este correo electrónico.";
        setErrors({ admin_email: errMsg });
        setStep(4);
        return;
      }

      if (errMsg.includes("Password should be at least")) {
        errMsg = "La contraseña es muy corta. Debe tener al menos 6 caracteres.";
        setErrors({ admin_password: errMsg });
        setStep(4);
        return;
      }

      setErrors({ admin_email: errMsg });
      setStep(4);
    }
  }

  function next() {
    if (!validateStep()) return;
    let nextStep = step + 1;
    if (nextStep === 3 && !globalConfig.requirePlanOnRegistration) {
      nextStep = 4;
    }
    if (nextStep <= 4) setStep(nextStep);
    else if (step === 4) {
      handleFinalize();
    }
  }

  function prev() { 
    let prevStep = step - 1;
    if (prevStep === 3 && !globalConfig.requirePlanOnRegistration) {
      prevStep = 2;
    }
    setStep((s) => Math.max(1, prevStep)); 
  }

  return (
    <div className="min-h-[112vh] bg-gradient-hero">
      <SeedBootstrap />
      <header className="flex flex-col items-center justify-center pt-5 pb-1 px-6 relative">
        <div className="flex flex-col items-center">
          <Logo size="lg" />
          <span className="-mt-2 text-[13px] font-semibold tracking-tight text-slate-500/80">
            Tu lavandería, simplificada.
          </span>
        </div>
        <div className="absolute right-6 top-6 hidden text-sm md:block">
          <span className="text-muted-foreground">¿Ya tienes cuenta? </span>
          <Link to="/login" className="font-semibold text-primary hover:underline">Inicia sesión</Link>
        </div>
      </header>

      <main className="container mx-auto pb-12 pt-2">
        <div className="mx-auto mb-4 max-w-2xl px-2">
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-white/50 p-1 shadow-sm">
            {filteredSteps.map((s) => {
              const done = step > s.id;
              const current = step === s.id;
              return (
                <div key={s.id} className={`relative flex transition-all duration-500 ${current ? "flex-[2]" : "flex-1"}`}>
                  <motion.div
                    animate={{
                      backgroundColor: done ? "var(--success)" : current ? "var(--primary)" : "transparent",
                    }}
                    className={`flex h-9 w-full items-center gap-1.5 overflow-hidden rounded-full px-3 transition-all duration-300 ${
                      done || current ? "text-white" : "text-slate-400"
                    } ${!done && !current ? "hover:bg-white/50" : ""}`}
                  >
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                      done || current ? "bg-white/20" : "bg-slate-200 text-slate-500"
                    }`}>
                      {done ? <Check className="h-3 w-3" /> : s.id}
                    </div>
                    {(current || done) && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        className="overflow-hidden whitespace-nowrap text-[10px] font-bold uppercase tracking-wider"
                      >
                        {s.label}
                      </motion.span>
                    )}
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mx-auto max-w-2xl rounded-2xl border border-border/80 bg-surface p-5 shadow-sm sm:p-6 md:p-8">
          {isProvisioning ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="mb-6 rounded-full border-4 border-primary/20 border-t-primary p-3"
              >
                <Droplet className="h-10 w-10 text-primary" fill="currentColor" />
              </motion.div>
              <h2 className="text-xl font-bold">Creando tu espacio</h2>
              <p className="mt-1 text-xs text-muted-foreground italic">
                {provisioningSteps[provisioningStep]}
              </p>
              <div className="mt-6 h-1.5 w-56 overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: "0%" }}
                  animate={{ width: `${(provisioningStep + 1) * 20}%` }}
                />
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
              {step === 1 && (
                <>
                  <h1 className="mb-0.5 text-2xl font-bold tracking-tight">Cuéntanos de tu lavandería</h1>
                  <p className="mb-4 text-xs text-muted-foreground">Solo lo esencial. El resto lo configuras después.</p>

                  {/* Asistente Inteligente DGII Banner Compacto */}
                  <div className="mb-4 rounded-xl border border-primary/15 bg-primary/[0.02] px-3.5 py-2.5 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Landmark className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            <span className="whitespace-nowrap">¿Eres contribuyente ante DGII?</span>
                            <span className="rounded bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0 whitespace-nowrap">
                              Consultar ante DGII
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Escribe tu RNC o Cédula para autocompletar el nombre oficial.
                          </p>
                        </div>
                      </div>
                      <div className="relative flex items-center shrink-0 w-full sm:w-48">
                        <Input 
                          value={form.rnc} 
                          onChange={(e) => {
                            const val = e.target.value;
                            update("rnc", val);
                            const clean = val.replace(/\D/g, "");
                            if (clean.length === 9 || clean.length === 11) {
                              handleSearchRNC(clean);
                            }
                          }} 
                          onBlur={() => handleSearchRNC()}
                          placeholder="Ej: 133-19090-7" 
                          className="h-8 text-xs pr-7 bg-white border-primary/25 focus-visible:ring-primary/20 shadow-none rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleSearchRNC(undefined, true)}
                          disabled={loadingRNC}
                          className="absolute right-1.5 text-muted-foreground hover:text-primary transition-colors p-0.5"
                          title="Buscar en DGII"
                        >
                          {loadingRNC ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : <Search className="h-3.5 w-3.5 text-primary" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Field label="Nombre comercial de tu lavandería *" error={errors.nombre}>
                        <Input 
                          value={form.nombre} 
                          onChange={(e) => {
                            update("nombre", e.target.value);
                            if (!form.slugTouched) update("slug", slugify(e.target.value));
                          }} 
                          placeholder="Ej. Lavandería La Burbuja o Dinnca Comercial" 
                          className="h-9 text-xs sm:text-sm"
                        />
                      </Field>
                    </div>
                    <Field label="Teléfono / WhatsApp *" error={errors.telefono}>
                      <Input value={form.telefono} onChange={(e) => update("telefono", formatPhoneRD(e.target.value))} placeholder="809-555-0142" className="h-9 text-xs sm:text-sm" />
                    </Field>
                    <Field label="Provincia *" error={errors.provincia}>
                      <button type="button" onClick={() => setProvOpen(true)} className="flex h-9 w-full items-center justify-between rounded-lg border border-input bg-background px-3 text-xs sm:text-sm shadow-sm hover:bg-accent/30 transition-all">
                        <span className={form.provincia ? "text-foreground font-medium" : "text-muted-foreground"}>{form.provincia || "Selecciona tu provincia..."}</span>
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </Field>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h1 className="mb-0.5 text-2xl font-bold tracking-tight">Personaliza tu marca</h1>
                  <p className="mb-4 text-xs text-muted-foreground">Define la identidad visual de tu lavandería.</p>
                  
                  <div className="space-y-3">
                    {/* Branding Preview Compacto y Equilibrado */}
                    <div className="rounded-xl border border-border/80 bg-slate-50/70 p-3 sm:p-3.5 text-center relative overflow-hidden shadow-inner">
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
                        <div
                          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-white shadow-sm transition-all duration-300 bg-white"
                          style={{ borderColor: form.color_primario }}
                        >
                          {form.logo_url ? (
                            <img src={form.logo_url} alt="logo" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-slate-50">
                              <Building2 className="h-7 w-7 text-slate-300" />
                            </div>
                          )}
                        </div>
                        <div className="text-center sm:text-left min-w-0">
                          <div 
                            className="text-lg font-display font-bold tracking-tight truncate max-w-[300px]" 
                            style={{ color: form.color_primario }}
                          >
                            {form.nombre || "Tu Lavandería"}
                          </div>
                          
                          <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1.5">
                            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                            <button
                              type="button"
                              onClick={() => logoInputRef.current?.click()}
                              className="h-6 px-2.5 rounded-full bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 border border-slate-200 shadow-none flex items-center gap-1 transition-all active:scale-95"
                            >
                              <Upload className="h-3 w-3 text-slate-500" /> {form.logo_url ? "Cambiar logo" : "Subir logo"}
                            </button>
                            {form.logo_url && (
                              <button
                                type="button"
                                onClick={() => update("logo_url", "")}
                                className="h-6 px-2 rounded-full bg-red-50 hover:bg-red-100 text-destructive border border-red-200/60 flex items-center gap-1 transition-all active:scale-95 text-[11px] font-medium"
                                title="Quitar logotipo"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Quitar</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-0.5">
                      <ColorField label="Color principal de tu marca" value={form.color_primario} onChange={(v) => update("color_primario", v)} />
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <h1 className="mb-0.5 text-2xl font-bold tracking-tight">Elige tu plan</h1>
                  <p className="mb-4 text-xs text-muted-foreground">{globalConfig.trialDays} días gratis. Sin tarjeta de crédito.</p>
                  <div className="grid gap-2">
                    {plans.map((p) => {
                      const sel = form.plan_id === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => update("plan_id", p.id)}
                          className={`text-left rounded-xl border p-3 transition-all duration-200 ${
                            sel ? "border-primary bg-primary/[0.03] shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold text-slate-900">{p.nombre}</span>
                                {p.id === "pro" && (
                                  <span className="rounded bg-orange-100 px-1.5 py-0.2 text-[9px] font-bold text-orange-600 uppercase tracking-tight">
                                    Popular
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 truncate mt-0.5">
                                {p.limite_empleados} empleados · {p.limite_ordenes_mes ? `${p.limite_ordenes_mes} órdenes/mes` : "órdenes ilimitadas"}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <span className="text-base font-bold text-slate-900">{formatRD(p.precio_mensual).replace("DOP", "RD$")}</span>
                                <span className="text-[10px] text-slate-400"> /mes</span>
                              </div>
                              <div className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all ${
                                sel ? "border-primary bg-primary text-white" : "border-slate-300 bg-white"
                              }`}>
                                {sel && <Check className="h-3 w-3" strokeWidth={3} />}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <h1 className="mb-0.5 text-2xl font-bold tracking-tight">Crea tu usuario administrador</h1>
                  <p className="mb-4 text-xs text-muted-foreground">Tendrás acceso total al panel de tu lavandería.</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Nombre completo *" error={errors.admin_nombre} className="sm:col-span-2">
                      <Input value={form.admin_nombre} onChange={(e) => update("admin_nombre", e.target.value)} placeholder="María González" className="h-9 text-xs sm:text-sm" />
                    </Field>
                    <Field label="Email *" error={errors.admin_email} className="sm:col-span-2">
                      <Input type="email" value={form.admin_email} onChange={(e) => update("admin_email", e.target.value)} placeholder="admin@tulavanderia.do" className="h-9 text-xs sm:text-sm" />
                    </Field>
                    <Field label="Contraseña *" error={errors.admin_password}>
                      <div className="relative">
                        <Input type={showPass ? "text" : "password"} value={form.admin_password} onChange={(e) => update("admin_password", e.target.value)} placeholder="••••••••" className="h-9 pr-9 text-xs sm:text-sm" />
                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5">
                          {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      <PasswordStrengthIndicator password={form.admin_password} />
                    </Field>
                    <Field label="Confirmar *" error={errors.admin_password_confirm}>
                      <div className="relative">
                        <Input type={showConfirm ? "text" : "password"} value={form.admin_password_confirm} onChange={(e) => update("admin_password_confirm", e.target.value)} placeholder="••••••••" className="h-9 pr-9 text-xs sm:text-sm" />
                        <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5">
                          {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </Field>
                  </div>
                </>
              )}

              {step === 5 && createdTenant && (
                <SuccessCard 
                  tenant={createdTenant} 
                  adminNombre={form.admin_nombre} 
                  adminEmail={form.admin_email} 
                  globalConfig={globalConfig}
                  onEnter={() => navigate({ to: `/t/${createdTenant.slug}` })} 
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}

          {step < 5 && (
            <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
              <Button 
                variant="outline" 
                onClick={prev} 
                disabled={step === 1}
                className="h-8 px-3.5 bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold"
              >
                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Atrás
              </Button>
              <Button 
                onClick={next} 
                size="sm"
                className="bg-primary text-white shadow-sm hover:opacity-95 font-bold h-8 px-5 text-xs"
              >
                {step === 4 ? "Crear lavandería" : "Continuar"} <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </main>

      <ProvinciaModal open={provOpen} onClose={() => setProvOpen(false)} value={form.provincia} onSelect={(p) => { update("provincia", p); setProvOpen(false); }} />
    </div>
  );
}

function SuccessCard({ tenant, adminNombre, adminEmail, globalConfig, onEnter }: { 
  tenant: Tenant; 
  adminNombre: string; 
  adminEmail: string; 
  globalConfig: GlobalConfig;
  onEnter: () => void 
}) {
  const planNombre = IS_LOCAL_MODE 
    ? "Klynn Local / Desktop" 
    : (PLANS.find((p) => p.id === tenant.plan_id)?.nombre || tenant.plan_id);

  return (
    <div className="text-center py-2">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="relative mx-auto mb-3 h-16 w-16"
      >
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-slate-100 bg-white shadow-sm">
           {tenant.logo_url ? (
             <img src={tenant.logo_url} alt="Logo" className="h-full w-full object-cover" />
           ) : (
             <PartyPopper className="h-8 w-8 text-primary" />
           )}
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <h1 className="mb-0.5 text-2xl font-bold tracking-tight">¡Bienvenido, {adminNombre.split(" ")[0]}!</h1>
        <p className="mb-3.5 text-xs text-muted-foreground">Tu lavandería <strong className="text-foreground">{tenant.nombre}</strong> ya está lista.</p>

        <div className="mx-auto mb-4 max-w-sm overflow-hidden rounded-xl border border-border bg-white text-left shadow-xs">
          <div className="flex items-center justify-between border-b border-border px-3.5 py-2">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-primary/60" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Acceso</span>
            </div>
            <div className="font-mono text-xs font-semibold">
              {IS_LOCAL_MODE ? `localhost:8080/t/${tenant.slug}` : `klynn.com.do/t/${tenant.slug}`}
            </div>
          </div>
          
          <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
            <div className="px-3.5 py-2">
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Plan</div>
              <div className="mt-0.5 font-bold text-sm">{planNombre}</div>
            </div>
            <div className="px-3.5 py-2">
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Licencia</div>
              <div className="mt-0.5 font-bold text-sm text-success">
                {IS_LOCAL_MODE ? "Activación Local" : `${globalConfig.trialDays} Días`}
              </div>
            </div>
          </div>

          <div className="px-3.5 py-2 bg-slate-50/30">
            <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Email Admin</div>
            <div className="mt-0.5 font-mono text-xs font-semibold">{adminEmail}</div>
          </div>
        </div>

        <Button className="h-9 px-6 rounded-xl bg-primary text-white shadow-sm hover:opacity-95 font-bold text-xs" onClick={onEnter}>
          <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Entrar a mi lavandería <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </motion.div>
    </div>
  );
}

function ProvinciaModal({ open, onClose, onSelect, value }: { open: boolean; onClose: () => void; onSelect: (p: string) => void; value: string }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => PROVINCIAS_RD.filter((p) => p.toLowerCase().includes(q.toLowerCase())),
    [q]
  );
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-surface shadow-elegant"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border bg-gradient-hero p-5">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
                  <MapPin className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-display text-xl">Selecciona tu provincia</h2>
                  <p className="text-xs text-muted-foreground">Busca la ubicación de tu lavandería.</p>
                </div>
              </div>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Escribe aquí..."
                  className="pl-9"
                />
              </div>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Sin resultados</div>
              ) : (
                filtered.map((p) => {
                  const sel = p === value;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => onSelect(p)}
                      className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition ${
                        sel ? "bg-accent text-foreground" : "hover:bg-accent/40"
                      }`}
                    >
                      <span className="font-medium">{p}</span>
                      {sel && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex justify-end border-t border-border bg-surface-elevated px-5 py-3">
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LogoUploader({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { alert("Máximo 5MB"); return; }
    try {
      const compressed = await compressImage(f, 512, 512, 0.7);
      onChange(compressed);
    } catch {
      alert("Error al procesar la imagen");
    }
  }
  return (
    <div className="w-full">
      <Label className="mb-2 block text-sm font-semibold text-slate-700">{label}</Label>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFile} />
      
      <div className="relative group">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="relative flex items-center justify-between w-full p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-primary/80 transition-all shadow-sm hover:shadow-md hover:scale-[1.01] duration-300 text-left active:scale-[0.99]"
        >
          <div className="flex items-center gap-4">
            {value ? (
              <div className="relative h-14 w-14 rounded-xl border border-slate-100/50 overflow-hidden shadow-inner bg-white shrink-0">
                <img src={value} alt="logo" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="h-14 w-14 rounded-xl bg-primary/5 text-primary border border-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                <Upload className="h-6 w-6" />
              </div>
            )}
            
            <div>
              <p className="font-bold text-slate-800 text-sm">
                {value ? "Logotipo seleccionado" : "Subir logotipo comercial"}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {value ? "Haz clic para cambiar la imagen" : "PNG o JPG, tamaño sugerido 512x512"}
              </p>
            </div>
          </div>

          <div className="h-9 px-4 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-center hover:bg-slate-50 transition-colors shrink-0">
            {value ? "Cambiar" : "Examinar"}
          </div>
        </button>

        {value && (
          <button 
            type="button" 
            onClick={() => onChange("")} 
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-white hover:bg-destructive/90 flex items-center justify-center shadow-md text-xs font-bold transition-all active:scale-95"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, error, className = "", children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label className="mb-1 block text-xs font-semibold text-slate-700">{label}</Label>
      {children}
      {error && <div className="mt-1 flex items-center gap-1 text-[11px] text-destructive"><AlertCircle className="h-3 w-3" />{error}</div>}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const presets = [
    { name: "Klynn Blue", hex: "#1B4B73" },
    { name: "Teal", hex: "#0D9488" },
    { name: "Emerald", hex: "#059669" },
    { name: "Purple", hex: "#7C3AED" },
    { name: "Ruby", hex: "#E11D48" },
    { name: "Amber", hex: "#D97706" },
    { name: "Slate", hex: "#334155" },
  ];

  return (
    <div className="flex flex-col items-center justify-center text-center w-full">
      <Label className="mb-1.5 block text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</Label>
      
      <div className="flex flex-wrap items-center justify-center gap-1.5 p-1.5 bg-slate-50/80 border border-slate-200/50 rounded-full shadow-inner w-full max-w-[320px] mx-auto">
        {presets.map((p) => {
          const isSelected = value.toLowerCase() === p.hex.toLowerCase();
          return (
            <button
              key={p.hex}
              type="button"
              onClick={() => onChange(p.hex)}
              className="relative h-7 w-7 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center shadow-sm"
              style={{ backgroundColor: p.hex }}
              title={p.name}
            >
              {isSelected && (
                <div className="h-2.5 w-2.5 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <div className="h-1 w-1 rounded-full" style={{ backgroundColor: p.hex }} />
                </div>
              )}
            </button>
          );
        })}

        {/* Custom Color Selector (Color Wheel Palette) */}
        <div className="relative h-7 w-7 rounded-full border border-slate-200 bg-white hover:bg-slate-100 transition-all flex items-center justify-center shadow-sm cursor-pointer hover:scale-110 group active:scale-95">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            title="Seleccionar otro color"
          />
          <Palette className="h-3 w-3 text-slate-500 group-hover:text-primary transition-colors" />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
          HEX: <span className="uppercase font-bold text-slate-800">{value}</span>
        </div>
      </div>
    </div>
  );
}
function PasswordStrengthIndicator({ password }: { password: string }) {
  const getStrength = (p: string) => {
    let score = 0;
    if (!p) return 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };

  const strength = getStrength(password);
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
          <p className={`text-[10px] font-bold uppercase tracking-wider ${strength <= 2 ? "text-orange-500" : "text-success"}`}>
            Seguridad: {labels[strength]}
          </p>
        </div>
      )}
    </div>
  );
}
