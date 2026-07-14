import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, Printer, Search, Clock, CheckCircle2, ChevronDown, ChevronUp, CreditCard, Phone, RefreshCw, Timer, MessageCircle, FileText, AlertTriangle } from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { formatRD, saveOrden, saveMovimiento, uid } from "@/lib/storage";
import type { Orden, Cliente, Tenant, MetodoPago, EstadoOrden } from "@/lib/storage";
import { notificarWhatsApp } from "@/lib/whatsapp";
import { toast } from "sonner";
import { useCajaAbierta } from "@/hooks/use-queries";
import { queryClient } from "@/router";
import { CobrarOrdenDialog, TicketPrintPortal, CondonarDeudaDialog } from "./t.$slug.ordenes";

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
  return "CRITICA";                                              // superó el límite
}

export default function CuentasPorCobrarPage() {
  const user = useRequireAuth();
  const isAuthorized = user?.empleado?.rol === "ADMIN" || user?.empleado?.rol === "SUPERVISOR";
  const navigate = useNavigate();
  const tenantId = user?.tenant?.id || "";

  const { data: cajaAbierta } = useCajaAbierta(tenantId);
  const [dbClientes, setDbClientes] = useState<Cliente[]>([]);
  const [cobrarOrden, setCobrarOrden] = useState<Orden | null>(null);
  const [cobrarCliente, setCobrarCliente] = useState<ClienteDeuda | null>(null);
  const [showPrint, setShowPrint] = useState<Orden | null>(null);
  const [pagoRecibidoParaTicket, setPagoRecibidoParaTicket] = useState<number | undefined>(undefined);
  const [condonarOrden, setCondonarOrden] = useState<Orden | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingLimite, setSavingLimite] = useState(false);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [clientes, setClientes] = useState<ClienteDeuda[]>([]);
  const [search, setSearch] = useState("");
  const [filtroMora, setFiltroMora] = useState<string>("TODOS");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showLimite, setShowLimite] = useState(false);
  const [formatoPrint, setFormatoPrint] = useState<"A4" | "80mm">("A4");
  const [limiteDias, setLimiteDias] = useState<number>(user?.tenant?.limite_credito_dias ?? 30);

  async function guardarLimite(dias: number) {
    setSavingLimite(true);
    try {
      const { error } = await supabase
        .from("tenants")
        .update({ limite_credito_dias: dias })
        .eq("id", tenantId);
      if (error) throw error;
      setLimiteDias(dias);
      setShowLimite(false);
      toast.success(`Límite actualizado a ${dias} días ✅`);
      cargar();
    } catch {
      toast.error("Error al guardar el límite");
    } finally {
      setSavingLimite(false);
    }
  }

  async function cargar() {
    if (!tenantId || tenantId === "__loading__") return;
    setLoading(true);
    try {
      const { data: ordenes, error } = await supabase
        .from("ordenes")
        .select("*, clientes(*)")
        .eq("tenant_id", tenantId)
        .gt("saldo", 0)
        .not("estado", "eq", "ANULADA")
        .order("creado_en", { ascending: true });

      if (error) throw error;

      const map = new Map<string, ClienteDeuda>();
      const allClientsMap = new Map<string, Cliente>();
      for (const o of ordenes || []) {
        const c: Cliente = o.clientes;
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

      setDbClientes(Array.from(allClientsMap.values()));
      setClientes(Array.from(map.values()).sort((a, b) => b.total_deuda - a.total_deuda));
    } catch (err: any) {
      toast.error("Error al cargar cuentas por cobrar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, [tenantId]);

  const filtered = clientes.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${c.cliente_nombre} ${c.cliente_apellido} ${c.cliente_telefono}`.toLowerCase().includes(q);
    const matchMora = filtroMora === "TODOS" || c.estado_mora === filtroMora;
    return matchSearch && matchMora;
  });

  const totalGeneral = filtered.reduce((s, c) => s + c.total_deuda, 0);
  const totalClientes = filtered.length;
  const totalOrdenes = filtered.reduce((s, c) => s + c.ordenes_count, 0);

  const criticas = clientes.filter(c => c.estado_mora === "CRITICA").length;

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
    if (!waConfig?.enabled || !waConfig.api_key) {
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
      const phone = cli.cliente_telefono.replace(/\D/g, "");
      const fullPhone = `+${phone.length === 10 ? "1" + phone : phone}`;
      const base = (waConfig.base_url || "https://wasenderapi.com").replace(/\/$/, "");
      const res = await fetch(`${base}/api/send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waConfig.api_key}` },
        body: JSON.stringify({ to: fullPhone, text: msg, instance_id: waConfig.instance }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(`Recordatorio enviado a ${cli.cliente_nombre} ✅`);
    } catch (e: any) {
      toast.error("Error al enviar: " + e.message);
    } finally {
      setEnviando(null);
    }
  }

  if (!user || tenantId === "__loading__") return null;

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
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print pb-4 border-b border-border/30">
          <div>
            <h1 className="font-display text-3xl tracking-tight md:text-4xl font-bold text-foreground">Cuentas x Cobrar</h1>
            <p className="mt-1 text-sm text-muted-foreground md:text-base">Resumen de facturas a crédito con saldo pendiente.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              onClick={() => navigate({ to: "/t/$slug/caja", params: { slug: user.tenant.slug } })}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 gap-1.5 font-bold"
            >
              <ArrowLeft className="h-4 w-4" /> Volver a Caja
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowLimite(true)}
              className="gap-1.5 border-amber-400/50 text-amber-700 hover:bg-amber-50 font-bold"
            >
              <Timer className="h-4 w-4" />
              Límite: {limiteDias} días
            </Button>
            <Button
              onClick={cargar}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60 gap-1.5 font-bold"
            >
              <RefreshCw className="h-4 w-4" /> Actualizar
            </Button>
            <div className="flex rounded-lg overflow-hidden border border-border">
              {(["A4", "80mm"] as const).map(f => (
                <button key={f} onClick={() => setFormatoPrint(f)}
                  className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1 transition-colors ${
                    formatoPrint === f ? "bg-primary text-white" : "bg-background text-muted-foreground hover:bg-accent"
                  }`}>
                  <FileText className="h-3 w-3" />{f}
                </button>
              ))}
            </div>
            <Button onClick={handlePrint} className="bg-gradient-primary text-white gap-1.5 font-bold">
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card className="p-5 bg-gradient-to-br from-red-500 to-rose-600 text-white">
            <div className="text-xs uppercase text-white/70 font-bold tracking-wider">Total por Cobrar</div>
            <div className="mt-1 font-display text-2xl font-black">{formatRD(totalGeneral)}</div>
            <div className="text-xs text-white/60 mt-1">{totalOrdenes} órdenes pendientes</div>
          </Card>
          <Card className="p-5">
            <div className="text-xs uppercase text-muted-foreground font-bold tracking-wider">Clientes con deuda</div>
            <div className="mt-1 font-display text-2xl font-black">{totalClientes}</div>
            <div className="text-xs text-muted-foreground mt-1">con saldo pendiente</div>
          </Card>
          <Card className={`p-5 ${criticas > 0 ? "border-red-300 bg-red-50/50" : ""}`}>
            <div className="text-xs uppercase text-muted-foreground font-bold tracking-wider">Cuentas Críticas</div>
            <div className={`mt-1 font-display text-2xl font-black ${criticas > 0 ? "text-red-600" : ""}`}>{criticas}</div>
            <div className="text-xs text-muted-foreground mt-1">más de {limiteDias} días</div>
          </Card>
          <Card className="p-5">
            <div className="text-xs uppercase text-muted-foreground font-bold tracking-wider">Promedio por cliente</div>
            <div className="mt-1 font-display text-2xl font-black">{formatRD(totalClientes > 0 ? totalGeneral / totalClientes : 0)}</div>
            <div className="text-xs text-muted-foreground mt-1">deuda promedio</div>
          </Card>
        </div>

        {/* Filtros */}
        <div className="no-print flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente, teléfono..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["TODOS", "AL_DIA", "POR_VENCER", "VENCIDA", "CRITICA"].map(m => (
              <button
                key={m}
                onClick={() => setFiltroMora(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  filtroMora === m ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {m === "TODOS" ? "Todos" : MORA_CONFIG[m as keyof typeof MORA_CONFIG]?.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla principal — pantalla */}
        <div className="no-print space-y-3">
          {loading && (
            <Card className="p-12 text-center text-muted-foreground">
              <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin opacity-40" />
              Cargando cuentas por cobrar...
            </Card>
          )}
          {!loading && filtered.length === 0 && (
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
          {!loading && filtered.map(cli => {
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
                      <div className="text-xs text-muted-foreground">pendiente</div>
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
                            <th className="px-4 py-2.5 text-left">Orden</th>
                            <th className="px-4 py-2.5 text-left">Fecha</th>
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
                                <td className="px-4 py-2.5 font-mono text-xs font-bold">{o.numero}</td>
                                <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(o.creado_en).toLocaleDateString("es-DO")}</td>
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
                            <td colSpan={5} className="px-4 py-2.5 text-right text-sm">Total deuda de {cli.cliente_nombre}:</td>
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

      {/* ===== DIALOG: LÍMITE DE CRÉDITO ===== */}
      <Dialog open={showLimite} onOpenChange={setShowLimite}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-display font-black">
              <div className="bg-amber-100 p-2 rounded-xl">
                <Timer className="h-5 w-5 text-amber-600" />
              </div>
              Límite de Crédito
            </DialogTitle>
            <p className="text-sm text-muted-foreground pt-1">
              Define cuántos días se permite el crédito antes de marcar una cuenta como vencida.
              <br />
              <span className="font-semibold text-foreground">Actual: {limiteDias} días</span>
            </p>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2 py-2">
            {OPCIONES_LIMITE.map(op => (
              <button
                key={op.dias}
                onClick={() => !savingLimite && guardarLimite(op.dias)}
                disabled={savingLimite}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 p-3 transition-all duration-200 ${
                  limiteDias === op.dias
                    ? "border-amber-500 bg-amber-50 scale-105 shadow-md"
                    : "border-border hover:border-amber-400/60 hover:bg-amber-50/50"
                }`}
              >
                <span className={`text-lg font-display font-black ${
                  limiteDias === op.dias ? "text-amber-700" : "text-foreground"
                }`}>{op.dias}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  limiteDias === op.dias ? "text-amber-600" : "text-muted-foreground"
                }`}>{op.label}</span>
                {limiteDias === op.dias && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full" />
                )}
              </button>
            ))}
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            <span className="font-bold">¿Cómo funciona?</span> Las órdenes se clasifican según el porcentaje del límite consumido:
            <ul className="mt-1 space-y-0.5 list-disc list-inside">
              <li><span className="text-emerald-700 font-bold">Al día</span> — primeros 25%</li>
              <li><span className="text-amber-700 font-bold">Por vencer</span> — entre 25% y 75%</li>
              <li><span className="text-orange-700 font-bold">Vencida</span> — entre 75% y 100%</li>
              <li><span className="text-red-700 font-bold">Crítica</span> — superó el límite</li>
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLimite(false)} className="flex-1">Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

interface CobrarDeudaClienteDialogProps {
  cliente: ClienteDeuda;
  onClose: () => void;
  tenantId: string;
  cajaAbierta: any;
  queryClient: any;
  onSuccess: () => void;
}

export function CobrarDeudaClienteDialog({ cliente, onClose, tenantId, cajaAbierta, queryClient, onSuccess }: CobrarDeudaClienteDialogProps) {
  const [metodo, setMetodo] = useState<MetodoPago>("EFECTIVO");
  const [recibido, setRecibido] = useState<number>(cliente.total_deuda);
  const [loading, setLoading] = useState<boolean>(false);

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

      // Ordenar las órdenes del cliente por fecha de creación (FIFO)
      const sortedOrdenes = [...cliente.ordenes].sort((a, b) => new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime());

      for (const o of sortedOrdenes) {
        if (restante <= 0) break;
        const totalCobrarOrden = o.saldo;
        const montoAPagarOrden = Math.min(restante, totalCobrarOrden);
        if (montoAPagarOrden <= 0) continue;

        const nuevoPagado = Number((o.pagado + montoAPagarOrden).toFixed(2));
        const nuevoSaldo = Number((totalCobrarOrden - montoAPagarOrden).toFixed(2));
        const nuevoEstado: EstadoOrden = o.estado === "ENTREGADA" 
          ? "ENTREGADA" 
          : (nuevoSaldo === 0 ? "PAGADA" : o.estado);

        // Guardar la orden con los saldos actualizados
        await saveOrden({
          ...o,
          pagado: nuevoPagado,
          saldo: nuevoSaldo,
          estado: nuevoEstado,
          metodo_pago: o.pagado > 0 ? "MIXTO" : metodo
        });

        // Registrar el movimiento de entrada en caja para esta orden
        await saveMovimiento({
          id: uid("mov"),
          tenant_id: tenantId,
          caja_id: cajaAbierta.id,
          empleado_id: o.empleado_id,
          tipo: nuevoSaldo === 0 ? "VENTA" : "ABONO",
          concepto: nuevoSaldo === 0
            ? `Cobro de saldo orden #${o.numero} desde Cobrar Todo`
            : `Abono a orden #${o.numero} desde Cobrar Todo (Saldo restante: ${formatRD(nuevoSaldo)})`,
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
                  { id: "EFECTIVO", label: "Efectivo", icon: "💵" },
                  { id: "TARJETA", label: "Tarjeta", icon: "💳" },
                  { id: "TRANSFERENCIA", label: "Transf.", icon: "🏦" }
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setMetodo(m.id as MetodoPago);
                      if (m.id !== "EFECTIVO" && recibido > cliente.total_deuda) {
                        setRecibido(cliente.total_deuda);
                      }
                    }}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border-2 transition-all duration-200 active:scale-95 ${
                      metodo === m.id
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm"
                        : "border-border hover:border-emerald-500/40 hover:bg-emerald-50/20 text-muted-foreground"
                    }`}
                  >
                    <span className="text-lg mb-0.5">{m.icon}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider">{m.label}</span>
                  </button>
                ))}
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

            {metodo === "EFECTIVO" && recibido > cliente.total_deuda && (
              <div className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
                <span className="font-medium text-slate-500">Vuelto a entregar:</span>
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
