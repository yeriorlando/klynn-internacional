import { createFileRoute } from "@tanstack/react-router";
import { CountryLanding } from "@/components/klynn/CountryLanding";
import { Layers, ShieldCheck, Truck, Scale, Receipt, Clock, Sparkles } from "lucide-react";

export const Route = createFileRoute("/software-lavanderia-mexico")({
  head: () => ({
    meta: [
      { 
        title: "Software para Lavanderías en México — Sistema de Facturación en la Nube y POS | Klynn" 
      },
      { 
        name: "description", 
        content: "El sistema de facturación para lavanderías, tintorerías y planchadurías #1 en México. Software de facturación en la nube, control de ropa por kilo, tickets térmicos 58/80mm, SAT CFDI 4.0 con RFC y WhatsApp automático." 
      },
      {
        name: "keywords",
        content: "software para lavanderias, sistema de facturacion para lavanderias, software de facturacion en la nube para lavanderias, software para lavanderias en mexico, punto de venta lavanderia mexico, software tintorerias y planchadurias sat cfdi, programa para lavanderias cdmx guadalajara monterrey, software cobro por kilo lavanderia"
      },
      { property: "og:title", content: "Software para Lavanderías en México — Sistema de Facturación en la Nube | Klynn" },
      { property: "og:description", content: "Control total de tu lavandería o tintorería en México: ropa por kilo, tickets térmicos 58/80mm, WhatsApp automático, IVA 16% y SAT CFDI 4.0." },
      { property: "og:locale", content: "es_MX" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://klynncloud.com/software-lavanderia-mexico" },
    ],
    links: [
      { rel: "canonical", href: "https://klynncloud.com/software-lavanderia-mexico" },
      { rel: "alternate", hrefLang: "es-MX", href: "https://klynncloud.com/software-lavanderia-mexico" },
      { rel: "alternate", hrefLang: "es-PE", href: "https://klynncloud.com/software-lavanderia-peru" },
      { rel: "alternate", hrefLang: "es-CO", href: "https://klynncloud.com/software-lavanderia-colombia" },
      { rel: "alternate", hrefLang: "es", href: "https://klynncloud.com" },
      { rel: "alternate", hrefLang: "x-default", href: "https://klynncloud.com" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Klynn Cloud México — Sistema de Facturación para Lavanderías",
          "operatingSystem": "Web, Windows, macOS, Android, iOS",
          "applicationCategory": "BusinessApplication",
          "description": "Software de facturación en la nube, punto de venta POS y control de órdenes para lavanderías, tintorerías y planchadurías en México.",
          "offers": {
            "@type": "Offer",
            "price": "350.00",
            "priceCurrency": "MXN",
            "priceValidUntil": "2026-12-31"
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "ratingCount": "148"
          }
        })
      }
    ]
  }),
  component: MexicoLandingRoute,
});

function MexicoLandingRoute() {
  return (
    <CountryLanding
      countryCode="MX"
      countryName="México"
      countryFlag="🇲🇽"
      currencySymbol="$"
      currencyCode="MXN"
      currencyDecimals={2}
      taxName="IVA"
      taxRate={16}
      regulatoryBody="SAT (CFDI 4.0)"
      docLabel="RFC"
      heroHeadline="Sistema de Facturación para Lavanderías en México"
      heroHighlight="y Software en la Nube #1"
      heroSubtitle="El punto de venta POS y sistema de facturación en la nube diseñado exclusivamente para lavanderías, tintorerías y planchadurías en México. Controla ropa por kilo, emite tickets térmicos 58/80mm, envía avisos automáticos por WhatsApp y cumple con el SAT sin complicaciones."
      regionsLabel="Ciudades y Estados"
      regions={[
        "CDMX",
        "Guadalajara (Jalisco)",
        "Monterrey (Nuevo León)",
        "Puebla",
        "Querétaro",
        "Cancún (Quintana Roo)",
        "Tijuana (Baja California)",
        "Mérida (Yucatán)",
        "León (Guanajuato)",
        "Toluca (Edomex)",
        "San Luis Potosí",
        "Aguascalientes"
      ]}
      ticketData={{
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
      }}
      challenges={[
        {
          title: "Cobro Ágil por Kilo y Piezas",
          description: "Pesaje rápido en báscula con cálculo automático por kilo, o tarifas fijas por prenda (edredones, trajes, chamarras). Registra en 15 segundos y reduce las filas en mostrador.",
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
          description: "Asigna número de casillero o gancho a cada lote de ropa. Localiza cualquier edredón o prenda en 3 segundos y evita reclamos de clientes en horas de alto tráfico.",
          icon: Layers,
          badge: "Cero Prendas Perdidas"
        }
      ]}
      testimonial={{
        name: "Lic. Mauricio Valenzuela",
        role: "Propietario",
        business: "CleanMaster Tintorerías",
        location: "Col. Del Valle, Ciudad de México",
        text: "En México las tintorerías sufríamos con los papelitos que se mojaban en mostrador y los clientes que llamaban cada hora a preguntar si ya estaba su ropa. Con Klynn el sistema manda el WhatsApp en cuanto la marcamos como lista, y el arqueo de caja con Clip y transferencias SPEI cuadra al centavo.",
        rating: 5
      }}
      faqs={[
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
          answer: "Puedes mezclar ambos en el mismo ticket térmico: ingresas el peso exacto en kilos (ej: 4.5 kg) y agregas prendas fijas como edredones, trajes o planchado de camisas con precios predeterminados o promociones de tu sucursal."
        },
        {
          question: "¿Puedo administrar varias sucursales en CDMX, Guadalajara o Monterrey desde una misma cuenta?",
          answer: "Sí, Klynn cuenta con soporte multi-sucursal nativo. Puedes ver las ventas, clientes, ingresos y estantería de cada sucursal de manera independiente o consolidada en tiempo real desde tu celular o computadora."
        },
        {
          question: "¿Cómo inicio la prueba gratis de 14 días?",
          answer: "Haz clic en 'Comenzar prueba gratis', ingresa el nombre de tu lavandería en México y tu teléfono con WhatsApp. No pedimos tarjeta de crédito y podrás facturar y registrar órdenes en menos de 2 minutos."
        }
      ]}
    />
  );
}
