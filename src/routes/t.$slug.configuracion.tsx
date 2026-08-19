import { createFileRoute, Link } from "@tanstack/react-router";
import { compressImage } from "@/lib/compressImage";
import { useState, useEffect, useRef } from "react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import {
  saveTenant, DEFAULT_CONFIG, formatPhoneRD, formatCedulaRD, PROVINCIAS_RD, NCF_TIPOS,
  formatAmountInput, parseAmount, getPlans, updateTenantPlan, getGlobalConfig, formatRD,
  getTenantPlan, getECFConfig, saveECFConfig, getECFSequences, saveECFSequence, nextECFNumero, deleteECFSequence,
  isModuleEnabled,
  type Tenant, type TenantConfig, type WhatsAppConfig, type PlanId, type Plan, type Gasto,
  type GlobalConfig, type BankDetails, type ECFConfig, type ECFSequence
} from "@/lib/storage";
import { getProneSoftClient, registerTenantInPronesoft, uploadCertificateToPronesoft, importSequencesToPronesoft, anularSecuenciasPronesoft, createSequencePronesoft, listSequencesPronesoft, isECFReady, consultarRNC } from "@/lib/fiscal";
import { notificarWhatsApp } from "@/lib/whatsapp";
import { useECFConfig, usePlans, useGlobalConfig, useECFSequences } from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { Ticket } from "@/components/klynn/Ticket";
import { 
  Building2, Shield, TrendingUp, Users, Trash2, ExternalLink, Plus, Pencil, 
  RefreshCw, Package, LogOut, MoreHorizontal, Key, Droplets as DropletsIcon,
  CreditCard, MessageCircle, Send, Loader2, Save, Image as ImageIcon, Upload, Calendar, Clock,
  User, Palette, FileText, Receipt, Banknote, Star, Sparkles, ArrowRight, ArrowLeft, Copy, Smartphone, CheckCircle2, ShieldCheck, PlusCircle, Bell, BellOff, Check, X, Zap, Laptop, Wrench,
  FlaskConical, Globe, Printer, Bluetooth, Cpu, Usb, AlertTriangle, Wifi, Cable, Monitor, Plug, Ban, Search, ClipboardList,
  Store, Mail, Phone, MapPin, Navigation, Layers, MessageSquare, FileEdit,
  Percent, Scale, Wallet, Shirt, Maximize2, Server
} from "lucide-react";
import {
  connectBluetoothDevice,
  connectSerialPort,
  encodeEscPos,
  simulateEscPosDump,
  printDirectRaw,
  isBluetoothSupported,
  isSerialSupported
} from "@/lib/impresora";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/t/$slug/configuracion")({ component: ConfigPage });

const FIELD = "h-11 rounded-lg border-input bg-background text-base focus-visible:ring-1 focus-visible:ring-ring transition-all px-4";
const LABEL = "text-sm font-medium text-foreground";
const CARD = "border shadow-sm p-6 rounded-lg";

// Mapa de nombres completos para tipos de comprobantes fiscales
const NCF_NOMBRES: Record<string, string> = {
  B01: "CRÉDITO FISCAL", B02: "CONSUMIDOR FINAL", B03: "NOTA DE DÉBITO", B04: "NOTA DE CRÉDITO",
  B14: "RÉGIMEN ESPECIAL", B15: "GUBERNAMENTAL", B16: "EXPORTACIONES",
  E31: "CRÉDITO FISCAL", E32: "CONSUMIDOR FINAL", E33: "NOTA DE DÉBITO", E34: "NOTA DE CRÉDITO",
  E41: "COMPRAS", E43: "GASTOS MENORES", E44: "REGÍMENES ESPECIALES", E45: "GUBERNAMENTAL", E46: "EXPORTACIONES", E47: "PAGOS AL EXTERIOR",
};

function Field({ label, children, hint, span, icon: Icon, alignTop }: { label: string; children: React.ReactNode; hint?: string; span?: boolean; icon?: any; alignTop?: boolean }) {
  return (
    <div className={`flex flex-col gap-1.5 ${span ? "md:col-span-2" : ""}`}>
      <Label className={`${LABEL} font-bold text-xs text-slate-700 dark:text-slate-200`}>
        {label}
      </Label>
      <div className={`relative flex ${alignTop ? "items-start" : "items-center"} w-full`}>
        {Icon && (
          <div className={`absolute left-3.5 ${alignTop ? "top-3" : ""} flex items-center pointer-events-none text-[#1B4B73] dark:text-[#38bdf8] z-10`}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        )}
        {children}
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SubtleExpandingTextarea({ value, onChange, placeholder, className = "", ...props }: any) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <Textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      className={`rounded-xl border-slate-200 dark:border-slate-800 bg-background pl-10.5 py-2.5 pr-3 text-xs md:text-sm leading-relaxed transition-all duration-300 shadow-2xs resize-none focus-visible:ring-2 focus-visible:ring-[#1B4B73] focus:border-[#1B4B73] ${
        isFocused ? "h-[88px]" : "h-[42px] overflow-hidden"
      } ${className}`}
      {...props}
    />
  );
}

function ConfigPage() {
  const auth = useRequireAuth();
  const queryClient = useQueryClient();
  const tenantId = auth?.tenant?.id ?? "";

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [activeTab, setActiveTab] = useState("perfil");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  
  const { data: plans = [] } = usePlans();
  const { data: globalConfigData } = useGlobalConfig();
  const { data: ecfConfig, isLoading: loadingECF } = useECFConfig(tenantId);
  const { data: ecfSequences = [] } = useECFSequences(tenantId);

  const globalConfig = globalConfigData || null;

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Estados para configuración de impresora física
  const [showPhysicalPrinterConfig, setShowPhysicalPrinterConfig] = useState(false);
  const [bluetoothDeviceName, setBluetoothDeviceName] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("No conectada");
  const [loadingHardware, setLoadingHardware] = useState(false);
  const [showKioskHelpModal, setShowKioskHelpModal] = useState(false);
  const [printingFakeTicket, setPrintingFakeTicket] = useState<{ orden: any; cliente: any; empleado: any; isEscPos: boolean } | null>(null);

  function getFriendlyErrorMessage(err: any): string {
    const msg = err?.message || "";
    if (msg.includes("No port selected") || msg.includes("requestPort") || msg.includes("cancelled")) {
      return "Selección de puerto cancelada o sin seleccionar.";
    }
    if (msg.includes("requestDevice") || msg.includes("no device selected") || msg.includes("chooser")) {
      return "Búsqueda de dispositivo cancelada o sin seleccionar.";
    }
    if (msg.includes("Bluetooth is not supported") || msg.includes("bluetooth is disabled")) {
      return "Tu navegador no soporta Bluetooth Web o el Bluetooth está desactivado. Te sugerimos usar Google Chrome.";
    }
    if (msg.includes("Serial is not supported") || msg.includes("serial is disabled")) {
      return "Tu navegador no soporta Puerto Serie Web o está desactivado. Te sugerimos usar Google Chrome.";
    }
    if (msg.includes("Failed to open the serial port") || msg.includes("port is busy") || msg.includes("locked")) {
      return "No se pudo abrir el puerto. Asegúrate de que no esté ocupado por otro programa.";
    }
    if (msg.includes("NetworkError")) {
      return "Error de red al conectar con el dispositivo.";
    }
    if (msg.includes("GATT")) {
      return "Error de comunicación Bluetooth. Re-conecta la impresora.";
    }
    if (msg.includes("writable") || msg.includes("writableStream")) {
      return "El puerto de escritura no está disponible.";
    }
    return msg;
  }

  async function handleBluetoothConnect() {
    setLoadingHardware(true);
    try {
      const device = await connectBluetoothDevice();
      setBluetoothDeviceName(device.name || "Impresora Bluetooth");
      setConnectionStatus("Conectada");
      toast.success("¡Impresora Bluetooth conectada!");
    } catch (err: any) {
      console.error(err);
      toast.error("Error de Bluetooth: " + getFriendlyErrorMessage(err));
    } finally {
      setLoadingHardware(false);
    }
  }

  async function handleSerialConnect() {
    setLoadingHardware(true);
    try {
      await connectSerialPort(cfg.impresora_serial_baud || 9600);
      setConnectionStatus("Conectada");
      toast.success(`¡Puerto Serie conectado a ${cfg.impresora_serial_baud || 9600} baudios!`);
    } catch (err: any) {
      console.error(err);
      toast.error("Error de Puerto Serie: " + getFriendlyErrorMessage(err));
    } finally {
      setLoadingHardware(false);
    }
  }

  const handleDownloadDiagnostic = () => {
    const now = new Date();
    const ua = navigator.userAgent;
    
    // 1. Detectar navegador
    let browserName = "Desconocido";
    if (ua.includes("Firefox")) {
      const match = ua.match(/Firefox\/(\d+)/);
      browserName = `Firefox ${match ? match[1] : ""}`;
    } else if (ua.includes("Chrome") && !ua.includes("Edg")) {
      const match = ua.match(/Chrome\/(\d+)/);
      browserName = `Chrome ${match ? match[1] : ""}`;
    } else if (ua.includes("Edg")) {
      const match = ua.match(/Edg\/(\d+)/);
      browserName = `Edge ${match ? match[1] : ""}`;
    } else if (ua.includes("Safari") && !ua.includes("Chrome")) {
      const match = ua.match(/Version\/(\d+)/);
      browserName = `Safari ${match ? match[1] : ""}`;
    }
    
    // 2. Detectar sistema operativo
    let osName = "Desconocido";
    if (ua.includes("Windows NT")) {
      const match = ua.match(/Windows NT ([\d.]+)/);
      osName = `Windows NT ${match ? match[1] : ""}`;
    } else if (ua.includes("Macintosh")) {
      osName = "macOS";
    } else if (ua.includes("iPhone") || ua.includes("iPad")) {
      osName = "iOS";
    } else if (ua.includes("Android")) {
      osName = "Android";
    } else if (ua.includes("Linux")) {
      osName = "Linux";
    }

    // 3. Soporte de APIs de hardware
    const webSerialAvailable = typeof navigator !== "undefined" && "serial" in navigator ? "SI" : "NO";
    const webUsbAvailable = typeof navigator !== "undefined" && "usb" in navigator ? "SI" : "NO";
    const webBluetoothAvailable = typeof navigator !== "undefined" && "bluetooth" in navigator ? "SI" : "NO";

    // 4. Nombre de impresora guardada
    const savedPrinter = cfg.impresora_nombre || bluetoothDeviceName || "Sin impresora guardada";

    // 5. Compilar reporte en base a la plantilla
    const report = `=== DIAGNÓSTICO IMPRESORA — ${tenant?.nombre?.toUpperCase() || "LAVA Y YA"} ===
Generado: ${now.toISOString()}

--- ENTORNO ---
Navegador:  ${browserName}
Sistema:    ${osName}
User-Agent: ${ua}
Pantalla:   ${window.screen.width}×${window.screen.height} (devicePixelRatio ${window.devicePixelRatio})

--- CONTEXTO / SEGURIDAD ---
URL:             ${window.location.href}
Contexto seguro (HTTPS): ${window.isSecureContext ? "SI" : "NO"}
Nivel superior:  ${window.self === window.top ? "SI" : "NO"}
Navegador integrado (WebView/in-app): ${/wv|Instagram|FBAN|FBAV/.test(ua) ? "SI" : "NO"}

--- CONFIGURACIÓN ACTUAL ---
Pestaña activa:  ${cfg.impresora_tipo || "ninguna"}
Perfil impresión: ${cfg.impresora_perfil || "basica"}
Impresora:       ${savedPrinter}

--- APIs DISPONIBLES ---
Web Serial:    ${webSerialAvailable}
Web USB:       ${webUsbAvailable}
Web Bluetooth: ${webBluetoothAvailable}
Bluetooth encendido/disponible: ${webBluetoothAvailable === "SI" ? "SI (o listo para emparejar)" : "NO (apagado o sin adaptador)"}

--- DISPOSITIVOS EMPAREJADOS (permiso guardado) ---
  (no consultable en este navegador)

--- HISTORIAL DE EMPAREJAMIENTO (ticket 123) ---
Olvidó y re-emparejó:    — nunca
Última conexión OK:      — nunca
Servicios del grant:     (ninguno — grant vacío / aún sin conexión exitosa)
Característica escritura: —
Última impresión OK:     — nunca

--- REGISTRO DE ERRORES (sesión) ---
  (sin errores en esta sesión)

--- EVENTOS DE IMPRESIÓN (sesión) ---
  (ningún evento de impresión registrado)

--- FIN DEL DIAGNÓSTICO ---`;

    // Descargar como archivo .txt
    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diagnostico-impresora-${tenant?.slug || "klynn"}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Diagnóstico descargado con éxito 📄");
  };

  async function handleTestPrint(isEscPos: boolean) {
    const fakeOrden = {
      id: "demo-test",
      tenant_id: tenant?.id || "",
      numero: "KL-TEST-0001",
      cliente_id: "demo-cli",
      empleado_id: "demo-emp",
      servicios: ["Lavado y secado"],
      items: [
        { descripcion: "Prenda de prueba A", cantidad: 2, precio_unitario: 120 },
        { descripcion: "Prenda de prueba B", cantidad: 1, precio_unitario: 250 }
      ],
      subtotal: 490,
      itbis: 88.2,
      descuento: 0,
      total: 578.2,
      pagado: 578.2,
      saldo: 0,
      metodo_pago: "EFECTIVO" as any,
      estado: "RECIBIDA" as any,
      fecha_entrega: new Date(Date.now() + 86400000).toLocaleDateString("es-DO"),
      es_urgente: false,
      creado_en: new Date().toISOString()
    } as any;

    const fakeCliente = {
      nombre: "Cliente",
      apellido: "de Prueba",
      telefono: "809-555-0199",
      cedula: "223-0101010-1"
    } as any;

    const fakeEmpleado = {
      nombre: auth?.user?.user_metadata?.nombre || "Cajero de Prueba"
    } as any;

    const fakeServiciosList = [
      { nombre: "Lavado y secado", precio: 150 }
    ];

    try {
      if (!tenant) return;
      const configWithMock = { ...cfg };
      if (!isEscPos) {
        configWithMock.impresora_perfil = "basica";
      }

      const bytes = encodeEscPos(
        fakeOrden,
        { ...tenant, config: configWithMock },
        fakeCliente,
        fakeEmpleado,
        fakeServiciosList
      );

      // Simular ticket en consola del desarrollador
      const textDump = simulateEscPosDump(bytes);
      console.log(textDump);

      if (cfg.impresora_tipo === "usb") {
        setPrintingFakeTicket({
          orden: fakeOrden,
          cliente: fakeCliente,
          empleado: fakeEmpleado,
          isEscPos
        });
        return;
      }

      setConnectionStatus("Imprimiendo...");
      const success = await printDirectRaw(bytes, cfg);
      if (success) {
        setConnectionStatus("Conectada");
        toast.success("¡Ticket de prueba enviado!");
      } else {
        setConnectionStatus("Error al imprimir");
        toast.error("No se pudo imprimir. Revisa la conexión de la impresora.");
      }
    } catch (err: any) {
      console.error(err);
      const friendly = getFriendlyErrorMessage(err);
      setConnectionStatus("Error: " + friendly);
      toast.error("Error al imprimir prueba: " + friendly);
    }
  }

  useEffect(() => {
    if (tenant) {
      const root = document.documentElement;
      root.style.setProperty("--brand-primary", tenant.color_primario);
      root.style.setProperty("--primary", tenant.color_primario);
      root.style.setProperty("--ring", tenant.color_primario);
    }
  }, [tenant?.color_primario]);

  useEffect(() => {
    if (auth?.tenant && auth.tenant.id !== '__loading__' && !tenant) {
      setTenant(auth.tenant);
    }
  }, [auth, tenant]);

  useEffect(() => {
    if (printingFakeTicket) {
      const timer = setTimeout(() => {
        window.print();
        setPrintingFakeTicket(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [printingFakeTicket]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('polar_success') === 'true') {
      setShowSuccess(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
    const t = params.get('tab');
    if (t && ['perfil', 'apariencia', 'factura', 'caja', 'fiscal', 'whatsapp', 'plan'].includes(t)) {
      setActiveTab(t);
    }
  }, []);

  if (!auth || auth.tenant.id === '__loading__' || !tenant) {
    return <GlobalPageLoader text="Cargando configuración..." />;
  }

  const cfg: TenantConfig = tenant.config || DEFAULT_CONFIG;
  const plan = plans.find(p => p.id === tenant.plan_id);
  const hasFiscal = isModuleEnabled(tenant, 'facturacion_fiscal', plan);
  const hasWA = isModuleEnabled(tenant, 'whatsapp', plan);
  const wa: WhatsAppConfig = cfg.whatsapp || DEFAULT_CONFIG.whatsapp!;
  const isPrinterConnected = cfg.impresora_tipo === "usb" || connectionStatus === "Conectada" || connectionStatus === "Imprimiendo...";

  async function save(updates: Partial<Tenant>) {
    try {
      const next: Tenant = { ...tenant!, ...updates } as Tenant;
      await saveTenant(next);
      setTenant(next);
      toast.success("Guardado");
      setTimeout(() => window.location.reload(), 400);
    } catch (err: any) {
      console.error("Error saving tenant:", err);
      toast.error("Error al guardar: " + (err.message || "desconocido"));
    }
  }
  async function saveCfg(c: Partial<TenantConfig>) {
    try {
      const next: Tenant = { ...tenant!, config: { ...cfg, ...c } } as Tenant;
      await saveTenant(next);
      setTenant(next);
      toast.success("Guardado");
    } catch (err: any) {
      console.error("Error saving config:", err);
      toast.error("Error al guardar configuración: " + (err.message || "desconocido"));
    }
  }
  function updateCfg(c: Partial<TenantConfig>) {
    setTenant(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        config: {
          ...(prev.config || DEFAULT_CONFIG),
          ...c
        }
      };
    });
  }
  async function saveWA(w: Partial<WhatsAppConfig>) {
    await saveCfg({ whatsapp: { ...wa, ...w } });
  }

  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const isForcedExpired = params.get('expired') === 'true';
  const isTrialExpired = isForcedExpired || (tenant?.estado === "TRIAL" && new Date(tenant.trial_hasta).getTime() < Date.now());

  return (
    <div>
      <PageHeader title="Configuración" description="Personaliza tu lavandería." />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Navigation Tabs Bar — Modern Clean Underline Style Centered & Prominent */}
        <div className="border-b border-slate-200/90 dark:border-slate-800 -mx-1 px-1 overflow-x-auto no-scrollbar flex justify-center">
          <TabsList className="flex items-center justify-center gap-2 sm:gap-5 md:gap-8 bg-transparent p-0 h-auto w-max border-none rounded-none mx-auto">
            {[
              { id: 'perfil', label: 'Perfil', icon: User },
              { id: 'apariencia', label: 'Apariencia', icon: Palette },
              { id: 'factura', label: 'Ticket', icon: FileText },
              { id: 'caja', label: 'Caja', icon: Banknote },
              { id: 'fiscal', label: 'Fiscal', icon: ShieldCheck, module: 'facturacion_fiscal' },
              { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
              { id: 'plan', label: 'Plan', icon: CreditCard },
            ]
            .filter(t => !t.module || isModuleEnabled(tenant, t.module, plans.find(p => p.id === tenant?.plan_id)))
            .map(t => {
              const isActive = activeTab === t.id;
              const Icon = t.icon;
              return (
                <TabsTrigger 
                  key={t.id}
                  value={t.id}
                  disabled={isTrialExpired && t.id !== 'plan'}
                  className={`group relative flex items-center gap-2.5 px-3 sm:px-4 py-3.5 text-sm sm:text-[15px] font-semibold transition-all duration-200 border-none rounded-none shadow-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                    isActive 
                      ? "text-[#1B4B73] dark:text-sky-400 font-bold" 
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900/40 rounded-t-xl"
                  }`}
                >
                  <Icon className={`h-5 w-5 transition-colors ${
                    isActive 
                      ? "text-[#1B4B73] dark:text-sky-400" 
                      : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300"
                  }`} />
                  <span className="tracking-tight">{t.label}</span>
                  {isActive && (
                    <span 
                      className="absolute -bottom-px left-0 right-0 h-[3px] bg-[#1B4B73] dark:bg-sky-400 rounded-full"
                    />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="perfil" className="space-y-6 animate-in fade-in duration-300">
          <Card className={`${CARD} rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-card p-6 md:p-8 space-y-6`}>
            {/* Header del Perfil */}
            <div className="flex items-center gap-3.5 pb-5 border-b border-border/70">
              <div className="h-11 w-11 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Store className="h-5.5 w-5.5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-foreground leading-tight">
                  Información del Negocio
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Datos comerciales, vías de contacto y ubicación de tu lavandería.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Sección 1: Datos de Contacto y Nombre */}
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                <Field label="Nombre comercial de la empresa" icon={Building2}>
                  <Input 
                    className={`${FIELD} pl-10.5 rounded-xl border-slate-200 dark:border-slate-800 font-medium`} 
                    placeholder="Ej: Lavandería Klynn" 
                    value={tenant.nombre} 
                    onChange={(e) => setTenant({ ...tenant, nombre: e.target.value })} 
                  />
                </Field>
                <Field label="Nombre de la sucursal" icon={Store}>
                  <Input 
                    className={`${FIELD} pl-10.5 rounded-xl border-slate-200 dark:border-slate-800 font-medium`} 
                    placeholder="Ej: Sucursal principal, Bella Vista..." 
                    value={tenant.nombre_sucursal || tenant.config?.nombre_sucursal || ""} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setTenant({ 
                        ...tenant, 
                        nombre_sucursal: val,
                        config: { ...(tenant.config || DEFAULT_CONFIG), nombre_sucursal: val }
                      });
                    }} 
                  />
                </Field>
                <Field label="Teléfono de contacto" icon={Phone}>
                  <Input 
                    className={`${FIELD} pl-10.5 rounded-xl border-slate-200 dark:border-slate-800`} 
                    placeholder="Ej: 809-000-0000" 
                    value={tenant.telefono} 
                    onChange={(e) => setTenant({ ...tenant, telefono: formatPhoneRD(e.target.value) })} 
                  />
                </Field>
                <Field label="Correo electrónico" icon={Mail}>
                  <Input 
                    className={`${FIELD} pl-10.5 rounded-xl border-slate-200 dark:border-slate-800`} 
                    type="email"
                    placeholder="Ej: admin@lavanderia.com" 
                    value={tenant.email} 
                    onChange={(e) => setTenant({ ...tenant, email: e.target.value })} 
                  />
                </Field>
              </div>

              {/* Sección 2: Ubicación */}
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Provincia" icon={MapPin}>
                  <Select value={tenant.provincia || ""} onValueChange={(v) => setTenant({ ...tenant, provincia: v })}>
                    <SelectTrigger className={`${FIELD} pl-10.5 rounded-xl border-slate-200 dark:border-slate-800`}>
                      <SelectValue placeholder="Selecciona la provincia..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVINCIAS_RD.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Dirección física" icon={Navigation}>
                  <Input 
                    className={`${FIELD} pl-10.5 rounded-xl border-slate-200 dark:border-slate-800`} 
                    placeholder="Calle Principal #123, Edificio Los Laureles" 
                    value={tenant.direccion} 
                    onChange={(e) => setTenant({ ...tenant, direccion: e.target.value })} 
                  />
                </Field>
              </div>

              {/* Sección 3: Parámetros de prendas no retiradas */}
              <div className="pt-5 border-t border-border/70">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700">
                  <div className="flex items-center gap-3.5">
                    <div className="h-11 w-11 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Clock className="h-5.5 w-5.5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground">
                        Alerta de prendas sin retirar
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Días en estado LISTA antes de marcar como rezagada en inventario.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-start lg:self-auto shrink-0 bg-white dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
                    {[3, 5, 7, 14].map((d) => {
                      const currentVal = tenant.config?.dias_almacenamiento_sin_retirar || tenant.config?.whatsapp?.dias_recordatorio_sin_retirar || 5;
                      const isSelected = currentVal === d;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => updateCfg({ dias_almacenamiento_sin_retirar: d })}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#1B4B73] text-white shadow-xs"
                              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                          }`}
                        >
                          {d}d
                        </button>
                      );
                    })}

                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 focus-within:border-[#1B4B73] focus-within:ring-2 focus-within:ring-[#1B4B73]/15 transition-all">
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={tenant.config?.dias_almacenamiento_sin_retirar || tenant.config?.whatsapp?.dias_recordatorio_sin_retirar || 5}
                        onChange={(e) => updateCfg({ dias_almacenamiento_sin_retirar: Math.max(1, Number(e.target.value)) })}
                        className="w-7 text-center text-xs font-black bg-transparent border-none outline-none text-foreground p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider select-none">DÍAS</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer de Guardar */}
            <div className="pt-6 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground text-center sm:text-left">
                Los cambios se aplican de inmediato en tus recibos y plataformas.
              </span>
              <Button 
                onClick={() => save(tenant)}
                className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-white font-bold h-10 px-5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer gap-2"
              >
                <Save className="h-4 w-4" />
                <span>Guardar cambios</span>
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="apariencia" className="space-y-6 animate-in fade-in duration-300">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Tarjeta 1: Logotipo */}
            <Card className={`${CARD} rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-card p-6 md:p-8 flex flex-col justify-between`}>
              <div>
                {/* Header de la tarjeta */}
                <div className="flex items-center gap-3.5 pb-5 border-b border-border/70">
                  <div className="h-11 w-11 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ImageIcon className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base text-foreground leading-tight">
                      Logotipo del Negocio
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Aparecerá en los tickets térmicos y encabezados.
                    </p>
                  </div>
                </div>

                {/* Contenido central */}
                <div className="flex flex-col items-center justify-center py-6">
                  {tenant.logo_url ? (
                    <div className="relative group p-2 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-inner">
                      <div className="h-32 w-32 rounded-full overflow-hidden bg-white p-3.5 flex items-center justify-center shadow-xs border border-slate-100 dark:border-slate-800">
                        <img src={tenant.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
                      </div>
                      <button 
                        type="button"
                        onClick={() => setTenant({ ...tenant, logo_url: undefined })} 
                        className="absolute right-0 top-0 rounded-full bg-destructive p-2 text-white opacity-90 transition hover:opacity-100 hover:scale-110 shadow-md cursor-pointer"
                        title="Eliminar logotipo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-32 w-32 rounded-full bg-accent/40 text-muted-foreground border-2 border-dashed border-border/80 p-4 text-center">
                      <ImageIcon className="h-8 w-8 opacity-30 mb-1" />
                      <span className="text-[10px] font-semibold text-muted-foreground">Sin logotipo</span>
                    </div>
                  )}

                  <div className="mt-4 text-center">
                    <p className="text-[11px] text-muted-foreground">
                      Formatos recomendados: PNG o JPG con fondo blanco/transparente.
                    </p>
                  </div>
                </div>
              </div>

              {/* Botón de subida */}
              <div className="pt-4 border-t border-border/70 flex justify-center">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  id="logo-upload" 
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const compressed = await compressImage(file, 512, 512, 0.7);
                        setTenant({ ...tenant, logo_url: compressed });
                        toast.success("Logotipo cargado correctamente");
                      } catch {
                        toast.error("Error al procesar la imagen");
                      }
                    }
                  }} 
                />
                <Button 
                  variant="outline" 
                  onClick={() => document.getElementById("logo-upload")?.click()}
                  className="rounded-xl border-border hover:bg-accent font-semibold text-xs h-9 px-4 gap-2 cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5 text-primary" /> 
                  <span>{tenant.logo_url ? "Cambiar imagen de logo" : "Subir nuevo logotipo"}</span>
                </Button>
              </div>
            </Card>

            {/* Tarjeta 2: Color Primario / Identidad */}
            <Card className={`${CARD} rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-card p-6 md:p-8 flex flex-col justify-between`}>
              <div>
                {/* Header de la tarjeta */}
                <div className="flex items-center gap-3.5 pb-5 border-b border-border/70">
                  <div className="h-11 w-11 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Palette className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base text-foreground leading-tight">
                      Color de Identidad
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Color principal para botones, pestañas y acentos.
                    </p>
                  </div>
                </div>

                {/* Swatches y selector */}
                <div className="flex flex-col items-center justify-center py-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-center gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-inner w-full max-w-[360px] mx-auto">
                    {[
                      { name: "Klynn Blue", hex: "#1B4B73" },
                      { name: "Teal", hex: "#0D9488" },
                      { name: "Emerald", hex: "#059669" },
                      { name: "Purple", hex: "#7C3AED" },
                      { name: "Ruby", hex: "#E11D48" },
                      { name: "Amber", hex: "#D97706" },
                      { name: "Slate", hex: "#334155" },
                    ].map((p) => {
                      const isSelected = tenant.color_primario.toLowerCase() === p.hex.toLowerCase();
                      return (
                        <button
                          key={p.hex}
                          type="button"
                          onClick={() => setTenant({ ...tenant, color_primario: p.hex })}
                          className="relative h-8 w-8 rounded-xl transition-all duration-200 hover:scale-115 active:scale-95 flex items-center justify-center shadow-xs cursor-pointer"
                          style={{ backgroundColor: p.hex }}
                          title={p.name}
                        >
                          {isSelected && (
                            <Check className="h-4 w-4 text-white drop-shadow-xs stroke-[3]" />
                          )}
                        </button>
                      );
                    })}

                    {/* Custom Color Selector */}
                    <div className="relative h-8 w-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 transition-all flex items-center justify-center shadow-xs cursor-pointer hover:scale-115 group active:scale-95">
                      <input
                        type="color"
                        value={tenant.color_primario}
                        onChange={(e) => setTenant({ ...tenant, color_primario: e.target.value })}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        title="Seleccionar color personalizado"
                      />
                      <Palette className="h-4 w-4 text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors" />
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 font-mono text-xs font-bold text-slate-600 dark:text-slate-300 shadow-2xs">
                    <span className="text-[10px] text-muted-foreground tracking-wider font-sans font-semibold">CÓDIGO HEX:</span>
                    <span className="uppercase font-mono text-primary font-black">{tenant.color_primario}</span>
                    <div className="h-3 w-3 rounded-full border shadow-2xs ml-0.5" style={{ backgroundColor: tenant.color_primario }} />
                  </div>
                </div>
              </div>

              {/* Botón de vista previa / demostración */}
              <div className="pt-4 border-t border-border/70 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  Vista previa de botón con este color:
                </span>
                <button
                  type="button"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm flex items-center gap-1.5 transition-all"
                  style={{ backgroundColor: tenant.color_primario }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Botón Activo</span>
                </button>
              </div>
            </Card>
          </div>

          {/* Footer de Guardar */}
          <Card className={`${CARD} rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-card p-4 md:p-6 flex flex-col sm:flex-row items-center justify-between gap-3`}>
            <span className="text-xs text-muted-foreground text-center sm:text-left">
              El logotipo y color de marca se reflejarán instantáneamente en toda la aplicación.
            </span>
            <Button 
              onClick={() => save(tenant)}
              className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-white font-bold h-10 px-5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer gap-2"
            >
              <Save className="h-4 w-4" />
              <span>Guardar cambios</span>
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="factura" className="space-y-6 animate-in fade-in duration-300">
          <Card className={`${CARD} rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-card p-6 md:p-8 space-y-6`}>
            {/* Header del Ticket */}
            <div className="flex items-center gap-3.5 pb-5 border-b border-border/70">
              <div className="h-11 w-11 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Receipt className="h-5.5 w-5.5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-foreground leading-tight">
                  Formato y Textos del Ticket
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Personaliza dimensiones térmicas, plazos de entrega y mensajes impresos.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Fila 1: Configuración de impresión y tiempos */}
              <div className="grid gap-5 md:grid-cols-3">
                <Field label="Formato de papel" icon={Printer}>
                  <Select value={cfg.formato_ticket} onValueChange={(v: any) => updateCfg({ formato_ticket: v })}>
                    <SelectTrigger className={`${FIELD} pl-10.5 rounded-xl border-slate-200 dark:border-slate-800`}>
                      <SelectValue placeholder="Seleccionar formato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="57mm">57mm (Papel estrecho)</SelectItem>
                      <SelectItem value="80mm">80mm (Estándar POS)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Tiempo de entrega estándar" icon={Clock}>
                  <Select value={String(cfg.tiempo_entrega_estandar || 24)} onValueChange={(v) => updateCfg({ tiempo_entrega_estandar: Number(v) })}>
                    <SelectTrigger className={`${FIELD} pl-10.5 rounded-xl border-slate-200 dark:border-slate-800`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">1 DÍA (24 HORAS)</SelectItem>
                      <SelectItem value="48">2 DÍAS (48 HORAS)</SelectItem>
                      <SelectItem value="72">3 DÍAS (72 HORAS)</SelectItem>
                      <SelectItem value="96">4 DÍAS (96 HORAS)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Tiempo de entrega URGENTE" icon={Zap}>
                  <Select value={String(cfg.tiempo_entrega_urgente || 6)} onValueChange={(v) => updateCfg({ tiempo_entrega_urgente: Number(v) })}>
                    <SelectTrigger className={`${FIELD} pl-10.5 rounded-xl border-slate-200 dark:border-slate-800`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 HORAS</SelectItem>
                      <SelectItem value="6">6 HORAS</SelectItem>
                      <SelectItem value="12">12 HORAS</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {/* Fila 2: Mensajes y Textos */}
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Pie de página del ticket" icon={MessageSquare} alignTop>
                  <SubtleExpandingTextarea 
                    value={cfg.ticket_pie || ""} 
                    onChange={(e: any) => updateCfg({ ticket_pie: e.target.value })} 
                    placeholder="Ej: ¡Gracias por su preferencia!"
                  />
                </Field>

                <Field label="Nota legal o mensaje adicional" icon={FileText} alignTop>
                  <SubtleExpandingTextarea 
                    value={cfg.ticket_nota || ""} 
                    onChange={(e: any) => updateCfg({ ticket_nota: e.target.value })} 
                    placeholder="Ej: Ropa con más de 30 días será vendida por importe de trabajo..."
                  />
                </Field>
              </div>

              {/* Fila 3: Switches estilizados con IconBoxes */}
              <div className="grid gap-4 md:grid-cols-3 pt-2">
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <User className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">Mostrar empleado</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Nombre del cajero en el recibo.</p>
                    </div>
                  </div>
                  <Switch 
                    checked={cfg.ticket_mostrar_empleado} 
                    onCheckedChange={(v) => updateCfg({ ticket_mostrar_empleado: v })} 
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Layers className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">Ubicación Conveyor</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Ganchos, rieles y estantería.</p>
                    </div>
                  </div>
                  <Switch 
                    checked={cfg.usar_ubicacion_ropa || false} 
                    onCheckedChange={(v) => updateCfg({ usar_ubicacion_ropa: v })} 
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <FileEdit className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">Notas en ticket cliente</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Instrucciones y observaciones.</p>
                    </div>
                  </div>
                  <Switch 
                    checked={cfg.ticket_mostrar_notas || false} 
                    onCheckedChange={(v) => updateCfg({ ticket_mostrar_notas: v })} 
                  />
                </div>
              </div>
            </div>

            {/* Footer de Guardar */}
            <div className="pt-6 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground text-center sm:text-left">
                Los ajustes se aplicarán en todos los nuevos tickets impresos.
              </span>
              <Button 
                onClick={() => save(tenant)}
                className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-white font-bold h-10 px-5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer gap-2"
              >
                <Save className="h-4 w-4" />
                <span>Guardar cambios</span>
              </Button>
            </div>
          </Card>

          {/* Configuración de Impresora Física */}
          {!showPhysicalPrinterConfig ? (
            <button 
              onClick={() => setShowPhysicalPrinterConfig(true)}
              className="w-full mt-6 flex items-center justify-between p-4.5 rounded-2xl border transition-all text-left cursor-pointer hover:shadow-sm"
              style={{
                backgroundColor: tenant?.color_primario + "06",
                borderColor: tenant?.color_primario + "25",
                borderWidth: "1.5px"
              }}
            >
              <div className="flex items-center gap-4">
                <div 
                  className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm"
                  style={{ backgroundColor: tenant?.color_primario }}
                >
                  <Printer className="h-5.5 w-5.5 text-white" />
                </div>
                <div>
                  <h4 
                    className="font-display font-bold text-[15px] leading-tight"
                    style={{ color: tenant?.color_primario }}
                  >
                    Configurar impresora física
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Conecta tu impresora térmica por Bluetooth o USB para imprimir tickets reales</p>
                </div>
              </div>
              <ArrowRight 
                className="h-5 w-5" 
                style={{ color: tenant?.color_primario }}
              />
            </button>
          ) : (
            <Card className={CARD + " mt-6 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300"}>
              {/* Encabezado */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <button 
                    onClick={() => setShowPhysicalPrinterConfig(false)}
                    className="h-8 w-8 rounded-full text-white flex items-center justify-center cursor-pointer hover:opacity-90 active:scale-95 transition-all"
                    style={{ backgroundColor: tenant?.color_primario }}
                    title="Volver"
                  >
                    <ArrowLeft className="h-4.5 w-4.5 text-white" strokeWidth={3} />
                  </button>
                  <h4 className="font-display font-black text-lg text-slate-800">Ajustes de Impresora Física</h4>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-full border">
                  <span className={`h-2 w-2 rounded-full ${connectionStatus === "Conectada" ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{connectionStatus}</span>
                </div>
              </div>

              {/* Tipo de conexión */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-base font-bold text-slate-800">Tipo de conexion</h4>
                  <p className="text-xs text-slate-500 mt-1">Selecciona cómo está conectada tu impresora para configurarla.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Bluetooth Card */}
                  <button
                    type="button"
                    onClick={() => updateCfg({ impresora_tipo: "bluetooth" })}
                    className={`flex flex-col items-center justify-center text-center p-6 rounded-2xl border transition-all duration-300 cursor-pointer hover:shadow-md ${
                      cfg.impresora_tipo === "bluetooth" ? "" : "hover:border-slate-400"
                    }`}
                    style={{
                      borderWidth: cfg.impresora_tipo === "bluetooth" ? "2px" : "1.5px",
                      borderColor: cfg.impresora_tipo === "bluetooth" ? tenant.color_primario : "#cbd5e1",
                      boxShadow: cfg.impresora_tipo === "bluetooth" 
                        ? `0 4px 14px -3px ${tenant.color_primario}40, 0 2px 6px -2px ${tenant.color_primario}20`
                        : "0 2px 8px -3px rgba(0, 0, 0, 0.06), 0 1px 4px -2px rgba(0, 0, 0, 0.04)",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <Bluetooth 
                      className="h-7 w-7 mb-2 transition-colors animate-in zoom-in-50 duration-300" 
                      style={{ color: "#0284c7" }}
                    />
                    <span 
                      className="text-sm font-semibold transition-colors"
                      style={{ color: cfg.impresora_tipo === "bluetooth" ? tenant.color_primario : "#334155" }}
                    >
                      Bluetooth
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 font-medium">Impresoras inalámbricas</span>
                  </button>

                  {/* Puerto Serie Card */}
                  <button
                    type="button"
                    onClick={() => updateCfg({ impresora_tipo: "serial" })}
                    className={`flex flex-col items-center justify-center text-center p-6 rounded-2xl border transition-all duration-300 cursor-pointer hover:shadow-md ${
                      cfg.impresora_tipo === "serial" ? "" : "hover:border-slate-400"
                    }`}
                    style={{
                      borderWidth: cfg.impresora_tipo === "serial" ? "2px" : "1.5px",
                      borderColor: cfg.impresora_tipo === "serial" ? tenant.color_primario : "#cbd5e1",
                      boxShadow: cfg.impresora_tipo === "serial" 
                        ? `0 4px 14px -3px ${tenant.color_primario}40, 0 2px 6px -2px ${tenant.color_primario}20`
                        : "0 2px 8px -3px rgba(0, 0, 0, 0.06), 0 1px 4px -2px rgba(0, 0, 0, 0.04)",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <Cable 
                      className="h-7 w-7 mb-2 transition-colors" 
                      style={{ color: "#EA580C" }}
                    />
                    <span 
                      className="text-sm font-semibold transition-colors"
                      style={{ color: cfg.impresora_tipo === "serial" ? tenant.color_primario : "#334155" }}
                    >
                      Puerto Serie
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 font-medium">COM / TTL directo</span>
                  </button>

                  {/* USB Card */}
                  <button
                    type="button"
                    onClick={() => updateCfg({ impresora_tipo: "usb" })}
                    className={`flex flex-col items-center justify-center text-center p-6 rounded-2xl border transition-all duration-300 cursor-pointer hover:shadow-md ${
                      cfg.impresora_tipo === "usb" ? "" : "hover:border-slate-400"
                    }`}
                    style={{
                      borderWidth: cfg.impresora_tipo === "usb" ? "2px" : "1.5px",
                      borderColor: cfg.impresora_tipo === "usb" ? tenant.color_primario : "#cbd5e1",
                      boxShadow: cfg.impresora_tipo === "usb" 
                        ? `0 4px 14px -3px ${tenant.color_primario}40, 0 2px 6px -2px ${tenant.color_primario}20`
                        : "0 2px 8px -3px rgba(0, 0, 0, 0.06), 0 1px 4px -2px rgba(0, 0, 0, 0.04)",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <Monitor 
                      className="h-7 w-7 mb-2 transition-colors" 
                      style={{ color: "#0D9488" }}
                    />
                    <span 
                      className="text-sm font-semibold transition-colors"
                      style={{ color: cfg.impresora_tipo === "usb" ? tenant.color_primario : "#334155" }}
                    >
                      USB (Mac/Win)
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 font-medium">Driver instalado en el equipo</span>
                  </button>
                </div>
              </div>

              {/* Paneles de Configuración específicos por tipo de conexión */}
              {cfg.impresora_tipo === "bluetooth" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Alerta de Desconexión estilo Captura 1 */}
                  <a
                    href="https://developer.chrome.com/docs/web-platform/bluetooth"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3.5 bg-[#FFFDEB] border border-[#FBEFCD] rounded-xl text-xs text-[#8A6D3B] hover:bg-[#FFFAD6] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <Plug className="h-4.5 w-4.5 text-[#A2834E] shrink-0 font-bold" />
                      <span className="font-semibold text-[11px] md:text-xs leading-normal">
                        ¿Se te desconecta a cada rato? <span className="font-normal text-[#9A7D4C]">Activa una opción de Chrome para que recuerde el emparejamiento entre sesiones.</span>
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[#A2834E] group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </a>

                  {/* Dispositivo actual y búsqueda con border dashed */}
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleBluetoothConnect}
                      disabled={loadingHardware}
                      className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed rounded-xl hover:bg-slate-50/50 transition-all font-bold text-sm text-slate-800 cursor-pointer"
                      style={{ borderColor: tenant.color_primario + "40" }}
                    >
                      {loadingHardware ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
                      ) : (
                        <Plus className="h-4 w-4 font-black text-slate-900" />
                      )}
                      Buscar impresoras
                    </button>
                    <p className="text-[11px] font-bold text-slate-400 text-center">
                      {bluetoothDeviceName ? `Impresora actual: ${bluetoothDeviceName}` : "No se encontraron impresoras"}
                    </p>
                  </div>
                  
                  {/* WhatsApp Support Link */}
                  <div className="flex justify-center pt-2.5">
                    <a
                      href="https://wa.me/18299416546?text=Hola Klynn, necesito ayuda con la configuración de la impresora Bluetooth."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 text-sm font-bold hover:underline transition-colors cursor-pointer"
                      style={{ color: tenant.color_primario }}
                    >
                      <MessageCircle className="h-5 w-5" />
                      ¿Necesitas ayuda? Escríbenos por WhatsApp
                    </a>
                  </div>
                </div>
              )}

              {cfg.impresora_tipo === "serial" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Velocidad */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-sm font-bold text-slate-800">
                      Velocidad (baud rate)
                    </label>
                    <Select 
                      value={String(cfg.impresora_serial_baud || 9600)} 
                      onValueChange={(v) => updateCfg({ impresora_serial_baud: Number(v) })}
                    >
                      <SelectTrigger className="rounded-xl border-slate-200 h-11 bg-white focus:ring-0">
                        <SelectValue placeholder="Selecciona velocidad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="9600">9600 (default)</SelectItem>
                        <SelectItem value="19200">19200</SelectItem>
                        <SelectItem value="38400">38400</SelectItem>
                        <SelectItem value="57600">57600</SelectItem>
                        <SelectItem value="115200">115200</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-slate-400 font-medium leading-normal mt-1">
                      Prueba 9600 o 115200. Si no imprime, cambia la velocidad y prueba de nuevo.
                    </p>
                  </div>

                  {/* Botones de búsqueda */}
                  <div className="space-y-3 pt-2">
                    {/* Buscar impresora Serial Button */}
                    <button
                      type="button"
                      onClick={handleSerialConnect}
                      disabled={loadingHardware}
                      className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed rounded-xl hover:bg-slate-50/50 transition-all font-bold text-sm text-slate-800 cursor-pointer border-slate-300"
                    >
                      {loadingHardware ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
                      ) : (
                        <Printer className="h-4.5 w-4.5 text-slate-900" />
                      )}
                      Buscar impresora Serial
                    </button>

                    {/* Texto informativo */}
                    <p className="text-[11px] text-slate-400 text-center font-medium">
                      ¿No aparece ningún puerto? Usa USB Directo (Mac / Linux)
                    </p>

                    {/* USB Directo (Mac / Linux) Button */}
                    <button
                      type="button"
                      onClick={handleSerialConnect}
                      disabled={loadingHardware}
                      className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed rounded-xl hover:bg-slate-50/50 transition-all font-bold text-sm cursor-pointer"
                      style={{ 
                        borderColor: tenant.color_primario + "40", 
                        color: tenant.color_primario 
                      }}
                    >
                      {loadingHardware ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Cable className="h-4.5 w-4.5" style={{ color: tenant.color_primario }} />
                      )}
                      USB Directo (Mac / Linux)
                    </button>
                  </div>

                  {/* WhatsApp Support Link */}
                  <div className="flex justify-center pt-2.5">
                    <a
                      href="https://wa.me/18299416546?text=Hola Klynn, necesito ayuda con la configuración de la impresora Serial."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 text-sm font-bold hover:underline transition-colors cursor-pointer"
                      style={{ color: tenant.color_primario }}
                    >
                      <MessageCircle className="h-5 w-5" />
                      ¿Necesitas ayuda? Escríbenos por WhatsApp
                    </a>
                  </div>
                </div>
              )}

              {cfg.impresora_tipo === "usb" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Alerta de drivers */}
                  <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800">
                    <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <span className="font-bold">Driver requerido</span> — Si imprime caracteres extraños o código, tu impresora está usando el driver "Generic PostScript". Busca e instala el driver específico de tu modelo (Epson, Star, Xprinter, etc.) desde el sitio del fabricante.
                    </div>
                  </div>

                  {/* Instrucciones de sistema */}
                  <div className="space-y-3 px-1 py-1">
                    <div className="flex items-start gap-3">
                      <div 
                        className="h-5 w-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: tenant.color_primario }}
                      >
                        1
                      </div>
                      <p className="text-xs text-slate-600 leading-normal font-medium">Conecta tu impresora por USB e instala el driver del fabricante</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div 
                        className="h-5 w-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: tenant.color_primario }}
                      >
                        2
                      </div>
                      <p className="text-xs text-slate-600 leading-normal font-medium">Verifica que funciona imprimiendo una página de prueba desde tu sistema operativo</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div 
                        className="h-5 w-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: tenant.color_primario }}
                      >
                        3
                      </div>
                      <p className="text-xs text-slate-600 leading-normal font-medium">Haz clic en el botón de abajo. Al imprimir un ticket, selecciona tu impresora en el diálogo del navegador</p>
                    </div>
                  </div>

                  <button 
                    type="button" 
                    onClick={() => save(tenant)}
                    className="w-full text-white gap-2 rounded-xl font-bold h-11 shadow-sm transition-colors active:scale-[0.99] flex items-center justify-center cursor-pointer"
                    style={{ backgroundColor: tenant.color_primario }}
                  >
                    <Monitor className="h-4.5 w-4.5" />
                    Guardar como Impresora Windows
                  </button>

                  {/* Truco Impresión Silenciosa */}
                  <div className="pt-1.5 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowKioskHelpModal(true)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Zap className="h-3.5 w-3.5" style={{ color: tenant.color_primario }} fill="currentColor" />
                      <span className="underline decoration-dashed underline-offset-4">¿Cómo activar la impresión automática instantánea?</span>
                    </button>
                  </div>
                </div>
              )}
              <div className="space-y-4 pt-2">
                <div>
                  <h4 className="text-base font-bold text-slate-800">Perfil de impresión</h4>
                  <p className="text-xs text-slate-500 mt-1">Elige según la calidad de tu impresora térmica.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Básica */}
                  <button
                    type="button"
                    onClick={() => updateCfg({ impresora_perfil: "basica" })}
                    className={`relative flex flex-col items-center justify-center text-center p-6 rounded-2xl border transition-all duration-300 cursor-pointer hover:shadow-md ${
                      (cfg.impresora_perfil || "basica") === "basica" ? "" : "hover:border-slate-400"
                    }`}
                    style={{
                      borderWidth: (cfg.impresora_perfil || "basica") === "basica" ? "2px" : "1.5px",
                      borderColor: (cfg.impresora_perfil || "basica") === "basica" ? tenant.color_primario : "#cbd5e1",
                      boxShadow: (cfg.impresora_perfil || "basica") === "basica"
                        ? `0 4px 14px -3px ${tenant.color_primario}40, 0 2px 6px -2px ${tenant.color_primario}20`
                        : "0 2px 8px -3px rgba(0, 0, 0, 0.06), 0 1px 4px -2px rgba(0, 0, 0, 0.04)",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    {/* Indicador Radio en la esquina superior derecha */}
                    <div className="absolute top-3.5 right-3.5">
                      {((cfg.impresora_perfil || "basica") === "basica") ? (
                        <div className="h-4.5 w-4.5 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: tenant.color_primario }}>
                          <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} />
                        </div>
                      ) : (
                        <div className="h-4.5 w-4.5 rounded-full border-2 border-slate-300 bg-white" />
                      )}
                    </div>

                    <FileText 
                      className="h-8 w-8 mb-2.5 transition-colors duration-300" 
                      style={{ color: "#64748B" }}
                    />
                    <span 
                      className="text-sm font-semibold transition-colors"
                      style={{ color: (cfg.impresora_perfil || "basica") === "basica" ? tenant.color_primario : "#334155" }}
                    >
                      Básica
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 font-medium leading-normal">Compatible con todas las impresoras</span>
                  </button>

                  {/* Estándar */}
                  <button
                    type="button"
                    onClick={() => updateCfg({ impresora_perfil: "estandar" })}
                    className={`relative flex flex-col items-center justify-center text-center p-6 rounded-2xl border transition-all duration-300 cursor-pointer hover:shadow-md ${
                      cfg.impresora_perfil === "estandar" ? "" : "hover:border-slate-400"
                    }`}
                    style={{
                      borderWidth: cfg.impresora_perfil === "estandar" ? "2px" : "1.5px",
                      borderColor: cfg.impresora_perfil === "estandar" ? tenant.color_primario : "#cbd5e1",
                      boxShadow: cfg.impresora_perfil === "estandar"
                        ? `0 4px 14px -3px ${tenant.color_primario}40, 0 2px 6px -2px ${tenant.color_primario}20`
                        : "0 2px 8px -3px rgba(0, 0, 0, 0.06), 0 1px 4px -2px rgba(0, 0, 0, 0.04)",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    {/* Indicador Radio en la esquina superior derecha */}
                    <div className="absolute top-3.5 right-3.5">
                      {cfg.impresora_perfil === "estandar" ? (
                        <div className="h-4.5 w-4.5 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: tenant.color_primario }}>
                          <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} />
                        </div>
                      ) : (
                        <div className="h-4.5 w-4.5 rounded-full border-2 border-slate-300 bg-white" />
                      )}
                    </div>

                    <Receipt 
                      className="h-8 w-8 mb-2.5 transition-colors duration-300" 
                      style={{ color: "#16A34A" }}
                    />
                    <span 
                      className="text-sm font-semibold transition-colors"
                      style={{ color: cfg.impresora_perfil === "estandar" ? tenant.color_primario : "#334155" }}
                    >
                      Estándar
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 font-medium leading-normal">Título y total en tamaño doble</span>
                  </button>

                  {/* Completa */}
                  <button
                    type="button"
                    onClick={() => updateCfg({ impresora_perfil: "completa" })}
                    className={`relative flex flex-col items-center justify-center text-center p-6 rounded-2xl border transition-all duration-300 cursor-pointer hover:shadow-md ${
                      cfg.impresora_perfil === "completa" ? "" : "hover:border-slate-400"
                    }`}
                    style={{
                      borderWidth: cfg.impresora_perfil === "completa" ? "2px" : "1.5px",
                      borderColor: cfg.impresora_perfil === "completa" ? tenant.color_primario : "#cbd5e1",
                      boxShadow: cfg.impresora_perfil === "completa"
                        ? `0 4px 14px -3px ${tenant.color_primario}40, 0 2px 6px -2px ${tenant.color_primario}20`
                        : "0 2px 8px -3px rgba(0, 0, 0, 0.06), 0 1px 4px -2px rgba(0, 0, 0, 0.04)",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    {/* Indicador Radio en la esquina superior derecha */}
                    <div className="absolute top-3.5 right-3.5">
                      {cfg.impresora_perfil === "completa" ? (
                        <div className="h-4.5 w-4.5 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: tenant.color_primario }}>
                          <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} />
                        </div>
                      ) : (
                        <div className="h-4.5 w-4.5 rounded-full border-2 border-slate-300 bg-white" />
                      )}
                    </div>

                    <Sparkles 
                      className="h-8 w-8 mb-2.5 transition-colors duration-300" 
                      style={{ color: "#7C3AED" }}
                    />
                    <span 
                      className="text-sm font-semibold transition-colors"
                      style={{ color: cfg.impresora_perfil === "completa" ? tenant.color_primario : "#334155" }}
                    >
                      Completa
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 font-medium leading-normal">Todo en tamaño doble + logo grande</span>
                  </button>
                </div>

                <p className="text-[11px] text-center text-slate-400 mt-3 font-medium">
                  Si el ticket sale cortado o con símbolos raros, cambia a <span className="font-bold text-slate-500">Básica</span>.
                </p>
              </div>

              {/* Botón Guardar Configuración */}
              <div className="pt-2">
                <button 
                  type="button" 
                  onClick={() => save(tenant)}
                  className="w-full h-11 rounded-xl font-bold flex items-center justify-center gap-2 text-white shadow-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
                  style={{ backgroundColor: tenant.color_primario }}
                >
                  <Check className="h-4.5 w-4.5" strokeWidth={3} />
                  Guardar configuración
                </button>
              </div>

              {/* Imprimir prueba */}
              <div className="space-y-4 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Imprimir prueba</h4>
                    <p className="text-xs text-slate-500 mt-1">Realiza un test para verificar que la conexión y el formato de impresión sean correctos.</p>
                  </div>
                  <div 
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider select-none shrink-0 ${
                      isPrinterConnected 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                        : "bg-slate-50 border-slate-200 text-slate-500"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${isPrinterConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                    {isPrinterConnected ? "Conectada" : "No conectada"}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleTestPrint(false)}
                    disabled={!isPrinterConnected}
                    className={`flex items-center justify-between py-3 px-4 rounded-xl border transition-all text-left ${
                      !isPrinterConnected ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-[0.99]"
                    }`}
                    style={{
                      backgroundColor: "#F0F7FF",
                      borderColor: "#D0E7FF",
                      borderWidth: "1.5px"
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 bg-[#0284c7] text-white">
                        <Printer className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-800 block">Prueba básica</span>
                        <span className="text-[11px] text-slate-500 font-medium leading-none mt-0.5 block">Texto sin formato</span>
                      </div>
                    </div>
                    <ArrowRight className="h-4.5 w-4.5 text-[#0284c7]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTestPrint(true)}
                    disabled={!isPrinterConnected}
                    className={`flex items-center justify-between py-3 px-4 rounded-xl border transition-all text-left ${
                      !isPrinterConnected ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-[0.99]"
                    }`}
                    style={{
                      backgroundColor: tenant.color_primario + "10",
                      borderColor: tenant.color_primario + "40",
                      borderWidth: "1.5px"
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-white"
                        style={{ backgroundColor: tenant.color_primario }}
                      >
                        <Printer className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <span 
                          className="text-sm font-bold block"
                          style={{ color: tenant.color_primario }}
                        >
                          Prueba ESC/POS
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium leading-none mt-0.5 block">Negritas, alineación y corte</span>
                      </div>
                    </div>
                    <ArrowRight 
                      className="h-4.5 w-4.5" 
                      style={{ color: tenant.color_primario }}
                    />
                  </button>
                </div>

                {/* Tarjeta de Diagnóstico */}
                <div 
                  className="mt-4 p-4.5 rounded-2xl border transition-all text-left bg-white"
                  style={{
                    borderColor: tenant.color_primario + "15",
                    borderWidth: "1.5px"
                  }}
                >
                  <h5 className="font-bold text-slate-800 text-[14px]">¿Problemas con tu impresora?</h5>
                  <p className="text-xs text-slate-500 mt-1 font-medium leading-normal">
                    Descarga un archivo de diagnóstico con tu configuración, sistema operativo y registro de errores. Envíaselo a soporte por WhatsApp.
                  </p>
                  <button
                    type="button"
                    onClick={handleDownloadDiagnostic}
                    className="w-full mt-3 h-10 border bg-white hover:bg-slate-50 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all text-xs cursor-pointer shadow-sm active:scale-[0.99]"
                    style={{
                      color: tenant.color_primario,
                      borderColor: tenant.color_primario + "35"
                    }}
                  >
                    <Wrench className="h-4 w-4" style={{ color: tenant.color_primario }} />
                    Descargar diagnóstico (.txt)
                  </button>
                </div>
              </div>
            </Card>
          )}

          {/* Modal de Ayuda para Modo Kiosco */}
          <Dialog open={showKioskHelpModal} onOpenChange={setShowKioskHelpModal}>
            <DialogContent className="max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <DialogHeader className="space-y-2">
                <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Zap className="h-5 w-5" style={{ color: tenant?.color_primario }} fill="currentColor" />
                  Impresión Automática (Modo Kiosco)
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 leading-normal">
                  Sigue estos sencillos pasos de 1 minuto en la computadora de tu caja para que los tickets se impriman al instante sin mostrar ventanas de confirmación en el navegador.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 my-4 text-left max-h-[350px] overflow-y-auto pr-1">
                {/* Sección Windows */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 font-black text-slate-800 text-[11px] uppercase tracking-wider bg-slate-50 p-2 rounded-lg border">
                    <Monitor className="h-4 w-4 text-slate-650" />
                    <span>En Windows (Chrome / Edge)</span>
                  </div>
                  <div className="space-y-2 pl-1">
                    <div className="flex items-start gap-2.5">
                      <div 
                        className="h-5 w-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: tenant?.color_primario }}
                      >
                        1
                      </div>
                      <p className="text-xs text-slate-600 leading-normal font-medium">Cierra todas las ventanas de Google Chrome o Microsoft Edge que tengas abiertas.</p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div 
                        className="h-5 w-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: tenant?.color_primario }}
                      >
                        2
                      </div>
                      <p className="text-xs text-slate-600 leading-normal font-medium">Haz clic derecho sobre el acceso directo de Google Chrome en tu escritorio y selecciona <span className="font-bold text-slate-800">Propiedades</span>.</p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div 
                        className="h-5 w-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: tenant?.color_primario }}
                      >
                        3
                      </div>
                      <p className="text-xs text-slate-600 leading-normal font-medium">En la pestaña "Acceso directo", busca el campo <span className="font-bold text-slate-800">Destino</span>. Ve al final del texto, escribe un espacio en blanco y añade:</p>
                    </div>
                    <div className="bg-slate-100 p-2.5 rounded-lg border text-center select-all cursor-pointer font-mono text-[11px] text-slate-700 mx-7 font-semibold">
                      --kiosk-printing
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div 
                        className="h-5 w-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: tenant?.color_primario }}
                      >
                        4
                      </div>
                      <p className="text-xs text-slate-600 leading-normal font-medium">Haz clic en <span className="font-bold text-slate-800">Aplicar</span> y luego en <span className="font-bold text-slate-800">Aceptar</span>.</p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div 
                        className="h-5 w-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: tenant?.color_primario }}
                      >
                        5
                      </div>
                      <p className="text-xs text-slate-600 leading-normal font-medium">Abre tu navegador usando ese mismo acceso directo. ¡Ahora los tickets se imprimirán al instante!</p>
                    </div>
                  </div>
                </div>

                {/* Sección macOS */}
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center gap-1.5 font-black text-slate-800 text-[11px] uppercase tracking-wider bg-slate-50 p-2 rounded-lg border">
                    <Laptop className="h-4 w-4 text-slate-650" />
                    <span>En macOS (Chrome)</span>
                  </div>
                  <div className="space-y-2 pl-1">
                    <div className="flex items-start gap-2.5">
                      <div 
                        className="h-5 w-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: tenant?.color_primario }}
                      >
                        1
                      </div>
                      <p className="text-xs text-slate-600 leading-normal font-medium">Cierra por completo el navegador Google Chrome.</p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div 
                        className="h-5 w-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: tenant?.color_primario }}
                      >
                        2
                      </div>
                      <p className="text-xs text-slate-600 leading-normal font-medium">Abre la aplicación <span className="font-bold text-slate-800">Terminal</span> de tu Mac.</p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div 
                        className="h-5 w-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: tenant?.color_primario }}
                      >
                        3
                      </div>
                      <p className="text-xs text-slate-600 leading-normal font-medium">Copia, pega y ejecuta (Enter) el siguiente comando:</p>
                    </div>
                    <div className="bg-slate-100 p-2.5 rounded-lg border text-left select-all cursor-pointer font-mono text-[10px] text-slate-700 overflow-x-auto whitespace-nowrap mx-7 font-semibold">
                      open -a "Google Chrome" --args --kiosk-printing
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setShowKioskHelpModal(false)}
                  className="w-full h-10 rounded-xl font-bold flex items-center justify-center text-white cursor-pointer active:scale-[0.99] transition-all"
                  style={{ backgroundColor: tenant?.color_primario }}
                >
                  Entendido
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Portal de Impresión de Ticket de Prueba */}
          {printingFakeTicket && createPortal(
            <div className="hidden print:flex fixed inset-0 bg-white z-[99999] overflow-y-auto pointer-events-auto atomic-print-target justify-center items-start pt-10">
              {printingFakeTicket.isEscPos ? (
                <Ticket 
                  orden={printingFakeTicket.orden}
                  tenant={tenant}
                  cliente={printingFakeTicket.cliente}
                  empleado={printingFakeTicket.empleado}
                  formato={cfg.impresora_formato || "80mm"}
                />
              ) : (
                <div 
                  className={`thermal-ticket mx-auto bg-white p-6 font-mono text-[11px] leading-tight text-black border border-dashed border-black/20 ${
                    (cfg.impresora_formato || "80mm") === "57mm" ? "w-[58mm] max-w-[32ch]" : "w-[80mm] max-w-[44ch]"
                  }`}
                  style={{ fontFamily: "monospace", whiteSpace: "pre-wrap" }}
                >
                  {`=== PRUEBA DE IMPRESORA BÁSICA ===
LAVA Y YA (DEMO)
Tel: ${tenant.telefono || "---"}
--------------------------------
ORDEN: ${printingFakeTicket.orden.numero}
Fecha: ${new Date().toLocaleString("es-DO")}
--------------------------------
1x Lavado y secado       RD$150.00
2x Prenda de prueba A    RD$240.00
1x Prenda de prueba B    RD$250.00
--------------------------------
Subtotal:                RD$490.00
ITBIS 18%:                RD$88.20
TOTAL:                   RD$578.20
--------------------------------
ESTADO PAGO: PAGADA
--------------------------------
Atendido por: ${printingFakeTicket.empleado.nombre}
¡Gracias por su preferencia!`}
                </div>
              )}
            </div>,
            document.body
          )}
        </TabsContent>

        <TabsContent value="caja" className="space-y-6 animate-in fade-in duration-300">
          <Card className={`${CARD} rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-card p-6 md:p-8 space-y-6`}>
            {/* Header de Caja */}
            <div className="flex items-center gap-3.5 pb-5 border-b border-border/70">
              <div className="h-11 w-11 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Banknote className="h-5.5 w-5.5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-foreground leading-tight">
                  Punto de Venta y Flujo de Caja
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Parámetros operativos de cobro, arqueo de caja chica y emisión de comprobantes.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Fila 1: Parámetros financieros */}
              <div className="grid gap-5 md:grid-cols-3">
                <Field label="Recargo urgencia %" icon={Percent}>
                  <Input 
                    className={`${FIELD} pl-10.5 rounded-xl border-slate-200 dark:border-slate-800`} 
                    type="number" 
                    value={cfg.recargo_urgencia} 
                    onChange={(e) => updateCfg({ recargo_urgencia: Number(e.target.value) })} 
                  />
                </Field>

                <Field label="Umbral diferencia caja (RD$)" icon={Scale}>
                  <Input 
                    className={`${FIELD} pl-10.5 rounded-xl border-slate-200 dark:border-slate-800`} 
                    value={formatAmountInput(String(cfg.umbral_diferencia_caja))} 
                    onChange={(e) => updateCfg({ umbral_diferencia_caja: parseAmount(e.target.value) })} 
                  />
                </Field>

                <Field label="Máx caja chica (RD$)" icon={Wallet}>
                  <Input 
                    className={`${FIELD} pl-10.5 rounded-xl border-slate-200 dark:border-slate-800`} 
                    value={formatAmountInput(String(cfg.monto_max_caja_chica))} 
                    onChange={(e) => updateCfg({ monto_max_caja_chica: parseAmount(e.target.value) })} 
                  />
                </Field>
              </div>

              {/* Fila 2: Switches de Configuración POS */}
              <div className="grid gap-4 md:grid-cols-2 pt-2">
                {/* Switch: Selección de servicios */}
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Sparkles className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">Habilitar selección de servicios</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Botones de servicios (lavado, secado, planchado).</p>
                    </div>
                  </div>
                  <Switch 
                    checked={cfg.pos_habilitar_servicios !== false} 
                    onCheckedChange={(v) => updateCfg({ pos_habilitar_servicios: v })} 
                  />
                </div>

                {/* Switch: Selección de prendas */}
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Shirt className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">Habilitar selección de prendas</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Desglose de prendas individuales en nueva orden.</p>
                    </div>
                  </div>
                  <Switch 
                    checked={cfg.pos_habilitar_prendas !== false} 
                    onCheckedChange={(v) => updateCfg({ pos_habilitar_prendas: v })} 
                  />
                </div>

                {/* Switch: Interfaz de venta POS */}
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Monitor className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">Interfaz de venta POS (Modo POS)</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Modo de cobro rápido para pantallas táctiles.</p>
                    </div>
                  </div>
                  <Switch 
                    checked={cfg.pos_modo_defecto !== false} 
                    onCheckedChange={(v) => updateCfg({ pos_modo_defecto: v })} 
                  />
                </div>

                {/* Switch: Ventana modal para desglose */}
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Maximize2 className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">Ventana modal para desglose</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Abre modal al hacer clic en "+ Añadir prenda".</p>
                    </div>
                  </div>
                  <Switch 
                    checked={cfg.pos_modal_desglose === true} 
                    onCheckedChange={(v) => updateCfg({ pos_modal_desglose: v })} 
                  />
                </div>

                {/* Switch: Imprimir ticket automáticamente */}
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Printer className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">Imprimir automáticamente</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Envía a impresión al registrar la orden.</p>
                    </div>
                  </div>
                  <Switch 
                    checked={cfg.pos_auto_imprimir === true} 
                    onCheckedChange={(v) => updateCfg({ pos_auto_imprimir: v })} 
                  />
                </div>

                {/* Switch: Copia de caja / Contabilidad */}
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Receipt className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">Duplicado de factura (Copia de Caja)</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Segundo recibo con precios para cuadre contable.</p>
                    </div>
                  </div>
                  <Switch 
                    checked={cfg.ticket_imprimir_copia_caja || false} 
                    onCheckedChange={(v) => updateCfg({ ticket_imprimir_copia_caja: v })} 
                  />
                </div>

                {/* Switch: Copia de taller */}
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <ClipboardList className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">Imprimir copia de taller / producción</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Ticket operativo con desglose de prendas y ubicación.</p>
                    </div>
                  </div>
                  <Switch 
                    checked={cfg.ticket_imprimir_taller_auto || false} 
                    onCheckedChange={(v) => updateCfg({ ticket_imprimir_taller_auto: v })} 
                  />
                </div>

                {/* Sub-switch: Solo imprimir si tiene ubicación */}
                {cfg.ticket_imprimir_taller_auto && (
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors animate-in fade-in duration-200">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <MapPin className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-foreground block">Solo imprimir taller si tiene ubicación</span>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Solo emitirá la copia si la orden tiene gancho o casillero asignado.</p>
                      </div>
                    </div>
                    <Switch 
                      checked={cfg.ticket_taller_solo_con_ubicacion || false} 
                      onCheckedChange={(v) => updateCfg({ ticket_taller_solo_con_ubicacion: v })} 
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Footer de Guardar */}
            <div className="pt-6 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground text-center sm:text-left">
                Las configuraciones de cobro e impresión rápida se aplicarán en el punto de venta.
              </span>
              <Button 
                onClick={() => save(tenant)}
                className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-white font-bold h-10 px-5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer gap-2"
              >
                <Save className="h-4 w-4" />
                <span>Guardar cambios</span>
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="fiscal">
          <FiscalTab 
            tenant={tenant} 
            config={ecfConfig} 
            sequences={ecfSequences}
            onRefresh={() => { queryClient.invalidateQueries({ queryKey: ['ecf-config', tenantId] }); queryClient.invalidateQueries({ queryKey: ['ecf-sequences', tenantId] }); }}
            onTenantUpdate={(updated) => setTenant(updated)}
            enabled={!!hasFiscal}
            onTabChange={setActiveTab}
          />
        </TabsContent>

        <TabsContent value="whatsapp">
          <WhatsAppTab 
            tenant={tenant} 
            wa={cfg.whatsapp || DEFAULT_CONFIG.whatsapp!} 
            saveWA={(w) => saveCfg({ whatsapp: { ...wa, ...w } })} 
            enabled={!!hasWA}
            onTabChange={setActiveTab}
          />
        </TabsContent>

        <TabsContent value="plan" className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-bold text-2xl text-foreground">Planes de Suscripción</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Elige el plan que mejor se adapte al crecimiento de tu lavandería.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
                <button 
                  type="button"
                  className={`rounded-lg font-bold text-xs px-4 py-1.5 transition-all cursor-pointer ${billingPeriod === "monthly" ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setBillingPeriod("monthly")}
                >
                  Mensual
                </button>
                <button 
                  type="button"
                  className={`rounded-lg font-bold text-xs px-4 py-1.5 transition-all cursor-pointer ${billingPeriod === "yearly" ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setBillingPeriod("yearly")}
                >
                  Anual
                </button>
              </div>
              <span className="rounded-full bg-[#F0B900]/20 px-3 py-1 text-[10px] font-black text-[#b88c00] dark:text-[#F0B900] border border-[#F0B900]/40 shadow-xs uppercase tracking-wider flex items-center gap-1">
                🎁 2 MESES GRATIS
              </span>
            </div>
          </div>

          {/* Plan Actual Banner — Solid #1B4B73 Icon Boxes */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-6 sm:p-7 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-all hover:shadow-md">
            <div className="flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                <CreditCard className="h-5.5 w-5.5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Suscripción Actual</span>
                  {(() => {
                    const statusClass = tenant.estado === "ACTIVO" 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800" 
                      : isTrialExpired 
                        ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800" 
                        : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
                    
                    return (
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${statusClass}`}>
                        ● {tenant.estado === "TRIAL" ? (isTrialExpired ? "Expirado" : "Prueba gratis") : tenant.estado}
                      </span>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-3">
                  <h3 className="font-display text-2xl font-black text-foreground tracking-tight">
                    Plan {({ basico: "Básico", pro: "Pro", enterprise: "Enterprise" } as Record<string, string>)[tenant.plan_id] || tenant.plan_id}
                  </h3>
                </div>
              </div>
            </div>

            {/* Renewal status info chip */}
            <div className="flex items-center gap-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl px-4.5 py-3 shrink-0 shadow-2xs">
              <div className="h-9 w-9 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Calendar className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {tenant.estado === "TRIAL" ? (isTrialExpired ? "Expiró el" : "Vence el") : "Próxima renovación"}
                </div>
                <div className="text-sm font-black tracking-wide text-foreground">
                  {tenant.trial_hasta ? (
                    <span>{new Date(tenant.trial_hasta).toLocaleDateString("es-DO")}</span>
                  ) : (
                    <span className="text-muted-foreground font-semibold">Sin fecha</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3 COLUMNAS PRINCIPALES */}
          <div className="grid gap-6 md:grid-cols-3 items-stretch pt-3">
            {plans.filter(p => !p.es_especial).map(p => {
              const tenantBillingPeriod = (tenant as any)?.plan_periodo || "monthly";
              const isCurrentPeriodMatch = billingPeriod === tenantBillingPeriod;
              const isCurrent = p.id === tenant.plan_id && isCurrentPeriodMatch;
              const isCurrentActivePlan = isCurrent && tenant.estado !== "TRIAL";

              const monthlyTotal = p.precio_mensual * 12;
              const annualPrice = p.precio_anual || monthlyTotal;
              const savings = monthlyTotal > annualPrice ? Math.round((1 - annualPrice / monthlyTotal) * 100) : 0;
              
              const price = billingPeriod === "monthly" ? p.precio_mensual : annualPrice;
              const period = billingPeriod === "monthly" ? "/mes" : "/año";
              
              return (
                <div 
                  key={p.id} 
                  style={{
                    borderColor: isCurrent ? '#1B4B73' : (p.destacado ? '#F0B900' : undefined),
                    borderWidth: (isCurrent || p.destacado) ? '2.5px' : '1.5px',
                    borderStyle: 'solid',
                  }}
                  className={`plan-card relative rounded-3xl p-6 sm:p-8 flex flex-col transition-all duration-300 ${
                    isCurrent
                      ? "plan-card--current shadow-lg shadow-[#1B4B73]/15"
                      : p.destacado
                        ? "plan-card--featured shadow-lg shadow-[#F0B900]/20"
                        : "shadow-sm hover:shadow-xl"
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 font-sans font-extrabold text-[11px] tracking-wider uppercase px-4 py-1 bg-[#1B4B73] text-white rounded-full shadow-md whitespace-nowrap z-10">
                      PLAN ACTUAL
                    </div>
                  )}
                  {!isCurrent && p.destacado && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 font-sans font-extrabold text-[11px] tracking-wider uppercase px-4 py-1 bg-[#F0B900] text-[#133857] rounded-full shadow-md whitespace-nowrap z-10">
                      RECOMENDADO
                    </div>
                  )}

                  <div className="space-y-0.5 mb-2">
                    <div className="font-display text-xl font-bold text-foreground leading-none">{p.nombre}</div>
                    <div className="flex flex-col pt-1">
                      <div className="text-3xl font-black text-primary leading-tight">
                        {formatRD(price)}
                        <span className="text-xs font-normal text-muted-foreground">{period}</span>
                      </div>
                      {billingPeriod === "yearly" && (
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="rounded-md bg-[#F0B900]/20 text-[#b88c00] dark:text-[#F0B900] border border-[#F0B900]/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                            🎁 2 MESES GRATIS
                          </span>
                          {savings > 0 && (
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">
                              (Ahorras {savings}% vs mensual)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2.5 mb-6 flex-1">
                    <div className="text-xs flex items-center gap-2.5 font-semibold text-slate-800 dark:text-slate-200">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-green-700 shrink-0">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                      <span>{p.limite_empleados} Empleados</span>
                    </div>
                    <div className="text-xs flex items-center gap-2.5 font-semibold text-slate-800 dark:text-slate-200">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-green-700 shrink-0">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                      <span>{p.limite_ordenes_mes ?? "∞"} Órdenes/facturas/mes</span>
                    </div>
                    {p.modulos?.whatsapp && (
                      <div className="text-xs flex items-center gap-2.5 font-semibold text-blue-600 dark:text-blue-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-green-700 shrink-0">
                          <circle cx="12" cy="12" r="10" />
                          <path d="m9 12 2 2 4-4" />
                        </svg>
                        <span>{p.limite_whatsapp_mes ? `${p.limite_whatsapp_mes.toLocaleString()} Mensajes WhatsApp/mes` : "Mensajes WhatsApp Ilimitados"}</span>
                      </div>
                    )}

                    <div className="border-t border-border/60 pt-3 mt-3 text-left">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Módulos Habilitados
                      </div>
                      <div className="space-y-2">
                        {[
                          { key: "whatsapp", label: "Mensajería WhatsApp", extra: "(Costo adicional)" },
                          { key: "facturacion_fiscal", label: "Facturación Electrónica", extra: "(Costo adicional)" },
                          { key: "multisucursal", label: "Multisucursal", extra: "(Costo adicional)" },
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
                                {key === "multisucursal" && v && (
                                  <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase tracking-wider ml-0.5">
                                    Hasta {1 + (p.limite_sucursales_adicionales || 0)}
                                  </span>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border-t border-border/40 pt-3 mt-3 space-y-2">
                      {[
                        "Clientes ilimitados",
                        "Generación de reportes",
                        "Actualizaciones de software",
                        "Cuentas x cobrar",
                        "Impresión A4/80mm"
                      ].map((feat) => (
                        <div key={feat} className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-400 shrink-0">
                            <circle cx="12" cy="12" r="10" />
                            <path d="m9 12 2 2 4-4" />
                          </svg>
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    type="button"
                    className={`plan-btn mt-auto ${
                      isCurrentActivePlan
                        ? "bg-[#1B4B73]/10 text-[#1B4B73] dark:bg-[#1B4B73]/20 dark:text-[#38bdf8] font-bold border-none shadow-none cursor-default"
                        : p.destacado
                          ? "plan-btn--yellow shadow-md"
                          : "plan-btn--outline"
                    }`}
                    disabled={isCurrentActivePlan}
                    onClick={() => { setSelectedPlan(p); setShowCheckout(true); }}
                  >
                    {isCurrentActivePlan ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Tu Plan Actual</span>
                      </>
                    ) : p.destacado ? (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Cambiar a {p.nombre}</span>
                      </>
                    ) : p.id === "enterprise" ? (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        <span>Cambiar a {p.nombre}</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight className="h-4 w-4" />
                        <span>Cambiar a {p.nombre}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* PLAN ESPECIAL (BARRA SUTIL INFERIOR) */}
          {plans.filter(p => !!p.es_especial).length > 0 && (
            <div className="mt-8 space-y-4">
              {plans.filter(p => !!p.es_especial).map((p) => {
                const tenantBillingPeriod = (tenant as any)?.plan_periodo || "monthly";
                const isCurrentPeriodMatch = billingPeriod === tenantBillingPeriod;
                const isCurrent = p.id === tenant.plan_id && isCurrentPeriodMatch;
                const isCurrentActivePlan = isCurrent && tenant.estado !== "TRIAL";

                const monthlyTotal = p.precio_mensual * 12;
                const annualPrice = p.precio_anual || monthlyTotal;
                const savings = monthlyTotal > annualPrice ? Math.round((1 - annualPrice / monthlyTotal) * 100) : 0;
                
                const price = billingPeriod === "monthly" ? p.precio_mensual : annualPrice;
                const period = billingPeriod === "monthly" ? "/mes" : "/año";
                const specialLabel = p.titulo_especial?.trim() || "Plan especial";

                return (
                  <div 
                    key={p.id}
                    style={{
                      borderColor: isCurrent ? '#1B4B73' : (p.destacado ? '#F0B900' : undefined),
                      borderWidth: (isCurrent || p.destacado) ? '2.5px' : '1.5px',
                      borderStyle: 'solid',
                    }}
                    className={`relative rounded-2xl p-4 sm:p-5 transition-all duration-300 ${
                      isCurrent
                        ? "plan-card--current bg-card shadow-lg shadow-[#1B4B73]/15"
                        : p.destacado
                          ? "plan-card--featured shadow-lg shadow-[#F0B900]/20"
                          : "bg-gradient-to-r from-slate-50/90 via-card to-sky-50/30 dark:from-slate-900/70 dark:via-slate-900/50 dark:to-sky-950/20 border-border/80 shadow-xs hover:shadow-sm"
                    }`}
                  >
                    {/* FILA SUPERIOR: INFORMACIÓN, PRECIO, LÍMITES Y BOTÓN CTA */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3.5 border-b border-border/60">
                      
                      {/* Información Principal & Precios */}
                      <div className="min-w-[200px]">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 mb-1">
                          <Sparkles className="h-3 w-3 text-sky-600 dark:text-sky-400 shrink-0" />
                          <span>{specialLabel}</span>
                          {isCurrent && (
                            <span className="ml-1 px-1 py-0.2 rounded bg-[#1B4B73] text-white text-[8.5px] font-black">ACTUAL</span>
                          )}
                        </div>
                        <h3 className="font-display text-xl font-bold text-foreground leading-tight">{p.nombre}</h3>
                        <div className="mt-0.5 flex items-baseline gap-1">
                          <span className="text-2xl font-black text-primary leading-tight">{formatRD(price)}</span>
                          <span className="text-[11px] font-medium text-muted-foreground">{period}</span>
                        </div>
                        {billingPeriod === "yearly" && (
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="rounded-md bg-[#F0B900]/20 text-[#b88c00] dark:text-[#F0B900] border border-[#F0B900]/40 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                              🎁 2 MESES GRATIS
                            </span>
                            {savings > 0 && (
                              <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">
                                (Ahorras {savings}%)
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Límites / Capacidades Clave */}
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

                      {/* Botón CTA */}
                      <div className="shrink-0 min-w-[170px] flex justify-end">
                        <button 
                          type="button"
                          className={`plan-btn w-full sm:w-auto h-9 px-5 text-xs font-bold shrink-0 ${
                            isCurrentActivePlan
                              ? "bg-[#1B4B73]/10 text-[#1B4B73] dark:bg-[#1B4B73]/20 dark:text-[#38bdf8] border-none shadow-none cursor-default"
                              : p.destacado
                                ? "plan-btn--yellow shadow-md"
                                : "plan-btn--outline bg-card hover:bg-muted/80 shadow-2xs"
                          }`}
                          disabled={isCurrentActivePlan}
                          onClick={() => { setSelectedPlan(p); setShowCheckout(true); }}
                        >
                          {isCurrentActivePlan ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>Tu Plan Actual</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>Cambiar a {p.nombre}</span>
                            </>
                          )}
                        </button>
                      </div>

                    </div>

                    {/* FILA INFERIOR: MÓDULOS HABILITADOS Y CARACTERÍSTICAS GENERALES */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 pt-3.5">
                      
                      {/* Desglose de Módulos Habilitados */}
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                          MÓDULOS HABILITADOS
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5">
                          {[
                            { key: "whatsapp", label: "Mensajería WhatsApp", extra: "(Costo adicional)" },
                            { key: "facturacion_fiscal", label: "Facturación Electrónica", extra: "(Costo adicional)" },
                            { key: "multisucursal", label: "Multisucursal", extra: "(Costo adicional)" },
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
                                  {key === "multisucursal" && v && (
                                    <span className="text-[8.5px] font-bold text-primary bg-primary/10 px-1 py-0.2 rounded uppercase tracking-wider ml-0.5">
                                      Hasta {1 + (p.limite_sucursales_adicionales || 0)}
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

          <SubscriptionModal 
            open={showCheckout} 
            onOpenChange={setShowCheckout} 
            plan={selectedPlan} 
            period={billingPeriod}
            bank={globalConfig?.bankDetails}
            tenant={tenant}
            onSuccess={() => { setShowCheckout(false); setShowSuccess(true); }}
          />

          <SuccessModal 
            open={showSuccess} 
            onOpenChange={setShowSuccess} 
            planName={selectedPlan?.nombre || ""} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExpandingTextarea({ value, onChange, placeholder, ...props }: any) {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      if (isFocused) {
        textareaRef.current.style.height = 'auto';
        const targetHeight = Math.max(170, Math.min(400, textareaRef.current.scrollHeight + 12));
        textareaRef.current.style.height = `${targetHeight}px`;
      } else {
        textareaRef.current.style.height = '68px';
      }
    }
  }, [value, isFocused]);

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-background focus-visible:ring-2 focus-visible:ring-[#1B4B73] focus:border-[#1B4B73] p-3.5 text-xs md:text-sm leading-relaxed transition-all duration-300 shadow-2xs resize-none"
      {...props}
    />
  );
}

function WhatsAppTab({ tenant, wa, saveWA, enabled, onTabChange }: { 
  tenant: Tenant; wa: WhatsAppConfig; saveWA: (w: Partial<WhatsAppConfig>) => void; enabled: boolean; onTabChange: (t: string) => void;
}) {
  const { data: plans = [] } = usePlans();
  const [draft, setDraft] = useState<WhatsAppConfig>(() => {
    const baseWa = { ...DEFAULT_CONFIG.whatsapp, ...wa };
    if (baseWa.base_url?.includes("wapisender")) {
      baseWa.base_url = "https://wasenderapi.com";
    }
    return {
      ...baseWa,
      plantilla_creada: wa.plantilla_creada || DEFAULT_CONFIG.whatsapp.plantilla_creada,
      plantilla_lista: wa.plantilla_lista || DEFAULT_CONFIG.whatsapp.plantilla_lista,
      plantilla_entregada: wa.plantilla_entregada || DEFAULT_CONFIG.whatsapp.plantilla_entregada,
      notif_orden_sin_retirar: wa.notif_orden_sin_retirar !== false,
      dias_recordatorio_sin_retirar: wa.dias_recordatorio_sin_retirar || 5,
      plantilla_sin_retirar: wa.plantilla_sin_retirar || DEFAULT_CONFIG.whatsapp.plantilla_sin_retirar,
    };
  });
  const [testPhone, setTestPhone] = useState(tenant.telefono || "");
  const [sending, setSending] = useState(false);

  async function probar() {
    setSending(true);
    saveWA(draft);
    const ordenDemo = {
      id: "demo", tenant_id: tenant.id, numero: "KL-202605-0003", cliente_id: "demo",
      empleado_id: "demo", servicios: [], 
      items: [
        { descripcion: "Body de bebé", cantidad: 1, precio_unitario: 70 },
        { descripcion: "Manta de bebé", cantidad: 1, precio_unitario: 140 },
        { descripcion: "Camisa manga corta", cantidad: 1, precio_unitario: 150 },
        { descripcion: "Camisa manga larga", cantidad: 1, precio_unitario: 180 }
      ], 
      subtotal: 540, itbis: 0, descuento: 0,
      total: 540, pagado: 540, saldo: 0, metodo_pago: "EFECTIVO", estado: "RECIBIDA",
      fecha_entrega: "11/5/2026",
      es_urgente: false,
      creado_en: new Date().toISOString(),
    } as any;
    const cliDemo = { 
      id: "demo", 
      tenant_id: tenant.id, 
      nombre: "Yeri", 
      telefono: testPhone, 
      direccion: "Los Arroyos Del Norte #51",
      tipo: "REGULAR", 
      limite_credito: 0, 
      creado_en: "" 
    } as any;
    const tenantDraft = { ...tenant, config: { ...(tenant.config || {}), whatsapp: draft } } as Tenant;
    const r = await notificarWhatsApp(tenantDraft, cliDemo, ordenDemo, "creada");
    setSending(false);
    if (r.ok) toast.success("Mensaje enviado ✓");
    else toast.error("Error: " + (r.reason || "desconocido"));
  }

  if (!enabled) {
    return (
      <div className="flex justify-center py-6">
        <Card className="w-full max-w-md p-8 border border-dashed border-primary/20 bg-primary/5 text-center rounded-3xl shadow-sm">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
            <MessageCircle className="h-8 w-8" />
          </div>
          <h3 className="font-display text-2xl mb-2 font-bold">Módulo de WhatsApp</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
            Envía avisos automáticos y fideliza a tus clientes. 
            Esta función está disponible solo en planes superiores.
          </p>
          <Button className="w-full rounded-xl font-bold h-11" onClick={() => onTabChange("plan")}>
            Ver planes disponibles
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <Card className={`${CARD} rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-card overflow-hidden animate-in fade-in duration-300`}>
      {/* Barra de progreso de uso */}
      {(() => {
        const waPlan = plans.find((p) => p.id === tenant?.plan_id) || getTenantPlan(tenant, plans);
        const waLimit = waPlan?.limite_whatsapp_mes ?? 0;
        const waSent = tenant?.whatsapp_sent_month || 0;
        
        if (waLimit <= 0) return null;

        const usageRatio = waSent / waLimit;

        return (
          <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-900/60 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex justify-between items-end mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Uso Mensual de WhatsApp</span>
                <span className="text-xs font-bold text-primary">
                  {waSent} / {waLimit.toLocaleString()}
                </span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    usageRatio > 0.9 ? 'bg-red-500' : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min(100, usageRatio * 100)}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {usageRatio > 0.8 && (
                <span className="text-[10px] bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-300 px-2 py-0.5 rounded font-bold animate-pulse">LÍMITE CERCA</span>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-[11px] rounded-xl font-bold border-primary/20 hover:bg-primary/5 cursor-pointer"
                onClick={() => onTabChange("plan")}
              >
                MEJORAR PLAN
              </Button>
            </div>
          </div>
        );
      })()}

      <div className="p-6 md:p-8 space-y-6">
        {/* Header Principal WhatsApp */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/70">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-xs">
              <svg className="h-5.5 w-5.5 fill-white" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.197 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.05 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-foreground leading-tight">
                Notificaciones por WhatsApp
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Envía avisos automáticos a tus clientes desde tu propio número con{" "}
                <a className="text-primary hover:underline font-semibold" href="https://wasenderapi.com/api-docs" target="_blank" rel="noreferrer">WASenderAPI</a>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-center">
            <span className="text-xs font-bold text-muted-foreground">Activar WhatsApp</span>
            <Switch checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
          </div>
        </div>

        {/* Campos de Conexión API */}
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="API Token (Personal Access Token)" icon={Key} span>
            <Input 
              className={`${FIELD} pl-10.5 rounded-xl border-slate-200 dark:border-slate-800`} 
              type="password" 
              placeholder="Tu token de wasenderapi.com" 
              value={draft.api_key} 
              onChange={(e) => setDraft({ ...draft, api_key: e.target.value })} 
            />
          </Field>
          <Field label="Session ID / Instance (Opcional)" hint="Solo si utilizas múltiples sesiones" icon={Smartphone}>
            <Input 
              className={`${FIELD} pl-10.5 rounded-xl border-slate-200 dark:border-slate-800`} 
              placeholder="default" 
              value={draft.instance} 
              onChange={(e) => setDraft({ ...draft, instance: e.target.value })} 
            />
          </Field>
          <Field label="Base URL (Servidor)" icon={Globe}>
            <Input 
              className={`${FIELD} pl-10.5 rounded-xl border-slate-200 dark:border-slate-800`} 
              placeholder="https://wasenderapi.com" 
              value={draft.base_url || ""} 
              onChange={(e) => setDraft({ ...draft, base_url: e.target.value })} 
            />
          </Field>
        </div>

        {/* Webhook Configuration for Incoming Messages */}
        <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">Enlace de Webhook para Mensajes Entrantes</h4>
              <p className="text-[11px] text-muted-foreground">Configura este enlace en tu panel de WASenderAPI para sincronizar respuestas y chat en vivo.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-background border border-border rounded-xl p-2 shadow-xs">
            <code className="flex-1 text-[11px] font-mono break-all text-slate-700 dark:text-slate-300 select-all leading-normal px-2">
              {`${import.meta.env.VITE_SUPABASE_URL || "https://lqtjwcphidbwiwrnqbac.supabase.co"}/functions/v1/whatsapp-webhook?tenant_id=${tenant.id}`}
            </code>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg shrink-0 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950 border-border cursor-pointer"
              onClick={() => {
                const urlStr = `${import.meta.env.VITE_SUPABASE_URL || "https://lqtjwcphidbwiwrnqbac.supabase.co"}/functions/v1/whatsapp-webhook?tenant_id=${tenant.id}`;
                navigator.clipboard.writeText(urlStr);
                toast.success("¡Enlace de Webhook copiado al portapapeles!");
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-normal font-medium">
            <strong>Instrucciones:</strong> En wasenderapi.com edita tu sesión, activa la opción <strong>Webhook</strong> y pega este enlace. Habilita los eventos <code className="bg-emerald-100 dark:bg-emerald-950/70 px-1 py-0.5 rounded font-mono text-[10px]">messages.received</code> o <code className="bg-emerald-100 dark:bg-emerald-950/70 px-1 py-0.5 rounded font-mono text-[10px]">messages.upsert</code>.
          </p>
        </div>

        {/* Eventos automáticos con IconBoxes */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <Label className="font-bold text-xs text-slate-700 dark:text-slate-200">Eventos de Notificación Automática</Label>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { k: "notif_orden_creada", label: "Al crear orden", desc: "Envía recibo digital", icon: PlusCircle },
              { k: "notif_orden_lista", label: "Cuando esté lista", desc: "Aviso de retiro", icon: Sparkles },
              { k: "notif_orden_entregada", label: "Al entregar orden", desc: "Agradecimiento", icon: CheckCircle2 },
              { k: "notif_orden_sin_retirar", label: "Prendas no retiradas", desc: "Recordatorio", icon: Clock },
            ].map((it) => (
              <div key={it.k} className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <it.icon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">{it.label}</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{it.desc}</p>
                  </div>
                </div>
                <Switch
                  checked={(draft as any)[it.k]}
                  onCheckedChange={(v) => setDraft({ ...draft, [it.k]: v } as WhatsAppConfig)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Plantillas de Textos con auto-expansión al hacer clic/foco */}
        <div className="space-y-4 pt-2">
          <Field label="Plantilla — Orden creada" hint="Variables: {lavanderia} {lavanderia_tel} {numero} {cliente} {total} {saldo} {entrega} {web_url}">
            <ExpandingTextarea 
              value={draft.plantilla_creada} 
              onChange={(e: any) => setDraft({ ...draft, plantilla_creada: e.target.value })} 
            />
          </Field>

          <Field label="Plantilla — Orden lista" hint="Variables: {lavanderia} {numero} {cliente} {total} {saldo} {web_url}">
            <ExpandingTextarea 
              value={draft.plantilla_lista} 
              onChange={(e: any) => setDraft({ ...draft, plantilla_lista: e.target.value })} 
            />
          </Field>

          <Field label="Plantilla — Orden entregada" hint="Variables: {lavanderia} {numero} {cliente}">
            <ExpandingTextarea 
              value={draft.plantilla_entregada} 
              onChange={(e: any) => setDraft({ ...draft, plantilla_entregada: e.target.value })} 
            />
          </Field>

          <Field label="Plantilla — Recordatorio prendas sin retirar" hint="Variables: {lavanderia} {numero} {cliente} {dias} {saldo}">
            <ExpandingTextarea 
              value={draft.plantilla_sin_retirar} 
              onChange={(e: any) => setDraft({ ...draft, plantilla_sin_retirar: e.target.value })} 
            />
          </Field>
        </div>

        {/* Footer: Pruebas y Guardar */}
        <div className="pt-6 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-full sm:w-56">
              <Field label="Probar al número" icon={Phone}>
                <Input 
                  className={`${FIELD} pl-10.5 rounded-xl border-slate-200 dark:border-slate-800`} 
                  value={testPhone} 
                  onChange={(e) => setTestPhone(formatPhoneRD(e.target.value))} 
                  placeholder="829-000-0000" 
                />
              </Field>
            </div>
            <Button 
              variant="outline" 
              className="h-10 rounded-xl font-bold border-border hover:bg-accent cursor-pointer gap-2 mt-6 shrink-0" 
              disabled={sending || !draft.api_key} 
              onClick={probar}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span>Enviar prueba</span>
            </Button>
          </div>

          <Button 
            className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-white font-bold h-10 px-6 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer gap-2 mt-2 sm:mt-0" 
            onClick={() => saveWA(draft)}
          >
            <Save className="h-4 w-4" />
            <span>Guardar cambios</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function PlanBadge({ id }: { id: string }) {
  const configs: any = {
    basico: { label: "Básico", className: "bg-blue-50 text-blue-700 border-blue-200" },
    pro: { label: "Pro", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    enterprise: { label: "Enterprise", className: "bg-amber-50 text-amber-700 border-amber-200" },
  };
  const config = configs[id] || { label: id, className: "" };
  return (
    <span className={`px-3 py-0.5 rounded-full uppercase text-[10px] font-bold tracking-widest border ${config.className}`}>
      {config.label}
    </span>
  );
}

function SubscriptionModal({ open, onOpenChange, plan, period, bank, tenant, onSuccess }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  plan: Plan | null;
  period: "monthly" | "yearly";
  bank?: BankDetails;
  tenant: Tenant;
  onSuccess: () => void;
}) {
  if (!plan) return null;

  const price = period === "monthly" ? plan.precio_mensual : (plan.precio_anual || plan.precio_mensual * 12 * 0.85);
  const polarUrl = period === "monthly" ? plan.polar_product_monthly_url : plan.polar_product_yearly_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] rounded-[1.5rem] border-none shadow-elegant p-0 overflow-hidden">
        <div className="bg-gradient-primary p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <CreditCard className="h-16 w-16 rotate-12" />
          </div>
          <div className="relative">
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-0.5">Pasarela de Pago Segura</div>
            <h2 className="text-2xl font-display leading-tight">Suscripción {plan.nombre}</h2>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold">{formatRD(price).replace("DOP", "RD$")}</span>
              <span className="text-xs opacity-70">/{period === "monthly" ? "mes" : "año"}</span>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4 bg-surface">
          <div className="grid grid-cols-1 gap-3">
            {/* OPCIÓN 1: TARJETA */}
            <button 
              onClick={() => {
                if (polarUrl) {
                  const checkoutUrl = new URL(polarUrl);
                  checkoutUrl.searchParams.set('customer_email', tenant.email);
                  window.open(checkoutUrl.toString(), "_blank");
                  toast.info("Esperando confirmación de pago...", {
                    description: "Una vez completado el pago en Polar, tu plan se activará automáticamente.",
                    duration: 6000
                  });
                } else {
                  toast.error("Enlace de pago no configurado para este plan.");
                }
              }}
              className="flex items-center gap-4 w-full p-4 rounded-2xl border-2 border-primary/10 bg-primary/5 hover:border-primary hover:bg-primary/10 transition-all text-left group relative overflow-hidden shadow-sm hover:shadow-md"
            >
              <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-base text-foreground mb-0.5">Pago con Tarjeta</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-tight font-medium">Débito o Crédito vía Polar.sh</div>
              </div>
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                <ArrowRight className="h-3 w-3 text-primary" />
              </div>
            </button>

            {/* OPCIÓN 2: TRANSFERENCIA */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex items-center gap-4 w-full p-4 rounded-2xl border-2 border-border bg-surface hover:border-primary/50 transition-all text-left group shadow-sm hover:shadow-md">
                  <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                    <Banknote className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-base text-foreground mb-0.5">Transferencia</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-tight font-medium">Pago directo a cuenta local</div>
                  </div>
                  <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                    <ArrowRight className="h-3 w-3 text-primary" />
                  </div>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-[2rem] border-none shadow-elegant max-w-[420px] p-0 overflow-hidden">
                <div className="p-8">
                  <AlertDialogHeader className="mb-6">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                      <Banknote className="h-6 w-6 text-primary" />
                    </div>
                    <AlertDialogTitle className="text-2xl font-display">Datos Bancarios</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm leading-relaxed">
                      Realiza la transferencia y envíanos el comprobante por WhatsApp para activar tu plan de inmediato.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  
                  {bank ? (
                    <div className="bg-accent/40 rounded-3xl p-6 space-y-5 border border-border/50 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Building2 className="h-20 w-20" />
                      </div>
                      <div className="space-y-1 relative">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Institución Bancaria</div>
                        <div className="font-bold text-lg flex items-center justify-between">
                          {bank.banco}
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={() => { navigator.clipboard.writeText(bank.banco); toast.success("Copiado"); }}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1 relative">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Número de Cuenta</div>
                        <div className="font-mono text-2xl font-bold flex items-center justify-between text-primary tracking-tighter">
                          {bank.numero_cuenta}
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={() => { navigator.clipboard.writeText(bank.numero_cuenta); toast.success("Copiado"); }}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6 relative">
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Tipo</div>
                          <div className="font-bold text-sm">{bank.tipo_cuenta}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">RNC / Cédula</div>
                          <div className="font-bold text-sm">{bank.rnc}</div>
                        </div>
                      </div>
                      <div className="space-y-1 border-t border-border/50 pt-4 relative">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Titular de la Cuenta</div>
                        <div className="font-bold text-sm uppercase tracking-wide">{bank.titular}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-accent/20 rounded-3xl border border-dashed border-border/50">
                      <p className="text-sm text-muted-foreground">Los datos bancarios no han sido configurados por el administrador.</p>
                    </div>
                  )}

                  <div className="grid gap-2 mt-6">
                    <Button 
                      className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl font-bold h-11 shadow-md shadow-[#25D366]/10 text-sm transition-transform active:scale-95"
                      onClick={() => {
                        const text = encodeURIComponent(`Hola Klynn, acabo de realizar la transferencia para el plan ${plan.nombre} (${tenant.nombre}). Aquí envío el comprobante.`);
                        window.open(`https://wa.me/18299416546?text=${text}`, "_blank");
                      }}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" /> ENVIAR COMPROBANTE
                    </Button>
                    <AlertDialogCancel className="w-full rounded-xl border-none bg-accent/50 h-10 font-bold text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">Cerrar</AlertDialogCancel>
                  </div>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <p className="text-center text-[10px] text-muted-foreground px-6 pb-6 leading-relaxed">
            Al suscribirte aceptas nuestros <Link to="/terminos" className="underline hover:text-primary">Términos de Servicio</Link> y <Link to="/privacidad" className="underline hover:text-primary">Políticas de Privacidad</Link>. 
            Los cargos se realizarán mensualmente de forma automática.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SuccessModal({ open, onOpenChange, planName }: { open: boolean; onOpenChange: (o: boolean) => void; planName: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] rounded-[2.5rem] border-none shadow-elegant text-center p-0 overflow-hidden bg-surface">
        <div className="h-32 bg-gradient-to-br from-success/20 via-success/5 to-transparent relative">
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="h-20 w-20 rounded-[2rem] bg-white shadow-xl flex items-center justify-center rotate-12 relative -bottom-10 border border-success/10">
                <CheckCircle2 className="h-10 w-10 text-success" />
             </div>
          </div>
        </div>
        
        <div className="p-10 pt-16 flex flex-col items-center">
          <h2 className="text-3xl font-display mb-3 text-foreground">¡Suscripción Activada!</h2>
          <p className="text-muted-foreground mb-8 text-sm leading-relaxed max-w-[280px]">
            Tu lavandería ahora tiene acceso total al plan <strong className="text-primary font-bold">{planName}</strong>. 
            ¡Prepárate para llevar tu negocio al siguiente nivel!
          </p>
          
          <div className="w-full p-5 bg-accent/30 rounded-3xl mb-10 border border-border/50 text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Nuevos beneficios</span>
            </div>
            <ul className="text-xs space-y-3 text-muted-foreground">
              <li className="flex items-center gap-3"><Star className="h-3 w-3 text-primary" /> Acceso ilimitado a reportes avanzados</li>
              <li className="flex items-center gap-3"><Star className="h-3 w-3 text-primary" /> Mayor capacidad de órdenes y empleados</li>
              <li className="flex items-center gap-3"><Star className="h-3 w-3 text-primary" /> Soporte VIP vía WhatsApp en minutos</li>
            </ul>
          </div>

          <Button 
            onClick={() => window.location.reload()} 
            className="w-full bg-gradient-primary text-white rounded-[1.5rem] h-16 font-bold text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95"
          >
            Comenzar Experiencia Premium
          </Button>
          
          <button 
            onClick={() => onOpenChange(false)}
            className="mt-6 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium underline underline-offset-4"
          >
            Cerrar esta ventana
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FiscalTab({ tenant, config, sequences, onRefresh, enabled, onTabChange, onTenantUpdate }: { 
  tenant: Tenant; 
  config?: ECFConfig | null; 
  sequences: ECFSequence[]; 
  onRefresh: () => void;
  enabled: boolean;
  onTabChange: (tab: string) => void;
  onTenantUpdate?: (t: Tenant) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [showNewSeq, setShowNewSeq] = useState(false);
  const [dialogMode, setDialogMode] = useState<'electronic' | 'traditional'>('electronic');
  const [deleteSeqId, setDeleteSeqId] = useState<string | null>(null);
  
  const cfg: TenantConfig = tenant.config || DEFAULT_CONFIG;

  // Local state for WhatsApp alert phone (saves on blur, not on every keystroke)
  const [alertPhone, setAlertPhone] = useState(cfg.alerta_ncf_telefono || "");
  useEffect(() => { setAlertPhone(cfg.alerta_ncf_telefono || ""); }, [cfg.alerta_ncf_telefono]);
  
  // Local state for instant and responsive tab switching
  const isCurrentlyElectronic = config ? !!config.is_active : (cfg.modo_facturacion === "electronica");
  const [isElectronic, setLocalIsElectronic] = useState(isCurrentlyElectronic);
  const isTouchedByUserRef = useRef(false);

  // Estados para anulación de secuencias e-NCF
  const [voidSeq, setVoidSeq] = useState<ECFSequence | null>(null);
  const [voidStart, setVoidStart] = useState("");
  const [voidEnd, setVoidEnd] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [certFileName, setCertFileName] = useState<string>("");

  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<Partial<ECFConfig>>(() => config ? {
    ...config,
    rnc_emisor: config.rnc_emisor || tenant.rnc || "",
    razon_social: config.razon_social || tenant.nombre || "",
    is_active: config.is_active ?? isCurrentlyElectronic,
  } : {
    tenant_id: tenant.id,
    rnc_emisor: tenant.rnc || "",
    razon_social: tenant.nombre,
    ambiente: "pruebas",
    is_active: isCurrentlyElectronic,
  });

  const [loadingRNC, setLoadingRNC] = useState(false);
  const lastSearchedRNCRef = useRef<string>("");

  async function handleSearchRNC(rncVal?: string, force = false) {
    const target = rncVal !== undefined ? rncVal : draft.rnc_emisor;
    const raw = (target || "").trim().toUpperCase();
    if (!raw) return;

    // Si estamos en ambiente de pruebas o el RNC empieza con SBX:
    if (draft.ambiente === 'pruebas' || raw.startsWith('SBX')) {
      const sandboxContrib = await consultarRNC(raw, 'pruebas');
      if (sandboxContrib) {
        setDraft((prev) => ({
          ...prev,
          rnc_emisor: sandboxContrib.rnc,
          razon_social: prev.razon_social || sandboxContrib.name,
        }));
        toast.success(`Modo Pruebas Sandbox: ${sandboxContrib.rnc} (${sandboxContrib.name})`, { id: "dgii-config-toast" });
        return;
      }
    }

    let clean = raw.replace(/\D/g, "");
    if (!clean || (clean.length !== 9 && clean.length !== 11)) return;

    if (!force && lastSearchedRNCRef.current === clean) return;
    lastSearchedRNCRef.current = clean;

    setLoadingRNC(true);
    try {
      const contrib = await consultarRNC(clean, 'produccion');
      if (contrib && contrib.name) {
        setDraft((prev) => ({
          ...prev,
          rnc_emisor: contrib.rnc || clean,
          razon_social: contrib.name,
        }));
        toast.success(`Contribuyente DGII: ${contrib.name} ✅`, { id: "dgii-config-toast" });
      } else {
        toast.error("No se encontró el contribuyente en DGII", { id: "dgii-config-toast" });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRNC(false);
    }
  }

  // Keep state synchronized when parent query finishes loading config (only if user hasn't toggled manually)
  useEffect(() => {
    if (isTouchedByUserRef.current) return;
    const active = config ? Boolean(config.is_active) : Boolean(tenant.config?.modo_facturacion === "electronica");
    setDraft((d) => ({
      ...d,
      ...(config || {}),
      rnc_emisor: config?.rnc_emisor || d.rnc_emisor || tenant.rnc || "",
      razon_social: config?.razon_social || d.razon_social || tenant.nombre || "",
      is_active: active,
    }));
    setLocalIsElectronic(active);
  }, [config?.id, config?.updated_at, config?.is_active, tenant.config?.modo_facturacion]);

  async function saveECF(overrideActive?: boolean) {
    setLoading(true);
    const activeValue = overrideActive !== undefined ? overrideActive : isElectronic;
    setLocalIsElectronic(activeValue);
    setDraft(d => ({ ...d, is_active: activeValue }));

    try {
      // 1. En pruebas, asegurar el formato SBX para el mock sandbox de Pronesoft.
      // En producción, limpiar a dígitos reales y validar obligatoriedad de Certificado Digital.
      let cleanRNC = (draft.rnc_emisor || tenant.rnc || '').trim().toUpperCase();
      if (draft.ambiente === 'pruebas') {
        if (!cleanRNC.startsWith('SBX')) {
          const digits = cleanRNC.replace(/\D/g, '') || '987654321';
          cleanRNC = `SBX${digits}`;
        }
      } else {
        cleanRNC = cleanRNC.replace(/\D/g, '');
      }

      // VALIDACIÓN ESTRICTA: El modo PRODUCCIÓN exige Certificado Digital y RNC real
      if (activeValue && draft.ambiente === 'produccion') {
        if (!cleanRNC || (cleanRNC.length !== 9 && cleanRNC.length !== 11)) {
          toast.error("Para operar en PRODUCCIÓN debes ingresar un RNC o Cédula oficial válido (9 u 11 dígitos).");
          setLoading(false);
          return;
        }

        const hasCert = !!(draft.certificate_data || config?.certificate_data);
        if (!hasCert) {
          toast.error("⚠️ En modo PRODUCCIÓN es obligatorio subir tu Certificado Digital (.p12 / .pfx) para la firma electrónica ante la DGII.", {
            duration: 6000,
          });
          setLoading(false);
          return;
        }

        const hasPassword = !!(draft.certificate_password || config?.certificate_password);
        if (!hasPassword) {
          toast.error("Debes ingresar la contraseña de tu Certificado Digital (.p12).", {
            duration: 5000,
          });
          setLoading(false);
          return;
        }
      }
      
      const configPayload: ECFConfig = {
        ...draft,
        usar_credenciales_propias: false,
        is_active: activeValue,
        rnc_emisor: cleanRNC,
        id: config?.id || crypto.randomUUID(),
        tenant_id: tenant.id,
        updated_at: new Date().toISOString(),
        created_at: config?.created_at || new Date().toISOString(),
      } as ECFConfig;

      // 1. Guardar la config electrónica en base de datos
      await saveECFConfig(configPayload);

      // 2. Si es electrónico y no está usando credenciales propias (Modalidad 1), auto-registrar en Pronesoft silenciosamente
      let pTenantId = draft.pronesoft_tenant_id || config?.pronesoft_tenant_id;
      if (activeValue && !draft.usar_credenciales_propias && (!pTenantId || pTenantId === 'sandbox-tenant')) {
        try {
          pTenantId = await registerTenantInPronesoft(tenant.id, configPayload);
        } catch (pronesoftErr: any) {
          console.warn("Aviso en registro Pronesoft:", pronesoftErr);
        }
      }

      // 3. Si hay un certificado nuevo para subir (Solo en producción, Sandbox no lo requiere)
      if (activeValue && draft.ambiente === 'produccion' && draft.certificate_data && (draft.certificate_password || config?.certificate_password)) {
        const certPass = draft.certificate_password || config?.certificate_password || "";
        await uploadCertificateToPronesoft(tenant.id, draft.certificate_data, certPass, configPayload);
      }

      // 4. IMPORTANTÍSIMO: Guardar también el RNC y el modo fiscal en el tenant
      const nextTenant = {
        ...tenant,
        rnc: cleanRNC,
        config: {
          ...cfg,
          modo_facturacion: activeValue ? "electronica" : "tradicional",
          ncf_facturacion_activa: activeValue ? true : false,
        },
      } as Tenant;
      await saveTenant(nextTenant);

      // 5. Inmediatamente actualizar el cache en memoria de React Query
      queryClient.setQueryData(["ecf-config", tenant.id], configPayload);
      queryClient.setQueryData(["ecf_config", tenant.id], configPayload);
      queryClient.setQueryData(["tenant", tenant.id], nextTenant);
      queryClient.setQueryData(["tenant", tenant.slug], nextTenant);

      // 6. Invalidar consultas
      await queryClient.invalidateQueries({ queryKey: ["ecf-config", tenant.id] });
      await queryClient.invalidateQueries({ queryKey: ["ecf_config", tenant.id] });
      await queryClient.invalidateQueries({ queryKey: ["tenant", tenant.id] });
      await queryClient.invalidateQueries({ queryKey: ["tenant", tenant.slug] });

      if (onTenantUpdate) {
        onTenantUpdate(nextTenant);
      }
      isTouchedByUserRef.current = false;
      toast.success(`Modo ${activeValue ? "Facturación Electrónica (e-CF)" : "Comprobantes Tradicionales (NCF)"} guardado correctamente`);
      onRefresh();
    } catch (err: any) {
      toast.error("Error al guardar: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateCfg(c: Partial<TenantConfig>) {
    const next: Tenant = { ...tenant, config: { ...cfg, ...c } } as Tenant;
    await saveTenant(next);
    toast.success("Ajustes fiscales actualizados");
  }

  async function testConnection() {
    setLoading(true);
    try {
      const activeAmbiente = draft.ambiente || config?.ambiente || 'pruebas';
      const proneSoftEnv = activeAmbiente === 'pruebas' ? 'sandbox' : 'production';
      const client = getProneSoftClient(
        draft.pronesoft_tenant_id || config?.pronesoft_tenant_id, 
        proneSoftEnv,
        draft.usar_credenciales_propias ? draft.pronesoft_client_id?.trim() : undefined,
        draft.usar_credenciales_propias ? draft.pronesoft_client_secret?.trim() : undefined
      );
      const res = await client.testConnection();
      if (res.ok) {
        toast.success("¡Conexión con Pronesoft exitosa! ✓");
      } else {
        toast.error("Error al conectar: " + (res?.message || "Credenciales inválidas"));
      }
    } catch (err: any) {
      toast.error("Error de conexión con Pronesoft: " + err.message);
    }
    setLoading(false);
  }

  // Quick mute / unmute toggle for sequences alerts
  async function toggleSequenceAlert(seq: ECFSequence) {
    try {
      const nextAlertState = seq.recibir_alertas === false ? true : false;
      await saveECFSequence({
        ...seq,
        recibir_alertas: nextAlertState
      });
      toast.success(nextAlertState ? "🔔 Alertas de WhatsApp activadas" : "🔕 Alertas silenciadas para esta secuencia");
      onRefresh();
    } catch (err: any) {
      toast.error("Error al actualizar alerta: " + err.message);
    }
  }

  async function deleteSequence(seqId: string) {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta secuencia fiscal? Esta acción no se puede deshacer y podría afectar la numeración de tus facturas si no configuras otra de inmediato.")) {
      return;
    }
    try {
      await deleteECFSequence(seqId);
      toast.success("Secuencia eliminada correctamente");
      onRefresh();
    } catch (err: any) {
      toast.error("Error al eliminar la secuencia: " + err.message);
    }
  }

  // Traditional NCF sequences
  const tradSequences = sequences.filter(s => s.tipo_ecf.startsWith('B') || s.prefijo === 'B');
  // Electronic e-CF sequences
  const elecSequences = sequences.filter(s => s.tipo_ecf.startsWith('E') || s.prefijo === 'E');

  if (!enabled) {
    return (
      <div className="flex justify-center py-6">
        <Card className="w-full max-w-md p-8 border border-dashed border-primary/20 bg-primary/5 text-center rounded-3xl shadow-sm">
          <Shield className="h-12 w-12 text-primary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-display mb-2 font-bold">Módulo Fiscal Avanzado</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
            La gestión de RNC, ITBIS y Comprobantes Fiscales (NCF/e-CF) requiere el plan **Enterprise**.
          </p>
          <Button className="rounded-xl font-bold h-11 px-6" onClick={() => onTabChange("plan")}>
            Mejorar Plan
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-6">
        {/* 1. Configuración de Impuestos (ITBIS) */}
        <Card className={`${CARD} rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-card p-6 md:p-8 space-y-6`}>
          <div className="flex items-center gap-3.5 pb-5 border-b border-border/70">
            <div className="h-11 w-11 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Banknote className="h-5.5 w-5.5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-foreground leading-tight">
                Configuración de Impuestos
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Define la tasa de ITBIS y la modalidad de desglose en órdenes.
              </p>
            </div>
          </div>
          
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="ITBIS (%)" icon={Percent}>
              <Input 
                className={`${FIELD} pl-10.5 rounded-xl border-slate-200 dark:border-slate-800`} 
                type="number" 
                value={cfg.itbis_porcentaje} 
                onChange={(e) => updateCfg({ itbis_porcentaje: Number(e.target.value) })} 
              />
            </Field>

            <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Receipt className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-foreground block">Precios incluyen ITBIS</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Desglosar internamente el impuesto del total.</p>
                </div>
              </div>
              <Switch checked={cfg.itbis_incluido} onCheckedChange={(v) => updateCfg({ itbis_incluido: v })} />
            </div>
          </div>
        </Card>

        {/* 2. Selector de Modo de Facturación */}
        <Card className={`${CARD} rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-card p-6 md:p-8 space-y-6`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                {isElectronic ? <Sparkles className="h-5.5 w-5.5" /> : <FileText className="h-5.5 w-5.5" />}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-display font-bold text-lg text-foreground leading-tight">Modo de Facturación</h3>
                  {isElectronic && (
                    <Button variant="ghost" size="sm" asChild className="h-6 text-[10px] bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-full font-bold">
                      <Link to={`/t/${tenant.slug}/fiscal-homologacion`}>
                        <ShieldCheck className="h-3 w-3 mr-1" /> Panel de Homologación
                      </Link>
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isElectronic 
                    ? "Facturación Electrónica (e-CF) conectada en tiempo real con DGII." 
                    : "Comprobantes Fiscales tradicionales (NCF) reportados por Oficina Virtual."}
                </p>
                {isElectronic && (
                  <button 
                    onClick={testConnection} 
                    disabled={loading}
                    className="mt-3 text-[10px] font-bold text-[#1B4B73] bg-[#1B4B73]/10 hover:bg-[#1B4B73]/20 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
                  >
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    PROBAR CONEXIÓN CON PRONESOFT
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs shrink-0">
              <button 
                type="button"
                onClick={() => {
                  isTouchedByUserRef.current = true;
                  setLocalIsElectronic(false);
                  setDraft(d => ({ ...d, is_active: false }));
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${!isElectronic ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                TRADICIONAL (NCF)
              </button>
              <button 
                type="button"
                onClick={() => {
                  isTouchedByUserRef.current = true;
                  setLocalIsElectronic(true);
                  setDraft(d => ({ ...d, is_active: true }));
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${isElectronic ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                ELECTRÓNICA (e-CF)
              </button>
            </div>
          </div>
        </Card>

        {/* 3. Contenido según el modo */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Columna Izquierda: Datos del Emisor y NCF/Certificado */}
          <div className="space-y-6">
            <Card className={`${CARD} rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-card p-6 md:p-8 space-y-6`}>
              <div className="flex items-center gap-3.5 pb-5 border-b border-border/70">
                <div className="h-11 w-11 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Building2 className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-foreground leading-tight">
                    Datos del Contribuyente
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Identificación fiscal y ambiente de transmisión.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Field label="RNC / Cédula" hint="Ingresa tu RNC para consultar y auto-completar los datos" icon={ShieldCheck}>
                  <div className="relative flex items-center w-full">
                    <Input 
                      className={`${FIELD} pl-10.5 pr-10 rounded-xl border-slate-200 dark:border-slate-800`} 
                      value={draft.rnc_emisor || ""} 
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setDraft({ ...draft, rnc_emisor: val });
                        const clean = val.replace(/\D/g, "");
                        if (clean.length === 9 || clean.length === 11) {
                          handleSearchRNC(clean);
                        }
                      }} 
                      onBlur={() => handleSearchRNC()}
                      placeholder="Ej: 133190907 o 402-..."
                    />
                    <button
                      type="button"
                      onClick={() => handleSearchRNC()}
                      disabled={loadingRNC}
                      className="absolute right-2.5 text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-lg cursor-pointer"
                      title="Buscar en DGII"
                    >
                      {loadingRNC ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Search className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>

                <Field label="Nombre o Razón Social" icon={Building2}>
                  <Input 
                    className={`${FIELD} pl-10.5 rounded-xl border-slate-200 dark:border-slate-800`} 
                    value={draft.razon_social || ""} 
                    onChange={(e) => setDraft({ ...draft, razon_social: e.target.value })} 
                  />
                </Field>
                
                {isElectronic && (
                  <Field label="Ambiente DGII" hint="Pruebas o Producción" icon={Server}>
                    <Select value={draft.ambiente} onValueChange={(v: any) => setDraft({ ...draft, ambiente: v })}>
                      <SelectTrigger className={`${FIELD} pl-10.5 rounded-xl border-slate-200 dark:border-slate-800 font-bold`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="w-[var(--radix-select-trigger-width)]">
                        <SelectItem value="pruebas" className="cursor-pointer font-bold">
                          PRUEBAS (SANDBOX)
                        </SelectItem>
                        <SelectItem value="produccion" className="cursor-pointer font-bold">
                          PRODUCCIÓN (EN VIVO)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                {/* Mostrar RNC en Ticket Switch */}
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Printer className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">Mostrar RNC en Ticket</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Imprimir el RNC en todos los recibos.</p>
                    </div>
                  </div>
                  <Switch checked={cfg.ticket_mostrar_rnc} onCheckedChange={(v) => updateCfg({ ticket_mostrar_rnc: v })} />
                </div>
                
                <Button 
                  className="w-full h-10 rounded-xl font-bold bg-primary hover:bg-primary/95 text-white shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer gap-2" 
                  onClick={() => saveECF(isElectronic)} 
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>Guardar Datos Fiscales</span>
                </Button>
              </div>
            </Card>

            {!isElectronic ? (
              <Card className={`${CARD} rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white border-none shadow-xl relative overflow-hidden p-6 md:p-8 space-y-4`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold font-display">Normativa Fiscal NCF</h3>
                </div>
                <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
                  <p>
                    Estás operando en el modo de <strong>Comprobantes Fiscales tradicionales (NCF)</strong> de la DGII.
                  </p>
                  <p>
                    En este modo, las facturas se emiten localmente y se reportan periódicamente a través de la Oficina Virtual.
                  </p>
                  <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 flex items-start gap-2.5">
                    <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>Administra todos tus rangos de comprobantes autorizados y activa alertas de agotamiento por WhatsApp.</span>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className={`${CARD} rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-card p-6 md:p-8 space-y-6`}>
                <div className="flex items-center gap-3.5 pb-5 border-b border-border/70">
                  <div className="h-11 w-11 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Key className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-foreground leading-tight">
                      Certificado Digital (.p12)
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Firma digital autorizada para e-CF.
                    </p>
                  </div>
                </div>

                {draft.ambiente === 'pruebas' ? (
                  <div className="p-4.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 dark:bg-emerald-950/20">
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                      <strong>No necesitas subir un certificado P12 real en pruebas.</strong><br/>
                      El entorno Sandbox genera la firma de pruebas internamente de forma automática.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {draft.certificate_data || config?.certificate_data ? (
                      <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/20">
                        <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-300 font-bold mb-1">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          <span>Certificado Digital Cargado</span>
                        </div>
                        <p className="text-xs text-emerald-800 dark:text-emerald-400 font-medium">
                          {certFileName ? `Archivo: ${certFileName}` : "Certificado P12 digital adjunto y listo para firmar."}
                        </p>
                      </div>
                    ) : (
                      <div className="p-4.5 rounded-2xl border-2 border-dashed border-rose-300 dark:border-rose-800/80 bg-rose-50/70 dark:bg-rose-950/20 text-center space-y-1.5">
                        <div className="flex items-center justify-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs uppercase tracking-wide">
                          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                          <span>Obligatorio en Modo Producción</span>
                        </div>
                        <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
                          La DGII exige un certificado de firma digital (<strong>.p12</strong> o <strong>.pfx</strong>). Sin este archivo no se puede guardar la configuración en Producción.
                        </p>
                      </div>
                    )}
                    <Field label="Contraseña del .p12" icon={Key}>
                      <Input 
                        type="password" 
                        className={`${FIELD} pl-10.5 rounded-xl border-slate-200 dark:border-slate-800`} 
                        value={draft.certificate_password || ""} 
                        onChange={(e) => setDraft({ ...draft, certificate_password: e.target.value })} 
                        placeholder="Contraseña de tu clave privada" 
                      />
                    </Field>
                    <input type="file" id="cert-upload" className="hidden" accept=".p12,.pfx" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCertFileName(file.name);
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const base64 = ev.target?.result?.toString().split(',')[1];
                          setDraft({ ...draft, certificate_data: base64 });
                          toast.success(`Certificado ${file.name} cargado correctamente ✅`, { id: "cert-upload-toast" });
                        };
                        reader.readAsDataURL(file);
                      }
                    }} />
                    <Button 
                      variant={draft.certificate_data || config?.certificate_data ? "outline" : "default"} 
                      className={`w-full h-10 rounded-xl font-bold cursor-pointer gap-2 ${!(draft.certificate_data || config?.certificate_data) ? "bg-[#1B4B73] hover:bg-[#1B4B73]/90 text-white shadow-md" : "border-border hover:bg-accent"}`} 
                      onClick={() => document.getElementById('cert-upload')?.click()}
                    >
                      <Upload className="h-4 w-4" /> 
                      <span>{draft.certificate_data || config?.certificate_data ? "Reemplazar Certificado (.p12)" : "Seleccionar y Subir Certificado (.p12 / .pfx)"}</span>
                    </Button>
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Columna Derecha: Alertas de WhatsApp y Listado de Secuencias */}
          <div className="space-y-6">
            
            {/* Alerta de Secuencias (WhatsApp notification number config) */}
            <Card className={`${CARD} rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-card p-6 md:p-8 space-y-6`}>
              <div className="flex items-center justify-between gap-4 pb-5 border-b border-border/70">
                <div className="flex items-center gap-3.5">
                  <div className="h-11 w-11 rounded-xl bg-[#25D366] flex items-center justify-center text-white shadow-xs shrink-0">
                    <svg className="h-5.5 w-5.5 fill-white" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.197 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.05 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base text-foreground leading-tight">Alerta de Secuencias</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Aviso por WhatsApp cuando las secuencias se agoten.</p>
                  </div>
                </div>
                
                {/* Botón de envío de prueba premium */}
                <button
                  onClick={async () => {
                    if (!alertPhone) {
                      toast.error("Por favor, ingresa un número de WhatsApp de alerta primero");
                      return;
                    }
                    const wa = cfg.whatsapp;
                    if (!wa?.api_key) {
                      toast.error("WhatsApp no está configurado en tu pestaña de WhatsApp");
                      return;
                    }
                    
                    const promise = (async () => {
                      const cleanPhone = alertPhone.replace(/\D/g, "");
                      const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
                      const base = (wa.base_url || "https://wasenderapi.com").replace(/\/$/, "");
                      const url = `${base}/api/send-message`;
                      
                      const res = await fetch(url, {
                        method: "POST",
                        headers: { 
                          "Content-Type": "application/json", 
                          "Authorization": `Bearer ${wa.api_key}`,
                          "Accept": "application/json"
                        },
                        body: JSON.stringify({ 
                          to: formattedPhone, 
                          text: `*🚨 ALERTA FISCAL: SECUENCIA PRÓXIMA A AGOTARSE*\n\nEstimado cliente, te informamos que la secuencia fiscal de tu negocio está a punto de agotarse:\n\n• *Tipo de NCF:* B02 - CONSUMIDOR FINAL\n• *Rango Restante:* 8 comprobantes disponibles (Límite configurado: 50)\n• *Último Emitido:* B0200000042\n• *Fecha de Vencimiento:* 31/12/2026\n\n*Recomendación:* Solicita un nuevo rango de comprobantes en la Oficina Virtual de la DGII de inmediato para evitar interrupciones en tu facturación.\n\n_Mensaje automático de prueba generado desde Klynn._`,
                          instance_id: wa.instance
                        }), 
                      });
                      
                      if (!res.ok) {
                        const data = await res.json().catch(() => ({}));
                        throw new Error(data.message || `HTTP ${res.status}`);
                      }
                    })();

                    toast.promise(promise, {
                      loading: "Enviando alerta de prueba...",
                      success: "¡Alerta de prueba enviada con éxito! ✓",
                      error: (err) => `Error al enviar: ${err.message}`
                    });
                  }}
                  className="px-3 h-8 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80 flex items-center gap-1.5 text-[11px] font-bold transition-all active:scale-95 shadow-xs cursor-pointer"
                  title="Enviar un mensaje de WhatsApp de prueba a este número"
                >
                  <Send className="h-3 w-3" />
                  PROBAR
                </button>
              </div>

              <div className="space-y-4">
                <Field label="Número de WhatsApp de Alerta" hint="Ingresa el número con el código de país (Ej: 18091234567)" icon={Phone}>
                  <Input 
                    className={`${FIELD} pl-10.5 rounded-xl border-slate-200 dark:border-slate-800`} 
                    placeholder="Ej: 18091234567" 
                    value={alertPhone} 
                    onChange={(e) => setAlertPhone(e.target.value)} 
                    onBlur={() => updateCfg({ alerta_ncf_telefono: alertPhone })}
                  />
                </Field>
              </div>
            </Card>

            {!isElectronic ? (
              // Traditional NCF Sequences manager
              <Card className={`${CARD} rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-card p-6 md:p-8 space-y-5`}>
                <div className="flex flex-wrap items-center justify-between gap-3.5 pb-4 border-b border-border/70">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold font-display tracking-tight text-foreground">Secuencias NCF</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Rangos tradicionales aprobados por la DGII.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input 
                      type="file" 
                      id="import-excel-traditional" 
                      className="hidden" 
                      accept=".xlsx,.xls" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = async (ev) => {
                            try {
                              const arrayBuffer = ev.target?.result as ArrayBuffer;
                              const XLSX = await import('xlsx');
                              const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                              const sheetName = workbook.SheetNames[0];
                              const worksheet = workbook.Sheets[sheetName];
                              const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

                              toast.info(`Procesando ${jsonData.length} filas del Excel de la DGII...`);
                              
                              let importedCount = 0;
                              for (const row of jsonData) {
                                // Mapeo de columnas DGII tolerante e insensible a mayúsculas
                                const rawTipo = row["Tipo"] || row["tipo"] || row["Tipo Comprobante"] || row["Tipo de Comprobante"] || row["CODI_COMI"];
                                const rawDesde = row["Desde"] || row["desde"] || row["Secuencia Inicial"] || row["Rango Inicial"] || row["Inicio"] || row["SECU_INIC"];
                                const rawHasta = row["Hasta"] || row["hasta"] || row["Secuencia Final"] || row["Rango Final"] || row["Fin"] || row["SECU_FINA"];
                                const rawActual = row["Actual"] || row["actual"] || row["Último Emitido"] || row["Último"] || row["Valor Actual"] || 0;
                                const rawVencimiento = row["Vencimiento"] || row["vencimiento"] || row["Fecha Vencimiento"] || row["Fecha de Vencimiento"] || row["Vence"] || row["FECH_VENC"];

                                if (rawTipo && rawDesde && rawHasta) {
                                  const tipo = String(rawTipo).trim().toUpperCase();
                                  if (tipo.startsWith('B')) {
                                    const seqId = crypto.randomUUID();
                                    await saveECFSequence({
                                      id: seqId,
                                      tenant_id: tenant.id,
                                      tipo_ecf: tipo,
                                      prefijo: 'B',
                                      valor_inicial: Number(rawDesde),
                                      valor_final: Number(rawHasta),
                                      valor_actual: Number(rawActual),
                                      expiration_date: rawVencimiento ? new Date(rawVencimiento).toISOString().split('T')[0] : undefined,
                                      is_active: true,
                                      recibir_alertas: false, // Desactivadas por defecto
                                      alerta_limite: 50
                                    });
                                    importedCount++;
                                  }
                                }
                              }
                              
                              if (importedCount > 0) {
                                toast.success(`Se importaron ${importedCount} secuencias NCF con éxito`);
                                onRefresh();
                              } else {
                                toast.warn("No se encontraron secuencias tradicionales válidas (que inicien con 'B') en el archivo.");
                              }
                            } catch (err: any) {
                              toast.error("Error al leer Excel: " + err.message);
                            }
                          };
                          reader.readAsArrayBuffer(file);
                        }
                      }} 
                    />
                    <Button 
                      variant="outline"
                      size="sm" 
                      className="h-8 rounded-xl border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100/70 hover:text-emerald-800 text-[11px] font-bold px-3 shadow-xs transition-all active:scale-95 duration-200 cursor-pointer"
                      onClick={() => document.getElementById('import-excel-traditional')?.click()}
                    >
                      <Upload className="h-3 w-3 mr-1 stroke-[2.5]" /> Importar
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm" 
                      className="h-8 rounded-xl border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary text-[11px] font-bold px-3 shadow-xs transition-all active:scale-95 duration-200 cursor-pointer" 
                      onClick={() => {
                        setDialogMode('traditional');
                        setShowNewSeq(true);
                      }}
                    >
                      <PlusCircle className="h-3 w-3 mr-1 stroke-[2.5]" /> Añadir
                    </Button>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {tradSequences.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground text-xs border border-dashed rounded-xl">No hay secuencias NCF tradicionales creadas.</div>
                  ) : (
                    tradSequences.map(seq => {
                      const isCorrupted = seq.valor_actual > 999999999 || seq.valor_actual > seq.valor_final;
                      const currentVal = isCorrupted ? 0 : seq.valor_actual;
                      const rawRemaining = seq.valor_final - currentVal;
                      const remaining = Math.max(0, rawRemaining);
                      const threshold = seq.alerta_limite ?? 50;
                      const isLow = remaining <= threshold || isCorrupted;
                      const hasAlertEnabled = seq.recibir_alertas !== false;

                      const formattedCurrent = String(currentVal).padStart(8, '0');
                      const codeDisplay = seq.tipo_ecf.startsWith('B') 
                        ? `${seq.tipo_ecf}${formattedCurrent}` 
                        : `${seq.prefijo}${seq.tipo_ecf}${formattedCurrent}`;

                      return (
                        <div key={seq.id} className="p-3.5 border rounded-2xl flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all bg-card border-slate-200/80 dark:border-slate-800 shadow-2xs">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold font-mono flex items-center gap-1.5 flex-wrap">
                              <span className="text-primary truncate">{seq.tipo_ecf}{NCF_NOMBRES[seq.tipo_ecf] ? ` - ${NCF_NOMBRES[seq.tipo_ecf]}` : ''}</span>
                              <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-[9px] px-1.5 py-0 h-4 border-none shrink-0 font-bold">NCF</Badge>
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono mt-0.5 font-bold tracking-tight">
                              {codeDisplay}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className={`text-xs font-bold ${isLow ? 'text-red-500 font-extrabold' : 'text-emerald-600'}`}>
                                {remaining === 0 ? '0 disp.' : `${remaining} disp.`}
                              </div>
                              <div className="text-[9px] text-muted-foreground font-sans">
                                Alerta: {threshold}
                              </div>
                            </div>
                            
                            {/* Actions Group (Bell and Trash) */}
                            <div className="flex items-center gap-1.5">
                              {/* Quick Mute Bell Toggle Button */}
                              <button 
                                onClick={() => toggleSequenceAlert(seq)}
                                className={`h-8 w-8 rounded-xl border flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
                                  hasAlertEnabled 
                                    ? 'bg-primary/10 border-primary/20 text-primary shadow-xs hover:bg-primary/20' 
                                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700'
                                }`}
                                title={hasAlertEnabled ? "Alertas de WhatsApp activadas. Clic para silenciar." : "Alertas desactivadas. Clic para activar."}
                              >
                                {hasAlertEnabled ? <Bell className="h-3.5 w-3.5 animate-pulse" /> : <BellOff className="h-3.5 w-3.5 opacity-60" />}
                              </button>

                              {/* Trash/Delete Sequence Button */}
                              <button 
                                onClick={() => setDeleteSeqId(seq.id)}
                                className="h-8 w-8 rounded-xl border border-red-100 dark:border-red-900/30 bg-white dark:bg-slate-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 flex items-center justify-center transition-all active:scale-90 shadow-xs cursor-pointer"
                                title="Eliminar esta secuencia permanentemente"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            ) : (
              // Electronic sequences card
              <Card className={`${CARD} rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-card p-6 md:p-8 space-y-5`}>
                <div className="flex flex-wrap items-center justify-between gap-3.5 pb-4 border-b border-border/70">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold font-display tracking-tight text-foreground">Secuencias e-NCF</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Rangos e-CF autorizados por la DGII.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input 
                      type="file" 
                      id="import-excel" 
                      className="hidden" 
                      accept=".xlsx,.xls" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = async (ev) => {
                            const base64 = ev.target?.result?.toString().split(',')[1];
                            if (base64) {
                              toast.promise(importSequencesToPronesoft(tenant.id, base64), {
                                loading: "Importando secuencias desde Excel...",
                                success: () => {
                                  onRefresh();
                                  return "Secuencias importadas correctamente";
                                },
                                error: (err) => "Error al importar: " + err.message
                              });
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }} 
                    />
                    <Button 
                      variant="outline"
                      size="sm" 
                      className="h-8 rounded-xl border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100/70 hover:text-blue-800 text-[11px] font-bold px-3 shadow-xs transition-all active:scale-95 duration-200 cursor-pointer"
                      onClick={async () => {
                        try {
                          toast.info("Consultando secuencias en Pronesoft...");
                          const res = await listSequencesPronesoft(tenant.id);
                          const items = res?.data || res;
                          if (Array.isArray(items) && items.length > 0) {
                            let count = 0;
                            for (const item of items) {
                              const itemType = item.invoiceType || item.type || "E32";
                              const formattedType = itemType.startsWith("E") ? itemType : `E${itemType}`;
                              const existing = sequences.find(s => s.tipo_ecf === formattedType);
                              await saveECFSequence({
                                id: existing?.id || crypto.randomUUID(),
                                tenant_id: tenant.id,
                                tipo_ecf: formattedType,
                                prefijo: 'E',
                                valor_inicial: item.fromNumber || item.from || 1,
                                valor_final: item.toNumber || item.to || 100,
                                valor_actual: item.currentNumber || item.current || 0,
                                expiration_date: item.expirationDate || item.expiration || undefined,
                                is_active: true,
                                recibir_alertas: existing?.recibir_alertas ?? false,
                                alerta_limite: existing?.alerta_limite ?? 50
                              });
                              count++;
                            }
                            toast.success(`Se sincronizaron ${count} secuencias desde Pronesoft ✓`);
                            onRefresh();
                          } else {
                            toast.info("Secuencias sincronizadas con Pronesoft");
                          }
                        } catch (e: any) {
                          toast.info("Secuencias locales al día con el servidor fiscal");
                        }
                      }}
                    >
                      <RefreshCw className="h-3 w-3 mr-1 stroke-[2.5]" /> Sincronizar
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm" 
                      className="h-8 rounded-xl border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100/70 hover:text-emerald-800 text-[11px] font-bold px-3 shadow-xs transition-all active:scale-95 duration-200 cursor-pointer"
                      onClick={() => document.getElementById('import-excel')?.click()}
                    >
                      <Upload className="h-3 w-3 mr-1 stroke-[2.5]" /> Importar
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm" 
                      className="h-8 rounded-xl border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary text-[11px] font-bold px-3 shadow-xs transition-all active:scale-95 duration-200 cursor-pointer" 
                      onClick={() => {
                        setDialogMode('electronic');
                        setShowNewSeq(true);
                      }}
                    >
                      <PlusCircle className="h-3 w-3 mr-1 stroke-[2.5]" /> Añadir
                    </Button>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {elecSequences.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground text-xs border border-dashed rounded-xl">No hay secuencias e-CF creadas.</div>
                  ) : (
                    elecSequences.map(seq => {
                      const isCorrupted = seq.valor_actual > 999999999 || seq.valor_actual > seq.valor_final;
                      const currentVal = isCorrupted ? 0 : seq.valor_actual;
                      const rawRemaining = seq.valor_final - currentVal;
                      const remaining = Math.max(0, rawRemaining);
                      const threshold = seq.alerta_limite ?? 50;
                      const isLow = remaining <= threshold || isCorrupted;
                      const hasAlertEnabled = seq.recibir_alertas !== false;

                      const formattedCurrent = String(currentVal).padStart(seq.tipo_ecf.startsWith('E') ? 10 : 8, '0');
                      const codeDisplay = seq.tipo_ecf.startsWith('E') || seq.tipo_ecf.startsWith('B') 
                        ? `${seq.tipo_ecf}${formattedCurrent}` 
                        : `${seq.prefijo}${seq.tipo_ecf}${formattedCurrent}`;

                      return (
                        <div key={seq.id} className="p-3.5 border rounded-2xl flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all bg-card border-slate-200/80 dark:border-slate-800 shadow-2xs">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold font-mono flex items-center gap-1.5 flex-wrap">
                              <span className="text-primary truncate">{seq.tipo_ecf}{NCF_NOMBRES[seq.tipo_ecf] ? ` - ${NCF_NOMBRES[seq.tipo_ecf]}` : ''}</span>
                              <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 text-[9px] px-1.5 py-0 h-4 border-none shrink-0 font-bold">e-CF</Badge>
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono mt-0.5 font-bold tracking-tight">
                              {codeDisplay}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className={`text-xs font-bold ${isLow ? 'text-red-500 font-extrabold' : 'text-emerald-600'}`}>
                                {remaining === 0 ? '0 disp.' : `${remaining} disp.`}
                              </div>
                              <div className="text-[9px] text-muted-foreground font-sans">
                                Alerta: {threshold}
                              </div>
                            </div>
                            
                            {/* Actions Group (Bell and Trash) */}
                            <div className="flex items-center gap-1">
                              {/* Quick Mute Bell Toggle Button */}
                              <button 
                                onClick={() => toggleSequenceAlert(seq)}
                                className={`h-7.5 w-7.5 rounded-lg border flex items-center justify-center transition-all active:scale-90 ${
                                  hasAlertEnabled 
                                    ? 'bg-primary/10 border-primary/20 text-primary shadow-xs hover:bg-primary/20' 
                                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                                }`}
                                title={hasAlertEnabled ? "Alertas de WhatsApp activadas. Clic para silenciar." : "Alertas desactivadas. Clic para activar."}
                              >
                                {hasAlertEnabled ? <Bell className="h-3.5 w-3.5 animate-pulse" /> : <BellOff className="h-3.5 w-3.5 opacity-60" />}
                              </button>

                              {/* Void Sequence Button (Only for Electronic) */}
                              <button 
                                onClick={() => setVoidSeq(seq)}
                                className="h-7.5 w-7.5 rounded-lg border border-red-100 bg-white text-red-500 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-all active:scale-90 shadow-xs"
                                title="Anular secuencia en DGII"
                              >
                                <Ban className="h-3.5 w-3.5" />
                              </button>

                              {/* Trash/Delete Sequence Button */}
                              <button 
                                onClick={() => setDeleteSeqId(seq.id)}
                                className="h-7.5 w-7.5 rounded-lg border border-red-100 bg-white text-red-500 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-all active:scale-90 shadow-xs"
                                title="Eliminar esta secuencia permanentemente"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!voidSeq} onOpenChange={(o) => !o && setVoidSeq(null)}>
        <DialogContent className="rounded-[2rem] border-none shadow-elegant max-w-[420px] p-0 overflow-hidden bg-background">
          <div className="p-8">
            <DialogHeader className="mb-6">
              <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4 text-red-500">
                <Ban className="h-6 w-6" />
              </div>
              <DialogTitle className="text-2xl font-display text-slate-900">Anular Rango e-NCF</DialogTitle>
              <DialogDescription className="text-xs leading-relaxed text-slate-500 font-sans mt-2">
                Esta acción notificará permanentemente a la DGII que el rango seleccionado de comprobantes tipo <strong className="text-slate-800">{voidSeq?.tipo_ecf}</strong> no fue ni será utilizado.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mb-8">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Rango Inicial">
                  <Input 
                    className={FIELD} 
                    value={voidStart}
                    onChange={(e) => setVoidStart(e.target.value)}
                    placeholder={`Ej. ${voidSeq?.prefijo || 'E'}${voidSeq?.tipo_ecf || '32'}00000040`}
                  />
                </Field>
                <Field label="Rango Final">
                  <Input 
                    className={FIELD} 
                    value={voidEnd}
                    onChange={(e) => setVoidEnd(e.target.value)}
                    placeholder={`Ej. ${voidSeq?.prefijo || 'E'}${voidSeq?.tipo_ecf || '32'}00000045`}
                  />
                </Field>
              </div>
              <Field label="Motivo de Anulación DGII">
                <Input 
                  className={FIELD} 
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Ej. Salto de secuencia por error técnico"
                />
              </Field>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setVoidSeq(null)} className="rounded-xl border-none bg-slate-100 hover:bg-slate-200 h-10 font-bold text-sm text-slate-700 px-5 transition-all">
                Cancelar
              </Button>
              <Button 
                disabled={!voidStart || !voidEnd || !voidReason}
                className="rounded-xl bg-red-500 hover:bg-red-600 h-10 font-bold text-sm px-6 transition-all active:scale-95 text-white"
                onClick={async () => {
                  if(!voidSeq) return;
                  toast.promise(
                    anularSecuenciasPronesoft(tenant.id, voidSeq.tipo_ecf.replace('E', ''), voidStart, voidEnd, voidReason),
                    {
                      loading: 'Enviando anulación a DGII...',
                      success: () => {
                        // Extraer el número final limpliando prefijo E32 (ej. E320000000045 -> 45)
                        const rawEndStr = voidEnd.startsWith(voidSeq.tipo_ecf) 
                          ? voidEnd.substring(voidSeq.tipo_ecf.length) 
                          : voidEnd.replace(/^[A-Z]+\d{2}/, '').replace(/\D/g, '');
                        const parsedEndNum = parseInt(rawEndStr, 10);
                        
                        // Si el rango anulado alcanza o supera el valor actual local,
                        // adelantamos el contador local para que la próxima factura no falle
                        if (!isNaN(parsedEndNum) && parsedEndNum >= voidSeq.valor_actual) {
                          saveECFSequence({
                            ...voidSeq,
                            valor_actual: parsedEndNum
                          }).then(() => {
                            queryClient.invalidateQueries({ queryKey: ['ecf-sequences', tenant.id] });
                          });
                        }

                        setVoidSeq(null);
                        setVoidStart("");
                        setVoidEnd("");
                        setVoidReason("");
                        return "Secuencias anuladas en DGII con éxito";
                      },
                      error: (err) => `Error al anular: ${err.message}`
                    }
                  )
                }}
              >
                Confirmar Anulación
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteSeqId} onOpenChange={(o) => !o && setDeleteSeqId(null)}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-elegant max-w-[420px] p-0 overflow-hidden bg-background">
          <div className="p-8">
            <AlertDialogHeader className="mb-6">
              <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4 text-red-500">
                <Trash2 className="h-6 w-6" />
              </div>
              <AlertDialogTitle className="text-2xl font-display text-slate-900">¿Eliminar secuencia?</AlertDialogTitle>
              <AlertDialogDescription className="text-xs leading-relaxed text-slate-500 font-sans mt-2">
                Esta acción no se puede deshacer y podría afectar la numeración de tus facturas si no configuras otra de inmediato.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel onClick={() => setDeleteSeqId(null)} className="rounded-xl border-none bg-slate-100 hover:bg-slate-200 h-9.5 font-bold text-[11px] text-slate-700 px-4 transition-all">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={async () => {
                  if (deleteSeqId) {
                    try {
                      await deleteECFSequence(deleteSeqId);
                      toast.success("Secuencia eliminada correctamente");
                      onRefresh();
                    } catch (err: any) {
                      toast.error("Error al eliminar la secuencia: " + err.message);
                    } finally {
                      setDeleteSeqId(null);
                    }
                  }
                }}
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white h-9.5 font-bold text-[11px] px-5 shadow-md shadow-red-600/10 transition-all"
              >
                Eliminar Secuencia
              </AlertDialogAction>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <NewSequenceDialog open={showNewSeq} onOpenChange={setShowNewSeq} tenantId={tenant.id} onCreated={onRefresh} mode={dialogMode} sequences={sequences} />
    </div>
  );
}

function NewSequenceDialog({ open, onOpenChange, tenantId, onCreated, mode = 'electronic', sequences = [] }: {
  open: boolean; onOpenChange: (o: boolean) => void; tenantId: string; onCreated: () => void; mode?: 'electronic' | 'traditional'; sequences?: ECFSequence[];
}) {
  const [loading, setLoading] = useState(false);
  const [seq, setSeq] = useState<Partial<ECFSequence>>({
    tenant_id: tenantId,
    tipo_ecf: mode === 'traditional' ? "B02" : "E32",
    prefijo: mode === 'traditional' ? "B" : "E",
    valor_inicial: 1,
    valor_final: 100,
    valor_actual: 0,
    expiration_date: "",
    is_active: true,
    recibir_alertas: false, // Notification alerts disabled by default
    alerta_limite: 50
  });

  // Sync mode changes to reset initial state appropriately when modal triggers
  useEffect(() => {
    if (open) {
      setSeq({
        tenant_id: tenantId,
        tipo_ecf: mode === 'traditional' ? "B02" : "E32",
        prefijo: mode === 'traditional' ? "B" : "E",
        valor_inicial: 1,
        valor_final: 100,
        valor_actual: 0,
        expiration_date: "",
        is_active: true,
        recibir_alertas: false,
        alerta_limite: 50
      });
    }
  }, [open, mode, tenantId]);

  async function save() {
    setLoading(true);
    try {
      const tipo = seq.tipo_ecf || (mode === 'traditional' ? 'B02' : 'E32');
      const existing = sequences.find(s => s.tipo_ecf === tipo);

      if (existing) {
        await deleteECFSequence(existing.id);
      }

      // Si es electrónica, intentamos registrar la secuencia en Pronesoft vía API
      if (mode === 'electronic') {
        try {
          await createSequencePronesoft(tenantId, {
            type: tipo,
            from: Number(seq.valor_inicial || 1),
            to: Number(seq.valor_final || 100),
            expiration: seq.expiration_date || undefined
          });
        } catch (proneErr: any) {
          console.warn("Aviso al registrar secuencia en Pronesoft:", proneErr.message);
          // Si Pronesoft devuelve un aviso (p.ej. ya existe), continuamos para guardar localmente
        }
      }

      await saveECFSequence({
        ...seq,
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        tipo_ecf: tipo,
        prefijo: mode === 'traditional' ? 'B' : 'E'
      } as ECFSequence);

      toast.success("Secuencia creada con éxito");
      onCreated();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-12 h-full">
          {/* Columna Izquierda Ilustrativa Premium (Gradient and Glow Split) */}
          <div className="md:col-span-5 bg-gradient-to-br from-primary via-primary/95 to-slate-900 text-white p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/20 rounded-full blur-xl pointer-events-none" />
            
            <div className="space-y-6 relative z-10">
              <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/10">
                <Sparkles className="h-5 w-5 text-white animate-pulse" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-bold font-display tracking-tight">Autorización DGII</h4>
                <p className="text-xs text-white/80 leading-relaxed font-sans">
                  Configura tus comprobantes fiscales {mode === 'traditional' ? 'Tradicionales (NCF)' : 'Electrónicos (e-CF)'} de acuerdo con la resolución aprobada por la DGII.
                </p>
              </div>
              
              <div className="space-y-3.5 pt-2">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-bold">1</div>
                  <span className="text-[11px] text-white/90 font-sans">Prefijo {mode === 'traditional' ? '"B" para NCF' : '"E" para e-CF'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-bold">2</div>
                  <span className="text-[11px] text-white/90 font-sans">Establece el rango desde/hasta</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-bold">3</div>
                  <span className="text-[11px] text-white/90 font-sans">Define alertas de bajo inventario</span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 relative z-10 pt-4 border-t border-white/10 flex items-center gap-3 text-xs text-white/70">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="font-sans">Conexión cifrada y segura</span>
            </div>
          </div>

          {/* Columna Derecha de Entrada */}
          <div className="md:col-span-7 p-5 bg-background flex flex-col justify-between">
            <div>
              <DialogHeader className="mb-3">
                <DialogTitle className="text-xl font-display">{mode === 'traditional' ? "Nueva Secuencia NCF" : "Nueva Secuencia e-CF"}</DialogTitle>
                <DialogDescription className="text-xs">Establece los rangos de comprobantes autorizados.</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-3">
                <Field label="Tipo de Comprobante">
                  <Select value={seq.tipo_ecf} onValueChange={(v) => setSeq({ ...seq, tipo_ecf: v })}>
                    <SelectTrigger className="w-full h-10 rounded-lg"><SelectValue /></SelectTrigger>
                    {/* Fixed sideways expansion using popper position & strict width anchoring */}
                    <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
                      {mode === 'traditional' ? (
                        <>
                          <SelectItem value="B01">B01 - CRÉDITO FISCAL</SelectItem>
                          <SelectItem value="B02">B02 - CONSUMIDOR FINAL</SelectItem>
                          <SelectItem value="B03">B03 - NOTA DE DÉBITO</SelectItem>
                          <SelectItem value="B04">B04 - NOTA DE CRÉDITO</SelectItem>
                          <SelectItem value="B11">B11 - COMPRAS</SelectItem>
                          <SelectItem value="B13">B13 - GASTOS MENORES</SelectItem>
                          <SelectItem value="B14">B14 - REGÍMENES ESPECIALES</SelectItem>
                          <SelectItem value="B15">B15 - GUBERNAMENTAL</SelectItem>
                          <SelectItem value="B16">B16 - EXPORTACIONES</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="E31">E31 - CRÉDITO FISCAL</SelectItem>
                          <SelectItem value="E32">E32 - CONSUMIDOR FINAL</SelectItem>
                          <SelectItem value="E33">E33 - NOTA DE DÉBITO</SelectItem>
                          <SelectItem value="E34">E34 - NOTA DE CRÉDITO</SelectItem>
                          <SelectItem value="E41">E41 - COMPRAS</SelectItem>
                          <SelectItem value="E43">E43 - GASTOS MENORES</SelectItem>
                          <SelectItem value="E44">E44 - REGÍMENES ESPECIALES</SelectItem>
                          <SelectItem value="E45">E45 - GUBERNAMENTAL</SelectItem>
                          <SelectItem value="E46">E46 - EXPORTACIONES</SelectItem>
                          <SelectItem value="E47">E47 - PAGOS AL EXTERIOR</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </Field>

                {(() => {
                  const tipo = seq.tipo_ecf;
                  const existing = sequences.find(s => s.tipo_ecf === tipo);
                  if (existing) {
                    const remaining = existing.valor_final - existing.valor_actual;
                    return (
                      <div className={`p-3 rounded-xl border text-[10px] font-sans leading-relaxed transition-all ${
                        remaining <= 0 
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                          : 'bg-amber-50 border-amber-100 text-amber-700'
                      }`}>
                        {remaining <= 0 ? (
                          <span>✓ La secuencia anterior de tipo <strong>{tipo}</strong> está agotada. Se eliminará automáticamente al crear esta nueva.</span>
                        ) : (
                          <span>⚠️ Ya tienes una secuencia activa para <strong>{tipo}</strong> con <strong>{remaining}</strong> comprobantes disponibles. Al guardar, se reemplazará automáticamente por esta nueva.</span>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
                
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Desde">
                    <Input type="number" className="h-10 rounded-lg" value={seq.valor_inicial} onChange={(e) => setSeq({ ...seq, valor_inicial: Number(e.target.value) })} />
                  </Field>
                  <Field label="Hasta">
                    <Input type="number" className="h-10 rounded-lg" value={seq.valor_final} onChange={(e) => setSeq({ ...seq, valor_final: Number(e.target.value) })} />
                  </Field>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Valor Actual (Último emitido)">
                    <Input type="number" className="h-10 rounded-lg" value={seq.valor_actual} onChange={(e) => setSeq({ ...seq, valor_actual: Number(e.target.value) })} />
                  </Field>
                  
                  <Field label="Fecha de Vencimiento">
                    <Input type="date" className="h-10 rounded-lg" value={seq.expiration_date} onChange={(e) => setSeq({ ...seq, expiration_date: e.target.value })} />
                  </Field>
                </div>

                {/* Recibir Alertas toggle - defaults to unchecked (false) */}
                <div className="p-3.5 rounded-2xl border bg-accent/5 flex items-center justify-between gap-4 mt-2">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                      <Bell className="h-4 w-4 text-primary animate-pulse" /> Recibir alertas
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">Aviso de WhatsApp por secuencia</div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={seq.recibir_alertas === true} 
                    onChange={(e) => setSeq({ ...seq, recibir_alertas: e.target.checked })} 
                    className="h-5 w-5 accent-primary cursor-pointer rounded-lg border-gray-300"
                  />
                </div>

                {/* Conditional threshold input if alerts are checked */}
                {seq.recibir_alertas === true && (
                  <Field label="Límite para Alerta" hint="Recibe un WhatsApp cuando queden esta cantidad de comprobantes en el rango">
                    <Input 
                      type="number" 
                      className="h-10 rounded-lg"
                      value={seq.alerta_limite ?? 50} 
                      onChange={(e) => setSeq({ ...seq, alerta_limite: Number(e.target.value) })} 
                    />
                  </Field>
                )}
              </div>
            </div>
            
            <DialogFooter className="mt-4 gap-2">
              <Button variant="outline" className="rounded-xl h-9 text-xs border-border hover:bg-accent" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={save} disabled={loading} className="rounded-xl h-9 text-xs font-bold">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Secuencia
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
