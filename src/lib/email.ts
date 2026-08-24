import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export interface SendWelcomeEmailParams {
  to: string;
  adminNombre: string;
  nombreLavanderia: string;
  tenantSlug: string;
}

export const sendWelcomeEmailServer = createServerFn({ method: "POST" })
  .inputValidator((data: SendWelcomeEmailParams) => data)
  .handler(async ({ data }) => {
    try {
      const { to, adminNombre, nombreLavanderia, tenantSlug } = data;
      const resendApiKey = process.env.RESEND_API_KEY || (import.meta as any).env?.VITE_RESEND_API_KEY || "";
      const tenantUrl = `https://${tenantSlug}.klynn.app`;
      const appUrl = `https://klynn.com.do/t/${tenantSlug}`;

      const htmlContent = `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>¡Bienvenido a Klynn Cloud!</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
  <style type="text/css">
    body { margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; border: none !important; border-radius: 0 !important; }
      .fluid-padding { padding-left: 18px !important; padding-right: 18px !important; }
      .btn-primary { width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #F8FAFC; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="480" class="email-container" style="max-width: 480px; width: 100%; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);">
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #1B4B73 0%, #0284C7 60%, #F0B900 100%); line-height: 4px; font-size: 4px;">&nbsp;</td>
          </tr>
          <tr>
            <td align="center" style="padding: 30px 24px 18px 24px;">
              <a href="https://klynn.com.do" target="_blank" style="text-decoration: none; display: inline-block;">
                <img src="https://api.klynn.com.do/storage/v1/object/public/assets/logotipo-klynn.png" alt="Klynn" width="205" style="display: block; width: 205px; max-width: 205px; height: auto; margin: 0 auto; border: 0;" />
              </a>
              <p style="margin: 6px 0 0 0; font-size: 12px; font-weight: 600; color: #64748B; letter-spacing: -0.2px;">
                Tu lavandería, simplificada.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" class="fluid-padding" style="padding: 0 32px 14px 32px;">
              <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 14px;">
                <tr>
                  <td align="center" style="background-color: #EFF6FF; border: 1px solid #DBEAFE; border-radius: 6px; padding: 5px 14px;">
                    <span style="font-size: 10px; font-weight: 700; color: #1B4B73; text-transform: uppercase; letter-spacing: 0.8px;">
                      BIENVENIDO A KLYNN CLOUD
                    </span>
                  </td>
                </tr>
              </table>
              <h1 style="margin: 0 0 8px 0; font-size: 21px; font-weight: 800; color: #0F172A; letter-spacing: -0.4px; line-height: 1.25;">
                ¡Todo listo para <span style="color: #1B4B73;">${nombreLavanderia}</span>!
              </h1>
              <p style="margin: 0; font-size: 13px; line-height: 1.55; color: #475569;">
                Hola <strong style="color: #0F172A;">${adminNombre}</strong>, tu cuenta ya está activa. Hemos preparado tu panel de control para que comiences a operar hoy mismo.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" class="fluid-padding" style="padding: 4px 32px 18px 32px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; text-align: center;">
                <tr>
                  <td style="padding: 16px 14px;">
                    <div style="font-size: 12px; font-weight: 700; color: #1B4B73; margin-bottom: 10px; word-break: break-all;">
                      ${tenantUrl}
                    </div>
                    <table border="0" cellpadding="0" cellspacing="0" align="center">
                      <tr>
                        <td align="center" style="border-radius: 10px; background-color: #1B4B73;">
                          <a href="${appUrl}" target="_blank" class="btn-primary" style="display: inline-block; padding: 11px 26px; font-size: 13px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px; background-color: #1B4B73; border: 1px solid #1B4B73;">
                            Ingresar a mi lavandería &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="fluid-padding" style="padding: 0 32px 24px 32px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 12px 16px; background-color: #F8FAFC; border-bottom: 1px solid #E2E8F0;">
                    <span style="font-size: 11px; font-weight: 800; color: #1B4B73; text-transform: uppercase; letter-spacing: 0.6px;">
                      Primeros pasos para comenzar
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #F1F5F9;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td width="30" valign="top" style="padding-right: 12px;">
                          <div style="width: 24px; height: 24px; border-radius: 6px; background-color: #EFF6FF; border: 1px solid #DBEAFE; text-align: center; line-height: 22px; font-size: 11px; font-weight: 800; color: #1B4B73;">1</div>
                        </td>
                        <td valign="middle">
                          <div style="font-size: 12px; font-weight: 700; color: #0F172A; margin-bottom: 2px;">Configura tus precios</div>
                          <p style="margin: 0; font-size: 11px; line-height: 1.4; color: #64748B;">Personaliza tu catálogo de servicios (lavado, secado, planchado o por libras).</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #F1F5F9;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td width="30" valign="top" style="padding-right: 12px;">
                          <div style="width: 24px; height: 24px; border-radius: 6px; background-color: #EFF6FF; border: 1px solid #DBEAFE; text-align: center; line-height: 22px; font-size: 11px; font-weight: 800; color: #1B4B73;">2</div>
                        </td>
                        <td valign="middle">
                          <div style="font-size: 12px; font-weight: 700; color: #0F172A; margin-bottom: 2px;">Registra a tu primer cliente</div>
                          <p style="margin: 0; font-size: 11px; line-height: 1.4; color: #64748B;">Guarda su teléfono y RNC/Cédula para facturación y avisos de WhatsApp.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td width="30" valign="top" style="padding-right: 12px;">
                          <div style="width: 24px; height: 24px; border-radius: 6px; background-color: #EFF6FF; border: 1px solid #DBEAFE; text-align: center; line-height: 22px; font-size: 11px; font-weight: 800; color: #1B4B73;">3</div>
                        </td>
                        <td valign="middle">
                          <div style="font-size: 12px; font-weight: 700; color: #0F172A; margin-bottom: 2px;">Crea tu primera orden</div>
                          <p style="margin: 0; font-size: 11px; line-height: 1.4; color: #64748B;">Recibe las prendas, genera el comprobante fiscal y entrega el ticket.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 16px 24px; border-top: 1px solid #F1F5F9; background-color: #FFFFFF;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #64748B;">
                Klynn Cloud &bull; <a href="mailto:soporte@klynn.com.do" style="color: #1B4B73; text-decoration: none;">soporte@klynn.com.do</a>
              </p>
              <p style="margin: 0; font-size: 10px; color: #94A3B8;">
                &copy; 2026 Klynn. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Klynn <soporte@klynn.com.do>",
          to: [to],
          subject: `¡Bienvenido a Klynn Cloud, ${nombreLavanderia}!`,
          html: htmlContent,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.warn("[Resend] Error al enviar email de bienvenida:", errData);
        return { success: false, error: errData };
      }

      const resData = await res.json();
      console.log("[Resend] ✅ Email de bienvenida enviado exitosamente:", resData?.id);
      return { success: true, id: resData?.id };
    } catch (err: any) {
      console.warn("[Resend] Error en sendWelcomeEmailServer:", err);
      return { success: false, error: err?.message || String(err) };
    }
  });

export async function sendWelcomeEmail(params: SendWelcomeEmailParams) {
  try {
    const result = await sendWelcomeEmailServer({ data: params });
    return result.success;
  } catch (err) {
    console.warn("[Resend] Error invocando server function sendWelcomeEmail:", err);
    return false;
  }
}

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

      // 1. Extraer o validar token
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

      // 2. Buscar la invitación pendiente
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

      // 3. Obtener el ID del usuario
      const targetUserId = userId || invitation.auth_user_id;

      // 4. Si hay contraseña y usuario, actualizar contraseña usando la service_role key
      if (password && targetUserId) {
        const { error: pwdErr } = await adminClient.auth.admin.updateUserById(targetUserId, {
          password: password,
          email_confirm: true,
        });
        if (pwdErr) {
          throw new Error(pwdErr.message || "No se pudo actualizar la contraseña");
        }
      }

      // 5. Activar empleado en public.empleados
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

      // 6. Marcar invitación como aceptada
      await adminClient.from("employee_invitations").update({
        status: "accepted",
        auth_user_id: targetUserId,
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", invitation.id);

      // 7. Obtener slug del tenant
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



