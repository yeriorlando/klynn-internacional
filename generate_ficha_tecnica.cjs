const fs = require("fs");
const path = require("path");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  AlignmentType,
  ShadingType,
  UnderlineType,
} = require("docx");

async function createFichaTecnica() {
  const primaryColor = "1B4B73"; // Klynn Deep Blue
  const secondaryColor = "0284C7"; // Accent Sky Blue
  const darkTextColor = "0F172A"; // Slate 900
  const lightBgColor = "F8FAFC"; // Slate 50
  const tableBorderColor = "CBD5E1"; // Slate 300
  const tableHeaderBg = "1E293B"; // Slate 800

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
            size: 22, // 11pt
            color: darkTextColor,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1200,
              bottom: 1200,
              left: 1440,
              right: 1440,
            },
          },
        },
        children: [
          // HEADER / PORTADA
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "KLYNN CLOUD POS & SAAS",
                bold: true,
                size: 36, // 18pt
                color: primaryColor,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "FICHA TÉCNICA OFICIAL Y AUDITORÍA DE ARQUITECTURA DE SOFTWARE",
                bold: true,
                size: 26, // 13pt
                color: secondaryColor,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: "Documento de Especificación Técnica, Seguridad de la Información y Cumplimiento Operativo",
                italics: true,
                size: 20,
                color: "64748B",
              }),
            ],
          }),

          // SECCIÓN 1: DATOS GENERALES
          createSectionHeader("1. INFORMACIÓN GENERAL DEL SISTEMA", primaryColor),
          createTable([
            ["Parámetro", "Detalle Técnico"],
            ["Nombre del Sistema", "Klynn / Klynn Cloud"],
            ["Tipo de Solución", "Software as a Service (SaaS) Multi-Tenant / POS Cloud"],
            ["Industria Objetivo", "Lavanderías, Tintorerías, Centros de Planchado y Sastrerías"],
            ["Versión del Software", "v2.5 (Edición Cloud 2026)"],
            ["Modelo de Despliegue", "Cloud / Web Responsive (Multiplataforma: PC, Tablet, Móvil)"],
            ["Propietario / Fabricante", "Klynn Software Group"],
            ["Fecha de Auditoría", new Date().toLocaleDateString("es-DO", { year: "numeric", month: "long", day: "numeric" })],
            ["Estado de Operación", "Producción Activa / Alta Disponibilidad"],
          ], tableHeaderBg, tableBorderColor, lightBgColor),

          new Paragraph({ spacing: { after: 200 } }),

          // SECCIÓN 2: ARQUITECTURA TECNOLÓGICA
          createSectionHeader("2. ARQUITECTURA DE SOFTWARE Y STACK TECNOLÓGICO", primaryColor),
          new Paragraph({
            spacing: { after: 150 },
            children: [
              new TextRun({
                text: "Klynn está estructurado bajo una arquitectura moderna desacoplada (Decoupled Cloud Architecture) con separación estricta entre capa cliente y capa de servicios serverless:",
              }),
            ],
          }),
          createTable([
            ["Capa / Componente", "Tecnología / Framework", "Función Principal"],
            [
              "Frontend / UI Layer",
              "React 19, TypeScript, TanStack Start & Router",
              "Renderizado reactivo ultra-rápido, gestión de estado cliente y ruteo tipado seguro."
            ],
            [
              "Estilos & Diseño",
              "Tailwind CSS v4, Lucide Icons, Radix UI",
              "Diseño responsivo, tokens de diseño de marca personalizables por sucursal y accesibilidad."
            ],
            [
              "Backend as a Service",
              "Supabase Cloud Platform (AWS)",
              "Motor de autenticación, base de datos relacional administrada y almacenamiento de archivos."
            ],
            [
              "Base de Datos Principal",
              "PostgreSQL 15+ Relacional",
              "Motor transaccional ACID con claves foráneas, índices optimizados y soporte JSONB."
            ],
            [
              "Capa Serverless (Edge)",
              "Supabase Edge Functions (Deno)",
              "Microservicios aislados para integración con WhatsApp API, facturación electrónica e-CF y webhooks."
            ],
            [
              "Almacenamiento (Storage)",
              "Supabase Storage S3-Compatible",
              "Almacenamiento seguro de logotipos comerciales, catálogo de prendas y comprobantes de gasto."
            ],
            [
              "Impresión Térmica POS",
              "Protocolo ESC/POS nativo (USB/Bluetooth/Red)",
              "Generación e impresión directa de tickets térmicos 57mm, 80mm y reportes ejecutivos en PDF."
            ]
          ], tableHeaderBg, tableBorderColor, lightBgColor),

          new Paragraph({ spacing: { after: 200 } }),

          // SECCIÓN 3: SEGURIDAD Y PROTECCIÓN DE DATOS
          createSectionHeader("3. SEGURIDAD, AUTENTICACIÓN Y PROTECCIÓN DE DATOS", primaryColor),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "3.1. Aislamiento Multi-Tenant de Datos Personales",
                bold: true,
                color: secondaryColor,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 150 },
            children: [
              new TextRun({
                text: "La privacidad de los datos personales de clientes (nombres, teléfonos, direcciones, historial crediticio y compras) está protegida mediante partición lógica estricta por ",
              }),
              new TextRun({ text: "tenant_id", bold: true }),
              new TextRun({
                text: ". Ningún usuario o negocio puede consultar, buscar ni transferir registros pertenecientes a otra entidad suscrita al sistema.",
              }),
            ],
          }),

          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "3.2. Cifrado y Canales de Comunicación",
                bold: true,
                color: secondaryColor,
              }),
            ],
          }),
          createBulletPoint("Cifrado en Tránsito:", " Todo el tráfico viaja forzosamente bajo HTTPS / TLS 1.3 con certificados SSL/TLS de 256 bits, impidiendo ataques de intermediario (Man-in-the-Middle)."),
          createBulletPoint("Cifrado en Reposo:", " La base de datos relacional y los volúmenes de almacenamiento en la nube están cifrados bajo el estándar militar AES-256."),
          createBulletPoint("Gestión de Contraseñas:", " Las credenciales nunca se almacenan en texto plano; son procesadas por Supabase Auth mediante algoritmos de hashing seguros (BCrypt / Argon2)."),
          createBulletPoint("Sesiones JWT Criptográficas:", " Autenticación basada en JSON Web Tokens firmados y validados en cada petición mediante `supabase.auth.getUser()`."),

          new Paragraph({ spacing: { after: 150 } }),

          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "3.3. Matriz de Control de Accesos Basado en Roles (RBAC)",
                bold: true,
                color: secondaryColor,
              }),
            ],
          }),
          createTable([
            ["Rol", "Alcance Operativo", "Permisos Clave"],
            [
              "Super Admin (Klynn)",
              "Administración Global",
              "Gestión de planes, control de suscripciones, límites de órdenes y monitoreo de la plataforma."
            ],
            [
              "Administrador de Sucursal",
              "Total por Lavandería",
              "Acceso a finanzas, configuración de precios, catálogo, personal, auditoría y facturación fiscal."
            ],
            [
              "Supervisor de Turno",
              "Operación y Caja",
              "Supervisión de pedidos, anulación auditada de órdenes, aprobación de descuentos y arqueos de caja."
            ],
            [
              "Recepcionista / Cajero",
              "Atención y Cobro",
              "Recepción de prendas, cobro en efectivo/tarjeta/transferencia, asignación de estantería y entrega."
            ],
            [
              "Repartidor (Delivery)",
              "Logística de Envío",
              "Visualización de rutas, direcciones de clientes y cambio de estado a 'Entregado'."
            ],
            [
              "Operario de Planta",
              "Producción / Taller",
              "Visualización de tickets de taller, avance de lavado, secado, planchado y control de ganchos."
            ]
          ], tableHeaderBg, tableBorderColor, lightBgColor),

          new Paragraph({ spacing: { after: 200 } }),

          // SECCIÓN 4: MÓDULOS FUNCIONALES
          createSectionHeader("4. MÓDULOS FUNCIONALES AUDITADOS", primaryColor),
          createTable([
            ["Módulo", "Funcionalidades Principales y Reglas de Negocio"],
            [
              "Punto de Venta (POS)",
              "Registro rápido de órdenes, cálculo automático de libras y piezas, recargo de urgencia configurable, cálculo de ITBIS/impuestos, selector de métodos de pago múltiples y emisión instantánea de ticket cliente y ticket taller."
            ],
            [
              "Estantería Virtual & Conveyor",
              "Mapeo gráfico y slots para conveyor automático, rieles y estantes físicos. Validación de disponibilidad en tiempo real y modo manual de asignación para planes sin módulo avanzado."
            ],
            [
              "Arqueo & Control de Caja",
              "Apertura con balance inicial, registro clasificado de entradas y salidas, fondo de caja chica, arqueo ciego al cierre de turno, cálculo de sobrante/faltante y generación de ticket de cierre Z."
            ],
            [
              "Cuentas por Cobrar (CxC)",
              "Control de ventas a crédito, historial de abonos parciales, cálculo de días de vencimiento, balance consolidado de cartera y recibos de pago."
            ],
            [
              "Facturación Fiscal / DGII",
              "Soporte para NCF Tradicional (B01 Crédito Fiscal, B02 Consumidor Final, B14 Regímenes Especiales, B15 Gubernamental) y Facturación Electrónica e-CF con código QR y homologación."
            ],
            [
              "CRM & Notificaciones WhatsApp",
              "Catálogo centralizado de clientes (Consumidor Final y Empresas con RNC), historial de consumo acumulado, estado de saldo y envío automatizado de avisos de orden lista."
            ],
            [
              "Control de Gastos & Egresos",
              "Registro de egresos operativos con desglose de RNC de proveedor, NCF y retenciones para conciliación y exportación de reportes fiscales (Formato 606)."
            ],
            [
              "Métricas & Reportes Gerenciales",
              "Gráficos de rendimiento en tiempo real, volumen de ventas por turno, distribución por método de pago, exportación a Excel y generación de reportes ejecutivos en PDF."
            ]
          ], tableHeaderBg, tableBorderColor, lightBgColor),

          new Paragraph({ spacing: { after: 200 } }),

          // SECCIÓN 5: CONTINUIDAD Y RESPALDOS
          createSectionHeader("5. CONTINUIDAD DE NEGOCIO, DISPONIBILIDAD Y BACKUPS", primaryColor),
          createBulletPoint("Disponibilidad del Servicio:", " Arquitectura en la nube con un Acuerdo de Nivel de Servicio (SLA) objetivo de 99.9% de uptime garantizado por la infraestructura global de Supabase y Cloudflare."),
          createBulletPoint("Copias de Seguridad Automatizadas:", " Backups diarios completos de la base de datos PostgreSQL en almacenamiento redundante geodistribuido con retención histórica."),
          createBulletPoint("Capacidad de Recuperación (PITR):", " Soporte para Point-In-Time Recovery ante contingencias o eventos críticos de corrupción de datos."),
          createBulletPoint("Resiliencia Local:", " Caché inteligente de variables de marca y datos de sesión para mantener la operatividad fluida ante fluctuaciones en la red local del cliente."),

          new Paragraph({ spacing: { after: 200 } }),

          // SECCIÓN 6: DICTAMEN DE AUDITORÍA
          createSectionHeader("6. DICTAMEN DE AUDITORÍA Y CUMPLIMIENTO", primaryColor),
          new Paragraph({
            spacing: { after: 150 },
            children: [
              new TextRun({
                text: "El software KLYNN cumple satisfactoriamente con los estándares modernos de desarrollo de software seguro (OWASP Top 10), aislamiento de datos multi-tenant, encriptación en tránsito y en reposo, y separación estricta de privilegios de usuario para la operación comercial, fiscal y contable.",
                italics: true,
              }),
            ],
          }),

          // FIRMAS
          new Paragraph({ spacing: { before: 400, after: 200 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "____________________________________\n", bold: true }),
                          new TextRun({ text: "Equipo de Arquitectura y Desarrollo\n", bold: true, color: primaryColor }),
                          new TextRun({ text: "Klynn Cloud Platform", size: 18, color: "64748B" }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "____________________________________\n", bold: true }),
                          new TextRun({ text: "Oficial de Seguridad y Cumplimiento\n", bold: true, color: primaryColor }),
                          new TextRun({ text: "Auditoría de Sistemas", size: 18, color: "64748B" }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(process.cwd(), "FICHA_TECNICA_KLYNN_AUDITORIA.docx");
  fs.writeFileSync(outputPath, buffer);
  console.log("Ficha técnica creada exitosamente en:", outputPath);
}

function createSectionHeader(title, color) {
  return new Paragraph({
    spacing: { before: 250, after: 120 },
    heading: HeadingLevel.HEADING_2,
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 24, // 12pt
        color: color,
      }),
    ],
  });
}

function createBulletPoint(boldPrefix, text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [
      new TextRun({ text: boldPrefix, bold: true, color: "0F172A" }),
      new TextRun({ text: text, color: "334155" }),
    ],
  });
}

function createTable(data, headerBg, borderColor, altRowBg) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
      left: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
      right: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: borderColor },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: borderColor },
    },
    rows: data.map((row, rowIndex) => {
      const isHeader = rowIndex === 0;
      return new TableRow({
        children: row.map((cellText, cellIndex) => {
          return new TableCell({
            shading: {
              type: ShadingType.CLEAR,
              fill: isHeader ? headerBg : rowIndex % 2 === 0 ? altRowBg : "FFFFFF",
            },
            margins: {
              top: 100,
              bottom: 100,
              left: 120,
              right: 120,
            },
            children: [
              new Paragraph({
                alignment: isHeader && cellIndex > 0 ? AlignmentType.LEFT : AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: cellText,
                    bold: isHeader || (cellIndex === 0 && !isHeader),
                    color: isHeader ? "FFFFFF" : "1E293B",
                    size: isHeader ? 20 : 19,
                  }),
                ],
              }),
            ],
          });
        }),
      });
    }),
  });
}

createFichaTecnica().catch(console.error);
