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
  Plus,
  Check,
  Sparkles,
  Ban,
  Palette,
  ChevronDown,
  Calendar,
} from "lucide-react";
import { formatDateTimeRD, formatRD, type Orden, type EstadoOrden, updateOrdenEstado } from "@/lib/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { OrderDetail, TicketPrintPortal } from "@/components/klynn/OrdenesPage";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/t/$slug/control-marbetes")({
  component: ControlMarbetesPage,
});

const COLOR_CONFIGS: Record<string, { short: string; prefix: string; bg: string; text: string; badgeBg: string }> = {
  Azul: {
    short: "A",
    prefix: "A-###",
    bg: "bg-gradient-to-br from-blue-600 to-blue-700 text-white",
    text: "text-white",
    badgeBg: "bg-black/20 text-white",
  },
  Verde: {
    short: "V",
    prefix: "V-###",
    bg: "bg-gradient-to-br from-[#16A34A] to-emerald-700 text-white",
    text: "text-white",
    badgeBg: "bg-black/20 text-white",
  },
  Naranja: {
    short: "N",
    prefix: "N-###",
    bg: "bg-gradient-to-br from-[#EA580C] to-orange-600 text-white",
    text: "text-white",
    badgeBg: "bg-black/20 text-white",
  },
  Rojo: {
    short: "R",
    prefix: "R-###",
    bg: "bg-gradient-to-br from-[#DC2626] to-red-700 text-white",
    text: "text-white",
    badgeBg: "bg-black/20 text-white",
  },
  Amarillo: {
    short: "AM",
    prefix: "AM-###",
    bg: "bg-gradient-to-br from-[#EAB308] to-amber-500 text-slate-950",
    text: "text-slate-950",
    badgeBg: "bg-black/15 text-slate-950",
  },
  Morado: {
    short: "M",
    prefix: "M-###",
    bg: "bg-gradient-to-br from-[#9333EA] to-purple-700 text-white",
    text: "text-white",
    badgeBg: "bg-black/20 text-white",
  },
  Rosa: {
    short: "RS",
    prefix: "RS-###",
    bg: "bg-gradient-to-br from-pink-500 to-pink-600 text-white",
    text: "text-white",
    badgeBg: "bg-black/20 text-white",
  },
  Blanco: {
    short: "B",
    prefix: "B-###",
    bg: "bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-300 text-slate-900 dark:from-slate-800 dark:to-slate-900 dark:border-slate-700 dark:text-white",
    text: "text-slate-900 dark:text-white",
    badgeBg: "bg-black/10 dark:bg-white/15 text-slate-900 dark:text-white",
  },
  "Marrón": {
    short: "MR",
    prefix: "MR-###",
    bg: "bg-gradient-to-br from-[#78350F] to-[#5a270b] text-white",
    text: "text-white",
    badgeBg: "bg-black/20 text-white",
  },
  Marron: {
    short: "MR",
    prefix: "MR-###",
    bg: "bg-gradient-to-br from-[#78350F] to-[#5a270b] text-white",
    text: "text-white",
    badgeBg: "bg-black/20 text-white",
  },
  Gris: {
    short: "G",
    prefix: "G-###",
    bg: "bg-gradient-to-br from-slate-600 to-slate-700 text-white",
    text: "text-white",
    badgeBg: "bg-black/20 text-white",
  },
};

function getColorConfig(colorName: string) {
  const norm = colorName.trim();
  const found = Object.entries(COLOR_CONFIGS).find(
    ([k]) => k.toLowerCase() === norm.toLowerCase()
  );
  if (found) return found[1];

  const initial = norm.slice(0, 2).toUpperCase();
  return {
    short: initial,
    prefix: `${initial}-###`,
    bg: "bg-gradient-to-br from-slate-600 to-slate-700 text-white",
    text: "text-white",
    badgeBg: "bg-black/20 text-white",
  };
}

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

function getPhysicalMarbeteStyles(colorName?: string) {
  switch (colorName?.toLowerCase()) {
    case "naranja":
      return {
        bg: "bg-[#FB923C] border-[#ea580c] text-[#331206]",
        centerBox: "bg-slate-950 text-[#FB923C] border-black/40",
        inkText: "text-[#331206]",
        name: "NARANJA",
      };
    case "verde":
      return {
        bg: "bg-[#34D399] border-[#059669] text-[#062d1f]",
        centerBox: "bg-slate-950 text-[#34D399] border-black/40",
        inkText: "text-[#062d1f]",
        name: "VERDE",
      };
    case "azul":
      return {
        bg: "bg-[#60A5FA] border-[#2563eb] text-[#11244d]",
        centerBox: "bg-slate-950 text-[#60A5FA] border-black/40",
        inkText: "text-[#11244d]",
        name: "AZUL",
      };
    case "amarillo":
      return {
        bg: "bg-[#FDE047] border-[#ca8a04] text-[#3d1803]",
        centerBox: "bg-slate-950 text-[#FDE047] border-black/40",
        inkText: "text-[#3d1803]",
        name: "AMARILLO",
      };
    case "rosa":
      return {
        bg: "bg-[#F472B6] border-[#db2777] text-[#420921]",
        centerBox: "bg-slate-950 text-[#F472B6] border-black/40",
        inkText: "text-[#420921]",
        name: "ROSA",
      };
    case "blanco":
      return {
        bg: "bg-[#F8FAFC] border-[#cbd5e1] text-[#0f172a]",
        centerBox: "bg-slate-950 text-[#F8FAFC] border-black/40",
        inkText: "text-[#0f172a]",
        name: "BLANCO",
      };
    case "rojo":
      return {
        bg: "bg-[#F87171] border-[#dc2626] text-[#380606]",
        centerBox: "bg-slate-950 text-[#F87171] border-black/40",
        inkText: "text-[#380606]",
        name: "ROJO",
      };
    case "morado":
      return {
        bg: "bg-[#A78BFA] border-[#7c3aed] text-[#240b4e]",
        centerBox: "bg-slate-950 text-[#A78BFA] border-black/40",
        inkText: "text-[#240b4e]",
        name: "MORADO",
      };
    case "marron":
    case "marrón":
      return {
        bg: "bg-[#B45309] border-[#78350F] text-[#241003]",
        centerBox: "bg-slate-950 text-[#FDE047] border-black/40",
        inkText: "text-[#241003]",
        name: "MARRÓN",
      };
    default:
      return {
        bg: "bg-[#94A3B8] border-[#64748b] text-[#0f172a]",
        centerBox: "bg-slate-950 text-[#94A3B8] border-black/40",
        inkText: "text-[#0f172a]",
        name: "GRIS",
      };
  }
}

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

function formatOrderDateCompact(iso?: string): string {
  if (!iso || iso === "null") return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const meses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const dia = d.getDate();
  const mes = meses[d.getMonth()];
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${dia} ${mes}, ${hours}:${minutes} ${ampm}`;
}

function getOrdenFinancialInfo(ord: Orden) {
  const total = Number(ord.total) || 0;
  const pagado = Number(ord.pagado) || 0;
  const saldo = ord.saldo !== undefined && ord.saldo !== null ? Number(ord.saldo) : Math.max(0, total - pagado);
  const isPagada = ord.estado === "PAGADA" || saldo <= 0 || (total > 0 && pagado >= total);
  const hasAbono = !isPagada && pagado > 0;

  return {
    total,
    pagado,
    saldo,
    isPagada,
    hasAbono,
  };
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
  const [openColorPopover, setOpenColorPopover] = useState(false);
  const [digitoFilter, setDigitoFilter] = useState<number | "TODOS">("TODOS");
  const [customPiezasInput, setCustomPiezasInput] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("EN_TALLER");
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
      await updateOrdenEstado(o.id, estado);
      await queryClient.invalidateQueries({ queryKey: ["ordenes", tenantId] });
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

  // Mapa acumulador por color para métricas de piezas en taller y total
  const statsColoresMap = useMemo(() => {
    const map = new Map<string, {
      nombre: string;
      piezasEnTaller: number;
      piezasTotal: number;
      ordenesEnTaller: number;
      ordenesTotal: number;
    }>();

    ordenesConMarbete.forEach((o) => {
      const isEnTaller = o.estado === "RECIBIDA" || o.estado === "EN_PROCESO";
      const marbetes = getMarbetesDeOrden(o);

      marbetes.forEach((m) => {
        const cName = (m.color || "Gris").trim();
        const key = cName.toLowerCase();
        let existing = map.get(key);
        if (!existing) {
          existing = {
            nombre: cName,
            piezasEnTaller: 0,
            piezasTotal: 0,
            ordenesEnTaller: 0,
            ordenesTotal: 0,
          };
          map.set(key, existing);
        }

        const pz = Number(m.piezas) || 1;
        existing.piezasTotal += pz;
        existing.ordenesTotal += 1;
        if (isEnTaller) {
          existing.piezasEnTaller += pz;
          existing.ordenesEnTaller += 1;
        }
      });
    });

    return map;
  }, [ordenesConMarbete]);

  // Tarjetas dinámicas: Se muestran ÚNICAMENTE los colores que tienen órdenes/piezas reales
  const tarjetasColores = useMemo(() => {
    const list = Array.from(statsColoresMap.values()).filter((c) => {
      if (estadoFilter === "EN_TALLER") {
        return c.piezasEnTaller > 0 || c.ordenesEnTaller > 0;
      }
      return c.piezasTotal > 0 || c.ordenesTotal > 0;
    });

    return list.sort((a, b) => {
      if (estadoFilter === "EN_TALLER") {
        return b.piezasEnTaller - a.piezasEnTaller || b.ordenesEnTaller - a.ordenesEnTaller;
      }
      return b.piezasTotal - a.piezasTotal || b.ordenesTotal - a.ordenesTotal;
    });
  }, [statsColoresMap, estadoFilter]);

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

      if (estadoFilter === "EN_TALLER") {
        const enTaller = o.estado === "RECIBIDA" || o.estado === "EN_PROCESO";
        if (!enTaller) return false;
      } else if (estadoFilter !== "TODOS" && o.estado !== estadoFilter) {
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
    const enTaller = recibidas + enProceso;
    const listas = ordenesConMarbete.filter((o) => o.estado === "LISTA").length;
    const entregadas = ordenesConMarbete.filter((o) => o.estado === "ENTREGADA").length;
    const anuladas = ordenesConMarbete.filter((o) => o.estado === "ANULADA").length;
    return { total, recibidas, enProceso, enTaller, listas, entregadas, anuladas };
  }, [ordenesConMarbete]);

  if (!user || user.tenant.id === "__loading__" || loadingOrdenes) {
    return <GlobalPageLoader text="Cargando control de marbetes..." />;
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Control de Marbetes"
        description="Gestiona y consulta tus marbetes por color, secuencia y estado."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await queryClient.invalidateQueries({ queryKey: ["ordenes", tenantId] });
                await refetch();
                toast.success("Control de marbetes sincronizado");
              }}
              className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Actualizar
            </Button>
            <Link to={`/t/${slug}/nueva-orden`}>
              <Button size="sm" className="rounded-xl text-xs font-black gap-1.5 bg-[#1B4B73] hover:bg-[#143755] text-white cursor-pointer shadow-xs">
                <Plus className="h-3.5 w-3.5" />
                <span>Nuevo Marbete</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Tarjetas de Colores Vivas: Se muestran SOLO los colores que tienen órdenes/piezas */}
      {tarjetasColores.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {tarjetasColores.map((c) => {
            const config = getColorConfig(c.nombre);
            const isSelected = colorFilter.toLowerCase() === c.nombre.toLowerCase();
            const count = estadoFilter === "EN_TALLER" ? c.piezasEnTaller : c.piezasTotal;
            const countLabel = estadoFilter === "EN_TALLER" ? "Piezas en taller" : "Piezas registradas";
            const ordCount = estadoFilter === "EN_TALLER" ? c.ordenesEnTaller : c.ordenesTotal;

            return (
              <button
                key={c.nombre}
                type="button"
                onClick={() => {
                  if (colorFilter.toLowerCase() === c.nombre.toLowerCase()) {
                    setColorFilter("TODOS");
                  } else {
                    setColorFilter(c.nombre);
                  }
                }}
                className={`relative overflow-hidden p-3 sm:p-3.5 rounded-2xl text-left transition-all duration-200 cursor-pointer select-none group shadow-2xs hover:shadow-md ${config.bg} ${
                  isSelected
                    ? "ring-4 ring-offset-2 ring-primary scale-[1.02] shadow-md"
                    : "hover:scale-[1.01] opacity-95 hover:opacity-100"
                }`}
              >
                {/* Marca de agua decorativa de marbete en la esquina inferior derecha */}
                <Tag className="absolute -right-2 -bottom-2 h-14 w-14 opacity-15 pointer-events-none rotate-12 transition-transform group-hover:scale-110" />

                {/* Cabecera de la tarjeta: Badge con solo Nombre del color e indicador de Activo si está seleccionado */}
                <div className="flex items-center justify-between relative z-10 gap-1.5">
                  <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-black truncate ${config.badgeBg}`}>
                    <Tag className="h-3 w-3 shrink-0" />
                    <span className="font-extrabold truncate uppercase tracking-wider">{c.nombre}</span>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-1 bg-white text-slate-900 text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs animate-in fade-in shrink-0">
                      <Check className="h-2.5 w-2.5 text-emerald-600 stroke-[3]" />
                      <span>Activo</span>
                    </div>
                  )}
                </div>

                {/* Contenido Central Compacto: Cantidad de piezas, texto y órdenes debajo */}
                <div className="mt-2.5 sm:mt-3 relative z-10 flex flex-col items-center justify-center text-center">
                  <div className="text-3xl sm:text-4xl font-display font-black tracking-tight leading-none">
                    {count}
                  </div>
                  <div className="text-[11px] font-semibold opacity-90 mt-1">
                    {count === 1 ? countLabel.replace("Piezas", "Pieza") : countLabel}
                  </div>
                  {ordCount > 0 && (
                    <div className="mt-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs ${config.badgeBg}`}>
                        {ordCount} {ordCount === 1 ? "orden" : "órdenes"}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <Card className="p-8 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center flex flex-col items-center justify-center gap-2">
          <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="text-sm font-bold text-foreground">Sin marbetes activos en taller</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            Las tarjetas de color se generarán y mostrarán automáticamente en cuanto registres órdenes con marbetes en recepción.
          </p>
        </Card>
      )}

      {/* Barra de Herramientas: Estados Semánticos, Buscador y Filtros Organizados */}
      <Card className="p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        {/* Nivel 1: Filtros de Estado con Colores Vivos por Estado */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 scrollbar-none">
            {[
              {
                id: "EN_TALLER",
                label: "En Taller",
                count: metricas.enTaller,
                icon: Clock,
                activeCls: "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-400/30",
                inactiveCls: "bg-amber-50/80 hover:bg-amber-100 text-amber-800 border-amber-200/90 dark:bg-amber-950/30 dark:border-amber-800/60 dark:text-amber-300",
                badgeActive: "bg-black/20 text-white",
                badgeInactive: "bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200",
              },
              {
                id: "LISTA",
                label: "Listos",
                count: metricas.listas,
                icon: CheckCircle2,
                activeCls: "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-400/30",
                inactiveCls: "bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 border-emerald-200/90 dark:bg-emerald-950/30 dark:border-emerald-800/60 dark:text-emerald-300",
                badgeActive: "bg-black/20 text-white",
                badgeInactive: "bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200",
              },
              {
                id: "ENTREGADA",
                label: "Entregados",
                count: metricas.entregadas,
                icon: Package,
                activeCls: "bg-purple-600 hover:bg-purple-700 text-white border-purple-700 shadow-xs ring-2 ring-purple-400/30",
                inactiveCls: "bg-purple-50/80 hover:bg-purple-100 text-purple-800 border-purple-200/90 dark:bg-purple-950/30 dark:border-purple-800/60 dark:text-purple-300",
                badgeActive: "bg-black/20 text-white",
                badgeInactive: "bg-purple-200/80 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200",
              },
              {
                id: "TODOS",
                label: "Todos",
                count: metricas.total,
                icon: Layers,
                activeCls: "bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs font-black",
                inactiveCls: "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300",
                badgeActive: "bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900",
                badgeInactive: "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200",
              },
              {
                id: "ANULADA",
                label: "Anuladas",
                count: metricas.anuladas,
                icon: Ban,
                activeCls: "bg-rose-600 hover:bg-rose-700 text-white border-rose-700 shadow-xs ring-2 ring-rose-400/30",
                inactiveCls: "bg-rose-50/80 hover:bg-rose-100 text-rose-800 border-rose-200/90 dark:bg-rose-950/30 dark:border-rose-800/60 dark:text-rose-300",
                badgeActive: "bg-black/20 text-white",
                badgeInactive: "bg-rose-200/80 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200",
              },
            ].map((st) => {
              const isSel = estadoFilter === st.id;
              const IconComp = st.icon;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setEstadoFilter(st.id)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-bold border transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
                    isSel ? st.activeCls : st.inactiveCls
                  }`}
                >
                  <IconComp className="h-3.5 w-3.5 shrink-0" />
                  <span>{st.label}</span>
                  <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-black ${isSel ? st.badgeActive : st.badgeInactive}`}>
                    {st.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Resumen / Reset rápido con fondo sólido */}
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground w-full lg:w-auto justify-between lg:justify-end">
            <span className="text-[11px] uppercase tracking-wider">
              Total: <strong className="text-foreground">{metricas.total}</strong> órdenes
            </span>
            {(colorFilter !== "TODOS" || digitoFilter !== "TODOS" || customPiezasInput || searchQuery.trim()) && (
              <button
                type="button"
                onClick={() => {
                  setColorFilter("TODOS");
                  setDigitoFilter("TODOS");
                  setCustomPiezasInput("");
                  setSearchQuery("");
                }}
                className="h-7.5 px-3 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <X className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>Limpiar filtros</span>
              </button>
            )}
          </div>
        </div>

        {/* Nivel 2: Buscador Principal + Selector de Color + Selector de Piezas con Campo Personalizado */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Buscador de Marbetes */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por orden, cliente, teléfono o marbete..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9.5 pr-8 h-10.5 rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 text-xs font-medium focus-visible:bg-white dark:focus-visible:bg-slate-900 shadow-2xs w-full"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Selector de Color Profesional y Ejecutivo */}
          <div className="w-full md:w-56 shrink-0">
            <Popover open={openColorPopover} onOpenChange={setOpenColorPopover}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={`h-10.5 px-3.5 rounded-2xl border transition-all flex items-center justify-between gap-2 text-xs font-bold w-full cursor-pointer shadow-2xs ${
                    colorFilter !== "TODOS"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs"
                      : "bg-slate-50/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {colorFilter !== "TODOS" ? (
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs ${
                          COLORES_MARBETE.find((c) => c.nombre.toLowerCase() === colorFilter.toLowerCase())?.bg || "bg-primary"
                        }`}
                      />
                    ) : (
                      <Palette className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate">
                      {colorFilter === "TODOS" ? "Color de marbete" : `Color: ${colorFilter}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {colorFilter !== "TODOS" && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setColorFilter("TODOS");
                        }}
                        className="p-0.5 rounded-full hover:bg-white/20 dark:hover:bg-black/20 text-white dark:text-slate-900 cursor-pointer"
                        title="Quitar filtro de color"
                      >
                        <X className="h-3 w-3" />
                      </span>
                    )}
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        openColorPopover ? "rotate-180" : ""
                      } ${colorFilter !== "TODOS" ? "text-white/80 dark:text-slate-900/80" : "text-muted-foreground"}`}
                    />
                  </div>
                </button>
              </PopoverTrigger>

              <PopoverContent
                align="start"
                className="w-72 p-2.5 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5 z-50"
              >
                <div className="px-2 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10.5px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Palette className="h-3 w-3 text-primary" />
                    <span>Colores de Marbete</span>
                  </span>
                  {colorFilter !== "TODOS" && (
                    <button
                      type="button"
                      onClick={() => {
                        setColorFilter("TODOS");
                        setOpenColorPopover(false);
                      }}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                    >
                      Restablecer
                    </button>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                  {/* Opción Todos los colores */}
                  <button
                    type="button"
                    onClick={() => {
                      setColorFilter("TODOS");
                      setOpenColorPopover(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      colorFilter === "TODOS"
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Layers className="h-3.5 w-3.5 opacity-80 shrink-0" />
                      <span>Todos los colores</span>
                    </div>
                    {colorFilter === "TODOS" && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </button>

                  {/* Listado de Colores con Métricas Reales */}
                  {COLORES_MARBETE.filter((c) => c.nombre !== "TODOS").map((c) => {
                    const stat = statsColoresMap.get(c.nombre.toLowerCase());
                    const pzs = estadoFilter === "EN_TALLER" ? (stat?.piezasEnTaller || 0) : (stat?.piezasTotal || 0);
                    const isSel = colorFilter.toLowerCase() === c.nombre.toLowerCase();

                    return (
                      <button
                        key={c.nombre}
                        type="button"
                        onClick={() => {
                          setColorFilter(c.nombre);
                          setOpenColorPopover(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isSel
                            ? "bg-slate-100 dark:bg-slate-800 text-foreground font-bold ring-1 ring-slate-300 dark:ring-slate-700 shadow-2xs"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className={`w-3.5 h-3.5 rounded-md shadow-2xs border border-black/10 dark:border-white/10 shrink-0 ${c.bg}`} />
                          <span className="truncate">{c.nombre}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {pzs > 0 ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {pzs} {pzs === 1 ? "pz" : "pzs"}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/40 font-medium">0 pzs</span>
                          )}
                          {isSel && <Check className="h-3.5 w-3.5 text-primary stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Segmento de Piezas por orden con input personalizado N° */}
          <div className="flex items-center gap-1 bg-slate-50/90 dark:bg-slate-800/70 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/80 shrink-0 overflow-x-auto scrollbar-none">
            <span className="text-[11px] font-bold text-muted-foreground px-2 flex items-center gap-1 shrink-0">
              <Shirt className="h-3.5 w-3.5 text-slate-400" />
              <span>Pzs:</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setDigitoFilter("TODOS");
                setCustomPiezasInput("");
              }}
              className={`h-7.5 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                digitoFilter === "TODOS" && !customPiezasInput
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs font-black"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Todas
            </button>
            {[1, 2, 3, 4, 5].map((num) => {
              const isSel = digitoFilter === num && !customPiezasInput;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setDigitoFilter(num);
                    setCustomPiezasInput("");
                  }}
                  className={`h-7.5 w-7.5 rounded-xl text-xs font-mono font-black transition-all flex items-center justify-center cursor-pointer ${
                    isSel
                      ? "bg-primary text-white shadow-2xs scale-105"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700/70"
                  }`}
                >
                  {num}
                </button>
              );
            })}

            {/* Input personalizado de piezas (N°) */}
            <div className="relative flex items-center ml-0.5">
              <input
                type="number"
                min="1"
                max="999"
                placeholder="N°"
                value={customPiezasInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomPiezasInput(val);
                  const num = parseInt(val, 10);
                  if (!isNaN(num) && num > 0) {
                    setDigitoFilter(num);
                  } else if (!val) {
                    setDigitoFilter("TODOS");
                  }
                }}
                className={`h-7.5 w-14 px-1.5 text-center text-xs font-mono font-bold rounded-xl border transition-all cursor-text ${
                  customPiezasInput
                    ? "bg-primary text-white border-primary placeholder:text-white/70 font-black shadow-2xs"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-muted-foreground hover:border-slate-300"
                }`}
                title="Escribe un número de piezas personalizado"
              />
            </div>
          </div>
        </div>

        {/* Nivel 3: Chips de filtros aplicados cuando hay alguno activo */}
        {(colorFilter !== "TODOS" || digitoFilter !== "TODOS" || customPiezasInput || searchQuery.trim()) && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex-wrap text-xs">
            <span className="text-[11px] font-bold text-muted-foreground">Filtros aplicados:</span>
            {colorFilter !== "TODOS" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                Color: {colorFilter}
                <X className="h-3 w-3 cursor-pointer hover:opacity-75" onClick={() => setColorFilter("TODOS")} />
              </span>
            )}
            {digitoFilter !== "TODOS" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                Piezas: {digitoFilter}
                <X
                  className="h-3 w-3 cursor-pointer hover:opacity-75"
                  onClick={() => {
                    setDigitoFilter("TODOS");
                    setCustomPiezasInput("");
                  }}
                />
              </span>
            )}
            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                &ldquo;{searchQuery}&rdquo;
                <X className="h-3 w-3 cursor-pointer hover:opacity-75" onClick={() => setSearchQuery("")} />
              </span>
            )}
          </div>
        )}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-3">
            {ordenesFiltradas.map((ord) => {
              const cliente = clientesMap.get(ord.cliente_id);
              const marbetes = getMarbetesDeOrden(ord);
              const totalItemsCount = ord.items.reduce((acc, it) => acc + (it.es_libra ? 1 : it.cantidad), 0);

              return (
                <Card
                  key={ord.id}
                  onClick={() => setSelectedOrden(ord)}
                  className="p-3 sm:p-3.5 rounded-2xl border bg-white dark:bg-slate-900 hover:border-primary/40 dark:hover:border-primary/40 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-2.5 group shadow-2xs"
                >
                  {/* Cabecera con Estado y Badge(s) de Marbete */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Tag className="h-3 w-3 text-primary/70" />
                        <span>{marbetes.length > 1 ? `${marbetes.length} Tiras Grapadas` : "Marbete Hidrofix"}</span>
                      </span>
                      <div>{getEstadoBadge(ord.estado)}</div>
                    </div>

                    {/* Tiras Físicas Grapadas Compactas (Simulación de Tickets de Talonario) */}
                    <div className={`py-0.5 ${marbetes.length === 1 ? "flex justify-center" : "flex items-stretch gap-2 overflow-x-auto pb-1 scrollbar-thin"}`}>
                      {marbetes.map((m, mIdx) => {
                        const tStyle = getPhysicalMarbeteStyles(m.color);
                        const secStr = m.secuencia ? String(m.secuencia).replace(/^#/, "") : "---";
                        const pCount = m.piezas || 1;

                        return (
                          <div
                            key={m.id || mIdx}
                            className={`relative overflow-hidden rounded-xl border-2 transition-all font-sans select-none p-1.5 flex flex-col items-center justify-between text-center ${
                              marbetes.length === 1
                                ? "w-full max-w-[155px] h-[126px]"
                                : "w-[120px] min-w-[120px] h-[126px] shrink-0"
                            } ${tStyle.bg} ${tStyle.inkText} border-black/15 dark:border-white/15 shadow-2xs hover:shadow-xs`}
                          >
                            {/* Micro Header: TIRA #X y Color */}
                            <div className="w-full flex items-center justify-between text-[7px] uppercase font-black tracking-wider opacity-85 pb-0.5 border-b border-current/20 mb-0.5 leading-tight">
                              <span>TIRA #{mIdx + 1}</span>
                              <span className="font-extrabold">{tStyle.name}</span>
                            </div>

                            {/* Cuadro Negro Centrado con Cantidad de Piezas */}
                            <div className="my-0.5 flex flex-col items-center justify-center">
                              <div
                                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-display font-black text-xl sm:text-2xl shadow-inner border border-black/30 ${tStyle.centerBox}`}
                              >
                                {pCount}
                              </div>
                              <span className="text-[6.5px] uppercase font-black tracking-widest text-center block mt-0.5 opacity-85">
                                {pCount === 1 ? "1 Prenda" : `${pCount} Prendas`}
                              </span>
                            </div>

                            {/* Número de Secuencia DEBAJO en Tipografía Grande */}
                            <div className="w-full text-center pt-0.5 border-t border-current/20">
                              <span className="font-mono font-black text-lg sm:text-xl tracking-tight leading-none block">
                                {secStr}
                              </span>
                              <span className="text-[6px] uppercase font-bold tracking-wider opacity-65 block mt-0.5">
                                No. Secuencia
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Panel de Metadatos de la Orden (Centrado y Elegante) */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    {/* Bloque Centrado: No. de Orden y Fecha de Emisión con Hora */}
                    <div className="flex flex-col items-center justify-center text-center">
                      <div
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-xl bg-[#1B4B73] text-white font-black text-xs sm:text-[13px] tracking-tight shadow-xs"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      >
                        <Package className="h-3.5 w-3.5 text-[#F0B900] shrink-0" />
                        <span className="text-white">{ord.numero}</span>
                      </div>

                      <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground font-medium mt-1">
                        <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>{formatOrderDateCompact(ord.creado_en)}</span>
                      </div>
                    </div>

                    {/* Cliente Centrado con Avatar y Teléfono */}
                    <div className="py-1.5 px-3 rounded-xl bg-slate-50/90 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 flex flex-col items-center justify-center text-center">
                      <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 max-w-full">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">
                          {cliente ? `${cliente.nombre} ${cliente.apellido || ""}`.trim() : "Consumidor Final"}
                        </span>
                      </div>
                      {cliente?.telefono && cliente.telefono !== "---" && (
                        <div className="text-[10px] text-muted-foreground font-medium mt-0.5 flex items-center justify-center gap-1">
                          <Phone className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                          <span>{cliente.telefono}</span>
                        </div>
                      )}
                    </div>

                    {/* Fila 3: Prendas con Icono y Estado Financiero Sincronizado */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="h-6.5 w-6.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-[#1B4B73] dark:text-sky-400 flex items-center justify-center shrink-0">
                          <Shirt className="h-3.5 w-3.5" />
                        </div>
                        <div className="leading-tight">
                          <span className="text-[8.5px] uppercase font-bold text-muted-foreground tracking-wider block">
                            Prendas
                          </span>
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                            {totalItemsCount} {totalItemsCount === 1 ? "pieza" : "piezas"}
                            {ord.items.length > 1 && (
                              <span className="text-[10px] font-normal text-muted-foreground ml-1">
                                ({ord.items.length} tipos)
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {(() => {
                        const { total, saldo, isPagada, hasAbono } = getOrdenFinancialInfo(ord);

                        return (
                          <div className="text-right leading-tight flex flex-col items-end">
                            {isPagada ? (
                              <>
                                <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md border border-emerald-200/80 dark:border-emerald-800 mb-0.5">
                                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                                  Pagada
                                </span>
                                <span className="font-display font-black text-sm sm:text-[15px] text-emerald-700 dark:text-emerald-400">
                                  {formatRD(total)}
                                </span>
                              </>
                            ) : hasAbono ? (
                              <>
                                <span className="text-[8px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider block mb-0.5">
                                  Resta por cobrar
                                </span>
                                <span className="font-display font-black text-sm sm:text-[15px] text-amber-600 dark:text-amber-400">
                                  {formatRD(saldo)}
                                </span>
                                <span className="text-[8px] text-muted-foreground font-semibold">
                                  Total {formatRD(total)}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-[8px] uppercase font-bold text-rose-600/90 dark:text-rose-400 tracking-wider block mb-0.5">
                                  Total por cobrar
                                </span>
                                <span className="font-display font-black text-sm sm:text-[15px] text-slate-900 dark:text-slate-100">
                                  {formatRD(total)}
                                </span>
                              </>
                            )}
                          </div>
                        );
                      })()}
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
        <DialogContent className="max-w-md w-full p-4 sm:p-4.5 rounded-2xl z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl font-sans">
          {selectedOrden && (
            <div className="space-y-3">
              {/* Cabecera de la Orden con Estado y espacio para el botón de cierre */}
              <DialogHeader className="pr-6 pb-2 border-b border-slate-100 dark:border-slate-800 space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <DialogTitle className="text-base font-display font-black flex items-center gap-1.5 text-foreground">
                    <Receipt className="h-4 w-4 text-primary shrink-0" />
                    <span>Orden {selectedOrden.numero}</span>
                  </DialogTitle>
                  <div>{getEstadoBadge(selectedOrden.estado)}</div>
                </div>
                <DialogDescription className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                  <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                  <span>Emitida el {formatOrderDateCompact(selectedOrden.creado_en)}</span>
                </DialogDescription>
              </DialogHeader>

              {/* Tira Física Grapada de Marbete (Simulación Auténtica de Talonario) */}
              {(() => {
                const marbetesModal = getMarbetesDeOrden(selectedOrden);
                const totalPiezasModal = marbetesModal.reduce((acc, it) => acc + (Number(it.piezas) || 0), 0) || selectedOrden.marbete_piezas || selectedOrden.items.reduce((acc, it) => acc + (it.es_libra ? 1 : it.cantidad), 0);
                return (
                  <div className="space-y-1">
                    <div className={`flex justify-center items-center gap-2 py-0.5 ${marbetesModal.length > 1 ? "overflow-x-auto pb-1" : ""}`}>
                      {marbetesModal.map((m, mIdx) => {
                        const tStyle = getPhysicalMarbeteStyles(m.color);
                        const secStr = m.secuencia ? String(m.secuencia).replace(/^#/, "") : "---";
                        const pCount = m.piezas || 1;

                        return (
                          <div
                            key={m.id || mIdx}
                            className={`relative overflow-hidden rounded-xl border-2 transition-all font-sans select-none p-1.5 flex flex-col items-center justify-between text-center w-[125px] min-w-[125px] h-[115px] ${tStyle.bg} ${tStyle.inkText} border-black/15 dark:border-white/15 shadow-2xs`}
                          >
                            {/* Micro Header: TIRA #X y Color */}
                            <div className="w-full flex items-center justify-between text-[7px] uppercase font-black tracking-wider opacity-85 pb-0.5 border-b border-current/20 mb-0.5 leading-tight">
                              <span>TIRA #{mIdx + 1}</span>
                              <span className="font-extrabold">{tStyle.name}</span>
                            </div>

                            {/* Cuadro Negro Centrado con Cantidad de Piezas */}
                            <div className="my-0.5 flex flex-col items-center justify-center">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center font-display font-black text-lg shadow-inner border border-black/30 ${tStyle.centerBox}`}
                              >
                                {pCount}
                              </div>
                              <span className="text-[6.5px] uppercase font-black tracking-widest text-center block mt-0.5 opacity-85">
                                {pCount === 1 ? "1 Prenda" : `${pCount} Prendas`}
                              </span>
                            </div>

                            {/* Número de Secuencia DEBAJO en Tipografía Grande */}
                            <div className="w-full text-center pt-0.5 border-t border-current/20">
                              <span className="font-mono font-black text-base tracking-tight leading-none block">
                                {secStr}
                              </span>
                              <span className="text-[6px] uppercase font-bold tracking-wider opacity-65 block">
                                No. Secuencia
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {marbetesModal.length > 1 && (
                      <div className="text-[10px] font-black text-center text-muted-foreground uppercase tracking-wider">
                        Total: {totalPiezasModal} prendas en marbetes
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Datos del Cliente y Resumen Financiero Compacto */}
              {(() => {
                const c = clientesMap.get(selectedOrden.cliente_id);
                return (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <User className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider block leading-none mb-0.5">
                          Cliente
                        </span>
                        <div className="font-bold text-foreground text-xs truncate">
                          {c ? `${c.nombre} ${c.apellido || ""}`.trim() : "Consumidor Final"}
                        </div>
                        {c?.telefono && c.telefono !== "---" && (
                          <div className="text-muted-foreground text-[10px] flex items-center gap-1 mt-0.5 truncate font-medium">
                            <Phone className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                            <span>{c.telefono}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="min-w-0">
                        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider block leading-none mb-0.5">
                          Total Orden
                        </span>
                        <div className="font-display font-black text-sm text-[#1B4B73] dark:text-sky-400 leading-tight">
                          {formatRD(selectedOrden.total)}
                        </div>
                      </div>

                      <div>
                        {selectedOrden.saldo > 0 ? (
                          <span className="text-[9px] font-black uppercase text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md border border-amber-300/80 dark:border-amber-800">
                            Resta {formatRD(selectedOrden.saldo)}
                          </span>
                        ) : (
                          <span className="text-[9.5px] font-black uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-300/80 dark:border-emerald-800">
                            Pagado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Desglose de Prendas Compacto */}
              {(() => {
                const totalItemsModal = selectedOrden.items.reduce((acc, it) => acc + (it.es_libra ? 1 : it.cantidad), 0);
                return (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[9.5px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Shirt className="h-3 w-3 text-primary" />
                        Prendas en esta orden ({totalItemsModal} pzs)
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 max-h-28 overflow-y-auto font-sans">
                      {selectedOrden.items.map((it, idx) => (
                        <div key={idx} className="py-1 px-2.5 flex justify-between items-center text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-700 font-mono font-black text-[10.5px] text-slate-800 dark:text-slate-200 shrink-0">
                              {it.cantidad}x
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{it.descripcion}</span>
                            {it.color && <span className="text-[10px] text-muted-foreground shrink-0">({it.color})</span>}
                          </div>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs shrink-0 pl-2">
                            {formatRD(it.precio_unitario * it.cantidad)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Botones de Cambio de Estado Rápido (Control Segmentado) */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Cambiar Estado de la Orden
                </span>
                <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
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
                        className={`py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                          isCurrent
                            ? "bg-[#1B4B73] text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        {labels[st] || st}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Acciones de Impresión y Cierre */}
              <div className="pt-2 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs font-bold"
                  onClick={() => setSelectedOrden(null)}
                >
                  Cerrar
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowPrint(selectedOrden)}
                  className="flex-1 rounded-xl text-xs font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5 text-[#F0B900]" />
                  Ticket Cliente
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowPrintProduccion(selectedOrden)}
                  variant="outline"
                  className="flex-1 rounded-xl text-xs font-bold border-amber-300 bg-amber-50/80 hover:bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 gap-1.5"
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
