import XLSX from "xlsx-js-style";

export interface ConsolidadoSucursalExport {
  nombre: string;
  sede: string;
  rnc: string;
  clientesActivos: number;
  totalCartera: number;
  ingresosCobrados: number;
  facturado: number;
  totalGastos: number;
  utilidadNeta: number;
  margenPct: number;
  ticketPromedioCliente: number;
  ordenesCount: number;
  porCobrarTotal: number;
  cxpPendiente: number;
  cxpVencidas: number;
}

export interface ConsolidadoCadenaExport {
  cadenaCobrado: number;
  cadenaFacturado: number;
  cadenaGastos: number;
  cadenaUtilidad: number;
  cadenaMargen: number;
  cadenaClientesActivos: number;
  cadenaTotalCartera: number;
  cadenaTicketCliente: number;
  cadenaOrdenes: number;
  cadenaCXCTotal: number;
  cadenaCXP: number;
  cadenaCXPVencidas: number;
}

export interface CXPFacturaExport {
  sucursal: string;
  suplidor: string;
  rnc: string;
  numeroFactura: string;
  ncf?: string;
  fechaEmision: string;
  fechaVencimiento: string;
  estadoMora: string;
  total: number;
  montoPagado: number;
  saldoPendiente: number;
}

const borderThin = {
  top: { style: "thin", color: { rgb: "CBD5E1" } },
  bottom: { style: "thin", color: { rgb: "CBD5E1" } },
  left: { style: "thin", color: { rgb: "CBD5E1" } },
  right: { style: "thin", color: { rgb: "CBD5E1" } },
};

function numToLetter(idx: number): string {
  let letter = "";
  while (idx >= 0) {
    letter = String.fromCharCode((idx % 26) + 65) + letter;
    idx = Math.floor(idx / 26) - 1;
  }
  return letter;
}

/**
 * Exporta el reporte ejecutivo consolidado de la red de lavanderías a un libro Excel (.xlsx)
 * con tarjetas KPI, tabla comparativa por sucursal y hoja detallada de CXP a proveedores.
 */
export function exportConsolidadoToExcel({
  periodoLabel,
  sucursales,
  totalesCadena,
  cxpList = [],
}: {
  periodoLabel: string;
  sucursales: ConsolidadoSucursalExport[];
  totalesCadena: ConsolidadoCadenaExport;
  cxpList?: CXPFacturaExport[];
}) {
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
  // HOJA 1: CONSOLIDADO MULTISEDE POR SUCURSAL
  // ==========================================
  const aoa1: any[][] = [];

  // Fila 0: Banner Principal
  aoa1.push(["KLYNN CLOUD POS — REPORTE CONSOLIDADO FINANCIERO MULTISEDE"]);

  // Fila 1: Subtítulo
  aoa1.push([
    `Periodo: ${periodoLabel}  |  Emisión: ${fechaEmision}  |  Lavanderías Activas: ${sucursales.length}`,
  ]);

  // Fila 2: Espacio
  aoa1.push([]);

  // Filas 3-5: Tarjetas KPI Ejecutivas de la Red
  aoa1.push([
    "INGRESOS COBRADOS RED",
    "",
    "GASTOS OPERATIVOS RED",
    "",
    "UTILIDAD NETA RED",
    "",
    "CLIENTES ACTIVOS RED",
    "",
  ]);

  aoa1.push([
    totalesCadena.cadenaCobrado,
    "",
    totalesCadena.cadenaGastos,
    "",
    totalesCadena.cadenaUtilidad,
    "",
    totalesCadena.cadenaClientesActivos,
    "",
  ]);

  aoa1.push([
    `Facturado: RD$ ${totalesCadena.cadenaFacturado.toLocaleString("es-DO", { minimumFractionDigits: 2 })} • ${totalesCadena.cadenaOrdenes} órdenes`,
    "",
    "Egresos operativos del periodo",
    "",
    `Margen Neto: ${totalesCadena.cadenaMargen.toFixed(1)}%`,
    "",
    `Gasto prom: RD$ ${totalesCadena.cadenaTicketCliente.toLocaleString("es-DO")} / cli • Cartera: ${totalesCadena.cadenaTotalCartera}`,
    "",
  ]);

  // Fila 6: Espacio
  aoa1.push([]);

  // Fila 7: Título de la Tabla Comparativa
  aoa1.push(["TABLA COMPARATIVA DE RENDIMIENTO POR SUCURSAL"]);

  // Fila 8: Encabezados de Columnas
  const headers = [
    "Sucursal / Lavandería",
    "Sede",
    "RNC",
    "Clientes Activos",
    "Cartera Total",
    "Cobrado (Flujo Real)",
    "Total Facturado",
    "Gastos Operativos",
    "Utilidad Neta",
    "Margen %",
    "Ticket / Cliente",
    "Órdenes",
    "Por Cobrar (CXC)",
    "Por Pagar (CXP)",
  ];
  aoa1.push(headers);

  // Filas de Datos por Sucursal
  const tableStartRow = aoa1.length;
  sucursales.forEach((s) => {
    aoa1.push([
      s.nombre,
      s.sede,
      s.rnc || "N/D",
      s.clientesActivos,
      s.totalCartera,
      s.ingresosCobrados,
      s.facturado,
      s.totalGastos,
      s.utilidadNeta,
      s.margenPct / 100, // formato decimal para porcentaje Excel
      s.ticketPromedioCliente,
      s.ordenesCount,
      s.porCobrarTotal,
      s.cxpPendiente,
    ]);
  });

  // Fila Totalizadora
  const totalRowIndex = aoa1.length;
  aoa1.push([
    "TOTAL CONSOLIDADO RED",
    `${sucursales.length} Sedes`,
    "—",
    totalesCadena.cadenaClientesActivos,
    totalesCadena.cadenaTotalCartera,
    totalesCadena.cadenaCobrado,
    totalesCadena.cadenaFacturado,
    totalesCadena.cadenaGastos,
    totalesCadena.cadenaUtilidad,
    totalesCadena.cadenaMargen / 100,
    totalesCadena.cadenaTicketCliente,
    totalesCadena.cadenaOrdenes,
    totalesCadena.cadenaCXCTotal,
    totalesCadena.cadenaCXP,
  ]);

  aoa1.push([]);
  aoa1.push([`* Cifras expresadas en Pesos Dominicanos (RD$ / DOP). Generado desde el Panel de Propietario de Klynn.`]);

  const ws1 = XLSX.utils.aoa_to_sheet(aoa1);

  // Merge de Banner Principal y Subtítulo
  ws1["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } },
    // KPI 1
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },
    // KPI 2
    { s: { r: 3, c: 2 }, e: { r: 3, c: 3 } },
    { s: { r: 4, c: 2 }, e: { r: 4, c: 3 } },
    { s: { r: 5, c: 2 }, e: { r: 5, c: 3 } },
    // KPI 3
    { s: { r: 3, c: 4 }, e: { r: 3, c: 5 } },
    { s: { r: 4, c: 4 }, e: { r: 4, c: 5 } },
    { s: { r: 5, c: 4 }, e: { r: 5, c: 5 } },
    // KPI 4
    { s: { r: 3, c: 6 }, e: { r: 3, c: 7 } },
    { s: { r: 4, c: 6 }, e: { r: 4, c: 7 } },
    { s: { r: 5, c: 6 }, e: { r: 5, c: 7 } },
    // Título Tabla
    { s: { r: 7, c: 0 }, e: { r: 7, c: 13 } },
  ];

  // Ancho de columnas Hoja 1
  ws1["!cols"] = [
    { wch: 28 }, // Sucursal
    { wch: 18 }, // Sede
    { wch: 16 }, // RNC
    { wch: 16 }, // Clientes Activos
    { wch: 14 }, // Cartera Total
    { wch: 22 }, // Cobrado
    { wch: 20 }, // Facturado
    { wch: 18 }, // Gastos
    { wch: 20 }, // Utilidad Neta
    { wch: 14 }, // Margen %
    { wch: 18 }, // Ticket / Cli
    { wch: 12 }, // Órdenes
    { wch: 18 }, // CXC
    { wch: 18 }, // CXP
  ];

  // Estilos del Banner
  if (ws1["A1"]) {
    ws1["A1"].s = {
      font: { name: "Calibri", sz: 15, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1B4B73" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }
  if (ws1["A2"]) {
    ws1["A2"].s = {
      font: { name: "Calibri", sz: 10, italic: true, color: { rgb: "E2E8F0" } },
      fill: { fgColor: { rgb: "1B4B73" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }

  // Estilos de los 4 KPIs
  const kpiConfigs = [
    { col: "A", hBg: "047857", bBg: "ECFDF5", text: "065F46", isMoney: true },
    { col: "C", hBg: "BE123C", bBg: "FFF1F2", text: "9F1239", isMoney: true },
    { col: "E", hBg: "0D9488", bBg: "F0FDFA", text: "115E59", isMoney: true },
    { col: "G", hBg: "4338CA", bBg: "EEF2FF", text: "3730A3", isMoney: false },
  ];

  kpiConfigs.forEach((cfg) => {
    const c4 = ws1[`${cfg.col}4`];
    if (c4) {
      c4.s = {
        font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: cfg.hBg } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    }
    const c5 = ws1[`${cfg.col}5`];
    if (c5) {
      if (cfg.isMoney) c5.z = '"RD$ "#,##0.00';
      c5.s = {
        font: { name: "Calibri", sz: 14, bold: true, color: { rgb: cfg.text } },
        fill: { fgColor: { rgb: cfg.bBg } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    }
    const c6 = ws1[`${cfg.col}6`];
    if (c6) {
      c6.s = {
        font: { name: "Calibri", sz: 9, color: { rgb: "475569" } },
        fill: { fgColor: { rgb: cfg.bBg } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    }
  });

  // Título de la tabla
  if (ws1["A8"]) {
    ws1["A8"].s = {
      font: { name: "Calibri", sz: 12, bold: true, color: { rgb: "1B4B73" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { horizontal: "left", vertical: "center" },
    };
  }

  // Encabezados de Columnas (Fila 9 -> índice 8)
  for (let c = 0; c < headers.length; c++) {
    const cellRef = `${numToLetter(c)}9`;
    if (ws1[cellRef]) {
      ws1[cellRef].s = {
        font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1E293B" } },
        alignment: { horizontal: c >= 3 ? "right" : "left", vertical: "center" },
        border: borderThin,
      };
    }
  }

  // Formato para filas de datos por sucursal
  for (let r = tableStartRow; r < totalRowIndex; r++) {
    const isEven = (r - tableStartRow) % 2 === 0;
    const rowBg = isEven ? "FFFFFF" : "F8FAFC";

    for (let c = 0; c < headers.length; c++) {
      const cellRef = `${numToLetter(c)}${r + 1}`;
      const cell = ws1[cellRef];
      if (cell) {
        let align: "left" | "center" | "right" = "left";
        if (c === 1 || c === 2 || c === 3 || c === 4 || c === 11) align = "center";
        if (c >= 5 && c !== 11) align = "right";

        // Formatos numéricos
        if (c === 5 || c === 6 || c === 7 || c === 8 || c === 10 || c === 12 || c === 13) {
          cell.z = '"RD$ "#,##0.00';
        } else if (c === 9) {
          cell.z = "0.0%";
        } else if (c === 3 || c === 4 || c === 11) {
          cell.z = "#,##0";
        }

        cell.s = {
          font: { name: "Calibri", sz: 10, color: { rgb: "1E293B" } },
          fill: { fgColor: { rgb: rowBg } },
          alignment: { horizontal: align, vertical: "center" },
          border: borderThin,
        };
      }
    }
  }

  // Fila Totalizadora (Fila final)
  for (let c = 0; c < headers.length; c++) {
    const cellRef = `${numToLetter(c)}${totalRowIndex + 1}`;
    const cell = ws1[cellRef];
    if (cell) {
      if (c === 5 || c === 6 || c === 7 || c === 8 || c === 10 || c === 12 || c === 13) {
        cell.z = '"RD$ "#,##0.00';
      } else if (c === 9) {
        cell.z = "0.0%";
      } else if (c === 3 || c === 4 || c === 11) {
        cell.z = "#,##0";
      }

      cell.s = {
        font: { name: "Calibri", sz: 11, bold: true, color: { rgb: c === 8 ? "34D399" : "FFFFFF" } },
        fill: { fgColor: { rgb: "0F172A" } },
        alignment: { horizontal: c >= 3 ? "right" : "left", vertical: "center" },
        border: {
          top: { style: "double", color: { rgb: "94A3B8" } },
          bottom: { style: "double", color: { rgb: "94A3B8" } },
          left: borderThin.left,
          right: borderThin.right,
        },
      };
    }
  }

  XLSX.utils.book_append_sheet(wb, ws1, "Consolidado Sucursales");

  // ==========================================
  // HOJA 2: CUENTAS POR PAGAR (CXP) RED
  // ==========================================
  if (cxpList.length > 0) {
    const aoa2: any[][] = [];

    aoa2.push(["KLYNN CLOUD POS — CUENTAS POR PAGAR A SUPLIDORES (CXP RED)"]);
    aoa2.push([`Emisión: ${fechaEmision}  |  Facturas de Proveedores: ${cxpList.length}`]);
    aoa2.push([]);

    const cxpHeaders = [
      "Sucursal",
      "Suplidor / Proveedor",
      "RNC / Cédula",
      "Factura #",
      "NCF",
      "Fecha Emisión",
      "Fecha Vencimiento",
      "Estado Mora",
      "Monto Total (RD$)",
      "Monto Pagado (RD$)",
      "Saldo Pendiente (RD$)",
    ];
    aoa2.push(cxpHeaders);

    cxpList.forEach((f) => {
      aoa2.push([
        f.sucursal,
        f.suplidor,
        f.rnc || "N/D",
        f.numeroFactura,
        f.ncf || "N/D",
        f.fechaEmision,
        f.fechaVencimiento,
        f.estadoMora,
        f.total,
        f.montoPagado,
        f.saldoPendiente,
      ]);
    });

    // Fila Totalizadora CXP
    const totalCXP = cxpList.reduce((s, x) => s + x.total, 0);
    const totalPagadoCXP = cxpList.reduce((s, x) => s + x.montoPagado, 0);
    const totalSaldoCXP = cxpList.reduce((s, x) => s + x.saldoPendiente, 0);

    aoa2.push([
      "TOTAL GENERAL CXP",
      "—",
      "—",
      "—",
      "—",
      "—",
      "—",
      "—",
      totalCXP,
      totalPagadoCXP,
      totalSaldoCXP,
    ]);

    const ws2 = XLSX.utils.aoa_to_sheet(aoa2);

    ws2["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
    ];

    ws2["!cols"] = [
      { wch: 22 }, // Sucursal
      { wch: 28 }, // Suplidor
      { wch: 16 }, // RNC
      { wch: 16 }, // Factura #
      { wch: 16 }, // NCF
      { wch: 16 }, // Emisión
      { wch: 16 }, // Vencimiento
      { wch: 16 }, // Estado Mora
      { wch: 18 }, // Total
      { wch: 18 }, // Pagado
      { wch: 20 }, // Saldo Pendiente
    ];

    if (ws2["A1"]) {
      ws2["A1"].s = {
        font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1B4B73" } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    }
    if (ws2["A2"]) {
      ws2["A2"].s = {
        font: { name: "Calibri", sz: 10, italic: true, color: { rgb: "E2E8F0" } },
        fill: { fgColor: { rgb: "1B4B73" } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    }

    for (let c = 0; c < cxpHeaders.length; c++) {
      const cellRef = `${numToLetter(c)}4`;
      if (ws2[cellRef]) {
        ws2[cellRef].s = {
          font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "1E293B" } },
          alignment: { horizontal: c >= 8 ? "right" : "left", vertical: "center" },
          border: borderThin,
        };
      }
    }

    for (let r = 4; r < 4 + cxpList.length; r++) {
      const isEven = (r - 4) % 2 === 0;
      const rowBg = isEven ? "FFFFFF" : "F8FAFC";

      for (let c = 0; c < cxpHeaders.length; c++) {
        const cellRef = `${numToLetter(c)}${r + 1}`;
        const cell = ws2[cellRef];
        if (cell) {
          if (c >= 8) cell.z = '"RD$ "#,##0.00';
          cell.s = {
            font: { name: "Calibri", sz: 10, color: { rgb: "1E293B" } },
            fill: { fgColor: { rgb: rowBg } },
            alignment: { horizontal: c >= 8 ? "right" : c >= 5 && c <= 7 ? "center" : "left", vertical: "center" },
            border: borderThin,
          };
        }
      }
    }

    // Fila Totalizadora CXP
    const lastRowIndex = 4 + cxpList.length;
    for (let c = 0; c < cxpHeaders.length; c++) {
      const cellRef = `${numToLetter(c)}${lastRowIndex + 1}`;
      const cell = ws2[cellRef];
      if (cell) {
        if (c >= 8) cell.z = '"RD$ "#,##0.00';
        cell.s = {
          font: { name: "Calibri", sz: 11, bold: true, color: { rgb: c === 10 ? "F87171" : "FFFFFF" } },
          fill: { fgColor: { rgb: "0F172A" } },
          alignment: { horizontal: c >= 8 ? "right" : "left", vertical: "center" },
          border: {
            top: { style: "double", color: { rgb: "94A3B8" } },
            bottom: { style: "double", color: { rgb: "94A3B8" } },
          },
        };
      }
    }

    XLSX.utils.book_append_sheet(wb, ws2, "CXP Suplidores");
  }

  // Generar y descargar el archivo
  const dateSlug = new Date().toISOString().slice(0, 10);
  const cleanPeriod = periodoLabel.replace(/[\/\\?%*:|"<>]/g, "_").trim();
  const fileName = `Klynn_Consolidado_Multisede_${cleanPeriod}_${dateSlug}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
