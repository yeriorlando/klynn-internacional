import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { EstadoBadge } from "@/components/klynn/TenantShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getOrdenes, getCajaAbierta, getMovimientos, getGastos, getClienteById, getClientes,
  formatRD, formatDateTimeRD, type Orden, type CajaSesion, type CajaMovimiento, type Gasto, type Cliente
} from "@/lib/storage";
import {
  Receipt, Package, Wallet, AlertCircle, ArrowUpRight, FilePlus2, Truck, TrendingUp,
  Inbox, RefreshCw, CircleCheck, Ban
} from "lucide-react";
import { useOrdenes, useCajaAbierta, useGastos, useClientes, useMovimientos } from "@/hooks/use-queries";
import { TenantShell } from "@/components/klynn/TenantShell";

export const Route = createFileRoute("/t/$slug/")({
  component: DashboardPage,
});

function DashboardPage() {
  const user = useRequireAuth();
  const tenantId = user?.tenant?.id || '';

  const { data: ordenes = [], isLoading: loadingOrdenes } = useOrdenes(tenantId);
  const { data: caja, isLoading: loadingCaja } = useCajaAbierta(tenantId);
  const { data: gastos = [], isLoading: loadingGastos } = useGastos(tenantId);
  const { data: clientes = [], isLoading: loadingClientes } = useClientes(tenantId);
  const { data: movs = [], isLoading: loadingMovs } = useMovimientos(tenantId, caja?.id);

  const loading = loadingOrdenes || loadingCaja || loadingGastos || loadingClientes;

  const tenant = user?.tenant;

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
        <div id="tour-kpi-ventas"><KPI title="Ventas del día" value={formatRD(ventasHoy)} icon={Receipt} accent /></div>
        <div id="tour-kpi-activas"><KPI title="Órdenes activas" value={String(activas.length)} icon={Package} sub="Pendientes de procesar" /></div>
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

      {/* Órdenes recientes */}
      <Card className="mt-6 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="font-display text-xl">Órdenes recientes</div>
            <div className="text-sm text-muted-foreground">Últimas {Math.min(8, ordenes.length)} de {ordenes.length}</div>
          </div>
          <Link to="/t/$slug/ordenes" params={{ slug: tenant.slug }} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Ver todas <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 text-left font-medium">Número</th>
                <th className="py-2 text-left font-medium">Cliente</th>
                <th className="py-2 text-left font-medium">Estado</th>
                <th className="py-2 text-right font-medium">Total</th>
                <th className="py-2 text-right font-medium">Creada</th>
              </tr>
            </thead>
            <tbody>
              {[...ordenes].sort((a, b) => +new Date(b.creado_en) - +new Date(a.creado_en)).slice(0, 8).map((o) => {
                const c = clientes.find((x) => x.id === o.cliente_id);
                return (
                  <tr key={o.id} className="border-b border-border/50 transition hover:bg-accent/40">
                    <td className="py-3 font-mono text-xs font-medium">{o.numero}</td>
                    <td className="py-3">
                      <div className="max-w-[250px] truncate" title={c?.nombre || ""}>
                        {c?.nombre || "—"}
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                        o.estado === "RECIBIDA" ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400" :
                        o.estado === "EN_PROCESO" ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400" :
                        (o.estado === "LISTA" || o.estado === "PAGADA") ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400" :
                        o.estado === "ENTREGADA" ? "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-400" :
                        o.estado === "ANULADA" ? "border-red-200 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400" :
                        "border-zinc-200 bg-zinc-50 text-zinc-600"
                      }`}>
                        {o.estado === "RECIBIDA" && <Inbox className="h-3 w-3" />}
                        {o.estado === "EN_PROCESO" && <RefreshCw className="h-3 w-3" />}
                        {(o.estado === "LISTA" || o.estado === "PAGADA") && <CircleCheck className="h-3 w-3" />}
                        {o.estado === "ENTREGADA" && <Truck className="h-3 w-3" />}
                        {o.estado === "ANULADA" && <Ban className="h-3 w-3" />}
                        {o.estado.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 text-right font-medium">{formatRD(o.total)}</td>
                    <td className="py-3 text-right text-xs text-muted-foreground">{formatDateTimeRD(o.creado_en)}</td>
                  </tr>
                );
              })}
              {ordenes.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Aún no hay órdenes.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function KPI({ title, value, sub, icon: Icon, accent, warn }: { title: string; value: string; sub?: string; icon: typeof Receipt; accent?: boolean; warn?: boolean }) {
  return (
    <Card className={`p-5 ${accent ? "bg-gradient-primary text-white" : ""} ${warn ? "border-warning/40" : ""}`}>
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
