// Biblioteca para conectar impresoras físicas térmicas y formatear tickets ESC/POS
import { type Orden, type Tenant, type Empleado, type Cliente } from "./storage";

// Variables globales para mantener las conexiones locales activas en la pestaña del navegador
let activeSerialPort: any = null;
let activeBluetoothDevice: any = null;
let activeBluetoothCharacteristic: any = null;

// Mapa para remover acentos y caracteres especiales incompatibles con las térmicas
export function cleanText(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remueve acentos
    .replace(/[ñÑ]/g, "n")
    .replace(/[üÜ]/g, "u")
    .replace(/[^a-zA-Z0-9\s\-\.\,\:\#\$\%\&\(\)\*\+\/\=\?]/g, ""); // remueve caracteres extraños
}

// Formatea dos columnas alineadas a la izquierda y derecha para un ancho determinado
export function formatRow(left: string, right: string, width: number): string {
  const cleanL = cleanText(left);
  const cleanR = cleanText(right);
  const spaces = width - cleanL.length - cleanR.length;
  if (spaces <= 0) {
    return cleanL.slice(0, width - cleanR.length - 1) + " " + cleanR;
  }
  return cleanL + " ".repeat(spaces) + cleanR;
}

// Formatea texto centrado
export function formatCenter(text: string, width: number): string {
  const cleanT = cleanText(text);
  const spaces = Math.max(0, Math.floor((width - cleanT.length) / 2));
  return " ".repeat(spaces) + cleanT;
}

export function formatPhoneDO(phoneStr?: string): string {
  if (!phoneStr || phoneStr === "---") return "";
  const digits = phoneStr.replace(/\D/g, "");
  const cleanDigits = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (cleanDigits.length === 10) {
    return `(${cleanDigits.slice(0, 3)}) ${cleanDigits.slice(3, 6)}-${cleanDigits.slice(6)}`;
  }
  return phoneStr;
}

// Verifica si la API de Puerto Serie está disponible en el navegador
export function isSerialSupported(): boolean {
  return typeof window !== "undefined" && "serial" in navigator;
}

// Verifica si la API de Bluetooth está disponible en el navegador
export function isBluetoothSupported(): boolean {
  return typeof window !== "undefined" && "bluetooth" in navigator;
}

// --- CONEXIÓN WEB SERIAL ---
export async function connectSerialPort(baudRate = 9600): Promise<any> {
  if (!isSerialSupported()) {
    throw new Error("La API Web Serial no está soportada en este navegador.");
  }
  try {
    const port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate });
    activeSerialPort = port;
    return port;
  } catch (err) {
    console.error("Error al conectar puerto serie:", err);
    throw err;
  }
}

export async function disconnectSerial(): Promise<void> {
  if (activeSerialPort) {
    try {
      await activeSerialPort.close();
    } catch (e) {
      console.error(e);
    }
    activeSerialPort = null;
  }
}

// Intenta reconectar a puertos previamente autorizados
export async function getAutoConnectedSerialPort(): Promise<any | null> {
  if (!isSerialSupported()) return null;
  try {
    const ports = await (navigator as any).serial.getPorts();
    if (ports && ports.length > 0) {
      const port = ports[0];
      // Si el puerto ya está abierto, retornar. Si no, intentar abrirlo.
      if (port.writable) {
        activeSerialPort = port;
        return port;
      }
      try {
        await port.open({ baudRate: 9600 });
        activeSerialPort = port;
        return port;
      } catch {
        return null;
      }
    }
  } catch (e) {
    console.error("Auto-connect serial error:", e);
  }
  return null;
}

// --- CONEXIÓN WEB BLUETOOTH ---
export async function connectBluetoothDevice(): Promise<any> {
  if (!isBluetoothSupported()) {
    throw new Error("Web Bluetooth no está soportado en este navegador.");
  }
  try {
    // Escaneo genérico para impresoras
    const device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        "00001101-0000-1000-8000-00805f9b34fb", // SPP (Serial Port Profile)
        "000018f0-0000-1000-8000-00805f9b34fb", // Servicio de Impresión Raw común
        "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC
        "e7e1a000-bc75-4f5a-b1e1-d4d114091697"  // Xprinter
      ]
    });

    const server = await device.gatt.connect();
    activeBluetoothDevice = device;

    // Escanear los servicios para encontrar una característica con permiso de escritura
    const services = await server.getPrimaryServices();
    let writeChar = null;

    for (const service of services) {
      try {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            writeChar = char;
            break;
          }
        }
      } catch (e) {
        // Ignorar errores de acceso a servicios protegidos del sistema
      }
      if (writeChar) break;
    }

    if (!writeChar) {
      throw new Error("No se encontró una característica de escritura en el dispositivo Bluetooth.");
    }

    activeBluetoothCharacteristic = writeChar;
    return device;
  } catch (err) {
    console.error("Error al conectar por Bluetooth:", err);
    throw err;
  }
}

export async function disconnectBluetooth(): Promise<void> {
  if (activeBluetoothDevice && activeBluetoothDevice.gatt.connected) {
    activeBluetoothDevice.gatt.disconnect();
  }
  activeBluetoothDevice = null;
  activeBluetoothCharacteristic = null;
}

// --- FORMATEADOR ESC/POS ---
// Retorna un array de bytes (Uint8Array) listo para enviarse a la impresora
export function encodeEscPos(
  orden: Orden,
  tenant: Tenant,
  cliente: Cliente,
  empleado: Empleado,
  serviciosList: any[],
  pagoRecibido?: number,
  ocultarUbicacion?: boolean,
  ocultarNotas?: boolean,
  esProduccion?: boolean,
  esCopiaCaja?: boolean
): Uint8Array {
  const config = tenant.config || {};
  const formato = config.formato_ticket || "80mm";
  const columns = formato === "57mm" ? 32 : 48;
  const perfil = config.impresora_perfil || "basica";

  const bytes: number[] = [];

  // Comandos ESC/POS estándar
  const INIT = [0x1B, 0x40];
  const ALIGN_LEFT = [0x1B, 0x61, 0x00];
  const ALIGN_CENTER = [0x1B, 0x61, 0x01];
  const ALIGN_RIGHT = [0x1B, 0x61, 0x02];
  const BOLD_ON = [0x1B, 0x45, 0x01];
  const BOLD_OFF = [0x1B, 0x45, 0x00];
  
  // Modos de fuente para Estándar y Completa
  const FONT_DOUBLE = [0x1D, 0x21, 0x11]; // Doble ancho y alto
  const FONT_NORMAL = [0x1D, 0x21, 0x00]; // Normal

  const writeString = (str: string) => {
    for (let i = 0; i < str.length; i++) {
      // Codificación básica ISO-8859-1 (Latin1) para caracteres extendidos
      const code = str.charCodeAt(i);
      if (code <= 127) {
        bytes.push(code);
      } else {
        // Mapeo simple de caracteres latinos comunes si no están filtrados
        if (code === 241) bytes.push(0xA4); // ñ
        else if (code === 209) bytes.push(0xA5); // Ñ
        else bytes.push(63); // "?"
      }
    }
  };

  const writeLine = (str: string = "") => {
    writeString(str + "\n");
  };

  // Inicializar impresora
  bytes.push(...INIT);

  // LOGOTIPO / TÍTULO DE LA LAVANDERÍA
  bytes.push(...ALIGN_CENTER);
  if (perfil !== "basica") {
    bytes.push(...FONT_DOUBLE);
    bytes.push(...BOLD_ON);
    writeLine(tenant.nombre);
    bytes.push(...FONT_NORMAL);
    bytes.push(...BOLD_OFF);
  } else {
    writeLine(tenant.nombre.toUpperCase());
  }

  // DATOS COMERCIALES
  if (!esProduccion) {
    writeLine(tenant.rnc ? `RNC: ${tenant.rnc}` : "Sin RNC Configurado");
    if (tenant.direccion) {
      writeLine(tenant.direccion);
    }
    writeLine(`Tel: ${formatPhoneDO(tenant.telefono)}`);
    writeLine("-".repeat(columns));
  }

  if (esProduccion) {
    const totalPrendasProd = (orden.items || []).filter(it => !it.descripcion.toLowerCase().startsWith("servicio:")).reduce((acc, it) => acc + it.cantidad, 0);

    bytes.push(...BOLD_ON);
    writeLine("★ COPIA DE USO INTERNO ★");
    bytes.push(...BOLD_OFF);
    writeLine("-".repeat(columns));
    
    if (orden.ubicacion_ropa) {
      bytes.push(...BOLD_ON);
      writeLine(`UBICACION: ${orden.ubicacion_ropa.toUpperCase()}`);
      bytes.push(...BOLD_OFF);
      writeLine("-".repeat(columns));
    }

    bytes.push(...BOLD_ON);
    if (perfil !== "basica") {
      bytes.push(...FONT_DOUBLE);
    }
    writeLine(`TOTAL PRENDAS: ${totalPrendasProd}`);
    if (perfil !== "basica") {
      bytes.push(...FONT_NORMAL);
    }
    bytes.push(...BOLD_OFF);
    writeLine("-".repeat(columns));

    bytes.push(...BOLD_ON);
    writeLine(`ORDEN: ${orden.numero}`);
    bytes.push(...BOLD_OFF);
    if (orden.es_urgente) {
      bytes.push(...BOLD_ON);
      writeLine("★ URGENTE ★");
      bytes.push(...BOLD_OFF);
    }
    writeLine(`FECHA DE ENTREGA: ${orden.fecha_entrega}`);
    writeLine("-".repeat(columns));

    // DATOS DEL CLIENTE
    writeLine(`Cliente: ${cliente.nombre} ${cliente.apellido || ""}`);
    if (cliente.telefono && cliente.telefono !== "---") {
      writeLine(`Tel: ${formatPhoneDO(cliente.telefono)}`);
    }
    if (cliente.direccion) {
      writeLine(`Direccion: ${cliente.direccion}`);
    }
    if (orden.notas) {
      writeLine(`NOTA: ${orden.notas}`);
    }
    writeLine("=".repeat(columns));

    // DETALLE DE PRENDAS PARA PRODUCCIÓN
    bytes.push(...BOLD_ON);
    writeLine("DETALLE DE PRENDAS A PROCESAR");
    bytes.push(...BOLD_OFF);
    writeLine("-".repeat(columns));

    const itemsSueltos = orden.items.filter(it => !it.descripcion.startsWith("↳"));
    const itemsDesglosados = orden.items.filter(it => it.descripcion.startsWith("↳"));

    if (orden.servicios && orden.servicios.length > 0) {
      orden.servicios.forEach((sName) => {
        bytes.push(...BOLD_ON);
        writeLine(`Servicio: ${sName}`);
        bytes.push(...BOLD_OFF);
        
        const misPrendas = itemsDesglosados.filter(it => 
          it.servicio_origen ? it.servicio_origen === sName : (orden.servicios.length === 1)
        );
        misPrendas.forEach(it => {
          writeLine(`  • ${it.cantidad}x ${it.descripcion.replace(/^↳\s*/, "")}${it.es_libra ? ` (${it.cantidad}lb)` : ""}`);
          if (it.notas) {
            writeLine(`    Nota: ${it.notas}`);
          }
        });
      });
    }

    itemsSueltos.forEach((it) => {
      writeLine(`• ${it.cantidad}x ${it.descripcion}${it.es_libra ? ` (${it.cantidad}lb)` : ""}`);
      if (it.notas) {
        writeLine(`  Nota: ${it.notas}`);
      }
    });

    writeLine("-".repeat(columns));
    writeLine("Atendido por:");
    bytes.push(...BOLD_ON);
    writeLine(empleado.nombre);
    bytes.push(...BOLD_OFF);
  } else {
    // =========================================================
    // FLUJO COMERCIAL / CLIENTE (CON PRECIOS Y TOTALES FISCALES)
    // =========================================================
    if (esCopiaCaja) {
      bytes.push(...ALIGN_CENTER);
      bytes.push(...BOLD_ON);
      writeLine("★ COPIA DE CAJA ★");
      bytes.push(...BOLD_OFF);
      writeLine("-".repeat(columns));
    }
    bytes.push(...ALIGN_LEFT);
    writeLine(`Orden No°: ${orden.numero}`);
    if (orden.ncf) {
      writeLine(`NCF: ${orden.ncf}`);
      if (orden.ncf_vencimiento) {
        writeLine(`Vence: ${new Date(orden.ncf_vencimiento).toLocaleDateString("es-DO")}`);
      }
    }
    writeLine(`Fecha: ${new Date(orden.creado_en).toLocaleString("es-DO")}`);
    writeLine(`Entrega: ${orden.fecha_entrega}`);
    writeLine("-".repeat(columns));
    writeLine("Atendido por:");
    bytes.push(...BOLD_ON);
    writeLine(empleado.nombre);
    bytes.push(...BOLD_OFF);
    writeLine("-".repeat(columns));

    // DATOS DEL CLIENTE
    writeLine(`Cliente: ${cliente.nombre} ${cliente.apellido || ""}`);
    if (cliente.cedula) {
      writeLine(`Identificacion: ${cliente.cedula}`);
    }
    if (cliente.telefono && cliente.telefono !== "---") {
      writeLine(`Tel: ${formatPhoneDO(cliente.telefono)}`);
    }
    if (orden.notas && ((config.ticket_mostrar_notas || esCopiaCaja) && !ocultarNotas)) {
      bytes.push(...BOLD_ON);
      writeLine(`NOTA: ${orden.notas}`);
      bytes.push(...BOLD_OFF);
    }
    writeLine("=".repeat(columns));

    // DETALLE DE ARTÍCULOS / SERVICIOS
    if (perfil !== "basica") {
      bytes.push(...BOLD_ON);
    }
    writeLine(formatRow("DETALLE", "TOTAL", columns));
    if (perfil !== "basica") {
      bytes.push(...BOLD_OFF);
    }
    writeLine("-".repeat(columns));

    // Renderizar prendas del ticket
    const itemsSueltos = orden.items.filter(it => !it.descripcion.startsWith("↳"));
    const itemsDesglosados = orden.items.filter(it => it.descripcion.startsWith("↳"));

    // Renderizar servicios asociados con sus desgloses
    if (orden.servicios && orden.servicios.length > 0) {
      orden.servicios.forEach((sName) => {
        const srv = serviciosList.find((x) => x.nombre === sName);
        const p = orden.servicios_precios?.[sName] !== undefined ? orden.servicios_precios[sName] : (srv ? srv.precio : 0);
        writeLine(formatRow(`Servicio: ${sName}`, `RD$${p.toFixed(2)}`, columns));
        
        const misPrendas = itemsDesglosados.filter(it => 
          it.servicio_origen ? it.servicio_origen === sName : (orden.servicios.length === 1)
        );
        misPrendas.forEach(it => {
          const sub = it.cantidad * it.precio_unitario;
          const subStr = sub > 0 ? `RD$${sub.toFixed(2)}` : "---";
          writeLine(formatRow(`  ${it.cantidad}x ${it.descripcion}`, subStr, columns));
        });
      });
    }

    // Renderizar prendas sueltas
    itemsSueltos.forEach((it) => {
      const cantDesc = `${it.cantidad}x ${it.descripcion}`;
      const sub = it.cantidad * it.precio_unitario;
      const subStr = `RD$${sub.toFixed(2)}`;
      if (cantDesc.length + subStr.length + 1 > columns) {
        writeLine(cleanText(cantDesc));
        writeLine(formatRow("", subStr, columns));
      } else {
        writeLine(formatRow(cantDesc, subStr, columns));
      }
    });
    writeLine("=".repeat(columns));

    // TOTALES
    writeLine(formatRow("Subtotal:", `RD$${orden.subtotal.toFixed(2)}`, columns));
    writeLine(formatRow(`ITBIS (${config.itbis_porcentaje ?? 18}%):`, `RD$${orden.itbis.toFixed(2)}`, columns));
    if (perfil !== "basica") {
      bytes.push(...BOLD_ON);
      bytes.push(...FONT_DOUBLE);
      writeLine(formatRow("TOTAL:", `RD$${orden.total.toFixed(2)}`, columns / 2));
      bytes.push(...FONT_NORMAL);
      bytes.push(...BOLD_OFF);
    } else {
      writeLine(formatRow("TOTAL:", `RD$${orden.total.toFixed(2)}`, columns));
    }
    writeLine("-".repeat(columns));

    // PAGOS
    writeLine(formatRow("Metodo pago:", orden.metodo_pago, columns));
    writeLine(formatRow("Monto Pagado:", `RD$${orden.pagado.toFixed(2)}`, columns));
    if (orden.saldo > 0) {
      writeLine(formatRow("Saldo Pendiente:", `RD$${orden.saldo.toFixed(2)}`, columns));
    }
    if (pagoRecibido !== undefined && pagoRecibido > orden.pagado) {
      const cambio = pagoRecibido - orden.pagado;
      writeLine(formatRow("Efectivo recibido:", `RD$${pagoRecibido.toFixed(2)}`, columns));
      writeLine(formatRow("Cambio:", `RD$${cambio.toFixed(2)}`, columns));
    }
    writeLine("-".repeat(columns));

    // PIE DE PÁGINA
    bytes.push(...ALIGN_CENTER);
    if (config.ticket_pie) {
      writeLine(config.ticket_pie);
    }
    if (config.ticket_nota) {
      writeLine(config.ticket_nota);
    }

    // QR CODE NATIVO
    const isECF = orden.ncf?.startsWith("E");
    if (isECF && perfil === "completa") {
      const qrData = orden.ecf_qr || `https://dgii.gov.do/consulta_ecf?RNC_EMISOR=${tenant.rnc}&E_NCF=${orden.ncf}&MONTO_TOTAL=${orden.total}&FECHA_EMISION=${new Date(orden.creado_en).toLocaleDateString("en-GB").replace(/\//g, "")}`;
      
      bytes.push(29, 40, 107, 4, 0, 49, 65, 50, 0);
      bytes.push(29, 40, 107, 3, 0, 49, 67, 6);
      bytes.push(29, 40, 107, 3, 0, 49, 69, 49);
      const storeLen = qrData.length + 3;
      const lenL = storeLen & 0xFF;
      const lenH = (storeLen >> 8) & 0xFF;
      bytes.push(29, 40, 107, lenL, lenH, 49, 80, 48);
      for (let k = 0; k < qrData.length; k++) {
        bytes.push(qrData.charCodeAt(k));
      }
      bytes.push(29, 40, 107, 3, 0, 49, 81, 48);
      writeLine();
      writeLine("Consulte su e-CF en dgii.gov.do");
    } else if (isECF && perfil !== "completa") {
      writeLine("Consulta Factura Electronica:");
      writeLine(`dgii.gov.do/consulta_ecf?RNC=${tenant.rnc}&NCF=${orden.ncf}`);
    }
  }

  writeLine();
  writeLine();
  writeLine();

  // COMANDO DE CORTE DE PAPEL
  if (perfil === "completa") {
    const CUT = [0x1D, 0x56, 66, 0]; // GS V 66 0
    bytes.push(...CUT);
  }

  return new Uint8Array(bytes);
}

// Convierte bytes ESC/POS en una representación de texto legible por consola para depuración
export function simulateEscPosDump(bytes: Uint8Array): string {
  let output = "--- EMULACIÓN TICKET ESC/POS ---\n";
  let textBuffer = "";
  
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    
    // Capturar comandos
    if (b === 0x1B && bytes[i + 1] === 0x40) {
      output += "[INIT]\n";
      i += 1;
    } else if (b === 0x1B && bytes[i + 1] === 0x61) {
      const mode = bytes[i + 2];
      const align = mode === 0 ? "LEFT" : mode === 1 ? "CENTER" : "RIGHT";
      output += `[ALIGN_${align}]\n`;
      i += 2;
    } else if (b === 0x1B && bytes[i + 1] === 0x45) {
      const state = bytes[i + 2] === 1 ? "ON" : "OFF";
      output += `[BOLD_${state}]\n`;
      i += 2;
    } else if (b === 0x1D && bytes[i + 1] === 0x21) {
      const mode = bytes[i + 2];
      if (mode === 0x11) output += "[FONT_DOUBLE_SIZE]\n";
      else if (mode === 0x00) output += "[FONT_NORMAL_SIZE]\n";
      i += 2;
    } else if (b === 0x1D && bytes[i + 1] === 0x56) {
      output += "\n[PAPER_CUT]\n";
      i += 3;
    } else if (b === 29 && bytes[i + 1] === 40 && bytes[i + 2] === 107) {
      const fn = bytes[i + 6];
      if (fn === 80) { // Almacenar datos QR
        const lenL = bytes[i + 3];
        const lenH = bytes[i + 4];
        const len = (lenH << 8) + lenL - 3;
        const dataBytes = bytes.slice(i + 8, i + 8 + len);
        const data = String.fromCharCode(...dataBytes);
        output += `[QR_CODE_DATA: ${data}]\n`;
        i += 7 + len;
      } else if (fn === 81) {
        output += "[PRINT_QR_CODE]\n";
        i += 7;
      } else {
        // Saltear otros comandos QR
        const lenL = bytes[i + 3];
        const lenH = bytes[i + 4];
        const len = (lenH << 8) + lenL;
        i += 4 + len;
      }
    } else {
      if (b === 10) { // Newline
        output += textBuffer + "\n";
        textBuffer = "";
      } else if (b >= 32 && b <= 126) {
        textBuffer += String.fromCharCode(b);
      } else if (b === 0xA4) {
        textBuffer += "ñ";
      } else if (b === 0xA5) {
        textBuffer += "Ñ";
      }
    }
  }
  if (textBuffer) {
    output += textBuffer + "\n";
  }
  output += "--------------------------------";
  return output;
}

// --- MANDAR A IMPRIMIR (ENTRADA PRINCIPAL) ---
export async function printDirectRaw(bytes: Uint8Array, config: any): Promise<boolean> {
  const type = config.impresora_tipo || "usb";
  
  if (type === "usb") {
    // Para USB/Sistema, la impresión directa raw no aplica en web de la misma manera que BT/Serial,
    // por lo tanto siempre delegamos en window.print() el cual tiene su propio flujo estructurado.
    return false;
  }

  // --- ESCRIBIR EN SERIAL ---
  if (type === "serial") {
    try {
      let port = activeSerialPort;
      if (!port) {
        port = await getAutoConnectedSerialPort();
      }
      if (!port) {
        port = await connectSerialPort(config.impresora_serial_baud || 9600);
      }
      
      const writer = port.writable.getWriter();
      await writer.write(bytes);
      writer.releaseLock();
      return true;
    } catch (err) {
      console.error("Error al enviar bytes a impresora serial:", err);
      // Limpiar puerto activo en caso de fallo para forzar re-selección
      activeSerialPort = null;
      throw err;
    }
  }

  // --- ESCRIBIR EN BLUETOOTH ---
  if (type === "bluetooth") {
    try {
      if (!activeBluetoothCharacteristic) {
        await connectBluetoothDevice();
      }
      
      // La especificación de Web Bluetooth indica que se debe escribir en chunks pequeños (ej: 512 bytes)
      // para evitar saturar el buffer de la característica BLE
      const chunkSize = 20; // 20 bytes es el MTU predeterminado seguro para BLE antiguo
      let offset = 0;
      while (offset < bytes.length) {
        const chunk = bytes.slice(offset, offset + chunkSize);
        await activeBluetoothCharacteristic.writeValue(chunk);
        offset += chunkSize;
        // Pequeño retardo para no colapsar la conexión
        await new Promise((r) => setTimeout(r, 20));
      }
      return true;
    } catch (err) {
      console.error("Error al enviar bytes a impresora Bluetooth:", err);
      activeBluetoothDevice = null;
      activeBluetoothCharacteristic = null;
      throw err;
    }
  }

  return false;
}

// Genera secuencia de bytes ESC/POS para el Cuadre de Caja POS
export function encodeCuadreEscPos(
  ordenes: Orden[],
  movimientos: any[],
  tenant: Tenant,
  empleadoName: string,
  rango: string,
  montoInicial = 0
): Uint8Array {
  const config = tenant.config || {};
  const formato = config.formato_ticket || "80mm";
  const columns = formato === "57mm" ? 32 : 48;
  const perfil = config.impresora_perfil || "basica";

  const bytes: number[] = [];

  const INIT = [0x1B, 0x40];
  const ALIGN_LEFT = [0x1B, 0x61, 0x00];
  const ALIGN_CENTER = [0x1B, 0x61, 0x01];
  const BOLD_ON = [0x1B, 0x45, 0x01];
  const BOLD_OFF = [0x1B, 0x45, 0x00];
  const FONT_DOUBLE = [0x1D, 0x21, 0x11];
  const FONT_NORMAL = [0x1D, 0x21, 0x00];

  const writeString = (str: string) => {
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code <= 127) {
        bytes.push(code);
      } else {
        if (code === 241) bytes.push(0xA4);
        else if (code === 209) bytes.push(0xA5);
        else bytes.push(63);
      }
    }
  };

  const writeLine = (str: string = "") => {
    writeString(str + "\n");
  };

  // Cálculos de Resumen
  const total = ordenes.reduce((s, o) => s + o.total, 0);
  const cashSales = ordenes.filter(o => o.metodo_pago === 'EFECTIVO').reduce((s, o) => s + o.total, 0);
  const cardSales = ordenes.filter(o => o.metodo_pago === 'TARJETA').reduce((s, o) => s + o.total, 0);
  const transferSales = ordenes.filter(o => o.metodo_pago === 'TRANSFERENCIA').reduce((s, o) => s + o.total, 0);
  const credit = ordenes.filter(o => o.metodo_pago === 'CREDITO').reduce((s, o) => s + o.total, 0);
  const ventasContado = cashSales + cardSales + transferSales;
  const ventasCredito = credit;
  const totalFacturado = total;

  const cash = movimientos.filter(m => m.tipo === "VENTA" && m.metodo === "EFECTIVO" && !m.concepto.startsWith("Cobro de saldo orden #")).reduce((s, m) => s + m.monto, 0);
  const card = movimientos.filter(m => m.tipo === "VENTA" && m.metodo === "TARJETA" && !m.concepto.startsWith("Cobro de saldo orden #")).reduce((s, m) => s + m.monto, 0);
  const transfer = movimientos.filter(m => m.tipo === "VENTA" && m.metodo === "TRANSFERENCIA" && !m.concepto.startsWith("Cobro de saldo orden #")).reduce((s, m) => s + m.monto, 0);

  const abonosCredito = movimientos.filter(m => m.tipo === "ABONO" || m.concepto.includes("Abono inicial orden") || m.concepto.startsWith("Cobro de saldo orden #")).reduce((s, m) => s + m.monto, 0);
  const abonosEfectivo = movimientos.filter(m => (m.tipo === "ABONO" || m.concepto.includes("Abono inicial orden") || m.concepto.startsWith("Cobro de saldo orden #")) && m.metodo === "EFECTIVO").reduce((s, m) => s + m.monto, 0);
  const manualIngresos = movimientos.filter(m => m.tipo === "INGRESO" && !m.concepto.includes("Apertura de caja")).reduce((s, m) => s + m.monto, 0);
  const manualEgresos = movimientos.filter(m => ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA"].includes(m.tipo) && !m.concepto.includes("Reembolso: Anulaci")).reduce((s, m) => s + m.monto, 0);
  const anulado = movimientos.filter(m => m.concepto.includes("Reembolso: Anulaci")).reduce((s, m) => s + m.monto, 0);

  const realTotalEfectivo = cash + abonosEfectivo + montoInicial + manualIngresos - manualEgresos - anulado;
  const totalDineroRecaudado = cash + card + transfer + abonosCredito;
  const displayMovs = movimientos.filter(m => {
    if (m.orden_id && ordenes.some(o => o.id === m.orden_id)) {
      return false;
    }
    return !m.concepto.startsWith("Venta orden #") && !m.concepto.startsWith("Abono inicial orden #") && m.tipo !== "ABONO";
  });
  const ventasRealizadas = ordenes.filter(o => o.estado !== 'ANULADA').length;
  const devCount = ordenes.filter(o => o.estado === 'ANULADA').length;
  const montoDescontado = ordenes.filter(o => o.estado !== 'ANULADA').reduce((s, o) => s + (o.descuento || 0), 0);
  const itbisRecaudado = ordenes.filter(o => o.estado !== 'ANULADA').reduce((s, o) => s + (o.itbis || 0), 0);

  // Inicializar
  bytes.push(...INIT);
  bytes.push(...ALIGN_CENTER);

  if (perfil !== "basica") {
    bytes.push(...FONT_DOUBLE, ...BOLD_ON);
    writeLine(tenant.nombre);
    bytes.push(...FONT_NORMAL);
    writeLine("CUADRE DE CAJA");
    bytes.push(...BOLD_OFF);
  } else {
    writeLine(tenant.nombre.toUpperCase());
    writeLine("CUADRE DE CAJA");
  }

  writeLine(rango);
  writeLine("-".repeat(columns));

  bytes.push(...ALIGN_LEFT);
  writeString("Empleado: ");
  if (perfil !== "basica") bytes.push(...BOLD_ON);
  writeString(empleadoName);
  if (perfil !== "basica") bytes.push(...BOLD_OFF);
  writeLine();
  writeLine(`Fecha: ${new Date().toLocaleString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}`);
  writeLine("-".repeat(columns));

  // [1] VENTAS
  if (perfil !== "basica") bytes.push(...BOLD_ON);
  writeLine("[1] RESUMEN DE VENTAS");
  if (perfil !== "basica") bytes.push(...BOLD_OFF);
  writeLine("-".repeat(columns));
  writeLine(formatRow("Ventas Contado:", `RD$${ventasContado.toFixed(2)}`, columns));
  writeLine(formatRow("Ventas Credito:", `RD$${ventasCredito.toFixed(2)}`, columns));
  writeLine("-".repeat(columns));
  if (perfil !== "basica") bytes.push(...BOLD_ON);
  writeLine(formatRow("TOTAL FACTURADO:", `RD$${totalFacturado.toFixed(2)}`, columns));
  if (perfil !== "basica") bytes.push(...BOLD_OFF);
  writeLine("=".repeat(columns));

  // [2] MOVIMIENTOS
  if (perfil !== "basica") bytes.push(...BOLD_ON);
  writeLine("[2] MOVIMIENTOS DE CAJA");
  if (perfil !== "basica") bytes.push(...BOLD_OFF);
  writeLine("-".repeat(columns));
  writeLine(formatRow("(+) Ventas Efectivo:", `RD$${cash.toFixed(2)}`, columns));
  writeLine(formatRow("(+) Tarjeta:", `RD$${card.toFixed(2)}`, columns));
  writeLine(formatRow("(+) Transferencia:", `RD$${transfer.toFixed(2)}`, columns));
  writeLine(formatRow("(+) Abonos Credito:", `RD$${abonosCredito.toFixed(2)}`, columns));
  writeLine(formatRow("(+) Fondo Inicial:", `RD$${montoInicial.toFixed(2)}`, columns));
  if (manualIngresos > 0) {
    writeLine(formatRow("(+) Otros Ingresos:", `RD$${manualIngresos.toFixed(2)}`, columns));
  }
  if (manualEgresos > 0) {
    writeLine(formatRow("(-) Egresos/Retiros:", `RD$${manualEgresos.toFixed(2)}`, columns));
  }
  if (anulado > 0) {
    writeLine(formatRow("(-) Anulaciones:", `RD$${anulado.toFixed(2)}`, columns));
  }
  writeLine("-".repeat(columns));
  if (perfil !== "basica") bytes.push(...BOLD_ON);
  writeLine(formatRow("TOTAL EFECTIVO EN CAJA:", `RD$${realTotalEfectivo.toFixed(2)}`, columns));
  writeLine(formatRow("TOTAL RECAUDADO:", `RD$${totalDineroRecaudado.toFixed(2)}`, columns));
  if (perfil !== "basica") bytes.push(...BOLD_OFF);
  writeLine("=".repeat(columns));

  // [3] DETALLE ORDENES
  if (perfil !== "basica") bytes.push(...BOLD_ON);
  writeLine("[3] DETALLE DE ORDENES");
  if (perfil !== "basica") bytes.push(...BOLD_OFF);
  writeLine("-".repeat(columns));
  ordenes.forEach((o) => {
    const isAnulada = o.estado === "ANULADA";
    const status = isAnulada ? "ANUL" : (o.metodo_pago === "CREDITO" ? "CRE" : o.metodo_pago === "PAGO_AL_RETIRAR" ? "PAR" : o.metodo_pago?.substring(0,3));
    const leftText = `#${o.numero} `;
    const boldText = `(${status})`;
    const rightText = `RD$${o.total.toFixed(2)}`;
    const spacesCount = columns - leftText.length - boldText.length - rightText.length;
    const spaces = spacesCount > 0 ? " ".repeat(spacesCount) : " ";

    writeString(leftText);
    if (perfil !== "basica") bytes.push(...BOLD_ON);
    writeString(boldText);
    if (perfil !== "basica") bytes.push(...BOLD_OFF);
    writeLine(spaces + rightText);
  });
  writeLine("=".repeat(columns));

  // [4] OTROS MOVIMIENTOS DE CAJA
  if (displayMovs.length > 0) {
    if (perfil !== "basica") bytes.push(...BOLD_ON);
    writeLine("[4] OTROS MOVIMIENTOS DE CAJA");
    if (perfil !== "basica") bytes.push(...BOLD_OFF);
    writeLine("-".repeat(columns));
    writeLine(formatRow("CONCEPTO", "MONTO", columns));
    writeLine("-".repeat(columns));
    displayMovs.forEach((m) => {
      const isNegative = ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA"].includes(m.tipo);
      const sign = isNegative ? "-" : "+";
      const concept = m.concepto;
      const amountStr = `${sign}RD$${m.monto.toFixed(2)}`;
      
      if (concept.length + amountStr.length + 1 > columns) {
        writeLine(cleanText(concept));
        writeLine(formatRow("", amountStr, columns));
      } else {
        writeLine(formatRow(concept, amountStr, columns));
      }
    });
    writeLine("=".repeat(columns));
  }

  // [5] ESTADISTICAS DEL TURNO
  if (perfil !== "basica") bytes.push(...BOLD_ON);
  writeLine("[5] ESTADISTICAS DEL TURNO");
  if (perfil !== "basica") bytes.push(...BOLD_OFF);
  writeLine("-".repeat(columns));
  writeLine(formatRow("Órdenes Procesadas:", String(ventasRealizadas), columns));
  writeLine(formatRow("Devoluciones / Anulaciones:", String(devCount), columns));
  writeLine(formatRow("Descuentos Aplicados:", `RD$${montoDescontado.toFixed(2)}`, columns));
  writeLine(formatRow(`ITBIS Recaudado (${config.itbis_porcentaje ?? 18}%):`, `RD$${itbisRecaudado.toFixed(2)}`, columns));
  writeLine(formatRow("TOTAL RECAUDADO:", `RD$${totalDineroRecaudado.toFixed(2)}`, columns));
  writeLine("-".repeat(columns));

  // Firmas
  bytes.push(...ALIGN_CENTER);
  writeLine();
  writeLine();
  writeLine();
  writeLine("_____________________");
  writeLine("Firma Responsable");
  writeLine();
  writeLine("¡Buen trabajo!");
  writeLine();
  writeLine();

  if (perfil === "completa") {
    bytes.push(...[0x1D, 0x56, 66, 0]);
  }

  return new Uint8Array(bytes);
}
