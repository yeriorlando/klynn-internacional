import XLSX from "xlsx-js-style";

export interface PeriodResultExport {
  id: string; // "A" | "B" | "C" | "D"
  label: string;
  displayLabel: string;
  total: number;
  count: number;
  catMap?: Record<string, { total: number; count: number }>;
}

export interface BreakdownItemExport {
  categoria: string;
  amounts: Record<string, number>;
  counts?: Record<string, number>;
  shares: Record<string, number>;
  amountA: number;
  amountB: number;
  diffAB: number;
  pctAB: number;
}

export interface ExportComparativaOptions {
  tenantName?: string;
  scopeFilter?: "all" | "manual" | "caja_chica";
  periods: { id: string; label: string; displayLabel?: string }[];
  periodResults: PeriodResultExport[];
  breakdown: BreakdownItemExport[];
  diffTotalAB?: number;
  pctTotalAB?: number;
  insights?: {
    topIncrease?: { categoria: string; diffAB: number; pctAB: number } | null;
    topSavings?: { categoria: string; diffAB: number; pctAB: number } | null;
  } | null;
  currencySymbol?: string;
  currencyCode?: string;
}

const THEME_COLORS: Record<string, { headerBg: string; headerLight: string; textColor: string }> = {
  A: { headerBg: "1E40AF", headerLight: "EFF6FF", textColor: "1E3A8A" }, // Blue
  B: { headerBg: "4338CA", headerLight: "EEF2FF", textColor: "3730A3" }, // Indigo
  C: { headerBg: "047857", headerLight: "ECFDF5", textColor: "065F46" }, // Emerald
  D: { headerBg: "B45309", headerLight: "FEF3C7", textColor: "92400E" }, // Amber
};

/**
 * Convierte un índice de columna 0-based en letra de Excel (0 -> A, 1 -> B, etc.)
 */
function getColumnLetter(colIndex: number): string {
  let letter = "";
  let temp = colIndex;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Genera y descarga un libro Excel (.xlsx) altamente estilizado y profesional
 * con la Comparativa Multi-Período de Gastos de Klynn Cloud POS.
 */
export function exportGastosComparativaToExcel(options: ExportComparativaOptions) {
  const {
    tenantName = "Klynn Lavandería",
    scopeFilter = "all",
    periods,
    periodResults,
    breakdown,
    diffTotalAB = 0,
    pctTotalAB = 0,
    currencySymbol = "RD$",
    currencyCode = "DOP",
  } = options;

  const excelCurrencyFormat = `"${currencySymbol} "#,##0.00`;
  const excelDiffCurrencyFormat = `"${currencySymbol} "#,##0.00;[Red]-"${currencySymbol} "#,##0.00;"${currencySymbol} 0.00"`;

  const wb = XLSX.utils.book_new();

  // Ámbito legible
  const scopeLabel =
    scopeFilter === "manual"
      ? "Gastos Operativos (Manuales)"
      : scopeFilter === "caja_chica"
      ? "Caja Chica"
      : "Todos los Egresos y Gastos";

  const fechaStr = new Date().toLocaleDateString("es-DO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const periodsDesc = periodResults.map((p) => `${p.id}: ${p.displayLabel}`).join("  vs  ");

  const isTwoPeriods = periodResults.length === 2;
  const pA = periodResults[0];
  const pB = periodResults[1];

  // Matriz de datos
  const aoa: any[][] = [];

  // Fila 0: Título Principal
  aoa.push(["KLYNN CLOUD POS — COMPARATIVA FINANCIERA DE GASTOS"]);

  // Fila 1: Metadatos del Reporte
  aoa.push([
    `Empresa: ${tenantName}  |  Emisión: ${fechaStr}  |  Ámbito: ${scopeLabel}  |  Períodos: ${periodsDesc}`,
  ]);

  // Fila 2: Espacio
  aoa.push([]);

  // Tarjetas KPI ejecutivas en filas 3-5
  if (isTwoPeriods && pA && pB) {
    const diffNetText =
      diffTotalAB < 0
        ? `Ahorro neto de ${Math.abs(pctTotalAB).toFixed(1)}% vs período B`
        : diffTotalAB > 0
        ? `Incremento de +${pctTotalAB.toFixed(1)}% vs período B`
        : "Sin variación de costo";

    aoa.push([
      "",
      `PERÍODO BASE (${pA.id}): ${pA.displayLabel}`,
      "",
      `PERÍODO COMPARATIVO (${pB.id}): ${pB.displayLabel}`,
      "",
      `VARIACIÓN NETA (${pA.id} vs ${pB.id})`,
      "",
      "",
    ]);

    aoa.push(["", pA.total, "", pB.total, "", diffTotalAB, "", ""]);

    aoa.push([
      "",
      `${pA.count} transacciones registradas`,
      "",
      `${pB.count} transacciones registradas`,
      "",
      diffNetText,
      "",
      "",
    ]);

    aoa.push([]); // Fila 6: Separador
  } else {
    // Si son 3 o 4 períodos, mostrar una fila compacta de resumen de cada período
    const cardHeaders = [""];
    const cardValues: any[] = [""];
    const cardNotes = [""];

    periodResults.forEach((p) => {
      cardHeaders.push(`PERÍODO ${p.id}: ${p.displayLabel}`, "");
      cardValues.push(p.total, "");
      cardNotes.push(`${p.count} transacciones`, "");
    });

    aoa.push(cardHeaders);
    aoa.push(cardValues);
    aoa.push(cardNotes);
    aoa.push([]);
  }

  // Fila de Encabezados de la Tabla Principal
  const tableHeaders: string[] = ["Categoría de Gasto"];
  periodResults.forEach((p) => {
    tableHeaders.push(`Monto ${p.id} (${p.displayLabel}) ${currencySymbol}`);
    tableHeaders.push(`% de ${p.id}`);
  });

  if (isTwoPeriods) {
    tableHeaders.push(`Diferencia (A - B) ${currencySymbol}`);
    tableHeaders.push("Variación %");
    tableHeaders.push("Diagnóstico Financiero");
  }

  const tableHeaderRowIndex = aoa.length;
  aoa.push(tableHeaders);

  // Filas de Datos de Categorías
  const dataStartRowIndex = aoa.length;
  breakdown.forEach((it) => {
    const row: any[] = [it.categoria];

    periodResults.forEach((p) => {
      const amt = it.amounts[p.id] || 0;
      const sh = (it.shares[p.id] || 0) / 100;
      row.push(amt);
      row.push(sh);
    });

    if (isTwoPeriods) {
      let diag = "– Sin cambio";
      if (it.amountB === 0 && it.amountA > 0) {
        diag = "★ Nuevo Gasto (+100%)";
      } else if (it.amountA === 0 && it.amountB > 0) {
        diag = "⚪ Sin Gasto en A (-100%)";
      } else if (it.diffAB < 0) {
        diag = `▼ Ahorro de costos (${it.pctAB.toFixed(1)}%)`;
      } else if (it.diffAB > 0) {
        diag = `▲ Incremento de costos (+${it.pctAB.toFixed(1)}%)`;
      }

      row.push(it.diffAB);
      row.push(it.pctAB / 100);
      row.push(diag);
    }

    aoa.push(row);
  });

  // Fila de Totales Consolidados
  const totalRowIndex = aoa.length;
  const totalRow: any[] = ["TOTAL CONSOLIDADO"];

  periodResults.forEach((p) => {
    totalRow.push(p.total);
    totalRow.push(1.0); // 100%
  });

  if (isTwoPeriods) {
    const totalDiag =
      diffTotalAB < 0
        ? `▼ Ahorro Global (-${Math.abs(pctTotalAB).toFixed(1)}%)`
        : diffTotalAB > 0
        ? `▲ Incremento Global (+${pctTotalAB.toFixed(1)}%)`
        : "– Sin Variación Global";

    totalRow.push(diffTotalAB);
    totalRow.push(pctTotalAB / 100);
    totalRow.push(totalDiag);
  }

  aoa.push(totalRow);

  // Fila de pie de notas
  aoa.push([]);
  aoa.push([
    `* Reporte generado por Klynn Cloud POS. Todas las cifras están expresadas en ${currencyCode} (${currencySymbol}).`,
  ]);

  const numCols = tableHeaders.length;

  // Crear Hoja
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Merges
  const merges: XLSX.Range[] = [
    // Título y Subtítulo
    { s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } },
  ];

  if (isTwoPeriods && pA && pB) {
    // Tarjeta A (B4:C4, B5:C5, B6:C6)
    merges.push({ s: { r: 3, c: 1 }, e: { r: 3, c: 2 } });
    merges.push({ s: { r: 4, c: 1 }, e: { r: 4, c: 2 } });
    merges.push({ s: { r: 5, c: 1 }, e: { r: 5, c: 2 } });

    // Tarjeta B (D4:E4, D5:E5, D6:E6)
    merges.push({ s: { r: 3, c: 3 }, e: { r: 3, c: 4 } });
    merges.push({ s: { r: 4, c: 3 }, e: { r: 4, c: 4 } });
    merges.push({ s: { r: 5, c: 3 }, e: { r: 5, c: 4 } });

    // Tarjeta Neta (F4:H4, F5:H5, F6:H6)
    merges.push({ s: { r: 3, c: 5 }, e: { r: 3, c: Math.min(7, numCols - 1) } });
    merges.push({ s: { r: 4, c: 5 }, e: { r: 4, c: Math.min(7, numCols - 1) } });
    merges.push({ s: { r: 5, c: 5 }, e: { r: 5, c: Math.min(7, numCols - 1) } });
  }

  // Nota de pie
  merges.push({
    s: { r: aoa.length - 1, c: 0 },
    e: { r: aoa.length - 1, c: numCols - 1 },
  });

  ws["!merges"] = merges;

  // Anchos de Columna
  const colsConfig: { wch: number }[] = [{ wch: 32 }]; // Categoría
  periodResults.forEach(() => {
    colsConfig.push({ wch: 22 }); // Monto
    colsConfig.push({ wch: 14 }); // %
  });

  if (isTwoPeriods) {
    colsConfig.push({ wch: 24 }); // Diferencia
    colsConfig.push({ wch: 16 }); // Variación %
    colsConfig.push({ wch: 30 }); // Diagnóstico
  }
  ws["!cols"] = colsConfig;

  // Alturas de Filas
  const rowsConfig: { hpt: number }[] = [
    { hpt: 34 }, // Título
    { hpt: 20 }, // Subtítulo
    { hpt: 10 }, // Espacio
  ];

  if (isTwoPeriods && pA && pB) {
    rowsConfig.push({ hpt: 22 }); // KPI Header
    rowsConfig.push({ hpt: 32 }); // KPI Valor
    rowsConfig.push({ hpt: 18 }); // KPI Subtítulo
    rowsConfig.push({ hpt: 12 }); // Espacio
  } else {
    rowsConfig.push({ hpt: 22 });
    rowsConfig.push({ hpt: 28 });
    rowsConfig.push({ hpt: 18 });
    rowsConfig.push({ hpt: 12 });
  }

  rowsConfig.push({ hpt: 26 }); // Encabezado de la tabla

  breakdown.forEach(() => {
    rowsConfig.push({ hpt: 21 }); // Filas de datos
  });

  rowsConfig.push({ hpt: 26 }); // Fila de totales
  rowsConfig.push({ hpt: 10 }); // Espacio
  rowsConfig.push({ hpt: 16 }); // Nota de pie

  ws["!rows"] = rowsConfig;

  // ESTILOS DE CELDA
  const borderThin = {
    top: { style: "thin", color: { rgb: "E2E8F0" } },
    bottom: { style: "thin", color: { rgb: "E2E8F0" } },
    left: { style: "thin", color: { rgb: "E2E8F0" } },
    right: { style: "thin", color: { rgb: "E2E8F0" } },
  };

  // 1. Título
  ws["A1"].s = {
    font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "1B4B73" } },
    alignment: { horizontal: "center", vertical: "center" },
  };

  // 2. Subtítulo
  ws["A2"].s = {
    font: { name: "Calibri", sz: 9.5, italic: true, color: { rgb: "334155" } },
    fill: { fgColor: { rgb: "F1F5F9" } },
    alignment: { horizontal: "center", vertical: "center" },
  };

  // 3. Estilos de Tarjetas KPI
  if (isTwoPeriods && pA && pB) {
    // Tarjeta A
    ["B4", "C4"].forEach((cell) => {
      ws[cell] = ws[cell] || { t: "s", v: "" };
      ws[cell].s = {
        font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1E40AF" } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    });
    ["B5", "C5"].forEach((cell) => {
      ws[cell] = ws[cell] || { t: "n", v: pA.total };
      ws[cell].z = excelCurrencyFormat;
      ws[cell].s = {
        font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "1E3A8A" } },
        fill: { fgColor: { rgb: "EFF6FF" } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    });
    ["B6", "C6"].forEach((cell) => {
      ws[cell] = ws[cell] || { t: "s", v: "" };
      ws[cell].s = {
        font: { name: "Calibri", sz: 9, color: { rgb: "475569" } },
        fill: { fgColor: { rgb: "EFF6FF" } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    });

    // Tarjeta B
    ["D4", "E4"].forEach((cell) => {
      ws[cell] = ws[cell] || { t: "s", v: "" };
      ws[cell].s = {
        font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4338CA" } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    });
    ["D5", "E5"].forEach((cell) => {
      ws[cell] = ws[cell] || { t: "n", v: pB.total };
      ws[cell].z = excelCurrencyFormat;
      ws[cell].s = {
        font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "3730A3" } },
        fill: { fgColor: { rgb: "EEF2FF" } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    });
    ["D6", "E6"].forEach((cell) => {
      ws[cell] = ws[cell] || { t: "s", v: "" };
      ws[cell].s = {
        font: { name: "Calibri", sz: 9, color: { rgb: "475569" } },
        fill: { fgColor: { rgb: "EEF2FF" } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    });

    // Tarjeta Neta
    const netHeaderBg = diffTotalAB < 0 ? "047857" : diffTotalAB > 0 ? "B91C1C" : "334155";
    const netBodyBg = diffTotalAB < 0 ? "ECFDF5" : diffTotalAB > 0 ? "FEF2F2" : "F8FAFC";
    const netTextColor = diffTotalAB < 0 ? "047857" : diffTotalAB > 0 ? "B91C1C" : "334155";

    ["F4", "G4", "H4"].forEach((cell) => {
      ws[cell] = ws[cell] || { t: "s", v: "" };
      ws[cell].s = {
        font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: netHeaderBg } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    });
    ["F5", "G5", "H5"].forEach((cell) => {
      ws[cell] = ws[cell] || { t: "n", v: diffTotalAB };
      ws[cell].z = excelDiffCurrencyFormat;
      ws[cell].s = {
        font: { name: "Calibri", sz: 14, bold: true, color: { rgb: netTextColor } },
        fill: { fgColor: { rgb: netBodyBg } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    });
    ["F6", "G6", "H6"].forEach((cell) => {
      ws[cell] = ws[cell] || { t: "s", v: "" };
      ws[cell].s = {
        font: { name: "Calibri", sz: 9, bold: true, color: { rgb: netTextColor } },
        fill: { fgColor: { rgb: netBodyBg } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    });
  }

  // 4. Encabezados de la Tabla Principal
  const tableHeaderRow1Idx = tableHeaderRowIndex + 1; // 1-based row
  // Columna A (Categoría)
  const cellAHeader = ws[`A${tableHeaderRow1Idx}`];
  if (cellAHeader) {
    cellAHeader.s = {
      font: { name: "Calibri", sz: 10.5, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1B4B73" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "334155" } },
        bottom: { style: "medium", color: { rgb: "0F172A" } },
        left: { style: "thin", color: { rgb: "334155" } },
        right: { style: "thin", color: { rgb: "334155" } },
      },
    };
  }

  let colCursor = 1;
  periodResults.forEach((p) => {
    const theme = THEME_COLORS[p.id] || THEME_COLORS.A;
    const colLetterAmount = getColumnLetter(colCursor);
    const colLetterShare = getColumnLetter(colCursor + 1);

    const cellAmt = ws[`${colLetterAmount}${tableHeaderRow1Idx}`];
    if (cellAmt) {
      cellAmt.s = {
        font: { name: "Calibri", sz: 10.5, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: theme.headerBg } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "thin", color: { rgb: "334155" } },
          bottom: { style: "medium", color: { rgb: "0F172A" } },
          left: { style: "thin", color: { rgb: "334155" } },
          right: { style: "thin", color: { rgb: "334155" } },
        },
      };
    }

    const cellSh = ws[`${colLetterShare}${tableHeaderRow1Idx}`];
    if (cellSh) {
      cellSh.s = {
        font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: theme.headerBg } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "thin", color: { rgb: "334155" } },
          bottom: { style: "medium", color: { rgb: "0F172A" } },
          left: { style: "thin", color: { rgb: "334155" } },
          right: { style: "thin", color: { rgb: "334155" } },
        },
      };
    }

    colCursor += 2;
  });

  if (isTwoPeriods) {
    ["Diferencia", "Variación", "Diagnóstico"].forEach((_, idx) => {
      const colLetter = getColumnLetter(colCursor + idx);
      const cell = ws[`${colLetter}${tableHeaderRow1Idx}`];
      if (cell) {
        cell.s = {
          font: { name: "Calibri", sz: 10.5, bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "0F172A" } },
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          border: {
            top: { style: "thin", color: { rgb: "334155" } },
            bottom: { style: "medium", color: { rgb: "0F172A" } },
            left: { style: "thin", color: { rgb: "334155" } },
            right: { style: "thin", color: { rgb: "334155" } },
          },
        };
      }
    });
  }

  // 5. Estilos de Filas de Datos
  breakdown.forEach((it, idx) => {
    const rowNum = dataStartRowIndex + 1 + idx; // 1-based row
    const isEven = idx % 2 === 0;
    const rowBg = isEven ? "FFFFFF" : "F8FAFC";

    // Columna A (Categoría)
    const cellA = ws[`A${rowNum}`];
    if (cellA) {
      cellA.s = {
        font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "0F172A" } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: "left", vertical: "center" },
        border: borderThin,
      };
    }

    let cIndex = 1;
    periodResults.forEach((p) => {
      const colLetterAmount = getColumnLetter(cIndex);
      const colLetterShare = getColumnLetter(cIndex + 1);

      // Monto
      const cellAmt = ws[`${colLetterAmount}${rowNum}`];
      if (cellAmt) {
        cellAmt.z = excelCurrencyFormat;
        cellAmt.s = {
          font: { name: "Calibri", sz: 10, color: { rgb: "0F172A" } },
          fill: { fgColor: { rgb: rowBg } },
          alignment: { horizontal: "right", vertical: "center" },
          border: borderThin,
        };
      }

      // % Share
      const cellSh = ws[`${colLetterShare}${rowNum}`];
      if (cellSh) {
        cellSh.z = '0.0%';
        cellSh.s = {
          font: { name: "Calibri", sz: 9.5, color: { rgb: "64748B" } },
          fill: { fgColor: { rgb: rowBg } },
          alignment: { horizontal: "right", vertical: "center" },
          border: borderThin,
        };
      }

      cIndex += 2;
    });

    if (isTwoPeriods) {
      const colDiff = getColumnLetter(cIndex);
      const colPct = getColumnLetter(cIndex + 1);
      const colDiag = getColumnLetter(cIndex + 2);

      const diffColor = it.diffAB < 0 ? "047857" : it.diffAB > 0 ? "B91C1C" : "64748B";
      const diffBg = it.diffAB < 0 ? "ECFDF5" : it.diffAB > 0 ? "FEF2F2" : rowBg;

      // Diferencia
      const cellDiff = ws[`${colDiff}${rowNum}`];
      if (cellDiff) {
        cellDiff.z = excelDiffCurrencyFormat;
        cellDiff.s = {
          font: { name: "Calibri", sz: 10, bold: true, color: { rgb: diffColor } },
          fill: { fgColor: { rgb: diffBg } },
          alignment: { horizontal: "right", vertical: "center" },
          border: borderThin,
        };
      }

      // Variación %
      const cellPct = ws[`${colPct}${rowNum}`];
      if (cellPct) {
        cellPct.z = '+0.0%;-0.0%;0.0%';
        cellPct.s = {
          font: { name: "Calibri", sz: 10, bold: true, color: { rgb: diffColor } },
          fill: { fgColor: { rgb: diffBg } },
          alignment: { horizontal: "right", vertical: "center" },
          border: borderThin,
        };
      }

      // Diagnóstico
      const cellDiag = ws[`${colDiag}${rowNum}`];
      if (cellDiag) {
        let badgeBg = diffBg;
        let badgeText = diffColor;
        if (it.amountB === 0 && it.amountA > 0) {
          badgeBg = "FEF3C7";
          badgeText = "B45309";
        } else if (it.amountA === 0 && it.amountB > 0) {
          badgeBg = "F1F5F9";
          badgeText = "64748B";
        }

        cellDiag.s = {
          font: { name: "Calibri", sz: 9.5, bold: true, color: { rgb: badgeText } },
          fill: { fgColor: { rgb: badgeBg } },
          alignment: { horizontal: "center", vertical: "center" },
          border: borderThin,
        };
      }
    }
  });

  // 6. Fila de Totales
  const totalRow1Idx = totalRowIndex + 1;
  const totalBorder = {
    top: { style: "thin", color: { rgb: "94A3B8" } },
    bottom: { style: "double", color: { rgb: "0F172A" } },
    left: { style: "thin", color: { rgb: "334155" } },
    right: { style: "thin", color: { rgb: "334155" } },
  };

  for (let c = 0; c < numCols; c++) {
    const colLetter = getColumnLetter(c);
    const cell = ws[`${colLetter}${totalRow1Idx}`];
    if (cell) {
      cell.s = {
        font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1B4B73" } },
        alignment: { horizontal: c === 0 ? "left" : "right", vertical: "center" },
        border: totalBorder,
      };
    }
  }

  let totColIndex = 1;
  periodResults.forEach(() => {
    const colLetterAmount = getColumnLetter(totColIndex);
    const colLetterShare = getColumnLetter(totColIndex + 1);

    if (ws[`${colLetterAmount}${totalRow1Idx}`]) {
      ws[`${colLetterAmount}${totalRow1Idx}`].z = excelCurrencyFormat;
    }
    if (ws[`${colLetterShare}${totalRow1Idx}`]) {
      ws[`${colLetterShare}${totalRow1Idx}`].z = '0.0%';
    }

    totColIndex += 2;
  });

  if (isTwoPeriods) {
    const colDiff = getColumnLetter(totColIndex);
    const colPct = getColumnLetter(totColIndex + 1);
    const colDiag = getColumnLetter(totColIndex + 2);

    const cellDiff = ws[`${colDiff}${totalRow1Idx}`];
    if (cellDiff) {
      cellDiff.z = excelDiffCurrencyFormat;
      cellDiff.s.font = {
        name: "Calibri",
        sz: 11,
        bold: true,
        color: { rgb: diffTotalAB < 0 ? "A7F3D0" : "FECACA" },
      };
    }

    const cellPct = ws[`${colPct}${totalRow1Idx}`];
    if (cellPct) {
      cellPct.z = '+0.0%;-0.0%;0.0%';
    }

    const cellDiag = ws[`${colDiag}${totalRow1Idx}`];
    if (cellDiag) {
      cellDiag.s.alignment = { horizontal: "center", vertical: "center" };
    }
  }

  // 7. Pie de notas
  const noteRow1Idx = aoa.length;
  const cellNote = ws[`A${noteRow1Idx}`];
  if (cellNote) {
    cellNote.s = {
      font: { name: "Calibri", sz: 8.5, italic: true, color: { rgb: "64748B" } },
      alignment: { horizontal: "left", vertical: "center" },
    };
  }

  // Agregar hoja al libro y descargar
  XLSX.utils.book_append_sheet(wb, ws, "Comparativa Gastos");

  const safeTenant = tenantName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const periodIds = periods.map((p) => p.id).join("_");
  const dateTag = new Date().toISOString().slice(0, 10);
  const filename = `Comparativa_${periodIds}_Gastos_${safeTenant}_${dateTag}.xlsx`;

  XLSX.writeFile(wb, filename);
}

/**
 * Genera y descarga un libro Excel (.xlsx) altamente estilizado para la lista
 * regular de Gastos (Operativos o Caja Chica) de Klynn Cloud POS.
 */
export function exportGastosListToExcel(
  gastosList: any[],
  tabType: "manual" | "caja-chica" | string,
  tenantName: string = "Klynn Lavandería",
  currencySymbol: string = "RD$",
  currencyCode: string = "DOP",
) {
  const wb = XLSX.utils.book_new();

  const isCajaChica = tabType === "caja-chica";
  const title = isCajaChica
    ? "KLYNN CLOUD POS — REPORTE DE EGRESOS DE CAJA CHICA"
    : "KLYNN CLOUD POS — REPORTE DE GASTOS OPERATIVOS";
  const sheetName = isCajaChica ? "Caja Chica" : "Gastos Operativos";

  const fechaStr = new Date().toLocaleDateString("es-DO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const totalSum = gastosList.reduce((acc, g) => acc + (Number(g.monto) || 0), 0);

  const headers = isCajaChica
    ? ["Fecha", "Categoría", "Descripción", "Método de Pago", `Monto (${currencySymbol})`]
    : ["Fecha", "Categoría", "Descripción", "Proveedor", "Método de Pago", `Monto (${currencySymbol})`];

  const numCols = headers.length;

  const aoa: any[][] = [
    [title],
    [`Empresa: ${tenantName}  |  Fecha de Generación: ${fechaStr}  |  Total Registros: ${gastosList.length}`],
    [],
    headers,
  ];

  gastosList.forEach((g) => {
    const fStr = g.fecha ? String(g.fecha).slice(0, 10) : "—";
    const cat = g.categoria || "General";
    const desc = g.descripcion || "—";
    const met = g.metodo_pago || "Efectivo";
    const monto = Number(g.monto) || 0;

    if (isCajaChica) {
      aoa.push([fStr, cat, desc, met, monto]);
    } else {
      const prov = g.proveedor || "—";
      aoa.push([fStr, cat, desc, prov, met, monto]);
    }
  });

  // Fila de total
  const totalRow: any[] = ["TOTAL GENERAL"];
  for (let i = 1; i < numCols - 1; i++) {
    totalRow.push("");
  }
  totalRow.push(totalSum);
  aoa.push(totalRow);

  aoa.push([]);
  aoa.push([`* Cifras expresadas en ${currencyCode} (${currencySymbol}). Generado desde Klynn Cloud POS.`]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Merges
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } },
    // Total label merge
    { s: { r: aoa.length - 3, c: 0 }, e: { r: aoa.length - 3, c: numCols - 2 } },
    // Footer note
    { s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: numCols - 1 } },
  ];

  // Column widths
  ws["!cols"] = isCajaChica
    ? [{ wch: 14 }, { wch: 24 }, { wch: 36 }, { wch: 20 }, { wch: 22 }]
    : [{ wch: 14 }, { wch: 24 }, { wch: 36 }, { wch: 24 }, { wch: 20 }, { wch: 22 }];

  // Row heights
  ws["!rows"] = [
    { hpt: 32 },
    { hpt: 20 },
    { hpt: 10 },
    { hpt: 26 },
    ...gastosList.map(() => ({ hpt: 20 })),
    { hpt: 26 },
    { hpt: 10 },
    { hpt: 16 },
  ];

  // Título
  ws["A1"].s = {
    font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "1B4B73" } },
    alignment: { horizontal: "center", vertical: "center" },
  };

  // Subtítulo
  ws["A2"].s = {
    font: { name: "Calibri", sz: 9.5, italic: true, color: { rgb: "334155" } },
    fill: { fgColor: { rgb: "F1F5F9" } },
    alignment: { horizontal: "center", vertical: "center" },
  };

  // Encabezados de tabla
  for (let c = 0; c < numCols; c++) {
    const colLetter = getColumnLetter(c);
    const cell = ws[`${colLetter}4`];
    if (cell) {
      cell.s = {
        font: { name: "Calibri", sz: 10.5, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1B4B73" } },
        alignment: { horizontal: c === numCols - 1 ? "right" : "left", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "334155" } },
          bottom: { style: "medium", color: { rgb: "0F172A" } },
          left: { style: "thin", color: { rgb: "334155" } },
          right: { style: "thin", color: { rgb: "334155" } },
        },
      };
    }
  }

  // Filas de datos
  const borderThin = {
    top: { style: "thin", color: { rgb: "E2E8F0" } },
    bottom: { style: "thin", color: { rgb: "E2E8F0" } },
    left: { style: "thin", color: { rgb: "E2E8F0" } },
    right: { style: "thin", color: { rgb: "E2E8F0" } },
  };

  gastosList.forEach((_, idx) => {
    const rowNum = 5 + idx;
    const isEven = idx % 2 === 0;
    const rowBg = isEven ? "FFFFFF" : "F8FAFC";

    for (let c = 0; c < numCols; c++) {
      const colLetter = getColumnLetter(c);
      const cell = ws[`${colLetter}${rowNum}`];
      if (cell) {
        cell.s = {
          font: { name: "Calibri", sz: 10, color: { rgb: "0F172A" } },
          fill: { fgColor: { rgb: rowBg } },
          alignment: { horizontal: c === numCols - 1 ? "right" : "left", vertical: "center" },
          border: borderThin,
        };

        // Columna Monto
        if (c === numCols - 1) {
          cell.z = `"${currencySymbol} "#,##0.00`;
          cell.s.font.bold = true;
        }
      }
    }
  });

  // Fila de Total
  const totalRowNum = 5 + gastosList.length;
  for (let c = 0; c < numCols; c++) {
    const colLetter = getColumnLetter(c);
    const cell = ws[`${colLetter}${totalRowNum}`];
    if (cell) {
      cell.s = {
        font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1B4B73" } },
        alignment: { horizontal: c === numCols - 1 ? "right" : "left", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "94A3B8" } },
          bottom: { style: "double", color: { rgb: "0F172A" } },
          left: { style: "thin", color: { rgb: "334155" } },
          right: { style: "thin", color: { rgb: "334155" } },
        },
      };
      if (c === numCols - 1) {
        cell.z = `"${currencySymbol} "#,##0.00`;
      }
    }
  }

  // Pie de nota
  const noteCell = ws[`A${totalRowNum + 2}`];
  if (noteCell) {
    noteCell.s = {
      font: { name: "Calibri", sz: 8.5, italic: true, color: { rgb: "64748B" } },
      alignment: { horizontal: "left", vertical: "center" },
    };
  }

  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const safeTenant = tenantName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const dateTag = new Date().toISOString().slice(0, 10);
  const filePrefix = isCajaChica ? "Gastos_Caja_Chica" : "Gastos_Operativos";
  const filename = `${filePrefix}_${safeTenant}_${dateTag}.xlsx`;

  XLSX.writeFile(wb, filename);
}
