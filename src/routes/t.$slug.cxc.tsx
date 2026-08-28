import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Printer, Search, Clock, CheckCircle2, ChevronDown, ChevronUp, CreditCard, Phone, RefreshCw, Timer, MessageCircle, FileText, AlertTriangle, Trash2, Building2, Banknote, Receipt } from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { formatRD, saveOrden, saveMovimiento, uid, nextECFNumero, saveTenant, formatDateTimeRD } from "@/lib/storage";
import { emitirECF, getECFConfig } from "@/lib/fiscal";
import type { Orden, Cliente, Tenant, MetodoPago, EstadoOrden } from "@/lib/storage";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { toast } from "sonner";
import { useCajaAbierta, useOrdenes, useClientes, useMovimientos } from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";
import { CobrarOrdenDialog, TicketPrintPortal, CondonarDeudaDialog } from "@/components/klynn/OrdenesPage";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/t/$slug/cxc")({
  component: CuentasPorCobrarPage,
});

interface CXCOrden extends Orden {
  cliente?: Cliente;
  dias_antiguedad: number;
  estado_mora: "AL_DIA" | "POR_VENCER" | "VENCIDA" | "CRITICA";
}

interface ClienteDeuda {
  cliente_id: string;
  cliente_nombre: string;
  cliente_apellido?: string;
  cliente_telefono: string;
  cliente_email?: string;
  total_deuda: number;
  ordenes_count: number;
  dias_max: number;
  estado_mora: "AL_DIA" | "POR_VENCER" | "VENCIDA" | "CRITICA";
  ordenes: CXCOrden[];
  expanded?: boolean;
}

const MORA_CONFIG = {
  AL_DIA:     { label: "Al día",      color: "bg-emerald-100 text-emerald-700 border-emerald-200",  dot: "bg-emerald-500" },
  POR_VENCER: { label: "Por vencer",  color: "bg-amber-100 text-amber-700 border-amber-200",         dot: "bg-amber-500" },
  VENCIDA:    { label: "Vencida",     color: "bg-orange-100 text-orange-700 border-orange-200",      dot: "bg-orange-500" },
  CRITICA:    { label: "Crítica",     color: "bg-red-100 text-red-700 border-red-200",               dot: "bg-red-500" },
};

const OPCIONES_LIMITE = [
  { dias: 10,  label: "10 días" },
  { dias: 15,  label: "15 días" },
  { dias: 30,  label: "30 días" },
  { dias: 45,  label: "45 días" },
  { dias: 60,  label: "60 días" },
  { dias: 90,  label: "90 días" },
];

function diasAntiguedad(fecha: string) {
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000);
}

// Clasificación dinámica basada en el límite configurado
function estadoMora(dias: number, limite: number): CXCOrden["estado_mora"] {
  if (dias <= Math.floor(limite * 0.25))  return "AL_DIA";      // 0-25% del límite
  if (dias <= Math.floor(limite * 0.75))  return "POR_VENCER";  // 25-75% del límite
  if (dias <= limite)                     return "VENCIDA";     // 75-100% del límite
  return "CRITICA";                                             // > 100% del límite
}

function CuentasPorCobrarPage() {
  const user = useRequireAuth();
  const tenantId = user?.tenant?.id || "";
  const queryClient = useQueryClient();
  const { data: cajaAbierta } = useCajaAbierta(tenantId);
  const { data: ordenesRaw = [], isLoading: loadingOrdenes } = useOrdenes(tenantId);
  const { data: dbClients = [], isLoading: loadingClientes } = useClientes(tenantId);
  const { data: dbMovs = [] } = useMovimientos(tenantId);
  const loading = loadingOrdenes && ordenesRaw.length === 0;

  const [cobrarOrden, setCobrarOrden] = useState<Orden | null>(null);
  const [cobrarCliente, setCobrarCliente] = useState<ClienteDeuda | null>(null);
  const [showPrint, setShowPrint] = useState<Orden | null>(null);
  const [pagoRecibidoParaTicket, setPagoRecibidoParaTicket] = useState<number | undefined>(undefined);
  const [condonarOrden, setCondonarOrden] = useState<Orden | null>(null);

  const [enviando, setEnviando] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filtroMora, setFiltroMora] = useState<string>("TODOS");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [formatoPrint, setFormatoPrint] = useState<"A4" | "80mm">("A4");
  const [limiteDias, setLimiteDias] = useState<number>(user?.tenant?.limite_credito_dias ?? 30);
  const [seccion, setSeccion] = useState<"PENDIENTES" | "SALDADAS">("PENDIENTES");

  const { clientes, dbClientesList, ordenesSaldadas } = useMemo(() => {
    const clientsMap = new Map((dbClients || []).map(c => [c.id, c]));
    
    // Consultar movimientos del tenant para identificar créditos saldados
    const creditOrdenIds = new Set(
      (dbMovs || [])
        .filter(m => m.tipo === "ABONO" || m.concepto?.includes("Abono inicial") || m.concepto?.includes("Cobro de saldo"))
        .map(m => m.orden_id)
        .filter(Boolean)
    );

    // Filtrar únicamente órdenes a CRÉDITO pendientes (o con movimientos de crédito)
    const ordenesFiltradas = (ordenesRaw || []).filter(o => 
      o.saldo > 0 && 
      o.estado !== "ANULADA" && 
      (o.metodo_pago === "CREDITO" || creditOrdenIds.has(o.id))
    );

    // Filtrar créditos saldados (originalmente crédito y con saldo 0)
    const ordenesSaldadasRaw = (ordenesRaw || []).filter(o => 
      (o.metodo_pago === "CREDITO" || creditOrdenIds.has(o.id)) && 
      o.saldo === 0 && 
      o.estado !== "ANULADA"
    );

    const map = new Map<string, ClienteDeuda>();
    const allClientsMap = new Map<string, Cliente>();
    
    const sortedOrdenes = [...ordenesFiltradas].sort((a, b) => +new Date(a.creado_en) - +new Date(b.creado_en));

    for (const o of sortedOrdenes) {
      const c = clientsMap.get(o.cliente_id);
      if (c) allClientsMap.set(c.id, c);
      const dias = diasAntiguedad(o.creado_en);
      const mora = estadoMora(dias, limiteDias);
      const ord: CXCOrden = { ...o, cliente: c, dias_antiguedad: dias, estado_mora: mora };
      const cid = o.cliente_id;
      if (!map.has(cid)) {
        map.set(cid, {
          cliente_id: cid,
          cliente_nombre: c?.nombre || "Sin nombre",
          cliente_apellido: c?.apellido,
          cliente_telefono: c?.telefono || "",
          cliente_email: c?.email,
          total_deuda: 0,
          ordenes_count: 0,
          dias_max: 0,
          estado_mora: "AL_DIA",
          ordenes: [],
        });
      }
      const entry = map.get(cid)!;
      entry.total_deuda += o.saldo;
      entry.ordenes_count += 1;
      entry.dias_max = Math.max(entry.dias_max, dias);
      entry.estado_mora = estadoMora(entry.dias_max, limiteDias);
      entry.ordenes.push(ord);
    }

    const sortedSaldadas = [...ordenesSaldadasRaw].sort((a, b) => +new Date(b.creado_en) - +new Date(a.creado_en));
    const saldadasConCliente = sortedSaldadas.map(o => {
      const c = clientsMap.get(o.cliente_id);
      return {
        ...o,
        cliente_nombre: c ? `${c.nombre} ${c.apellido || ""}` : "Consumidor Final",
        cliente_telefono: c?.telefono || ""
      };
    });

    return {
      dbClientesList: Array.from(allClientsMap.values()),
      clientes: Array.from(map.values()).sort((a, b) => b.total_deuda - a.total_deuda),
      ordenesSaldadas: saldadasConCliente
    };
  }, [ordenesRaw, dbClients, dbMovs, limiteDias]);

  const dbClientes = dbClientesList;

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["ordenes", tenantId] });
    queryClient.invalidateQueries({ queryKey: ["clientes", tenantId] });
    queryClient.invalidateQueries({ queryKey: ["movimientos", tenantId] });
  }
  const cargar = refresh;

  const filtered = clientes.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${c.cliente_nombre} ${c.cliente_apellido} ${c.cliente_telefono}`.toLowerCase().includes(q);
    const matchMora = filtroMora === "TODOS" || c.estado_mora === filtroMora;
    return matchSearch && matchMora;
  });

  const totalGeneral = filtered.reduce((s, c) => s + c.total_deuda, 0);
  const totalClientes = filtered.length;

  if (!user || tenantId === "__loading__" || (loadingOrdenes && ordenesRaw.length === 0 && (typeof navigator === "undefined" || navigator.onLine))) {
    return <GlobalPageLoader text="Cargando cuentas por cobrar..." />;
  }

  const totalOrdenes = filtered.reduce((s, c) => s + c.ordenes_count, 0);

  const criticas = clientes.filter(c => c.estado_mora === "CRITICA").length;

  const filteredSaldadas = ordenesSaldadas.filter(o => {
    const q = search.toLowerCase();
    return !q || o.numero.toLowerCase().includes(q) || o.cliente_nombre.toLowerCase().includes(q) || o.cliente_telefono.toLowerCase().includes(q);
  });

  const totalRecuperado = filteredSaldadas.reduce((s, o) => s + o.total, 0);
  const totalSaldadasCount = filteredSaldadas.length;
  const promedioRecuperado = totalSaldadasCount > 0 ? totalRecuperado / totalSaldadasCount : 0;

  function handlePrint() {
    const is80mm = formatoPrint === "80mm";
    let htmlContent = "";

    if (is80mm) {
      // ===== FORMATO TICKET TÉRMICO 80MM =====
      const logoHtml = user.tenant.logo_url
        ? `<div style="text-align:center;margin-bottom:4px"><img src="${user.tenant.logo_url}" alt="Logo" style="height:55px;width:auto;max-width:160px;object-fit:contain;filter:grayscale(100%)"></div>`
        : `<div style="font-size:14px;font-weight:bold;text-transform:uppercase;text-align:center">${user.tenant.nombre}</div>`;

      const clientesHtml = clientes.map(cli => {
        const ordsList = cli.ordenes.map(o => `
          <div style="margin-bottom:5px;font-size:10px">
            <div><b>Orden:</b> ${o.numero} (${new Date(o.creado_en).toLocaleDateString("es-DO")})</div>
            <div style="display:flex;justify-content:between">
              <span>Mora: ${o.dias_antiguedad} ${o.dias_antiguedad === 1 ? "día" : "días"}</span>
              <span style="margin-left:auto">Total: ${formatRD(o.total).replace("RD$", "")}</span>
            </div>
            <div style="display:flex;justify-content:between;font-weight:bold">
              <span>Abonado: ${formatRD(o.pagado).replace("RD$", "")}</span>
              <span style="margin-left:auto;color:#000">Saldo: ${formatRD(o.saldo).replace("RD$", "")}</span>
            </div>
          </div>
          <div style="border-top:1px dotted #000;margin:3px 0"></div>
        `).join("");

        return `
          <div style="margin-bottom:12px;page-break-inside:avoid">
            <div style="font-weight:bold;font-size:11px;text-transform:uppercase">${cli.cliente_nombre} ${cli.cliente_apellido || ""}</div>
            ${cli.cliente_telefono ? `<div style="font-size:10px">Tel: ${cli.cliente_telefono}</div>` : ""}
            <div style="display:flex;justify-content:between;font-size:10px">
              <span>Mora Máx: ${cli.dias_max} ${cli.dias_max === 1 ? "día" : "días"} (${MORA_CONFIG[cli.estado_mora].label})</span>
              <span style="margin-left:auto;font-weight:bold">Deuda: ${formatRD(cli.total_deuda)}</span>
            </div>
            <div style="border-top:1px dashed #000;margin:4px 0"></div>
            ${ordsList}
          </div>
        `;
      }).join("");

      htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>CXC — ${user.tenant.nombre}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          html, body {
            width: 80mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff;
            color: #000;
            font-family: monospace;
            font-size: 11px;
            line-height: 1.3;
          }
          .ticket-container {
            width: 80mm;
            max-width: 80mm;
            padding: 4mm;
            box-sizing: border-box;
          }
          .sep { border-top: 1px dashed #000; margin: 6px 0; }
          .double-sep { border-top: 3px double #000; margin: 6px 0; }
          .text-center { text-align: center; }
          .bold { font-weight: bold; }
        </style>
        </head><body>
        <div class="ticket-container">
          ${logoHtml}
          ${user.tenant.rnc ? `<div class="text-center" style="font-size:10px">RNC: ${user.tenant.rnc}</div>` : ""}
          ${user.tenant.telefono ? `<div class="text-center" style="font-size:10px">Tel: ${user.tenant.telefono}</div>` : ""}
          <div class="sep"></div>
          <div class="text-center bold" style="font-size:12px;letter-spacing:1px">ESTADO DE CUENTAS X COBRAR</div>
          <div class="sep"></div>
          
          <div style="font-size:10px">
            <div><b>Emisión:</b> ${new Date().toLocaleDateString("es-DO")} ${new Date().toLocaleTimeString("es-DO",{hour:"2-digit",minute:"2-digit"})}</div>
            <div><b>Clientes:</b> ${totalClientes} · <b>Órdenes:</b> ${totalOrdenes}</div>
          </div>
          
          <div class="sep"></div>
          ${clientesHtml}
          <div class="double-sep"></div>
          
          <div style="text-align:right;font-size:11px">
            <div class="bold">TOTAL GENERAL CXC</div>
            <div style="font-size:18px;font-weight:bold">${formatRD(totalGeneral)}</div>
          </div>
          
          <div class="sep"></div>
          <div class="text-center" style="font-size:9px;color:#000;margin-top:10px">
            Generado por Klynn · klynn.com.do
          </div>
        </div>
        </body></html>`;
    } else {
      // ===== FORMATO ESTÁNDAR A4 =====
      const rows = clientes.map(cli => {
        const badge = cli.estado_mora === "CRITICA" ? "#dc2626" : cli.estado_mora === "VENCIDA" ? "#ea580c" : cli.estado_mora === "POR_VENCER" ? "#ca8a04" : "#059669";
        const ordRows = cli.ordenes.map(o => `
          <tr>
            <td style="border:1px solid #e2e8f0;padding:4px 6px;font-family:monospace;font-weight:bold">${o.numero}</td>
            <td style="border:1px solid #e2e8f0;padding:4px 6px">${new Date(o.creado_en).toLocaleDateString("es-DO")}</td>
            <td style="border:1px solid #e2e8f0;padding:4px 6px;text-align:center">${o.dias_antiguedad} ${o.dias_antiguedad === 1 ? "día" : "días"}</td>
            <td style="border:1px solid #e2e8f0;padding:4px 6px;text-align:right">${formatRD(o.total)}</td>
            <td style="border:1px solid #e2e8f0;padding:4px 6px;text-align:right">${formatRD(o.pagado)}</td>
            <td style="border:1px solid #e2e8f0;padding:4px 6px;text-align:right;color:#dc2626;font-weight:bold">${formatRD(o.saldo)}</td>
          </tr>`).join("");
        return `
          <div style="margin-bottom:16px">
            <div style="background:#f1f5f9;padding:5px 8px;display:flex;justify-content:space-between;align-items:center;border-radius:4px;margin-bottom:4px">
              <div>
                <span style="font-weight:bold">${cli.cliente_nombre} ${cli.cliente_apellido || ""}</span>
                ${cli.cliente_telefono ? `<span style="font-size:10px;color:#64748b;margin-left:8px">Tel: ${cli.cliente_telefono}</span>` : ""}
              </div>
              <div>
                <span style="background:${badge}22;color:${badge};border-radius:4px;padding:1px 6px;font-size:10px;font-weight:bold;margin-right:6px">${MORA_CONFIG[cli.estado_mora].label}</span>
                <span style="font-weight:bold;color:#dc2626">${formatRD(cli.total_deuda)}</span>
              </div>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead><tr style="background:#f8fafc">
                <th style="border:1px solid #e2e8f0;padding:4px 6px;text-align:left">Orden</th>
                <th style="border:1px solid #e2e8f0;padding:4px 6px;text-align:left">Fecha</th>
                <th style="border:1px solid #e2e8f0;padding:4px 6px;text-align:center">Días</th>
                <th style="border:1px solid #e2e8f0;padding:4px 6px;text-align:right">Total</th>
                <th style="border:1px solid #e2e8f0;padding:4px 6px;text-align:right">Abonado</th>
                <th style="border:1px solid #e2e8f0;padding:4px 6px;text-align:right">Saldo</th>
              </tr></thead>
              <tbody>${ordRows}</tbody>
            </table>
          </div>`;
      }).join("");

      htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>Cuentas x Cobrar — ${user.tenant.nombre}</title>
        <style>@page{size:210mm auto;margin:10mm} body{font-family:Arial,sans-serif;font-size:12px;color:#1e293b;width:210mm;margin:0 auto} h1{font-size:18px;margin:0} h2{font-size:12px;color:#64748b;margin:3px 0 0} .foot{font-size:9px;color:#94a3b8;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:8px;display:flex;justify-content:space-between}</style>
        </head><body>
        <div style="border-bottom:2px solid #1e293b;padding-bottom:8px;margin-bottom:12px">
          <h1>${user.tenant.nombre}</h1>
          <h2>ESTADO DE CUENTAS POR COBRAR</h2>
          <div style="font-size:10px;color:#64748b;margin-top:3px">Emisión: ${new Date().toLocaleDateString("es-DO",{day:"2-digit",month:"long",year:"numeric"})} — ${new Date().toLocaleTimeString("es-DO",{hour:"2-digit",minute:"2-digit"})}</div>
          <div style="font-size:10px;color:#64748b">Total por cobrar: <strong style="color:#dc2626">${formatRD(totalGeneral)}</strong> · Clientes: ${totalClientes} · Órdenes: ${totalOrdenes}</div>
        </div>
        ${rows}
        <div style="border-top:2px solid #1e293b;padding-top:8px;text-align:right;margin-top:8px">
          <div style="font-size:10px;color:#64748b;font-weight:bold;text-transform:uppercase">TOTAL GENERAL POR COBRAR</div>
          <div style="font-size:20px;font-weight:bold;color:#dc2626">${formatRD(totalGeneral)}</div>
        </div>
        <div class="foot"><span>Generado por Klynn · klynn.com.do</span><span>${new Date().toISOString()}</span></div>
        </body></html>`;
    }

    // Crear iframe oculto en el fondo
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      let printed = false;
      const printAndClean = () => {
        if (printed) return;
        printed = true;
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        }, 1500);
      };

      const images = doc.getElementsByTagName("img");
      if (images.length > 0) {
        images[0].onload = printAndClean;
        // Fallback por si la imagen falla o ya está cacheada
        setTimeout(() => {
          if (document.body.contains(iframe)) printAndClean();
        }, 400);
      } else {
        printAndClean();
      }
    }
  }

  async function enviarRecordatorio(cli: ClienteDeuda) {
    const waConfig = user.tenant.config?.whatsapp;
    if (!waConfig?.enabled) {
      toast.error("WhatsApp no está configurado. Actívalo en Configuración."); return;
    }
    if (!cli.cliente_telefono) {
      toast.error("Este cliente no tiene teléfono registrado."); return;
    }
    setEnviando(cli.cliente_id);
    try {
      const ordenesStr = cli.ordenes.map(o =>
        `* Orden ${o.numero} (${new Date(o.creado_en).toLocaleDateString("es-DO")}): ${o.items?.map(i => `${i.descripcion} x${i.cantidad}`).join(", ") || "Servicio"} — Saldo: ${formatRD(o.saldo)} (${o.dias_antiguedad} ${o.dias_antiguedad === 1 ? "día" : "días"})`
      ).join("\n\n");
      const msg = `Estimado/a *${cli.cliente_nombre}${cli.cliente_apellido ? " " + cli.cliente_apellido : ""}*,\n\nLe contactamos de parte de *${user.tenant.nombre}* para recordarle que tiene un saldo pendiente de pago.\n\n*Detalle de órdenes pendientes:*\n\n${ordenesStr}\n\n*Total adeudado: ${formatRD(cli.total_deuda)}*\nDías de la deuda más antigua: ${cli.dias_max} ${cli.dias_max === 1 ? "día" : "días"}\n\nLe solicitamos cordialmente proceder con el pago a la brevedad posible. Para cualquier consulta, comuníquese con nosotros.\n\n_${user.tenant.nombre}${user.tenant.telefono ? " — " + user.tenant.telefono : ""}_`;
      const result = await sendWhatsAppMessage(user.tenant, cli.cliente_telefono, { text: msg });
      if (!result.ok) throw new Error(result.reason || "No se pudo enviar el recordatorio");
      toast.success(`Recordatorio enviado a ${cli.cliente_nombre} ✅`);
    } catch (e: any) {
      toast.error("Error al enviar: " + e.message);
    } finally {
      setEnviando(null);
    }
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #cxc-print-area, #cxc-print-area * { visibility: visible !important; }
          #cxc-print-area { position: fixed; top: 0; left: 0; width: 100%; padding: 20px; background: white; }
          .no-print { display: none !important; }
          table { border-collapse: collapse; width: 100%; font-size: 11px; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
          thead { background: #f3f4f6 !important; -webkit-print-color-adjust: exact; }
          .mora-badge { border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: bold; }
        }
      `}</style>

      <div>
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print pb-4 border-b border-border/30">
          <div>
            <h1 className="font-display text-3xl tracking-tight md:text-4xl font-bold text-foreground">Cuentas x Cobrar</h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground md:text-base">
              {seccion === "PENDIENTES" 
                ? "Resumen de facturas a crédito con saldo pendiente." 
                : "Historial de créditos completamente saldados por tus clientes."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              type="button"
              onClick={() => navigate({ to: "/t/$slug/caja", params: { slug: user.tenant.slug } })}
              className="flex items-center gap-2 rounded-xl h-10 px-4 font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
            >
              <ArrowLeft className="h-4 w-4 text-[#F0B900] shrink-0" />
              <span>Volver a Caja</span>
            </Button>
            
            <Button
              type="button"
              onClick={cargar}
              className="flex items-center gap-2 rounded-xl h-10 px-4 font-extrabold bg-[#F0B900] hover:bg-[#d9a700] text-[#1B4B73] border border-[#F0B900] shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
            >
              <RefreshCw className="h-4 w-4 text-[#1B4B73] shrink-0" />
              <span>Actualizar</span>
            </Button>

            <div className="flex h-10 rounded-xl p-1 bg-surface-elevated border border-border items-center">
              {(["A4", "80mm"] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormatoPrint(f)}
                  className={`px-3 h-full rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    formatoPrint === f 
                      ? "bg-[#1B4B73] text-white shadow-xs" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>{f}</span>
                </button>
              ))}
            </div>

            <Button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl h-10 px-5 font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
            >
              <Printer className="h-4 w-4 text-[#F0B900] shrink-0" />
              <span>Imprimir</span>
            </Button>
          </div>
        </div>

        <div className="mb-6 flex justify-center no-print">
          <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-border/20 shadow-xs max-w-sm w-full">
            <button
              type="button"
              onClick={() => {
                setSeccion("PENDIENTES");
                setSearch("");
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer ${
                seccion === "PENDIENTES" 
                  ? "bg-amber-500 text-white shadow-xs" 
                  : "text-slate-500 hover:text-slate-850 dark:hover:text-slate-350"
              }`}
            >
              <Clock className="h-4 w-4" />
              Pendientes
            </button>
            <button
              type="button"
              onClick={() => {
                setSeccion("SALDADAS");
                setSearch("");
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer ${
                seccion === "SALDADAS" 
                  ? "bg-emerald-600 text-white shadow-xs" 
                  : "text-slate-500 hover:text-slate-850 dark:hover:text-slate-350"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              Saldadas
            </button>
          </div>
        </div>

        {/* KPIs */}
        {seccion === "PENDIENTES" ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card className="p-5 bg-gradient-to-br from-red-500 to-rose-600 text-white border-red-500/20 shadow-md">
              <div className="text-xs uppercase text-white/70 font-bold tracking-wider">Total por Cobrar</div>
              <div className="mt-1 font-display text-2xl font-black">{formatRD(totalGeneral)}</div>
              <div className="text-xs text-white/60 mt-1">{totalOrdenes} Órdenes pendientes</div>
            </Card>
            <Card className="p-5 bg-amber-500/[0.06] border-amber-500/20 text-amber-950 dark:text-amber-100 shadow-sm">
              <div className="text-xs uppercase text-amber-800/85 dark:text-amber-400 font-bold tracking-wider">Clientes con deuda</div>
              <div className="mt-1 font-display text-2xl font-black text-amber-900 dark:text-amber-200">{totalClientes}</div>
              <div className="text-xs text-amber-800/75 dark:text-amber-400/80 mt-1">Con saldo pendiente</div>
            </Card>
            <Card className={`p-5 shadow-sm transition-all duration-300 ${
              criticas > 0 
                ? "bg-rose-500/[0.08] border-rose-500/30 text-rose-950 dark:text-rose-100" 
                : "bg-slate-500/[0.04] border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
            }`}>
              <div className={`text-xs uppercase font-bold tracking-wider ${
                criticas > 0 ? "text-rose-800/85 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"
              }`}>Cuentas Críticas</div>
              <div className={`mt-1 font-display text-2xl font-black ${
                criticas > 0 ? "text-rose-600 dark:text-rose-350 animate-pulse" : "text-slate-700 dark:text-slate-300"
              }`}>{criticas}</div>
              <div className={`text-xs mt-1 ${
                criticas > 0 ? "text-rose-800/75 dark:text-rose-450" : "text-slate-500 dark:text-slate-450"
              }`}>Más de {limiteDias} días</div>
            </Card>
            <Card className="p-5 bg-teal-500/[0.06] border-teal-500/20 text-teal-950 dark:text-teal-100 shadow-sm">
              <div className="text-xs uppercase text-teal-800/85 dark:text-teal-400 font-bold tracking-wider">Promedio por cliente</div>
              <div className="mt-1 font-display text-2xl font-black text-teal-900 dark:text-teal-200">{formatRD(totalClientes > 0 ? totalGeneral / totalClientes : 0)}</div>
              <div className="text-xs text-teal-800/75 dark:text-teal-400/80 mt-1">Deuda promedio</div>
            </Card>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card className="p-5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-emerald-500/20 shadow-md">
              <div className="text-xs uppercase text-white/70 font-bold tracking-wider">Total Cobrado / Recuperado</div>
              <div className="mt-1 font-display text-2xl font-black">{formatRD(totalRecuperado)}</div>
              <div className="text-xs text-white/60 mt-1">{totalSaldadasCount} créditos cobrados</div>
            </Card>
            <Card className="p-5 bg-indigo-500/[0.06] border-indigo-500/20 text-indigo-950 dark:text-indigo-100 shadow-sm">
              <div className="text-xs uppercase text-indigo-800/85 dark:text-indigo-400 font-bold tracking-wider">Créditos Saldados</div>
              <div className="mt-1 font-display text-2xl font-black text-indigo-900 dark:text-indigo-200">{totalSaldadasCount}</div>
              <div className="text-xs text-indigo-800/75 dark:text-indigo-400/80 mt-1">Facturas saldadas</div>
            </Card>
            <Card className="p-5 bg-sky-500/[0.06] border-sky-500/20 text-sky-950 dark:text-sky-100 shadow-sm">
              <div className="text-xs uppercase text-sky-800/85 dark:text-sky-400 font-bold tracking-wider">Promedio Recuperado</div>
              <div className="mt-1 font-display text-2xl font-black text-sky-900 dark:text-sky-200">{formatRD(promedioRecuperado)}</div>
              <div className="text-xs text-sky-800/75 dark:text-sky-400/80 mt-1">Monto promedio</div>
            </Card>
          </div>
        )}

        {/* Filtros */}
        <Card className="mb-4 flex flex-wrap items-center gap-3 p-4 bg-card rounded-2xl border border-border/40 shadow-sm no-print">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={seccion === "PENDIENTES" ? "Buscar cliente, teléfono..." : "Buscar orden, cliente..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {seccion === "PENDIENTES" && (
            <Select value={filtroMora} onValueChange={(v: any) => setFiltroMora(v)}>
              <SelectTrigger className="w-[185px] font-semibold text-xs shrink-0 rounded-xl h-10 border-border/60 bg-background">
                <Timer className="h-4 w-4 text-emerald-600 dark:text-emerald-500 shrink-0 mr-1.5" />
                <SelectValue placeholder="Estado de Mora" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los estados</SelectItem>
                <SelectItem value="AL_DIA">Al día</SelectItem>
                <SelectItem value="POR_VENCER">Por vencer</SelectItem>
                <SelectItem value="VENCIDA">Vencida</SelectItem>
                <SelectItem value="CRITICA">Crítica</SelectItem>
              </SelectContent>
            </Select>
          )}
        </Card>

        {/* Tabla principal — pantalla */}
        <div className="no-print space-y-3">
          {loading && (
            <Card className="p-12 text-center text-muted-foreground">
              <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin opacity-40" />
              Cargando cuentas por cobrar...
            </Card>
          )}
          {!loading && seccion === "PENDIENTES" && filtered.length === 0 && (
            <Card className="p-12 text-center border border-dashed border-emerald-500/20 bg-emerald-500/5 backdrop-blur-md rounded-2xl py-16 flex flex-col items-center justify-center">
              <div className="rounded-2xl bg-emerald-500/10 p-4 mb-4 text-emerald-600 shadow-sm">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">¡Sin deudas pendientes!</h3>
              <p className="text-sm text-muted-foreground max-w-md mt-2 leading-relaxed">
                ¡Felicidades! Todos tus clientes están al día con sus pagos o no hay facturas a crédito pendientes por cobrar en esta categoría.
              </p>
            </Card>
          )}
          {!loading && seccion === "PENDIENTES" && filtered.map(cli => {
            const cfg = MORA_CONFIG[cli.estado_mora];
            const isOpen = expanded[cli.cliente_id];
            return (
              <Card key={cli.cliente_id} className="overflow-hidden">
                <div
                  onClick={() => setExpanded(p => ({ ...p, [cli.cliente_id]: !p[cli.cliente_id] }))}
                  className="w-full p-4 flex items-center justify-between gap-4 hover:bg-accent/30 transition-colors text-left cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base">{cli.cliente_nombre} {cli.cliente_apellido || ""}</span>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border ${cfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      {cli.cliente_telefono && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{cli.cliente_telefono}</span>}
                      <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" />{cli.ordenes_count} orden{cli.ordenes_count !== 1 ? "es" : ""}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Max {cli.dias_max} {cli.dias_max === 1 ? "día" : "días"}</span>
                    </div>
                  </div>

                  {/* Right: Balance and accordion trigger */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="font-display text-xl font-black text-red-600">{formatRD(cli.total_deuda)}</div>
                      <div className="text-xs text-muted-foreground">Pendiente</div>
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-border p-4 bg-slate-50/10 space-y-4">
                    <div className="overflow-x-auto border border-border rounded-xl bg-background">
                      <table className="w-full text-sm">
                        <thead className="bg-surface-elevated text-xs uppercase text-muted-foreground">
                          <tr>
                            <th className="px-4 py-2.5 text-left">Orden y Fecha</th>
                            <th className="px-4 py-2.5 text-left">Días</th>
                            <th className="px-4 py-2.5 text-right">Total</th>
                            <th className="px-4 py-2.5 text-right">Pagado</th>
                            <th className="px-4 py-2.5 text-right font-bold text-red-600">Saldo</th>
                            <th className="px-4 py-2.5 text-left">Estado</th>
                            <th className="px-4 py-2.5 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cli.ordenes.map(o => {
                            const mc = MORA_CONFIG[o.estado_mora];
                            return (
                              <tr key={o.id} className="border-t border-border/50 hover:bg-accent/20">
                                <td className="px-4 py-2">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eef2f6] text-[#2c4e82] dark:bg-slate-800 dark:text-blue-400 border border-[#d6e0ea]/50">
                                      <Receipt className="h-4.5 w-4.5" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-mono text-xs font-bold text-[#2c4e82] dark:text-[#5c85c2]">
                                        {o.numero}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                                        {formatDateTimeRD(o.creado_en)}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${mc.color}`}>
                                    {o.dias_antiguedad} {o.dias_antiguedad === 1 ? "día" : "días"}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-right">{formatRD(o.total)}</td>
                                <td className="px-4 py-2.5 text-right text-emerald-600">{formatRD(o.pagado)}</td>
                                <td className="px-4 py-2.5 text-right font-bold text-red-600">{formatRD(o.saldo)}</td>
                                <td className="px-4 py-2.5 text-xs">{o.estado}</td>
                                <td className="px-4 py-2.5 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCobrarOrden(o);
                                      }}
                                      className="h-7 px-3 text-[10px] font-black tracking-wider uppercase rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                      Cobrar / Abono
                                    </Button>
                                    {isAuthorized && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCondonarOrden(o);
                                        }}
                                        className="h-7 px-3 text-[10px] font-black tracking-wider uppercase rounded-lg border-amber-500/50 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                                      >
                                        Condonar
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="border-t-2 border-border bg-surface-elevated font-bold">
                            <td colSpan={4} className="px-4 py-2.5 text-right text-sm">Total deuda de {cli.cliente_nombre}:</td>
                            <td className="px-4 py-2.5 text-right text-red-600 font-display">{formatRD(cli.total_deuda)}</td>
                            <td colSpan={2} />
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        onClick={e => { e.stopPropagation(); enviarRecordatorio(cli); }}
                        disabled={enviando === cli.cliente_id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-emerald-400/50 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                      >
                        <MessageCircle className="h-4 w-4" />
                        {enviando === cli.cliente_id ? "Enviando..." : "Enviar recordatorio"}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setCobrarCliente(cli); }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-indigo-400/50 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors shrink-0"
                      >
                        <CreditCard className="h-4 w-4" />
                        Cobrar Todo
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}

          {!loading && seccion === "SALDADAS" && filteredSaldadas.length === 0 && (
            <Card className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 bg-slate-500/5 backdrop-blur-md rounded-2xl py-16 flex flex-col items-center justify-center">
              <div className="rounded-2xl bg-slate-500/10 p-4 mb-4 text-slate-600 shadow-sm">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">No hay créditos saldados</h3>
              <p className="text-sm text-muted-foreground max-w-md mt-2 leading-relaxed">
                Aún no tienes facturas a crédito que hayan sido cobradas por completo o que coincidan con la búsqueda.
              </p>
            </Card>
          )}

          {!loading && seccion === "SALDADAS" && filteredSaldadas.length > 0 && (
            <Card className="overflow-hidden border border-border rounded-2xl bg-card shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/40 text-xs uppercase text-slate-500 border-b border-border">
                    <tr>
                      <th className="px-5 py-3.5 text-left font-bold">Orden y Cliente</th>
                      <th className="px-5 py-3.5 text-right font-bold">Monto Cobrado</th>
                      <th className="px-5 py-3.5 text-center font-bold">Estado</th>
                      <th className="px-5 py-3.5 text-center font-bold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredSaldadas.map(o => (
                      <tr key={o.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef2f6] text-[#2c4e82] dark:bg-slate-800 dark:text-blue-400 animate-in fade-in zoom-in duration-200 border border-[#d6e0ea]/50">
                              <Receipt className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-mono text-sm font-bold text-[#2c4e82] dark:text-[#5c85c2]">
                                {o.numero}
                              </span>
                              <span className="font-bold text-sm text-foreground truncate max-w-[280px]" title={o.cliente_nombre}>
                                {o.cliente_nombre}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-medium">
                                {formatDateTimeRD(o.creado_en)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right font-display font-bold text-emerald-600">{formatRD(o.total)}</td>
                        <td className="px-5 py-3 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border bg-emerald-100 text-emerald-700 border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Saldado
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowPrint(o)}
                            className="h-7 px-3 text-[10px] font-black uppercase tracking-wider gap-1 border-primary/20 hover:bg-primary/5 hover:text-primary rounded-lg"
                          >
                            <Printer className="h-3 w-3" /> Ver Recibo
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* El área de impresión se genera dinámicamente en handlePrint() */}
        <div style={{ display: "none" }}>
          <div style={{ fontFamily: "Arial, sans-serif", maxWidth: "210mm", margin: "0 auto" }}>
            {/* Encabezado */}
            <div style={{ borderBottom: "2px solid #1e293b", paddingBottom: 12, marginBottom: 16 }}>
              <h1 style={{ fontSize: 20, fontWeight: "bold", margin: 0, color: "#1e293b" }}>
                {user.tenant.nombre}
              </h1>
              <h2 style={{ fontSize: 14, fontWeight: "bold", margin: "4px 0 0", color: "#64748b" }}>
                ESTADO DE CUENTAS POR COBRAR
              </h2>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                Fecha de emisión: {new Date().toLocaleDateString("es-DO", { day: "2-digit", month: "long", year: "numeric" })} —{" "}
                {new Date().toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>

            {/* Resumen */}
            <table style={{ width: "100%", marginBottom: 20, borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "4px 8px", fontWeight: "bold", fontSize: 12 }}>Total por Cobrar:</td>
                  <td style={{ padding: "4px 8px", fontSize: 12, color: "#dc2626", fontWeight: "bold" }}>{formatRD(totalGeneral)}</td>
                  <td style={{ padding: "4px 8px", fontWeight: "bold", fontSize: 12 }}>Clientes:</td>
                  <td style={{ padding: "4px 8px", fontSize: 12 }}>{totalClientes}</td>
                  <td style={{ padding: "4px 8px", fontWeight: "bold", fontSize: 12 }}>Órdenes:</td>
                  <td style={{ padding: "4px 8px", fontSize: 12 }}>{totalOrdenes}</td>
                </tr>
              </tbody>
            </table>

            {/* Detalle por cliente */}
            {clientes.map(cli => (
              <div key={cli.cliente_id} style={{ marginBottom: 20 }}>
                <div style={{ background: "#f1f5f9", padding: "6px 10px", borderRadius: 4, marginBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontWeight: "bold", fontSize: 13 }}>{cli.cliente_nombre} {cli.cliente_apellido || ""}</span>
                    {cli.cliente_telefono && <span style={{ fontSize: 11, color: "#64748b", marginLeft: 10 }}>Tel: {cli.cliente_telefono}</span>}
                  </div>
                  <div>
                    <span className="mora-badge" style={{
                      background: cli.estado_mora === "CRITICA" ? "#fee2e2" : cli.estado_mora === "VENCIDA" ? "#ffedd5" : cli.estado_mora === "POR_VENCER" ? "#fef9c3" : "#d1fae5",
                      color: cli.estado_mora === "CRITICA" ? "#dc2626" : cli.estado_mora === "VENCIDA" ? "#ea580c" : cli.estado_mora === "POR_VENCER" ? "#ca8a04" : "#059669",
                      padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: "bold", marginRight: 8
                    }}>
                      {MORA_CONFIG[cli.estado_mora].label}
                    </span>
                    <span style={{ fontWeight: "bold", color: "#dc2626", fontSize: 13 }}>{formatRD(cli.total_deuda)}</span>
                  </div>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={{ border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "left" }}>Orden</th>
                      <th style={{ border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "left" }}>Fecha</th>
                      <th style={{ border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "center" }}>Días</th>
                      <th style={{ border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "right" }}>Total</th>
                      <th style={{ border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "right" }}>Abonado</th>
                      <th style={{ border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "right" }}>Saldo</th>
                      <th style={{ border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "left" }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cli.ordenes.map(o => (
                      <tr key={o.id}>
                        <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px", fontFamily: "monospace", fontWeight: "bold" }}>{o.numero}</td>
                        <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px" }}>{new Date(o.creado_en).toLocaleDateString("es-DO")}</td>
                        <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "center" }}>{o.dias_antiguedad}</td>
                        <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "right" }}>{formatRD(o.total)}</td>
                        <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "right" }}>{formatRD(o.pagado)}</td>
                        <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "right", fontWeight: "bold", color: "#dc2626" }}>{formatRD(o.saldo)}</td>
                        <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px" }}>{o.estado}</td>
                      </tr>
                    ))}
                    <tr style={{ background: "#f8fafc" }}>
                      <td colSpan={5} style={{ border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "right", fontWeight: "bold" }}>
                        Subtotal {cli.cliente_nombre}:
                      </td>
                      <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "right", fontWeight: "bold", color: "#dc2626" }}>
                        {formatRD(cli.total_deuda)}
                      </td>
                      <td style={{ border: "1px solid #e2e8f0" }} />
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}

            {/* Total final */}
            <div style={{ borderTop: "2px solid #1e293b", paddingTop: 10, marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: "bold", textTransform: "uppercase" }}>TOTAL GENERAL POR COBRAR</div>
                <div style={{ fontSize: 22, fontWeight: "bold", color: "#dc2626" }}>{formatRD(totalGeneral)}</div>
              </div>
            </div>

            <div style={{ marginTop: 30, paddingTop: 12, borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>Generado por Klynn · klynn.com.do</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>{new Date().toISOString()}</div>
            </div>
          </div>
        </div>
      </div>



      {cobrarOrden && (
        <CobrarOrdenDialog
          orden={cobrarOrden}
          onClose={() => setCobrarOrden(null)}
          tenant={user.tenant}
          cajaAbierta={cajaAbierta}
          clientes={dbClientes}
          queryClient={queryClient}
          showPrintPortal={(upd, rec) => {
            setShowPrint(upd);
            setPagoRecibidoParaTicket(rec);
          }}
          onSuccess={() => {
            cargar();
          }}
        />
      )}

      {cobrarCliente && (
        <CobrarDeudaClienteDialog
          cliente={cobrarCliente}
          onClose={() => setCobrarCliente(null)}
          tenantId={tenantId}
          tenant={user.tenant}
          cajaAbierta={cajaAbierta}
          queryClient={queryClient}
          onSuccess={() => {
            cargar();
          }}
        />
      )}

      {showPrint && (
        <TicketPrintPortal 
          orden={showPrint} 
          tenant={user.tenant} 
          clientes={dbClientes}
          empleados={[]}
          pagoRecibido={pagoRecibidoParaTicket}
          ocultarUbicacion={true}
          onClose={() => {
            setShowPrint(null);
            setPagoRecibidoParaTicket(undefined);
          }} 
        />
      )}

      {condonarOrden && (
        <CondonarDeudaDialog
          orden={condonarOrden}
          onClose={() => setCondonarOrden(null)}
          tenantId={tenantId}
          onSuccess={() => {
            cargar();
          }}
        />
      )}
    </>
  );
}

// Strip runtime-only CXCOrden fields before Supabase upsert
function cleanOrdenCXC(o: any): Orden {
  const { cliente, dias_antiguedad, estado_mora, cliente_nombre, cliente_telefono, ...rest } = o;
  return rest;
}

interface CobrarDeudaClienteDialogProps {
  cliente: ClienteDeuda;
  onClose: () => void;
  tenantId: string;
  tenant: any;
  cajaAbierta: any;
  queryClient: any;
  onSuccess: () => void;
}

function CobrarDeudaClienteDialog({ cliente, onClose, tenantId, tenant, cajaAbierta, queryClient, onSuccess }: CobrarDeudaClienteDialogProps) {
  const [metodo, setMetodo] = useState<MetodoPago>("EFECTIVO");
  const [recibido, setRecibido] = useState<number>(cliente.total_deuda);
  const [loading, setLoading] = useState<boolean>(false);
  const [referencia, setReferencia] = useState("");
  const [showRefInput, setShowRefInput] = useState(false);

  const formatAmountInput = (val: string) => {
    if (!val) return "";
    const clean = val.replace(/,/g, "").replace(/[^0-9.]/g, "");
    const parts = clean.split(".");
    const integerPart = parts[0];
    const decimalPart = parts.length > 1 ? parts.slice(1).join("") : null;
    
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    
    if (decimalPart !== null) {
      return formattedInteger + "." + decimalPart.substring(0, 2);
    }
    return formattedInteger;
  };

  const parseAmount = (val: string) => {
    const clean = val.replace(/,/g, "").replace(/[^0-9.]/g, "");
    return parseFloat(clean) || 0;
  };

  const vuelto = metodo === "EFECTIVO" && recibido > cliente.total_deuda ? recibido - cliente.total_deuda : 0;

  async function handleConfirmarCobro() {
    if (!cajaAbierta) {
      toast.error("La caja debe estar abierta para registrar un cobro");
      return;
    }
    if (recibido <= 0) {
      toast.error("El monto recibido debe ser mayor a cero");
      return;
    }

    setLoading(true);
    try {
      const montoAPagar = Math.min(recibido, cliente.total_deuda);
      let restante = montoAPagar;

      // Obtener el cliente full para la facturación fiscal
      const { data: clienteFull } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", cliente.cliente_id)
        .single();

      const fiscalConfig = await getECFConfig(tenantId);
      const isElectronic = !!fiscalConfig?.is_active;

      // Ordenar las órdenes del cliente por fecha de creación (FIFO)
      const sortedOrdenes = [...cliente.ordenes].sort((a, b) => new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime());

      for (const o of sortedOrdenes) {
        if (restante <= 0) break;
        const totalCobrarOrden = o.saldo;
        const montoAPagarOrden = Math.min(restante, totalCobrarOrden);
        if (montoAPagarOrden <= 0) continue;

        const nuevoPagado = Number((o.pagado + montoAPagarOrden).toFixed(2));
        const nuevoSaldo = Number((totalCobrarOrden - montoAPagarOrden).toFixed(2));
        const nuevoEstado: EstadoOrden = o.estado;

        let finalNCF: string | undefined = o.ncf;
        let finalNcfVencimiento: string | undefined = o.ncf_vencimiento;
        let finalTipoECF: string | undefined = o.tipo_ecf;
        let finalEcfId: string | undefined = o.ecf_id;
        let finalEcfQr: string | undefined = o.ecf_qr;
        let finalEcfSecurityCode: string | undefined = o.ecf_security_code;
        let finalEcfSignatureDate: string | undefined = o.ecf_signature_date;
        let finalEcfStatus: string | undefined = o.ecf_status;

        if (tenant.config?.ncf_facturacion_activa && !o.ncf && nuevoSaldo === 0) {
          const cliObj = clienteFull || { nombre: "Consumidor", apellido: "Final", telefono: "", tipo: "Consumidor Final" };
          const isEmpresa = cliObj.tipo === "Empresa" || (cliObj.cedula && cliObj.cedula.length >= 9);
          const tipoECFDefault = isElectronic 
            ? (isEmpresa ? "E31" : "E32")
            : (isEmpresa ? "B01" : "B02");

          if (!isElectronic) {
            try {
              const { ncf: nextNCF, expiration_date } = await nextECFNumero(tenantId, tipoECFDefault);
              finalNCF = nextNCF;
              finalNcfVencimiento = expiration_date;
            } catch (seqErr) {
              console.log("No dynamic sequence for traditional NCF, falling back to legacy sequence.");
              finalNCF = `${tenant.config.ncf_secuencia || 'B02'}${String(tenant.config.ncf_proximo || 1).padStart(8, "0")}`;
              await saveTenant({
                ...tenant,
                config: {
                  ...tenant.config,
                  ncf_proximo: (tenant.config.ncf_proximo || 1) + 1
                }
              });
            }
          } else {
            if (typeof window !== "undefined" && !navigator.onLine) {
              // Offline no firma, no consume secuencia y no fabrica QR/codigo.
              // La orden permanece como pre-factura hasta su transmision real.
              finalNCF = undefined;
              finalTipoECF = tipoECFDefault;
              finalEcfQr = undefined;
              finalEcfSecurityCode = undefined;
              finalEcfSignatureDate = undefined;
              finalEcfStatus = "PENDING_OFFLINE_TRANSMISSION";

              toast.info("Modo Offline: cobro registrado como Pre-Factura. Se timbrará al sincronizar.");
            } else {
              try {
                let nextNCF: string | undefined = undefined;
                if (fiscalConfig?.ambiente === "produccion") {
                  try {
                    const { ncf, expiration_date } = await nextECFNumero(tenantId, tipoECFDefault);
                    nextNCF = ncf;
                    finalNcfVencimiento = expiration_date;
                  } catch (seqErr) {
                    console.warn("Aviso al obtener secuencia local:", seqErr);
                  }
                }

                const ordenTemporal: Orden = cleanOrdenCXC({
                  ...o,
                  pagado: nuevoPagado,
                  saldo: nuevoSaldo,
                  estado: nuevoEstado,
                  metodo_pago: o.pagado > 0 ? "MIXTO" : metodo,
                  ncf: nextNCF
                });

                const result = await emitirECF(
                  ordenTemporal,
                  cliObj as Cliente,
                  fiscalConfig?.pronesoft_tenant_id,
                  tenant.config,
                  tenant,
                  tipoECFDefault
                );

                finalNCF = result.encf;
                finalTipoECF = tipoECFDefault;
                finalEcfId = result.document.track_id || result.document.pronesoft_id || result.document.id;
                const legalStatus = String(result.legal_status || result.document.legal_status || '').toUpperCase();
                const accepted = legalStatus === "ACCEPTED" || legalStatus === "ACCEPTED_WITH_OBSERVATIONS";
                finalEcfStatus = legalStatus === "REJECTED" ? "REJECTED" : accepted ? legalStatus : "REGISTERED";
                finalEcfQr = accepted ? result.stamp_url || result.document.document_stamp_url || '' : undefined;
                finalEcfSecurityCode = accepted ? result.security_code || '' : undefined;
                finalEcfSignatureDate = accepted ? result.document.signature_date : undefined;

                toast.success(accepted
                  ? `Comprobante DGII ${result.encf} aceptado para orden #${o.numero}`
                  : `Comprobante ${result.encf} emitido con éxito`);
              } catch (fErr: any) {
                console.error("Error Fiscal en Cobrar Todo:", fErr);
                const message = String(fErr?.message || fErr || '');
                const isConnectivityFailure = typeof navigator !== "undefined" && !navigator.onLine
                  || /failed to fetch|network|connection|timeout|timed out|load failed/i.test(message);
                finalEcfStatus = isConnectivityFailure ? "PENDING_OFFLINE_TRANSMISSION" : "ERROR";
                toast.error(`Error al generar comprobante fiscal para orden #${o.numero}: ` + fErr.message);
              }
            }
          }
        }

        // Guardar la orden con los saldos actualizados y datos fiscales
        await saveOrden(cleanOrdenCXC({
          ...o,
          pagado: nuevoPagado,
          saldo: nuevoSaldo,
          estado: nuevoEstado,
          metodo_pago: o.metodo_pago === "CREDITO" ? "CREDITO" : o.metodo_pago,
          ncf: finalNCF,
          ncf_vencimiento: finalNcfVencimiento,
          tipo_ecf: finalTipoECF,
          ecf_id: finalEcfId,
          ecf_qr: finalEcfQr,
          ecf_security_code: finalEcfSecurityCode,
          ecf_signature_date: finalEcfSignatureDate,
          ecf_status: finalEcfStatus,
          pago_referencia: (metodo === "TARJETA" || metodo === "TRANSFERENCIA") && referencia ? referencia : o.pago_referencia
        }));

        const eraPagoAlRetirar = o.metodo_pago === "PAGO_AL_RETIRAR";

        // Registrar el movimiento de entrada en caja para esta orden
        await saveMovimiento({
          id: uid("mov"),
          tenant_id: tenantId,
          caja_id: cajaAbierta.id,
          empleado_id: o.empleado_id,
          tipo: eraPagoAlRetirar ? "VENTA" : (nuevoSaldo === 0 ? "VENTA" : "ABONO"),
          concepto: eraPagoAlRetirar
            ? (nuevoSaldo === 0
              ? `Cobro de orden al retirar #${o.numero} desde Cobrar Todo${(metodo === "TARJETA" || metodo === "TRANSFERENCIA") && referencia ? ` (Ref: ${referencia})` : ""}`
              : `Abono a orden al retirar #${o.numero} desde Cobrar Todo (Saldo restante: ${formatRD(nuevoSaldo)})${(metodo === "TARJETA" || metodo === "TRANSFERENCIA") && referencia ? ` (Ref: ${referencia})` : ""}`)
            : (nuevoSaldo === 0
              ? `Cobro de saldo orden #${o.numero} desde Cobrar Todo${(metodo === "TARJETA" || metodo === "TRANSFERENCIA") && referencia ? ` (Ref: ${referencia})` : ""}`
              : `Abono a orden #${o.numero} desde Cobrar Todo (Saldo restante: ${formatRD(nuevoSaldo)})${(metodo === "TARJETA" || metodo === "TRANSFERENCIA") && referencia ? ` (Ref: ${referencia})` : ""}`),
          monto: montoAPagarOrden,
          metodo: metodo,
          orden_id: o.id,
          creado_en: new Date().toISOString(),
        });

        restante = Number((restante - montoAPagarOrden).toFixed(2));
      }

      toast.success(`Se cobraron RD$${montoAPagar.toFixed(2)} de la deuda de ${cliente.cliente_nombre} ✅`);
      
      queryClient.invalidateQueries({ queryKey: ['ordenes', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['movimientos', tenantId] });

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error("Error al registrar el cobro: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-display font-black text-emerald-800">
            <div className="bg-emerald-100 p-2 rounded-xl">
              <CreditCard className="h-5 w-5 text-emerald-600" />
            </div>
            Cobrar Deuda Total
          </DialogTitle>
          <p className="text-xs text-muted-foreground pt-1">
            Registra el pago total o abono parcial para la deuda del cliente <span className="font-bold text-foreground">{cliente.cliente_nombre} {cliente.cliente_apellido || ""}</span>.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tarjeta de Resumen de Deuda */}
          <div className="rounded-2xl bg-emerald-50/50 border border-emerald-100 p-4 text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">Total Deuda Acumulada</span>
            <span className="text-3xl font-black text-emerald-600 block">{formatRD(cliente.total_deuda)}</span>
            <span className="text-[10px] text-muted-foreground block mt-1">{cliente.ordenes_count} orden{cliente.ordenes_count !== 1 ? "es" : ""} con saldo pendiente</span>
          </div>

          {/* Formulario */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Método de Pago</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "EFECTIVO", label: "Efectivo", icon: Banknote },
                  { id: "TARJETA", label: "Tarjeta", icon: CreditCard },
                  { id: "TRANSFERENCIA", label: "Transferencia", icon: Building2 }
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = metodo === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setMetodo(m.id as MetodoPago);
                        setReferencia("");
                        setShowRefInput(false);
                        if (m.id !== "EFECTIVO" && recibido > cliente.total_deuda) {
                          setRecibido(cliente.total_deuda);
                        }
                      }}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 active:scale-95 cursor-pointer ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm"
                          : "border-border hover:border-emerald-500/40 hover:bg-emerald-50/20 text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-5 w-5 mb-1 shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-wider">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                {metodo === "EFECTIVO" ? "Monto Recibido" : "Monto a Cobrar"}
              </label>
              <div className="relative h-14">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-lg text-muted-foreground/40">RD$</span>
                <Input
                  className="h-full pl-14 text-2xl md:text-3xl font-black bg-background border border-primary/20 focus-visible:ring-emerald-500 focus-visible:ring-offset-0 rounded-2xl transition-all"
                  value={recibido ? formatAmountInput(String(recibido)) : ""}
                  onChange={(e) => setRecibido(parseAmount(e.target.value))}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>

            {/* Referencia de Transacción para Tarjeta/Transferencia */}
            {(metodo === "TARJETA" || metodo === "TRANSFERENCIA") && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  Referencia de Transacción
                </label>
                {!showRefInput ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRefInput(true)}
                    className="w-full h-10 rounded-xl font-bold gap-2 text-primary border-primary/20 hover:bg-primary/5 hover:text-primary cursor-pointer text-xs"
                  >
                    <FileText className="h-4 w-4" /> Añadir referencia (Opcional)
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={referencia}
                      onChange={(e) => setReferencia(e.target.value)}
                      placeholder={metodo === "TARJETA" ? "Número de aprobación, autorización, Auth # o APR." : "Número de aprobación, transferencia, cuenta, etc."}
                      className="h-10 bg-white border-2 border-primary/20 focus-visible:ring-primary/30 rounded-xl font-medium text-xs animate-in slide-in-from-top-1 duration-150"
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        setReferencia("");
                        setShowRefInput(false);
                      }}
                      className="h-10 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold gap-1.5 cursor-pointer text-xs border-none"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Quitar
                    </Button>
                  </div>
                )}
              </div>
            )}

            {metodo === "EFECTIVO" && recibido > cliente.total_deuda && (
              <div className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
                <span className="font-medium text-slate-500">Cambio a entregar:</span>
                <span className="font-bold text-slate-800 text-sm">{formatRD(vuelto)}</span>
              </div>
            )}
            
            {recibido > 0 && recibido < cliente.total_deuda && (
              <div className="flex justify-between items-center bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800">
                <span className="font-medium">Saldo restante del cliente:</span>
                <span className="font-bold text-sm">{formatRD(cliente.total_deuda - recibido)}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmarCobro}
            disabled={loading || !cajaAbierta || recibido <= 0}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            {loading ? "Procesando..." : "Confirmar Pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
