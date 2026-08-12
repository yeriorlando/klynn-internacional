import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getCurrentUser, type Empleado, type Tenant } from "@/lib/storage";

// Dummy placeholder while loading — prevents hook ordering violations in child components
const LOADING_TENANT: Tenant = {
  id: '__loading__', nombre: '', slug: '', rnc: '', telefono: '', direccion: '',
  ciudad: '', provincia: '', email: '', color_primario: '#1B4B73', color_secundario: '#F0B900',
  plan_id: 'basico', estado: 'TRIAL', trial_hasta: new Date().toISOString(),
  config: {} as any, creado_en: new Date().toISOString()
};
const LOADING_EMPLEADO: Empleado = {
  id: '__loading__', tenant_id: '__loading__', nombre: '', email: '',
  password: '', rol: 'RECEPCIONISTA', activo: true, permisos: [],
  creado_en: new Date().toISOString()
};

/** Hook que devuelve el usuario actual o redirige a /login. */
export function useRequireAuth(): { empleado: Empleado; tenant: Tenant } | null {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ empleado: Empleado; tenant: Tenant } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      const u = await getCurrentUser();
      if (!u) {
        const match = typeof window !== 'undefined' ? window.location.pathname.match(/^\/t\/([^/]+)/) : null;
        const slug = match ? match[1] : null;
        
        if (slug && slug !== 'admin') {
          navigate({ to: "/t/$slug/login", params: { slug } });
        } else {
          navigate({ to: "/login" });
        }
      } else {
        setUser(u);
      }
      setLoading(false);
    }
    check();
  }, [navigate]);

  if (loading) return { empleado: LOADING_EMPLEADO, tenant: LOADING_TENANT };
  return user;
}
