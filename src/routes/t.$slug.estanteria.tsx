import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Layers,
  RotateCw,
  Box,
  Sparkles,
  Search,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  Shirt,
  User as UserIcon,
  Phone,
  Printer,
  Settings,
  Filter,
  X,
  MapPin,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Flame,
  Check,
  Calendar,
  ShoppingBag,
  Tag,
  FolderPlus,
  Lock,
} from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useOrdenes, useClientes, usePlans } from "@/hooks/use-queries";
import { queryClient } from "@/router";
import { PageHeader } from "@/components/klynn/PageHeader";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getDefaultEstanteriaZonas,
  saveTenantConfig,
  updateOrdenEstado,
  formatDateRD,
  isModuleEnabled,
  type EstanteriaZona,
  type Orden,
  type Cliente,
} from "@/lib/storage";
import { TicketPrintPortal } from "@/components/klynn/OrdenesPage";

export const Route = createFileRoute("/t/$slug/estanteria")({
  component: EstanteriaPage,
});

function EstanteriaPage() {
  const user = useRequireAuth();
  const tenant = user?.tenant;
  const tenantId = tenant?.id || "";
  const isAuthLoading = !user || user.tenant.id === "__loading__";

  // Queries
  const { data: ordenes = [], isLoading: loadingOrdenes } = useOrdenes(tenantId);
  const { data: clientes = [] } = useClientes(tenantId);
  const { data: plans = [], isLoading: loadingPlans } = usePlans();
  const activePlan = plans.find((p) => p.id === user?.tenant?.plan_id);
  const hasEstanteriaModule = isAuthLoading ? true : isModuleEnabled(user?.tenant || null, "estanteria", activePlan);

  // States de Filtro
  const [selectedZoneId, setSelectedZoneId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "libres" | "ocupados">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modales
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null); // slot name
  const [showPrintOrden, setShowPrintOrden] = useState<Orden | null>(null);
  const [zoneToDelete, setZoneToDelete] = useState<EstanteriaZona | null>(null);

  // Estado para Creador por Lotes
  const [batchZoneId, setBatchZoneId] = useState<string>("");
  const [batchPrefix, setBatchPrefix] = useState("Gancho ");
  const [batchStart, setBatchStart] = useState<number>(1);
  const [batchEnd, setBatchEnd] = useState<number>(30);
  const [batchPadZeros, setBatchPadZeros] = useState(true);

  // Estado para Nueva Zona
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneType, setNewZoneType] = useState<"conveyor" | "estante" | "riel" | "cesta" | "otro">("conveyor");
  const [newZonePrefix, setNewZonePrefix] = useState("");

  // Zonas activas con estado local reactivo en vivo
  const [zonas, setZonas] = useState<EstanteriaZona[]>(() => tenant?.config?.estanteria_zonas || []);

  useEffect(() => {
    if (tenant?.config?.estanteria_zonas) {
      setZonas(tenant.config.estanteria_zonas);
    }
  }, [tenant?.config?.estanteria_zonas]);

  // Set de nombres válidos de slots en las zonas configuradas
  const validSlotNamesSet = useMemo(() => {
    const set = new Set<string>();
    zonas.forEach((z) => {
      z.slots.forEach((s) => set.add(s.trim().toLowerCase()));
    });
    return set;
  }, [zonas]);

  // Órdenes activas que ocupan un slot existente en la estantería
  const activeOrdersInSlots = useMemo(() => {
    if (validSlotNamesSet.size === 0) return [];
    return ordenes.filter(
      (o) =>
        o.estado !== "ENTREGADA" &&
        o.estado !== "ANULADA" &&
        o.ubicacion_ropa &&
        validSlotNamesSet.has(o.ubicacion_ropa.trim().toLowerCase())
    );
  }, [ordenes, validSlotNamesSet]);

  // Mapa de slots ocupados
  const occupiedMap = useMemo(() => {
    const map = new Map<string, Orden>();
    activeOrdersInSlots.forEach((o) => {
      if (o.ubicacion_ropa) {
        map.set(o.ubicacion_ropa.trim().toLowerCase(), o);
      }
    });
    return map;
  }, [activeOrdersInSlots]);

  // Métricas generales vinculadas a la estantería
  const metrics = useMemo(() => {
    let totalSlots = 0;
    zonas.forEach((z) => {
      totalSlots += z.slots.length;
    });

    const occupiedCount = occupiedMap.size;
    const freeCount = Math.max(0, totalSlots - occupiedCount);
    const occupancyRate = totalSlots > 0 ? Math.round((occupiedCount / totalSlots) * 100) : 0;

    let totalGarments = 0;
    activeOrdersInSlots.forEach((o) => {
      const itemsCount = (o.items || []).reduce((sum, it) => sum + (it.cantidad || 1), 0);
      totalGarments += itemsCount;
    });

    return { totalSlots, freeCount, occupiedCount, occupancyRate, totalGarments };
  }, [zonas, occupiedMap, activeOrdersInSlots]);

  // Slots aplanados y filtrados
  const filteredSlots = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result: { zona: EstanteriaZona; slotName: string; occupiedBy?: Orden }[] = [];

    const targetZonas = selectedZoneId === "all" ? zonas : zonas.filter((z) => z.id === selectedZoneId);

    targetZonas.forEach((z) => {
      z.slots.forEach((s) => {
        const occ = occupiedMap.get(s.toLowerCase());
        const isOccupied = !!occ;

        // Filtro por Estado
        if (statusFilter === "libres" && isOccupied) return;
        if (statusFilter === "ocupados" && !isOccupied) return;

        // Filtro por Búsqueda
        if (q) {
          const matchSlot = s.toLowerCase().includes(q);
          const matchOrder = occ && occ.numero.toLowerCase().includes(q);
          const client = occ ? clientes.find((c) => c.id === occ.cliente_id) : null;
          const matchClient =
            client &&
            ((client.nombre && client.nombre.toLowerCase().includes(q)) ||
              (client.telefono && client.telefono.includes(q)));

          if (!matchSlot && !matchOrder && !matchClient) return;
        }

        result.push({
          zona: z,
          slotName: s,
          occupiedBy: occ,
        });
      });
    });

    return result;
  }, [zonas, selectedZoneId, statusFilter, searchQuery, occupiedMap, clientes]);

  // Guardar zonas en tenant.config con actualización inmediata
  const handleSaveZonas = async (newZonas: EstanteriaZona[]) => {
    setZonas(newZonas); // ACTUALIZACIÓN EN VIVO INMEDIATA (0ms)
    if (!tenant) return;
    try {
      const updatedConfig = {
        ...(tenant.config || {}),
        estanteria_zonas: newZonas,
      };
      tenant.config = updatedConfig;
      await saveTenantConfig(tenant.id, updatedConfig);
      queryClient.invalidateQueries({ queryKey: ["tenant", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    } catch (e: any) {
      toast.error("Error al guardar estantería: " + e.message);
    }
  };

  // Abrir modal de creación de rango con prefijo inteligente de la zona
  const openBatchModal = (initialZoneId?: string) => {
    if (zonas.length === 0) {
      toast.info("Primero crea una zona física para asignarle su rango de espacios.");
      setShowZoneModal(true);
      return;
    }
    const targetZ = zonas.find((z) => z.id === (initialZoneId || (selectedZoneId !== "all" ? selectedZoneId : zonas[0].id))) || zonas[0];
    setBatchZoneId(targetZ.id);
    if (targetZ.prefijo) {
      setBatchPrefix(targetZ.prefijo);
    } else {
      setBatchPrefix(
        targetZ.tipo === "estante"
          ? "Estante "
          : targetZ.tipo === "riel"
          ? "Riel "
          : targetZ.tipo === "cesta"
          ? "Cesta "
          : targetZ.tipo === "otro"
          ? "Espacio "
          : "Gancho "
      );
    }
    setShowBatchModal(true);
  };

  // Crear rango de slots
  const handleCreateBatch = async () => {
    if (!batchZoneId) {
      toast.error("Selecciona una zona primero");
      return;
    }
    if (batchStart >= batchEnd) {
      toast.error("El número inicial debe ser menor al final");
      return;
    }

    const targetZone = zonas.find((z) => z.id === batchZoneId);
    if (!targetZone) return;

    const newSlots: string[] = [];
    for (let i = batchStart; i <= batchEnd; i++) {
      const numStr = batchPadZeros ? String(i).padStart(2, "0") : String(i);
      newSlots.push(`${batchPrefix}${numStr}`.trim());
    }

    // Unir sin duplicados
    const combined = Array.from(new Set([...targetZone.slots, ...newSlots]));
    const updated = zonas.map((z) => (z.id === batchZoneId ? { ...z, slots: combined } : z));

    await handleSaveZonas(updated);
    setShowBatchModal(false);
    toast.success(`Se agregaron ${newSlots.length} espacios a ${targetZone.nombre} ✓`);
  };

  // Crear nueva zona
  const handleCreateZone = async () => {
    if (!newZoneName.trim()) {
      toast.error("Ingresa el nombre de la zona");
      return;
    }

    const newZone: EstanteriaZona = {
      id: `zona-${Date.now()}`,
      nombre: newZoneName.trim(),
      tipo: newZoneType,
      prefijo: newZonePrefix.trim() || undefined,
      color: newZoneType === "conveyor" ? "indigo" : newZoneType === "estante" ? "emerald" : "amber",
      slots: [],
    };

    const updated = [...zonas, newZone];
    await handleSaveZonas(updated);
    setNewZoneName("");
    setNewZonePrefix("");
    setShowZoneModal(false);
    toast.success(`Zona "${newZone.nombre}" creada correctamente ✓`);
  };

  // Eliminar un slot inmediatamente en vivo
  const handleDeleteSlot = async (zoneId: string, slotName: string) => {
    if (occupiedMap.has(slotName.toLowerCase())) {
      toast.error(`No puedes eliminar "${slotName}" porque actualmente tiene una orden ocupada`);
      return;
    }

    const updated = zonas.map((z) => {
      if (z.id === zoneId) {
        return { ...z, slots: z.slots.filter((s) => s !== slotName) };
      }
      return z;
    });

    setZonas(updated); // Actualización visual inmediata
    await handleSaveZonas(updated);
    toast.success(`Espacio "${slotName}" eliminado ✓`);
  };

  // Preparar eliminación de zona con diálogo propio
  const handleDeleteZone = (zona: EstanteriaZona) => {
    const hasOccupied = zona.slots.some((s) => occupiedMap.has(s.toLowerCase()));
    if (hasOccupied) {
      toast.error(`No puedes eliminar la zona "${zona.nombre}" porque tiene órdenes activas en sus espacios`);
      return;
    }
    setZoneToDelete(zona);
  };

  // Confirmar y ejecutar eliminación de zona inmediatamente en vivo
  const handleExecuteDeleteZone = async () => {
    if (!zoneToDelete) return;
    const targetId = zoneToDelete.id;
    const targetName = zoneToDelete.nombre;
    const updated = zonas.filter((z) => z.id !== targetId);
    
    setZonas(updated); // Actualización visual inmediata en vivo
    if (selectedZoneId === targetId) {
      setSelectedZoneId("all");
    }
    setZoneToDelete(null);
    await handleSaveZonas(updated);
    toast.success(`Zona "${targetName}" eliminada correctamente ✓`);
  };

  // Liberar slot de una orden
  const handleFreeSlot = async (orden: Orden) => {
    try {
      await updateOrdenEstado(orden.id, orden.estado, "");
      queryClient.invalidateQueries({ queryKey: ["ordenes", tenantId] });
      toast.success(`Espacio ${orden.ubicacion_ropa} liberado correctamente`);
    } catch (e: any) {
      toast.error("Error al liberar espacio: " + e.message);
    }
  };

  // Asignar orden a un slot libre
  const handleAssignOrderToSlot = async (ordenId: string, slotName: string) => {
    try {
      const ord = ordenes.find((o) => o.id === ordenId);
      if (!ord) return;
      await updateOrdenEstado(ord.id, ord.estado, slotName);
      queryClient.invalidateQueries({ queryKey: ["ordenes", tenantId] });
      setShowAssignModal(null);
      toast.success(`Orden #${ord.numero} asignada a ${slotName} 📍`);
    } catch (e: any) {
      toast.error("Error al asignar: " + e.message);
    }
  };

  const getZoneTheme = (tipo: string) => {
    switch (tipo) {
      case "conveyor":
        return {
          icon: RotateCw,
          inactive: "bg-violet-50 dark:bg-violet-950/40 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-800 hover:bg-violet-100",
          active: "bg-violet-600 text-white shadow-xs border-violet-600",
          badgeInactive: "bg-violet-200/80 text-violet-900 dark:bg-violet-900/70 dark:text-violet-200",
          badgeActive: "bg-white/25 text-white",
          iconColor: "text-violet-600 dark:text-violet-400",
        };
      case "estante":
        return {
          icon: Box,
          inactive: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100",
          active: "bg-emerald-600 text-white shadow-xs border-emerald-600",
          badgeInactive: "bg-emerald-200/80 text-emerald-900 dark:bg-emerald-900/70 dark:text-emerald-200",
          badgeActive: "bg-white/25 text-white",
          iconColor: "text-emerald-600 dark:text-emerald-400",
        };
      case "riel":
        return {
          icon: Sparkles,
          inactive: "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100",
          active: "bg-amber-500 text-white shadow-xs border-amber-500",
          badgeInactive: "bg-amber-200/80 text-amber-950 dark:bg-amber-900/70 dark:text-amber-200",
          badgeActive: "bg-white/25 text-white",
          iconColor: "text-amber-600 dark:text-amber-400",
        };
      case "cesta":
        return {
          icon: ShoppingBag,
          inactive: "bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800 hover:bg-sky-100",
          active: "bg-sky-600 text-white shadow-xs border-sky-600",
          badgeInactive: "bg-sky-200/80 text-sky-950 dark:bg-sky-900/70 dark:text-sky-200",
          badgeActive: "bg-white/25 text-white",
          iconColor: "text-sky-600 dark:text-sky-400",
        };
      default:
        return {
          icon: Tag,
          inactive: "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100",
          active: "bg-rose-500 text-white shadow-xs border-rose-500",
          badgeInactive: "bg-rose-200/80 text-rose-950 dark:bg-rose-900/70 dark:text-rose-200",
          badgeActive: "bg-white/25 text-white",
          iconColor: "text-rose-600 dark:text-rose-400",
        };
    }
  };

  const getZoneIcon = (tipo: string) => {
    const theme = getZoneTheme(tipo);
    const Icon = theme.icon;
    return <Icon className="h-4 w-4" />;
  };

  if (isAuthLoading) {
    return <GlobalPageLoader text="Cargando estantería virtual..." />;
  }

  if (!hasEstanteriaModule) {
    return (
      <div className="min-h-[70vh] bg-slate-50/50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900">
            <Lock className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-display">
              Estantería virtual
            </h2>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              El módulo de <strong>Estantería virtual y Organización de Ganchos</strong> no está incluido en tu plan actual. Actualiza tu suscripción para desbloquear esta funcionalidad.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/t/$slug/configuracion"
              search={{ tab: "plan" }}
              params={{ slug: user?.tenant?.slug || "" }}
            >
              <Button className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-extrabold text-sm shadow-md transition-all active:scale-95 cursor-pointer">
                Ver planes y actualizar
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* HEADER */}
      <PageHeader
        title="Estantería virtual"
        subtitle="Organización física de ganchos, rieles, casilleros y estantes de tu lavandería en tiempo real."
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            type="button"
            onClick={() => setShowZoneModal(true)}
            className="flex items-center gap-2 rounded-xl h-10 px-4 font-extrabold bg-[#F0B900] hover:bg-[#d9a700] text-[#1B4B73] border border-[#F0B900] shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
          >
            <FolderPlus className="h-4 w-4 text-[#1B4B73] shrink-0" />
            <span>Nueva Zona</span>
          </Button>

          <Button
            type="button"
            onClick={() => openBatchModal()}
            className="flex items-center gap-2 rounded-xl h-10 px-5 font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
          >
            <Layers className="h-4 w-4 text-[#F0B900] shrink-0" />
            <span>Crear Rango</span>
          </Button>
        </div>
      </PageHeader>

      {/* 4 EXECUTIVE KPI CARDS (ESTILO /GASTOS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Total Espacios (Variant: Solid Azul Añil #1B4B73) */}
        <Card className="p-4 sm:p-4.5 rounded-2xl bg-[#1B4B73] text-white shadow-md border-0 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-[13px] uppercase tracking-wider text-white/90 font-black">Total Espacios</span>
            <Layers className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-[#F0B900]" />
          </div>
          <div className="my-1.5 font-display font-black tracking-tight text-white text-2xl sm:text-3xl">
            {metrics.totalSlots}
          </div>
          <div className="text-xs sm:text-[13px] font-semibold truncate text-white/90">
            Slots configurados
          </div>
        </Card>

        {/* 2. Disponibles (Variant: Emerald / Menta) */}
        <Card className="p-4 sm:p-4.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-[13px] uppercase tracking-wider text-emerald-800 dark:text-emerald-300 font-black">Disponibles</span>
            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="my-1.5 font-display font-black tracking-tight text-foreground text-2xl sm:text-3xl">
            {metrics.freeCount}
          </div>
          <div className="text-xs sm:text-[13px] font-bold truncate text-emerald-800 dark:text-emerald-300">
            Espacios libres
          </div>
        </Card>

        {/* 3. Ocupados (Variant: Sky / Celeste) */}
        <Card className="p-4 sm:p-4.5 rounded-2xl bg-sky-500/10 border border-sky-500/25 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-[13px] uppercase tracking-wider text-sky-800 dark:text-sky-300 font-black">Ocupados</span>
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="my-1.5 font-display font-black tracking-tight text-foreground text-2xl sm:text-3xl">
            {metrics.occupiedCount}
          </div>
          <div className="text-xs sm:text-[13px] font-bold truncate text-sky-800 dark:text-sky-300">
            {metrics.occupancyRate}% Ocupación
          </div>
        </Card>

        {/* 4. Prendas Almacenadas (Variant: Purple / Violeta) */}
        <Card className="p-4 sm:p-4.5 rounded-2xl bg-purple-500/10 border border-purple-500/25 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-[13px] uppercase tracking-wider text-purple-800 dark:text-purple-300 font-black">Prendas</span>
            <Shirt className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="my-1.5 font-display font-black tracking-tight text-foreground text-2xl sm:text-3xl">
            {metrics.totalGarments}
          </div>
          <div className="text-xs sm:text-[13px] font-bold truncate text-purple-800 dark:text-purple-300">
            En estantería
          </div>
        </Card>
      </div>

      {/* FILTER AND SEARCH BAR */}
      <Card className="p-4 rounded-2xl border bg-white dark:bg-slate-900 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Zone Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedZoneId("all")}
              className={`h-9 flex items-center gap-2 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                selectedZoneId === "all"
                  ? "bg-[#1B4B73] text-white shadow-xs border-[#1B4B73]"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700"
              }`}
            >
              <Layers className={`h-4 w-4 shrink-0 ${selectedZoneId === "all" ? "text-[#F0B900]" : "text-slate-500"}`} />
              <span>Todas las Zonas</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                selectedZoneId === "all" ? "bg-white/20 text-white" : "bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
              }`}>
                {metrics.totalSlots}
              </span>
            </button>

            {zonas.map((z) => {
              const isActive = selectedZoneId === z.id;
              const theme = getZoneTheme(z.tipo);
              const Icon = theme.icon;
              return (
                <div key={z.id} className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedZoneId(z.id)}
                    className={`h-9 flex items-center gap-2 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                      isActive
                        ? theme.active
                        : theme.inactive
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : theme.iconColor}`} />
                    <span>{z.nombre}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                      isActive ? theme.badgeActive : theme.badgeInactive
                    }`}>
                      {z.slots.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteZone(z);
                    }}
                    title={`Eliminar zona "${z.nombre}"`}
                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-all cursor-pointer shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1.5 w-full md:w-auto justify-end">
            <div className="bg-slate-100/90 dark:bg-slate-800/90 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1.5 text-xs font-bold shadow-xs">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`h-9 px-3.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                  statusFilter === "all"
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-700/60"
                }`}
              >
                <Layers className={`h-4 w-4 shrink-0 ${statusFilter === "all" ? "text-white dark:text-slate-900" : "text-slate-500"}`} />
                <span>Todos</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                  statusFilter === "all" ? "bg-white/20 dark:bg-black/10 text-white dark:text-slate-900" : "bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                }`}>
                  {metrics.totalSlots}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("libres")}
                className={`h-9 px-3.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                  statusFilter === "libres"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                }`}
              >
                <CheckCircle2 className={`h-4 w-4 shrink-0 ${statusFilter === "libres" ? "text-emerald-100" : "text-emerald-600 dark:text-emerald-400"}`} />
                <span>Libres</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                  statusFilter === "libres" ? "bg-emerald-700 text-white" : "bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                }`}>
                  {metrics.freeCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("ocupados")}
                className={`h-9 px-3.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                  statusFilter === "ocupados"
                    ? "bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                }`}
              >
                <Clock className={`h-4 w-4 shrink-0 ${statusFilter === "ocupados" ? "text-amber-100" : "text-amber-600 dark:text-amber-400"}`} />
                <span>Ocupados</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                  statusFilter === "ocupados" ? "bg-amber-600 text-white" : "bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                }`}>
                  {metrics.occupiedCount}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número de gancho, número de orden (#KL-0097), cliente o teléfono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9.5 h-10 rounded-xl bg-slate-50 dark:bg-slate-950 border-none text-xs font-medium focus-visible:ring-indigo-500/30"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </Card>

      {/* GRID OF SLOTS */}
      {zonas.length === 0 ? (
        <Card className="py-16 text-center rounded-3xl border bg-white dark:bg-slate-900 shadow-xs">
          <div className="h-16 w-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-4 shadow-2xs">
            <Layers className="h-8 w-8" />
          </div>
          <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
            Aún no has configurado zonas de estantería
          </h3>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-md mx-auto">
            Organiza los ganchos, rieles o casilleros físicos de tu lavandería. Empieza creando tu primera zona (ej. Conveyor Principal, Estantería A, Riel VIP).
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <Button
              type="button"
              onClick={() => setShowZoneModal(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl h-10 px-6 font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm"
            >
              <FolderPlus className="h-4 w-4 text-[#F0B900] shrink-0" />
              <span>Crear Primera Zona</span>
            </Button>
          </div>
        </Card>
      ) : filteredSlots.length === 0 ? (
        <Card className="py-16 text-center rounded-3xl border bg-white dark:bg-slate-900 shadow-xs">
          <Layers className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No hay espacios en esta zona</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {searchQuery
              ? "No se encontraron posiciones con ese criterio de búsqueda."
              : "Comienza creando un rango de ganchos o casilleros para esta zona."}
          </p>
          {!searchQuery && (
            <Button
              type="button"
              onClick={() => openBatchModal(selectedZoneId === "all" ? undefined : selectedZoneId)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl h-10 px-6 font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm"
            >
              <Layers className="h-4 w-4 text-[#F0B900] shrink-0" />
              <span>Crear Rango</span>
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSlots.map(({ zona, slotName, occupiedBy }) => {
            const isOccupied = !!occupiedBy;
            const client = isOccupied ? clientes.find((c) => c.id === occupiedBy.cliente_id) : null;
            const garmentCount = isOccupied
              ? (occupiedBy.items || []).reduce((sum, it) => sum + (it.cantidad || 1), 0)
              : 0;

            return (
              <Card
                key={`${zona.id}-${slotName}`}
                className={`p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                  isOccupied
                    ? "bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-900/60 shadow-xs ring-1 ring-rose-500/20"
                    : "bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-xs"
                }`}
              >
                {/* Header del Slot */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs text-muted-foreground shrink-0">{getZoneIcon(zona.tipo)}</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight truncate">
                        {slotName}
                      </span>
                    </div>

                    {isOccupied ? (
                      <Badge className="bg-rose-600 hover:bg-rose-600 text-white font-black text-[10px] px-2 py-0.5 rounded-lg shrink-0 shadow-2xs">
                        Ocupado
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded-lg shrink-0">
                        Libre
                      </Badge>
                    )}
                  </div>

                  {/* Info de la Orden Ocupada (Rojo, Centrado, Sin #) */}
                  {isOccupied ? (
                    <div className="py-3 px-3 bg-rose-50/70 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900/40 text-center space-y-1.5">
                      {/* Número de orden arriba centrado sin '#' */}
                      <div className="text-center">
                        <span className="font-mono text-sm font-black text-rose-600 dark:text-rose-400 tracking-tight block">
                          {occupiedBy.numero.replace(/^#/, "")}
                        </span>
                      </div>

                      {/* Cantidad de prendas debajo centrado */}
                      <div className="flex items-center justify-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100/90 dark:bg-rose-900/60 px-2.5 py-0.5 rounded-md border border-rose-200/60 dark:border-rose-900/40">
                          <Shirt className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                          {garmentCount} {garmentCount === 1 ? "prenda" : "prendas"}
                        </span>
                      </div>

                      {/* Cliente debajo */}
                      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-800 dark:text-slate-200 font-bold truncate pt-1 border-t border-rose-100/80 dark:border-rose-900/30">
                        <UserIcon className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate">{client?.nombre || "Consumidor Final"}</span>
                      </div>

                      {/* Fecha de entrega */}
                      {occupiedBy.fecha_entrega && (
                        <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                          <Calendar className="h-2.5 w-2.5 text-slate-400" />
                          <span className="truncate">Entrega: {formatDateRD(occupiedBy.fecha_entrega)}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-muted-foreground/60 text-xs font-medium flex flex-col items-center justify-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
                      <span>Espacio disponible</span>
                    </div>
                  )}
                </div>

                {/* Footer de Acciones */}
                <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between gap-1.5">
                  {isOccupied ? (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPrintOrden(occupiedBy)}
                        title="Imprimir Ticket de Taller"
                        className="h-7 px-2 text-slate-600 hover:text-rose-600 text-xs font-bold cursor-pointer"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleFreeSlot(occupiedBy)}
                        className="h-7 px-2.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 cursor-pointer rounded-lg ml-auto"
                      >
                        Liberar espacio
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSlot(zona.id, slotName)}
                        title="Eliminar este espacio"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setShowAssignModal(slotName)}
                        className="h-7 px-3 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer ml-auto gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Asignar Orden
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL: CREADOR POR LOTES */}
      <Dialog open={showBatchModal} onOpenChange={setShowBatchModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Layers className="h-5 w-5 text-indigo-600" />
              Crear Rango de Espacios
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Genera automáticamente una secuencia numérica de ganchos o casilleros para tu lavandería.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-bold mb-1.5 block">Zona de Almacén</Label>
              <Select
                value={batchZoneId}
                onValueChange={(val) => {
                  setBatchZoneId(val);
                  const chosenZ = zonas.find((z) => z.id === val);
                  if (chosenZ?.prefijo) {
                    setBatchPrefix(chosenZ.prefijo);
                  } else if (chosenZ) {
                    setBatchPrefix(
                      chosenZ.tipo === "estante"
                        ? "Estante "
                        : chosenZ.tipo === "riel"
                        ? "Riel "
                        : chosenZ.tipo === "cesta"
                        ? "Cesta "
                        : chosenZ.tipo === "otro"
                        ? "Espacio "
                        : "Gancho "
                    );
                  }
                }}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Seleccione una zona" />
                </SelectTrigger>
                <SelectContent>
                  {zonas.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.nombre} ({z.tipo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold mb-1.5 block">Prefijo del Espacio</Label>
              <Input
                value={batchPrefix}
                onChange={(e) => setBatchPrefix(e.target.value)}
                placeholder="Ej. Gancho , Estante A-, Riel R-"
                className="rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Texto que irá antes del número (ej. "Gancho 01")</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Desde Número</Label>
                <Input
                  type="number"
                  value={batchStart}
                  onChange={(e) => setBatchStart(Number(e.target.value))}
                  className="rounded-xl font-bold text-center"
                />
              </div>
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Hasta Número</Label>
                <Input
                  type="number"
                  value={batchEnd}
                  onChange={(e) => setBatchEnd(Number(e.target.value))}
                  className="rounded-xl font-bold text-center"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowBatchModal(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreateBatch} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Generar {Math.max(0, batchEnd - batchStart + 1)} Espacios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: NUEVA ZONA */}
      <Dialog open={showZoneModal} onOpenChange={setShowZoneModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Plus className="h-5 w-5 text-indigo-600" />
              Nueva Zona de Estantería
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Crea una nueva sección física para clasificar ganchos o casilleros.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-bold mb-1.5 block">Nombre de la Zona</Label>
              <Input
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                placeholder="Ej. Conveyor 2, Estantería B, Riel Superior..."
                className="rounded-xl"
                autoFocus
              />
            </div>

            <div>
              <Label className="text-xs font-bold mb-1.5 block">Tipo de Estructura</Label>
              <Select value={newZoneType} onValueChange={(v: any) => setNewZoneType(v)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Seleccione el tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conveyor">
                    <div className="flex items-center gap-2">
                      <RotateCw className="h-4 w-4 text-indigo-600" />
                      <span>Conveyor / Riel Rotativo</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="estante">
                    <div className="flex items-center gap-2">
                      <Box className="h-4 w-4 text-emerald-600" />
                      <span>Estantería / Casilleros</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="riel">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-600" />
                      <span>Riel Fijo / Área VIP</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="cesta">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-sky-600" />
                      <span>Cesta / Gaveta</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="otro">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-slate-600" />
                      <span>Otro Espacio</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold mb-1.5 block">Prefijo Sugerido (Opcional)</Label>
              <Input
                value={newZonePrefix}
                onChange={(e) => setNewZonePrefix(e.target.value)}
                placeholder="Ej. Gancho B-, Cesta-"
                className="rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowZoneModal(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreateZone} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Crear Zona
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: ASIGNAR ORDEN A UN SLOT LIBRE */}
      <Dialog open={!!showAssignModal} onOpenChange={(open) => !open && setShowAssignModal(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-5 w-5 text-emerald-600" />
              Asignar Orden a {showAssignModal}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Selecciona una de las órdenes activas que aún no tienen una posición asignada.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 max-h-[300px] overflow-y-auto space-y-2">
            {ordenes
              .filter((o) => o.estado !== "ENTREGADA" && o.estado !== "ANULADA" && !o.ubicacion_ropa)
              .map((ord) => {
                const c = clientes.find((cli) => cli.id === ord.cliente_id);
                return (
                  <button
                    key={ord.id}
                    type="button"
                    onClick={() => handleAssignOrderToSlot(ord.id, showAssignModal || "")}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 text-left transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-black text-slate-900 dark:text-white">#{ord.numero}</span>
                      <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{c?.nombre || "Consumidor Final"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {ord.items?.length || 0} prendas · RD$ {ord.total.toFixed(2)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs font-bold text-emerald-600 border-emerald-300">
                      Asignar ➔
                    </Badge>
                  </button>
                );
              })}

            {ordenes.filter((o) => o.estado !== "ENTREGADA" && o.estado !== "ANULADA" && !o.ubicacion_ropa).length === 0 && (
              <div className="py-8 text-center text-muted-foreground text-xs font-medium">
                No hay órdenes activas pendientes de ubicación.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAssignModal(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO PROPIO DE CONFIRMACIÓN PARA ELIMINAR ZONA */}
      <AlertDialog open={!!zoneToDelete} onOpenChange={(open) => !open && setZoneToDelete(null)}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-1">
              <Trash2 className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-base font-black text-slate-900 dark:text-white">
              ¿Eliminar zona &quot;{zoneToDelete?.nombre}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Esta acción eliminará permanentemente la zona y todos sus {zoneToDelete?.slots.length || 0} espacios o casilleros asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-3">
            <AlertDialogCancel className="rounded-xl text-xs font-bold h-9">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExecuteDeleteZone}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold h-9 shadow-xs"
            >
              Sí, Eliminar Zona
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PORTAL DE IMPRESIÓN */}
      {showPrintOrden && (
        <TicketPrintPortal
          orden={showPrintOrden}
          tenant={tenant}
          clientes={clientes}
          empleados={[]}
          onClose={() => setShowPrintOrden(null)}
          hiddenPreview={true}
          esProduccion={true}
        />
      )}
    </div>
  );
}
