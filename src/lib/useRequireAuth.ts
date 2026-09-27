import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  getCurrentUser,
  getEmpleadoById,
  getSession,
  getTenantById,
  isWithinWorkingHours,
  isCurrentTerminalAuthorized,
  type Empleado,
  type Tenant,
} from "@/lib/storage";

// Dummy placeholder while loading — prevents hook ordering violations in child components
const LOADING_TENANT: Tenant = {
  id: "__loading__",
  nombre: "",
  slug: "",
  rnc: "",
  telefono: "",
  direccion: "",
  ciudad: "",
  provincia: "",
  email: "",
  color_primario: "#1B4B73",
  color_secundario: "#F0B900",
  plan_id: "basico",
  estado: "TRIAL",
  trial_hasta: new Date().toISOString(),
  config: {} as any,
  creado_en: new Date().toISOString(),
};
const LOADING_EMPLEADO: Empleado = {
  id: "__loading__",
  tenant_id: "__loading__",
  nombre: "",
  email: "",
  password: "",
  rol: "RECEPCIONISTA",
  activo: true,
  permisos: [],
  creado_en: new Date().toISOString(),
};

/** Hook que devuelve el usuario actual autenticado de forma estricta o redirige a /login. */
export function useRequireAuth(): { empleado: Empleado; tenant: Tenant } | null {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ empleado: Empleado; tenant: Tenant } | null>(() => {
    if (typeof window === "undefined") return null;
    const session = getSession();
    if (!session) return null;

    // Caso Super Admin
    if (session.empleado_id === "admin") {
      if (session.tenant_id === "admin") {
        return {
          empleado: {
            id: "admin",
            tenant_id: "admin",
            nombre: "Super Admin",
            email: "admin@klynncloud.com",
            password: "***",
            rol: "ADMIN",
            activo: true,
            permisos: [
              "nueva-orden",
              "ordenes",
              "caja",
              "clientes",
              "catalogo",
              "procesos",
              "reportes",
              "gastos",
              "configuracion",
              "conversations",
              "logistica",
              "personal",
            ],
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
            email: "admin@klynncloud.com",
          },
        };
      } else {
        // Super Admin impersonando una sucursal específica
        try {
          const cachedTenantStr = localStorage.getItem(`klynn_tenant_id_${session.tenant_id}`);
          if (cachedTenantStr) {
            const cachedTen = JSON.parse(cachedTenantStr);
            if (cachedTen && cachedTen.id === session.tenant_id) {
              return {
                empleado: {
                  id: "admin",
                  tenant_id: cachedTen.id,
                  nombre: "Super Admin",
                  email: "admin@klynncloud.com",
                  password: "***",
                  rol: "ADMIN",
                  activo: true,
                  permisos: [
                    "nueva-orden",
                    "ordenes",
                    "caja",
                    "clientes",
                    "catalogo",
                    "procesos",
                    "reportes",
                    "gastos",
                    "configuracion",
                    "conversations",
                    "logistica",
                    "personal",
                  ],
                  creado_en: new Date().toISOString(),
                },
                tenant: cachedTen,
              };
            }
          }
        } catch {}
      }
    }

    // Usar la caché SOLO si coincide estrictamente con la sesión activa y la URL actual
    const lastAuthStr = localStorage.getItem("klynn_last_auth_user");
    if (lastAuthStr) {
      try {
        const parsed = JSON.parse(lastAuthStr);
        if (
          parsed?.empleado?.id === session.empleado_id &&
          parsed?.tenant?.id === session.tenant_id &&
          parsed?.empleado?.activo
        ) {
          const match = window.location.pathname.match(/^\/t\/([^/]+)/);
          const currentUrlSlug = match ? match[1] : null;
          // Si estamos en una ruta de tenant /t/:slug, verificar que coincida
          if (
            !currentUrlSlug ||
            currentUrlSlug === "admin" ||
            parsed.tenant?.slug === currentUrlSlug
          ) {
            return parsed;
          }
        }
      } catch {}
    }

    return null;
  });

  const [loading, setLoading] = useState(!user);

  useEffect(() => {
    let isMounted = true;

    async function check() {
      const u = await getCurrentUser();
      if (!isMounted) return;

      if (!u) {
        // Comprobar si hay sesión en localStorage para no expulsar al usuario por errores de red o token
        const session = getSession();
        if (session?.empleado_id && session?.tenant_id) {
          try {
            if (session.empleado_id === "admin") {
              const ten = await getTenantById(session.tenant_id);
              if (ten) {
                const empAdmin = {
                  id: "admin",
                  tenant_id: ten.id,
                  nombre: "Super Admin",
                  email: "admin@klynncloud.com",
                  password: "***",
                  rol: "ADMIN" as const,
                  activo: true,
                  permisos: [
                    "nueva-orden",
                    "ordenes",
                    "caja",
                    "clientes",
                    "catalogo",
                    "procesos",
                    "reportes",
                    "gastos",
                    "configuracion",
                    "conversations",
                    "logistica",
                    "personal",
                  ],
                  creado_en: new Date().toISOString(),
                };
                setUser({ empleado: empAdmin, tenant: ten });
                setLoading(false);
                return;
              }
            }
            const emp = await getEmpleadoById(session.empleado_id);
            const ten = await getTenantById(session.tenant_id);
            if (emp && ten && emp.activo) {
              setUser({ empleado: emp, tenant: ten });
              setLoading(false);
              return;
            }
          } catch {}
        }

        const match =
          typeof window !== "undefined" ? window.location.pathname.match(/^\/t\/([^/]+)/) : null;
        const slug = match ? match[1] : null;

        if (slug && slug !== "admin") {
          navigate({ to: "/t/$slug/login", params: { slug } });
        } else {
          navigate({ to: "/login" });
        }
      } else {
        // Validar si el usuario intenta acceder a una ruta /t/:slug que no le pertenece
        const match =
          typeof window !== "undefined" ? window.location.pathname.match(/^\/t\/([^/]+)/) : null;
        const slug = match ? match[1] : null;
        const isSuperAdmin = u.empleado.id === "admin" || u.tenant.id === "admin";

        if (slug && slug !== "admin" && !isSuperAdmin && u.tenant.slug && u.tenant.slug !== slug) {
          console.warn(
            `[useRequireAuth] Desajuste de slug detectado: ${slug} !== ${u.tenant.slug}. Redirigiendo a su lavandería...`,
          );
          navigate({ to: "/t/$slug", params: { slug: u.tenant.slug } });
        } else {
          // Comprobar seguridad de hardware y horario para empleados operativos
          const isAdmin = u.empleado.rol?.toUpperCase() === "ADMIN";
          if (!isAdmin) {
            const checkHorario = isWithinWorkingHours(u.tenant.config);
            if (!checkHorario.permitida) {
              navigate({ 
                to: "/t/$slug/login", 
                params: { slug: u.tenant.slug },
                search: { bloqueo: "horario" } as any,
              });
              return;
            }
            if (u.tenant.config?.control_terminales_activo && !isCurrentTerminalAuthorized(u.tenant)) {
              navigate({ to: "/t/$slug/login", params: { slug: u.tenant.slug } });
              return;
            }
          }
          setUser(u);
        }
      }
      setLoading(false);
    }

    check();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  if (loading && !user) return { empleado: LOADING_EMPLEADO, tenant: LOADING_TENANT };
  return user;
}
