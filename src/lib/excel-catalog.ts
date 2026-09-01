import XLSX from "xlsx-js-style";
import type { CatalogoItem, Servicio } from "./storage";

export interface ParsedPrendaItem {
  id?: string;
  categoria: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  precios_servicios?: Record<string, number>;
  por_libra: boolean;
  is_exento: boolean;
  activo: boolean;
  permitir_desglose?: boolean;
  permitir_editar_precio?: boolean;
  icono?: string;
  imagen_url?: string;
  es_nueva?: boolean;
}

export interface ParsedServicioItem {
  id?: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  por_libra?: boolean;
  is_exento: boolean;
  activo: boolean;
  permitir_desglose?: boolean;
  permitir_editar_precio?: boolean;
  icono?: string;
  imagen_url?: string;
  es_nuevo?: boolean;
}

export interface ExcelParseResult {
  prendas: ParsedPrendaItem[];
  servicios: ParsedServicioItem[];
  errors: string[];
}

/**
 * Aplica fondo azul añil primario de Klynn (#1B4B73), texto blanco en negrita,
 * alineación centrada y bordes a los encabezados de la hoja.
 */
function applyPrimaryHeaderStyles(sheet: XLSX.WorkSheet) {
  if (!sheet["!ref"]) return;
  const range = XLSX.utils.decode_range(sheet["!ref"]);

  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!sheet[address]) continue;

    sheet[address].s = {
      fill: {
        fgColor: { rgb: "1B4B73" },
      },
      font: {
        name: "Calibri",
        sz: 11,
        bold: true,
        color: { rgb: "FFFFFF" },
      },
      alignment: {
        vertical: "center",
        horizontal: "center",
        wrapText: true,
      },
      border: {
        top: { style: "thin", color: { rgb: "143A59" } },
        bottom: { style: "medium", color: { rgb: "0F2C44" } },
        left: { style: "thin", color: { rgb: "143A59" } },
        right: { style: "thin", color: { rgb: "143A59" } },
      },
    };
  }
}

/**
 * Descarga la plantilla de PRENDAS en blanco (0 filas de datos),
 * con encabezados simples y directos para crear prendas de forma fácil.
 * 
 * Nombre de archivo: Plantilla_Prendas.xlsx
 * Nombre de la hoja: Plantilla Prendas
 */
export function downloadPrendasTemplate() {
  const wb = XLSX.utils.book_new();

  const headers = [
    "Categoría",
    "Nombre de Prenda",
    "Descripción",
    "Precio (RD$)",
    "Por Libra (SI/NO)",
    "Exento ITBIS (SI/NO)",
  ];

  const sheet = XLSX.utils.aoa_to_sheet([headers]);
  sheet["!cols"] = [
    { wch: 22 }, // Categoría
    { wch: 28 }, // Nombre de Prenda
    { wch: 32 }, // Descripción
    { wch: 18 }, // Precio (RD$)
    { wch: 18 }, // Por Libra (SI/NO)
    { wch: 20 }, // Exento ITBIS (SI/NO)
  ];
  applyPrimaryHeaderStyles(sheet);
  XLSX.utils.book_append_sheet(wb, sheet, "Plantilla Prendas");
  XLSX.writeFile(wb, "Plantilla_Prendas.xlsx");
}

/**
 * Exporta las prendas actuales a Excel (.xlsx)
 */
export function exportPrendasToExcel(
  items: CatalogoItem[],
  tenantName: string = "Lavanderia",
) {
  const wb = XLSX.utils.book_new();

  const data = items.map((p) => ({
    "ID (No Modificar)": p.id || "",
    "Categoría": p.categoria || "General",
    "Nombre de Prenda": p.nombre || "",
    "Descripción": p.descripcion || "",
    "Precio (RD$)": p.precio || 0,
    "Por Libra (SI/NO)": p.por_libra ? "SI" : "NO",
    "Exento ITBIS (SI/NO)": p.is_exento ? "SI" : "NO",
  }));

  const sheet = XLSX.utils.json_to_sheet(
    data.length > 0
      ? data
      : [
          {
            "ID (No Modificar)": "",
            Categoría: "",
            "Nombre de Prenda": "",
            Descripción: "",
            "Precio (RD$)": "",
            "Por Libra (SI/NO)": "",
            "Exento ITBIS (SI/NO)": "",
          },
        ],
  );

  sheet["!cols"] = [
    { wch: 24 }, // ID
    { wch: 22 }, // Categoría
    { wch: 28 }, // Nombre de Prenda
    { wch: 32 }, // Descripción
    { wch: 18 }, // Precio (RD$)
    { wch: 18 }, // Por Libra (SI/NO)
    { wch: 20 }, // Exento ITBIS (SI/NO)
  ];

  applyPrimaryHeaderStyles(sheet);
  XLSX.utils.book_append_sheet(wb, sheet, "Prendas");

  const safeName = tenantName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `Prendas_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Descarga la plantilla de SERVICIOS en blanco (0 filas de datos),
 * con encabezados simples y directos para crear servicios de forma fácil.
 * 
 * Nombre de archivo: Plantilla_Servicios.xlsx
 * Nombre de la hoja: Plantilla Servicios
 */
export function downloadServiciosTemplate() {
  const wb = XLSX.utils.book_new();

  const headers = [
    "Nombre de Servicio",
    "Descripción",
    "Precio (RD$)",
    "Por Libra (SI/NO)",
    "Exento ITBIS (SI/NO)",
  ];

  const sheet = XLSX.utils.aoa_to_sheet([headers]);
  sheet["!cols"] = [
    { wch: 28 }, // Nombre de Servicio
    { wch: 32 }, // Descripción
    { wch: 18 }, // Precio (RD$)
    { wch: 18 }, // Por Libra (SI/NO)
    { wch: 20 }, // Exento ITBIS (SI/NO)
  ];
  applyPrimaryHeaderStyles(sheet);
  XLSX.utils.book_append_sheet(wb, sheet, "Plantilla Servicios");
  XLSX.writeFile(wb, "Plantilla_Servicios.xlsx");
}

/**
 * Exporta los servicios actuales a Excel (.xlsx)
 */
export function exportServiciosToExcel(
  servicios: Servicio[],
  tenantName: string = "Lavanderia",
) {
  const wb = XLSX.utils.book_new();

  const data = servicios.map((s) => ({
    "ID (No Modificar)": s.id || "",
    "Nombre de Servicio": s.nombre || "",
    "Descripción": s.descripcion || "",
    "Precio (RD$)": s.precio || 0,
    "Por Libra (SI/NO)": s.por_libra ? "SI" : "NO",
    "Exento ITBIS (SI/NO)": s.is_exento ? "SI" : "NO",
  }));

  const sheet = XLSX.utils.json_to_sheet(
    data.length > 0
      ? data
      : [
          {
            "ID (No Modificar)": "",
            "Nombre de Servicio": "",
            Descripción: "",
            "Precio (RD$)": "",
            "Por Libra (SI/NO)": "",
            "Exento ITBIS (SI/NO)": "",
          },
        ],
  );

  sheet["!cols"] = [
    { wch: 24 }, // ID
    { wch: 28 }, // Nombre de Servicio
    { wch: 32 }, // Descripción
    { wch: 18 }, // Precio (RD$)
    { wch: 18 }, // Por Libra (SI/NO)
    { wch: 20 }, // Exento ITBIS (SI/NO)
  ];

  applyPrimaryHeaderStyles(sheet);
  XLSX.utils.book_append_sheet(wb, sheet, "Servicios");

  const safeName = tenantName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `Servicios_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Descarga la plantilla de Catálogo Completo (Prendas y Servicios) en blanco.
 * Nombre de archivo: Plantilla_Catalogo.xlsx
 */
export function downloadCatalogTemplate() {
  const wb = XLSX.utils.book_new();

  // 1. Hoja Plantilla Prendas
  const prendasHeaders = [
    "Categoría",
    "Nombre de Prenda",
    "Descripción",
    "Precio (RD$)",
    "Por Libra (SI/NO)",
    "Exento ITBIS (SI/NO)",
  ];
  const prendasSheet = XLSX.utils.aoa_to_sheet([prendasHeaders]);
  prendasSheet["!cols"] = [
    { wch: 22 },
    { wch: 28 },
    { wch: 32 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
  ];
  applyPrimaryHeaderStyles(prendasSheet);
  XLSX.utils.book_append_sheet(wb, prendasSheet, "Plantilla Prendas");

  // 2. Hoja Plantilla Servicios
  const serviciosHeaders = [
    "Nombre de Servicio",
    "Descripción",
    "Precio (RD$)",
    "Por Libra (SI/NO)",
    "Exento ITBIS (SI/NO)",
  ];
  const serviciosSheet = XLSX.utils.aoa_to_sheet([serviciosHeaders]);
  serviciosSheet["!cols"] = [
    { wch: 28 },
    { wch: 32 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
  ];
  applyPrimaryHeaderStyles(serviciosSheet);
  XLSX.utils.book_append_sheet(wb, serviciosSheet, "Plantilla Servicios");

  XLSX.writeFile(wb, "Plantilla_Catalogo.xlsx");
}

/**
 * Exporta el catálogo completo a Excel (.xlsx)
 */
export function exportCatalogToExcel(
  items: CatalogoItem[],
  servicios: Servicio[],
  tenantName: string = "Lavanderia",
) {
  exportPrendasToExcel(items, tenantName);
}

/**
 * Procesa un archivo Excel o CSV cargado por el usuario y retorna el modelo parseado.
 */
export async function parseCatalogExcelFile(file: File): Promise<ExcelParseResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });

  const result: ExcelParseResult = {
    prendas: [],
    servicios: [],
    errors: [],
  };

  const sheetNames = workbook.SheetNames;
  const isPrendasOnly = sheetNames.some((s) => s.toLowerCase().includes("prenda")) && !sheetNames.some((s) => s.toLowerCase().includes("servicio"));
  const isServiciosOnly = sheetNames.some((s) => s.toLowerCase().includes("servicio")) && !sheetNames.some((s) => s.toLowerCase().includes("prenda"));

  // Process "Prendas" Sheet
  const prendasSheetName = workbook.SheetNames.find((s) => s.toLowerCase().includes("prenda")) || (!isServiciosOnly ? workbook.SheetNames[0] : null);

  if (prendasSheetName && workbook.Sheets[prendasSheetName] && !isServiciosOnly) {
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[prendasSheetName],
    );

    rawRows.forEach((row, index) => {
      const rowNum = index + 2;
      const idRaw = String(
        row["ID (No Modificar)"] || row["ID"] || row["id"] || "",
      ).trim();
      const categoria = String(
        row["Categoría"] || row["Categoria"] || row["categoria"] || "General",
      ).trim();
      const nombre = String(
        row["Nombre de Prenda"] || row["Prenda"] || row["Nombre"] || row["nombre"] || "",
      ).trim();
      const descripcion = String(
        row["Descripción"] || row["Descripcion"] || row["Descripción / Ayuda"] || row["descripcion"] || "",
      ).trim();
      const precioRaw = (row["Precio (RD$)"] ??
        row["Precio General (RD$)"] ??
        row["Precio"] ??
        row["precio"] ??
        0) as number | string;
      const porLibraStr = String(
        row["Por Libra (SI/NO)"] || row["Por Libra"] || "",
      ).toUpperCase();
      const exentoStr = String(
        row["Exento ITBIS (SI/NO)"] || row["Exento"] || "",
      ).toUpperCase();

      if (!nombre) {
        // Si no tiene nombre de prenda ni categoría, ignorar fila vacía
        return;
      }

      const precio =
        typeof precioRaw === "number" ? precioRaw : parseFloat(String(precioRaw).replace(/[^0-9.-]/g, ""));
      if (isNaN(precio) || precio < 0) {
        result.errors.push(
          `Hoja Prendas, Fila ${rowNum} (${nombre}): El precio '${precioRaw}' es inválido.`,
        );
        return;
      }

      result.prendas.push({
        id: idRaw || undefined,
        categoria: categoria || "General",
        nombre,
        descripcion: descripcion || undefined,
        precio: isNaN(precio) ? 0 : precio,
        por_libra:
          porLibraStr.includes("SI") ||
          porLibraStr.includes("TRUE") ||
          porLibraStr === "1",
        is_exento:
          exentoStr.includes("SI") ||
          exentoStr.includes("TRUE") ||
          exentoStr === "1",
        activo: true,
      });
    });
  }

  // Process "Servicios" Sheet
  const serviciosSheetName = workbook.SheetNames.find((s) => s.toLowerCase().includes("servicio")) || (isServiciosOnly ? workbook.SheetNames[0] : null);

  if (serviciosSheetName && workbook.Sheets[serviciosSheetName] && !isPrendasOnly) {
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[serviciosSheetName],
    );

    rawRows.forEach((row, index) => {
      const rowNum = index + 2;
      const idRaw = String(
        row["ID (No Modificar)"] || row["ID"] || row["id"] || "",
      ).trim();
      const nombre = String(
        row["Nombre de Servicio"] || row["Servicio"] || row["Nombre"] || row["nombre"] || "",
      ).trim();
      const descripcion = String(
        row["Descripción"] || row["Descripcion"] || row["Descripción / Ayuda"] || row["descripcion"] || "",
      ).trim();
      const precioRaw = (row["Precio (RD$)"] ??
        row["Precio"] ??
        row["precio"] ??
        0) as number | string;
      const porLibraStr = String(
        row["Por Libra (SI/NO)"] || row["Por Libra"] || "",
      ).toUpperCase();
      const exentoStr = String(
        row["Exento ITBIS (SI/NO)"] || row["Exento"] || "",
      ).toUpperCase();

      if (!nombre) {
        return;
      }

      const precio =
        typeof precioRaw === "number" ? precioRaw : parseFloat(String(precioRaw).replace(/[^0-9.-]/g, ""));
      if (isNaN(precio) || precio < 0) {
        result.errors.push(
          `Hoja Servicios, Fila ${rowNum} (${nombre}): El precio '${precioRaw}' es inválido.`,
        );
        return;
      }

      result.servicios.push({
        id: idRaw || undefined,
        nombre,
        descripcion: descripcion || undefined,
        precio: isNaN(precio) ? 0 : precio,
        por_libra:
          porLibraStr.includes("SI") ||
          porLibraStr.includes("TRUE") ||
          porLibraStr === "1",
        is_exento:
          exentoStr.includes("SI") ||
          exentoStr.includes("TRUE") ||
          exentoStr === "1",
        activo: true,
      });
    });
  }

  return result;
}
