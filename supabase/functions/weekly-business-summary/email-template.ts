/* Hallmark · component: executive-summary-email · genre: modern-minimal · theme: Klynn
 * critique: P5 H5 E5 S5 R5 V5 · contrast: pass · responsive: pass
 */

type RankedMetric = { name: string; count: number; total: number };
type MonthlyExecutiveMetrics = {
  finance: { itbis: number; discounts: number; margin: number; paymentMethods: Array<{ name: string; total: number }> };
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
  cashAudit: { closures: number; perfect: number; shortages: number; overages: number; perfectRate: number; netDifference: number };
  fiscal: { issued: number; accepted: number; rejected: number; pending: number; acceptedWithReservations: number };
  alerts: Array<{ level: "critical" | "warning" | "info"; title: string; detail: string }>;
};

type SummaryEmailMetrics = {
  frequency: "weekly" | "monthly";
  periodStart: string;
  periodEnd: string;
  sales: number;
  orders: number;
  averageTicket: number;
  expenses: number;
  estimatedResult: number;
  salesChange: number | null;
  receivables: number;
  pendingOrders: number;
  fiscalIncidents: number;
  monthlyExecutive: MonthlyExecutiveMetrics | null;
};

const palette = {
  ink: "#0F172A",
  muted: "#64748B",
  primary: "#1B4B73",
  primarySoft: "#EFF6FF",
  border: "#E2E8F0",
  paper: "#FFFFFF",
  canvas: "#F8FAFC",
  success: "#047857",
  successSoft: "#ECFDF5",
  warning: "#B45309",
  warningSoft: "#FFFBEB",
  danger: "#BE123C",
  dangerSoft: "#FFF1F2",
  violet: "#6D28D9",
};

function money(value: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(value || 0).replace("DOP", "RD$");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[character] || character));
}

function metricCell(label: string, value: string, accent = palette.primary, note = "") {
  return `<td width="50%" valign="top" style="padding:6px"><div style="border:1px solid ${palette.border};border-radius:12px;padding:15px;background:${palette.paper}">
    <div style="font-size:10px;line-height:1.4;color:${palette.muted};font-weight:700;text-transform:uppercase;letter-spacing:.35px">${escapeHtml(label)}</div>
    <div style="font-size:19px;line-height:1.3;color:${accent};font-weight:800;margin-top:5px">${value}</div>
    ${note ? `<div style="font-size:11px;line-height:1.5;color:${palette.muted};margin-top:4px">${escapeHtml(note)}</div>` : ""}
  </div></td>`;
}

function listRows(items: Array<{ name: string; value: string }>, emptyText: string) {
  if (items.length === 0) return `<div style="font-size:12px;color:${palette.muted};padding:8px 0">${escapeHtml(emptyText)}</div>`;
  return items.map((item, index) => `<div style="padding:9px 0;border-bottom:${index === items.length - 1 ? "0" : `1px solid ${palette.border}`};font-size:12px;line-height:1.45">
    <span style="color:${palette.ink};font-weight:700">${escapeHtml(item.name)}</span>
    <span style="float:right;color:${palette.primary};font-weight:800">${item.value}</span>
  </div>`).join("");
}

function buildMonthlyExecutiveEmail(tenant: any, metrics: SummaryEmailMetrics) {
  const executive = metrics.monthlyExecutive!;
  const change = metrics.salesChange === null
    ? "Sin período anterior comparable"
    : `${metrics.salesChange >= 0 ? "+" : ""}${metrics.salesChange.toFixed(1)}% frente al mes anterior`;
  const paymentMethods = executive.finance.paymentMethods
    .map((method) => ({ name: method.name, value: money(method.total) }));
  const topGarments = executive.operations.topGarments
    .map((item) => ({ name: item.name, value: `${item.count} · ${money(item.total)}` }));
  const topServices = executive.operations.topServices
    .map((item) => ({ name: item.name, value: `${item.count} · ${money(item.total)}` }));
  const topDebtors = executive.receivables.topDebtors
    .map((item) => ({ name: item.name, value: money(item.total) }));
  const alertColors = {
    critical: { background: palette.dangerSoft, color: palette.danger },
    warning: { background: palette.warningSoft, color: palette.warning },
    info: { background: palette.primarySoft, color: palette.primary },
  };
  const alerts = executive.alerts.map((alert) => {
    const colors = alertColors[alert.level];
    return `<div style="margin-top:8px;padding:12px 14px;border-radius:10px;background:${colors.background};color:${colors.color};font-size:12px;line-height:1.5">
      <strong>${escapeHtml(alert.title)}</strong><br><span>${escapeHtml(alert.detail)}</span>
    </div>`;
  }).join("");

  return `<!doctype html><html lang="es"><body style="margin:0;background:${palette.canvas};font-family:Arial,sans-serif;color:${palette.ink}">
  <div style="display:none;font-size:1px;color:${palette.canvas};line-height:1px;max-height:0;opacity:0;overflow:hidden">Resumen ejecutivo de ${escapeHtml(tenant.nombre)}: finanzas, CXC, operación, caja y e-CF.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 10px"><tr><td align="center">
  <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:${palette.paper};border:1px solid ${palette.border};border-radius:18px;overflow:hidden">
    <tr><td style="height:5px;background:${palette.primary}"></td></tr>
    <tr><td style="padding:26px 28px 20px">
      <img src="https://api.klynn.com.do/storage/v1/object/public/assets/logotipo-klynn.png" alt="Klynn" width="150" style="display:block;max-width:150px;height:auto;border:0">
      <p style="margin:22px 0 4px;color:${palette.primary};font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px">Resumen ejecutivo mensual</p>
      <h1 style="font-size:25px;line-height:1.25;margin:0;color:${palette.ink}">${escapeHtml(tenant.nombre)}</h1>
      <p style="margin:7px 0 0;color:${palette.muted};font-size:13px">${metrics.periodStart} al ${metrics.periodEnd}</p>
    </td></tr>

    <tr><td style="padding:0 22px 22px"><div style="border-radius:14px;background:${palette.primary};padding:20px;color:${palette.paper}">
      <div style="font-size:11px;opacity:.82;font-weight:700;text-transform:uppercase">Resultado estimado</div>
      <div style="font-size:29px;font-weight:800;margin-top:5px">${money(metrics.estimatedResult)}</div>
      <div style="font-size:12px;line-height:1.5;margin-top:7px">Ventas ${money(metrics.sales)} · Margen ${executive.finance.margin.toFixed(1)}% · ${escapeHtml(change)}</div>
    </div></td></tr>

    <tr><td style="padding:4px 22px 8px"><h2 style="font-size:16px;margin:0 6px 8px;color:${palette.ink}">Finanzas y caja</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>${metricCell("Ventas", money(metrics.sales))}${metricCell("Gastos", money(metrics.expenses), palette.warning)}</tr>
        <tr>${metricCell("Órdenes", String(metrics.orders), palette.primary, `Ticket promedio ${money(metrics.averageTicket)}`)}${metricCell("ITBIS", money(executive.finance.itbis), palette.violet, `Descuentos ${money(executive.finance.discounts)}`)}</tr>
      </table>
      <div style="margin:8px 6px 18px;padding:14px;border:1px solid ${palette.border};border-radius:12px"><strong style="font-size:12px">Ingresos por método de pago</strong>${listRows(paymentMethods, "No hubo cobros registrados en el período.")}</div>
    </td></tr>

    <tr><td style="padding:4px 28px 22px"><h2 style="font-size:16px;margin:0 0 10px;color:${palette.ink}">Cuentas por cobrar</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        ${metricCell("Saldo pendiente", money(metrics.receivables), palette.violet, `${executive.receivables.invoices} facturas · ${executive.receivables.clients} clientes`)}
        ${metricCell("Mora crítica", money(executive.receivables.aging.critical), executive.receivables.aging.critical > 0 ? palette.danger : palette.success, "Más de 30 días vencida")}
      </tr></table>
      <div style="margin-top:8px;padding:14px;border:1px solid ${palette.border};border-radius:12px">
        <div style="font-size:12px;line-height:1.8;color:${palette.muted}">En plazo: <strong style="color:${palette.ink}">${money(executive.receivables.aging.current)}</strong> · Vencida 1–15 días: <strong style="color:${palette.ink}">${money(executive.receivables.aging.overdue15)}</strong><br>Vencida 16–30 días: <strong style="color:${palette.ink}">${money(executive.receivables.aging.overdue30)}</strong> · Mora crítica: <strong style="color:${palette.danger}">${money(executive.receivables.aging.critical)}</strong></div>
        <div style="margin-top:9px;font-size:12px;font-weight:800">Principales saldos</div>${listRows(topDebtors, "No hay cuentas por cobrar pendientes.")}
      </div>
    </td></tr>

    <tr><td style="padding:4px 22px 22px"><h2 style="font-size:16px;margin:0 6px 8px;color:${palette.ink}">Prendas, servicios y operación</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>${metricCell("Completadas", String(executive.operations.completed), palette.success, `${executive.operations.completionRate}% de las órdenes`)}${metricCell("Trabajo pendiente", String(executive.operations.inWorkshop + executive.operations.ready), palette.warning, `${executive.operations.inWorkshop} en taller · ${executive.operations.ready} listas`)}</tr>
        <tr>${metricCell("Prendas por pieza", String(executive.operations.pieces))}${metricCell("Prendas por libra", String(executive.operations.pounds))}</tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="50%" valign="top" style="padding:6px"><div style="padding:14px;border:1px solid ${palette.border};border-radius:12px"><strong style="font-size:12px">Prendas destacadas</strong>${listRows(topGarments, "Sin prendas registradas.")}</div></td>
        <td width="50%" valign="top" style="padding:6px"><div style="padding:14px;border:1px solid ${palette.border};border-radius:12px"><strong style="font-size:12px">Servicios destacados</strong>${listRows(topServices, "Sin servicios registrados.")}</div></td>
      </tr></table>
    </td></tr>

    <tr><td style="padding:4px 22px 22px"><h2 style="font-size:16px;margin:0 6px 8px;color:${palette.ink}">Auditoría de caja y facturación e-CF</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>${metricCell("Cierres de caja", String(executive.cashAudit.closures), palette.primary, `${executive.cashAudit.perfectRate}% cuadrados`)}${metricCell("Diferencia neta", money(executive.cashAudit.netDifference), executive.cashAudit.netDifference < 0 ? palette.danger : palette.success, `${executive.cashAudit.shortages} faltantes · ${executive.cashAudit.overages} sobrantes`)}</tr>
        <tr>${metricCell("e-CF emitidos", String(executive.fiscal.issued), palette.primary, `${executive.fiscal.accepted} aceptados`)}${metricCell("Rechazados / pendientes", `${executive.fiscal.rejected} / ${executive.fiscal.pending}`, executive.fiscal.rejected > 0 ? palette.danger : palette.success, `${executive.fiscal.acceptedWithReservations} con observaciones`)}</tr>
      </table>
    </td></tr>

    <tr><td style="padding:2px 28px 28px"><h2 style="font-size:16px;margin:0 0 8px;color:${palette.ink}">Atención ejecutiva</h2>${alerts}
      <a href="https://klynn.com.do/reportes?tenantId=${encodeURIComponent(tenant.id)}" style="display:block;background:${palette.primary};color:${palette.paper};text-decoration:none;text-align:center;border-radius:11px;padding:13px;margin-top:18px;font-weight:700">Abrir reportes completos</a>
    </td></tr>
    <tr><td style="padding:16px;text-align:center;border-top:1px solid ${palette.border};color:${palette.muted};font-size:11px">Klynn Cloud · Tu lavandería, simplificada.</td></tr>
  </table></td></tr></table></body></html>`;
}

export function buildBusinessSummaryEmail(tenant: any, metrics: SummaryEmailMetrics) {
  const isMonthly = metrics.frequency === "monthly";
  if (isMonthly && metrics.monthlyExecutive) return buildMonthlyExecutiveEmail(tenant, metrics);
  const summaryName = isMonthly ? "Resumen ejecutivo mensual" : "Resumen semanal";
  const comparisonName = isMonthly ? "mes anterior" : "semana anterior";
  const change = metrics.salesChange === null
    ? "Sin período anterior comparable"
    : `${metrics.salesChange >= 0 ? "+" : ""}${metrics.salesChange.toFixed(1)}% frente al ${comparisonName}`;
  const card = (label: string, value: string, accent = "#1B4B73") => `
    <td width="50%" style="padding:7px"><div style="border:1px solid #E2E8F0;border-radius:12px;padding:16px;background:#fff">
      <div style="font-size:11px;color:#64748B;font-weight:700;text-transform:uppercase">${label}</div>
      <div style="font-size:20px;color:${accent};font-weight:800;margin-top:6px">${value}</div>
    </div></td>`;

  return `<!doctype html><html lang="es"><body style="margin:0;background:#F8FAFC;font-family:Arial,sans-serif;color:#0F172A">
  <div style="display:none;font-size:1px;color:#F8FAFC;line-height:1px;max-height:0;opacity:0;overflow:hidden">Resultados de ${escapeHtml(tenant.nombre)} del ${metrics.periodStart} al ${metrics.periodEnd}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #E2E8F0;border-radius:18px;overflow:hidden">
    <tr><td style="height:5px;background:#1B4B73"></td></tr>
    <tr><td style="padding:28px 30px 12px;text-align:center">
      <img src="https://api.klynn.com.do/storage/v1/object/public/assets/logotipo-klynn.png" alt="Klynn" width="180" style="display:block;margin:auto;max-width:180px;height:auto;border:0">
      <h1 style="font-size:23px;line-height:1.3;margin:22px 0 5px;color:#0F172A">${summaryName} de ${escapeHtml(tenant.nombre)}</h1>
      <p style="margin:0;color:#64748B;font-size:13px">${metrics.periodStart} al ${metrics.periodEnd}</p>
    </td></tr>
    <tr><td style="padding:10px 23px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>${card("Ventas", money(metrics.sales))}${card("Órdenes", String(metrics.orders))}</tr>
      <tr>${card("Ticket promedio", money(metrics.averageTicket))}${card("Gastos", money(metrics.expenses), "#B45309")}</tr>
      <tr>${card("Resultado estimado", money(metrics.estimatedResult), metrics.estimatedResult >= 0 ? "#047857" : "#BE123C")}${card("Cuentas por cobrar", money(metrics.receivables), "#7C3AED")}</tr>
    </table></td></tr>
    <tr><td style="padding:8px 30px 28px">
      <div style="background:#EFF6FF;border:1px solid #DBEAFE;border-radius:12px;padding:15px;font-size:13px;line-height:1.7;color:#1E293B">
        <strong>${change}</strong><br>Órdenes pendientes: <strong>${metrics.pendingOrders}</strong><br>Incidencias fiscales del período: <strong>${metrics.fiscalIncidents}</strong>
      </div>
      <a href="https://klynn.com.do/t/${encodeURIComponent(tenant.slug)}/reportes" style="display:block;background:#1B4B73;color:#fff;text-decoration:none;text-align:center;border-radius:11px;padding:13px;margin-top:18px;font-weight:700">Ver reportes en Klynn</a>
    </td></tr>
    <tr><td style="padding:16px;text-align:center;border-top:1px solid #F1F5F9;color:#94A3B8;font-size:11px">Klynn Cloud · Tu lavandería, simplificada.</td></tr>
  </table></td></tr></table></body></html>`;
}
