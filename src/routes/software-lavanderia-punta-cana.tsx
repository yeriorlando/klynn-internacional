import { createFileRoute } from "@tanstack/react-router";
import { CityLanding } from "@/components/klynn/CityLanding";
import { Truck, Receipt, Clock } from "lucide-react";

export const Route = createFileRoute("/software-lavanderia-punta-cana")({
  head: () => ({
    meta: [
      { title: "Software para Lavanderías en Punta Cana y Bávaro — Klynn RD" },
      { 
        name: "description", 
        content: "El software líder para lavanderías en Punta Cana, Bávaro y Cap Cana. Control de órdenes express, delivery, tickets térmicos y facturación NCF. ¡Pruébalo gratis!" 
      },
      {
        name: "keywords",
        content: "software lavanderia punta cana, sistema pos lavanderia bavaro, gestion lavanderia cap cana, lavanderias zona este rd"
      }
    ],
  }),
  component: () => (
    <CityLanding 
      city="Punta Cana"
      fullName="Punta Cana y Bávaro"
      slug="punta-cana"
      sectors={[
        "Bávaro", 
        "Cap Cana", 
        "Punta Cana Village", 
        "Verón", 
        "Los Corales", 
        "El Cortecito", 
        "Cocotal", 
        "Friusa", 
        "Cabeza de Toro", 
        "Uvero Alto", 
        "Macao"
      ]}
      description="Control de órdenes express, tickets térmicos, cobros con NCF y rutas de choferes para el corredor turístico de Bávaro, Verón y Cap Cana."
      ticketData={{
        businessName: "Bávaro Laundry & Dry Clean",
        rnc: "131-77341-9",
        phone: "809-552-3000",
        address: "Av. Estados Unidos, Plaza Bávaro, Punta Cana",
        orderNumber: "PC-202605-0215",
        ncf: "B0200000789",
        dateStr: "02/05/2026 12:45 PM",
        clientName: "Michael Anderson (Cap Cana)",
        items: [
          { name: "Servicio Express Resort 8.0lb", detail: "8.0 lbs @ RD$110", price: "RD$ 880.00" },
          { name: "Camisas lino x3", detail: "Planchado especial", price: "RD$ 540.00" },
          { name: "Vestido de fiesta x1", detail: "Lavado en seco", price: "RD$ 500.00" }
        ],
        subtotal: "RD$ 1,920.00",
        itbis: "RD$ 345.60",
        total: "RD$ 2,265.60"
      }}
      challenges={[
        {
          title: "Atención a Villas y Turistas",
          description: "Recepción ágil de pedidos express con avisos automatizados por WhatsApp y tickets térmicos para huéspedes y residentes de Cap Cana y Punta Cana Village.",
          icon: Clock,
          badge: "Turismo & Villas"
        },
        {
          title: "Cobros en Tarjeta y Moneda Mixta",
          description: "Registro transparente de pagos con datáfono / POS, transferencias bancarias y efectivo sin diferencias al cierre de caja.",
          icon: Receipt,
          badge: "Cobros Flexibles"
        },
        {
          title: "Logística en el Corredor del Este",
          description: "Asignación de choferes para entregas y recogidas coordinadas entre Bávaro, Verón, Friusa y Cap Cana sin extraviar prendas.",
          icon: Truck,
          badge: "Rutas del Este"
        }
      ]}
      testimonial={{
        name: "Jean Carlos Batista",
        role: "Gerente General",
        business: "Resort Clean Bávaro",
        location: "Punta Cana, La Altagracia",
        text: "En Punta Cana trabajamos con un ritmo acelerado entre villas y clientes turísticos. Klynn nos dio la velocidad para recibir ropa en segundos y el control de repartidores para cubrir desde Bávaro hasta Cap Cana con precisión.",
        rating: 5
      }}
    />
  ),
});
