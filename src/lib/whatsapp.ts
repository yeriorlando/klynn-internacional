import type { Tenant, Cliente, Orden } from "@/lib/storage";
import { formatRD, DEFAULT_CONFIG, getServicios, getTenantPlan, incrementWhatsAppCount, saveOrden, getGlobalConfig } from "@/lib/storage";

type Evento = "creada" | "lista" | "en_camino" | "entregada" | "sin_retirar";

export type WhatsAppProvider = "klynn_connect" | "wasender";

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
 * Único punto de salida para WhatsApp en el cliente.
 * El proveedor activo de /admin es la fuente de verdad y la pestaña WhatsApp
 * refleja esa misma selección. Nunca se decide el proveedor en el componente.
 */
export async function sendWhatsAppMessage(
  tenant: Tenant,
  destPhone: string,
  request: WhatsAppSendRequest,
): Promise<WhatsAppSendResult> {
  const globalCfg = await getGlobalConfig();
  const provider: WhatsAppProvider = globalCfg.whatsapp_engine || "klynn_connect";
  const wa = tenant.config?.whatsapp ?? DEFAULT_CONFIG.whatsapp!;
  const phone = normalizePhoneRD(destPhone);

  if (!wa?.enabled) return { ok: false, provider, reason: "WhatsApp deshabilitado" };
  if (phone.length < 11) return { ok: false, provider, reason: "Número de WhatsApp inválido" };
  if (!request.text?.trim() && !request.mediaUrl) {
    return { ok: false, provider, reason: "El mensaje no contiene texto ni archivo" };
  }

  try {
    if (provider === "klynn_connect") {
      const action = request.mediaUrl ? "send_media" : "send_message";
      const instanceName = wa.instance || getKlynnConnectInstanceName(tenant);
      const res = await fetch(
        `https://api.klynn.com.do/functions/v1/klynn-connect-proxy?action=${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instance_name: instanceName,
            number: phone,
            text: request.text,
            mediaUrl: request.mediaUrl,
            mediaType: request.mediaType,
            fileName: request.fileName,
            caption: request.caption || request.text || "",
            server_url: globalCfg.klynn_connect_url || "https://wa.klynn.com.do",
            api_key: globalCfg.klynn_connect_apikey,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        return {
          ok: false,
          provider,
          reason: data.error || data.message || `HTTP ${res.status}`,
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
    if (!mediaUrl) payload.text = request.text;
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

function humanizeDate(dateStr: string, showTime = true): string {
  const d = new Date(dateStr);
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
  
  if (!cliente.telefono) return { ok: false, reason: "Cliente sin teléfono" };

  const flag =
    evento === "creada" ? wa.notif_orden_creada :
    evento === "lista" ? wa.notif_orden_lista :
    evento === "en_camino" ? true : // Activado por defecto para logística
    evento === "sin_retirar" ? (wa.notif_orden_sin_retirar !== false) :
    wa.notif_orden_entregada;
  if (!flag) return { ok: false, reason: "Notificación desactivada" };

  const tpl =
    evento === "creada" ? wa.plantilla_creada :
    evento === "lista" ? wa.plantilla_lista :
    evento === "en_camino" ? "¡Tu orden va en camino! 🛵\n\nHola {cliente}, te informamos que tu orden #{numero} ya salió de {lavanderia} y va de camino a tu dirección:\n\n{cliente_dir}\n\n¡Nos vemos pronto!" :
    evento === "sin_retirar" ? (wa.plantilla_sin_retirar || DEFAULT_CONFIG.whatsapp?.plantilla_sin_retirar || "") :
    wa.plantilla_entregada;

  const detalleStr = (evento === "creada")
    ? orden.items.map(it => 
        `${it.descripcion} x${it.cantidad}\n${it.cantidad} × ${formatRD(it.precio_unitario).replace("DOP", "RD$")} = ${formatRD(it.precio_unitario * it.cantidad).replace("DOP", "RD$")}`
      ).join("\n\n")
    : (evento === "lista" || evento === "sin_retirar")
    ? orden.items.map(it => `↳ ${it.descripcion} x${it.cantidad}`).join(",\n")
    : orden.items.map(it => `${it.descripcion} x${it.cantidad}`).join(", ");

  const serviciosList = await getServicios(tenant.id);
  const serviciosStr = (orden.servicios || []).map(sName => {
    const srv = serviciosList.find(s => s.nombre === sName);
    if (srv && srv.precio > 0) {
      const pStr = formatRD(srv.precio).replace("DOP", "RD$");
      return `${sName}\n1 × ${pStr} = ${pStr}`;
    }
    return sName;
  }).join("\n\n") || "Ninguno";

  let tipoDoc = "RECIBO DE SERVICIO";
  if (orden.ncf) {
    if (orden.ncf.startsWith('E31') || orden.ncf.startsWith('B01')) tipoDoc = "FACTURA PARA CRÉDITO FISCAL";
    else if (orden.ncf.startsWith('E32') || orden.ncf.startsWith('B02')) tipoDoc = "FACTURA PARA CONSUMIDOR FINAL";
    else if (orden.ncf.startsWith('E33') || orden.ncf.startsWith('B03')) tipoDoc = "NOTA DE DÉBITO";
    else if (orden.ncf.startsWith('E34') || orden.ncf.startsWith('B04')) tipoDoc = "NOTA DE CRÉDITO";
    else tipoDoc = "COMPROBANTE FISCAL";
  }

  const diasAlmacenado = calcularDiasEnAlmacen(orden.creado_en);

  const mensaje = render(tpl, {
    lavanderia: tenant.nombre,
    lavanderia_tel: tenant.telefono || "",
    lavanderia_dir: tenant.direccion || "",
    numero: orden.numero,
    fecha: new Date(orden.creado_en).toLocaleString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }),
    cliente: cliente.nombre,
    cliente_tel: cliente.telefono || "",
    cliente_dir: cliente.direccion || "",
    cliente_cedula: cliente.cedula || "",
    cliente_tipo_doc: cliente.tipo === "Empresa" ? "RNC" : "Cédula",
    dias: String(diasAlmacenado),
    ncf: orden.ncf || "",
    ncf_vencimiento: orden.ncf_vencimiento ? new Date(orden.ncf_vencimiento).toLocaleDateString("es-DO") : "",
    rnc: tenant.rnc || "",
    tipo_documento: tipoDoc,
    servicios: serviciosStr,
    detalle: detalleStr,
    subtotal: formatRD(orden.subtotal).replace("DOP", "RD$"),
    itbis: formatRD(orden.itbis || 0).replace("DOP", "RD$"),
    total: formatRD(orden.total).replace("DOP", "RD$"),
    metodo_pago: orden.metodo_pago,
    pagado: formatRD(orden.pagado).replace("DOP", "RD$"),
    saldo: formatRD(orden.saldo).replace("DOP", "RD$"),
    vuelto: (pagoRecibido && pagoRecibido > orden.total) 
      ? formatRD(pagoRecibido - orden.total).replace("DOP", "RD$") 
      : "RD$0.00",
    entrega: orden.es_urgente 
      ? `${humanizeDate(orden.fecha_entrega, true)} (${tenant.config?.tiempo_entrega_urgente || 3} HORAS)`
      : humanizeDate(orden.fecha_entrega, false),
    estado: orden.estado,
    ticket_pie: tenant.config?.ticket_pie || "¡Gracias por su preferencia!",
    ticket_nota: tenant.config?.ticket_nota || "",
  });

  const phone = normalizePhoneRD(cliente.telefono);

  try {
    const result = await sendWhatsAppMessage(tenant, phone, { text: mensaje });
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
