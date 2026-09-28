import { createFileRoute } from "@tanstack/react-router";
import { CountryLanding } from "@/components/klynn/CountryLanding";
import { Layers, ShieldCheck, Scale, Receipt, Smartphone } from "lucide-react";

export const Route = createFileRoute("/software-lavanderia-colombia")({
  head: () => ({
    meta: [
      { 
        title: "Software para Lavanderías en Colombia — Sistema de Facturación en la Nube y POS | Klynn" 
      },
      { 
        name: "description", 
        content: "El sistema de facturación para lavanderías y tintorerías #1 en Colombia. Software de facturación en la nube, control de ropa por kilo, tickets térmicos 58/80mm, DIAN con NIT e IVA 19%, y WhatsApp automático." 
      },
      {
        name: "keywords",
        content: "software para lavanderias, sistema de facturacion para lavanderias, software de facturacion en la nube para lavanderias, software para lavanderias en colombia, pos lavanderia bogota medellin cali, software tintorerias dian nit iva, programa lavanderia cobro por kilo nequi daviplata"
      },
      { property: "og:title", content: "Software para Lavanderías en Colombia — Sistema de Facturación en la Nube | Klynn" },
      { property: "og:description", content: "Punto de venta y facturación para lavanderías en Colombia: ropa por kilo, tickets térmicos, WhatsApp, IVA 19% y control de caja en pesos colombianos." },
      { property: "og:locale", content: "es_CO" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://klynncloud.com/software-lavanderia-colombia" },
    ],
    links: [
      { rel: "canonical", href: "https://klynncloud.com/software-lavanderia-colombia" },
      { rel: "alternate", hrefLang: "es-CO", href: "https://klynncloud.com/software-lavanderia-colombia" },
      { rel: "alternate", hrefLang: "es-MX", href: "https://klynncloud.com/software-lavanderia-mexico" },
      { rel: "alternate", hrefLang: "es-PE", href: "https://klynncloud.com/software-lavanderia-peru" },
      { rel: "alternate", hrefLang: "es", href: "https://klynncloud.com" },
      { rel: "alternate", hrefLang: "x-default", href: "https://klynncloud.com" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Klynn Cloud Colombia — Sistema de Facturación para Lavanderías",
          "operatingSystem": "Web, Windows, macOS, Android, iOS",
          "applicationCategory": "BusinessApplication",
          "description": "Software de facturación en la nube y punto de venta para lavanderías y tintorerías en Colombia.",
          "offers": {
            "@type": "Offer",
            "price": "69000",
            "priceCurrency": "COP",
            "priceValidUntil": "2026-12-31"
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "ratingCount": "108"
          }
        })
      }
    ]
  }),
  component: ColombiaLandingRoute,
});

function ColombiaLandingRoute() {
  return (
    <CountryLanding
      countryCode="CO"
      countryName="Colombia"
      countryFlag="🇨🇴"
      currencySymbol="$"
      currencyCode="COP"
      currencyDecimals={0}
      taxName="IVA"
      taxRate={19}
      regulatoryBody="DIAN (Documento Equivalente POS)"
      docLabel="NIT"
      heroHeadline="Sistema de Facturación para Lavanderías en Colombia"
      heroHighlight="y Software en la Nube Líder"
      heroSubtitle="El punto de venta POS y sistema de facturación en la nube diseñado para lavanderías, tintorerías y servicios de planchado en Colombia. Controla ropa por kilo en báscula, emite tickets térmicos 58/80mm, envía avisos por WhatsApp y concilia tus pagos con Nequi, Daviplata y Bancolombia."
      regionsLabel="Departamentos y Ciudades"
      regions={[
        "Bogotá D.C. (Chapinero, Usaquén, Suba)",
        "Medellín (El Poblado, Laureles, Envigado)",
        "Cali (Valle del Cauca)",
        "Barranquilla (Atlántico)",
        "Bucaramanga (Santander)",
        "Cartagena (Bolívar)",
        "Pereira (Risaralda)",
        "Manizales (Caldas)",
        "Cúcuta (Norte de Santander)",
        "Ibagué (Tolima)",
        "Santa Marta (Magdalena)",
        "Villavicencio (Meta)"
      ]}
      ticketData={{
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
      }}
      challenges={[
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
      ]}
      testimonial={{
        name: "Andrés Restrepo",
        role: "Gerente Operativo",
        business: "Tintorerías El Poblado",
        location: "Medellín, Antioquia",
        text: "Antes usábamos libretas de papel que se manchaban con agua y se nos perdían edredones en los percheros. Con Klynn asignamos casillero a cada orden, el cliente recibe su WhatsApp automático cuando terminamos y el cuadre de Nequi y Daviplata sale perfecto todos los días.",
        rating: 5
      }}
      faqs={[
        {
          question: "¿Klynn es compatible con impresoras térmicas en Colombia?",
          answer: "Sí, es compatible con cualquier impresora térmica de 58mm u 80mm por USB, Bluetooth o Red (Epson TM-T20, SAT, Xprinter, Bematech, Digital POS, etc.) sin requerir controladores especiales."
        },
        {
          question: "¿Cómo apoya Klynn en la normativa DIAN y documento equivalente POS?",
          answer: "Klynn emite tickets térmicos con numeración consecutiva, datos fiscales del emisor, NIT del cliente y desglose detallado de IVA (19%), listos para exportar en Excel a tu asesor contable."
        },
        {
          question: "¿Puedo controlar varias lavanderías en Bogotá, Medellín o Cali?",
          answer: "Totalmente. Klynn es un software de facturación en la nube multi-sucursal que te permite visualizar las ventas, inventario y repartidores de todas tus sedes en tiempo real desde cualquier dispositivo."
        },
        {
          question: "¿Cómo funciona la prueba gratuita de 14 días?",
          answer: "Solo debes hacer clic en 'Comenzar prueba gratis', registrar los datos de tu lavandería en Colombia y podrás facturar y usar todos los módulos sin ingresar tarjeta de crédito."
        }
      ]}
    />
  );
}
