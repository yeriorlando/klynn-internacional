import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { encodeCuadreEscPos, printDirectRaw } from "@/lib/impresora";
import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Wallet,
  Lock,
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Plus,
  CheckCircle2,
  Printer,
  Search,
  FileText,
  PiggyBank,
  Coins,
  CreditCard,
  ShieldCheck,
  Landmark,
  ChevronLeft,
  ChevronRight,
  Sunrise,
  Sun,
  Moon,
  Unlock,
  Sparkles,
  Clock,
  Banknote,
  Check,
  Loader2,
  ArrowLeftRight,
  History,
} from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import {
  getCajaAbierta,
  getCajas,
  getMovimientos,
  saveCaja,
  saveMovimiento,
  saveTenant,
  saveGasto,
  formatRD,
  formatDateTimeRD,
  uid,
  CATEGORIAS_GASTOS,
  formatAmountInput,
  parseAmount,
  getHistoricoCierres,
  getEmpleados,
  getOrdenesByPeriod,
  type Caja,
  type TipoMovimiento,
  type MetodoPago,
  type Empleado,
  type Orden,
  type Tenant,
  type MovimientoCaja,
  type ECFConfig,
  type ECFDocument,
} from "@/lib/storage";
import { getECFConfig, getECFDocuments, getEF2Client, isECFReady } from "@/lib/fiscal";
import {
  useCajaAbierta,
  useCajas,
  useMovimientos,
  useECFConfig,
  useECFDocuments,
  useEmpleados,
  useOrdenes,
} from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { BarChart3, Rocket, Activity, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/t/$slug/caja")({
  component: CajaPage,
});

function CajaPage() {
  const user = useRequireAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tenant = user?.tenant as Tenant;
  const empleado = user?.empleado as Empleado;
  const tenantId = tenant?.id || "";

  const [showApertura, setShowApertura] = useState(false);
  const [showMov, setShowMov] = useState<TipoMovimiento | null>(null);
  const [showCierre, setShowCierre] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const [showCuadre, setShowCuadre] = useState(false);
  const [showCajaChica, setShowCajaChica] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [selectedPrintCaja, setSelectedPrintCaja] = useState<Caja | null>(null);
  const [printOrders, setPrintOrders] = useState<Orden[]>([]);
  const [printMovs, setPrintMovs] = useState<MovimientoCaja[]>([]);
  const [cierrePage, setCierrePage] = useState(1);
  const [movsPage, setMovsPage] = useState(1);
  const [showMovimientosPrint, setShowMovimientosPrint] = useState(false);

  const { data: caja, isLoading: loadingCaja } = useCajaAbierta(tenantId);
  const { data: todas = [], isLoading: loadingTodas } = useCajas(tenantId);
  const { data: movsData = [], isLoading: loadingMovs } = useMovimientos(tenantId, caja?.id);
  const movs = caja ? movsData : [];
  const { data: fiscalConfigData } = useECFConfig(tenantId);
  const { data: fiscalDocs = [] } = useECFDocuments(tenantId);
  const { data: ordenesList = [] } = useOrdenes(tenantId);
  const { data: empleados = [] } = useEmpleados(tenantId);
  const fiscalConfig = fiscalConfigData || null;
  const loading = loadingCaja || loadingTodas || (!!caja && loadingMovs);

  // getMovimientos ya entrega los registros del más reciente al más antiguo.
  // La primera página debe mostrar inmediatamente egresos y reembolsos nuevos.
  const orderedMovs = useMemo(
    () => [...movs].sort((a, b) => +new Date(b.creado_en) - +new Date(a.creado_en)),
    [movs],
  );
  const totalMovsPages = Math.ceil(orderedMovs.length / 10);
  const currentMovs = useMemo(
    () => orderedMovs.slice((movsPage - 1) * 10, movsPage * 10),
    [orderedMovs, movsPage],
  );
  const newestMovId = orderedMovs[0]?.id;

  // Si entra un movimiento nuevo mientras el usuario está en otra página,
  // regresar al inicio para hacerlo visible de inmediato.
  useEffect(() => {
    if (newestMovId) setMovsPage(1);
  }, [newestMovId]);

  const ventasEf = movs
    .filter((m) => m.tipo === "VENTA" && m.metodo === "EFECTIVO")
    .reduce((s, m) => s + m.monto, 0);
  const ventasTar = movs
    .filter((m) => m.tipo === "VENTA" && m.metodo === "TARJETA")
    .reduce((s, m) => s + m.monto, 0);
  const ventasTrans = movs
    .filter((m) => m.tipo === "VENTA" && m.metodo === "TRANSFERENCIA")
    .reduce((s, m) => s + m.monto, 0);
  const otrosIng =
    movs
      .filter((m) => m.tipo === "INGRESO" || m.tipo === "ABONO")
      .reduce((s, m) => s + m.monto, 0) - (caja?.monto_inicial || 0);
  const egresos = movs
    .filter((m) => ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA"].includes(m.tipo))
    .reduce((s, m) => s + m.monto, 0);
  const efectivoEsperado = (caja?.monto_inicial || 0) + ventasEf + otrosIng - egresos;

  const closedCierres = todas
    .filter((c) => c.estado === "CERRADA")
    .sort(
      (a, b) => +new Date(b.cerrada_en || b.abierta_en) - +new Date(a.cerrada_en || a.abierta_en),
    );
  const totalCierrePages = Math.ceil(closedCierres.length / 5);
  const currentCierres = closedCierres.slice((cierrePage - 1) * 5, cierrePage * 5);

  async function handlePrintCierreHistorico(c: Caja) {
    const toastId = toast.loading("Preparando cuadre para impresión...");
    try {
      // Fetch orders within the exact period (ISO timestamps)
      const ordsData = await getOrdenesByPeriod({
        tenant_id: tenantId,
        desde: c.abierta_en,
        hasta: c.cerrada_en || new Date().toISOString(),
      });
      setPrintOrders(ordsData || []);

      // Fetch movements within the exact period
      const allMovs = await getMovimientos(tenantId);
      let filteredMovs = allMovs.filter((m) => {
        const created = m.creado_en || new Date().toISOString();
        return created >= c.abierta_en && created <= (c.cerrada_en || new Date().toISOString());
      });
      filteredMovs.sort((a, b) => +new Date(a.creado_en) - +new Date(b.creado_en));
      setPrintMovs(filteredMovs);

      setSelectedPrintCaja(c);
      toast.dismiss(toastId);
    } catch (err) {
      console.error(err);
      toast.error("Error al preparar impresión");
      toast.dismiss(toastId);
    }
  }

  if (!user || user.tenant.id === "__loading__" || loadingCaja) {
    return <GlobalPageLoader text="Cargando caja..." />;
  }

  if (selectedPrintCaja) {
    const targetEmp = empleados.find((e) => e.id === selectedPrintCaja.empleado_id);
    const targetEmpName = targetEmp
      ? targetEmp.apellido && targetEmp.apellido !== "null"
        ? `${targetEmp.nombre} ${targetEmp.apellido}`
        : targetEmp.nombre
      : "Cajero";

    return (
      <ReporteCuadreThermal
        ordenes={printOrders}
        movimientos={printMovs}
        tenant={tenant}
        empleadoName={targetEmpName}
        rango={`${formatDateTimeRD(selectedPrintCaja.abierta_en)} - ${formatDateTimeRD(selectedPrintCaja.cerrada_en!)}`}
        formato={tenant.config?.formato_ticket || "80mm"}
        montoInicial={selectedPrintCaja.monto_inicial}
        onBack={() => setSelectedPrintCaja(null)}
      />
    );
  }

  if (showMovimientosPrint && caja) {
    const targetEmp = empleados.find((e) => e.id === caja.empleado_id) || empleado;
    const targetEmpName = targetEmp
      ? targetEmp.apellido && targetEmp.apellido !== "null"
        ? `${targetEmp.nombre} ${targetEmp.apellido}`
        : targetEmp.nombre
      : empleado?.nombre || "Cajero";

    return (
      <ReporteMovimientosTurnoThermal
        caja={caja}
        movimientos={orderedMovs}
        tenant={tenant}
        empleadoName={targetEmpName}
        ventasEf={ventasEf}
        ventasTar={ventasTar}
        ventasTrans={ventasTrans}
        otrosIng={otrosIng}
        egresos={egresos}
        efectivoEsperado={efectivoEsperado}
        formato={tenant.config?.formato_ticket || "80mm"}
        onBack={() => setShowMovimientosPrint(false)}
      />
    );
  }

  return (
    <div>
      <PageHeader title="Caja" description="Apertura, movimientos del turno y cierre con cuadre.">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            type="button"
            onClick={() => navigate({ to: "/t/$slug/cxc", params: { slug: user.tenant.slug } })}
            className="flex items-center gap-2 rounded-xl h-10 px-4 font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
          >
            <CreditCard className="h-4 w-4 text-[#F0B900] shrink-0" />
            <span>Cuentas x Cobrar</span>
          </Button>

          <Button
            type="button"
            onClick={() => setShowCajaChica(true)}
            className="flex items-center gap-2 rounded-xl h-10 px-4 font-extrabold bg-[#F0B900] hover:bg-[#d9a700] text-[#1B4B73] border border-[#F0B900] shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
          >
            <PiggyBank className="h-4 w-4 text-[#1B4B73] shrink-0" />
            <span>Caja Chica</span>
          </Button>

          {!caja ? (
            <Button
              type="button"
              onClick={() => setShowApertura(true)}
              className="flex items-center gap-2 rounded-xl h-10 px-5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
            >
              <Wallet className="h-4 w-4 text-white shrink-0" />
              <span>Abrir caja</span>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setShowCierre(true)}
              className="flex items-center gap-2 rounded-xl h-10 px-5 font-bold bg-rose-600 hover:bg-rose-700 text-white border border-rose-600 shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
            >
              <Lock className="h-4 w-4 text-white shrink-0" />
              <span>Cerrar caja</span>
            </Button>
          )}
        </div>
      </PageHeader>

      {!caja && (
        <Card className="p-12 text-center rounded-3xl border bg-white dark:bg-slate-900 shadow-xs">
          <Wallet className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
          <h3 className="font-display text-2xl font-black text-slate-800 dark:text-slate-100">No hay caja abierta</h3>
          <p className="mt-1 text-sm text-muted-foreground">Abre la caja para comenzar el turno.</p>
          <Button
            type="button"
            onClick={() => setShowApertura(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl h-10 px-8 font-bold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm"
          >
            <Wallet className="h-4 w-4 text-white shrink-0" />
            <span>Abrir caja ahora</span>
          </Button>
        </Card>
      )}

      {caja && (
        <>
          {/* 4 EXECUTIVE KPI CARDS EN CAJA */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Efectivo en Caja (Variant: Solid Azul Añil #1B4B73) */}
            <Card className="p-4 sm:p-4.5 rounded-2xl bg-[#1B4B73] text-white shadow-md border-0 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-[13px] uppercase tracking-wider text-white/90 font-black">Efectivo en Caja</span>
                <Coins className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-[#F0B900]" />
              </div>
              <div className="my-1.5 font-display font-black tracking-tight text-white text-xl sm:text-2xl truncate" title={formatRD(efectivoEsperado)}>
                {formatRD(efectivoEsperado)}
              </div>
              <div className="text-xs sm:text-[13px] font-semibold truncate text-white/90">
                Total esperado en gaveta
              </div>
            </Card>

            {/* 2. Ventas Efectivo (Variant: Emerald / Menta) */}
            <Card className="p-4 sm:p-4.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-[13px] uppercase tracking-wider text-emerald-800 dark:text-emerald-300 font-black">Ventas Efectivo</span>
                <Banknote className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="my-1.5 font-display font-black tracking-tight text-foreground text-xl sm:text-2xl truncate" title={formatRD(ventasEf)}>
                {formatRD(ventasEf)}
              </div>
              <div className="text-xs sm:text-[13px] font-bold truncate text-emerald-800 dark:text-emerald-300">
                Cobrado en efectivo
              </div>
            </Card>

            {/* 3. Ventas Tarjeta (Variant: Indigo / Azul) */}
            <Card className="p-4 sm:p-4.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-[13px] uppercase tracking-wider text-indigo-800 dark:text-indigo-300 font-black">Ventas Tarjeta</span>
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="my-1.5 font-display font-black tracking-tight text-foreground text-xl sm:text-2xl truncate" title={formatRD(ventasTar)}>
                {formatRD(ventasTar)}
              </div>
              <div className="text-xs sm:text-[13px] font-bold truncate text-indigo-800 dark:text-indigo-300">
                Cobrado con tarjeta
              </div>
            </Card>

            {/* 4. Ventas Transferencia (Variant: Sky / Celeste) */}
            <Card className="p-4 sm:p-4.5 rounded-2xl bg-sky-500/10 border border-sky-500/25 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-[13px] uppercase tracking-wider text-sky-800 dark:text-sky-300 font-black">Ventas Transferencia</span>
                <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="my-1.5 font-display font-black tracking-tight text-foreground text-xl sm:text-2xl truncate" title={formatRD(ventasTrans)}>
                {formatRD(ventasTrans)}
              </div>
              <div className="text-xs sm:text-[13px] font-bold truncate text-sky-800 dark:text-sky-300">
                Transferencias y digital
              </div>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="p-5">
              <div className="text-xs uppercase text-muted-foreground">Apertura</div>
              <div className="mt-1 font-display text-xl font-black">
                {formatRD(caja.monto_inicial)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDateTimeRD(caja.abierta_en)}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Empleado: <span className="font-bold text-foreground">{empleado.nombre}</span>
              </div>
              {caja.notas_apertura && (
                <div className="mt-3">
                  {/mañana/i.test(caja.notas_apertura) ? (
                    <Badge
                      variant="outline"
                      className="bg-orange-500/10 text-orange-700 border-orange-500/20 gap-1.5 py-1 px-3 font-bold"
                    >
                      🌅 Turno: Mañana
                    </Badge>
                  ) : /tarde/i.test(caja.notas_apertura) ? (
                    <Badge
                      variant="outline"
                      className="bg-sky-500/10 text-sky-700 border-sky-500/20 gap-1.5 py-1 px-3 font-bold"
                    >
                      ☀️ Turno: Tarde
                    </Badge>
                  ) : /noche/i.test(caja.notas_apertura) ? (
                    <Badge
                      variant="outline"
                      className="bg-indigo-500/10 text-indigo-700 border-indigo-500/20 gap-1.5 py-1 px-3 font-bold"
                    >
                      🌙 Turno: Noche
                    </Badge>
                  ) : (
                    <div className="rounded bg-surface-elevated p-2 text-xs">
                      {caja.notas_apertura}
                    </div>
                  )}
                </div>
              )}
            </Card>
            <Card className="p-5">
              <div className="text-xs uppercase text-muted-foreground font-bold tracking-wider mb-3">
                Acciones rápidas
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMov("INGRESO")}
                  className="bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border-emerald-200/80 font-bold dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 shadow-2xs h-9"
                >
                  <ArrowDownLeft className="mr-1.5 h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />{" "}
                  Ingreso
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMov("EGRESO")}
                  className="bg-rose-50 hover:bg-rose-100/80 text-rose-700 border-rose-200/80 font-bold dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 shadow-2xs h-9"
                >
                  <ArrowUpRight className="mr-1.5 h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />{" "}
                  Egreso
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMov("RETIRO")}
                  className="bg-amber-50 hover:bg-amber-100/80 text-amber-700 border-amber-200/80 font-bold dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 shadow-2xs h-9"
                >
                  <Landmark className="mr-1.5 h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />{" "}
                  Retiro
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMov("GASTO_CAJA_CHICA")}
                  className="bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 border-indigo-200/80 font-bold dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800 shadow-2xs h-9"
                >
                  <PiggyBank className="mr-1.5 h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />{" "}
                  Caja chica
                </Button>
              </div>
            </Card>
            <Card className="p-5">
              <div className="text-xs uppercase text-muted-foreground">Resumen del turno</div>
              <div className="mt-2 space-y-1 text-sm">
                <Row k="Movimientos" v={String(movs.length)} />
                <Row k="Otros ingresos" v={formatRD(otrosIng)} />
                <Row k="Egresos / gastos" v={formatRD(egresos)} className="text-destructive" />
                <div className="border-t border-border pt-1.5">
                  <Row k="Total esperado" v={formatRD(efectivoEsperado)} bold />
                </div>
              </div>
            </Card>
          </div>

          <Card className="mt-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="font-display text-lg flex items-center gap-2 font-bold text-foreground">
                <ArrowLeftRight className="h-5 w-5 text-primary shrink-0" />
                <span>Movimientos del turno</span>
              </h3>
              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowMovimientosPrint(true)}
                  disabled={movs.length === 0}
                  className="h-8 gap-1.5 font-bold text-xs border-primary/40 text-primary hover:bg-primary/10 cursor-pointer shadow-2xs"
                  title="Imprimir ticket 80mm de auditoría con todos los movimientos del turno"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Imprimir</span>
                </Button>
                <Badge className="bg-primary text-white hover:bg-primary border-none font-bold">
                  {movs.length}
                </Badge>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-surface-elevated text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Hora</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-left">Concepto</th>
                    <th className="px-4 py-3 text-left">Método</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {currentMovs.map((m) => (
                    <tr key={m.id} className="border-b border-border/50 hover:bg-accent/30">
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {new Date(m.creado_en).toLocaleTimeString("es-DO", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-2.5">
                        {m.tipo === "VENTA" && (
                          <Badge className="bg-success text-white hover:bg-success/90 border-none gap-1 font-bold">
                            <Plus className="h-3 w-3" /> VENTA
                          </Badge>
                        )}
                        {m.tipo === "INGRESO" && (
                          <Badge className="bg-success text-white hover:bg-success/90 border-none gap-1 font-bold">
                            <ArrowDownLeft className="h-3 w-3" /> Ingreso
                          </Badge>
                        )}
                        {(m.tipo === "EGRESO" ||
                          m.tipo === "RETIRO" ||
                          m.tipo === "GASTO_CAJA_CHICA") && (
                          <Badge className="bg-destructive text-white hover:bg-destructive/90 border-none gap-1 font-bold">
                            <ArrowUpRight className="h-3 w-3" />{" "}
                            {m.tipo === "GASTO_CAJA_CHICA"
                              ? "Gasto de Caja Chica"
                              : m.tipo.charAt(0) + m.tipo.slice(1).toLowerCase()}
                          </Badge>
                        )}
                        {m.tipo === "ABONO" && (
                          <Badge className="bg-blue-600 text-white hover:bg-blue-700 border-none gap-1 font-bold">
                            <Plus className="h-3 w-3" /> ABONO
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {m.concepto.startsWith("Cobro de saldo orden #") ? (
                          (() => {
                            const rest = m.concepto.substring("Cobro de saldo orden #".length);
                            const orderNumMatch = rest.match(/^[A-Za-z0-9-]+/);
                            const orderNum = orderNumMatch ? orderNumMatch[0] : "";
                            const dbOrder = ordenesList.find((o) => o.numero === orderNum);
                            const cleanExtra = dbOrder
                              ? dbOrder.estado === "ENTREGADA"
                                ? "ENTREGADA"
                                : "NO ENTREGADA"
                              : rest
                                  .substring(orderNum.length)
                                  .trim()
                                  .replace(/^\((.*)\)$/, "$1");

                            return (
                              <div className="flex flex-col leading-tight">
                                <span className="text-muted-foreground text-[11px]">
                                  Cobro de saldo orden
                                </span>
                                <span className="font-mono text-xs font-bold text-[#2c4e82] dark:text-[#5c85c2]">
                                  {orderNum}
                                </span>
                                {cleanExtra && (
                                  <span
                                    className={`text-[10px] font-bold uppercase tracking-wider ${
                                      cleanExtra.toLowerCase().includes("no entregada")
                                        ? "text-amber-600 dark:text-amber-400"
                                        : "text-emerald-600 dark:text-emerald-400"
                                    }`}
                                  >
                                    {cleanExtra}
                                  </span>
                                )}
                              </div>
                            );
                          })()
                        ) : m.concepto.startsWith("Venta orden #") ? (
                          (() => {
                            const orderNum = m.concepto.substring("Venta orden #".length);
                            return (
                              <div className="flex items-center gap-1.5 py-0.5">
                                <span className="text-foreground text-xs">Venta orden</span>
                                <Badge className="bg-primary text-white hover:bg-primary border-none font-bold font-mono text-[12px] py-0.5 px-2 rounded-md">
                                  {orderNum}
                                </Badge>
                              </div>
                            );
                          })()
                        ) : m.concepto.startsWith("Abono inicial orden #") ? (
                          (() => {
                            const orderNum = m.concepto.substring("Abono inicial orden #".length);
                            return (
                              <div className="flex items-center gap-1.5 py-0.5">
                                <span className="text-foreground text-xs">Abono inicial orden</span>
                                <Badge className="bg-primary text-white hover:bg-primary border-none font-bold font-mono text-[12px] py-0.5 px-2 rounded-md">
                                  {orderNum}
                                </Badge>
                              </div>
                            );
                          })()
                        ) : m.concepto.startsWith("Reembolso:") ? (
                          (() => {
                            const relatedOrder = ordenesList.find((orden) => orden.id === m.orden_id);
                            const e34 = relatedOrder?.nota_credito_ncf ||
                              (m.referencia?.startsWith("DGII:E34:")
                                ? m.referencia.substring("DGII:E34:".length)
                                : "");
                            return (
                              <div className="flex flex-wrap items-center gap-1.5 py-0.5">
                                <span className="font-bold">Reembolso:</span>
                                <span>{m.concepto.substring("Reembolso:".length)}</span>
                                {e34 ? (
                                  <Badge className="gap-1 border-none bg-blue-600 px-2 py-0.5 text-[10px] font-extrabold text-white hover:bg-blue-600">
                                    <ShieldCheck className="h-3 w-3" /> DGII · E34
                                    <span className="font-mono">{e34}</span>
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="gap-1 border-slate-300 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:border-slate-600 dark:text-slate-300">
                                    <FileText className="h-3 w-3" /> Anulación interna
                                  </Badge>
                                )}
                              </div>
                            );
                          })()
                        ) : (
                          m.concepto
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs">{m.metodo || "—"}</td>
                      <td
                        className={`px-4 py-2.5 text-right font-medium ${["EGRESO", "RETIRO", "GASTO_CAJA_CHICA"].includes(m.tipo) ? "text-destructive" : "text-success"}`}
                      >
                        {["EGRESO", "RETIRO", "GASTO_CAJA_CHICA"].includes(m.tipo) ? "−" : "+"}
                        {formatRD(m.monto)}
                      </td>
                    </tr>
                  ))}
                  {currentMovs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        Sin movimientos en este turno aún
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalMovsPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-elevated">
                <span className="text-xs text-muted-foreground">
                  Mostrando {(movsPage - 1) * 10 + 1} al{" "}
                  {Math.min(movsPage * 10, orderedMovs.length)} de {orderedMovs.length}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setMovsPage((p) => Math.max(1, p - 1))}
                    disabled={movsPage === 1}
                    className="h-8 rounded-xl text-xs font-bold transition-all active:scale-[0.98] bg-primary text-white hover:bg-primary/90 cursor-pointer"
                  >
                    <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Anterior
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setMovsPage((p) => Math.min(totalMovsPages, p + 1))}
                    disabled={movsPage === totalMovsPages}
                    className="h-8 rounded-xl text-xs font-bold transition-all active:scale-[0.98] bg-primary text-white hover:bg-primary/90 cursor-pointer"
                  >
                    Siguiente <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Histórico */}
      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="font-display text-lg flex items-center gap-2 font-bold text-foreground">
            <History className="h-5 w-5 text-primary shrink-0" />
            <span>Histórico de cierres</span>
          </h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => setShowCuadre(true)}
              className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 shadow-sm transition-all gap-1.5 px-4"
            >
              <FileText className="h-4 w-4" />
              <span className="font-bold">Imprimir Cuadre</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setShowHistorico(true)}
              className="bg-gradient-primary text-white shadow-sm hover:shadow-md transition-all gap-1.5 px-4"
            >
              <Printer className="h-4 w-4" />
              <span className="font-bold">Imprimir Cierres</span>
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-elevated text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Apertura</th>
                <th className="px-4 py-3 text-left">Cierre</th>
                <th className="px-4 py-3 text-right">Inicial</th>
                <th className="px-4 py-3 text-right">Esperado</th>
                <th className="px-4 py-3 text-right">Contado</th>
                <th className="px-4 py-3 text-right">Diferencia</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {currentCierres.map((c) => (
                <tr key={c.id} className="border-b border-border/50">
                  <td className="px-4 py-2.5 text-xs">{formatDateTimeRD(c.abierta_en)}</td>
                  <td className="px-4 py-2.5 text-xs">
                    {c.cerrada_en && formatDateTimeRD(c.cerrada_en)}
                  </td>
                  <td className="px-4 py-2.5 text-right">{formatRD(c.monto_inicial)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {formatRD(c.monto_esperado_efectivo || 0)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {formatRD(c.monto_contado_efectivo || 0)}
                  </td>
                  {(() => {
                    const difEf =
                      (c.monto_contado_efectivo || 0) - (c.monto_esperado_efectivo || 0);
                    return (
                      <td
                        className={`px-4 py-2.5 text-right font-medium ${difEf === 0 ? "" : difEf < 0 ? "text-destructive" : "text-success"}`}
                      >
                        {formatRD(difEf)}
                      </td>
                    );
                  })()}
                  <td className="px-4 py-2.5 text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrintCierreHistorico(c)}
                      className="h-8 gap-1.5 border-emerald-500/20 text-emerald-600 hover:bg-emerald-50 font-bold"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Imprimir
                    </Button>
                  </td>
                </tr>
              ))}
              {currentCierres.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    Sin cierres aún
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalCierrePages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-elevated">
            <span className="text-xs text-muted-foreground">
              Mostrando {(cierrePage - 1) * 5 + 1} al{" "}
              {Math.min(cierrePage * 5, closedCierres.length)} de {closedCierres.length}
            </span>
            <div className="flex gap-1">
              <Button
                variant="default"
                size="sm"
                onClick={() => setCierrePage((p) => Math.max(1, p - 1))}
                disabled={cierrePage === 1}
                className="h-8 rounded-xl text-xs font-bold transition-all active:scale-[0.98] bg-primary text-white hover:bg-primary/90"
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Anterior
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setCierrePage((p) => Math.min(totalCierrePages, p + 1))}
                disabled={cierrePage === totalCierrePages}
                className="h-8 rounded-xl text-xs font-bold transition-all active:scale-[0.98] bg-primary text-white hover:bg-primary/90"
              >
                Siguiente <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <AperturaDialog
        open={showApertura}
        onOpenChange={setShowApertura}
        tenantId={tenant.id}
        empleadoId={empleado.id}
        onDone={async () => {
          await queryClient.invalidateQueries({ queryKey: ["caja-abierta", tenantId] });
          await queryClient.invalidateQueries({ queryKey: ["cajas", tenantId] });
          await queryClient.invalidateQueries({ queryKey: ["movimientos", tenantId] });
          setRefresh((r) => r + 1);
        }}
      />
      <MovDialog
        tipo={showMov}
        onClose={() => setShowMov(null)}
        caja={caja}
        empleadoId={empleado.id}
        tenantId={tenant.id}
        tenant={tenant}
        onDone={async () => {
          await queryClient.invalidateQueries({ queryKey: ["movimientos", tenantId, caja?.id] });
          setRefresh((r) => r + 1);
        }}
      />
      <CierreDialog
        open={showCierre}
        onOpenChange={setShowCierre}
        caja={caja}
        tenant={tenant}
        empleadoName={
          empleado.apellido && empleado.apellido !== "null"
            ? `${empleado.nombre} ${empleado.apellido}`
            : empleado.nombre
        }
        efectivoEsperado={efectivoEsperado}
        ventasTar={ventasTar}
        ventasTrans={ventasTrans}
        totalRecaudado={ventasEf + otrosIng + ventasTar + ventasTrans}
        umbral={tenant.config?.umbral_diferencia_caja || 100}
        empleadoPin={empleado.pin}
        empleadoRol={empleado.rol}
        onDone={async () => {
          await queryClient.invalidateQueries({ queryKey: ["caja-abierta", tenantId] });
          await queryClient.invalidateQueries({ queryKey: ["cajas", tenantId] });
          await queryClient.invalidateQueries({ queryKey: ["movimientos", tenantId] });
          setRefresh((r) => r + 1);
        }}
      />
      <HistoricoCierresDialog
        open={showHistorico}
        onOpenChange={setShowHistorico}
        tenant={tenant}
        empleadoId={empleado?.id}
      />
      <HistoricoCuadreDialog
        open={showCuadre}
        onOpenChange={setShowCuadre}
        tenant={tenant}
        empleadoId={empleado?.id}
      />
      <SetCajaChicaDialog
        open={showCajaChica}
        onOpenChange={setShowCajaChica}
        tenant={tenant}
        cajaId={caja?.id}
        empleadoId={empleado?.id}
        onDone={() => {
          queryClient.invalidateQueries({ queryKey: ["tenant"] });
          setRefresh((r) => r + 1);
        }}
      />
    </div>
  );
}

function FiscalSummary({
  config,
  docs,
  onRefresh,
}: {
  config: ECFConfig | null;
  docs: ECFDocument[];
  onRefresh: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [showResumen, setShowResumen] = useState(false);

  // Calcular métricas del mes actual
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const docsMes = docs.filter((d) => new Date(d.fecha_emision) >= inicioMes);
  const totalEmitido = docsMes.reduce((s, d) => s + d.monto_total, 0);
  const count = docsMes.length;

  // Verificación de la integración EF2 guardada en el servidor.
  async function handleRegister() {
    if (!config) return;
    setLoading(true);
    try {
      const result = await getEF2Client({ tenantId: config.tenant_id, environment: config.ef2_environment }).verificarToken();
      if (!result.success) throw new Error(result.message || "EF2 rechazó las credenciales.");
      toast.success("¡Conexión con EF2 verificada! 🚀");
      onRefresh();
    } catch (err: any) {
      toast.error("Error al registrar: " + (err.message || "Servicio no disponible"));
    } finally {
      setLoading(false);
    }
  }

  // Si no está configurado, mostrar el botón de "Cohete" para registro rápido
  if (!isECFReady(config)) {
    return (
      <Button
        variant="outline"
        onClick={handleRegister}
        disabled={loading || !config}
        className="border-primary/30 text-primary hover:bg-primary/5 gap-2 font-bold shadow-sm"
      >
        <Rocket className={`h-4 w-4 ${loading ? "animate-bounce" : ""}`} />
        {loading ? "Configurando..." : "Activar Fiscal"}
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowResumen(true)}
        className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5 gap-2 font-bold shadow-sm"
      >
        <BarChart3 className="h-4 w-4" /> Resumen Fiscal
      </Button>

      <Dialog open={showResumen} onOpenChange={setShowResumen}>
        <DialogContent className="max-w-md rounded-3xl border-none shadow-elegant">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/10 p-2.5 rounded-2xl text-emerald-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-display font-black">
                  Resumen Fiscal
                </DialogTitle>
                <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">
                  Mes actual: {hoy.toLocaleDateString("es-DO", { month: "long", year: "numeric" })}
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="py-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-muted/30 p-4 border border-border/50">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">
                  Documentos
                </div>
                <div className="text-2xl font-display font-black">{count}</div>
              </div>
              <div className="rounded-2xl bg-primary/5 p-4 border border-primary/10">
                <div className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-1">
                  Total Emitido
                </div>
                <div className="text-2xl font-display font-black text-primary">
                  {formatRD(totalEmitido)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  Actividad Mensual
                </div>
                <div className="text-xs font-bold text-emerald-600">
                  {count > 0 ? "Saludable" : "Sin actividad"}
                </div>
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted/30">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: count > 0 ? "100%" : "0%" }}
                  transition={{ duration: 1 }}
                  className="h-full bg-emerald-500"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-500/5 p-4 flex items-center gap-3 border border-emerald-500/10">
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
              <div className="text-xs text-emerald-800 leading-tight">
                Tu integración con <span className="font-bold">EF2 e-CF</span> está activa y
                enviando datos correctamente a la DGII.
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full rounded-2xl bg-slate-900 text-white font-bold"
              onClick={() => setShowResumen(false)}
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function KPI({ t, v, accent }: { t: string; v: string; accent?: boolean }) {
  return (
    <Card className={`p-5 ${accent ? "bg-gradient-primary text-white" : ""}`}>
      <div className={`text-xs uppercase ${accent ? "text-white/80" : "text-muted-foreground"}`}>
        {t}
      </div>
      <div className="mt-1 font-display text-2xl font-black">{v}</div>
    </Card>
  );
}
function Row({
  k,
  v,
  bold,
  className = "",
}: {
  k: string;
  v: string;
  bold?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold" : ""} ${className}`}>
      <span className="text-muted-foreground">{k}</span>
      <span>{v}</span>
    </div>
  );
}

function AmountField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-[12px] font-black uppercase tracking-widest text-foreground px-1 text-center w-full">
        {label}
      </Label>
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 font-display text-sm font-bold text-primary/30 group-focus-within:text-primary/50 transition-colors">
          RD$
        </div>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(formatAmountInput(e.target.value))}
          onBlur={() => {
            const n = parseAmount(value);
            if (n === 0) onChange("");
            else
              onChange(
                n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
              );
          }}
          placeholder="0.00"
          className="h-20 w-full px-6 text-center font-display text-4xl font-bold text-primary rounded-2xl border-2 border-slate-200 bg-white shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none placeholder:text-slate-100"
        />
      </div>
    </div>
  );
}

function MorningShiftIcon({ className = "h-11 w-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="morningSky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF7ED" />
          <stop offset="100%" stopColor="#FED7AA" />
        </linearGradient>
        <linearGradient id="morningSun" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
        <linearGradient id="morningHills" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDBA74" />
          <stop offset="100%" stopColor="#C2410C" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#morningSky)" />
      {/* Sun rays */}
      <path d="M24 8V5M13 14L10 11M35 14L38 11" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
      {/* Rising Sun */}
      <circle cx="24" cy="27" r="11" fill="url(#morningSun)" />
      {/* Horizon wave / Landscape */}
      <path d="M4 33C11 31 17 34 24 32C31 30 37 33 44 31V44H4V33Z" fill="url(#morningHills)" opacity="0.9" />
      <path d="M4 37C11 36 18 38 25 36.5C32 35 38 37 44 36V44H4V37Z" fill="#9A3412" />
    </svg>
  );
}

function AfternoonShiftIcon({ className = "h-11 w-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="afternoonSky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F0F9FF" />
          <stop offset="100%" stopColor="#BAE6FD" />
        </linearGradient>
        <linearGradient id="afternoonSun" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#afternoonSky)" />
      {/* Radiant Glow */}
      <circle cx="24" cy="23" r="15" fill="#FEF3C7" opacity="0.7" />
      {/* Solar Rays */}
      <g stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round">
        <line x1="24" y1="5" x2="24" y2="8" />
        <line x1="24" y1="38" x2="24" y2="41" />
        <line x1="6" y1="23" x2="9" y2="23" />
        <line x1="39" y1="23" x2="42" y2="23" />
        <line x1="11" y1="10" x2="13.5" y2="12.5" />
        <line x1="34.5" y1="33.5" x2="37" y2="36" />
        <line x1="11" y1="36" x2="13.5" y2="33.5" />
        <line x1="34.5" y1="12.5" x2="37" y2="10" />
      </g>
      {/* Bright Sun */}
      <circle cx="24" cy="23" r="9.5" fill="url(#afternoonSun)" />
      {/* Crisp White Cloud */}
      <path d="M31 35C34 35 36.5 32.8 36.5 30C36.5 27.5 34.5 25.4 32 25.1C31.5 22 28.8 19.5 25.5 19.5C21.8 19.5 18.8 22.5 18.8 26.2C18.8 26.5 18.8 26.8 18.9 27.1C17.3 27.7 16.2 29.2 16.2 31C16.2 33.2 18.2 35 20.5 35H31Z" fill="#FFFFFF" fillOpacity="0.95" />
    </svg>
  );
}

function NightShiftIcon({ className = "h-11 w-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="nightSky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#312E81" />
        </linearGradient>
        <linearGradient id="moonGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#FACC15" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#nightSky)" />
      {/* Little Stars */}
      <circle cx="11" cy="13" r="1.4" fill="#FDE047" opacity="0.9" />
      <circle cx="37" cy="11" r="1.2" fill="#FFFFFF" opacity="0.8" />
      <circle cx="35" cy="35" r="1.3" fill="#FDE047" opacity="0.8" />
      <circle cx="13" cy="37" r="1" fill="#FFFFFF" opacity="0.7" />
      <path d="M37 19L38 21L40 22L38 23L37 25L36 23L34 22L36 21L37 19Z" fill="#FDE047" opacity="0.85" />
      {/* Crescent Moon */}
      <path
        d="M26.5 12C20.1 12 15 17.1 15 23.5C15 29.9 20.1 35 26.5 35C29.4 35 32.1 33.9 34.2 32.1C30.2 31.6 27 28.2 27 24.1C27 20 30.2 16.6 34.2 16.1C32.1 14.3 29.4 13.2 26.5 12Z"
        fill="url(#moonGlow)"
      />
    </svg>
  );
}

function AperturaDialog({
  open,
  onOpenChange,
  tenantId,
  empleadoId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tenantId: string;
  empleadoId: string;
  onDone: () => Promise<void> | void;
}) {
  const [montoStr, setMontoStr] = useState<string>("");
  const [turno, setTurno] = useState<"Mañana" | "Tarde" | "Noche">("Mañana");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const monto = parseAmount(montoStr);
    if (monto <= 0) {
      toast.error("Por favor ingresa un monto inicial válido");
      return;
    }
    setLoading(true);
    try {
      const cajaId = uid("caj");
      await saveCaja({
        id: cajaId,
        tenant_id: tenantId,
        empleado_id: empleadoId,
        monto_inicial: monto,
        estado: "ABIERTA",
        abierta_en: new Date().toISOString(),
        notas_apertura: `Turno: ${turno}`,
      });
      await saveMovimiento({
        id: uid("mov"),
        tenant_id: tenantId,
        caja_id: cajaId,
        empleado_id: empleadoId,
        tipo: "INGRESO",
        concepto: "Apertura de caja",
        monto,
        creado_en: new Date().toISOString(),
      });
      toast.success("Caja abierta correctamente 🔓");
      await onDone();
      onOpenChange(false);
      setMontoStr("");
    } catch (err: any) {
      console.error("Error opening box:", err);
      toast.error("Error al abrir caja");
    } finally {
      setLoading(false);
    }
  }

  const TURNOS = [
    {
      id: "Mañana",
      label: "Mañana",
      IconComponent: MorningShiftIcon,
      activeRing: "border-orange-500 bg-orange-500/[0.04] ring-2 ring-orange-500/20 text-orange-950 shadow-xs",
    },
    {
      id: "Tarde",
      label: "Tarde",
      IconComponent: AfternoonShiftIcon,
      activeRing: "border-sky-500 bg-sky-500/[0.04] ring-2 ring-sky-500/20 text-sky-950 shadow-xs",
    },
    {
      id: "Noche",
      label: "Noche",
      IconComponent: NightShiftIcon,
      activeRing: "border-indigo-500 bg-indigo-500/[0.04] ring-2 ring-indigo-500/20 text-indigo-950 shadow-xs",
    },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!loading) onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md rounded-2xl p-5 shadow-2xl border-border/80">
        <DialogHeader className="flex flex-row items-center gap-2.5 space-y-0 pb-0.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 shadow-2xs">
            <Unlock className="h-4 w-4" />
          </div>
          <div>
            <DialogTitle className="font-display text-lg font-bold tracking-tight text-slate-900">
              Apertura de Caja
            </DialogTitle>
            <p className="text-[11px] text-muted-foreground">
              Establece el fondo inicial en efectivo para iniciar operaciones.
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {/* HERO CARD MONTO INICIAL */}
          <div className="rounded-xl border border-slate-200/90 bg-gradient-to-b from-slate-50/70 to-white p-3.5 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                Fondo de Efectivo Inicial
              </span>
              <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded-full">
                Para cambio y vuelto
              </span>
            </div>

            <div className="flex items-center justify-center gap-1.5 py-1">
              <span className="font-display text-2xl font-bold text-slate-400 select-none">
                RD$
              </span>
              <input
                type="text"
                inputMode="decimal"
                autoFocus
                value={montoStr}
                onChange={(e) => setMontoStr(formatAmountInput(e.target.value))}
                placeholder="0.00"
                disabled={loading}
                className="w-full max-w-[220px] bg-transparent text-center font-display text-3xl sm:text-4xl font-black text-slate-900 outline-none placeholder:text-slate-200 tracking-tight"
              />
            </div>

            {/* Presets Rápidos con separación de miles */}
            <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-slate-100 mt-1 flex-wrap">
              {[
                { label: "RD$ 500", val: "500" },
                { label: "RD$ 1,000", val: "1,000" },
                { label: "RD$ 2,000", val: "2,000" },
                { label: "RD$ 3,000", val: "3,000" },
              ].map((p) => {
                const isSelected = parseAmount(montoStr) === parseAmount(p.val) && montoStr !== "";
                return (
                  <button
                    key={p.val}
                    type="button"
                    disabled={loading}
                    onClick={() => setMontoStr(p.val)}
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border transition-all active:scale-95 ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SELECCIONA EL TURNO */}
          <div className="space-y-1.5">
            <Label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Selecciona el Turno Operativo
            </Label>

            <div className="grid grid-cols-3 gap-2.5">
              {TURNOS.map((t) => {
                const Icon = t.IconComponent;
                const sel = turno === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={loading}
                    onClick={() => setTurno(t.id as any)}
                    className={`group relative flex flex-col items-center justify-center rounded-2xl border py-3 px-2 text-center transition-all duration-200 ${
                      sel
                        ? t.activeRing
                        : "border-slate-200/90 bg-white hover:bg-slate-50/80 hover:border-slate-300 text-slate-700 shadow-2xs"
                    } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <Icon className="mb-1.5 h-11 w-11 shrink-0 drop-shadow-xs transition-transform duration-200 group-hover:scale-105" />
                    <div className="text-xs font-bold leading-tight text-slate-800">
                      {t.label}
                    </div>
                    {sel && (
                      <div className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-white shadow-2xs">
                        <Check className="h-2.5 w-2.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 mt-3 pt-2.5 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-9 rounded-xl font-bold border-slate-200 text-slate-700 hover:bg-slate-50 px-3.5 text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-9 px-4 text-xs shadow-xs flex items-center gap-1.5 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Abriendo...</span>
              </>
            ) : (
              <>
                <Unlock className="h-3.5 w-3.5" />
                <span>Abrir Caja</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MovDialog({
  tipo,
  onClose,
  caja,
  empleadoId,
  tenantId,
  tenant,
  onDone,
}: {
  tipo: TipoMovimiento | null;
  onClose: () => void;
  caja: Caja | undefined;
  empleadoId: string;
  tenantId: string;
  tenant: Tenant;
  onDone: () => void;
}) {
  const [concepto, setConcepto] = useState("");
  const [montoStr, setMontoStr] = useState<string>("");
  const monto = parseAmount(montoStr);
  const [metodo, setMetodo] = useState<MetodoPago>("EFECTIVO");
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_GASTOS[0]);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!caja) return;
    if (!concepto.trim()) {
      toast.error("Concepto requerido");
      return;
    }
    if (monto <= 0) {
      toast.error("Monto inválido ⚠️");
      return;
    }
    setLoading(true);
    try {
      const id = uid("mov");
      await saveMovimiento({
        id,
        tenant_id: tenantId,
        caja_id: caja.id,
        empleado_id: empleadoId,
        tipo: tipo!,
        concepto: tipo === "GASTO_CAJA_CHICA" ? `${categoria}: ${concepto}` : concepto,
        monto,
        metodo,
        creado_en: new Date().toISOString(),
      });

      if (tipo === "GASTO_CAJA_CHICA") {
        // Restar del balance de caja chica
        const nuevoActual = (tenant.monto_actual_caja_chica || 0) - monto;
        await saveTenant({ ...tenant, monto_actual_caja_chica: nuevoActual });

        // Crear registro en Gastos
        await saveGasto({
          id: uid("gas"),
          tenant_id: tenantId,
          empleado_id: empleadoId,
          categoria: `Caja Chica: ${categoria}`,
          descripcion: concepto,
          monto,
          metodo_pago: metodo,
          fecha: new Date().toISOString(),
          aprobado: true,
          is_caja_chica: true,
        });
      }

      toast.success("Movimiento registrado 💸");
      onDone();
      onClose();
      setConcepto("");
      setMontoStr("");
    } catch (err: any) {
      console.error("Error creating movement:", err);
      toast.error("Error al registrar movimiento");
    } finally {
      setLoading(false);
    }
  }

  const labels: Record<TipoMovimiento, string> = {
    INGRESO: "Ingreso extra",
    EGRESO: "Egreso",
    RETIRO: "Retiro de caja",
    GASTO_CAJA_CHICA: "Gasto de caja chica",
    VENTA: "Venta",
    ABONO: "Abono",
  };

  return (
    <Dialog
      open={!!tipo}
      onOpenChange={(o) => {
        if (!o && !loading) onClose();
      }}
    >
      <DialogContent className="max-w-md p-5">
        <DialogHeader className="sm:text-center">
          <DialogTitle className="text-xl font-display font-black mx-auto">
            {tipo && labels[tipo]}
          </DialogTitle>
          {tipo === "GASTO_CAJA_CHICA" && (
            <div className="flex flex-col items-center justify-center pt-1">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mb-1">
                Disponible
              </div>
              <div
                className={`text-xl font-display font-bold px-4 py-1 rounded-full bg-slate-50 border border-slate-100 ${(tenant.monto_actual_caja_chica || 0) < 500 ? "text-destructive" : "text-emerald-600"}`}
              >
                {formatRD(tenant.monto_actual_caja_chica || 0)}
              </div>
            </div>
          )}
        </DialogHeader>
        <div className="space-y-2.5">
          {tipo === "GASTO_CAJA_CHICA" && (
            <div>
              <Label className="mb-1.5 block">Categoría</Label>
              <Select value={categoria} onValueChange={setCategoria} disabled={loading}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_GASTOS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="mb-1.5 block">Concepto</Label>
            <Input
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="bg-white"
              disabled={loading}
              placeholder={
                tipo === "INGRESO"
                  ? "Ej. Venta de insumos, servicios extras..."
                  : tipo === "EGRESO"
                    ? "Ej. Pago de factura, compra de suministros..."
                    : tipo === "RETIRO"
                      ? "Ej. Depósito al banco, retiro de efectivo..."
                      : tipo === "GASTO_CAJA_CHICA"
                        ? "Ej. Compra de café, pasajes, limpieza..."
                        : "Describa el motivo del movimiento..."
              }
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Monto</Label>
            <div className="relative group">
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 flex items-center justify-center px-4 border-r border-slate-200 bg-white rounded-l-xl transition-colors group-focus-within:border-primary/30 group-focus-within:bg-primary/5">
                <span className="text-sm font-black text-primary/60">RD$</span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={montoStr}
                onChange={(e) => setMontoStr(formatAmountInput(e.target.value))}
                placeholder="0.00"
                disabled={loading}
                className="h-16 w-full px-6 text-center font-display text-4xl font-bold text-primary tracking-tighter rounded-xl border-2 border-slate-200 bg-white shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none placeholder:text-slate-100"
              />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">Método</Label>
            <Select
              value={metodo}
              onValueChange={(v) => setMetodo(v as MetodoPago)}
              disabled={loading}
            >
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                <SelectItem value="TARJETA">Tarjeta</SelectItem>
                <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} className="h-9 rounded-xl" disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={submit}
            className="bg-gradient-primary text-white h-9 rounded-xl px-8"
            disabled={loading}
          >
            {loading ? "Registrando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CierreDialog({
  open,
  onOpenChange,
  caja,
  tenant,
  empleadoName,
  efectivoEsperado,
  ventasTar,
  ventasTrans,
  totalRecaudado,
  umbral,
  empleadoPin,
  empleadoRol,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  caja: Caja | undefined;
  tenant: Tenant;
  empleadoName: string;
  efectivoEsperado: number;
  ventasTar: number;
  ventasTrans: number;
  totalRecaudado: number;
  umbral: number;
  empleadoPin?: string;
  empleadoRol?: string;
  onDone: () => void;
}) {
  const [contadoEfStr, setContadoEfStr] = useState<string>("");
  const [contadoTarStr, setContadoTarStr] = useState<string>("");
  const [contadoTransStr, setContadoTransStr] = useState<string>("");
  const [notas, setNotas] = useState("");
  const [pin, setPin] = useState("");
  const [showNotas, setShowNotas] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [closedCaja, setClosedCaja] = useState<Caja | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [movimientosPrint, setMovimientosPrint] = useState<MovimientoCaja[]>([]);
  const [showPrint, setShowPrint] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savedTotalRecaudado, setSavedTotalRecaudado] = useState(0);

  useEffect(() => {
    if (open && !showSuccess) {
      setSavedTotalRecaudado(totalRecaudado);
    }
  }, [open, totalRecaudado, showSuccess]);

  useEffect(() => {
    if (open) {
      setContadoEfStr("");
      setContadoTarStr(
        ventasTar > 0
          ? ventasTar.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : "",
      );
      setContadoTransStr(
        ventasTrans > 0
          ? ventasTrans.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : "",
      );
      setNotas("");
      setPin("");
      setShowNotas(false);
      setShowSuccess(false);
      setClosedCaja(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const contadoEf = parseAmount(contadoEfStr);
  const contadoTar = parseAmount(contadoTarStr);
  const contadoTrans = parseAmount(contadoTransStr);

  const totalEsperado = efectivoEsperado + ventasTar + ventasTrans;
  const totalContado = contadoEf + contadoTar + contadoTrans;
  const dif = +(totalContado - totalEsperado).toFixed(2);

  async function submit() {
    if (!caja) return;

    // Validar PIN solo si NO es ADMIN
    if (empleadoRol !== "ADMIN") {
      if (pin.length < 4) {
        toast.error("PIN requerido para cerrar ⚠️");
        return;
      }
      if (empleadoPin && pin !== empleadoPin) {
        toast.error("PIN incorrecto. No puedes cerrar la caja ❌");
        return;
      }
    }

    if (Math.abs(dif) > umbral && notas.length < 5) {
      toast.error("Diferencia mayor al umbral. Indica una nota explicativa ⚠️");
      return;
    }

    setLoading(true);
    try {
      const updatedCaja = {
        ...caja,
        estado: "CERRADA",
        cerrada_en: new Date().toISOString(),
        monto_esperado_efectivo: efectivoEsperado,
        monto_contado_efectivo: contadoEf,
        monto_contado_tarjeta: contadoTar,
        monto_contado_transferencia: contadoTrans,
        diferencia: dif,
        notas_cierre: notas || undefined,
      } as Caja;
      await saveCaja(updatedCaja);
      setClosedCaja(updatedCaja);
      toast.success("Caja cerrada 🔒");
      setShowSuccess(true);
      onDone();
    } catch (err: any) {
      console.error(err);
      toast.error("Error al cerrar caja: " + (err?.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  }

  async function handlePrint() {
    if (!closedCaja) return;
    setLoadingOrders(true);
    try {
      // Fetch orders for this specific caja period
      const data = await getOrdenesByPeriod({
        tenant_id: closedCaja.tenant_id,
        desde: closedCaja.abierta_en,
        hasta: closedCaja.cerrada_en || new Date().toISOString(),
      });
      setOrdenes(data);
      const allMovs = await getMovimientos(closedCaja.tenant_id, closedCaja.id);
      setMovimientosPrint(allMovs);
    } catch (e) {
      console.error(e);
    }
    setLoadingOrders(false);
    setShowPrint(true);
  }

  if (showPrint && closedCaja) {
    return (
      <ReporteCuadreThermal
        ordenes={ordenes}
        movimientos={movimientosPrint}
        tenant={tenant}
        empleadoName={empleadoName}
        rango={`${formatDateTimeRD(closedCaja.abierta_en)} - ${formatDateTimeRD(closedCaja.cerrada_en!)}`}
        formato={tenant.config?.formato_ticket || "80mm"}
        montoInicial={closedCaja.monto_inicial}
        onBack={() => {
          setShowPrint(false);
          onOpenChange(false);
        }}
      />
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!showSuccess && !loading) onOpenChange(v);
      }}
    >
      <DialogContent
        className={`transition-all duration-300 ${showSuccess ? "max-w-md" : "max-w-2xl"}`}
      >
        <AnimatePresence mode="wait">
          {!showSuccess ? (
            <motion.div
              key="cierre-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <DialogHeader>
                <DialogTitle>Cerrar caja — Cuadre</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-emerald-500/5 p-4 text-center border-2 border-emerald-500/10">
                    <div className="text-[9px] uppercase font-black tracking-wider text-emerald-600 mb-1">
                      Efectivo Esperado
                    </div>
                    <div className="font-display text-2xl text-emerald-700 font-bold">
                      {formatRD(efectivoEsperado)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-sky-500/5 p-4 text-center border-2 border-sky-500/10">
                    <div className="text-[9px] uppercase font-black tracking-wider text-sky-600 mb-1">
                      Tarjeta Esperada
                    </div>
                    <div className="font-display text-2xl text-sky-700 font-bold">
                      {formatRD(ventasTar)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-indigo-500/5 p-4 text-center border-2 border-indigo-500/10">
                    <div className="text-[9px] uppercase font-black tracking-wider text-indigo-600 mb-1">
                      Transferencia Esperada
                    </div>
                    <div className="font-display text-2xl text-indigo-750 font-bold">
                      {formatRD(ventasTrans)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <AmountField
                    label="💵 EFECTIVO CONTADO"
                    value={contadoEfStr}
                    onChange={setContadoEfStr}
                  />
                  <AmountField
                    label="💳 TARJETA"
                    value={contadoTarStr}
                    onChange={setContadoTarStr}
                  />
                  <AmountField
                    label="🏦 TRANSFERENCIA"
                    value={contadoTransStr}
                    onChange={setContadoTransStr}
                  />
                </div>
                <div
                  className={`rounded-xl px-4 py-3 border-2 transition-colors ${dif === 0 ? "bg-emerald-50 border-emerald-100" : dif < 0 ? "bg-rose-50 border-rose-100" : "bg-amber-50 border-amber-100"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <div
                        className={`text-[10px] font-black uppercase tracking-widest ${dif === 0 ? "text-emerald-700" : dif < 0 ? "text-rose-700" : "text-amber-700"}`}
                      >
                        {dif === 0
                          ? "Caja cuadrada ✓"
                          : dif < 0
                            ? "Faltante en caja"
                            : "Sobrante en caja"}
                      </div>
                      {Math.abs(dif) > umbral && (
                        <div
                          className={`mt-0.5 flex items-center gap-1 text-[10px] font-bold ${dif < 0 ? "text-rose-600/70" : "text-amber-600/70"}`}
                        >
                          <AlertTriangle className="h-3 w-3" /> Excede umbral ({formatRD(umbral)})
                        </div>
                      )}
                    </div>
                    <div
                      className={`text-2xl font-display font-black ${dif === 0 ? "text-emerald-700" : dif < 0 ? "text-rose-700" : "text-amber-700"}`}
                    >
                      {formatRD(Math.abs(dif))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-border/50 bg-accent/5 px-4 py-2">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">
                        ¿Añadir nota o explicación?
                      </span>
                      <span className="text-[10px] text-muted-foreground italic">
                        Solo si hubo alguna novedad en el cuadre
                      </span>
                    </div>
                    <Switch checked={showNotas} onCheckedChange={setShowNotas} disabled={loading} />
                  </div>

                  <AnimatePresence>
                    {showNotas && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <Textarea
                          value={notas}
                          onChange={(e) => setNotas(e.target.value)}
                          rows={2}
                          disabled={loading}
                          placeholder="Escribe aquí cualquier observación sobre el cuadre..."
                          className="bg-accent/5 border-border/60 focus:bg-background transition-colors"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {empleadoRol !== "ADMIN" && (
                  <div>
                    <Label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 px-1">
                      PIN / firma del empleado
                    </Label>
                    <Input
                      type="password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="••••"
                      disabled={loading}
                      className="h-12 text-center text-2xl tracking-[0.5em] rounded-xl border-2 border-slate-100 bg-white"
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                  Cancelar
                </Button>
                <Button
                  onClick={submit}
                  className="bg-gradient-primary text-white"
                  disabled={loading}
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />{" "}
                  {loading ? "Cerrando..." : "Cerrar caja"}
                </Button>
              </DialogFooter>
            </motion.div>
          ) : (
            <motion.div
              key="cierre-success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-4 text-center space-y-4"
            >
              <div className="flex justify-center">
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-sm border-4 border-white ring-4 ring-emerald-50/50">
                  <Wallet className="h-8 w-8" />
                  <div className="absolute -right-1 -top-1 rounded-full bg-emerald-500 p-1 text-white shadow-sm ring-2 ring-white">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-display font-black text-slate-900">Caja Cerrada</h2>
                <p className="text-xs text-muted-foreground">
                  El cuadre ha sido registrado correctamente.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                <div className="flex justify-between text-xs text-slate-500 uppercase font-bold tracking-wider">
                  <span>Efectivo Contado:</span>
                  <span className="text-slate-900 font-bold">{formatRD(contadoEf)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 uppercase font-bold tracking-wider">
                  <span>Total Contado:</span>
                  <span className="text-slate-900 font-bold">
                    {formatRD(contadoEf + contadoTar + contadoTrans)}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">
                    VENTAS DEL DÍA
                  </span>
                  <span className="text-2xl font-display font-black text-primary mt-0.5">
                    {formatRD(savedTotalRecaudado)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => onOpenChange(false)}
                  className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary h-9 text-xs font-bold gap-2 shadow-none border-none rounded-xl"
                >
                  <ArrowLeft className="h-4 w-4" /> Volver a caja
                </Button>
                <Button
                  onClick={handlePrint}
                  disabled={loadingOrders}
                  className="flex-1 bg-gradient-primary text-white h-9 text-xs font-bold gap-2 shadow-none rounded-xl"
                >
                  <Printer className="h-4 w-4" />{" "}
                  {loadingOrders ? "Preparando..." : "Imprimir Cierre"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

function HistoricoCierresDialog({
  open,
  onOpenChange,
  tenant,
  empleadoId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tenant: Tenant;
  empleadoId?: string;
}) {
  const [empId, setEmpId] = useState(empleadoId || "all");
  const [desde, setDesde] = useState(new Date().toISOString().split("T")[0]);
  const [hasta, setHasta] = useState(new Date().toISOString().split("T")[0]);
  const [cierres, setCierres] = useState<Caja[]>([]);
  const [page, setPage] = useState(1);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  useEffect(() => {
    if (open) {
      getEmpleados(tenant.id).then(setEmpleados);
      if (empleadoId) setEmpId(empleadoId);
      handleSearch();
    }
  }, [open, tenant.id, empleadoId]);

  async function handleSearch() {
    setLoading(true);
    const data = await getHistoricoCierres({
      tenant_id: tenant.id,
      empleado_id: empId,
      desde,
      hasta,
    });
    setCierres(data);
    setLoading(false);
  }

  const selectedEmpleado = empleados.find((e) => e.id === empId);
  const totalPages = Math.ceil(cierres.length / 5);
  const currentCierres = cierres.slice((page - 1) * 5, page * 5);

  if (showPrint) {
    return (
      <ReporteCierrePrint
        cierres={cierres}
        tenant={tenant}
        empleadoName={
          selectedEmpleado
            ? `${selectedEmpleado.nombre} ${selectedEmpleado.apellido}`
            : "Todos los empleados"
        }
        rango={`${desde} al ${hasta}`}
        onBack={() => setShowPrint(false)}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-display">Historial de Cierres</DialogTitle>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-accent/5 p-4 rounded-2xl border border-border/50 mb-6">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
              Empleado / Cajero
            </Label>
            <Select value={empId} onValueChange={setEmpId}>
              <SelectTrigger className="bg-white border-border/60">
                <SelectValue placeholder="Seleccionar empleado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los empleados</SelectItem>
                {empleados.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nombre} {e.apellido}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
              Desde
            </Label>
            <Input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="bg-white border-border/60"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
              Hasta
            </Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="bg-white border-border/60"
              />
              <Button onClick={handleSearch} size="icon" className="shrink-0">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="py-20 text-center text-muted-foreground animate-pulse">
              Cargando histórico...
            </div>
          ) : cierres.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-border rounded-2xl">
              <Search className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">
                No se encontraron cierres para estos filtros.
              </p>
            </div>
          ) : (
            <>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-accent/5 border-b border-border text-xs uppercase font-bold text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">Apertura / Cierre</th>
                      <th className="px-4 py-3 text-left">Empleado</th>
                      <th className="px-4 py-3 text-right">Efectivo</th>
                      <th className="px-4 py-3 text-right">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {currentCierres.map((c) => {
                      const emp = empleados.find((e) => e.id === c.empleado_id);
                      return (
                        <tr key={c.id} className="hover:bg-accent/5 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium">{formatDateTimeRD(c.abierta_en)}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {c.cerrada_en ? formatDateTimeRD(c.cerrada_en) : "No cerrado"}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {emp ? `${emp.nombre}` : "Desconocido"}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-primary">
                            {formatRD(c.monto_contado_efectivo || 0)}
                          </td>
                          {(() => {
                            const difEf =
                              (c.monto_contado_efectivo || 0) - (c.monto_esperado_efectivo || 0);
                            return (
                              <td
                                className={`px-4 py-3 text-right font-bold ${difEf < 0 ? "text-destructive" : difEf > 0 ? "text-success" : "text-muted-foreground"}`}
                              >
                                {formatRD(difEf)}
                              </td>
                            );
                          })()}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-2 mt-2">
                  <span className="text-xs text-muted-foreground">
                    Mostrando {(page - 1) * 5 + 1} al {Math.min(page * 5, cierres.length)} de{" "}
                    {cierres.length}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="h-8 rounded-xl text-xs font-bold transition-all active:scale-[0.98] bg-primary text-white hover:bg-primary/90"
                    >
                      <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Anterior
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="h-8 rounded-xl text-xs font-bold transition-all active:scale-[0.98] bg-primary text-white hover:bg-primary/90"
                    >
                      Siguiente <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button
            onClick={() => setShowPrint(true)}
            disabled={cierres.length === 0}
            className="bg-gradient-primary text-white gap-2"
          >
            <Printer className="h-4 w-4" /> Generar Reporte Imprimible
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReporteCierrePrint({
  cierres,
  tenant,
  empleadoName,
  rango,
  onBack,
}: {
  cierres: Caja[];
  tenant: Tenant;
  empleadoName: string;
  rango: string;
  onBack: () => void;
}) {
  const totalEfectivo = cierres.reduce((s, c) => s + (c.monto_contado_efectivo || 0), 0);
  const totalDiferencia = cierres.reduce((s, c) => s + (c.diferencia || 0), 0);

  return createPortal(
    <div className="fixed inset-0 bg-white z-[99999] overflow-y-auto pointer-events-auto atomic-print-target">
      <div className="max-w-4xl mx-auto p-8 print:p-0 print:max-w-none print:m-0">
        <div className="flex justify-between items-start border-b-2 border-primary/20 pb-6 mb-8 print:hidden relative z-[100000]">
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBack();
            }}
            className="gap-2 cursor-pointer"
          >
            Volver a filtros
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.print();
            }}
            className="bg-primary text-white gap-2 cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Imprimir ahora
          </Button>
        </div>

        <div className="print-area">
          <div className="text-center mb-10">
            {tenant.logo_url ? (
              <img
                src={tenant.logo_url}
                alt={tenant.nombre}
                className="h-16 mx-auto mb-4 object-contain"
              />
            ) : (
              <h1 className="text-4xl font-display font-black text-primary uppercase tracking-tighter mb-1">
                {tenant.nombre}
              </h1>
            )}
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-[0.3em]">
              Reporte Histórico de Cierres de Caja
            </p>
            <div className="mt-6 flex justify-center gap-8 text-xs font-bold uppercase tracking-widest text-slate-500">
              <div className="border-x border-slate-200 px-6">
                Empleado: <span className="text-foreground">{empleadoName}</span>
              </div>
              <div className="border-x border-slate-200 px-6">
                Periodo: <span className="text-foreground">{rango}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 print:bg-white">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Total Efectivo Recaudado
              </div>
              <div className="text-3xl font-display font-black text-primary">
                {formatRD(totalEfectivo)}
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 print:bg-white">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Balance de Diferencias
              </div>
              <div
                className={`text-3xl font-display font-black ${totalDiferencia < 0 ? "text-destructive" : "text-success"}`}
              >
                {formatRD(totalDiferencia)}
              </div>
            </div>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="py-4 px-2">Fecha / Hora</th>
                <th className="py-4 px-2">Estado</th>
                <th className="py-4 px-2 text-right">Monto Inicial</th>
                <th className="py-4 px-2 text-right">Efectivo</th>
                <th className="py-4 px-2 text-right">Diferencia</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {cierres.map((c, i) => (
                <tr
                  key={c.id}
                  className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-slate-50/30 print:bg-white" : ""}`}
                >
                  <td className="py-4 px-2">
                    <div className="font-bold">{formatDateTimeRD(c.abierta_en)}</div>
                    <div className="text-[10px] text-slate-400">ID: {c.id}</div>
                  </td>
                  <td className="py-4 px-2">
                    <Badge variant="outline" className="text-[9px] font-bold uppercase">
                      {c.estado}
                    </Badge>
                  </td>
                  <td className="py-4 px-2 text-right font-medium text-slate-500">
                    {formatRD(c.monto_inicial)}
                  </td>
                  <td className="py-4 px-2 text-right font-bold text-slate-900">
                    {formatRD(c.monto_contado_efectivo || 0)}
                  </td>
                  <td
                    className={`py-4 px-2 text-right font-bold ${(c.diferencia || 0) < 0 ? "text-destructive" : "text-success"}`}
                  >
                    {formatRD(c.diferencia || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-20 grid grid-cols-2 gap-20 px-10">
            <div className="text-center">
              <div className="border-t border-slate-300 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Firma Administrador
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-slate-300 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Sello de Sucursal
              </div>
            </div>
          </div>

          <div className="mt-10 text-center text-[10px] text-slate-400 italic">
            Documento generado por Klynn Cloud - {new Date().toLocaleString("es-DO")}
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page { size: portrait; margin: 10mm; }
          html, body { overflow: visible !important; height: auto !important; background: white !important; }
          /* OCULTAR TODO EL APP */
          body > *:not(.atomic-print-target) { display: none !important; }
          /* MOSTRAR SOLO EL TARGET */
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
      `,
        }}
      />
    </div>,
    document.body,
  );
}

function HistoricoCuadreDialog({
  open,
  onOpenChange,
  tenant,
  empleadoId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tenant: Tenant;
  empleadoId?: string;
}) {
  const [empId, setEmpId] = useState(empleadoId || "all");
  const [desde, setDesde] = useState(new Date().toISOString().split("T")[0]);
  const [hasta, setHasta] = useState(new Date().toISOString().split("T")[0]);
  const [filtrarFechas, setFiltrarFechas] = useState(false);
  const [cierres, setCierres] = useState<Caja[]>([]);
  const [selectedCierreId, setSelectedCierreId] = useState<string>("");
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  const formato = tenant.config?.formato_ticket || "80mm";

  useEffect(() => {
    if (open) {
      getEmpleados(tenant.id).then(setEmpleados);
      if (empleadoId) setEmpId(empleadoId);

      // Fetch closed shifts
      getHistoricoCierres({ tenant_id: tenant.id, empleado_id: "all" }).then((data) => {
        setCierres(data);
        if (data.length > 0) {
          const lastCierre = data[0];
          setSelectedCierreId(lastCierre.id);
          setDesde(lastCierre.abierta_en);
          setHasta(lastCierre.cerrada_en || new Date().toISOString());
          handleSearchForCierre(lastCierre);
        } else {
          setSelectedCierreId("");
          setOrdenes([]);
          setMovimientos([]);
        }
      });
    }
  }, [open, tenant.id, empleadoId]);

  async function handleSearchToday() {
    setLoading(true);
    const startRange = new Date().toISOString().split("T")[0];
    const endRange = new Date().toISOString().split("T")[0] + "T23:59:59Z";
    await fetchOrdersAndMovs(startRange, endRange);
    setLoading(false);
  }

  async function handleSearchForCierre(cierreObj: Caja) {
    setLoading(true);
    const startRange = cierreObj.abierta_en;
    const endRange = cierreObj.cerrada_en || new Date().toISOString();
    await fetchOrdersAndMovs(startRange, endRange);
    setLoading(false);
  }

  async function fetchOrdersAndMovs(startRange: string, endRange: string) {
    const ordsData = await getOrdenesByPeriod({
      tenant_id: tenant.id,
      empleado_id: empId && empId !== "all" ? empId : undefined,
      desde: startRange,
      hasta: endRange,
    });
    setOrdenes(ordsData || []);

    const allMovs = await getMovimientos(tenant.id);
    let filteredMovs = [...allMovs];
    if (empId && empId !== "all") {
      filteredMovs = filteredMovs.filter((m) => m.empleado_id === empId);
    }
    filteredMovs = filteredMovs.filter((m) => {
      const created = m.creado_en || new Date().toISOString();
      return created >= startRange && created <= endRange;
    });
    filteredMovs.sort((a, b) => +new Date(a.creado_en) - +new Date(b.creado_en));
    setMovimientos(filteredMovs);
  }

  async function handleSearch() {
    if (filtrarFechas) {
      setLoading(true);
      const startRange = desde;
      const endRange = hasta + "T23:59:59Z";
      await fetchOrdersAndMovs(startRange, endRange);
      setLoading(false);
    } else {
      const activeCierre = cierres.find((c) => c.id === selectedCierreId);
      if (activeCierre) {
        await handleSearchForCierre(activeCierre);
      } else {
        setOrdenes([]);
        setMovimientos([]);
      }
    }
  }

  // Refrescar al cambiar filtros
  useEffect(() => {
    if (open) handleSearch();
  }, [filtrarFechas, empId, selectedCierreId]);

  const handleCierreChange = (cierreId: string) => {
    setSelectedCierreId(cierreId);
    const selected = cierres.find((c) => c.id === cierreId);
    if (selected) {
      setDesde(selected.abierta_en);
      setHasta(selected.cerrada_en || new Date().toISOString());
    }
  };

  const selectedEmpleado = empleados.find((e) => e.id === empId);

  if (showPrint) {
    const activeCierre = cierres.find((c) => c.id === selectedCierreId);
    const printedRange = activeCierre
      ? `${formatDateTimeRD(activeCierre.abierta_en)} al ${formatDateTimeRD(activeCierre.cerrada_en!)}`
      : `${formatDateTimeRD(desde)} al ${formatDateTimeRD(hasta)}`;

    return (
      <ReporteCuadreThermal
        ordenes={ordenes}
        movimientos={movimientos}
        tenant={tenant}
        empleadoName={
          selectedEmpleado
            ? `${selectedEmpleado.nombre} ${selectedEmpleado.apellido || ""}`
            : "Todos los empleados"
        }
        rango={printedRange}
        formato={formato}
        mostrarRango={true}
        montoInicial={activeCierre?.monto_inicial || 0}
        onBack={() => setShowPrint(false)}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="bg-accent/10 p-2 rounded-lg">
              <FileText className="h-5 w-5 text-accent-foreground" />
            </div>
            <DialogTitle className="text-2xl font-display">Imprimir Cuadre POS</DialogTitle>
          </div>
        </DialogHeader>

        <div
          className={`grid grid-cols-1 ${filtrarFechas ? "md:grid-cols-5" : "md:grid-cols-4"} gap-4 bg-accent/5 p-4 rounded-2xl border border-border/50 mb-6 items-end`}
        >
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
              Empleado / Cajero
            </Label>
            <Select value={empId} onValueChange={setEmpId}>
              <SelectTrigger className="bg-white border-border/60">
                <SelectValue placeholder="Seleccionar empleado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los empleados</SelectItem>
                {empleados.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nombre} {e.apellido}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
              Cierre de Caja
            </Label>
            <Select
              value={selectedCierreId}
              onValueChange={handleCierreChange}
              disabled={filtrarFechas}
            >
              <SelectTrigger className="bg-white border-border/60">
                <SelectValue placeholder="Seleccionar Cierre" />
              </SelectTrigger>
              <SelectContent>
                {cierres.map((c, idx) => (
                  <SelectItem key={c.id} value={c.id}>
                    {idx === 0 ? "Último Cierre" : `Cierre #${cierres.length - idx}`} (
                    {new Date(c.cerrada_en!).toLocaleDateString("es-DO")}{" "}
                    {new Date(c.cerrada_en!).toLocaleTimeString("es-DO", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    )
                  </SelectItem>
                ))}
                {cierres.length === 0 && (
                  <SelectItem value="none" disabled>
                    Sin cierres
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 mb-2">
              <Switch checked={filtrarFechas} onCheckedChange={setFiltrarFechas} id="f-fechas" />
              <Label htmlFor="f-fechas" className="text-xs font-bold uppercase cursor-pointer">
                Filtrar por fechas
              </Label>
            </div>
            <div className="p-2 bg-white rounded-lg border border-border/60 text-center text-xs">
              <span className="text-muted-foreground uppercase font-bold">Formato:</span>{" "}
              <span className="font-black text-primary">{formato}</span>
            </div>
          </div>

          {filtrarFechas ? (
            <div className="grid grid-cols-2 gap-2 col-span-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                  Desde
                </Label>
                <Input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="bg-white border-border/60"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                  Hasta
                </Label>
                <div className="flex gap-1">
                  <Input
                    type="date"
                    value={hasta}
                    onChange={(e) => setHasta(e.target.value)}
                    className="bg-white border-border/60"
                  />
                  <Button onClick={handleSearch} size="icon" className="shrink-0">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 text-center col-span-1">
              <p className="text-xs font-medium text-primary">
                {(() => {
                  const c = cierres.find((x) => x.id === selectedCierreId);
                  if (c) {
                    const dateStr = new Date(c.cerrada_en || c.abierta_en).toLocaleDateString(
                      "es-DO",
                    );
                    const turno = c.notas_apertura
                      ? c.notas_apertura.replace("Turno:", "").trim()
                      : "";
                    return `Mostrando último cierre: ${dateStr} ${turno ? `y el turno del ultimo cierre: ${turno}` : ""}`;
                  }
                  return "Sin cierres";
                })()}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="py-20 text-center text-muted-foreground animate-pulse">
              Cargando órdenes...
            </div>
          ) : ordenes.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-border rounded-2xl">
              <Search className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">
                No se encontraron órdenes para este periodo.
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-accent/5 border-b border-border text-xs uppercase font-bold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Orden</th>
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ordenes.map((o) => (
                    <tr key={o.id} className="hover:bg-accent/5 transition-colors">
                      <td className="px-4 py-3 font-bold">#{o.numero}</td>
                      <td className="px-4 py-3">{formatDateTimeRD(o.creado_en)}</td>
                      <td className="px-4 py-3 text-right font-bold text-primary">
                        {formatRD(o.total)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs uppercase font-medium">
                        {o.estado}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Movimientos de Caja Section */}
          <div className="space-y-3 mt-6">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
              <Coins className="h-4.5 w-4.5 text-amber-500" />
              <h4 className="text-sm font-black uppercase tracking-wider text-foreground">
                Movimientos del Turno
              </h4>
              <Badge
                variant="secondary"
                className="rounded-lg text-[10px] font-bold px-2 py-0.5 ml-auto"
              >
                {movimientos.length} movs
              </Badge>
            </div>
            {loading ? (
              <div className="py-10 text-center text-muted-foreground animate-pulse text-xs">
                Cargando movimientos...
              </div>
            ) : movimientos.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-border rounded-xl bg-accent/5">
                <p className="text-xs text-muted-foreground font-medium">
                  No se registraron abonos, ingresos o gastos en este periodo.
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden bg-background">
                <table className="w-full text-xs">
                  <thead className="bg-accent/5 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Hora</th>
                      <th className="px-4 py-2.5 text-left">Tipo</th>
                      <th className="px-4 py-2.5 text-left">Concepto</th>
                      <th className="px-4 py-2.5 text-left">Método</th>
                      <th className="px-4 py-2.5 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-medium">
                    {movimientos
                      .filter((m) => !m.concepto.startsWith("Venta orden #"))
                      .map((m) => {
                        const isNegative = ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA"].includes(
                          m.tipo,
                        );
                        return (
                          <tr key={m.id} className="hover:bg-accent/5 transition-colors">
                            <td className="px-4 py-2.5 text-muted-foreground">
                              {formatDateTimeRD(m.creado_en).split(",")[1]?.trim() || "---"}
                            </td>
                            <td className="px-4 py-2.5">
                              {(() => {
                                const isAbonoInicial = m.concepto.includes("Abono inicial orden");
                                const displayTipo = isAbonoInicial ? "CRÉDITO" : m.tipo;
                                return (
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] font-black rounded-lg py-0 px-1.5 uppercase ${
                                      m.tipo === "ABONO" || isAbonoInicial
                                        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400"
                                        : m.tipo === "INGRESO"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400"
                                          : isNegative
                                            ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400"
                                            : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400"
                                    }`}
                                  >
                                    {displayTipo}
                                  </Badge>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-2.5 max-w-xs truncate text-foreground font-semibold">
                              {m.concepto}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground uppercase text-[10px]">
                              {m.metodo || "---"}
                            </td>
                            <td
                              className={`px-4 py-2.5 text-right font-black ${isNegative ? "text-destructive" : "text-emerald-600"}`}
                            >
                              {isNegative ? "-" : "+"}
                              {formatRD(m.monto)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button
            onClick={() => setShowPrint(true)}
            disabled={ordenes.length === 0}
            className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 gap-2"
          >
            <Printer className="h-4 w-4" /> Generar Cuadre Térmico
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReporteCuadreThermal({
  ordenes,
  movimientos = [],
  tenant,
  empleadoName,
  rango,
  formato,
  mostrarRango,
  montoInicial = 0,
  onBack,
}: {
  ordenes: Orden[];
  movimientos?: MovimientoCaja[];
  tenant: Tenant;
  empleadoName: string;
  rango: string;
  formato: "57mm" | "80mm";
  mostrarRango?: boolean;
  montoInicial?: number;
  onBack: () => void;
}) {


  const total = ordenes.reduce((s, o) => s + o.total, 0);
  const cashSales = ordenes
    .filter((o) => o.metodo_pago === "EFECTIVO")
    .reduce((s, o) => s + o.total, 0);
  const cardSales = ordenes
    .filter((o) => o.metodo_pago === "TARJETA")
    .reduce((s, o) => s + o.total, 0);
  const transferSales = ordenes
    .filter((o) => o.metodo_pago === "TRANSFERENCIA")
    .reduce((s, o) => s + o.total, 0);
  const credit = ordenes
    .filter((o) => o.metodo_pago === "CREDITO")
    .reduce((s, o) => s + o.total, 0);
  const retirar = ordenes
    .filter((o) => o.metodo_pago === "PAGO_AL_RETIRAR")
    .reduce((s, o) => s + o.total, 0);
  const ventasContado = cashSales + cardSales + transferSales;
  const ventasCredito = credit;
  const totalFacturado = total;

  const cash = movimientos
    .filter(
      (m) =>
        m.tipo === "VENTA" &&
        m.metodo === "EFECTIVO" &&
        !m.concepto.startsWith("Cobro de saldo orden #"),
    )
    .reduce((s, m) => s + m.monto, 0);
  const card = movimientos
    .filter(
      (m) =>
        m.tipo === "VENTA" &&
        m.metodo === "TARJETA" &&
        !m.concepto.startsWith("Cobro de saldo orden #"),
    )
    .reduce((s, m) => s + m.monto, 0);
  const transfer = movimientos
    .filter(
      (m) =>
        m.tipo === "VENTA" &&
        m.metodo === "TRANSFERENCIA" &&
        !m.concepto.startsWith("Cobro de saldo orden #"),
    )
    .reduce((s, m) => s + m.monto, 0);

  const abonosCredito = movimientos
    .filter(
      (m) =>
        m.tipo === "ABONO" ||
        m.concepto.includes("Abono inicial orden") ||
        m.concepto.startsWith("Cobro de saldo orden #"),
    )
    .reduce((s, m) => s + m.monto, 0);
  const abonosEfectivo = movimientos
    .filter(
      (m) =>
        (m.tipo === "ABONO" ||
          m.concepto.includes("Abono inicial orden") ||
          m.concepto.startsWith("Cobro de saldo orden #")) &&
        m.metodo === "EFECTIVO",
    )
    .reduce((s, m) => s + m.monto, 0);
  const abonosTarjeta = movimientos
    .filter(
      (m) =>
        (m.tipo === "ABONO" ||
          m.concepto.includes("Abono inicial orden") ||
          m.concepto.startsWith("Cobro de saldo orden #")) &&
        m.metodo === "TARJETA",
    )
    .reduce((s, m) => s + m.monto, 0);
  const abonosTransferencia = movimientos
    .filter(
      (m) =>
        (m.tipo === "ABONO" ||
          m.concepto.includes("Abono inicial orden") ||
          m.concepto.startsWith("Cobro de saldo orden #")) &&
        m.metodo === "TRANSFERENCIA",
    )
    .reduce((s, m) => s + m.monto, 0);
  const totalTarjetas = card + abonosTarjeta;
  const totalTransferencias = transfer + abonosTransferencia;
  const totalDigital = totalTarjetas + totalTransferencias;
  const manualIngresos = movimientos
    .filter((m) => m.tipo === "INGRESO" && !m.concepto.includes("Apertura de caja"))
    .reduce((s, m) => s + m.monto, 0);
  const manualEgresos = movimientos
    .filter(
      (m) =>
        ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA"].includes(m.tipo) &&
        !m.concepto.includes("Reembolso: Anulaci"),
    )
    .reduce((s, m) => s + m.monto, 0);
  const anulado = movimientos
    .filter((m) => m.concepto.includes("Reembolso: Anulaci"))
    .reduce((s, m) => s + m.monto, 0);

  const realTotalEfectivo =
    cash + abonosEfectivo + montoInicial + manualIngresos - manualEgresos - anulado;
  const totalDineroRecaudado = cash + card + transfer + abonosCredito;

  const displayMovs = movimientos.filter((m) => {
    if (m.orden_id && ordenes.some((o) => o.id === m.orden_id)) {
      return false;
    }
    return (
      !m.concepto.startsWith("Venta orden #") &&
      !m.concepto.startsWith("Abono inicial orden #") &&
      m.tipo !== "ABONO"
    );
  });

  const ventasRealizadas = ordenes.filter((o) => o.estado !== "ANULADA").length;
  const devoluciones =
movimientos.filter((m) => m.concepto.includes("Reembolso: Anulaci")).length ||
    ordenes.filter((o) => o.estado === "ANULADA").length;
  const montoDescontado = ordenes
    .filter((o) => o.estado !== "ANULADA")
    .reduce((s, o) => s + (o.descuento || 0), 0);
  const itbisRecaudado = ordenes
    .filter((o) => o.estado !== "ANULADA")
    .reduce((s, o) => s + (o.itbis || 0), 0);
  const w = formato === "57mm" ? "w-[58mm] max-w-[58mm]" : "w-[80mm] max-w-[80mm]";

  return createPortal(
    <div className="fixed inset-0 bg-white z-[99999] overflow-y-auto pointer-events-auto atomic-print-target flex flex-col items-center py-6 print:p-0">
      <div className="w-full max-w-md mx-auto print:max-w-none print:m-0 flex flex-col items-center">
        <div className="w-full flex justify-between items-center border-b-2 border-primary/20 pb-4 mb-6 print:hidden">
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              onBack();
            }}
            className="cursor-pointer"
          >
            Cerrar
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              window.print();
            }}
            className="bg-primary text-white gap-2 cursor-pointer font-bold shadow-sm"
          >
            <Printer className="h-4 w-4" /> Imprimir ahora
          </Button>
        </div>

        <div
          className={`thermal-ticket mx-auto ${w} bg-white px-3 py-3 text-[11px] leading-snug text-black border border-dashed border-black/20 print:border-none`}
          style={{
            fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
        >
          {/* Encabezado */}
          <div className="text-center space-y-0.5">
            {tenant.logo_url ? (
              <div className="flex justify-center mb-1">
                <img
                  src={tenant.logo_url}
                  alt="Logo"
                  className="h-16 w-auto max-w-[180px] object-contain filter grayscale mx-auto"
                />
              </div>
            ) : (
              <div className="text-xl font-bold uppercase tracking-tight text-center leading-tight">
                {tenant.nombre}
              </div>
            )}
            {tenant.nombre_sucursal && (
              <div className="text-[10px] uppercase font-semibold text-black/80">{tenant.nombre_sucursal}</div>
            )}
            {tenant.rnc && (
              <div className="text-[10px] font-medium">RNC: {tenant.rnc}</div>
            )}
            {tenant.telefono && (
              <div className="text-[10px] font-medium">Tel: {tenant.telefono}</div>
            )}
            <div className="my-2 border-t-[1.5px] border-dashed border-black" />
            <div className="text-center font-black uppercase text-[12px] py-1 tracking-wider text-black border border-black rounded-xs">
              ★ CUADRE DE CAJA ★
            </div>
            {mostrarRango && (
              <div className="text-[10px] text-center uppercase font-bold text-black mt-1">{rango}</div>
            )}
          </div>

          <div className="my-2 border-t-[1.5px] border-dashed border-black" />

          {/* Metadatos */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Empleado:</span>
              <span className="font-bold text-black">{empleadoName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Fecha de Emisión:</span>
              <span className="font-semibold tabular-nums text-black">
                {new Date().toLocaleString("es-DO", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>
          </div>

          {/* [1] RESUMEN DE VENTAS */}
          <div className="mt-3 border-t-[1.5px] border-dashed border-black" />
          <div className="text-center font-bold tracking-widest text-[11px] uppercase py-0.5">
            [1] RESUMEN DE VENTAS
          </div>
          <div className="border-t border-dashed border-black my-1" />
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Ventas al Contado:</span>
              <span className="font-bold tabular-nums">{formatRD(ventasContado)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Ventas a Crédito:</span>
              <span className="font-bold tabular-nums">{formatRD(ventasCredito)}</span>
            </div>
            {retirar > 0 && (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black/80">Pago al Retirar:</span>
                <span className="font-bold tabular-nums">{formatRD(retirar)}</span>
              </div>
            )}
            <div className="border-t-2 border-black my-1.5" />
            <div className="flex justify-between items-center text-[12px] font-black">
              <span>TOTAL FACTURADO:</span>
              <span className="tabular-nums">{formatRD(totalFacturado)}</span>
            </div>
          </div>

          {/* [2] MOVIMIENTOS DE CAJA */}
          <div className="mt-3 border-t-[1.5px] border-dashed border-black" />
          <div className="text-center font-bold tracking-widest text-[11px] uppercase py-0.5">
            [2] MOVIMIENTOS DE CAJA
          </div>
          <div className="border-t border-dashed border-black my-1" />

          {/* Sub-bloque: MOVIMIENTOS EN EFECTIVO */}
          <div className="text-[10.5px] font-black uppercase text-black text-center tracking-wider my-0.5">
            -- MOVIMIENTOS EN EFECTIVO --
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">(+) Fondo Inicial (Apertura):</span>
              <span className="font-bold tabular-nums">{formatRD(montoInicial)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">(+) Ventas en Efectivo:</span>
              <span className="font-bold tabular-nums">{formatRD(cash)}</span>
            </div>
            {abonosEfectivo > 0 && (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black/80">(+) Abonos a Crédito (Efectivo):</span>
                <span className="font-bold tabular-nums">{formatRD(abonosEfectivo)}</span>
              </div>
            )}
            {manualIngresos > 0 && (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black/80">(+) Otros Ingresos (Efectivo):</span>
                <span className="font-bold tabular-nums">{formatRD(manualIngresos)}</span>
              </div>
            )}
            {manualEgresos > 0 && (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black/80">(-) Egresos / Retiros:</span>
                <span className="font-bold tabular-nums">{formatRD(manualEgresos)}</span>
              </div>
            )}
            {anulado > 0 && (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black/80">(-) Anulaciones / Reembolsos:</span>
                <span className="font-bold tabular-nums">{formatRD(anulado)}</span>
              </div>
            )}
            <div className="border-t-2 border-black my-1.5" />
            <div className="flex justify-between items-center text-[12px] font-black">
              <span>TOTAL EFECTIVO EN CAJA:</span>
              <span className="tabular-nums">{formatRD(realTotalEfectivo)}</span>
            </div>
          </div>

          {/* Sub-bloque: COBROS DIGITALES / BANCO */}
          <div className="mt-2.5 border-t border-dotted border-black/50" />
          <div className="text-[10.5px] font-black uppercase text-black text-center tracking-wider my-0.5">
            -- COBROS DIGITALES / BANCO --
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">(+) Tarjetas (Verifone):</span>
              <span className="font-bold tabular-nums">{formatRD(card)}</span>
            </div>
            {abonosTarjeta > 0 && (
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-medium text-black/70 pl-2">↳ Abonos con Tarjeta:</span>
                <span className="font-bold tabular-nums">{formatRD(abonosTarjeta)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">(+) Transferencias (Banco):</span>
              <span className="font-bold tabular-nums">{formatRD(transfer)}</span>
            </div>
            {abonosTransferencia > 0 && (
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-medium text-black/70 pl-2">↳ Abonos por Transferencia:</span>
                <span className="font-bold tabular-nums">{formatRD(abonosTransferencia)}</span>
              </div>
            )}
            <div className="border-t border-black my-1" />
            <div className="flex justify-between items-center text-[11.5px] font-bold">
              <span>TOTAL DIGITAL / BANCO:</span>
              <span className="tabular-nums">{formatRD(totalDigital)}</span>
            </div>
          </div>

          {/* Gran Total */}
          <div className="mt-3 border-t-[1.5px] border-dashed border-black pt-1" />
          <div className="flex justify-between items-center text-[13px] font-black py-0.5">
            <span className="tracking-tight">TOTAL GENERAL:</span>
            <span className="tabular-nums font-black text-[13.5px]">{formatRD(totalDineroRecaudado)}</span>
          </div>

          {/* [3] DETALLE DE ÓRDENES */}
          <div className="mt-3 border-t-[1.5px] border-dashed border-black" />
          <div className="text-center font-bold tracking-widest text-[11px] uppercase py-0.5">
            [3] DETALLE DE ÓRDENES ({ordenes.length})
          </div>
          <div className="border-t border-dashed border-black my-1" />
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold border-b border-black/20 pb-1">
              <span># ORDEN (MÉTODO)</span>
              <span>MONTO</span>
            </div>
            {ordenes.map((o) => {
              const label =
                o.metodo_pago === "CREDITO"
                  ? "CRÉDITO"
                  : o.metodo_pago === "PAGO_AL_RETIRAR"
                    ? "AL RETIRAR"
                    : o.metodo_pago || "CONTADO";

              return (
                <div key={o.id} className="flex justify-between items-center text-[11px] border-b border-dotted border-black/20 pb-0.5">
                  <span className="font-semibold text-black">
                    {o.numero} <span className="font-bold text-black uppercase text-[10px]">({label})</span>
                  </span>
                  <span className="font-bold tabular-nums text-black">{formatRD(o.total)}</span>
                </div>
              );
            })}
          </div>

          {/* [4] OTROS MOVIMIENTOS DE CAJA */}
          {displayMovs.length > 0 && (
            <>
              <div className="mt-3 border-t-[1.5px] border-dashed border-black" />
              <div className="text-center font-bold tracking-widest text-[11px] uppercase py-0.5">
                [4] OTROS MOVIMIENTOS DE CAJA
              </div>
              <div className="border-t border-dashed border-black my-1" />
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-[10px] font-bold border-b border-black/20 pb-1">
                  <span>CONCEPTO</span>
                  <span>MONTO</span>
                </div>
                {displayMovs.map((m) => {
                  const isNegative = ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA"].includes(m.tipo);
                  return (
                    <div key={m.id} className="flex justify-between items-start gap-1 border-b border-dotted border-black/20 pb-0.5">
                      <span className="text-left font-medium leading-tight max-w-[70%]">
                        {m.concepto.replace(/\s*\[(EFECTIVO|TARJETA|TRANSFERENCIA|CREDITO|PAGO_AL_RETIRAR|.*?)]/gi, "").trim()}
                      </span>
                      <span className="font-bold tabular-nums shrink-0">
                        {isNegative ? "-" : "+"}
                        {formatRD(m.monto)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* [5] ESTADÍSTICAS DEL TURNO */}
          <div className="mt-3 border-t-[1.5px] border-dashed border-black" />
          <div className="text-center font-bold tracking-widest text-[11px] uppercase py-0.5">
            [5] ESTADÍSTICAS DEL TURNO
          </div>
          <div className="border-t border-dashed border-black my-1" />
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Órdenes Procesadas:</span>
              <span className="font-bold tabular-nums">{ventasRealizadas}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Devoluciones / Anulaciones:</span>
              <span className="font-bold tabular-nums">{devoluciones}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Descuentos Aplicados:</span>
              <span className="font-bold tabular-nums">{formatRD(montoDescontado)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">ITBIS Recaudado ({tenant.config?.itbis_porcentaje ?? 18}%):</span>
              <span className="font-bold tabular-nums">{formatRD(itbisRecaudado)}</span>
            </div>
          </div>

          {/* Firma Cajero */}
          <div className="mt-14 text-center">
            <div className="border-t border-black w-48 mx-auto" />
            <div className="font-bold text-[11px] mt-1 uppercase">Cajero(a) en Turno</div>
            <div className="text-[10px] text-black/70 font-medium">{empleadoName}</div>
          </div>

          {/* Pie de ticket */}
          <div className="mt-6 border-t-[1.5px] border-dashed border-black pt-2 text-center text-[10px] text-black/70 font-medium">
            Documento emitido por el sistema.
            <div className="font-bold text-black mt-0.5">Klynn Cloud • {new Date().toLocaleString("es-DO")}</div>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page {
            size: ${formato === "57mm" ? "57mm auto" : "80mm auto"};
            margin: 0 auto !important;
          }

          html,
          body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            overflow: visible !important;
            height: auto !important;
          }

          /* Ocultar todo el sitio */
          body > *:not(.atomic-print-target) { display: none !important; }

          /* Centrar el ticket en la página de impresión */
          .atomic-print-target {
            display: flex !important;
            justify-content: center !important;
            align-items: flex-start !important;
            width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            position: static !important;
            background: white !important;
            box-sizing: border-box !important;
          }

          .thermal-ticket {
            display: block !important;
            width: ${formato === "57mm" ? "58mm" : "80mm"} !important;
            max-width: ${formato === "57mm" ? "58mm" : "80mm"} !important;
            margin: 0 auto !important;
            padding: 2mm 3mm !important;
            box-sizing: border-box !important;
            border: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Evitar cortes */
          .atomic-print-target * {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            visibility: visible !important;
          }

          .no-print { display: none !important; }
        }
      `,
        }}
      />
    </div>,
    document.body,
  );
}

function ReporteMovimientosTurnoThermal({
  caja,
  movimientos,
  tenant,
  empleadoName,
  ventasEf,
  ventasTar,
  ventasTrans,
  otrosIng,
  egresos,
  efectivoEsperado,
  formato = "80mm",
  onBack,
}: {
  caja: Caja;
  movimientos: MovimientoCaja[];
  tenant: Tenant;
  empleadoName: string;
  ventasEf: number;
  ventasTar: number;
  ventasTrans: number;
  otrosIng: number;
  egresos: number;
  efectivoEsperado: number;
  formato?: "57mm" | "80mm";
  onBack: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  // Orden cronológico (del más antiguo al más reciente para fines de auditoría)
  const cronoSortedMovs = useMemo(() => {
    return [...movimientos].sort(
      (a, b) => +new Date(a.creado_en) - +new Date(b.creado_en),
    );
  }, [movimientos]);

  const w = formato === "57mm" ? "w-[58mm] max-w-[58mm]" : "w-[80mm] max-w-[80mm]";

  return createPortal(
    <div className="fixed inset-0 bg-white z-[99999] overflow-y-auto pointer-events-auto atomic-print-target flex flex-col items-center py-6 print:p-0">
      <div className="w-full max-w-md mx-auto print:max-w-none print:m-0 flex flex-col items-center">
        <div className="w-full flex justify-between items-center border-b-2 border-primary/20 pb-4 mb-6 print:hidden">
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              onBack();
            }}
            className="cursor-pointer"
          >
            Cerrar
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              window.print();
            }}
            className="bg-primary text-white gap-2 cursor-pointer font-bold shadow-sm"
          >
            <Printer className="h-4 w-4" /> Imprimir ahora
          </Button>
        </div>

        <div
          className={`thermal-ticket mx-auto ${w} bg-white px-3 py-3 text-[11px] leading-snug text-black border border-dashed border-black/20 print:border-none`}
          style={{
            fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
        >
          {/* Encabezado */}
          <div className="text-center space-y-0.5">
            {tenant.logo_url ? (
              <div className="flex justify-center mb-1">
                <img
                  src={tenant.logo_url}
                  alt="Logo"
                  className="h-16 w-auto max-w-[180px] object-contain filter grayscale mx-auto"
                />
              </div>
            ) : (
              <div className="text-xl font-bold uppercase tracking-tight text-center leading-tight">
                {tenant.nombre}
              </div>
            )}
            {tenant.nombre_sucursal && (
              <div className="text-[10px] uppercase font-semibold text-black/80">{tenant.nombre_sucursal}</div>
            )}
            {tenant.rnc && (
              <div className="text-[10px] font-medium">RNC: {tenant.rnc}</div>
            )}
            {tenant.telefono && (
              <div className="text-[10px] font-medium">Tel: {tenant.telefono}</div>
            )}
            <div className="my-2 border-t-[1.5px] border-dashed border-black" />
            <div className="text-center font-black uppercase text-[12px] py-1 tracking-wider text-black border border-black rounded-xs">
              ★ AUDITORÍA DE MOVIMIENTOS ★
            </div>
            <div className="text-[10px] text-center uppercase font-bold text-black mt-1">
              TURNO / CAJA {caja.estado === "ABIERTA" ? "(EN CURSO)" : "(CERRADA)"}
            </div>
          </div>

          <div className="my-2 border-t-[1.5px] border-dashed border-black" />

          {/* Datos del Turno */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Cajero / Responsable:</span>
              <span className="font-bold text-black">{empleadoName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Apertura de Caja:</span>
              <span className="font-semibold tabular-nums text-black">{formatDateTimeRD(caja.abierta_en)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Fecha Auditoría:</span>
              <span className="font-semibold tabular-nums text-black">
                {new Date().toLocaleString("es-DO", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Total Movimientos:</span>
              <span className="font-bold tabular-nums text-black">{movimientos.length}</span>
            </div>
          </div>

          {/* [1] Resumen Financiero */}
          <div className="mt-3 border-t-[1.5px] border-dashed border-black" />
          <div className="text-center font-bold tracking-widest text-[11px] uppercase py-0.5">
            [1] RESUMEN FINANCIERO
          </div>
          <div className="border-t border-dashed border-black my-1" />

          {/* Sub-bloque: MOVIMIENTOS EN EFECTIVO */}
          <div className="text-[10.5px] font-black uppercase text-black text-center tracking-wider my-0.5">
            -- MOVIMIENTOS EN EFECTIVO --
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">(+) Fondo Inicial (Apertura):</span>
              <span className="font-bold tabular-nums">{formatRD(caja.monto_inicial || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">(+) Ventas en Efectivo:</span>
              <span className="font-bold tabular-nums">{formatRD(ventasEf)}</span>
            </div>
            {otrosIng > 0 && (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black/80">(+) Otros Ingresos / Abonos:</span>
                <span className="font-bold tabular-nums">{formatRD(otrosIng)}</span>
              </div>
            )}
            {egresos > 0 && (
              <div className="flex justify-between items-center text-black">
                <span className="font-semibold text-black/80">(-) Egresos / Gastos / Retiros:</span>
                <span className="font-bold tabular-nums">{formatRD(egresos)}</span>
              </div>
            )}
            <div className="border-t-2 border-black my-1.5" />
            <div className="flex justify-between items-center text-[12px] font-black">
              <span>TOTAL EFECTIVO EN CAJA:</span>
              <span className="tabular-nums">{formatRD(efectivoEsperado)}</span>
            </div>
          </div>

          {/* Sub-bloque: COBROS DIGITALES / BANCO */}
          <div className="mt-2.5 border-t border-dotted border-black/50" />
          <div className="text-[10.5px] font-black uppercase text-black text-center tracking-wider my-0.5">
            -- COBROS DIGITALES / BANCO --
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">(+) Tarjetas (Verifone):</span>
              <span className="font-bold tabular-nums">{formatRD(ventasTar)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">(+) Transferencias (Banco):</span>
              <span className="font-bold tabular-nums">{formatRD(ventasTrans)}</span>
            </div>
            <div className="border-t border-black my-1" />
            <div className="flex justify-between items-center text-[11.5px] font-bold">
              <span>TOTAL DIGITAL / BANCO:</span>
              <span className="tabular-nums">{formatRD(ventasTar + ventasTrans)}</span>
            </div>
          </div>

          {/* Gran Total */}
          <div className="mt-3 border-t-[1.5px] border-dashed border-black pt-1" />
          <div className="flex justify-between items-center text-[13px] font-black py-0.5">
            <span className="tracking-tight">TOTAL GENERAL:</span>
            <span className="tabular-nums font-black text-[13.5px]">{formatRD(ventasEf + ventasTar + ventasTrans + otrosIng)}</span>
          </div>

          {/* [2] Detalle Cronológico */}
          <div className="mt-3 border-t-[1.5px] border-dashed border-black" />
          <div className="text-center font-bold tracking-widest text-[11px] uppercase py-0.5">
            [2] REGISTRO DETALLADO ({cronoSortedMovs.length})
          </div>
          <div className="border-t border-dashed border-black my-1" />

          <div className="space-y-1.5">
            {cronoSortedMovs.map((m, idx) => {
              const isEgreso = ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA"].includes(m.tipo);
              const sign = isEgreso ? "-" : "+";
              const timeStr = new Date(m.creado_en).toLocaleTimeString("es-DO", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              });

              const cleanConcepto = (m.concepto || "Sin concepto")
                .replace(/\s*\[(EFECTIVO|TARJETA|TRANSFERENCIA|CREDITO|PAGO_AL_RETIRAR|.*?)]/gi, "")
                .trim();

              return (
                <div key={m.id || idx} className="border-b border-dotted border-black/30 pb-1.5 text-[11px]">
                  <div className="flex justify-between items-center font-bold">
                    <span>
                      #{idx + 1} {timeStr} <span className="uppercase text-[9.5px] px-1 py-0.2 border border-black rounded-xs">{m.tipo}</span>
                    </span>
                    <span className="tabular-nums font-black">
                      {sign}{formatRD(m.monto)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-black/80 mt-0.5">
                    <span className="truncate max-w-[32ch] font-medium">{cleanConcepto}</span>
                    <span className="font-bold uppercase text-[10px] text-black">{m.metodo || "N/A"}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* [3] Cuadre de Auditoría y Firmas */}
          <div className="mt-4 border-t-[1.5px] border-dashed border-black" />
          <div className="text-center font-bold tracking-widest text-[11px] uppercase py-0.5">
            [3] VERIFICACIÓN Y AUDITORÍA
          </div>
          <div className="border-t border-dashed border-black my-1" />

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Efectivo Contado en Caja:</span>
              <span className="font-bold">RD$ ____________</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black/80">Diferencia (Sobrante/Faltante):</span>
              <span className="font-bold">RD$ ____________</span>
            </div>
            <div className="pt-2 text-center text-[10px] font-bold uppercase">
              [  ] CONFORME   /   [  ] CON OBSERVACIÓN
            </div>
          </div>

          {/* Firma Cajero */}
          <div className="mt-14 text-center">
            <div className="border-t border-black w-48 mx-auto" />
            <div className="font-bold text-[11px] mt-1 uppercase">Cajero(a) en Turno</div>
            <div className="text-[10px] text-black/70 font-medium">{empleadoName}</div>
          </div>

          {/* Pie de ticket */}
          <div className="mt-6 border-t-[1.5px] border-dashed border-black pt-2 text-center text-[10px] text-black/70 font-medium">
            Documento emitido para fines de auditoría interna.
            <div className="font-bold text-black mt-0.5">Klynn Cloud • {new Date().toLocaleString("es-DO")}</div>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page {
            size: ${formato === "57mm" ? "57mm auto" : "80mm auto"};
            margin: 0 auto !important;
          }

          html,
          body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            overflow: visible !important;
            height: auto !important;
          }

          body > *:not(.atomic-print-target) { display: none !important; }

          /* Centrar el ticket en la página de impresión */
          .atomic-print-target {
            display: flex !important;
            justify-content: center !important;
            align-items: flex-start !important;
            width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            position: static !important;
            background: white !important;
            box-sizing: border-box !important;
          }

          .thermal-ticket {
            display: block !important;
            width: ${formato === "57mm" ? "58mm" : "80mm"} !important;
            max-width: ${formato === "57mm" ? "58mm" : "80mm"} !important;
            margin: 0 auto !important;
            padding: 2mm 3mm !important;
            box-sizing: border-box !important;
            border: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Evitar cortes */
          .atomic-print-target * {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            visibility: visible !important;
          }

          .no-print { display: none !important; }
        }
      `,
        }}
      />
    </div>,
    document.body,
  );
}

function SetCajaChicaDialog({
  open,
  onOpenChange,
  tenant,
  cajaId,
  empleadoId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tenant: Tenant;
  cajaId?: string;
  empleadoId?: string;
  onDone: () => void;
}) {
  const [montoStr, setMontoStr] = useState<string>(tenant.monto_caja_chica?.toString() || "");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const monto = parseAmount(montoStr);
    setLoading(true);
    try {
      await saveTenant({ ...tenant, monto_caja_chica: monto, monto_actual_caja_chica: monto });

      // Si hay caja abierta, registrar movimiento de entrada por la recarga
      if (tenant.id && cajaId && empleadoId) {
        await saveMovimiento({
          id: uid("mov"),
          tenant_id: tenant.id,
          caja_id: cajaId,
          empleado_id: empleadoId,
          tipo: "INGRESO",
          concepto: "Recarga / Asignación de Caja Chica",
          monto: monto,
          metodo: "EFECTIVO",
          creado_en: new Date().toISOString(),
        });
      }

      toast.success("Caja Chica recargada 🐷");
      onDone();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Error al guardar: " + (err.message || "Servicio no disponible"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-2xl text-primary">
              <PiggyBank className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-display font-black">
                Asignar Caja Chica
              </DialogTitle>
              <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">
                Fondo fijo del negocio
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="py-6">
          <div className="relative group">
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 flex items-center justify-center px-4 border-r border-slate-200 bg-white rounded-l-xl transition-colors group-focus-within:border-primary/30 group-focus-within:bg-primary/5">
              <span className="text-sm font-black text-primary/60">RD$</span>
            </div>
            <input
              type="text"
              inputMode="decimal"
              autoFocus
              value={montoStr}
              onChange={(e) => setMontoStr(formatAmountInput(e.target.value))}
              onBlur={() => {
                const n = parseAmount(montoStr);
                if (n === 0) setMontoStr("");
                else
                  setMontoStr(
                    n.toLocaleString("en-US", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }),
                  );
              }}
              placeholder="0.00"
              className="h-20 w-full px-6 text-center font-display text-5xl font-bold text-primary tracking-tighter rounded-xl border-2 border-slate-200 bg-white shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none placeholder:text-slate-100"
            />
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground leading-relaxed">
            Este monto es el fondo fijo que siempre debe haber disponible en la caja chica de la
            lavandería.
          </p>
        </div>

        <DialogFooter className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 h-10 rounded-xl text-muted-foreground font-bold"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 h-10 rounded-xl bg-primary text-white font-bold shadow-sm hover:bg-primary/90"
            onClick={submit}
            disabled={loading}
          >
            {loading ? "Guardando..." : "Guardar Monto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
