import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { compressImage } from "@/lib/compressImage";
import { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Check, Building2, Palette, Package, UserCircle2, PartyPopper,
  AlertCircle, Search, MapPin, Upload, Image as ImageIcon, Receipt, MessageCircle, Sparkles,
  Eye, EyeOff, Cloud, Loader2, Droplet, Landmark, ShieldCheck, Trash2,
  Store, Phone, User, Mail, Lock, ChevronRight,
  Layers, Truck, Wallet, Tags, Users, BarChart3, QrCode, Shirt,
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

const KLYNN_MODULES_LEFT = [
  {
    id: "procesos",
    title: "Control de Procesos",
    subtitle: "Lavado, Secado & Planchado",
    icon: Layers,
    bgClass: "bg-[#1B4B73]/10 text-[#1B4B73]",
    floatY: [-7, 7, -7],
    dur: 5.5,
  },
  {
    id: "fiscal",
    title: "Facturación DGII e-CF",
    subtitle: "Comprobantes B01, B02, B14",
    icon: Landmark,
    bgClass: "bg-blue-600/10 text-blue-700",
    floatY: [7, -7, 7],
    dur: 6.2,
  },
  {
    id: "estanteria",
    title: "Estantería Virtual",
    subtitle: "Ubicación de prendas y racks",
    icon: Package,
    bgClass: "bg-sky-600/10 text-sky-700",
    floatY: [-6, 6, -6],
    dur: 5.8,
  },
];

const KLYNN_MODULES_RIGHT = [
  {
    id: "whatsapp",
    title: "Avisos por WhatsApp",
    subtitle: "Prendas listas y entregas",
    icon: MessageCircle,
    bgClass: "bg-emerald-500/10 text-emerald-600",
    floatY: [7, -7, 7],
    dur: 5.2,
  },
  {
    id: "delivery",
    title: "Logística & Delivery",
    subtitle: "Rutas y choferes a domicilio",
    icon: Truck,
    bgClass: "bg-sky-500/10 text-sky-600",
    floatY: [-7, 7, -7],
    dur: 6.5,
  },
  {
    id: "caja",
    title: "Cuadre de Cajas & Pagos",
    subtitle: "Turnos, efectivo y tarjetas",
    icon: Wallet,
    bgClass: "bg-amber-500/10 text-amber-600",
    floatY: [6, -6, 6],
    dur: 5.9,
  },
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
      nombre_sucursal: "Sucursal principal",
    };
    const cleanRnc = form.rnc.replace(/\D/g, "");
    const tenant: Tenant = {
      id: uid("ten"),
      nombre: form.nombre,
      nombre_sucursal: "Sucursal principal",
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
        const rawRnc = form.rnc.trim();
        const initialECFConfig: ECFConfig = {
          id: crypto.randomUUID(),
          tenant_id: tenant.id,
          rnc_emisor: cleanRnc || rawRnc || "",
          razon_social: form.razon_social || form.nombre,
          nombre_comercial: form.nombre,
          ambiente: "pruebas",
          usar_credenciales_propias: false,
          is_active: !!cleanRnc || !!rawRnc,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await saveECFConfig(initialECFConfig);

        // Si el usuario ingresó un RNC o Cédula, auto-registrar la empresa asociada en Pronesoft de fondo
        if (cleanRnc || rawRnc) {
          try {
            await registerTenantInPronesoft(tenant.id, initialECFConfig);
            console.log(`[Registro] ✅ Empresa asociada registrada en Pronesoft para: ${tenant.nombre}`);
          } catch (proneErr: any) {
            console.warn("[Registro] Aviso en auto-registro de Pronesoft:", proneErr?.message || proneErr);
          }
        }
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
    <div className="min-h-screen relative overflow-x-hidden bg-gradient-to-b from-[#B8E2FD] via-[#CEEBFE] to-[#A8DAFC] font-sans selection:bg-primary/20 pb-12">
      <SeedBootstrap />

      {/* 1. Atmósfera Acuática Sólida en Tonos de Azul Vibrante (#1B4B73, #0284C7, #38BDF8) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Esferas de Luz Azul Sólidas y Vivas */}
        <div className="absolute -top-32 left-1/4 w-[700px] h-[550px] rounded-full bg-[#38BDF8]/45 blur-[90px]" />
        <div className="absolute top-1/3 -left-28 w-[550px] h-[550px] rounded-full bg-[#1B4B73]/30 blur-[100px]" />
        <div className="absolute -bottom-36 right-8 w-[650px] h-[600px] rounded-full bg-[#0284C7]/35 blur-[100px]" />
        <div className="absolute top-1/4 -right-16 w-[450px] h-[450px] rounded-full bg-[#60A5FA]/40 blur-[90px]" />

        {/* Ondas de Agua Sólidas SVG en el Fondo */}
        <div className="absolute bottom-0 inset-x-0 h-96 opacity-60 overflow-hidden pointer-events-none">
          <motion.svg
            animate={{ x: [-35, 0, -35] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            viewBox="0 0 1440 320"
            className="absolute bottom-0 w-[125%] h-full text-[#7DD3FC] fill-current"
            preserveAspectRatio="none"
          >
            <path d="M0,192L48,197.3C96,203,192,213,288,197.3C384,181,480,139,576,138.7C672,139,768,181,864,186.7C960,192,1056,160,1152,144C1248,128,1344,128,1392,128L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
          </motion.svg>
          <motion.svg
            animate={{ x: [0, -45, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
            viewBox="0 0 1440 320"
            className="absolute bottom-0 w-[125%] h-full text-[#60A5FA]/60 fill-current"
            preserveAspectRatio="none"
          >
            <path d="M0,96L48,112C96,128,192,160,288,181.3C384,203,480,213,576,192C672,171,768,117,864,112C960,107,1056,149,1152,165.3C1248,181,1344,171,1392,165.3L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
          </motion.svg>
        </div>

        {/* 2. Conjunto Rico de 32 Burbujas de Jabón y Agua con Movimiento Natural de Lavandería */}
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

      {/* 3. Tarjetas de Módulos Flotantes de Klynn con Iconos SVG (visibles en pantallas grandes) */}
      <div className="fixed inset-0 z-0 pointer-events-none hidden xl:block max-w-7xl mx-auto">
        {/* Columna Izquierda: 3 Módulos Oficiales */}
        <div className="absolute left-4 top-28 bottom-20 flex flex-col justify-between w-64 pointer-events-none">
          {KLYNN_MODULES_LEFT.map((m) => {
            const ModIcon = m.icon;
            return (
              <motion.div
                key={m.id}
                animate={{ y: m.floatY }}
                transition={{ duration: m.dur, repeat: Infinity, ease: "easeInOut" }}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-white/90 border border-white/90 shadow-[0_10px_30px_rgba(27,75,115,0.12)] backdrop-blur-md pointer-events-auto hover:scale-105 transition-transform"
              >
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${m.bgClass}`}>
                  <ModIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-slate-800 tracking-tight truncate">{m.title}</p>
                  <p className="text-[10px] font-medium text-slate-500 truncate">{m.subtitle}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Columna Derecha: 3 Módulos Oficiales */}
        <div className="absolute right-4 top-28 bottom-20 flex flex-col justify-between w-64 pointer-events-none">
          {KLYNN_MODULES_RIGHT.map((m) => {
            const ModIcon = m.icon;
            return (
              <motion.div
                key={m.id}
                animate={{ y: m.floatY }}
                transition={{ duration: m.dur, repeat: Infinity, ease: "easeInOut" }}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-white/90 border border-white/90 shadow-[0_10px_30px_rgba(27,75,115,0.12)] backdrop-blur-md pointer-events-auto hover:scale-105 transition-transform"
              >
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${m.bgClass}`}>
                  <ModIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-slate-800 tracking-tight truncate">{m.title}</p>
                  <p className="text-[10px] font-medium text-slate-500 truncate">{m.subtitle}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="relative z-10">
        <header className="flex flex-col items-center justify-center pt-5 pb-1 px-6 relative">
          <div className="flex flex-col items-center">
            <Logo size="lg" />
            <span className="-mt-2 text-[13px] font-semibold tracking-tight text-slate-500/80">
              Tu lavandería, simplificada.
            </span>
          </div>
          <div className="absolute right-6 top-4 hidden md:flex items-center gap-3 px-4 py-2 rounded-full bg-[#1B4B73] text-white shadow-lg shadow-[#1B4B73]/25 border border-white/20 transition-all hover:scale-105">
            <span className="text-xs sm:text-sm font-medium text-white/90">¿Ya tienes cuenta?</span>
            <Link 
              to="/login" 
              className="inline-flex items-center gap-1.5 font-bold text-xs sm:text-sm text-[#1B4B73] bg-[#F0B900] hover:bg-[#F0B900]/90 px-3.5 py-1 rounded-full shadow-xs transition-colors"
            >
              Inicia sesión
              <ArrowRight className="h-3.5 w-3.5 text-[#1B4B73]" />
            </Link>
          </div>
        </header>

        <main className="container mx-auto pb-6 pt-2">
          {/* Wizard Stepper Compacto & Horizontal de Baja Altura */}
          <div className="mx-auto mb-4 max-w-2xl px-2">
            <div className="flex items-center justify-between gap-1 sm:gap-2 rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-xl p-1.5 sm:p-2 shadow-md shadow-slate-200/40">
              {filteredSteps.map((s, index) => {
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

                    {index < filteredSteps.length - 1 && (
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
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="h-11 w-11 rounded-xl bg-[#1B4B73] text-[#F0B900] flex items-center justify-center shrink-0 shadow-xs">
                      <Building2 className="h-5.5 w-5.5" />
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">Cuéntanos de tu lavandería</h1>
                      <p className="text-xs text-muted-foreground mt-0.5">Solo lo esencial. El resto lo configuras después.</p>
                    </div>
                  </div>

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

                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Field label="Nombre comercial de tu lavandería *" error={errors.nombre}>
                        <div className="relative flex items-center">
                          <Store className="absolute left-3.5 h-4 w-4 text-[#1B4B73] pointer-events-none" />
                          <Input 
                            value={form.nombre} 
                            onChange={(e) => {
                              update("nombre", e.target.value);
                              if (!form.slugTouched) update("slug", slugify(e.target.value));
                            }} 
                            placeholder="Ej. Lavandería La Burbuja o Dinnca Comercial" 
                            className="h-10 text-xs sm:text-sm pl-10 rounded-xl border-slate-200"
                          />
                        </div>
                      </Field>
                    </div>
                    <Field label="Teléfono / WhatsApp *" error={errors.telefono}>
                      <div className="relative flex items-center">
                        <Phone className="absolute left-3.5 h-4 w-4 text-[#1B4B73] pointer-events-none" />
                        <Input 
                          value={form.telefono} 
                          onChange={(e) => update("telefono", formatPhoneRD(e.target.value))} 
                          placeholder="809-555-0142" 
                          className="h-10 text-xs sm:text-sm pl-10 rounded-xl border-slate-200" 
                        />
                      </div>
                    </Field>
                    <Field label="Provincia *" error={errors.provincia}>
                      <button 
                        type="button" 
                        onClick={() => setProvOpen(true)} 
                        className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-background px-3 text-xs sm:text-sm shadow-xs hover:bg-accent/30 transition-all"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <MapPin className="h-4 w-4 text-[#1B4B73] shrink-0" />
                          <span className={form.provincia ? "text-foreground font-medium" : "text-muted-foreground"}>
                            {form.provincia || "Selecciona tu provincia..."}
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
                      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">Personaliza tu marca</h1>
                      <p className="text-xs text-muted-foreground mt-0.5">Define la identidad visual de tu lavandería.</p>
                    </div>
                  </div>
                  
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
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="h-11 w-11 rounded-xl bg-[#1B4B73] text-[#F0B900] flex items-center justify-center shrink-0 shadow-xs">
                      <Package className="h-5.5 w-5.5" />
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">Elige tu plan</h1>
                      <p className="text-xs text-muted-foreground mt-0.5">{globalConfig.trialDays} días gratis. Sin tarjeta de crédito.</p>
                    </div>
                  </div>
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
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="h-11 w-11 rounded-xl bg-[#1B4B73] text-[#F0B900] flex items-center justify-center shrink-0 shadow-xs">
                      <UserCircle2 className="h-5.5 w-5.5" />
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">Crea tu usuario administrador</h1>
                      <p className="text-xs text-muted-foreground mt-0.5">Tendrás acceso total al panel de tu lavandería.</p>
                    </div>
                  </div>
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <Field label="Nombre completo *" error={errors.admin_nombre} className="sm:col-span-2">
                      <div className="relative flex items-center">
                        <User className="absolute left-3.5 h-4 w-4 text-[#1B4B73] pointer-events-none" />
                        <Input 
                          value={form.admin_nombre} 
                          onChange={(e) => update("admin_nombre", e.target.value)} 
                          placeholder="María González" 
                          className="h-10 text-xs sm:text-sm pl-10 rounded-xl border-slate-200" 
                        />
                      </div>
                    </Field>
                    <Field label="Email *" error={errors.admin_email} className="sm:col-span-2">
                      <div className="relative flex items-center">
                        <Mail className="absolute left-3.5 h-4 w-4 text-[#1B4B73] pointer-events-none" />
                        <Input 
                          type="email" 
                          value={form.admin_email} 
                          onChange={(e) => update("admin_email", e.target.value)} 
                          placeholder="admin@tulavanderia.do" 
                          className="h-10 text-xs sm:text-sm pl-10 rounded-xl border-slate-200" 
                        />
                      </div>
                    </Field>
                    <Field label="Contraseña *" error={errors.admin_password}>
                      <div className="relative flex items-center">
                        <Lock className="absolute left-3.5 h-4 w-4 text-[#1B4B73] pointer-events-none" />
                        <Input 
                          type={showPass ? "text" : "password"} 
                          value={form.admin_password} 
                          onChange={(e) => update("admin_password", e.target.value)} 
                          placeholder="••••••••" 
                          className="h-10 pl-10 pr-9 text-xs sm:text-sm rounded-xl border-slate-200" 
                        />
                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5">
                          {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      <PasswordStrengthIndicator password={form.admin_password} />
                    </Field>
                    <Field label="Confirmar *" error={errors.admin_password_confirm}>
                      <div className="relative flex items-center">
                        <Lock className="absolute left-3.5 h-4 w-4 text-[#1B4B73] pointer-events-none" />
                        <Input 
                          type={showConfirm ? "text" : "password"} 
                          value={form.admin_password_confirm} 
                          onChange={(e) => update("admin_password_confirm", e.target.value)} 
                          placeholder="••••••••" 
                          className="h-10 pl-10 pr-9 text-xs sm:text-sm rounded-xl border-slate-200" 
                        />
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
      </div>

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
      <Label className="mb-1.5 block text-xs font-semibold text-slate-700">{label}</Label>
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
