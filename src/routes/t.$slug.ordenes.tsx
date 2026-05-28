import { createFileRoute } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, Printer, Eye, XCircle, MessageCircle, DownloadCloud, MoreVertical, ArrowUpCircle, FileText, Download, FileSpreadsheet } from "lucide-react";
import { notificarWhatsApp } from "@/lib/whatsapp";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { exportToCsv } from "@/lib/export";
import { EstadoBadge } from "@/components/klynn/TenantShell";
import { Ticket } from "@/components/klynn/Ticket";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  getOrdenes, saveOrden, getClientes, getEmpleadoById, formatRD, formatDateRD, formatDateTimeRD, getServicios,
  type Orden, type EstadoOrden,
  checkPlanLimits, getCajaAbierta, saveMovimiento, uid, nextECFNumero, saveECFDocument
} from "@/lib/storage";
import { emitirECF, getECFConfig } from "@/lib/fiscal";
import { toast } from "sonner";
import { AlertTriangle, Rocket } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { useOrdenes, useClientes, useCajaAbierta, useEmpleados, useServicios } from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/t/$slug/ordenes")({
  component: OrdenesPage,
});

function OrdenesPage() {
  const user = useRequireAuth();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoOrden | "todos">("todos");
  const [view, setView] = useState<Orden | null>(null);
  const [anular, setAnular] = useState<Orden | null>(null);
  const [motivoAnular, setMotivoAnular] = useState("");
  const [codigoAnular, setCodigoAnular] = useState("01");
  const [debito, setDebito] = useState<Orden | null>(null);
  const [montoDebito, setMontoDebito] = useState(0);
  const [motivoDebito, setMotivoDebito] = useState("");
  const [showPrint, setShowPrint] = useState<Orden | null>(null);
  const [showDownloadA4, setShowDownloadA4] = useState<Orden | null>(null);
  const [isPrintingList, setIsPrintingList] = useState(false);
  const navigate = useNavigate();

  const tenant = user?.tenant;
  const tenantId = tenant?.id || '';

  const { data: ordenes = [], isLoading: loadingOrdenes } = useOrdenes(tenantId);
  const { data: clientes = [], isLoading: loadingClientes } = useClientes(tenantId);
  const { data: cajaAbierta, isLoading: loadingCaja } = useCajaAbierta(tenantId);
  const { data: empleados = [] } = useEmpleados(tenantId);
  const { data: servicios = [] } = useServicios(tenantId);

  const [limits, setLimits] = useState<any>({ orderLimit: null, orderCount: 0, ordersReached: false });
  const [loadingLimits, setLoadingLimits] = useState(false);

  useEffect(() => {
    if (!tenantId || tenantId === '__loading__') return;
    setLoadingLimits(true);
    checkPlanLimits(tenant).then(lim => {
      setLimits(lim);
      setLoadingLimits(false);
    });
  }, [tenantId, ordenes.length]);

  const loading = loadingOrdenes || loadingClientes || loadingCaja;

  const filt = useMemo(() => {
    return ordenes.filter((o) => {
      if (filtroEstado !== "todos" && o.estado !== filtroEstado) return false;
      if (!q) return true;
      const c = clientes.find((x) => x.id === o.cliente_id);
      return o.numero.toLowerCase().includes(q.toLowerCase()) || c?.nombre.toLowerCase().includes(q.toLowerCase());
    }).sort((a, b) => +new Date(b.creado_en) - +new Date(a.creado_en));
  }, [ordenes, clientes, filtroEstado, q]);

  const exportData = useMemo(() => {
    return {
      filename: "Ordenes",
      columns: ["Número", "Cliente", "Estado", "Total", "Saldo", "Pago", "Fecha"],
      data: filt.map(o => [
        o.numero, 
        clientes.find(c => c.id === o.cliente_id)?.nombre || "—",
        o.estado,
        formatRD(o.total),
        formatRD(o.saldo),
        o.metodo_pago,
        formatDateTimeRD(o.creado_en)
      ])
    };
  }, [filt, clientes]);

  if (!user || user.tenant.id === '__loading__') return null;

  async function cambiarEstado(o: Orden, estado: EstadoOrden) {
    try {
      await saveOrden({ ...o, estado });
      queryClient.invalidateQueries({ queryKey: ['ordenes', tenantId] });
      toast.success(`Estado actualizado: ${estado} ✨`);
      if (estado === "LISTA" || estado === "ENTREGADA") {
        const cli = clientes.find((c) => c.id === o.cliente_id);
        if (cli) {
          notificarWhatsApp(tenant, cli, o, estado === "LISTA" ? "lista" : "entregada").then((r) => {
            if (r.ok) toast.success("WhatsApp enviado al cliente ✅");
          });
        }
      }
    } catch (err: any) {
      toast.error("Error al actualizar estado");
    }
  }

  async function anularOrden() {
    if (!anular || motivoAnular.length < 5) { toast.error("Indica el motivo (mín 5 caracteres)"); return; }
    
    try {
      let notaCreditoNCF = "";
      
      // 1. Generar Nota de Crédito (E34) si la orden tenía NCF electrónico
      if (anular.tipo_ecf && anular.ncf) {
        try {
          const cfg = await getECFConfig(tenant.id);
          if (cfg?.is_active && cfg.pronesoft_tenant_id) {
            const cliente = clientes.find(c => c.id === anular.cliente_id) || null;
            const res = await emitirECF(
              anular,
              cliente,
              cfg.pronesoft_tenant_id,
              cfg,
              tenant,
              "E34", // Tipo: Nota de Crédito
              {
                ncf: anular.ncf,
                date: anular.creado_en,
                code: codigoAnular // 01=Anulación total, etc.
              }
            );
            notaCreditoNCF = res.encf;
            toast.info(`Nota de Crédito emitida: ${notaCreditoNCF} 📄`);
          } else {
            // Modo offline/local
            notaCreditoNCF = await nextECFNumero(tenant.id, "E34");
            await saveECFDocument({
              id: uid("ecf"),
              tenant_id: tenant.id,
              order_id: anular.id,
              encf: notaCreditoNCF,
              tipo_ecf: "E34",
              rnc_receptor: clientes.find(c => c.id === anular.cliente_id)?.cedula,
              status: "accepted",
              monto_total: anular.total,
              monto_itbis: anular.itbis,
              fecha_emision: new Date().toISOString(),
              xml_content: "ANULACION_LOCAL",
            });
            toast.info(`Nota de Crédito local: ${notaCreditoNCF} 📄`);
          }
        } catch (e: any) {
          console.error("Error fiscal:", e);
          toast.warning("No se pudo emitir la Nota de Crédito. Se anulará localmente.");
        }
      }

      // 2. Actualizar orden
      const ordenAnulada: Orden = { 
        ...anular, 
        estado: "ANULADA", 
        motivo_anulacion: motivoAnular,
        motivo_anulacion_codigo: codigoAnular,
        nota_credito_ncf: notaCreditoNCF || undefined
      };
      
      await saveOrden(ordenAnulada);
      
      // 3. Registrar egreso automático si hubo pago y hay caja abierta
      if (anular.pagado > 0 && cajaAbierta) {
        await saveMovimiento({
          id: uid("mov"),
          tenant_id: tenant.id,
          caja_id: cajaAbierta.id,
          empleado_id: user.empleado.id,
          tipo: "EGRESO",
          concepto: `Reembolso: Anulación ${anular.numero}`,
          monto: anular.pagado,
          metodo: anular.metodo_pago,
          orden_id: anular.id,
          creado_en: new Date().toISOString(),
        });
        toast.info(`Se registró un egreso de ${formatRD(anular.pagado)} en caja por el reembolso. 💸`);
      }

      setAnular(null); 
      setMotivoAnular(""); 
      queryClient.invalidateQueries({ queryKey: ['ordenes', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['movimientos', tenantId] });
      
      // ACTIVAR MODAL DE IMPRESIÓN AUTOMÁTICAMENTE
      setShowPrint(ordenAnulada);
      
      toast.success("Orden anulada correctamente ✓");
    } catch (err: any) {
      console.error("DEBUG: Error en anularOrden:", err);
      toast.error("Error al anular orden. Asegúrate de haber ejecutado el script SQL para añadir las nuevas columnas.");
    }
  }

  async function generarNotaDebito() {
    if (!debito) return;
    try {
      const isECF = debito.ncf?.startsWith("E");
      let notaDebitoNCF = "";
      let notaDebitoID = "";

      if (isECF) {
        try {
          const cfg = await getECFConfig(tenant.id);
          if (cfg?.is_active && cfg.pronesoft_tenant_id) {
            const cliente = clientes.find(c => c.id === debito.cliente_id) || null;
            // Clonamos la orden para ajustar el total de la ND
            const ordenND = { ...debito, total: montoDebito, subtotal: montoDebito, itbis: 0 };
            const res = await emitirECF(
              ordenND,
              cliente,
              cfg.pronesoft_tenant_id,
              cfg,
              tenant,
              "E33", // Nota de Débito
              {
                ncf: debito.ncf!,
                date: debito.creado_en,
                code: "03" // 03 = Ajuste de precio
              }
            );
            notaDebitoNCF = res.encf;
            notaDebitoID = res.document.id;
          } else {
            const next = await nextECFNumero(tenant.id, "33"); // E33
            if (next) {
              notaDebitoNCF = next.ncf;
              notaDebitoID = uid("ecf");
              await saveECFDocument({
                id: notaDebitoID,
                tenant_id: tenant.id,
                tipo: "33",
                ncf: notaDebitoNCF,
                monto_total: montoDebito,
                rnc_receptor: clientes.find(c => c.id === debito.cliente_id)?.cedula || "",
                fecha_emision: new Date().toISOString(),
                estado: "ACEPTADO",
                ncf_modificado: debito.ncf
              });
            }
          }
        } catch (e: any) {
          console.error("Error ND Fiscal:", e);
          toast.error("Error al emitir Nota de Débito fiscal.");
          return;
        }
      }

      const ordenActualizada: Orden = {
        ...debito,
        total: debito.total + montoDebito,
        saldo: debito.saldo + montoDebito,
        nota_debito_ncf: notaDebitoNCF || undefined,
        nota_debito_id: notaDebitoID || undefined,
        nota_debito_monto: montoDebito
      };

      await saveOrden(ordenActualizada);
      
      setDebito(null);
      setMontoDebito(0);
      setMotivoDebito("");
      queryClient.invalidateQueries({ queryKey: ['ordenes', tenantId] });
      setShowPrint(ordenActualizada);
      
      toast.success("Nota de Débito generada correctamente ✓");
    } catch (err) {
      console.error("Error ND:", err);
      toast.error("Error al generar Nota de Débito");
    }
  }

  return (
    <div>
      <PageHeader title="Órdenes" description={`${ordenes.length} órdenes registradas`}>
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
                onClick={() => setIsPrintingList(true)}
              >
                <Printer className="h-4 w-4 text-red-600" /> PDF / Impresión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm border-0 transition-all duration-200 active:scale-95" 
            onClick={() => setIsPrintingList(true)}
          >
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
        </div>
      </PageHeader>

      {limits.orderLimit !== null && (
        <Card className={`mb-4 border-none shadow-sm overflow-hidden ${limits.ordersReached ? "bg-destructive/5" : "bg-primary/5"}`}>
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 gap-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${limits.ordersReached ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                {limits.ordersReached ? <AlertTriangle className="h-5 w-5" /> : <Rocket className="h-5 w-5" />}
              </div>
              <div>
                <div className="text-sm font-bold">
                  {limits.ordersReached 
                    ? "Has alcanzado el límite de órdenes de tu plan" 
                    : `Uso del plan: ${limits.orderCount} de ${limits.orderLimit} órdenes este mes`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {limits.ordersReached 
                    ? "Actualiza tu plan para seguir registrando nuevas órdenes." 
                    : "Llevas un buen ritmo, considera cambiar de Plan si creces más."}
                </div>
              </div>
            </div>
            <Button 
              className="bg-gradient-primary text-white h-9 px-5 font-bold shrink-0 shadow-sm border-0 transition-all active:scale-95"
              onClick={() => navigate({ to: "/t/$slug/configuracion", params: { slug: tenant.slug }, search: { tab: "plan" } as any })}
            >
              🚀 Ver planes
            </Button>
          </div>

        </Card>
      )}

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por número o cliente..." className="pl-10" />
        </div>
        <Select value={filtroEstado} onValueChange={(v: any) => setFiltroEstado(v)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="RECIBIDA">Recibida</SelectItem>
            <SelectItem value="EN_PROCESO">En proceso</SelectItem>
            <SelectItem value="LISTA">Lista</SelectItem>
            <SelectItem value="ENTREGADA">Entregada</SelectItem>
            <SelectItem value="ANULADA">Anulada</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-elevated text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Número</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Total</th>
                <th className="px-4 py-3 text-center">Saldo</th>
                <th className="px-4 py-3 text-center">Pago</th>
                <th className="px-4 py-3 text-center">Fecha</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filt.map((o) => {
                const c = clientes.find((x) => x.id === o.cliente_id);
                return (
                  <tr key={o.id} className="border-b border-border/50 hover:bg-accent/30">
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{o.numero}</td>
                    <td className="px-4 py-3">
                      <div className="max-w-[200px] truncate" title={c?.nombre || ""}>
                        {c?.nombre || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center"><EstadoBadge estado={o.estado} /></td>
                    <td className="px-4 py-3 text-center font-medium">{formatRD(o.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center">
                        {o.saldo > 0 ? <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning-foreground">{formatRD(o.saldo)}</Badge> : <span className="text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-xs">{o.metodo_pago}</td>
                    <td className="px-4 py-3 text-center text-xs text-muted-foreground">{formatDateTimeRD(o.creado_en)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Acciones de Orden</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem onClick={() => setView(o)}>
                              <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem onClick={() => setShowPrint(o)}>
                              <Printer className="mr-2 h-4 w-4" /> Imprimir Ticket
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem onClick={() => setShowDownloadA4(o)}>
                              <DownloadCloud className="mr-2 h-4 w-4" /> Ver Factura A4
                            </DropdownMenuItem>
 
                            {o.estado !== "ANULADA" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setDebito(o)}>
                                  <ArrowUpCircle className="mr-2 h-4 w-4 text-blue-600" /> Nota de Débito
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setAnular(o)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                  <XCircle className="mr-2 h-4 w-4" /> Anular Orden
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filt.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center py-10 max-w-md mx-auto px-4">
                      <div className="rounded-2xl bg-primary/10 p-4 mb-4 text-primary shadow-sm">
                        <FileText className="h-10 w-10" />
                      </div>
                      <h3 className="font-display text-lg font-bold text-foreground">¡No hay órdenes registradas!</h3>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                        Aquí verás las órdenes de servicios de lavandería creadas por tus operadores, su estado de lavado, entrega y pago en tiempo real.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Vista detalle */}
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {view && (
            <OrderDetail 
              view={view} 
              tenant={tenant} 
              clientes={clientes} 
              empleados={empleados}
              cambiarEstado={cambiarEstado} 
              setView={setView} 
              onPrint={() => setShowPrint(view)}
            />
          )}
        </DialogContent>
      </Dialog>

      {showPrint && (
        <TicketPrintPortal 
          orden={showPrint} 
          tenant={tenant} 
          clientes={clientes}
          empleados={empleados}
          onClose={() => setShowPrint(null)} 
        />
      )}

      {showDownloadA4 && (
        <FacturaA4PrintPortal
          orden={showDownloadA4}
          tenant={tenant}
          clientes={clientes}
          empleados={empleados}
          onClose={() => setShowDownloadA4(null)}
        />
      )}

      {/* Anular */}
      <Dialog open={!!anular} onOpenChange={(o) => !o && setAnular(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular {anular?.numero}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold mb-1.5 block">Tipo de Modificación (DGII)</label>
              <Select value={codigoAnular} onValueChange={setCodigoAnular}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccione código" />
                </SelectTrigger>
                <SelectContent align="start" sideOffset={4}>
                  <SelectItem value="01">01 - Anulación Total</SelectItem>
                  <SelectItem value="02">02 - Anulación Parcial</SelectItem>
                  <SelectItem value="03">03 - Descuento o Bonificación</SelectItem>
                  <SelectItem value="04">04 - Devolución de Mercancía</SelectItem>
                  <SelectItem value="05">05 - Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-bold mb-1.5 block">Motivo descriptivo</label>
              <Input value={motivoAnular} onChange={(e) => setMotivoAnular(e.target.value)} placeholder="Ej: Error en el monto digitado" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnular(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={anularOrden}>Anular orden</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nota de Débito */}
      <Dialog open={!!debito} onOpenChange={(o) => !o && setDebito(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-blue-600" />
              Generar Nota de Débito
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 border border-blue-100">
              Esta acción generará un <b>e-NCF E33</b> y aumentará el total de la orden #{debito?.numero}.
            </div>
            <div>
              <label className="text-sm font-bold mb-1.5 block">Monto a adicionar (RD$)</label>
              <Input 
                type="number" 
                value={montoDebito} 
                onChange={(e) => setMontoDebito(Number(e.target.value))} 
                placeholder="0.00" 
                className="text-lg font-bold"
              />
            </div>
            <div>
              <label className="text-sm font-bold mb-1.5 block">Concepto / Motivo</label>
              <Input 
                value={motivoDebito} 
                onChange={(e) => setMotivoDebito(e.target.value)} 
                placeholder="Ej: Ajuste por servicio adicional" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDebito(null)}>Cancelar</Button>
            <Button onClick={generarNotaDebito} disabled={montoDebito <= 0}>Generar Nota de Débito</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isPrintingList && (
        <OrdenesPrintPortal
          tenant={user.tenant}
          ordenes={filt}
          clientes={clientes}
          onClose={() => setIsPrintingList(false)}
        />
      )}
    </div>
  );
}

function OrderDetail({ view, tenant, clientes, empleados, cambiarEstado, setView, onPrint }: { 
  view: Orden; tenant: any; clientes: any[]; empleados: any[]; cambiarEstado: any; setView: any; onPrint: () => void;
}) {
  const [empleadoView, setEmpleadoView] = useState<any>(null);
  const [srvList, setSrvList] = useState<any[]>([]);
  
  useEffect(() => {
    if (view) {
      getEmpleadoById(view.empleado_id)
        .then(res => setEmpleadoView(res))
        .catch(() => setEmpleadoView(null));
      getServicios(tenant.id).then(setSrvList);
    }
  }, [view, tenant.id]);

  const c = clientes.find((x) => x.id === view?.cliente_id) || { nombre: "Consumidor", apellido: "Final", cedula: "", telefono: "" };
  const emp = empleadoView || empleados.find((e) => e.id === view?.empleado_id) || { nombre: "Personal" };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Orden {view.numero}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-6 md:grid-cols-2 items-start">
        <div className="space-y-2 text-sm">
          <div><strong>Cliente:</strong> {c.nombre} {c.apellido || ""}</div>
          {c.telefono && c.telefono !== "---" && <div><strong>Tel:</strong> {c.telefono}</div>}
          <div><strong>Estado:</strong> <EstadoBadge estado={view.estado} /></div>
          <div><strong>Total:</strong> {formatRD(view.total)}</div>
          <div><strong>Pagado:</strong> {formatRD(view.pagado)}</div>
          {view.saldo > 0 && <div className="text-warning-foreground"><strong>Saldo:</strong> {formatRD(view.saldo)}</div>}
          <div><strong>Atendido por:</strong> {emp.nombre}</div>
          {view.motivo_anulacion && <div className="rounded-md bg-destructive/10 p-2 text-destructive"><strong>Motivo anulación:</strong> {view.motivo_anulacion}</div>}

          {/* Datos Fiscales */}
          {view.ncf && (
            <div className="mt-2 rounded-xl border border-primary/20 bg-primary/5 p-3 flex justify-between items-center gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="text-xs font-bold uppercase tracking-wider text-primary mb-1">Datos Fiscales</div>
                <div className="text-sm">
                  <strong>{view.ncf.startsWith("E") ? "e-NCF:" : "NCF:"}</strong> <span className="font-mono">{view.ncf}</span>
                  {view.ncf_vencimiento && (
                    <div className="text-[11px] font-bold mt-0.5">Fecha Vencimiento: {formatDateRD(view.ncf_vencimiento)}</div>
                  )}
                </div>
                {view.ecf_security_code && view.ecf_security_code !== "null" && (
                  <div className="text-xs"><strong>Cod. Seguridad:</strong> <span className="font-mono">{view.ecf_security_code}</span></div>
                )}
                {view.ecf_signature_date && view.ecf_signature_date !== "null" && (
                  <div className="text-[11px] text-muted-foreground italic"><strong>Firma:</strong> {formatDateTimeRD(view.ecf_signature_date)}</div>
                )}
              </div>
              {view.ncf.startsWith("E") && (
                <div className="bg-white p-1.5 rounded-lg shadow-sm border border-primary/10 shrink-0">
                  <QRCodeSVG 
                    value={view.ecf_qr || `https://dgii.gov.do/consulta_ecf?RNC_EMISOR=${tenant.rnc}&E_NCF=${view.ncf}&MONTO_TOTAL=${view.total}&FECHA_EMISION=${new Date(view.creado_en).toLocaleDateString('en-GB').replace(/\//g, '')}`} 
                    size={75} 
                    level="M" 
                  />
                </div>
              )}
            </div>
          )}

          <div className="pt-2">
            <div className="mb-2 text-xs uppercase text-muted-foreground">Cambiar estado</div>
            <div className="flex flex-wrap gap-1.5">
              {(["RECIBIDA", "EN_PROCESO", "LISTA", "ENTREGADA"] as EstadoOrden[]).map((s) => (
                <Button key={s} size="sm" variant={view.estado === s ? "default" : "outline"} onClick={() => { cambiarEstado(view, s); setView({ ...view, estado: s }); }}>{s.replace("_", " ")}</Button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" onClick={() => {
              if (!c.telefono) { toast.error("El cliente no tiene teléfono"); return; }
              const promise = notificarWhatsApp(tenant, c, view, "creada", view.pagado);
              toast.promise(promise, {
                loading: "Enviando recibo por WhatsApp...",
                success: (r) => r.ok ? "¡Recibo enviado exitosamente! ✅" : `Fallo al enviar: ${r.reason}`,
                error: "Error inesperado al enviar WhatsApp",
              });
            }}>
              <MessageCircle className="mr-1.5 h-4 w-4" /> Enviar WhatsApp
            </Button>
            <Button className="flex-1 bg-gradient-primary text-white" onClick={onPrint}>
              <Printer className="mr-1.5 h-4 w-4" /> Imprimir
            </Button>
          </div>
        </div>
        <div className="max-h-[500px] overflow-auto rounded-xl bg-zinc-100 p-4 shadow-inner dark:bg-zinc-800/50">
          <Ticket orden={view} tenant={tenant} empleado={emp} cliente={c} formato={tenant.config!.formato_ticket} serviciosList={srvList} />
        </div>
      </div>
    </>
  );
}

function TicketPrintPortal({ orden, tenant, clientes, empleados, onClose }: { orden: Orden; tenant: any; clientes: any[]; empleados: any[]; onClose: () => void }) {
  const [emp, setEmp] = useState<any>(null);
  const [cli, setCli] = useState<any>(null);
  const [srvList, setSrvList] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      getEmpleadoById(orden.empleado_id).catch(() => null),
      Promise.resolve(clientes.find(c => c.id === orden.cliente_id)),
      getServicios(tenant.id)
    ]).then(([e, c, s]) => {
      setEmp(e || empleados.find(x => x.id === orden.empleado_id) || { nombre: "Personal" });
      setCli(c || { nombre: "Consumidor", apellido: "Final", cedula: "", telefono: "" });
      setSrvList(s);
    });
  }, [orden, tenant.id, clientes, empleados]);

  if (!emp || !cli) return null;

  return createPortal(
    <div className="fixed inset-0 bg-white z-[99999] overflow-y-auto pointer-events-auto atomic-print-target">
      <div className="max-w-md mx-auto p-8 print:p-0 print:max-w-none print:m-0">
        <div className="flex justify-between items-start border-b-2 border-primary/20 pb-4 mb-8 print:hidden relative z-[100000]">
          <Button 
            variant="outline" 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
            className="cursor-pointer"
          >
            Cerrar vista de impresión
          </Button>
          <Button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.print(); }} 
            className="bg-primary text-white gap-2 cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Imprimir ahora
          </Button>
        </div>

        <Ticket 
          orden={orden} 
          tenant={tenant} 
          empleado={emp} 
          cliente={cli} 
          formato={tenant.config?.formato_ticket || "80mm"} 
          serviciosList={srvList}
        />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: ${tenant.config?.formato_ticket === "57mm" ? "57mm auto" : "80mm auto"};
            margin: 0;
          }

          html,
          body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff;
            overflow: visible !important;
            height: auto !important;
          }

          /* Ocultar todo el sitio */
          body > *:not(.atomic-print-target) { display: none !important; }

          /* Mostrar solo el ticket */
          .atomic-print-target {
            display: block !important;
            visibility: visible !important;
            position: relative !important;
            left: -2mm !important;
            width: 100% !important;
            max-width: ${tenant.config?.formato_ticket === "57mm" ? "52mm" : "72mm"} !important;
            padding: ${tenant.config?.formato_ticket === "57mm" ? "1.5mm" : "2mm"} !important;
            margin: 0 auto !important;
            background: white;
            color: black;
            font-family: monospace;
            font-size: ${tenant.config?.formato_ticket === "57mm" ? "10px" : "12px"};
            line-height: ${tenant.config?.formato_ticket === "57mm" ? "1.2" : "1.3"};
            box-sizing: border-box !important;
          }

          .no-print, nav, aside, header, footer, button {
            display: none !important;
          }
        }
      `}} />
    </div>,
    document.body
  );
}

function FacturaA4PrintPortal({ orden, tenant, clientes, empleados, onClose }: { orden: Orden; tenant: any; clientes: any[]; empleados: any[]; onClose: () => void }) {
  const [emp, setEmp] = useState<any>(null);
  const [cli, setCli] = useState<any>(null);
  const [srvList, setSrvList] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      getEmpleadoById(orden.empleado_id).catch(() => null),
      Promise.resolve(clientes.find(c => c.id === orden.cliente_id)),
      getServicios(tenant.id)
    ]).then(([e, c, s]) => {
      setEmp(e || empleados.find(x => x.id === orden.empleado_id) || { nombre: "Personal" });
      setCli(c || { nombre: "Consumidor", apellido: "Final", cedula: "", telefono: "" });
      setSrvList(s);
    });
  }, [orden, tenant.id, clientes, empleados]);

  if (!emp || !cli) return null;

  const isCréditoFiscal = orden.ncf?.startsWith("E31") || orden.ncf?.startsWith("B01");
  const isECF = orden.ncf?.startsWith("E");
  const qrData = orden.ecf_qr || (isECF ? `https://dgii.gov.do/consulta_ecf?RNC_EMISOR=${tenant.rnc}&E_NCF=${orden.ncf}&MONTO_TOTAL=${orden.total}&FECHA_EMISION=${new Date(orden.creado_en).toLocaleDateString('en-GB').replace(/\//g, '')}` : "");
  const cfg = tenant.config;


  return createPortal(
    <div className="fixed inset-0 bg-white z-[99999] overflow-y-auto pointer-events-auto atomic-print-target">
      <div className="max-w-4xl mx-auto p-8 print:p-12 print:max-w-4xl print:mx-auto">
        <div className="flex justify-between items-start border-b-2 border-primary/20 pb-6 mb-8 print:hidden relative z-[100000]">
          <Button variant="outline" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }} className="gap-2 cursor-pointer">
            Cerrar
          </Button>
          <Button onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.print(); }} className="bg-primary text-white gap-2 cursor-pointer">
            <Printer className="h-4 w-4" /> Imprimir / Guardar PDF
          </Button>
        </div>

        <div className="print-area">
          <div className="flex justify-between items-start mb-10">
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
              <div className="text-xs text-slate-500">Tel: {tenant.telefono}</div>
            </div>

            <div className="text-right">
              <h2 className="text-2xl font-display font-black uppercase text-slate-900 mb-1">
                {orden.nota_credito_ncf ? (isECF ? "Nota de Crédito Electrónica" : "Nota de Crédito") : (isCréditoFiscal ? "Factura de Crédito Fiscal" : (isECF ? "Factura de Consumo Electrónica" : "Factura de Consumo"))}
              </h2>
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
                ORDEN #{orden.numero}
              </div>
              
              <table className="text-xs text-slate-600 ml-auto" style={{ borderSpacing: 0, borderCollapse: 'collapse' }}>
                <tbody>
                  <tr><td className="font-bold pr-1.5 text-right whitespace-nowrap">Fecha:</td><td className="text-left">{new Date(orden.creado_en).toLocaleString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}</td></tr>
                {orden.nota_credito_ncf ? (
                  <>
                    <tr><td className="font-bold pr-1.5 text-right text-destructive whitespace-nowrap">{isECF ? "e-NCF:" : "NCF:"}</td><td className="font-mono font-bold text-destructive text-left">{orden.nota_credito_ncf}</td></tr>
                    {orden.ncf_vencimiento && <tr><td className="font-bold pr-1.5 text-right whitespace-nowrap">Fecha Vencimiento:</td><td className="text-left font-bold">{formatDateRD(orden.ncf_vencimiento)}</td></tr>}
                    <tr><td className="font-bold pr-1.5 text-right whitespace-nowrap">Doc. Modificado:</td><td className="font-mono text-left">{orden.ncf}</td></tr>
                  </>
                ) : (
                  orden.ncf && (
                    <>
                      <tr><td className="font-bold pr-1.5 text-right whitespace-nowrap">{isECF ? "e-NCF:" : "NCF:"}</td><td className="font-mono text-left">{orden.ncf}</td></tr>
                      {orden.ncf_vencimiento && <tr><td className="font-bold pr-1.5 text-right whitespace-nowrap">Fecha Vencimiento:</td><td className="text-left font-bold">{formatDateRD(orden.ncf_vencimiento)}</td></tr>}
                    </>
                  )
                )}
                {orden.ecf_security_code && orden.ecf_security_code !== "null" && <tr><td className="font-bold pr-1.5 text-right whitespace-nowrap">Cod. Seguridad:</td><td className="font-mono text-left">{orden.ecf_security_code}</td></tr>}
                {orden.ecf_signature_date && orden.ecf_signature_date !== "null" && <tr><td className="font-bold pr-1.5 text-right whitespace-nowrap">Fecha Firma:</td><td className="text-left">{formatDateTimeRD(orden.ecf_signature_date)}</td></tr>}
                <tr><td className="font-bold pr-1.5 text-right whitespace-nowrap">Atendido por:</td><td className="text-left">{emp.nombre}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {!(cli.nombre === "Consumidor" && cli.apellido === "Final") && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 print:bg-white mb-8 flex justify-between items-center">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Facturado a</div>
                <div className="text-lg font-bold text-slate-900">{cli.nombre} {cli.apellido || ""}</div>
                {cli.cedula && (
                  <div className="text-sm text-slate-600">
                    <span className="font-bold">{cli.tipo === 'Empresa' ? "RNC:" : "Cédula:"}</span> {cli.cedula}
                  </div>
                )}
                {cli.direccion && <div className="text-sm text-slate-600">{cli.direccion}</div>}
                {cli.telefono && cli.telefono !== "---" && <div className="text-sm text-slate-600">Tel: {cli.telefono}</div>}
              </div>
            </div>
          )}

          <table className="w-full text-left border-collapse mb-8">
            <thead>
              <tr className="border-b-2 border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="py-4 px-2 w-16">Cant.</th>
                <th className="py-4 px-2">Descripción</th>
                <th className="py-4 px-2 text-right">Precio Unit.</th>
                <th className="py-4 px-2 text-right">ITBIS</th>
                <th className="py-4 px-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {(() => {
                const subtotalBruto = orden.items.reduce((acc, it) => acc + (it.cantidad * it.precio_unitario), 0) + 
                  (orden.servicios?.map(s => srvList.find(x => x.nombre === s)?.precio || 0).reduce((a,b) => a+b, 0) || 0);
                const isItbisIncluidoEnEstaOrden = cfg?.ncf_facturacion_activa && orden.itbis > 0 
                  ? (subtotalBruto - orden.subtotal > 1) 
                  : !!cfg?.itbis_incluido;
                return (
                  <>
                    {orden.items.map((it, i) => {
                      let baseTotal = it.cantidad * it.precio_unitario;
                      let itemItbis = 0;
                      let valor = baseTotal;
                      if (cfg?.ncf_facturacion_activa && orden.itbis > 0) {
                        if (isItbisIncluidoEnEstaOrden) {
                          itemItbis = baseTotal - (baseTotal / (1 + (cfg.itbis_porcentaje || 18) / 100));
                        } else {
                          itemItbis = baseTotal * ((cfg.itbis_porcentaje || 18) / 100);
                          valor = baseTotal + itemItbis;
                        }
                      }
                      return (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="py-4 px-2 font-bold text-slate-500">{it.cantidad}</td>
                          <td className="py-4 px-2 font-medium">{it.descripcion}</td>
                          <td className="py-4 px-2 text-right text-slate-500">{formatRD(it.precio_unitario)}</td>
                          <td className="py-4 px-2 text-right text-slate-500">{itemItbis > 0 ? formatRD(itemItbis) : "—"}</td>
                          <td className="py-4 px-2 text-right font-bold text-slate-900">{formatRD(valor)}</td>
                        </tr>
                      );
                    })}
                    {orden.servicios?.map((sName, i) => {
                      const srv = srvList.find(s => s.nombre === sName);
                      const p = srv ? srv.precio : 0;
                      let baseTotal = p;
                      let itemItbis = 0;
                      let valor = baseTotal;
                      if (cfg?.ncf_facturacion_activa && orden.itbis > 0) {
                        if (isItbisIncluidoEnEstaOrden) {
                          itemItbis = baseTotal - (baseTotal / (1 + (cfg.itbis_porcentaje || 18) / 100));
                        } else {
                          itemItbis = baseTotal * ((cfg.itbis_porcentaje || 18) / 100);
                          valor = baseTotal + itemItbis;
                        }
                      }
                      return (
                        <tr key={'s'+i} className="border-b border-slate-100">
                          <td className="py-4 px-2 font-bold text-slate-500">1</td>
                          <td className="py-4 px-2 font-medium">Servicio: {sName}</td>
                          <td className="py-4 px-2 text-right text-slate-500">{formatRD(p)}</td>
                          <td className="py-4 px-2 text-right text-slate-500">{p > 0 && itemItbis > 0 ? formatRD(itemItbis) : "—"}</td>
                          <td className="py-4 px-2 text-right font-bold text-slate-900">{formatRD(p > 0 ? valor : 0)}</td>
                        </tr>
                      );
                    })}
                  </>
                );
              })()}
            </tbody>
          </table>

          {orden.estado === "ANULADA" && (
            <div className="mt-4 mb-8 p-6 border-2 border-destructive/20 bg-destructive/5 rounded-2xl text-center animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="text-destructive font-display font-black uppercase tracking-[0.2em] text-xs mb-2">Orden Anulada</div>
              {orden.nota_credito_ncf && (
                <div className="text-lg font-bold text-slate-900 mb-1">
                  Nota de Crédito Fiscal: <span className="font-mono text-primary">{orden.nota_credito_ncf}</span>
                </div>
              )}
              {orden.motivo_anulacion && (
                <div className="text-sm text-slate-500 italic">
                  Motivo ({orden.motivo_anulacion_codigo || "01"}): " {orden.motivo_anulacion} "
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end mb-10">
            <div className="w-64">
              <div className="flex justify-between py-2 border-b border-slate-100 text-sm text-slate-600">
                <span>Subtotal:</span>
                <span>{formatRD(orden.subtotal)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 text-sm text-slate-600">
                <span>ITBIS (18%):</span>
                <span>{formatRD(orden.total - orden.subtotal)}</span>
              </div>
              <div className="flex justify-between py-4 text-xl font-black text-primary">
                <span>TOTAL:</span>
                <span>{formatRD(orden.total)}</span>
              </div>
              <div className="flex justify-between py-2 text-xs text-slate-500">
                <span>Pago ({orden.metodo_pago}):</span>
                <span>{formatRD(orden.pagado)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-end border-t border-slate-200 pt-6">
            <div className="text-center text-[10px] text-slate-400 italic max-w-xs text-left">
              ¡Gracias por su preferencia!<br/>
              Documento generado por Klynn POS
            </div>
            
            {isECF && qrData && (
              <div className="flex flex-col items-center gap-2">
                <QRCodeSVG value={qrData} size={100} level="M" />
                <div className="text-[10px] text-center font-bold text-slate-500">
                  Consulte su factura en:<br/>dgii.gov.do
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: portrait; margin: 20mm; }
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

function OrdenesPrintPortal({
  tenant,
  ordenes,
  clientes,
  onClose
}: {
  tenant: any;
  ordenes: any[];
  clientes: any[];
  onClose: () => void;
}) {
  const totalMontoGlobal = ordenes.reduce((acc, curr) => acc + curr.total, 0);
  const totalSaldoGlobal = ordenes.reduce((acc, curr) => acc + curr.saldo, 0);

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
                Reporte de Órdenes
              </h2>
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
                HISTÓRICO Y ESTADOS DE SERVICIOS
              </div>
              <div className="text-xs text-slate-600">
                <span className="font-bold">Generado:</span> {new Date().toLocaleString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}
              </div>
            </div>
          </div>

          {/* Sección 1: KPIs Rápidos */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total de Órdenes</div>
              <div className="text-xl font-bold text-slate-800">{ordenes.length} {ordenes.length === 1 ? 'orden' : 'órdenes'}</div>
              <div className="text-[8px] text-slate-400 mt-0.5">En el listado actual</div>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Monto Total Facturado</div>
              <div className="text-xl font-bold text-emerald-600">{formatRD(totalMontoGlobal)}</div>
              <div className="text-[8px] text-slate-400 mt-0.5">Suma de todas las órdenes</div>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cuentas por Cobrar (Saldos)</div>
              <div className="text-xl font-bold text-rose-600">{formatRD(totalSaldoGlobal)}</div>
              <div className="text-[8px] text-slate-400 mt-0.5">Pendiente por cobrar</div>
            </div>
          </div>

          {/* Sección 2: Tabla de Datos */}
          <div className="border border-slate-200 rounded-xl overflow-hidden mb-8">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Número</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Saldo</th>
                  <th className="py-3 px-4 text-center">Método Pago</th>
                  <th className="py-3 px-4 text-center">Fecha / Hora</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map((o, i) => {
                  const c = clientes.find((x) => x.id === o.cliente_id);
                  return (
                    <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-855">{o.numero}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-700">{c?.nombre || "—"}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[8px] font-black uppercase border ${
                          o.estado === 'RECIBIDA' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          o.estado === 'EN_PROCESO' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          o.estado === 'LISTA' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          o.estado === 'ENTREGADA' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {o.estado.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-slate-700">{formatRD(o.total)}</td>
                      <td className={`py-2.5 px-4 text-right font-bold ${o.saldo > 0 ? "text-rose-600" : "text-slate-500"}`}>{o.saldo > 0 ? formatRD(o.saldo) : "—"}</td>
                      <td className="py-2.5 px-4 text-center text-slate-500 whitespace-nowrap">{o.metodo_pago}</td>
                      <td className="py-2.5 px-4 text-center text-slate-500 whitespace-nowrap">{formatDateTimeRD(o.creado_en)}</td>
                    </tr>
                  );
                })}

                {ordenes.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 italic">
                      No hay órdenes registradas que coincidan con los filtros
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
