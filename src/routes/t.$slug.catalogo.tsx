import { createFileRoute } from "@tanstack/react-router";
import { compressImage } from "@/lib/compressImage";
import { useMemo, useState, useEffect } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Shirt,
  Image as ImageIcon,
  PackagePlus,
  Search,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Check,
  X,
  Tag,
  Wrench,
  FileSpreadsheet,
  Download,
  Upload,
  Scale,
  Receipt,
  Layers,
  SlidersHorizontal,
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getCatalogo,
  saveCatalogoItem,
  deleteCatalogoItem,
  getServicios,
  saveServicio,
  deleteServicio,
  formatRD,
  formatAmountInput,
  uid,
  type CatalogoItem,
  type Servicio,
} from "@/lib/storage";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabase";
import { useCatalogo, useServicios } from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";
import { exportCatalogToExcel } from "@/lib/excel-catalog";
import { ExcelImportModal } from "@/components/klynn/ExcelImportModal";

const LAUNDRY_ICONS = [
  { char: "👕", label: "Camisa" },
  { char: "👔", label: "Corbata" },
  { char: "👖", label: "Pantalón" },
  { char: "👗", label: "Vestido" },
  { char: "👚", label: "Blusa" },
  { char: "🧥", label: "Chaqueta" },
  { char: "🤵", label: "Traje" },
  { char: "🛏️", label: "Sábana" },
  { char: "🛌", label: "Edredón" },
  { char: "🛋️", label: "Funda" },
  { char: "🧻", label: "Toalla" },
  { char: "🧖", label: "Bata" },
  { char: "🍽️", label: "Mantel" },
  { char: "🪟", label: "Cortina" },
  { char: "🧶", label: "Frazada" },
  { char: "⚖️", label: "Libra" },
  { char: "🎒", label: "Mochila" },
  { char: "🥼", label: "Médico" },
  { char: "🥻", label: "Kimono" },
  { char: "🩲", label: "Interior" },
  { char: "🧦", label: "Medias" },
  { char: "🧣", label: "Bufanda" },
  { char: "🧢", label: "Gorra" },
  { char: "👟", label: "Tenis" },
  { char: "👶", label: "Bebé" },
  { char: "🧸", label: "Manta" },
  { char: "🧺", label: "Lavado" },
  { char: "💧", label: "Agua" },
  { char: "🌬️", label: "Secado" },
  { char: "♨️", label: "Plancha" },
  { char: "✨", label: "Seco" },
  { char: "🪡", label: "Costura" },
  { char: "🧼", label: "Jabón" },
  { char: "🧴", label: "Suavizante" },
];

export const Route = createFileRoute("/t/$slug/catalogo")({
  component: CatalogoPage,
});

function CatalogoPage() {
  const user = useRequireAuth();
  const queryClient = useQueryClient();
  const tenantId = user?.tenant.id ?? "";

  const { data: items = [], isLoading: loadingItems } = useCatalogo(tenantId);
  const { data: servicios = [], isLoading: loadingServicios } = useServicios(tenantId);

  const [seeding, setSeeding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [editItem, setEditItem] = useState<CatalogoItem | null>(null);
  const [openItem, setOpenItem] = useState(false);
  const [editServ, setEditServ] = useState<Servicio | null>(null);
  const [openServ, setOpenServ] = useState(false);
  const [openExcelImport, setOpenExcelImport] = useState(false);

  // Sincronización automática desactivada, manejada por DB Triggers

  const [tab, setTab] = useState<string>("prendas");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlTab = new URLSearchParams(window.location.search).get("tab");
      if (urlTab && (urlTab === "prendas" || urlTab === "servicios")) {
        setTab(urlTab);
      }
    }
  }, []);

  const handleTabChange = (val: string) => {
    setTab(val);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", val);
      window.history.pushState({}, "", url.toString());
    }
  };

  const loading = loadingItems || loadingServicios;

  if (!user || user.tenant.id === "__loading__" || (loading && items.length === 0)) {
    return <GlobalPageLoader text="Cargando catálogo..." />;
  }

  const filteredItems = items.filter(
    (i) =>
      i.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.categoria.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredServicios = servicios.filter(
    (s) =>
      s.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.descripcion && s.descripcion.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const categorias = Array.from(new Set(filteredItems.map((i) => i.categoria))).sort();

  return (
    <div className="w-full mx-auto max-w-6xl">
      <PageHeader
        title="Catálogo"
        description="Gestiona prendas, precios y servicios disponibles para tu lavandería."
      />

      <Tabs value={tab} onValueChange={handleTabChange} className="mt-2">
        <TabsList className="flex items-center gap-2 sm:gap-2.5 bg-transparent p-0 border-none h-auto justify-start mb-6">
          <TabsTrigger
            value="prendas"
            className="flex items-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-surface border border-border/80 text-foreground shadow-xs data-[state=active]:bg-[#1B4B73] data-[state=active]:text-white data-[state=active]:border-[#1B4B73] data-[state=active]:shadow-md transition-all hover:bg-muted/60 cursor-pointer shrink-0"
          >
            <Shirt className={`h-4 w-4 shrink-0 transition-colors ${tab === "prendas" ? "text-[#F0B900]" : "text-[#1B4B73] dark:text-sky-400"}`} />
            <span>Prendas</span>
            <span className={`ml-0.5 rounded-full px-2 py-0.5 text-[10px] font-black leading-none ${tab === "prendas" ? "bg-white/20 text-white" : "bg-[#1B4B73]/10 text-[#1B4B73] dark:bg-sky-950 dark:text-sky-300"}`}>
              {items.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="servicios"
            className="flex items-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-surface border border-border/80 text-foreground shadow-xs data-[state=active]:bg-[#1B4B73] data-[state=active]:text-white data-[state=active]:border-[#1B4B73] data-[state=active]:shadow-md transition-all hover:bg-muted/60 cursor-pointer shrink-0"
          >
            <Layers className={`h-4 w-4 shrink-0 transition-colors ${tab === "servicios" ? "text-[#F0B900]" : "text-[#1B4B73] dark:text-sky-400"}`} />
            <span>Servicios</span>
            <span className={`ml-0.5 rounded-full px-2 py-0.5 text-[10px] font-black leading-none ${tab === "servicios" ? "bg-white/20 text-white" : "bg-[#1B4B73]/10 text-[#1B4B73] dark:bg-sky-950 dark:text-sky-300"}`}>
              {servicios.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* PRENDAS */}
        <TabsContent value="prendas">
          <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">
              {items.length} prendas · {categorias.length} categorías
            </p>
            <div className="flex flex-1 items-center gap-2 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar prendas o categorías..."
                  className="pl-9 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-xs sm:text-sm font-medium focus-visible:ring-primary shadow-2xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                type="button"
                onClick={() => exportCatalogToExcel(items, servicios, user.tenant.nombre)}
                className="flex items-center gap-2 rounded-xl h-10 px-4 font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
                title="Descargar catálogo actual en Excel"
              >
                <Download className="h-4 w-4 text-[#F0B900] shrink-0" />
                <span>Exportar Excel</span>
              </Button>
              <Button
                type="button"
                onClick={() => setOpenExcelImport(true)}
                className="flex items-center gap-2 rounded-xl h-10 px-4 font-bold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
                title="Importar o actualizar catálogo desde archivo Excel"
              >
                <Upload className="h-4 w-4 text-white shrink-0" />
                <span>Importar Excel</span>
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setEditItem(null);
                  setOpenItem(true);
                }}
                className="flex items-center gap-2 rounded-xl h-10 px-5 font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
              >
                <Plus className="h-4 w-4 text-[#F0B900] shrink-0" />
                <span>Nueva prenda</span>
              </Button>
            </div>
          </div>

          {categorias.length === 0 && (
            <Card className="p-12 text-center text-muted-foreground bg-card border-dashed rounded-2xl">
              No hay prendas registradas. Agrega la primera prenda a tu catálogo.
            </Card>
          )}

          {categorias.map((cat) => (
            <div key={cat} className="mb-8">
              <div className="flex items-center gap-2 mb-3.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                <h3 className="font-display font-black text-lg tracking-tight">{cat}</h3>
                <span className="text-xs font-bold text-muted-foreground">
                  ({filteredItems.filter((i) => i.categoria === cat).length})
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                {filteredItems
                  .filter((i) => i.categoria === cat)
                  .map((it) => {
                    const rawSrvPrices = it.precios_servicios && typeof it.precios_servicios === "object"
                      ? it.precios_servicios
                      : {};
                    const srvMap = new Map<string, number>();
                    Object.entries(rawSrvPrices).forEach(([k, p]) => {
                      const num = Number(p);
                      if (num > 0) {
                        const srvObj = servicios.find((s) => s.id === k || s.nombre.toLowerCase() === k.toLowerCase());
                        const name = srvObj ? srvObj.nombre : k;
                        // Si la clave es un UUID crudo y no encuentra servicio, omitirlo
                        if (!srvObj && k.length > 20 && k.includes("-")) {
                          return;
                        }
                        srvMap.set(name, num);
                      }
                    });
                    const srvPrices = Array.from(srvMap.entries());
                    const hasSrvPrices = srvPrices.length > 0;

                    return (
                      <Card
                        key={it.id}
                        className="bg-card border border-slate-200/90 dark:border-slate-800/90 hover:border-primary/50 rounded-3xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between relative group"
                      >
                        <div>
                          {/* Top Header: Prominent Garment Image & Full Title */}
                          <div className="flex items-start gap-3.5">
                            <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center shrink-0 overflow-hidden text-3xl sm:text-4xl shadow-xs group-hover:scale-105 transition-transform duration-300">
                              {it.imagen_url ? (
                                <img
                                  src={it.imagen_url}
                                  alt={it.nombre}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span>{it.icono || "👕"}</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-display font-black text-base sm:text-lg text-foreground tracking-tight leading-snug line-clamp-2" title={it.nombre}>
                                {it.nombre}
                              </h4>
                              {it.descripcion ? (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed" title={it.descripcion}>
                                  {it.descripcion}
                                </p>
                              ) : null}
                              {/* Status Badges */}
                              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                {it.es_muestra && (
                                  <Badge className="bg-primary text-[9px] h-4 px-1.5 border-none text-white uppercase font-black tracking-wider">
                                    Muestra
                                  </Badge>
                                )}
                                {!it.activo && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] h-4 px-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold"
                                  >
                                    Inactivo
                                  </Badge>
                                )}
                                {it.por_libra && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] h-4 px-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-bold"
                                  >
                                    Por Libra
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Precios por Servicio (Matriz Destacada SGL) */}
                          <div className="my-4.5 space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            {hasSrvPrices ? (
                              srvPrices.map(([srvName, srvPrice]) => (
                                <div key={srvName} className="space-y-0.5">
                                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
                                    {srvName}
                                  </span>
                                  <span className="text-lg sm:text-xl font-black font-display text-foreground tracking-tight block">
                                    {formatRD(srvPrice)}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="space-y-0.5">
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
                                  Precio General
                                </span>
                                <span className="text-lg sm:text-xl font-black font-display text-foreground tracking-tight block">
                                  {formatRD(it.precio)}
                                  {it.por_libra ? (
                                    <span className="text-sm font-semibold text-muted-foreground ml-1">/lb</span>
                                  ) : null}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Footer Action Buttons (Matching Image 2 SGL) */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 rounded-2xl h-10 text-xs font-bold gap-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs cursor-pointer text-slate-800 dark:text-slate-200"
                            onClick={() => {
                              setEditItem(it);
                              setOpenItem(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                            <span>Editar</span>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-10 w-12 p-0 rounded-2xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 shadow-2xs cursor-pointer shrink-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-2xl border-none shadow-card">
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar {it.nombre}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción eliminará permanentemente esta prenda del catálogo.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={async () => {
                                    await deleteCatalogoItem(it.id);
                                    queryClient.invalidateQueries({ queryKey: ["catalogo", tenantId] });
                                    toast.success("Prenda eliminada");
                                  }}
                                  className="bg-destructive hover:bg-destructive/90 text-white rounded-xl font-bold"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </Card>
                    );
                  })}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* SERVICIOS */}
        <TabsContent value="servicios">
          <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">
              {filteredServicios.length} servicios disponibles
            </p>
            <div className="flex flex-1 items-center gap-2 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar servicios..."
                  className="pl-9 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-xs sm:text-sm font-medium focus-visible:ring-primary shadow-2xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                type="button"
                onClick={() => exportCatalogToExcel(items, servicios, user.tenant.nombre)}
                className="flex items-center gap-2 rounded-xl h-10 px-4 font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
                title="Descargar catálogo actual en Excel"
              >
                <Download className="h-4 w-4 text-[#F0B900] shrink-0" />
                <span>Exportar Excel</span>
              </Button>
              <Button
                type="button"
                onClick={() => setOpenExcelImport(true)}
                className="flex items-center gap-2 rounded-xl h-10 px-4 font-bold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
                title="Importar o actualizar catálogo desde archivo Excel"
              >
                <Upload className="h-4 w-4 text-white shrink-0" />
                <span>Importar Excel</span>
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setEditServ(null);
                  setOpenServ(true);
                }}
                className="flex items-center gap-2 rounded-xl h-10 px-5 font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-xs cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shrink-0"
              >
                <Plus className="h-4 w-4 text-[#F0B900] shrink-0" />
                <span>Nuevo servicio</span>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
            {filteredServicios.map((s) => (
              <Card
                key={s.id}
                className="bg-card border border-slate-200/90 dark:border-slate-800/90 hover:border-primary/50 rounded-3xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between relative group"
              >
                <div>
                  {/* Top Header: Prominent Service Image & Full Title */}
                  <div className="flex items-start gap-3.5">
                    <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center shrink-0 overflow-hidden text-3xl sm:text-4xl shadow-xs group-hover:scale-105 transition-transform duration-300">
                      {s.imagen_url ? (
                        <img
                          src={s.imagen_url}
                          alt={s.nombre}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{s.icono || "🧺"}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-display font-black text-base sm:text-lg text-foreground tracking-tight leading-snug line-clamp-2" title={s.nombre}>
                        {s.nombre}
                      </h4>
                      {s.descripcion ? (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed" title={s.descripcion}>
                          {s.descripcion}
                        </p>
                      ) : null}
                      {/* Status Badges */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {s.es_muestra && (
                          <Badge className="bg-primary text-[9px] h-4 px-1.5 border-none text-white uppercase font-black tracking-wider">
                            Muestra
                          </Badge>
                        )}
                        {!s.activo && (
                          <Badge
                            variant="outline"
                            className="text-[9px] h-4 px-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold"
                          >
                            Inactivo
                          </Badge>
                        )}
                        {s.por_libra && (
                          <Badge
                            variant="outline"
                            className="text-[9px] h-4 px-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-bold"
                          >
                            Por Libra
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tarifa Base */}
                  <div className="my-4.5 space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
                      Tarifa Base del Servicio
                    </span>
                    <span className="text-lg sm:text-xl font-black font-display text-foreground tracking-tight block">
                      {s.precio > 0 ? (
                        <>
                          {formatRD(s.precio)}
                          {s.por_libra ? (
                            <span className="text-sm font-semibold text-muted-foreground ml-1">/lb</span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground">Variable / Sin costo</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 rounded-2xl h-10 text-xs font-bold gap-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs cursor-pointer text-slate-800 dark:text-slate-200"
                    onClick={() => {
                      setEditServ(s);
                      setOpenServ(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                    <span>Editar</span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 w-12 p-0 rounded-2xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 shadow-2xs cursor-pointer shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl border-none shadow-card">
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar {s.nombre}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción eliminará permanentemente este servicio del catálogo.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            if (s.tenant_id === "admin") {
                              toast.error("No puedes eliminar servicios de muestra. Desactívalo si no lo usas.");
                              return;
                            }
                            await deleteServicio(s.id);
                            queryClient.invalidateQueries({ queryKey: ["servicios", tenantId] });
                            toast.success("Servicio eliminado");
                          }}
                          className="bg-destructive hover:bg-destructive/90 text-white rounded-xl font-bold"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            ))}
            {servicios.length === 0 && (
              <Card className="col-span-full p-12 text-center text-muted-foreground bg-card border-dashed rounded-2xl">
                No hay servicios registrados aún. Agrega el primer servicio a tu lavandería.
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <ItemDialog
        open={openItem}
        onOpenChange={setOpenItem}
        tenantId={tenantId}
        initial={editItem}
        serviciosList={servicios}
        existingCategories={categorias}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["catalogo", tenantId] });
          setOpenItem(false);
        }}
      />
      <ServDialog
        open={openServ}
        onOpenChange={setOpenServ}
        tenantId={tenantId}
        initial={editServ}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["servicios", tenantId] });
          setOpenServ(false);
        }}
      />
      <ExcelImportModal
        open={openExcelImport}
        onOpenChange={setOpenExcelImport}
        tenantId={tenantId}
        currentPrendas={items}
        currentServicios={servicios}
        tenantName={user?.tenant?.nombre}
      />
    </div>
  );
}

function ItemDialog({
  open,
  onOpenChange,
  tenantId,
  initial,
  onSaved,
  serviciosList = [],
  existingCategories = [],
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tenantId: string;
  initial: CatalogoItem | null;
  onSaved: () => void;
  serviciosList?: Servicio[];
  existingCategories?: string[];
}) {
  const [activeTab, setActiveTab] = useState<"info" | "visual">("info");
  const [f, setF] = useState<Partial<CatalogoItem>>({});
  const [imgError, setImgError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<"emoji" | "image">("emoji");
  const [iconSearch, setIconSearch] = useState("");
  const [showDesc, setShowDesc] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [showTreatmentsModal, setShowTreatmentsModal] = useState(false);
  const [hasFixedPrice, setHasFixedPrice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setActiveTab("info");
      setF(
        initial
          ? {
              ...initial,
              precios_servicios:
                initial.precios_servicios && typeof initial.precios_servicios === "object"
                  ? { ...initial.precios_servicios }
                  : {},
            }
          : {
              categoria: "",
              nombre: "",
              descripcion: "",
              precio: 0,
              precios_servicios: {},
              activo: true,
              icono: "👕",
              is_exento: false,
              por_libra: false,
              es_muestra: false,
              permitir_desglose: false,
              permitir_editar_precio: false,
            },
      );
      setShowDesc(Boolean(initial?.descripcion));
      setMode(initial?.imagen_url ? "image" : "emoji");
      setImgError(false);
      setIconSearch("");
      setServiceSearch("");
      setShowTreatmentsModal(false);
      setHasFixedPrice(Boolean(initial?.precio && Number(initial.precio) > 0));
      setIsSubmitting(false);
    }
  }, [open, initial]);

  const filteredIcons = useMemo(() => {
    if (!iconSearch) return LAUNDRY_ICONS;
    const s = iconSearch.toLowerCase();
    return LAUNDRY_ICONS.filter((i) => i.label.toLowerCase().includes(s));
  }, [iconSearch]);

  const quickCategorySuggestions = useMemo(() => {
    const defaults = ["Camisas", "Pantalones", "Vestidos", "Trajes", "Abrigos", "Ropa de Cama", "Lavandería"];
    const combined = Array.from(new Set([...existingCategories, ...defaults])).filter(Boolean);
    return combined.slice(0, 7);
  }, [existingCategories]);

  const activeServicesCount = useMemo(() => {
    if (!f.precios_servicios || typeof f.precios_servicios !== "object") return 0;
    return Object.keys(f.precios_servicios).filter(
      (k) => (f.precios_servicios?.[k] ?? 0) > 0 && !(k.length > 20 && k.includes("-")),
    ).length;
  }, [f.precios_servicios]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const compressedDataUrl = await compressImage(file, 800, 800, 0.75);
      const res = await fetch(compressedDataUrl);
      const blob = await res.blob();

      const path = `${tenantId}/${uid("img")}.webp`;
      const { error } = await supabase.storage
        .from("catalogo")
        .upload(path, blob, { contentType: "image/webp" });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("catalogo").getPublicUrl(path);

      setF((prev) => ({ ...prev, imagen_url: publicUrl }));
      setImgError(false);
      toast.success("Imagen subida y optimizada ✨");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verifica el almacenamiento";
      toast.error("Error al subir: " + msg);
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!f.nombre?.trim()) {
      toast.error("El nombre de la prenda es requerido");
      setActiveTab("info");
      return;
    }
    if (!f.categoria?.trim()) {
      toast.error("La categoría es requerida");
      setActiveTab("info");
      return;
    }

    try {
      setIsSubmitting(true);
      // Limpiar precios de servicios vacíos o 0 y normalizar nombres
      const cleanPreciosServicios: Record<string, number> = {};
      if (f.precios_servicios) {
        Object.entries(f.precios_servicios).forEach(([key, val]) => {
          const num = Number(val);
          if (num > 0) {
            const srvObj = serviciosList.find(
              (s) => s.id === key || s.nombre.toLowerCase() === key.toLowerCase(),
            );
            const name = srvObj ? srvObj.nombre : key;
            if (!srvObj && key.length > 20 && key.includes("-")) {
              return;
            }
            cleanPreciosServicios[name] = num;
          }
        });
      }

      const basePrecio =
        hasFixedPrice && Number(f.precio) > 0
          ? Number(f.precio)
          : Object.values(cleanPreciosServicios)[0] || 0;

      const item: CatalogoItem = {
        id: initial?.id ?? uid("cat"),
        tenant_id: tenantId,
        categoria: f.categoria!.trim(),
        nombre: f.nombre!.trim(),
        descripcion: f.descripcion?.trim() || undefined,
        precio: basePrecio,
        precios_servicios: cleanPreciosServicios,
        por_libra: !!f.por_libra,
        activo: f.activo ?? true,
        is_exento: !!f.is_exento,
        es_muestra: !!f.es_muestra,
        permitir_desglose: !!f.permitir_desglose,
        permitir_editar_precio: !!f.permitir_editar_precio,
        icono: mode === "emoji" ? f.icono || "👕" : undefined,
        imagen_url: mode === "image" ? f.imagen_url : undefined,
      };

      await saveCatalogoItem(item);
      toast.success(
        initial ? "Prenda actualizada con éxito ✨" : "Prenda creada con éxito ✨",
      );
      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar la prenda";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-2xl max-h-[90vh] rounded-3xl p-0 overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-2xl bg-background text-foreground flex flex-col">
        {/* HEADER MODERNO */}
        <div className="bg-slate-50/80 dark:bg-slate-900/80 px-5 sm:px-6 pt-5 pb-4 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs shrink-0 overflow-hidden">
                {f.imagen_url && !imgError ? (
                  <img
                    src={f.imagen_url}
                    alt="Prenda"
                    className="h-full w-full object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <Shirt className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-display font-black text-foreground truncate leading-tight">
                  {initial ? `Editar: ${f.nombre || "Prenda"}` : "Nueva Prenda"}
                </DialogTitle>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  Personaliza los datos, tarifas por servicio y aspecto visual
                </p>
              </div>
            </div>
          </div>

          {/* PESTAÑAS SEGMENTADAS ELEGANTES CON COLORES PRIMARIOS */}
          <div className="grid grid-cols-2 gap-1.5 mt-4 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/50 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setActiveTab("info")}
              className={`flex items-center justify-center gap-2 h-9 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "info"
                  ? "bg-[#1B4B73] text-white shadow-md border border-[#1B4B73] font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-[#1B4B73] dark:hover:text-sky-300 hover:bg-white/50 dark:hover:bg-slate-800"
              }`}
            >
              <Shirt
                className={`h-4 w-4 shrink-0 transition-colors ${
                  activeTab === "info" ? "text-[#F0B900]" : "text-[#1B4B73] dark:text-sky-400"
                }`}
              />
              <span>Datos y Tarifas</span>
              {activeServicesCount > 0 && (
                <Badge
                  className={`h-4 px-1.5 text-[9px] font-black border-none transition-colors ${
                    activeTab === "info"
                      ? "bg-[#F0B900] text-[#1B4B73]"
                      : "bg-[#1B4B73]/10 text-[#1B4B73] dark:bg-sky-950 dark:text-sky-300"
                  }`}
                >
                  {activeServicesCount}
                </Badge>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("visual")}
              className={`flex items-center justify-center gap-2 h-9 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "visual"
                  ? "bg-[#1B4B73] text-white shadow-md border border-[#1B4B73] font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-[#1B4B73] dark:hover:text-sky-300 hover:bg-white/50 dark:hover:bg-slate-800"
              }`}
            >
              <ImageIcon
                className={`h-4 w-4 shrink-0 transition-colors ${
                  activeTab === "visual" ? "text-[#F0B900]" : "text-[#1B4B73] dark:text-sky-400"
                }`}
              />
              <span>Icono / Foto (Opcional)</span>
            </button>
          </div>
        </div>

        {/* CUERPO DEL MODAL CON SCROLL FLUIDO */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar">
          {activeTab === "info" ? (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* BLOQUE 1: INFORMACIÓN PRINCIPAL */}
              <div className="space-y-3.5 p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="item-name" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-primary" />
                      Nombre de la prenda <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="item-name"
                      value={f.nombre || ""}
                      onChange={(e) => setF({ ...f, nombre: e.target.value })}
                      placeholder="Ej. Camisa manga larga, Traje 2 piezas..."
                      className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm font-semibold text-foreground focus-visible:ring-primary shadow-2xs"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="item-category" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Shirt className="h-3.5 w-3.5 text-primary" />
                      Categoría <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="item-category"
                      value={f.categoria || ""}
                      onChange={(e) => setF({ ...f, categoria: e.target.value })}
                      placeholder="Ej. Camisas, Vestidos, Hogar..."
                      className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm font-semibold text-foreground focus-visible:ring-primary shadow-2xs"
                      required
                    />
                  </div>
                </div>

                {/* DESCRIPCIÓN OPCIONAL */}
                <div className="pt-1">
                  {showDesc ? (
                    <div className="space-y-1.5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="item-description" className="text-xs font-bold text-foreground">
                          Descripción o detalles de la prenda
                        </Label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowDesc(false);
                            setF({ ...f, descripcion: "" });
                          }}
                          className="text-[10px] font-bold text-destructive hover:underline cursor-pointer"
                        >
                          Quitar descripción
                        </button>
                      </div>
                      <Textarea
                        id="item-description"
                        value={f.descripcion || ""}
                        onChange={(e) => setF({ ...f, descripcion: e.target.value })}
                        placeholder="Ej. Instrucciones especiales de planchado, tipo de tela, cuidados..."
                        rows={2}
                        className="min-h-16 resize-none rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-xs text-foreground focus-visible:ring-primary shadow-2xs"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowDesc(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Añadir descripción o nota opcional
                    </button>
                  )}
                </div>
              </div>

              {/* BLOQUE 2: TARIFAS POR TRATAMIENTO CON ACCESO A MODAL DEDICADO */}
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/15 shrink-0">
                      <SlidersHorizontal className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                        Tarifas por Tratamiento
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Precios por pieza según el tratamiento elegido en caja
                      </p>
                    </div>
                  </div>
                  <Badge className="h-5 px-2 text-[10px] bg-primary/10 text-primary border-primary/20 font-black shrink-0">
                    {activeServicesCount} {activeServicesCount === 1 ? "activo" : "activos"}
                  </Badge>
                </div>

                {/* Resumen / Chips de tratamientos activos */}
                {activeServicesCount > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1 max-h-36 overflow-y-auto custom-scrollbar">
                    {Object.entries(f.precios_servicios || {})
                      .filter(([k, val]) => Number(val) > 0 && !(k.length > 20 && k.includes("-")))
                      .map(([srvName, val]) => {
                        const srvObj = serviciosList.find(
                          (s) => s.nombre.toLowerCase() === srvName.toLowerCase() || s.id === srvName,
                        );
                        return (
                          <div
                            key={srvName}
                            className="inline-flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-2xs text-xs font-semibold text-foreground animate-in fade-in duration-150"
                          >
                            <div className="h-6 w-6 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center shrink-0 overflow-hidden text-[10px]">
                              {srvObj?.imagen_url ? (
                                <img src={srvObj.imagen_url} alt={srvName} className="h-full w-full object-cover" />
                              ) : (
                                <Layers className="h-3.5 w-3.5 text-slate-500 dark:text-slate-300" />
                              )}
                            </div>
                            <span className="font-bold text-foreground truncate max-w-[130px]">{srvObj?.nombre || srvName}</span>
                            <span className="font-display font-black text-xs px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/15">
                              {formatRD(Number(val))}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setF((prev) => {
                                  const updated = { ...(prev.precios_servicios || {}) };
                                  delete updated[srvName];
                                  if (srvObj) delete updated[srvObj.id];
                                  return { ...prev, precios_servicios: updated };
                                });
                              }}
                              className="h-5 w-5 rounded-md text-slate-400 hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors cursor-pointer"
                              title="Quitar tarifa"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="py-3 px-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-center text-xs text-muted-foreground">
                    Esta prenda aún no tiene tarifas por tratamiento configuradas.
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTreatmentsModal(true)}
                  className="w-full h-10 rounded-xl border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary hover:text-primary font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-2xs transition-all"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span>{activeServicesCount > 0 ? "Modificar / Añadir Tarifas por Tratamiento" : "+ Añadir Tarifas por Tratamiento"}</span>
                </Button>
              </div>

              {/* BLOQUE 3: OPCIONES RÁPIDAS Y PRECIO POR PIEZA */}
              <div className="space-y-2.5 p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* TOGGLE PRECIO POR PRENDA / PIEZA */}
                  <div
                    className={`p-3 rounded-xl bg-white dark:bg-slate-800/90 border transition-all shadow-2xs ${
                      hasFixedPrice
                        ? "border-primary/40 ring-1 ring-primary/20"
                        : "border-slate-200/80 dark:border-slate-700/80"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Tag className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-foreground block truncate">
                            Precio por Prenda / Pieza
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            Habilitar precio fijo directo
                          </span>
                        </div>
                      </div>
                      <Switch
                        checked={hasFixedPrice}
                        onCheckedChange={(v) => {
                          setHasFixedPrice(v);
                          if (!v) setF((prev) => ({ ...prev, precio: 0 }));
                        }}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>

                    {hasFixedPrice && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 animate-in fade-in duration-150">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 select-none">
                            RD$
                          </span>
                          <Input
                            id="item-base-price"
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={f.precio ? formatAmountInput(String(f.precio)) : ""}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/,/g, "");
                              if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
                                setF({ ...f, precio: raw === "" ? 0 : Number(raw) || 0 });
                              }
                            }}
                            className="h-9 rounded-xl bg-slate-50/70 dark:bg-slate-900 pl-11 pr-3 font-black text-foreground text-xs border-slate-300 dark:border-slate-700 focus-visible:ring-primary shadow-xs text-right"
                            autoFocus
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* COBRAR POR LIBRA */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs cursor-pointer hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Scale className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-bold text-foreground">Cobrar por Libra</span>
                    </div>
                    <Switch
                      checked={!!f.por_libra}
                      onCheckedChange={(v) => setF({ ...f, por_libra: v })}
                      className="data-[state=checked]:bg-primary"
                    />
                  </label>

                  {/* PRENDA ACTIVA EN POS */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs cursor-pointer hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-bold text-foreground">Prenda Activa en POS</span>
                    </div>
                    <Switch
                      checked={f.activo ?? true}
                      onCheckedChange={(v) => setF({ ...f, activo: v })}
                      className="data-[state=checked]:bg-primary"
                    />
                  </label>

                  {/* EXENTO DE ITBIS */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs cursor-pointer hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Receipt className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-bold text-foreground">Exento de ITBIS (0%)</span>
                    </div>
                    <Switch
                      checked={!!f.is_exento}
                      onCheckedChange={(v) => setF({ ...f, is_exento: v })}
                      className="data-[state=checked]:bg-primary"
                    />
                  </label>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: IDENTIFICADOR VISUAL Y VISTA PREVIA COMPACTA */
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* SELECTOR EMOJI VS IMAGEN */}
              <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                      Identificador Visual
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Elige si representarás esta prenda con un icono ilustrado o una foto real
                    </p>
                  </div>

                  <div className="flex rounded-xl bg-slate-200/70 dark:bg-slate-800 p-1 border border-slate-300/40 dark:border-slate-700 shrink-0">
                    <button
                      type="button"
                      onClick={() => setMode("emoji")}
                      className={`flex items-center gap-2 px-4 py-2 text-xs font-bold whitespace-nowrap rounded-lg transition-all cursor-pointer ${
                        mode === "emoji"
                          ? "bg-white dark:bg-slate-900 text-foreground shadow-xs font-black"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Shirt className="h-3.5 w-3.5 text-primary" />
                      <span>Icono / Emoji</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("image")}
                      className={`flex items-center gap-2 px-4 py-2 text-xs font-bold whitespace-nowrap rounded-lg transition-all cursor-pointer ${
                        mode === "image"
                          ? "bg-white dark:bg-slate-900 text-foreground shadow-xs font-black"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <ImageIcon className="h-3.5 w-3.5 text-primary" />
                      <span>Foto Real</span>
                    </button>
                  </div>
                </div>

                {mode === "emoji" ? (
                  <div className="space-y-2.5 pt-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Buscar icono por nombre (ej. camisa, vestido, traje)..."
                        value={iconSearch}
                        onChange={(e) => setIconSearch(e.target.value)}
                        className="h-9 pl-9 rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-xs shadow-2xs"
                      />
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 custom-scrollbar">
                      {filteredIcons.map((i) => (
                        <button
                          key={i.char}
                          type="button"
                          onClick={() => setF({ ...f, icono: i.char })}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all border cursor-pointer ${
                            (f.icono || "👕") === i.char
                              ? "bg-primary/10 text-primary border-primary shadow-xs ring-2 ring-primary/30"
                              : "bg-slate-50/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-primary/40 hover:bg-white dark:hover:bg-slate-700 shadow-2xs"
                          }`}
                        >
                          <span className="text-2xl">{i.char}</span>
                          <span className="text-[9px] font-bold truncate w-full text-center text-muted-foreground">
                            {i.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        value={f.imagen_url || ""}
                        onChange={(e) => {
                          setF({ ...f, imagen_url: e.target.value });
                          setImgError(false);
                        }}
                        placeholder="Pegar URL directa de la imagen..."
                        className="flex-1 h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-xs shadow-2xs"
                      />
                      <div>
                        <input
                          type="file"
                          id="item-upload-redesign"
                          className="hidden"
                          accept="image/*"
                          onChange={handleFileUpload}
                          disabled={uploading}
                        />
                        <Button
                          type="button"
                          className="w-full sm:w-auto h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold gap-2 shadow-sm cursor-pointer"
                          disabled={uploading}
                          onClick={() => document.getElementById("item-upload-redesign")?.click()}
                        >
                          {uploading ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <>
                              <Upload className="h-4 w-4" /> Subir archivo
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* VISTA PREVIA HORIZONTAL COMPACTA (ESTILO MINIMALISTA) */}
              <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                  Vista Previa en el Catálogo
                </span>

                <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center gap-3.5 max-w-sm">
                  <div className="h-13 w-13 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                    {f.imagen_url && !imgError ? (
                      <img
                        src={f.imagen_url}
                        alt={f.nombre || "Prenda"}
                        className="h-full w-full object-cover"
                        onError={() => setImgError(true)}
                      />
                    ) : (
                      <Shirt className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-sm text-foreground truncate leading-tight">
                      {f.nombre || "Nombre de la Prenda"}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate mt-1 font-semibold">
                      {f.categoria || "Categoría"} · {formatRD(f.precio || 0)}{f.por_libra ? "/lb" : ""}
                    </p>
                    {activeServicesCount > 0 && (
                      <span className="inline-block text-[10px] font-bold text-primary mt-0.5">
                        {activeServicesCount} {activeServicesCount === 1 ? "tratamiento activo" : "tratamientos activos"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER PRINCIPAL CON GUARDADO DIRECTO */}
        {activeTab === "info" ? (
          <div className="px-5 sm:px-6 py-3.5 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl h-10 px-5 text-xs font-semibold border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            >
              Cancelar
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab("visual")}
                className="rounded-xl h-10 px-3.5 text-xs font-semibold border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer gap-1.5 hidden sm:inline-flex"
              >
                <ImageIcon className="h-4 w-4 text-primary" />
                <span>Foto / Icono (Opcional)</span>
              </Button>

              <Button
                type="button"
                onClick={submit}
                disabled={isSubmitting || !f.nombre?.trim() || !f.categoria?.trim()}
                className="rounded-xl h-10 px-6 text-xs font-bold bg-primary hover:bg-primary/90 text-white gap-2 shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <span>{initial ? "Guardar cambios" : "Guardar prenda"}</span>
                    <CheckCircle2 className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-5 sm:px-6 py-3.5 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveTab("info")}
              className="rounded-xl h-10 px-5 text-xs font-semibold border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Anterior</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl h-10 px-5 text-xs font-semibold border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancelar
              </Button>

              <Button
                type="button"
                onClick={submit}
                disabled={isSubmitting || !f.nombre?.trim() || !f.categoria?.trim()}
                className="rounded-xl h-10 px-6 text-xs font-bold bg-primary hover:bg-primary/90 text-white gap-2 shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <span>{initial ? "Guardar cambios" : "Guardar prenda"}</span>
                    <CheckCircle2 className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* MODAL DEDICADO Y ESPACIOSO: TARIFAS POR TRATAMIENTO */}
    <Dialog open={showTreatmentsModal} onOpenChange={setShowTreatmentsModal}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-2xl md:max-w-3xl max-h-[88vh] rounded-3xl p-0 overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-2xl bg-background text-foreground flex flex-col">
        {/* Header */}
        <div className="bg-slate-50/90 dark:bg-slate-900/90 px-6 py-5 border-b border-slate-200/80 dark:border-slate-800 shrink-0 pr-16">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs shrink-0">
                <SlidersHorizontal className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-lg font-display font-black text-foreground truncate leading-tight">
                    Tarifas por Tratamiento
                  </DialogTitle>
                  <Badge className="h-5 px-2 text-[10px] bg-primary/10 text-primary border-primary/20 font-black shrink-0">
                    {activeServicesCount} {activeServicesCount === 1 ? "activo" : "activos"}
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                  {f.nombre ? `Prenda: ${f.nombre}` : "Personaliza las tarifas individuales en caja"}
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Buscador de servicios */}
          <div className="relative mt-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={serviceSearch}
              onChange={(e) => setServiceSearch(e.target.value)}
              placeholder="Buscar tratamiento (ej. Lavado en seco, Planchado, Sastrería)..."
              className="h-10 pl-10 pr-3 rounded-xl bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-xs font-semibold text-foreground shadow-2xs focus-visible:ring-primary"
            />
          </div>
        </div>

        {/* Grid amplio de servicios */}
        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar max-h-[55vh] flex-1">
          <div className="grid gap-3 sm:grid-cols-2">
            {serviciosList
              .filter(
                (service) =>
                  service.activo &&
                  service.nombre.toLowerCase().includes(serviceSearch.toLowerCase()),
              )
              .map((service) => {
                const prices = f.precios_servicios || {};
                const isAssigned =
                  Object.prototype.hasOwnProperty.call(prices, service.nombre) ||
                  Object.prototype.hasOwnProperty.call(prices, service.id);
                const currentVal = prices[service.nombre] ?? prices[service.id] ?? "";

                return (
                  <div
                    key={service.id}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isAssigned
                        ? "border-primary/50 bg-primary/[0.03] shadow-sm ring-1 ring-primary/20"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs"
                    }`}
                  >
                    {/* Cabecera de la tarjeta del servicio */}
                    <div className="p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                          {service.imagen_url ? (
                            <img
                              src={service.imagen_url}
                              alt={service.nombre}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Layers className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="block text-sm font-bold text-foreground truncate leading-tight">
                            {service.nombre}
                          </span>
                          {service.descripcion ? (
                            <span
                              className="block text-[11px] text-muted-foreground truncate mt-0.5"
                              title={service.descripcion}
                            >
                              {service.descripcion}
                            </span>
                          ) : (
                            <span className="block text-[10px] text-muted-foreground/70 italic mt-0.5">
                              Tratamiento disponible
                            </span>
                          )}
                        </div>
                      </div>

                      <Switch
                        checked={isAssigned}
                        onCheckedChange={(checked) => {
                          setF((prev) => {
                            const updated = { ...(prev.precios_servicios || {}) };
                            delete updated[service.id];
                            if (!checked) {
                              delete updated[service.nombre];
                            } else {
                              updated[service.nombre] =
                                Number(service.precio) > 0
                                  ? Number(service.precio)
                                  : Number(prev.precio) || 0;
                            }
                            return { ...prev, precios_servicios: updated };
                          });
                        }}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>

                    {/* Barra integrada de precio en caja */}
                    {isAssigned && (
                      <div className="bg-primary/5 dark:bg-primary/10 border-t border-primary/15 px-3.5 py-2.5 flex items-center justify-between gap-3 animate-in fade-in duration-150">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5 text-primary" />
                          Precio en caja:
                        </span>
                        <div className="relative w-36 shrink-0">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 dark:text-slate-500 pointer-events-none select-none">
                            RD$
                          </span>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={
                              currentVal !== "" && currentVal !== undefined
                                ? formatAmountInput(String(currentVal))
                                : ""
                            }
                            onChange={(e) => {
                              const val = e.target.value.replace(/,/g, "");
                              if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                setF((prev) => {
                                  const updated = { ...(prev.precios_servicios || {}) };
                                  delete updated[service.id];
                                  updated[service.nombre] =
                                    val === "" ? ("" as any) : Number(val) || 0;
                                  return { ...prev, precios_servicios: updated };
                                });
                              }
                            }}
                            className="h-9 w-full pl-11 pr-3 text-right text-xs font-black rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-foreground focus-visible:ring-primary shadow-xs"
                            autoFocus={isAssigned && !currentVal}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

            {serviciosList.filter((s) => s.activo).length === 0 && (
              <div className="col-span-full py-12 text-center text-sm text-muted-foreground border border-dashed rounded-3xl">
                No hay servicios activos creados en el sistema.
              </div>
            )}
          </div>
        </div>

        {/* Footer del modal de tratamientos */}
        <div className="bg-slate-50/80 dark:bg-slate-900/80 px-6 py-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs font-semibold text-muted-foreground">
            {activeServicesCount} {activeServicesCount === 1 ? "tratamiento seleccionado" : "tratamientos seleccionados"}
          </span>
          <Button
            type="button"
            onClick={() => setShowTreatmentsModal(false)}
            className="h-10 px-6 rounded-xl font-black text-xs bg-primary hover:bg-primary/90 text-white shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Check className="h-4 w-4" />
            <span>Listo / Guardar Tarifas</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </>
);
}

function ServDialog({
  open,
  onOpenChange,
  tenantId,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tenantId: string;
  initial: Servicio | null;
  onSaved: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"info" | "visual">("info");
  const [f, setF] = useState<Partial<Servicio>>({});
  const [imgError, setImgError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<"emoji" | "image">("emoji");
  const [iconSearch, setIconSearch] = useState("");
  const [showDesc, setShowDesc] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setActiveTab("info");
      setF(
        initial
          ? { ...initial }
          : {
              nombre: "",
              descripcion: "",
              icono: "🧺",
              activo: true,
              precio: 0,
              por_libra: false,
              is_exento: false,
              es_muestra: false,
              permitir_desglose: false,
              permitir_editar_precio: false,
            },
      );
      setShowDesc(Boolean(initial?.descripcion));
      setMode(initial?.imagen_url ? "image" : "emoji");
      setImgError(false);
      setIconSearch("");
      setIsSubmitting(false);
    }
  }, [open, initial]);

  const filteredIcons = useMemo(() => {
    if (!iconSearch) return LAUNDRY_ICONS;
    const s = iconSearch.toLowerCase();
    return LAUNDRY_ICONS.filter((i) => i.label.toLowerCase().includes(s));
  }, [iconSearch]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const compressedDataUrl = await compressImage(file, 800, 800, 0.75);
      const res = await fetch(compressedDataUrl);
      const blob = await res.blob();

      const path = `${tenantId}/serv-${uid("img")}.webp`;
      const { error } = await supabase.storage
        .from("catalogo")
        .upload(path, blob, { contentType: "image/webp" });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("catalogo").getPublicUrl(path);

      setF((prev) => ({ ...prev, imagen_url: publicUrl }));
      setImgError(false);
      toast.success("Imagen de servicio subida y optimizada ✨");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verifica el almacenamiento";
      toast.error("Error al subir: " + msg);
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!f.nombre?.trim()) {
      toast.error("El nombre del servicio es requerido");
      setActiveTab("info");
      return;
    }

    try {
      setIsSubmitting(true);
      const isCloning = initial?.tenant_id === "admin";
      const s: Servicio = {
        id: isCloning ? uid("srv") : (initial?.id ?? uid("srv")),
        tenant_id: tenantId,
        nombre: f.nombre!.trim(),
        descripcion: f.descripcion?.trim() || undefined,
        icono: mode === "emoji" ? f.icono : undefined,
        imagen_url: mode === "image" ? f.imagen_url : undefined,
        activo: f.activo ?? true,
        precio: Number(f.precio) || 0,
        por_libra: !!f.por_libra,
        is_exento: !!f.is_exento,
        permitir_desglose: !!f.permitir_desglose,
        permitir_editar_precio: !!f.permitir_editar_precio,
      };
      await saveServicio(s);
      toast.success(
        isCloning
          ? "Servicio personalizado para tu catálogo ✨"
          : initial
            ? "Servicio actualizado con éxito ✨"
            : "Servicio creado con éxito ✨",
      );
      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar el servicio";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-xl max-h-[90vh] rounded-3xl p-0 overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-2xl bg-background text-foreground flex flex-col">
        {/* HEADER MODERNO */}
        <div className="bg-slate-50/80 dark:bg-slate-900/80 px-5 sm:px-6 pt-5 pb-4 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs shrink-0 overflow-hidden">
                {f.imagen_url && !imgError ? (
                  <img
                    src={f.imagen_url}
                    alt="Servicio"
                    className="h-full w-full object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <Wrench className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-display font-black text-foreground truncate leading-tight">
                  {initial ? `Editar: ${f.nombre || "Servicio"}` : "Nuevo Servicio"}
                </DialogTitle>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  Personaliza los datos del servicio, precio base y opciones
                </p>
              </div>
            </div>
          </div>

          {/* PESTAÑAS SEGMENTADAS ELEGANTES CON COLORES PRIMARIOS */}
          <div className="grid grid-cols-2 gap-1.5 mt-4 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/50 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setActiveTab("info")}
              className={`flex items-center justify-center gap-2 h-9 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "info"
                  ? "bg-[#1B4B73] text-white shadow-md border border-[#1B4B73] font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-[#1B4B73] dark:hover:text-sky-300 hover:bg-white/50 dark:hover:bg-slate-800"
              }`}
            >
              <Wrench
                className={`h-4 w-4 shrink-0 transition-colors ${
                  activeTab === "info" ? "text-[#F0B900]" : "text-[#1B4B73] dark:text-sky-400"
                }`}
              />
              <span>Datos y Precio</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("visual")}
              className={`flex items-center justify-center gap-2 h-9 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "visual"
                  ? "bg-[#1B4B73] text-white shadow-md border border-[#1B4B73] font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-[#1B4B73] dark:hover:text-sky-300 hover:bg-white/50 dark:hover:bg-slate-800"
              }`}
            >
              <ImageIcon
                className={`h-4 w-4 shrink-0 transition-colors ${
                  activeTab === "visual" ? "text-[#F0B900]" : "text-[#1B4B73] dark:text-sky-400"
                }`}
              />
              <span>Icono / Foto (Opcional)</span>
            </button>
          </div>
        </div>

        {/* CUERPO DEL MODAL */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar">
          {activeTab === "info" ? (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* BLOQUE 1: INFORMACIÓN PRINCIPAL (NOMBRE Y PRECIO EN 2 COLUMNAS) */}
              <div className="space-y-3.5 p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
                <div className="grid gap-3.5 sm:grid-cols-2 items-start">
                  {/* COL 1: NOMBRE DEL SERVICIO */}
                  <div className="space-y-1.5">
                    <Label htmlFor="service-name" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-primary" />
                      Nombre del servicio <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="service-name"
                      value={f.nombre || ""}
                      onChange={(e) => setF({ ...f, nombre: e.target.value })}
                      placeholder="Ej. Lavado en Seco, Planchado..."
                      className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm font-semibold text-foreground focus-visible:ring-primary shadow-2xs"
                      required
                    />
                  </div>

                  {/* COL 2: PRECIO BASE */}
                  <div className="space-y-1.5">
                    <Label htmlFor="service-price" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Receipt className="h-3.5 w-3.5 text-primary" />
                      Precio Base
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 select-none">
                        RD$
                      </span>
                      <Input
                        id="service-price"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={f.precio ? formatAmountInput(String(f.precio)) : ""}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/,/g, "");
                          if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
                            setF({ ...f, precio: raw === "" ? 0 : Number(raw) || 0 });
                          }
                        }}
                        className="h-10 rounded-xl bg-white dark:bg-slate-900 pl-11 pr-3 font-black text-foreground text-sm border-slate-300 dark:border-slate-700 focus-visible:ring-primary shadow-2xs text-right"
                      />
                    </div>
                  </div>
                </div>

                {/* DESCRIPCIÓN OPCIONAL */}
                <div className="pt-1">
                  {showDesc ? (
                    <div className="space-y-1.5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="service-description" className="text-xs font-bold text-foreground">
                          Descripción o qué incluye este servicio
                        </Label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowDesc(false);
                            setF({ ...f, descripcion: "" });
                          }}
                          className="text-[10px] font-bold text-destructive hover:underline cursor-pointer"
                        >
                          Quitar descripción
                        </button>
                      </div>
                      <Textarea
                        id="service-description"
                        value={f.descripcion || ""}
                        onChange={(e) => setF({ ...f, descripcion: e.target.value })}
                        placeholder="Qué incluye este servicio..."
                        rows={2}
                        className="min-h-16 resize-none rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-xs text-foreground focus-visible:ring-primary shadow-2xs"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowDesc(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Añadir descripción o nota del servicio
                    </button>
                  )}
                </div>
              </div>

              {/* BLOQUE 2: OPCIONES Y CONTROLES DEL SERVICIO */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs cursor-pointer hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Scale className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-bold text-foreground">Cobrar por Libra</span>
                    </div>
                    <Switch
                      checked={!!f.por_libra}
                      onCheckedChange={(v) => setF({ ...f, por_libra: v })}
                      className="data-[state=checked]:bg-primary"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs cursor-pointer hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-bold text-foreground">Servicio Activo en POS</span>
                    </div>
                    <Switch
                      checked={f.activo ?? true}
                      onCheckedChange={(v) => setF({ ...f, activo: v })}
                      className="data-[state=checked]:bg-primary"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs cursor-pointer hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Receipt className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-bold text-foreground">Exento de ITBIS (0%)</span>
                    </div>
                    <Switch
                      checked={!!f.is_exento}
                      onCheckedChange={(v) => setF({ ...f, is_exento: v })}
                      className="data-[state=checked]:bg-primary"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs cursor-pointer hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Layers className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-bold text-foreground">Permitir Desglose</span>
                    </div>
                    <Switch
                      checked={!!f.permitir_desglose}
                      onCheckedChange={(v) => setF({ ...f, permitir_desglose: v })}
                      className="data-[state=checked]:bg-primary"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs cursor-pointer hover:border-primary/30 transition-colors sm:col-span-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Pencil className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-foreground block">Precio Editable en Caja</span>
                        <span className="text-[10px] text-muted-foreground block">Permite al cajero ajustar el precio manualmente al cobrar</span>
                      </div>
                    </div>
                    <Switch
                      checked={!!f.permitir_editar_precio}
                      onCheckedChange={(v) => setF({ ...f, permitir_editar_precio: v })}
                      className="data-[state=checked]:bg-primary"
                    />
                  </label>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: IDENTIFICADOR VISUAL Y VISTA PREVIA */
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* SELECTOR EMOJI VS IMAGEN */}
              <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                      Identificador Visual
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Elige si representarás este servicio con un icono o foto
                    </p>
                  </div>

                  <div className="flex rounded-xl bg-slate-200/70 dark:bg-slate-800 p-1 border border-slate-300/40 dark:border-slate-700 shrink-0">
                    <button
                      type="button"
                      onClick={() => setMode("emoji")}
                      className={`flex items-center gap-2 px-4 py-2 text-xs font-bold whitespace-nowrap rounded-lg transition-all cursor-pointer ${
                        mode === "emoji"
                          ? "bg-white dark:bg-slate-900 text-foreground shadow-xs font-black"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Wrench className="h-3.5 w-3.5 text-primary" />
                      <span>Icono / Emoji</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("image")}
                      className={`flex items-center gap-2 px-4 py-2 text-xs font-bold whitespace-nowrap rounded-lg transition-all cursor-pointer ${
                        mode === "image"
                          ? "bg-white dark:bg-slate-900 text-foreground shadow-xs font-black"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <ImageIcon className="h-3.5 w-3.5 text-primary" />
                      <span>Foto Real</span>
                    </button>
                  </div>
                </div>

                {mode === "emoji" ? (
                  <div className="space-y-2.5 pt-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Buscar icono por nombre..."
                        value={iconSearch}
                        onChange={(e) => setIconSearch(e.target.value)}
                        className="h-9 pl-9 rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-xs shadow-2xs"
                      />
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 custom-scrollbar">
                      {filteredIcons.map((i) => (
                        <button
                          key={i.char}
                          type="button"
                          onClick={() => setF({ ...f, icono: i.char })}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all border cursor-pointer ${
                            (f.icono || "🧺") === i.char
                              ? "bg-primary/10 text-primary border-primary shadow-xs ring-2 ring-primary/30"
                              : "bg-slate-50/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-primary/40 hover:bg-white dark:hover:bg-slate-700 shadow-2xs"
                          }`}
                        >
                          <span className="text-2xl">{i.char}</span>
                          <span className="text-[9px] font-bold truncate w-full text-center text-muted-foreground">
                            {i.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        value={f.imagen_url || ""}
                        onChange={(e) => {
                          setF({ ...f, imagen_url: e.target.value });
                          setImgError(false);
                        }}
                        placeholder="Pegar URL directa de la imagen..."
                        className="flex-1 h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-xs shadow-2xs"
                      />
                      <div>
                        <input
                          type="file"
                          id="serv-upload-redesign"
                          className="hidden"
                          accept="image/*"
                          onChange={handleFileUpload}
                          disabled={uploading}
                        />
                        <Button
                          type="button"
                          className="w-full sm:w-auto h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold gap-2 shadow-sm cursor-pointer"
                          disabled={uploading}
                          onClick={() => document.getElementById("serv-upload-redesign")?.click()}
                        >
                          {uploading ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <>
                              <Upload className="h-4 w-4" /> Subir archivo
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* VISTA PREVIA HORIZONTAL COMPACTA */}
              <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                  Vista Previa en el Catálogo
                </span>

                <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center gap-3.5 max-w-sm">
                  <div className="h-13 w-13 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                    {f.imagen_url && !imgError ? (
                      <img
                        src={f.imagen_url}
                        alt={f.nombre || "Servicio"}
                        className="h-full w-full object-cover"
                        onError={() => setImgError(true)}
                      />
                    ) : (
                      <Wrench className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-sm text-foreground truncate leading-tight">
                      {f.nombre || "Nombre del Servicio"}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate mt-1 font-semibold">
                      Precio base: {formatRD(f.precio || 0)}{f.por_libra ? "/lb" : ""}
                    </p>
                    {f.permitir_desglose && (
                      <span className="inline-block text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        Permite desglose de prendas
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER PRINCIPAL CON GUARDADO DIRECTO */}
        {activeTab === "info" ? (
          <div className="px-5 sm:px-6 py-3.5 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl h-10 px-5 text-xs font-semibold border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            >
              Cancelar
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab("visual")}
                className="rounded-xl h-10 px-3.5 text-xs font-semibold border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer gap-1.5 hidden sm:inline-flex"
              >
                <ImageIcon className="h-4 w-4 text-primary" />
                <span>Foto / Icono (Opcional)</span>
              </Button>

              <Button
                type="button"
                onClick={submit}
                disabled={isSubmitting || !f.nombre?.trim()}
                className="rounded-xl h-10 px-6 text-xs font-bold bg-primary hover:bg-primary/90 text-white gap-2 shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <span>{initial ? "Guardar cambios" : "Guardar servicio"}</span>
                    <CheckCircle2 className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-5 sm:px-6 py-3.5 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveTab("info")}
              className="rounded-xl h-10 px-5 text-xs font-semibold border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Anterior</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl h-10 px-5 text-xs font-semibold border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancelar
              </Button>

              <Button
                type="button"
                onClick={submit}
                disabled={isSubmitting || !f.nombre?.trim()}
                className="rounded-xl h-10 px-6 text-xs font-bold bg-primary hover:bg-primary/90 text-white gap-2 shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <span>{initial ? "Guardar cambios" : "Guardar servicio"}</span>
                    <CheckCircle2 className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const SAMPLE_PRENDAS: Array<Omit<CatalogoItem, "id" | "tenant_id">> = [
  // Camisas
  {
    categoria: "Camisas",
    nombre: "Camisa manga larga",
    precio: 180,
    activo: true,
    icono: "👔",
    imagen_url: "/samples/Prendas/Camisa manga larga.webp",
  },
  {
    categoria: "Camisas",
    nombre: "Camisa manga corta",
    precio: 150,
    activo: true,
    icono: "👔",
    imagen_url: "/samples/Prendas/Camisa manga corta.webp",
  },
  {
    categoria: "Camisas",
    nombre: "Polo",
    precio: 120,
    activo: true,
    icono: "👕",
    imagen_url: "/samples/Prendas/Polo.webp",
  },
  {
    categoria: "Camisas",
    nombre: "Camiseta básica",
    precio: 90,
    activo: true,
    icono: "👕",
    imagen_url: "/samples/Prendas/Camiseta basica.webp",
  },
  // Pantalones
  {
    categoria: "Pantalones",
    nombre: "Pantalón casual",
    precio: 180,
    activo: true,
    icono: "👖",
    imagen_url: "/samples/Prendas/Pantalon casual.webp",
  },
  {
    categoria: "Pantalones",
    nombre: "Pantalón de vestir",
    precio: 200,
    activo: true,
    icono: "👖",
    imagen_url: "/samples/Prendas/Pantalon de vestir.webp",
  },
  {
    categoria: "Pantalones",
    nombre: "Jeans",
    precio: 170,
    activo: true,
    icono: "👖",
    imagen_url: "/samples/Prendas/Jeans.webp",
  },
  {
    categoria: "Pantalones",
    nombre: "Short",
    precio: 110,
    activo: true,
    icono: "🩳",
    imagen_url: "/samples/Prendas/Short.webp",
  },
  // Vestir
  {
    categoria: "Vestir",
    nombre: "Vestido corto",
    precio: 320,
    activo: true,
    icono: "👗",
    imagen_url: "/samples/Prendas/Vestido corto.webp",
  },
  {
    categoria: "Vestir",
    nombre: "Vestido largo",
    precio: 420,
    activo: true,
    icono: "👗",
    imagen_url: "/samples/Prendas/Vestido largo.webp",
  },
  {
    categoria: "Vestir",
    nombre: "Blusa",
    precio: 130,
    activo: true,
    icono: "👚",
    imagen_url: "/samples/Prendas/Blusa.webp",
  },
  {
    categoria: "Vestir",
    nombre: "Falda",
    precio: 160,
    activo: true,
    icono: "🩱",
    imagen_url: "/samples/Prendas/Falda.webp",
  },
  {
    categoria: "Vestir",
    nombre: "Blazer / chaqueta",
    precio: 280,
    activo: true,
    icono: "🧥",
    imagen_url: "/samples/Prendas/Blazer chaqueta.webp",
  },
  {
    categoria: "Vestir",
    nombre: "Traje completo (2 pzs)",
    precio: 550,
    activo: true,
    icono: "🤵",
    imagen_url: "/samples/Prendas/Traje completo (2 pzs).webp",
  },
  {
    categoria: "Vestir",
    nombre: "Corbata",
    precio: 80,
    activo: true,
    icono: "👔",
    imagen_url: "/samples/Prendas/Corbata.webp",
  },
  {
    categoria: "Vestir",
    nombre: "Abrigo",
    precio: 480,
    activo: true,
    icono: "🧥",
    imagen_url: "/samples/Prendas/Abrigo.webp",
  },
  // Hogar
  {
    categoria: "Hogar",
    nombre: "Sábana individual",
    precio: 180,
    activo: true,
    icono: "🛏️",
    imagen_url: "/samples/Prendas/Sabana individual.webp",
  },
  {
    categoria: "Hogar",
    nombre: "Sábana matrimonial",
    precio: 220,
    activo: true,
    icono: "🛏️",
    imagen_url: "/samples/Prendas/Sabana individual.webp",
  },
  {
    categoria: "Hogar",
    nombre: "Sábana king",
    precio: 280,
    activo: true,
    icono: "🛏️",
    imagen_url: "/samples/Prendas/Sabana individual.webp",
  },
  {
    categoria: "Hogar",
    nombre: "Edredón matrimonial",
    precio: 450,
    activo: true,
    icono: "🛌",
    imagen_url: "/samples/Prendas/Edredon.webp",
  },
  {
    categoria: "Hogar",
    nombre: "Edredón king",
    precio: 550,
    activo: true,
    icono: "🛌",
    imagen_url: "/samples/Prendas/Edredon.webp",
  },
  {
    categoria: "Hogar",
    nombre: "Funda de almohada",
    precio: 60,
    activo: true,
    icono: "🛋️",
    imagen_url: "/samples/Prendas/Funda de almohada.webp",
  },
  {
    categoria: "Hogar",
    nombre: "Toalla pequeña",
    precio: 60,
    activo: true,
    icono: "🧻",
    imagen_url: "/samples/Prendas/Toalla pequena.webp",
  },
  {
    categoria: "Hogar",
    nombre: "Toalla grande",
    precio: 100,
    activo: true,
    icono: "🧖",
    imagen_url: "/samples/Prendas/Toalla grande.webp",
  },
  {
    categoria: "Hogar",
    nombre: "Mantel",
    precio: 180,
    activo: true,
    icono: "🍽️",
    imagen_url: "/samples/Prendas/Mantel.webp",
  },
  {
    categoria: "Hogar",
    nombre: "Cortina",
    precio: 320,
    activo: true,
    icono: "🪟",
    imagen_url: "/samples/Prendas/Cortina.webp",
  },
  {
    categoria: "Hogar",
    nombre: "Cobertor / frazada",
    precio: 380,
    activo: true,
    icono: "🧶",
    imagen_url: "/samples/Prendas/Cobertor frazada.webp",
  },
  // Por libra
  {
    categoria: "Por libra",
    nombre: "Lavado por libra",
    precio: 80,
    por_libra: true,
    activo: true,
    icono: "⚖️",
    imagen_url: "/samples/Prendas/Lavado por libra.webp",
  },
  {
    categoria: "Por libra",
    nombre: "Lavado y planchado por libra",
    precio: 110,
    por_libra: true,
    activo: true,
    icono: "⚖️",
    imagen_url: "/samples/Prendas/Lavado y planchado por libra.webp",
  },
  // Especial
  {
    categoria: "Especial",
    nombre: "Uniforme escolar",
    precio: 200,
    activo: true,
    icono: "🎒",
    imagen_url: "/samples/Prendas/Uniforme escolar.webp",
  },
  {
    categoria: "Especial",
    nombre: "Uniforme médico",
    precio: 220,
    activo: true,
    icono: "🥼",
    imagen_url: "/samples/Prendas/Uniforme medico.webp",
  },
  {
    categoria: "Especial",
    nombre: "Bata / kimono",
    precio: 240,
    activo: true,
    icono: "🥻",
    imagen_url: "/samples/Prendas/Bata kimono.webp",
  },
  {
    categoria: "Especial",
    nombre: "Pijama",
    precio: 150,
    activo: true,
    icono: "🛌",
    imagen_url: "/samples/Prendas/Pijama.webp",
  },
  {
    categoria: "Especial",
    nombre: "Ropa interior hombre",
    precio: 40,
    activo: true,
    icono: "🩲",
    imagen_url: "/samples/Prendas/Ropa interior hombre.webp",
  },
  {
    categoria: "Especial",
    nombre: "Ropa interior mujer",
    precio: 40,
    activo: true,
    icono: "👙",
    imagen_url: "/samples/Prendas/Ropa interior mujer.webp",
  },
  {
    categoria: "Especial",
    nombre: "Calcetines (par)",
    precio: 40,
    activo: true,
    icono: "🧦",
    imagen_url: "/samples/Prendas/Calcetines (par).webp",
  },
  {
    categoria: "Especial",
    nombre: "Bufanda",
    precio: 120,
    activo: true,
    icono: "🧣",
    imagen_url: "/samples/Prendas/Bufanda.webp",
  },
  {
    categoria: "Especial",
    nombre: "Gorra",
    precio: 90,
    activo: true,
    icono: "🧢",
    imagen_url: "/samples/Prendas/Gorra.webp",
  },
  {
    categoria: "Especial",
    nombre: "Mochila",
    precio: 250,
    activo: true,
    icono: "🎒",
    imagen_url: "/samples/Prendas/Mochila.webp",
  },
  {
    categoria: "Especial",
    nombre: "Tenis / zapatillas",
    precio: 300,
    activo: true,
    icono: "👟",
    imagen_url: "/samples/Prendas/Tenis zapatillas.webp",
  },
  // Bebé
  {
    categoria: "Bebé",
    nombre: "Body de bebé",
    precio: 70,
    activo: true,
    icono: "👶",
    imagen_url: "/samples/Prendas/Body de bebe.webp",
  },
  {
    categoria: "Bebé",
    nombre: "Manta de bebé",
    precio: 140,
    activo: true,
    icono: "🧸",
    imagen_url: "/samples/Prendas/Manta de bebe.webp",
  },
];

const SAMPLE_SERVICIOS: Array<Omit<Servicio, "id" | "tenant_id">> = [
  {
    nombre: "Lavado y secado",
    descripcion: "Lavado completo + secadora",
    icono: "🧺",
    activo: true,
    precio: 0,
    imagen_url: "/samples/Servicios/Lavado y secado.webp",
  },
  {
    nombre: "Solo lavado",
    descripcion: "Solo lavado en agua",
    icono: "💧",
    activo: true,
    precio: 0,
    imagen_url: "/samples/Servicios/Solo lavado.webp",
  },
  {
    nombre: "Solo secado",
    descripcion: "Únicamente secadora",
    icono: "🌬️",
    activo: true,
    precio: 0,
    imagen_url: "/samples/Servicios/Solo secado.webp",
  },
  {
    nombre: "Planchado",
    descripcion: "Planchado profesional",
    icono: "♨️",
    activo: true,
    precio: 0,
    imagen_url: "/samples/Servicios/Planchado.webp",
  },
  {
    nombre: "Lavado en seco",
    descripcion: "Dry cleaning para prendas delicadas",
    icono: "✨",
    activo: true,
    precio: 50,
    imagen_url: "/samples/Servicios/Lavado en seco.webp",
  },
  {
    nombre: "Sastrería",
    descripcion: "Arreglos y costura",
    icono: "🪡",
    activo: true,
    precio: 100,
    imagen_url: "/samples/Servicios/Sastreria.webp",
  },
  {
    nombre: "Tapicería",
    descripcion: "Limpieza de muebles y tapizados",
    icono: "🛋️",
    activo: true,
    precio: 500,
    imagen_url: "/samples/Servicios/Tapiceria.webp",
  },
  {
    nombre: "Alfombras",
    descripcion: "Lavado de alfombras y tapetes",
    icono: "🟫",
    activo: true,
    precio: 300,
    imagen_url: "/samples/Servicios/Alfombras.webp",
  },
];

async function seedSamplePrendas(tenantId: string) {
  if (!tenantId) return;
  const existing = await getCatalogo(tenantId);
  const existingMap = new Map(
    existing.map((i) => [`${i.categoria}::${i.nombre}`.toLowerCase(), i]),
  );

  await Promise.all(
    SAMPLE_PRENDAS.map(async (p) => {
      const key = `${p.categoria}::${p.nombre}`.toLowerCase();
      const current = existingMap.get(key);

      if (!current) {
        // Crear nueva
        await saveCatalogoItem({ ...p, id: uid("cat"), tenant_id: tenantId });
      } else if (current.imagen_url !== p.imagen_url) {
        // Actualizar/Reparar imagen si el path cambió o faltaba
        await saveCatalogoItem({ ...current, imagen_url: p.imagen_url });
      }
    }),
  );
}

async function seedSampleServicios(tenantId: string) {
  if (!tenantId) return;
  const existing = await getServicios(tenantId);
  const existingMap = new Map(existing.map((s) => [s.nombre.toLowerCase(), s]));

  await Promise.all(
    SAMPLE_SERVICIOS.map(async (s) => {
      const key = s.nombre.toLowerCase();
      const current = existingMap.get(key);

      if (!current) {
        // Crear nuevo
        await saveServicio({ ...s, id: uid("srv"), tenant_id: tenantId });
      } else if (current.imagen_url !== s.imagen_url) {
        // Actualizar/Reparar imagen si el path cambió o faltaba
        await saveServicio({ ...current, imagen_url: s.imagen_url });
      }
    }),
  );
}
