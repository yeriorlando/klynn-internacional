import { createServerFn } from "@tanstack/react-start";

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
