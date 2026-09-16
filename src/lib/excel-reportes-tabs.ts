import XLSX from "xlsx-js-style";

export interface ReporteExportData {
  ordenes: any[];
  gastos: any[];
  movimientos: any[];
  cajas: any[];
  empleados: any[];
  clientes: any[];
  rawEcfDocs?: any[];
}

export interface ReporteSheetOptions {
  stats: any;
  data: ReporteExportData;
  tenantName: string;
  periodoLabel: string;
  fechaEmision: string;
  rnc?: string;
}

const borderThin = {
  top: { style: "thin", color: { rgb: "E2E8F0" } },
  bottom: { style: "thin", color: { rgb: "E2E8F0" } },
  left: { style: "thin", color: { rgb: "E2E8F0" } },
  right: { style: "thin", color: { rgb: "E2E8F0" } },
};

function getColumnLetter(colIndex: number): string {
  let letter = "";
  let temp = colIndex;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

function applyHeaderStyles(ws: any, numCols: number) {
  if (ws["A1"]) {
    ws["A1"].s = {
      font: { name: "Calibri", sz: 13, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1B4B73" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }
  if (ws["A2"]) {
    ws["A2"].s = {
      font: { name: "Calibri", sz: 9.5, italic: true, color: { rgb: "334155" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }
}

function applyKpiCards(
  ws: any,
  kpis: { cols: string[]; hBg: string; bBg: string; text: string; format?: string }[]
) {
  kpis.forEach((kpi) => {
    kpi.cols.forEach((col) => {
      const c4 = ws[`${col}4`];
      if (c4) {
        c4.s = {
          font: { name: "Calibri", sz: 9.5, bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: kpi.hBg } },
          alignment: { horizontal: "center", vertical: "center" },
        };
      }
      const c5 = ws[`${col}5`];
      if (c5) {
        c5.s = {
          font: { name: "Calibri", sz: 13.5, bold: true, color: { rgb: kpi.text } },
          fill: { fgColor: { rgb: kpi.bBg } },
          alignment: { horizontal: "center", vertical: "center" },
        };
        if (kpi.format) c5.z = kpi.format;
      }
      const c6 = ws[`${col}6`];
      if (c6) {
        c6.s = {
          font: { name: "Calibri", sz: 8.5, color: { rgb: "475569" } },
          fill: { fgColor: { rgb: kpi.bBg } },
          alignment: { horizontal: "center", vertical: "center" },
        };
      }
    });
  });
}

function applySectionTitle(ws: any, rowIdx: number, bgColor = "1B4B73") {
  const cell = ws[`A${rowIdx}`];
  if (cell) {
    cell.s = {
      font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: bgColor } },
      alignment: { horizontal: "left", vertical: "center" },
    };
  }
}

function applyTableHeaders(ws: any, rowIdx: number, numCols: number, bgColor = "1B4B73") {
  for (let c = 0; c < numCols; c++) {
    const letter = getColumnLetter(c);
    const cell = ws[`${letter}${rowIdx}`];
    if (cell) {
      cell.s = {
        font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: bgColor } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "thin", color: { rgb: "334155" } },
          bottom: { style: "medium", color: { rgb: "0F172A" } },
          left: { style: "thin", color: { rgb: "334155" } },
          right: { style: "thin", color: { rgb: "334155" } },
        },
      };
    }
  }
}

function applyDataRows(
  ws: any,
  startRow: number,
  rowCount: number,
  numCols: number,
  aligns: string[] = [],
  formats: (string | null)[] = [],
  boldCols: number[] = []
) {
  for (let i = 0; i < rowCount; i++) {
    const r = startRow + i;
    const isEven = i % 2 === 0;
    const bg = isEven ? "FFFFFF" : "F8FAFC";

    for (let c = 0; c < numCols; c++) {
      const letter = getColumnLetter(c);
      const cell = ws[`${letter}${r}`];
      if (!cell) continue;

      const align = aligns[c] || "left";
      cell.s = {
        font: { name: "Calibri", sz: 10, color: { rgb: "0F172A" } },
        fill: { fgColor: { rgb: bg } },
        alignment: { horizontal: align, vertical: "center" },
        border: borderThin,
      };

      if (boldCols.includes(c)) {
        cell.s.font.bold = true;
      }

      if (formats[c]) {
        cell.z = formats[c];
        if (formats[c]?.includes("RD$") || formats[c]?.includes("%")) {
          cell.s.font.bold = true;
        }
      }
    }
  }
}

function applyTotalRow(
  ws: any,
  rowIdx: number,
  numCols: number,
  formats: (string | null)[] = []
) {
  for (let c = 0; c < numCols; c++) {
    const letter = getColumnLetter(c);
    const cell = ws[`${letter}${rowIdx}`];
    if (!cell) continue;

    cell.s = {
      font: { name: "Calibri", sz: 10.5, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1B4B73" } },
      alignment: { horizontal: c === 0 ? "left" : "right", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "94A3B8" } },
        bottom: { style: "double", color: { rgb: "0F172A" } },
        left: { style: "thin", color: { rgb: "334155" } },
        right: { style: "thin", color: { rgb: "334155" } },
      },
    };
    if (formats[c]) {
      cell.z = formats[c];
    }
  }
}

function applyFooterNote(ws: any, rowIdx: number) {
  const cell = ws[`A${rowIdx}`];
  if (cell) {
    cell.s = {
      font: { name: "Calibri", sz: 8.5, italic: true, color: { rgb: "64748B" } },
      alignment: { horizontal: "left", vertical: "center" },
    };
  }
}

// =========================================================================
// 1. HOJA: FINANZAS & CAJA
// =========================================================================
export function buildSheetFinanzas(opts: ReporteSheetOptions) {
  const { stats, tenantName, periodoLabel, fechaEmision, data } = opts;
  const aoa: any[][] = [];

  aoa.push(["KLYNN CLOUD POS — REPORTE FINANCIERO Y GESTIÓN DE CAJA"]);
  aoa.push([`Empresa: ${tenantName}  |  Período: ${periodoLabel}  |  Emisión: ${fechaEmision}  |  Órdenes: ${data.ordenes.length}  |  Gastos: ${data.gastos.length}`]);
  aoa.push([]);

  // KPIs
  aoa.push(["VENTAS TOTALES", "", "GASTOS TOTALES", "", "RENTABILIDAD NETA", "", "TICKET PROMEDIO", ""]);
  aoa.push([stats.totalVentas || 0, "", stats.totalGastos || 0, "", stats.rentabilidad || 0, "", stats.ticketPromedio || 0, ""]);
  aoa.push([
    `${data.ordenes.length} órdenes facturadas`, "",
    `${data.gastos.length} egresos registrados`, "",
    stats.rentabilidad >= 0 ? "Margen operativo favorable" : "Déficit operativo", "",
    "Facturación media por orden", ""
  ]);
  aoa.push([]);

  // Sección 1: Indicadores Clave
  const s1Row = aoa.length + 1;
  aoa.push(["INDICADORES CLAVE DE GESTIÓN (KPIs)", "", "", ""]);
  aoa.push(["Indicador / Métrica", "Categoría", "Valor Registrado", "Detalle / Contexto"]);

  const kpisList = [
    ["Ventas Brutas Facturadas", "Finanzas", stats.totalVentas || 0, "Total neto facturado en el período"],
    ["Gastos Operativos Directos", "Finanzas", stats.gastosManuales || stats.totalGastos || 0, "Egresos manuales y compras"],
    ["Egresos por Caja Chica", "Finanzas", stats.gastosCajaChica || 0, "Compras menores y suministros de caja"],
    ["Beneficio Neto Operativo", "Finanzas", stats.rentabilidad || 0, "Ventas netas menos egresos totales"],
    ["Margen Operativo de Beneficio", "Rentabilidad", (stats.margenBeneficio || 0) / 100, "Margen neto sobre ventas"],
    ["ITBIS Fiscal Generado (18%)", "Fiscal", stats.totalITBIS || 0, "Total ITBIS para reporte DGII"],
    ["Ticket Promedio por Orden", "Ventas", stats.ticketPromedio || 0, "Facturación media por orden recibida"],
    ["Cuentas por Cobrar Pendientes (CXC)", "Créditos", stats.totalDeuda || 0, `${stats.cantidadDeudas || 0} órdenes con saldo pendiente`],
    ["Abonos Totales en Órdenes y Caja", "Cobros", (stats.totalAbonadoEnOrdenes || 0) + (stats.totalAbonosCaja || 0), "Cobros parciales recibidos"],
  ];
  kpisList.forEach(r => aoa.push(r));
  aoa.push([]);

  // Sección 2: Formas de Pago
  const s2Row = aoa.length + 1;
  aoa.push(["DISTRIBUCIÓN POR FORMAS DE PAGO", "", "", ""]);
  aoa.push(["Método de Pago", "Monto Recaudado (RD$)", "% de Participación", "Estado"]);

  const totalMetodos = Object.values(stats.porMetodo || {}).reduce((s: number, v: any) => s + Number(v), 0) || 1;
  const metodosEntries = Object.entries(stats.porMetodo || {}).sort((a: any, b: any) => b[1] - a[1]);
  metodosEntries.forEach(([metodo, monto]: any) => {
    const pct = monto / totalMetodos;
    aoa.push([metodo.replace(/_/g, " "), monto, pct, "COBRADO"]);
  });
  aoa.push(["TOTAL COBRADO POR FORMAS DE PAGO", totalMetodos, 1.0, "100%"]);
  aoa.push([]);

  // Sección 3: Gastos por Categoría
  const s3Row = aoa.length + 1;
  aoa.push(["DISTRIBUCIÓN DE GASTOS POR CATEGORÍA", "", "", ""]);
  aoa.push(["Categoría de Gasto", "Monto Ejecutado (RD$)", "% del Total", "Ámbito"]);

  const totalGastosSum = Object.values(stats.porCategoria || {}).reduce((s: number, v: any) => s + Number(v), 0) || 1;
  const catEntries = Object.entries(stats.porCategoria || {}).sort((a: any, b: any) => b[1] - a[1]);
  catEntries.forEach(([cat, monto]: any) => {
    const pct = monto / totalGastosSum;
    aoa.push([cat, monto, pct, "OPERACIÓN"]);
  });
  aoa.push(["TOTAL GASTOS EJECUTADOS", totalGastosSum, 1.0, "100%"]);
  aoa.push([]);
  aoa.push(["* Cifras expresadas en Pesos Dominicanos (RD$ / DOP). Generado oficialmente por Klynn Cloud POS."]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },
    { s: { r: 3, c: 2 }, e: { r: 3, c: 3 } },
    { s: { r: 4, c: 2 }, e: { r: 4, c: 3 } },
    { s: { r: 5, c: 2 }, e: { r: 5, c: 3 } },
    { s: { r: 3, c: 4 }, e: { r: 3, c: 5 } },
    { s: { r: 4, c: 4 }, e: { r: 4, c: 5 } },
    { s: { r: 5, c: 4 }, e: { r: 5, c: 5 } },
    { s: { r: 3, c: 6 }, e: { r: 3, c: 7 } },
    { s: { r: 4, c: 6 }, e: { r: 4, c: 7 } },
    { s: { r: 5, c: 6 }, e: { r: 5, c: 7 } },
    { s: { r: s1Row - 1, c: 0 }, e: { r: s1Row - 1, c: 3 } },
    { s: { r: s2Row - 1, c: 0 }, e: { r: s2Row - 1, c: 3 } },
    { s: { r: s3Row - 1, c: 0 }, e: { r: s3Row - 1, c: 3 } },
    { s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: 7 } },
  ];

  ws["!cols"] = [{ wch: 34 }, { wch: 22 }, { wch: 24 }, { wch: 34 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];

  applyHeaderStyles(ws, 8);
  applyKpiCards(ws, [
    { cols: ["A", "B"], hBg: "1E40AF", bBg: "EFF6FF", text: "1E3A8A", format: '"RD$ "#,##0.00' },
    { cols: ["C", "D"], hBg: "B91C1C", bBg: "FEF2F2", text: "B91C1C", format: '"RD$ "#,##0.00' },
    { cols: ["E", "F"], hBg: "047857", bBg: "ECFDF5", text: "047857", format: '"RD$ "#,##0.00' },
    { cols: ["G", "H"], hBg: "B45309", bBg: "FEF3C7", text: "B45309", format: '"RD$ "#,##0.00' },
  ]);

  // Styles Section 1
  applySectionTitle(ws, s1Row);
  applyTableHeaders(ws, s1Row + 1, 4, "1E40AF");
  applyDataRows(ws, s1Row + 2, kpisList.length, 4, ["left", "center", "right", "left"], [null, null, '"RD$ "#,##0.00', null], [0, 2]);

  // Margen % format exception
  const margenCell = ws[`C${s1Row + 6}`];
  if (margenCell) margenCell.z = "0.0%";

  // Styles Section 2
  applySectionTitle(ws, s2Row);
  applyTableHeaders(ws, s2Row + 1, 4, "047857");
  applyDataRows(ws, s2Row + 2, metodosEntries.length, 4, ["left", "right", "center", "center"], [null, '"RD$ "#,##0.00', "0.0%", null], [0]);
  applyTotalRow(ws, s2Row + 2 + metodosEntries.length, 4, [null, '"RD$ "#,##0.00', "0.0%", null]);

  // Styles Section 3
  applySectionTitle(ws, s3Row);
  applyTableHeaders(ws, s3Row + 1, 4, "4338CA");
  applyDataRows(ws, s3Row + 2, catEntries.length, 4, ["left", "right", "center", "center"], [null, '"RD$ "#,##0.00', "0.0%", null], [0]);
  applyTotalRow(ws, s3Row + 2 + catEntries.length, 4, [null, '"RD$ "#,##0.00', "0.0%", null]);

  applyFooterNote(ws, aoa.length);
  return ws;
}

// =========================================================================
// 2. HOJA: CUENTAS POR COBRAR (CXC)
// =========================================================================
export function buildSheetCXC(opts: ReporteSheetOptions) {
  const { stats, tenantName, periodoLabel, fechaEmision, data } = opts;
  const aoa: any[][] = [];

  aoa.push(["KLYNN CLOUD POS — CUENTAS POR COBRAR (CXC) Y GESTIÓN DE CRÉDITOS"]);
  aoa.push([`Empresa: ${tenantName}  |  Período: ${periodoLabel}  |  Emisión: ${fechaEmision}  |  Deudores: ${stats.listaDeudores?.length || 0}  |  Deuda: RD$ ${(stats.totalDeuda || 0).toLocaleString("es-DO")}`]);
  aoa.push([]);

  // KPIs
  aoa.push(["DEUDA TOTAL PENDIENTE", "", "CLIENTES CON DEUDA", "", "DEUDA EN PLAZO (<=30D)", "", "MORA CRÍTICA (>30D)", ""]);
  aoa.push([stats.totalDeuda || 0, "", stats.listaDeudores?.length || 0, "", stats.aging?.enPlazo || 0, "", stats.aging?.moraCritica || 0, ""]);
  aoa.push([
    "Saldo por cobrar acumulado", "",
    `${stats.listaDeudores?.length || 0} clientes en cartera`, "",
    "Créditos vigentes dentro de término", "",
    "Más de 30 días de vencimiento", ""
  ]);
  aoa.push([]);

  // Sección 1: Envejecimiento de la Cartera (Aging)
  const s1Row = aoa.length + 1;
  aoa.push(["ANÁLISIS DE ENVEJECIMIENTO DE CARTERA (AGING DE VENCIMIENTO)", "", "", ""]);
  aoa.push(["Rango de Vencimiento", "Monto Adeudado (RD$)", "% de la Cartera", "Nivel de Riesgo"]);

  const totD = stats.totalDeuda || 1;
  const agingRows = [
    ["En Plazo Acordado (<= 30 días)", stats.aging?.enPlazo || 0, (stats.aging?.enPlazo || 0) / totD, "BAJO (Vigente)"],
    ["Vencida de 1 a 15 días", stats.aging?.vencida1_15 || 0, (stats.aging?.vencida1_15 || 0) / totD, "MEDIO (Recordatorio)"],
    ["Vencida de 16 a 30 días", stats.aging?.vencida16_30 || 0, (stats.aging?.vencida16_30 || 0) / totD, "ALTO (Cobro Urgente)"],
    ["Mora Crítica (> 30 días)", stats.aging?.moraCritica || 0, (stats.aging?.moraCritica || 0) / totD, "CRÍTICO (Gestión Legal)"],
  ];
  agingRows.forEach(r => aoa.push(r));
  aoa.push(["TOTAL CARTERA DE CRÉDITOS", stats.totalDeuda || 0, 1.0, "100%"]);
  aoa.push([]);

  // Sección 2: Listado de Clientes Deudores
  const s2Row = aoa.length + 1;
  aoa.push(["LISTADO DETALLADO DE CLIENTES CON SALDO PENDIENTE", "", "", "", "", "", "", ""]);
  aoa.push([
    "Cliente / Razón Social",
    "Teléfono",
    "Cédula / RNC",
    "Categoría",
    "Facturas Pendientes",
    "Total Deuda (RD$)",
    "Facturación Histórica (RD$)",
    "Días Antigüedad Máx."
  ]);

  const deudores = stats.listaDeudores || [];
  let sumDeudoresDeuda = 0;
  let sumDeudoresFact = 0;

  deudores.forEach((d: any) => {
    const nom = d.cliente?.nombre || "Cliente Sin Nombre";
    const tel = d.cliente?.telefono || "—";
    const rnc = d.cliente?.rnc_cedula || d.cliente?.cedula || "—";
    const cat = d.categoriaCliente || "Cliente";
    const fCount = d.facturasPendientes?.length || 1;
    const deuda = Number(d.totalDeuda) || 0;
    const fact = Number(d.totalFacturado) || 0;
    const dias = d.diasMaxAntiguedad || 0;

    sumDeudoresDeuda += deuda;
    sumDeudoresFact += fact;

    aoa.push([nom, tel, rnc, cat, fCount, deuda, fact, dias]);
  });

  aoa.push(["TOTAL DEUDORES REGISTRADOS", "", "", "", deudores.length, sumDeudoresDeuda, sumDeudoresFact, ""]);
  aoa.push([]);

  // Sección 3: Facturas pendientes
  const s3Row = aoa.length + 1;
  aoa.push(["DETALLE DE FACTURAS Y ÓRDENES PENDIENTES CON SALDO", "", "", "", "", "", "", ""]);
  aoa.push([
    "Nº Orden",
    "Fecha Emisión",
    "Cliente",
    "Teléfono",
    "Total Orden (RD$)",
    "Monto Abonado (RD$)",
    "Saldo Pendiente (RD$)",
    "Estado Operativo"
  ]);

  const deudasOrdenes = data.ordenes.filter((o: any) => (o.saldo || 0) > 0);
  let sumOrdTot = 0;
  let sumOrdPag = 0;
  let sumOrdSal = 0;

  deudasOrdenes.forEach((o: any) => {
    const tot = Number(o.total) || 0;
    const pag = Number(o.pagado) || 0;
    const sal = Number(o.saldo) || 0;
    sumOrdTot += tot;
    sumOrdPag += pag;
    sumOrdSal += sal;

    aoa.push([
      o.numero || "—",
      (o.creado_en || "").substring(0, 10),
      o.cliente_nombre || "—",
      o.cliente_telefono || "—",
      tot,
      pag,
      sal,
      o.estado || "RECIBIDA"
    ]);
  });

  aoa.push(["TOTAL FACTURAS CON SALDO PENDIENTE", "", "", deudasOrdenes.length, sumOrdTot, sumOrdPag, sumOrdSal, ""]);
  aoa.push([]);
  aoa.push(["* Reporte de Cuentas por Cobrar (CXC). Valores expresados en Pesos Dominicanos (RD$). Generado por Klynn Cloud POS."]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },
    { s: { r: 3, c: 2 }, e: { r: 3, c: 3 } },
    { s: { r: 4, c: 2 }, e: { r: 4, c: 3 } },
    { s: { r: 5, c: 2 }, e: { r: 5, c: 3 } },
    { s: { r: 3, c: 4 }, e: { r: 3, c: 5 } },
    { s: { r: 4, c: 4 }, e: { r: 4, c: 5 } },
    { s: { r: 5, c: 4 }, e: { r: 5, c: 5 } },
    { s: { r: 3, c: 6 }, e: { r: 3, c: 7 } },
    { s: { r: 4, c: 6 }, e: { r: 4, c: 7 } },
    { s: { r: 5, c: 6 }, e: { r: 5, c: 7 } },
    { s: { r: s1Row - 1, c: 0 }, e: { r: s1Row - 1, c: 3 } },
    { s: { r: s2Row - 1, c: 0 }, e: { r: s2Row - 1, c: 7 } },
    { s: { r: s3Row - 1, c: 0 }, e: { r: s3Row - 1, c: 7 } },
    { s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: 7 } },
  ];

  ws["!cols"] = [
    { wch: 28 }, { wch: 18 }, { wch: 20 }, { wch: 16 },
    { wch: 18 }, { wch: 22 }, { wch: 24 }, { wch: 18 }
  ];

  applyHeaderStyles(ws, 8);
  applyKpiCards(ws, [
    { cols: ["A", "B"], hBg: "B91C1C", bBg: "FEF2F2", text: "B91C1C", format: '"RD$ "#,##0.00' },
    { cols: ["C", "D"], hBg: "B45309", bBg: "FEF3C7", text: "B45309", format: '#,##0' },
    { cols: ["E", "F"], hBg: "047857", bBg: "ECFDF5", text: "047857", format: '"RD$ "#,##0.00' },
    { cols: ["G", "H"], hBg: "6B21A8", bBg: "FAF5FF", text: "6B21A8", format: '"RD$ "#,##0.00' },
  ]);

  // Aging
  applySectionTitle(ws, s1Row, "B91C1C");
  applyTableHeaders(ws, s1Row + 1, 4, "1E40AF");
  applyDataRows(ws, s1Row + 2, agingRows.length, 4, ["left", "right", "center", "center"], [null, '"RD$ "#,##0.00', "0.0%", null], [0]);
  applyTotalRow(ws, s1Row + 2 + agingRows.length, 4, [null, '"RD$ "#,##0.00', "0.0%", null]);

  // Deudores
  applySectionTitle(ws, s2Row, "B91C1C");
  applyTableHeaders(ws, s2Row + 1, 8, "1B4B73");
  applyDataRows(ws, s2Row + 2, deudores.length, 8, ["left", "center", "center", "center", "center", "right", "right", "center"], [null, null, null, null, '#,##0', '"RD$ "#,##0.00', '"RD$ "#,##0.00', '#,##0'], [0, 5]);
  applyTotalRow(ws, s2Row + 2 + deudores.length, 8, [null, null, null, null, '#,##0', '"RD$ "#,##0.00', '"RD$ "#,##0.00', null]);

  // Facturas con saldo
  applySectionTitle(ws, s3Row, "1B4B73");
  applyTableHeaders(ws, s3Row + 1, 8, "047857");
  applyDataRows(ws, s3Row + 2, deudasOrdenes.length, 8, ["center", "center", "left", "center", "right", "right", "right", "center"], [null, null, null, null, '"RD$ "#,##0.00', '"RD$ "#,##0.00', '"RD$ "#,##0.00', null], [0, 6]);
  applyTotalRow(ws, s3Row + 2 + deudasOrdenes.length, 8, [null, null, null, '#,##0', '"RD$ "#,##0.00', '"RD$ "#,##0.00', '"RD$ "#,##0.00', null]);

  applyFooterNote(ws, aoa.length);
  return ws;
}

// =========================================================================
// 3. HOJA: PRENDAS & SERVICIOS
// =========================================================================
export function buildSheetPrendas(opts: ReporteSheetOptions) {
  const { stats, tenantName, periodoLabel, fechaEmision } = opts;
  const aoa: any[][] = [];

  aoa.push(["KLYNN CLOUD POS — OPERACIONES: PRENDAS Y SERVICIOS"]);
  aoa.push([`Empresa: ${tenantName}  |  Período: ${periodoLabel}  |  Emisión: ${fechaEmision}  |  Piezas: ${stats.totalPiezas || 0}  |  Libras: ${stats.totalLibras || 0} lbs`]);
  aoa.push([]);

  // KPIs
  aoa.push(["PRENDAS POR PIEZA", "", "VOLUMEN POR LIBRA", "", "FACTURACIÓN PRENDAS", "", "SERVICIOS APLICADOS", ""]);
  const totServiciosCount = (stats.topServicios || []).reduce((s: number, x: any) => s + (Number(x.count) || 0), 0);
  aoa.push([stats.totalPiezas || 0, "", stats.totalLibras || 0, "", stats.totalMontoPrendas || 0, "", totServiciosCount, ""]);
  aoa.push([
    "Unidades lavadas por pieza", "",
    "Libras procesadas de lavandería", "",
    "Ingresos netos por prendas", "",
    "Servicios contratados en órdenes", ""
  ]);
  aoa.push([]);

  // Sección 1: Ranking Servicios
  const s1Row = aoa.length + 1;
  aoa.push(["RANKING DE SERVICIOS CON MAYOR FACTURACIÓN", "", "", "", ""]);
  aoa.push(["Posición", "Nombre del Servicio", "Órdenes Realizadas", "Facturación Total (RD$)", "% del Total"]);

  const topServicios = stats.topServicios || [];
  let sumServCount = 0;
  let sumServTotal = 0;
  topServicios.forEach((s: any) => {
    sumServCount += s.count || 0;
    sumServTotal += s.total || 0;
  });

  topServicios.forEach((s: any, idx: number) => {
    const pct = sumServTotal > 0 ? s.total / sumServTotal : 0;
    aoa.push([`#${idx + 1}`, s.name, s.count, s.total, pct]);
  });
  aoa.push(["TOTAL SERVICIOS", "", sumServCount, sumServTotal, 1.0]);
  aoa.push([]);

  // Sección 2: Ranking Prendas
  const s2Row = aoa.length + 1;
  aoa.push(["RANKING DE PRENDAS Y ARTÍCULOS PROCESADOS", "", "", "", "", ""]);
  aoa.push(["Posición", "Nombre de Prenda", "Categoría", "Tipo Medida", "Unidades / Cantidad", "Ingresos Generados (RD$)"]);

  const topPrendas = stats.topPrendas || [];
  let sumPrendCount = 0;
  let sumPrendTotal = 0;

  topPrendas.forEach((p: any, idx: number) => {
    sumPrendCount += p.count || 0;
    sumPrendTotal += p.total || 0;
    aoa.push([
      `#${idx + 1}`,
      p.name,
      p.categoria || "Prenda",
      p.es_libra ? "Por Libra" : "Por Pieza",
      p.count,
      p.total
    ]);
  });
  aoa.push(["TOTAL PRENDAS PROCESADAS", "", "", "", sumPrendCount, sumPrendTotal]);
  aoa.push([]);

  // Sección 3: Cruce Operativo
  const s3Row = aoa.length + 1;
  aoa.push(["CRUCE OPERATIVO — PRENDAS ATENDIDAS POR CADA SERVICIO", "", "", ""]);
  aoa.push(["Servicio", "Prenda Procesada", "Unidades / Cantidad", "Facturación Aportada (RD$)"]);

  let cruceCount = 0;
  topServicios.forEach((s: any) => {
    (s.rankingPrendas || []).forEach((p: any) => {
      aoa.push([s.name, p.name, p.count, p.total]);
      cruceCount++;
    });
  });
  aoa.push([]);
  aoa.push(["* Estadísticas operativas y desglose por servicios. Generado por Klynn Cloud POS."]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },
    { s: { r: 3, c: 2 }, e: { r: 3, c: 3 } },
    { s: { r: 4, c: 2 }, e: { r: 4, c: 3 } },
    { s: { r: 5, c: 2 }, e: { r: 5, c: 3 } },
    { s: { r: 3, c: 4 }, e: { r: 3, c: 5 } },
    { s: { r: 4, c: 4 }, e: { r: 4, c: 5 } },
    { s: { r: 5, c: 4 }, e: { r: 5, c: 5 } },
    { s: { r: 3, c: 6 }, e: { r: 3, c: 7 } },
    { s: { r: 4, c: 6 }, e: { r: 4, c: 7 } },
    { s: { r: 5, c: 6 }, e: { r: 5, c: 7 } },
    { s: { r: s1Row - 1, c: 0 }, e: { r: s1Row - 1, c: 4 } },
    { s: { r: s2Row - 1, c: 0 }, e: { r: s2Row - 1, c: 5 } },
    { s: { r: s3Row - 1, c: 0 }, e: { r: s3Row - 1, c: 3 } },
    { s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: 7 } },
  ];

  ws["!cols"] = [
    { wch: 14 }, { wch: 32 }, { wch: 22 }, { wch: 18 },
    { wch: 24 }, { wch: 22 }, { wch: 18 }, { wch: 18 }
  ];

  applyHeaderStyles(ws, 8);
  applyKpiCards(ws, [
    { cols: ["A", "B"], hBg: "1E40AF", bBg: "EFF6FF", text: "1E3A8A", format: '#,##0" piezas"' },
    { cols: ["C", "D"], hBg: "0F766E", bBg: "F0FDFA", text: "0F766E", format: '#,##0.00" lbs"' },
    { cols: ["E", "F"], hBg: "047857", bBg: "ECFDF5", text: "047857", format: '"RD$ "#,##0.00' },
    { cols: ["G", "H"], hBg: "4338CA", bBg: "EEF2FF", text: "4338CA", format: '#,##0' },
  ]);

  // Servicios
  applySectionTitle(ws, s1Row, "1E40AF");
  applyTableHeaders(ws, s1Row + 1, 5, "1B4B73");
  applyDataRows(ws, s1Row + 2, topServicios.length, 5, ["center", "left", "center", "right", "center"], [null, null, '#,##0', '"RD$ "#,##0.00', "0.0%"], [1, 3]);
  applyTotalRow(ws, s1Row + 2 + topServicios.length, 5, [null, null, '#,##0', '"RD$ "#,##0.00', "0.0%"]);

  // Prendas
  applySectionTitle(ws, s2Row, "047857");
  applyTableHeaders(ws, s2Row + 1, 6, "047857");
  applyDataRows(ws, s2Row + 2, topPrendas.length, 6, ["center", "left", "center", "center", "center", "right"], [null, null, null, null, '#,##0', '"RD$ "#,##0.00'], [1, 5]);
  applyTotalRow(ws, s2Row + 2 + topPrendas.length, 6, [null, null, null, null, '#,##0', '"RD$ "#,##0.00']);

  // Cruce
  applySectionTitle(ws, s3Row, "4338CA");
  applyTableHeaders(ws, s3Row + 1, 4, "1B4B73");
  applyDataRows(ws, s3Row + 2, cruceCount, 4, ["left", "left", "center", "right"], [null, null, '#,##0', '"RD$ "#,##0.00'], [0, 3]);

  applyFooterNote(ws, aoa.length);
  return ws;
}

// =========================================================================
// 4. HOJA: EQUIPO DE TRABAJO
// =========================================================================
export function buildSheetEquipo(opts: ReporteSheetOptions) {
  const { tenantName, periodoLabel, fechaEmision, data } = opts;
  const aoa: any[][] = [];

  aoa.push(["KLYNN CLOUD POS — RENDIMIENTO Y VENTAS POR COLABORADOR"]);
  aoa.push([`Empresa: ${tenantName}  |  Período: ${periodoLabel}  |  Emisión: ${fechaEmision}  |  Personal: ${data.empleados.length}`]);
  aoa.push([]);

  const emps = data.empleados || [];
  let totEmpOrds = 0;
  let totEmpVentas = 0;

  const empsData = emps.map((e: any) => {
    const empOrds = data.ordenes.filter((o: any) => o.empleado_id === e.id);
    const total = empOrds.reduce((s: number, o: any) => s + (Number(o.total) || 0), 0);
    totEmpOrds += empOrds.length;
    totEmpVentas += total;
    return {
      nombre: e.nombre || "—",
      rol: e.rol || "COLABORADOR",
      count: empOrds.length,
      total,
    };
  });

  empsData.sort((a, b) => b.total - a.total);
  const tPromGeneral = totEmpOrds > 0 ? totEmpVentas / totEmpOrds : 0;

  // KPIs
  aoa.push(["COLABORADORES ACTIVOS", "", "VENTAS TOTALES EQUIPO", "", "ÓRDENES ATENDIDAS", "", "TICKET PROMEDIO GENERAL", ""]);
  aoa.push([emps.length, "", totEmpVentas, "", totEmpOrds, "", tPromGeneral, ""]);
  aoa.push([
    "Personal registrado en sucursal", "",
    "Facturación conjunta del equipo", "",
    "Órdenes gestionadas por personal", "",
    "Promedio general por orden", ""
  ]);
  aoa.push([]);

  // Tabla
  const sRow = aoa.length + 1;
  aoa.push(["DESGLOSE DE VENTAS Y PRODUCTIVIDAD POR COLABORADOR", "", "", "", "", ""]);
  aoa.push(["Colaborador / Empleado", "Rol / Cargo", "Órdenes Atendidas", "Ventas Totales (RD$)", "% del Total", "Ticket Promedio (RD$)"]);

  empsData.forEach((ed) => {
    const pct = totEmpVentas > 0 ? ed.total / totEmpVentas : 0;
    const tProm = ed.count > 0 ? ed.total / ed.count : 0;
    aoa.push([ed.nombre, ed.rol, ed.count, ed.total, pct, tProm]);
  });

  aoa.push(["TOTAL GENERAL DEL EQUIPO", "", totEmpOrds, totEmpVentas, 1.0, tPromGeneral]);
  aoa.push([]);
  aoa.push(["* Métricas de desempeño individual calculadas desde Klynn Cloud POS."]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },
    { s: { r: 3, c: 2 }, e: { r: 3, c: 3 } },
    { s: { r: 4, c: 2 }, e: { r: 4, c: 3 } },
    { s: { r: 5, c: 2 }, e: { r: 5, c: 3 } },
    { s: { r: 3, c: 4 }, e: { r: 3, c: 5 } },
    { s: { r: 4, c: 4 }, e: { r: 4, c: 5 } },
    { s: { r: 5, c: 4 }, e: { r: 5, c: 5 } },
    { s: { r: 3, c: 6 }, e: { r: 3, c: 7 } },
    { s: { r: 4, c: 6 }, e: { r: 4, c: 7 } },
    { s: { r: 5, c: 6 }, e: { r: 5, c: 7 } },
    { s: { r: sRow - 1, c: 0 }, e: { r: sRow - 1, c: 5 } },
    { s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: 7 } },
  ];

  ws["!cols"] = [{ wch: 28 }, { wch: 20 }, { wch: 18 }, { wch: 24 }, { wch: 16 }, { wch: 22 }, { wch: 18 }, { wch: 18 }];

  applyHeaderStyles(ws, 8);
  applyKpiCards(ws, [
    { cols: ["A", "B"], hBg: "1E40AF", bBg: "EFF6FF", text: "1E3A8A", format: '#,##0' },
    { cols: ["C", "D"], hBg: "047857", bBg: "ECFDF5", text: "047857", format: '"RD$ "#,##0.00' },
    { cols: ["E", "F"], hBg: "4338CA", bBg: "EEF2FF", text: "4338CA", format: '#,##0' },
    { cols: ["G", "H"], hBg: "B45309", bBg: "FEF3C7", text: "B45309", format: '"RD$ "#,##0.00' },
  ]);

  applySectionTitle(ws, sRow, "1E40AF");
  applyTableHeaders(ws, sRow + 1, 6, "1B4B73");
  applyDataRows(ws, sRow + 2, empsData.length, 6, ["left", "center", "center", "right", "center", "right"], [null, null, '#,##0', '"RD$ "#,##0.00', "0.0%", '"RD$ "#,##0.00'], [0, 3]);
  applyTotalRow(ws, sRow + 2 + empsData.length, 6, [null, null, '#,##0', '"RD$ "#,##0.00', "0.0%", '"RD$ "#,##0.00']);

  applyFooterNote(ws, aoa.length);
  return ws;
}

// =========================================================================
// 5. HOJA: LOGÍSTICA & DELIVERY
// =========================================================================
export function buildSheetLogistica(opts: ReporteSheetOptions) {
  const { stats, tenantName, periodoLabel, fechaEmision, data } = opts;
  const aoa: any[][] = [];

  aoa.push(["KLYNN CLOUD POS — LOGÍSTICA Y ENTREGAS A DOMICILIO"]);
  aoa.push([`Empresa: ${tenantName}  |  Período: ${periodoLabel}  |  Emisión: ${fechaEmision}  |  Envíos Domicilio: ${stats.ordsDomicilio || 0}`]);
  aoa.push([]);

  // KPIs
  aoa.push(["TOTAL ENVIOS DOMICILIO", "", "ENTREGADAS CON ÉXITO", "", "EN CAMINO / EN RUTA", "", "INGRESOS POR ENVÍO", ""]);
  aoa.push([stats.ordsDomicilio || 0, "", stats.deliveryEntregados || 0, "", stats.deliveryEnRuta || 0, "", stats.deliveryIngresosEnvio || 0, ""]);
  aoa.push([
    "Total órdenes solicitadas a domicilio", "",
    "Entregas completadas a clientes", "",
    "Repartidores actualmente en ruta", "",
    "Tarifas cobradas por transporte", ""
  ]);
  aoa.push([]);

  // Sección 1: Sectores
  const s1Row = aoa.length + 1;
  aoa.push(["RENDIMIENTO POR SECTORES DE ENTREGA", "", "", "", "", "", ""]);
  aoa.push(["Sector / Zona", "Envíos Realizados", "Entregadas", "En Camino", "Pendientes", "Total Facturado (RD$)", "Tarifas de Envío (RD$)"]);

  const topSectores = stats.topSectores || [];
  let sumSecCount = 0;
  let sumSecEnt = 0;
  let sumSecCam = 0;
  let sumSecPen = 0;
  let sumSecTot = 0;
  let sumSecTar = 0;

  topSectores.forEach((sec: any) => {
    sumSecCount += sec.count || 0;
    sumSecEnt += sec.entregadas || 0;
    sumSecCam += sec.enCamino || 0;
    sumSecPen += sec.pendientes || 0;
    sumSecTot += sec.totalFacturado || 0;
    sumSecTar += sec.totalTarifas || 0;

    aoa.push([
      sec.sector,
      sec.count,
      sec.entregadas,
      sec.enCamino,
      sec.pendientes,
      sec.totalFacturado,
      sec.totalTarifas
    ]);
  });

  aoa.push(["TOTAL SECTORES ATENDIDOS", sumSecCount, sumSecEnt, sumSecCam, sumSecPen, sumSecTot, sumSecTar]);
  aoa.push([]);

  // Sección 2: Listado de Órdenes a Domicilio
  const s2Row = aoa.length + 1;
  aoa.push(["LISTADO DETALLADO DE ÓRDENES A DOMICILIO", "", "", "", "", "", "", ""]);
  aoa.push(["Nº Orden", "Fecha", "Cliente", "Teléfono", "Sector / Dirección", "Tarifa Envío (RD$)", "Total Factura (RD$)", "Estado Entrega"]);

  const cliMap = new Map((data.clientes || []).map((c: any) => [c.id, c]));
  const domOrdenes = data.ordenes.filter((o: any) => {
    if (o.estado === "ANULADA") return false;
    const cli = cliMap.get(o.cliente_id);
    return o.entrega_domicilio || (o.costo_envio && o.costo_envio > 0) || !!cli?.direccion || !!o.repartidor_id || o.tipo_entrega === "DOMICILIO" || !!o.sector_entrega;
  });

  let sumDomTar = 0;
  let sumDomTot = 0;

  domOrdenes.forEach((o: any) => {
    const cli = cliMap.get(o.cliente_id);
    const tar = Number(o.costo_envio) || 0;
    const tot = Number(o.total) || 0;
    sumDomTar += tar;
    sumDomTot += tot;

    aoa.push([
      o.numero || "—",
      (o.creado_en || "").substring(0, 10),
      o.cliente_nombre || cli?.nombre || "—",
      o.cliente_telefono || cli?.telefono || "—",
      o.sector_entrega || cli?.sector || o.direccion_entrega || cli?.direccion || "Local",
      tar,
      tot,
      o.estado || "RECIBIDA"
    ]);
  });

  aoa.push(["TOTAL ÓRDENES A DOMICILIO", "", "", domOrdenes.length, "", sumDomTar, sumDomTot, ""]);
  aoa.push([]);
  aoa.push(["* Reporte de rutas y envíos a domicilio. Generado por Klynn Cloud POS."]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },
    { s: { r: 3, c: 2 }, e: { r: 3, c: 3 } },
    { s: { r: 4, c: 2 }, e: { r: 4, c: 3 } },
    { s: { r: 5, c: 2 }, e: { r: 5, c: 3 } },
    { s: { r: 3, c: 4 }, e: { r: 3, c: 5 } },
    { s: { r: 4, c: 4 }, e: { r: 4, c: 5 } },
    { s: { r: 5, c: 4 }, e: { r: 5, c: 5 } },
    { s: { r: 3, c: 6 }, e: { r: 3, c: 7 } },
    { s: { r: 4, c: 6 }, e: { r: 4, c: 7 } },
    { s: { r: 5, c: 6 }, e: { r: 5, c: 7 } },
    { s: { r: s1Row - 1, c: 0 }, e: { r: s1Row - 1, c: 6 } },
    { s: { r: s2Row - 1, c: 0 }, e: { r: s2Row - 1, c: 7 } },
    { s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: 7 } },
  ];

  ws["!cols"] = [
    { wch: 16 }, { wch: 16 }, { wch: 28 }, { wch: 18 },
    { wch: 30 }, { wch: 20 }, { wch: 22 }, { wch: 18 }
  ];

  applyHeaderStyles(ws, 8);
  applyKpiCards(ws, [
    { cols: ["A", "B"], hBg: "1E40AF", bBg: "EFF6FF", text: "1E3A8A", format: '#,##0' },
    { cols: ["C", "D"], hBg: "047857", bBg: "ECFDF5", text: "047857", format: '#,##0' },
    { cols: ["E", "F"], hBg: "B45309", bBg: "FEF3C7", text: "B45309", format: '#,##0' },
    { cols: ["G", "H"], hBg: "0F766E", bBg: "F0FDFA", text: "0F766E", format: '"RD$ "#,##0.00' },
  ]);

  applySectionTitle(ws, s1Row, "0F766E");
  applyTableHeaders(ws, s1Row + 1, 7, "1B4B73");
  applyDataRows(ws, s1Row + 2, topSectores.length, 7, ["left", "center", "center", "center", "center", "right", "right"], [null, '#,##0', '#,##0', '#,##0', '#,##0', '"RD$ "#,##0.00', '"RD$ "#,##0.00'], [0, 5]);
  applyTotalRow(ws, s1Row + 2 + topSectores.length, 7, [null, '#,##0', '#,##0', '#,##0', '#,##0', '"RD$ "#,##0.00', '"RD$ "#,##0.00']);

  applySectionTitle(ws, s2Row, "1B4B73");
  applyTableHeaders(ws, s2Row + 1, 8, "047857");
  applyDataRows(ws, s2Row + 2, domOrdenes.length, 8, ["center", "center", "left", "center", "left", "right", "right", "center"], [null, null, null, null, null, '"RD$ "#,##0.00', '"RD$ "#,##0.00', null], [0, 6]);
  applyTotalRow(ws, s2Row + 2 + domOrdenes.length, 8, [null, null, null, '#,##0', null, '"RD$ "#,##0.00', '"RD$ "#,##0.00', null]);

  applyFooterNote(ws, aoa.length);
  return ws;
}

// =========================================================================
// 6. HOJA: FACTURACIÓN FISCAL e-CF (DGII)
// =========================================================================
export function buildSheetFiscal(opts: ReporteSheetOptions) {
  const { stats, tenantName, periodoLabel, fechaEmision, data, rnc } = opts;
  const aoa: any[][] = [];

  aoa.push(["KLYNN CLOUD POS — COMPROBANTES FISCALES Y FACTURACIÓN ELECTRÓNICA (e-CF / DGII)"]);
  aoa.push([`Empresa: ${tenantName}  |  RNC Emisor: ${rnc || "—"}  |  Período: ${periodoLabel}  |  Emisión: ${fechaEmision}  |  e-NCF: ${stats.ordsFiscalesCount || 0}`]);
  aoa.push([]);

  // KPIs
  aoa.push(["TOTAL FACTURADO FISCAL", "", "BASE IMPONIBLE GRAVADA", "", "ITBIS 18% RECAUDADO", "", "COMPROBANTES DGII", ""]);
  const baseImponible = (stats.totalVentasFiscales || 0) - (stats.totalItbisFiscal || 0);
  aoa.push([stats.totalVentasFiscales || 0, "", baseImponible, "", stats.totalItbisFiscal || 0, "", stats.ordsFiscalesCount || 0, ""]);
  aoa.push([
    "Total facturado con comprobante", "",
    "Base imponible gravada", "",
    "Total ITBIS fiscal generado", "",
    "Comprobantes emitidos en período", ""
  ]);
  aoa.push([]);

  // Sección 1: Resumen por Tipo Comprobante
  const s1Row = aoa.length + 1;
  aoa.push(["RESUMEN POR TIPO DE COMPROBANTE DGII", "", "", "", "", ""]);
  aoa.push(["Código", "Nombre Oficial DGII", "Cantidad Emitida", "Total Facturado (RD$)", "ITBIS Gravado (RD$)", "% del Total"]);

  const listaFiscal = stats.listaComprobantesFiscales || [];
  let sumFiscCount = 0;
  let sumFiscTot = 0;
  let sumFiscItb = 0;

  listaFiscal.forEach((f: any) => {
    sumFiscCount += f.count || 0;
    sumFiscTot += f.totalVentas || 0;
    sumFiscItb += f.totalItbis || 0;
  });

  listaFiscal.forEach((f: any) => {
    const pct = sumFiscTot > 0 ? f.totalVentas / sumFiscTot : 0;
    aoa.push([f.codigo, f.nombreOficial, f.count, f.totalVentas, f.totalItbis, pct]);
  });

  aoa.push(["TOTAL COMPROBANTES FISCALES", "", sumFiscCount, sumFiscTot, sumFiscItb, 1.0]);
  aoa.push([]);

  // Sección 2: Libro Detallado
  const s2Row = aoa.length + 1;
  aoa.push(["LIBRO DETALLADO DE FACTURAS FISCALES EMITIDAS", "", "", "", "", "", "", "", "", "", ""]);
  aoa.push([
    "Nº Orden",
    "Comprobante (e-NCF / NCF)",
    "Tipo Comprobante",
    "Fecha Emisión",
    "RNC / Cédula Cliente",
    "Cliente / Razón Social",
    "Subtotal (RD$)",
    "ITBIS (RD$)",
    "Total Factura (RD$)",
    "Forma Pago",
    "Estado DGII"
  ]);

  const ordsFiscales = data.ordenes.filter((o: any) => !!o.ncf || !!o.tipo_ecf);
  let sumSub = 0;
  let sumItb = 0;
  let sumTot = 0;

  ordsFiscales.forEach((o: any) => {
    const sub = Number(o.subtotal) || 0;
    const itb = Number(o.itbis) || 0;
    const tot = Number(o.total) || 0;
    sumSub += sub;
    sumItb += itb;
    sumTot += tot;

    aoa.push([
      o.numero || "—",
      o.ncf || o.tipo_ecf || "—",
      o.tipo_ecf || "Comprobante Fiscal",
      (o.creado_en || "").substring(0, 10),
      o.cliente_rnc || o.rnc || "Consumidor Final",
      o.cliente_nombre || "Consumidor Final",
      sub,
      itb,
      tot,
      (o.metodo_pago || "Efectivo").replace(/_/g, " "),
      "REGISTRADO_DGII"
    ]);
  });

  aoa.push(["TOTALES FISCALES", "", "", "", "", ordsFiscales.length, sumSub, sumItb, sumTot, "", ""]);
  aoa.push([]);
  aoa.push(["* Reporte oficial según normativa DGII de la República Dominicana. Generado por Klynn Cloud POS."]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },
    { s: { r: 3, c: 2 }, e: { r: 3, c: 3 } },
    { s: { r: 4, c: 2 }, e: { r: 4, c: 3 } },
    { s: { r: 5, c: 2 }, e: { r: 5, c: 3 } },
    { s: { r: 3, c: 4 }, e: { r: 3, c: 5 } },
    { s: { r: 4, c: 4 }, e: { r: 4, c: 5 } },
    { s: { r: 5, c: 4 }, e: { r: 5, c: 5 } },
    { s: { r: 3, c: 6 }, e: { r: 3, c: 7 } },
    { s: { r: 4, c: 6 }, e: { r: 4, c: 7 } },
    { s: { r: 5, c: 6 }, e: { r: 5, c: 7 } },
    { s: { r: s1Row - 1, c: 0 }, e: { r: s1Row - 1, c: 5 } },
    { s: { r: s2Row - 1, c: 0 }, e: { r: s2Row - 1, c: 10 } },
    { s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: 10 } },
  ];

  ws["!cols"] = [
    { wch: 16 }, { wch: 24 }, { wch: 26 }, { wch: 16 },
    { wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 18 },
    { wch: 22 }, { wch: 18 }, { wch: 20 }
  ];

  applyHeaderStyles(ws, 11);
  applyKpiCards(ws, [
    { cols: ["A", "B"], hBg: "1E40AF", bBg: "EFF6FF", text: "1E3A8A", format: '"RD$ "#,##0.00' },
    { cols: ["C", "D"], hBg: "047857", bBg: "ECFDF5", text: "047857", format: '"RD$ "#,##0.00' },
    { cols: ["E", "F"], hBg: "B45309", bBg: "FEF3C7", text: "B45309", format: '"RD$ "#,##0.00' },
    { cols: ["G", "H"], hBg: "4338CA", bBg: "EEF2FF", text: "4338CA", format: '#,##0' },
  ]);

  applySectionTitle(ws, s1Row, "4338CA");
  applyTableHeaders(ws, s1Row + 1, 6, "1B4B73");
  applyDataRows(ws, s1Row + 2, listaFiscal.length, 6, ["center", "left", "center", "right", "right", "center"], [null, null, '#,##0', '"RD$ "#,##0.00', '"RD$ "#,##0.00', "0.0%"], [0, 3]);
  applyTotalRow(ws, s1Row + 2 + listaFiscal.length, 6, [null, null, '#,##0', '"RD$ "#,##0.00', '"RD$ "#,##0.00', "0.0%"]);

  applySectionTitle(ws, s2Row, "1B4B73");
  applyTableHeaders(ws, s2Row + 1, 11, "047857");
  applyDataRows(ws, s2Row + 2, ordsFiscales.length, 11, ["center", "center", "left", "center", "center", "left", "right", "right", "right", "center", "center"], [null, null, null, null, null, null, '"RD$ "#,##0.00', '"RD$ "#,##0.00', '"RD$ "#,##0.00', null, null], [0, 8]);
  applyTotalRow(ws, s2Row + 2 + ordsFiscales.length, 11, [null, null, null, null, null, '#,##0', '"RD$ "#,##0.00', '"RD$ "#,##0.00', '"RD$ "#,##0.00', null, null]);

  applyFooterNote(ws, aoa.length);
  return ws;
}

// =========================================================================
// 7. HOJA: WHATSAPP
// =========================================================================
export function buildSheetWhatsApp(opts: ReporteSheetOptions) {
  const { stats, tenantName, periodoLabel, fechaEmision, data } = opts;
  const aoa: any[][] = [];

  aoa.push(["KLYNN CLOUD POS — MENSAJERÍA Y NOTIFICACIONES AUTOMÁTICAS POR WHATSAPP"]);
  aoa.push([`Empresa: ${tenantName}  |  Período: ${periodoLabel}  |  Emisión: ${fechaEmision}  |  Enviados Mes: ${stats.waSentMonth || 0}`]);
  aoa.push([]);

  // KPIs
  aoa.push(["MENSAJES ENVIADOS (MES)", "", "LÍMITE MENSUAL PLAN", "", "% CONSUMO DEL CUPO", "", "CANAL WHATSAPP", ""]);
  aoa.push([stats.waSentMonth || 0, "", stats.waLimit || 500, "", (stats.waPct || 0) / 100, "", "ACTIVO / OPERATIVO", ""]);
  aoa.push([
    "Notificaciones enviadas a clientes", "",
    "Cupo incluido en plan mensual", "",
    "Porcentaje de cuota mensual usada", "",
    "Conexión API en línea", ""
  ]);
  aoa.push([]);

  // Tabla
  const sRow = aoa.length + 1;
  aoa.push(["REGISTRO DE ÓRDENES Y AVISOS A CLIENTES", "", "", "", "", "", ""]);
  aoa.push(["Nº Orden", "Fecha Registro", "Cliente", "Teléfono WhatsApp", "Total Facturado (RD$)", "Estado Pedido", "Notificación Enviada"]);

  let sumTot = 0;
  data.ordenes.forEach((o: any) => {
    const tot = Number(o.total) || 0;
    sumTot += tot;
    aoa.push([
      o.numero || "—",
      (o.creado_en || "").substring(0, 10),
      o.cliente_nombre || "—",
      o.cliente_telefono || "—",
      tot,
      o.estado || "RECIBIDA",
      o.cliente_telefono ? "ENVIADA / AUTOMÁTICA" : "SIN TELÉFONO"
    ]);
  });

  aoa.push(["TOTAL ÓRDENES PROCESADAS", "", data.ordenes.length, "", sumTot, "", ""]);
  aoa.push([]);
  aoa.push(["* Bitácora de avisos y notificaciones WhatsApp automáticas. Generado por Klynn Cloud POS."]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },
    { s: { r: 3, c: 2 }, e: { r: 3, c: 3 } },
    { s: { r: 4, c: 2 }, e: { r: 4, c: 3 } },
    { s: { r: 5, c: 2 }, e: { r: 5, c: 3 } },
    { s: { r: 3, c: 4 }, e: { r: 3, c: 5 } },
    { s: { r: 4, c: 4 }, e: { r: 4, c: 5 } },
    { s: { r: 5, c: 4 }, e: { r: 5, c: 5 } },
    { s: { r: 3, c: 6 }, e: { r: 3, c: 7 } },
    { s: { r: 4, c: 6 }, e: { r: 4, c: 7 } },
    { s: { r: 5, c: 6 }, e: { r: 5, c: 7 } },
    { s: { r: sRow - 1, c: 0 }, e: { r: sRow - 1, c: 6 } },
    { s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: 6 } },
  ];

  ws["!cols"] = [{ wch: 16 }, { wch: 18 }, { wch: 30 }, { wch: 20 }, { wch: 22 }, { wch: 18 }, { wch: 24 }];

  applyHeaderStyles(ws, 7);
  applyKpiCards(ws, [
    { cols: ["A", "B"], hBg: "047857", bBg: "ECFDF5", text: "047857", format: '#,##0' },
    { cols: ["C", "D"], hBg: "1E40AF", bBg: "EFF6FF", text: "1E3A8A", format: '#,##0' },
    { cols: ["E", "F"], hBg: "B45309", bBg: "FEF3C7", text: "B45309", format: "0.0%" },
    { cols: ["G", "H"], hBg: "0F766E", bBg: "F0FDFA", text: "0F766E" },
  ]);

  applySectionTitle(ws, sRow, "047857");
  applyTableHeaders(ws, sRow + 1, 7, "1B4B73");
  applyDataRows(ws, sRow + 2, data.ordenes.length, 7, ["center", "center", "left", "center", "right", "center", "center"], [null, null, null, null, '"RD$ "#,##0.00', null, null], [0, 4]);
  applyTotalRow(ws, sRow + 2 + data.ordenes.length, 7, [null, null, '#,##0', null, '"RD$ "#,##0.00', null, null]);

  applyFooterNote(ws, aoa.length);
  return ws;
}

// =========================================================================
// 8. HOJA: FLUJO DE PROCESOS
// =========================================================================
export function buildSheetProcesos(opts: ReporteSheetOptions) {
  const { stats, tenantName, periodoLabel, fechaEmision, data } = opts;
  const aoa: any[][] = [];

  aoa.push(["KLYNN CLOUD POS — FLUJO DE PROCESOS Y CONTROL DE ETAPAS"]);
  aoa.push([`Empresa: ${tenantName}  |  Período: ${periodoLabel}  |  Emisión: ${fechaEmision}  |  Total Órdenes: ${data.ordenes.length}`]);
  aoa.push([]);

  // KPIs
  aoa.push(["RECIBIDAS (REGISTRO)", "", "EN PROCESO (LAVADO)", "", "LISTAS (DESPACHO)", "", "ENTREGADAS (FINAL)", ""]);
  aoa.push([
    stats.porEstado?.["RECIBIDA"] || 0, "",
    stats.porEstado?.["EN_PROCESO"] || 0, "",
    stats.porEstado?.["LISTA"] || 0, "",
    stats.porEstado?.["ENTREGADA"] || 0, ""
  ]);
  aoa.push([
    "Ingresadas a taller", "",
    "En lavado, secado o planchado", "",
    "Listas para entrega o ruta", "",
    "Completadas satisfactoriamente", ""
  ]);
  aoa.push([]);

  // Sección 1: Pipeline
  const s1Row = aoa.length + 1;
  aoa.push(["DESGLOSE POR ETAPAS DEL PIPELINE OPERATIVO", "", "", ""]);
  aoa.push(["Etapa Operativa", "Cantidad de Órdenes", "% del Total", "Facturación en Etapa (RD$)"]);

  const totOrds = data.ordenes.length || 1;
  const stages = [
    { key: "RECIBIDA", label: "Recibida / Registro Inicial" },
    { key: "EN_PROCESO", label: "En Taller / Lavado y Planchado" },
    { key: "LISTA", label: "Lista para Entrega / Despacho" },
    { key: "EN_CAMINO", label: "En Camino (Repartidor en Ruta)" },
    { key: "ENTREGADA", label: "Entregada al Cliente" },
    { key: "ANULADA", label: "Anulada / Cancelada" },
  ];

  let sumStageCount = 0;
  let sumStageTot = 0;

  stages.forEach(st => {
    const count = stats.porEstado?.[st.key] || 0;
    const tot = stats.porEstadoMonto?.[st.key] || 0;
    const pct = count / totOrds;
    sumStageCount += count;
    sumStageTot += tot;
    aoa.push([st.label, count, pct, tot]);
  });

  aoa.push(["TOTAL ÓRDENES EN PIPELINE", sumStageCount, 1.0, sumStageTot]);
  aoa.push([]);

  // Sección 2: Órdenes activas en taller
  const s2Row = aoa.length + 1;
  aoa.push(["ÓRDENES ACTIVAS EN TALLER Y PROCESO", "", "", "", "", "", ""]);
  aoa.push(["Nº Orden", "Fecha Recepción", "Cliente", "Teléfono", "Prendas / Cantidad", "Total (RD$)", "Estado Actual"]);

  const activeOrds = data.ordenes.filter((o: any) => ["RECIBIDA", "EN_PROCESO", "LISTA"].includes(o.estado));
  let sumActTot = 0;

  activeOrds.forEach((o: any) => {
    const tot = Number(o.total) || 0;
    sumActTot += tot;
    const pCount = Array.isArray(o.items) ? o.items.reduce((s: number, it: any) => s + (Number(it.cantidad) || 1), 0) : 1;

    aoa.push([
      o.numero || "—",
      (o.creado_en || "").substring(0, 10),
      o.cliente_nombre || "—",
      o.cliente_telefono || "—",
      pCount,
      tot,
      o.estado || "RECIBIDA"
    ]);
  });

  aoa.push(["TOTAL ÓRDENES ACTIVAS EN TALLER", "", "", activeOrds.length, "", sumActTot, ""]);
  aoa.push([]);
  aoa.push(["* Flujo operativo y etapas del proceso de lavado. Generado por Klynn Cloud POS."]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },
    { s: { r: 3, c: 2 }, e: { r: 3, c: 3 } },
    { s: { r: 4, c: 2 }, e: { r: 4, c: 3 } },
    { s: { r: 5, c: 2 }, e: { r: 5, c: 3 } },
    { s: { r: 3, c: 4 }, e: { r: 3, c: 5 } },
    { s: { r: 4, c: 4 }, e: { r: 4, c: 5 } },
    { s: { r: 5, c: 4 }, e: { r: 5, c: 5 } },
    { s: { r: 3, c: 6 }, e: { r: 3, c: 7 } },
    { s: { r: 4, c: 6 }, e: { r: 4, c: 7 } },
    { s: { r: 5, c: 6 }, e: { r: 5, c: 7 } },
    { s: { r: s1Row - 1, c: 0 }, e: { r: s1Row - 1, c: 3 } },
    { s: { r: s2Row - 1, c: 0 }, e: { r: s2Row - 1, c: 6 } },
    { s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: 6 } },
  ];

  ws["!cols"] = [{ wch: 28 }, { wch: 20 }, { wch: 24 }, { wch: 24 }, { wch: 18 }, { wch: 22 }, { wch: 20 }];

  applyHeaderStyles(ws, 7);
  applyKpiCards(ws, [
    { cols: ["A", "B"], hBg: "1E40AF", bBg: "EFF6FF", text: "1E3A8A", format: '#,##0' },
    { cols: ["C", "D"], hBg: "B45309", bBg: "FEF3C7", text: "B45309", format: '#,##0' },
    { cols: ["E", "F"], hBg: "0F766E", bBg: "F0FDFA", text: "0F766E", format: '#,##0' },
    { cols: ["G", "H"], hBg: "047857", bBg: "ECFDF5", text: "047857", format: '#,##0' },
  ]);

  applySectionTitle(ws, s1Row, "1B4B73");
  applyTableHeaders(ws, s1Row + 1, 4, "1E40AF");
  applyDataRows(ws, s1Row + 2, stages.length, 4, ["left", "center", "center", "right"], [null, '#,##0', "0.0%", '"RD$ "#,##0.00'], [0, 3]);
  applyTotalRow(ws, s1Row + 2 + stages.length, 4, [null, '#,##0', "0.0%", '"RD$ "#,##0.00']);

  applySectionTitle(ws, s2Row, "0F766E");
  applyTableHeaders(ws, s2Row + 1, 7, "047857");
  applyDataRows(ws, s2Row + 2, activeOrds.length, 7, ["center", "center", "left", "center", "center", "right", "center"], [null, null, null, null, '#,##0', '"RD$ "#,##0.00', null], [0, 5]);
  applyTotalRow(ws, s2Row + 2 + activeOrds.length, 7, [null, null, null, '#,##0', null, '"RD$ "#,##0.00', null]);

  applyFooterNote(ws, aoa.length);
  return ws;
}

// =========================================================================
// 9. HOJA: ESTANTERÍA VIRTUAL
// =========================================================================
export function buildSheetEstanteria(opts: ReporteSheetOptions) {
  const { stats, tenantName, periodoLabel, fechaEmision } = opts;
  const aoa: any[][] = [];

  aoa.push(["KLYNN CLOUD POS — ESTANTERÍA VIRTUAL, RIELES Y CASILLEROS"]);
  aoa.push([`Empresa: ${tenantName}  |  Período: ${periodoLabel}  |  Emisión: ${fechaEmision}  |  Capacidad: ${stats.totalCapacidadEstanteria || 0} slots`]);
  aoa.push([]);

  // KPIs
  aoa.push(["CAPACIDAD DE SLOTS", "", "SLOTS OCUPADOS", "", "SLOTS DISPONIBLES", "", "TASA DE OCUPACIÓN", ""]);
  aoa.push([
    stats.totalCapacidadEstanteria || 0, "",
    stats.ordenesEnEstanteria || 0, "",
    stats.slotsDisponiblesTotal || 0, "",
    (stats.pctOcupacionEstanteria || 0) / 100, ""
  ]);
  aoa.push([
    "Total casilleros y rieles físicos", "",
    "Órdenes almacenadas en espera", "",
    "Espacios libres disponibles", "",
    "Porcentaje de ocupación actual", ""
  ]);
  aoa.push([]);

  // Sección 1: Zonas
  const s1Row = aoa.length + 1;
  aoa.push(["RESUMEN POR ZONAS DE ALMACENAMIENTO", "", "", "", "", ""]);
  aoa.push(["Zona / Riel", "Tipo de Almacén", "Capacidad Total", "Slots Ocupados", "Slots Libres", "Tasa Ocupación %"]);

  const zonas = stats.estanteriaZonasDetalle || [];
  let sumCap = 0;
  let sumOcu = 0;
  let sumLib = 0;

  zonas.forEach((z: any) => {
    sumCap += z.capacidad || 0;
    sumOcu += z.ocupados || 0;
    sumLib += z.libres || 0;
    aoa.push([
      z.nombre,
      (z.tipo || "riel").toUpperCase(),
      z.capacidad,
      z.ocupados,
      z.libres,
      (z.tasaOcupacion || 0) / 100
    ]);
  });

  const totOcuPct = sumCap > 0 ? sumOcu / sumCap : 0;
  aoa.push(["TOTAL ZONAS DE ESTANTERÍA", "", sumCap, sumOcu, sumLib, totOcuPct]);
  aoa.push([]);

  // Sección 2: Inventario de Órdenes Ubicadas
  const s2Row = aoa.length + 1;
  aoa.push(["INVENTARIO DE ÓRDENES UBICADAS EN ESTANTERÍA", "", "", "", "", "", ""]);
  aoa.push(["Nº Orden", "Ubicación (Riel / Slot)", "Cliente", "Teléfono", "Prendas", "Total Facturado (RD$)", "Estado"]);

  const ordsUbicadas = stats.ordenesUbicadasDetalle || [];
  let sumTotUbic = 0;

  ordsUbicadas.forEach((o: any) => {
    const tot = Number(o.total) || 0;
    sumTotUbic += tot;
    const pCount = Array.isArray(o.items) ? o.items.reduce((s: number, it: any) => s + (Number(it.cantidad) || 1), 0) : 1;

    aoa.push([
      o.numero || "—",
      o.ubicacion_ropa || "—",
      o.cliente_nombre || "—",
      o.cliente_telefono || "—",
      pCount,
      tot,
      o.estado || "LISTA"
    ]);
  });

  aoa.push(["TOTAL ÓRDENES EN ESTANTERÍA", "", "", ordsUbicadas.length, "", sumTotUbic, ""]);
  aoa.push([]);
  aoa.push(["* Inventario de prendas y casilleros. Generado por Klynn Cloud POS."]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },
    { s: { r: 3, c: 2 }, e: { r: 3, c: 3 } },
    { s: { r: 4, c: 2 }, e: { r: 4, c: 3 } },
    { s: { r: 5, c: 2 }, e: { r: 5, c: 3 } },
    { s: { r: 3, c: 4 }, e: { r: 3, c: 5 } },
    { s: { r: 4, c: 4 }, e: { r: 4, c: 5 } },
    { s: { r: 5, c: 4 }, e: { r: 5, c: 5 } },
    { s: { r: 3, c: 6 }, e: { r: 3, c: 7 } },
    { s: { r: 4, c: 6 }, e: { r: 4, c: 7 } },
    { s: { r: 5, c: 6 }, e: { r: 5, c: 7 } },
    { s: { r: s1Row - 1, c: 0 }, e: { r: s1Row - 1, c: 5 } },
    { s: { r: s2Row - 1, c: 0 }, e: { r: s2Row - 1, c: 6 } },
    { s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: 6 } },
  ];

  ws["!cols"] = [{ wch: 28 }, { wch: 22 }, { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 18 }];

  applyHeaderStyles(ws, 7);
  applyKpiCards(ws, [
    { cols: ["A", "B"], hBg: "1E40AF", bBg: "EFF6FF", text: "1E3A8A", format: '#,##0' },
    { cols: ["C", "D"], hBg: "B45309", bBg: "FEF3C7", text: "B45309", format: '#,##0' },
    { cols: ["E", "F"], hBg: "047857", bBg: "ECFDF5", text: "047857", format: '#,##0' },
    { cols: ["G", "H"], hBg: "4338CA", bBg: "EEF2FF", text: "4338CA", format: "0.0%" },
  ]);

  applySectionTitle(ws, s1Row, "4338CA");
  applyTableHeaders(ws, s1Row + 1, 6, "1B4B73");
  applyDataRows(ws, s1Row + 2, zonas.length, 6, ["left", "center", "center", "center", "center", "center"], [null, null, '#,##0', '#,##0', '#,##0', "0.0%"], [0]);
  applyTotalRow(ws, s1Row + 2 + zonas.length, 6, [null, null, '#,##0', '#,##0', '#,##0', "0.0%"]);

  applySectionTitle(ws, s2Row, "1B4B73");
  applyTableHeaders(ws, s2Row + 1, 7, "047857");
  applyDataRows(ws, s2Row + 2, ordsUbicadas.length, 7, ["center", "center", "left", "center", "center", "right", "center"], [null, null, null, null, '#,##0', '"RD$ "#,##0.00', null], [0, 5]);
  applyTotalRow(ws, s2Row + 2 + ordsUbicadas.length, 7, [null, null, null, '#,##0', null, '"RD$ "#,##0.00', null]);

  applyFooterNote(ws, aoa.length);
  return ws;
}

// =========================================================================
// 10. HOJA: AUDITORÍA & CAJA
// =========================================================================
export function buildSheetAuditoria(opts: ReporteSheetOptions) {
  const { stats, tenantName, periodoLabel, fechaEmision, data } = opts;
  const aoa: any[][] = [];

  aoa.push(["KLYNN CLOUD POS — AUDITORÍA DE CAJA Y CONTROL DE TURNOS"]);
  aoa.push([`Empresa: ${tenantName}  |  Período: ${periodoLabel}  |  Emisión: ${fechaEmision}  |  Turnos: ${stats.totalCierres || 0}  |  Efectivo Auditado: RD$ ${(stats.totalEfectivoAuditado || 0).toLocaleString("es-DO")}`]);
  aoa.push([]);

  // KPIs
  aoa.push(["TURNOS AUDITADOS", "", "CUADRES PERFECTOS", "", "CON DESCUADRE", "", "TASA DE CUADRE %", ""]);
  const descuadres = (stats.cierresSobrantes || 0) + (stats.cierresFaltantes || 0);
  aoa.push([
    stats.totalCierres || 0, "",
    stats.cierresCuadrados || 0, "",
    descuadres, "",
    (stats.tasaCuadrePerfecto || 0) / 100, ""
  ]);
  aoa.push([
    "Total aperturas y cierres", "",
    "Turnos sin diferencia (RD$ 0.00)", "",
    "Turnos con sobrante o faltante", "",
    "Efectividad de cuadre de caja", ""
  ]);
  aoa.push([]);

  // Sección 1: Turnos
  const s1Row = aoa.length + 1;
  aoa.push(["HISTORIAL DETALLADO DE CIERRES DE TURNO DE CAJA", "", "", "", "", "", "", "", "", "", ""]);
  aoa.push([
    "ID Turno",
    "Fecha Apertura",
    "Fecha Cierre",
    "Cajero / Operador",
    "Rol",
    "Turno",
    "Fondo Inicial (RD$)",
    "Efectivo Contado (RD$)",
    "Efectivo Esperado (RD$)",
    "Diferencia (RD$)",
    "Estado Cuadre"
  ]);

  const cierres = stats.cierresCaja || [];
  let sumIni = 0;
  let sumCon = 0;
  let sumEsp = 0;
  let sumDif = 0;

  cierres.forEach((c: any) => {
    const ini = Number(c.monto_inicial) || 0;
    const con = Number(c.monto_contado_efectivo) || 0;
    const esp = Number(c.monto_esperado_efectivo) || 0;
    const dif = Number(c.diferencia) || 0;

    sumIni += ini;
    sumCon += con;
    sumEsp += esp;
    sumDif += dif;

    aoa.push([
      c.id ? c.id.substring(0, 8) : "—",
      c.abierta_en ? c.abierta_en.replace("T", " ").substring(0, 16) : "—",
      c.cerrada_en ? c.cerrada_en.replace("T", " ").substring(0, 16) : "—",
      c.cajeroNombre || "Cajero Principal",
      c.cajeroRol || "Cajero",
      c.turnoLabel || "Turno General",
      ini,
      con,
      esp,
      dif,
      dif === 0 ? "CUADRADO" : dif > 0 ? "SOBRANTE" : "FALTANTE"
    ]);
  });

  aoa.push(["TOTAL AUDITORÍA DE CAJA", "", "", "", "", cierres.length, sumIni, sumCon, sumEsp, sumDif, ""]);
  aoa.push([]);

  // Sección 2: Movimientos
  const s2Row = aoa.length + 1;
  aoa.push(["BITÁCORA DE MOVIMIENTOS Y OPERACIONES REGISTRADAS", "", "", "", ""]);
  aoa.push(["Fecha y Hora", "Tipo de Movimiento", "Concepto / Detalle", "Monto (RD$)", "Ámbito"]);

  const movs = data.movimientos || [];
  let sumMov = 0;

  movs.slice(0, 150).forEach((m: any) => {
    const val = Number(m.monto) || 0;
    sumMov += val;
    aoa.push([
      m.creado_en ? m.creado_en.replace("T", " ").substring(0, 16) : "—",
      (m.tipo || "MOVIMIENTO").replace(/_/g, " "),
      m.concepto || "Operación de caja",
      val,
      ["GASTO_CAJA_CHICA", "EGRESO"].includes(m.tipo) ? "EGRESO" : "INGRESO"
    ]);
  });

  aoa.push(["TOTAL MOVIMIENTOS REGISTRADOS", "", movs.length, sumMov, ""]);
  aoa.push([]);
  aoa.push(["* Registro oficial de auditoría y arqueo de caja. Generado por Klynn Cloud POS."]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },
    { s: { r: 3, c: 2 }, e: { r: 3, c: 3 } },
    { s: { r: 4, c: 2 }, e: { r: 4, c: 3 } },
    { s: { r: 5, c: 2 }, e: { r: 5, c: 3 } },
    { s: { r: 3, c: 4 }, e: { r: 3, c: 5 } },
    { s: { r: 4, c: 4 }, e: { r: 4, c: 5 } },
    { s: { r: 5, c: 4 }, e: { r: 5, c: 5 } },
    { s: { r: 3, c: 6 }, e: { r: 3, c: 7 } },
    { s: { r: 4, c: 6 }, e: { r: 4, c: 7 } },
    { s: { r: 5, c: 6 }, e: { r: 5, c: 7 } },
    { s: { r: s1Row - 1, c: 0 }, e: { r: s1Row - 1, c: 10 } },
    { s: { r: s2Row - 1, c: 0 }, e: { r: s2Row - 1, c: 4 } },
    { s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: 10 } },
  ];

  ws["!cols"] = [
    { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 24 },
    { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 22 },
    { wch: 22 }, { wch: 18 }, { wch: 18 }
  ];

  applyHeaderStyles(ws, 11);
  applyKpiCards(ws, [
    { cols: ["A", "B"], hBg: "1E40AF", bBg: "EFF6FF", text: "1E3A8A", format: '#,##0' },
    { cols: ["C", "D"], hBg: "047857", bBg: "ECFDF5", text: "047857", format: '#,##0' },
    { cols: ["E", "F"], hBg: "B91C1C", bBg: "FEF2F2", text: "B91C1C", format: '#,##0' },
    { cols: ["G", "H"], hBg: "4338CA", bBg: "EEF2FF", text: "4338CA", format: "0.0%" },
  ]);

  applySectionTitle(ws, s1Row, "1B4B73");
  applyTableHeaders(ws, s1Row + 1, 11, "1B4B73");
  applyDataRows(ws, s1Row + 2, cierres.length, 11, ["center", "center", "center", "left", "center", "center", "right", "right", "right", "right", "center"], [null, null, null, null, null, null, '"RD$ "#,##0.00', '"RD$ "#,##0.00', '"RD$ "#,##0.00', '"RD$ "#,##0.00', null], [0, 9]);
  applyTotalRow(ws, s1Row + 2 + cierres.length, 11, [null, null, null, null, null, '#,##0', '"RD$ "#,##0.00', '"RD$ "#,##0.00', '"RD$ "#,##0.00', '"RD$ "#,##0.00', null]);

  applySectionTitle(ws, s2Row, "047857");
  applyTableHeaders(ws, s2Row + 1, 5, "047857");
  applyDataRows(ws, s2Row + 2, Math.min(movs.length, 150), 5, ["center", "center", "left", "right", "center"], [null, null, null, '"RD$ "#,##0.00', null], [0, 3]);
  applyTotalRow(ws, s2Row + 2 + Math.min(movs.length, 150), 5, [null, null, '#,##0', '"RD$ "#,##0.00', null]);

  applyFooterNote(ws, aoa.length);
  return ws;
}

// =========================================================================
// MAPA DE BUILDERS POR TAB
// =========================================================================
export const TAB_BUILDERS_MAP: Record<string, {
  name: string;
  sheetName: string;
  build: (opts: ReporteSheetOptions) => any;
}> = {
  finanzas: {
    name: "Finanzas & Caja",
    sheetName: "Finanzas y Caja",
    build: buildSheetFinanzas,
  },
  deudas: {
    name: "Cuentas por Cobrar (CXC)",
    sheetName: "Cuentas por Cobrar CXC",
    build: buildSheetCXC,
  },
  prendas: {
    name: "Prendas & Servicios",
    sheetName: "Prendas y Servicios",
    build: buildSheetPrendas,
  },
  equipo: {
    name: "Equipo de Trabajo",
    sheetName: "Equipo de Trabajo",
    build: buildSheetEquipo,
  },
  logistica: {
    name: "Logística & Delivery",
    sheetName: "Logística y Delivery",
    build: buildSheetLogistica,
  },
  fiscal: {
    name: "Facturación Fiscal e-CF",
    sheetName: "Facturación Fiscal DGII",
    build: buildSheetFiscal,
  },
  whatsapp: {
    name: "WhatsApp",
    sheetName: "Notificaciones WhatsApp",
    build: buildSheetWhatsApp,
  },
  procesos: {
    name: "Flujo de Procesos",
    sheetName: "Flujo de Procesos",
    build: buildSheetProcesos,
  },
  estanteria: {
    name: "Estantería Virtual",
    sheetName: "Estantería Virtual",
    build: buildSheetEstanteria,
  },
  auditoria: {
    name: "Auditoría & Caja",
    sheetName: "Auditoría de Caja",
    build: buildSheetAuditoria,
  },
};

// =========================================================================
// FUNCIONES PRINCIPALES DE EXPORTACIÓN
// =========================================================================

/**
 * 1. Exporta la pestaña activa como un archivo Excel individual estilizado
 */
export function exportReportePestanaToExcel(options: {
  tabKey: string;
  stats: any;
  data: ReporteExportData;
  tenantName: string;
  periodoLabel: string;
  isAllHistory?: boolean;
  rnc?: string;
}) {
  const { tabKey, stats, data, tenantName, periodoLabel, isAllHistory, rnc } = options;
  const builderMeta = TAB_BUILDERS_MAP[tabKey] || TAB_BUILDERS_MAP.finanzas;

  const fechaEmision = new Date().toLocaleString("es-DO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const wb = XLSX.utils.book_new();
  const ws = builderMeta.build({
    stats,
    data,
    tenantName,
    periodoLabel: isAllHistory ? "Todo el histórico" : periodoLabel,
    fechaEmision,
    rnc,
  });

  XLSX.utils.book_append_sheet(wb, ws, builderMeta.sheetName);

  const safeTenant = tenantName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeTab = builderMeta.name.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safePeriodo = (isAllHistory ? "Historico_Completo" : periodoLabel).replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `Reporte_${safeTab}_${safeTenant}_${safePeriodo}.xlsx`;

  XLSX.writeFile(wb, filename);
}

/**
 * 2. Exporta el Libro Maestro Multi-Pestaña (todas las secciones en hojas separadas)
 */
export function exportReporteMasterMultiPestanaToExcel(options: {
  activeModules?: {
    whatsapp?: boolean;
    facturacion_fiscal?: boolean;
    logistica?: boolean;
    procesos?: boolean;
    estanteria?: boolean;
  };
  stats: any;
  data: ReporteExportData;
  tenantName: string;
  periodoLabel: string;
  isAllHistory?: boolean;
  rnc?: string;
}) {
  const { activeModules = {}, stats, data, tenantName, periodoLabel, isAllHistory, rnc } = options;

  const fechaEmision = new Date().toLocaleString("es-DO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const wb = XLSX.utils.book_new();

  // Lista ordenada de pestañas a exportar
  const tabKeys = [
    "finanzas",
    "deudas",
    "prendas",
    "equipo",
    ...(activeModules.logistica ? ["logistica"] : []),
    ...(activeModules.facturacion_fiscal ? ["fiscal"] : []),
    ...(activeModules.whatsapp ? ["whatsapp"] : []),
    ...(activeModules.procesos ? ["procesos"] : []),
    ...(activeModules.estanteria ? ["estanteria"] : []),
    "auditoria",
  ];

  tabKeys.forEach((key) => {
    const meta = TAB_BUILDERS_MAP[key];
    if (!meta) return;

    const ws = meta.build({
      stats,
      data,
      tenantName,
      periodoLabel: isAllHistory ? "Todo el histórico" : periodoLabel,
      fechaEmision,
      rnc,
    });

    XLSX.utils.book_append_sheet(wb, ws, meta.sheetName);
  });

  const safeTenant = tenantName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safePeriodo = (isAllHistory ? "Historico_Total" : periodoLabel).replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `Reporte_General_Completo_${safeTenant}_${safePeriodo}.xlsx`;

  XLSX.writeFile(wb, filename);
}

/**
 * 3. Descarga cada pestaña como un libro de Excel (.xlsx) independiente
 */
export async function exportReporteLibrosSeparadosToExcel(options: {
  activeModules?: {
    whatsapp?: boolean;
    facturacion_fiscal?: boolean;
    logistica?: boolean;
    procesos?: boolean;
    estanteria?: boolean;
  };
  stats: any;
  data: ReporteExportData;
  tenantName: string;
  periodoLabel: string;
  isAllHistory?: boolean;
  rnc?: string;
}) {
  const { activeModules = {}, stats, data, tenantName, periodoLabel, isAllHistory, rnc } = options;

  const tabKeys = [
    "finanzas",
    "deudas",
    "prendas",
    "equipo",
    ...(activeModules.logistica ? ["logistica"] : []),
    ...(activeModules.facturacion_fiscal ? ["fiscal"] : []),
    ...(activeModules.whatsapp ? ["whatsapp"] : []),
    ...(activeModules.procesos ? ["procesos"] : []),
    ...(activeModules.estanteria ? ["estanteria"] : []),
    "auditoria",
  ];

  for (let i = 0; i < tabKeys.length; i++) {
    const key = tabKeys[i];
    exportReportePestanaToExcel({
      tabKey: key,
      stats,
      data,
      tenantName,
      periodoLabel,
      isAllHistory,
      rnc,
    });
    // Pequeño delay de 250ms para permitir descargas simultáneas en navegadores modernos
    if (i < tabKeys.length - 1) {
      await new Promise((res) => setTimeout(res, 250));
    }
  }
}
