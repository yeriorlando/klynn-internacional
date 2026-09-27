import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { compressImage } from "@/lib/compressImage";
import { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Check, Palette, Package, PartyPopper,
  AlertCircle, Search, MapPin, Upload, Image as ImageIcon, Sparkles,
  Cloud, Loader2, Droplet, Store, Phone, ChevronRight, Landmark,
  Layers, Truck, Wallet, Receipt, MessageCircle,
} from "lucide-react";
import { Logo } from "@/components/klynn/Logo";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
import { SeedBootstrap } from "@/components/klynn/SeedBootstrap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  PLANS, formatRD, formatPhoneRD, isSlugAvailable, registerBranch, getTenantsForUser, getPlans,
  setActiveTenant, uid, PROVINCIAS_RD, DEFAULT_CONFIG, getGlobalConfig,
  DEFAULT_GLOBAL_CONFIG,
  setSession,
  isModuleEnabled,
  type PlanId, type Tenant, type TenantConfig, type Empleado, type GlobalConfig
} from "@/lib/storage";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { consultarRNC } from "@/lib/fiscal";
import { getCountry, getCountryByCode } from "@/lib/countries";
import { CountrySelect } from "@/components/klynn/CountrySelect";
import { RegionSelectModal } from "@/components/klynn/RegionSelectModal";
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
  { id: 1, label: "Empresa", icon: Store },
  { id: 2, label: "Marca", icon: Palette },
  { id: 3, label: "Listo", icon: Sparkles },
];


const LAUNDRY_BUBBLES = [
  // Lado Izquierdo
  { id: 1, size: 100, top: "3%", left: "3%", dur: 7.5, delay: 0, swayX: [-12, 14, -8, 10, -12], floatY: [-22, 20, -22], scale: [1, 1.05, 0.96, 1.04, 1] },
  { id: 2, size: 28, top: "14%", left: "10%", dur: 5.2, delay: 0.3, swayX: [10, -14, 12, -8, 10], floatY: [24, -22, 24], scale: [1, 1.08, 0.94, 1.06, 1] },
  { id: 3, size: 14, top: "20%", left: "6%", dur: 4.2, delay: 0.8, swayX: [-8, 10, -6, 8, -8], floatY: [-16, 18, -16] },
  { id: 4, size: 22, top: "25%", left: "14%", dur: 6.0, delay: 0.1, swayX: [14, -10, 12, -14, 14], floatY: [20, -24, 20], scale: [1, 1.06, 0.95, 1.04, 1] },
  { id: 5, size: 10, top: "31%", left: "4%", dur: 3.8, delay: 1.2, swayX: [-6, 8, -8, 6, -6], floatY: [-14, 15, -14] },
  { id: 6, size: 18, top: "37%", left: "12%", dur: 5.5, delay: 0.6, swayX: [8, -12, 10, -8, 8], floatY: [18, -20, 18] },
  { id: 7, size: 8, top: "43%", left: "8%", dur: 3.4, delay: 1.7, swayX: [-5, 7, -6, 5, -5], floatY: [-12, 14, -12] },
  { id: 8, size: 120, bottom: "4%", left: "2%", dur: 9.2, delay: 0, swayX: [-15, 12, -10, 14, -15], floatY: [-26, 24, -26], scale: [1, 1.04, 0.96, 1.03, 1] },
  { id: 9, size: 36, bottom: "16%", left: "12%", dur: 6.5, delay: 0.4, swayX: [12, -16, 14, -10, 12], floatY: [25, -22, 25], scale: [1, 1.07, 0.94, 1.05, 1] },
  { id: 10, size: 12, bottom: "24%", left: "5%", dur: 4.0, delay: 1.0, swayX: [-7, 9, -8, 7, -7], floatY: [-15, 16, -15] },
  { id: 11, size: 20, bottom: "30%", left: "15%", dur: 5.0, delay: 0.5, swayX: [9, -11, 8, -10, 9], floatY: [18, -18, 18] },
  { id: 12, size: 7, bottom: "38%", left: "8%", dur: 3.2, delay: 1.5, swayX: [-4, 6, -5, 4, -4], floatY: [-10, 12, -10] },
  { id: 13, size: 16, bottom: "46%", left: "14%", dur: 4.6, delay: 0.9, swayX: [7, -9, 8, -6, 7], floatY: [16, -16, 16] },
  { id: 14, size: 9, bottom: "54%", left: "6%", dur: 3.6, delay: 2.0, swayX: [-5, 7, -6, 5, -5], floatY: [-12, 13, -12] },

  // Lado Derecho
  { id: 15, size: 90, top: "5%", right: "4%", dur: 8.0, delay: 0.2, swayX: [14, -12, 10, -14, 14], floatY: [22, -24, 22], scale: [1, 1.05, 0.95, 1.04, 1] },
  { id: 16, size: 30, top: "16%", right: "12%", dur: 5.6, delay: 0.5, swayX: [-12, 15, -10, 12, -12], floatY: [-22, 24, -22], scale: [1, 1.08, 0.94, 1.06, 1] },
  { id: 17, size: 14, top: "22%", right: "5%", dur: 4.4, delay: 1.1, swayX: [8, -10, 7, -9, 8], floatY: [16, -17, 16] },
  { id: 18, size: 24, top: "28%", right: "16%", dur: 6.2, delay: 0.3, swayX: [-14, 11, -13, 10, -14], floatY: [-20, 22, -20], scale: [1, 1.06, 0.95, 1.04, 1] },
  { id: 19, size: 9, top: "34%", right: "7%", dur: 3.5, delay: 1.8, swayX: [6, -7, 5, -6, 6], floatY: [13, -14, 13] },
  { id: 20, size: 18, top: "40%", right: "11%", dur: 5.1, delay: 0.7, swayX: [-8, 11, -9, 7, -8], floatY: [-18, 19, -18] },
  { id: 21, size: 11, top: "46%", right: "18%", dur: 4.1, delay: 1.3, swayX: [7, -8, 6, -7, 7], floatY: [15, -16, 15] },
  { id: 22, size: 85, bottom: "6%", right: "4%", dur: 7.8, delay: 0.1, swayX: [12, -15, 11, -13, 12], floatY: [24, -22, 24], scale: [1, 1.04, 0.96, 1.03, 1] },
  { id: 23, size: 40, bottom: "18%", right: "13%", dur: 6.6, delay: 0.4, swayX: [-15, 18, -12, 14, -15], floatY: [-24, 26, -24], scale: [1, 1.07, 0.94, 1.05, 1] },
  { id: 24, size: 12, bottom: "26%", right: "6%", dur: 4.3, delay: 1.2, swayX: [7, -9, 8, -6, 7], floatY: [15, -16, 15] },
  { id: 25, size: 22, bottom: "33%", right: "17%", dur: 5.4, delay: 0.6, swayX: [-10, 12, -9, 11, -10], floatY: [-19, 21, -19] },
  { id: 26, size: 8, bottom: "41%", right: "8%", dur: 3.3, delay: 1.9, swayX: [5, -6, 4, -5, 5], floatY: [11, -12, 11] },
  { id: 27, size: 16, bottom: "49%", right: "12%", dur: 4.8, delay: 1.4, swayX: [-7, 9, -8, 6, -7], floatY: [-16, 17, -16] },
  { id: 28, size: 6, bottom: "56%", right: "19%", dur: 3.0, delay: 2.2, swayX: [4, -5, 3, -4, 4], floatY: [9, -10, 9] },

  // Flotando alrededor del Header y Bordes
  { id: 29, size: 12, top: "7%", left: "28%", dur: 5.0, delay: 0.4, swayX: [-6, 8, -7, 5, -6], floatY: [-14, 16, -14] },
  { id: 30, size: 10, top: "9%", right: "28%", dur: 4.7, delay: 0.9, swayX: [6, -7, 5, -6, 6], floatY: [13, -15, 13] },
  { id: 31, size: 14, bottom: "3%", left: "30%", dur: 5.8, delay: 0.7, swayX: [-8, 9, -7, 8, -8], floatY: [-16, 18, -16] },
  { id: 32, size: 11, bottom: "5%", right: "30%", dur: 4.5, delay: 1.3, swayX: [7, -8, 6, -7, 7], floatY: [14, -15, 14] },
];

interface FormState {
  nombre: string;
  nombre_sucursal: string;
  pais_codigo: string;
  rnc: string;
  razon_social: string;
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
  nombre_sucursal: "",
  pais_codigo: "",
  rnc: "",
  razon_social: "",
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
  const [enableFiscalDoc, setEnableFiscalDoc] = useState(false);
  const [form, setForm] = useState<FormState>(() => ({
    ...initial,
    pais_codigo: auth?.tenant?.pais_codigo || "DO",
    plan_id: DEFAULT_GLOBAL_CONFIG.defaultPlanId
  }));

  const currentCountry = useMemo(() => {
    return getCountryByCode(form.pais_codigo || auth?.tenant?.pais_codigo || "DO");
  }, [form.pais_codigo, auth?.tenant?.pais_codigo]);

  useEffect(() => {
    getGlobalConfig().then(cfg => {
      setGlobalConfig(cfg);
      setForm(f => ({ ...f, plan_id: f.plan_id || cfg.defaultPlanId }));
    });

    // Cargar datos por defecto de la empresa matriz
    if (auth?.tenant) {
      const rawNombre = auth.tenant.nombre || "";
      const isGenericAdmin = 
        auth.tenant.id === "admin" || 
        rawNombre.toLowerCase().includes("administración global") || 
        rawNombre.toLowerCase().includes("administracion global");
      const defaultNombre = isGenericAdmin ? "" : rawNombre;

      const originCountry = auth.tenant.pais_codigo || "DO";

      setForm(f => ({
        ...f,
        nombre: f.nombre || defaultNombre,
        pais_codigo: auth.tenant.pais_codigo || f.pais_codigo || "DO",
        rnc: f.rnc || auth.tenant.rnc || "",
        razon_social: f.razon_social || auth.tenant.config?.razon_social || "",
        color_primario: f.color_primario || auth.tenant.color_primario || "#1B4B73",
        color_secundario: f.color_secundario || auth.tenant.color_secundario || "#F0B900",
        logo_url: f.logo_url || auth.tenant.logo_url || "",
        provincia: f.provincia || auth.tenant.provincia || "",
        telefono: f.telefono || auth.tenant.telefono || "",
      }));
    }

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
  }, [auth?.empleado.email, auth?.tenant?.id]);

  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [provOpen, setProvOpen] = useState(false);
  const [createdTenant, setCreatedTenant] = useState<Tenant | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisioningStep, setProvisioningStep] = useState(0);

  const logoInputRef = useRef<HTMLInputElement>(null);

  const [loadingRNC, setLoadingRNC] = useState(false);
  const lastSearchedRNCRef = useRef<string>("");

  async function handleSearchRNC(rncValue?: string, force = false) {
    if (currentCountry.code !== "DO") return;
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

  const slugOk = useMemo(
    () => form.slug.length >= 3 && /^[a-z0-9]+$/.test(form.slug) && isSlugAvailable(form.slug),
    [form.slug]
  );

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if ((k === "nombre_sucursal" || k === "nombre") && !f.slugTouched) {
        const branchPart = k === "nombre_sucursal" ? String(v) : f.nombre_sucursal;
        const brandPart = k === "nombre" ? String(v) : f.nombre;
        if (branchPart && branchPart.trim()) {
          next.slug = slugify(branchPart);
        } else if (brandPart && brandPart.trim()) {
          next.slug = slugify(brandPart);
        }
      }
      return next;
    });
    setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function validateStep(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (step === 1) {
      if (!form.nombre_sucursal.trim()) e.nombre_sucursal = "Ingresa la denominación de la sucursal (ej: Sucursal Bella Vista)";
      if (!form.nombre.trim()) e.nombre = "Ingresa el nombre de la lavandería";
      if (!form.telefono || form.telefono.replace(/\D/g, "").length < (currentCountry.code === "DO" ? 10 : 7)) {
        e.telefono = "Teléfono inválido";
      }
      if (!form.provincia) e.provincia = `Selecciona tu ${currentCountry.regionsLabel.toLowerCase().slice(0, -1) || "ubicación"}`;
    }
    if (step === 2) {
      if (!slugOk) e.slug = "Subdominio inválido o no disponible";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleFinalize() {
    if (!auth) return;

    const branchName = form.nombre_sucursal.trim() || "Nueva Sucursal";
    const isDOTenant = currentCountry.code === "DO";
    const shouldCobrarImpuesto = isDOTenant ? true : enableFiscalDoc;
    const effectiveTaxRate = shouldCobrarImpuesto ? currentCountry.tax.defaultRate : 0;

    const config: TenantConfig = {
      ...DEFAULT_CONFIG,
      pais_codigo: currentCountry.code,
      moneda_simbolo: currentCountry.currency.symbol,
      moneda_codigo: currentCountry.currency.code,
      impuesto_nombre: currentCountry.tax.name,
      impuesto_porcentaje: effectiveTaxRate,
      cobrar_impuesto: shouldCobrarImpuesto,
      nombre_sucursal: branchName,
      razon_social: form.razon_social || auth.tenant.config?.razon_social || "",
    };
    const tenant: Tenant = {
      id: uid("ten"),
      nombre: form.nombre.trim(),
      nombre_sucursal: branchName,
      slug: form.slug.trim(),
      rnc: form.rnc.trim() || auth.tenant.rnc,
      telefono: form.telefono,
      direccion: "",
      provincia: form.provincia,
      email: auth.empleado.email,
      logo_url: form.logo_url || undefined,
      color_primario: form.color_primario,
      color_secundario: form.color_secundario,
      plan_id: auth.tenant.plan_id,
      estado: auth.tenant.estado,
      trial_hasta: auth.tenant.trial_hasta,
      creado_en: new Date().toISOString(),
      pais_codigo: form.pais_codigo || auth.tenant.pais_codigo || currentCountry.code,
      moneda_simbolo: currentCountry.currency.symbol,
      moneda_codigo: currentCountry.currency.code,
      impuesto_nombre: currentCountry.tax.name,
      impuesto_porcentaje: effectiveTaxRate,
      documento_fiscal_label: currentCountry.doc.label,
      config,
    };

    const admin: Empleado = {
      id: "",
      tenant_id: tenant.id,
      nombre: auth.empleado.nombre,
      email: auth.empleado.email,
      password: "",
      rol: "ADMIN",
      activo: true,
      creado_en: new Date().toISOString(),
    };

    setIsProvisioning(true);
    setProvisioningStep(0);

    try {
      await registerBranch(tenant, admin, auth.empleado.id);
      
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
            setStep(3);
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

  if (!auth || auth.empleado.id === '__loading__') {
    return <GlobalPageLoader text="Cargando configuración de sucursales..." minHeight="min-h-screen" />;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-[#B8E2FD] via-[#CEEBFE] to-[#A8DAFC] text-slate-800">
      <SeedBootstrap />

      {/* 1. Ondas y Resplandores Acuáticos de Lavandería */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Esferas de Luz y Flujo de Agua */}
        <div className="absolute -left-[10%] -top-[10%] h-[550px] w-[550px] rounded-full bg-gradient-to-br from-[#1B4B73]/25 to-[#0284C7]/20 blur-[90px]" />
        <div className="absolute -right-[10%] top-[15%] h-[600px] w-[600px] rounded-full bg-gradient-to-bl from-[#0284C7]/25 to-[#38BDF8]/20 blur-[100px]" />
        <div className="absolute left-[20%] bottom-[-10%] h-[650px] w-[650px] rounded-full bg-gradient-to-tr from-[#1B4B73]/20 via-[#0284C7]/20 to-[#38BDF8]/25 blur-[100px]" />

        {/* Ondas SVG Estilizadas */}
        <svg
          className="absolute inset-0 h-full w-full opacity-40"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          viewBox="0 0 1440 900"
        >
          <path
            d="M0,160 C320,300 420,40 720,160 C1020,280 1120,60 1440,180 L1440,900 L0,900 Z"
            fill="url(#water-grad-1)"
            opacity="0.5"
          />
          <path
            d="M0,320 C360,180 500,420 860,280 C1220,140 1300,360 1440,240 L1440,900 L0,900 Z"
            fill="url(#water-grad-2)"
            opacity="0.35"
          />
          <defs>
            <linearGradient id="water-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7DD3FC" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="water-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#BAE6FD" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </svg>

        {/* 2. Burbujas de Lavandería con Flotación Natural */}
        {LAUNDRY_BUBBLES.map((b) => (
          <motion.div
            key={b.id}
            style={{
              width: b.size,
              height: b.size,
              top: b.top,
              bottom: b.bottom,
              left: b.left,
              right: b.right,
            }}
            animate={{
              y: b.floatY,
              x: b.swayX,
              scale: b.scale || [1, 1.06, 0.96, 1.03, 1],
              rotate: [0, 8, -8, 4, 0],
            }}
            transition={{
              duration: b.dur,
              delay: b.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className={`absolute rounded-full pointer-events-none select-none ${
              b.size > 60
                ? "bg-gradient-to-tr from-white/80 via-sky-200/60 to-blue-200/50 border-2 border-white shadow-[0_12px_36px_rgba(2,132,199,0.25)] backdrop-blur-xs"
                : b.size > 20
                ? "bg-gradient-to-tr from-white/85 via-sky-200/65 to-blue-100/50 border-1.5 border-white shadow-[0_4px_18px_rgba(2,132,199,0.2)]"
                : "bg-gradient-to-tr from-white/95 via-sky-300/65 to-white/70 border border-white shadow-xs"
            }`}
          >
            {/* Reflejo Curvo de Burbuja de Jabón Realista */}
            {b.size >= 14 && (
              <div 
                className="absolute rounded-full bg-white/95 rotate-[-30deg]" 
                style={{
                  top: Math.max(2, b.size * 0.1),
                  left: Math.max(2.5, b.size * 0.12),
                  width: Math.max(3, b.size * 0.24),
                  height: Math.max(1.5, b.size * 0.11),
                }}
              />
            )}
            {b.size >= 35 && (
              <div 
                className="absolute rounded-full bg-white/70" 
                style={{
                  bottom: b.size * 0.12,
                  right: b.size * 0.15,
                  width: Math.max(2, b.size * 0.09),
                  height: Math.max(2, b.size * 0.09),
                }}
              />
            )}
          </motion.div>
        ))}
      </div>



      <div className="relative z-10">
        <header className="flex flex-col items-center justify-center pt-5 pb-1 px-6 relative">
          <div className="flex flex-col items-center">
            <Logo size="lg" to="/dashboard-admin" />
            <span className="-mt-2 text-[13px] font-semibold tracking-tight text-slate-500/80">
              Tu lavandería, simplificada.
            </span>
          </div>

          {/* Botón Superior Destacado Sólido */}
          <div className="absolute right-6 top-4 hidden md:flex items-center gap-3 px-4 py-2 rounded-full bg-[#1B4B73] text-white shadow-lg shadow-[#1B4B73]/25 border border-white/20 transition-all hover:scale-105">
            <span className="text-xs sm:text-sm font-medium text-white/90">¿Volver al panel?</span>
            <Link 
              to="/dashboard-admin" 
              className="inline-flex items-center gap-1.5 font-bold text-xs sm:text-sm text-[#1B4B73] bg-[#F0B900] hover:bg-[#F0B900]/90 px-3.5 py-1 rounded-full shadow-xs transition-colors"
            >
              Ir al panel
              <ArrowRight className="h-3.5 w-3.5 text-[#1B4B73]" />
            </Link>
          </div>
        </header>

        <main className="container mx-auto pb-6 pt-2">
          {/* Wizard Stepper Compacto & Horizontal de Baja Altura */}
          <div className="mx-auto mb-4 max-w-xl px-2">
            <div className="flex items-center justify-between gap-1 sm:gap-2 rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-xl p-1.5 sm:p-2 shadow-md shadow-slate-200/40">
              {STEPS.map((s, index) => {
                const done = step > s.id;
                const current = step === s.id;
                const StepIcon = s.icon;

                return (
                  <div key={s.id} className="flex items-center gap-1 sm:gap-2 flex-1 last:flex-none">
                    <div
                      className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl transition-all duration-300 w-full justify-center sm:justify-start ${
                        current
                          ? "bg-[#1B4B73] text-white shadow-xs font-bold"
                          : done
                          ? "bg-[#1B4B73]/10 text-[#1B4B73] font-semibold hover:bg-[#1B4B73]/15"
                          : "text-slate-400 font-medium hover:text-slate-600"
                      }`}
                    >
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs transition-colors ${
                          current
                            ? "bg-white/15 text-[#F0B900]"
                            : done
                            ? "bg-[#1B4B73] text-[#F0B900]"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {done ? (
                          <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                        ) : (
                          <StepIcon className="h-3.5 w-3.5" />
                        )}
                      </div>

                      <div className="hidden sm:flex flex-col">
                        <span className={`text-[9px] font-black uppercase tracking-wider leading-none ${
                          current ? "text-[#F0B900]" : done ? "text-[#1B4B73]" : "text-slate-400"
                        }`}>
                          0{index + 1}
                        </span>
                        <span className="text-[11px] font-bold tracking-tight leading-tight">
                          {s.label}
                        </span>
                      </div>
                    </div>

                    {index < STEPS.length - 1 && (
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0 hidden sm:block" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-xl p-5 shadow-xl shadow-slate-200/50 sm:p-6 md:p-8">
            {isProvisioning ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="mb-6 rounded-full border-4 border-primary/20 border-t-primary p-3"
                >
                  <Droplet className="h-10 w-10 text-primary" fill="currentColor" />
                </motion.div>
                <h2 className="text-xl font-bold">Creando tu sucursal</h2>
                <p className="mt-1 text-xs text-muted-foreground italic">
                  {[
                    "Configurando subdominio en Cloudflare...",
                    "Asignando certificados SSL...",
                    "Aislando base de datos para la sucursal...",
                    "Configurando entorno de producción...",
                    "¡Casi listo!"
                  ][provisioningStep]}
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
                      <div className="flex items-center gap-3.5 mb-4">
                        <div className="h-11 w-11 rounded-xl bg-[#1B4B73] text-[#F0B900] flex items-center justify-center shrink-0 shadow-xs">
                          <Store className="h-5.5 w-5.5" />
                        </div>
                        <div>
                          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">Datos de la nueva sucursal</h1>
                          <p className="text-xs text-muted-foreground mt-0.5">Expande tu negocio agregando una nueva sucursal a tu lavandería.</p>
                        </div>
                      </div>

                      {/* Selector de País con Banderas Reales HD */}
                      <div className="mb-4">
                        <label className="text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                          <span>País de la sucursal *</span>
                          <span className="text-[11px] text-muted-foreground font-normal">
                            Moneda e impuestos automáticos
                          </span>
                        </label>
                        <CountrySelect
                          value={form.pais_codigo}
                          onChange={(c) => {
                            setEnableFiscalDoc(false);
                            setForm((prev) => ({
                              ...prev,
                              pais_codigo: c.code,
                              provincia: "",
                              rnc: "",
                              telefono: c.phonePrefix ? `${c.phonePrefix} ` : "",
                            }));
                          }}
                        />
                      </div>

                      {/* Toggle para Activar/Desactivar Identificación Fiscal (RNC / RFC / NIT) */}
                      <div className="mb-4 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs transition-all">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <Landmark className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5 flex-wrap">
                                <span>
                                  {currentCountry.code === "DO"
                                    ? "¿Registrar RNC ante la DGII?"
                                    : `¿Registrar ${currentCountry.doc.label} y cobrar ${currentCountry.tax.name} (${currentCountry.tax.defaultRate}%)?`}
                                </span>
                                <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.2 text-[10px] font-semibold">
                                  Opcional
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {currentCountry.code === "DO"
                                  ? "Activa este toggle si deseas validar con la DGII o déjalo inactivo."
                                  : `Activa este toggle si deseas aplicar ${currentCountry.tax.name} y registrar tu ${currentCountry.doc.label}. Puedes cambiarlo en Configuración.`}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center">
                            <Switch
                              checked={enableFiscalDoc}
                              onCheckedChange={(checked) => {
                                setEnableFiscalDoc(checked);
                                if (!checked) update("rnc", "");
                              }}
                            />
                          </div>
                        </div>

                        {/* Desplegable animado si el toggle está activado */}
                        <AnimatePresence>
                          {enableFiscalDoc && (
                            <motion.div
                              initial={{ opacity: 0, height: 0, marginTop: 0 }}
                              animate={{ opacity: 1, height: "auto", marginTop: 14 }}
                              exit={{ opacity: 0, height: 0, marginTop: 0 }}
                              transition={{ duration: 0.22, ease: "easeOut" }}
                              className="overflow-hidden border-t border-slate-100 pt-3.5 space-y-2.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <label className="text-xs font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                                  <span>Número de {currentCountry.doc.label}</span>
                                  <span className="text-[10px] font-normal text-muted-foreground">
                                    {currentCountry.code === "DO" ? "(9 u 11 dígitos)" : "(Oficial)"}
                                  </span>
                                </label>
                                {currentCountry.code === "DO" && (
                                  <span className="rounded-full bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Consulta DGII Activa
                                  </span>
                                )}
                              </div>

                              <div className="relative flex items-center">
                                <Receipt className="absolute left-3.5 h-4 w-4 text-primary pointer-events-none" />
                                <Input 
                                  value={form.rnc} 
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    update("rnc", val);
                                    if (currentCountry.code === "DO") {
                                      const clean = val.replace(/\D/g, "");
                                      if (clean.length === 9 || clean.length === 11) {
                                        handleSearchRNC(clean);
                                      }
                                    }
                                  }} 
                                  onBlur={() => {
                                    if (currentCountry.code === "DO") handleSearchRNC();
                                  }}
                                  placeholder={currentCountry.doc.placeholder} 
                                  className={`h-11 text-xs sm:text-sm pl-10 rounded-xl border-slate-200 bg-white shadow-none focus-visible:ring-primary/20 ${
                                    currentCountry.code === "DO" ? "pr-32" : "pr-4"
                                  }`}
                                  autoFocus
                                />

                                {currentCountry.code === "DO" && (
                                  <button
                                    type="button"
                                    onClick={() => handleSearchRNC(undefined, true)}
                                    disabled={loadingRNC}
                                    className="absolute right-1.5 h-8 px-3 rounded-lg bg-primary text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer"
                                    title="Buscar en DGII"
                                  >
                                    {loadingRNC ? (
                                      <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        <span>Buscando...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Search className="h-3.5 w-3.5" />
                                        <span>Consultar</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>

                              {form.razon_social && (
                                <motion.div 
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-2 text-xs font-medium text-slate-700"
                                >
                                  <span className="font-bold text-slate-900">Razón Social:</span>
                                  <span className="text-primary font-semibold truncate">{form.razon_social}</span>
                                </motion.div>
                              )}

                              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5">
                                <span className="font-semibold text-slate-700">Nota:</span>
                                <span>
                                  {currentCountry.code === "DO"
                                    ? "Consultaremos en tiempo real tu nombre y estado fiscal registrado ante la DGII."
                                    : `Se utilizará para los comprobantes fiscales y tickets de esta sucursal.`}
                                </span>
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="grid gap-3.5 sm:grid-cols-2">
                        <Field 
                          label={
                            <div className="flex items-center justify-between w-full">
                              <span className="text-xs font-bold text-slate-800">Nombre de la lavandería *</span>
                              <span className="text-[9.5px] font-black uppercase tracking-wider text-white bg-slate-700 dark:bg-slate-800 px-2.5 py-0.5 rounded-full shadow-xs select-none">
                                Marca matriz
                              </span>
                            </div>
                          }
                          hint="Marca de la empresa a la que pertenece esta sucursal"
                          error={errors.nombre}
                        >
                          <div className="relative flex items-center">
                            <Store className="absolute left-3.5 h-4 w-4 text-[#1B4B73] pointer-events-none" />
                            <Input 
                              value={form.nombre} 
                              onChange={(e) => update("nombre", e.target.value)} 
                              placeholder="Ej. Lavandería Las Américas" 
                              className="h-11 text-xs sm:text-sm pl-10 rounded-xl border-slate-200 bg-white shadow-none font-medium"
                            />
                          </div>
                        </Field>

                        <Field 
                          label={
                            <div className="flex items-center justify-between w-full">
                              <span className="text-xs font-bold text-slate-800">Denominación de la sucursal *</span>
                              <span className="text-[9.5px] font-black uppercase tracking-wider text-white bg-[#1B4B73] px-2.5 py-0.5 rounded-full shadow-xs select-none">
                                Sede / Ubicación
                              </span>
                            </div>
                          }
                          hint="Identificador único para diferenciar esta sucursal"
                          error={errors.nombre_sucursal}
                        >
                          <div className="relative flex items-center">
                            <Store className="absolute left-3.5 h-4 w-4 text-[#1B4B73] pointer-events-none" />
                            <Input 
                              value={form.nombre_sucursal} 
                              onChange={(e) => update("nombre_sucursal", e.target.value)} 
                              placeholder="Ej. Sucursal Bella Vista" 
                              className="h-11 text-xs sm:text-sm pl-10 rounded-xl border-slate-200 bg-white shadow-none font-medium"
                              autoFocus
                            />
                          </div>
                        </Field>

                        <Field label="Teléfono / WhatsApp *" error={errors.telefono}>
                          <div className="relative flex items-center">
                            <Phone className="absolute left-3.5 h-4 w-4 text-[#1B4B73] pointer-events-none" />
                            <Input 
                              value={form.telefono} 
                              onChange={(e) => {
                                const val = e.target.value;
                                if (currentCountry.code === "DO") {
                                  update("telefono", formatPhoneRD(val));
                                } else {
                                  update("telefono", val);
                                }
                              }} 
                              placeholder={currentCountry.phonePlaceholder} 
                              className="h-11 text-xs sm:text-sm pl-10 rounded-xl border-slate-200 bg-white shadow-none" 
                            />
                          </div>
                        </Field>
                        <Field label={`${currentCountry.regionsLabel} / Ubicación *`} error={errors.provincia}>
                          <button 
                            type="button" 
                            onClick={() => setProvOpen(true)} 
                            className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 text-xs sm:text-sm shadow-none hover:bg-slate-50 transition-all"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <MapPin className="h-4 w-4 text-[#1B4B73] shrink-0" />
                              <span className={form.provincia ? "text-foreground font-medium" : "text-muted-foreground"}>
                                {form.provincia || `Selecciona tu ${currentCountry.regionsLabel.toLowerCase().slice(0, -1) || "ubicación"}...`}
                              </span>
                            </div>
                            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          </button>
                        </Field>
                      </div>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <div className="flex items-center gap-3.5 mb-4">
                        <div className="h-11 w-11 rounded-xl bg-[#1B4B73] text-[#F0B900] flex items-center justify-center shrink-0 shadow-xs">
                          <Palette className="h-5.5 w-5.5" />
                        </div>
                        <div>
                          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">Personaliza la sucursal</h1>
                          <p className="text-xs text-muted-foreground mt-0.5">Define la identidad y subdominio de esta sucursal.</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {/* Branding Preview Compacto y Equilibrado */}
                        <div className="rounded-xl border border-border/80 bg-slate-50/70 p-3.5 text-center relative overflow-hidden shadow-inner">
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
                            <div
                              className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-white shadow-sm transition-all duration-300 bg-white"
                              style={{ borderColor: form.color_primario }}
                            >
                              {form.logo_url ? (
                                <img src={form.logo_url} alt="logo" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-slate-50">
                                  <Store className="h-7 w-7 text-slate-300" />
                                </div>
                              )}
                            </div>
                            <div className="text-center sm:text-left min-w-0">
                              <div 
                                className="text-lg font-display font-black tracking-tight truncate max-w-[300px]" 
                                style={{ color: form.color_primario }}
                              >
                                {form.nombre || auth.tenant.nombre || "Tu Lavandería"}
                              </div>

                              <div className="mt-1 flex items-center justify-center sm:justify-start gap-1.5">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60 shadow-2xs">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  {form.nombre_sucursal || "Nueva Sucursal"}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-2">
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
                                    <span>× Quitar</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 pt-1">
                          <Field label="Subdominio web de la sucursal *" error={errors.slug}>
                            <div className="relative flex items-center">
                              <Input 
                                value={form.slug} 
                                onChange={(e) => {
                                  update("slugTouched", true);
                                  update("slug", slugify(e.target.value));
                                }} 
                                placeholder="bellavista" 
                                className="h-11 text-xs sm:text-sm pl-3.5 pr-28 sm:pr-32 rounded-xl border-slate-200 bg-white font-mono shadow-none"
                              />
                              <span className="absolute right-3 text-[11px] font-mono text-muted-foreground pointer-events-none">
                                {currentCountry.code === "DO" ? ".klynn.com.do" : ".klynncloud.com"}
                              </span>
                            </div>
                          </Field>

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
              <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                <Button 
                  variant="outline" 
                  onClick={prev} 
                  disabled={step === 1}
                  className="h-11 px-5 bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 text-sm font-bold rounded-xl shadow-2xs transition-all active:scale-[0.98]"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
                </Button>
                <Button 
                  onClick={next} 
                  className="bg-[#1B4B73] hover:bg-[#153a5b] text-white shadow-sm font-bold h-11 px-6 text-sm rounded-xl transition-all active:scale-[0.98]"
                >
                  {step === 2 ? "Crear sucursal" : "Continuar"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>

      <RegionSelectModal 
        open={provOpen} 
        onClose={() => setProvOpen(false)} 
        value={form.provincia} 
        countryCode={currentCountry.code}
        countryName={currentCountry.name}
        regions={currentCountry.regions}
        label={currentCountry.regionsLabel}
        onSelect={(p) => { update("provincia", p); setProvOpen(false); }} 
      />
    </div>
  );
}

function SuccessCard({ tenant, adminNombre, onEnter }: { tenant: Tenant; adminNombre: string; onEnter: () => void }) {
  const planNombre = PLANS.find((p) => p.id === tenant.plan_id)?.nombre || tenant.plan_id;
  const branchName = tenant.nombre_sucursal || tenant.config?.nombre_sucursal || "Sucursal";
  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="relative mx-auto mb-4 h-24 w-24"
      >
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-100 bg-white shadow-lg shadow-slate-200/50">
          {tenant.logo_url ? (
            <img src={tenant.logo_url} alt="Logo" className="h-full w-full object-cover" />
          ) : (
            <PartyPopper className="h-10 w-10 text-[#1B4B73]" />
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h1 className="mb-1 text-2xl font-bold tracking-tight text-slate-900">¡Sucursal Creada, {adminNombre.split(" ")[0]}!</h1>
        <p className="mb-4 text-xs text-muted-foreground text-balance">
          Tu sucursal <strong className="text-[#1B4B73] font-bold">{branchName}</strong> de <strong className="text-foreground">{tenant.nombre}</strong> ya está lista.
        </p>

        <div className="mx-auto mb-5 max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-[#1B4B73]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Acceso</span>
            </div>
            <div className="font-mono text-xs font-bold text-[#1B4B73]">
              {tenant.slug}.{tenant.pais_codigo === 'DO' || !tenant.pais_codigo ? 'klynn.com.do' : 'klynncloud.com'}
            </div>
          </div>
          
          <div className="grid grid-cols-2 divide-x divide-slate-100">
            <div className="px-4 py-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Plan</div>
              <div className="mt-0.5 font-bold text-sm text-slate-800">{planNombre}</div>
            </div>
            <div className="px-4 py-2.5 bg-slate-50/50">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Estado</div>
              <div className="mt-0.5 font-bold text-sm text-emerald-600">
                {tenant.estado === "TRIAL" ? "Prueba Activa" : "Suscripción Activa"}
              </div>
            </div>
          </div>
        </div>

        <Button size="lg" className="h-11 w-full max-w-xs rounded-xl bg-[#1B4B73] hover:bg-[#153a5b] text-white shadow-md font-bold text-sm transition-all active:scale-95" onClick={onEnter}>
          <Sparkles className="mr-2 h-4 w-4 text-[#F0B900]" /> Entrar a mi sucursal <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </motion.div>
    </div>
  );
}



function Field({ label, error, hint, className = "", children }: { label: React.ReactNode; error?: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between">
        {typeof label === "string" ? (
          <Label className="block text-xs font-semibold text-slate-700">{label}</Label>
        ) : (
          label
        )}
      </div>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted-foreground font-normal">{hint}</p>}
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
      <Label className="mb-2 block text-[11px] font-bold text-slate-500 uppercase tracking-widest">{label}</Label>
      
      <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 bg-slate-50/80 border border-slate-200/50 rounded-full shadow-inner w-full max-w-[340px] mx-auto">
        {presets.map((p) => {
          const isSelected = value.toLowerCase() === p.hex.toLowerCase();
          return (
            <button
              key={p.hex}
              type="button"
              onClick={() => onChange(p.hex)}
              className="relative h-7 w-7 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center shadow-sm"
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

        <div className="relative h-7 w-7 rounded-full border border-slate-250 bg-white hover:bg-slate-100 transition-all flex items-center justify-center shadow-sm cursor-pointer hover:scale-110 group active:scale-95">
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

      <div className="mt-2.5 flex items-center justify-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500">
          CÓDIGO HEX: <span className="uppercase text-slate-700">{value}</span>
        </div>
      </div>
    </div>
  );
}
