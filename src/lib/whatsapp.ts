import type { Tenant, Cliente, Orden } from "@/lib/storage";
import { formatRD, DEFAULT_CONFIG, getServicios, getTenantPlan, incrementWhatsAppCount, saveOrden } from "@/lib/storage";

type Evento = "creada" | "lista" | "en_camino" | "entregada" | "sin_retirar";

function normalizePhoneRD(tel: string): string {
  const d = tel.replace(/\D/g, "");
  if (d.length === 10) return "1" + d; // RD: 1 + 10 dígitos
  return d;
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
  // 1. Verificar Límites del Plan
  const plan = getTenantPlan(tenant);
  const currentCount = tenant.whatsapp_sent_month || 0;

  if (currentCount >= plan.limite_whatsapp_mes) {
    return { ok: false, reason: `Límite de mensajes alcanzado (${plan.limite_whatsapp_mes}/${plan.limite_whatsapp_mes}). Mejore su plan para enviar más.` };
  }

  const wa = tenant.config?.whatsapp ?? DEFAULT_CONFIG.whatsapp!;
  if (!wa?.enabled) return { ok: false, reason: "WhatsApp deshabilitado" };
  if (!wa.api_key) return { ok: false, reason: "API Token faltante" };
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
    evento === "en_camino" ? "*¡Tu orden va en camino!* 🛵\n\nHola {cliente}, te informamos que tu orden #{numero} ya salió de {lavanderia} y va de camino a tu dirección: {cliente_dir}.\n\n¡Nos vemos pronto!" :
    evento === "sin_retirar" ? (wa.plantilla_sin_retirar || DEFAULT_CONFIG.whatsapp.plantilla_sin_retirar!) :
    wa.plantilla_entregada;

  const detalleStr = (evento === "creada")
    ? orden.items.map(it => 
        `${it.descripcion} x${it.cantidad}\n${it.cantidad} × ${formatRD(it.precio_unitario).replace("DOP", "RD$")} = ${formatRD(it.precio_unitario * it.cantidad).replace("DOP", "RD$")}`
      ).join("\n\n")
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
    const fullPhone = phone.startsWith('+') ? phone : `+${phone}`;
    const base = (wa.base_url || "https://wasenderapi.com").replace(/\/$/, "");
    const url = `${base}/api/send-message`;

    try {

    const res = await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${wa.api_key}`,
        "Accept": "application/json"
      },
      body: JSON.stringify({ 
        to: fullPhone, 
        text: mensaje,
        instance_id: wa.instance
      }), 
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, reason: data.message || `HTTP ${res.status}` };
    
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
