import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useOrdenes, useClientes, useEmpleados } from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/klynn/PageHeader";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tag,
  Search,
  Filter,
  User,
  Shirt,
  Package,
  CheckCircle2,
  Clock,
  RefreshCw,
  X,
  Layers,
  Phone,
  Printer,
  Receipt,
} from "lucide-react";
import { formatDateTimeRD, formatRD, type Orden, type EstadoOrden, updateOrdenEstado } from "@/lib/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { OrderDetail, TicketPrintPortal } from "@/components/klynn/OrdenesPage";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/t/$slug/control-marbetes")({
  component: ControlMarbetesPage,
});

const COLORES_MARBETE = [
  { nombre: "TODOS", bg: "bg-slate-200 dark:bg-slate-700", text: "text-slate-900 dark:text-slate-100" },
  { nombre: "Gris", bg: "bg-slate-500", text: "text-white" },
  { nombre: "Naranja", bg: "bg-orange-500", text: "text-white" },
  { nombre: "Verde", bg: "bg-emerald-600", text: "text-white" },
  { nombre: "Azul", bg: "bg-blue-600", text: "text-white" },
  { nombre: "Amarillo", bg: "bg-amber-400", text: "text-slate-900" },
  { nombre: "Rosa", bg: "bg-pink-500", text: "text-white" },
  { nombre: "Blanco", bg: "bg-white border border-slate-300", text: "text-slate-900" },
  { nombre: "Rojo", bg: "bg-red-600", text: "text-white" },
  { nombre: "Morado", bg: "bg-purple-600", text: "text-white" },
  { nombre: "Marrón", bg: "bg-[#78350F]", text: "text-white" },
];

const ESTADOS_KLYNN: { id: string; label: string; bg: string; text: string }[] = [
  { id: "TODOS", label: "TODOS LOS ESTADOS", bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-800 dark:text-slate-200" },
  { id: "RECIBIDA", label: "RECIBIDO", bg: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300", text: "text-blue-700 dark:text-blue-300" },
  { id: "EN_PROCESO", label: "EN PROCESO", bg: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300", text: "text-amber-700 dark:text-amber-300" },
  { id: "LISTA", label: "LISTO", bg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300", text: "text-emerald-700 dark:text-emerald-300" },
  { id: "ENTREGADA", label: "ENTREGADO", bg: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300", text: "text-purple-700 dark:text-purple-300" },
  { id: "ANULADA", label: "ANULADA", bg: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300", text: "text-rose-700 dark:text-rose-300" },
];

function getColorBadgeStyle(colorName?: string) {
  switch (colorName?.toLowerCase()) {
    case "naranja":
      return "bg-orange-500 text-white border-orange-600";
    case "verde":
      return "bg-emerald-600 text-white border-emerald-700";
    case "azul":
      return "bg-blue-600 text-white border-blue-700";
    case "amarillo":
      return "bg-amber-400 text-slate-950 border-amber-500";
    case "rosa":
      return "bg-pink-500 text-white border-pink-600";
    case "blanco":
      return "bg-white text-slate-900 border-slate-300";
    case "rojo":
      return "bg-red-600 text-white border-red-700";
    case "morado":
      return "bg-purple-600 text-white border-purple-700";
    case "marron":
    case "marrón":
      return "bg-[#78350F] text-white border-[#5a270b]";
    default:
      return "bg-slate-500 text-white border-slate-600";
  }
}

function getMarbetesDeOrden(o: Orden) {
  if (o.marbetes && o.marbetes.length > 0) {
    return o.marbetes;
  }
  if (o.marbete_secuencia !== undefined && o.marbete_secuencia !== null && o.marbete_secuencia !== "") {
    return [
      {
        id: "legacy",
        color: o.marbete_color || "Gris",
        piezas: o.marbete_piezas || (o.items || []).reduce((acc, it) => acc + (it.es_libra ? 1 : it.cantidad), 0) || 1,
        secuencia: o.marbete_secuencia,
      },
    ];
  }
  return [];
}

function getEstadoBadge(estado: EstadoOrden) {
  switch (estado) {
    case "RECIBIDA":
      return <Badge className="bg-blue-500 hover:bg-blue-600 text-white font-bold text-[10px]">RECIBIDO</Badge>;
    case "EN_PROCESO":
      return <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px]">EN PROCESO</Badge>;
    case "LISTA":
      return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px]">LISTO</Badge>;
    case "ENTREGADA":
      return <Badge className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px]">ENTREGADO</Badge>;
    case "ANULADA":
      return <Badge className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px]">ANULADA</Badge>;
    default:
      return <Badge variant="outline" className="font-bold text-[10px]">{estado}</Badge>;
  }
}

export function ControlMarbetesPage() {
  const user = useRequireAuth();
  const slug = user?.tenant?.slug;
  const tenantId = user?.tenant?.id || "";

  const queryClient = useQueryClient();
  const { data: ordenes = [], isLoading: loadingOrdenes, refetch } = useOrdenes(tenantId);
  const { data: clientes = [] } = useClientes(tenantId);
  const { data: empleados = [] } = useEmpleados(tenantId);

  const [searchQuery, setSearchQuery] = useState("");
  const [colorFilter, setColorFilter] = useState("TODOS");
  const [digitoFilter, setDigitoFilter] = useState<number | "TODOS">("TODOS");
  const [customPiezasInput, setCustomPiezasInput] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("TODOS");
  const [selectedOrden, setSelectedOrden] = useState<Orden | null>(null);
  const [showPrint, setShowPrint] = useState<Orden | null>(null);
  const [showPrintProduccion, setShowPrintProduccion] = useState<Orden | null>(null);
  const [showPrintMarquillas, setShowPrintMarquillas] = useState<Orden | null>(null);

  async function cambiarEstado(o: Orden, estado: EstadoOrden): Promise<boolean> {
    try {
      const ordenActualizada: Orden = { ...o, estado };
      queryClient.setQueryData<Orden[]>(["ordenes", tenantId], (old) => {
        if (!old) return [ordenActualizada];
        return old.map((item) => (item.id === o.id ? ordenActualizada : item));
      });
      await updateOrdenEstado(tenantId, o.id, estado);
      toast.success(`Orden ${o.numero} cambiada a ${estado.replace(/_/g, " ")}`);
      setSelectedOrden(ordenActualizada);
      return true;
    } catch (err: any) {
      toast.error("Error al actualizar estado: " + (err?.message || ""));
      return false;
    }
  }

  const clientesMap = useMemo(() => {
    const map = new Map<string, any>();
    clientes.forEach((c) => map.set(c.id, c));
    return map;
  }, [clientes]);

  const ordenesConMarbete = useMemo(() => {
    return (ordenes || []).filter((o) => getMarbetesDeOrden(o).length > 0);
  }, [ordenes]);

  const piezasDisponibles = useMemo(() => {
    const set = new Set<number>();
    for (let i = 1; i <= 9; i++) set.add(i);
    ordenesConMarbete.forEach((o) => {
      const marbetes = getMarbetesDeOrden(o);
      marbetes.forEach((m) => {
        if (m.piezas) set.add(Number(m.piezas));
      });
      if (o.marbete_piezas) set.add(Number(o.marbete_piezas));
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [ordenesConMarbete]);

  const ordenesFiltradas = useMemo(() => {
    return ordenesConMarbete.filter((o) => {
      const marbetes = getMarbetesDeOrden(o);
      const totalPiezasMarbetes = marbetes.reduce((sum, it) => sum + (Number(it.piezas) || 0), 0);

      if (colorFilter !== "TODOS") {
        const matchesColor = marbetes.some((m) => m.color?.toLowerCase() === colorFilter.toLowerCase());
        if (!matchesColor) return false;
      }

      if (digitoFilter !== "TODOS") {
        const matchesPiezas =
          totalPiezasMarbetes === digitoFilter ||
          marbetes.some((m) => Number(m.piezas) === digitoFilter) ||
          o.marbete_piezas === digitoFilter;
        if (!matchesPiezas) return false;
      }

      if (estadoFilter !== "TODOS" && o.estado !== estadoFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const cliente = clientesMap.get(o.cliente_id);
        const matchSecuencia = marbetes.some((m) => String(m.secuencia || "").includes(q));
        const matchNumero = String(o.numero || "").toLowerCase().includes(q);
        const matchColor = marbetes.some((m) => String(m.color || "").toLowerCase().includes(q));
        const matchCliente = cliente
          ? `${cliente.nombre} ${cliente.apellido || ""}`.toLowerCase().includes(q) ||
            String(cliente.telefono || "").includes(q)
          : false;

        return matchSecuencia || matchNumero || matchColor || matchCliente;
      }

      return true;
    });
  }, [ordenesConMarbete, colorFilter, digitoFilter, estadoFilter, searchQuery, clientesMap]);

  const metricas = useMemo(() => {
    const total = ordenesConMarbete.length;
    const recibidas = ordenesConMarbete.filter((o) => o.estado === "RECIBIDA").length;
    const enProceso = ordenesConMarbete.filter((o) => o.estado === "EN_PROCESO").length;
    const listas = ordenesConMarbete.filter((o) => o.estado === "LISTA").length;
    const entregadas = ordenesConMarbete.filter((o) => o.estado === "ENTREGADA").length;
    return { total, recibidas, enProceso, listas, entregadas };
  }, [ordenesConMarbete]);

  if (!user || user.tenant.id === "__loading__" || loadingOrdenes) {
    return <GlobalPageLoader />;
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Control de Marbetes"
        description="Trazabilidad y búsqueda rápida de prendas por tiras de papel Hidrofix (Color, Piezas y Secuencia)."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="rounded-xl text-xs font-bold gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Actualizar
            </Button>
            <Link to={`/t/${slug}/nueva-orden`}>
              <Button size="sm" className="rounded-xl text-xs font-black gap-1.5 bg-primary text-white">
                <Shirt className="h-3.5 w-3.5" />
                Nueva Orden
              </Button>
            </Link>
          </div>
        }
      />

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="p-4 rounded-2xl border bg-white dark:bg-slate-900 flex items-center gap-3 shadow-xs">
          <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black">
            <Tag className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Registrados
            </div>
            <div className="text-xl font-display font-black text-foreground">{metricas.total}</div>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl border bg-white dark:bg-slate-900 flex items-center gap-3 shadow-xs">
          <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              En Proceso
            </div>
            <div className="text-xl font-display font-black text-amber-600">{metricas.enProceso + metricas.recibidas}</div>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl border bg-white dark:bg-slate-900 flex items-center gap-3 shadow-xs">
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Listos para Entrega
            </div>
            <div className="text-xl font-display font-black text-emerald-600">{metricas.listas}</div>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl border bg-white dark:bg-slate-900 flex items-center gap-3 shadow-xs">
          <div className="h-11 w-11 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-black">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Entregados
            </div>
            <div className="text-xl font-display font-black text-purple-600">{metricas.entregadas}</div>
          </div>
        </Card>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <Card className="p-4 sm:p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por número de marbete (ej: 556), orden (#5137), cliente o teléfono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-sm rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 focus-visible:ring-primary/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="space-y-3 pt-1">
          {/* Selector de Color */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-muted-foreground shrink-0 mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3" /> Color:
            </span>
            {COLORES_MARBETE.map((c) => {
              const isSel = colorFilter.toLowerCase() === c.nombre.toLowerCase();
              return (
                <button
                  key={c.nombre}
                  onClick={() => setColorFilter(c.nombre)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                    isSel
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs font-black"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {c.nombre !== "TODOS" && <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.bg}`} />}
                  <span>{c.nombre}</span>
                </button>
              );
            })}
          </div>

          {/* Selector de Piezas Adaptativo con Input Numérico */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-muted-foreground shrink-0 mr-1 flex items-center gap-1">
              <Layers className="h-3 w-3" /> Piezas:
            </span>
            <button
              onClick={() => {
                setDigitoFilter("TODOS");
                setCustomPiezasInput("");
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all shrink-0 cursor-pointer ${
                digitoFilter === "TODOS" && !customPiezasInput
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white font-black"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              TODOS
            </button>
            {piezasDisponibles.map((num) => {
              const isSel = digitoFilter === num;
              return (
                <button
                  key={num}
                  onClick={() => {
                    setDigitoFilter(num);
                    setCustomPiezasInput("");
                  }}
                  className={`h-7 px-2.5 rounded-xl text-xs font-mono font-black border transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                    isSel
                      ? "bg-primary text-white border-primary shadow-xs scale-105"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {num}
                </button>
              );
            })}
            {/* Input para filtrar por cantidad escrita */}
            <div className="flex items-center gap-1 pl-1.5 border-l border-slate-200 dark:border-slate-800 shrink-0">
              <Input
                type="number"
                placeholder="Nº..."
                value={customPiezasInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomPiezasInput(val);
                  if (val.trim() === "") {
                    setDigitoFilter("TODOS");
                  } else {
                    const parsed = parseInt(val, 10);
                    if (!isNaN(parsed) && parsed > 0) {
                      setDigitoFilter(parsed);
                    }
                  }
                }}
                className={`h-7 w-16 text-xs font-mono font-bold text-center rounded-xl transition-all ${
                  typeof digitoFilter === "number" && !piezasDisponibles.includes(digitoFilter)
                    ? "border-primary bg-primary/10 text-primary"
                    : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                } focus-visible:ring-primary/40`}
              />
            </div>
          </div>

          {/* Selector de Estado Oficial de Klynn */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-muted-foreground shrink-0 mr-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Estado:
            </span>
            {ESTADOS_KLYNN.map((est) => {
              const isSel = estadoFilter === est.id;
              return (
                <button
                  key={est.id}
                  onClick={() => setEstadoFilter(est.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all shrink-0 cursor-pointer ${
                    isSel
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white font-black"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {est.label}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Listado de Marbetes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Mostrando {ordenesFiltradas.length} de {ordenesConMarbete.length} órdenes con marbete
          </span>
        </div>

        {ordenesFiltradas.length === 0 ? (
          <Card className="p-12 text-center rounded-3xl border border-dashed bg-slate-50/50 dark:bg-slate-900/50">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3">
              <Tag className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">No se encontraron marbetes</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              No hay órdenes que coincidan con los filtros seleccionados o aún no se han registrado marbetes en el punto de venta.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {ordenesFiltradas.map((ord) => {
              const cliente = clientesMap.get(ord.cliente_id);
              const marbetes = getMarbetesDeOrden(ord);
              const totalItemsCount = ord.items.reduce((acc, it) => acc + (it.es_libra ? 1 : it.cantidad), 0);

              return (
                <Card
                  key={ord.id}
                  onClick={() => setSelectedOrden(ord)}
                  className="p-4 sm:p-5 rounded-3xl border bg-white dark:bg-slate-900 hover:border-primary/40 dark:hover:border-primary/40 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3.5 group"
                >
                  {/* Cabecera con Estado y Badge(s) de Marbete con Títulos Sutiles */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Control de Marbete {marbetes.length > 1 ? `(${marbetes.length} Tiras)` : ""}
                      </span>
                      <div>{getEstadoBadge(ord.estado)}</div>
                    </div>

                    {/* Badge(s) con color de fondo y microtítulos sutiles centrados */}
                    <div className="space-y-1.5">
                      {marbetes.map((m, mIdx) => {
                        const mColorStyle = getColorBadgeStyle(m.color);
                        return (
                          <div
                            key={m.id || mIdx}
                            className={`px-3 py-1.5 rounded-2xl font-sans border font-bold text-xs shadow-xs grid grid-cols-3 items-center text-center ${mColorStyle}`}
                          >
                            <div className="flex flex-col items-center">
                              <span className="text-[8px] uppercase font-bold tracking-wider opacity-85 leading-tight">Color</span>
                              <span className="text-xs font-black uppercase leading-tight mt-0.5">{m.color || "GRIS"}</span>
                            </div>
                            <div className="flex flex-col items-center border-x border-current/25 px-1">
                              <span className="text-[8px] uppercase font-bold tracking-wider opacity-85 leading-tight">Piezas</span>
                              <span className="text-xs font-black leading-tight mt-0.5">[{m.piezas || 1}]</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-[8px] uppercase font-bold tracking-wider opacity-85 leading-tight">No. Secuencia</span>
                              <span className="text-xs font-black leading-tight mt-0.5">#{m.secuencia}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Información de la Orden con Títulos Sutiles */}
                  <div className="space-y-2.5 pt-0.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">
                          No. Orden
                        </span>
                        <span className="font-bold text-foreground text-xs flex items-center gap-1">
                          <Package className="h-3.5 w-3.5 text-primary shrink-0" />
                          {ord.numero}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">
                          Fecha de Emisión
                        </span>
                        <span className="text-muted-foreground text-[11px] font-medium block">
                          {formatDateTimeRD(ord.creado_en)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">
                        Cliente
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">
                          {cliente ? `${cliente.nombre} ${cliente.apellido || ""}` : "Consumidor Final"}
                        </span>
                      </div>

                      {cliente?.telefono && cliente.telefono !== "---" && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5 pl-5">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{cliente.telefono}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer con Títulos Sutiles: Cantidad y Total */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">
                        Prendas Registradas
                      </span>
                      <span className="text-muted-foreground font-semibold text-[11px]">
                        {ord.items.length} tipo(s) • {totalItemsCount} prendas
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">
                        Total a Cobrar
                      </span>
                      <span className="font-display font-black text-[#1B4B73] dark:text-sky-400 text-sm">
                        {formatRD(ord.total)}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Compacto y Elegante de Detalle de Orden en /control-marbetes */}
      <Dialog open={!!selectedOrden} onOpenChange={(open) => !open && setSelectedOrden(null)}>
        <DialogContent className="max-w-xl p-5 sm:p-6 rounded-3xl z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl font-sans">
          {selectedOrden && (
            <div className="space-y-3.5">
              {/* Cabecera de la Orden con Estado y espacio para el botón de cierre */}
              <DialogHeader className="pr-8 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <DialogTitle className="text-lg font-display font-bold flex items-center gap-2 text-foreground">
                    <Receipt className="h-5 w-5 text-primary shrink-0" />
                    Orden {selectedOrden.numero}
                  </DialogTitle>
                  <div>{getEstadoBadge(selectedOrden.estado)}</div>
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  Emitida el {formatDateTimeRD(selectedOrden.creado_en)}
                </DialogDescription>
              </DialogHeader>

              {/* Franja Superior de Marbete(s) con Color Oficial y Microtítulos */}
              {(() => {
                const marbetesModal = getMarbetesDeOrden(selectedOrden);
                const totalPiezasModal = marbetesModal.reduce((acc, it) => acc + (Number(it.piezas) || 0), 0) || selectedOrden.marbete_piezas || selectedOrden.items.reduce((acc, it) => acc + (it.es_libra ? 1 : it.cantidad), 0);
                return (
                  <div className="space-y-1.5">
                    {marbetesModal.map((m, mIdx) => {
                      const modalColorStyle = getColorBadgeStyle(m.color);
                      return (
                        <div
                          key={m.id || mIdx}
                          className={`px-4 py-2 rounded-2xl font-sans border font-bold text-xs shadow-xs grid grid-cols-3 items-center text-center ${modalColorStyle}`}
                        >
                          <div className="flex flex-col items-center">
                            <span className="text-[8.5px] uppercase font-bold tracking-wider opacity-85 leading-tight">Color</span>
                            <span className="text-xs sm:text-sm font-black uppercase leading-tight mt-0.5">{m.color || "GRIS"}</span>
                          </div>
                          <div className="flex flex-col items-center border-x border-current/25 px-2">
                            <span className="text-[8.5px] uppercase font-bold tracking-wider opacity-85 leading-tight">Piezas</span>
                            <span className="text-xs sm:text-sm font-black leading-tight mt-0.5">[{m.piezas || 1}]</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[8.5px] uppercase font-bold tracking-wider opacity-85 leading-tight">No. Secuencia</span>
                            <span className="text-xs sm:text-sm font-black leading-tight mt-0.5">#{m.secuencia}</span>
                          </div>
                        </div>
                      );
                    })}
                    {marbetesModal.length > 1 && (
                      <div className="text-[10px] font-black text-center text-muted-foreground uppercase tracking-wider">
                        Total piezas marbetes: {totalPiezasModal} prendas
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Datos del Cliente y Resumen Financiero */}
              {(() => {
                const c = clientesMap.get(selectedOrden.cliente_id);
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Cliente
                      </span>
                      <div className="font-bold text-foreground truncate">
                        {c ? `${c.nombre} ${c.apellido || ""}` : "Consumidor Final"}
                      </div>
                      {c?.telefono && c.telefono !== "---" && (
                        <div className="text-muted-foreground text-[11px] flex items-center gap-1.5 pt-0.5">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{c.telefono}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Total y Saldo
                      </span>
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-foreground">Total:</span>
                        <span className="font-display font-black text-sm">{formatRD(selectedOrden.total)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-muted-foreground">Estado de pago:</span>
                        <span className={selectedOrden.saldo > 0 ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"}>
                          {selectedOrden.saldo > 0 ? `Pendiente: ${formatRD(selectedOrden.saldo)}` : "Pagado"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Desglose de Prendas */}
              <div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Prendas en esta orden:
                </span>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-2xl p-2 bg-slate-50/40 dark:bg-slate-900/40 max-h-36 overflow-y-auto font-sans">
                  {selectedOrden.items.map((it, idx) => (
                    <div key={idx} className="py-1.5 px-2 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-foreground">{it.cantidad}x </span>
                        <span>{it.descripcion}</span>
                        {it.color && <span className="text-[10px] text-muted-foreground ml-1.5">({it.color})</span>}
                      </div>
                      <span className="font-sans font-bold text-foreground">
                        {formatRD(it.precio_unitario * it.cantidad)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botones de Cambio de Estado Rápido */}
              <div>
                <span className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Cambiar Estado de la Orden
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["RECIBIDA", "EN_PROCESO", "LISTA", "ENTREGADA"] as EstadoOrden[]).map((st) => {
                    const isCurrent = selectedOrden.estado === st;
                    const labels: Record<string, string> = {
                      RECIBIDA: "RECIBIDO",
                      EN_PROCESO: "EN PROCESO",
                      LISTA: "LISTO",
                      ENTREGADA: "ENTREGADO",
                    };
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => cambiarEstado(selectedOrden, st)}
                        className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all border ${
                          isCurrent
                            ? "bg-primary text-white border-primary shadow-xs"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {labels[st] || st}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Acciones de Impresión y Cierre */}
              <div className="pt-2 flex flex-wrap gap-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl text-xs font-bold font-sans"
                  onClick={() => setSelectedOrden(null)}
                >
                  Cerrar
                </Button>
                <Button
                  onClick={() => setShowPrint(selectedOrden)}
                  className="flex-1 rounded-xl text-xs font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white gap-1.5 font-sans"
                >
                  <Printer className="h-3.5 w-3.5 text-[#F0B900]" />
                  Ticket Cliente
                </Button>
                <Button
                  onClick={() => setShowPrintProduccion(selectedOrden)}
                  variant="outline"
                  className="flex-1 rounded-xl text-xs font-bold border-amber-300 bg-amber-50/80 hover:bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 gap-1.5 font-sans"
                >
                  <Tag className="h-3.5 w-3.5 text-amber-600" />
                  Ticket Taller
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Portales de Impresión de Tickets y Marquillas */}
      {showPrint && (
        <TicketPrintPortal
          orden={showPrint}
          tenant={user.tenant}
          clientes={clientes}
          empleados={empleados}
          onClose={() => setShowPrint(null)}
        />
      )}

      {showPrintProduccion && (
        <TicketPrintPortal
          orden={showPrintProduccion}
          tenant={user.tenant}
          clientes={clientes}
          empleados={empleados}
          esProduccion={true}
          onClose={() => setShowPrintProduccion(null)}
        />
      )}

      {showPrintMarquillas && (
        <TicketPrintPortal
          orden={showPrintMarquillas}
          tenant={user.tenant}
          clientes={clientes}
          empleados={empleados}
          esMarquillas={true}
          onClose={() => setShowPrintMarquillas(null)}
        />
      )}
    </div>
  );
}
