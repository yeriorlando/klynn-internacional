import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Plus, Trash2, Download, Printer, FileSpreadsheet } from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  getGastos, saveGasto, deleteGasto, formatRD, formatDateRD, uid, CATEGORIAS_GASTOS, 
  getECFDocumentosRecibidos, updateEstadoComercialECF, getTenantPlan, getECFConfig, 
  DEFAULT_CONFIG, type Gasto, type ECFDocumentRecibido,
  getCajaAbierta, saveMovimiento, type MetodoPago,
  isModuleEnabled
} from "@/lib/storage";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Receipt, Check, X as XIcon, ExternalLink, ShieldCheck, PiggyBank } from "lucide-react";
import { usePlans } from "@/hooks/use-queries";
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

export const Route = createFileRoute("/t/$slug/gastos")({ component: GastosPage });

function GastosPage() {
  const user = useRequireAuth();
  const [show, setShow] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [recibidos, setRecibidos] = useState<ECFDocumentRecibido[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("manual");
  const [isElectronic, setIsElectronic] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const tenant = user?.tenant;
  const tenantId = tenant?.id || '';

  useEffect(() => {
    async function load() {
      if (!tenantId || tenantId === '__loading__') return;
      setLoading(true);
      try {
        const [listGastos, listRecibidos, conf] = await Promise.all([
          getGastos(tenantId),
          getECFDocumentosRecibidos(tenantId),
          getECFConfig(tenantId)
        ]);
        setGastos(listGastos.sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha)));
        setRecibidos(listRecibidos);
        setIsElectronic(!!conf?.is_active);
      } catch (err) {
        console.error("Error cargando datos:", err);
      }
      setLoading(false);
    }
    load();
  }, [tenantId, refresh]);

  const { data: plans = [] } = usePlans();
  const plan = plans.find(p => p.id === user?.tenant?.plan_id) || (user ? getTenantPlan(user.tenant) : null);
  const canSeeFiscal = isModuleEnabled(user?.tenant || null, 'facturacion_fiscal', plan || undefined);

  const manualGastos = useMemo(() => gastos.filter(g => !g.is_caja_chica), [gastos]);
  const cajaChicaGastos = useMemo(() => gastos.filter(g => g.is_caja_chica), [gastos]);

  const exportData = useMemo(() => {
    if (activeTab === "manual") {
      return {
        filename: "Gastos_Manuales",
        columns: ["Fecha", "Categoría", "Descripción", "Proveedor", "Método de Pago", "Monto"],
        data: manualGastos.map(g => [
          formatDateRD(g.fecha),
          g.categoria,
          g.descripcion,
          g.proveedor || "—",
          g.metodo_pago,
          formatRD(g.monto)
        ])
      };
    } else if (activeTab === "caja-chica") {
      return {
        filename: "Gastos_Caja_Chica",
        columns: ["Fecha", "Categoría", "Descripción", "Método de Pago", "Monto"],
        data: cajaChicaGastos.map(g => [
          formatDateRD(g.fecha),
          g.categoria,
          g.descripcion,
          g.metodo_pago,
          formatRD(g.monto)
        ])
      };
    } else {
      return {
        filename: "Facturas_Fiscales_Recibidas",
        columns: ["Recepción", "Tipo e-CF", "Emisor (RNC)", "Nombre Emisor", "e-NCF", "Estado Comercial", "Monto Total"],
        data: recibidos.map(d => [
          formatDateRD(d.creado_en),
          d.tipo_ecf,
          d.rnc_emisor,
          d.nombre_emisor || "—",
          d.encf,
          d.estado_comercial,
          formatRD(d.monto_total)
        ])
      };
    }
  }, [activeTab, manualGastos, cajaChicaGastos, recibidos]);

  if (!user || user.tenant.id === '__loading__' || (loading && gastos.length === 0)) {
    return <GlobalPageLoader text="Cargando gastos..." />;
  }

  const total = gastos.reduce((s, g) => s + g.monto, 0);

  const porCategoria = manualGastos.reduce((m, g) => { m[g.categoria] = (m[g.categoria] || 0) + g.monto; return m; }, {} as Record<string, number>);

  return (
    <div>
      <PageHeader 
        title="Gastos" 
        description={`${activeTab === "manual" ? manualGastos.length : activeTab === "caja-chica" ? cajaChicaGastos.length : recibidos.length} egresos · ${formatRD(activeTab === "manual" ? manualGastos.reduce((s,g)=>s+g.monto,0) : activeTab === "caja-chica" ? cajaChicaGastos.reduce((s,g)=>s+g.monto,0) : recibidos.reduce((s,g)=>s+g.monto_total,0))}`}
      >
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
          <Button onClick={() => setShow(true)} className="bg-gradient-primary text-white"><Plus className="mr-1.5 h-4 w-4" /> Nuevo gasto</Button>
        </div>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-8 bg-muted/30 p-1 rounded-2xl border border-primary/5 shadow-sm inline-flex h-auto">
          <TabsTrigger 
            value="manual" 
            className="rounded-xl px-6 py-1.5 text-xs font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            <Receipt className="mr-2 h-4 w-4" /> Gastos Manuales
          </TabsTrigger>
          <TabsTrigger 
            value="caja-chica" 
            className="rounded-xl px-6 py-1.5 text-xs font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            <PiggyBank className="mr-2 h-4 w-4" /> Caja Chica
          </TabsTrigger>
          {canSeeFiscal && (
            <TabsTrigger 
              value="fiscal" 
              className="rounded-xl px-6 py-1.5 text-xs font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <ShieldCheck className="mr-2 h-4 w-4" /> Facturas Fiscales (e-CF)
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="manual">
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            {Object.entries(porCategoria).slice(0, 3).map(([k, v]) => (
              <Card key={k} className="p-4 rounded-2xl border-none shadow-sm"><div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{k}</div><div className="font-display text-xl font-bold">{formatRD(v)}</div></Card>
            ))}
          </div>

          <Card className="overflow-hidden rounded-2xl border border-border/50">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-surface-elevated text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-left">Categoría</th>
                    <th className="px-4 py-3 text-left">Descripción</th>
                    <th className="px-4 py-3 text-left">Proveedor</th>
                    <th className="px-4 py-3 text-left">Pago</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {manualGastos.map((g) => (
                    <tr key={g.id} className="border-b border-border/50 hover:bg-accent/10 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateRD(g.fecha)}</td>
                      <td className="px-4 py-3"><span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold">{g.categoria}</span></td>
                      <td className="px-4 py-3 font-medium">{g.descripcion}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{g.proveedor || "—"}</td>
                      <td className="px-4 py-3 text-xs">{g.metodo_pago}</td>
                      <td className="px-4 py-3 text-right font-bold text-destructive">{formatRD(g.monto)}</td>
                      <td className="px-4 py-3 text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="rounded-full hover:bg-destructive/10"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-2xl border-none shadow-card">
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar gasto?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción eliminará permanentemente el registro de este gasto.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={async () => { 
                                  try {
                                    await deleteGasto(g.id); 
                                    setRefresh((r) => r + 1); 
                                    toast.success("Gasto eliminado 🗑️"); 
                                  } catch (err) {
                                    toast.error("Error al eliminar");
                                  }
                                }} 
                                className="bg-destructive text-white rounded-xl"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  ))}
                  {manualGastos.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center py-10 max-w-md mx-auto px-4">
                          <div className="rounded-2xl bg-destructive/10 p-4 mb-4 text-destructive shadow-sm">
                            <Receipt className="h-10 w-10" />
                          </div>
                          <h3 className="font-display text-lg font-bold text-foreground">¡Sin gastos manuales!</h3>
                          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                            Registra los egresos operativos ordinarios de tu lavandería (renta, luz, nómina) para mantener un balance financiero exacto.
                          </p>
                          <Button onClick={() => setShow(true)} className="mt-6 bg-gradient-primary text-white font-bold shadow-md">
                            <Plus className="mr-1.5 h-4 w-4" /> Registrar primer gasto
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="caja-chica">
          <Card className="overflow-hidden rounded-2xl border border-border/50">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-surface-elevated text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-left">Categoría</th>
                    <th className="px-4 py-3 text-left">Descripción</th>
                    <th className="px-4 py-3 text-xs">Método</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {cajaChicaGastos.map((g) => (
                    <tr key={g.id} className="border-b border-border/50 hover:bg-accent/10 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateRD(g.fecha)}</td>
                      <td className="px-4 py-3"><span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold">{g.categoria}</span></td>
                      <td className="px-4 py-3 font-medium">{g.descripcion}</td>
                      <td className="px-4 py-3 text-xs">{g.metodo_pago}</td>
                      <td className="px-4 py-3 text-right font-bold text-destructive">{formatRD(g.monto)}</td>
                    </tr>
                  ))}
                  {cajaChicaGastos.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center py-10 max-w-md mx-auto px-4">
                          <div className="rounded-2xl bg-primary/10 p-4 mb-4 text-primary shadow-sm">
                            <PiggyBank className="h-10 w-10" />
                          </div>
                          <h3 className="font-display text-lg font-bold text-foreground">¡Sin egresos de caja chica!</h3>
                          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                            Aquí aparecerán los gastos menores o compras de menor cuantía que se descuenten directamente del fondo de caja chica.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="fiscal">

          <Card className="overflow-hidden rounded-2xl border border-border/50">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-surface-elevated text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Recepción</th>
                    <th className="px-4 py-3 text-left">Emisor (Proveedor)</th>
                    <th className="px-4 py-3 text-left">e-NCF</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                    <th className="px-4 py-3 text-center">Estado Comercial</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {recibidos.map((doc) => (
                    <tr key={doc.id} className="border-b border-border/50 hover:bg-accent/10 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-xs font-medium">{formatDateRD(doc.creado_en)}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">{doc.tipo_ecf}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold">{doc.nombre_emisor || "Proveedor Electrónico"}</div>
                        <div className="text-xs text-muted-foreground">{doc.rnc_emisor}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-primary">{doc.encf}</td>
                      <td className="px-4 py-3 text-right font-bold">{formatRD(doc.monto_total)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase border ${
                          doc.estado_comercial === 'APROBADO' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                          doc.estado_comercial === 'RECHAZADO' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                          'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        }`}>
                          {doc.estado_comercial}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {doc.pdf_url && (
                            <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-primary/20 text-primary hover:bg-primary/10" asChild>
                              <a href={doc.pdf_url} target="_blank" rel="noopener noreferrer"><FileText className="h-4 w-4" /></a>
                            </Button>
                          )}
                          {doc.estado_comercial === 'PENDIENTE' && (
                            <>
                              <Button 
                                size="icon" 
                                variant="outline" 
                                className="h-8 w-8 rounded-full border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10"
                                onClick={async () => {
                                  try {
                                    await updateEstadoComercialECF(doc.id, 'APROBADO', tenantId);
                                    setRefresh(r => r + 1);
                                    toast.success("Factura aprobada comercialmente ✅");
                                  } catch (e) { toast.error("Error al aprobar"); }
                                }}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="outline" 
                                className="h-8 w-8 rounded-full border-destructive/20 text-destructive hover:bg-destructive/10"
                                onClick={async () => {
                                  try {
                                    await updateEstadoComercialECF(doc.id, 'RECHAZADO', tenantId);
                                    setRefresh(r => r + 1);
                                    toast.success("Factura rechazada comercialmente ❌");
                                  } catch (e) { toast.error("Error al rechazar"); }
                                }}
                              >
                                <XIcon className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {recibidos.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <ShieldCheck className="h-12 w-12 text-muted-foreground/20" />
                          <div className="text-muted-foreground font-medium">No has recibido facturas fiscales electrónicas aún.</div>
                          <p className="max-w-xs text-xs text-muted-foreground/60 text-center">Las facturas que emitan tus proveedores a tu RNC aparecerán aquí automáticamente.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <NewGasto open={show} onOpenChange={setShow} tenantId={user.tenant.id} empleadoId={user.empleado.id} onDone={() => { setRefresh((r) => r + 1); setShow(false); }} />

      {isPrinting && (
        <GastosPrintPortal 
          activeTab={activeTab}
          tenant={user.tenant}
          manualGastos={manualGastos}
          cajaChicaGastos={cajaChicaGastos}
          recibidos={recibidos}
          onClose={() => setIsPrinting(false)}
        />
      )}
    </div>
  );
}

function GastosPrintPortal({
  activeTab,
  tenant,
  manualGastos,
  cajaChicaGastos,
  recibidos,
  onClose
}: {
  activeTab: string;
  tenant: any;
  manualGastos: any[];
  cajaChicaGastos: any[];
  recibidos: any[];
  onClose: () => void;
}) {
  const title = activeTab === "manual" 
    ? "Reporte de Gastos Manuales" 
    : activeTab === "caja-chica" 
      ? "Reporte de Caja Chica" 
      : "Reporte de Facturas Fiscales (e-CF)";

  const isManual = activeTab === "manual";
  const isCaja = activeTab === "caja-chica";
  const isFiscal = activeTab === "fiscal";

  // Compute stats for active tab
  const totalMonto = isManual 
    ? manualGastos.reduce((s, g) => s + g.monto, 0)
    : isCaja 
      ? cajaChicaGastos.reduce((s, g) => s + g.monto, 0)
      : recibidos.reduce((s, d) => s + d.monto_total, 0);

  const totalCount = isManual 
    ? manualGastos.length 
    : isCaja 
      ? cajaChicaGastos.length 
      : recibidos.length;

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
                {title}
              </h2>
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
                EGRESOS Y COMPROBANTES
              </div>
              <div className="text-xs text-slate-600">
                <span className="font-bold">Generado:</span> {new Date().toLocaleString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}
              </div>
            </div>
          </div>

          {/* Sección 1: KPIs Rápidos */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Egresado</div>
              <div className="text-xl font-bold text-rose-600">{formatRD(totalMonto)}</div>
              <div className="text-[8px] text-slate-400 mt-0.5">Suma de la pestaña activa</div>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Transacciones</div>
              <div className="text-xl font-bold text-slate-850">{totalCount} {totalCount === 1 ? 'registro' : 'registros'}</div>
              <div className="text-[8px] text-slate-400 mt-0.5">Cantidad de egresos</div>
            </div>

            {isFiscal ? (
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex justify-between items-center">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Aprobados / Rechazados</div>
                  <div className="text-base font-bold text-slate-800">
                    <span className="text-emerald-600">{recibidos.filter(d => d.estado_comercial === 'APROBADO').length}</span>
                    <span className="text-slate-400 mx-1">/</span>
                    <span className="text-rose-600">{recibidos.filter(d => d.estado_comercial === 'RECHAZADO').length}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Método Principal</div>
                <div className="text-base font-bold text-slate-800">
                  {(() => {
                    const list = isManual ? manualGastos : cajaChicaGastos;
                    const counts = list.reduce((acc, curr) => {
                      acc[curr.metodo_pago] = (acc[curr.metodo_pago] || 0) + curr.monto;
                      return acc;
                    }, {} as Record<string, number>);
                    const top = Object.entries(counts).sort((a, b) => (b[1] as number) - (a[1] as number))[0];
                    return top ? `${top[0]} (${formatRD(top[1] as number)})` : "—";
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Sección 2: Tabla de Datos */}
          <div className="border border-slate-200 rounded-xl overflow-hidden mb-8">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  {isManual && (
                    <>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Categoría</th>
                      <th className="py-3 px-4">Descripción</th>
                      <th className="py-3 px-4">Proveedor</th>
                      <th className="py-3 px-4">Método</th>
                      <th className="py-3 px-4 text-right">Monto</th>
                    </>
                  )}
                  {isCaja && (
                    <>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Categoría</th>
                      <th className="py-3 px-4">Descripción</th>
                      <th className="py-3 px-4">Método</th>
                      <th className="py-3 px-4 text-right">Monto</th>
                    </>
                  )}
                  {isFiscal && (
                    <>
                      <th className="py-3 px-4">Fecha Recepción</th>
                      <th className="py-3 px-4">Proveedor (Emisor)</th>
                      <th className="py-3 px-4">e-NCF</th>
                      <th className="py-3 px-4 text-center">Estado Comercial</th>
                      <th className="py-3 px-4 text-right">Monto Total</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {isManual && manualGastos.map((g, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{formatDateRD(g.fecha)}</td>
                    <td className="py-2.5 px-4"><span className="inline-flex items-center rounded-full bg-slate-100 text-slate-800 px-2 py-0.5 text-[9px] font-bold">{g.categoria}</span></td>
                    <td className="py-2.5 px-4 font-medium text-slate-850">{g.descripcion}</td>
                    <td className="py-2.5 px-4 text-slate-500">{g.proveedor || "—"}</td>
                    <td className="py-2.5 px-4 text-slate-600">{g.metodo_pago}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-rose-600">{formatRD(g.monto)}</td>
                  </tr>
                ))}
                {isCaja && cajaChicaGastos.map((g, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{formatDateRD(g.fecha)}</td>
                    <td className="py-2.5 px-4"><span className="inline-flex items-center rounded-full bg-blue-50 text-primary px-2 py-0.5 text-[9px] font-bold">{g.categoria}</span></td>
                    <td className="py-2.5 px-4 font-medium text-slate-850">{g.descripcion}</td>
                    <td className="py-2.5 px-4 text-slate-600">{g.metodo_pago}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-rose-600">{formatRD(g.monto)}</td>
                  </tr>
                ))}
                {isFiscal && recibidos.map((d, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{formatDateRD(d.creado_en)}</div>
                      <div className="text-[8px] text-slate-400 font-bold uppercase">{d.tipo_ecf}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-bold text-slate-800">{d.nombre_emisor || "Proveedor Electrónico"}</div>
                      <div className="text-[10px] text-slate-500 font-mono">RNC: {d.rnc_emisor}</div>
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-primary">{d.encf}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-bold border ${
                        d.estado_comercial === 'APROBADO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        d.estado_comercial === 'RECHAZADO' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {d.estado_comercial}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900">{formatRD(d.monto_total)}</td>
                  </tr>
                ))}

                {totalCount === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 italic">
                      No hay egresos registrados en esta sección
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

function NewGasto({ open, onOpenChange, tenantId, empleadoId, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; tenantId: string; empleadoId: string; onDone: () => void }) {
  const [f, setF] = useState({ categoria: CATEGORIAS_GASTOS[0], descripcion: "", monto: 0, metodo_pago: "Efectivo", proveedor: "" });
  async function submit() {
    if (!f.descripcion.trim() || f.monto <= 0) { toast.error("Datos inválidos"); return; }
    try {
      const gastoId = uid("gas");
      await saveGasto({ id: gastoId, tenant_id: tenantId, empleado_id: empleadoId, ...f, proveedor: f.proveedor || undefined, fecha: new Date().toISOString(), aprobado: true });
      
      try {
        const caja = await getCajaAbierta(tenantId);
        if (caja) {
          const metodo = f.metodo_pago === "Cheque" ? "EFECTIVO" : (f.metodo_pago.toUpperCase() as MetodoPago);
          await saveMovimiento({
            id: uid("mov"),
            tenant_id: tenantId,
            caja_id: caja.id,
            empleado_id: empleadoId,
            tipo: "EGRESO",
            concepto: `Gasto: ${f.categoria} - ${f.descripcion}`,
            monto: f.monto,
            metodo,
            referencia: gastoId,
            creado_en: new Date().toISOString(),
          });
        }
      } catch (cajaErr) {
        console.error("Error creating box movement for gasto:", cajaErr);
      }

      toast.success("Gasto registrado"); onDone();
      setF({ categoria: CATEGORIAS_GASTOS[0], descripcion: "", monto: 0, metodo_pago: "Efectivo", proveedor: "" });
    } catch (err: any) {
      toast.error("Error al registrar gasto");
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo gasto</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2"><Label>Categoría</Label>
            <Select value={f.categoria} onValueChange={(v) => setF({ ...f, categoria: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIAS_GASTOS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Descripción</Label>
            <Input 
              placeholder="Ej: Compra de detergente, pago de luz..." 
              value={f.descripcion} 
              onChange={(e) => setF({ ...f, descripcion: e.target.value })} 
            />
          </div>
          <div>
            <Label>Monto (RD$)</Label>
            <Input 
              type="number" 
              placeholder="0.00" 
              value={f.monto || ""} 
              onChange={(e) => setF({ ...f, monto: Number(e.target.value) || 0 })} 
            />
          </div>
          <div><Label>Método</Label>
            <Select value={f.metodo_pago} onValueChange={(v) => setF({ ...f, metodo_pago: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Efectivo">Efectivo</SelectItem>
                <SelectItem value="Transferencia">Transferencia</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="Tarjeta">Tarjeta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Proveedor</Label>
            <Input 
              placeholder="Ej: Distribuidora Dominicana, Claro... (opcional)" 
              value={f.proveedor} 
              onChange={(e) => setF({ ...f, proveedor: e.target.value })} 
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} className="bg-gradient-primary text-white">Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
