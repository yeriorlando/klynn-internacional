import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Lock, ShieldCheck, CheckCircle2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Logo } from "@/components/klynn/Logo";
import { SeedBootstrap } from "@/components/klynn/SeedBootstrap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { acceptEmployeeInvitationServer } from "@/lib/server-auth";

export const Route = createFileRoute("/restablecer-contrasena")({
  head: () => ({
    meta: [
      { title: "Restablecer contraseña — Klynn" },
      { name: "description", content: "Crea una nueva contraseña para tu cuenta de Klynn." },
    ],
  }),
  component: RestablecerContrasenaPage,
});

function parseJwtPayload(token: string) {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function RestablecerContrasenaPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [invitationTenant, setInvitationTenant] = useState<{ name: string; slug: string; logoUrl: string | null }>({
    name: "",
    slug: "",
    logoUrl: null,
  });
  const [isInvitation, setIsInvitation] = useState(false);
  const [tokens, setTokens] = useState<{ accessToken: string | null; refreshToken: string | null }>({
    accessToken: null,
    refreshToken: null,
  });
  const [userMetadataState, setUserMetadataState] = useState<any>(null);

  // Verificar sesión y decodificar token de forma instantánea
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash || "";
    const invitationFlag = searchParams.get("invitation") === "1" || hash.includes("type=invite");
    if (invitationFlag) setIsInvitation(true);

    const processMetadata = async (metadata: any) => {
      if (!metadata) return;
      setUserMetadataState(metadata);
      const isInvite = Boolean(metadata.employee_invitation_id || invitationFlag || metadata.tenant_name || metadata.tenant_id);
      
      if (isInvite) {
        setIsInvitation(true);
        let tenantName = metadata.tenant_name || "";
        let tenantSlug = metadata.tenant_slug || "";
        let tenantLogo = metadata.tenant_logo_url || null;

        // Si tenemos tenant_id pero falta el logo o nombre, consultarlo de la BD
        if (metadata.tenant_id && (!tenantName || !tenantLogo)) {
          try {
            const { data: t } = await supabase
              .from("tenants")
              .select("nombre, slug, logo_url")
              .eq("id", metadata.tenant_id)
              .maybeSingle();
            if (t) {
              tenantName = t.nombre || tenantName;
              tenantSlug = t.slug || tenantSlug;
              tenantLogo = t.logo_url || tenantLogo;
            }
          } catch {}
        }

        setInvitationTenant({
          name: tenantName,
          slug: tenantSlug,
          logoUrl: tenantLogo,
        });
      }
    };

    // 1. Extraer tokens y decodificar el hash de forma inmediata (0ms)
    if (hash.includes("access_token=")) {
      try {
        const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
        const token = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        if (token) {
          setTokens({ accessToken: token, refreshToken });
          const payload = parseJwtPayload(token);
          if (payload?.user_metadata) {
            processMetadata(payload.user_metadata);
          }
          if (token && refreshToken) {
            supabase.auth.setSession({ access_token: token, refresh_token: refreshToken }).catch(() => {});
          }
        }
      } catch {}
    }

    // 2. Escuchar la sesión de Supabase
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.user_metadata) {
        processMetadata(data.session.user.user_metadata);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.user_metadata) {
        processMetadata(session.user.user_metadata);
      }
      if (event === "PASSWORD_RECOVERY") {
        console.log("Password recovery mode active");
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      let activeAccessToken = tokens.accessToken;
      if (!activeAccessToken && typeof window !== "undefined") {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        activeAccessToken = hashParams.get("access_token");
      }
      if (!activeAccessToken) {
        const { data: s } = await supabase.auth.getSession();
        activeAccessToken = s.session?.access_token || null;
      }

      if (isInvitation) {
        // En flujo de invitación: procesar contraseña y activación de forma segura en el servidor de la app
        const { data: sessionData } = await supabase.auth.getSession();
        const invitationMetadata = sessionData?.session?.user?.user_metadata || userMetadataState || {};
        const emailToUse = sessionData?.session?.user?.email || invitationMetadata.email || "";

        const result = await acceptEmployeeInvitationServer({
          data: {
            token: activeAccessToken,
            password: password,
            tenantId: invitationMetadata.tenant_id,
            invitationId: invitationMetadata.employee_invitation_id,
            email: emailToUse,
          },
        });

        if (result?.slug) {
          setInvitationTenant((prev) => ({
            ...prev,
            slug: result.slug || prev.slug,
            name: result.tenantName || prev.name,
          }));
        }
      } else {
        // En flujo regular de restablecer contraseña:
        const { error: updateErr } = await supabase.auth.updateUser({ password });
        if (updateErr) {
          throw updateErr;
        }
      }

      setSuccess(true);
      setTimeout(() => {
        if (invitationTenant.slug) {
          navigate({ to: `/t/${invitationTenant.slug}` });
        } else {
          navigate({ to: "/login" });
        }
      }, 2500);
    } catch (err: any) {
      console.error("Error al guardar contraseña / activar invitación:", err);
      setError(err.message || "No se pudo guardar la contraseña. El enlace puede haber expirado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2 font-sans">
      <SeedBootstrap />

      {/* Panel informativo lateral */}
      <div className="relative hidden overflow-hidden p-8 lg:flex lg:flex-col lg:justify-center bg-[#1B4B73]">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

        <div className="absolute top-8 left-8">
          <div className="relative z-10 flex items-center gap-3">
            <Logo size="md" iconColor="white" className="[&>span]:text-white" to="/" />
          </div>
        </div>

        <div className="relative text-white text-center mt-[-10%]">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {invitationTenant.logoUrl ? (
              <div className="mx-auto w-20 h-20 rounded-2xl bg-white p-2.5 flex items-center justify-center shadow-2xl border border-white/20">
                <img
                  src={invitationTenant.logoUrl}
                  alt={invitationTenant.name || "Lavandería"}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="mx-auto w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-xl border border-white/20 shadow-xl">
                 <ShieldCheck size={32} className="text-white" />
              </div>
            )}

            <h2 className="text-3xl font-black tracking-tighter">
              {isInvitation ? "Acepta tu invitación" : "Nueva contraseña"}
            </h2>
            <p className="max-w-xs mx-auto text-white/90 text-sm sm:text-base">
              {isInvitation
                ? `Establece tu contraseña para unirte al equipo de ${invitationTenant.name || "la lavandería"}.`
                : "Crea una contraseña segura para proteger el acceso a tu cuenta."}
            </p>
            {isInvitation && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="pt-2"
              >
                <p 
                  style={{ color: "#F0B900" }} 
                  className="text-xl sm:text-2xl font-serif italic font-semibold tracking-wide drop-shadow-md select-none"
                >
                  “Esperamos mucho de ti”
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>

        <div className="absolute bottom-8 left-8 text-xs text-white/60">© {new Date().getFullYear()} <span className="font-bold">Klynn</span></div>
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center bg-background p-6 lg:p-8">
        <div className="w-full max-w-md -mt-4 sm:-mt-8">
          <div className="mb-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate({ to: "/login" })}
              className="group -ml-4 h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-transparent font-bold"
            >
              <ArrowLeft size={14} className="mr-1.5 transition-transform group-hover:-translate-x-1" /> Volver al login
            </Button>
          </div>

          <AnimatePresence mode="wait">
            {!success ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {/* Cabecera con logo de la lavandería */}
                {isInvitation && (invitationTenant.logoUrl || invitationTenant.name) && (
                  <div className="mb-4 flex items-center gap-3 bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl shadow-xs">
                    {invitationTenant.logoUrl ? (
                      <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 p-1 shrink-0 flex items-center justify-center shadow-xs">
                        <img
                          src={invitationTenant.logoUrl}
                          alt={invitationTenant.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0 flex items-center justify-center font-black text-base">
                        {invitationTenant.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Invitación para unirse a</div>
                      <div className="text-sm font-black text-slate-900 leading-tight">{invitationTenant.name || "Tu Lavandería"}</div>
                    </div>
                  </div>
                )}
                <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900">
                  {isInvitation ? "Acepta tu invitación" : "Establecer contraseña"}
                </h1>

                <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
                  {isInvitation
                    ? `Crea tu contraseña para unirte al equipo de ${invitationTenant.name || "la lavandería"}.`
                    : "Ingresa tu nueva contraseña a continuación para recuperar el acceso a tu cuenta."}
                </p>

                <form onSubmit={onSubmit} className="mt-5 space-y-4">
                  <div className="space-y-3.5">
                    <div>
                      <Label className="mb-1.5 block text-xs font-bold text-slate-700">Nueva contraseña</Label>
                      <div className="relative group">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <Input 
                          required
                          value={password} 
                          onChange={e => setPassword(e.target.value)} 
                          type={showPassword ? "text" : "password"} 
                          placeholder="••••••••" 
                          className="pl-10 pr-10 h-10 border-slate-200 focus:border-primary transition-all rounded-xl text-sm" 
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label className="mb-1.5 block text-xs font-bold text-slate-700">Confirmar contraseña</Label>
                      <div className="relative group">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <Input 
                          required
                          value={confirmPassword} 
                          onChange={e => setConfirmPassword(e.target.value)} 
                          type={showPassword ? "text" : "password"} 
                          placeholder="••••••••" 
                          className="pl-10 pr-10 h-10 border-slate-200 focus:border-primary transition-all rounded-xl text-sm" 
                        />
                      </div>
                    </div>
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    size="sm"
                    disabled={loading}
                    className="w-full h-11 text-sm text-white bg-primary hover:opacity-90 shadow-glow transition-all active:scale-[0.98] font-bold rounded-xl"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {isInvitation ? "Activando cuenta..." : "Guardando contraseña..."}
                      </div>
                    ) : (isInvitation ? "Aceptar invitación y activar acceso" : "Guardar nueva contraseña")}
                  </Button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6"
              >
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-100/50">
                   <CheckCircle2 size={28} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black tracking-tighter">
                    {isInvitation ? "¡Invitación aceptada!" : "¡Contraseña actualizada!"}
                  </h2>
                  <p className="text-sm text-muted-foreground px-4">
                    {isInvitation
                      ? `Tu cuenta de empleado para ${invitationTenant.name || "la lavandería"} ha sido activada con éxito. Redirigiéndote...`
                      : "Tu contraseña ha sido cambiada exitosamente. Redirigiéndote al inicio de sesión..."}
                  </p>
                </div>
                <Button 
                  onClick={() => {
                    if (invitationTenant.slug) {
                      navigate({ to: `/t/${invitationTenant.slug}` });
                    } else {
                      navigate({ to: "/login" });
                    }
                  }}
                  className="w-full h-11 rounded-xl font-bold bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 transition-all shadow-sm text-sm"
                >
                  {invitationTenant.slug ? `Ir a ${invitationTenant.name || "la lavandería"}` : "Ir al Inicio de Sesión"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            ¿Necesitas ayuda?{' '}
            <a href="mailto:soporte@klynn.com.do" className="font-bold text-primary hover:underline">
              Contactar soporte
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
