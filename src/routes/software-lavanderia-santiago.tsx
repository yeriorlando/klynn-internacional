import { createFileRoute } from "@tanstack/react-router";
import { CityLanding } from "@/components/klynn/CityLanding";
import { Truck, Receipt, Clock } from "lucide-react";

export const Route = createFileRoute("/software-lavanderia-santiago")({
  head: () => ({
    meta: [
      { title: "Software para Lavanderías en Santiago — Klynn RD" },
      { 
        name: "description", 
        content: "El software #1 para lavanderías en Santiago de los Caballeros. Gestiona tu negocio en Los Jardines, Gurabo, Villa Olga y el Cibao con NCF, ITBIS y WhatsApp." 
      },
      {
        name: "keywords",
        content: "software lavanderia santiago, sistema pos lavanderia santiago, lavanderias santiago de los caballeros, gestion lavanderia cibao rd"
      }
    ],
  }),
  component: () => (
    <CityLanding 
      city="Santiago"
      fullName="Santiago de los Caballeros"
      slug="santiago"
      sectors={[
        "Los Jardines", 
        "Gurabo", 
        "Villa Olga", 
        "Cerros de Gurabo", 
        "El Embrujo", 
        "La Trinitaria", 
        "Canabacoa", 
        "Pontezuela", 
        "Hato Mayor", 
        "Cienfuegos", 
        "Licey", 
        "Tamboril"
      ]}
      description="Optimiza tu lavandería en la Ciudad Corazón. Control de peso por libra, cobros con NCF, tickets térmicos y repartidores en todo el Cibao."
      ticketData={{
        businessName: "Lavandería Monumental Santiago",
        rnc: "131-45678-2",
        phone: "809-582-4100",
        address: "Av. Juan Pablo Duarte #120, Los Jardines, Santiago",
        orderNumber: "STI-202605-0089",
        ncf: "B0200000456",
        dateStr: "02/05/2026 11:15 AM",
        clientName: "Dra. Altagracia Peña (Gurabo)",
        items: [
          { name: "Lavado y Doblado 12.5lb", detail: "12.5 lbs @ RD$70", price: "RD$ 875.00" },
          { name: "Pantalones vestir x3", detail: "Planchado express", price: "RD$ 450.00" },
          { name: "Edredón King x1", detail: "Lavado especial", price: "RD$ 650.00" }
        ],
        subtotal: "RD$ 1,975.00",
        itbis: "RD$ 355.50",
        total: "RD$ 2,330.50"
      }}
      challenges={[
        {
          title: "Alto Volumen de Lavado por Libra",
          description: "Cálculo instantáneo por peso y balanza para atender familias y clientes residenciales en Los Jardines, Gurabo y Villa Olga.",
          icon: Clock,
          badge: "Volumen Cibao"
        },
        {
          title: "Facturación a Empresas y Clínicas",
          description: "Emisión formal de comprobantes fiscales B01 con RNC para contratos de uniformes, médicos y mantelería comercial en Santiago.",
          icon: Receipt,
          badge: "Corporativo"
        },
        {
          title: "Rutas de Delivery Residencial",
          description: "Coordina repartidores con entregas programadas en Cerros de Gurabo, Canabacoa y La Trinitaria con cobro contra entrega.",
          icon: Truck,
          badge: "Entregas Santiago"
        }
      ]}
      testimonial={{
        name: "Lic. Manuel Rodríguez",
        role: "Director Operativo",
        business: "Lavandería La Cibaeña",
        location: "Santiago de los Caballeros",
        text: "En Santiago la confianza y la puntualidad lo son todo. Klynn nos permitió profesionalizar el cobro, emitir NCF a empresas y entregar la ropa siempre a tiempo sin perder un solo ticket.",
        rating: 5
      }}
    />
  ),
});
