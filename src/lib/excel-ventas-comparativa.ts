import XLSX from "xlsx-js-style";

export interface PeriodResultVentasExport {
  id: string; // "A" | "B" | "C" | "D"
  label: string;
  displayLabel: string;
  total: number;
  count: number;
  ticketPromedio: number;
  subtotal: number;
  itbis: number;
  descuento: number;
  saldo: number;
  pagado: number;
  piezas: number;
  libras: number;
  clientesUnicos: number;
  metodosMap: Record<string, { total: number; count: number }>;
}

export interface ExportComparativaVentasOptions {
  tenantName?: string;
  modeLabel: string; // "Día", "Semana", "Mes", "Año"
  periods: { id: string; label: string; displayLabel?: string }[];
  periodResults: PeriodResultVentasExport[];
  currencySymbol?: string;
  currencyCode?: string;
}

const THEME_COLORS: Record<string, { headerBg: string; headerLight: string; textColor: string }> = {
  A: { headerBg: "1B4B73", headerLight: "EFF6FF", textColor: "1B4B73" }, // Klynn Navy
  B: { headerBg: "4338CA", headerLight: "EEF2FF", textColor: "3730A3" }, // Indigo
  C: { headerBg: "047857", headerLight: "ECFDF5", textColor: "065F46" }, // Emerald
  D: { headerBg: "B45309", headerLight: "FEF3C7", textColor: "92400E" }, // Amber
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

interface ColumnMeta {
  header: string;
  kind: "name" | "value" | "diff" | "pct";
  pId: string;
}

/**
 * Genera y descarga un libro Excel (.xlsx) altamente profesional y corregido
 * con la Comparativa de Ventas de Klynn Cloud POS.
 */
export function exportVentasComparativaToExcel(options: ExportComparativaVentasOptions) {
  const {
    tenantName = "Klynn Lavandería",
    modeLabel = "Mes",
    periodResults = [],
    currencySymbol = "RD$",
    currencyCode = "DOP",
  } = options;

  const excelCurrencyFormat = `"${currencySymbol} "#,##0.00`;

  if (periodResults.length === 0) return;

  const wb = XLSX.utils.book_new();

  const fechaStr = new Date().toLocaleDateString("es-DO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const pA = periodResults[0];

  // 1. Estructura exacta de Columnas
  const columnsMeta: ColumnMeta[] = [
    { header: "Indicador / Variable Comercial", kind: "name", pId: "" },
    { header: `${pA.id}: ${pA.displayLabel}`, kind: "value", pId: pA.id },
  ];

  for (let i = 1; i < periodResults.length; i++) {
    const p = periodResults[i];
    columnsMeta.push(
      { header: `${p.id}: ${p.displayLabel}`, kind: "value", pId: p.id },
      { header: `Dif. ${currencySymbol} (${p.id} vs A)`, kind: "diff", pId: p.id },
      { header: `Var. % (${p.id} vs A)`, kind: "pct", pId: p.id }
    );
  }

  const tableHeaders = columnsMeta.map((c) => c.header);
  // Garantizar al menos 6 columnas para que las tarjetas KPI queden bien distribuidas
  const totalCols = Math.max(tableHeaders.length, 6);

  const periodsDesc = periodResults.map((p) => `${p.id}: ${p.displayLabel}`).join("  vs  ");

  const aoa: any[][] = [];

  // Fila 0: Título Principal
  aoa.push(["KLYNN CLOUD POS — COMPARATIVA COMERCIAL DE VENTAS Y FACTURACIÓN"]);

  // Fila 1: Subtítulo
  aoa.push([
    `Empresa: ${tenantName}  |  Modalidad: Por ${modeLabel}  |  Períodos: ${periodsDesc}  |  Generado: ${fechaStr}`,
  ]);

  // Fila 2: Separador
  aoa.push([]);

  // Filas 3-5: Tarjetas KPI Ejecutivas
  // Diseñadas para distribuirse en 3 bloques de 2 columnas cada uno (Cols A-B, C-D, E-F)
  const kpiRowTitles: string[] = [];
  const kpiRowValues: (string | number)[] = [];
  const kpiRowNotes: string[] = [];

  // Tarjeta 1: Período Base A (Cols 0-1)
  kpiRowTitles.push(`TOTAL FACTURADO (${pA.id})`, "");
  kpiRowValues.push(pA.total, "");
  kpiRowNotes.push(`${pA.count} órdenes · Ticket: ${currencySymbol} ${pA.ticketPromedio.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "");

  // Tarjeta 2: Período Comparativo (B o C según corresponda) (Cols 2-3)
  const pComp = periodResults.length > 1 ? periodResults[1] : null;
  if (pComp) {
    const diff = pComp.total - pA.total;
    const pct = pA.total > 0 ? (diff / pA.total) * 100 : 0;
    const pctStr = pct >= 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`;
    kpiRowTitles.push(`TOTAL FACTURADO (${pComp.id})`, "");
    kpiRowValues.push(pComp.total, "");
    kpiRowNotes.push(`${pComp.count} órdenes · Var vs A: ${pctStr} (${diff >= 0 ? "+" : ""}${currencySymbol} ${diff.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`, "");
  } else {
    kpiRowTitles.push("", "");
    kpiRowValues.push("", "");
    kpiRowNotes.push("", "");
  }

  // Tarjeta 3: Período Líder o Período 3 (Cols 4-5)
  if (periodResults.length > 2) {
    const p3 = periodResults[2];
    const diff3 = p3.total - pA.total;
    const pct3 = pA.total > 0 ? (diff3 / pA.total) * 100 : 0;
    const pctStr3 = pct3 >= 0 ? `+${pct3.toFixed(1)}%` : `${pct3.toFixed(1)}%`;
    kpiRowTitles.push(`TOTAL FACTURADO (${p3.id})`, "");
    kpiRowValues.push(p3.total, "");
    kpiRowNotes.push(`${p3.count} órdenes · Var vs A: ${pctStr3}`, "");
  } else {
    // Si solo hay 2 períodos, mostrar el Período Líder
    const leader = [...periodResults].sort((a, b) => b.total - a.total)[0];
    kpiRowTitles.push("PERÍODO LÍDER EN VENTAS", "");
    kpiRowValues.push(leader ? leader.total : 0, "");
    kpiRowNotes.push(leader ? `${leader.id}: ${leader.displayLabel}` : "-", "");
  }

  aoa.push(kpiRowTitles);
  aoa.push(kpiRowValues);
  aoa.push(kpiRowNotes);

  // Fila 6: Separador
  aoa.push([]);

  // Fila 7: Título Sección 1
  aoa.push(["1. MATRIZ COMPARATIVA DE RENDIMIENTO FINANCIERO Y OPERATIVO"]);

  // Fila 8: Cabecera Tabla 1
  aoa.push(tableHeaders);

  // Filas de Datos de Métricas
  interface MetricRowDef {
    name: string;
    getValue: (p: PeriodResultVentasExport) => number;
    isCurrency: boolean;
    isInteger?: boolean;
  }

  const metricDefs: MetricRowDef[] = [
    { name: "Total Facturado (Ventas Netas)", getValue: (p) => p.total, isCurrency: true },
    { name: "Base Imponible (Subtotal)", getValue: (p) => p.subtotal, isCurrency: true },
    { name: "ITBIS Facturado (18%)", getValue: (p) => p.itbis, isCurrency: true },
    { name: "Descuentos Aplicados", getValue: (p) => p.descuento, isCurrency: true },
    { name: "Total Pagado al Registrar", getValue: (p) => p.pagado, isCurrency: true },
    { name: "Saldo Pendiente por Cobrar (CxC)", getValue: (p) => p.saldo, isCurrency: true },
    { name: "Cantidad de Órdenes Registradas", getValue: (p) => p.count, isCurrency: false, isInteger: true },
    { name: "Ticket Promedio por Orden", getValue: (p) => p.ticketPromedio, isCurrency: true },
    { name: "Clientes Únicos Atendidos", getValue: (p) => p.clientesUnicos, isCurrency: false, isInteger: true },
    { name: "Prendas / Piezas Procesadas", getValue: (p) => p.piezas, isCurrency: false, isInteger: true },
    { name: "Libras de Ropa Procesadas", getValue: (p) => p.libras, isCurrency: false },
  ];

  const dataStartRowIdx = aoa.length;

  metricDefs.forEach((m) => {
    const row: any[] = [m.name];
    const valA = m.getValue(pA);
    row.push(valA);

    for (let i = 1; i < periodResults.length; i++) {
      const p = periodResults[i];
      const valP = m.getValue(p);
      const diff = valP - valA;
      const pct = valA !== 0 ? diff / Math.abs(valA) : valP !== 0 ? 1 : 0;

      row.push(valP);
      row.push(diff);
      row.push(pct);
    }

    aoa.push(row);
  });

  const dataEndRowIdx = aoa.length - 1;

  // Fila separadora
  aoa.push([]);

  // Sección 2: Desglose de Ventas por Formas de Pago
  aoa.push(["2. DISTRIBUCIÓN Y DESGLOSE POR FORMAS DE PAGO"]);

  const payColumnsMeta: { header: string; kind: "name" | "amount" | "share" }[] = [
    { header: "Método de Pago", kind: "name" },
  ];
  periodResults.forEach((p) => {
    payColumnsMeta.push(
      { header: `Monto ${currencySymbol} (${p.id})`, kind: "amount" },
      { header: `% Mix (${p.id})`, kind: "share" }
    );
  });

  aoa.push(payColumnsMeta.map((c) => c.header));

  const allMethodsSet = new Set<string>();
  periodResults.forEach((p) => {
    Object.keys(p.metodosMap || {}).forEach((m) => allMethodsSet.add(m));
  });
  const methodsList = Array.from(allMethodsSet);
  if (methodsList.length === 0) {
    methodsList.push("EFECTIVO", "TARJETA", "TRANSFERENCIA");
  }

  const payDataStartRowIdx = aoa.length;

  methodsList.forEach((method) => {
    const formatName = method.replace(/_/g, " ").toUpperCase();
    const row: any[] = [formatName];

    periodResults.forEach((p) => {
      const mData = p.metodosMap?.[method] || { total: 0, count: 0 };
      const share = p.total > 0 ? mData.total / p.total : 0;
      row.push(mData.total);
      row.push(share);
    });

    aoa.push(row);
  });

  const payDataEndRowIdx = aoa.length - 1;

  // Pie de nota
  aoa.push([]);
  aoa.push([
    `* Reporte generado oficialmente desde Klynn Cloud POS. Cifras expresadas en ${currencySymbol} (${currencyCode}).`,
  ]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Merges
  const merges: any[] = [
    // Fila 0: Título principal
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
    // Fila 1: Subtítulo
    { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
    // Tarjeta KPI 1 (Cols 0-1)
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },
    // Tarjeta KPI 2 (Cols 2-3)
    { s: { r: 3, c: 2 }, e: { r: 3, c: 3 } },
    { s: { r: 4, c: 2 }, e: { r: 4, c: 3 } },
    { s: { r: 5, c: 2 }, e: { r: 5, c: 3 } },
    // Tarjeta KPI 3 (Cols 4-5)
    { s: { r: 3, c: 4 }, e: { r: 3, c: 5 } },
    { s: { r: 4, c: 4 }, e: { r: 4, c: 5 } },
    { s: { r: 5, c: 4 }, e: { r: 5, c: 5 } },
    // Fila 7: Título Sección 1
    { s: { r: 7, c: 0 }, e: { r: 7, c: totalCols - 1 } },
  ];

  const sec2TitleRow = dataEndRowIdx + 2;
  merges.push({ s: { r: sec2TitleRow, c: 0 }, e: { r: sec2TitleRow, c: totalCols - 1 } });
  merges.push({ s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: totalCols - 1 } });

  ws["!merges"] = merges;

  // Anchos de columnas calculados para evitar truncamiento
  const colWidths: { wch: number }[] = [{ wch: 34 }]; // Columna indicador amplia
  for (let c = 1; c < totalCols; c++) {
    colWidths.push({ wch: 22 }); // Columnas holgadas de 22 caracteres
  }
  ws["!cols"] = colWidths;

  // ESTILOS DE CELDAS
  // 1. Título principal
  const titleCell = ws["A1"];
  if (titleCell) {
    titleCell.s = {
      font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1B4B73" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }

  // 2. Subtítulo con ajuste de texto para no recortar
  const subCell = ws["A2"];
  if (subCell) {
    subCell.s = {
      font: { name: "Calibri", sz: 9, italic: true, color: { rgb: "334155" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: { bottom: { style: "thin", color: { rgb: "CBD5E1" } } },
    };
  }

  // 3. Estilos de Tarjetas KPI
  const cardThemes = [
    THEME_COLORS.A,
    pComp ? THEME_COLORS[pComp.id] || THEME_COLORS.B : THEME_COLORS.B,
    periodResults.length > 2 ? THEME_COLORS[periodResults[2].id] || THEME_COLORS.C : THEME_COLORS.C,
  ];

  for (let cardIdx = 0; cardIdx < 3; cardIdx++) {
    const theme = cardThemes[cardIdx];
    const c1 = cardIdx * 2;
    const c2 = cardIdx * 2 + 1;
    const l1 = getColumnLetter(c1);
    const l2 = getColumnLetter(c2);

    [l1, l2].forEach((cL) => {
      const hCell = ws[`${cL}4`];
      if (hCell) {
        hCell.s = {
          font: { name: "Calibri", sz: 9, bold: true, color: { rgb: theme.textColor } },
          fill: { fgColor: { rgb: theme.headerLight } },
          alignment: { horizontal: "center", vertical: "center" },
          border: { top: { style: "thin", color: { rgb: "CBD5E1" } } },
        };
      }
      const vCell = ws[`${cL}5`];
      if (vCell) {
        vCell.s = {
          font: { name: "Calibri", sz: 13, bold: true, color: { rgb: "0F172A" } },
          fill: { fgColor: { rgb: theme.headerLight } },
          alignment: { horizontal: "center", vertical: "center" },
        };
        if (typeof vCell.v === "number") {
          vCell.z = excelCurrencyFormat;
        }
      }
      const nCell = ws[`${cL}6`];
      if (nCell) {
        nCell.s = {
          font: { name: "Calibri", sz: 8, italic: true, color: { rgb: "64748B" } },
          fill: { fgColor: { rgb: theme.headerLight } },
          alignment: { horizontal: "center", vertical: "center" },
          border: { bottom: { style: "medium", color: { rgb: theme.headerBg } } },
        };
      }
    });
  }

  // 4. Título Sección 1
  const s1Cell = ws[`A8`];
  if (s1Cell) {
    s1Cell.s = {
      font: { name: "Calibri", sz: 10.5, bold: true, color: { rgb: "1B4B73" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { horizontal: "left", vertical: "center" },
      border: {
        top: { style: "medium", color: { rgb: "1B4B73" } },
        bottom: { style: "thin", color: { rgb: "CBD5E1" } },
      },
    };
  }

  // 5. Cabecera Tabla Sección 1 (Fila 9)
  for (let c = 0; c < tableHeaders.length; c++) {
    const cell = ws[`${getColumnLetter(c)}9`];
    if (cell) {
      cell.s = {
        font: { name: "Calibri", sz: 9.5, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: c === 0 ? "0F172A" : "1B4B73" } },
        alignment: { horizontal: c === 0 ? "left" : "right", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "0F172A" } },
          bottom: { style: "medium", color: { rgb: "0F172A" } },
        },
      };
    }
  }

  // 6. Filas de datos Sección 1 (¡FORMATEO 100% DETERMINÍSTICO SEGÚN COLUMNA!)
  for (let r = dataStartRowIdx; r <= dataEndRowIdx; r++) {
    const isEven = (r - dataStartRowIdx) % 2 === 0;
    const rowBg = isEven ? "FFFFFF" : "F8FAFC";
    const metric = metricDefs[r - dataStartRowIdx];

    for (let c = 0; c < columnsMeta.length; c++) {
      const colMeta = columnsMeta[c];
      const cell = ws[`${getColumnLetter(c)}${r + 1}`];
      if (!cell) continue;

      const isFirstCol = c === 0;
      cell.s = {
        font: {
          name: "Calibri",
          sz: 9.5,
          bold: isFirstCol && (r === dataStartRowIdx || r === dataStartRowIdx + 1),
          color: { rgb: "1E293B" },
        },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: isFirstCol ? "left" : "right", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "E2E8F0" } },
          bottom: { style: "thin", color: { rgb: "E2E8F0" } },
        },
      };

      if (!isFirstCol) {
        if (colMeta.kind === "diff") {
          // DIFERENCIA EN MONEDA O UNIDADES
          if (metric.isCurrency) {
            cell.z = excelCurrencyFormat;
          } else if (metric.isInteger) {
            cell.z = '#,##0';
          } else {
            cell.z = '#,##0.00';
          }

          if (cell.v > 0) {
            cell.s.font.color = { rgb: "047857" };
            cell.s.font.bold = true;
          } else if (cell.v < 0) {
            cell.s.font.color = { rgb: "B91C1C" };
            cell.s.font.bold = true;
          }
        } else if (colMeta.kind === "pct") {
          // VARIACIÓN PORCENTUAL (+/- %)
          cell.z = "+0.0%;-0.0%;0.0%";
          if (cell.v > 0) {
            cell.s.font.color = { rgb: "047857" };
            cell.s.font.bold = true;
          } else if (cell.v < 0) {
            cell.s.font.color = { rgb: "B91C1C" };
            cell.s.font.bold = true;
          }
        } else {
          // VALOR NORMAL DEL PERÍODO
          if (metric.isCurrency) {
            cell.z = excelCurrencyFormat;
          } else if (metric.isInteger) {
            cell.z = '#,##0';
          } else {
            cell.z = '#,##0.00';
          }
        }
      }
    }
  }

  // 7. Título Sección 2
  const s2TitleCell = ws[`A${sec2TitleRow + 1}`];
  if (s2TitleCell) {
    s2TitleCell.s = {
      font: { name: "Calibri", sz: 10.5, bold: true, color: { rgb: "1B4B73" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { horizontal: "left", vertical: "center" },
      border: {
        top: { style: "medium", color: { rgb: "1B4B73" } },
        bottom: { style: "thin", color: { rgb: "CBD5E1" } },
      },
    };
  }

  // 8. Cabecera Tabla Sección 2 (Fila sec2TitleRow + 2)
  const payHeaderRowIdx = sec2TitleRow + 2;
  for (let c = 0; c < payColumnsMeta.length; c++) {
    const cell = ws[`${getColumnLetter(c)}${payHeaderRowIdx}`];
    if (cell) {
      cell.s = {
        font: { name: "Calibri", sz: 9.5, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: c === 0 ? "0F172A" : "334155" } },
        alignment: { horizontal: c === 0 ? "left" : "right", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "0F172A" } },
          bottom: { style: "medium", color: { rgb: "0F172A" } },
        },
      };
    }
  }

  // 9. Filas Sección 2 (Formas de Pago)
  for (let r = payDataStartRowIdx; r <= payDataEndRowIdx; r++) {
    const isEven = (r - payDataStartRowIdx) % 2 === 0;
    const rowBg = isEven ? "FFFFFF" : "F8FAFC";

    for (let c = 0; c < payColumnsMeta.length; c++) {
      const payMeta = payColumnsMeta[c];
      const cell = ws[`${getColumnLetter(c)}${r + 1}`];
      if (!cell) continue;

      const isFirstCol = c === 0;
      cell.s = {
        font: { name: "Calibri", sz: 9.5, color: { rgb: "1E293B" } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: isFirstCol ? "left" : "right", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "E2E8F0" } },
          bottom: { style: "thin", color: { rgb: "E2E8F0" } },
        },
      };

      if (!isFirstCol) {
        if (payMeta.kind === "share") {
          cell.z = "0.0%";
          cell.s.font.italic = true;
        } else {
          cell.z = excelCurrencyFormat;
        }
      }
    }
  }

  // 10. Pie de nota
  const noteCell = ws[`A${aoa.length}`];
  if (noteCell) {
    noteCell.s = {
      font: { name: "Calibri", sz: 8.5, italic: true, color: { rgb: "64748B" } },
      alignment: { horizontal: "left", vertical: "center" },
    };
  }

  XLSX.utils.book_append_sheet(wb, ws, "Comparativa Ventas");

  const safeTenant = tenantName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `Comparativa_Ventas_${modeLabel}_${safeTenant}.xlsx`;

  XLSX.writeFile(wb, filename);
}
