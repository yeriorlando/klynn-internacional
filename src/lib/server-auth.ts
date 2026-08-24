import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export interface AcceptEmployeeInvitationParams {
  token?: string | null;
  password?: string;
  tenantId?: string;
  invitationId?: string;
  email?: string;
}

export const acceptEmployeeInvitationServer = createServerFn({ method: "POST" })
  .inputValidator((data: AcceptEmployeeInvitationParams) => data)
  .handler(async ({ data }) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://api.klynn.com.do";
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

      if (!serviceRoleKey) {
        throw new Error("Credenciales maestras de base de datos no configuradas");
      }

      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { token, password, tenantId, invitationId, email } = data;

      let userId: string | null = null;
      let userEmail: string = email || "";
      let userMetadata: any = {};

      if (token) {
        try {
          const parts = token.split(".");
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8"));
            if (payload?.sub) {
              userId = payload.sub;
              userEmail = payload.email || userEmail;
              userMetadata = payload.user_metadata || {};
            }
          }
        } catch (e) {
          console.warn("Error decodificando token en servidor:", e);
        }
      }

      const targetTenantId = tenantId || userMetadata.tenant_id;
      const targetInvitationId = invitationId || userMetadata.employee_invitation_id;

      let invitationQuery = adminClient
        .from("employee_invitations")
        .select("id,tenant_id,email,status,rol,permisos,expires_at,auth_user_id")
        .eq("status", "pending");

      if (targetInvitationId) {
        invitationQuery = invitationQuery.eq("id", targetInvitationId);
      } else if (targetTenantId && userEmail) {
        invitationQuery = invitationQuery.eq("tenant_id", targetTenantId).ilike("email", userEmail);
      }

      const { data: invitation, error: invErr } = await invitationQuery
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (invErr || !invitation) {
        throw new Error("Invitación pendiente no encontrada o ya procesada.");
      }

      if (new Date(invitation.expires_at).getTime() <= Date.now()) {
        throw new Error("La invitación ha vencido. Solicita una nueva invitación.");
      }

      const targetUserId = userId || invitation.auth_user_id;

      if (password && targetUserId) {
        const { error: pwdErr } = await adminClient.auth.admin.updateUserById(targetUserId, {
          password: password,
          email_confirm: true,
        });
        if (pwdErr) {
          throw new Error(pwdErr.message || "No se pudo actualizar la contraseña");
        }
      }

      const role = invitation.rol || "VENDEDOR";
      const employeeName = userMetadata.nombre || invitation.email.split("@")[0] || "Empleado";

      if (targetUserId) {
        await adminClient.from("empleados").upsert({
          id: targetUserId,
          tenant_id: invitation.tenant_id,
          nombre: employeeName,
          email: invitation.email.toLowerCase(),
          password: "***",
          rol: role,
          activo: true,
          permisos: invitation.permisos || ["dashboard", "nueva-orden", "ordenes", "procesos", "caja", "clientes"],
          max_descuento_porcentaje: role === "ADMIN" ? 100 : 10,
          creado_en: new Date().toISOString(),
        });
      }

      await adminClient.from("employee_invitations").update({
        status: "accepted",
        auth_user_id: targetUserId,
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", invitation.id);

      const { data: tenant } = await adminClient
        .from("tenants")
        .select("slug, nombre")
        .eq("id", invitation.tenant_id)
        .maybeSingle();

      return {
        success: true,
        slug: tenant?.slug || null,
        tenantName: tenant?.nombre || null,
      };
    } catch (err: any) {
      console.error("Error en acceptEmployeeInvitationServer:", err);
      throw new Error(err.message || "Error procesando la invitación");
    }
  });

export const getEmpleadoByIdServer = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://api.klynn.com.do";
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
      if (!serviceRoleKey || !data?.id) return null;

      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: emp } = await adminClient
        .from("empleados")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();

      return emp || null;
    } catch (err) {
      console.warn("Error en getEmpleadoByIdServer:", err);
      return null;
    }
  });

export const getEmpleadoByEmailAndTenantServer = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; tenantId: string }) => data)
  .handler(async ({ data }) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://api.klynn.com.do";
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
      if (!serviceRoleKey || !data?.email || !data?.tenantId) return null;

      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: emp } = await adminClient
        .from("empleados")
        .select("*")
        .ilike("email", data.email)
        .eq("tenant_id", data.tenantId)
        .maybeSingle();

      return emp || null;
    } catch (err) {
      console.warn("Error en getEmpleadoByEmailAndTenantServer:", err);
      return null;
    }
  });

export const getTenantsForUserServer = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; userId?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://api.klynn.com.do";
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
      if (!serviceRoleKey || !data?.email) return [];

      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: emps } = await adminClient
        .from("empleados")
        .select("*")
        .ilike("email", data.email.trim())
        .eq("activo", true);

      if (!emps || emps.length === 0) return [];

      const tenantIds = emps.map((e) => e.tenant_id);
      const { data: tenants } = await adminClient
        .from("tenants")
        .select("*")
        .in("id", tenantIds);

      return (tenants || []).map((t) => {
        const emp = emps.find((e) => e.tenant_id === t.id);
        return {
          tenant: t,
          empleado: emp,
        };
      });
    } catch (err) {
      console.warn("Error en getTenantsForUserServer:", err);
      return [];
    }
  });

export const getTenantBySlugServer = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://api.klynn.com.do";
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
      if (!serviceRoleKey || !data?.slug) return null;

      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: tenant } = await adminClient
        .from("tenants")
        .select("*")
        .eq("slug", data.slug.toLowerCase().trim())
        .maybeSingle();

      return tenant || null;
    } catch (err) {
      console.warn("Error en getTenantBySlugServer:", err);
      return null;
    }
  });

