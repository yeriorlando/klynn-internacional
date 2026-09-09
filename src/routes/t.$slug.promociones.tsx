import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  Search,
  CheckCircle2,
  Calendar,
  Tag,
  WashingMachine,
  Shirt,
  Percent,
  TrendingDown,
  ShoppingBag,
  Layers,
  ArrowRight,
  Clock,
  Check,
  X,
  SlidersHorizontal,
  Flame,
  Lock,
} from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  formatRD,
  savePromocion,
  togglePromocionActiva,
  deletePromocion,
  isModuleEnabled,
  type Promocion,
} from "@/lib/storage";
import { usePromociones, useCatalogo, useServicios, usePlans } from "@/hooks/use-queries";
import { toast } from "sonner";

export const Route = createFileRoute("/t/$slug/promociones")({
  component: PromocionesPage,
});

const DIAS_SEMANA = [
  { id: 1, label: "Lun", nombre: "Lunes" },
  { id: 2, label: "Mar", nombre: "Martes" },
  { id: 3, label: "Mié", nombre: "Miércoles" },
  { id: 4, label: "Jue", nombre: "Jueves" },
  { id: 5, label: "Vie", nombre: "Viernes" },
  { id: 6, label: "Sáb", nombre: "Sábado" },
  { id: 0, label: "Dom", nombre: "Domingo" },
];

function PromocionesPage() {
  const user = useRequireAuth();
  const queryClient = useQueryClient();
  const tenantId = user?.tenant.id ?? "";

  const isAuthLoading = !user || user.tenant.id === "__loading__";
  const { data: plans = [] } = usePlans();
  const activePlan = plans.find((p) => p.id === user?.tenant?.plan_id);
  const hasPromocionesModule = isAuthLoading ? true : isModuleEnabled(user?.tenant || null, "promociones", activePlan);

  const { data: promociones = [], isLoading } = usePromociones(tenantId);
  const { data: catalogo = [] } = useCatalogo(tenantId);
  const { data: servicios = [] } = useServicios(tenantId);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"todas" | "activas" | "pausadas">("todas");

  // Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promocion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Promocion | null>(null);

  // Form State
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipoDescuento, setTipoDescuento] = useState<"PORCENTAJE" | "MONTO_FIJO">("PORCENTAJE");
  const [valorDescuento, setValorDescuento] = useState<number>(15);
  const [tipoAplicacion, setTipoAplicacion] = useState<
    "TODA_LA_ORDEN" | "POR_CATEGORIA" | "POR_SERVICIO" | "POR_PRENDA"
  >("TODA_LA_ORDEN");
  const [categoriasSel, setCategoriasSel] = useState<string[]>([]);
  const [serviciosSel, setServiciosSel] = useState<string[]>([]);
  const [prendasSel, setPrendasSel] = useState<string[]>([]);
  const [diasSemana, setDiasSemana] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [minPiezas, setMinPiezas] = useState<number>(0);
  const [minSubtotal, setMinSubtotal] = useState<number>(0);
  const [codigoCupon, setCodigoCupon] = useState("");
  const [esAutomatica, setEsAutomatica] = useState(true);
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);
  const [searchScopeItem, setSearchScopeItem] = useState("");

  // Extraer categorías únicas del catálogo
  const categoriasDisponibles = useMemo(() => {
    const set = new Set<string>();
    catalogo.forEach((c) => {
      if (c.categoria && c.categoria.trim()) {
        set.add(c.categoria.trim());
      }
    });
    return Array.from(set).sort();
  }, [catalogo]);

  // Métricas
  const totalActivas = useMemo(() => promociones.filter((p) => p.activo).length, [promociones]);
  const totalUsos = useMemo(() => promociones.reduce((acc, p) => acc + (p.veces_usada || 0), 0), [promociones]);
  const totalAhorro = useMemo(
    () => promociones.reduce((acc, p) => acc + Number(p.total_descontado || 0), 0),
    [promociones],
  );

  // Filtro
  const filteredPromos = useMemo(() => {
    return promociones.filter((p) => {
      const matchSearch =
        p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.codigo_cupon && p.codigo_cupon.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchSearch) return false;
      if (filterTab === "activas") return p.activo;
      if (filterTab === "pausadas") return !p.activo;
      return true;
    });
  }, [promociones, searchQuery, filterTab]);

  function abrirCrear() {
    setEditingPromo(null);
    setNombre("");
    setDescripcion("");
    setTipoDescuento("PORCENTAJE");
    setValorDescuento(15);
    setTipoAplicacion("TODA_LA_ORDEN");
    setCategoriasSel([]);
    setServiciosSel([]);
    setPrendasSel([]);
    setDiasSemana([0, 1, 2, 3, 4, 5, 6]);
    setFechaInicio("");
    setFechaFin("");
    setMinPiezas(0);
    setMinSubtotal(0);
    setCodigoCupon("");
    setEsAutomatica(true);
    setSearchScopeItem("");
    setFormStep(1);
    setModalOpen(true);
  }

  function abrirEditar(p: Promocion) {
    setEditingPromo(p);
    setNombre(p.nombre);
    setDescripcion(p.descripcion || "");
    setTipoDescuento(p.tipo_descuento);
    setValorDescuento(p.valor_descuento);
    setTipoAplicacion(p.tipo_aplicacion);
    setCategoriasSel(p.categorias || []);
    setServiciosSel(p.servicios || []);
    setPrendasSel(p.prendas || []);
    setDiasSemana(p.dias_semana && p.dias_semana.length > 0 ? p.dias_semana : [0, 1, 2, 3, 4, 5, 6]);
    setFechaInicio(p.fecha_inicio || "");
    setFechaFin(p.fecha_fin || "");
    setMinPiezas(p.min_piezas || 0);
    setMinSubtotal(p.min_subtotal || 0);
    setCodigoCupon(p.codigo_cupon || "");
    setEsAutomatica(p.es_automatica);
    setSearchScopeItem("");
    setFormStep(1);
    setModalOpen(true);
  }

  async function handleToggle(promo: Promocion) {
    const nextState = !promo.activo;
    await togglePromocionActiva(promo.id, tenantId, nextState);
    queryClient.invalidateQueries({ queryKey: ["promociones", tenantId] });
    toast.success(nextState ? `Promoción "${promo.nombre}" activada` : `Promoción "${promo.nombre}" pausada`);
  }

  async function handleGuardar() {
    if (!nombre.trim()) {
      toast.error("El nombre de la promoción es obligatorio");
      setFormStep(1);
      return;
    }
    if (valorDescuento <= 0) {
      toast.error("El valor del descuento debe ser mayor a 0");
      setFormStep(1);
      return;
    }
    if (tipoAplicacion === "POR_CATEGORIA" && categoriasSel.length === 0) {
      toast.error("Selecciona al menos una categoría");
      setFormStep(2);
      return;
    }
    if (tipoAplicacion === "POR_SERVICIO" && serviciosSel.length === 0) {
      toast.error("Selecciona al menos un servicio");
      setFormStep(2);
      return;
    }

    try {
      await savePromocion({
        id: editingPromo?.id,
        tenant_id: tenantId,
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        tipo_descuento: tipoDescuento,
        valor_descuento: Number(valorDescuento),
        tipo_aplicacion: tipoAplicacion,
        categorias: tipoAplicacion === "POR_CATEGORIA" ? categoriasSel : [],
        servicios: tipoAplicacion === "POR_SERVICIO" ? serviciosSel : [],
        prendas: tipoAplicacion === "POR_PRENDA" ? prendasSel : [],
        dias_semana: diasSemana.length > 0 ? diasSemana : [0, 1, 2, 3, 4, 5, 6],
        fecha_inicio: fechaInicio || undefined,
        fecha_fin: fechaFin || undefined,
        min_piezas: Number(minPiezas || 0),
        min_subtotal: Number(minSubtotal || 0),
        codigo_cupon: codigoCupon ? codigoCupon.trim().toUpperCase() : undefined,
        es_automatica: esAutomatica,
        activo: editingPromo ? editingPromo.activo : true,
      });

      queryClient.invalidateQueries({ queryKey: ["promociones", tenantId] });
      toast.success(editingPromo ? "Promoción actualizada ✨" : "¡Promoción creada con éxito! ✨");
      setModalOpen(false);
    } catch (e: any) {
      toast.error("Error al guardar la promoción");
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      await deletePromocion(deleteTarget.id, tenantId);
      queryClient.invalidateQueries({ queryKey: ["promociones", tenantId] });
      toast.success(`Promoción "${deleteTarget.nombre}" eliminada`);
      setDeleteTarget(null);
    } catch (e) {
      toast.error("Error al eliminar la promoción");
    }
  }

  function toggleDia(id: number) {
    setDiasSemana((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  }

  if (!hasPromocionesModule) {
    return (
      <div className="min-h-[70vh] bg-slate-50/50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
        <div className="max-w-md w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 shadow-2xs">
            <Lock className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-display">
              Promociones y Cupones
            </h2>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              El módulo de <strong>Promociones, Descuentos Automáticos y Cupones</strong> no está incluido en tu plan actual. Actualiza tu suscripción para impulsar tus ventas.
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
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 space-y-6">
      <PageHeader
        title="Promociones y Descuentos"
        description="Crea ofertas automáticas por día de semana, categoría o volumen para dinamizar tus ventas"
      >
        <Button
          onClick={abrirCrear}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md cursor-pointer rounded-xl h-10 px-4"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>Nueva Promoción</span>
        </Button>
      </PageHeader>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-2 border-primary/10 rounded-2xl bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Promociones Activas</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-display text-foreground">{totalActivas}</span>
            <span className="text-[11px] font-semibold text-emerald-600">
              {totalActivas === 1 ? "activa en POS" : "activas en POS"}
            </span>
          </div>
        </Card>

        <Card className="p-4 border-2 border-primary/10 rounded-2xl bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Órdenes con Descuento</span>
            <div className="h-8 w-8 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-display text-foreground">{totalUsos}</span>
            <span className="text-[11px] font-semibold text-muted-foreground">veces aplicadas</span>
          </div>
        </Card>

        <Card className="p-4 border-2 border-primary/10 rounded-2xl bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Ahorro Otorgado</span>
            <div className="h-8 w-8 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-display text-foreground">{formatRD(totalAhorro)}</span>
          </div>
        </Card>

        <Card className="p-4 border-2 border-primary/10 rounded-2xl bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Punto de Venta</span>
            <div className="h-8 w-8 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-sm font-extrabold text-foreground">Detección Automática</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Aplica en el carrito sin fricción para el cajero</p>
        </Card>
      </div>

      {/* FILTER & SEARCH */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <Tabs
          value={filterTab}
          onValueChange={(v) => setFilterTab(v as any)}
          className="w-full sm:w-auto"
        >
          <TabsList className="h-11 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center gap-1">
            <TabsTrigger
              value="todas"
              className="h-9 px-4 rounded-xl text-xs font-bold transition-all data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 dark:text-slate-400 hover:text-foreground cursor-pointer"
            >
              Todas ({promociones.length})
            </TabsTrigger>
            <TabsTrigger
              value="activas"
              className="h-9 px-4 rounded-xl text-xs font-bold transition-all data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 dark:text-slate-400 hover:text-foreground cursor-pointer"
            >
              Activas ({totalActivas})
            </TabsTrigger>
            <TabsTrigger
              value="pausadas"
              className="h-9 px-4 rounded-xl text-xs font-bold transition-all data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 dark:text-slate-400 hover:text-foreground cursor-pointer"
            >
              Pausadas ({promociones.length - totalActivas})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar promoción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 rounded-xl text-xs bg-card border-border/60"
          />
        </div>
      </div>

      {/* PROMOTIONS LIST / GRID */}
      {filteredPromos.length === 0 ? (
        <Card className="p-12 text-center border-2 border-dashed border-primary/20 rounded-3xl bg-accent/5">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mb-3">
            <Sparkles className="h-7 w-7" />
          </div>
          <h3 className="font-display text-base font-bold text-foreground">
            {searchQuery ? "No se encontraron promociones" : "Aún no tienes promociones configuradas"}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            {searchQuery
              ? "Prueba cambiando los términos de búsqueda o el filtro seleccionado."
              : "Crea tu primera promoción para atraer más clientes en días muertos o premiar clientes frecuentes."}
          </p>
          {!searchQuery && (
            <Button
              onClick={abrirCrear}
              className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-9 text-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Crear mi primera promoción</span>
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPromos.map((promo) => {
            const isPorcentaje = promo.tipo_descuento === "PORCENTAJE";
            const benefitText = isPorcentaje ? `${promo.valor_descuento}% OFF` : `-${formatRD(promo.valor_descuento)}`;

            return (
              <Card
                key={promo.id}
                className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  promo.activo
                    ? "border-emerald-500/25 bg-card hover:border-emerald-500/40 shadow-xs"
                    : "border-border/40 bg-slate-50/50 dark:bg-slate-900/30 opacity-75"
                }`}
              >
                <div>
                  {/* TOP ROW: BENEFIT BADGE & ACTIVE TOGGLE */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black shadow-xs ${
                          promo.activo
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <Percent className="h-3 w-3" />
                        {benefitText}
                      </span>

                      {promo.es_automatica ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60">
                          Automática
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60">
                          Cupón
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={promo.activo}
                        onCheckedChange={() => handleToggle(promo)}
                        title={promo.activo ? "Pausar promoción" : "Activar promoción"}
                      />
                    </div>
                  </div>

                  {/* PROMO TITLE & DESCRIPTION */}
                  <div className="mt-3">
                    <h4 className="font-display font-black text-base text-foreground leading-tight">
                      {promo.nombre}
                    </h4>
                    {promo.descripcion && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{promo.descripcion}</p>
                    )}
                  </div>

                  {/* SCOPE (A QUÉ APLICA) */}
                  <div className="mt-3.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      {promo.tipo_aplicacion === "TODA_LA_ORDEN" && (
                        <Badge variant="outline" className="text-[10px] font-bold gap-1 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200">
                          <Layers className="h-3 w-3" />
                          Aplica a toda la orden
                        </Badge>
                      )}

                      {promo.tipo_aplicacion === "POR_CATEGORIA" && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] text-muted-foreground font-semibold">Categorías:</span>
                          {(promo.categorias || []).map((cat) => (
                            <Badge
                              key={cat}
                              variant="outline"
                              className="text-[10px] font-bold bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200"
                            >
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {promo.tipo_aplicacion === "POR_SERVICIO" && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] text-muted-foreground font-semibold">Servicios:</span>
                          {(promo.servicios || []).map((srv) => (
                            <Badge
                              key={srv}
                              variant="outline"
                              className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200"
                            >
                              {srv}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* DÍAS ACTIVOS */}
                    <div className="flex items-center gap-1 pt-1">
                      <span className="text-[10px] text-muted-foreground font-bold mr-1">Días:</span>
                      {DIAS_SEMANA.map((dia) => {
                        const isDayActive = (promo.dias_semana || []).includes(dia.id);
                        return (
                          <span
                            key={dia.id}
                            className={`h-5 w-5 rounded-md text-[9px] font-black flex items-center justify-center ${
                              isDayActive
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600"
                            }`}
                            title={dia.nombre}
                          >
                            {dia.label[0]}
                          </span>
                        );
                      })}
                    </div>

                    {/* CONDICIONES EXTRA */}
                    {(((promo.min_piezas ?? 0) > 0) || ((promo.min_subtotal ?? 0) > 0) || promo.codigo_cupon) && (
                      <div className="flex items-center gap-2 pt-1 flex-wrap text-[10px] text-muted-foreground">
                        {(promo.min_piezas ?? 0) > 0 && <span>Mín. {promo.min_piezas} piezas</span>}
                        {(promo.min_subtotal ?? 0) > 0 && <span>Mín. {formatRD(promo.min_subtotal || 0)}</span>}
                        {promo.codigo_cupon && (
                          <span className="font-mono font-bold text-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            Cupón: {promo.codigo_cupon}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* BOTTOM STATS & ACTIONS */}
                <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
                  <div className="text-[11px] text-muted-foreground">
                    <span className="font-bold text-foreground">{promo.veces_usada || 0}</span> órdenes ·{" "}
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatRD(promo.total_descontado || 0)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                      onClick={() => abrirEditar(promo)}
                      title="Editar promoción"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      onClick={() => setDeleteTarget(promo)}
                      title="Eliminar promoción"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL CREAR / EDITAR PROMOCIÓN */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-4 sm:p-5 overflow-hidden">
          <DialogHeader className="text-left pb-1">
            <DialogTitle className="text-base sm:text-lg font-display font-bold flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-emerald-600" />
              <span>{editingPromo ? "Editar Promoción" : "Nueva Promoción"}</span>
            </DialogTitle>
            <DialogDescription className="text-[11px] text-muted-foreground">
              Configura los beneficios y condiciones para aplicar esta oferta a tus clientes.
            </DialogDescription>
          </DialogHeader>

          {/* STEP TABS */}
          <div className="flex items-center gap-1 border-b border-border pb-2">
            <button
              type="button"
              onClick={() => setFormStep(1)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                formStep === 1
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              1. Descuento
            </button>
            <button
              type="button"
              onClick={() => setFormStep(2)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                formStep === 2
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              2. ¿A qué aplica?
            </button>
            <button
              type="button"
              onClick={() => setFormStep(3)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                formStep === 3
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              3. Días y Condiciones
            </button>
          </div>

          <div className="py-2.5 space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {/* STEP 1: DESCUENTO Y NOMBRE */}
            {formStep === 1 && (
              <div className="space-y-3">
                <div>
                  <Label className="text-[11px] font-bold">Nombre de la promoción *</Label>
                  <Input
                    placeholder="Ej. Martes de Edredones, Combo 20 Libras, Black Friday..."
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="mt-1 h-8.5 rounded-lg text-xs font-semibold"
                    autoFocus
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-bold">Descripción (opcional)</Label>
                  <Textarea
                    placeholder="Ej. 20% de descuento en ropa de cama todos los martes para llenar la jornada"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    className="mt-1 rounded-lg text-xs resize-none py-1.5"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                  <div>
                    <Label className="text-[11px] font-bold">Tipo de beneficio</Label>
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      <button
                        type="button"
                        onClick={() => setTipoDescuento("PORCENTAJE")}
                        className={`h-8 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all border cursor-pointer ${
                          tipoDescuento === "PORCENTAJE"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-card border-border/70 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Percent className="h-3 w-3" />
                        <span>Porcentaje</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoDescuento("MONTO_FIJO")}
                        className={`h-8 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all border cursor-pointer ${
                          tipoDescuento === "MONTO_FIJO"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-card border-border/70 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span>Monto Fijo</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-[11px] font-bold">
                      {tipoDescuento === "PORCENTAJE" ? "Porcentaje de descuento *" : "Monto a descontar (RD$) *"}
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        min="1"
                        max={tipoDescuento === "PORCENTAJE" ? 100 : 99999}
                        value={valorDescuento || ""}
                        onChange={(e) => setValorDescuento(parseFloat(e.target.value) || 0)}
                        className="h-8.5 rounded-lg text-xs font-black pr-10 text-center"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-black text-muted-foreground">
                        {tipoDescuento === "PORCENTAJE" ? "%" : "RD$"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border/50 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground block">Aplicación automática</span>
                    <span className="text-[10.5px] text-muted-foreground">
                      Klynn aplicará la promo automáticamente en el POS si se cumplen las condiciones
                    </span>
                  </div>
                  <Switch checked={esAutomatica} onCheckedChange={setEsAutomatica} />
                </div>
              </div>
            )}

            {/* STEP 2: ¿A QUÉ APLICA? */}
            {formStep === 2 && (
              <div className="space-y-3">
                <div>
                  <Label className="text-[11px] font-bold block mb-1.5 text-foreground">
                    Selecciona el alcance de la promoción
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {/* TODA LA ORDEN */}
                    <button
                      type="button"
                      onClick={() => setTipoAplicacion("TODA_LA_ORDEN")}
                      className={`p-2.5 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between min-h-[88px] ${
                        tipoAplicacion === "TODA_LA_ORDEN"
                          ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 shadow-xs ring-2 ring-emerald-500/20"
                          : "border-slate-200 dark:border-slate-800 bg-card hover:bg-slate-50 dark:hover:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div
                          className={`h-7 w-7 rounded-xl flex items-center justify-center transition-colors ${
                            tipoAplicacion === "TODA_LA_ORDEN"
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          <Layers className="h-3.5 w-3.5" />
                        </div>
                        <span
                          className={`h-4 w-4 rounded-full flex items-center justify-center transition-all ${
                            tipoAplicacion === "TODA_LA_ORDEN"
                              ? "bg-emerald-600 text-white"
                              : "border-2 border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {tipoAplicacion === "TODA_LA_ORDEN" && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="font-display font-black text-xs text-foreground tracking-tight">
                          Toda la orden
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                          Subtotal completo
                        </div>
                      </div>
                    </button>

                    {/* POR CATEGORÍA */}
                    <button
                      type="button"
                      onClick={() => setTipoAplicacion("POR_CATEGORIA")}
                      className={`p-2.5 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between min-h-[88px] ${
                        tipoAplicacion === "POR_CATEGORIA"
                          ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 shadow-xs ring-2 ring-emerald-500/20"
                          : "border-slate-200 dark:border-slate-800 bg-card hover:bg-slate-50 dark:hover:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div
                          className={`h-7 w-7 rounded-xl flex items-center justify-center transition-colors ${
                            tipoAplicacion === "POR_CATEGORIA"
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          <Tag className="h-3.5 w-3.5" />
                        </div>
                        <span
                          className={`h-4 w-4 rounded-full flex items-center justify-center transition-all ${
                            tipoAplicacion === "POR_CATEGORIA"
                              ? "bg-emerald-600 text-white"
                              : "border-2 border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {tipoAplicacion === "POR_CATEGORIA" && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="font-display font-black text-xs text-foreground tracking-tight">
                          Por Categoría
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                          Ej. Edredones, Camisas...
                        </div>
                      </div>
                    </button>

                    {/* POR SERVICIO */}
                    <button
                      type="button"
                      onClick={() => setTipoAplicacion("POR_SERVICIO")}
                      className={`p-2.5 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between min-h-[88px] ${
                        tipoAplicacion === "POR_SERVICIO"
                          ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 shadow-xs ring-2 ring-emerald-500/20"
                          : "border-slate-200 dark:border-slate-800 bg-card hover:bg-slate-50 dark:hover:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div
                          className={`h-7 w-7 rounded-xl flex items-center justify-center transition-colors ${
                            tipoAplicacion === "POR_SERVICIO"
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          <WashingMachine className="h-3.5 w-3.5" />
                        </div>
                        <span
                          className={`h-4 w-4 rounded-full flex items-center justify-center transition-all ${
                            tipoAplicacion === "POR_SERVICIO"
                              ? "bg-emerald-600 text-white"
                              : "border-2 border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {tipoAplicacion === "POR_SERVICIO" && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="font-display font-black text-xs text-foreground tracking-tight">
                          Por Servicio
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                          Ej. Lavado x Libra, Secado
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* SELECTOR DE CATEGORÍAS */}
                {tipoAplicacion === "POR_CATEGORIA" && (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-border/70 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                        <span>Categorías que reciben descuento</span>
                        <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md">
                          {categoriasSel.length} sel.
                        </span>
                      </Label>
                      <div className="flex items-center gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setCategoriasSel([...categoriasDisponibles])}
                          className="text-emerald-600 hover:underline font-bold cursor-pointer"
                        >
                          Seleccionar todas
                        </button>
                        {categoriasSel.length > 0 && (
                          <>
                            <span>·</span>
                            <button
                              type="button"
                              onClick={() => setCategoriasSel([])}
                              className="text-rose-500 hover:underline font-bold cursor-pointer"
                            >
                              Limpiar
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* BARRA DE BÚSQUEDA DE CATEGORÍAS */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Buscar categoría en catálogo..."
                        value={searchScopeItem}
                        onChange={(e) => setSearchScopeItem(e.target.value)}
                        className="h-8 pl-8 pr-7 text-xs rounded-xl bg-background border-border/70"
                      />
                      {searchScopeItem && (
                        <button
                          type="button"
                          onClick={() => setSearchScopeItem("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground text-xs font-bold cursor-pointer"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {categoriasDisponibles.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground py-2 text-center">
                        No hay categorías registradas en el catálogo.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {categoriasDisponibles
                          .filter((cat) => cat.toLowerCase().includes(searchScopeItem.toLowerCase()))
                          .map((cat) => {
                            const isSel = categoriasSel.includes(cat);
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() =>
                                  setCategoriasSel((prev) =>
                                    prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
                                  )
                                }
                                className={`h-7 px-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border flex items-center gap-1 ${
                                  isSel
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs scale-102"
                                    : "bg-card border-border/70 text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                                }`}
                              >
                                {isSel && <Check className="h-3 w-3 stroke-[3]" />}
                                <span>{cat}</span>
                              </button>
                            );
                          })}
                        {categoriasDisponibles.filter((cat) => cat.toLowerCase().includes(searchScopeItem.toLowerCase())).length === 0 && (
                          <p className="text-[11px] text-muted-foreground py-2 w-full text-center">
                            No se encontraron categorías con "{searchScopeItem}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* SELECTOR DE SERVICIOS */}
                {tipoAplicacion === "POR_SERVICIO" && (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-border/70 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                        <span>Servicios que reciben descuento</span>
                        <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md">
                          {serviciosSel.length} sel.
                        </span>
                      </Label>
                      <div className="flex items-center gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setServiciosSel(servicios.map((s) => s.nombre))}
                          className="text-emerald-600 hover:underline font-bold cursor-pointer"
                        >
                          Seleccionar todos
                        </button>
                        {serviciosSel.length > 0 && (
                          <>
                            <span>·</span>
                            <button
                              type="button"
                              onClick={() => setServiciosSel([])}
                              className="text-rose-500 hover:underline font-bold cursor-pointer"
                            >
                              Limpiar
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* BARRA DE BÚSQUEDA DE SERVICIOS */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Buscar servicio..."
                        value={searchScopeItem}
                        onChange={(e) => setSearchScopeItem(e.target.value)}
                        className="h-8 pl-8 pr-7 text-xs rounded-xl bg-background border-border/70"
                      />
                      {searchScopeItem && (
                        <button
                          type="button"
                          onClick={() => setSearchScopeItem("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground text-xs font-bold cursor-pointer"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {servicios.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground py-2 text-center">
                        No hay servicios registrados en el catálogo.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {servicios
                          .filter((srv) => srv.nombre.toLowerCase().includes(searchScopeItem.toLowerCase()))
                          .map((srv) => {
                            const isSel = serviciosSel.includes(srv.nombre);
                            return (
                              <button
                                key={srv.id}
                                type="button"
                                onClick={() =>
                                  setServiciosSel((prev) =>
                                    prev.includes(srv.nombre)
                                      ? prev.filter((s) => s !== srv.nombre)
                                      : [...prev, srv.nombre],
                                  )
                                }
                                className={`h-7 px-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border flex items-center gap-1 ${
                                  isSel
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs scale-102"
                                    : "bg-card border-border/70 text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                                }`}
                              >
                                {isSel && <Check className="h-3 w-3 stroke-[3]" />}
                                <span>{srv.nombre}</span>
                              </button>
                            );
                          })}
                        {servicios.filter((srv) => srv.nombre.toLowerCase().includes(searchScopeItem.toLowerCase())).length === 0 && (
                          <p className="text-[11px] text-muted-foreground py-2 w-full text-center">
                            No se encontraron servicios con "{searchScopeItem}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: DÍAS Y CONDICIONES */}
            {formStep === 3 && (
              <div className="space-y-3">
                {/* DÍAS DE LA SEMANA */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-[11px] font-bold">Días de la semana en que aplica</Label>
                    <div className="flex items-center gap-1.5 text-[9.5px]">
                      <button
                        type="button"
                        onClick={() => setDiasSemana([0, 1, 2, 3, 4, 5, 6])}
                        className="text-emerald-600 hover:underline font-bold cursor-pointer"
                      >
                        Todos
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => setDiasSemana([1, 2, 3, 4, 5])}
                        className="text-emerald-600 hover:underline font-bold cursor-pointer"
                      >
                        Lun-Vie
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => setDiasSemana([6, 0])}
                        className="text-emerald-600 hover:underline font-bold cursor-pointer"
                      >
                        Fines de semana
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {DIAS_SEMANA.map((dia) => {
                      const isSel = diasSemana.includes(dia.id);
                      return (
                        <button
                          key={dia.id}
                          type="button"
                          onClick={() => toggleDia(dia.id)}
                          className={`h-8.5 rounded-lg text-[11px] font-black flex items-center justify-center transition-all cursor-pointer border ${
                            isSel
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                              : "bg-card border-border/70 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <span>{dia.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* CONDICIONES DE MÍNIMOS */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <Label className="text-[11px] font-bold">Mínimo de prendas (opcional)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0 = Sin mínimo"
                      value={minPiezas || ""}
                      onChange={(e) => setMinPiezas(parseInt(e.target.value) || 0)}
                      className="mt-1 h-8 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-bold">Mínimo de subtotal RD$ (opcional)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0 = Sin mínimo"
                      value={minSubtotal || ""}
                      onChange={(e) => setMinSubtotal(parseFloat(e.target.value) || 0)}
                      className="mt-1 h-8 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* VIGENCIA (FECHAS) */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <Label className="text-[11px] font-bold">Fecha inicio (opcional)</Label>
                    <Input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="mt-1 h-8 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-bold">Fecha fin (opcional)</Label>
                    <Input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="mt-1 h-8 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* CÓDIGO DE CUPÓN (OPCIONAL) */}
                <div>
                  <Label className="text-[11px] font-bold">Código de cupón (opcional)</Label>
                  <Input
                    placeholder="EJ. BIENVENIDA10, VERANO2026 (VACÍO = AUTOMÁTICA)"
                    value={codigoCupon}
                    onChange={(e) => setCodigoCupon(e.target.value.toUpperCase())}
                    className="mt-1 h-8 rounded-lg text-xs uppercase font-mono font-bold"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    Si ingresas un cupón, el cajero deberá introducir este código para aplicarlo.
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border pt-2.5 gap-2">
            {formStep > 1 && (
              <Button
                variant="outline"
                onClick={() => setFormStep((s) => (s - 1) as any)}
                className="h-8.5 rounded-lg text-xs font-bold cursor-pointer"
              >
                Anterior
              </Button>
            )}

            {formStep < 3 ? (
              <Button
                onClick={() => setFormStep((s) => (s + 1) as any)}
                className="h-8.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white ml-auto cursor-pointer gap-1"
              >
                <span>Siguiente</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                onClick={handleGuardar}
                className="h-8.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white ml-auto cursor-pointer shadow-sm"
              >
                {editingPromo ? "Guardar Cambios" : "Crear Promoción"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ALERT ELIMINAR */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-3xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              ¿Eliminar promoción?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Esta acción eliminará permanentemente la promoción{" "}
              <strong className="text-foreground">{deleteTarget?.nombre}</strong>. Las órdenes ya registradas con esta
              promoción conservarán su descuento histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl font-bold text-xs h-9">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="rounded-xl font-black text-xs h-9 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
