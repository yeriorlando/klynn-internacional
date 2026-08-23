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

    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) return json({ error: "No autorizado" }, 401);

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await callerClient.auth.getUser();
    const caller = userData?.user;
    if (userError || !caller) return json({ error: "Sesión inválida" }, 401);

    const body = await req.json();
    const tenantId = String(body?.tenantId || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const redirectTo = String(body?.redirectTo || "").trim();
    if (!tenantId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Correo o tenant inválido" }, 400);
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

    const permissions = Array.isArray(callerEmployee.permisos) ? callerEmployee.permisos : [];
    const canInvite = callerEmployee.rol === "ADMIN" ||
      callerEmployee.rol === "SUPERVISOR" ||
      permissions.includes("personal");
    if (!canInvite) return json({ error: "No tienes permiso para invitar empleados" }, 403);

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
      .select("id,nombre,slug")
      .eq("id", tenantId)
      .single();
    if (tenantError || !tenant) return json({ error: "Lavandería no encontrada" }, 404);

    const { data: invitation, error: invitationError } = await adminClient
      .from("employee_invitations")
      .insert({ tenant_id: tenantId, email, invited_by: caller.id })
      .select("id,email,status,expires_at,created_at")
      .single();
    if (invitationError || !invitation) {
      return json({ error: invitationError?.message || "No se pudo crear la invitación" }, 400);
    }

    const safeRedirect = redirectTo.startsWith("https://") || redirectTo.startsWith("http://localhost")
      ? redirectTo
      : "https://klynn.com.do/restablecer-contrasena?invitation=1";
    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: safeRedirect,
      data: {
        employee_invitation_id: invitation.id,
        tenant_id: tenantId,
        tenant_name: tenant.nombre,
        tenant_slug: tenant.slug,
        rol: "VENDEDOR",
      },
    });

    if (inviteError || !invited.user) {
      await adminClient
        .from("employee_invitations")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", invitation.id);
      return json({ error: inviteError?.message || "No se pudo enviar la invitación" }, 400);
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

