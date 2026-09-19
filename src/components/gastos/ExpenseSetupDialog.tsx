/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
/* Hallmark · macrostructure: Workbench · genre: modern-minimal · designed-as-app */
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Building2,
  Calendar,
  CalendarClock,
  Check,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  FolderPlus,
  Layers3,
  Palette,
  Plus,
  Receipt,
  RotateCcw,
  Tag,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  archiveGastoPlantilla,
  deleteGastoCategoria,
  formatAmountInput,
  formatRD,
  saveGastoCategoria,
  saveGastoPlantilla,
  uid,
  type FrecuenciaGasto,
  type GastoCategoria,
  type GastoPlantilla,
  type Suplidor,
} from "@/lib/storage";

export const CATEGORY_COLORS = [
  { id: "slate", label: "Gris pizarra", bg: "bg-slate-500", text: "text-slate-600 dark:text-slate-400", lightBg: "bg-slate-100 dark:bg-slate-800", ring: "ring-slate-400/20" },
  { id: "blue", label: "Azul clásico", bg: "bg-blue-600", text: "text-blue-600 dark:text-blue-400", lightBg: "bg-blue-50 dark:bg-blue-950/50", ring: "ring-blue-500/20" },
  { id: "indigo", label: "Azul añil", bg: "bg-indigo-600", text: "text-indigo-600 dark:text-indigo-400", lightBg: "bg-indigo-50 dark:bg-indigo-950/50", ring: "ring-indigo-500/20" },
  { id: "teal", label: "Turquesa", bg: "bg-teal-500", text: "text-teal-600 dark:text-teal-400", lightBg: "bg-teal-50 dark:bg-teal-950/50", ring: "ring-teal-500/20" },
  { id: "emerald", label: "Verde esmeralda", bg: "bg-emerald-600", text: "text-emerald-600 dark:text-emerald-400", lightBg: "bg-emerald-50 dark:bg-emerald-950/50", ring: "ring-emerald-500/20" },
  { id: "amber", label: "Ámbar dorado", bg: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", lightBg: "bg-amber-50 dark:bg-amber-950/50", ring: "ring-amber-500/20" },
  { id: "orange", label: "Naranja", bg: "bg-orange-500", text: "text-orange-600 dark:text-orange-400", lightBg: "bg-orange-50 dark:bg-orange-950/50", ring: "ring-orange-500/20" },
  { id: "rose", label: "Rosa coral", bg: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", lightBg: "bg-rose-50 dark:bg-rose-950/50", ring: "ring-rose-500/20" },
  { id: "purple", label: "Púrpura", bg: "bg-purple-600", text: "text-purple-600 dark:text-purple-400", lightBg: "bg-purple-50 dark:bg-purple-950/50", ring: "ring-purple-500/20" },
];

export function getCategoryColor(colorId?: string) {
  return CATEGORY_COLORS.find((c) => c.id === colorId) || CATEGORY_COLORS[0];
}

function formatDMY(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const parts = dateStr.slice(0, 10).split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
}

function nextDateFor(frequency: FrecuenciaGasto, dueDay: number): string {
  const next = new Date();
  if (frequency === "SEMANAL") next.setDate(next.getDate() + 7);
  if (frequency === "MENSUAL") next.setMonth(next.getMonth() + 1);
  if (frequency === "TRIMESTRAL") next.setMonth(next.getMonth() + 3);
  if (frequency === "ANUAL") next.setFullYear(next.getFullYear() + 1);
  if (frequency !== "SEMANAL")
    next.setDate(Math.min(dueDay, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
  return next.toISOString().slice(0, 10);
}

export function ExpenseSetupDialog({
  open,
  onOpenChange,
  tenantId,
  categories,
  templates,
  suppliers,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  categories: GastoCategoria[];
  templates: GastoPlantilla[];
  suppliers: Suplidor[];
  onChanged: () => void;
}) {
  const activeCategories = useMemo(() => categories.filter((item) => item.activo), [categories]);
  const [categoryName, setCategoryName] = useState("");
  const [categoryColor, setCategoryColor] = useState("slate");
  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [supplierId, setSupplierId] = useState("none");
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [defaultAmount, setDefaultAmount] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState<FrecuenciaGasto>("MENSUAL");
  const [dueDay, setDueDay] = useState(String(new Date().getDate()));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!categoryId && activeCategories[0]) setCategoryId(activeCategories[0].id);
  }, [activeCategories, categoryId]);

  async function addCategory() {
    const name = categoryName.trim();
    if (!name) return;
    if (
      categories.some(
        (item) => item.nombre.localeCompare(name, "es", { sensitivity: "base" }) === 0,
      )
    ) {
      toast.error("Ya existe una categoría con ese nombre.");
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await saveGastoCategoria({
        id: uid("gcat"),
        tenant_id: tenantId,
        nombre: name,
        icono: "tag",
        color: categoryColor,
        activo: true,
        orden: categories.length,
        creado_en: now,
        actualizado_en: now,
      });
      setCategoryName("");
      onChanged();
      toast.success(`Categoría "${name}" creada correctamente`);
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(category: GastoCategoria) {
    try {
      await deleteGastoCategoria(category.id, tenantId);
      onChanged();
      toast.success(`Categoría "${category.nombre}" eliminada correctamente`);
    } catch (err: any) {
      toast.error("Error al eliminar la categoría.");
    }
  }

  async function addTemplate() {
    const name = templateName.trim();
    const category = categories.find((item) => item.id === categoryId);
    if (!name || !category) {
      toast.error("Escribe un nombre y selecciona una categoría.");
      return;
    }
    if (
      templates.some(
        (item) =>
          item.nombre.localeCompare(name, "es", { sensitivity: "base" }) === 0 && item.activo,
      )
    ) {
      toast.error("Ya existe una plantilla activa con ese nombre.");
      return;
    }
    const supplier = suppliers.find((item) => item.id === supplierId);
    const parsedAmount = Number(defaultAmount.replace(/,/g, ""));
    const parsedDay = Math.min(31, Math.max(1, Number(dueDay) || 1));
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await saveGastoPlantilla({
        id: uid("gtpl"),
        tenant_id: tenantId,
        nombre: name,
        descripcion: description.trim() || name,
        categoria_id: category.id,
        categoria_nombre: category.nombre,
        suplidor_id: supplier?.id,
        proveedor_nombre: supplier?.nombre_comercial,
        metodo_pago: paymentMethod,
        monto_predeterminado: parsedAmount > 0 ? parsedAmount : undefined,
        es_recurrente: recurring,
        frecuencia: recurring ? frequency : undefined,
        dia_vencimiento: recurring ? parsedDay : undefined,
        proxima_fecha: recurring ? nextDateFor(frequency, parsedDay) : undefined,
        activo: true,
        usos: 0,
        creado_en: now,
        actualizado_en: now,
      });
      setTemplateName("");
      setDescription("");
      setDefaultAmount("");
      setSupplierId("none");
      setRecurring(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function archiveTemplate(template: GastoPlantilla) {
    await archiveGastoPlantilla(template.id, tenantId);
    onChanged();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-xl p-0 overflow-hidden border-none shadow-2xl bg-background text-foreground max-h-[92vh] flex flex-col">
        <Tabs defaultValue="templates" className="flex flex-col min-h-0 flex-1">
          {/* HEADER CON STEPPER / TABS ESTILO /CLIENTES */}
          <div className="bg-slate-50/70 dark:bg-slate-900/60 p-3.5 sm:p-4 pb-2.5 relative border-b border-slate-100 dark:border-slate-800/60 shrink-0">
            <div className="flex items-center justify-between mb-2.5 pr-10">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/15 shadow-xs shrink-0">
                  <Layers3 className="h-4.5 w-4.5" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-display font-bold text-foreground">
                    Organizar gastos
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    Plantillas y categorías reutilizables para tu negocio
                  </p>
                </div>
              </div>
            </div>

            {/* PESTAÑAS CON COLOR DE FONDO E ICONOS SVG */}
            <TabsList className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-200/60 dark:bg-slate-800/80 h-auto w-full">
              <TabsTrigger
                value="templates"
                className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <Zap className="h-4 w-4" />
                <span>Plantillas y recurrentes</span>
                {templates.filter((item) => item.activo).length > 0 && (
                  <span className="h-5 min-w-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-extrabold data-[state=active]:bg-white/25 data-[state=active]:text-white bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {templates.filter((item) => item.activo).length}
                  </span>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="categories"
                className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <Tag className="h-4 w-4" />
                <span>Categorías</span>
                {activeCategories.length > 0 && (
                  <span className="h-5 min-w-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-extrabold data-[state=active]:bg-white/25 data-[state=active]:text-white bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {activeCategories.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* CUERPO DEL DIALOG CON DESPLAZAMIENTO */}
          <div className="px-4 sm:px-5 py-3.5 overflow-y-auto custom-scrollbar flex-1">
            {/* TAB 1: PLANTILLAS Y RECURRENTES */}
            <TabsContent value="templates" className="mt-0 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Nombre de la plantilla */}
                <div className="space-y-1.5">
                  <Label htmlFor="expense-template-name" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Nombre de la plantilla *
                  </Label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                    <Input
                      id="expense-template-name"
                      value={templateName}
                      onChange={(event) => setTemplateName(event.target.value)}
                      placeholder="Ej. Factura de electricidad"
                      className="h-10 pl-9.5 rounded-xl text-xs sm:text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs"
                    />
                  </div>
                </div>

                {/* Suplidor predeterminado */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Suplidor predeterminado
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger className="h-10 pl-9.5 rounded-xl text-xs sm:text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg">
                        <SelectItem value="none">Sin suplidor fijo</SelectItem>
                        {suppliers
                          .filter((item) => item.activo)
                          .map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.nombre_comercial}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Concepto predeterminado */}
                <div className="space-y-1.5">
                  <Label htmlFor="expense-template-description" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Concepto predeterminado
                  </Label>
                  <div className="relative">
                    <Receipt className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                    <Input
                      id="expense-template-description"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Ej. Energía eléctrica del local"
                      className="h-10 pl-9.5 rounded-xl text-xs sm:text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs"
                    />
                  </div>
                </div>

                {/* Monto habitual opcional */}
                <div className="space-y-1.5">
                  <Label htmlFor="expense-default-amount" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Monto habitual opcional
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                    <Input
                      id="expense-default-amount"
                      inputMode="decimal"
                      value={defaultAmount}
                      onChange={(event) =>
                        setDefaultAmount(formatAmountInput(event.target.value))
                      }
                      placeholder="0.00"
                      className="h-10 pl-9.5 rounded-xl text-xs sm:text-sm font-medium font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs"
                    />
                  </div>
                </div>

                {/* Categoría */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Categoría *
                  </Label>
                  <div className="relative">
                    <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger className="h-10 pl-9.5 rounded-xl text-xs sm:text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg">
                        {activeCategories.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Método de pago */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Método de pago
                  </Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="h-10 pl-9.5 rounded-xl text-xs sm:text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg">
                        {["Efectivo", "Transferencia", "Tarjeta", "Cheque"].map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Configuración Recurrente */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-3 sm:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <CalendarClock className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">Gasto recurrente</p>
                        <p className="text-[11px] text-muted-foreground">
                          Calcula el próximo vencimiento de este pago
                        </p>
                      </div>
                    </div>
                    <Switch checked={recurring} onCheckedChange={setRecurring} />
                  </div>
                  {recurring && (
                    <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-800 grid grid-cols-2 gap-3 animate-in fade-in duration-150">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          Frecuencia
                        </Label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none z-10" />
                          <Select
                            value={frequency}
                            onValueChange={(value) => setFrequency(value as FrecuenciaGasto)}
                          >
                            <SelectTrigger className="h-9.5 pl-8.5 rounded-xl text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg">
                              {[
                                { id: "SEMANAL", label: "Semanal" },
                                { id: "MENSUAL", label: "Mensual" },
                                { id: "TRIMESTRAL", label: "Trimestral" },
                                { id: "ANUAL", label: "Anual" },
                              ].map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          Día de vencimiento
                        </Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
                          <Input
                            inputMode="numeric"
                            value={dueDay}
                            onChange={(event) =>
                              setDueDay(event.target.value.replace(/\D/g, "").slice(0, 2))
                            }
                            aria-label="Día de vencimiento"
                            placeholder="Día (1-31)"
                            className="h-9.5 pl-8.5 rounded-xl text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Botón Guardar Plantilla */}
                <Button
                  onClick={addTemplate}
                  disabled={saving}
                  className="sm:col-span-2 h-10 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <Plus className="h-4 w-4" /> Crear plantilla
                </Button>
              </div>

              {/* Lista de plantillas guardadas */}
              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Plantillas activas ({templates.filter((item) => item.activo).length})
                  </span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {templates
                    .filter((item) => item.activo)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 px-3 py-2.5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          {item.es_recurrente ? (
                            <CalendarClock className="h-4 w-4" />
                          ) : (
                            <Receipt className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-xs font-bold text-foreground">{item.nombre}</p>
                            {item.monto_predeterminado ? (
                              <span className="font-mono text-[11px] font-bold text-foreground/85 tabular-nums">
                                {formatRD(item.monto_predeterminado)}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            <span className="inline-flex items-center gap-1 rounded-md bg-primary text-white px-2 py-0.5 text-[10.5px] font-bold shadow-2xs tracking-wide">
                              <span>
                                {item.categoria_nombre}
                                {item.proxima_fecha ? ` · Próx: ${formatDMY(item.proxima_fecha)}` : ""}
                              </span>
                            </span>
                            {item.proveedor_nombre ? (
                              <span className="text-[11px] text-muted-foreground truncate">
                                {item.proveedor_nombre}
                              </span>
                            ) : null}
                            {item.frecuencia ? (
                              <span className="text-[10px] font-semibold text-muted-foreground/75 capitalize">
                                • {item.frecuencia.toLowerCase()}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => archiveTemplate(item)}
                          aria-label={`Archivar ${item.nombre}`}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer transition-colors"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  {templates.filter((item) => item.activo).length === 0 && (
                    <p className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-muted-foreground">
                      Aún no hay plantillas. Crea la primera con el formulario superior.
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: CATEGORÍAS */}
            <TabsContent value="categories" className="mt-0 space-y-4">
              <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3.5 shadow-xs">
                <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
                  <div className="space-y-1.5">
                    <Label htmlFor="expense-category-name" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      Nombre de la categoría *
                    </Label>
                    <div className="relative">
                      <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                      <Input
                        id="expense-category-name"
                        value={categoryName}
                        onChange={(event) => setCategoryName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void addCategory();
                        }}
                        placeholder="Ej. Seguros, Alquiler..."
                        className="h-10 pl-9.5 rounded-xl text-xs sm:text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">Color distintivo</Label>
                    <div className="relative">
                      <Palette className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none z-10" />
                      <Select value={categoryColor} onValueChange={setCategoryColor}>
                        <SelectTrigger className="h-10 pl-8.5 rounded-xl text-xs sm:text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                          <div className="flex items-center gap-2 truncate">
                            <span className={`h-3.5 w-3.5 rounded-full shrink-0 ${CATEGORY_COLORS.find((c) => c.id === categoryColor)?.bg || "bg-slate-500"} ring-1 ring-black/15`} />
                            <span className="truncate">{CATEGORY_COLORS.find((c) => c.id === categoryColor)?.label || "Gris pizarra"}</span>
                          </div>
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg">
                          {CATEGORY_COLORS.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              <div className="flex items-center gap-2">
                                <span className={`h-3.5 w-3.5 rounded-full shrink-0 ${item.bg} ring-1 ring-black/15`} />
                                <span className="font-medium text-xs sm:text-sm">{item.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={addCategory}
                  disabled={saving}
                  className="w-full h-10 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <FolderPlus className="h-4 w-4" /> Añadir categoría
                </Button>
              </div>

              {/* Lista de categorías */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Categorías configuradas ({categories.length})
                </Label>
                <div className="grid gap-2 sm:grid-cols-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                  {categories.map((item) => {
                    const colorObj = getCategoryColor(item.color);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 px-3 py-2.5 shadow-2xs transition-colors hover:border-slate-300 dark:hover:border-slate-700"
                      >
                        <div
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 transition-colors",
                            colorObj.lightBg,
                            colorObj.text,
                            colorObj.ring,
                          )}
                        >
                          <Tag className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1 flex items-center gap-2">
                          <span
                            className={cn("h-2 w-2 rounded-full shrink-0", colorObj.bg)}
                            title={colorObj.label}
                          />
                          <span className="truncate text-xs font-bold text-foreground">
                            {item.nombre}
                          </span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteCategory(item)}
                          aria-label={`Eliminar ${item.nombre}`}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                  {categories.length === 0 && (
                    <p className="col-span-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-muted-foreground">
                      No hay categorías configuradas. Añade una arriba.
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
