import XLSX from "xlsx-js-style";
import type { Cliente } from "./storage";

export interface ParsedClienteItem {
  id?: string;
  nombre: string;
  apellido?: string;
  telefono: string;
  email?: string;
  cedula?: string;
  direccion?: string;
  sector?: string;
  edificio_apto?: string;
  referencia?: string;
  tipo: "Consumidor Final" | "Empresa";
  limite_credito: number;
  notas?: string;
}

export interface ExcelClientsParseResult {
  clientes: ParsedClienteItem[];
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
 * Descarga la plantilla de clientes TOTALMENTE EN BLANCO (sin filas de datos),
 * con encabezados en color primario azul añil (#1B4B73) y texto blanco en negrita.
 * 
 * Nombre del archivo: Plantilla_Clientes.xlsx
 * Nombre de la hoja: Plantilla Clientes
 */
export function downloadClientsTemplate() {
  const wb = XLSX.utils.book_new();

  const headers = [
    "Nombre",
    "Apellido",
    "Teléfono",
    "RNC / Cédula",
    "Email",
    "Dirección",
    "Sector",
    "Edificio / Apto",
    "Referencia",
    "Tipo (Consumidor Final / Empresa)",
    "Límite Crédito (RD$)",
    "Notas",
  ];

  // Generar hoja con únicamente los encabezados (0 filas de datos)
  const sheet = XLSX.utils.aoa_to_sheet([headers]);

  sheet["!cols"] = [
    { wch: 22 }, // Nombre
    { wch: 22 }, // Apellido
    { wch: 18 }, // Teléfono
    { wch: 20 }, // RNC / Cédula
    { wch: 26 }, // Email
    { wch: 32 }, // Dirección
    { wch: 20 }, // Sector
    { wch: 22 }, // Edificio / Apto
    { wch: 24 }, // Referencia
    { wch: 32 }, // Tipo
    { wch: 22 }, // Límite Crédito
    { wch: 30 }, // Notas
  ];

  applyPrimaryHeaderStyles(sheet);

  XLSX.utils.book_append_sheet(wb, sheet, "Plantilla Clientes");
  XLSX.writeFile(wb, "Plantilla_Clientes.xlsx");
}

/**
 * Genera y descarga un archivo Excel (.xlsx) con los clientes actuales y encabezados en azul primario (#1B4B73).
 */
export function exportClientsToExcel(
  clientes: Cliente[],
  tenantName: string = "Lavanderia",
) {
  const wb = XLSX.utils.book_new();

  const clientesData = clientes.map((c) => ({
    "ID (No Modificar)": c.id || "",
    "Nombre": c.nombre || "",
    "Apellido": c.apellido || "",
    "Teléfono": c.telefono || "",
    "RNC / Cédula": c.cedula || "",
    "Email": c.email || "",
    "Dirección": c.direccion || "",
    "Sector": c.sector || "",
    "Edificio / Apto": c.edificio_apto || "",
    "Referencia": c.referencia || "",
    "Tipo (Consumidor Final / Empresa)": c.tipo === "Empresa" ? "Empresa" : "Consumidor Final",
    "Límite Crédito (RD$)": c.limite_credito || 0,
    "Notas": c.notas || "",
  }));

  const sheet = XLSX.utils.json_to_sheet(
    clientesData.length > 0
      ? clientesData
      : [
          {
            "ID (No Modificar)": "",
            Nombre: "",
            Apellido: "",
            Teléfono: "",
            "RNC / Cédula": "",
            Email: "",
            Dirección: "",
            Sector: "",
            "Edificio / Apto": "",
            Referencia: "",
            "Tipo (Consumidor Final / Empresa)": "",
            "Límite Crédito (RD$)": "",
            Notas: "",
          },
        ],
  );

  sheet["!cols"] = [
    { wch: 24 }, // ID (No Modificar)
    { wch: 22 }, // Nombre
    { wch: 22 }, // Apellido
    { wch: 18 }, // Teléfono
    { wch: 20 }, // RNC / Cédula
    { wch: 26 }, // Email
    { wch: 32 }, // Dirección
    { wch: 20 }, // Sector
    { wch: 22 }, // Edificio / Apto
    { wch: 24 }, // Referencia
    { wch: 32 }, // Tipo
    { wch: 22 }, // Límite Crédito
    { wch: 30 }, // Notas
  ];

  applyPrimaryHeaderStyles(sheet);

  XLSX.utils.book_append_sheet(wb, sheet, "Clientes");

  const safeName = tenantName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `Clientes_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  XLSX.writeFile(wb, filename);
}

/**
 * Lee y parsea un archivo Excel (.xlsx, .xls) o .csv subido por el usuario.
 */
export async function parseClientsExcelFile(file: File): Promise<ExcelClientsParseResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });

  const result: ExcelClientsParseResult = {
    clientes: [],
    errors: [],
  };

  // Buscar la hoja de "Clientes" / "Plantilla" o tomar la primera hoja
  const sheetName =
    workbook.SheetNames.find((s) => s.toLowerCase().includes("cliente")) ||
    workbook.SheetNames[0];

  if (!sheetName || !workbook.Sheets[sheetName]) {
    result.errors.push("El archivo no contiene ninguna hoja válida de datos.");
    return result;
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[sheetName],
  );

  if (rawRows.length === 0) {
    result.errors.push("El archivo cargado está vacío o no contiene filas de datos para importar.");
    return result;
  }

  rawRows.forEach((row, index) => {
    const rowNum = index + 2; // Fila 1 es el encabezado

    // 1. Extraer ID opcional
    const idRaw = String(
      row["ID (No Modificar)"] || row["ID"] || row["id"] || row["Id"] || "",
    ).trim();

    // 2. Extraer Nombre y Apellido con soporte flexible
    let nombre = String(
      row["Nombre"] ||
        row["Nombre de Cliente"] ||
        row["Nombre / Cliente"] ||
        row["nombre"] ||
        "",
    ).trim();

    let apellido = String(
      row["Apellido"] || row["Apellidos"] || row["apellido"] || "",
    ).trim();

    const nombreCompleto = String(
      row["Nombre Completo"] || row["Cliente"] || row["cliente"] || "",
    ).trim();

    // Si viene "Nombre Completo" y no "Nombre"
    if (!nombre && nombreCompleto) {
      const parts = nombreCompleto.split(" ").filter(Boolean);
      if (parts.length === 1) {
        nombre = parts[0];
      } else if (parts.length >= 2) {
        nombre = parts[0];
        apellido = parts.slice(1).join(" ");
      }
    }

    // 3. Extraer Teléfono
    const telefonoRaw = String(
      row["Teléfono"] ||
        row["Telefono"] ||
        row["Tel"] ||
        row["Celular"] ||
        row["WhatsApp"] ||
        row["telefono"] ||
        "",
    ).trim();

    // 4. Extraer RNC / Cédula
    const cedula = String(
      row["RNC / Cédula"] ||
        row["RNC / Cedula"] ||
        row["RNC/Cédula"] ||
        row["RNC"] ||
        row["Cédula"] ||
        row["Cedula"] ||
        row["Identificación"] ||
        row["Documento"] ||
        row["rnc"] ||
        row["cedula"] ||
        "",
    ).trim();

    // 5. Extraer Email
    const email = String(
      row["Email"] ||
        row["Correo"] ||
        row["Correo Electrónico"] ||
        row["email"] ||
        "",
    ).trim();

    // 6. Extraer Dirección y Ubicación
    const direccion = String(
      row["Dirección"] ||
        row["Direccion"] ||
        row["Dirección / Sector"] ||
        row["direccion"] ||
        "",
    ).trim();

    const sector = String(
      row["Sector"] ||
        row["Barrio"] ||
        row["Zona"] ||
        row["sector"] ||
        "",
    ).trim();

    const edificio_apto = String(
      row["Edificio / Apto"] ||
        row["Edificio/Apto"] ||
        row["Edificio"] ||
        row["Apto"] ||
        row["Apartamento"] ||
        row["edificio_apto"] ||
        "",
    ).trim();

    const referencia = String(
      row["Referencia"] ||
        row["Punto de Referencia"] ||
        row["referencia"] ||
        "",
    ).trim();

    // 7. Extraer Tipo
    const tipoRaw = String(
      row["Tipo (Consumidor Final / Empresa)"] ||
        row["Tipo"] ||
        row["Tipo de Cliente"] ||
        row["tipo"] ||
        "",
    )
      .trim()
      .toLowerCase();

    const tipo: "Consumidor Final" | "Empresa" =
      tipoRaw.includes("empresa") ||
      tipoRaw.includes("juridica") ||
      tipoRaw.includes("b01") ||
      tipoRaw.includes("e31")
        ? "Empresa"
        : "Consumidor Final";

    // 8. Extraer Límite de Crédito
    const limiteCreditoRaw =
      row["Límite Crédito (RD$)"] ??
      row["Limite Credito (RD$)"] ??
      row["Límite Crédito"] ??
      row["Limite Credito"] ??
      row["Límite de Crédito"] ??
      row["Crédito"] ??
      row["Credito"] ??
      row["limite_credito"] ??
      0;

    let limite_credito =
      typeof limiteCreditoRaw === "number"
        ? limiteCreditoRaw
        : parseFloat(String(limiteCreditoRaw).replace(/[^0-9.-]/g, ""));

    if (isNaN(limite_credito) || limite_credito < 0) {
      limite_credito = 0;
    }

    // 9. Extraer Notas
    const notas = String(
      row["Notas"] ||
        row["Observaciones"] ||
        row["Comentarios"] ||
        row["notas"] ||
        "",
    ).trim();

    // Validaciones obligatorias
    if (!nombre) {
      result.errors.push(`Fila ${rowNum}: El nombre del cliente es obligatorio.`);
      return;
    }

    if (!telefonoRaw) {
      result.errors.push(`Fila ${rowNum} (${nombre}): El teléfono del cliente es obligatorio.`);
      return;
    }

    result.clientes.push({
      id: idRaw || undefined,
      nombre,
      apellido: apellido || undefined,
      telefono: telefonoRaw,
      email: email || undefined,
      cedula: cedula || undefined,
      direccion: direccion || undefined,
      sector: sector || undefined,
      edificio_apto: edificio_apto || undefined,
      referencia: referencia || undefined,
      tipo,
      limite_credito,
      notas: notas || undefined,
    });
  });

  return result;
}
