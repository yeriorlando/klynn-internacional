import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  Building2, 
  TrendingUp, 
  Package, 
  ExternalLink, 
  ArrowRight, 
  LayoutDashboard, 
  LogOut, 
  Shield, 
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Crown,
  MessageCircle,
  DollarSign,
  Users,
  Wallet,
  Calendar,
  ArrowLeft,
  Download,
  FileSpreadsheet,
  Printer,
  CreditCard,
  Tag,
  Shirt,
  Bell,
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
  AlertCircle,
  Landmark
} from "lucide-react";
import { Logo } from "@/components/klynn/Logo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { exportToCsv } from "@/lib/export";
import { 
  getTenantsForUser, 
  getOrdenes, 
  formatRD, 
  setActiveTenant,
  setSession,
  logout,
  getGastos,
  getMovimientos,
  getEmpleados,
  getCajas,
  type Tenant
} from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/reportes")({
  component: ReportesPage,
});

function ReportesPage() {
  const auth = useRequireAuth();
  const navigate = useNavigate();
  const [selectedInspectTenant, setSelectedInspectTenant] = useState<Tenant | null>(null);
  const [inspectLoading, setInspectLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [inspectData, setInspectData] = useState<{
    ordenes: any[];
    gastos: any[];
    empleados: any[];
    movimientos: any[];
    cajas: any[];
  } | null>(null);

  useEffect(() => {
    async function load() {
      if (!auth?.empleado.email || auth.empleado.id === '__loading__') return;
      const params = new URLSearchParams(window.location.search);
      const tenantId = params.get("tenantId");
      if (!tenantId) {
        navigate({ to: "/dashboard-admin" });
        return;
      }

      setInspectLoading(true);
      try {
        const tenants = await getTenantsForUser(auth.empleado.email);
        const tenant = tenants.find(t => t.id === tenantId);
        if (!tenant) {
            navigate({ to: "/dashboard-admin" });
            return;
        }
        setSelectedInspectTenant(tenant);

        const [oList, gList, eList, mList, cList] = await Promise.all([
          getOrdenes(tenantId),
          getGastos(tenantId),
          getEmpleados(tenantId),
          getMovimientos(tenantId),
          getCajas(tenantId)
        ]);
        setInspectData({
          ordenes: (oList || []).filter((o: any) => o.estado !== "ANULADA"),
          gastos: gList || [],
          empleados: eList || [],
          movimientos: mList || [],
          cajas: cList || []
        });
      } catch (err) {
        console.error("Error loading inspect data:", err);
        toast.error("Error al cargar estadísticas de la sucursal");
      } finally {
        setInspectLoading(false);
      }
    }
    load();
  }, [auth?.empleado.email, navigate]);

  const inspectStats = useMemo(() => {
    if (!inspectData) return null;
    const { ordenes, gastos, movimientos, cajas } = inspectData;

    const totalVentas = ordenes.reduce((s, o) => s + (o.total || 0), 0);
    const totalITBIS = ordenes.reduce((s, o) => s + (o.itbis || 0), 0);
    
    // Gastos manuales + caja chica
    const gastosManuales = gastos.filter(g => !g.is_caja_chica).reduce((s, g) => s + g.monto, 0);
    const gastosCajaChica = movimientos.filter(m => m.tipo === "GASTO_CAJA_CHICA").reduce((s, m) => s + m.monto, 0);
    const totalGastos = gastosManuales + gastosCajaChica;

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
    movimientos.forEach(m => {
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
      .slice(0, 10);

    // --- 1. Top de Prendas Más Solicitadas (Ropa) ---
    const garmentCounts: Record<string, { count: number; total: number }> = {};
    let totalPiezas = 0;
    let totalLibras = 0;
    ordenes.forEach(o => {
      if (Array.isArray(o.items)) {
        o.items.forEach((item: any) => {
          const desc = item.descripcion || "Otros";
          const qty = item.cantidad || 1;
          const sub = (item.precio_unitario || 0) * qty;
          if (!garmentCounts[desc]) {
            garmentCounts[desc] = { count: 0, total: 0 };
          }
          garmentCounts[desc].count += qty;
          garmentCounts[desc].total += sub;

          if (item.es_libra) {
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
      if (Array.isArray(o.servicios)) {
        o.servicios.forEach((sName: string) => {
          const price = o.servicios_precios?.[sName] || 0;
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

    const realAbonosMovs = movimientos.filter(m => m.concepto?.toLowerCase().includes("abono"));
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
  }, [inspectData]);

  function handleManage(tenantId: string, slug: string) {
    setSession({ empleado_id: auth?.empleado.id || 'admin', tenant_id: tenantId, iniciado_en: new Date().toISOString() });
    setActiveTenant(slug);
    toast.success(`Entrando a ${slug}...`);
    setTimeout(() => window.location.assign(`/t/${slug}`), 500);
  }

  function handleLogout() {
    logout();
    navigate({ to: "/login" });
  }

  if (!auth || auth.empleado.id === '__loading__') return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge variant="outline" className="border-primary/20 bg-primary/10">
              <Shield className="mr-1 h-3 w-3" /> Reportes de Sucursal
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => navigate({ to: "/dashboard-admin" })} 
              className="h-9 px-4 rounded-lg font-bold shadow-sm transition-all bg-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Dashboard
            </Button>
            <Button 
              size="sm" 
              variant="destructive" 
              onClick={handleLogout} 
              className="h-9 px-4 rounded-lg font-bold shadow-md hover:opacity-90 transition-all"
            >
              <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      {selectedInspectTenant && (
        <>
          {/* Hero Banner */}
          <div className="mt-4">
            <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] mx-auto max-w-7xl px-8 py-10 flex flex-col items-center text-center">
              {selectedInspectTenant.logo_url && (
                <img 
                  src={selectedInspectTenant.logo_url} 
                  alt="Logo" 
                  className="h-20 max-w-[220px] object-contain" 
                />
              )}
              <p 
                className="text-xl font-bold font-display mt-4"
                style={{ color: selectedInspectTenant.color_primario || '#1B4B73' }}
              >
                Reportes y estadísticas
              </p>
              <Button 
                onClick={() => handleManage(selectedInspectTenant.id, selectedInspectTenant.slug)}
                size="sm"
                className="mt-5 gap-2 bg-slate-800 text-white hover:bg-slate-900 shadow-sm border-0 transition-all duration-200 active:scale-95 font-bold h-9 text-sm rounded-lg px-5"
              >
                Gestionar Sucursal <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <main className="mx-auto max-w-7xl px-6 pt-16 pb-10 relative z-20">
            {inspectLoading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl shadow-sm">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" style={{ color: selectedInspectTenant.color_primario }} />
                <p className="text-sm font-semibold text-muted-foreground animate-pulse">Procesando datos en tiempo real...</p>
              </div>
            ) : inspectStats && inspectData ? (
              <div className="space-y-6">
                {/* Botones de Exportar e Imprimir */}
                <div className="flex justify-end items-center gap-2 print:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="gap-2 bg-slate-800 text-white hover:bg-slate-900 shadow-sm border-0 transition-all duration-200 active:scale-95">
                        <Download className="h-4 w-4" /> Exportar
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-elegant">
                      <DropdownMenuItem 
                        className="gap-2 cursor-pointer py-2 rounded-lg" 
                        onClick={() => {
                          if (!inspectStats) return;
                          const rows = [
                            ["Ingresos totales (Ventas)", formatRD(inspectStats.totalVentas)],
                            ["Gastos totales", formatRD(inspectStats.totalGastos)],
                            ["Rentabilidad neta", formatRD(inspectStats.rentabilidad)],
                            ["ITBIS generado", formatRD(inspectStats.totalITBIS)],
                            ["Ticket promedio", formatRD(inspectStats.ticketPromedio)],
                            ["Cuentas por cobrar (Clientes)", formatRD(inspectStats.totalDeuda)],
                            ["Abonos de clientes", formatRD(inspectStats.totalAbonado + inspectStats.totalAbonosCaja)],
                            ["Prendas por pieza procesadas", `${inspectStats.totalPiezas} piezas`],
                            ["Prendas por libra procesadas", `${inspectStats.totalLibras} libras`],
                            ...inspectStats.topServicios.map((s: any) => [`Top Servicio: ${s.name}`, `${s.count} ordenes (${formatRD(s.total)})`]),
                            ...inspectStats.topPrendas.map((p: any) => [`Top Prenda: ${p.name}`, `${p.count} cant. (${formatRD(p.total)})`]),
                            ...inspectData.empleados.map((e: any) => {
                              const empOrds = inspectData.ordenes.filter((o: any) => o.empleado_id === e.id);
                              const total = empOrds.reduce((s: number, o: any) => s + (o.total || 0), 0);
                              return [`Ventas - Empleado: ${e.nombre}`, `${empOrds.length} órdenes (${formatRD(total)})`];
                            })
                          ];
                          exportToCsv("Reporte_Rendimiento", ["Métrica / Categoría", "Valor Registrado"], rows);
                        }}
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
                </div>
                {/* Fila 1: KPIs Financieros */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <Card className="p-4 bg-white border-none shadow-sm flex flex-col justify-between h-28 hover:shadow transition-shadow">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-primary" style={{ color: selectedInspectTenant.color_primario }} /> Ingresos Totales
                    </div>
                    <div className="text-xl font-display font-bold mt-1 text-slate-800">
                      {formatRD(inspectStats.totalVentas)}
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-1">Suma total facturada</div>
                  </Card>

                  <Card className="p-4 bg-white border-none shadow-sm flex flex-col justify-between h-28 hover:shadow transition-shadow">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-rose-500" /> Gastos Totales
                    </div>
                    <div className="text-xl font-display font-bold mt-1 text-rose-600">
                      {formatRD(inspectStats.totalGastos)}
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-1">Manuales + caja chica</div>
                  </Card>

                  <Card className="p-4 bg-white border-none shadow-sm flex flex-col justify-between h-28 hover:shadow transition-shadow border-l-4 border-l-emerald-500">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Wallet className="h-3.5 w-3.5 text-emerald-500" /> Rentabilidad Neta
                    </div>
                    <div className={`text-xl font-display font-bold mt-1 ${inspectStats.rentabilidad >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatRD(inspectStats.rentabilidad)}
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-1">Beneficio neto real</div>
                  </Card>

                  <Card className="p-4 bg-white border-none shadow-sm flex flex-col justify-between h-28 hover:shadow transition-shadow">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-blue-500" /> ITBIS Recaudado
                    </div>
                    <div className="text-xl font-display font-bold mt-1 text-blue-600">
                      {formatRD(inspectStats.totalITBIS)}
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-1">Declaración DGII</div>
                  </Card>

                  <Card className="p-4 bg-white border-none shadow-sm flex flex-col justify-between h-28 hover:shadow transition-shadow">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Ticket Promedio
                    </div>
                    <div className="text-xl font-display font-bold mt-1 text-slate-800">
                      {formatRD(inspectStats.ticketPromedio)}
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
                          const count = inspectStats.porEstado[item.state] || 0;
                          const total = inspectData?.ordenes.length || 1;
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
                          const v = inspectStats.porMetodo[m] || 0;
                          const pct = inspectStats.totalVentas > 0 ? (v / inspectStats.totalVentas) * 100 : 0;
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
                                  className="h-full bg-primary" 
                                  style={{ 
                                    width: `${pct}%`,
                                    backgroundColor: selectedInspectTenant.color_primario 
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
                        {Object.entries(inspectStats.porCategoria).length > 0 ? (
                          Object.entries(inspectStats.porCategoria).map(([cat, val]: [string, any]) => {
                            const pct = inspectStats.totalGastos > 0 ? (val / inspectStats.totalGastos) * 100 : 0;
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
                        {inspectStats.topServicios.length > 0 ? (
                          (() => {
                            const maxQty = Math.max(...inspectStats.topServicios.map(s => s.count), 1);
                            return inspectStats.topServicios.map((srv: any) => {
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
                                      className="h-full bg-indigo-500" 
                                      style={{ 
                                        width: `${pct}%`,
                                        backgroundColor: selectedInspectTenant.color_primario 
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
                            {inspectStats.totalPiezas} pz | {inspectStats.totalLibras} lb
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100 flex">
                          {inspectStats.totalPiezas + inspectStats.totalLibras > 0 ? (
                            <>
                              <div 
                                className="h-full bg-blue-500 transition-all" 
                                style={{ width: `${(inspectStats.totalPiezas / (inspectStats.totalPiezas + inspectStats.totalLibras || 1)) * 100}%` }}
                              />
                              <div 
                                className="h-full bg-indigo-400 transition-all" 
                                style={{ width: `${(inspectStats.totalLibras / (inspectStats.totalLibras || 1)) * 100}%` }}
                              />
                            </>
                          ) : (
                            <div className="h-full w-full bg-slate-200" />
                          )}
                        </div>
                        <div className="flex justify-between text-[9px] font-bold text-slate-500">
                          <span className="flex items-center"><span className="inline-block h-2 w-2 rounded-full bg-blue-500 mr-1.5" /> Por Pieza ({inspectStats.totalPiezas})</span>
                          <span className="flex items-center"><span className="inline-block h-2 w-2 rounded-full bg-indigo-400 mr-1.5" /> Por Libra ({inspectStats.totalLibras})</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {inspectStats.topPrendas.length > 0 ? (
                          (() => {
                            const maxQty = Math.max(...inspectStats.topPrendas.map(p => p.count), 1);
                            return inspectStats.topPrendas.map((garment: any) => {
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
                                      className="h-full bg-indigo-500" 
                                      style={{ 
                                        width: `${pct}%`,
                                        backgroundColor: selectedInspectTenant.color_primario 
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
                        {inspectStats.cierresCaja.length > 0 ? (
                          inspectStats.cierresCaja.map((c: any) => {
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
                                    <Calendar className="h-3 w-3" />
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
                        {inspectStats.recientes.length > 0 ? (
                          inspectStats.recientes.map((act: any) => {
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
                        {inspectData.empleados.length > 0 ? (
                          inspectData.empleados.map((emp) => (
                            <div key={emp.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100/50">
                              <div className="flex items-center gap-2.5">
                                <div 
                                  className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                                  style={{ backgroundColor: selectedInspectTenant.color_primario }}
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
                        {inspectData.empleados.length > 0 ? (
                          (() => {
                            const empData = inspectData.empleados.map(emp => {
                              const empOrds = inspectData.ordenes.filter(o => o.empleado_id === emp.id);
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
                                        style={{ backgroundColor: selectedInspectTenant.color_primario }}
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
                                          backgroundColor: selectedInspectTenant.color_primario 
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
                              {inspectStats.ordsDomicilio} delivery vs {inspectStats.ordsLocal} local
                            </span>
                          </div>
                          <div className="h-3 overflow-hidden rounded-full bg-slate-100 flex">
                            <div 
                              className="h-full text-[8px] font-bold text-white flex items-center justify-center transition-all" 
                              style={{ 
                                width: `${inspectStats.pctDomicilio}%`,
                                backgroundColor: selectedInspectTenant.color_primario || '#1B4B73'
                              }} 
                              title={`Delivery: ${inspectStats.pctDomicilio}%`}
                            >
                              {inspectStats.pctDomicilio >= 15 && `${inspectStats.pctDomicilio}% 🚚`}
                            </div>
                            <div 
                              className="h-full text-[8px] font-bold text-white flex items-center justify-center bg-slate-400 transition-all" 
                              style={{ 
                                width: `${inspectStats.pctLocal}%`
                              }} 
                              title={`En Local: ${inspectStats.pctLocal}%`}
                            >
                              {inspectStats.pctLocal >= 15 && `${inspectStats.pctLocal}% 🧺`}
                            </div>
                          </div>
                          <div className="flex justify-between text-[8px] text-muted-foreground px-1">
                            <span>Delivery ({inspectStats.pctDomicilio}%)</span>
                            <span>En Local ({inspectStats.pctLocal}%)</span>
                          </div>
                        </div>

                        {/* Desglose de Delivery a Domicilio */}
                        <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-dashed border-slate-100 text-[10px] text-slate-600">
                          <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-100 flex flex-col justify-between">
                            <span className="text-[9px] text-emerald-800 font-medium">Entregados</span>
                            <strong className="text-emerald-700 font-bold text-xs mt-1">{inspectStats.deliveryEntregados}</strong>
                          </div>
                          <div className="bg-amber-50/70 p-2 rounded-xl border border-amber-100 flex flex-col justify-between">
                            <span className="text-[9px] text-amber-800 font-medium">En Ruta</span>
                            <strong className="text-amber-700 font-bold text-xs mt-1">{inspectStats.deliveryPendientes}</strong>
                          </div>
                          <div className="bg-rose-50/70 p-2 rounded-xl border border-rose-100 flex flex-col justify-between">
                            <span className="text-[9px] text-rose-800 font-medium">Cancelados</span>
                            <strong className="text-rose-700 font-bold text-xs mt-1">{inspectStats.deliveryCancelados}</strong>
                          </div>
                        </div>

                        {/* Tasa de Urgencia */}
                        <div className="pt-3 border-t border-slate-100 space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold text-slate-700">
                            <span>Tasa de Órdenes Express / Urgentes</span>
                            <span className={`text-[10px] font-bold ${inspectStats.pctUrgencia > 20 ? 'text-amber-600' : 'text-slate-500'}`}>
                              {inspectStats.ordsUrgentes} urgentes
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div 
                              className="h-full rounded-full transition-all duration-500" 
                              style={{ 
                                width: `${inspectStats.pctUrgencia}%`,
                                backgroundColor: inspectStats.pctUrgencia > 20 ? '#D97706' : (selectedInspectTenant.color_primario || '#1B4B73')
                              }} 
                            />
                          </div>
                          <div className="flex justify-between items-center text-[9px] text-muted-foreground pt-0.5">
                            <span>Prioridad Express: {inspectStats.pctUrgencia}%</span>
                            <span>
                              {inspectStats.pctUrgencia > 20 ? (
                                <span className="text-amber-600 font-medium"><AlertCircle className="h-3 w-3 text-amber-600 inline mr-1" /> Alta demanda express</span>
                              ) : (
                                <span className="text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Carga de trabajo estable</span>
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
                              {formatRD(inspectStats.totalDeuda)}
                            </div>
                          </div>
                          <span className="px-2.5 py-1 bg-rose-100 text-rose-800 text-[10px] font-extrabold rounded-lg">
                            {inspectStats.cantidadDeudas} {inspectStats.cantidadDeudas === 1 ? "factura" : "facturas"}
                          </span>
                        </div>

                        {/* Abonos y Parciales */}
                        <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100/50 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">Abonos y Pagos Recibidos</span>
                            <div className="text-2xl font-display font-bold text-emerald-600 mt-1">
                              {formatRD(inspectStats.totalAbonado + inspectStats.totalAbonosCaja)}
                            </div>
                          </div>
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-lg">
                            Abonos Activos
                          </span>
                        </div>

                        {/* Nota aclaratoria con estilo */}
                        <div className="text-[9px] text-slate-500 bg-slate-50 border border-slate-100/80 p-2.5 rounded-xl text-center leading-normal">
                          <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 inline mr-1" /> <strong>Cuentas por cobrar:</strong> Representa los saldos pendientes de pago de tus clientes. Los abonos reflejan pagos parciales aplicados a órdenes vigentes.
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            ) : null}

            {isPrinting && selectedInspectTenant && inspectStats && inspectData && (
              <ReportesPrintPortal 
                stats={inspectStats}
                tenant={selectedInspectTenant}
                ordenes={inspectData.ordenes}
                gastos={inspectData.gastos}
                emps={inspectData.empleados}
                movs={inspectData.movimientos}
                cajas={inspectData.cajas}
                onClose={() => setIsPrinting(false)}
              />
            )}
          </main>
        </>
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
                      <th className="text-right py-1.5">Cantidad</th>
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
                        const empData = emps.map((emp: any) => {
                          const empOrds = ordenes.filter((o: any) => o.empleado_id === emp.id);
                          const total = empOrds.reduce((s: number, o: any) => s + (o.total || 0), 0);
                          const count = empOrds.length;
                          return { emp, total, count };
                        });
                        return empData.map(({ emp, total, count }: any) => (
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
