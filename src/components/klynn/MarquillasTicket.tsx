import React from "react";
import type { Orden, Tenant, Empleado, Cliente } from "@/lib/storage";
import {
  Shirt,
  Calendar,
  User,
  Tag,
  Scissors,
  MapPin,
  AlertCircle,
  WashingMachine
} from "lucide-react";

interface Props {
  orden: Orden;
  tenant: Tenant;
  cliente: Cliente;
  empleado?: Empleado;
  formato?: "57mm" | "80mm";
}

interface GarmentUnit {
  globalIndex: number;
  totalGarments: number;
  descripcion: string;
  itemSubIndex: number;
  itemTotal: number;
  color?: string;
  notas?: string;
  servicio: string;
  es_libra?: boolean;
}

function humanizeDate(dateStr: string, showTime = true): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = dDate.getTime() - nowDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  const timeStr = d.toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit", hour12: true });

  if (diffDays === 0) return `Hoy a las ${timeStr}`;
  if (diffDays === 1) return `Mañana a las ${timeStr}`;
  return d.toLocaleString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatPhoneDO(phoneStr?: string): string {
  if (!phoneStr || phoneStr === "---") return "";
  const digits = phoneStr.replace(/\D/g, "");
  const cleanDigits = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (cleanDigits.length === 10) {
    return `(${cleanDigits.slice(0, 3)}) ${cleanDigits.slice(3, 6)}-${cleanDigits.slice(6)}`;
  }
  return phoneStr;
}

/**
 * Genera la lista de marquillas individuales desglosadas por unidad de prenda.
 * Cada elemento cuenta con estilos térmicos y reglas de salto de página
 * para que la impresora térmica active el corte automático entre cada una.
 */
export function MarquillasTicket({
  orden,
  tenant,
  cliente,
  empleado: _empleado,
  formato = "80mm"
}: Props) {
  const w = formato === "57mm" ? "w-[58mm]" : "w-[80mm]";
  const cols = formato === "57mm" ? "max-w-[32ch]" : "max-w-[44ch]";

  // 1. Filtrar y expandir prendas en unidades individuales
  const rawItems = orden.items || [];
  const garmentUnits: GarmentUnit[] = [];

  // Calcular el total de prendas reales
  let totalCount = 0;
  rawItems.forEach(it => {
    const isServiceHeader = it.descripcion.toLowerCase().startsWith("servicio:");
    if (!isServiceHeader) {
      if (it.es_libra) {
        totalCount += 1;
      } else {
        totalCount += Math.max(1, Math.floor(it.cantidad || 1));
      }
    }
  });

  if (totalCount === 0) totalCount = 1;

  let currentGlobalIdx = 1;
  rawItems.forEach(it => {
    const isServiceHeader = it.descripcion.toLowerCase().startsWith("servicio:");
    if (isServiceHeader) return;

    const cleanDesc = it.descripcion.replace(/^↳\s*/, "");
    const qty = it.es_libra ? 1 : Math.max(1, Math.floor(it.cantidad || 1));
    const srvName = it.servicio_origen || (orden.servicios && orden.servicios.length > 0 ? orden.servicios.join(", ") : "Lavandería");

    for (let k = 1; k <= qty; k++) {
      garmentUnits.push({
        globalIndex: currentGlobalIdx,
        totalGarments: totalCount,
        descripcion: cleanDesc,
        itemSubIndex: k,
        itemTotal: qty,
        color: it.color,
        notas: it.notas,
        servicio: srvName,
        es_libra: it.es_libra
      });
      currentGlobalIdx++;
    }
  });

  if (garmentUnits.length === 0) {
    garmentUnits.push({
      globalIndex: 1,
      totalGarments: 1,
      descripcion: "Orden General",
      itemSubIndex: 1,
      itemTotal: 1,
      servicio: (orden.servicios && orden.servicios.length > 0) ? orden.servicios.join(", ") : "Servicio"
    });
  }

  return (
    <div className="marquillas-container block w-full">
      {garmentUnits.map((unit, idx) => (
        <React.Fragment key={`marquilla-${idx}`}>
          <div
            className={`marquilla-item mx-auto ${w} ${cols} bg-white pl-2 pr-4 py-2 text-[10.5px] leading-tight text-black block`}
            style={{
              fontFamily: '"Plus Jakarta Sans", "Segoe UI", Arial, sans-serif',
              WebkitPrintColorAdjust: "exact",
              printColorAdjust: "exact",
              pageBreakAfter: idx < garmentUnits.length - 1 ? "always" : "auto",
              breakAfter: idx < garmentUnits.length - 1 ? "page" : "auto",
              pageBreakInside: "avoid",
              breakInside: "avoid",
              display: "block",
            }}
          >
            {/* ENCABEZADO: TÍTULO Y NEGOCIO */}
            <div className="flex items-center justify-between border-b border-black pb-1 mb-1">
              <div className="font-extrabold uppercase text-[10px] truncate max-w-[65%]">
                {tenant.nombre}
              </div>
              <div className="font-bold text-[8.5px] uppercase bg-black text-white px-1 py-0.5 rounded-xs tracking-wider">
                MARQUILLA
              </div>
            </div>

            {/* NÚMERO DE ORDEN Y CONTADOR DE PRENDA (ALTO IMPACTO VISUAL) */}
            <div className="my-1 py-1 border-y-2 border-black flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Tag className="h-4 w-4 text-black shrink-0" />
                <div>
                  <div className="text-[8.5px] font-bold uppercase tracking-wider text-black/70 leading-none">ORDEN N.°</div>
                  <div className="text-base font-black tracking-tight leading-none tabular-nums mt-0.5">{orden.numero}</div>
                </div>
              </div>
              <div className="bg-black text-white px-2 py-1 rounded-sm text-center">
                <div className="text-[7.5px] font-bold uppercase tracking-wider leading-none">PRENDA</div>
                <div className="text-[13px] font-black leading-none mt-0.5 tabular-nums">
                  {unit.globalIndex} / {unit.totalGarments}
                </div>
              </div>
            </div>

            {/* DATOS DEL CLIENTE */}
            <div className="py-1 border-b border-dotted border-black/50 space-y-0.5">
              <div className="flex items-start justify-between gap-1">
                <div className="flex items-center gap-1 font-bold uppercase shrink-0 text-black text-[9.5px]">
                  <User className="h-3 w-3 text-black shrink-0" />
                  <span>CLIENTE:</span>
                </div>
                <span className="font-bold text-right text-black text-[10.5px] truncate">
                  {cliente.nombre} {cliente.apellido || ""}
                </span>
              </div>
              {cliente.telefono && cliente.telefono !== "---" && (
                <div className="flex items-center justify-between gap-1 text-[9px]">
                  <span className="text-black/70 font-semibold">TEL:</span>
                  <span className="font-bold text-black tabular-nums">{formatPhoneDO(cliente.telefono)}</span>
                </div>
              )}
            </div>

            {/* DETALLE DE LA PRENDA Y SERVICIO */}
            <div className="py-1.5 border-b border-black space-y-1">
              <div className="flex items-start gap-1">
                <Shirt className="h-3.5 w-3.5 text-black shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-black text-[12px] uppercase leading-tight text-black">
                    {unit.descripcion}
                    {unit.es_libra ? " (Por Libra)" : (unit.itemTotal > 1 ? ` (${unit.itemSubIndex}/${unit.itemTotal})` : "")}
                  </div>
                  {unit.color && (
                    <div className="text-[9.5px] font-bold text-black mt-0.5">
                      COLOR: <span className="uppercase">{unit.color}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* SERVICIO ASOCIADO */}
              <div className="bg-black/5 border border-black/40 rounded-xs px-1.5 py-0.5 flex items-center justify-between text-[9px]">
                <div className="flex items-center gap-1 font-bold text-black uppercase">
                  <WashingMachine className="h-3 w-3 shrink-0" />
                  <span>SERVICIO:</span>
                </div>
                <span className="font-bold uppercase text-black truncate max-w-[60%]">{unit.servicio}</span>
              </div>
            </div>

            {/* UBICACIÓN / CONVEYOR / GANCHO (SI APLICA) */}
            {orden.ubicacion_ropa && (
              <div className="my-1 p-1 bg-black text-white text-center rounded-xs flex items-center justify-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-white shrink-0" />
                <span className="text-[8.5px] font-bold uppercase tracking-wider">UBICACIÓN:</span>
                <span className="text-[11px] font-black uppercase">{orden.ubicacion_ropa}</span>
              </div>
            )}

            {/* FECHA DE ENTREGA Y URGENCIA */}
            <div className="py-1 border-b border-dotted border-black/50 flex items-center justify-between gap-1 text-[9.5px]">
              <div className="flex items-center gap-1 font-bold uppercase text-black">
                <Calendar className="h-3 w-3 text-black shrink-0" />
                <span>ENTREGA:</span>
              </div>
              <div className="font-black text-right text-black">
                {humanizeDate(orden.fecha_entrega, true)}
              </div>
            </div>

            {orden.es_urgente && (
              <div className="my-1 text-center font-black text-white bg-black py-0.5 text-[9px] uppercase tracking-widest rounded-xs">
                ★ URGENTE ★
              </div>
            )}

            {/* NOTA ESPECÍFICA DE LA PRENDA U ORDEN */}
            {(unit.notas || orden.notas) && (
              <div className="mt-1 pt-1 border-t border-dotted border-black/40 text-[9px] leading-snug">
                <div className="flex items-center gap-1 font-bold text-black">
                  <AlertCircle className="h-3 w-3 shrink-0 text-black" />
                  <span>NOTA / INSPECCIÓN:</span>
                </div>
                <div className="font-semibold text-black italic pl-4">
                  {unit.notas || orden.notas}
                </div>
              </div>
            )}
          </div>

          {idx < garmentUnits.length - 1 && (
            <div
              className="page-break-divider"
              style={{
                pageBreakAfter: "always",
                breakAfter: "page",
                display: "block",
                height: 0,
                clear: "both",
                visibility: "hidden",
              }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
