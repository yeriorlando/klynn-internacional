import { createFileRoute } from "@tanstack/react-router";
import { CountryLanding } from "@/components/klynn/CountryLanding";
import { Layers, ShieldCheck, Scale, Receipt, Smartphone } from "lucide-react";

export const Route = createFileRoute("/software-lavanderia-peru")({
  head: () => ({
    meta: [
      { 
        title: "Software para Lavanderías en Perú — Sistema de Facturación en la Nube y POS | Klynn" 
      },
      { 
        name: "description", 
        content: "El sistema de facturación para lavanderías y tintorerías líder en Perú. Software de facturación en la nube, control de lavado al peso por kilo, tickets térmicos 58/80mm, SUNAT con RUC e IGV 18%, y WhatsApp automático." 
      },
      {
        name: "keywords",
        content: "software para lavanderias, sistema de facturacion para lavanderias, software de facturacion en la nube para lavanderias, software para lavanderias en peru, sistema de lavanderia lima arequipa trujillo, software tintorerias sunat ruc igv, programa de lavanderia al peso por kilo"
      },
      { property: "og:title", content: "Software para Lavanderías en Perú — Sistema de Facturación en la Nube | Klynn" },
      { property: "og:description", content: "Punto de venta y facturación para lavanderías en Perú: lavado al peso, tickets térmicos, WhatsApp, IGV 18% y control de caja en Soles." },
      { property: "og:locale", content: "es_PE" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://klynncloud.com/software-lavanderia-peru" },
    ],
    links: [
      { rel: "canonical", href: "https://klynncloud.com/software-lavanderia-peru" },
      { rel: "alternate", hrefLang: "es-PE", href: "https://klynncloud.com/software-lavanderia-peru" },
      { rel: "alternate", hrefLang: "es-MX", href: "https://klynncloud.com/software-lavanderia-mexico" },
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
          "name": "Klynn Cloud Perú — Sistema de Facturación para Lavanderías",
          "operatingSystem": "Web, Windows, macOS, Android, iOS",
          "applicationCategory": "BusinessApplication",
          "description": "Software de facturación en la nube y punto de venta para lavanderías y tintorerías en Perú.",
          "offers": {
            "@type": "Offer",
            "price": "69.00",
            "priceCurrency": "PEN",
            "priceValidUntil": "2026-12-31"
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "ratingCount": "92"
          }
        })
      }
    ]
  }),
  component: PeruLandingRoute,
});

function PeruLandingRoute() {
  return (
    <CountryLanding
      countryCode="PE"
      countryName="Perú"
      countryFlag="🇵🇪"
      currencySymbol="S/."
      currencyCode="PEN"
      currencyDecimals={2}
      taxName="IGV"
      taxRate={18}
      regulatoryBody="SUNAT (Comprobante Electrónico)"
      docLabel="RUC"
      heroHeadline="Sistema de Facturación para Lavanderías en Perú"
      heroHighlight="y Software en la Nube"
      heroSubtitle="El punto de venta POS y sistema de facturación en la nube que moderniza las lavanderías y tintorerías en Lima y provincias. Cobra al peso por kilo o por prenda, emite tickets térmicos, notifica por WhatsApp y mantén tu caja cuadrada con Yape, Plin y efectivo."
      regionsLabel="Departamentos y Distritos"
      regions={[
        "Lima (Miraflores, San Isidro, Surco)",
        "Lima (San Borja, Jesús María, Los Olivos)",
        "Arequipa",
        "Trujillo (La Libertad)",
        "Chiclayo (Lambayeque)",
        "Cusco",
        "Piura",
        "Huancayo (Junín)",
        "Tacna",
        "Ica",
        "Callao",
        "Cajamarca"
      ]}
      ticketData={{
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
      }}
      challenges={[
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
      ]}
      testimonial={{
        name: "Gonzalo Alarcón",
        role: "Administrador",
        business: "Lavanderías Lima Sur",
        location: "Miraflores, Lima",
        text: "En Lima la gente no quiere hacer colas en el mostrador. Con Klynn pesamos la ropa, imprimimos el ticket térmico con código QR y en 20 segundos el cliente ya se fue contento con su comprobante. Los avisos por WhatsApp han hecho que la gente retire su ropa a tiempo.",
        rating: 5
      }}
      faqs={[
        {
          question: "¿Qué impresoras térmicas son compatibles en Perú?",
          answer: "Klynn funciona directamente con cualquier impresora térmica de 58mm u 80mm conectada por USB, Bluetooth o Red (Epson TM-T20, Xprinter, Bixolon, 3nStar, etc.) sin necesidad de programas intermediarios."
        },
        {
          question: "¿Cómo apoya Klynn con la emisión de comprobantes y SUNAT en Perú?",
          answer: "Puedes emitir tickets y notas de venta con el RUC de tu negocio o RUC de tu cliente con cálculo exacto de IGV 18%, generando la data necesaria para tu sistema contable o PSE SUNAT."
        },
        {
          question: "¿El sistema permite cobrar con Yape y Plin?",
          answer: "Sí, la caja permite categorizar pagos por Yape, Plin, Efectivo, Tarjeta de Débito/Crédito y Transferencias bancarias BCP/BBVA/Interbank, para que tu cierre de caja diario sea 100% exacto."
        },
        {
          question: "¿Puedo probar Klynn gratis antes de pagar?",
          answer: "Claro que sí. Ofrecemos 14 días de prueba completa sin pedir tarjeta de crédito. Te registras en 1 minuto y puedes comenzar a emitir órdenes inmediatamente en Soles (PEN)."
        }
      ]}
    />
  );
}
