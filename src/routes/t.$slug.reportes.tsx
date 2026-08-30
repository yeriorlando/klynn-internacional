import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { 
  Download, 
  FileSpreadsheet, 
  Printer, 
  FileText,
  TrendingUp, 
  DollarSign, 
  Wallet, 
  Shield, 
  Sparkles, 
  Calendar,
  RefreshCw,
  CreditCard,
  Tag,
  Shirt,
  Package,
  Bell,
  Users,
  BarChart3,
  Zap,
  Truck,
  MapPin,
  XCircle,
  Coins,
  Info,
  WashingMachine,
  ListTodo,
  Home,
  CheckCircle2,
  AlertCircle,
  Landmark
} from "lucide-react";
import { toast } from "sonner";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { 
  isModuleEnabled,
  formatRD
} from "@/lib/storage";
import { 
  useOrdenes, 
  useGastos, 
  useEmpleados, 
  useMovimientos, 
  useCajas, 
  useECFConfig, 
  usePlans,
  useServicios,
  useCatalogo
} from "@/hooks/use-queries";

export const Route = createFileRoute("/t/$slug/reportes")({ component: ReportesPage });

function ReportesPage() {
  const user = useRequireAuth();
  const tenant = user?.tenant;
  const tenantId = tenant?.id || '';
  const primaryColor = tenant?.color_primario || '#1B4B73';

  const { data: rawOrdenes = [], isLoading: loadingOrdenes } = useOrdenes(tenantId);
  const { data: gastos = [], isLoading: loadingGastos } = useGastos(tenantId);
  const { data: emps = [], isLoading: loadingEmps } = useEmpleados(tenantId);
  const { data: movs = [] } = useMovimientos(tenantId);
  const { data: cajas = [] } = useCajas(tenantId);
  const { data: ecfConfig } = useECFConfig(tenantId);
  const { data: plans = [] } = usePlans();
  const { data: serviciosData = [] } = useServicios(tenantId);
  const { data: catalogoData = [] } = useCatalogo(tenantId);

  const [isPrinting, setIsPrinting] = useState(false);
  
  // Estados para exportación DGII
  const [showDgiiModal, setShowDgiiModal] = useState(false);
  const [exportType, setExportType] = useState<"606" | "ENVIADOS">("606");
  const [exportYear, setExportYear] = useState(new Date().getFullYear().toString());
  const [exportMonth, setExportMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [isExporting, setIsExporting] = useState(false);

  const activePlan = plans.find((p) => p.id === tenant?.plan_id);
  const hasFiscalModule = isModuleEnabled(tenant || null, "facturacion_fiscal", activePlan);

  const ordenes = useMemo(() => {
    return (rawOrdenes || []).filter((o) => o.estado !== "ANULADA");
  }, [rawOrdenes]);

  const loading = loadingOrdenes || loadingGastos || loadingEmps;

  const stats = useMemo(() => {
    if (!ordenes || !gastos || !movs || !cajas) return null;

    const totalVentas = ordenes.reduce((s, o) => s + (o.total || 0), 0);
    const totalITBIS = ordenes.reduce((s, o) => s + (o.itbis || 0), 0);
    
    // Gastos (Total unificado de la tabla gastos)
    const totalGastos = gastos.reduce((s, g) => s + (g.monto || 0), 0);
    const rentabilidad = totalVentas - totalGastos;
    const ticketPromedio = ordenes.length > 0 ? totalVentas / ordenes.length : 0;

    // Métodos de Pago
    const porMetodo = ordenes.reduce((m, o) => { 
      m[o.metodo_pago] = (m[o.metodo_pago] || 0) + (o.total || 0); 
      return m; 
    }, {} as Record<string, number>);

    // Gastos por Categoría
    const porCategoria = gastos.reduce((m, g) => {
      const cat = g.categoria || "Otros";
      m[cat] = (m[cat] || 0) + g.monto;
      return m;
    }, {} as Record<string, number>);

    // Estados de Órdenes
    const porEstado = ordenes.reduce((m, o) => {
      m[o.estado] = (m[o.estado] || 0) + 1;
      return m;
    }, {} as Record<string, number>);

    // Cierres de caja (últimos 5)
    const cierresCaja = [...cajas]
      .filter((c: any) => c.estado === "CERRADA")
      .sort((a, b) => new Date(b.cerrada_en || 0).getTime() - new Date(a.cerrada_en || 0).getTime())
      .slice(0, 5);

    // Actividad Reciente en las últimas 48 horas (unificada)
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    const feedItems: any[] = [];

    // 1. Órdenes
    ordenes.forEach(o => {
      feedItems.push({
        id: `ord-${o.id}`,
        titulo: `Orden Recibida`,
        desc: `Orden ${o.numero} creada`,
        monto: o.total,
        fecha: o.creado_en,
        badgeText: "PEDIDO",
        color: "bg-blue-50 text-blue-700 border-blue-100"
      });
    });

    // 2. Movimientos de caja (aperturas, cierres, abonos, ventas)
    movs.forEach(m => {
      const conceptoLower = (m.concepto || "").toLowerCase();
      let titulo = "Movimiento de Caja";
      let color = "bg-slate-50 text-slate-700 border-slate-100";
      let badgeText = "CAJA";

      if (conceptoLower.includes("apertura")) {
        titulo = "Apertura de Caja";
        color = "bg-emerald-50 text-emerald-700 border-emerald-100";
        badgeText = "APERTURA";
      } else if (conceptoLower.includes("cierre")) {
        titulo = "Cierre de Caja";
        color = "bg-amber-50 text-amber-700 border-amber-100";
        badgeText = "CIERRE";
      } else if (m.tipo === "GASTO_CAJA_CHICA") {
        titulo = "Gasto Caja Chica";
        color = "bg-rose-50 text-rose-700 border-rose-100";
        badgeText = "EGRESO CAJA CHICA";
      } else if (m.tipo === "VENTA" || m.tipo === "ABONO") {
        titulo = m.tipo === "VENTA" ? "Cobro Recibido" : "Abono Registrado";
        color = "bg-green-50 text-green-700 border-green-100";
        badgeText = "COBRO";
      } else if (m.tipo === "EGRESO" || m.tipo === "RETIRO") {
        titulo = m.tipo === "RETIRO" ? "Retiro de Efectivo" : "Egreso de Caja";
        color = "bg-rose-50 text-rose-700 border-rose-100";
        badgeText = "RETIRO";
      }

      feedItems.push({
        id: `mov-${m.id}`,
        titulo,
        desc: m.concepto,
        monto: m.monto,
        fecha: m.creado_en,
        badgeText,
        color
      });
    });

    // 3. Gastos manuales
    gastos.filter(g => !g.is_caja_chica).forEach(g => {
      feedItems.push({
        id: `gas-${g.id}`,
        titulo: `Gasto: ${g.categoria}`,
        desc: g.descripcion || "Egreso bancario",
        monto: g.monto,
        fecha: g.fecha,
        badgeText: "GASTO BANCARIO",
        color: "bg-rose-100 text-rose-800 border-rose-200"
      });
    });

    // Filtrar a las últimas 48 horas
    let recientes = feedItems.filter(item => new Date(item.fecha).getTime() >= cutoff);

    // Fallback: si no hay actividades en las últimas 48 horas, mostrar las últimas 5 generales
    if (recientes.length === 0) {
      recientes = [...feedItems];
    }

    recientes = recientes
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 10); // Límite de 10

    // --- 1. Top de Prendas Más Solicitadas (Ropa) ---
    const garmentCounts: Record<string, { count: number; total: number }> = {};
    let totalPiezas = 0;
    let totalLibras = 0;
    ordenes.forEach(o => {
      if (o.estado === "ANULADA") return;
      if (Array.isArray(o.items)) {
        o.items.forEach((item: any) => {
          const rawDesc = item.descripcion || "Otros";
          const desc = rawDesc.replace(/^↳\s*/, "").trim();
          const qty = Number(item.cantidad) || 0;
          const catMatch = catalogoData.find(c => 
            c.nombre?.toLowerCase().trim() === desc.toLowerCase().trim()
          );
          const priceUnit = Number(item.precio_unitario) > 0 
            ? Number(item.precio_unitario) 
            : (catMatch?.precio || 0);
          const sub = priceUnit * qty;

          if (!garmentCounts[desc]) {
            garmentCounts[desc] = { count: 0, total: 0 };
          }
          garmentCounts[desc].count += qty;
          garmentCounts[desc].total += sub;

          if (item.es_libra || catMatch?.por_libra) {
            totalLibras += qty;
          } else {
            totalPiezas += qty;
          }
        });
      }
    });

    const topPrendas = Object.entries(garmentCounts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // --- 1b. Top de Servicios Más Solicitados (Operaciones) ---
    const serviceCounts: Record<string, { count: number; total: number }> = {};
    ordenes.forEach(o => {
      if (o.estado === "ANULADA") return;
      if (Array.isArray(o.servicios)) {
        o.servicios.forEach((sName) => {
          const srvMatch = serviciosData.find(s => 
            s.nombre?.toLowerCase().trim() === sName.toLowerCase().trim()
          );
          const rawPrice = o.servicios_precios?.[sName];
          const price = typeof rawPrice === "number" && rawPrice >= 0 
            ? rawPrice 
            : (srvMatch?.precio || 0);

          if (!serviceCounts[sName]) {
            serviceCounts[sName] = { count: 0, total: 0 };
          }
          serviceCounts[sName].count += 1;
          serviceCounts[sName].total += price;
        });
      }
    });

    const topServicios = Object.entries(serviceCounts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // --- 2. Canal de Entrega ---
    const totalOrds = ordenes.length || 1;
    const ordsDomicilio = ordenes.filter(o => o.entrega_domicilio).length;
    const ordsLocal = totalOrds - ordsDomicilio;
    const pctDomicilio = Math.round((ordsDomicilio / totalOrds) * 100);
    const pctLocal = 100 - pctDomicilio;

    // --- 3. Tasa de Urgencia ---
    const ordsUrgentes = ordenes.filter(o => o.es_urgente).length;
    const pctUrgencia = Math.round((ordsUrgentes / totalOrds) * 100);

    // --- 4. Desglose Avanzado de Delivery ---
    const deliveryEntregados = ordenes.filter(o => o.entrega_domicilio && o.estado === "ENTREGADA").length;
    const deliveryCancelados = ordenes.filter(o => o.entrega_domicilio && o.estado === "ANULADA").length;
    const deliveryPendientes = ordenes.filter(o => o.entrega_domicilio && o.estado !== "ENTREGADA" && o.estado !== "ANULADA").length;

    // --- 5. Créditos y Deudas de Clientes ---
    const activeOrds = ordenes.filter(o => o.estado !== "ANULADA");
    const totalDeuda = activeOrds.reduce((s, o) => s + (o.saldo || 0), 0);
    const cantidadDeudas = activeOrds.filter(o => (o.saldo || 0) > 0).length;
    const totalAbonado = activeOrds.filter(o => (o.saldo || 0) > 0).reduce((s, o) => s + (o.pagado || 0), 0);

    // Buscar abonos reales en los movimientos de caja
    const realAbonosMovs = movs.filter(m => m.concepto?.toLowerCase().includes("abono"));
    const totalAbonosCaja = realAbonosMovs.reduce((s, m) => s + m.monto, 0);

    return {
      totalVentas,
      totalITBIS,
      totalGastos,
      rentabilidad,
      ticketPromedio,
      porMetodo,
      porCategoria,
      porEstado,
      cierresCaja,
      recientes,
      topServicios,
      topPrendas,
      totalPiezas,
      totalLibras,
      ordsDomicilio,
      ordsLocal,
      pctDomicilio,
      pctLocal,
      ordsUrgentes,
      pctUrgencia,
      deliveryEntregados,
      deliveryCancelados,
      deliveryPendientes,
      totalDeuda,
      cantidadDeudas,
      totalAbonado,
      totalAbonosCaja
    };
  }, [ordenes, gastos, movs, cajas]);

  const exportData = useMemo(() => {
    if (!stats) return [];
    return [
      ["Ingresos totales (Ventas)", formatRD(stats.totalVentas)],
      ["Gastos totales", formatRD(stats.totalGastos)],
      ["Rentabilidad neta", formatRD(stats.rentabilidad)],
      ["ITBIS generado", formatRD(stats.totalITBIS)],
      ["Ticket promedio", formatRD(stats.ticketPromedio)],
      ["Cuentas por cobrar (Clientes)", formatRD(stats.totalDeuda)],
      ["Abonos de clientes", formatRD(stats.totalAbonado + stats.totalAbonosCaja)],
      ["Prendas por pieza procesadas", `${stats.totalPiezas} piezas`],
      ["Prendas por libra procesadas", `${stats.totalLibras} libras`],
      ...stats.topServicios.map(s => [`Top Servicio: ${s.name}`, `${s.count} ordenes (${formatRD(s.total)})`]),
      ...stats.topPrendas.map(p => [`Top Prenda: ${p.name}`, `${p.count} cant. (${formatRD(p.total)})`]),
      ...emps.map(e => {
        const empOrds = ordenes.filter(o => o.empleado_id === e.id);
        const total = empOrds.reduce((s, o) => s + (o.total || 0), 0);
        return [`Ventas - Empleado: ${e.nombre}`, `${empOrds.length} órdenes (${formatRD(total)})`];
      })
    ];
  }, [stats, emps, ordenes]);

  const downloadTxtFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportDGII = async () => {
    if (!tenant) return;
    setIsExporting(true);
    const period = `${exportYear}${exportMonth}`;
    const rncEmisor = ecfConfig?.rnc_emisor || (tenant as any).rnc || "133190907";

    try {
      if (exportType === "606") {
        let textContent = "";

        if (!textContent) {
          // Generar Formato 606 en TXT según especificación DGII usando datos locales de Klynn
          const targetPrefix = `${exportYear}-${exportMonth}`;
          const periodGastos = gastos.filter(g => g.fecha && g.fecha.startsWith(targetPrefix));

          // Cabecera DGII 606: 606|RNC_EMISOR|PERIODO|CANTIDAD_REGISTROS
          const header = `606|${rncEmisor.replace(/\D/g, "")}|${period}|${periodGastos.length}`;
          
          const rows = periodGastos.map(g => {
            const rncProv = ((g as any).rnc_proveedor || '101010101').replace(/\D/g, "");
            const tipoId = rncProv.length === 9 ? '1' : '2';
            const tipoGasto = '02'; // Gastos de Trabajos, Suministros y Servicios
            const ncf = (g as any).ncf || 'B0100000001';
            const fechaComp = (g.fecha || new Date().toISOString().substring(0, 10)).replace(/\D/g, "").substring(0, 8);
            const monto = (g.monto || 0).toFixed(2);
            const itbis = ((g as any).itbis || 0).toFixed(2);
            
            return `${rncProv}|${tipoId}|${tipoGasto}|${ncf}||${fechaComp}|${fechaComp}|${monto}|${itbis}|0.00|0.00|0.00|0.00|0.00|0.00|0.00|01`;
          });

          textContent = [header, ...rows].join("\n");
        }

        downloadTxtFile(textContent, `606_${rncEmisor}_${period}.txt`);
        toast.success(`Reporte Formato 606 (${period}) generado correctamente 📄`);

      } else {
        // EF2 no documenta endpoints de exportación 606/emitidos. Generamos el
        // archivo desde los documentos persistidos por Klynn.
        {
          // Generar reporte de Facturas Enviadas en Excel (CSV) con los datos de Klynn
          const targetPrefix = `${exportYear}-${exportMonth}`;
          const periodOrdenes = ordenes.filter(o => o.creado_en && o.creado_en.startsWith(targetPrefix));

          const csvData = [
            ["Nº Orden", "Comprobante (e-NCF / NCF)", "Fecha Emisión", "RNC/Cédula Cliente", "Nombre Cliente", "Subtotal (RD$)", "ITBIS (RD$)", "Total (RD$)", "Método de Pago", "Estado DGII"],
            ...periodOrdenes.map(o => [
              o.numero,
              o.ncf || '',
              o.creado_en ? o.creado_en.substring(0, 10) : '',
              (o as any).cliente_rnc || 'Consumidor Final',
              (o as any).cliente_nombre || 'Cliente General',
              (o.subtotal || 0).toFixed(2),
              (o.itbis || 0).toFixed(2),
              (o.total || 0).toFixed(2),
              o.metodo_pago,
              o.ncf ? 'ACEPTADO_DGII' : 'REGISTRADO'
            ])
          ];

          exportToCsv(`Facturas_Enviadas_${rncEmisor}_${period}`, csvData[0], csvData.slice(1));
          toast.success(`Facturas Enviadas de ${period} exportadas en Excel (CSV) 📊`);
        }
      }
      setShowDgiiModal(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Error al exportar el reporte");
    } finally {
      setIsExporting(false);
    }
  };

  const isInitialLoading = (loadingOrdenes && rawOrdenes.length === 0) || (loadingGastos && gastos.length === 0);

  if (!user || user.tenant.id === '__loading__' || isInitialLoading) {
    return <GlobalPageLoader text="Cargando reportes en tiempo real..." />;
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader title="Reportes y estadísticas" description="Visualiza el rendimiento integral de tu lavandería en tiempo real.">
        <div className="flex flex-wrap items-center gap-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2 rounded-xl h-10 px-4 font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0">
                <Download className="h-4 w-4 text-[#F0B900] shrink-0" />
                <span>Exportar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-elegant">
              <DropdownMenuItem 
                className="gap-2 cursor-pointer py-2 rounded-lg font-medium text-xs sm:text-sm" 
                onClick={() => exportToCsv("Reporte_Rendimiento", ["Métrica / Categoría", "Valor Registrado"], exportData)}
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Excel (CSV)</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="gap-2 cursor-pointer py-2 rounded-lg font-medium text-xs sm:text-sm" 
                onClick={() => setIsPrinting(true)}
              >
                <Printer className="h-4 w-4 text-rose-600 shrink-0" />
                <span>PDF / Impresión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            className="gap-2 rounded-xl h-10 px-4 font-bold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0" 
            onClick={() => setIsPrinting(true)}
          >
            <Printer className="h-4 w-4 text-white shrink-0" />
            <span>Imprimir</span>
          </Button>

          {hasFiscalModule && ecfConfig && ecfConfig.is_active && (
            <>
              <Button 
                className="gap-2 rounded-xl h-10 px-4 font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
                onClick={() => { setExportType("606"); setShowDgiiModal(true); }}
              >
                <FileText className="h-4 w-4 text-[#F0B900] shrink-0" />
                <span>606 (TXT)</span>
              </Button>
              <Button 
                className="gap-2 rounded-xl h-10 px-4 font-black bg-[#F0B900] hover:bg-[#dfac00] text-[#1B4B73] border border-[#F0B900] shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
                onClick={() => { setExportType("ENVIADOS"); setShowDgiiModal(true); }}
              >
                <FileSpreadsheet className="h-4 w-4 text-[#1B4B73] shrink-0" />
                <span>Facturas (Excel)</span>
              </Button>
            </>
          )}
        </div>
      </PageHeader>

      <Dialog open={showDgiiModal} onOpenChange={setShowDgiiModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Exportar Reporte {exportType === "606" ? "606" : "de e-CF Enviados"}</DialogTitle>
            <DialogDescription>
              Selecciona el mes y año (periodo) para generar el archivo directamente desde los servidores de facturación electrónica.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-4 py-4">
            <div className="flex-1 space-y-2">
              <Label>Mes</Label>
              <select 
                className="w-full flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={exportMonth}
                onChange={(e) => setExportMonth(e.target.value)}
              >
                <option value="01">01 - Enero</option>
                <option value="02">02 - Febrero</option>
                <option value="03">03 - Marzo</option>
                <option value="04">04 - Abril</option>
                <option value="05">05 - Mayo</option>
                <option value="06">06 - Junio</option>
                <option value="07">07 - Julio</option>
                <option value="08">08 - Agosto</option>
                <option value="09">09 - Septiembre</option>
                <option value="10">10 - Octubre</option>
                <option value="11">11 - Noviembre</option>
                <option value="12">12 - Diciembre</option>
              </select>
            </div>
            <div className="flex-1 space-y-2">
              <Label>Año</Label>
              <select 
                className="w-full flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={exportYear}
                onChange={(e) => setExportYear(e.target.value)}
              >
                {[...Array(5)].map((_, i) => {
                  const y = new Date().getFullYear() - i;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            </div>
          </div>

          <DialogFooter className="sm:justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDgiiModal(false)} disabled={isExporting}>Cancelar</Button>
            <Button 
              style={{ backgroundColor: primaryColor }} 
              className="text-white"
              onClick={handleExportDGII} 
              disabled={isExporting}
            >
              {isExporting ? "Generando..." : "Descargar Archivo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fila 1: KPIs Financieros */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="p-4 bg-white border-none shadow-sm flex flex-col justify-between h-28 hover:shadow transition-shadow">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary" style={{ color: primaryColor }} /> Ingresos Totales
          </div>
          <div className="text-xl font-display font-bold mt-1 text-slate-800">
            {formatRD(stats.totalVentas)}
          </div>
          <div className="text-[9px] text-muted-foreground mt-1">Suma total facturada</div>
        </Card>

        <Card className="p-4 bg-white border-none shadow-sm flex flex-col justify-between h-28 hover:shadow transition-shadow">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-rose-500" /> Gastos Totales
          </div>
          <div className="text-xl font-display font-bold mt-1 text-rose-600">
            {formatRD(stats.totalGastos)}
          </div>
          <div className="text-[9px] text-muted-foreground mt-1">Manuales + caja chica</div>
        </Card>

        <Card className="p-4 bg-white border-none shadow-sm flex flex-col justify-between h-28 hover:shadow transition-shadow border-l-4 border-l-emerald-500">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-emerald-500" /> Rentabilidad Neta
          </div>
          <div className={`text-xl font-display font-bold mt-1 ${stats.rentabilidad >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatRD(stats.rentabilidad)}
          </div>
          <div className="text-[9px] text-muted-foreground mt-1">Beneficio neto real</div>
        </Card>

        <Card className="p-4 bg-white border-none shadow-sm flex flex-col justify-between h-28 hover:shadow transition-shadow">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-blue-500" /> ITBIS Recaudado
          </div>
          <div className="text-xl font-display font-bold mt-1 text-blue-600">
            {formatRD(stats.totalITBIS)}
          </div>
          <div className="text-[9px] text-muted-foreground mt-1">Declaración DGII</div>
        </Card>

        <Card className="p-4 bg-white border-none shadow-sm flex flex-col justify-between h-28 hover:shadow transition-shadow">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Ticket Promedio
          </div>
          <div className="text-xl font-display font-bold mt-1 text-slate-800">
            {formatRD(stats.ticketPromedio)}
          </div>
          <div className="text-[9px] text-muted-foreground mt-1">Gasto medio por orden</div>
        </Card>
      </div>

      {/* Doble Columna Principal */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Columna Izquierda: Gráficos y Desgloses */}
        <div className="space-y-6">
          {/* Estado de las Órdenes */}
          <Card className="p-6 bg-white border-none shadow-sm rounded-2xl">
            <h3 className="font-display text-lg text-slate-800 mb-4 flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-indigo-500" /> Estado de las Órdenes
            </h3>
            <div className="space-y-4">
              {[
                { state: "RECIBIDA", label: "Recibidas", color: "bg-blue-500" },
                { state: "EN_PROCESO", label: "En Proceso", color: "bg-indigo-500" },
                { state: "LISTA", label: "Listas para Entrega", color: "bg-emerald-500" },
                { state: "ENTREGADA", label: "Entregadas/Completadas", color: "bg-slate-500" },
              ].map((item) => {
                const count = stats.porEstado[item.state] || 0;
                const total = ordenes.length || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={item.state} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>{item.label}</span>
                      <span>{count} órdenes ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Métodos de Pago Preferidos */}
          <Card className="p-6 bg-white border-none shadow-sm rounded-2xl">
            <h3 className="font-display text-lg text-slate-800 mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-500" /> Métodos de Pago
            </h3>
            <div className="space-y-3">
              {["EFECTIVO", "TARJETA", "TRANSFERENCIA", "MIXTO"].map((m) => {
                const v = stats.porMetodo[m] || 0;
                const pct = stats.totalVentas > 0 ? (v / stats.totalVentas) * 100 : 0;
                const renderIcon = () => {
                  const size = "h-4 w-4 text-slate-500 shrink-0";
                  if (m === "EFECTIVO") return <Coins className={size} />;
                  if (m === "TARJETA") return <CreditCard className={size} />;
                  if (m === "TRANSFERENCIA") return <Landmark className={size} />;
                  return <Wallet className={size} />;
                };
                return (
                  <div key={m}>
                    <div className="mb-1 flex justify-between text-xs font-semibold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        {renderIcon()} {m}
                      </span>
                      <span>{formatRD(v)} ({Math.round(pct)}%)</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div 
                        className="h-full" 
                        style={{ 
                          width: `${pct}%`,
                          backgroundColor: primaryColor 
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Gastos por Categoría */}
          <Card className="p-6 bg-white border-none shadow-sm rounded-2xl">
            <h3 className="font-display text-lg text-slate-800 mb-4 flex items-center gap-2">
              <Tag className="h-5 w-5 text-rose-500" /> Gastos por Categoría
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.porCategoria).length > 0 ? (
                Object.entries(stats.porCategoria).map(([cat, val]) => {
                  const pct = stats.totalGastos > 0 ? (val / stats.totalGastos) * 100 : 0;
                  return (
                    <div key={cat}>
                      <div className="mb-1 flex justify-between text-xs font-semibold text-slate-700">
                        <span className="capitalize">{cat.toLowerCase()}</span>
                        <span>{formatRD(val)} ({Math.round(pct)}%)</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full bg-rose-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-xs text-muted-foreground py-6">
                  Sin gastos registrados en este período.
                </div>
              )}
            </div>
          </Card>

          {/* Servicios Más Populares */}
          <Card className="p-6 bg-white border-none shadow-sm rounded-2xl">
            <h3 className="font-display text-lg text-slate-800 mb-4 flex items-center gap-2">
              <WashingMachine className="h-5 w-5 text-blue-500" /> Servicios Más Populares
            </h3>
            <div className="space-y-3">
              {stats.topServicios.length > 0 ? (
                (() => {
                  const maxQty = Math.max(...stats.topServicios.map(s => s.count), 1);
                  return stats.topServicios.map((srv: any) => {
                    const pct = (srv.count / maxQty) * 100;
                    return (
                      <div key={srv.name} className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                          <span className="truncate max-w-[160px] font-bold text-slate-800">{srv.name}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 font-semibold border border-slate-200/50">
                              Cant. órdenes: {srv.count}
                            </span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-100/80">
                              Monto: {formatRD(srv.total)}
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div 
                            className="h-full" 
                            style={{ 
                              width: `${pct}%`,
                              backgroundColor: primaryColor 
                            }} 
                          />
                        </div>
                      </div>
                    );
                  });
                })()
              ) : (
                <div className="text-center text-xs text-muted-foreground py-6">
                  Sin servicios registrados en las órdenes de este período.
                </div>
              )}
            </div>
          </Card>

          {/* Prendas Más Solicitadas */}
          <Card className="p-6 bg-white border-none shadow-sm rounded-2xl">
            <h3 className="font-display text-lg text-slate-800 mb-4 flex items-center gap-2">
              <Shirt className="h-5 w-5 text-indigo-500" /> Prendas Más Solicitadas
            </h3>
            
            {/* Desglose de piezas vs libras */}
            <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-800">
                <span>Distribución por Formato</span>
                <span className="text-[10px] text-slate-500 font-semibold">
                  {stats.totalPiezas} pz | {stats.totalLibras} lb
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 flex">
                {stats.totalPiezas + stats.totalLibras > 0 ? (
                  <>
                    <div 
                      className="h-full bg-blue-500 transition-all" 
                      style={{ width: `${(stats.totalPiezas / (stats.totalPiezas + stats.totalLibras || 1)) * 100}%` }}
                    />
                    <div 
                      className="h-full bg-indigo-400 transition-all" 
                      style={{ width: `${(stats.totalLibras / (stats.totalPiezas + stats.totalLibras || 1)) * 100}%` }}
                    />
                  </>
                ) : (
                  <div className="h-full w-full bg-slate-200" />
                )}
              </div>
              <div className="flex justify-between text-[9px] font-bold text-slate-500">
                <span className="flex items-center"><span className="inline-block h-2 w-2 rounded-full bg-blue-500 mr-1.5" /> Por Pieza ({stats.totalPiezas})</span>
                <span className="flex items-center"><span className="inline-block h-2 w-2 rounded-full bg-indigo-400 mr-1.5" /> Por Libra ({stats.totalLibras})</span>
              </div>
            </div>

            <div className="space-y-3">
              {stats.topPrendas.length > 0 ? (
                (() => {
                  const maxQty = Math.max(...stats.topPrendas.map(p => p.count), 1);
                  return stats.topPrendas.map((garment: any) => {
                    const pct = (garment.count / maxQty) * 100;
                    return (
                      <div key={garment.name} className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                          <span className="truncate max-w-[160px] font-bold text-slate-800">{garment.name}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 font-semibold border border-slate-200/50">
                              Cantidad: {garment.count}
                            </span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-100/80">
                              Monto: {formatRD(garment.total)}
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div 
                            className="h-full" 
                            style={{ 
                              width: `${pct}%`,
                              backgroundColor: primaryColor 
                            }} 
                          />
                        </div>
                      </div>
                    );
                  });
                })()
              ) : (
                <div className="text-center text-xs text-muted-foreground py-6">
                  Sin prendas registradas en las órdenes de este período.
                </div>
              )}
            </div>
          </Card>

          {/* Cierres de Caja Recientes */}
          <Card className="p-6 bg-white border-none shadow-sm rounded-2xl">
            <h3 className="font-display text-lg text-slate-800 mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-500" /> Cierres de Caja Recientes
            </h3>
            <div className="space-y-3">
              {stats.cierresCaja.length > 0 ? (
                stats.cierresCaja.map((c: any) => {
                  const dif = c.diferencia || 0;
                  const statusColor = dif === 0 
                    ? "text-emerald-600 bg-emerald-50 border-emerald-100" 
                    : dif > 0 
                      ? "text-blue-600 bg-blue-50 border-blue-100" 
                      : "text-rose-600 bg-rose-50 border-rose-100";
                  const statusText = dif === 0 
                    ? "Cuadrada" 
                    : dif > 0 
                      ? `Sobrante: ${formatRD(dif)}` 
                      : `Faltante: ${formatRD(dif)}`;

                  return (
                    <div key={c.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">
                          Cierre de Caja
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {c.cerrada_en ? new Date(c.cerrada_en).toLocaleDateString("es-DO") : ""}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[9px] pt-1.5 border-t border-slate-100 text-slate-600">
                        <div>
                          <span className="block text-muted-foreground">Monto Inicial</span>
                          <strong className="font-bold text-slate-800">{formatRD(c.monto_inicial)}</strong>
                        </div>
                        <div>
                          <span className="block text-muted-foreground">Efectivo Real</span>
                          <strong className="font-bold text-slate-800">{formatRD(c.monto_contado_efectivo || 0)}</strong>
                        </div>
                        <div className="text-right">
                          <span className="block text-muted-foreground text-center">Cuadre</span>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${statusColor}`}>
                            {statusText}
                          </span>
                        </div>
                      </div>
                      {c.notas_cierre && (
                        <p className="text-[9px] text-slate-500 italic mt-0.5 border-t border-dashed border-slate-100 pt-1">
                          "{c.notas_cierre}"
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-xs text-muted-foreground py-8">
                  No se han registrado cierres de caja aún.
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Columna Derecha: Feed en Vivo y Personal */}
        <div className="space-y-6">
          {/* Actividad Reciente */}
          <Card className="p-6 bg-white border-none shadow-sm rounded-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display text-lg text-slate-800 flex items-center gap-2">
                <Bell className="h-5 w-5 text-indigo-500" /> Actividad Reciente (48h)
              </h3>
              <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                Autolimpieza activa
              </span>
            </div>
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {stats.recientes.length > 0 ? (
                stats.recientes.map((act: any) => {
                  return (
                    <div key={act.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100/50 hover:bg-slate-100/50 transition-colors">
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="font-semibold text-xs text-slate-800 truncate">{act.titulo}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{act.desc}</div>
                        <div className="text-[8px] text-slate-400 flex items-center gap-1 mt-1">
                          <Calendar className="h-2.5 w-2.5" />
                          {new Date(act.fecha).toLocaleString("es-DO", { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric' })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        {act.monto !== undefined && act.monto > 0 && (
                          <div className="font-bold text-xs text-slate-800">{formatRD(act.monto)}</div>
                        )}
                        <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase border ${act.color}`}>
                          {act.badgeText}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-xs text-muted-foreground py-8">
                  Sin actividades registradas en las últimas 48 horas.
                </div>
              )}
            </div>
          </Card>

          {/* Equipo Registrado */}
          <Card className="p-6 bg-white border-none shadow-sm rounded-2xl">
            <h3 className="font-display text-lg text-slate-800 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-500" /> Equipo de Trabajo
            </h3>
            <div className="space-y-3">
              {emps.length > 0 ? (
                emps.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100/50">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {emp.nombre.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-slate-800">{emp.nombre} {emp.apellido || ""}</div>
                        <div className="text-[9px] text-muted-foreground">{emp.email}</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                      {emp.rol}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center text-xs text-muted-foreground py-8">
                  No hay empleados configurados en esta sucursal.
                </div>
              )}
            </div>
          </Card>

          {/* Ventas por Empleado */}
          <Card className="p-6 bg-white border-none shadow-sm rounded-2xl">
            <h3 className="font-display text-lg text-slate-800 mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" /> Ventas por Empleado
            </h3>
            <div className="space-y-3">
              {emps.length > 0 ? (
                (() => {
                  const empData = emps.map(emp => {
                    const empOrds = ordenes.filter(o => o.empleado_id === emp.id);
                    const total = empOrds.reduce((s, o) => s + (o.total || 0), 0);
                    const count = empOrds.length;
                    return { emp, total, count };
                  });

                  const maxVentas = Math.max(...empData.map(d => d.total), 1);

                  return empData.map(({ emp, total, count }) => {
                    const pct = (total / maxVentas) * 100;
                    return (
                      <div key={emp.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-6 w-6 rounded-full flex items-center justify-center text-white font-bold text-[10px]"
                              style={{ backgroundColor: primaryColor }}
                            >
                              {emp.nombre.charAt(0)}
                            </div>
                            <span className="font-semibold text-xs text-slate-800">{emp.nombre} {emp.apellido || ""}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            {count} {count === 1 ? "orden" : "órdenes"}
                          </span>
                        </div>
                        <div>
                          <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                            <span>Total Ventas</span>
                            <span>{formatRD(total)}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div 
                              className="h-full rounded-full transition-all duration-500" 
                              style={{ 
                                width: `${pct}%`,
                                backgroundColor: primaryColor 
                              }} 
                            />
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()
              ) : (
                <div className="text-center text-xs text-muted-foreground py-8">
                  No hay empleados registrados.
                </div>
              )}
            </div>
          </Card>

          {/* Logística y Eficiencia Operativa */}
          <Card className="p-6 bg-white border-none shadow-sm rounded-2xl">
            <h3 className="font-display text-lg text-slate-800 mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-indigo-500" /> Logística y Eficiencia
            </h3>
            <div className="space-y-4">
              {/* Canal de Entrega */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>Canal de Entrega</span>
                  <span className="text-[10px] text-muted-foreground">
                    {stats.ordsDomicilio} delivery vs {stats.ordsLocal} local
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100 flex">
                  <div 
                    className="h-full text-[8px] font-bold text-white flex items-center justify-center transition-all animate-pulse" 
                    style={{ 
                      width: `${stats.pctDomicilio}%`,
                      backgroundColor: primaryColor
                    }} 
                    title={`Delivery: ${stats.pctDomicilio}%`}
                  >
                    {stats.pctDomicilio >= 15 && `${stats.pctDomicilio}%`}
                  </div>
                  <div 
                    className="h-full text-[8px] font-bold text-white flex items-center justify-center bg-slate-400 transition-all" 
                    style={{ 
                      width: `${stats.pctLocal}%`
                    }} 
                    title={`En Local: ${stats.pctLocal}%`}
                  >
                    {stats.pctLocal >= 15 && `${stats.pctLocal}%`}
                  </div>
                </div>
                <div className="flex justify-between text-[8px] text-muted-foreground px-1">
                  <span>Delivery ({stats.pctDomicilio}%)</span>
                  <span>En Local ({stats.pctLocal}%)</span>
                </div>
              </div>

              {/* Desglose de Delivery a Domicilio */}
              <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-dashed border-slate-100 text-[10px] text-slate-600">
                <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-100 flex flex-col justify-between">
                  <span className="text-[9px] text-emerald-800 font-medium">Entregados</span>
                  <strong className="text-emerald-700 font-bold text-xs mt-1">{stats.deliveryEntregados}</strong>
                </div>
                <div className="bg-amber-50/70 p-2 rounded-xl border border-amber-100 flex flex-col justify-between">
                  <span className="text-[9px] text-amber-800 font-medium">En Ruta</span>
                  <strong className="text-amber-700 font-bold text-xs mt-1">{stats.deliveryPendientes}</strong>
                </div>
                <div className="bg-rose-50/70 p-2 rounded-xl border border-rose-100 flex flex-col justify-between">
                  <span className="text-[9px] text-rose-800 font-medium">Cancelados</span>
                  <strong className="text-rose-700 font-bold text-xs mt-1">{stats.deliveryCancelados}</strong>
                </div>
              </div>

              {/* Tasa de Urgencia */}
              <div className="pt-3 border-t border-slate-100 space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>Tasa de Órdenes Express / Urgentes</span>
                  <span className={`text-[10px] font-bold ${stats.pctUrgencia > 20 ? 'text-amber-600' : 'text-slate-500'}`}>
                    {stats.ordsUrgentes} urgentes
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${stats.pctUrgencia}%`,
                      backgroundColor: stats.pctUrgencia > 20 ? '#D97706' : primaryColor
                    }} 
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] text-muted-foreground pt-0.5">
                  <span>Prioridad Express: {stats.pctUrgencia}%</span>
                  <span>
                    {stats.pctUrgencia > 20 ? (
                      <span className="text-amber-600 font-medium flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Alta demanda express
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Carga de trabajo estable
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Créditos, Deudas y Abonos de Clientes */}
          <Card className="p-6 bg-white border-none shadow-sm rounded-2xl">
            <h3 className="font-display text-lg text-slate-800 mb-4 flex items-center gap-2">
              <Landmark className="h-5 w-5 text-emerald-600" /> Créditos y Cuentas por Cobrar
            </h3>
            <div className="space-y-3">
              {/* Deuda Pendiente */}
              <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-rose-800 font-bold uppercase tracking-wider block">Deuda Pendiente (Por Cobrar)</span>
                  <div className="text-2xl font-display font-bold text-rose-600 mt-1">
                    {formatRD(stats.totalDeuda)}
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-rose-100 text-rose-800 text-[10px] font-extrabold rounded-lg">
                  {stats.cantidadDeudas} {stats.cantidadDeudas === 1 ? "factura" : "facturas"}
                </span>
              </div>

              {/* Abonos y Parciales */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">Abonos y Pagos Recibidos</span>
                  <div className="text-2xl font-display font-bold text-emerald-600 mt-1">
                    {formatRD(stats.totalAbonado + stats.totalAbonosCaja)}
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-lg">
                  Abonos Activos
                </span>
              </div>

              {/* Nota aclaratoria con estilo */}
              <div className="text-[9px] text-slate-500 bg-slate-50 border border-slate-100/80 p-2.5 rounded-xl text-center leading-normal flex items-center justify-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <span><strong>Cuentas por cobrar:</strong> Representa los saldos pendientes de pago de tus clientes. Los abonos reflejan pagos parciales aplicados a órdenes vigentes.</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {isPrinting && (
        <ReportesPrintPortal 
          stats={stats}
          tenant={user.tenant}
          ordenes={ordenes}
          gastos={gastos}
          emps={emps}
          movs={movs}
          cajas={cajas}
          onClose={() => setIsPrinting(false)}
        />
      )}
    </div>
  );
}

function ReportesPrintPortal({ 
  stats, 
  tenant, 
  ordenes, 
  gastos, 
  emps, 
  movs, 
  cajas, 
  onClose 
}: { 
  stats: any; 
  tenant: any; 
  ordenes: any[]; 
  gastos: any[]; 
  emps: any[]; 
  movs: any[]; 
  cajas: any[]; 
  onClose: () => void 
}) {
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
                Reporte de Rendimiento
              </h2>
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
                ESTADÍSTICAS E INDICADORES
              </div>
              <div className="text-xs text-slate-600">
                <span className="font-bold">Generado:</span> {new Date().toLocaleString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}
              </div>
            </div>
          </div>

          {/* Sección 1: KPIs Financieros */}
          <div className="grid grid-cols-5 gap-3 mb-8">
            <div className="p-3 border border-slate-200 rounded-xl text-center bg-slate-50">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ingresos Totales</div>
              <div className="text-sm font-bold text-slate-800">{formatRD(stats.totalVentas)}</div>
              <div className="text-[7px] text-slate-400 mt-0.5">Suma Facturada</div>
            </div>

            <div className="p-3 border border-slate-200 rounded-xl text-center bg-slate-50">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Gastos Totales</div>
              <div className="text-sm font-bold text-rose-600">{formatRD(stats.totalGastos)}</div>
              <div className="text-[7px] text-slate-400 mt-0.5">Operación + Caja</div>
            </div>

            <div className="p-3 border border-slate-200 rounded-xl text-center bg-slate-50 border-l-2 border-l-emerald-500">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Rentabilidad Neta</div>
              <div className={`text-sm font-bold ${stats.rentabilidad >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatRD(stats.rentabilidad)}
              </div>
              <div className="text-[7px] text-slate-400 mt-0.5">Utilidad Neta</div>
            </div>

            <div className="p-3 border border-slate-200 rounded-xl text-center bg-slate-50">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">ITBIS Recaudado</div>
              <div className="text-sm font-bold text-blue-600">{formatRD(stats.totalITBIS)}</div>
              <div className="text-[7px] text-slate-400 mt-0.5">DGII</div>
            </div>

            <div className="p-3 border border-slate-200 rounded-xl text-center bg-slate-50">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ticket Promedio</div>
              <div className="text-sm font-bold text-slate-800">{formatRD(stats.ticketPromedio)}</div>
              <div className="text-[7px] text-slate-400 mt-0.5">Gasto medio</div>
            </div>
          </div>

          {/* Sección 2: Tablas y Desgloses */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Columna Izquierda */}
            <div className="space-y-8">
              {/* Estado de Órdenes */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                  Estado de las Órdenes
                </h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[9px] text-slate-400 font-bold uppercase border-b border-slate-100">
                      <th className="text-left py-1.5">Estado</th>
                      <th className="text-right py-1.5">Órdenes</th>
                      <th className="text-right py-1.5">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { state: "RECIBIDA", label: "Recibidas" },
                      { state: "EN_PROCESO", label: "En Proceso" },
                      { state: "LISTA", label: "Listas para Entrega" },
                      { state: "ENTREGADA", label: "Entregadas/Completadas" },
                    ].map((item) => {
                      const count = stats.porEstado[item.state] || 0;
                      const total = ordenes.length || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <tr key={item.state} className="border-b border-slate-100/50">
                          <td className="py-1.5 font-medium text-slate-700">{item.label}</td>
                          <td className="py-1.5 text-right font-bold text-slate-800">{count}</td>
                          <td className="py-1.5 text-right text-slate-500">{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Métodos de Pago */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                  Métodos de Pago
                </h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[9px] text-slate-400 font-bold uppercase border-b border-slate-100">
                      <th className="text-left py-1.5">Método</th>
                      <th className="text-right py-1.5">Total</th>
                      <th className="text-right py-1.5">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {["EFECTIVO", "TARJETA", "TRANSFERENCIA", "MIXTO"].map((m) => {
                      const v = stats.porMetodo[m] || 0;
                      const pct = stats.totalVentas > 0 ? (v / stats.totalVentas) * 100 : 0;
                      return (
                        <tr key={m} className="border-b border-slate-100/50">
                          <td className="py-1.5 font-medium text-slate-700">{m}</td>
                          <td className="py-1.5 text-right font-bold text-slate-800">{formatRD(v)}</td>
                          <td className="py-1.5 text-right text-slate-500">{Math.round(pct)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Gastos por Categoría */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                  Gastos por Categoría
                </h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[9px] text-slate-400 font-bold uppercase border-b border-slate-100">
                      <th className="text-left py-1.5">Categoría</th>
                      <th className="text-right py-1.5">Monto</th>
                      <th className="text-right py-1.5">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(stats.porCategoria).length > 0 ? (
                      Object.entries(stats.porCategoria).map(([cat, val]) => {
                        const pct = stats.totalGastos > 0 ? ((val as number) / stats.totalGastos) * 100 : 0;
                        return (
                          <tr key={cat} className="border-b border-slate-100/50">
                            <td className="py-1.5 font-medium text-slate-700 capitalize">{cat.toLowerCase()}</td>
                            <td className="py-1.5 text-right font-bold text-slate-800">{formatRD(val as number)}</td>
                            <td className="py-1.5 text-right text-slate-500">{Math.round(pct)}%</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-slate-400 italic">Sin gastos registrados</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Columna Derecha */}
            <div className="space-y-8">
              {/* Servicios Populares */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                  Servicios Más Populares
                </h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[9px] text-slate-400 font-bold uppercase border-b border-slate-100">
                      <th className="text-left py-1.5">Servicio</th>
                      <th className="text-right py-1.5">Órdenes</th>
                      <th className="text-right py-1.5">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topServicios.length > 0 ? (
                      stats.topServicios.map((srv: any) => (
                        <tr key={srv.name} className="border-b border-slate-100/50">
                          <td className="py-1.5 font-medium text-slate-700 truncate max-w-[140px]">{srv.name}</td>
                          <td className="py-1.5 text-right text-slate-800">{srv.count}</td>
                          <td className="py-1.5 text-right font-bold text-slate-800">{formatRD(srv.total)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-slate-400 italic">Sin servicios populares</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Prendas Populares */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                  Prendas Más Solicitadas
                </h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[9px] text-slate-400 font-bold uppercase border-b border-slate-100">
                      <th className="text-left py-1.5">Prenda</th>
                      <th className="text-right py-1.5">Cantidad</th>
                      <th className="text-right py-1.5">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topPrendas.length > 0 ? (
                      stats.topPrendas.map((garment: any) => (
                        <tr key={garment.name} className="border-b border-slate-100/50">
                          <td className="py-1.5 font-medium text-slate-700 truncate max-w-[140px]">{garment.name}</td>
                          <td className="py-1.5 text-right text-slate-800">{garment.count}</td>
                          <td className="py-1.5 text-right font-bold text-slate-800">{formatRD(garment.total)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-slate-400 italic">Sin prendas populares</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Ventas por Empleado */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                  Rendimiento del Equipo
                </h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[9px] text-slate-400 font-bold uppercase border-b border-slate-100">
                      <th className="text-left py-1.5">Colaborador</th>
                      <th className="text-right py-1.5">Órdenes</th>
                      <th className="text-right py-1.5">Total Ventas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emps.length > 0 ? (
                      (() => {
                        const empData = emps.map(emp => {
                          const empOrds = ordenes.filter(o => o.empleado_id === emp.id);
                          const total = empOrds.reduce((s, o) => s + (o.total || 0), 0);
                          const count = empOrds.length;
                          return { emp, total, count };
                        });
                        return empData.map(({ emp, total, count }) => (
                          <tr key={emp.id} className="border-b border-slate-100/50">
                            <td className="py-1.5 font-medium text-slate-700">{emp.nombre} {emp.apellido || ""}</td>
                            <td className="py-1.5 text-right text-slate-800">{count}</td>
                            <td className="py-1.5 text-right font-bold text-slate-800">{formatRD(total)}</td>
                          </tr>
                        ));
                      })()
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-slate-400 italic">Sin empleados registrados</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Logística y Urgencias */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                  Logística y Urgencias
                </h3>
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex justify-between py-1 border-b border-slate-100/50">
                    <span>Canal Domicilio (Delivery):</span>
                    <strong className="text-slate-800">{stats.ordsDomicilio} órdenes ({stats.pctDomicilio}%)</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100/50">
                    <span>Canal Local (En Lavandería):</span>
                    <strong className="text-slate-800">{stats.ordsLocal} órdenes ({stats.pctLocal}%)</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100/50">
                    <span>Tasa de Órdenes Express (Urgentes):</span>
                    <strong className="text-amber-600">{stats.ordsUrgentes} órdenes ({stats.pctUrgencia}%)</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cierres de Caja Recientes */}
          <div className="mb-8">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
              Historial de Cierres de Caja Recientes
            </h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[9px] text-slate-400 font-bold uppercase border-b border-slate-100">
                  <th className="text-left py-1.5">Fecha Cierre</th>
                  <th className="text-right py-1.5">Monto Inicial</th>
                  <th className="text-right py-1.5">Efectivo Real</th>
                  <th className="text-right py-1.5">Diferencia / Cuadre</th>
                </tr>
              </thead>
              <tbody>
                {stats.cierresCaja.length > 0 ? (
                  stats.cierresCaja.map((c: any) => {
                    const dif = c.diferencia || 0;
                    const statusText = dif === 0 
                      ? "Cuadrada" 
                      : dif > 0 
                        ? `Sobrante: ${formatRD(dif)}` 
                        : `Faltante: ${formatRD(dif)}`;
                    const statusColor = dif === 0 
                      ? "text-emerald-600" 
                      : dif > 0 
                        ? "text-blue-600" 
                        : "text-rose-600";
                    return (
                      <tr key={c.id} className="border-b border-slate-100/50">
                        <td className="py-2 text-slate-700">
                          {c.cerrada_en ? new Date(c.cerrada_en).toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                        <td className="py-2 text-right text-slate-650">{formatRD(c.monto_inicial)}</td>
                        <td className="py-2 text-right text-slate-800 font-medium">{formatRD(c.monto_contado_efectivo || 0)}</td>
                        <td className={`py-2 text-right font-bold ${statusColor}`}>{statusText}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400 italic">No hay cierres de caja registrados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Cuentas por Cobrar y Abonos */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between gap-6 mb-8">
            <div className="flex-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Cuentas por Cobrar (Clientes)</span>
              <div className="text-xl font-bold text-rose-600">{formatRD(stats.totalDeuda)}</div>
              <span className="text-[9px] text-slate-500">Pendiente en {stats.cantidadDeudas} {stats.cantidadDeudas === 1 ? 'factura' : 'facturas'}</span>
            </div>
            <div className="w-px bg-slate-200 self-stretch" />
            <div className="flex-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Abonos y Anticipos Recibidos</span>
              <div className="text-xl font-bold text-emerald-600">{formatRD(stats.totalAbonado + stats.totalAbonosCaja)}</div>
              <span className="text-[9px] text-slate-500">Pagos parciales aplicados</span>
            </div>
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
