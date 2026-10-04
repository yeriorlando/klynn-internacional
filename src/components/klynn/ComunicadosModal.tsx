import { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Megaphone,
  Rocket,
  Lightbulb,
  Wrench,
  CreditCard,
  ShieldAlert,
  Send,
  Building2,
  Globe,
  Clock,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  Search,
  ExternalLink,
  ChevronDown,
  Check,
  Store,
  LayoutDashboard,
  BellRing,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ADMIN_BROADCAST_TYPES,
  AdminBroadcastToastCard,
  type AdminBroadcastType,
} from "./AdminBroadcastToast";
import {
  DashboardAvisosBannerCard,
  resolveBroadcastCategory,
} from "./DashboardAvisosBanner";
import {
  enviarComunicadoAdmin,
  getHistorialComunicadosAdmin,
  eliminarComunicadoAdmin,
  getTenantBranchName,
  type Tenant,
  type Notificacion,
  type ComunicadoFormato,
} from "@/lib/storage";

interface ComunicadosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  initialTenantId?: string | null;
}

export function ComunicadosModal({
  open,
  onOpenChange,
  tenants,
  initialTenantId,
}: ComunicadosModalProps) {
  const [activeTab, setActiveTab] = useState<"nuevo" | "historial">("nuevo");

  // Form State
  const [targetMode, setTargetMode] = useState<"all" | "single">("all");
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [tenantSelectOpen, setTenantSelectOpen] = useState(false);
  const [searchTenantQuery, setSearchTenantQuery] = useState("");
  const tenantDropdownRef = useRef<HTMLDivElement>(null);
  const tenantSearchInputRef = useRef<HTMLInputElement>(null);

  // Cerrar selector al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tenantDropdownRef.current && !tenantDropdownRef.current.contains(event.target as Node)) {
        setTenantSelectOpen(false);
      }
    }
    if (tenantSelectOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => tenantSearchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [tenantSelectOpen]);

  const [formato, setFormato] = useState<ComunicadoFormato>("banner");
  const [previewTab, setPreviewTab] = useState<"banner" | "toast">("banner");
  const [categoria, setCategoria] = useState<string>("ADMIN_ANUNCIO");
  const [titulo, setTitulo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [link, setLink] = useState("");
  const [isSending, setIsSending] = useState(false);

  // History State
  const [historial, setHistorial] = useState<Notificacion[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Initial tenant setup
  useEffect(() => {
    if (initialTenantId && initialTenantId !== "all") {
      setTargetMode("single");
      setSelectedTenantId(initialTenantId);
    } else {
      setTargetMode("all");
      if (tenants.length > 0) {
        setSelectedTenantId(tenants[0].id);
      }
    }
  }, [initialTenantId, tenants]);

  // Load history when tab changes
  useEffect(() => {
    if (open && activeTab === "historial") {
      loadHistorial();
    }
  }, [open, activeTab]);

  async function loadHistorial() {
    setLoadingHistorial(true);
    try {
      const data = await getHistorialComunicadosAdmin();
      setHistorial(data);
    } finally {
      setLoadingHistorial(false);
    }
  }

  // Filtered tenants for search
  const filteredTenants = useMemo(() => {
    if (!searchTenantQuery.trim()) return tenants;
    const q = searchTenantQuery.toLowerCase();
    return tenants.filter(
      (t) =>
        t.nombre.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (t.email && t.email.toLowerCase().includes(q))
    );
  }, [tenants, searchTenantQuery]);

  const targetTenant = useMemo(() => {
    return tenants.find((t) => t.id === selectedTenantId);
  }, [tenants, selectedTenantId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) {
      toast.error("Por favor ingresa un título para el comunicado");
      return;
    }
    if (!mensaje.trim()) {
      toast.error("Por favor redacta el mensaje del comunicado");
      return;
    }
    if (targetMode === "single" && !selectedTenantId) {
      toast.error("Por favor selecciona una lavandería de destino");
      return;
    }

    setIsSending(true);
    try {
      const res = await enviarComunicadoAdmin({
        tenantId: targetMode === "all" ? "all" : selectedTenantId,
        titulo: titulo.trim(),
        mensaje: mensaje.trim(),
        tipo: categoria,
        link: link.trim() || null,
        formato: formato,
      });

      if (res.ok) {
        const formatoLabel =
          formato === "banner"
            ? "Tarjeta en Dashboard"
            : formato === "both"
            ? "Píldora + Tarjeta en Dashboard"
            : "Píldora Flotante";

        toast.success(
          targetMode === "all"
            ? `¡Aviso enviado (${formatoLabel}) a ${res.count} lavanderías!`
            : `¡Aviso enviado (${formatoLabel}) a ${targetTenant?.nombre || "la lavandería"}!`
        );
        setTitulo("");
        setMensaje("");
        setLink("");
        loadHistorial();
        setActiveTab("historial");
      } else {
        toast.error(res.error || "No se pudo enviar el comunicado");
      }
    } catch (err: any) {
      toast.error("Error al enviar: " + (err.message || "Intente de nuevo"));
    } finally {
      setIsSending(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await eliminarComunicadoAdmin(id);
    if (ok) {
      toast.success("Comunicado eliminado del historial");
      setHistorial((prev) => prev.filter((h) => h.id !== id));
    } else {
      toast.error("No se pudo eliminar el comunicado");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-950 max-h-[92vh] flex flex-col">
        {/* Header estilo Hallmark Klynn */}
        <div className="bg-gradient-to-r from-[#1B4B73] via-[#1d5280] to-[#2563eb] text-white p-5 sm:px-6 relative overflow-hidden shrink-0">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 h-40 w-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-14 sm:pr-20">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner shrink-0">
                <Megaphone className="h-6 w-6 text-[#F0B900]" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-black font-display tracking-tight text-white flex items-center gap-2">
                  <span>Centro de Comunicados</span>
                  <span className="text-[11px] font-bold bg-[#F0B900] text-slate-950 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Tiempo Real
                  </span>
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Centro de comunicados para emisión de avisos y novedades a las sucursales.
                </DialogDescription>
              </div>
            </div>

            {/* Selector de pestañas Nuevo / Historial centrado y alejado del botón de cerrar */}
            <div className="flex items-center justify-center sm:mr-6 md:mr-10">
              <div className="flex items-center gap-1 bg-black/25 p-1 rounded-xl border border-white/15 shadow-inner">
                <button
                  type="button"
                  onClick={() => setActiveTab("nuevo")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "nuevo"
                      ? "bg-white text-[#1B4B73] shadow-xs"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  Nuevo Comunicado
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("historial")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "historial"
                      ? "bg-white text-[#1B4B73] shadow-xs"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  Historial
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {activeTab === "nuevo" ? (
            <form onSubmit={handleSend} className="space-y-6">
              {/* Sección 1: Destinatario */}
              <div className="space-y-3 bg-slate-50/80 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-[#1B4B73] dark:text-sky-400" />
                    <span>Destinatario del Mensaje</span>
                  </Label>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {targetMode === "all" ? `Todas las lavanderías (${tenants.length})` : targetTenant?.nombre || "1 seleccionada"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetMode("all");
                      setTenantSelectOpen(false);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      targetMode === "all"
                        ? "border-[#1B4B73] bg-[#1B4B73]/5 dark:bg-sky-950/30 text-[#1B4B73] dark:text-sky-400 font-bold shadow-xs ring-1 ring-[#1B4B73]/20"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                        targetMode === "all"
                          ? "bg-[#1B4B73] text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black">Todas las lavanderías</div>
                      <div className="text-[11px] opacity-75 font-normal">
                        Transmisión global simultánea ({tenants.length} sucursales)
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTargetMode("single");
                      if (!selectedTenantId && tenants.length > 0) {
                        setSelectedTenantId(tenants[0].id);
                      }
                    }}
                    className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      targetMode === "single"
                        ? "border-[#1B4B73] bg-[#1B4B73]/5 dark:bg-sky-950/30 text-[#1B4B73] dark:text-sky-400 font-bold shadow-xs ring-1 ring-[#1B4B73]/20"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                        targetMode === "single"
                          ? "bg-[#1B4B73] text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black">Lavandería específica</div>
                      <div className="text-[11px] opacity-75 font-normal">
                        Mensaje privado dirigido a una sola lavandería
                      </div>
                    </div>
                  </button>
                </div>

                {/* Selector Desplegable estilo CountrySelect */}
                {targetMode === "single" && (
                  <div className="mt-3.5 pt-3.5 border-t border-slate-200/80 dark:border-slate-800 space-y-1.5" ref={tenantDropdownRef}>
                    <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      Selecciona la lavandería de destino:
                    </Label>

                    <div className="relative">
                      {/* Botón Trigger Principal */}
                      <button
                        type="button"
                        onClick={() => setTenantSelectOpen((prev) => !prev)}
                        className="group flex h-13 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 shadow-xs transition-all hover:border-[#1B4B73]/50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1B4B73]/20 active:scale-[0.99] cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Logotipo Circular */}
                          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-xs ring-2 ring-white dark:ring-slate-900">
                            {targetTenant?.logo_url ? (
                              <img
                                src={targetTenant.logo_url}
                                alt={targetTenant.nombre}
                                className="h-full w-full object-cover rounded-full"
                                loading="lazy"
                              />
                            ) : (
                              <div
                                className="h-full w-full rounded-full flex items-center justify-center font-black text-white text-xs"
                                style={{ backgroundColor: targetTenant?.color_primario || "#1B4B73" }}
                              >
                                {targetTenant ? targetTenant.nombre.charAt(0).toUpperCase() : <Store className="h-4 w-4" />}
                              </div>
                            )}
                          </div>

                          {/* Nombre de la Lavandería */}
                          <div className="flex flex-col text-left truncate">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                                {targetTenant ? targetTenant.nombre : "Seleccionar lavandería..."}
                              </span>
                              {targetTenant && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-md font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  /{targetTenant.slug}
                                </span>
                              )}
                            </div>
                            {targetTenant && (
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-200/70 dark:border-sky-800/60 shadow-2xs">
                                  <Store className="h-2.5 w-2.5 text-sky-600 dark:text-sky-400 shrink-0" />
                                  <span className="truncate max-w-[180px]">{getTenantBranchName(targetTenant)}</span>
                                </span>
                                {targetTenant.ciudad && (
                                  <span className="text-[10.5px] text-slate-400 dark:text-slate-500 font-medium truncate">
                                    · {targetTenant.ciudad}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Badges Estilo Fintech: Estado & Chevron */}
                        <div className="flex items-center gap-2 shrink-0">
                          {targetTenant && (
                            targetTenant.estado === "ACTIVO" ? (
                              <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50/90 dark:bg-emerald-950/50 px-2.5 py-1 text-emerald-800 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60 shadow-2xs">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs font-extrabold tracking-tight text-emerald-950 dark:text-emerald-200">
                                  Activo
                                </span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 rounded-full bg-amber-50/90 dark:bg-amber-950/50 px-2.5 py-1 text-amber-800 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60 shadow-2xs">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                <span className="text-xs font-extrabold tracking-tight text-amber-950 dark:text-amber-200">
                                  {targetTenant.estado === "TRIAL" ? "Prueba" : targetTenant.estado}
                                </span>
                              </div>
                            )
                          )}

                          <ChevronDown
                            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                              tenantSelectOpen ? "rotate-180 text-[#1B4B73] dark:text-sky-400" : "group-hover:text-slate-600"
                            }`}
                          />
                        </div>
                      </button>

                      {/* Menú Desplegable con Animación y Buscador */}
                      <AnimatePresence>
                        {tenantSelectOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 4, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.98 }}
                            transition={{ duration: 0.16, ease: "easeOut" }}
                            className="absolute left-0 right-0 z-50 mt-1 max-h-84 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl ring-1 ring-black/5"
                          >
                            {/* Buscador de lavanderías sticky */}
                            <div className="sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-2.5 backdrop-blur-sm">
                              <div className="relative flex items-center">
                                <Search className="absolute left-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                                <input
                                  ref={tenantSearchInputRef}
                                  type="text"
                                  value={searchTenantQuery}
                                  onChange={(e) => setSearchTenantQuery(e.target.value)}
                                  placeholder="Buscar lavandería por nombre, slug o correo..."
                                  className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/80 pl-8 pr-3 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#1B4B73] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1B4B73] dark:focus:ring-sky-500"
                                />
                              </div>
                            </div>

                            {/* Lista de lavanderías */}
                            <div className="max-h-68 overflow-y-auto p-1.5 space-y-1">
                              {filteredTenants.length === 0 ? (
                                <div className="p-4 text-center text-xs text-slate-400">
                                  No se encontraron lavanderías para "{searchTenantQuery}"
                                </div>
                              ) : (
                                filteredTenants.map((t) => {
                                  const isSelected = t.id === selectedTenantId;
                                  return (
                                    <button
                                      key={t.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedTenantId(t.id);
                                        setTenantSelectOpen(false);
                                        setSearchTenantQuery("");
                                      }}
                                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-all cursor-pointer ${
                                        isSelected
                                          ? "bg-[#1B4B73]/[0.08] dark:bg-sky-950/40 text-[#1B4B73] dark:text-sky-300 shadow-2xs ring-1 ring-[#1B4B73]/20"
                                          : "hover:bg-slate-50/90 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200"
                                      }`}
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        {/* Logotipo Circular */}
                                        <div className="relative flex h-7.5 w-7.5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200/90 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-2xs ring-1 ring-slate-100 dark:ring-slate-800">
                                          {t.logo_url ? (
                                            <img
                                              src={t.logo_url}
                                              alt={t.nombre}
                                              className="h-full w-full object-cover rounded-full"
                                              loading="lazy"
                                            />
                                          ) : (
                                            <div
                                              className="h-full w-full rounded-full flex items-center justify-center font-black text-white text-xs"
                                              style={{ backgroundColor: t.color_primario || "#1B4B73" }}
                                            >
                                              {t.nombre.charAt(0).toUpperCase()}
                                            </div>
                                          )}
                                        </div>

                                        {/* Información de la Lavandería */}
                                        <div className="flex flex-col min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                                              {t.nombre}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                            <span className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400 font-medium">
                                              /{t.slug}
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-200/70 dark:border-sky-800/60 shadow-2xs">
                                              <Store className="h-2.5 w-2.5 text-sky-600 dark:text-sky-400 shrink-0" />
                                              <span className="truncate max-w-[170px]">{getTenantBranchName(t)}</span>
                                            </span>
                                            {t.ciudad && (
                                              <span className="text-[10.5px] text-slate-400 dark:text-slate-500 font-medium truncate">
                                                · {t.ciudad}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Badges de Estado y Check */}
                                      <div className="flex items-center gap-2 shrink-0">
                                        {t.estado === "ACTIVO" ? (
                                          <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 shadow-2xs">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                            <span className="text-[10.5px] font-extrabold text-emerald-950 dark:text-emerald-200">
                                              Activo
                                            </span>
                                          </div>
                                        ) : (
                                          <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 shadow-2xs">
                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                            <span className="text-[10.5px] font-bold text-amber-950 dark:text-amber-200">
                                              {t.estado === "TRIAL" ? "Prueba" : t.estado}
                                            </span>
                                          </div>
                                        )}

                                        <div className="w-5 flex items-center justify-center">
                                          {isSelected && <Check className="h-4 w-4 text-[#1B4B73] dark:text-sky-400" strokeWidth={3} />}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>

              {/* Sección 2: Modalidad de Despliegue / Formato */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <LayoutDashboard className="h-4 w-4 text-[#1B4B73] dark:text-sky-400" />
                    <span>Modalidad de Despliegue del Aviso</span>
                  </Label>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {formato === "banner"
                      ? "Tarjeta fija en Dashboard (Persistente)"
                      : formato === "toast"
                      ? "Píldora flotante (12s animado)"
                      : "Píldora + Tarjeta persistente"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Opción 1: Tarjeta fija en Dashboard */}
                  <button
                    type="button"
                    onClick={() => {
                      setFormato("banner");
                      setPreviewTab("banner");
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      formato === "banner"
                        ? "border-[#1B4B73] bg-[#1B4B73]/5 dark:bg-sky-950/30 text-[#1B4B73] dark:text-sky-400 font-bold shadow-xs ring-1 ring-[#1B4B73]/20"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                          formato === "banner"
                            ? "bg-[#1B4B73] text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}
                      >
                        <LayoutDashboard className="h-4 w-4" />
                      </div>
                      <span className="text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                        Nuevo · Fijo
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-black">Tarjeta en Dashboard</div>
                      <div className="text-[11px] opacity-75 font-normal leading-tight mt-0.5">
                        Permanece fija bajo las 4 métricas hasta cerrarse con la X
                      </div>
                    </div>
                  </button>

                  {/* Opción 2: Píldora Flotante (Toast actual) */}
                  <button
                    type="button"
                    onClick={() => {
                      setFormato("toast");
                      setPreviewTab("toast");
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      formato === "toast"
                        ? "border-[#1B4B73] bg-[#1B4B73]/5 dark:bg-sky-950/30 text-[#1B4B73] dark:text-sky-400 font-bold shadow-xs ring-1 ring-[#1B4B73]/20"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                          formato === "toast"
                            ? "bg-[#1B4B73] text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}
                      >
                        <BellRing className="h-4 w-4" />
                      </div>
                      <span className="text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300">
                        Método Habitual
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-black">Píldora Flotante (Toast)</div>
                      <div className="text-[11px] opacity-75 font-normal leading-tight mt-0.5">
                        Alerta animada superior de 12 segundos con timbre
                      </div>
                    </div>
                  </button>

                  {/* Opción 3: Ambos formatos */}
                  <button
                    type="button"
                    onClick={() => setFormato("both")}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      formato === "both"
                        ? "border-[#1B4B73] bg-[#1B4B73]/5 dark:bg-sky-950/30 text-[#1B4B73] dark:text-sky-400 font-bold shadow-xs ring-1 ring-[#1B4B73]/20"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                          formato === "both"
                            ? "bg-[#1B4B73] text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}
                      >
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <span className="text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300">
                        Recomendado
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-black">Ambos Formatos</div>
                      <div className="text-[11px] opacity-75 font-normal leading-tight mt-0.5">
                        Timbre instantáneo en píldora + Tarjeta fija en Dashboard
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Sección 3: Categoría / Tipo con Ícono */}
              <div className="space-y-2.5">
                <Label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-[#F0B900]" />
                  <span>Tipo de Notificación e Ícono Temático</span>
                </Label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {Object.values(ADMIN_BROADCAST_TYPES).map((cat) => {
                    const isSelected = categoria === cat.id;
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoria(cat.id)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? `${cat.pillBg} ${cat.pillBorder} ${cat.pillShadow} ring-2 ring-offset-1 ring-[#1B4B73] dark:ring-sky-500`
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50"
                        }`}
                      >
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${cat.iconBg} ${cat.iconBorder}`}
                        >
                          <Icon className={`h-4.5 w-4.5 ${cat.iconColor}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`text-xs font-black truncate ${cat.titleColor}`}>
                            {cat.label}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {cat.description.split(" ")[0]}...
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sección 4: Título, Mensaje y Previsualización Dinámica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Título del Comunicado <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      placeholder="Ej: ¡Mantenimiento programado este domingo!"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      maxLength={80}
                      className="rounded-xl border-slate-200 dark:border-slate-800 h-10 font-medium text-xs sm:text-sm"
                    />
                    <div className="text-[10px] text-muted-foreground text-right">
                      {titulo.length}/80 caracteres
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Mensaje Detallado <span className="text-rose-500">*</span>
                    </Label>
                    <Textarea
                      placeholder="Escribe el cuerpo del mensaje que se desplegará en la terminal de la lavandería..."
                      value={mensaje}
                      onChange={(e) => setMensaje(e.target.value)}
                      rows={3}
                      maxLength={240}
                      className="rounded-xl border-slate-200 dark:border-slate-800 text-xs sm:text-sm resize-none"
                    />
                    <div className="text-[10px] text-muted-foreground text-right">
                      {mensaje.length}/240 caracteres
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Enlace de Acción Opcional (Link)</span>
                      <span className="text-[10.5px] font-normal text-muted-foreground">Opcional</span>
                    </Label>
                    <Input
                      placeholder="Ej: /catalogo o https://..."
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      className="rounded-xl border-slate-200 dark:border-slate-800 h-9 font-medium text-xs"
                    />
                  </div>
                </div>

                {/* Previsualización en Vivo Adaptable */}
                <div className="flex flex-col justify-between bg-slate-50/80 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        Vista Previa en Tiempo Real
                      </span>
                      {formato === "both" ? (
                        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/10 p-0.5 rounded-lg text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => setPreviewTab("banner")}
                            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                              previewTab === "banner"
                                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-black"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Tarjeta Dashboard
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewTab("toast")}
                            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                              previewTab === "toast"
                                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-black"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Píldora Toast
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          {formato === "banner" ? "Tarjeta Fija en Dashboard" : "Píldora Flotante Animada"}
                        </span>
                      )}
                    </div>

                    <div className="py-2 flex items-center justify-center min-h-[140px]">
                      {(formato === "banner" || (formato === "both" && previewTab === "banner")) ? (
                        <DashboardAvisosBannerCard
                          titulo={titulo}
                          mensaje={mensaje}
                          tipo={categoria}
                          link={link}
                          isStaticPreview={true}
                        />
                      ) : (
                        <AdminBroadcastToastCard
                          titulo={titulo}
                          mensaje={mensaje}
                          tipo={categoria}
                          link={link}
                          isStaticPreview={true}
                        />
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground/80 leading-snug italic mt-3">
                    {formato === "banner"
                      ? "💡 Esta tarjeta permanecerá fija en el Dashboard de la lavandería justo debajo de las 4 métricas, hasta que el usuario decida cerrarla con la X."
                      : formato === "toast"
                      ? "💡 Esta notificación se deslizará suavemente en la pantalla de la lavandería durante 12 segundos, reproducirá un timbre y quedará en la campanita."
                      : "💡 Se mostrará la píldora animada de llegada y además quedará la tarjeta fija en el Dashboard hasta ser descartada por el usuario."}
                  </p>
                </div>
              </div>

              {/* Botón de Enviar */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="rounded-xl font-bold text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSending || !titulo.trim() || !mensaje.trim()}
                  className="rounded-xl font-bold text-xs bg-gradient-to-r from-[#1B4B73] to-[#2563eb] hover:from-[#143755] hover:to-[#1d4ed8] text-white shadow-md gap-2 h-10 px-5 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  <span>
                    {isSending
                      ? "Transmitiendo comunicado..."
                      : targetMode === "all"
                      ? `Transmitir a Todas (${tenants.length}) 🚀`
                      : `Enviar a ${targetTenant?.nombre || "Lavandería"} 🚀`}
                  </span>
                </Button>
              </div>
            </form>
          ) : (
            /* Pestaña: Historial de Envíos */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black font-display text-slate-800 dark:text-slate-100">
                    Historial de Comunicados Recientes
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Últimos comunicados emitidos desde Klynn Central.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadHistorial}
                  disabled={loadingHistorial}
                  className="rounded-xl text-xs gap-1.5 h-8"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingHistorial ? "animate-spin" : ""}`} />
                  <span>Actualizar</span>
                </Button>
              </div>

              {loadingHistorial ? (
                <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  <span>Cargando historial de comunicados...</span>
                </div>
              ) : historial.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <Megaphone className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="font-bold">Aún no has enviado comunicados.</p>
                  <p className="mt-0.5">Usa la pestaña "Nuevo Comunicado" para emitir el primero.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {historial.map((item) => {
                    const normTipo = (item.tipo || "ADMIN_ANUNCIO").toUpperCase();
                    const cfg = resolveBroadcastCategory(item.tipo);
                    const Icon = cfg.icon;
                    const tenantMatch = tenants.find((t) => t.id === item.tenant_id);
                    const isBanner = normTipo.includes("BANNER");
                    const isBoth = normTipo.includes("BOTH");
                    const formatoBadgeText = isBoth
                      ? "Píldora + Tarjeta"
                      : isBanner
                      ? "Tarjeta Dashboard"
                      : "Píldora Toast";

                    return (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${cfg.iconBg} ${cfg.iconBorder}`}
                          >
                            <Icon className={`h-4.5 w-4.5 ${cfg.iconColor}`} />
                          </div>

                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${cfg.badgeBg} ${cfg.badgeText}`}
                              >
                                {cfg.label}
                              </span>
                              <span className="text-[9.5px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                                {formatoBadgeText}
                              </span>
                              <span className="text-[11px] font-extrabold text-[#1B4B73] dark:text-sky-400">
                                {tenantMatch ? `Destino: ${tenantMatch.nombre}` : "Destino: Lavandería"}
                              </span>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                {new Date(item.created_at).toLocaleString("es-DO", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })}
                              </span>
                            </div>

                            <div className="text-xs font-black text-slate-800 dark:text-slate-100">
                              {item.titulo}
                            </div>
                            <div className="text-[11.5px] text-slate-600 dark:text-slate-400 line-clamp-2">
                              {item.mensaje}
                            </div>
                          </div>
                        </div>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(item.id)}
                          className="h-8 w-8 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0 self-end sm:self-center cursor-pointer"
                          title="Eliminar del historial"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
