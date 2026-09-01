import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { encodeEscPos, encodeMarquillasEscPos, printBrowserElementsIndividually, printDirectRaw } from "@/lib/impresora";
import { supabase } from "@/lib/supabase";
import { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
import {
  Palette,
  Split,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Search,
  UserPlus,
  Check,
  AlertTriangle,
  Printer,
  Phone,
  Shirt,
  Truck,
  Maximize,
  Minimize,
  LayoutGrid,
  List,
  Receipt,
  ShoppingCart,
  User as UserIcon,
  X,
  Minus,
  CheckCircle2,
  Loader2,
  Building,
  Timer,
  Scale,
  WashingMachine,
  CreditCard,
  CornerDownLeft,
  Percent,
  Box,
  Calendar as CalendarIcon,
  Clock,
  CalendarDays,
  FileText,
  ChevronDown,
  ChevronUp,
  Building2,
  Banknote,
  Sparkles,
  Tag,
  Layers,
  Package,
  MapPin,
  WifiOff,
  Lock,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { Ticket } from "@/components/klynn/Ticket";
import { MarquillasTicket } from "@/components/klynn/MarquillasTicket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Calendar } from "@/components/ui/calendar";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AddressAutocomplete, type AddressData } from "@/components/klynn/logistica/AddressAutocomplete";
import {
  getClientes,
  getOrdenes,
  saveCliente,
  getEmpleadoById,
  getCatalogo,
  getServicios,
  getCajaAbierta,
  saveOrden,
  saveMovimiento,
  nextOrdenNumero,
  formatRD,
  formatPhoneRD,
  uid,
  DEFAULT_CONFIG,
  formatAmountInput,
  parseAmount,
  saveTenant,
  getTenantPlan,
  checkPlanLimits,
  getECFConfig,
  getECFSequences,
  nextECFNumero,
  saveECFDocument,
  isModuleEnabled,
  type Cliente,
  type OrdenItem,
  type MetodoPago,
  type PagoDesgloseItem,
  type Orden,
  type CatalogoItem,
  type Servicio,
  type Caja,
  type ECFConfig,
  type ECFSequence,
  type ECFDocument,
  type Empleado,
  type Tenant,
  NCF_NOMBRES,
} from "@/lib/storage";
import { emitirECF, getNextNumberPronesoft } from "@/lib/fiscal";
import { notificarWhatsApp } from "@/lib/whatsapp";
import { getProneSoftClient } from "@/lib/fiscal/pronesoft-client";
import { PlanLimitModal } from "@/components/klynn/PlanLimitModal";
import { ClienteDialog } from "@/components/klynn/ClienteDialog";
import {
  useCatalogo,
  useServicios,
  useClientes,
  useOrdenes,
  useCajaAbierta,
  useECFConfig,
  usePlans,
  useECFSequences,
} from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PriceInput } from "@/components/klynn/PriceInput";
import { PendingCollectionsDialog } from "@/components/klynn/PendingCollectionsDialog";
import { UbicacionSelectorDialog } from "@/components/klynn/UbicacionSelectorDialog";

export const Route = createFileRoute("/t/$slug/nueva-orden")({
  component: NuevaOrdenPage,
});

function isConnectivityFailure(error: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const message = error instanceof Error ? error.message : String(error || "");
  return /failed to fetch|networkerror|network request failed|load failed|connection (?:refused|reset)|err_(?:internet_disconnected|network_changed|connection)/i.test(message);
}

const OPCIONES_CREDITO = [
  { dias: 10, label: "10 días" },
  { dias: 15, label: "15 días" },
  { dias: 30, label: "30 días" },
  { dias: 45, label: "45 días" },
  { dias: 60, label: "60 días" },
  { dias: 90, label: "90 días" },
];


// ==================== COLOR SELECTOR & ITEM NOTES ====================

const PRESET_COLORS = [
  { name: "Blanco", hex: "#FFFFFF", border: true },
  { name: "Negro", hex: "#1E293B" },
  { name: "Azul Marino", hex: "#1E3A8A" },
  { name: "Azul Claro", hex: "#60A5FA" },
  { name: "Rojo", hex: "#DC2626" },
  { name: "Verde", hex: "#16A34A" },
  { name: "Amarillo", hex: "#EAB308" },
  { name: "Beige", hex: "#D4B996" },
  { name: "Gris", hex: "#6B7280" },
  { name: "Rosado", hex: "#EC4899" },
  { name: "Morado", hex: "#7C3AED" },
  { name: "Marrón", hex: "#78350F" },
  { name: "Estampado", hex: "linear-gradient(135deg, #FF0080, #7928CA, #00DFD8)", isGradient: true },
];

function ColorSelectorPopover({
  color,
  onSelectColor,
}: {
  color?: string;
  onSelectColor: (colorName: string, colorHex?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [customText, setCustomText] = useState("");

  const selectedPreset = PRESET_COLORS.find(
    (c) => c.name.toLowerCase() === (color || "").toLowerCase()
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {color ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700 transition-all shadow-2xs group cursor-pointer max-w-[130px]"
            title={`Color: ${color}. Clic para cambiar`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/20"
              style={{
                background: selectedPreset?.isGradient
                  ? selectedPreset.hex
                  : selectedPreset?.hex || "#94A3B8",
              }}
            />
            <span className="truncate">{color}</span>
            <span
              className="ml-0.5 text-slate-400 hover:text-destructive text-[11px] leading-none"
              onClick={(e) => {
                e.stopPropagation();
                onSelectColor("", "");
              }}
            >
              ×
            </span>
          </button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-2 text-[10px] font-bold gap-1 rounded-lg bg-background hover:bg-accent border-dashed border-primary/30 text-primary hover:text-primary transition-all cursor-pointer shadow-2xs"
          >
            <Palette className="h-2.5 w-2.5" />
            <span>Color</span>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 rounded-2xl shadow-xl z-50 bg-popover" align="start">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-primary" /> Selector de Color
            </span>
            {color && (
              <button
                type="button"
                onClick={() => {
                  onSelectColor("", "");
                  setOpen(false);
                }}
                className="text-[10px] font-bold text-destructive hover:underline cursor-pointer"
              >
                Quitar
              </button>
            )}
          </div>

          <div className="grid grid-cols-6 gap-1.5">
            {PRESET_COLORS.map((pc) => {
              const isSel = (color || "").toLowerCase() === pc.name.toLowerCase();
              return (
                <button
                  key={pc.name}
                  type="button"
                  title={pc.name}
                  onClick={() => {
                    onSelectColor(pc.name, pc.hex);
                    setOpen(false);
                  }}
                  className={`relative w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer shadow-xs ${
                    pc.border ? "border border-slate-300 dark:border-slate-600" : ""
                  } ${isSel ? "ring-2 ring-primary ring-offset-1" : ""}`}
                  style={{
                    background: pc.isGradient ? pc.hex : pc.hex,
                  }}
                >
                  {isSel && (
                    <Check
                      className={`h-3 w-3 stroke-[3] ${
                        pc.name === "Blanco" || pc.name === "Amarillo" || pc.name === "Beige"
                          ? "text-slate-900"
                          : "text-white"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-1.5 border-t border-border/60">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (customText.trim()) {
                  onSelectColor(customText.trim());
                  setCustomText("");
                  setOpen(false);
                }
              }}
              className="flex gap-1.5"
            >
              <Input
                placeholder="Otro color o patrón..."
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="h-7 text-xs rounded-lg px-2 bg-accent/20"
              />
              <Button
                type="submit"
                size="sm"
                className="h-7 px-2 text-xs font-bold rounded-lg"
                disabled={!customText.trim()}
              >
                OK
              </Button>
            </form>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ItemNotePopover({
  nota,
  onSaveNota,
}: {
  nota?: string;
  onSaveNota: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(nota || "");

  useEffect(() => {
    setText(nota || "");
  }, [nota, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {nota ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700 transition-all shadow-2xs group cursor-pointer max-w-[140px]"
            title={`Nota: ${nota}. Clic para editar`}
          >
            <FileText className="h-2.5 w-2.5 shrink-0 text-amber-600" />
            <span className="truncate">{nota}</span>
            <span
              className="ml-0.5 text-amber-600 hover:text-destructive text-[11px] leading-none"
              onClick={(e) => {
                e.stopPropagation();
                onSaveNota("");
              }}
            >
              ×
            </span>
          </button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-1.5 text-[10px] font-bold gap-1 rounded-lg bg-background hover:bg-accent border-dashed border-slate-300 dark:border-slate-700 text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs"
            title="Añadir nota o condición de esta prenda"
          >
            <FileText className="h-2.5 w-2.5" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 rounded-2xl shadow-xl z-50 bg-popover" align="start">
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-border/60">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-amber-500" /> Nota de la Prenda
            </span>
            {nota && (
              <button
                type="button"
                onClick={() => {
                  onSaveNota("");
                  setOpen(false);
                }}
                className="text-[10px] font-bold text-destructive hover:underline cursor-pointer"
              >
                Borrar
              </button>
            )}
          </div>
          <Textarea
            placeholder="Ej: Mancha en manga, falta botón, tela delicada..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="text-xs min-h-[60px] rounded-xl p-2 bg-accent/10 resize-none"
            autoFocus
          />
          <div className="flex justify-end gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs font-bold px-3 bg-primary text-white"
              onClick={() => {
                onSaveNota(text.trim());
                setOpen(false);
              }}
            >
              Guardar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}


function NuevaOrdenPage() {
  const user = useRequireAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: plansData } = usePlans();
  const plans = plansData || [];
  const tenant = (user?.tenant || {}) as Tenant;
  const tenantId = tenant?.id ?? "";

  const cfg = tenant?.config || DEFAULT_CONFIG;
  const modalidad = cfg.pos_modalidad_operativa || "FLEXIBLE";
  const enableServicios = modalidad === "SOLO_PRENDAS" ? false : (cfg.pos_habilitar_servicios !== false);
  const enablePrendas = cfg.pos_habilitar_prendas !== false;

  function irAlPasoSiguienteDelCliente() {
    if (enableServicios) {
      setStep(2);
    } else if (enablePrendas) {
      setStep(3);
    } else {
      setStep(4);
    }
  }

  const [step, setStep] = useState(1);
  const [isPosMode, setIsPosMode] = useState(cfg.pos_modo_defecto !== false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (user?.tenant?.config) {
      setIsPosMode(user.tenant.config.pos_modo_defecto !== false);
    }
  }, [user?.tenant?.config?.pos_modo_defecto]);

  const [activeCategory, setActiveCategory] = useState<string>("TODOS");
  const [posFilterTab, setPosFilterTab] = useState<"TODOS" | "SERVICIOS" | "PRENDAS">("TODOS");

  useEffect(() => {
    if (cfg?.pos_modalidad_operativa === "SOLO_PRENDAS") {
      setPosFilterTab("PRENDAS");
      setActiveCategory("TODAS LAS PRENDAS");
    } else if (cfg?.pos_modalidad_operativa === "PRENDAS_CON_SERVICIOS") {
      setPosFilterTab("PRENDAS");
      setActiveCategory("TODAS LAS PRENDAS");
    } else if (cfg?.pos_modalidad_operativa === "SERVICIOS_PRIMERO") {
      setPosFilterTab("SERVICIOS");
      setActiveCategory("TODOS");
    } else {
      setPosFilterTab("TODOS");
      setActiveCategory("TODOS");
    }
  }, [cfg?.pos_modalidad_operativa]);
  const [showAllClothingCategories, setShowAllClothingCategories] = useState(false);
  const [posSearch, setPosSearch] = useState("");
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [isCobroModalOpen, setIsCobroModalOpen] = useState(false);

  // --- Estados de Cobro Profesional y Modalidades ---
  type CondicionCobro = "COBRAR_AHORA" | "ANTICIPO" | "AL_RETIRAR" | "CREDITO";
  const [condicionCobro, setCondicionCobro] = useState<CondicionCobro>("AL_RETIRAR");
  const [instrumentoPago, setInstrumentoPago] = useState<"EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "MIXTO">("EFECTIVO");
  const [anticipoMonto, setAnticipoMonto] = useState<number>(0);

  // Desglose de Pago Mixto
  const [pagoEfectivo, setPagoEfectivo] = useState<number>(0);
  const [pagoEfectivoRecibido, setPagoEfectivoRecibido] = useState<number>(0);
  const [pagoTarjeta, setPagoTarjeta] = useState<number>(0);
  const [pagoTarjetaRef, setPagoTarjetaRef] = useState<string>("");
  const [pagoTransferencia, setPagoTransferencia] = useState<number>(0);
  const [pagoTransferenciaRef, setPagoTransferenciaRef] = useState<string>("");

  // Modal de Revisión Rápida de Notas
  const [showQuickNoteModal, setShowQuickNoteModal] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState("");

  // Confirmación de Límite de Crédito
  const [showCreditLimitConfirm, setShowCreditLimitConfirm] = useState(false);

  // Selector y Detalles de Color / Notas por Prenda
  const COLORES_PRENDA = [
    { nombre: "Blanco", hex: "#FFFFFF", border: "#CBD5E1", text: "#0F172A" },
    { nombre: "Negro", hex: "#0F172A", text: "#FFFFFF" },
    { nombre: "Azul Marino", hex: "#1E3A8A", text: "#FFFFFF" },
    { nombre: "Azul Claro", hex: "#38BDF8", text: "#0F172A" },
    { nombre: "Rojo", hex: "#DC2626", text: "#FFFFFF" },
    { nombre: "Rosado", hex: "#F472B6", text: "#0F172A" },
    { nombre: "Verde", hex: "#16A34A", text: "#FFFFFF" },
    { nombre: "Verde Oliva", hex: "#65A30D", text: "#FFFFFF" },
    { nombre: "Amarillo", hex: "#FBBF24", text: "#0F172A" },
    { nombre: "Beige / Crema", hex: "#F5F5DC", border: "#D4D4D8", text: "#0F172A" },
    { nombre: "Gris", hex: "#64748B", text: "#FFFFFF" },
    { nombre: "Marrón", hex: "#78350F", text: "#FFFFFF" },
    { nombre: "Morado", hex: "#7C3AED", text: "#FFFFFF" },
    { nombre: "Estampado", hex: "linear-gradient(135deg, #EF4444 25%, #3B82F6 25%, #3B82F6 50%, #10B981 50%, #10B981 75%, #F59E0B 75%)", text: "#0F172A" },
  ];
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [showItemDetailModal, setShowItemDetailModal] = useState(false);
  const [itemEditColor, setItemEditColor] = useState("");
  const [itemEditColorHex, setItemEditColorHex] = useState("");
  const [itemEditNota, setItemEditNota] = useState("");

  // Control de Marbetes Hidrofix
  const [showMarbeteModal, setShowMarbeteModal] = useState(false);
  const [activeStripId, setActiveStripId] = useState<string>("");
  const [marbetesList, setMarbetesList] = useState<
    Array<{ id: string; color: string; piezas: number; secuencia: string }>
  >([]);

  function updateItemColor(index: number, colorName: string, colorHex?: string) {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              color: colorName || undefined,
              color_hex: colorHex || undefined,
            }
          : item
      )
    );
  }

  function updateItemNota(index: number, noteText: string) {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              notas: noteText || undefined,
            }
          : item
      )
    );
  }

  function handleAbrirCobro() {
    if (!cliente || (items.length === 0 && serviciosSel.length === 0)) return;

    const validMarbetes = marbetesList.filter(
      (m) => m.color && m.secuencia && String(m.secuencia).trim() !== ""
    );
    if (cfg.habilitar_control_marbetes && validMarbetes.length === 0) {
      toast.error("Debes asignar el Color y Secuencia del Marbete antes de proceder al cobro.");
      if (marbetesList.length === 0) {
        setMarbetesList([
          {
            id: uid(),
            color: "",
            piezas: totalPiezasCalculadas || 1,
            secuencia: "",
          },
        ]);
      }
      setShowMarbeteModal(true);
      return;
    }

    if (condicionCobro === "COBRAR_AHORA") {
      setRecibido(total);
    } else if (condicionCobro === "ANTICIPO") {
      const half = +(total / 2).toFixed(2);
      if (anticipoMonto <= 0 || anticipoMonto >= total) {
        setAnticipoMonto(half);
        setRecibido(half);
      } else {
        setRecibido(anticipoMonto);
      }
    } else if (condicionCobro === "AL_RETIRAR") {
      setRecibido(0);
      setAnticipoMonto(0);
    }
    const tieneNotas = !!notas.trim() || items.some((it) => !!it.notas?.trim());
    if (cfg.pos_requerir_nota_confirmacion && !tieneNotas) {
      setShowQuickNoteModal(true);
    } else {
      setIsCobroModalOpen(true);
    }
  }

  const [showOrdersDialog, setShowOrdersDialog] = useState(false);
  const [searchGlow, setSearchGlow] = useState(false);

  useEffect(() => {
    if (!tenantId || tenantId === "__loading__") return;

    const preloadTimer = window.setTimeout(() => {
      void queryClient.prefetchQuery({
        queryKey: ["ordenes", tenantId],
        queryFn: () => getOrdenes(tenantId),
        staleTime: 30_000,
      });
    }, 150);

    return () => window.clearTimeout(preloadTimer);
  }, [queryClient, tenantId]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const [clienteSearch, setClienteSearch] = useState("");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [showNewCliente, setShowNewCliente] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  const [serviciosSel, setServiciosSel] = useState<string[]>([]);
  const [customServicePrices, setCustomServicePrices] = useState<Record<string, number>>({});
  const [items, setItems] = useState<OrdenItem[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [esUrgente, setEsUrgente] = useState(false);
  const [aplicarItbis, setAplicarItbis] = useState(true);
  const [descuento, setDescuento] = useState(0);
  const [fechaEntrega, setFechaEntrega] = useState<Date | undefined>(new Date());
  const [showDeliveryDatePickerPOS, setShowDeliveryDatePickerPOS] = useState(false);

  const getFormattedDeliveryLabel = (date?: Date) => {
    if (!date) return "No seleccionada";
    return date.toLocaleString("es-DO", {
      month: "short",
      day: "numeric",
    });
  };

  const [notas, setNotas] = useState("");
  const [ubicacionRopa, setUbicacionRopa] = useState("");
  const [showNotesPOS, setShowNotesPOS] = useState(false);
  const [showConveyorPOS, setShowConveyorPOS] = useState(false);
  const [showDeliveryPOS, setShowDeliveryPOS] = useState(false);
  const [showDiscountPOS, setShowDiscountPOS] = useState(false);
  const [servicioDomicilio, setServicioDomicilio] = useState(false);
  const [direccionData, setDireccionData] = useState<AddressData>({ direccion: "" });
  const [costoDomicilio, setCostoDomicilio] = useState<number>(0);

  const [tipoECF, setTipoECF] = useState<string>("E32");
  const [indexDesglose, setIndexDesglose] = useState<number | null>(null);
  const [showDesgloseDialog, setShowDesgloseDialog] = useState(false);
  const [desgloseServiceName, setDesgloseServiceName] = useState<string>("");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [servicePickerItem, setServicePickerItem] = useState<CatalogoItem | null>(null);

  const { data: catalogoData = [], isLoading: loadingCatalog } = useCatalogo(tenantId);
  const { data: serviciosData = [], isLoading: loadingServicios } = useServicios(tenantId);
  const { data: clientes = [], isLoading: loadingClientes } = useClientes(tenantId);
  const { data: ordenes = [] } = useOrdenes(tenantId);
  const { data: caja, isLoading: loadingCaja } = useCajaAbierta(tenantId);
  const { data: fiscalConfigData } = useECFConfig(tenantId);
  const { data: ecfSequences } = useECFSequences(tenantId);

  const totalPiezasCalculadas = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.es_libra ? 1 : it.cantidad), 0);
  }, [items]);

  const ultimosMarbetes = useMemo(() => {
    return (ordenes || [])
      .filter((o) => o.marbete_secuencia)
      .slice(0, 5);
  }, [ordenes]);

  const isElectronic = Boolean(
    fiscalConfigData?.is_active || 
    tenant.config?.modo_facturacion === "electronica"
  );
  useEffect(() => {
    if (isElectronic) {
      setTipoECF((prev) => (prev && prev.startsWith("E") ? prev : "E32"));
    } else {
      setTipoECF((prev) => (prev && prev.startsWith("B") ? prev : "B02"));
    }
  }, [isElectronic]);

  // Calcular secuencias activas según el modo (electrónico o tradicional) - Memoizado
  const activeSequences = useMemo(() => {
    return (ecfSequences || []).filter(
      (s) => s.is_active && (isElectronic ? s.tipo_ecf.startsWith("E") : s.tipo_ecf.startsWith("B")),
    );
  }, [ecfSequences, isElectronic]);

  // Obtener los tipos únicos disponibles en base a las secuencias configuradas
  const validTipos = useMemo(() => {
    return activeSequences.length > 0
      ? Array.from(new Set(activeSequences.map((s) => s.tipo_ecf))).sort()
      : isElectronic
        ? ["E32", "E31"]
        : ["B02", "B01"];
  }, [activeSequences, isElectronic]);
  const catalogo = useMemo(() => catalogoData.filter((i) => i.activo), [catalogoData]);
  const catalogoMap = useMemo(() => {
    const map = new Map<string, CatalogoItem>();
    for (const item of catalogo) {
      map.set(item.nombre, item);
    }
    return map;
  }, [catalogo]);
  const servicios = useMemo(() => {
    const byName = new Map<string, Servicio>();
    for (const service of serviciosData.filter((item) => item.activo)) {
      const key = service.nombre
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const current = byName.get(key);
      if (!current || (Number(service.precio || 0) > 0 && Number(current.precio || 0) <= 0)) {
        byName.set(key, service);
      }
    }
    return Array.from(byName.values());
  }, [serviciosData]);
  const filteredClients = useMemo(() => {
    return clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
        (c.apellido && c.apellido.toLowerCase().includes(clientSearchQuery.toLowerCase())) ||
        c.telefono.includes(clientSearchQuery),
    );
  }, [clientes, clientSearchQuery]);
  const fiscalConfig = fiscalConfigData || null;

  useEffect(() => {
    if (isPosMode && isFullscreen) {
      document.body.classList.add("pos-mode");
    } else {
      document.body.classList.remove("pos-mode");
    }
    return () => document.body.classList.remove("pos-mode");
  }, [isPosMode, isFullscreen]);

  // 1. Setea la dirección únicamente cuando cambia el cliente seleccionado realmente, pero mantiene el envío desactivado por defecto
  useEffect(() => {
    if (cliente) {
      setDireccionData({
        direccion: cliente.direccion || "",
        sector: cliente.sector || "",
        edificio_apto: cliente.edificio_apto || "",
        referencia: cliente.referencia || "",
        lat: cliente.lat,
        lng: cliente.lng,
      });
    }
  }, [cliente?.id]);

  // 2. Auto-selecciona el tipo de comprobante fiscal cuando cambian datos de cliente o config fiscal
  useEffect(() => {
    if (cliente) {
      const isEmpresa =
        cliente.tipo === "Empresa" || (cliente.cedula && cliente.cedula.length >= 9);
      if (isEmpresa) {
        const target = isElectronic ? "E31" : "B01";
        if (validTipos.includes(target)) {
          setTipoECF(target);
        } else {
          const fallback = validTipos.find((t) => t !== "E32" && t !== "B02");
          if (fallback) setTipoECF(fallback);
        }
      } else {
        const target = isElectronic ? "E32" : "B02";
        if (validTipos.includes(target)) {
          setTipoECF(target);
        } else {
          if (validTipos.length > 0) setTipoECF(validTipos[0]);
        }
      }
    }
  }, [cliente?.id, cliente?.tipo, cliente?.cedula, isElectronic, validTipos]);

  useEffect(() => {
    if (validTipos.length > 0 && !validTipos.includes(tipoECF)) {
      const isConsumo = tipoECF === "E32" || tipoECF === "B02";
      if (isConsumo) {
        const matchingConsumo = validTipos.find((t) => t === "E32" || t === "B02");
        setTipoECF(matchingConsumo || validTipos[0]);
      } else {
        const matchingCredito = validTipos.find((t) => t === "E31" || t === "B01");
        setTipoECF(matchingCredito || validTipos[0]);
      }
    }
  }, [validTipos, tipoECF]);

  const [metodo, setMetodo] = useState<MetodoPago>("PAGO_AL_RETIRAR");
  const [opcionPagoSelected, setOpcionPagoSelected] = useState<string>("PAGO_AL_RETIRAR");
  const [recibido, setRecibido] = useState<number>(0);
  const [isCreatingOrden, setIsCreatingOrden] = useState(false);
  const creatingOrderRef = useRef(false);

  const releaseOrderCreation = () => {
    creatingOrderRef.current = false;
    setIsCreatingOrden(false);
  };
  const [abonoCredito, setAbonoCredito] = useState<number>(0);
  const [referencia, setReferencia] = useState("");
  const [showRefInput, setShowRefInput] = useState(false);

  const handleOpcionPagoChange = (opcionId: string) => {
    setOpcionPagoSelected(opcionId);
    setReferencia("");
    setShowRefInput(false);
    if (opcionId === "PAGO_AL_RETIRAR") {
      setMetodo("PAGO_AL_RETIRAR");
      setAbonoCredito(0);
    } else {
      setMetodo(opcionId as MetodoPago);
      if (opcionId === "CREDITO") {
        setAbonoCredito(0);
      }
    }
  };

  const [limiteDiasSel, setLimiteDiasSel] = useState<number>(30);

  useEffect(() => {
    if (user?.tenant?.limite_credito_dias) {
      setLimiteDiasSel(user.tenant.limite_credito_dias);
    }
  }, [user?.tenant?.limite_credito_dias]);

  async function actualizarLimiteDias(dias: number) {
    setLimiteDiasSel(dias);
    try {
      const { error } = await supabase
        .from("tenants")
        .update({ limite_credito_dias: dias })
        .eq("id", tenantId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["activeTenant"] });
      toast.success(`Plazo de crédito asignado a ${dias} días ✅`);
    } catch (e) {
      console.error("Error al guardar plazo de crédito:", e);
    }
  }

  const [creada, setCreada] = useState<Orden | null>(null);
  const [showTicket, setShowTicket] = useState(false);
  const [showPrintPortal, setShowPrintPortal] = useState<Orden | null>(null);

  function handleSelectGeneric(tipo: "Persona" | "Empresa") {
    const isPersona = tipo === "Persona";
    const gid = tenantId.substring(0, 24) + (isPersona ? "f000" : "e000") + tenantId.substring(28);
    const c: Cliente = {
      id: gid,
      tenant_id: tenantId,
      nombre: isPersona ? "Consumidor" : "Empresa",
      apellido: isPersona ? "Final" : "Genérica",
      cedula: "",
      telefono: "---",
      email: "",
      direccion: "",
      tipo: isPersona ? "Consumidor Final" : "Empresa",
      limite_credito: 0,
      creado_en: new Date().toISOString(),
    };

    // Actualización inmediata e instantánea de UI (0ms delay)
    setCliente(c);
    setTipoECF(isPersona ? (isElectronic ? "E32" : "B02") : isElectronic ? "E31" : "B01");
    if (!isPosMode) {
      irAlPasoSiguienteDelCliente();
    }

    // Persistencia asíncrona en segundo plano sin congelar/retrasar la UI
    saveCliente(c)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["clientes", tenantId] });
      })
      .catch((e) => {
        console.warn("Cliente genérico ya existe", e);
      });
  }

  // Auto-selecciona el tipo de cliente "Consumidor Final" por defecto al cargar si no se ha seleccionado cliente
  useEffect(() => {
    if (tenantId && tenantId !== "__loading__" && !cliente) {
      handleSelectGeneric("Persona");
    }
  }, [tenantId]);



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

function getMarbeteColorStyle(colorName?: string) {
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

  function resetPosOrder() {
    setItems([]);
    setServiciosSel([]);
    setCustomServicePrices({});
    setDescuento(0);
    setNotas("");
    setUbicacionRopa("");
    setShowNotesPOS(false);
    setShowConveyorPOS(false);
    setRecibido(0);
    setAbonoCredito(0);
    setReferencia("");
    setShowRefInput(false);
    setServicioDomicilio(false);
    setDireccionData({ direccion: "" });
    setCostoDomicilio(0);
    setShowTicket(false);
    setMarbetesList([]);
    setStep(1);
    handleSelectGeneric("Persona");
  }

  const handleImprimirTicket = (ordenToPrint: Orden | null) => {
    if (!ordenToPrint) return;
    setShowTicket(false);
    setShowPrintPortal(ordenToPrint);
  };

  const [empresaDialogOpen, setEmpresaDialogOpen] = useState(false);
  const [rncInput, setRncInput] = useState("");
  const [rncLoading, setRncLoading] = useState(false);
  const [rncResult, setRncResult] = useState<{
    name: string;
    rnc: string;
    status: string;
    regime: string;
  } | null>(null);

  async function handleSearchEmpresaRNC() {
    if (!rncInput.trim() || rncInput.trim().length < 9) {
      toast.error("Ingrese un RNC o Cédula válido (mínimo 9 dígitos)");
      return;
    }
    setRncLoading(true);
    setRncResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("pronesoft-proxy", {
        body: {
          action: "get-rnc",
          payload: { rnc: rncInput.trim() },
        },
      });

      if (error || !data)
        throw new Error(error?.message || "No se pudo conectar con el servicio de RNC");
      if (!data.name) throw new Error("No se encontró el contribuyente");

      setRncResult({
        name: data.name,
        rnc: data.rnc || rncInput.trim(),
        status: data.status || "DESCONOCIDO",
        regime: data.regime || "NORMAL",
      });
      toast.success("Datos obtenidos. Por favor verifique.");
    } catch (e: any) {
      toast.error(e.message || "Error al buscar RNC");
    } finally {
      setRncLoading(false);
    }
  }

  async function handleConfirmEmpresa() {
    if (!rncResult) return;

    setRncLoading(true);
    try {
      const c: Cliente = {
        id: uid("cli"),
        tenant_id: tenantId,
        nombre: rncResult.name,
        apellido: undefined,
        cedula: rncResult.rnc,
        telefono: "---",
        email: "",
        direccion: "",
        tipo: "Empresa",
        limite_credito: 0,
        creado_en: new Date().toISOString(),
      };

      await saveCliente(c);
      queryClient.invalidateQueries({ queryKey: ["clientes", tenantId] });

      setCliente(c);
      setTipoECF(isElectronic ? "E31" : "B01");
      irAlPasoSiguienteDelCliente();
      setEmpresaDialogOpen(false);
      setRncInput("");
      setRncResult(null);
      toast.success("Empresa guardada y seleccionada");
    } catch (e: any) {
      toast.error("Error al guardar cliente");
    } finally {
      setRncLoading(false);
    }
  }

  const [limits, setLimits] = useState<any>(null);

  useEffect(() => {
    async function check() {
      if (user?.tenant && user.tenant.id !== "__loading__") {
        const l = await checkPlanLimits(user.tenant);
        setLimits(l);
        if (l.ordersReached) {
          setShowLimitModal(true);
        } else if (l.isGracePeriod) {
          toast.info(
            `🎁 Modo Cortesía: Te quedan ${l.graceRemaining} órdenes de regalo de Klynn por este ciclo. Recuerda actualizar tu plan.`,
            { duration: 6000 }
          );
        }
      }
    }
    check();
  }, [user]);

  const catalogoEfectivo = useMemo(() => {
    // En modalidad "PRENDAS_CON_SERVICIOS", SOLO mostramos prendas que tengan tratamientos configurados
    if (cfg?.pos_modalidad_operativa === "PRENDAS_CON_SERVICIOS") {
      return catalogo.filter((item) => {
        if (!item.precios_servicios || typeof item.precios_servicios !== "object") return false;
        let treatmentsCount = 0;
        for (const [k, p] of Object.entries(item.precios_servicios)) {
          const num = Number(p);
          if (num > 0) {
            const srvObj = serviciosData.find(s => s.id === k || s.nombre.toLowerCase() === k.toLowerCase());
            if (srvObj || !(k.length > 20 && k.includes("-"))) {
              treatmentsCount++;
            }
          }
        }
        return treatmentsCount > 0;
      });
    }
    return catalogo;
  }, [catalogo, cfg?.pos_modalidad_operativa, serviciosData]);

  const categoriesPrendas = useMemo(() => {
    const map = new Map<string, string>();
    catalogoEfectivo.forEach((c) => {
      const cat = (c.categoria || "Otros").trim();
      if (cat) {
        const upper = cat.toUpperCase();
        if (!map.has(upper)) {
          map.set(upper, cat);
        }
      }
    });
    return Array.from(map.values());
  }, [catalogoEfectivo]);

  const itemCountsMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const it of items) {
      const rawName = it.descripcion.replace("↳ ", "");
      map[rawName] = (map[rawName] || 0) + it.cantidad;
    }
    return map;
  }, [items]);

  const indexedItems = useMemo(
    () => items.map((item, index) => ({ item, index })),
    [items],
  );

  const generalItems = useMemo(
    () => indexedItems.filter(({ item }) => !item.descripcion.startsWith("↳")),
    [indexedItems],
  );

  const serviceCountsMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of serviciosSel) {
      map[s] = (map[s] || 0) + 1;
    }
    return map;
  }, [serviciosSel]);

  const selectedServices = useMemo(
    () => servicios.filter((service) => Boolean(serviceCountsMap[service.nombre])),
    [servicios, serviceCountsMap],
  );

  const catalogFiltered = useMemo(() => {
    let list = catalogoEfectivo;

    if (posFilterTab === "PRENDAS" || cfg?.pos_modalidad_operativa === "PRENDAS_CON_SERVICIOS") {
      if (activeCategory !== "TODAS LAS PRENDAS" && activeCategory !== "TODOS") {
        list = list.filter(
          (c) =>
            (c.categoria || "Otros").trim().toUpperCase() === activeCategory.trim().toUpperCase(),
        );
      }
    }
    if (posSearch) {
      list = list.filter((c) => c.nombre.toLowerCase().includes(posSearch.toLowerCase()));
    }
    return list;
  }, [catalogo, activeCategory, posSearch, posFilterTab, cfg?.pos_modalidad_operativa, serviciosData]);

  const catalogByCategory = useMemo(() => {
    const groups = new Map<string, CatalogoItem[]>();
    for (const item of catalogFiltered) {
      const category = item.categoria || "Otros";
      const group = groups.get(category);
      if (group) group.push(item);
      else groups.set(category, [item]);
    }
    return Array.from(groups.entries());
  }, [catalogFiltered]);

  const servicesFiltered = useMemo(() => {
    if (posSearch) {
      return servicios.filter((s) => s.nombre.toLowerCase().includes(posSearch.toLowerCase()));
    }
    return servicios;
  }, [servicios, posSearch]);

  const internalCatalogHeading = useMemo(() => {
    const isPrendasConTratamiento = cfg?.pos_modalidad_operativa === "PRENDAS_CON_SERVICIOS";
    const showsServices = enableServicios && !isPrendasConTratamiento && posFilterTab !== "PRENDAS";

    if (showsServices) {
      return {
        title: "Servicios",
        count: servicesFiltered.length,
        type: "SERVICIOS" as const,
      };
    }

    if (enablePrendas) {
      return {
        title: "Prendas",
        count: catalogFiltered.length,
        type: "PRENDAS" as const,
      };
    }

    return {
      title: "Catálogo",
      count: 0,
      type: "CATALOGO" as const,
    };
  }, [
    catalogFiltered.length,
    enablePrendas,
    enableServicios,
    posFilterTab,
    servicesFiltered.length,
    cfg?.pos_modalidad_operativa,
  ]);

  const catalogSummary = useMemo(() => {
    const isPrendasConTratamiento = cfg?.pos_modalidad_operativa === "PRENDAS_CON_SERVICIOS";

    if (posFilterTab === "SERVICIOS" && !isPrendasConTratamiento) {
      return {
        title: "Servicios",
        count: servicesFiltered.length,
        helper: "Toca un servicio para agregarlo a la orden",
      };
    }

    if (posFilterTab === "PRENDAS" || isPrendasConTratamiento) {
      return {
        title: "Prendas",
        count: catalogFiltered.length,
        helper: isPrendasConTratamiento
          ? "Toca una prenda para seleccionar su tratamiento"
          : "Toca un artículo para agregarlo a la orden",
      };
    }

    return {
      title: "Catálogo",
      count:
        (enableServicios ? servicesFiltered.length : 0) +
        (enablePrendas ? catalogFiltered.length : 0),
      helper: "Toca un artículo o servicio para agregarlo a la orden",
    };
  }, [
    catalogFiltered.length,
    enablePrendas,
    enableServicios,
    posFilterTab,
    servicesFiltered.length,
    cfg?.pos_modalidad_operativa,
  ]);

  // Efecto para calcular la fecha de entrega automáticamente
  useEffect(() => {
    if (!user || user.tenant.id === "__loading__") return;

    const horas = esUrgente ? cfg.tiempo_entrega_urgente || 6 : cfg.tiempo_entrega_estandar || 24;

    const d = new Date();
    d.setHours(d.getHours() + horas);

    // Formato YYYY-MM-DD para el input de fecha
    setFechaEntrega(d);
  }, [esUrgente, cfg.tiempo_entrega_estandar, cfg.tiempo_entrega_urgente, user?.tenant.id]);

  useEffect(() => {
    if (!enableServicios) {
      setServiciosSel([]);
    }
  }, [enableServicios]);

  useEffect(() => {
    if (!enableServicios && enablePrendas) {
      setPosFilterTab("PRENDAS");
      setActiveCategory("TODAS LAS PRENDAS");
    } else if (enableServicios && !enablePrendas) {
      setPosFilterTab("SERVICIOS");
      setActiveCategory("TODOS");
    } else {
      if (cfg?.pos_modalidad_operativa === "PRENDAS_CON_SERVICIOS") {
        setPosFilterTab("PRENDAS");
        setActiveCategory("TODAS LAS PRENDAS");
      } else if (cfg?.pos_modalidad_operativa === "SERVICIOS_PRIMERO") {
        setPosFilterTab("SERVICIOS");
        setActiveCategory("TODOS");
      } else {
        setPosFilterTab("TODOS");
        setActiveCategory("TODOS");
      }
    }
  }, [enableServicios, enablePrendas, cfg?.pos_modalidad_operativa]);

  const posStateRef = useRef<any>(null);

  useEffect(() => {
    if (!isPosMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const state = posStateRef.current;
      if (!state) return;
      const target = e.target as HTMLElement;
      const isInput =
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;

      // Enter to cobrar (open checkout modal) or confirm pay (if modal is open)
      if (e.key === "Enter") {
        const isTextarea = target.tagName === "TEXTAREA";
        if (!isTextarea) {
          if (!state.isCobroModalOpen) {
            if (state.items.length > 0 || state.serviciosSel.length > 0) {
              e.preventDefault();
              const valid = (state.marbetesList || []).filter(
                (m: any) => m.color && m.secuencia && String(m.secuencia).trim() !== ""
              );
              if (state.cfg?.habilitar_control_marbetes && valid.length === 0) {
                toast.error("Debes asignar el Color y Secuencia del Marbete antes de proceder al cobro.");
                if (!state.marbetesList || state.marbetesList.length === 0) {
                  state.setMarbetesList([
                    {
                      id: uid(),
                      color: "",
                      piezas: state.totalPiezasCalculadas || 1,
                      secuencia: "",
                    },
                  ]);
                }
                state.setShowMarbeteModal(true);
                return;
              }
              state.setIsCobroModalOpen(true);
            }
          } else {
            const isEfectivo = state.metodo === "EFECTIVO";
            const canConfirm = !isEfectivo || state.recibido >= state.total;
            if (canConfirm) {
              e.preventDefault();
              state.onCrearOrden();
            }
          }
          return;
        }
      }

      // Space key to confirm and create order if checkout modal is open
      if (e.key === " " || e.code === "Space") {
        if (state.isCobroModalOpen) {
          const isTypingText =
            target.tagName === "TEXTAREA" ||
            (target.tagName === "INPUT" &&
              (target as HTMLInputElement).type === "text" &&
              (target as HTMLInputElement).inputMode !== "decimal");
          if (!isTypingText) {
            e.preventDefault();
            e.stopPropagation();
            const isEfectivo = state.metodo === "EFECTIVO";
            const canConfirm = !isEfectivo || state.recibido >= state.total;
            if (canConfirm) {
              state.onCrearOrden();
            } else {
              toast.error("El monto recibido es menor al total de la orden 💵");
            }
            return;
          }
        }
      }

      // Ctrl alone to focus search
      if (e.key === "Control") {
        e.preventDefault();
        setSearchGlow(true);
        const searchInput = document.querySelector(
          'input[placeholder*="Buscar prenda"]',
        ) as HTMLInputElement;
        if (searchInput) searchInput.focus();
        return;
      }

      if (isInput) return;

      // P to toggle fullscreen mode
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "p") {
        if (e.repeat) return;
        e.preventDefault();
        state.toggleFullscreen();
        return;
      }

      // Z to open the orders modal
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "z") {
        if (e.repeat) return;
        e.preventDefault();
        state.setShowOrdersDialog(true);
        return;
      }

      // F2 to open client search modal
      if (e.key === "F2") {
        e.preventDefault();
        state.setIsClientModalOpen(true);
        return;
      }

      // F4 to open discount dialog
      if (e.key === "F4") {
        e.preventDefault();
        state.setShowDiscountPOS(true);
        return;
      }

      // F8 to open notes dialog
      if (e.key === "F8") {
        e.preventDefault();
        state.setShowNotesPOS(true);
        return;
      }

      // Ctrl + Z to undo (deshacer)
      if (e.ctrlKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (state.items.length > 0) {
          setItems((prev) => prev.slice(0, -1));
          toast.info("Prenda removida (Deshacer) ↩️");
        } else if (state.serviciosSel.length > 0) {
          setServiciosSel((prev) => prev.slice(0, -1));
          toast.info("Servicio removido (Deshacer) ↩️");
        }
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Control") {
        setSearchGlow(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
    };
  }, [isPosMode]);

  if (!user || user.tenant.id === "__loading__" || (loadingCatalog && catalogoData.length === 0) || (loadingServicios && serviciosData.length === 0)) {
    return <GlobalPageLoader text="Cargando punto de venta POS..." />;
  }
  const { empleado } = user;

  const isOfflineEnabled = isModuleEnabled(tenant, "pos_offline");
  if (typeof window !== "undefined" && !navigator.onLine && !isOfflineEnabled) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-200">
        <div className="relative mb-5">
          <div className="h-20 w-20 rounded-3xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-lg border border-rose-500/20">
            <WifiOff className="h-10 w-10" />
          </div>
          <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md">
            <Lock className="h-3.5 w-3.5" />
          </div>
        </div>
        <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-xs font-bold px-3 py-1 mb-3 rounded-full">
          Módulo Offline Inactivo
        </Badge>
        <h2 className="text-2xl font-black text-foreground tracking-tight max-w-md">
          Facturación Sin Conexión no disponible
        </h2>
        <p className="text-muted-foreground text-sm max-w-md mt-2 leading-relaxed">
          Esta lavandería no tiene habilitado el <strong>Modo Offline</strong> en su suscripción actual. Para emitir órdenes y cobrar en el POS necesitas estar conectado a internet o solicitar la activación del módulo a tu administrador.
        </p>
        <div className="flex items-center gap-3 mt-6 flex-wrap justify-center">
          <Button
            onClick={() => window.location.reload()}
            className="rounded-xl font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white gap-2 shadow-xs cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Reintentar Conexión</span>
          </Button>
          <Link to="/t/$slug" params={{ slug: tenant.slug }}>
            <Button variant="outline" className="rounded-xl font-bold gap-2 cursor-pointer">
              <span>Volver al Dashboard</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const filtrados = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
      c.telefono.includes(clienteSearch),
  );

  // Cálculo detallado de ITBIS
  const itbisRate = (cfg.itbis_porcentaje || 0) / 100;

  // Separar montos gravables y exentos
  const itemsGravables = items.filter((it) => !it.is_exento);
  const itemsExentos = items.filter((it) => it.is_exento);

  const subtotalGravableBase = itemsGravables.reduce(
    (s, it) => s + it.cantidad * it.precio_unitario,
    0,
  );
  const subtotalExentoBase = itemsExentos.reduce(
    (s, it) => s + it.cantidad * it.precio_unitario,
    0,
  );

  const costoServicios = selectedServices.reduce((acc, s) => {
      const qty = serviceCountsMap[s.nombre] || 0;
      const prendasConPrecio = items.filter(
        (it) =>
          it.descripcion.startsWith("↳") &&
          it.servicio_origen === s.nombre &&
          (it.precio_unitario || 0) > 0,
      );
      let price = s.precio;
      if (customServicePrices[s.nombre] !== undefined) {
        price = customServicePrices[s.nombre];
      } else if (cfg?.pos_modalidad_operativa !== "SERVICIOS_PRIMERO" && prendasConPrecio.length > 0) {
        price = 0;
      }
      return acc + price * qty;
    }, 0);

  // El recargo de urgencia se aplica al subtotal base de prendas más el costo de los servicios
  const recargoTotal = esUrgente
    ? (subtotalGravableBase + subtotalExentoBase + costoServicios) * (cfg.recargo_urgencia / 100)
    : 0;

  // Costo de domicilio (se agrega al final, no entra en la base gravable de ITBIS por ser un servicio de entrega)
  const costoEnvio = servicioDomicilio ? costoDomicilio : 0;

  // Proporción del recargo que es gravable (si hay items exentos, el recargo suele ser gravable igual por ser un servicio,
  // pero para ser conservadores en este flujo lo sumamos a la base gravable total)
  const baseParaItbis = subtotalGravableBase + costoServicios + recargoTotal;

  let itbis = 0;
  let total = 0;
  let subtotal = subtotalGravableBase + subtotalExentoBase + costoServicios + recargoTotal;

  // Aliases for missing variables in UI
  const subtotalBase = subtotalGravableBase + subtotalExentoBase;
  const subtotalBruto = subtotalGravableBase + subtotalExentoBase + costoServicios;
  const recargo = recargoTotal;

  if ((cfg.ncf_facturacion_activa || cfg.modo_facturacion === "tradicional" || cfg.modo_facturacion === "electronica" || isElectronic) && aplicarItbis && itbisRate > 0) {
    if (cfg.itbis_incluido) {
      // ITBIS ya está en los precios.
      // Calculamos cuánto de la base gravable es ITBIS
      const baseSinItbis = +(baseParaItbis / (1 + itbisRate)).toFixed(2);
      itbis = +(baseParaItbis - baseSinItbis).toFixed(2);
      subtotal = +(baseSinItbis + subtotalExentoBase).toFixed(2);
    } else {
      // ITBIS se suma a la base gravable
      itbis = +(baseParaItbis * itbisRate).toFixed(2);
      subtotal = +(baseParaItbis + subtotalExentoBase).toFixed(2);
    }
  }

  const subtotalConImpuestos = subtotal + itbis;
  const descuentoMonto = +((subtotalConImpuestos * descuento) / 100).toFixed(2);
  total = +(subtotalConImpuestos - descuentoMonto + costoEnvio).toFixed(2);

  const vuelto = metodo === "EFECTIVO" && recibido > total ? recibido - total : 0;
  const faltante = metodo === "EFECTIVO" && recibido > 0 && recibido < total ? total - recibido : 0;

  function addItem(it: OrdenItem) {
    setItems((arr) => {
      const idx = arr.findIndex(
        (x) => x.descripcion === it.descripcion && x.precio_unitario === it.precio_unitario,
      );
      if (idx > -1) {
        return arr.map((item, i) =>
          i === idx ? { ...item, cantidad: item.cantidad + it.cantidad } : item,
        );
      }
      return [...arr, it];
    });
  }
  function removeItem(i: number) {
    setItems((arr) => arr.filter((_, idx) => idx !== i));
  }
  function addItemDesglose(it: OrdenItem) {
    if (indexDesglose === null) return;
    const targetService =
      it.servicio_origen ||
      desgloseServiceName ||
      (serviciosSel.length > 0 ? serviciosSel[serviciosSel.length - 1] : undefined);
    const itemWithService: OrdenItem = {
      ...it,
      servicio_origen: targetService,
    };
    setItems((arr) => {
      const idx = arr.findIndex(
        (x) =>
          x.descripcion === itemWithService.descripcion &&
          x.precio_unitario === itemWithService.precio_unitario &&
          x.servicio_origen === itemWithService.servicio_origen,
      );
      if (idx > -1) {
        return arr.map((item, i) =>
          i === idx ? { ...item, cantidad: item.cantidad + itemWithService.cantidad } : item,
        );
      }

      const result = [...arr];
      if (indexDesglose === -1) {
        return [...result, itemWithService];
      }
      result.splice(indexDesglose + 1, 0, itemWithService);
      return result;
    });
    toast.success(
      `${it.descripcion.replace("↳ ", "")} agregada ${targetService ? `a ${targetService}` : "al desglose"}`,
    );
  }
  function updateItemQuantity(i: number, delta: number) {
    setItems((arr) =>
      arr.map((it, idx) => {
        if (idx !== i) return it;
        const newQty = Math.max(1, it.cantidad + delta);
        return { ...it, cantidad: newQty };
      }),
    );
  }
  function updateServiceQuantity(serviceName: string, delta: number) {
    setServiciosSel((arr) => {
      const currentCount = arr.filter((x) => x === serviceName).length;
      if (delta < 0 && currentCount <= 1) return arr;
      if (delta < 0) {
        const idx = arr.indexOf(serviceName);
        if (idx > -1) {
          const result = [...arr];
          result.splice(idx, 1);
          return result;
        }
      } else if (delta > 0) {
        return [...arr, serviceName];
      }
      return arr;
    });
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => {
          setIsFullscreen(true);
        })
        .catch((e) => {
          console.error(`Error al activar pantalla completa: ${e.message}`);
        });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  
  async function onCrearOrden(forceCreditAuth = false) {
    // React state is asynchronous; the ref closes the double-click window
    // immediately and prevents duplicate orders.
    const validMarbetes = marbetesList.filter(
      (m) => m.color && m.secuencia && String(m.secuencia).trim() !== ""
    );
    if (cfg.habilitar_control_marbetes && validMarbetes.length === 0) {
      toast.error("Debes asignar el Color y Secuencia del Marbete antes de procesar la orden.");
      if (marbetesList.length === 0) {
        setMarbetesList([
          {
            id: uid(),
            color: "",
            piezas: totalPiezasCalculadas || 1,
            secuencia: "",
          },
        ]);
      }
      setIsCobroModalOpen(false);
      setShowMarbeteModal(true);
      return;
    }

    creatingOrderRef.current = true;
    setIsCreatingOrden(true);

    // 1. Validar cliente para crédito
    if (condicionCobro === "CREDITO") {
      if (
        !cliente ||
        (cliente.nombre === "Consumidor" && cliente.apellido === "Final") ||
        cliente.tipo === "Consumidor Final"
      ) {
        toast.error("Las ventas a crédito deben asignarse a un cliente registrado.");
        releaseOrderCreation();
        return;
      }
    }

    let targetCliente: Cliente | null = cliente;
    if (!targetCliente) {
      const isConsumoFinal = tipoECF === "E32" || tipoECF === "B02";
      if (isConsumoFinal) {
        const isPersona = true;
        const gid = tenantId.substring(0, 24) + "f000" + tenantId.substring(28);
        const c: Cliente = {
          id: gid,
          tenant_id: tenantId,
          nombre: "Consumidor",
          apellido: "Final",
          cedula: "",
          telefono: "---",
          email: "",
          direccion: "",
          tipo: "Consumidor Final",
          limite_credito: 0,
          creado_en: new Date().toISOString(),
        };
        try {
          await saveCliente(c);
          queryClient.invalidateQueries({ queryKey: ["clientes", tenantId] });
        } catch (e) {
          console.warn("Cliente genérico ya existe");
        }
        setCliente(c);
        targetCliente = c;
      } else {
        toast.error("Selecciona un cliente");
        releaseOrderCreation();
        return;
      }
    }

    if (items.length === 0 && serviciosSel.length === 0) {
      toast.error("Agrega al menos una prenda o selecciona un servicio");
      releaseOrderCreation();
      return;
    }

    // 2. Determinar montos según modalidad
    let pagado = 0;
    let saldo = 0;

    if (condicionCobro === "COBRAR_AHORA") {
      pagado = total;
      saldo = 0;
    } else if (condicionCobro === "ANTICIPO") {
      if (anticipoMonto <= 0) {
        toast.error("Ingresa un monto de anticipo mayor a RD$0.00");
        releaseOrderCreation();
        return;
      }
      if (anticipoMonto >= total) {
        toast.error("El anticipo debe ser menor al total. Si desea pagar completo, use 'Cobrar ahora'.");
        releaseOrderCreation();
        return;
      }
      pagado = anticipoMonto;
      saldo = +Math.max(0, total - anticipoMonto).toFixed(2);
    } else if (condicionCobro === "AL_RETIRAR") {
      pagado = 0;
      saldo = total;
    } else if (condicionCobro === "CREDITO") {
      if (abonoCredito >= total) {
        toast.error("El abono debe ser menor al total. Si desea pagar completo, use 'Cobrar ahora'.");
        releaseOrderCreation();
        return;
      }
      pagado = abonoCredito;
      saldo = +Math.max(0, total - abonoCredito).toFixed(2);

      // Verificación de límite de crédito
      const deudaActual = (ordenes || [])
        .filter((o) => o.cliente_id === targetCliente?.id && o.saldo > 0 && o.estado !== "ANULADA")
        .reduce((sum, o) => sum + o.saldo, 0);
      const limite = targetCliente?.limite_credito || 0;
      if (limite > 0 && deudaActual + saldo > limite && !forceCreditAuth) {
        setShowCreditLimitConfirm(true);
        releaseOrderCreation();
        return;
      }
    }

    // 3. Validar caja si hay pago inmediato
    if (pagado > 0 && !caja) {
      toast.error("Abre la caja antes de registrar un pago");
      releaseOrderCreation();
      return;
    }

    // 4. Validar instrumentos de pago
    let pagosDetalle: PagoDesgloseItem[] = [];
    let metodoFinal: MetodoPago = "EFECTIVO";

    if (condicionCobro === "AL_RETIRAR") {
      metodoFinal = "PAGO_AL_RETIRAR";
    } else if (condicionCobro === "CREDITO") {
      metodoFinal = "CREDITO";
      if (abonoCredito > 0) {
        pagosDetalle = [{ metodo: "EFECTIVO", monto: abonoCredito }];
      }
    } else {
      // COBRAR_AHORA o ANTICIPO
      if (instrumentoPago === "EFECTIVO") {
        if (recibido < pagado) {
          toast.error("El monto recibido es menor al monto a cobrar");
          releaseOrderCreation();
          return;
        }
        metodoFinal = "EFECTIVO";
        pagosDetalle = [{
          metodo: "EFECTIVO",
          monto: pagado,
          recibido: recibido,
        }];
      } else if (instrumentoPago === "TARJETA") {
        metodoFinal = "TARJETA";
        pagosDetalle = [{
          metodo: "TARJETA",
          monto: pagado,
          referencia: referencia.trim() || undefined,
        }];
      } else if (instrumentoPago === "TRANSFERENCIA") {
        if (!referencia.trim()) {
          toast.error("La referencia de transferencia es obligatoria.");
          releaseOrderCreation();
          return;
        }
        metodoFinal = "TRANSFERENCIA";
        pagosDetalle = [{
          metodo: "TRANSFERENCIA",
          monto: pagado,
          referencia: referencia.trim(),
        }];
      } else if (instrumentoPago === "MIXTO") {
        const sumaMixto = +(pagoEfectivo + pagoTarjeta + pagoTransferencia).toFixed(2);
        if (Math.abs(sumaMixto - pagado) > 0.01) {
          toast.error(`La suma de los métodos (RD${sumaMixto}) debe ser igual al monto a cobrar (RD${pagado}).`);
          releaseOrderCreation();
          return;
        }
        if (pagoTransferencia > 0 && !pagoTransferenciaRef.trim()) {
          toast.error("La referencia es obligatoria para el monto en transferencia.");
          releaseOrderCreation();
          return;
        }
        if (pagoEfectivo > 0 && pagoEfectivoRecibido > 0 && pagoEfectivoRecibido < pagoEfectivo) {
          toast.error("El efectivo recibido es menor al monto asignado a efectivo.");
          releaseOrderCreation();
          return;
        }

        metodoFinal = "MIXTO";
        if (pagoEfectivo > 0) {
          pagosDetalle.push({
            metodo: "EFECTIVO",
            monto: pagoEfectivo,
            recibido: pagoEfectivoRecibido > 0 ? pagoEfectivoRecibido : pagoEfectivo,
          });
        }
        if (pagoTarjeta > 0) {
          pagosDetalle.push({
            metodo: "TARJETA",
            monto: pagoTarjeta,
            referencia: pagoTarjetaRef.trim() || undefined,
          });
        }
        if (pagoTransferencia > 0) {
          pagosDetalle.push({
            metodo: "TRANSFERENCIA",
            monto: pagoTransferencia,
            referencia: pagoTransferenciaRef.trim(),
          });
        }
      }
    }

    try {
      const numero = await nextOrdenNumero(tenant.id);

      const deliveryDate = new Date(fechaEntrega || new Date());
      const horasAdd = esUrgente
        ? cfg.tiempo_entrega_urgente || 3
        : cfg.tiempo_entrega_estandar || 24;
      const now = new Date();
      now.setHours(now.getHours() + horasAdd);
      deliveryDate.setHours(now.getHours(), now.getMinutes(), 0, 0);

      const freshFiscalConfig = fiscalConfigData || (await getECFConfig(tenant.id).catch(() => null));
      const isElectronic = Boolean(
        freshFiscalConfig?.is_active ||
        tenant.config?.modo_facturacion === "electronica" ||
        fiscalConfigData?.is_active
      );
      const activeTipo = isElectronic
        ? tipoECF.startsWith("E")
          ? tipoECF
          : tipoECF === "B01"
            ? "E31"
            : "E32"
        : tipoECF.startsWith("B")
          ? tipoECF
          : tipoECF === "E31"
            ? "B01"
            : "B02";

      let ncfVencimiento: string | undefined = undefined;
      let finalNCF: string | undefined = undefined;

      const isFiscalActive = Boolean(
        cfg.ncf_facturacion_activa ||
        cfg.modo_facturacion === "tradicional" ||
        cfg.modo_facturacion === "electronica" ||
        isElectronic
      );

      if (
        isFiscalActive &&
        !isElectronic &&
        condicionCobro !== "AL_RETIRAR"
      ) {
        try {
          const { ncf: nextNCF, expiration_date } = await nextECFNumero(tenant.id, activeTipo);
          finalNCF = nextNCF;
          ncfVencimiento = expiration_date;
        } catch (seqErr) {
          finalNCF = `${cfg.ncf_secuencia || "B02"}${String(cfg.ncf_proximo || 1).padStart(8, "0")}`;
          await saveTenant({
            ...tenant,
            config: {
              ...cfg,
              ncf_proximo: (cfg.ncf_proximo || 1) + 1,
            },
          });
        }
      }

      const orden: Orden = {
        id: uid("ord"),
        tenant_id: tenant.id,
        numero,
        cliente_id: targetCliente.id,
        empleado_id: empleado.id,
        servicios: serviciosSel,
        servicios_precios: serviciosSel.reduce(
          (acc, sName) => {
            const prendasConPrecio = items.filter(
              (it) =>
                it.descripcion.startsWith("↳") &&
                it.servicio_origen === sName &&
                (it.precio_unitario || 0) > 0,
            );
            let sPrice = servicios.find((x) => x.nombre === sName)?.precio || 0;
            if (customServicePrices[sName] !== undefined) {
              sPrice = customServicePrices[sName];
            } else if (cfg?.pos_modalidad_operativa !== "SERVICIOS_PRIMERO" && prendasConPrecio.length > 0) {
              sPrice = 0;
            }
            acc[sName] = sPrice;
            return acc;
          },
          {} as Record<string, number>
        ),
        items,
        subtotal: +subtotal.toFixed(2),
        itbis,
        descuento: descuentoMonto,
        total,
        pagado,
        saldo,
        metodo_pago: metodoFinal,
        condicion_cobro: condicionCobro,
        pagos_detalle: pagosDetalle.length > 0 ? pagosDetalle : undefined,
        anticipo_monto: condicionCobro === "ANTICIPO" ? anticipoMonto : undefined,
        dias_credito: condicionCobro === "CREDITO" ? limiteDiasSel : undefined,
        estado: "RECIBIDA",
        fecha_entrega: deliveryDate.toISOString(),
        es_urgente: esUrgente,
        notas: notas || undefined,
        ubicacion_ropa: ubicacionRopa.trim() || undefined,
        creado_en: new Date().toISOString(),
        ncf: finalNCF,
        ncf_vencimiento: ncfVencimiento,
        entrega_domicilio: servicioDomicilio || undefined,
        costo_envio: servicioDomicilio && costoEnvio > 0 ? costoEnvio : undefined,
        direccion_entrega: servicioDomicilio && direccionData.direccion ? direccionData.direccion : undefined,
        sector_entrega: servicioDomicilio && direccionData.sector ? direccionData.sector : undefined,
        referencia_entrega: servicioDomicilio && direccionData.referencia ? direccionData.referencia : undefined,
        lat_entrega: servicioDomicilio ? direccionData.lat : undefined,
        lng_entrega: servicioDomicilio ? direccionData.lng : undefined,
        pago_referencia:
          (instrumentoPago === "TARJETA" || instrumentoPago === "TRANSFERENCIA") && referencia
            ? referencia
            : undefined,
        marbetes: cfg.habilitar_control_marbetes && validMarbetes.length > 0
          ? validMarbetes.map((m) => ({
              id: m.id || uid(),
              color: m.color,
              piezas: Number(m.piezas) || 1,
              secuencia: String(m.secuencia).trim(),
            }))
          : undefined,
        marbete_color: cfg.habilitar_control_marbetes && validMarbetes.length > 0 ? validMarbetes[0].color : undefined,
        marbete_piezas: cfg.habilitar_control_marbetes && validMarbetes.length > 0
          ? validMarbetes.reduce((acc, it) => acc + (Number(it.piezas) || 0), 0)
          : undefined,
        marbete_secuencia: cfg.habilitar_control_marbetes && validMarbetes.length > 0
          ? parseInt(String(validMarbetes[0].secuencia), 10) || undefined
          : undefined,
      };

      let ordenActualizada = { ...orden };
      if (
        isElectronic &&
        activeTipo &&
        condicionCobro !== "AL_RETIRAR" &&
        condicionCobro !== "CREDITO"
      ) {
        if (typeof window !== "undefined" && !navigator.onLine) {
          ordenActualizada = {
            ...orden,
            ncf: undefined,
            tipo_ecf: activeTipo,
            ecf_status: "PENDING_OFFLINE_TRANSMISSION",
            ncf_vencimiento: ncfVencimiento,
          };
          await saveOrden(ordenActualizada);
          toast.info("⚠️ Modo Offline: Pre-Factura generada. Se timbrará con DGII al restablecer internet.");
        } else {
          try {
            await saveOrden(orden);
            const result = await emitirECF(
              orden,
              targetCliente,
              freshFiscalConfig?.pronesoft_tenant_id || fiscalConfig?.pronesoft_tenant_id,
              cfg,
              tenant,
              activeTipo
            );

            const legalStatusUpper = String(
              result.legal_status || result.document?.legal_status || result.document?.status || ""
            ).toUpperCase();
            const isRejected = /RECHAZ|ERROR|INVALID/.test(legalStatusUpper);
            const isAccepted = !isRejected && (Boolean(result.encf) || /ACEPT|PROCESAD|APROB|REGISTERED|EMITID|COMPLETAD|VALID|SUCCESS/.test(legalStatusUpper));
            const finalStatus = isAccepted ? "ACCEPTED" : isRejected ? "REJECTED" : "REGISTERED";

            const fiscalFields = {
              ncf: result.encf,
              tipo_ecf: activeTipo,
              ecf_status: finalStatus,
              ecf_id: result.document.id,
              ecf_qr: result.stamp_url || (result.document as any).document_stamp_url || "",
              ecf_security_code: result.security_code || "",
              ecf_signature_date: (result.document as any).signature_date || new Date().toISOString(),
              ncf_vencimiento: ncfVencimiento,
            };

            ordenActualizada = { ...orden, ...fiscalFields };
            await saveOrden(ordenActualizada);
            if (isAccepted) {
              toast.success(`Comprobante ${result.encf} emitido y aceptado por DGII ✓`);
            } else if (isRejected) {
              toast.error(`Comprobante ${result.encf} rechazado por DGII`);
            } else {
              toast.info(`e-CF ${result.encf} emitido. Validación DGII pendiente.`);
            }
          } catch (fErr: any) {
            console.error("Error Fiscal:", fErr);
            if (isConnectivityFailure(fErr)) {
              ordenActualizada = {
                ...orden,
                ncf: undefined,
                tipo_ecf: activeTipo,
                ecf_status: "PENDING_OFFLINE_TRANSMISSION",
                ncf_vencimiento: ncfVencimiento,
              };
              await saveOrden(ordenActualizada);
              toast.warning("Sin conexión: se generó una pre-factura pendiente de transmisión.");
            } else {
              ordenActualizada = {
                ...orden,
                ncf: undefined,
                tipo_ecf: activeTipo,
                ecf_status: "ERROR",
                ncf_vencimiento: ncfVencimiento,
              };
              await saveOrden(ordenActualizada);
              toast.error(`No se pudo emitir el e-CF: ${fErr?.message || "Error fiscal desconocido"}`, {
                duration: 10000,
              });
            }
          }
        }
      } else {
        await saveOrden(orden);
      }

      // Registrar movimiento(s) de caja desglosados en paralelo
      if (pagado > 0 && caja) {
        if (pagosDetalle.length > 0) {
          await Promise.all(
            pagosDetalle.map((pd) =>
              saveMovimiento({
                id: uid("mov"),
                tenant_id: tenant.id,
                caja_id: caja.id,
                empleado_id: empleado.id,
                tipo: condicionCobro === "CREDITO" ? "ABONO" : condicionCobro === "ANTICIPO" ? "ABONO" : "VENTA",
                concepto:
                  condicionCobro === "CREDITO"
                    ? `Abono inicial orden a crédito #${ordenActualizada.numero} [${pd.metodo}]${pd.referencia ? ` (Ref: ${pd.referencia})` : ""}`
                    : condicionCobro === "ANTICIPO"
                    ? `Anticipo orden #${ordenActualizada.numero} [${pd.metodo}]${pd.referencia ? ` (Ref: ${pd.referencia})` : ""}`
                    : `Venta orden #${ordenActualizada.numero} [${pd.metodo}]${pd.referencia ? ` (Ref: ${pd.referencia})` : ""}`,
                monto: pd.monto,
                metodo: pd.metodo,
                orden_id: ordenActualizada.id,
                creado_en: new Date().toISOString(),
              })
            )
          );
        } else {
          await saveMovimiento({
            id: uid("mov"),
            tenant_id: tenant.id,
            caja_id: caja.id,
            empleado_id: empleado.id,
            tipo: condicionCobro === "CREDITO" ? "ABONO" : condicionCobro === "ANTICIPO" ? "ABONO" : "VENTA",
            concepto:
              condicionCobro === "CREDITO"
                ? `Abono inicial orden a crédito #${ordenActualizada.numero}`
                : condicionCobro === "ANTICIPO"
                ? `Anticipo orden #${ordenActualizada.numero}`
                : `Venta orden #${ordenActualizada.numero}`,
            monto: pagado,
            metodo: "EFECTIVO",
            orden_id: ordenActualizada.id,
            creado_en: new Date().toISOString(),
          });
        }
      }

      if (
        targetCliente &&
        servicioDomicilio &&
        direccionData.direccion.trim() &&
        direccionData.direccion !== targetCliente.direccion
      ) {
        void saveCliente({
          ...targetCliente,
          direccion: direccionData.direccion.trim(),
          sector: direccionData.sector || targetCliente.sector,
          edificio_apto: direccionData.edificio_apto || targetCliente.edificio_apto,
          referencia: direccionData.referencia || targetCliente.referencia,
          lat: direccionData.lat || targetCliente.lat,
          lng: direccionData.lng || targetCliente.lng,
        }).catch((addressError) => {
          console.error("Error actualizando dirección del cliente:", addressError);
        });
      }

      if (targetCliente) {
        queryClient.invalidateQueries({ queryKey: ["ordenes", tenantId] });
        queryClient.invalidateQueries({ queryKey: ["movimientos", tenantId] });
      }

      if (cfg.habilitar_control_marbetes && validMarbetes.length > 0) {
        const lastStrip = validMarbetes[validMarbetes.length - 1];
        const nextSec = parseInt(String(lastStrip.secuencia), 10);
        void saveTenant({
          ...tenant,
          config: {
            ...cfg,
            ultimo_marbete_color: lastStrip.color,
            ultimo_marbete_secuencia: isNaN(nextSec) ? undefined : nextSec,
          },
        }).catch(() => {});
      }

      setCreada({ ...ordenActualizada });
      setIsCobroModalOpen(false);
      resetPosOrder();
      releaseOrderCreation();
      toast.success(`Orden ${ordenActualizada.numero} creada ✅`);

      // Notificación automática de WhatsApp al cliente (Recibo / Ticket digital)
      // Se difiere unos segundos para permitir que el modal de cobro se cierre fluidamente y e-CF/DGII finalice sin colisiones
      if (targetCliente && targetCliente.telefono && targetCliente.telefono.trim() !== "" && targetCliente.telefono !== "---") {
        const montoRecibido = recibido > 0 ? recibido : pagado;
        const tenantSnapshot = { ...tenant };
        const clienteSnapshot = { ...targetCliente };
        const ordenSnapshot = { ...ordenActualizada };

        setTimeout(() => {
          notificarWhatsApp(
            tenantSnapshot,
            clienteSnapshot,
            ordenSnapshot,
            "creada",
            montoRecibido
          ).then((res) => {
            if (res.ok) {
              toast.success("Recibo digital enviado por WhatsApp al cliente 📱");
            } else if (res.reason && !res.reason.includes("desactivad") && !res.reason.includes("deshabilitad")) {
              console.warn("WhatsApp no enviado:", res.reason);
            }
          }).catch((err) => {
            console.error("Error al notificar por WhatsApp al crear orden:", err);
          });
        }, 2500);
      }

      // Auto-impresión al cobrar: dispara el diálogo nativo del navegador al instante
      if (cfg.pos_auto_imprimir !== false) {
        setShowPrintPortal({ ...ordenActualizada });
      } else {
        setShowTicket(true);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Error al crear la orden");
    } finally {
      releaseOrderCreation();
    }
  }

  async function next() {
    if (limits?.ordersReached) {
      setShowLimitModal(true);
      return;
    }
    if (step === 1 && !cliente) {
      const isConsumoFinal = tipoECF === "E32" || tipoECF === "B02";
      if (isConsumoFinal) {
        await handleSelectGeneric("Persona");
        return;
      }
      toast.error("Selecciona un cliente");
      return;
    }
    if (step === 2 && serviciosSel.length === 0 && !enablePrendas) {
      toast.error("Selecciona al menos un servicio");
      return;
    }
    if (step === 3 && items.length === 0 && (enableServicios ? serviciosSel.length === 0 : true)) {
      toast.error(
        enableServicios
          ? "Agrega al menos una prenda o selecciona un servicio"
          : "Agrega al menos una prenda",
      );
      return;
    }

    let nextStep = step + 1;
    if (nextStep === 2 && !enableServicios) nextStep = 3;
    if (nextStep === 3 && !enablePrendas) nextStep = 4;
    setStep(Math.min(5, nextStep));
  }

  function prev() {
    let prevStep = step - 1;
    if (prevStep === 3 && !enablePrendas) prevStep = 2;
    if (prevStep === 2 && !enableServicios) prevStep = 1;
    setStep(Math.max(1, prevStep));
  }

  const stepsList = [
    { id: 1, label: "Cliente" },
    enableServicios && { id: 2, label: "Servicios" },
    enablePrendas && { id: 3, label: "Prendas" },
    { id: 4, label: "Resumen" },
    { id: 5, label: "Cobro" },
  ].filter(Boolean) as { id: number; label: string }[];

  const currentVisibleStepIndex = stepsList.findIndex((s) => s.id === step);
  const currentVisibleStepNumber = currentVisibleStepIndex !== -1 ? currentVisibleStepIndex + 1 : 1;
  const totalVisibleSteps = stepsList.length;

  posStateRef.current = {
    isPosMode,
    items,
    serviciosSel,
    step,
    catalogFiltered,
    metodo,
    recibido,
    total,
    onCrearOrden,
    setIsClientModalOpen,
    setShowDiscountPOS,
    setShowNotesPOS,
    setShowOrdersDialog,
    toggleFullscreen,
    addItem,
    isCobroModalOpen,
    setIsCobroModalOpen,
    cfg,
    marbetesList,
    setMarbetesList,
    totalPiezasCalculadas,
    setShowMarbeteModal,
  };

  const getComprobanteInfo = (tipo: string) => {
    const isConsumo = tipo === "E32" || tipo === "B02";
    const isCredito = tipo === "E31" || tipo === "B01";

    const rawName = NCF_NOMBRES[tipo.substring(0, 3)] || "Comprobante";
    const cleanName = rawName.replace("FISCAL", "").trim();

    const name = cleanName
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    let label = "";
    if (isConsumo) {
      label = "Consumidor Final (01)";
    } else if (isCredito) {
      label = "Crédito Fiscal (02)";
    } else {
      label = `${name} (${tipo})`;
    }

    let colorClass = "";
    let icon = null;

    if (isConsumo) {
      colorClass =
        "border-emerald-500/40 text-emerald-600 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 focus:ring-emerald-500/50";
      icon = <UserIcon className="h-3.5 w-3.5 text-emerald-500 shrink-0" />;
    } else if (isCredito) {
      colorClass =
        "border-blue-500/40 text-blue-600 hover:bg-blue-50/30 dark:hover:bg-blue-950/10 focus:ring-blue-500/50";
      icon = <Building className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
    } else {
      colorClass =
        "border-amber-500/40 text-amber-600 hover:bg-amber-50/30 dark:hover:bg-amber-950/10 focus:ring-amber-500/50";
      icon = <Building2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
    }

    return { label, colorClass, icon, isConsumo };
  };

  return (
    <div
      style={{ zoom: 0.9 }}
      className={`mx-auto w-full ${isPosMode ? "max-w-none flex flex-col overflow-hidden h-full px-5 pt-3 pb-0" : "max-w-6xl px-4 md:px-6"}`}
    >
      {isPosMode ? (
        <style
          dangerouslySetInnerHTML={{
            __html: `
          main {
            padding: 0px !important;
            height: calc(100vh - 4rem) !important;
            min-height: calc(100vh - 4rem) !important;
            max-height: calc(100vh - 4rem) !important;
            overflow: hidden !important;
          }
        `,
          }}
        />
      ) : (
        <style
          dangerouslySetInnerHTML={{
            __html: `
          main {
            height: auto !important;
            min-height: calc(100vh - 4rem) !important;
            max-height: none !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
          }
        `,
          }}
        />
      )}
      {!caja && (
        <Card className="mb-4 flex items-center gap-3 border-warning/40 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="h-5 w-5 text-warning" />
          La caja está cerrada. Solo podrás registrar órdenes en crédito.
        </Card>
      )}

      {isPosMode ? (
        <div className="flex gap-6 overflow-hidden min-h-0 w-full flex-1">
          {/* CATALOG GRID */}
          <div className="flex-1 flex flex-col gap-4 overflow-hidden h-full">
            {/* Top row of POS: action buttons */}
            <div className="flex w-full flex-wrap items-center justify-between gap-2.5 py-1 sm:justify-start">
              {/* Action Buttons Group */}
              <div className="flex min-w-0 flex-nowrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeliveryPOS(true)}
                  className={`group inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-bold uppercase tracking-[0.015em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${servicioDomicilio ? "bg-blue-700 text-white shadow-inner ring-2 ring-blue-400 ring-offset-1 dark:ring-offset-background" : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"}`}
                >
                  <Truck
                    className={`h-4 w-4 transition-colors text-white ${servicioDomicilio ? "opacity-100" : "opacity-90 group-hover:opacity-100"}`}
                  />
                  <span>{servicioDomicilio ? "Envío activo" : "Envío a domicilio"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDiscountPOS(true)}
                  className={`group inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-bold uppercase tracking-[0.015em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${descuento > 0 ? "bg-rose-700 text-white shadow-inner ring-2 ring-rose-400 ring-offset-1 dark:ring-offset-background" : "bg-rose-600 hover:bg-rose-700 text-white shadow-sm"}`}
                >
                  <Percent
                    className={`h-4 w-4 transition-colors text-white ${descuento > 0 ? "opacity-100" : "opacity-90 group-hover:opacity-100"}`}
                  />
                  <span>{descuento > 0 ? `Desc. ${descuento}%` : "Descuento"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowNotesPOS(true)}
                  className={`group inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-bold uppercase tracking-[0.015em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${notas ? "bg-amber-600 hover:bg-amber-700 text-white shadow-inner ring-2 ring-amber-400 ring-offset-1 dark:ring-offset-background" : "bg-amber-500 hover:bg-amber-600 text-white shadow-sm"}`}
                >
                  <FileText
                    className={`h-4 w-4 transition-colors text-white ${notas ? "opacity-100" : "opacity-90 group-hover:opacity-100"}`}
                  />
                  <span>{notas ? "Nota activa" : "Notas"}</span>
                </button>

                {cfg.usar_ubicacion_ropa && (
                  <button
                    type="button"
                    onClick={() => setShowConveyorPOS(true)}
                    className={`group inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-bold uppercase tracking-[0.015em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${ubicacionRopa ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-inner ring-2 ring-indigo-400 ring-offset-1 dark:ring-offset-background" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"}`}
                  >
                    <MapPin
                      className={`h-4 w-4 transition-colors text-white ${ubicacionRopa ? "opacity-100" : "opacity-90 group-hover:opacity-100"}`}
                    />
                    <span>{ubicacionRopa ? `📍 ${ubicacionRopa}` : "Ubicación"}</span>
                  </button>
                )}

                {cfg.habilitar_control_marbetes && (
                  <button
                    type="button"
                    onClick={() => {
                      if (marbetesList.length === 0) {
                        setMarbetesList([
                          {
                            id: uid(),
                            color: "",
                            piezas: totalPiezasCalculadas || 1,
                            secuencia: "",
                          },
                        ]);
                      }
                      setShowMarbeteModal(true);
                    }}
                    className={`group inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-bold uppercase tracking-[0.015em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${
                      marbetesList.some((m) => m.secuencia)
                        ? "bg-amber-600 hover:bg-amber-700 text-white shadow-inner ring-2 ring-amber-400 ring-offset-1 dark:ring-offset-background"
                        : "bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                    }`}
                  >
                    <Tag className="h-4 w-4 transition-colors text-white" />
                    <span>
                      {(() => {
                        const valid = marbetesList.filter((m) => m.secuencia);
                        if (valid.length === 0) return "Marbete";
                        if (valid.length === 1) {
                          return `${valid[0].color || "Tira"} ${valid[0].piezas}p #${valid[0].secuencia}`;
                        }
                        const totalP = valid.reduce((acc, it) => acc + (Number(it.piezas) || 0), 0);
                        return `${valid.length} Tiras (${totalP} pzs)`;
                      })()}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowOrdersDialog(true)}
                  className="group inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-bold uppercase tracking-[0.015em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  <List className="h-4 w-4 text-white opacity-90 transition-colors group-hover:opacity-100" />
                  <span>Órdenes</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPosMode(false)}
                  title="Modo Clásico"
                  aria-label="Cambiar al modo clásico"
                  className="group inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 transition-colors hover:bg-slate-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Box className="h-4.5 w-4.5 text-slate-500 transition-colors group-hover:text-primary dark:text-slate-400" />
                </button>
              </div>
            </div>

            <PendingCollectionsDialog
              open={showOrdersDialog}
              onOpenChange={setShowOrdersDialog}
              authUser={user}
            />

            <DeliveryPOSDialog
              open={showDeliveryPOS}
              onOpenChange={(isOpen) => {
                setShowDeliveryPOS(isOpen);
                if (!isOpen && cliente) {
                  const isGenericClient =
                    cliente.nombre === "Consumidor" && cliente.apellido === "Final";
                  if (
                    !isGenericClient &&
                    (direccionData.direccion ||
                      direccionData.sector ||
                      direccionData.edificio_apto ||
                      direccionData.referencia)
                  ) {
                    const updatedCliente: Cliente = {
                      ...cliente,
                      direccion: direccionData.direccion || cliente.direccion,
                      sector: direccionData.sector || cliente.sector,
                      edificio_apto: direccionData.edificio_apto || cliente.edificio_apto,
                      referencia: direccionData.referencia || cliente.referencia,
                      lat: direccionData.lat || cliente.lat,
                      lng: direccionData.lng || cliente.lng,
                    };
                    setCliente(updatedCliente);
                    saveCliente(updatedCliente).then(() => {
                      queryClient.invalidateQueries({ queryKey: ["clientes", tenantId] });
                    });
                  }
                }
              }}
              enabled={servicioDomicilio}
              setEnabled={setServicioDomicilio}
              addressData={direccionData}
              setAddressData={setDireccionData}
              cost={costoDomicilio}
              setCost={setCostoDomicilio}
            />

            <DiscountPOSDialog
              open={showDiscountPOS}
              onOpenChange={setShowDiscountPOS}
              discount={descuento}
              setDiscount={setDescuento}
              empleado={user?.empleado}
            />

            <NotesPOSDialog
              open={showNotesPOS}
              onOpenChange={setShowNotesPOS}
              notas={notas}
              setNotas={setNotas}
            />

            <UbicacionSelectorDialog
              open={showConveyorPOS}
              onOpenChange={setShowConveyorPOS}
              ubicacionActual={ubicacionRopa}
              onSelectUbicacion={setUbicacionRopa}
              tenant={user?.tenant}
              ordenesActivas={ordenes}
            />

            <DeliveryDatePickerPOSDialog
              open={showDeliveryDatePickerPOS}
              onOpenChange={setShowDeliveryDatePickerPOS}
              fechaEntrega={fechaEntrega}
              setFechaEntrega={setFechaEntrega}
              esUrgente={esUrgente}
              setEsUrgente={setEsUrgente}
              cfg={cfg}
            />

            <Card className="flex-1 flex flex-col overflow-hidden border-2 border-primary/10 shadow-none rounded-3xl bg-card">
              {!(step === 1 && !cliente && !isPosMode) && (
                <div className="flex shrink-0 flex-col gap-3 border-b border-border/40 px-6 py-4 mb-2">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-base font-black tracking-tight text-slate-950 dark:text-white md:text-lg">
                          {catalogSummary.title}
                        </h2>
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[9px] font-black tabular-nums text-white shadow-sm dark:bg-primary dark:text-white">
                          {catalogSummary.count}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        {catalogSummary.helper}
                      </p>
                    </div>

                    {enableServicios && enablePrendas && (
                      <div className="inline-flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-slate-100/90 p-1 shadow-inner shadow-slate-200/40 dark:bg-slate-900 dark:shadow-none">
                        {(cfg?.pos_modalidad_operativa === "PRENDAS_CON_SERVICIOS"
                          ? [
                              { id: "TODOS", label: "Todos", icon: LayoutGrid },
                              { id: "PRENDAS", label: "Prendas", icon: Shirt },
                            ]
                          : cfg?.pos_modalidad_operativa === "SERVICIOS_PRIMERO"
                            ? [
                                { id: "SERVICIOS", label: "Servicios", icon: WashingMachine },
                                { id: "PRENDAS", label: "Prendas", icon: Shirt },
                              ]
                            : [
                                { id: "TODOS", label: "Todos", icon: LayoutGrid },
                                { id: "SERVICIOS", label: "Servicios", icon: WashingMachine },
                                { id: "PRENDAS", label: "Prendas", icon: Shirt },
                              ]
                        ).map((tab) => {
                          const isSelected = posFilterTab === tab.id;
                          const Icon = tab.icon;

                          return (
                            <button
                              key={tab.id}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => {
                                setPosFilterTab(tab.id as typeof posFilterTab);
                                setActiveCategory(
                                  tab.id === "PRENDAS" ? "TODAS LAS PRENDAS" : "TODOS",
                                );
                              }}
                              className={`inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 text-[11px] font-extrabold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 md:text-xs ${
                                isSelected
                                  ? "bg-primary text-white shadow-sm shadow-primary/20"
                                  : "text-slate-500 hover:bg-white/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                              }`}
                            >
                              <Icon
                                className={`h-3.5 w-3.5 ${isSelected ? "text-white" : "text-slate-500 dark:text-slate-400"}`}
                              />
                              <span>{tab.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {desgloseServiceName && !showDesgloseDialog && (
                    <div className="mt-2 py-2 px-3 rounded-xl bg-primary text-white shadow-sm border border-primary/20 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7.5 w-7.5 rounded-lg bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shrink-0 shadow-inner">
                          <Shirt className="h-4 w-4 text-white fill-white" />
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/90 shrink-0 hidden sm:inline">
                            DESGLOSE DE PRENDAS:
                          </span>
                          <div className="text-xs font-black text-white truncate flex items-center gap-1.5">
                            <span className="opacity-90 font-bold">Añadiendo prendas a:</span>
                            <span className="bg-[#F0B900] text-[#1B4B73] px-2.5 py-0.5 rounded-md font-black uppercase tracking-wider text-[11px] shadow-2xs">
                              {desgloseServiceName}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        className="h-7 px-3 text-[11px] font-black bg-white hover:bg-white/90 text-primary rounded-lg shadow-2xs transition-all active:scale-95 border border-white/40 cursor-pointer shrink-0 flex items-center gap-1.5"
                        onClick={() => setDesgloseServiceName("")}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary stroke-[2.5]" />
                        <span>Finalizar</span>
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-4 custom-scrollbar space-y-8 [scrollbar-gutter:stable]">
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-1 items-center gap-2 min-w-0">
                      <div
                        className={`relative flex-1 rounded-xl transition-all duration-200 ${searchGlow ? "ring-2 ring-primary/30 shadow-[0_0_12px_rgba(var(--primary),0.15)]" : ""}`}
                      >
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={posSearch}
                          onChange={(event) => setPosSearch(event.target.value)}
                          placeholder={
                            posFilterTab === "SERVICIOS"
                              ? "Búsqueda de servicios..."
                              : posFilterTab === "PRENDAS" || cfg?.pos_modalidad_operativa === "PRENDAS_CON_SERVICIOS"
                                ? "Búsqueda de prendas..."
                                : "Buscar prenda o servicio..."
                          }
                          aria-label="Buscar en el catálogo"
                          className="h-10 rounded-xl border-slate-200 bg-slate-50/80 pl-10 pr-3 shadow-none transition-colors focus-visible:border-primary/40 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-primary/15 dark:border-slate-700 dark:bg-slate-900/80 dark:focus-visible:bg-slate-900 text-xs font-medium"
                        />
                      </div>

                      {enablePrendas && (posFilterTab === "PRENDAS" || cfg?.pos_modalidad_operativa === "PRENDAS_CON_SERVICIOS") && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowCategoryModal(true)}
                          className="h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-extrabold text-xs text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                        >
                          <Tag className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate max-w-[130px]">
                            {activeCategory === "TODAS LAS PRENDAS" || activeCategory === "TODOS"
                              ? `CATEGORÍAS (${catalogByCategory.length})`
                              : activeCategory}
                          </span>
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0 stroke-[2.5]" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* SECCION SERVICIOS */}
                  {enableServicios &&
                    cfg?.pos_modalidad_operativa !== "PRENDAS_CON_SERVICIOS" &&
                    (posFilterTab === "TODOS" || posFilterTab === "SERVICIOS") &&
                    servicesFiltered.length > 0 && (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        <div
                          className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 ${isFullscreen ? "xl:grid-cols-5" : ""} gap-3`}
                        >
                          {servicesFiltered.map((s) => {
                            const srvCount = serviceCountsMap[s.nombre] || 0;
                            return (
                              <button
                                key={s.id}
                                onClick={() => {
                                  setServiciosSel((arr) =>
                                    arr.includes(s.nombre) ? arr : [...arr, s.nombre],
                                  );
                                  setDesgloseServiceName(s.nombre);
                                  setIndexDesglose(-1);
                                  if (enablePrendas) {
                                    setPosFilterTab("PRENDAS");
                                    setActiveCategory("TODAS LAS PRENDAS");
                                    toast.info(
                                      `Servicio "${s.nombre}" activo. Selecciona las prendas asociadas.`,
                                      { duration: 3000 },
                                    );
                                  }
                                }}
                                className={`group relative flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all active:scale-95 text-center ${
                                  srvCount > 0
                                    ? "border-primary bg-primary/10 shadow-glow"
                                    : "border-border bg-card hover:border-primary/40 hover:bg-primary/5 hover:shadow-elegant"
                                }`}
                              >
                                {s.imagen_url ? (
                                  <div className="h-24 w-24 rounded-2xl bg-background shadow-md overflow-hidden group-hover:scale-105 transition-transform duration-300">
                                    <img
                                      src={s.imagen_url}
                                      alt={s.nombre}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-accent/30 text-4xl group-hover:bg-primary/10 transition-colors">
                                    {s.icono || "🧹"}
                                  </div>
                                )}
                                <div className="w-full text-center">
                                  <div className="text-sm font-bold leading-tight line-clamp-1">
                                    {s.nombre}
                                  </div>
                                  <div className="mt-1 text-base font-display font-extrabold text-primary tracking-tight">
                                    {formatRD(s.precio)}
                                    {s.por_libra ? <span className="text-xs font-bold opacity-85">/lb</span> : ""}
                                  </div>
                                </div>
                                {srvCount > 0 && (
                                  <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-xs font-black shadow-glow animate-in zoom-in duration-300 ring-4 ring-background">
                                    {srvCount}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  {/* SECCIONES DE CATEGORIAS DE PRENDAS */}
                  {enablePrendas &&
                    (posFilterTab === "TODOS" || posFilterTab === "PRENDAS") &&
                    catalogByCategory.map(
                      ([catName, itemsInCat]) => {
                        return (
                          <div key={catName} className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                              <h3 className="flex items-center gap-2.5 text-sm font-black text-slate-800 dark:text-slate-100 md:text-base">
                                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/10 dark:bg-primary/20">
                                  <Shirt className="h-4 w-4" strokeWidth={2.2} />
                                </span>
                                {catName}
                              </h3>
                            </div>
                            <div
                              className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 ${isFullscreen ? "xl:grid-cols-5" : ""} gap-3`}
                            >
                              {itemsInCat.map((item) => {
                                const countInCart = itemCountsMap[item.nombre] || 0;
                                const srvMap = new Map<string, number>();
                                if (item.precios_servicios && typeof item.precios_servicios === "object") {
                                  Object.entries(item.precios_servicios).forEach(([k, p]) => {
                                    const num = Number(p);
                                    if (num > 0) {
                                      const srvObj = serviciosData.find(s => s.id === k || s.nombre.toLowerCase() === k.toLowerCase());
                                      const sName = srvObj ? srvObj.nombre : k;
                                      if (!srvObj && k.length > 20 && k.includes("-")) return;
                                      srvMap.set(sName, num);
                                    }
                                  });
                                }
                                const srvPrices = Array.from(srvMap.entries());

                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                      // 0. Modo SOLO_PRENDAS: Agregar de inmediato con precio base
                                      if (cfg?.pos_modalidad_operativa === "SOLO_PRENDAS") {
                                        addItem({
                                          descripcion: item.nombre,
                                          cantidad: 1,
                                          precio_unitario: item.precio || 0,
                                          es_libra: item.por_libra,
                                          is_exento: item.is_exento,
                                        });
                                        return;
                                      }

                                      // 1. Si el usuario está explícitamente desglosando prendas en un servicio
                                      if (desgloseServiceName) {
                                        const srvObj = serviciosData.find(s => s.nombre === desgloseServiceName || s.id === desgloseServiceName);
                                        const matchedPrice = (desgloseServiceName && item.precios_servicios?.[desgloseServiceName] !== undefined)
                                          ? Number(item.precios_servicios[desgloseServiceName])
                                          : (srvObj && item.precios_servicios?.[srvObj.id] !== undefined)
                                            ? Number(item.precios_servicios[srvObj.id])
                                            : (item.precio || 0);

                                        addItemDesglose({
                                          descripcion: `↳ ${item.nombre}`,
                                          cantidad: 1,
                                          precio_unitario: matchedPrice,
                                          es_libra: item.por_libra || false,
                                          is_exento: !!item.is_exento,
                                          servicio_origen: desgloseServiceName,
                                        });
                                        return;
                                      }

                                      // 2. Si la prenda tiene múltiples tratamientos -> Abrir selector de tratamiento
                                      if (srvPrices.length > 1) {
                                        setServicePickerItem(item);
                                        return;
                                      }

                                      // 3. Si la prenda tiene exactamente 1 tratamiento configurado
                                      if (srvPrices.length === 1) {
                                        const [singleSrvKey, singleSrvPrice] = srvPrices[0];
                                        const srvFound = serviciosData.find(s => s.id === singleSrvKey || s.nombre === singleSrvKey);
                                        const singleSrvName = srvFound ? srvFound.nombre : singleSrvKey;
                                        const price = Number(singleSrvPrice);
                                        setServiciosSel((prev) => {
                                          if (!prev.includes(singleSrvName)) {
                                            return [...prev, singleSrvName];
                                          }
                                          return prev;
                                        });
                                        setItems((arr) => {
                                          const itemDesc = `↳ ${item.nombre}`;
                                          const idx = arr.findIndex(
                                            (x) =>
                                              x.descripcion === itemDesc &&
                                              x.precio_unitario === price &&
                                              x.servicio_origen === singleSrvName,
                                          );
                                          if (idx > -1) {
                                            return arr.map((it, i) =>
                                              i === idx ? { ...it, cantidad: it.cantidad + 1 } : it,
                                            );
                                          }
                                          return [
                                            ...arr,
                                            {
                                              descripcion: itemDesc,
                                              cantidad: 1,
                                              precio_unitario: price,
                                              servicio_origen: singleSrvName,
                                              es_libra: item.por_libra || false,
                                              is_exento: !!item.is_exento,
                                            },
                                          ];
                                        });
                                        toast.success(`${item.nombre} agregado a ${singleSrvName} ✨`);
                                        return;
                                      }

                                      // 4. Si la modalidad es SERVICIOS_PRIMERO y no ha seleccionado servicio
                                      if (cfg?.pos_modalidad_operativa === "SERVICIOS_PRIMERO" && enableServicios && serviciosSel.length === 0) {
                                        toast.warning(
                                          "Por favor, selecciona primero un servicio.",
                                          {
                                            duration: 3500,
                                          },
                                        );
                                        setPosFilterTab("SERVICIOS");
                                        setActiveCategory("TODOS");
                                        return;
                                      }

                                      // 5. Prenda estándar suelta o anexada al último servicio si no tiene matriz propia
                                      const lastService = serviciosSel.length > 0 ? serviciosSel[serviciosSel.length - 1] : "";
                                      if (lastService && enableServicios) {
                                        addItemDesglose({
                                          descripcion: `↳ ${item.nombre}`,
                                          cantidad: 1,
                                          precio_unitario: item.precio || 0,
                                          es_libra: item.por_libra || false,
                                          is_exento: !!item.is_exento,
                                          servicio_origen: lastService,
                                        });
                                      } else {
                                        addItem({
                                          descripcion: item.nombre,
                                          cantidad: 1,
                                          precio_unitario: item.precio,
                                          es_libra: item.por_libra,
                                          is_exento: item.is_exento,
                                        });
                                      }
                                    }}
                                    className="group relative flex flex-col items-center justify-center gap-2.5 p-3 sm:p-4 rounded-2xl border-2 border-border bg-card hover:border-primary/40 hover:bg-primary/5 hover:shadow-elegant transition-all active:scale-95 text-center cursor-pointer"
                                  >
                                    {item.imagen_url ? (
                                      <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-background shadow-md overflow-hidden group-hover:scale-105 transition-transform duration-300">
                                        <img
                                          src={item.imagen_url}
                                          alt={item.nombre}
                                          className="h-full w-full object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-accent/30 text-3xl sm:text-4xl group-hover:bg-primary/10 transition-colors">
                                        {item.icono || "👕"}
                                      </div>
                                    )}
                                    <div className="w-full text-center">
                                      <div className="text-xs sm:text-sm font-bold leading-tight line-clamp-1">
                                        {item.nombre}
                                      </div>
                                      {item.descripcion && (
                                        <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5" title={item.descripcion}>
                                          {item.descripcion}
                                        </p>
                                      )}
                                      <div className="mt-1 text-sm sm:text-base font-display font-extrabold text-primary tracking-tight">
                                        {cfg?.pos_modalidad_operativa === "SOLO_PRENDAS" ? (
                                          formatRD(item.precio)
                                        ) : srvPrices.length > 1 ? (
                                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                            {srvPrices.length} servicios
                                          </span>
                                        ) : srvPrices.length === 1 ? (
                                          formatRD(Number(srvPrices[0][1]))
                                        ) : (
                                          formatRD(item.precio)
                                        )}
                                      </div>
                                    </div>

                                    {countInCart > 0 && (
                                      <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold shadow-glow animate-in zoom-in duration-200">
                                        {countInCart}
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      },
                    )}
                </>
              </div>
            </Card>
          </div>

          {/* SIDEBAR ORDER */}
          <Card className="w-80 md:w-96 flex flex-col overflow-hidden border-2 border-primary/10 shadow-none rounded-3xl h-full">
            <div className="p-3 border-b border-border/60 bg-gradient-to-b from-slate-50/80 via-slate-50/40 to-transparent dark:from-slate-900/60 dark:to-transparent space-y-2.5">
              {/* Row 1: Tipo de Comprobante Selector */}
              <div className="flex items-center justify-between gap-2.5 w-full">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0">
                  Tipo cliente:
                </span>
                <Select
                  value={tipoECF}
                  onValueChange={(val) => {
                    const info = getComprobanteInfo(val);
                    setTipoECF(val);
                    if (info.isConsumo) {
                      handleSelectGeneric("Persona");
                    } else {
                      setEmpresaDialogOpen(true);
                    }
                  }}
                >
                  <SelectTrigger
                    className={`h-9 flex-1 bg-white dark:bg-slate-900 border transition-all rounded-xl text-xs font-bold shadow-2xs px-3 flex items-center justify-between gap-2 focus:ring-1 duration-200 cursor-pointer ${
                      getComprobanteInfo(tipoECF).colorClass
                    }`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-border/80 shadow-md min-w-[220px]">
                    {validTipos
                      .filter((tipo) => {
                        const isConsumo = tipo === "E32" || tipo === "B02";
                        if (isConsumo) return true;
                        return isModuleEnabled(
                          user.tenant,
                          "facturacion_fiscal",
                          plans.find((p) => p.id === user.tenant.plan_id),
                        );
                      })
                      .map((tipo) => {
                        const info = getComprobanteInfo(tipo);
                        let itemStyles =
                          "focus:bg-emerald-500/10 focus:text-emerald-600 data-[state=checked]:bg-emerald-50 data-[state=checked]:text-emerald-600 data-[state=checked]:font-extrabold dark:data-[state=checked]:bg-emerald-950/40 dark:data-[state=checked]:text-emerald-400";
                        if (tipo === "E31" || tipo === "B01") {
                          itemStyles =
                            "focus:bg-blue-500/10 focus:text-blue-600 data-[state=checked]:bg-blue-50 data-[state=checked]:text-blue-600 data-[state=checked]:font-extrabold dark:data-[state=checked]:bg-blue-950/40 dark:data-[state=checked]:text-blue-400";
                        } else if (tipo !== "E32" && tipo !== "B02") {
                          itemStyles =
                            "focus:bg-amber-500/10 focus:text-amber-600 data-[state=checked]:bg-amber-50 data-[state=checked]:text-amber-600 data-[state=checked]:font-extrabold dark:data-[state=checked]:bg-amber-950/40 dark:data-[state=checked]:text-amber-400";
                        }

                        return (
                          <SelectItem
                            key={tipo}
                            value={tipo}
                            className={`rounded-lg text-xs font-bold py-2.5 px-3 cursor-pointer transition-colors ${itemStyles}`}
                          >
                            {info.label}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>

              {/* Row 2: Client Selection Card */}
              {cliente && cliente.nombre !== "Consumidor" && cliente.nombre !== "Empresa" ? (
                <div className="group relative flex items-center justify-between gap-2 p-2.5 rounded-2xl border border-primary/25 bg-white dark:bg-slate-900 shadow-xs hover:shadow-sm hover:border-primary/40 transition-all duration-200">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-xs shadow-2xs">
                      {cliente.tipo === "Empresa" ? (
                        <Building className="h-4 w-4" />
                      ) : (
                        <span>
                          {`${cliente.nombre[0] || ""}${cliente.apellido ? cliente.apellido[0] : ""}`.toUpperCase() ||
                            "CL"}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {cliente.nombre} {cliente.apellido || ""}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 h-4 font-bold border-primary/30 text-primary shrink-0"
                        >
                          {cliente.tipo === "Empresa" ? "Empresa" : "Cliente"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                        {cliente.telefono && cliente.telefono !== "---" && (
                          <span className="flex items-center gap-1 truncate">
                            <Phone className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                            {formatPhoneRD(cliente.telefono)}
                          </span>
                        )}
                        {cliente.cedula && (
                          <span className="truncate text-slate-400">ID: {cliente.cedula}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => setIsClientModalOpen(true)}
                      title="Cambiar cliente"
                    >
                      <Search className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      onClick={() => handleSelectGeneric("Persona")}
                      title="Restablecer a Consumidor Final"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(true)}
                  className="group relative flex items-center justify-between w-full h-11 px-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 hover:border-primary/60 hover:bg-primary/5 hover:shadow-xs transition-all duration-200 cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-primary group-hover:text-white transition-all duration-200 shadow-2xs">
                      <UserIcon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors truncate">
                        {cliente
                          ? `${cliente.nombre} ${cliente.apellido || ""}`
                          : "Buscar y añadir cliente"}
                      </span>
                      <span className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500 truncate -mt-0.5">
                        Seleccionar o registrar cliente
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-extrabold text-primary bg-primary/10 group-hover:bg-primary group-hover:text-white px-2.5 py-1 rounded-xl transition-all duration-200 shrink-0">
                    <Search className="h-3 w-3" />
                    <span>Buscar</span>
                  </div>
                </button>
              )}
            </div>

            {/* List: Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {items.length === 0 && serviciosSel.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center px-4 h-full animate-in fade-in duration-300 -mt-3">
                  <Receipt className="h-11 w-11 text-slate-400 mb-3 shrink-0" />
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    La orden está vacía
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">Agrega artículos desde el catálogo</p>
                </div>
              ) : (
                <>
                  {/* Servicios Seleccionados en Carrito POS */}
                  {selectedServices.map((srv) => {
                      const count = serviceCountsMap[srv.nombre] || 0;
                      const prendasDelServicio = indexedItems.filter(
                        ({ item }) =>
                          item.descripcion.startsWith("↳") &&
                          (item.servicio_origen
                            ? item.servicio_origen === srv.nombre
                            : serviciosSel[0] === srv.nombre),
                      );
                      const prendasConPrecio = prendasDelServicio.filter(
                        ({ item }) => (item.precio_unitario || 0) > 0,
                      );
                      const isAgrupador = cfg?.pos_modalidad_operativa !== "SERVICIOS_PRIMERO" && prendasConPrecio.length > 0;
                      const unitPrice =
                        customServicePrices[srv.nombre] !== undefined
                          ? customServicePrices[srv.nombre]
                          : (isAgrupador ? 0 : srv.precio || 0);

                      const isActiveService = desgloseServiceName === srv.nombre;

                      return (
                        <div key={`pos-srv-${srv.id || srv.nombre}`} className="space-y-2 mb-3">
                          <div
                            className={`flex flex-col gap-1.5 p-2.5 rounded-xl border transition-all animate-in fade-in duration-200 ${isActiveService ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/50 shadow-md ring-2 ring-emerald-400/50" : "border-primary/20 bg-primary/5"}`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-primary leading-tight flex-1">
                                <WashingMachine className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span className="line-clamp-1">{srv.nombre}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-destructive hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md shrink-0"
                                onClick={() => {
                                  setServiciosSel((prev) => {
                                    const index = prev.indexOf(srv.nombre);
                                    if (index > -1) {
                                      const next = [...prev];
                                      next.splice(index, 1);
                                      return next;
                                    }
                                    return prev;
                                  });
                                  setItems((prev) =>
                                    prev.filter(
                                      (it) =>
                                        !(
                                          it.descripcion.startsWith("↳") &&
                                          it.servicio_origen === srv.nombre
                                        ),
                                    ),
                                  );
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6 rounded-md bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 hover:text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 dark:hover:bg-rose-900/60"
                                  onClick={() => updateServiceQuantity(srv.nombre, -1)}
                                >
                                  <Minus className="h-2.5 w-2.5" />
                                </Button>
                                <span className="text-xs font-bold w-5 text-center">{count}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6 rounded-md bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/60"
                                  onClick={() => updateServiceQuantity(srv.nombre, 1)}
                                >
                                  <Plus className="h-2.5 w-2.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="default"
                                  size="sm"
                                  className={`h-6 px-2.5 text-[10px] font-extrabold gap-1.5 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer ml-1 text-white ${
                                    isActiveService
                                      ? "bg-emerald-800 text-white hover:bg-emerald-900 border-emerald-800"
                                      : "bg-primary text-white hover:bg-primary/90 border-primary"
                                  }`}
                                  title={`Añadir prendas para ${srv.nombre}`}
                                  onClick={() => {
                                    setIndexDesglose(-1);
                                    if (isActiveService) {
                                      setDesgloseServiceName("");
                                    } else {
                                      setDesgloseServiceName(srv.nombre);
                                      if (cfg?.pos_modal_desglose === true) {
                                        setShowDesgloseDialog(true);
                                      } else {
                                        setPosFilterTab("PRENDAS");
                                        setActiveCategory("TODAS LAS PRENDAS");
                                        toast.info(
                                          `Modo Servicio Activo: Se añadirán prendas a ${srv.nombre}`,
                                          { duration: 3000 },
                                        );
                                      }
                                    }
                                  }}
                                >
                                  {isActiveService ? (
                                    <>
                                      <Check className="h-3 w-3 stroke-[2.5]" />
                                      <span className="whitespace-nowrap">Finalizar</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="h-3 w-3 stroke-[2.5]" />
                                      <span className="whitespace-nowrap">Añadir prendas</span>
                                    </>
                                  )}
                                </Button>
                              </div>
                              {srv.permitir_editar_precio ? (
                                <div className="flex flex-col items-end gap-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs sm:text-sm font-black font-display text-muted-foreground select-none">
                                      RD$
                                    </span>
                                    <PriceInput
                                      className="w-24 sm:w-28 h-9 px-2 text-center !text-base sm:!text-lg md:!text-lg font-black font-display tracking-tight border-2 border-primary/50 bg-background focus:border-primary focus-visible:ring-1 focus-visible:ring-primary rounded-xl shadow-xs"
                                      value={unitPrice}
                                      onChange={(val) => {
                                        setCustomServicePrices((prev) => ({
                                          ...prev,
                                          [srv.nombre]: val,
                                        }));
                                      }}
                                    />
                                  </div>
                                  {count > 1 && (
                                    <span className="text-[10px] text-muted-foreground font-semibold">
                                      Tot: {formatRD(count * unitPrice)}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="text-xs font-black text-primary">
                                  {formatRD(count * unitPrice)}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Prendas del Servicio */}
                          {prendasDelServicio.map(({ item: it, index: itemOriginalIndex }) => {
                            return (
                              <div
                                key={"pos-detail-" + itemOriginalIndex}
                                className="flex flex-col gap-1.5 p-2 rounded-xl border transition-all bg-accent/5 ml-4 border-dashed border-primary/20 text-muted-foreground animate-in fade-in duration-150"
                              >
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                                    <Shirt className="h-3 w-3 text-primary shrink-0" />
                                    <span className="text-xs font-bold truncate">
                                      {it.descripcion}
                                      {it.cantidad > 1 ? ` (x${it.cantidad})` : ""}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingItemIndex(itemOriginalIndex);
                                        setItemEditColor(it.color || "");
                                        setItemEditColorHex(it.color_hex || "");
                                        setItemEditNota(it.notas || "");
                                        setShowItemDetailModal(true);
                                      }}
                                      className={`inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-bold transition-colors cursor-pointer shrink-0 ${
                                        it.color || it.notas
                                          ? "border border-[#1B4B73]/25 bg-[#1B4B73]/10 text-[#1B4B73] hover:bg-[#1B4B73]/15 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-300"
                                          : "border border-dashed border-[#1B4B73]/45 bg-white text-[#1B4B73] hover:bg-[#1B4B73]/5 dark:bg-slate-900 dark:text-sky-300"
                                      }`}
                                    >
                                      {it.color && (
                                        <span
                                          className="h-3 w-3 rounded-full border border-black/20 shrink-0"
                                          style={{
                                            background:
                                              it.color_hex?.startsWith("#") ||
                                              it.color_hex?.startsWith("linear")
                                                ? it.color_hex
                                                : "#94A3B8",
                                          }}
                                        />
                                      )}
                                      <Palette className="h-3.5 w-3.5 shrink-0" />
                                      <span>Color / Nota</span>
                                    </button>
                                  </div>

                                  {/* Botón Redondeado de Color / Nota */}
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 text-destructive hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md shrink-0"
                                      onClick={() => removeItem(itemOriginalIndex)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>

                                <div className="flex justify-between items-center pt-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-5 w-5 rounded-md bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800"
                                      onClick={() => updateItemQuantity(itemOriginalIndex, -1)}
                                    >
                                      <Minus className="h-2 w-2" />
                                    </Button>
                                    <span className="text-xs font-bold w-4 text-center">
                                      {it.cantidad}
                                    </span>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-5 w-5 rounded-md bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                                      onClick={() => updateItemQuantity(itemOriginalIndex, 1)}
                                    >
                                      <Plus className="h-2 w-2" />
                                    </Button>
                                  </div>
                                  <div className="text-xs font-black text-primary">
                                    {formatRD(it.cantidad * it.precio_unitario)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}

                  {/* Prendas / Items Generales del Catálogo */}
                  {generalItems.map(({ item: it, index: itemOriginalIndex }) => {
                      const isDetail = it.descripcion.startsWith("↳");
                      const catalogMatch = catalogoMap.get(it.descripcion);
                      return (
                        <div
                          key={"pos-item-" + itemOriginalIndex}
                          className={`flex flex-col gap-1.5 p-2 rounded-xl border transition-all ${
                            isDetail
                              ? "bg-accent/5 ml-4 border-dashed border-primary/20 text-muted-foreground"
                              : "bg-card shadow-xs hover:border-primary/25"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                              {isDetail && <Shirt className="h-3 w-3 text-primary shrink-0" />}
                              <span className="text-xs font-bold truncate">
                                {it.descripcion}
                                {isDetail && it.cantidad > 1 ? ` (x${it.cantidad})` : ""}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItemIndex(itemOriginalIndex);
                                  setItemEditColor(it.color || "");
                                  setItemEditColorHex(it.color_hex || "");
                                  setItemEditNota(it.notas || "");
                                  setShowItemDetailModal(true);
                                }}
                                className={`inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-bold transition-colors cursor-pointer shrink-0 ${
                                  it.color || it.notas
                                    ? "border border-[#1B4B73]/25 bg-[#1B4B73]/10 text-[#1B4B73] hover:bg-[#1B4B73]/15 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-300"
                                    : "border border-dashed border-[#1B4B73]/45 bg-white text-[#1B4B73] hover:bg-[#1B4B73]/5 dark:bg-slate-900 dark:text-sky-300"
                                }`}
                              >
                                {it.color && (
                                  <span
                                    className="h-3 w-3 rounded-full border border-black/20 shrink-0"
                                    style={{
                                      background:
                                        it.color_hex?.startsWith("#") ||
                                        it.color_hex?.startsWith("linear")
                                          ? it.color_hex
                                          : "#94A3B8",
                                    }}
                                  />
                                )}
                                <Palette className="h-3.5 w-3.5 shrink-0" />
                                <span>Color / Nota</span>
                              </button>
                            </div>

                            {/* Botón Redondeado de Color / Nota */}
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-destructive hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md shrink-0"
                                onClick={() => removeItem(itemOriginalIndex)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-0.5">
                            {it.es_libra ? (
                              <div className="flex items-center gap-1.5 text-xs font-semibold">
                                <span className="text-slate-850 dark:text-slate-300 text-[10px] font-black">
                                  Peso:
                                </span>
                                <Input
                                  type="number"
                                  step="any"
                                  min="0.1"
                                  className="w-16 h-6 text-center text-xs font-black border-primary/30 focus:border-primary focus-visible:ring-0 rounded-md shadow-xs p-1"
                                  value={it.cantidad}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setItems((prev) =>
                                      prev.map((item, idx) =>
                                        idx === itemOriginalIndex ? { ...item, cantidad: val } : item,
                                      ),
                                    );
                                  }}
                                />
                                <span className="text-muted-foreground text-[10px] font-bold">
                                  lb
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-5 w-5 rounded-md bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800"
                                  onClick={() => updateItemQuantity(itemOriginalIndex, -1)}
                                >
                                  <Minus className="h-2 w-2" />
                                </Button>
                                <span className="text-xs font-bold w-4 text-center">
                                  {it.cantidad}
                                </span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-5 w-5 rounded-md bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                                  onClick={() => updateItemQuantity(itemOriginalIndex, 1)}
                                >
                                  <Plus className="h-2 w-2" />
                                </Button>
                                {!isDetail && catalogMatch?.permitir_desglose && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-5 px-1.5 text-[9px] font-extrabold gap-0.5 bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 rounded-md shadow-2xs transition-all cursor-pointer ml-1"
                                    title="Añadir prenda"
                                    onClick={() => {
                                      setIndexDesglose(itemOriginalIndex);
                                      setDesgloseServiceName(it.descripcion);
                                      setShowDesgloseDialog(true);
                                    }}
                                  >
                                    <Plus className="h-2.5 w-2.5 stroke-[2.5]" />
                                    <span>Prenda</span>
                                  </Button>
                                )}
                              </div>
                            )}
                            <div className="flex flex-col items-end gap-0.5 shrink-0">
                              {!isDetail && catalogMatch?.permitir_editar_precio ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs sm:text-sm font-black font-display text-muted-foreground select-none">
                                    RD$
                                  </span>
                                  <PriceInput
                                    className="w-24 sm:w-28 h-9 px-2 text-center !text-base sm:!text-lg md:!text-lg font-black font-display tracking-tight border-2 border-primary/50 bg-background focus:border-primary focus-visible:ring-1 focus-visible:ring-primary rounded-xl shadow-xs"
                                    value={it.precio_unitario || 0}
                                    onChange={(val) => {
                                      setItems((prev) =>
                                        prev.map((item, idx) =>
                                          idx === itemOriginalIndex ? { ...item, precio_unitario: val } : item,
                                        ),
                                      );
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="text-xs font-black text-primary">
                                  {isDetail
                                    ? "RD$0.00"
                                    : formatRD(it.cantidad * it.precio_unitario)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </>
              )}
            </div>
            {/* Sección de Fecha Estimada de Entrega */}
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/60 border-t border-border/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-350">
                    Fecha estimada de entrega
                  </span>
                </div>
                <Switch
                  checked={!!fechaEntrega}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      const d = new Date();
                      d.setHours(12, 0, 0, 0);
                      const standardHrs = cfg.tiempo_entrega_estandar || 24;
                      d.setTime(d.getTime() + standardHrs * 3600000);
                      setFechaEntrega(d);
                    } else {
                      setFechaEntrega(undefined);
                    }
                  }}
                  className="scale-90 data-[state=checked]:bg-primary"
                />
              </div>

              {fechaEntrega && (
                <div
                  onClick={() => setShowDeliveryDatePickerPOS(true)}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl border border-transparent bg-primary text-white shadow-md hover:bg-primary/95 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <CalendarIcon className="h-4 w-4 text-white shrink-0" />
                    <span className="text-[13px] font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis">
                      {(() => {
                        const weekday = fechaEntrega.toLocaleDateString("es-DO", {
                          weekday: "long",
                        });
                        const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
                        const day = fechaEntrega.getDate();
                        const month = fechaEntrega.toLocaleDateString("es-DO", { month: "long" });
                        const capMonth = month.charAt(0).toUpperCase() + month.slice(1);
                        return `${capWeekday}, ${day} de ${capMonth}`;
                      })()}
                    </span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-yellow-400 text-black shrink-0 transition-all hover:bg-yellow-300 shadow-2xs ml-2">
                    Cambiar
                  </span>
                </div>
              )}
            </div>

            {/* TODO: Descomentar para restaurar "Marcar orden como urgente" si el usuario lo vuelve a solicitar.
            <div className="px-4 py-2.5 bg-rose-500/[0.02] border-t border-primary/10 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer w-full select-none justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-4 w-4 transition-colors duration-200 ${esUrgente ? "text-rose-600 animate-pulse" : "text-muted-foreground/50"}`} />
                  <span className={`text-xs font-bold transition-colors duration-200 ${esUrgente ? "text-rose-600 dark:text-rose-400 font-extrabold" : "text-muted-foreground"}`}>
                    Marcar orden como urgente {cfg.recargo_urgencia > 0 && `(+${cfg.recargo_urgencia}%)`}
                  </span>
                </div>
                <Switch
                  checked={esUrgente}
                  onCheckedChange={setEsUrgente}
                  className="scale-90 data-[state=checked]:bg-rose-600"
                />
              </label>
            </div>
            */}

            {/* Footer: Totals & Button */}
            <div className="p-3 bg-primary/5 border-t border-primary/10 space-y-1.5">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground font-bold">
                  <span>SUBTOTAL</span>
                  <span>{formatRD(subtotalBruto)}</span>
                </div>
                {esUrgente && recargoTotal > 0 && (
                  <div className="flex justify-between text-xs text-rose-600 font-bold">
                    <span>RECARGO URGENTE (+{cfg.recargo_urgencia}%)</span>
                    <span>+{formatRD(recargoTotal)}</span>
                  </div>
                )}
                {itbis > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground font-bold">
                    <span>ITBIS ({cfg.itbis_porcentaje}%)</span>
                    <span>{formatRD(itbis)}</span>
                  </div>
                )}
                {descuentoMonto > 0 && (
                  <div className="flex justify-between text-xs text-rose-600 font-bold">
                    <span>DESCUENTO ({descuento}%)</span>
                    <span>-{formatRD(descuentoMonto)}</span>
                  </div>
                )}
                {servicioDomicilio && costoEnvio > 0 && (
                  <div className="flex justify-between text-xs text-teal-600 font-bold">
                    <span>ENVÍO A DOMICILIO</span>
                    <span>+{formatRD(costoEnvio)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-primary/10">
                  <span className="text-sm font-black uppercase">Total</span>
                  <span className="text-2xl font-black text-primary">{formatRD(total)}</span>
                </div>
              </div>
              {isPosMode ? (
                <Button
                  disabled={!cliente || (items.length === 0 && serviciosSel.length === 0)}
                  className="w-full h-14 text-base bg-primary hover:bg-primary/95 text-white shadow-glow border-none transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2.5 rounded-2xl relative px-10"
                  onClick={handleAbrirCobro}
                >
                  <div className="flex items-center gap-2 justify-center">
                    <CreditCard className="h-5.5 w-5.5 text-white" />
                    <span className="font-black tracking-wide">COBRAR ORDEN</span>
                  </div>
                  <kbd className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none rounded bg-white/20 px-2.5 py-1 text-[11px] font-black text-white shadow-sm border-none uppercase flex items-center gap-1">
                    <span>Enter</span>
                    <CornerDownLeft className="h-3 w-3 shrink-0" />
                  </kbd>
                </Button>
              ) : (
                <Button
                  disabled={!cliente || (items.length === 0 && serviciosSel.length === 0)}
                  className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 text-white shadow-glow border-none transition-all active:scale-[0.98] mt-2"
                  onClick={handleAbrirCobro}
                >
                  COBRAR <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              )}
            </div>
          </Card>
        </div>
      ) : (
        <>
          {/* Header Bar */}
          <div className="relative flex items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-border max-w-4xl mx-auto w-full">
            {/* Left element spacer */}
            <div className="w-8 md:w-36 shrink-0" />

            {/* Centered Mode indicator */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5 whitespace-nowrap">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="font-display text-sm font-black uppercase tracking-[0.15em] text-slate-800 dark:text-slate-200">
                Modo Clásico
              </span>
            </div>

            {cfg.pos_modo_defecto !== false && (
              <Button
                onClick={() => setIsPosMode(true)}
                className="bg-primary text-white hover:bg-primary/90 rounded-xl font-bold text-xs gap-1.5 h-10 shadow-sm active:scale-95 transition-all shrink-0"
              >
                <LayoutGrid className="h-4 w-4" />
                <span>Cambiar a Modo POS</span>
              </Button>
            )}
          </div>

          {/* Centered Stepper Wizard */}
          <div className="mt-4 mb-3 flex justify-center w-full">
            <Stepper step={step} enableServicios={enableServicios} enablePrendas={enablePrendas} />
          </div>

          <Card className="w-full max-w-4xl mx-auto mt-0 p-6 md:p-8">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              {step === 1 && (
                <>
                  <h2 className="mb-1 text-2xl font-display">Cliente</h2>
                  <p className="mb-5 text-sm text-muted-foreground">
                    Busca por nombre o teléfono. Si no existe, créalo.
                  </p>

                  <div className="flex items-center gap-2 mt-2 mb-3">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Tipo de cliente
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {validTipos.map((tipo) => {
                      const isConsumo = tipo === "E32" || tipo === "B02";
                      const isCredito = tipo === "E31" || tipo === "B01";
                      const name =
                        NCF_NOMBRES[tipo.substring(0, 3)]?.replace("FISCAL", "")?.trim() ||
                        "Empresa";

                      const label = isConsumo
                        ? "Consumidor Final (01)"
                        : isCredito
                          ? "Crédito Fiscal (02)"
                          : name;
                      const subLabel = isConsumo
                        ? "Factura Consumo"
                        : isCredito
                          ? "Crédito Fiscal"
                          : `Comprobante ${tipo}`;
                      const Icon = isConsumo ? UserIcon : isCredito ? Truck : Building;

                      const isSelected = tipoECF === tipo;
                      let borderClass = "";
                      let bgClass = "";
                      let bgIconClass = "";
                      let textClass = "";
                      let subTextClass = "";

                      if (isConsumo) {
                        bgClass = isSelected
                          ? "bg-emerald-50/70 dark:bg-emerald-950/20"
                          : "bg-emerald-50/20 dark:bg-emerald-950/5";
                        borderClass = isSelected
                          ? "border-emerald-500 ring-2 ring-emerald-500/20"
                          : "border-emerald-200/80 dark:border-emerald-900/40 hover:border-emerald-300";
                        bgIconClass = isSelected
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
                        textClass = isSelected
                          ? "text-emerald-700 dark:text-emerald-300 font-extrabold"
                          : "text-slate-700 dark:text-slate-355 font-bold";
                        subTextClass = isSelected
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-500 dark:text-slate-400";
                      } else if (isCredito) {
                        bgClass = isSelected
                          ? "bg-blue-50/70 dark:bg-blue-950/20"
                          : "bg-blue-50/20 dark:bg-blue-950/5";
                        borderClass = isSelected
                          ? "border-blue-500 ring-2 ring-blue-500/20"
                          : "border-blue-200/80 dark:border-blue-900/40 hover:border-blue-300";
                        bgIconClass = isSelected
                          ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
                        textClass = isSelected
                          ? "text-blue-700 dark:text-blue-300 font-extrabold"
                          : "text-slate-700 dark:text-slate-355 font-bold";
                        subTextClass = isSelected
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-slate-500 dark:text-slate-400";
                      } else {
                        bgClass = isSelected
                          ? "bg-amber-50/70 dark:bg-amber-950/20"
                          : "bg-amber-50/20 dark:bg-amber-950/5";
                        borderClass = isSelected
                          ? "border-amber-500 ring-2 ring-amber-500/20"
                          : "border-amber-200/80 dark:border-amber-900/40 hover:border-amber-300";
                        bgIconClass = isSelected
                          ? "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
                        textClass = isSelected
                          ? "text-amber-700 dark:text-amber-300 font-extrabold"
                          : "text-slate-700 dark:text-slate-355 font-bold";
                        subTextClass = isSelected
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-slate-500 dark:text-slate-400";
                      }

                      // We only show non-consumo buttons if billing is active
                      if (
                        !isConsumo &&
                        !isModuleEnabled(
                          user.tenant,
                          "facturacion_fiscal",
                          plans.find((p) => p.id === user.tenant.plan_id),
                        )
                      ) {
                        return null;
                      }

                      return (
                        <button
                          key={tipo}
                          onClick={() => {
                            setTipoECF(tipo);
                            if (isConsumo) {
                              handleSelectGeneric("Persona");
                            } else {
                              setEmpresaDialogOpen(true);
                            }
                          }}
                          className={`relative flex items-center gap-2.5 p-3 rounded-2xl border transition-all group text-left shadow-sm ${bgClass} ${borderClass}`}
                        >
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 ${bgIconClass}`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1 pr-4">
                            <div
                              className={`font-bold text-sm leading-tight line-clamp-1 ${textClass}`}
                            >
                              {label}
                            </div>
                            <div
                              className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 whitespace-nowrap ${subTextClass}`}
                            >
                              {subLabel}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white shadow-sm ring-2 ring-background animate-in zoom-in duration-200">
                              <Check className="h-2.5 w-2.5" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="relative mb-6">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                    <Input
                      value={clienteSearch}
                      onChange={(e) => setClienteSearch(e.target.value)}
                      placeholder="Nombre o teléfono..."
                      className="pl-10 h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                    />
                  </div>

                  <div className="mt-8 mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="h-3.5 w-1 bg-primary rounded-full animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-widest text-primary/80">
                        Búsqueda en base de datos
                      </span>
                      <div className="flex-1 h-px bg-primary/10 mr-4" />
                    </div>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm transition-all active:scale-95 shrink-0"
                      size="sm"
                      onClick={() => setShowNewCliente(true)}
                    >
                      <UserPlus className="mr-1.5 h-4 w-4" /> Nuevo cliente
                    </Button>
                  </div>

                  <div className="mt-4 max-h-80 grid gap-3 grid-cols-1 sm:grid-cols-2 overflow-auto rounded-xl border border-border bg-accent/10 p-3">
                    {filtrados.length === 0 && (
                      <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
                        No se encontraron clientes
                      </div>
                    )}
                    {filtrados.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setCliente(c);
                          if (!isPosMode) {
                            irAlPasoSiguienteDelCliente();
                          }
                        }}
                        className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-all min-w-0 ${
                          cliente?.id === c.id
                            ? "border-primary bg-primary/10 ring-1 ring-primary shadow-sm"
                            : "border-border bg-card hover:border-primary/50 hover:bg-accent/30 hover:shadow-elegant"
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                              cliente?.id === c.id
                                ? "bg-primary text-white"
                                : "bg-accent text-muted-foreground"
                            }`}
                          >
                            {c.nombre.charAt(0)}
                            {c.apellido?.charAt(0) || ""}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              className="font-display text-base font-semibold line-clamp-1"
                              title={`${c.nombre} ${c.apellido || ""}`}
                            >
                              {c.nombre} {c.apellido || ""}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                              <Phone className="h-3 w-3 shrink-0" /> {c.telefono}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {c.tipo === "Empresa" ? (
                            <Badge
                              variant="outline"
                              className="border-blue-500/20 bg-blue-500/10 text-blue-600"
                            >
                              Empresa
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                            >
                              Consumidor Final
                            </Badge>
                          )}
                          {cliente?.id === c.id && (
                            <Check className="h-5 w-5 text-primary animate-in zoom-in duration-200" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h2 className="mb-1 text-2xl font-display">Servicios</h2>
                  <p className="mb-5 text-sm text-muted-foreground">
                    Selecciona los servicios incluidos en esta orden.
                  </p>
                  {servicios.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                      No hay servicios. Agrégalos en <strong>Catálogo</strong>.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {servicios.map((s) => {
                        const srvCount = serviceCountsMap[s.nombre] || 0;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              if (srvCount > 0) {
                                setServiciosSel((arr) => arr.filter((x) => x !== s.nombre));
                                setCustomServicePrices((prev) => {
                                  const next = { ...prev };
                                  delete next[s.nombre];
                                  return next;
                                });
                              } else {
                                setServiciosSel((arr) => [...arr, s.nombre]);
                              }
                            }}
                            className={`group relative flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all active:scale-95 text-center cursor-pointer ${
                              srvCount > 0
                                ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-sm"
                                : "border-border/70 bg-card hover:border-emerald-500/50 hover:bg-emerald-50/20 hover:shadow-sm"
                            }`}
                          >
                            {s.imagen_url ? (
                              <div className="h-16 w-16 rounded-xl bg-background shadow-xs overflow-hidden group-hover:scale-105 transition-transform duration-300">
                                <img
                                  src={s.imagen_url}
                                  alt={s.nombre}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-accent/30 text-2xl group-hover:bg-primary/10 transition-colors">
                                {s.icono || "🧹"}
                              </div>
                            )}
                            <div className="w-full text-center">
                              <div className="text-xs font-bold leading-tight line-clamp-1 text-slate-800 dark:text-slate-100">
                                {s.nombre}
                              </div>
                              <div className="mt-0.5 text-xs font-display font-extrabold text-emerald-600 tracking-tight">
                                {s.precio > 0 ? formatRD(s.precio) : "RD$0.00"}
                              </div>
                            </div>
                            {srvCount > 0 && (
                              <div className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-black shadow-sm animate-in zoom-in duration-300 ring-2 ring-background">
                                {srvCount}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {step === 3 && (
                <>
                  <h2 className="mb-1 text-2xl font-display">Prendas y precios</h2>
                  <p className="mb-5 text-sm text-muted-foreground">
                    Agrega cada prenda o desglosa los servicios contratados.
                  </p>

                  <div className="space-y-2">
                    {/* Servicios Seleccionados para desglose */}
                    {selectedServices.map((srv) => {
                        const count = serviceCountsMap[srv.nombre] || 0;
                        const prendasConPrecio = items.filter(
                          (it) =>
                            it.descripcion.startsWith("↳") &&
                            it.servicio_origen === srv.nombre &&
                            (it.precio_unitario || 0) > 0,
                        );
                        const isAgrupador = cfg?.pos_modalidad_operativa !== "SERVICIOS_PRIMERO" && prendasConPrecio.length > 0;
                        const unitPrice =
                          customServicePrices[srv.nombre] !== undefined
                            ? customServicePrices[srv.nombre]
                            : (isAgrupador ? 0 : srv.precio || 0);
                        return (
                          <div
                            key={`srv-${srv.id || srv.nombre}`}
                            className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 animate-in fade-in duration-200"
                          >
                            <div className="flex-1">
                              <div className="font-semibold text-primary flex items-center gap-1.5 text-sm sm:text-base">
                                <span>🧺</span> {srv.nombre}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {srv.permitir_desglose
                                  ? 'Servicio de la orden · Haz clic en "+" para detallar sus prendas'
                                  : "Servicio de la orden"}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6 rounded-md bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 hover:text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 dark:hover:bg-rose-900/60"
                                onClick={() => updateServiceQuantity(srv.nombre, -1)}
                              >
                                <Minus className="h-2.5 w-2.5" />
                              </Button>
                              <span className="text-xs font-bold w-5 text-center">{count}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6 rounded-md bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/60"
                                onClick={() => updateServiceQuantity(srv.nombre, 1)}
                              >
                                <Plus className="h-2.5 w-2.5" />
                              </Button>
                            </div>

                            <div className="flex flex-col items-end gap-0.5 shrink-0">
                              {srv.permitir_editar_precio ? (
                                <div className="flex flex-col items-end gap-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-muted-foreground select-none">
                                      RD$
                                    </span>
                                    <PriceInput
                                      className="w-24 sm:w-28 h-8.5 px-2 text-center text-sm font-black font-display border border-primary/40 bg-background focus:border-primary focus-visible:ring-1 focus-visible:ring-primary rounded-xl shadow-xs"
                                      value={unitPrice}
                                      onChange={(val) => {
                                        setCustomServicePrices((prev) => ({
                                          ...prev,
                                          [srv.nombre]: val,
                                        }));
                                      }}
                                    />
                                  </div>
                                  {count > 1 && (
                                    <span className="text-[10px] text-muted-foreground font-semibold">
                                      Tot: {formatRD(count * unitPrice)}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="font-display text-base sm:text-lg font-bold text-primary">
                                  {formatRD(count * unitPrice)}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {srv.permitir_desglose && (
                                <Button
                                  type="button"
                                  variant="default"
                                  size="sm"
                                  className="h-7 px-2.5 text-xs font-extrabold gap-1 bg-primary text-white hover:bg-primary/90 border-primary rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer ml-1"
                                  title={`Desglosar prendas para el servicio ${srv.nombre}`}
                                  onClick={() => {
                                    setIndexDesglose(-1);
                                    setDesgloseServiceName(srv.nombre);
                                    setShowDesgloseDialog(true);
                                  }}
                                >
                                  <Plus className="h-3 w-3 stroke-[2.5]" />
                                  <span className="whitespace-nowrap">Desglosar prendas</span>
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md cursor-pointer"
                                onClick={() => {
                                  setServiciosSel((prev) => prev.filter((x) => x !== srv.nombre));
                                  setItems((prev) =>
                                    prev.filter(
                                      (it) =>
                                        !(
                                          it.descripcion.startsWith("↳") &&
                                          it.servicio_origen === srv.nombre
                                        ),
                                    ),
                                  );
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}

                    {/* Items normal */}
                    {items.map((it, i) => {
                      const isDetail = it.descripcion.startsWith("↳");
                      const catalogMatch = catalogoMap.get(it.descripcion);
                      return (
                        <div
                          key={i}
                          className={`flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-all ${
                            isDetail
                              ? "bg-accent/5 ml-8 border-dashed border-primary/20 text-muted-foreground"
                              : "bg-surface-elevated"
                          }`}
                        >
                          <div className="flex-1">
                            <div className="font-medium flex items-center gap-2 flex-wrap">
                              {isDetail && <Shirt className="h-3 w-3 text-primary" />}
                              <span>
                                {it.descripcion}
                                {isDetail && it.cantidad > 1 ? ` (x${it.cantidad})` : ""}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItemIndex(i);
                                  setItemEditColor(it.color || "");
                                  setItemEditColorHex(it.color_hex || "");
                                  setItemEditNota(it.notas || "");
                                  setShowItemDetailModal(true);
                                }}
                                className={`inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                                  it.color || it.notas
                                    ? "border border-[#1B4B73]/25 bg-[#1B4B73]/10 text-[#1B4B73] hover:bg-[#1B4B73]/15 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-300"
                                    : "border border-dashed border-[#1B4B73]/45 bg-white text-[#1B4B73] hover:bg-[#1B4B73]/5 dark:bg-slate-900 dark:text-sky-300"
                                }`}
                              >
                                {it.color && (
                                  <span
                                    className="h-3 w-3 rounded-full border border-black/20 shrink-0"
                                    style={{
                                      background:
                                        it.color_hex?.startsWith("#") ||
                                        it.color_hex?.startsWith("linear")
                                          ? it.color_hex
                                          : "#94A3B8",
                                    }}
                                  />
                                )}
                                <Palette className="h-3.5 w-3.5 shrink-0" />
                                <span>{it.color || it.notas ? "Color / Nota" : "+ Color / Nota"}</span>
                              </button>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {isDetail
                                ? `${it.cantidad} ${it.cantidad > 1 ? "unidades" : "unidad"} en Hamper (Lavado Incluido)`
                                : it.es_libra
                                  ? `${it.cantidad} lb × ${formatRD(it.precio_unitario)}`
                                  : `${it.cantidad} unid. × ${formatRD(it.precio_unitario)}`}
                              {it.notas ? ` · ${it.notas}` : ""}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {!isDetail && catalogMatch?.permitir_editar_precio ? (
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs sm:text-sm font-black font-display text-muted-foreground select-none">
                                    RD$
                                  </span>
                                  <PriceInput
                                    className="w-24 sm:w-28 h-9 px-2 text-center !text-base sm:!text-lg md:!text-lg font-black font-display tracking-tight border-2 border-primary/50 bg-background focus:border-primary focus-visible:ring-1 focus-visible:ring-primary rounded-xl shadow-xs"
                                    value={it.precio_unitario || 0}
                                    onChange={(val) => {
                                      setItems((prev) =>
                                        prev.map((item, idx) =>
                                          idx === i ? { ...item, precio_unitario: val } : item,
                                        ),
                                      );
                                    }}
                                  />
                                </div>
                                {it.cantidad > 1 && (
                                  <span className="text-[10px] text-muted-foreground font-semibold">
                                    Total: {formatRD(it.cantidad * it.precio_unitario)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="font-display text-lg">
                                {isDetail ? "RD$0.00" : formatRD(it.cantidad * it.precio_unitario)}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {!isDetail && catalogMatch?.permitir_desglose && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary hover:bg-primary/10 rounded-md"
                                title="Desglosar Ropa en Hamper / Bolsa"
                                onClick={() => {
                                  setIndexDesglose(i);
                                  setDesgloseServiceName(it.descripcion);
                                  setShowDesgloseDialog(true);
                                }}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeItem(i)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {items.length === 0 && serviciosSel.length === 0 && (
                      <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                        No hay prendas ni servicios agregados. Haz clic en "Agregar prenda".
                      </div>
                    )}
                  </div>

                  <Button
                    className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm transition-all active:scale-95"
                    onClick={() => setShowAddItem(true)}
                  >
                    <Shirt className="mr-2 h-4 w-4" /> Agregar prenda
                  </Button>

                  <AddItemDialog
                    open={showAddItem}
                    onOpenChange={setShowAddItem}
                    catalogo={catalogo}
                    items={items}
                    onAdd={addItem}
                    onUpdateQty={updateItemQuantity}
                  />
                </>
              )}

              {step === 4 && (
                <>
                  <h2 className="mb-1 text-2xl font-display">Resumen</h2>
                  <p className="mb-5 text-sm text-muted-foreground">
                    Revisa precios, fecha de entrega y opciones.
                  </p>

                  <div className="space-y-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-primary" />
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-250">
                          Detalles de la orden
                        </span>
                      </div>
                      <Badge className="bg-primary text-white hover:bg-primary/90 border-none shadow-sm text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
                        {serviciosSel.length + items.length}{" "}
                        {serviciosSel.length + items.length === 1 ? "artículo" : "artículos"}
                      </Badge>
                    </div>
                    <div className="space-y-0 divide-y divide-dashed divide-slate-200 dark:divide-slate-800">
                      {selectedServices.map((srv) => {
                          const count = serviceCountsMap[srv.nombre] || 0;
                          const sPrice =
                            customServicePrices[srv.nombre] !== undefined
                              ? customServicePrices[srv.nombre]
                              : srv.precio || 0;
                          return (
                            <div
                              key={`summary-srv-${srv.id || srv.nombre}`}
                              className="flex justify-between items-center py-3 first:pt-0 last:pb-0 text-sm group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-450 shrink-0">
                                  <LayoutGrid className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-sm text-foreground truncate">
                                    {srv.nombre}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider mt-0.5">
                                    Servicio • {count} {count > 1 ? "unidades" : "unidad"}
                                  </div>
                                </div>
                              </div>
                              <div className="font-display font-black text-base text-primary font-bold">
                                {formatRD(count * sPrice)}
                              </div>
                            </div>
                          );
                        })}

                      {items.map((it, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center py-3 first:pt-0 last:pb-0 text-sm group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-450 shrink-0">
                              <Shirt className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-sm text-foreground truncate">
                                {it.descripcion}
                              </div>
                              <div className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider mt-0.5">
                                Prenda • {it.cantidad} {it.es_libra ? "lb" : "unid."}
                              </div>
                            </div>
                          </div>
                          <div className="font-display font-bold text-base text-foreground">
                            {formatRD(it.cantidad * it.precio_unitario)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 grid-cols-1 lg:grid-cols-2">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Fecha de entrega">
                          <DatePicker date={fechaEntrega} setDate={setFechaEntrega} />
                        </Field>
                        <Field label="Descuento (%)">
                          <Input
                            type="number"
                            value={descuento}
                            onChange={(e) => {
                              const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                              const maxLimit =
                                user?.empleado?.rol === "ADMIN"
                                  ? 100
                                  : (user?.empleado?.max_descuento_porcentaje ?? 100);
                              if (val > maxLimit) {
                                toast.error(`Límite permitido: ${maxLimit}%`);
                                setDescuento(maxLimit);
                              } else {
                                setDescuento(val);
                              }
                            }}
                            placeholder="0"
                            className="h-9"
                          />
                        </Field>
                      </div>

                      <div className="rounded-2xl border border-border/80 bg-accent/5 p-4 space-y-4">
                        {/* Option 1: Servicio a domicilio */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-450 shrink-0">
                                <Truck className="h-4.5 w-4.5" />
                              </div>
                              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                Servicio a domicilio
                              </span>
                            </div>
                            <Switch
                              checked={servicioDomicilio}
                              onCheckedChange={setServicioDomicilio}
                            />
                          </div>

                          {servicioDomicilio && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="space-y-3 pl-12 pt-2 border-t border-dashed"
                            >
                              <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-3">
                                <AddressAutocomplete
                                  value={direccionData}
                                  onChange={setDireccionData}
                                  label="Dirección de entrega"
                                  required
                                  showDetails
                                />
                              </div>
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                Se guardará en la ficha del cliente si es nueva.
                              </p>
                              <Field label="Costo de envío (RD$)">
                                <PriceInput
                                  value={costoDomicilio}
                                  onChange={setCostoDomicilio}
                                  placeholder="0.00"
                                  className="bg-background"
                                />
                              </Field>
                            </motion.div>
                          )}
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-border/60" />

                        {/* Option 2: Urgente */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-450 shrink-0">
                              <AlertTriangle className="h-4.5 w-4.5" />
                            </div>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                              Pedido Urgente (+{cfg.recargo_urgencia}%)
                            </span>
                          </div>
                          <Switch checked={esUrgente} onCheckedChange={setEsUrgente} />
                        </div>

                        {/* Divider if ITBIS is active */}
                        {(cfg.ncf_facturacion_activa || cfg.modo_facturacion === "tradicional" || cfg.modo_facturacion === "electronica") && (
                          <>
                            <div className="h-px bg-border/60" />
                            {/* Option 3: ITBIS */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-450 shrink-0">
                                  <Percent className="h-4 w-4" />
                                </div>
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                  Aplicar ITBIS ({cfg.itbis_porcentaje}%)
                                </span>
                              </div>
                              <Switch checked={aplicarItbis} onCheckedChange={setAplicarItbis} />
                            </div>
                          </>
                        )}
                      </div>

                      {/* Notas (Observaciones) at the end */}
                      <Field label="Notas">
                        <Textarea
                          value={notas}
                          onChange={(e) => setNotas(e.target.value)}
                          placeholder="Observaciones..."
                          rows={3}
                        />
                      </Field>
                    </div>

                    <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6">
                      <div className="space-y-4 text-center">
                        <div className="space-y-1">
                          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                            Subtotal prendas
                          </div>
                          <div className="text-2xl font-display font-bold">
                            {formatRD(subtotalBase)}
                          </div>
                        </div>

                        {costoServicios > 0 && (
                          <div className="space-y-1">
                            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                              Costo servicios
                            </div>
                            <div className="text-2xl font-display font-bold text-primary/80">
                              {formatRD(costoServicios)}
                            </div>
                          </div>
                        )}

                        {esUrgente && (
                          <div className="text-xs font-bold text-warning uppercase">
                            + {formatRD(recargo)} Recargo Urgencia
                          </div>
                        )}

                        {servicioDomicilio && costoEnvio > 0 && (
                          <div className="flex items-center justify-center gap-1 text-xs font-bold text-teal-600 uppercase">
                            <Truck className="h-3 w-3" />+ {formatRD(costoEnvio)} Envío a domicilio
                          </div>
                        )}

                        <div className="pt-4 border-t border-primary/20">
                          <div className="text-xs uppercase tracking-wider text-primary font-bold">
                            Total a pagar
                          </div>
                          <div className="mt-2 text-5xl font-display font-black text-primary animate-in zoom-in duration-300">
                            {formatRD(total)}
                          </div>
                        </div>

                        {descuentoMonto > 0 && (
                          <div className="text-sm font-bold text-destructive">
                            Descuento aplicado ({descuento}%): -{formatRD(descuentoMonto)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {step === 5 && (
                <div className="max-w-3xl mx-auto w-full space-y-5 animate-in fade-in duration-200">
                  {/* Encabezado Total Modo Clásico */}
                  <div className="flex flex-col items-center text-center mb-4 mt-1">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1B4B73]/70 dark:text-sky-400 mb-1">
                      Total a cobrar
                    </span>
                    <div className="text-5xl sm:text-6xl font-display font-black text-[#1B4B73] dark:text-sky-300 tracking-tight">
                      {formatRD(total)}
                    </div>
                    <p className="text-xs font-bold text-slate-400 mt-2">
                      Selecciona la condición de cobro y método de pago
                    </p>
                  </div>

                  {/* 1. LAS 4 MODALIDADES DE COBRO (AL RETIRAR EN 1ER LUGAR) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      {
                        id: "AL_RETIRAR",
                        label: "PAGO AL RETIRAR",
                        sub: "Contra entrega",
                        icon: Clock,
                      },
                      {
                        id: "COBRAR_AHORA",
                        label: "COBRAR AHORA",
                        sub: "Pago 100% hoy",
                        icon: Check,
                      },
                      {
                        id: "ANTICIPO",
                        label: "ANTICIPO",
                        sub: "Abono + Saldo",
                        icon: CalendarIcon,
                      },
                      {
                        id: "CREDITO",
                        label: "CRÉDITO",
                        sub: "Cuenta por cobrar",
                        icon: FileText,
                      },
                    ].map((m) => {
                      const isSelected = condicionCobro === m.id;
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setCondicionCobro(m.id as CondicionCobro);
                            if (m.id === "COBRAR_AHORA") {
                              setRecibido(total);
                            } else if (m.id === "ANTICIPO") {
                              const half = +(total / 2).toFixed(2);
                              if (anticipoMonto <= 0 || anticipoMonto >= total) {
                                setAnticipoMonto(half);
                                setRecibido(half);
                              } else {
                                setRecibido(anticipoMonto);
                              }
                            } else if (m.id === "AL_RETIRAR") {
                              setRecibido(0);
                              setAnticipoMonto(0);
                            }
                          }}
                          className={`relative flex flex-col items-center justify-center gap-2.5 rounded-2xl border-2 p-4 transition-all duration-200 active:scale-95 text-center cursor-pointer ${
                            isSelected
                              ? "border-[#1B4B73] bg-[#1B4B73]/[0.05] dark:bg-[#1B4B73]/20 ring-2 ring-[#1B4B73]/20 shadow-md font-bold scale-[1.02]"
                              : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#1B4B73]/30 text-slate-500 shadow-2xs"
                          }`}
                        >
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-full transition-transform ${
                              isSelected ? "bg-[#1B4B73] text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600"
                            }`}
                          >
                            <Icon className="h-5.5 w-5.5 shrink-0" />
                          </div>
                          <div
                            className={`font-black text-xs uppercase tracking-wider leading-none ${
                              isSelected ? "text-[#1B4B73] dark:text-sky-300" : "text-slate-800 dark:text-slate-200"
                            }`}
                          >
                            {m.label}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-medium leading-none">
                            {m.sub}
                          </div>
                          {isSelected && (
                            <div className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#F0B900] text-slate-900 shadow-xs ring-2 ring-white">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* 2. MÉTODOS DE PAGO */}
                  {(condicionCobro === "COBRAR_AHORA" || condicionCobro === "ANTICIPO") && (
                    <div className="space-y-4 pt-1">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {[
                          { id: "EFECTIVO", label: "EFECTIVO", icon: Banknote },
                          { id: "TARJETA", label: "TARJETA", icon: CreditCard },
                          { id: "TRANSFERENCIA", label: "TRANSF.", icon: Building2 },
                          { id: "MIXTO", label: "MIXTO", icon: Split },
                        ].map((inst) => {
                          const isSel = instrumentoPago === inst.id;
                          const Icon = inst.icon;
                          return (
                            <button
                              key={inst.id}
                              type="button"
                              onClick={() => {
                                setInstrumentoPago(inst.id as any);
                                if (inst.id === "EFECTIVO") {
                                  if (condicionCobro === "COBRAR_AHORA") {
                                    setRecibido(total);
                                  } else if (condicionCobro === "ANTICIPO") {
                                    setRecibido(anticipoMonto > 0 ? anticipoMonto : +(total / 2).toFixed(2));
                                  }
                                } else if (inst.id === "MIXTO") {
                                  const targetMonto = condicionCobro === "ANTICIPO" ? anticipoMonto : total;
                                  const half = +(targetMonto / 2).toFixed(2);
                                  setPagoEfectivo(half);
                                  setPagoTarjeta(+(targetMonto - half).toFixed(2));
                                  setPagoTransferencia(0);
                                }
                              }}
                              className={`relative flex items-center justify-center gap-2 rounded-2xl border-2 py-3 px-3 transition-all duration-200 active:scale-95 cursor-pointer ${
                                isSel
                                  ? "border-[#1B4B73] bg-[#1B4B73] text-white font-black shadow-xs scale-[1.01]"
                                  : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#1B4B73]/30 text-slate-700 dark:text-slate-300 font-bold shadow-2xs"
                              }`}
                            >
                              <Icon className={`h-4.5 w-4.5 shrink-0 ${isSel ? "text-[#F0B900]" : ""}`} />
                              <span className="text-xs tracking-wider">{inst.label}</span>
                              {isSel && (
                                <div className="h-4 w-4 rounded-full bg-[#F0B900] text-slate-900 flex items-center justify-center shrink-0 ml-0.5">
                                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* A1. ANTICIPO */}
                      {condicionCobro === "ANTICIPO" && (
                        <div className="p-4 bg-[#1B4B73]/[0.03] dark:bg-[#1B4B73]/20 border-2 border-[#1B4B73]/20 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-black uppercase tracking-wider text-[#1B4B73] dark:text-sky-200">
                              MONTO DEL ANTICIPO A ABONAR HOY
                            </span>
                            <span className="font-black text-[#855B00] dark:text-amber-300 bg-[#F0B900]/20 px-2.5 py-0.5 rounded-lg border border-[#F0B900]/40">
                              Saldo restante al retirar: <b>{formatRD(Math.max(0, total - anticipoMonto))}</b>
                            </span>
                          </div>
                          <div className="relative h-14">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-lg text-[#1B4B73]/60">
                              RD$
                            </span>
                            <PriceInput
                              className="!h-full pl-14 !text-3xl font-black font-display bg-white dark:bg-slate-900 border-2 border-[#1B4B73]/30 focus-visible:ring-[#1B4B73]/30 rounded-xl text-[#1B4B73] dark:text-sky-300 shadow-2xs"
                              value={anticipoMonto}
                              onChange={(val) => {
                                if (val > total) {
                                  toast.warning("El anticipo no puede exceder el total");
                                  return;
                                }
                                setAnticipoMonto(val);
                                setRecibido(val);
                              }}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      )}

                      {/* A2. COBRAR AHORA Y EFECTIVO */}
                      {condicionCobro === "COBRAR_AHORA" && instrumentoPago === "EFECTIVO" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                          <div>
                            <Label className="text-[11px] font-black uppercase tracking-wider text-[#1B4B73] dark:text-sky-300 mb-1.5 block">
                              MONTO RECIBIDO (EFECTIVO)
                            </Label>
                            <div className="rounded-2xl border-2 border-sky-100 dark:border-sky-900/40 bg-sky-50/40 dark:bg-sky-950/20 p-3 flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1">
                                <span className="font-black text-lg text-slate-400 pl-1">RD$</span>
                                <PriceInput
                                  className="h-10 w-full !text-2xl font-black font-display bg-transparent border-none focus-visible:ring-0 text-[#1B4B73] dark:text-sky-200 p-0 shadow-none"
                                  value={recibido}
                                  onChange={(val) => {
                                    if (val > 100000000) return;
                                    setRecibido(val);
                                  }}
                                  placeholder="0.00"
                                />
                              </div>
                              <div className="h-10 w-10 rounded-xl bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0">
                                <Banknote className="h-5.5 w-5.5" />
                              </div>
                            </div>
                          </div>

                          <div>
                            <Label className={`text-[11px] font-black uppercase tracking-wider mb-1.5 block ${recibido < total ? "text-rose-600" : "text-emerald-600"}`}>
                              {recibido < total ? "FALTANTE" : "CAMBIO A ENTREGAR"}
                            </Label>
                            <div className={`rounded-2xl border-2 p-3 flex items-center justify-between ${
                              recibido < total
                                ? "border-rose-100 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 text-rose-600"
                                : "border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-600"
                            }`}>
                              <div className="flex items-center gap-1.5 pl-1">
                                <span className="font-bold text-sm opacity-80">RD$</span>
                                <span className="text-2xl font-display font-black leading-none">
                                  {formatRD(
                                    recibido > total ? recibido - total : total - recibido
                                  ).replace("RD$", "").trim()}
                                </span>
                              </div>
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                                recibido < total ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                              }`}>
                                {recibido < total ? <AlertTriangle className="h-5.5 w-5.5" /> : <CheckCircle2 className="h-5.5 w-5.5" />}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TARJETA */}
                      {instrumentoPago === "TARJETA" && (
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                            REFERENCIA DE TARJETA / APROBACIÓN (OPCIONAL)
                          </Label>
                          <Input
                            placeholder="Número de aprobación, autorización, Auth # o APR."
                            value={referencia}
                            onChange={(e) => setReferencia(e.target.value)}
                            className="h-12 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 focus-visible:ring-[#1B4B73]/30 rounded-2xl font-medium text-sm px-4 shadow-2xs"
                          />
                        </div>
                      )}

                      {/* TRANSFERENCIA */}
                      {instrumentoPago === "TRANSFERENCIA" && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-[11px] font-black uppercase tracking-wider text-[#1B4B73] dark:text-sky-200 block">
                              NO. DE TRANSFERENCIA / COMPROBANTE * (OBLIGATORIA)
                            </Label>
                            {!referencia.trim() && <span className="text-[10px] text-destructive font-black">* Requerida</span>}
                          </div>
                          <Input
                            placeholder="Número de aprobación, transferencia bancaria, cuenta..."
                            value={referencia}
                            onChange={(e) => setReferencia(e.target.value)}
                            className={`h-12 bg-white dark:bg-slate-900 border-2 rounded-2xl font-medium text-sm px-4 shadow-2xs ${
                              !referencia.trim() ? "border-destructive" : "border-slate-200 dark:border-slate-700"
                            }`}
                          />
                        </div>
                      )}

                      {/* MIXTO */}
                      {instrumentoPago === "MIXTO" && (
                        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-[#1B4B73]/20 space-y-3 shadow-2xs">
                          <div className="flex items-center justify-between pb-1 border-b border-border/60 text-xs">
                            <span className="font-black uppercase tracking-wider text-[#1B4B73] flex items-center gap-1.5">
                              <Split className="h-4 w-4" /> Desglose Multi-método
                            </span>
                            <span className="text-muted-foreground">
                              Total: <b>{formatRD(condicionCobro === "ANTICIPO" ? anticipoMonto : total)}</b>
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-3 rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20 space-y-2">
                              <span className="text-sm font-black text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                                <Banknote className="h-4.5 w-4.5 shrink-0" /> Efectivo
                              </span>
                              <PriceInput
                                className="h-11 text-right font-black !text-xl rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xs px-3"
                                value={pagoEfectivo}
                                onChange={(v) => setPagoEfectivo(v)}
                                placeholder="0.00"
                              />
                            </div>

                            <div className="p-3 rounded-2xl border-2 border-indigo-500/30 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-2">
                              <span className="text-sm font-black text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                                <CreditCard className="h-4.5 w-4.5 shrink-0" /> Tarjeta
                              </span>
                              <PriceInput
                                className="h-11 text-right font-black !text-xl rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xs px-3"
                                value={pagoTarjeta}
                                onChange={(v) => setPagoTarjeta(v)}
                                placeholder="0.00"
                              />
                            </div>

                            <div className="p-3 rounded-2xl border-2 border-sky-500/30 bg-sky-50/20 dark:bg-sky-950/20 space-y-2">
                              <span className="text-sm font-black text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                                <Building2 className="h-4.5 w-4.5 shrink-0" /> Transferencia
                              </span>
                              <PriceInput
                                className="h-11 text-right font-black !text-xl rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xs px-3"
                                value={pagoTransferencia}
                                onChange={(v) => setPagoTransferencia(v)}
                                placeholder="0.00"
                              />
                            </div>
                          </div>

                          {pagoTransferencia > 0 && (
                            <Input
                              placeholder="No. referencia de transferencia * (Obligatoria)"
                              value={pagoTransferenciaRef}
                              onChange={(e) => setPagoTransferenciaRef(e.target.value)}
                              className={`h-10 text-xs rounded-xl bg-white dark:bg-slate-900 border-2 ${
                                !pagoTransferenciaRef.trim() ? "border-destructive" : "border-slate-200 dark:border-slate-700"
                              }`}
                            />
                          )}

                          <div className="flex items-center justify-between pt-1.5 border-t border-border/60 text-xs">
                            <div>
                              <span className="text-muted-foreground">Asignado: </span>
                              <span className="font-black text-foreground">{formatRD(pagoEfectivo + pagoTarjeta + pagoTransferencia)}</span>
                            </div>
                            <div>
                              {Math.abs((condicionCobro === "ANTICIPO" ? anticipoMonto : total) - (pagoEfectivo + pagoTarjeta + pagoTransferencia)) > 0.01 ? (
                                <span className="text-destructive font-black">
                                  Falta: {formatRD(Math.max(0, (condicionCobro === "ANTICIPO" ? anticipoMonto : total) - (pagoEfectivo + pagoTarjeta + pagoTransferencia)))}
                                </span>
                              ) : (
                                <span className="text-emerald-600 font-black flex items-center gap-1">
                                  <Check className="h-3.5 w-3.5" /> Cuadre exacto (100%)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* B. AL RETIRAR */}
                  {condicionCobro === "AL_RETIRAR" && (
                    <div className="space-y-4 pt-1">
                      <div className="flex items-center gap-4 rounded-2xl border-2 border-[#1B4B73]/20 bg-[#1B4B73]/[0.03] p-5 text-[#1B4B73] dark:text-sky-200">
                        <Timer className="h-9 w-9 text-[#1B4B73] shrink-0" />
                        <div>
                          <strong className="block text-base font-black">
                            Cobro contra entrega (Pago al retirar)
                          </strong>
                          <span className="text-xs">
                            La orden se registrará con <b>RD$0.00 pagados</b> y se creará un saldo
                            pendiente de <b>{formatRD(total)}</b> que se cobrará cuando el cliente venga a
                            retirar su ropa.
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* C. CRÉDITO */}
                  {condicionCobro === "CREDITO" && (
                    <div className="space-y-4 pt-1">
                      {(!cliente || (cliente.nombre === "Consumidor" && cliente.apellido === "Final") || cliente.tipo === "Consumidor Final") ? (
                        <div className="flex items-center gap-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-destructive">
                          <AlertTriangle className="h-8 w-8 text-destructive shrink-0" />
                          <div>
                            <strong className="block text-sm">Cliente Registrado Obligatorio</strong>
                            <span className="text-xs">Las ventas a crédito deben asignarse a un cliente registrado (no Consumidor Final).</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-4 rounded-xl border border-warning/40 bg-warning/5 p-4 text-warning-foreground">
                            <AlertTriangle className="h-7 w-7 text-warning shrink-0" />
                            <div>
                              <strong className="block text-sm">Venta a crédito</strong>
                              <span className="text-xs">Se registrará en el balance de <span className="font-bold">{cliente?.nombre} {cliente?.apellido}</span>.</span>
                            </div>
                          </div>

                          <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20 p-4 shadow-2xs">
                            <div className="flex items-center gap-2 mb-3">
                              <Timer className="h-4 w-4 text-amber-500 shrink-0" />
                              <span className="text-[11px] font-black uppercase tracking-[0.08em] text-amber-800 dark:text-amber-300">
                                PLAZO DE CRÉDITO (DÍAS DE VENCIMIENTO)
                              </span>
                            </div>
                            <div className="grid grid-cols-6 gap-2">
                              {OPCIONES_CREDITO.map((op) => (
                                <button
                                  key={op.dias}
                                  type="button"
                                  onClick={() => actualizarLimiteDias(op.dias)}
                                  className={`relative flex flex-col items-center justify-center py-3 rounded-xl border transition-all duration-200 active:scale-95 cursor-pointer ${
                                    limiteDiasSel === op.dias
                                      ? "border-[#1B4B73] bg-[#1B4B73] text-white font-bold scale-[1.02] shadow-2xs"
                                      : "border-border bg-white dark:bg-slate-900 text-muted-foreground hover:border-[#1B4B73]/40 shadow-2xs"
                                  }`}
                                >
                                  <span className="text-lg font-display font-black leading-none mb-0.5">
                                    {op.dias}
                                  </span>
                                  <span className="text-[8px] font-black uppercase tracking-wider leading-none">
                                    DÍAS
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-2xl border-2 border-warning/20 bg-warning/5 p-4">
                            <Label className="mb-1.5 block text-xs font-black uppercase tracking-widest text-amber-600">
                              ¿Monto a abonar inicialmente? (Opcional)
                            </Label>
                            <div className="relative h-13">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-base text-amber-600/40">
                                RD$
                              </span>
                              <PriceInput
                                className="!h-full pl-14 !text-2xl font-black font-display bg-white dark:bg-slate-900 border-2 border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-300 font-bold shadow-2xs"
                                value={abonoCredito}
                                onChange={(val) => {
                                  if (val > total) {
                                    toast.warning("El abono no puede exceder el total");
                                    return;
                                  }
                                  setAbonoCredito(val);
                                }}
                                placeholder="0.00"
                              />
                            </div>
                            <p className="mt-1.5 text-xs text-amber-600/70 font-medium">
                              Saldo restante (<strong>{formatRD(Math.max(0, total - abonoCredito))}</strong>) irá al balance de <strong>{cliente?.nombre}</strong>.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            <div
              className={`mt-4 flex ${step === 5 ? "flex-col items-center gap-6" : "items-center justify-between"} border-t border-border pt-8`}
            >
              {step === 5 ? (
                <>
                  <Button
                    size="lg"
                    className="w-full md:max-w-md h-14 text-base tracking-wide rounded-[1.25rem] font-bold bg-[#16A34A] hover:bg-[#15803D] text-white shadow-none transition-all active:scale-95"
                    onClick={() => onCrearOrden(false)}
                    disabled={(metodo === "EFECTIVO" && faltante > 0) || isCreatingOrden}
                  >
                    {isCreatingOrden ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> PROCESANDO...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-5 w-5" /> CONFIRMAR Y CREAR ORDEN
                      </>
                    )}
                  </Button>
                  <Button
                    variant="default"
                    className="h-10 px-8 rounded-xl bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 text-blue-600 dark:text-slate-300 font-bold text-xs active:scale-95 border border-blue-100 dark:border-transparent shadow-sm transition-all duration-200"
                    onClick={prev}
                  >
                    <ArrowLeft className="mr-2 h-3 w-3" /> VOLVER ATRÁS
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="default"
                    className="rounded-xl bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 text-blue-600 dark:text-slate-300 font-bold text-xs px-6 h-10 transition-all active:scale-95 border border-blue-100 dark:border-transparent shadow-sm disabled:opacity-50 disabled:pointer-events-none"
                    onClick={prev}
                    disabled={step === 1}
                  >
                    <ArrowLeft className="mr-2 h-3 w-3" /> ATRÁS
                  </Button>
                  <Button
                    onClick={next}
                    className="bg-gradient-primary text-white shadow-elegant hover:opacity-95 rounded-xl h-10 px-8 font-bold text-xs uppercase tracking-wider"
                  >
                    Continuar <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Modal ticket */}
      <Dialog
        open={showTicket}
        onOpenChange={(o) => {
          if (!o) resetPosOrder();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>✓ Orden creada — {creada?.numero}</DialogTitle>
            <DialogDescription>
              La orden ha sido registrada correctamente. Puedes imprimir el ticket a continuación.
            </DialogDescription>
          </DialogHeader>
          {creada && cliente && (
            <div className="max-h-[60vh] overflow-auto rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800">
              <Ticket
                orden={creada}
                tenant={tenant}
                empleado={empleado}
                cliente={cliente}
                formato={cfg.formato_ticket}
                pagoRecibido={metodo === "EFECTIVO" ? recibido : undefined}
                serviciosList={servicios}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={resetPosOrder}>
              Cerrar
            </Button>
            <Button
              onClick={() => handleImprimirTicket(creada)}
              className="bg-gradient-primary text-white"
            >
              <Printer className="mr-1.5 h-4 w-4" /> Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showPrintPortal && (
        <TicketPrintPortal
          orden={showPrintPortal}
          tenant={tenant}
          clientes={clientes}
          empleados={empleado ? [empleado] : []}
          serviciosList={servicios}
          onClose={() => {
            setShowPrintPortal(null);
          }}
        />
      )}
      <Dialog open={isClientModalOpen} onOpenChange={setIsClientModalOpen}>
        <DialogContent className="w-[90vw] sm:max-w-[580px] rounded-3xl p-6 overflow-hidden flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-display font-bold flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              <span>Buscar Cliente</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Busca por nombre o teléfono en la lista de clientes registrados.
            </DialogDescription>
          </DialogHeader>

          <div className="py-1 space-y-4 w-full">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                value={clientSearchQuery}
                onChange={(e) => setClientSearchQuery(e.target.value)}
                placeholder="Escribe el nombre o teléfono del cliente..."
                className="w-full pl-10 h-11 bg-accent/20 border-border/50 focus-visible:ring-primary/20 rounded-xl text-sm"
                autoFocus
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 custom-scrollbar text-xs pr-1 w-full">
              <div className="flex items-center gap-2 mt-2 mb-2.5 px-1.5">
                <div className="h-3.5 w-1 bg-primary rounded-full animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest text-primary">
                  Clientes Registrados
                </span>
                <div className="flex-1 h-px bg-primary/10" />
              </div>

              {filteredClients
                .filter(
                  (c) =>
                    c.id !== tenantId.substring(0, 24) + "f000" + tenantId.substring(28) &&
                    c.id !== tenantId.substring(0, 24) + "e000" + tenantId.substring(28),
                )
                .map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCliente(c);
                      setIsClientModalOpen(false);
                      const isEmpresa = c.tipo === "Empresa" || (c.cedula && c.cedula.length >= 9);
                      const target = isElectronic
                        ? isEmpresa
                          ? "E31"
                          : "E32"
                        : isEmpresa
                          ? "B01"
                          : "B02";
                      if (validTipos.includes(target)) {
                        setTipoECF(target);
                      }
                    }}
                    className={`group flex w-full items-center justify-between rounded-xl px-3 py-2 transition-all text-left border ${
                      cliente?.id === c.id
                        ? "bg-primary border-transparent text-white font-bold shadow-sm"
                        : "hover:bg-primary hover:text-white hover:border-transparent border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`h-9 w-9 rounded-full flex items-center justify-center font-bold shrink-0 transition-colors ${
                          cliente?.id === c.id
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-white/20 group-hover:text-white"
                        }`}
                      >
                        {c.tipo === "Empresa" ? (
                          <Building className="h-4.5 w-4.5" />
                        ) : (
                          <UserIcon className="h-4.5 w-4.5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm truncate leading-snug">
                          {c.nombre} {c.apellido || ""}
                        </div>
                        <div
                          className={`text-xs transition-colors mt-0.5 ${
                            cliente?.id === c.id
                              ? "text-white/80"
                              : "text-muted-foreground group-hover:text-white/85"
                          }`}
                        >
                          {c.telefono}
                        </div>
                      </div>
                    </div>
                    {cliente?.id === c.id && (
                      <Check className="h-4.5 w-4.5 text-white shrink-0 transition-colors" />
                    )}
                  </button>
                ))}

              {filteredClients.length === 0 && (
                <div className="py-6 text-center text-muted-foreground text-[10px]">
                  No se encontraron clientes
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-border my-1" />
          <div className="grid grid-cols-2 gap-3 w-full">
            <Button
              variant="default"
              size="sm"
              className="h-10 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm flex items-center justify-center gap-1.5 w-full transition-all active:scale-[0.98] dark:bg-emerald-600 dark:hover:bg-emerald-700"
              onClick={() => {
                setIsClientModalOpen(false);
                setShowNewCliente(true);
              }}
            >
              <UserPlus className="h-4 w-4" /> Nuevo Cliente
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-10 text-xs font-bold rounded-xl bg-[#1e293b] hover:bg-[#0f172a] text-white border-none shadow-sm flex items-center justify-center gap-1.5 w-full transition-all active:scale-[0.98] dark:bg-[#0f172a] dark:hover:bg-slate-950"
              onClick={() => {
                setIsClientModalOpen(false);
                setEmpresaDialogOpen(true);
              }}
            >
              <Search className="h-4 w-4" /> Buscar RNC (DGII)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ClienteDialog
        open={showNewCliente}
        onOpenChange={setShowNewCliente}
        tenant={user.tenant}
        onDone={(c) => {
          if (c) {
            setCliente(c);
            if (!isPosMode) {
              irAlPasoSiguienteDelCliente();
            }
          }
          setShowNewCliente(false);
        }}
      />

      <PlanLimitModal
        open={showLimitModal}
        onOpenChange={setShowLimitModal}
        type="orders"
        limit={limits?.orderLimit ?? 0}
        tenant={user.tenant}
      />

      <Dialog
        open={empresaDialogOpen}
        onOpenChange={(o) => {
          setEmpresaDialogOpen(o);
          if (!o) {
            setRncResult(null);
            setRncInput("");
          }
        }}
      >
        <DialogContent className="max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-display font-bold">
              Buscar Empresa por RNC
            </DialogTitle>
            <DialogDescription>
              Se conectará automáticamente con la base de datos de Pronesoft/DGII para obtener el
              nombre del contribuyente.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">RNC o Cédula (DGII)</Label>
              <div className="flex gap-2">
                <Input
                  value={rncInput}
                  onChange={(e) => setRncInput(e.target.value)}
                  placeholder="Ej. 131123456"
                  disabled={rncLoading}
                  className="h-10 rounded-xl border-border bg-background"
                  onKeyDown={(e) => e.key === "Enter" && handleSearchEmpresaRNC()}
                  autoFocus
                />
                <Button
                  onClick={handleSearchEmpresaRNC}
                  disabled={rncLoading}
                  className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white gap-2 font-bold shadow-sm transition-all active:scale-95"
                >
                  {rncLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span>Buscar</span>
                </Button>
              </div>
            </div>

            {rncResult && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-4 shadow-sm"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-widest text-primary font-black opacity-60">
                      Nombre / Razón Social
                    </Label>
                    <div className="font-bold text-foreground text-xl leading-tight uppercase">
                      {rncResult.name}
                    </div>
                  </div>
                  <Badge
                    className={`${rncResult.status === "ACTIVO" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"} font-black px-3 py-1 rounded-full border-none shadow-sm`}
                  >
                    {rncResult.status}
                  </Badge>
                </div>

                <div className="h-px bg-primary/10 w-full" />

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-widest text-primary font-black opacity-60">
                      RNC
                    </Label>
                    <div className="font-bold text-foreground text-lg tracking-tight">
                      {rncResult.rnc}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-widest text-primary font-black opacity-60">
                      Régimen de Pago
                    </Label>
                    <div className="font-bold text-foreground/80 uppercase text-sm tracking-tight">
                      {rncResult.regime}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setEmpresaDialogOpen(false)}
              disabled={rncLoading}
              className="rounded-xl font-bold border-border hover:bg-accent h-10"
            >
              Cancelar
            </Button>
            {rncResult && (
              <Button
                onClick={handleConfirmEmpresa}
                disabled={rncLoading}
                className="bg-primary hover:bg-primary/90 text-white gap-2 rounded-xl font-bold shadow-glow transition-all active:scale-95 h-10"
              >
                <Check className="h-4 w-4" /> Continuar y Seleccionar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddItemDialog
        open={showDesgloseDialog}
        onOpenChange={setShowDesgloseDialog}
        catalogo={catalogo}
        items={items}
        onAdd={addItemDesglose}
        onUpdateQty={updateItemQuantity}
        isDesglose
        onAddDesglose={addItemDesglose}
        serviceName={desgloseServiceName}
      />

      {/* Modal de Selección Rápida de Servicio para Prenda POS */}
      <Dialog
        open={!!servicePickerItem}
        onOpenChange={(open) => !open && setServicePickerItem(null)}
      >
        <DialogContent className="rounded-3xl max-w-md p-0 border-none shadow-2xl bg-card text-foreground overflow-hidden">
          {/* Header */}
          <div className="bg-slate-50/80 dark:bg-slate-900/80 p-5 border-b border-border/50">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-sm flex items-center justify-center text-3xl shrink-0 overflow-hidden">
                {servicePickerItem?.imagen_url ? (
                  <img
                    src={servicePickerItem.imagen_url}
                    alt={servicePickerItem.nombre}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{servicePickerItem?.icono || "👕"}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg font-black font-display text-foreground leading-tight truncate">
                  {servicePickerItem?.nombre}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Selecciona el servicio para esta prenda
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* List of Services */}
          <div className="p-5 space-y-2.5 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Tratamientos Disponibles
              </span>
              <span className="text-[10px] font-bold text-primary">
                1 clic para agregar
              </span>
            </div>

            {(() => {
              const map = new Map<string, { price: number; srvObj: any }>();
              if (servicePickerItem?.precios_servicios && typeof servicePickerItem.precios_servicios === "object") {
                Object.entries(servicePickerItem.precios_servicios).forEach(([k, p]) => {
                  const num = Number(p);
                  if (num > 0) {
                    const srvObj = serviciosData.find(
                      (s) => s.id === k || s.nombre.toLowerCase() === k.toLowerCase(),
                    );
                    const srvName = srvObj ? srvObj.nombre : k;
                    if (!srvObj && k.length > 20 && k.includes("-")) return;
                    if (!map.has(srvName)) {
                      map.set(srvName, { price: num, srvObj });
                    }
                  }
                });
              }
              return Array.from(map.entries()).map(([srvName, { price, srvObj }]) => {
                return (
                  <button
                    key={srvName}
                    type="button"
                    onClick={() => {
                      if (!servicePickerItem) return;
                      const finalPrice = Number(price);
                      // Asegurar que el servicio principal esté en la orden / serviciosSel
                      setServiciosSel((prev) => {
                        if (!prev.includes(srvName)) {
                          return [...prev, srvName];
                        }
                        return prev;
                      });

                        // Agregar la prenda como desglose anidado "↳ [Prenda]"
                        setItems((arr) => {
                          const itemDesc = `↳ ${servicePickerItem.nombre}`;
                          const idx = arr.findIndex(
                            (x) =>
                              x.descripcion === itemDesc &&
                              x.precio_unitario === finalPrice &&
                              x.servicio_origen === srvName,
                          );
                          if (idx > -1) {
                            return arr.map((item, i) =>
                              i === idx ? { ...item, cantidad: item.cantidad + 1 } : item,
                            );
                          }
                          return [
                            ...arr,
                            {
                              descripcion: itemDesc,
                              cantidad: 1,
                              precio_unitario: finalPrice,
                              servicio_origen: srvName,
                              es_libra: servicePickerItem.por_libra || false,
                              is_exento: !!servicePickerItem.is_exento,
                            },
                          ];
                        });
                        toast.success(`${servicePickerItem.nombre} agregado a ${srvName} ✨`);
                        setServicePickerItem(null);
                      }}
                      className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200/90 dark:border-slate-800 hover:border-primary hover:bg-primary/5 hover:shadow-md transition-all text-left cursor-pointer group active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                        <div className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center shrink-0 text-xl overflow-hidden group-hover:scale-105 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                          {srvObj?.imagen_url ? (
                            <img
                              src={srvObj.imagen_url}
                              alt={srvName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span>{srvObj?.icono || "🧺"}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-bold text-foreground block group-hover:text-primary transition-colors truncate">
                            {srvName}
                          </span>
                          {srvObj?.descripcion ? (
                            <span className="text-[11px] text-muted-foreground block line-clamp-1 mt-0.5">
                              {srvObj.descripcion}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="text-lg font-black font-display text-foreground group-hover:text-primary transition-colors block leading-tight">
                            {formatRD(Number(price))}
                          </span>
                          {servicePickerItem?.por_libra && (
                            <span className="text-[10px] text-muted-foreground font-semibold">
                              / libra
                            </span>
                          )}
                        </div>
                        <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-primary group-hover:text-white text-slate-500 flex items-center justify-center transition-all shadow-xs shrink-0">
                          <Plus className="h-4 w-4" />
                        </div>
                      </div>
                    </button>
                  );
                });
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Selección de Categorías POS */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="max-w-3xl p-6 rounded-3xl overflow-hidden">
          <DialogHeader className="pb-1 text-left">
            <DialogTitle className="text-xl font-display font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <Tag className="h-5 w-5 text-emerald-600" />
              Seleccionar Categoría de Prendas
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Filtra rápidamente las prendas por categoría para agilizar la toma de orden.
            </DialogDescription>
          </DialogHeader>

          {/* Barra de búsqueda de categorías */}
          <div className="relative my-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={categorySearchQuery}
              onChange={(e) => setCategorySearchQuery(e.target.value)}
              placeholder="Buscar categoría de prendas..."
              className="h-10 pl-10 pr-3 rounded-xl border-slate-200 bg-slate-50 text-xs font-medium dark:bg-slate-900 dark:border-slate-800 focus-visible:ring-emerald-500/20"
              autoFocus
            />
          </div>

          {/* Grid de Categorías Horizontales Elegantes */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[55vh] overflow-y-auto custom-scrollbar p-1">
            {/* Opción TODAS */}
            {"TODAS LAS PRENDAS".toLowerCase().includes(categorySearchQuery.toLowerCase()) && (
              <button
                type="button"
                onClick={() => {
                  setActiveCategory("TODAS LAS PRENDAS");
                  setShowCategoryModal(false);
                  setCategorySearchQuery("");
                }}
                className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl border transition-all text-left cursor-pointer ${
                  activeCategory === "TODAS LAS PRENDAS" || activeCategory === "TODOS"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-600/30"
                    : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`p-1.5 rounded-xl shrink-0 ${activeCategory === "TODAS LAS PRENDAS" || activeCategory === "TODOS" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"}`}
                  >
                    <Shirt className="h-4 w-4" />
                  </div>
                  <span className="font-extrabold text-xs tracking-tight truncate">TODAS</span>
                </div>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${activeCategory === "TODAS LAS PRENDAS" || activeCategory === "TODOS" ? "bg-white/25 text-white" : "bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}
                >
                  {catalogoEfectivo.length}
                </span>
              </button>
            )}

            {/* Categorías filtradas */}
            {categoriesPrendas
              .filter((cat) => cat.toLowerCase().includes(categorySearchQuery.toLowerCase()))
              .map((cat, idx) => {
                const catCount = catalogoEfectivo.filter(
                  (c) => (c.categoria || "Otros").trim().toUpperCase() === cat.trim().toUpperCase(),
                ).length;
                const isSelected = activeCategory.trim().toUpperCase() === cat.trim().toUpperCase();

                // Paleta de colores pastel aplicados únicamente al icono y la insignia
                const PASTELS = [
                  {
                    iconBg:
                      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300",
                    badgeBg:
                      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300",
                  },
                  {
                    iconBg: "bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300",
                    badgeBg: "bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300",
                  },
                  {
                    iconBg:
                      "bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300",
                    badgeBg:
                      "bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300",
                  },
                  {
                    iconBg: "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300",
                    badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300",
                  },
                  {
                    iconBg: "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300",
                    badgeBg: "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300",
                  },
                  {
                    iconBg:
                      "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300",
                    badgeBg:
                      "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300",
                  },
                  {
                    iconBg: "bg-teal-100 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300",
                    badgeBg: "bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300",
                  },
                  {
                    iconBg:
                      "bg-orange-100 text-orange-700 dark:bg-orange-950/80 dark:text-orange-300",
                    badgeBg:
                      "bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300",
                  },
                ];
                const theme = PASTELS[idx % PASTELS.length];

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setActiveCategory(cat);
                      setShowCategoryModal(false);
                      setCategorySearchQuery("");
                    }}
                    className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl border transition-all text-left cursor-pointer ${
                      isSelected
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-600/30"
                        : "bg-slate-50/90 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800/90 border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`p-1.5 rounded-xl shrink-0 ${isSelected ? "bg-white/20 text-white" : theme.iconBg}`}
                      >
                        <Shirt className="h-4 w-4" />
                      </div>
                      <span className="font-extrabold text-xs tracking-tight truncate uppercase">
                        {cat}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${isSelected ? "bg-white/25 text-white" : theme.badgeBg}`}
                    >
                      {catCount}
                    </span>
                  </button>
                );
              })}
          </div>
        </DialogContent>
      </Dialog>

      
      {/* ================= MODAL DE REVISIÓN RÁPIDA DE NOTA ================= */}
      <Dialog open={showQuickNoteModal} onOpenChange={setShowQuickNoteModal}>
        <DialogContent className="max-w-md p-5 sm:p-6 rounded-3xl z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-display font-bold flex items-center gap-2 text-foreground">
              <FileText className="h-5 w-5 text-amber-500" /> ¿Deseas agregar una nota?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Esta orden aún no tiene ninguna observación ni nota especial por prenda. Puedes escribirla ahora o continuar.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Ej: Ropa con manchas en cuello, entregar en perchas, doblada, planchado con raya..."
              value={quickNoteText}
              onChange={(e) => setQuickNoteText(e.target.value)}
              className="min-h-[90px] rounded-2xl text-xs p-3 bg-accent/10 resize-none border-primary/20 focus-visible:ring-primary/30"
              autoFocus
            />
          </div>
          <DialogFooter className="flex flex-row items-center justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              className="text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => {
                setShowQuickNoteModal(false);
                setIsCobroModalOpen(true);
              }}
            >
              Omitir y continuar →
            </Button>
            <Button
              type="button"
              className="bg-primary text-white text-xs font-bold px-4 rounded-xl shadow-xs cursor-pointer"
              onClick={() => {
                if (quickNoteText.trim()) {
                  setNotas((prev) => (prev ? `${prev}\n${quickNoteText.trim()}` : quickNoteText.trim()));
                  setQuickNoteText("");
                }
                setShowQuickNoteModal(false);
                setIsCobroModalOpen(true);
              }}
            >
              Guardar y Cobrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL DE ADVERTENCIA DE LÍMITE DE CRÉDITO ================= */}
      <Dialog open={showCreditLimitConfirm} onOpenChange={setShowCreditLimitConfirm}>
        <DialogContent className="max-w-md p-5 sm:p-6 rounded-3xl z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-display font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Límite de Crédito Excedido
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              El cliente <strong>{cliente?.nombre} {cliente?.apellido}</strong> excede el límite de crédito disponible autorizado.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2 bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-2xl text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Límite de crédito fijado:</span>
              <span className="font-bold">{formatRD(cliente?.limite_credito || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deuda acumulada actual:</span>
              <span className="font-bold">
                {formatRD(
                  (ordenes || [])
                    .filter((o) => o.cliente_id === cliente?.id && o.saldo > 0 && o.estado !== "ANULADA")
                    .reduce((s, o) => s + o.saldo, 0)
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Saldo a crédito de esta orden:</span>
              <span className="font-bold">{formatRD(total - abonoCredito)}</span>
            </div>
            <div className="border-t border-amber-500/30 pt-1.5 flex justify-between font-black text-amber-900 dark:text-amber-200">
              <span>Nueva deuda acumulada:</span>
              <span>
                {formatRD(
                  (ordenes || [])
                    .filter((o) => o.cliente_id === cliente?.id && o.saldo > 0 && o.estado !== "ANULADA")
                    .reduce((s, o) => s + o.saldo, 0) + (total - abonoCredito)
                )}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            ¿Deseas autorizar esta venta a crédito como cajero/administrador?
          </p>
          <DialogFooter className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl text-xs font-bold"
              onClick={() => setShowCreditLimitConfirm(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="flex-1 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => {
                setShowCreditLimitConfirm(false);
                onCrearOrden(true);
              }}
            >
              Autorizar y Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

                              
      {/* ================= MODAL DE CONTROL DE MARBETE (HIDROFIX) ================= */}
      <Dialog open={showMarbeteModal} onOpenChange={setShowMarbeteModal}>
        <DialogContent className="max-w-2xl sm:max-w-[750px] p-3.5 sm:p-4 rounded-3xl z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl font-sans max-h-[94vh] flex flex-col gap-2">
          {/* Cabecera Limpia y Compacta */}
          <DialogHeader className="space-y-0 pb-1.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center justify-between gap-3 pr-8 sm:pr-10">
              <div className="flex items-center gap-1.5">
                <div className="p-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                  <Tag className="h-3.5 w-3.5" />
                </div>
                <div>
                  <DialogTitle className="text-sm font-display font-black text-foreground leading-tight">
                    Control de Marbetes Hidrofix
                  </DialogTitle>
                  <DialogDescription className="text-[10px] text-muted-foreground leading-none mt-0.5">
                    Configura los talonarios físicos, prendas por tira y secuencias de la orden.
                  </DialogDescription>
                </div>
              </div>

              {/* Último usado en caja (Formato correcto, legible y con separación de la X) */}
              {ultimosMarbetes.length > 0 && (() => {
                const ultimo = ultimosMarbetes[0];
                const uStyle = getPhysicalMarbeteStyles(ultimo.marbete_color);
                return (
                  <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-xl shadow-xs mr-2">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">
                      Último usado:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (ultimo.marbete_color) {
                          setMarbetesList((prev) =>
                            prev.map((it) => (it.id === activeStrip.id ? { ...it, color: ultimo.marbete_color! } : it))
                          );
                        }
                      }}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-black cursor-pointer shadow-xs ${uStyle.bg} ${uStyle.inkText} hover:opacity-90 active:scale-95 transition-all`}
                      title="Haz clic para copiar este color a la tira activa"
                    >
                      <span>{uStyle.name}</span>
                      <span className="opacity-40">•</span>
                      <span>{ultimo.marbete_piezas || 1} pzs</span>
                      <span className="opacity-40">•</span>
                      <span className="font-mono font-black text-[10.5px]">#{ultimo.marbete_secuencia}</span>
                    </button>
                  </div>
                );
              })()}
            </div>
          </DialogHeader>

          {(() => {
            const totalPiezasOrden = totalPiezasCalculadas || 1;
            const currentSum = marbetesList.reduce((acc, it) => acc + (Number(it.piezas) || 0), 0);
            const remainingPiezas = Math.max(1, totalPiezasOrden - currentSum);

            // Tira actualmente seleccionada para edición
            const activeStrip =
              marbetesList.find((m) => m.id === activeStripId) ||
              marbetesList[0] || { id: "temp", color: "", piezas: totalPiezasOrden, secuencia: "" };
            const activeIndex = Math.max(0, marbetesList.findIndex((m) => m.id === activeStrip.id));

            return (
              <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 custom-scrollbar">
                {/* 1. Selector de Pestañas de Tiras */}
                <div className="flex items-center justify-between gap-1.5 overflow-x-auto pb-0.5">
                  <div className="flex items-center gap-1 flex-wrap">
                    {marbetesList.map((m, idx) => {
                      const isActive = m.id === activeStrip.id;
                      const hasData = m.color || m.secuencia;
                      return (
                        <div
                          key={m.id || idx}
                          onClick={() => setActiveStripId(m.id)}
                          className={`group flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none ${
                            isActive
                              ? "bg-primary text-white border-primary shadow-xs ring-1.5 ring-primary/20"
                              : "bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-foreground border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              m.color ? getMarbeteColorStyle(m.color).split(" ")[0] : "bg-slate-300 dark:bg-slate-600"
                            }`}
                          />
                          <span>Tira #{idx + 1}</span>
                          {marbetesList.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const filtered = marbetesList.filter((item) => item.id !== m.id);
                                setMarbetesList(filtered);
                                if (isActive && filtered.length > 0) {
                                  setActiveStripId(filtered[0].id);
                                }
                              }}
                              className="ml-1 rounded-full p-0.5 bg-rose-500 hover:bg-rose-600 text-white shadow-xs transition-all cursor-pointer flex items-center justify-center shrink-0"
                              title="Eliminar tira"
                            >
                              <X className="h-2.5 w-2.5 stroke-[3]" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Botón Añadir Tira con Fondo Verde Destacado */}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const newId = uid();
                      const newStrip = {
                        id: newId,
                        color: "",
                        piezas: remainingPiezas,
                        secuencia: "",
                      };
                      setMarbetesList((prev) => [...prev, newStrip]);
                      setActiveStripId(newId);
                    }}
                    className="h-7 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-1.5 shrink-0 cursor-pointer px-3 shadow-xs active:scale-95 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Añadir Tira</span>
                  </Button>
                </div>

                {/* 2. BLOQUE SUPERIOR: CONFIGURAR TIRA ACTIVA (Color a la izquierda, Prendas arriba y Secuencia abajo a la derecha) */}
                <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                  <div className="flex items-center justify-between pb-0.5 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[11px] font-black uppercase tracking-wider text-foreground flex items-center gap-1">
                      <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px]">
                        {activeIndex + 1}
                      </span>
                      Configurar Tira #{activeIndex + 1}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {activeStrip.piezas || 0} prendas asignadas
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
                    {/* Columna Izquierda (6 cols): Color del Talonario */}
                    <div className="md:col-span-6 space-y-0.5">
                      <Label className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground block">
                        1. Color del Talonario
                      </Label>
                      <div className="grid grid-cols-5 gap-1">
                        {[
                          { nombre: "Gris", bg: "bg-slate-500" },
                          { nombre: "Naranja", bg: "bg-orange-500" },
                          { nombre: "Verde", bg: "bg-emerald-600" },
                          { nombre: "Azul", bg: "bg-blue-600" },
                          { nombre: "Amarillo", bg: "bg-amber-400 text-slate-950" },
                          { nombre: "Rosa", bg: "bg-pink-500" },
                          { nombre: "Blanco", bg: "bg-white border border-slate-300 text-slate-900" },
                          { nombre: "Rojo", bg: "bg-red-600" },
                          { nombre: "Morado", bg: "bg-purple-600" },
                          { nombre: "Marrón", bg: "bg-[#78350F]" },
                        ].map((c) => {
                          const isSelected = activeStrip.color?.toLowerCase() === c.nombre.toLowerCase();
                          return (
                            <button
                              key={c.nombre}
                              type="button"
                              onClick={() => {
                                setMarbetesList((prev) =>
                                  prev.map((it) => (it.id === activeStrip.id ? { ...it, color: c.nombre } : it))
                                );
                              }}
                              className={`flex items-center justify-center gap-1 h-6.5 px-1 rounded-lg text-[9.5px] font-bold transition-all border cursor-pointer ${
                                isSelected
                                  ? "ring-1.5 ring-primary border-primary font-black shadow-xs bg-primary/10 text-primary"
                                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.bg}`} />
                              <span className="truncate">{c.nombre}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Columna Derecha (6 cols): 2. Prendas ARRIBA y 3. Secuencia DEBAJO */}
                    <div className="md:col-span-6 space-y-1.5 p-2 rounded-xl bg-white/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/70">
                      {/* 2. Prendas Arriba */}
                      <div>
                        <div className="flex justify-between items-center mb-0.5">
                          <Label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                            2. Prendas en esta Tira
                          </Label>
                          <span className="text-[10px] font-black text-primary">
                            {activeStrip.piezas || 1} {Number(activeStrip.piezas) === 1 ? "prenda" : "prendas"}
                          </span>
                        </div>
                        <div className="grid grid-cols-10 gap-0.5">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                            const isSelected = Number(activeStrip.piezas) === num;
                            return (
                              <button
                                key={num}
                                type="button"
                                onClick={() => {
                                  setMarbetesList((prev) =>
                                    prev.map((it) => (it.id === activeStrip.id ? { ...it, piezas: num } : it))
                                  );
                                }}
                                className={`h-6 rounded-md font-display font-black text-xs flex items-center justify-center transition-all border cursor-pointer ${
                                  isSelected
                                    ? "bg-primary text-white border-primary shadow-xs"
                                    : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                                }`}
                              >
                                {num}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 3. Secuencia Debajo */}
                      <div>
                        <Label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
                          3. No. Secuencia del Talonario
                        </Label>
                        <Input
                          type="number"
                          placeholder="Ej: 648"
                          value={activeStrip.secuencia}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMarbetesList((prev) =>
                              prev.map((it) => (it.id === activeStrip.id ? { ...it, secuencia: val } : it))
                            );
                          }}
                          className="h-7.5 text-base font-display font-black tracking-widest text-center rounded-lg border-primary/40 focus-visible:ring-primary/40 bg-slate-50 dark:bg-slate-800 shadow-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. BLOQUE INFERIOR: TIRAS FÍSICAS GRAPADAS EN FILA HORIZONTAL */}
                <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <span>Tiras Físicas Grapadas ({marbetesList.length})</span>
                      <span className="text-muted-foreground font-normal text-[10px]">
                        — Total: {currentSum} prendas
                      </span>
                    </span>
                    <span className="text-[9.5px] font-bold text-muted-foreground">
                      Haz clic en una tira para editarla
                    </span>
                  </div>

                  {/* Fila Horizontal de Tiras Físicas */}
                  <div className="flex items-stretch gap-2.5 overflow-x-auto pb-1 pt-0.5 custom-scrollbar min-h-[145px]">
                    {marbetesList.map((m, idx) => {
                      const isCur = m.id === activeStrip.id;
                      const tStyle = getPhysicalMarbeteStyles(m.color);
                      const secStr = m.secuencia ? String(m.secuencia) : "---";
                      const pCount = m.piezas || 1;

                      return (
                        <div
                          key={m.id || idx}
                          onClick={() => setActiveStripId(m.id)}
                          className={`relative overflow-hidden rounded-2xl border-2 transition-all cursor-pointer font-sans select-none p-2 flex flex-col items-center justify-between text-center w-[135px] sm:w-[150px] min-w-[135px] h-[148px] shrink-0 ${tStyle.bg} ${tStyle.inkText} ${
                            isCur
                              ? "border-slate-950 dark:border-white ring-2 ring-primary/80 shadow-lg"
                              : "border-black/15 dark:border-white/15 opacity-85 hover:opacity-100 shadow-xs"
                          }`}
                        >
                          {/* Micro Header */}
                          <div className="w-full flex items-center justify-between text-[7.5px] uppercase font-black tracking-wider opacity-85 pb-0.5 border-b border-current/20 mb-0.5 leading-tight">
                            <span>TIRA #{idx + 1}</span>
                            <div className="flex items-center gap-1">
                              {isCur && (
                                <span className="bg-black/25 dark:bg-white/25 px-1 py-0.2 rounded text-[6.5px] font-black tracking-normal">
                                  ACTIVA
                                </span>
                              )}
                              <span>{tStyle.name}</span>
                            </div>
                          </div>

                          {/* Cuadrícula / Cuadro Negro Centrado con Cantidad de Piezas */}
                          <div className="my-0.5 flex flex-col items-center justify-center">
                            <div
                              className={`w-12 h-12 rounded-lg flex items-center justify-center font-display font-black text-2xl sm:text-3xl shadow-inner border-2 border-black/30 ${tStyle.centerBox}`}
                            >
                              {pCount}
                            </div>
                            <span className="text-[7px] uppercase font-black tracking-widest text-center block mt-0.5 opacity-85">
                              {pCount === 1 ? "1 Prenda" : `${pCount} Prendas`}
                            </span>
                          </div>

                          {/* Número de Secuencia DEBAJO en Tipografía Grande */}
                          <div className="w-full text-center pt-0.5 border-t border-current/20">
                            <span className="font-mono font-black text-xl sm:text-2xl tracking-tight leading-none block">
                              {secStr}
                            </span>
                            <span className="text-[6.5px] uppercase font-bold tracking-wider opacity-65 block mt-0.5">
                              No. Secuencia
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Botón rápido "+ Añadir Tira" al final de la fila con altura fija alineada */}
                    <button
                      type="button"
                      onClick={() => {
                        const newId = uid();
                        const newStrip = {
                          id: newId,
                          color: "",
                          piezas: remainingPiezas,
                          secuencia: "",
                        };
                        setMarbetesList((prev) => [...prev, newStrip]);
                        setActiveStripId(newId);
                      }}
                      className="w-[115px] min-w-[115px] h-[148px] rounded-2xl border-2 border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 flex flex-col items-center justify-center gap-1 text-primary font-black text-xs transition-all cursor-pointer shrink-0 py-2.5"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <Plus className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-[11px]">Añadir Tira</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Footer de Acciones con Balance a la Izquierda */}
          {(() => {
            const totalPiezasOrden = totalPiezasCalculadas || 1;
            const currentSum = marbetesList.reduce((acc, it) => acc + (Number(it.piezas) || 0), 0);
            const isExact = currentSum === totalPiezasOrden;
            const isUnder = currentSum < totalPiezasOrden;

            return (
              <DialogFooter className="w-full flex flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
                {/* Total de Prendas en Extremo Izquierdo */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 mr-auto shadow-xs">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Total de Prendas:
                  </span>
                  <span className="text-sm font-black text-foreground font-display">
                    {currentSum}
                  </span>
                </div>

                {/* Botones de Acción a la Derecha */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs font-bold h-8 px-3.5 cursor-pointer"
                    onClick={() => {
                      setMarbetesList([]);
                      setShowMarbeteModal(false);
                    }}
                  >
                    Sin Marbete
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-xl text-xs font-black bg-primary text-white hover:bg-primary/90 h-8 px-5 cursor-pointer shadow-md"
                    onClick={() => {
                      const valid = marbetesList.filter(
                        (m) => m.color && m.secuencia && String(m.secuencia).trim() !== ""
                      );
                      if (marbetesList.length > 0 && valid.length < marbetesList.length) {
                        toast.error("Por favor completa el color y secuencia de todas las tiras agregadas.");
                        return;
                      }
                      setShowMarbeteModal(false);
                    }}
                  >
                    Guardar Marbete
                  </Button>
                </div>
              </DialogFooter>
            );
          })()}
        </DialogContent>
      </Dialog>
      
{/* ================= MODAL DE COLOR Y DETALLES DE PRENDA ================= */}
      <Dialog open={showItemDetailModal} onOpenChange={setShowItemDetailModal}>
        <DialogContent className="max-w-md p-5 rounded-3xl z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100">
              <Palette className="h-5 w-5 text-[#1B4B73] dark:text-sky-400" />
              Detalles de la Prenda
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              {editingItemIndex !== null && items[editingItemIndex]
                ? items[editingItemIndex].descripcion
                : "Personaliza el color y las notas de esta prenda"}
            </p>
          </DialogHeader>

          <div className="space-y-4 my-2">
            {/* Selector de Color */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                Color de la prenda:
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                {COLORES_PRENDA.map((c) => {
                  const isSelected = itemEditColor === c.nombre;
                  return (
                    <button
                      key={c.nombre}
                      type="button"
                      onClick={() => {
                        setItemEditColor(c.nombre);
                        setItemEditColorHex(c.hex);
                      }}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#1B4B73] bg-[#1B4B73]/10 dark:border-sky-400 dark:bg-sky-950/40 ring-2 ring-[#1B4B73]/30"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-400 bg-card"
                      }`}
                    >
                      <span
                        className="w-6 h-6 rounded-full border border-black/20 shadow-xs shrink-0"
                        style={{
                          background: c.hex.startsWith("#") || c.hex.startsWith("linear")
                            ? c.hex
                            : "#94A3B8"
                        }}
                      />
                      <span className="text-[10px] font-bold leading-tight truncate w-full">
                        {c.nombre}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input de Notas de la prenda */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Notas / Observaciones (ej. Mancha, rasgadura, botón faltante):
              </label>
              <Input
                placeholder="Ej. Mancha en cuello, botón flojo..."
                value={itemEditNota}
                onChange={(e) => setItemEditNota(e.target.value)}
                className="text-xs h-9 rounded-xl"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {["Mancha en cuello", "Falta botón", "Descosido", "Roto", "Delicada", "No planchar"].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setItemEditNota((prev) => (prev ? `${prev}, ${tag}` : tag));
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-[#1B4B73]/10 hover:text-[#1B4B73] font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl text-xs"
              onClick={() => setShowItemDetailModal(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-xl text-xs bg-[#1B4B73] hover:bg-[#153a5b] text-white font-bold"
              onClick={() => {
                if (editingItemIndex !== null) {
                  setItems((prev) =>
                    prev.map((it, idx) =>
                      idx === editingItemIndex
                        ? {
                            ...it,
                            color: itemEditColor || undefined,
                            color_hex: itemEditColorHex || undefined,
                            notas: itemEditNota || undefined,
                          }
                        : it
                    )
                  );
                }
                setShowItemDetailModal(false);
              }}
            >
              Guardar detalles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

                              {/* ================= PANEL DE COBRO (BRANDED KLYNN) ================= */}
      <Dialog open={isCobroModalOpen} onOpenChange={setIsCobroModalOpen}>
        <DialogContent className="max-w-2xl p-4 sm:p-6 rounded-3xl overflow-y-auto max-h-[92vh] custom-scrollbar z-50 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl">
          {/* Decorative Brand Dots Background */}
          <div className="absolute top-3 right-14 opacity-25 pointer-events-none hidden sm:block">
            <div className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="h-1 w-1 rounded-full bg-[#1B4B73]" />
              ))}
            </div>
          </div>
          <div className="absolute bottom-4 right-4 opacity-30 pointer-events-none hidden sm:block">
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="h-1 w-1 rounded-full bg-[#F0B900]" />
              ))}
            </div>
          </div>

          <DialogHeader className="pb-0 relative">
            <div className="flex items-start justify-between">
              {/* Logo Klynn Oficial (/favicon.webp) + Título */}
              <div className="flex items-center gap-3">
                <div className="relative h-11 w-11 flex items-center justify-center shrink-0">
                  <img
                    src="/favicon.webp"
                    alt="Klynn Logo"
                    className="h-11 w-11 object-contain drop-shadow-xs"
                    onError={(e) => {
                      // Fallback if webp fails
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div>
                  <DialogTitle className="text-xl sm:text-2xl font-display font-extrabold text-[#1B4B73] dark:text-white leading-tight">
                    Panel de Cobro
                  </DialogTitle>
                  <p className="text-xs text-slate-400 font-medium">
                    Selecciona el método de cobro
                  </p>
                </div>
              </div>

              {/* Total Header Right */}
              <div className="text-right pr-6 sm:pr-8">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#1B4B73]/70 dark:text-sky-400 block leading-none mb-1">
                  TOTAL A COBRAR
                </span>
                <span className="text-3xl sm:text-4xl font-display font-black text-[#1B4B73] dark:text-sky-300 tracking-tight leading-none">
                  {formatRD(total)}
                </span>
              </div>
            </div>
            <DialogDescription className="sr-only">
              Selecciona el método de cobro y confirma la orden.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 pt-2">
            {/* 1. LAS 4 MODALIDADES DE COBRO (AL RETIRAR EN 1ER LUGAR) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                {
                  id: "AL_RETIRAR",
                  label: "AL RETIRAR",
                  sub: "Contra entrega",
                  icon: Clock,
                },
                {
                  id: "COBRAR_AHORA",
                  label: "COBRAR AHORA",
                  sub: "Pago 100% hoy",
                  icon: Check,
                },
                {
                  id: "ANTICIPO",
                  label: "ANTICIPO",
                  sub: "Abono + Saldo",
                  icon: CalendarIcon,
                },
                {
                  id: "CREDITO",
                  label: "CRÉDITO",
                  sub: "Cuenta por cobrar",
                  icon: FileText,
                },
              ].map((m) => {
                const isSelected = condicionCobro === m.id;
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setCondicionCobro(m.id as CondicionCobro);
                      if (m.id === "COBRAR_AHORA") {
                        setRecibido(total);
                      } else if (m.id === "ANTICIPO") {
                        const half = +(total / 2).toFixed(2);
                        if (anticipoMonto <= 0 || anticipoMonto >= total) {
                          setAnticipoMonto(half);
                          setRecibido(half);
                        } else {
                          setRecibido(anticipoMonto);
                        }
                      } else if (m.id === "AL_RETIRAR") {
                        setRecibido(0);
                        setAnticipoMonto(0);
                      }
                    }}
                    className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3 transition-all duration-200 active:scale-95 text-center cursor-pointer ${
                      isSelected
                        ? "border-[#1B4B73] bg-[#1B4B73]/[0.05] dark:bg-[#1B4B73]/20 ring-2 ring-[#1B4B73]/20 shadow-xs font-bold scale-[1.02]"
                        : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#1B4B73]/30 text-slate-500 shadow-2xs"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full transition-transform ${
                        isSelected ? "bg-[#1B4B73] text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600"
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                    </div>
                    <div
                      className={`font-black text-xs uppercase tracking-wider leading-none ${
                        isSelected ? "text-[#1B4B73] dark:text-sky-300" : "text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {m.label}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-medium leading-none">
                      {m.sub}
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#F0B900] text-slate-900 shadow-xs ring-1 ring-white">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 2. MÉTODOS DE PAGO (PÍLDORAS HORIZONTALES) */}
            {(condicionCobro === "COBRAR_AHORA" || condicionCobro === "ANTICIPO") && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: "EFECTIVO", label: "EFECTIVO", icon: Banknote },
                    { id: "TARJETA", label: "TARJETA", icon: CreditCard },
                    { id: "TRANSFERENCIA", label: "TRANSF.", icon: Building2 },
                    { id: "MIXTO", label: "MIXTO", icon: Split },
                  ].map((inst) => {
                    const isSel = instrumentoPago === inst.id;
                    const Icon = inst.icon;
                    return (
                      <button
                        key={inst.id}
                        type="button"
                        onClick={() => {
                          setInstrumentoPago(inst.id as any);
                          if (inst.id === "MIXTO") {
                            const targetMonto = condicionCobro === "ANTICIPO" ? anticipoMonto : total;
                            setPagoEfectivo(+Math.round(targetMonto / 2));
                            setPagoTarjeta(+Math.max(0, targetMonto - Math.round(targetMonto / 2)));
                            setPagoTransferencia(0);
                          }
                        }}
                        className={`relative flex items-center justify-center gap-2 rounded-2xl border-2 py-2.5 px-3 transition-all duration-200 active:scale-95 cursor-pointer ${
                          isSel
                            ? "border-[#1B4B73] bg-[#1B4B73] text-white font-black shadow-xs scale-[1.01]"
                            : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#1B4B73]/30 text-slate-700 dark:text-slate-300 font-bold shadow-2xs"
                        }`}
                      >
                        <Icon className={`h-4.5 w-4.5 shrink-0 ${isSel ? "text-[#F0B900]" : ""}`} />
                        <span className="text-xs tracking-wider">{inst.label}</span>
                        {isSel && (
                          <div className="h-4 w-4 rounded-full bg-[#F0B900] text-slate-900 flex items-center justify-center shrink-0 ml-0.5">
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* A1. ANTICIPO: UN SOLO CAMPO */}
                {condicionCobro === "ANTICIPO" && (
                  <div className="p-3.5 bg-[#1B4B73]/[0.03] dark:bg-[#1B4B73]/20 border-2 border-[#1B4B73]/20 rounded-2xl space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black uppercase tracking-wider text-[#1B4B73] dark:text-sky-200">
                        MONTO DEL ANTICIPO A ABONAR HOY
                      </span>
                      <span className="font-black text-[#855B00] dark:text-amber-300 bg-[#F0B900]/20 px-2 py-0.5 rounded-lg border border-[#F0B900]/40">
                        Saldo al retirar: <b>{formatRD(Math.max(0, total - anticipoMonto))}</b>
                      </span>
                    </div>
                    <div className="relative h-13">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-lg text-[#1B4B73]/60">
                        RD$
                      </span>
                      <PriceInput
                        className="!h-full pl-14 !text-2xl font-black font-display bg-white dark:bg-slate-900 border-2 border-[#1B4B73]/30 focus-visible:ring-[#1B4B73]/30 rounded-xl text-[#1B4B73] dark:text-sky-300 shadow-2xs"
                        value={anticipoMonto}
                        onChange={(val) => {
                          if (val > total) {
                            toast.warning("El anticipo no puede exceder el total");
                            return;
                          }
                          setAnticipoMonto(val);
                          setRecibido(val);
                        }}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#1B4B73]/80 dark:text-sky-300/80 pt-0.5">
                      <span>Total de la orden: <b>{formatRD(total)}</b></span>
                      <span>Abono hoy con <b>{instrumentoPago}</b>: <b>{formatRD(anticipoMonto)}</b></span>
                    </div>
                  </div>
                )}

                {/* A2. COBRAR AHORA Y EFECTIVO: MONTO RECIBIDO Y CAMBIO */}
                {condicionCobro === "COBRAR_AHORA" && instrumentoPago === "EFECTIVO" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center animate-in fade-in duration-200">
                    <div>
                      <Label className="text-[10px] font-black uppercase tracking-wider text-[#1B4B73] dark:text-sky-300 mb-1.5 block">
                        MONTO RECIBIDO (EFECTIVO)
                      </Label>
                      <div className="rounded-2xl border-2 border-sky-100 dark:border-sky-900/40 bg-sky-50/40 dark:bg-sky-950/20 p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="font-black text-base text-slate-400 dark:text-slate-500 pl-1">
                            RD$
                          </span>
                          <PriceInput
                            className="h-10 w-full !text-2xl font-black font-display bg-transparent border-none focus-visible:ring-0 text-[#1B4B73] dark:text-sky-200 p-0 shadow-none"
                            value={recibido}
                            onChange={(val) => {
                              if (val > 100000000) return;
                              setRecibido(val);
                            }}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="h-9 w-9 rounded-xl bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0">
                          <Banknote className="h-5 w-5" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className={`text-[10px] font-black uppercase tracking-wider mb-1.5 block ${recibido < total ? "text-rose-600" : "text-emerald-600"}`}>
                        {recibido < total ? "FALTANTE" : "CAMBIO A ENTREGAR"}
                      </Label>
                      <div className={`rounded-2xl border-2 p-2.5 flex items-center justify-between ${
                        recibido < total
                          ? "border-rose-100 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400"
                          : "border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                      }`}>
                        <div className="flex items-center gap-1.5 pl-1">
                          <span className="font-bold text-sm opacity-80">RD$</span>
                          <span className="text-2xl font-display font-black leading-none">
                            {formatRD(
                              recibido > total
                                ? recibido - total
                                : total - recibido
                            ).replace("RD$", "").trim()}
                          </span>
                        </div>
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                          recibido < total
                            ? "bg-rose-100 dark:bg-rose-900/60 text-rose-600"
                            : "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600"
                        }`}>
                          {recibido < total ? (
                            <AlertTriangle className="h-5 w-5" />
                          ) : (
                            <CheckCircle2 className="h-5 w-5" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TARJETA */}
                {instrumentoPago === "TARJETA" && (
                  <div className="space-y-1.5 animate-in fade-in duration-200">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                      REFERENCIA DE TARJETA / APROBACIÓN (OPCIONAL)
                    </Label>
                    <Input
                      placeholder="Número de aprobación, autorización, Auth # o APR."
                      value={referencia}
                      onChange={(e) => setReferencia(e.target.value)}
                      className="h-12 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 focus-visible:ring-[#1B4B73]/30 rounded-2xl font-medium text-sm px-4 shadow-2xs"
                      autoFocus
                    />
                  </div>
                )}

                {/* TRANSFERENCIA */}
                {instrumentoPago === "TRANSFERENCIA" && (
                  <div className="space-y-1.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-[#1B4B73] dark:text-sky-200 block">
                        NO. DE TRANSFERENCIA / COMPROBANTE * (OBLIGATORIA)
                      </Label>
                      {!referencia.trim() && (
                        <span className="text-[10px] text-destructive font-black">* Requerida</span>
                      )}
                    </div>
                    <Input
                      placeholder="Número de aprobación, transferencia bancaria, cuenta..."
                      value={referencia}
                      onChange={(e) => setReferencia(e.target.value)}
                      className={`h-12 bg-white dark:bg-slate-900 border-2 rounded-2xl font-medium text-sm px-4 shadow-2xs ${
                        !referencia.trim()
                          ? "border-destructive focus-visible:ring-destructive"
                          : "border-slate-200 dark:border-slate-700 focus-visible:ring-[#1B4B73]/40"
                      }`}
                      autoFocus
                    />
                  </div>
                )}

                {/* MIXTO */}
                {instrumentoPago === "MIXTO" && (
                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border-2 border-[#1B4B73]/20 space-y-2.5 shadow-2xs animate-in fade-in duration-200">
                    <div className="flex items-center justify-between pb-1 border-b border-border/60 text-xs">
                      <span className="font-black uppercase tracking-wider text-[#1B4B73] flex items-center gap-1.5">
                        <Split className="h-4 w-4" /> Desglose Multi-método
                      </span>
                      <span className="text-muted-foreground">
                        Total: <b>{formatRD(condicionCobro === "ANTICIPO" ? anticipoMonto : total)}</b>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Efectivo */}
                      <div className="p-3 rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20 space-y-2">
                        <span className="text-sm font-black text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                          <Banknote className="h-4.5 w-4.5 shrink-0" /> Efectivo
                        </span>
                        <PriceInput
                          className="h-11 text-right font-black !text-xl rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 focus-visible:ring-emerald-500/30 shadow-2xs px-3 text-foreground"
                          value={pagoEfectivo}
                          onChange={(v) => setPagoEfectivo(v)}
                          placeholder="0.00"
                        />
                      </div>

                      {/* Tarjeta */}
                      <div className="p-3 rounded-2xl border-2 border-indigo-500/30 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-2">
                        <span className="text-sm font-black text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                          <CreditCard className="h-4.5 w-4.5 shrink-0" /> Tarjeta
                        </span>
                        <PriceInput
                          className="h-11 text-right font-black !text-xl rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 focus-visible:ring-indigo-500/30 shadow-2xs px-3 text-foreground"
                          value={pagoTarjeta}
                          onChange={(v) => setPagoTarjeta(v)}
                          placeholder="0.00"
                        />
                      </div>

                      {/* Transferencia */}
                      <div className="p-3 rounded-2xl border-2 border-sky-500/30 bg-sky-50/20 dark:bg-sky-950/20 space-y-2">
                        <span className="text-sm font-black text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                          <Building2 className="h-4.5 w-4.5 shrink-0" /> Transferencia
                        </span>
                        <PriceInput
                          className="h-11 text-right font-black !text-xl rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 focus-visible:ring-sky-500/30 shadow-2xs px-3 text-foreground"
                          value={pagoTransferencia}
                          onChange={(v) => setPagoTransferencia(v)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {pagoTransferencia > 0 && (
                      <div className="pt-1">
                        <Input
                          placeholder="No. referencia de transferencia * (Obligatoria)"
                          value={pagoTransferenciaRef}
                          onChange={(e) => setPagoTransferenciaRef(e.target.value)}
                          className={`h-10 text-xs rounded-xl bg-white dark:bg-slate-900 border-2 shadow-2xs ${
                            !pagoTransferenciaRef.trim() ? "border-destructive focus-visible:ring-destructive" : "border-slate-200 dark:border-slate-700"
                          }`}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1.5 border-t border-border/60 text-xs">
                      <div>
                        <span className="text-muted-foreground">Asignado: </span>
                        <span className="font-black text-foreground">{formatRD(pagoEfectivo + pagoTarjeta + pagoTransferencia)}</span>
                      </div>
                      <div>
                        {Math.abs((condicionCobro === "ANTICIPO" ? anticipoMonto : total) - (pagoEfectivo + pagoTarjeta + pagoTransferencia)) > 0.01 ? (
                          <span className="text-destructive font-black">
                            Falta: {formatRD(Math.max(0, (condicionCobro === "ANTICIPO" ? anticipoMonto : total) - (pagoEfectivo + pagoTarjeta + pagoTransferencia)))}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-black flex items-center gap-1">
                            <Check className="h-3.5 w-3.5" /> Cuadre exacto (100%)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* B. AL RETIRAR */}
            {condicionCobro === "AL_RETIRAR" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-4 rounded-2xl border-2 border-[#1B4B73]/20 bg-[#1B4B73]/[0.03] p-4 text-[#1B4B73] dark:text-sky-200">
                  <Timer className="h-8 w-8 text-[#1B4B73] shrink-0" />
                  <div>
                    <strong className="block text-sm font-black">
                      Cobro contra entrega (Pago al retirar)
                    </strong>
                    <span className="text-xs">
                      La orden se registrará con <b>RD$0.00 pagados</b> y se creará un saldo
                      pendiente de <b>{formatRD(total)}</b> que se cobrará cuando el cliente venga a
                      retirar su ropa.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* C. CRÉDITO */}
            {condicionCobro === "CREDITO" && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                {(!cliente || (cliente.nombre === "Consumidor" && cliente.apellido === "Final") || cliente.tipo === "Consumidor Final") ? (
                  <div className="flex items-center gap-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-destructive">
                    <AlertTriangle className="h-8 w-8 text-destructive shrink-0" />
                    <div>
                      <strong className="block text-sm">Cliente Registrado Obligatorio</strong>
                      <span className="text-xs">Las ventas a crédito deben asignarse a un cliente registrado (no Consumidor Final).</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4 rounded-xl border border-warning/40 bg-warning/5 p-3.5 text-warning-foreground">
                      <AlertTriangle className="h-7 w-7 text-warning shrink-0" />
                      <div>
                        <strong className="block text-sm">Venta a crédito</strong>
                        <span className="text-xs">Se registrará en el balance de <span className="font-bold">{cliente?.nombre} {cliente?.apellido}</span>.</span>
                      </div>
                    </div>

                    <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20 p-3.5 shadow-2xs">
                      <div className="flex items-center gap-2 mb-2.5">
                        <Timer className="h-4 w-4 text-amber-500 shrink-0" />
                        <span className="text-[11px] font-black uppercase tracking-[0.08em] text-amber-800 dark:text-amber-300">
                          PLAZO DE CRÉDITO (DÍAS DE VENCIMIENTO)
                        </span>
                      </div>
                      <div className="grid grid-cols-6 gap-2">
                        {OPCIONES_CREDITO.map((op) => (
                          <button
                            key={op.dias}
                            type="button"
                            onClick={() => actualizarLimiteDias(op.dias)}
                            className={`relative flex flex-col items-center justify-center py-2.5 rounded-xl border transition-all duration-200 active:scale-95 cursor-pointer ${
                              limiteDiasSel === op.dias
                                ? "border-[#1B4B73] bg-[#1B4B73] text-white font-bold scale-[1.02] shadow-2xs"
                                : "border-border bg-white dark:bg-slate-900 text-muted-foreground hover:border-[#1B4B73]/40 shadow-2xs"
                            }`}
                          >
                            <span className="text-lg font-display font-black leading-none mb-0.5">
                              {op.dias}
                            </span>
                            <span className="text-[8px] font-black uppercase tracking-wider leading-none">
                              DÍAS
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border-2 border-warning/20 bg-warning/5 p-3">
                      <Label className="mb-1 block text-xs font-black uppercase tracking-widest text-amber-600">
                        ¿Monto a abonar inicialmente? (Opcional)
                      </Label>
                      <div className="relative h-12">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-base text-amber-600/40">
                          RD$
                        </span>
                        <PriceInput
                          className="!h-full pl-12 !text-2xl font-black font-display bg-white dark:bg-slate-900 border-2 border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-300 font-bold shadow-2xs"
                          value={abonoCredito}
                          onChange={(val) => {
                            if (val > total) {
                              toast.warning("El abono no puede exceder el total");
                              return;
                            }
                            setAbonoCredito(val);
                          }}
                          placeholder="0.00"
                        />
                      </div>
                      <p className="mt-1 text-xs text-amber-600/70 font-medium">
                        Saldo restante (<strong>{formatRD(Math.max(0, total - abonoCredito))}</strong>) irá al balance de <strong>{cliente?.nombre}</strong>.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 3. FOOTER: SEGURIDAD + BOTÓN VERDE (#16A34A) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              {/* Security badge */}
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#1B4B73]/[0.06] text-[#1B4B73] dark:text-sky-400 flex items-center justify-center border border-[#1B4B73]/15 shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block leading-tight">
                    Transacción segura
                  </span>
                  <span className="text-[10px] text-slate-400 block leading-none mt-0.5">
                    Tus datos están protegidos
                  </span>
                </div>
              </div>

              {/* Botón Verde (#16A34A) */}
              <Button
                size="lg"
                className="w-full sm:w-auto h-13 px-8 text-sm sm:text-base font-extrabold tracking-wide rounded-2xl bg-[#16A34A] hover:bg-[#15803D] text-white shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                onClick={() => onCrearOrden(false)}
                disabled={
                  isCreatingOrden ||
                  (condicionCobro === "CREDITO" && (!cliente || cliente.tipo === "Consumidor Final" || (cliente.nombre === "Consumidor" && cliente.apellido === "Final"))) ||
                  ((condicionCobro === "COBRAR_AHORA" || condicionCobro === "ANTICIPO") && instrumentoPago === "EFECTIVO" && recibido < (condicionCobro === "ANTICIPO" ? anticipoMonto : total)) ||
                  ((condicionCobro === "COBRAR_AHORA" || condicionCobro === "ANTICIPO") && instrumentoPago === "TRANSFERENCIA" && !referencia.trim()) ||
                  ((condicionCobro === "COBRAR_AHORA" || condicionCobro === "ANTICIPO") && instrumentoPago === "MIXTO" && (
                    Math.abs((condicionCobro === "ANTICIPO" ? anticipoMonto : total) - (pagoEfectivo + pagoTarjeta + pagoTransferencia)) > 0.01 ||
                    (pagoTransferencia > 0 && !pagoTransferenciaRef.trim())
                  ))
                }
              >
                {isCreatingOrden ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> PROCESANDO...
                  </>
                ) : (
                  <>
                    <div className="h-5 w-5 rounded-full border-2 border-white flex items-center justify-center">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                    <span>CONFIRMAR Y CREAR ORDEN</span>
                    <span className="ml-1.5 rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                      ESPACIO
                    </span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

function Stepper({
  step,
  enableServicios,
  enablePrendas,
}: {
  step: number;
  enableServicios: boolean;
  enablePrendas: boolean;
}) {
  const stepsList = [
    { id: 1, label: "Cliente", icon: UserIcon },
    enableServicios && { id: 2, label: "Servicios", icon: LayoutGrid },
    enablePrendas && { id: 3, label: "Prendas", icon: Shirt },
    { id: 4, label: "Resumen", icon: Receipt },
    { id: 5, label: "Cobro", icon: CreditCard },
  ].filter(Boolean) as { id: number; label: string; icon: any }[];

  return (
    <div className="flex flex-wrap items-center justify-center gap-y-4 gap-x-2 md:gap-x-4 max-w-4xl mx-auto w-full py-4 px-2">
      {stepsList.map((stepItem, index) => {
        const done = step > stepItem.id;
        const cur = step === stepItem.id;
        const Icon = stepItem.icon;

        return (
          <div key={stepItem.label} className="flex items-center">
            {/* Step circle */}
            <div className="flex flex-col items-center text-center group">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 ${
                  done
                    ? "bg-emerald-600 text-white shadow-md scale-105"
                    : cur
                      ? "bg-primary text-white shadow-glow ring-4 ring-primary/20 scale-110"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-250 dark:border-slate-700"
                }`}
                title={stepItem.label}
              >
                {done ? (
                  <Check className="h-5 w-5 stroke-[2.5]" />
                ) : (
                  <Icon className="h-5 w-5 stroke-[1.8]" />
                )}
              </div>
              <div
                className={`mt-2 text-[10px] md:text-[11px] font-black uppercase tracking-wider ${
                  cur
                    ? "text-primary font-black animate-pulse"
                    : done
                      ? "text-emerald-700 font-bold"
                      : "text-muted-foreground font-medium"
                }`}
              >
                {stepItem.label}
              </div>
            </div>

            {/* Connector Line */}
            {index < stepsList.length - 1 && (
              <div className="flex items-center justify-center px-1 md:px-3">
                <div
                  className={`h-1 w-6 md:w-12 rounded-full transition-all duration-500 -mt-4 ${
                    done ? "bg-emerald-600" : "bg-slate-200 dark:bg-slate-800"
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}
function Row({ k, v, className = "" }: { k: string; v: string; className?: string }) {
  return (
    <div className={`flex justify-between text-sm ${className}`}>
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

// === Add Item Dialog ===
function AddItemDialog({
  open,
  onOpenChange,
  catalogo,
  items,
  onAdd,
  onUpdateQty,
  isDesglose = false,
  onAddDesglose,
  serviceName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  catalogo: CatalogoItem[];
  items: OrdenItem[];
  onAdd: (it: OrdenItem) => void;
  onUpdateQty: (i: number, d: number) => void;
  isDesglose?: boolean;
  onAddDesglose?: (it: OrdenItem) => void;
  serviceName?: string;
}) {
  const [activeCat, setActiveCat] = useState<string>("TODOS");
  const [search, setSearch] = useState("");

  const categories = useMemo(() => {
    const cats = new Set(catalogo.map((c) => c.categoria || "Otros"));
    return ["TODOS", ...Array.from(cats)];
  }, [catalogo]);

  const itemsFiltered = useMemo(() => {
    let list = catalogo;
    if (activeCat !== "TODOS") {
      list = list.filter((c) => (c.categoria || "Otros") === activeCat);
    }
    if (search) {
      list = list.filter((c) => c.nombre.toLowerCase().includes(search.toLowerCase()));
    }
    return list;
  }, [catalogo, activeCat, search]);

  useEffect(() => {
    if (open) {
      setActiveCat("TODOS");
      setSearch("");
    }
  }, [open]);

  function handleItemClick(it: CatalogoItem) {
    const matchedServicePrice = serviceName && it.precios_servicios?.[serviceName] !== undefined
      ? Number(it.precios_servicios[serviceName])
      : (it.precio || 0);

    if (isDesglose && onAddDesglose) {
      onAddDesglose({
        descripcion: `↳ ${it.nombre}`,
        cantidad: 1,
        precio_unitario: matchedServicePrice,
        es_libra: it.por_libra || false,
        is_exento: !!it.is_exento,
        servicio_origen: serviceName,
      });
      return;
    }
    const existingIdx = items.findIndex((x) => x.descripcion === it.nombre);
    if (existingIdx > -1) {
      onUpdateQty(existingIdx, 1);
    } else {
      onAdd({
        descripcion: it.nombre,
        cantidad: 1,
        precio_unitario: matchedServicePrice,
        es_libra: it.por_libra,
        is_exento: it.is_exento,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl p-0 overflow-hidden rounded-3xl"
        style={{ display: "flex", flexDirection: "column", height: "95vh", maxHeight: "90vh" }}
      >
        <DialogHeader className="p-6 pb-2 border-b border-border/50">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="text-2xl font-display font-bold">
              {isDesglose
                ? serviceName
                  ? `Añadir prendas para ${serviceName}`
                  : "Añadir prendas al servicio"
                : "Seleccionar Prendas"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Selecciona las prendas que deseas agregar a la orden.
            </DialogDescription>
            <div className="relative flex-1 max-w-xs mr-10">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                className="pl-9 h-9 bg-accent/5 rounded-xl border-primary/10 shadow-sm text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 py-4 overflow-x-auto no-scrollbar">
            {categories.map((c) => (
              <Button
                key={c}
                variant={activeCat === c ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCat(c)}
                className={`rounded-full px-5 h-9 text-xs font-bold uppercase tracking-tight transition-all ${
                  activeCat === c
                    ? "bg-primary text-white shadow-glow"
                    : "opacity-70 hover:opacity-100 bg-background"
                }`}
              >
                {c}
              </Button>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-accent/5">
          {itemsFiltered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground opacity-30">
              <Shirt className="h-16 w-16 mb-4" />
              <p className="font-medium">No se encontraron prendas</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {itemsFiltered.map((it) => {
                const count = items
                  .filter((x) => x.descripcion === it.nombre)
                  .reduce((acc, x) => acc + x.cantidad, 0);
                return (
                  <button
                    key={it.id}
                    onClick={() => handleItemClick(it)}
                    className={`group relative flex flex-col items-center justify-center gap-3 p-5 rounded-3xl border-2 transition-all active:scale-90 text-center ${
                      count > 0
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    {it.imagen_url ? (
                      <img
                        src={it.imagen_url}
                        alt={it.nombre}
                        className={`h-16 w-16 rounded-2xl object-cover shadow-sm transition-all duration-300 ${count > 0 ? "scale-110 ring-4 ring-primary/20" : "group-hover:scale-105"}`}
                      />
                    ) : (
                      <div
                        className={`flex h-16 w-16 items-center justify-center rounded-2xl text-3xl transition-all duration-300 ${count > 0 ? "bg-primary text-white scale-110 shadow-glow" : "bg-accent/30 group-hover:bg-primary/10"}`}
                      >
                        {it.icono || "👕"}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-bold leading-tight line-clamp-1">
                        {it.nombre}
                      </div>
                      {it.por_libra && (
                        <div className="mt-1.5 flex justify-center">
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                            <Scale className="h-3 w-3 text-amber-600" /> Cobro por libra
                          </span>
                        </div>
                      )}
                      <div className="mt-1 text-xs font-black text-primary">
                        {formatRD(it.precio)}
                        {it.por_libra ? "/lb" : ""}
                      </div>
                    </div>

                    {count > 0 && (
                      <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-xs font-black shadow-glow animate-in zoom-in duration-300 ring-4 ring-background">
                        {count}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-background border-t border-border/50">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full md:w-auto px-12 h-11 text-lg font-bold bg-primary text-white rounded-md shadow-glow border-none"
          >
            Listo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeliveryPOSDialog({
  open,
  onOpenChange,
  enabled,
  setEnabled,
  addressData,
  setAddressData,
  cost,
  setCost,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  enabled: boolean;
  setEnabled: (e: boolean) => void;
  addressData: AddressData;
  setAddressData: (a: AddressData) => void;
  cost: number;
  setCost: (c: number) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (open) {
      setStep(1);
    }
  }, [open]);

  const handleNextStep = () => {
    setStep(2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-lg p-0 overflow-hidden border-none shadow-2xl bg-background text-foreground">
        {/* STEPPER HEADER */}
        <div className="bg-slate-50/70 dark:bg-slate-900/60 p-4 sm:p-5 pb-2 relative border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center justify-between mb-3 pr-10">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/15 shadow-xs">
                <Truck className="h-4.5 w-4.5" />
              </div>
              <div>
                <DialogTitle className="text-base font-display font-bold text-foreground">
                  Envío a Domicilio
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  {step === 1
                    ? "Paso 1: Dirección y geolocalización"
                    : "Paso 2: Detalles del inmueble y tarifa"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {enabled ? "Envío Activo" : "Sin Envío"}
              </span>
              <Switch checked={enabled} onCheckedChange={setEnabled} className="scale-75 origin-right" />
            </div>
          </div>

          {/* Stepper Buttons (Centered Pills) */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-200/60 dark:bg-slate-800/80">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                step === 1
                  ? "bg-primary text-white shadow-md font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span
                className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                  step === 1
                    ? "bg-white/25 text-white"
                    : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                1
              </span>
              <span>Dirección y Ubicación</span>
            </button>

            <button
              type="button"
              onClick={handleNextStep}
              className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                step === 2
                  ? "bg-primary text-white shadow-md font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span
                className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                  step === 2
                    ? "bg-white/25 text-white"
                    : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                2
              </span>
              <span>Detalles y Tarifa</span>
            </button>
          </div>
        </div>

        {/* DIALOG BODY */}
        <div className="px-4 sm:px-5 py-4">
          {step === 1 ? (
            /* STEP 1: DIRECCIÓN Y UBICACIÓN */
            <div className="space-y-3.5 animate-in fade-in slide-in-from-left-3 duration-200">
              <AddressAutocomplete
                value={addressData}
                onChange={(addr) => {
                  setAddressData(addr);
                  if (!enabled) setEnabled(true);
                }}
                label="Buscar Dirección (API)"
                required
                showDetails={false}
              />

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Punto de Referencia (Para el Repartidor)
                </Label>
                <Input
                  value={addressData.referencia || ""}
                  onChange={(e) => setAddressData({ ...addressData, referencia: e.target.value })}
                  placeholder="Ej. Portón negro frente al parque, tocar timbre 4B..."
                  className="h-9.5 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                />
              </div>

              {/* Step 1 Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="rounded-xl h-8.5 px-4 text-xs font-medium"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="rounded-xl h-8.5 px-5 text-xs font-bold bg-primary text-white gap-1.5 shadow-md"
                >
                  Siguiente: Detalles <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            /* STEP 2: DETALLES DEL INMUEBLE Y TARIFA */
            <div className="space-y-3.5 animate-in fade-in slide-in-from-right-3 duration-200">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Edificio / Apto / Nivel
                  </Label>
                  <div className="relative">
                    <Building className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      value={addressData.edificio_apto || ""}
                      onChange={(e) => setAddressData({ ...addressData, edificio_apto: e.target.value })}
                      placeholder="Torre / Apto 4B"
                      className="h-9 pl-8 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Sector / Barrio
                  </Label>
                  <Input
                    value={addressData.sector || ""}
                    onChange={(e) => setAddressData({ ...addressData, sector: e.target.value })}
                    placeholder="Ej. Piantini"
                    className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>

              {/* Delivery Cost with Quick Amount Chips */}
              <div className="space-y-2 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 p-3 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    Costo de Envío (RD$)
                  </Label>
                  <span className="text-[10px] text-slate-400">Se sumará al total</span>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-muted-foreground/60 text-xs">
                    RD$
                  </span>
                  <PriceInput
                    value={cost}
                    onChange={setCost}
                    placeholder="0.00"
                    className="h-9 rounded-xl bg-white dark:bg-slate-900 border-primary/20 pl-11 text-xs font-bold"
                  />
                </div>

                {/* Quick Fee Chips */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  {[0, 100, 150, 200, 250].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setCost(amount)}
                      className={`flex-1 rounded-lg py-1 text-[10px] font-bold border transition-colors ${
                        cost === amount
                          ? "bg-primary text-white border-primary"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                      }`}
                    >
                      {amount === 0 ? "Gratis" : `${amount}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2 Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="rounded-xl h-8.5 px-4 text-xs font-medium gap-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Atrás
                </Button>
                <Button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded-xl h-8.5 px-5 text-xs font-bold bg-primary text-white gap-1.5 shadow-md"
                >
                  <Check className="h-3.5 w-3.5" /> Confirmar Entrega
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DiscountPOSDialog({
  open,
  onOpenChange,
  discount,
  setDiscount,
  empleado,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  discount: number;
  setDiscount: (d: number) => void;
  empleado?: Empleado;
}) {
  const [val, setVal] = useState(discount > 0 ? String(discount) : "");

  const maxLimit = empleado?.rol === "ADMIN" ? 100 : (empleado?.max_descuento_porcentaje ?? 100);

  useEffect(() => {
    if (open) {
      setVal(discount > 0 ? String(discount) : "");
    }
  }, [open, discount]);

  function apply() {
    const num = parseFloat(val) || 0;
    if (num < 0 || num > 100) {
      toast.warning("El porcentaje de descuento debe estar entre 0% y 100%");
      return;
    }
    if (num > maxLimit) {
      toast.error(`Límite permitido: ${maxLimit}%`);
      return;
    }
    setDiscount(num);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-display font-bold flex items-center gap-2">
            <Percent className="h-6 w-6 text-amber-500" />
            Aplicar Descuento
          </DialogTitle>
          <DialogDescription className="sr-only">
            Ingresa el porcentaje del descuento que deseas aplicar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="relative h-24">
            <Input
              className="!h-full pr-16 pl-6 !text-5xl font-black font-display bg-accent/5 border-2 border-primary/20 focus-visible:ring-primary/30 rounded-3xl text-center"
              value={val}
              onChange={(e) => {
                const text = e.target.value.replace(/[^0-9.]/g, "");
                setVal(text);
              }}
              placeholder="0"
              autoFocus
              type="text"
              inputMode="decimal"
            />
            <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-2xl text-muted-foreground/30">
              %
            </span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            El descuento se aplicará al total de la orden.
            {maxLimit < 100 && (
              <span className="block mt-1.5 font-bold text-amber-600 dark:text-amber-400">
                Límite permitido: {maxLimit}%
              </span>
            )}
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setDiscount(0);
              onOpenChange(false);
            }}
            className="flex-1 h-11 rounded-md border-rose-200 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold"
          >
            Quitar Desc.
          </Button>
          <Button
            onClick={apply}
            className="flex-1 h-11 rounded-md bg-primary text-white font-bold shadow-glow border-none"
          >
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TicketPrintPortal({
  orden,
  tenant,
  clientes,
  empleados,
  serviciosList = [],
  pagoRecibido,
  ocultarUbicacion,
  ocultarNotas,
  esProduccion,
  esMarquillas,
  onClose,
}: {
  orden: Orden;
  tenant: any;
  clientes: any[];
  empleados: any[];
  serviciosList?: any[];
  pagoRecibido?: number;
  ocultarUbicacion?: boolean;
  ocultarNotas?: boolean;
  esProduccion?: boolean;
  esMarquillas?: boolean;
  onClose: () => void;
}) {
  const initialEmp = (empleados || []).find((x) => x.id === orden.empleado_id) || { nombre: "Personal" };
  const initialCli = (clientes || []).find((c) => c.id === orden.cliente_id) || {
    nombre: "Consumidor",
    apellido: "Final",
    cedula: "",
    telefono: "",
  };

  const [emp, setEmp] = useState<any>(initialEmp);
  const [cli, setCli] = useState<any>(initialCli);
  const [srvList, setSrvList] = useState<any[]>(serviciosList || []);
  const [ready, setReady] = useState(false);
  const hasPrintedRef = useRef(false);
  const printRootRef = useRef<HTMLDivElement>(null);

  // Async data fetch for extra details
  useEffect(() => {
    let active = true;
    Promise.all([
      getEmpleadoById(orden.empleado_id).catch(() => null),
      Promise.resolve((clientes || []).find((c) => c.id === orden.cliente_id)),
      serviciosList && serviciosList.length > 0 ? Promise.resolve(serviciosList) : getServicios(tenant.id).catch(() => []),
    ]).then(([e, c, s]) => {
      if (!active) return;
      if (e) setEmp(e);
      if (c) setCli(c);
      if (s && s.length > 0) setSrvList(s);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [orden, tenant.id, clientes, empleados, serviciosList]);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const cfg = tenant.config || {};
  const imprimirCopiaCaja = Boolean(cfg.ticket_imprimir_copia_caja);
  const imprimirTaller = Boolean(
    cfg.ticket_imprimir_taller_auto &&
    (!cfg.ticket_taller_solo_con_ubicacion || orden.ubicacion_ropa)
  );
  const imprimirMarquillas = Boolean(cfg.ticket_imprimir_marquillas_auto && (orden.items && orden.items.length > 0));

  // Intenta primero ESC/POS para que cada marquilla incluya su comando físico
  // de corte. Si la impresora está configurada como "sistema" (o no existe
  // una conexión directa), conserva el diálogo de impresión del navegador.
  useEffect(() => {
    if (!ready || hasPrintedRef.current) return;
    hasPrintedRef.current = true;

    let closed = false;
    const safeClose = () => {
      if (closed) return;
      closed = true;
      window.removeEventListener("afterprint", safeClose);
      onCloseRef.current();
    };

    const print = async () => {
      try {
        const jobs: Uint8Array[] = [];

        if (esMarquillas) {
          jobs.push(encodeMarquillasEscPos(orden, tenant, cli, emp));
        } else if (esProduccion) {
          jobs.push(encodeEscPos(orden, tenant, cli, emp, srvList, pagoRecibido, ocultarUbicacion, ocultarNotas, true));
        } else {
          jobs.push(encodeEscPos(orden, tenant, cli, emp, srvList, pagoRecibido, ocultarUbicacion, ocultarNotas));

          if (imprimirCopiaCaja) {
            jobs.push(encodeEscPos(orden, tenant, cli, emp, srvList, pagoRecibido, ocultarUbicacion, ocultarNotas, false, true));
          }
          if (imprimirTaller) {
            jobs.push(encodeEscPos(orden, tenant, cli, emp, srvList, pagoRecibido, ocultarUbicacion, ocultarNotas, true));
          }
          if (imprimirMarquillas) {
            jobs.push(encodeMarquillasEscPos(orden, tenant, cli, emp));
          }
        }

        const totalBytes = jobs.reduce((total, job) => total + job.length, 0);
        const payload = new Uint8Array(totalBytes);
        let offset = 0;
        jobs.forEach((job) => {
          payload.set(job, offset);
          offset += job.length;
        });

        const printedDirectly = await printDirectRaw(payload, cfg);
        if (printedDirectly) {
          const incluyeCopias = !esMarquillas && !esProduccion && (imprimirCopiaCaja || imprimirTaller);
          toast.success(imprimirMarquillas || esMarquillas
            ? "¡Tickets y marquillas impresos con cortes individuales!"
            : incluyeCopias
              ? "¡Ticket y copias impresos con cortes individuales!"
              : "¡Ticket impreso en impresora física!");
          safeClose();
          return;
        }

        if (printRootRef.current) {
          const printedSeparately = await printBrowserElementsIndividually(
            printRootRef.current,
            '[data-print-job="true"], .marquilla-item'
          );
          if (printedSeparately) {
            safeClose();
            return;
          }
        }

        window.addEventListener("afterprint", safeClose, { once: true });
        window.print();
      } catch (err) {
        console.error("Error en impresión directa; usando diálogo del navegador:", err);
        try {
          window.addEventListener("afterprint", safeClose, { once: true });
          window.print();
        } catch (printErr) {
          console.error("Error al disparar window.print:", printErr);
          safeClose();
        }
      }
    };

    const printTimer = setTimeout(() => void print(), 200);

    return () => {
      clearTimeout(printTimer);
      window.removeEventListener("afterprint", safeClose);
    };
  }, [ready, esMarquillas, esProduccion, imprimirCopiaCaja, imprimirTaller, imprimirMarquillas]);

  if (!emp || !cli) return null;

  return createPortal(
    <div ref={printRootRef} className="fixed inset-0 bg-white z-[99999] overflow-y-auto pointer-events-auto atomic-print-target opacity-0 pointer-events-none print:opacity-100">
      <div className="max-w-md mx-auto p-0 print:p-0 print:max-w-none print:m-0">
        {esMarquillas ? (
          <MarquillasTicket
            orden={orden}
            tenant={tenant}
            cliente={cli}
            empleado={emp}
            formato={cfg.formato_ticket || "80mm"}
          />
        ) : esProduccion ? (
          <Ticket
            orden={orden}
            tenant={tenant}
            empleado={emp}
            cliente={cli}
            formato={cfg.formato_ticket || "80mm"}
            serviciosList={srvList}
            pagoRecibido={pagoRecibido}
            ocultarUbicacion={ocultarUbicacion}
            ocultarNotas={ocultarNotas}
            esProduccion={true}
          />
        ) : (
          <>
            {/* 1. TICKET PRINCIPAL / CLIENTE */}
            <div className="ticket-page" data-print-job="true" data-print-kind="cliente">
              <Ticket
                orden={orden}
                tenant={tenant}
                empleado={emp}
                cliente={cli}
                formato={cfg.formato_ticket || "80mm"}
                serviciosList={srvList}
                pagoRecibido={pagoRecibido}
                ocultarUbicacion={ocultarUbicacion}
                ocultarNotas={ocultarNotas}
              />
            </div>

            {/* 2. DUPLICADO / COPIA DE CAJA */}
            {imprimirCopiaCaja && (
              <>
                <div className="page-break-divider" />
                <div className="ticket-page" data-print-job="true" data-print-kind="caja">
                  <Ticket
                    orden={orden}
                    tenant={tenant}
                    empleado={emp}
                    cliente={cli}
                    formato={cfg.formato_ticket || "80mm"}
                    serviciosList={srvList}
                    pagoRecibido={pagoRecibido}
                    ocultarUbicacion={ocultarUbicacion}
                    ocultarNotas={ocultarNotas}
                    esCopiaCaja={true}
                  />
                </div>
              </>
            )}

            {/* 3. COPIA DE TALLER / PRODUCCIÓN */}
            {imprimirTaller && (
              <>
                <div className="page-break-divider" />
                <div className="ticket-page" data-print-job="true" data-print-kind="taller">
                  <Ticket
                    orden={orden}
                    tenant={tenant}
                    empleado={emp}
                    cliente={cli}
                    formato={cfg.formato_ticket || "80mm"}
                    serviciosList={srvList}
                    pagoRecibido={pagoRecibido}
                    ocultarUbicacion={ocultarUbicacion}
                    ocultarNotas={ocultarNotas}
                    esProduccion={true}
                  />
                </div>
              </>
            )}

            {/* 4. MARQUILLAS DE ROPA AUTOMÁTICAS */}
            {imprimirMarquillas && (
              <>
                <div className="page-break-divider" />
                <MarquillasTicket
                  orden={orden}
                  tenant={tenant}
                  cliente={cli}
                  empleado={emp}
                  formato={cfg.formato_ticket || "80mm"}
                />
              </>
            )}
          </>
        )}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page {
            margin: 0 !important;
          }

          html,
          body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff;
            overflow: visible !important;
            height: auto !important;
          }

          /* Ocultar todo el sitio */
          body > *:not(.atomic-print-target) { display: none !important; }

          /* Mostrar solo el ticket */
          .atomic-print-target {
            display: block !important;
            visibility: visible !important;
            position: relative !important;
            left: -2mm !important;
            width: 100% !important;
            max-width: ${tenant.config?.formato_ticket === "57mm" ? "52mm" : "72mm"} !important;
            padding: ${tenant.config?.formato_ticket === "57mm" ? "1.5mm" : "2mm"} !important;
            margin: 0 auto !important;
            background: white;
            color: black;
            font-family: "Segoe UI", Arial, sans-serif !important;
            font-size: ${tenant.config?.formato_ticket === "57mm" ? "10px" : "12px"};
            line-height: ${tenant.config?.formato_ticket === "57mm" ? "1.2" : "1.3"};
            box-sizing: border-box !important;
          }

          .marquillas-container {
            display: block !important;
            width: 100% !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          .ticket-page,
          .marquilla-item {
            display: block !important;
            width: 100% !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .ticket-page:last-child,
          .marquilla-item:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .page-break-divider {
            display: block !important;
            page-break-after: always !important;
            break-after: page !important;
            height: 0px !important;
            margin: 0 !important;
            padding: 0 !important;
            clear: both !important;
          }

          .no-print, nav, aside, header, footer, button {
            display: none !important;
          }
        }
      `,
        }}
      />
    </div>,
    document.body
  );
}

function DeliveryDatePickerPOSDialog({
  open,
  onOpenChange,
  fechaEntrega,
  setFechaEntrega,
  esUrgente,
  setEsUrgente,
  cfg,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  fechaEntrega: Date | undefined;
  setFechaEntrega: (d: Date | undefined) => void;
  esUrgente: boolean;
  setEsUrgente: (u: boolean) => void;
  cfg: any;
}) {
  const [tempDate, setTempDate] = useState<Date | undefined>(fechaEntrega || new Date());
  const [tempIsUrgente, setTempIsUrgente] = useState(esUrgente);

  // Sync internal state when opened
  useEffect(() => {
    if (open) {
      setTempDate(fechaEntrega || new Date());
      setTempIsUrgente(esUrgente);
    }
  }, [open, fechaEntrega, esUrgente]);

  const aplicarAtajo = (horas: number, deUrgencia: boolean) => {
    const d = new Date();
    d.setHours(d.getHours() + horas);
    // Reiniciar horas para basarnos solo en fecha limpia
    d.setHours(12, 0, 0, 0);
    setTempDate(d);
    setTempIsUrgente(deUrgencia);
  };

  const handleSave = () => {
    if (tempDate) {
      // Forzar hora neutra (12:00 PM) para evitar desfases de zona horaria al basarse solo en fecha
      const cleanDate = new Date(tempDate);
      cleanDate.setHours(12, 0, 0, 0);
      setFechaEntrega(cleanDate);
    } else {
      setFechaEntrega(undefined);
    }
    setEsUrgente(tempIsUrgente);
    onOpenChange(false);
  };

  const tiempoEstandar = cfg.tiempo_entrega_estandar || 24;
  const tiempoUrgente = cfg.tiempo_entrega_urgente || 6;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-[530px] rounded-xl p-4.5 border-none bg-white dark:bg-slate-950 shadow-2xl">
        <DialogHeader className="pb-2.5 border-b border-border/40">
          <DialogTitle className="text-sm font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2 uppercase">
            <CalendarDays className="h-4 w-4 text-primary" />
            Programar Entrega
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-4 py-3">
          {/* Columna Izquierda: Atajos + Resumen */}
          <div className="flex-1 flex flex-col justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-2">
                Atajos Rápidos
              </span>

              <div className="grid grid-cols-2 gap-3">
                {/* COLUMNA URGENTE */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => aplicarAtajo(tiempoUrgente, true)}
                    className={`w-full py-1.5 px-2 rounded-lg border text-[11px] font-semibold tracking-tight transition-all text-center flex items-center justify-center gap-1 cursor-pointer h-9.5 ${
                      tempIsUrgente &&
                      tempDate &&
                      Math.abs(
                        tempDate.getTime() - (new Date().getTime() + tiempoUrgente * 3600000),
                      ) < 60000
                        ? "bg-rose-500 border-rose-500 text-white shadow-xs"
                        : "bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100/70 hover:text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-400"
                    }`}
                  >
                    <AlertTriangle
                      className={`h-3.5 w-3.5 shrink-0 ${tempIsUrgente && tempDate && Math.abs(tempDate.getTime() - (new Date().getTime() + tiempoUrgente * 3600000)) < 60000 ? "text-white" : "text-rose-500"}`}
                    />
                    <span>Urgente ({tiempoUrgente}h)</span>
                  </button>

                  <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block mb-1">
                    Otros plazos urgentes:
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {[3, 6, 12]
                      .filter((h) => h !== tiempoUrgente)
                      .map((h) => {
                        const isAct =
                          tempIsUrgente &&
                          tempDate &&
                          Math.abs(tempDate.getTime() - (new Date().getTime() + h * 3600000)) <
                            60000;
                        return (
                          <button
                            key={h}
                            type="button"
                            onClick={() => aplicarAtajo(h, true)}
                            className={`py-1 rounded-md border text-[10px] font-semibold transition-all text-center cursor-pointer h-7 ${
                              isAct
                                ? "bg-rose-500 border-rose-500 text-white shadow-xs"
                                : "border-rose-100 bg-rose-50/20 text-rose-600 hover:bg-rose-50 dark:border-rose-900/20 dark:bg-rose-950/10 dark:text-rose-400"
                            }`}
                          >
                            {h}h
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* COLUMNA ESTÁNDAR */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => aplicarAtajo(tiempoEstandar, false)}
                    className={`w-full py-1.5 px-2 rounded-lg border text-[11px] font-semibold tracking-tight transition-all text-center flex items-center justify-center gap-1 cursor-pointer h-9.5 ${
                      !tempIsUrgente &&
                      tempDate &&
                      Math.abs(
                        tempDate.getTime() - (new Date().getTime() + tiempoEstandar * 3600000),
                      ) < 60000
                        ? "bg-primary border-primary text-white shadow-xs"
                        : "bg-primary/5 border-primary/10 text-primary hover:bg-primary/10 dark:bg-primary/20 dark:border-primary/40 dark:text-primary-foreground"
                    }`}
                  >
                    <span>
                      Estándar (
                      {tiempoEstandar >= 24 ? `${tiempoEstandar / 24}d` : `${tiempoEstandar}h`})
                    </span>
                  </button>

                  <div className="text-[9px] font-bold text-slate-400 dark:text-slate-550 block mb-1">
                    Otros plazos estándar:
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {[24, 48, 72, 96]
                      .filter((h) => h !== tiempoEstandar)
                      .map((h) => {
                        const isAct =
                          !tempIsUrgente &&
                          tempDate &&
                          Math.abs(tempDate.getTime() - (new Date().getTime() + h * 3600000)) <
                            60000;
                        const labelMap: Record<number, string> = {
                          24: "1d",
                          48: "2d",
                          72: "3d",
                          96: "4d",
                        };
                        return (
                          <button
                            key={h}
                            type="button"
                            onClick={() => aplicarAtajo(h, false)}
                            className={`py-1 rounded-md border text-[10px] font-semibold transition-all text-center cursor-pointer h-7 ${
                              isAct
                                ? "bg-primary border-primary text-white shadow-xs"
                                : "border-primary/10 bg-primary/5 text-primary hover:bg-primary/10 dark:border-primary/30 dark:bg-primary/10 dark:text-primary-foreground"
                            }`}
                          >
                            {labelMap[h]}
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>

            {/* Resumen */}
            <div className="p-3 rounded-xl border border-primary/10 bg-gradient-to-r from-primary/5 to-transparent relative overflow-hidden shadow-xs">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-primary" />
              <div className="pl-2">
                <div className="text-[9px] font-black uppercase tracking-widest text-primary/70 mb-1">
                  Fecha de entrega
                </div>
                <div className="text-[13px] font-black text-slate-800 dark:text-slate-100 capitalize">
                  {tempDate
                    ? tempDate.toLocaleDateString("es-DO", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })
                    : "No definida"}
                </div>
                {tempIsUrgente && (
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-455 text-[8px] font-black uppercase tracking-wider">
                    Urgente (+{cfg.recargo_urgencia}%)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Columna Derecha: Calendario */}
          <div className="flex justify-center items-center border-t sm:border-t-0 sm:border-l border-border/40 pt-3 sm:pt-0 sm:pl-4">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1.5 self-start sm:ml-1">
                Selección de Fecha
              </span>
              <Calendar
                mode="single"
                selected={tempDate}
                onSelect={(d) => {
                  if (d) {
                    const newD = new Date(d);
                    newD.setHours(12, 0, 0, 0); // Limpio a mediodía neutro
                    setTempDate(newD);
                  }
                }}
                locale={es}
                className="rounded-xl border border-primary/20 shadow-lg shadow-primary/5 bg-white dark:bg-slate-900 p-2.5 scale-90 sm:scale-95 origin-center"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border/40 gap-1.5 flex-row justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border-border hover:bg-slate-100 dark:hover:bg-slate-900 text-xs font-bold cursor-pointer h-8 px-3"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-primary hover:bg-primary/95 text-white text-xs font-bold cursor-pointer h-8 px-3"
          >
            Aplicar Fecha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NotesPOSDialog({
  open,
  onOpenChange,
  notas,
  setNotas,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  notas: string;
  setNotas: (n: string) => void;
}) {
  const [tempNotes, setTempNotes] = useState(notas);

  useEffect(() => {
    if (open) {
      setTempNotes(notas);
    }
  }, [open, notas]);

  const handleSave = () => {
    setNotas(tempNotes.trim());
    onOpenChange(false);
    if (tempNotes.trim()) {
      toast.success("Nota de la orden guardada 📝");
    } else {
      toast.info("Nota removida");
    }
  };

  const handleAddPreset = (presetText: string) => {
    setTempNotes((prev) => {
      if (!prev.trim()) return presetText;
      if (prev.includes(presetText)) return prev;
      return `${prev.trim()}, ${presetText}`;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-[420px] rounded-2xl p-4 border-none bg-white dark:bg-slate-950 shadow-xl">
        <DialogHeader className="pb-2 border-b border-border/40">
          <DialogTitle className="text-xs font-display font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-1.5 uppercase">
            <FileText className="h-4 w-4 text-amber-500 shrink-0" />
            Notas y Observaciones de la Orden
          </DialogTitle>
          <DialogDescription className="text-[10.5px] text-muted-foreground -mt-0.5">
            Instrucciones especiales para el lavadero, planchado o entrega.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 py-1.5">
          {/* Atajos Rápidos */}
          <div>
            <span className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
              Atajos Rápidos de Notas
            </span>
            <div className="flex flex-wrap gap-1">
              {[
                "Ropa delicada",
                "Mancha tratada",
                "Planchado especial",
                "Entregar en gancho",
                "Doblado especial",
                "Revisar bolsillos",
                "Cliente VIP",
                "Sin fragancia",
                "Con almidón",
                "Sin almidón",
                "No planchar",
                "Detalle/Daño previo",
                "Prioridad de entrega",
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAddPreset(preset)}
                  className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[9.5px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Observación detallada
            </Label>
            <Textarea
              value={tempNotes}
              onChange={(e) => setTempNotes(e.target.value)}
              placeholder="Ej. Mancha de vino en manga derecha, entregar antes de las 4 PM..."
              rows={2}
              className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus-visible:ring-amber-500/30 text-xs font-medium p-2.5"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-border/40 gap-1.5 flex-row justify-end">
          {tempNotes && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setTempNotes("")}
              className="rounded-lg border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold cursor-pointer h-8 px-2.5"
            >
              Limpiar
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border-border hover:bg-slate-100 dark:hover:bg-slate-900 text-xs font-bold cursor-pointer h-8 px-3"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer h-8 px-4 shadow-xs"
          >
            Guardar Nota
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
