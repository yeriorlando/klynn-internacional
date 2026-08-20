/* Hallmark · redesign: login-atmospheric · genre: modern-minimal · theme: custom (#1B4B73 / #F0B900) */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, Lock, Mail, Building2, AlertCircle, Eye, EyeOff, 
  UserPlus, LayoutDashboard, ShieldCheck, Sparkles, CheckCircle2,
  Wallet, Truck, Receipt, MessageSquare, Layers, Gift, Rocket, Ticket
} from "lucide-react";
import { Logo } from "@/components/klynn/Logo";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
import { SeedBootstrap } from "@/components/klynn/SeedBootstrap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setActiveTenant, setSession, ADMIN_EMAILS, getTenantBranchName } from "@/lib/storage";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión — Klynn Cloud" },
      { name: "description", content: "Accede a tu panel administrativo de lavandería en Klynn." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [matchingAccounts, setMatchingAccounts] = useState<{ emp: any; tenant: any }[]>([]);
  const [isEntering, setIsEntering] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Autenticar en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setLoading(false);
        setError("Credenciales incorrectas. Verifica tu email y contraseña.");
        return;
      }

      if (!authData.user) {
        setLoading(false);
        setError("Error de autenticación en el servidor");
        return;
      }

      // 2. Check si es Super Admin
      const isSuperAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
      if (isSuperAdmin) {
        setSession({
          empleado_id: "admin",
          tenant_id: "admin",
          iniciado_en: new Date().toISOString(),
        });
        localStorage.setItem(
          "klynn_emp_id_admin",
          JSON.stringify({
            id: "admin",
            tenant_id: "admin",
            nombre: "Super Admin",
            email: email.toLowerCase(),
            rol: "ADMIN",
            activo: true,
            permisos: ["nueva-orden", "ordenes", "caja", "clientes", "catalogo", "procesos", "reportes", "gastos", "configuracion", "conversations", "logistica", "personal"],
            creado_en: new Date().toISOString(),
          })
        );
        localStorage.setItem("klynn_active_tenant", "admin");
        setLoading(false);
        setIsEntering(true);
        navigate({ to: "/admin" });
        return;
      }

      // 3. Buscar todos los perfiles de empleado asociados a este email
      const { data: allEmps, error: errEmps } = await supabase
        .from("empleados")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("activo", true);

      if (errEmps || !allEmps || allEmps.length === 0) {
        setLoading(false);
        setError("No se encontraron lavanderías activas asociadas a tu cuenta.");
        return;
      }

      const tenantIds = allEmps.map((e) => e.tenant_id);
      const { data: tenants } = await supabase.from("tenants").select("*").in("id", tenantIds);

      if (!tenants || tenants.length === 0) {
        setLoading(false);
        setError("Error al cargar la información de las sucursales.");
        return;
      }

      if (tenants.length === 1) {
        const tenant = tenants[0];
        const emp = allEmps.find((e) => e.tenant_id === tenant.id);
        if (!emp) throw new Error("Empleado no encontrado para este tenant");

        setSession({
          empleado_id: emp.id,
          tenant_id: tenant.id,
          iniciado_en: new Date().toISOString(),
        });
        setActiveTenant(tenant.slug);
        setLoading(false);
        setIsEntering(true);
        navigate({ to: "/t/$slug", params: { slug: tenant.slug } });
      } else {
        const accounts = tenants.map((t) => {
          const emp = allEmps.find((e) => e.tenant_id === t.id);
          return { emp, tenant: t };
        });
        setMatchingAccounts(accounts);
        setLoading(false);
      }
    } catch (err: any) {
      setLoading(false);
      setError("Error de conexión: " + (err.message || "Intente de nuevo"));
    }
  }

  const handleSelectAccount = (acc: { emp: any; tenant: any }) => {
    setSession({
      empleado_id: acc.emp.id,
      tenant_id: acc.tenant.id,
      iniciado_en: new Date().toISOString(),
    });
    setActiveTenant(acc.tenant.slug);
    setIsEntering(true);
    navigate({ to: "/t/$slug", params: { slug: acc.tenant.slug } });
  };

  if (isEntering) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-[9999]">
        <GlobalPageLoader text="Cargando tu lavandería..." minHeight="min-h-screen" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full grid lg:grid-cols-12 bg-slate-950 overflow-hidden font-sans antialiased selection:bg-[#F0B900] selection:text-slate-950">
      <SeedBootstrap />

      {/* PANEL IZQUIERDO: Branding Atmosférico con Fondo Integrado (50% Ancho) */}
      <div className="relative hidden lg:col-span-6 xl:col-span-6 lg:flex flex-col justify-between p-8 xl:p-12 overflow-hidden bg-[#1B4B73] text-white border-r border-white/10 h-full">
        
        {/* Imagen de Fondo con Mezcla Atmosférica de Lujo */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img 
            src="/login.webp" 
            alt="Laundry background" 
            className="w-full h-full object-cover opacity-35 mix-blend-luminosity scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1B4B73]/60 via-[#143B5C]/80 to-[#0c2438]/95" />
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-[#0a1b29]/80" />
        </div>

        {/* Resplandor ambiental de color */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#F0B900]/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-sky-400/10 blur-3xl pointer-events-none" />

        {/* Header superior del Panel */}
        <div className="relative z-10 flex items-center justify-between">
          <Logo size="lg" variant="white" className="font-display tracking-tight" />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-bold text-slate-200">
            <ShieldCheck className="h-3.5 w-3.5 text-[#F0B900]" />
            <span>Plataforma Cloud</span>
          </div>
        </div>

        {/* Bloque Central de Valor */}
        <div className="relative z-10 my-auto max-w-lg space-y-6 py-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-3.5"
          >
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#F0B900] bg-[#F0B900]/15 px-3 py-1 rounded-lg border border-[#F0B900]/30 shadow-2xs">
              <Sparkles className="h-3.5 w-3.5 text-[#F0B900]" /> Software de Gestión Operativa
            </div>
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-[1.14] text-white font-display">
              El sistema inteligente para <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#F0B900] to-[#F0B900]">
                la gestión de tu lavandería.
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed font-normal">
              Optimiza la recepción de prendas, automatiza el control de cajas, coordina servicios a domicilio y mantén el control total de tus sucursales con Klynn.
            </p>
          </motion.div>

          {/* Cuadrícula de Características Bento */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-2 gap-3 pt-2"
          >
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-3 transition-all hover:bg-white/15 group">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/30 group-hover:scale-105 transition-transform">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs font-bold text-white block truncate">Avisos WhatsApp</span>
                <span className="text-[10px] text-slate-300 block truncate">Alertas automáticas</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-3 transition-all hover:bg-white/15 group">
              <div className="h-9 w-9 rounded-xl bg-violet-500/20 text-violet-300 flex items-center justify-center shrink-0 border border-violet-500/30 group-hover:scale-105 transition-transform">
                <Layers className="h-4 w-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs font-bold text-white block truncate">Flujo de Ropa</span>
                <span className="text-[10px] text-slate-300 block truncate">Control Kanban ágil</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-3 transition-all hover:bg-white/15 group">
              <div className="h-9 w-9 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center shrink-0 border border-sky-500/30 group-hover:scale-105 transition-transform">
                <Receipt className="h-4 w-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs font-bold text-white block truncate">Comprobantes e-CF</span>
                <span className="text-[10px] text-slate-300 block truncate">Homologado DGII</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-3 transition-all hover:bg-white/15 group">
              <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30 group-hover:scale-105 transition-transform">
                <Truck className="h-4 w-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs font-bold text-white block truncate">Envío a Domicilio</span>
                <span className="text-[10px] text-slate-300 block truncate">Logística y entregas</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer del Panel Izquierdo */}
        <div className="relative z-10 flex items-center justify-center text-center text-xs text-slate-300/80 pt-2 border-t border-white/10">
          <span>© {new Date().getFullYear()} Klynn Cloud — Todos los derechos reservados</span>
        </div>
      </div>

      {/* PANEL DERECHO: Formulario Centrado y Armónico (50% Ancho) */}
      <div className="lg:col-span-6 xl:col-span-6 flex items-center justify-center p-6 sm:p-10 xl:p-14 bg-white dark:bg-slate-950 h-full overflow-y-auto">
        <div className="w-full max-w-md mx-auto space-y-6">
          
          {/* Logo visible solo en mobile */}
          <div className="lg:hidden flex justify-center pb-2">
            <Logo size="lg" />
          </div>

          {/* Encabezado del Formulario Centrado */}
          <div className="space-y-2 text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-display">
              Iniciar sesión
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Ingresa tus credenciales para acceder a tu panel de control.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {matchingAccounts.length > 0 ? (
              /* VISTA SELECTOR MULTI-SUCURSAL */
              <motion.div
                key="selector"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="rounded-xl bg-[#1B4B73]/5 border border-[#1B4B73]/15 p-3.5 text-left space-y-1">
                  <div className="flex items-center gap-1.5 text-[#1B4B73] font-bold text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#F0B900]" />
                    <span>Sucursales asociadas encontradas</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Tu correo <strong className="font-semibold text-slate-900 dark:text-white">{email}</strong> tiene acceso a <strong className="font-semibold text-[#1B4B73]">{matchingAccounts.length} lavanderías</strong>. Selecciona a cuál deseas acceder:
                  </p>
                </div>

                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {matchingAccounts.map((acc, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectAccount(acc)}
                      className="w-full group flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#1B4B73] hover:bg-slate-50/80 dark:hover:bg-slate-900/60 transition-all text-left shadow-xs hover:shadow-sm cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                          {acc.tenant.logo_url ? (
                            <img src={acc.tenant.logo_url} alt="Logo" className="h-full w-full object-cover" />
                          ) : (
                            <Building2 className="text-[#1B4B73] h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{acc.tenant.nombre}</p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60 shadow-2xs">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {getTenantBranchName(acc.tenant)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-[#1B4B73] group-hover:text-white text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors shrink-0">
                        <ArrowRight size={16} />
                      </div>
                    </button>
                  ))}
                </div>

                <div className="pt-2 space-y-2">
                  <Link to="/dashboard-admin" className="w-full block">
                    <Button
                      type="button"
                      className="w-full h-10 bg-[#1B4B73] hover:bg-[#153a5b] active:bg-[#0f2c45] text-white font-bold rounded-xl text-xs shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <LayoutDashboard className="h-3.5 w-3.5 text-[#F0B900]" />
                      <span>Ir al panel general de propietario</span>
                    </Button>
                  </Link>

                  <Button
                    onClick={() => setMatchingAccounts([])}
                    type="button"
                    variant="outline"
                    className="w-full h-10 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 font-semibold rounded-xl text-xs shadow-2xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <UserPlus className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Iniciar con otra cuenta</span>
                  </Button>
                </div>
              </motion.div>
            ) : (
              /* VISTA FORMULARIO LOGIN */
              <motion.form
                key="login-form"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                onSubmit={onSubmit}
                className="space-y-4"
              >
                {/* Campo Email */}
                <div className="space-y-1.5 text-left">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Correo electrónico
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#1B4B73] transition-colors" />
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      required
                      placeholder="admin@lavanderia.do"
                      className="pl-9 h-11 bg-slate-50/50 border-slate-200/90 focus:border-[#1B4B73] focus:ring-2 focus:ring-[#1B4B73]/15 transition-all rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>

                {/* Campo Contraseña */}
                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Contraseña
                    </Label>
                    <Link to="/recuperar" className="text-[11px] font-bold text-[#1B4B73] hover:underline">
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#1B4B73] transition-colors" />
                    <Input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      className="pl-9 pr-10 h-11 bg-slate-50/50 border-slate-200/90 focus:border-[#1B4B73] focus:ring-2 focus:ring-[#1B4B73]/15 transition-all rounded-xl text-xs font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1B4B73] transition-colors"
                      title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Mensaje de Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs font-semibold text-rose-700 dark:border-rose-950 dark:bg-rose-950/40 dark:text-rose-400"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {/* Botón Principal de Enviar Rediseñado */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`group relative w-full h-12 rounded-2xl font-display font-black text-xs uppercase tracking-wider text-white shadow-lg transition-all duration-300 overflow-hidden cursor-pointer active:scale-[0.98] ${
                    loading 
                      ? "bg-[#1B4B73] cursor-not-allowed opacity-95 shadow-[#1B4B73]/20" 
                      : "bg-gradient-to-r from-[#1B4B73] via-[#245e8e] to-[#1B4B73] bg-[length:200%_auto] hover:bg-right shadow-[#1B4B73]/30 hover:shadow-xl hover:shadow-[#1B4B73]/40 hover:-translate-y-0.5"
                  }`}
                >
                  {/* Efecto de Brillo / Rayo Shimmer en Hover */}
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

                  {loading ? (
                    <div className="relative z-10 flex items-center justify-center gap-3">
                      {/* Animación de Carga Hermosa y Fluida */}
                      <div className="relative flex items-center justify-center">
                        <div className="h-5 w-5 rounded-full border-2 border-white/20 border-t-[#F0B900] border-r-white animate-spin" />
                        <div className="absolute h-2 w-2 rounded-full bg-[#F0B900] animate-ping opacity-75" />
                      </div>
                      <span className="text-xs font-bold text-white tracking-normal normal-case flex items-center gap-1.5">
                        Iniciando sesión segura
                        <span className="flex gap-1 items-center">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#F0B900] animate-bounce [animation-delay:-0.3s]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-white animate-bounce [animation-delay:-0.15s]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-[#F0B900] animate-bounce" />
                        </span>
                      </span>
                    </div>
                  ) : (
                    <div className="relative z-10 flex items-center justify-center gap-2.5">
                      <span className="font-bold tracking-wider">INGRESAR AL SISTEMA</span>
                      <div className="h-6 w-6 rounded-xl bg-white/15 group-hover:bg-[#F0B900] group-hover:text-slate-900 text-white flex items-center justify-center transition-all duration-300 shadow-2xs group-hover:translate-x-1">
                        <ArrowRight className="h-3.5 w-3.5 transition-transform" />
                      </div>
                    </div>
                  )}
                </button>

                {/* Tarjeta de Acceso Privado por Invitación */}
                <div className="pt-2">
                  <div className="relative overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 p-4 transition-all hover:border-[#1B4B73]/40 group shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
                        ¿Tienes una invitación?
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 px-2.5 py-0.5 rounded-full border border-amber-200/80 dark:border-amber-800">
                        <Ticket className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        Acceso Privado
                      </span>
                    </div>
                    
                    <Link 
                      to="/registro" 
                      className="w-full h-11 flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-black text-[#1B4B73] dark:text-sky-400 hover:bg-[#1B4B73] hover:text-white dark:hover:bg-[#1B4B73] dark:hover:text-white shadow-2xs transition-all duration-200 group/btn cursor-pointer"
                    >
                      <Ticket className="h-4 w-4 text-[#F0B900] group-hover/btn:scale-110 group-hover/btn:-rotate-12 transition-all shrink-0" />
                      <span>Canjear código de activación</span>
                      <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform shrink-0" />
                    </Link>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Sello inferior discreto */}
          <div className="pt-1 flex items-center justify-center gap-1.5 text-[10px] font-medium text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Conexión segura con cifrado SSL 256-bit</span>
          </div>

        </div>
      </div>
    </div>
  );
}
