import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildBusinessSummaryEmail } from "./email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Channel = "email" | "whatsapp";
type Frequency = "weekly" | "monthly";
type SummaryConfig = {
  enabled?: boolean;
  frequency?: Frequency;
  channel?: "email" | "whatsapp" | "both";
  email?: string;
  whatsapp_phone?: string;
};

type RankedMetric = { name: string; count: number; total: number };
type MonthlyExecutiveMetrics = {
  finance: {
    itbis: number;
    discounts: number;
    margin: number;
    paymentMethods: Array<{ name: string; total: number }>;
  };
  receivables: {
    invoices: number;
    clients: number;
    aging: { current: number; overdue15: number; overdue30: number; critical: number };
    topDebtors: Array<{ name: string; total: number }>;
  };
  operations: {
    pieces: number;
    pounds: number;
    completed: number;
    inWorkshop: number;
    ready: number;
    completionRate: number;
    topGarments: RankedMetric[];
    topServices: RankedMetric[];
  };
  cashAudit: {
    closures: number;
    perfect: number;
    shortages: number;
    overages: number;
    perfectRate: number;
    netDifference: number;
  };
  fiscal: {
    issued: number;
    accepted: number;
    rejected: number;
    pending: number;
    acceptedWithReservations: number;
  };
  alerts: Array<{ level: "critical" | "warning" | "info"; title: string; detail: string }>;
};

type Metrics = {
  frequency: Frequency;
  periodStart: string;
  periodEnd: string;
  sales: number;
  orders: number;
  averageTicket: number;
  expenses: number;
  estimatedResult: number;
  priorSales: number;
  salesChange: number | null;
  receivables: number;
  pendingOrders: number;
  fiscalIncidents: number;
  monthlyExecutive: MonthlyExecutiveMetrics | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function money(value: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(value || 0).replace("DOP", "RD$");
}

function normalizePhone(value: string) {
  let phone = String(value || "").replace(/\D/g, "");
  if (phone.length === 10) phone = `1${phone}`;
  return phone;
}

function previousCompletedPeriod(frequency: Frequency, now = new Date()) {
  // República Dominicana permanece en UTC-4 durante todo el año.
  const local = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  let startLocal: number;
  let endLocal: number;
  let priorStartLocal: number;

  if (frequency === "monthly") {
    endLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1);
    startLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - 1, 1);
    priorStartLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - 2, 1);
  } else {
    const day = local.getUTCDay();
    const daysSinceMonday = (day + 6) % 7;
    const currentMondayLocal = Date.UTC(
      local.getUTCFullYear(),
      local.getUTCMonth(),
      local.getUTCDate() - daysSinceMonday,
    );
    startLocal = currentMondayLocal - 7 * 24 * 60 * 60 * 1000;
    endLocal = currentMondayLocal;
    priorStartLocal = startLocal - 7 * 24 * 60 * 60 * 1000;
  }
  const toUtc = (value: number) => new Date(value + 4 * 60 * 60 * 1000).toISOString();
  const dateOnly = (value: number) => new Date(value).toISOString().slice(0, 10);
  return {
    start: toUtc(startLocal),
    end: toUtc(endLocal),
    priorStart: toUtc(priorStartLocal),
    periodStart: dateOnly(startLocal),
    periodEnd: dateOnly(endLocal - 24 * 60 * 60 * 1000),
  };
}

function fiscalStatus(value: unknown) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
}

function buildMonthlyExecutive(
  tenant: any,
  orders: any[],
  receivableOrders: any[],
  fiscalDocuments: any[],
  cashClosures: any[],
  sales: number,
  expenses: number,
): MonthlyExecutiveMetrics {
  const paymentMethods = new Map<string, number>();
  const garmentMetrics = new Map<string, RankedMetric>();
  const serviceMetrics = new Map<string, RankedMetric>();
  let itbis = 0;
  let discounts = 0;
  let pieces = 0;
  let pounds = 0;

  for (const order of orders) {
    itbis += Number(order.itbis || 0);
    discounts += Number(order.descuento || 0);
    const paymentName = String(order.metodo_pago || "EFECTIVO").trim().toUpperCase();
    paymentMethods.set(paymentName, (paymentMethods.get(paymentName) || 0) + Number(order.total || 0));

    for (const item of Array.isArray(order.items) ? order.items : []) {
      const name = String(item?.descripcion || "Prenda general").replace(/^↳\s*/, "").trim();
      if (!name || name.toLowerCase().startsWith("servicio:")) continue;
      const count = Number(item?.cantidad || 0);
      const total = count * Number(item?.precio_unitario || 0);
      const current = garmentMetrics.get(name) || { name, count: 0, total: 0 };
      current.count += count;
      current.total += total;
      garmentMetrics.set(name, current);
      if (item?.es_libra) pounds += count;
      else pieces += count;
    }

    for (const serviceNameRaw of Array.isArray(order.servicios) ? order.servicios : []) {
      const name = String(serviceNameRaw || "Servicio").trim();
      if (!name) continue;
      const total = Number(order.servicios_precios?.[name] || 0);
      const current = serviceMetrics.get(name) || { name, count: 0, total: 0 };
      current.count += 1;
      current.total += total;
      serviceMetrics.set(name, current);
    }
  }

  const defaultCreditDays = Number(tenant?.limite_credito_dias || 30);
  const debtors = new Map<string, { name: string; total: number }>();
  const aging = { current: 0, overdue15: 0, overdue30: 0, critical: 0 };
  const now = Date.now();
  for (const order of receivableOrders) {
    const balance = Number(order.saldo || 0);
    if (balance <= 0) continue;
    const debtorKey = String(order.cliente_id || order.cliente_nombre || "sin-cliente");
    const debtor = debtors.get(debtorKey) || { name: String(order.cliente_nombre || "Cliente sin nombre"), total: 0 };
    debtor.total += balance;
    debtors.set(debtorKey, debtor);

    const issuedAt = new Date(order.creado_en || now).getTime();
    const elapsedDays = Math.max(0, Math.floor((now - issuedAt) / 86_400_000));
    const overdueDays = elapsedDays - Number(order.dias_credito || defaultCreditDays);
    if (overdueDays <= 0) aging.current += balance;
    else if (overdueDays <= 15) aging.overdue15 += balance;
    else if (overdueDays <= 30) aging.overdue30 += balance;
    else aging.critical += balance;
  }

  const completed = orders.filter((order) => order.estado === "ENTREGADA").length;
  const inWorkshop = orders.filter((order) => ["RECIBIDA", "EN_PROCESO"].includes(order.estado)).length;
  const ready = orders.filter((order) => ["LISTA", "EN_CAMINO"].includes(order.estado)).length;
  const validOrderCount = orders.length;

  const closedCash = cashClosures.filter((cash) => cash.estado === "CERRADA");
  const perfect = closedCash.filter((cash) => Number(cash.diferencia || 0) === 0).length;
  const shortages = closedCash.filter((cash) => Number(cash.diferencia || 0) < 0).length;
  const overages = closedCash.filter((cash) => Number(cash.diferencia || 0) > 0).length;
  const netDifference = closedCash.reduce((sum, cash) => sum + Number(cash.diferencia || 0), 0);

  const statuses = fiscalDocuments.map((document) => fiscalStatus(document.status));
  const acceptedWithReservations = statuses.filter((status) => status === "accepted_with_reservations").length;
  const rejected = statuses.filter((status) => status === "rejected" || status === "rechazado").length;
  const accepted = statuses.filter((status) => ["accepted", "aceptado", "accepted_with_reservations"].includes(status)).length;
  const pending = Math.max(0, statuses.length - accepted - rejected);

  const alerts: MonthlyExecutiveMetrics["alerts"] = [];
  const result = sales - expenses;
  if (result < 0) alerts.push({ level: "critical", title: "Resultado mensual negativo", detail: `Los gastos superaron las ventas por ${money(Math.abs(result))}.` });
  if (aging.critical > 0) alerts.push({ level: "critical", title: "CXC en mora crítica", detail: `${money(aging.critical)} supera 30 días después del plazo acordado.` });
  if (shortages > 0) alerts.push({ level: "warning", title: "Faltantes de caja", detail: `${shortages} cierre${shortages === 1 ? " presentó" : "s presentaron"} faltantes.` });
  if (rejected > 0) alerts.push({ level: "critical", title: "Comprobantes rechazados", detail: `${rejected} e-CF requiere${rejected === 1 ? "" : "n"} revisión.` });
  if (acceptedWithReservations > 0) alerts.push({ level: "warning", title: "Aceptados con observaciones", detail: `${acceptedWithReservations} e-CF fue${acceptedWithReservations === 1 ? "" : "ron"} aceptado${acceptedWithReservations === 1 ? "" : "s"} con observaciones.` });
  if (inWorkshop + ready > 0) alerts.push({ level: "info", title: "Trabajo pendiente", detail: `${inWorkshop} orden${inWorkshop === 1 ? "" : "es"} en taller y ${ready} lista${ready === 1 ? "" : "s"} para despacho.` });
  if (alerts.length === 0) alerts.push({ level: "info", title: "Sin alertas críticas", detail: "No se detectaron excepciones que requieran atención inmediata." });

  return {
    finance: {
      itbis,
      discounts,
      margin: sales > 0 ? (result / sales) * 100 : 0,
      paymentMethods: [...paymentMethods.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total),
    },
    receivables: {
      invoices: receivableOrders.length,
      clients: debtors.size,
      aging,
      topDebtors: [...debtors.values()].sort((a, b) => b.total - a.total).slice(0, 3),
    },
    operations: {
      pieces,
      pounds,
      completed,
      inWorkshop,
      ready,
      completionRate: validOrderCount ? Math.round((completed / validOrderCount) * 100) : 0,
      topGarments: [...garmentMetrics.values()].sort((a, b) => b.count - a.count).slice(0, 3),
      topServices: [...serviceMetrics.values()].sort((a, b) => b.count - a.count).slice(0, 3),
    },
    cashAudit: {
      closures: closedCash.length,
      perfect,
      shortages,
      overages,
      perfectRate: closedCash.length ? Math.round((perfect / closedCash.length) * 100) : 100,
      netDifference,
    },
    fiscal: { issued: statuses.length, accepted, rejected, pending, acceptedWithReservations },
    alerts,
  };
}

async function buildMetrics(admin: any, tenant: any, frequency: Frequency): Promise<Metrics> {
  const tenantId = tenant.id;
  const period = previousCompletedPeriod(frequency);
  const isMonthly = frequency === "monthly";
  const [ordersResult, priorOrdersResult, expensesResult, receivablesResult, pendingResult, fiscalResult, cashResult] = await Promise.all([
    admin.from("ordenes").select(isMonthly ? "*" : "total,estado").eq("tenant_id", tenantId).gte("creado_en", period.start).lt("creado_en", period.end),
    admin.from("ordenes").select("total,estado").eq("tenant_id", tenantId).gte("creado_en", period.priorStart).lt("creado_en", period.start),
    admin.from("gastos").select(isMonthly ? "*" : "monto").eq("tenant_id", tenantId).gte("fecha", period.periodStart).lte("fecha", period.periodEnd),
    admin.from("ordenes").select(isMonthly ? "*" : "saldo").eq("tenant_id", tenantId).gt("saldo", 0).neq("estado", "ANULADA"),
    admin.from("ordenes").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).not("estado", "in", '("ENTREGADA","ANULADA")'),
    admin.from("ecf_documents").select("id,status").eq("tenant_id", tenantId).gte("fecha_emision", period.start).lt("fecha_emision", period.end),
    isMonthly
      ? admin.from("cajas").select("*").eq("tenant_id", tenantId).gte("cerrada_en", period.start).lt("cerrada_en", period.end)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const queryError = [ordersResult, priorOrdersResult, expensesResult, receivablesResult, pendingResult, fiscalResult, cashResult]
    .map((result) => result.error)
    .find(Boolean);
  if (queryError) throw new Error(queryError.message);

  const orders = (ordersResult.data || []).filter((order: any) => order.estado !== "ANULADA");
  const priorOrders = (priorOrdersResult.data || []).filter((order: any) => order.estado !== "ANULADA");
  const sales = orders.reduce((sum: number, order: any) => sum + Number(order.total || 0), 0);
  const priorSales = priorOrders.reduce((sum: number, order: any) => sum + Number(order.total || 0), 0);
  const expenses = (expensesResult.data || []).reduce((sum: number, expense: any) => sum + Number(expense.monto || 0), 0);
  const receivables = (receivablesResult.data || []).reduce((sum: number, order: any) => sum + Number(order.saldo || 0), 0);
  const fiscalDocuments = fiscalResult.data || [];
  const fiscalIncidents = fiscalDocuments.filter((document: any) => ["rejected", "rechazado", "accepted_with_reservations"].includes(fiscalStatus(document.status))).length;

  return {
    frequency,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    sales,
    orders: orders.length,
    averageTicket: orders.length ? sales / orders.length : 0,
    expenses,
    estimatedResult: sales - expenses,
    priorSales,
    salesChange: priorSales > 0 ? ((sales - priorSales) / priorSales) * 100 : null,
    receivables,
    pendingOrders: pendingResult.count || 0,
    fiscalIncidents,
    monthlyExecutive: isMonthly
      ? buildMonthlyExecutive(tenant, orders, receivablesResult.data || [], fiscalDocuments, cashResult.data || [], sales, expenses)
      : null,
  };
}

function whatsappText(tenant: any, metrics: Metrics) {
  const isMonthly = metrics.frequency === "monthly";
  if (isMonthly && metrics.monthlyExecutive) {
    const executive = metrics.monthlyExecutive;
    const change = metrics.salesChange === null
      ? "Sin período anterior comparable"
      : `${metrics.salesChange >= 0 ? "+" : ""}${metrics.salesChange.toFixed(1)}% vs. mes anterior`;
    const topGarment = executive.operations.topGarments[0];
    const topService = executive.operations.topServices[0];
    const attention = executive.alerts
      .map((alert) => `${alert.level === "critical" ? "🔴" : alert.level === "warning" ? "🟠" : "🔵"} *${alert.title}:* ${alert.detail}`)
      .join("\n");

    return `📊 *RESUMEN EJECUTIVO MENSUAL*
*${tenant.nombre}*
${metrics.periodStart} al ${metrics.periodEnd}

💼 *PANORAMA EJECUTIVO*
• Ventas: *${money(metrics.sales)}*
• Resultado estimado: *${money(metrics.estimatedResult)}*
• Margen: *${executive.finance.margin.toFixed(1)}%*
• ${change}

💰 *FINANZAS Y CAJA*
• Órdenes: *${metrics.orders}*
• Ticket promedio: *${money(metrics.averageTicket)}*
• Gastos: *${money(metrics.expenses)}*
• ITBIS generado: *${money(executive.finance.itbis)}*
• Descuentos: *${money(executive.finance.discounts)}*

💳 *CUENTAS POR COBRAR*
• Saldo pendiente: *${money(metrics.receivables)}*
• ${executive.receivables.invoices} factura${executive.receivables.invoices === 1 ? "" : "s"} · ${executive.receivables.clients} cliente${executive.receivables.clients === 1 ? "" : "s"}
• Mora crítica: *${money(executive.receivables.aging.critical)}*

🧺 *PRENDAS, SERVICIOS Y OPERACIÓN*
• Completadas: *${executive.operations.completed}* (${executive.operations.completionRate}%)
• En taller: *${executive.operations.inWorkshop}* · Listas: *${executive.operations.ready}*
• Piezas: *${executive.operations.pieces}* · Libras: *${executive.operations.pounds}*
${topGarment ? `• Prenda destacada: *${topGarment.name}* (${topGarment.count})` : "• Sin prendas registradas en el período"}
${topService ? `• Servicio destacado: *${topService.name}* (${topService.count})` : "• Sin servicios registrados en el período"}

🧾 *AUDITORÍA Y e-CF*
• Cierres de caja: *${executive.cashAudit.closures}* · Cuadre perfecto: *${executive.cashAudit.perfectRate}%*
• Faltantes: *${executive.cashAudit.shortages}* · Sobrantes: *${executive.cashAudit.overages}*
• e-CF emitidos: *${executive.fiscal.issued}*
• Aceptados: *${executive.fiscal.accepted}* · Rechazados: *${executive.fiscal.rejected}* · Pendientes: *${executive.fiscal.pending}*

⚠️ *ATENCIÓN EJECUTIVA*
${attention}

🔎 Reporte completo:
https://klynn.com.do/reportes?tenantId=${encodeURIComponent(tenant.id)}`;
  }

  const title = isMonthly ? "RESUMEN EJECUTIVO MENSUAL" : "RESUMEN SEMANAL";
  const comparisonName = isMonthly ? "mes anterior" : "semana anterior";
  const change = metrics.salesChange === null
    ? "Sin comparación anterior"
    : `${metrics.salesChange >= 0 ? "+" : ""}${metrics.salesChange.toFixed(1)}% vs. ${comparisonName}`;
  return `📊 *${title} · ${tenant.nombre}*
${metrics.periodStart} al ${metrics.periodEnd}

💰 Ventas: *${money(metrics.sales)}*
🧾 Órdenes: *${metrics.orders}*
🎟️ Ticket promedio: *${money(metrics.averageTicket)}*
📉 Gastos: *${money(metrics.expenses)}*
📈 Resultado estimado: *${money(metrics.estimatedResult)}*

💳 Por cobrar: *${money(metrics.receivables)}*
🧺 Órdenes pendientes: *${metrics.pendingOrders}*
🛡️ Incidencias fiscales: *${metrics.fiscalIncidents}*
↔️ ${change}

Consulta el detalle en Klynn.`;
}

async function sendEmail(tenant: any, config: SummaryConfig, metrics: Metrics) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY no está configurada en Edge Functions");
  const recipient = String(config.email || tenant.email || "").trim().toLowerCase();
  if (!recipient) throw new Error("No hay correo destinatario configurado");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("WEEKLY_SUMMARY_FROM") || "Klynn <soporte@klynn.com.do>",
      to: [recipient],
      subject: `${metrics.frequency === "monthly" ? "Resumen ejecutivo mensual" : "Resumen semanal"} · ${tenant.nombre} · ${metrics.periodStart} al ${metrics.periodEnd}`,
      html: buildBusinessSummaryEmail(tenant, metrics),
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || `Resend respondió HTTP ${response.status}`);
  return { recipient, provider: "resend", messageId: body?.id || null };
}

async function enforceWhatsAppLimit(admin: any, tenant: any) {
  const { data: plan } = await admin.from("planes").select("limite_whatsapp_mes").eq("id", tenant.plan_id).maybeSingle();
  const limit = Number(plan?.limite_whatsapp_mes || 0);
  const now = new Date();
  const reset = tenant.whatsapp_last_reset ? new Date(tenant.whatsapp_last_reset) : null;
  const sameMonth = reset && reset.getUTCMonth() === now.getUTCMonth() && reset.getUTCFullYear() === now.getUTCFullYear();
  const count = sameMonth ? Number(tenant.whatsapp_sent_month || 0) : 0;
  if (limit > 0 && count >= limit) throw new Error(`Límite mensual de WhatsApp alcanzado (${count}/${limit})`);
  return { count, now };
}

async function incrementWhatsApp(admin: any, tenantId: string, count: number, now: Date) {
  await admin.from("tenants").update({
    whatsapp_sent_month: count + 1,
    whatsapp_last_reset: now.toISOString(),
  }).eq("id", tenantId);
}

async function sendWhatsApp(admin: any, tenant: any, globalConfig: any, config: SummaryConfig, metrics: Metrics) {
  const wa = tenant.config?.whatsapp || {};
  if (!wa.enabled) throw new Error("WhatsApp está deshabilitado para esta lavandería");
  const phone = normalizePhone(String(config.whatsapp_phone || ""));
  if (phone.length < 11) throw new Error("El número de WhatsApp no es válido");
  const { count, now } = await enforceWhatsAppLimit(admin, tenant);
  const bank = globalConfig?.bank_details || {};
  const engine = bank.whatsapp_engine || globalConfig?.whatsapp_engine || "klynn_connect";
  const text = whatsappText(tenant, metrics);
  let response: Response;

  if (engine === "klynn_connect") {
    const base = String(bank.klynn_connect_url || globalConfig?.klynn_connect_url || Deno.env.get("KLYNN_CONNECT_URL") || "https://wa.klynn.com.do").replace(/\/$/, "");
    const apiKey = bank.klynn_connect_apikey || globalConfig?.klynn_connect_apikey || Deno.env.get("KLYNN_CONNECT_APIKEY") || "klynn_evolution_secret_key_2026";
    if (!apiKey) throw new Error("Klynn Connect no tiene API key configurada");
    const instance = wa.instance || `klynn_${String(tenant.slug || tenant.id).replace(/[^a-zA-Z0-9_]/g, "_")}`;
    response = await fetch(`${base}/message/sendText/${instance}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: apiKey },
      body: JSON.stringify({ number: phone, text }),
    });
  } else {
    if (!wa.api_key) throw new Error("WasenderAPI no tiene token configurado para esta lavandería");
    const base = String(wa.base_url || "https://wasenderapi.com").replace(/\/$/, "");
    response = await fetch(`${base}/api/send-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${wa.api_key}`, Accept: "application/json" },
      body: JSON.stringify({ to: `+${phone}`, text, instance_id: wa.instance }),
    });
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || body?.error || `WhatsApp respondió HTTP ${response.status}`);
  await incrementWhatsApp(admin, tenant.id, count, now);
  return { recipient: phone, provider: engine, messageId: body?.key?.id || body?.id || null };
}

async function reserveDelivery(admin: any, tenantId: string, metrics: Metrics, channel: Channel, recipient: string, isTest: boolean) {
  if (!isTest) {
    const { data: existing } = await admin.from("weekly_summary_deliveries")
      .select("id,status")
      .eq("tenant_id", tenantId)
      .eq("summary_type", metrics.frequency)
      .eq("week_start", metrics.periodStart)
      .eq("channel", channel)
      .eq("is_test", false)
      .maybeSingle();
    if (existing?.status === "sent" || existing?.status === "processing") return null;
    if (existing) {
      await admin.from("weekly_summary_deliveries").update({ status: "processing", error_message: null, updated_at: new Date().toISOString() }).eq("id", existing.id);
      return existing.id;
    }
  }
  const { data, error } = await admin.from("weekly_summary_deliveries").insert({
    tenant_id: tenantId,
    summary_type: metrics.frequency,
    week_start: metrics.periodStart,
    period_end: metrics.periodEnd,
    channel,
    recipient,
    is_test: isTest,
  }).select("id").single();
  if (error) {
    if (error.code === "23505") return null;
    throw error;
  }
  return data.id as string;
}

function isScheduleDue(frequency: Frequency, now = new Date()) {
  const local = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  return frequency === "monthly" ? local.getUTCDate() === 1 : local.getUTCDay() === 1;
}

async function processTenant(
  admin: any,
  tenant: any,
  globalConfig: any,
  isTest: boolean,
  requestedChannel?: string,
  requestedFrequency?: string,
) {
  const config = (tenant.config?.weekly_summary || {}) as SummaryConfig;
  if (!isTest && config.enabled !== true) return { tenantId: tenant.id, skipped: true, sent: [], failed: [] };
  const frequency: Frequency = (requestedFrequency || config.frequency) === "monthly" ? "monthly" : "weekly";
  if (!isTest && !isScheduleDue(frequency)) {
    return { tenantId: tenant.id, skipped: true, reason: "not-due", sent: [], failed: [] };
  }
  const selected = requestedChannel || config.channel || "email";
  const channels: Channel[] = selected === "both" ? ["email", "whatsapp"] : [selected as Channel];
  const metrics = await buildMetrics(admin, tenant, frequency);
  const sent: string[] = [];
  const failed: Array<{ channel: string; error: string }> = [];

  for (const channel of channels) {
    const recipient = channel === "email" ? String(config.email || tenant.email || "") : normalizePhone(String(config.whatsapp_phone || ""));
    let deliveryId: string | null = null;
    try {
      deliveryId = await reserveDelivery(admin, tenant.id, metrics, channel, recipient, isTest);
      if (!deliveryId) continue;
      const result = channel === "email"
        ? await sendEmail(tenant, config, metrics)
        : await sendWhatsApp(admin, tenant, globalConfig, config, metrics);
      await admin.from("weekly_summary_deliveries").update({
        status: "sent",
        recipient: result.recipient,
        provider: result.provider,
        provider_message_id: result.messageId,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", deliveryId);
      sent.push(channel === "email" ? "correo" : "WhatsApp");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (deliveryId) {
        await admin.from("weekly_summary_deliveries").update({ status: "failed", error_message: message, updated_at: new Date().toISOString() }).eq("id", deliveryId);
      }
      failed.push({ channel, error: message });
    }
  }
  return { tenantId: tenant.id, sent, failed };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "Configuración incompleta de Supabase" }, 500);
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "test");
    const { data: globalConfig } = await admin.from("global_config").select("*").eq("id", 1).maybeSingle();

    if (action === "run-scheduled") {
      const expectedSecret = Deno.env.get("WEEKLY_SUMMARY_CRON_SECRET");
      if (!expectedSecret || req.headers.get("x-cron-secret") !== expectedSecret) return json({ error: "No autorizado" }, 401);
      const { data: tenants, error } = await admin.from("tenants").select("*").in("estado", ["ACTIVO", "TRIAL"]);
      if (error) throw error;
      const enabled = (tenants || []).filter((tenant: any) => tenant.config?.weekly_summary?.enabled === true);
      const results = [];
      for (const tenant of enabled) results.push(await processTenant(admin, tenant, globalConfig, false));
      return json({ processed: results.length, results });
    }

    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) return json({ error: "No autorizado" }, 401);
    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    const caller = userData?.user;
    if (userError || !caller) return json({ error: "Sesión inválida" }, 401);
    const tenantId = String(body?.tenantId || "");
    const { data: employee } = await admin.from("empleados").select("id,rol,activo,permisos").eq("id", caller.id).eq("tenant_id", tenantId).maybeSingle();
    const permissions = Array.isArray(employee?.permisos) ? employee.permisos : [];
    if (!employee?.activo || !(employee.rol === "ADMIN" || employee.rol === "SUPERVISOR" || permissions.includes("configuracion"))) {
      return json({ error: "No tienes permiso para enviar este resumen" }, 403);
    }
    const { data: tenant, error: tenantError } = await admin.from("tenants").select("*").eq("id", tenantId).single();
    if (tenantError || !tenant) return json({ error: "Lavandería no encontrada" }, 404);
    const result = await processTenant(
      admin,
      tenant,
      globalConfig,
      true,
      String(body?.channel || ""),
      String(body?.frequency || ""),
    );
    // Una prueba autenticada y procesada devuelve 200 aunque un canal falle.
    // Así la interfaz puede mostrar el motivo exacto incluido en `failed`.
    return json(result);
  } catch (error) {
    console.error("[weekly-business-summary]", error);
    return json({ error: error instanceof Error ? error.message : "Error inesperado" }, 500);
  }
});
