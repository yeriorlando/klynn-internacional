import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { compressImage } from "@/lib/compressImage";
import { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Check, Building2, Palette, Package, PartyPopper,
  AlertCircle, Search, MapPin, Upload, Image as ImageIcon, Sparkles,
  Cloud, Loader2, Droplet,
} from "lucide-react";
import { Logo } from "@/components/klynn/Logo";
import { SeedBootstrap } from "@/components/klynn/SeedBootstrap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PLANS, formatRD, formatPhoneRD, isSlugAvailable, registerBranch, getTenantsForUser, getPlans,
  setActiveTenant, uid, PROVINCIAS_RD, DEFAULT_CONFIG, getGlobalConfig,
  DEFAULT_GLOBAL_CONFIG,
  setSession,
  isModuleEnabled,
  type PlanId, type Tenant, type TenantConfig, type Empleado, type GlobalConfig
} from "@/lib/storage";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/nueva-sucursal")({
  head: () => ({
    meta: [
      { title: "Nueva Sucursal — Klynn" },
    ],
  }),
  component: NuevaSucursalPage,
});

const STEPS = [
  { id: 1, label: "Empresa", icon: Building2 },
  { id: 2, label: "Marca", icon: Palette },
  { id: 3, label: "Listo", icon: PartyPopper },
];

interface FormState {
  nombre: string;
  telefono: string;
  provincia: string;
  slug: string;
  slugTouched: boolean;
  color_primario: string;
  color_secundario: string;
  logo_url: string;
  plan_id: PlanId;
}

const initial: FormState = {
  nombre: "",
  telefono: "",
  provincia: "",
  slug: "",
  slugTouched: false,
  color_primario: "#1B4B73",
  color_secundario: "#F0B900",
  logo_url: "",
  plan_id: "pro",
};

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "").slice(0, 24);
}

function NuevaSucursalPage() {
  const auth = useRequireAuth();
  const navigate = useNavigate();
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>(DEFAULT_GLOBAL_CONFIG);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(() => ({
    ...initial,
    plan_id: DEFAULT_GLOBAL_CONFIG.defaultPlanId
  }));

  useEffect(() => {
    getGlobalConfig().then(cfg => {
      setGlobalConfig(cfg);
      setForm(f => ({ ...f, plan_id: f.plan_id || cfg.defaultPlanId }));
    });

    // Protección de multisucursal
    async function checkPermission() {
      if (!auth?.empleado.email || auth.empleado.id === '__loading__') return;
      
      const [tenants, allPlans] = await Promise.all([
        getTenantsForUser(auth.empleado.email),
        getPlans()
      ]);

      if (tenants.length > 0) {
        const hasMulti = tenants.some(t => {
          const p = allPlans.find(plan => plan.id === t.plan_id);
          return isModuleEnabled(t, 'multisucursal', p);
        });

        if (!hasMulti) {
          toast.error("Tu plan actual no permite registrar más sucursales");
          navigate({ to: "/dashboard-admin" });
        }
      }
    }
    checkPermission();
  }, [auth?.empleado.email]);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [provOpen, setProvOpen] = useState(false);
  const [createdTenant, setCreatedTenant] = useState<Tenant | null>(null);
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

  // Se eliminó la lógica de filteredSteps de Plan ya que las sucursales heredan el plan del Tenant principal.

  const slugOk = useMemo(
    () => form.slug.length >= 3 && /^[a-z0-9]+$/.test(form.slug) && isSlugAvailable(form.slug),
    [form.slug]
  );

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => {
      const next = { ...f, [k]: v };
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
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleFinalize() {
    if (!auth) return;

    const config: TenantConfig = {
      ...DEFAULT_CONFIG,
    };
    const tenant: Tenant = {
      id: uid("ten"),
      nombre: form.nombre,
      slug: form.slug,
      telefono: form.telefono,
      direccion: "",
      provincia: form.provincia,
      email: auth.empleado.email, // Usa el email del usuario actual
      logo_url: form.logo_url || undefined,
      color_primario: form.color_primario,
      color_secundario: form.color_secundario,
      plan_id: auth.tenant.plan_id,
      estado: auth.tenant.estado,
      trial_hasta: auth.tenant.trial_hasta,
      creado_en: new Date().toISOString(),
      config,
    };

    const admin: Empleado = {
      id: "", // Se llenará en registerBranch con el ID actual
      tenant_id: tenant.id,
      nombre: auth.empleado.nombre,
      email: auth.empleado.email,
      password: "", // no se usa aquí
      rol: "ADMIN",
      activo: true,
      creado_en: new Date().toISOString(),
    };

    setIsProvisioning(true);
    setProvisioningStep(0);

    try {
      await registerBranch(tenant, admin, auth.empleado.id);
      
      // Actualizar sesión activa
      setSession({
        empleado_id: auth.empleado.id,
        tenant_id: tenant.id,
        iniciado_en: new Date().toISOString()
      });
      setActiveTenant(tenant.slug);
      setCreatedTenant(tenant);

      const steps = [
        "Configurando subdominio en Cloudflare...",
        "Asignando certificados SSL...",
        "Aislando base de datos para la sucursal...",
        "Configurando entorno de producción...",
        "¡Listo!"
      ];

      let current = 0;
      const interval = setInterval(() => {
        current++;
        setProvisioningStep(current);
        if (current >= steps.length - 1) {
          clearInterval(interval);
          setTimeout(() => {
            setIsProvisioning(false);
            setStep(3); // "Listo"
          }, 800);
        }
      }, 1200);
    } catch (err: any) {
      setIsProvisioning(false);
      let errMsg = err.message || "Error al crear la sucursal";

      if (errMsg.includes("tenants_slug_key")) {
        errMsg = "Este subdominio ya está en uso. Por favor elige otro para esta sucursal.";
        setErrors({ slug: errMsg });
        setStep(2);
        return;
      }

      setErrors({ nombre: errMsg });
      setStep(1); 
    }
  }

  function next() {
    if (!validateStep()) return;
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      handleFinalize();
    }
  }

  function prev() { 
    setStep((s) => Math.max(1, s - 1)); 
  }

  if (!auth || auth.empleado.id === '__loading__') return null;

  return (
    <div className="min-h-screen bg-gradient-hero">
      <SeedBootstrap />
      <header className="flex h-24 items-center justify-center px-6 relative">
        <Logo size="lg" to="/dashboard-admin" />
        <div className="absolute right-6 hidden text-sm md:block">
          <Link to="/dashboard-admin" className="font-semibold text-primary hover:underline">Volver al panel</Link>
        </div>
      </header>

      <main className="container mx-auto pb-20 pt-10">
        <div className="mx-auto mb-12 max-w-2xl px-4">
          <div className="flex items-center gap-2 rounded-full border border-border bg-white/50 p-1.5 shadow-sm">
            {STEPS.map((s) => {
              const done = step > s.id;
              const current = step === s.id;
              return (
                <div key={s.id} className={`relative flex transition-all duration-700 ${current ? "flex-[2]" : "flex-1"}`}>
                  <motion.div
                    animate={{
                      backgroundColor: done ? "var(--success)" : current ? "var(--primary)" : "transparent",
                    }}
                    className={`flex h-11 w-full items-center gap-2 overflow-hidden rounded-full px-4 transition-all duration-500 ${
                      done || current ? "text-white" : "text-slate-400"
                    } ${!done && !current ? "hover:bg-white/50" : ""}`}
                  >
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                      done || current ? "bg-white/20" : "bg-slate-200 text-slate-500"
                    }`}>
                      {done ? <Check className="h-4 w-4" /> : s.id}
                    </div>
                    {(current || done) && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        className="overflow-hidden whitespace-nowrap text-[11px] font-bold uppercase tracking-widest"
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

        <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-surface p-6 shadow-elegant md:p-10">
          {isProvisioning ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="mb-8 rounded-full border-4 border-primary/20 border-t-primary p-4"
              >
                <Droplet className="h-12 w-12 text-primary" fill="currentColor" />
              </motion.div>
              <h2 className="text-2xl font-bold">Creando tu sucursal</h2>
              <p className="mt-2 text-muted-foreground italic">
                {[
                  "Configurando subdominio en Cloudflare...",
                  "Asignando certificados SSL...",
                  "Aislando base de datos para la sucursal...",
                  "Configurando entorno de producción...",
                  "¡Casi listo!"
                ][provisioningStep]}
              </p>
              <div className="mt-8 h-1.5 w-64 overflow-hidden rounded-full bg-slate-100">
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
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
              {step === 1 && (
                <>
                  <h1 className="mb-2 text-3xl font-bold">Datos de la nueva sucursal</h1>
                  <p className="mb-8 text-muted-foreground">Expande tu negocio agregando una nueva lavandería.</p>
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Nombre comercial *" error={errors.nombre} className="md:col-span-2">
                      <Input value={form.nombre} onChange={(e) => update("nombre", e.target.value)} placeholder="Lavandería La Burbuja (Suc. Norte)" />
                    </Field>
                    <Field label="Teléfono *" error={errors.telefono}>
                      <Input value={form.telefono} onChange={(e) => update("telefono", formatPhoneRD(e.target.value))} placeholder="809-555-0142" />
                    </Field>
                    <Field label="Provincia *" error={errors.provincia}>
                      <button type="button" onClick={() => setProvOpen(true)} className="flex h-11 w-full items-center justify-between rounded-lg border border-input bg-background px-3 text-sm shadow-sm hover:bg-accent/30 transition-all">
                        <span className={form.provincia ? "text-foreground font-medium" : "text-muted-foreground"}>{form.provincia || "Selecciona tu provincia..."}</span>
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </Field>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h1 className="mb-2 text-3xl font-bold">Personaliza la sucursal</h1>
                  <p className="mb-8 text-muted-foreground">Define la identidad de esta nueva lavandería.</p>
                  <div className="grid gap-6">
                    <Field label="Tu subdominio *" error={errors.slug} className="hidden">
                      <div className="flex h-11 items-center overflow-hidden rounded-lg border border-input bg-background focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                        <Input className="border-0 focus-visible:ring-0 font-bold text-lg text-primary h-full" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value), slugTouched: true }))} placeholder="lavanderia-norte" />
                        <div className="px-4 text-sm font-medium text-muted-foreground bg-muted h-full flex items-center border-l border-input">.klynn.com.do</div>
                      </div>
                    </Field>

                    {/* Branding Preview */}
                    <div className="rounded-3xl border border-border/80 bg-slate-50/50 p-6 md:p-8 backdrop-blur-sm relative overflow-hidden text-center shadow-inner mt-2">
                      <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-primary/5 blur-[30px] pointer-events-none" />
                      <div className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Vista previa de la sucursal</div>
                      <div className="flex flex-col items-center gap-4">
                        <div
                          className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full border-[4px] border-white shadow-elegant transition-all duration-500 bg-white"
                          style={{ borderColor: form.color_primario }}
                        >
                          {form.logo_url ? (
                            <img src={form.logo_url} alt="logo" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-slate-50">
                               <Building2 className="h-14 w-14 text-slate-300" />
                            </div>
                          )}
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-display font-bold tracking-tight mb-2" style={{ color: form.color_primario }}>{form.nombre || "Sucursal"}</div>
                          
                          {/* El botón de subir logo justo debajo del nombre de la lavandería con su icono */}
                          <div className="flex items-center justify-center gap-2 mt-3">
                            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                            <button
                              type="button"
                              onClick={() => logoInputRef.current?.click()}
                              className="h-9 px-4 rounded-full bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 border border-slate-200 shadow-sm flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                            >
                              <Upload className="h-3.5 w-3.5 text-slate-500" /> {form.logo_url ? "Cambiar logotipo" : "Subir logotipo"}
                            </button>
                            {form.logo_url && (
                              <button
                                type="button"
                                onClick={() => update("logo_url", "")}
                                className="h-9 w-9 rounded-full bg-destructive/10 hover:bg-destructive text-destructive hover:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 text-sm font-bold animate-fade-in"
                                title="Quitar logotipo"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-6 mt-4">
                      {/* Selector de color centrado */}
                      <ColorField label="Color principal de la sucursal" value={form.color_primario} onChange={(v) => update("color_primario", v)} />
                      
                    </div>

                  </div>
                </>
              )}

              {step === 3 && createdTenant && (
                <SuccessCard tenant={createdTenant} adminNombre={auth.empleado.nombre} onEnter={() => navigate({ to: `/t/${createdTenant.slug}` })} />
              )}
            </motion.div>
          </AnimatePresence>
        )}

          {step < 3 && !isProvisioning && (
            <div className="mt-10 flex items-center justify-between border-t border-border pt-8">
              <Button 
                variant="outline" 
                onClick={prev} 
                disabled={step === 1}
                className="h-9 bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 font-bold"
              >
                <ArrowLeft className="mr-1 h-4 w-4" /> Atrás
              </Button>
              <Button 
                onClick={next} 
                size="sm"
                className="bg-primary text-white shadow-glow hover:opacity-95 font-bold h-9 px-6"
              >
                {step === 2 ? "Crear sucursal" : "Continuar"} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </main>

      <ProvinciaModal open={provOpen} onClose={() => setProvOpen(false)} value={form.provincia} onSelect={(p) => { update("provincia", p); setProvOpen(false); }} />
    </div>
  );
}

function SuccessCard({ tenant, adminNombre, onEnter }: { tenant: Tenant; adminNombre: string; onEnter: () => void }) {
  const planNombre = PLANS.find((p) => p.id === tenant.plan_id)?.nombre || tenant.plan_id;
  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="relative mx-auto mb-4 h-28 w-28"
      >
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-slate-100 bg-white shadow-sm">
           {tenant.logo_url ? (
             <img src={tenant.logo_url} alt="Logo" className="h-full w-full object-cover" />
           ) : (
             <PartyPopper className="h-12 w-12 text-primary" />
           )}
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h1 className="mb-1 text-3xl font-bold tracking-tight">¡Sucursal Creada, {adminNombre.split(" ")[0]}!</h1>
        <p className="mb-5 text-sm text-muted-foreground text-balance">Tu sucursal <strong className="text-foreground">{tenant.nombre}</strong> ya está lista.</p>

        <div className="mx-auto mb-6 max-w-sm overflow-hidden rounded-xl border border-border bg-white text-left">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary/60" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Acceso</span>
            </div>
            <div className="font-mono text-xs font-semibold">{tenant.slug}.klynn.com.do</div>
          </div>
          
          <div className="grid grid-cols-2 divide-x divide-border">
            <div className="px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Plan</div>
              <div className="mt-0.5 font-bold text-lg">{planNombre}</div>
            </div>
            <div className="px-4 py-3 bg-slate-50/30">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Estado de Cuenta</div>
              <div className="mt-0.5 font-bold text-lg text-success">
                {tenant.estado === "TRIAL" ? "Prueba Activa" : "Suscripción Activa"}
              </div>
            </div>
          </div>
        </div>

        <Button size="lg" className="h-11 w-full max-w-xs rounded-xl bg-primary text-white hover:bg-primary/90 transition-all" onClick={onEnter}>
          <Sparkles className="mr-2 h-4 w-4" /> Entrar a mi sucursal <ArrowRight className="ml-1 h-4 w-4" />
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
      <Label className="mb-1.5 block text-sm font-medium">{label}</Label>
      {children}
      {error && <div className="mt-1.5 flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3 w-3" />{error}</div>}
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
      <Label className="mb-3 block text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</Label>
      
      <div className="flex flex-wrap items-center justify-center gap-2 p-2 bg-slate-50/80 border border-slate-200/50 rounded-full shadow-inner w-full max-w-[340px] mx-auto">
        {presets.map((p) => {
          const isSelected = value.toLowerCase() === p.hex.toLowerCase();
          return (
            <button
              key={p.hex}
              type="button"
              onClick={() => onChange(p.hex)}
              className="relative h-8 w-8 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center shadow-sm"
              style={{ backgroundColor: p.hex }}
              title={p.name}
            >
              {isSelected && (
                <div className="h-3 w-3 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.hex }} />
                </div>
              )}
            </button>
          );
        })}

        {/* Custom Color Selector (Color Wheel Palette) */}
        <div className="relative h-8 w-8 rounded-full border border-slate-250 bg-white hover:bg-slate-100 transition-all flex items-center justify-center shadow-sm cursor-pointer hover:scale-110 group active:scale-95">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            title="Seleccionar otro color"
          />
          <Palette className="h-3.5 w-3.5 text-slate-500 group-hover:text-primary transition-colors" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-mono text-[11px] font-semibold text-slate-500">
          CÓDIGO HEX: <span className="uppercase text-slate-700">{value}</span>
        </div>
      </div>
    </div>
  );
}
