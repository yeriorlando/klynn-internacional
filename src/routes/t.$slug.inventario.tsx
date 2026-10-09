import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Boxes,
  ArrowRight,
  ShoppingCart,
  Clock,
  Sparkles,
  ArrowUpDown,
  DollarSign,
  Tag,
  SlidersHorizontal,
  ChevronDown,
  X,
  PackageCheck,
  Percent,
} from "lucide-react";
import {
  getArticulos,
  saveArticulo,
  deleteArticulo,
  ajustarStockArticulo,
  formatRD,
  getActiveTenantLocalization,
  type ArticuloInventario,
  type Orden,
} from "@/lib/storage";
import { useArticulos, useOrdenes } from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/t/$slug/inventario")({
  component: InventarioPage,
});

import { ArticuloIcon, ARTICULO_ICONS } from "@/lib/articulo-icon";

function InventarioPage() {
  const user = useRequireAuth();
  const queryClient = useQueryClient();
  const tenantId = user?.tenant?.id ?? "";
  const tenant = user?.tenant;
  const loc = getActiveTenantLocalization();
  const currencySymbol = tenant?.moneda_simbolo || loc.moneda_simbolo || "RD$";

  const { data: articulos = [], isLoading, isRefetching } = useArticulos(tenantId);
  const { data: ordenes = [] } = useOrdenes(tenantId);

  // Estados de interfaz
  const [search, setSearch] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState("TODAS");
  const [stockFiltro, setStockFiltro] = useState<"TODOS" | "BAJO" | "AGOTADOS">("TODOS");

  // Modal Crear / Editar
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArticulo, setEditingArticulo] = useState<ArticuloInventario | null>(null);

  // Modal Ajuste Rápido de Stock
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockTarget, setStockTarget] = useState<ArticuloInventario | null>(null);
  const [nuevoStockInput, setNuevoStockInput] = useState<number>(0);

  // Modal Confirmar Eliminar
  const [deleteTarget, setDeleteTarget] = useState<ArticuloInventario | null>(null);

  // Modal Desglose Ventas del Día
  const [showVentasDiaModal, setShowVentasDiaModal] = useState(false);

  // Formulario de artículo
  const [formData, setFormData] = useState<{
    nombre: string;
    categoria: string;
    icono: string;
    costo: number;
    precio: number;
    stock: number;
    stock_minimo: number;
    codigo_barra: string;
    descripcion: string;
    activo: boolean;
  }>({
    nombre: "",
    categoria: "General",
    icono: "tag",
    costo: 0,
    precio: 0,
    stock: 0,
    stock_minimo: 3,
    codigo_barra: "",
    descripcion: "",
    activo: true,
  });

  // Ventas de Artículos del Día (calculadas a partir de órdenes creadas hoy)
  const ventasHoy = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const ordenesHoy = ordenes.filter((o) => {
      const fecha = (o.creado_en || "").slice(0, 10);
      return fecha === todayStr && o.estado !== "ANULADA";
    });

    let totalRecaudado = 0;
    let unidadesVendidas = 0;
    let costoTotal = 0;
    const desgloseArticulos: {
      articulo_id?: string;
      nombre: string;
      cantidad: number;
      precio_unitario: number;
      costo_unitario: number;
      total: number;
      orden_numero: string;
      hora: string;
    }[] = [];

    ordenesHoy.forEach((ord) => {
      (ord.items || []).forEach((it) => {
        if (it.es_articulo || (it.notas && it.notas.includes("Artículo"))) {
          const cant = Number(it.cantidad || 1);
          const precio = Number(it.precio_unitario || 0);
          const costo = Number(it.costo_unitario || 0);
          const subtotal = cant * precio;

          totalRecaudado += subtotal;
          unidadesVendidas += cant;
          costoTotal += cant * costo;

          desgloseArticulos.push({
            articulo_id: it.articulo_id,
            nombre: it.descripcion,
            cantidad: cant,
            precio_unitario: precio,
            costo_unitario: costo,
            total: subtotal,
            orden_numero: ord.numero,
            hora: ord.creado_en ? new Date(ord.creado_en).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--",
          });
        }
      });
    });

    const gananciaEstimada = totalRecaudado - costoTotal;

    return {
      totalRecaudado,
      unidadesVendidas,
      gananciaEstimada,
      desgloseArticulos,
      ordenesConArticulosCount: ordenesHoy.filter((o) =>
        (o.items || []).some((it) => it.es_articulo || (it.notas && it.notas.includes("Artículo")))
      ).length,
    };
  }, [ordenes]);

  // KPIs de inventario
  const kpis = useMemo(() => {
    const totalArticulos = articulos.length;
    let valorCosto = 0;
    let valorVenta = 0;
    let agotados = 0;
    let bajoStock = 0;

    articulos.forEach((art) => {
      const stock = Number(art.stock || 0);
      valorCosto += stock * Number(art.costo || 0);
      valorVenta += stock * Number(art.precio || 0);

      if (stock <= 0) {
        agotados++;
      } else if (stock <= Number(art.stock_minimo || 3)) {
        bajoStock++;
      }
    });

    return {
      totalArticulos,
      valorCosto,
      valorVenta,
      agotados,
      bajoStock,
    };
  }, [articulos]);

  // Categorías presentes
  const categoriasPresentes = useMemo(() => {
    const set = new Set<string>();
    articulos.forEach((a) => {
      if (a.categoria) set.add(a.categoria);
    });
    return Array.from(set);
  }, [articulos]);

  // Filtrado de artículos
  const articulosFiltrados = useMemo(() => {
    return articulos.filter((a) => {
      // Filtro texto
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchName = a.nombre.toLowerCase().includes(query);
        const matchCat = (a.categoria || "").toLowerCase().includes(query);
        const matchCode = (a.codigo_barra || "").toLowerCase().includes(query);
        if (!matchName && !matchCat && !matchCode) return false;
      }

      // Filtro categoría
      if (selectedCategoria !== "TODAS" && a.categoria !== selectedCategoria) {
        return false;
      }

      // Filtro stock
      if (stockFiltro === "AGOTADOS" && Number(a.stock || 0) > 0) return false;
      if (stockFiltro === "BAJO") {
        const stock = Number(a.stock || 0);
        const min = Number(a.stock_minimo || 3);
        if (stock <= 0 || stock > min) return false;
      }

      return true;
    });
  }, [articulos, search, selectedCategoria, stockFiltro]);

  function abrirNuevoArticulo() {
    setEditingArticulo(null);
    setFormData({
      nombre: "",
      categoria: "General",
      icono: "tag",
      costo: 0,
      precio: 0,
      stock: 10,
      stock_minimo: 3,
      codigo_barra: "",
      descripcion: "",
      activo: true,
    });
    setModalOpen(true);
  }

  function abrirEditarArticulo(art: ArticuloInventario) {
    setEditingArticulo(art);
    setFormData({
      nombre: art.nombre,
      categoria: art.categoria || "General",
      icono: art.icono || "tag",
      costo: Number(art.costo || 0),
      precio: Number(art.precio || 0),
      stock: Number(art.stock || 0),
      stock_minimo: Number(art.stock_minimo ?? 3),
      codigo_barra: art.codigo_barra || "",
      descripcion: art.descripcion || "",
      activo: art.activo !== false,
    });
    setModalOpen(true);
  }

  function abrirAjusteStock(art: ArticuloInventario) {
    setStockTarget(art);
    setNuevoStockInput(Number(art.stock || 0));
    setStockModalOpen(true);
  }

  async function handleGuardarArticulo(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast.error("Por favor ingresa el nombre del artículo");
      return;
    }
    if (formData.precio <= 0) {
      toast.error("El precio de venta debe ser mayor a 0");
      return;
    }

    try {
      const artId = editingArticulo ? editingArticulo.id : `art-${Date.now()}`;
      const payload: ArticuloInventario = {
        id: artId,
        tenant_id: tenantId,
        nombre: formData.nombre.trim(),
        categoria: formData.categoria.trim() || "General",
        icono: formData.icono.trim() || "tag",
        costo: Number(formData.costo || 0),
        precio: Number(formData.precio || 0),
        stock: Number(formData.stock || 0),
        stock_minimo: Number(formData.stock_minimo || 0),
        codigo_barra: formData.codigo_barra.trim() || undefined,
        descripcion: formData.descripcion.trim() || undefined,
        activo: formData.activo,
        creado_en: editingArticulo?.creado_en || new Date().toISOString(),
        actualizado_en: new Date().toISOString(),
      };

      await saveArticulo(payload);
      queryClient.invalidateQueries({ queryKey: ["articulos", tenantId] });
      setModalOpen(false);
      toast.success(editingArticulo ? "Artículo actualizado correctamente" : "Artículo registrado con éxito");
    } catch (err: any) {
      toast.error("Error al guardar artículo: " + (err?.message || "Inténtalo nuevamente"));
    }
  }

  async function handleConfirmarAjusteStock() {
    if (!stockTarget) return;
    try {
      await ajustarStockArticulo(tenantId, stockTarget.id, nuevoStockInput);
      queryClient.invalidateQueries({ queryKey: ["articulos", tenantId] });
      setStockModalOpen(false);
      toast.success(`Stock de "${stockTarget.nombre}" actualizado a ${nuevoStockInput} unidades`);
    } catch (err: any) {
      toast.error("Error al actualizar stock: " + (err?.message || "Inténtalo nuevamente"));
    }
  }

  async function handleConfirmarEliminar() {
    if (!deleteTarget) return;
    try {
      await deleteArticulo(tenantId, deleteTarget.id);
      queryClient.invalidateQueries({ queryKey: ["articulos", tenantId] });
      setDeleteTarget(null);
      toast.success("Artículo eliminado del catálogo de inventario");
    } catch (err: any) {
      toast.error("Error al eliminar artículo: " + (err?.message || "Inténtalo de nuevo"));
    }
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Inventario y Artículos"
          description="Administra los productos de venta comercial, existencias y seguimiento de ventas del día."
        />

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["articulos", tenantId] })}
            className="h-10 px-3.5 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer gap-2"
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 text-slate-500 ${isRefetching ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>

          <Button
            onClick={abrirNuevoArticulo}
            className="h-10 px-4 rounded-xl bg-[#1B4B73] hover:bg-[#1B4B73]/90 text-white font-bold text-xs shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer gap-2"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Nuevo Artículo</span>
          </Button>
        </div>
      </div>

      {/* Grid de Resumen & KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Ventas de Artículos del Día */}
        <Card
          onClick={() => setShowVentasDiaModal(true)}
          className="p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/20 dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 shadow-sm cursor-pointer hover:border-emerald-500 transition-all group"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              Ventas de Hoy
            </span>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ShoppingCart className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-black text-slate-900 dark:text-white">
              {formatRD(ventasHoy.totalRecaudado)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{ventasHoy.unidadesVendidas} unidades vendidas</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center gap-0.5">
              Ver detalle <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </Card>

        {/* KPI 2: Total Artículos Registrados */}
        <Card className="p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Artículos
            </span>
            <div className="h-9 w-9 rounded-xl bg-[#1B4B73]/10 text-[#1B4B73] dark:text-sky-400 flex items-center justify-center">
              <Package className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-black text-slate-900 dark:text-white">
              {kpis.totalArticulos}
            </span>
            <span className="text-xs text-muted-foreground font-semibold">productos</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground truncate">
            En {categoriasPresentes.length} categorías activas
          </p>
        </Card>

        {/* KPI 3: Valoración Total del Inventario */}
        <Card className="p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Valor de Existencias
            </span>
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <DollarSign className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-black text-slate-900 dark:text-white">
              {formatRD(kpis.valorVenta)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Costo base: <strong className="font-bold text-slate-700 dark:text-slate-300">{formatRD(kpis.valorCosto)}</strong>
          </p>
        </Card>

        {/* KPI 4: Alertas de Stock Bajo / Agotados */}
        <Card
          onClick={() => {
            if (kpis.agotados > 0) setStockFiltro(stockFiltro === "AGOTADOS" ? "TODOS" : "AGOTADOS");
            else if (kpis.bajoStock > 0) setStockFiltro(stockFiltro === "BAJO" ? "TODOS" : "BAJO");
          }}
          className={`p-5 rounded-2xl border shadow-xs transition-all cursor-pointer ${
            kpis.agotados > 0
              ? "border-rose-400/50 bg-rose-50/40 dark:bg-rose-950/20 hover:border-rose-500"
              : kpis.bajoStock > 0
                ? "border-amber-400/50 bg-amber-50/40 dark:bg-amber-950/20 hover:border-amber-500"
                : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Alertas de Stock
            </span>
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                kpis.agotados > 0
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                  : kpis.bajoStock > 0
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : "bg-emerald-500/10 text-emerald-600"
              }`}
            >
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-black text-slate-900 dark:text-white">
              {kpis.agotados + kpis.bajoStock}
            </span>
            <span className="text-xs text-muted-foreground font-semibold">por reabastecer</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs">
            {kpis.agotados > 0 && (
              <span className="text-rose-600 font-black font-mono">{kpis.agotados} agotados</span>
            )}
            {kpis.bajoStock > 0 && (
              <span className="text-amber-600 dark:text-amber-400 font-bold">{kpis.bajoStock} bajo stock</span>
            )}
            {kpis.agotados === 0 && kpis.bajoStock === 0 && (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Stock saludable
              </span>
            )}
          </div>
        </Card>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <Card className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, categoría o código..."
            className="h-10 pl-10 pr-9 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 text-sm font-medium focus-visible:ring-1 focus-visible:ring-[#1B4B73]"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 [scrollbar-width:none]">
          {/* Filtro de Categoría */}
          <select
            value={selectedCategoria}
            onChange={(e) => setSelectedCategoria(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer outline-none focus:ring-1 focus:ring-[#1B4B73]"
          >
            <option value="TODAS">Todas las categorías</option>
            {categoriasPresentes.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Filtro Rápido Stock */}
          <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1 shrink-0">
            <button
              onClick={() => setStockFiltro("TODOS")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                stockFiltro === "TODOS"
                  ? "bg-[#1B4B73] text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStockFiltro("BAJO")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                stockFiltro === "BAJO"
                  ? "bg-amber-500 text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Bajo Stock
            </button>
            <button
              onClick={() => setStockFiltro("AGOTADOS")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                stockFiltro === "AGOTADOS"
                  ? "bg-rose-500 text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Agotados
            </button>
          </div>
        </div>
      </Card>

      {/* Lista de Artículos */}
      {isLoading ? (
        <div className="p-12 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-[#1B4B73] opacity-60 mb-2" />
          <p className="text-sm font-semibold text-slate-500">Cargando inventario...</p>
        </div>
      ) : articulosFiltrados.length === 0 ? (
        <Card className="p-12 text-center rounded-2xl border-dashed border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-[#1B4B73]/10 text-[#1B4B73] dark:text-sky-400 flex items-center justify-center shadow-inner">
            <Tag className="h-8 w-8 stroke-[1.8]" />
          </div>
          <h3 className="font-display font-black text-lg text-slate-900 dark:text-white mb-1">
            {search || selectedCategoria !== "TODAS" || stockFiltro !== "TODOS"
              ? "No se encontraron artículos con estos filtros"
              : "No tienes artículos registrados aún"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mb-5">
            {search || selectedCategoria !== "TODAS" || stockFiltro !== "TODOS"
              ? "Intenta limpiar la búsqueda o cambiar los filtros seleccionados."
              : "Registra productos comerciales como detergentes, suavizantes, bolsas o accesorios para controlar su stock y venderlos en el Punto de Venta."}
          </p>
          <Button
            onClick={abrirNuevoArticulo}
            className="h-10 px-5 rounded-xl bg-[#1B4B73] hover:bg-[#1B4B73]/90 text-white font-bold text-xs shadow-sm cursor-pointer gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Crear primer artículo</span>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {articulosFiltrados.map((art) => {
            const stock = Number(art.stock || 0);
            const stockMin = Number(art.stock_minimo || 3);
            const isAgotado = stock <= 0;
            const isBajo = stock > 0 && stock <= stockMin;
            const margen =
              art.precio > 0 && art.costo > 0
                ? Math.round(((art.precio - art.costo) / art.costo) * 100)
                : 0;

            return (
              <Card
                key={art.id}
                className={`relative overflow-hidden rounded-2xl border bg-white dark:bg-slate-900 p-5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between ${
                  isAgotado
                    ? "border-rose-300 dark:border-rose-900/60"
                    : isBajo
                      ? "border-amber-300 dark:border-amber-900/60"
                      : "border-slate-200/90 dark:border-slate-800"
                }`}
              >
                <div>
                  {/* Top: Icono y Badges */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="h-14 w-14 rounded-2xl bg-[#1B4B73]/10 dark:bg-sky-950/40 border border-[#1B4B73]/15 dark:border-sky-800/30 flex items-center justify-center text-[#1B4B73] dark:text-sky-400 shadow-xs shrink-0 select-none">
                      <ArticuloIcon name={art.icono} className="h-7 w-7 stroke-[1.8]" />
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      {isAgotado ? (
                        <Badge className="bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] px-2 py-0.5 rounded-full">
                          Agotado
                        </Badge>
                      ) : isBajo ? (
                        <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full">
                          Bajo ({stock})
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold text-[10px] px-2 py-0.5 rounded-full">
                          Stock: {stock}
                        </Badge>
                      )}

                      {!art.activo && (
                        <Badge variant="outline" className="text-slate-400 text-[9px] px-1.5 py-0 border-slate-300">
                          Pausado
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Nombre y Categoría */}
                  <div className="space-y-1 mb-3">
                    <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      {art.categoria || "General"}
                    </span>
                    <h4 className="font-display font-black text-base text-slate-900 dark:text-white leading-snug line-clamp-2">
                      {art.nombre}
                    </h4>
                    {art.descripcion && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{art.descripcion}</p>
                    )}
                  </div>

                  {/* Precios & Margen */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 mb-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Precio Venta:</span>
                      <strong className="font-black text-slate-900 dark:text-white text-sm">
                        {formatRD(art.precio)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Costo compra:</span>
                      <span>{formatRD(art.costo)}</span>
                    </div>
                    {margen > 0 && (
                      <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 font-semibold">Margen ganancia:</span>
                        <span className="text-emerald-600 font-black">+{margen}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones de la Tarjeta */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => abrirAjusteStock(art)}
                    className="flex-1 h-8 rounded-xl text-xs font-bold border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer gap-1.5"
                  >
                    <Boxes className="h-3.5 w-3.5 text-[#1B4B73] dark:text-sky-400" />
                    <span>Ajustar Stock</span>
                  </Button>

                  <button
                    type="button"
                    onClick={() => abrirEditarArticulo(art)}
                    title="Editar artículo"
                    className="h-8 w-8 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(art)}
                    title="Eliminar artículo"
                    className="h-8 w-8 rounded-xl border border-slate-200 dark:border-slate-700 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Desglose de Ventas del Día */}
      <Dialog open={showVentasDiaModal} onOpenChange={setShowVentasDiaModal}>
        <DialogContent className="max-w-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-lg font-black text-slate-900 dark:text-white">
              <ShoppingCart className="h-5 w-5 text-emerald-600" />
              <span>Ventas de Artículos de Hoy</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Detalle de artículos comerciales facturados en las órdenes del día de hoy.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-3 my-2">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Total Hoy</span>
              <p className="text-base font-black text-emerald-600">{formatRD(ventasHoy.totalRecaudado)}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Unidades</span>
              <p className="text-base font-black text-slate-900 dark:text-white">{ventasHoy.unidadesVendidas} uds</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Ganancia Est.</span>
              <p className="text-base font-black text-[#1B4B73] dark:text-sky-400">{formatRD(ventasHoy.gananciaEstimada)}</p>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {ventasHoy.desgloseArticulos.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No hay ventas de artículos registradas hoy todavía.
              </p>
            ) : (
              ventasHoy.desgloseArticulos.map((v, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white truncate">{v.nombre}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Orden #{v.orden_numero} · Hora: {v.hora}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-slate-900 dark:text-white">
                      {v.cantidad}x = {formatRD(v.total)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      ({formatRD(v.precio_unitario)} c/u)
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              onClick={() => setShowVentasDiaModal(false)}
              className="h-9 px-4 rounded-xl bg-slate-900 text-white font-bold text-xs"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Ajuste Rápido de Stock */}
      <Dialog open={stockModalOpen} onOpenChange={setStockModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-base font-black text-slate-900 dark:text-white">
              <Boxes className="h-5 w-5 text-[#1B4B73]" />
              <span>Ajustar Stock: {stockTarget?.nombre}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define la nueva cantidad disponible en inventario o suma unidades recibidas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-semibold text-muted-foreground">Stock actual registrado:</span>
              <span className="font-black text-base text-slate-900 dark:text-white">
                {stockTarget?.stock || 0} unidades
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Nuevo stock disponible</Label>
              <Input
                type="number"
                min={0}
                value={nuevoStockInput}
                onChange={(e) => setNuevoStockInput(Math.max(0, Number(e.target.value)))}
                className="h-11 rounded-xl text-center text-lg font-black"
              />
            </div>

            {/* Accesos rápidos de suma */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Sumar rápido:</span>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 20, 50].map((cant) => (
                  <Button
                    key={cant}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNuevoStockInput((prev) => prev + cant)}
                    className="h-8 rounded-lg text-xs font-bold hover:bg-[#1B4B73] hover:text-white transition-all cursor-pointer"
                  >
                    +{cant}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStockModalOpen(false)}
              className="h-9 px-4 rounded-xl text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmarAjusteStock}
              className="h-9 px-5 rounded-xl bg-[#1B4B73] hover:bg-[#1B4B73]/90 text-white font-bold text-xs"
            >
              Guardar Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Crear / Editar Artículo */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-lg font-black text-slate-900 dark:text-white">
              <Package className="h-5 w-5 text-[#1B4B73]" />
              <span>{editingArticulo ? "Editar Artículo" : "Nuevo Artículo de Inventario"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configura los campos básicos del artículo comercial para venta directa.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleGuardarArticulo} className="space-y-4 my-2">
            {/* Nombre y Categoría en DOS COLUMNAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Nombre del artículo *</Label>
                <Input
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej. Detergente Líquido 1L"
                  className="h-10 rounded-xl text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Categoría</Label>
                <Input
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  placeholder="Ej. Detergentes, Accesorios..."
                  className="h-10 rounded-xl text-sm"
                />
              </div>
            </div>

            {/* Selector de Icono del Artículo */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center justify-between">
                <span>Icono del artículo</span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  Por defecto: <strong className="text-primary font-semibold">Etiqueta</strong>
                </span>
              </Label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                {ARTICULO_ICONS.map((item) => {
                  const isSelected = (formData.icono || "tag").toLowerCase() === item.id;
                  const IconComp = item.Icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, icono: item.id })}
                      title={item.label}
                      className={`h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border ${
                        isSelected
                          ? "bg-[#1B4B73] text-white border-[#1B4B73] shadow-xs scale-102"
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#1B4B73]/40"
                      }`}
                    >
                      <IconComp className="h-4.5 w-4.5" />
                      <span className="text-[9px] font-bold leading-none">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Costo y Precio de Venta */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Costo de compra ({currencySymbol})</Label>
                <Input
                  type="number"
                  step="any"
                  min={0}
                  value={formData.costo || ""}
                  onChange={(e) => setFormData({ ...formData, costo: Number(e.target.value) })}
                  placeholder="0.00"
                  className="h-10 rounded-xl font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Precio de venta * ({currencySymbol})</Label>
                <Input
                  type="number"
                  step="any"
                  min={0}
                  required
                  value={formData.precio || ""}
                  onChange={(e) => setFormData({ ...formData, precio: Number(e.target.value) })}
                  placeholder="0.00"
                  className="h-10 rounded-xl font-bold text-[#1B4B73] dark:text-sky-400"
                />
              </div>
            </div>

            {/* Stock actual y Stock Mínimo */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Cantidad / Stock inicial *</Label>
                <Input
                  type="number"
                  min={0}
                  required
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                  className="h-10 rounded-xl font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Alerta Stock mínimo</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.stock_minimo}
                  onChange={(e) => setFormData({ ...formData, stock_minimo: Number(e.target.value) })}
                  className="h-10 rounded-xl font-bold"
                />
              </div>
            </div>

            {/* Código de barra opcional */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Código de barra / SKU (Opcional)</Label>
              <Input
                value={formData.codigo_barra}
                onChange={(e) => setFormData({ ...formData, codigo_barra: e.target.value })}
                placeholder="Ej. 746123456789"
                className="h-10 rounded-xl text-sm font-mono"
              />
            </div>

            {/* Switch Activo para venta */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Disponible para la venta</p>
                <p className="text-[11px] text-muted-foreground">
                  Se mostrará en la pestaña de Artículos de /nueva-orden.
                </p>
              </div>
              <Switch
                checked={formData.activo}
                onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="h-10 px-4 rounded-xl text-xs font-bold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="h-10 px-5 rounded-xl bg-[#1B4B73] hover:bg-[#1B4B73]/90 text-white font-bold text-xs"
              >
                {editingArticulo ? "Guardar Cambios" : "Crear Artículo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Eliminar */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-black text-slate-900 dark:text-white">
              ¿Eliminar "{deleteTarget?.nombre}"?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Esta acción quitará este artículo del inventario y del catálogo de venta rápida en el Punto de Venta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarEliminar}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
