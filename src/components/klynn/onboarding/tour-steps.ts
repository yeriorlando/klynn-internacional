import { DriveStep } from "driver.js";

export interface PageTour {
  id: string;
  steps: DriveStep[];
}

export const SIDEBAR_TOUR: PageTour = {
  id: "sidebar-tour",
  steps: [
    {
      popover: {
        title: "✨ Bienvenido a tu Lavandería Digital",
        description: "Hemos diseñado Klynn para que sea el motor de tu negocio. Vamos a dar un paseo rápido por tus herramientas disponibles.",
        side: "center",
        align: "start"
      }
    },
    {
      element: "#tour-nav-nueva-orden",
      popover: {
        title: "📝 Punto de Venta (Nueva Orden)",
        description: "Cuando un cliente llegue, usa este botón para crear su orden en segundos, desglosar prendas y emitir su ticket.",
        side: "right"
      }
    },
    {
      element: "#tour-nav-dashboard",
      popover: {
        title: "📊 Panel de Control",
        description: "Tu resumen diario en tiempo real. Aquí verás tus ventas del día, metas y las órdenes que necesitan atención inmediata.",
        side: "right"
      }
    },
    {
      element: "#tour-nav-conversations",
      popover: {
        title: "💬 Conversaciones WhatsApp",
        description: "Mantén contacto directo con tus clientes. Chatea y envía notificaciones automáticas cuando sus prendas estén listas.",
        side: "right"
      }
    },
    {
      element: "#tour-nav-ordenes",
      popover: {
        title: "📋 Listado de Órdenes",
        description: "Busca, filtra, reimprime tickets y actualiza el estado de cada prenda. Aquí controlas todo el flujo de trabajo.",
        side: "right"
      }
    },
    {
      element: "#tour-nav-procesos",
      popover: {
        title: "⚙️ Control de Operaciones",
        description: "Gestiona las etapas de producción de tu taller: Lavado, Secado, Planchado y Control de Calidad.",
        side: "right"
      }
    },
    {
      element: "#tour-nav-estanteria",
      popover: {
        title: "🧺 Estantería Virtual",
        description: "Ubica fácilmente en qué rack, percha o estante se encuentra cada pedido para una entrega rápida sin confusiones.",
        side: "right"
      }
    },
    {
      element: "#tour-nav-caja",
      popover: {
        title: "💰 Gestión de Efectivo",
        description: "Abre turnos de cobro, registra entradas o salidas y realiza cuadres de gaveta con total precisión.",
        side: "right"
      }
    },
    {
      element: "#tour-nav-gastos",
      popover: {
        title: "📉 Gastos del Local",
        description: "Registra compras de insumos, detergentes, luz o alquiler para conocer tu rentabilidad real mes a mes.",
        side: "right"
      }
    },
    {
      element: "#tour-nav-logistica",
      popover: {
        title: "🚚 Delivery y Rutas",
        description: "Organiza tus repartidores, programa recogidas a domicilio y confirma entregas a tiempo en la puerta del cliente.",
        side: "right"
      }
    },
    {
      element: "#tour-nav-catalogo-prendas",
      popover: {
        title: "🏷️ Catálogo de Prendas",
        description: "Configura tu tarifario de ropa, precios por unidad o por libra, y tiempos de entrega estimados.",
        side: "right"
      }
    },
    {
      element: "#tour-nav-catalogo-servicios",
      popover: {
        title: "🧼 Servicios de Lavandería",
        description: "Define tus líneas de servicio: Lavado en Seco, Planchado, Lavado por Libra, Tintorería y más.",
        side: "right"
      }
    },
    {
      element: "#tour-nav-clientes",
      popover: {
        title: "👥 Base de Datos de Clientes",
        description: "Gestiona a tus clientes frecuentes, consulta su historial de visitas, saldos pendientes y fidelízalos.",
        side: "right"
      }
    },
    {
      element: "#tour-nav-personal",
      popover: {
        title: "👔 Equipo de Trabajo",
        description: "Administra a tus empleados, crea cajeros y operarios, y define sus permisos de acceso dentro del sistema.",
        side: "right"
      }
    },
    {
      element: "#tour-nav-reportes",
      popover: {
        title: "📈 Inteligencia de Negocio",
        description: "Gráficas interactivas y reportes detallados sobre el crecimiento financiero y operativo de tu lavandería.",
        side: "right"
      }
    },
    {
      element: "#tour-nav-fiscal",
      popover: {
        title: "🛡️ Centro Fiscal e-CF",
        description: "Emite comprobantes fiscales electrónicos homologados ante la DGII (B01, B02, B14) de forma directa y segura.",
        side: "right"
      }
    },
    {
      element: "#tour-nav-configuracion",
      popover: {
        title: "⚙️ Configuración General",
        description: "Personaliza el perfil de tu lavandería, logotipo, formato de tickets térmicos, sucursales y notificaciones.",
        side: "right"
      }
    }
  ]
};
