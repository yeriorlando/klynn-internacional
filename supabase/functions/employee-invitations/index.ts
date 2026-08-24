import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const ROLE_DEFAULTS: Record<string, string[]> = {
  ADMIN: ["dashboard", "nueva-orden", "ordenes", "procesos", "caja", "clientes", "catalogo", "personal", "logistica", "gastos", "reportes", "configuracion", "nota-credito", "nota-debito", "anular-orden", "condonar-deuda", "conversations"],
  SUPERVISOR: ["dashboard", "nueva-orden", "ordenes", "procesos", "caja", "clientes", "catalogo", "personal", "logistica", "gastos", "reportes", "conversations"],
  VENDEDOR: ["dashboard", "nueva-orden", "ordenes", "procesos", "caja", "clientes"],
  RECEPCIONISTA: ["dashboard", "nueva-orden", "ordenes", "clientes"],
  REPARTIDOR: ["dashboard", "ordenes", "logistica"],
  OPERARIO: ["dashboard", "ordenes", "procesos"],
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendResendInvitationEmail(params: {
  email: string;
  actionLink: string;
  tenantName: string;
  role: string;
}) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY no está configurada en Edge Functions");

  const templateUrl = Deno.env.get("INVITATION_TEMPLATE_URL") || "http://email-templates/email-invite.html";
  const templateResponse = await fetch(templateUrl);
  if (!templateResponse.ok) throw new Error("No se pudo cargar la plantilla de invitación");
  let html = await templateResponse.text();
  html = html
    .replaceAll("{{ .Data.tenant_name }}", escapeHtml(params.tenantName))
    .replaceAll("{{ .Data.rol }}", escapeHtml(params.role))
    .replaceAll("{{ .ConfirmationURL }}", params.actionLink);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("INVITATION_FROM") || "Klynn <soporte@klynn.com.do>",
      to: [params.email],
      subject: "Invitación: Te han invitado a Klynn",
      html,
    }),
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`No se pudo enviar la invitación: ${details}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ error: "Configuración incompleta de Supabase" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const authorization = req.headers.get("Authorization") || "";
    let rawJwt = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!rawJwt && body?.token) {
      rawJwt = String(body.token).trim();
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let caller: any = null;
    if (rawJwt) {
      try {
        const parts = rawJwt.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
          if (payload?.sub) {
            caller = {
              id: payload.sub,
              email: payload.email,
              user_metadata: payload.user_metadata || {},
            };
          }
        }
      } catch (e) {
        console.warn("Error parseando JWT:", e);
      }
    }

    if (!caller?.id) {
      return json({ error: "Sesión o token inválido" }, 401);
    }
    const action = String(body?.action || "create");
    const tenantId = String(body?.tenantId || "").trim();
    let email = String(body?.email || "").trim().toLowerCase();
    const redirectTo = String(body?.redirectTo || "").trim();
    let invitationId = String(body?.invitationId || "").trim();
    let requestedRole = String(body?.role || "VENDEDOR").toUpperCase();
    let requestedPermissions = Array.isArray(body?.permissions)
      ? body.permissions.map((permission: unknown) => String(permission)).filter(Boolean)
      : [];
    if (!tenantId || (action === "create" ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) : !invitationId)) {
      return json({ error: "Correo o tenant inválido" }, 400);
    }

    if (action === "accept") {
      const newPassword = String(body?.password || "").trim();

      const { data: invitation, error: invitationError } = await adminClient
        .from("employee_invitations")
        .select("id,tenant_id,email,status,rol,permisos,expires_at,auth_user_id")
        .eq("tenant_id", tenantId)
        .eq("status", "pending")
        .or(`auth_user_id.eq.${caller.id},email.ilike.${email || caller.email || ""}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (invitationError || !invitation) return json({ error: "Invitación pendiente no encontrada" }, 404);
      if (new Date(invitation.expires_at).getTime() <= Date.now()) {
        return json({ error: "La invitación ha vencido" }, 409);
      }

      // Si se proporcionó una contraseña, actualizarla con privilegios de admin
      if (newPassword) {
        const { error: pwdError } = await adminClient.auth.admin.updateUserById(caller.id, {
          password: newPassword,
          email_confirm: true,
        });
        if (pwdError) {
          console.error("Error al actualizar contraseña:", pwdError);
          return json({ error: pwdError.message || "No se pudo actualizar la contraseña" }, 400);
        }
      }

      const metadata = caller.user_metadata || {};
      const employeeName = String(metadata.nombre || caller.email?.split("@")[0] || "Empleado");
      const role = ROLE_DEFAULTS[invitation.rol] ? invitation.rol : "VENDEDOR";
      const permissions = Array.isArray(invitation.permisos) && invitation.permisos.length
        ? invitation.permisos
        : ROLE_DEFAULTS[role];
      const { error: employeeError } = await adminClient.from("empleados").upsert({
        id: caller.id,
        tenant_id: tenantId,
        nombre: employeeName,
        email: String(caller.email || invitation.email).toLowerCase(),
        password: "***",
        rol: role,
        activo: true,
        permisos: permissions,
        max_descuento_porcentaje: role === "ADMIN" ? 100 : 10,
        creado_en: new Date().toISOString(),
      });
      if (employeeError && !employeeError.message.toLowerCase().includes("duplicate")) {
        return json({ error: "No se pudo activar el empleado" }, 400);
      }
      await adminClient.from("employee_invitations").update({
        status: "accepted",
        auth_user_id: caller.id,
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", invitation.id);
      return json({ accepted: true, tenantId, invitationId: invitation.id });
    }

    const { data: callerEmployee, error: employeeError } = await adminClient
      .from("empleados")
      .select("id,tenant_id,rol,activo,permisos")
      .eq("id", caller.id)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (employeeError || !callerEmployee || !callerEmployee.activo) {
      return json({ error: "No tienes acceso a esta lavandería" }, 403);
    }

    const callerPermissions = Array.isArray(callerEmployee.permisos) ? callerEmployee.permisos : [];
    const canInvite = callerEmployee.rol === "ADMIN" ||
      callerEmployee.rol === "SUPERVISOR" ||
      callerPermissions.includes("personal");
    if (!canInvite) return json({ error: "No tienes permiso para invitar empleados" }, 403);

    if (action === "delete") {
      const { data: invitation, error: invitationError } = await adminClient
        .from("employee_invitations")
        .select("id,status,expires_at")
        .eq("id", invitationId)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (invitationError || !invitation) return json({ error: "Invitación no encontrada" }, 404);
      if (invitation.status !== "pending" || new Date(invitation.expires_at).getTime() > Date.now()) {
        return json({ error: "Solo se pueden eliminar invitaciones vencidas" }, 409);
      }

      const { data: deleted, error: deleteError } = await adminClient
        .from("employee_invitations")
        .delete()
        .eq("id", invitationId)
        .eq("tenant_id", tenantId)
        .select("id");
      if (deleteError) return json({ error: deleteError.message }, 400);
      if (!deleted?.length) return json({ error: "La invitación no fue eliminada" }, 409);
      return json({ deleted: true, id: invitationId });
    }

    let previousInvitation: any = null;
    if (action === "resend") {
      const { data, error: previousError } = await adminClient
        .from("employee_invitations")
        .select("id,email,status,rol,permisos,expires_at,auth_user_id")
        .eq("id", invitationId)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      previousInvitation = data;
      if ((!previousInvitation || previousError) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        const { data: invitationByEmail } = await adminClient
          .from("employee_invitations")
          .select("id,email,status,rol,permisos,expires_at,auth_user_id")
          .eq("tenant_id", tenantId)
          .ilike("email", email)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        previousInvitation = invitationByEmail;
        if (previousInvitation) invitationId = previousInvitation.id;
      }
      if (!previousInvitation || previousInvitation.status === "accepted") {
        return json({ error: "La invitación ya no está pendiente" }, 409);
      }
      email = String(previousInvitation.email).trim().toLowerCase();
      requestedRole = String(previousInvitation.rol || "VENDEDOR").toUpperCase();
      requestedPermissions = Array.isArray(previousInvitation.permisos)
        ? previousInvitation.permisos.map((permission: unknown) => String(permission)).filter(Boolean)
        : [];

      if (previousInvitation.status !== "pending") {
        const { data: latestPending } = await adminClient
          .from("employee_invitations")
          .select("id,email,status,rol,permisos,expires_at,auth_user_id")
          .eq("tenant_id", tenantId)
          .eq("status", "pending")
          .ilike("email", email)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latestPending) {
          previousInvitation = latestPending;
          invitationId = latestPending.id;
          requestedRole = String(latestPending.rol || "VENDEDOR").toUpperCase();
          requestedPermissions = Array.isArray(latestPending.permisos)
            ? latestPending.permisos.map((permission: unknown) => String(permission)).filter(Boolean)
            : [];
        }
      }

      const { error: cancelError } = await adminClient
        .from("employee_invitations")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", invitationId)
        .eq("status", "pending");
      if (cancelError) return json({ error: "No se pudo preparar el reenvío" }, 400);
    }

    const role = ROLE_DEFAULTS[requestedRole] ? requestedRole : "VENDEDOR";

    if (role === "ADMIN" && callerEmployee.rol !== "ADMIN") {
      return json({ error: "Solo un administrador puede invitar otro administrador" }, 403);
    }

    const allowedPermissions = new Set(Object.values(ROLE_DEFAULTS).flat());
    const permissions = role === "ADMIN"
      ? ROLE_DEFAULTS.ADMIN
      : [...new Set(requestedPermissions)].filter((permission) => allowedPermissions.has(permission));
    if (permissions.length === 0) {
      permissions.push(...ROLE_DEFAULTS[role]);
    }

    const { data: existingEmployee } = await adminClient
      .from("empleados")
      .select("id")
      .eq("tenant_id", tenantId)
      .ilike("email", email)
      .maybeSingle();
    if (existingEmployee) return json({ error: "Este correo ya pertenece a un empleado" }, 409);

    const { data: existingInvitation } = await adminClient
      .from("employee_invitations")
      .select("id,expires_at")
      .eq("tenant_id", tenantId)
      .eq("status", "pending")
      .ilike("email", email)
      .maybeSingle();
    if (existingInvitation) {
      const expired = new Date(existingInvitation.expires_at).getTime() <= Date.now();
      return json({
        error: expired
          ? "La invitación anterior venció. Cancélala antes de crear una nueva."
          : "Ya existe una invitación pendiente para este correo.",
      }, 409);
    }

    const { data: tenant, error: tenantError } = await adminClient
      .from("tenants")
      .select("id,nombre,slug,logo_url")
      .eq("id", tenantId)
      .single();
    if (tenantError || !tenant) return json({ error: "Lavandería no encontrada" }, 404);

    const { data: invitation, error: invitationError } = await adminClient
      .from("employee_invitations")
      .insert({ tenant_id: tenantId, email, invited_by: caller.id, rol: role, permisos: permissions })
      .select("id,email,status,expires_at,created_at")
      .single();
    if (invitationError || !invitation) {
      return json({ error: invitationError?.message || "No se pudo crear la invitación" }, 400);
    }

    const defaultRedirect = "https://klynn.com.do/restablecer-contrasena?invitation=1";
    let safeRedirect = defaultRedirect;
    try {
      const parsedRedirect = new URL(redirectTo || defaultRedirect);
      const isAllowedHost = parsedRedirect.hostname === "klynn.com.do" ||
        parsedRedirect.hostname === "localhost" ||
        parsedRedirect.hostname === "127.0.0.1";
      const isResetPath = parsedRedirect.pathname === "/restablecer-contrasena";
      if (isAllowedHost && isResetPath) {
        parsedRedirect.searchParams.set("invitation", "1");
        safeRedirect = parsedRedirect.toString();
      }
    } catch {
      safeRedirect = defaultRedirect;
    }
    const invitationMetadata = {
      employee_invitation_id: invitation.id,
      tenant_id: tenantId,
      tenant_name: tenant.nombre,
      tenant_slug: tenant.slug,
      tenant_logo_url: tenant.logo_url || null,
      rol: role,
      permisos: permissions,
    };
    let invited: any = null;
    let inviteError: any = null;

    if (action === "resend" && previousInvitation?.auth_user_id) {
      // GoTrue crea un usuario no confirmado en el primer envío y luego
      // inviteUserByEmail lo rechaza como "already registered". Generamos
      // un nuevo enlace para ese mismo usuario y lo enviamos con la plantilla
      // de Klynn, sin crear ni eliminar otro usuario.
      const { error: metadataError } = await adminClient.auth.admin.updateUserById(
        previousInvitation.auth_user_id,
        { user_metadata: invitationMetadata },
      );
      if (metadataError) {
        inviteError = new Error("No se pudo actualizar la invitación existente");
      } else {
        const { data: existingAuth } = await adminClient.auth.admin.getUserById(previousInvitation.auth_user_id);
        const generated = await adminClient.auth.admin.generateLink({
          type: existingAuth?.user?.email_confirmed_at ? "recovery" : "invite",
          email,
          options: { redirectTo: safeRedirect, data: invitationMetadata },
        });
        invited = generated.data;
        inviteError = generated.error;
        if (!inviteError && invited?.properties?.action_link) {
          try {
            await sendResendInvitationEmail({
              email,
              actionLink: invited.properties.action_link,
              tenantName: tenant.nombre,
              role,
            });
          } catch (error) {
            inviteError = error;
          }
        }
      }
    } else {
      const result = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: safeRedirect,
        data: invitationMetadata,
      });
      invited = result.data;
      inviteError = result.error;
    }

    if (inviteError || !invited.user) {
      await adminClient
        .from("employee_invitations")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", invitation.id);
      if (action === "resend" && previousInvitation) {
        await adminClient
          .from("employee_invitations")
          .update({
            status: "pending",
            expires_at: previousInvitation.expires_at,
            updated_at: new Date().toISOString(),
          })
          .eq("id", previousInvitation.id);
      }
      const rawError = inviteError?.message || "No se pudo enviar la invitación";
      const translatedError = rawError.toLowerCase().includes("already been registered") ||
        rawError.toLowerCase().includes("already registered")
        ? "Este correo ya tiene un usuario de acceso provisional. Usa Reenviar para generar un nuevo enlace."
        : rawError;
      return json({ error: translatedError }, 400);
    }

    await adminClient
      .from("employee_invitations")
      .update({ auth_user_id: invited.user.id, updated_at: new Date().toISOString() })
      .eq("id", invitation.id);

    return json({ invitation });
  } catch (error) {
    console.error("[employee-invitations]", error);
    return json({ error: error instanceof Error ? error.message : "Error inesperado" }, 500);
  }
});
