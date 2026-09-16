import XLSX from "xlsx-js-style";

export interface StatsReportExport {
  totalVentas: number;
  totalITBIS: number;
  totalGastos: number;
  rentabilidad: number;
  ticketPromedio: number;
  totalDeuda: number;
  totalAbonado: number;
  totalAbonosCaja: number;
  totalPiezas: number;
  totalLibras: number;
  porMetodo: Record<string, number>;
  porCategoria: Record<string, number>;
  porEstado: Record<string, number>;
  topServicios: { 
    name: string; 
    count: number; 
    total: number;
    totalPrendas?: number;
    rankingPrendas?: { name: string; count: number; total: number; pct?: number }[];
  }[];
  topPrendas: { 
    name: string; 
    count: number; 
    total: number;
    rankingServicios?: { name: string; count: number; total: number; pct?: number }[];
  }[];
  ordsDomicilio?: number;
  ordsLocal?: number;
  pctDomicilio?: number;
  pctLocal?: number;
  ordsUrgentes?: number;
  pctUrgencia?: number;
  cantidadDeudas?: number;
}

export interface ExportReportesOptions {
  stats: StatsReportExport;
  ordenesCount: number;
  gastosCount: number;
  empleados?: any[];
  ordenes?: any[];
  tenantName?: string;
}

export interface ExportFacturasOptions {
  periodOrdenes: any[];
  rncEmisor: string;
  exportYear: string;
  exportMonth: string;
  clientes?: any[];
  rawEcfDocs?: any[];
  tenantName?: string;
}

const MESES_NOMBRES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function getColumnLetter(colIndex: number): string {
  let letter = "";
  let temp = colIndex;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

const borderThin = {
  top: { style: "thin", color: { rgb: "E2E8F0" } },
  bottom: { style: "thin", color: { rgb: "E2E8F0" } },
  left: { style: "thin", color: { rgb: "E2E8F0" } },
  right: { style: "thin", color: { rgb: "E2E8F0" } },
};

/**
 * Exporta el reporte integral de Rendimiento y Estadísticas de Klynn POS
 * en un libro Excel (.xlsx) con pestañas organizadas, tarjetas KPI y formato contable.
 */
export function exportReportesRendimientoToExcel(options: ExportReportesOptions) {
  const {
    stats,
    ordenesCount,
    gastosCount,
    empleados = [],
    ordenes = [],
    tenantName = "Klynn Lavandería",
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

  // ==========================================
  // HOJA 1: RESUMEN FINANCIERO Y KPIS
  // ==========================================
  const aoa1: any[][] = [];

  // Fila 0: Banner Principal
  aoa1.push(["KLYNN CLOUD POS — REPORTE GENERAL DE RENDIMIENTO Y ESTADÍSTICAS"]);

  // Fila 1: Subtítulo
  aoa1.push([
    `Empresa: ${tenantName}  |  Emisión: ${fechaEmision}  |  Órdenes: ${ordenesCount}  |  Gastos: ${gastosCount}`,
  ]);

  // Fila 2: Espacio
  aoa1.push([]);

  // Filas 3-5: Tarjetas KPI Ejecutivas
  aoa1.push([
    "INGRESOS TOTALES",
    "",
    "GASTOS TOTALES",
    "",
    "RENTABILIDAD NETA",
    "",
    "TICKET PROMEDIO",
    "",
  ]);

  aoa1.push([
    stats.totalVentas,
    "",
    stats.totalGastos,
    "",
    stats.rentabilidad,
    "",
    stats.ticketPromedio,
    "",
  ]);

  aoa1.push([
    `${ordenesCount} órdenes facturadas`,
    "",
    `${gastosCount} registros de egreso`,
    "",
    stats.rentabilidad >= 0 ? "Margen operativo favorable" : "Déficit operativo",
    "",
    "Promedio por orden",
    "",
  ]);

  aoa1.push([]);

  // Fila 7: Título de Sección 1
  aoa1.push(["INDICADORES CLAVE DE GESTIÓN (KPIs)", "", "", ""]);

  // Fila 8: Encabezados de Tabla de Indicadores
  aoa1.push(["Indicador / Métrica", "Categoría", "Valor Registrado", "Detalle / Contexto"]);

  const kpis = [
    {
      nombre: "Ventas Brutas Facturadas",
      cat: "Finanzas",
      val: stats.totalVentas,
      tipo: "money",
      nota: "Total neto comercial facturado",
    },
    {
      nombre: "Gastos y Egresos Operativos",
      cat: "Finanzas",
      val: stats.totalGastos,
      tipo: "money",
      nota: "Gastos manuales + caja chica",
    },
    {
      nombre: "Beneficio Neto Operativo",
      cat: "Finanzas",
      val: stats.rentabilidad,
      tipo: "money",
      nota: "Ventas netas menos egresos",
    },
    {
      nombre: "ITBIS Recaudado / Generado",
      cat: "Fiscal",
      val: stats.totalITBIS,
      tipo: "money",
      nota: "Total ITBIS para declaración DGII",
    },
    {
      nombre: "Ticket Promedio",
      cat: "Ventas",
      val: stats.ticketPromedio,
      tipo: "money",
      nota: "Facturación media por cada orden",
    },
    {
      nombre: "Cuentas por Cobrar (Deuda de Clientes)",
      cat: "Créditos",
      val: stats.totalDeuda,
      tipo: "money",
      nota: `${stats.cantidadDeudas || 0} órdenes con saldo pendiente`,
    },
    {
      nombre: "Abonos Registrados",
      cat: "Cobros",
      val: stats.totalAbonado + stats.totalAbonosCaja,
      tipo: "money",
      nota: "Abonos parciales en caja y órdenes",
    },
    {
      nombre: "Prendas por Pieza Procesadas",
      cat: "Producción",
      val: stats.totalPiezas,
      tipo: "number",
      nota: "Total de prendas lavadas por unidad",
    },
    {
      nombre: "Prendas por Libra Procesadas",
      cat: "Producción",
      val: stats.totalLibras,
      tipo: "decimal",
      nota: "Total de libras procesadas",
    },
    {
      nombre: "Órdenes con Entrega a Domicilio",
      cat: "Logística",
      val: `${stats.ordsDomicilio || 0} (${stats.pctDomicilio || 0}%)`,
      tipo: "text",
      nota: `${stats.ordsLocal || 0} órdenes retiradas en local`,
    },
    {
      nombre: "Tasa de Órdenes Urgentes",
      cat: "Operación",
      val: `${stats.ordsUrgentes || 0} (${stats.pctUrgencia || 0}%)`,
      tipo: "text",
      nota: "Servicios con recargo o prioridad urgente",
    },
  ];

  kpis.forEach((k) => {
    aoa1.push([k.nombre, k.cat, k.val, k.nota]);
  });

  aoa1.push([]);

  // Sección 2: Desglose por Formas de Pago
  const pagoStartRow = aoa1.length;
  aoa1.push(["DISTRIBUCIÓN POR FORMAS DE PAGO", "", "", ""]);
  aoa1.push(["Método de Pago", "Monto Recaudado (RD$)", "% de Participación", ""]);

  const totalMetodos = Object.values(stats.porMetodo).reduce((s, v) => s + v, 0) || 1;
  const metodosEntries = Object.entries(stats.porMetodo).sort((a, b) => b[1] - a[1]);

  metodosEntries.forEach(([metodo, monto]) => {
    const pct = monto / totalMetodos;
    aoa1.push([metodo.replace(/_/g, " "), monto, pct, ""]);
  });

  aoa1.push(["TOTAL COBRADO POR FORMAS DE PAGO", totalMetodos, 1.0, ""]);
  aoa1.push([]);

  // Sección 3: Estado de las Órdenes
  const estadoStartRow = aoa1.length;
  aoa1.push(["ESTADO OPERATIVO DE ÓRDENES", "", "", ""]);
  aoa1.push(["Estado", "Cantidad de Órdenes", "% del Total", ""]);

  const totalEstados = Object.values(stats.porEstado).reduce((s, v) => s + v, 0) || 1;
  const estadosEntries = Object.entries(stats.porEstado).sort((a, b) => b[1] - a[1]);

  estadosEntries.forEach(([est, count]) => {
    const pct = count / totalEstados;
    aoa1.push([est.replace(/_/g, " ").toUpperCase(), count, pct, ""]);
  });

  aoa1.push(["TOTAL DE ÓRDENES", totalEstados, 1.0, ""]);
  aoa1.push([]);
  aoa1.push([`* Cifras expresadas en Pesos Dominicanos (RD$ / DOP). Generado desde Klynn Cloud POS.`]);

  const ws1 = XLSX.utils.aoa_to_sheet(aoa1);

  ws1["!merges"] = [
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
    { s: { r: 7, c: 0 }, e: { r: 7, c: 3 } },
    { s: { r: pagoStartRow, c: 0 }, e: { r: pagoStartRow, c: 3 } },
    { s: { r: estadoStartRow, c: 0 }, e: { r: estadoStartRow, c: 3 } },
    { s: { r: aoa1.length - 1, c: 0 }, e: { r: aoa1.length - 1, c: 7 } },
  ];

  ws1["!cols"] = [
    { wch: 34 },
    { wch: 22 },
    { wch: 24 },
    { wch: 34 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
  ];

  ws1["A1"].s = {
    font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "1B4B73" } },
    alignment: { horizontal: "center", vertical: "center" },
  };

  ws1["A2"].s = {
    font: { name: "Calibri", sz: 9.5, italic: true, color: { rgb: "334155" } },
    fill: { fgColor: { rgb: "F1F5F9" } },
    alignment: { horizontal: "center", vertical: "center" },
  };

  const kpiStyles = [
    { cols: ["A", "B"], hBg: "1E40AF", bBg: "EFF6FF", text: "1E3A8A" },
    { cols: ["C", "D"], hBg: "B91C1C", bBg: "FEF2F2", text: "B91C1C" },
    { cols: ["E", "F"], hBg: "047857", bBg: "ECFDF5", text: "047857" },
    { cols: ["G", "H"], hBg: "B45309", bBg: "FEF3C7", text: "B45309" },
  ];

  kpiStyles.forEach((st) => {
    st.cols.forEach((col) => {
      const c4 = ws1[`${col}4`];
      if (c4) {
        c4.s = {
          font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: st.hBg } },
          alignment: { horizontal: "center", vertical: "center" },
        };
      }
      const c5 = ws1[`${col}5`];
      if (c5) {
        c5.z = '"RD$ "#,##0.00';
        c5.s = {
          font: { name: "Calibri", sz: 14, bold: true, color: { rgb: st.text } },
          fill: { fgColor: { rgb: st.bBg } },
          alignment: { horizontal: "center", vertical: "center" },
        };
      }
      const c6 = ws1[`${col}6`];
      if (c6) {
        c6.s = {
          font: { name: "Calibri", sz: 9, color: { rgb: "475569" } },
          fill: { fgColor: { rgb: st.bBg } },
          alignment: { horizontal: "center", vertical: "center" },
        };
      }
    });
  });

  const cSec1 = ws1["A8"];
  if (cSec1) {
    cSec1.s = {
      font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1B4B73" } },
      alignment: { horizontal: "left", vertical: "center" },
    };
  }

  ["A9", "B9", "C9", "D9"].forEach((c) => {
    if (ws1[c]) {
      ws1[c].s = {
        font: { name: "Calibri", sz: 10.5, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1E40AF" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "334155" } },
          bottom: { style: "medium", color: { rgb: "0F172A" } },
          left: { style: "thin", color: { rgb: "334155" } },
          right: { style: "thin", color: { rgb: "334155" } },
        },
      };
    }
  });

  kpis.forEach((k, idx) => {
    const rowNum = 10 + idx;
    const isEven = idx % 2 === 0;
    const rowBg = isEven ? "FFFFFF" : "F8FAFC";

    ["A", "B", "C", "D"].forEach((col, cIdx) => {
      const cell = ws1[`${col}${rowNum}`];
      if (!cell) return;

      cell.s = {
        font: { name: "Calibri", sz: 10, color: { rgb: "0F172A" } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: cIdx === 2 ? "right" : "left", vertical: "center" },
        border: borderThin,
      };

      if (cIdx === 0) cell.s.font.bold = true;
      if (cIdx === 2) {
        cell.s.font.bold = true;
        if (k.tipo === "money") {
          cell.z = '"RD$ "#,##0.00;[Red]-"RD$ "#,##0.00;"RD$ 0.00"';
        } else if (k.tipo === "number") {
          cell.z = '#,##0" piezas"';
          cell.s.alignment.horizontal = "center";
        } else if (k.tipo === "decimal") {
          cell.z = '#,##0.00" lbs"';
          cell.s.alignment.horizontal = "center";
        } else {
          cell.s.alignment.horizontal = "center";
        }
      }
    });
  });

  // Estilos Sección 2
  const sec2Row = pagoStartRow + 1;
  if (ws1[`A${sec2Row}`]) {
    ws1[`A${sec2Row}`].s = {
      font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1B4B73" } },
      alignment: { horizontal: "left", vertical: "center" },
    };
  }

  const sec2HeadersRow = sec2Row + 1;
  ["A", "B", "C"].forEach((col) => {
    const cell = ws1[`${col}${sec2HeadersRow}`];
    if (cell) {
      cell.s = {
        font: { name: "Calibri", sz: 10.5, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "047857" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: borderThin,
      };
    }
  });

  metodosEntries.forEach((_, idx) => {
    const rNum = sec2HeadersRow + 1 + idx;
    const isEven = idx % 2 === 0;
    const rBg = isEven ? "FFFFFF" : "F8FAFC";
    ["A", "B", "C"].forEach((col, cIdx) => {
      const cell = ws1[`${col}${rNum}`];
      if (!cell) return;
      cell.s = {
        font: { name: "Calibri", sz: 10, color: { rgb: "0F172A" } },
        fill: { fgColor: { rgb: rBg } },
        alignment: { horizontal: cIdx === 0 ? "left" : "right", vertical: "center" },
        border: borderThin,
      };
      if (cIdx === 0) cell.s.font.bold = true;
      if (cIdx === 1) cell.z = '"RD$ "#,##0.00';
      if (cIdx === 2) {
        cell.z = "0.0%";
        cell.s.font.bold = true;
      }
    });
  });

  const sec2TotalRow = sec2HeadersRow + 1 + metodosEntries.length;
  ["A", "B", "C"].forEach((col, cIdx) => {
    const cell = ws1[`${col}${sec2TotalRow}`];
    if (cell) {
      cell.s = {
        font: { name: "Calibri", sz: 10.5, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1B4B73" } },
        alignment: { horizontal: cIdx === 0 ? "left" : "right", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "94A3B8" } },
          bottom: { style: "double", color: { rgb: "0F172A" } },
          left: { style: "thin", color: { rgb: "334155" } },
          right: { style: "thin", color: { rgb: "334155" } },
        },
      };
      if (cIdx === 1) cell.z = '"RD$ "#,##0.00';
      if (cIdx === 2) cell.z = "0.0%";
    }
  });

  // Estilos Sección 3
  const sec3Row = estadoStartRow + 1;
  if (ws1[`A${sec3Row}`]) {
    ws1[`A${sec3Row}`].s = {
      font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1B4B73" } },
      alignment: { horizontal: "left", vertical: "center" },
    };
  }

  const sec3HeadersRow = sec3Row + 1;
  ["A", "B", "C"].forEach((col) => {
    const cell = ws1[`${col}${sec3HeadersRow}`];
    if (cell) {
      cell.s = {
        font: { name: "Calibri", sz: 10.5, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4338CA" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: borderThin,
      };
    }
  });

  estadosEntries.forEach((_, idx) => {
    const rNum = sec3HeadersRow + 1 + idx;
    const isEven = idx % 2 === 0;
    const rBg = isEven ? "FFFFFF" : "F8FAFC";
    ["A", "B", "C"].forEach((col, cIdx) => {
      const cell = ws1[`${col}${rNum}`];
      if (!cell) return;
      cell.s = {
        font: { name: "Calibri", sz: 10, color: { rgb: "0F172A" } },
        fill: { fgColor: { rgb: rBg } },
        alignment: { horizontal: cIdx === 0 ? "left" : "right", vertical: "center" },
        border: borderThin,
      };
      if (cIdx === 0) cell.s.font.bold = true;
      if (cIdx === 1) cell.z = "#,##0";
      if (cIdx === 2) {
        cell.z = "0.0%";
        cell.s.font.bold = true;
      }
    });
  });

  const sec3TotalRow = sec3HeadersRow + 1 + estadosEntries.length;
  ["A", "B", "C"].forEach((col, cIdx) => {
    const cell = ws1[`${col}${sec3TotalRow}`];
    if (cell) {
      cell.s = {
        font: { name: "Calibri", sz: 10.5, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1B4B73" } },
        alignment: { horizontal: cIdx === 0 ? "left" : "right", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "94A3B8" } },
          bottom: { style: "double", color: { rgb: "0F172A" } },
          left: { style: "thin", color: { rgb: "334155" } },
          right: { style: "thin", color: { rgb: "334155" } },
        },
      };
      if (cIdx === 1) cell.z = "#,##0";
      if (cIdx === 2) cell.z = "0.0%";
    }
  });

  XLSX.utils.book_append_sheet(wb, ws1, "Resumen Financiero y KPIs");

  // ==========================================
  // HOJA 2: TOP SERVICIOS Y PRENDAS
  // ==========================================
  const aoa2: any[][] = [];
  aoa2.push(["KLYNN CLOUD POS — TOP SERVICIOS Y PRENDAS CON MAYOR DEMANDA"]);
  aoa2.push([`Empresa: ${tenantName}  |  Emisión: ${fechaEmision}`]);
  aoa2.push([]);

  // Top Servicios
  aoa2.push(["RANKING DE SERVICIOS CON MAYOR FACTURACIÓN", "", "", ""]);
  aoa2.push(["Posición", "Nombre del Servicio", "Órdenes Realizadas", "Facturación Total (RD$)"]);

  const topServicios = stats.topServicios || [];
  let sumServiciosMonto = 0;
  let sumServiciosCount = 0;

  topServicios.forEach((s, idx) => {
    sumServiciosMonto += s.total;
    sumServiciosCount += s.count;
    aoa2.push([`#${idx + 1}`, s.name, s.count, s.total]);
  });

  aoa2.push(["TOTAL TOP SERVICIOS", "", sumServiciosCount, sumServiciosMonto]);
  aoa2.push([]);

  // Top Prendas
  const prendasStartRow = aoa2.length;
  aoa2.push(["RANKING DE PRENDAS Y ARTÍCULOS PROCESADOS", "", "", ""]);
  aoa2.push(["Posición", "Nombre de Prenda", "Unidades Procesadas", "Ingresos Generados (RD$)"]);

  const topPrendas = stats.topPrendas || [];
  let sumPrendasMonto = 0;
  let sumPrendasCount = 0;

  topPrendas.forEach((p, idx) => {
    sumPrendasMonto += p.total;
    sumPrendasCount += p.count;
    aoa2.push([`#${idx + 1}`, p.name, p.count, p.total]);
  });

  aoa2.push(["TOTAL TOP PRENDAS", "", sumPrendasCount, sumPrendasMonto]);

  // Cruce Operativo: Desglose de Prendas por Servicio
  const cruceStartRow = aoa2.length + 1;
  const hasPrendasPorServicio = topServicios.some(s => s.rankingPrendas && s.rankingPrendas.length > 0);
  let cruceRowCount = 0;
  if (hasPrendasPorServicio) {
    aoa2.push([]);
    aoa2.push(["CRUCE OPERATIVO — PRENDAS ATENDIDAS POR CADA SERVICIO", "", "", ""]);
    aoa2.push(["Servicio", "Prenda Procesada", "Unidades / Cantidad", "Facturación Aportada (RD$)"]);
    topServicios.forEach(s => {
      (s.rankingPrendas || []).forEach(p => {
        aoa2.push([s.name, p.name, p.count, p.total]);
        cruceRowCount++;
      });
    });
  }

  const ws2 = XLSX.utils.aoa_to_sheet(aoa2);

  ws2["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } },
    { s: { r: prendasStartRow, c: 0 }, e: { r: prendasStartRow, c: 3 } },
    ...(hasPrendasPorServicio ? [{ s: { r: cruceStartRow, c: 0 }, e: { r: cruceStartRow, c: 3 } }] : []),
  ];

  ws2["!cols"] = [{ wch: 14 }, { wch: 32 }, { wch: 22 }, { wch: 26 }];

  ws2["A1"].s = {
    font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "1B4B73" } },
    alignment: { horizontal: "center", vertical: "center" },
  };
  ws2["A2"].s = {
    font: { name: "Calibri", sz: 9.5, italic: true, color: { rgb: "334155" } },
    fill: { fgColor: { rgb: "F1F5F9" } },
    alignment: { horizontal: "center", vertical: "center" },
  };

  ["A5", "B5", "C5", "D5"].forEach((c) => {
    if (ws2[c]) {
      ws2[c].s = {
        font: { name: "Calibri", sz: 10.5, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1E40AF" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: borderThin,
      };
    }
  });

  topServicios.forEach((_, idx) => {
    const r = 6 + idx;
    const isEven = idx % 2 === 0;
    const bg = isEven ? "FFFFFF" : "F8FAFC";
    ["A", "B", "C", "D"].forEach((col, cIdx) => {
      const cell = ws2[`${col}${r}`];
      if (!cell) return;
      cell.s = {
        font: { name: "Calibri", sz: 10, color: { rgb: "0F172A" } },
        fill: { fgColor: { rgb: bg } },
        alignment: { horizontal: cIdx === 0 || cIdx === 2 ? "center" : cIdx === 1 ? "left" : "right", vertical: "center" },
        border: borderThin,
      };
      if (cIdx === 1) cell.s.font.bold = true;
      if (cIdx === 2) cell.z = "#,##0";
      if (cIdx === 3) {
        cell.z = '"RD$ "#,##0.00';
        cell.s.font.bold = true;
      }
    });
  });

  const totServRow = 6 + topServicios.length;
  ["A", "B", "C", "D"].forEach((col, cIdx) => {
    const cell = ws2[`${col}${totServRow}`];
    if (!cell) return;
    cell.s = {
      font: { name: "Calibri", sz: 10.5, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1B4B73" } },
      alignment: { horizontal: cIdx <= 1 ? "left" : cIdx === 2 ? "center" : "right", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "94A3B8" } },
        bottom: { style: "double", color: { rgb: "0F172A" } },
        left: { style: "thin", color: { rgb: "334155" } },
        right: { style: "thin", color: { rgb: "334155" } },
      },
    };
    if (cIdx === 2) cell.z = "#,##0";
    if (cIdx === 3) cell.z = '"RD$ "#,##0.00';
  });

  const prendasHRow = prendasStartRow + 2;
  ["A", "B", "C", "D"].forEach((col) => {
    const cell = ws2[`${col}${prendasHRow}`];
    if (cell) {
      cell.s = {
        font: { name: "Calibri", sz: 10.5, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "047857" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: borderThin,
      };
    }
  });

  topPrendas.forEach((_, idx) => {
    const r = prendasHRow + 1 + idx;
    const isEven = idx % 2 === 0;
    const bg = isEven ? "FFFFFF" : "F8FAFC";
    ["A", "B", "C", "D"].forEach((col, cIdx) => {
      const cell = ws2[`${col}${r}`];
      if (!cell) return;
      cell.s = {
        font: { name: "Calibri", sz: 10, color: { rgb: "0F172A" } },
        fill: { fgColor: { rgb: bg } },
        alignment: { horizontal: cIdx === 0 || cIdx === 2 ? "center" : cIdx === 1 ? "left" : "right", vertical: "center" },
        border: borderThin,
      };
      if (cIdx === 1) cell.s.font.bold = true;
      if (cIdx === 2) cell.z = "#,##0";
      if (cIdx === 3) {
        cell.z = '"RD$ "#,##0.00';
        cell.s.font.bold = true;
      }
    });
  });

  const totPrendRow = prendasHRow + 1 + topPrendas.length;
  ["A", "B", "C", "D"].forEach((col, cIdx) => {
    const cell = ws2[`${col}${totPrendRow}`];
    if (!cell) return;
    cell.s = {
      font: { name: "Calibri", sz: 10.5, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1B4B73" } },
      alignment: { horizontal: cIdx <= 1 ? "left" : cIdx === 2 ? "center" : "right", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "94A3B8" } },
        bottom: { style: "double", color: { rgb: "0F172A" } },
        left: { style: "thin", color: { rgb: "334155" } },
        right: { style: "thin", color: { rgb: "334155" } },
      },
    };
    if (cIdx === 2) cell.z = "#,##0";
    if (cIdx === 3) cell.z = '"RD$ "#,##0.00';
  });

  if (hasPrendasPorServicio) {
    const cruceHRow = cruceStartRow + 2;
    ["A", "B", "C", "D"].forEach((col) => {
      const cell = ws2[`${col}${cruceHRow}`];
      if (cell) {
        cell.s = {
          font: { name: "Calibri", sz: 10.5, bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "1B4B73" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: borderThin,
        };
      }
    });

    const cruceTitleCell = ws2[`A${cruceStartRow + 1}`];
    if (cruceTitleCell) {
      cruceTitleCell.s = {
        font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "1E3A8A" } },
        fill: { fgColor: { rgb: "DBEAFE" } },
        alignment: { horizontal: "left", vertical: "center" },
        border: borderThin,
      };
    }

    for (let i = 0; i < cruceRowCount; i++) {
      const r = cruceHRow + 1 + i;
      const isEven = i % 2 === 0;
      const bg = isEven ? "FFFFFF" : "F8FAFC";
      ["A", "B", "C", "D"].forEach((col, cIdx) => {
        const cell = ws2[`${col}${r}`];
        if (!cell) return;
        cell.s = {
          font: { name: "Calibri", sz: 10, color: { rgb: "0F172A" } },
          fill: { fgColor: { rgb: bg } },
          alignment: { horizontal: cIdx === 2 ? "center" : cIdx === 3 ? "right" : "left", vertical: "center" },
          border: borderThin,
        };
        if (cIdx === 0 || cIdx === 1) cell.s.font.bold = (cIdx === 0);
        if (cIdx === 2) cell.z = "#,##0";
        if (cIdx === 3) {
          cell.z = '"RD$ "#,##0.00';
          cell.s.font.bold = true;
        }
      });
    }
  }

  XLSX.utils.book_append_sheet(wb, ws2, "Top Servicios y Prendas");

  // ==========================================
  // HOJA 3: VENTAS POR COLABORADOR
  // ==========================================
  if (empleados.length > 0) {
    const aoa3: any[][] = [];
    aoa3.push(["KLYNN CLOUD POS — RENDIMIENTO POR COLABORADOR"]);
    aoa3.push([`Empresa: ${tenantName}  |  Emisión: ${fechaEmision}`]);
    aoa3.push([]);

    aoa3.push(["Colaborador", "Rol / Cargo", "Órdenes Atendidas", "Ventas Totales (RD$)", "% del Total", "Ticket Promedio (RD$)"]);

    let totEmpOrds = 0;
    let totEmpVentas = 0;

    const empsData = empleados.map((e) => {
      const empOrds = ordenes.filter((o) => o.empleado_id === e.id);
      const total = empOrds.reduce((s, o) => s + (Number(o.total) || 0), 0);
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

    empsData.forEach((ed) => {
      const pct = totEmpVentas > 0 ? ed.total / totEmpVentas : 0;
      const tProm = ed.count > 0 ? ed.total / ed.count : 0;
      aoa3.push([ed.nombre, ed.rol, ed.count, ed.total, pct, tProm]);
    });

    aoa3.push([
      "TOTAL COLABORADORES",
      "",
      totEmpOrds,
      totEmpVentas,
      1.0,
      totEmpOrds > 0 ? totEmpVentas / totEmpOrds : 0,
    ]);

    const ws3 = XLSX.utils.aoa_to_sheet(aoa3);

    ws3["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    ];

    ws3["!cols"] = [
      { wch: 28 },
      { wch: 20 },
      { wch: 18 },
      { wch: 24 },
      { wch: 16 },
      { wch: 22 },
    ];

    ws3["A1"].s = {
      font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1B4B73" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
    ws3["A2"].s = {
      font: { name: "Calibri", sz: 9.5, italic: true, color: { rgb: "334155" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { horizontal: "center", vertical: "center" },
    };

    ["A4", "B4", "C4", "D4", "E4", "F4"].forEach((c) => {
      if (ws3[c]) {
        ws3[c].s = {
          font: { name: "Calibri", sz: 10.5, bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "1B4B73" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: borderThin,
        };
      }
    });

    empsData.forEach((_, idx) => {
      const r = 5 + idx;
      const isEven = idx % 2 === 0;
      const bg = isEven ? "FFFFFF" : "F8FAFC";
      ["A", "B", "C", "D", "E", "F"].forEach((col, cIdx) => {
        const cell = ws3[`${col}${r}`];
        if (!cell) return;
        cell.s = {
          font: { name: "Calibri", sz: 10, color: { rgb: "0F172A" } },
          fill: { fgColor: { rgb: bg } },
          alignment: {
            horizontal: cIdx === 0 ? "left" : cIdx === 1 || cIdx === 2 ? "center" : "right",
            vertical: "center",
          },
          border: borderThin,
        };
        if (cIdx === 0) cell.s.font.bold = true;
        if (cIdx === 2) cell.z = "#,##0";
        if (cIdx === 3 || cIdx === 5) cell.z = '"RD$ "#,##0.00';
        if (cIdx === 4) cell.z = "0.0%";
      });
    });

    const totEmpRow = 5 + empsData.length;
    ["A", "B", "C", "D", "E", "F"].forEach((col, cIdx) => {
      const cell = ws3[`${col}${totEmpRow}`];
      if (!cell) return;
      cell.s = {
        font: { name: "Calibri", sz: 10.5, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1B4B73" } },
        alignment: {
          horizontal: cIdx === 0 ? "left" : cIdx === 1 || cIdx === 2 ? "center" : "right",
          vertical: "center",
        },
        border: {
          top: { style: "thin", color: { rgb: "94A3B8" } },
          bottom: { style: "double", color: { rgb: "0F172A" } },
          left: { style: "thin", color: { rgb: "334155" } },
          right: { style: "thin", color: { rgb: "334155" } },
        },
      };
      if (cIdx === 2) cell.z = "#,##0";
      if (cIdx === 3 || cIdx === 5) cell.z = '"RD$ "#,##0.00';
      if (cIdx === 4) cell.z = "0.0%";
    });

    XLSX.utils.book_append_sheet(wb, ws3, "Ventas por Colaborador");
  }

  const safeTenant = tenantName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const dateTag = new Date().toISOString().slice(0, 10);
  const filename = `Reporte_Rendimiento_${safeTenant}_${dateTag}.xlsx`;

  XLSX.writeFile(wb, filename);
}

/**
 * Mapea el código de comprobante al nombre formal de DGII
 */
function getTipoComprobanteLabel(tipoOrNcf?: string): string {
  if (!tipoOrNcf) return "Consumo Final";
  const s = tipoOrNcf.toUpperCase();
  if (s.includes("E31") || s.startsWith("B01")) return "Crédito Fiscal (B01/E31)";
  if (s.includes("E32") || s.startsWith("B02")) return "Consumo Final (B02/E32)";
  if (s.includes("E34") || s.startsWith("B04")) return "Nota de Crédito (B04/E34)";
  if (s.includes("E33") || s.startsWith("B03")) return "Nota de Débito (B03/E33)";
  if (s.includes("E41") || s.startsWith("B11")) return "Compras Menores (B11/E41)";
  if (s.includes("E44") || s.startsWith("B14")) return "Régimen Especial (B14/E44)";
  if (s.includes("E45") || s.startsWith("B15")) return "Gubernamental (B15/E45)";
  return "Comprobante Fiscal";
}

/**
 * Exporta el reporte de Facturas Emitidas / Enviadas en Excel (.xlsx) con
 * diseño ejecutivo, tarjetas KPI, colores corporativos y formato contable oficial.
 */
export function exportFacturasEnviadasToExcel(options: ExportFacturasOptions) {
  const {
    periodOrdenes,
    rncEmisor,
    exportYear,
    exportMonth,
    clientes = [],
    rawEcfDocs = [],
    tenantName = "Klynn Lavandería",
  } = options;

  const wb = XLSX.utils.book_new();

  const mesIdx = Math.max(0, Math.min(11, parseInt(exportMonth, 10) - 1));
  const mesNombre = MESES_NOMBRES[mesIdx] || "Mes";
  const periodTag = `${exportYear}${exportMonth}`;

  const fechaStr = new Date().toLocaleString("es-DO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const headers = [
    "Nº Orden / Factura",
    "Comprobante Fiscal (e-NCF / NCF)",
    "Tipo de Comprobante",
    "Fecha de Emisión",
    "RNC / Cédula Cliente",
    "Nombre / Razón Social",
    "Subtotal (RD$)",
    "ITBIS (18%) (RD$)",
    "Total Facturado (RD$)",
    "Forma de Pago",
    "Estado DGII / Fiscal",
  ];

  const numCols = headers.length;

  // Consolidar datos de facturas
  let sumSubtotal = 0;
  let sumITBIS = 0;
  let sumTotal = 0;
  let ncfCount = 0;

  const facturasRows: any[][] = [];

  periodOrdenes.forEach((o) => {
    // Buscar si tiene e-NCF registrado
    const matchedDoc = rawEcfDocs.find(
      (d: any) => d.orden_id === o.id || (o.ncf && d.encf === o.ncf)
    );

    const ncf = matchedDoc?.encf || o.ncf || "—";
    const tipoEcf = matchedDoc?.tipo_ecf || o.tipo_ecf || (ncf !== "—" ? ncf.substring(0, 3) : "");
    const tipoLabel = getTipoComprobanteLabel(tipoEcf);

    if (ncf !== "—") ncfCount++;

    // Cliente
    const cli = clientes.find((c: any) => c.id === o.cliente_id);
    const cliNombre = cli
      ? `${cli.nombre} ${cli.apellido || ""}`.trim()
      : (o as any).cliente_nombre || "Consumidor Final";
    const cliRnc = cli?.cedula || (o as any).cliente_rnc || "Consumidor Final";

    // Fechas
    const fechaEmis = o.creado_en
      ? String(o.creado_en).substring(0, 10)
      : matchedDoc?.fecha_emision
      ? String(matchedDoc.fecha_emision).substring(0, 10)
      : "—";

    const sub = Number(o.subtotal || 0);
    const itb = Number(o.itbis || 0);
    const tot = Number(o.total || 0);

    sumSubtotal += sub;
    sumITBIS += itb;
    sumTotal += tot;

    const estDgii = matchedDoc?.status === "accepted" || o.ncf
      ? "ACEPTADO_DGII"
      : "REGISTRADO";

    facturasRows.push([
      o.numero || "—",
      ncf,
      tipoLabel,
      fechaEmis,
      cliRnc,
      cliNombre,
      sub,
      itb,
      tot,
      (o.metodo_pago || "Efectivo").replace(/_/g, " "),
      estDgii,
    ]);
  });

  const aoa: any[][] = [
    ["KLYNN CLOUD POS — REPORTE DE FACTURAS Y COMPROBANTES FISCALES (DGII)"],
    [
      `Empresa: ${tenantName}  |  RNC Emisor: ${rncEmisor}  |  Período Fiscal: ${mesNombre} ${exportYear} (${periodTag})  |  Emisión: ${fechaStr}`,
    ],
    [],
    // Filas 3-5: Tarjetas KPI Ejecutivas
    // Card 1 (cols 0..2): TOTAL FACTURADO
    // Card 2 (cols 3..4): BASE IMPONIBLE
    // Card 3 (cols 5..6): ITBIS 18%
    // Card 4 (cols 7..10): COMPROBANTES DGII
    [
      "TOTAL FACTURADO",
      "",
      "",
      "SUB-TOTAL IMPONIBLE",
      "",
      "ITBIS RECAUDADO (18%)",
      "",
      "COMPROBANTES DGII",
      "",
      "",
      "",
    ],
    [
      sumTotal,
      "",
      "",
      sumSubtotal,
      "",
      sumITBIS,
      "",
      ncfCount,
      "",
      "",
      "",
    ],
    [
      `${periodOrdenes.length} facturas en el período`,
      "",
      "",
      "Base imponible gravada",
      "",
      "Total ITBIS fiscal generado",
      "",
      ncfCount === periodOrdenes.length && periodOrdenes.length > 0
        ? "100% con NCF asignado"
        : `${ncfCount} de ${periodOrdenes.length} con NCF`,
      "",
      "",
      "",
    ],
    [],
    // Fila 7: Encabezados de Tabla
    headers,
    ...facturasRows,
  ];

  // Fila de Total
  const totalRowIdx = aoa.length;
  aoa.push([
    `TOTALES GENERALES (${periodOrdenes.length} FACTURAS)`,
    "",
    "",
    "",
    "",
    "",
    sumSubtotal,
    sumITBIS,
    sumTotal,
    "",
    "",
  ]);

  aoa.push([]);
  aoa.push([
    `* Reporte oficial generado por Klynn Cloud POS. Cifras expresadas en Pesos Dominicanos (RD$ / DOP).`,
  ]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Merges
  ws["!merges"] = [
    // Título y subtítulo
    { s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } },
    // KPI Card 1 (cols 0..2)
    { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 2 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 2 } },
    // KPI Card 2 (cols 3..4)
    { s: { r: 3, c: 3 }, e: { r: 3, c: 4 } },
    { s: { r: 4, c: 3 }, e: { r: 4, c: 4 } },
    { s: { r: 5, c: 3 }, e: { r: 5, c: 4 } },
    // KPI Card 3 (cols 5..6)
    { s: { r: 3, c: 5 }, e: { r: 3, c: 6 } },
    { s: { r: 4, c: 5 }, e: { r: 4, c: 6 } },
    { s: { r: 5, c: 5 }, e: { r: 5, c: 6 } },
    // KPI Card 4 (cols 7..10)
    { s: { r: 3, c: 7 }, e: { r: 3, c: numCols - 1 } },
    { s: { r: 4, c: 7 }, e: { r: 4, c: numCols - 1 } },
    { s: { r: 5, c: 7 }, e: { r: 5, c: numCols - 1 } },
    // Total label merge (cols 0..5)
    { s: { r: totalRowIdx, c: 0 }, e: { r: totalRowIdx, c: 5 } },
    // Footer note
    { s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: numCols - 1 } },
  ];

  // Column Widths
  ws["!cols"] = [
    { wch: 18 }, // Nº Orden
    { wch: 28 }, // Comprobante Fiscal
    { wch: 24 }, // Tipo Comprobante
    { wch: 18 }, // Fecha Emisión
    { wch: 22 }, // RNC Cliente
    { wch: 32 }, // Nombre Cliente
    { wch: 20 }, // Subtotal
    { wch: 18 }, // ITBIS
    { wch: 22 }, // Total
    { wch: 18 }, // Forma Pago
    { wch: 22 }, // Estado DGII
  ];

  // Row heights
  const rHeights: { hpt: number }[] = [
    { hpt: 34 }, // Title
    { hpt: 20 }, // Subtitle
    { hpt: 10 }, // Blank
    { hpt: 22 }, // KPI Header
    { hpt: 32 }, // KPI Value
    { hpt: 18 }, // KPI Subtitle
    { hpt: 12 }, // Blank
    { hpt: 26 }, // Table Header
  ];

  periodOrdenes.forEach(() => {
    rHeights.push({ hpt: 21 });
  });

  rHeights.push({ hpt: 26 }); // Total row
  rHeights.push({ hpt: 10 }); // Blank
  rHeights.push({ hpt: 16 }); // Note

  ws["!rows"] = rHeights;

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
  const kpiFacturasStyles = [
    { cols: ["A", "B", "C"], hBg: "1E40AF", bBg: "EFF6FF", text: "1E3A8A", isMoney: true, val: sumTotal },
    { cols: ["D", "E"], hBg: "047857", bBg: "ECFDF5", text: "047857", isMoney: true, val: sumSubtotal },
    { cols: ["F", "G"], hBg: "B45309", bBg: "FEF3C7", text: "B45309", isMoney: true, val: sumITBIS },
    { cols: ["H", "I", "J", "K"], hBg: "4338CA", bBg: "EEF2FF", text: "3730A3", isMoney: false, val: ncfCount },
  ];

  kpiFacturasStyles.forEach((st) => {
    st.cols.forEach((col) => {
      const c4 = ws[`${col}4`];
      if (c4) {
        c4.s = {
          font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: st.hBg } },
          alignment: { horizontal: "center", vertical: "center" },
        };
      }
      const c5 = ws[`${col}5`];
      if (c5) {
        c5.z = st.isMoney ? '"RD$ "#,##0.00' : '#,##0';
        c5.s = {
          font: { name: "Calibri", sz: 14, bold: true, color: { rgb: st.text } },
          fill: { fgColor: { rgb: st.bBg } },
          alignment: { horizontal: "center", vertical: "center" },
        };
      }
      const c6 = ws[`${col}6`];
      if (c6) {
        c6.s = {
          font: { name: "Calibri", sz: 9, color: { rgb: "475569" } },
          fill: { fgColor: { rgb: st.bBg } },
          alignment: { horizontal: "center", vertical: "center" },
        };
      }
    });
  });

  // 4. Encabezados de Tabla (Row 8)
  for (let c = 0; c < numCols; c++) {
    const colLetter = getColumnLetter(c);
    const cell = ws[`${colLetter}8`];
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

  // 5. Filas de Datos (Row 9+)
  facturasRows.forEach((row, idx) => {
    const r = 9 + idx;
    const isEven = idx % 2 === 0;
    const bg = isEven ? "FFFFFF" : "F8FAFC";

    for (let c = 0; c < numCols; c++) {
      const colLetter = getColumnLetter(c);
      const cell = ws[`${colLetter}${r}`];
      if (!cell) continue;

      cell.s = {
        font: { name: "Calibri", sz: 10, color: { rgb: "0F172A" } },
        fill: { fgColor: { rgb: bg } },
        alignment: {
          horizontal: c >= 6 && c <= 8 ? "right" : c === 1 || c === 3 || c === 4 || c === 9 || c === 10 ? "center" : "left",
          vertical: "center",
        },
        border: borderThin,
      };

      // Nº Orden
      if (c === 0) {
        cell.s.font.bold = true;
        cell.s.font.color = { rgb: "1B4B73" };
      }

      // Comprobante Fiscal
      if (c === 1) {
        cell.s.font.bold = true;
        cell.s.font.color = { rgb: "1E40AF" };
      }

      // Tipo de Comprobante
      if (c === 2) {
        const valStr = String(row[c] || "");
        if (valStr.includes("Crédito Fiscal")) {
          cell.s.fill = { fgColor: { rgb: "EDE9FE" } };
          cell.s.font.color = { rgb: "6B21A8" };
          cell.s.font.bold = true;
        } else if (valStr.includes("Consumo Final")) {
          cell.s.fill = { fgColor: { rgb: "F1F5F9" } };
          cell.s.font.color = { rgb: "334155" };
        }
      }

      // Cliente
      if (c === 5) {
        cell.s.font.bold = true;
      }

      // Montos
      if (c >= 6 && c <= 8) {
        cell.z = '"RD$ "#,##0.00;[Red]-"RD$ "#,##0.00;"RD$ 0.00"';
        if (c === 8) {
          cell.s.font.bold = true;
        }
      }

      // Estado DGII
      if (c === 10) {
        cell.s.font.bold = true;
        const estStr = String(row[c] || "");
        if (estStr.includes("ACEPTADO")) {
          cell.s.fill = { fgColor: { rgb: "ECFDF5" } };
          cell.s.font.color = { rgb: "047857" };
        } else {
          cell.s.fill = { fgColor: { rgb: "EFF6FF" } };
          cell.s.font.color = { rgb: "1E40AF" };
        }
      }
    }
  });

  // 6. Totales
  const totRow1Idx = totalRowIdx + 1;
  for (let c = 0; c < numCols; c++) {
    const colLetter = getColumnLetter(c);
    const cell = ws[`${colLetter}${totRow1Idx}`];
    if (!cell) continue;

    cell.s = {
      font: { name: "Calibri", sz: 10.5, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1B4B73" } },
      alignment: { horizontal: c >= 6 && c <= 8 ? "right" : "left", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "94A3B8" } },
        bottom: { style: "double", color: { rgb: "0F172A" } },
        left: { style: "thin", color: { rgb: "334155" } },
        right: { style: "thin", color: { rgb: "334155" } },
      },
    };

    if (c >= 6 && c <= 8) {
      cell.z = '"RD$ "#,##0.00';
    }
  }

  // 7. Pie de nota
  const noteCell = ws[`A${aoa.length}`];
  if (noteCell) {
    noteCell.s = {
      font: { name: "Calibri", sz: 8.5, italic: true, color: { rgb: "64748B" } },
      alignment: { horizontal: "left", vertical: "center" },
    };
  }

  XLSX.utils.book_append_sheet(wb, ws, "Facturas DGII");

  const safeTenant = tenantName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `Facturas_Emitidas_${rncEmisor}_${periodTag}_${safeTenant}.xlsx`;

  XLSX.writeFile(wb, filename);
}

export * from "./excel-reportes-tabs";
