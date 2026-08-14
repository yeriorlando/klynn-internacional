import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { type Orden, type Cliente, formatRD } from "@/lib/storage";
import { MapPin, Navigation, Compass, Phone, Truck, CheckCircle2, AlertTriangle, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface LogisticsMapProps {
  ordenes: Orden[];
  clientes: Cliente[];
  onSelectOrder?: (orderId: string) => void;
  onUpdateStatus?: (id: string, s: any) => void;
}

export function LogisticsMap({
  ordenes,
  clientes,
  onSelectOrder,
  onUpdateStatus,
}: LogisticsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center: Santo Domingo, RD
    const map = L.map(mapContainerRef.current, {
      center: [18.4861, -69.9312],
      zoom: 13,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // CartoDB Positron tiles for a sleek, modern UI aesthetic
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>, &copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers & Polylines when orders change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    const latLngs: L.LatLngExpression[] = [];
    const validOrders = ordenes.filter((o) => o.estado !== "ANULADA");

    validOrders.forEach((o, index) => {
      const cli = clientes.find((c) => c.id === o.cliente_id);
      const lat = o.lat_entrega || cli?.lat;
      const lng = o.lng_entrega || cli?.lng;

      if (!lat || !lng) return;

      const pos: L.LatLngTuple = [lat, lng];
      latLngs.push(pos);

      // Marker status colors
      const colorMap = {
        LISTA: { bg: "#f59e0b", border: "#d97706", text: "#ffffff", label: "Pendiente" },
        EN_CAMINO: { bg: "#0284c7", border: "#0369a1", text: "#ffffff", label: "En camino" },
        ENTREGADA: { bg: "#10b981", border: "#059669", text: "#ffffff", label: "Entregada" },
        INCIDENCIA: { bg: "#e11d48", border: "#be123c", text: "#ffffff", label: "Incidencia" },
      };

      const meta = colorMap[o.estado as keyof typeof colorMap] || colorMap.LISTA;

      // Custom HTML Pin Icon with Stop Number
      const customIcon = L.divIcon({
        className: "custom-delivery-pin",
        html: `
          <div style="
            background: ${meta.bg};
            border: 2px solid #ffffff;
            color: ${meta.text};
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 900;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            transform: translate(-50%, -50%);
            transition: transform 0.2s;
            cursor: pointer;
          ">
            ${index + 1}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker(pos, { icon: customIcon });

      // Popup Content
      const popupContent = document.createElement("div");
      popupContent.className = "p-1 font-sans";
      popupContent.innerHTML = `
        <div style="min-width: 200px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-family: monospace; font-size: 10px; font-weight: 700; background: #f1f5f9; padding: 2px 6px; border-radius: 6px;">#${o.numero}</span>
            <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: ${meta.bg};">${meta.label}</span>
          </div>
          <h4 style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 0 0 2px 0;">${cli?.nombre || "Cliente"}</h4>
          <p style="font-size: 11px; color: #64748b; margin: 0 0 8px 0; line-height: 1.3;">${cli?.direccion || "Dirección de entrega"}</p>
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 6px; margin-bottom: 8px;">
            <span style="font-size: 11px; font-weight: 700; color: #3b82f6;">${formatRD(o.total)}</span>
            <span style="font-size: 10px; color: #64748b;">${o.items?.reduce((a, b) => a + b.cantidad, 0) || 0} prendas</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <a href="https://waze.com/ul?ll=${lat},${lng}&navigate=yes" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 4px; padding: 5px; background: #0284c7; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 10px; font-weight: 700;">
              🚗 Waze
            </a>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 4px; padding: 5px; background: #10b981; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 10px; font-weight: 700;">
              🗺️ Maps
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        closeButton: false,
        className: "custom-leaflet-popup",
      });

      marker.on("click", () => {
        if (onSelectOrder) onSelectOrder(o.id);
      });

      markersLayer.addLayer(marker);
    });

    // Draw route path line between active stops (LISTA, EN_CAMINO)
    const activeCoords = validOrders
      .filter((o) => ["LISTA", "EN_CAMINO"].includes(o.estado))
      .map((o) => {
        const cli = clientes.find((c) => c.id === o.cliente_id);
        const lat = o.lat_entrega || cli?.lat;
        const lng = o.lng_entrega || cli?.lng;
        return lat && lng ? ([lat, lng] as L.LatLngTuple) : null;
      })
      .filter(Boolean) as L.LatLngTuple[];

    if (activeCoords.length > 1) {
      polylineRef.current = L.polyline(activeCoords, {
        color: "#3B66F5",
        weight: 3.5,
        dashArray: "6, 8",
        opacity: 0.8,
      }).addTo(map);
    }

    // Fit map bounds to encompass all pins
    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [ordenes, clientes]);

  return (
    <div className="relative w-full h-[520px] rounded-[2rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-slate-100 dark:bg-slate-900">
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Floating Legend / Stats */}
      <div className="absolute top-4 left-4 z-20 rounded-2xl bg-white/90 dark:bg-slate-950/90 backdrop-blur-md p-3 shadow-lg border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
          <Layers className="h-4 w-4 text-primary" />
          <span>Paradas en Ruta ({ordenes.filter(o => o.lat_entrega || clientes.find(c => c.id === o.cliente_id)?.lat).length})</span>
        </div>
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span className="text-[11px] text-slate-600 dark:text-slate-400">Pendiente</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
          <span className="text-[11px] text-slate-600 dark:text-slate-400">En camino</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-[11px] text-slate-600 dark:text-slate-400">Entregado</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
          <span className="text-[11px] text-slate-600 dark:text-slate-400">Incidencia</span>
        </div>
      </div>
    </div>
  );
}
