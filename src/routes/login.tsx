/* Hallmark · redesign: login-atmospheric · genre: modern-minimal · theme: custom (#1B4B73 / #F0B900) */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, Lock, Mail, Building2, AlertCircle, Eye, EyeOff, 
  UserPlus, LayoutDashboard, ShieldCheck, Sparkles, CheckCircle2,
  Wallet, Truck, Receipt, MessageSquare
} from "lucide-react";
import { Logo } from "@/components/klynn/Logo";
import { SeedBootstrap } from "@/components/klynn/SeedBootstrap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setActiveTenant, setSession, ADMIN_EMAILS } from "@/lib/storage";
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
        setLoading(false);
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
    navigate({ to: "/t/$slug", params: { slug: acc.tenant.slug } });
  };

  return (
    <div className="h-screen w-full grid lg:grid-cols-12 bg-slate-950 overflow-hidden font-sans antialiased selection:bg-[#F0B900] selection:text-slate-950">
      <SeedBootstrap />

      {/* PANEL IZQUIERDO: Branding Atmosférico con Fondo de Imagen Original */}
      <div className="relative hidden lg:col-span-7 xl:col-span-7 lg:flex flex-col justify-between p-8 xl:p-10 overflow-hidden bg-primary text-white border-r border-white/10 h-full">
        
        {/* Imagen de Fondo Original Conservada y Visible */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img 
            src="/login.webp" 
            alt="Laundry background" 
            className="w-full h-full object-cover opacity-45 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/30 via-primary/65 to-primary/85" />
        </div>

        {/* Círculos de luz ambiental sutil */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#F0B900]/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-primary/40 blur-2xl pointer-events-none" />

        {/* Header superior del Panel */}
        <div className="relative z-10 flex items-center justify-between">
          <Logo size="lg" iconColor="#F0B900" className="[&>span]:text-white font-display tracking-tight" />
        </div>

        {/* Bloque Central de Valor (Ajustado para un solo vistazo sin scroll) */}
        <div className="relative z-10 my-auto max-w-xl space-y-6 py-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-3"
          >
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#F0B900] bg-[#F0B900]/10 px-3 py-1 rounded-md border border-[#F0B900]/20">
              <Sparkles className="h-3.5 w-3.5" /> Software de Gestión Operativa
            </div>
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-[1.12] text-white font-display">
              El sistema inteligente para <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#F0B900] to-[#F0B900]">
                la gestión de tu lavandería.
              </span>
            </h1>
            <p className="text-sm xl:text-base text-slate-300 leading-relaxed font-normal">
              Optimiza la recepción de prendas, automatiza el control de cajas, coordina servicios a domicilio y mantén el control total de tus sucursales con Klynn.
            </p>
          </motion.div>

          {/* Insignias de Características Operativas */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-2 gap-2.5 pt-1"
          >
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-2.5 transition-all hover:bg-white/15 group">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/30 group-hover:scale-105 transition-transform">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs font-bold text-white block truncate">Avisos por WhatsApp</span>
                <span className="text-[10px] text-slate-300 block truncate">Notificaciones automáticas</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-2.5 transition-all hover:bg-white/15 group">
              <div className="h-8 w-8 rounded-lg bg-[#F0B900]/20 text-[#F0B900] flex items-center justify-center shrink-0 border border-[#F0B900]/30 group-hover:scale-105 transition-transform">
                <Wallet className="h-4 w-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs font-bold text-white block truncate">Arqueos & Cuadres</span>
                <span className="text-[10px] text-slate-300 block truncate">Control de caja en vivo</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-2.5 transition-all hover:bg-white/15 group">
              <div className="h-8 w-8 rounded-lg bg-sky-500/20 text-sky-300 flex items-center justify-center shrink-0 border border-sky-500/30 group-hover:scale-105 transition-transform">
                <Receipt className="h-4 w-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs font-bold text-white block truncate">Comprobantes e-CF</span>
                <span className="text-[10px] text-slate-300 block truncate">Facturación fiscal DGII</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-2.5 transition-all hover:bg-white/15 group">
              <div className="h-8 w-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30 group-hover:scale-105 transition-transform">
                <Truck className="h-4 w-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs font-bold text-white block truncate">Delivery & Rutas</span>
                <span className="text-[10px] text-slate-300 block truncate">Monitoreo de choferes</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Sin elementos inferiores sobrantes para vista perfecta en 100vh */}
        <div className="relative z-10 text-[11px] text-slate-400 flex items-center justify-between pt-2">
          <span>Klynn Cloud OS</span>
          <span className="flex items-center gap-1 text-slate-300">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Cifrado SSL 256-bit
          </span>
        </div>
      </div>

      {/* PANEL DERECHO: Formulario de Autenticación Ajustado en 100vh */}
      <div className="lg:col-span-5 xl:col-span-5 flex items-center justify-center p-6 sm:p-8 bg-white dark:bg-slate-950 h-full overflow-y-auto">
        <div className="w-full max-w-sm space-y-6">
          
          {/* Logo visible solo en mobile */}
          <div className="lg:hidden flex justify-center pb-1">
            <Logo size="lg" />
          </div>

          {/* Encabezado del Formulario */}
          <div className="space-y-1.5 text-left">
            <h2 className="text-2xl xl:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-display">
              Iniciar sesión
            </h2>
            <p className="text-xs xl:text-sm text-slate-500 dark:text-slate-400">
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
                          <p className="text-[10px] text-slate-400 font-mono truncate">klynn.com.do/t/{acc.tenant.slug}</p>
                        </div>
                      </div>
                      <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-[#1B4B73] group-hover:text-white text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors shrink-0">
                        <ArrowRight size={16} />
                      </div>
                    </button>
                  ))}
                </div>

                <div className="pt-1 space-y-2">
                  <Link to="/dashboard-admin" className="w-full block">
                    <Button
                      variant="outline"
                      className="w-full h-10 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-xs transition-all"
                    >
                      <LayoutDashboard className="h-3.5 w-3.5 mr-1.5 text-[#1B4B73]" /> Ir al panel general Propietario
                    </Button>
                  </Link>

                  <Button
                    onClick={() => setMatchingAccounts([])}
                    variant="ghost"
                    size="sm"
                    className="w-full h-9 text-slate-500 hover:text-slate-900 font-semibold rounded-xl text-xs transition-all"
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Iniciar con otra cuenta
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

                {/* Botón Principal de Enviar */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 text-xs font-bold text-white bg-[#1B4B73] hover:bg-[#143B5C] shadow-md shadow-[#1B4B73]/25 transition-all active:scale-[0.99] rounded-xl cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Verificando credenciales...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      Acceder al sistema <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>

                {/* Footer de Registro */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500">
                  ¿Aún no tienes cuenta?{" "}
                  <Link to="/registro" className="font-bold text-[#1B4B73] hover:underline">
                    Registra tu lavandería (14 días gratis)
                  </Link>
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
