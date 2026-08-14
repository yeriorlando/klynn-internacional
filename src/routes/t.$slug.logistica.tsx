import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bike,
  Package,
  MapPin,
  CheckCircle2,
  Clock,
  Search,
  Phone,
  Navigation,
  TrendingUp,
  PackageCheck,
  Truck,
  AlertCircle,
  Filter,
  X,
  Undo2,
  Timer,
  ChevronRight,
  User as UserIcon,
  Calendar,
  Route as RouteIcon,
  Map as MapIcon,
  LayoutGrid,
  Printer,
  Compass,
  DollarSign,
  AlertTriangle,
  FileText,
  UserCheck,
  Building,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { 
  getOrdenes, getClientes, getEmpleados, saveOrden, formatRD, formatDateRD, 
  type Orden, type Cliente, type Empleado, type EstadoOrden 
} from "@/lib/storage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProofOfDeliveryDialog } from "@/components/klynn/logistica/ProofOfDeliveryDialog";
import { IncidenciaDialog } from "@/components/klynn/logistica/IncidenciaDialog";
import { LogisticsMap } from "@/components/klynn/logistica/LogisticsMap";
import { DeliveryManifestPrint } from "@/components/klynn/logistica/DeliveryManifestPrint";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/t/$slug/logistica")({
  component: LogisticaPage,
});

function LogisticaPage() {
  const user = useRequireAuth();
  const queryClient = useQueryClient();
  
  const [ordenesRaw, setOrdenesRaw] = useState<Orden[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<EstadoOrden | "TODAS">("TODAS");
  const [filterRepartidor, setFilterRepartidor] = useState<string>("TODOS");
  const [filterSector, setFilterSector] = useState<string>("TODOS");
  
  // Modales
  const [detailId, setDetailId] = useState<string | null>(null);
  const [podOrder, setPodOrder] = useState<Orden | null>(null);
  const [incidenciaOrder, setIncidenciaOrder] = useState<Orden | null>(null);
  const [showManifest, setShowManifest] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    async function load() {
      const tId = user?.tenant?.id;
      if (!tId || tId === '__loading__') return;
      setLoading(true);
      const [oList, cList, eList] = await Promise.all([
        getOrdenes(tId),
        getClientes(tId),
        getEmpleados(tId),
      ]);
      setOrdenesRaw(oList);
      setClientes(cList);
      setEmpleados(eList);
      setLoading(false);
    }
    load();
  }, [user?.tenant?.id, refresh]);

  // Rol del usuario actual
  const isRepartidor = user?.empleado?.rol === "REPARTIDOR";
  const currentEmpleadoId = user?.empleado?.id;

  // Lista de Repartidores
  const repartidores = useMemo(() => {
    return empleados.filter(e => e.activo && (e.rol === "REPARTIDOR" || e.rol === "ADMIN" || e.rol === "SUPERVISOR"));
  }, [empleados]);

  // Solo órdenes que son de delivery (entrega_domicilio === true o con dirección asignada)
  const deliveryOrders = useMemo(() => {
    return ordenesRaw.filter(o => {
      if (o.estado === "ANULADA") return false;
      const cli = clientes.find(c => c.id === o.cliente_id);
      const isDelivery = o.entrega_domicilio || (o.costo_envio && o.costo_envio > 0) || !!cli?.direccion || !!o.repartidor_id;
      if (!isDelivery) return false;

      // El REPARTIDOR solo puede ver las órdenes que le han sido asignadas a él
      if (isRepartidor) {
        return o.repartidor_id === currentEmpleadoId;
      }
      return true;
    });
  }, [ordenesRaw, clientes, isRepartidor, currentEmpleadoId]);

  // Lista de sectores únicos para el filtro
  const sectoresDisponibles = useMemo(() => {
    const set = new Set<string>();
    deliveryOrders.forEach(o => {
      const cli = clientes.find(c => c.id === o.cliente_id);
      const s = o.sector_entrega || cli?.sector;
      if (s) set.add(s);
    });
    return Array.from(set);
  }, [deliveryOrders, clientes]);

  // KPIs de resumen
  const stats = useMemo(() => {
    const list = deliveryOrders;
    return {
      pendientes: list.filter(o => ["RECIBIDA", "EN_PROCESO", "LISTA"].includes(o.estado)).length,
      enCamino: list.filter(o => o.estado === "EN_CAMINO").length,
      entregadas: list.filter(o => o.estado === "ENTREGADA").length,
      incidencias: list.filter(o => o.estado === "INCIDENCIA").length,
      total: list.length,
      saldoPorCobrar: list.filter(o => ["RECIBIDA", "EN_PROCESO", "LISTA", "EN_CAMINO", "INCIDENCIA"].includes(o.estado)).reduce((s, o) => s + (o.saldo || 0), 0),
    };
  }, [deliveryOrders]);

  // Órdenes filtradas para mostrar en tarjetas / mapa
  const filteredOrders = useMemo(() => {
    return deliveryOrders.filter((o) => {
      const cli = clientes.find(c => c.id === o.cliente_id);
      
      // Filtro de Estado
      if (filterStatus === "LISTA") {
        if (!["RECIBIDA", "EN_PROCESO", "LISTA"].includes(o.estado)) return false;
      } else if (filterStatus !== "TODAS" && o.estado !== filterStatus) {
        return false;
      }

      // Filtro de Repartidor
      if (filterRepartidor === "SIN_ASIGNAR" && o.repartidor_id) return false;
      if (filterRepartidor !== "TODOS" && filterRepartidor !== "SIN_ASIGNAR" && o.repartidor_id !== filterRepartidor) return false;

      // Filtro de Sector
      const sector = o.sector_entrega || cli?.sector;
      if (filterSector !== "TODOS" && sector !== filterSector) return false;

      // Filtro de búsqueda
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        o.numero.toLowerCase().includes(q) ||
        cli?.nombre.toLowerCase().includes(q) ||
        cli?.telefono.includes(q) ||
        cli?.direccion?.toLowerCase().includes(q) ||
        sector?.toLowerCase().includes(q)
      );
    }).sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
  }, [deliveryOrders, filterStatus, filterRepartidor, filterSector, query, clientes]);

  // Actualizar estado de orden
  const updateStatus = async (id: string, nextStatus: EstadoOrden) => {
    const o = ordenesRaw.find(x => x.id === id);
    if (!o) return;
    try {
      const next: Orden = { ...o, estado: nextStatus };
      await saveOrden(next);
      setRefresh(r => r + 1);
      queryClient.invalidateQueries({ queryKey: ["ordenes", tenant?.id] });
      
      const msg = nextStatus === "EN_CAMINO" ? "¡Orden en camino hacia el cliente! 🛵" : "Estado actualizado ✅";
      toast.success(msg);

      // Notificar por WhatsApp al cliente que su orden va en camino
      const cli = clientes.find(c => c.id === o.cliente_id);
      if (cli && tenant && nextStatus === "EN_CAMINO") {
        const { notificarWhatsApp } = await import("@/lib/whatsapp");
        const res = await notificarWhatsApp(tenant, cli, next, "en_camino");
        if (res.ok) {
          toast.success("Cliente notificado por WhatsApp 💬");
        } else if (cli.telefono && isRepartidor) {
          // Si no tiene bot API de WhatsApp configurado, abrir chat directo de WhatsApp 1-tap para avisar al cliente
          const rawPhone = cli.telefono.replace(/\D/g, "");
          const waPhone = rawPhone.length === 10 ? `1${rawPhone}` : rawPhone;
          const cleanNum = (o.numero || "").replace(/^#/, "");
          const text = encodeURIComponent(`🛵 *¡Hola ${cli.nombre}!* Te informamos que tu orden *${cleanNum}* de *${tenant.nombre}* ya va en camino hacia tu dirección con nuestro repartidor. ¡Nos vemos en breve!`);
          window.open(`https://wa.me/${waPhone}?text=${text}`, "_blank");
        }
      }
    } catch (err) {
      toast.error("Error al actualizar estado");
    }
  };

  // Asignar Repartidor a Orden
  const handleAssignDriver = async (orderId: string, repartidorId: string) => {
    const o = ordenesRaw.find(x => x.id === orderId);
    if (!o) return;
    try {
      const repId = repartidorId === "NONE" ? undefined : repartidorId;
      const next: Orden = { ...o, repartidor_id: repId };
      await saveOrden(next);
      setRefresh(r => r + 1);
      queryClient.invalidateQueries({ queryKey: ["ordenes", tenant?.id] });
      toast.success("Repartidor asignado con éxito 🛵");
    } catch (err) {
      toast.error("Error al asignar repartidor");
    }
  };

  const selectedOrder = useMemo(() => ordenesRaw.find(o => o.id === detailId), [ordenesRaw, detailId]);
  const selectedClient = useMemo(() => clientes.find(c => c.id === selectedOrder?.cliente_id), [clientes, selectedOrder]);
  const selectedDriver = useMemo(() => empleados.find(e => e.id === selectedOrder?.repartidor_id), [empleados, selectedOrder]);

  if (!user || !user.tenant || user.tenant.id === '__loading__') return null;
  const tenant = user.tenant;

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 pb-20">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header Hero Section */}
        <section className="relative overflow-hidden rounded-3xl sm:rounded-[2.25rem] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-8 shadow-sm">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/5 via-primary/5 to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
                  <Truck className="h-3.5 w-3.5" /> {isRepartidor ? "Mi Ruta de Entregas" : "Centro de Despacho & Delivery"}
                </span>
                {stats.incidencias > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-950/50 px-2.5 py-0.5 text-[10px] font-bold text-rose-600 border border-rose-200 dark:border-rose-900 animate-pulse">
                    <AlertTriangle className="h-3 w-3" /> {stats.incidencias} Incidencias
                  </span>
                )}
              </div>
              
              <h1 className="text-2xl sm:text-4xl font-display font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                {isRepartidor ? "Mis Entregas Asignadas" : "Gestión de Rutas y Envíos a Domicilio"}
              </h1>
              
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {isRepartidor
                  ? `Hola ${user.empleado.nombre || "Chofer"}, aquí tienes tus órdenes asignadas para entregar hoy. Navega con Waze o Google Maps y registra cobros con firma digital en pantalla.`
                  : "Asigna repartidores, navega con Waze / Google Maps, confirma entregas con firma digital y asienta cobros en ruta automáticamente."}
              </p>
            </div>
            
            {/* Action Buttons: Hoja de Ruta para Cajeras/Admins */}
            {!isRepartidor && (
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <Button
                  onClick={() => setShowManifest(true)}
                  variant="outline"
                  className="h-10 sm:h-11 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-extrabold shadow-sm gap-2"
                >
                  <Printer className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <span>Imprimir Hoja de Ruta</span>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* KPIs Grid */}
        <section className="grid grid-cols-2 gap-2.5 sm:gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label={isRepartidor ? "Por Salir" : "Por Despachar"}
            value={stats.pendientes}
            icon={<Clock className="h-4 w-4 sm:h-5 sm:w-5" />}
            color="amber"
            active={filterStatus === "LISTA"}
            onClick={() => setFilterStatus(filterStatus === "LISTA" ? "TODAS" : "LISTA")}
          />
          <StatCard
            label="En Ruta Activa"
            value={stats.enCamino}
            icon={<Truck className="h-4 w-4 sm:h-5 sm:w-5" />}
            color="sky"
            active={filterStatus === "EN_CAMINO"}
            onClick={() => setFilterStatus(filterStatus === "EN_CAMINO" ? "TODAS" : "EN_CAMINO")}
          />
          <StatCard
            label="Entregadas Hoy"
            value={stats.entregadas}
            icon={<PackageCheck className="h-4 w-4 sm:h-5 sm:w-5" />}
            color="emerald"
            active={filterStatus === "ENTREGADA"}
            onClick={() => setFilterStatus(filterStatus === "ENTREGADA" ? "TODAS" : "ENTREGADA")}
          />
          <StatCard
            label="Incidencias"
            value={stats.incidencias}
            icon={<AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />}
            color="rose"
            active={filterStatus === "INCIDENCIA"}
            onClick={() => setFilterStatus(filterStatus === "INCIDENCIA" ? "TODAS" : "INCIDENCIA")}
          />
          <div className="col-span-2 sm:col-span-1 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {isRepartidor ? "Cobro a Liquidar" : "Por Cobrar en Ruta"}
              </span>
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 flex items-center justify-center">
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-display font-black text-emerald-600 mt-1 sm:mt-2">
              {formatRD(stats.saldoPorCobrar)}
            </div>
          </div>
        </section>

        {/* Toolbar & Filters */}
        <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          {/* Search Input */}
          <div className="relative w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cliente, teléfono, orden o dirección..."
              className="h-10 w-full rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 pl-9 text-xs"
            />
          </div>

          {/* Selectors Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Repartidor Filter (Solo para Cajera / Admin) */}
            {!isRepartidor && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-slate-400">Repartidor:</span>
                <Select value={filterRepartidor} onValueChange={setFilterRepartidor}>
                  <SelectTrigger className="h-9 rounded-xl text-xs w-44 min-w-[170px] bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="TODOS">Todos los Repartidores</SelectItem>
                    <SelectItem value="SIN_ASIGNAR">⚠️ Sin Asignar</SelectItem>
                    {repartidores.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Sector Filter */}
            {sectoresDisponibles.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-slate-400">Sector:</span>
                <Select value={filterSector} onValueChange={setFilterSector}>
                  <SelectTrigger className="h-9 rounded-xl text-xs w-48 min-w-[185px] bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Todos los Sectores" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="TODOS">Todos los Sectores</SelectItem>
                    {sectoresDisponibles.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Clear Filters */}
            {(filterStatus !== "TODAS" || filterRepartidor !== "TODOS" || filterSector !== "TODOS" || query) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setFilterStatus("TODAS");
                  setFilterRepartidor("TODOS");
                  setFilterSector("TODOS");
                  setQuery("");
                }}
                className="h-9 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 px-2.5"
              >
                <X className="h-3.5 w-3.5 mr-1" /> Limpiar
              </Button>
            )}
          </div>
        </section>

        {/* Entregas Grid */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.length === 0 ? (
            <Card className="col-span-full flex flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 py-20 text-center bg-white/40 dark:bg-slate-900/40">
              <div className="h-16 w-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-400">
                <Bike className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {isRepartidor ? "No tienes entregas asignadas" : "No hay entregas en este filtro"}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                {isRepartidor
                  ? "En este momento no tienes pedidos asignados a tu ruta. La cajera o administración te asignará órdenes cuando estén listas."
                  : "Las órdenes marcadas con entrega a domicilio aparecerán automáticamente en este centro de despacho."}
              </p>
            </Card>
          ) : (
            filteredOrders.map((o) => (
              <DeliveryCard
                key={o.id}
                orden={o}
                cliente={clientes.find(c => c.id === o.cliente_id)}
                repartidores={repartidores}
                canAssignDriver={!isRepartidor}
                isRepartidor={isRepartidor}
                onAssignDriver={(repId) => handleAssignDriver(o.id, repId)}
                onUpdateStatus={updateStatus}
                onOpenPOD={() => setPodOrder(o)}
                onOpenIncidencia={() => setIncidenciaOrder(o)}
                onClick={() => setDetailId(o.id)}
              />
            ))
          )}
        </section>
      </main>

      {/* Proof of Delivery Modal */}
      {podOrder && (
        <ProofOfDeliveryDialog
          open={!!podOrder}
          onOpenChange={(isOpen) => !isOpen && setPodOrder(null)}
          orden={podOrder}
          cliente={clientes.find(c => c.id === podOrder.cliente_id)}
          tenant={tenant}
          onDelivered={() => {
            setRefresh(r => r + 1);
            setPodOrder(null);
          }}
        />
      )}

      {/* Incidencia Modal */}
      {incidenciaOrder && (
        <IncidenciaDialog
          open={!!incidenciaOrder}
          onOpenChange={(isOpen) => !isOpen && setIncidenciaOrder(null)}
          orden={incidenciaOrder}
          cliente={clientes.find(c => c.id === incidenciaOrder.cliente_id)}
          tenant={tenant}
          onSaved={() => {
            setRefresh(r => r + 1);
            setIncidenciaOrder(null);
          }}
        />
      )}

      {/* Delivery Manifest Print */}
      {showManifest && (
        <DeliveryManifestPrint
          tenant={tenant}
          ordenes={filteredOrders}
          clientes={clientes}
          repartidor={repartidores.find(r => r.id === filterRepartidor)}
          onClose={() => setShowManifest(false)}
        />
      )}

      {/* Order Detail Modal */}
      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="w-[96vw] max-w-lg rounded-3xl sm:rounded-[2.25rem] p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-950">
          {selectedOrder && (
            <div className="flex flex-col max-h-[88vh]">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 px-4 sm:px-6 py-4 sm:py-5 bg-slate-50/70 dark:bg-slate-900/40">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      <Package className="h-3 w-3" /> {(selectedOrder.numero || "").replace(/^#/, "")}
                    </span>
                    {selectedOrder.es_urgente && (
                      <Badge className="bg-rose-500 text-white text-[10px] font-bold uppercase tracking-wider">
                        ⚡ Express
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-lg sm:text-xl font-display font-black text-slate-900 dark:text-white">
                    {selectedClient?.nombre || "Cliente"}
                  </h2>
                </div>
              </div>

              {/* Body */}
              <div className="space-y-4 px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto">
                {/* Status and Financial Banner */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Orden</span>
                    <p className="text-lg font-black text-primary mt-0.5">{formatRD(selectedOrder.total)}</p>
                  </div>
                  <div className={`rounded-2xl border p-3.5 ${
                    selectedOrder.saldo > 0 
                      ? "border-rose-100 bg-rose-50/60 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200" 
                      : "border-emerald-100 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200"
                  }`}>
                    <span className="text-[10px] font-black uppercase tracking-wider opacity-70">
                      {selectedOrder.saldo > 0 ? "Saldo por Cobrar" : "Estado de Pago"}
                    </span>
                    <p className="text-lg font-black mt-0.5">
                      {selectedOrder.saldo > 0 ? formatRD(selectedOrder.saldo) : "Pagado ✅"}
                    </p>
                  </div>
                </div>

                {/* Delivery Address & GPS Info */}
                <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-900">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {selectedClient?.direccion || selectedOrder.direccion_entrega || "Sin dirección especificada"}
                      </p>
                      {(selectedClient?.sector || selectedOrder.sector_entrega) && (
                        <Badge variant="outline" className="mt-1 text-[9px] font-bold text-primary border-primary/20">
                          Sector: {selectedClient?.sector || selectedOrder.sector_entrega}
                        </Badge>
                      )}
                      {(selectedClient?.referencia || selectedOrder.referencia_entrega) && (
                        <p className="text-[11px] text-slate-500 mt-1 italic">
                          Ref: {selectedClient?.referencia || selectedOrder.referencia_entrega}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Navigation 1-Tap Links */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8.5 rounded-xl text-xs font-bold text-sky-600 hover:bg-sky-50 border-sky-200 gap-1.5"
                      asChild
                    >
                      <a
                        href={selectedClient?.lat && selectedClient?.lng
                          ? `https://waze.com/ul?ll=${selectedClient.lat},${selectedClient.lng}&navigate=yes`
                          : `https://waze.com/ul?q=${encodeURIComponent(selectedClient?.direccion || "")}`
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Compass className="h-3.5 w-3.5" /> Abrir en Waze
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8.5 rounded-xl text-xs font-bold text-emerald-600 hover:bg-emerald-50 border-emerald-200 gap-1.5"
                      asChild
                    >
                      <a
                        href={selectedClient?.lat && selectedClient?.lng
                          ? `https://www.google.com/maps/dir/?api=1&destination=${selectedClient.lat},${selectedClient.lng}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedClient?.direccion || "")}`
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Navigation className="h-3.5 w-3.5" /> Google Maps
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Driver Assignment & Contact */}
                <div className={`grid ${isRepartidor ? "grid-cols-1" : "grid-cols-2"} gap-3`}>
                  {!isRepartidor && (
                    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3.5">
                      <span className="text-[10px] font-black uppercase text-slate-400">Repartidor Asignado</span>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                        {selectedDriver ? selectedDriver.nombre : "Sin asignar"}
                      </p>
                    </div>
                  )}
                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3.5">
                    <span className="text-[10px] font-black uppercase text-slate-400">Teléfono de Contacto</span>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {selectedClient?.telefono || "—"}
                    </p>
                  </div>
                </div>

                {/* Proof of Delivery Details (if already delivered) */}
                {selectedOrder.estado === "ENTREGADA" && (selectedOrder.pod_receptor || selectedOrder.pod_foto || selectedOrder.pod_firma) && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-3">
                    <p className="text-xs font-black uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Comprobante de Entrega Digital
                    </p>
                    {selectedOrder.pod_receptor && (
                      <p className="text-xs text-slate-700 dark:text-slate-300">
                        <strong>Recibido por:</strong> {selectedOrder.pod_receptor}
                      </p>
                    )}
                    {selectedOrder.pod_fecha && (
                      <p className="text-[11px] text-slate-500">
                        Fecha: {new Date(selectedOrder.pod_fecha).toLocaleString("es-DO")}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {selectedOrder.pod_foto && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 h-24">
                          <img src={selectedOrder.pod_foto} alt="Foto entrega" className="w-full h-full object-cover" />
                        </div>
                      )}
                      {selectedOrder.pod_firma && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 bg-white p-1 h-24 flex items-center justify-center">
                          <img src={selectedOrder.pod_firma} alt="Firma cliente" className="max-h-full object-contain" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 px-4 sm:px-6 py-3.5 sm:py-4 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailId(null)}
                  className="rounded-xl text-xs font-bold h-10 px-4"
                >
                  Cerrar
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 h-10 px-4 shadow-sm"
                    asChild
                  >
                    <a
                      href={`https://wa.me/${selectedClient?.telefono?.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${selectedClient?.nombre || ""}, te contactamos de ${tenant.nombre} respecto a tu entrega #${selectedOrder.numero}.`)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Phone className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "amber" | "sky" | "emerald" | "rose";
  active?: boolean;
  onClick?: () => void;
}) {
  const colors = {
    amber: "bg-amber-50 text-amber-600 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400",
    sky: "bg-sky-50 text-sky-600 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-400",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400",
    rose: "bg-rose-50 text-rose-600 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400",
  };

  return (
    <Card
      onClick={onClick}
      className={`p-3 sm:p-4 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
        active
          ? "ring-2 ring-primary border-primary bg-primary/5"
          : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900"
      }`}
    >
      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
        <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-xl flex items-center justify-center border ${colors[color]}`}>
          {icon}
        </div>
      </div>
      <div className="text-xl sm:text-2xl font-display font-black text-slate-900 dark:text-white">{value}</div>
    </Card>
  );
}

function DeliveryCard({
  orden,
  cliente,
  repartidores,
  canAssignDriver = true,
  isRepartidor = false,
  onAssignDriver,
  onUpdateStatus,
  onOpenPOD,
  onOpenIncidencia,
  onClick,
}: {
  orden: Orden;
  cliente?: Cliente;
  repartidores: Empleado[];
  canAssignDriver?: boolean;
  isRepartidor?: boolean;
  onAssignDriver: (driverId: string) => void;
  onUpdateStatus: (id: string, s: EstadoOrden) => void;
  onOpenPOD: () => void;
  onOpenIncidencia: () => void;
  onClick: () => void;
}) {
  const totalPrendas = orden.items?.reduce((acc, it) => acc + it.cantidad, 0) || 0;
  const sector = orden.sector_entrega || cliente?.sector;
  const edificioApto = orden.edificio_apto_entrega || cliente?.edificio_apto;
  const referencia = orden.referencia_entrega || cliente?.referencia;
  const lat = orden.lat_entrega || cliente?.lat;
  const lng = orden.lng_entrega || cliente?.lng;
  const direccion = orden.direccion_entrega || cliente?.direccion || "Entrega en local";

  const isPendingToDeliver = ["RECIBIDA", "EN_PROCESO", "LISTA"].includes(orden.estado);

  const statusMeta: Record<string, { label: string; chip: string }> = {
    RECIBIDA: { 
      label: isRepartidor ? "Por Entregar" : "Por Despachar", 
      chip: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300" 
    },
    EN_PROCESO: { 
      label: isRepartidor ? "Por Entregar" : "Por Despachar", 
      chip: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300" 
    },
    LISTA: { 
      label: isRepartidor ? "Por Entregar" : "Por Despachar", 
      chip: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300" 
    },
    EN_CAMINO: { label: "En Ruta", chip: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300" },
    ENTREGADA: { label: "Entregada", chip: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300" },
    INCIDENCIA: { label: "Incidencia", chip: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300" },
  };

  const meta = statusMeta[orden.estado] || statusMeta.LISTA;

  // Clean phone number for WhatsApp
  const rawPhone = (cliente?.telefono || "").replace(/\D/g, "");
  const waPhone = rawPhone.length === 10 ? `1${rawPhone}` : rawPhone;

  return (
    <article
      onClick={onClick}
      className="group relative cursor-pointer rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs transition-all hover:shadow-lg hover:border-primary/40 flex flex-col justify-between gap-3 sm:gap-3.5"
    >
      <div className="space-y-2.5 sm:space-y-3">
        {/* ROW 1: ORDER NUMBER & TOTAL PRICE (CENTERED) */}
        <div className="flex flex-col items-center justify-center text-center border-b border-slate-100 dark:border-slate-800/80 pb-2.5 sm:pb-3 pt-0.5 space-y-1">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/90 px-3 py-1 font-mono text-xs font-extrabold text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60">
            <Package className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>{(orden.numero || "").replace(/^#/, "")}</span>
          </span>

          <div className="flex items-baseline justify-center gap-2 mt-0.5">
            <p className="text-xl font-display font-black text-slate-900 dark:text-white tracking-tight">
              {formatRD(orden.total)}
            </p>
            <span className="text-[11px] font-bold text-slate-400">
              • {totalPrendas} prenda{totalPrendas !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* ROW 2: STATUS PILLS & PAYMENT BADGE */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border ${meta.chip}`}>
            {meta.label}
          </span>
          
          {orden.es_urgente && (
            <span className="inline-flex items-center rounded-full bg-rose-500 text-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-2xs">
              ⚡ Express
            </span>
          )}

          <div className="ml-auto">
            {orden.saldo > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertCircle className="h-3 w-3" /> Debe {formatRD(orden.saldo)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="h-3 w-3" /> Pagado
              </span>
            )}
          </div>
        </div>

        {/* ROW 3: CUSTOMER & DESTINATION CARD */}
        <div className="rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 p-3 border border-slate-100 dark:border-slate-800/80 space-y-2.5">
          {/* Customer Name & Quick Contacts */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7.5 w-7.5 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                {cliente?.nombre ? cliente.nombre.charAt(0).toUpperCase() : "C"}
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
                {cliente?.nombre || "Sin nombre"}
              </h3>
            </div>

            {cliente?.telefono && (
              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <a
                  href={`tel:${cliente.telefono}`}
                  title={`Llamar a ${cliente.telefono}`}
                  className="h-8 w-8 sm:h-7 sm:w-7 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-primary flex items-center justify-center transition shadow-2xs active:scale-95"
                >
                  <Phone className="h-3.5 w-3.5" />
                </a>
                <a
                  href={`https://wa.me/${waPhone}`}
                  target="_blank"
                  rel="noreferrer"
                  title="WhatsApp"
                  className="h-8 w-8 sm:h-7 sm:w-7 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 flex items-center justify-center transition shadow-2xs active:scale-95"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </div>

          {/* Address Line */}
          <div className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-800 dark:text-slate-200 line-clamp-2 text-xs leading-snug">
                {direccion}
              </p>
              
              {/* Extra tags: sector, building, reference */}
              {(sector || edificioApto || referencia) && (
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  {sector && (
                    <span className="inline-flex items-center rounded-md bg-primary/10 text-primary px-1.5 py-0.5 text-[9px] font-bold">
                      📍 {sector}
                    </span>
                  )}
                  {edificioApto && (
                    <span className="inline-flex items-center rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 text-[9px] font-medium">
                      🏢 {edificioApto}
                    </span>
                  )}
                  {referencia && (
                    <span className="inline-flex items-center rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 text-[9px] font-medium italic truncate max-w-full">
                      Ref: {referencia}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ROW 4: REPARTIDOR ASIGNADO (Solo visible para Cajera / Administrador) */}
        {canAssignDriver && (
          <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1">
                <UserCheck className="h-3 w-3 text-primary" /> Repartidor Asignado:
              </span>
            </div>
            <Select
              value={orden.repartidor_id || "NONE"}
              onValueChange={(val) => onAssignDriver(val)}
            >
              <SelectTrigger className="h-8.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200/80 dark:border-slate-800">
                <SelectValue placeholder="Asignar repartidor..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="NONE" className="text-slate-400 text-xs">⚠️ Sin Asignar</SelectItem>
                {repartidores.map(r => (
                  <SelectItem key={r.id} value={r.id} className="text-xs">{r.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* ROW 5: ACTIONS GRID (Clean, structured, never overflows or breaks) */}
      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2" onClick={(e) => e.stopPropagation()}>
        {/* GPS Navigation 2-col button grid */}
        <div className="grid grid-cols-2 gap-2">
          <a
            href={lat && lng ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes` : `https://waze.com/ul?q=${encodeURIComponent(direccion)}`}
            target="_blank"
            rel="noreferrer"
            title="Navegar con Waze"
            className="h-9 sm:h-8 flex items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 hover:bg-sky-100 border border-sky-200/60 dark:border-sky-800/60 text-xs font-bold transition active:scale-95 gap-1.5"
          >
            <Compass className="h-3.5 w-3.5" /> Waze
          </a>

          <a
            href={lat && lng ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`}
            target="_blank"
            rel="noreferrer"
            title="Navegar con Google Maps"
            className="h-9 sm:h-8 flex items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200/60 dark:border-emerald-800/60 text-xs font-bold transition active:scale-95 gap-1.5"
          >
            <Navigation className="h-3.5 w-3.5" /> Maps
          </a>
        </div>

        {/* Primary Delivery Action */}
        <div className="flex items-center gap-1.5">
          {orden.estado !== "ENTREGADA" && (
            <button
              type="button"
              onClick={onOpenIncidencia}
              title="Reportar Incidencia"
              className="h-10 w-10 sm:h-8.5 sm:w-8.5 rounded-xl border border-rose-200/80 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition active:scale-95 shrink-0 shadow-2xs cursor-pointer"
            >
              <AlertTriangle className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            </button>
          )}

          {isPendingToDeliver && (
            isRepartidor ? (
              <Button
                size="sm"
                onClick={() => onUpdateStatus(orden.id, "EN_CAMINO")}
                className="flex-1 h-10 sm:h-8.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-xs sm:text-sm shadow-sm gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <Bike className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> <span>¡Voy en Camino!</span>
              </Button>
            ) : !orden.repartidor_id ? (
              <div className="flex-1 h-10 sm:h-8.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/70 text-xs font-bold flex items-center justify-center gap-1.5">
                <span>⚠️ Asigna un repartidor arriba</span>
              </div>
            ) : (
              <div className="flex-1 h-10 sm:h-8.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span>Esperando salida del repartidor</span>
              </div>
            )
          )}

          {orden.estado === "EN_CAMINO" && (
            isRepartidor ? (
              <Button
                size="sm"
                onClick={onOpenPOD}
                className="flex-1 h-10 sm:h-8.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs sm:text-sm shadow-sm gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> Entregar y Cobrar
              </Button>
            ) : (
              <div className="flex-1 h-10 sm:h-8.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/70 dark:border-sky-800/70 text-xs font-bold flex items-center justify-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-sky-500 animate-pulse" />
                <span>En ruta hacia el cliente</span>
              </div>
            )
          )}

          {orden.estado === "INCIDENCIA" && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenIncidencia}
              className="flex-1 h-10 sm:h-8.5 rounded-xl text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-800"
            >
              Ver Incidencia
            </Button>
          )}

          {orden.estado === "ENTREGADA" && (
            <div className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 py-2 sm:py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/70">
              <CheckCircle2 className="h-3.5 w-3.5" /> Entregada con Éxito
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
