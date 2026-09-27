import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export const NEUROAPI_BASE_URL = "https://api.neurochat.com.ec/api/v1/neuroapi";

export function buildNeuroApiUrl(path: string, apiKey: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const separator = cleanPath.includes("?") ? "&" : "?";
  return `${NEUROAPI_BASE_URL}${cleanPath}${separator}key=${encodeURIComponent(apiKey)}`;
}

export function buildNeuroApiHeaders(apiKey: string, extraHeaders?: Record<string, string>): Record<string, string> {
  return {
    "x-api-key": apiKey,
    "Authorization": `Bearer ${apiKey}`,
    ...(extraHeaders || {}),
  };
}

export interface CreateConnectSessionParams {
  tenantId: string;
  slug: string;
  returnUrl?: string;
  customApiKey?: string;
}

export interface SendNeuroAPIMessageParams {
  tenantId: string;
  to: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: "image" | "audio" | "video" | "document";
  fileName?: string;
  caption?: string;
  fromPhoneNumberId?: string;
  customApiKey?: string;
}

/**
 * Obtiene el cliente administrativo de Supabase del servidor
 */
function getAdminClient() {
  const supabaseUrl = 
    process.env.VITE_SUPABASE_URL || 
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_URL) || 
    "https://api.klynncloud.com";

  const key = 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.VITE_SUPABASE_ANON_KEY || 
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) || 
    "";

  if (!key) return null;
  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Obtiene la API Key de NeuroAPI (Tenant específica o Maestra de Klynn)
 */
let cachedMasterApiKey: { key: string; expiresAt: number } | null = null;

async function resolveNeuroAPIKey(tenantId: string, customApiKey?: string): Promise<string | null> {
  if (!customApiKey && cachedMasterApiKey && cachedMasterApiKey.expiresAt > Date.now()) {
    return cachedMasterApiKey.key;
  }
  if (customApiKey && customApiKey.trim().length > 0) {
    return customApiKey.trim();
  }

  // 1. Buscar en variable de entorno
  const envKey = 
    process.env.NEUROAPI_MASTER_KEY || 
    process.env.VITE_NEUROAPI_MASTER_KEY ||
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_NEUROAPI_MASTER_KEY);
  if (envKey && envKey.trim().length > 0) {
    return envKey.trim();
  }

  // 2. Buscar en tabla global_config de Supabase (donde Klynn almacena la configuración de administración)
  const client = getAdminClient();
  if (client) {
    try {
      const { data: globalRow, error } = await client
        .from("global_config")
        .select("bank_details")
        .eq("id", 1)
        .maybeSingle();

      if (!error && globalRow?.bank_details) {
        const bd = globalRow.bank_details as any;
        if (bd.neuroapi_master_api_key && bd.neuroapi_master_api_key.trim().length > 0) {
          const key = bd.neuroapi_master_api_key.trim();
          cachedMasterApiKey = { key, expiresAt: Date.now() + 10 * 60 * 1000 };
          return key;
        }
      }
    } catch (e) {
      console.warn("No se pudo leer neuroapi_master_api_key de global_config:", e);
    }

    // 3. Buscar si el tenant tiene configurada su propia API Key
    if (tenantId) {
      try {
        const { data: tenantRow } = await client
          .from("tenants")
          .select("config")
          .eq("id", tenantId)
          .maybeSingle();

        const wa = tenantRow?.config?.whatsapp;
        if (wa?.neuroapi_api_key && wa.neuroapi_api_key.trim().length > 0) {
          return wa.neuroapi_api_key.trim();
        }
      } catch (e) {
        console.warn("No se pudo leer neuroapi_api_key de tenant:", e);
      }
    }
  }

  return null;
}

/**
 * SERVER FUNCTION: Crea una sesión efímera en NeuroAPI para el popup de Facebook (Embedded Signup v4 con Coexistencia)
 */
export const createNeuroAPIConnectSessionServer = createServerFn({ method: "POST" })
  .inputValidator((data: CreateConnectSessionParams) => data)
  .handler(async ({ data }) => {
    try {
      const apiKey = await resolveNeuroAPIKey(data.tenantId, data.customApiKey);
      if (!apiKey) {
        return {
          ok: false,
          error: "API Key Maestra de NeuroAPI no configurada. Por favor configúrala en el panel de Administración (/admin) o en las variables de entorno.",
        };
      }

      const returnUrl = data.returnUrl || `https://klynncloud.com/t/${data.slug}/configuracion?tab=whatsapp&neuroapi_callback=1`;
      const webhookUrl = `https://api.klynncloud.com/functions/v1/meta-cloud-proxy`;
      const webhookSecret = "klynn_webhook_secret";

      const connectUrl = buildNeuroApiUrl("/connect/sessions", apiKey);
      const res = await fetch(connectUrl, {
        method: "POST",
        headers: buildNeuroApiHeaders(apiKey, { "Content-Type": "application/json" }),
        body: JSON.stringify({
          service_type: "whatsapp_cloud_api",
          return_url: returnUrl,
          webhook_url: webhookUrl,
          webhook_secret: webhookSecret,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json.success === false) {
        return {
          ok: false,
          error: json.message || json.error || `Error al crear sesión en NeuroAPI (HTTP ${res.status})`,
        };
      }

      // Guardar el session_id preliminar en la configuración del tenant
      const client = getAdminClient();
      if (client) {
        try {
          const { data: tenantRow } = await client
            .from("tenants")
            .select("config")
            .eq("id", data.tenantId)
            .maybeSingle();

          if (tenantRow?.config) {
            const updatedConfig = {
              ...tenantRow.config,
              whatsapp: {
                ...(tenantRow.config.whatsapp || {}),
                neuroapi_session_id: json.data?.session_id,
              },
            };
            await client.from("tenants").update({ config: updatedConfig }).eq("id", data.tenantId);
          }
        } catch (dbErr) {
          console.warn("Aviso al guardar session_id de NeuroAPI:", dbErr);
        }
      }

      return {
        ok: true,
        sessionId: json.data?.session_id,
        url: json.data?.url,
        expiresAt: json.data?.expires_at,
      };
    } catch (err: any) {
      console.error("Error en createNeuroAPIConnectSessionServer:", err);
      return { ok: false, error: err?.message || "Error interno al conectar con NeuroAPI" };
    }
  });

/**
 * SERVER FUNCTION: Verifica el estado del número conectado tras el Embedded Signup
 */
export const syncNeuroAPINumberServer = createServerFn({ method: "POST" })
  .inputValidator((data: { 
    tenantId: string; 
    customApiKey?: string;
    phoneNumberId?: string;
    phoneNumber?: string;
    verifiedName?: string;
  }) => data)
  .handler(async ({ data }) => {
    try {
      const client = getAdminClient();
      if (!client) {
        return { ok: false, error: "Cliente de base de datos no disponible" };
      }

      const apiKey = await resolveNeuroAPIKey(data.tenantId, data.customApiKey);

      const { data: tenantRow, error: tErr } = await client
        .from("tenants")
        .select("config")
        .eq("id", data.tenantId)
        .maybeSingle();

      if (tErr || !tenantRow) {
        return { ok: false, error: tErr?.message || "Tenant no encontrado" };
      }

      const currentWa = tenantRow.config?.whatsapp || {};
      let targetPhoneId = data.phoneNumberId?.trim() || currentWa.neuroapi_phone_number_id || currentWa.meta_phone_number_id;
      let targetPhone = data.phoneNumber?.trim() || currentWa.neuroapi_phone_number;
      let targetName = data.verifiedName?.trim() || currentWa.neuroapi_verified_name || "Klynn";
      let isVerifiedFromApi = false;

      // Consultar números activos en NeuroAPI mediante ?key= y headers
      if (apiKey) {
        try {
          const numbersUrl = buildNeuroApiUrl("/messaging/webhooks/numbers", apiKey);
          const numsRes = await fetch(numbersUrl, {
            headers: buildNeuroApiHeaders(apiKey),
          });
          const numsJson = await numsRes.json().catch(() => ({}));

          if (numsJson?.success && Array.isArray(numsJson.data) && numsJson.data.length > 0) {
            // 1. Coincidencia exacta por ID de número
            let matched = targetPhoneId
              ? numsJson.data.find((n: any) => String(n.phone_number_id).trim() === String(targetPhoneId).trim())
              : null;

            // 2. Coincidencia por teléfono si existe
            if (!matched && targetPhone) {
              const cleanTarget = targetPhone.replace(/\D/g, "");
              matched = numsJson.data.find((n: any) => String(n.phone_number || "").replace(/\D/g, "").includes(cleanTarget));
            }

            // 3. Si no hay coincidencia, tomar el número con token activo
            if (!matched) {
              matched = numsJson.data.find((n: any) => n.token_status === "active") || numsJson.data[0];
            }

            if (matched) {
              targetPhoneId = matched.phone_number_id;
              targetPhone = matched.phone_number || targetPhone;
              targetName = matched.waba_name || targetName;
              isVerifiedFromApi = true;

              // Registrar o actualizar automáticamente el webhook en NeuroAPI hacia meta-cloud-proxy
              if (matched.otp_phone_number_id) {
                const whUrl = buildNeuroApiUrl("/messaging/webhooks/api", apiKey);
                await fetch(whUrl, {
                  method: "POST",
                  headers: buildNeuroApiHeaders(apiKey, { "Content-Type": "application/json" }),
                  body: JSON.stringify({
                    otp_phone_number_id: matched.otp_phone_number_id,
                    url: "https://api.klynncloud.com/functions/v1/meta-cloud-proxy",
                    secret: "klynn_webhook_secret",
                    is_active: true,
                  }),
                }).catch(() => {});
              }
            }
          }
        } catch (apiErr) {
          console.warn("Aviso al consultar números en NeuroAPI:", apiErr);
        }
      }

      // Si tenemos un número confirmado (por API, por parámetros o ya registrado)
      if (targetPhoneId && (isVerifiedFromApi || data.phoneNumberId || currentWa.neuroapi_status === "connected")) {
        const updatedConfig = {
          ...tenantRow.config,
          whatsapp: {
            ...currentWa,
            provider: "neuroapi",
            enabled: true,
            neuroapi_status: "connected",
            neuroapi_is_coexistence: true,
            neuroapi_phone_number_id: targetPhoneId,
            meta_phone_number_id: targetPhoneId,
            neuroapi_phone_number: targetPhone || currentWa.neuroapi_phone_number,
            neuroapi_verified_name: targetName || "Klynn",
          },
        };

        await client.from("tenants").update({ config: updatedConfig }).eq("id", data.tenantId);

        return {
          ok: true,
          data: {
            phoneNumberId: targetPhoneId,
            phoneNumber: targetPhone || currentWa.neuroapi_phone_number,
            verifiedName: targetName || "Klynn",
          },
        };
      }

      // Si el registro previo en BD ya estaba conectado
      if (currentWa.neuroapi_status === "connected" && (currentWa.neuroapi_phone_number_id || currentWa.meta_phone_number_id)) {
        return {
          ok: true,
          data: {
            phoneNumberId: currentWa.neuroapi_phone_number_id || currentWa.meta_phone_number_id,
            phoneNumber: currentWa.neuroapi_phone_number,
            verifiedName: currentWa.neuroapi_verified_name || "Klynn",
          },
        };
      }

      return {
        ok: false,
        notConnected: true,
        error: "Aún no se ha completado la vinculación del número en Meta.",
      };
    } catch (err: any) {
      console.error("Error en syncNeuroAPINumberServer:", err);
      return { ok: false, error: err?.message || "Error al verificar estado" };
    }
  });


/**
 * SERVER FUNCTION: Desconectar NeuroAPI para el tenant
 */
export const disconnectNeuroAPIServer = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }) => {
    try {
      const client = getAdminClient();
      if (!client) return { ok: false, error: "Cliente Supabase no disponible" };

      const { data: tenantRow } = await client
        .from("tenants")
        .select("config")
        .eq("id", data.tenantId)
        .maybeSingle();

      if (tenantRow?.config) {
        const updatedConfig = {
          ...tenantRow.config,
          whatsapp: {
            ...(tenantRow.config.whatsapp || {}),
            provider: "klynn_connect", // Regresar a Klynn Connect por defecto
            neuroapi_status: "disconnected",
            neuroapi_phone_number_id: undefined,
            neuroapi_phone_number: undefined,
            neuroapi_waba_id: undefined,
          },
        };

        await client.from("tenants").update({ config: updatedConfig }).eq("id", data.tenantId);
      }

      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Error al desvincular NeuroAPI" };
    }
  });

/**
 * SERVER FUNCTION: Despachar mensaje por NeuroAPI
 */
export const sendNeuroAPIMessageServer = createServerFn({ method: "POST" })
  .inputValidator((data: SendNeuroAPIMessageParams) => data)
  .handler(async ({ data }) => {
    try {
      const apiKey = await resolveNeuroAPIKey(data.tenantId, data.customApiKey);
      if (!apiKey) {
        return { ok: false, error: "API Key de NeuroAPI no configurada" };
      }

      const cleanTo = data.to.replace(/\D/g, "");
      let resolvedMediaUrl = data.mediaUrl;

      // Si viene en base64 desde el navegador (/conversations), subir a Supabase Storage para obtener una URL pública HTTPS
      if (resolvedMediaUrl && resolvedMediaUrl.startsWith("data:")) {
        const client = getAdminClient();
        if (client) {
          try {
            const matches = resolvedMediaUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
              const contentType = matches[1];
              const base64Data = matches[2];
              const binaryStr = atob(base64Data);
              const bytes = new Uint8Array(binaryStr.length);
              for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
              }

              let ext = "bin";
              if (contentType.includes("jpeg") || contentType.includes("jpg")) ext = "jpg";
              else if (contentType.includes("png")) ext = "png";
              else if (contentType.includes("webp")) ext = "webp";
              else if (contentType.includes("pdf")) ext = "pdf";
              else if (contentType.includes("mp3") || contentType.includes("mpeg")) ext = "mp3";
              else if (contentType.includes("ogg")) ext = "ogg";
              else if (contentType.includes("mp4")) ext = "mp4";

              const storageFilename = `chat_${data.tenantId}_${Date.now()}.${ext}`;
              const filePath = `conversations/${storageFilename}`;

              const { error: uploadError } = await client.storage
                .from("catalogo")
                .upload(filePath, bytes, {
                  contentType,
                  upsert: true,
                });

              if (!uploadError) {
                const { data: publicUrlData } = client.storage
                  .from("catalogo")
                  .getPublicUrl(filePath);
                if (publicUrlData?.publicUrl) {
                  resolvedMediaUrl = publicUrlData.publicUrl;
                }
              }
            }
          } catch (uploadErr) {
            console.warn("No se pudo subir archivo a storage para NeuroAPI:", uploadErr);
          }
        }
      }

      // Determinar estructura según si es archivo multimedia/PDF o texto plano per documentación de NeuroAPI
      const bodyPayload: any = {
        to: cleanTo,
      };

      if (data.fromPhoneNumberId) {
        bodyPayload.from_phone_number_id = data.fromPhoneNumberId;
      }

      if (resolvedMediaUrl) {
        const mType = data.mediaType || (
          resolvedMediaUrl.match(/\.(jpg|jpeg|png|webp)($|\?)/i) ? "image" :
          resolvedMediaUrl.match(/\.(mp3|ogg|wav|m4a)($|\?)/i) ? "audio" :
          resolvedMediaUrl.match(/\.(mp4|mov|avi)($|\?)/i) ? "video" : "document"
        );

        bodyPayload.type = mType;

        if (mType === "image") {
          bodyPayload.image = {
            link: resolvedMediaUrl,
            caption: data.caption || data.text || "",
          };
        } else if (mType === "audio") {
          bodyPayload.audio = {
            link: resolvedMediaUrl,
          };
        } else if (mType === "video") {
          bodyPayload.video = {
            link: resolvedMediaUrl,
            caption: data.caption || data.text || "",
          };
        } else {
          bodyPayload.type = "document";
          bodyPayload.document = {
            link: resolvedMediaUrl,
            filename: data.fileName || "documento.pdf",
            caption: data.caption || data.text || "",
          };
        }
      } else {
        bodyPayload.type = "text";
        bodyPayload.text = {
          body: data.text || "",
          preview_url: false,
        };
      }

      const sendUrl = buildNeuroApiUrl("/messaging/send", apiKey);
      const res = await fetch(sendUrl, {
        method: "POST",
        headers: buildNeuroApiHeaders(apiKey, { "Content-Type": "application/json" }),
        body: JSON.stringify(bodyPayload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json.success === false) {
        return {
          ok: false,
          error: json.message || json.error || `Error en NeuroAPI (HTTP ${res.status})`,
          raw: json,
        };
      }

      return {
        ok: true,
        messageId: json.data?.message_id || json.message_id,
        mediaUrl: resolvedMediaUrl,
        raw: json,
      };
    } catch (err: any) {
      console.error("Error en sendNeuroAPIMessageServer:", err);
      return { ok: false, error: err?.message || "Error de red al enviar mensaje con NeuroAPI" };
    }
  });

export interface ResolveInboundWhatsAppMediaParams {
  messageIds?: string[];
  tenantId?: string;
  conversationId?: string;
}

let lastPurgeConversationMedia = 0;

/**
 * Purga automática de archivos multimedia temporales de WhatsApp en Supabase Storage
 * que superen las 24 horas de antigüedad.
 * Garantiza que las imágenes y audios se eliminen automáticamente sin ocupar espacio en disco.
 */
export async function purgeExpiredConversationMedia(client: any, maxAgeHours: number = 24) {
  const now = Date.now();
  // Throttle: como máximo una ejecución de limpieza cada 30 minutos
  if (now - lastPurgeConversationMedia < 30 * 60 * 1000) {
    return { skipped: true };
  }
  lastPurgeConversationMedia = now;

  try {
    const { data: files, error } = await client.storage
      .from("catalogo")
      .list("conversations", { limit: 1000, sortBy: { column: "created_at", order: "asc" } });

    if (error || !files || files.length === 0) {
      return { purged: 0 };
    }

    const cutoffMs = now - (maxAgeHours * 60 * 60 * 1000);
    const toDelete: string[] = [];

    for (const f of files) {
      if (f.name === ".emptyFolderPlaceholder") continue;
      const fileCreated = f.created_at ? new Date(f.created_at).getTime() : 0;
      // Si el archivo tiene más de 24 horas
      if (fileCreated > 0 && fileCreated < cutoffMs) {
        toDelete.push(`conversations/${f.name}`);
      }
    }

    if (toDelete.length > 0) {
      console.log(`[Storage Cleanup] Eliminando ${toDelete.length} archivos de WhatsApp mayores a ${maxAgeHours}h...`);
      await client.storage.from("catalogo").remove(toDelete);
    }

    return { purged: toDelete.length };
  } catch (err) {
    console.warn("[Storage Cleanup] Error durante purga de archivos expirados:", err);
    return { purged: 0, error: String(err) };
  }
}

/**
 * Servidor: Permite ejecutar manualmente la purga de multimedia expirada (>24h).
 */
export const purgeConversationMediaServer = createServerFn({ method: "POST" })
  .handler(async () => {
    const client = getAdminClient();
    if (!client) return { ok: false, error: "No client" };
    const res = await purgeExpiredConversationMedia(client, 24);
    return { ok: true, ...res };
  });

/**
 * Resuelve y descarga archivos multimedia (fotos, audios, documentos, videos)
 * recibidos por WhatsApp a través de NeuroAPI / Meta Cloud API.
 * Los almacena como caché temporal (purga automática cada 24 horas) para no consumir
 * espacio permanente en disco.
 */
export const resolveInboundWhatsAppMediaServer = createServerFn({ method: "POST" })
  .inputValidator((data: ResolveInboundWhatsAppMediaParams) => data)
  .handler(async ({ data }) => {
    try {
      const client = getAdminClient();
      if (!client) {
        return { ok: false, error: "No se pudo conectar a la base de datos" };
      }

      // Ejecutar purga de multimedia expirada (>24h) en segundo plano
      void purgeExpiredConversationMedia(client, 24);

      const apiKey = await resolveNeuroAPIKey(data.tenantId || "");
      if (!apiKey) {
        return { ok: false, error: "NeuroAPI no está configurado (falta API Key)" };
      }

      // Buscar mensajes que necesitan resolución
      let query = client
        .from("messages")
        .select("id, tenant_id, conversation_id, content, payload, role")
        .order("time", { ascending: false });

      if (data.messageIds && data.messageIds.length > 0) {
        query = query.in("id", data.messageIds);
      } else if (data.conversationId) {
        query = query.eq("conversation_id", data.conversationId).limit(30);
      } else if (data.tenantId) {
        query = query.eq("tenant_id", data.tenantId).limit(30);
      } else {
        return { ok: false, error: "Parámetros insuficientes" };
      }

      const { data: messages, error: fetchErr } = await query;
      if (fetchErr || !messages) {
        return { ok: false, error: fetchErr?.message || "Error al buscar mensajes" };
      }

      const resolved: Record<string, { ok: boolean; content?: string; mediaUrl?: string }> = {};

      for (const msg of messages) {
        const contentStr = String(msg.content || "");
        // Comprobar si necesita resolución
        const isUnresolved = 
          contentStr.includes("(imagen de WhatsApp)") || 
          contentStr.includes("(nota de voz)") || 
          contentStr.includes("(video de WhatsApp)") ||
          contentStr.includes("(documento de WhatsApp)") ||
          (contentStr.startsWith("[image]") && !contentStr.includes("http")) ||
          (contentStr.startsWith("[audio]") && !contentStr.includes("http")) ||
          (contentStr.startsWith("[video]") && !contentStr.includes("http")) ||
          (contentStr.startsWith("[document]") && !contentStr.includes("http"));

        if (!isUnresolved) continue;

        const payload = (msg.payload || {}) as any;
        let mediaId = "";
        let mediaType = "";
        let defaultFilename = "archivo";
        let caption = "";

        if (payload.image?.id) {
          mediaId = payload.image.id;
          mediaType = "image";
          defaultFilename = "imagen.jpg";
          caption = payload.image.caption || "";
        } else if (payload.audio?.id) {
          mediaId = payload.audio.id;
          mediaType = "audio";
          defaultFilename = "audio.ogg";
        } else if (payload.video?.id) {
          mediaId = payload.video.id;
          mediaType = "video";
          defaultFilename = "video.mp4";
          caption = payload.video.caption || "";
        } else if (payload.document?.id) {
          mediaId = payload.document.id;
          mediaType = "document";
          defaultFilename = payload.document.filename || "documento.pdf";
          caption = payload.document.caption || "";
        }

        if (!mediaId) {
          // Intentar obtener mediaId de URL si viniera en payload
          const directUrl = payload.image?.url || payload.audio?.url || payload.document?.url || payload.video?.url;
          if (directUrl && typeof directUrl === "string") {
            const midMatch = directUrl.match(/mid=([0-9]+)/);
            if (midMatch) mediaId = midMatch[1];
          }
        }

        if (!mediaId) {
          continue;
        }

        try {
          // Descargar de NeuroAPI según especificación oficial
          const mediaUrl = buildNeuroApiUrl(`/messaging/media/${mediaId}`, apiKey);
          const mediaRes = await fetch(mediaUrl, {
            headers: buildNeuroApiHeaders(apiKey)
          });

          if (!mediaRes.ok) {
            console.warn(`NeuroAPI media error for ${mediaId}: status ${mediaRes.status}`);
            continue;
          }

          const contentType = mediaRes.headers.get("content-type") || (
            mediaType === "image" ? "image/jpeg" :
            mediaType === "audio" ? "audio/ogg" :
            mediaType === "video" ? "video/mp4" : "application/pdf"
          );

          let ext = "bin";
          if (contentType.includes("jpeg") || contentType.includes("jpg")) ext = "jpg";
          else if (contentType.includes("png")) ext = "png";
          else if (contentType.includes("webp")) ext = "webp";
          else if (contentType.includes("ogg")) ext = "ogg";
          else if (contentType.includes("mp3") || contentType.includes("mpeg")) ext = "mp3";
          else if (contentType.includes("mp4")) ext = "mp4";
          else if (contentType.includes("pdf")) ext = "pdf";

          const arrayBuffer = await mediaRes.arrayBuffer();
          const bytes = Buffer.from(arrayBuffer);

          const storageFilename = `inbound_${mediaId}.${ext}`;
          const filePath = `conversations/${storageFilename}`;

          const { error: uploadError } = await client.storage
            .from("catalogo")
            .upload(filePath, bytes, {
              contentType,
              upsert: true,
            });

          if (uploadError) {
            console.error("Error subiendo media inbound a storage:", uploadError);
            continue;
          }

          const { data: publicUrlData } = client.storage
            .from("catalogo")
            .getPublicUrl(filePath);

          const publicUrl = publicUrlData?.publicUrl;
          if (!publicUrl) continue;

          // Extraer cualquier caption previo en contentStr si no viene en payload
          if (!caption && contentStr.includes("\n")) {
            caption = contentStr.split("\n").slice(1).join("\n").trim();
          }

          const filename = defaultFilename.includes(".") ? defaultFilename : `${defaultFilename}.${ext}`;
          const newContent = `[${mediaType}] ${publicUrl}|${filename}${caption ? '\n' + caption : ''}`;

          // Actualizar en BD
          await client
            .from("messages")
            .update({ content: newContent })
            .eq("id", msg.id);

          // Actualizar conversación si last_msg coincide
          await client
            .from("conversations")
            .update({
              last_msg: `📎 ${mediaType === 'image' ? '📷 Imagen' : mediaType === 'video' ? '🎥 Video' : mediaType === 'audio' ? '🎤 Audio' : '📄 Documento'}`
            })
            .eq("id", msg.conversation_id)
            .ilike("last_msg", "%imagen de WhatsApp%");

          resolved[msg.id] = {
            ok: true,
            content: newContent,
            mediaUrl: publicUrl
          };
        } catch (itemErr) {
          console.error(`Error procesando media para mensaje ${msg.id}:`, itemErr);
        }
      }

      return {
        ok: true,
        resolved
      };
    } catch (err: any) {
      console.error("Error en resolveInboundWhatsAppMediaServer:", err);
      return { ok: false, error: err?.message || "Error procesando multimedia" };
    }
  });
