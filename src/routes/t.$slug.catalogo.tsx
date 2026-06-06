import { createFileRoute } from "@tanstack/react-router";
import { compressImage } from "@/lib/compressImage";
import { useMemo, useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Shirt, Sparkles, Image as ImageIcon, PackagePlus, Search } from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  getCatalogo, saveCatalogoItem, deleteCatalogoItem,
  getServicios, saveServicio, deleteServicio,
  formatRD, uid,
  type CatalogoItem, type Servicio,
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
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabase";
import { useCatalogo, useServicios } from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";

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
  { char: "🧴", label: "Suavizante" }
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

  // Sincronización automática desactivada, manejada por DB Triggers

  const [tab, setTab] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("tab") || "prendas";
    }
    return "prendas";
  });

  useEffect(() => {
    const handleUrlChange = () => {
      const currentTab = new URLSearchParams(window.location.search).get("tab") || "prendas";
      if (currentTab !== tab) {
        setTab(currentTab);
      }
    };
    const interval = setInterval(handleUrlChange, 100);
    return () => clearInterval(interval);
  }, [tab]);

  const handleTabChange = (val: string) => {
    setTab(val);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", val);
    window.history.pushState({}, "", url.toString());
  };

  const loading = loadingItems || loadingServicios;

  if (!user || user.tenant.id === '__loading__') return null;

  const filteredItems = items.filter(i => 
    i.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
    i.categoria.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredServicios = servicios.filter(s => 
    s.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.descripcion && s.descripcion.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const categorias = Array.from(new Set(filteredItems.map((i) => i.categoria))).sort();

  return (
    <div className="w-full mx-auto max-w-6xl">
      <PageHeader
        title="Catálogo"
        description="Gestiona prendas, precios y servicios disponibles para tu lavandería."
      />

      <Tabs value={tab} onValueChange={handleTabChange} className="mt-2">
        <TabsList className="mb-6 bg-muted/30 p-1 rounded-2xl border border-primary/5 shadow-sm inline-flex h-auto">
          <TabsTrigger 
            value="prendas" 
            className="rounded-xl px-6 py-1.5 transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            <Shirt className="mr-2 h-4 w-4" /> 
            <span className="font-display font-bold">Prendas</span>
          </TabsTrigger>
          <TabsTrigger 
            value="servicios" 
            className="rounded-xl px-6 py-1.5 transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            <Sparkles className="mr-2 h-4 w-4" /> 
            <span className="font-display font-bold">Servicios</span>
          </TabsTrigger>
        </TabsList>

        {/* PRENDAS */}
        <TabsContent value="prendas">
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{items.length} prendas · {categorias.length} categorías</p>
            <div className="flex flex-1 items-center gap-2 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Buscar prendas o categorías..." 
                  className="pl-9 rounded-xl border-primary/10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { setEditItem(null); setOpenItem(true); }} className="bg-gradient-primary text-white">
                <Plus className="mr-1.5 h-4 w-4" /> Nueva prenda
              </Button>
            </div>
          </div>

          {categorias.length === 0 && (
            <Card className="p-12 text-center text-muted-foreground">No hay prendas. Agrega la primera.</Card>
          )}

          {categorias.map((cat) => (
            <div key={cat} className="mb-6">
              <h3 className="mb-3 font-display text-lg">{cat}</h3>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {filteredItems.filter((i) => i.categoria === cat).map((it) => (
                  <Card key={it.id} className="group relative overflow-hidden border-none shadow-card h-64 transition-all hover:shadow-elegant">
                    {/* Imagen de fondo */}
                    <div className="absolute inset-0">
                      {it.imagen_url ? (
                        <img src={it.imagen_url} alt={it.nombre} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-primary/10 to-secondary/10 grid place-items-center">
                          <span className="text-5xl">{it.icono || "👕"}</span>
                        </div>
                      )}
                      {/* Gradiente para legibilidad */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    </div>

                    {/* Contenido (Glassmorphism) */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="backdrop-blur-md bg-white/10 rounded-2xl p-3 border border-white/20 shadow-lg">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col gap-1">
                            <div className="font-display font-bold text-white text-lg leading-tight drop-shadow-md">
                              {it.nombre}
                            </div>
                            {it.es_muestra && (
                              <Badge className="w-fit bg-primary/80 backdrop-blur-md text-[9px] h-4 px-1.5 border-none text-white uppercase font-black tracking-wider">Muestra</Badge>
                            )}
                          </div>
                          {!it.activo && <Badge variant="outline" className="text-[10px] bg-white/20 text-white border-white/40">Inactivo</Badge>}
                        </div>
                        <div className="mt-1 font-display text-2xl font-black text-white drop-shadow-lg">
                          {formatRD(it.precio)}{it.por_libra ? "/lb" : ""}
                        </div>
                      </div>
                      
                      {/* Botones de acción (visibles al hover o fijos) */}
                      <div className="mt-2 flex gap-1 animate-in slide-in-from-bottom-2 duration-300">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditItem(it); setOpenItem(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
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
                              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                               <AlertDialogAction 
                                onClick={async () => { 
                                  if (it.tenant_id === 'admin') {
                                    toast.error("No puedes eliminar prendas de muestra. Desactívala si no la usas. 🚫");
                                    return;
                                  }
                                  await deleteCatalogoItem(it.id); 
                                  queryClient.invalidateQueries({ queryKey: ['catalogo', tenantId] });
                                  toast.success("Eliminada 🗑️"); 
                                }} 
                                className="bg-destructive text-white rounded-xl"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* SERVICIOS */}
        <TabsContent value="servicios">
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{filteredServicios.length} servicios disponibles</p>
            <div className="flex flex-1 items-center gap-2 max-w-md ml-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Buscar servicios..." 
                  className="pl-9 rounded-xl border-primary/10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { setEditServ(null); setOpenServ(true); }} className="bg-gradient-primary text-white">
                <Plus className="mr-1.5 h-4 w-4" /> Nuevo servicio
              </Button>
            </div>
          </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServicios.map((s) => (
                <Card key={s.id} className="group relative overflow-hidden border-none shadow-card h-64 transition-all hover:shadow-elegant">
                  {/* Imagen de fondo completa */}
                  <div className="absolute inset-0">
                    {s.imagen_url ? (
                      <img src={s.imagen_url} alt={s.nombre} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-primary/10 to-secondary/10 grid place-items-center">
                        <span className="text-5xl">{s.icono || "🧺"}</span>
                      </div>
                    )}
                    {/* Gradiente oscuro para contraste */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  </div>

                  {/* Contenido (Glassmorphism) */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="backdrop-blur-md bg-white/10 rounded-2xl p-3 border border-white/20 shadow-lg mb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-1">
                          <div className="font-display font-bold text-white text-lg leading-tight drop-shadow-md">
                            {s.nombre}
                          </div>
                          {s.es_muestra && (
                            <Badge className="w-fit bg-primary/80 backdrop-blur-md text-[9px] h-4 px-1.5 border-none text-white uppercase font-black tracking-wider">Muestra</Badge>
                          )}
                        </div>
                        {!s.activo && <Badge variant="outline" className="text-[10px] bg-white/20 text-white border-white/40">Inactivo</Badge>}
                      </div>
                      <div className="mt-1 font-display text-2xl font-black text-white drop-shadow-lg">
                        {s.precio > 0 ? formatRD(s.precio) : "Sin costo"}
                      </div>
                    </div>
                    
                    {/* Botones de acción (Igual que prendas) */}
                    <div className="flex gap-1 animate-in slide-in-from-bottom-2 duration-300">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditServ(s); setOpenServ(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
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
                            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={async () => { 
                                if (s.tenant_id === 'admin') {
                                  toast.error("No puedes eliminar servicios de muestra. Desactívalo si no lo usas. 🚫");
                                  return;
                                }
                                await deleteServicio(s.id); 
                                queryClient.invalidateQueries({ queryKey: ['servicios', tenantId] });
                                toast.success("Servicio eliminado 🗑️"); 
                              }} 
                              className="bg-destructive text-white rounded-xl"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </Card>
              ))}
            {servicios.length === 0 && (
              <Card className="col-span-full p-20 text-center text-muted-foreground bg-card/50 border-dashed rounded-[2rem]">No hay servicios registrados aún.</Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <ItemDialog
        open={openItem} onOpenChange={setOpenItem} tenantId={tenantId} initial={editItem}
        onSaved={() => { queryClient.invalidateQueries({ queryKey: ['catalogo', tenantId] }); setOpenItem(false); }}
      />
      <ServDialog
        open={openServ} onOpenChange={setOpenServ} tenantId={tenantId} initial={editServ}
        onSaved={() => { queryClient.invalidateQueries({ queryKey: ['servicios', tenantId] }); setOpenServ(false); }}
      />
    </div>
  );
}

function ItemDialog({ open, onOpenChange, tenantId, initial, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; tenantId: string;
  initial: CatalogoItem | null; onSaved: () => void;
}) {
  const [f, setF] = useState<Partial<CatalogoItem>>({});
  const [imgError, setImgError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<"emoji" | "image">("emoji");
  const [iconSearch, setIconSearch] = useState("");
  
  useEffect(() => { 
    if (open) {
      setF(initial ? { ...initial } : { categoria: "", nombre: "", precio: 0, activo: true, icono: "👕", is_exento: false, es_muestra: false, permitir_desglose: false, permitir_editar_precio: false });
      setMode(initial?.imagen_url ? "image" : "emoji");
      setImgError(false);
      setIconSearch("");
    }
  }, [open, initial]);

  const filteredIcons = useMemo(() => {
    if (!iconSearch) return LAUNDRY_ICONS;
    const s = iconSearch.toLowerCase();
    return LAUNDRY_ICONS.filter(i => i.label.toLowerCase().includes(s));
  }, [iconSearch]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setUploading(true);
      
      // Comprimir imagen antes de subir
      const compressedDataUrl = await compressImage(file, 800, 800, 0.75);
      const res = await fetch(compressedDataUrl);
      const blob = await res.blob();
      
      const path = `${tenantId}/${uid("img")}.webp`;
      
      const { data, error } = await supabase.storage
        .from('catalogo')
        .upload(path, blob, { contentType: 'image/webp' });
        
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('catalogo')
        .getPublicUrl(path);
        
      setF({ ...f, imagen_url: publicUrl });
      toast.success("Imagen subida y comprimida");
    } catch (err: any) {
      toast.error("Error al subir: " + (err.message || "Asegúrate de que el bucket 'catalogo' sea público"));
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!f.nombre?.trim() || !f.categoria?.trim()) { toast.error("Nombre y categoría requeridos"); return; }
    const item: CatalogoItem = {
      id: initial?.id ?? uid("cat"),
      tenant_id: tenantId,
      categoria: f.categoria!.trim(),
      nombre: f.nombre!.trim(),
      precio: Number(f.precio) || 0,
      por_libra: !!f.por_libra,
      activo: f.activo ?? true,
      is_exento: !!f.is_exento,
      es_muestra: !!f.es_muestra,
      permitir_desglose: !!f.permitir_desglose,
      permitir_editar_precio: !!f.permitir_editar_precio,
      icono: mode === "emoji" ? f.icono : undefined,
      imagen_url: mode === "image" ? f.imagen_url : undefined,
    };
    await saveCatalogoItem(item);
    toast.success(initial ? "Prenda actualizada" : "Prenda creada");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
        <div className="flex flex-col md:flex-row h-full max-h-[90vh] overflow-hidden">
          {/* COLUMNA IZQUIERDA: FORMULARIO */}
          <div className="flex-1 p-8 border-r border-border/50 space-y-6 bg-background overflow-y-auto">
            <div className="space-y-1">
              <h2 className="text-2xl font-display font-bold text-primary">{initial ? "Editar prenda" : "Nueva prenda"}</h2>
              <p className="text-sm text-muted-foreground">Configura los detalles de la prenda en el catálogo.</p>
            </div>

            <div className="grid gap-5 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Categoría</Label>
                  <Input value={f.categoria || ""} onChange={(e) => setF({ ...f, categoria: e.target.value })} placeholder="Ej: Camisas" className="h-11 rounded-xl bg-white border-border/60 focus-visible:ring-primary/30 shadow-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Nombre</Label>
                  <Input value={f.nombre || ""} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej: Camisa Manga Larga" className="h-11 rounded-xl bg-white border-border/60 focus-visible:ring-primary/30 shadow-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Precio base (RD$)</Label>
                  <Input type="number" value={f.precio ?? 0} onChange={(e) => setF({ ...f, precio: Number(e.target.value) })} className="h-11 rounded-xl bg-white border-border/60 focus-visible:ring-primary/30 shadow-sm font-bold text-lg" />
                </div>
                <div className="flex flex-col justify-end gap-3 pb-1">
                  <div className="flex items-center gap-3 px-1">
                    <Switch checked={!!f.por_libra} onCheckedChange={(v) => setF({ ...f, por_libra: v })} />
                    <Label className="text-sm font-medium">Cobrar por libra</Label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10 shadow-sm">
                  <Switch checked={!!f.is_exento} onCheckedChange={(v) => setF({ ...f, is_exento: v })} />
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-primary">Exento de ITBIS</Label>
                    <p className="text-[10px] text-muted-foreground leading-none">No aplica impuesto (DGII Ind: 3)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-border/60 shadow-sm">
                  <Switch checked={f.activo ?? true} onCheckedChange={(v) => setF({ ...f, activo: v })} />
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Estado Activo</Label>
                    <p className="text-[11px] text-muted-foreground leading-none">Visible al crear órdenes.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-border/60 shadow-sm">
                  <Switch checked={!!f.permitir_desglose} onCheckedChange={(v) => setF({ ...f, permitir_desglose: v })} />
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Habilitar desglose</Label>
                    <p className="text-[11px] text-muted-foreground leading-none">Permitir desglosar esta prenda al crear una orden.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-border/60 shadow-sm">
                  <Switch checked={!!f.permitir_editar_precio} onCheckedChange={(v) => setF({ ...f, permitir_editar_precio: v })} />
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Permitir editar precio</Label>
                    <p className="text-[11px] text-muted-foreground leading-none">Permitir modificar el precio de esta prenda al crear una orden.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)} 
                style={{ borderRadius: '0.7rem', paddingInline: 'calc(var(--spacing) * 5)', height: 'calc(var(--spacing) * 9)' }}
                className="font-bold bg-white border-primary/10 shadow-sm text-muted-foreground hover:bg-accent/5"
              >
                Cancelar
              </Button>
              <Button 
                onClick={submit} 
                style={{ borderRadius: '0.7rem', paddingInline: 'calc(var(--spacing) * 5)', height: 'calc(var(--spacing) * 9)' }}
                className="bg-[#1a3eb3] hover:bg-[#1a3eb3]/90 text-white font-bold shadow-sm"
              >
                {initial ? "Guardar" : "Crear prenda"}
              </Button>
            </div>
          </div>

          {/* COLUMNA DERECHA: IDENTIFICADOR VISUAL */}
          <div className="w-full md:w-[420px] bg-primary/5 p-8 flex flex-col gap-6 overflow-y-auto border-l border-primary/10">
            <div className="space-y-1">
              <h3 className="text-lg font-display font-bold text-primary">Identificador Visual</h3>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold">Personaliza cómo se verá la prenda</p>
            </div>

            <div className="space-y-6">
              {/* Selector de Modo */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-background border border-primary/10 shadow-sm">
                <div className="flex flex-col gap-1">
                  <Label className="font-bold text-sm">Usar Imagen</Label>
                  <p className="text-[10px] text-muted-foreground leading-none">Activa para subir foto propia</p>
                </div>
                <Switch 
                  id="mode-toggle-item-split"
                  checked={mode === "image"} 
                  onCheckedChange={(v) => setMode(v ? "image" : "emoji")}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              {/* Contenido según Modo */}
              {mode === "emoji" ? (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input 
                      type="text"
                      placeholder="Buscar icono..."
                      value={iconSearch}
                      onChange={(e) => setIconSearch(e.target.value)}
                      className="w-full h-10 pl-9 pr-4 rounded-xl bg-background border border-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm shadow-sm"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto p-2 rounded-2xl bg-background/50 border border-primary/5 shadow-inner no-scrollbar">
                    {filteredIcons.map(i => (
                      <button
                        key={i.char}
                        type="button"
                        onClick={() => setF({ ...f, icono: f.icono === i.char ? undefined : i.char })}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all hover:bg-primary/5 active:scale-90 ${f.icono === i.char ? 'bg-primary text-white shadow-lg shadow-primary/20 ring-2 ring-primary/10' : 'bg-background shadow-sm grayscale-[0.5] hover:grayscale-0'}`}
                      >
                        <span className="text-xl">{i.char}</span>
                        <span className={`text-[8px] font-bold truncate w-full text-center leading-none ${f.icono === i.char ? 'text-white/90' : 'text-muted-foreground'}`}>
                          {i.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex gap-2">
                    <Input 
                      value={f.imagen_url || ""} 
                      onChange={(e) => setF({ ...f, imagen_url: e.target.value })} 
                      placeholder="Pegar URL de imagen..." 
                      className="flex-1 h-12 rounded-xl bg-background shadow-sm border-primary/10"
                    />
                    <div className="relative">
                      <input type="file" id="item-upload" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                      <Button 
                        type="button"
                        variant="outline" 
                        className="h-12 w-12 rounded-xl border-primary/10 hover:bg-primary/5 bg-background shadow-sm group"
                        disabled={uploading}
                        onClick={() => document.getElementById('item-upload')?.click()}
                      >
                        {uploading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : <ImageIcon className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Previsualización Grande */}
              <div className="mt-auto pt-4 border-t border-primary/10">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-3 block text-center px-1">Vista Previa</Label>
                <div className="relative aspect-square w-48 mx-auto grid place-items-center rounded-3xl bg-background border-4 border-white shadow-xl overflow-hidden group">
                  <div className="absolute inset-0 bg-primary/5 group-hover:bg-transparent transition-colors" />
                  {mode === "image" && f.imagen_url && !imgError ? (
                    <img 
                      src={f.imagen_url} 
                      alt="preview" 
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 relative z-10">
                      <span className="text-7xl animate-bounce-slow drop-shadow-lg">{f.icono || "👕"}</span>
                      {mode === "image" && imgError && (
                        <p className="text-[10px] font-bold text-destructive px-4 text-center">Error al cargar imagen</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ServDialog({ open, onOpenChange, tenantId, initial, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; tenantId: string;
  initial: Servicio | null; onSaved: () => void;
}) {
  const [f, setF] = useState<Partial<Servicio>>({});
  const [imgError, setImgError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<"emoji" | "image">("emoji");
  const [iconSearch, setIconSearch] = useState("");

  useEffect(() => { 
    if (open) {
      setF(initial ? { ...initial } : { nombre: "", descripcion: "", icono: "🧺", activo: true, precio: 0, is_exento: false, es_muestra: false, permitir_desglose: false, permitir_editar_precio: false });
      setMode(initial?.imagen_url ? "image" : "emoji");
      setImgError(false);
      setIconSearch("");
    }
  }, [open, initial]);

  const filteredIcons = useMemo(() => {
    if (!iconSearch) return LAUNDRY_ICONS;
    const s = iconSearch.toLowerCase();
    return LAUNDRY_ICONS.filter(i => i.label.toLowerCase().includes(s));
  }, [iconSearch]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setUploading(true);
      
      // Comprimir imagen antes de subir
      const compressedDataUrl = await compressImage(file, 800, 800, 0.75);
      const res = await fetch(compressedDataUrl);
      const blob = await res.blob();
      
      const path = `${tenantId}/serv-${uid("img")}.webp`;
      
      const { data, error } = await supabase.storage
        .from('catalogo')
        .upload(path, blob, { contentType: 'image/webp' });
        
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('catalogo')
        .getPublicUrl(path);
        
      setF({ ...f, imagen_url: publicUrl });
      toast.success("Imagen de servicio subida y comprimida");
    } catch (err: any) {
      toast.error("Error al subir: " + (err.message || "Verifica el bucket 'catalogo'"));
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!f.nombre?.trim()) { toast.error("Nombre requerido"); return; }
    const isCloning = initial?.tenant_id === 'admin';
    const s: Servicio = {
      id: isCloning ? uid("srv") : (initial?.id ?? uid("srv")),
      tenant_id: tenantId,
      nombre: f.nombre!.trim(),
      descripcion: f.descripcion?.trim() || undefined,
      icono: mode === "emoji" ? f.icono : undefined,
      imagen_url: mode === "image" ? f.imagen_url : undefined,
      activo: f.activo ?? true,
      precio: Number(f.precio) || 0,
      is_exento: !!f.is_exento,
      permitir_desglose: !!f.permitir_desglose,
      permitir_editar_precio: !!f.permitir_editar_precio,
    };
    await saveServicio(s);
    toast.success(isCloning ? "Servicio personalizado para tu catálogo" : (initial ? "Servicio actualizado" : "Servicio creado"));
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
        <div className="flex flex-col md:flex-row h-full overflow-hidden">
          {/* COLUMNA IZQUIERDA: FORMULARIO */}
          <div className="flex-1 p-6 space-y-4 bg-background">
            <div className="space-y-0.5">
              <h2 className="text-xl font-display font-bold text-primary">{initial ? "Editar servicio" : "Nuevo servicio"}</h2>
              <p className="text-xs text-muted-foreground">Define los servicios de limpieza y arreglos.</p>
            </div>

            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Nombre del Servicio</Label>
                <Input value={f.nombre || ""} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej: Lavado y Secado" className="h-11 rounded-xl bg-white border-border/60 focus-visible:ring-primary/30 shadow-sm" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Descripción (opcional)</Label>
                <Textarea value={f.descripcion || ""} onChange={(e) => setF({ ...f, descripcion: e.target.value })} placeholder="Breve descripción..." rows={2} className="rounded-xl bg-white border-border/60 focus-visible:ring-primary/30 shadow-sm resize-none text-sm" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Precio adicional (RD$)</Label>
                <Input type="number" value={f.precio ?? 0} onChange={(e) => setF({ ...f, precio: Number(e.target.value) })} className="h-11 rounded-xl bg-white border-border/60 focus-visible:ring-primary/30 shadow-sm font-bold" />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10 shadow-sm">
                  <Switch checked={!!f.is_exento} onCheckedChange={(v) => setF({ ...f, is_exento: v })} />
                  <div className="space-y-0">
                    <Label className="text-xs font-bold text-primary">Exento ITBIS</Label>
                    <p className="text-[9px] text-muted-foreground leading-none">Ind: 3</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-border/60 shadow-sm">
                  <Switch checked={f.activo ?? true} onCheckedChange={(v) => setF({ ...f, activo: v })} />
                  <div className="space-y-0">
                    <Label className="text-xs font-bold text-primary">Servicio Activo</Label>
                    <p className="text-[10px] text-muted-foreground leading-none">Disponible.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-border/60 shadow-sm">
                  <Switch checked={!!f.permitir_desglose} onCheckedChange={(v) => setF({ ...f, permitir_desglose: v })} />
                  <div className="space-y-0">
                    <Label className="text-xs font-bold text-primary">Habilitar desglose</Label>
                    <p className="text-[10px] text-muted-foreground leading-none">Permitir desglosar este servicio al crear una orden.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-border/60 shadow-sm">
                  <Switch checked={!!f.permitir_editar_precio} onCheckedChange={(v) => setF({ ...f, permitir_editar_precio: v })} />
                  <div className="space-y-0">
                    <Label className="text-xs font-bold text-primary">Permitir editar precio</Label>
                    <p className="text-[10px] text-muted-foreground leading-none">Permitir modificar el precio de este servicio al crear una orden.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)} 
                style={{ borderRadius: '0.7rem', paddingInline: 'calc(var(--spacing) * 5)', height: 'calc(var(--spacing) * 9)' }}
                className="font-bold bg-white border-primary/10 shadow-sm text-muted-foreground hover:bg-accent/5"
              >
                Cancelar
              </Button>
              <Button 
                onClick={submit} 
                style={{ borderRadius: '0.7rem', paddingInline: 'calc(var(--spacing) * 5)', height: 'calc(var(--spacing) * 9)' }}
                className="bg-[#1a3eb3] hover:bg-[#1a3eb3]/90 text-white font-bold shadow-sm"
              >
                {initial ? "Guardar" : "Crear servicio"}
              </Button>
            </div>
          </div>

          {/* COLUMNA DERECHA: IDENTIFICADOR VISUAL */}
          <div className="w-full md:w-[360px] bg-primary/5 p-6 flex flex-col gap-4 border-l border-primary/10">
            <div className="space-y-0.5 text-center md:text-left">
              <h3 className="text-md font-display font-bold text-primary">Iconografía</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Identidad visual</p>
            </div>

            <div className="space-y-4">
              {/* Selector de Modo */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-primary/10 shadow-sm">
                <Label className="font-bold text-xs">Usar Imagen</Label>
                <Switch 
                  id="mode-toggle-serv-split-v2"
                  checked={mode === "image"} 
                  onCheckedChange={(v) => setMode(v ? "image" : "emoji")}
                  className="data-[state=checked]:bg-primary scale-90"
                />
              </div>

              {/* Contenido según Modo */}
              {mode === "emoji" ? (
                <div className="space-y-3 animate-in fade-in zoom-in-95 duration-300">
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <input 
                      type="text"
                      placeholder="Buscar..."
                      value={iconSearch}
                      onChange={(e) => setIconSearch(e.target.value)}
                      className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/20 text-[11px]"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 rounded-xl bg-background/50 border border-primary/5 shadow-inner no-scrollbar">
                    {filteredIcons.map(i => (
                      <button
                        key={i.char}
                        type="button"
                        onClick={() => setF({ ...f, icono: f.icono === i.char ? undefined : i.char })}
                        className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all ${f.icono === i.char ? 'bg-primary text-white shadow-md ring-2 ring-primary/10' : 'bg-background hover:bg-primary/5 shadow-sm'}`}
                      >
                        <span className="text-lg">{i.char}</span>
                        <span className={`text-[7px] font-bold truncate w-full text-center leading-none ${f.icono === i.char ? 'text-white' : 'text-muted-foreground'}`}>
                          {i.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex gap-2">
                    <Input 
                      value={f.imagen_url || ""} 
                      onChange={(e) => setF({ ...f, imagen_url: e.target.value })} 
                      placeholder="URL..." 
                      className="flex-1 h-10 rounded-lg bg-background text-xs"
                    />
                    <div className="relative">
                      <input type="file" id="serv-upload-v2" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                      <Button 
                        type="button"
                        variant="outline" 
                        className="h-10 w-10 rounded-lg border-primary/10 bg-background shadow-sm"
                        disabled={uploading}
                        onClick={() => document.getElementById('serv-upload-v2')?.click()}
                      >
                        {uploading ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : <ImageIcon className="h-4 w-4 text-primary" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Previsualización Compacta */}
              <div className="pt-2 border-t border-primary/10">
                <div className="relative aspect-square w-32 mx-auto grid place-items-center rounded-2xl bg-background border-4 border-white shadow-lg overflow-hidden group">
                  {mode === "image" && f.imagen_url && !imgError ? (
                    <img 
                      src={f.imagen_url} 
                      alt="preview" 
                      className="h-full w-full object-cover" 
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 relative z-10">
                      <span className="text-5xl drop-shadow-md">{f.icono || "🧺"}</span>
                      {mode === "image" && imgError && (
                        <p className="text-[8px] font-bold text-destructive px-2 text-center">Error</p>
                      )}
                    </div>
                  )}
                </div>
                <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold mt-2 block text-center">Vista Previa</Label>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const SAMPLE_PRENDAS: Array<Omit<CatalogoItem, "id" | "tenant_id">> = [
  // Camisas
  { categoria: "Camisas", nombre: "Camisa manga larga", precio: 180, activo: true, icono: "👔", imagen_url: "/samples/Prendas/Camisa manga larga.webp" },
  { categoria: "Camisas", nombre: "Camisa manga corta", precio: 150, activo: true, icono: "👔", imagen_url: "/samples/Prendas/Camisa manga corta.webp" },
  { categoria: "Camisas", nombre: "Polo", precio: 120, activo: true, icono: "👕", imagen_url: "/samples/Prendas/Polo.webp" },
  { categoria: "Camisas", nombre: "Camiseta básica", precio: 90, activo: true, icono: "👕", imagen_url: "/samples/Prendas/Camiseta basica.webp" },
  // Pantalones
  { categoria: "Pantalones", nombre: "Pantalón casual", precio: 180, activo: true, icono: "👖", imagen_url: "/samples/Prendas/Pantalon casual.webp" },
  { categoria: "Pantalones", nombre: "Pantalón de vestir", precio: 200, activo: true, icono: "👖", imagen_url: "/samples/Prendas/Pantalon de vestir.webp" },
  { categoria: "Pantalones", nombre: "Jeans", precio: 170, activo: true, icono: "👖", imagen_url: "/samples/Prendas/Jeans.webp" },
  { categoria: "Pantalones", nombre: "Short", precio: 110, activo: true, icono: "🩳", imagen_url: "/samples/Prendas/Short.webp" },
  // Vestir
  { categoria: "Vestir", nombre: "Vestido corto", precio: 320, activo: true, icono: "👗", imagen_url: "/samples/Prendas/Vestido corto.webp" },
  { categoria: "Vestir", nombre: "Vestido largo", precio: 420, activo: true, icono: "👗", imagen_url: "/samples/Prendas/Vestido largo.webp" },
  { categoria: "Vestir", nombre: "Blusa", precio: 130, activo: true, icono: "👚", imagen_url: "/samples/Prendas/Blusa.webp" },
  { categoria: "Vestir", nombre: "Falda", precio: 160, activo: true, icono: "🩱", imagen_url: "/samples/Prendas/Falda.webp" },
  { categoria: "Vestir", nombre: "Blazer / chaqueta", precio: 280, activo: true, icono: "🧥", imagen_url: "/samples/Prendas/Blazer chaqueta.webp" },
  { categoria: "Vestir", nombre: "Traje completo (2 pzs)", precio: 550, activo: true, icono: "🤵", imagen_url: "/samples/Prendas/Traje completo (2 pzs).webp" },
  { categoria: "Vestir", nombre: "Corbata", precio: 80, activo: true, icono: "👔", imagen_url: "/samples/Prendas/Corbata.webp" },
  { categoria: "Vestir", nombre: "Abrigo", precio: 480, activo: true, icono: "🧥", imagen_url: "/samples/Prendas/Abrigo.webp" },
  // Hogar
  { categoria: "Hogar", nombre: "Sábana individual", precio: 180, activo: true, icono: "🛏️", imagen_url: "/samples/Prendas/Sabana individual.webp" },
  { categoria: "Hogar", nombre: "Sábana matrimonial", precio: 220, activo: true, icono: "🛏️", imagen_url: "/samples/Prendas/Sabana individual.webp" },
  { categoria: "Hogar", nombre: "Sábana king", precio: 280, activo: true, icono: "🛏️", imagen_url: "/samples/Prendas/Sabana individual.webp" },
  { categoria: "Hogar", nombre: "Edredón matrimonial", precio: 450, activo: true, icono: "🛌", imagen_url: "/samples/Prendas/Edredon.webp" },
  { categoria: "Hogar", nombre: "Edredón king", precio: 550, activo: true, icono: "🛌", imagen_url: "/samples/Prendas/Edredon.webp" },
  { categoria: "Hogar", nombre: "Funda de almohada", precio: 60, activo: true, icono: "🛋️", imagen_url: "/samples/Prendas/Funda de almohada.webp" },
  { categoria: "Hogar", nombre: "Toalla pequeña", precio: 60, activo: true, icono: "🧻", imagen_url: "/samples/Prendas/Toalla pequena.webp" },
  { categoria: "Hogar", nombre: "Toalla grande", precio: 100, activo: true, icono: "🧖", imagen_url: "/samples/Prendas/Toalla grande.webp" },
  { categoria: "Hogar", nombre: "Mantel", precio: 180, activo: true, icono: "🍽️", imagen_url: "/samples/Prendas/Mantel.webp" },
  { categoria: "Hogar", nombre: "Cortina", precio: 320, activo: true, icono: "🪟", imagen_url: "/samples/Prendas/Cortina.webp" },
  { categoria: "Hogar", nombre: "Cobertor / frazada", precio: 380, activo: true, icono: "🧶", imagen_url: "/samples/Prendas/Cobertor frazada.webp" },
  // Por libra
  { categoria: "Por libra", nombre: "Lavado por libra", precio: 80, por_libra: true, activo: true, icono: "⚖️", imagen_url: "/samples/Prendas/Lavado por libra.webp" },
  { categoria: "Por libra", nombre: "Lavado y planchado por libra", precio: 110, por_libra: true, activo: true, icono: "⚖️", imagen_url: "/samples/Prendas/Lavado y planchado por libra.webp" },
  // Especial
  { categoria: "Especial", nombre: "Uniforme escolar", precio: 200, activo: true, icono: "🎒", imagen_url: "/samples/Prendas/Uniforme escolar.webp" },
  { categoria: "Especial", nombre: "Uniforme médico", precio: 220, activo: true, icono: "🥼", imagen_url: "/samples/Prendas/Uniforme medico.webp" },
  { categoria: "Especial", nombre: "Bata / kimono", precio: 240, activo: true, icono: "🥻", imagen_url: "/samples/Prendas/Bata kimono.webp" },
  { categoria: "Especial", nombre: "Pijama", precio: 150, activo: true, icono: "🛌", imagen_url: "/samples/Prendas/Pijama.webp" },
  { categoria: "Especial", nombre: "Ropa interior hombre", precio: 40, activo: true, icono: "🩲", imagen_url: "/samples/Prendas/Ropa interior hombre.webp" },
  { categoria: "Especial", nombre: "Ropa interior mujer", precio: 40, activo: true, icono: "👙", imagen_url: "/samples/Prendas/Ropa interior mujer.webp" },
  { categoria: "Especial", nombre: "Calcetines (par)", precio: 40, activo: true, icono: "🧦", imagen_url: "/samples/Prendas/Calcetines (par).webp" },
  { categoria: "Especial", nombre: "Bufanda", precio: 120, activo: true, icono: "🧣", imagen_url: "/samples/Prendas/Bufanda.webp" },
  { categoria: "Especial", nombre: "Gorra", precio: 90, activo: true, icono: "🧢", imagen_url: "/samples/Prendas/Gorra.webp" },
  { categoria: "Especial", nombre: "Mochila", precio: 250, activo: true, icono: "🎒", imagen_url: "/samples/Prendas/Mochila.webp" },
  { categoria: "Especial", nombre: "Tenis / zapatillas", precio: 300, activo: true, icono: "👟", imagen_url: "/samples/Prendas/Tenis zapatillas.webp" },
  // Bebé
  { categoria: "Bebé", nombre: "Body de bebé", precio: 70, activo: true, icono: "👶", imagen_url: "/samples/Prendas/Body de bebe.webp" },
  { categoria: "Bebé", nombre: "Manta de bebé", precio: 140, activo: true, icono: "🧸", imagen_url: "/samples/Prendas/Manta de bebe.webp" },
];

const SAMPLE_SERVICIOS: Array<Omit<Servicio, "id" | "tenant_id">> = [
  { nombre: "Lavado y secado", descripcion: "Lavado completo + secadora", icono: "🧺", activo: true, precio: 0, imagen_url: "/samples/Servicios/Lavado y secado.webp" },
  { nombre: "Solo lavado", descripcion: "Solo lavado en agua", icono: "💧", activo: true, precio: 0, imagen_url: "/samples/Servicios/Solo lavado.webp" },
  { nombre: "Solo secado", descripcion: "Únicamente secadora", icono: "🌬️", activo: true, precio: 0, imagen_url: "/samples/Servicios/Solo secado.webp" },
  { nombre: "Planchado", descripcion: "Planchado profesional", icono: "♨️", activo: true, precio: 0, imagen_url: "/samples/Servicios/Planchado.webp" },
  { nombre: "Lavado en seco", descripcion: "Dry cleaning para prendas delicadas", icono: "✨", activo: true, precio: 50, imagen_url: "/samples/Servicios/Lavado en seco.webp" },
  { nombre: "Sastrería", descripcion: "Arreglos y costura", icono: "🪡", activo: true, precio: 100, imagen_url: "/samples/Servicios/Sastreria.webp" },
  { nombre: "Tapicería", descripcion: "Limpieza de muebles y tapizados", icono: "🛋️", activo: true, precio: 500, imagen_url: "/samples/Servicios/Tapiceria.webp" },
  { nombre: "Alfombras", descripcion: "Lavado de alfombras y tapetes", icono: "🟫", activo: true, precio: 300, imagen_url: "/samples/Servicios/Alfombras.webp" },
];

async function seedSamplePrendas(tenantId: string) {
  if (!tenantId) return;
  const existing = await getCatalogo(tenantId);
  const existingMap = new Map(existing.map(i => [`${i.categoria}::${i.nombre}`.toLowerCase(), i]));
  
  await Promise.all(SAMPLE_PRENDAS.map(async (p) => {
    const key = `${p.categoria}::${p.nombre}`.toLowerCase();
    const current = existingMap.get(key);
    
    if (!current) {
      // Crear nueva
      await saveCatalogoItem({ ...p, id: uid("cat"), tenant_id: tenantId });
    } else if (current.imagen_url !== p.imagen_url) {
      // Actualizar/Reparar imagen si el path cambió o faltaba
      await saveCatalogoItem({ ...current, imagen_url: p.imagen_url });
    }
  }));
}

async function seedSampleServicios(tenantId: string) {
  if (!tenantId) return;
  const existing = await getServicios(tenantId);
  const existingMap = new Map(existing.map(s => [s.nombre.toLowerCase(), s]));
  
  await Promise.all(SAMPLE_SERVICIOS.map(async (s) => {
    const key = s.nombre.toLowerCase();
    const current = existingMap.get(key);
    
    if (!current) {
      // Crear nuevo
      await saveServicio({ ...s, id: uid("srv"), tenant_id: tenantId });
    } else if (current.imagen_url !== s.imagen_url) {
      // Actualizar/Reparar imagen si el path cambió o faltaba
      await saveServicio({ ...current, imagen_url: s.imagen_url });
    }
  }));
}
