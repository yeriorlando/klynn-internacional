import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Lock, Mail, Building2, ChevronDown, AlertCircle, Eye, EyeOff, UserPlus, LayoutDashboard } from "lucide-react";
import { Logo } from "@/components/klynn/Logo";
import { SeedBootstrap } from "@/components/klynn/SeedBootstrap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getActiveTenant, getTenants, getTenantBySlug, login, setActiveTenant, getEmpleados, setSession, getTenantsForUser, getEmpleadoById, ADMIN_EMAILS } from "@/lib/storage";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión — Klynn" },
      { name: "description", content: "Accede a tu panel de lavandería en Klynn." },
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
        password
      });

      if (authError) {
        setLoading(false);
        setError("Email o contraseña incorrectos");
        return;
      }

      if (!authData.user) {
        setLoading(false);
        setError("Error de autenticación");
        return;
      }

      // 2. Check si es Super Admin
      const isSuperAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
      if (isSuperAdmin) {
        setSession({
          empleado_id: 'admin',
          tenant_id: 'admin',
          iniciado_en: new Date().toISOString()
        });
        setLoading(false);
        navigate({ to: '/admin' });
        return;
      }

      // 3. Buscar todos los perfiles de empleado asociados a este email
      const { data: allEmps, error: errEmps } = await supabase.from('empleados')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('activo', true);

      if (errEmps || !allEmps || allEmps.length === 0) {
        setLoading(false);
        setError("No se encontraron lavanderías asociadas a tu cuenta");
        return;
      }

      const tenantIds = allEmps.map(e => e.tenant_id);
      const { data: tenants } = await supabase.from('tenants').select('*').in('id', tenantIds);

      if (!tenants || tenants.length === 0) {
        setLoading(false);
        setError("Error al cargar la información de las lavanderías");
        return;
      }

      if (tenants.length === 1) {
        const tenant = tenants[0];
        const emp = allEmps.find(e => e.tenant_id === tenant.id);
        if (!emp) throw new Error("Empleado no encontrado para este tenant");
        
        setSession({
          empleado_id: emp.id,
          tenant_id: tenant.id,
          iniciado_en: new Date().toISOString()
        });
        setActiveTenant(tenant.slug);
        setLoading(false);
        navigate({ to: "/t/$slug", params: { slug: tenant.slug } });
      } else {
        const accounts = tenants.map(t => {
          const emp = allEmps.find(e => e.tenant_id === t.id);
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
      iniciado_en: new Date().toISOString()
    });
    setActiveTenant(acc.tenant.slug);
    navigate({ to: "/t/$slug", params: { slug: acc.tenant.slug } });
  };

  return (
    <div className="grid min-h-[112vh] lg:grid-cols-2">
      <SeedBootstrap />

      {/* Panel informativo lateral */}
      <div className="relative hidden overflow-hidden p-10 lg:flex lg:flex-col lg:justify-between bg-primary">
        {/* Imagen de fondo premium */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/login.webp" 
            alt="Laundry background" 
            className="w-full h-full object-cover opacity-35 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/30 via-primary/70 to-primary/90" />
        </div>

        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative z-10">
          <Logo size="lg" iconColor="white" className="[&>span]:text-white" />
        </div>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-balance text-5xl font-bold leading-tight tracking-tight">
              Tu lavandería, <br /> bajo tu control.
            </h2>
            <p className="mt-6 max-w-md text-lg text-white/60">
              Accede a tu panel administrativo centralizado y gestiona todas tus sucursales desde un solo lugar.
            </p>
          </motion.div>
        </div>

        <div className="relative z-10 text-xs text-white/40">© {new Date().getFullYear()} Klynn</div>
      </div>

      {/* Área de Formulario / Selector */}
      <div className="flex items-center justify-center bg-background p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden flex justify-center">
            <Logo />
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Iniciar sesión</h1>
          <p className="mt-3 text-lg text-muted-foreground">Accede a tu red de lavanderías.</p>

          <AnimatePresence mode="wait">
            {matchingAccounts.length > 0 ? (
              <motion.div 
                key="selector"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="mt-10 space-y-6"
              >
                <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 text-center">
                  <p className="text-sm font-medium text-primary">
                    Hemos encontrado <span className="font-bold">{matchingAccounts.length} lavanderías</span> asociadas a tu correo.
                  </p>
                </div>

                <div className="grid gap-3">
                  {matchingAccounts.map((acc, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectAccount(acc)}
                      className="group flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:border-primary hover:bg-slate-50 transition-all text-left shadow-sm hover:shadow-md"
                    >
                      <div className="w-12 h-12 rounded-full bg-white border border-slate-100 flex items-center justify-center overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
                        {acc.tenant.logo_url ? (
                          <img src={acc.tenant.logo_url} className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="text-slate-300 h-6 w-6" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 text-lg">{acc.tenant.nombre}</p>
                        <p className="text-[11px] text-slate-400 lowercase tracking-[0.05em]">klynn.com.do/t/{acc.tenant.slug}</p>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-slate-100 group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-colors">
                        <ArrowRight size={16} />
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-3">
                  <Link to="/dashboard-admin" className="w-full">
                    <Button 
                      variant="outline"
                      className="w-full h-11 border-primary/20 text-primary hover:bg-primary/5 font-bold rounded-xl transition-all"
                    >
                      <LayoutDashboard className="h-4 w-4 mr-2" /> Ver mi panel general
                    </Button>
                  </Link>

                  <Button 
                    onClick={() => setMatchingAccounts([])}
                    variant="ghost"
                    size="sm"
                    className="w-full h-10 text-muted-foreground hover:text-primary font-medium rounded-xl transition-all"
                  >
                    <UserPlus className="h-4 w-4 mr-2" /> Usar otra cuenta
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.form 
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={onSubmit} 
                className="mt-10 space-y-5"
              >
                <div>
                  <Label className="mb-2 block text-sm font-semibold text-slate-700">Email administrativo</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <Input 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      type="email" 
                      placeholder="ejemplo@lavanderia.do" 
                      className="pl-11 h-11 border-slate-200 focus:border-primary transition-all rounded-lg" 
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="block text-sm font-bold text-slate-700">Contraseña</Label>
                    <Link to="/recuperar" className="text-sm font-bold text-primary hover:underline">¿Olvidaste tu contraseña?</Link>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <Input 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      className="pl-11 pr-11 h-11 border-slate-200 focus:border-primary transition-all rounded-lg" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                  </motion.div>
                )}

                <Button
                  type="submit"
                  size="sm"
                  disabled={loading}
                  className="w-full h-11 text-base font-bold text-white bg-primary hover:opacity-90 shadow-glow transition-all active:scale-[0.98] rounded-lg"
                >
                  {loading ? "Verificando..." : <span className="flex items-center gap-2">Entrar <ArrowRight className="h-5 w-5" /></span>}
                </Button>

                <p className="mt-8 text-center text-slate-500">
                  ¿Quieres registrar tu lavandería?{" "}
                  <Link to="/registro" className="font-bold text-primary hover:underline">
                    Comienza 14 días gratis
                  </Link>
                </p>
              </motion.form>
            )}
          </AnimatePresence>


        </div>
      </div>
    </div>
  );
}
