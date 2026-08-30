import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const EF2_BASE_URL = "https://master.ef2.do/api2";
const EF2_TEST_USERNAME = "api_2buy_mliec4sb";
const EF2_TEST_TOKEN =
  "tok_e0f3065a8a7df34785d30b744bf4715b3c3b96759a1a7ca19f354817e4471e2e";
const ADMIN_EMAILS = new Set(["admin@klynn.com.do", "yeriorlando@gmail.com"]);

type EF2Environment = "TesteCF" | "CerteCF" | "eCF";
type RequestBody = {
  action: string;
  payload?: Record<string, any>;
  tenantId?: string;
  environment?: EF2Environment;
  credentials?: { username?: string; token?: string };
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function serviceConfig() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_KEY");
  if (!url || !serviceKey) throw new Error("Faltan credenciales internas de Supabase.");
  return {
    url,
    serviceKey,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
  };
}

async function authenticatedUser(req: Request) {
  const authorization = req.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) throw new Error("Sesión requerida.");
  const { url, serviceKey } = serviceConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: serviceKey, Authorization: authorization },
  });
  if (!response.ok) throw new Error("Sesión inválida o expirada.");
  return response.json();
}

async function authorizeTenant(user: any, tenantId?: string) {
  const email = String(user?.email || "").trim().toLowerCase();
  if (ADMIN_EMAILS.has(email)) return;
  if (!tenantId) throw new Error("tenantId es obligatorio.");
  const { url, headers } = serviceConfig();
  const employee = await fetch(
    `${url}/rest/v1/empleados?id=eq.${encodeURIComponent(user.id)}&tenant_id=eq.${encodeURIComponent(tenantId)}&select=id&limit=1`,
    { headers },
  );
  if (!employee.ok) throw new Error("No se pudo validar el acceso al tenant.");
  const rows = await employee.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("No tienes permiso para operar la configuración fiscal de este tenant.");
  }
}

async function getTenantConfig(tenantId?: string) {
  if (!tenantId) return null;
  const { url, headers } = serviceConfig();
  const [response, credentialsResponse] = await Promise.all([
    fetch(
      `${url}/rest/v1/ecf_config?tenant_id=eq.${encodeURIComponent(tenantId)}&select=tenant_id,rnc_emisor,razon_social,ef2_username,ef2_environment,ambiente,is_active&limit=1`,
      { headers },
    ),
    fetch(
      `${url}/rest/v1/ecf_provider_credentials?tenant_id=eq.${encodeURIComponent(tenantId)}&provider=eq.ef2&select=username,secret&limit=1`,
      { headers },
    ),
  ]);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`No se pudo leer la configuración EF2 (${response.status}): ${text}`);
  }
  const [config] = await response.json();
  if (!config) return null;
  const [credentials] = credentialsResponse.ok ? await credentialsResponse.json() : [];
  return credentials
    ? { ...config, ef2_username: credentials.username, ef2_token: credentials.secret }
    : config;
}

async function saveCredentials(tenantId: string, username: string, token: string) {
  const { url, headers } = serviceConfig();
  const response = await fetch(
    `${url}/rest/v1/ecf_provider_credentials?on_conflict=tenant_id,provider`,
    {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        tenant_id: tenantId,
        provider: "ef2",
        username: username || null,
        secret: token,
        updated_at: new Date().toISOString(),
      }),
    },
  );
  if (!response.ok) throw new Error(`No se pudo guardar la credencial EF2 (${response.status}).`);
}

async function effectiveEnvironment(requested?: EF2Environment, tenantConfig?: any, action?: string) {
  const { url, headers } = serviceConfig();
  try {
    const response = await fetch(
      `${url}/rest/v1/global_config?id=eq.1&select=fiscal_environment_policy&limit=1`,
      { headers },
    );
    if (response.ok) {
      const [globalConfig] = await response.json();
      const policy = globalConfig?.fiscal_environment_policy;
      if (policy === "TesteCF" || policy === "CerteCF" || policy === "eCF") return policy;
    }
  } catch {}
  if (
    (action === "verificar_token" || action === "guardar_credenciales") &&
    (requested === "TesteCF" || requested === "CerteCF" || requested === "eCF")
  ) {
    return requested;
  }
  const tenantEnvironment = tenantConfig?.ef2_environment;
  if (tenantEnvironment === "TesteCF" || tenantEnvironment === "CerteCF" || tenantEnvironment === "eCF") {
    return tenantEnvironment;
  }
  if (tenantConfig?.ambiente === "produccion") return "eCF";
  return requested === "CerteCF" || requested === "eCF" ? requested : "TesteCF";
}

function resolveCredentials(
  request: RequestBody,
  tenantConfig: any,
  environment: EF2Environment,
) {
  const isVerification = request.action === "verificar_token";
  const isSaving = request.action === "guardar_credenciales";
  const explicitToken = isVerification
    ? String(request.credentials?.token || "").trim()
    : isSaving
      ? String(request.payload?.token || "").trim()
      : "";
  const explicitUsername = isVerification
    ? String(request.credentials?.username || "").trim()
    : isSaving
      ? String(request.payload?.username || "").trim()
      : "";
  const token = explicitToken || String(tenantConfig?.ef2_token || "").trim();
  const username = explicitUsername || String(tenantConfig?.ef2_username || "").trim();
  if (token) return { token, username };
  if (environment !== "eCF") return { token: EF2_TEST_TOKEN, username: EF2_TEST_USERNAME };
  throw new Error("Configura un token EF2 válido antes de operar en producción.");
}

type Receipt = { status: "processing" | "completed" | "unknown"; response?: any };

async function reserveEmission(tenantId: string, key: string) {
  const { url, headers } = serviceConfig();
  const insert = await fetch(
    `${url}/rest/v1/ecf_submission_idempotency?on_conflict=tenant_id,idempotency_key`,
    {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify({ tenant_id: tenantId, idempotency_key: key, status: "processing" }),
    },
  );
  if (!insert.ok) {
    throw new Error("No se pudo reservar la emisión idempotente. Aplica la migración fiscal.");
  }
  const inserted = await insert.json();
  if (Array.isArray(inserted) && inserted.length > 0) return { reserved: true };
  const existing = await fetch(
    `${url}/rest/v1/ecf_submission_idempotency?tenant_id=eq.${encodeURIComponent(tenantId)}&idempotency_key=eq.${encodeURIComponent(key)}&select=status,response&limit=1`,
    { headers },
  );
  const [receipt] = existing.ok ? await existing.json() : [];
  return { reserved: false, receipt: receipt as Receipt | undefined };
}

async function finishEmission(
  tenantId: string,
  key: string,
  status: "completed" | "unknown",
  response?: any,
  errorMessage?: string,
) {
  const { url, headers } = serviceConfig();
  await fetch(
    `${url}/rest/v1/ecf_submission_idempotency?tenant_id=eq.${encodeURIComponent(tenantId)}&idempotency_key=eq.${encodeURIComponent(key)}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        status,
        response: response || null,
        error_message: errorMessage || null,
        updated_at: new Date().toISOString(),
      }),
    },
  );
}

async function releaseEmission(tenantId: string, key: string) {
  const { url, headers } = serviceConfig();
  await fetch(
    `${url}/rest/v1/ecf_submission_idempotency?tenant_id=eq.${encodeURIComponent(tenantId)}&idempotency_key=eq.${encodeURIComponent(key)}`,
    { method: "DELETE", headers },
  );
}

function queryValue(value: unknown) {
  if (typeof value === "boolean") return value ? "1" : "0";
  return String(value);
}

async function callEF2(
  path: string,
  token: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: unknown,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${EF2_BASE_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: method === "GET" ? undefined : JSON.stringify(body || {}),
      signal: controller.signal,
    });
    const text = await response.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { success: false, message: text || `EF2 respondió HTTP ${response.status}` };
    }
    if (!response.ok) {
      const message = data?.message || data?.error || `EF2 respondió HTTP ${response.status}`;
      const error = new Error(message) as Error & { status?: number; data?: any };
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Método no permitido" }, 405);

  try {
    const request = (await req.json()) as RequestBody;
    const user = await authenticatedUser(req);
    await authorizeTenant(user, request.tenantId);
    const tenantConfig = await getTenantConfig(request.tenantId);
    const environment = await effectiveEnvironment(request.environment, tenantConfig, request.action);
    const { token } = resolveCredentials(request, tenantConfig, environment);
    const payload = request.payload || {};
    let result: any;

    switch (request.action) {
      case "verificar_token":
        result = await callEF2("/ecf_secuencia_api.php?resource=tipos_ecf", token);
        result = {
          success: result?.success !== false,
          message: "Token EF2 verificado",
          empresa: tenantConfig
            ? { nombre: tenantConfig.razon_social, rnc: tenantConfig.rnc_emisor }
            : undefined,
        };
        break;

      case "guardar_credenciales": {
        if (!request.tenantId) throw new Error("tenantId es obligatorio.");
        const candidateToken = String(payload.token || "").trim();
        const candidateUsername = String(payload.username || "").trim();
        if (!candidateToken.startsWith("tok_")) {
          throw new Error("El token EF2 debe comenzar con tok_.");
        }
        const verification = await callEF2(
          "/ecf_secuencia_api.php?resource=tipos_ecf",
          candidateToken,
        );
        if (verification?.success === false) {
          throw new Error(verification?.message || "EF2 rechazó las credenciales.");
        }
        await saveCredentials(request.tenantId, candidateUsername, candidateToken);
        result = {
          success: true,
          message: "Credencial EF2 verificada y guardada de forma segura.",
          empresa: verification?.empresa,
        };
        break;
      }

      case "procesar_factura": {
        if (!request.tenantId) throw new Error("tenantId es obligatorio para emitir.");
        if (!tenantConfig?.is_active) throw new Error("La facturación electrónica no está activa.");
        const ecf = payload?.ECF;
        if (!ecf?.Encabezado?.IdDoc?.TipoeCF) throw new Error("Falta ECF.Encabezado.IdDoc.TipoeCF.");
        const idempotencyKey = `ef2:${request.tenantId}:${payload?._klynnOrderId || crypto.randomUUID()}:${ecf.Encabezado.IdDoc.TipoeCF}`;
        const cleanPayload = { ...payload };
        delete cleanPayload._klynnOrderId;
        const reservation = await reserveEmission(request.tenantId, idempotencyKey);
        if (!reservation.reserved) {
          if (reservation.receipt?.status === "completed" && reservation.receipt.response) {
            result = reservation.receipt.response;
            break;
          }
          throw new Error("Esta emisión ya fue iniciada; concilia su estado antes de reintentar.");
        }
        try {
          result = await callEF2("/procesar_factura.php", token, "POST", cleanPayload);
          if (result?.success === false) {
            const validationError = new Error(
              result?.message || result?.error || "EF2 rechazó los datos del comprobante.",
            ) as Error & { status?: number; data?: any };
            validationError.status = 422;
            validationError.data = result;
            throw validationError;
          }
          await finishEmission(request.tenantId, idempotencyKey, "completed", result);
        } catch (error: any) {
          // Errores de validación/autorización confirman que EF2 no aceptó el
          // documento y permiten corregirlo. Timeouts/5xx quedan en estado
          // unknown para impedir una emisión duplicada hasta conciliarla.
          if ([400, 401, 403, 422].includes(Number(error?.status))) {
            await releaseEmission(request.tenantId, idempotencyKey);
          } else {
            await finishEmission(request.tenantId, idempotencyKey, "unknown", undefined, error?.message);
          }
          throw error;
        }
        break;
      }

      case "consultar_secuencias":
        result = await callEF2("/ecf_secuencia_api.php", token);
        break;
      case "consultar_tipos_ecf":
        result = await callEF2(
          `/ecf_secuencia_api.php?resource=tipos_ecf${payload.soloEmpresa ? "&filter=empresa" : ""}`,
          token,
        );
        break;
      case "consultar_prefijo":
        result = await callEF2(
          `/ecf_secuencia_api.php?prefijo=${encodeURIComponent(payload.prefijo || "")}`,
          token,
        );
        break;
      case "disponibilidad_prefijo":
        result = await callEF2(
          `/ecf_secuencia_api.php?disponibilidad_prefijo=${encodeURIComponent(payload.prefijo || "")}`,
          token,
        );
        break;
      case "crear_secuencia":
        result = await callEF2("/ecf_secuencia_api.php", token, "POST", payload);
        break;
      case "actualizar_secuencia":
        result = await callEF2("/ecf_secuencia_api.php", token, "PUT", payload);
        break;
      case "eliminar_secuencia":
        result = await callEF2("/ecf_secuencia_api.php", token, "DELETE", payload);
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
          if (payload[key] !== undefined && payload[key] !== null && payload[key] !== "") {
            params.set(key, queryValue(payload[key]));
          }
        }
        if (!["encf", "id_factura", "track_id"].some((key) => params.has(key))) {
          throw new Error("La auditoría requiere encf, id_factura o track_id.");
        }
        result = await callEF2(`/auditoria_factura.php?${params.toString()}`, token);
        break;
      }
      case "auditoria_lote":
        result = await callEF2("/auditoria_factura.php", token, "POST", payload);
        break;
      default:
        return json({ success: false, error: `Acción EF2 desconocida: ${request.action}` }, 400);
    }

    return json(result);
  } catch (error: any) {
    const status = Number(error?.status);
    const responseStatus = Number.isInteger(status) && status >= 400 && status <= 599 ? status : 502;
    console.error("[ef2-proxy]", error?.message || error);
    return json(
      {
        success: false,
        error: error?.message || "Error interno en ef2-proxy",
        message: error?.data?.message || error?.message || "Error interno en ef2-proxy",
        details: error?.data?.errors,
      },
      responseStatus,
    );
  }
});
