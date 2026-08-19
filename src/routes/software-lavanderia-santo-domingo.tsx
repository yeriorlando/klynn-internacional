import { createFileRoute } from "@tanstack/react-router";
import { CityLanding } from "@/components/klynn/CityLanding";
import { Truck, Clock, Layers } from "lucide-react";

export const Route = createFileRoute("/software-lavanderia-santo-domingo")({
  head: () => ({
    meta: [
      { title: "Software para Lavanderías en Santo Domingo — Klynn RD" },
      { 
        name: "description", 
        content: "El sistema POS líder para lavanderías en Santo Domingo y el Distrito Nacional. Facturación NCF, tickets térmicos, control de caja y repartidores en Naco, Piantini y Bella Vista." 
      },
      {
        name: "keywords",
        content: "software lavanderia santo domingo, sistema pos lavanderia distrito nacional, gestion lavanderia naco piantini, lavanderias dominicanas"
      }
    ],
  }),
  component: () => (
    <CityLanding 
      city="Santo Domingo"
      fullName="Santo Domingo y Distrito Nacional"
      slug="santo-domingo"
      sectors={[
        "Piantini", 
        "Naco", 
        "Bella Vista", 
        "Arroyo Hondo", 
        "Gazcue", 
        "Evaristo Morales", 
        "Los Cacicazgos", 
        "Mirador Sur", 
        "Ensanche Quisqueya", 
        "El Millón", 
        "Santo Domingo Este", 
        "Herrera"
      ]}
      description="Cobra con ITBIS y NCF, imprime tickets térmicos 57/80mm y controla repartidores en el Polígono Central y todo el Gran Santo Domingo."
      ticketData={{
        businessName: "Lavandería Piantini Express",
        rnc: "131-89234-5",
        phone: "809-567-8900",
        address: "Av. Abraham Lincoln #452, Piantini, D.N.",
        orderNumber: "SD-202605-0142",
        ncf: "B0200000123",
        dateStr: "02/05/2026 10:30 AM",
        clientName: "Carlos Mejía (Naco)",
        items: [
          { name: "Traje 2 piezas x1", detail: "Lavado en seco", price: "RD$ 450.00" },
          { name: "Camisas formales x4", detail: "Planchado vapor", price: "RD$ 600.00" },
          { name: "Lavado/lb 6.0lb", detail: "6.0 lbs @ RD$80", price: "RD$ 480.00" }
        ],
        subtotal: "RD$ 1,530.00",
        itbis: "RD$ 275.40",
        total: "RD$ 1,805.40"
      }}
      challenges={[
        {
          title: "Entregas en el Polígono Central",
          description: "Rutas de delivery en motocicleta optimizadas para sortear el tráfico de la Churchill, Lincoln, 27 de Febrero y Kennedy sin perder prendas.",
          icon: Truck,
          badge: "Logística Capital"
        },
        {
          title: "Recepción Ágil en Horas Pico",
          description: "Registra órdenes en 15 segundos con tickets térmicos para atender ejecutivos y familias antes y después de su jornada laboral.",
          icon: Clock,
          badge: "Cero Filas"
        },
        {
          title: "Sincronización Multi-Sucursal",
          description: "Conecta tus sucursales de Piantini, Bella Vista, Naco y Santo Domingo Este en una sola pantalla con arqueos de caja transparentes.",
          icon: Layers,
          badge: "Control Central"
        }
      ]}
      testimonial={{
        name: "Eduardo Santana",
        role: "Propietario",
        business: "Clean & Press Piantini",
        location: "Santo Domingo, D.N.",
        text: "En Santo Domingo el cliente es exigente y no quiere esperar en fila. Con Klynn pasamos de 3 minutos a 20 segundos por orden en mostrador, y los avisos de WhatsApp redujeron las llamadas en un 80%.",
        rating: 5
      }}
    />
  ),
});
