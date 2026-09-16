import XLSX from "xlsx-js-style";
import type { Orden, Cliente } from "./storage";

export interface ExportOrdenesOptions {
  ordenes: Orden[];
  clientes: Cliente[];
  tenantName?: string;
  isConveyorEnabled?: boolean;
  filtroActivo?: string;
}

function getColumnLetter(colIndex: number): string {
  let letter = "";
  let temp = colIndex;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

function formatDateTimeForExcel(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleString("es-DO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(dateStr);
  }
}

function getNotaCreditoMonto(orden: Orden): number {
  return Math.max(0, Number(orden.nota_credito_monto || 0));
}

function getNotaDebitoMonto(orden: Orden): number {
  return Math.max(0, Number(orden.nota_debito_monto || 0));
}

function getTotalNetoOrden(orden: Orden): number {
  return Math.max(
    0,
    Number((orden.total - getNotaCreditoMonto(orden) + getNotaDebitoMonto(orden)).toFixed(2))
  );
}

/**
 * Exporta el listado actual de órdenes a un archivo Excel (.xlsx) altamente
 * estilizado, profesional, con tarjetas KPI, formato de moneda contable y colores de estado.
 */
export function exportOrdenesToExcel(options: ExportOrdenesOptions) {
  const {
    ordenes,
    clientes,
    tenantName = "Klynn Lavandería",
    isConveyorEnabled = false,
    filtroActivo = "Todas las órdenes",
  } = options;

  const wb = XLSX.utils.book_new();

  const fechaEmision = new Date().toLocaleString("es-DO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // Métricas para las Tarjetas KPI
  const totalOrdenes = ordenes.length;
  let totalPrendas = 0;
  let sumTotalOriginal = 0;
  let sumNotaCredito = 0;
  let sumNotaDebito = 0;
  let sumTotalNeto = 0;
  let sumSaldo = 0;
  let sumCobrado = 0;
  let pagadasCount = 0;
  let conSaldoCount = 0;

  ordenes.forEach((o) => {
    const nc = getNotaCreditoMonto(o);
    const nd = getNotaDebitoMonto(o);
    const net = getTotalNetoOrden(o);
    const s = Math.max(0, Number(o.saldo || 0));
    const cob = Math.max(0, Number((net - s).toFixed(2)));
    const pr = Number(o.total_prendas || 0);

    totalPrendas += pr;
    sumTotalOriginal += Number(o.total || 0);
    sumNotaCredito += nc;
    sumNotaDebito += nd;
    sumTotalNeto += net;
    sumSaldo += s;
    sumCobrado += cob;

    if (s <= 0) {
      pagadasCount++;
    } else {
      conSaldoCount++;
    }
  });

  // Definición de columnas
  const headers: string[] = [
    "Nº Orden",
    "Fecha Creación",
    "Cliente",
    "Teléfono",
    "Estado",
    "Prioridad",
  ];

  if (isConveyorEnabled) {
    headers.push("Ubicación");
  }

  headers.push(
    "Prendas",
    "Total Original (RD$)",
    "Nota Crédito (RD$)",
    "Nota Débito (RD$)",
    "Total Neto (RD$)",
    "Cobrado (RD$)",
    "Saldo Pendiente (RD$)",
    "Estado Pago",
    "Método Pago",
    "Fecha Prometida Entrega"
  );

  const numCols = headers.length;

  const aoa: any[][] = [];

  // Fila 0: Título Principal
  aoa.push(["KLYNN CLOUD POS — REPORTE GENERAL DE ÓRDENES Y VENTAS"]);

  // Fila 1: Subtítulo y Metadatos
  aoa.push([
    `Empresa: ${tenantName}  |  Emisión: ${fechaEmision}  |  Órdenes: ${totalOrdenes}  |  Filtro: ${filtroActivo}`,
  ]);

  // Fila 2: Espacio
  aoa.push([]);

  // Filas 3-5: Tarjetas KPI Ejecutivas (4 tarjetas horizontales)
  // Tarjeta 1 (cols 1..3): Ventas Netas
  // Tarjeta 2 (cols 5..7): Total Cobrado
  // Tarjeta 3 (cols 9..11): Saldo Pendiente
  // Tarjeta 4 (cols 13..15): Prendas
  const kpiHeaders = new Array(numCols).fill("");
  const kpiValues = new Array(numCols).fill("");
  const kpiNotes = new Array(numCols).fill("");

  // Card 1
  kpiHeaders[1] = "TOTAL VENTAS NETAS";
  kpiValues[1] = sumTotalNeto;
  kpiNotes[1] = `${totalOrdenes} órdenes facturadas`;

  // Card 2
  kpiHeaders[5] = "TOTAL COBRADO / PAGADO";
  kpiValues[5] = sumCobrado;
  kpiNotes[5] = `${pagadasCount} órdenes liquidadas (100%)`;

  // Card 3
  kpiHeaders[9] = "SALDO POR COBRAR (PENDIENTE)";
  kpiValues[9] = sumSaldo;
  kpiNotes[9] = `${conSaldoCount} órdenes con saldo pendiente`;

  // Card 4
  const c4Col = Math.min(13, numCols - 2);
  kpiHeaders[c4Col] = "VOLUMEN DE PRENDAS";
  kpiValues[c4Col] = totalPrendas;
  kpiNotes[c4Col] = `Promedio: ${(totalPrendas / (totalOrdenes || 1)).toFixed(1)} prendas/orden`;

  aoa.push(kpiHeaders);
  aoa.push(kpiValues);
  aoa.push(kpiNotes);

  // Fila 6: Espacio separador
  aoa.push([]);

  // Fila 7: Encabezados de la Tabla Principal
  const tableHeaderRowIdx = aoa.length;
  aoa.push(headers);

  // Filas de Datos
  const dataStartRowIdx = aoa.length;
  ordenes.forEach((o) => {
    const cli = clientes.find((c) => c.id === o.cliente_id);
    const cliNombre = cli
      ? `${cli.nombre} ${cli.apellido || ""}`.trim()
      : o.cliente_nombre || "—";
    const cliTel = cli?.telefono || "—";

    const nc = getNotaCreditoMonto(o);
    const nd = getNotaDebitoMonto(o);
    const net = getTotalNetoOrden(o);
    const s = Math.max(0, Number(o.saldo || 0));
    const cob = Math.max(0, Number((net - s).toFixed(2)));
    const pr = Number(o.total_prendas || 0);

    const estPago = s <= 0 ? "PAGADO" : cob > 0 ? "ABONO" : "PENDIENTE";
    const priorLabel = o.prioridad === "URGENTE" || (o as any).es_urgente ? "⚡ Urgente" : "Normal";

    const row: any[] = [
      o.numero || "—",
      formatDateTimeForExcel(o.creado_en),
      cliNombre,
      cliTel,
      (o.estado || "PENDIENTE").toUpperCase(),
      priorLabel,
    ];

    if (isConveyorEnabled) {
      row.push(o.ubicacion_ropa || "Sin asignar");
    }

    row.push(
      pr,
      Number(o.total || 0),
      nc,
      nd,
      net,
      cob,
      s,
      estPago,
      (o.metodo_pago || "Efectivo").replace(/_/g, " "),
      formatDateTimeForExcel(o.fecha_entrega_prometida)
    );

    aoa.push(row);
  });

  // Fila de Totales Generales
  const totalRowIdx = aoa.length;
  const totalRow: any[] = ["TOTALES GENERALES"];

  // Espaciadores hasta la columna de Prendas
  const prendasColIdx = isConveyorEnabled ? 7 : 6;
  for (let i = 1; i < prendasColIdx; i++) {
    totalRow.push("");
  }

  totalRow.push(
    totalPrendas,
    sumTotalOriginal,
    sumNotaCredito,
    sumNotaDebito,
    sumTotalNeto,
    sumCobrado,
    sumSaldo,
    "",
    "",
    ""
  );

  aoa.push(totalRow);

  // Fila de pie
  aoa.push([]);
  aoa.push([
    `* Reporte oficial generado por Klynn Cloud POS. Todas las cifras monetarias están expresadas en Pesos Dominicanos (RD$ / DOP).`,
  ]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Merges
  const merges: XLSX.Range[] = [
    // Título y Subtítulo
    { s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } },

    // Tarjeta 1 (cols 1..3)
    { s: { r: 3, c: 1 }, e: { r: 3, c: 3 } },
    { s: { r: 4, c: 1 }, e: { r: 4, c: 3 } },
    { s: { r: 5, c: 1 }, e: { r: 5, c: 3 } },

    // Tarjeta 2 (cols 5..7)
    { s: { r: 3, c: 5 }, e: { r: 3, c: 7 } },
    { s: { r: 4, c: 5 }, e: { r: 4, c: 7 } },
    { s: { r: 5, c: 5 }, e: { r: 5, c: 7 } },

    // Tarjeta 3 (cols 9..11)
    { s: { r: 3, c: 9 }, e: { r: 3, c: 11 } },
    { s: { r: 4, c: 9 }, e: { r: 4, c: 11 } },
    { s: { r: 5, c: 9 }, e: { r: 5, c: 11 } },

    // Tarjeta 4 (cols c4Col..c4Col+2)
    { s: { r: 3, c: c4Col }, e: { r: 3, c: Math.min(c4Col + 2, numCols - 1) } },
    { s: { r: 4, c: c4Col }, e: { r: 4, c: Math.min(c4Col + 2, numCols - 1) } },
    { s: { r: 5, c: c4Col }, e: { r: 5, c: Math.min(c4Col + 2, numCols - 1) } },

    // Fila Total (merge hasta columna de prendas - 1)
    { s: { r: totalRowIdx, c: 0 }, e: { r: totalRowIdx, c: prendasColIdx - 1 } },

    // Pie de notas
    { s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: numCols - 1 } },
  ];

  ws["!merges"] = merges;

  // Anchos de Columna
  const colsConfig: { wch: number }[] = [
    { wch: 14 }, // Nº Orden
    { wch: 22 }, // Fecha Creación
    { wch: 30 }, // Cliente
    { wch: 18 }, // Teléfono
    { wch: 16 }, // Estado
    { wch: 15 }, // Prioridad
  ];

  if (isConveyorEnabled) {
    colsConfig.push({ wch: 18 }); // Ubicación
  }

  colsConfig.push(
    { wch: 12 }, // Prendas
    { wch: 22 }, // Total Original
    { wch: 18 }, // Nota Crédito
    { wch: 18 }, // Nota Débito
    { wch: 22 }, // Total Neto
    { wch: 20 }, // Cobrado
    { wch: 22 }, // Saldo Pendiente
    { wch: 16 }, // Estado Pago
    { wch: 20 }, // Método Pago
    { wch: 24 }  // Fecha Entrega
  );

  ws["!cols"] = colsConfig;

  // Alturas de Filas
  const rowsConfig: { hpt: number }[] = [
    { hpt: 34 }, // Título
    { hpt: 20 }, // Subtítulo
    { hpt: 10 }, // Espacio
    { hpt: 22 }, // KPI Header
    { hpt: 32 }, // KPI Valor
    { hpt: 18 }, // KPI Subtítulo
    { hpt: 12 }, // Espacio
    { hpt: 26 }, // Table Header
  ];

  ordenes.forEach(() => {
    rowsConfig.push({ hpt: 21 });
  });

  rowsConfig.push({ hpt: 26 }); // Fila total
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

  // 1. Título Principal
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
  // Tarjeta 1: Ventas Netas
  ["B4", "C4", "D4"].forEach((cell) => {
    ws[cell] = ws[cell] || { t: "s", v: "" };
    ws[cell].s = {
      font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1E40AF" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  });
  ["B5", "C5", "D5"].forEach((cell) => {
    ws[cell] = ws[cell] || { t: "n", v: sumTotalNeto };
    ws[cell].z = '"RD$ "#,##0.00';
    ws[cell].s = {
      font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "1E3A8A" } },
      fill: { fgColor: { rgb: "EFF6FF" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  });
  ["B6", "C6", "D6"].forEach((cell) => {
    ws[cell] = ws[cell] || { t: "s", v: "" };
    ws[cell].s = {
      font: { name: "Calibri", sz: 9, color: { rgb: "475569" } },
      fill: { fgColor: { rgb: "EFF6FF" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  });

  // Tarjeta 2: Cobrado
  ["F4", "G4", "H4"].forEach((cell) => {
    ws[cell] = ws[cell] || { t: "s", v: "" };
    ws[cell].s = {
      font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "047857" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  });
  ["F5", "G5", "H5"].forEach((cell) => {
    ws[cell] = ws[cell] || { t: "n", v: sumCobrado };
    ws[cell].z = '"RD$ "#,##0.00';
    ws[cell].s = {
      font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "047857" } },
      fill: { fgColor: { rgb: "ECFDF5" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  });
  ["F6", "G6", "H6"].forEach((cell) => {
    ws[cell] = ws[cell] || { t: "s", v: "" };
    ws[cell].s = {
      font: { name: "Calibri", sz: 9, color: { rgb: "047857" } },
      fill: { fgColor: { rgb: "ECFDF5" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  });

  // Tarjeta 3: Saldo Pendiente
  const saldoCardHeaderBg = sumSaldo > 0 ? "B45309" : "334155";
  const saldoCardBodyBg = sumSaldo > 0 ? "FEF3C7" : "F8FAFC";
  const saldoCardTextColor = sumSaldo > 0 ? "B45309" : "475569";

  ["J4", "K4", "L4"].forEach((cell) => {
    ws[cell] = ws[cell] || { t: "s", v: "" };
    ws[cell].s = {
      font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: saldoCardHeaderBg } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  });
  ["J5", "K5", "L5"].forEach((cell) => {
    ws[cell] = ws[cell] || { t: "n", v: sumSaldo };
    ws[cell].z = '"RD$ "#,##0.00;[Red]-"RD$ "#,##0.00;"RD$ 0.00"';
    ws[cell].s = {
      font: { name: "Calibri", sz: 14, bold: true, color: { rgb: saldoCardTextColor } },
      fill: { fgColor: { rgb: saldoCardBodyBg } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  });
  ["J6", "K6", "L6"].forEach((cell) => {
    ws[cell] = ws[cell] || { t: "s", v: "" };
    ws[cell].s = {
      font: { name: "Calibri", sz: 9, bold: true, color: { rgb: saldoCardTextColor } },
      fill: { fgColor: { rgb: saldoCardBodyBg } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  });

  // Tarjeta 4: Prendas
  const c4Letter = getColumnLetter(c4Col);
  const c4Letter2 = getColumnLetter(c4Col + 1);
  const c4Letter3 = getColumnLetter(c4Col + 2);

  [`${c4Letter}4`, `${c4Letter2}4`, `${c4Letter3}4`].forEach((cell) => {
    ws[cell] = ws[cell] || { t: "s", v: "" };
    ws[cell].s = {
      font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4338CA" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  });
  [`${c4Letter}5`, `${c4Letter2}5`, `${c4Letter3}5`].forEach((cell) => {
    ws[cell] = ws[cell] || { t: "n", v: totalPrendas };
    ws[cell].z = '#,##0';
    ws[cell].s = {
      font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "3730A3" } },
      fill: { fgColor: { rgb: "EEF2FF" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  });
  [`${c4Letter}6`, `${c4Letter2}6`, `${c4Letter3}6`].forEach((cell) => {
    ws[cell] = ws[cell] || { t: "s", v: "" };
    ws[cell].s = {
      font: { name: "Calibri", sz: 9, color: { rgb: "475569" } },
      fill: { fgColor: { rgb: "EEF2FF" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  });

  // 4. Encabezados de Tabla (Fila 8, 1-based)
  const headerRow1Idx = tableHeaderRowIdx + 1;
  for (let c = 0; c < numCols; c++) {
    const colLetter = getColumnLetter(c);
    const cell = ws[`${colLetter}${headerRow1Idx}`];
    if (cell) {
      cell.s = {
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
  }

  // 5. Filas de Datos
  const stateColors: Record<string, { bg: string; text: string }> = {
    ENTREGADA: { bg: "EDE9FE", text: "6B21A8" },
    LISTA: { bg: "ECFDF5", text: "047857" },
    EN_PROCESO: { bg: "FEF3C7", text: "B45309" },
    PENDIENTE: { bg: "EFF6FF", text: "1E40AF" },
    ANULADA: { bg: "FEE2E2", text: "991B1B" },
  };

  ordenes.forEach((o, idx) => {
    const rowNum = dataStartRowIdx + 1 + idx;
    const isEven = idx % 2 === 0;
    const rowBg = isEven ? "FFFFFF" : "F8FAFC";

    for (let c = 0; c < numCols; c++) {
      const colLetter = getColumnLetter(c);
      const cell = ws[`${colLetter}${rowNum}`];
      if (!cell) continue;

      cell.s = {
        font: { name: "Calibri", sz: 10, color: { rgb: "0F172A" } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: "left", vertical: "center" },
        border: borderThin,
      };

      // Columna 0: Nº Orden
      if (c === 0) {
        cell.s.font.bold = true;
        cell.s.font.color = { rgb: "1B4B73" };
        cell.s.alignment.horizontal = "center";
      }

      // Columna 1: Fecha Creación
      if (c === 1) {
        cell.s.alignment.horizontal = "center";
      }

      // Columna 2: Cliente
      if (c === 2) {
        cell.s.font.bold = true;
      }

      // Columna 3: Teléfono
      if (c === 3) {
        cell.s.alignment.horizontal = "center";
      }

      // Columna 4: Estado
      if (c === 4) {
        const estKey = (o.estado || "").toUpperCase().replace(/\s+/g, "_");
        const st = stateColors[estKey] || { bg: rowBg, text: "0F172A" };
        cell.s.font.bold = true;
        cell.s.font.color = { rgb: st.text };
        cell.s.fill = { fgColor: { rgb: st.bg } };
        cell.s.alignment.horizontal = "center";
      }

      // Columna 5: Prioridad
      if (c === 5) {
        const isUrg = o.prioridad === "URGENTE" || (o as any).es_urgente;
        if (isUrg) {
          cell.s.font.bold = true;
          cell.s.font.color = { rgb: "BE123C" };
          cell.s.fill = { fgColor: { rgb: "FFE4E6" } };
        }
        cell.s.alignment.horizontal = "center";
      }

      // Columna Ubicación (si existe)
      if (isConveyorEnabled && c === 6) {
        cell.s.alignment.horizontal = "center";
      }

      // Columna Prendas
      const prCol = isConveyorEnabled ? 7 : 6;
      if (c === prCol) {
        cell.z = '#,##0';
        cell.s.alignment.horizontal = "center";
        cell.s.font.bold = true;
      }

      // Columnas Monetarias (Total Original, NC, ND, Total Neto, Cobrado, Saldo)
      if (c >= prCol + 1 && c <= prCol + 6) {
        cell.z = '"RD$ "#,##0.00;[Red]-"RD$ "#,##0.00;"RD$ 0.00"';
        cell.s.alignment.horizontal = "right";

        // Total Neto en negrita
        if (c === prCol + 4) {
          cell.s.font.bold = true;
        }

        // Saldo Pendiente
        if (c === prCol + 6) {
          const sVal = Number(o.saldo || 0);
          cell.s.font.bold = true;
          if (sVal > 0) {
            cell.s.fill = { fgColor: { rgb: "FEF3C7" } };
            cell.s.font.color = { rgb: "B45309" };
          } else {
            cell.s.fill = { fgColor: { rgb: "ECFDF5" } };
            cell.s.font.color = { rgb: "047857" };
          }
        }
      }

      // Columna Estado Pago
      if (c === prCol + 7) {
        const sVal = Number(o.saldo || 0);
        cell.s.font.bold = true;
        cell.s.alignment.horizontal = "center";
        if (sVal <= 0) {
          cell.s.fill = { fgColor: { rgb: "ECFDF5" } };
          cell.s.font.color = { rgb: "047857" };
        } else {
          cell.s.fill = { fgColor: { rgb: "FEF2F2" } };
          cell.s.font.color = { rgb: "B91C1C" };
        }
      }

      // Método de Pago
      if (c === prCol + 8) {
        cell.s.alignment.horizontal = "center";
      }

      // Fecha Entrega
      if (c === prCol + 9) {
        cell.s.alignment.horizontal = "center";
      }
    }
  });

  // 6. Fila de Totales Generales
  const totalRow1Idx = totalRowIdx + 1;
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

      // Prendas sum format
      if (c === prendasColIdx) {
        cell.z = '#,##0';
        cell.s.alignment.horizontal = "center";
      }

      // Currency sums
      if (c >= prendasColIdx + 1 && c <= prendasColIdx + 6) {
        cell.z = '"RD$ "#,##0.00;[Red]-"RD$ "#,##0.00;"RD$ 0.00"';
      }
    }
  }

  // 7. Pie de nota
  const noteRow1Idx = aoa.length;
  const cellNote = ws[`A${noteRow1Idx}`];
  if (cellNote) {
    cellNote.s = {
      font: { name: "Calibri", sz: 8.5, italic: true, color: { rgb: "64748B" } },
      alignment: { horizontal: "left", vertical: "center" },
    };
  }

  XLSX.utils.book_append_sheet(wb, ws, "Órdenes y Ventas");

  const safeTenant = tenantName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const dateTag = new Date().toISOString().slice(0, 10);
  const filename = `Reporte_Ordenes_${safeTenant}_${dateTag}.xlsx`;

  XLSX.writeFile(wb, filename);
}
