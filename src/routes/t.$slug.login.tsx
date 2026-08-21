/* Hallmark · redesign: tenant-login · genre: modern-minimal · theme: custom (#1B4B73 / #F0B900) */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { 
  ArrowRight, Lock, Mail, Building2, AlertCircle, Eye, EyeOff, 
  MapPin, ShieldCheck 
} from "lucide-react";
import { SeedBootstrap } from "@/components/klynn/SeedBootstrap";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
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
        { name: "description", content: `Accede al panel de ${tenant?.nombre || "tu lavandería"} en Klynn Cloud.` },
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

  // Asegurar que el login siempre se renderice en modo nítido y claro sin flash oscuro
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  }, []);

  // Inyectar colores del tenant en CSS variables locales
  const brandStyle = useMemo(() => {
    if (!tenant) return undefined;
    return {
      "--brand-primary": tenant.color_primario || "#1B4B73",
      "--brand-secondary": tenant.color_secundario || tenant.color_primario || "#F0B900",
    } as React.CSSProperties;
  }, [tenant]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const r = await login(slug, email, password);
      setLoading(false);
      if (!r.ok) {
        setError(r.error);
      } else {
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
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-slate-950 text-slate-100">
        <div className="mb-6 rounded-full bg-rose-500/10 p-6 text-rose-500 border border-rose-500/20 shadow-lg">
          <AlertCircle className="h-12 w-12" />
        </div>
        <h1 className="text-2xl font-black tracking-tight">Lavandería no encontrada</h1>
        <p className="mt-2 text-sm text-slate-400 max-w-sm">
          El subdominio <span className="font-mono text-amber-400 font-bold">"{slug}"</span> no está registrado o fue desactivado.
        </p>
        <Link 
          to="/login" 
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1B4B73] hover:bg-[#153a5b] text-white font-bold text-xs shadow-md transition-all"
        >
          <span>Ir al inicio de sesión general</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center relative p-4 sm:p-6 overflow-hidden font-sans antialiased selection:bg-[#F0B900] selection:text-slate-950" 
      style={brandStyle}
    >
      <SeedBootstrap />

      {/* Imagen de fondo difuminada con atmósfera envolvente */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/login.webp" 
          alt="Laundry background" 
          className="w-full h-full object-cover blur-[10px] scale-105 opacity-90 brightness-95"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/70 via-slate-900/40 to-slate-950/60" />
      </div>

      {/* Halo de resplandor ambiental suave centrado */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-[#1B4B73]/20 blur-[100px] pointer-events-none z-0" />

      {/* Tarjeta de Inicio de Sesión Hallmark Glassmorphism Proporcional */}
      <div 
        className="w-full max-w-[380px] sm:max-w-[390px] bg-white/95 backdrop-blur-xl rounded-3xl border border-white/70 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.25)] p-6 sm:p-7 relative z-10 animate-in fade-in zoom-in-95 duration-300"
      >
        <div className="text-center">
          {/* Contenedor de Logo de la Lavandería */}
          <div className="mb-2.5 flex flex-col items-center justify-center">
            <div className="h-13 flex items-center justify-center overflow-hidden">
              {tenant.logo_url ? (
                <img 
                  src={tenant.logo_url} 
                  className="object-contain max-h-13 max-w-[190px] w-auto drop-shadow-2xs transition-transform duration-200 hover:scale-105" 
                  alt={tenant.nombre} 
                />
              ) : (
                <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-200/70 flex items-center justify-center shadow-2xs">
                  <Building2 className="h-6 w-6 text-[#1B4B73]" />
                </div>
              )}
            </div>

            {/* Badge con Ubicación / Sucursal */}
            {(tenant.direccion || tenant.provincia) && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-100/90 border border-slate-200/80 text-[10.5px] font-semibold text-slate-600 shadow-2xs">
                <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                <span className="truncate max-w-[250px]">
                  {tenant.direccion ? `${tenant.direccion}${tenant.provincia ? ` · ${tenant.provincia}` : ""}` : tenant.provincia}
                </span>
              </div>
            )}
          </div>

          {/* Título & Subtítulo */}
          <h1 className="text-[22px] font-black tracking-tight text-slate-900 leading-tight">
            Iniciar sesión
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 font-medium">
            Acceso operativo para <span className="font-bold text-slate-700">{tenant.nombre}</span>
          </p>

          {/* Formulario de Login */}
          <form onSubmit={onSubmit} className="mt-4.5 space-y-3 text-left">
            {/* Campo Email */}
            <div className="space-y-1.5">
              <Label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-700">
                Correo electrónico
              </Label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#1B4B73] transition-colors" />
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  placeholder="ejemplo@lavanderia.do"
                  className="pl-10 h-10.5 bg-slate-50/70 border-slate-200/90 focus:border-[#1B4B73] focus:ring-2 focus:ring-[#1B4B73]/15 transition-all rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-700">
                  Contraseña
                </Label>
                <Link 
                  to="/recuperar" 
                  search={{ redirect: `/t/${tenant.slug}/login` } as any}
                  className="text-[10.5px] font-bold text-[#1B4B73] hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#1B4B73] transition-colors" />
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-10.5 bg-slate-50/70 border-slate-200/90 focus:border-[#1B4B73] focus:ring-2 focus:ring-[#1B4B73]/15 transition-all rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1B4B73] transition-colors p-1"
                  title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Mensaje de Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/90 p-2.5 text-xs font-semibold text-rose-700 animate-in fade-in duration-200">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Botón Principal INGRESAR AL SISTEMA con Animación Signature */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className={`group relative w-full h-11.5 rounded-2xl font-display font-black text-xs uppercase tracking-wider text-white shadow-md transition-all duration-300 overflow-hidden cursor-pointer active:scale-[0.98] ${
                  loading 
                    ? "bg-[#1B4B73] cursor-not-allowed opacity-95 shadow-[#1B4B73]/20" 
                    : "bg-gradient-to-r from-[#1B4B73] via-[#245e8e] to-[#1B4B73] bg-[length:200%_auto] hover:bg-right shadow-[#1B4B73]/25 hover:shadow-lg hover:shadow-[#1B4B73]/35 hover:-translate-y-0.5"
                }`}
              >
                {/* Efecto de Brillo / Rayo Shimmer en Hover */}
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

                {loading ? (
                  <div className="relative z-10 flex items-center justify-center gap-2.5">
                    <div className="relative flex items-center justify-center">
                      <div className="h-4.5 w-4.5 rounded-full border-2 border-white/20 border-t-[#F0B900] border-r-white animate-spin" />
                      <div className="absolute h-1.5 w-1.5 rounded-full bg-[#F0B900] animate-ping opacity-75" />
                    </div>
                    <span className="text-xs font-bold text-white tracking-normal normal-case flex items-center gap-1">
                      Iniciando sesión segura
                      <span className="flex gap-0.5 items-center">
                        <span className="h-1 w-1 rounded-full bg-[#F0B900] animate-bounce [animation-delay:-0.3s]" />
                        <span className="h-1 w-1 rounded-full bg-white animate-bounce [animation-delay:-0.15s]" />
                        <span className="h-1 w-1 rounded-full bg-[#F0B900] animate-bounce" />
                      </span>
                    </span>
                  </div>
                ) : (
                  <div className="relative z-10 flex items-center justify-center gap-2">
                    <span className="font-bold tracking-wider">INGRESAR AL SISTEMA</span>
                    <div className="h-5.5 w-5.5 rounded-xl bg-white/15 group-hover:bg-[#F0B900] group-hover:text-slate-900 text-white flex items-center justify-center transition-all duration-300 shadow-2xs group-hover:translate-x-1">
                      <ArrowRight className="h-3.5 w-3.5 transition-transform" />
                    </div>
                  </div>
                )}
              </button>
            </div>
          </form>

          {/* Sección Inferior: Cambiar de Lavandería */}
          <div className="mt-4.5 border-t border-slate-100 pt-3.5 text-center">
            <p className="text-[11.5px] font-semibold text-slate-500 mb-2">
              ¿No trabajas en {tenant.nombre}?
            </p>
            <Link 
              to="/login" 
              className="w-full h-9.5 inline-flex items-center justify-center gap-2 px-3.5 rounded-xl border border-slate-200/90 bg-slate-50/80 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-all shadow-2xs hover:border-[#1B4B73]/40 cursor-pointer"
            >
              <Building2 className="h-3.5 w-3.5 text-[#1B4B73]" />
              <span>Cambiar de lavandería</span>
            </Link>
          </div>

          {/* Sello de Seguridad Inferior */}
          <div className="mt-3.5 flex items-center justify-center gap-1 text-[10px] font-medium text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Conexión segura con cifrado SSL 256-bit</span>
          </div>

        </div>
      </div>
    </div>
  );
}
