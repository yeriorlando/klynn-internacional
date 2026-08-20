import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getCurrentUser, getSession, getTenantBySlug, type Empleado, type Tenant } from "@/lib/storage";

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
  const [user, setUser] = useState<{ empleado: Empleado; tenant: Tenant } | null>(() => {
    if (typeof window === "undefined") return null;
    const session = getSession();
    if (session?.empleado_id === "admin" || session?.tenant_id === "admin") {
      return {
        empleado: {
          id: "admin",
          tenant_id: "admin",
          nombre: "Super Admin",
          email: "admin@klynn.com.do",
          password: "***",
          rol: "ADMIN",
          activo: true,
          permisos: ["nueva-orden", "ordenes", "caja", "clientes", "catalogo", "procesos", "reportes", "gastos", "configuracion", "conversations", "logistica", "personal"],
          creado_en: new Date().toISOString(),
        },
        tenant: {
          id: "admin",
          nombre: "Administración Global",
          slug: "admin",
          plan_id: "enterprise",
          estado: "ACTIVO",
          trial_hasta: new Date().toISOString(),
          creado_en: new Date().toISOString(),
          color_primario: "#1B4B73",
          color_secundario: "#F0B900",
          telefono: "",
          direccion: "",
          email: "admin@klynn.com.do",
        },
      };
    }

    const lastAuthStr = localStorage.getItem("klynn_last_auth_user");
    if (lastAuthStr) {
      try {
        const parsed = JSON.parse(lastAuthStr);
        if (parsed?.empleado && parsed?.tenant && parsed.empleado.nombre !== "Operador Mostrador") {
          return parsed;
        }
      } catch {}
    }

    const match = window.location.pathname.match(/^\/t\/([^/]+)/);
    const activeSlug = match ? match[1] : (localStorage.getItem("klynn_active_tenant") || "reynita");
    const cachedTenantStr = localStorage.getItem(`klynn_tenant_cache_${activeSlug}`);
    if (cachedTenantStr) {
      try {
        const tenant = JSON.parse(cachedTenantStr);
        const realId = tenant.id;

        if (session) {
          const cachedEmpStr = localStorage.getItem(`klynn_emp_id_${session.empleado_id}`);
          if (cachedEmpStr) {
            const empleado = JSON.parse(cachedEmpStr);
            if (empleado?.nombre && empleado.nombre !== "Operador Mostrador") {
              return { empleado, tenant };
            }
          }
        }

        // Buscar empleado real en la lista de empleados guardada
        const empsRaw = localStorage.getItem("lvx:empleados") || localStorage.getItem("klynn_empleados");
        if (empsRaw) {
          try {
            const emps = JSON.parse(empsRaw);
            if (Array.isArray(emps)) {
              const matchedEmp = emps.find((e: any) => 
                (e.tenant_id === realId || e.tenant_id === `ten-${activeSlug}` || e.tenant_id === activeSlug) && e.activo
              );
              if (matchedEmp) {
                return { empleado: matchedEmp, tenant };
              }
            }
          } catch {}
        }

        const adminName = activeSlug === "reynita" ? "Reyna Mancebo" : (tenant.nombre || "Administrador");
        const adminEmail = activeSlug === "reynita" ? "reynamancebo@gmail.com" : (tenant.email || "admin@klynn.com.do");
        const adminEmpId = activeSlug === "reynita" ? "d13ef7f6-549b-40be-846c-65fb173318b6" : (session?.empleado_id || `emp-${tenant.id}-admin`);

        return {
          empleado: {
            id: adminEmpId,
            tenant_id: tenant.id,
            nombre: adminName,
            email: adminEmail,
            password: "***",
            rol: "ADMIN",
            activo: true,
            permisos: ["nueva-orden", "ordenes", "caja", "clientes", "catalogo", "procesos", "reportes", "gastos", "configuracion", "conversations", "logistica", "personal"],
            creado_en: new Date().toISOString(),
          },
          tenant,
        };
      } catch {}
    }
    return null;
  });
  const [loading, setLoading] = useState(!user);

  useEffect(() => {
    async function check() {
      const u = await getCurrentUser();
      if (!u) {
        // En offline, nunca redirigir a login para no bloquear el POS
        if (typeof window !== "undefined" && !navigator.onLine) {
          setLoading(false);
          return;
        }

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

  if (loading && !user) return { empleado: LOADING_EMPLEADO, tenant: LOADING_TENANT };
  return user;
}
