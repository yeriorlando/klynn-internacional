import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Mail, Building2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { SeedBootstrap } from "@/components/klynn/SeedBootstrap";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTenantBySlug, login, setActiveTenant, type Tenant } from "@/lib/storage";

export const Route = createFileRoute("/t/$slug/login")({
  loader: async ({ params }) => {
    return await getTenantBySlug(params.slug);
  },
  head: ({ loaderData }) => {
    const tenant = loaderData as Tenant | undefined;
    return {
      meta: [
        { title: `Iniciar sesión — ${tenant?.nombre || "Lavandería"}` },
        { name: "description", content: `Accede al panel de ${tenant?.nombre || "tu lavandería"} en Klynn.` },
      ],
    };
  },
  component: TenantLoginPage,
});

function TenantLoginPage() {
  const { slug } = Route.useParams();
  const tenant = Route.useLoaderData() as Tenant | undefined;
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  // Inyectar colores del tenant en CSS variables locales
  const brandStyle = useMemo(() => {
    if (!tenant) return undefined;
    return {
      "--brand-primary": tenant.color_primario,
      "--brand-secondary": tenant.color_secundario || tenant.color_primario,
    } as React.CSSProperties;
  }, [tenant]);

  useEffect(() => {
    if (tenant) {
      setActiveTenant(tenant.slug);
    }
  }, [tenant]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const r = await login(slug, email, password);
      setLoading(false);
      if (!r.ok) setError(r.error);
      else {
        setIsEntering(true);
        navigate({ to: "/t/$slug", params: { slug } });
      }
    } catch (err: any) {
      setLoading(false);
      setError("Error de conexión: " + (err.message || "Intente de nuevo"));
    }
  }

  if (isEntering) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-[9999]">
        <GlobalPageLoader text="Cargando tu lavandería..." minHeight="min-h-screen" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <div className="mb-6 rounded-full bg-destructive/10 p-6 text-destructive">
          <AlertCircle className="h-12 w-12" />
        </div>
        <h1 className="text-2xl font-bold">Lavandería no encontrada</h1>
        <p className="mt-2 text-muted-foreground">El subdominio "{slug}" no está registrado en nuestra plataforma.</p>
        <Link to="/registro" className="mt-6 text-primary font-semibold hover:underline">
          ¿Quieres registrar tu lavandería? Hazlo aquí
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center relative p-4 sm:p-6 overflow-hidden" style={brandStyle}>
      <SeedBootstrap />

      {/* Imagen de fondo difuminada a pantalla completa */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/login.webp" 
          alt="Laundry background" 
          className="w-full h-full object-cover blur-[8px] scale-105 opacity-90 dark:opacity-60"
        />
        <div className="absolute inset-0 bg-slate-100/10 dark:bg-slate-950/40" />
      </div>

      {/* Tarjeta de Inicio de Sesión Compacta */}
      <div className="w-full max-w-[370px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-800 shadow-[0_15px_40px_rgba(0,0,0,0.05)] p-6 sm:p-7 relative z-10">
        <div className="text-center">
          {/* Logotipo completo arriba, sin bordes ni fondos extra */}
          <div className="mb-4.5 flex flex-col items-center justify-center">
             <div className="h-14 flex items-center justify-center overflow-hidden">
                {tenant.logo_url ? (
                  <img 
                    src={tenant.logo_url} 
                    className="object-contain max-h-full w-auto animate-fade-in" 
                    alt={tenant.nombre} 
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5.5 w-5.5" style={{ color: tenant.color_primario }} />
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{tenant.nombre}</span>
                  </div>
                )}
             </div>

             {/* Dirección debajo del logotipo y encima de los campos */}
             {(tenant.direccion || tenant.provincia) && (
               <p className="mt-2 text-[10.5px] text-slate-700 dark:text-slate-300 font-bold max-w-xs mx-auto leading-tight">
                 {tenant.direccion}
                 {tenant.direccion && tenant.provincia && " · "}
                 {tenant.provincia}
               </p>
             )}
          </div>

          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-none mb-2">Iniciar sesión</h1>

          <form onSubmit={onSubmit} className="mt-5 space-y-3.5 flex flex-col items-center">
            {/* Campo Email */}
            <div className="w-full text-center">
              <Label className="mb-1.5 block text-[10px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-center">Correo de acceso</Label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                   <Mail className="h-3.5 w-3.5" />
                </div>
                <Input 
                   value={email} 
                   onChange={(e) => setEmail(e.target.value)} 
                   type="email" 
                   placeholder="demo@klynn.com.do" 
                   className="pl-9 pr-3 text-center h-10 text-sm border-slate-200 dark:border-slate-800 focus:border-primary transition-all rounded-lg shadow-2xs" 
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div className="w-full text-center">
              <Label className="mb-1.5 block text-[10px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-center">Contraseña</Label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                   <Lock className="h-3.5 w-3.5" />
                </div>
                <Input 
                   value={password} 
                   onChange={(e) => setPassword(e.target.value)} 
                   type={showPassword ? "text" : "password"} 
                   placeholder="••••••••" 
                   className="pl-9 pr-9 text-center h-10 text-sm border-slate-200 dark:border-slate-800 focus:border-primary transition-all rounded-lg shadow-2xs" 
                />
                <button 
                   type="button" 
                   onClick={() => setShowPassword(!showPassword)} 
                   className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              
              <div className="mt-2 text-center">
                <a 
                  href={`/recuperar?redirect=/t/${tenant.slug}/login`} 
                  className="text-xs text-primary hover:underline font-bold"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            </div>

            {error && (
              <motion.div 
                 initial={{ opacity: 0, height: 0 }}
                 animate={{ opacity: 1, height: "auto" }}
                 className="flex items-center justify-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/5 p-2 text-xs text-destructive w-full"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
              </motion.div>
            )}

            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="w-full h-10 text-sm text-white font-bold shadow-sm hover:shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] rounded-lg flex items-center justify-center gap-1.5"
              style={{ background: tenant.color_primario }}
            >
              {loading ? "Verificando..." : <span className="flex items-center gap-1.5">Entrar al panel <ArrowRight className="h-4 w-4" /></span>}
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-100 dark:border-slate-800/80 pt-5 text-center">
             <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2.5">¿No trabajas en {tenant.nombre}?</p>
             <Link 
                to="/login" 
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-xs font-semibold transition-all shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
                style={{ 
                  borderColor: `${tenant.color_primario}30`, 
                  color: tenant.color_primario,
                  background: `${tenant.color_primario}08` 
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${tenant.color_primario}15`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `${tenant.color_primario}08`;
                }}
             >
                <Building2 className="h-3.5 w-3.5" style={{ color: tenant.color_primario }} /> Cambiar de lavandería
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
