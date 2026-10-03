import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import {
  EF2_BASE_URL,
  EF2_DEFAULT_TEST_USERNAME,
  EF2_DEFAULT_TEST_TOKEN,
} from "./ef2-constants";
import type { EF2Action, EF2Environment } from "./ef2-client";

export interface ExecuteEF2ServerParams {
  action: EF2Action;
  payload?: any;
  tenantId?: string;
  environment?: EF2Environment;
  credentials?: { token?: string; username?: string };
}

export interface ExecuteEF2ServerResult {
  ok: boolean;
  data?: any;
  error?: string;
}

function getSupabaseConfig() {
  const url = process.env.VITE_SUPABASE_URL || "https://api.klynn.com.do";
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    "";
  if (!serviceKey) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en el servidor.");
  }
  return { url, serviceKey };
}

/**
 * Función de servidor (TanStack Start / Nitro SSR) que ejecuta operaciones
 * con la API de EF2 de forma autorizada y segura mediante SUPABASE_SERVICE_ROLE_KEY.
 *
 * Esta función garantiza que las emisiones fiscales (e-CF), reintentos y consultas
 * NUNCA fallen por expiración de token JWT en el navegador del usuario.
 */
export const executeEF2ServerFn = createServerFn({ method: "POST" })
  .validator((data: ExecuteEF2ServerParams) => data)
  .handler(async ({ data }): Promise<ExecuteEF2ServerResult> => {
    try {
      const { url, serviceKey } = getSupabaseConfig();
      const { action, payload, tenantId, environment, credentials } = data;

      // 1. INTENTO PRIMARIO: Invocar la Edge Function ef2-proxy autenticado con Service Role Key
      try {
        const proxyUrl = `${url.replace(/\/+$/, "")}/functions/v1/ef2-proxy`;
        const proxyRes = await fetch(proxyUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            action,
            payload,
            tenantId,
            environment,
            credentials,
          }),
        });

        if (proxyRes.ok) {
          const proxyData = await proxyRes.json();
          if (proxyData && proxyData.success !== false) {
            return { ok: true, data: proxyData };
          }
          if (proxyData && proxyData.error) {
            // Si la API devolvió un error de validación de comprobante o datos, retornar ese error
            return { ok: false, error: proxyData.message || proxyData.error };
          }
        } else {
          const errText = await proxyRes.text().catch(() => "");
          console.warn(`[executeEF2ServerFn] ef2-proxy HTTP ${proxyRes.status}: ${errText}`);
        }
      } catch (proxyErr: any) {
        console.warn("[executeEF2ServerFn] Error al invocar ef2-proxy:", proxyErr?.message || proxyErr);
      }

      // 2. INTENTO SECUNDARIO (Fallback directo de alta disponibilidad):
      // Si ef2-proxy en api.klynn.com.do no respondió o dio error de proxy,
      // el servidor Nitro ejecuta la lógica de EF2 directamente usando la base de datos.
      console.log(`[executeEF2ServerFn] Ejecutando acción '${action}' directamente en servidor para tenant:`, tenantId);

      const supabase = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // Leer ecf_config y credenciales del tenant
      let tenantConfig: any = null;
      if (tenantId) {
        const { data: configRows } = await supabase
          .from("ecf_config")
          .select("tenant_id,rnc_emisor,razon_social,ef2_username,ef2_environment,ef2_credentials_owner,ambiente,is_active")
          .eq("tenant_id", tenantId)
          .limit(1);

        const { data: credRows } = await supabase
          .from("ecf_provider_credentials")
          .select("username,secret")
          .eq("tenant_id", tenantId)
          .eq("provider", "ef2")
          .limit(1);

        if (configRows && configRows[0]) {
          tenantConfig = {
            ...configRows[0],
            ef2_username: credRows?.[0]?.username || configRows[0].ef2_username,
            ef2_token: credRows?.[0]?.secret || null,
          };
        }
      }

      // Resolver ambiente efectivo
      let effectiveEnv: EF2Environment = "TesteCF";
      const { data: globalConfig } = await supabase
        .from("global_config")
        .select("fiscal_environment_policy")
        .eq("id", 1)
        .maybeSingle();

      const globalPolicy = globalConfig?.fiscal_environment_policy;
      if (globalPolicy === "TesteCF" || globalPolicy === "CerteCF" || globalPolicy === "eCF") {
        effectiveEnv = globalPolicy;
      } else if (environment === "TesteCF" || environment === "CerteCF" || environment === "eCF") {
        effectiveEnv = environment;
      } else if (tenantConfig?.ef2_environment === "TesteCF" || tenantConfig?.ef2_environment === "CerteCF" || tenantConfig?.ef2_environment === "eCF") {
        effectiveEnv = tenantConfig.ef2_environment;
      } else if (tenantConfig?.ambiente === "produccion") {
        effectiveEnv = "eCF";
      }

      // Resolver credenciales EF2
      const isVerification = action === "verificar_token";
      const isSaving = action === "guardar_credenciales";
      const explicitToken = isVerification
        ? String(credentials?.token || "").trim()
        : isSaving
          ? String(payload?.token || "").trim()
          : "";
      const explicitUsername = isVerification
        ? String(credentials?.username || "").trim()
        : isSaving
          ? String(payload?.username || "").trim()
          : "";

      const activeToken = explicitToken || String(tenantConfig?.ef2_token || "").trim();
      const activeUsername = explicitUsername || String(tenantConfig?.ef2_username || "").trim();

      const resolvedToken = activeToken || (effectiveEnv !== "eCF" ? EF2_DEFAULT_TEST_TOKEN : "");
      if (!resolvedToken) {
        return {
          ok: false,
          error: "Configura un token EF2 válido antes de operar en producción.",
        };
      }

      // Helper para llamadas HTTP a EF2 API
      const callEF2Direct = async (path: string, method: "GET" | "POST" | "PUT" | "DELETE" = "GET", reqBody?: any) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 35000);
        try {
          const res = await fetch(`${EF2_BASE_URL}${path}`, {
            method,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resolvedToken}`,
            },
            body: method === "GET" ? undefined : JSON.stringify(reqBody || {}),
            signal: controller.signal,
          });

          const text = await res.text();
          let parsed: any;
          try {
            const jsonStart = text.indexOf("{");
            const jsonEnd = text.lastIndexOf("}");
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
              parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
            } else {
              parsed = text ? JSON.parse(text) : {};
            }
          } catch {
            parsed = { success: false, message: text || `EF2 respondió HTTP ${res.status}` };
          }

          if (!res.ok) {
            const errorMsg = parsed?.message || parsed?.error || `EF2 respondió HTTP ${res.status}`;
            throw new Error(errorMsg);
          }
          return parsed;
        } finally {
          clearTimeout(timeout);
        }
      };

      // Manejar la acción solicitada
      let result: any;

      switch (action) {
        case "verificar_token": {
          result = await callEF2Direct("/ecf_secuencia_api.php?resource=tipos_ecf");
          result = {
            success: result?.success !== false,
            message: "Token EF2 verificado correctamente",
            empresa: tenantConfig
              ? { nombre: tenantConfig.razon_social, rnc: tenantConfig.rnc_emisor }
              : undefined,
          };
          break;
        }

        case "guardar_credenciales": {
          if (!tenantId) return { ok: false, error: "tenantId es obligatorio." };
          const candidateToken = String(payload?.token || "").trim();
          const candidateUsername = String(payload?.username || "").trim();
          if (!candidateToken.startsWith("tok_")) {
            return { ok: false, error: "El token EF2 debe comenzar con tok_." };
          }
          const verification = await callEF2Direct("/ecf_secuencia_api.php?resource=tipos_ecf");
          if (verification?.success === false) {
            return { ok: false, error: verification?.message || "EF2 rechazó las credenciales." };
          }
          await supabase
            .from("ecf_provider_credentials")
            .upsert(
              {
                tenant_id: tenantId,
                provider: "ef2",
                username: candidateUsername || null,
                secret: candidateToken,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "tenant_id,provider" }
            );
          result = {
            success: true,
            message: "Credencial EF2 verificada y guardada con éxito.",
            empresa: verification?.empresa,
          };
          break;
        }

        case "procesar_factura": {
          if (!tenantId) return { ok: false, error: "tenantId es obligatorio para emitir e-CF." };
          const ecf = payload?.ECF;
          if (!ecf?.Encabezado?.IdDoc?.TipoeCF) {
            return { ok: false, error: "Falta ECF.Encabezado.IdDoc.TipoeCF en el payload." };
          }

          const idempotencyKey = `ef2:${tenantId}:${payload?._klynnOrderId || crypto.randomUUID()}:${ecf.Encabezado.IdDoc.TipoeCF}`;
          const cleanPayload = { ...payload };
          delete cleanPayload._klynnOrderId;

          // Registrar reserva idempotente
          try {
            await supabase
              .from("ecf_submission_idempotency")
              .upsert(
                { tenant_id: tenantId, idempotency_key: idempotencyKey, status: "processing" },
                { onConflict: "tenant_id,idempotency_key" }
              );
          } catch {}

          try {
            result = await callEF2Direct("/procesar_factura.php", "POST", cleanPayload);

            if (result?.success === false) {
              await supabase
                .from("ecf_submission_idempotency")
                .delete()
                .eq("tenant_id", tenantId)
                .eq("idempotency_key", idempotencyKey)
                .catch(() => {});
              return { ok: false, error: result?.message || result?.error || "EF2 rechazó los datos del comprobante." };
            }

            await supabase
              .from("ecf_submission_idempotency")
              .update({
                status: "completed",
                response: result,
                updated_at: new Date().toISOString(),
              })
              .eq("tenant_id", tenantId)
              .eq("idempotency_key", idempotencyKey)
              .catch(() => {});
          } catch (emitErr: any) {
            await supabase
              .from("ecf_submission_idempotency")
              .delete()
              .eq("tenant_id", tenantId)
              .eq("idempotency_key", idempotencyKey)
              .catch(() => {});
            throw emitErr;
          }
          break;
        }

        case "consultar_secuencias":
          result = await callEF2Direct("/ecf_secuencia_api.php");
          break;

        case "consultar_tipos_ecf":
          result = await callEF2Direct(
            `/ecf_secuencia_api.php?resource=tipos_ecf${payload?.soloEmpresa ? "&filter=empresa" : ""}`
          );
          break;

        case "consultar_prefijo":
          result = await callEF2Direct(
            `/ecf_secuencia_api.php?prefijo=${encodeURIComponent(payload?.prefijo || "")}`
          );
          break;

        case "disponibilidad_prefijo":
          result = await callEF2Direct(
            `/ecf_secuencia_api.php?disponibilidad_prefijo=${encodeURIComponent(payload?.prefijo || "")}`
          );
          break;

        case "crear_secuencia":
          result = await callEF2Direct("/ecf_secuencia_api.php", "POST", payload);
          break;

        case "actualizar_secuencia":
          result = await callEF2Direct("/ecf_secuencia_api.php", "PUT", payload);
          break;

        case "eliminar_secuencia":
          result = await callEF2Direct("/ecf_secuencia_api.php", "DELETE", payload);
          break;

        case "auditoria_factura": {
          const params = new URLSearchParams();
          for (const key of [
            "encf",
            "id_factura",
            "track_id",
            "monto_esperado",
            "incluir_xml_dgii",
            "incluir_notas",
            "solo_montos",
            "incluir_payload",
            "incluir_xml",
          ]) {
            if (payload?.[key] !== undefined && payload?.[key] !== null && payload?.[key] !== "") {
              params.set(key, String(payload[key]));
            }
          }
          result = await callEF2Direct(`/auditoria_factura.php?${params.toString()}`);
          break;
        }

        case "auditoria_lote":
          result = await callEF2Direct("/auditoria_factura.php", "POST", payload);
          break;

        default:
          return { ok: false, error: `Acción EF2 no soportada: ${action}` };
      }

      return { ok: true, data: result };
    } catch (err: any) {
      console.error("[executeEF2ServerFn] Error fatal en ejecución EF2:", err?.message || err);
      return { ok: false, error: err?.message || "Error al procesar la operación fiscal en el servidor" };
    }
  });
