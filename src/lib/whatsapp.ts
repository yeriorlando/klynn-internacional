import type { Tenant, Cliente, Orden, ECFSequence } from "@/lib/storage";
import { formatRD, DEFAULT_CONFIG, getServicios, getTenantPlan, incrementWhatsAppCount, saveOrden, getGlobalConfig, getTenantById, NCF_NOMBRES } from "@/lib/storage";

type Evento = "creada" | "lista" | "en_camino" | "entregada" | "sin_retirar";

export type WhatsAppProvider = "klynn_connect" | "meta_cloud" | "wasender";

export type WhatsAppSendRequest = {
  text?: string;
  mediaUrl?: string;
  mediaType?: "image" | "audio" | "video" | "document" | "pdf";
  fileName?: string;
  caption?: string;
  replyTo?: number;
};

export type WhatsAppSendResult = {
  ok: boolean;
  provider: WhatsAppProvider;
  reason?: string;
  messageId?: string;
  mediaUrl?: string;
  data?: any;
};

function normalizePhoneRD(tel: string): string {
  const d = tel.replace(/\D/g, "");
  if (d.length === 10) return "1" + d; // RD: 1 + 10 dígitos
  return d;
}

/**
 * Filtra números de prueba o ficticios para proteger la reputación de la línea de WhatsApp (Anti-Bounce)
 */
export function isDummyPhoneNumber(phone: string): boolean {
  const clean = phone.replace(/\D/g, "");
  if (clean.length < 10) return true;
  // Secuencias repetitivas comunes en teléfonos de prueba
  if (clean.endsWith("0000000") || clean.endsWith("1111111") || clean.endsWith("1234567") || clean.endsWith("9999999")) {
    return true;
  }
  const dummies = [
    "8090000000", "8290000000", "8490000000",
    "18090000000", "18290000000", "18490000000",
    "8091111111", "8291111111", "8491111111",
    "18091111111", "18291111111", "18491111111",
    "8091234567", "8291234567", "8491234567",
    "18091234567", "18291234567", "18491234567"
  ];
  return dummies.includes(clean);
}

/**
 * Sanitiza caracteres de control invisibles que pueden corromper el socket de WhatsApp/Baileys
 */
export function sanitizeWhatsAppText(text?: string): string {
  if (!text) return "";
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "").trim();
}

/**
 * Único punto de salida para WhatsApp en el cliente.
 * El tenant puede tener su propio proveedor (ej. Meta Cloud API Oficial)
 * o seguir la selección global de /admin (Klynn Connect / WASender).
 */
export async function sendWhatsAppMessage(
  tenant: Tenant,
  destPhone: string,
  request: WhatsAppSendRequest,
): Promise<WhatsAppSendResult> {
  const globalCfg = await getGlobalConfig();
  const wa = tenant.config?.whatsapp ?? DEFAULT_CONFIG.whatsapp!;
  const provider: WhatsAppProvider = wa.provider || globalCfg.whatsapp_engine || "klynn_connect";
  const phone = normalizePhoneRD(destPhone);

  if (!wa?.enabled) return { ok: false, provider, reason: "WhatsApp deshabilitado" };
  if (phone.length < 11) return { ok: false, provider, reason: "Número de WhatsApp inválido" };
  if (isDummyPhoneNumber(phone)) {
    return { ok: false, provider, reason: "Número telefónico ficticio o de prueba (protección anti-rebote)" };
  }
  
  const cleanText = sanitizeWhatsAppText(request.text);
  const cleanCaption = sanitizeWhatsAppText(request.caption);

  if (!cleanText && !request.mediaUrl) {
    return { ok: false, provider, reason: "El mensaje no contiene texto ni archivo" };
  }

  try {
    if (provider === "klynn_connect") {
      const action = request.mediaUrl ? "send_media" : "send_message";
      const instanceName = wa.instance || getKlynnConnectInstanceName(tenant);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://api.klynn.com.do";
      const res = await fetch(
        `${supabaseUrl}/functions/v1/klynn-connect-proxy?action=${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instance_name: instanceName,
            number: phone,
            text: cleanText,
            mediaUrl: request.mediaUrl,
            mediaType: request.mediaType,
            fileName: request.fileName,
            caption: cleanCaption || cleanText || "",
            server_url: globalCfg.klynn_connect_url || "https://wa.klynn.com.do",
            api_key: globalCfg.klynn_connect_apikey,
            delay: Math.floor(1200 + Math.random() * 800), // Simulación humana anti-ban
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        let errStr = `Error en Klynn Connect (HTTP ${res.status})`;
        if (typeof data.error === "string") {
          errStr = data.error;
        } else if (Array.isArray(data.error) && data.error[0]?.exists === false) {
          errStr = "El número no tiene una cuenta de WhatsApp activa";
        } else if (typeof data.error?.message === "string") {
          errStr = data.error.message;
        } else if (typeof data.message === "string") {
          errStr = data.message;
        } else if (data.error) {
          errStr = typeof data.error === "object" ? JSON.stringify(data.error) : String(data.error);
        }
        return {
          ok: false,
          provider,
          reason: errStr,
          data,
        };
      }
      return {
        ok: true,
        provider,
        messageId: data.data?.key?.id || data.key?.id || data.id,
        data,
      };
    }

    if (provider === "meta_cloud") {
      const phoneNumberId = wa.meta_phone_number_id;
      const accessToken = wa.meta_access_token;
      if (!phoneNumberId || !accessToken) {
        return { ok: false, provider, reason: "Credenciales de WhatsApp Meta Cloud no configuradas" };
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://api.klynn.com.do";
      const res = await fetch(`${supabaseUrl}/functions/v1/meta-cloud-proxy?action=send_message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number_id: phoneNumberId,
          access_token: accessToken,
          to: phone,
          text: cleanText,
          mediaUrl: request.mediaUrl,
          mediaType: request.mediaType,
          caption: cleanCaption || cleanText || "",
          fileName: request.fileName,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        return {
          ok: false,
          provider,
          reason: data.error || data.message || `Error en Meta Cloud API (HTTP ${res.status})`,
          data,
        };
      }
      return {
        ok: true,
        provider,
        messageId: data.messageId || data.messages?.[0]?.id || data.id,
        data,
      };
    }

    if (!wa.api_key) {
      return { ok: false, provider, reason: "API Token de WASender faltante" };
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://api.klynn.com.do";
    let mediaUrl = request.mediaUrl;
    if (mediaUrl?.includes(";base64,")) {
      const uploadRes = await fetch(`${supabaseUrl}/functions/v1/wasender-proxy?action=upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: wa.api_key,
          base_url: wa.base_url || "https://wasenderapi.com",
          base64: mediaUrl,
        }),
      });
      const uploadData = await uploadRes.json().catch(() => ({}));
      mediaUrl = uploadData.publicUrl || uploadData.data?.url || uploadData.url;
      if (!uploadRes.ok || !mediaUrl) {
        return {
          ok: false,
          provider,
          reason: uploadData.message || uploadData.error || "Error al subir archivo a WASender",
          data: uploadData,
        };
      }
    }

    const payload: Record<string, unknown> = {
      api_key: wa.api_key,
      base_url: wa.base_url || "https://wasenderapi.com",
      to: `+${phone}`,
      instance_id: wa.instance,
    };
    if (!mediaUrl) payload.text = cleanText;
    else if (request.mediaType === "image") payload.imageUrl = mediaUrl;
    else if (request.mediaType === "audio") {
      payload.audioUrl = mediaUrl;
      payload.ptt = true;
    } else if (request.mediaType === "video") payload.videoUrl = mediaUrl;
    else {
      payload.documentUrl = mediaUrl;
      payload.filename = request.fileName || "documento";
    }
    if (request.replyTo) payload.replyTo = request.replyTo;

    const res = await fetch(`${supabaseUrl}/functions/v1/wasender-proxy?action=send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.status === "error" || data.success === false) {
      return {
        ok: false,
        provider,
        reason: data.message || data.error || `HTTP ${res.status}`,
        data,
      };
    }
    return {
      ok: true,
      provider,
      messageId: data.data?.id || data.id,
      mediaUrl,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      provider,
      reason: error instanceof Error ? error.message : "Error desconocido enviando WhatsApp",
    };
  }
}

function render(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

function humanizeDate(dateStr?: string, showTime = true): string {
  if (!dateStr) return "Por coordinar";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Por coordinar";
  const now = new Date();
  
  // Normalizar a inicio del día para comparar días
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = dDate.getTime() - nowDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (!showTime) {
    if (diffDays === 0) return "Hoy";
    if (diffDays === 1) return "Mañana";
    return d.toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  const timeStr = d.toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit", hour12: true });
  
  if (diffDays === 0) return `Hoy a las ${timeStr}`;
  if (diffDays === 1) return `Mañana a las ${timeStr}`;
  
  return d.toLocaleString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
}

export async function notificarWhatsApp(
  tenant: Tenant,
  cliente: Cliente,
  orden: Orden,
  evento: Evento,
  pagoRecibido?: number,
): Promise<{ ok: boolean; reason?: string }> {
  if (typeof window !== "undefined" && !navigator.onLine) {
    return { ok: false, reason: "Sin conexión a internet (modo offline)" };
  }

  // 1. Verificar Límites del Plan (0 = Ilimitado / Sin restricción)
  const plan = getTenantPlan(tenant);
  const currentCount = tenant.whatsapp_sent_month || 0;
  const limit = plan.limite_whatsapp_mes ?? 0;

  if (limit > 0 && currentCount >= limit) {
    return { ok: false, reason: `Límite de mensajes alcanzado (${currentCount}/${limit}). Mejore su plan para enviar más.` };
  }

  const wa = tenant.config?.whatsapp ?? DEFAULT_CONFIG.whatsapp!;
  if (!wa?.enabled) return { ok: false, reason: "WhatsApp deshabilitado" };
  
  if (!cliente.telefono || cliente.telefono.trim() === "" || cliente.telefono === "---") {
    return { ok: false, reason: "Cliente sin teléfono registrado" };
  }

  const flag =
    evento === "creada" ? (wa.notif_orden_creada !== false) :
    evento === "lista" ? (wa.notif_orden_lista !== false) :
    evento === "en_camino" ? true : // Activado por defecto para logística
    evento === "sin_retirar" ? (wa.notif_orden_sin_retirar !== false) :
    (wa.notif_orden_entregada === true);

  if (!flag) return { ok: false, reason: "Notificación desactivada en configuración" };

  const tpl =
    evento === "creada" ? (wa.plantilla_creada || DEFAULT_CONFIG.whatsapp?.plantilla_creada || "") :
    evento === "lista" ? (wa.plantilla_lista || DEFAULT_CONFIG.whatsapp?.plantilla_lista || "") :
    evento === "en_camino" ? "¡Tu orden va en camino! 🛵\n\nHola {cliente}, te informamos que tu orden #{numero} ya salió de *{lavanderia}* y va de camino a tu dirección:\n\n📍 {cliente_dir}\n\n⏱️ *¿Estarás disponible para recibir en los próximos 20 minutos? Responde \"SÍ\" o \"NO\" para coordinar con el chofer.*" :
    evento === "sin_retirar" ? (wa.plantilla_sin_retirar || DEFAULT_CONFIG.whatsapp?.plantilla_sin_retirar || "") :
    (wa.plantilla_entregada || DEFAULT_CONFIG.whatsapp?.plantilla_entregada || "");

  const cleanItemDesc = (desc: string) => (desc || "").replace(/^[↳\s•\-–—>]+/g, "").trim();

  const detalleStr = (evento === "creada")
    ? (orden.items || []).map(it => {
        const desc = cleanItemDesc(it.descripcion);
        const qty = it.cantidad || 1;
        const pu = it.precio_unitario || 0;
        return `${desc} x${qty}\n${qty} × ${formatRD(pu).replace("DOP", "RD$")} = ${formatRD(pu * qty).replace("DOP", "RD$")}`;
      }).join("\n\n")
    : (evento === "lista" || evento === "sin_retirar")
    ? (orden.items || []).map(it => `↳ ${cleanItemDesc(it.descripcion)} x${it.cantidad || 1}`).join("\n")
    : (orden.items || []).map(it => `${cleanItemDesc(it.descripcion)} x${it.cantidad || 1}`).join(", ");

  const serviciosList = await getServicios(tenant.id).catch(() => []);
  const serviciosStr = (orden.servicios || []).map(sName => {
    const srv = (serviciosList || []).find(s => s.nombre === sName);
    const customPrice = (orden.servicios_precios && orden.servicios_precios[sName] !== undefined)
      ? orden.servicios_precios[sName]
      : (srv && srv.precio > 0 ? srv.precio : 0);
    if (customPrice > 0) {
      const pStr = formatRD(customPrice).replace("DOP", "RD$");
      return `${sName}\n1 × ${pStr} = ${pStr}`;
    }
    return sName;
  }).join("\n\n") || "Ninguno";

  const isElectronic = Boolean(
    (orden.ncf && orden.ncf.toUpperCase().startsWith("E")) ||
    orden.tipo_ecf ||
    orden.track_id ||
    orden.security_code
  );

  let tipoDoc = "RECIBO DE SERVICIO";
  if (orden.ncf) {
    if (isElectronic) {
      if (orden.ncf.startsWith("E31")) tipoDoc = "FACTURA ELECTRÓNICA PARA CRÉDITO FISCAL (e-CF)";
      else if (orden.ncf.startsWith("E32")) tipoDoc = "FACTURA ELECTRÓNICA DE CONSUMO (e-CF)";
      else if (orden.ncf.startsWith("E33")) tipoDoc = "NOTA DE DÉBITO ELECTRÓNICA (e-CF)";
      else if (orden.ncf.startsWith("E34")) tipoDoc = "NOTA DE CRÉDITO ELECTRÓNICA (e-CF)";
      else tipoDoc = "COMPROBANTE FISCAL ELECTRÓNICO (e-CF)";
    } else {
      if (orden.ncf.startsWith("B01")) tipoDoc = "FACTURA PARA CRÉDITO FISCAL";
      else if (orden.ncf.startsWith("B02")) tipoDoc = "FACTURA PARA CONSUMIDOR FINAL";
      else if (orden.ncf.startsWith("B03")) tipoDoc = "NOTA DE DÉBITO";
      else if (orden.ncf.startsWith("B04")) tipoDoc = "NOTA DE CRÉDITO";
      else tipoDoc = "COMPROBANTE FISCAL";
    }
  }

  const ncfLabel = isElectronic ? "e-NCF" : "NCF";

  let templatePrepared = tpl;
  if (isElectronic) {
    // Reemplaza automáticamente NCF por e-NCF si la lavandería tiene facturación electrónica
    templatePrepared = templatePrepared
      .replace(/\*NCF:\*/g, "*e-NCF:*")
      .replace(/\bNCF:/g, "e-NCF:");
  }

  if (!orden.ncf) {
    // Si la orden no tiene NCF, omite las líneas de NCF y vencimiento para no dejar campos vacíos
    templatePrepared = templatePrepared
      .replace(/^[^\n]*\b(NCF|e-NCF):[^\n]*\n?/gim, "")
      .replace(/^[^\n]*\bVencimiento:[^\n]*\n?/gim, "");
  } else if (!orden.ncf_vencimiento) {
    // Si no hay vencimiento (como en e-CF de consumo), omite la línea de vencimiento vacía
    templatePrepared = templatePrepared.replace(/^[^\n]*\bVencimiento:[^\n]*\n?/gim, "");
  }

  const tieneDescuento = Boolean(orden.descuento && orden.descuento > 0);
  const promoNombre = orden.promocion_nombre || "Descuento especial";
  const descMonto = tieneDescuento ? formatRD(orden.descuento).replace("DOP", "RD$") : "RD$0.00";
  const promoLinea = tieneDescuento ? `*Promo (${promoNombre}):* -${descMonto}\n` : "";
  const promoAhorro = tieneDescuento ? `\n*¡Te ahorraste ${descMonto} en esta orden!*` : "";

  if (tieneDescuento) {
    // Si la plantilla no incluye explícitamente {descuento} o {promocion}, inyectar antes y después de TOTAL
    if (!templatePrepared.includes("{descuento}") && !templatePrepared.includes("{promocion}")) {
      if (templatePrepared.includes("*TOTAL:*")) {
        templatePrepared = templatePrepared.replace(/([^\n]*\*TOTAL:\*[^\n]*)/, `${promoLinea}$1${promoAhorro}`);
      } else if (templatePrepared.includes("{total}")) {
        templatePrepared = templatePrepared.replace(/([^\n]*\{total\}[^\n]*)/, `${promoLinea}$1${promoAhorro}`);
      }
    }
  }

  const diasAlmacenado = calcularDiasEnAlmacen(orden.creado_en);

  const mensaje = render(templatePrepared, {
    lavanderia: tenant.nombre,
    lavanderia_tel: tenant.telefono || "",
    lavanderia_dir: tenant.direccion || "",
    numero: orden.numero,
    fecha: new Date(orden.creado_en || Date.now()).toLocaleString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }),
    cliente: cliente.nombre,
    cliente_tel: cliente.telefono || "",
    cliente_dir: cliente.direccion || "",
    cliente_cedula: cliente.cedula || "",
    cliente_tipo_doc: cliente.tipo === "Empresa" ? "RNC" : "Cédula",
    dias: String(diasAlmacenado),
    ncf_label: ncfLabel,
    ncf: orden.ncf || "",
    ncf_vencimiento: orden.ncf_vencimiento ? new Date(orden.ncf_vencimiento).toLocaleDateString("es-DO") : "",
    rnc: tenant.rnc || "",
    tipo_documento: tipoDoc,
    servicios: serviciosStr,
    detalle: detalleStr || "Ninguno",
    subtotal: formatRD(orden.subtotal || 0).replace("DOP", "RD$"),
    descuento: descMonto,
    promocion: promoNombre,
    promocion_linea: promoLinea,
    promocion_ahorro: promoAhorro,
    itbis: formatRD(orden.itbis || 0).replace("DOP", "RD$"),
    total: formatRD(orden.total || 0).replace("DOP", "RD$"),
    metodo_pago: orden.metodo_pago || "EFECTIVO",
    pagado: formatRD(orden.pagado || 0).replace("DOP", "RD$"),
    saldo: formatRD(orden.saldo || 0).replace("DOP", "RD$"),
    vuelto: (pagoRecibido && pagoRecibido > (orden.total || 0)) 
      ? formatRD(pagoRecibido - (orden.total || 0)).replace("DOP", "RD$") 
      : "RD$0.00",
    entrega: orden.es_urgente 
      ? `${humanizeDate(orden.fecha_entrega, true)} (${tenant.config?.tiempo_entrega_urgente || 3} HORAS)`
      : humanizeDate(orden.fecha_entrega, false),
    estado: orden.estado || "RECIBIDA",
    ticket_pie: tenant.config?.ticket_pie || "¡Gracias por su preferencia!",
    ticket_nota: tenant.config?.ticket_nota || "",
  });

  let mensajeFinal = mensaje;
  
  // Anti-ban & Inbound First: Asegurar que cada mensaje tenga un incentivo de respuesta
  // Si la plantilla personalizada del usuario no incluye la pregunta interactiva, se inyecta como seguro
  const lower = mensajeFinal.toLowerCase();
  if (evento === "creada") {
    if (!lower.includes("responde")) {
      mensajeFinal += '\n\n📲 *¿Deseas que te avisemos por este mismo chat tan pronto tu ropa esté 100% lista para retirar? Responde "SÍ" para confirmarlo.*';
    }
    if (!lower.includes("guarda nuestro") && !lower.includes("guarda nuestro contacto")) {
      mensajeFinal += "\n💡 _Por favor guarda nuestro contacto en tu celular para recibir las alertas._";
    }
  } else if (evento === "lista") {
    if (!lower.includes("responde")) {
      mensajeFinal += '\n\n🚗 *¿Pasarás a retirar hoy? Responde "HOY" para tener tus prendas a mano en el mostrador o "MAÑANA".*';
    }
    if (!lower.includes("guarda nuestro") && !lower.includes("recuerda guardar")) {
      mensajeFinal += "\n💡 _Recuerda guardar nuestro número para avisos de tus prendas._";
    }
  } else if (evento === "sin_retirar") {
    if (!lower.includes("responde")) {
      mensajeFinal += '\n\n📅 *¿Qué día estimas pasar a retirarla? Responde con el día (ej: "VIERNES") para mantenerla protegida en almacén.*';
    }
  } else if (evento === "entregada") {
    if (!lower.includes("responde")) {
      mensajeFinal += '\n\n⭐ *Del 1 al 5, ¿qué tal quedó tu ropa hoy? Responde con tu puntuación (ej: "5"). ¡Tu opinión nos ayuda a mejorar!*';
    }
  }

  const phone = normalizePhoneRD(cliente.telefono);

  try {
    const result = await sendWhatsAppMessage(tenant, phone, { text: mensajeFinal });
    if (!result.ok) return { ok: false, reason: result.reason };
    
    // 2. Incrementar contador en caso de éxito
    await incrementWhatsAppCount(tenant.id);
    
    if (evento === "sin_retirar") {
      try {
        await saveOrden({ ...orden, ultimo_recordatorio_en: new Date().toISOString() });
      } catch (e) {
        console.error("Error al guardar timestamp de recordatorio", e);
      }
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}

export function getKlynnConnectInstanceName(tenant: Tenant): string {
  return `klynn_${(tenant.slug || tenant.id).replace(/[^a-zA-Z0-9_]/g, "_")}`;
}

export async function sendTestWhatsAppMessage(tenant: Tenant, destPhone: string, text: string): Promise<{ ok: boolean; reason?: string }> {
  const result = await sendWhatsAppMessage(tenant, destPhone, { text });
  return result.ok ? { ok: true } : { ok: false, reason: result.reason };
}

export interface SequenceAlertParams {
  tenant?: Tenant | null;
  tenantId: string;
  seq: ECFSequence;
  restantes: number;
  ultimoEmitido?: string;
  forzar?: boolean;
}

/**
 * Dispara una alerta de secuencia fiscal por WhatsApp de forma automática
 * al número configurado en Datos Fiscales (alerta_ncf_telefono) o teléfono del tenant.
 * Cuenta con protección inteligente Anti-Spam (máx. 1 mensaje por día salvo agotamiento total).
 */
export async function checkAndTriggerSequenceWhatsAppAlert({
  tenant,
  tenantId,
  seq,
  restantes,
  ultimoEmitido,
  forzar = false,
}: SequenceAlertParams): Promise<{ ok: boolean; reason?: string }> {
  // 1. Validar si la alerta debe dispararse
  if (!forzar) {
    if (!seq.recibir_alertas || !seq.alerta_limite || seq.alerta_limite <= 0) {
      return { ok: false, reason: "Alertas no activas para esta secuencia" };
    }
    if (restantes > seq.alerta_limite) {
      return { ok: false, reason: `Secuencia con comprobantes suficientes (${restantes} restantes)` };
    }
  }

  // 2. Obtener tenant
  let targetTenant = tenant;
  if (!targetTenant && tenantId) {
    try {
      targetTenant = await getTenantById(tenantId);
    } catch {}
  }
  if (!targetTenant) {
    return { ok: false, reason: "No se encontró el tenant para enviar alerta" };
  }

  // 3. Validar WhatsApp activo en el negocio
  const wa = targetTenant.config?.whatsapp ?? DEFAULT_CONFIG.whatsapp!;
  if (!wa?.enabled) {
    return { ok: false, reason: "WhatsApp no está activo en la configuración del negocio" };
  }

  // 4. Obtener teléfono destino
  const alertPhone = targetTenant.config?.alerta_ncf_telefono || targetTenant.telefono;
  if (!alertPhone) {
    return { ok: false, reason: "No hay número de WhatsApp configurado para recibir alertas de secuencia" };
  }
  if (isDummyPhoneNumber(alertPhone)) {
    return { ok: false, reason: "El número configurado es un número de prueba o ficticio" };
  }

  const tipoDoc = seq.tipo_ecf || seq.prefijo || "Comprobante";
  const isElectronic = tipoDoc.startsWith("E");

  // 5. Deduplicación Anti-Spam (Máximo 1 alerta por día a menos que caiga a 0 o sea forzada)
  if (!forzar && typeof window !== "undefined") {
    const cacheKey = `klynn_wa_seq_alert_${targetTenant.id}_${tipoDoc}`;
    const today = new Date().toISOString().slice(0, 10);
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.date === today) {
          if (restantes > 0) {
            return { ok: true, reason: "Alerta diaria ya enviada hoy (anti-spam activo)" };
          }
          if (restantes === 0 && data.restantes === 0) {
            return { ok: true, reason: "Alerta de secuencia agotada ya enviada hoy" };
          }
        }
      }
    } catch {}
  }

  // 6. Preparar texto del mensaje
  const ncfNombre = NCF_NOMBRES[tipoDoc] || (isElectronic ? "COMPROBANTE ELECTRÓNICO (e-CF)" : "COMPROBANTE FISCAL");
  const isExhausted = restantes <= 0;
  const vencimientoStr = seq.expiration_date
    ? new Date(seq.expiration_date).toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" })
    : (isElectronic && tipoDoc === "E32" ? "Sin vencimiento fijo (e-CF Consumo)" : "No especificada");

  const titulo = isExhausted
    ? "🚨 *¡ALERTA CRÍTICA: SECUENCIA FISCAL AGOTADA!*"
    : "⚠️ *ALERTA FISCAL: SECUENCIA PRÓXIMA A AGOTARSE*";

  const situacion = isExhausted
    ? `*¡URGENTE!* Se han agotado totalmente los comprobantes de este tipo (*0 restantes*). Debes solicitar un nuevo rango de inmediato para continuar facturando.`
    : `Te informamos que la secuencia fiscal ha alcanzado el umbral configurado (*quedan ${restantes} comprobantes de ${seq.alerta_limite || 20} establecidos*):`;

  const mensaje = `${titulo}

Hola, *${targetTenant.nombre}*. ${situacion}

📋 *Tipo:* ${tipoDoc} - ${ncfNombre}
🔢 *Comprobantes Restantes:* *${restantes} disponibles*
📊 *Rango Autorizado:* Del ${seq.valor_inicial} al ${seq.valor_final}
📝 *Último Emitido:* ${ultimoEmitido || `${tipoDoc}${String(seq.valor_actual || 0).padStart(isElectronic ? 10 : 8, "0")}`}
📅 *Vencimiento:* ${vencimientoStr}

💡 *Recomendación:*
${isElectronic
  ? `Solicita una nueva autorización de rangos e-CF en la Oficina Virtual de la DGII o comunícate con tu proveedor fiscal (EF2) para sincronizar el nuevo rango en Klynn.`
  : `Solicita de inmediato una nueva autorización de comprobantes tradicionales en la Oficina Virtual de la DGII para evitar pausas en tu facturación.`}

_Mensaje automático de control fiscal emitido desde Klynn._`;

  const result = await sendWhatsAppMessage(targetTenant, alertPhone, { text: mensaje });

  if (result.ok && !forzar && typeof window !== "undefined") {
    const cacheKey = `klynn_wa_seq_alert_${targetTenant.id}_${tipoDoc}`;
    const today = new Date().toISOString().slice(0, 10);
    try {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ date: today, restantes, timestamp: Date.now() })
      );
    } catch {}
  }

  return result;
}

export function calcularDiasEnAlmacen(creadoEn: string): number {
  if (!creadoEn) return 0;
  const diffTime = Math.max(0, Date.now() - new Date(creadoEn).getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function fueNotificadoHoy(fechaIso?: string): boolean {
  if (!fechaIso) return false;
  const d = new Date(fechaIso);
  const hoy = new Date();
  return (
    d.getDate() === hoy.getDate() &&
    d.getMonth() === hoy.getMonth() &&
    d.getFullYear() === hoy.getFullYear()
  );
}

export function obtenerTodasOrdenesSinRetirar(ordenes: Orden[], diasMinimos = 5): { orden: Orden; dias: number }[] {
  return (ordenes || [])
    .filter(o => o.estado === "LISTA")
    .map(o => ({ orden: o, dias: calcularDiasEnAlmacen(o.creado_en) }))
    .filter(item => item.dias >= diasMinimos)
    .sort((a, b) => b.dias - a.dias);
}

export function obtenerOrdenesSinRetirar(ordenes: Orden[], diasMinimos = 5): { orden: Orden; dias: number }[] {
  return obtenerTodasOrdenesSinRetirar(ordenes, diasMinimos)
    .filter(item => !fueNotificadoHoy(item.orden.ultimo_recordatorio_en));
}
