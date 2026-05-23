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
        description: "Hemos diseñado Klynn para que sea el motor de tu negocio. Vamos a dar un paseo rápido por tus herramientas.",
        side: "center",
        align: "start"
      }
    },
    {
      element: "#tour-nav-conversations",
      popover: {
        title: "💬 Conversaciones WhatsApp",
        description: "Mantén contacto directo con tus clientes. Chatea y envía notificaciones automáticas desde un solo canal central.",
        side: "right"
      }
    },
    {
      element: "#tour-nav-dashboard",
      popover: {
        title: "📊 Panel de Control",
        description: "Tu resumen diario. Aquí verás cómo van tus ventas y qué órdenes necesitan atención inmediata.",
        side: "right"
      }
    },
    {
      element: "#tour-nav-nueva-orden",
      popover: {
        title: "📝 Registrar Servicio",
        description: "Cuando un cliente llegue, usa este botón para crear su orden en segundos.",
        side: "right"
      }
    },
    {
      element: "#tour-nav-ordenes",
      popover: {
        title: "📋 Listado de Órdenes",
        description: "Busca, filtra y actualiza el estado de cada prenda. Aquí controlas todo el flujo de trabajo.",
        side: "right"
      }
    },
    {
      element: "#tour-nav-caja",
      popover: {
        title: "💰 Gestión de Efectivo",
        description: "Abre turnos y controla cada peso que entra o sale de tu gaveta.",
        side: "right"
      }
    },
    {
      element: "#tour-nav-clientes",
      popover: {
        title: "👥 Tu Base de Datos",
        description: "Gestiona a tus clientes frecuentes, mira su historial y fidelízalos.",
        side: "right"
      }
    },
    {
      element: "#tour-nav-catalogo",
      popover: {
        title: "🏷️ Servicios y Precios",
        description: "Configura qué lavas, qué planchas y cuánto cobras por cada prenda.",
        side: "right"
      }
    },
    {
      element: "#tour-nav-personal",
      popover: {
        title: "👔 Equipo de Trabajo",
        description: "Administra a tus empleados y sus permisos dentro del sistema.",
        side: "right"
      }
    },
    {
      element: "#tour-nav-logistica",
      popover: {
        title: "🚚 Delivery y Rutas",
        description: "Organiza tus repartidores y asegúrate de que la ropa llegue a tiempo a casa del cliente.",
        side: "right"
      }
    },
    {
      element: "#tour-nav-gastos",
      popover: {
        title: "📉 Gastos del Local",
        description: "Registra compras de insumos, luz o alquiler para saber tu beneficio real.",
        side: "right"
      }
    },
    {
      element: "#tour-nav-reportes",
      popover: {
        title: "📈 Inteligencia de Negocio",
        description: "Gráficas detalladas sobre el crecimiento de tu lavandería mes a mes.",
        side: "right"
      }
    },
    {
      element: "#tour-nav-configuracion",
      popover: {
        title: "⚙️ Configuración General",
        description: "Personaliza el perfil de tu lavandería, configura tus métodos de facturación y activa las notificaciones automáticas por WhatsApp.",
        side: "right"
      }
    }
  ]
};

