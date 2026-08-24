import * as XLSX from "xlsx";
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
 * Genera y descarga un archivo Excel (.xlsx) preformateado con las Prendas y Servicios actuales.
 */
export function exportCatalogToExcel(
  items: CatalogoItem[],
  servicios: Servicio[],
  tenantName: string = "Lavanderia",
) {
  const wb = XLSX.utils.book_new();

  // Lista de nombres de servicios activos para columnas dinámicas
  const serviceNames = Array.from(new Set(servicios.map((s) => s.nombre.trim()))).filter(Boolean);

  // 1. Hoja de Prendas
  const prendasData = items.map((p) => {
    const row: Record<string, any> = {
      "ID (No Modificar)": p.id,
      Categoría: p.categoria || "General",
      "Nombre de Prenda": p.nombre,
      "Descripción / Ayuda": p.descripcion || "",
      "Precio General (RD$)": p.precio || 0,
    };

    // Añadir columnas por cada servicio
    serviceNames.forEach((sName) => {
      row[`Precio: ${sName}`] = p.precios_servicios?.[sName] !== undefined ? p.precios_servicios[sName] : "";
    });

    row["Por Libra (SI/NO)"] = p.por_libra ? "SI" : "NO";
    row["Exento ITBIS (SI/NO)"] = p.is_exento ? "SI" : "NO";

    return row;
  });

  const prendasSheet = XLSX.utils.json_to_sheet(prendasData);
  prendasSheet["!cols"] = [
    { wch: 25 }, // ID
    { wch: 20 }, // Categoría
    { wch: 28 }, // Nombre
    { wch: 32 }, // Descripción
    { wch: 20 }, // Precio General
    ...serviceNames.map(() => ({ wch: 22 })), // Columnas dinámicas de servicio
    { wch: 18 }, // Por Libra
    { wch: 20 }, // Exento ITBIS
  ];
  XLSX.utils.book_append_sheet(wb, prendasSheet, "Prendas");

  // 2. Hoja de Servicios
  const serviciosData = servicios.map((s) => ({
    "ID (No Modificar)": s.id,
    "Nombre de Servicio": s.nombre,
    "Descripción / Ayuda": s.descripcion || "",
    "Precio (RD$)": s.precio || 0,
    "Por Libra (SI/NO)": s.por_libra ? "SI" : "NO",
    "Exento ITBIS (SI/NO)": s.is_exento ? "SI" : "NO",
  }));

  const serviciosSheet = XLSX.utils.json_to_sheet(serviciosData);
  serviciosSheet["!cols"] = [
    { wch: 25 }, // ID
    { wch: 28 }, // Nombre
    { wch: 32 }, // Descripción
    { wch: 15 }, // Precio
    { wch: 18 }, // Por Libra
    { wch: 20 }, // Exento ITBIS
  ];
  XLSX.utils.book_append_sheet(wb, serviciosSheet, "Servicios");

  // Nombre de archivo con fecha
  const safeName = tenantName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `Catalogo_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  XLSX.writeFile(wb, filename);
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

  // Process "Prendas" Sheet (or first sheet if no Prendas sheet)
  const prendasSheetName =
    workbook.SheetNames.find((s) => s.toLowerCase().includes("prenda")) || workbook.SheetNames[0];

  if (prendasSheetName && workbook.Sheets[prendasSheetName]) {
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[prendasSheetName],
    );

    rawRows.forEach((row, index) => {
      const rowNum = index + 2; // Header is row 1
      const idRaw = String(row["ID (No Modificar)"] || row["ID"] || row["id"] || "").trim();
      const categoria = String(
        row["Categoría"] || row["Categoria"] || row["categoria"] || "General",
      ).trim();
      const nombre = String(row["Nombre de Prenda"] || row["Nombre"] || row["nombre"] || "").trim();
      const descripcion = String(
        row["Descripción / Ayuda"] || row["Descripcion"] || row["descripcion"] || "",
      ).trim();
      const precioRaw = (row["Precio General (RD$)"] ??
        row["Precio (RD$)"] ??
        row["Precio"] ??
        row["precio"] ??
        0) as number | string;
      const porLibraStr = String(row["Por Libra (SI/NO)"] || row["Por Libra"] || "").toUpperCase();
      const exentoStr = String(row["Exento ITBIS (SI/NO)"] || row["Exento"] || "").toUpperCase();

      if (!nombre) {
        result.errors.push(`Hoja Prendas, Fila ${rowNum}: El nombre de la prenda es obligatorio.`);
        return;
      }

      const precio = typeof precioRaw === "number" ? precioRaw : parseFloat(precioRaw);
      if (isNaN(precio) || precio < 0) {
        result.errors.push(
          `Hoja Prendas, Fila ${rowNum} (${nombre}): El precio general '${precioRaw}' es inválido.`,
        );
        return;
      }

      // Parsear columnas de precios por servicio dinámicas
      const precios_servicios: Record<string, number> = {};
      Object.entries(row).forEach(([colName, colVal]) => {
        if (colName.toLowerCase().startsWith("precio:") || colName.toLowerCase().startsWith("precio -")) {
          const srvName = colName.replace(/^precio[:\s-]+/i, "").trim();
          if (srvName && colVal !== undefined && colVal !== null && colVal !== "") {
            const parsedSrvPrice = typeof colVal === "number" ? colVal : parseFloat(String(colVal));
            if (!isNaN(parsedSrvPrice) && parsedSrvPrice > 0) {
              precios_servicios[srvName] = parsedSrvPrice;
            }
          }
        }
      });

      result.prendas.push({
        id: idRaw || undefined,
        categoria: categoria || "General",
        nombre,
        descripcion: descripcion || undefined,
        precio,
        precios_servicios: Object.keys(precios_servicios).length > 0 ? precios_servicios : undefined,
        por_libra:
          porLibraStr.includes("SI") || porLibraStr.includes("TRUE") || porLibraStr === "1",
        is_exento: exentoStr.includes("SI") || exentoStr.includes("TRUE") || exentoStr === "1",
        activo: true,
      });
    });
  }

  // Process "Servicios" Sheet if present
  const serviciosSheetName = workbook.SheetNames.find((s) => s.toLowerCase().includes("servicio"));

  if (serviciosSheetName && workbook.Sheets[serviciosSheetName]) {
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[serviciosSheetName],
    );

    rawRows.forEach((row, index) => {
      const rowNum = index + 2;
      const idRaw = String(row["ID (No Modificar)"] || row["ID"] || row["id"] || "").trim();
      const nombre = String(
        row["Nombre de Servicio"] || row["Nombre"] || row["nombre"] || "",
      ).trim();
      const descripcion = String(
        row["Descripción / Ayuda"] || row["Descripcion"] || row["descripcion"] || "",
      ).trim();
      const precioRaw = (row["Precio (RD$)"] ?? row["Precio"] ?? row["precio"] ?? 0) as
        | number
        | string;
      const porLibraStr = String(row["Por Libra (SI/NO)"] || row["Por Libra"] || "").toUpperCase();
      const exentoStr = String(row["Exento ITBIS (SI/NO)"] || row["Exento"] || "").toUpperCase();

      if (!nombre) {
        result.errors.push(
          `Hoja Servicios, Fila ${rowNum}: El nombre del servicio es obligatorio.`,
        );
        return;
      }

      const precio = typeof precioRaw === "number" ? precioRaw : parseFloat(precioRaw);
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
        precio,
        por_libra:
          porLibraStr.includes("SI") || porLibraStr.includes("TRUE") || porLibraStr === "1",
        is_exento: exentoStr.includes("SI") || exentoStr.includes("TRUE") || exentoStr === "1",
        activo: true,
      });
    });
  }

  return result;
}
