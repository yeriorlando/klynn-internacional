import XLSX from "xlsx-js-style";
import type { FacturaCXP, Suplidor } from "@/lib/storage";

export interface ExportCXPFacturasOptions {
  tenantName?: string;
  tenantRnc?: string;
  facturas: FacturaCXP[];
  suplidores?: Suplidor[];
  fechaReporte?: string;
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

function formatFecha(str?: string): string {
  if (!str) return "N/D";
  const s = String(str).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  const raw = s.split("T")[0].split(" ")[0].trim();
  const parts = raw.split("-");
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    if (parts[0].length === 4) {
      return `${parts[2].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[0]}`;
    }
    if (parts[2].length === 4) {
      return `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[2]}`;
    }
  }
  return s;
}

export function exportCXPToExcel(options: ExportCXPFacturasOptions) {
  const {
    tenantName = "Klynn Lavandería",
    tenantRnc = "N/D",
    facturas = [],
    suplidores = [],
    fechaReporte,
  } = options;

  const wb = XLSX.utils.book_new();

  const fechaGeneracion =
    fechaReporte ||
    new Date().toLocaleDateString("es-DO", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // =========================================================================
  // CÁLCULOS GENERALES DE CUENTAS POR PAGAR
  // =========================================================================
  const totalFacturado = facturas.reduce((acc, f) => acc + (f.total || 0), 0);
  const totalSubtotal = facturas.reduce((acc, f) => acc + (f.subtotal || 0), 0);
  const totalItbis = facturas.reduce((acc, f) => acc + (f.itbis || 0), 0);
  const totalPagado = facturas.reduce((acc, f) => acc + (f.monto_pagado || 0), 0);
  const totalDeuda = facturas.reduce((acc, f) => acc + (f.saldo_pendiente || 0), 0);

  const facturasPendientes = facturas.filter(
    (f) => (f.saldo_pendiente || 0) > 0.01 && f.estado !== "ANULADA"
  );
  const facturasSaldadas = facturas.filter(
    (f) => f.estado === "PAGADA" || (f.saldo_pendiente || 0) <= 0.01
  );

  const facturasAlDia = facturas.filter(
    (f) => f.estado_mora === "AL_DIA" && (f.saldo_pendiente || 0) > 0.01
  );
  const facturasPorVencer = facturas.filter(
    (f) => f.estado_mora === "POR_VENCER" && (f.saldo_pendiente || 0) > 0.01
  );
  const facturasVencidas = facturas.filter(
    (f) => f.estado_mora === "VENCIDA" && (f.saldo_pendiente || 0) > 0.01
  );
  const facturasCriticas = facturas.filter(
    (f) => f.estado_mora === "CRITICA" && (f.saldo_pendiente || 0) > 0.01
  );

  const montoAlDia = facturasAlDia.reduce((acc, f) => acc + (f.saldo_pendiente || 0), 0);
  const montoPorVencer = facturasPorVencer.reduce((acc, f) => acc + (f.saldo_pendiente || 0), 0);
  const montoVencidas = facturasVencidas.reduce((acc, f) => acc + (f.saldo_pendiente || 0), 0);
  const montoCriticas = facturasCriticas.reduce((acc, f) => acc + (f.saldo_pendiente || 0), 0);
  const totalMora = montoVencidas + montoCriticas;

  // =========================================================================
  // HOJA 1: FACTURAS Y CUENTAS POR PAGAR (LIBRO DETALLADO)
  // =========================================================================
  const headersFacturas = [
    "Suplidor / Proveedor",
    "RNC / Cédula",
    "No. Factura",
    "e-NCF / Comprobante",
    "Tipo NCF",
    "Categoría Gasto",
    "Fecha Emisión",
    "Plazo (Días)",
    "Fecha Vencimiento",
    "Días Vencida",
    "Subtotal (RD$)",
    "ITBIS (RD$)",
    "Total Facturado (RD$)",
    "Monto Pagado (RD$)",
    "Saldo Pendiente (RD$)",
    "Estado Factura",
    "Estado Mora",
  ];

  const totalColsF = headersFacturas.length; // 17 columnas (A hasta Q)
  const aoaFacturas: any[][] = [];

  // Fila 0: Banner Institucional Principal
  aoaFacturas.push(["KLYNN CLOUD POS — ESTADO OFICIAL DE CUENTAS POR PAGAR (CXP) & COMPRAS A CRÉDITO"]);

  // Fila 1: Subtítulo con Metadatos
  aoaFacturas.push([
    `Empresa: ${tenantName}  |  RNC: ${tenantRnc}  |  Total Facturas: ${facturas.length}  |  Pendientes: ${facturasPendientes.length}  |  Emisión: ${fechaGeneracion}`,
  ]);

  // Fila 2: Separador
  aoaFacturas.push([]);

  // Filas 3-5: 4 Tarjetas KPI Ejecutivas
  // Card 1: Cols A-C (0 to 3) -> Saldo Pendiente
  // Card 2: Cols D-G (4 to 7) -> Total Facturado
  // Card 3: Cols H-K (8 to 11) -> Total Pagado
  // Card 4: Cols L-Q (12 to 16) -> Deuda en Mora
  const kpiFRow1: any[] = new Array(totalColsF).fill("");
  const kpiFRow2: any[] = new Array(totalColsF).fill("");
  const kpiFRow3: any[] = new Array(totalColsF).fill("");

  // Card 1
  kpiFRow1[0] = "SALDO PENDIENTE TOTAL";
  kpiFRow2[0] = totalDeuda;
  kpiFRow3[0] = `${facturasPendientes.length} Facturas activas por saldar`;

  // Card 2
  kpiFRow1[4] = "TOTAL COMPRAS FACTURADAS";
  kpiFRow2[4] = totalFacturado;
  kpiFRow3[4] = "Monto bruto total acumulado";

  // Card 3
  kpiFRow1[8] = "TOTAL ABONADO / PAGADO";
  kpiFRow2[8] = totalPagado;
  kpiFRow3[8] = `${facturasSaldadas.length} Facturas saldadas al 100%`;

  // Card 4
  kpiFRow1[12] = "DEUDA EN MORA Y CRÍTICA";
  kpiFRow2[12] = totalMora;
  kpiFRow3[12] = `Vencidas: ${facturasVencidas.length} · Críticas (>30d): ${facturasCriticas.length}`;

  aoaFacturas.push(kpiFRow1);
  aoaFacturas.push(kpiFRow2);
  aoaFacturas.push(kpiFRow3);

  // Fila 6: Separador
  aoaFacturas.push([]);

  // Fila 7: Título de Sección
  const sec1FRowIdx = aoaFacturas.length;
  aoaFacturas.push(["1. DETALLE DE FACTURAS DE SUPLIDORES, COMPROBANTES FISCALES (e-NCF) Y ESTADO DE MORA"]);

  // Fila 8: Cabeceras
  const headerFRowIdx = aoaFacturas.length;
  aoaFacturas.push(headersFacturas);

  // Filas de datos
  const dataFStartRow = aoaFacturas.length;
  facturas.forEach((f) => {
    const suplidorNombre = f.suplidor?.nombre_comercial || "Suplidor General";
    const suplidorRnc = f.suplidor?.rnc_cedula || "N/D";
    const categoria = (f.categoria_gasto || "OTROS").replace(/_/g, " ");
    const ncf = f.ncf || "SIN NCF";
    const diasVenc = Number(f.dias_vencida) || 0;

    let moraLabel = "AL DÍA";
    if (f.estado_mora === "POR_VENCER") moraLabel = "POR VENCER";
    else if (f.estado_mora === "VENCIDA") moraLabel = `VENCIDA (${diasVenc}D)`;
    else if (f.estado_mora === "CRITICA") moraLabel = `CRÍTICA (${diasVenc}D)`;
    else if (f.estado === "PAGADA") moraLabel = "SALDADA";

    aoaFacturas.push([
      suplidorNombre,
      suplidorRnc,
      f.numero_factura || "S/N",
      ncf,
      f.tipo_ncf || "B01",
      categoria,
      formatFecha(f.fecha_emision),
      f.plazo_dias ?? 0,
      formatFecha(f.fecha_vencimiento),
      diasVenc > 0 ? diasVenc : 0,
      f.subtotal || 0,
      f.itbis || 0,
      f.total || 0,
      f.monto_pagado || 0,
      f.saldo_pendiente || 0,
      f.estado || "PENDIENTE",
      moraLabel,
    ]);
  });
  const dataFEndRow = aoaFacturas.length - 1;

  // Fila de Totales
  const totalFRowIdx = aoaFacturas.length;
  aoaFacturas.push([
    "TOTALES GENERALES",
    "",
    `${facturas.length} Facturas`,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    totalSubtotal,
    totalItbis,
    totalFacturado,
    totalPagado,
    totalDeuda,
    "",
    "",
  ]);

  // Fila de Pie de página
  aoaFacturas.push([]);
  const footerFRowIdx = aoaFacturas.length;
  aoaFacturas.push([
    "Documento oficial emitido por Klynn Cloud POS · Sistema de Gestión de Cuentas por Pagar (CXP) y Control de Comprobantes Fiscales conforme a normativas de la DGII de la República Dominicana.",
  ]);

  const wsFacturas = XLSX.utils.aoa_to_sheet(aoaFacturas);

  // COMBINACIONES DE CELDAS (MERGES)
  const mergesFacturas = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalColsF - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: totalColsF - 1 } },

    // Tarjeta 1 (Cols 0-3)
    { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 3 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 3 } },

    // Tarjeta 2 (Cols 4-7)
    { s: { r: 3, c: 4 }, e: { r: 3, c: 7 } },
    { s: { r: 4, c: 4 }, e: { r: 4, c: 7 } },
    { s: { r: 5, c: 4 }, e: { r: 5, c: 7 } },

    // Tarjeta 3 (Cols 8-11)
    { s: { r: 3, c: 8 }, e: { r: 3, c: 11 } },
    { s: { r: 4, c: 8 }, e: { r: 4, c: 11 } },
    { s: { r: 5, c: 8 }, e: { r: 5, c: 11 } },

    // Tarjeta 4 (Cols 12-16)
    { s: { r: 3, c: 12 }, e: { r: 3, c: 16 } },
    { s: { r: 4, c: 12 }, e: { r: 4, c: 16 } },
    { s: { r: 5, c: 12 }, e: { r: 5, c: 16 } },

    // Título Sección
    { s: { r: sec1FRowIdx, c: 0 }, e: { r: sec1FRowIdx, c: totalColsF - 1 } },

    // Fila de Totales: Combinar Suplidor y RNC
    { s: { r: totalFRowIdx, c: 0 }, e: { r: totalFRowIdx, c: 1 } },

    // Footer
    { s: { r: footerFRowIdx, c: 0 }, e: { r: footerFRowIdx, c: totalColsF - 1 } },
  ];
  wsFacturas["!merges"] = mergesFacturas;

  // ALTURAS DE FILAS
  const rowsFacturas: any[] = [];
  rowsFacturas[0] = { hpt: 32 };
  rowsFacturas[1] = { hpt: 22 };
  rowsFacturas[2] = { hpt: 10 };
  rowsFacturas[3] = { hpt: 16 };
  rowsFacturas[4] = { hpt: 24 };
  rowsFacturas[5] = { hpt: 16 };
  rowsFacturas[6] = { hpt: 10 };
  rowsFacturas[sec1FRowIdx] = { hpt: 22 };
  rowsFacturas[headerFRowIdx] = { hpt: 26 };

  for (let r = dataFStartRow; r <= dataFEndRow; r++) {
    rowsFacturas[r] = { hpt: 22 };
  }
  rowsFacturas[totalFRowIdx] = { hpt: 26 };
  rowsFacturas[footerFRowIdx] = { hpt: 18 };
  wsFacturas["!rows"] = rowsFacturas;

  // ESTILOS VISUALES HOJA 1
  // 1. Título
  const fTitle = wsFacturas["A1"];
  if (fTitle) {
    fTitle.s = {
      font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1B4B73" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }

  // 2. Subtítulo
  const fSub = wsFacturas["A2"];
  if (fSub) {
    fSub.s = {
      font: { name: "Calibri", sz: 9.5, bold: true, color: { rgb: "1E293B" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: { bottom: { style: "thin", color: { rgb: "CBD5E1" } } },
    };
  }

  // 3. Tarjetas KPI
  const kpiFConfigs = [
    { startCol: 0, endCol: 3, bg: "FFF1F2", textCol: "9F1239", valCol: "BE123C", barCol: "BE123C" }, // Rose / Saldo
    { startCol: 4, endCol: 7, bg: "EFF6FF", textCol: "1B4B73", valCol: "1E40AF", barCol: "1B4B73" }, // Blue / Facturado
    { startCol: 8, endCol: 11, bg: "ECFDF5", textCol: "065F46", valCol: "047857", barCol: "047857" }, // Emerald / Pagado
    { startCol: 12, endCol: 16, bg: "FFFBEB", textCol: "92400E", valCol: "B45309", barCol: "D97706" }, // Amber / Mora
  ];

  kpiFConfigs.forEach((kpi) => {
    for (let c = kpi.startCol; c <= kpi.endCol; c++) {
      const colL = getColumnLetter(c);

      const cTitle = wsFacturas[`${colL}4`];
      if (cTitle) {
        cTitle.s = {
          font: { name: "Calibri", sz: 9, bold: true, color: { rgb: kpi.textCol } },
          fill: { fgColor: { rgb: kpi.bg } },
          alignment: { horizontal: "center", vertical: "center" },
          border: { top: { style: "thin", color: { rgb: "CBD5E1" } } },
        };
      }

      const cVal = wsFacturas[`${colL}5`];
      if (cVal) {
        cVal.s = {
          font: { name: "Calibri", sz: 14, bold: true, color: { rgb: kpi.valCol } },
          fill: { fgColor: { rgb: kpi.bg } },
          alignment: { horizontal: "center", vertical: "center" },
        };
        if (typeof cVal.v === "number") {
          cVal.z = '"RD$ "#,##0.00';
        }
      }

      const cNote = wsFacturas[`${colL}6`];
      if (cNote) {
        cNote.s = {
          font: { name: "Calibri", sz: 8.5, italic: true, color: { rgb: kpi.textCol } },
          fill: { fgColor: { rgb: kpi.bg } },
          alignment: { horizontal: "center", vertical: "center" },
          border: { bottom: { style: "medium", color: { rgb: kpi.barCol } } },
        };
      }
    }
  });

  // 4. Sección 1 Banner
  const sec1FCell = wsFacturas[`A${sec1FRowIdx + 1}`];
  if (sec1FCell) {
    sec1FCell.s = {
      font: { name: "Calibri", sz: 10.5, bold: true, color: { rgb: "1B4B73" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { horizontal: "left", vertical: "center" },
      border: {
        top: { style: "medium", color: { rgb: "1B4B73" } },
        bottom: { style: "thin", color: { rgb: "CBD5E1" } },
      },
    };
  }

  // 5. Cabeceras de tabla
  headersFacturas.forEach((_, cIdx) => {
    const colL = getColumnLetter(cIdx);
    const cell = wsFacturas[`${colL}${headerFRowIdx + 1}`];
    if (cell) {
      const isSaldo = cIdx === 14;
      const isPagado = cIdx === 13;
      const isSuplidor = cIdx === 0;

      cell.s = {
        font: { name: "Calibri", sz: 9.5, bold: true, color: { rgb: "FFFFFF" } },
        fill: {
          fgColor: {
            rgb: isSaldo ? "BE123C" : isPagado ? "047857" : isSuplidor ? "0F172A" : "1B4B73",
          },
        },
        alignment: {
          horizontal: cIdx >= 10 && cIdx <= 14 ? "right" : cIdx >= 6 && cIdx <= 9 ? "center" : cIdx >= 15 ? "center" : "left",
          vertical: "center",
          wrapText: true,
        },
        border: {
          top: { style: "thin", color: { rgb: "CBD5E1" } },
          bottom: { style: "medium", color: { rgb: isSaldo ? "9F1239" : "0F172A" } },
        },
      };
    }
  });

  // 6. Filas de datos
  for (let r = dataFStartRow; r <= dataFEndRow; r++) {
    const isEven = (r - dataFStartRow) % 2 === 0;
    const rowBg = isEven ? "FFFFFF" : "F8FAFC";
    const fItem = facturas[r - dataFStartRow];

    for (let c = 0; c < totalColsF; c++) {
      const colL = getColumnLetter(c);
      const cell = wsFacturas[`${colL}${r + 1}`];
      if (!cell) continue;

      const isMoney = c >= 10 && c <= 14;
      const isSaldo = c === 14;
      const isCenter = (c >= 6 && c <= 9) || c === 1 || c === 3 || c === 4;
      const isEstado = c === 15;
      const isMora = c === 16;

      let cellFontColor = "1E293B";
      let cellBg = rowBg;
      let isBold = false;

      if (isSaldo) {
        isBold = true;
        if ((cell.v as number) > 0) {
          cellFontColor = "BE123C";
        }
      } else if (c === 0) {
        isBold = true;
      }

      // Badges visuales para Estado y Mora
      if (isEstado) {
        isBold = true;
        const est = String(cell.v).toUpperCase();
        if (est === "PAGADA") {
          cellBg = "ECFDF5";
          cellFontColor = "047857";
        } else if (est === "PARCIAL") {
          cellBg = "EFF6FF";
          cellFontColor = "1E40AF";
        } else if (est === "PENDIENTE") {
          cellBg = "FFFBEB";
          cellFontColor = "B45309";
        } else if (est === "ANULADA") {
          cellBg = "F1F5F9";
          cellFontColor = "64748B";
        }
      }

      if (isMora) {
        isBold = true;
        const mora = fItem?.estado_mora;
        if (mora === "AL_DIA" || fItem?.estado === "PAGADA") {
          cellBg = "ECFDF5";
          cellFontColor = "047857";
        } else if (mora === "POR_VENCER") {
          cellBg = "EFF6FF";
          cellFontColor = "1E40AF";
        } else if (mora === "VENCIDA") {
          cellBg = "FFFBEB";
          cellFontColor = "92400E";
        } else if (mora === "CRITICA") {
          cellBg = "FFF1F2";
          cellFontColor = "BE123C";
        }
      }

      cell.s = {
        font: { name: "Calibri", sz: 9.5, bold: isBold, color: { rgb: cellFontColor } },
        fill: { fgColor: { rgb: cellBg } },
        alignment: {
          horizontal: isMoney ? "right" : isCenter || isEstado || isMora ? "center" : "left",
          vertical: "center",
        },
        border: {
          bottom: { style: "thin", color: { rgb: "E2E8F0" } },
          right: { style: "thin", color: { rgb: "E2E8F0" } },
        },
      };

      if (isMoney && typeof cell.v === "number") {
        cell.z = '"RD$ "#,##0.00';
      }
    }
  }

  // 7. Fila de Totales
  for (let c = 0; c < totalColsF; c++) {
    const colL = getColumnLetter(c);
    const cell = wsFacturas[`${colL}${totalFRowIdx + 1}`];
    if (!cell) continue;

    const isSaldo = c === 14;
    const isMoney = c >= 10 && c <= 14;

    cell.s = {
      font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: isSaldo ? "BE123C" : "0F172A" } },
      alignment: {
        horizontal: isMoney ? "right" : c === 2 ? "center" : "left",
        vertical: "center",
      },
      border: {
        top: { style: "thin", color: { rgb: "94A3B8" } },
        bottom: { style: "double", color: { rgb: "0F172A" } },
      },
    };

    if (isMoney && typeof cell.v === "number") {
      cell.z = '"RD$ "#,##0.00';
    }
  }

  // 8. Footer
  const fFoot = wsFacturas[`A${footerFRowIdx + 1}`];
  if (fFoot) {
    fFoot.s = {
      font: { name: "Calibri", sz: 8.5, italic: true, color: { rgb: "64748B" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }

  wsFacturas["!cols"] = [
    { wch: 32 }, // Suplidor
    { wch: 16 }, // RNC
    { wch: 16 }, // Factura
    { wch: 18 }, // NCF
    { wch: 14 }, // Tipo NCF
    { wch: 26 }, // Categoría
    { wch: 14 }, // Emisión
    { wch: 13 }, // Plazo
    { wch: 15 }, // Vencimiento
    { wch: 13 }, // Días Vencida
    { wch: 16 }, // Subtotal
    { wch: 15 }, // ITBIS
    { wch: 18 }, // Total
    { wch: 16 }, // Pagado
    { wch: 18 }, // Saldo
    { wch: 15 }, // Estado
    { wch: 18 }, // Mora
  ];

  XLSX.utils.book_append_sheet(wb, wsFacturas, "Facturas y CXP");

  // =========================================================================
  // HOJA 2: RESUMEN CONSOLIDADO POR SUPLIDOR
  // =========================================================================
  // Agrupar facturas por Suplidor
  interface SuplidorConsolidado {
    id: string;
    nombre: string;
    rnc: string;
    telefono: string;
    plazoDefault: number;
    limiteCredito: number;
    cantFacturas: number;
    totalFacturado: number;
    totalPagado: number;
    saldoPendiente: number;
    peorMora: "AL_DIA" | "POR_VENCER" | "VENCIDA" | "CRITICA" | "PAGADA";
  }

  const mapConsolidado = new Map<string, SuplidorConsolidado>();

  // Cargar primero catálogo de suplidores
  suplidores.forEach((s) => {
    mapConsolidado.set(s.id, {
      id: s.id,
      nombre: s.nombre_comercial || "Suplidor sin nombre",
      rnc: s.rnc_cedula || "N/D",
      telefono: s.telefono || "N/D",
      plazoDefault: s.dias_credito_default || 0,
      limiteCredito: s.limite_credito || 0,
      cantFacturas: 0,
      totalFacturado: 0,
      totalPagado: 0,
      saldoPendiente: 0,
      peorMora: "AL_DIA",
    });
  });

  // Sumarizar facturas
  facturas.forEach((f) => {
    const sId = f.suplidor_id || "desconocido";
    let entry = mapConsolidado.get(sId);
    if (!entry) {
      entry = {
        id: sId,
        nombre: f.suplidor?.nombre_comercial || "Suplidor General",
        rnc: f.suplidor?.rnc_cedula || "N/D",
        telefono: f.suplidor?.telefono || "N/D",
        plazoDefault: f.plazo_dias || 0,
        limiteCredito: 0,
        cantFacturas: 0,
        totalFacturado: 0,
        totalPagado: 0,
        saldoPendiente: 0,
        peorMora: "AL_DIA",
      };
      mapConsolidado.set(sId, entry);
    }

    entry.cantFacturas += 1;
    entry.totalFacturado += f.total || 0;
    entry.totalPagado += f.monto_pagado || 0;
    entry.saldoPendiente += f.saldo_pendiente || 0;

    // Calcular peor estado de mora para el suplidor
    if (f.saldo_pendiente > 0.01) {
      if (f.estado_mora === "CRITICA") entry.peorMora = "CRITICA";
      else if (f.estado_mora === "VENCIDA" && entry.peorMora !== "CRITICA") entry.peorMora = "VENCIDA";
      else if (f.estado_mora === "POR_VENCER" && entry.peorMora !== "CRITICA" && entry.peorMora !== "VENCIDA") entry.peorMora = "POR_VENCER";
    }
  });

  // Convertir a lista y ordenar por saldo pendiente descendente
  const listConsolidado = Array.from(mapConsolidado.values()).sort(
    (a, b) => b.saldoPendiente - a.saldoPendiente
  );

  const suplidoresConDeuda = listConsolidado.filter((s) => s.saldoPendiente > 0.01);
  const promedioDeuda = suplidoresConDeuda.length > 0 ? totalDeuda / suplidoresConDeuda.length : 0;

  const headersSuplidores = [
    "Proveedor / Empresa",
    "RNC / Cédula",
    "Teléfono",
    "Términos Crédito",
    "Límite Crédito (RD$)",
    "Cant. Facturas",
    "Total Facturado (RD$)",
    "Total Pagado (RD$)",
    "Saldo Pendiente (RD$)",
    "Estado de Cuenta",
    "Riesgo de Mora",
  ];
  const totalColsS = headersSuplidores.length; // 11 columnas (A hasta K)
  const aoaSuplidores: any[][] = [];

  // Fila 0: Banner
  aoaSuplidores.push(["KLYNN CLOUD POS — CONSOLIDADO DE CUENTAS POR PAGAR Y CRÉDITOS POR PROVEEDOR"]);

  // Fila 1: Subtítulo
  aoaSuplidores.push([
    `Empresa: ${tenantName}  |  RNC: ${tenantRnc}  |  Proveedores Totales: ${listConsolidado.length}  |  Proveedores con Deuda: ${suplidoresConDeuda.length}  |  Emisión: ${fechaGeneracion}`,
  ]);

  // Fila 2: Separador
  aoaSuplidores.push([]);

  // Filas 3-5: 4 KPI Cards de Proveedores
  const kpiSRow1: any[] = new Array(totalColsS).fill("");
  const kpiSRow2: any[] = new Array(totalColsS).fill("");
  const kpiSRow3: any[] = new Array(totalColsS).fill("");

  // Card 1: Cols A-B (0 to 1) -> Total Proveedores
  kpiSRow1[0] = "PROVEEDORES REGISTRADOS";
  kpiSRow2[0] = listConsolidado.length;
  kpiSRow3[0] = "Directorio comercial activo";

  // Card 2: Cols C-E (2 to 4) -> Proveedores con Deuda
  kpiSRow1[2] = "PROVEEDORES CON DEUDA";
  kpiSRow2[2] = suplidoresConDeuda.length;
  kpiSRow3[2] = `${listConsolidado.length - suplidoresConDeuda.length} Proveedores saldados o al día`;

  // Card 3: Cols F-H (5 to 7) -> Saldo Total CXP
  kpiSRow1[5] = "SALDO TOTAL POR PAGAR";
  kpiSRow2[5] = totalDeuda;
  kpiSRow3[5] = "Compromisos acumulados pendientes";

  // Card 4: Cols I-K (8 to 10) -> Promedio de Deuda
  kpiSRow1[8] = "PROMEDIO DEUDA / PROVEEDOR";
  kpiSRow2[8] = promedioDeuda;
  kpiSRow3[8] = "Entre proveedores con deuda abierta";

  aoaSuplidores.push(kpiSRow1);
  aoaSuplidores.push(kpiSRow2);
  aoaSuplidores.push(kpiSRow3);

  // Fila 6: Separador
  aoaSuplidores.push([]);

  // Fila 7: Título de Sección
  const sec2RowIdx = aoaSuplidores.length;
  aoaSuplidores.push(["2. BALANCE CONSOLIDADO Y ESTADO DE CRÉDITO POR PROVEEDOR"]);

  // Fila 8: Cabeceras
  const headerSRowIdx = aoaSuplidores.length;
  aoaSuplidores.push(headersSuplidores);

  // Filas de datos
  const dataSStartRow = aoaSuplidores.length;
  listConsolidado.forEach((s) => {
    let estadoCuenta = "AL DÍA";
    if (s.saldoPendiente > 0.01) {
      estadoCuenta = s.peorMora === "CRITICA" || s.peorMora === "VENCIDA" ? "EN MORA" : "CON DEUDA";
    }

    let riesgoLabel = "BAJO (AL DÍA)";
    if (s.peorMora === "POR_VENCER") riesgoLabel = "MEDIO (POR VENCER)";
    else if (s.peorMora === "VENCIDA") riesgoLabel = "ALTO (VENCIDO)";
    else if (s.peorMora === "CRITICA") riesgoLabel = "CRÍTICO (>30D)";

    aoaSuplidores.push([
      s.nombre,
      s.rnc,
      s.telefono,
      s.plazoDefault > 0 ? `${s.plazoDefault} días` : "Contado",
      s.limiteCredito || 0,
      s.cantFacturas,
      s.totalFacturado,
      s.totalPagado,
      s.saldoPendiente,
      estadoCuenta,
      riesgoLabel,
    ]);
  });
  const dataSEndRow = aoaSuplidores.length - 1;

  // Fila de Totales
  const totalSRowIdx = aoaSuplidores.length;
  aoaSuplidores.push([
    "TOTALES GENERALES",
    "",
    "",
    "",
    "",
    facturas.length,
    totalFacturado,
    totalPagado,
    totalDeuda,
    "",
    "",
  ]);

  // Footer
  aoaSuplidores.push([]);
  const footerSRowIdx = aoaSuplidores.length;
  aoaSuplidores.push([
    "Documento oficial emitido por Klynn Cloud POS · Consolidación de Carteras y Proveedores conforme a normativas de la DGII de la República Dominicana.",
  ]);

  const wsSuplidores = XLSX.utils.aoa_to_sheet(aoaSuplidores);

  // MERGES HOJA 2
  wsSuplidores["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalColsS - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: totalColsS - 1 } },

    // Tarjeta 1 (Cols 0-1)
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },

    // Tarjeta 2 (Cols 2-4)
    { s: { r: 3, c: 2 }, e: { r: 3, c: 4 } },
    { s: { r: 4, c: 2 }, e: { r: 4, c: 4 } },
    { s: { r: 5, c: 2 }, e: { r: 5, c: 4 } },

    // Tarjeta 3 (Cols 5-7)
    { s: { r: 3, c: 5 }, e: { r: 3, c: 7 } },
    { s: { r: 4, c: 5 }, e: { r: 4, c: 7 } },
    { s: { r: 5, c: 5 }, e: { r: 5, c: 7 } },

    // Tarjeta 4 (Cols 8-10)
    { s: { r: 3, c: 8 }, e: { r: 3, c: 10 } },
    { s: { r: 4, c: 8 }, e: { r: 4, c: 10 } },
    { s: { r: 5, c: 8 }, e: { r: 5, c: 10 } },

    // Título Sección
    { s: { r: sec2RowIdx, c: 0 }, e: { r: sec2RowIdx, c: totalColsS - 1 } },

    // Fila Totales (Cols 0-4)
    { s: { r: totalSRowIdx, c: 0 }, e: { r: totalSRowIdx, c: 4 } },

    // Footer
    { s: { r: footerSRowIdx, c: 0 }, e: { r: footerSRowIdx, c: totalColsS - 1 } },
  ];

  // ALTURAS DE FILAS HOJA 2
  const rowsSuplidores: any[] = [];
  rowsSuplidores[0] = { hpt: 32 };
  rowsSuplidores[1] = { hpt: 22 };
  rowsSuplidores[2] = { hpt: 10 };
  rowsSuplidores[3] = { hpt: 16 };
  rowsSuplidores[4] = { hpt: 24 };
  rowsSuplidores[5] = { hpt: 16 };
  rowsSuplidores[6] = { hpt: 10 };
  rowsSuplidores[sec2RowIdx] = { hpt: 22 };
  rowsSuplidores[headerSRowIdx] = { hpt: 26 };

  for (let r = dataSStartRow; r <= dataSEndRow; r++) {
    rowsSuplidores[r] = { hpt: 22 };
  }
  rowsSuplidores[totalSRowIdx] = { hpt: 26 };
  rowsSuplidores[footerSRowIdx] = { hpt: 18 };
  wsSuplidores["!rows"] = rowsSuplidores;

  // ESTILOS VISUALES HOJA 2
  const sTitle = wsSuplidores["A1"];
  if (sTitle) {
    sTitle.s = {
      font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1B4B73" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }

  const sSub = wsSuplidores["A2"];
  if (sSub) {
    sSub.s = {
      font: { name: "Calibri", sz: 9.5, bold: true, color: { rgb: "1E293B" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: { bottom: { style: "thin", color: { rgb: "CBD5E1" } } },
    };
  }

  // Tarjetas KPI Hoja 2
  const kpiSConfigs = [
    { startCol: 0, endCol: 1, bg: "EFF6FF", textCol: "1B4B73", valCol: "1E40AF", barCol: "1B4B73", isMoney: false },
    { startCol: 2, endCol: 4, bg: "FFFBEB", textCol: "92400E", valCol: "B45309", barCol: "D97706", isMoney: false },
    { startCol: 5, endCol: 7, bg: "FFF1F2", textCol: "9F1239", valCol: "BE123C", barCol: "BE123C", isMoney: true },
    { startCol: 8, endCol: 10, bg: "ECFDF5", textCol: "065F46", valCol: "047857", barCol: "047857", isMoney: true },
  ];

  kpiSConfigs.forEach((kpi) => {
    for (let c = kpi.startCol; c <= kpi.endCol; c++) {
      const colL = getColumnLetter(c);

      const cTitle = wsSuplidores[`${colL}4`];
      if (cTitle) {
        cTitle.s = {
          font: { name: "Calibri", sz: 9, bold: true, color: { rgb: kpi.textCol } },
          fill: { fgColor: { rgb: kpi.bg } },
          alignment: { horizontal: "center", vertical: "center" },
          border: { top: { style: "thin", color: { rgb: "CBD5E1" } } },
        };
      }

      const cVal = wsSuplidores[`${colL}5`];
      if (cVal) {
        cVal.s = {
          font: { name: "Calibri", sz: 14, bold: true, color: { rgb: kpi.valCol } },
          fill: { fgColor: { rgb: kpi.bg } },
          alignment: { horizontal: "center", vertical: "center" },
        };
        if (kpi.isMoney && typeof cVal.v === "number") {
          cVal.z = '"RD$ "#,##0.00';
        }
      }

      const cNote = wsSuplidores[`${colL}6`];
      if (cNote) {
        cNote.s = {
          font: { name: "Calibri", sz: 8.5, italic: true, color: { rgb: kpi.textCol } },
          fill: { fgColor: { rgb: kpi.bg } },
          alignment: { horizontal: "center", vertical: "center" },
          border: { bottom: { style: "medium", color: { rgb: kpi.barCol } } },
        };
      }
    }
  });

  // Título Sección 2
  const sec2Cell = wsSuplidores[`A${sec2RowIdx + 1}`];
  if (sec2Cell) {
    sec2Cell.s = {
      font: { name: "Calibri", sz: 10.5, bold: true, color: { rgb: "1B4B73" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { horizontal: "left", vertical: "center" },
      border: {
        top: { style: "medium", color: { rgb: "1B4B73" } },
        bottom: { style: "thin", color: { rgb: "CBD5E1" } },
      },
    };
  }

  // Headers Hoja 2
  headersSuplidores.forEach((_, cIdx) => {
    const colL = getColumnLetter(cIdx);
    const cell = wsSuplidores[`${colL}${headerSRowIdx + 1}`];
    if (cell) {
      const isSaldo = cIdx === 8;
      const isPagado = cIdx === 7;
      const isProveedor = cIdx === 0;

      cell.s = {
        font: { name: "Calibri", sz: 9.5, bold: true, color: { rgb: "FFFFFF" } },
        fill: {
          fgColor: {
            rgb: isSaldo ? "BE123C" : isPagado ? "047857" : isProveedor ? "0F172A" : "1B4B73",
          },
        },
        alignment: {
          horizontal: cIdx >= 4 && cIdx <= 8 ? "right" : cIdx >= 1 && cIdx <= 3 ? "center" : cIdx >= 9 ? "center" : "left",
          vertical: "center",
          wrapText: true,
        },
        border: {
          top: { style: "thin", color: { rgb: "CBD5E1" } },
          bottom: { style: "medium", color: { rgb: isSaldo ? "9F1239" : "0F172A" } },
        },
      };
    }
  });

  // Datos Hoja 2
  for (let r = dataSStartRow; r <= dataSEndRow; r++) {
    const isEven = (r - dataSStartRow) % 2 === 0;
    const rowBg = isEven ? "FFFFFF" : "F8FAFC";
    const itemS = listConsolidado[r - dataSStartRow];

    for (let c = 0; c < totalColsS; c++) {
      const colL = getColumnLetter(c);
      const cell = wsSuplidores[`${colL}${r + 1}`];
      if (!cell) continue;

      const isMoney = c === 4 || (c >= 6 && c <= 8);
      const isSaldo = c === 8;
      const isCenter = c === 1 || c === 2 || c === 3 || c === 5;
      const isEstado = c === 9;
      const isRiesgo = c === 10;

      let cellFontColor = "1E293B";
      let cellBg = rowBg;
      let isBold = false;

      if (isSaldo) {
        isBold = true;
        if ((cell.v as number) > 0) {
          cellFontColor = "BE123C";
        }
      } else if (c === 0) {
        isBold = true;
      }

      if (isEstado) {
        isBold = true;
        if (cell.v === "AL DÍA") {
          cellBg = "ECFDF5";
          cellFontColor = "047857";
        } else if (cell.v === "CON DEUDA") {
          cellBg = "EFF6FF";
          cellFontColor = "1E40AF";
        } else if (cell.v === "EN MORA") {
          cellBg = "FFF1F2";
          cellFontColor = "BE123C";
        }
      }

      if (isRiesgo) {
        isBold = true;
        if (itemS?.peorMora === "AL_DIA" || itemS?.saldoPendiente <= 0.01) {
          cellBg = "ECFDF5";
          cellFontColor = "047857";
        } else if (itemS?.peorMora === "POR_VENCER") {
          cellBg = "EFF6FF";
          cellFontColor = "1E40AF";
        } else if (itemS?.peorMora === "VENCIDA") {
          cellBg = "FFFBEB";
          cellFontColor = "92400E";
        } else if (itemS?.peorMora === "CRITICA") {
          cellBg = "FFF1F2";
          cellFontColor = "BE123C";
        }
      }

      cell.s = {
        font: { name: "Calibri", sz: 9.5, bold: isBold, color: { rgb: cellFontColor } },
        fill: { fgColor: { rgb: cellBg } },
        alignment: {
          horizontal: isMoney ? "right" : isCenter || isEstado || isRiesgo ? "center" : "left",
          vertical: "center",
        },
        border: {
          bottom: { style: "thin", color: { rgb: "E2E8F0" } },
          right: { style: "thin", color: { rgb: "E2E8F0" } },
        },
      };

      if (isMoney && typeof cell.v === "number") {
        cell.z = '"RD$ "#,##0.00';
      }
    }
  }

  // Fila Totales Hoja 2
  for (let c = 0; c < totalColsS; c++) {
    const colL = getColumnLetter(c);
    const cell = wsSuplidores[`${colL}${totalSRowIdx + 1}`];
    if (!cell) continue;

    const isSaldo = c === 8;
    const isMoney = c >= 6 && c <= 8;

    cell.s = {
      font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: isSaldo ? "BE123C" : "0F172A" } },
      alignment: {
        horizontal: isMoney ? "right" : c === 5 ? "center" : "left",
        vertical: "center",
      },
      border: {
        top: { style: "thin", color: { rgb: "94A3B8" } },
        bottom: { style: "double", color: { rgb: "0F172A" } },
      },
    };

    if (isMoney && typeof cell.v === "number") {
      cell.z = '"RD$ "#,##0.00';
    }
  }

  // Footer Hoja 2
  const sFoot = wsSuplidores[`A${footerSRowIdx + 1}`];
  if (sFoot) {
    sFoot.s = {
      font: { name: "Calibri", sz: 8.5, italic: true, color: { rgb: "64748B" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }

  wsSuplidores["!cols"] = [
    { wch: 32 }, // Proveedor
    { wch: 16 }, // RNC
    { wch: 16 }, // Teléfono
    { wch: 16 }, // Plazo
    { wch: 18 }, // Límite Crédito
    { wch: 14 }, // Cant. Facturas
    { wch: 18 }, // Facturado
    { wch: 18 }, // Pagado
    { wch: 20 }, // Saldo Pendiente
    { wch: 16 }, // Estado Cuenta
    { wch: 22 }, // Riesgo Mora
  ];

  XLSX.utils.book_append_sheet(wb, wsSuplidores, "Resumen por Suplidor");

  // =========================================================================
  // HOJA 3: ANTIGÜEDAD DE SALDOS Y MORA (AGING REPORT)
  // =========================================================================
  const headersMora = [
    "Rango de Antigüedad",
    "Facturas Pendientes",
    "Monto en Deuda (RD$)",
    "% de la Cartera Total",
    "Nivel de Riesgo",
    "Acción Recomendada de Tesorería",
  ];
  const totalColsM = headersMora.length; // 6 columnas (A hasta F)
  const aoaMora: any[][] = [];

  // Fila 0: Banner
  aoaMora.push(["KLYNN CLOUD POS — ANÁLISIS DE VENCIMIENTOS Y ANTIGÜEDAD DE SALDOS (AGING REPORT)"]);

  // Fila 1: Subtítulo
  aoaMora.push([
    `Empresa: ${tenantName}  |  RNC: ${tenantRnc}  |  Cartera Total CXP: RD$ ${totalDeuda.toLocaleString("es-DO", { minimumFractionDigits: 2 })}  |  Emisión: ${fechaGeneracion}`,
  ]);

  // Fila 2: Separador
  aoaMora.push([]);

  // Filas 3-5: 4 KPI Cards de Aging
  const kpiMRow1: any[] = new Array(totalColsM).fill("");
  const kpiMRow2: any[] = new Array(totalColsM).fill("");
  const kpiMRow3: any[] = new Array(totalColsM).fill("");

  // Card 1: Col A (0) -> Al Día
  kpiMRow1[0] = "AL DÍA (CORRIENTE)";
  kpiMRow2[0] = montoAlDia;
  kpiMRow3[0] = `${facturasAlDia.length} Facturas en fecha`;

  // Card 2: Col B (1) -> Por Vencer
  kpiMRow1[1] = "POR VENCER (≤ 7 DÍAS)";
  kpiMRow2[1] = montoPorVencer;
  kpiMRow3[1] = `${facturasPorVencer.length} Facturas próximas a vencer`;

  // Card 3: Cols C-D (2 to 3) -> Vencidas 1-30d
  kpiMRow1[2] = "VENCIDAS (1 A 30 DÍAS)";
  kpiMRow2[2] = montoVencidas;
  kpiMRow3[2] = `${facturasVencidas.length} Facturas en mora temprana`;

  // Card 4: Cols E-F (4 to 5) -> Mora Crítica >30d
  kpiMRow1[4] = "MORA CRÍTICA (> 30 DÍAS)";
  kpiMRow2[4] = montoCriticas;
  kpiMRow3[4] = `${facturasCriticas.length} Facturas en riesgo legal/corte`;

  aoaMora.push(kpiMRow1);
  aoaMora.push(kpiMRow2);
  aoaMora.push(kpiMRow3);

  // Fila 6: Separador
  aoaMora.push([]);

  // Fila 7: Título de Sección
  const sec3RowIdx = aoaMora.length;
  aoaMora.push(["3. DISTRIBUCIÓN POR RANGOS DE ANTIGÜEDAD Y EVALUACIÓN DE RIESGO DE TESORERÍA"]);

  // Fila 8: Cabeceras
  const headerMRowIdx = aoaMora.length;
  aoaMora.push(headersMora);

  // Filas de datos de la tabla Aging
  const agingData = [
    {
      rango: "Corriente / Al Día (0 días de atraso)",
      cant: facturasAlDia.length,
      monto: montoAlDia,
      pct: totalDeuda > 0 ? montoAlDia / totalDeuda : 0,
      riesgo: "MÍNIMO",
      accion: "Mantener en calendario normal de pagos programados",
      color: "047857",
      bg: "ECFDF5",
    },
    {
      rango: "Próximo a Vencer (1 a 7 días por vencer)",
      cant: facturasPorVencer.length,
      monto: montoPorVencer,
      pct: totalDeuda > 0 ? montoPorVencer / totalDeuda : 0,
      riesgo: "MODERADO",
      accion: "Programar fondos en flujo de caja para evitar moras",
      color: "1E40AF",
      bg: "EFF6FF",
    },
    {
      rango: "Vencimiento Reciente (1 a 30 días vencido)",
      cant: facturasVencidas.length,
      monto: montoVencidas,
      pct: totalDeuda > 0 ? montoVencidas / totalDeuda : 0,
      riesgo: "ALTO",
      accion: "Contactar suplidor para coordinar abonos inmediatos",
      color: "B45309",
      bg: "FFFBEB",
    },
    {
      rango: "Mora Crítica (> 30 días vencido)",
      cant: facturasCriticas.length,
      monto: montoCriticas,
      pct: totalDeuda > 0 ? montoCriticas / totalDeuda : 0,
      riesgo: "CRÍTICO",
      accion: "Pago urgente prioritario para restablecer despacho de insumos",
      color: "BE123C",
      bg: "FFF1F2",
    },
  ];

  const dataMStartRow = aoaMora.length;
  agingData.forEach((item) => {
    aoaMora.push([
      item.rango,
      item.cant,
      item.monto,
      item.pct,
      item.riesgo,
      item.accion,
    ]);
  });
  const dataMEndRow = aoaMora.length - 1;

  // Fila de Totales de Aging
  const totalMRowIdx = aoaMora.length;
  aoaMora.push([
    "TOTAL CARTERA PENDIENTE",
    facturasPendientes.length,
    totalDeuda,
    1.0,
    "-",
    "Gestión integral de tesorería y cuentas por pagar",
  ]);

  // Espacio y Segunda Subsección: Top Facturas con Mayor Mora
  aoaMora.push([]);
  const sec3BRowIdx = aoaMora.length;
  aoaMora.push(["3.1 TOP FACTURAS PENDIENTES CON MAYOR ATRASO (PRIORIDAD DE PAGO)"]);

  const headersTopMora = [
    "Suplidor",
    "No. Factura",
    "e-NCF",
    "Fecha Emisión",
    "Fecha Vencimiento",
    "Días Vencida",
    "Saldo Pendiente (RD$)",
    "Estado Mora",
  ];
  const totalColsTop = headersTopMora.length; // 8 columnas
  const headerTopRowIdx = aoaMora.length;
  aoaMora.push(headersTopMora);

  // Ordenar facturas pendientes por días vencida descendente
  const topMoraFacturas = [...facturasPendientes]
    .sort((a, b) => (Number(b.dias_vencida) || 0) - (Number(a.dias_vencida) || 0))
    .slice(0, 15);

  const dataTopStartRow = aoaMora.length;
  topMoraFacturas.forEach((f) => {
    const dias = Number(f.dias_vencida) || 0;
    let moraBadge = "AL DÍA";
    if (f.estado_mora === "CRITICA") moraBadge = `CRÍTICA (${dias}D)`;
    else if (f.estado_mora === "VENCIDA") moraBadge = `VENCIDA (${dias}D)`;
    else if (f.estado_mora === "POR_VENCER") moraBadge = "POR VENCER";

    aoaMora.push([
      f.suplidor?.nombre_comercial || "Suplidor General",
      f.numero_factura || "S/N",
      f.ncf || "SIN NCF",
      formatFecha(f.fecha_emision),
      formatFecha(f.fecha_vencimiento),
      dias,
      f.saldo_pendiente || 0,
      moraBadge,
    ]);
  });
  const dataTopEndRow = aoaMora.length - 1;

  // Footer Hoja 3
  aoaMora.push([]);
  const footerMRowIdx = aoaMora.length;
  aoaMora.push([
    "Documento oficial emitido por Klynn Cloud POS · Reporte Estratégico de Antigüedad y Tesorería conforme a mejores prácticas contables y fiscales de la República Dominicana.",
  ]);

  const wsMora = XLSX.utils.aoa_to_sheet(aoaMora);

  // MERGES HOJA 3
  wsMora["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalColsTop - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: totalColsTop - 1 } },

    // Tarjeta 1 (Col 0)
    { s: { r: 3, c: 0 }, e: { r: 3, c: 0 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 0 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 0 } },

    // Tarjeta 2 (Col 1)
    { s: { r: 3, c: 1 }, e: { r: 3, c: 1 } },
    { s: { r: 4, c: 1 }, e: { r: 4, c: 1 } },
    { s: { r: 5, c: 1 }, e: { r: 5, c: 1 } },

    // Tarjeta 3 (Cols 2-3)
    { s: { r: 3, c: 2 }, e: { r: 3, c: 3 } },
    { s: { r: 4, c: 2 }, e: { r: 4, c: 3 } },
    { s: { r: 5, c: 2 }, e: { r: 5, c: 3 } },

    // Tarjeta 4 (Cols 4-7)
    { s: { r: 3, c: 4 }, e: { r: 3, c: totalColsTop - 1 } },
    { s: { r: 4, c: 4 }, e: { r: 4, c: totalColsTop - 1 } },
    { s: { r: 5, c: 4 }, e: { r: 5, c: totalColsTop - 1 } },

    // Título Sección 3
    { s: { r: sec3RowIdx, c: 0 }, e: { r: sec3RowIdx, c: totalColsTop - 1 } },

    // Título Sección 3.1
    { s: { r: sec3BRowIdx, c: 0 }, e: { r: sec3BRowIdx, c: totalColsTop - 1 } },

    // Footer
    { s: { r: footerMRowIdx, c: 0 }, e: { r: footerMRowIdx, c: totalColsTop - 1 } },
  ];

  // ALTURAS DE FILAS HOJA 3
  const rowsMora: any[] = [];
  rowsMora[0] = { hpt: 32 };
  rowsMora[1] = { hpt: 22 };
  rowsMora[2] = { hpt: 10 };
  rowsMora[3] = { hpt: 16 };
  rowsMora[4] = { hpt: 24 };
  rowsMora[5] = { hpt: 16 };
  rowsMora[6] = { hpt: 10 };
  rowsMora[sec3RowIdx] = { hpt: 22 };
  rowsMora[headerMRowIdx] = { hpt: 26 };

  for (let r = dataMStartRow; r <= dataMEndRow; r++) {
    rowsMora[r] = { hpt: 24 };
  }
  rowsMora[totalMRowIdx] = { hpt: 26 };
  rowsMora[sec3BRowIdx] = { hpt: 22 };
  rowsMora[headerTopRowIdx] = { hpt: 26 };

  for (let r = dataTopStartRow; r <= dataTopEndRow; r++) {
    rowsMora[r] = { hpt: 22 };
  }
  rowsMora[footerMRowIdx] = { hpt: 18 };
  wsMora["!rows"] = rowsMora;

  // ESTILOS VISUALES HOJA 3
  const mTitle = wsMora["A1"];
  if (mTitle) {
    mTitle.s = {
      font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1B4B73" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }

  const mSub = wsMora["A2"];
  if (mSub) {
    mSub.s = {
      font: { name: "Calibri", sz: 9.5, bold: true, color: { rgb: "1E293B" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: { bottom: { style: "thin", color: { rgb: "CBD5E1" } } },
    };
  }

  // Tarjetas KPI Hoja 3
  const kpiMConfigs = [
    { startCol: 0, endCol: 0, bg: "ECFDF5", textCol: "065F46", valCol: "047857", barCol: "047857" },
    { startCol: 1, endCol: 1, bg: "EFF6FF", textCol: "1B4B73", valCol: "1E40AF", barCol: "1B4B73" },
    { startCol: 2, endCol: 3, bg: "FFFBEB", textCol: "92400E", valCol: "B45309", barCol: "D97706" },
    { startCol: 4, endCol: totalColsTop - 1, bg: "FFF1F2", textCol: "9F1239", valCol: "BE123C", barCol: "BE123C" },
  ];

  kpiMConfigs.forEach((kpi) => {
    for (let c = kpi.startCol; c <= kpi.endCol; c++) {
      const colL = getColumnLetter(c);

      const cTitle = wsMora[`${colL}4`];
      if (cTitle) {
        cTitle.s = {
          font: { name: "Calibri", sz: 9, bold: true, color: { rgb: kpi.textCol } },
          fill: { fgColor: { rgb: kpi.bg } },
          alignment: { horizontal: "center", vertical: "center" },
          border: { top: { style: "thin", color: { rgb: "CBD5E1" } } },
        };
      }

      const cVal = wsMora[`${colL}5`];
      if (cVal) {
        cVal.s = {
          font: { name: "Calibri", sz: 14, bold: true, color: { rgb: kpi.valCol } },
          fill: { fgColor: { rgb: kpi.bg } },
          alignment: { horizontal: "center", vertical: "center" },
        };
        if (typeof cVal.v === "number") {
          cVal.z = '"RD$ "#,##0.00';
        }
      }

      const cNote = wsMora[`${colL}6`];
      if (cNote) {
        cNote.s = {
          font: { name: "Calibri", sz: 8.5, italic: true, color: { rgb: kpi.textCol } },
          fill: { fgColor: { rgb: kpi.bg } },
          alignment: { horizontal: "center", vertical: "center" },
          border: { bottom: { style: "medium", color: { rgb: kpi.barCol } } },
        };
      }
    }
  });

  // Títulos Secciones 3 y 3.1
  [sec3RowIdx, sec3BRowIdx].forEach((idx) => {
    const sCell = wsMora[`A${idx + 1}`];
    if (sCell) {
      sCell.s = {
        font: { name: "Calibri", sz: 10.5, bold: true, color: { rgb: "1B4B73" } },
        fill: { fgColor: { rgb: "F1F5F9" } },
        alignment: { horizontal: "left", vertical: "center" },
        border: {
          top: { style: "medium", color: { rgb: "1B4B73" } },
          bottom: { style: "thin", color: { rgb: "CBD5E1" } },
        },
      };
    }
  });

  // Cabeceras Tabla Aging (Fila 8)
  headersMora.forEach((_, cIdx) => {
    const colL = getColumnLetter(cIdx);
    const cell = wsMora[`${colL}${headerMRowIdx + 1}`];
    if (cell) {
      cell.s = {
        font: { name: "Calibri", sz: 9.5, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: cIdx === 2 ? "BE123C" : "1B4B73" } },
        alignment: {
          horizontal: cIdx === 1 || cIdx === 4 ? "center" : cIdx === 2 || cIdx === 3 ? "right" : "left",
          vertical: "center",
          wrapText: true,
        },
        border: {
          top: { style: "thin", color: { rgb: "CBD5E1" } },
          bottom: { style: "medium", color: { rgb: "0F172A" } },
        },
      };
    }
  });

  // Filas de Datos Aging
  agingData.forEach((item, idx) => {
    const r = dataMStartRow + idx;
    for (let c = 0; c < totalColsM; c++) {
      const colL = getColumnLetter(c);
      const cell = wsMora[`${colL}${r + 1}`];
      if (!cell) continue;

      const isMoney = c === 2;
      const isPct = c === 3;
      const isRiesgo = c === 4;

      let fontCol = "1E293B";
      let bg = idx % 2 === 0 ? "FFFFFF" : "F8FAFC";
      let isBold = c === 0 || c === 2;

      if (isRiesgo) {
        isBold = true;
        bg = item.bg;
        fontCol = item.color;
      }

      cell.s = {
        font: { name: "Calibri", sz: 9.5, bold: isBold, color: { rgb: fontCol } },
        fill: { fgColor: { rgb: bg } },
        alignment: {
          horizontal: isMoney || isPct ? "right" : c === 1 || isRiesgo ? "center" : "left",
          vertical: "center",
        },
        border: {
          bottom: { style: "thin", color: { rgb: "E2E8F0" } },
          right: { style: "thin", color: { rgb: "E2E8F0" } },
        },
      };

      if (isMoney && typeof cell.v === "number") {
        cell.z = '"RD$ "#,##0.00';
      }
      if (isPct && typeof cell.v === "number") {
        cell.z = "0.0%";
      }
    }
  });

  // Totales Aging
  for (let c = 0; c < totalColsM; c++) {
    const colL = getColumnLetter(c);
    const cell = wsMora[`${colL}${totalMRowIdx + 1}`];
    if (!cell) continue;

    cell.s = {
      font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: c === 2 ? "BE123C" : "0F172A" } },
      alignment: {
        horizontal: c === 2 || c === 3 ? "right" : c === 1 || c === 4 ? "center" : "left",
        vertical: "center",
      },
      border: {
        top: { style: "thin", color: { rgb: "94A3B8" } },
        bottom: { style: "double", color: { rgb: "0F172A" } },
      },
    };

    if (c === 2 && typeof cell.v === "number") {
      cell.z = '"RD$ "#,##0.00';
    }
    if (c === 3 && typeof cell.v === "number") {
      cell.z = "0.0%";
    }
  }

  // Cabeceras Subsección Top Mora
  headersTopMora.forEach((_, cIdx) => {
    const colL = getColumnLetter(cIdx);
    const cell = wsMora[`${colL}${headerTopRowIdx + 1}`];
    if (cell) {
      cell.s = {
        font: { name: "Calibri", sz: 9.5, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: cIdx === 6 ? "BE123C" : cIdx === 0 ? "0F172A" : "1B4B73" } },
        alignment: {
          horizontal: cIdx === 6 ? "right" : cIdx >= 3 && cIdx <= 5 ? "center" : cIdx === 7 ? "center" : "left",
          vertical: "center",
        },
        border: {
          top: { style: "thin", color: { rgb: "CBD5E1" } },
          bottom: { style: "medium", color: { rgb: "0F172A" } },
        },
      };
    }
  });

  // Filas de Datos Top Mora
  for (let r = dataTopStartRow; r <= dataTopEndRow; r++) {
    const isEven = (r - dataTopStartRow) % 2 === 0;
    const rowBg = isEven ? "FFFFFF" : "F8FAFC";
    const topItem = topMoraFacturas[r - dataTopStartRow];

    for (let c = 0; c < totalColsTop; c++) {
      const colL = getColumnLetter(c);
      const cell = wsMora[`${colL}${r + 1}`];
      if (!cell) continue;

      const isSaldo = c === 6;
      const isMora = c === 7;
      const isCenter = (c >= 3 && c <= 5) || c === 2;

      let fontCol = "1E293B";
      let bg = rowBg;
      let isBold = c === 0 || isSaldo;

      if (isSaldo) {
        fontCol = "BE123C";
      }

      if (isMora) {
        isBold = true;
        if (topItem?.estado_mora === "CRITICA") {
          bg = "FFF1F2";
          fontCol = "BE123C";
        } else if (topItem?.estado_mora === "VENCIDA") {
          bg = "FFFBEB";
          fontCol = "92400E";
        } else if (topItem?.estado_mora === "POR_VENCER") {
          bg = "EFF6FF";
          fontCol = "1E40AF";
        } else {
          bg = "ECFDF5";
          fontCol = "047857";
        }
      }

      cell.s = {
        font: { name: "Calibri", sz: 9.5, bold: isBold, color: { rgb: fontCol } },
        fill: { fgColor: { rgb: bg } },
        alignment: {
          horizontal: isSaldo ? "right" : isCenter || isMora ? "center" : "left",
          vertical: "center",
        },
        border: {
          bottom: { style: "thin", color: { rgb: "E2E8F0" } },
          right: { style: "thin", color: { rgb: "E2E8F0" } },
        },
      };

      if (isSaldo && typeof cell.v === "number") {
        cell.z = '"RD$ "#,##0.00';
      }
    }
  }

  // Footer Hoja 3
  const mFoot = wsMora[`A${footerMRowIdx + 1}`];
  if (mFoot) {
    mFoot.s = {
      font: { name: "Calibri", sz: 8.5, italic: true, color: { rgb: "64748B" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }

  wsMora["!cols"] = [
    { wch: 32 }, // Rango / Suplidor
    { wch: 20 }, // Cant / Factura
    { wch: 24 }, // Monto / NCF
    { wch: 22 }, // % / Emisión
    { wch: 20 }, // Riesgo / Vencimiento
    { wch: 45 }, // Acción / Días
    { wch: 22 }, // Saldo Pendiente
    { wch: 20 }, // Estado Mora
  ];

  XLSX.utils.book_append_sheet(wb, wsMora, "Antigüedad y Mora");

  // =========================================================================
  // EXPORTAR ARCHIVO EXCEL
  // =========================================================================
  const sanitizedName = tenantName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `Reporte_CXP_${sanitizedName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
