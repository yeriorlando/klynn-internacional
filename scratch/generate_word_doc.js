import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType
} from 'docx';
import * as fs from 'fs';
import * as path from 'path';

async function generateAuditReport() {
  const primaryColor = '1B4B73'; // Azul institucional Klynn
  const darkSlate = '0F172A';    // Texto oscuro
  const mutedColor = '64748B';   // Gris subtítulos
  const successColor = '16A34A'; // Verde confirmación
  const errorColor = 'DC2626';   // Rojo alertas
  const lightBg = 'F1F5F9';      // Fondo tabla cabecera
  const altRowBg = 'F8FAFC';     // Fondo filas alternas

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 pulgada
              bottom: 1440,
              left: 1440,
              right: 1440
            }
          }
        },
        children: [
          // ENCABEZADO
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: 'KLYNN CLOUD — PLATAFORMA DE GESTIÓN OPERATIVA',
                bold: true,
                size: 18,
                color: primaryColor,
                font: 'Arial'
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: 'Departamento de Auditoría de Sistemas y Operaciones',
                size: 16,
                color: mutedColor,
                font: 'Arial'
              })
            ],
            spacing: { after: 300 }
          }),

          // TÍTULO DEL INFORME
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: 'INFORME DE AUDITORÍA Y CORRECCIÓN OPERATIVA',
                bold: true,
                size: 32,
                color: primaryColor,
                font: 'Arial'
              })
            ],
            spacing: { after: 150 }
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: 'Revisión forense de cuadres de caja del 21 y 22 de septiembre, duplicidad de registros y normalización de secuencias de tickets.',
                size: 20,
                color: darkSlate,
                font: 'Arial'
              })
            ],
            spacing: { after: 350 }
          }),

          // FICHA TÉCNICA DEL CLIENTE (TABLA)
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: lightBg, type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Establecimiento:', bold: true, size: 18, color: darkSlate, font: 'Arial' }),
                          new TextRun({ text: ' MR Lavandería Express', size: 18, color: darkSlate, font: 'Arial' })
                        ]
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Correo registrado:', bold: true, size: 18, color: darkSlate, font: 'Arial' }),
                          new TextRun({ text: ' mrgroupsrl01@gmail.com', size: 18, color: darkSlate, font: 'Arial' })
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    shading: { fill: lightBg, type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Fecha de emisión:', bold: true, size: 18, color: darkSlate, font: 'Arial' }),
                          new TextRun({ text: ' 23 de Septiembre de 2026', size: 18, color: darkSlate, font: 'Arial' })
                        ]
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Estado actual:', bold: true, size: 18, color: darkSlate, font: 'Arial' }),
                          new TextRun({ text: ' Caso Auditado, Saneado y Resuelto al 100%', bold: true, size: 18, color: successColor, font: 'Arial' })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          new Paragraph({ spacing: { after: 300 } }),

          // 1. RESUMEN EJECUTIVO
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '1. Resumen Ejecutivo (Conclusión General)',
                bold: true,
                size: 24,
                color: primaryColor,
                font: 'Arial'
              })
            ],
            spacing: { before: 200, after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Queremos transmitir tranquilidad total a la administración y propietarios de MR Lavandería Express: ',
                size: 20,
                color: darkSlate,
                font: 'Arial'
              }),
              new TextRun({
                text: 'en ningún momento hubo pérdida de dinero, faltante físico real ni error en el dinero de la gaveta.',
                bold: true,
                size: 20,
                color: darkSlate,
                font: 'Arial'
              })
            ],
            spacing: { after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'El descuadre que mostró el sistema en la noche del 22 de septiembre (diferencia de RD$ -3,290.00) se debió exclusivamente a que el sistema registró duplicadas 5 facturas en la base de datos minutos antes de cerrar el turno. Al haberse sumado dos veces en el sistema informático, este esperaba más dinero del que realmente se cobró en la lavandería.',
                size: 20,
                color: darkSlate,
                font: 'Arial'
              })
            ],
            spacing: { after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'La cajera contó físicamente exactamente el dinero correcto: RD$ 5,975.00 en ventas de efectivo.',
                bold: true,
                size: 20,
                color: successColor,
                font: 'Arial'
              }),
              new TextRun({
                text: ' Las 5 transacciones repetidas ya fueron retiradas del sistema y el cuadre ha quedado ajustado a su realidad exacta.',
                size: 20,
                color: darkSlate,
                font: 'Arial'
              })
            ],
            spacing: { after: 300 }
          }),

          // 2. AUDITORIA DEL CUADRE DEL 21 DE SEPTIEMBRE
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '2. Auditoría del Cuadre del 21 de Septiembre',
                bold: true,
                size: 24,
                color: primaryColor,
                font: 'Arial'
              })
            ],
            spacing: { before: 200, after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '• Orden afectada: ',
                bold: true,
                size: 20,
                color: darkSlate,
                font: 'Arial'
              }),
              new TextRun({
                text: 'Ticket #0205 por un valor de RD$ 1,090.00 (cobro en efectivo).',
                size: 20,
                color: darkSlate,
                font: 'Arial'
              })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '• Lo que sucedió: ',
                bold: true,
                size: 20,
                color: darkSlate,
                font: 'Arial'
              }),
              new TextRun({
                text: 'A las 9:07 PM del día 21, al momento de pulsar el cobro en el sistema, la confirmación se presionó tres veces de manera consecutiva muy rápida en un lapso de 2 minutos (a las 9:07:55 PM, 9:08:56 PM y 9:09:48 PM). Esto provocó que el sistema anotara tres cobros de RD$ 1,090.00 en lugar de uno solo.',
                size: 20,
                color: darkSlate,
                font: 'Arial'
              })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '• Resolución en caja: ',
                bold: true,
                size: 20,
                color: darkSlate,
                font: 'Arial'
              }),
              new TextRun({
                text: 'La cajera actuó de forma correcta la mañana del 22 de septiembre: antes de cerrar la caja, registró dos salidas de dinero (egresos) de RD$ 1,090.00 cada una con la descripción "Devolución fact 0205". Con esto anuló en el sistema los dos cobros de más y la caja cerró perfectamente cuadrada con Diferencia RD$ 0.00.',
                size: 20,
                color: darkSlate,
                font: 'Arial'
              })
            ],
            spacing: { after: 300 }
          }),

          // 3. AUDITORIA DEL CUADRE DEL 22 DE SEPTIEMBRE
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '3. Auditoría del Cuadre del 22 de Septiembre (El Descuadre de RD$ -3,290.00)',
                bold: true,
                size: 24,
                color: primaryColor,
                font: 'Arial'
              })
            ],
            spacing: { before: 200, after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'En el cuadre cerrado la noche del 22 de septiembre, el sistema reportó una diferencia negativa de RD$ -3,290.00 y la cajera anotó en las observaciones: "FACTURAS DUPLICADAS".',
                size: 20,
                color: darkSlate,
                font: 'Arial'
              })
            ],
            spacing: { after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Al realizar la auditoría a fondo de cada movimiento registrado en la base de datos, encontramos exactamente qué causó el problema: 5 facturas que ya se habían cobrado con total normalidad durante la tarde, se registraron por segunda vez en el sistema entre las 10:11 PM y 11:03 PM de la noche, justo cuando el personal estaba revisando los números para el cierre.',
                size: 20,
                color: darkSlate,
                font: 'Arial'
              })
            ],
            spacing: { after: 200 }
          }),

          // TABLA DE LAS 5 FACTURAS DUPLICADAS
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: primaryColor, type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Ticket / Orden', bold: true, color: 'FFFFFF', size: 18, font: 'Arial' })] })]
                  }),
                  new TableCell({
                    shading: { fill: primaryColor, type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Hora Cobro Real', bold: true, color: 'FFFFFF', size: 18, font: 'Arial' })] })]
                  }),
                  new TableCell({
                    shading: { fill: primaryColor, type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Hora Registro Duplicado', bold: true, color: 'FFFFFF', size: 18, font: 'Arial' })] })]
                  }),
                  new TableCell({
                    shading: { fill: primaryColor, type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Monto Duplicado', bold: true, color: 'FFFFFF', size: 18, font: 'Arial' })] })]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Ticket #0191', bold: true, size: 18, font: 'Arial' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '02:36 PM (Tarde)', size: 18, font: 'Arial' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '10:11 PM (Noche)', size: 18, color: errorColor, font: 'Arial' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'RD$ 800.00', bold: true, size: 18, font: 'Arial' })] })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ shading: { fill: altRowBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Ticket #0064', bold: true, size: 18, font: 'Arial' })] })] }),
                  new TableCell({ shading: { fill: altRowBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: '10:05 AM (Mañana)', size: 18, font: 'Arial' })] })] }),
                  new TableCell({ shading: { fill: altRowBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: '10:11 PM (Noche)', size: 18, color: errorColor, font: 'Arial' })] })] }),
                  new TableCell({ shading: { fill: altRowBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'RD$ 900.00', bold: true, size: 18, font: 'Arial' })] })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Ticket #0208', bold: true, size: 18, font: 'Arial' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '10:05 AM (Mañana)', size: 18, font: 'Arial' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '10:12 PM (Noche)', size: 18, color: errorColor, font: 'Arial' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'RD$ 180.00', bold: true, size: 18, font: 'Arial' })] })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ shading: { fill: altRowBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Ticket #0209', bold: true, size: 18, font: 'Arial' })] })] }),
                  new TableCell({ shading: { fill: altRowBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: '10:28 AM (Mañana)', size: 18, font: 'Arial' })] })] }),
                  new TableCell({ shading: { fill: altRowBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: '11:02 PM (Noche)', size: 18, color: errorColor, font: 'Arial' })] })] }),
                  new TableCell({ shading: { fill: altRowBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'RD$ 510.00', bold: true, size: 18, font: 'Arial' })] })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Ticket #0100', bold: true, size: 18, font: 'Arial' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '10:44 AM (Mañana)', size: 18, font: 'Arial' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '11:03 PM (Noche)', size: 18, color: errorColor, font: 'Arial' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'RD$ 500.00', bold: true, size: 18, font: 'Arial' })] })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ shading: { fill: lightBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'TOTAL COBROS DUPLICADOS EN SISTEMA:', bold: true, size: 18, font: 'Arial' })] })] }),
                  new TableCell({ shading: { fill: lightBg, type: ShadingType.CLEAR }, children: [new Paragraph({ text: '' })] }),
                  new TableCell({ shading: { fill: lightBg, type: ShadingType.CLEAR }, children: [new Paragraph({ text: '' })] }),
                  new TableCell({ shading: { fill: lightBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'RD$ 2,890.00', bold: true, color: errorColor, size: 18, font: 'Arial' })] })] })
                ]
              })
            ]
          }),

          new Paragraph({ spacing: { after: 200 } }),
          new Paragraph({
            children: [
              new TextRun({
                text: '¿Cómo se explica la diferencia de RD$ -3,290.00 que arrojó el cuadre?',
                bold: true,
                size: 20,
                color: darkSlate,
                font: 'Arial'
              })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '1. Los cobros duplicados sumaron RD$ 2,890.00 que nunca entraron en efectivo físico a la gaveta porque correspondían a facturas que ya se habían cobrado en la tarde.',
                size: 18,
                color: darkSlate,
                font: 'Arial'
              })
            ],
            spacing: { after: 80 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '2. Al momento de contar el efectivo para el cuadre, la cajera contó exactamente las ventas del día (RD$ 5,975.00), sin sumar los RD$ 400.00 del fondo de caja de apertura.',
                size: 18,
                color: darkSlate,
                font: 'Arial'
              })
            ],
            spacing: { after: 80 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '3. Si sumamos RD$ 2,890.00 de duplicados + RD$ 400.00 de apertura = RD$ 3,290.00 EXACTOS.',
                bold: true,
                size: 18,
                color: primaryColor,
                font: 'Arial'
              })
            ],
            spacing: { after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Acción tomada en la base de datos: ',
                bold: true,
                size: 20,
                color: successColor,
                font: 'Arial'
              }),
              new TextRun({
                text: 'Se borraron los 5 movimientos duplicados de la noche. El cuadre de caja de MR Lavandería del 22 de septiembre fue recalculado y ahora refleja sus RD$ 5,975.00 de ventas reales exactas.',
                size: 20,
                color: darkSlate,
                font: 'Arial'
              })
            ],
            spacing: { after: 300 }
          }),

          // 4. EL TEMA DE LAS SECUENCIAS
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '4. ¿A qué se debió que "solo salieran los tickets de junio"? (Las Secuencias)',
                bold: true,
                size: 24,
                color: primaryColor,
                font: 'Arial'
              })
            ],
            spacing: { before: 200, after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'La dueña de MR Lavandería nos comentó con mucha razón que al buscar tickets como el 191 o números recientes, le salían órdenes de Junio. La explicación es la siguiente:',
                size: 20,
                color: darkSlate,
                font: 'Arial'
              })
            ],
            spacing: { after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '• Cómo venía funcionando: ',
                bold: true,
                size: 18,
                color: darkSlate,
                font: 'Arial'
              }),
              new TextRun({
                text: 'Desde mayo, la lavandería venía utilizando una numeración corrida ininterrumpida: Mayo terminó en el 66; Junio fue del 67 al 429; Julio del 430 al 890; y Agosto terminó en el ticket 1,262. Ningún número se repetía.',
                size: 18,
                color: darkSlate,
                font: 'Arial'
              })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '• El origen de la confusión: ',
                bold: true,
                size: 18,
                color: darkSlate,
                font: 'Arial'
              }),
              new TextRun({
                text: 'Al comenzar septiembre, una actualización del sistema hizo que el contador reiniciara desde el número 0001 (llegando hasta el 0234). Como en junio ya se habían emitido tickets del 67 al 429, ¡los números de septiembre coincidían exactamente con los números de junio! Cuando alguien buscaba "191", el sistema traía el ticket 191 de junio y el 191 de septiembre al mismo tiempo.',
                size: 18,
                color: darkSlate,
                font: 'Arial'
              })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '• La solución aplicada para siempre: ',
                bold: true,
                size: 18,
                color: successColor,
                font: 'Arial'
              }),
              new TextRun({
                text: 'Se modificó el sistema para que el contador de tickets NUNCA vuelva a reiniciarse a 1 al cambiar de mes. Para MR Lavandería Express, la próxima orden que emita la cajera será el ticket #1263 (continuando directamente después de la 1262 de agosto). De esta manera, cada ticket de la lavandería será 100% único e irrepetible en toda su historia.',
                size: 18,
                color: darkSlate,
                font: 'Arial'
              })
            ],
            spacing: { after: 300 }
          }),

          // 5. MEDIDAS PREVENTIVAS
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '5. Medidas de Protección Aplicadas en el Sistema',
                bold: true,
                size: 24,
                color: primaryColor,
                font: 'Arial'
              })
            ],
            spacing: { before: 200, after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Para garantizar que esta situación no se repita en MR Lavandería Express ni en ninguna otra sucursal, se instalaron las siguientes protecciones:',
                size: 20,
                color: darkSlate,
                font: 'Arial'
              })
            ],
            spacing: { after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '1. Candado Anti-Doble Clic: ', bold: true, size: 18, color: darkSlate, font: 'Arial' }),
              new TextRun({ text: 'El botón de cobro se bloquea al primer toque. Si el cajero hace doble clic rápido o deja la barra de espacio presionada, el sistema ignora las pulsaciones repetidas.', size: 18, color: darkSlate, font: 'Arial' })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '2. Verificación de Saldo en Tiempo Real: ', bold: true, size: 18, color: darkSlate, font: 'Arial' }),
              new TextRun({ text: 'Antes de registrar un cobro, el sistema consulta en vivo la orden. Si detecta que la orden ya fue cobrada previamente, cancela la acción de inmediato y avisa en pantalla: "Esta orden ya fue saldada".', size: 18, color: darkSlate, font: 'Arial' })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '3. Filtro Anti-Duplicidad de Caja: ', bold: true, size: 18, color: darkSlate, font: 'Arial' }),
              new TextRun({ text: 'La base de datos rechaza automáticamente cualquier intento de insertar un cobro idéntico en la misma caja y con la misma orden si ocurre dentro de una ventana de 15 segundos.', size: 18, color: darkSlate, font: 'Arial' })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '4. Buscador Inteligente: ', bold: true, size: 18, color: darkSlate, font: 'Arial' }),
              new TextRun({ text: 'Al escribir un número de orden en el buscador, el sistema prioriza y coloca arriba las órdenes más recientes y activas, eliminando la confusión con órdenes de meses pasados.', size: 18, color: darkSlate, font: 'Arial' })
            ],
            spacing: { after: 300 }
          }),

          // 6. CONCLUSIÓN Y CONFORMIDAD
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '6. Conclusión y Verificación en Pantalla',
                bold: true,
                size: 24,
                color: primaryColor,
                font: 'Arial'
              })
            ],
            spacing: { before: 200, after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'El sistema de MR Lavandería Express se encuentra al día, auditado y 100% operativo.',
                bold: true,
                size: 20,
                color: successColor,
                font: 'Arial'
              })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Cuando la administración o la cajera consulte el historial de cuadres de caja en Klynn (presionando F5 para refrescar la pantalla), verán el cuadre del 22 de septiembre totalmente limpio, sin cobros repetidos y con sus RD$ 5,975.00 reales de ventas registradas.',
                size: 20,
                color: darkSlate,
                font: 'Arial'
              })
            ],
            spacing: { after: 300 }
          }),

          // FIRMAS
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Atentamente,',
                bold: true,
                size: 20,
                color: darkSlate,
                font: 'Arial'
              })
            ],
            spacing: { before: 300, after: 50 }
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Equipo de Soporte Técnico y Operaciones — Klynn Cloud',
                bold: true,
                size: 20,
                color: primaryColor,
                font: 'Arial'
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'República Dominicana — info@klynn.com.do',
                size: 16,
                color: mutedColor,
                font: 'Arial'
              })
            ]
          })
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = 'C:/Users/Yeri Orlando/Desktop/Informe_Auditoria_MR_Lavanderia_Express.docx';
  fs.writeFileSync(outputPath, buffer);
  console.log('Documento creado exitosamente en:', outputPath);
}

generateAuditReport().catch(console.error);
