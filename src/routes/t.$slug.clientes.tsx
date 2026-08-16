import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Search, UserPlus, Phone, Mail, MapPin, Trash2, Users, Download, Printer, FileSpreadsheet } from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { createPortal } from "react-dom";
import { exportToCsv } from "@/lib/export";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  getClientes, saveCliente, deleteCliente, getOrdenes, formatRD, formatPhoneRD, uid,
  type Cliente,
} from "@/lib/storage";
import { toast } from "sonner";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";

import { ClienteDialog } from "@/components/klynn/ClienteDialog";
import { useClientes, useOrdenes } from "@/hooks/use-queries";

export const Route = createFileRoute("/t/$slug/clientes")({ component: ClientesPage });

function ClientesPage() {
  const user = useRequireAuth();
  const tenantId = user?.tenant?.id || '';

  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Cliente | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const { data: clientes = [], isLoading: loadingClientes } = useClientes(tenantId);
  const { data: ordenes = [], isLoading: loadingOrdenes } = useOrdenes(tenantId);

  const tenant = user?.tenant;

  const loading = loadingClientes || loadingOrdenes;

  const filt = useMemo(() => clientes.filter((c) => c.nombre.toLowerCase().includes(q.toLowerCase()) || c.telefono.includes(q)), [clientes, q]);

  const deudaCliente = (id: string) => {
    return ordenes.filter((o) => o.cliente_id === id && o.estado !== "ANULADA").reduce((s, o) => s + o.saldo, 0);
  };
  const totalGastado = (id: string) => {
    return ordenes.filter((o) => o.cliente_id === id && o.estado !== "ANULADA").reduce((s, o) => s + o.total, 0);
  };

  const exportData = useMemo(() => {
    return {
      filename: "Clientes",
      columns: ["Nombre", "Teléfono", "Email", "Dirección", "Tipo", "Total Gastado", "Deuda Actual"],
      data: filt.map(c => [
        `${c.nombre} ${c.apellido || ""}`,
        c.telefono,
        c.email || "—",
        c.direccion || "—",
        c.tipo,
        formatRD(totalGastado(c.id)),
        formatRD(deudaCliente(c.id))
      ])
    };
  }, [filt, ordenes]);

  if (!user || user.tenant.id === '__loading__') return null;

  return (
    <div>
      <PageHeader title="Clientes" description={`${clientes.length} clientes registrados`}>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2 bg-slate-800 text-white hover:bg-slate-900 shadow-sm border-0 transition-all duration-200 active:scale-95">
                <Download className="h-4 w-4" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-elegant">
              <DropdownMenuItem 
                className="gap-2 cursor-pointer py-2 rounded-lg" 
                onClick={() => exportToCsv(exportData.filename, exportData.columns, exportData.data)}
              >
                <FileSpreadsheet className="h-4 w-4 text-green-600" /> Excel (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="gap-2 cursor-pointer py-2 rounded-lg" 
                onClick={() => setIsPrinting(true)}
              >
                <Printer className="h-4 w-4 text-red-600" /> PDF / Impresión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm border-0 transition-all duration-200 active:scale-95" 
            onClick={() => setIsPrinting(true)}
          >
            <Printer className="h-4 w-4" /> Imprimir
          </Button>

          <Button onClick={() => setShowNew(true)} className="bg-gradient-primary text-white transition-all duration-200 active:scale-95">
            <UserPlus className="mr-1.5 h-4 w-4" /> Nuevo cliente
          </Button>
        </div>
      </PageHeader>

      <Card className="mb-4 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o teléfono..." className="pl-10" />
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filt.map((c) => {
          const deuda = deudaCliente(c.id);
          const total = totalGastado(c.id);
          return (
            <Card key={c.id} className="cursor-pointer p-5 transition hover:shadow-elegant flex flex-col h-full" onClick={() => setEdit(c)}>
              <div className="flex items-start justify-between gap-3 flex-1">
                <div className="min-w-0 flex-1">
                  <div className="font-display text-lg font-bold text-foreground line-clamp-2 leading-tight" title={`${c.nombre} ${c.apellido || ""}`.trim()}>
                    {c.nombre} {c.apellido || ""}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3 shrink-0" /> <span className="truncate">{formatPhoneRD(c.telefono) || c.telefono}</span>
                  </div>
                  {c.email && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3 shrink-0" /> <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.direccion && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{c.direccion}</span>
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  {c.tipo === "Empresa" ? (
                    <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-600 whitespace-nowrap">Empresa</Badge>
                  ) : (
                    <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 whitespace-nowrap">Consumidor Final</Badge>
                  )}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs shrink-0">
                <div>
                  <div className="text-muted-foreground font-normal">Total gastado</div>
                  <div className="font-display text-base font-bold text-foreground">{formatRD(total)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground font-normal">Deuda</div>
                  <div className={`font-display text-base font-bold ${deuda > 0 ? "text-destructive" : "text-foreground"}`}>
                    {formatRD(deuda)}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
        {filt.length === 0 && (
          <Card className="col-span-full p-12 text-center border border-dashed border-border/60 bg-surface/30 backdrop-blur-md rounded-2xl py-16 flex flex-col items-center justify-center">
            <div className="rounded-2xl bg-blue-50 p-4 mb-4 text-blue-600 shadow-sm">
              <Users className="h-10 w-10" />
            </div>
            <h3 className="font-display text-xl font-bold text-foreground">¡Aún no hay clientes!</h3>
            <p className="text-sm text-muted-foreground max-w-md mt-2 leading-relaxed">
              Registra a tus clientes recurrentes para llevar el control de sus pedidos, saldos y recordatorios de pago de forma organizada.
            </p>
            <Button onClick={() => setShowNew(true)} className="mt-6 bg-gradient-primary text-white font-bold transition-all duration-200 active:scale-95 shadow-md">
              <UserPlus className="mr-1.5 h-4 w-4" /> Registrar primer cliente
            </Button>
          </Card>
        )}
      </div>
 
      <ClienteDialog 
        open={showNew || !!edit} 
        onOpenChange={(o) => { if (!o) { setShowNew(false); setEdit(null); } }} 
        cliente={edit} 
        tenant={tenant} 
        onDone={() => { setEdit(null); setShowNew(false); }} 
      />

      {isPrinting && (
        <ClientesPrintPortal 
          tenant={user.tenant}
          clientes={filt}
          deudaCliente={deudaCliente}
          totalGastado={totalGastado}
          onClose={() => setIsPrinting(false)}
        />
      )}
    </div>
  );
}

function ClientesPrintPortal({
  tenant,
  clientes,
  deudaCliente,
  totalGastado,
  onClose
}: {
  tenant: any;
  clientes: any[];
  deudaCliente: (id: string) => number;
  totalGastado: (id: string) => number;
  onClose: () => void;
}) {
  const totalDeudaGlobal = clientes.reduce((acc, curr) => acc + deudaCliente(curr.id), 0);
  const totalVentasGlobal = clientes.reduce((acc, curr) => acc + totalGastado(curr.id), 0);

  return createPortal(
    <div className="fixed inset-0 bg-white z-[99999] overflow-y-auto pointer-events-auto atomic-print-target text-slate-800">
      <div className="max-w-4xl mx-auto p-8 print:p-12 print:max-w-4xl print:mx-auto">
        {/* Controles de impresión (ocultos al imprimir) */}
        <div className="flex justify-between items-center border-b-2 border-primary/20 pb-6 mb-8 print:hidden relative z-[100000]">
          <Button variant="outline" onClick={onClose} className="gap-2 cursor-pointer">
            Cerrar Reporte
          </Button>
          <Button onClick={() => window.print()} className="bg-primary text-white gap-2 cursor-pointer">
            <Printer className="h-4 w-4" /> Imprimir / Guardar PDF
          </Button>
        </div>

        <div className="print-area">
          {/* Encabezado */}
          <div className="flex justify-between items-start mb-10 pb-6 border-b border-slate-200">
            <div>
              {tenant.logo_url ? (
                <img src={tenant.logo_url} alt={tenant.nombre} className="h-16 object-contain mb-4" />
              ) : (
                <h1 className="text-4xl font-display font-black text-primary uppercase tracking-tighter mb-1">{tenant.nombre}</h1>
              )}
              <div className="text-sm font-bold text-slate-500 uppercase">
                {tenant.rnc ? `RNC: ${tenant.rnc}` : "Sin RNC Configurado"}
              </div>
              <div className="text-xs text-slate-500 max-w-sm mt-1">{tenant.direccion}</div>
              <div className="text-xs text-slate-500">Tel: {tenant.telefono} | {tenant.email}</div>
            </div>

            <div className="text-right">
              <h2 className="text-2xl font-display font-black uppercase text-slate-900 mb-1">
                Reporte de Clientes
              </h2>
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
                CATÁLOGO DE CLIENTES Y CRÉDITOS
              </div>
              <div className="text-xs text-slate-600">
                <span className="font-bold">Generado:</span> {new Date().toLocaleString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}
              </div>
            </div>
          </div>

          {/* Sección 1: KPIs Rápidos */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total de Clientes</div>
              <div className="text-xl font-bold text-slate-800">{clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'}</div>
              <div className="text-[8px] text-slate-400 mt-0.5">En el catálogo actual</div>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cartera de Deuda Total</div>
              <div className="text-xl font-bold text-rose-600">{formatRD(totalDeudaGlobal)}</div>
              <div className="text-[8px] text-slate-400 mt-0.5">Suma de cuentas por cobrar</div>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Volumen de Consumo</div>
              <div className="text-xl font-bold text-emerald-600">{formatRD(totalVentasGlobal)}</div>
              <div className="text-[8px] text-slate-400 mt-0.5">Historial total facturado</div>
            </div>
          </div>

          {/* Sección 2: Tabla de Datos */}
          <div className="border border-slate-200 rounded-xl overflow-hidden mb-8">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Nombre / Cliente</th>
                  <th className="py-3 px-4">Teléfono</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Dirección</th>
                  <th className="py-3 px-4 text-center">Tipo</th>
                  <th className="py-3 px-4 text-right">Consumo Histórico</th>
                  <th className="py-3 px-4 text-right">Deuda Pendiente</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c, i) => {
                  const deuda = deudaCliente(c.id);
                  const total = totalGastado(c.id);
                  return (
                    <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-bold text-slate-850">
                        {c.nombre} {c.apellido || ""}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">{c.telefono || "—"}</td>
                      <td className="py-2.5 px-4 text-slate-500">{c.email || "—"}</td>
                      <td className="py-2.5 px-4 text-slate-500">{c.direccion || "—"}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-black uppercase border ${
                          c.tipo === 'Empresa' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {c.tipo === 'Empresa' ? 'Empresa' : 'Consumidor'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-slate-700">{formatRD(total)}</td>
                      <td className={`py-2.5 px-4 text-right font-bold ${deuda > 0 ? "text-rose-600" : "text-slate-500"}`}>{formatRD(deuda)}</td>
                    </tr>
                  );
                })}

                {clientes.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 italic">
                      No hay clientes registrados que coincidan con la búsqueda
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pie de página */}
          <div className="flex justify-between items-end border-t border-slate-200 pt-6 mt-12">
            <div className="text-left text-[9px] text-slate-400 italic leading-relaxed max-w-sm">
              Este reporte fue generado de forma automática y es propiedad confidencial.
            </div>
            <div className="text-right text-[10px] font-bold text-slate-500">
              Klynn POS Software
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: portrait; margin: 15mm; }
          html, body { overflow: visible !important; height: auto !important; background: white !important; }
          body > *:not(.atomic-print-target) { display: none !important; }
          .atomic-print-target { 
            display: block !important; 
            visibility: visible !important; 
            position: static !important; 
            width: 100% !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-area { visibility: visible !important; display: block !important; }
          .no-print { display: none !important; }
        }
      `}} />
    </div>,
    document.body
  );
}
