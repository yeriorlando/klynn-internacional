import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { EstadoBadge } from "@/components/klynn/TenantShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  getOrdenes, getCajaAbierta, getMovimientos, getGastos, getClienteById, getClientes,
  formatRD, formatDateTimeRD, saveOrden, type Orden, type Gasto, type Cliente, type EstadoOrden, type Tenant
} from "@/lib/storage";
import {
  Receipt, Package, Wallet, AlertCircle, ArrowUpRight, FilePlus2, Truck, TrendingUp,
  Inbox, RefreshCw, CircleCheck, Ban, ChevronLeft, ChevronRight,
  MoreVertical, MoreHorizontal, Eye, DollarSign, Printer, DownloadCloud, AlertTriangle, Zap, Check, CheckCircle2, ArrowLeft, ArrowUpCircle, XCircle
} from "lucide-react";
import { useOrdenes, useCajaAbierta, useGastos, useClientes, useMovimientos, useEmpleados } from "@/hooks/use-queries";
import { TenantShell } from "@/components/klynn/TenantShell";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { notificarWhatsApp } from "@/lib/whatsapp";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { CobrarOrdenDialog, TicketPrintPortal, OrderDetail } from "@/components/klynn/OrdenesPage";

export const Route = createFileRoute("/t/$slug/")({
  component: DashboardPage,
});

function esParaHoy(fechaStr?: string): boolean {
  if (!fechaStr) return false;
  const d = new Date(fechaStr);
  const hoy = new Date();
  return d.getDate() === hoy.getDate() &&
         d.getMonth() === hoy.getMonth() &&
         d.getFullYear() === hoy.getFullYear();
}

function esAtrasada(fechaStr?: string, estado?: EstadoOrden): boolean {
  if (!fechaStr || estado === "ENTREGADA" || estado === "ANULADA") return false;
  return new Date(fechaStr).getTime() < Date.now();
}

function DashboardPage() {
  const user = useRequireAuth();
  const tenantId = user?.tenant?.id || '';
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const isAuthorized = user?.empleado?.rol === "ADMIN" || user?.empleado?.rol === "SUPERVISOR";

  const { data: ordenes = [], isLoading: loadingOrdenes } = useOrdenes(tenantId);
  const { data: caja, isLoading: loadingCaja } = useCajaAbierta(tenantId);
  const { data: gastos = [], isLoading: loadingGastos } = useGastos(tenantId);
  const { data: clientes = [], isLoading: loadingClientes } = useClientes(tenantId);
  const { data: movs = [], isLoading: loadingMovs } = useMovimientos(tenantId, caja?.id);
  const { data: empleados = [] } = useEmpleados(tenantId);

  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!openMenuId) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.action-menu-container')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [openMenuId]);

  const [view, setView] = useState<Orden | null>(null);
  const [cobrarOrden, setCobrarOrden] = useState<Orden | null>(null);
  const [showPrint, setShowPrint] = useState<Orden | null>(null);
  const [pagoRecibidoParaTicket, setPagoRecibidoParaTicket] = useState<number | undefined>(undefined);
  const [showDownloadA4, setShowDownloadA4] = useState<Orden | null>(null);

  const loading = loadingOrdenes || loadingCaja || loadingGastos || loadingClientes || loadingMovs;

  const tenant = user?.tenant as Tenant;

  async function cambiarEstado(o: Orden, estado: EstadoOrden) {
    try {
      await saveOrden({ ...o, estado });
      queryClient.invalidateQueries({ queryKey: ['ordenes', tenantId] });
      if (estado === "LISTA" || estado === "ENTREGADA") {
        const cli = clientes.find((c) => c.id === o.cliente_id);
        if (cli) {
          toast.success(estado === "LISTA" ? "Orden lista — notificando al cliente..." : "Orden entregada — notificando al cliente...");
          notificarWhatsApp(tenant, cli, o, estado === "LISTA" ? "lista" : "entregada").then((r) => {
            if (r.ok) toast.success("WhatsApp enviado al cliente ✅");
          });
        }
      }
    } catch (err: any) {
      toast.error("Error al actualizar estado");
    }
  }

  useEffect(() => {
    setCurrentPage(1);
  }, [ordenes.length]);

  const stats = useMemo(() => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const ordenesHoy = ordenes.filter((o) => new Date(o.creado_en) >= hoy);
    const ventasHoy = ordenesHoy.filter((o) => o.estado !== "ANULADA").reduce((s, o) => s + o.total, 0);
    const activas = ordenes.filter((o) => ["RECIBIDA", "EN_PROCESO", "LISTA"].includes(o.estado));
    const listas = ordenes.filter((o) => o.estado === "LISTA");
    const cuentasCobrar = ordenes.filter((o) => o.saldo > 0 && o.estado !== "ANULADA");
    const totalCxC = cuentasCobrar.reduce((s, o) => s + o.saldo, 0);
    const gastosHoy = gastos.filter((g) => new Date(g.fecha) >= hoy).reduce((s, g) => s + g.monto, 0);

    const efectivo = movs.filter((m) => m.metodo === "EFECTIVO" || m.tipo === "INGRESO").reduce((s, m) => s + m.monto, 0)
      - movs.filter((m) => ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA"].includes(m.tipo)).reduce((s, m) => s + m.monto, 0);

    const v7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const total = ordenes.filter((o) => o.estado !== "ANULADA" && new Date(o.creado_en) >= d && new Date(o.creado_en) < next).reduce((s, o) => s + o.total, 0);
      v7.push({ dia: d.toLocaleDateString("es-DO", { weekday: "long" }), total });
    }
    const max = Math.max(1, ...v7.map((v) => v.total));

    return { ventasHoy, activas, listas, cuentasCobrar, totalCxC, gastosHoy, efectivo, ventas7dias: v7, max };
  }, [ordenes, movs, gastos]);

  const { ventasHoy, activas, listas, cuentasCobrar, totalCxC, gastosHoy, efectivo, ventas7dias, max } = stats;

  const sortedOrdenes = useMemo(() => {
    return [...ordenes].sort((a, b) => +new Date(b.creado_en) - +new Date(a.creado_en));
  }, [ordenes]);

  const ordersPerPage = 5;
  const totalPages = Math.ceil(sortedOrdenes.length / ordersPerPage);

  const paginatedOrdenes = useMemo(() => {
    const startIndex = (currentPage - 1) * ordersPerPage;
    return sortedOrdenes.slice(startIndex, startIndex + ordersPerPage);
  }, [sortedOrdenes, currentPage]);

  if (!user || user.tenant.id === '__loading__') return null;

  if (loading) return <div className="flex h-64 items-center justify-center"><p className="text-muted-foreground animate-pulse">Cargando dashboard...</p></div>;

  return (
    <div>
      <PageHeader title={`Hola, ${user.empleado.nombre.split(" ")[0]} 👋`} description="Resumen operativo de tu lavandería en tiempo real.">
        <Link to="/t/$slug/nueva-orden" params={{ slug: tenant.slug }}>
          <Button className="bg-gradient-primary text-white shadow-elegant hover:opacity-95">
            <FilePlus2 className="mr-1.5 h-4 w-4" /> Nueva orden
          </Button>
        </Link>
      </PageHeader>

      {/* Alertas */}
      {!caja && (
        <Card className="mb-6 flex flex-wrap items-center gap-3 border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div className="flex-1">
            <div className="font-medium">No hay caja abierta</div>
            <div className="text-sm text-muted-foreground">Abre la caja para comenzar a registrar ventas en efectivo.</div>
          </div>
          <Link to="/t/$slug/caja" params={{ slug: tenant.slug }}><Button variant="outline">Ir a caja</Button></Link>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div id="tour-kpi-ventas" className="h-full"><KPI title="Ventas del día" value={formatRD(ventasHoy)} icon={Receipt} accent /></div>
        <div id="tour-kpi-activas" className="h-full"><KPI title="Órdenes activas" value={String(activas.length)} icon={Package} sub="Pendientes de procesar" /></div>
        <KPI title="Listas para entregar" value={String(listas.length)} icon={Truck} />
        <KPI title="Por cobrar" value={formatRD(totalCxC)} icon={AlertCircle} sub={`${cuentasCobrar.length} órdenes`} warn={totalCxC > 0} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Gráfica */}
        <Card className="lg:col-span-2 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ventas últimos 7 días</div>
              <div className="font-display text-2xl">{formatRD(ventas7dias.reduce((s, v) => s + v.total, 0))}</div>
            </div>
            <div className="flex items-center gap-1 text-xs text-success">
              <TrendingUp className="h-3.5 w-3.5" /> Día activo
            </div>
          </div>
          <div className="flex h-48 items-end gap-3 pt-4">
            {ventas7dias.map((v, i) => {
              // Scale to 70% to leave room for tooltip at the top
              const heightPct = (v.total / max) * 70;
              return (
                <div key={i} className="group relative flex h-full flex-1 flex-col items-center justify-end gap-1">
                  {/* Tooltip Bubble - Dynamic position based on height */}
                  <div 
                    className="absolute opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-10 scale-90 group-hover:scale-100 origin-bottom"
                    style={{ bottom: `calc(${heightPct}% + 2.8rem)` }}
                  >
                    <div className="bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-xl whitespace-nowrap">
                      {formatRD(v.total)}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                    </div>
                  </div>

                  <div className="text-[10px] font-bold text-slate-500 z-0">{v.total > 0 ? `${(v.total / 1000).toFixed(1)}k` : ""}</div>
                  <div 
                    className="w-full rounded-t-lg bg-gradient-primary transition-all duration-500 hover:brightness-110 shadow-sm cursor-pointer" 
                    style={{ height: `${Math.max(4, heightPct)}%` }} 
                  />
                  <div className="text-[10px] font-bold capitalize text-slate-400 mt-1">{v.dia}</div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Caja */}
        <Card id="tour-caja-turno" className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Caja del turno</div>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </div>
          {caja ? (
            <>
              <div className="font-display text-3xl">{formatRD(efectivo)}</div>
              <div className="mt-1 text-xs text-muted-foreground">Abierta {formatDateTimeRD(caja.abierta_en)}</div>
              <div className="mt-4 space-y-1.5 text-sm">
                <Row k="Apertura" v={formatRD(caja.monto_inicial)} />
                <Row k="Movimientos" v={String(movs.length)} />
                <Row k="Gastos hoy" v={formatRD(gastosHoy)} />
              </div>
              <Link to="/t/$slug/caja" params={{ slug: tenant.slug }} className="mt-4 block">
                <Button variant="outline" className="w-full">Ver detalle</Button>
              </Link>
            </>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">Caja cerrada</div>
          )}
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="font-display text-xl">Órdenes recientes</div>
            <div className="text-sm text-muted-foreground">
              {sortedOrdenes.length > 0 
                ? `Mostrando ${ (currentPage - 1) * ordersPerPage + 1 } a ${ Math.min(currentPage * ordersPerPage, sortedOrdenes.length) } de ${ sortedOrdenes.length }`
                : "0 órdenes"
              }
            </div>
          </div>
          <Link to="/t/$slug/ordenes" params={{ slug: tenant.slug }} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Ver todas <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-elevated text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Orden y Cliente</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Total</th>
                <th className="px-4 py-3 text-center">Saldo</th>
                <th className="px-4 py-3 text-center">Pago</th>
                <th className="px-4 py-3 text-center">Entrega</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrdenes.map((o) => {
                const c = clientes.find((x) => x.id === o.cliente_id);
                return (
                  <tr key={o.id} className="border-b border-border/50 hover:bg-accent/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef2f6] text-[#2c4e82] dark:bg-slate-800 dark:text-blue-400 animate-in fade-in zoom-in duration-200 border border-[#d6e0ea]/50">
                          <Receipt className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-mono text-sm font-bold text-[#2c4e82] dark:text-[#5c85c2]">
                            {o.numero}
                          </span>
                          <span className="font-bold text-sm text-foreground truncate max-w-[220px]" title={c ? `${c.nombre} ${c.apellido || ""}` : ""}>
                            {c ? `${c.nombre} ${c.apellido || ""}` : "Consumidor Final"}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {formatDateTimeRD(o.creado_en)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {o.estado === "ANULADA" ? (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                          <Ban className="h-3 w-3" /> ANULADA
                        </span>
                      ) : (
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <button className="cursor-pointer transition-transform duration-100 active:scale-90 hover:scale-[1.08] focus:outline-none">
                              <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors duration-150 ${
                                o.estado === "RECIBIDA" ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400" :
                                o.estado === "EN_PROCESO" ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400" :
                                o.estado === "LISTA" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400" :
                                o.estado === "ENTREGADA" ? "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-400" :
                                "border-zinc-200 bg-zinc-50 text-zinc-600"
                              }`}>
                                {o.estado === "RECIBIDA" && <Inbox className="h-3 w-3" />}
                                {o.estado === "EN_PROCESO" && <RefreshCw className="h-3 w-3" />}
                                {o.estado === "LISTA" && <CircleCheck className="h-3 w-3" />}
                                {o.estado === "ENTREGADA" && <Truck className="h-3 w-3" />}
                                {o.estado.replace("_", " ")}
                              </span>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center" sideOffset={4} className="w-[180px] p-1.5 rounded-xl shadow-lg border border-border/60">
                            <div className="space-y-1">
                              {([
                                { value: "RECIBIDA" as EstadoOrden, label: "Recibida", icon: Inbox, solidBg: "bg-blue-600", hoverBg: "hover:bg-blue-50 dark:hover:bg-blue-950/20" },
                                { value: "EN_PROCESO" as EstadoOrden, label: "En proceso", icon: RefreshCw, solidBg: "bg-amber-500", hoverBg: "hover:bg-amber-50 dark:hover:bg-amber-950/20" },
                                { value: "LISTA" as EstadoOrden, label: "Lista", icon: CircleCheck, solidBg: "bg-emerald-600", hoverBg: "hover:bg-emerald-50 dark:hover:bg-amber-950/20" },
                                { value: "ENTREGADA" as EstadoOrden, label: "Entregada", icon: Truck, solidBg: "bg-purple-600", hoverBg: "hover:bg-purple-50 dark:hover:bg-purple-950/20" },
                              ]).map((s) => {
                                const Icon = s.icon;
                                const isCurrent = o.estado === s.value;
                                return (
                                  <button
                                    key={s.value}
                                    onClick={() => { if (!isCurrent) cambiarEstado(o, s.value); }}
                                    className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors duration-75 ${
                                      isCurrent ? "bg-accent font-bold" : `${s.hoverBg} text-foreground`
                                    }`}
                                  >
                                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${s.solidBg}`}>
                                      <Icon className="h-3.5 w-3.5 text-white" />
                                    </span>
                                    {s.label}
                                    {isCurrent && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
                                  </button>
                                );
                              })}
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-medium">{formatRD(o.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center">
                        {o.saldo > 0 ? (
                          <button
                            onClick={() => o.estado !== "ANULADA" && setCobrarOrden(o)}
                            className="transition-transform active:scale-95 cursor-pointer"
                            title="Cobrar saldo de esta orden"
                          >
                            <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning-foreground hover:bg-warning/25 transition-colors font-bold">
                              {formatRD(o.saldo)}
                            </Badge>
                          </button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-xs">{o.metodo_pago}</td>
                    <td className="px-4 py-3 text-center text-xs">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-semibold">
                          {o.fecha_entrega ? formatDateTimeRD(o.fecha_entrega) : "—"}
                        </span>
                        <div className="flex flex-wrap gap-1.5 justify-center max-w-[140px]">
                          {o.es_urgente && (
                            <Badge className="bg-rose-500 hover:bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider py-0.5 px-1.5 rounded-sm gap-0.5 shadow-sm border-0">
                              <Zap className="h-2.5 w-2.5 fill-white" /> Urgente
                            </Badge>
                          )}
                          {o.fecha_entrega && esParaHoy(o.fecha_entrega) && (
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-black uppercase tracking-wider py-0.5 px-1.5 rounded-sm gap-0.5 shadow-sm border-0">
                              Hoy
                            </Badge>
                          )}
                          {o.fecha_entrega && esAtrasada(o.fecha_entrega, o.estado) && (
                            <Badge className="bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase tracking-wider py-0.5 px-1.5 rounded-sm gap-0.5 shadow-sm border-0 animate-pulse">
                              Atrasada
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <div className="action-menu-container order-actions action-menu">
                          <button
                            type="button"
                            onClick={() => setOpenMenuId(openMenuId === o.id ? null : o.id)}
                            className={openMenuId === o.id ? "is-open" : ""}
                          >
                            <MoreHorizontal />
                          </button>
                          {openMenuId === o.id && (
                            <div 
                              className="action-menu-popover"
                              onMouseLeave={() => setOpenMenuId(null)}
                            >
                              <button 
                                onClick={() => { setOpenMenuId(null); setView(o); }}
                              >
                                <Eye /> Ver Detalles
                              </button>
                              
                              {o.saldo > 0 && o.estado !== "ANULADA" && (
                                <button 
                                  onClick={() => { setOpenMenuId(null); setCobrarOrden(o); }}
                                  className="text-emerald-600 dark:text-emerald-400"
                                >
                                  <DollarSign /> Cobrar Orden
                                </button>
                              )}

                              <button 
                                onClick={() => { setOpenMenuId(null); setShowPrint(o); }}
                              >
                                <Printer /> Imprimir Ticket
                              </button>
                              
                              <button 
                                onClick={() => { setOpenMenuId(null); setShowDownloadA4(o); }}
                              >
                                <DownloadCloud /> Ver Factura A4
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {ordenes.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Aún no hay órdenes.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <div className="text-xs text-muted-foreground">
              Página {currentPage} de {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                className="h-8 rounded-xl text-xs font-bold transition-all active:scale-[0.98] bg-primary text-white hover:bg-primary/90"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Anterior
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-8 rounded-xl text-xs font-bold transition-all active:scale-[0.98] bg-primary text-white hover:bg-primary/90"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                Siguiente <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
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
              setCobrarOrden={setCobrarOrden}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de cobro unificado */}
      {cobrarOrden && (
        <CobrarOrdenDialog
          orden={cobrarOrden}
          onClose={() => setCobrarOrden(null)}
          tenant={tenant}
          cajaAbierta={caja}
          clientes={clientes}
          queryClient={queryClient}
          showPrintPortal={(upd, rec) => {
            setShowPrint(upd);
            setPagoRecibidoParaTicket(rec);
          }}
        />
      )}

      {/* Modal de impresión térmica */}
      {showPrint && (
        <TicketPrintPortal 
          orden={showPrint} 
          tenant={tenant} 
          clientes={clientes}
          empleados={empleados}
          pagoRecibido={pagoRecibidoParaTicket}
          onClose={() => {
            setShowPrint(null);
            setPagoRecibidoParaTicket(undefined);
          }} 
        />
      )}
    </div>
  );
}

function KPI({ title, value, sub, icon: Icon, accent, warn }: { title: string; value: string; sub?: string; icon: typeof Receipt; accent?: boolean; warn?: boolean }) {
  return (
    <Card className={`p-5 h-full ${accent ? "bg-gradient-primary text-white" : ""} ${warn ? "border-warning/40" : ""}`}>
      <div className="flex items-start justify-between">
        <div className={`text-xs font-semibold uppercase tracking-wider ${accent ? "text-white/80" : "text-muted-foreground"}`}>{title}</div>
        <Icon className={`h-4 w-4 ${accent ? "text-white/80" : "text-muted-foreground"}`} />
      </div>
      <div className="mt-2 font-display text-3xl tracking-tight">{value}</div>
      {sub && <div className={`mt-1 text-xs ${accent ? "text-white/70" : "text-muted-foreground"}`}>{sub}</div>}
    </Card>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>;
}
