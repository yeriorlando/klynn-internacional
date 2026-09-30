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
      const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://api.klynncloud.com";
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

      let { data: invitation } = await invitationQuery
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Si no se encontró como 'pending', el trigger de base de datos 'tr_accept_employee_invitation'
      // pudo haberla marcado como 'accepted' al confirmar el correo en el primer clic.
      // Permitimos encontrar la invitación 'accepted' reciente para poder asignarle la contraseña al usuario.
      if (!invitation) {
        let acceptedQuery = adminClient
          .from("employee_invitations")
          .select("id,tenant_id,email,status,rol,permisos,expires_at,auth_user_id")
          .eq("status", "accepted");

        if (targetInvitationId) {
          acceptedQuery = acceptedQuery.eq("id", targetInvitationId);
        } else if (targetTenantId && userEmail) {
          acceptedQuery = acceptedQuery.eq("tenant_id", targetTenantId).ilike("email", userEmail);
        } else if (userEmail) {
          acceptedQuery = acceptedQuery.ilike("email", userEmail);
        }

        const { data: acceptedInv } = await acceptedQuery
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (acceptedInv) {
          invitation = acceptedInv;
        }
      }

      if (!invitation) {
        throw new Error("Invitación no encontrada o ya no está disponible.");
      }

      if (invitation.status === "pending" && new Date(invitation.expires_at).getTime() <= Date.now()) {
        throw new Error("La invitación ha vencido. Solicita una nueva invitación.");
      }

      let targetUserId = userId || invitation.auth_user_id;

      // Si no se obtuvo el targetUserId desde el token o la invitación, buscarlo en public.empleados
      if (!targetUserId && invitation.tenant_id && (userEmail || invitation.email)) {
        const emailToFind = (userEmail || invitation.email).toLowerCase();
        const { data: emp } = await adminClient
          .from("empleados")
          .select("id")
          .eq("tenant_id", invitation.tenant_id)
          .ilike("email", emailToFind)
          .maybeSingle();
        if (emp?.id) {
          targetUserId = emp.id;
        }
      }

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

      if (invitation.status !== "accepted" || (!invitation.auth_user_id && targetUserId)) {
        await adminClient.from("employee_invitations").update({
          status: "accepted",
          auth_user_id: targetUserId || invitation.auth_user_id,
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", invitation.id);
      }

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
      const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://api.klynncloud.com";
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
      const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://api.klynncloud.com";
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
      const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://api.klynncloud.com";
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

      // Sincronizar en caliente con horarios_laborales_sucursal
      let horariosMap = new Map();
      try {
        const { data: horariosDb } = await adminClient
          .from("horarios_laborales_sucursal")
          .select("*")
          .in("tenant_id", tenantIds);
        if (horariosDb) {
          horariosMap = new Map(horariosDb.map((h: any) => [h.tenant_id, h]));
        }
      } catch {}

      return (tenants || []).map((t) => {
        const emp = emps.find((e) => e.tenant_id === t.id);
        const hDb = horariosMap.get(t.id);
        const mergedConfig = { ...(t.config || {}) };
        if (hDb && hDb.activo) {
          mergedConfig.control_horario_activo = true;
          mergedConfig.horario_apertura = hDb.horario_apertura?.slice(0, 5) || mergedConfig.horario_apertura || "08:00";
          mergedConfig.horario_cierre = hDb.horario_cierre?.slice(0, 5) || mergedConfig.horario_cierre || "19:30";
          mergedConfig.dias_laborables = hDb.dias_laborables || mergedConfig.dias_laborables || [1, 2, 3, 4, 5, 6, 0];
        }
        return {
          tenant: { ...t, config: mergedConfig },
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
      const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://api.klynncloud.com";
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

      if (!tenant) return null;

      try {
        const { data: hDb } = await adminClient
          .from("horarios_laborales_sucursal")
          .select("*")
          .eq("tenant_id", tenant.id)
          .maybeSingle();
        if (hDb && hDb.activo) {
          tenant.config = {
            ...(tenant.config || {}),
            control_horario_activo: true,
            horario_apertura: hDb.horario_apertura?.slice(0, 5) || tenant.config?.horario_apertura || "08:00",
            horario_cierre: hDb.horario_cierre?.slice(0, 5) || tenant.config?.horario_cierre || "19:30",
            dias_laborables: hDb.dias_laborables || tenant.config?.dias_laborables || [1, 2, 3, 4, 5, 6, 0],
          };
        }
      } catch {}

      return tenant;
    } catch (err) {
      console.warn("Error en getTenantBySlugServer:", err);
      return null;
    }
  });

export const getTenantByIdServer = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://api.klynncloud.com";
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
      if (!serviceRoleKey || !data?.tenantId) return null;

      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: tenant } = await adminClient
        .from("tenants")
        .select("*")
        .eq("id", data.tenantId)
        .maybeSingle();

      if (!tenant) return null;

      try {
        const { data: hDb } = await adminClient
          .from("horarios_laborales_sucursal")
          .select("*")
          .eq("tenant_id", tenant.id)
          .maybeSingle();
        if (hDb && hDb.activo) {
          tenant.config = {
            ...(tenant.config || {}),
            control_horario_activo: true,
            horario_apertura: hDb.horario_apertura?.slice(0, 5) || tenant.config?.horario_apertura || "08:00",
            horario_cierre: hDb.horario_cierre?.slice(0, 5) || tenant.config?.horario_cierre || "19:30",
            dias_laborables: hDb.dias_laborables || tenant.config?.dias_laborables || [1, 2, 3, 4, 5, 6, 0],
          };
        }
      } catch {}

      return tenant;
    } catch (err) {
      console.warn("Error en getTenantByIdServer:", err);
      return null;
    }
  });

export const saveTenantConfigServer = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string; config: any }) => data)
  .handler(async ({ data }) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://api.klynncloud.com";
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
      if (!serviceRoleKey || !data?.tenantId) {
        return { ok: false, error: "Credenciales de servicio no disponibles" };
      }

      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // 1. Obtener la configuración actual de Supabase
      const { data: currentTenant, error: fetchErr } = await adminClient
        .from("tenants")
        .select("config")
        .eq("id", data.tenantId)
        .maybeSingle();

      if (fetchErr) {
        console.warn("Aviso al consultar tenant config en server:", fetchErr);
      }

      const currentConfig =
        currentTenant?.config && typeof currentTenant.config === "object"
          ? currentTenant.config
          : {};

      const mergedConfig = {
        ...currentConfig,
        ...data.config,
      };

      // 2. Actualizar columna config en tenants con service_role (bypassing RLS)
      const { error: updateErr } = await adminClient
        .from("tenants")
        .update({ config: mergedConfig })
        .eq("id", data.tenantId);

      if (updateErr) {
        console.error("Error en update tenants config en server:", updateErr);
        return { ok: false, error: updateErr.message };
      }

      // 3. Sincronizar tabla 'horarios_laborales_sucursal' si viene información de horario
      if (
        data.config.control_horario_activo !== undefined ||
        data.config.horario_apertura !== undefined ||
        data.config.horario_cierre !== undefined ||
        data.config.dias_laborables !== undefined
      ) {
        try {
          await adminClient.from("horarios_laborales_sucursal").upsert(
            {
              tenant_id: data.tenantId,
              activo: mergedConfig.control_horario_activo || false,
              horario_apertura: mergedConfig.horario_apertura || "08:00:00",
              horario_cierre: mergedConfig.horario_cierre || "19:30:00",
              dias_laborables: mergedConfig.dias_laborables || [1, 2, 3, 4, 5, 6],
              actualizado_en: new Date().toISOString(),
            },
            { onConflict: "tenant_id" }
          );
        } catch (e) {
          console.warn("Aviso en server sync horarios_laborales_sucursal:", e);
        }
      }

      return { ok: true, config: mergedConfig };
    } catch (err: any) {
      console.error("Error en saveTenantConfigServer:", err);
      return { ok: false, error: err?.message || "Error interno del servidor" };
    }
  });

export const consultarRNCServer = createServerFn({ method: "POST" })
  .inputValidator((data: { rnc: string }) => data)
  .handler(async ({ data }) => {
    try {
      const cleanRnc = String(data?.rnc || "").replace(/\D/g, "");
      if (!cleanRnc || (cleanRnc.length !== 9 && cleanRnc.length !== 11)) return null;
      const res = await fetch(`https://dgii-rnc.pronesoft.com/get/${cleanRnc}`, {
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.name) {
          return json;
        }
      }
    } catch (e) {
      console.warn("[consultarRNCServer] Error al consultar en dgii-rnc.pronesoft.com:", e);
    }
    return null;
  });



export interface SaveEmployeeServerParams {
  empleado: any;
  password?: string;
}

export const saveEmployeeServer = createServerFn({ method: "POST" })
  .inputValidator((data: SaveEmployeeServerParams) => data)
  .handler(async ({ data }) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://api.klynncloud.com";
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
      if (!serviceRoleKey || !data?.empleado) {
        return { ok: false, error: "Credenciales maestras del servidor no configuradas" };
      }

      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { empleado, password } = data;
      const emailLower = (empleado.email || "").toLowerCase().trim();

      if (!emailLower) {
        return { ok: false, error: "El correo electrónico es requerido" };
      }

      // 1. Localizar usuario en Supabase Auth
      const { data: listData, error: listErr } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (listErr) {
        console.error("[saveEmployeeServer] Error al listar usuarios Auth:", listErr);
        return { ok: false, error: "Error consultando Auth: " + listErr.message };
      }

      let authUser = listData?.users?.find((u) => u.email?.toLowerCase() === emailLower);

      if (!authUser) {
        // Crear nuevo usuario directamente en Auth con email auto-confirmado
        const tempPass =
          password && password.trim() && password !== "***"
            ? password.trim()
            : empleado.password && empleado.password !== "***"
            ? empleado.password
            : "tempPassword123!";

        console.log(`[saveEmployeeServer] Creando usuario en Auth para ${emailLower}...`);
        const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
          email: emailLower,
          password: tempPass,
          email_confirm: true,
          user_metadata: {
            nombre: empleado.nombre,
            tenant_id: empleado.tenant_id,
            rol: empleado.rol,
          },
        });

        if (createErr) {
          console.error("[saveEmployeeServer] Error al crear usuario en Auth:", createErr);
          return { ok: false, error: "Error al crear cuenta de acceso: " + createErr.message };
        }
        authUser = created.user;
      } else {
        // Usuario existente en Auth: sincronizar contraseña si se proporcionó una nueva
        const updateAttrs: any = {
          email_confirm: true,
          user_metadata: {
            ...(authUser.user_metadata || {}),
            nombre: empleado.nombre,
            tenant_id: empleado.tenant_id,
            rol: empleado.rol,
          },
        };

        if (password && password.trim().length >= 6 && password !== "***") {
          updateAttrs.password = password.trim();
        }

        console.log(`[saveEmployeeServer] Sincronizando usuario Auth ${authUser.id} para ${emailLower}...`);
        const { data: updated, error: updateErr } = await adminClient.auth.admin.updateUserById(
          authUser.id,
          updateAttrs
        );

        if (updateErr) {
          console.error("[saveEmployeeServer] Error al actualizar Auth user:", updateErr);
          return { ok: false, error: "Error al actualizar contraseña: " + updateErr.message };
        }
        authUser = updated.user;
      }

      const targetAuthId = authUser.id;

      // 2. Resolver inconsistencias en public.empleados (Auto-healing de ID)
      const { data: existingRows } = await adminClient
        .from("empleados")
        .select("id")
        .or(`email.ilike.${emailLower}${empleado.id && empleado.id !== targetAuthId ? `,id.eq.${empleado.id}` : ""}`);

      if (existingRows && existingRows.length > 0) {
        for (const row of existingRows) {
          if (row.id !== targetAuthId) {
            console.log(`[saveEmployeeServer] Limpiando fila vieja con ID desincronizado ${row.id} para ${emailLower}...`);
            await adminClient.from("empleados").delete().eq("id", row.id);
          }
        }
      }

      // 3. Upsert en public.empleados con el UUID de Auth oficial
      const dataToSave = {
        ...empleado,
        id: targetAuthId,
        email: emailLower,
        password: "***",
        nombre: empleado.nombre || "",
        apellido: empleado.apellido || "",
        pin: empleado.pin || "",
        avatar_url: empleado.avatar_url || null,
      };

      console.log(`[saveEmployeeServer] Guardando empleado en DB con ID ${targetAuthId}...`);
      let { error: dbError } = await adminClient.from("empleados").upsert(dataToSave);

      if (dbError && (dbError.message?.includes("metodo_pago") || (dbError as any).code === "PGRST204")) {
        const { metodo_pago, ...fallbackData } = dataToSave as any;
        const retry = await adminClient.from("empleados").upsert(fallbackData);
        dbError = retry.error;
      }

      if (dbError) {
        console.error("[saveEmployeeServer] Error en DB upsert:", dbError);
        return { ok: false, error: "Error al guardar en base de datos: " + dbError.message };
      }

      return { ok: true, empleado: dataToSave };
    } catch (err: any) {
      console.error("[saveEmployeeServer] Excepción:", err);
      return { ok: false, error: err?.message || "Error interno al guardar empleado" };
    }
  });

export const deleteEmployeeServer = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://api.klynncloud.com";
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
      if (!serviceRoleKey || !data?.id) return { ok: false };

      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // 0. Neutralizar trigger legacy en DB que intenta borrar el tenant si el email coincide
      await adminClient
        .from("empleados")
        .update({ email: `temp_del_${Date.now()}_${data.id.slice(0, 8)}@klynn.internal` })
        .eq("id", data.id);

      // 1. Borrar de empleados
      const { error: delEmpError } = await adminClient.from("empleados").delete().eq("id", data.id);
      if (delEmpError) {
        throw delEmpError;
      }

      // 2. Borrar de Auth si es un UUID válido
      if (data.id && data.id.length === 36) {
        try {
          await adminClient.auth.admin.deleteUser(data.id);
        } catch (authErr) {
          console.warn("Aviso al borrar de Auth en server:", authErr);
        }
      }

      return { ok: true };
    } catch (err: any) {
      console.warn("Error en deleteEmployeeServer:", err);
      return { ok: false, error: err?.message };
    }
  });
