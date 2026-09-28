import { Scale, ShieldCheck, Layers, Smartphone, Truck, Clock, Sparkles } from "lucide-react";
import { type CountryLandingProps } from "@/components/klynn/CountryLanding";

export interface CountrySEOConfig extends CountryLandingProps {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  defaultPrice: string;
}

export const COUNTRY_SEO_CONFIGS: Record<string, CountrySEOConfig> = {
  MX: {
    countryCode: "MX",
    countryName: "México",
    countryFlag: "🇲🇽",
    slug: "software-lavanderia-mexico",
    currencySymbol: "$",
    currencyCode: "MXN",
    currencyDecimals: 2,
    taxName: "IVA",
    taxRate: 16,
    regulatoryBody: "SAT (CFDI 4.0)",
    docLabel: "RFC",
    defaultPrice: "350.00",
    metaTitle: "Software para Lavanderías en México — Sistema de Facturación en la Nube y POS | Klynn",
    metaDescription: "El sistema de facturación para lavanderías, tintorerías y planchadurías #1 en México. Software de facturación en la nube, control de ropa por kilo, tickets térmicos 58/80mm, SAT CFDI 4.0 con RFC y WhatsApp automático.",
    metaKeywords: "software para lavanderias, sistema de facturacion para lavanderias, software de facturacion en la nube para lavanderias, software para lavanderias en mexico, punto de venta lavanderia mexico, software tintorerias y planchadurias sat cfdi, programa para lavanderias cdmx guadalajara monterrey, software cobro por kilo lavanderia",
    heroHeadline: "Sistema de Facturación para Lavanderías en México",
    heroHighlight: "y Software en la Nube #1",
    heroSubtitle: "El punto de venta POS y sistema de facturación en la nube diseñado para lavanderías, tintorerías y planchadurías en México. Controla ropa por kilo en báscula, emite tickets térmicos 58/80mm, envía avisos por WhatsApp y cumple con el SAT sin complicaciones.",
    regionsLabel: "Ciudades y Estados",
    regions: [
      "CDMX", "Guadalajara (Jalisco)", "Monterrey (Nuevo León)", "Puebla", 
      "Querétaro", "Cancún (Quintana Roo)", "Tijuana (Baja California)", 
      "Mérida (Yucatán)", "León (Guanajuato)", "Toluca (Edomex)", 
      "San Luis Potosí", "Aguascalientes"
    ],
    ticketData: {
      businessName: "Tintorería & Planchaduría Reforma",
      docLabel: "RFC",
      docValue: "TPM180415AB2",
      phone: "+52 55 4123 5678",
      address: "Av. Paseo de la Reforma #222, Cuauhtémoc, CDMX",
      orderNumber: "CDMX-2026-0842",
      fiscalNumber: "CFDI: A-10492",
      dateStr: "28/09/2026 11:20 AM",
      clientName: "Rodrigo Morales (Col. Juárez)",
      items: [
        { name: "Lavado por Kilo (4.5 kg)", detail: "Detergente biodegradable + suavizante", price: 135.00 },
        { name: "Planchado Camisas x3", detail: "Almidonado fino a vapor", price: 105.00 },
        { name: "Edredón King Size x1", detail: "Lavado en seco y desinfección", price: 220.00 }
      ]
    },
    challenges: [
      {
        title: "Cobro Ágil por Kilo y Piezas",
        description: "Pesaje rápido en báscula con cálculo automático por kilo, o tarifas fijas por prenda (edredones, trajes, chamarras). Registra en 15 segundos y reduce filas en mostrador.",
        icon: Scale,
        badge: "Báscula y Mostrador"
      },
      {
        title: "Cumplimiento SAT CFDI 4.0 con RFC",
        description: "Genera comprobantes fiscales con RFC de cliente y desglose automático de IVA 16% (o tasa 8% para zona fronteriza). Tu contador recibirá reportes listos en Excel y CSV.",
        icon: ShieldCheck,
        badge: "SAT & Facturación"
      },
      {
        title: "Control de Estantes y Percheros",
        description: "Asigna número de casillero o gancho a cada lote de ropa. Localiza cualquier edredón o prenda en 3 segundos y evita reclamos de clientes en horas pico.",
        icon: Layers,
        badge: "Cero Prendas Perdidas"
      }
    ],
    testimonial: {
      name: "Lic. Mauricio Valenzuela",
      role: "Propietario",
      business: "CleanMaster Tintorerías",
      location: "Col. Del Valle, Ciudad de México",
      text: "En México las tintorerías sufríamos con los papelitos que se mojaban en mostrador y los clientes que llamaban cada hora a preguntar si ya estaba su ropa. Con Klynn el sistema manda el WhatsApp en cuanto la marcamos como lista, y el arqueo de caja con Clip y transferencias SPEI cuadra al centavo.",
      rating: 5
    },
    faqs: [
      {
        question: "¿Qué impresoras térmicas de tickets funcionan con Klynn en México?",
        answer: "Cualquier impresora térmica estándar de 58mm u 80mm con conexión USB, Bluetooth, Ethernet o WiFi (marcas Epson, Xprinter, EC-Line, POS-D, Star Micronics, etc.) funciona nativamente sin drivers complicados."
      },
      {
        question: "¿El sistema de facturación en la nube cumple con el SAT y CFDI en México?",
        answer: "Sí, Klynn permite desglosar el IVA al 16% (o 8% en franja fronteriza norte), registrar el RFC del cliente, su razón social y uso de CFDI, exportando la información lista para tu despacho contable."
      },
      {
        question: "¿Cómo se maneja el cobro de ropa por kilo y cobro por prendas individuales?",
        answer: "Puedes mezclar ambos en el mismo ticket térmico: ingresas el peso exacto en kilos (ej: 4.5 kg) y agregas prendas fijas como edredones, trajes o planchado de camisas con precios predeterminados de tu sucursal."
      },
      {
        question: "¿Puedo administrar varias sucursales en CDMX, Guadalajara o Monterrey desde una misma cuenta?",
        answer: "Sí, Klynn cuenta con soporte multi-sucursal nativo. Puedes ver las ventas, clientes, ingresos y estantería de cada sucursal de manera independiente o consolidada en tiempo real desde tu celular o computadora."
      }
    ]
  },

  CO: {
    countryCode: "CO",
    countryName: "Colombia",
    countryFlag: "🇨🇴",
    slug: "software-lavanderia-colombia",
    currencySymbol: "$",
    currencyCode: "COP",
    currencyDecimals: 0,
    taxName: "IVA",
    taxRate: 19,
    regulatoryBody: "DIAN (Documento Equivalente POS)",
    docLabel: "NIT",
    defaultPrice: "69000",
    metaTitle: "Software para Lavanderías en Colombia — Sistema de Facturación en la Nube y POS | Klynn",
    metaDescription: "El sistema de facturación para lavanderías y tintorerías #1 en Colombia. Software de facturación en la nube, control de ropa por kilo, tickets térmicos 58/80mm, DIAN con NIT e IVA 19%, y WhatsApp automático.",
    metaKeywords: "software para lavanderias, sistema de facturacion para lavanderias, software de facturacion en la nube para lavanderias, software para lavanderias en colombia, pos lavanderia bogota medellin cali, software tintorerias dian nit iva, programa lavanderia cobro por kilo nequi daviplata",
    heroHeadline: "Sistema de Facturación para Lavanderías en Colombia",
    heroHighlight: "y Software en la Nube Líder",
    heroSubtitle: "El punto de venta POS y sistema de facturación en la nube diseñado para lavanderías, tintorerías y servicios de planchado en Colombia. Controla ropa por kilo en báscula, emite tickets térmicos 58/80mm, envía avisos por WhatsApp y concilia tus pagos con Nequi, Daviplata y Bancolombia.",
    regionsLabel: "Departamentos y Ciudades",
    regions: [
      "Bogotá D.C. (Chapinero, Usaquén, Suba)", "Medellín (El Poblado, Laureles, Envigado)",
      "Cali (Valle del Cauca)", "Barranquilla (Atlántico)", "Bucaramanga (Santander)",
      "Cartagena (Bolívar)", "Pereira (Risaralda)", "Manizales (Caldas)",
      "Cúcuta (Norte de Santander)", "Ibagué (Tolima)", "Santa Marta (Magdalena)", "Villavicencio (Meta)"
    ],
    ticketData: {
      businessName: "AquaClean Lavandería Express",
      docLabel: "NIT",
      docValue: "900.842.109-3",
      phone: "+57 300 456 7890",
      address: "Cra. 43A #1-50, El Poblado, Medellín",
      orderNumber: "MED-2026-0715",
      fiscalNumber: "POS: DIAN-10294",
      dateStr: "28/09/2026 10:45 AM",
      clientName: "Valentina Morales (Laureles)",
      items: [
        { name: "Lavado Ropa por Kilo (4 kg)", detail: "Ciclo suave con suavizante aromático", price: 20000 },
        { name: "Planchado Camisas Sastre x3", detail: "Al vapor con almidonado", price: 21000 },
        { name: "Edredón Doble Plumón x1", detail: "Lavado en seco y desinfección", price: 35000 }
      ]
    },
    challenges: [
      {
        title: "Cobro por Kilo y Pesaje en Báscula",
        description: "Ingresa el peso exacto de la colada y calcula tarifas al instante. Combina prendas por kilo con servicios especializados como edredones o ternos en un solo recibo.",
        icon: Scale,
        badge: "Báscula y Mostrador"
      },
      {
        title: "Conciliación con Nequi, Daviplata y Bancolombia",
        description: "La mayoría de tus clientes pagan por transferencias móviles. Klynn registra el canal de pago exacto para que el cuadre de caja al cierre de turno no tenga descuadres.",
        icon: Smartphone,
        badge: "Cero Descuadres"
      },
      {
        title: "Documento Equivalente POS y DIAN con NIT",
        description: "Genera comprobantes de venta con el NIT de tu negocio o del cliente y cálculo transparente de IVA 19%, con reportes exportables a Excel para tu contador.",
        icon: ShieldCheck,
        badge: "Cumplimiento DIAN"
      }
    ],
    testimonial: {
      name: "Andrés Restrepo",
      role: "Gerente Operativo",
      business: "Tintorerías El Poblado",
      location: "Medellín, Antioquia",
      text: "Antes usábamos libretas de papel que se manchaban con agua y se nos perdían edredones en los percheros. Con Klynn asignamos casillero a cada orden, el cliente recibe su WhatsApp automático cuando terminamos y el cuadre de Nequi y Daviplata sale perfecto todos los días.",
      rating: 5
    },
    faqs: [
      {
        question: "¿Klynn es compatible con impresoras térmicas en Colombia?",
        answer: "Sí, es compatible con cualquier impresora térmica de 58mm u 80mm por USB, Bluetooth o Red (Epson TM-T20, SAT, Xprinter, Bematech, Digital POS, etc.) sin controladores especiales."
      },
      {
        question: "¿Cómo apoya Klynn en la normativa DIAN y documento equivalente POS?",
        answer: "Klynn emite tickets térmicos con numeración consecutiva, datos fiscales del emisor, NIT del cliente y desglose detallado de IVA (19%), listos para exportar en Excel a tu asesor contable."
      },
      {
        question: "¿Puedo controlar varias lavanderías en Bogotá, Medellín o Cali?",
        answer: "Totalmente. Klynn es un software de facturación en la nube multi-sucursal que te permite visualizar las ventas, inventario y repartidores de todas tus sedes en tiempo real desde cualquier dispositivo."
      }
    ]
  },

  PE: {
    countryCode: "PE",
    countryName: "Perú",
    countryFlag: "🇵🇪",
    slug: "software-lavanderia-peru",
    currencySymbol: "S/.",
    currencyCode: "PEN",
    currencyDecimals: 2,
    taxName: "IGV",
    taxRate: 18,
    regulatoryBody: "SUNAT (Comprobante Electrónico)",
    docLabel: "RUC",
    defaultPrice: "69.00",
    metaTitle: "Software para Lavanderías en Perú — Sistema de Facturación en la Nube y POS | Klynn",
    metaDescription: "El sistema de facturación para lavanderías y tintorerías líder en Perú. Software de facturación en la nube, control de lavado al peso por kilo, tickets térmicos 58/80mm, SUNAT con RUC e IGV 18%, y WhatsApp automático.",
    metaKeywords: "software para lavanderias, sistema de facturacion para lavanderias, software de facturacion en la nube para lavanderias, software para lavanderias en peru, sistema de lavanderia lima arequipa trujillo, software tintorerias sunat ruc igv, programa de lavanderia al peso por kilo",
    heroHeadline: "Sistema de Facturación para Lavanderías en Perú",
    heroHighlight: "y Software en la Nube",
    heroSubtitle: "El punto de venta POS y sistema de facturación en la nube que moderniza las lavanderías y tintorerías en Lima y provincias. Cobra al peso por kilo o por prenda, emite tickets térmicos, notifica por WhatsApp y mantén tu caja cuadrada con Yape, Plin y efectivo.",
    regionsLabel: "Departamentos y Distritos",
    regions: [
      "Lima (Miraflores, San Isidro, Surco)", "Lima (San Borja, Jesús María, Los Olivos)",
      "Arequipa", "Trujillo (La Libertad)", "Chiclayo (Lambayeque)", "Cusco",
      "Piura", "Huancayo (Junín)", "Tacna", "Ica", "Callao", "Cajamarca"
    ],
    ticketData: {
      businessName: "Lavandería San Isidro Express",
      docLabel: "RUC",
      docValue: "20601234567",
      phone: "+51 912 345 678",
      address: "Av. Conquistadores #410, San Isidro, Lima",
      orderNumber: "LIM-2026-0312",
      fiscalNumber: "Boleta: B001-00452",
      dateStr: "28/09/2026 10:15 AM",
      clientName: "Renzo Palacios (Miraflores)",
      items: [
        { name: "Lavado al Peso (3.5 kg)", detail: "Detergente enzimático + suavizante", price: 21.00 },
        { name: "Terno de 2 Piezas x1", detail: "Lavado al seco y vaporizado", price: 28.00 },
        { name: "Camisas sastre x2", detail: "Planchado y embolsado en gancho", price: 16.00 }
      ]
    },
    challenges: [
      {
        title: "Lavado al Peso y Balanza en Mostrador",
        description: "Registra kilos y gramos en segundos con cálculo automático del importe total. Reduce tiempos de espera en mostrador y atiende más clientes en horas punta.",
        icon: Scale,
        badge: "Ropa al Peso"
      },
      {
        title: "SUNAT con RUC, Boletas y Facturas",
        description: "Emite comprobantes con desglose de IGV 18% para clientes individuales o corporativos con RUC. Exporta el reporte contable listo para tu declaración mensual.",
        icon: ShieldCheck,
        badge: "SUNAT & Tributación"
      },
      {
        title: "Cuadre con Yape, Plin y Efectivo",
        description: "Registra cobros mixtos al instante sin descuadres en el arqueo diario de caja: visualiza cuánto entró por Yape, Plin, POS Visa y billetes físicos.",
        icon: Smartphone,
        badge: "Yape & Plin al Día"
      }
    ],
    testimonial: {
      name: "Gonzalo Alarcón",
      role: "Administrador",
      business: "Lavanderías Lima Sur",
      location: "Miraflores, Lima",
      text: "En Lima la gente no quiere hacer colas en el mostrador. Con Klynn pesamos la ropa, imprimimos el ticket térmico con código QR y en 20 segundos el cliente ya se fue contento con su comprobante. Los avisos por WhatsApp han hecho que la gente retire su ropa a tiempo.",
      rating: 5
    },
    faqs: [
      {
        question: "¿Qué impresoras térmicas son compatibles en Perú?",
        answer: "Klynn funciona directamente con cualquier impresora térmica de 58mm u 80mm conectada por USB, Bluetooth o Red (Epson TM-T20, Xprinter, Bixolon, 3nStar, etc.) sin intermediarios."
      },
      {
        question: "¿El sistema permite cobrar con Yape y Plin?",
        answer: "Sí, la caja permite categorizar pagos por Yape, Plin, Efectivo, Tarjetas y Transferencias bancarias para que tu cierre de caja diario sea 100% exacto."
      }
    ]
  },

  PA: {
    countryCode: "PA",
    countryName: "Panamá",
    countryFlag: "🇵🇦",
    slug: "software-lavanderia-panama",
    currencySymbol: "$",
    currencyCode: "USD",
    currencyDecimals: 2,
    taxName: "ITBMS",
    taxRate: 7,
    regulatoryBody: "DGI Panamá (Facturación Fiscal)",
    docLabel: "RUC",
    defaultPrice: "39.00",
    metaTitle: "Software para Lavanderías en Panamá — Sistema de Facturación en la Nube y POS | Klynn",
    metaDescription: "El sistema de facturación para lavanderías y tintorerías líder en Panamá. Software de facturación en la nube en dólares (USD), tickets térmicos 58/80mm, ITBMS 7% con RUC ante la DGI, y WhatsApp automático.",
    metaKeywords: "software para lavanderias, sistema de facturacion para lavanderias, software de facturacion en la nube para lavanderias, software lavanderia panama, punto de venta pos lavanderia panama ciudad dgi itbms, sistema para tintorerias panama",
    heroHeadline: "Sistema de Facturación para Lavanderías en Panamá",
    heroHighlight: "y Software en la Nube en Dólares (USD)",
    heroSubtitle: "Control total de tu lavandería o tintorería en Ciudad de Panamá y el interior. Facturación en dólares, cálculo de ITBMS 7%, tickets térmicos 58/80mm, WhatsApp automatizado y control de entregas a domicilio.",
    regionsLabel: "Provincias y Corregimientos",
    regions: [
      "Ciudad de Panamá (San Francisco, Bella Vista)", "Costa del Este & Punta Pacífica",
      "El Cangrejo & Obarrio", "Panamá Oeste (La Chorrera, Arraiján)",
      "Colón", "David (Chiriquí)", "Chitré (Herrera)", "Santiago (Veraguas)"
    ],
    ticketData: {
      businessName: "Wash & Dry Balboa Express",
      docLabel: "RUC",
      docValue: "155123456-2-2020 DV 12",
      phone: "+507 6123-4567",
      address: "Calle 50 y Vía Porras, San Francisco, Panamá",
      orderNumber: "PAN-2026-0419",
      fiscalNumber: "Factura: DGI-8902",
      dateStr: "28/09/2026 09:30 AM",
      clientName: "Esteban Castillero (Costa del Este)",
      items: [
        { name: "Lavado y Doblado por Libra (6 lb)", detail: "Suavizante hipoalergénico", price: 9.00 },
        { name: "Planchado Camisas Ejecutivas x3", detail: "Planchaduría a vapor", price: 6.75 },
        { name: "Saco Formal x1", detail: "Lavado en seco profesional", price: 7.50 }
      ]
    },
    challenges: [
      {
        title: "Entregas en Torres y Condominios",
        description: "Coordina repartidores en San Francisco, Costa del Este y Bella Vista con rutas organizadas y firma digital de recepción.",
        icon: Truck,
        badge: "Logística Urbana"
      },
      {
        title: "DGI con RUC y Cálculo de ITBMS al 7%",
        description: "Emite tickets con desglose exacto de ITBMS al 7% para clientes particulares o empresas con RUC y dígito verificador (DV).",
        icon: ShieldCheck,
        badge: "DGI & Fiscal"
      },
      {
        title: "Recepción en Mostrador en Segundos",
        description: "Atiende ejecutivos y residentes sin filas: registra prendas, imprime ticket y envía el recibo digital por WhatsApp.",
        icon: Clock,
        badge: "Cero Esperas"
      }
    ],
    testimonial: {
      name: "Mariela Icaza",
      role: "Dueña",
      business: "CleanWave Laundry",
      location: "San Francisco, Ciudad de Panamá",
      text: "En Panamá nuestros clientes aprecian la inmediatez. Klynn redujo el tiempo de recepción a la mitad y el envío automático de tickets y avisos de entrega por WhatsApp nos dio una imagen sumamente profesional.",
      rating: 5
    },
    faqs: [
      {
        question: "¿Klynn opera en dólares (USD) para Panamá?",
        answer: "Sí, todos los precios, balances, reportes y comprobantes operan nativamente en dólares de Estados Unidos (USD) con cálculo de ITBMS al 7%."
      },
      {
        question: "¿Puedo usar cualquier impresora térmica de tickets en Panamá?",
        answer: "Sí, es compatible con impresoras de 58mm y 80mm de cualquier marca (Epson, Xprinter, Star, etc.) conectadas por USB o Bluetooth."
      }
    ]
  },

  CR: {
    countryCode: "CR",
    countryName: "Costa Rica",
    countryFlag: "🇨🇷",
    slug: "software-lavanderia-costa-rica",
    currencySymbol: "₡",
    currencyCode: "CRC",
    currencyDecimals: 0,
    taxName: "IVA",
    taxRate: 13,
    regulatoryBody: "Ministerio de Hacienda (DGT)",
    docLabel: "NIF / Cédula",
    defaultPrice: "22000",
    metaTitle: "Software para Lavanderías en Costa Rica — Sistema de Facturación en la Nube | Klynn",
    metaDescription: "El software para lavanderías y tintorerías #1 en Costa Rica. Sistema de facturación en la nube en Colones (CRC), control de ropa por kilo, tickets térmicos, IVA 13% y WhatsApp automático.",
    metaKeywords: "software para lavanderias, sistema de facturacion para lavanderias, software de facturacion en la nube para lavanderias, software lavanderia costa rica, pos lavanderia san jose alajuela heredia, tiquete electronico lavanderia hacienda",
    heroHeadline: "Sistema de Facturación para Lavanderías en Costa Rica",
    heroHighlight: "y Software en la Nube en Colones (CRC)",
    heroSubtitle: "Moderniza tu lavandería en el Gran Área Metropolitana y todo Costa Rica. Cobra por kilo o por prenda en colones, emite tickets térmicos, envía notificaciones por WhatsApp y concilia tus cobros con SINPE Móvil sin descuadres.",
    regionsLabel: "Provincias y Cantones",
    regions: [
      "San José (Escazú, Santa Ana)", "San José (San Pedro, Moravia)",
      "Alajuela", "Heredia", "Cartago", "Guanacaste (Liberia, Tamarindo)",
      "Puntarenas", "Limón"
    ],
    ticketData: {
      businessName: "Lavandería Pura Vida Express",
      docLabel: "Cédula Jurídica",
      docValue: "3-101-987654",
      phone: "+506 8123 4567",
      address: "Centro Comercial Plaza Escazú, San José",
      orderNumber: "CR-2026-0518",
      fiscalNumber: "Tiquete: TE-00491",
      dateStr: "28/09/2026 10:00 AM",
      clientName: "Esteban Monge (Santa Ana)",
      items: [
        { name: "Lavado y Secado por Kilo (4 kg)", detail: "Detergente ecológico biodegradable", price: 6400 },
        { name: "Planchado Camisas x3", detail: "Planchaduría fina al vapor", price: 5250 },
        { name: "Edredón Matrimonial x1", detail: "Lavado especial delicado", price: 8500 }
      ]
    },
    challenges: [
      {
        title: "Conciliación con SINPE Móvil",
        description: "Registra cobros por SINPE Móvil al instante para que tu arqueo de caja diario coincida con las transferencias recibidas en tu teléfono.",
        icon: Smartphone,
        badge: "SINPE al Día"
      },
      {
        title: "IVA 13% y Tiquete Electrónico",
        description: "Cálculo transparente de IVA 13% y tiquetes para clientes residenciales o empresas ante el Ministerio de Hacienda.",
        icon: ShieldCheck,
        badge: "Hacienda DGT"
      },
      {
        title: "Control de Casilleros y Percheros",
        description: "Asigna ubicación exacta a cada orden de colada o planchado para entregar en segundos cuando el cliente llega a recoger.",
        icon: Layers,
        badge: "Cero Confusiones"
      }
    ],
    testimonial: {
      name: "Gloriana Jiménez",
      role: "Propietaria",
      business: "Lavandería EcoClean",
      location: "Escazú, San José",
      text: "Con el auge del SINPE Móvil en Costa Rica la caja se nos volvía un dolor de cabeza. Klynn nos permitió registrar exactamente qué pago fue en efectivo, tarjeta o SINPE, y los avisos de WhatsApp cuando la ropa está lista son un éxito.",
      rating: 5
    },
    faqs: [
      {
        question: "¿El sistema opera en colones costarricenses (CRC)?",
        answer: "Sí, todos los módulos de precios, cálculo de IVA al 13%, arqueos de caja y comprobantes operan nativamente en colones costarricenses."
      },
      {
        question: "¿Cómo inicio la prueba gratis?",
        answer: "Puedes probar Klynn por 14 días sin ingresar tarjeta de crédito. Te registras en 2 minutos y configuras tu catálogo de servicios de inmediato."
      }
    ]
  },

  CL: {
    countryCode: "CL",
    countryName: "Chile",
    countryFlag: "🇨🇱",
    slug: "software-lavanderia-chile",
    currencySymbol: "$",
    currencyCode: "CLP",
    currencyDecimals: 0,
    taxName: "IVA",
    taxRate: 19,
    regulatoryBody: "SII (Boleta Electrónica)",
    docLabel: "RUT",
    defaultPrice: "38000",
    metaTitle: "Software para Lavanderías en Chile — Sistema de Facturación en la Nube y POS | Klynn",
    metaDescription: "El software para lavanderías y tintorerías líder en Chile. Sistema de facturación en la nube en Pesos Chilenos (CLP), tickets térmicos 58/80mm, boleta electrónica SII con RUT e IVA 19%, y WhatsApp automático.",
    metaKeywords: "software para lavanderias, sistema de facturacion para lavanderias, software de facturacion en la nube para lavanderias, software lavanderia chile, pos lavanderia santiago vina concepcion, software tintoreria sii boleta electronica rut",
    heroHeadline: "Sistema de Facturación para Lavanderías en Chile",
    heroHighlight: "y Software en la Nube en Pesos Chilenos (CLP)",
    heroSubtitle: "El software de gestión y punto de venta para lavanderías y tintorerías en Santiago, Viña del Mar, Concepción y todo Chile. Controla coladas por kilo, parkas, trajes y edredones, emite tickets térmicos y gestiona boletas del SII sin enredos.",
    regionsLabel: "Regiones y Comunas",
    regions: [
      "Santiago (Las Condes, Providencia, Vitacura)", "Santiago (Ñuñoa, Santiago Centro, La Reina)",
      "Valparaíso & Viña del Mar", "Concepción (Biobío)", "Antofagasta",
      "La Serena & Coquimbo", "Temuco (La Araucanía)", "Rancagua (O'Higgins)"
    ],
    ticketData: {
      businessName: "Tintorería & Lavandería Providencia",
      docLabel: "RUT",
      docValue: "76.842.109-K",
      phone: "+56 9 1234 5678",
      address: "Av. Providencia #1420, Providencia, Santiago",
      orderNumber: "SCL-2026-0812",
      fiscalNumber: "Boleta: BE-00912",
      dateStr: "28/09/2026 11:00 AM",
      clientName: "Ignacio Valenzuela (Las Condes)",
      items: [
        { name: "Kilo de Ropa Lavado y Doblado (4 kg)", detail: "Detergente hipoalergénico suave", price: 8400 },
        { name: "Parka de Pluma x1", detail: "Lavado especial impermeable", price: 12000 },
        { name: "Planchado Camisas x3", detail: "Planchado fino a vapor en gancho", price: 7500 }
      ]
    },
    challenges: [
      {
        title: "Prendas Delicadas y Temporada de Invierno",
        description: "Control de parkas de pluma, abrigos de lana y cobertores con etiquetas claras y código QR para evitar manchas o confusiones.",
        icon: Scale,
        badge: "Cuidado Experto"
      },
      {
        title: "Emisión y Cuadre Tributario SII con RUT",
        description: "Registro de RUT de clientes particulares o corporativos con desglose de IVA al 19% para facilitar tus declaraciones tributarias.",
        icon: ShieldCheck,
        badge: "SII & Boletas"
      },
      {
        title: "Arqueo de Efectivo, Webpay y Transferencias",
        description: "Conciliación exacta de pagos recibidos vía Transbank/Webpay, transferencias bancarias y efectivo al cierre de cada turno.",
        icon: Smartphone,
        badge: "Caja Cuadrada"
      }
    ],
    testimonial: {
      name: "Rodrigo Errázuriz",
      role: "Socio Fundador",
      business: "CleanService Chile",
      location: "Las Condes, Santiago",
      text: "En Santiago el cliente exige rapidez y formalidad. Con Klynn pesamos la colada en segundos, emitimos el ticket térmico con el RUT del cliente y el aviso automático por WhatsApp evita que la ropa se acumule en nuestro local.",
      rating: 5
    },
    faqs: [
      {
        question: "¿Cómo opera el cálculo de IVA 19% y boletas en Chile?",
        answer: "Klynn desglosa automáticamente el IVA al 19% en cada orden, registra el RUT del cliente y permite exportar resúmenes de ventas compatibles con tu contador."
      },
      {
        question: "¿Funciona en Mac, Windows y tablets?",
        answer: "Sí, es 100% cloud y funciona en cualquier navegador web sin necesidad de instalar programas pesados."
      }
    ]
  },

  EC: {
    countryCode: "EC",
    countryName: "Ecuador",
    countryFlag: "🇪🇨",
    slug: "software-lavanderia-ecuador",
    currencySymbol: "$",
    currencyCode: "USD",
    currencyDecimals: 2,
    taxName: "IVA",
    taxRate: 15,
    regulatoryBody: "SRI (Facturación Electrónica)",
    docLabel: "RUC",
    defaultPrice: "39.00",
    metaTitle: "Software para Lavanderías en Ecuador — Sistema de Facturación en la Nube y POS | Klynn",
    metaDescription: "El software para lavanderías y tintorerías líder en Ecuador. Sistema de facturación en la nube en dólares (USD), tickets térmicos 58/80mm, SRI con RUC e IVA 15%, y WhatsApp automático.",
    metaKeywords: "software para lavanderias, sistema de facturacion para lavanderias, software de facturacion en la nube para lavanderias, software lavanderia ecuador quito guayaquil cuenca, pos lavanderia sri ruc iva",
    heroHeadline: "Sistema de Facturación para Lavanderías en Ecuador",
    heroHighlight: "y Software en la Nube en Dólares (USD)",
    heroSubtitle: "Control integral para lavanderías y tintorerías en Quito, Guayaquil, Cuenca y todo el Ecuador. Facturación en dólares, IVA al 15%, emisión de tickets térmicos 58/80mm y WhatsApp automático cuando la ropa está lista.",
    regionsLabel: "Provincias y Cantones",
    regions: [
      "Quito (Pichincha - La Carolina, Cumbayá)", "Guayaquil (Guayas - Samborondón, Urdesa)",
      "Cuenca (Azuay)", "Manta & Portoviejo (Manabí)", "Ambato (Tungurahua)",
      "Santo Domingo", "Machala (El Oro)", "Loja"
    ],
    ticketData: {
      businessName: "Lavandería & Tintorería Los Andes",
      docLabel: "RUC",
      docValue: "1790012345001",
      phone: "+593 99 123 4567",
      address: "Av. República del Salvador #450, La Carolina, Quito",
      orderNumber: "UIO-2026-0614",
      fiscalNumber: "Factura: SRI-00412",
      dateStr: "28/09/2026 10:30 AM",
      clientName: "Felipe Noboa (Cumbayá)",
      items: [
        { name: "Lavado de Ropa por Peso (7 lb)", detail: "Detergente hipoalergénico + secado", price: 7.00 },
        { name: "Terno de 2 piezas x1", detail: "Lavado en seco y planchado", price: 8.50 },
        { name: "Planchado Camisas x3", detail: "Almidonado a vapor en percha", price: 4.50 }
      ]
    },
    challenges: [
      {
        title: "Facturación SRI con RUC y Cédula",
        description: "Emisión de comprobantes con cálculo exacto de IVA al 15% y datos fiscales listos para la declaración ante el SRI.",
        icon: ShieldCheck,
        badge: "SRI Ecuador"
      },
      {
        title: "Conciliación con Deuna y Transferencias",
        description: "Arqueo de caja claro registrando cobros con Deuna, Banco Pichincha, Guayaquil y efectivo en mostrador.",
        icon: Smartphone,
        badge: "Caja en Orden"
      },
      {
        title: "Avisos Automáticos por WhatsApp",
        description: "Elimina las llamadas telefónicas: el cliente recibe un WhatsApp automático al marcar su orden como lista.",
        icon: Clock,
        badge: "-90% Llamadas"
      }
    ],
    testimonial: {
      name: "Santiago Cárdenas",
      role: "Gerente",
      business: "AquaWash Quito",
      location: "La Carolina, Quito",
      text: "Con el cambio de IVA y la necesidad de tener reportes al día para el SRI, Klynn fue la mejor decisión. Funciona en dólares, imprime rápido y la app para repartidores nos ayuda a cubrir Cumbayá y Quito Norte.",
      rating: 5
    },
    faqs: [
      {
        question: "¿El sistema calcula el IVA al 15% vigente en Ecuador?",
        answer: "Sí, Klynn aplica automáticamente la tasa de IVA al 15% y permite personalizarla si tu régimen tributario lo requiere."
      },
      {
        question: "¿Es compatible con impresoras de recibos térmicos?",
        answer: "Totalmente compatible con impresoras térmicas ESC/POS de 58mm y 80mm conectadas por USB, red o Bluetooth."
      }
    ]
  },

  ES: {
    countryCode: "ES",
    countryName: "España",
    countryFlag: "🇪🇸",
    slug: "software-lavanderia-espana",
    currencySymbol: "€",
    currencyCode: "EUR",
    currencyDecimals: 2,
    taxName: "IVA",
    taxRate: 21,
    regulatoryBody: "Agencia Tributaria (AEAT / Veri*factu)",
    docLabel: "NIF / CIF",
    defaultPrice: "39.00",
    metaTitle: "Software para Lavanderías en España — Sistema de Facturación en la Nube y TPV | Klynn",
    metaDescription: "El software para lavanderías, tintorerías y coladas por peso líder en España. TPV en la nube en Euros (€), tickets térmicos 58/80mm, IVA 21% con NIF/CIF (AEAT / Veri*factu), y WhatsApp automático.",
    metaKeywords: "software para lavanderias, sistema de facturacion para lavanderias, software de facturacion en la nube para lavanderias, software lavanderia espana madrid barcelona valencia, tpv lavanderia tintoreria ticket iva 21",
    heroHeadline: "Sistema de Facturación para Lavanderías en España",
    heroHighlight: "y Software TPV en la Nube en Euros (€)",
    heroSubtitle: "El software TPV y sistema de facturación en la nube para lavanderías, tintorerías y servicios de planchado en Madrid, Barcelona, Valencia y toda España. Coladas por kilo, tickets térmicos, WhatsApp y adaptación fiscal con IVA 21%.",
    regionsLabel: "Comunidades y Provincias",
    regions: [
      "Madrid (Salamanca, Chamberí, Pozuelo)", "Barcelona (Eixample, Gràcia, Sarrià)",
      "Valencia", "Sevilla", "Málaga & Costa del Sol", "Bilbao (Vizcaya)",
      "Zaragoza", "Alicante", "Murcia", "Palma de Mallorca"
    ],
    ticketData: {
      businessName: "Tintorería y Lavandería El Sol",
      docLabel: "NIF/CIF",
      docValue: "B12345678",
      phone: "+34 612 34 56 78",
      address: "Calle de Serrano #110, Barrio de Salamanca, Madrid",
      orderNumber: "MAD-2026-0921",
      fiscalNumber: "Factura Simplificada: TS-00812",
      dateStr: "28/09/2026 11:30 AM",
      clientName: "Javier Gómez (Chamberí)",
      items: [
        { name: "Colada Lavado y Doblado (4 kg)", detail: "Jabón neutro y suavizante ecológico", price: 8.00 },
        { name: "Planchado Camisas x3", detail: "Planchado artesanal en percha", price: 7.50 },
        { name: "Traje 2 Piezas Tintorería x1", detail: "Limpieza en seco profesional", price: 12.00 }
      ]
    },
    challenges: [
      {
        title: "Facturación Simplificada e IVA 21%",
        description: "Emisión de tickets térmicos con número correlativo, desglose de base imponible e IVA al 21% según exigencias de la AEAT.",
        icon: ShieldCheck,
        badge: "AEAT & Facturas"
      },
      {
        title: "Control de Perchas y Casilleros",
        description: "Localización rápida de prendas colgadas o embolsadas mediante códigos de orden para evitar demoras al cliente en mostrador.",
        icon: Layers,
        badge: "Organización Total"
      },
      {
        title: "Cobros con Bizum y TPV Tarjeta",
        description: "Registra cobros con Bizum, datáfono bancario y efectivo con cuadre de caja ciego al final de la jornada.",
        icon: Smartphone,
        badge: "Bizum & Tarjetas"
      }
    ],
    testimonial: {
      name: "Carmen Navarro",
      role: "Encargada",
      business: "Tintorería Chamberí",
      location: "Madrid, España",
      text: "Buscábamos un TPV moderno que no fuera complejo. Klynn es rapidísimo: en 15 segundos emitimos el ticket con IVA 21% y el aviso automático por WhatsApp es la función más agradecida por nuestros clientes habituales.",
      rating: 5
    },
    faqs: [
      {
        question: "¿El sistema cumple con los requisitos de factura simplificada en España?",
        answer: "Sí, emite facturas simplificadas con numeración correlativa, fecha, NIF del emisor, desglose de IVA (21% y reducidos) y descripción de servicios."
      },
      {
        question: "¿Qué impresoras son compatibles?",
        answer: "Cualquier impresora de tickets térmica estándar de 80mm o 57mm compatible con ESC/POS."
      }
    ]
  },

  GT: {
    countryCode: "GT",
    countryName: "Guatemala",
    countryFlag: "🇬🇹",
    slug: "software-lavanderia-guatemala",
    currencySymbol: "Q",
    currencyCode: "GTQ",
    currencyDecimals: 2,
    taxName: "IVA",
    taxRate: 12,
    regulatoryBody: "SAT Guatemala (Régimen FEL)",
    docLabel: "NIT",
    defaultPrice: "310.00",
    metaTitle: "Software para Lavanderías en Guatemala — Sistema de Facturación en la Nube | Klynn",
    metaDescription: "El software para lavanderías y tintorerías líder en Guatemala. Sistema de facturación en la nube en Quetzales (GTQ), tickets térmicos 58/80mm, SAT con NIT e IVA 12%, y WhatsApp automático.",
    metaKeywords: "software para lavanderias, sistema de facturacion para lavanderias, software de facturacion en la nube para lavanderias, software lavanderia guatemala ciudad xela fel nit",
    heroHeadline: "Sistema de Facturación para Lavanderías en Guatemala",
    heroHighlight: "y Software en la Nube en Quetzales (GTQ)",
    heroSubtitle: "Control operativo y punto de venta para lavanderías y tintorerías en Ciudad de Guatemala, Xela y todo el país. Ropa por libra o kilo, tickets térmicos, avisos por WhatsApp y cálculo de IVA al 12%.",
    regionsLabel: "Departamentos y Zonas",
    regions: [
      "Ciudad de Guatemala (Zona 10, 14, 15)", "Carretera a El Salvador",
      "Quetzaltenango (Xela)", "Antigua Guatemala (Sacatepéquez)",
      "Escuintla", "San Marcos", "Cobán (Alta Verapaz)", "Chimaltenango"
    ],
    ticketData: {
      businessName: "Lavandería Quetzal Real",
      docLabel: "NIT",
      docValue: "1234567-8",
      phone: "+502 5123 4567",
      address: "Zona 10, Ciudad de Guatemala",
      orderNumber: "GUA-2026-0219",
      fiscalNumber: "DTE: FEL-19028",
      dateStr: "28/09/2026 10:20 AM",
      clientName: "Alejandro Asturias (Zona 14)",
      items: [
        { name: "Lavado por Libra (8 lb)", detail: "Cuidado delicado con suavizante", price: 40.00 },
        { name: "Planchado Camisas x3", detail: "Al vapor en gancho", price: 30.00 },
        { name: "Edredón Matrimonial x1", detail: "Lavado en seco especial", price: 45.00 }
      ]
    },
    challenges: [
      {
        title: "Lavado al Peso y por Prendas",
        description: "Pesaje por libra o kilo con cálculo automático del total a cobrar para evitar demoras en mostrador.",
        icon: Scale,
        badge: "Balanza Ágil"
      },
      {
        title: "SAT Guatemala con NIT e IVA 12%",
        description: "Emisión de comprobantes con el NIT del cliente y desglose de IVA del 12% para tu control contable.",
        icon: ShieldCheck,
        badge: "SAT & Facturación"
      },
      {
        title: "WhatsApp Automatizado",
        description: "Notifica al cliente en cuanto su ropa esté lavada y lista para recoger o enviar a domicilio.",
        icon: Clock,
        badge: "Cero Llamadas"
      }
    ],
    testimonial: {
      name: "Ing. Carlos Mendoza",
      role: "Propietario",
      business: "Wash & Press Express",
      location: "Zona 10, Ciudad de Guatemala",
      text: "Klynn nos resolvió el control de prendas en mostrador y los clientes adoran recibir el ticket y la notificación por WhatsApp de inmediato. Muy fácil de usar.",
      rating: 5
    },
    faqs: [
      {
        question: "¿El sistema opera en Quetzales (GTQ)?",
        answer: "Sí, todos los precios, tickets y reportes operan nativamente en Quetzales guatemaltecos con cálculo de IVA al 12%."
      }
    ]
  },

  HN: {
    countryCode: "HN",
    countryName: "Honduras",
    countryFlag: "🇭🇳",
    slug: "software-lavanderia-honduras",
    currencySymbol: "L",
    currencyCode: "HNL",
    currencyDecimals: 2,
    taxName: "ISV",
    taxRate: 15,
    regulatoryBody: "SAR Honduras (Facturación Digital)",
    docLabel: "RTN",
    defaultPrice: "960.00",
    metaTitle: "Software para Lavanderías en Honduras — Sistema de Facturación en la Nube | Klynn",
    metaDescription: "El software para lavanderías y tintorerías líder en Honduras. Sistema de facturación en la nube en Lempiras (HNL), tickets térmicos 58/80mm, SAR con RTN e ISV 15%, y WhatsApp automático.",
    metaKeywords: "software para lavanderias, sistema de facturacion para lavanderias, software de facturacion en la nube para lavanderias, software lavanderia honduras tegucigalpa san pedro sula sar rtn",
    heroHeadline: "Sistema de Facturación para Lavanderías en Honduras",
    heroHighlight: "y Software en la Nube en Lempiras (HNL)",
    heroSubtitle: "Control operativo y punto de venta para lavanderías y tintorerías en Tegucigalpa, San Pedro Sula y toda Honduras. Cobro por libra o kilo, tickets térmicos, avisos por WhatsApp y cálculo de ISV al 15%.",
    regionsLabel: "Departamentos y Ciudades",
    regions: [
      "Tegucigalpa (Francisco Morazán)", "San Pedro Sula (Cortés)",
      "La Ceiba (Atlántida)", "Choluteca", "Comayagua",
      "Roatán (Islas de la Bahía)", "Santa Bárbara", "Danlí (El Paraíso)"
    ],
    ticketData: {
      businessName: "Lavandería Central Morazán",
      docLabel: "RTN",
      docValue: "08011990123456",
      phone: "+504 9123-4567",
      address: "Colonia Palmira, Tegucigalpa, Honduras",
      orderNumber: "TGU-2026-0318",
      fiscalNumber: "Factura: SAR-00812",
      dateStr: "28/09/2026 10:10 AM",
      clientName: "David Zúniga (Palmira)",
      items: [
        { name: "Lavado por Libra (8 lb)", detail: "Secado y doblado en paquete", price: 120.00 },
        { name: "Planchado Camisas x3", detail: "Al vapor profesional", price: 95.00 },
        { name: "Edredón King x1", detail: "Lavado en seco especial", price: 150.00 }
      ]
    },
    challenges: [
      {
        title: "Factura Fiscal SAR con RTN e ISV",
        description: "Emisión de tickets térmicos con el RTN del negocio y desglose de ISV 15% conforme a la normativa fiscal hondureña.",
        icon: ShieldCheck,
        badge: "SAR Honduras"
      },
      {
        title: "Arqueo de Caja y Cobro Mixto",
        description: "Control de cobros en efectivo y transferencias bancarias locales para evitar descuadres al cierre del turno.",
        icon: Smartphone,
        badge: "Caja Exacta"
      },
      {
        title: "Avisos por WhatsApp",
        description: "Envía alertas automáticas cuando la ropa del cliente está lista para retirar.",
        icon: Clock,
        badge: "Rápido Retiro"
      }
    ],
    testimonial: {
      name: "Suyapa Flores",
      role: "Gerente",
      business: "CleanCenter Honduras",
      location: "San Pedro Sula, Honduras",
      text: "Con Klynn organizamos las órdenes de la lavandería en San Pedro Sula. La impresión de tickets es instantánea y los avisos de WhatsApp ahorran muchísimo tiempo.",
      rating: 5
    },
    faqs: [
      {
        question: "¿El sistema maneja Lempiras (HNL) e ISV 15%?",
        answer: "Sí, toda la facturación, precios y reportes operan en Lempiras con cálculo del ISV al 15%."
      }
    ]
  },

  SV: {
    countryCode: "SV",
    countryName: "El Salvador",
    countryFlag: "🇸🇻",
    slug: "software-lavanderia-el-salvador",
    currencySymbol: "$",
    currencyCode: "USD",
    currencyDecimals: 2,
    taxName: "IVA",
    taxRate: 13,
    regulatoryBody: "Ministerio de Hacienda (DTE El Salvador)",
    docLabel: "NIT / NRC",
    defaultPrice: "39.00",
    metaTitle: "Software para Lavanderías en El Salvador — Facturación en la Nube | Klynn",
    metaDescription: "El software para lavanderías y tintorerías líder en El Salvador. Sistema de facturación en la nube en dólares (USD), tickets térmicos 58/80mm, IVA 13% con NIT/NRC, y WhatsApp automático.",
    metaKeywords: "software para lavanderias, sistema de facturacion para lavanderias, software de facturacion en la nube para lavanderias, software lavanderia el salvador san salvador santa tecla dte",
    heroHeadline: "Sistema de Facturación para Lavanderías en El Salvador",
    heroHighlight: "y Software en la Nube en Dólares (USD)",
    heroSubtitle: "El software de punto de venta y gestión para lavanderías y tintorerías en San Salvador, Santa Tecla y todo El Salvador. Opera en dólares, emite tickets térmicos, notifica por WhatsApp y calcula IVA al 13%.",
    regionsLabel: "Departamentos y Municipios",
    regions: [
      "San Salvador (Escalón, San Benito)", "Antiguo Cuscatlán & Santa Elena",
      "Santa Tecla (La Libertad)", "Santa Ana", "San Miguel",
      "Sonsonate", "Ahuachapán", "Usulután"
    ],
    ticketData: {
      businessName: "Lavandería San Salvador Express",
      docLabel: "NIT / NRC",
      docValue: "0614-010190-101-1",
      phone: "+503 7123 4567",
      address: "Santa Elena, Antiguo Cuscatlán, San Salvador",
      orderNumber: "SLV-2026-0192",
      fiscalNumber: "DTE: FACT-00381",
      dateStr: "28/09/2026 10:40 AM",
      clientName: "Mauricio Calderón (San Benito)",
      items: [
        { name: "Lavado de Ropa por Libra (6 lb)", detail: "Suavizante aromático + secado", price: 6.00 },
        { name: "Planchado Camisas x3", detail: "Al vapor en percha", price: 4.50 },
        { name: "Edredón Matrimonial x1", detail: "Lavado especial delicado", price: 8.00 }
      ]
    },
    challenges: [
      {
        title: "Operación Nube en Dólares (USD)",
        description: "Cobros, balances y reportes nativos en dólares con cálculo automático de IVA al 13%.",
        icon: ShieldCheck,
        badge: "Moneda Dólar"
      },
      {
        title: "Control de Estantes y Percheros",
        description: "Asigna casillero a cada cliente para entregar prendas en menos de 5 segundos sin errores.",
        icon: Layers,
        badge: "Cero Pérdidas"
      },
      {
        title: "Avisos por WhatsApp",
        description: "El cliente recibe su aviso automático tan pronto se marca la orden como completada.",
        icon: Clock,
        badge: "WhatsApp Instantáneo"
      }
    ],
    testimonial: {
      name: "Karla Simán",
      role: "Propietaria",
      business: "WashClean El Salvador",
      location: "Santa Elena, San Salvador",
      text: "Klynn nos dio el control que necesitábamos en mostrador. La rapidez para registrar órdenes en dólares y el aviso por WhatsApp hacen la diferencia frente a la competencia.",
      rating: 5
    },
    faqs: [
      {
        question: "¿El sistema opera en dólares estadounidenses?",
        answer: "Sí, todos los módulos de punto de venta, tickets térmicos y finanzas operan nativamente en dólares (USD)."
      }
    ]
  },

  UY: {
    countryCode: "UY",
    countryName: "Uruguay",
    countryFlag: "🇺🇾",
    slug: "software-lavanderia-uruguay",
    currencySymbol: "$",
    currencyCode: "UYU",
    currencyDecimals: 2,
    taxName: "IVA",
    taxRate: 22,
    regulatoryBody: "DGI Uruguay (Régimen CFE)",
    docLabel: "RUT",
    defaultPrice: "1550.00",
    metaTitle: "Software para Lavanderías en Uruguay — Sistema de Facturación en la Nube | Klynn",
    metaDescription: "El software para lavanderías y tintorerías líder en Uruguay. Sistema de facturación en la nube en Pesos Uruguayos (UYU), tickets térmicos 58/80mm, DGI con RUT e IVA 22%, y WhatsApp automático.",
    metaKeywords: "software para lavanderias, sistema de facturacion para lavanderias, software de facturacion en la nube para lavanderias, software lavanderia uruguay montevideo punta del este dgi cfe rut",
    heroHeadline: "Sistema de Facturación para Lavanderías en Uruguay",
    heroHighlight: "y Software en la Nube en Pesos Uruguayos (UYU)",
    heroSubtitle: "Punto de venta y control operativo para lavanderías y tintorerías en Montevideo, Punta del Este y todo el Uruguay. Ropa por kilo, prendas de lana, tickets térmicos, WhatsApp automático y adaptación fiscal con IVA 22%.",
    regionsLabel: "Departamentos y Barrios",
    regions: [
      "Montevideo (Pocitos, Punta Carretas)", "Montevideo (Carrasco, Cordón, Centro)",
      "Maldonado & Punta del Este", "Canelones (Ciudad de la Costa)",
      "Colonia del Sacramento", "Salto", "Paysandú", "San José"
    ],
    ticketData: {
      businessName: "Lavandería Punta Carretas Express",
      docLabel: "RUT",
      docValue: "219991230015",
      phone: "+598 099 123 456",
      address: "Ellauri #350, Punta Carretas, Montevideo",
      orderNumber: "MVD-2026-0418",
      fiscalNumber: "CFE: e-Ticket 8192",
      dateStr: "28/09/2026 10:50 AM",
      clientName: "Matías De León (Pocitos)",
      items: [
        { name: "Lavado de Ropa por Kilo (4 kg)", detail: "Secado y doblado en paquete", price: 480.00 },
        { name: "Saco de Lana x1", detail: "Lavado en seco especial", price: 380.00 },
        { name: "Planchado Camisas x3", detail: "Planchado a vapor en percha", price: 360.00 }
      ]
    },
    challenges: [
      {
        title: "Cuidado de Prendas de Lana y Cobertores",
        description: "Control especializado para prendas de invierno, abrigos y edredones con etiquetas numeradas claras.",
        icon: Scale,
        badge: "Prendas Delicadas"
      },
      {
        title: "DGI Uruguay con RUT e IVA al 22%",
        description: "Emisión de comprobantes con RUT del cliente y cálculo de IVA al 22% para cumplimiento tributario.",
        icon: ShieldCheck,
        badge: "DGI & Tributos"
      },
      {
        title: "Avisos Rápidos por WhatsApp",
        description: "Notificación directa al móvil del cliente para un retiro ágil sin acumulación de prendas en mostrador.",
        icon: Clock,
        badge: "WhatsApp Ágil"
      }
    ],
    testimonial: {
      name: "Sebastián Varela",
      role: "Propietario",
      business: "Wash & Clean Pocitos",
      location: "Pocitos, Montevideo",
      text: "En Montevideo la practicidad lo es todo. Klynn nos permitió calcular el IVA al 22% sin errores, tener el arqueo de caja perfecto y avisar por WhatsApp tan pronto la ropa está doblada.",
      rating: 5
    },
    faqs: [
      {
        question: "¿El sistema opera en Pesos Uruguayos (UYU)?",
        answer: "Sí, todos los precios, balances y comprobantes operan en Pesos Uruguayos con cálculo de IVA al 22%."
      }
    ]
  },

  DO: {
    countryCode: "DO",
    countryName: "República Dominicana",
    countryFlag: "🇩🇴",
    slug: "software-lavanderia-republica-dominicana",
    currencySymbol: "RD$",
    currencyCode: "DOP",
    currencyDecimals: 2,
    taxName: "ITBIS",
    taxRate: 18,
    regulatoryBody: "DGII (e-CF Comprobantes Fiscales)",
    docLabel: "RNC",
    defaultPrice: "1300.00",
    metaTitle: "Software para Lavanderías en República Dominicana — Facturación DGII e-CF | Klynn",
    metaDescription: "El software para lavanderías y tintorerías #1 en República Dominicana. Facturación fiscal DGII con NCF y e-CF, tickets térmicos 58/80mm, WhatsApp automático y control de repartidores.",
    metaKeywords: "software para lavanderias, sistema de facturacion para lavanderias, software de facturacion en la nube para lavanderias, software lavanderia republica dominicana, pos lavanderia santo domingo santiago dgii ncf ecf",
    heroHeadline: "Sistema de Facturación para Lavanderías en República Dominicana",
    heroHighlight: "con Facturación Fiscal DGII e-CF",
    heroSubtitle: "El software POS líder en República Dominicana con soporte nativo de comprobantes fiscales DGII (NCF y e-CF). Cobra por libra o prenda, emite tickets térmicos 58/80mm, envía avisos por WhatsApp y controla repartidores en todo el país.",
    regionsLabel: "Provincias y Polos",
    regions: [
      "Distrito Nacional (Piantini, Naco, Bella Vista)", "Santo Domingo Este & Norte",
      "Santiago de los Caballeros", "Punta Cana & Bávaro (La Altagracia)",
      "La Romana", "San Cristóbal", "Puerto Plata", "San Francisco de Macorís"
    ],
    ticketData: {
      businessName: "Lavandería Piantini Express",
      docLabel: "RNC",
      docValue: "131-89234-5",
      phone: "+1 (809) 567-8900",
      address: "Av. Abraham Lincoln #452, Piantini, Santo Domingo",
      orderNumber: "SD-2026-0142",
      fiscalNumber: "NCF: B0200000123 (e-CF)",
      dateStr: "28/09/2026 10:30 AM",
      clientName: "Carlos Mejía (Naco)",
      items: [
        { name: "Lavado por Libra (6.0 lb)", detail: "Detergente premium + suavizante", price: 480.00 },
        { name: "Camisas Formales x4", detail: "Planchado a vapor en gancho", price: 600.00 },
        { name: "Traje 2 Piezas x1", detail: "Lavado en seco profesional", price: 450.00 }
      ]
    },
    challenges: [
      {
        title: "Comprobantes Fiscales DGII y e-CF",
        description: "Emite facturas de consumo (B02), crédito fiscal (B01) y facturación electrónica (e-CF) con control estricto de secuencias y vencimientos.",
        icon: ShieldCheck,
        badge: "DGII e-CF Listo"
      },
      {
        title: "Control de Repartidores en Motocicleta",
        description: "Asigna rutas de delivery para esquivar el tráfico urbano con cobro contra entrega y firma digital del cliente.",
        icon: Truck,
        badge: "Logística Urbana"
      },
      {
        title: "Avisos Automáticos por WhatsApp",
        description: "Tus clientes reciben el ticket y la alerta de ropa lista directo en su chat sin llamadas manuales en mostrador.",
        icon: Clock,
        badge: "-90% Llamadas"
      }
    ],
    testimonial: {
      name: "Eduardo Santana",
      role: "Propietario",
      business: "Clean & Press Piantini",
      location: "Santo Domingo, D.N.",
      text: "Con Klynn pasamos de 3 minutos a 20 segundos por orden en mostrador. La integración de los NCF de la DGII y los avisos de WhatsApp redujeron las llamadas de clientes en un 80%.",
      rating: 5
    },
    faqs: [
      {
        question: "¿Cumple Klynn con los requisitos de la DGII para NCF y e-CF?",
        answer: "Sí, 100%. Podrás emitir comprobantes de Crédito Fiscal (B01), Consumo (B02), y Comprobantes Fiscales Electrónicos (e-CF) con cálculo automático de ITBIS al 18%."
      },
      {
        question: "¿Qué impresoras térmicas son compatibles en República Dominicana?",
        answer: "Cualquier impresora térmica estándar de 57mm u 80mm conectada por USB, Bluetooth o Red (Epson, Xprinter, Netum, Rongta, etc.)."
      }
    ]
  }
};
