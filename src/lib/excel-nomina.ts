import XLSX from "xlsx-js-style";
import type { PeriodoNomina, DetalleNomina } from "@/lib/storage";

export interface ExportNominaOptions {
  tenantName?: string;
  tenantRnc?: string;
  periodo: PeriodoNomina;
  detalles: DetalleNomina[];
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

export function exportNominaToExcel(options: ExportNominaOptions) {
  const {
    tenantName = "Klynn Lavandería",
    tenantRnc = "N/D",
    periodo,
    detalles = [],
  } = options;

  const wb = XLSX.utils.book_new();

  const fechaGeneracion = new Date().toLocaleDateString("es-DO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Cálculos consolidados para tarjetas KPI
  const totalNeto = detalles.reduce((acc, d) => acc + (d.neto_pagar || 0), 0);
  const totalBruto = detalles.reduce((acc, d) => acc + (d.total_ingresos || 0), 0);
  const totalDeducciones = detalles.reduce((acc, d) => acc + (d.total_deducciones || 0), 0);

  const bankDetalles = detalles.filter(
    (d) => d.metodo_pago === "TRANSFERENCIA" || Boolean(d.empleado?.numero_cuenta_banco)
  );
  const totalTransferencias = bankDetalles.reduce((acc, d) => acc + (d.neto_pagar || 0), 0);
  const totalEfectivo = detalles
    .filter((d) => d.metodo_pago === "EFECTIVO" && !d.empleado?.numero_cuenta_banco)
    .reduce((acc, d) => acc + (d.neto_pagar || 0), 0);

  // =========================================================================
  // HOJA 1: NÓMINA DETALLADA & LIQUIDACIÓN LABORAL
  // =========================================================================
  const aoaNomina: any[][] = [];

  const headers = [
    "Empleado",
    "Cédula / Documento",
    "Cargo / Rol",
    "Sueldo Base",
    "H. Extras (+35%)",
    "Comisiones / Piezas",
    "Bonos / Otros",
    "Total Bruto",
    "Anticipos / Vales",
    "AFP (2.87%)",
    "SFS (3.04%)",
    "ISR (DGII)",
    "Otras Deduc.",
    "Total Deduc.",
    "Neto a Pagar",
    "Método Pago",
    "Banco Destino",
    "No. de Cuenta",
    "Firma de Recibido",
  ];

  const totalCols = headers.length; // 19 columnas (A hasta S)

  // Fila 0: Banner Institucional Principal
  aoaNomina.push(["KLYNN CLOUD POS — PLANILLA OFICIAL DE NÓMINA Y COMPENSACIÓN"]);

  // Fila 1: Subtítulo con Metadatos del Período
  aoaNomina.push([
    `Empresa: ${tenantName}  |  RNC: ${tenantRnc}  |  Período: ${periodo.nombre.toUpperCase()} (${periodo.fecha_inicio} al ${periodo.fecha_fin})  |  Fecha de Pago: ${periodo.fecha_pago}  |  Estado: ${periodo.estado}  |  Emisión: ${fechaGeneracion}`,
  ]);

  // Fila 2: Espacio separador
  aoaNomina.push([]);

  // Filas 3-5: 4 Tarjetas KPI Ejecutivas (Distribuidas en Cols A-D, E-I, J-N, O-S)
  // Tarjeta 1: A-D (4 cols) -> Total Neto a Pagar
  // Tarjeta 2: E-I (5 cols) -> Total Ingresos Brutos
  // Tarjeta 3: J-N (5 cols) -> Retenciones & Deducciones
  // Tarjeta 4: O-S (5 cols) -> Dispersión Bancaria
  const kpiRow1: any[] = new Array(totalCols).fill("");
  const kpiRow2: any[] = new Array(totalCols).fill("");
  const kpiRow3: any[] = new Array(totalCols).fill("");

  // Card 1: TOTAL NETO A PAGAR
  kpiRow1[0] = "TOTAL NETO A PAGAR";
  kpiRow2[0] = totalNeto;
  kpiRow3[0] = `${detalles.length} Colaboradores en planilla`;

  // Card 2: TOTAL INGRESOS BRUTOS
  kpiRow1[4] = "TOTAL INGRESOS BRUTOS";
  kpiRow2[4] = totalBruto;
  kpiRow3[4] = "Sueldos Base + H. Extras + Comisiones";

  // Card 3: RETENCIONES & DEDUCCIONES
  kpiRow1[9] = "RETENCIONES Y DEDUCCIONES";
  kpiRow2[9] = totalDeducciones;
  kpiRow3[9] = "TSS (5.91%) + ISR DGII + Anticipos Vales";

  // Card 4: DISPERSIÓN BANCARIA
  kpiRow1[14] = "DISPERSIÓN BANCARIA (BANCOS)";
  kpiRow2[14] = totalTransferencias;
  kpiRow3[14] = `${bankDetalles.length} bancarios · ${detalles.length - bankDetalles.length} en efectivo`;

  aoaNomina.push(kpiRow1);
  aoaNomina.push(kpiRow2);
  aoaNomina.push(kpiRow3);

  // Fila 6: Separador
  aoaNomina.push([]);

  // Fila 7: Título de Sección 1
  const sec1RowIdx = aoaNomina.length;
  aoaNomina.push(["1. DETALLE INDIVIDUAL DE PLANILLA Y LIQUIDACIÓN LABORAL"]);

  // Fila 8: Cabecera de la tabla
  const headerRowIndex = aoaNomina.length;
  aoaNomina.push(headers);

  // Filas de datos
  const dataStartRow = aoaNomina.length;
  detalles.forEach((d) => {
    const emp = d.empleado;
    const nombreCompleto = emp
      ? `${emp.nombre} ${emp.apellido || ""}`.trim()
      : "Empleado";
    const docIdentidad = emp?.cedula || emp?.email || "N/D";
    const cargo = (emp?.rol || "OPERARIO").toUpperCase();
    const metodo = d.metodo_pago || (emp?.numero_cuenta_banco ? "TRANSFERENCIA" : "EFECTIVO");
    const banco = emp?.banco_nombre ? emp.banco_nombre.replace(/_/g, " ") : (metodo === "EFECTIVO" ? "Efectivo" : "N/D");
    const cuenta = emp?.numero_cuenta_banco || (metodo === "EFECTIVO" ? "Pago en Caja" : "N/D");

    aoaNomina.push([
      nombreCompleto,
      docIdentidad,
      cargo,
      d.salario_base_periodo || 0,
      d.horas_extras || 0,
      d.comisiones_destajo || 0,
      (d.bonos_incentivos || 0) + (d.otros_ingresos || 0),
      d.total_ingresos || 0,
      d.anticipos_descontados || 0,
      d.tss_afp || 0,
      d.tss_sfs || 0,
      d.isr_retencion || 0,
      d.otras_deducciones || 0,
      d.total_deducciones || 0,
      d.neto_pagar || 0,
      metodo,
      banco,
      cuenta,
      "", // Espacio para firma física
    ]);
  });
  const dataEndRow = aoaNomina.length - 1;

  // Fila de Totales
  const totalRowIndex = aoaNomina.length;
  aoaNomina.push([
    "TOTALES GENERALES",
    "",
    `${detalles.length} Colaboradores`,
    detalles.reduce((a, b) => a + (b.salario_base_periodo || 0), 0),
    detalles.reduce((a, b) => a + (b.horas_extras || 0), 0),
    detalles.reduce((a, b) => a + (b.comisiones_destajo || 0), 0),
    detalles.reduce((a, b) => a + ((b.bonos_incentivos || 0) + (b.otros_ingresos || 0)), 0),
    totalBruto,
    detalles.reduce((a, b) => a + (b.anticipos_descontados || 0), 0),
    detalles.reduce((a, b) => a + (b.tss_afp || 0), 0),
    detalles.reduce((a, b) => a + (b.tss_sfs || 0), 0),
    detalles.reduce((a, b) => a + (b.isr_retencion || 0), 0),
    detalles.reduce((a, b) => a + (b.otras_deducciones || 0), 0),
    totalDeducciones,
    totalNeto,
    "",
    "",
    "",
    "",
  ]);

  // Fila de espacio + Fila de Nota de pie de página
  aoaNomina.push([]);
  const footerRowIndex = aoaNomina.length;
  aoaNomina.push([
    "Documento oficial emitido por Klynn Cloud POS · Sistema de Nómina y Liquidación Laboral conforme al Código de Trabajo (Ley 16-92) y Sistema de Seguridad Social (Ley 87-01) de la República Dominicana.",
  ]);

  const wsNomina = XLSX.utils.aoa_to_sheet(aoaNomina);

  // CONFIGURACIÓN DE COMBINACIÓN DE CELDAS (MERGES)
  const mergesNomina = [
    // Título institucional (Cols 0-18)
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
    // Subtítulo (Cols 0-18)
    { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },

    // Tarjeta 1: Total Neto (Cols 0-3)
    { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 3 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 3 } },

    // Tarjeta 2: Total Bruto (Cols 4-8)
    { s: { r: 3, c: 4 }, e: { r: 3, c: 8 } },
    { s: { r: 4, c: 4 }, e: { r: 4, c: 8 } },
    { s: { r: 5, c: 4 }, e: { r: 5, c: 8 } },

    // Tarjeta 3: Deducciones (Cols 9-13)
    { s: { r: 3, c: 9 }, e: { r: 3, c: 13 } },
    { s: { r: 4, c: 9 }, e: { r: 4, c: 13 } },
    { s: { r: 5, c: 9 }, e: { r: 5, c: 13 } },

    // Tarjeta 4: Dispersión Bancaria (Cols 14-18)
    { s: { r: 3, c: 14 }, e: { r: 3, c: 18 } },
    { s: { r: 4, c: 14 }, e: { r: 4, c: 18 } },
    { s: { r: 5, c: 14 }, e: { r: 5, c: 18 } },

    // Título Sección 1 (Cols 0-18)
    { s: { r: sec1RowIdx, c: 0 }, e: { r: sec1RowIdx, c: totalCols - 1 } },

    // Fila de Totales: Combinar columnas Empleado y Cédula
    { s: { r: totalRowIndex, c: 0 }, e: { r: totalRowIndex, c: 1 } },

    // Pie de página
    { s: { r: footerRowIndex, c: 0 }, e: { r: footerRowIndex, c: totalCols - 1 } },
  ];
  wsNomina["!merges"] = mergesNomina;

  // ALTURA DE FILAS (Row Heights)
  const rowsNomina: any[] = [];
  rowsNomina[0] = { hpt: 32 }; // Título
  rowsNomina[1] = { hpt: 22 }; // Subtítulo
  rowsNomina[2] = { hpt: 10 }; // Separador
  rowsNomina[3] = { hpt: 16 }; // KPI Título
  rowsNomina[4] = { hpt: 24 }; // KPI Valor
  rowsNomina[5] = { hpt: 16 }; // KPI Nota
  rowsNomina[6] = { hpt: 10 }; // Separador
  rowsNomina[sec1RowIdx] = { hpt: 22 }; // Título sección 1
  rowsNomina[headerRowIndex] = { hpt: 26 }; // Cabecera tabla

  for (let r = dataStartRow; r <= dataEndRow; r++) {
    rowsNomina[r] = { hpt: 22 };
  }
  rowsNomina[totalRowIndex] = { hpt: 26 }; // Totales
  rowsNomina[footerRowIndex] = { hpt: 18 }; // Footer
  wsNomina["!rows"] = rowsNomina;

  // ESTILIZACIÓN VISUAL DE HOJA 1
  // 1. Título institucional
  const titleCell = wsNomina["A1"];
  if (titleCell) {
    titleCell.s = {
      font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1B4B73" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }

  // 2. Subtítulo con metadatos
  const subCell = wsNomina["A2"];
  if (subCell) {
    subCell.s = {
      font: { name: "Calibri", sz: 9.5, bold: true, color: { rgb: "1E293B" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: { bottom: { style: "thin", color: { rgb: "CBD5E1" } } },
    };
  }

  // 3. Estilo de las 4 Tarjetas KPI
  const kpiConfigs = [
    { startCol: 0, endCol: 3, bg: "ECFDF5", textCol: "065F46", valCol: "047857", barCol: "047857" }, // Emerald (Neto)
    { startCol: 4, endCol: 8, bg: "EFF6FF", textCol: "1B4B73", valCol: "1E40AF", barCol: "1B4B73" }, // Navy (Bruto)
    { startCol: 9, endCol: 13, bg: "FFF1F2", textCol: "9F1239", valCol: "BE123C", barCol: "BE123C" }, // Rose (Deducciones)
    { startCol: 14, endCol: 18, bg: "EEF2FF", textCol: "3730A3", valCol: "4338CA", barCol: "4338CA" }, // Indigo (Bancos)
  ];

  kpiConfigs.forEach((kpi) => {
    for (let c = kpi.startCol; c <= kpi.endCol; c++) {
      const colL = getColumnLetter(c);

      // Fila 4 (Título KPI)
      const cTitle = wsNomina[`${colL}4`];
      if (cTitle) {
        cTitle.s = {
          font: { name: "Calibri", sz: 9, bold: true, color: { rgb: kpi.textCol } },
          fill: { fgColor: { rgb: kpi.bg } },
          alignment: { horizontal: "center", vertical: "center" },
          border: { top: { style: "thin", color: { rgb: "CBD5E1" } } },
        };
      }

      // Fila 5 (Valor KPI)
      const cVal = wsNomina[`${colL}5`];
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

      // Fila 6 (Subtexto / Nota KPI)
      const cNote = wsNomina[`${colL}6`];
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

  // 4. Título de Sección 1
  const s1Cell = wsNomina[`A${sec1RowIdx + 1}`];
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

  // 5. Cabeceras de la tabla (Fila 9)
  headers.forEach((_, cIdx) => {
    const colLetter = getColumnLetter(cIdx);
    const cellRef = `${colLetter}${headerRowIndex + 1}`;
    const cell = wsNomina[cellRef];
    if (cell) {
      const isNeto = cIdx === 14;
      const isEmpleado = cIdx === 0;

      cell.s = {
        font: { name: "Calibri", sz: 9.5, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: isNeto ? "047857" : isEmpleado ? "0F172A" : "1B4B73" } },
        alignment: {
          horizontal: cIdx >= 3 && cIdx <= 14 ? "right" : cIdx === 2 || cIdx >= 15 ? "center" : "left",
          vertical: "center",
        },
        border: {
          top: { style: "thin", color: { rgb: "0F172A" } },
          bottom: { style: "medium", color: { rgb: "0F172A" } },
        },
      };
    }
  });

  // 6. Filas de datos
  for (let r = dataStartRow; r <= dataEndRow; r++) {
    const rowNum = r + 1;
    const isEven = (r - dataStartRow) % 2 === 0;
    const rowBg = isEven ? "FFFFFF" : "F8FAFC";

    headers.forEach((_, cIdx) => {
      const colLetter = getColumnLetter(cIdx);
      const cellRef = `${colLetter}${rowNum}`;
      const cell = wsNomina[cellRef];
      if (cell) {
        const isNumeric = cIdx >= 3 && cIdx <= 14;
        const isNeto = cIdx === 14;
        const isAnticipos = cIdx === 8;

        cell.s = {
          font: {
            name: "Calibri",
            sz: 9.5,
            bold: cIdx === 0 || isNeto,
            color: { rgb: isNeto ? "047857" : "1E293B" },
          },
          fill: { fgColor: { rgb: isNeto ? "ECFDF5" : rowBg } },
          alignment: {
            horizontal: isNumeric ? "right" : cIdx === 2 || cIdx >= 15 ? "center" : "left",
            vertical: "center",
          },
          border: {
            top: { style: "thin", color: { rgb: "E2E8F0" } },
            bottom: { style: "thin", color: { rgb: "E2E8F0" } },
            left: { style: "thin", color: { rgb: "E2E8F0" } },
            right: { style: "thin", color: { rgb: "E2E8F0" } },
          },
        };

        if (isNumeric) {
          cell.z = '"RD$ "#,##0.00';
        }

        // Resaltar anticipos con deducción activa
        if (isAnticipos && typeof cell.v === "number" && cell.v > 0) {
          cell.s.font.color = { rgb: "BE123C" };
          cell.s.font.bold = true;
        }
      }
    });
  }

  // 7. Fila de Totales
  const totalRowNum = totalRowIndex + 1;
  headers.forEach((_, cIdx) => {
    const colLetter = getColumnLetter(cIdx);
    const cellRef = `${colLetter}${totalRowNum}`;
    const cell = wsNomina[cellRef];
    if (cell) {
      const isNeto = cIdx === 14;

      cell.s = {
        font: {
          name: "Calibri",
          sz: isNeto ? 10.5 : 10,
          bold: true,
          color: { rgb: "FFFFFF" },
        },
        fill: { fgColor: { rgb: isNeto ? "047857" : "0F172A" } },
        alignment: {
          horizontal: cIdx >= 3 && cIdx <= 14 ? "right" : cIdx === 2 ? "center" : "left",
          vertical: "center",
        },
        border: {
          top: { style: "thin", color: { rgb: "475569" } },
          bottom: { style: "double", color: { rgb: "0F172A" } },
        },
      };

      if (cIdx >= 3 && cIdx <= 14) {
        cell.z = '"RD$ "#,##0.00';
      }
    }
  });

  // 8. Nota institucional al pie
  const footerCell = wsNomina[`A${footerRowIndex + 1}`];
  if (footerCell) {
    footerCell.s = {
      font: { name: "Calibri", sz: 8.5, italic: true, color: { rgb: "64748B" } },
      alignment: { horizontal: "left", vertical: "center" },
    };
  }

  // Anchos de columna holgados y proporcionales
  wsNomina["!cols"] = [
    { wch: 28 }, // Empleado
    { wch: 22 }, // Cédula / Documento
    { wch: 16 }, // Cargo / Rol
    { wch: 16 }, // Sueldo Base
    { wch: 16 }, // H. Extras (+35%)
    { wch: 18 }, // Comisiones / Piezas
    { wch: 15 }, // Bonos / Otros
    { wch: 17 }, // Total Bruto
    { wch: 16 }, // Anticipos / Vales
    { wch: 14 }, // AFP (2.87%)
    { wch: 14 }, // SFS (3.04%)
    { wch: 14 }, // ISR (DGII)
    { wch: 14 }, // Otras Deduc.
    { wch: 16 }, // Total Deduc.
    { wch: 19 }, // Neto a Pagar
    { wch: 16 }, // Método Pago
    { wch: 18 }, // Banco Destino
    { wch: 20 }, // No. de Cuenta
    { wch: 26 }, // Firma de Recibido
  ];

  XLSX.utils.book_append_sheet(wb, wsNomina, "Nómina Detallada");

  // =========================================================================
  // HOJA 2: DISPERSIÓN BANCARIA (TRANSFERENCIAS MASIVAS)
  // =========================================================================
  const aoaDispersion: any[][] = [];

  const headersDispersion = [
    "No.",
    "Nombre del Beneficiario",
    "Cédula / Documento",
    "Banco Destino",
    "Tipo de Cuenta",
    "Número de Cuenta",
    "Monto a Transferir (RD$)",
    "Concepto / Referencia",
  ];

  const totalColsBank = headersDispersion.length; // 8 columnas

  aoaDispersion.push(["KLYNN CLOUD POS — DISPERSIÓN BANCARIA DE NÓMINA (ACH / TRANSFERENCIAS)"]);
  aoaDispersion.push([
    `Empresa: ${tenantName}  |  RNC: ${tenantRnc}  |  Período: ${periodo.nombre.toUpperCase()}  |  Fecha de Transferencia: ${periodo.fecha_pago}  |  Emisión: ${fechaGeneracion}`,
  ]);
  aoaDispersion.push([]); // Separador

  // Tarjetas KPI de Dispersión
  const kpiBank1: any[] = new Array(totalColsBank).fill("");
  const kpiBank2: any[] = new Array(totalColsBank).fill("");
  const kpiBank3: any[] = new Array(totalColsBank).fill("");

  kpiBank1[0] = "TOTAL A TRANSFERIR (BANCOS)";
  kpiBank2[0] = totalTransferencias;
  kpiBank3[0] = `${bankDetalles.length} Cuentas bancarias programadas`;

  kpiBank1[4] = "TOTAL EFECTIVO / CAJA";
  kpiBank2[4] = totalEfectivo;
  kpiBank3[4] = `${detalles.length - bankDetalles.length} Pagos para entrega física en caja`;

  aoaDispersion.push(kpiBank1);
  aoaDispersion.push(kpiBank2);
  aoaDispersion.push(kpiBank3);
  aoaDispersion.push([]); // Separador

  const secBankRowIdx = aoaDispersion.length;
  aoaDispersion.push(["1. LISTA DE BENEFICIARIOS PARA TRANSFERENCIA BANCARIA"]);

  const headerBankRowIdx = aoaDispersion.length;
  aoaDispersion.push(headersDispersion);

  const dataBankStartRow = aoaDispersion.length;
  bankDetalles.forEach((d, idx) => {
    const emp = d.empleado;
    const nombreCompleto = emp
      ? `${emp.nombre} ${emp.apellido || ""}`.trim()
      : "Beneficiario";
    const docIdentidad = emp?.cedula || emp?.email || "N/D";
    const banco = emp?.banco_nombre ? emp.banco_nombre.replace(/_/g, " ") : "BANCO POPULAR";
    const tipoCuenta = emp?.tipo_cuenta_banco || "AHORROS";
    const numCuenta = emp?.numero_cuenta_banco || "";

    aoaDispersion.push([
      idx + 1,
      nombreCompleto,
      docIdentidad,
      banco,
      tipoCuenta,
      numCuenta,
      d.neto_pagar || 0,
      `PAGO NOMINA ${periodo.nombre.toUpperCase()}`,
    ]);
  });
  const dataBankEndRow = aoaDispersion.length - 1;

  // Fila de Totales de Dispersión
  const totalBankRowIdx = aoaDispersion.length;
  aoaDispersion.push([
    "TOTAL A DISPERSAR",
    "",
    "",
    "",
    "",
    `${bankDetalles.length} Cuentas`,
    totalTransferencias,
    "",
  ]);

  aoaDispersion.push([]);
  const footerBankRowIdx = aoaDispersion.length;
  aoaDispersion.push([
    "Formato compatible con plataformas de pago masivo de nómina bancaria (Internet Banking Empresarial / ACH República Dominicana).",
  ]);

  const wsDispersion = XLSX.utils.aoa_to_sheet(aoaDispersion);

  wsDispersion["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalColsBank - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: totalColsBank - 1 } },
    // KPI 1
    { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 3 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 3 } },
    // KPI 2
    { s: { r: 3, c: 4 }, e: { r: 3, c: 7 } },
    { s: { r: 4, c: 4 }, e: { r: 4, c: 7 } },
    { s: { r: 5, c: 4 }, e: { r: 5, c: 7 } },
    // Sección
    { s: { r: secBankRowIdx, c: 0 }, e: { r: secBankRowIdx, c: totalColsBank - 1 } },
    // Totales
    { s: { r: totalBankRowIdx, c: 0 }, e: { r: totalBankRowIdx, c: 4 } },
    // Footer
    { s: { r: footerBankRowIdx, c: 0 }, e: { r: footerBankRowIdx, c: totalColsBank - 1 } },
  ];

  const rowsBank: any[] = [];
  rowsBank[0] = { hpt: 32 };
  rowsBank[1] = { hpt: 22 };
  rowsBank[2] = { hpt: 10 };
  rowsBank[3] = { hpt: 16 };
  rowsBank[4] = { hpt: 24 };
  rowsBank[5] = { hpt: 16 };
  rowsBank[6] = { hpt: 10 };
  rowsBank[secBankRowIdx] = { hpt: 22 };
  rowsBank[headerBankRowIdx] = { hpt: 26 };
  for (let r = dataBankStartRow; r <= dataBankEndRow; r++) {
    rowsBank[r] = { hpt: 22 };
  }
  rowsBank[totalBankRowIdx] = { hpt: 26 };
  rowsBank[footerBankRowIdx] = { hpt: 18 };
  wsDispersion["!rows"] = rowsBank;

  // Estilos Hoja 2
  const titleBankCell = wsDispersion["A1"];
  if (titleBankCell) {
    titleBankCell.s = {
      font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1B4B73" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }

  const subBankCell = wsDispersion["A2"];
  if (subBankCell) {
    subBankCell.s = {
      font: { name: "Calibri", sz: 9.5, bold: true, color: { rgb: "1E293B" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: { bottom: { style: "thin", color: { rgb: "CBD5E1" } } },
    };
  }

  // Tarjetas KPI de Dispersión
  const kpiBankConfigs = [
    { startCol: 0, endCol: 3, bg: "ECFDF5", textCol: "065F46", valCol: "047857", barCol: "047857" },
    { startCol: 4, endCol: 7, bg: "EFF6FF", textCol: "1B4B73", valCol: "1E40AF", barCol: "1B4B73" },
  ];

  kpiBankConfigs.forEach((kpi) => {
    for (let c = kpi.startCol; c <= kpi.endCol; c++) {
      const colL = getColumnLetter(c);
      const cTitle = wsDispersion[`${colL}4`];
      if (cTitle) {
        cTitle.s = {
          font: { name: "Calibri", sz: 9, bold: true, color: { rgb: kpi.textCol } },
          fill: { fgColor: { rgb: kpi.bg } },
          alignment: { horizontal: "center", vertical: "center" },
          border: { top: { style: "thin", color: { rgb: "CBD5E1" } } },
        };
      }
      const cVal = wsDispersion[`${colL}5`];
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
      const cNote = wsDispersion[`${colL}6`];
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

  const secBankCell = wsDispersion[`A${secBankRowIdx + 1}`];
  if (secBankCell) {
    secBankCell.s = {
      font: { name: "Calibri", sz: 10.5, bold: true, color: { rgb: "1B4B73" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { horizontal: "left", vertical: "center" },
      border: {
        top: { style: "medium", color: { rgb: "1B4B73" } },
        bottom: { style: "thin", color: { rgb: "CBD5E1" } },
      },
    };
  }

  // Cabeceras Dispersión
  headersDispersion.forEach((_, cIdx) => {
    const colLetter = getColumnLetter(cIdx);
    const cellRef = `${colLetter}${headerBankRowIdx + 1}`;
    const cell = wsDispersion[cellRef];
    if (cell) {
      const isMonto = cIdx === 6;
      cell.s = {
        font: { name: "Calibri", sz: 9.5, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: isMonto ? "047857" : "1B4B73" } },
        alignment: {
          horizontal: isMonto ? "right" : cIdx === 0 || cIdx === 4 ? "center" : "left",
          vertical: "center",
        },
        border: {
          top: { style: "thin", color: { rgb: "0F172A" } },
          bottom: { style: "medium", color: { rgb: "0F172A" } },
        },
      };
    }
  });

  // Filas de datos Dispersión
  for (let r = dataBankStartRow; r <= dataBankEndRow; r++) {
    const rowNum = r + 1;
    const isEven = (r - dataBankStartRow) % 2 === 0;
    const rowBg = isEven ? "FFFFFF" : "F8FAFC";

    headersDispersion.forEach((_, cIdx) => {
      const colLetter = getColumnLetter(cIdx);
      const cellRef = `${colLetter}${rowNum}`;
      const cell = wsDispersion[cellRef];
      if (cell) {
        const isMonto = cIdx === 6;

        cell.s = {
          font: {
            name: "Calibri",
            sz: 9.5,
            bold: isMonto,
            color: { rgb: isMonto ? "047857" : "1E293B" },
          },
          fill: { fgColor: { rgb: isMonto ? "ECFDF5" : rowBg } },
          alignment: {
            horizontal: isMonto ? "right" : cIdx === 0 || cIdx === 4 ? "center" : "left",
            vertical: "center",
          },
          border: {
            top: { style: "thin", color: { rgb: "E2E8F0" } },
            bottom: { style: "thin", color: { rgb: "E2E8F0" } },
            left: { style: "thin", color: { rgb: "E2E8F0" } },
            right: { style: "thin", color: { rgb: "E2E8F0" } },
          },
        };

        if (isMonto) {
          cell.z = '"RD$ "#,##0.00';
        }
      }
    });
  }

  // Fila Totales Dispersión
  const totalBankRowNum = totalBankRowIdx + 1;
  headersDispersion.forEach((_, cIdx) => {
    const colLetter = getColumnLetter(cIdx);
    const cellRef = `${colLetter}${totalBankRowNum}`;
    const cell = wsDispersion[cellRef];
    if (cell) {
      const isMonto = cIdx === 6;
      cell.s = {
        font: {
          name: "Calibri",
          sz: isMonto ? 10.5 : 10,
          bold: true,
          color: { rgb: "FFFFFF" },
        },
        fill: { fgColor: { rgb: isMonto ? "047857" : "0F172A" } },
        alignment: {
          horizontal: isMonto ? "right" : cIdx === 5 ? "center" : "left",
          vertical: "center",
        },
        border: {
          top: { style: "thin", color: { rgb: "475569" } },
          bottom: { style: "double", color: { rgb: "0F172A" } },
        },
      };

      if (isMonto) {
        cell.z = '"RD$ "#,##0.00';
      }
    }
  });

  const footerBankCell = wsDispersion[`A${footerBankRowIdx + 1}`];
  if (footerBankCell) {
    footerBankCell.s = {
      font: { name: "Calibri", sz: 8.5, italic: true, color: { rgb: "64748B" } },
      alignment: { horizontal: "left", vertical: "center" },
    };
  }

  wsDispersion["!cols"] = [
    { wch: 6 },  // No.
    { wch: 30 }, // Beneficiario
    { wch: 22 }, // Documento
    { wch: 20 }, // Banco Destino
    { wch: 16 }, // Tipo de Cuenta
    { wch: 24 }, // Número de Cuenta
    { wch: 20 }, // Monto
    { wch: 34 }, // Concepto
  ];

  XLSX.utils.book_append_sheet(wb, wsDispersion, "Dispersión Bancaria");

  // Descarga del archivo
  const safeName = periodo.nombre.replace(/[^a-zA-Z0-9]/g, "_");
  XLSX.writeFile(wb, `Nomina_${safeName}.xlsx`);
}
